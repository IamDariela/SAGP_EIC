import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,normalizeDemo} from '../data/mock/index.js';
import {executeCommand} from '../assets/js/core/commands.js';
import {validateState} from '../assets/js/core/model.js';
import {analyzeCapacity} from '../assets/js/core/planning.js';
import {createLocalProvider,STATE_KEY,SESSION_KEY} from '../assets/js/data/local.js';
import {createApiProvider} from '../assets/js/data/api.js';
import {createService} from '../assets/js/storage.js';
import {createSession} from '../assets/js/core/session.js';
const admin={userId:'demo-user-1',role:'admin'};
const run=(state,action,data={},id,session=admin)=>executeCommand(state,{action,id,data},session);
const assetData={code:'TEST-1',name:'Bien de prueba',type:'general',category:'Equipo',locationId:'loc-11',status:'good',costoUnitario:100};
function memory(entries=[]) { const backing=new Map(entries);return {getItem:k=>backing.get(k) ?? null,setItem:(k,v)=>backing.set(k,String(v)),removeItem:k=>backing.delete(k),backing}; }
function provider(store=memory()) {store.setItem(SESSION_KEY,JSON.stringify(admin));return {store,service:createLocalProvider(store,createDemoState,normalizeDemo,()=>JSON.parse(store.getItem(SESSION_KEY)))};}

