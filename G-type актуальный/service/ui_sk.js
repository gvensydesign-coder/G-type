/* ===== Режим «Скелет»: правка средней линии штрихов у шрифтов «скелет + перо» (Линия, Пропись) =====
   Данные: S.edits[ch].sk (см. SKELETON_API.md). Здесь же — структурные правки штриха:
   'si:ops' = [['i',ni,t] — новый узел на отрезке ni→ni+1 в точке t, ['d',ni] — удалить узел];
   правки узлов 'si:ni' относятся к номерам ПОСЛЕ этих операций. */
const skFont=()=>{const f=FONTS[CUR_FONT];return !!(f&&typeof f.pen==='function');};
const skGlyph=()=>skFont()&&GL[S.sel]&&typeof GL[S.sel].skel==='function';
const skOn=()=>S.mode==='skel'&&skGlyph();
Object.assign(PDESC,{nib:'Угол широкого пера: определяет, где штрих тонкий, а где толстый.',press:'Нажим: насколько перо расширяется на нажиме — контраст тонких и толстых штрихов.',
  term:'Концевые элементы — форма свободных концов штрихов: круглые, плоские, срез, капля.',tens:'Натяжение кривых: меньше — мягкие дуги, больше — тугие, ближе к квадрату.',
  conn:'Связность письма: 0 — буквы раздельно, 100 — слитно.'});

/* ---------- структурные операции (добавить/удалить узел) поверх движка ---------- */
const _skApply0=skApplyEdits;
const skLerp=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
function skSplit(A,B,t){
  if(!A.b&&!B.a){const m=skLerp(A,B,t);return {A:{...A},N:{x:m.x,y:m.y,a:null,b:null,type:'smooth'},B:{...B}};}
  const P1=A.b||A,P2=B.a||B,q0=skLerp(A,P1,t),q1=skLerp(P1,P2,t),q2=skLerp(P2,B,t),r0=skLerp(q0,q1,t),r1=skLerp(q1,q2,t),s=skLerp(r0,r1,t);
  return {A:{...A,b:A.b?q0:null},N:{x:s.x,y:s.y,a:r0,b:r1,type:'smooth'},B:{...B,a:B.a?q2:null}};
}
function skApplyOps(sk,E){
  return sk.map((st,si)=>{const ops=E[si+':ops'];if(!Array.isArray(ops)||!ops.length||st.dot||!st.nodes)return st;
    const ns=st.nodes.map(n=>({...n,a:n.a&&{...n.a},b:n.b&&{...n.b}}));
    for(const op of ops){if(!Array.isArray(op))continue;const i=op[1]|0,n=ns.length;
      if(op[0]==='i'){const m=st.closed?n:n-1;if(i<0||i>=m)continue;const t=Math.max(0.03,Math.min(0.97,+op[2]||0.5));
        const A=ns[i],B=ns[(i+1)%n],r=skSplit(A,B,t);
        if(A.w!=null||B.w!=null){const wa=A.w==null?1:A.w,wb=B.w==null?1:B.w;r.N.w=wa+(wb-wa)*t;}
        ns[i]=r.A;ns[(i+1)%n]=r.B;ns.splice(i+1,0,r.N);}
      else if(op[0]==='d'){if(n<=(st.closed?3:2))continue;if(!st.closed&&(i<=0||i>=n-1))continue;if(i<0||i>=n)continue;ns.splice(i,1);}}
    return Object.assign({},st,{nodes:ns});});
}
skApplyEdits=function(sk,E){if(!E)return sk;for(const k in E)if(k.endsWith(':ops')){sk=skApplyOps(sk,E);break;}return _skApply0(sk,E);};

/* ---------- buildBase: память последних результатов и сырой (без объединения) контур для живого предпросмотра ---------- */
const _bbSk=buildBase,SKBB=new Map();let SK_RAW=0;
buildBase=function(ch,p,ed){const d=GL[ch];
  if(!d||typeof d.skel!=='function'||!skFont())return _bbSk(ch,p,ed);
  const raw=SK_RAW>0;if(!raw&&!(ed&&ed.sk))return _bbSk(ch,p,ed);
  const key=(raw?'R':'U')+CUR_FONT+'|'+ch+'|'+JSON.stringify(p)+'|'+(ed?JSON.stringify(ed):'');
  let v=SKBB.get(key);
  if(!v){if(raw){const r=glyphSkeleton(ch,p,ed);if(!r)return _bbSk(ch,p,ed);const q=safeP(p);
      v={w:r.w,h:r.h,S:sE(q),cs:skelToContours(r.skel,r.pen,q)};}
    else v=_bbSk(ch,p,ed);
    if(!v)return v;if(SKBB.size>160){let n=0;for(const k of SKBB.keys()){SKBB.delete(k);if(++n>=60)break;}}SKBB.set(key,v);}
  return {w:v.w,h:v.h,S:v.S,cs:cloneC(v.cs)};};
