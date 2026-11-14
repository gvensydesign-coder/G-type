/* ===== «Свой знак»: рисование нового знака скелетом и пером прямо в редакторе =====
   Данные и движок — core20.js (S.custom[символ] = {skel, k, pen, w}); здесь интерфейс: кнопка «+ Знак» в списке знаков,
   окно выбора символа, режим «Рисовать» (клик — угол, перетаскивание — плавный узел, Enter — закончить штрих), панель узла и знака.
   Всё подключается обёртками (как в ui_sk.js): функции других файлов не правятся. */
S.custom=cuMap(S.fontId);
const CUD={si:-1,sel:null,grp:[],xf:false,redo:[],hover:null,refit:true,fw:0,drag:null,tap:{t:0,x:0,y:0},ptr:'mouse',snapHit:null,statT:0,stat:null};
const cuCh=()=>S.custom&&(S.custom[S.sel]?S.sel:CU.alias[S.sel]);
const cuRec=()=>{const k=cuCh();return k?S.custom[k]:undefined;};
const cuOn=()=>!!cuRec();
const cuDrawing=()=>S.mode==='draw'&&cuOn();
const cuOrig=ch=>!!(FONTS[S.fontId]&&FONTS[S.fontId].GL&&FONTS[S.fontId].GL[ch]);
const cuLoadMap=(id,raw)=>{const m={};if(raw&&typeof raw==='object')for(const ch of Object.keys(raw)){if(!cuCharOk(ch))continue;const r=cuSan(raw[ch]);if(cuInk(r))m[ch]=r;}CU.byFont[id]=m;return m;};
/* ---------- хранение: слот шрифта, проект, отмена ---------- */
const _stash_cu=stash;stash=function(){_stash_cu();const sl=S.lib[S.fontId];if(sl)sl.custom=S.custom;};
const _mkSlot_cu=mkSlot;mkSlot=function(id,d){const s=_mkSlot_cu(id,d);s.custom=cuLoadMap(id,d&&d.custom);return s;};
const _activate_cu=activate;activate=function(id){const sl=S.lib[id]||(S.lib[id]=mkSlot(id));if(!sl.custom)sl.custom=cuMap(id);CU.byFont[id]=sl.custom;S.custom=sl.custom;_activate_cu(id);CUD.si=-1;CUD.sel=null;};
const _snap_cu=snap;snap=function(){CUD.redo.length=0;_snap_cu();const i=undoStack.length-1,s=undoStack[i];if(typeof s==='string'&&s.endsWith('}'))undoStack[i]=s.slice(0,-1)+',"custom":'+JSON.stringify(S.custom)+'}';};
function cuAfter(){SKBB.clear();cuKernApply(S.fontId);DESIGN=null;if(typeof _ckCache!=='undefined')for(const k of Object.keys(_ckCache))delete _ckCache[k];}
function cuRestore(o){const m=S.custom;for(const k of Object.keys(m))delete m[k];
  for(const ch of Object.keys(o||{})){if(cuCharOk(ch))m[ch]=cuSan(o[ch]);}
  useFont(S.fontId);for(const ch in m)if(!cuInk(m[ch]))cuInstall1(S.fontId,ch);
  cuAfter();if(!GL[S.sel])S.sel=CHARSET.find(c=>GL[c]&&c!==' ')||S.sel;CUD.si=-1;CUD.sel=null;buildGlyphList();}
const _undo_cu=undo;undo=function(){const top=undoStack[undoStack.length-1],n=undoStack.length,keep=CUD.sel,kg=CUD.grp,now=JSON.stringify(S.custom);let had=false;
  if(top!==undefined){try{const o=JSON.parse(top);if(o.custom!==undefined){had=true;cuRestore(o.custom);}}catch(e){}}
  _undo_cu();if(had&&undoStack.length<n)CUD.redo.push(now);
  const r=cuRec();if(keep&&r&&r.skel[keep.si]&&(r.skel[keep.si].dot||r.skel[keep.si].nodes[keep.ni])){CUD.sel=keep;CUD.grp=kg;}
  if(S.mode==='draw'&&!cuOn())S.mode='points';syncPanel();};
const _redo_cu=redo;redo=function(){const n=undoStack.length,it=CUD.redo[CUD.redo.length-1],keep=CUD.sel,kg=CUD.grp;
  const r0=_redo_cu.apply(this,arguments);
  if(undoStack.length>n&&it!==undefined){CUD.redo.pop();try{cuRestore(JSON.parse(it));}catch(e){}
    const r=cuRec();if(keep&&r&&r.skel[keep.si]&&(r.skel[keep.si].dot||r.skel[keep.si].nodes[keep.ni])){CUD.sel=keep;CUD.grp=kg;}syncPanel();}
  return r0;};
/* ключ кеша знака включает версию своего знака (правка скелета меняет ключ) */
const _edOfKey_cu=edOfKey;edOfKey=function(ch){const e=_edOfKey_cu(ch),r=S.custom&&S.custom[ch];return r?Object.assign({},e,{__cu:r.v}):e;};
/* во время перетаскивания — быстрые контуры без объединения (как у скелетных знаков) */
const _live_cu=liveGlyphOf;liveGlyphOf=function(ch,st,edits){const d=GL[ch];if(!(d&&d.opt&&d.opt.cu))return _live_cu(ch,st,edits);SKX.FAST=true;try{return _live_cu(ch,st,edits);}finally{SKX.FAST=false;}};
/* ---------- вид: масштаб и сдвиг не прыгают, пока рисуешь ---------- */
const _view_cu=view;
view=function(){if(!cuDrawing())return _view_cu();
  if(CUD.refit||V.fitH==null){const p=cur().p,y0=-p.desc-50,y1=Math.max(p.asc,p.capH)+70;V.fitH=y1-y0;V.cy=(y0+y1)/2;CUD.refit=false;}
  const had=drag;if(!had)drag={kind:'cu-view',fw:CUD.fw||null};
  try{return _view_cu();}finally{if(drag&&drag.kind==='cu-view')drag=null;}};
