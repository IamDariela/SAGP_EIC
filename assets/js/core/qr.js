/** QR Model 2, version 4-L, byte encoding, mask 0. No services, libraries or personal data. */
export const qrToken=(type,id)=>`SAGP:${type}:${id}`;
export function parseQr(value) {
  const match=String(value).trim().match(/^SAGP:(location|enrollment):([A-Za-z0-9_-]{1,64})$/);
  if(!match)throw new Error('El código no corresponde a un espacio o participación de SAGP.');
  return {type:match[1],id:match[2]};
}
const multiply=(a,b)=>{let result=0;while(b){if(b&1)result^=a;b>>=1;a<<=1;if(a&256)a^=0x11d;}return result;};
function parity(data,degree) {
  let generator=[1],root=1;
  for(let i=0;i<degree;i++) {const next=Array(generator.length+1).fill(0);generator.forEach((c,j)=>{next[j]^=c;next[j+1]^=multiply(c,root);});generator=next;root=multiply(root,2);}
  const remainder=Array(degree).fill(0);
  for(const value of data){const factor=value^remainder.shift();remainder.push(0);remainder.forEach((_,j)=>{remainder[j]^=multiply(generator[j+1],factor);});}
  return remainder;
}
export function qrMatrix(value) {
  const bytes=[...new TextEncoder().encode(value)];if(bytes.length>78)throw new Error('El código es demasiado largo.');
  const bits=[],push=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1);};
  push(4,4);push(bytes.length,8);bytes.forEach(b=>push(b,8));push(0,Math.min(4,640-bits.length));while(bits.length%8)bits.push(0);
  const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((v,b)=>v*2+b,0));
  for(let i=0;data.length<80;i++)data.push(i%2?0x11:0xec);
  const stream=[...data,...parity(data,20)].flatMap(b=>Array.from({length:8},(_,i)=>(b>>>(7-i))&1));
  const size=33,grid=Array.from({length:size},()=>Array(size).fill(false)),reserved=Array.from({length:size},()=>Array(size).fill(false));
  const set=(x,y,v)=>{if(x>=0 && y>=0 && x<size && y<size){grid[y][x]=Boolean(v);reserved[y][x]=true;}};
  for(const [x,y] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const distance=Math.max(Math.abs(dx),Math.abs(dy));set(x+dx,y+dy,distance!==2 && distance!==4);}
  for(let i=8;i<size-8;i++){set(i,6,i%2===0);set(6,i,i%2===0);}
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(26+dx,26+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
  const format=()=>{
    const value=8;let remainder=value;
    for(let i=0;i<10;i++)remainder=(remainder<<1)^((remainder>>>9)*0x537);
    const code=((value<<10)|remainder)^0x5412,bit=i=>(code>>>i)&1;
    for(let i=0;i<=5;i++)set(8,i,bit(i));set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));
    for(let i=9;i<15;i++)set(14-i,8,bit(i));
    for(let i=0;i<8;i++)set(size-1-i,8,bit(i));
    for(let i=8;i<15;i++)set(8,size-15+i,bit(i));set(8,size-8,true);
  };
  format();let index=0;
  for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vertical=0;vertical<size;vertical++){const up=((right+1)&2)===0,y=up?size-1-vertical:vertical;for(let j=0;j<2;j++){const x=right-j;if(!reserved[y][x])grid[y][x]=Boolean((stream[index++] || 0)^((x+y)%2===0?1:0));}}}
  return grid;
}
export function qrSvg(value) {
  const matrix=qrMatrix(value),path=[];matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)path.push(`M${x+4},${y+4}h1v1h-1z`);}));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41" role="img" aria-label="Código QR SAGP" class="qr-image"><rect width="41" height="41" fill="white"/><path d="${path.join('')}" fill="black"/></svg>`;
}
