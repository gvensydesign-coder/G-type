/* ===== ПРОФИЛЬ m43, часть A: модель, хранилище, виды «Профиль» и «Созданные шрифты», кнопка в рейле, режим «как гость» =====
   Описание: MANIFEST.md (хранилище, правило «созданных шрифтов»), DESIGN_SYSTEM.md (компоненты профиля). Окна и ящик правки — ui_prof_b.js, визитка и копия — ui_prof_c.js.
   Данные: метаданные профиля — localStorage «gtype-profile-v1»; картинки (обложка, фото, исходник фото) — IndexedDB «gtype-profile-v1» (запасной путь — localStorage).
   «Созданный шрифт» = правки библиотечного шрифта (lib:<id>), собранный/нарисованный свой шрифт (imp), незавершённый рисунок (draw). */
(function(){
'use strict';
const PF=window.PROF={guest:false,filter:'all',menu:null,rename:null,confirm:null,layers:[],act:{}};
const LSK='gtype-profile-v1',DRK='gtype-draw-n7',IMGLS='gtype-profile-img-',MAXL=4;
const NETS=['Telegram','Behance','Dribbble','VK','Сайт'],MONO={Telegram:'Tg',Behance:'Be',Dribbble:'Dr',VK:'VK'};
const IMGRE=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
const $1=(s,r)=>(r||document).querySelector(s),$A=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=n=>'<i class="ico i-'+n+'" aria-hidden="true"></i>';
const clampI=(v,a,b)=>{v=Math.round(+v);return isFinite(v)?Math.max(a,Math.min(b,v)):a;};
const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const plural=(n,a,b,c)=>{const m=n%100,k=n%10;return (m>10&&m<20)?c:k===1?a:(k>1&&k<5)?b:c;};
const validUrl=u=>/^https?:\/\/[^\s\/.]+\.[^\s]{2,}$/i.test(u);
const mo=()=>window.MO||{off:()=>true,D:()=>0,E:()=>'ease'};
Object.assign(PF,{esc,ic,plural,validUrl,NETS,MAXL,MONO,$1,$A});

/* ---------- метаданные профиля ---------- */
const LICIDS=['ofl','cc','arr'],KEYRE=/^(lib:[A-Za-z0-9_-]+|imp|draw)$/,FIDRE=/^[A-Za-z0-9_-]{1,40}$/,MAXPIN=4;
const blank=()=>({v:1,first:'',last:'',bio:'',sign:true,links:[],avThumb:'',fview:'grid',proj:{},pins:[],order:[],nameFont:'',acc:1,defLic:'ofl',lic:{},colls:[]});
const uniqKeys=(a,n)=>(Array.isArray(a)?a:[]).filter((k,i,x)=>typeof k==='string'&&KEYRE.test(k)&&x.indexOf(k)===i).slice(0,n);
function norm(o){
  const m=blank();if(!o||typeof o!=='object')return m;
  m.first=str(o.first,30);m.last=str(o.last,30);m.bio=str(o.bio,160);m.sign=o.sign!==false;
  m.links=(Array.isArray(o.links)?o.links:[]).slice(0,MAXL).map(l=>({net:NETS.includes(l&&l.net)?l.net:'Сайт',url:str(l&&l.url,300).trim()})).filter(l=>validUrl(l.url));
  m.avThumb=IMGRE.test(o.avThumb||'')?o.avThumb:'';
  m.fview=o.fview==='list'?'list':'grid';
  const pj=o.proj&&typeof o.proj==='object'?o.proj:{};
  for(const k of Object.keys(pj)){
    if(!/^(lib:[A-Za-z0-9_-]+|imp|draw)$/.test(k))continue;const p=pj[k]||{};
    m.proj[k]={vis:p.vis==='pub'?'pub':'hid',smp:str(p.smp,28),st:p.st==='ready'||p.st==='draft'?p.st:'',exp:+p.exp>0?+p.exp:0,t:+p.t>0?+p.t:0,sig:str(p.sig,24)};
  }
  /* закреплённые (до 4), порядок работ, оформление, лицензии, подборки; старая «витрина» (proj.pin 1..3) переходит в закреплённые */
  m.pins=Array.isArray(o.pins)?uniqKeys(o.pins,MAXPIN):Object.keys(pj).filter(k=>KEYRE.test(k)&&clampI((pj[k]||{}).pin,0,3)>0).sort((a,b)=>pj[a].pin-pj[b].pin).slice(0,MAXPIN);
  m.order=uniqKeys(o.order,200);
  m.nameFont=FIDRE.test(o.nameFont||'')?o.nameFont:'';
  m.acc=clampI(o.acc,1,6);m.defLic=LICIDS.includes(o.defLic)?o.defLic:'ofl';
  const lc=o.lic&&typeof o.lic==='object'&&!Array.isArray(o.lic)?o.lic:{};
  for(const k of Object.keys(lc).slice(0,300))if(FIDRE.test(k)&&LICIDS.includes(lc[k]))m.lic[k]=lc[k];
  m.colls=(Array.isArray(o.colls)?o.colls:[]).slice(0,24).map(c=>c&&typeof c==='object'?{id:str(c.id,24).replace(/[^A-Za-z0-9_-]/g,'')||'c'+Math.random().toString(36).slice(2,8),name:str(c.name,40).trim(),desc:str(c.desc,90).trim(),fonts:(Array.isArray(c.fonts)?c.fonts:[]).filter((f,i,x)=>typeof f==='string'&&FIDRE.test(f)&&x.indexOf(f)===i).slice(0,60)}:null).filter(c=>c&&c.name);
  return m;
}
let M;try{M=norm(JSON.parse(localStorage.getItem(LSK)||'null'));}catch(e){M=blank();}
function saveMeta(){try{localStorage.setItem(LSK,JSON.stringify(M));}catch(e){}noStoreNote();}
PF.meta=()=>M;PF.saveMeta=saveMeta;PF.norm=norm;PF.IMGRE=IMGRE;
PF.setMeta=o=>{M=norm(o);saveMeta();syncAuthor();};
const newProj=()=>({vis:'hid',smp:'',st:'',exp:0,t:0,sig:''});
const projOf=k=>M.proj[k]||(M.proj[k]=newProj());

/* ---------- картинки: IndexedDB, запасной путь localStorage, всегда копия в памяти ---------- */
const IMG={cover:'',avatar:'',avsrc:''};PF.img=IMG;
let dbP=null,pend=0,idleRes=[];
function dbOpen(){
  if(dbP)return dbP;
  dbP=new Promise(res=>{try{const r=indexedDB.open(LSK,1);r.onupgradeneeded=()=>{try{r.result.createObjectStore('img');}catch(e){}};r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null);}catch(e){res(null);}});
  return dbP;
}
function idbRun(mode,fn){
  return dbOpen().then(db=>new Promise(res=>{
    if(!db)return res({ok:false});
    try{const tx=db.transaction('img',mode),r=fn(tx.objectStore('img'));tx.oncomplete=()=>res({ok:true,v:r&&r.result});tx.onerror=()=>res({ok:false});tx.onabort=()=>res({ok:false});}catch(e){res({ok:false});}
  }));
}
function imgPut(k,v){
  v=v&&IMGRE.test(v)?v:'';IMG[k]=v;pend++;
  return idbRun('readwrite',st=>v?st.put(v,k):st.delete(k)).then(r=>{
    try{if(!r.ok){if(v)localStorage.setItem(IMGLS+k,v);else localStorage.removeItem(IMGLS+k);}else localStorage.removeItem(IMGLS+k);}catch(e){}
  }).then(()=>{pend--;if(!pend){const a=idleRes;idleRes=[];a.forEach(f=>f());}});
}
PF.imgPut=imgPut;
PF.idle=()=>pend?new Promise(r=>idleRes.push(r)):Promise.resolve();
function imgLoad(){
  return Promise.all(['cover','avatar','avsrc'].map(k=>idbRun('readonly',st=>st.get(k)).then(r=>{
    let v=r.ok&&typeof r.v==='string'?r.v:'';
    if(!v){try{v=localStorage.getItem(IMGLS+k)||'';}catch(e){}}
    if(v&&IMGRE.test(v)&&!IMG[k])IMG[k]=v;
  }))).then(()=>{railAv();if(visibleView())renderCurrent(true);});
}

/* ---------- имя, ссылка, подпись ---------- */
const fullName=()=>(M.first+' '+M.last).trim();
const initials=()=>((M.first||'').charAt(0)+(M.last||'').charAt(0)).toUpperCase();
function slugOf(){
  const w=fullName().split(/\s+/).filter(x=>/[A-Za-zА-Яа-яЁё0-9]/.test(x)).map(x=>psSafe(x).toLowerCase()).filter(Boolean);
  return w.join('-')||'author';
}
PF.fullName=fullName;PF.initials=initials;PF.slugOf=slugOf;
function siteUrl(){
  const s=M.links.find(l=>l.net==='Сайт')||M.links[0];return s?s.url:'';
}
function syncAuthor(){window.GT_AUTHOR=(M.sign&&fullName())?{name:fullName(),url:siteUrl()}:null;}
PF.syncAuthor=syncAuthor;
const MON=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
function fmtDate(t){
  if(!t)return '';
  const d=new Date(t),n=new Date(),df=n-d,hm=x=>('0'+x.getHours()).slice(-2)+':'+('0'+x.getMinutes()).slice(-2);
  if(df<60000)return 'изм. только что';
  if(df<3600000)return 'изм. '+Math.floor(df/60000)+' мин назад';
  const sd=x=>x.getFullYear()*372+x.getMonth()*31+x.getDate(),dd=sd(n)-sd(d);
  if(dd===0)return df<21600000?'изм. '+Math.floor(df/3600000)+' ч назад':'изм. сегодня, '+hm(d);
  if(dd===1)return 'изм. вчера, '+hm(d);
  return 'изм. '+d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==n.getFullYear()?' '+d.getFullYear():'');
}

