/** Minimal XLSX (values only) and CSV reader/writer. No dependency or remote upload. */
const encoder=new TextEncoder(),decoder=new TextDecoder();
const xmlEscape=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const unescape=value=>value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,key)=>key[0]==='#'?String.fromCodePoint(key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[key.toLowerCase()]);
const column=index=>{let value='';for(index++;index;index=Math.floor((index-1)/26))value=String.fromCharCode(65+(index-1)%26)+value;return value;};
const indexOfColumn=value=>[...value].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
const crc32=bytes=>{let crc=-1;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^-1)>>>0;};
export function writeZip(files) {
  const local=[],central=[];let offset=0;
  const header=(size,fields)=>{const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);for(const [position,value,length] of fields)length===2?view.setUint16(position,value,true):view.setUint32(position,value,true);return bytes;};
  for(const [path,content] of Object.entries(files)) {
    const name=encoder.encode(path),data=encoder.encode(content),crc=crc32(data);
    const entry=header(30,[[0,0x04034b50,4],[4,20,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]]);
    local.push(entry,name,data);
    central.push(header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,offset,4]]),name);offset+=entry.length+name.length+data.length;
  }
  const size=central.reduce((n,b)=>n+b.length,0),count=Object.keys(files).length;
  const end=header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,size,4],[16,offset,4]]);
  const result=new Uint8Array(offset+size+22);let pos=0;for(const bytes of [...local,...central,end]){result.set(bytes,pos);pos+=bytes.length;}return result;
}
export function writeXlsx(headers,rows=[]) {
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  return writeZip({
    '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':`<?xml version="1.0"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Plantilla SAGP" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':`<?xml version="1.0"?><worksheet xmlns="${ns}"><sheetData>${[headers,...rows].map((row,y)=>`<row r="${y+1}">${row.map((value,x)=>`<c r="${column(x)}${y+1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`
  });
}
export async function readZip(buffer) {
  const bytes=new Uint8Array(buffer),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
  if(bytes.length>10000000)throw new Error('El archivo supera 10 MB.');
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('El archivo no es un XLSX válido.');
  const count=view.getUint16(end+10,true);if(count>200 || view.getUint16(end+4,true)!==0)throw new Error('El archivo tiene una estructura no admitida.');
  const files={};let offset=view.getUint32(end+16,true),total=0;
  for(let i=0;i<count;i++) {
    if(offset+46>bytes.length || view.getUint32(offset,true)!==0x02014b50)throw new Error('XLSX incompleto.');
    const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true),nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
    if(local+30>bytes.length || view.getUint32(local,true)!==0x04034b50)throw new Error('Entrada XLSX inválida.');
    const name=decoder.decode(bytes.slice(offset+46,offset+46+nameLength)),start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);total+=size;
    if(flags&1 || total>12000000 || start+compressed>bytes.length || ![0,8].includes(method))throw new Error('Archivo protegido, demasiado grande o con compresión no admitida.');
    let payload=bytes.slice(start,start+compressed);
    if(method===8) {
      let decompress;try{decompress=new DecompressionStream('deflate-raw');}catch{throw new Error('Este navegador no puede leer este XLSX comprimido. Utiliza la plantilla descargada o guarda como CSV.');}
      const reader=new Blob([payload]).stream().pipeThrough(decompress).getReader(),parts=[];let length=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>size || length>12000000){await reader.cancel();throw new Error('Archivo comprimido demasiado grande.');}parts.push(value);}}finally{reader.releaseLock();}
      payload=new Uint8Array(length);let at=0;for(const part of parts){payload.set(part,at);at+=part.length;}
    }
    if(payload.length!==size || crc32(payload)!==view.getUint32(offset+16,true))throw new Error('El XLSX tiene una entrada dañada.');
    files[name]=decoder.decode(payload);offset+=46+nameLength+extra+comment;
  }
  return files;
}
function texts(xml) {return [...xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>unescape(m[1])).join('');}
export function parseSheet(xml,shared=[]) {
  if(!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Hoja de cálculo inválida.');
  const rows=[];
  for(const match of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const row=[];
    for(const cell of match[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs=cell[1],body=cell[2] || '',ref=attrs.match(/\br="([A-Z]+)\d+"/)?.[1],type=attrs.match(/\bt="([^"]+)"/)?.[1],v=body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] || '';
      if(/<(?:\w+:)?f\b/.test(body))throw new Error('La plantilla debe contener valores, sin fórmulas.');
      const index=ref?indexOfColumn(ref):row.length;if(index>50)throw new Error('La plantilla tiene demasiadas columnas.');
      row[index]=type==='s'?shared[Number(v)] ?? '':type==='inlineStr'?texts(body):unescape(v);
    }
    if(row.some(v=>String(v).trim()))rows.push(row);
    if(rows.length>201)throw new Error('La demo admite hasta 200 registros por importación.');
  }
  return rows;
}
export function parseCsv(source) {
  const text=source.replace(/^\uFEFF/,''),first=text.split(/\r?\n/)[0],separator=first.includes(';')?';':first.includes('\t')?'\t':',';
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"'){if(quoted && text[i+1]==='"'){value+='"';i++;}else if(!quoted && value.length)throw new Error('Comillas CSV inválidas.');else quoted=!quoted;}
    else if(c===separator && !quoted){row.push(value);value='';}
    else if((c==='\n' || c==='\r') && !quoted){if(c==='\r' && text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}
    else value+=c;
  }
  if(quoted)throw new Error('Hay una celda CSV con comillas sin cerrar.');row.push(value);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function rowsToObjects(rows) {
  if(rows.length<2 || rows.length>201)throw new Error('La plantilla debe contener encabezados y entre 1 y 200 registros.');
  const headers=rows[0].map(h=>String(h).trim());
  if(headers.some(h=>!h) || new Set(headers.map(h=>h.toLowerCase())).size!==headers.length)throw new Error('Los encabezados están vacíos o duplicados.');
  return rows.slice(1).map(row=>{if(row.length>headers.length)throw new Error('Hay una fila con columnas adicionales.');return Object.fromEntries(headers.map((h,i)=>[h,row[i] ?? '']));});
}
export async function readSpreadsheet(file) {
  if(file.size>10000000)throw new Error('El archivo supera 10 MB.');
  if(/\.csv$/i.test(file.name))return rowsToObjects(parseCsv(await file.text()));
  if(!/\.xlsx$/i.test(file.name))throw new Error('Selecciona un archivo Excel XLSX o CSV.');
  const files=await readZip(await file.arrayBuffer());
  const workbook=files['xl/workbook.xml'] || '',sheetId=workbook.match(/<(?:\w+:)?sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const relations=files['xl/_rels/workbook.xml.rels'] || '',relation=[...relations.matchAll(/<Relationship\b[^>]*>/g)].find(m=>m[0].includes(`Id="${sheetId}"`))?.[0],target=relation?.match(/\bTarget="([^"]+)"/)?.[1];
  const path=target?(target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'')):'xl/worksheets/sheet1.xml';
  const shared=files['xl/sharedStrings.xml'];if(shared && /<!DOCTYPE|<!ENTITY/i.test(shared))throw new Error('XLSX inválido.');
  const strings=shared?[...shared.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(m=>texts(m[1])):[];
  return rowsToObjects(parseSheet(files[path],strings));
}
