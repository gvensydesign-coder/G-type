/* ===== ПРОФИЛЬ m43, часть B: ящик «Редактировать профиль», загрузка и сжатие картинок, кадрирование фото, окно «Изменить витрину» ===== */
(function(){
'use strict';
const PF=window.PROF,esc=PF.esc,ic=PF.ic,$1=PF.$1,$A=PF.$A,MAXL=PF.MAXL,NETS=PF.NETS,validUrl=PF.validUrl;
const mo=()=>window.MO||{off:()=>true,D:()=>0,E:()=>'ease'};
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const phone=()=>matchMedia('(max-width:720px)').matches;

/* ---------- картинки: выбор файла, сжатие ---------- */
let fileEl=null,pending=null;
function fileInput(){
  if(fileEl)return fileEl;
  fileEl=document.createElement('input');fileEl.type='file';fileEl.accept='image/jpeg,image/png,image/webp,image/gif';fileEl.id='pf-file';fileEl.className='pf-sr';fileEl.tabIndex=-1;fileEl.setAttribute('aria-hidden','true');
  document.body.appendChild(fileEl);fileEl.addEventListener('change',onFile);return fileEl;
}
function pickImage(kind,cb){pending={kind,cb};const f=fileInput();f.value='';f.click();}
function downscale(img,maxSide,q){
  const s=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));
  const x=c.getContext('2d');x.fillStyle=css('--vz-white');x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',q);
}
function onFile(e){
  const file=e.target.files&&e.target.files[0];if(!file||!pending)return;
  const p=pending;pending=null;
  if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type)){toast('Выберите картинку JPG или PNG');return;}
  if(file.size>15*1024*1024){toast('Файл больше 15 МБ');return;}
  const fr=new FileReader();fr.onerror=()=>toast('Не удалось прочитать файл. Выберите другую картинку');
  fr.onload=()=>{
    const im=new Image();im.onerror=()=>toast('Не удалось открыть картинку. Подойдёт JPG или PNG');
    im.onload=()=>{
      if(p.kind==='cover')p.cb({cover:downscale(im,1600,.82)});
      else{const src=downscale(im,1024,.9),im2=new Image();im2.onload=()=>p.cb({img:im2,src});im2.src=src;}
    };
    im.src=fr.result;
  };
  fr.readAsDataURL(file);
}
PF.pickImage=pickImage;

