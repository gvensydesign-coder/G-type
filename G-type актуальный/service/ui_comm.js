/* ===== «Сообщество» (W89 C): уроки и челленджи, ПРЕДПРОСМОТР. Тексты: ui_comm_data.js, стили: ui_comm.css, тест: tests/e2e_comm.py =====
   Лениво: до первого открытия вкладки «Сообщество» (setTab('community')) ничего не строится и не рисуется; в «Избранном» раздел «Статьи» читает только маленький ключ localStorage.
   Всё честно локальное: нет сервера, поэтому нет чисел участников, лайков, чужих работ и авторов. Свои отметки хранятся в этом браузере (gtype-comm-v1, gtype-comm-works-v1).
   Шрифты в демо: настоящие знаки G-type (cgRun: те же finalGlyph / pathOf, что у обложек библиотеки), canvas-демо играют только пока видны (IntersectionObserver), вкладка активна и нет reduced motion (MO.off() = кадр-постер).
   Маршрут: токен адреса #community, подсостояния (вкладка, статья, челлендж) — в history.state и в localStorage; «Назад» работает между ними. API для тестов: window.COMM. */
(function(){
'use strict';
const DT=window.CM_DATA;if(!DT)return;
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),mix=(a,b,t)=>a+(b-a)*t;
const bez=(x1,y1,x2,y2)=>t=>{if(t<=0||t>=1)return clamp(t);let a=0,b=1,m,x;for(let i=0;i<22;i++){m=(a+b)/2;x=3*(1-m)*(1-m)*m*x1+3*(1-m)*m*m*x2+m*m*m;x<t?a=m:b=m}m=(a+b)/2;return 3*(1-m)*(1-m)*m*y1+3*(1-m)*m*m*y2+m*m*m};
const TRV=bez(.45,0,.1,1),ARR=bez(.25,.8,.25,1),SOFT=bez(.4,0,.2,1),INOUT=bez(.65,0,.35,1);
const P=(t,a,b,e)=>{const p=clamp((t-a)/(b-a));return e?e(p):p};
const ART=Object.fromEntries(DT.arts.map(a=>[a.id,a])),CHS=Object.fromEntries(DT.chs.map(c=>[c.id,c]));
const plural=(n,a,b,c)=>(n%10===1&&n%100!==11)?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c;
const motionOff=()=>!!(window.MO&&MO.off&&MO.off());

/* ---------- хранилище: один маленький ключ + отдельный ключ для миниатюр работ; всё в try/catch, без хранилища страница работает ---------- */
const KEY='gtype-comm-v1',WKEY='gtype-comm-works-v1';
function ld(k){try{const j=JSON.parse(localStorage.getItem(k)||'null');return j&&typeof j==='object'&&!Array.isArray(j)?j:{};}catch(e){return {};}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}try{if(typeof noStoreNote==='function')noStoreNote();}catch(e){}}
const obj=o=>(o&&typeof o==='object'&&!Array.isArray(o))?o:{};
const ST=(()=>{const j=ld(KEY);return {tab:j.tab==='challenges'?'challenges':'lessons',a:ART[j.a]?j.a:null,c:CHS[j.c]?j.c:null,act:CHS[j.act]?j.act:null,read:obj(j.read),prog:obj(j.prog),fav:obj(j.fav),quiz:obj(j.quiz),ch:obj(j.ch)};})();
let wTimer=0;const save=()=>{clearTimeout(wTimer);wTimer=setTimeout(()=>sv(KEY,ST),250);};
const saveNow=()=>{clearTimeout(wTimer);sv(KEY,ST);};
addEventListener('pagehide',()=>{if(wTimer)saveNow();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&wTimer)saveNow();});
const chS=id=>{const o=ST.ch[id]=obj(ST.ch[id]);o.a=obj(o.a);o.m=obj(o.m);o.c=obj(o.c);return o;};
const favIds=()=>DT.arts.filter(a=>ST.fav[a.id]).map(a=>a.id);

/* ---------- даты: «сегодня» из часов браузера (для тестов window.__COMM_TODAY = 'ГГГГ-ММ-ДД'); статус челленджа считается, а не записан ---------- */
const pad2=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const parse=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);return new Date(+m[1],+m[2]-1,+m[3]);};
const nowD=()=>{const o=window.__COMM_TODAY,n=new Date();if(typeof o==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(o)){const d=parse(o);d.setHours(n.getHours(),n.getMinutes(),n.getSeconds());return d;}return n;};
const dayN=d=>Math.round(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const fmtD=iso=>{const d=parse(iso);return d.getDate()+' '+MON[d.getMonth()];};
const fmtRange=c=>{const a=parse(c.start),b=parse(c.end);return a.getMonth()===b.getMonth()?a.getDate()+'–'+b.getDate()+' '+MON[b.getMonth()]+' '+b.getFullYear():fmtD(c.start)+' – '+fmtD(c.end)+' '+b.getFullYear();};
function chStatus(c){
  const t=dayN(nowD()),a=dayN(parse(c.start)),b=dayN(parse(c.end));
  if(t<a){const n=a-t;return {k:'soon',n,label:'Скоро · '+(n===1?'старт завтра':'старт через '+n+' '+plural(n,'день','дня','дней'))};}
  if(t>b)return {k:'done',n:0,label:'Завершён'};
  const n=b-t;return {k:'run',n,label:'Идёт · '+(n===0?'последний день':'осталось '+n+' '+plural(n,'день','дня','дней'))};
}
function stagesOf(c){
  const e=parse(c.end),r1=new Date(e.getFullYear(),e.getMonth(),e.getDate()+1),r2=new Date(e.getFullYear(),e.getMonth(),e.getDate()+7),r3=new Date(e.getFullYear(),e.getMonth(),e.getDate()+8);
  const f=d=>d.getDate()+' '+MON[d.getMonth()];
  return [{k:'recv',t:'Приём работ',d:fmtD(c.start)+' – '+fmtD(c.end),a:dayN(parse(c.start)),b:dayN(e)},
    {k:'sum',t:'Подведение итогов',d:f(r1)+' – '+f(r2),a:dayN(r1),b:dayN(r2)},
    {k:'res',t:'Итоги',d:f(r3),a:dayN(r3),b:dayN(r3)}];
}

/* ---------- знаки шрифтов: те же finalGlyph / pathOf, что у обложек библиотеки; кеш, перед сборкой useFont(id) и возврат шрифта ---------- */
const GC=new Map();
function famP(st,ratio){FAM_W.push(['_cm',0,ratio]);try{return famParams(st.p,'_cm');}finally{FAM_W.pop();}}
const WRATIO={300:.22,400:.315,700:.437,900:.53};
function cgRun(id,txt,o){
  o=o||{};const key=id+'|'+(o.sty||'')+'|'+(o.ratio||'')+'|'+(o.raw?'r':'')+'|'+txt;let r=GC.get(key);if(r)return r;
  if(!FONTS[id])return {items:[],tot:0,cap:700,p:{}};
  const back=typeof CUR_FONT==='string'?CUR_FONT:id;
  try{
    if(back!==id)useFont(id);
    const slot=id===S.fontId?{styles:S.styles,edits:S.edits}:(S.lib[id]||(S.lib[id]=mkSlot(id)));
    const st=slot.styles[o.sty&&slot.styles[o.sty]?o.sty:'regular'],p=o.ratio?famP(st,o.ratio):st.p,sst=Object.assign({},st,{p});
    let t=txt;
    if(!o.raw){if(id==='kortes'&&window.KTS&&KTS.pre)t=KTS.pre(t);else if(id==='tyaga'&&window.TYB&&TYB.pre)t=TYB.pre(t);}
    const items=[];let tot=0;
    let miss=0;for(const ch of t){const g=finalGlyph(ch,sst,slot.edits);if(!g){if(ch.trim())miss++;continue;}items.push([g,tot,ch]);tot+=g.adv;}
    r={items,tot,cap:p.capH||700,p,miss};
  }catch(e){console.error(e);r={items:[],tot:0,cap:700,p:{}};}
  finally{if(back!==id){try{useFont(back);}catch(e){}}}
  if(r.miss||!r.items.length)return r;if(GC.size>400)GC.clear();GC.set(key,r);return r;
}
const nodeP=n=>{const o=[n];if(n.a)o.push(n.a);if(n.b)o.push(n.b);return o;};
function inkOf(run){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [g,xx] of run.items)for(const c of g.cs)for(const n of c.nodes)for(const q of nodeP(n)){if(xx+q.x<x0)x0=xx+q.x;if(xx+q.x>x1)x1=xx+q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;}return {x0,x1,y0,y1};}
/* union of the ink boxes of several runs that are drawn from the same origin (raw / shaped variants): the fit must hold for every variant */
function inkUni(){const o={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9};for(const r of arguments){const k=inkOf(r);o.x0=Math.min(o.x0,k.x0);o.x1=Math.max(o.x1,k.x1);o.y0=Math.min(o.y0,k.y0);o.y1=Math.max(o.y1,k.y1);}return o;}
function gInk(g){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const c of g.cs)for(const n of c.nodes)for(const q of nodeP(n)){if(q.x<x0)x0=q.x;if(q.x>x1)x1=q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;}return {x0,x1,y0,y1};}
/* заливка строки знаков: x, y = базовая линия, sc = пикселей на единицу шрифта; опционально наклон (shear) */
function drawRun(c,run,x,y,sc,fill,o){
  if(typeof DBG!=='undefined'&&DBG.ink===false)return;o=o||{};c.fillStyle=fill;const sh=o.shear||0,al=o.alpha;if(al!=null)c.globalAlpha=al;
  for(const [g,xx] of run.items){const dx=(o.dx||0)*(run.items.indexOf?1:1);
    c.fill(pathOf(g.cs,(px,py)=>[x+(xx+px)*sc+(o.gap?o.gap(xx):0)+py*sc*sh,y-py*sc]),'nonzero');}
  if(al!=null)c.globalAlpha=1;
}
/* интерполяция двух совместимых мастеров (как в вариативном шрифте); несовместимые знаки берутся ближайшие */
function lerpRun(A,B,t){
  if(t<=0)return A;if(t>=1)return B;
  const items=A.items.map(([g,x,ch],i)=>{const h=B.items[i];if(!h||h[2]!==ch)return [g,x,ch];const g2=h[0];
    if(g.cs.length!==g2.cs.length||g.cs.some((c,k)=>c.nodes.length!==g2.cs[k].nodes.length))return t<.5?[g,x,ch]:[g2,h[1],ch];
    const L=(p,q)=>({x:mix(p.x,q.x,t),y:mix(p.y,q.y,t)});
    const cs=g.cs.map((c,k)=>({...c,nodes:c.nodes.map((n,j)=>{const m=g2.cs[k].nodes[j],o={...n,x:mix(n.x,m.x,t),y:mix(n.y,m.y,t)};if(n.a&&m.a)o.a=L(n.a,m.a);if(n.b&&m.b)o.b=L(n.b,m.b);return o;})}));
    return [{...g,cs,adv:mix(g.adv,g2.adv,t)},mix(x,h[1],t),ch];});
  return {items,tot:mix(A.tot,B.tot,t),cap:mix(A.cap,B.cap,t),p:A.p};
}
/* вес по числу 300..900: кусочно между мастерами Light / Regular / Bold / Black (их строит famParams, как «Семейство») */
function weightRun(id,txt,w){
  const K=[300,400,700,900];w=clamp(w,300,900);let i=0;while(i<2&&w>K[i+1])i++;
  const A=cgRun(id,txt,{ratio:WRATIO[K[i]]}),B=cgRun(id,txt,{ratio:WRATIO[K[i+1]]});
  return lerpRun(A,B,(w-K[i])/(K[i+1]-K[i]));
}
/* контуры -> ломаные для «рисования» линией: те же узлы и ручки, что в pathOf */
const near=(a,b)=>!a||!b||(Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01);
function flat(cs,tf){
  const out=[];
  for(const c of cs){const ns=c.nodes,n=ns.length;if(n<2)continue;const pts=[tf(ns[0].x,ns[0].y)];
    for(let i=0;i<n;i++){const A=ns[i],B=ns[(i+1)%n],e=tf(B.x,B.y);
      if(!near(A.b,A)||!near(B.a,B)){const p0=tf(A.x,A.y),p1=tf((A.b||A).x,(A.b||A).y),p2=tf((B.a||B).x,(B.a||B).y);
        for(let k=1;k<=12;k++){const u=k/12,v=1-u;pts.push([v*v*v*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u*u*u*e[0],v*v*v*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u*u*u*e[1]]);}}
      else pts.push(e);}
    out.push(pts);}
  return out;
}
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const palette=()=>({ink:tok('--glyph')||'#000',mut:tok('--muted')||'#6a6a72',line:tok('--cv-line')||tok('--line-strong'),dim:tok('--glyph-dim')||'#bbb',acc:tok('--glyph')||tok('--ink'),ok:tok('--ok-ink')||'#1a7f37',bg:tok('--canvas')||'#fff'});
let PM=null;const memo=(k,f)=>{if(!PM){PM={};queueMicrotask(()=>{PM=null;});}return PM[k]||(PM[k]=f());};/* палитра читается один раз на кадр, а не на каждый canvas */
const FUI='600 12px Onest,system-ui,sans-serif';
function label(c,txt,x,y,col,align){c.font=FUI;c.fillStyle=col;c.textAlign=align||'left';c.textBaseline='middle';
  /* a label never leaves the canvas: when it does not fit the free width (6 px margins) it is cut with an ellipsis */
  const W=c.canvas.width/(c.getTransform().a||1),room=align==='right'?x-6:W-6-x;if(room>20&&c.measureText(txt).width>room){let s=txt;while(s.length>1&&c.measureText(s+'…').width>room)s=s.slice(0,-1);txt=s+'…';}
  c.fillText(txt,x,y);c.textAlign='left';}
function hline(c,y,x0,x1,col,dash,lw){c.strokeStyle=col;c.lineWidth=lw||1;c.setLineDash(dash||[]);c.beginPath();c.moveTo(x0,y+.5);c.lineTo(x1,y+.5);c.stroke();c.setLineDash([]);}

