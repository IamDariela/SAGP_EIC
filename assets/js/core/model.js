/** Shared values and labels. Stable string IDs and ISO dates form the API contract. */
export const COLLECTIONS = ['assets','locations','people','users','beds','maintenance','courses','projects','assignments','auditLogs','notifications','enrollments','spaceUses','drivers','trips','incidents','attachments','funds','allocations','expenses'];
export const ROLES = {admin:'Administrador',inventory_manager:'Encargado de Inventario',weapon_manager:'Encargado de Armas',vehicle_manager:'Encargado de Vehículos',maintenance_staff:'Personal de Mantenimiento',viewer:'Usuario de Consulta',supervisor:'Monitor / Supervisor',conductor:'Conductor',buyer:'Responsable Administrativo',teacher:'Docente'};
export const STATUS = {good:'Bueno',regular:'Regular',bad:'Malo',stored:'En almacén',repaired:'Reparado',maintenance:'En mantenimiento',decommissioned:'Dado de baja',active:'Activo',inactive:'Inactivo',available:'Disponible',occupied:'Ocupada',open:'Pendiente',closed:'Cerrado',planned:'Planificado',completed:'Completado',draft:'Pendiente de aprobación',approved:'Aprobado',rejected:'Rechazado',returned:'Retornado',withdrawn:'Retirado',received:'Recibido',resolved:'Atendida',diagnosis:'Diagnóstico',repair:'En reparación',verification:'En verificación',verified:'Verificado'};
export const text = value => String(value ?? '').trim();
export const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function today(instant = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tegucigalpa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant)); }
export function newId() { return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function emptyState() { return {version:3,...Object.fromEntries(COLLECTIONS.map(name=>[name,[]]))}; }

/** Check persisted/API data before screens use it; never silently replace damaged data. */
export function validateState(state) {
  if (!state || state.version !== 3) throw new Error('Versión de datos incompatible. Revisa el contrato de la API o reinicia explícitamente la demostración.');
  for (const name of COLLECTIONS) {
    if (!Array.isArray(state[name])) throw new Error(`La colección ${name} no es válida.`);
    const ids = new Set();
    for (const record of state[name]) {
      if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw new Error(`Identificadores inválidos o duplicados en ${name}.`);
      ids.add(record.id);
    }
  }
  const exists = (name,id) => state[name].some(item=>item.id === id);
  for (const [name,field] of [['assets','code'],['assets','serial'],['locations','name'],['users','email'],['beds','bedNumber'],['courses','code']]) {
    const values = state[name].map(item=>normalize(item[field])).filter(Boolean);
    if (new Set(values).size !== values.length) throw new Error(`Valores duplicados de ${field} en ${name}.`);
  }
  for (const user of state.users) {
    if (!ROLES[user.role] || !['active','inactive'].includes(user.status)) throw new Error('Un perfil tiene un rol o estado inválido.');
  }
  for (const notification of state.notifications) {
    if (!Array.isArray(notification.readBy)) throw new Error('El estado de lectura de una notificación es inválido.');
  }
  for (const asset of state.assets) {
    if(!['general','weapon','vehicle'].includes(asset.type) || !['good','regular','bad','stored','repaired','maintenance','decommissioned'].includes(asset.status) || !asset.details || typeof asset.details!=='object')throw new Error('Tipo o estado de bien inválido.');
    if (!exists('locations',asset.locationId)) throw new Error(`Ubicación inexistente para ${asset.code}.`);
    if (asset.assignedPersonId && !exists('people',asset.assignedPersonId)) throw new Error(`Responsable inexistente para ${asset.code}.`);
  }
  for (const ticket of state.maintenance) {
    if(Boolean(ticket.assetId)===Boolean(ticket.bedId) || !exists(ticket.bedId?'beds':'assets',ticket.bedId || ticket.assetId)) throw new Error('Un mantenimiento apunta a un bien inexistente.');
    if(!['open','closed'].includes(ticket.status))throw new Error('Estado de mantenimiento inválido.');
    const item=state[ticket.bedId?'beds':'assets'].find(r=>r.id===(ticket.bedId || ticket.assetId));
    if(ticket.status==='open' && item.status!=='maintenance')throw new Error('El mantenimiento no coincide con el estado del recurso.');
  }
  for (const bed of state.beds) {
    if(!['occupied','available','maintenance'].includes(bed.status))throw new Error('Estado de cama inválido.');
    if (bed.assignedPersonId && !exists('people',bed.assignedPersonId)) throw new Error('Una cama apunta a una persona inexistente.');
    if (bed.courseId && !exists('courses',bed.courseId)) throw new Error('Una cama apunta a un curso inexistente.');
    if ((bed.status === 'occupied') !== Boolean(bed.assignedPersonId && bed.courseId)) throw new Error('El estado de ocupación de una cama es inconsistente.');
  }
  for (const assignment of state.assignments) {
    if (!['asset','bed'].includes(assignment.resource)) throw new Error('Tipo de asignación inválido.');
    const collection = assignment.resource === 'bed' ? 'beds' : 'assets';
    if (!exists(collection,assignment.itemId) || !exists('people',assignment.personId)) throw new Error('Una asignación tiene referencias inexistentes.');
    if(assignment.courseId && !exists('courses',assignment.courseId))throw new Error('Una asignación apunta a un curso inexistente.');
    if(assignment.spaceUseId && !exists('spaceUses',assignment.spaceUseId))throw new Error('Una asignación apunta a una actividad inexistente.');
    if(assignment.enrollmentId) {
      const enrollment=state.enrollments.find(n=>n.id===assignment.enrollmentId);
      if(!enrollment || enrollment.personId!==assignment.personId || enrollment.courseId!==assignment.courseId || (assignment.status==='active' && enrollment.status!=='active'))throw new Error('La asignación no coincide con la participación del curso.');
    }
  }
  for (const [resource,items] of [['asset',state.assets],['bed',state.beds]]) {
    for (const item of items) {
      const active = state.assignments.filter(a=>a.resource === resource && a.itemId === item.id && a.status === 'active');
      if (item.assignedPersonId ? active.length !== 1 || active[0].personId !== item.assignedPersonId || active[0].id !== item.currentAssignmentId : active.length !== 0) throw new Error('La asignación vigente no coincide con su bien o cama.');
    }
  }
  const occupiedPeople = state.beds.filter(b=>b.status === 'occupied').map(b=>b.assignedPersonId);
  if (new Set(occupiedPeople).size !== occupiedPeople.length) throw new Error('Una persona tiene más de una cama ocupada.');
  const reference=(collection,id)=>{if(!exists(collection,id))throw new Error(`Referencia inexistente en ${collection}.`);};
  const enrollments=new Set();
  for(const enrollment of state.enrollments) {
    reference('people',enrollment.personId);reference('courses',enrollment.courseId);
    const key=enrollment.personId+'|'+enrollment.courseId;
    if(enrollments.has(key) || !['active','withdrawn','completed'].includes(enrollment.status) || typeof enrollment.needsBed!=='boolean')throw new Error('Participación duplicada o inválida.');
    enrollments.add(key);
  }
  for(const bed of state.beds.filter(b=>b.enrollmentId)) {
    const enrollment=state.enrollments.find(n=>n.id===bed.enrollmentId);
    if(!enrollment || enrollment.personId!==bed.assignedPersonId || enrollment.courseId!==bed.courseId || !enrollment.needsBed || enrollment.status!=='active')throw new Error('El alojamiento no coincide con la participación.');
  }
  for(const use of state.spaceUses){reference('locations',use.locationId);reference('people',use.personId);reference('courses',use.courseId);}
  for(const user of state.users)if(user.personId)reference('people',user.personId);
  for(const driver of state.drivers){reference('people',driver.personId);if(driver.userId)reference('users',driver.userId);}
  for(const trip of state.trips){reference('assets',trip.assetId);reference('drivers',trip.driverId);if(state.assets.find(a=>a.id===trip.assetId).type!=='vehicle')throw new Error('Un recorrido apunta a un recurso que no es vehículo.');if(trip.endMileage!==undefined && trip.endMileage<trip.startMileage)throw new Error('Kilometraje incoherente.');}
  for(const [name,key] of [['spaceUses','locationId'],['trips','assetId'],['trips','driverId'],['drivers','personId']]) {
    const ids=state[name].filter(r=>name==='drivers' || r.status==='active').map(r=>r[key]);
    if(new Set(ids).size!==ids.length)throw new Error('Responsabilidad o recorrido duplicado.');
  }
  for(const incident of state.incidents){reference('assets',incident.assetId);if(incident.maintenanceId)reference('maintenance',incident.maintenanceId);}
  for(const fund of state.funds){if(fund.courseId)reference('courses',fund.courseId);if(!Number.isFinite(fund.amount) || fund.amount<=0)throw new Error('Fondo inválido.');}
  for(const allocation of state.allocations){reference('funds',allocation.fundId);reference('projects',allocation.projectId);if(!Number.isFinite(allocation.amount) || allocation.amount<=0)throw new Error('Financiación inválida.');}
  for(const expense of state.expenses){reference('projects',expense.projectId);if(!Number.isFinite(expense.amount) || expense.amount<=0)throw new Error('Gasto inválido.');}
  for(const fund of state.funds)if(state.allocations.filter(a=>a.fundId===fund.id).reduce((n,a)=>n+a.amount,0)>fund.amount+0.001)throw new Error('Financiación superior al fondo recibido.');
  for(const project of state.projects) {
    const allocated=state.allocations.filter(a=>a.projectId===project.id).reduce((n,a)=>n+a.amount,0),spent=state.expenses.filter(a=>a.projectId===project.id).reduce((n,a)=>n+a.amount,0);
    if(allocated>project.budget+0.001 || spent>allocated+0.001)throw new Error('Gastos o financiación superiores al presupuesto disponible.');
  }
  const targets={asset:'assets',person:'people',driver:'drivers',maintenance:'maintenance',project:'projects',expense:'expenses',fund:'funds'};
  for(const attachment of state.attachments) {
    if(!targets[attachment.targetType])throw new Error('Destino de documento inválido.');reference(targets[attachment.targetType],attachment.targetId);
    if(!['image/png','image/jpeg','application/pdf'].includes(attachment.mime) || typeof attachment.content!=='string' || !attachment.content.startsWith(`data:${attachment.mime};base64,`) || !/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.content.split(',')[1] || '') || attachment.content.length>700000)throw new Error('Documento inválido o demasiado grande.');
  }
  return state;
}
export const ACTION_LABELS = {'asset.save':'Registro o edición de bien','asset.assign':'Asignación de bien','asset.return':'Devolución de bien','asset.archive':'Baja de bien','location.save':'Registro o edición de ubicación','person.save':'Registro o edición de persona','user.save':'Registro o edición de usuario','bed.save':'Registro o edición de cama','bed.assign':'Asignación de cama','bed.release':'Liberación de cama','course.save':'Registro o edición de curso','maintenance.open':'Apertura de mantenimiento','maintenance.close':'Cierre de mantenimiento','project.save':'Solicitud de compra','project.status':'Resolución de compra'};
Object.assign(ACTION_LABELS,{'asset.move':'Traslado de bien','enrollment.save':'Participación en curso','spaceUse.open':'Entrada al espacio','spaceUse.close':'Salida del espacio','driver.save':'Ficha de conductor','trip.open':'Salida de vehículo','trip.close':'Regreso de vehículo','incident.save':'Reporte de incidencia','incident.resolve':'Atención de incidencia','maintenance.progress':'Seguimiento de reparación','attachment.add':'Documento adjunto','fund.save':'Fondo recibido','allocation.save':'Financiación de proyecto','expense.save':'Gasto registrado'});