test('semillas normalizadas, referencias e historial de ocupaciones son coherentes',()=>{
 const state=validateState(createDemoState());assert.equal(state.assets.length,11);assert.equal(state.beds.length,8);assert.equal(state.assignments.filter(a=>a.resource==='bed').length,4);assert.equal(state.assets.find(a=>a.id==='a-3').status,'maintenance');
});
test('registro/edición de bienes conserva responsables, exige códigos y series únicos',()=>{
 let state=run(createDemoState(),'asset.save',assetData).state;
 assert.equal(state.auditLogs.length,1);assert.equal(state.notifications.length,2);
 assert.throws(()=>run(state,'asset.save',{...assetData,code:' test-1 '}),/ya existe/);
 assert.throws(()=>run(state,'asset.save',{...assetData,code:'TEST-2',serial:'sn-desk-991'}),/ya existe/);
 const original=state.assets.find(a=>a.id==='a-1');state=run(state,'asset.save',{...original,name:'Nombre editado'},original.id).state;
 assert.equal(state.assets.find(a=>a.id===original.id).assignedPersonId,'p-1');
});
test('placas únicas y kilometraje creciente para vehículos',()=>{
 const state=createDemoState(),vehicle=state.assets.find(a=>a.id==='a-7');
 assert.throws(()=>run(state,'asset.save',{...vehicle,details:{...vehicle.details,mileage:100}},vehicle.id),/disminuir/);
 assert.throws(()=>run(state,'asset.save',{...vehicle,code:'NEW',serial:'NEW',details:{...vehicle.details,plate:'p-bc-123'}}),/placa/);
 assert.throws(()=>run(state,'asset.save',{...vehicle,code:'NEW',serial:'NEW',details:{plate:'NEW',mileage:-1}}),/Kilometraje/);
});
test('consulta no puede escribir y cada gestor modifica solo su tipo de bien',()=>{
 const state=createDemoState();assert.throws(()=>run(state,'asset.save',assetData,undefined,{...admin,role:'viewer'}),/rol/);
 assert.throws(()=>run(state,'asset.save',assetData,undefined,{...admin,role:'weapon_manager'}),/rol/);
 assert.doesNotThrow(()=>run(state,'asset.save',{...assetData,type:'weapon',serial:'NEW',details:{caliber:'9mm'}},undefined,{...admin,role:'weapon_manager'}));
});
test('asignación y devolución de bienes conservan historial; baja no elimina registros',()=>{
 let state=createDemoState();state=run(state,'asset.save',assetData).state;const asset=state.assets.at(-1);
 state=run(state,'asset.assign',{personId:'p-5'},asset.id).state;
 assert.throws(()=>run(state,'asset.assign',{personId:'p-4'},asset.id),/disponible/);
 assert.throws(()=>run(state,'asset.archive',{reason:'Baja'},asset.id),/Devuelve/);
 state=run(state,'asset.return',{},asset.id).state;assert.equal(state.assignments.at(-1).status,'returned');
 state=run(state,'asset.archive',{reason:'Vida útil terminada'},asset.id).state;assert.equal(state.assets.at(-1).status,'decommissioned');
 assert.throws(()=>run(state,'asset.save',assetData,asset.id),/baja/);
});
test('asignar camas impide dobles ocupaciones y enlaza persona y curso',()=>{
 let state=createDemoState();state=run(state,'bed.assign',{personId:'p-5',courseId:'course-1',enrollmentId:'enrollment-pending'},'bed-2').state;
 assert.throws(()=>run(state,'bed.assign',{personId:'p-5',courseId:'course-2'},'bed-4'),/ya tiene/);
 assert.throws(()=>run(state,'bed.assign',{personId:'p-1',courseId:'course-1'},'bed-2'),/disponible/);
 state=run(state,'bed.release',{},'bed-2').state;assert.equal(state.beds.find(b=>b.id==='bed-2').courseId,null);assert.equal(state.assignments.at(-1).status,'returned');
 assert.throws(()=>run(state,'bed.release',{},'bed-2'),/activa/);
});
test('una cama en mantenimiento no puede asignarse ni editarse ocupada',()=>{
 let state=createDemoState(),bed=state.beds.find(b=>b.id==='bed-2');state=run(state,'bed.save',{...bed,status:'maintenance'},bed.id).state;
 assert.throws(()=>run(state,'bed.assign',{personId:'p-5',courseId:'course-1'},bed.id),/disponible/);
 assert.throws(()=>run(state,'bed.save',{bedNumber:'101-A',dormitory:'Otro',floor:1,status:'available'}),/ya existe/);
 assert.throws(()=>run(state,'bed.save',{...state.beds[0],status:'available'},'bed-1'),/Libera/);
});
test('abrir/cerrar mantenimiento actualiza el bien en la misma operación',()=>{
 let state=createDemoState();state=run(state,'maintenance.open',{assetId:'a-4',description:'Falla'},undefined,{...admin,role:'maintenance_staff'}).state;const ticket=state.maintenance.at(-1);
 assert.equal(state.assets.find(a=>a.id==='a-4').status,'maintenance');
 assert.throws(()=>run(state,'maintenance.open',{assetId:'a-4',description:'Otra'}),/abierta/);
 state=run(state,'maintenance.close',{diagnostico:'Reparado',resultStatus:'good'},ticket.id).state;assert.equal(state.assets.find(a=>a.id==='a-4').status,'good');assert.equal(state.maintenance.at(-1).status,'closed');
 assert.throws(()=>run(state,'maintenance.close',{diagnostico:'Otra',resultStatus:'good'},ticket.id),/cerrada/);
});
test('cursos rechazan fechas inválidas, cupos incoherentes y finalización con camas',()=>{
 const state=createDemoState(),course=state.courses[0];
 assert.throws(()=>run(state,'course.save',{...course,startDate:'2026-02-30'},course.id),/fecha válida/);
 assert.throws(()=>run(state,'course.save',{...course,endDate:'2025-01-01'},course.id),/anterior/);
 assert.throws(()=>run(state,'course.save',{...course,externalStudents:99},course.id),/externos/);
 assert.throws(()=>run(state,'course.save',{...course,status:'completed'},course.id),/Libera/);
});
test('cupos incluyen límites de fecha, excluyen externos y camas en mantenimiento',()=>{
 const state=createDemoState();const result=analyzeCapacity(state,'2026-09-30','2026-09-30');assert.equal(result.days.length,1);assert.equal(result.maxDemand,5);assert.equal(result.capacity,8);assert.equal(result.maxDeficit,0);
 state.beds[1].status='maintenance';assert.equal(analyzeCapacity(state,'2026-09-30','2026-09-30','projection').capacity,7);
 assert.equal(analyzeCapacity(state,'2026-09-30','2026-09-30','projection').maxDemand,17);
 assert.throws(()=>analyzeCapacity(state,'2026-09-30','2025-01-01'),/período/);
 assert.throws(()=>analyzeCapacity(state,'2026-01-01','2028-01-01'),/366/);
});
test('DNI, correos y cuentas se validan; no se elimina el administrador actual',()=>{
 const state=createDemoState();assert.throws(()=>run(state,'person.save',{name:'X',identification:'123',department:'Y'}),/13 dígitos/);
 assert.throws(()=>run(state,'person.save',{...state.people[0],name:'Otro'}),/DNI/);
 assert.throws(()=>run(state,'user.save',{name:'Otro',email:'ADMIN@SIG-EIC.GOV',role:'viewer',status:'active'}),/correo/);
 assert.throws(()=>run(state,'user.save',{...state.users[0],status:'inactive'},state.users[0].id),/desactivar/);
 const disabled=run(state,'user.save',{...state.users[1],status:'inactive'},state.users[1].id).state;
 assert.equal(disabled.users.length,state.users.length);assert.throws(()=>run(disabled,'person.save',{},undefined,{userId:state.users[1].id,role:'inventory_manager'}),/inactivo/);
});
test('proyectos se registran y resuelven; avisos se leen por usuario sin nueva bitácora',()=>{
 let state=run(createDemoState(),'project.save',{name:'Compra',description:'Material',budget:50},undefined,{...admin,role:'buyer'}).state;const project=state.projects.at(-1);
 state=run(state,'project.status',{status:'approved'},project.id).state;assert.equal(state.projects.at(-1).status,'approved');assert.throws(()=>run(state,'project.status',{status:'rejected'},project.id),/resuelta/);
 const count=state.auditLogs.length;state=run(state,'notification.read',{},'welcome',{...admin,role:'viewer'}).state;assert.equal(state.auditLogs.length,count);assert.deepEqual(state.notifications[0].readBy,[admin.userId]);
});
test('fallos de reglas no alteran el estado anterior ni la persistencia',async()=>{
 const {store,service}=provider();await service.getState();const before=store.getItem(STATE_KEY);
 await assert.rejects(service.execute({action:'asset.save',data:{...assetData,code:'EIC-MOB-1001'}}),/ya existe/);assert.equal(store.getItem(STATE_KEY),before);
 store.setItem=()=>{throw new Error('QuotaExceededError');};await assert.rejects(service.execute({action:'asset.save',data:assetData}),/No se pudo guardar/);assert.equal(store.getItem(STATE_KEY),before);
});
test('dos solicitudes simultáneas no registran códigos duplicados',async()=>{
 const {service}=provider();const results=await Promise.allSettled([service.execute({action:'asset.save',data:assetData}),service.execute({action:'asset.save',data:assetData})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await service.getState()).assets.filter(a=>a.code===assetData.code).length,1);
});
test('migración conserva colecciones vacías de v1 y no regenera ejemplos en una v2 vacía',async()=>{
 const store=memory([['sagp_demo_usuarios',JSON.stringify(createDemoState().users)],['sagp_demo_bienes','[]'],['sagp_demo_mantenimientos','[]']]);const {service}=provider(store);
 assert.equal((await service.getState()).assets.length,0);assert.equal(store.getItem('sagp_demo_bienes'),'[]');assert.equal((await service.getState()).assets.length,0);
});
test('datos dañados se conservan y requieren recuperación explícita',async()=>{
 const store=memory([[STATE_KEY,'broken']]);const {service}=provider(store);
 await assert.rejects(service.getState(),/No se pudieron leer/);assert.equal(store.getItem(STATE_KEY),'broken');await service.reset({recovery:true});assert.equal((await service.getState()).assets.length,11);
 const orphan=createDemoState();orphan.assets=orphan.assets.filter(a=>a.id!=='a-3');assert.throws(()=>validateState(orphan),/inexistente/);
});
test('restablecimiento elimina únicamente claves conocidas de la demo',async()=>{
 const {store,service}=provider(memory([['otra-app','conservar'],['sagp_demo_bienes','[]'],['sagp_demo_mantenimientos','[]']]));await service.reset();assert.equal(store.getItem('otra-app'),'conservar');assert.equal(store.getItem('sagp_demo_bienes'),null);
 store.setItem(SESSION_KEY,JSON.stringify({...admin,role:'viewer'}));await assert.rejects(service.reset(),/administrador/);
});
test('sesión: usuario inactivo no entra; cierre no elimina los datos',async()=>{
 const {store,service}=provider(),session=createSession({dataMode:'demo'},service,store);const state=await service.getState();await session.login(state.users[0]);assert.equal((await session.current(state)).role,'admin');await session.setRole('viewer');const current=await session.current(state);assert.equal(current.role,'viewer');assert.equal(current.id,state.users.find(u=>u.role==='viewer').id);state.users.find(u=>u.id===current.id).status='inactive';assert.equal(await session.current(state),null);await session.logout();assert.ok(store.getItem(STATE_KEY));assert.equal(store.getItem(SESSION_KEY),null);
});
test('API transmite comandos y cookies; errores no activan ninguna simulación',async()=>{
 const calls=[],snapshot=createDemoState();
 const api=createApiProvider('/sagp/',async(url,options)=>{calls.push([url,options]);return {ok:true,json:async()=>({ok:true,data:url.endsWith('datos.php')?snapshot:url.endsWith('sesion.php')?{csrfToken:'token'}:{id:'official-1'}})};});
 assert.equal((await api.getState()).version,3);await api.execute({action:'asset.save',data:assetData});const post=calls.find(([url])=>url.endsWith('acciones.php'));assert.equal(post[1].headers['X-CSRF-Token'],'token');assert.equal(post[1].credentials,'same-origin');assert.equal(JSON.parse(post[1].body).action,'asset.save');
 const failing=createApiProvider('/',async()=>({ok:false,json:async()=>({ok:false,error:{message:'Sin BDD'}})}));await assert.rejects(failing.getState(),/Sin BDD/);await assert.rejects(failing.reset(),/oficiales/);
 const service=await createService({dataMode:'api',baseUrl:'/'},{getItem(){throw new Error('Acceso local prohibido');}});assert.equal(typeof service.getSession,'function');
});

