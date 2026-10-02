import {mount as driversMount} from './drivers.js';
import {heading} from '../core/presentation.js';
import {mount as assetsMount} from './assets.js';
import {can} from '../core/policy.js';
import {STATUS} from '../core/model.js';
import {table,form,delegate,escapeHtml as e,lookup,actionButton as button,dateTime,options,badge,stats} from '../core/ui.js';
export function mount(ctx) {
  const {root,state,user}=ctx;
  heading('CONTROL DE VEHÍCULOS Y CONDUCTORES','Supervisión de flota vehicular, asignaciones y conductores autorizados','car');
  ctx.fleetTab ||= 'fleet';
  const tabs=`<div class="module-toolbar card"><div><strong>CONTROL VEHICULAR</strong><p class="text-muted">Flota y personal autorizado</p></div><div class="subtle-tabs" role="tablist" aria-label="Control vehicular"><button role="tab" aria-selected="${ctx.fleetTab==='fleet'}" data-fleet-tab="fleet">Flota Vehicular</button><button role="tab" aria-selected="${ctx.fleetTab==='drivers'}" data-fleet-tab="drivers">Conductores (${state.drivers.filter(d=>user.role!=='conductor' || d.userId===user.id).length})</button></div></div>`;
  const bindTabs=()=>root.querySelectorAll('[data-fleet-tab]').forEach(b=>b.onclick=()=>{ctx.fleetTab=b.dataset.fleetTab;mount(ctx);});
  if(ctx.fleetTab==='drivers'){root.innerHTML=tabs+'<div id="driver-directory"></div>';driversMount({...ctx,root:root.querySelector('#driver-directory')});bindTabs();return;}
  root.innerHTML=tabs+'<div id="fleet"></div><h2 class="section-title">Uso vehicular</h2><div id="trip-actions" class="row-actions"></div><div id="trip-stats"></div><div id="trips"></div><h2 class="section-title">Incidencias reportadas</h2><div id="incident-actions" class="row-actions"></div><div id="incidents"></div>';
  assetsMount({...ctx,root:root.querySelector('#fleet')});
  const fleet=root.querySelector('#fleet');fleet.prepend(fleet.querySelector('#asset-export'));bindTabs();
  const drivers=state.drivers.filter(d=>user.role!=='conductor' || d.userId===user.id),trips=state.trips.filter(t=>drivers.some(d=>d.id===t.driverId));
  if(can(user.role,'trip.open'))root.querySelector('#trip-actions').innerHTML=button('depart','','Registrar salida');
  if(can(user.role,'incident.save'))root.querySelector('#incident-actions').innerHTML=button('incident','','Reportar problema');
  stats(root.querySelector('#trip-stats'),[['Recorridos activos',trips.filter(t=>t.status==='active').length],['Recorridos finalizados',trips.filter(t=>t.status==='completed').length],['Kilómetros recorridos',trips.filter(t=>t.status==='completed').reduce((n,t)=>n+t.endMileage-t.startMileage,0)]]);
  table(root.querySelector('#trips'),[...trips].sort((a,b)=>b.startDate.localeCompare(a.startDate)),[{label:'Placa',render:t=>e(state.assets.find(a=>a.id===t.assetId)?.details.plate)},{label:'Conductor',render:t=>e(lookup(state.people,state.drivers.find(d=>d.id===t.driverId)?.personId))},{key:'destination',label:'Destino'},{key:'reason',label:'Motivo'},{label:'Salida',render:t=>e(dateTime(t.startDate))},{label:'Regreso',render:t=>e(dateTime(t.endDate))},{key:'startMileage',label:'KM inicial'},{key:'endMileage',label:'KM final'},{label:'Estado',render:t=>badge(t.status)},{label:'Acciones',render:t=>t.status==='active' && can(user.role,'trip.close')?button('arrive',t.id,'Registrar regreso'):''}]);
  const incidents=state.incidents.filter(i=>user.role!=='conductor' || i.reportedBy===user.id);
  table(root.querySelector('#incidents'),incidents,[{label:'Vehículo',render:i=>e(lookup(state.assets,i.assetId))},{key:'description',label:'Problema'},{label:'Fecha',render:i=>e(dateTime(i.date))},{label:'Estado',render:i=>badge(i.status)},{key:'resolution',label:'Seguimiento'}]);
  delegate(root,(action,id)=>{
    if(action==='depart') {
      const available=state.assets.filter(a=>a.type==='vehicle' && ['good','regular','stored','repaired'].includes(a.status) && !state.trips.some(t=>t.assetId===a.id && t.status==='active'));
      const dialog=form({title:'Registrar salida de vehículo',values:{startMileage:available[0]?.details.mileage},fields:[{name:'assetId',label:'Vehículo',options:available.map(a=>({value:a.id,label:a.details.plate+' · '+a.name}))},{name:'driverId',label:'Conductor autorizado',options:drivers.filter(d=>d.status==='active').map(d=>({value:d.id,label:lookup(state.people,d.personId)}))},{name:'destination',label:'Destino'},{name:'reason',label:'Motivo'},{name:'startMileage',label:'Kilometraje inicial',type:'number',min:0,step:'1'}],save:data=>ctx.perform({action:'trip.open',data})});
      dialog.querySelector('[name=assetId]').onchange=event=>{dialog.querySelector('[name=startMileage]').value=state.assets.find(a=>a.id===event.target.value)?.details.mileage || 0;};
    }
    if(action==='arrive')form({title:'Registrar regreso de vehículo',values:{endMileage:state.trips.find(t=>t.id===id).startMileage},fields:[{name:'endMileage',label:'Kilometraje final',type:'number',min:0,step:'1'},{name:'notes',label:'Observaciones',type:'textarea',required:false}],save:data=>ctx.perform({action:'trip.close',id,data})});
    if(action==='incident')form({title:'Reportar problema del vehículo',fields:[{name:'assetId',label:'Vehículo utilizado',options:state.assets.filter(a=>a.type==='vehicle' && (user.role!=='conductor' || trips.some(t=>t.assetId===a.id))).map(a=>({value:a.id,label:a.details.plate+' · '+a.name}))},{name:'description',label:'Problema observado',type:'textarea'}],save:data=>ctx.perform({action:'incident.save',data})});
  });
}
