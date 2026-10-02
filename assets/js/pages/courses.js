import {can} from '../core/policy.js';
import {STATUS} from '../core/model.js';
import {actions,table,form,delegate,escapeHtml as e,badge,lookup,actionButton as button,stats,info,view,canVisit,pageLink} from '../core/ui.js';
import {courseForm} from './planning.js';
import {showQr,scanQr} from '../core/qr-ui.js';
export function participationDetail(ctx,id) {
  const {state,user}=ctx,n=state.enrollments.find(r=>r.id===id);if(!n)return;
  const bed=state.beds.find(b=>b.enrollmentId===id),weapons=state.assignments.filter(a=>a.enrollmentId===id && a.resource==='asset' && state.assets.find(r=>r.id===a.itemId)?.type==='weapon'),activeWeapon=weapons.find(a=>a.status==='active');
  const dialog=view(lookup(state.people,n.personId),info([...(canVisit(ctx,'personas') || canVisit(ctx,'armeria')?[['Identidad',lookup(state.people,n.personId,'identification')]]:[]),['Curso',lookup(state.courses,n.courseId)],['Estado',STATUS[n.status]],['Alojamiento',n.needsBed?'Requiere':'No requiere'],['Cama actual',bed?.bedNumber],...(canVisit(ctx,'armeria')?[['Arma actual',activeWeapon?lookup(state.assets,activeWeapon.itemId,'serial'):'Sin asignación']]:[])])+`<div class="row-actions">${button('qr',id,'Ver QR')}${n.status==='active' && n.needsBed && !bed && can(user.role,'bed.assign')?button('bed',id,'Asignar cama'):''}${bed && can(user.role,'bed.release')?button('release',bed.id,'Liberar cama'):''}${activeWeapon && can(user.role,'asset.return',state.assets.find(a=>a.id===activeWeapon.itemId))?button('return',activeWeapon.itemId,'Confirmar devolución'):''}${canVisit(ctx,'armeria')?pageLink(ctx,'armeria',null,'Control de armas'):''}</div><p class="notice">Al terminar el curso, el responsable verifica las devoluciones y libera los recursos. El historial de esta participación permanece.</p>`);
  delegate(dialog,async(action,target)=>{
    if(action==='qr')showQr('enrollment',id,lookup(state.people,n.personId));
    if(action==='bed')assignBed(ctx,n,()=>dialog.close());
    if(action==='release' && confirm('¿Liberar la cama conservando el historial de esta participación?')){await ctx.perform({action:'bed.release',id:target});dialog.close();}
    if(action==='return' && confirm('¿Se verificó físicamente la devolución del arma? Confirmar retorno.')){await ctx.perform({action:'asset.return',id:target});dialog.close();}
  });return dialog;
}
export function assignBed(ctx,n,after) {
  form({title:'Asignar alojamiento',fields:[{name:'bedId',label:'Cama disponible',options:ctx.state.beds.filter(b=>b.status==='available').map(b=>({value:b.id,label:`${b.dormitory} · Hab. ${b.room} · Litera ${b.bunk} · ${b.position==='upper'?'Superior':'Inferior'} · ${b.bedNumber}`}))}],save:async data=>{await ctx.perform({action:'bed.assign',id:data.bedId,data:{enrollmentId:n.id,personId:n.personId,courseId:n.courseId}});after?.();}});
}
export function mount(ctx) {
  const {root,state,user}=ctx;
  const request=new URLSearchParams(location.search).get('id');ctx.courseId ||= request || state.courses[0]?.id;
  const course=state.courses.find(c=>c.id===ctx.courseId) || state.courses[0];if(course)ctx.courseId=course.id;
  actions([{label:'Leer QR de estudiante',kind:'secondary',run:()=>scanQr(ctx,'enrollment',id=>participationDetail(ctx,id))},...(can(user.role,'course.save')?[{label:'Programar curso',run:()=>courseForm(ctx)}]:[])]);
  root.innerHTML='<div id="course-list"></div><section id="course-detail"></section>';
  table(root.querySelector('#course-list'),state.courses,[{key:'code',label:'Código'},{key:'name',label:'Curso'},{key:'startDate',label:'Inicio'},{key:'endDate',label:'Fin'},{label:'Estado',render:c=>badge(c.status)},{label:'Acciones',render:c=>button('select',c.id,'Ver estudiantes')+(can(user.role,'course.save')?button('course-edit',c.id,'Editar curso'):'')}]);
  if(course) {
    const participants=state.enrollments.filter(n=>n.courseId===course.id);
    const section=root.querySelector('#course-detail');section.innerHTML=`<h2 class="section-title">${e(course.name)}</h2><p>${e(course.description)}</p><div id="course-stats"></div><div class="row-actions">${can(user.role,'enrollment.save') && course.status!=='completed'?button('enroll',course.id,'Inscribir estudiante'):''}</div><div id="enrollments-table"></div>`;
    stats(section.querySelector('#course-stats'),[['Participaciones',participants.length],['Activos',participants.filter(n=>n.status==='active').length],['Con cama',state.beds.filter(b=>b.courseId===course.id).length],['Pendientes de alojamiento',participants.filter(n=>n.status==='active' && n.needsBed && !state.beds.some(b=>b.enrollmentId===n.id)).length]]);
    table(section.querySelector('#enrollments-table'),participants.map(n=>({...n,person:lookup(state.people,n.personId)})),[{key:'person',label:'Estudiante'},{label:'Estado',render:n=>badge(n.status)},{label:'Alojamiento',render:n=>n.needsBed?'Requiere cama':'No requiere'},{label:'Cama',render:n=>e(state.beds.find(b=>b.enrollmentId===n.id)?.bedNumber || '—')},...(canVisit(ctx,'armeria')?[{label:'Arma',render:n=>e(state.assignments.filter(a=>a.enrollmentId===n.id && a.status==='active' && a.resource==='asset').map(a=>lookup(state.assets,a.itemId,'serial')).join(', ') || '—')}]:[]),{label:'Acciones',render:n=>button('participation',n.id,'Consultar / QR')+(can(user.role,'enrollment.save') && n.status==='active'?button('enrollment-edit',n.id,'Actualizar'):'')}]);
  }
  const enroll=(record,courseId)=>form({title:record?'Actualizar participación':'Inscribir estudiante',values:record?{...record,needsBed:record.needsBed?'yes':'no'}:{needsBed:'yes',status:'active'},fields:[...(!record?[{name:'personId',label:'Persona registrada',options:state.people.filter(p=>!state.enrollments.some(n=>n.personId===p.id && n.courseId===courseId)).map(p=>({value:p.id,label:p.name}))}]:[]),{name:'needsBed',label:'Requiere alojamiento',options:[{value:'yes',label:'Sí'},{value:'no',label:'No'}]},{name:'status',label:'Participación',options:['active','withdrawn','completed'].map(value=>({value,label:STATUS[value]}))}],save:data=>ctx.perform({action:'enrollment.save',id:record?.id,data:{...data,personId:record?.personId || data.personId,courseId:record?.courseId || courseId}})});
  delegate(root,(action,id)=>{
    if(action==='select'){ctx.courseId=id;mount(ctx);}
    if(action==='course-edit')courseForm(ctx,state.courses.find(c=>c.id===id));
    if(action==='enroll')enroll(null,id);
    if(action==='enrollment-edit')enroll(state.enrollments.find(n=>n.id===id));
    if(action==='participation')participationDetail(ctx,id);
  });
}
