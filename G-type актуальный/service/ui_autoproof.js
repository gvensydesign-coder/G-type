/* Фоновая сверка: после паузы в правках проверяет знаки порциями в простое браузера,
   ставит точки в списке знаков, показывает сводку в шапке и умеет исправлять безопасно (через «Отменить»). */
const AP_BID='__BID__';
const AP={res:new Map(),kern:new Map(),sSig:'',eSig:new Map(),job:0,t:0,lp:0,running:false,ver:-1,sum:{n:0,fix:0}};
(function(){const st=document.createElement('style');st.textContent=
'.gb{position:relative}.gb .apd{position:absolute;left:5px;top:5px;width:8px;height:8px;border-radius:50%;background:var(--danger);pointer-events:none}'+
'.gb .apd.w{background:var(--paper);border:2px solid var(--warn);box-sizing:border-box}'+
'.apchip{display:inline-flex;align-items:center;gap:7px;border:0;background:var(--panel);color:var(--ink);font:inherit;font-weight:600;font-size:var(--fs-md);padding:7px 12px;border-radius:var(--r-pill);cursor:pointer;white-space:nowrap}'+
'.apchip i{width:8px;height:8px;border-radius:50%;background:var(--ok);flex:none}.apchip.bad{background:var(--danger-soft);color:var(--danger)}.apchip.bad i{background:var(--danger)}.apchip.ok{background:transparent;color:var(--muted)}'+
'body.tab-lib .apchip,body.tab-proof .apchip{display:none}'+
'.appop{position:fixed;z-index:60;width:min(360px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;scrollbar-width:none;background:var(--paper);border-radius:var(--r-md);box-shadow:var(--sh-3);padding:12px;display:none}'+
'.appop::-webkit-scrollbar{display:none}.appop.on{display:block}.appop h4{margin:2px 4px 8px;font-size:var(--fs-base)}'+
'.appop .ar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 6px;border-top:1px solid var(--line)}.appop .ar b{font-size:var(--fs-2xl);width:30px;text-align:center;flex:none}'+
'.appop .ar .bt{display:flex;gap:6px;width:100%;padding-left:40px}.appop .ar span{flex:1 1 0;min-width:0;font-size:var(--fs-md);line-height:1.3}.appop .ar button,.appop .af button{border:0;border-radius:var(--r-pill);padding:6px 11px;font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;background:var(--panel);color:var(--ink)}'+
'.appop .ar button.fx,.appop .af .fx{background:var(--accent);color:var(--on-accent)}.appop .af{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 8px}'+
'.apchip .n{display:none}@media (max-width:560px){.apchip .t{display:none}.apchip.bad .n{display:inline}}';document.head.appendChild(st);})();
const APK_GEO=k=>k!=='sbL'&&k!=='sbR';
function apKind(t){return /поля/.test(t)?'m':'g';}
/* столкновение пользовательской пары кернинга: профили краёв по строкам, кеш по объекту знака */
const _apProf=new WeakMap();
function apProf(g){let p=_apProf.get(g);if(p)return p;const m=rast(g.cs),L=[],R=[];
  for(let j=0;j<RH;j+=2){let lo=-1,hi=-1;const o=j*RW;for(let i=0;i<RW;i++)if(m[o+i]){lo=i;break;}
    if(lo>=0)for(let i=RW-1;i>=0;i--)if(m[o+i]){hi=i+1;break;}
    L.push(lo<0?null:RX0+lo/RK);R.push(lo<0?null:RX0+hi/RK);}
  p={L,R,adv:g.adv};_apProf.set(g,p);return p;}
function apKernIssues(){
  const out=new Map(),key=S.style,ku=S.styles[key]&&S.styles[key].ku;if(!ku)return out;
  for(const k of Object.keys(ku)){const c=Array.from(k);if(c.length!==2||!ku[k])continue;
    const ga=getFinal(c[0],key),gb=getFinal(c[1],key);if(!ga||!gb||!ga.cs.length||!gb.cs.length)continue;
    const A=apProf(ga),B=apProf(gb);let mn=1e9;
    for(let j=0;j<A.L.length;j++){const r=A.R[j],l=B.L[j];if(r==null||l==null)continue;mn=Math.min(mn,A.adv-r+l+ku[k]);}
    if(mn<4){const a=out.get(c[0])||[];a.push({pair:k,t:'ваш кернинг «'+k+'» сталкивает знаки'});out.set(c[0],a);}}
  return out;}