const _liveSk=liveGlyphOf;
liveGlyphOf=function(ch,st,edits){SK_RAW++;try{return _liveSk(ch,st,edits);}finally{SK_RAW--;}};

/* ---------- данные текущего знака ---------- */
let SKD=null;
function skE(){const E=ed();return E.sk||(E.sk={});}
function skOpsOnly(E){const o={};if(E)for(const k in E)if(k.endsWith(':ops'))o[k]=E[k];return o;}
function skData(){
  const e=S.edits[S.sel],p=cur().p,key=CUR_FONT+'|'+S.style+'|'+S.sel+'|'+JSON.stringify(p)+'|'+(e?JSON.stringify(e):'');
  if(SKD&&SKD.key===key)return SKD;
  const disp=glyphSkeleton(S.sel,p,e);if(!disp)return SKD=null;
  const base=glyphSkeleton(S.sel,p,Object.assign({},e||{},{sk:skOpsOnly(e&&e.sk)}));
  return SKD={key,disp:disp.skel,base:base.skel,pen:disp.pen,w:disp.w};
}
/* скелет хранится в координатах построения; на холсте — после направляющих (fx/fy) и наклона (toS) */
function skMap(){const raw=rawGlyph(),fx=raw&&raw.fx,fy=raw&&raw.fy;
  const X=x=>fx&&fx.active?fx.f(x):x,Y=y=>fy&&fy.active?fy.f(y):y;
  return {s:(x,y)=>toS(X(x),Y(y)),inv:(sx,sy)=>{const w=toW(sx,sy);return [fx&&fx.active?fx.inv(w[0]):w[0],fy&&fy.active?fy.inv(w[1]):w[1]];}};}
const skNode=(sk,h)=>{const st=sk&&sk[h.si];if(!st)return null;if(st.dot)return h.ni===0?{x:st.x,y:st.y,dot:true,r:st.r}:null;return st.nodes[h.ni]||null;};
const skIsEnd=(st,ni)=>!st.dot&&!st.closed&&(ni===0||ni===st.nodes.length-1);
function skClean(){const E=S.edits[S.sel];if(!E||!E.sk)return;const K=E.sk;
  for(const k of Object.keys(K)){const v=K[k];
    if(k.endsWith(':ops')){if(!Array.isArray(v)||!v.length)delete K[k];continue;}
    if(typeof v==='string')continue;if(!v||typeof v!=='object'){delete K[k];continue;}
    for(const q of ['p','a','b'])if(Array.isArray(v[q])&&Math.abs(v[q][0])<0.05&&Math.abs(v[q][1])<0.05)delete v[q];
    if(v.w!=null&&Math.abs(v.w)<1e-3)delete v.w;
    if(!Object.keys(v).length)delete K[k];}
  if(!Object.keys(K).length)delete E.sk;cleanEdit();}
const skCl=v=>Math.max(-SK_EDIT_LIM,Math.min(SK_EDIT_LIM,v));
/* записать абсолютное положение узла/ручки (координаты построения) как сдвиг от исходного скелета */
function skSetAbs(si,ni,part,x,y){const d=skData();if(!d)return;const st=d.base[si];if(!st)return;
  const bn=st.dot?{x:st.x,y:st.y}:st.nodes[ni];if(!bn)return;const K=skE(),k=si+':'+ni,e=K[k]||(K[k]={});
  if(part==='p')e.p=[skCl(x-bn.x),skCl(y-bn.y)];
  else{const dp=e.p||[0,0],bh=bn[part]||bn;e[part]=[skCl(x-bh.x-dp[0]),skCl(y-bh.y-dp[1])];}
  SKD=null;}
/* топология знака: число частей и просветов; правка, которая их меняет, отменяется */
function skTopo(){try{const b=buildBase(S.sel,cur().p,S.edits[S.sel]);if(!b||!b.cs.length)return 'x';let o=0,h=0;
    for(const c of b.cs){for(const n of c.nodes)if(!isFinite(n.x)||!isFinite(n.y))return 'x';if(c.hole)h++;else o++;}return o+'/'+h;}catch(e){return 'x';}}
function skCommit(before,t0,msg){const t1=skTopo();if(t1===t0&&t1!=='x')return true;
  if(before)S.edits[S.sel]=JSON.parse(before);else delete S.edits[S.sel];SKD=null;
  if(undoStack.length)undoStack.pop();bump();syncNodeInfo();toast(msg||'Так знак распадётся на части, поэтому правку отменили. Сдвиньте меньше');return false;}

