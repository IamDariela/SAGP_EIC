import {ACTION_LABELS,STATUS} from './model.js';
import {view,info,escapeHtml as e,lookup,money,dateTime,delegate,canVisit,pageLink} from './ui.js';
import {documentHtml,handleDocument} from './documents.js';
export function historyHtml(ctx,type,id) {
  const logs=ctx.state.auditLogs.filter(l=>l.entityId===id && l.action.startsWith(type+'.')).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  return `<h3 class="section-title">Historial del registro</h3>${logs.length?`<ol class="timeline">${logs.map(l=>`<li><strong>${e(ACTION_LABELS[l.action] || l.action)}</strong><p>${e(l.actorName)} · ${e(dateTime(l.timestamp))}</p>${l.action==='asset.move'?`<p>${e(JSON.parse(l.after).lastMovement?.reason)}</p>`:''}</li>`).join('')}</ol>`:'<p class="text-muted">Sin cambios posteriores al registro inicial de ejemplo.</p>'}`;
}
export function assetDetail(ctx,id) {
  const {state}=ctx,asset=state.assets.find(a=>a.id===id);if(!asset)return;
  const loans=state.assignments.filter(a=>a.resource==='asset' && a.itemId===id).sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const maintenance=state.maintenance.filter(m=>m.assetId===id);
  const dialog=view(`${asset.code} · ${asset.name}`,info([['Categoría',asset.category],['Descripción',asset.description],['Marca / modelo',[asset.brand,asset.model].filter(Boolean).join(' ')],['Serie',asset.serial],['Color',asset.color],['Valor',money(asset.costoUnitario)],['Ubicación actual',lookup(state.locations,asset.locationId)],['Estado',STATUS[asset.status]],['Responsable',lookup(state.people,asset.assignedPersonId)],...(asset.type==='vehicle'?[['Placa',asset.details.plate],['Kilometraje',asset.details.mileage],['Próximo mantenimiento',asset.details.nextServiceDate]]:asset.type==='weapon'?[['Calibre',asset.details.caliber],['Tipo',asset.details.weaponType]]:[])])+`<h3 class="section-title">Asignaciones y devoluciones</h3>${loans.length?`<ol class="timeline">${loans.map(a=>`<li><strong>${e(lookup(state.people,a.personId))}</strong><p>${e(a.courseId?lookup(state.courses,a.courseId):'Asignación institucional')} · ${e(STATUS[a.status])}</p><p>${e(dateTime(a.startDate))} → ${e(a.endDate?dateTime(a.endDate):'Vigente')}</p></li>`).join('')}</ol>`:'<p>Sin asignaciones.</p>'}<h3 class="section-title">Mantenimientos</h3>${maintenance.map(m=>`<p>${e(m.startDate)} · ${e(m.description)} · ${e(STATUS[m.status])}</p>`).join('') || '<p>Sin mantenimientos registrados.</p>'}${historyHtml(ctx,'asset',id)}${documentHtml(ctx,'asset',id,asset)}`);
  delegate(dialog,(action,target)=>handleDocument(ctx,action,target,()=>{dialog.close();assetDetail(ctx,id);}));return dialog;
}
export function personDetail(ctx,id) {
  const {state}=ctx,person=state.people.find(p=>p.id===id);if(!person)return;
  const participations=state.enrollments.filter(n=>n.personId===id),loans=state.assignments.filter(a=>a.personId===id && (a.resource==='bed' || state.assets.find(r=>r.id===a.itemId)?.type!=='weapon' || canVisit(ctx,'armeria')));
  const dialog=view(person.name,info([['Identidad',person.identification],['Departamento',person.department],['Teléfono',person.phone]])+`<h3 class="section-title">Participaciones independientes</h3>${participations.map(n=>`<article class="card"><strong>${e(lookup(state.courses,n.courseId))}</strong><p>${e(STATUS[n.status])} · ${n.needsBed?'Requiere alojamiento':'Sin requerimiento de alojamiento'}</p>${canVisit(ctx,'cursos')?pageLink(ctx,'cursos',n.courseId,'Consultar curso'):''}</article>`).join('') || '<p>Sin participaciones.</p>'}<h3 class="section-title">Recursos e historial</h3>${loans.map(a=>`<p>${e(a.resource==='bed'?lookup(state.beds,a.itemId,'bedNumber'):lookup(state.assets,a.itemId,'code'))} · ${e(STATUS[a.status])} · ${e(dateTime(a.startDate))}</p>`).join('') || '<p>Sin asignaciones.</p>'}${documentHtml(ctx,'person',id,person)}${historyHtml(ctx,'person',id)}`);
  delegate(dialog,(action,target)=>handleDocument(ctx,action,target,()=>{dialog.close();personDetail(ctx,id);}));return dialog;
}
export function requestedDetail(ctx,open) {
  const id=new URLSearchParams(location.search).get('id');if(id && ctx.requestedId!==id){ctx.requestedId=id;open(id);}
}
