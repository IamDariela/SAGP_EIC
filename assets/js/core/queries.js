import {today} from './model.js';
const AREAS={asset:['admin','inventory_manager','weapon_manager','vehicle_manager','viewer'],location:['admin','inventory_manager','teacher','supervisor','viewer'],person:['admin','inventory_manager','supervisor'],user:['admin'],bed:['admin','inventory_manager','supervisor','viewer'],course:['admin','inventory_manager','supervisor','weapon_manager','teacher','viewer'],enrollment:['admin','inventory_manager','supervisor','weapon_manager','teacher','viewer'],spaceUse:['admin','inventory_manager','supervisor','teacher','viewer'],maintenance:['admin','inventory_manager','maintenance_staff'],driver:['admin','vehicle_manager','conductor'],trip:['admin','vehicle_manager','conductor'],incident:['admin','vehicle_manager','conductor','maintenance_staff'],project:['admin','buyer','viewer'],fund:['admin','buyer','viewer'],allocation:['admin','buyer','viewer'],expense:['admin','buyer','viewer'],attachment:['admin','inventory_manager','weapon_manager','vehicle_manager','maintenance_staff','buyer']};
export function activityVisible(state,role,entry) {
  const area=entry.action?.split('.')[0];if(!area)return true;
  if(area==='asset') {
    const asset=state.assets.find(a=>a.id===entry.entityId);
    return !asset?role==='admin':asset.type==='weapon'?['admin','weapon_manager','supervisor'].includes(role):asset.type==='vehicle'?['admin','vehicle_manager','conductor'].includes(role):['admin','inventory_manager','viewer'].includes(role);
  }
  return Boolean(AREAS[area]?.includes(role));
}
export function alerts(state,user,day=today()) {
  const rows=[],add=(id,message,page,severity='warning')=>rows.push({id,message,page,severity});
  const within=(date,days)=>date && date<=new Date(new Date(day+'T12:00:00Z').valueOf()+days*86400000).toISOString().slice(0,10);
  if(['admin','supervisor','inventory_manager','weapon_manager'].includes(user.role))for(const course of state.courses.filter(c=>c.status!=='completed' && within(c.endDate,7))) {
    const loans=state.assignments.filter(a=>a.courseId===course.id && a.status==='active'),beds=loans.filter(a=>a.resource==='bed').length,weapons=loans.filter(a=>a.resource==='asset' && state.assets.find(r=>r.id===a.itemId)?.type==='weapon').length;
    add('course-'+course.id,`${course.name}: ${course.endDate<day?'fecha de finalización vencida':'finaliza próximamente'}. ${beds} ${beds===1?'cama':'camas'} y ${weapons} ${weapons===1?'arma':'armas'} pendientes de confirmar.`, 'cursos');
  }
  if(['admin','supervisor','inventory_manager'].includes(user.role)) {
    const pending=state.enrollments.filter(n=>n.status==='active' && n.needsBed && !state.beds.some(b=>b.assignedPersonId===n.personId));if(pending.length)add('beds-pending',`${pending.length} ${pending.length===1?'estudiante requiere alojamiento y aún no tiene cama':'estudiantes requieren alojamiento y aún no tienen cama'}.`, 'dormitorios');
  }
  if(['admin','vehicle_manager','conductor'].includes(user.role)) {
    for(const driver of state.drivers.filter(d=>d.status==='active' && (user.role!=='conductor' || d.userId===user.id) && within(d.expires,30)))add('license-'+driver.id,`Licencia de ${state.people.find(p=>p.id===driver.personId)?.name}: ${driver.expires<day?'vencida':'vence el '+driver.expires}.`,'conductores',driver.expires<day?'danger':'warning');
    for(const asset of state.assets.filter(a=>a.type==='vehicle' && a.details?.nextServiceDate && within(a.details.nextServiceDate,7)))add('service-'+asset.id,`${asset.details.plate}: mantenimiento programado para ${asset.details.nextServiceDate}.`,'vehiculos');
  }
  if(['admin','maintenance_staff','inventory_manager'].includes(user.role)) {
    const count=state.maintenance.filter(m=>m.status==='open').length;if(count)add('maintenance',`${count} ${count===1?'orden de mantenimiento pendiente':'órdenes de mantenimiento pendientes'} de cierre.`, 'mantenimiento');
    const incidents=state.incidents.filter(i=>i.status==='open').length;if(incidents)add('incidents',`${incidents} ${incidents===1?'incidencia vehicular requiere':'incidencias vehiculares requieren'} seguimiento.`, 'mantenimiento');
  }
  if(['admin','buyer'].includes(user.role)) {const count=state.projects.filter(p=>p.status==='draft').length;if(count)add('projects',`${count} ${count===1?'proyecto pendiente':'proyectos pendientes'} de aprobación.`, 'proyectos');}
  return rows;
}
export const financeTotals=(state,projectId)=>{const sum=rows=>rows.reduce((n,r)=>n+r.amount,0),funded=sum(state.allocations.filter(a=>a.projectId===projectId)),spent=sum(state.expenses.filter(e=>e.projectId===projectId));return {funded,spent,balance:funded-spent};};
