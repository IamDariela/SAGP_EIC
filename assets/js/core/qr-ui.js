import {qrToken,qrSvg,parseQr} from './qr.js';
import {view,escapeHtml as e,form,toast} from './ui.js';
export function showQr(type,id,name) {
  const token=qrToken(type,id);
  const svg=qrSvg(token),dialog=view(`QR · ${name}`,`${svg}<p>Este código identifica el ${type==='location'?'espacio':'registro de participación'}. No incluye identidad ni datos personales.</p><p><code>${e(token)}</code></p><p>En la demostración, abre Leer QR e introduce este código con un lector o utiliza la cámara compatible.</p><button class="btn btn-primary" type="button" data-download-qr>Descargar QR</button>`);
  dialog.querySelector('[data-download-qr]').onclick=()=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),link=document.createElement('a');link.href=url;link.download=`sagp-qr-${type}-${id}.svg`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
}
export function scanQr(ctx,type,onRead) {
  const rows=type==='location'?ctx.state.locations:ctx.state.enrollments;
  const dialog=form({title:'Leer QR',submitLabel:'Consultar registro',fields:[{name:'code',label:'Código del lector',help:'Puedes pegar el código SAGP o leerlo con la cámara compatible.'}],save:async data=>{const result=parseQr(data.code);if(result.type!==type || !rows.some(r=>r.id===result.id))throw new Error('El código no corresponde a un registro disponible en este módulo.');dialog.close();await onRead(result.id);}});
  const selector=document.createElement('select');selector.className='form-select';selector.setAttribute('aria-label','Ejemplo para probar el lector');
  selector.innerHTML='<option value="">Probar con un registro de ejemplo…</option>'+rows.map(r=>`<option value="${e(qrToken(type,r.id))}">${e(type==='location'?r.name:ctx.state.people.find(p=>p.id===r.personId)?.name+' · '+ctx.state.courses.find(c=>c.id===r.courseId)?.name)}</option>`).join('');
  selector.onchange=()=>{dialog.querySelector('[name=code]').value=selector.value;};dialog.querySelector('.modal-body').append(selector);
  const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent='Leer con cámara';dialog.querySelector('.modal-body').append(button);
  let stream,frame,stopped=false;dialog.addEventListener('close',()=>{stopped=true;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());});
  button.onclick=async()=>{
    if(!globalThis.BarcodeDetector || !navigator.mediaDevices?.getUserMedia){toast('La cámara QR requiere un navegador compatible y una conexión segura. Puedes utilizar un lector o el código de ejemplo.');return;}
    button.disabled=true;
    try {
      const detector=new BarcodeDetector({formats:['qr_code']});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      if(stopped){stream.getTracks().forEach(t=>t.stop());return;}
      const video=document.createElement('video');video.className='qr-camera';video.srcObject=stream;video.playsInline=true;dialog.querySelector('.modal-body').append(video);await video.play();
      const detect=async()=>{if(stopped)return;try{const codes=await detector.detect(video);if(codes[0]){dialog.querySelector('[name=code]').value=codes[0].rawValue;stream.getTracks().forEach(t=>t.stop());video.remove();button.disabled=false;return;}}catch{toast('No se pudo leer la cámara. Introduce el código del lector.');stream.getTracks().forEach(t=>t.stop());return;}frame=requestAnimationFrame(detect);};detect();
    }catch(error){toast('No se pudo abrir la cámara. '+error.message);button.disabled=false;}
  };
  return dialog;
}
