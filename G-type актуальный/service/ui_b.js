/* ===== VOLT: редактор глифа, направляющие, панель ===== */
const EVO={warp:false,slant:false,subdiv:false,keepOff:true,rough:false,union:false};
const rawGlyph=()=>getFinal(S.sel,S.style,EVO);
const V={ox:0,oy:0,sc:1,t:0,w:0,cw:0,ch:0,base:1,rul:18};
function view(){
  const cv=$('#stage'),r=cv.getBoundingClientRect();
  V.cw=r.width;V.ch=r.height;
  V.t=Math.tan(cur().p.slant*Math.PI/180);
  const g=rawGlyph();V.w=g?g.weff:0;
  const wc=(drag&&drag.fw!=null)?drag.fw:V.w;
  /* «По размеру» (zoom 1) вписывает знак и по высоте, и по ширине: широкие Ж, Ш, Щ, W на узком экране не обрезаются */
  /* по высоте вписывается сам знак (его контур и линия строчных/прописных), а не вся сетка от выносных до выносных:
     строчная r или точка видны крупно; во время перетаскивания масштаб не меняется */
  if(!drag||V.fitH==null){const p=cur().p,kd=GL[S.sel]&&GL[S.sel].k==='xh'?p.xh:p.capH;let y0=0,y1=kd;
    if(g)for(const c of g.cs){if(c.op==='sub')continue;for(const n of c.nodes){if(n.y<y0)y0=n.y;if(n.y>y1)y1=n.y;}}
    y0=Math.max(y0,-p.desc-40)-60;y1=Math.min(y1,Math.max(p.asc,p.capH)+60)+60;V.fitH=y1-y0;V.cy=(y0+y1)/2;}
  V.wc=wc+V.cy*V.t;const ext=wc+Math.abs(V.t)*V.fitH+160;
  V.base=Math.max(0.01,Math.min((r.height-40)/V.fitH,(r.width-2*V.rul)/Math.max(ext,1)));V.sc=V.base*S.view.zoom;
  V.ox=r.width/2-(V.wc*V.sc)/2+S.view.px;
  V.oy=viewOY()+S.view.py;
  return g;
}
/* базовое положение линии шрифта: знак по вертикали в середине свободного места */
const viewOY=()=>(V.ch+V.rul)/2+(V.cy||350)*V.base;
const toS=(x,y)=>[V.ox+(x+y*V.t)*V.sc,V.oy-y*V.sc];
const toW=(sx,sy)=>{const y=(V.oy-sy)/V.sc;return [(sx-V.ox)/V.sc-y*V.t,y];};
/* ---------- направляющие ---------- */
function gstate(){
  const ed=S.edits[S.sel],p=cur().p;let b;
  if(typeof SK_RAW!=='undefined'){SK_RAW++;try{b=buildBase(S.sel,p,ed);}finally{SK_RAW--;}}else b=buildBase(S.sel,p,ed);/* ползунок: нужны только ширина и поля — без точного объединения */
  if(!b)return {vg:[],hg:[]};
  return {vg:evalVG(b.w,b.S,ed),hg:evalHG(p,cur().hg)};
}
function drawGuides(c){
  const G=gstate(),gv=css('--gv'),gh=css('--gh'),mu=css('--muted');
  c.font=MONO;
  const y1=V.oy/V.sc,y2=(V.oy-V.ch)/V.sc;
  const usedY=[];
  if(S.guides){
    G.hg.forEach(it=>{
      const y=it.s+it.d,sy=toS(0,y)[1],moved=Math.abs(it.d)>0.4;
      if(moved){const s0=toS(0,it.s)[1];c.setLineDash([2,5]);c.strokeStyle=gh;c.globalAlpha=.35;c.lineWidth=1;c.beginPath();c.moveTo(0,s0+.5);c.lineTo(V.cw,s0+.5);c.stroke();c.setLineDash([]);c.globalAlpha=1;}
      c.strokeStyle=moved?gh:'#000';c.globalAlpha=moved?.95:.2;c.lineWidth=moved?1.6:1;c.beginPath();c.moveTo(0,sy+.5);c.lineTo(V.cw,sy+.5);c.stroke();c.globalAlpha=1;

    });
    G.vg.forEach((it,i)=>{
      const x=it.s+it.d,moved=Math.abs(it.d)>0.4;
      const a=toS(x,y1),b=toS(x,y2);
      if(moved){const a0=toS(it.s,y1),b0=toS(it.s,y2);c.setLineDash([2,5]);c.strokeStyle=gv;c.globalAlpha=.35;c.lineWidth=1;c.beginPath();c.moveTo(a0[0]+.5,a0[1]);c.lineTo(b0[0]+.5,b0[1]);c.stroke();c.setLineDash([]);c.globalAlpha=1;}
      c.strokeStyle=moved?gv:'#000';c.globalAlpha=moved?.95:.2;c.lineWidth=moved?1.6:1;c.beginPath();c.moveTo(a[0]+.5,a[1]);c.lineTo(b[0]+.5,b[1]);c.stroke();c.globalAlpha=1;
    });
  }
  return G;
}
function drawRulers(c,G){
  const R=V.rul,panel=css('--panel'),mu=css('--muted'),gv=css('--gv'),gh=css('--gh'),ln=css('--line');
  c.fillStyle=panel;c.fillRect(0,0,V.cw,R);c.fillRect(0,0,R,V.ch);
  c.strokeStyle=ln;c.lineWidth=1;c.beginPath();c.moveTo(0,R+.5);c.lineTo(V.cw,R+.5);c.moveTo(R+.5,0);c.lineTo(R+.5,V.ch);c.stroke();
  c.font=MONO;c.fillStyle=mu;c.textBaseline='middle';c.textAlign='left';
  const stepW=V.sc>.5?100:200;
  const x0=Math.floor((-V.ox/V.sc)/stepW)*stepW,x1=(V.cw-V.ox)/V.sc;
  c.strokeStyle=mu;
  for(let x=x0;x<=x1;x+=stepW/5){const sx=V.ox+x*V.sc;if(sx<R||sx>V.cw)continue;const big=Math.round(x)%stepW===0;c.beginPath();c.moveTo(sx+.5,R);c.lineTo(sx+.5,R-(big?9:4));c.stroke();}
  const yy0=Math.floor(((V.oy-V.ch)/V.sc)/stepW)*stepW,yy1=V.oy/V.sc;
  c.textAlign='left';
  for(let y=yy0;y<=yy1;y+=stepW/5){const sy=V.oy-y*V.sc;if(sy<R||sy>V.ch)continue;const big=Math.round(y)%stepW===0;c.beginPath();c.moveTo(R,sy+.5);c.lineTo(R-(big?9:4),sy+.5);c.stroke();}
  if(!S.guides)return;
  // метки направляющих: маркер на линейке и подпись под ней
  c.textAlign='left';c.textBaseline='top';
  G.vg.forEach((it,i)=>{
    const x=it.s+it.d,sx=toS(x,0)[0];if(sx<R||sx>V.cw)return;
    const moved=Math.abs(it.d)>0.4;
    c.fillStyle=moved?gv:'rgba(0,0,0,.4)';c.beginPath();c.moveTo(sx-4,R-6);c.lineTo(sx+4,R-6);c.lineTo(sx,R);c.closePath();c.fill();
  });
  G.hg.forEach(it=>{
    const y=it.s+it.d,sy=toS(0,y)[1];if(sy<R||sy>V.ch)return;
    const moved=Math.abs(it.d)>0.4;
    c.fillStyle=moved?gh:'rgba(0,0,0,.4)';c.beginPath();c.moveTo(R-6,sy-4);c.lineTo(R-6,sy+4);c.lineTo(R,sy);c.closePath();c.fill();
  });
  c.fillStyle=panel;c.fillRect(0,0,R,R);
}
/* эталон: шрифт и картинка под глифом */
function drawRef(c,ch){
  const r=S.ref;
  if(r.img){
    const im=r.img,hh=S.styles[S.style].p.capH*V.sc*r.imgS/100,ww=hh*im.width/im.height;
    c.globalAlpha=r.imgA/100;c.drawImage(im,V.ox+r.imgX*V.sc,V.oy-r.imgY*V.sc-hh,ww,hh);c.globalAlpha=1;
  }
  if(r.on&&ch.trim()){
    const gen=['sans-serif','serif','monospace'].includes(r.font);
    c.save();c.font='700 '+(1000*V.sc*r.scale/100)+'px '+(gen?r.font:'"'+r.font+'"')+',sans-serif';
    c.textBaseline='alphabetic';c.textAlign='left';
    const m=c.measureText(ch),U=getFinal(ch,S.style,{warp:false,slant:false,subdiv:false,rough:false});
    let xmin=0,xmax=0,ymax=0;if(U&&U.cs.length){xmin=1e9;xmax=-1e9;ymax=-1e9;U.cs.forEach(q=>q.nodes.forEach(n=>{xmin=Math.min(xmin,n.x);xmax=Math.max(xmax,n.x);ymax=Math.max(ymax,n.y);}));}
    const x=V.ox+xmin*V.sc+(m.actualBoundingBoxLeft||0);
    c.fillStyle='rgba(0,0,0,.05)';c.fillText(ch,x,V.oy);
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1;c.strokeText(ch,x,V.oy);c.restore();
    /* сравнение пропорций с эталоном */
    const rw=((m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||0))/V.sc,rh=(m.actualBoundingBoxAscent||0)/V.sc,ow=xmax-xmin;
    const el=$('#refcmp');if(el&&rw>0&&ow>0){const d=Math.round((ow/rw-1)*100),dh=rh>0?Math.round((ymax/rh-1)*100):0;
      el.textContent='«'+ch+'»: ширина '+(d>0?'+':'')+d+'%, высота '+(dh>0?'+':'')+dh+'% к эталону';el.style.color=Math.abs(d)>8?'var(--warn-text)':'';}
  }else{const el=$('#refcmp');if(el)el.textContent='';}
}
function drawEditor(){
  const cv=$('#stage');const raw=view();const {c,w,h}=fitCanvas(cv);
  c.clearRect(0,0,w,h);
  const p=cur().p;
  drawRef(c,S.sel);
  if(window.GT_UNDER)GT_UNDER.ed(c,0);/* W96-U: подложка под контуром */
  const G=drawGuides(c);
  if(raw){
    // рамка выносных и подпись ширины, как в видео
    const corners=[[0,-p.desc],[V.w,-p.desc],[V.w,p.asc],[0,p.asc]].map(q=>toS(q[0],q[1]));
    c.strokeStyle=css('--guide');c.lineWidth=1;c.setLineDash([4,4]);c.beginPath();
    c.moveTo(corners[0][0],corners[0][1]);corners.slice(1).forEach(q=>c.lineTo(q[0],q[1]));c.closePath();c.stroke();c.setLineDash([]);
    c.textAlign='left';
    if(S.mode==='skel'&&typeof skGlyph==='function'&&skGlyph())drawSkeleton(c);else if(S.mode==='grid')drawGrid(c);else{drawPoints(c,raw);drawSmart(c);}
  }
  if(window.GT_UNDER)GT_UNDER.ed(c,1);/* подложка поверх контура и рамка ручек */
  drawRulers(c,G);
}
const PART_HUE=i=>(i*57+10)%360;
let NODE_MARKS=[];
function drawPoints(c,raw){
  const acc=css('--sel');
  if(latActive(cur().lat)){
    const fin=finalGlyph(S.sel,cur(),S.edits,{slant:false});
    if(fin){c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1;c.stroke(pathOf(fin.cs,toS));}
  }
  const on=raw.cs.filter(q=>!q.off);
  if(S.parts){
    raw.cs.forEach((cn,ci)=>{if(cn.off)return;const P=pathOf([cn],toS);c.fillStyle='hsla('+PART_HUE(ci)+',80%,60%,'+(cn.hole||cn.op==='sub'?.0:.34)+')';c.fill(P,'nonzero');
      c.strokeStyle='hsl('+PART_HUE(ci)+',70%,45%)';c.lineWidth=cn.hole?1.5:1.2;if(cn.hole)c.setLineDash([5,4]);c.stroke(P);c.setLineDash([]);
      const q=toS(cn.nodes[0].x,cn.nodes[0].y);c.fillStyle='hsl('+PART_HUE(ci)+',70%,38%)';c.font=MONO;c.textAlign='center';c.textBaseline='middle';c.fillText(String(ci+1),q[0]+(cn.hole?10:-10),q[1]);});
    c.textAlign='left';
  }else{
    const U=getFinal(S.sel,S.style,{warp:false,slant:false,subdiv:false,rough:false});
    const P=pathOf(U?U.cs:on,toS);c.fillStyle=css('--glyph-fill');c.fill(P,'nonzero');c.strokeStyle=acc;c.lineWidth=1.5;c.stroke(P);
    /* исходные детали: тонкий контур; вычитаемые области — пунктир */
    on.forEach(cn=>{if(cn.op==='sub')return;c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=1;c.stroke(pathOf([cn],toS));});
  }
  raw.cs.forEach((cn,ci)=>{if(cn.off){c.setLineDash([3,4]);c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1;c.stroke(pathOf([cn],toS));c.setLineDash([]);}});
  if(S.hover!=null&&raw.cs[S.hover]){c.strokeStyle='#000';c.lineWidth=2.4;c.stroke(pathOf([raw.cs[S.hover]],toS));}
  /* маркеры не налезают друг на друга: выбранный узел рисуется всегда, остальные — только если на экране
     дальше 13 px от уже нарисованных (сначала узлы, затем ручки); при увеличении появляются все */
  const MK=[],okMk=(x,y)=>{for(const m of MK)if(Math.abs(m[0]-x)<13&&Math.abs(m[1]-y)<13)return false;MK.push([x,y]);return true;};
  NODE_MARKS=MK;
  const items=[];
  raw.cs.forEach((cn,ci)=>{if(cn.off||(cn.op==='sub'&&!S.parts))return;cn.nodes.forEach((n,ni)=>{
    const sel=S.node&&!S.node.lat&&S.node.ci===ci&&S.node.ni===ni;items.push({n,ci,ni,sel,p:toS(n.x,n.y)});});});
  const order=items.filter(i=>i.sel).concat(items.filter(i=>!i.sel));
  const shown=new Set();
  order.forEach(it=>{if(it.sel){MK.push(it.p);shown.add(it);}});
  order.forEach(it=>{if(!it.sel&&okMk(it.p[0],it.p[1]))shown.add(it);});
  items.forEach(it=>{const {n,sel}=it,[ax,ay]=it.p;
    for(const part of ['a','b']){
      const hd=n[part];if(!hd||near1(hd,n))continue;
      const [hx,hy]=toS(hd.x,hd.y),hs=sel&&S.node.part===part;
      if(hs)MK.push([hx,hy]);else if(!okMk(hx,hy))continue;
      c.strokeStyle=sel?acc:'rgba(0,0,0,.35)';c.lineWidth=1;c.beginPath();c.moveTo(ax,ay);c.lineTo(hx,hy);c.stroke();
      c.fillStyle=hs?acc:'#fff';c.strokeStyle=hs?acc:'#000';c.beginPath();c.arc(hx,hy,3.6,0,7);c.fill();c.stroke();
    }
    if(!shown.has(it))return;
    const ss=sel&&S.node.part==='p';
    c.fillStyle=ss?acc:'#000';c.fillRect(ax-3.5,ay-3.5,7,7);
    if(ss){c.strokeStyle=acc;c.lineWidth=1;c.strokeRect(ax-6.5,ay-6.5,13,13);}
  });
}
function gridPoint(i,j,l,w){
  const u=i/(LAT_N-1),v=j/(LAT_N-1);
  return {rx:u*w,ry:BOX_Y0+v*BOX_H,x:u*w+l.dx[i][j]*w,y:BOX_Y0+v*BOX_H+l.dy[i][j]*BOX_H};
}
function drawGrid(c){
  const st=cur(),l=st.lat,w=V.w,acc=css('--sel');
  const fin=finalGlyph(S.sel,st,S.edits,{slant:false});
  if(fin){const P=pathOf(fin.cs,toS);c.fillStyle=css('--glyph-fill');c.fill(P,'nonzero');c.strokeStyle=acc;c.lineWidth=1.5;c.stroke(P);}
  c.strokeStyle='rgba(252,71,60,.28)';c.lineWidth=1;
  const M=8,SEG=24;
  for(let a=0;a<=M;a++){
    c.beginPath();for(let k=0;k<=SEG;k++){const q=ffdPoint(l,w,a/M*w,BOX_Y0+k/SEG*BOX_H),s=toS(q[0],q[1]);k?c.lineTo(s[0],s[1]):c.moveTo(s[0],s[1]);}c.stroke();
    c.beginPath();for(let k=0;k<=SEG;k++){const q=ffdPoint(l,w,k/SEG*w,BOX_Y0+a/M*BOX_H),s=toS(q[0],q[1]);k?c.lineTo(s[0],s[1]):c.moveTo(s[0],s[1]);}c.stroke();
  }
  c.strokeStyle='rgba(0,0,0,.35)';
  for(let i=0;i<LAT_N;i++){
    c.beginPath();for(let j=0;j<LAT_N;j++){const g=gridPoint(i,j,l,w),s=toS(g.x,g.y);j?c.lineTo(s[0],s[1]):c.moveTo(s[0],s[1]);}c.stroke();
    c.beginPath();for(let j=0;j<LAT_N;j++){const g=gridPoint(j,i,l,w),s=toS(g.x,g.y);j?c.lineTo(s[0],s[1]):c.moveTo(s[0],s[1]);}c.stroke();
  }
  for(let i=0;i<LAT_N;i++)for(let j=0;j<LAT_N;j++){
    const g=gridPoint(i,j,l,w),s=toS(g.x,g.y),on=S.node&&S.node.lat&&S.node.i===i&&S.node.j===j;
    const moved=Math.abs(l.dx[i][j])>1e-4||Math.abs(l.dy[i][j])>1e-4;
    c.fillStyle=(on||moved)?acc:'#fff';c.strokeStyle=on?acc:'#000';c.lineWidth=1.5;c.beginPath();c.arc(s[0],s[1],5,0,7);c.fill();c.stroke();
  }
}
/* ---------- правки точек ---------- */
const nodeKey=n=>n.ci+':'+n.ni;
function ed(){return S.edits[S.sel]||(S.edits[S.sel]={});}
function cleanEdit(){
  const e=S.edits[S.sel];if(!e)return;
  const empty=Object.keys(e).every(k=>{const v=e[k];
    if(k==='vg'||k==='off')return !v||!v.length;
    if(k==='wm')return !v||v===100;
    if(k==='sk')return !v||typeof v!=='object'||!Object.keys(v).length;
    if(typeof v==='number')return !v;
    return !v||(!v.p&&v.a===undefined&&v.b===undefined);});
  if(empty)delete S.edits[S.sel];
}
function setNodeTarget(hit,base,tx,ty){
  const bn=base.cs[hit.ci].nodes[hit.ni];const E=ed();const k=hit.ci+':'+hit.ni;const e=E[k]||(E[k]={});
  const SP=cur().p,LP=Math.max(30,SP.stem*0.45),LH=Math.max(60,SP.stem*0.9),cl=(v,L)=>Math.max(-L,Math.min(L,v));
  if(hit.part==='p'){e.p=[cl(tx-bn.x,LP),cl(ty-bn.y,LP)];}
  else{const ep=e.p||[0,0],bp=bn[hit.part]||bn;e[hit.part]=[cl(tx-bp.x-ep[0],LH),cl(ty-bp.y-ep[1],LH)];}
  if(e.p&&!e.p[0]&&!e.p[1])delete e.p;
  for(const q of ['a','b'])if(Array.isArray(e[q])&&!e[q][0]&&!e[q][1])delete e[q];
  if(!e.p&&e.a===undefined&&e.b===undefined)delete E[k];
  cleanEdit();
}
/* цель в координатах экрана-без-наклона (после направляющих) -> координаты построения */
function setNodeDisplay(hit,tx,ty){
  const raw=rawGlyph(),base=buildBase(S.sel,cur().p,S.edits[S.sel]);
  setNodeTarget(hit,base,raw.fx.inv(tx),raw.fy.inv(ty));
}
function nodePos(hit){const raw=rawGlyph();const n=raw.cs[hit.ci].nodes[hit.ni];return hit.part==='p'?n:(n[hit.part]||n);}
function editedBase(){const ed0=S.edits[S.sel];const b=buildBase(S.sel,cur().p,ed0);applyEdits(b.cs,ed0);return b;}
function nodeCorner(){
  if(!S.node||S.node.lat)return;snap();const E=ed(),k=nodeKey(S.node);E[k]=Object.assign(E[k]||{},{a:false,b:false});S.node.part='p';bump();syncNodeInfo();
}
function nodeSmooth(){
  if(!S.node||S.node.lat)return;snap();
  const {ci,ni}=S.node,eb=editedBase(),base=buildBase(S.sel,cur().p,S.edits[S.sel]);
  const ns=eb.cs[ci].nodes,n=ns[ni],P=ns[(ni-1+ns.length)%ns.length],N=ns[(ni+1)%ns.length];
  const hasH=(h,o)=>!near1(h,o);
  /* сторона «прямая», если у обоих её концов нет ручек: её нельзя гнуть, иначе плоская кромка выгибается */
  const lineIn=!hasH(P.b,P)&&!hasH(n.a,n),lineOut=!hasH(N.a,N)&&!hasH(n.b,n);
  if(lineIn&&lineOut){S.node.part='p';syncNodeInfo();return;}
  let tx=N.x-P.x,ty=N.y-P.y;
  if(lineIn){tx=n.x-P.x;ty=n.y-P.y;}else if(lineOut){tx=N.x-n.x;ty=N.y-n.y;}
  const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  const la=n.a?Math.hypot(n.a.x-n.x,n.a.y-n.y):Math.hypot(P.x-n.x,P.y-n.y)/3;
  const lb=n.b?Math.hypot(n.b.x-n.x,n.b.y-n.y):Math.hypot(N.x-n.x,N.y-n.y)/3;
  const E=ed(),k=ci+':'+ni;if(E[k]){if(E[k].a===false&&!lineIn)delete E[k].a;if(E[k].b===false&&!lineOut)delete E[k].b;}
  if(!lineIn)setNodeTarget({ci,ni,part:'a'},base,n.x-tx*la,n.y-ty*la);
  if(!lineOut)setNodeTarget({ci,ni,part:'b'},base,n.x+tx*lb,n.y+ty*lb);
  S.node.part='p';bump();syncNodeInfo();
}
function resetNode(){
  if(!S.node||S.node.lat)return;snap();const E=S.edits[S.sel];if(E){delete E[nodeKey(S.node)];cleanEdit();}bump();syncNodeInfo();
}
/* ---------- попадание ---------- */
function hitPoints(sx,sy){
  const raw=rawGlyph();if(!raw)return null;
  let best=null,bd=11;
  raw.cs.forEach((cn,ci)=>{if(cn.off||(cn.op==='sub'&&!S.parts))return;cn.nodes.forEach((n,ni)=>{
    for(const part of ['a','b']){const hd=n[part];if(!hd||near1(hd,n))continue;const [hx,hy]=toS(hd.x,hd.y);const d=Math.hypot(hx-sx,hy-sy);if(d<bd-1){bd=d+1;best={ci,ni,part};}}
    const [ax,ay]=toS(n.x,n.y);const d=Math.hypot(ax-sx,ay-sy);if(d<bd){bd=d;best={ci,ni,part:'p'};}
  });});
  return best;
}
function hitGrid(sx,sy){
  const l=cur().lat;let best=null,bd=13;
  for(let i=0;i<LAT_N;i++)for(let j=0;j<LAT_N;j++){const g=gridPoint(i,j,l,V.w),s=toS(g.x,g.y),d=Math.hypot(s[0]-sx,s[1]-sy);if(d<bd){bd=d;best={lat:true,i,j};}}
  return best;
}
function hitGuide(sx,sy){
  if(!S.guides)return null;
  const G=gstate(),w=toW(sx,sy);let best=null,bd=6;
  G.hg.forEach(it=>{const d=Math.abs(w[1]-(it.s+it.d))*V.sc;if(d<bd){bd=d;best={axis:'h',it,list:G.hg};}});
  G.vg.forEach(it=>{const d=Math.abs(w[0]-(it.s+it.d))*V.sc;if(d<bd){bd=d;best={axis:'v',it,list:G.vg};}});
  return best;
}
function pt(e){const r=$('#stage').getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
function setGuideD(axis,it,d){
  d=Math.round(d*10)/10;
  if(axis==='v'){
    const E=ed();E.vg=E.vg||[];
    if(it.k==='x')it.g.d=d;else{let f=E.vg.find(g=>g.k===it.k);if(!f){f={k:it.k,d:0};E.vg.push(f);}f.d=d;}
    E.vg=E.vg.filter(g=>g.k==='x'||Math.abs(g.d)>0.04);if(!E.vg.length)delete E.vg;
  }else{
    const st=cur();
    if(it.k==='y')it.g.d=d;else{let f=st.hg.find(g=>g.k===it.k);if(!f){f={k:it.k,d:0};st.hg.push(f);}f.d=d;}
    st.hg=st.hg.filter(g=>g.k==='y'||Math.abs(g.d)>0.04);
  }
  cleanEdit();
}
function removeCustom(axis,it){
  if(axis==='v'){const E=S.edits[S.sel];if(E&&E.vg){E.vg=E.vg.filter(g=>g!==it.g);if(!E.vg.length)delete E.vg;}}
  else cur().hg=cur().hg.filter(g=>g!==it.g);
  cleanEdit();
}
function addGuide(axis,pos){
  snap();
  if(axis==='v'){const E=ed();E.vg=E.vg||[];E.vg.push({k:'x',v:Math.round(pos),d:0});}
  else cur().hg.push({k:'y',v:Math.round(pos),d:0});
  const G=gstate();const arr=axis==='v'?G.vg:G.hg;return {axis,it:arr[arr.length-1],list:arr};
}
/* ---------- мышь ---------- */
let drag=null;
function startGuideDrag(hit,w){
  const it=hit.it;
  drag={kind:'guide',fw:V.w,axis:hit.axis,it,d0:it.d,others:hit.list.map(o=>({o,d0:o.d})),off:(hit.axis==='v'?w[0]:w[1])-(it.s+it.d)};
}
/* ---------- умные ручки конструкции: тянутся параметры шрифта, а не точки ---------- */
const BARH=new Set('HEFБВЭЄЗ3НЕeеэєзB8'.split('')),APH=new Set('CcСсGSsЭэЄєЗз23569e?'.split('')),MVH=new Set('MмМm'.split(''));
function smartHandles(){
  if(CUR_FONT==='codex'||S.mode!=='points')return [];
  const p=cur().p,ch=S.sel,kd=GL[ch]&&GL[ch].k,h=kd==='xh'?p.xh:p.capH,w=V.w,L=[],cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  if(BARH.has(ch))L.push({key:'bar',lab:'перекладина',x:-90,left:true,y:h*(p.bar||53)/100,val:y=>Math.round(cl(y/h*100,46,58)*2)/2});
  if(APH.has(ch))L.push({key:'aper',lab:'раскрытие',x:w+70,y:h/2+h*(p.aper||22)/200,val:y=>Math.round(cl((y-h/2)*200/h,8,50))});
  if(MVH.has(ch))L.push({key:'mv',lab:'вершина',x:w/2,y:h*(p.mv||0)/100,val:y=>Math.round(cl(y/h*100,0,45))});
  return L;}
function drawSmart(c){const acc=css('--sel');c.save();c.font=MONO;c.textBaseline='middle';
  for(const s of smartHandles()){const [x,y]=toS(s.x,s.y);c.fillStyle=acc;c.beginPath();c.moveTo(x,y-7);c.lineTo(x+7,y);c.lineTo(x,y+7);c.lineTo(x-7,y);c.closePath();c.fill();
    c.strokeStyle=acc;c.setLineDash([3,3]);c.beginPath();c.moveTo(s.left?x+12:x-12,y);c.lineTo(toS(s.left?V.w:0,s.y)[0],y);c.stroke();c.setLineDash([]);
    c.fillStyle='rgba(0,0,0,.6)';c.textAlign=s.left?'right':'left';c.fillText(s.lab,s.left?x-12:x+12,y);}
  c.restore();}
function hitSmart(sx,sy){for(const s of smartHandles()){const [x,y]=toS(s.x,s.y);if(Math.hypot(x-sx,y-sy)<11)return s;}return null;}
function onDown(e){
  const cv=$('#stage');cv.setPointerCapture(e.pointerId);
  const [sx,sy]=pt(e),w=toW(sx,sy);
  if(e.button===1||e.button===2){drag={kind:'pan',sx,sy,px:S.view.px,py:S.view.py};return;}
  // линейки: потянуть, чтобы создать направляющую
  if(S.guides&&(sx<V.rul||sy<V.rul)&&!(sx<V.rul&&sy<V.rul)){
    const axis=sy<V.rul?'v':'h';const g=addGuide(axis,axis==='v'?w[0]:w[1]);
    S.node=null;startGuideDrag(g,w);drag.created=true;syncPanel();schedule();return;
  }
  const sm=hitSmart(sx,sy);if(sm){snap();S.node=null;drag={kind:'smart',s:sm};schedule();return;}
  const hit=S.mode==='points'?hitPoints(sx,sy):S.mode==='grid'?hitGrid(sx,sy):null;
  if(hit){
    snap();S.node=hit;
    if(hit.lat){drag={kind:'lat',fw:V.w,i:hit.i,j:hit.j};}
    else{const pos=nodePos(hit);const raw=rawGlyph();drag={kind:'pt',fw:V.w,hit,offX:w[0]-pos.x,offY:w[1]-pos.y,start:[pos.x,pos.y]};}
    syncNodeInfo();schedule();return;
  }
  const gh=hitGuide(sx,sy);
  if(gh){snap();S.node=null;startGuideDrag(gh,w);syncNodeInfo();schedule();return;}
  S.node=null;drag={kind:'pan',sx,sy,px:S.view.px,py:S.view.py};syncNodeInfo();schedule();
}
function onMove(e){
  const [sx,sy]=pt(e);
  if(!drag){
    let cur2='grab';
    if(S.guides&&(sx<V.rul||sy<V.rul))cur2='crosshair';
    else{const h=S.mode==='points'?hitPoints(sx,sy):S.mode==='grid'?hitGrid(sx,sy):null;
      if(h||hitSmart(sx,sy))cur2='pointer';else{const g=hitGuide(sx,sy);if(g)cur2=g.axis==='v'?'col-resize':'row-resize';}}
    $('#stage').style.cursor=cur2;return;
  }
  if(drag.kind==='pan'){S.view.px=drag.px+sx-drag.sx;S.view.py=drag.py+sy-drag.sy;schedule();return;}
  const w=toW(sx,sy);
  if(drag.kind==='smart'){const v=drag.s.val(w[1]);if(cur().p[drag.s.key]!==v){cur().p[drag.s.key]=v;const o=$('#p_'+drag.s.key);if(o){o.value=v;$('#o_'+drag.s.key).textContent=fmt(drag.s.key,v);}bump();syncMethods();}return;}
  if(drag.kind==='guide'){
    let tgt=(drag.axis==='v'?w[0]:w[1])-drag.off;
    if(S.snap&&!e.altKey)tgt=Math.round(tgt/S.snapStep)*S.snapStep;
    const nd=tgt-drag.it.s,delta=Math.max(-70-drag.d0,Math.min(70-drag.d0,nd-drag.d0));
    for(const {o,d0} of drag.others){
      const grp=o===drag.it||(e.shiftKey&&o.s>=drag.it.s-0.5);
      setGuideD(drag.axis,o,grp?d0+delta:d0);
      o.d=grp?Math.round((d0+delta)*10)/10:d0;
    }
    bump();syncGuides();return;
  }
  if(drag.kind==='lat'){
    const l=cur().lat,g=gridPoint(drag.i,drag.j,l,V.w);
    let dx=(w[0]-g.rx)/V.w,dy=(w[1]-g.ry)/BOX_H;
    if(e.shiftKey){if(Math.abs(dx*V.w)>Math.abs(dy*BOX_H))dy=0;else dx=0;}
    l.dx[drag.i][drag.j]=Math.max(-.12,Math.min(.12,dx));l.dy[drag.i][drag.j]=Math.max(-.08,Math.min(.08,dy));
    bump();syncNodeInfo();return;
  }
  let tx=w[0]-drag.offX,ty=w[1]-drag.offY;
  if(e.shiftKey){if(Math.abs(tx-drag.start[0])>Math.abs(ty-drag.start[1]))ty=drag.start[1];else tx=drag.start[0];}
  if(S.snap&&!e.altKey){tx=Math.round(tx/S.snapStep)*S.snapStep;ty=Math.round(ty/S.snapStep)*S.snapStep;}
  setNodeDisplay(drag.hit,tx,ty);
  bump();syncNodeInfo();
}
function onUp(){
  if(drag&&drag.kind==='guide'&&drag.it.k==='x'){
    const it=drag.it,x=it.s+it.d;
    const pos=drag.axis==='v'?toS(x,0)[0]:toS(0,x)[1];
    const lim=drag.axis==='v'?V.cw:V.ch;
    if(pos<V.rul||pos>lim){removeCustom(drag.axis,it);bump();}
  }
  const was=drag;drag=null;if(was&&was.kind==='guide')syncPanel();
}
function onDbl(e){
  const [sx,sy]=pt(e);if(S.mode==='points'&&hitPoints(sx,sy))return;
  const g=hitGuide(sx,sy);if(!g)return;snap();
  if(g.it.k==='x'||g.it.k==='y')removeCustom(g.axis,g.it);else setGuideD(g.axis,g.it,0);
  bump();syncPanel();
}
function onWheel(e){
  e.preventDefault();
  const [sx,sy]=pt(e);const z0=S.view.zoom,z1=Math.max(0.4,Math.min(8,z0*(e.deltaY<0?1.12:1/1.12)));
  const f=z1/z0,scn=V.sc*f;
  const oxn=sx-(sx-V.ox)*f,oyn=sy-(sy-V.oy)*f;
  S.view.px=oxn-(V.cw/2-V.wc*scn/2);S.view.py=oyn-viewOY();
  S.view.zoom=z1;schedule();
}
function onKey(e){
  /* ползунок в фокусе не принимает текст: Ctrl+Z / Ctrl+Shift+Z работают и на нём (поля ввода и списки оставляют свою отмену) */
  const rng=e.target&&e.target.matches&&e.target.matches('input[type=range]');
  if(!rng&&e.target.closest&&e.target.closest('input,textarea,select'))return;
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key.toLowerCase()==='z'||e.code==='KeyZ')){e.preventDefault();if(e.shiftKey){if(typeof redo==='function')redo();}else undo();return;}
  if(rng)return;
  if(S.tab!=='edit'||S.mode!=='points'||!S.node||S.node.lat)return;
  const step=e.shiftKey?10:1;let dx=0,dy=0;
  if(e.key==='ArrowLeft')dx=-step;else if(e.key==='ArrowRight')dx=step;else if(e.key==='ArrowUp')dy=step;else if(e.key==='ArrowDown')dy=-step;
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();resetNode();return;}
  else return;
  e.preventDefault();snap();
  const pos=nodePos(S.node);setNodeDisplay(S.node,pos.x+dx,pos.y+dy);bump();syncNodeInfo();
}
/* ---------- панель ---------- */
function ctxText(ch){const k=GL[ch]&&GL[ch].k,cyr=/[А-яЁёІЇЄҐіїєґ]/.test(ch),num=/[0-9]/.test(ch);
  if(num)return '10'+ch+'01 '+ch+'0'+ch+'1\nH'+ch+'HO'+ch+'O';
  if(k==='xh')return (cyr?'нн'+ch+'нн оо'+ch+'оо\nн'+ch+'о'+ch+'н':'nn'+ch+'nn oo'+ch+'oo\nn'+ch+'o'+ch+'n');
  return (cyr?'НН'+ch+'НН ОО'+ch+'ОО\nН'+ch+'О'+ch+'Н':'HH'+ch+'HH OO'+ch+'OO\nH'+ch+'O'+ch+'H');}
