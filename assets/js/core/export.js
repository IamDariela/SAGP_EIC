/** Real Office packages, and a dedicated browser print document for PDF. */
import {writeXlsx,writeZip} from './spreadsheet.js';
import {escapeHtml as e,view,toast} from './ui.js';
import {icon} from './icons.js';
const xml=v=>String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function writeDocx(report,orientation='auto'){
  const landscape=orientation==='landscape' || orientation==='auto' && report.headers.length>5;
  const paragraph=(value,bold=false)=>`<w:p><w:r>${bold?'<w:rPr><w:b/></w:rPr>':''}<w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`;
  const rows=[report.headers,...report.rows].map((r,i)=>`<w:tr>${i===0?'<w:trPr><w:tblHeader/></w:trPr>':''}${r.map(v=>`<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paragraph(v,i===0)}</w:tc>`).join('')}</w:tr>`).join('');
  return writeZip({
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml':`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph('EIC Honduras · '+report.title,true)}${paragraph(report.subtitle || '')}<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows}</w:tbl><w:sectPr><w:pgSz w:w="${landscape?16838:11906}" w:h="${landscape?11906:16838}" w:orient="${landscape?'landscape':'portrait'}"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`
  });
}
function download(bytes,filename,type){
  const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');link.href=url;link.download=filename;link.hidden=true;document.body.append(link);link.click();setTimeout(()=>{link.remove();URL.revokeObjectURL(url);},10000);
}
export function exportReport(report,format='pdf',orientation='auto'){
  const filename='sagp-'+report.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase();
  if(format==='xlsx')return download(writeXlsx(report.headers,report.rows),filename+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if(format==='docx')return download(writeDocx(report,orientation),filename+'.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  if(format!=='pdf')throw new Error('Formato de exportación no admitido.');
  const landscape=orientation==='landscape' || orientation==='auto' && report.headers.length>5;
  const frame=document.createElement('iframe');frame.title='Documento para imprimir';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;border:0';
  frame.onload=()=>{frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);};
  frame.srcdoc=`<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${e(report.title)}</title><style>@page{size:A4 ${landscape?'landscape':'portrait'};margin:15mm}body{font:11px Arial;color:#173352}h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #d6dfeb;padding:7px;text-align:left;overflow-wrap:anywhere}th{background:#edf2f8}thead{display:table-header-group}tr{break-inside:avoid}p{color:#7186a5}</style></head><body><h1>EIC Honduras · ${e(report.title)}</h1><p>${e(report.subtitle || '')}</p><table><thead><tr>${report.headers.map(v=>'<th>'+e(v)+'</th>').join('')}</tr></thead><tbody>${report.rows.map(r=>'<tr>'+r.map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')}</tbody></table><p>${report.rows.length} registros</p></body></html>`;
  document.body.append(frame);
}
export function exportPicker(root,getReport,{format='pdf',orientation=()=> 'auto',onFormat=()=>{}}={}){
  root.innerHTML=`<div class="export-picker">${[['pdf','PDF','.pdf'],['docx','WORD','.docx'],['xlsx','EXCEL','.xlsx']].map(([key,label,ext])=>`<button class="export-format" type="button" data-format="${key}" aria-pressed="${key===format}" aria-label="Formato ${label}">${icon('file')}<span>${label}</span><small>(${ext})</small></button>`).join('')}<button class="btn btn-primary" type="button" data-export>${icon('download')}<span>GENERAR ${format==='docx'?'WORD':format==='xlsx'?'EXCEL':'PDF'}</span></button></div><p class="export-note">PDF: selecciona «Guardar como PDF» en la ventana de impresión.</p>`;
  const generate=root.querySelector('[data-export]');
  root.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{format=b.dataset.format;root.querySelectorAll('[data-format]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));generate.querySelector('span').textContent='GENERAR '+(format==='docx'?'WORD':format==='xlsx'?'EXCEL':'PDF');onFormat(format);});
  root.querySelector('[data-export]').onclick=()=>{try{exportReport(getReport(),format,orientation());}catch(error){toast(error.message);}};
}
export function reportDialog(report){
  const dialog=view(report.title,'<div class="report-export"></div><p class="text-muted" style="margin-top:20px">'+e(report.rows.length)+' registros incluidos.</p>');
  exportPicker(dialog.querySelector('.report-export'),()=>report);return dialog;
}