/* ---------- созданные шрифты ---------- */
const slotOf=id=>id===S.fontId?{styles:S.styles,edits:S.edits,family:S.family}:S.lib[id];
function latMoved(l){
  for(const a of [l.dx,l.dy])if(Array.isArray(a))for(const r of a)if(Array.isArray(r)&&r.some(v=>Math.abs(+v||0)>1e-9))return true;
  return false;
}
function isCustom(id){
  const F=FONTS[id],sl=slotOf(id);
  if(!F||id==='imp'||!sl||!sl.styles)return false;
  if(sl.edits&&Object.keys(sl.edits).some(k=>{const e=sl.edits[k];return e&&(typeof e!=='object'||Object.keys(e).length);}))return true;
  if(sl.family&&F.family&&sl.family!==F.family)return true;
  for(const k of ['regular','italic']){
    const s=sl.styles[k],D=F.DEFAULTS&&F.DEFAULTS[k];if(!s||!D||!s.p)continue;
    for(const q of Object.keys(D)){const a=s.p[q],b=D[q];if(typeof b==='number'?Math.abs((+a||0)-b)>1e-6:(a!==undefined&&a!==b))return true;}
    if(s.hg&&s.hg.length)return true;
    if(s.ku&&Object.keys(s.ku).length)return true;
    if(s.lat&&latMoved(s.lat))return true;
  }
  return false;
}
let drLast={raw:null,v:null};
function drawInfo(){
  let raw=null;try{raw=localStorage.getItem(DRK);}catch(e){}
  if(!raw)return null;if(raw===drLast.raw)return drLast.v;
  let v=null;
  try{const o=JSON.parse(raw);
    if(o&&o.v===1){const g=o.g||{};let n=0;for(const ch of Object.keys(g)){const r=g[ch];if(r&&((r.i&&r.i.length)||r.s))n++;}v={name:str(o.name,40)||'Мой шрифт',n,built:!!o.built};}
  }catch(e){}
  drLast={raw,v};return v;
}
function drawContours(max){
  try{const o=JSON.parse(localStorage.getItem(DRK)||'null');if(!o||o.v!==1)return [];
    const out=[];for(const ch of Object.keys(o.g||{})){const r=o.g[ch];if(r&&r.s&&r.c){const cs=impUnpackC(r.c);if(cs.length)out.push({ch,cs});if(out.length>=max)break;}}return out;
  }catch(e){return [];}
}
const impOwn=()=>Object.keys(IMP.glyphs).filter(c=>IMP.glyphs[c]&&IMP.glyphs[c].c&&IMP.glyphs[c].c.length).length;
const impDrawnOnly=()=>{const ks=Object.keys(IMP.glyphs).filter(c=>IMP.glyphs[c]&&IMP.glyphs[c].c&&IMP.glyphs[c].c.length);return ks.length>0&&ks.every(c=>IMP.glyphs[c].src==='draw');};
const hasImp=()=>!!FONTS.imp&&typeof impHasInk==='function'&&impHasInk();
const nGl=n=>n+' '+plural(n,'знак','знака','знаков');
function viewOf(key){
  const p=M.proj[key]||{};let name='',meta='',fid=null;
  if(key==='imp'){name=FONTS.imp?FONTS.imp.name:'Свой шрифт';meta=nGl(impOwn());fid='imp';}
  else if(key==='draw'){const d=drawInfo()||{name:'Мой шрифт',n:0};name=d.name;meta=nGl(d.n);}
  else{const id=key.slice(4),F=FONTS[id],sl=slotOf(id);fid=id;name=(sl&&sl.family&&sl.family!==F.family)?sl.family:F.name;meta=nGl(F.CHARSET.length);/* FX80 A01: как на карточке библиотеки (CHARSET.length, с пробелом) */}
  const st=p.st||(p.exp?'ready':'draft'),vis=st==='ready'&&p.vis==='pub'?'pub':'hid';
  return {key,fid,name,meta,st,vis,pin:vis==='pub'?M.pins.indexOf(key)+1:0,smp:p.smp||name,t:p.t||0,date:fmtDate(p.t)};
}
function projKeys(){
  const ks=[];
  for(const id of Object.keys(FONTS))if(id!=='imp'&&isCustom(id))ks.push('lib:'+id);
  if(hasImp())ks.push('imp');
  const d=drawInfo();if(d&&d.n>0&&!d.built)ks.push('draw');
  return ks;
}
function sigStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+s.length.toString(36);}
function sigOf(key){
  try{
    if(key==='imp')return sigStr(JSON.stringify(impPack()||0));
    if(key==='draw')return sigStr(localStorage.getItem(DRK)||'');
    const sl=slotOf(key.slice(4));if(!sl)return '';
    const o={e:sl.edits,f:sl.family};for(const k of ['regular','italic']){const s=sl.styles[k];o[k]=[s.p,s.lat,s.hg,s.ku];}
    return sigStr(JSON.stringify(o));
  }catch(e){return '';}
}
/* отметка времени правки: подпись содержимого сравнивается с запомненной; новая подпись = «изменён сейчас» */
function stamp(key){
  const sg=sigOf(key);if(!sg)return false;let p=M.proj[key];
  if(!p){p=M.proj[key]=newProj();p.t=Date.now();p.sig=sg;return true;}
  if(p.sig!==sg){p.t=Date.now();p.sig=sg;return true;}
  return false;
}
function projects(){
  const ks=projKeys();let ch=false;
  for(const k of ks)if(stamp(k))ch=true;
  for(const k of Object.keys(M.proj))if(!ks.includes(k)){delete M.proj[k];ch=true;}
  if(renumber())ch=true;
  if(ch)saveMeta();
  return ks.map(viewOf).sort((a,b)=>b.t-a.t);
}
PF.projects=projects;PF.projOf=projOf;
/* закреплённые: только готовые и открытые шрифты, не больше MAXPIN; порядок работ без исчезнувших шрифтов */
function renumber(){
  const ok=k=>{const v=viewOf0(k);return v&&v.st==='ready'&&v.vis==='pub';};
  const np=M.pins.filter((k,i,a)=>a.indexOf(k)===i&&ok(k)).slice(0,MAXPIN);
  let ch=np.length!==M.pins.length;M.pins=np;
  const no=M.order.filter(k=>M.proj[k]);if(no.length!==M.order.length){M.order=no;ch=true;}
  return ch;
}
function viewOf0(k){const p=M.proj[k];if(!p)return null;const st=p.st||(p.exp?'ready':'draft');return {st,vis:st==='ready'&&p.vis==='pub'?'pub':'hid'};}
const pinCount=()=>M.pins.length;
function incomplete(){
  if(!(IMG.avatar||M.avThumb)||!M.bio||!M.links.length||!M.first)return true;
  try{return projKeys().length===0;}catch(e){return true;}
}
PF.incomplete=incomplete;
function snapshot(owner){
  const all=projects();
  return {name:fullName(),first:M.first,last:M.last,bio:M.bio,slug:slugOf(),links:M.links,avatar:IMG.avatar||'',cover:IMG.cover||'',fonts:owner?all:all.filter(f=>f.st==='ready'&&f.vis==='pub')};
}
PF.snapshot=snapshot;
const byKey=k=>projects().find(f=>f.key===k);