function selectGlyph(ch){S.sel=ch;S.view={zoom:1,px:0,py:0};/* «По размеру» при смене знака */if(S.ctx){S.text=ctxText(ch);const t=$('#txt');if(t)t.value=S.text;}S.node=null;S.hover=null;syncPanel();schedule();$$('.gb').forEach(b=>b.classList.toggle('on',b.dataset.ch===ch));
  if(S.tab==='edit'){const b=$('.gb.on'),bx=$('#glyphs');if(b&&bx){/* прокручивается только список знаков, а не вся страница (на телефоне она уезжала вниз, и кнопки экспорта оказывались над экраном) */
    const r=b.getBoundingClientRect(),c=bx.getBoundingClientRect();if(r.top<c.top)bx.scrollTop-=c.top-r.top;else if(r.bottom>c.bottom)bx.scrollTop+=r.bottom-c.bottom;}}}
const fmt=(k,v)=>{v=+v;if(!isFinite(v))v=0;/* нет значения (старый проект) — 0, а не NaN */
  if(k==='term')return ['Круглые','Плоские','Срез','Капля'][Math.max(0,Math.min(3,Math.round(v)))];
  return (k==='diag'||k==='round'||k==='kappa'||k==='innerR'||k==='tens')?v.toFixed(2):(k==='slant'?v.toFixed(1)+'°':String(Math.round(v*10)/10));};
