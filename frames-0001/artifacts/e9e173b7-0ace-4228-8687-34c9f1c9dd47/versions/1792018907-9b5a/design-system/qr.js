/* Минимальный генератор QR (byte mode, ECC L, версии 1–5, одна ECC-группа). Проверен декодером OpenCV. */
function qrMatrix(text){
  const bytes=[...new TextEncoder().encode(text)];
  const CAP=[0,19,34,55,80,108],TOTAL=[0,26,44,70,100,134],EC=[0,7,10,15,20,26];
  let ver=1;while(ver<5&&bytes.length>CAP[ver]-2)ver++;
  if(bytes.length>CAP[ver]-2)throw new Error('qr: text too long');
  const size=17+4*ver,dataCap=CAP[ver];
  const bits=[];const put=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
  put(4,4);put(bytes.length,8);bytes.forEach(b=>put(b,8));
  put(0,Math.min(4,dataCap*8-bits.length));while(bits.length%8)bits.push(0);
  const data=[];for(let i=0;i<bits.length;i+=8){let v=0;for(let j=0;j<8;j++)v=v<<1|bits[i+j];data.push(v)}
  for(let pad=0xEC;data.length<dataCap;pad^=0xEC^0x11)data.push(pad);
  const exp=new Array(512),log=new Array(256);let x=1;for(let i=0;i<255;i++){exp[i]=x;log[x]=i;x<<=1;if(x&256)x^=0x11D}for(let i=255;i<512;i++)exp[i]=exp[i-255];
  const mul=(a,b)=>a&&b?exp[log[a]+log[b]]:0;
  let gen=[1];for(let i=0;i<EC[ver];i++){const next=new Array(gen.length+1).fill(0);gen.forEach((c,j)=>{next[j]^=c;next[j+1]^=mul(c,exp[i])});gen=next}
  const rem=new Array(EC[ver]).fill(0);data.forEach(d=>{const f=d^rem.shift();rem.push(0);gen.slice(1).forEach((g,i)=>{rem[i]^=mul(g,f)})});
  const words=data.concat(rem);if(words.length!==TOTAL[ver])throw new Error('qr: size');
  const m=Array.from({length:size},()=>new Array(size).fill(false)),fn=Array.from({length:size},()=>new Array(size).fill(false));
  const set=(px,py,dark)=>{m[py][px]=dark;fn[py][px]=true};
  for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const px=cx+dx,py=cy+dy;if(px<0||py<0||px>=size||py>=size)continue;const d=Math.max(Math.abs(dx),Math.abs(dy));set(px,py,d!==2&&d!==4)}
  if(ver>1){const c=size-7;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(c+dx,c+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
  const drawFormat=mask=>{const d=1<<3|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const f=(d<<10|r)^0x5412,b=i=>((f>>>i)&1)!==0;
    for(let i=0;i<=5;i++)set(8,i,b(i));set(8,7,b(6));set(8,8,b(7));set(7,8,b(8));for(let i=9;i<15;i++)set(14-i,8,b(i));
    for(let i=0;i<8;i++)set(size-1-i,8,b(i));for(let i=8;i<15;i++)set(8,size-15+i,b(i));set(8,size-8,true)};
  drawFormat(0);
  const bitsAll=[];words.forEach(w=>{for(let i=7;i>=0;i--)bitsAll.push((w>>>i)&1)});
  let k=0;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){const px=right-j,up=((right+1)&2)===0,py=up?size-1-vert:vert;if(!fn[py][px]&&k<bitsAll.length){m[py][px]=bitsAll[k]===1;k++}}}
  const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const penalty=g=>{let p=0;for(let a=0;a<size;a++)for(const horiz of [true,false]){let run=1;for(let b=1;b<size;b++){const cur=horiz?g[a][b]:g[b][a],prev=horiz?g[a][b-1]:g[b-1][a];if(cur===prev){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
    for(let y=0;y<size-1;y++)for(let x2=0;x2<size-1;x2++){const c=g[y][x2];if(c===g[y][x2+1]&&c===g[y+1][x2]&&c===g[y+1][x2+1])p+=3}
    let dark=0;g.forEach(r=>r.forEach(c=>{if(c)dark++}));p+=Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10;return p};
  let best=null,bestMask=0;
  for(let mk=0;mk<8;mk++){const g=m.map(r=>r.slice());for(let y=0;y<size;y++)for(let x2=0;x2<size;x2++)if(!fn[y][x2]&&MASKS[mk](x2,y))g[y][x2]=!g[y][x2];const p=penalty(g);if(best===null||p<best.p){best={p,g};bestMask=mk}}
  drawFormat(bestMask);const out=best.g.map(r=>r.slice());
  // формат-биты нужно перенести в итоговую матрицу
  for(let y=0;y<size;y++)for(let x2=0;x2<size;x2++)if(fn[y][x2])out[y][x2]=m[y][x2];
  return out;
}
function qrSvg(text,{dark='#17191B',light='#FFFFFF',quiet=2,label=''}={}){
  const g=qrMatrix(text),n=g.length,t=n+quiet*2;let path='';
  g.forEach((r,y)=>r.forEach((c,x)=>{if(c)path+=`M${x+quiet} ${y+quiet}h1v1h-1z`}));
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect width="${t}" height="${t}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
