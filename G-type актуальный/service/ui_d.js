/* ===== удобство: сравнение, таблица метрик, образец .png, обучение ===== */
/* ---------- 1. сравнение в образце ---------- */
S.cmp={on:false,src:'A',A:null};
const cmpCache={tag:'',m:new Map()};
function cmpStyleOf(p0,st){return {p:p0,lat:st.lat,hg:st.hg,kern:st.kern,ku:st.ku,kc:st.kc};}
function cmpSource(){
  const v=S.cmp.src||'A',st=cur();
  if(v==='A'){const a=S.cmp.A;if(!a||a.font!==S.fontId)return null;return {st:a.st,edits:a.edits,label:'А',key:'A'+a.t};}
  if(v==='other'){const o=S.style==='regular'?'italic':'regular';return {st:S.styles[o],edits:S.edits,label:STYLE_NAMES[o],key:'o'+o};}
  if(v.slice(0,2)==='w:'){const w=WEIGHTS.find(x=>x[0]===v.slice(2));if(!w)return null;
    const p=famParams(st.p,w[0]);
    return {st:cmpStyleOf(p,st),edits:S.edits,label:w[0],key:v};}
  if(v.slice(0,2)==='p:'){const it=loadPre()[+v.slice(2)];if(!it)return null;
    return {st:cmpStyleOf({...st.p,...it.p},st),edits:S.edits,label:it.name,key:v};}
  return null;
}
function cmpGlyph(src,ch){
  const tag=src.key+'|'+ver+'|'+S.style+'|'+S.fontId;
  if(cmpCache.tag!==tag){cmpCache.tag=tag;cmpCache.m.clear();}
  let g=cmpCache.m.get(ch);if(g===undefined){g=finalGlyph(ch,src.st,src.edits)||null;cmpCache.m.set(ch,g);}return g;
}
function layoutG(text,gf,kf,fs,maxW,cx){cx=cx||((p,ch)=>ch);
  const sc=fs/1000,lines=[];
  const adv=ch=>{const g=gf(ch);return g?g.adv*sc:0;};
  for(const para of text.split('\n')){
    const words=para.split(' ');let line={chars:[],w:0};const sp=adv(' ');
    words.forEach((wd,wi)=>{
      let ww=0,pv='';for(const ch of wd){ww+=adv(cx(pv,ch))+(pv?kf(pv,ch)*sc:0);pv=ch;}
      if(line.chars.length&&line.w+sp+ww>maxW){lines.push(line);line={chars:[],w:0};}
      else if(wi>0&&line.chars.length){line.w+=sp;}
      pv='';for(const ch of wd){if(pv)line.w+=kf(pv,ch)*sc;const gn=cx(pv,ch);line.chars.push({ch,gn,x:line.w});line.w+=adv(gn);pv=ch;}
    });
    lines.push(line);
  }
  return {lines,sc};
}
function drawCompare(){
  const cv=$('#spec'),box=cv.parentElement;
  const maxW=Math.max(200,box.clientWidth-40),src=cmpSource();let fs=S.specSize;
  const ph=!String(S.text||'').trim(),rawT=String(S.text||''),T=ph?smpDefault():rawT;
  const rows=[{label:'Сейчас',gf:ch=>getFinal(ch,S.style),kf:(a,b)=>kernOf(a,b,S.style),cx:ctxName}];
  if(src)rows.push({label:src.label,gf:ch=>cmpGlyph(src,ch),kf:(a,b)=>kernStVal(a,b,src.st,'cmp'+src.key,ch=>cmpGlyph(src,ch)),cx:ctxName});
  /* обе строки должны помещаться в окно образца: кегль уменьшается при необходимости */
  let lays,total;const avail=box.clientHeight-20;
  for(;;){lays=rows.map(r=>layoutG(T,r.gf,r.kf,fs,maxW,r.cx));total=0;lays.forEach(L=>total+=L.lines.length*fs*1.15+44);if(!src)total+=60;
    if(total<=avail||fs<=24)break;fs=Math.max(24,Math.floor(fs*0.88));}
  cv.style.height=Math.max(120,total+20)+'px';
  const {c,w}=fitCanvas(cv);c.clearRect(0,0,cv.width,cv.height);
  const fg=css('--glyph'),mu=css('--muted'),ln=css('--line'),acc=css('--accent');
  let y=10,RC0=[],y00=0;
  rows.forEach((r,ri)=>{
    c.font='600 13px "Onest",system-ui,sans-serif';c.textBaseline='top';c.fillStyle=ri?acc:mu;c.fillText(r.label,20,y);y+=22;
    if(!ri)y00=y;
    const L=lays[ri];c.fillStyle=ph?mu:fg;
    L.lines.forEach(line=>{const base=y+fs*0.86;
      for(const it of line.chars){const g=r.gf(it.gn||it.ch);if(!ri)RC0.push({ch:it.ch,x0:20+it.x,x1:20+it.x+(g?g.adv*L.sc:0),y0:y+fs*0.04,y1:y+fs*1.06});
        if(!g||!g.cs.length)continue;c.fill(pathOf(g.cs,(x,yy)=>[20+it.x+x*L.sc,base-yy*L.sc]),'nonzero');}
      y+=fs*1.15;});
    y+=12;if(ri<rows.length-1||!src){c.strokeStyle=ln;c.beginPath();c.moveTo(20,y-6);c.lineTo(w-20,y-6);c.stroke();}
  });
  smpCommit('spec',[RC0],ph?'':rawT,{left:20,line:{y0:y00+fs*0.04,y1:y00+fs*1.06},pitch:fs*1.15,spw:fs*0.26});
  if(!src){c.font='500 14px "Onest",system-ui,sans-serif';c.fillStyle=mu;c.textBaseline='top';
    c.fillText(S.cmp.src==='A'?'Нажмите «Запомнить как А», затем меняйте настройки':'Нет варианта для сравнения',20,y+8);}
}
function cmpOptions(){
  const sel=$('#cmpsrc');if(!sel)return;const o=S.style==='regular'?'italic':'regular';
  const opts=[['A','с А'],['other','с «'+STYLE_NAMES[o]+'»']].concat(WEIGHTS.filter(w=>w[0]!==famNearest(cur().p)).map(w=>['w:'+w[0],'с '+wnRu(w[0])]))
    .concat(loadPre().map((it,i)=>['p:'+i,'с «'+it.name+'»']));
  sel.innerHTML=opts.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('');
  if(!opts.some(x=>x[0]===S.cmp.src))S.cmp.src='A';sel.value=S.cmp.src;
}
function syncCmp(){
  const on=S.cmp.on,b=$('#cmpb'),bar=$('#cmpbar');if(!b)return;
  b.classList.toggle('on',on);bar.hidden=!on;b.closest('.specwrap').classList.toggle('cmp',on);
  const hasA=S.cmp.A&&S.cmp.A.font===S.fontId;
  b.textContent=on?'Сравнение':(hasA?'Сравнить с А':'Сравнить');
  $('#cmpa').textContent=hasA?'Обновить А':'Запомнить как А';
  if(on)cmpOptions();
}
function rememberA(){
  stash();const st=cur();
  S.cmp.A={font:S.fontId,t:Date.now(),st:JSON.parse(JSON.stringify({p:st.p,lat:st.lat,hg:st.hg,kern:st.kern,ku:st.ku,kc:st.kc})),edits:JSON.parse(JSON.stringify(S.edits))};
  S.cmp.src='A';S.cmp.on=true;syncCmp();schedule();toast('Запомнено как А');
}

