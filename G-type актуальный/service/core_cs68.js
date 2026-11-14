/* ===== CS68: charset gaps (U+00B7 · U+00A9 © U+20BD ₽ @ # % * + = \ | ° •) =====
   Principle: every new glyph is drawn by the font's OWN construction, never by a generic sans:
   - derived glyphs call the font's own base glyphs (the period, О, С, Р, minus, slash …) through GL[ch].shape(makeG(p',w,h)) with a modified
     parameter set p' (smaller size, lighter stem) — so a ring is the font's О, a bar is the font's minus (own ends / grain / liquid), a bowl is its Р;
   - bars are rotated 90 degrees copies of the font's minus (own end style), so + = # * | | follow the stem and hairline weight of the face;
   - the glyphs are normal GL entries (advance from w(p), slant, sidebearings, union, hygiene and kerning all run through finalGlyph as for any letter).
   Registration helper CS68.add puts a glyph into CHARSET and the «Знаки» group of the font (shared GL of Volt/Kvadra is written once). */
const CS68={};
CS68.bb=cs=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const c of cs){if(c.op==='sub')continue;for(const q of flatC(c,10)){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}}return {x0,y0,x1,y1};};
CS68.tr=(cs,dx,dy)=>xf(cs,(x,y)=>[x+dx,y+dy]);
CS68.rot=(cs,cx,cy)=>xf(cs,(x,y)=>[cx-(y-cy),cy+(x-cx)]);          /* 90 degrees counter-clockwise about (cx,cy) */
CS68.hgt=(d,p)=>d.hz?d.hz(p):d.k==='xh'?p.xh:p.capH;
/* the font's own glyph ch drawn in a box of height h (cap or x kind of the glyph) and width w, with stem/hair multiplied by st/ht (default: the vertical scale) */
CS68.sub=(ch,p,o)=>{const d=GL[ch];if(!d)return [];o=o||{};
  const kh=d.k==='xh'?p.xh:p.capH,h=o.h==null?kh:o.h,s=h/kh,q=Object.assign({},p);
  q.capH=p.capH*s;q.xh=p.xh*s;if(p.asc!=null)q.asc=p.asc*s;if(p.desc!=null)q.desc=p.desc*s;if(p.ov!=null)q.ov=p.ov*s;
  const st=o.st==null?s:o.st,ht=o.ht==null?st:o.ht;q.stem=p.stem*st;if(p.hair!=null)q.hair=p.hair*ht;
  if(o.q)Object.assign(q,o.q);
  const w=o.w==null?glyphWidth(ch,p)*s*(o.wx||1):o.w;
  return cloneC(d.shape(makeG(q,w,CS68.hgt(d,q)))||[]);};
CS68.natW=(ch,p,o)=>{o=o||{};const d=GL[ch];if(!d)return 0;const kh=d.k==='xh'?p.xh:p.capH,s=(o.h==null?kh:o.h)/kh;return glyphWidth(ch,p)*s*(o.wx||1);};
CS68.add=(id,ch,e)=>{const f=FONTS[id];if(!f||!f.GL)return false;
  if(!f.GL[ch]||e.force)f.GL[ch]=e;
  if(!f.CHARSET.includes(ch))f.CHARSET.push(ch);
  for(const g of f.GROUPS)if(g[0]==='Знаки'&&!g[1].includes(ch))g[1]+=ch;
  return true;};
CS68.cfg={stroka:{ringSt:0.5,ringHt:0.55,cSt:0.4,cHt:0.45,cH:0.46}};   /* per font overrides (filled below) */
CS68.C=id=>Object.assign({dotY:0.5,cw:1,ringH:0.94,ringSt:0.62,ringHt:0.72,cH:0.50,cSt:0.55,cHt:0.62},CS68.cfg[id]||{});

/* ---- U+00B7 · : the font's own period lifted to the middle of the x-height ---- */
CS68.middot=id=>{const e={k:'cap',opt:{},
  w:p=>glyphWidth('.',p),
  shape:g=>{const p=g.p,d=GL['.'],w=glyphWidth('.',p),cs=d.shape(makeG(p,w,CS68.hgt(d,p)))||[],b=CS68.bb(cs);
    return CS68.tr(cloneC(cs),(g.w-w)/2,CS68.C(id).dotY*p.xh-(b.y0+b.y1)/2);}};
  return CS68.add(id,'·',e);};
