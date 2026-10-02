import {readdirSync,existsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const php=process.env.PHP_BIN || (existsSync('C:/xampp/php/php.exe')?'C:/xampp/php/php.exe':'php');
const files=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(entry.name))continue;const file=join(dir,entry.name);if(entry.isDirectory())walk(file);else files.push(file);}}
walk(root);
function check(executable,args){const result=spawnSync(executable,args,{cwd:root,encoding:'utf8',windowsHide:true});if(result.error || result.status!==0)throw new Error(result.error?.message || result.stdout+result.stderr);return result.stdout;}
for(const file of files.filter(f=>f.endsWith('.php')))check(php,['-l',file]);
for(const file of files.filter(f=>/\.(?:js|mjs)$/.test(f)))check(process.execPath,['--check',file]);
console.log(`Sintaxis: ${files.filter(f=>f.endsWith('.php')).length} PHP y ${files.filter(f=>/\.(?:js|mjs)$/.test(f)).length} JS/MJS válidos.`);
const testOutput=check(process.execPath,['--test','--test-reporter=tap',...files.filter(f=>f.endsWith('.test.mjs'))]);
console.log(`Reglas, persistencia y proveedores: ${testOutput.match(/# tests (\d+)/)?.[1] || 'todas las'} pruebas correctas.`);
async function freePort(){const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function httpCheck(mode){
 const port=await freePort(),base=`http://127.0.0.1:${port}`;
 const server=spawn(php,['-S',`127.0.0.1:${port}`,'-t',root],{cwd:root,env:{...process.env,SAGP_DATA_MODE:mode,SAGP_BASE_PATH:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let log='';server.stdout.on('data',data=>log+=data);server.stderr.on('data',data=>log+=data);let launchError;server.on('error',error=>launchError=error);
 try{
  let ready=false;for(let n=0;n<50;n++){if(launchError)throw launchError;try{const response=await fetch(base+'/login.php');if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,'PHP no inició: '+log);
  const index=await fetch(base+'/',{redirect:'manual'});assert.equal(index.status,302);assert.equal(index.headers.get('location'),'/login.php');
  for(const file of ['login.php',...files.filter(f=>relative(root,f).replaceAll('\\','/').startsWith('pages/') && f.endsWith('.php')).map(f=>relative(root,f).replaceAll('\\','/'))]){
   const response=await fetch(base+'/'+file);assert.equal(response.status,200,file);const html=await response.text();assert.ok(!/Warning:|Fatal error:/.test(html),file);
   assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length,`Divs ${file}`);
   // Drain resource bodies before the next request: PHP closes HTTP/1.0 connections,
   // and unread SVG bodies can leave Node's HTTP parser paused on Windows.
   for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const url=match[1];assert.ok(url.startsWith('/'),`Recurso externo o ruta relativa: ${url}`);const asset=await fetch(base+url);assert.equal(asset.status,200,`${file} → ${url}`);await asset.arrayBuffer();}
  }
  for(const endpoint of ['datos','sesion','bienes','usuarios']){const response=await fetch(`${base}/api/${endpoint}.php`);assert.equal(response.status,mode==='demo'?409:503);const payload=await response.json();assert.equal(payload.ok,false);assert.equal(payload.error.code,mode==='demo'?'DEMO_MODE':'BACKEND_NOT_CONFIGURED');}
  assert.equal((await fetch(base+'/api/acciones.php')).status,405);
  const command=await fetch(base+'/api/acciones.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'asset.save',data:{}})});assert.equal(command.status,mode==='demo'?409:503);
 }finally{server.kill();await new Promise(resolve=>server.once('close',resolve));}
}
await httpCheck('demo');await httpCheck('api');
// Render a subdirectory deployment in CLI without serving directories outside this project.
const source=`$_SERVER['SCRIPT_NAME']='/sagp/pages/inventario.php'; $_SERVER['SCRIPT_FILENAME']='${root.replaceAll('\\','/').replaceAll("'","\\'")}/pages/inventario.php'; require 'config/app.php'; echo base_url('assets/js/app.js');`;
const subdir=spawnSync(php,['-r',source],{cwd:root,env:{...process.env,SAGP_BASE_PATH:undefined},encoding:'utf8',windowsHide:true});assert.equal(subdir.status,0);assert.equal(subdir.stdout,'/sagp/assets/js/app.js');
assert.equal(files.filter(f=>/\.(ts|tsx)$/.test(f)).length,0);
console.log(`HTTP: ${1+files.filter(f=>relative(root,f).replaceAll('\\','/').startsWith('pages/') && f.endsWith('.php')).length} pantallas y recursos correctos en demo/API; subcarpeta, métodos y errores verificados. Sin TypeScript.`);