/* ---------- отрисовка ---------- */
function skStrokePath(st,f){const P=new Path2D(),ns=st.nodes,n=ns.length;if(n<2)return P;
  let q=f(ns[0].x,ns[0].y);P.moveTo(q[0],q[1]);const m=st.closed?n:n-1;
  for(let i=0;i<m;i++){const A=ns[i],B=ns[(i+1)%n],e=f(B.x,B.y);
    if(A.b||B.a){const c1=f((A.b||A).x,(A.b||A).y),c2=f((B.a||B).x,(B.a||B).y);P.bezierCurveTo(c1[0],c1[1],c2[0],c2[1],e[0],e[1]);}else P.lineTo(e[0],e[1]);}
  if(st.closed)P.closePath();return P;}
function skSeg(st,i){const ns=st.nodes,A=ns[i],B=ns[(i+1)%ns.length];return [[A.x,A.y],[(A.b||A).x,(A.b||A).y],[(B.a||B).x,(B.a||B).y],[B.x,B.y]];}
function skDirAt(st,i,t,f){const P=skSeg(st,i).map(q=>f(q[0],q[1]));const p=skBz(P,t);let D=skBzD(P,t);if(Math.hypot(D[0],D[1])<1e-6)D=[P[3][0]-P[0][0],P[3][1]-P[0][1]];const l=Math.hypot(D[0],D[1])||1;return [p,[D[0]/l,D[1]/l]];}
function drawSkeleton(c){
  const d=skData();if(!d)return;const M=skMap(),f=M.s,acc=css('--sel'),dng=css('--danger'),sel=S.node&&S.node.sk?S.node:null,bad=drag&&drag.kind==='sk'&&drag.bad;
  /* полупрозрачный контур: во время перетаскивания — быстрый (без объединения), иначе точный */
  let cs;if(drag&&drag.kind==='sk'){const q=safeP(cur().p);cs=skelToContours(d.disp,d.pen,q);}
  else{const U=getFinal(S.sel,S.style,{warp:false,slant:false,subdiv:false,rough:false});cs=U?U.cs:[];}
  const ff=drag&&drag.kind==='sk'?f:(x,y)=>toS(x,y);
  const P=pathOf(cs,ff);c.fillStyle=bad?'rgba(252,71,60,.30)':'rgba(0,0,0,.10)';c.fill(P,'nonzero');
  c.strokeStyle=bad?dng:'rgba(0,0,0,.28)';c.lineWidth=1;c.stroke(P);
  c.save();c.lineCap='round';c.lineJoin='round';
  d.disp.forEach((st,si)=>{const on=sel&&sel.si===si;
    if(st.dot){const q=f(st.x,st.y);c.setLineDash([3,3]);c.strokeStyle=on?acc:'rgba(0,0,0,.55)';c.lineWidth=1.2;c.beginPath();c.arc(q[0],q[1],Math.max(4,st.r*V.sc),0,7);c.stroke();c.setLineDash([]);return;}
    c.strokeStyle=on?acc:(bad?dng:'#000');c.lineWidth=on?2.4:1.6;c.globalAlpha=on?1:.78;c.stroke(skStrokePath(st,f));c.globalAlpha=1;
    /* направление штриха: стрелка в середине */
    const n=st.nodes.length,m=st.closed?n:n-1;if(m<1)return;const mi=Math.floor((m-1)/2),[p,u]=skDirAt(st,mi,m%2?0.5:0.98,f),L=6;
    c.fillStyle=on?acc:'#000';c.beginPath();c.moveTo(p[0]+u[0]*L,p[1]+u[1]*L);c.lineTo(p[0]-u[0]*L*0.7-u[1]*L*0.75,p[1]-u[1]*L*0.7+u[0]*L*0.75);
    c.lineTo(p[0]-u[0]*L*0.7+u[1]*L*0.75,p[1]-u[1]*L*0.7-u[0]*L*0.75);c.closePath();c.fill();
    /* окончания свободных концов */
    if(!st.closed)for(const end of [0,1]){const cap=end?st.cap1:st.cap0;const [q,u0]=end?skDirAt(st,m-1,1,f):skDirAt(st,0,0,f);const u2=end?u0:[-u0[0],-u0[1]];
      skCapMark(c,q,u2,skCapKind(cap,cur().p),on?acc:'rgba(0,0,0,.55)');}
  });
  /* ручки и узлы */
  d.disp.forEach((st,si)=>{if(st.dot){const q=f(st.x,st.y);skNodeMark(c,q,true,sel&&sel.si===si&&sel.ni===0,acc);return;}
    const on=sel&&sel.si===si;
    st.nodes.forEach((nd,ni)=>{const q=f(nd.x,nd.y),isSel=on&&sel.ni===ni;
      for(const h of ['a','b']){const hd=nd[h];if(!hd||Math.hypot(hd.x-nd.x,hd.y-nd.y)<0.5)continue;
        if(skIsEnd(st,ni)&&((ni===0&&h==='a')||(ni===st.nodes.length-1&&h==='b')))continue;
        const r=f(hd.x,hd.y),hs=isSel&&sel.part===h;c.globalAlpha=on?1:.32;
        c.strokeStyle=isSel?acc:'rgba(0,0,0,.45)';c.lineWidth=1;c.beginPath();c.moveTo(q[0],q[1]);c.lineTo(r[0],r[1]);c.stroke();
        c.fillStyle=hs?acc:'#fff';c.strokeStyle=hs||isSel?acc:'#000';c.beginPath();c.arc(r[0],r[1],3.6,0,7);c.fill();c.stroke();c.globalAlpha=1;}
      skNodeMark(c,q,nd.type!=='corner',isSel&&sel.part==='p',acc,isSel);});});
  c.restore();
}
function skNodeMark(c,q,smooth,hot,acc,ring){c.lineWidth=1.5;c.fillStyle=hot?acc:'#fff';c.strokeStyle=hot||ring?acc:'#000';c.beginPath();
  if(smooth)c.arc(q[0],q[1],4.8,0,7);else c.rect(q[0]-4.3,q[1]-4.3,8.6,8.6);c.fill();c.stroke();
  if(ring){c.beginPath();if(smooth)c.arc(q[0],q[1],8.5,0,7);else c.rect(q[0]-8,q[1]-8,16,16);c.stroke();}}
