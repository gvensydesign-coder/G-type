// usage: node fixtures.js <outdir> <fontId> [style: abs|rel|xf|tight|stroke|mix]
// exports glyphs of one of our fonts as SVG files in various styles
const fs=require('fs'),path=require('path');
const src=fs.readFileSync('core_all.js','utf8');
const m=new Function(src+'\nreturn {FONTS,useFont,DEFAULTS,newLattice,finalGlyph,GL,CHARSET,glyphSkeleton,safeP};')();
const out=process.argv[2],fid=process.argv[3]||'kvadra',style=process.argv[4]||'abs';
fs.mkdirSync(out,{recursive:true});
m.useFont(fid);const f=m.FONTS[fid];
const st={p:{...f.DEFAULTS.regular},lat:m.newLattice(),hg:[],kern:{}};
const LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?-–—()"\'«»';
const CYR='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const chars=(process.argv[5]||'lat,cyr').split(',').map(x=>x==='lat'?LAT:x==='cyr'?CYR:x).join('');
const r1=v=>Math.round(v*100)/100;
function fname(ch,i){
  const cp=ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
  if(/[A-Z]/.test(ch))return ch+'_upper.svg'; if(/[a-z]/.test(ch))return ch+'_lower.svg';
  if(/[0-9]/.test(ch))return ch+'.svg';
  if(/[А-ЯЁ]/.test(ch))return i%2?'U+'+cp+'.svg':ch+'.svg';
  if(/[а-яё]/.test(ch))return i%3==0?'uni'+cp+'.svg':i%3==1?'U+'+cp+'.svg':ch+'.svg';
  return 'U+'+cp+'.svg';}
function dAbs(cs,X,Y){let d='';for(const c of cs){const n=c.nodes;d+='M'+r1(X(n[0].x))+' '+r1(Y(n[0].y));
  for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];const close=i===n.length-1;
    if(a.b||b.a){const p1=a.b||a,p2=b.a||b;d+='C'+r1(X(p1.x))+' '+r1(Y(p1.y))+' '+r1(X(p2.x))+' '+r1(Y(p2.y))+' '+r1(X(b.x))+' '+r1(Y(b.y));}
    else if(!close)d+='L'+r1(X(b.x))+' '+r1(Y(b.y));else{/* closing line implied by Z */}}
  d+='Z';}return d;}
function dRel(cs,X,Y){let d='';for(const c of cs){const n=c.nodes;let cx=X(n[0].x),cy=Y(n[0].y);d+='M'+r1(cx)+' '+r1(cy);
  for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];const close=i===n.length-1;
    if(a.b||b.a){const p1=a.b||a,p2=b.a||b;d+='c'+r1(X(p1.x)-cx)+' '+r1(Y(p1.y)-cy)+' '+r1(X(p2.x)-cx)+' '+r1(Y(p2.y)-cy)+' '+r1(X(b.x)-cx)+' '+r1(Y(b.y)-cy);cx=X(b.x);cy=Y(b.y);}
    else if(!close){const nx=X(b.x),ny=Y(b.y);if(Math.abs(ny-cy)<1e-9)d+='h'+r1(nx-cx);else if(Math.abs(nx-cx)<1e-9)d+='v'+r1(ny-cy);else d+='l'+r1(nx-cx)+' '+r1(ny-cy);cx=nx;cy=ny;}}
  d+='z';}return d;}
let count=0;
for(const [i,ch] of Array.from(chars).entries()){
  const g=m.finalGlyph(ch,st,{});if(!g||!g.cs.length)continue;
  const adv=g.adv,H=1200,base=900,pad=100;
  const W=Math.ceil(adv+2*pad);
  let body,vb=`0 0 ${W} ${H}`;
  const X=x=>x+pad,Y=y=>base-y;
  const sty=style==='mix'?['abs','rel','xf','tight'][i%4]:style;
  if(sty==='abs')body=`<path d="${dAbs(g.cs,X,Y)}"/>`;
  else if(sty==='rel')body=`<path fill="#111" d="${dRel(g.cs,X,Y)}"/>`;
  else if(sty==='xf'){ // transforms: coordinates pre-inverted
    const k=i%3;
    if(k===0)body=`<g transform="translate(300 200)"><path d="${dAbs(g.cs,x=>X(x)-300,y=>Y(y)-200)}"/></g>`;
    else if(k===1)body=`<g transform="scale(0.5)"><g transform="scale(2) rotate(180 ${W/2} ${H/2})"><path d="${dAbs(g.cs,x=>W-X(x),y=>H-Y(y))}"/></g></g>`;
    else body=`<path transform="matrix(0.5 0 0 0.5 50 60)" d="${dAbs(g.cs,x=>(X(x)-50)*2,y=>(Y(y)-60)*2)}"/>`;}
  else if(sty==='tight'){ // each glyph cropped to its ink bbox, y flipped canvas
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const c of g.cs)for(const n of c.nodes){x0=Math.min(x0,n.x);x1=Math.max(x1,n.x);y0=Math.min(y0,n.y);y1=Math.max(y1,n.y);}
    vb=`0 0 ${r1(x1-x0)} ${r1(y1-y0)}`;body=`<path fill-rule="evenodd" d="${dAbs(g.cs,x=>x-x0,y=>y1-y)}"/>`;}
  else if(sty==='stroke'){
    const sk=m.glyphSkeleton?m.glyphSkeleton(ch,st.p,null):null;
    if(!sk){continue;}
    const S=sk.pen&&sk.pen.o&&sk.pen.o.rx?sk.pen.o.rx*2:st.p.stem;
    let d='';const dots=[];
    for(const s of sk.skel){if(s.dot){dots.push(`<circle cx="${r1(X(s.x))}" cy="${r1(Y(s.y))}" r="${r1(s.r)}"/>`);continue;}
      const n=s.nodes;d+='M'+r1(X(n[0].x))+' '+r1(Y(n[0].y));
      const cnt=s.closed?n.length:n.length-1;
      for(let j=0;j<cnt;j++){const a=n[j],b=n[(j+1)%n.length];
        if(a.b||b.a){const p1=a.b||a,p2=b.a||b;d+='C'+r1(X(p1.x))+' '+r1(Y(p1.y))+' '+r1(X(p2.x))+' '+r1(Y(p2.y))+' '+r1(X(b.x))+' '+r1(Y(b.y));}else d+='L'+r1(X(b.x))+' '+r1(Y(b.y));}
      if(s.closed)d+='Z';}
    body=`<path fill="none" stroke="#000" stroke-width="${r1(S)}" stroke-linecap="${process.env.CAP||'butt'}" stroke-linejoin="${process.env.JOIN||'round'}" d="${d}"/>`+dots.map(x=>x).join('');
    // dots are strokeless circles filled black
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><rect width="100%" height="100%" fill="#ffffff" fill-opacity="0"/>${body}</svg>`;
  fs.writeFileSync(path.join(out,fname(ch,i)),svg);count++;
  // keep a json with the original (for round-trip compare)
}
console.log('wrote',count,'svg to',out);