test('CSV conserva datos, comillas, acentos y saltos, y neutraliza fórmulas',async()=>{
 const {buildCsv}=await import('../assets/js/core/csv.js');
 const csv=buildCsv(['Nombre','Valor'],[['María; "EIC"',0],['Línea\nsegunda','=1+1']]);
 assert.ok(csv.startsWith('\uFEFF"Nombre";"Valor"\r\n'));
 assert.ok(csv.includes('"María; ""EIC""";"0"'));
 assert.ok(csv.includes('"Línea\nsegunda";"\'=1+1"'));
});
test('snapshot rechaza códigos duplicados y asignaciones vigentes inconsistentes',()=>{
 const duplicate=createDemoState();duplicate.assets[1].code=duplicate.assets[0].code;assert.throws(()=>validateState(duplicate),/duplicados/);
 const inconsistent=createDemoState();inconsistent.assets[0].currentAssignmentId='missing';assert.throws(()=>validateState(inconsistent),/vigente/);
});
test('el restablecimiento se ejecuta después de las escrituras pendientes',async()=>{
 const {service}=provider();await Promise.all([service.execute({action:'asset.save',data:assetData}),service.reset()]);assert.equal((await service.getState()).assets.length,11);
});
test('cierre oficial de sesión incluye CSRF y nunca accede a almacenamiento local',async()=>{
 const calls=[];
 const api=createApiProvider('/',async(url,options)=>{calls.push(options);return {ok:true,json:async()=>({ok:true,data:{csrfToken:'csrf'}})};});
 await api.signOut();assert.equal(calls.at(-1).method,'DELETE');assert.equal(calls.at(-1).headers['X-CSRF-Token'],'csrf');
 const store={getItem(){throw new Error('No acceder');},removeItem(){throw new Error('No acceder');}};
 const session=createSession({dataMode:'api'},api,store);await session.logout();
});

test('fechas de mantenimiento usan el día de Honduras aunque UTC haya cambiado',()=>{
 let result=executeCommand(createDemoState(),{action:'maintenance.open',data:{assetId:'a-4',description:'Prueba nocturna'}},admin,{now:'2026-10-01T03:00:00Z'});
 assert.equal(result.result.startDate,'2026-09-30');
 result=executeCommand(result.state,{action:'maintenance.close',id:result.result.id,data:{diagnostico:'Listo',resultStatus:'good'}},admin,{now:'2026-10-02T01:00:00Z'});
 assert.equal(result.result.endDate,'2026-10-01');
});

test('bitácora identifica la colección correcta aunque dos entidades compartan ID',()=>{
 const state=createDemoState();const bed=state.beds.find(b=>b.id==='bed-2');bed.id='a-1';
 const result=run(state,'bed.save',{...bed,dormitory:'Dormitorio actualizado'},bed.id);
 const before=JSON.parse(result.state.auditLogs.at(-1).before);
 assert.equal(before.bedNumber,'101-B');assert.equal(before.code,undefined);
});