const PDESC={kwt:'Насыщенность: толщина стоек в единицах на 1000. Безопасный предел не даёт закрыть линзовидные просветы.',kct:'Контраст: насколько горизонтальные штрихи тоньше стоек.',ksr:'Острота засечек: клиновидные засечки длиннее и ниже (острее) или короче и выше (мягче).',ksw:'Росчерки: длина хвоста у R перед круглой буквой и у Я после круглой.',kwd:'Ширина: насколько широки буквы; стойки при этом не утолщаются.',kap:'Апрош: добавка к полям между соседними буквами, единицы на 1000.',tsw:'Толщина линии, % высоты прописных: одна для всех букв. Безопасный предел не даёт закрыть просветы.',trd:'Скругление: радиус внешних углов скобок и чаш; 0 — острые углы, 100 — полукруглые чаши.',tbs:'Базовая ширина: насколько широки все буквы до растяжки.',tap:'Апрош: расстояние между соседними буквами, % высоты прописных.',tst:'Растяжка: во сколько раз растянута каждая буква сама по себе; диагональные буквы упираются в ×2, знаки не тянутся.',tlg:'Межстрочный в блоке: расстояние между строками блока; выносные элементы строки не задеваются.',nlw:'Толщина линии — от тонкой нити до жирной монолинии. Меняется только этим ползунком и кнопками «Толщина» в пресетах.',nwd:'Ширина букв: от узких до широких, толщина линии не меняется.',nwob:'Дрожь руки: насколько кривит и ведёт линию рука; 0 — ровные штрихи.',njn:'Стыки: насколько концы штрихов заходят друг за друга в местах соединения.',nseed:'Вариант: другая «рука», другой набор кривизны штрихов.',zrnd:'Скругление: радиус всех углов, выпуклых целиком, вогнутых вдвое меньше.',zgap:'Зазор сцепки: ширина щели в сцепленных буквах и белого между соседними.',zjump:'Скачут строчные: размах прыжка строчных букв вверх и вниз от строки.',zlig:'Сцепки: обычные, все или выключены.',ctear:'Рваный край: насколько края кусков оборваны, а не отрезаны ножницами.',cgap:'Зазоры между кусками буквы: 0 — склеены, больше — мозаика.',clap:'Нахлёст: на сколько куски заходят друг на друга концами.',cpcs:'Количество кусочков: сколько частей получается из длинных элементов буквы.',csharp:'Острота резов: острые или тупые углы кусков.',csoft:'Мягкие резы: насколько гнутся края и дуги.',cjit:'Неровность: кривизна и сдвиг каждого куска.',cscat:'Разброс размера: различие в высоте и ширине букв.',clean:'Разброс наклона: на сколько градусов буквы наклонены вразнобой.',cbj:'Скачет строка: разброс букв по высоте относительно строки.',cseed:'Вариант: другой набор случайных резов.',wdth:'Общая ширина всех знаков: чем больше, тем шире буквы.',capH:'Высота прописных букв (рост прописных).',xh:'Высота строчных без выносных элементов.',
  asc:'Высота верхних выносных элементов: b, d, f, h, k, l.',desc:'Глубина нижних выносных элементов: g, p, q, y, у, р.',
  stem:'Толщина основных штрихов — стволов букв, главная «масса» шрифта.',hair:'Толщина соединительных штрихов: перекладин, верха и низа овалов.',
  diag:'Толщина диагоналей относительно основных штрихов.',round:'Насколько овалы круглые: 1 — почти круг, меньше — скруглённый квадрат.',
  kappa:'Натяжение кривых: 0 — фаска, 0.55 — дуга круга, больше — «квадратнее».',innerR:'Скругление внутрибуквенных просветов.',
  ov:'Свисание овалов: насколько круглые знаки выходят за линии, чтобы казаться вровень с прямыми.',
  aper:'Апертура — насколько широко раскрыты концы у С, Э, З, e, s, 2, 3, 5, 6.',bar:'Высота средних перекладин Н, Е, В, Э, З (оптический центр около 53%).',
  mv:'Апекс М — высота средней вершины у М.',join:'Присоединение: сужение там, где дуга входит в ствол (n, h, b, d, u), чтобы стык не заплывал в жирном.',
  spur:'Размер росчерков у прописных: 0 — без украшений.',trap:'Ловушки для краски — вырезы в острых внутренних углах, они держат форму в жирном начертании.',
  optic:'Оптика: утолщение овалов там, где они кажутся тоньше прямых штрихов.',slant:'Угол наклона курсива в градусах.',
  icomp:'Поворачивает ручки овалов против наклона, чтобы курсив не выглядел просто «скошенным».',
  sb:'Полуапроши — боковые поля букв: расстояние от штриха до соседней буквы.',opsp:'Оптические отступы: круглые и открытые стороны ставятся плотнее, чтобы ритм текста был ровным.',
  track:'Трекинг — равномерная прибавка или убавка ко всем полям.',space:'Межсловный пробел: ширина пробела между словами.',
  flare:'Раструб — расширение ствола к концу, как у пера с нажимом.',slope:'Угол наклона тонких перекладин в градусах.',
  point:'Остриё полуовалов: насколько заострена вершина у овальных букв.',drop:'Каплевидные элементы — короткие капли на концах перекладин.',
  cham:'Фаска углов и срезов: насколько скошены углы.',spk:'Длина лезвий — острых выступов у букв.',fury:'Острота лезвий: чем больше, тем они тоньше и злее.',
  lean:'Наклон лезвий: вниз или вдоль строки.',spkU:'Доля лезвий на верхних концах букв.',spkD:'Доля лезвий на нижних концах стволов (ножках).',
  spkS:'Доля лезвий на концах перекладин.',sym:'Симметрия: насколько правые лезвия повторяют левые.',persp:'Перспектива: знак сужается кверху или книзу, как трапеция.',
  blade:'Скорость: насколько удлинены левые лезвия, будто буквы мчатся.'};