/* ---------- рисование образцов настоящим шрифтом ---------- */
const fui=()=>getComputedStyle(document.documentElement).getPropertyValue('--f-ui').trim();
function fallbackText(c,w,h,text){c.font='600 '+Math.round(h*.34)+'px '+fui();c.textAlign='center';c.textBaseline='middle';c.fillText((text||'Аб').slice(0,12),w/2,h/2);}
function drawDrawn(c,w,h){
  const gs=drawContours(3);
  if(!gs.length){fallbackText(c,w,h,'Аб');return;}
  const sc=h*.42/700,gap=h*.12;let tot=-gap;
  const bb=gs.map(g=>{let a=1e9,b=-1e9;for(const k of g.cs)for(const n of k.nodes){if(n.x<a)a=n.x;if(n.x>b)b=n.x;}tot+=(b-a)*sc+gap;return [a,b];});
  let x=(w-tot)/2;const base=h/2+700*sc*.45;
  gs.forEach((g,i)=>{const a=bb[i][0],b=bb[i][1];c.fill(pathOf(g.cs,(px,py)=>[x+(px-a)*sc,base-py*sc]),'evenodd');x+=(b-a)*sc+gap;});
}
function drawSpec(cv,key,text,col){
  const f=fitCanvas(cv),c=f.c,w=f.w,h=f.h;c.clearRect(0,0,w,h);c.fillStyle=col;
  if(key==='draw'){drawDrawn(c,w,h);return;}
  const id=key==='imp'?'imp':key.slice(4);
  if(!FONTS[id]){fallbackText(c,w,h,text);return;}
  useFont(id);
  let run=libRun(id,text||'');
  if(!run.items.length)run=libRun(id,FONTS[id].name||'Аа');
  if(!run.items.length){fallbackText(c,w,h,text);return;}
  const pad=Math.round(w*.08);let sc=h*.4/run.cap;if(run.tot*sc>w-2*pad)sc=(w-2*pad)/Math.max(run.tot,1);
  const base=h/2+run.cap*sc/2,ox=(w-run.tot*sc)/2;
  for(const it of run.items)c.fill(pathOf(it[0].cs,(px,py)=>[ox+it[1]*sc+px*sc,base-py*sc]),'nonzero');
}
function paintGhost(root){
  const cv=$1('.pf-ghost',root);if(!cv)return;
  const f=fitCanvas(cv),c=f.c,w=f.w,h=f.h;c.clearRect(0,0,w,h);if(w<20||h<20)return;
  const id=FONTS.renessa?'renessa':Object.keys(FONTS)[0];
  c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--vz-white').trim();
  useFont(id);
  [['Аа Бб Вв',.34],['Гг Дд Ее',.6]].forEach(l=>{
    const run=libRun(id,l[0]);if(!run.items.length)return;
    let sc=h*.17/run.cap;if(run.tot*sc>w*.8)sc=w*.8/run.tot;
    const ox=w-w*.06-run.tot*sc,base=h*l[1];
    for(const it of run.items)c.fill(pathOf(it[0].cs,(px,py)=>[ox+it[1]*sc+px*sc,base-py*sc]),'nonzero');
  });
}
function paint(root){
  if(!root||root.hidden)return;
  try{
    paintGhost(root);if(PF.paintExtra)PF.paintExtra(root);
    $A('.pf-spec[data-k]',root).forEach(el=>{const cv=$1('canvas',el);if(cv)drawSpec(cv,el.dataset.k,el.dataset.t||'',getComputedStyle(el).color);});
  }catch(e){console.error(e);}
  finally{try{if(FONTS[S.fontId])useFont(S.fontId);}catch(e){}}
}
PF.paint=paint;

/* ---------- кнопка в рейле: фото, инициалы или нейтральный значок; точка = профиль не заполнен ---------- */
function railAv(){
  const b=$1('#rail-profile');if(!b)return;
  const src=IMG.avatar||M.avThumb,inc=incomplete();
  let h;
  if(src)h='<span class="avt img" aria-hidden="true" style="background-image:url('+src+')"></span>';
  else if(fullName())h='<span class="avt" aria-hidden="true">'+esc(initials())+'</span>';
  else h='<span class="avt neutral" aria-hidden="true">'+ic('person')+'</span>';
  if(inc)h+='<i class="dot" aria-hidden="true"></i>';
  if(b._h!==h){b.innerHTML=h;b._h=h;}
  const l='Профиль'+(inc?': заполните профиль':'');
  b.setAttribute('aria-label',l);b.dataset.tip='Профиль';b.title=l;
  b.dataset.inc=inc?'1':'0';
  if(S.tab==='profile'||S.tab==='folder')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
}
PF.railAv=railAv;

