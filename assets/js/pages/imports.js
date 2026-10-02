import {IMPORT_TEMPLATES} from '../core/import.js';
import {readSpreadsheet,writeXlsx} from '../core/spreadsheet.js';
import {previewImport} from '../core/commands.js';
import {can} from '../core/policy.js';
import {actions,table,escapeHtml as e,toast,stats} from '../core/ui.js';
export function mount(ctx) {
  const {root,state,user}=ctx;
  const kinds=Object.entries(IMPORT_TEMPLATES).filter(([kind])=>can(user.role,kind==='people'?'person.save':'asset.save',{type:kind==='vehicles'?'vehicle':'general'}));
  ctx.importKind ||= kinds[0]?.[0];if(!kinds.some(([k])=>k===ctx.importKind))ctx.importKind=kinds[0]?.[0];
  const template=IMPORT_TEMPLATES[ctx.importKind];actions([]);
  root.innerHTML=`<ol class="process-steps"><li>Descargar plantilla</li><li>Completar información</li><li>Revisar resultados</li><li>Confirmar incorporación</li></ol><div class="card"><label for="import-kind">Información a importar</label><select id="import-kind" class="form-select">${kinds.map(([kind,t])=>`<option value="${kind}" ${kind===ctx.importKind?'selected':''}>${e(t.label)}</option>`).join('')}</select><button type="button" id="template-download" class="btn btn-secondary">Descargar plantilla Excel</button><p>Completa la primera hoja con valores y conserva los encabezados. Usa los nombres de ubicaciones y los códigos de cursos registrados. Identidad y placa deben conservarse como texto.</p><label for="import-file">Archivo Excel (.xlsx) o CSV</label><input id="import-file" class="form-control" type="file" accept=".xlsx,.csv"><button id="import-review" class="btn btn-primary" type="button">Revisar archivo</button><p id="import-error" class="form-error" role="alert" hidden></p></div><div id="import-result"></div>`;
  root.querySelector('#import-kind').onchange=event=>{ctx.importKind=event.target.value;ctx.importPreview=null;mount(ctx);};
  root.querySelector('#template-download').onclick=()=>{const url=URL.createObjectURL(new Blob([writeXlsx(template.headers)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');link.href=url;link.download='sagp-plantilla-'+ctx.importKind+'.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  const result=()=>{
    const preview=ctx.importPreview;if(!preview)return;
    const valid=preview.filter(r=>r.valid),target=root.querySelector('#import-result');target.innerHTML='<div id="import-stats"></div><div id="import-rows"></div><button class="btn btn-primary" id="import-confirm" type="button"></button>';
    stats(target.querySelector('#import-stats'),[['Encontrados',preview.length],['Correctos',valid.length],['Con errores',preview.length-valid.length]]);
    table(target.querySelector('#import-rows'),preview,[{key:'row',label:'Fila'},{label:'Datos revisados',render:r=>e(Object.values(r.values).join(' · '))},{label:'Resultado',render:r=>r.valid?'Correcto':e(r.error)}]);
    const button=target.querySelector('#import-confirm');button.textContent=`Incorporar ${valid.length} ${valid.length===1?'registro correcto':'registros correctos'}`;button.disabled=!valid.length;
    button.onclick=async()=>{
      if(!confirm(`¿Incorporar ${valid.length} ${valid.length===1?'registro correcto':'registros correctos'}? Las filas con errores quedarán fuera.`))return;
      button.disabled=true;
      try{await ctx.service.execute({action:'import.batch',data:{kind:ctx.importKind,rows:valid.map(r=>r.values)}});ctx.importPreview=null;await ctx.refresh();toast('Información incorporada con historial.');}
      catch(error){root.querySelector('#import-error').hidden=false;root.querySelector('#import-error').textContent=error.message;button.disabled=false;}
    };
  };
  root.querySelector('#import-review').onclick=async()=>{
    const button=root.querySelector('#import-review'),error=root.querySelector('#import-error');button.disabled=true;error.hidden=true;
    try{const file=root.querySelector('#import-file').files[0];if(!file)throw new Error('Selecciona un archivo.');const rows=await readSpreadsheet(file),latest=await ctx.service.getState();ctx.importPreview=previewImport(latest,{kind:ctx.importKind,rows},user);result();}
    catch(err){ctx.importPreview=null;root.querySelector('#import-result').replaceChildren();error.textContent=err.message;error.hidden=false;}finally{button.disabled=false;}
  };result();
}