/* ---------- кадрирование фото ---------- */
function openCrop(img,done){
  const W=480,H=360,R=140,iw=img.naturalWidth,ih=img.naturalHeight,s0=2*R/Math.min(iw,ih);
  let zoom=1.4,cx=0,cy=0,moved=false,drag=null;
  const L=PF.modal('<div class="mh"><h2>Фото профиля</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div>'+
    '<div class="pf-crop" tabindex="0" aria-label="Область кадрирования: перетащите или стрелками сдвиньте фото"><canvas width="'+W+'" height="'+H+'"></canvas><div class="hintp">'+ic('move')+'Перетащите, чтобы сдвинуть</div></div>'+
    '<div class="pf-zoom">'+ic('minus')+'<input type="range" min="100" max="300" value="140" aria-label="Масштаб"><i class="ico i-plus" aria-hidden="true"></i><output>140%</output></div>'+
    '<div class="pf-mf"><div class="pf-prev"><canvas width="64" height="64"></canvas><canvas width="40" height="40"></canvas><canvas width="24" height="24"></canvas><span>Так увидят другие</span></div><span class="sp"></span><button class="btn lg" type="button" data-x>Отмена</button><button class="btn pri lg" type="button" data-crop-ok>Готово</button></div>',
    {label:'Фото профиля',focus:'[data-crop-ok]'});
  const d=L.el,st=$1('.pf-crop',d),cv=$1('canvas',st),x=cv.getContext('2d'),pv=$A('.pf-prev canvas',d),zr=$1('input[type=range]',d),zo=$1('output',d),hint=$1('.hintp',d);
  const T={bg:css('--crop-bg'),dim:css('--crop-dim'),line:css('--crop-line'),grid:css('--crop-grid'),white:css('--vz-white')};
  function clamp(){const s=s0*zoom,mx=Math.max(0,iw*s/2-R),my=Math.max(0,ih*s/2-R);cx=Math.max(-mx,Math.min(mx,cx));cy=Math.max(-my,Math.min(my,cy));}
  function out(size){
    const c=document.createElement('canvas');c.width=c.height=size;const k=size/(2*R),s=s0*zoom,g=c.getContext('2d');
    g.fillStyle=T.white;g.fillRect(0,0,size,size);
    g.drawImage(img,(W/2+cx-iw*s/2-(W/2-R))*k,(H/2+cy-ih*s/2-(H/2-R))*k,iw*s*k,ih*s*k);return c;
  }
  function draw(){
    clamp();const s=s0*zoom;
    x.fillStyle=T.bg;x.fillRect(0,0,W,H);x.drawImage(img,W/2+cx-iw*s/2,H/2+cy-ih*s/2,iw*s,ih*s);
    x.save();x.fillStyle=T.dim;x.beginPath();x.rect(0,0,W,H);x.arc(W/2,H/2,R,0,Math.PI*2,true);x.fill('evenodd');x.restore();
    x.strokeStyle=T.line;x.lineWidth=2;x.beginPath();x.arc(W/2,H/2,R-1,0,Math.PI*2);x.stroke();
    x.strokeStyle=T.grid;x.lineWidth=1;x.save();x.beginPath();x.arc(W/2,H/2,R-1,0,Math.PI*2);x.clip();x.beginPath();
    [1/3,2/3].forEach(t=>{x.moveTo(W/2-R+2*R*t,H/2-R);x.lineTo(W/2-R+2*R*t,H/2+R);x.moveTo(W/2-R,H/2-R+2*R*t);x.lineTo(W/2+R,H/2-R+2*R*t);});x.stroke();x.restore();
    const o=out(128);
    pv.forEach(p=>{const g=p.getContext('2d'),z=p.width;g.clearRect(0,0,z,z);g.save();g.beginPath();g.arc(z/2,z/2,z/2,0,Math.PI*2);g.clip();g.drawImage(o,0,0,z,z);g.restore();});
  }
  function zs(){zr.style.setProperty('--v',((zoom*100-100)/200*100)+'%');zo.textContent=Math.round(zoom*100)+'%';}
  function hideHint(){if(!moved){moved=true;hint.style.opacity=0;}}
  zr.addEventListener('input',()=>{zoom=zr.value/100;zs();draw();});
  st.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,cx,cy};st.classList.add('drag');try{st.setPointerCapture(e.pointerId);}catch(x2){}});
  st.addEventListener('pointermove',e=>{if(!drag)return;const k=W/cv.getBoundingClientRect().width;cx=drag.cx+(e.clientX-drag.x)*k;cy=drag.cy+(e.clientY-drag.y)*k;hideHint();draw();});
  const end=()=>{drag=null;st.classList.remove('drag');};st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
  st.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(1,Math.min(3,zoom-e.deltaY/600));zr.value=Math.round(zoom*100);zs();draw();},{passive:false});
  st.addEventListener('keydown',e=>{
    const k={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[e.key];
    if(k){e.preventDefault();cx+=k[0];cy+=k[1];hideHint();draw();}
    else if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();zoom=Math.max(1,Math.min(3,zoom+(e.key==='-'?-.1:.1)));zr.value=Math.round(zoom*100);zs();draw();}
  });
  $1('[data-crop-ok]',d).addEventListener('click',()=>{
    const full=out(400).toDataURL('image/jpeg',.9),thumb=out(64).toDataURL('image/jpeg',.8);
    L.close();done(full,thumb);
  });
  zs();draw();
}
PF.openCrop=openCrop;