/* ---------- разметка ---------- */
function avHTML(p,cls){
  if(p.avatar)return '<div class="avt img '+cls+'" role="img" aria-label="Фото профиля" style="background-image:url('+p.avatar+')"></div>';
  if(p.name)return '<div class="avt '+cls+'" role="img" aria-label="Аватар: '+esc(p.name)+'">'+esc(((p.first||'').charAt(0)+(p.last||'').charAt(0)).toUpperCase())+'</div>';
  return '<div class="avt neutral '+cls+'" role="img" aria-label="Аватар">'+ic('person')+'</div>';
}
/* empty owner avatar: a friendly «add a photo» target (soft gradient, person + caption; no ring / badge: e2e_profile keeps the «no ring, no camera badge» rule) instead of a flat grey disc */
function avEmptyHTML(){return '<button class="pf-avw pf-own" type="button" data-pf="edit" aria-label="Добавить фото профиля"><span class="avt neutral avt-xl" aria-hidden="true">'+ic('person')+'<span class="avl">Добавить фото</span></span></button>';}
function coverHTML(p,mini){
  if(p.cover&&!mini)return '<div class="pf-cover img" aria-hidden="true"><img alt="" src="'+p.cover+'"></div>';
  return '<div class="pf-cover'+(mini?' mini':'')+'" aria-hidden="true"><div class="hm-mesh"><b class="l1"></b><b class="l2"><i></i><i></i><i></i><i></i></b></div>'+(mini?'':'<canvas class="pf-ghost"></canvas>')+'</div>';
}
function specHTML(f,extra){return '<div class="pf-spec'+(f.st==='draft'?' dr':'')+'" data-k="'+esc(f.key)+'" data-t="'+esc(f.st==='draft'?'Аб':f.smp)+'"><canvas aria-hidden="true"></canvas>'+(extra||'')+'</div>';}
function socsHTML(p,owner){
  let h='<div class="pf-socs">';
  p.links.forEach((l,i)=>{const m=MONO[l.net];h+='<a class="chip pf-soc" href="'+esc(l.url)+'" target="_blank" rel="noopener noreferrer" data-i="'+i+'"><span class="pf-m">'+(m||ic('globe'))+'</span>'+esc(l.net)+'</a>';});
  /* FX80 F4: чип «Скопировать ссылку g-type/@…» убран: такой адрес нигде не открывается */
  if(owner&&p.links.length<MAXL)h+='<button class="chip pf-add pf-own" type="button" data-pf="edit-links">'+ic('plus')+'Добавить ссылку</button>';
  return h+'</div>';
}
function folderCardHTML(p,owner){
  const fs=p.fonts,rd=fs.filter(f=>f.st==='ready'),np=fs.filter(f=>f.vis==='pub').length,nd=fs.length-rd.length;
  const meta=owner?fs.length+' '+plural(fs.length,'шрифт','шрифта','шрифтов')+' · '+np+' в профиле'+(nd?' · '+nd+' '+plural(nd,'черновик','черновика','черновиков'):''):fs.length+' '+plural(fs.length,'шрифт','шрифта','шрифтов');
  const names=rd.map(f=>f.name),more=names.length>3?' · ещё '+(names.length-3):'';
  const fan=rd.concat(fs.filter(f=>f.st==='draft')).slice(0,3),smp=['Аа','Бб','Вв'];
  return '<div class="lcard pfc" role="button" tabindex="0" data-pf="open-folder" aria-label="Созданные шрифты"><span class="notch" aria-hidden="true"><span class="nb go">'+ic('arrow-r')+'</span></span>'+
    '<div class="ft">'+ic('folder')+'<span>Созданные шрифты</span></div><div class="fm">'+meta+'</div><div class="fn">'+esc(names.slice(0,3).join(' · '))+more+'</div>'+
    '<div class="pfc-fan" aria-hidden="true"><div class="fan">'+fan.map((f,i)=>specHTML({key:f.key,st:'ready',smp:smp[i]})).join('')+'</div></div></div>';
}
function toolsHTML(){
  const row=(a,i,t,s,r)=>'<button class="pf-trow" type="button" data-pf="'+a+'"><span class="ti">'+ic(i)+'</span><span class="tt"><b>'+t+'</b><span class="s">'+s+'</span></span>'+ic(r)+'</button>';
  return '<aside class="card pf-tools pf-own" aria-label="Инструменты автора"><div class="sec-h">Инструменты автора</div>'+
    row('guest','eye','Смотреть как гость','Так профиль видят другие','chev-right')+row('card','idcard','Визитка автора','Скачать PNG','download')+row('backup','archive','Резервная копия','Профиль, шрифты и черновики','download')+'</aside>';
}
function checklistHTML(p){
  const it=[['Имя и фамилия',!!(p.first&&p.last)],['Фото профиля',!!p.avatar],['Описание и ссылки',!!(p.bio&&p.links.length)],['Первый шрифт',p.fonts.length>0]],n=it.filter(x=>x[1]).length;
  return '<aside class="card pf-chk pf-own" aria-label="Заполните профиль"><div class="sec-h">Заполните профиль · '+n+' из 4</div><div class="pg"><i style="width:'+n*25+'%"></i></div><ul>'+
    it.map(x=>'<li class="'+(x[1]?'d':'')+'"><span class="c">'+(x[1]?ic('check'):'')+'</span>'+x[0]+'</li>').join('')+'</ul><button class="btn pri" type="button" data-pf="edit">'+ic('pen2')+'Заполнить профиль</button></aside>';
}
/* общий вид профиля: владелец видит всё, гость — только готовые шрифты «В профиле»; элементы владельца в разметку гостя не попадают */
function profileView(p,o){
  const own=!!o.owner,nf=!!(M.nameFont&&FONTS[M.nameFont]&&p.name);let h=coverHTML(p,false)+'<div class="pf-wrap">';
  h+='<section class="pf-head" aria-label="Автор">'+(own&&!p.avatar&&!p.name?avEmptyHTML():avHTML(p,'avt-xl'))+'<div class="pf-tx"><h1 class="pf-name'+(p.name?'':' ph')+'"'+(nf?' aria-label="'+esc(p.name)+'"':'')+'>'+(nf?'<canvas class="pf-namecv" data-fid="'+esc(M.nameFont)+'" data-t="'+esc(p.name)+'" aria-hidden="true"></canvas>':(p.name?esc(p.name):own?'<button class="pf-phb" type="button" data-pf="edit" aria-label="Указать имя">Ваше имя'+ic('pen2')+'</button>':'Автор'))+'</h1>';
  if(p.bio)h+='<p class="pf-bio">'+esc(p.bio)+'</p>';else if(own)h+='<p class="pf-bio ph"><button class="pf-phb" type="button" data-pf="edit">Расскажите о себе в двух словах: чем занимаетесь и где живёте'+ic('pen2')+'</button></p>';
  h+='<div class="pf-row">'+socsHTML(p,own)+'<div class="pf-act">'+'<button class="btn lg" type="button" data-pf="share">'+ic('share')+'Поделиться</button>'+(own?'<button class="btn pri lg pf-own" type="button" data-pf="edit">'+ic('pen2')+'Редактировать профиль</button>':'')+'</div></div></div></section>';
  h+=PF.sections?PF.sections(p,own):'';
  if(own&&PF.draftsSect)h+=PF.draftsSect();
  const emptyOwn=own&&!p.fonts.length;
  h+='<section class="pf-grid2'+(own?'':' solo')+'" aria-label="Папки">';
  if(p.fonts.length)h+=folderCardHTML(p,own);
  else if(own)h+='<div class="card pf-emp pf-own"><h3>'+ic('folder')+'Созданные шрифты</h3><p>Пока пусто. Здесь появятся ваши шрифты. Начните в Лаборатории.</p><div class="cta"><button class="btn ink lg" type="button" data-pf="lab-imp">'+ic('grid')+'Собрать из своих знаков</button><button class="btn lg" type="button" data-pf="lab-draw">'+ic('draw')+'Отрисовать свой шрифт</button><button class="btn ghost lg" type="button" data-pf="backup">'+ic('upload')+'Восстановить из копии</button></div><div class="ghosts" aria-hidden="true"><i></i><i></i><i></i></div></div>';
  else h+='<div class="card pf-emp"><h3>'+ic('folder')+'Созданные шрифты</h3><p>Автор пока не опубликовал шрифты.</p></div>';
  if(own)h+=emptyOwn&&incomplete()?checklistHTML(p):toolsHTML();
  h+='</section></div>';
  if(emptyOwn)h=h.replace('class="btn pri lg" type="button" data-sk="newc"','class="btn lg" type="button" data-sk="newc"').replace('class="btn pri" type="button" data-pf="edit"','class="btn" type="button" data-pf="edit"');/* FX80 F3 (A12): в пустом профиле одна главная кнопка */
  return h;
}
PF.profileView=profileView;