/* диапазон ползунка: покрывает значение по умолчанию обоих начертаний (иначе старт «за дорожкой») */
function sliderRange(key,min,max,step){
  const D=typeof DEFAULTS==='object'&&DEFAULTS?DEFAULTS:{};
  for(const st of ['regular','italic']){const v=D[st]&&D[st][key];if(v==null||!isFinite(+v))continue;
    if(+v>max)max=+(Math.ceil((+v-min)/step-1e-9)*step+min).toFixed(4);
    if(+v<min)min=+(Math.floor((+v-min)/step+1e-9)*step+min).toFixed(4);}
  return [min,max];
}
let KB_BURST=0;
/* ползунки без действия: aper у Строки не меняет ни одного знака (скрыт); icomp работает только при наклоне, drip у Капли — только при сильном растекании (приглушены, с подсказкой) */
const DEAD_SLIDERS={stroka:['aper']};
const IDLE_RULES={
  icomp:{off:p=>!(Math.abs(+p.slant)>0.01),hint:'Действует только при наклоне: задайте угол наклона выше нуля'},
  drip:{off:p=>(+p.melt||0)<65,hint:'Капли появляются, когда растекание не меньше 65 %'}};
function syncIdle(){const p=cur().p;
  for(const key in IDLE_RULES){const i=$('#p_'+key);if(!i)continue;const row=i.closest('.ctl'),r=IDLE_RULES[key],off=!!r.off(p),h=row.querySelector('.idh');
    row.classList.toggle('idle',off);if(h){h.textContent=off?r.hint:'';h.hidden=!off;}}}