/* ---------- аниматор: один rAF на все видимые canvas; не видно / вкладка скрыта / reduced motion = не играет ---------- */
const AN={set:new Set(),raf:0,io:null,ro:null,ticks:0};
function anInit(){
  if(AN.io)return;
  AN.io=new IntersectionObserver(es=>{es.forEach(e=>{const i=e.target._cm;if(!i)return;const was=i.vis;i.vis=e.isIntersecting;if(i.vis&&!was){if(!i.ready){i.ready=true;try{i.init&&i.init();}catch(x){console.error(x);}}i.t0=performance.now()-(i.t||0)*1000;render(i,motionOff()?null:undefined);}});anKick();},{rootMargin:'240px'});
  AN.ro=new ResizeObserver(es=>es.forEach(e=>{const i=e.target._cm;if(i&&i.vis)render(i);}));
  document.addEventListener('visibilitychange',anKick);
  try{new MutationObserver(()=>AN.set.forEach(i=>i.vis&&render(i))).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}catch(e){}
}
function anAdd(i){anInit();AN.set.add(i);i.cv._cm=i;AN.io.observe(i.cv);AN.ro.observe(i.cv);}
function anDrop(root){AN.set.forEach(i=>{if(!root||root.contains(i.cv)){AN.io&&AN.io.unobserve(i.cv);AN.ro&&AN.ro.unobserve(i.cv);AN.set.delete(i);}});}
const playing=()=>!document.hidden&&!motionOff()&&!document.getElementById('view-comm').hidden;
function anKick(){
  const any=playing()&&[...AN.set].some(i=>i.vis&&i.D>0&&!i.manual);
  if(any&&!AN.raf)AN.raf=requestAnimationFrame(anTick);
  if(!any&&AN.raf){cancelAnimationFrame(AN.raf);AN.raf=0;}
}
function anTick(now){
  AN.raf=0;if(!playing())return;
  let any=false;AN.ticks++;
  AN.set.forEach(i=>{if(!i.vis||!(i.D>0)||i.manual)return;any=true;i.t=Math.max(0,(now-i.t0)/1000)%i.D;render(i,i.t);/* the rAF timestamp can be a hair older than t0 (set in the observer): a negative t gave an undefined index in the word / font pickers and one blank frame */});
  if(any)AN.raf=requestAnimationFrame(anTick);
}
/* t: undefined = текущее время, null = кадр-постер (reduced motion), число = время */
function render(i,t){
  const cv=i.cv;if(!cv.isConnected)return;const r=cv.getBoundingClientRect();if(r.width<2||r.height<2)return;
  const d=Math.min(window.devicePixelRatio||1,2),w=Math.round(r.width*d),h=i.ar?Math.round(w/i.ar):Math.round(r.height*d),lw=w/d,lh=h/d;
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,lw,lh);
  const tt=t===null||(t===undefined&&motionOff())?(i.poster||0):(t===undefined?(i.t||0):t);
  if(i.first===undefined)i.first=tt;i.last=tt;let bad=false;try{i.draw(c,lw,lh,tt,i,i.cov?memo('c',cpal):memo('p',palette));}catch(e){bad=true;if((i.derr=(i.derr||0)+1)<2)console.warn('comm draw',e);}
  /* a cover is never left blank: the first paint is checked once (any pixel that differs from the corner), a failed or empty frame is retried (the glyph cache is dropped) */
  if(!i.ok&&i.cov){let ink=false;if(!bad){try{const d=c.getImageData(0,0,w,h).data,q=[d[0],d[1],d[2],d[3]];for(let k=0;k<d.length;k+=8){if(Math.abs(d[k]-q[0])+Math.abs(d[k+1]-q[1])+Math.abs(d[k+2]-q[2])+Math.abs(d[k+3]-q[3])>24){ink=true;break;}}}catch(e){ink=true;}}
    if(ink)i.ok=true;else if((i.retry=(i.retry||0)+1)<=8){GC.clear();clearTimeout(i.rt);i.rt=setTimeout(()=>{if(i.cv.isConnected&&!i.ok)render(i,t);},160*i.retry);}}
}
/* ---------- обложки уроков (6): петли настоящими знаками на нейтральном фоне, с подписями к понятию. Рамка всегда 2:1 ---------- */
let LBX=null;const DBG={ink:true,band:true,rest:true};
const sgn=n=>n?'−'+Math.abs(Math.round(n)):'0';
/* палитра обложек: только токены (в тёмной теме переключается сама) */
const cpal=()=>({bg:tok('--panel')||'#f0f0f2',ink:tok('--text')||'#0b0b0c',mut:tok('--text-2')||'#6a6a72',line:tok('--line-strong')||'#bbb',surf:tok('--surface')||'#fff',oni:tok('--on-ink')||'#fff'});
const TESTP={bg:'#ffffff',ink:'#000000',mut:'#707070',line:'#909090',surf:'#f2f2f2',oni:'#ffffff'};
function kit(c,w,h,pl){
  const m=Math.round(h*.09),k=clamp(w/340,1,1.45),fs=Math.round(12*k),F='700 '+fs+'px Onest,system-ui,sans-serif';
  const K={m,f:F,fs,
    bg(){c.fillStyle=pl.bg;c.fillRect(0,0,w,h);},
    pill(txt,x,y,al,dark,a){
      if(!DBG.rest)return;c.save();if(a!=null)c.globalAlpha=clamp(a);c.font=F;const pw=Math.ceil(c.measureText(txt).width+Math.round(14*k)),ph=Math.round(20*k);
      let x0=al==='r'?x-pw:al==='c'?x-pw/2:x;x0=clamp(x0,6,w-6-pw);const y0=clamp(y-ph/2,6,h-6-ph);
      c.fillStyle=dark?pl.ink:pl.surf;c.beginPath();c.roundRect(x0,y0,pw,ph,ph/2);c.fill();
      if(!dark){c.strokeStyle=pl.line;c.lineWidth=1;c.beginPath();c.roundRect(x0+.5,y0+.5,pw-1,ph-1,ph/2-.5);c.stroke();}
      c.fillStyle=dark?pl.oni:pl.ink;c.textAlign='left';c.textBaseline='middle';c.fillText(txt,x0+Math.round(7*k),y0+ph/2+.5);c.restore();
      if(LBX&&(a==null||a>.5))LBX.push({t:txt,x0,y0,x1:x0+pw,y1:y0+ph,fs});
      return {x0,y0,x1:x0+pw,y1:y0+ph};},
    ln(x0,y0,x1,y1,col,lw,a){if(!DBG.rest||Math.hypot(x1-x0,y1-y0)<8||(a!=null&&a<.12))return;c.save();if(a!=null)c.globalAlpha=clamp(a);c.strokeStyle=col;c.lineWidth=lw||1;c.lineCap='butt';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.restore();},
    ring(x,y,r,col,lw,a){if(!DBG.rest||(a!=null&&a<.12))return;c.save();if(a!=null)c.globalAlpha=clamp(a);c.strokeStyle=col;c.lineWidth=lw||2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.restore();},
    head(x,y,dir,col,a){if(!DBG.rest||(a!=null&&a<.12))return;c.save();if(a!=null)c.globalAlpha=clamp(a);c.fillStyle=col;c.beginPath();c.moveTo(x,y);c.lineTo(x-dir*6,y-3.5);c.lineTo(x-dir*6,y+3.5);c.closePath();c.fill();c.restore();},
    band(fn){if(DBG.band)fn();}
  };return K;
}
const COVERS={
 lines:{D:10,poster:6.4,draw(c,w,h,t,i,pl){
   const K=kit(c,w,h,pl),IK=pl.ink,m=K.m;K.bg();
   const run=cgRun('kvadra','Дубы'),p=run.p,top=m,bot=h-m,colX=Math.round(w*.62),sc=Math.min((colX-2*m)/run.tot,(bot-top)/(p.asc+p.desc)),x=m,y=top+(bot-top-(p.asc+p.desc)*sc)/2+p.asc*sc;
   const a1=clamp(1-P(t,7,7.4)+P(t,9.4,9.8)),a2=P(t,7,7.4)-P(t,9.4,9.8),end=1-P(t,9.4,9.8),ph1=1-P(t,6.9,7.3);/* complementary crossfades: a1+a2 = 1 at every moment, the cover is never blank */
   const run2=cgRun('kvadra','НО'),O=run2.items[1],gO=gInk(O[0]);
   const L=[['выносные',p.asc,3.4,ph1],['прописные',p.capH,2.4,ph1],['строчные',p.xh,1.4,ph1],['базовая линия',0,.4,ph1]],r0=top+10,dr=(bot-top-20)/3;
   L.forEach(([n,v,t0,keep],k)=>{const yy=y-v*sc,ry=r0+k*dr,a=P(t,t0,t0+.5,TRV)*end,pa=P(t,t0+.3,t0+.6)*end*keep,lk=v===0||v===p.capH?1:keep,hot=t>=t0&&t<t0+.7&&t<7;
     K.ln(m*.6,yy,m*.6+(colX-m*1.2-8)*a,yy,hot?IK:pl.mut,hot?2:1,(hot?1:.8)*(a>0?lk:0));
     K.ln(colX-8,yy,colX-2,ry,pl.mut,1,pa*.9);
     K.pill(n,colX,ry,'l',false,pa);});
   drawRun(c,run,x,y,sc,IK,{alpha:a1});
   if(a2>0){const x2=x+Math.max(0,(colX-2*m-run2.tot*sc)/2);drawRun(c,run2,x2,y,sc,IK,{alpha:a2});const ox=x2+(O[1]+(gO.x0+gO.x1)/2)*sc,mm=P(t,7.7,8.1)*a2;
     K.ring(ox,y-gO.y1*sc,9,IK,2,mm);K.ring(ox,y-gO.y0*sc,9,IK,2,mm);K.pill('овал выходит за линии',colX,top+(bot-top)/2,'l',false,mm);}
 }},
 weight:{D:8,poster:3,draw(c,w,h,t,i,pl){
   const K=kit(c,w,h,pl),IK=pl.ink,m=K.m,res=Math.max(52,Math.round(h*.3));K.bg();
   const A=cgRun('kvadra','Н',{ratio:WRATIO[300]}),B=cgRun('kvadra','Н',{ratio:WRATIO[900]}),H=h-m-res,sc=H/A.p.capH,base=m+H,gA=gInk(A.items[0][0]),gB=gInk(B.items[0][0]),lwA=(gA.x1-gA.x0)*sc,lwB=(gB.x1-gB.x0)*sc,gap=Math.max(40,w*.14),x0=(w-(lwA+gap+lwB))/2;
   [[A,gA,x0,lwA,.4],[B,gB,x0+lwA+gap,lwB,1.5]].forEach(([r,gk,left,lw,t0])=>{const x=left-gk.x0*sc,st=r.p.stem*sc,mq=P(t,t0,t0+.7,TRV)*(1-P(t,6.6,7.2)),by=base+Math.round(res*.2);
     drawRun(c,r,x,base,sc,IK);
     if(DBG.rest){c.save();c.globalAlpha=.5*mq;c.fillStyle=pl.bg;c.fillRect(left,base-gk.y1*sc,st,(gk.y1-gk.y0)*sc);c.restore();}
     K.ln(left,base+3,left,by+6,IK,1,mq);K.ln(left+st,base+3,left+st,by+6,IK,1,mq);
     K.ln(left-16,by,left,by,IK,1.5,mq);K.head(left,by,1,IK,mq);K.ln(left+st,by,left+st+16,by,IK,1.5,mq);K.head(left+st,by,-1,IK,mq);
     K.pill('штрих '+Math.round(r.p.stem),left+lw/2,base+res-18,'c',false,P(t,t0+.3,t0+.9)*(1-P(t,6.6,7.2)));});
 }},
 kern:{D:7,poster:1.4,draw(c,w,h,t,i,pl){
   const K=kit(c,w,h,pl),IK=pl.ink,m=K.m;K.bg();
   const run=cgRun('kvadra','ТА'),k=inkOf(run),p=run.p,kv=-100*(.5-.5*Math.cos(clamp(t/7)*Math.PI*2)),H=h-m-50,sc=Math.min((w-2*m-40)/(k.x1-k.x0+100),H/(k.y1-k.y0)),
     x=(w-(k.x1-k.x0+kv)*sc)/2-k.x0*sc,y=m+k.y1*sc,T=run.items[0],A=run.items[1],gT=gInk(T[0]),gA=gInk(A[0]);
   const tsr=x+(T[1]+(gT.x0+gT.x1)/2+p.stem/2)*sc,af=x+(A[1]+kv+gA.x0)*sc,ac=x+(A[1]+kv+(gA.x0+gA.x1)/2)*sc,yu=y-p.capH*.8*sc,dx=af+(ac-af)*.8*.62;
   K.band(()=>{if(af>tsr+1){c.save();c.fillStyle=IK;c.globalAlpha=.16;c.beginPath();c.moveTo(tsr,y);c.lineTo(tsr,yu);c.lineTo(Math.max(tsr,dx),yu);c.lineTo(af,y);c.closePath();c.fill();c.restore();}});
   drawRun(c,{items:[T]},x,y,sc,IK);drawRun(c,{items:[[A[0],A[1]+kv,A[2]]]},x,y,sc,IK);
   const gy=y-p.capH*.34*sc,gl=af-tsr;
   if(gl>16){K.ln(tsr+7,gy,af-7,gy,IK,1.5);K.head(tsr+2,gy,-1,IK);K.head(af-2,gy,1,IK);}
   K.pill('кернинг '+sgn(kv),w/2,y+24,'c',false);
 }},
 swash:{D:8,poster:2,draw(c,w,h,t,i,pl){
   const K=kit(c,w,h,pl),IK=pl.ink,m=K.m;K.bg();
   const A=cgRun('kortes','R',{raw:true}),B=cgRun('kortes','R'),kA=inkOf(A),kB=inkOf(B),k={x0:Math.min(kA.x0,kB.x0),x1:Math.max(kA.x1,kB.x1),y0:Math.min(kA.y0,kB.y0),y1:Math.max(kA.y1,kB.y1)},
     H=h-2*m,sc=Math.min(H/(k.y1-k.y0),(w*.4)/(k.x1-k.x0),2*(w*.32-m-6)/(k.x1-k.x0)),x=w*.32-(k.x1-k.x0)*sc/2-k.x0*sc,y=m+k.y1*sc,sw=P(t,3.8,4.4)-P(t,7.4,7.9);
   drawRun(c,A,x,y,sc,IK,{alpha:1-sw});drawRun(c,B,x,y,sc,IK,{alpha:sw});
   const px=Math.max(x+k.x1*sc+22,w*.6),a1=P(t,.5,1)*(1-P(t,3.4,3.8)),a2=P(t,4.6,5.1)*(1-P(t,7.2,7.6)),y1=m+H*.28,y2=m+H*.72;
   const f1=[x+(kA.x0+(kA.x1-kA.x0)*.16)*sc,y-(kA.y0+(kA.y1-kA.y0)*.07)*sc],f2=[x+(kB.x0+(kB.x1-kB.x0)*.9)*sc,y-(kB.y0+(kB.y1-kB.y0)*.12)*sc];
   K.ring(f1[0],f1[1],11,IK,2,a1);K.ln(f1[0]+11,f1[1],px,y1,pl.mut,1.5,a1);K.pill('засечка',px,y1,'l',false,a1);
   K.ring(f2[0],f2[1],11,IK,2,a2);K.ln(f2[0]+11,f2[1],px,y2,pl.mut,1.5,a2);K.pill('росчерк',px,y2,'l',false,a2);
 }},
 vf:{D:8,poster:3.5,draw(c,w,h,t,i,pl){
   const K=kit(c,w,h,pl),IK=pl.ink,m=K.m;K.bg();
   const u=.5-.5*Math.cos(clamp(t/8)*Math.PI*2),v=.5-.5*Math.cos(clamp(Math.max(0,t-1.2)/6.8)*Math.PI*2),wg=300+600*u,sl=Math.round(12*v),
     run=weightRun('kvadra','Ось',wg),kk=inkOf(weightRun('kvadra','Ось',900)),sh=.21*v,pw=Math.min(Math.max(150,w*.26),w*.4),px=w-m-pw,H=h-2*m,sc=Math.min((px-m-40)/((kk.x1-kk.x0)+H*sh*.5),H/(kk.y1-kk.y0)),x=m+8-kk.x0*sc,y=m+kk.y1*sc;
   drawRun(c,run,x,y,sc,IK,{shear:sh});
   const py=m,ph=h-2*m;
   if(DBG.rest){c.fillStyle=pl.surf;c.beginPath();c.roundRect(px,py,pw,ph,12);c.fill();c.strokeStyle=pl.line;c.lineWidth=1;c.beginPath();c.roundRect(px+.5,py+.5,pw-1,ph-1,11.5);c.stroke();}
   [['wght',String(Math.round(wg/10)*10),u],['slnt',sgn(sl),v]].forEach(([n,val,q],i)=>{const ry=py+14+i*((ph-22)/2),tx=px+12,tw=pw-24;
     if(!DBG.rest)return;c.font=K.f;c.fillStyle=IK;c.textBaseline='middle';c.textAlign='left';c.fillText(n,tx,ry+6);c.textAlign='right';c.fillText(val,tx+tw,ry+6);c.textAlign='left';
     const ty=ry+26;K.ln(tx,ty,tx+tw,ty,IK,3,.25);K.ln(tx,ty,tx+tw*q,ty,IK,3);c.fillStyle=IK;c.beginPath();c.arc(tx+tw*q,ty,6,0,7);c.fill();c.fillStyle=pl.surf;c.beginPath();c.arc(tx+tw*q,ty,2.2,0,7);c.fill();
     if(LBX)LBX.push({t:n,x0:tx,y0:ry-2,x1:tx+30,y1:ry+14,fs:K.fs});});
 }},
 draw:{D:9,poster:6.4,draw(c,w,h,t,i,pl){
   const K=kit(c,w,h,pl),IK=pl.ink,m=K.m;K.bg();
   const run=cgRun('kvadra','Б'),k=inkOf(run),g=run.items[0][0],H=h-2*m,sc=Math.min(H/(k.y1-k.y0),(w*.36)/(k.x1-k.x0)),W=(k.x1-k.x0)*sc,gx=Math.max(m,(w-W-36-Math.round(76*K.fs/12))/2),x=gx-k.x0*sc,y=m+k.y1*sc,tf=(px,py)=>[x+px*sc,y-py*sc];
   const polys=flat(g.cs,tf),tot=polys.reduce((s,q)=>s+q.length,0),f=P(t,.2,2.6,INOUT);
   c.lineJoin='round';c.lineCap='round';if(DBG.rest){c.save();c.globalAlpha=.4;c.fillStyle=pl.mut;c.beginPath();for(const q of polys){if(q.length<2)continue;c.moveTo(q[0][0],q[0][1]);for(let i=1;i<q.length;i++)c.lineTo(q[i][0],q[i][1]);c.closePath();}c.fill('evenodd');c.restore();}/* base layer: the glyph is always there, the stroke draws over it */
   c.strokeStyle=pl.line;c.lineWidth=1.2;if(DBG.rest)for(const q of polys){if(q.length<2)continue;c.beginPath();c.moveTo(q[0][0],q[0][1]);for(let i=1;i<q.length;i++)c.lineTo(q[i][0],q[i][1]);c.closePath();c.stroke();}
   c.strokeStyle=IK;c.lineWidth=2.2;let left=f*tot;
   for(const q of polys){if(left<=0||!DBG.ink)break;const n=Math.min(q.length,Math.floor(left));left-=q.length;if(n<2)continue;c.beginPath();c.moveTo(q[0][0],q[0][1]);for(let i=1;i<n;i++)c.lineTo(q[i][0],q[i][1]);if(n>=q.length)c.closePath();c.stroke();}
   const nodes=[];g.cs.forEach(cn=>cn.nodes.forEach(n=>nodes.push(n)));const nm=P(t,2.6,4,SOFT),hm=P(t,4,5.4,SOFT);
   let hn=null,kn=null;
   nodes.forEach((n,i)=>{const [nx,ny]=tf(n.x,n.y);
     [n.a,n.b].forEach(q=>{if(!q||near(q,n))return;const [qx,qy]=tf(q.x,q.y);K.ln(nx,ny,qx,qy,IK,1.2,hm);if(hm>.04&&DBG.rest){c.save();c.globalAlpha=hm;c.fillStyle=pl.surf;c.strokeStyle=IK;c.lineWidth=1.5;c.beginPath();c.arc(qx,qy,3.2,0,7);c.fill();c.stroke();c.restore();}if(!hn)hn=[qx,qy];});
     if(i/nodes.length<nm&&DBG.rest){c.fillStyle=pl.surf;c.strokeStyle=IK;c.lineWidth=1.8;c.fillRect(nx-4,ny-4,8,8);c.strokeRect(nx-4,ny-4,8,8);}
     if(!kn&&i===Math.min(2,nodes.length-1))kn=[nx,ny];});
   const px=gx+W+36,la=P(t,5.4,6),y1=m+H*.3,y2=m+H*.7;
   if(kn){K.ln(kn[0]+6,kn[1],px,y1,pl.mut,1.5,la);K.pill('узел',px,y1,'l',false,la);}
   if(hn){K.ln(hn[0]+5,hn[1],px,y2,pl.mut,1.5,la);K.pill('ручка',px,y2,'l',false,la);}
 }}
};