function skCapMark(c,q,u,kind,col){const n=[-u[1],u[0]],o=[q[0]+u[0]*9,q[1]+u[1]*9];c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1.3;c.beginPath();
  if(kind==='R'||kind==='J'){const a=Math.atan2(u[1],u[0]);c.arc(o[0]-u[0]*3,o[1]-u[1]*3,4,a-Math.PI/2,a+Math.PI/2);c.stroke();}
  else if(kind==='B'){c.arc(o[0],o[1],3.2,0,7);c.fill();}
  else if(kind==='X'){c.moveTo(o[0]-u[0]*4+n[0]*4,o[1]-u[1]*4+n[1]*4);c.lineTo(o[0]+u[0]*3,o[1]+u[1]*3);c.lineTo(o[0]-u[0]*4-n[0]*4,o[1]-u[1]*4-n[1]*4);c.stroke();}
  else{c.moveTo(o[0]-u[0]*2+n[0]*4.5,o[1]-u[1]*2+n[1]*4.5);c.lineTo(o[0]-u[0]*2-n[0]*4.5,o[1]-u[1]*2-n[1]*4.5);c.stroke();}
  c.restore();}

/* ---------- попадание ---------- */
let skPtr='mouse';
const skR=()=>skPtr==='touch'?20:11;
function skHit(sx,sy){const d=skData();if(!d)return null;const f=skMap().s,sel=S.node&&S.node.sk?S.node:null;let best=null,bd=skR();
  d.disp.forEach((st,si)=>{if(st.dot){const q=f(st.x,st.y),dd=Math.hypot(q[0]-sx,q[1]-sy);if(dd<bd){bd=dd;best={sk:true,si,ni:0,part:'p'};}return;}
    st.nodes.forEach((nd,ni)=>{for(const h of ['a','b']){const hd=nd[h];if(!hd||Math.hypot(hd.x-nd.x,hd.y-nd.y)<0.5)continue;
        if(skIsEnd(st,ni)&&((ni===0&&h==='a')||(ni===st.nodes.length-1&&h==='b')))continue;
        const q=f(hd.x,hd.y),dd=Math.hypot(q[0]-sx,q[1]-sy)+(sel&&sel.si===si?0:3);if(dd<bd-1){bd=dd+1;best={sk:true,si,ni,part:h};}}
      const q=f(nd.x,nd.y),dd=Math.hypot(q[0]-sx,q[1]-sy);if(dd<bd){bd=dd;best={sk:true,si,ni,part:'p'};}});});
  return best;}