/* ---------- стили ---------- */
(function(){const st=document.createElement('style');st.textContent=`
.cu-bar{display:flex;gap:8px;align-items:center;margin:0 0 10px}
.cu-bar .btn{flex:1}
.gb.cu::after{content:"";position:absolute;left:8px;right:8px;bottom:3px;height:2px;border-radius:var(--r-xs);background:var(--accent);opacity:.85}
.gb{position:relative}
.cus{display:flex;flex-direction:column;gap:10px}
.cus .seg button{padding:5px 10px;font-size:var(--fs-sm)}
.cus .skw input[type=range]{width:120px}
body.cu-draw .specwrap{display:none}
body.cu-draw .stage{grid-template-rows:auto minmax(240px,1fr) auto}
@media (max-width:1060px){body.cu-draw .stage{grid-template-rows:auto 62vh auto}}
.cup{width:100%;margin-left:0;flex-direction:column;align-items:stretch;gap:8px}
.cup .cur,.cus .cur{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;min-width:0;max-width:100%}#cu-cap,#cu-type{flex-wrap:wrap;max-width:100%;min-width:0}
.cup .skw input[type=number],.cus .skw input[type=number],.cus .skw input[type=text]{width:72px;border:0;background:var(--panel);border-radius:var(--r-pill);padding:5px 10px;font-size:var(--fs-sm)}
.cu-st{font-size:var(--fs-sm);color:var(--muted);min-height:16px}
.btn.on{background:var(--ink);color:var(--on-ink)}
.cu-st.bad{color:var(--danger)}
.cu-modal{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px}
.cu-modal[hidden]{display:none}
.cu-card{background:var(--bg);border-radius:var(--r);padding:20px;width:min(440px,100%);display:flex;flex-direction:column;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,.22)}
.cu-card h4{margin:0;font:700 var(--fs-lg) var(--f-ui)}
.cu-card input[type=text]{border:0;background:var(--panel);border-radius:var(--r-sm);padding:12px 14px;font:500 var(--fs-xl) var(--f-ui);width:100%}
.cu-msg{font-size:var(--fs-md);color:var(--muted);min-height:36px}
.cu-msg.bad{color:var(--danger)}
.cu-card .chip{background:var(--panel)}
.cu-card .chip.on{background:var(--ink)}
.cu-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cu-row.end{justify-content:flex-end}
`;document.head.appendChild(st);})();
/* ---------- список знаков: «+ Знак», пометка своих ---------- */
const _bgl_cu=buildGlyphList;
buildGlyphList=function(){_bgl_cu();const box=$('#glyphs');if(!box)return;
  $$('.gb',box).forEach(b=>{const k=S.custom[b.dataset.ch]?b.dataset.ch:CU.alias[b.dataset.ch];if(k){b.classList.add('cu');b.title+=cuOrig(k)?' · перерисован вами':' · ваш знак';}});
  if(!$('#cu-add')){const bar=document.createElement('div');bar.className='cu-bar';
    bar.innerHTML='<button type="button" class="btn sm" id="cu-add" title="Нарисовать новый знак скелетом и пером">+ Знак</button>';
    box.insertBefore(bar,box.firstChild);$('#cu-add').addEventListener('click',()=>cuDialog());}};
/* ---------- создание / удаление ---------- */
function cuDefaultK(ch){return /\p{Ll}/u.test(ch)?'xh':'cap';}
function cuCreate(ch,k){
  if(!cuCharOk(ch))return false;
  cuDropDraft(ch);snap();
  S.custom[ch]=cuSan({k:k||cuDefaultK(ch),skel:[]});
  cuInstall1(S.fontId,ch);cuAfter();buildGlyphList();
  S.sel=ch;S.view={zoom:1,px:0,py:0};S.node=null;S.mode='draw';cuEnter();
  syncPanel();bump();schedule();
  toast('Клик — угол, протяжка — плавный узел, Enter — конец штриха');return true;}
function cuEnter(){CUD.refit=true;CUD.si=-1;CUD.sel=null;CUD.hover=null;const g=rawGlyph();CUD.fw=Math.max(g?g.weff:0,cur().p.capH*0.85);V.fitH=null;if(innerWidth<=900){const s=document.getElementById('stagebox');if(s)s.scrollIntoView({block:'center'});}}
function cuRemoveGlyph(){const ch=cuCh(),rec=cuRec();if(!rec)return;const orig=cuOrig(ch);snap();
  delete S.custom[ch];useFont(S.fontId);cuAfter();
  if(!GL[S.sel])S.sel=CHARSET.find(c=>GL[c]&&c!==' ')||S.sel;
  S.mode='points';CUD.si=-1;CUD.sel=null;S.node=null;buildGlyphList();syncPanel();bump();
  toast(orig?'Исходный знак «'+ch+'» возвращён':'Знак «'+ch+'» удалён');}
/* пустой черновик (нарисовать ничего не успели) убирается при уходе со знака; исходный знак возвращается */
function cuDropDraft(next){const old=cuCh(),r=old&&S.custom[old],nk=next&&(S.custom[next]?next:CU.alias[next]);if(!r||old===nk||cuInk(r))return;
  delete S.custom[old];useFont(S.fontId);for(const ch in S.custom)if(!cuInk(S.custom[ch]))cuInstall1(S.fontId,ch);cuAfter();buildGlyphList();}
const _sel_cu=selectGlyph;
selectGlyph=function(ch){cuDropDraft(ch);_sel_cu(ch);
  if(cuOn()){if(S.mode!=='draw'){S.mode='draw';}cuEnter();}else if(S.mode==='draw')S.mode='points';
  syncPanel();schedule();};