/* ---------- 2. таблица метрик ---------- */
S.mt={sort:'ord'};
function metricRange(id){const e=$('#'+id);return [+e.min,+e.max];}
function setMetric(ch,key,v){
  if(!GL[ch]||!isFinite(v))return;
  const [lo,hi]=metricRange(key);v=Math.round(Math.max(lo,Math.min(hi,v)));
  snap();const prev=S.sel;S.sel=ch;const E=ed();
  if(key==='wm'){if(v===100)delete E.wm;else E.wm=v;}else{if(!v)delete E[key];else E[key]=v;}
  cleanEdit();S.sel=prev;bump();
}
/* знак редактируемым шрифтом: svg-путь из итогового глифа (высота строки — asc..desc) */
function glyphSVG(ch){
  const g=getFinal(ch,S.style);const p=cur().p;if(!g)return '';
  const r=v=>Math.round(v);let d='';
  for(const c of g.cs){const ns=c.nodes,n=ns.length;if(n<2)continue;d+='M'+r(ns[0].x)+' '+r(-ns[0].y);
    for(let i=0;i<n;i++){const A=ns[i],B=ns[(i+1)%n];
      if(!near1(A.b,A)||!near1(B.a,B)){const c1=A.b||A,c2=B.a||B;d+='C'+r(c1.x)+' '+r(-c1.y)+' '+r(c2.x)+' '+r(-c2.y)+' '+r(B.x)+' '+r(-B.y);}
      else d+='L'+r(B.x)+' '+r(-B.y);}
    d+='Z';}
  const top=Math.max(p.asc,p.capH)+40,H=top+p.desc+40,W=Math.max(200,Math.round(g.adv));
  return '<svg viewBox="0 '+(-top)+' '+W+' '+H+'" height="24" width="'+Math.max(8,Math.round(24*W/H))+'" aria-hidden="true"><path fill="currentColor" d="'+d+'"/></svg>';
}
function renderMetrics(){
  const det=$('#mtbox');if(!det||!det.open||S.tab!=='proof')return;
  const res=computeProof(),body=$('#mtbody');
  const act=document.activeElement,fk=act&&act.dataset&&act.dataset.k?act.dataset.ch+'|'+act.dataset.k:null;
  let list=[];CHARSET.forEach((ch,i)=>{const r=res.get(ch);if(!r||!PGROUP[S.proof.grp](ch))return;list.push({r,i});});
  const ed0=ch=>S.edits[ch]||{},has=ch=>!!(ed0(ch).sbL||ed0(ch).sbR||ed0(ch).wm);
  const s=S.mt.sort,val=(o,k)=>o.r[k]==null?-1e9:o.r[k];
  if(s==='adv')list.sort((a,b)=>Math.round(b.r.adv)-Math.round(a.r.adv)||a.i-b.i);
  else if(s==='lsb')list.sort((a,b)=>val(a,'lsb')-val(b,'lsb')||a.i-b.i);
  else if(s==='rsb')list.sort((a,b)=>val(a,'rsb')-val(b,'rsb')||a.i-b.i);
  else if(s==='ed')list.sort((a,b)=>(has(b.r.ch)-has(a.r.ch))||a.i-b.i);
  const [l0,l1]=metricRange('sbL'),[r0,r1]=metricRange('sbR'),[w0,w1]=metricRange('wm');
  const esc=ch=>ch.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const cell=(ch,k,v,lo,hi)=>'<td><input type="number" class="mti'+((k==='wm'?v!==100:v)?' mv':'')+'" data-ch="'+esc(ch)+'" data-k="'+k+'" value="'+v+'" min="'+lo+'" max="'+hi+'" step="1" aria-label="'+k+' '+esc(ch)+'"></td>';
  body.innerHTML=list.map(({r})=>{const e=ed0(r.ch),bad=(r.lsb!=null&&(r.lsb<0||r.rsb<0));
    return '<tr'+(has(r.ch)?' class="ed"':'')+'><td><button type="button" class="mch" data-ch="'+esc(r.ch)+'" title="Править" aria-label="'+esc(r.ch)+'">'+(glyphSVG(r.ch)||esc(r.ch))+'</button></td><td>'+Math.round(r.adv)+'</td><td'+(bad&&r.lsb<0?' class="neg"':'')+'>'+(r.lsb==null?'—':r.lsb)+'</td><td'+(bad&&r.rsb<0?' class="neg"':'')+'>'+(r.rsb==null?'—':r.rsb)+'</td>'+
      cell(r.ch,'sbL',e.sbL||0,l0,l1)+cell(r.ch,'sbR',e.sbR||0,r0,r1)+cell(r.ch,'wm',e.wm||100,w0,w1)+'</tr>';}).join('');
  $('#mtn').textContent=list.length;
  if(fk){const [ch,k]=[fk.slice(0,fk.lastIndexOf('|')),fk.slice(fk.lastIndexOf('|')+1)];const el=$$('.mti',body).find(x=>x.dataset.ch===ch&&x.dataset.k===k);if(el)el.focus();}
}

