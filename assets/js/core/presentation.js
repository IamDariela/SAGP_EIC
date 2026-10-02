import {icon} from './icons.js';
import {escapeHtml as e} from './ui.js';
export function heading(title,subtitle,symbol){
  const titleNode=document.querySelector('.page-title'),sub=document.querySelector('.page-subtitle');
  titleNode.innerHTML=(symbol?icon(symbol):'')+e(title);sub.textContent=subtitle;
}
export const metricCards=items=>'<div class="stats-grid metrics-'+items.length+'">'+items.map(({label,value,symbol,tone='',center=false})=>`<article class="stat-card ${center?'metric-centered':'visual'}">${symbol?`<span class="metric-icon ${tone}">${icon(symbol)}</span>`:''}<div class="stat-info"><span class="stat-label ${center?tone+'-text':''}">${e(label)}</span><strong class="stat-value ${center?tone+'-text':''}">${e(value)}</strong></div></article>`).join('')+'</div>';
export const iconButton=(action,id,label,symbol,tone='')=>`<button type="button" class="btn icon-button ${tone}" data-action="${e(action)}" data-id="${e(id)}" aria-label="${e(label)}" title="${e(label)}">${icon(symbol)}</button>`;
export function photo(state,asset){
  const attachment=state.attachments.find(a=>a.targetType==='asset' && a.targetId===asset.id && /^image\//.test(a.mime || '') && /^data:image\/(png|jpeg);base64,/.test(a.content || ''));
  return attachment?`<img class="asset-photo" src="${e(attachment.content)}" alt="${e(asset.name)}">`:`<span class="photo-placeholder" aria-label="Sin fotografía">${icon('image')}</span>`;
}
export const personLabel=name=>`<span class="avatar-label"><span class="person-avatar">${icon('user')}</span><span>${e(name)}</span></span>`;
export const breadcrumb=parts=>`<nav class="breadcrumbs" aria-label="Ruta de navegación">${parts.map((p,i)=>(i?icon('chevron-right'):'')+(p.action?`<button data-action="${e(p.action)}" data-id="${e(p.id || '')}">${p.symbol?icon(p.symbol):''} ${e(p.label)}</button>`:`<strong>${e(p.label)}</strong>`)).join('')}</nav>`;