/* ---------- папка «Созданные шрифты» ---------- */
function visList(p,owner){
  let l=p.fonts;
  if(owner){if(PF.filter==='draft')l=l.filter(f=>f.st==='draft');else if(PF.filter==='ready')l=l.filter(f=>f.st==='ready');}
  return l;
}
function visSeg(f){
  const dr=f.st==='draft',n=esc(f.name);
  return '<div class="seg sm pf-own" role="group" aria-label="Видимость «'+n+'»"><button type="button" data-pf="vis" data-k="'+esc(f.key)+'" data-v="pub" aria-pressed="'+(f.vis==='pub')+'"'+(f.vis==='pub'?' class="on"':'')+(dr?' disabled':'')+'>В профиле</button><button type="button" data-pf="vis" data-k="'+esc(f.key)+'" data-v="hid" aria-pressed="'+(f.vis!=='pub')+'"'+(f.vis!=='pub'?' class="on"':'')+'>Скрыт</button></div>';
}
const badge=f=>f.st==='draft'?'<span class="badge warn">Черновик</span>':'<span class="badge ok">Готов</span>';
function nameHTML(f){return PF.rename===f.key?'<input class="inp pf-rn" data-k="'+esc(f.key)+'" value="'+esc(f.name)+'" maxlength="40" aria-label="Название шрифта">':'<b>'+esc(f.name)+'</b>';}
function moreBtn(f){return '<button class="ibtn sm" type="button" data-pf="more" data-k="'+esc(f.key)+'" aria-label="Ещё: «'+esc(f.name)+'»" aria-haspopup="menu" aria-expanded="'+(PF.menu===f.key)+'">'+ic('more')+'</button>';}
function confirmText(f){return f.key.indexOf('lib:')===0?'Правки сбросятся к исходному шрифту. Сам шрифт останется в библиотеке. Отменить нельзя.':(f.st==='draft'?'Черновик и все его знаки исчезнут. Отменить нельзя.':'Шрифт и все его знаки исчезнут. Отменить нельзя.');}
function cardHTML(f,owner){
  const k=esc(f.key),n=esc(f.name);
  if(owner&&PF.confirm===f.key)return '<article class="card pf-fc confirm" data-card="'+k+'">'+specHTML(f)+'<div class="pf-cfm" role="alertdialog" aria-label="Удалить «'+n+'»?"><div class="pf-cfh">'+ic('alert')+'<b>Удалить «'+n+'»?</b></div><p>'+confirmText(f)+'</p><div class="pf-cfb"><button class="btn sm" type="button" data-pf="del-no">Отмена</button><button class="btn sm danger solid" type="button" data-pf="del-ok" data-k="'+k+'">Удалить</button></div></div></article>';
  const cont=owner&&f.st==='draft'?'<button class="btn sm ink pc pf-own" type="button" data-pf="cont" data-k="'+k+'">'+ic('pen2')+'Продолжить</button>':'';
  return '<article class="card pf-fc" data-card="'+k+'">'+specHTML(f,cont)+'<div class="pf-fb"><div class="pf-fnn">'+nameHTML(f)+(owner?badge(f):'')+'</div><span class="pf-fd">'+(owner?esc(f.date)+(f.date?' · ':'')+esc(f.meta):esc(f.meta))+'</span></div>'+
    '<div class="pf-ff">'+(owner?visSeg(f)+moreBtn(f):'<button class="btn sm" type="button" data-pf="open-font" data-k="'+k+'">Открыть'+ic('arrow-r')+'</button>')+'</div></article>';
}
function rowHTML(f,owner){
  const k=esc(f.key),n=esc(f.name),dr=f.st==='draft';
  if(owner&&PF.confirm===f.key)return '<div class="pf-frow confirm" data-card="'+k+'">'+specHTML(f)+'<div class="nm"><b>'+ic('alert')+'Удалить «'+n+'»?</b><span class="s">'+confirmText(f)+'</span></div><div class="vis"></div><div class="act"><button class="btn sm" type="button" data-pf="del-no">Отмена</button><button class="btn sm danger solid" type="button" data-pf="del-ok" data-k="'+k+'">Удалить</button></div></div>';
  return '<div class="pf-frow" data-card="'+k+'">'+specHTML(f)+'<div class="nm">'+(PF.rename===f.key?nameHTML(f):'<b>'+n+(owner?badge(f):'')+'</b>')+'<span class="s">'+(owner?esc(f.date)+(f.date?' · ':''):'')+esc(f.meta)+'</span></div>'+
    (owner?'<div class="vis">'+visSeg(f)+'</div><div class="act">'+(dr?'<button class="btn sm ink pf-own" type="button" data-pf="cont" data-k="'+k+'">'+ic('pen2')+'Продолжить</button>':'')+moreBtn(f)+'</div>'
      :'<div class="vis"></div><div class="act"><button class="btn sm" type="button" data-pf="open-font" data-k="'+k+'">Открыть'+ic('arrow-r')+'</button></div>')+'</div>';
}
function listHTML(p,owner){
  const l=visList(p,owner);
  if(!l.length)return '<div class="card pf-emp pf-emptyl"><h3>'+ic('folder')+'Здесь пока ничего нет</h3><p>'+(owner?(p.fonts.length?'В этом фильтре нет шрифтов. Выберите «Все».':'Созданные шрифты и черновики появятся здесь.'):'Автор пока не опубликовал шрифты.')+'</p></div>';
  return l.map(f=>M.fview==='list'?rowHTML(f,owner):cardHTML(f,owner)).join('');
}
function chipsHTML(p){
  const n=p.fonts.length,nd=p.fonts.filter(f=>f.st==='draft').length;
  return [['all','Все',n],['draft','Черновики',nd],['ready','Готовые',n-nd]].map(c=>'<button class="chip pf-own'+(PF.filter===c[0]?' on':'')+'" type="button" data-pf="filter" data-f="'+c[0]+'" aria-pressed="'+(PF.filter===c[0])+'">'+c[1]+' <span class="cn">'+c[2]+'</span></button>').join('');
}
function folderView(p,o){
  const own=!!o.owner,g=M.fview!=='list';
  return coverHTML(p,true)+'<div class="pf-wrap"><div class="pf-ftitle"><h1 id="pf-ft">Созданные шрифты</h1></div><div class="pf-filters" role="group" aria-label="Фильтр и вид">'+(own?chipsHTML(p):'')+'<span class="sp"></span>'+
    '<div class="seg" role="group" aria-label="Вид"><button type="button" data-pf="view" data-m="grid" aria-label="Сетка" aria-pressed="'+g+'" class="'+(g?'on':'')+'">'+ic('library')+'</button><button type="button" data-pf="view" data-m="list" aria-label="Список" aria-pressed="'+!g+'" class="'+(g?'':'on')+'">'+ic('viewlist')+'</button></div></div>'+
    '<div id="pf-flist" class="'+(g?'pf-fgrid':'pf-rows')+'">'+listHTML(p,own)+'</div></div>';
}
PF.folderView=folderView;