/* ---------- простые контролы демо: те же классы, что у остального сервиса (.ctl, .seg, .chip) ---------- */
let UID=0;
function sliderEl(o){
  const id='cm-s'+(++UID),el=document.createElement('div');el.className='ctl';
  el.innerHTML='<label for="'+id+'"><span>'+esc(o.l)+'</span><output></output></label><input type="range" id="'+id+'" min="'+o.min+'" max="'+o.max+'" step="'+(o.step||1)+'" value="'+o.v+'">';
  const inp=el.querySelector('input'),out=el.querySelector('output');
  const sync=()=>{const v=+inp.value;out.textContent=o.fmt?o.fmt(v):v;inp.style.setProperty('--hi',((v-o.min)/(o.max-o.min)*100)+'%');};
  inp.addEventListener('input',()=>{sync();o.on&&o.on(+inp.value,true);});
  el.set=v=>{inp.value=v;sync();};el.inp=inp;sync();return el;
}
function segEl(label,items,val,on){
  const el=document.createElement('div');el.className='cm-seg';
  el.innerHTML='<div class="seg" role="group" aria-label="'+esc(label)+'">'+items.map(([v,t])=>'<button type="button" data-v="'+esc(v)+'" aria-pressed="'+(v===val)+'" class="'+(v===val?'on':'')+'">'+esc(t)+'</button>').join('')+'</div>';
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('button',el).forEach(x=>{const o=x===b;x.classList.toggle('on',o);x.setAttribute('aria-pressed',o?'true':'false');});on(b.dataset.v);});
  return el;
}
function chipEl(t,on0,on){
  const b=document.createElement('button');b.type='button';b.className='chip'+(on0?' on':'');b.setAttribute('aria-pressed',on0?'true':'false');b.textContent=t;
  b.addEventListener('click',()=>{const v=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',v?'true':'false');b.classList.toggle('on',v);on(v);});return b;
}
function switchEl(t,on0,on){
  const l=document.createElement('label');l.className='tgl';l.innerHTML='<input type="checkbox" role="switch"'+(on0?' checked':'')+'><span>'+esc(t)+'</span>';
  l.querySelector('input').addEventListener('change',e=>on(e.target.checked));return l;
}

/* ---------- демо в статьях: init(ctx) строит контролы и возвращает {draw, D, poster}; ctx.touch() = пользователь взял управление (петля останавливается) ---------- */
const DEMOS={
'a1-lines':{dh:240,cap:'Линии шрифта «Квадра» по слову «Дубрава». Расстояния взяты из настроек шрифта: высота прописных, строчных, выносные.',
 mk(X){const on={base:1,x:1,cap:1,asc:1,desc:1},names=[['base','Базовая'],['x','Строчные'],['cap','Прописные'],['asc','Верхние выносные'],['desc','Нижние выносные']];
  X.try('Попробуйте сами: включайте линии');names.forEach(([k,n])=>X.dc.appendChild(chipEl(n,true,v=>{on[k]=v?1:0;X.touch();})));
  return {D:11,poster:9,draw(c,w,h,t,i,pl){const run=cgRun('kvadra','Дубрава'),p=run.p,sc=Math.min((w-170)/run.tot,(h-36)/(p.asc+p.desc+p.ov*2)),x=24,y=h/2+(p.asc-p.desc)/2*sc;
   const L=[['base','базовая линия',0],['x','высота строчных',p.xh],['cap','высота прописных',p.capH],['asc','верхние выносные',p.asc],['desc','нижние выносные',-p.desc]];
   L.forEach(([k,n,v],q)=>{const a=X.manual?on[k]:(P(t,.4+q*1.1,1.1+q*1.1,TRV)*(1-P(t,9.6,10.4)));if(a<=.01)return;const yy=y-v*sc;hline(c,yy,8,8+(w-16)*a,k==='base'?pl.acc:pl.line,k==='base'?[]:[5,4],k==='base'?1.5:1);if(a>.9)label(c,n,w-12,yy+(v>=p.xh?-9:9),pl.mut,'right');});
   drawRun(c,run,x,y,sc,pl.ink);}};}},
'a1-over':{dh:260,dhp:320,cap:'«Н» и «О» рядом. Потяните «Увеличение»: в окне справа верх круглой «О» крупно, он выходит за линию прописных на несколько единиц шрифта, это и есть выход за линию.',
 mk(X){let z=1;const sl=sliderEl({l:'Увеличение',min:1,max:10,step:.1,v:1,fmt:v=>'×'+v.toFixed(1),on:v=>{z=v;X.touch();}});X.try('Попробуйте сами');X.dc.appendChild(sl);
  /* «Н» и «О» всегда целиком и без увеличения; ползунок увеличивает только окно-лупу с верхом «О», так что ни один знак не выходит за рамку, а число на ползунке = кратность лупы */
  return {D:9,poster:4.5,draw(c,w,h,t,i,pl){const run=cgRun('kvadra','НО'),p=run.p,O=run.items[1],ok=gInk(O[0]),top=ok.y1,over=top-p.capH,k=inkOf(run);
   const zz=X.manual?z:Math.round((1+8*P(t,.8,4.2,TRV)*(1-P(t,5.2,8.2,SOFT)))*10)/10;if(!X.manual)sl.set(zz);
   const m=8,gap=16,wide=w>=480,lw=wide?clamp(Math.round(w*.36),160,260):w-2*m,lh=wide?h-2*m:Math.round((h-2*m-gap)*.56),lx=wide?w-m-lw:m,ly=wide?m:h-m-lh;
   const rw=wide?lx-gap-m:w-2*m,rh=wide?h-2*m:h-2*m-gap-lh,top0=m+(wide?0:0),
    sc=Math.min(rw/(k.x1-k.x0),(rh-30)/(k.y1-k.y0)),x=m+(rw-(k.x1-k.x0)*sc)/2-k.x0*sc,yb=top0+rh/2+(k.y1+k.y0)/2*sc+8,capY=yb-p.capH*sc;
   const x0=m,x1=m+rw;hline(c,yb,x0,x1,pl.line,[],1);hline(c,capY,x0,x1,pl.acc,[6,4],1.5);drawRun(c,run,x,yb,sc,pl.ink);label(c,'высота прописных',x0,capY-11,pl.mut);
   /* лупа */
   const S=sc*zz,cxO=O[1]+(ok.x0+ok.x1)/2,lcx=lx+lw/2,capL=ly+lh*.62;
   c.save();c.beginPath();c.roundRect(lx,ly,lw,lh,12);c.fillStyle=pl.bg;c.fill();c.clip();
   const ox=lcx-cxO*S,oyb=capL+p.capH*S;c.globalAlpha=.5;drawRun(c,{items:[O]},ox,oyb,S,pl.dim);c.globalAlpha=1;
   c.save();c.beginPath();c.rect(lx,ly,lw,capL-ly);c.clip();drawRun(c,{items:[O]},ox,oyb,S,pl.ink);c.restore();/* ink = the part above the cap line, i.e. the overshoot */
   hline(c,capL,lx+6,lx+lw-6,pl.acc,[6,4],1.5);
   c.restore();c.strokeStyle=pl.line;c.lineWidth=1;c.beginPath();c.roundRect(lx+.5,ly+.5,lw-1,lh-1,11.5);c.stroke();
   label(c,'×'+zz.toFixed(1),lx+10,ly+16,pl.mut);label(c,(lw>=200?'выход за линию: ':'выход: ')+Math.round(over)+' ед.',lx+lw-10,ly+16,pl.mut,'right');}};}},
'a2-weight':{dh:230,cap:'«Фонарь» в «Квадре». Веса строятся так же, как Light, Regular, Bold и Black семейства; между ними буквы переходят плавно, как в вариативном шрифте.',
 mk(X){let wv=400;const nm=v=>v<350?'Light':v<550?'Regular':v<800?'Bold':'Black';const sl=sliderEl({l:'Насыщенность',min:300,max:900,step:10,v:400,fmt:v=>v+' · '+nm(v),on:v=>{wv=v;X.touch();}});X.try('Попробуйте сами');X.dc.appendChild(sl);
  return {D:8,poster:3,draw(c,w,h,t,i,pl){const v=X.manual?wv:300+600*(.5-.5*Math.cos(clamp(t/8)*Math.PI*2));if(!X.manual)sl.set(Math.round(v/10)*10);
   const run=weightRun('kvadra','Фонарь',v),big=weightRun('kvadra','Фонарь',900),k=inkOf(big),sc=Math.min((w-48)/(k.x1-k.x0),(h-50)/(k.y1-k.y0)),x=(w-(k.x1-k.x0)*sc)/2-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc;drawRun(c,run,x,y,sc,pl.ink);}};}},
'a2-faux':{dh:230,cap:'Слева обычная «Квадра» с обводкой, справа настоящий жирный. Следите за просветами «о», «е», «ф» и за толщиной горизонталей.',
 mk(X){let q=1;const sl=sliderEl({l:'Утолщение',min:0,max:100,step:1,v:100,fmt:v=>v+' %',on:v=>{q=v/100;X.touch();}});X.try('Попробуйте сами');X.dc.appendChild(sl);
  return {D:7,poster:3,draw(c,w,h,t,i,pl){const u=X.manual?q:P(t,.5,3,SOFT)*(1-P(t,4.5,6.5,SOFT));if(!X.manual)sl.set(Math.round(u*100));
   const R=cgRun('kvadra','Кофе'),B=weightRun('kvadra','Кофе',300+600*0+700),Bo=cgRun('kvadra','Кофе',{ratio:WRATIO[700]}),vert=w<520,
   cw=vert?w:w/2,ch=vert?h/2:h,ink=inkOf(Bo),sc=Math.min((cw-48)/(ink.x1-ink.x0+40),(ch-50)/(ink.y1-ink.y0+40)),dStem=(Bo.p.stem-R.p.stem);
   const cell=(ox,oy,faux)=>{const x=ox+(cw-(R.tot)*sc)/2,y=oy+ch/2+(ink.y1+ink.y0)/2*sc;
     if(faux){c.save();c.fillStyle=pl.ink;c.strokeStyle=pl.ink;c.lineJoin='round';c.lineWidth=dStem*u*sc;
       for(const [g,xx] of R.items){const pp=pathOf(g.cs,(px,py)=>[x+(xx+px)*sc,y-py*sc]);c.fill(pp,'nonzero');if(c.lineWidth>.1)c.stroke(pp);}c.restore();}
     else drawRun(c,lerpRun(R,Bo,u),x,y,sc,pl.ink);
     label(c,faux?'обводка':'настоящий жирный',ox+14,oy+16,pl.mut);};
   cell(0,0,true);cell(vert?0:cw,vert?ch:0,false);c.strokeStyle=pl.line;c.lineWidth=1;c.beginPath();if(vert){c.moveTo(12,ch+.5);c.lineTo(w-12,ch+.5);}else{c.moveTo(cw+.5,12);c.lineTo(cw+.5,h-12);}c.stroke();}};}},
'a2-contrast':{dh:240,cap:'Числа — «Основные штрихи» и «Соединительные штрихи» выбранного шрифта из его настроек в G-type, единицы на 1000.',
 mk(X){let f='renessa',show=true;const FN={renessa:'Ренесса',liniya:'Линия',rotunda:'Ротунда'};
  X.try('Попробуйте сами');X.dc.appendChild(segEl('Шрифт',[['renessa','Ренесса'],['liniya','Линия'],['rotunda','Ротунда']],f,v=>{f=v;X.touch();}));X.dc.appendChild(chipEl('Показать толщину',true,v=>{show=v;X.touch();}));
  return {D:9,poster:2,draw(c,w,h,t,i,pl){if(!X.manual){const k=Math.floor(t/3)%3;f=['renessa','liniya','rotunda'][k];$$('button',X.dc).forEach(b=>{if(b.dataset.v){const o=b.dataset.v===f;b.classList.toggle('on',o);b.setAttribute('aria-pressed',o?'true':'false');}});}
   const H=cgRun(f,'Н'),Wd=cgRun(f,'Нос'),p=H.p,k=inkOf(H),sc=Math.min((h-70)/(k.y1-k.y0),(w*.42)/(k.x1-k.x0)),x=24-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc+8;
   drawRun(c,H,x,y,sc,pl.ink);
   if(show){const sx0=x+k.x0*sc,st=p.stem*sc;c.fillStyle=pl.acc;c.globalAlpha=.9;c.fillRect(sx0,y-(p.capH+8)*sc-6,st,3);c.fillRect(sx0,y-(p.capH+8)*sc-10,1.5,11);c.fillRect(sx0+st-1.5,y-(p.capH+8)*sc-10,1.5,11);
    const mx=x+((k.x0+k.x1)/2)*sc,by=y-(p.capH*.5)*sc;c.fillRect(mx+st*1.2,by-p.hair*sc/2,3,p.hair*sc);c.globalAlpha=1;
    label(c,'основной штрих '+Math.round(p.stem),sx0,y-(p.capH+8)*sc-22,pl.mut);label(c,'соединительный '+Math.round(p.hair),mx+st*1.2+10,by,pl.mut);}
   const rx=Math.max(x+(k.x1)*sc+60,w*.5),s2=Math.min((w-rx-20)/(inkOf(Wd).x1-inkOf(Wd).x0),(h-70)/((inkOf(Wd).y1-inkOf(Wd).y0)));drawRun(c,Wd,rx,y,Math.min(s2,sc),pl.ink);
   label(c,FN[f],w-14,h-14,pl.mut,'right');}};}},
'a3-rhythm':{dh:210,cap:'Серые полосы — просветы между соседними буквами. Круглые «о» стоят ближе, чем прямые «н», а на глаз промежутки равны: так выглядит верно подобранный апрош.',
 mk(X){let dv=0,gaps=true;const sl=sliderEl({l:'Апрош: все поля',min:-30,max:70,step:1,v:0,fmt:v=>(v>0?'+':'')+v,on:v=>{dv=v;X.touch();}});X.try('Попробуйте сами');X.dc.append(sl,chipEl('Показать промежутки',true,v=>{gaps=v;X.touch();}));
  return {D:9,poster:1,draw(c,w,h,t,i,pl){const v=X.manual?dv:-20+60*(.5-.5*Math.cos(clamp(t/9)*Math.PI*2));if(!X.manual)sl.set(Math.round(v));
   const run=cgRun('kvadra','нонно оноон'),n=run.items.length,sp=2*v,tot=run.tot+sp*n,k=inkOf(run),sc=Math.min((w-40)/(run.tot+60*2*n/1+0.001),(h-60)/(k.y1-k.y0)),mid=run.tot+sp*n;
   const sc2=Math.min((w-40)/Math.max(mid,run.tot+2*70*n),(h-70)/(k.y1-k.y0)),x0=(w-mid*sc2)/2,y=h/2+(k.y1+k.y0)/2*sc2;
   const gx=xx=>0;const items=run.items.map(([g,xx,ch],q)=>[g,xx+sp*q+v,ch]);
   drawRun(c,{items},x0,y,sc2,pl.ink);
   if(gaps){c.fillStyle=pl.dim;c.globalAlpha=.5;for(let q=0;q<n-1;q++){const a=items[q],b=items[q+1];if(a[2]===' '||b[2]===' ')continue;const ia=gInk(a[0]),ib=gInk(b[0]),xa=x0+(a[1]+ia.x1)*sc2,xb=x0+(b[1]+ib.x0)*sc2;if(xb>xa)c.fillRect(xa,y-(k.y1)*sc2*.62,xb-xa,(k.y1-0)*sc2*.62-0);}c.globalAlpha=1;}}};}},
'a3-ta':{dh:230,cap:'Закрасьте дыру: двигайте кернинг пары «ТА». Серый треугольник — пустота под перекладиной «Т» рядом с «А».',
 mk(X){let kv=0;const sl=sliderEl({l:'Кернинг пары ТА',min:-160,max:0,step:1,v:0,fmt:v=>String(v).replace('-','−'),on:v=>{kv=v;X.touch();}});X.try('Попробуйте сами');X.dc.appendChild(sl);
  return {D:8,poster:3,draw(c,w,h,t,i,pl){const v=X.manual?kv:-120*P(t,.8,3.6,TRV)*(1-P(t,5,7.4,SOFT));if(!X.manual)sl.set(Math.round(v));
   const run=cgRun('kvadra','ТА'),p=run.p,T=run.items[0],A=run.items[1],ti=gInk(T[0]),ai=gInk(A[0]),tot=run.tot+v,sc=Math.min((w-60)/(tot+120),(h-50)/p.capH),x=(w-tot*sc)/2,y=h/2+p.capH/2*sc;
   const AX=A[1]+v;drawRun(c,{items:[T]},x,y,sc,pl.ink);drawRun(c,{items:[[A[0],AX,'А']]},x,y,sc,pl.ink);
   const stemR=(ti.x0+ti.x1)/2+p.stem/2,bar=p.capH-p.hair,apex=(ai.x0+ai.x1)/2,foot=AX+ai.x0,yy=y-bar*sc,xs=x+stemR*sc,xf=x+foot*sc,xa=x+(AX+apex)*sc,xd=xf+(xa-xf)*(bar/p.capH);
   if(xf>xs){c.fillStyle=pl.dim;c.globalAlpha=.6;c.beginPath();c.moveTo(xs,yy);c.lineTo(xd,yy);c.lineTo(xf,y);c.lineTo(xs,y);c.closePath();c.fill();c.globalAlpha=1;}
   label(c,(w>=420?'расстояние между «Т» и «А» у основания: ':'у основания: ')+Math.round(foot-stemR)+' ед.',14,h-14,pl.mut);}};}},
'a4-serifs':{dh:230,cap:'Одна и та же буква «Н» и слово «Пара» в трёх шрифтах. Кружок отмечает засечку.',
 mk(X){let f='kvadra';const FN={kvadra:['Квадра','без засечек'],renessa:['Ренесса','скобочные засечки'],kortes:['Кортес','клиновидные засечки']};
  X.try('Попробуйте сами');X.dc.appendChild(segEl('Шрифт',[['kvadra','Квадра'],['renessa','Ренесса'],['kortes','Кортес']],f,v=>{f=v;X.touch();}));
  return {D:9,poster:3.5,draw(c,w,h,t,i,pl){if(!X.manual){f=['kvadra','renessa','kortes'][Math.floor(t/3)%3];$$('button',X.dc).forEach(b=>{const o=b.dataset.v===f;b.classList.toggle('on',o);b.setAttribute('aria-pressed',o?'true':'false');});}
   const H=cgRun(f,'Н'),Wd=cgRun(f,'Пара'),hk=inkOf(H),wk=inkOf(Wd),yt=Math.max(hk.y1,wk.y1),yb=Math.min(hk.y0,wk.y0),sc=Math.min((h-70)/(yt-yb),(w*.32)/(hk.x1-hk.x0)),x=28-hk.x0*sc,y=h/2+(yt+yb)/2*sc;drawRun(c,H,x,y,sc,pl.ink);
   if(f!=='kvadra'){const r=Math.max(10,Math.min(26,(hk.x1-hk.x0)*sc*.16)),cx=x+(hk.x0+(hk.x1-hk.x0)*.12)*sc+4,cy=Math.min(y-(hk.y0+14)*sc,h-r-30);c.strokeStyle=pl.acc;c.lineWidth=2;c.beginPath();c.arc(cx,cy,r,0,7);c.stroke();}
   const rx=x+hk.x1*sc+50,s2=Math.min((w-rx-20)/(wk.x1-wk.x0),sc);drawRun(c,Wd,rx-wk.x0*s2,y,s2,pl.ink);
   label(c,FN[f][0]+' · '+FN[f][1],14,h-14,pl.mut);}};}},
'a4-swash':{dh:240,cap:'«Кортес»: хвост R уходит вправо и подныривает под следующую круглую букву, хвост Я — влево, под круглую перед ней. В слове «ЯМА» круглой буквы нет, росчерка нет.',
 mk(X){let wd='ROMA';const W={ROMA:'R + круглая O: росчерк у R',ОЯ:'круглая О + Я: росчерк у Я',ЯМА:'круглой буквы рядом нет: обычная Я'};
  X.try('Попробуйте сами: выберите слово');X.dc.appendChild(segEl('Слово',[['ROMA','ROMA'],['ОЯ','ОЯ'],['ЯМА','ЯМА']],wd,v=>{wd=v;X.touch();}));
  return {D:8,poster:5,draw(c,w,h,t,i,pl){if(!X.manual)wd=['ROMA','ОЯ','ЯМА'][Math.floor(t/ (8/3))%3];
   const sec=X.manual?1:P((t%(8/3)),.5,1.3,SOFT);if(!X.manual)$$('button',X.dc).forEach(b=>{const o=b.dataset.v===wd;b.classList.toggle('on',o);b.setAttribute('aria-pressed',o?'true':'false');});
   const A=cgRun('kortes',wd,{raw:true}),B=cgRun('kortes',wd),k=inkUni(A,B),sc=Math.min((w-60)/(k.x1-k.x0),(h-70)/(k.y1-k.y0)),x=(w-(k.x1-k.x0)*sc)/2-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc-6;
   drawRun(c,A,x,y,sc,pl.ink,{alpha:1-sec});drawRun(c,B,x,y,sc,pl.ink,{alpha:sec});label(c,W[wd],14,h-14,pl.mut);}};}},
'a4-ss':{dh:200,cap:'Набор включается одной настройкой. Выключенный набор даёт обычные формы, включённый росчерки по правилам.',
 mk(X){let on=true;X.try('Попробуйте сами');const sw=switchEl('Набор ss01 (росчерки)',true,v=>{on=v;X.touch();});X.dc.appendChild(sw);
  const tags=document.createElement('span');tags.className='cm-cap';tags.textContent='OpenType: calt, ss01';X.dc.appendChild(tags);
  return {D:7,poster:3,draw(c,w,h,t,i,pl){if(!X.manual){on=P(t%7,0,1)<.5;sw.querySelector('input').checked=on;}
   const A=cgRun('kortes','ROMA ОЯ',{raw:true}),B=cgRun('kortes','ROMA ОЯ'),run=on?B:A,k=inkUni(A,B),sc=Math.min((w-50)/(k.x1-k.x0),(h-40)/(k.y1-k.y0)),x=(w-(k.x1-k.x0)*sc)/2-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc;
   drawRun(c,run,x,y,sc,pl.ink);label(c,on?'ss01: включён':'ss01: выключен',14,h-14,pl.mut);}};}},
'a5-axes':{dh:230,cap:'Две независимые оси в одном файле: wght отвечает за насыщенность, slnt за наклон. Любое сочетание вычисляется из мастеров.',
 mk(X){let wv=400,sl_=0;const s1=sliderEl({l:'wght',min:300,max:900,step:10,v:400,fmt:v=>String(v),on:v=>{wv=v;X.touch();}}),s2=sliderEl({l:'slnt',min:-12,max:0,step:1,v:0,fmt:v=>String(v).replace('-','−'),on:v=>{sl_=v;X.touch();}});X.try('Попробуйте сами');X.dc.append(s1,s2);
  return {D:9,poster:3,draw(c,w,h,t,i,pl){const u=.5-.5*Math.cos(clamp(t/9)*Math.PI*2),W=X.manual?wv:300+600*u,SL=X.manual?sl_:-12*(.5-.5*Math.cos(clamp(t/9)*Math.PI*4));if(!X.manual){s1.set(Math.round(W/10)*10);s2.set(Math.round(SL));}
   const run=weightRun('kvadra','Ось',W),big=weightRun('kvadra','Ось',900),k=inkOf(big),sh=Math.tan(-SL*Math.PI/180),sc=Math.min((w-80)/(k.x1-k.x0),(h-60)/(k.y1-k.y0)),x=(w-(k.x1-k.x0)*sc)/2-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc;drawRun(c,run,x,y,sc,pl.ink,{shear:sh});
   label(c,'wght '+Math.round(W/10)*10+' · slnt '+String(Math.round(SL)).replace('-','−'),14,h-14,pl.mut);}};}},
'a5-tyaga':{dh:220,cap:'«Тяга»: каждая «~» после буквы — ещё одна ступень растяжения. У каждой буквы свой предел.',
 mk(X){let n=2;const sl=sliderEl({l:'Тильд после «С»',min:0,max:5,step:1,v:2,fmt:v=>'С'+'~'.repeat(v)+(v?'':' (без растяжки)'),on:v=>{n=v;X.touch();}});X.try('Попробуйте сами');X.dc.appendChild(sl);
  return {D:10,poster:5,draw(c,w,h,t,i,pl){const m=X.manual?n:Math.min(5,Math.floor(P(t,.5,9.2)*6));if(!X.manual)sl.set(m);
   const k0=inkUni(...[0,1,2,3,4,5].map(q=>cgRun('tyaga','С'+'~'.repeat(q)+'ЫР'))),sc=Math.min((w-50)/(k0.x1-k0.x0),(h-70)/(k0.y1-k0.y0)),run=cgRun('tyaga','С'+'~'.repeat(m)+'ЫР'),k=inkOf(run),x=24-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc-6;
   drawRun(c,run,x,y,sc,pl.ink);label(c,'«С'+'~'.repeat(m)+'ЫР»',14,h-14,pl.mut);}};}},
'a6-stroke':{dh:240,cap:'Буква «Б» «Квадры»: линия обходит контур, потом контур заливается. Круглые маркеры — узлы, через которые проходит линия.',
 mk(X){const b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='Показать ещё раз';X.try('Попробуйте сами');X.dc.appendChild(b);let again=0;
  b.addEventListener('click',()=>{X.restart();again=1;});
  return {D:8,poster:5.2,draw(c,w,h,t,i,pl){const run=cgRun('kvadra','Б'),k=inkOf(run),sc=Math.min((w-60)/(k.x1-k.x0),(h-50)/(k.y1-k.y0)),x=(w-(k.x1-k.x0)*sc)/2-k.x0*sc,y=h/2+(k.y1+k.y0)/2*sc,g=run.items[0][0];
   const tf=(px,py)=>[x+px*sc,y-py*sc],polys=flat(g.cs,tf),tot=polys.reduce((s,p)=>s+p.length,0),f=P(t,.3,4,INOUT),fill=P(t,4.2,5.4,SOFT)*(1-P(t,7,7.8));
   c.globalAlpha=fill;c.fillStyle=pl.ink;c.fill(pathOf(g.cs,tf),'nonzero');c.globalAlpha=1;
   c.strokeStyle=pl.ink;c.lineWidth=2;c.lineJoin='round';let left=f*tot;
   for(const p of polys){if(left<=0)break;const nn=Math.min(p.length,Math.floor(left));left-=p.length;c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let q=1;q<nn;q++)c.lineTo(p[q][0],p[q][1]);c.stroke();if(nn>0&&nn<p.length){c.fillStyle=pl.acc;c.beginPath();c.arc(p[nn-1][0],p[nn-1][1],5,0,7);c.fill();}}
   c.fillStyle=pl.acc;for(const cc of g.cs)for(const n of cc.nodes){const q=tf(n.x,n.y);c.globalAlpha=Math.min(1,f*2)*(1-fill*.0);c.beginPath();c.arc(q[0],q[1],3,0,7);c.fill();}c.globalAlpha=1;}};}},
'a6-nodes':{dh:260,cap:'«О» «Квадры» с узлами (квадраты) и ручками (линии с кружками). Двигайте длину ручки у верхнего узла: форма дуги меняется, остальные точки стоят на месте.',
 mk(X){let hv=1,show=true;const sl=sliderEl({l:'Длина ручки у верхнего узла',min:.3,max:1.7,step:.05,v:1,fmt:v=>'×'+v.toFixed(2),on:v=>{hv=v;X.touch();}});X.try('Попробуйте сами');X.dc.append(sl,chipEl('Показывать ручки',true,v=>{show=v;X.touch();}));
  return {D:8,poster:2,draw(c,w,h,t,i,pl){const k=X.manual?hv:1+.55*Math.sin(clamp(t/8)*Math.PI*2);if(!X.manual)sl.set(Math.round(k*20)/20);
   const run=cgRun('kvadra','О'),ink=inkOf(run),g=run.items[0][0],sc=Math.min((w-60)/(ink.x1-ink.x0),(h-40)/(ink.y1-ink.y0)),x=(w-(ink.x1-ink.x0)*sc)/2-ink.x0*sc,y=h/2+(ink.y1+ink.y0)/2*sc,tf=(px,py)=>[x+px*sc,y-py*sc];
   const outer=g.cs.reduce((a,cc)=>{const e=gInk({cs:[cc]});return !a||(e.x1-e.x0)>(a.e.x1-a.e.x0)?{cc,e}:a;},null).cc;let top=0;outer.nodes.forEach((n,q)=>{if(n.y>outer.nodes[top].y)top=q;});
   const cs=g.cs.map(cc=>cc!==outer?cc:{...cc,nodes:cc.nodes.map((n,q)=>{if(q!==top)return n;const sc2=(p)=>p?{x:n.x+(p.x-n.x)*k,y:n.y+(p.y-n.y)*k}:p;return {...n,a:sc2(n.a),b:sc2(n.b)};})});
   c.fillStyle=pl.dim;c.globalAlpha=.55;c.fill(pathOf(cs,tf),'nonzero');c.globalAlpha=1;c.strokeStyle=pl.ink;c.lineWidth=2;c.stroke(pathOf(cs,tf));
   if(show){for(const cc of cs)for(const n of cc.nodes)for(const q of [n.a,n.b]){if(!q||near(q,n))continue;const a=tf(n.x,n.y),b=tf(q.x,q.y);c.strokeStyle=pl.mut;c.lineWidth=1;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();c.fillStyle=pl.bg;c.strokeStyle=pl.mut;c.beginPath();c.arc(b[0],b[1],3.5,0,7);c.fill();c.stroke();}}
   for(const cc of cs)for(const n of cc.nodes){const a=tf(n.x,n.y);c.fillStyle=pl.ink;c.fillRect(a[0]-4,a[1]-4,8,8);}
   const tn=outer.nodes[top],a=tf(tn.x,tn.y);c.strokeStyle=pl.acc;c.lineWidth=2;c.beginPath();c.arc(a[0],a[1],10,0,7);c.stroke();}};}}
};


/* ---------- разметка абзацев и словарь ---------- */
const md=s=>esc(s).replace(/\[\[([a-z]+)\|([^\]]+)\]\]/g,(m,k,t)=>DT.gloss[k]?'<button type="button" class="cm-term" data-g="'+k+'" aria-expanded="false">'+t+'</button>':t).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
const POP={el:null,cur:null,t:0};
function popEl(){if(POP.el)return POP.el;const e=document.createElement('div');e.className='cm-pop';e.id='cm-pop';e.setAttribute('role','tooltip');document.body.appendChild(e);
  e.addEventListener('mouseenter',()=>clearTimeout(POP.t));e.addEventListener('mouseleave',()=>popHideSoon());return POP.el=e;}
