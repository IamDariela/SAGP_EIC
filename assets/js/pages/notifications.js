import {actions,delegate,escapeHtml as e,dateTime,actionButton as button,toast} from '../core/ui.js';
import {alerts,activityVisible} from '../core/queries.js';
import {canVisit,pageLink} from '../core/ui.js';
import {heading} from '../core/presentation.js';
import {icon} from '../core/icons.js';
export function mount(ctx){
  heading('CENTRO DE NOTIFICACIONES TÁCTICAS','Avisos y alertas de seguimiento de SAGP','bell');actions([]);
  const rows=ctx.state.notifications.filter(n=>activityVisible(ctx.state,ctx.user.role,n)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),pending=rows.filter(n=>!n.readBy.includes(ctx.user.id));
  const notices=alerts(ctx.state,ctx.user).filter(a=>canVisit(ctx,a.page)),supported='Notification' in window && window.isSecureContext;
  ctx.root.innerHTML=`<section class="card device-panel"><span class="metric-icon">${icon('phone')}</span><div><h3>AVISOS EN ESTE NAVEGADOR</h3><p>Notificaciones locales mientras esta pantalla esté abierta. La vinculación con teléfonos y avisos en segundo plano requiere un servicio institucional.</p></div><button class="btn btn-warning" type="button" data-action="device" ${supported?'':'disabled'}>${ctx.deviceAlerts?'ACTIVADO EN ESTA PANTALLA':supported?'ACTIVAR EN ESTE DISPOSITIVO':'NO DISPONIBLE'}</button></section><section class="card" style="padding:0">${!pending.length && !notices.length?`<div class="empty-panel">${icon('check-double')}<h3>BANDEJA DE ENTRADA LIMPIA</h3><p>No hay alertas pendientes para tu nivel de responsabilidad.</p></div>`:`<div class="panel-heading" style="padding:24px 24px 0"><h2>AVISOS PENDIENTES</h2><span class="updated-tag">${pending.length} AVISOS · ${notices.length} ALERTAS</span></div>${notices.map(a=>`<article class="notification-item"><span class="metric-icon">${icon('alert')}</span><div><h3>${e(a.message)}</h3><p>Requiere seguimiento en el módulo correspondiente.</p></div>${pageLink(ctx,a.page,null,'Revisar')}</article>`).join('')}${pending.map(n=>`<article class="notification-item"><span class="metric-icon blue">${icon('bell')}</span><div><h3>${e(n.message)}</h3><p>${e(dateTime(n.createdAt))}</p></div>${button('read',n.id,'Marcar como leída')}</article>`).join('')}`}</section><details class="card" style="margin-top:24px"><summary>Avisos leídos (${rows.length-pending.length})</summary>${rows.filter(n=>n.readBy.includes(ctx.user.id)).map(n=>`<article class="notification-item"><div><h3>${e(n.message)}</h3><p>${e(dateTime(n.createdAt))}</p></div></article>`).join('') || '<p class="empty-state">No hay avisos leídos.</p>'}</details>`;
  if(ctx.deviceAlerts && Notification.permission==='granted'){
    const seen=ctx.deviceSeen || new Set(rows.map(n=>n.id));
    for(const n of pending)if(!seen.has(n.id))new Notification('SAGP · EIC',{body:n.message});
    ctx.deviceSeen=new Set(rows.map(n=>n.id));
  }
  delegate(ctx.root,async(action,id)=>{
    if(action==='read')await ctx.perform({action:'notification.read',id},'Notificación marcada como leída.');
    if(action==='device'){
      if(!supported)return;
      if(Notification.permission==='denied'){toast('Las notificaciones están bloqueadas en este navegador. Revisa los permisos del sitio.');return;}
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission==='granted'){ctx.deviceAlerts=true;ctx.deviceSeen=new Set(rows.map(n=>n.id));new Notification('SAGP · EIC',{body:'Avisos activados mientras esta pantalla esté abierta.'});mount(ctx);}
      else toast('No se activaron las notificaciones del dispositivo.');
    }
  });
}
