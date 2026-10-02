/** App lifecycle: configuration, session, navigation and module loading. Business rules live in core/commands.js. */
import {createService} from './storage.js';
import {createSession} from './core/session.js';
import {actions,toast} from './core/ui.js';
import {STATE_KEY,SESSION_KEY} from './data/local.js';
const config=JSON.parse(document.getElementById('sagp-config').textContent);
const routes={dashboard:'dashboard',institucional:'institutional',busqueda:'search',inventario:'inventory',armeria:'assets',vehiculos:'vehicles',conductores:'drivers',ubicaciones:'locations',cursos:'courses',finanzas:'finance',importacion:'imports',personas:'catalogs',usuarios:'catalogs',dormitorios:'dormitories',mantenimiento:'maintenance',planificacion:'planning',proyectos:'projects',historia:'history',reportes:'reports',notificaciones:'notifications',login:'login'};
const status=document.getElementById('page-status');
const context={config,root:document.getElementById('module-content'),state:null,user:null};
let module,revision=0;
async function refresh() {
  const current=++revision;
  try {
    const state=await context.service.getState();
    const user=config.page==='login' ? null : await context.session.current(state);
    if(current!==revision)return;
    if(config.page!=='login' && !user) { location.replace(config.baseUrl+'login.php');return; }
    if(context.user && context.user.id!==user?.id){context.inventoryFilters={};context.inventoryLocation='';context.deviceAlerts=false;context.deviceSeen=null;}
    context.state=state;context.user=user;
    if(user) {
      const roleSelect=document.getElementById('simulated-role-select');if(roleSelect){for(const option of roleSelect.options)option.disabled=!state.users.some(u=>u.role===option.value && u.status==='active');roleSelect.value=user.role;}
      document.getElementById('current-user').textContent=user.name;
      document.getElementById('user-avatar').textContent=user.name.trim().charAt(0).toUpperCase();
      document.body.dataset.role=user.role;
      document.body.dataset.page=config.page;
      document.querySelector('.page-header')?.classList.remove('suppressed');
      document.querySelectorAll('.nav-link[data-page]').forEach(link=>{link.hidden=!config.navigation[link.dataset.page][3].includes(user.role);});
      if(!config.navigation[config.page][3].includes(user.role)) {
        actions([]);context.root.replaceChildren();status.textContent='Tu rol no tiene acceso a este módulo. Selecciona una opción del menú.';status.className='notice';return;
      }
    }
    status.textContent=config.dataMode==='demo'?'Demostración · información de ejemplo para recorrer los procesos institucionales.':'Información institucional.';
    status.className='environment-status';
    await module.mount(context);
  } catch(error) {
    if(current!==revision)return;
    status.textContent=error.message;status.className='notice error';
    if(context.root)context.root.replaceChildren();
    if(config.page==='login' && config.dataMode==='demo') module?.recovery(context);
  }
}
context.refresh=refresh;
context.perform=async (command,message='Operación guardada.')=>{const result=await context.service.execute(command);await refresh();toast(message);return result;};
try {
  context.service=await createService(config);context.session=createSession(config,context.service);
  module=await import('./pages/'+routes[config.page]+'.js');
  await refresh();
} catch(error) {status.textContent=error.message;status.className='notice error';}
const roleSelect=document.getElementById('simulated-role-select');
roleSelect?.addEventListener('change',async()=>{
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  try{await context.session.setRole(roleSelect.value);await refresh();}catch(error){toast(error.message);}
});
document.getElementById('logout')?.addEventListener('click',async()=>{try{await context.session.logout();location.assign(config.baseUrl+'login.php');}catch(error){toast(error.message);}});
const sidebar=document.getElementById('app-sidebar'),toggle=document.getElementById('sidebar-toggle');
if(toggle && matchMedia('(max-width:1024px)').matches)toggle.setAttribute('aria-expanded','false');
document.getElementById('sidebar-close')?.addEventListener('click',()=>{sidebar.classList.remove('mobile-open');toggle.setAttribute('aria-expanded','false');});
toggle?.addEventListener('click',()=>{if(matchMedia('(max-width:1024px)').matches){sidebar.classList.toggle('mobile-open');toggle.setAttribute('aria-expanded',String(sidebar.classList.contains('mobile-open')));}else{sidebar.classList.toggle('collapsed');toggle.setAttribute('aria-expanded',String(!sidebar.classList.contains('collapsed')));}});
function updateClock(){const clock=document.getElementById('live-clock');if(clock){const now=new Date();clock.dateTime=now.toISOString();document.getElementById('clock-date').textContent=new Intl.DateTimeFormat('es-HN',{timeZone:'America/Tegucigalpa',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);document.getElementById('clock-time').textContent=new Intl.DateTimeFormat('es-HN',{timeZone:'America/Tegucigalpa',timeStyle:'medium'}).format(now);}}
updateClock();setInterval(updateClock,1000);
window.addEventListener('storage',event=>{if(event.key===STATE_KEY || event.key===SESSION_KEY || event.key===null)refresh();});