const _sw_cu=switchFont;switchFont=function(id){if(id!==S.fontId)cuDropDraft(null);_sw_cu(id);};
/* ---------- окно «Новый знак» ---------- */
function cuParse(v){v=String(v||'').trim();if(!v)return null;
  const a=Array.from(v);if(a.length===1)return a[0];
  /* FX80 B10: код без префикса (U+, 0x, \u, &#x) принимается только как 4–5 шестнадцатеричных цифр с хотя бы одной цифрой: «ab», «bad», «face» — не код */
  const m=/^(?:u\+|0x|\\u|&#x)?([0-9a-f]{2,5});?$/i.exec(v);if(m&&!/^(?:u\+|0x|\\u|&#x)/i.test(v)&&!(m[1].length>=4&&/[0-9]/.test(m[1])))return undefined;if(m){const c=parseInt(m[1],16);if(c>0&&c<0xFFFE)return String.fromCharCode(c);}
  return undefined;}
function cuFreePUA(){for(let c=CU.PUA[0];c<=CU.PUA[1];c++){const ch=String.fromCharCode(c);if(!GL[ch]&&!S.custom[ch])return ch;}return null;}
function cuDialog(){
  let el=$('#cudlg');
  if(!el){el=document.createElement('div');el.id='cudlg';el.className='cu-modal';el.hidden=true;
    el.innerHTML='<div class="cu-card" role="dialog" aria-labelledby="cu-t"><h4 id="cu-t">Новый знак</h4>'
      +'<input type="text" id="cu-ch" autocomplete="off" spellcheck="false" placeholder="Символ или код: ѣ, U+0463" aria-label="Символ или код Unicode">'
      +'<div class="cu-msg" id="cu-msg"></div>'
      +'<div class="cu-row" id="cu-sug"></div>'
      +'<div class="cu-row"><span class="seg" id="cu-dk" role="group" aria-label="Высота"><button type="button" data-k="xh">Строчный</button><button type="button" data-k="cap">Прописной</button></span></div>'
      +'<div class="cu-row end"><button type="button" class="btn" id="cu-cancel">Отмена</button><button type="button" class="btn pri" id="cu-go">Рисовать</button></div></div>';
    document.body.appendChild(el);
    el.addEventListener('pointerdown',e=>{if(e.target===el)cuClose();});
    $('#cu-cancel').addEventListener('click',cuClose);
    $('#cu-go').addEventListener('click',cuSubmit);
    $('#cu-ch').addEventListener('input',()=>{cuDK.user=false;cuMsg();});
    $('#cu-ch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();cuSubmit();}else if(e.key==='Escape'){e.preventDefault();cuClose();}});
    $$('#cu-dk button').forEach(b=>b.addEventListener('click',()=>{cuDK.k=b.dataset.k;cuDK.user=true;cuMsg();}));}
  el.hidden=false;const inp=$('#cu-ch');inp.value='';cuDK.user=false;
  const old=$('#cu-cur');if(old)old.remove();
  if(S.sel&&S.sel.trim()&&cuCharOk(S.sel)&&!cuCh()){const b=document.createElement('button');b.type='button';b.className='chip on';b.id='cu-cur';b.textContent='Перерисовать «'+S.sel+'»';b.title='Выбранный знак будет нарисован заново с пустого скелета';
    b.addEventListener('click',()=>{inp.value=S.sel;cuDK.user=false;cuMsg();inp.focus();});$('#cu-sug').insertBefore(b,$('#cu-sug').firstChild);}
  cuMsg();setTimeout(()=>inp.focus(),30);}
const cuDK={k:'cap',user:false};
function cuClose(){const el=$('#cudlg');if(el)el.hidden=true;}
function cuMsg(){const inp=$('#cu-ch'),m=$('#cu-msg'),go=$('#cu-go');if(!inp)return;
  const ch=cuParse(inp.value);let t='',bad=false,ok=false;
  if(ch===null)t='Введите символ или его код Unicode. Можно выбрать свободную ячейку ниже.';
  else if(ch===undefined||!cuCharOk(ch)){bad=true;t='Нужен один символ или код из диапазона U+0021…U+FFFD (не пробел, не управляющий и не комбинируемый знак).';}
  else{ok=true;const u=cuUni(ch);
    const tw=FONTS[S.fontId].GL[ch]?cuTwins(S.fontId,ch).filter(c=>/\p{L}/u.test(c)):[];
    if(S.custom[ch]||CU.alias[ch])t=ch+'  '+u+' — вы уже рисовали этот знак: откроется для правки.';
    else if(GL[ch])t=ch+'  '+u+' — в шрифте есть. Он будет перерисован с пустого скелета; исходный вернётся кнопкой «Вернуть знак».'+(tw.length?' Одинаковая буква «'+tw.join('», «')+'» — тот же знак, она изменится вместе с ним.':'');
    else t=ch+'  '+u+' — в шрифте такого знака нет: он добавится в шрифт'+(cuIsPUA(ch)?' (ячейка для частного использования).':'.');
    if(!cuDK.user)cuDK.k=S.custom[ch]?S.custom[ch].k:(GL[ch]&&GL[ch].k==='xh'?'xh':GL[ch]?'cap':cuDefaultK(ch));}
  m.textContent=t;m.classList.toggle('bad',bad);go.disabled=!ok;
  $$('#cu-dk button').forEach(b=>b.classList.toggle('on',b.dataset.k===cuDK.k));
  const sug=$('#cu-sug');if(!sug.dataset.done){sug.dataset.done=1;
    const cand='ѣѢѳѲѵѴꙗꙖꙁꙀҏҎꚃꙮ';let n=0;
    for(const c of cand){if(GL[c]||n>=6)continue;n++;const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=c;b.title=cuUni(c);
      b.addEventListener('click',()=>{inp.value=c;cuDK.user=false;cuMsg();inp.focus();});sug.appendChild(b);}
    const f=cuFreePUA();if(f){const b=document.createElement('button');b.type='button';b.className='chip';b.textContent='Свободная ячейка '+cuUni(f);
      b.addEventListener('click',()=>{inp.value=cuFreePUA();cuDK.user=false;cuMsg();inp.focus();});sug.appendChild(b);}}}
function cuSubmit(){const ch=cuParse($('#cu-ch').value);if(!ch||!cuCharOk(ch))return;cuClose();
  if(S.custom[ch]||CU.alias[ch]){selectGlyph(ch);return;}
  cuCreate(ch,cuDK.k);}
/* ---------- привязка к направляющим и шагу ---------- */
function cuSnapPt(x,y,alt){const r=drSnapPt(x,y,alt,8/V.sc);CUD.snapHit=r.hit;return r.p;}
const cuClamp=(x,y)=>[Math.max(CU.LIM.xmin,Math.min(CU.LIM.xmax,x)),Math.max(CU.LIM.ymin,Math.min(CU.LIM.ymax,y))];
/* ---------- правка данных ---------- */
function cuBump(){const r=cuRec();if(r){r.v=++CU.seq;const k=cuCh();if(!cuOrig(k)&&cuInk(r)!==CHARSET.includes(k))cuInstall1(S.fontId,k);}SKBB.clear();bump();cuStatSoon();}
function cuStroke(){const r=cuRec();return r&&CUD.si>=0?r.skel[CUD.si]:null;}
function cuTotal(r){return cuCount(r);}
function cuEndStroke(){const r=cuRec();const st=cuStroke();CUD.si=-1;CUD.xf=false;if(!r||!st)return;
  if(st.dot)return;
  if(st.nodes.length===1){/* один клик — точка (круг пера) */const n=st.nodes[0];const i=r.skel.indexOf(st);r.skel[i]={dot:true,x:n.x,y:n.y,r:null};CUD.sel={si:i,ni:0,part:'p'};}
  else{st.nodes[0].a=st.closed?st.nodes[0].a:null;if(!st.closed)st.nodes[st.nodes.length-1].b=null;}}
function cuRevert(before){const r=cuRec();if(!r||before==null)return;const o=JSON.parse(before);r.skel=o.skel;r.k=o.k;r.pen=o.pen;r.w=o.w;r.v=++CU.seq;SKBB.clear();}
const cuSnapshot=()=>{const r=cuRec();return r?JSON.stringify({skel:r.skel,k:r.k,pen:r.pen,w:r.w}):null;};
/* общая проверка после правки: контур должен быть корректным; у существующих узлов топология не меняется (как в режиме «Скелет») */
function cuCheck(before,strict,t0){const r=cuRec();if(!r||!cuInk(r))return true;
  const t1=cuTopo(S.fontId,r,cur().p);
  if(t1==='x'||(strict&&t0!=null&&t0!=='x'&&t1!==t0)){cuRevert(before);if(undoStack.length)undoStack.pop();CUD.si=-1;cuBump();syncNodeInfo();
    toast(t1==='x'?'Так контур сломается, поэтому правку отменили. Сдвиньте точку чуть меньше':'Так знак распадётся на части или потеряет просвет, поэтому правку отменили. Сдвиньте меньше');return false;}
  return true;}
const cuTopoNow=()=>{const r=cuRec();return r&&cuInk(r)?cuTopo(S.fontId,r,cur().p):null;};
function cuAddNode(x,y){const r=cuRec();if(!r)return null;
  let st=cuStroke();const L=CU.LIM;
  if(!st){if(r.skel.length>=L.strokes){toast('Штрихов не больше '+L.strokes);return null;}}
  if(cuTotal(r)>=L.total){toast('Узлов не больше '+L.total+' на знак');return null;}
  if(st&&st.nodes.length>=L.nodes){toast('В штрихе не больше '+L.nodes+' узлов — начните новый (N)');return null;}
  const [cx,cy]=cuClamp(x,y);
  if(st){const l=st.nodes[st.nodes.length-1];if(Math.hypot(l.x-cx,l.y-cy)<L.gap)return null;}
  CUD.xf=false;const n={x:cx,y:cy,a:null,b:null,type:'corner'};
  if(!st){st={nodes:[n]};r.skel.push(st);CUD.si=r.skel.length-1;}else st.nodes.push(n);
  CUD.sel={si:CUD.si,ni:st.nodes.length-1,part:'p'};return n;}
/* узел под курсором: сам узел или ручка выбранного узла */
function cuHit(sx,sy){const r=cuRec();if(!r)return null;const f=skMap().s,R=CUD.ptr==='touch'?20:11;let best=null,bd=R;
  const sel=CUD.sel;
  r.skel.forEach((st,si)=>{
    if(st.dot){const q=f(st.x,st.y),d=Math.hypot(q[0]-sx,q[1]-sy);if(d<bd){bd=d;best={si,ni:0,part:'p'};}return;}
    st.nodes.forEach((n,ni)=>{
      if(sel&&sel.si===si&&sel.ni===ni)for(const h of ['a','b']){const hd=n[h];if(!hd||Math.hypot(hd.x-n.x,hd.y-n.y)<0.5)continue;
        const q=f(hd.x,hd.y),d=Math.hypot(q[0]-sx,q[1]-sy)-1;if(d<bd){bd=d;best={si,ni,part:h};}}
      const q=f(n.x,n.y),d=Math.hypot(q[0]-sx,q[1]-sy);if(d<bd){bd=d;best={si,ni,part:'p'};}});});
  return best;}
const cuNode=h=>{const r=cuRec(),st=r&&r.skel[h.si];if(!st)return null;return st.dot?{x:st.x,y:st.y,dot:true}:st.nodes[h.ni]||null;};
const cuIsEnd=(st,ni)=>!st.dot&&!st.closed&&(ni===0||ni===st.nodes.length-1);
function cuMoveTo(h,x,y,brk){const r=cuRec(),st=r.skel[h.si];if(!st)return;
  if(st.dot){const [cx,cy]=cuClamp(x,y);st.x=cx;st.y=cy;return;}
  const n=st.nodes[h.ni];if(!n)return;
  if(h.part==='p'){const [cx,cy]=cuClamp(x,y),dx=cx-n.x,dy=cy-n.y;n.x=cx;n.y=cy;for(const q of [n.a,n.b])if(q){q.x+=dx;q.y+=dy;}return;}
  const o=h.part==='a'?'b':'a';
  let dx=x-n.x,dy=y-n.y,L=Math.hypot(dx,dy);if(L>CU.LIM.handle){dx*=CU.LIM.handle/L;dy*=CU.LIM.handle/L;L=CU.LIM.handle;}
  if(brk&&n.type!=='corner')n.type='corner';
  n[h.part]={x:n.x+dx,y:n.y+dy};
  if(n.type==='smooth'&&n[o]&&L>1e-3){const lo=Math.hypot(n[o].x-n.x,n[o].y-n.y)||L;n[o]={x:n.x-dx/L*lo,y:n.y-dy/L*lo};}}
function cuSetType(h,type){const r=cuRec(),st=r&&r.skel[h.si];if(!st||st.dot||cuIsEnd(st,h.ni))return false;
  const n=st.nodes[h.ni];n.type=type;
  if(type==='smooth'){const ns=st.nodes,c=ns.length,P=ns[(h.ni-1+c)%c],N=ns[(h.ni+1)%c];
    let u=[N.x-P.x,N.y-P.y];if(n.a&&n.b&&Math.hypot(n.a.x-n.x,n.a.y-n.y)>.5&&Math.hypot(n.b.x-n.x,n.b.y-n.y)>.5){const ua=[n.x-n.a.x,n.y-n.a.y],ub=[n.b.x-n.x,n.b.y-n.y],la=Math.hypot(...ua),lb=Math.hypot(...ub);u=[ua[0]/la+ub[0]/lb,ua[1]/la+ub[1]/lb];}
    const l=Math.hypot(u[0],u[1])||1;u=[u[0]/l,u[1]/l];
    const la=n.a?Math.hypot(n.a.x-n.x,n.a.y-n.y):Math.hypot(P.x-n.x,P.y-n.y)/3,lb=n.b?Math.hypot(n.b.x-n.x,n.b.y-n.y):Math.hypot(N.x-n.x,N.y-n.y)/3;
    n.a={x:n.x-u[0]*Math.max(la,10),y:n.y-u[1]*Math.max(la,10)};n.b={x:n.x+u[0]*Math.max(lb,10),y:n.y+u[1]*Math.max(lb,10)};}
  return true;}
function cuReverse(st){st.nodes.reverse();for(const n of st.nodes){const a=n.a;n.a=n.b;n.b=a;}const c=st.cap0;st.cap0=st.cap1;st.cap1=c;
  if(st.cap0===undefined)delete st.cap0;if(st.cap1===undefined)delete st.cap1;}
function cuDeleteSel(){const r=cuRec(),h=CUD.sel;if(!r||!h)return;const st=r.skel[h.si];if(!st)return;
  const before=cuSnapshot();snap();
  if(st.dot||st.nodes.length===1){r.skel.splice(h.si,1);CUD.si=-1;CUD.sel=null;}
  else{st.nodes.splice(h.ni,1);if(st.closed&&st.nodes.length<3)delete st.closed;
    if(st.nodes.length===1){const n=st.nodes[0];r.skel[h.si]={dot:true,x:n.x,y:n.y,r:null};}
    CUD.sel=null;if(CUD.si===h.si)CUD.si=-1;}
  cuBump();cuCheck(before,false,null);cuDone();syncNodeInfo();}
function cuDone(){cuAfter();}
/* ---------- преобразование штрихов (ui_xform_x1.js): масштаб, форма, поворот выбранных штрихов ---------- */
function cuGroupIdx(){const r=cuRec(),h=CUD.sel;if(!CUD.xf||!cuDrawing()||!r||!h||CUD.si>=0||!r.skel[h.si])return [];
  return [h.si,...CUD.grp.filter(i=>i!==h.si&&r.skel[i])];}
function cuStrokeBox(st){return st.dot?{x0:st.x,y0:st.y,x1:st.x,y1:st.y}:impBBox([{hole:false,nodes:st.nodes.map(n=>({x:n.x,y:n.y,a:n.a,b:n.b}))}]);}
/* штрих после матрицы m; false — вышел за допустимое поле или ручка длиннее предела */
function cuXfStroke(st,m){const L=CU.LIM,ok=(x,y)=>isFinite(x)&&isFinite(y)&&x>=L.xmin&&x<=L.xmax&&y>=L.ymin&&y<=L.ymax;
  if(st.dot){const q=XF.pt(m,st.x,st.y);if(!ok(q[0],q[1]))return false;st.x=q[0];st.y=q[1];if(st.r!=null)st.r=Math.max(6,Math.min(260,st.r*Math.sqrt(Math.abs(XF.det(m)))));return true;}
  for(const n of st.nodes){const q=XF.pt(m,n.x,n.y);if(!ok(q[0],q[1]))return false;
    for(const h of ['a','b']){if(!n[h])continue;const t=XF.pt(m,n[h].x,n[h].y);if(!ok(t[0],t[1])||Math.hypot(t[0]-q[0],t[1]-q[1])>L.handle)return false;n[h]={x:t[0],y:t[1]};}
    n.x=q[0];n.y=q[1];}
  return true;}
let CUXF=null;
function xfCu(){
  if(CUXF)return CUXF;
  CUXF=XF.make({id:'cu',host:$('#stagebox'),
    enabled:()=>cuGroupIdx().length>0,
    bbox:()=>{const r=cuRec(),ix=cuGroupIdx();if(!r||!ix.length)return null;let b=null;for(const i of ix)b=XF.union(b,cuStrokeBox(r.skel[i]));return b;},
    key:()=>S.sel+'|'+cuGroupIdx().join(','),
    toS:(x,y)=>skMap().s(x,y),fromS:(sx,sy)=>skMap().inv(sx,sy),size:()=>[V.cw,V.ch],
    hostOffset:()=>{const c=$('#stage').getBoundingClientRect(),h=$('#stagebox').getBoundingClientRect();return [c.left-h.left,c.top-h.top];},
    snap:(ax,v)=>ax==='x'?drSnapPt(v,0,false,8/V.sc).p[0]:drSnapPt(0,v,false,8/V.sc).p[1],
    begin:()=>{const r=cuRec(),ix=cuGroupIdx();if(!r||!ix.length)return false;const before=cuSnapshot(),t0=cuTopoNow();snap();
      drag={kind:'cu',mode:'xf',fw:CUD.fw||null};return {before,t0,ix,orig:JSON.parse(before)};},
    apply:(m,t)=>{const r=cuRec();if(!r)return false;const sk=JSON.parse(JSON.stringify(t.orig.skel));
      for(const i of t.ix)if(!cuXfStroke(sk[i],m))return false;
      r.skel=sk;cuBump();return true;},
    end:(t,moved)=>{if(drag&&drag.mode==='xf')drag=null;
      if(!moved){undoStack.pop();schedule();return true;}
      const ok=cuCheck(t.before,true,t.t0);cuDone();syncNodeInfo();cuBump();return ok;},
    cancel:t=>{if(drag&&drag.mode==='xf')drag=null;cuRevert(t.before);undoStack.pop();cuBump();},
    redraw:schedule});
  return CUXF;}
/* ---------- рисование на холсте ---------- */
function cuDown(e){const [sx,sy]=pt(e);CUD.ptr=e.pointerType||'mouse';
  const r=cuRec(),M=skMap(),now=performance.now();
  const dbl=now-CUD.tap.t<340&&Math.hypot(sx-CUD.tap.x,sy-CUD.tap.y)<18;CUD.tap={t:dbl?0:now,x:sx,y:sy};
  $('#stage').setPointerCapture(e.pointerId);
  if(xfCu().down(e,sx,sy))return true;
  const hit=cuHit(sx,sy),w=M.inv(sx,sy);
  if(hit&&e.shiftKey&&CUD.sel&&CUD.si<0&&hit.si!==CUD.sel.si){/* Shift: добавить штрих в выделение (или убрать) */
    CUD.grp=CUD.grp.includes(hit.si)?CUD.grp.filter(i=>i!==hit.si):[...CUD.grp,hit.si];syncNodeInfo();schedule();return true;}
  if(hit&&!e.shiftKey&&!(CUD.sel&&CUD.sel.si===hit.si))CUD.grp=[];
  /* двойное нажатие вне узлов — закончить штрих */
  const act=cuStroke();
  if(dbl&&act&&(!hit||(hit.si===CUD.si&&hit.part==='p'&&hit.ni===act.nodes.length-1))){snap();cuEndStroke();CUD.sel=null;cuBump();cuDone();syncNodeInfo();schedule();return true;}
  if(hit){
    const st=r.skel[hit.si];
    /* нажатие на первый узел открытого штриха из ≥3 узлов — замкнуть */
    if(hit.part==='p'&&CUD.si===hit.si&&st&&!st.dot&&!st.closed&&hit.ni===0&&st.nodes.length>=3){
      const before=cuSnapshot(),t0=cuTopoNow();snap();st.closed=true;const n0=st.nodes[0];
      if(!n0.a&&n0.b){const l=Math.hypot(n0.b.x-n0.x,n0.b.y-n0.y);const last=st.nodes[st.nodes.length-1];n0.a={x:n0.x-(n0.b.x-n0.x),y:n0.y-(n0.b.y-n0.y)};void l;void last;}
      CUD.si=-1;CUD.sel={si:hit.si,ni:0,part:'p'};cuBump();cuCheck(before,false,t0);cuDone();syncNodeInfo();schedule();return true;}
    /* нажатие на конец другого открытого штриха — продолжить его */
    if(hit.part==='p'&&st&&!st.dot&&cuIsEnd(st,hit.ni)&&CUD.si!==hit.si&&st.nodes.length>=2&&cuStroke()==null&&CUD.sel&&CUD.sel.si===hit.si&&CUD.sel.ni===hit.ni){
      snap();if(hit.ni===0)cuReverse(st);CUD.si=hit.si;CUD.sel={si:hit.si,ni:st.nodes.length-1,part:'p'};cuBump();syncNodeInfo();schedule();return true;}
    if(hit.part==='p'&&CUD.si>=0&&CUD.si!==hit.si){cuEndStroke();}
    CUD.sel=hit;CUD.xf=true;const nd=cuNode(hit),pos=hit.part==='p'?nd:(nd[hit.part]||nd);
    snap();
    CUD.drag=drag={kind:'cu',mode:'move',hit,off:[w[0]-pos.x,w[1]-pos.y],start:[pos.x,pos.y],sx,sy,moved:false,before:cuSnapshot(),t0:cuTopoNow(),fw:CUD.fw||null};
    syncNodeInfo();schedule();return true;}
  /* пустое место: новый узел */
  const [x,y]=cuSnapPt(w[0],w[1],e.altKey);
  const before=cuSnapshot();snap();
  const n=cuAddNode(x,y);
  if(!n){undoStack.pop();schedule();return true;}
  CUD.drag=drag={kind:'cu',mode:'new',node:n,si:CUD.si,sx,sy,moved:false,before,t0:null,fw:CUD.fw||null};
  cuBump();syncNodeInfo();schedule();return true;}
function cuMove(e){const [sx,sy]=pt(e);const M=skMap();
  if(CUXF&&CUXF.active){$('#stage').style.cursor=CUXF.move(e,sx,sy)||'';return;}
  const d=drag&&drag.kind==='cu'?drag:null;
  if(!d){const w=M.inv(sx,sy);CUD.hover=cuSnapPt(w[0],w[1],e.altKey);const h=cuHit(sx,sy),xc=cuGroupIdx().length?xfCu().move(e,sx,sy):'';$('#stage').style.cursor=xc||(h?'pointer':'crosshair');schedule();return;}
  if(!d.moved&&Math.hypot(sx-d.sx,sy-d.sy)<3)return;d.moved=true;
  const w=M.inv(sx,sy);
  if(d.mode==='new'){const n=d.node;let [tx,ty]=[w[0],w[1]];
    if(e.shiftKey)[tx,ty]=drAxisLock(tx,ty,n.x,n.y,true);
    const vx=tx-n.x,vy=ty-n.y,L=Math.hypot(vx,vy);
    if(L>6){const k=Math.min(1,CU.LIM.handle/L);n.type='smooth';n.b={x:n.x+vx*k,y:n.y+vy*k};n.a=d.si>=0&&cuStroke()&&cuStroke().nodes.length>1?{x:n.x-vx*k,y:n.y-vy*k}:null;}
    cuBump();syncNodeInfo();return;}
  let tx=w[0]-d.off[0],ty=w[1]-d.off[1];
  if(e.shiftKey)[tx,ty]=drAxisLock(tx,ty,d.start[0],d.start[1],false);
  if(d.hit.part==='p'&&!e.altKey){const q=cuSnapPt(tx,ty,false);tx=q[0];ty=q[1];}
  cuMoveTo(d.hit,tx,ty,e.altKey);cuBump();syncNodeInfo();}
function cuUp(e){if(CUXF&&CUXF.active){CUXF.up(e);return true;}
  const d=drag&&drag.kind==='cu'?drag:null;if(!d)return false;drag=null;CUD.drag=null;
  if(d.mode==='move'){if(!d.moved){undoStack.pop();schedule();return true;}
    cuCheck(d.before,true,d.t0);cuDone();syncNodeInfo();cuBump();return true;}
  /* новый узел: проверка корректности контура, шаг назад при ошибке */
  cuCheck(d.before,false,null);cuDone();syncNodeInfo();schedule();return true;}
function cuKey(e){
  const k=e.key,r=cuRec();
  if(CUXF&&CUXF.key(e))return true;
  if(k==='Enter'||k==='Escape'){e.preventDefault();if(cuStroke()){snap();cuEndStroke();cuBump();cuDone();}else if(k==='Escape')CUD.sel=null;syncNodeInfo();schedule();return true;}
  if(k==='n'||k==='N'||k==='т'||k==='Т'){e.preventDefault();cuNewStroke();return true;}
  if(k==='Delete'||k==='Backspace'){e.preventDefault();cuDeleteSel();return true;}
  const ar=drArrowStep(e);if(!ar)return false;const [dx,dy]=ar;
  e.preventDefault();const h=CUD.sel;if(!h||!r)return true;
  if(CUD.grp.length&&cuGroupIdx().length>1){xfCu().nudge(dx,dy);return true;}
  const nd=cuNode(h);if(!nd)return true;const pos=h.part==='p'?nd:(nd[h.part]||nd);
  const before=cuSnapshot(),t0=cuTopoNow();snap();cuMoveTo(h,pos.x+dx,pos.y+dy,false);cuBump();cuCheck(before,true,t0);cuDone();syncNodeInfo();return true;}
function cuNewStroke(){if(cuStroke()){snap();cuEndStroke();cuBump();cuDone();}CUD.si=-1;CUD.sel=null;CUD.xf=false;syncNodeInfo();schedule();toast('Новый штрих: следующий клик начнёт его');}
/* ---------- отрисовка ---------- */
function cuPaint(c){
  const r=cuRec();if(!r)return;const f=skMap().s,acc=css('--sel'),dragging=drag&&drag.kind==='cu';
  /* заливка знака: во время перетаскивания — быстрые контуры без объединения */
  let P;
  if(dragging&&cuInk(r)){const q=safeP(cur().p);const prev=SKX.FAST;SKX.FAST=true;let cs=[];try{cs=skelToContours(cuSkelOf(r,q,S.fontId),cuPen(S.fontId,q,r),q);}finally{SKX.FAST=prev;}P=pathOf(cs,f);}
  else{const U=getFinal(S.sel,S.style,{warp:false,slant:false,subdiv:false,rough:false});P=pathOf(U?U.cs:[],(x,y)=>toS(x,y));}
  drPaintGhost(c,P);
  c.save();c.lineCap='round';c.lineJoin='round';
  /* привязка: подсветить направляющую, к которой прилип курсор */
  if(CUD.hover&&!dragging)drPaintSnap(c,CUD.snapHit,acc);
  const gi=cuGroupIdx();
  r.skel.forEach((st,si)=>{const act=si===CUD.si,hl=act||gi.includes(si);
    if(st.dot){const q=f(st.x,st.y);c.setLineDash([3,3]);c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=1.2;c.beginPath();c.arc(q[0],q[1],Math.max(5,cuDotR(r,cur().p)*V.sc),0,7);c.stroke();c.setLineDash([]);return;}
    c.strokeStyle=hl?acc:'#000';c.lineWidth=hl?2.4:1.6;c.globalAlpha=hl?1:.78;c.stroke(skStrokePath(st,f));c.globalAlpha=1;
    const n=st.nodes.length,m=st.closed?n:n-1;
    if(!st.closed&&n>=2)for(const end of [0,1]){const cap=end?st.cap1:st.cap0,kind=skCapKind(cap||CU.CAP[S.fontId]||'F',cur().p);
      const [q,u0]=end?skDirAt(st,m-1,1,f):skDirAt(st,0,0,f);skCapMark(c,q,end?u0:[-u0[0],-u0[1]],kind,hl?acc:'rgba(0,0,0,.55)');}
    /* пунктир от последнего узла к курсору — куда пойдёт следующий отрезок */
    if(act&&CUD.hover&&!dragging&&!st.closed){const l=st.nodes[n-1],q=f(l.x,l.y),h=f(CUD.hover[0],CUD.hover[1]);
      c.strokeStyle=acc;c.globalAlpha=.5;c.setLineDash([4,4]);c.lineWidth=1.4;c.beginPath();c.moveTo(q[0],q[1]);c.lineTo(h[0],h[1]);c.stroke();c.setLineDash([]);c.globalAlpha=1;}
  });
  const sel=CUD.sel;
  r.skel.forEach((st,si)=>{if(st.dot){const q=f(st.x,st.y);skNodeMark(c,q,true,sel&&sel.si===si,acc,sel&&sel.si===si);return;}
    st.nodes.forEach((nd,ni)=>{const q=f(nd.x,nd.y),isSel=sel&&sel.si===si&&sel.ni===ni;
      if(isSel)for(const h of ['a','b']){const hd=nd[h];if(!hd||Math.hypot(hd.x-nd.x,hd.y-nd.y)<0.5)continue;
        drPaintHandle(c,q,f(hd.x,hd.y),sel.part===h,acc);}
      const first=ni===0&&si===CUD.si&&!st.closed&&st.nodes.length>=3;
      skNodeMark(c,q,nd.type!=='corner',isSel&&sel.part==='p',acc,isSel||first);});});
  c.restore();
  if(gi.length)xfCu().paint(c);else if(CUXF)CUXF.sync();
  if(!r.skel.length){c.fillStyle='rgba(0,0,0,.4)';c.font='500 13px "Onest",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
    const q=toS(CUD.fw/2,cur().p.capH*0.5);c.fillText('Кликните, чтобы поставить первый узел',q[0],q[1]);c.textAlign='left';}
}
const _dp_cu=drawPoints,_ds_cu=drawSmart,_hs_cu=hitSmart;
drawPoints=function(c,raw){if(cuDrawing())return cuPaint(c);return _dp_cu(c,raw);};
drawSmart=function(c){if(cuDrawing())return;return _ds_cu(c);};
hitSmart=function(sx,sy){if(cuDrawing())return null;return _hs_cu(sx,sy);};
/* ---------- подключение событий ---------- */
const _onDown_cu=onDown,_onMove_cu=onMove,_onUp_cu=onUp,_onDbl_cu=onDbl,_onKey_cu=onKey;
onDown=function(e){if(cuDrawing()&&e.button!==1&&e.button!==2){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul))&&cuDown(e))return;}return _onDown_cu(e);};
onMove=function(e){if(cuDrawing()){if(!drag||drag.kind==='cu'||drag.kind==='cu-view'){cuMove(e);return;}}return _onMove_cu(e);};
onUp=function(e){if(cuUp(e))return;return _onUp_cu(e);};
onDbl=function(e){if(cuDrawing()){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul)))return;}return _onDbl_cu(e);};
onKey=function(e){
  if(S.tab==='edit'&&cuDrawing()&&!(e.target.closest&&e.target.closest('input,textarea,select'))&&(e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='a'||e.key==='A'||e.key==='ф'||e.key==='Ф')){
    const r=cuRec();if(r&&r.skel.length&&CUD.si<0){e.preventDefault();CUD.xf=true;CUD.sel={si:r.skel.length-1,ni:0,part:'p'};CUD.grp=r.skel.map((_,i)=>i).slice(0,-1);syncNodeInfo();schedule();return;}}
  if(S.tab==='edit'&&cuDrawing()&&!(e.target.closest&&e.target.closest('input,textarea,select'))&&!(e.ctrlKey||e.metaKey)&&cuKey(e))return;return _onKey_cu(e);};