function popShow(btn){
  clearTimeout(POP.t);const g=DT.gloss[btn.dataset.g];if(!g)return;const e=popEl();
  if(POP.cur&&POP.cur!==btn)POP.cur.setAttribute('aria-expanded','false');
  POP.cur=btn;btn.setAttribute('aria-expanded','true');btn.setAttribute('aria-describedby','cm-pop');
  e.innerHTML='<b>'+esc(g[0])+'</b><span>'+esc(g[1])+'</span>';
  const r=btn.getBoundingClientRect(),pw=e.offsetWidth,ph=e.offsetHeight,vw=document.documentElement.clientWidth,vh=window.innerHeight;
  let x=clamp(r.left+r.width/2-pw/2,8,Math.max(8,vw-pw-8)),y=r.bottom+8,below=true;
  if(y+ph>vh-8&&r.top-ph-8>=8){y=r.top-ph-8;below=false;}
  y=clamp(y,8,Math.max(8,vh-ph-8));
  e.style.left=x+'px';e.style.top=y+'px';e.style.setProperty('--ox',clamp(r.left+r.width/2-x,0,pw)+'px');e.style.setProperty('--oy',below?'0':'100%');
  e.classList.add('on');POP.at=performance.now();
}
function popHide(){clearTimeout(POP.t);if(POP.el)POP.el.classList.remove('on');if(POP.cur){POP.cur.setAttribute('aria-expanded','false');POP.cur.removeAttribute('aria-describedby');POP.cur=null;}}
function popHideSoon(){clearTimeout(POP.t);POP.t=setTimeout(popHide,160);}
function popBind(root){
  root.addEventListener('click',e=>{const b=e.target.closest('.cm-term');if(!b){return;}e.preventDefault();if(POP.cur===b&&POP.el.classList.contains('on')&&performance.now()-(POP.at||0)>450)popHide();else popShow(b);});
  root.addEventListener('mouseover',e=>{const b=e.target.closest&&e.target.closest('.cm-term');if(b&&matchMedia('(hover:hover)').matches){clearTimeout(POP.t);if(POP.cur!==b)POP.t=setTimeout(()=>popShow(b),120);}});
  root.addEventListener('mouseout',e=>{const b=e.target.closest&&e.target.closest('.cm-term');if(b&&matchMedia('(hover:hover)').matches)popHideSoon();});
  root.addEventListener('focusin',e=>{const b=e.target.closest&&e.target.closest('.cm-term');if(b)popShow(b);});
  root.addEventListener('focusout',e=>{const b=e.target.closest&&e.target.closest('.cm-term');if(b&&!(POP.el&&POP.el.matches(':hover')))popHide();});
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&POP.el&&POP.el.classList.contains('on')){e.stopPropagation();const b=POP.cur;popHide();if(b&&document.activeElement!==b)b.focus();}},true);
document.addEventListener('click',e=>{if(POP.cur&&!e.target.closest('.cm-term,#cm-pop'))popHide();});
window.addEventListener('resize',popHide);document.addEventListener('scroll',()=>{if(POP.cur)popHide();},true);