function apStyleSig(){const s=cur();return S.fontId+'|'+S.style+'|'+JSON.stringify([s.p,s.lat,s.hg]);}
/* хеш подписи (cyrb53): в памяти и в кеше на диске хранится он, а не вся строка */
function apHash(str){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(36);}
/* результаты по парам (шрифт, начертание): переключение шрифта и возврат не пересчитывают ничего; на диске (IndexedDB) — между сеансами */
const APS=new Map();
const APDB={p:null};
function apDB(){if(APDB.p)return APDB.p;
  APDB.p=new Promise(res=>{try{const q=indexedDB.open('gtype-proof-v1',1);q.onupgradeneeded=()=>{try{q.result.createObjectStore('p');}catch(e){}};q.onsuccess=()=>{res(q.result);setTimeout(()=>apDBSweep(q.result),4000);};q.onerror=q.onblocked=()=>res(null);}catch(e){res(null);}});
  return APDB.p;}
/* кэш на диске ограничен: чужая сборка (bid), запись старше 21 дня или шрифт, которого больше нет — удаляются при загрузке */
const AP_TTL=21*864e5;
function apDBSweep(db){try{const os=db.transaction('p','readwrite').objectStore('p'),now=Date.now();
  os.openCursor().onsuccess=e=>{const c=e.target.result;if(!c)return;const v=c.value,fid=String(c.key).split('|')[0];
    if(!v||v.bid!==AP_BID||!(now-(v.t||0)<AP_TTL)||(!FONTS[fid]&&fid!=='imp'))c.delete();c.continue();};}catch(e){}}
function apDBGet(k){return apDB().then(db=>new Promise(res=>{if(!db)return res(null);try{const r=db.transaction('p').objectStore('p').get(k);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null);}catch(e){res(null);}}));}
function apDBPut(k,v){apDB().then(db=>{if(!db)return;try{db.transaction('p','readwrite').objectStore('p').put(v,k);}catch(e){}});}
function apStore(){const k=S.fontId+'|'+S.style;let st=APS.get(k);
  if(!st){st={k,res:new Map(),eSig:new Map(),loaded:S.fontId==='imp',p:null,dirty:false};APS.set(k,st);}
  AP.res=st.res;AP.eSig=st.eSig;return st;}
function apSave(st){if(!st.dirty||S.fontId==='imp')return;st.dirty=false;
  const ents=[];for(const [ch,es] of st.eSig){const r=st.res.get(ch);if(r)ents.push([ch,es,r]);}
  apDBPut(st.k,{bid:AP_BID,t:Date.now(),ents});}