/* ---------- показ видов ---------- */
const elP=()=>document.getElementById('view-profile'),elF=()=>document.getElementById('view-pfolder');
const visibleView=()=>S.tab==='profile'?elP():S.tab==='folder'?elF():null;
function renderCurrent(keepScroll){
  const v=visibleView();if(!v)return;
  const sc=keepScroll?v.scrollTop:0,own=!PF.guest,p=snapshot(own);
  v.innerHTML=S.tab==='profile'?profileView(p,{owner:own}):folderView(p,{owner:own});v.dataset.pacc=String(M.acc);
  v.scrollTop=sc;paint(v);railAv();guestPill();
}
PF.render=renderCurrent;
function renderList(flip){
  const box=document.getElementById('pf-flist');if(!box)return;
  const own=!PF.guest,p=snapshot(own),g=M.fview!=='list';
  const mut=()=>{box.className=g?'pf-fgrid':'pf-rows';box.innerHTML=listHTML(p,own);paint(box);const rn=$1('.pf-rn',box);if(rn){rn.focus();rn.select();}};
  if(flip&&window.MO&&MO.flipList)MO.flipList(box,mut,{key:c=>c.dataset&&c.dataset.card});else mut();
  const ch=$1('.pf-filters');
  if(ch&&own){$A('.chip[data-f]',ch).forEach(c=>{const n=c.dataset.f==='all'?p.fonts.length:p.fonts.filter(f=>(c.dataset.f==='draft')===(f.st==='draft')).length;const cn=$1('.cn',c);if(cn)cn.textContent=n;const on=c.dataset.f===PF.filter;c.classList.toggle('on',on);c.setAttribute('aria-pressed',on);});}
}
function guestPill(){
  let el=$1('.pf-gpill');
  if(PF.guest&&(S.tab==='profile'||S.tab==='folder')){
    if(!el){el=document.createElement('div');el.className='pf-gpill';el.setAttribute('role','status');el.innerHTML=ic('eye')+'<span>Вы смотрите как гость</span><button class="btn sm" type="button" data-pf="unguest">Вернуться</button>';document.body.appendChild(el);
      if(!mo().off())el.animate([{opacity:0,transform:'translate(-50%,-8px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:mo().D('base'),easing:mo().E('out')});}
  }else if(el)el.remove();
}
function guestOn(){if(S.tab!=='profile'&&S.tab!=='folder')return;closeLayers();closeMenu(true);PF.guest=true;PF.confirm=PF.rename=null;renderCurrent();}
function guestOff(quiet){
  if(!PF.guest)return;PF.guest=false;const el=$1('.pf-gpill');if(el)el.remove();
  if(!quiet)renderCurrent();
}
PF.guestOn=guestOn;PF.guestOff=guestOff;

/* ---------- слои: окна и ящик; Esc закрывает верхний ---------- */
PF.pushLayer=L=>{L.prev=document.activeElement;PF.layers.push(L);return L;};
function closeLayer(L,cb){
  if(L.closing)return;L.closing=true;
  const fin=()=>{L.parts.forEach(e=>e.remove());PF.layers=PF.layers.filter(x=>x!==L);try{if(L.prev&&document.contains(L.prev)&&L.prev.focus)L.prev.focus({preventScroll:true});}catch(e){}if(L.onClose)L.onClose();if(cb)cb();};
  if(mo().off()||!L.el.animate){fin();return;}
  const d=mo().D('close'),e=mo().E('in');
  L.el.animate(L.out||[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(8px) scale(.98)'}],{duration:d,easing:e,fill:'forwards'});
  const sc=L.parts[0];if(sc&&sc.classList.contains('pf-scrim'))sc.animate([{opacity:1},{opacity:0}],{duration:d,easing:e,fill:'forwards'});
  setTimeout(fin,d+10);
}
PF.closeLayer=closeLayer;
function closeLayers(instant){PF.layers.slice().forEach(L=>{if(instant){L.parts.forEach(e=>e.remove());PF.layers=PF.layers.filter(x=>x!==L);if(L.onClose)L.onClose();}else closeLayer(L);});}
PF.closeLayers=closeLayers;
/* окно по центру (на телефоне — снизу) */
PF.modal=function(html,o){
  o=o||{};
  try{if(typeof hcHide==='function')hcHide(true);}catch(e){}/* FX80 F3: hover-карточка не остаётся над окном */
  const sc=document.createElement('div');sc.className='pf-scrim pf-top';
  const mw=document.createElement('div');mw.className='pf-mw';
  mw.innerHTML='<div class="pf-dlg'+(o.cls?' '+o.cls:'')+'" role="dialog" aria-modal="true" aria-label="'+esc(o.label||'')+'" tabindex="-1">'+html+'</div>';
  const dlg=mw.firstChild;document.body.appendChild(sc);document.body.appendChild(mw);
  const L=PF.pushLayer({el:dlg,parts:[sc,mw],onClose:o.onClose,request:()=>{if(o.onRequest)o.onRequest();else closeLayer(L);}});
  L.close=()=>closeLayer(L);
  sc.addEventListener('click',()=>L.request());
  dlg.addEventListener('click',e=>{if(e.target.closest('[data-x]')){e.preventDefault();L.request();}});
  if(!mo().off()&&dlg.animate){dlg.animate([{opacity:0,transform:'translateY(12px) scale(.97)'},{opacity:1,transform:'none'}],{duration:mo().D('base'),easing:mo().E('out')});sc.animate([{opacity:0},{opacity:1}],{duration:mo().D('fast'),easing:mo().E('out')});}
  setTimeout(()=>{const f=o.focus?$1(o.focus,dlg):$1('[autofocus],input,textarea,button',dlg);if(f&&f.focus)f.focus({preventScroll:true});},30);
  return L;
};
window.addEventListener('keydown',e=>{
  if(e.key==='Tab'){
    const L=PF.layers[PF.layers.length-1];if(!L)return;
    const fs=$A('button:not([disabled]),input:not([disabled]),textarea,select,a[href],[tabindex="0"]',L.el).filter(x=>x.offsetParent!==null);
    if(!fs.length)return;const a=fs[0],z=fs[fs.length-1];
    if(!L.el.contains(document.activeElement)){e.preventDefault();a.focus();}
    else if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}
    else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}
    return;
  }
  if(e.key!=='Escape')return;
  const L=PF.layers[PF.layers.length-1];
  if(L){e.preventDefault();e.stopImmediatePropagation();L.request();return;}
  if(PF.rename){e.preventDefault();e.stopImmediatePropagation();PF.rename=null;renderList(false);return;}
  if(PF.menu){e.preventDefault();e.stopImmediatePropagation();closeMenu();return;}
  if(PF.confirm){e.preventDefault();e.stopImmediatePropagation();PF.confirm=null;renderList(false);return;}
  if(PF.guest&&visibleView()){e.preventDefault();e.stopImmediatePropagation();guestOff();}
},true);

/* ---------- меню ⋯ ---------- */
function menuHTML(f){
  const k=esc(f.key),dr=f.st==='draft',np=pinCount(),pinDis=dr||f.vis!=='pub'||(!f.pin&&np>=MAXPIN);
  const hint=dr?'':(f.vis!=='pub'?'<span class="hint">скрыт</span>':(!f.pin&&np>=MAXPIN?'<span class="hint">места заняты</span>':''));
  return '<button type="button" role="menuitem" data-pf="m-rename" data-k="'+k+'">'+ic('pen2')+'Переименовать</button>'+
    '<button type="button" role="menuitem" data-pf="m-ready" data-k="'+k+'">'+ic('check')+(dr?'Отметить готовым':'Вернуть в черновики')+'</button>'+
    '<button type="button" role="menuitem" data-pf="m-pin" data-k="'+k+'"'+(pinDis?' disabled':'')+'>'+ic('pin')+(f.pin?'Открепить':'Закрепить в профиле')+hint+'</button>'+
    '<button type="button" role="menuitem" data-pf="m-hide" data-k="'+k+'"'+(dr?' disabled':'')+'>'+ic(f.vis==='pub'?'eye-off':'eye')+(f.vis==='pub'?'Скрыть из профиля':'Показать в профиле')+'</button>'+
    '<hr class="divider"><button type="button" role="menuitem" class="dng" data-pf="m-del" data-k="'+k+'">'+ic('trash')+'Удалить</button>';
}
function closeMenu(instant){
  const key=PF.menu;PF.menu=null;
  $A('.menu.pop[data-menu]').forEach(m=>{
    m.hidden=true;const rm=()=>m.remove();
    if(instant||mo().off())rm();else setTimeout(rm,mo().D('fast')+40);
  });
  $A('[data-pf=more][aria-expanded=true]').forEach(b=>b.setAttribute('aria-expanded','false'));
  return key;
}
function openMenu(key,btn){
  closeMenu(true);const f=byKey(key),host=btn.closest('[data-card]');if(!f||!host)return;
  const m=document.createElement('div');m.className='menu pop';m.setAttribute('role','menu');m.setAttribute('aria-label','Действия');m.dataset.menu=key;m.hidden=true;m.innerHTML=menuHTML(f);
  host.appendChild(m);PF.menu=key;btn.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>{m.hidden=false;const first=$1('button:not([disabled])',m);if(first)first.focus({preventScroll:true});});
  m.addEventListener('keydown',e=>{
    const it=$A('button:not([disabled])',m),i=it.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus();}
    else if(e.key==='Tab'){closeMenu();}
  });
}

/* ---------- действия над шрифтами ---------- */
function setVis(key,v){
  const f=byKey(key);if(!f)return;const p=projOf(key);
  if(v==='pub'&&f.st!=='ready')return;
  p.vis=v==='pub'?'pub':'hid';renumber();saveMeta();
}
function togglePin(key){
  const i=M.pins.indexOf(key);
  if(i>=0){M.pins.splice(i,1);saveMeta();return true;}
  const f=byKey(key);if(!f||f.st!=='ready'||f.vis!=='pub'||M.pins.length>=MAXPIN)return false;
  M.pins.push(key);saveMeta();return true;
}
function setReady(key,on){
  const p=projOf(key);p.st=on?'ready':'draft';if(!on)p.vis='hid';renumber();saveMeta();
}
function renameProject(key,name){
  name=String(name||'').trim().slice(0,40);if(!name)return false;
  try{
    if(key==='imp'){IMP.family=name;IMP.ver++;iuRegisterNow();}
    else if(key==='draw'){if(window.GT_DRAW&&GT_DRAW.setName)GT_DRAW.setName(name);else{const o=JSON.parse(localStorage.getItem(DRK)||'null');if(o){o.name=name;localStorage.setItem(DRK,JSON.stringify(o));}}drLast={raw:null,v:null};}
    else{const id=key.slice(4),sl=slotOf(id);if(!sl)return false;sl.family=name;if(id===S.fontId){S.family=name;const fi=document.getElementById('fam');if(fi)fi.value=name;}PDIRTY.add(id);}
    persist();
  }catch(e){console.error(e);return false;}
  return true;
}
/* удаление: библиотечный шрифт остаётся (сбрасываются только правки), свой шрифт и рисунок стираются */
function removeProject(key){
  try{
    if(key==='draw'){drLast={raw:null,v:null};if(window.GT_DRAW&&GT_DRAW.reset)GT_DRAW.reset();else localStorage.removeItem(DRK);}
    else if(key==='imp'){
      const drawn=impDrawnOnly();
      impUnpack(null);iuRegisterNow();delete S.lib.imp;try{localStorage.removeItem(KEY+'-f-imp');}catch(e){}
      if(drawn){drLast={raw:null,v:null};if(window.GT_DRAW&&GT_DRAW.reset)GT_DRAW.reset();else localStorage.removeItem(DRK);}
    }else{
      const id=key.slice(4);if(!FONTS[id]||id==='imp')return false;
      S.lib[id]=mkSlot(id);
      if(S.fontId===id){activate(id);buildGlyphList();buildPanel();syncPanel();bump();}
      PDIRTY.add(id);
    }
    delete M.proj[key];renumber();saveMeta();persist();
  }catch(e){console.error(e);return false;}
  return true;
}
function openProject(key){
  if(window.GT_DRAFTS)GT_DRAFTS.keepNext();
  if(key==='draw'){guestOff(true);setTab('draw');return;}
  const id=key==='imp'?'imp':key.slice(4);
  if(!FONTS[id]){toast('Этого шрифта уже нет в библиотеке. Выберите другой');return;}
  guestOff(true);libOpen(id);
}
PF.MAXPIN=MAXPIN;PF.LICIDS=LICIDS;PF.setVis=setVis;PF.togglePin=togglePin;PF.setReady=setReady;PF.renameProject=renameProject;PF.removeProject=removeProject;PF.openProject=openProject;PF.byKey=byKey;PF.pinCount=pinCount;

/* ---------- буфер обмена ---------- */
function copyText(text,okMsg){
  const fb=()=>{try{const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.className='pf-sr';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(e){return false;}};
  const done=ok=>toast(ok?okMsg:'Не получилось скопировать сразу. Скопируйте вручную: '+text.slice(0,60));
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>done(true),()=>done(fb()));return;}}catch(e){}
  done(fb());
}
PF.copyText=copyText;

