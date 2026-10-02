import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemoState} from '../data/mock/index.js';
import {executeCommand,previewImport} from '../assets/js/core/commands.js';
import {createLocalProvider,STATE_KEY} from '../assets/js/data/local.js';
import {upgradeDemo} from '../assets/js/core/upgrade.js';
import {COLLECTIONS,validateState} from '../assets/js/core/model.js';
import {createSession} from '../assets/js/core/session.js';
import {alerts,financeTotals} from '../assets/js/core/queries.js';
import {buildReports} from '../assets/js/core/reporting.js';
import {qrMatrix,parseQr,qrToken} from '../assets/js/core/qr.js';
import {parseCsv,parseSheet,readSpreadsheet,writeXlsx,readZip} from '../assets/js/core/spreadsheet.js';
const admin={userId:'demo-user-1',role:'admin'},teacher={userId:'demo-teacher',role:'teacher'},conductor={userId:'demo-conductor',role:'conductor'};
const now='2026-10-01T14:00:00Z';
const run=(state,action,data={},id,session=admin)=>executeCommand(state,{action,id,data},session,{now});
const courseData={code:'NEW',name:'Nuevo curso',startDate:'2026-10-01',endDate:'2026-10-10',expectedStudents:2,confirmedStudents:0,externalStudents:0,status:'active'};
const peopleRow={Identidad:'0801200012345',Nombre:'Persona QA',Departamento:'Académico',Telefono:'',Curso:'CUR-CRIM',Alojamiento:'Sí'};
const assetRow={Codigo:'IMP-001',Nombre:'Equipo importado',Categoria:'Equipo',Ubicacion:'Aula 101',Serie:'IMP-SERIE',Valor:'100'};
const departure={assetId:'a-7',driverId:'driver-1',destination:'Destino QA',reason:'Traslado',startMileage:12500};
const memory=initial=>{const values=new Map(initial);return {getItem:k=>values.get(k) ?? null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values};};

