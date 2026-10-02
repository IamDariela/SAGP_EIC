/** Presentation shared by inventory, armament and fleet; commands stay in assets.js. */
import {can} from '../core/policy.js';
import {STATUS} from '../core/model.js';
import {actions,table,escapeHtml as e,badge,lookup,dateTime,actionButton as button} from '../core/ui.js';
import {heading,metricCards,iconButton,photo} from '../core/presentation.js';
import {reportDialog,exportPicker} from '../core/export.js';
export function presentAssets(ctx,rows,edit){
  const {state,root,user}=ctx,inventory=ctx.config.page==='inventario',weapon=ctx.config.page==='armeria';
  const available=a=>!a.assignedPersonId && ['good','regular','stored','repaired'].includes(a.status);
  let visible=rows;
  const report=()=>({title:inventory?'Inventario general':weapon?'Control de armamento':'Flota vehicular',subtitle:(ctx.config.dataMode==='demo'?'DEMOSTRACIÓN · ':'')+'Situación actual',headers:['Código','Nombre','Categoría','Serie','Ubicación','Responsable','Estado'],rows:visible.map(a=>[a.code,a.name,a.category,a.serial,lookup(state.locations,a.locationId),lookup(state.people,a.assignedPersonId),STATUS[a.status]])});
  actions([{label:weapon?'Generar reporte':'Reporte general',kind:'dark',symbol:'download',run:()=>reportDialog(report())},...(can(user.role,'asset.save',{type:inventory?'general':weapon?'weapon':'vehicle'})?[{label:weapon?'Registrar arma':inventory?'Nuevo bien':'Registrar vehículo',kind:weapon?'danger':'primary',run:()=>edit()}]:[])]);
  if(weapon)heading('CONTROL DE ARMAMENTO','Trazabilidad de equipo táctico institucional','shield-alert');
  root.innerHTML=(inventory?'':'<div id="asset-stats"></div><div id="asset-export"></div>')+'<div id="asset-table" class="'+(inventory?'inventory-list':'')+'"></div><div id="asset-log"></div>';
  if(!inventory){
    root.querySelector('#asset-stats').innerHTML=metricCards(weapon?[
      {label:'Total',value:rows.length,center:true},{label:'Asignadas',value:rows.filter(a=>a.assignedPersonId).length,center:true},{label:'Disponibles',value:rows.filter(available).length,tone:'green',center:true}
    ]:[{label:'Total flota',value:rows.length,symbol:'car',center:true},{label:'Operativos',value:rows.filter(a=>['good','regular','stored','repaired'].includes(a.status)).length,symbol:'shield-alert',tone:'green',center:true},{label:'En taller / dañados',value:rows.filter(a=>['bad','maintenance'].includes(a.status)).length,symbol:'wrench',tone:'orange',center:true},{label:'Asignados',value:rows.filter(a=>a.assignedPersonId).length,symbol:'user-check',center:true}]);
    if(!weapon){root.querySelector('#asset-export').className='card module-toolbar';exportPicker(root.querySelector('#asset-export'),report);}
  }
  const rowActions=a=>'<div class="row-actions">'+iconButton('detail',a.id,'Ficha de '+a.name,'file')+
    (can(user.role,'asset.save',a) && !['decommissioned','maintenance'].includes(a.status)?iconButton('edit',a.id,'Editar '+a.name,'save'):'')+
    (a.assignedPersonId && can(user.role,'asset.return',a)?button('return',a.id,'Devolver','secondary') : !a.assignedPersonId && can(user.role,'asset.assign',a) && ['good','regular','stored','repaired'].includes(a.status)?iconButton('assign',a.id,'Asignar '+a.name,'user','assign'):'')+
    (can(user.role,'asset.save',a) && a.status!=='decommissioned'?iconButton('move',a.id,'Trasladar '+a.name,'map-pin'):'')+
    (can(user.role,'asset.save',a) && !a.assignedPersonId && !['decommissioned','maintenance'].includes(a.status)?iconButton('archive',a.id,'Dar de baja '+a.name,'alert'):'')+'</div>';
  const columns=inventory?[
    {label:'Foto',render:a=>photo(state,a)},{key:'code',label:'Código'},{key:'name',label:'Nombre'},{label:'Asignado a',render:a=>a.assignedPersonId?e(lookup(state.people,a.assignedPersonId)):'<span class="muted-italic">Sin asignar</span>'},{key:'category',label:'Categoría'},{label:'Estado',render:a=>badge(a.status)},{label:'Acciones',render:rowActions}
  ]:weapon?[
    {label:'Foto',render:a=>photo(state,a)},{label:'Identificación',render:a=>`<strong>${e(a.code)}</strong><small>S/N: ${e(a.serial)}</small>`},{label:'Especificaciones',render:a=>`<strong>${e(a.details.weaponType || a.name)}</strong><small>${e(a.details.caliber)} · ${e(a.brand)}</small>`},{label:'Estado / asignación',render:a=>`<strong>${e(a.assignedPersonId?lookup(state.people,a.assignedPersonId):available(a)?'Disponible':'No disponible')}</strong><small>${e(STATUS[a.status])}</small>`},{label:'Gestión',render:rowActions}
  ]:[
    {label:'Foto',render:a=>photo(state,a)},{label:'Placa / código',render:a=>`<strong>${e(a.details.plate)}</strong><small>${e(a.code)}</small>`},{label:'Vehículo',render:a=>`<strong>${e(a.name)}</strong><small>MODELO: ${e(a.details.year || a.model || '—')}</small>`},{label:'Uso / kilometraje',render:a=>`<strong>${e(Number(a.details.mileage).toLocaleString('es-HN'))} KM</strong><small>${e(a.assignedPersonId?lookup(state.people,a.assignedPersonId):'Sin asignar')}</small>`},{label:'Estado',render:a=>badge(a.status)},{label:'Gestión',render:rowActions}
  ];
  table(root.querySelector('#asset-table'),rows.map(a=>({...a,assignmentState:a.assignedPersonId?'assigned':'unassigned'})),columns,{placeholder:inventory || weapon?'Buscar por código, nombre o serie…':'Buscar por placa, código o nombre…',query:ctx.inventoryFilters?.query || '',values:ctx.inventoryFilters?.values || {},filters:[
    ...(inventory?[{key:'category',label:'Categoría',options:[...new Set(rows.map(a=>a.category))].map(v=>[v,v])},{key:'locationId',label:'Ubicación',options:state.locations.map(l=>[l.id,l.name])},{key:'assignmentState',label:'Asignación',options:[['assigned','Asignado'],['unassigned','Sin asignar']]}]:[]),
    {key:'status',label:'Estado',options:['good','regular','bad','stored','repaired','maintenance','decommissioned'].map(v=>[v,STATUS[v]])}
  ],onChange:(r,filters)=>{visible=r;if(inventory)ctx.inventoryFilters=filters;}});
  if(weapon){
    const loans=state.assignments.filter(a=>a.resource==='asset' && rows.some(r=>r.id===a.itemId)).sort((a,b)=>b.startDate.localeCompare(a.startDate)).slice(0,8);
    root.querySelector('#asset-log').innerHTML=`<section class="assignment-log"><h2>Bitácora de asignaciones recientes</h2>${loans.map(a=>`<article><div><strong>${e(lookup(state.assets,a.itemId))}</strong><p>RESPONSABLE: ${e(lookup(state.people,a.personId))} · ${e(lookup(state.assets,a.itemId,'code'))}</p></div><time>${e(dateTime(a.startDate))}<br>${e(a.status==='active'?'VIGENTE':'DEVUELTA · '+dateTime(a.endDate))}</time></article>`).join('') || '<p>Sin asignaciones registradas.</p>'}</section>`;
  }
}
