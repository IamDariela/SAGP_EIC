import {STATUS} from '../core/model.js';
import {form,delegate,lookup} from '../core/ui.js';
import {assetDetail,requestedDetail} from '../core/details.js';
import {presentAssets} from './asset-presentation.js';
export function mount(ctx) {
  const type={inventario:'general',armeria:'weapon',vehiculos:'vehicle'}[ctx.config.page],{state,user,root}=ctx;
  const edit=record=>{const type=record?.type || {inventario:'general',armeria:'weapon',vehiculos:'vehicle'}[ctx.config.page];return form({title:record?'Editar bien':'Registrar bien',values:record || {type,status:'good',costoUnitario:0,details:{mileage:0}},fields:[
    {name:'code',label:'Código interno'},{name:'name',label:'Nombre'},
    ...(type==='general'?[{name:'category',label:'Categoría',options:['Mobiliario','Informática','Equipo','Otros'].map(v=>({value:v,label:v}))}]:[]),
    {name:'brand',label:'Marca',required:false},{name:'model',label:'Modelo',required:false},{name:'serial',label:'Serie',required:type!=='general'},
    {name:'description',label:'Descripción',type:'textarea',required:false},{name:'color',label:'Color',required:false},
    ...(!record?[{name:'locationId',label:'Ubicación',options:state.locations.map(l=>({value:l.id,label:l.name}))}]:[]),
    {name:'status',label:'Estado',options:['good','regular','bad','stored','repaired'].map(v=>({value:v,label:STATUS[v]}))},
    {name:'costoUnitario',label:'Costo unitario (L.)',type:'number',min:0,step:'0.01'},
    ...(type==='weapon'?[{name:'details.caliber',label:'Calibre'},{name:'details.weaponType',label:'Tipo de arma',required:false}]:[]),
    ...(type==='vehicle'?[{name:'details.plate',label:'Placa'},{name:'details.year',label:'Año',type:'number',min:1900,required:false},{name:'details.mileage',label:'Kilometraje',type:'number',min:0,step:'1'},{name:'details.nextServiceDate',label:'Próximo mantenimiento',type:'date',required:false}]:[])
  ],save:data=>ctx.perform({action:'asset.save',id:record?.id,data:{...data,locationId:record?.locationId || data.locationId,type,details:{caliber:data['details.caliber'],weaponType:data['details.weaponType'],plate:data['details.plate'],year:data['details.year'],nextServiceDate:data['details.nextServiceDate'],mileage:data['details.mileage']}}})});};
  const rows=state.assets.filter(a=>a.type===type || ctx.config.page==='inventario' && user.role==='admin').map(a=>({...a,searchText:lookup(state.people,a.assignedPersonId)+' '+lookup(state.locations,a.locationId)}));
  presentAssets(ctx,rows,edit);
  delegate(root,async(action,id)=>{
    const record=state.assets.find(a=>a.id===id);
    const type=record?.type;
    if(action==='detail')assetDetail(ctx,id);
    if(action==='edit')edit(record);
    if(action==='assign')form({title:'Asignar bien',fields:type==='weapon'?[{name:'enrollmentId',label:'Estudiante y curso',options:state.enrollments.filter(n=>n.status==='active' && state.courses.find(c=>c.id===n.courseId)?.status!=='completed').map(n=>({value:n.id,label:lookup(state.people,n.personId)+' · '+lookup(state.courses,n.courseId)}))}]:[{name:'personId',label:'Persona responsable',options:state.people.map(p=>({value:p.id,label:p.name}))},{name:'spaceUseId',label:'Actividad en un espacio (opcional)',required:false,options:state.spaceUses.filter(u=>u.status==='active').map(u=>({value:u.id,label:lookup(state.locations,u.locationId)+' · '+lookup(state.people,u.personId)}))}],save:data=>ctx.perform({action:'asset.assign',id,data:{...data,personId:type==='weapon'?state.enrollments.find(n=>n.id===data.enrollmentId)?.personId:data.personId}})});
    if(action==='return' && confirm(type==='weapon'?'Confirma que se verificó físicamente la devolución del arma. ¿Registrar el retorno?':'¿Registrar la devolución de este bien?'))await ctx.perform({action:'asset.return',id});
    if(action==='move')form({title:'Trasladar bien',fields:[{name:'locationId',label:'Espacio de destino',options:state.locations.filter(l=>l.id!==record.locationId).map(l=>({value:l.id,label:l.name}))},{name:'reason',label:'Motivo del movimiento',type:'textarea'}],save:data=>ctx.perform({action:'asset.move',id,data})});
    if(action==='archive')form({title:'Dar de baja conservando el historial',fields:[{name:'reason',label:'Motivo de baja',type:'textarea'}],save:data=>ctx.perform({action:'asset.archive',id,data})});
  });
  requestedDetail(ctx,id=>{if(rows.some(a=>a.id===id))assetDetail(ctx,id);});
}
