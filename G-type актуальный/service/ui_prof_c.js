/* ===== ПРОФИЛЬ m43, часть C: «Визитка автора» (PNG 1080×1350 на холсте) и «Резервная копия» (JSON: профиль, картинки, правки шрифтов, свой шрифт, рисунок) =====
   Файлы сохраняет общий помощник saveFile (ui_c.js). Восстановление проверяет файл и просит подтверждение на месте, без системных окон. */
(function(){
'use strict';
const PF=window.PROF,esc=PF.esc,ic=PF.ic,$1=PF.$1,$A=PF.$A;
const mo=()=>window.MO||{off:()=>true,D:()=>0,E:()=>'ease'};
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const DRK='gtype-draw-n7',TAU=Math.PI*2;

/* ---------- визитка ---------- */
function palette(th){
  const k=th==='dark'?'--vz-d-':'--vz-l-',g=n=>tok(k+n);
  return {bg:g('bg'),ink:g('ink'),t2:g('t2'),card:g('card'),sheet:g('sheet'),o1:g('o1'),o2:g('o2'),m1:g('m1'),m2:g('m2'),m3:g('m3'),logo:g('logo'),logoInk:g('logoink'),chip:g('chip'),line:g('line'),ghost:g('ghost'),shadow:g('shadow'),dark:th==='dark'};
}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function wrap(c,t,maxW){const words=String(t).split(' '),lines=[];let cur='';words.forEach(w=>{const test=cur?cur+' '+w:w;if(c.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}else cur=test;});if(cur)lines.push(cur);return lines;}
function loadImg(src){return new Promise(res=>{if(!src)return res(null);const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src;});}
/* строка настоящим шрифтом библиотеки: capPx — высота прописной, align: 'l' | 'c' */
function fontRun(c,key,text,x,base,capPx,maxW,align){
  const id=key==='imp'?'imp':key.indexOf('lib:')===0?key.slice(4):key;
  if(!FONTS[id])return false;
  useFont(id);const run=libRun(id,text);if(!run.items.length)return false;
  let sc=capPx/run.cap;if(maxW&&run.tot*sc>maxW)sc=maxW/run.tot;
  const ox=align==='c'?x-run.tot*sc/2:x;
  for(const it of run.items)c.fill(pathOf(it[0].cs,(px,py)=>[ox+it[1]*sc+px*sc,base-py*sc]),'nonzero');
  return true;
}
async function drawCard(cv,th,p){
  const W=1080,H=1350,P=palette(th),FU=tok('--f-ui');
  try{await Promise.all(['800 48px','600 34px','500 30px','400 38px','700 32px'].map(f=>document.fonts.load(f+' Onest','Аа Тихий дом')));}catch(e){}
  cv.width=W;cv.height=H;const c=cv.getContext('2d'),back=S.fontId;
  const cover=await loadImg(p.cover),av=await loadImg(p.avatar);
  try{
    c.fillStyle=P.bg;c.fillRect(0,0,W,H);
    const o=document.createElement('canvas');o.width=W;o.height=720;const g=o.getContext('2d');
    if(cover){const s=Math.max(W/cover.naturalWidth,720/cover.naturalHeight);g.drawImage(cover,(W-cover.naturalWidth*s)/2,0,cover.naturalWidth*s,cover.naturalHeight*s);if(P.dark){g.fillStyle=P.shadow;g.fillRect(0,0,W,720);}}
    else{
      const lg=g.createLinearGradient(0,0,0,720);lg.addColorStop(0,P.o1);lg.addColorStop(.62,P.o2);g.fillStyle=lg;g.fillRect(0,0,W,720);
      [[100,60,520,P.m1,.75],[640,40,520,P.m2,.75],[900,260,360,P.m3,.9]].forEach(b=>{const r=g.createRadialGradient(b[0],b[1],0,b[0],b[1],b[2]);r.addColorStop(0,b[3]);r.addColorStop(1,P.o2);g.globalAlpha=b[4];g.fillStyle=r;g.fillRect(0,0,W,720);});
      g.globalAlpha=1;g.fillStyle=P.ghost;fontRun(g,'renessa','Аа',300,430,330,0,'l');
    }
    /* нижний край растворяется в фон: маска по альфе — сверху непрозрачно до 420, дальше ступенями до нуля */
    const mk=document.createElement('canvas');mk.width=W;mk.height=720;const mg=mk.getContext('2d');
    mg.fillStyle=tok('--vz-white');mg.fillRect(0,0,W,420);
    for(let i=0;i<60;i++){mg.globalAlpha=1-(i+.5)/60;mg.fillRect(0,420+i*5,W,5);}
    g.globalCompositeOperation='destination-in';g.drawImage(mk,0,0);g.globalCompositeOperation='source-over';
    c.drawImage(o,0,0);
    /* логотип и подпись */
    c.fillStyle=P.logo;c.beginPath();c.arc(128,128,40,0,TAU);c.fill();
    c.fillStyle=P.logoInk;c.font='800 44px '+FU;c.textAlign='center';c.textBaseline='middle';c.fillText('G',126,130);
    c.fillStyle=P.m1;c.beginPath();c.arc(150,150,5.5,0,TAU);c.fill();
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle=P.ink;c.globalAlpha=.8;c.font='500 30px '+FU;c.fillText('визитка автора',188,138);c.globalAlpha=1;
    /* фото */
    const AX=88,AY=232,AR=108;
    c.fillStyle=P.bg;c.beginPath();c.arc(AX+AR,AY+AR,AR+12,0,TAU);c.fill();
    if(av){c.save();c.beginPath();c.arc(AX+AR,AY+AR,AR,0,TAU);c.clip();c.drawImage(av,AX,AY,2*AR,2*AR);c.restore();}
    else{
      const ag=c.createLinearGradient(AX,AY,AX+2*AR,AY+2*AR);ag.addColorStop(0,tok('--vz-av1'));ag.addColorStop(1,tok('--vz-av2'));c.fillStyle=ag;c.beginPath();c.arc(AX+AR,AY+AR,AR,0,TAU);c.fill();
      c.fillStyle=tok('--vz-white');c.font='800 80px '+FU;c.textAlign='center';c.textBaseline='middle';
      c.fillText(((p.first||'').charAt(0)+(p.last||'').charAt(0)).toUpperCase()||'G',AX+AR,AY+AR+4);c.textAlign='left';c.textBaseline='alphabetic';
    }
    /* имя и описание */
    c.fillStyle=P.ink;c.font='800 96px '+FU;try{c.letterSpacing='-4px';}catch(e){}
    const nm=p.name||'Автор';let fs=96;while(c.measureText(nm).width>904&&fs>48){fs-=4;c.font='800 '+fs+'px '+FU;}
    c.fillText(nm,88,590);try{c.letterSpacing='0px';}catch(e){}
    c.font='400 38px '+FU;c.fillStyle=P.ink;
    wrap(c,p.bio||'',904).slice(0,3).forEach((l,i)=>c.fillText(l,88,660+i*52));
    /* закреплённые: до трёх на визитке */
    const pins=p.fonts.filter(f=>f.pin>0&&f.vis==='pub'&&f.st==='ready').sort((a,b)=>a.pin-b.pin).slice(0,3),tw=(1080-176-48)/3,ty=808;
    if(!pins.length){c.fillStyle=P.t2;c.font='400 30px '+FU;c.fillText('Закреплённые шрифты появятся здесь',88,ty+60);}
    pins.forEach((f,i)=>{
      const x=88+i*(tw+24);
      c.save();c.shadowColor=P.shadow;c.shadowBlur=24;c.shadowOffsetY=6;c.fillStyle=P.card;rr(c,x,ty,tw,326,44);c.fill();c.restore();
      c.fillStyle=P.sheet;rr(c,x+20,ty+20,tw-40,184,32);c.fill();
      c.fillStyle=css('--glyph');
      if(!fontRun(c,f.key,f.smp,x+tw/2,ty+20+92+36,72,tw-40-48,'c')){c.font='600 48px '+FU;c.textAlign='center';c.fillText(f.smp,x+tw/2,ty+20+110);c.textAlign='left';}
      c.fillStyle=P.ink;c.font='700 32px '+FU;c.fillText(f.name.length>16?f.name.slice(0,15)+'…':f.name,x+32,ty+20+184+52);
      c.fillStyle=P.t2;c.font='400 24px '+FU;c.fillText(f.meta,x+32,ty+20+184+90);
    });
  }finally{try{if(FONTS[back])useFont(back);}catch(e){}}
  cv.dataset.ready='1';
}
PF.drawCard=drawCard;
function openCard(){
  if(PF.guest)return;
  const p=PF.snapshot(true);let th=document.documentElement.dataset.theme==='dark'?'dark':'light',busy=false;
  const L=PF.modal('<div class="mh"><h2>Визитка автора</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div>'+
    '<div class="pf-cardprev"><canvas aria-label="Предпросмотр визитки"></canvas><div class="copts"><p class="lead">Картинка для соцсетей и портфолио: фото, имя, описание, закреплённые шрифты и ссылка на профиль.</p>'+
    '<div><div class="lb">Оформление</div><div class="seg" role="group" aria-label="Тема визитки"><button type="button" data-th="light" class="'+(th==='light'?'on':'')+'" aria-pressed="'+(th==='light')+'">Светлая</button><button type="button" data-th="dark" class="'+(th==='dark'?'on':'')+'" aria-pressed="'+(th==='dark')+'">Тёмная</button></div></div>'+
    '<div class="pf-fb2" hidden><img alt="Визитка автора"><span class="hint">Если загрузка не началась: нажмите и удерживайте картинку, чтобы сохранить.</span></div>'+
    '<div class="hint">PNG · 1080 × 1350 пикселей</div><div class="pf-mf"><button class="btn lg" type="button" data-x>Закрыть</button><button class="btn pri lg" type="button" data-dl>'+ic('download')+'Скачать PNG</button></div></div></div>',{cls:'wide',label:'Визитка автора',focus:'[data-dl]'});
  const el=L.el,cv=$1('canvas',el);
  const paint=()=>{cv.dataset.ready='';return drawCard(cv,th,p);};
  paint();
  el.addEventListener('click',e=>{const t=e.target.closest('[data-th]');if(!t)return;th=t.dataset.th;$A('[data-th]',el).forEach(b=>{const on=b===t;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});paint();});
  $1('[data-dl]',el).addEventListener('click',async()=>{
    if(busy)return;busy=true;
    try{
      await paint();
      const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
      if(!blob)throw new Error('png');
      const buf=new Uint8Array(await blob.arrayBuffer()),ok=await saveFile('gtype-vizitka-'+p.slug+'.png',buf,'image/png');
      if(ok===false){const fb=$1('.pf-fb2',el);$1('img',fb).src=cv.toDataURL('image/png');fb.hidden=false;}
    }catch(e){toast('Не удалось собрать картинку. Попробуйте ещё раз');}
    busy=false;
  });
}
PF.openCard=openCard;

/* ---------- резервная копия ---------- */
function buildBackup(){
  const M=PF.meta(),prj=PF.projects();stash();
  const fonts={};
  prj.forEach(f=>{if(f.key.indexOf('lib:')===0){const sl=S.lib[f.key.slice(4)];if(sl)fonts[f.key]={styles:sl.styles,edits:sl.edits,family:sl.family,kd:sl.kd};}});
  let raw=null;try{raw=localStorage.getItem(DRK);}catch(e){}
  return {app:'g-type',kind:'profile-backup',version:1,saved:new Date().toISOString(),
    profile:{first:M.first,last:M.last,bio:M.bio,sign:M.sign,links:M.links,fview:M.fview,avThumb:M.avThumb,proj:M.proj,pins:M.pins,order:M.order,nameFont:M.nameFont,acc:M.acc,defLic:M.defLic,lic:M.lic,colls:M.colls},
    images:{avatar:PF.img.avatar,cover:PF.img.cover,avsrc:PF.img.avsrc},
    fonts,imp:(typeof impPack==='function'?impPack():null)||null,draw:raw};
}
PF.buildBackup=buildBackup;
/* проверка файла: возвращает нормализованную копию или бросает понятную ошибку */
function checkBackup(txt){
  if(txt.length>60*1024*1024)throw new Error('Файл больше 60 МБ, копию из него не восстановить. Выберите другую копию');
  let o;try{o=JSON.parse(txt);}catch(e){throw new Error('Не удалось прочитать файл: он не в формате JSON. Выберите копию, скачанную из G-type');}
  if(!o||typeof o!=='object'||o.app!=='g-type'||o.kind!=='profile-backup')throw new Error('В файле нет резервной копии G-type. Выберите файл, скачанный кнопкой «Скачать .json»');
  if(o.version!==1)throw new Error('Копия сделана в другой версии G-type и здесь не откроется. Сохраните новую копию');
  if(!o.profile||typeof o.profile!=='object'||Array.isArray(o.profile))throw new Error('В копии нет данных профиля');
  const img=o.images&&typeof o.images==='object'?o.images:{},ok=v=>typeof v==='string'&&PF.IMGRE.test(v)?v:'';
  const fonts={};
  if(o.fonts&&typeof o.fonts==='object'){
    for(const k of Object.keys(o.fonts)){
      if(!/^lib:[A-Za-z0-9_-]+$/.test(k)||!FONTS[k.slice(4)]||k==='lib:imp')continue;
      const f=o.fonts[k];if(f&&typeof f==='object'&&f.styles&&typeof f.styles==='object')fonts[k.slice(4)]=f;
    }
  }
  let imp=null;if(o.imp&&typeof o.imp==='object'&&o.imp.g&&typeof o.imp.g==='object')imp=o.imp;
  let draw=null;
  if(typeof o.draw==='string'&&o.draw.length<30*1024*1024){try{const d=JSON.parse(o.draw);if(d&&d.v===1&&typeof d.g==='object')draw=o.draw;}catch(e){}}
  return {profile:PF.norm(o.profile),images:{avatar:ok(img.avatar),cover:ok(img.cover),avsrc:ok(img.avsrc)},fonts,imp,draw,saved:typeof o.saved==='string'?o.saved:''};
}
PF.checkBackup=checkBackup;
function applyBackup(b){
  /* шрифты: тот же путь, что у «Открыть проект» (проверка и нормализация внутри applyProject) */
  const pr={app:'volt',v:3,font:S.fontId,fonts:b.fonts,text:S.text};if(b.imp)pr.imp=b.imp;
  snap();applyProject(pr);
  if(b.draw){try{localStorage.setItem(DRK,b.draw);}catch(e){}if(window.GT_DRAW&&GT_DRAW.reload)GT_DRAW.reload();}
  PF.setMeta(Object.assign({},b.profile,{v:1}));
  PF.imgPut('avatar',b.images.avatar);PF.imgPut('cover',b.images.cover);PF.imgPut('avsrc',b.images.avsrc);
  try{S.view={zoom:1,px:0,py:0};buildGlyphList();buildPanel();buildMethods();syncPanel();syncLibrary();bump();drawLibrary();}catch(e){console.error(e);}
  PALL=true;persist();
}
PF.applyBackup=applyBackup;
let impEl=null;
function impInput(){
  if(impEl)return impEl;
  impEl=document.createElement('input');impEl.type='file';impEl.accept='.json,application/json';impEl.id='pf-imp';impEl.className='pf-sr';impEl.tabIndex=-1;impEl.setAttribute('aria-hidden','true');
  document.body.appendChild(impEl);return impEl;
}
function openBackup(){
  if(PF.guest)return;
  const prj=PF.projects(),nl=prj.length;
  const L=PF.modal('<div class="mh"><h2>Резервная копия</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div>'+
    '<div class="pf-bk"><p class="lead">Профиль, картинки, ваши шрифты одним файлом .json. Копию можно восстановить на другом устройстве.</p>'+
    '<div class="sum"><b>'+esc(PF.fullName()||'Профиль без имени')+'</b><span>'+nl+' '+PF.plural(nl,'шрифт','шрифта','шрифтов')+' и черновиков в копии</span></div>'+
    '<div class="pf-bkx" aria-live="polite"></div></div>'+
    '<div class="pf-mf"><button class="btn lg" type="button" data-restore>'+ic('upload')+'Восстановить из файла</button><span class="sp"></span><button class="btn lg" type="button" data-x>Закрыть</button><button class="btn pri lg" type="button" data-dl>'+ic('download')+'Скачать .json</button></div>',{cls:'',label:'Резервная копия',focus:'[data-dl]'});
  const el=L.el,box=$1('.pf-bkx',el),inp=impInput();
  const err=m=>{box.innerHTML='<div class="errm" role="alert">'+ic('alert')+esc(m)+'</div>';};
  $1('[data-dl]',el).addEventListener('click',async()=>{
    try{const ok=await saveFile('gtype-backup-'+PF.slugOf()+'.json',JSON.stringify(buildBackup()),'application/json');if(ok!==false)box.innerHTML='';}
    catch(e){err('Не удалось собрать копию. Попробуйте ещё раз');}
  });
  $1('[data-restore]',el).addEventListener('click',()=>{inp.value='';inp.click();});
  const onChange=e=>{
    const f=e.target.files&&e.target.files[0];if(!f||!document.contains(el))return;
    const fr=new FileReader();fr.onerror=()=>err('Не удалось прочитать файл. Выберите другой файл копии');
    fr.onload=()=>{
      let b;try{b=checkBackup(String(fr.result));}catch(x){err(x.message);return;}
      const n=Object.keys(b.fonts).length+(b.imp?1:0)+(b.draw?1:0),name=((b.profile.first+' '+b.profile.last).trim())||'без имени';
      box.innerHTML='<div class="conf" role="alertdialog" aria-label="Заменить данные?"><b>'+ic('alert')+'Заменить текущие данные?</b><p>В файле: профиль «'+esc(name)+'», шрифтов и черновиков: '+n+'. Текущий профиль и одноимённые шрифты будут заменены.</p><div class="pf-cfb"><button class="btn" type="button" data-cn>Отмена</button><button class="btn danger solid" type="button" data-ok>Заменить данные</button></div></div>';
      $1('[data-cn]',box).addEventListener('click',()=>{box.innerHTML='';});
      $1('[data-ok]',box).addEventListener('click',()=>{try{applyBackup(b);}catch(x){console.error(x);err('Не удалось восстановить копию. Данные не изменились, попробуйте ещё раз');return;}PF.closeLayer(L);if(S.tab==='profile'||S.tab==='folder')PF.render(true);PF.railAv();toast('Копия восстановлена — всё на своих местах');});
      const cn=$1('[data-cn]',box);if(cn)cn.focus();
    };
    fr.readAsText(f);inp.value='';
  };
  inp.addEventListener('change',onChange);
  L.onClose=()=>{inp.removeEventListener('change',onChange);};
}
PF.openBackup=openBackup;
})();
