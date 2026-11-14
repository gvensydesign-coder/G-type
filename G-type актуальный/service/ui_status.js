/* ===== Состояние шрифта рядом с «Скачать» (m63) =====
   Короткая плашка по уже существующим проверкам: фоновая сверка (ui_autoproof: ошибки и замечания по знакам, пустые контуры),
   «двойники и похожие» (ui_c.js, DISTINCT: сходство по пикселям IoU > 0,92), нехватка букв для выбранных языков (core_lang_l1: langCover).
   Показываются: сверху меню «Скачать» (все пункты) и плашка слева от кнопки (самый важный пункт). «посмотреть» открывает «Проверку»
   с фильтром: S.proof.only (знаки), onlyBad, либо подсветка в «Полноте набора». Обновляется с задержкой после правок, ничего не считает
   во время перетаскивания. Языки для проверки — localStorage gtype-status-lang-v1 (по умолчанию русский), выбираются в настройках: «Языки».
   Цвета: ok → --ok, warn → --warn, ошибка → --danger (красный только для ошибок). Тексты: DESIGN_SYSTEM.md §10. */
const ST_LANG_KEY='gtype-status-lang-v1';
let ST_LANGS=['ru'];
try{const a=JSON.parse(localStorage.getItem(ST_LANG_KEY)||'null');if(Array.isArray(a)&&a.every(x=>typeof x==='string'&&LANG_BY_ID[x]))ST_LANGS=a;}catch(e){}
const ST={t:0,res:null,items:[],sig:'',conf:null,confSig:'',pick:0,menuSig:''};
const ST_IOU=0.92;/* как в «Проверке»: выше — знаки легко спутать */
const stPl=(n,f)=>n+' '+((n%10===1&&n%100!==11)?f[0]:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?f[1]:f[2]);
const stList=(a,max,sep)=>{sep=sep||' ';return a.length>max?a.slice(0,max).join(sep)+' и ещё '+(a.length-max):a.join(sep);};
/* «украинского», «английского»: у всех названий в базе языков окончание «-ский/-ий» */
const stAdj=n=>{const b=n.replace(/\s*[(/].*$/,'').trim().toLowerCase();return b.endsWith('ий')?b.slice(0,-2)+'ого':b;};

/* FX80 B04: латинская и кириллическая буква-двойник в одном списке подписываются, иначе «A A o o» выглядит как ошибка вывода */
const stLab=l=>l.map(c=>{const t=typeof TWINS!=='undefined'&&TWINS.find(p=>p.includes(c));
  return t&&l.includes(t[0]===c?t[1]:t[0])?c+(/[\u0400-\u04ff]/.test(c)?' (кир.)':' (лат.)'):c;});
/* ---------- проверки ---------- */
/* Похожие знаки: пары, которые легко спутать при чтении (цифры и буквы, I и l). Берётся не весь список DISTINCT из «Проверки»:
   И/Й и Ш/Щ у любого шрифта отличаются только надстрочным знаком или хвостом, и это нормально; здесь они только шумели бы.
   Критерий тот же, что в «Проверке»: сходство силуэтов по пикселям (IoU) выше 0,92. Результат кешируется по подписи стиля и правок этих знаков. */
const ST_PAIRS=[['З','3'],['О','0'],['Ч','4'],['Б','6'],['З','Э'],['I','l'],['l','1'],['I','1'],['S','5'],['B','8']];
function stConfusable(){
  const chars=[...new Set(ST_PAIRS.flat())];
  const sig=apHash(apStyleSig()+'|'+JSON.stringify(chars.map(c=>edGet(S.edits,c)||0)));
  if(ST.conf&&ST.confSig===sig)return ST.conf;
  const st=cur(),M={},get=ch=>M[ch]||(M[ch]=(()=>{const g=upright(ch,st,S.edits,true);return g&&g.cs&&g.cs.length?rast(g.cs):null;})());
  const out=[];
  for(const [x,y] of ST_PAIRS){
    const a=get(x),b=get(y);if(!a||!b)continue;
    const v=iou(a,b);if(v>ST_IOU)out.push({a:x,b:y,v});}
  ST.conf=out;ST.confSig=sig;return out;
}
function stMissing(){
  if(typeof langCover!=='function')return [];
  const cov=langCover(S.fontId),out=[];
  for(const id of ST_LANGS){
    const r=cov.find(x=>x.id===id);if(!r)continue;
    if(!r.missing.length&&!r.missPunct.length)continue;
    out.push(r);
  }
  return out;
}
function stDone(){
  /* фоновая сверка закончила работу над текущим состоянием: иначе «Готов» рано */
  if(typeof AP==='undefined')return true;
  if(AP.running)return false;
  for(const ch of CHARSET){if(isSpaceCh(ch)||isTyTilde(ch))continue;if(!AP.res.has(ch))return false;}
  return true;
}
/* список состояний: от самого важного к менее важному; lvl 2 — ошибка, 1 — предупреждение */
function stCompute(){
  const items=[];
  const empty=[],bad=[];
  if(typeof AP!=='undefined'&&AP.res)for(const ch of CHARSET){
    const r=AP.res.get(ch);if(!r)continue;
    if(r.issues.some(x=>x.t==='пустой контур'))empty.push(ch);
    else if(r.issues.some(x=>x.lvl===2))bad.push(ch);}
  if(empty.length)items.push({lvl:2,kind:'empty',chars:empty,
    text:(empty.length===1?'Пустая буква: ':'Пустые буквы: ')+stList(stLab(empty),6),full:'Пустые буквы ('+empty.length+'): '+stLab(empty).join(' ')});
  if(bad.length)items.push({lvl:2,kind:'issues',chars:bad,
    text:stPl(bad.length,['знак с ошибкой','знака с ошибками','знаков с ошибками'])+' в контуре: '+stList(stLab(bad),6),full:'Знаки с ошибками в контуре ('+bad.length+'): '+stLab(bad).join(' ')});
  const miss=stMissing();
  for(const r of miss){
    const ru=r.id==='ru',lets=r.missing,what=lets.length?'букв':'знаков',list=lets.length?lets:r.missPunct;
    items.push({lvl:ru&&CUR_FONT!=='imp'?2:1,kind:'cover',lang:r.id,chars:list,
      text:'Не хватает '+what+' для '+(ru?'русского':stAdj(r.name))+': '+stList(list,8),
      short:'Нет '+list.length+' '+((list.length%10===1&&list.length%100!==11)?(lets.length?'буквы':'знака'):(lets.length?'букв':'знаков'))+' для '+(ru?'русского':stAdj(r.name)),
      full:'Не хватает '+what+' для '+(ru?'русского':stAdj(r.name))+' ('+list.length+'): '+list.join(' ')});
  }
  const conf=stConfusable();
  if(conf.length){
    const nm=c=>/[0-9]/.test(c)?'цифра «'+c+'»':/[А-Яа-яЁё]/.test(c)?'буква «'+c+'»':(c===c.toLowerCase()?'строчная латинская «':'латинская «')+c+'»';
    const pr=conf.map(p=>nm(p.a)+' и '+nm(p.b));
    items.push({lvl:1,kind:'twins',chars:[...new Set(conf.flatMap(p=>[p.a,p.b]))],
      text:conf.length===1?'Могут путаться: '+pr[0]:'Могут путаться '+stPl(conf.length,['пара','пары','пар'])+': '+stList(pr,3,', ')});
  }
  const warn=typeof _apItems!=='undefined'&&_apItems?_apItems.filter(g=>g.lvl<2):[];
  if(warn.length){
    const chars=[...new Set(warn.map(g=>g.ch))];
    items.push({lvl:1,kind:'issues',chars,
      text:stPl(warn.length,['знак требует','знака требуют','знаков требуют'])+' внимания'});
  }
  return items;
}
function stRun(){
  clearTimeout(ST.t);
  if(S.live||(typeof drag!=='undefined'&&drag)||performance.now()-lastBump<400){ST.t=setTimeout(stRun,300);return;}
  if(!stDone()){
    ST.res='wait';ST.items=[];stPaint();
    ST.t=setTimeout(stRun,500);return;
  }
  let items=[];try{items=stCompute();}catch(e){console.error(e);}
  ST.items=items;ST.res=items.length?(items.some(i=>i.lvl===2)?'bad':'warn'):'ok';
  stPaint();
}
const stSoon=ms=>{clearTimeout(ST.t);ST.t=setTimeout(stRun,ms==null?600:ms);};

/* ---------- переход в «Проверку» ---------- */
function stJump(it){
  if(!it)return;
  const P=S.proof;
  P.grp='all';P.onlyBad=false;P.only=null;P.focus=it.kind;P.hl=null;
  if(it.kind==='twins'||it.kind==='empty'){P.only=it.chars.slice();}
  else if(it.kind==='issues'){
    P.onlyBad=it.chars.length>0;P.only=it.chars.slice();}
  else if(it.kind==='cover'){P.hl=it.chars.slice();}
  const pb=document.getElementById('pbad');if(pb)pb.checked=P.onlyBad;
  document.querySelectorAll('[data-pg]').forEach(b=>b.classList.toggle('on',b.dataset.pg==='all'));
  if(S.tab==='proof'){renderCover();renderProof();}else setTab('proof');
}
/* после отрисовки «Проверки»: полоса фильтра, прокрутка и подсветка */
function stProofSync(){
  if(S.tab!=='proof')return;
  const P=S.proof;
  let bar=document.getElementById('pfilt');
  if(!bar){
    bar=document.createElement('div');bar.id='pfilt';bar.className='pfilt';bar.setAttribute('role','status');
    const sum=document.getElementById('psum');if(sum&&sum.parentNode)sum.parentNode.insertBefore(bar,sum);
  }
  const on=!!(P.only&&P.only.length);
  bar.hidden=!on;bar.textContent='';
  if(on){
    const t=document.createElement('span');t.textContent='Показаны только знаки из плашки состояния: '+P.only.join(' ');
    const x=document.createElement('button');x.type='button';x.className='chip';x.id='pfilt-x';x.textContent='Показать все';
    x.addEventListener('click',()=>{P.only=null;P.onlyBad=false;const pb=document.getElementById('pbad');if(pb)pb.checked=false;renderProof();});
    bar.appendChild(t);bar.appendChild(x);plFit(bar,'span');
  }
  if(P.hl&&P.hl.length)document.querySelectorAll('#cover .cvb span').forEach(sp=>sp.classList.toggle('hl',P.hl.indexOf(sp.textContent)>=0));
  else document.querySelectorAll('#cover .cvb span.hl').forEach(sp=>sp.classList.remove('hl'));
  const f=P.focus;P.focus=null;
  if(!f)return;
  const target=f==='twins'?document.querySelector('#twins .tw.bad')||document.getElementById('twins')
    :f==='cover'?document.querySelector('#cover .cvb span.hl')||document.getElementById('cover')
    :document.getElementById('pgrid');
  if(target){try{target.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){target.scrollIntoView();}
    target.classList.add('st-flash');setTimeout(()=>target.classList.remove('st-flash'),1800);}
}
(function(){const f=renderProof;renderProof=function(){const r=f.apply(this,arguments);try{stProofSync();}catch(e){console.error(e);}return r;};})();

/* ---------- плашка и блок в меню ---------- */
const ST_HEAD={ok:'Шрифт готов к скачиванию',wait:'Проверяем шрифт…'};
function stEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function stBuild(){
  const xw=document.getElementById('xwrap'),btn=document.getElementById('ex-menu');
  if(xw&&btn&&!document.getElementById('st-plaque')){
    const p=document.createElement('div');p.id='st-plaque';p.className='stpl';p.dataset.lvl='wait';p.setAttribute('role','status');
    p.innerHTML='<i class="st-dot" aria-hidden="true"></i><span class="st-t"></span><span class="st-d" aria-hidden="true"> — </span><button type="button" class="st-go">посмотреть</button>';
    p.querySelector('.st-go').addEventListener('click',()=>stJump(ST.items[0]));
    const tt=p.querySelector('.st-t'),op=e=>{if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;if(!tt.hasAttribute('role'))return;e.preventDefault();stPop(p);};
    tt.addEventListener('click',op);tt.addEventListener('keydown',op);
    xw.insertBefore(p,btn);
  }
  const m=document.getElementById('ex-list');
  if(m&&!document.getElementById('xm-st')){
    const b=document.createElement('div');b.id='xm-st';b.className='xm-st';b.setAttribute('role','group');b.setAttribute('aria-label','Состояние шрифта');
    m.insertBefore(b,m.firstChild);
    b.addEventListener('click',e=>{
      const g=e.target.closest('.st-go');if(!g)return;
      e.stopPropagation();const it=ST.items[+g.dataset.i];
      if(typeof exOpen==='function')exOpen(false);
      stJump(it);});
  }
}
function stPopClose(){const o=document.getElementById('st-pop');if(o)o.remove();}
function stPop(p){
  if(document.getElementById('st-pop')){stPopClose();return;}
  const o=document.createElement('div');o.id='st-pop';o.className='st-pop';o.setAttribute('role','dialog');o.setAttribute('aria-label','Что не так со шрифтом');
  const it=ST.items.filter(i=>i.full||i.text).slice(0,5);
  o.innerHTML=it.map(i=>'<p>'+stEsc(i.full||i.text)+'</p>').join('')+'<button type="button" class="st-go">Открыть в проверке</button>';
  document.body.appendChild(o);
  const r=p.getBoundingClientRect(),w=Math.min(o.offsetWidth,innerWidth-16);
  o.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';o.style.top=(r.bottom+6)+'px';
  o.querySelector('.st-go').addEventListener('click',()=>{stPopClose();stJump(ST.items[0]);});
  const off=e=>{if(!o.contains(e.target)&&!p.contains(e.target)){stPopClose();document.removeEventListener('pointerdown',off,true);}};
  document.addEventListener('pointerdown',off,true);
  document.addEventListener('keydown',function k(e){if(e.key==='Escape'){stPopClose();document.removeEventListener('keydown',k,true);}},true);}
function stPaint(){
  stBuild();
  const lvl=ST.res||'wait',top=ST.items[0];
  const lv=lvl==='bad'?'bad':lvl==='warn'?'warn':lvl==='ok'?'ok':'wait';
  const p=document.getElementById('st-plaque');
  const head=top?top.text:ST_HEAD[lv==='wait'?'wait':'ok'];
  if(p){
    p.dataset.lvl=lv;
    /* FX80 C07: на плашке — короткая фраза с числом, полный список букв открывается по щелчку на тексте */
    const tt=p.querySelector('.st-t'),more0=top&&top.full;
    tt.textContent=top&&top.short&&top.chars&&top.chars.length>6?top.short:head;
    if(more0){tt.setAttribute('role','button');tt.tabIndex=0;tt.setAttribute('aria-haspopup','dialog');tt.title='Показать полный список';}
    else{tt.removeAttribute('role');tt.removeAttribute('tabindex');tt.removeAttribute('aria-haspopup');tt.removeAttribute('title');}
    const g=p.querySelector('.st-go'),d=p.querySelector('.st-d');
    g.hidden=d.hidden=!top;
    const more=ST.items.length>1?' Ещё замечаний: '+(ST.items.length-1)+'.':'';
    p.title=top?head+'.'+more+' Откройте «Скачать шрифт», чтобы увидеть все.':head;
  }
  const b=document.getElementById('xm-st');
  if(b){
    const sig=lv+'|'+ST.items.map(i=>i.lvl+i.text).join('~');
    if(sig!==ST.menuSig){
      ST.menuSig=sig;
      if(!ST.items.length)b.innerHTML='<div class="xm-r" data-lvl="'+lv+'"><i class="st-dot" aria-hidden="true"></i><span class="st-t">'+stEsc(head)+'</span></div>';
      else b.innerHTML=ST.items.slice(0,4).map((it,i)=>'<div class="xm-r" data-lvl="'+(it.lvl===2?'bad':'warn')+'"><i class="st-dot" aria-hidden="true"></i><span class="st-t">'+stEsc(it.text)+'</span><button type="button" class="st-go" data-i="'+i+'">посмотреть</button></div>').join('')
        +(ST.items.length>4?'<div class="xm-more">Ещё замечаний: '+(ST.items.length-4)+'. Откройте «Проверку»</div>':'');
    }
  }
}

/* ---------- выбор языков для проверки: настройки → «Языки» ---------- */
function stLangSet(id,on){
  const s=new Set(ST_LANGS);if(on)s.add(id);else s.delete(id);
  ST_LANGS=LANG_DB.map(l=>l.id).filter(x=>s.has(x));
  try{localStorage.setItem(ST_LANG_KEY,JSON.stringify(ST_LANGS));}catch(e){}
  stSoon(60);
}
function stLangBlock(){
  const box=document.querySelector('#ps-lang .lg-body');if(!box||box.querySelector('.st-langs'))return;
  const w=document.createElement('div');w.className='st-langs';
  w.innerHTML='<p class="lg-row"><b>Проверять для языков</b></p><p class="xp-t">Плашка рядом с «Скачать шрифт» подскажет, каких букв не хватает для этих языков.</p><div class="lf-chips"></div>';
  const chips=w.querySelector('.lf-chips');
  LANG_DB.forEach(L=>{
    const b=document.createElement('button');b.type='button';b.className='lf-chip';b.dataset.lang=L.id;
    b.setAttribute('aria-pressed',ST_LANGS.includes(L.id)?'true':'false');b.textContent=L.name.replace(/\s*[(/].*$/,'');
    b.addEventListener('click',()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on?'true':'false');stLangSet(L.id,on);});
    chips.appendChild(b);});
  box.appendChild(w);
}
(function(){const f=edLangFill;edLangFill=function(){const r=f.apply(this,arguments);try{stLangBlock();}catch(e){console.error(e);}return r;};})();