/* ближайшая точка на средней линии (для нового узла) */
function skHitSeg(sx,sy){const d=skData();if(!d)return null;const f=skMap().s;let best=null,bd=skR()+2;
  d.disp.forEach((st,si)=>{if(st.dot)return;const n=st.nodes.length,m=st.closed?n:n-1;
    for(let i=0;i<m;i++){const P=skSeg(st,i).map(q=>f(q[0],q[1]));for(let k=1;k<40;k++){const t=k/40,q=skBz(P,t),dd=Math.hypot(q[0]-sx,q[1]-sy);if(dd<bd){bd=dd;best={si,i,t};}}}});
  return best;}

/* ---------- правки ---------- */
const skKey=h=>h.si+':'+h.ni;
function skRenumber(si,from,delta){const K=skE(),mv=[];
  for(const k of Object.keys(K)){const m=/^(\d+):(\d+)$/.exec(k);if(!m||+m[1]!==si)continue;const ni=+m[2];
    if(delta<0&&ni===from){delete K[k];continue;}if(ni>=from+(delta>0?0:1))mv.push([ni,K[k]]),delete K[k];}
  for(const [ni,v] of mv)K[si+':'+(ni+delta)]=v;}
function skInsert(si,i,t){const d=skData();if(!d)return;const st=d.disp[si];if(!st||st.dot)return;
  const before=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null,t0=skTopo();snap();
  const n=st.nodes.length,A=st.nodes[i],B=st.nodes[(i+1)%n],r=skSplit(A,B,t);
  const K=skE();skRenumber(si,i+1,+1);(K[si+':ops']||(K[si+':ops']=[])).push(['i',i,+t.toFixed(4)]);SKD=null;
  /* сохранить форму: узлы ставятся точно на кривую, которая была на экране */
  const j=i+1,bi=st.closed&&i===n-1?0:i+2;
  if(r.A.b)skSetAbs(si,i,'b',r.A.b.x,r.A.b.y);
  skSetAbs(si,j,'p',r.N.x,r.N.y);if(r.N.a){skSetAbs(si,j,'a',r.N.a.x,r.N.a.y);skSetAbs(si,j,'b',r.N.b.x,r.N.b.y);}
  if(r.B.a)skSetAbs(si,bi,'a',r.B.a.x,r.B.a.y);
  skClean();bump();if(skCommit(before,t0,'Сюда узел не поставить: знак распадётся. Выберите другое место на штрихе')){S.node={sk:true,si,ni:j,part:'p'};}syncNodeInfo();}
function skDelete(){const h=S.node;if(!h||!h.sk)return;const d=skData();if(!d)return;const st=d.disp[h.si];
  if(!st||st.dot){toast('Эту точку не удалить. Уберите знак целиком, если он не нужен');return;}
  if(st.nodes.length<=(st.closed?3:2)){toast('У штриха осталось минимум узлов. Чтобы убрать его, удалите штрих целиком');return;}
  if(skIsEnd(st,h.ni)){toast('Концы штриха не удаляются. Удалите узел внутри штриха');return;}
  const before=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null,t0=skTopo();snap();
  const K=skE();skRenumber(h.si,h.ni,-1);(K[h.si+':ops']||(K[h.si+':ops']=[])).push(['d',h.ni]);
  SKD=null;skClean();bump();if(skCommit(before,t0,'Без этого узла знак распадётся, поэтому узел оставили'))S.node=null;syncNodeInfo();}
function skSetType(h,type){const d=skData();if(!d)return;const st=d.disp[h.si];if(!st||st.dot||skIsEnd(st,h.ni))return false;
  const nd=st.nodes[h.ni],bt=d.base[h.si].nodes[h.ni].type||'smooth',K=skE(),k=skKey(h),e=K[k]||(K[k]={});
  if(type===bt)delete e.type;else e.type=type;
  if(type==='smooth'){/* ручки — на одной прямой (G1) */
    const ns=st.nodes,n=ns.length,P=ns[(h.ni-1+n)%n],N=ns[(h.ni+1)%n];
    let u=null;if(nd.a&&nd.b){const ua=[nd.x-nd.a.x,nd.y-nd.a.y],ub=[nd.b.x-nd.x,nd.b.y-nd.y],la=Math.hypot(...ua),lb=Math.hypot(...ub);
      if(la>0.5&&lb>0.5)u=[ua[0]/la+ub[0]/lb,ua[1]/la+ub[1]/lb];}
    if(!u)u=[N.x-P.x,N.y-P.y];const l=Math.hypot(u[0],u[1])||1;u=[u[0]/l,u[1]/l];
    const la=nd.a?Math.hypot(nd.a.x-nd.x,nd.a.y-nd.y):Math.hypot(P.x-nd.x,P.y-nd.y)/3,lb=nd.b?Math.hypot(nd.b.x-nd.x,nd.b.y-nd.y):Math.hypot(N.x-nd.x,N.y-nd.y)/3;
    skSetAbs(h.si,h.ni,'a',nd.x-u[0]*la,nd.y-u[1]*la);skSetAbs(h.si,h.ni,'b',nd.x+u[0]*lb,nd.y+u[1]*lb);}
  SKD=null;return true;}
