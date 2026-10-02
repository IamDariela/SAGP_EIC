/** Inventory navigation composes the asset controller, preserving its operations. */
import {mount as assetMount} from './assets.js';
import {actions,delegate,escapeHtml as e,lookup,actionButton as button} from '../core/ui.js';
import {icon} from '../core/icons.js';
import {breadcrumb} from '../core/presentation.js';
import {FLOOR_PLANS,resolveRoom} from '../core/floorplans.js';
export function mount(ctx){
  const {root,state}=ctx,query=new URLSearchParams(location.search);
  ctx.inventoryView ||= query.has('id') || query.get('view')==='all'?'all':query.has('floor')?'floor':'landing';
  ctx.inventoryFloor ||= Number(query.get('floor'))===2?2:1;
  const navigate=(mode,floor=ctx.inventoryFloor)=>{
    ctx.inventoryView=mode;ctx.inventoryFloor=floor;ctx.inventoryLocation='';ctx.inventoryFilters={};
    history.replaceState(null,'',location.pathname+(mode==='landing'?'':mode==='floor'?'?floor='+floor:'?view=all'));mount(ctx);
  };
  document.querySelector('.page-header').classList.add('suppressed');actions([]);
  if(ctx.inventoryView==='landing'){
    root.innerHTML=breadcrumb([{label:'Inventario',symbol:'package'}])+'<div class="inventory-choices">'+[
      ['1','Primera Planta','Consulta oficinas y espacios en el nivel inferior.','layout-dashboard','EXPLORAR PLANO',''],
      ['2','Segunda Planta','Distribución actual de las oficinas académicas y administrativas.','map','EXPLORAR PLANO',''],
      ['all','Inventario General','Acceso a todos los bienes institucionales permitidos para tu perfil.','package','VER TODO','dark']
    ].map(([id,title,text,symbol,cta,tone])=>`<button type="button" class="inventory-choice ${tone}" data-action="browse" data-id="${id}"><span class="metric-icon">${icon(symbol)}</span><h2>${title}</h2><p>${text}</p><b>${cta} ${icon('chevron-right')}</b></button>`).join('')+'</div>';
    delegate(root,(_action,id)=>navigate(id==='all'?'all':'floor',Number(id)||1));return;
  }
  if(ctx.inventoryView==='floor'){
    const floor=ctx.inventoryFloor,label=floor===1?'Primera':'Segunda',mapped=FLOOR_PLANS[floor].map(r=>({...r,location:resolveRoom(state.locations,r,floor)}));
    root.innerHTML=breadcrumb([{label:'Inventario',action:'home',symbol:'package'},{label:label+' Planta'}])+`<div class="module-heading"><div><h2>NAVEGACIÓN POR ${label.toUpperCase()} PLANTA</h2><p>Selecciona un espacio para consultar su inventario.</p></div><div class="row-actions">${button('switch',String(floor===1?2:1),'Cambiar a '+(floor===1?'2da':'1ra')+' Planta')}${button('home','','Volver','dark')}</div></div><section class="floor-panel ${floor===1?'first-panel':'second-panel'}"><h3>Distribución de espacios · ${label} Planta</h3><div class="floor-scroll"><div class="floor-plan ${floor===1?'first':'second'}">${mapped.map(r=>`<button type="button" class="floor-room ${r.tone}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%" ${r.location?`data-action="space" data-id="${e(r.location.id)}"`:'disabled'} title="${e(r.location?.name || r.name+' · sin registro vinculado')}"><span>${e(r.label)}</span></button>`).join('')}</div></div><p class="floor-caption">Distribución esquemática de referencia. Los espacios vinculados abren sus bienes; las zonas sin registro están desactivadas.</p></section><h3 class="section-title">Otros espacios de esta planta</h3><div class="row-actions">${state.locations.filter(l=>l.floor===floor && !mapped.some(r=>r.location?.id===l.id)).map(l=>button('space',l.id,l.name)).join('') || '<span class="text-muted">Todos los espacios están representados.</span>'}</div>`;
    delegate(root,(action,id)=>{if(action==='home')navigate('landing');if(action==='switch')navigate('floor',Number(id));if(action==='space'){ctx.inventoryLocation=id;ctx.inventoryView='all';ctx.inventoryFilters={query:'',values:{locationId:id}};mount(ctx);}});return;
  }
  assetMount(ctx);
  const controls=document.createElement('div');controls.className='module-toolbar';
  controls.innerHTML=`<button class="btn btn-secondary" data-action="inventory-back" aria-label="Volver">${icon('arrow-left')}</button><div class="row-actions" id="inventory-actions"></div>`;
  controls.querySelector('#inventory-actions').append(...document.getElementById('page-actions').children);
  const crumbs=document.createElement('div');crumbs.innerHTML=breadcrumb([{label:'Inventario',action:'inventory-home',symbol:'package'},{label:ctx.inventoryLocation?lookup(state.locations,ctx.inventoryLocation):'Inventario General'}]);
  root.prepend(controls);root.prepend(crumbs);
  const assetHandler=root.onclick;
  root.onclick=event=>{const b=event.target.closest('[data-action]');if(b?.dataset.action==='inventory-home')navigate('landing');else if(b?.dataset.action==='inventory-back')navigate(ctx.inventoryLocation?'floor':'landing');else return assetHandler(event);};
}