function valEdit(key,out,inp){
  if(out.dataset.ed==='1'||key==='term')return;out.dataset.ed='1';
  const vi=document.createElement('input');vi.type='number';vi.className='vin';vi.inputMode='decimal';
  vi.min=inp.min;vi.max=inp.max;vi.step=inp.step;vi.value=inp.value;vi.setAttribute('aria-label',(out.closest('label').querySelector('span')||{}).textContent+': значение');
  out.hidden=true;out.parentNode.insertBefore(vi,out.nextSibling);vi.focus();vi.select();
  let done=false;
  const end=ok=>{if(done)return;done=true;
    if(ok){const raw=parseFloat(String(vi.value).replace(',','.'));
      if(isFinite(raw)){const mn=+inp.min,mx=+inp.max,st=+inp.step||1;let v=Math.max(mn,Math.min(mx,raw));v=+(Math.round((v-mn)/st)*st+mn).toFixed(4);v=Math.max(mn,Math.min(mx,v));
        if(Math.abs(v-+inp.value)>1e-9){snap();inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));}}}
    vi.remove();out.hidden=false;delete out.dataset.ed;};
  vi.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();end(true);inp.focus();}else if(e.key==='Escape'){e.preventDefault();end(false);inp.focus();}});
  vi.addEventListener('blur',()=>end(true));
  vi.addEventListener('click',e=>e.stopPropagation());
}
function resetSlider(key){snap();cur().p[key]=DEFAULTS[S.style][key];syncPanel();bump();}
function buildPanel(){
  TRK_SIG='';const box=$('#params');box.innerHTML='';let grp=null,gdiv=null;
  const ovr=FONTS[CUR_FONT].params||{};
  for(const [key,label0,min0,max0,step0,group] of PARAMS){
    const ov=ovr[key];if(ov===null||(DEAD_SLIDERS[CUR_FONT]||[]).includes(key))continue;
    const [label,min1,max1,step]=Array.isArray(ov)?ov:[label0,min0,max0,step0];
    const [min,max]=sliderRange(key,min1,max1,step);
    if(group!==grp){grp=group;gdiv=document.createElement('div');gdiv.className='grp';gdiv.innerHTML='<h5>'+group+'</h5>';box.appendChild(gdiv);}
    const row=document.createElement('div');row.className='ctl';
    row.innerHTML='<label for="p_'+key+'"><span>'+label+'</span><button type="button" class="rst" tabindex="-1" hidden title="Вернуть значение по умолчанию (двойной щелчок по подписи — то же)" aria-label="Вернуть «'+label+'» по умолчанию">↺</button><output id="o_'+key+'" class="vo" title="Нажмите, чтобы ввести число"></output></label><input type="range" id="p_'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" data-min0="'+min+'" data-max0="'+max+'"><small class="limh" id="h_'+key+'" hidden></small><small class="limh idh" hidden></small>';
    if(PDESC[key])row.title=PDESC[key];
    gdiv.appendChild(row);
    const inp=row.querySelector('input'),out=row.querySelector('output');
    inp.addEventListener('input',()=>{let v=+inp.value;const lm=limOf(key);
      /* динамический предел: ползунок не уходит за границу, где знаки ломаются (safeP) */
      if(lm){const c=Math.max(lm[0],Math.min(lm[1],v));if(c!==v){v=Math.round(c/step)*step;if(v>lm[1])v-=step;if(v<lm[0])v+=step;v=+v.toFixed(4);inp.value=v;}}
      cur().p[key]=v;$('#o_'+key).textContent=fmt(key,v);limHint(key,lm&&(v<=lm[0]+step*0.99&&lm[0]>min+1e-9?v:v>=lm[1]-step*0.99&&lm[1]<max-1e-9?v:null));
      bump();syncMethodsSoon();syncLimits(key);syncReset(key);syncIdle();});
    inp.addEventListener('change',()=>{syncTracks();});
    inp.addEventListener('pointerdown',()=>{KB_BURST=0;snap();});
    /* клавиатура: серия шагов стрелками — один шаг отмены (новая серия после паузы 700 мс) */
    inp.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;
      if(!/^(Arrow(Left|Right|Up|Down)|Page(Up|Down)|Home|End)$/.test(e.key))return;
      if(!KB_BURST)snap();clearTimeout(KB_BURST);KB_BURST=setTimeout(()=>{KB_BURST=0;},700);});
    inp.addEventListener('blur',()=>{clearTimeout(KB_BURST);KB_BURST=0;});
    row.querySelector('label').addEventListener('dblclick',e=>{if(e.target.closest('.vin'))return;resetSlider(key);});
    row.querySelector('.rst').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();resetSlider(key);inp.focus({preventScroll:true});});
    out.setAttribute('role','button');out.tabIndex=0;
    out.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();valEdit(key,out,inp);});
    out.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();valEdit(key,out,inp);}});
  }
}
/* ↺ у ползунка: только когда значение отличается от значения по умолчанию */
function syncReset(only){
  const D=DEFAULTS[S.style]||DEFAULTS.regular,p=cur().p;
  for(const [key] of PARAMS){if(only&&key!==only)continue;const i=$('#p_'+key);if(!i)continue;const b=i.closest('.ctl').querySelector('.rst');if(!b)continue;
    const d=D[key],v=p[key];b.hidden=!(d!=null&&v!=null&&Math.abs(+v-+d)>1e-9);}
}
/* дорожка = действующий предел (paramLimits при текущих настройках): значение всегда там, где ползунок. Обновляется после отпускания, смены начертания, пресета, отмены */
function syncTracks(force){const sig=CUR_FONT+'|'+S.style+'|'+JSON.stringify(cur().p);if(!force&&sig===TRK_SIG)return;const r=limAll();if(!r)return;TRK_SIG=sig;
  for(const [key] of PARAMS){const i=$('#p_'+key);if(!i||i.dataset.min0==null)continue;
    const mn0=+i.dataset.min0,mx0=+i.dataset.max0,st=+i.step||1,lm=r.L[key];let lo=mn0,hi=mx0;
    if(lm){lo=Math.max(mn0,+(Math.ceil((lm[0]-mn0)/st-1e-9)*st+mn0).toFixed(4));hi=Math.min(mx0,+(Math.floor((lm[1]-mn0)/st+1e-9)*st+mn0).toFixed(4));if(!(hi>lo)){lo=mn0;hi=mx0;}}
    if(+i.min!==lo)i.min=lo;if(+i.max!==hi)i.max=hi;}
  syncLimits();
}
/* ---------- динамические пределы ползунков (взаимозависимые ограничения safeP/paramLimits) ---------- */
function limAll(){try{return typeof paramLimits==='function'?paramLimits(cur().p):null;}catch(e){return null;}}
function limOf(key){const r=limAll();return r&&r.L[key]?r.L[key]:null;}
/* подсказка под ползунком — только когда значение упёрлось в динамический предел */
function limHint(key,at){const h=$('#h_'+key);if(!h)return;if(at==null){h.hidden=true;return;}
  h.textContent='Предел при текущих настройках: '+fmt(key,at)+' — дальше знаки теряют форму';h.hidden=false;}
