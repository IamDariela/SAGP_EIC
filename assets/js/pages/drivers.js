import {can} from '../core/policy.js';
import {STATUS} from '../core/model.js';
import {actions,table,form,delegate,escapeHtml as e,lookup,actionButton as button,info,view,options,badge,dateTime} from '../core/ui.js';
import {documentHtml,handleDocument} from '../core/documents.js';
import {requestedDetail} from '../core/details.js';
export function mount(ctx) {
  const {root,state,user}=ctx;
  const edit=driver=>form({title:driver?'Editar ficha de conductor':'Registrar conductor',values:driver || {status:'active'},fields:[...(!driver?[{name:'personId',label:'Persona',options:options(state.people.filter(p=>!state.drivers.some(d=>d.personId===p.id)))}]:[]),{name:'userId',label:'Perfil de acceso vinculado',required:false,options:options(state.users.filter(u=>u.role==='conductor'))},{name:'license',label:'Número de licencia'},{name:'category',label:'Categoría'},{name:'issued',label:'Emisión',type:'date'},{name:'expires',label:'Vencimiento',type:'date'},{name:'status',label:'Estado',options:['active','inactive'].map(value=>({value,label:STATUS[value]}))},{name:'notes',label:'Observaciones',type:'textarea',required:false}],save:data=>ctx.perform({action:'driver.save',id:driver?.id,data:{...data,personId:driver?.personId || data.personId}})});
  actions(can(user.role,'driver.save')?[{label:'Registrar conductor',run:()=>edit()}]:[]);
  const rows=state.drivers.filter(d=>user.role!=='conductor' || d.userId===user.id).map(d=>({...d,name:lookup(state.people,d.personId)}));
  const detail=id=>{
    const driver=rows.find(d=>d.id===id);if(!driver)return;
    const person=state.people.find(p=>p.id===driver.personId),trips=state.trips.filter(t=>t.driverId===id);
    const dialog=view(driver.name,info([['Identidad',person.identification],['Licencia',driver.license],['Categoría',driver.category],['Emisión',driver.issued],['Vencimiento',driver.expires],['Estado',STATUS[driver.status]],['Observaciones',driver.notes]])+`<h3 class="section-title">Vehículos utilizados</h3>${trips.map(t=>`<p>${e(state.assets.find(a=>a.id===t.assetId)?.details.plate)} · ${e(t.destination)} · ${e(dateTime(t.startDate))} · ${e(STATUS[t.status])}</p>`).join('') || '<p>Sin recorridos.</p>'}${documentHtml(ctx,'driver',id,driver)}`);
    delegate(dialog,(action,target)=>handleDocument(ctx,action,target,()=>{dialog.close();detail(id);}));
  };
  table(root,rows,[{key:'name',label:'Conductor'},{key:'license',label:'Licencia'},{key:'category',label:'Categoría'},{key:'expires',label:'Vencimiento'},{label:'Estado',render:d=>badge(d.status)},{label:'Acciones',render:d=>button('detail',d.id,'Ver ficha')+(can(user.role,'driver.save')?button('edit',d.id,'Editar'):'')}]);
  delegate(root,(action,id)=>{if(action==='edit')edit(rows.find(d=>d.id===id));if(action==='detail')detail(id);});requestedDetail(ctx,detail);
}
