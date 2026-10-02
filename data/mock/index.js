/** Seed factory. Imported ONLY by the demo provider, never by API mode. */
import assets from './bienes.js';
import locations from './ubicaciones.js';
import people from './personas.js';
import users from './usuarios.js';
import beds from './dormitorios.js';
import maintenance from './mantenimientos.js';
import courses from './cursos.js';
import projects from './proyectos.js';
import {emptyState,normalize,validateState} from '../../assets/js/core/model.js';
import {linkParticipations} from '../../assets/js/core/upgrade.js';

export function normalizeDemo(state) {
  for(const user of state.users) delete user.uid;
  for(const asset of state.assets) {
    asset.type ||= asset.category==='Armas'?'weapon':asset.category==='Vehículos'?'vehicle':'general';
    asset.details ||= {}; asset.costoUnitario ??= 0;
  }
  for(const ticket of state.maintenance) {
    delete ticket.assetCode; delete ticket.assetName;
    if(ticket.status==='open') {
      const asset=state.assets.find(a=>a.id===ticket.assetId);
      if(asset) { ticket.previousStatus=asset.status; asset.status='maintenance'; }
    }
  }
  for(const bed of state.beds) {
    if(bed.status==='occupied' && !bed.assignedPersonId) {
      const name=String(bed.assignedStudent || '').trim();
      if(!name) throw new Error('Una cama ocupada no identifica a su estudiante.');
      const ending=normalize(name).split(' ').slice(-2).join(' ');
      let person=state.people.find(p=>normalize(p.name).endsWith(ending));
      if(!person) { person={id:`legacy-person-${bed.id}`,name,identification:'',department:'Pendiente de completar',phone:''}; state.people.push(person); }
      bed.assignedPersonId=person.id;
    }
    if(bed.status==='occupied' && !bed.courseId) {
      let course=state.courses.find(c=>normalize(c.name)===normalize(bed.course));
      if(!course) { course={id:`legacy-course-${bed.id}`,code:`LEG-${bed.bedNumber}`,name:bed.course || 'Curso pendiente de completar',startDate:'2026-09-01',endDate:'2026-12-31',expectedStudents:1,confirmedStudents:1,externalStudents:0,status:'active',legacy:true}; state.courses.push(course); }
      bed.courseId=course.id;
    }
    if(bed.status!=='occupied') { bed.assignedPersonId=null; bed.courseId=null; }
    delete bed.assignedStudent; delete bed.course;
  }
  for(const [resource,items] of [['asset',state.assets],['bed',state.beds]]) {
    for(const item of items.filter(item=>item.assignedPersonId)) {
      const assignment={id:`seed-${resource}-${item.id}`,resource,itemId:item.id,personId:item.assignedPersonId,courseId:item.courseId || null,status:'active',startDate:'2026-09-01T14:00:00Z',actorId:state.users[0]?.id || null};
      state.assignments.push(assignment); item.currentAssignmentId=assignment.id;
    }
  }
  return validateState(linkParticipations(state));
}
export function createDemoState() {
  const state=structuredClone({...emptyState(),assets,locations,people,users,beds,maintenance,courses,projects});
  state.users.push(...[['supervisor','Supervisor'],['conductor','Conductor'],['buyer','Compras']].map(([role,name])=>({id:`demo-${role}`,name:`Perfil ${name}`,email:`${role}@sig-eic.gov`,role,status:'active'})));
  state.users.push({id:'demo-teacher',name:'Docente María Rodríguez',email:'docente@example.test',role:'teacher',status:'active',personId:'p-2'});
  state.users.find(u=>u.id==='demo-conductor').personId='p-3';
  state.assets.push(
    {id:'a-9',code:'PROY-004',name:'Proyector de aula',type:'general',category:'Equipo',brand:'Epson',model:'EB-X',serial:'DEMO-PROY-004',locationId:'loc-2',status:'good',costoUnitario:18000,details:{},description:'Equipo disponible para actividades académicas.',color:'Blanco'},
    {id:'a-10',code:'MIC-002',name:'Microscopio de comparación',type:'general',category:'Equipo',brand:'Leica',model:'Comparación',serial:'DEMO-MIC-002',locationId:'loc-3',status:'good',costoUnitario:85000,details:{},description:'Ejemplo de ficha individual de laboratorio.'},
    {id:'a-11',code:'EIC-ARM-3003',name:'Pistola de reglamento',type:'weapon',category:'Armas',brand:'Glock',model:'17',serial:'DEMO-G17-003',locationId:'loc-10',status:'stored',costoUnitario:22000,details:{caliber:'9mm',weaponType:'Pistola'}}
  );
  state.drivers.push(
    {id:'driver-1',personId:'p-3',userId:'demo-conductor',license:'DEMO-LIC-001',category:'Liviana',issued:'2025-01-01',expires:'2027-01-01',status:'active'},
    {id:'driver-2',personId:'p-4',license:'DEMO-LIC-002',category:'Motocicleta',issued:'2025-01-01',expires:'2026-10-20',status:'active'}
  );
  state.trips.push({id:'trip-example',assetId:'a-7',driverId:'driver-1',destination:'Tegucigalpa',reason:'Traslado institucional de ejemplo',startDate:'2026-09-28T14:00:00Z',endDate:'2026-09-28T22:00:00Z',startMileage:12300,endMileage:12500,status:'completed',actorId:'demo-conductor'});
  state.funds.push({id:'fund-1',concept:'Aporte institucional de ejemplo',amount:150000,date:'2026-09-01',status:'received',courseId:'course-1'});
  state.allocations.push({id:'allocation-1',fundId:'fund-1',projectId:'project-2',amount:120000,date:'2026-09-05'});
  state.expenses.push({id:'expense-1',projectId:'project-2',supplier:'Proveedor de demostración',invoice:'DEMO-FAC-001',concept:'Primer lote de mobiliario',amount:35000,date:'2026-09-20'});
  state.projects.forEach(p=>{p.year=2026;p.extraordinary=false;p.locationId=p.id==='project-2'?'loc-2':'loc-gt';});
  state.locations.find(l=>l.id==='loc-3').responsiblePersonId='p-2';
  state.courses.push({id:'course-history',code:'CUR-HIST',name:'Fundamentos de Investigación · promoción anterior',description:'Ejemplo de participación independiente conservada.',startDate:'2026-01-05',endDate:'2026-03-30',expectedStudents:5,confirmedStudents:1,externalStudents:1,status:'completed'});
  state.enrollments.push({id:'enrollment-pending',personId:'p-5',courseId:'course-1',needsBed:true,status:'active',createdAt:'2026-09-01T14:00:00Z'},{id:'enrollment-history',personId:'p-1',courseId:'course-history',needsBed:false,status:'completed',createdAt:'2026-01-05T14:00:00Z'});
  state.notifications.push({id:'welcome',message:'Entorno de demostración listo. Las próximas operaciones generarán historial y avisos.',createdAt:'2026-09-30T12:00:00Z',readBy:[]});
  normalizeDemo(state);
  for(const course of state.courses) {
    const registrations=state.enrollments.filter(n=>n.courseId===course.id && (course.status==='completed'?n.status!=='withdrawn':n.status==='active'));
    course.confirmedStudents=registrations.length;course.externalStudents=registrations.filter(n=>!n.needsBed).length;
  }
  state.assets.find(a=>a.id==='a-7').details.nextServiceDate='2026-10-07';
  state.courses.find(c=>c.id==='course-1').endDate='2026-10-05';
  return validateState(state);
}
