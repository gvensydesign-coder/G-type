/* ===== core_otf: CFF (Type 2) для экспорта .otf — кубические контуры берутся из движка как есть, без перевода в квадратичные =====
   buildTTF(…,{cff:true}) (core3b) собирает глифы тем же путём, что и TTF (те же hmtx, cmap, name, OS/2, GSUB/GPOS), но вместо glyf/loca пишет таблицу 'CFF ',
   maxp 0.5, post 3 и версию sfnt 'OTTO'. Подпрограммы (subr) не используются: файл чуть больше, зато проще и надёжнее.
   Направление контуров: в CFF внешний контур идёт против часовой стрелки (в движке так же; для glyf контур разворачивается). */
function contourToCFF(c){
  const ns=c.nodes,n=ns.length;if(n<2)return null;
  const R=Math.round,start=[R(ns[0].x),R(ns[0].y)],segs=[],pts=[{x:start[0],y:start[1]}];
  let cx=start[0],cy=start[1];
  const line=(x,y)=>{if(x===cx&&y===cy)return;segs.push({k:'l',x,y});cx=x;cy=y;pts.push({x,y});};
  for(let i=0;i<n;i++){
    const a=ns[i],b=ns[(i+1)%n],ex=i===n-1?start[0]:R(b.x),ey=i===n-1?start[1]:R(b.y);
    if(near(a.b,a)&&near(b.a,b)){line(ex,ey);continue;}
    const P=segPts(a,b),ts=cubicExtremaT(P),cuts=[0,...ts,1],E=[];
    for(let m=1;m<cuts.length-1;m++){const q=blossom(P,cuts[m],cuts[m],cuts[m]);E.push([R(q[0]),R(q[1])]);}
    E.push([ex,ey]);
    for(let m=0;m<cuts.length-1;m++){
      const Q=ts.length?cubicPiece(P,cuts[m],cuts[m+1]):P,x3=E[m][0],y3=E[m][1],x1=R(Q[1][0]),y1=R(Q[1][1]),x2=R(Q[2][0]),y2=R(Q[2][1]);
      if(x1===cx&&y1===cy&&x2===x3&&y2===y3){line(x3,y3);continue;}
      if(x3===cx&&y3===cy&&x1===cx&&y1===cy&&x2===cx&&y2===cy)continue;
      segs.push({k:'c',x1,y1,x2,y2,x:x3,y:y3});cx=x3;cy=y3;pts.push({x:x3,y:y3});}
  }
  /* замыкающая прямая в начало не пишется: контур закрывается сам */
  const l=segs[segs.length-1];if(l&&l.k==='l'&&l.x===start[0]&&l.y===start[1]){segs.pop();pts.pop();}
  if(segs.length<2)return null;
  return {start,segs,pts,end:segs.length?[segs[segs.length-1].x,segs[segs.length-1].y]:start};
}
/* Type 2: число */
function t2num(o,v){
  v=Math.round(v);
  if(v>=-107&&v<=107)o.push(v+139);
  else if(v>=108&&v<=1131){v-=108;o.push(247+(v>>8),v&255);}
  else if(v>=-1131&&v<=-108){v=-v-108;o.push(251+(v>>8),v&255);}
  else{v=Math.max(-32768,Math.min(32767,v));o.push(28,(v>>8)&255,v&255);}
}
function t2op(o,args,op){for(const a of args)t2num(o,a);o.push(op);}
/* один глиф -> байты Type 2 charstring; wArg = [] или [ширина − nominalWidthX] */
function t2glyph(conts,wArg){
  const o=[];let pw=wArg.slice(),px=0,py=0;
  const take=()=>{const w=pw;pw=[];return w;};
  for(const c of conts){
    const dx=c.start[0]-px,dy=c.start[1]-py;
    if(dy===0)t2op(o,take().concat([dx]),22);else if(dx===0)t2op(o,take().concat([dy]),4);else t2op(o,take().concat([dx,dy]),21);
    let cx=c.start[0],cy=c.start[1];
    const S=c.segs,D=[];
    for(const s of S){if(s.k==='l'){D.push({k:'l',dx:s.x-cx,dy:s.y-cy});}else D.push({k:'c',a:[s.x1-cx,s.y1-cy,s.x2-s.x1,s.y2-s.y1,s.x-s.x2,s.y-s.y2]});cx=s.x;cy=s.y;}
    const isH=d=>d.k==='l'&&d.dy===0,isV=d=>d.k==='l'&&d.dx===0;
    const hv=d=>d.k==='c'&&d.a[1]===0&&d.a[4]===0,vh=d=>d.k==='c'&&d.a[0]===0&&d.a[5]===0;
    let i=0;
    while(i<D.length){
      const d=D[i];
      if(d.k==='l'){
        if(isH(d)||isV(d)){ /* цепочка прямых по осям, чередующихся h/v */
          const first=isH(d)?'h':'v',args=[];let j=i,t=first;
          while(j<D.length&&args.length<48&&(t==='h'?isH(D[j]):isV(D[j]))){args.push(t==='h'?D[j].dx:D[j].dy);t=t==='h'?'v':'h';j++;}
          t2op(o,args,first==='h'?6:7);i=j;
        }else{const args=[];let j=i;while(j<D.length&&args.length<48&&D[j].k==='l'&&!isH(D[j])&&!isV(D[j])){args.push(D[j].dx,D[j].dy);j++;}t2op(o,args,5);i=j;}
      }else if(hv(d)||vh(d)){
        let t=hv(d)?'hv':'vh';const first=t,args=[];let j=i;
        while(j<D.length&&args.length<=44&&(t==='hv'?hv(D[j]):vh(D[j]))){const a=D[j].a;args.push(...(t==='hv'?[a[0],a[2],a[3],a[5]]:[a[1],a[2],a[3],a[4]]));t=t==='hv'?'vh':'hv';j++;}
        t2op(o,args,first==='hv'?31:30);i=j;
      }else{const args=[];let j=i;while(j<D.length&&args.length<=42&&D[j].k==='c'&&!hv(D[j])&&!vh(D[j])){args.push(...D[j].a);j++;}t2op(o,args,8);i=j;}
    }
    px=cx;py=cy;
  }
  t2op(o,take(),14);
  return o;
}
function cffIndex(items){ /* INDEX: count, offSize, offsets, data */
  const n=items.length;if(!n)return [0,0];
  let tot=1;for(const it of items)tot+=it.length;
  const os=tot<256?1:tot<65536?2:tot<16777216?3:4,o=[(n>>8)&255,n&255,os];
  const put=v=>{for(let k=os-1;k>=0;k--)o.push((v>>>(8*k))&255);};
  let p=1;put(p);for(const it of items){p+=it.length;put(p);}
  for(const it of items)for(let k=0;k<it.length;k++)o.push(it[k]);
  return o;
}
function cffInt5(o,v){v=v|0;o.push(29,(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255);}
function cffInt(o,v){
  if(v>=-107&&v<=107)o.push(v+139);else if(v>=108&&v<=1131){v-=108;o.push(247+(v>>8),v&255);}else if(v>=-1131&&v<=-108){v=-v-108;o.push(251+(v>>8),v&255);}
  else if(v>=-32768&&v<=32767)o.push(28,(v>>8)&255,v&255);else cffInt5(o,v);
}
/* таблица CFF: Name, Top DICT, String, Global Subr INDEX, charset (формат 2: имена идут подряд), CharStrings, Private DICT */
function buildCFF(glyphs,cffAll,psName,bbox){
  const ng=glyphs.length,cnt={};
  for(const g of glyphs)cnt[g.adv]=(cnt[g.adv]||0)+1;
  let defW=0,best=-1;for(const k in cnt)if(cnt[k]>best||(cnt[k]===best&&+k<defW)){best=cnt[k];defW=+k;}
  const nomW=Math.round(glyphs.reduce((a,g)=>a+g.adv,0)/ng);
  const css=glyphs.map((g,i)=>t2glyph(cffAll[i],g.adv===defW?[]:[g.adv-nomW]));
  const nameB=[...psName].map(c=>c.charCodeAt(0)&127),strs=[];
  for(let i=1;i<ng;i++){const nm=glyphs[i].name.replace(/[^\x21-\x7e]/g,'_').slice(0,63);strs.push([...nm].map(c=>c.charCodeAt(0)));}
  const nameIdx=cffIndex([nameB]),strIdx=cffIndex(strs),gsub=[0,0];
  const priv=[];cffInt(priv,defW);priv.push(20);cffInt(priv,nomW);priv.push(21);
  const charset=ng>1?[2,(391>>8)&255,391&255,((ng-2)>>8)&255,(ng-2)&255]:[0];
  const csIdx=cffIndex(css);
  const top=(cs,ch,pv)=>{const o=[];for(const v of bbox)cffInt5(o,v);o.push(5);cffInt5(o,ch);o.push(15);cffInt5(o,cs);o.push(17);cffInt5(o,priv.length);cffInt5(o,pv);o.push(18);return o;};
  const topLen=cffIndex([top(0,0,0)]).length,hdr=[1,0,4,4];
  const offCh=hdr.length+nameIdx.length+topLen+strIdx.length+gsub.length,offCs=offCh+charset.length,offPv=offCs+csIdx.length;
  const out=[].concat(hdr,nameIdx,cffIndex([top(offCs,offCh,offPv)]),strIdx,gsub,charset,csIdx,priv);
  return new Uint8Array(out);
}
/* buildTTF: заменяет glyf/loca на CFF, maxp 0.5, post 3, head.indexToLocFormat = 0 */
function cffTablesSwap(tables,c){
  const g=c.glyphs;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const L of c.cffAll)for(const k of L)for(const p of k.pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  if(x0>1e8)x0=y0=x1=y1=0;
  delete tables.glyf;delete tables.loca;
  tables['CFF ']=buildCFF(g,c.cffAll,c.psName,[x0,y0,x1,y1]);
  const mp=new BW();mp.u32(0x00005000).u16(c.ng);tables.maxp=mp.b;
  const po=new BW();po.b.push(...tables.post.slice(0,32));po.b[0]=0;po.b[1]=3;po.b[2]=0;po.b[3]=0;tables.post=po.b;
  const hd=tables.head.slice();hd[50]=0;hd[51]=0;tables.head=hd;
}
