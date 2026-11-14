/* Редактируемый образец (SMP): текст печатается прямо в образец, нарисованный контурами шрифта.
   Холст не умеет contenteditable, поэтому: прозрачное поле ввода (textarea/input, оно же старый #txt / #kk-txt / #dr-tx) лежит внутри
   рамки образца, а каретка и выделение — тонкие DOM-элементы поверх холста. Положение каретки берётся из тех же раскладок, что и сам образец:
   каждая функция рисования передаёт smpCommit() список {ch,x0,x1,y0,y1} нарисованных знаков (координаты в px холста), а smpBounds()
   сопоставляет их с индексами строки. Модель жестов: обычный щелчок ставит каретку (и фокус), перетаскивание выделяет, двойной щелчок — слово;
   щелчок в зазор между двумя буквами дополнительно вызывает o.tap (в редакторе — панель кернинга пары, во вкладке «Кернинг» — выбор пары).
   Пустой текст: рисуется образец по умолчанию приглушённым цветом. Enter не вставляет перенос в однострочных полях; вставка — только чистый текст. */
const SMP_I={};
function smpDefault(){const f=typeof FONTS!=='undefined'&&FONTS[S.fontId];return (f&&f.sampleText)||'Съешь ещё этих мягких французских булок';}
/* индекс строки -> границы между знаками: [{i,x,y0,y1}] */
function smpBounds(text,recs,o){
  const B=[];let r=0,cx=o.left,y0=o.line.y0,y1=o.line.y1,i=0;const pitch=o.pitch||Math.max(8,y1-y0);
  for(const ch of text){
    if(ch==='\n'){B.push({i,x:cx,y0,y1});y0+=pitch;y1+=pitch;cx=o.left;i+=1;continue;}
    let rec=null;
    for(let k=0;k<3&&r+k<recs.length;k++)if(recs[r+k].ch===ch){rec=recs[r+k];r+=k+1;break;}
    if(rec){cx=rec.x0;y0=rec.y0;y1=rec.y1;B.push({i,x:cx,y0,y1});cx=rec.x1;}
    else{B.push({i,x:cx,y0,y1});if(/\s/.test(ch))cx+=o.spw||0;}
    i+=ch.length;
  }
  B.push({i,x:cx,y0,y1});
  return B;
}
function smpCommit(id,rows,text,o){
  const I=SMP_I[id];if(!I)return;
  I.text=text;I.rows=rows.map(rc=>text===''?[{i:0,x:o.left,y0:o.line.y0,y1:o.line.y1}]:smpBounds(text,rc,o));
  smpUpdate(I);
}
function smpHit(I,x,y){
  let best=null,bd=1e9;
  I.rows.forEach((B,ri)=>{for(const e of B){const dy=y<e.y0?e.y0-y:y>e.y1?y-e.y1:0;if(dy<bd-0.5){bd=dy;best={row:ri,y0:e.y0};}}});
  if(!best)return null;
  let e0=null,dx=1e9;
  for(const e of I.rows[best.row]){if(Math.abs(e.y0-best.y0)>0.5)continue;const d=Math.abs(e.x-x);if(d<dx){dx=d;e0=e;}}
  return e0?{i:e0.i,e:e0,row:best.row,dx}:null;
}
function smpLine(I,i){/* границы той же строки, что и индекс i (строка холста) */
  const B=I.rows[Math.min(I.crow(),I.rows.length-1)]||[];const e=B.find(q=>q.i===i)||B[B.length-1];
  return e?{e,line:B.filter(q=>Math.abs(q.y0-e.y0)<0.5)}:null;
}
function smpUpdate(I){
  if(!I||!I.rows)return;const ta=I.ta,cv=I.cv,focus=document.activeElement===ta&&I.on();
  I.box.classList.toggle('smp-on',focus);
  const car=I.car,selw=I.selw;
  if(!focus||!I.rows.length){car.hidden=true;selw.innerHTML='';return;}
  const B=I.rows[Math.min(I.crow(),I.rows.length-1)],ox=cv.offsetLeft,oy=cv.offsetTop;
  const s=ta.selectionStart,e=ta.selectionEnd,fo=ta.selectionDirection==='backward'?s:e;
  const at=i=>{let q=B[0];for(const b of B){if(b.i<=i)q=b;else break;}return B.find(b=>b.i===i)||q;};
  let html='';
  if(s!==e){
    const lines=new Map();
    for(const b of B)if(b.i>=s&&b.i<=e){const k=Math.round(b.y0);const L=lines.get(k)||{x0:1e9,x1:-1e9,y0:b.y0,y1:b.y1};L.x0=Math.min(L.x0,b.x);L.x1=Math.max(L.x1,b.x);lines.set(k,L);}
    for(const L of lines.values())html+='<i style="left:'+(ox+L.x0)+'px;top:'+(oy+L.y0)+'px;width:'+Math.max(3,L.x1-L.x0)+'px;height:'+(L.y1-L.y0)+'px"></i>';
    car.hidden=true;
  }else{
    const q=at(fo);car.hidden=false;
    car.style.left=(ox+q.x-1)+'px';car.style.top=(oy+q.y0)+'px';car.style.height=(q.y1-q.y0)+'px';
    car.style.animation='none';void car.offsetWidth;car.style.animation='';
    ta.style.left=(ox+q.x)+'px';ta.style.top=(oy+q.y0)+'px';
    const bx=I.box,top=oy+q.y0,bot=oy+q.y1;
    if(bx.scrollHeight>bx.clientHeight+1){if(bot>bx.scrollTop+bx.clientHeight)bx.scrollTop=bot-bx.clientHeight+6;else if(top<bx.scrollTop)bx.scrollTop=Math.max(0,top-6);}
  }
  selw.innerHTML=html;
}
function smpAttach(id,o){
  if(SMP_I[id]||!o.cv||!o.ta)return SMP_I[id];
  const box=o.box||o.cv.parentElement;box.classList.add('smp-box');
  const car=document.createElement('i');car.className='smp-caret';car.hidden=true;car.setAttribute('aria-hidden','true');
  const selw=document.createElement('div');selw.className='smp-sel';selw.setAttribute('aria-hidden','true');
  box.appendChild(selw);box.appendChild(car);if(o.ta.parentNode!==box)box.appendChild(o.ta);
  o.ta.classList.add('smp-ta');
  const I=SMP_I[id]=Object.assign({id,box,car,selw,rows:[],text:'',multi:true,max:5000,on:()=>true,crow:()=>0},o);
  const ta=I.ta,cv=I.cv;
  const pt=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  const setSel=(a,b)=>{const lo=Math.min(a,b),hi=Math.max(a,b);try{ta.setSelectionRange(lo,hi,b<a?'backward':'forward');}catch(_){}smpUpdate(I);};
  cv.addEventListener('pointerdown',e=>{
    if(e.button!==0||!I.on())return;e.preventDefault();ta.focus({preventScroll:true});
    const [x,y]=pt(e),h=smpHit(I,x,y);if(!h)return;
    const anchor=e.shiftKey?(ta.selectionDirection==='backward'?ta.selectionEnd:ta.selectionStart):h.i;
    I.drag={anchor,x:e.clientX,y:e.clientY,moved:false,h};
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    setSel(anchor,h.i);
    if(I.press)I.press(h,e);
  });
  cv.addEventListener('pointermove',e=>{
    const d=I.drag;if(!d)return;
    if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<4)return;
    d.moved=true;const [x,y]=pt(e),h=smpHit(I,x,y);if(h)setSel(d.anchor,h.i);
  });
  const end=e=>{const d=I.drag;I.drag=null;if(!d)return;if(!d.moved&&e.type==='pointerup'&&I.tap)I.tap(d.h,e);};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  cv.addEventListener('dblclick',e=>{
    if(!I.on())return;const [x,y]=pt(e),h=smpHit(I,x,y);if(!h)return;
    const t=ta.value;let a=h.i,b=h.i;const w=ch=>/[\p{L}\p{N}]/u.test(ch||'');
    while(a>0&&w(t[a-1]))a--;while(b<t.length&&w(t[b]))b++;if(a!==b)setSel(a,b);
    if(I.hide)I.hide();
  });
  ta.addEventListener('focus',()=>smpUpdate(I));
  ta.addEventListener('blur',()=>smpUpdate(I));
  ta.addEventListener('input',()=>{if(I.hide)I.hide();});
  for(const ev of ['keyup','select','click'])ta.addEventListener(ev,()=>smpUpdate(I));
  document.addEventListener('selectionchange',()=>{if(document.activeElement===ta)smpUpdate(I);});
  ta.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    if(e.key==='Enter'&&!I.multi){e.preventDefault();return;}
    if(e.key==='Escape'&&I.hide)I.hide();
    const k=e.key;if(!(k==='ArrowUp'||k==='ArrowDown'||k==='Home'||k==='End')||e.ctrlKey||e.metaKey||e.altKey)return;
    const B=I.rows[Math.min(I.crow(),I.rows.length-1)];if(!B||!B.length)return;
    const back=ta.selectionDirection==='backward',fo=back?ta.selectionStart:ta.selectionEnd,anc=back?ta.selectionEnd:ta.selectionStart;
    const cur=smpLine(I,fo);if(!cur)return;
    let to=fo;
    if(k==='Home')to=cur.line[0].i;
    else if(k==='End')to=cur.line[cur.line.length-1].i;
    else{
      const ys=[...new Set(B.map(q=>Math.round(q.y0)))].sort((a,b)=>a-b),li=ys.indexOf(Math.round(cur.e.y0)),nl=li+(k==='ArrowDown'?1:-1);
      if(nl<0)to=0;else if(nl>=ys.length)to=B[B.length-1].i;
      else{const L=B.filter(q=>Math.round(q.y0)===ys[nl]);let bq=L[0];for(const q of L)if(Math.abs(q.x-cur.e.x)<Math.abs(bq.x-cur.e.x))bq=q;to=bq.i;}
    }
    e.preventDefault();
    if(e.shiftKey)setSel(anc,to);else setSel(to,to);
  });
  ta.addEventListener('paste',e=>{
    const cd=e.clipboardData;if(!cd)return;e.preventDefault();
    let t=cd.getData('text/plain')||'';t=t.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/g,'');
    if(!I.multi)t=t.replace(/\n+/g,' ');
    const room=I.max-(ta.value.length-(ta.selectionEnd-ta.selectionStart));if(t.length>room)t=t.slice(0,Math.max(0,room));
    if(!t)return;ta.setRangeText(t,ta.selectionStart,ta.selectionEnd,'end');
    ta.dispatchEvent(new Event('input',{bubbles:true}));
  });
  return I;
}
