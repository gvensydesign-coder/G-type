/* ===== Общие помощники режимов рисования («Свой знак» ui_custom.js и «Перо» ui_pen.js) =====
   Привязка курсора (шаг и направляющие, допуск в единицах шрифта), фиксация оси по Shift, шаг стрелок,
   отрисовка подсветки привязки, бледной заливки знака и ручек узла. Ничего не хранит. */
/* привязка: {p:[X,Y], hit:{x,y}|null}; tol — допуск «магнита» к направляющим в единицах шрифта */
function drSnapPt(x,y,alt,tol){
  if(alt)return {p:[x,y],hit:null};
  let X=x,Y=y,hit=null;
  if(S.snap){X=Math.round(x/S.snapStep)*S.snapStep;Y=Math.round(y/S.snapStep)*S.snapStep;}
  try{const G=gstate();let bx=tol,by=tol,gx=null,gy=null;
    for(const it of G.vg){const v=it.s+it.d,d=Math.abs(v-x);if(d<bx){bx=d;gx=v;}}
    for(const it of G.hg){const v=it.s+it.d,d=Math.abs(v-y);if(d<by){by=d;gy=v;}}
    if(gx!=null){X=gx;}if(gy!=null){Y=gy;}hit={x:gx,y:gy};}catch(e){}
  return {p:[X,Y],hit};}
/* Shift: soft — ось фиксируется, если смещение по одной оси вдвое больше другой (протяжка ручки); иначе — по преобладающей */
function drAxisLock(tx,ty,ox,oy,soft){
  const ax=Math.abs(tx-ox),ay=Math.abs(ty-oy);
  if(soft){if(ax>ay*2)ty=oy;else if(ay>ax*2)tx=ox;}
  else{if(ax>ay)ty=oy;else tx=ox;}
  return [tx,ty];}
/* стрелки: шаг 1 (Shift — 10); null, если клавиша не стрелка */
function drArrowStep(e){
  const k=e.key,s=e.shiftKey?10:1;
  return k==='ArrowLeft'?[-s,0]:k==='ArrowRight'?[s,0]:k==='ArrowUp'?[0,s]:k==='ArrowDown'?[0,-s]:null;}
/* подсветка направляющей, к которой прилип курсор */
function drPaintSnap(c,hit,acc){
  if(!hit)return;
  c.strokeStyle=acc;c.globalAlpha=.55;c.lineWidth=1;c.setLineDash([3,3]);
  if(hit.y!=null){const y=toS(0,hit.y)[1];c.beginPath();c.moveTo(V.rul,y+.5);c.lineTo(V.cw,y+.5);c.stroke();}
  if(hit.x!=null){const x=toS(hit.x,0)[0];c.beginPath();c.moveTo(x+.5,V.rul);c.lineTo(x+.5,V.ch);c.stroke();}
  c.setLineDash([]);c.globalAlpha=1;}
/* бледная заливка и контур знака под рисуемым */
function drPaintGhost(c,P){c.fillStyle='rgba(0,0,0,.12)';c.fill(P,'nonzero');c.strokeStyle='rgba(0,0,0,.34)';c.lineWidth=1;c.stroke(P);}
/* ручка узла: линия от узла q к ручке q2 и кружок */
function drPaintHandle(c,q,q2,hot,acc){
  c.strokeStyle=acc;c.lineWidth=1;c.beginPath();c.moveTo(q[0],q[1]);c.lineTo(q2[0],q2[1]);c.stroke();
  c.fillStyle=hot?acc:'#fff';c.strokeStyle=acc;c.beginPath();c.arc(q2[0],q2[1],3.8,0,7);c.fill();c.stroke();}