function skToggle(h){const d=skData();if(!d)return;const st=d.disp[h.si];if(!st||st.dot||skIsEnd(st,h.ni))return;
  const before=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null,t0=skTopo();snap();
  skSetType(h,st.nodes[h.ni].type==='corner'?'smooth':'corner');skClean();bump();skCommit(before,t0);syncNodeInfo();}
function skReset(){const h=S.node;if(!h||!h.sk)return;const E=S.edits[S.sel];if(!E||!E.sk)return;
  const before=JSON.stringify(E),t0=skTopo();snap();delete E.sk[skKey(h)];
  const d=skData(),st=d&&d.disp[h.si];if(st&&skIsEnd(st,h.ni))delete E.sk[h.si+':'+(h.ni===0?'cap0':'cap1')];
  SKD=null;skClean();bump();skCommit(before,t0);syncNodeInfo();}
function skSetCap(kind){const h=S.node;if(!h||!h.sk)return;const d=skData();if(!d)return;const st=d.disp[h.si];if(!st||!skIsEnd(st,h.ni))return;
  const end=h.ni===0?'cap0':'cap1',bc=d.base[h.si][end];if(bc==='J'||bc==='C'){toast('Этот конец соединён с другим штрихом');return;}
  const before=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null,t0=skTopo();snap();const K=skE(),k=h.si+':'+end;
  if(skCapKind(bc,cur().p)===kind||K[k]===kind)delete K[k];else K[k]=kind;SKD=null;skClean();bump();skCommit(before,t0);syncNodeInfo();}

/* ---------- мышь и касание ---------- */
let skTap={t:0,x:0,y:0},skLong=0;
function skDown(e){const [sx,sy]=pt(e);skPtr=e.pointerType||'mouse';
  const now=performance.now(),dbl=now-skTap.t<340&&Math.hypot(sx-skTap.x,sy-skTap.y)<16;skTap={t:dbl?0:now,x:sx,y:sy};
  const hit=skHit(sx,sy);
  if(dbl){if(hit&&hit.part==='p'){skToggle(hit);S.node=hit;syncNodeInfo();schedule();return true;}
    const sg=skHitSeg(sx,sy);if(sg){skInsert(sg.si,sg.i,sg.t);schedule();return true;}}
  if(!hit)return false;
  $('#stage').setPointerCapture(e.pointerId);
  const d=skData(),nd=skNode(d.disp,hit),pos=hit.part==='p'?nd:(nd[hit.part]||nd),M=skMap(),w=M.inv(sx,sy);
  snap();S.node=hit;
  drag={kind:'sk',fw:V.w,hit,off:[w[0]-pos.x,w[1]-pos.y],start:[pos.x,pos.y],moved:false,sx,sy,
    before:S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null,t0:skTopo(),brk:e.altKey,bad:false};
  clearTimeout(skLong);
  if(skPtr!=='mouse'){const dr=drag;skLong=setTimeout(()=>{if(drag===dr&&!dr.moved){dr.brk=true;const st=d.disp[hit.si];
      if(st&&!st.dot&&!skIsEnd(st,hit.ni)&&st.nodes[hit.ni].type!=='corner'){skSetType(hit,'corner');skClean();dr.moved=true;bump();toast('Ручки разорваны: узел угловой');}}},480);}
  syncNodeInfo();schedule();return true;}
function skMove(e){if(!drag||drag.kind!=='sk')return false;const [sx,sy]=pt(e);
  if(!drag.moved&&Math.hypot(sx-drag.sx,sy-drag.sy)<3)return true;drag.moved=true;clearTimeout(skLong);
  const M=skMap();let [tx,ty]=M.inv(sx,sy);tx-=drag.off[0];ty-=drag.off[1];
  if(e.shiftKey){if(Math.abs(tx-drag.start[0])>Math.abs(ty-drag.start[1]))ty=drag.start[1];else tx=drag.start[0];}
  if(S.snap&&!e.altKey&&drag.hit.part==='p'){tx=Math.round(tx/S.snapStep)*S.snapStep;ty=Math.round(ty/S.snapStep)*S.snapStep;}
  skDragTo(drag.hit,tx,ty,drag.brk||e.altKey);
  bump();drag.bad=skTopo()!==drag.t0;syncNodeInfo();return true;}