document.addEventListener('keydown',e=>{
  const t=e.target;if(!t||!t.classList)return;
  if(t.classList.contains('pf-rn')){if(e.key==='Enter'){e.preventDefault();commitRename();}}
  else if(t.classList.contains('pfc')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setTab('folder');}
},true);
document.addEventListener('focusout',e=>{
  const t=e.target;if(!t||!t.classList)return;
  if(t.classList.contains('pf-rn')&&PF.rename)commitRename();
});
function commitRename(){
  const rn=$1('.pf-rn');if(!rn||!PF.rename)return;
  const key=PF.rename,v=rn.value.trim(),f=byKey(key);PF.rename=null;
  if(f&&v&&v!==f.name){if(renameProject(key,v))toast('Переименовано');}
  renderList(false);
}

/* ---------- события ---------- */
const A=PF.act;
A.edit=()=>PF.openEdit&&PF.openEdit();
A['edit-links']=()=>PF.openEdit&&PF.openEdit({focus:'links'});
A.share=()=>PF.openShare&&PF.openShare({});
A.guest=()=>guestOn();
A.unguest=()=>guestOff();
A['open-folder']=()=>setTab('folder');
A.card=()=>PF.openCard&&PF.openCard();
A.backup=()=>PF.openBackup&&PF.openBackup();
A['lab-imp']=()=>{if(typeof iuOpen==='function')iuOpen();};
A['lab-draw']=()=>setTab('draw');
A.filter=a=>{PF.filter=a.dataset.f;PF.menu=PF.rename=PF.confirm=null;renderList(true);};
A.view=a=>{M.fview=a.dataset.m==='list'?'list':'grid';saveMeta();$A('.pf-filters .seg button').forEach(b=>{const on=b.dataset.m===M.fview;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});renderList(false);};
A.vis=a=>{const f=byKey(a.dataset.k);if(!f)return;setVis(a.dataset.k,a.dataset.v);renderList(false);toast(a.dataset.v==='pub'?'«'+f.name+'» виден в профиле':'«'+f.name+'» скрыт из профиля');};
A.more=(a,e)=>{e.stopPropagation();if(PF.menu===a.dataset.k)closeMenu();else openMenu(a.dataset.k,a);};
A['m-rename']=a=>{closeMenu(true);PF.rename=a.dataset.k;renderList(false);};
A['m-ready']=a=>{const f=byKey(a.dataset.k);if(!f)return;closeMenu(true);setReady(a.dataset.k,f.st==='draft');renderList(false);toast(f.st==='draft'?'«'+f.name+'» отмечен готовым':'«'+f.name+'» вернулся в черновики');};
A['m-pin']=a=>{const f=byKey(a.dataset.k);closeMenu(true);if(togglePin(a.dataset.k)){renderList(false);toast(byKey(a.dataset.k).pin?'«'+f.name+'» закреплён':'«'+f.name+'» откреплён');}};
A['m-hide']=a=>{const f=byKey(a.dataset.k);if(!f)return;closeMenu(true);setVis(a.dataset.k,f.vis==='pub'?'hid':'pub');renderList(false);};
A['m-del']=a=>{closeMenu(true);PF.confirm=a.dataset.k;renderList(false);const b=$1('[data-pf=del-no]');if(b)b.focus();};
A['del-no']=()=>{PF.confirm=null;renderList(false);};
A['del-ok']=a=>{const f=byKey(a.dataset.k);PF.confirm=null;if(removeProject(a.dataset.k)){renderList(true);toast(a.dataset.k.indexOf('lib:')===0?'Правки сброшены: «'+(f?f.name:'')+'»':'Шрифт удалён');railAv();}};
A.cont=a=>openProject(a.dataset.k);
A['open-font']=a=>openProject(a.dataset.k);
document.addEventListener('click',e=>{
  if(e.target.closest('#rail-profile,#rail-back')){if(S.tab!=='profile')setTab('profile');return;}
  const a=e.target.closest('[data-pf]');
  if(!a){if(PF.menu&&!e.target.closest('.menu'))closeMenu();return;}
  const act=a.dataset.pf;
  if(PF.menu&&act!=='more'&&!a.closest('.menu'))closeMenu();
  if(a.tagName==='BUTTON'&&a.disabled)return;
  if(a.closest('.pf-dlg,.pf-drawer'))return;
  if(A[act])A[act](a,e);
});

