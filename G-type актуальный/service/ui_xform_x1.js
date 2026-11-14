/* ===== XF: общие ручки преобразования (масштаб, форма, поворот) для режимов с выделением =====
   Один компонент на все режимы: «Отрисовать свой шрифт» (Выделение), «Перо» (элементы знака), «Свой знак» (штрихи), знак из файла.
   Режим даёт переходник (adapter), компонент рисует рамку и ручки, ведёт жест и показывает панель W / H / угол.
   Переходник (все координаты мировые — единицы шрифта, y вверх; sx, sy — пиксели холста):
     bbox()            -> {x0,y0,x1,y1} | null     габарит выделения
     key()             -> строка                    личность выделения (при смене угол в панели обнуляется)
     toS(x,y) / fromS(sx,sy)                        мир <-> холст
     begin()           -> токен | false             начало жеста: снимок исходной геометрии и шаг отмены
     apply(m, tok)     -> bool                      геометрия = m(исходная); false — кадр недопустим (пропускается)
     end(tok, moved, m)-> bool                      конец: нормализация, проверка; false — откат
     cancel(tok)                                    Esc: вернуть исходное и убрать шаг отмены
     snap(axis, v)     -> v          (необяз.)      привязка координаты края к сетке режима
     redraw()                                        перерисовать холст
     host              элемент для панели; enabled() -> bool; size() -> [w,h] (необяз.); mirrorEl (необяз.)
   Матрица m = [a,b,c,d,e,f]: x' = a·x + c·y + e, y' = b·x + d·y + f. Поворот > 0 — против часовой (при y вверх). */
const XF=(function(){
'use strict';
const PI=Math.PI,K={hs:8,rr:5,arm:26,pad:7,hit:12,hitT:18,rim:22,min:4,snapDeg:15};
const mI=()=>[1,0,0,1,0,0];
const mMul=(A,B)=>[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]];
const mS=(sx,sy,px,py)=>[sx,0,0,sy,px-sx*px,py-sy*py];
const clean=v=>Math.abs(v)<1e-12?0:Math.abs(Math.abs(v)-1)<1e-12?Math.sign(v):v;
const mR=(th,cx,cy)=>{const c=clean(Math.cos(th)),s=clean(Math.sin(th));return [c,s,-s,c,cx-c*cx+s*cy,cy-s*cx-c*cy];};
const mPt=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
const mDet=m=>m[0]*m[3]-m[1]*m[2];
const mInv=m=>{const d=mDet(m)||1e-12,a=m[3]/d,b=-m[1]/d,c=-m[2]/d,dd=m[0]/d;return [a,b,c,dd,-(a*m[4]+c*m[5]),-(b*m[4]+dd*m[5])];};
const isId=m=>Math.abs(m[0]-1)+Math.abs(m[1])+Math.abs(m[2])+Math.abs(m[3]-1)+Math.abs(m[4])+Math.abs(m[5])<1e-9;
const r2=v=>Math.round(v*100)/100;
/* узлы контура {x,y,a,b} -> новые узлы */
function affNodes(nodes,m){const T=p=>{if(!p)return null;const q=mPt(m,p.x,p.y);return {x:q[0],y:q[1]};};
  return nodes.map(n=>{const q=mPt(m,n.x,n.y),o=Object.assign({},n,{x:q[0],y:q[1],a:T(n.a),b:T(n.b)});return o;});}
/* контуры {hole,nodes}: порядок узлов выправляет mkc (отражение переворачивает обход) */
function affCs(cs,m){return cs.map(c=>{const nodes=affNodes(c.nodes,m);return typeof mkc==='function'?Object.assign(mkc(nodes,c.hole),c.op?{op:c.op}:{},c.grp!=null?{grp:c.grp}:{}):{hole:!!c.hole,nodes};});}
function bboxOfCs(cs){return typeof impBBox==='function'?impBBox(cs):null;}
function union(a,b){if(!a)return b;if(!b)return a;return {x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)};}
/* ---------- значки панели ---------- */
const ICO={fh:'M12 3v18 M8 7l-5 5 5 5z M16 7l5 5-5 5z',fv:'M3 12h18 M7 8l5-5 5 5z M7 16l5 5 5-5z',
  r90:'M4 12a8 8 0 1 0 3-6.2 M4 4v5h5',lock:'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v9H5z',unlock:'M7 11V8a5 5 0 0 1 9.5-1.8 M5 11h14v9H5z'};