function skDragTo(h,tx,ty,brk){const d=skData();if(!d)return;const st=d.disp[h.si],nd=skNode(d.disp,h);if(!nd)return;
  if(h.part==='p'){skSetAbs(h.si,h.ni,'p',tx,ty);skClean();return;}
  const o=h.part==='a'?'b':'a';
  if(brk&&nd.type!=='corner'&&!skIsEnd(st,h.ni))skSetType(h,'corner');
  const nd2=skNode(skData().disp,h);
  skSetAbs(h.si,h.ni,h.part,tx,ty);
  /* гладкий узел: вторая ручка — на одной прямой, длина сохраняется (G1) */
  if(nd2.type!=='corner'&&!brk&&nd2[o]&&!skIsEnd(st,h.ni)){const dx=tx-nd2.x,dy=ty-nd2.y,L=Math.hypot(dx,dy),lo=Math.hypot(nd2[o].x-nd2.x,nd2[o].y-nd2.y);
    if(L>1e-3)skSetAbs(h.si,h.ni,o,nd2.x-dx/L*lo,nd2.y-dy/L*lo);}
  skClean();}
function skUp(){if(!drag||drag.kind!=='sk')return false;clearTimeout(skLong);const dr=drag;drag=null;
  if(!dr.moved){undoStack.pop();schedule();return true;}
  skCommit(dr.before,dr.t0);SKD=null;bump();syncNodeInfo();return true;}
function skKey2(e){if(!S.node||!S.node.sk)return false;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();skDelete();return true;}
  const step=e.shiftKey?10:1;let dx=0,dy=0;
  if(e.key==='ArrowLeft')dx=-step;else if(e.key==='ArrowRight')dx=step;else if(e.key==='ArrowUp')dy=step;else if(e.key==='ArrowDown')dy=-step;else return false;
  e.preventDefault();const d=skData(),nd=skNode(d.disp,S.node);if(!nd)return true;const pos=S.node.part==='p'?nd:(nd[S.node.part]||nd);
  const before=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null,t0=skTopo();snap();skDragTo(S.node,pos.x+dx,pos.y+dy,false);bump();skCommit(before,t0);syncNodeInfo();return true;}

/* ---------- подключение к редактору (режимы «Точки»/«Сетка» не меняются) ---------- */
const _onDownSk=onDown,_onMoveSk=onMove,_onUpSk=onUp,_onDblSk=onDbl,_onKeySk=onKey,_syncNodeSk=syncNodeInfo,_syncPanelSk=syncPanel,_switchSk=switchFont;
onDown=function(e){if(skOn()&&e.button!==1&&e.button!==2){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul))&&skDown(e))return;}return _onDownSk(e);};
onMove=function(e){if(drag&&drag.kind==='sk'){skMove(e);return;}
  if(!drag&&skOn()){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul))){const h=skHit(sx,sy);if(h){$('#stage').style.cursor='pointer';return;}
      if(skHitSeg(sx,sy)){$('#stage').style.cursor='copy';return;}}}
  return _onMoveSk(e);};
onUp=function(e){if(skUp())return;return _onUpSk(e);};
onDbl=function(e){if(skOn()){const [sx,sy]=pt(e);if(skHit(sx,sy)||skHitSeg(sx,sy))return;}return _onDblSk(e);};
onKey=function(e){if(S.tab==='edit'&&skOn()&&!(e.target.closest&&e.target.closest('input,textarea,select'))&&!(e.ctrlKey||e.metaKey)&&skKey2(e))return;return _onKeySk(e);};
syncPanel=function(){if(S.mode==='skel'&&!skFont())S.mode='points';_syncPanelSk();
  const b=$('[data-mode=skel]');if(b){const ok=skFont();b.classList.toggle('dis',!ok);b.setAttribute('aria-disabled',ok?'false':'true');
    b.title=ok?'Средняя линия штрихов: узлы, ручки, нажим, окончания':'Скелет есть у шрифтов на пере — «Линия» и «Пропись»';}};