/* ---------- ящик «Редактировать профиль» ---------- */
function linkErr(l){
  const u=l.url.trim();
  if(!u)return l.touched?'Вставьте ссылку':'';
  if(validUrl(u))return '';
  return (l.touched||l.url.length>3)?(/^https?:\/\//i.test(u)?'Не получилось разобрать ссылку. Проверьте адрес':'В ссылке нет https:// в начале. Добавьте его'):'';
}
PF.linkErr=linkErr;
function openEdit(opt){
  if(PF.guest||PF.layers.some(l=>l.kind==='edit'))return;
  opt=opt||{};
  const M=PF.meta(),IMG=PF.img;
  const w={first:M.first,last:M.last,bio:M.bio,sign:M.sign,links:M.links.map(l=>({net:l.net,url:l.url,touched:false})),cover:IMG.cover,avatar:IMG.avatar,avsrc:IMG.avsrc,avThumb:M.avThumb,cDirty:false,aDirty:false,nameFont:M.nameFont,acc:M.acc,defLic:M.defLic};
  const txt=()=>JSON.stringify([w.first,w.last,w.bio,w.sign,w.links.map(l=>[l.net,l.url.trim()]),w.nameFont,w.acc,w.defLic]),orig=txt();
  const scrim=document.createElement('div');scrim.className='pf-scrim';
  const el=document.createElement('aside');el.className='pf-drawer';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Редактировать профиль');
  el.innerHTML='<div class="pf-dh"><h2>Редактировать профиль</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div><div class="pf-db"></div>'+
    '<div class="pf-df"><span class="note" hidden><i></i>Есть несохранённые изменения</span><span class="sp"></span><button class="btn lg" type="button" data-x>Отмена</button><button class="btn pri lg" type="button" data-save>Сохранить</button></div>';
  document.body.appendChild(scrim);document.body.appendChild(el);
  const body=$1('.pf-db',el),note=$1('.note',el),saveBtn=$1('[data-save]',el);
  const out=phone()?[{transform:'none',opacity:1},{transform:'translateY(40px)',opacity:0}]:[{transform:'none',opacity:1},{transform:'translateX(40px)',opacity:0}];
  const L=PF.pushLayer({kind:'edit',el,parts:[scrim,el],out,request:()=>dirty()?confirmClose():PF.closeLayer(L)});
  const dirty=()=>w.cDirty||w.aDirty||txt()!==orig;
  function upd(){const dr=dirty();note.hidden=!dr;saveBtn.disabled=!dr;}
  function cvp(){return '<div class="pf-cvp">'+(w.cover?'<div class="cv img"><img alt="" src="'+w.cover+'"></div>':'<div class="cv"><i></i><i></i><i></i></div>')+'<span class="cap">Так обложка уходит в фон профиля</span></div>';}
  function avBlock(){
    const nm=((w.first||'').charAt(0)+(w.last||'').charAt(0)).toUpperCase();
    const a=w.avatar?'<div class="avt avt-lg img" role="img" aria-label="Фото профиля" style="background-image:url('+w.avatar+')"></div>':(nm?'<div class="avt avt-lg" aria-hidden="true">'+esc(nm)+'</div>':'<div class="avt avt-lg neutral" aria-hidden="true">'+ic('person')+'</div>');
    return '<div class="pf-avr">'+a+'<div><div class="pf-btnrow"><button class="btn sm" type="button" data-up="avatar">'+ic('upload')+(w.avatar?'Заменить':'Загрузить')+'</button><button class="btn sm ghost" type="button" data-recrop'+(w.avsrc?'':' disabled')+'>Кадрировать</button><button class="btn sm ghost" type="button" data-rmav'+(w.avatar?'':' disabled')+'>Удалить</button></div><div class="hint">Круглая обрезка, JPG или PNG</div></div></div>';
  }
  function linkRows(){
    return w.links.map((l,i)=>{const er=linkErr(l);
      return '<div class="pf-lrow" data-i="'+i+'"><select class="sel" aria-label="Сеть">'+NETS.map(n=>'<option'+(n===l.net?' selected':'')+'>'+n+'</option>').join('')+'</select><input class="inp" type="url" inputmode="url" value="'+esc(l.url)+'" placeholder="https://"'+(er?' aria-invalid="true"':'')+' aria-label="Ссылка '+(i+1)+'" autocomplete="off"><button class="ibtn sm" type="button" data-rm="'+i+'" aria-label="Убрать ссылку '+(i+1)+'">'+ic('close')+'</button></div>'+
        '<div class="pf-err'+(er?' show':'')+'" data-e="'+i+'" role="alert">'+(er?ic('alert')+esc(er):'')+'</div>';}).join('');
  }
  function linksBlock(){
    const full=w.links.length>=MAXL;
    return '<div class="lb">Ссылки</div><div id="pf-links">'+linkRows()+'</div><div class="pf-addl"><button class="btn sm" type="button" data-add'+(full?' disabled':'')+'>'+ic('plus')+'Добавить ссылку</button><span class="hint">'+(full?'Максимум '+MAXL+' ссылки':'Ещё можно добавить: '+(MAXL-w.links.length))+'</span></div>';
  }
  /* FX80 F3 (A20): у имени и фамилии виден предел 30 знаков */
  function ncnt(){['pf-f','pf-l'].forEach(id=>{const i=$1('#'+id,el),c=$1('[data-nc="'+id+'"]',el);if(!i||!c)return;const n=i.value.length;c.textContent=n>=24?(n>=30?'30/30 — предел':n+'/30'):'';c.classList.toggle('warn',n>=24&&n<30);c.classList.toggle('max',n>=30);});}
  function cnt(){ncnt();const n=w.bio.length,c=$1('.pf-cnt',el);c.textContent=n+'/160';c.classList.toggle('warn',n>=145&&n<160);c.classList.toggle('max',n>=160);}
  function build(){
    body.innerHTML='<div class="pf-fld"><div class="lb">Обложка</div><div data-cv>'+cvp()+'</div><div class="pf-btnrow"><button class="btn sm" type="button" data-up="cover">'+ic('upload')+(w.cover?'Заменить':'Загрузить')+'</button><button class="btn sm ghost" type="button" data-rmcv'+(w.cover?'':' disabled')+'>'+ic('trash')+'Удалить</button></div><div class="hint">JPG или PNG. Нижний край плавно переходит в фон.</div></div>'+
      '<div class="pf-fld"><div class="lb">Фото профиля</div><div data-av>'+avBlock()+'</div></div>'+
      '<div class="pf-two"><div class="pf-fld"><label for="pf-f">Имя</label><input id="pf-f" class="inp" value="'+esc(w.first)+'" maxlength="30" autocomplete="off"><div class="pf-nc" data-nc="pf-f" aria-live="polite"></div></div><div class="pf-fld"><label for="pf-l">Фамилия</label><input id="pf-l" class="inp" value="'+esc(w.last)+'" maxlength="30" autocomplete="off"><div class="pf-nc" data-nc="pf-l" aria-live="polite"></div></div></div>'+
      '<div class="pf-fld"><label for="pf-b">Описание</label><textarea id="pf-b" class="inp" maxlength="160" placeholder="Чем занимаетесь, где живёте">'+esc(w.bio)+'</textarea><div class="pf-cnt"></div></div>'+
      '<div class="pf-fld" id="pf-lk" data-links>'+linksBlock()+'</div>'+
      (PF.port?PF.port.drawerHTML(w):'')+
      '<div class="pf-fld"><label class="tgl pf-sign"><input type="checkbox" id="pf-sign" role="switch"'+(w.sign?' checked':'')+'><span class="tt"><b>Подписывать скачанные шрифты моим именем</b><span>Имя автора попадёт в метаданные файла</span></span></label></div>';
    if(PF.port)PF.port.drawerPaint(el);cnt();upd();
  }
  function relinks(){$1('[data-links]',el).innerHTML=linksBlock();}
  function showErr(i){
    const l=w.links[i],er=linkErr(l),eb=$1('[data-e="'+i+'"]',el),inp=$1('.pf-lrow[data-i="'+i+'"] input',el);if(!eb)return;
    eb.className='pf-err'+(er?' show':'');eb.innerHTML=er?ic('alert')+esc(er):'';
    if(er)inp.setAttribute('aria-invalid','true');else inp.removeAttribute('aria-invalid');
  }
  function confirmClose(){
    if($1('.pf-uc',el))return;
    const u=document.createElement('div');u.className='pf-uc';
    u.innerHTML='<div class="pf-ucc" role="alertdialog" aria-label="Закрыть без сохранения"><div class="ic">'+ic('alert')+'</div><h3>Закрыть без сохранения?</h3><p>Если закрыть сейчас, изменения пропадут.</p><div class="bt"><button class="btn pri lg" type="button" data-uc="save">Сохранить и закрыть</button><button class="btn lg" type="button" data-uc="stay">Продолжить редактирование</button><button class="btn danger lg" type="button" data-uc="drop">Не сохранять</button></div></div>';
    el.appendChild(u);if(!mo().off())u.animate([{opacity:0},{opacity:1}],{duration:mo().D('fast')});
    $1('[data-uc=stay]',u).focus();
  }
  function save(){
    let bad=-1;w.links.forEach((l,i)=>{l.touched=true;if(linkErr(l)&&bad<0)bad=i;});
    if(!w.first.trim()){toast('Укажите имя');const f=$1('#pf-f',el);if(f)f.focus();return false;}
    if(bad>=0){relinks();toast('Проверьте ссылки');const r=$1('.pf-lrow[data-i="'+bad+'"] input',el);if(r)r.focus();return false;}
    const M2=PF.meta();
    M2.nameFont=w.nameFont;M2.acc=w.acc;M2.defLic=w.defLic;
    M2.first=w.first.trim();M2.last=w.last.trim();M2.bio=w.bio.trim();M2.sign=w.sign;
    M2.links=w.links.map(l=>({net:l.net,url:l.url.trim()}));
    if(w.cDirty)PF.imgPut('cover',w.cover);
    if(w.aDirty){PF.imgPut('avatar',w.avatar);PF.imgPut('avsrc',w.avatar?w.avsrc:'');M2.avThumb=w.avatar?w.avThumb:'';}
    PF.saveMeta();PF.syncAuthor();
    toast(stSay('Профиль сохранён','Профиль обновлён, но после закрытия вкладки пропадёт'));PF.closeLayer(L);
    if(S.tab==='profile')PF.render(true);
    PF.railAv();
    return true;
  }
  if(PF.port)PF.port.drawerBind(el,w,upd);
  el.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='pf-f'){w.first=t.value;ncnt();}else if(t.id==='pf-l'){w.last=t.value;ncnt();}
    else if(t.id==='pf-b'){w.bio=t.value;cnt();}
    else if(t.closest('.pf-lrow')&&t.tagName==='INPUT'){const i=+t.closest('.pf-lrow').dataset.i;w.links[i].url=t.value;showErr(i);}
    upd();
  });
  el.addEventListener('change',e=>{
    const t=e.target;
    if(t.id==='pf-sign'){w.sign=t.checked;upd();}
    else if(t.tagName==='SELECT'&&t.closest('.pf-lrow')){w.links[+t.closest('.pf-lrow').dataset.i].net=t.value;upd();}
  });
  el.addEventListener('focusout',e=>{
    const t=e.target;
    if(t.closest&&t.closest('.pf-lrow')&&t.tagName==='INPUT'){const i=+t.closest('.pf-lrow').dataset.i;if(w.links[i]&&w.links[i].url.trim()){w.links[i].touched=true;showErr(i);}}
  });
  el.addEventListener('click',e=>{
    const t=e.target.closest('button');if(!t)return;
    if(t.hasAttribute('data-x')){L.request();return;}
    if(t.hasAttribute('data-save')){save();return;}
    if(t.hasAttribute('data-add')){
      const used=w.links.map(l=>l.net),n=NETS.filter(x=>!used.includes(x))[0]||'Сайт';
      w.links.push({net:n,url:'',touched:false});relinks();upd();const ins=$A('.pf-lrow input',el).pop();if(ins)ins.focus();return;
    }
    if(t.hasAttribute('data-rm')){w.links.splice(+t.dataset.rm,1);relinks();upd();return;}
    const up=t.getAttribute('data-up');
    if(up){
      pickImage(up,r=>{
        if(up==='cover'){w.cover=r.cover;w.cDirty=true;$1('[data-cv]',el).innerHTML=cvp();build2();}
        else openCrop(r.img,(full,thumb)=>{w.avatar=full;w.avThumb=thumb;w.avsrc=r.src;w.aDirty=true;$1('[data-av]',el).innerHTML=avBlock();upd();});
      });
      return;
    }
    if(t.hasAttribute('data-rmcv')){w.cover='';w.cDirty=true;$1('[data-cv]',el).innerHTML=cvp();build2();return;}
    if(t.hasAttribute('data-recrop')){const im=new Image();im.onload=()=>openCrop(im,(full,thumb)=>{w.avatar=full;w.avThumb=thumb;w.aDirty=true;$1('[data-av]',el).innerHTML=avBlock();upd();});im.src=w.avsrc;return;}
    if(t.hasAttribute('data-rmav')){w.avatar='';w.avsrc='';w.avThumb='';w.aDirty=true;$1('[data-av]',el).innerHTML=avBlock();upd();return;}
    const uc=t.getAttribute('data-uc');
    if(uc){
      if(uc==='stay'){t.closest('.pf-uc').remove();}
      else if(uc==='drop')PF.closeLayer(L);
      else if(uc==='save'){const u2=t.closest('.pf-uc');if(!save())u2.remove();}
    }
  });
  /* кнопки «Заменить / Удалить» обложки меняются после выбора файла; поля формы остаются */
  function build2(){const b=$1('[data-rmcv]',el),u=$1('[data-up=cover]',el);if(b)b.disabled=!w.cover;if(u)u.lastChild.nodeValue=w.cover?'Заменить':'Загрузить';upd();}
  scrim.addEventListener('click',()=>L.request());
  build();
  if(!mo().off()&&el.animate){
    scrim.animate([{opacity:0},{opacity:1}],{duration:mo().D('fast'),easing:mo().E('out')});
    el.animate(phone()?[{transform:'translateY(100%)'},{transform:'none'}]:[{transform:'translateX(100%)'},{transform:'none'}],{duration:mo().D('open'),easing:mo().E('out')});
  }
  setTimeout(()=>{
    const t=opt.focus==='links'?($1('[data-add]:not([disabled])',el)||$1('#pf-f',el)):$1('#pf-f',el);
    if(opt.focus==='links'&&t&&t.scrollIntoView)t.scrollIntoView({block:'center'});
    if(t)t.focus({preventScroll:true});
  },60);
  return L;
}
PF.openEdit=openEdit;

})();
