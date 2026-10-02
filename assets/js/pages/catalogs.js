import {heading,personLabel,iconButton} from '../core/presentation.js';
import {can} from '../core/policy.js';
import {ROLES} from '../core/model.js';
import {actions,table,form,delegate,escapeHtml as e,badge,actionButton as button} from '../core/ui.js';
import {personDetail,requestedDetail} from '../core/details.js';
export function mount(ctx) {
  const configs={
    personas:{collection:'people',action:'person.save',label:'persona',fields:[{name:'name',label:'Nombre completo y rango'},{name:'identification',label:'DNI (13 dígitos)'},{name:'department',label:'Departamento'},{name:'phone',label:'Teléfono',required:false}],columns:[{key:'name',label:'Nombre'},{key:'identification',label:'DNI'},{key:'department',label:'Departamento'},{key:'phone',label:'Teléfono'}]},
    usuarios:{collection:'users',action:'user.save',label:'perfil',fields:[{name:'name',label:'Nombre'},{name:'email',label:'Correo',type:'email'},{name:'role',label:'Función',options:Object.entries(ROLES).map(([value,label])=>({value,label}))},{name:'personId',label:'Persona vinculada (docente / conductor)',required:false,options:ctx.state.people.map(p=>({value:p.id,label:p.name}))},{name:'status',label:'Estado',options:[{value:'active',label:'Activo'},{value:'inactive',label:'Inactivo'}]}],columns:[{key:'name',label:'Nombre'},{key:'email',label:'Correo'},{label:'Función',render:u=>e(ROLES[u.role])},{label:'Estado',render:u=>badge(u.status)}]}
  };
  const config=configs[ctx.config.page],editable=can(ctx.user.role,config.action);
  if(config.collection==='people'){heading('REGISTRO DE PERSONAL','Personal responsable de activos institucionales','users');config.columns=[{label:'Nombre completo',render:p=>personLabel(p.name)},{key:'identification',label:'Identificación / DNI'},{label:'Teléfono',render:p=>e(p.phone || 'N/T')},{key:'department',label:'Departamento / unidad'}];}
  const edit=record=>form({title:`${record?'Editar':'Registrar'} ${config.label}`,fields:config.fields,values:record || {status:'active',role:'viewer',floor:1},save:data=>ctx.perform({action:config.action,id:record?.id,data})});
  actions(editable?[{label:`Registrar ${config.label}`,run:()=>edit()}]:[]);
  ctx.root.innerHTML='<div id="catalog-table"></div>';
  table(ctx.root.querySelector('#catalog-table'),ctx.state[config.collection],[...config.columns,{label:'Acciones',render:r=>(config.collection==='people'?iconButton('detail',r.id,'Ficha de '+r.name,'user'):'')+(editable?button('edit',r.id,'EDITAR'):'')}],{placeholder:config.collection==='people'?'Buscar por nombre o número de identidad…':'Buscar por nombre o correo…'});
  delegate(ctx.root,(action,id)=>{if(action==='edit')edit(ctx.state[config.collection].find(r=>r.id===id));if(action==='detail')personDetail(ctx,id);});
  if(config.collection==='people')requestedDetail(ctx,id=>personDetail(ctx,id));
}