/* зона допустимых значений на дорожке; показ фактического (зажатого) значения, если его ограничили другие параметры */
function syncLimits(except){const r=limAll();if(!r)return;
  for(const [key] of PARAMS){const i=$('#p_'+key);if(!i)continue;const lm=r.L[key],mn=+i.min,mx=+i.max,sp=mx-mn||1;
    const lo=lm?Math.max(0,Math.min(100,(lm[0]-mn)/sp*100)):0,hi=lm?Math.max(lo,Math.min(100,(lm[1]-mn)/sp*100)):100;
    i.style.setProperty('--lo',lo.toFixed(2)+'%');i.style.setProperty('--hi',hi.toFixed(2)+'%');i.classList.toggle('lim',lo>0.05||hi<99.95);
    if(key===except)continue;
    const raw=cur().p[key],eff=r.q[key],o=$('#o_'+key);if(raw==null||eff==null||!o)continue;
    const clamped=Math.abs(+eff-+raw)>1e-6;o.classList.toggle('clamp',clamped);
    if(clamped){i.value=eff;o.textContent=fmt(key,eff);o.title='Ограничено другими параметрами (задано '+fmt(key,raw)+')';limHint(key,+eff);}
    else{o.title='';const h=$('#h_'+key);if(h&&!h.hidden&&key!==except)h.hidden=true;}}}
