import {normalize,STATUS} from '../core/model.js';
import {actions,escapeHtml as e,canVisit,pageLink} from '../core/ui.js';
export function mount(ctx) {
  actions([]);const {root,state}=ctx;
  const rows=[];
  for(const asset of state.assets){const page=asset.type==='weapon'?'armeria':asset.type==='vehicle'?'vehiculos':'inventario';if(canVisit(ctx,page))rows.push({page,id:asset.id,title:asset.name,description:[asset.code,asset.serial,asset.details?.plate,STATUS[asset.status]].filter(Boolean).join(' · '),words:Object.values(asset).join(' ')+' '+JSON.stringify(asset.details)});}
  if(canVisit(ctx,'personas'))for(const person of state.people)rows.push({page:'personas',id:person.id,title:person.name,description:person.identification+' · '+person.department,words:Object.values(person).join(' ')});
  if(canVisit(ctx,'ubicaciones'))for(const location of state.locations)rows.push({page:'ubicaciones',id:location.id,title:location.name,description:location.building+' · Planta '+location.floor+' · '+location.type,words:Object.values(location).join(' ')});
  if(canVisit(ctx,'cursos'))for(const course of state.courses)rows.push({page:'cursos',id:course.id,title:course.name,description:course.code+' · '+STATUS[course.status],words:Object.values(course).join(' ')});
  if(['admin','inventory_manager','supervisor','weapon_manager'].includes(ctx.user.role))for(const participation of state.enrollments) {
    const person=state.people.find(p=>p.id===participation.personId),course=state.courses.find(c=>c.id===participation.courseId);
    rows.push({page:'cursos',id:course.id,title:person.name+' · participación',description:course.name+' · '+STATUS[participation.status],words:person.name+' '+person.identification+' '+person.identification.replaceAll('-','')+' '+course.code});
  }
  if(canVisit(ctx,'conductores'))for(const driver of state.drivers.filter(d=>ctx.user.role!=='conductor' || d.userId===ctx.user.id)){const person=state.people.find(p=>p.id===driver.personId);rows.push({page:'conductores',id:driver.id,title:person.name,description:'Conductor · '+driver.license,words:person.name+' '+person.identification+' '+driver.license});}
  root.innerHTML='<label for="global-search" class="form-label">Código, serie, placa, identidad, nombre o espacio</label><input id="global-search" type="search" class="form-control global-search" placeholder="Por ejemplo: MIC-002 o Aula 101"><p id="search-count" role="status"></p><div id="search-results" class="card-grid"></div>';
  const input=root.querySelector('input'),render=()=>{
    const q=normalize(input.value),visible=q?rows.filter(r=>normalize(r.words+' '+r.description).includes(q)).slice(0,50):[];
    root.querySelector('#search-count').textContent=q?`${visible.length} ${visible.length===1?'resultado disponible':'resultados disponibles'} para tu función`:'Escribe para localizar información en tus módulos.';
    root.querySelector('#search-results').innerHTML=visible.map(r=>`<article class="card"><h3>${e(r.title)}</h3><p>${e(r.description)}</p>${pageLink(ctx,r.page,r.id,'Consultar ficha e historial')}</article>`).join('');ctx.searchQuery=input.value;
  };input.value=ctx.searchQuery || '';input.oninput=render;render();
}