/* ---------- подключение ---------- */
(function(){
  const _b=bump;bump=function(){const r=_b.apply(this,arguments);stSoon(700);return r;};
  const _p=apPaint;apPaint=function(){const r=_p.apply(this,arguments);stSoon(450);return r;};
  const _sf=switchFont;switchFont=function(){const r=_sf.apply(this,arguments);ST.res='wait';stSoon(300);return r;};
})();
document.addEventListener('DOMContentLoaded',()=>{
  try{stBuild();stPaint();}catch(e){console.error(e);}
  const m=document.getElementById('ex-list');
  const eb=document.getElementById('ex-menu'),rd=document.getElementById('rail-dl');
  const sync=()=>{try{stBuild();stPaint();}catch(e){}};
  if(eb)eb.addEventListener('click',sync,true);if(rd)rd.addEventListener('click',sync,true);
  setTimeout(()=>stSoon(100),1200);
});

/* ===== Экспорт: файл совпадает с тем, что выбрано в интерфейсе =====
   1) «Сцепка»: режим сцепок zlig (0 обычные · 1 все · 2 выкл) раньше менял только образец, а в файл всегда шли calt и ss02. Теперь режим — состояние по
      умолчанию: «выкл» — без calt и ss02; «все» — ss02 включена по умолчанию (lookups ss02 входят в calt); «обычные» — как было.
   2) Name ID 0 (авторское право): «© 2026 Имя · G-type», если включена подпись автора в профиле; иначе «© G-type» (у Строки остаётся её паспортный текст).
   3) В меню «Скачать» одна строка называет эти решения. */
