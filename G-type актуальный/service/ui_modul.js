/* ===== «Модуль»: сетка модулей поверх знака в редакторе =====
   Только для шрифта modul и только при включённых направляющих: вертикали через треть ячейки (ячейка = 0.3·capH·wdth/100,
   знак в две ячейки = 6 колонок), горизонтали через capH/10, закрашен квадрат стенки m = stem в углу знака. */
(function(){
if(typeof drawGuides!=='function')return;
const _drawGuides=drawGuides;
drawGuides=function(c){
  const G=_drawGuides(c);
  try{
    if(CUR_FONT!=='modul'||!S.guides||!V||!(V.w>0))return G;
    const q=safeP(cur().p),U=q.capH/10,g=q.capH*0.3*q.wdth/100/3,acc=css('--sel');
    const y1=V.oy/V.sc,y2=(V.oy-V.ch)/V.sc,x1=(V.cw-V.ox)/V.sc;
    c.save();c.strokeStyle=acc;c.lineWidth=1;c.setLineDash([2,6]);c.globalAlpha=0.3;c.beginPath();
    for(let i=0;i*g<=V.w+1;i++){const a=toS(i*g,y1),b=toS(i*g,y2);c.moveTo(a[0]+.5,a[1]);c.lineTo(b[0]+.5,b[1]);}
    for(let j=0;j<=10;j++){const a=toS(-40,j*U),b=toS(V.w+40,j*U);c.moveTo(a[0],a[1]+.5);c.lineTo(b[0],b[1]+.5);}
    c.stroke();c.setLineDash([]);
    /* модуль: квадрат m × m в углу ячейки */
    const o=toS(0,0),e=toS(q.stem,q.stem);c.globalAlpha=0.16;c.fillStyle=acc;c.fillRect(o[0],e[1],e[0]-o[0],o[1]-e[1]);
    c.restore();
  }catch(e){try{c.restore();}catch(_){}}
  return G;};
})();