/* ---------- 3. образец .png ---------- */
function specimenSheet(c,W){
  const M=140,maxW=W-2*M,k=S.style,gf=ch=>getFinal(ch,k),kf=(a,b)=>kernOf(a,b,k);
  const fg=dsColor('glyph'),mu=dsColor('cv-muted'),acc=dsColor('accent'),ln=dsColor('cv-line');
  let y=M;
  const label=t=>{if(c){c.font='600 26px "Onest",system-ui,sans-serif';c.fillStyle=mu;c.textBaseline='top';c.fillText(t,M,y);}y+=48;};
  const rule=()=>{y+=36;if(c){c.fillStyle=ln;c.fillRect(M,y,maxW,2);}y+=50;};
  const words=(text,fs,col)=>{const L=layoutG(text,gf,kf,fs,maxW,ctxName);
    for(const line of L.lines){const base=y+fs*0.86;if(c){c.fillStyle=col||fg;for(const it of line.chars){const g=gf(it.gn||it.ch);if(g&&g.cs.length)c.fill(pathOf(g.cs,(x,yy)=>[M+it.x+x*L.sc,base-yy*L.sc]),'nonzero');}}y+=fs*1.18;}};
  const chars=(str,fs)=>{const sc=fs/1000,gap=fs*0.18;let x=0;const items=[];let line=[];
    for(const ch of str){if(!GL[ch])continue;const g=gf(ch);if(!g)continue;const a=g.adv*sc;if(x+a>maxW&&line.length){items.push(line);line=[];x=0;}line.push([g,x]);x+=a+gap;}
    if(line.length)items.push(line);
    for(const ln2 of items){const base=y+fs*0.86;if(c){c.fillStyle=fg;for(const [g,xx] of ln2)c.fill(pathOf(g.cs,(px,py)=>[M+xx+px*sc,base-py*sc]),'nonzero');}y+=fs*1.22;}};
  /* шапка */
  if(c){c.font='600 28px "Onest",system-ui,sans-serif';c.fillStyle=acc;c.textBaseline='top';c.fillText('G-type · '+FONTS[S.fontId].name+' · '+wnRu(weightOf(S.styles.regular.p).name)+' · '+STYLE_NAMES[k],M,y);}y+=70;
  words(S.family||FONTS[S.fontId].family,220);
  rule();
  label('Прописные');chars('ABCDEFGHIJKLMNOPQRSTUVWXYZ',120);chars('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',120);
  rule();
  label('Строчные');chars('abcdefghijklmnopqrstuvwxyz',120);chars('абвгдеёжзийклмнопрстуфхцчшщъыьэюя',120);
  rule();
  label('Цифры и знаки');chars('0123456789',120);chars('.,:;!?«»"\'-–—()[]{}/\\|@#$%&*+=<>№₽€…',96);
  rule();
  label('Панграммы');words('Съешь ещё этих мягких французских булок, да выпей чаю.',72);y+=16;
  words('The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',72);
  rule();
  label('Кегли');
  for(const fs of [16,24,36,48,72,96]){if(c){c.font='500 22px "Onest",system-ui,sans-serif';c.fillStyle=mu;c.textBaseline='top';c.fillText(String(fs),M,y+Math.max(0,fs*0.5-12));}
    const ln1=layoutG('Шрифт на кривых — Type on curves 2077 Съешь ещё этих мягких французских булок',gf,kf,fs,maxW-80).lines[0];const sc=fs/1000,base=y+fs*0.86;
    if(c){c.fillStyle=fg;for(const it of ln1.chars){const g=gf(it.ch);if(g&&g.cs.length)c.fill(pathOf(g.cs,(x,yy)=>[M+80+it.x+x*sc,base-yy*sc]),'nonzero');}}
    y+=Math.max(36,fs*1.3);}
  y+=M-20;return y;
}
async function exportSpecimen(){
  toast('Рисую образец…');await new Promise(r=>setTimeout(r,30));
  const W=2400,H=Math.ceil(specimenSheet(null,W)),cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,W,H);specimenSheet(c,W);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob){toast('Не удалось нарисовать образец. Попробуйте ещё раз');return false;}
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const base=psSafe(S.family);
  const wn=weightOf(S.styles.regular.p).name;
  return saveFile(base+'-'+(wn==='Regular'&&S.style==='italic'?'Italic':wn+(S.style==='italic'?'Italic':''))+'-specimen.png',bytes,'image/png');
}