(function(){
  if(typeof otFeaturesO1==='function'){const _o=otFeaturesO1;
    otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
      const r=_o.apply(this,arguments);
      const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='stsepka'||!st||!st.p)return r;
      let mode=0;try{mode=Math.round(+safeP(st.p).zlig)||0;}catch(e){}
      const at=t=>feats.findIndex(f=>f.tag===t);
      if(mode>=2){for(const t of ['calt','ss02']){let i;while((i=at(t))>=0)feats.splice(i,1);}}
      else if(mode===1){const s2=at('ss02'),c=at('calt');
        if(s2>=0){const L2=feats[s2].lookups.slice();if(c>=0)feats[c].lookups=L2.concat(feats[c].lookups.filter(x=>!L2.includes(x)));else feats.push({tag:'calt',lookups:L2});}}
      return r;};}
  const nameParse=b=>{const a=Array.from(b),u16=o=>(a[o]<<8)|a[o+1],n=u16(2),so=u16(4),recs=[];
    for(let i=0;i<n;i++){const o=6+i*12,len=u16(o+8),off=u16(o+10);recs.push({p:u16(o),e:u16(o+2),l:u16(o+4),id:u16(o+6),s:a.slice(so+off,so+off+len)});}
    return recs;};
  const nameBuild=recs=>{recs.sort((x,y)=>x.p-y.p||x.e-y.e||x.l-y.l||x.id-y.id);
    const out=[0,0,recs.length>>8,recs.length&255],so=6+recs.length*12;out.push(so>>8,so&255);
    const store=[];const w=v=>out.push(v>>8,v&255);
    recs.forEach(r=>{w(r.p);w(r.e);w(r.l);w(r.id);w(r.s.length);w(store.length);store.push(...r.s);});
    return out.concat(store);};
  const copyright=()=>{const a=window.GT_AUTHOR;return a&&a.name?'© '+new Date().getFullYear()+' '+String(a.name).slice(0,60)+' · G-type':'© G-type';};
  if(typeof metaNameTable==='function'){const _mn=metaNameTable;
    metaNameTable=function(ctx,m){const b=_mn.apply(this,arguments);
      try{const recs=nameParse(b),signed=!!(window.GT_AUTHOR&&window.GT_AUTHOR.name),has=recs.find(r=>r.p===3&&r.l===0x409&&r.id===0);
        if(has&&!signed)return b;
        const s=utf16(copyright());if(has)has.s=s;else recs.push({p:3,e:1,l:0x409,id:0,s});
        return nameBuild(recs);}catch(e){return b;}};}
  /* строка в меню «Скачать» */
  const note=()=>{const m=document.getElementById('ex-list');if(!m)return;let n=document.getElementById('xm-note');
    if(!n){n=document.createElement('div');n.id='xm-note';n.className='xm-note';const st=document.getElementById('xm-st');if(st&&st.nextSibling)m.insertBefore(n,st.nextSibling);else m.insertBefore(n,m.firstChild);}
    const lines=[];
    if(CUR_FONT==='stsepka'){let mode=0;try{mode=Math.round(+safeP(cur().p).zlig)||0;}catch(e){}
      lines.push('Сцепки в файле: '+(mode>=2?'выключены — подстановок calt и ss02 нет':mode===1?'все — включены по умолчанию (ss02 внутри calt)':'обычные — calt включена, «все» доступны как ss02')+'.');}
    lines.push('Авторское право в файле: '+copyright()+'.');
    n.textContent=lines.join(' ');n.hidden=!lines.length;};
  document.addEventListener('DOMContentLoaded',()=>{const eb=document.getElementById('ex-menu'),rd=document.getElementById('rail-dl');
    const f=()=>{try{note();}catch(e){}};if(eb)eb.addEventListener('click',f,true);if(rd)rd.addEventListener('click',f,true);});
})();