/* ---------- панель ---------- */
const _syncPanel_cu=syncPanel;
syncPanel=function(){if(S.mode==='draw'&&!cuOn())S.mode='points';_syncPanel_cu();cuMount();
  const b=$('[data-mode=draw]');if(b){b.hidden=!cuOn();b.classList.toggle('on',S.mode==='draw');}
  document.body.classList.toggle('cu-draw',cuDrawing());const sec=$('#cusec');if(sec)sec.hidden=!cuOn();
  syncNodeInfo();};
const _syncNode_cu=syncNodeInfo;
syncNodeInfo=function(){const box=$('#cup');
  if(!cuDrawing()){if(box)box.hidden=true;return _syncNode_cu();}
  $('#nbtns').hidden=true;$('#nbtns').style.visibility='hidden';const sk=$('#skp');if(sk)sk.hidden=true;
  if(!box)return;box.hidden=false;cuPanel();};
function cuMount(){
  const seg=$('[aria-label="Режим"]');
  if(seg&&!$('[data-mode=draw]')){const b=document.createElement('button');b.type='button';b.dataset.mode='draw';b.textContent='Рисовать';b.hidden=true;b.title='Рисование скелета знака: клик — угол, перетаскивание — плавный узел';
    b.addEventListener('click',()=>{if(!cuOn())return;S.mode='draw';S.node=null;cuEnter();syncPanel();schedule();});seg.appendChild(b);}
  const row=$('.nrow');
  if(row&&!$('#cup')){const d=document.createElement('div');d.id='cup';d.className='skp cup';d.hidden=true;
    d.innerHTML=`<div class="cur">
<span class="seg"><button type="button" id="cu-new" title="N">Новый штрих</button><button type="button" id="cu-end" title="Enter · двойной клик">Закончить</button></span>
<span class="seg" id="cu-type" role="group" aria-label="Тип узла"><button type="button" data-cut="smooth" title="Ручки на одной прямой">Гладкий</button><button type="button" data-cut="corner" title="Излом: ручки независимы">Угловой</button></span>
<span class="seg" id="cu-cap" role="group" aria-label="Окончание штриха"><button type="button" data-cuc="R" title="Круглое">Круглое</button><button type="button" data-cuc="F" title="Плоское, поперёк штриха">Плоское</button><button type="button" data-cuc="H" title="Срез по горизонтали">Срез ─</button><button type="button" data-cuc="V" title="Срез по вертикали">Срез │</button><button type="button" data-cuc="B">Капля</button><button type="button" data-cuc="X">Сужение</button></span>
<label class="skw" title="Нажим пера в узле"><span>Нажим</span><input type="range" id="cu-w" min="0" max="2" step="0.05" aria-label="Нажим в узле"><output id="cu-wo"></output></label>
<span class="skb"><button class="btn sm" id="cu-del" type="button" title="Del">Удалить узел</button><button class="btn sm pri" id="cu-done" type="button">Готово</button></span></div>
<div class="cu-st" id="cu-st"></div>`;
    row.appendChild(d);}
  const pan=$('.panel');
  if(pan&&!$('#cusec')){const q=paneEl('ed-cus','Свой знак','');q.id='cusec';q.hidden=true;
    q.querySelector('.pane-b').innerHTML=`<div class="cus"><div class="cur"><span class="seg" id="cu-k" role="group" aria-label="Высота"><button type="button" data-cuk="xh">Строчный</button><button type="button" data-cuk="cap">Прописной</button></span></div>
<div class="cur"><label class="skw"><span>Ширина</span><input type="number" id="cu-width" min="120" max="1500" step="10" aria-label="Ширина знака"></label><button class="btn sm" id="cu-wauto" type="button" title="Ширина по чернилам; поля считает система шрифта">Авто</button></div>
<div class="cur"><span class="seg" id="cu-pen" role="group" aria-label="Перо"><button type="button" data-cupen="font" title="Перо шрифта: толщина и контраст как у букв">Перо шрифта</button><button type="button" data-cupen="round" title="Круглое перо толщиной в ствол">Круглое</button></span></div>
<div class="cur"><label class="skw"><span>Толщина</span><input type="range" id="cu-sc" min="0.5" max="1.6" step="0.05" aria-label="Толщина пера"><output id="cu-sco"></output></label></div>
<div class="cur" id="cu-likew"><label class="skw" title="Кернинг по классам берётся как у этой буквы"><span>Кернинг как</span><input type="text" id="cu-like" maxlength="1" autocomplete="off" aria-label="Кернинг как у буквы"></label></div>
<div class="cur"><button class="btn sm" id="cu-fit" type="button" title="Сдвинуть к левому краю и подогнать ширину">Подогнать</button><button class="btn sm" id="cu-rm" type="button"></button></div></div>`;
    pan.insertBefore(q,pan.firstChild);paneInit(q,'ed-cus',true);}
  if($('#cup')&&$('#cusec')&&!cuMount.bound){cuMount.bound=1;cuBindPanel();}}