/* ---------- действия «Попробовать в G-type»: настоящий режим с подготовленным состоянием ---------- */
function toEdit(font){if(font&&FONTS[font]&&S.fontId!==font){try{switchFont(font);}catch(e){console.error(e);}}setTab('edit');}
function whenReady(fn,tries){tries=tries==null?40:tries;const f=()=>{try{if(fn())return;}catch(e){}if(--tries>0)setTimeout(f,50);};f();}
function setSample(txt){S.ctx=false;S.text=txt;const t=document.getElementById('txt');if(t)t.value=txt;try{persist();schedule();}catch(e){}}
const CTA={
 lines(){toEdit('kvadra');S.guides=true;const g=document.getElementById('gd');if(g)g.checked=true;try{schedule();}catch(e){}if(window.dwOpen)dwOpen('edit','grid');},
 draw(){setTab('draw');},
 weight(){toEdit('kvadra');if(window.dwOpen)dwOpen('edit','params');whenReady(()=>{const i=document.getElementById('p_stem');if(!i)return false;const g=i.closest('.grp');if(g&&g.classList.contains('shut')){const h=g.querySelector('h5');h&&h.click();}if(i.offsetParent===null)return false;i.focus();return true;});},
 tester(){toEdit('kvadra');whenReady(()=>{const b=document.getElementById('tt-on');if(!b)return false;if(!b.classList.contains('on'))b.click();return true;});},
 'kern-ta'(){toEdit('kvadra');KK.a='Т';KK.b='А';KK.snapped=false;setTab('kern');},
 autokern(){setTab('draw');whenReady(()=>window.dwOpen&&dwOpen('draw','spk')!==false&&true,10);},
 kortes(){toEdit('kortes');setSample('ROMA ОЯ');},
 ot(){toEdit('kortes');if(window.dwOpen)dwOpen('edit','ot');setTimeout(()=>{try{exOpen(true);}catch(e){}},120);},
 'tyaga-block'(){toEdit('tyaga');whenReady(()=>{const b=document.querySelector('#tyb-view [data-m=blk]');if(!b)return false;b.click();return true;});},
 vf(){toEdit('kvadra');setTimeout(()=>{try{exOpen(true);const v=document.querySelector('#ex-list [data-x=vf]');if(v)v.focus();}catch(e){}},120);},
 import(){if(typeof iuOpen==='function')iuOpen();}
};
function runCta(act){
  const f=CTA[act];if(!f)return false;
  /* статья закрывается: запись истории подменяется состоянием «список», «Назад» из режима возвращает к списку уроков */
  popHide();
  if(R.a){R.a=null;persistR();try{history.replaceState({cm:{a:null,c:null}},'',location.href);}catch(e){}}
  f();return true;
}

/* ---------- маршрут: R = {tab, a, c}; адрес остаётся #community, подсостояния в history.state и в localStorage ---------- */
const R={tab:ST.c?'challenges':'lessons',a:ST.a,c:ST.c};
/* popstate, который пришёл до загрузки раздела (Назад/Вперёд на запись #community из другой вкладки): состояние записи важнее сохранённого места */
(function(){const ps=window.__cmStub&&__cmStub.pop&&__cmStub.pop(),c=ps&&ps.cm;if(ps){R.a=c&&ART[c.a]?c.a:null;R.c=c&&CHS[c.c]?c.c:null;R.tab=R.c?'challenges':'lessons';}})();
const persistR=()=>{R.tab=R.c?'challenges':'lessons';ST.tab=R.tab;ST.a=R.a;ST.c=R.c;saveNow();};
let VIEW=null,ROOT=null,BUILT=false,SCR=null,LSY=null;
const inComm=()=>typeof S!=='undefined'&&S.tab==='community';
const atLanding=()=>!R.a&&!R.c;
/* одна страница: лендинг, статья или челлендж. Адрес остаётся #community; место хранится в history.state и в localStorage. Со статьи и челленджа «Назад» возвращает на лендинг на то же место прокрутки */
function nav(next,o){
  o=o||{};const n={a:next.a||null,c:next.c||null};if(n.a)n.c=null;
  const same=n.a===R.a&&n.c===R.c;const fromLand=atLanding();
  if(atLanding()&&!same)LSY=[window.scrollY||0,VIEW?VIEW.scrollTop:0];
  R.a=n.a;R.c=n.c;persistR();
  if(!o.silent&&!same){try{const st={cm:{a:R.a,c:R.c,fl:fromLand}};if(o.replace)history.replaceState(st,'',location.href);else history.pushState(st,'',location.href);}catch(e){}}
  show(o.noScroll||(atLanding()&&!same&&LSY?'restore':false));
}
window.addEventListener('popstate',e=>{setTimeout(()=>{if(!inComm())return;const s=e.state&&e.state.cm;
  const was=atLanding();if(was)LSY=[window.scrollY||0,VIEW?VIEW.scrollTop:0];
  const n=s?{a:ART[s.a]?s.a:null,c:CHS[s.c]?s.c:null}:{a:null,c:null};
  R.a=n.a;R.c=n.c;persistR();show(atLanding()&&LSY?'restore':false);},0);});

/* ---------- каркас вкладки (строится один раз при первом входе) ---------- */
function build(){
  if(BUILT)return;BUILT=true;VIEW=document.getElementById('view-comm');
  VIEW.innerHTML='<div class="cm"><div class="vhead"><h2>Сообщество</h2></div><div id="cm-main"></div></div>';
  ROOT=document.getElementById('cm-main');
  popBind(VIEW);
  ROOT.addEventListener('click',onClick);
  const sc=()=>readProg();VIEW.addEventListener('scroll',sc,{passive:true});window.addEventListener('scroll',sc,{passive:true});window.addEventListener('resize',sc);
}
function seam(){VIEW.querySelector('.vhead').hidden=!atLanding();}
function show(mode){
  if(!BUILT)return;
  howClose(true);anDrop(ROOT);popHide();unbindProg();if(BRO){BRO.disconnect();BRO=null;}
  const was=ROOT.firstElementChild;
  ROOT.innerHTML='';
  if(R.a)viewArticle(R.a);else if(R.c)viewChallenge(R.c);else viewLanding();
  seam();ROOT.dataset.sig=R.a+'|'+R.c;
  if(mode==='restore'&&LSY){const y=LSY;try{window.scrollTo(0,y[0]);}catch(e){}VIEW.scrollTop=y[1];}
  else if(!mode){VIEW.scrollTop=0;try{window.scrollTo(0,0);}catch(e){}}
  const fresh=ROOT.firstElementChild;if(fresh&&mode!=='restore'&&!motionOff()&&fresh.animate&&was!==fresh)try{fresh.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:MO.D('base'),easing:MO.E('out')});}catch(e){}
  readProg();
}
/* «Как участвовать»: floating popover anchored to the button's bottom-left (8 px offset, may extend below the banner); flips up only without room below, shifts inside the viewport (16 px margin); Esc, outside click, second click and scroll close it */
let HOW=null;
/* layout box of the button (ignores press / hover transforms) */
function howRect(b,B){let x=0,y=0,e=b;while(e&&e!==HOW.ban){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}return {left:B.left+x,top:B.top+y,bottom:B.top+y+b.offsetHeight,right:B.left+x+b.offsetWidth};}
function howInline(){return window.matchMedia('(max-width:1060px)').matches;}
function howPlace(){
  if(!HOW||HOW.inl)return;const {b,p,ban}=HOW,B=ban.getBoundingClientRect(),T=howRect(b,B),vw=document.documentElement.clientWidth,vh=window.innerHeight;
  p.style.left='0px';p.style.top='0px';const w=p.offsetWidth,h=p.offsetHeight;
  const M=16,minX=M,maxX=vw-M,minY=M,maxY=vh-M;
  const below=T.bottom+8,above=T.top-8-h;let up;
  if(below+h<=maxY)up=false;else if(above>=minY)up=true;else up=(maxY-T.bottom)<(T.top-minY);
  let top=up?above:below;top=Math.min(Math.max(top,minY),Math.max(minY,maxY-h));
  let left=Math.min(Math.max(T.left,minX),Math.max(minX,maxX-w));
  p.style.left=Math.round(left-B.left)+'px';p.style.top=Math.round(top-B.top)+'px';p.style.setProperty('--sy',(up?4:-4)+'px');
}
function howOpen(b){
  const ban=b.closest('.cm-ban'),p=$('#cm-howp',ban);if(!p)return;HOW={b,p,ban,inl:howInline()};popHide();
  p.style.setProperty('--sy','-4px');howPlace();b.setAttribute('aria-expanded','true');p.classList.add('on');
}
function howClose(quiet,focus){
  if(!HOW)return;const {b,p}=HOW;HOW=null;p.classList.remove('on');b.setAttribute('aria-expanded','false');if(focus&&!quiet&&b.isConnected)b.focus();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&HOW){e.stopPropagation();howClose(false,true);}},true);