function apSoon(){clearTimeout(AP.t);AP.t=setTimeout(apStart,150);}
window.autoProofSoon=apSoon;
function apFinish(){
  AP.running=false;apKernDone();
  /* вкладка «Сверка» получает готовый результат без пересчёта */
  const res=new Map();for(const ch of CHARSET){const r=AP.res.get(ch);if(r)res.set(ch,r);}
  PF.ver=ver;PF.style=S.style;PF.res=res;
}
function apStart(){
  if(TAB_NAV.has(S.tab)){return;}
  if(S.live||drag||performance.now()-lastBump<300){apSoon();return;}
  const store=apStore();
  if(!store.loaded){
    if(!store.p)store.p=apDBGet(store.k).then(d=>{try{if(d&&d.bid===AP_BID)for(const [ch,es,r] of d.ents)if(!store.eSig.has(ch)){store.eSig.set(ch,es);store.res.set(ch,r);}}catch(e){}store.loaded=true;apSoon();});
    return;}
  const job=++AP.job,sig=apHash(apStyleSig());
  const todo=[];
  for(const ch of CHARSET){if(isSpaceCh(ch)||isTyTilde(ch))continue;
    const es=apHash(sig+'#'+JSON.stringify(edGet(S.edits,ch)||0));
    if(AP.eSig.get(ch)!==es||!AP.res.has(ch))todo.push([ch,es]);}
  /* сначала знаки с правками и выбранный — замечания по ним появляются почти сразу */
  const pr=c=>c===S.sel?0:(S.edits[c]||(AP.res.get(c)&&AP.res.get(c).lvl))?1:2;todo.sort((a,b)=>pr(a[0])-pr(b[0]));
  const v0=ver;
  if(!todo.length){apFinish();return;}
  const st=cur(),des=designComps();let i=0;AP.running=true;
  const step=dl=>{
    if(job!==AP.job)return;
    if(ver!==v0||S.live||drag){AP.running=false;apSoon();return;}
    const t0=performance.now(),budget=dl&&dl.timeRemaining?Math.max(10,Math.min(40,dl.timeRemaining()-2)):10;
    while(i<todo.length){const [ch,es]=todo[i++];
      try{AP.res.set(ch,proofChar(ch,st,des));AP.eSig.set(ch,es);store.dirty=true;}catch(e){AP.res.delete(ch);AP.eSig.delete(ch);}
      if(performance.now()-t0>budget)break;}
    if(i<todo.length){if(t0-AP.lp>250){AP.lp=t0;apPaint();}idle(step);return;}
    apFinish();apSave(store);
  };
  idle(step);
}
function apKernDone(){try{AP.kern=apKernIssues();}catch(e){AP.kern=new Map();}apPaint();}
/* ---- индикация ---- */
function apItems(){
  const items=[];
  for(const ch of CHARSET){const r=AP.res.get(ch),k=AP.kern.get(ch),is=[];
    if(r)for(const x of r.issues)is.push({lvl:x.lvl,t:x.t,kind:apKind(x.t)});
    if(k)for(const x of k)is.push({lvl:1,t:x.t,kind:'k',pair:x.pair});
    if(!is.length)continue;
    const e=S.edits[ch]||{};
    const fix={geo:Object.keys(e).some(APK_GEO)&&is.some(x=>x.kind==='g'),mar:!!(e.sbL||e.sbR)&&is.some(x=>x.kind==='m'),
      kern:is.filter(x=>x.kind==='k').map(x=>x.pair)};
    items.push({ch,is,lvl:Math.max(...is.map(x=>x.lvl)),fix,fixable:fix.geo||fix.mar||fix.kern.length>0});}
  return items;}
let _apItems=[],_apGroups=[];
function apPaint(){
  _apItems=apItems();
  /* двойники (латиница/кириллица) с одинаковыми замечаниями — одна строка */
  const gm=new Map();for(const it of _apItems){const r=AP.res.get(it.ch),k=it.is.map(x=>x.t).join(';')+'|'+(r?r.adv:0);
    let g=gm.get(k);if(!g){g={ch:it.ch,chs:[it.ch],is:it.is,lvl:it.lvl,mem:[it]};gm.set(k,g);}else if(!/[\u0400-\u04ff]/.test(it.ch)||g.chs.length&&false){g.chs.push(it.ch);g.mem.push(it);}else{g.chs.push(it.ch);g.mem.push(it);}}
  _apGroups=[...gm.values()];for(const g of _apGroups){g.fixable=g.mem.some(x=>x.fixable);g.label=g.ch;}
  /* FX80 B04: единица счёта везде — знак (латинский и кириллический двойники считаются отдельно); строки списка по-прежнему слиты в группы */
  AP.sum={n:_apItems.length,fix:_apItems.filter(x=>x.fixable).length,err:_apItems.filter(x=>x.lvl>=2).length};
  apPaintList();apPaintChip();if(APP.el&&APP.el.classList.contains('on'))apPopFill();}
function apPaintList(){
  const by=new Map(_apItems.map(x=>[x.ch,x]));
  for(const t of thumbs){const it=by.get(t.ch);let d=t.b.querySelector('.apd');
    const base=t.b.dataset.t0||(t.b.dataset.t0=t.b.title);
    if(!it){if(d)d.remove();t.b.title=base;continue;}
    if(!d){d=document.createElement('i');d.className='apd';t.b.appendChild(d);}
    d.classList.toggle('w',it.lvl<2);
    t.b.title=base+'\n'+it.is.map(x=>x.t).join('; ');}}