function cuPanel(){const r=cuRec();if(!r)return;
  const h=CUD.sel,st=h&&r.skel[h.si],nd=st&&cuNode(h);
  const dis=(sel,v)=>$$(sel).forEach(b=>{b.disabled=!!v;});
  const el=$('#ninfo');
  if(nd){const pos=h.part==='p'?nd:(nd[h.part]||nd);el.textContent='x '+Math.round(pos.x)+'  y '+Math.round(pos.y)+'   штрих '+(h.si+1)+(!st.dot&&cuIsEnd(st,h.ni)&&CUD.si!==h.si&&st.nodes.length>=2?'   · нажмите на конец ещё раз, чтобы продолжить штрих':'');}
  else el.textContent=r.skel.length?'штрихов '+r.skel.length+' · узлов '+cuCount(r):'';
  const end=!!(st&&!st.dot&&cuIsEnd(st,h.ni));
  $$('#cu-type button').forEach(b=>{b.classList.toggle('on',!!nd&&!st.dot&&!end&&(b.dataset.cut==='corner')===(nd.type==='corner'));b.disabled=!nd||st.dot||end;});
  $('#cu-type').hidden=end;$('#cu-cap').hidden=!end;
  if(end){const cap=h.ni===0?st.cap0:st.cap1,k=skCapKind(cap||CU.CAP[S.fontId]||'F',cur().p);$$('#cu-cap button').forEach(b=>b.classList.toggle('on',b.dataset.cuc===k));}
  const wi=$('#cu-w'),wv=nd&&!st.dot?(nd.w==null?1:nd.w):1;wi.disabled=!nd||!!st.dot;if(document.activeElement!==wi)wi.value=wv;$('#cu-wo').textContent=nd&&!st.dot?skWLabel(wv):'';
  dis('#cu-del',!nd);dis('#cu-end',!cuStroke());
  $$('#cu-k button').forEach(b=>b.classList.toggle('on',b.dataset.cuk===r.k));
  $$('#cu-pen button').forEach(b=>b.classList.toggle('on',b.dataset.cupen===r.pen.mode));
  const sc=$('#cu-sc');if(document.activeElement!==sc)sc.value=r.pen.sc;$('#cu-sco').textContent=Math.round(r.pen.sc*100)+'%';
  const wd=$('#cu-width');if(document.activeElement!==wd){const g=rawGlyph();wd.value=Math.round(r.w!=null?r.w:(g?g.weff:0));}
  $('#cu-wauto').classList.toggle('on',r.w==null);
  const lk=$('#cu-like');if(document.activeElement!==lk)lk.value=r.like||'';$('#cu-likew').hidden=cuOrig(cuCh());
  const orig=cuOrig(cuCh());$('#cu-rm').textContent=orig?'Вернуть знак':'Удалить знак';$('#cu-rm').title=orig?'Вернуть исходный знак шрифта':'Убрать знак из шрифта';
  cuStatSoon();}
