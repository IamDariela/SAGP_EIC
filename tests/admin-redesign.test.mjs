import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../data/mock/index.js';
import {executeCommand} from '../assets/js/core/commands.js';
import {createLocalProvider,STATE_KEY,SESSION_KEY} from '../assets/js/data/local.js';
import {normalizeDemo} from '../data/mock/index.js';
import {buildReports} from '../assets/js/core/reporting.js';
import {readZip,writeXlsx,parseSheet} from '../assets/js/core/spreadsheet.js';
import {writeDocx} from '../assets/js/core/export.js';
import {FLOOR_PLANS,resolveRoom} from '../assets/js/core/floorplans.js';
const admin={userId:'demo-user-1',role:'admin'};
const data={dormitory:'Dormitorio de Instructores',room:'Principal',bunk:'1',floor:1,upperNumber:'QA-SUP',lowerNumber:'QA-INF'};
function memory(state){const map=new Map([[STATE_KEY,JSON.stringify(state)],[SESSION_KEY,JSON.stringify(admin)]]);return {getItem:k=>map.get(k) ?? null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
test('una litera se crea con dos posiciones e historial conservado',()=>{
  const before=createDemoState(),result=executeCommand(before,{action:'bunk.save',data},admin);
  assert.equal(before.beds.length,8);assert.equal(result.state.beds.length,10);
  const pair=result.state.beds.filter(b=>result.result.bedIds.includes(b.id));
  assert.deepEqual(pair.map(b=>b.position),['upper','lower']);assert.ok(pair.every(b=>b.status==='available'));
  assert.equal(result.state.auditLogs.length,2);
  assert.throws(()=>executeCommand(result.state,{action:'bunk.save',data:{...data,upperNumber:'OTRA1',lowerNumber:'OTRA2'}},admin),/ya está configurada/);
});
test('si la segunda cama falla, el proveedor no guarda la primera',async()=>{
  const original=createDemoState(),store=memory(original),service=createLocalProvider(store,createDemoState,normalizeDemo,()=>admin),saved=store.getItem(STATE_KEY);
  await assert.rejects(service.execute({action:'bunk.save',data:{...data,lowerNumber:'101-A'}}),/ya existe/);
  assert.equal(store.getItem(STATE_KEY),saved);assert.equal((await service.getState()).beds.length,8);
});
test('la posición de una litera y los permisos impiden configuraciones duplicadas',()=>{
  const state=createDemoState(),result=executeCommand(state,{action:'bunk.save',data},admin),bed=result.state.beds.find(b=>b.bedNumber==='QA-SUP');
  assert.throws(()=>executeCommand(result.state,{action:'bed.save',data:{...bed,bedNumber:'OTRA'}},admin),/posición/);
  assert.throws(()=>executeCommand(state,{action:'bunk.save',data},{userId:'demo-user-6',role:'viewer'}),/rol no permite/);
});
test('los reportes universales no amplían el acceso de consulta',()=>{
  const state=createDemoState(),reports=buildReports(state,'admin'),viewer=buildReports(state,'viewer');
  assert.equal(reports.allAssets.rows.length,state.assets.length);
  assert.equal(viewer.allAssets,undefined);assert.equal(viewer.weapons,undefined);assert.equal(viewer.vehicles,undefined);
  assert.ok(viewer.computers.rows.length>0);
  const ids=new Set(state.assets.filter(a=>a.type==='general' && a.category==='Informática').map(a=>a.code));
  assert.deepEqual(new Set(viewer.computers.rows.map(r=>r[0])),ids);
  const filtered=buildReports(state,'admin',{locationId:'loc-3'});assert.ok(filtered.allAssets.rows.every(r=>r[3]==='Laboratorio Balística'));
});
test('los planos resuelven el catálogo y permiten IDs oficiales mediante el nombre',()=>{
  const state=createDemoState();
  for(const [floor,rooms] of Object.entries(FLOOR_PLANS))for(const room of rooms.filter(r=>r.id))assert.ok(resolveRoom(state.locations,room,Number(floor)),room.name);
  assert.equal(resolveRoom([{id:'official-22',name:'Recursos Humanos',floor:2}],FLOOR_PLANS[2].find(r=>r.id==='loc-rh'),2)?.id,'official-22');
  assert.equal(resolveRoom([],FLOOR_PLANS[2][0],2),undefined);
});
test('Word genera un paquete DOCX con texto seguro y orientación',async()=>{
  const report={title:'Investigación & equipos',subtitle:'DEMOSTRACIÓN',headers:['Código','Nombre'],rows:[['=1+1','<script>José</script>']]};
  const bytes=writeDocx(report,'landscape'),files=await readZip(bytes.buffer);
  assert.ok(files['[Content_Types].xml'].includes('wordprocessingml.document.main+xml'));
  assert.ok(files['_rels/.rels'].includes('Target="word/document.xml"'));
  const doc=files['word/document.xml'];assert.ok(doc.includes('w:orient="landscape"'));assert.ok(doc.includes('&lt;script&gt;José&lt;/script&gt;'));assert.ok(!doc.includes('<script>'));assert.ok(doc.includes('DEMOSTRACIÓN'));
});
test('Excel conserva fórmulas de apariencia como texto y el filtro aplicado',async()=>{
  const files=await readZip(writeXlsx(['Código','Nombre'],[['=HYPERLINK("x")','Equipo áéñ']]).buffer);
  const rows=parseSheet(files['xl/worksheets/sheet1.xml']);
  assert.deepEqual(rows,[['Código','Nombre'],['=HYPERLINK("x")','Equipo áéñ']]);assert.ok(!/<f[ >]/.test(files['xl/worksheets/sheet1.xml']));
});
