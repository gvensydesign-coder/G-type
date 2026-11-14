/* Stage 4C: история правок (отмена / повтор / панель «История» с превью).
   Две области: 'ed' (редактор, по шрифтам) и 'dr' (рисование). Запись = полный снимок состояния, разрезанный на строки-компоненты
   (параметры, правки знака, кернинг...), неизменившиеся строки общие у соседних записей. Запись добавляется, когда состояние
   изменилось: границы жеста — snap() / pushUndo(), отпускание указателя, пауза 400 мс. Восстановление в редакторе идёт теми же
   сеттерами, что и прежняя отмена (снимок кладётся в стек и вызывается прежний undo: проверка, зажатие, перерисовка, перо, свои знаки).
   Stage 5A: у каждого шрифта (и у рисования) своя лента, она живёт между переключениями шрифтов и перезагрузками: IndexedDB
   (запасной вариант — localStorage; без хранилища — только память), записи <= 100, <= ~2 МБ на шрифт, <= ~20 МБ всего (вытесняются давно не открывавшиеся),
   запись лениво (простой, пауза 2 с, pagehide), чтение по требованию при первом обращении к ленте. */
window.HIST=(()=>{
  const CAP=100,MEM=6e6,IDLE_MS=400,SEP='\u0001',FD={styles:2,edits:1,custom:1},SAVE_MS=2000,KEEP_MEM=3;
  const T={},tm={};let busy=false,dirty={ed:0,dr:0},LU=null,LS=null,openSc=null,anchor=null,pvq=0,tick=0,fgNow='';
  const scNow=()=>S.tab==='draw'?'dr':'ed';
  const tkey=sc=>sc==='dr'?'dr':'ed:'+S.fontId;
  const js=v=>JSON.stringify(v);
  /* ---- состояние -> компоненты ---- */
  function walk(c,p,v,d){if(d>0&&v&&typeof v==='object'&&!Array.isArray(v)){c[p]='{}';for(const k in v)walk(c,p+SEP+k,v[k],d-1);}else{const s=js(v);if(s!==undefined)c[p]=s;}}
  function flat(o){const c={};for(const k in o)walk(c,k,o[k],FD[k]||0);return c;}
  function unflat(c){const o={};for(const k of Object.keys(c)){const q=k.split(SEP);let t=o;for(let i=0;i<q.length-1;i++)t=t[q[i]];t[q[q.length-1]]=JSON.parse(c[k]);}return o;}
  function rawSnap(){if(!LS)return null;LS();return undoStack.pop();}
  function comps(sc){
    if(sc==='dr'){const h=window.GT_DRAW&&GT_DRAW.hist;if(!h||!h.ready())return null;return h.ser();}
    const s=rawSnap();return s?flat(JSON.parse(s)):null;}
  function same(a,b,ig){const ka=Object.keys(a);if(ka.length!==Object.keys(b).length)return false;for(const k of ka)if(a[k]!==b[k]&&k!==ig)return false;return true;}
  function share(c,h){let n=0;for(const k in c){if(h[k]===c[k])c[k]=h[k];else n+=c[k].length;}return n;}
  /* ---- подписи ---- */
  const un=t=>t.replace(/,\s*(%|px|°|ед\.?)$/,'');
  const pl=k=>{try{const e=document.querySelector('#p_'+k);const s=e&&e.closest('.ctl').querySelector('label span');const t=s&&s.textContent.trim();if(t)return un(t);}catch(e){}const r=(typeof PARAMS!=='undefined'?PARAMS:[]).find(x=>x[0]===k);return r?un(r[1]):k;};
  const fv=(k,v)=>{try{return typeof fmt==='function'?fmt(k,v):String(v);}catch(e){return String(v);}};
  const par=(s,def)=>{try{return JSON.parse(s);}catch(e){return def;}};
  const dash=(a,b)=>a+'–'+b;
  function diff(sc,a,b){
    const ks=new Set([...Object.keys(a),...Object.keys(b)]),ch=[];for(const k of ks)if(a[k]!==b[k])ch.push(k);
    if(sc==='dr'){
      const gs=ch.filter(k=>k[0]==='g');
      if(gs.length===1){const k=gs[0],c=k.split(SEP)[1];return {l:(b[k]===undefined?'Буква '+c+' удалена':'Буква '+c),ch:c};}
      if(gs.length>1)return {l:'Правки букв: '+gs.length,ch:gs[0].split(SEP)[1]};
      const m0=par(a.m,{}),m1=par(b.m,{});
      if(m1.built&&!m0.built)return {l:'Шрифт создан'};
      if(m0.name!==m1.name)return {l:'Название шрифта'};
      return {l:'Настройки рисунка'};}
    const grp={p:[],kern:[],lat:[],hg:[],e:[],o:[]};let ital=0,reg=0;
    for(const k of ch){const q=k.split(SEP);
      if(q[0]==='styles'){q[1]==='italic'?ital++:reg++;const f=q[2];if(f==='p')grp.p.push(q[1]);else if(f==='lat')grp.lat.push(q[1]);else if(f==='hg')grp.hg.push(q[1]);else grp.kern.push(k);}
      else if(q[0]==='edits'||q[0]==='custom')grp.e.push(q[1]);
      else grp.o.push(k);}
    const sty=(ital&&!reg)?' · Италик':'';
    const n=Object.values(grp).filter(x=>x.length).length;
    if(n>1)return {l:'Несколько правок'};
    if(grp.p.length){
      const diffs=[];for(const st of new Set(grp.p)){const p0=par(a['styles'+SEP+st+SEP+'p'],{}),p1=par(b['styles'+SEP+st+SEP+'p'],{});for(const k of new Set([...Object.keys(p0),...Object.keys(p1)]))if(p0[k]!==p1[k])diffs.push([k,p0[k],p1[k]]);}
      if(diffs.length===1){const [k,o,v]=diffs[0];return {l:pl(k)+' '+fv(k,o)+' → '+fv(k,v)+sty};}
      return {l:'Параметры: '+diffs.length+sty};}
    if(grp.kern.length){
      const pr=[];for(const k of grp.kern){const f=k.split(SEP)[2];if(f!=='ku')continue;const u0=par(a[k],{}),u1=par(b[k],{});for(const x of new Set([...Object.keys(u0),...Object.keys(u1)]))if(u0[x]!==u1[x])pr.push(x);}
      if(pr.length===1){const q=[...pr[0]];return {l:'Кернинг '+(q.length===2?dash(q[0],q[1]):pr[0])+sty,pair:q};}
      if(pr.length>1)return {l:'Кернинг: пар '+pr.length+sty};
      return {l:grp.kern.some(k=>k.endsWith(SEP+'kc'))?'Кернинг: классы'+sty:'Кернинг'+sty};}
    if(grp.e.length){const u=[...new Set(grp.e)];if(u.length===1){const c=u[0];const gone=ch.filter(k=>k.split(SEP)[1]===c).every(k=>b[k]===undefined||b[k]==='{}');return {l:(gone?'Сброс буквы ':'Буква ')+c,ch:c};}return {l:'Правки букв: '+u.length,ch:u[0]};}
    if(grp.lat.length)return {l:'Форма: сетка'+sty};
    if(grp.hg.length)return {l:'Направляющие'+sty};
    return {l:'Правка'};}
  /* ---- таймлайны ---- */
  function init(sc){const c=comps(sc);if(!c)return null;const key=tkey(sc);const t={list:[{c,l:'Исходное состояние',t:Date.now(),sz:0,base:1}],i:0,mem:0,key,sc,u:Date.now()};T[key]=t;pull(t);trimMem(key);return t;}
  function st(sc){const t=T[tkey(sc)]||init(sc);if(t)t.u=Date.now();return t;}
  /* новая запись поверх указателя (хвост повтора отбрасывается); возвращает false, если состояние не изменилось */
  function push(t,sc,c){
    const h=t.list[t.i];share(c,h.c);if(same(c,h.c))return false;
    t.list.length=t.i+1;
    const sz=share(c,h.c),d=diff(sc,h.c,c);
    if(!LBL[sc]&&HINT[sc]&&Date.now()-HINT[sc].t<5000&&d.ch&&/^Буква /.test(d.l)&&!/удалена$/.test(d.l))d.l=HINT[sc].l+' · '+d.ch;/* FX80 C04: правка названа действием («Кисть · А») */
    if(LBL[sc]){d.l=LBL[sc];delete d.ch;delete d.pair;}/* Stage 5B: подпись задана действием (исправление, авто-интервалы) */
    t.list.push({c,l:d.l,ch:d.ch,pair:d.pair,t:Date.now(),sz});t.i++;
    let mem=0;for(const e of t.list)mem+=e.sz;
    while(t.list.length>CAP+1||(mem>MEM&&t.list.length>3)){mem-=t.list[1].sz;t.list.shift();t.i--;if(t.list[0])t.list[0].sz=0;}
    return true;}
  function commit(sc){
    if(busy)return false;clearTimeout(tm[sc]);tm[sc]=0;dirty[sc]=0;
    const t=st(sc);if(!t)return false;
    let c;try{c=comps(sc);}catch(e){return false;}if(!c)return false;
    /* автокернинг считается позже первого снимка: пустая таблица становится заполненной во всех записях (это не правка пользователя) */
    for(const k in c)if(k.endsWith(SEP+'kern')&&c[k]!=='{}'&&t.list[t.i].c[k]==='{}')for(const e of t.list)if(e.c[k]==='{}')e.c[k]=c[k];
    const pushed=push(t,sc,c);HINT[sc]=null;if(!pushed)return false;
    t.own=1;changed(t);return true;}
  /* Stage 5B: действие, которое должно стать ОДНОЙ записью с заданной подписью: прежние правки фиксируются отдельно, fn меняет состояние, затем запись с подписью */
  const LBL={ed:null,dr:null},HINT={ed:null,dr:null};
  function hint(sc,l){HINT[sc]=l?{l:String(l).slice(0,40),t:Date.now()}:null;}
  function labeled(sc,label,fn){
    try{commit(sc);}catch(e){}
    LBL[sc]=String(label).slice(0,160);
    try{return fn();}finally{try{commit(sc);}catch(e){}LBL[sc]=null;}}
  function poke(sc){if(busy)return;dirty[sc]=1;clearTimeout(tm[sc]);tm[sc]=setTimeout(()=>commit(sc),IDLE_MS);}
  function flush(sc){commit(sc);}
  function mark(sc){st(sc);if(dirty[sc])commit(sc);}
  function sync(sc){/* прежняя отмена рисования уже сработала: указатель идёт к соседней записи, если состояние совпало */
    const t=st(sc);if(!t||busy)return;clearTimeout(tm[sc]);dirty[sc]=0;let c;try{c=comps(sc);}catch(e){return;}if(!c)return;
    share(c,t.list[t.i].c);
    for(const d of [-1,1]){const e=t.list[t.i+d];if(e){share(c,e.c);if(same(c,e.c,'m')){e.c=c;t.i+=d;t.own=1;changed(t);return;}}}/* настройки слоя после отмены подстраиваются под знак: сравниваются только знаки */
    commit(sc);}
  /* ---- хранилище: IndexedDB gtype-hist-v1/h (ключ = ключ ленты, значение = запись), запасной вариант localStorage, иначе только память ---- */
  const DBN='gtype-hist-v1',OS='h',LSP='gtype-hist-v1:',METAK='__meta';
  const ST={kind:null,db:null,p:null,cap:2e6,total:2e7};
  const wrapRq=(f)=>new Promise(res=>{try{f(res);}catch(e){res({ok:false,err:e&&e.name});}});
  function stOpen(){
    if(ST.p)return ST.p;
    ST.p=new Promise(res=>{
      const ls=()=>{try{localStorage.setItem(LSP+'t','1');localStorage.removeItem(LSP+'t');ST.kind='ls';ST.cap=3e5;ST.total=1.5e6;}catch(e){ST.kind=null;}res(ST.kind);};
      try{
        const idb=window.indexedDB;if(!idb){ls();return;}
        const r=idb.open(DBN,1);
        r.onupgradeneeded=()=>{try{r.result.createObjectStore(OS);}catch(e){}};
        r.onsuccess=()=>{ST.db=r.result;ST.kind='idb';ST.db.onversionchange=()=>{try{ST.db.close();}catch(e){}ST.db=null;ST.p=null;ST.kind=null;};ST.db.onclose=()=>{ST.db=null;ST.p=null;};res('idb');};
        r.onerror=r.onblocked=()=>ls();
      }catch(e){ls();}});
    return ST.p;}
  const stGet=key=>stOpen().then(k=>wrapRq(res=>{
    if(k==='idb'){const tx=ST.db.transaction(OS,'readonly'),rq=tx.objectStore(OS).get(key);rq.onsuccess=()=>res({ok:true,v:rq.result});rq.onerror=tx.onabort=()=>res({ok:false});}
    else if(k==='ls'){const v=localStorage.getItem(LSP+key);res({ok:true,v:v?JSON.parse(v):undefined});}
    else res({ok:false});})).then(r=>r&&r.ok?r.v:undefined,()=>undefined);
  const stPut=(key,rec)=>stOpen().then(k=>wrapRq(res=>{
    if(k==='idb'){const tx=ST.db.transaction(OS,'readwrite');tx.objectStore(OS).put(rec,key);tx.oncomplete=()=>res({ok:true});tx.onerror=tx.onabort=()=>res({ok:false,err:tx.error&&tx.error.name});}
    else if(k==='ls')try{localStorage.setItem(LSP+key,JSON.stringify(rec));res({ok:true});}catch(e){res({ok:false,err:e&&e.name});}
    else res({ok:false,err:'none'});})).catch(()=>({ok:false}));
  const stDel=key=>stOpen().then(k=>wrapRq(res=>{
    if(k==='idb'){const tx=ST.db.transaction(OS,'readwrite');tx.objectStore(OS).delete(key);tx.oncomplete=()=>res(1);tx.onerror=tx.onabort=()=>res(0);}
    else if(k==='ls'){localStorage.removeItem(LSP+key);res(1);}
    else res(0);})).catch(()=>0);
  /* лента -> запись: строки в общем пуле (одна строка хранится один раз), запись = пары [ключ, строка]; обрезка по числу записей и размеру */
  function encode(t,cap){
    const n=t.list.length;let lo=t.i,hi=t.i,bytes=0;const seen=new Set();
    const cost=e=>{let b=0;for(const k in e.c){const v=e.c[k];if(!seen.has(v)){b+=v.length;}}return b;};
    const take=e=>{for(const k in e.c)seen.add(e.c[k]);};
    bytes=cost(t.list[t.i]);take(t.list[t.i]);
    while(lo>0&&hi-lo+1<CAP+1){const b=cost(t.list[lo-1]);if(bytes+b>cap)break;bytes+=b;take(t.list[--lo]);}
    while(hi<n-1&&hi-lo+1<CAP+1){const b=cost(t.list[hi+1]);if(bytes+b>cap)break;bytes+=b;take(t.list[++hi]);}
    const keys=[],kx=new Map(),pool=[],px=new Map(),list=[];
    const ix=(m,a,v)=>{let i=m.get(v);if(i===undefined){i=a.length;a.push(v);m.set(v,i);}return i;};
    for(let j=lo;j<=hi;j++){const e=t.list[j],c=[];for(const k in e.c)c.push(ix(kx,keys,k),ix(px,pool,e.c[k]));
      const r={c,l:e.l,t:e.t};if(e.ch!=null)r.ch=e.ch;if(e.pair)r.pair=e.pair;if(e.base)r.b=1;list.push(r);}
    return {v:1,t:Date.now(),i:t.i-lo,keys,pool,list,bytes};}
  const BAD=/(^|\u0001)(__proto__|constructor|prototype)(\u0001|$)/;
  function decode(rec){
    try{
      if(!rec||rec.v!==1||!Array.isArray(rec.keys)||!Array.isArray(rec.pool)||!Array.isArray(rec.list)||!rec.list.length||rec.list.length>CAP+1)return null;
      for(const k of rec.keys)if(typeof k!=='string'||k.length>200||BAD.test(k))return null;
      for(const v of rec.pool)if(typeof v!=='string')return null;
      const list=[];let prev=null;
      for(const r of rec.list){
        if(!r||!Array.isArray(r.c)||r.c.length%2||typeof r.l!=='string')return null;
        const c={};for(let q=0;q<r.c.length;q+=2){const k=rec.keys[r.c[q]],v=rec.pool[r.c[q+1]];if(k===undefined||v===undefined)return null;c[k]=v;}
        const e={c,l:r.l.slice(0,160),t:isFinite(r.t)?+r.t:Date.now(),sz:0};
        if(typeof r.ch==='string'&&r.ch.length<=2)e.ch=r.ch;
        if(Array.isArray(r.pair)&&r.pair.length===2&&r.pair.every(x=>typeof x==='string'&&x.length<=2))e.pair=r.pair;
        if(r.b)e.base=1;
        if(prev){let z=0;for(const k in c)if(prev[k]!==c[k])z+=c[k].length;e.sz=z;}
        list.push(e);prev=c;}
      let i=Math.round(+rec.i);if(!(i>=0))i=0;if(i>=list.length)i=list.length-1;
      return {list,i};
    }catch(e){return null;}}
  /* ---- сверка загруженной ленты с текущим состоянием ---- */
  const sk=v=>{if(Array.isArray(v))return v.map(sk);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=sk(v[k]);return o;}return v;};
  const canon=s=>{try{return JSON.stringify(sk(JSON.parse(s)));}catch(e){return s;}};
  function eqc(a,b,ig){/* как same(), но без учёта порядка ключей внутри значений (после перезагрузки порядок мог измениться) */
    const ka=Object.keys(a);if(ka.length!==Object.keys(b).length)return false;
    for(const k of ka){if(k===ig)continue;if(!(k in b))return false;if(a[k]!==b[k]&&canon(a[k])!==canon(b[k]))return false;}return true;}
  /* указатель ленты t ставится на запись, равную c (ближайшую к текущей); иначе c добавляется новой записью */
  function reconcile(t,sc,c){
    const ig=sc==='dr'?'m':null,n=t.list.length;
    for(let d=0;d<n;d++)for(const j of d?[t.i-d,t.i+d]:[t.i]){
      if(j<0||j>=n)continue;const e=t.list[j];
      if(e.c===c||eqc(c,e.c,ig)){if(ig===null||eqc(c,e.c,null)){/* то же состояние: берём свежие строки */}else e.c=c;t.i=j;return false;}}
    return push(t,sc,c);}
  /* первое обращение к ленте: подгрузить сохранённую (асинхронно, поверх пустой ленты, даже если пользователь уже успел внести правки) */
  function pull(t){
    stGet(t.key).then(rec=>{
      if(rec===undefined||T[t.key]!==t)return;
      const L=decode(rec);if(!L)return;
      const base=t.list[0];
      if(!base||!base.c)return;
      L.key=t.key;
      reconcile(L,t.sc,base.c);/* указатель загруженной ленты — на состояние, с которого началась лента в этом сеансе */
      const rest=t.list.slice(1),head=L.list.slice(0,L.i+1);
      t.list=head.concat(rest);t.i=t.i+head.length-1;
      while(t.list.length>CAP+1){t.list.shift();t.i--;}
      if(t.i<0)t.i=0;
      changed(t.own?t:null);
    }).catch(()=>{});}
  /* при возврате на шрифт: лента из памяти сверяется с состоянием шрифта (проект мог быть загружен / сброшен) */
  function recon(sc){
    const t=T[tkey(sc)];if(!t){init(sc);return;}
    let c;try{c=comps(sc);}catch(e){return;}if(!c)return;
    t.u=Date.now();
    if(reconcile(t,sc,c)){t.own=1;saveSoon(t.key);}
    trimMem(t.key);}
  /* в памяти держатся ленты последних шрифтов, остальные сохраняются и выгружаются */
  function trimMem(keep){
    const ks=Object.keys(T).filter(k=>k!==keep&&k!=='dr');
    if(ks.length<KEEP_MEM)return;
    ks.sort((a,b)=>T[a].u-T[b].u);
    for(const k of ks.slice(0,ks.length-KEEP_MEM+1)){
      const drop=()=>{if(T[k]&&!PEND.has(k)&&tkey('ed')!==k)delete T[k];};
      if(PEND.has(k))saveKeys([k]).then(drop,drop);else drop();}}
  /* ---- ленивая запись ---- */
  const PEND=new Set();let svT=0,saving=null,again=false,META=null;
  const idleRun=f=>{(window.requestIdleCallback?requestIdleCallback(f,{timeout:1500}):setTimeout(f,50));};
  function saveSoon(key){if(!key)return;PEND.add(key);if(svT)return;svT=setTimeout(()=>{svT=0;idleRun(()=>{flushStore();});},SAVE_MS);}
  function flushStore(){
    if(saving){again=true;return saving;}
    const keys=[...PEND];if(!keys.length)return Promise.resolve();
    clearTimeout(svT);svT=0;
    saving=saveKeys(keys).catch(()=>{}).then(()=>{saving=null;if(again){again=false;if(PEND.size)return flushStore();}});
    return saving;}
  async function saveKeys(keys,force){
    const k0=await stOpen();if(!k0){for(const k of keys)PEND.delete(k);return;}
    if(!META){const m=await stGet(METAK);META=(m&&typeof m==='object'&&!Array.isArray(m))?m:{};
      for(const k of Object.keys(META)){const id=k.startsWith('ed:')?k.slice(3):'';if(k!=='dr'&&(!id||(!FONTS[id]&&id!=='imp'))){delete META[k];stDel(k);}}}
    let wrote=false;
    for(const key of keys){
      const t=T[key];if(!t){PEND.delete(key);continue;}
      await new Promise(r=>idleRun(r));
      if(!PEND.has(key)&&!force)continue;
      PEND.delete(key);
      let cap=ST.cap,rec=null,r=null;
      for(let a=0;a<3;a++){
        rec=encode(t,cap);r=await stPut(key,rec);
        if(r.ok)break;
        if(r.err==='none')break;
        cap=Math.floor(cap/2);/* квота: короче лента */
        if(a===1)await evictOthers(key,rec.bytes);}
      if(r&&r.ok){META[key]=[Date.now(),rec.bytes];wrote=true;}
      else PEND.delete(key);}
    if(wrote){await evictOthers(null,0);await stPut(METAK,META);}}
  /* общий предел: вытесняются ленты, которые давно не открывались (кроме открытых сейчас) */
  async function evictOthers(cur,need){
    const act=new Set(['dr','ed:'+(typeof S!=='undefined'?S.fontId:'')]);if(cur)act.add(cur);
    let tot=need;for(const k in META)tot+=META[k][1]||0;
    if(tot<=ST.total&&!need)return;
    const ks=Object.keys(META).filter(k=>!act.has(k)).sort((a,b)=>META[a][0]-META[b][0]);
    for(const k of ks){if(tot<=ST.total*(need?0.7:1))break;tot-=META[k][1]||0;delete META[k];await stDel(k);
      if(T[k]&&k!=='dr'&&!PEND.has(k)){delete T[k];}}}
  /* ---- восстановление ---- */
  function sane(o){
    const D=(FONTS[S.fontId]||{}).DEFAULTS||{};
    for(const k of ['regular','italic']){const p=o.styles&&o.styles[k]&&o.styles[k].p;if(!p)continue;
      for(const r of PARAMS){const key=r[0],v=p[key];if(v===undefined)continue;
        let [mn,mx]=[r[2],r[3]];try{[mn,mx]=sliderRange(key,r[2],r[3],r[4]);}catch(e){}
        if(typeof v!=='number'||!isFinite(v)){const d=D[k]&&D[k][key];if(d!=null)p[key]=d;else delete p[key];}
        else if(v<mn)p[key]=mn;else if(v>mx)p[key]=mx;}}
    return o;}
  function applyEd(c){
    const o=sane(unflat(c));undoStack.push(js(o));LU();
    if(typeof CUD!=='undefined')CUD.redo.length=0;if(typeof IU!=='undefined')IU.redo.length=0;if(typeof shellRedo!=='undefined')shellRedo.length=0;
    if(S.tab==='kern'&&typeof kernRender==='function')kernRender();
    if(typeof drawThumbs==='function')try{drawThumbs();}catch(e){}}
  function applyDr(c){
    const o=par(c.m,{});o.g={};for(const k in c)if(k[0]==='g'){o.g[k.split(SEP)[1]]=par(c[k],null);}
    GT_DRAW.hist.apply(o);}
  function go(sc,i){
    commit(sc);const t=st(sc);if(!t||i<0||i>=t.list.length||i===t.i)return false;
    busy=true;
    try{(sc==='dr'?applyDr:applyEd)(t.list[i].c);t.i=i;
      let c=comps(sc);if(c){const e=t.list[i];share(c,e.c);if(!same(c,e.c))e.c=c;}/* нормализованное состояние становится записью */
    }finally{busy=false;}
    clearTimeout(tm[sc]);dirty[sc]=0;t.own=1;changed(t);return true;}
  const step=d=>{const sc=scNow(),t=st(sc);if(!t)return false;commit(sc);return go(sc,t.i+d);};
  /* ---- кнопки ---- */
  function btns(){
    const t=st(scNow()),u=document.getElementById('undo'),r=document.getElementById('redo');
    if(u&&t)u.disabled=t.i<=0;if(r&&t)r.disabled=t.i>=t.list.length-1;}
  function changed(t){btns();if(openSc)render();if(t)saveSoon(t.key);}
  /* ---- панель ---- */
  let P=null,LST=null;
  const ago=ms=>{const s=Math.max(0,Math.round(ms/1000));if(s<10)return 'только что';if(s<60)return s+' с назад';const m=Math.round(s/60);if(m<60)return m+' мин назад';const h=Math.round(m/60);return h<24?h+' ч назад':Math.round(h/24)+' д назад';};
  function build(){
    if(P)return;P=document.createElement('div');P.id='hist';P.className='hist';P.hidden=true;P.setAttribute('role','dialog');P.setAttribute('aria-label','История правок');
    P.innerHTML='<div class="hist-h"><b>История</b><span class="hist-n" id="hist-n"></span><button type="button" class="ibtn sm hist-x" aria-label="Закрыть"><i class="ico i-close"></i></button></div><ol class="hist-l" id="hist-l"></ol><p class="hist-e" id="hist-e" hidden>Правок пока нет</p>';
    document.body.appendChild(P);LST=P.querySelector('#hist-l');
    P.querySelector('.hist-x').addEventListener('click',()=>close(true));
    LST.addEventListener('click',e=>{const b=e.target.closest('.hist-i');if(b){const sc=openSc;go(sc,+b.dataset.i);}});
    LST.addEventListener('keydown',e=>{if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;const q=[...LST.querySelectorAll('.hist-i')],i=q.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const n=q[i+(e.key==='ArrowDown'?1:-1)];if(n)n.focus();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openSc&&!(window.ONB&&ONB.isOpen)){e.preventDefault();close(true);}},true);
    document.addEventListener('pointerdown',e=>{if(!openSc)return;if(P.contains(e.target)||(anchor&&anchor.contains(e.target)))return;close(false);},true);
    window.addEventListener('resize',()=>{if(openSc)place();});
  }
  function place(){
    const r=anchor.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;
    if(vw<=560){P.classList.add('sheet');P.style.cssText='';return;}
    P.classList.remove('sheet');
    const w=Math.min(360,vw-16);P.style.width=w+'px';
    let x=Math.min(Math.max(8,r.left),vw-w-8),y=r.bottom+8;
    P.style.left=x+'px';
    /* the draw toolbar floats at the bottom of the canvas: with little room below, the panel opens upwards (never off-screen) */
    const below=vh-y-12,above=r.top-8-12;
    if(below<260&&above>below){P.style.top='auto';P.style.bottom=(vh-r.top+8)+'px';P.style.maxHeight=Math.max(160,above)+'px';}
    else{P.style.bottom='auto';P.style.top=y+'px';P.style.maxHeight=Math.max(160,below)+'px';}}
  function render(){
    const t=st(openSc);if(!t)return;
    const fg=(typeof css==='function'?css('--ink'):'')||'#000';if(fg!==fgNow){fgNow=fg;for(const e of t.list)e.ok=0;}
    const fo=document.activeElement&&LST.contains(document.activeElement)?document.activeElement.dataset.i:null;
    const now=Date.now();LST.textContent='';
    for(let i=t.list.length-1;i>=0;i--){const e=t.list[i],li=document.createElement('li'),b=document.createElement('button');
      b.type='button';b.className='hist-i'+(i===t.i?' cur':'')+(i>t.i?' redo':'');b.dataset.i=i;b.setAttribute('aria-current',i===t.i?'true':'false');
      const pv=document.createElement('span');pv.className='hist-pv';
      if(!e.cv){e.cv=document.createElement('canvas');e.cv.width=112;e.cv.height=80;e.ok=0;}
      pv.appendChild(e.cv);
      const tx=document.createElement('span');tx.className='hist-t';
      const l=document.createElement('span');l.className='hist-lab';l.textContent=e.l;
      const m=document.createElement('span');m.className='hist-m';m.dataset.t=e.t;m.textContent=i===t.i?'Сейчас · '+ago(now-e.t):ago(now-e.t);
      tx.append(l,m);b.append(pv,tx);li.appendChild(b);LST.appendChild(li);}
    if(fo!=null){const f=LST.querySelector('.hist-i[data-i="'+fo+'"]');if(f)f.focus({preventScroll:true});}
    P.querySelector('#hist-n').textContent=t.list.length>1?String(t.list.length-1):'';
    P.querySelector('#hist-e').hidden=t.list.length>1;
    pvKick();}
  function open(sc,a){
    build();if(openSc){close(false);}
    openSc=sc;anchor=a;if(a)a.setAttribute('aria-expanded','true');
    commit(sc);P.hidden=false;place();render();
    const c=LST.querySelector('.hist-i.cur')||LST.querySelector('.hist-i');if(c)c.focus({preventScroll:true});
    clearInterval(tick);tick=setInterval(()=>{const now=Date.now();LST.querySelectorAll('.hist-m').forEach(m=>{const i=m.closest('.hist-i');m.textContent=(i.classList.contains('cur')?'Сейчас · ':'')+ago(now-(+m.dataset.t));});},15000);}
  function close(ret){
    if(!openSc)return;const a=anchor;openSc=null;anchor=null;P.hidden=true;clearInterval(tick);
    if(a){a.setAttribute('aria-expanded','false');if(ret)try{a.focus({preventScroll:true});}catch(e){}}}
  function toggle(sc,a){if(openSc&&anchor===a)close(true);else open(sc,a);}
  /* ---- превью: по одной записи за простой, видимые первыми ---- */
  function pvKick(){if(pvq||!openSc)return;pvq=(window.requestIdleCallback?requestIdleCallback(pvStep,{timeout:500}):setTimeout(pvStep,30));}
  function pvStep(){
    pvq=0;if(!openSc)return;const t=st(openSc);if(!t)return;
    const items=[...LST.querySelectorAll('.hist-i')];
    let pick=null;const lr=LST.getBoundingClientRect();
    for(const b of items){const e=t.list[+b.dataset.i];if(e&&!e.ok){const r=b.getBoundingClientRect();if(r.bottom>=lr.top-40&&r.top<=lr.bottom+40){pick=e;break;}}}
    if(!pick)return;
    try{drawPv(openSc,pick);}catch(e){}
    pick.ok=1;
    pvKick();}
  function sample(sc,e,cu){/* что рисовать: знак правки, пара кернинга или «Аа» */
    const has=c=>GL[c]||(cu&&cu[c]&&cuInk(cu[c]));
    if(e.pair&&e.pair.every(has))return {s:e.pair,k:e.pair};
    if(e.ch&&has(e.ch)&&sc!=='dr')return {s:[e.ch]};
    return {s:has('А')&&has('а')?['А','а']:has('A')&&has('a')?['A','a']:[S.sel]};}
  /* свои знаки записи: на время рисования превью в GL стоят знаки того шага (а не нынешние), потом всё возвращается */
  function withCustom(cu,chs,fn){
    const saved=[];
    try{
      if(cu&&typeof cuDef==='function')for(const ch of new Set(chs)){const r=cu[ch];if(!r||!cuCharOk(ch))continue;const rec=cuSan(r);if(!cuInk(rec))continue;saved.push([ch,ch in GL,GL[ch]]);GL[ch]=cuDef(ch,rec,S.fontId);}
      return fn();
    }finally{for(let i=saved.length-1;i>=0;i--){const [ch,had,d]=saved[i];if(had)GL[ch]=d;else delete GL[ch];}}}
  function drawPv(sc,e){
    const cv=e.cv,c=cv.getContext('2d'),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);
    c.fillStyle=fgNow||'#000';
    if(sc==='dr'){
      let key=null;for(const k in e.c)if(k[0]==='g'&&k.split(SEP)[1]===(e.ch||''))key=k;
      if(!key){for(const k in e.c)if(k[0]==='g'){key=k;break;}}
      if(!key)return;
      const cs=GT_DRAW.hist.glyph(e.c[key]);if(!cs.length)return;
      fit(c,W,H,cs.map(q=>[q,0]),1);return;}/* оси рисования: y вниз, как у холста */
    const o=unflat(e.c),key=S.style,sty=normStyles(S.fontId,o.styles),ed=o.edits||{};
    const eds=new Proxy(ed,{get:(tt,k)=>tt[typeof k==='string'?edKey(k):k]});
    const cu=o.custom&&typeof o.custom==='object'?o.custom:null,sm=sample(sc,e,cu),gs=[];let w=0;
    withCustom(cu,sm.s,()=>sm.s.forEach((ch,i)=>{let g=null;try{g=finalGlyph(ch,sty[key],eds);}catch(x){}/* с объединением штрихов: без него наложения давали сплошное пятно */
      if(!g)return;let k=0;if(i>0&&sm.k){const u=sty[key].ku,kn=sty[key].kern,pk=sm.s[i-1]+ch;k=(u&&u[pk]!=null)?u[pk]:(kn&&kn[pk])||0;}
      gs.push([g,w+k]);w+=g.adv+k;}));
    if(!gs.length)return;
    fit(c,W,H,gs.flatMap(([g,x])=>g.cs.map(q=>[q,x])));}
  /* контуры [контур, сдвиг по x] вписываются по чернилам в карточку с полем; ось y вверх (yd: вниз) */
  function fit(c,W,H,items,yd){
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const [q,dx] of items)for(const n of q.nodes){const x=n.x+dx;if(x<x0)x0=x;if(x>x1)x1=x;if(n.y<y0)y0=n.y;if(n.y>y1)y1=n.y;}
    if(!(x1>x0&&y1>y0))return;
    const f=Math.min((W-20)/(x1-x0),(H-18)/(y1-y0)),cx=(x0+x1)/2,cy=(y0+y1)/2;
    for(const [q,dx] of items)c.fill(pathOf([q],(x,y)=>[W/2+(x+dx-cx)*f,H/2+(yd?1:-1)*(y-cy)*f]),'nonzero');}
  /* ---- события ---- */
  function wire(){
    const U=document.getElementById('undo'),R=document.getElementById('redo');
    for(const b of [U,R]){if(!b)continue;const n=b.cloneNode(true);b.replaceWith(n);}
    const u=document.getElementById('undo'),r=document.getElementById('redo');
    if(u)u.addEventListener('click',()=>step(-1));
    if(r){r.addEventListener('click',()=>step(1));
      const h=document.createElement('button');h.type='button';h.className='ibtn';h.id='hist-btn';h.title='История правок';h.setAttribute('aria-label','История правок');h.setAttribute('aria-haspopup','dialog');h.setAttribute('aria-expanded','false');h.innerHTML='<i class="ico i-history"></i>';
      r.after(h);h.addEventListener('click',()=>toggle('ed',h));}
    document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#dr-hist');if(b)toggle('dr',b);});/* кнопка рисования строится при первом открытии */
    btns();}
  function keys(e){
    if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=(e.key||'').toLowerCase();
    const z=k==='z'||k==='я'||e.code==='KeyZ',y=k==='y'||k==='н'||e.code==='KeyY';if(!z&&!y)return;
    const t=e.target;if(t&&(t.isContentEditable||(/^(TEXTAREA|SELECT)$/.test(t.tagName))||(t.tagName==='INPUT'&&!/^(range|checkbox|radio|button)$/.test(t.type))))return;
    if(S.tab==='draw'||!/^(edit|proof|kern)$/.test(S.tab))return;
    if(window.ONB&&ONB.isOpen)return;
    e.preventDefault();e.stopImmediatePropagation();step(z&&!e.shiftKey?-1:1);}
  /* ---- подключение ---- */
  function boot(){
    LS=snap;LU=undo;
    snap=function(){mark('ed');return LS.apply(this,arguments);};
    undo=function(){step(-1);};redo=function(){step(1);};
    const _p=persist;persist=function(){const r=_p.apply(this,arguments);poke('ed');return r;};
    const _a=activate;activate=function(){const r=_a.apply(this,arguments);try{recon('ed');btns();}catch(e){}return r;};
    const _t=setTab;setTab=function(){const r=_t.apply(this,arguments);try{st(scNow());btns();}catch(e){}return r;};
    window.addEventListener('keydown',keys,true);
    document.addEventListener('pointerup',()=>{for(const sc of ['ed','dr'])if(dirty[sc])setTimeout(()=>commit(sc),0);},true);
    document.addEventListener('keyup',()=>{for(const sc of ['ed','dr'])if(dirty[sc]&&!tm[sc])commit(sc);},true);
    window.addEventListener('pagehide',()=>{try{if(PEND.size)flushStore();}catch(e){}});
    document.addEventListener('visibilitychange',()=>{try{if(document.hidden&&PEND.size)flushStore();}catch(e){}});
    wire();(window.requestIdleCallback||setTimeout)(()=>{try{st('ed');btns();}catch(e){}});
  }
  document.addEventListener('DOMContentLoaded',()=>{try{boot();}catch(e){console.warn('hist',e&&e.message);}});
  return {poke,mark,sync,flush,step,go,open,close,toggle,labeled,hint,
    undo:()=>step(-1),redo:()=>step(1),
    st:sc=>st(sc||scNow()),flushStore,_t:{T,encode,decode,ST},store:{get kind(){return ST.kind;},open:stOpen,get:stGet,get pending(){return PEND.size;}},get open(){return !!openSc;},get busy(){return busy;},unflat,
    info:sc=>{const t=st(sc||scNow());return t&&{n:t.list.length,i:t.i,labels:t.list.map(e=>e.l)};}};
})();