/* состояние безопасности — чуть позже, чтобы не тормозить рисование */
function cuStatSoon(){clearTimeout(CUD.statT);CUD.statT=setTimeout(cuStat,260);}
function cuStat(){const el=$('#cu-st'),r=cuRec();if(!el||!r||!cuDrawing())return;
  if(!cuInk(r)){el.textContent='Пока пусто: первый клик ставит узел. Привязка — к направляющим и шагу (Alt — без привязки).';el.classList.remove('bad');return;}
  const s=cuSafety(S.fontId,r,cur().p),g=rawGlyph();
  const base='штрихов '+r.skel.length+' · узлов '+cuCount(r)+' · ширина '+Math.round(g?g.weff:0)+' · '+(s.sig[0]==='x'?'контур некорректен':'частей/просветов '+s.sig[0]);
  el.textContent=s.ok?base+' · форма устойчива от светлого до сверхжирного':base+' · в светлом и сверхжирном форма изменится ('+s.sig.slice(1).join(', ')+') — раздвиньте штрихи или упростите знак';
  el.classList.toggle('bad',!s.ok);}
function cuBindPanel(){
  const ed1=(fn,strict)=>{const r=cuRec();if(!r)return;const before=cuSnapshot(),t0=cuTopoNow();snap();fn(r);cuBump();if(!cuCheck(before,strict,t0)){syncPanel();return;}cuDone();syncPanel();};
  bind('#cu-new','click',cuNewStroke);
  bind('#cu-end','click',()=>{if(cuStroke()){snap();cuEndStroke();cuBump();cuDone();syncNodeInfo();schedule();}});
  bind('#cu-del','click',cuDeleteSel);
  $$('#cu-type button').forEach(b=>b.addEventListener('click',()=>{const h=CUD.sel;if(!h)return;ed1(()=>cuSetType(h,b.dataset.cut),true);}));
  $$('#cu-cap button').forEach(b=>b.addEventListener('click',()=>{const h=CUD.sel,r=cuRec();if(!h||!r)return;const st=r.skel[h.si];if(!st||st.dot)return;
    ed1(()=>{const k=h.ni===0?'cap0':'cap1';if(skCapKind(st[k]||CU.CAP[S.fontId]||'F',cur().p)===b.dataset.cuc&&st[k]){delete st[k];}else st[k]=b.dataset.cuc;},true);}));
  const wi=$('#cu-w');let wb=null,wt=null;
  wi.addEventListener('pointerdown',()=>{wb=cuSnapshot();wt=cuTopoNow();snap();});
  wi.addEventListener('input',()=>{const h=CUD.sel,r=cuRec();if(!h||!r)return;const n=cuNode(h);if(!n||n.dot)return;if(wt==null){wb=cuSnapshot();wt=cuTopoNow();snap();}
    const v=+wi.value;if(Math.abs(v-1)<1e-3)delete n.w;else n.w=v;$('#cu-wo').textContent=skWLabel(v);cuBump();});
  wi.addEventListener('change',()=>{if(wt!=null){cuCheck(wb,true,wt);wt=null;}cuDone();syncPanel();});
  $$('#cu-k button').forEach(b=>b.addEventListener('click',()=>{const r=cuRec();if(!r||r.k===b.dataset.cuk)return;ed1(()=>{r.k=b.dataset.cuk;cuInstall1(S.fontId,cuCh());},false);}));
  bind('#cu-width','change',()=>{const r=cuRec();if(!r)return;const v=+$('#cu-width').value;ed1(()=>{r.w=isFinite(v)&&v>=CU.LIM.wmin?Math.min(v,CU.LIM.wmax):null;},false);});
  bind('#cu-like','change',()=>{const r=cuRec();if(!r)return;const v=Array.from($('#cu-like').value.trim())[0]||'';ed1(()=>{if(v&&v.length===1&&GL[v]&&v!==cuCh())r.like=v;else delete r.like;},false);cuAfter();});
  bind('#cu-wauto','click',()=>ed1(r=>{r.w=null;},false));
  $$('#cu-pen button').forEach(b=>b.addEventListener('click',()=>{const r=cuRec();if(!r||r.pen.mode===b.dataset.cupen)return;ed1(()=>{r.pen.mode=b.dataset.cupen;},false);}));
  const sc=$('#cu-sc');let sb=null,st0=null;
  sc.addEventListener('pointerdown',()=>{sb=cuSnapshot();st0=cuTopoNow();snap();});
  sc.addEventListener('input',()=>{const r=cuRec();if(!r)return;if(st0==null){sb=cuSnapshot();st0=cuTopoNow();snap();}r.pen.sc=+sc.value;$('#cu-sco').textContent=Math.round(r.pen.sc*100)+'%';cuBump();});
  sc.addEventListener('change',()=>{if(st0!=null){cuCheck(sb,false,st0);st0=null;}cuDone();syncPanel();});
  bind('#cu-fit','click',()=>{const r=cuRec();if(!r||!cuInk(r))return;snap();cuFit(r,S.fontId,safeP(cur().p));cuBump();cuDone();syncPanel();});
  bind('#cu-rm','click',cuRemoveGlyph);
  bind('#cu-done','click',()=>{const r=cuRec();if(!r)return;if(cuStroke()){snap();cuEndStroke();cuBump();}
    if(!cuInk(r)){cuRemoveGlyph();return;}
    snap();cuFit(r,S.fontId,safeP(cur().p));S.mode='points';CUD.sel=null;CUD.si=-1;const ch=cuCh();if(!S.text.includes(ch)){S.text+='\n'+ch+ch+ch+' нн'+ch+'нн оо'+ch+'оо';const t=$('#txt');if(t)t.value=S.text;}cuBump();cuDone();syncPanel();toast('Знак «'+cuCh()+'» готов — он в шрифте, образце и экспорте');});
}
document.addEventListener('DOMContentLoaded',()=>{cuMount();syncPanel();});
