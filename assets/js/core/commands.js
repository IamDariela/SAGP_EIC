import {ROLES, ACTION_LABELS, today, text, normalize, newId, validateState} from './model.js';
import {can} from './policy.js';
import {required,number,date,find,unique,upsert,closeAssignment} from './command-utils.js';
import {institutionCommand,ENTITY_COLLECTIONS} from './institution-commands.js';
import {importCommands} from './import.js';

/** Pure transaction: validate a clone and return it; the provider persists once, only after success. */
export function executeCommand(previous,command,session,{now=new Date().toISOString(),makeId=newId}={}) {
  if (!command || typeof command.action !== 'string' || (command.data !== undefined && (!command.data || typeof command.data !== 'object' || Array.isArray(command.data)))) throw new Error('Solicitud inválida.');
  validateState(previous);
  const state = structuredClone(previous);
  const actor = find(state,'users',session?.userId);
  if (actor.status !== 'active') throw new Error('Tu perfil está inactivo. Vuelve a iniciar sesión.');
  const role = session.role || actor.role;
  if (!ROLES[role]) throw new Error('Rol desconocido.');
  const {action,id,data={}} = command;
  const subject = action.startsWith('asset.') ? (id ? find(state,'assets',id) : data) : null;
  if (!can(role,action,subject)) throw new Error('Tu rol no permite realizar esta operación.');
  if(action==='bunk.save') {
    const dormitory=required(data.dormitory,'Dormitorio'),room=required(data.room,'Habitación'),bunk=required(data.bunk,'Litera');
    if(state.beds.some(b=>b.dormitory===dormitory && b.room===room && b.bunk===bunk))throw new Error('Esta litera ya está configurada. Edita sus camas existentes.');
    const shared={dormitory,room,bunk,floor:data.floor,status:'available'};
    const upper=executeCommand(state,{action:'bed.save',data:{...shared,bedNumber:data.upperNumber,position:'upper'}},session,{now,makeId});
    const lower=executeCommand(upper.state,{action:'bed.save',data:{...shared,bedNumber:data.lowerNumber,position:'lower'}},session,{now,makeId});
    return {state:lower.state,result:{id:lower.result.id,bedIds:[upper.result.id,lower.result.id]}};
  }
  if(action==='student.import') {
    const person=executeCommand(state,{action:'person.save',data:data.person},session,{now,makeId});
    return executeCommand(person.state,{action:'enrollment.save',data:{personId:person.result.id,courseId:data.courseId,needsBed:data.needsBed,status:'active'}},session,{now,makeId});
  }
  if(action==='import.batch') {
    let working=state;
    const commands=importCommands(state,data);
    for(const row of commands)working=executeCommand(working,row,session,{now,makeId}).state;
    return {state:working,result:{id:'import',count:commands.length}};
  }
  const entityCollections = {
    asset: 'assets', location: 'locations', person: 'people', user: 'users',
    bed: 'beds', course: 'courses', maintenance: 'maintenance',
    project: 'projects', notification: 'notifications', ...ENTITY_COLLECTIONS
  };
  const targetCollection = entityCollections[action.split('.')[0]];
  const before = id && targetCollection ? JSON.stringify(find(state, targetCollection, id)) : null;
  let result;
  switch(action) {
    case 'asset.save': {
      const type = subject.type;
      if (!['general','weapon','vehicle'].includes(type)) throw new Error('Tipo de bien inválido.');
      const code = required(data.code,'Código interno'); unique(state,'assets','code',code,id,'El código interno');
      const locationId = required(data.locationId,'Ubicación'); find(state,'locations',locationId);
      const serial = text(data.serial); if (serial) unique(state,'assets','serial',serial,id,'La serie');
      const status = data.status || 'good';
      if (!['good','regular','bad','stored','repaired'].includes(status)) throw new Error('El mantenimiento y la baja se gestionan desde sus acciones correspondientes.');
      if (subject?.status === 'decommissioned') throw new Error('Un bien dado de baja no puede editarse.');
      if (id && state.maintenance.some(m=>m.assetId===id && m.status==='open')) throw new Error('Cierra el mantenimiento antes de editar el bien.');
      const details = {...subject?.details};
      if (type === 'weapon') { details.caliber=required(data.details?.caliber,'Calibre'); details.weaponType=text(data.details?.weaponType); }
      if (type === 'vehicle') {
        details.plate=required(data.details?.plate,'Placa').toUpperCase();
        if (state.assets.some(a=>a.id !== id && a.type==='vehicle' && normalize(a.details?.plate)===normalize(details.plate))) throw new Error('La placa ya está registrada.');
        details.mileage=number(data.details?.mileage,'Kilometraje',{integer:true});
        if(data.details?.year)details.year=number(data.details.year,'Año',{integer:true,min:1900});
        details.nextServiceDate=data.details?.nextServiceDate?date(data.details.nextServiceDate,'Próximo mantenimiento'):null;
        if (id && details.mileage < (subject.details?.mileage || 0)) throw new Error('El kilometraje no puede disminuir.');
      }
      if(id && locationId!==subject.locationId)throw new Error('Utiliza Trasladar para cambiar la ubicación y registrar el motivo.');
      if(id && state.trips.some(t=>t.assetId===id && t.status==='active'))throw new Error('Registra el regreso del vehículo antes de editarlo.');
      result=upsert(state,'assets',{type,code,name:required(data.name,'Nombre'),category:type==='weapon'?'Armas':type==='vehicle'?'Vehículos':required(data.category,'Categoría'),brand:text(data.brand),model:text(data.model),serial,description:text(data.description),color:text(data.color),locationId,status,costoUnitario:number(data.costoUnitario ?? 0,'Costo'),details},id,now,makeId);
      break;
    }
    case 'asset.assign': {
      if (subject.assignedPersonId || ['bad','maintenance','decommissioned'].includes(subject.status)) throw new Error('El bien no está disponible para asignación.');
      const person=find(state,'people',required(data.personId,'Persona'));
      let enrollment=null;
      if(subject.type==='weapon') {
        enrollment=find(state,'enrollments',required(data.enrollmentId,'Participación en curso'));
        if(enrollment.personId!==person.id || enrollment.status!=='active' || find(state,'courses',enrollment.courseId).status==='completed')throw new Error('Selecciona una participación activa de este estudiante.');
        if(state.assignments.some(a=>a.enrollmentId===enrollment.id && a.resource==='asset' && a.status==='active' && find(state,'assets',a.itemId).type==='weapon'))throw new Error('Esta participación ya tiene un arma activa.');
      }
      const use=data.spaceUseId?find(state,'spaceUses',data.spaceUseId):null;
      if(use && (use.personId!==person.id || use.status!=='active'))throw new Error('La actividad del espacio no corresponde al responsable seleccionado.');
      const assignment=upsert(state,'assignments',{resource:'asset',itemId:id,personId:person.id,enrollmentId:enrollment?.id || null,courseId:enrollment?.courseId || use?.courseId || null,spaceUseId:use?.id || null,status:'active',startDate:now,actorId:actor.id,reason:text(data.reason)},null,now,makeId);
      Object.assign(subject,{assignedPersonId:person.id,currentAssignmentId:assignment.id,status:subject.status==='stored'?'good':subject.status,updatedAt:now}); result=subject; break;
    }
    case 'asset.return':
      if (!subject.assignedPersonId) throw new Error('El bien no tiene una asignación activa.');
      closeAssignment(state,'asset',id,now,actor.id); Object.assign(subject,{assignedPersonId:null,currentAssignmentId:null,status:subject.type==='weapon' && ['good','repaired'].includes(subject.status)?'stored':subject.status,updatedAt:now}); result=subject; break;
    case 'asset.archive':
      if (subject.status==='decommissioned') throw new Error('El bien ya está dado de baja.');
      if (subject.assignedPersonId || state.trips.some(t=>t.assetId===id && t.status==='active') || state.maintenance.some(m=>m.assetId===id && m.status==='open')) throw new Error('Devuelve el bien y cierra sus mantenimientos o recorridos antes de darlo de baja.');
      Object.assign(subject,{status:'decommissioned',decommissionReason:required(data.reason,'Motivo de baja'),updatedAt:now}); result=subject; break;
    case 'location.save': {
      const name=required(data.name,'Nombre'); unique(state,'locations','name',name,id,'La ubicación');
      const floor=number(data.floor,'Planta',{integer:true,min:1}); if (floor>2) throw new Error('La planta debe ser 1 o 2.');
      if(data.responsiblePersonId)find(state,'people',data.responsiblePersonId);
      result=upsert(state,'locations',{name,building:required(data.building,'Edificio'),area:required(data.area,'Área'),type:required(data.type,'Tipo'),floor,responsiblePersonId:data.responsiblePersonId || null},id,now,makeId); break;
    }
    case 'person.save': {
      const identification=required(data.identification,'DNI').replace(/[-\s]/g,'');
      if (!/^\d{13}$/.test(identification)) throw new Error('El DNI debe contener 13 dígitos.');
      if (state.people.some(p=>p.id !== id && p.identification.replace(/[-\s]/g,'')===identification)) throw new Error('El DNI ya está registrado.');
      result=upsert(state,'people',{name:required(data.name,'Nombre'),identification,department:required(data.department,'Departamento'),phone:text(data.phone)},id,now,makeId); break;
    }
    case 'user.save': {
      const email=required(data.email,'Correo').toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo inválido.');
      unique(state,'users','email',email,id,'El correo');
      if (!ROLES[data.role] || !['active','inactive'].includes(data.status)) throw new Error('Rol o estado inválido.');
      if (id===actor.id && (data.status !== 'active' || data.role !== 'admin')) throw new Error('No puedes desactivar tu cuenta ni retirar tu propio rol de administrador.');
      if(data.personId)find(state,'people',data.personId);
      if(data.role==='teacher' && !data.personId)throw new Error('Vincula al docente con una persona registrada.');
      result=upsert(state,'users',{name:required(data.name,'Nombre'),email,role:data.role,status:data.status,personId:data.personId || null},id,now,makeId); break;
    }
    case 'bed.save': {
      const bedNumber=required(data.bedNumber,'Número de cama'); unique(state,'beds','bedNumber',bedNumber,id,'La cama');
      const status=data.status || 'available'; if (!['available','maintenance'].includes(status)) throw new Error('Estado de cama inválido.');
      if (id && find(state,'beds',id).status==='occupied') throw new Error('Libera la cama antes de editarla.');
      const floor=number(data.floor,'Planta',{integer:true,min:1}); if(floor>2) throw new Error('La planta debe ser 1 o 2.');
      if(id && state.maintenance.some(m=>m.bedId===id && m.status==='open'))throw new Error('Cierra la orden de mantenimiento de la cama antes de editarla.');
      if(text(data.room) && text(data.bunk) && state.beds.some(b=>b.id!==id && b.dormitory===text(data.dormitory) && b.room===text(data.room) && b.bunk===text(data.bunk) && b.position===(data.position==='upper'?'upper':'lower')))throw new Error('La posición de esta litera ya tiene una cama.');
      result=upsert(state,'beds',{bedNumber,dormitory:required(data.dormitory,'Dormitorio'),room:text(data.room),bunk:text(data.bunk),position:data.position==='upper'?'upper':'lower',floor,status,assignedPersonId:null,courseId:null,enrollmentId:null},id,now,makeId); break;
    }
    case 'bed.assign': {
      const bed=find(state,'beds',id); if (bed.status!=='available') throw new Error('La cama ya no está disponible.');
      const person=find(state,'people',required(data.personId,'Persona'));
      const course=find(state,'courses',required(data.courseId,'Curso')); if(course.status==='completed') throw new Error('El curso ya finalizó.');
      if(state.beds.some(b=>b.assignedPersonId===person.id)) throw new Error('Esta persona ya tiene una cama asignada.');
      const enrollment=find(state,'enrollments',required(data.enrollmentId,'Participación en curso'));
      if(enrollment.personId!==person.id || enrollment.courseId!==course.id || enrollment.status!=='active' || !enrollment.needsBed)throw new Error('La participación no está activa o no requiere alojamiento.');
      const assignment=upsert(state,'assignments',{resource:'bed',itemId:id,personId:person.id,courseId:course.id,enrollmentId:enrollment.id,status:'active',startDate:now,actorId:actor.id},null,now,makeId);
      Object.assign(bed,{status:'occupied',assignedPersonId:person.id,courseId:course.id,enrollmentId:enrollment.id,currentAssignmentId:assignment.id,updatedAt:now}); result=bed; break;
    }
    case 'bed.release': {
      const bed=find(state,'beds',id); if(bed.status!=='occupied') throw new Error('La cama no tiene una asignación activa.');
      closeAssignment(state,'bed',id,now,actor.id); Object.assign(bed,{status:'available',assignedPersonId:null,courseId:null,enrollmentId:null,currentAssignmentId:null,updatedAt:now}); result=bed; break;
    }
    case 'course.save': {
      const code=required(data.code,'Código'); unique(state,'courses','code',code,id,'El código del curso');
      const startDate=date(data.startDate,'Fecha de inicio'), endDate=date(data.endDate,'Fecha de fin'); if(endDate<startDate) throw new Error('La fecha final no puede ser anterior al inicio.');
      const expectedStudents=number(data.expectedStudents,'Cupos',{integer:true});let confirmedStudents=number(data.confirmedStudents,'Confirmados',{integer:true}),externalStudents=number(data.externalStudents,'Externos',{integer:true});
      if(confirmedStudents>expectedStudents || externalStudents>confirmedStudents) throw new Error('Los confirmados no pueden superar los cupos y los externos no pueden superar los confirmados.');
      if(!['planned','active','completed'].includes(data.status)) throw new Error('Estado de curso inválido.');
      if(data.status==='completed' && state.beds.some(b=>b.courseId===id)) throw new Error('Libera las camas de este curso antes de finalizarlo.');
      if(data.status==='completed' && state.assignments.some(a=>a.courseId===id && a.status==='active'))throw new Error('Confirma las devoluciones de armas y recursos antes de finalizar el curso.');
      if(data.status==='completed' && state.spaceUses.some(u=>u.courseId===id && u.status==='active'))throw new Error('Registra la salida de los espacios antes de finalizar el curso.');
      if(id && find(state,'courses',id).status==='completed' && data.status!=='completed')throw new Error('El curso completado conserva su historial y no puede reabrirse.');
      if(expectedStudents<state.enrollments.filter(n=>n.courseId===id && n.status==='active').length)throw new Error('Los cupos no pueden ser menores que las participaciones activas.');
      if(id && state.enrollments.some(n=>n.courseId===id)) {
        const registered=state.enrollments.filter(n=>n.courseId===id && (data.status==='completed'?n.status!=='withdrawn':n.status==='active'));
        confirmedStudents=registered.length;externalStudents=registered.filter(n=>!n.needsBed).length;
      }
      result=upsert(state,'courses',{code,name:required(data.name,'Nombre'),description:text(data.description),startDate,endDate,expectedStudents,confirmedStudents,externalStudents,status:data.status},id,now,makeId);
      if(data.status==='completed')state.enrollments.filter(n=>n.courseId===id && n.status==='active').forEach(n=>Object.assign(n,{status:'completed',updatedAt:now}));
      break;
    }
    case 'maintenance.open': {
      if(Boolean(data.assetId)===Boolean(data.bedId))throw new Error('Selecciona un bien o una cama.');
      const asset=find(state,data.bedId?'beds':'assets',data.bedId || data.assetId);
      if(asset.status==='occupied' || state.trips.some(t=>t.assetId===asset.id && t.status==='active'))throw new Error('Libera la cama o registra el regreso antes del mantenimiento.');
      if(asset.status==='decommissioned' || state.maintenance.some(m=>(data.bedId?m.bedId===asset.id:m.assetId===asset.id) && m.status==='open')) throw new Error('El bien tiene una orden abierta o está dado de baja.');
      result=upsert(state,'maintenance',{assetId:data.assetId || null,bedId:data.bedId || null,kind:text(data.kind || 'Correctivo'),description:required(data.description,'Descripción'),diagnostico:text(data.diagnostico),stage:'diagnosis',startDate:today(now),status:'open',previousStatus:asset.status,userId:actor.id},null,now,makeId);
      Object.assign(asset,{status:'maintenance',updatedAt:now}); break;
    }
    case 'maintenance.close': {
      const ticket=find(state,'maintenance',id); if(ticket.status!=='open') throw new Error('La orden ya está cerrada.');
      if(!(ticket.bedId?['available','maintenance']:['good','regular','bad','repaired']).includes(data.resultStatus)) throw new Error('Selecciona el estado final del bien.');
      const asset=find(state,ticket.bedId?'beds':'assets',ticket.bedId || ticket.assetId);
      Object.assign(ticket,{status:'closed',stage:'verified',diagnostico:required(data.diagnostico,'Diagnóstico final'),work:text(data.work || data.diagnostico),verification:text(data.verification || 'Verificado por el operador al confirmar el cierre'),endDate:today(now),closedBy:actor.id,updatedAt:now});
      Object.assign(asset,{status:data.resultStatus,updatedAt:now}); result=ticket; break;
    }
    case 'project.save': {
      if(id && find(state,'projects',id).status!=='draft') throw new Error('Solo se pueden editar solicitudes pendientes.');
      if(data.locationId)find(state,'locations',data.locationId);
      result=upsert(state,'projects',{name:required(data.name,'Nombre'),description:required(data.description,'Descripción'),budget:number(data.budget,'Presupuesto',{min:0.01}),locationId:data.locationId || null,year:number(data.year || today(now).slice(0,4),'Año',{integer:true,min:2000}),extraordinary:data.extraordinary===true || data.extraordinary==='yes',status:'draft'},id,now,makeId); break;
    }
    case 'project.status': {
      const project=find(state,'projects',id); if(project.status!=='draft' || !['approved','rejected'].includes(data.status)) throw new Error('La solicitud ya fue resuelta o el estado no es válido.');
      Object.assign(project,{status:data.status,resolvedBy:actor.id,updatedAt:now}); result=project; break;
    }
    case 'notification.read': {
      const notification=find(state,'notifications',id); notification.readBy=[...new Set([...(notification.readBy || []),actor.id])]; result=notification; break;
    }
    default: result=institutionCommand(state,command,{actor,role,now,makeId});
  }
  if(action!=='notification.read') {
    const label=result.code || result.bedNumber || result.name || result.description || result.concept || result.destination || result.id;
    state.auditLogs.push({id:makeId(),action,entityId:result.id,entityName:label,actorId:actor.id,actorName:actor.name,role,timestamp:now,before,after:JSON.stringify(result,(key,value)=>key==='content'?undefined:value)});
    state.notifications.push({id:makeId(),action,entityId:result.id,message:`${actor.name}: ${ACTION_LABELS[action]} · ${label}`,createdAt:now,readBy:[]});
  }
  return {state:validateState(state),result};
}
/** Preview never touches persistence; commit revalidates against the most recent snapshot. */
export function previewImport(state,data,session) {
  let working=structuredClone(state);const rows=[];
  for(const [index,row] of (data.rows || []).entries()) {
    try {for(const command of importCommands(working,{...data,rows:[row]}))working=executeCommand(working,command,session).state;rows.push({row:index+2,values:row,valid:true,error:''});}
    catch(error){rows.push({row:index+2,values:row,valid:false,error:error.message});}
  }
  return rows;
}
