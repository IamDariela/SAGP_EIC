import {STATUS,normalize} from './model.js';
import {buildCsv} from './csv.js';
import {icon} from './icons.js';
export const escapeHtml=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=value=>new Intl.NumberFormat('es-HN',{style:'currency',currency:'HNL'}).format(Number(value)||0);
export const dateTime=value=>value ? new Intl.DateTimeFormat('es-HN',{timeZone:'America/Tegucigalpa',dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : '—';
export const badge=value=>`<span class="badge badge-${escapeHtml(value)}">${escapeHtml(STATUS[value] || value || '—')}</span>`;
export const lookup=(items,id,field='name')=>items.find(item=>item.id===id)?.[field] || '—';
export const actionButton=(action,id,label,kind='secondary')=>`<button type="button" class="btn btn-sm btn-${kind}" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
export function toast(message) {
  const el=document.getElementById('toast'); el.textContent=message; el.hidden=false;
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>{el.hidden=true;},4500);
}
export function actions(items) {
  const root=document.getElementById('page-actions'); root.replaceChildren();
  for(const {label,run,kind='primary',symbol='plus'} of items) {
    const button=document.createElement('button'); button.type='button'; button.className=`btn btn-${kind}`; button.innerHTML=icon(symbol)+escapeHtml(label);
    button.addEventListener('click',()=>Promise.resolve().then(run).catch(error=>toast(error.message))); root.append(button);
  }
}
export function table(root,rows,columns,{search=true,filters=[],empty='No hay registros.',placeholder='Buscar registros…',query:initialQuery='',values:initialValues={},onChange=()=>{}}={}) {
  root.innerHTML=`<div class="table-container">${search || filters.length ? '<div class="table-filters"></div>' : ''}<div class="table-scroll"><table class="table-custom"><thead><tr>${columns.map(c=>`<th scope="col">${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody></tbody></table></div><p class="table-count text-muted"></p></div>`;
  const toolbar=root.querySelector('.table-filters'), tbody=root.querySelector('tbody');
  let query=initialQuery; const values={...initialValues};
  const render=()=>{
    const visible=rows.filter(row=>normalize(Object.values(row).map(v=>typeof v==='object'?JSON.stringify(v):v).join(' ')+(row.searchText || '')).includes(normalize(query)) && filters.every(f=>!values[f.key] || String(row[f.key])===values[f.key]));
    tbody.innerHTML=visible.length ? visible.map(row=>`<tr>${columns.map(c=>`<td>${c.render ? c.render(row) : escapeHtml(row[c.key] ?? '—')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}" class="empty-state">${escapeHtml(empty)}</td></tr>`;
    root.querySelector('.table-count').textContent=`${visible.length} de ${rows.length} registros`;
    onChange(visible,{query,values:{...values}});
  };
  if(search) { const input=document.createElement('input'); input.type='search'; input.className='form-control'; input.placeholder=placeholder; input.value=query; input.setAttribute('aria-label',placeholder); input.addEventListener('input',()=>{query=input.value;render();}); toolbar.append(input); }
  for(const filter of filters) {
    const select=document.createElement('select'); select.className='form-select'; select.setAttribute('aria-label',filter.label);
    select.innerHTML=`<option value="">${escapeHtml(filter.label)}</option>`+filter.options.map(([value,label])=>`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
    select.value=values[filter.key] || '';
    select.addEventListener('change',()=>{values[filter.key]=select.value;render();}); toolbar.append(select);
  }
  render();
}
const fieldValue=(data,path)=>path.split('.').reduce((v,key)=>v?.[key],data);
export function form({title,fields,values={},submitLabel='Guardar',save}) {
  const dialog=document.createElement('dialog'); dialog.className='form-dialog';
  dialog.innerHTML=`<form><div class="modal-header"><h2 class="modal-title">${escapeHtml(title)}</h2><button type="button" class="modal-close-btn" data-close aria-label="Cerrar">×</button></div><div class="modal-body"><p class="form-error" role="alert" hidden></p>${fields.map(field=>{
    const value=fieldValue(values,field.name) ?? field.default ?? '';
    const attrs=`id="field-${escapeHtml(field.name)}" name="${escapeHtml(field.name)}" ${field.required===false?'':'required'} ${field.readonly?'readonly':''}`;
    let control;
    if(field.options) control=`<select class="form-select" ${attrs}><option value="">Seleccionar…</option>${field.options.map(option=>`<option value="${escapeHtml(option.value)}" ${String(value)===String(option.value)?'selected':''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
    else if(field.type==='textarea') control=`<textarea class="form-control" ${attrs} rows="3">${escapeHtml(value)}</textarea>`;
    else control=`<input class="form-control" type="${escapeHtml(field.type || 'text')}" ${attrs} value="${escapeHtml(value)}" ${field.min!==undefined?`min="${field.min}"`:''} ${field.step?`step="${field.step}"`:''} maxlength="${field.type==='number'?'30':'1000'}">`;
    return `<div class="form-group"><label class="form-label" for="field-${escapeHtml(field.name)}">${escapeHtml(field.label)}</label>${control}${field.help?`<small class="text-muted">${escapeHtml(field.help)}</small>`:''}</div>`;
  }).join('')}</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${escapeHtml(submitLabel)}</button></div></form>`;
  document.body.append(dialog); dialog.showModal();
  dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)dialog.close();}});
  dialog.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault(); const button=dialog.querySelector('[type=submit]'),error=dialog.querySelector('.form-error'); button.disabled=true; error.hidden=true;
    try { await save(Object.fromEntries(new FormData(event.target))); if(dialog.isConnected)dialog.close(); }
    catch(err) { error.textContent=err.message; error.hidden=false; button.disabled=false; }
  });
  return dialog;
}
export function delegate(root,handler) {
  root.onclick=async event=>{
    const button=event.target.closest('[data-action]'); if(!button || button.disabled)return;
    button.disabled=true;
    try { await handler(button.dataset.action,button.dataset.id); }
    catch(error) { toast(error.message); }
    finally { if(button.isConnected)button.disabled=false; }
  };
}
export function stats(root,items) { root.innerHTML=`<div class="stats-grid">${items.map(([label,value])=>`<div class="stat-card"><div class="stat-info"><span class="stat-label">${escapeHtml(label)}</span><strong class="stat-value">${escapeHtml(value)}</strong></div></div>`).join('')}</div>`; }
export function downloadCsv(filename, headers, rows) {
  const blob = new Blob([buildCsv(headers, rows)], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 10000);
}
export function view(title,html) {
  const dialog=document.createElement('dialog');dialog.className='form-dialog detail-dialog';
  dialog.innerHTML=`<div class="modal-header"><h2 class="modal-title">${escapeHtml(title)}</h2><button type="button" class="modal-close-btn" aria-label="Cerrar">×</button></div><div class="modal-body">${html}</div>`;
  dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();return dialog;
}
export const info=items=>`<dl class="detail-grid">${items.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? '—')}</dd></div>`).join('')}</dl>`;
export const options=(rows,field='name')=>rows.map(r=>({value:r.id,label:r[field]}));
export const pageLink=(ctx,page,id,label)=>`<a class="btn btn-sm btn-secondary" href="${escapeHtml(ctx.config.baseUrl+'pages/'+ctx.config.navigation[page][1]+(id?'?id='+encodeURIComponent(id):''))}">${escapeHtml(label || ctx.config.navigation[page][0])}</a>`;
export function canVisit(ctx,page){return Boolean(ctx.config.navigation[page]?.[3].includes(ctx.user.role));}