const APP={el:null,chip:null};
function apEnsureUI(){
  if(APP.chip&&document.body.contains(APP.chip))return;
  const c=document.createElement('button');c.type='button';c.className='apchip ok';c.id='apchip';c.setAttribute('aria-haspopup','dialog');
  c.innerHTML='<i></i><span class="t">Всё чисто</span><b class="n"></b>';
  const tabs=document.querySelector('.top .tabs')||document.querySelector('.top');
  if(tabs&&tabs.parentNode&&tabs.classList.contains('tabs'))tabs.parentNode.insertBefore(c,tabs.nextSibling);else if(tabs)tabs.appendChild(c);else document.body.appendChild(c);
  const p=document.createElement('div');p.className='appop';p.setAttribute('role','dialog');p.id='appop';document.body.appendChild(p);
  APP.chip=c;APP.el=p;
  c.addEventListener('click',e=>{e.stopPropagation();if(!AP.sum.n)return;p.classList.toggle('on');if(p.classList.contains('on')){apPopFill();apPlace();}});
  document.addEventListener('click',e=>{if(!p.contains(e.target)&&e.target!==c&&!c.contains(e.target))p.classList.remove('on');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')p.classList.remove('on');});
  window.addEventListener('resize',apPlace);
}
function apPlace(){const p=APP.el,c=APP.chip;if(!p||!c)return;const r=c.getBoundingClientRect(),w=Math.min(360,innerWidth-24);
  p.style.top=(r.bottom+8)+'px';p.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+'px';}
function apPaintChip(){apEnsureUI();const c=APP.chip,n=AP.sum.n;
  c.classList.toggle('ok',!n);c.classList.toggle('bad',!!n);c.classList.toggle('warn',!!n&&!AP.sum.err);
  const word=n+' '+((n%10===1&&n%100!==11)?'знак требует':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'знака требуют':'знаков требуют')+' внимания';
  c.querySelector('.t').textContent=n?word:'Всё чисто';c.querySelector('.n').textContent=n||'';c.title=n?'Открыть список замечаний':'Фоновая сверка: замечаний нет';
  if(!n&&APP.el)APP.el.classList.remove('on');}
function apPopFill(){const p=APP.el;p.innerHTML='';
  const h=document.createElement('h4');h.textContent=_apItems.length?'Требуют внимания: '+_apItems.length:'Всё чисто';p.appendChild(h);
  const af=document.createElement('div');af.className='af';
  if(AP.sum.fix){const b=document.createElement('button');b.type='button';b.className='fx';b.textContent='Исправить автоматически ('+AP.sum.fix+')';b.addEventListener('click',()=>apFix(_apItems.filter(x=>x.fixable)));af.appendChild(b);}
  const rb=document.createElement('button');rb.type='button';rb.textContent='Подробный отчёт';rb.addEventListener('click',()=>{p.classList.remove('on');setTab('proof');});af.appendChild(rb);p.appendChild(af);
  for(const it of _apGroups){const row=document.createElement('div');row.className='ar';
    row.innerHTML='<b></b><span></span>';row.firstChild.textContent=it.label;const bt=document.createElement('div');bt.className='bt';row.children[1].textContent=it.is.map(x=>x.t).join('; ');
    const show=document.createElement('button');show.type='button';show.textContent='Показать';show.addEventListener('click',()=>{p.classList.remove('on');if(S.tab!=='edit')setTab('edit');selectGlyph(it.ch);
      const gb=document.querySelector('.gb[data-ch="'+CSS.escape(it.ch)+'"]');if(gb&&gb.scrollIntoView)gb.scrollIntoView({block:'nearest'});});
    bt.appendChild(show);
    if(it.fixable){const f=document.createElement('button');f.type='button';f.className='fx';f.textContent='Исправить';f.addEventListener('click',()=>apFix(it.mem.filter(x=>x.fixable)));bt.appendChild(f);}
    row.appendChild(bt);
    p.appendChild(row);}}
/* ---- исправление: одна отмена на всё ---- */
function apFix(list){
  snap();let n=0;
  for(const it of list){const e=S.edits[it.ch];
    if(e){if(it.fix.geo)for(const k of Object.keys(e))if(APK_GEO(k)){delete e[k];n++;}
      if(it.fix.mar){delete e.sbL;delete e.sbR;n++;}
      if(!Object.keys(e).length)delete S.edits[it.ch];}
    if(it.fix.kern.length){const ku=S.styles[S.style].ku;for(const k of it.fix.kern){delete ku[k];n++;}}}
  S.node=null;bump();syncPanel();
  toast('Исправлено знаков: '+list.length+'. «Отменить» вернёт всё как было');
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{apEnsureUI();apSoon();},900));