/* ---------- 4. подсказки: короткие, у контрола, один раз (без модального тура) ---------- */
const HINT_KEY='gtype-hints-v2';
const HINT_TXT={
  slide:'Тяните ползунок: весь шрифт меняется сразу.',
  point:'Точку можно тянуть прямо на холсте. Двойной щелчок — гладкий или угловой узел.',
  skel:'Средняя линия штриха: тяните узлы и ручки, контур пересчитается.',
  draw:'Клик ставит угол, перетаскивание — плавный узел. Enter — закончить штрих.',
  pair:'Клик между двумя буквами образца — поправить их пару.',
  export:'.ttf и .otf — для установки, .woff2 и .woff — для сайта, .zip — все веса сразу.'
};
let hintMem=null;
function hintSeenSet(){if(hintMem)return hintMem;try{hintMem=new Set(JSON.parse(localStorage.getItem(HINT_KEY)||'[]'));}catch(e){hintMem=new Set();}return hintMem;}
function hintSeen(id){return hintSeenSet().has(id);}
function hintMark(id){const s=hintSeenSet();s.add(id);try{localStorage.setItem(HINT_KEY,JSON.stringify([...s]));}catch(e){}}
/* показ — в ui_tour.js (TOUR.hint: подсветка + карточка, один раз, не блокирует); здесь только совместимые имена */
function hintHide(){if(window.TOUR)TOUR.hideSingle();}
/* «?» — справка: пройти знакомство, все туры по разделам, сброс подсказок */
function helpToggle(on){const h=$('#helpc');if(!h)return;const open=on==null?h.hidden:on;h.hidden=!open;if(open&&innerWidth<=560)h.style.top=($('.top').getBoundingClientRect().bottom+8)+'px';$('#help').setAttribute('aria-expanded',open?'true':'false');if(open&&window.TOUR)TOUR.renderList();}
function hintsReset(){if(window.TOUR)TOUR.reset();else{hintMem=new Set();try{localStorage.removeItem(HINT_KEY);}catch(e){}}toast('Подсказки и знакомство включены снова');}

