/* ===== core_woff2: WOFF2 (W3C REC) + собственный сжиматель Brotli (RFC 7932) =====
   Сжиматель: LZ77 (хеш-цепочки по 4 байтам, ленивое сопоставление) + один мета-блок с одним набором префиксных кодов (без контекстов и блок-типов), окно 2^22.
   Файл — обычный поток Brotli, любой декодер (libbrotli, браузер) читает его; степень сжатия ниже, чем у `brotli -q 11`, но выше zlib. Без сети, без WASM, ~6 КБ кода.
   WOFF2: таблицы пишутся в порядке каталога, glyf/loca — с преобразованием (version 0, потоки nContour/nPoints/flag/glyph/bbox/instruction) либо, если оно не подошло, null-transform (version 3). */
const BR_INS=[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,1],[8,1],[10,2],[14,2],[18,3],[26,3],[34,4],[50,4],[66,5],[98,5],[130,6],[194,7],[322,8],[578,9],[1090,10],[2114,12],[6210,14],[22594,24]];
const BR_CPY=[[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,1],[12,1],[14,2],[18,2],[22,3],[30,3],[38,4],[54,4],[70,5],[102,5],[134,6],[198,7],[326,8],[582,9],[1094,10],[2118,24]];
function brCode(T,v){let i=T.length-1;while(T[i][0]>v)i--;return i;}
class BrBits{
  constructor(){this.b=[];this.a=0;this.n=0;}
  w(v,n){while(n>0){const t=Math.min(n,16);this.a|=(v&((1<<t)-1))<<this.n;this.n+=t;v=Math.floor(v/65536);n-=t;while(this.n>=8){this.b.push(this.a&255);this.a>>>=8;this.n-=8;}}}
  fin(){if(this.n>0){this.b.push(this.a&255);this.a=0;this.n=0;}return this.b;}
}
/* длины кодов Хаффмана (≤lim) по частотам; nonzero symbols only */
function brLens(freq,lim){
  const n=freq.length,used=[];for(let i=0;i<n;i++)if(freq[i]>0)used.push(i);
  const L=new Uint8Array(n);if(used.length===0)return L;if(used.length===1){L[used[0]]=1;return L;}
  for(let floor=1;;floor*=2){
    const nodes=used.map(s=>({w:Math.max(freq[s],floor),s,l:null,r:null}));
    const q=nodes.slice().sort((a,b)=>a.w-b.w||a.s-b.s),q2=[];let i=0,j=0;
    const pop=()=>(j>=q2.length||(i<q.length&&q[i].w<=q2[j].w))?q[i++]:q2[j++];
    while((q.length-i)+(q2.length-j)>1){const a=pop(),b=pop();q2.push({w:a.w+b.w,s:-1,l:a,r:b});}
    const root=pop(),stack=[[root,0]];let mx=0;
    while(stack.length){const [nd,d]=stack.pop();if(nd.l){stack.push([nd.l,d+1],[nd.r,d+1]);}else{L[nd.s]=d;if(d>mx)mx=d;}}
    if(mx<=lim)return L;
  }
}
function brCodes(L){ /* канонические коды, биты развёрнуты под запись младшим битом вперёд */
  const n=L.length,cnt=new Array(17).fill(0);for(let i=0;i<n;i++)cnt[L[i]]++;cnt[0]=0;
  const nx=new Array(17).fill(0);let c=0;for(let l=1;l<=16;l++){c=(c+cnt[l-1])<<1;nx[l]=c;}
  const C=new Uint32Array(n);
  for(let i=0;i<n;i++){const l=L[i];if(l){let v=nx[l]++,r=0;for(let k=0;k<l;k++){r=(r<<1)|(v&1);v>>=1;}C[i]=r;}}
  return C;
}
const BR_CLO=[1,2,3,4,0,5,17,6,16,7,8,9,10,11,12,13,14,15],BR_CLW=[[0,2],[7,4],[3,3],[2,2],[1,2],[15,4]];
function brWriteCode(bw,L,asize){
  const used=[];for(let i=0;i<L.length;i++)if(L[i])used.push(i);
  const abits=Math.max(1,Math.ceil(Math.log2(asize)));
  if(used.length<=1){bw.w(1,2);bw.w(0,2);bw.w(used[0]||0,abits);return;} /* простой код из одного знака: 0 бит на знак */
  /* последовательность символов длин (0..15, 17 = серия нулей) до последнего ненулевого */
  let last=used[used.length-1];const seq=[];
  for(let i=0;i<=last;){
    if(L[i]!==0){seq.push([L[i],0,0]);i++;continue;}
    let r=0;while(i+r<=last&&L[i+r]===0)r++;
    if(r<3){for(let k=0;k<r;k++)seq.push([0,0,0]);i+=r;continue;}
    while(r>=3){const k=Math.min(r,10);seq.push([17,3,k-3]);i+=k;r-=k;if(r>0){seq.push([0,0,0]);i++;r--;}}
    while(r>0){seq.push([0,0,0]);i++;r--;}
  }
  const cf=new Array(18).fill(0);for(const s of seq)cf[s[0]]++;
  const cl=brLens(cf,5),nz=cl.reduce((a,v)=>a+(v?1:0),0);
  bw.w(0,2);
  let space=0;
  for(let k=0;k<18;k++){const l=cl[BR_CLO[k]];const e=BR_CLW[l>0&&nz===1?1:l];bw.w(e[0],e[1]);if(l){space+=32>>l;if(space>=32&&nz>1)break;}}
  const cc=brCodes(cl);
  for(const s of seq){if(nz>1)bw.w(cc[s[0]],cl[s[0]]);if(s[1])bw.w(s[2],s[1]);}
}
function brotliEncode(src){
  const n=src.length,WB=n+16>(1<<22)?24:22,maxD=(1<<WB)-16;
  const bw=new BrBits();
  bw.w(1,1);bw.w(WB-17,3);
  if(n===0){bw.w(1,1);bw.w(1,1);return new Uint8Array(bw.fin());}
  /* LZ77 */
  const HB=17,head=new Int32Array(1<<HB).fill(-1),prev=new Int32Array(n).fill(-1);
  const hash=i=>(Math.imul((src[i]|(src[i+1]<<8)|(src[i+2]<<16)|(src[i+3]<<24)),0x1E35A7BD)>>>(32-HB));
  let ip=0;const adv=u=>{while(ip<u){if(ip+4<=n){const h=hash(ip);prev[ip]=head[h];head[h]=ip;}ip++;}};
  const find=(i)=>{let bl=0,bd=0;if(i+4>n)return [0,0];let c=head[hash(i)],d=0;const lim=Math.min(n-i,1<<16);
    while(c>=0&&d++<40){const dist=i-c;if(dist>maxD)break;
      if(src[c+bl]===src[i+bl]){let l=0;while(l<lim&&src[c+l]===src[i+l])l++;if(l>bl&&l>=4){bl=l;bd=dist;if(l>=lim)break;}}
      c=prev[c];}
    return [bl,bd];};
  const cmds=[];let litStart=0,i=0;
  while(i<n){
    adv(i);let [l,d]=find(i);
    if(l>=4&&i+1<n){adv(i+1);const l2=find(i+1)[0];if(l2>l+1)l=0;} /* ленивое сопоставление: на байт позже длиннее */
    if(l>=4){cmds.push({ins:i-litStart,start:litStart,len:l,dist:d});i+=l;litStart=i;}else i++;
  }
  const tail=n-litStart;
  /* частоты */
  const lf=new Array(256).fill(0),cf=new Array(704).fill(0),df=new Array(64).fill(0);
  const sym=(ic,cc)=>{const ib=ic>>3,cb=cc>>3,blk=[[2,3,6],[4,5,8],[7,9,10]][ib][cb];return blk*64+(ic&7)*8+(cc&7);};
  for(const c of cmds){
    c.ic=brCode(BR_INS,c.ins);c.cc=brCode(BR_CPY,c.len);c.sy=sym(c.ic,c.cc);cf[c.sy]++;
    for(let k=c.start;k<c.start+c.ins;k++)lf[src[k]]++;
    const dp=c.dist+3,nb=31-Math.clz32(dp)-1,hc=(dp>>nb)&1;c.dc=16+2*(nb-1)+hc;c.dn=nb;c.dx=dp&((1<<nb)-1);df[c.dc]++;
  }
  for(let k=litStart;k<n;k++)lf[src[k]]++;
  const tic=brCode(BR_INS,tail),tsy=sym(tic,0);if(tail>0)cf[tsy]++;
  /* заголовок мета-блока */
  const nib=(n-1)<65536?4:(n-1)<1048576?5:6;
  bw.w(1,1);bw.w(0,1);bw.w(nib-4,2);bw.w(n-1,nib*4);
  bw.w(0,1);bw.w(0,1);bw.w(0,1);bw.w(0,2);bw.w(0,4);bw.w(0,2);bw.w(0,1);bw.w(0,1);
  const LL=brLens(lf,15),CL=brLens(cf,15),DL=brLens(df,15);
  brWriteCode(bw,LL,256);brWriteCode(bw,CL,704);brWriteCode(bw,DL,64);
  const LC=brCodes(LL),CC=brCodes(CL),DC=brCodes(DL);
  const lone=a=>a.filter(v=>v).length<=1;
  const wl=b=>{if(!lone(LL))bw.w(LC[b],LL[b]);},wc=s=>{if(!lone(CL))bw.w(CC[s],CL[s]);},wd=s=>{if(!lone(DL))bw.w(DC[s],DL[s]);};
  for(const c of cmds){
    wc(c.sy);
    const ie=BR_INS[c.ic],ce=BR_CPY[c.cc];
    if(ie[1])bw.w(c.ins-ie[0],ie[1]);if(ce[1])bw.w(c.len-ce[0],ce[1]);
    for(let k=c.start;k<c.start+c.ins;k++)wl(src[k]);
    wd(c.dc);if(c.dn)bw.w(c.dx,c.dn);
  }
  if(tail>0){wc(tsy);const ie=BR_INS[tic];if(ie[1])bw.w(tail-ie[0],ie[1]);}
  for(let k=litStart;k<n;k++)wl(src[k]);
  return new Uint8Array(bw.fin());
}
/* ---------- WOFF2 ---------- */
const W2_TAGS=['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill'];
function w2Base128(o,v){const t=[];do{t.push(v&127);v=Math.floor(v/128);}while(v>0);for(let i=t.length-1;i>=0;i--)o.push(t[i]|(i?128:0));}
function w2U255(o,v){if(v<253)o.push(v);else if(v<506)o.push(255,v-253);else if(v<762)o.push(254,v-506);else o.push(253,(v>>8)&255,v&255);}
/* глиф-триплеты: (dx,dy,onCurve) -> байт флага + 0…4 байта данных */
function w2Triplet(fl,gl,dx,dy,on){
  const ax=Math.abs(dx),ay=Math.abs(dy),oc=on?0:128,sb=(dx<0?0:1)+(dy<0?0:2);
  if(dx===0&&ay<1280){fl.push(oc+((ay>>8)<<1)+(dy>0?1:0));gl.push(ay&255);}
  else if(dy===0&&ax<1280){fl.push(oc+10+((ax>>8)<<1)+(dx>0?1:0));gl.push(ax&255);}
  else if(ax>0&&ax<65&&ay>0&&ay<65){fl.push(oc+20+(((ax-1)>>4)<<4)+(((ay-1)>>4)<<2)+sb);gl.push((((ax-1)&15)<<4)|((ay-1)&15));}
  else if(ax>0&&ax<769&&ay>0&&ay<769){fl.push(oc+84+12*((ax-1)>>8)+4*((ay-1)>>8)+sb);gl.push((ax-1)&255,(ay-1)&255);}
  else if(ax<4096&&ay<4096){fl.push(oc+120+sb);gl.push(ax>>4,((ax&15)<<4)|(ay>>8),ay&255);}
  else{fl.push(oc+124+sb);gl.push(ax>>8,ax&255,ay>>8,ay&255);}
}
/* преобразование glyf (spec §5.1); null, если глиф составной или данные нестандартны */
function w2Glyf(glyf,loca,ng){
  const dv=new DataView(glyf.buffer,glyf.byteOffset,glyf.byteLength),lv=new DataView(loca.buffer,loca.byteOffset,loca.byteLength);
  if(loca.length!==(ng+1)*4)return null;
  const nC=[],nP=[],fl=[],gs=[],ins=[],bb=[];
  for(let g=0;g<ng;g++){
    const a=lv.getUint32(g*4),b=lv.getUint32(g*4+4);
    if(b===a){nC.push(0,0);continue;}
    const nc=dv.getInt16(a);if(nc<=0)return null;
    nC.push((nc>>8)&255,nc&255);
    let p=a+10;const ends=[];for(let k=0;k<nc;k++){ends.push(dv.getUint16(p));p+=2;}
    const np=ends[nc-1]+1,il=dv.getUint16(p);p+=2;if(il!==0)return null;
    let pr=-1;for(const e of ends){w2U255(nP,e-pr);pr=e;}
    const flags=[];for(let k=0;k<np;k++)flags.push(dv.getUint8(p++));
    const xs=[],ys=[];let x=0,y=0;
    for(let k=0;k<np;k++){if(flags[k]&0x3E)return null;x+=dv.getInt16(p);p+=2;xs.push(x);}
    for(let k=0;k<np;k++){y+=dv.getInt16(p);p+=2;ys.push(y);}
    let px=0,py=0;
    for(let k=0;k<np;k++){w2Triplet(fl,gs,xs[k]-px,ys[k]-py,!!(flags[k]&1));px=xs[k];py=ys[k];}
    w2U255(gs,0);
    /* габарит glyf должен совпасть с габаритом точек, иначе пришлось бы хранить его явно (не поддержано) */
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    if(dv.getInt16(a+2)!==x0||dv.getInt16(a+4)!==y0||dv.getInt16(a+6)!==x1||dv.getInt16(a+8)!==y1)return null;
  }
  const bmp=new Array(Math.ceil(ng/32)*4).fill(0);
  const o=[0,0,0,0,(ng>>8)&255,ng&255,0,1];
  const u32=v=>o.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255);
  u32(nC.length);u32(nP.length);u32(fl.length);u32(gs.length);u32(0);u32(bmp.length);u32(0);
  for(const s of [nC,nP,fl,gs,bmp])for(let i=0;i<s.length;i++)o.push(s[i]);
  return new Uint8Array(o);
}
async function buildWOFF2(sfnt,opts){
  sfnt=sfnt instanceof Uint8Array?sfnt:new Uint8Array(sfnt);opts=opts||{};
  const r16=o=>(sfnt[o]<<8)|sfnt[o+1],r32=o=>((sfnt[o]<<24)|(sfnt[o+1]<<16)|(sfnt[o+2]<<8)|sfnt[o+3])>>>0;
  const flavor=r32(0),nt=r16(4);let tabs=[];
  for(let i=0;i<nt;i++){const o=12+i*16;const t={tag:String.fromCharCode(sfnt[o],sfnt[o+1],sfnt[o+2],sfnt[o+3]),off:r32(o+8),len:r32(o+12)};t.data=sfnt.subarray(t.off,t.off+t.len);tabs.push(t);}
  tabs.sort((a,b)=>a.tag<b.tag?-1:a.tag>b.tag?1:0);
  let sfntSize=12+16*nt;for(const t of tabs)sfntSize+=(t.len+3)&~3;
  const G=tabs.find(t=>t.tag==='glyf'),Lc=tabs.find(t=>t.tag==='loca'),H=tabs.find(t=>t.tag==='head'),M=tabs.find(t=>t.tag==='maxp');
  let tg=null;
  if(G&&Lc&&H&&M&&opts.glyfTransform!==false){tg=w2Glyf(G.data,Lc.data,(M.data[4]<<8)|M.data[5]);}
  if(tg){ /* head.flags бит 11: данные преобразованы без потерь; loca идёт сразу за glyf */
    const hd=new Uint8Array(H.data);hd[17]|=0x08;H.data=hd;
    tabs=tabs.filter(t=>t!==Lc);tabs.splice(tabs.indexOf(G)+1,0,Lc);
    G.xf=tg;Lc.xf=new Uint8Array(0);
  }
  const dir=[],body=[];
  for(const t of tabs){
    const ki=W2_TAGS.indexOf(t.tag),isGL=t.tag==='glyf'||t.tag==='loca';
    const ver=isGL?(t.xf?0:3):0;
    dir.push((ki<0?63:ki)|(ver<<6));if(ki<0){for(let k=0;k<4;k++)dir.push(t.tag.charCodeAt(k));}
    w2Base128(dir,t.len);if(t.xf)w2Base128(dir,t.xf.length);
    body.push(t.xf||t.data);
  }
  let tot=0;for(const b of body)tot+=b.length;
  const raw=new Uint8Array(tot);let p=0;for(const b of body){raw.set(b,p);p+=b.length;}
  const comp=(opts.brotli||brotliEncode)(raw);
  const total=(48+dir.length+comp.length+3)&~3,out=new Uint8Array(total),dv=new DataView(out.buffer);
  out.set([0x77,0x4F,0x46,0x32],0);dv.setUint32(4,flavor);dv.setUint32(8,total);dv.setUint16(12,nt);dv.setUint32(16,sfntSize);dv.setUint32(20,comp.length);dv.setUint16(24,1);dv.setUint16(26,0);
  out.set(dir,48);out.set(comp,48+dir.length);
  return out;
}