/* ---------- подключение к вкладкам, перерисовка, подпись ---------- */
TAB_VIEWS.profile='view-profile';TAB_VIEWS.folder='view-pfolder';TAB_NAV.add('profile');TAB_NAV.add('folder');
let chkT=0;
function syncSoon(){
  clearTimeout(chkT);
  chkT=setTimeout(()=>{try{
    const ks=projKeys();let ch=false;for(const k of ks)if(stamp(k))ch=true;if(ch)saveMeta();
    railAv();
  }catch(e){}},1200);
}
document.addEventListener('DOMContentLoaded',()=>{
  syncAuthor();railAv();imgLoad();
  const _st=setTab;
  setTab=function(t){
    if(t==='lib')t='home';
    const was=S.tab;
    if(PF.guest&&t!=='profile'&&t!=='folder')guestOff(true);
    if(was!==t){closeLayers(true);closeMenu(true);PF.confirm=PF.rename=null;}
    const r=_st.apply(this,arguments);
    for(const k of ['profile','folder']){const el=document.getElementById(TAB_VIEWS[k]);if(el&&S.tab!==k)el.hidden=true;}
    if(S.tab==='profile'||S.tab==='folder'){renderCurrent(false);}
    else{const g=$1('.pf-gpill');if(g)g.remove();}
    railAv();
    return r;
  };
  const _pr=persist;persist=function(){const r=_pr.apply(this,arguments);syncSoon();return r;};
  /* рисунки образцов зависят от темы и ширины */
  let rt=0;const rep=()=>{clearTimeout(rt);rt=setTimeout(()=>{const v=visibleView();if(v)paint(v);},60);};
  new MutationObserver(rep).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.addEventListener('resize',rep);
  const ro=window.ResizeObserver?new ResizeObserver(rep):null;
  if(ro){const a=elP(),b=elF();if(a)ro.observe(a);if(b)ro.observe(b);}
  window.addEventListener('storage',e=>{if(e.key===LSK){try{M=norm(JSON.parse(e.newValue||'null'));syncAuthor();railAv();}catch(x){}}});
});

/* экспорт файла шрифта = «готово» (в «Созданных шрифтах» шрифт получает статус «Готов») */
const _sf=saveFile;
saveFile=async function(name,data,mime){
  const ok=await _sf.apply(this,arguments);
  try{
    if(ok&&/\.(ttf|otf|woff2?)$|-family\.zip$/i.test(String(name))){
      const key=S.fontId==='imp'?'imp':'lib:'+S.fontId;
      if(key==='imp'?hasImp():isCustom(S.fontId)){const p=projOf(key);p.exp=Date.now();if(!p.sig)p.sig=sigOf(key);saveMeta();syncSoon();}
    }
  }catch(e){}
  return ok;
};
PF.test={isCustom,projKeys,sigOf,drawInfo,latMoved};
})();