/* ---------- методы конструкции ---------- */
const METHODS_VOLT=[
  ['Контраст штриха','Соотношение вертикалей и горизонталей: классический, монолинейный, обратный контраст.',[
    ['Монолиния',{hair:p=>p.stem}],['Нуар',{stem:190,hair:62}],['Резкий',{stem:232,hair:38}],['Обратный',{stem:112,hair:150}],['Ультра',{stem:290,hair:90}]]],
  ['Форма углов','Конструкция внешних углов: острый, фаска (октагональный), радиус, сквиркл.',[
    ['Острые',{round:0}],['Фаска',{round:1,kappa:0}],['Радиус',{round:1,kappa:0.5523}],['Сквиркл',{round:1,kappa:0.86}],['Круглые',{round:1.6,kappa:0.5523}]]],
  ['Внутренние углы','Скругление внутренних вырезов и просветов: резкое, как снаружи, увеличенное.',[
    ['Резкие',{innerR:0}],['Как снаружи',{innerR:1}],['Увеличенные',{innerR:2.2}]]],
  ['Архитектура пропорций','Соотношение высот: гротеск, высокие строчные, классика, плакат.',[
    ['Гротеск',{capH:700,xh:500,asc:760,desc:210}],['Высокий x',{capH:700,xh:565,asc:740,desc:190}],['Классика',{capH:700,xh:440,asc:800,desc:240}],['Плакат',{capH:770,xh:560,asc:810,desc:170}]]],
  ['Ширина семейства','Общий масштаб ширины знаков.',[
    ['Узкий',{wdth:78}],['Обычный',{wdth:100}],['Широкий',{wdth:128}],['Экстра',{wdth:160}]]],
  ['Метод масштабирования','Что происходит со штрихами при изменении ширины: фиксированная толщина (скелет) или пропорциональное растяжение контура.',[
    ['Штрихи фиксированы',{stemScale:0}],['Растут с шириной',{stemScale:1}]]],
  ['Оптическая компенсация','Утолщение горизонталей в овалах и дугах, чтобы они казались такими же, как прямые.',[
    ['Нет',{optic:0}],['Умеренная',{optic:10}],['Сильная',{optic:22}]]],
  ['Засечки-шпоры','Длина острых выступов на концах штрихов: от нулевых до заметных.',[
    ['Нет',{spur:0}],['Короткие',{spur:80}],['Обычные',{spur:120}],['Длинные',{spur:220}]]],
  ['Метод интервала','Пропорциональный интервал, табличные цифры или моноширинная сетка.',[
    ['Пропорц.',{tabular:0,mono:0}],['Табл. цифры',{tabular:1,mono:0}],['Моно 700',{mono:700}],['Моно 820',{mono:820}]]],
];
/* Ренессанс: свои пресеты в пределах его ползунков (раньше брался набор Вольта, и 66 из 68 чипов выходили за диапазоны) */
const METHODS_RENESSA=[
  ['Характер','Готовые системы книжной антиквы на одном скелете.',[
    ['Книжная',{stem:82,hair:25,ser:42,brk:40,hsl:24,ball:60,fla:40}],
    ['Плотная',{stem:88,hair:26,ser:52,brk:40,hsl:30,ball:50,fla:50}],
    ['Светлая',{stem:70,hair:16,ser:34,brk:20,hsl:18,ball:40,fla:20}],
    ['Контрастная',{stem:80,hair:14,ser:46,brk:30,hsl:24,ball:65,fla:30}]]],
  ['Контраст штриха','Тонкие штрихи относительно основных.',[
    ['Мягкий',{stem:80,hair:26}],['Книжный',{stem:82,hair:25}],['Заметный',{stem:80,hair:20}],['Резкий',{stem:80,hair:14}]]],
  ['Засечки','Длина засечек и плавность кронштейна.',[
    ['Короткие',{ser:30,brk:10}],['Обычные',{ser:42,brk:40}],['Длинные',{ser:52,brk:40}]]],
  ['Окончания','Каплевидные окончания и раструб стволов.',[
    ['Сдержанные',{ball:30,fla:10}],['Книжные',{ball:60,fla:40}],['Выразительные',{ball:65,fla:50}]]],
  ['Пропорции','Соотношение высот: компактная, классическая, высокая строчная.',[
    ['Компактная',{capH:680,xh:430,asc:720,desc:210}],['Классика',{capH:700,xh:450,asc:745,desc:230}],['Высокий x',{capH:700,xh:490,asc:760,desc:220}]]],
  ['Ширина','Общий масштаб ширины знаков.',[
    ['Узкий',{wdth:97}],['Обычный',{wdth:100}],['Широкий',{wdth:106}]]],
  ['Угол пера','Ось пера: от неё зависит, где штрихи толще.',[
    ['Пологий',{nib:4}],['Книжный',{nib:7}],['Крутой',{nib:14}]]],
  ['Поля и ритм','Боковые поля букв.',[
    ['Плотные',{sb:26}],['Обычные',{sb:36}],['Просторные',{sb:60}]]],
];
const METHODS_BY_FONT={renessa:METHODS_RENESSA};
/* Пресеты шрифта в пределах его safeP: значения, которых чип не может достичь из исходных настроек обоих начертаний, подтягиваются к ближайшему достижимому
   (иначе чип обещает одно, а в проект и на экран попадает другое). Считается один раз на шрифт; функции (hair от stem) остаются как есть. */
const METHODS_FIXED={};
function methodsRaw(){const f=FONTS[CUR_FONT];return f.methods||METHODS_BY_FONT[CUR_FONT]||METHODS_VOLT;}
function methodsFix(raw){
  const ovr=FONTS[CUR_FONT].params||{},stepOf=k=>{const o=ovr[k];if(Array.isArray(o))return o[3]||1;const r=PARAMS.find(x=>x[0]===k);return r?r[4]:1;};
  const sts=['regular','italic'].filter(st=>DEFAULTS[st]);
  return raw.map(m=>[m[0],m[1],m[2].map(o=>{
    const fixed={};
    for(const k in o[1]){const c0=o[1][k],st=stepOf(k);
      let cap=null,flo=null;
      for(const sty of sts){const D=DEFAULTS[sty],nv=chipClaim(m,o,D,sty);let q;try{q=safeP(Object.assign({},D,nv));}catch(e){q=nv;}
        const c=nv[k],qv=+q[k];if(!isFinite(qv))continue;
        if(qv<c-1e-6)cap=cap==null?qv:Math.min(cap,qv);else if(qv>c+1e-6)flo=flo==null?qv:Math.max(flo,qv);}
      if(cap==null&&flo==null){fixed[k]=c0;continue;}
      /* предел из исходных настроек обоих начертаний; значение зажимается внутрь по шагу ползунка. Функции (hair от stem) остаются функциями */
      if(cap!=null)cap=+(Math.floor(cap/st+1e-9)*st).toFixed(4);if(flo!=null)flo=+(Math.ceil(flo/st-1e-9)*st).toFixed(4);
      fixed[k]=p=>{let x=typeof c0==='function'?c0(p):c0;if(cap!=null&&x>cap)x=cap;if(flo!=null&&x<flo)x=flo;return x;};}
    return [o[0],fixed];})]);
}
function methodsNow(){
  const f=FONTS[CUR_FONT];if(f.imported)return methodsRaw();
  const key=CUR_FONT;let r=METHODS_FIXED[key];if(r&&r.raw===methodsRaw())return r.m;
  let m;try{m=methodsFix(methodsRaw());}catch(e){m=methodsRaw();}
  METHODS_FIXED[key]={raw:methodsRaw(),m};return m;
}
/* Значения, которые чип требует от текущих параметров (функции считаются от текущих p; курсивный «Контраст штриха» на 4 легче) */
function chipClaim(m,o,p,style){style=style||S.style;const nv={};for(const k in o[1]){const v=o[1][k];nv[k]=typeof v==='function'?v(p):v;}
  if(style==='italic'&&m[0]==='Контраст штриха'&&nv.stem)nv.stem-=4;return nv;}
/* Что получится на самом деле: safeP зажимает значения пределами; чип «включён» только при точном совпадении
   (допуск — шум плавающей точки; для перечислений допуска нет вовсе). Чипы, дающие один и тот же результат, — дубли и отключаются. */
