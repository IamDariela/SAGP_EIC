import {can} from '../core/policy.js';
import {STATUS} from '../core/model.js';
import {actions,table,form,delegate,escapeHtml as e,badge,lookup,actionButton as button} from '../core/ui.js';
import {view,info} from '../core/ui.js';
import {documentHtml,handleDocument} from '../core/documents.js';
export function mount(ctx) {
  const {state,root,user}=ctx;
  const open=incident=>form({
    title:'Registrar problema y abrir mantenimiento',
    values:{description:incident?.description,resource:incident?'asset|'+incident.assetId:'',kind:'Correctivo'},
    fields:[
      {name:'resource',label:'Bien / cama afectada',options:[
        ...state.assets.filter(a=>a.status!=='decommissioned' && !state.maintenance.some(m=>m.assetId===a.id && m.status==='open')).map(a=>({value:'asset|'+a.id,label:`${a.code} · ${a.name}`})),
        ...state.beds.filter(b=>b.status!=='occupied' && !state.maintenance.some(m=>m.bedId===b.id && m.status==='open')).map(b=>({value:'bed|'+b.id,label:`Cama ${b.bedNumber} · ${b.dormitory}`}))
      ]},
      {name:'kind',label:'Tipo de trabajo',options:['Correctivo','Preventivo','Cambio de aceite','Cambio de llantas','Frenos','Batería','Motor','Revisión general','Otro'].map(value=>({value,label:value}))},
      {name:'description',label:'Problema detectado',type:'textarea'},
      {name:'diagnostico',label:'Diagnóstico inicial',type:'textarea',required:false}
    ],
    save:data=>{
      const [type,id]=data.resource.split('|');
      return ctx.perform({action:'maintenance.open',data:{...data,[type==='bed'?'bedId':'assetId']:id}});
    }
  });
  actions(can(user.role,'maintenance.open')?[{label:'Abrir mantenimiento',run:()=>open()}]:[]);
  root.innerHTML='<h2 class="section-title">Problemas reportados por conductores</h2><div id="maintenance-incidents"></div><h2 class="section-title">Órdenes y reparaciones</h2><div id="maintenance-orders"></div>';
  table(root.querySelector('#maintenance-incidents'),state.incidents,[{label:'Vehículo',render:i=>e(lookup(state.assets,i.assetId))},{key:'description',label:'Problema observado'},{label:'Estado',render:i=>badge(i.status)},{key:'resolution',label:'Seguimiento'},{label:'Acciones',render:i=>i.status==='open'?button('incident-order',i.id,'Registrar mantenimiento')+button('resolve',i.id,'Registrar atención'):''}]);
  const resource=m=>m.bedId?'Cama '+lookup(state.beds,m.bedId,'bedNumber'):lookup(state.assets,m.assetId);
  table(root.querySelector('#maintenance-orders'),state.maintenance.map(m=>({...m,searchText:resource(m)})),[{label:'Recurso',render:m=>e(resource(m))},{key:'description',label:'Problema'},{key:'startDate',label:'Inicio'},{key:'endDate',label:'Cierre'},{label:'Etapa',render:m=>badge(m.stage || (m.status==='closed'?'verified':'diagnosis'))},{label:'Estado',render:m=>badge(m.status)},{label:'Acciones',render:m=>button('detail',m.id,'Ficha / evidencias')+(m.status==='open' && can(user.role,'maintenance.close')?button('progress',m.id,'Seguimiento')+button('close',m.id,'Verificar y cerrar'):'')}],{filters:[{key:'status',label:'Todas las órdenes',options:[['open','Pendientes'],['closed','Cerradas']]}]});
  const detail=id=>{const ticket=ctx.state.maintenance.find(m=>m.id===id),dialog=view(resource(ticket),info([['Problema',ticket.description],['Diagnóstico',ticket.diagnostico],['Trabajo realizado',ticket.work],['Verificación',ticket.verification],['Inicio',ticket.startDate],['Cierre',ticket.endDate]])+documentHtml(ctx,'maintenance',id,ticket));delegate(dialog,(action,target)=>handleDocument(ctx,action,target,()=>{dialog.close();detail(id);}));};
  delegate(root,(action,id)=>{
    const ticket=state.maintenance.find(m=>m.id===id);
    if(action==='detail')detail(id);
    if(action==='progress')form({title:'Seguimiento de reparación',values:ticket,fields:[{name:'stage',label:'Etapa',options:['diagnosis','repair','verification'].map(value=>({value,label:STATUS[value]}))},{name:'diagnostico',label:'Diagnóstico',type:'textarea'},{name:'work',label:'Trabajo realizado',type:'textarea',required:false},{name:'verification',label:'Resultado de la verificación',type:'textarea',required:false}],save:data=>ctx.perform({action:'maintenance.progress',id,data})});
    if(action==='close')form({title:'Verificar y cerrar mantenimiento',values:ticket,fields:[{name:'diagnostico',label:'Diagnóstico final',type:'textarea'},{name:'work',label:'Trabajo realizado',type:'textarea'},{name:'verification',label:'Verificación del responsable',type:'textarea'},{name:'resultStatus',label:'Estado final',options:(ticket.bedId?['available','maintenance']:['good','regular','bad','repaired']).map(v=>({value:v,label:STATUS[v]}))}],submitLabel:'Confirmar cierre verificado',save:data=>ctx.perform({action:'maintenance.close',id,data})});
    if(action==='incident-order')open(state.incidents.find(i=>i.id===id));
    if(action==='resolve'){const incident=state.incidents.find(i=>i.id===id);form({title:'Registrar atención de incidencia',fields:[{name:'maintenanceId',label:'Orden de mantenimiento relacionada',required:false,options:state.maintenance.filter(m=>m.assetId===incident.assetId).map(m=>({value:m.id,label:m.description+' · '+STATUS[m.status]}))},{name:'resolution',label:'Seguimiento realizado',type:'textarea'}],save:data=>ctx.perform({action:'incident.resolve',id,data})});}
  });
}