document.addEventListener('pointerdown',e=>{if(HOW&&!HOW.inl&&!HOW.p.contains(e.target)&&!HOW.b.contains(e.target))howClose(false,false);},true);
document.addEventListener('scroll',()=>{if(HOW)howPlace();},true);
window.addEventListener('resize',()=>{if(HOW){if(HOW.inl!==howInline())howClose(true);else howPlace();}});
function onClick(e){
  const t=e.target.closest('[data-act]');if(!t||!ROOT.contains(t))return;const a=t.dataset.act;
  if(a==='open'){nav({a:t.dataset.id});}
  else if(a==='back'){/* «Все уроки/челленджи» ведут только на главную «Сообщества»: history.back() — лишь если сюда пришли с неё, иначе Назад увёл бы в Избранное/Библиотеку */const hs=history.state&&history.state.cm;hs&&hs.fl&&(R.a||R.c)?history.back():nav({});}
  else if(a==='how'){if(HOW&&HOW.b===t)howClose(false,true);else howOpen(t);}
  else if(a==='fav')toggleFav(t.dataset.id,t);
  else if(a==='filter'){LF=t.dataset.f;renderGrid();}
  else if(a==='cta')runCta(t.dataset.cta);
  else if(a==='next')nav({a:t.dataset.id});
  else if(a==='och')nav({c:t.dataset.id});
  else chClick(a,t);
}

