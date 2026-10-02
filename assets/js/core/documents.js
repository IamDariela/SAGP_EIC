import {can} from './policy.js';
import {view,form,escapeHtml as e,actionButton as button,dateTime,toast} from './ui.js';
const targets={asset:'asset.save',person:'person.save',driver:'driver.save',maintenance:'maintenance.progress',project:'project.save',expense:'expense.save',fund:'fund.save'};
export function documentHtml(ctx,type,id,subject) {
  const rows=ctx.state.attachments.filter(a=>a.targetType===type && a.targetId===id);
  return `<h3 class="section-title">Documentos y evidencias</h3>${rows.length?`<div class="document-grid">${rows.map(a=>`<article class="card">${a.mime.startsWith('image/')?`<img class="evidence-photo" src="${e(a.content)}" alt="${e(a.description || a.name)}">`:''}<strong>${e(a.name)}</strong><p>${e(({before:'Antes',after:'Después',document:'Documento'})[a.phase])} · ${e(dateTime(a.createdAt))}</p><p>${e(a.description)}</p>${button('document-open',a.id,'Abrir documento')}</article>`).join('')}</div>`:'<p class="text-muted">No hay documentos adjuntos.</p>'}${can(ctx.user.role,targets[type],subject)?button('document-add',`${type}|${id}`,'Adjuntar fotografía o PDF'):''}`;
}
export function openDocument(ctx,id) {
  const record=ctx.state.attachments.find(a=>a.id===id);if(!record)return;
  const data=record.content;
  // Data URLs accepted here only originate from the validated document command.
  if(!/^data:(image\/png|image\/jpeg|application\/pdf);base64,[A-Za-z0-9+/]+=*$/.test(data))throw new Error('Documento no válido.');
  const dialog=view(record.name,record.mime.startsWith('image/')?`<img class="evidence-photo" src="${e(data)}" alt="${e(record.description || record.name)}">`:'<p>Documento PDF adjunto.</p><button class="btn btn-primary" data-download>Descargar PDF</button>');
  dialog.querySelector('[data-download]')?.addEventListener('click',()=>{const blob=new Blob([Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0))],{type:record.mime}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=record.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
}
export function addDocument(ctx,type,id,after) {
  const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,application/pdf';
  input.hidden=true;document.body.append(input);input.addEventListener('cancel',()=>input.remove(),{once:true});
  input.onchange=async()=>{
    const file=input.files[0];input.remove();if(!file)return;
    try {
    if(file.size>500000){view('Archivo demasiado grande','<p>La demo admite archivos de hasta 500 KB. Utiliza una fotografía reducida o un documento pequeño.</p>');return;}
    const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
    const mime=bytes[0]===0x89 && bytes[1]===0x50?'image/png':bytes[0]===0xff && bytes[1]===0xd8?'image/jpeg':new TextDecoder().decode(bytes).startsWith('%PDF-')?'application/pdf':null;
    if(!mime){view('Formato no admitido','<p>Selecciona una fotografía PNG/JPG o un documento PDF.</p>');return;}
    const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('No se pudo leer el archivo.'));reader.onload=()=>resolve(`data:${mime};base64,`+reader.result.split(',')[1]);reader.readAsDataURL(file);});
    form({title:'Adjuntar evidencia',values:{phase:'document'},fields:[{name:'phase',label:'Tipo de evidencia',options:[{value:'document',label:'Documento'},{value:'before',label:'Antes'},{value:'after',label:'Después'}]},{name:'description',label:'Descripción',type:'textarea',required:false}],save:async values=>{await ctx.perform({action:'attachment.add',data:{...values,targetType:type,targetId:id,name:file.name,mime,content}});after?.();}});
    } catch(error) {
      toast(error.message || 'No se pudo leer el archivo seleccionado.');
    }
  };
  input.click();
}
export function handleDocument(ctx,action,id,after) {
  if(action==='document-open'){openDocument(ctx,id);return true;}
  if(action==='document-add'){const [type,targetId]=id.split('|');addDocument(ctx,type,targetId,after);return true;}
  return false;
}
