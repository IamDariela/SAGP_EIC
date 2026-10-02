import {ROLES} from '../core/model.js';
import {toast} from '../core/ui.js';
function resetButton(context) {
  if(document.getElementById('recover-demo'))return;
  const button=document.createElement('button');button.id='recover-demo';button.type='button';button.className='btn btn-secondary';button.textContent='Restablecer datos de demostración';
  button.onclick=async()=>{
    if(!confirm('Se perderán los registros de demostración de esta versión guardados en este navegador. ¿Restablecer los ejemplos?'))return;
    try{await context.service.reset({recovery:true});await context.session.logout();await context.refresh();toast('Demostración restablecida.');}catch(error){toast(error.message);}
  };
  document.querySelector('.login-card').append(button);
}
export function recovery(context){resetButton(context);document.getElementById('login-form')?.setAttribute('hidden','');}
export function mount(context) {
  if(context.config.dataMode!=='demo')return;
  const form=document.getElementById('login-form'),select=document.getElementById('demo-user');form.hidden=false;
  select.replaceChildren();
  for(const user of context.state.users.filter(user=>user.status==='active')){const option=document.createElement('option');option.value=user.id;option.textContent=`${user.name} · ${ROLES[user.role]}`;select.append(option);}
  form.onsubmit=async event=>{event.preventDefault();try{const user=context.state.users.find(user=>user.id===select.value && user.status==='active');if(!user)throw new Error('Selecciona un perfil activo.');await context.session.login(user);location.assign(context.config.baseUrl+'pages/dashboard.php');}catch(error){toast(error.message);}};
  resetButton(context);
}