function chipState(m,p,eff){
  const keys=[...new Set(m[2].flatMap(o=>Object.keys(o[1])))];
  const info=m[2].map(o=>{const nv=chipClaim(m,o,p);let q;try{q=safeP(Object.assign({},p,nv));}catch(e){q=Object.assign({},p,nv);}
    const reach=Object.keys(nv).every(k=>Math.abs((+q[k]||0)-(+nv[k]||0))<=1e-6);
    const same=keys.every(k=>Math.abs((+eff[k]||0)-(+q[k]||0))<=1e-6);
    return {nv,q,reach,same,sig:keys.map(k=>(+q[k]||0).toFixed(4)).join('|')};});
  const rep={};info.forEach((x,i)=>{const r=rep[x.sig];if(r==null||(!info[r].reach&&x.reach))rep[x.sig]=i;});
  info.forEach((x,i)=>{x.dup=rep[x.sig]!==i?rep[x.sig]:-1;x.on=x.reach&&x.same&&x.dup<0;x.off=x.dup>=0||(x.same&&!x.reach);});
  return info;
}
function buildMethods(){
  METH_SIG='';const box=$('#methods');box.innerHTML='';
  methodsNow().forEach((m,mi)=>{
    const d=document.createElement('div');d.className='meth';
    d.innerHTML='<h5>'+m[0]+'</h5><div class="row" data-m="'+mi+'"></div>';
    const row=d.querySelector('.row');
    m[2].forEach((o,oi)=>{
      const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=o[0];b.dataset.o=oi;b.title=m[1];
      b.addEventListener('click',()=>{if(b.disabled)return;snap();const p=cur().p;const nv=chipClaim(m,o,p);
        /* в проект пишется то, что получится после пределов, а не недостижимое значение */
        let q=null;try{q=safeP(Object.assign({},p,nv));}catch(e){}
        if(q)for(const k in nv){if(Math.abs((+q[k]||0)-(+nv[k]||0))>1e-6)nv[k]=q[k];}
        Object.assign(p,nv);syncPanel();bump();});
      row.appendChild(b);
    });
    box.appendChild(d);
  });
}
let METH_SIG='',TRK_SIG='';
function syncMethods(force){
  const p=cur().p;const sig=CUR_FONT+'|'+S.style+'|'+JSON.stringify(p);if(!force&&sig===METH_SIG)return;METH_SIG=sig;let eff;try{eff=safeP(Object.assign({},p));}catch(e){eff=p;}
  const ms=methodsNow();
  $$('#methods .meth').forEach((d,mi)=>{const m=ms[mi];if(!m)return;const st=chipState(m,p,eff);
    $$('.chip',d).forEach(b=>{const x=st[+b.dataset.o];if(!x)return;
      b.classList.toggle('on',x.on);b.classList.toggle('cl',!x.reach&&!x.off);b.disabled=x.off;b.setAttribute('aria-pressed',x.on?'true':'false');
      b.title=x.dup>=0?'То же, что «'+m[2][x.dup][0]+'», при текущих настройках':x.same&&!x.reach?'Уже на пределе: дальше не изменится':!x.reach?m[1]+' Часть значений ограничена текущими настройками.':m[1];});
  });
}
/* во время перетаскивания пересчёт чипов (десятки вызовов safeP) откладывается до паузы */
let MT=0;
function syncMethodsSoon(){clearTimeout(MT);MT=setTimeout(()=>{try{syncMethods();}catch(e){}},140);}
/* ---------- списки направляющих и частей ---------- */
function syncGuides(){
  const G=gstate();
  const mk=(box,list,axis)=>{
    if(!box.__rows)box.__rows=0;
    box.innerHTML='';
    list.forEach(it=>{
      const r=document.createElement('div');r.className='grow';
      const nm=axis==='v'?(VG_NAME[it.k]||'своя'):(HG_NAME[it.k]||'своя');
      r.innerHTML='<span class="gn'+(Math.abs(it.d)>0.4?' mv':'')+'">'+nm+'</span><input type="number" step="1" value="'+Math.round((it.s+it.d)*10)/10+'" aria-label="'+nm+'"><button type="button" class="ic" title="Вернуть" aria-label="Вернуть">↺</button>'+(it.k==='x'||it.k==='y'?'<button type="button" class="ic del" title="Удалить" aria-label="Удалить">✕</button>':'');
      const inp=r.querySelector('input');
      inp.addEventListener('focus',()=>snap());
      inp.addEventListener('change',()=>{const v=parseFloat(inp.value);if(!isFinite(v))return;setGuideD(axis,it,v-it.s);bump();syncGuides();});
      r.querySelector('.ic').addEventListener('click',()=>{snap();if(it.k==='x'||it.k==='y')removeCustom(axis,it);else setGuideD(axis,it,0);bump();syncGuides();});
      const dl=r.querySelector('.del');if(dl)dl.addEventListener('click',()=>{snap();removeCustom(axis,it);bump();syncGuides();});
      box.appendChild(r);
    });
  };
  mk($('#vg'),G.vg,'v');mk($('#hg'),G.hg,'h');
}
function syncParts(){
  const box=$('#parts-list');const raw=rawGlyph();box.innerHTML='';
  if(!raw||!raw.cs.length){box.innerHTML='<p class="hint">У знака нет контуров.</p>';return;}
  raw.cs.forEach((cn,ci)=>{
    const l=document.createElement('label');l.className='part'+(cn.off?' off':'');
    l.innerHTML='<input type="checkbox"'+(cn.off?'':' checked')+'><i style="background:hsl('+PART_HUE(ci)+',80%,60%)"></i><span>'+(ci+1)+' · '+(cn.hole?'отверстие':'часть')+' · '+cn.nodes.length+' уз.</span>';
    l.addEventListener('mouseenter',()=>{S.hover=ci;schedule();});l.addEventListener('mouseleave',()=>{S.hover=null;schedule();});
    l.querySelector('input').addEventListener('change',e=>{snap();const E=ed();const off=(E.off||[]).slice();const ix=off.indexOf(ci);
      if(e.target.checked){if(ix>=0)off.splice(ix,1);}else if(ix<0)off.push(ci);
      if(off.length)E.off=off;else delete E.off;cleanEdit();S.node=null;bump();syncParts();});
    box.appendChild(l);
  });
}
function syncPanel(){
  try{syncTracks();}catch(e){}
  for(const [key] of PARAMS){const i=$('#p_'+key);if(i){const v=isFinite(+cur().p[key])&&cur().p[key]!=null?+cur().p[key]:0;i.value=v;$('#o_'+key).textContent=fmt(key,v);}}
  syncLimits();syncReset();syncIdle();
  const nm=S.sel===' '?'пробел':(S.sel.charCodeAt(0)===160?'nbsp':S.sel==='\u2009'?'тонкий пробел':S.sel==='\u202f'?'узкий nbsp':S.sel);
  $('#gname').textContent=nm;
  const e=S.edits[S.sel]||{};
  $('#sbL').value=e.sbL||0;$('#sbR').value=e.sbR||0;$('#oL').textContent=e.sbL||0;$('#oR').textContent=e.sbR||0;
  $('#wm').value=e.wm||100;$('#oW').textContent=(e.wm||100)+'%';
  $$('[data-style]').forEach(b=>b.classList.toggle('on',b.dataset.style===S.style));
  $$('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===S.mode));
  $$('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  $('#fam').value=S.family;$('#txt').value=S.text;requestAnimationFrame(autosizeTxt);$('#tsz').value=S.specSize;$('#osz').textContent=S.specSize+' px';
  $('#snap').checked=S.snap;$('#snapstep').value=S.snapStep;$('#gd').checked=S.guides;$('#pts').checked=S.parts;
  $('#refon').checked=S.ref.on;$('#refsc').value=S.ref.scale;$('#orefsc').textContent=S.ref.scale+'%';
  syncMethods();syncGuides();syncParts();syncNodeInfo();
}
function syncNodeInfo(){
  const el=$('#ninfo'),has=S.node&&!S.node.lat&&S.mode==='points';
  $('#nbtns').style.visibility=has?'visible':'hidden';
  if(S.mode==='grid'||!S.node||S.node.lat){el.textContent='';return;}
  const raw=rawGlyph();const n=raw&&raw.cs[S.node.ci]&&raw.cs[S.node.ci].nodes[S.node.ni];if(!n)return;
  const p=S.node.part==='p'?n:(n[S.node.part]||n);
  el.textContent='x '+Math.round(p.x)+'  y '+Math.round(p.y);
}
/* ---------- пресеты сетки ---------- */
const PRESETS={
  flat:()=>newLattice(),
  waist:()=>{const l=newLattice();l.dx[0][2]=.13;l.dx[4][2]=-.13;l.dx[0][1]=.04;l.dx[4][1]=-.04;l.dx[0][3]=.04;l.dx[4][3]=-.04;return l;},
  barrel:()=>{const l=newLattice();l.dx[0][2]=-.09;l.dx[4][2]=.09;l.dx[0][1]=-.03;l.dx[4][1]=.03;l.dx[0][3]=-.03;l.dx[4][3]=.03;return l;},
  cone:()=>{const l=newLattice();for(let j=0;j<LAT_N;j++){const k=j/(LAT_N-1)*.12;l.dx[0][j]=k;l.dx[4][j]=-k;}return l;},
  funnel:()=>{const l=newLattice();for(let j=0;j<LAT_N;j++){const k=(1-j/(LAT_N-1))*.12;l.dx[0][j]=k;l.dx[4][j]=-k;}return l;},
  wave:()=>{const l=newLattice();for(let j=0;j<LAT_N;j++){const k=Math.sin(j/(LAT_N-1)*Math.PI*2)*.07;for(let i=0;i<LAT_N;i++)l.dx[i][j]=k;}return l;},
  flare:()=>{const l=newLattice();l.dx[0][0]=-.05;l.dx[4][0]=.05;l.dx[0][4]=-.05;l.dx[4][4]=.05;l.dy[2][4]=.04;l.dy[2][0]=-.04;return l;},
};