const svg=n=>'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+ICO[n]+'"/></svg>';
const ROTCUR='url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke-linecap=\'round\'%3E%3Cpath d=\'M5 12a7 7 0 1 0 2-5 M5 3v5h5\' stroke=\'white\' stroke-width=\'4.2\'/%3E%3Cpath d=\'M5 12a7 7 0 1 0 2-5 M5 3v5h5\' stroke=\'black\' stroke-width=\'2\'/%3E%3C/svg%3E") 12 12, crosshair';
(function(){if(typeof document==='undefined'||document.getElementById('xf-css'))return;const st=document.createElement('style');st.id='xf-css';st.textContent=`
.xf-bar{position:absolute;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:var(--s1) var(--s2);padding:var(--s1) var(--s2);background:var(--surface);color:var(--text);border-radius:var(--r-md);box-shadow:var(--sh-2);font:500 var(--fs-md)/1 var(--f-ui);max-width:calc(100% - 16px);width:max-content;user-select:none;-webkit-user-select:none}
.xf-bar[hidden]{display:none}
.xf-bar .xf-f{display:inline-flex;align-items:center;gap:var(--s1);color:var(--text-2);font-size:var(--fs-sm)}
.xf-bar .xf-f input{width:56px;height:var(--h-sm);border:0;border-radius:var(--r-pill);background:var(--surface-2);color:var(--text);padding:0 var(--s2);font:600 var(--fs-md) var(--f-ui);text-align:center;-moz-appearance:textfield}
.xf-bar .xf-f input:focus{outline:2px solid var(--focus-ring);outline-offset:2px}
.xf-bar .xf-b{width:var(--h-sm);height:var(--h-sm);border-radius:50%;display:grid;place-items:center;flex:none;color:var(--text);background:none;border:0;cursor:pointer;padding:0}
.xf-bar .xf-b:hover{background:var(--surface-3)}
.xf-bar .xf-b.on{background:var(--ink);color:var(--surface)}
.xf-bar .xf-b:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
.xf-bar .xf-sep{width:1px;align-self:stretch;background:var(--line);margin:var(--s1) 0}
.xf-bar .xf-b>.dr-ib{margin:0}
@media (max-width:720px){.xf-bar .xf-b,.xf-bar .xf-f input{height:var(--h-md)}.xf-bar .xf-b{width:var(--h-md)}}
`;document.head.appendChild(st);})();
/* ---------- контроллер ---------- */
function make(a){
  const st={g:null,ang:0,pv:null,key:null,lock:false,hov:null,bar:null};
  const touch=()=>!!(st.g&&st.g.touch)||(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches);
  const accent=()=>{try{const v=getComputedStyle(document.documentElement).getPropertyValue('--sel').trim();return v||'#141416';}catch(e){return '#141416';}};
  /* геометрия рамки в координатах холста */
  function geom(){
    const B=a.bbox();if(!B||!(B.x1>B.x0||B.y1>B.y0))return null;
    const W=B.x1-B.x0,H=B.y1-B.y0;
    const w=[[B.x0,B.y0],[B.x1,B.y0],[B.x1,B.y1],[B.x0,B.y1]],S=w.map(q=>a.toS(q[0],q[1]));
    const mid=[[(B.x0+B.x1)/2,B.y0],[B.x1,(B.y0+B.y1)/2],[(B.x0+B.x1)/2,B.y1],[B.x0,(B.y0+B.y1)/2]],M=mid.map(q=>a.toS(q[0],q[1]));
    const c=a.toS((B.x0+B.x1)/2,(B.y0+B.y1)/2);
    const out=(p)=>{let dx=p[0]-c[0],dy=p[1]-c[1];const l=Math.hypot(dx,dy)||1;return [p[0]+dx/l*K.pad,p[1]+dy/l*K.pad];};
    const corners=S.map(out),edges=M.map(out);
    const len=(i,j)=>Math.hypot(S[i][0]-S[j][0],S[i][1]-S[j][1]);
    const eOk=[len(0,1)>=44,len(1,2)>=44,len(0,1)>=44,len(1,2)>=44];/* низ, право, верх, лево: показывать, если ребро не короче 44 px */
    /* ручка поворота: над верхним ребром (под нижним, если сверху нет места) */
    let top=edges[2],up=-1;const sz=a.size?a.size():null;
    if(sz&&top[1]-K.arm<8){top=edges[0];up=1;}
    const rot=[top[0],top[1]+up*K.arm];
    return {B,W,H,w,S,M,c,corners,edges,eOk,rot,rotFrom:top};}
  function hit(sx,sy){
    const g=geom();if(!g)return null;const R=touch()?K.hitT:K.hit,d=(p)=>Math.hypot(p[0]-sx,p[1]-sy);
    if(d(g.rot)<=R)return {k:'r'};
    let best=null,bd=1e9;
    g.corners.forEach((p,i)=>{const v=d(p);if(v<=R&&v<bd){bd=v;best={k:'c',i};}});
    if(best)return best;
    g.edges.forEach((p,i)=>{if(!g.eOk[i])return;const v=d(p);if(v<=R&&v<bd){bd=v;best={k:'e',i};}});
    if(best)return best;
    /* вращение за углом: снаружи рамки, рядом с угловой ручкой */
    const inside=pip(g.S,sx,sy);
    if(!inside)g.corners.forEach((p,i)=>{const v=d(p);if(v<=K.rim&&v<bd){bd=v;best={k:'rc',i};}});
    return best;}
  function pip(P,x,y){let in_=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a1=P[i],b1=P[j];if((a1[1]>y)!==(b1[1]>y)&&x<(b1[0]-a1[0])*(y-a1[1])/(b1[1]-a1[1])+a1[0])in_=!in_;}return in_;}
  function cursorOf(h){if(!h)return '';if(h.k==='r'||h.k==='rc')return ROTCUR;
    if(h.k==='c')return (h.i===0||h.i===2)?'nesw-resize':'nwse-resize';return (h.i===0||h.i===2)?'ns-resize':'ew-resize';}
  const snapV=(axis,v)=>a.snap?a.snap(axis,v):v;
  /* матрица по положению указателя */
  function calc(e,p){
    const g=st.g,B=g.B0,W=B.x1-B.x0,H=B.y1-B.y0,h=g.h,cx=(B.x0+B.x1)/2,cy=(B.y0+B.y1)/2;
    if(h.k==='r'||h.k==='rc'){
      const cx=g.pv[0],cy=g.pv[1];
      const a0=Math.atan2(g.p0[1]-cy,g.p0[0]-cx),a1=Math.atan2(p[1]-cy,p[0]-cx);let th=a1-a0;
      let tot=g.ang0+th*180/PI;
      if(e.shiftKey)tot=Math.round(tot/K.snapDeg)*K.snapDeg;
      tot=((tot+180)%360+360)%360-180;
      th=((tot-g.ang0)*PI)/180;
      return {m:mR(th,cx,cy),ang:tot};}
    const alt=!!e.altKey,shift=!!e.shiftKey;
    let sx=1,sy=1,ax,ay;
    let X=p[0],Y=p[1];
    if(!shift){X=snapV('x',X);Y=snapV('y',Y);}
    const x0=B.x0,x1=B.x1,y0=B.y0,y1=B.y1;
    if(h.k==='c'){
      const hx=(h.i===1||h.i===2)?x1:x0,hy=(h.i===2||h.i===3)?y1:y0;
      ax=alt?cx:(hx===x1?x0:x1);ay=alt?cy:(hy===y1?y0:y1);
      const vx=hx-ax,vy=hy-ay;
      sx=W>0&&Math.abs(vx)>1e-9?(X-ax)/vx:1;sy=H>0&&Math.abs(vy)>1e-9?(Y-ay)/vy:1;
      if(shift){const s=Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy;sx=sy=s;}}
    else{
      const i=h.i;/* 0 низ, 1 право, 2 верх, 3 лево */
      if(i===1||i===3){const hx=i===1?x1:x0;ax=alt?cx:(i===1?x0:x1);const vx=hx-ax;sx=W>0&&Math.abs(vx)>1e-9?(X-ax)/vx:1;ay=cy;
        if(shift)sy=sx;}
      else{const hy=i===2?y1:y0;ay=alt?cy:(i===2?y0:y1);const vy=hy-ay;sy=H>0&&Math.abs(vy)>1e-9?(Y-ay)/vy:1;ax=cx;
        if(shift)sx=sy;}}
    /* не меньше K.min единиц и без переворота: для отражения есть кнопки */
    const mnx=W>0?K.min/W:1,mny=H>0?K.min/H:1;
    if(shift&&h.k!=='c'){const mn=Math.max(mnx,mny);sx=Math.max(sx,mn);sy=Math.max(sy,mn);}
    sx=Math.max(sx,mnx);sy=Math.max(sy,mny);
    if(shift&&h.k==='c'){const s=Math.max(sx,sy);sx=sy=s;}
    return {m:mS(sx,sy,ax,ay),ang:g.ang0,sx,sy};}
  function begin(h,p0,sx0,sy0,touchy){
    const B=a.bbox();if(!B)return false;const tok=a.begin();if(tok===false)return false;
    let d=[0,0];
    if(h.k==='c'||h.k==='e'){const g=geom(),hp=h.k==='c'?[(h.i===1||h.i===2)?B.x1:B.x0,(h.i===2||h.i===3)?B.y1:B.y0]:[[(B.x0+B.x1)/2,B.y0],[B.x1,(B.y0+B.y1)/2],[(B.x0+B.x1)/2,B.y1],[B.x0,(B.y0+B.y1)/2]][h.i];
      d=[p0[0]-hp[0],p0[1]-hp[1]];void g;}
    const rotating=h.k==='r'||h.k==='rc';
    st.g={h,tok,B0:B,p0,d,ang0:rotating?st.ang:0,pv:(rotating&&st.pv)||[(B.x0+B.x1)/2,(B.y0+B.y1)/2],moved:false,m:mI(),touch:touchy,ang:st.ang,label:''};
    return true;}
  const api={
    get active(){return !!st.g;},
    get ang(){return st.ang;},
    math:{mul:mMul,scale:mS,rot:mR,pt:mPt,det:mDet,inv:mInv,id:mI,isId},
    /* нажатие: true — жест начат (режим дальше не обрабатывает) */
    down(e,sx,sy){
      if(!a.bbox()||st.g)return false;const h=hit(sx,sy);if(!h)return false;
      const p0=a.fromS(sx,sy);
      if(!begin(h,p0,sx,sy,e&&(e.pointerType==='touch'||e.pointerType==='pen')))return true;
      a.redraw();return true;},
    move(e,sx,sy){
      const g=st.g;
      if(!g){const h=a.bbox()?hit(sx,sy):null;const cur=cursorOf(h);
        if((st.hov&&st.hov.k)!==(h&&h.k)||(st.hov&&st.hov.i)!==(h&&h.i)){st.hov=h;a.redraw();}
        return cur;}
      const p=a.fromS(sx,sy);p[0]-=g.d[0];p[1]-=g.d[1];
      const r=calc(e,p);
      if(isId(r.m)&&!g.moved)return cursorOf(g.h);
      let ok=true;try{ok=a.apply(r.m,g.tok)!==false;}catch(err){ok=false;}
      if(ok){g.moved=true;g.m=r.m;g.ang=r.ang;st.ang=r.ang;g.label=r.sx!=null?label('s',r,g):label('r',r,g);}
      a.redraw();return cursorOf(g.h);},
    up(e){
      const g=st.g;if(!g)return false;st.g=null;
      let ok=true;try{ok=a.end(g.tok,g.moved,g.m)!==false;}catch(err){ok=false;}
      const rotating=g.h.k==='r'||g.h.k==='rc';
      if(!ok)st.ang=g.ang0;else if(g.moved){if(rotating)st.pv=g.pv;else{st.pv=null;st.ang=0;}}
      st.key=a.key();a.redraw();api.sync();return true;},
    cancel(){const g=st.g;if(!g)return false;st.g=null;try{a.cancel(g.tok);}catch(err){}st.ang=(g.h.k==='r'||g.h.k==='rc')?g.ang0:st.ang;a.redraw();api.sync();return true;},
    /* Esc во время жеста */
    key(e){if(st.g&&e.key==='Escape'){e.preventDefault();e.stopPropagation();api.cancel();return true;}return false;},
    cursor(sx,sy){if(st.g)return cursorOf(st.g.h);return cursorOf(a.bbox()?hit(sx,sy):null);},
    hit:(sx,sy)=>a.bbox()?hit(sx,sy):null,
    geom,
    /* однократные преобразования (панель, клавиши): один шаг отмены */
    run(m,angDelta,pv){
      const B=a.bbox();if(!B)return false;if(isId(m))return false;
      const tok=a.begin();if(tok===false)return false;
      let ok=true;try{ok=a.apply(m,tok)!==false;}catch(err){ok=false;}
      if(!ok){try{a.cancel(tok);}catch(err){}a.redraw();return false;}
      let fin=true;try{fin=a.end(tok,true,m)!==false;}catch(err){fin=false;}
      if(fin){if(angDelta){st.ang=((st.ang+angDelta+180)%360+360)%360-180;st.pv=pv||st.pv;}else{st.pv=null;st.ang=0;}}
      st.key=a.key();a.redraw();api.sync();return fin;},
    flip(vert){const B=a.bbox();if(!B)return false;const cx=(B.x0+B.x1)/2,cy=(B.y0+B.y1)/2;return api.run(vert?mS(1,-1,cx,cy):mS(-1,1,cx,cy));},
    rot90(){const B=a.bbox();if(!B)return false;const pv=st.pv||[(B.x0+B.x1)/2,(B.y0+B.y1)/2];return api.run(mR(PI/2,pv[0],pv[1]),90,pv);},
    /* размер: левый и нижний край остаются на месте; при замке пропорции сохраняются */
    setSize(w,h){const B=a.bbox();if(!B)return false;const W=B.x1-B.x0,H=B.y1-B.y0;
      let sx=w!=null&&W>0?Math.max(K.min/W,w/W):1,sy=h!=null&&H>0?Math.max(K.min/H,h/H):1;
      if(st.lock){if(w!=null&&h==null)sy=sx;else if(h!=null&&w==null)sx=sy;}
      return api.run(mS(sx,sy,B.x0,B.y0));},
    setAngle(deg){const B=a.bbox();if(!B||!isFinite(deg))return false;const d=((deg-st.ang)%360+540)%360-180;
      if(Math.abs(d)<1e-9)return false;
      const pv=st.pv||[(B.x0+B.x1)/2,(B.y0+B.y1)/2];return api.run(mR(d*PI/180,pv[0],pv[1]),d,pv);},
    nudge(dx,dy){return api.run([1,0,0,1,dx,dy]);},
    get lock(){return st.lock;},set lock(v){st.lock=!!v;if(st.bar){const b=st.bar.querySelector('[data-a=lk]');if(b){b.classList.toggle('on',st.lock);b.setAttribute('aria-pressed',st.lock);b.innerHTML=svg(st.lock?'lock':'unlock');}}},
    /* ---------- рисование ---------- */
    paint(c){
      const g=geom();if(!g)return;const acc=accent(),act=st.g;
      c.save();c.lineJoin='miter';c.setLineDash([]);
      c.strokeStyle=acc;c.lineWidth=1;c.globalAlpha=.85;
      c.beginPath();g.corners.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.stroke();
      c.beginPath();c.moveTo(g.rotFrom[0],g.rotFrom[1]);c.lineTo(g.rot[0],g.rot[1]);c.stroke();c.globalAlpha=1;
      const hv=act?act.h:st.hov,is=(k,i)=>hv&&hv.k===k&&(i==null||hv.i===i);
      const sq=(p,hot)=>{const s=K.hs;c.fillStyle=hot?acc:'#fff';c.strokeStyle=acc;c.lineWidth=1.5;c.beginPath();c.rect(p[0]-s/2,p[1]-s/2,s,s);c.fill();c.stroke();};
      g.edges.forEach((p,i)=>{if(g.eOk[i])sq(p,is('e',i));});
      g.corners.forEach((p,i)=>sq(p,is('c',i)));
      c.fillStyle=(is('r')||is('rc'))?acc:'#fff';c.strokeStyle=acc;c.lineWidth=1.5;c.beginPath();c.arc(g.rot[0],g.rot[1],K.rr,0,7);c.fill();c.stroke();
      if(act&&act.moved){const t=act.label;if(t){c.font='600 12px Onest,system-ui,sans-serif';const w=c.measureText(t).width+14,x=g.c[0]-w/2,y=Math.max(8,Math.min(g.corners[2][1],g.corners[0][1])-K.arm-26);
        c.fillStyle=acc;c.beginPath();if(c.roundRect)c.roundRect(x,y,w,20,10);else c.rect(x,y,w,20);c.fill();c.fillStyle='#fff';c.textBaseline='middle';c.textAlign='center';c.fillText(t,g.c[0],y+10.5);}}
      c.restore();
      api.sync();},
    /* ---------- панель ---------- */
    bar(){
      if(st.bar)return st.bar;const host=a.host;if(!host)return null;
      const b=document.createElement('div');b.className='xf-bar';b.id='xf-bar-'+(a.id||'x');b.hidden=true;b.setAttribute('role','toolbar');b.setAttribute('aria-label','Преобразование выделения');
      b.innerHTML='<label class="xf-f" title="Ширина"><span>Ш</span><input type="text" inputmode="decimal" data-f="w" aria-label="Ширина" autocomplete="off"></label>'
        +'<button type="button" class="xf-b" data-a="lk" aria-pressed="false" aria-label="Сохранять пропорции" title="Сохранять пропорции">'+svg('unlock')+'</button>'
        +'<label class="xf-f" title="Высота"><span>В</span><input type="text" inputmode="decimal" data-f="h" aria-label="Высота" autocomplete="off"></label>'
        +'<label class="xf-f" title="Угол поворота, градусы"><span>∠</span><input type="text" inputmode="decimal" data-f="a" aria-label="Угол поворота" autocomplete="off"></label>'
        +'<span class="xf-sep"></span>'
        +'<span data-slot="fh"></span>'
        +'<button type="button" class="xf-b" data-a="fv" aria-label="Отразить ↕" title="Отразить ↕">'+svg('fv')+'</button>'
        +'<button type="button" class="xf-b" data-a="r90" aria-label="Повернуть на 90°" title="Повернуть на 90°">'+svg('r90')+'</button>';
      const slot=b.querySelector('[data-slot=fh]');
      if(a.mirrorEl){slot.style.display='contents';}
      else{const fh=document.createElement('button');fh.type='button';fh.className='xf-b';fh.dataset.a='fh';fh.setAttribute('aria-label','Отразить ↔');fh.title='Отразить ↔';fh.innerHTML=svg('fh');slot.replaceWith(fh);}
      host.appendChild(b);st.bar=b;
      const num=s=>{const v=parseFloat(String(s).replace(',','.').replace(/[^\d.\-]/g,''));return isFinite(v)?v:null;};
      const field=(k)=>b.querySelector('[data-f='+k+']');
      for(const k of ['w','h','a']){const el=field(k);
        el.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();el.blur();}else if(e.key==='Escape'){e.preventDefault();api.sync(true);el.blur();}});
        el.addEventListener('focus',()=>el.select&&el.select());
        el.addEventListener('change',()=>{const v=num(el.value);if(v==null){api.sync(true);return;}
          if(k==='w')api.setSize(v,null);else if(k==='h')api.setSize(null,v);else api.setAngle(v);api.sync(true);});}
      b.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
        if(t.dataset.a==='lk'){api.lock=!st.lock;return;}
        if(t.dataset.a==='fv'){api.flip(true);return;}
        if(t.dataset.a==='r90'){api.rot90();return;}
        if(t.dataset.a==='fh'||t===a.mirrorEl){/* значок «Отразить» режима сам решает, что отражать */if(!a.mirrorEl)api.flip(false);}});
      b.addEventListener('pointerdown',e=>e.stopPropagation());
      return b;},
    sync(force){
      const b=st.bar||(a.host?api.bar():null);if(!b)return;
      const B=a.enabled&&!a.enabled()?null:a.bbox();
      const kk=B?a.key():null;if(kk!==st.key){st.key=kk;st.ang=0;st.pv=null;}
      const show=!!B&&(B.x1>B.x0||B.y1>B.y0);
      if(b.hidden===show){b.hidden=!show;
        if(a.mirrorEl){const slot=b.querySelector('[data-slot=fh]');if(show&&slot)slot.appendChild(a.mirrorEl);else if(a.mirrorHome&&a.mirrorHome.parentNode)a.mirrorHome.parentNode.insertBefore(a.mirrorEl,a.mirrorHome);}
        if(a.onBar)a.onBar(show);}
      if(!show)return;
      const f=k=>b.querySelector('[data-f='+k+']');
      const put=(k,v)=>{const el=f(k);if(el&&(force||document.activeElement!==el))el.value=v;};
      put('w',String(Math.round(B.x1-B.x0)));put('h',String(Math.round(B.y1-B.y0)));put('a',String(r2(st.ang)).replace(/\.0+$/,''));
      /* положение: под рамкой, а если места нет — над ней */
      const hr=a.host.getBoundingClientRect(),g=geom();if(!g)return;
      const bw=b.offsetWidth,bh=b.offsetHeight,ys=g.S.map(q=>q[1]),xs=g.S.map(q=>q[0]);
      const bot=Math.max(...ys)+K.pad+14,topY=Math.min(...ys)-K.pad-K.arm-bh-18;
      let y=bot+bh+8<=hr.height?bot:Math.max(8,topY);
      if(y+bh>hr.height-8)y=Math.max(8,hr.height-bh-8);
      let x=(Math.min(...xs)+Math.max(...xs))/2-bw/2;x=Math.max(8,Math.min(hr.width-bw-8,x));
      const ox=a.hostOffset?a.hostOffset():[0,0];
      b.style.left=Math.round(x+ox[0])+'px';b.style.top=Math.round(y+ox[1])+'px';}
  };
  function label(kind,r,g){if(kind==='r')return (r2(r.ang))+'°';
    const W=(g.B0.x1-g.B0.x0)*r.sx,H=(g.B0.y1-g.B0.y0)*r.sy;return 'Ш '+Math.round(W)+' × В '+Math.round(H);}
  return api;}
return {make,K,mul:mMul,scale:mS,rot:mR,pt:mPt,det:mDet,inv:mInv,id:mI,isId,affNodes,affCs,bboxOfCs,union,svg};
})();