test('participaciones independientes conservan un curso anterior y rechazan duplicados',()=>{
  let state=createDemoState();state=run(state,'enrollment.save',{personId:'p-1',courseId:'course-2',needsBed:false,status:'active'}).state;
  assert.equal(state.enrollments.filter(n=>n.personId==='p-1').length,3);
  assert.equal(state.enrollments.find(n=>n.id==='enrollment-history').status,'completed');
  assert.throws(()=>run(state,'enrollment.save',{personId:'p-1',courseId:'course-2',needsBed:false}),/ya está inscrita/);
  const current=state.enrollments.at(-1);assert.throws(()=>run(state,'enrollment.save',{...current,courseId:'course-1'},current.id),/conserva/);
});
test('una cama requiere matrícula activa, alojamiento solicitado y referencias coincidentes',()=>{
  const state=createDemoState();
  assert.throws(()=>run(state,'bed.assign',{personId:'p-5',courseId:'course-1'},'bed-2'),/Participación/);
  assert.throws(()=>run(state,'bed.assign',{personId:'p-5',courseId:'course-2',enrollmentId:'enrollment-pending'},'bed-2'),/participación/);
  const noBed=run(state,'enrollment.save',{personId:'p-5',courseId:'course-2',needsBed:false}).state;
  assert.throws(()=>run(noBed,'bed.assign',{personId:'p-5',courseId:'course-2',enrollmentId:noBed.enrollments.at(-1).id},'bed-2'),/alojamiento/);
});
test('no se retira alojamiento ni se cierra una participación con recursos vigentes',()=>{
  let state=run(createDemoState(),'bed.assign',{personId:'p-5',courseId:'course-1',enrollmentId:'enrollment-pending'},'bed-2').state;
  const n=state.enrollments.find(n=>n.id==='enrollment-pending');
  assert.throws(()=>run(state,'enrollment.save',{...n,needsBed:false},n.id),/Libera/);
  assert.throws(()=>run(state,'enrollment.save',{...n,status:'withdrawn'},n.id),/Confirma/);
  state=run(state,'bed.release',{},'bed-2').state;state=run(state,'enrollment.save',{...n,status:'withdrawn'},n.id).state;
  assert.equal(state.enrollments.find(item=>item.id===n.id).status,'withdrawn');assert.equal(state.assignments.at(-1).status,'returned');
});
test('arma exige participación, impide doble arma y retorno es una confirmación humana',()=>{
  let state=createDemoState();
  assert.throws(()=>run(state,'asset.assign',{personId:'p-5'},'a-11'),/Participación/);
  state=run(state,'asset.assign',{personId:'p-5',enrollmentId:'enrollment-pending'},'a-11').state;
  state=run(state,'asset.return',{},'a-6').state;
  assert.throws(()=>run(state,'asset.assign',{personId:'p-5',enrollmentId:'enrollment-pending'},'a-6'),/arma activa/);
  assert.throws(()=>run(state,'asset.return',{},'a-11',{...admin,role:'conductor'}),/rol/);
  state=run(state,'asset.return',{},'a-11',{...admin,role:'supervisor'}).state;
  assert.equal(state.assignments.find(a=>a.itemId==='a-11').returnedBy,admin.userId);
});
test('curso solo se completa después de devolver armas; fechas no liberan automáticamente',()=>{
  let state=run(createDemoState(),'course.save',courseData).state,course=state.courses.at(-1);
  state=run(state,'enrollment.save',{personId:'p-5',courseId:course.id,needsBed:false}).state;const enrollment=state.enrollments.at(-1);
  state=run(state,'asset.assign',{personId:'p-5',enrollmentId:enrollment.id},'a-11').state;
  const snapshot=JSON.stringify(state);assert.ok(alerts(state,{id:admin.userId,role:'supervisor'},'2026-10-12').some(a=>a.id==='course-'+course.id));assert.equal(JSON.stringify(state),snapshot);
  assert.throws(()=>run(state,'course.save',{...course,status:'completed'},course.id),/devoluciones/);
  state=run(state,'asset.return',{},'a-11',{...admin,role:'supervisor'}).state;
  state=run(state,'course.save',{...course,status:'completed'},course.id).state;assert.equal(state.enrollments.at(-1).status,'completed');
  assert.throws(()=>run(state,'course.save',{...course,status:'active'},course.id),/reabrirse/);
});
test('cupos y totales se actualizan con participaciones individuales',()=>{
  let state=run(createDemoState(),'enrollment.save',{personId:'p-5',courseId:'course-2',needsBed:false}).state;
  const course=state.courses.find(c=>c.id==='course-2');assert.equal(course.confirmedStudents,2);assert.equal(course.externalStudents,1);
  assert.throws(()=>run(state,'course.save',{...course,expectedStudents:1,confirmedStudents:0,externalStudents:0},course.id),/participaciones/);
  state=run(state,'course.save',{...course,confirmedStudents:0,externalStudents:0},course.id).state;assert.equal(state.courses.find(c=>c.id===course.id).confirmedStudents,2);
});
test('responsabilidad del espacio, equipos de clase y entrada/salida se conservan',()=>{
  let state=run(createDemoState(),'spaceUse.open',{locationId:'loc-2',personId:'p-2',courseId:'course-1'},undefined,teacher).state;const use=state.spaceUses.at(-1);
  assert.throws(()=>run(state,'spaceUse.open',{locationId:'loc-2',personId:'p-2',courseId:'course-1'},undefined,teacher),/responsabilidad/);
  assert.throws(()=>run(state,'spaceUse.open',{locationId:'loc-1',personId:'p-1',courseId:'course-1'},undefined,teacher),/propia/);
  assert.throws(()=>run(state,'asset.assign',{personId:'p-1',spaceUseId:use.id},'a-9'),/responsable/);
  state=run(state,'asset.assign',{personId:'p-2',spaceUseId:use.id},'a-9').state;
  state=run(state,'spaceUse.close',{notes:'Actividad finalizada'},use.id,teacher).state;
  assert.equal(state.spaceUses.at(-1).status,'completed');assert.equal(state.assignments.at(-1).spaceUseId,use.id);
  assert.throws(()=>run(state,'spaceUse.close',{},use.id,teacher),/ya fue/);
});
test('traslados exigen motivo y conservan origen/destino; edición no omite el movimiento',()=>{
  const original=createDemoState(),asset=original.assets.find(a=>a.id==='a-9');
  assert.throws(()=>run(original,'asset.save',{...asset,locationId:'loc-1'},asset.id),/Trasladar/);
  const state=run(original,'asset.move',{locationId:'loc-1',reason:'Clase especial'},asset.id).state;
  assert.equal(state.assets.find(a=>a.id===asset.id).lastMovement.fromId,'loc-2');assert.equal(state.auditLogs.at(-1).action,'asset.move');assert.equal(original.assets.find(a=>a.id===asset.id).locationId,'loc-2');
});
test('licencias vencidas y fechas incoherentes impiden la salida',()=>{
  const state=createDemoState();state.drivers[0].expires='2026-09-30';assert.throws(()=>run(state,'trip.open',departure),/vigente/);
  assert.throws(()=>run(createDemoState(),'driver.save',{...state.drivers[1],expires:'2024-01-01'},'driver-2'),/emisión/);
});
test('conductor gestiona solo sus recorridos y kilometraje nunca disminuye',()=>{
  let state=run(createDemoState(),'trip.open',departure,undefined,conductor).state;const trip=state.trips.at(-1);
  assert.throws(()=>run(state,'trip.open',{...departure,assetId:'a-8',startMileage:28400},undefined,conductor),/recorrido activo/);
  assert.throws(()=>run(state,'trip.close',{endMileage:12499},trip.id,conductor),/menor/);
  assert.throws(()=>run(state,'trip.close',{endMileage:12550},trip.id,{userId:'demo-user-1',role:'conductor'}),/propios/);
  assert.throws(()=>run(state,'maintenance.open',{assetId:'a-7',description:'Falla'}),/regreso/);
  state=run(state,'trip.close',{endMileage:12585,notes:'Sin novedades'},trip.id,conductor).state;
  assert.equal(state.assets.find(a=>a.id==='a-7').details.mileage,12585);assert.equal(state.trips.at(-1).status,'completed');
});
test('incidencia de conductor queda enlazada a mantenimiento y a su seguimiento',()=>{
  let state=run(createDemoState(),'incident.save',{assetId:'a-7',description:'Vibración al frenar'},undefined,conductor).state,incident=state.incidents.at(-1);
  assert.throws(()=>run(state,'incident.save',{assetId:'a-8',description:'Otra'},undefined,conductor),/utilizado/);
  state=run(state,'maintenance.open',{assetId:'a-7',description:incident.description}).state;const order=state.maintenance.at(-1);
  state=run(state,'incident.resolve',{maintenanceId:order.id,resolution:'Orden enviada al taller'},incident.id,{...admin,role:'maintenance_staff'}).state;
  assert.equal(state.incidents.at(-1).maintenanceId,order.id);assert.equal(state.incidents.at(-1).status,'resolved');
});
test('camas admiten reparación, seguimiento y cierre sin confundirlas con bienes',()=>{
  let state=run(createDemoState(),'maintenance.open',{bedId:'bed-2',description:'Pata dañada'}).state;const order=state.maintenance.at(-1);
  assert.equal(state.beds.find(b=>b.id==='bed-2').status,'maintenance');
  assert.throws(()=>run(state,'bed.save',{...state.beds[1],status:'available'},'bed-2'),/Cierra/);
  state=run(state,'maintenance.progress',{stage:'repair',diagnostico:'Soldadura requerida',work:'Pata soldada'},order.id).state;
  state=run(state,'maintenance.close',{diagnostico:'Reparada',work:'Soldadura',verification:'Inspección visual y estabilidad',resultStatus:'available'},order.id).state;
  assert.equal(state.beds[1].status,'available');assert.equal(state.maintenance.at(-1).stage,'verified');
});
test('evidencias se vinculan, respetan permisos y no duplican contenido en auditoría',()=>{
  const data={targetType:'maintenance',targetId:'maint-1',name:'evidencia.png',mime:'image/png',content:'data:image/png;base64,iVBORw0KGgo=',phase:'before',description:'Antes'};
  const result=run(createDemoState(),'attachment.add',data,undefined,{...admin,role:'maintenance_staff'});assert.equal(result.state.attachments.length,1);assert.ok(!result.state.auditLogs.at(-1).after.includes('base64'));
  assert.throws(()=>run(result.state,'attachment.add',{...data,targetType:'asset',targetId:'a-11'},undefined,{...admin,role:'maintenance_staff'}),/rol/);
  assert.throws(()=>run(result.state,'attachment.add',{...data,mime:'text/html'}),/Solo se admiten/);
  assert.throws(()=>run(result.state,'attachment.add',{...data,content:'data:image/png;base64,'+'A'.repeat(700000)}),/500 KB/);
});
test('fondos, financiación y gastos impiden sobregiros y facturas duplicadas',()=>{
  let state=createDemoState();assert.deepEqual(financeTotals(state,'project-2'),{funded:120000,spent:35000,balance:85000});
  assert.throws(()=>run(state,'allocation.save',{fundId:'fund-1',projectId:'project-2',amount:100}),/presupuesto/);
  assert.throws(()=>run(state,'allocation.save',{fundId:'fund-1',projectId:'project-1',amount:100}),/aprobado/);
  const data={projectId:'project-2',supplier:'Proveedor QA',invoice:'QA-1',concept:'Material',date:'2026-10-01',amount:85001};assert.throws(()=>run(state,'expense.save',data),/financiación/);
  state=run(state,'expense.save',{...data,amount:100},undefined,{...admin,role:'buyer'}).state;
  assert.equal(financeTotals(state,'project-2').balance,84900);assert.throws(()=>run(state,'expense.save',{...data,amount:100}),/factura/);
});
test('búsqueda de alertas y reportes respeta funciones y fecha del período',()=>{
  let state=run(createDemoState(),'asset.assign',{personId:'p-5',enrollmentId:'enrollment-pending'},'a-11').state;
  const period={start:'2026-09-01',end:'2026-09-30'};
  const reports=buildReports(state,'viewer',period);assert.equal(reports.weapons,undefined);assert.equal(reports.vehicles,undefined);assert.equal(reports.inventory.rows.length,6);
  assert.ok(!reports.assignments.rows.some(row=>String(row[0]).includes('ARM')));
  const all=buildReports(state,'admin',period);assert.equal(all.trips.rows[0].at(-1),200);assert.equal(all.expenses.rows.length,1);
  assert.throws(()=>buildReports(state,'admin',{start:'2026-02-30',end:'2026-03-01'}),/fecha válida/);
  assert.ok(alerts(state,{id:'demo-conductor',role:'conductor'},'2026-10-01').every(a=>!a.id.startsWith('projects')));
});
test('reporte de asignaciones reconstruye vigencia al fin del período aunque se devolvió después',()=>{
  let state=createDemoState();state=executeCommand(state,{action:'asset.return',id:'a-5'},admin,{now:'2026-10-03T14:00:00Z'}).state;
  const row=buildReports(state,'admin',{start:'2026-09-01',end:'2026-09-30'}).assignments.rows.find(r=>r[0]==='EIC-ARM-3001');assert.equal(row.at(-1),'Vigente');assert.equal(row.at(-2),'—');
});
test('actualización de v2 conserva IDs, colecciones vacías y el historial previo',async()=>{
  const old=createDemoState();old.version=2;
  for(const key of ['enrollments','spaceUses','drivers','trips','incidents','attachments','funds','allocations','expenses'])delete old[key];
  for(const b of old.beds)delete b.enrollmentId;for(const a of old.assignments)delete a.enrollmentId;
  const upgraded=validateState(upgradeDemo(old));assert.equal(upgraded.version,3);assert.equal(upgraded.assets.length,old.assets.length);assert.equal(upgraded.enrollments.length,4);assert.equal(upgraded.funds.length,0);
  const store=memory([[STATE_KEY,JSON.stringify(old)]]),service=createLocalProvider(store,createDemoState,()=>{},()=>admin);
  assert.equal((await service.getState()).assets[0].id,old.assets[0].id);assert.equal(JSON.parse(store.getItem(STATE_KEY)).version,3);
  assert.equal(COLLECTIONS.filter(k=>!Array.isArray(upgraded[k])).length,0);
});
test('importación revisa errores y confirma un lote atómico, revalidando duplicados',async()=>{
  const state=createDemoState(),before=JSON.stringify(state),rows=[assetRow,{...assetRow,Nombre:'Duplicado'}];
  const preview=previewImport(state,{kind:'inventory',rows},admin);assert.deepEqual(preview.map(r=>r.valid),[true,false]);assert.match(preview[1].error,/ya existe/);assert.equal(JSON.stringify(state),before);
  const store=memory([[STATE_KEY,JSON.stringify(state)]]),service=createLocalProvider(store,createDemoState,()=>{},()=>admin);
  await assert.rejects(service.execute({action:'import.batch',data:{kind:'inventory',rows}}),/ya existe/);assert.equal(store.getItem(STATE_KEY),before);
  await service.execute({action:'import.batch',data:{kind:'inventory',rows:[assetRow]}});assert.equal((await service.getState()).assets.length,12);
  await assert.rejects(service.execute({action:'import.batch',data:{kind:'inventory',rows:[assetRow]}}),/ya existe/);
});
test('plantilla de estudiantes registra persona y participación sin dejar huérfanos',()=>{
  const result=run(createDemoState(),'import.batch',{kind:'people',rows:[peopleRow]});const person=result.state.people.at(-1),n=result.state.enrollments.at(-1);assert.equal(n.personId,person.id);assert.equal(n.courseId,'course-1');assert.equal(n.needsBed,true);
  assert.throws(()=>run(createDemoState(),'import.batch',{kind:'people',rows:[{...peopleRow,Curso:'NO-EXISTE'}]}),/Curso desconocido/);
  assert.throws(()=>run(createDemoState(),'import.batch',{kind:'people',rows:[peopleRow]},undefined,{...admin,role:'viewer'}),/rol/);
});
test('Excel generado se lee conservando identidades, acentos y ceros iniciales',async()=>{
  const bytes=writeXlsx(['Identidad','Nombre'],[['0801200012345','María & EIC']]);
  const file={name:'plantilla.xlsx',size:bytes.length,arrayBuffer:async()=>bytes.buffer};
  const rows=await readSpreadsheet(file);assert.deepEqual(rows,[{Identidad:'0801200012345',Nombre:'María & EIC'}]);
  const zip=await readZip(bytes.buffer);assert.ok(zip['[Content_Types].xml']);assert.ok(zip['xl/workbook.xml']);
});
test('Excel admite shared strings y celdas vacías; fórmulas y XML externo se rechazan',()=>{
  assert.deepEqual(parseSheet('<worksheet><row><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Sí</t></is></c></row></worksheet>',['Identidad']),[['Identidad',,'Sí']]);
  assert.throws(()=>parseSheet('<row><c r="A1"><f>1+1</f><v>2</v></c></row>'),/fórmulas/);
  assert.throws(()=>parseSheet('<!DOCTYPE x><row></row>'),/inválida/);
});
test('CSV importado conserva separadores dentro de comillas y detecta formatos dañados',()=>{
  assert.deepEqual(parseCsv('\uFEFFNombre;Valor\r\n"María; EIC";"10"'),[['Nombre','Valor'],['María; EIC','10']]);
  assert.deepEqual(parseCsv('Nombre,Nota\n"A","Línea\nsegunda"'),[['Nombre','Nota'],['A','Línea\nsegunda']]);
  assert.throws(()=>parseCsv('Nombre,Nota\nA,"sin cerrar'),/sin cerrar/);
});
test('QR identifica registros sin datos personales y rechaza códigos ajenos',()=>{
  const token=qrToken('enrollment','enrollment-pending');assert.deepEqual(parseQr(token),{type:'enrollment',id:'enrollment-pending'});
  const matrix=qrMatrix(token);assert.equal(matrix.length,33);assert.ok(matrix.every(row=>row.length===33));assert.equal(matrix[0][0],true);assert.equal(matrix[1][1],false);assert.equal(matrix[3][3],true);
  assert.throws(()=>parseQr('https://otro.example/123'),/no corresponde/);assert.throws(()=>qrMatrix('a'.repeat(79)),/demasiado largo/);
});
test('matriz QR coincide con una referencia independiente de ReportLab',async()=>{
  const reference=JSON.parse(await readFile(new URL('./fixtures/qr-reference.json',import.meta.url),'utf8'));
  assert.deepEqual(qrMatrix(reference.token),reference.matrix);
});
test('XLSX comprimido generado por openpyxl conserva filas y detecta duplicados',async()=>{
  const bytes=await readFile(new URL('./fixtures/import-personas.xlsx',import.meta.url));
  const rows=await readSpreadsheet({name:'import-personas.xlsx',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  assert.equal(rows.length,2);assert.equal(rows[0].Nombre,'Estudiante QA Excel');assert.equal(rows[0].Identidad,'0801200012345');
  assert.deepEqual(previewImport(createDemoState(),{kind:'people',rows},admin).map(r=>r.valid),[true,false]);
});
test('identidad oficial usa el ID de usuario, sin confundirlo con el ID de sesión',async()=>{
  const service={getSession:async()=>({id:'php-session',userId:'official-user',role:'conductor',status:'active'})};
  const session=createSession({dataMode:'api'},service,{getItem(){throw new Error('No leer demo');}});
  const current=await session.current();assert.equal(current.id,'official-user');assert.equal(current.userId,'official-user');
});
test('montos monetarios rechazan fracciones de centavo',()=>{
  assert.throws(()=>run(createDemoState(),'fund.save',{concept:'Prueba',date:'2026-10-01',amount:12.345}),/dos decimales/);
});