/* панель узла: состав и высота постоянны (холст не сдвигается при выборе узла), неподходящие кнопки — неактивны */
syncNodeInfo=function(){const box=$('#skp');
  if(S.mode!=='skel'){if(box)box.hidden=true;$('#nbtns').hidden=false;return _syncNodeSk();}
  $('#nbtns').hidden=true;$('#nbtns').style.visibility='hidden';const el=$('#ninfo');if(!box)return;box.hidden=false;
  const h=S.node&&S.node.sk?S.node:null,d=h&&skGlyph()?skData():null,st=d&&d.disp[h.si],nd=st&&skNode(d.disp,h);
  const dis=(sel,v)=>$$(sel).forEach(b=>{b.disabled=!!v;});
  if(!nd){el.textContent=skGlyph()?'':'У этого знака нет штрихов';
    dis('#skp button,#sk-w',true);$('#sk-cap').hidden=true;$('#sk-type').hidden=false;$$('#skp .seg button').forEach(b=>b.classList.remove('on'));$('#sk-wo').textContent='';return;}
  const pos=h.part==='p'?nd:(nd[h.part]||nd);el.textContent='x '+Math.round(pos.x)+'  y '+Math.round(pos.y);
  const end=!st.dot&&skIsEnd(st,h.ni);
  $$('#sk-type button').forEach(b=>b.classList.toggle('on',!st.dot&&!end&&(b.dataset.skt==='corner')===(nd.type==='corner')));
  dis('#sk-type button',st.dot||end);
  const wv=st.dot?1:(nd.w==null?1:nd.w),wi=$('#sk-w');wi.disabled=!!st.dot;if(document.activeElement!==wi)wi.value=wv;$('#sk-wo').textContent=st.dot?'':skWLabel(wv);
  let k=null,lock=true;if(end){const cap=h.ni===0?st.cap0:st.cap1,bc=d.base[h.si][h.ni===0?'cap0':'cap1'];k=skCapKind(cap,cur().p);lock=bc==='J'||bc==='C';}
  $$('#sk-cap button').forEach(b=>{b.classList.toggle('on',b.dataset.cap===k);b.disabled=lock;});$('#sk-cap').hidden=!end;$('#sk-type').hidden=end;
  $('#sk-cap').title=end&&lock?'Этот конец соединён с другим штрихом':end?'':'Окончание — у конца штриха';
  dis('#sk-add',st.dot);dis('#sk-del',st.dot||end||st.nodes.length<=(st.closed?3:2));dis('#sk-rst',false);};
/* подпись нажима: 0 — чистая волосная (у остроконечного пера это обычное значение входов и соединений) */
const skWLabel=v=>v<0.025?'волосная':Math.round(v*100)+'%';
switchFont=function(id){_switchSk(id);SKD=null;if(S.mode==='skel'&&!skFont()){S.mode='points';syncPanel();}};
document.addEventListener('DOMContentLoaded',()=>{
  document.addEventListener('click',e=>{const t=e.target;if(t&&t.closest&&t.closest('[data-mode=skel]')&&!skFont()){e.stopPropagation();e.preventDefault();toast('Скелет есть у шрифтов на пере — «Линия» и «Пропись»');}},true);
  $$('#sk-type button').forEach(b=>b.addEventListener('click',()=>{const h=S.node;if(!h||!h.sk)return;const d=skData();const nd=d&&skNode(d.disp,h);if(!nd)return;
    if((nd.type==='corner')===(b.dataset.skt==='corner'))return;skToggle(h);}));
  $$('#sk-cap button').forEach(b=>b.addEventListener('click',()=>skSetCap(b.dataset.cap)));
  bind('#sk-del','click',skDelete);bind('#sk-rst','click',skReset);
  bind('#sk-add','click',()=>{const h=S.node;if(!h||!h.sk)return;const d=skData(),st=d&&d.disp[h.si];if(!st||st.dot)return;
    const n=st.nodes.length,m=st.closed?n:n-1;let i=Math.min(h.ni,m-1);
    if(h.ni>0){const len=j=>{const P=skSeg(st,j);return Math.hypot(P[3][0]-P[0][0],P[3][1]-P[0][1]);};if(len(h.ni-1)>len(i)||h.ni>=m)i=h.ni-1;}
    skInsert(h.si,i,0.5);schedule();});
  const wi=$('#sk-w');let wb=null,wt=null;
  if(wi){wi.addEventListener('pointerdown',()=>{wb=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null;wt=skTopo();snap();});
    wi.addEventListener('input',()=>{const h=S.node;if(!h||!h.sk)return;if(wt==null){wb=S.edits[S.sel]?JSON.stringify(S.edits[S.sel]):null;wt=skTopo();snap();}
      const d=skData(),bn=d&&skNode(d.base,h);if(!bn)return;const K=skE(),k=skKey(h),e=K[k]||(K[k]={});e.w=+wi.value-(bn.w==null?1:bn.w);SKD=null;skClean();
      $('#sk-wo').textContent=skWLabel(+wi.value);bump();});
    wi.addEventListener('change',()=>{if(wt!=null){skCommit(wb,wt,'При таком нажиме знак распадётся — отменено');wt=null;}syncNodeInfo();});}
  syncPanel();
});