/* ---------- подключение ---------- */
function initExtras(){
  bind('#cmpb','click',()=>{S.cmp.on=!S.cmp.on;syncCmp();schedule();});
  bind('#cmpa','click',rememberA);
  bind('#cmpsrc','change',e=>{S.cmp.src=e.target.value;schedule();});
  $$('[data-style]').forEach(b=>b.addEventListener('click',()=>{if(S.cmp.on)cmpOptions();}));
  bind('#mtbox','pane:toggle',()=>renderMetrics());
  bind('#mtsort','change',e=>{S.mt.sort=e.target.value;renderMetrics();});
  const mb=$('#mtbody');
  if(mb){mb.addEventListener('change',e=>{const t=e.target;if(!t.classList.contains('mti'))return;setMetric(t.dataset.ch,t.dataset.k,parseFloat(t.value));});
    mb.addEventListener('click',e=>{const b=e.target.closest('.mch');if(b){S.sel=b.dataset.ch;S.node=null;setTab('edit');}});}
  bind('#help','click',e=>{e.stopPropagation();helpToggle();});
  bind('#hint-reset','click',hintsReset);
  document.addEventListener('click',e=>{const h=$('#helpc');if(h&&!h.hidden&&!e.target.closest('#helpwrap'))helpToggle(false);});
  window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;helpToggle(false);hintHide();});
  /* триггеры подсказок живут в ui_tour.js (wireHints): первое настоящее действие, не загрузка страницы */
  syncCmp();
}