/* ---- U+00A9 © : ring (own О) at cap height + own С inside, lighter strokes ---- */
CS68.copyright=id=>{const ringW=p=>{const c=CS68.C(id),h=p.capH*c.ringH,Wo=CS68.natW('О',p,{h,st:c.ringSt,ht:c.ringHt});return Math.max(Wo*c.cw,h*0.98);};
  const e={k:'cap',opt:{},w:p=>ringW(p),
  shape:g=>{const p=g.p,c=CS68.C(id),h=p.capH*c.ringH,W=g.w,ring=CS68.sub('О',p,{h,w:W,st:c.ringSt,ht:c.ringHt}),rb=CS68.bb(ring);
    const ch=h*c.cH,inner=CS68.sub('С',p,{h:ch,st:c.cSt,ht:c.cHt}),ib=CS68.bb(inner);
    const cy=p.capH/2;
    return [...CS68.tr(ring,0,cy-(rb.y0+rb.y1)/2),...CS68.tr(inner,W/2-(ib.x0+ib.x1)/2+(c.cdx||0)*W,cy-(ib.y0+ib.y1)/2)];}};
  return CS68.add(id,'©',e);};

/* ---- ° : own О in a small size at the cap top (stroke limited so the counter never closes) ---- */
CS68.degree=id=>{const k=()=>({h:0.30,st:0.5,ht:0.55});
  const W=p=>{const c=k();return Math.max(CS68.natW('О',p,{h:p.capH*c.h,st:c.st,ht:c.ht}),p.capH*c.h*0.95);};
  return CS68.add(id,'°',{k:'cap',opt:{},force:true,w:p=>W(p),shape:g=>{const p=g.p,c=k(),h=p.capH*c.h,o=CS68.sub('О',p,{h,w:g.w,st:c.st,ht:c.ht}),b=CS68.bb(o);return CS68.tr(o,0,p.capH-b.y1);}});};
/* ---- % : two own small О and the own slash ---- */
CS68.percent=id=>{const cfg={h:0.30,st:0.5,ht:0.55};
  const dims=p=>{const h=p.capH*cfg.h,wo=Math.max(CS68.natW('О',p,{h,st:cfg.st,ht:cfg.ht}),h*0.95),ws=glyphWidth('/',p);return {h,wo,ws};};
  return CS68.add(id,'%',{k:'cap',opt:{},force:true,w:p=>{const d=dims(p);return Math.max(d.ws+d.wo*0.9,2*d.wo+d.ws*0.35);},
    shape:g=>{const p=g.p,d=dims(p),W=g.w,sl=CS68.sub('/',p,{w:Math.max(d.ws,W-d.wo*0.9)}),sb=CS68.bb(sl);
      const o1=CS68.sub('О',p,{h:d.h,w:d.wo,st:cfg.st,ht:cfg.ht}),b1=CS68.bb(o1),o2=cloneC(o1);
      return [...CS68.tr(sl,(W-(sb.x0+sb.x1))/2,0),...CS68.tr(o1,0-b1.x0,p.capH-b1.y1),...CS68.tr(o2,W-b1.x1,0-b1.y0)];}});};

/* ---- * : three copies of the own minus (own end style, own hairline weight) rotated 0/60/120 degrees around the star centre ---- */
CS68.star=id=>{const L=p=>p.capH*0.46;
  return CS68.add(id,'*',{k:'cap',opt:{},force:true,w:p=>Math.max(L(p)*1.25,glyphWidth('-',p)*0.8),
    shape:g=>{const p=g.p,cx=g.w/2,cy=p.capH*0.74,d=GL['-'],out=[];
      for(const a of [90,30,150]){const r=a*Math.PI/180,co=Math.cos(r),si=Math.sin(r),w0=L(p),cs=CS68.sub('-',p,{w:w0,st:0.5,ht:0.5}),b=CS68.bb(cs),mx=(b.x0+b.x1)/2,my=(b.y0+b.y1)/2;
        out.push(...xf(cs,(x,y)=>[cx+co*(x-mx)-si*(y-my),cy+si*(x-mx)+co*(y-my)]));}
      return out;}});};

for(const id of ['volt','kvadra','stroka','codex','liniya','propis','renessa','ustav','rotunda','modul','ryvok','applik','kaplya','stsepka']){
  if(!FONTS[id])continue;CS68.middot(id);CS68.copyright(id);}
for(const id of ['codex','rotunda'])if(FONTS[id])CS68.degree(id);
for(const id of ['rotunda'])if(FONTS[id])CS68.percent(id);
for(const id of ['rotunda'])if(FONTS[id])CS68.star(id);
