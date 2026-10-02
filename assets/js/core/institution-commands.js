/** Institutional workflows. Every change runs inside executeCommand's validated transaction. */
import {text,today} from './model.js';
import {required,number,date,find,unique,upsert} from './command-utils.js';
import {can} from './policy.js';
export const ENTITY_COLLECTIONS={enrollment:'enrollments',spaceUse:'spaceUses',driver:'drivers',trip:'trips',incident:'incidents',attachment:'attachments',fund:'funds',allocation:'allocations',expense:'expenses'};
const sum=(rows,key,id)=>rows.filter(r=>r[key]===id).reduce((n,r)=>n+r.amount,0);
function amount(value){const result=number(value,'Monto',{min:0.01});if(Math.abs(result*100-Math.round(result*100))>0.00001)throw new Error('El monto admite como máximo dos decimales.');return result;}
const activeLoans=(state,id)=>state.assignments.some(a=>a.enrollmentId===id && a.status==='active');
function ownDriver(state,driverId,actor,role) {
  const driver=find(state,'drivers',driverId);
  if(role==='conductor' && driver.userId!==actor.id)throw new Error('Solo puedes gestionar tus propios recorridos.');
  return driver;
}
export function institutionCommand(state,{action,id,data={}},{actor,role,now,makeId}) {
  const save=(name,values,target=id)=>upsert(state,name,values,target,now,makeId);
  switch(action) {
    case 'asset.move': {
      const asset=find(state,'assets',id),location=find(state,'locations',required(data.locationId,'Destino'));
      if(asset.status==='decommissioned' || location.id===asset.locationId)throw new Error('El bien está dado de baja o ya está en ese espacio.');
      if(state.trips.some(t=>t.assetId===id && t.status==='active'))throw new Error('Registra el regreso del vehículo antes de trasladarlo.');
      return save('assets',{locationId:location.id,lastMovement:{fromId:asset.locationId,toId:location.id,reason:required(data.reason,'Motivo'),actorId:actor.id,date:now}});
    }
    case 'enrollment.save': {
      const person=find(state,'people',required(data.personId,'Estudiante')),course=find(state,'courses',required(data.courseId,'Curso'));
      const old=id?find(state,'enrollments',id):null;
      if(old && (old.personId!==person.id || old.courseId!==course.id))throw new Error('La participación conserva su persona y curso. Registra otra participación para un nuevo curso.');
      if(!old && state.enrollments.some(n=>n.personId===person.id && n.courseId===course.id))throw new Error('La persona ya está inscrita en ese curso.');
      const status=data.status || 'active',needsBed=data.needsBed===true || data.needsBed==='yes';
      if(!['active','withdrawn','completed'].includes(status))throw new Error('Estado de participación inválido.');
      if(old && old.status!=='active')throw new Error('La participación cerrada conserva su historial.');
      if(course.status==='completed' && (!old || status==='active'))throw new Error('El curso ya está completado.');
      if(id && status!=='active' && activeLoans(state,id))throw new Error('Confirma la devolución del arma y libera la cama antes de cerrar la participación.');
      if(id && !needsBed && state.beds.some(b=>b.enrollmentId===id))throw new Error('Libera la cama antes de retirar el alojamiento.');
      if(status==='active' && state.enrollments.filter(n=>n.courseId===course.id && n.status==='active' && n.id!==id).length>=course.expectedStudents)throw new Error('El curso ya cubrió sus cupos.');
      const result=save('enrollments',{personId:person.id,courseId:course.id,status,needsBed});
      const active=state.enrollments.filter(n=>n.courseId===course.id && n.status==='active');
      Object.assign(course,{confirmedStudents:active.length,externalStudents:active.filter(n=>!n.needsBed).length,updatedAt:now});return result;
    }
    case 'spaceUse.open': {
      const location=find(state,'locations',required(data.locationId,'Espacio')),person=find(state,'people',required(data.personId,'Docente')),course=find(state,'courses',required(data.courseId,'Curso'));
      if(course.status==='completed')throw new Error('El curso está completado.');
      if(role==='teacher' && person.id!==actor.personId)throw new Error('Solo puedes registrar tu propia entrada.');
      if(state.spaceUses.some(u=>u.locationId===location.id && u.status==='active'))throw new Error('El espacio tiene una responsabilidad temporal activa. Registra su salida primero.');
      return save('spaceUses',{locationId:location.id,personId:person.id,courseId:course.id,startDate:now,status:'active',actorId:actor.id,notes:text(data.notes)},null);
    }
    case 'spaceUse.close': {
      const use=find(state,'spaceUses',id);if(use.status!=='active')throw new Error('La salida ya fue registrada.');
      if(role==='teacher' && use.personId!==actor.personId)throw new Error('Solo puedes registrar tu propia salida.');
      return save('spaceUses',{status:'completed',endDate:now,closedBy:actor.id,exitNotes:text(data.notes)});
    }
    case 'driver.save': {
      find(state,'people',required(data.personId,'Persona'));
      if(id && find(state,'drivers',id).personId!==data.personId)throw new Error('La ficha conserva a su conductor.');
      unique(state,'drivers','personId',data.personId,id,'El conductor');
      const issued=date(data.issued,'Emisión'),expires=date(data.expires,'Vencimiento');if(expires<issued)throw new Error('El vencimiento no puede preceder a la emisión.');
      if(data.userId){find(state,'users',data.userId);unique(state,'drivers','userId',data.userId,id,'La cuenta de conductor');}
      const status=data.status || 'active';if(!['active','inactive'].includes(status))throw new Error('Estado de conductor inválido.');
      if(status==='inactive' && state.trips.some(t=>t.driverId===id && t.status==='active'))throw new Error('Registra el regreso antes de desactivar al conductor.');
      const license=required(data.license,'Licencia');unique(state,'drivers','license',license,id,'La licencia');
      return save('drivers',{personId:data.personId,userId:data.userId || null,license,category:required(data.category,'Categoría'),issued,expires,status,notes:text(data.notes)});
    }
    case 'trip.open': {
      const asset=find(state,'assets',required(data.assetId,'Vehículo')),driver=ownDriver(state,required(data.driverId,'Conductor'),actor,role);
      if(asset.type!=='vehicle' || !['good','regular','repaired','stored'].includes(asset.status))throw new Error('El vehículo no está disponible.');
      if(driver.status!=='active' || driver.expires<today(now) || driver.issued>today(now))throw new Error('El conductor no tiene una licencia vigente.');
      if(state.trips.some(t=>(t.assetId===asset.id || t.driverId===driver.id) && t.status==='active'))throw new Error('El vehículo o el conductor ya tiene un recorrido activo.');
      const startMileage=number(data.startMileage,'Kilometraje inicial',{integer:true});if(startMileage<(asset.details?.mileage || 0))throw new Error('El kilometraje no puede disminuir.');
      asset.details.mileage=startMileage;
      return save('trips',{assetId:asset.id,driverId:driver.id,destination:required(data.destination,'Destino'),reason:required(data.reason,'Motivo'),startMileage,startDate:now,status:'active',actorId:actor.id},null);
    }
    case 'trip.close': {
      const trip=find(state,'trips',id);ownDriver(state,trip.driverId,actor,role);if(trip.status!=='active')throw new Error('El recorrido ya finalizó.');
      const endMileage=number(data.endMileage,'Kilometraje final',{integer:true});if(endMileage<trip.startMileage)throw new Error('El kilometraje final no puede ser menor al inicial.');
      const asset=find(state,'assets',trip.assetId);if(endMileage<asset.details.mileage)throw new Error('El kilometraje no puede disminuir.');asset.details.mileage=endMileage;
      return save('trips',{endMileage,endDate:now,status:'completed',closedBy:actor.id,notes:text(data.notes)});
    }
    case 'incident.save': {
      const asset=find(state,'assets',required(data.assetId,'Vehículo'));
      if(asset.type!=='vehicle' || asset.status==='decommissioned')throw new Error('Vehículo inválido.');
      if(role==='conductor') {
        const driver=state.drivers.find(d=>d.userId===actor.id);
        if(!driver || !state.trips.some(t=>t.assetId===asset.id && t.driverId===driver.id))throw new Error('Reporta incidencias de los vehículos que has utilizado.');
      }
      return save('incidents',{assetId:asset.id,description:required(data.description,'Problema observado'),status:'open',reportedBy:actor.id,date:now},null);
    }
    case 'incident.resolve': {
      const incident=find(state,'incidents',id);if(incident.status!=='open')throw new Error('La incidencia ya fue atendida.');
      if(data.maintenanceId && find(state,'maintenance',data.maintenanceId).assetId!==incident.assetId)throw new Error('La orden no corresponde al vehículo.');
      return save('incidents',{status:'resolved',maintenanceId:data.maintenanceId || null,resolution:required(data.resolution,'Seguimiento realizado'),resolvedBy:actor.id,resolvedAt:now});
    }
    case 'maintenance.progress': {
      const ticket=find(state,'maintenance',id);if(ticket.status!=='open')throw new Error('La orden ya está cerrada.');
      if(!['diagnosis','repair','verification'].includes(data.stage))throw new Error('Etapa inválida.');
      return save('maintenance',{stage:data.stage,diagnostico:required(data.diagnostico,'Diagnóstico'),work:text(data.work),verification:text(data.verification)});
    }
    case 'attachment.add': {
      const targets={asset:['assets','asset.save'],person:['people','person.save'],driver:['drivers','driver.save'],maintenance:['maintenance','maintenance.progress'],project:['projects','project.save'],fund:['funds','fund.save'],expense:['expenses','expense.save']};
      const target=targets[data.targetType];if(!target)throw new Error('Destino de documento inválido.');
      const record=find(state,target[0],required(data.targetId,'Registro'));
      if(!can(role,target[1],record))throw new Error('Tu rol no puede adjuntar documentos a este registro.');
      const mime=data.mime;if(!['image/png','image/jpeg','application/pdf'].includes(mime))throw new Error('Solo se admiten fotografías PNG/JPG y documentos PDF.');
      const content=required(data.content,'Archivo');
      if(!content.startsWith(`data:${mime};base64,`) || !/^[A-Za-z0-9+/]+={0,2}$/.test(content.split(',')[1] || ''))throw new Error('Archivo inválido.');
      if(content.length>700000 || state.attachments.reduce((n,a)=>n+(a.content?.length || 0),0)+content.length>2500000)throw new Error('La demo admite archivos de hasta 500 KB y 1,8 MB en total.');
      const signature=content.split(',')[1];
      if(!(mime==='image/png'?signature.startsWith('iVBORw0KGgo'):mime==='image/jpeg'?signature.startsWith('/9j/'):signature.startsWith('JVBERi0')))throw new Error('El contenido del archivo no coincide con su formato.');
      const phase=data.phase || 'document';if(!['before','after','document'].includes(phase))throw new Error('Tipo de evidencia inválido.');
      return save('attachments',{targetType:data.targetType,targetId:record.id,name:required(data.name,'Nombre'),mime,content,phase,description:text(data.description),uploadedBy:actor.id},null);
    }
    case 'fund.save': {
      if(data.courseId)find(state,'courses',data.courseId);
      return save('funds',{concept:required(data.concept,'Concepto'),amount:amount(data.amount),date:date(data.date,'Fecha'),courseId:data.courseId || null,status:'received'},null);
    }
    case 'allocation.save': {
      const fund=find(state,'funds',required(data.fundId,'Fondo')),project=find(state,'projects',required(data.projectId,'Proyecto'));
      if(project.status!=='approved')throw new Error('El proyecto debe estar aprobado.');
      const value=amount(data.amount);
      if(value>fund.amount-sum(state.allocations,'fundId',fund.id)+0.001 || value>project.budget-sum(state.allocations,'projectId',project.id)+0.001)throw new Error('El monto supera el saldo del fondo o el presupuesto del proyecto.');
      return save('allocations',{fundId:fund.id,projectId:project.id,amount:value,date:today(now)},null);
    }
    case 'expense.save': {
      const project=find(state,'projects',required(data.projectId,'Proyecto'));if(project.status!=='approved')throw new Error('El proyecto debe estar aprobado.');
      const value=amount(data.amount);
      if(value>sum(state.allocations,'projectId',project.id)-sum(state.expenses,'projectId',project.id)+0.001)throw new Error('El gasto supera la financiación disponible.');
      const supplier=required(data.supplier,'Proveedor'),invoice=required(data.invoice,'Factura');
      if(state.expenses.some(e=>e.supplier.toLowerCase()===supplier.toLowerCase() && e.invoice.toLowerCase()===invoice.toLowerCase()))throw new Error('La factura ya está registrada para ese proveedor.');
      return save('expenses',{projectId:project.id,supplier,invoice,concept:required(data.concept,'Concepto'),amount:value,date:date(data.date,'Fecha')},null);
    }
    default: throw new Error('Operación desconocida.');
  }
}