/* ---------- избранное и прочитанное ---------- */
function toggleFav(id,btn){
  const on=!ST.fav[id];if(on)ST.fav[id]=1;else delete ST.fav[id];saveNow();
  $$('[data-act=fav][data-id="'+id+'"]').forEach(b=>starSync(b,id));
  if(atLanding()){if(LF==='fav'){renderGrid();const nb=$('.cm-grid [data-act=fav]',ROOT)||$('.cm-bar-f [data-f=fav]',ROOT);if(nb)nb.focus();}else barSync();}
  try{toast(on?'Статья добавлена в избранное':'Статья убрана из избранного');}catch(e){}
}
function starSync(b,id){const on=!!ST.fav[id];b.setAttribute('aria-pressed',on?'true':'false');const l=(on?'Убрать из избранного: ':'В избранное: ')+ART[id].title;b.setAttribute('aria-label',l);b.title=l;}
const starBtn=id=>{const l=(ST.fav[id]?'Убрать из избранного: ':'В избранное: ')+ART[id].title;return '<button type="button" class="heart" data-act="fav" data-id="'+id+'" aria-pressed="'+(!!ST.fav[id])+'" aria-label="'+esc(l)+'" title="'+esc(l)+'"><i class="ico"></i></button>';};
const chips=(a,st,end)=>{const t=(st?'':'<span class="cm-chip">Для новичков</span>')+'<span class="cm-chip">'+a.min+' мин</span><span class="cm-chip">'+esc(a.tag)+'</span>'+(st?stateHTML(a.id,1):'');return end?'<div class="cm-chips cm-chrow"><div class="cm-chips cm-tg">'+t+'</div><span class="cm-chend">'+end+'</span></div>':'<div class="cm-chips">'+t+'</div>';};
/* прогресс чтения в целых процентах; полоса и метка «N %» только при 0 < p < 100 и без отметки «прочитано» (отметка ставится с 96 %) */
const readPct=(rd,pr)=>rd?100:Math.max(0,Math.round((+pr||0)*100));
const CHECK_TAG='<span class="cm-chip cm-state done" title="Прочитано"><i class="ico i-check" aria-hidden="true"></i><span class="vh">Прочитано</span></span>';
/* тонкая полоса 3 px по нижнему краю обложки (или карточки без обложки): трек = --ink с малой прозрачностью, заливка = --ink, концы прямые; обложка и карточка обрезают её по своему радиусу */
const progBar=(rd,pr)=>{const p=readPct(rd,pr);return p>0&&p<100?'<span class="cm-rp" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+p+'"><i style="width:'+p+'%"></i></span><span class="vh">Прочитано '+p+' %</span>':'';};
function stateHTML(id,card){
  const p=readPct(ST.read[id],ST.prog[id]);
  if(ST.read[id])return card?CHECK_TAG:'<span class="cm-chip cm-state done"><i class="ico i-check" aria-hidden="true"></i>Прочитано</span>';
  if(p>0)return card?'':'<span class="cm-chip cm-state"><span class="cm-pb" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+p+'" style="--w:'+p+'%"><i></i></span>Прочитано '+p+' %</span>';
  return card?'':'<span class="cm-chip cm-state">Не прочитано</span>';
}

/* ---------- уроки: список ---------- */
let LF='all';
const kick=t=>'<span class="cm-kick">'+t+'</span>';
/* рамка обложки 2:1: свой <img> (поле cover = URL или data URI; coverAlt = описание) либо анимированный canvas */
const coverHTML=(o,alt,label,extra)=>'<div class="cm-cv">'+(o.cover?'<img src="'+esc(o.cover)+'" alt="'+esc(o.coverAlt||alt)+'" loading="lazy" decoding="async">':'<canvas role="img" aria-label="'+esc(label)+'"></canvas>')+(extra||'')+'</div>';
const coverImgs=root=>$$('.cm-cv img',root).forEach(im=>im.addEventListener('error',()=>im.classList.add('bad')));
function chShort(c){return fmtRange(c).replace(/\s\d{4}$/,'');}
function viewLanding(){
  const g=chByDate(),feat=g.run[0]||g.soon[0]||g.done[0],fc=feat.c,fs=feat.s;
  const rest=o=>o.filter(x=>x.c!==fc);
  const card=({c,s})=>'<article class="cm-chc" data-ch="'+c.id+'">'+coverHTML(c,'Обложка челленджа «'+c.title+'»','Постер-пример к челленджу «'+c.title+'»')+'<div class="cm-body"><div class="cm-bm">'+stHTML(s)+'<span class="cm-bd">'+esc(chShort(c))+'</span></div><h3>'+esc(c.title)+'</h3><p class="cm-lead">'+esc(c.lead)+'</p><div class="cm-act"><button type="button" class="btn ink sm" data-act="och" data-id="'+c.id+'">Открыть<span class="vh"> челлендж «'+esc(c.title)+'»</span></button></div></div></article>';
  const sec=(t,l)=>l.length?'<section class="cm-sec"><h2>'+t+'</h2><div class="cm-chg">'+l.map(card).join('')+'</div></section>':'';
  const steps=fs.k==='done'?'':'<button type="button" class="btn lg cm-howb" data-act="how" aria-expanded="false" aria-controls="cm-howp" aria-haspopup="true">Как участвовать<i class="ico i-chev-down" aria-hidden="true"></i></button>';
  ROOT.innerHTML='<article class="cm-ban" data-ch="'+fc.id+'" aria-label="'+(fs.k==='run'?'Сейчас идёт':'Ближайший')+' челлендж"><div class="cm-bx"><h3>'+esc(fc.title)+'</h3><p class="cm-bl">'+esc(fc.lead)+'</p><div class="cm-bm">'+stHTML(fs)+'<span class="cm-bd">'+esc(fmtRange(fc))+'</span></div><div class="cm-bb"><button type="button" class="btn pri lg" data-act="och" data-id="'+fc.id+'">Открыть челлендж<span class="vh">: '+esc(fc.title)+'</span></button>'+steps+'</div></div>'+coverHTML(fc,'Пример плаката к челленджу «'+fc.title+'»','Пример плаката от G-type к теме «'+fc.title+'»')
   +(fs.k==='done'?'':'<div class="cm-howp" id="cm-howp" role="group" aria-labelledby="cm-howh"><div class="cm-howi"><div class="cm-howc"><h4 id="cm-howh">Как участвовать</h4><ol><li>Выберите шрифт в G-type</li><li>Наберите свой текст и настройте шрифт под настроение</li><li>Сделайте плакат и сохраните его в «Мои работы»</li></ol></div></div></div>')+'</article>'
   +'<section class="cm-sec" id="cm-les" aria-labelledby="cm-lh"><div class="vhead"><div class="cm-hh"><h2 id="cm-lh">Уроки</h2><span class="cm-hn">Для новичков · '+DT.arts.length+' '+((n=>n%10===1&&n%100!==11?'урок':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'урока':'уроков')(DT.arts.length))+'</span></div><div class="vctl"><div class="seg cm-bar-f" role="group" aria-label="Фильтр уроков"></div></div></div><div class="cm-grid" id="cm-grid"></div><div class="cm-empty" id="cm-empty" hidden></div></section>'
   +sec('Скоро',rest(g.soon))+sec('Идут сейчас',rest(g.run))+sec('Завершённые',rest(g.done))
   +'<p class="cm-note">Раздел пока работает в пробном режиме: даты и правила настоящие, а приём работ ещё не подключён. Всё, что вы делаете здесь, хранится только в вашем браузере.</p>';
  renderGrid();
  const bc=$('.cm-ban .cm-cv canvas',ROOT);if(bc)anAdd({cv:bc,ar:2,cov:true,D:0,poster:0,t:0,vis:false,ready:false,init:()=>{},draw:(cx,w,h)=>posterDraw(cx,w,h,fc,true)});
  $$('.cm-chc',ROOT).forEach(el=>{const ch=CHS[el.dataset.ch],cv=$('canvas',el);if(cv)anAdd({cv,ar:2,cov:true,D:0,poster:0,t:0,vis:false,ready:false,init:()=>{},draw:(cx,w,h,t,i,pl)=>miniPoster(cx,w,h,ch,pl)});});
  coverImgs(ROOT);
  banFit();
}
/* banner: the poster (4:5) is as tall as the text block minus its caption, so the banner height follows the text */
let BRO=null;
function banFit(){
  if(BRO){BRO.disconnect();BRO=null;}
  const ban=$('.cm-ban',ROOT),bx=ban&&$('.cm-bx',ban);if(!bx||typeof ResizeObserver==='undefined')return;
  const set=()=>{const h=Math.round(bx.getBoundingClientRect().height);if(h>0)ban.style.setProperty('--bh',h+'px');};
  set();BRO=new ResizeObserver(set);BRO.observe(bx);
}
/* обложка карточки челленджа 2:1: плакат-пример по центру на нейтральном фоне */
function miniPoster(c,w,h,ch,pl){
  c.fillStyle=pl.bg;c.fillRect(0,0,w,h);const f=ch.poster.fmt,r=f==='1:1'?1:f==='9:16'?9/16:.8,m=Math.round(h*.09),ph=h-2*m,pw=Math.min(ph*r,w-2*m),hh=pw/r,x=(w-pw)/2,y=(h-hh)/2;
  c.save();c.fillStyle=pl.line;c.fillRect(x-1,y-1,pw+2,hh+2);c.translate(x,y);c.beginPath();c.rect(0,0,pw,hh);c.clip();posterDraw(c,pw,hh,ch);c.restore();
}
function barSync(){const bar=$('.cm-bar-f',ROOT);if(!bar)return;const n={all:DT.arts.length,fav:favIds().length,unread:DT.arts.filter(a=>!ST.read[a.id]).length};$$('button',bar).forEach(b=>{const k=b.dataset.f;b.textContent=({all:'Все',fav:'Избранное',unread:'Не прочитано'})[k]+' · '+n[k];});}
function renderGrid(){
  const bar=$('.cm-bar-f',ROOT),grid=$('#cm-grid',ROOT),em=$('#cm-empty',ROOT);if(!grid)return;
  anDrop(grid);
  const nf=favIds().length,nu=DT.arts.filter(a=>!ST.read[a.id]).length;
  const F=[['all','Все',DT.arts.length],['fav','Избранное',nf],['unread','Не прочитано',nu]];
  const fk=document.activeElement&&bar.contains(document.activeElement)?document.activeElement.dataset.f:null;
  bar.innerHTML=F.map(([k,t,n])=>'<button type="button" class="'+(LF===k?'on':'')+'" data-act="filter" data-f="'+k+'" aria-pressed="'+(LF===k)+'">'+t+' · '+n+'</button>').join('');
  if(fk){const nb=bar.querySelector('[data-f="'+fk+'"]');if(nb)nb.focus();}
  const list=DT.arts.filter(a=>LF==='fav'?ST.fav[a.id]:LF==='unread'?!ST.read[a.id]:true);
  grid.innerHTML=list.map(cardHTML).join('');grid.hidden=!list.length;
  em.hidden=!!list.length;
  if(!list.length)em.innerHTML=LF==='fav'?'<b>В избранном пока нет статей</b><span>Нажмите «В избранное» на карточке урока, и он появится здесь и в разделе «Избранное».</span><button type="button" class="btn" data-act="filter" data-f="all">Показать все уроки</button>':'<b>Все уроки прочитаны</b><span>Любой из них можно открыть заново.</span><button type="button" class="btn" data-act="filter" data-f="all">Показать все уроки</button>';
  $$('.cm-card',grid).forEach((el,k)=>{const a=ART[el.dataset.art],cv=$('canvas',el),def=COVERS[a.anim];
    if(cv)anAdd({cv,ar:2,cov:true,id:a.anim,D:def.D,poster:def.poster,draw:def.draw,t:def.poster,vis:false,ready:false,init:()=>{}});});
  coverImgs(grid);
}
function cardHTML(a){
  return '<article class="cm-card" data-art="'+a.id+'">'+coverHTML(a,'Обложка урока «'+a.title+'»','Анимация к уроку: '+a.title,progBar(ST.read[a.id],ST.prog[a.id]))+'<div class="cm-body">'+chips(a,1)+'<h3 title="'+esc(a.title)+'">'+esc(a.title)+'</h3><p class="cm-lead" title="'+esc(a.lead)+'">'+esc(a.lead)+'</p><div class="cm-act"><button type="button" class="btn pri sm" data-act="open" data-id="'+a.id+'">Читать<span class="vh"> урок «'+esc(a.title)+'»</span></button>'+starBtn(a.id)+'</div></div></article>';
}

/* ---------- статья ---------- */
let PG=null;
function viewArticle(id){
  const a=ART[id],nx=ART[a.next];
  const secs=a.secs.map(s=>'<h2>'+esc(s.h)+'</h2>'+s.p.map(p=>'<p>'+md(p)+'</p>').join('')+(s.demo&&DEMOS[s.demo]?'<figure class="cm-demo" data-demo="'+s.demo+'"><div class="cm-dv" style="--dh:'+DEMOS[s.demo].dh+'px'+(DEMOS[s.demo].dhp?';--dhp:'+DEMOS[s.demo].dhp+'px':'')+'"><canvas role="img" aria-label="'+esc(DEMOS[s.demo].cap)+'"></canvas></div><div class="cm-dc"></div><figcaption class="cm-cap">'+esc(DEMOS[s.demo].cap)+'</figcaption></figure>':'')).join('');
  const quiz=a.quiz.map((q,qi)=>'<fieldset class="cm-q" data-q="'+qi+'"><legend>'+(qi+1)+'. '+esc(q.q)+'</legend>'+q.o.map((o,oi)=>'<button type="button" class="cm-opt" data-o="'+oi+'" aria-pressed="false"><span class="dot" aria-hidden="true"></span><span>'+esc(o)+'</span></button>').join('')+'<p class="cm-fb" role="status"></p></fieldset>').join('');
  const ctas=a.cta.map((c,i)=>'<li><button type="button" class="btn'+(i?'':' pri')+'" data-act="cta" data-cta="'+c.act+'">'+esc(c.l)+'</button><span class="cm-hint">'+esc(c.h)+'</span></li>').join('');
  ROOT.innerHTML='<div class="cm-art" data-art="'+id+'"><div class="cm-prog" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>'
   +'<div class="cm-col cm-ah"><button type="button" class="btn ghost sm cm-back" data-act="back"><i class="ico i-back" aria-hidden="true"></i>Все уроки</button>'+chips(a,0,starBtn(id)+'<span id="cm-rs">'+stateHTML(id)+'</span>')+'<h1 tabindex="-1">'+esc(a.title)+'</h1><p class="cm-lead">'+esc(a.lead)+'</p></div>'
   +'<div class="cm-col cm-prose">'+secs+'</div>'
   +'<section class="cm-col cm-quiz" aria-labelledby="cm-qh"><h2 id="cm-qh">Проверьте себя</h2>'+quiz+'<p class="cm-score" id="cm-score"></p></section>'
   +'<section class="cm-col cm-cta" aria-labelledby="cm-ch"><h2 id="cm-ch">Попробовать в G-type</h2><ul class="cm-ctas">'+ctas+'</ul></section>'
   +'<section class="cm-col cm-next" aria-labelledby="cm-nh"><div><h2 id="cm-nh">Следующий урок</h2><b>'+esc(nx.title)+'</b><span>'+nx.min+' мин · '+esc(nx.tag)+'</span></div><button type="button" class="btn" data-act="next" data-id="'+nx.id+'">Читать дальше</button></section></div>';
  $$('.cm-demo',ROOT).forEach(mountDemo);
  quizInit(id);scoreSync(id);
  const h=$('h1',ROOT);if(h)try{h.focus({preventScroll:true});}catch(e){}
  bindProg(id);
}
function mountDemo(fig){
  const def=DEMOS[fig.dataset.demo],cv=$('canvas',fig),dc=$('.cm-dc',fig);
  const X={cv,dc,t:0,vis:false,ready:false,manual:false,D:0,poster:0,
    try(txt){const p=document.createElement('p');p.className='cm-try';p.textContent=txt;dc.appendChild(p);},
    touch(){if(!X.manual){X.manual=true;anKick();}render(X,motionOff()?null:undefined);},
    restart(){X.manual=false;X.t=0;X.t0=performance.now();anKick();render(X,motionOff()?null:0);}};
  const sp=def.mk(X);X.D=sp.D;X.poster=sp.poster;X.draw=sp.draw;X.init=()=>{};
  if(!dc.children.length)dc.remove();
  anAdd(X);
}
/* мини-тест: мгновенный дружелюбный отклик; ответ можно поменять; результат хранится */
function quizInit(id){
  const a=ART[id],q0=obj(ST.quiz[id]);
  $$('.cm-q',ROOT).forEach(fs=>{const qi=+fs.dataset.q,q=a.quiz[qi],fb=$('.cm-fb',fs);
    const set=(oi,silent)=>{$$('.cm-opt',fs).forEach(b=>{const k=+b.dataset.o;b.classList.remove('ok','no');b.setAttribute('aria-pressed',k===oi?'true':'false');if(k===oi)b.classList.add(oi===q.ok?'ok':'no');});
      fb.className='cm-fb'+(oi===q.ok?' ok':'');fb.textContent=oi===q.ok?q.yes:q.no;};
    fs.addEventListener('click',e=>{const b=e.target.closest('.cm-opt');if(!b)return;const oi=+b.dataset.o;set(oi);const m=obj(ST.quiz[id]);m[qi]=oi===q.ok?1:0;ST.quiz[id]=m;saveNow();scoreSync(id);});
    if(q0[qi]===1)set(q.ok);
  });
}
function scoreSync(id){const el=$('#cm-score',ROOT);if(!el)return;const m=obj(ST.quiz[id]),n=ART[id].quiz.length,ok=Object.values(m).filter(v=>v===1).length,tried=Object.keys(m).length;el.hidden=tried<n;el.textContent=tried<n?'':ok===n?'Верно на оба вопроса. Урок можно считать пройденным.':'Верных ответов: '+ok+' из '+n+'. Можно попробовать ещё раз.';}
/* прогресс чтения: линия 80 % высоты окна против блока статьи; дошли до конца = «Прочитано» */
function bindProg(id){PG={id,el:$('.cm-art',ROOT),bar:$('.cm-prog',ROOT),last:0};}
function unbindProg(){PG=null;}
function readProg(){
  if(!PG||!PG.el||!PG.el.isConnected)return;
  const r=PG.el.getBoundingClientRect(),vh=window.innerHeight,p=clamp((vh*.8-r.top)/Math.max(1,r.height-vh*.2));
  PG.bar.style.setProperty('--p',p.toFixed(4));PG.bar.setAttribute('aria-valuenow',String(Math.round(p*100)));
  const id=PG.id;if(p>(+ST.prog[id]||0)+.01){ST.prog[id]=Math.round(p*100)/100;save();}
  if(p>=.96&&!ST.read[id]){ST.read[id]=1;ST.prog[id]=1;saveNow();const rs=$('#cm-rs',ROOT);if(rs)rs.innerHTML=stateHTML(id);}
}

/* ---------- челленджи: список ---------- */
function chByDate(){const o=DT.chs.map(c=>({c,s:chStatus(c)}));return {run:o.filter(x=>x.s.k==='run'),soon:o.filter(x=>x.s.k==='soon').sort((a,b)=>a.c.start<b.c.start?-1:1),done:o.filter(x=>x.s.k==='done').sort((a,b)=>a.c.end<b.c.end?1:-1)};}
const stHTML=s=>'<span class="cm-st'+(s.k==='run'?' run':'')+'">'+esc(s.label)+'</span>';
const posterOf=c=>c.poster;
/* пример плаката: те же фиксированные палитры, что у окна «Поделиться» (не зависят от темы сервиса) */
const PPAL={light:['#efeff1','#0b0b0c'],dark:['#131316','#f4f4f6']};
function posterDraw(c,w,h,ch,wide){
  const pr=ch.preset,po=posterOf(ch),pal=PPAL[po.theme]||PPAL.light,words=po.phrase.split(' ').filter(Boolean);let lines=words.length>3?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:words;
  if(wide){const two=words.length>1?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:words,fit=L=>{const ks=L.map(l=>inkOf(cgRun(pr.font,l,{})));const p=Math.max(16,w*.08),lhh=Math.max(...ks.map(k=>k.y1-k.y0))*1.12;return Math.min(...ks.map(k=>(w-2*p)/Math.max(1,k.x1-k.x0)),(h-2*p)/(lhh*L.length));};lines=fit([words.join(' ')])>=fit(two)?[words.join(' ')]:two;}
  c.fillStyle=pal[0];c.fillRect(0,0,w,h);
  const pad=Math.max(16,w*.08),runs=lines.map(l=>cgRun(pr.font,l,{})),ks=runs.map(inkOf);
  let sc=Math.min(...ks.map(k=>(w-2*pad)/Math.max(1,k.x1-k.x0)));const lh=(Math.max(...ks.map(k=>k.y1-k.y0)))*1.12;sc=Math.min(sc,(h-2*pad)/(lh*lines.length));
  let y=(h-lh*sc*lines.length)/2;
  runs.forEach((r,i)=>{const k=ks[i];const x=(w-(k.x1-k.x0)*sc)/2-k.x0*sc;drawRun(c,r,x,y+(lh*sc+(k.y1+k.y0)*sc)/2-0,sc,pal[1]);y+=lh*sc;});
}

/* ---------- челлендж: страница ---------- */
const PROG=[['font','Выбран шрифт',1],['edit','Изменены настройки шрифта',1],['poster','Сделан постер',1],['rules','Прочитаны правила',0],['chk','Проверен чек-лист перед отправкой',0],['sent','Работа отправлена',0]];
const worksOf=id=>{const w=ld(WKEY);return Array.isArray(w[id])?w[id]:[];};
function viewChallenge(id){
  const c=CHS[id],s=chStatus(c),sg=stagesOf(c),t=dayN(nowD()),cs=chS(id),lessons=c.lessons.map(k=>ART[k]).filter(Boolean);
  ST.act=id;save();
  const tl=sg.map(g=>{const now=t>=g.a&&t<=g.b,past=t>g.b;return '<li class="'+(now?'now':past?'past':'')+'"><div class="cm-tlh"><b>'+esc(g.t)+'</b>'+(now?'<span class="cm-st run cm-today">Сегодня</span>':'')+'</div><span>'+esc(g.d)+'</span></li>';}).join('');
  const prog=PROG.map(([k,tx,au])=>{const on=au?cs.a[k]:cs.m[k];return '<li class="'+(on?'done':'')+'"><label><input type="checkbox" data-pk="'+k+'" data-au="'+au+'"'+(on?' checked':'')+(au?' disabled':'')+'><span>'+esc(tx)+'</span>'+(au?'<span class="auto">'+(on?'отмечено само':'отметится само')+'</span>':'')+'</label></li>';}).join('');
  const chk=c.check.map((x,i)=>'<li><label><input type="checkbox" data-ci="'+i+'"'+(cs.c[i]?' checked':'')+'><span>'+esc(x)+'</span></label></li>').join('');
  const fonts=c.fonts.filter(f=>FONTS[f]).map(f=>'<button type="button" class="btn sm" data-act="cfont" data-f="'+f+'">'+esc(FONTS[f].name)+'</button>').join('');
  const les=lessons.map(a=>'<button type="button" class="btn sm cm-lk" data-act="open" data-id="'+a.id+'">'+esc(a.title)+'</button>').join('');
  const faq=c.faq.map((f,i)=>paneHTML('cm-faq-'+id+'-'+i,esc(f[0]),'<p class="cm-cap">'+esc(f[1])+'</p>',{cls:'line'})).join('');
  const works=worksOf(id);
  ROOT.innerHTML='<div class="cm-ch" style="display:flex;flex-direction:column;gap:clamp(18px,2.2vw,28px);min-width:0">'
  +'<section class="cm-hero" aria-labelledby="cm-hh"><div class="cm-hx"><button type="button" class="btn ghost sm cm-back" data-act="back"><i class="ico i-back" aria-hidden="true"></i>Все челленджи</button><div class="cm-row">'+kick('Челлендж')+stHTML(s)+'</div><h1 id="cm-hh" tabindex="-1">'+esc(c.title)+'</h1><p class="cm-lead">'+esc(c.brief)+'</p><p class="cm-dl"><span><b>Даты:</b> '+esc(fmtRange(c))+'</span></p>'
  +(s.k==='done'?'<p class="cm-cap">Приём работ завершён '+esc(fmtD(c.end))+'.</p>':'')
  +'<div class="cm-act"><button type="button" class="btn pri lg" data-act="prep">Подготовить работу</button><button type="button" class="btn lg" data-act="ics"><i class="ico i-cal" aria-hidden="true"></i>Добавить в календарь</button></div></div>'
  +'<div class="cm-hp"><div class="cm-pv"><canvas role="img" aria-label="Пример плаката от G-type: «'+esc(c.poster.phrase)+'»"></canvas></div></div></section>'
  +'<div class="cm-two"><section class="cm-box" aria-labelledby="cm-rh"><h2 id="cm-rh">Правила</h2><ol class="cm-ol">'+c.rules.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ol></section>'
  +'<section class="cm-box" aria-labelledby="cm-th"><h2 id="cm-th">Сроки</h2><p class="cm-cap" style="margin:0">Сегодня: '+esc(nowD().getDate()+' '+MON[nowD().getMonth()]+' '+nowD().getFullYear())+'</p><ol class="cm-tl">'+tl+'</ol></section></div>'
  +'<section class="cm-box" aria-labelledby="cm-tph"><h2 id="cm-tph">Рекомендации</h2><ul class="cm-ul">'+c.tips.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul></section>'
  +'<section class="cm-sec" aria-labelledby="cm-gh"><h2 id="cm-gh">Как поможет G-type</h2><div class="cm-tools">'
   +'<div class="cm-tool"><h3>Шрифты для темы</h3><p>Откроются в редакторе, чтобы вы сразу попробовали своё название.</p><div class="cm-fonts">'+fonts+'</div></div>'
   +'<div class="cm-tool"><h3>Готовый пресет</h3><p>«'+esc(c.preset.name)+'»: '+esc(c.preset.note)+'</p><button type="button" class="btn sm" data-act="preset">Применить пресет</button></div>'
   +'<div class="cm-tool"><h3>Макет постера</h3><p>Окно «Поделиться шрифтом» с форматом '+esc(c.poster.fmt)+' и подсказкой-фразой. Скачанный PNG попадёт в «Мои работы».</p><button type="button" class="btn sm" data-act="poster">Открыть макет постера</button></div>'
   +'<div class="cm-tool"><h3>Уроки по теме</h3><p>Короткие статьи, которые пригодятся в этой работе.</p><div class="cm-lks">'+les+'</div></div>'
   +'<div class="cm-tool cm-tool-chk"><h3>Чек-лист перед отправкой</h3><ul class="cm-chk">'+chk+'</ul></div></div></section>'
  +'<div class="cm-two"><section class="cm-box" aria-labelledby="cm-ph"><h2 id="cm-ph">Мой прогресс</h2><div class="cm-ps"><span class="cm-pb" id="cm-pbar" role="progressbar" aria-label="Выполнено" aria-valuemin="0" aria-valuemax="'+PROG.length+'"><i></i></span><span class="cm-cap" id="cm-pn" style="margin:0"></span></div><ul class="cm-chk" id="cm-prog">'+prog+'</ul><p class="cm-cap">Три первых пункта отмечаются сами, когда вы выбираете шрифт, меняете настройки или скачиваете постер после открытия этой страницы.</p></section>'
  +'<section class="cm-box" aria-labelledby="cm-wh"><h2 id="cm-wh">Мои работы</h2><p class="cm-cap" style="margin:0">Ваши постеры, сделанные через «Макет постера». Хранятся только в этом браузере и никуда не отправляются.</p><div id="cm-works"></div><div class="cm-act"><button type="button" class="btn" data-act="prep">Подготовить работу</button></div></section></div>'
  +(s.k==='done'?'<section class="cm-box" aria-labelledby="cm-sh"><h2 id="cm-sh">Итоги</h2><div class="cm-res">Итоги ещё не опубликованы. Организаторы покажут их здесь, когда подведут.</div></section>':'')
  +'<section class="cm-box cm-faq" aria-labelledby="cm-fh"><h2 id="cm-fh">Вопросы и ответы</h2>'+faq+'</section></div>';
  $$('.pane',ROOT).forEach(pn=>paneInit(pn,pn.dataset.pane,false));
  const ex=$('.cm-hp .cm-pv canvas',ROOT);if(ex)anAdd({cv:ex,ar:.8,D:0,poster:0,t:0,vis:false,ready:false,init:()=>{},draw:(cx,w,h)=>posterDraw(cx,w,h,c)});
  worksRender(id);progSync(id);
  ROOT.addEventListener('change',chChange);
  const h=$('h1',ROOT);if(h)try{h.focus({preventScroll:true});}catch(e){}
}
function progSync(id){
  const cs=chS(id),n=PROG.filter(([k,,au])=>au?cs.a[k]:cs.m[k]).length,bar=$('#cm-pbar',ROOT),pn=$('#cm-pn',ROOT);if(!bar)return;
  bar.style.setProperty('--w',(n/PROG.length*100)+'%');bar.setAttribute('aria-valuenow',String(n));pn.textContent=n+' из '+PROG.length;
  $$('#cm-prog li',ROOT).forEach((li,i)=>{const [k,,au]=PROG[i],on=au?cs.a[k]:cs.m[k],cb=$('input',li);cb.checked=!!on;li.classList.toggle('done',!!on);const a=$('.auto',li);if(a)a.textContent=on?'отмечено само':'отметится само';});
}
function chChange(e){
  const t=e.target,id=R.c;if(!id||!t.matches('input[type=checkbox]'))return;const cs=chS(id);
  if(t.dataset.pk&&t.dataset.au==='0'){if(t.checked)cs.m[t.dataset.pk]=1;else delete cs.m[t.dataset.pk];saveNow();progSync(id);}
  else if(t.dataset.ci!=null){if(t.checked)cs.c[t.dataset.ci]=1;else delete cs.c[t.dataset.ci];saveNow();const all=CHS[id].check.every((_,i)=>cs.c[i]);if(all&&!cs.m.chk){cs.m.chk=1;saveNow();progSync(id);}}
}
function worksRender(id){
  const box=$('#cm-works',ROOT);if(!box)return;const w=worksOf(id);
  box.innerHTML=w.length?'<div class="cm-works">'+w.map((x,i)=>'<figure class="cm-work" style="margin:0"><img alt="Ваша работа: постер '+esc(x.fmt)+', шрифт «'+esc(x.font||'')+'»" src="'+esc(x.img)+'"><span>'+esc(x.d)+' · '+esc(x.fmt)+' · '+esc(x.font||'')+'</span><button type="button" class="ibtn sm cm-wx" data-act="wdel" data-i="'+i+'" aria-label="Убрать работу из списка"><i class="ico i-close" aria-hidden="true"></i></button></figure>').join('')+'</div>':'<div class="cm-empty"><i class="ico i-image" aria-hidden="true"></i><b>Пока пусто</b><span>Сделайте постер в «Макете постера»: после «Скачать PNG» он появится здесь. Чужих работ тут нет, только ваши.</span><button type="button" class="btn" data-act="prep">Подготовить работу</button></div>';
  const nx=box.nextElementSibling;if(nx&&nx.classList.contains('cm-act'))nx.hidden=!w.length;
}
function openFont(id){if(!FONTS[id])return;actNote('font');toEdit(id);}
function chClick(a,t){
  const id=R.c,c=id&&CHS[id];
  if(a==='cfont')openFont(t.dataset.f);
  else if(a==='preset'&&c)applyPreset(c);
  else if(a==='prep'&&c){applyPreset(c,true);}
  else if(a==='poster'&&c)openPoster(c,t);
  else if(a==='ics'&&c)saveIcs(c);
  else if(a==='wdel'&&c){const all=ld(WKEY),l=Array.isArray(all[id])?all[id]:[];l.splice(+t.dataset.i,1);all[id]=l;sv(WKEY,all);worksRender(id);}
}
function applyPreset(c,prep){
  const pr=c.preset;if(!FONTS[pr.font])return;actNote('font',pr.font);
  toEdit(pr.font);
  try{const ok=preClean([{name:pr.name,p:pr.p}],pr.font)[0];if(ok){snap();Object.assign(cur().p,ok.p);syncPanel();bump();}}catch(e){console.error(e);}
  actNote('edit');
  if(prep){setSample(c.poster.phrase);if(window.SHARE)SHARE.pending={ch:c.id,preset:c.poster};toast('Пресет применён. Дальше: «Скачать шрифт» → «Поделиться шрифтом», формат '+c.poster.fmt+' уже выбран');}
  else toast('Применён пресет «'+pr.name+'»');
}
function openPoster(c,opener){
  const pr=c.preset;if(!FONTS[pr.font]||!window.SHARE)return;actNote('font',pr.font);
  SHARE.open(pr.font,FONTS[pr.font].name,{opener,preset:c.poster,ch:c.id});
}
/* .ics: событие на весь срок приёма (DTEND — следующий день, как требует формат), строки сворачиваются по 75 байт */
function icsEsc(s){return String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');}
function icsFold(l){const enc=new TextEncoder(),out=[];let cur='',n=0;for(const ch of l){const b=enc.encode(ch).length;if(n+b>(out.length?74:75)){out.push(cur);cur='';n=0;}cur+=ch;n+=b;}out.push(cur);return out.join('\r\n ');}
function icsText(c){
  const d=s=>s.replace(/-/g,''),e=parse(c.end),endEx=isoOf(new Date(e.getFullYear(),e.getMonth(),e.getDate()+1)),n=new Date(),st=n.getUTCFullYear()+pad2(n.getUTCMonth()+1)+pad2(n.getUTCDate())+'T'+pad2(n.getUTCHours())+pad2(n.getUTCMinutes())+pad2(n.getUTCSeconds())+'Z';
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//G-type//Community preview//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+c.id+'-'+c.start+'@g-type.preview','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+d(c.start),'DTEND;VALUE=DATE:'+d(endEx),'SUMMARY:'+icsEsc('Челлендж G-type: '+c.title),'DESCRIPTION:'+icsEsc(c.lead+' Последний день приёма работ: '+fmtD(c.end)+'.'),'TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR'];
  return L.map(icsFold).join('\r\n')+'\r\n';
}
function saveIcs(c){const bytes=new TextEncoder().encode(icsText(c));if(typeof saveFile==='function')saveFile('gtype-'+c.id+'.ics',bytes,'text/calendar');}

/* ---------- «отметится само»: настоящие действия после открытия страницы челленджа (шрифт выбран, настройки изменены, постер скачан) ---------- */
let ACTSIG='';
function actNote(k,fid){
  const id=ST.act;if(!id||!CHS[id])return;if(chStatus(CHS[id]).k==='done')return;
  const cs=chS(id);if(cs.a[k])return;cs.a[k]=1;if(k==='font'){try{ACTSIG=JSON.stringify(cur().p);}catch(e){}}saveNow();
  if(inComm()&&R.c===id)progSync(id);
}
/* switchFont / bump оборачивает загрузчик ui_comm_boot.js (раздел может быть ещё не загружен) и зовёт эти функции: sw = после смены шрифта, bump = после правки, seed = подпись до загрузки */
const hkSw=(id,same)=>{if(!same&&FONTS[id])actNote('font',id);try{ACTSIG=JSON.stringify(cur().p);}catch(e){}};
const hkBump=()=>{if(ST.act&&ACTSIG){try{if(JSON.stringify(cur().p)!==ACTSIG){actNote('edit');ACTSIG='';}}catch(e){}}};
const hkSeed=sig=>{ACTSIG=sig;};
(function hook(){
  document.addEventListener('gtype:poster',e=>{const d=e.detail||{};const id=d.ch;if(!CHS[id])return;
    try{const src=d.canvas,tw=220,th=Math.round(tw*src.height/src.width),o=document.createElement('canvas');o.width=tw;o.height=th;const x=o.getContext('2d');x.drawImage(src,0,0,tw,th);
      const all=ld(WKEY),l=Array.isArray(all[id])?all[id]:[];l.unshift({img:o.toDataURL('image/jpeg',.72),fmt:d.fmt,theme:d.theme,font:(FONTS[d.font]&&FONTS[d.font].name)||d.name||'',d:fmtD(isoOf(nowD()))});all[id]=l.slice(0,6);sv(WKEY,all);}catch(x){}
    const cs=chS(id);cs.a.poster=1;saveNow();if(inComm()&&R.c===id){worksRender(id);progSync(id);}});
})();

/* ---------- «Избранное»: раздел «Статьи» (читает только маленький ключ, ничего не строит, пока статей в избранном нет) ---------- */
function favRender(){
  const sec=document.getElementById('fav-art'),box=document.getElementById('fav-artlist');if(!sec||!box)return;
  const j=BUILT?ST:ld(KEY),fv=obj(j.fav),ids=DT.arts.filter(a=>fv[a.id]);
  sec.hidden=!ids.length;
  const em=document.getElementById('fav-empty');if(em&&ids.length)em.hidden=true;
  if(!ids.length){box.textContent='';return;}
  const rd=obj(j.read),pg=obj(j.prog);
  box.innerHTML=ids.map(a=>'<article class="cmf-card" data-art="'+a.id+'"><div class="cm-chips"><span class="cm-chip">Урок</span><span class="cm-chip">'+a.min+' мин</span>'+(rd[a.id]?CHECK_TAG:'')+'</div><h3>'+esc(a.title)+'</h3><p class="cm-lead">'+esc(a.lead)+'</p><div class="cm-act"><button type="button" class="btn pri sm" data-fa="open" data-id="'+a.id+'">Читать<span class="vh"> урок «'+esc(a.title)+'»</span></button><button type="button" class="heart" data-fa="fav" data-id="'+a.id+'" aria-pressed="true" aria-label="Убрать из избранного: '+esc(a.title)+'" title="Убрать из избранного: '+esc(a.title)+'"><i class="ico"></i></button></div>'+progBar(rd[a.id],pg[a.id])+'</article>').join('');
}
(function favHook(){
  const box=document.getElementById('fav-artlist');
  if(box)box.addEventListener('click',e=>{const b=e.target.closest('[data-fa]');if(!b)return;const id=b.dataset.id;
    if(b.dataset.fa==='open'){open(id);}
    else{const j=ld(KEY);if(BUILT){delete ST.fav[id];saveNow();}else{const f=obj(j.fav);delete f[id];j.fav=f;sv(KEY,j);ST.fav=f;}favRender();try{toast('Статья убрана из избранного');}catch(x){}
      const nx=box.querySelector('[data-fa=fav]');if(nx)nx.focus();else{const h=document.getElementById('fav-art-h');if(h){h.tabIndex=-1;h.focus();}}}});
})();

/* ---------- вход / выход ---------- */
let ENT=false;
function enter(){
  VIEW=document.getElementById('view-comm');if(!VIEW)return;
  const first=!BUILT,again=ENT;ENT=true;build();
  /* W95: кнопка рейла «Сообщество» внутри статьи или челленджа ведёт на главную раздела (раньше ничего не происходило) */
  if(again&&!atLanding()){nav({});return;}
  /* возврат по рейлу показывает то место, где вы остановились; запись истории получает состояние после записи ui_nav */
  if(first||!ROOT.firstElementChild||ROOT.dataset.sig!==R.a+'|'+R.c)show();else{seam();if(atLanding())renderGrid();anKick();}  /* hearts removed in «Избранное» while away */
  setTimeout(()=>{if(inComm()){try{const o=history.state&&history.state.cm,k=o&&o.fl&&o.a===R.a&&o.c===R.c;history.replaceState({cm:k?{a:R.a,c:R.c,fl:true}:{a:R.a,c:R.c}},'',location.href);}catch(e){}}},0);
  anKick();
}
function leave(){ENT=false;popHide();const v=document.getElementById('view-comm');if(v&&BUILT){v.hidden=true;}howClose(true);anKick();}
function open(id){if(!ART[id])return;if(inComm())nav({a:id});else{R.a=id;R.c=null;persistR();setTab('community');}}
function openCh(id){if(!CHS[id])return;if(inComm())nav({c:id});else{R.c=id;R.a=null;persistR();setTab('community');}}
function coverCheck(id,w,h,t){
  const run=o=>{const cv=document.createElement('canvas');cv.width=w*2;cv.height=h*2;const c=cv.getContext('2d');c.scale(2,2);Object.assign(DBG,{ink:true,band:true,rest:true},o||{});LBX=[];let err=null;
    try{COVERS[id].draw(c,w,h,t,{},TESTP);}catch(e){err=String(e);}const bx=LBX;LBX=null;Object.assign(DBG,{ink:true,band:true,rest:true});return {err,bx,d:c.getImageData(0,0,w*2,h*2).data};};
  const R0=run(),d=R0.d,W=w*2,Hh=h*2,e2=4;let edge=0;
  const isBg=k=>d[k]>=253&&d[k+1]>=253&&d[k+2]>=253&&d[k+3]>=250;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){if(x>=e2&&x<W-e2&&y>=e2&&y<Hh-e2){x=W-e2-1;continue;}if(!isBg((y*W+x)*4))edge++;}
  /* связные компоненты не-фона: меньше 6 px² (24 устройств. пикселя) = мусорные точки */
  const seen=new Uint8Array(W*Hh);let tiny=0;
  for(let i=0;i<W*Hh;i++){if(seen[i]||isBg(i*4))continue;let n=0;const st=[i];seen[i]=1;while(st.length){const q=st.pop();n++;const x=q%W,y=(q/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=Hh)continue;const j=Y*W+X;if(!seen[j]&&!isBg(j*4)){seen[j]=1;st.push(j);}}}if(n<24)tiny++;}
  /* подсветка (band) не должна заходить на чернила знаков */
  const B=run({ink:false,rest:false}),I=run({band:false,rest:false});let bandPx=0,both=0;
  for(let i=0;i<W*Hh;i++){const k=i*4,isb=B.d[k+3]>0&&(B.d[k]<250||B.d[k+1]<250),isi=I.d[k]<70&&I.d[k+1]<70&&I.d[k+3]>200;if(isb){bandPx++;if(isi)both++;}}
  return {err:R0.err,boxes:R0.bx,edge,tiny,bandPx,both};
}
const API={refresh:()=>show('restore'),cover:id=>COVERS[id],coverCheck,open,openCh,state:()=>({...R}),store:()=>ST,status:chStatus,stages:stagesOf,icsText,posterDraw,CTA,runCta,
  anim:{running:()=>AN.raf!==0,ticks:()=>AN.ticks,visible:()=>[...AN.set].filter(i=>i.vis).length,all:()=>AN.set.size,insts:()=>[...AN.set]},
  gloss:()=>DT.gloss,demos:()=>Object.keys(DEMOS),covers:()=>Object.keys(COVERS),built:()=>BUILT,render,cgRun,inkOf,lerpRun,weightRun,favRender,nav,palette,pop:POP,worksOf,actNote,data:DT};
API.hk={enter,leave,favRender,sw:hkSw,bump:hkBump,seed:hkSeed};
if(window.__cmStub)__cmStub.ready(API);else window.COMM=API;
})();
