import {ACTION_LABELS,ROLES,STATUS,today} from '../core/model.js';
import {actions,table,dateTime,escapeHtml as e,delegate,view,actionButton as button,lookup,toast} from '../core/ui.js';
import {activityVisible} from '../core/queries.js';
import {heading,iconButton} from '../core/presentation.js';
import {exportPicker} from '../core/export.js';
const labels={name:'Nombre',code:'Código',status:'Estado',locationId:'Ubicación',assignedPersonId:'Responsable',courseId:'Curso',budget:'Presupuesto',amount:'Monto',description:'Descripción',diagnostico:'Diagnóstico',work:'Trabajo',verification:'Verificación',needsBed:'Alojamiento',endMileage:'Kilometraje final',destination:'Destino',stage:'Etapa',lastMovement:'Movimiento',startDate:'Inicio',endDate:'Fin'};
function changes(ctx,record){
  const before=JSON.parse(record.before || '{}'),after=JSON.parse(record.after || '{}');
  const display=(key,v)=>v==null?'—':['status','stage'].includes(key)?STATUS[v] || v:key==='locationId'?lookup(ctx.state.locations,v):key==='assignedPersonId'?lookup(ctx.state.people,v):key==='courseId'?lookup(ctx.state.courses,v):key==='lastMovement'?v.reason:typeof v==='boolean'?v?'Sí':'No':String(v);
  return Object.entries(labels).filter(([key])=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(([key,label])=>({label,before:display(key,before[key]),after:display(key,after[key])}));
}
export function mount(ctx){
  heading('BITÁCORA DE OPERACIONES','Historial completo de cambios y movimientos','history');actions([]);
  ctx.auditRange ||= {start:'',end:''};
  const range=ctx.auditRange,all=ctx.state.auditLogs.filter(l=>activityVisible(ctx.state,ctx.user.role,l)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  const rows=all.filter(l=>(!range.start || today(l.timestamp)>=range.start) && (!range.end || today(l.timestamp)<=range.end));
  let visible=rows;
  ctx.root.innerHTML=`<form class="card module-toolbar"><div class="form-group"><label for="audit-from" class="form-label">Fecha inicial</label><input class="form-control" id="audit-from" name="start" type="date" value="${e(range.start)}"></div><div class="form-group"><label for="audit-to" class="form-label">Fecha final</label><input class="form-control" id="audit-to" name="end" type="date" value="${e(range.end)}"></div><button class="btn btn-secondary" type="submit">Aplicar período</button><button class="btn btn-secondary" type="button" id="audit-clear">Limpiar período</button></form><div id="audit-table"></div>`;
  exportPicker(document.getElementById('page-actions'),()=>({title:'Bitácora de operaciones',subtitle:ctx.config.dataMode==='demo'?'DEMOSTRACIÓN':'Información institucional',headers:['Fecha','Responsable','Función','Operación','Registro','Cambios'],rows:visible.map(r=>[dateTime(r.timestamp),r.actorName,ROLES[r.role],ACTION_LABELS[r.action] || r.action,r.entityName,changes(ctx,r).map(c=>c.label+': '+c.before+' → '+c.after).join('; ')])}));
  const columns=[{label:'Fecha y hora',render:r=>e(dateTime(r.timestamp))},{label:'Operación',render:r=>`<span class="badge badge-planned">${e(ACTION_LABELS[r.action] || r.action)}</span>`},{label:'Bien / registro',render:r=>`<strong>${e(r.entityName)}</strong><small>${e(JSON.parse(r.after || '{}').code || '')}</small>`},{label:'Cambios / detalle',render:r=>`<div class="audit-change">${changes(ctx,r).slice(0,3).map(c=>`${e(c.label)}: <del>${e(c.before)}</del> → <ins>${e(c.after)}</ins>`).join('<br>') || '<span class="text-muted">Sin cambios de campos registrados</span>'}</div>${iconButton('changes',r.id,'Ver todos los cambios','history')}`},{key:'actorName',label:'Responsable'}];
  table(ctx.root.querySelector('#audit-table'),rows,columns,{placeholder:'Buscar por código, nombre o responsable…',filters:[{key:'action',label:'Todas las operaciones',options:[...new Set(all.map(l=>l.action))].map(v=>[v,ACTION_LABELS[v] || v])}],onChange:r=>{visible=r;},empty:'Todavía no hay operaciones en este período.'});
  ctx.root.querySelector('form').onsubmit=event=>{event.preventDefault();const next=Object.fromEntries(new FormData(event.target));if(next.start && next.end && next.end<next.start){toast('La fecha final debe ser posterior al inicio.');return;}ctx.auditRange=next;mount(ctx);};
  ctx.root.querySelector('#audit-clear').onclick=()=>{ctx.auditRange={start:'',end:''};mount(ctx);};
  delegate(ctx.root,(action,id)=>{if(action!=='changes')return;const r=rows.find(l=>l.id===id);view((ACTION_LABELS[r.action] || r.action)+' · '+r.entityName,`<p>${e(r.actorName)} · ${e(dateTime(r.timestamp))}</p><table class="table-custom"><thead><tr><th>Información</th><th>Antes</th><th>Después</th></tr></thead><tbody>${changes(ctx,r).map(c=>`<tr><td>${e(c.label)}</td><td>${e(c.before)}</td><td>${e(c.after)}</td></tr>`).join('') || '<tr><td colspan="3">Detalles conservados en el historial correspondiente.</td></tr>'}</tbody></table>`);});
}
