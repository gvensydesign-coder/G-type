/* ===== Диакритика на тонком и толстом штрихе: знаки, которые должны быть отдельными, не прилипают к основе,
   а слитые части не отрываются ни в одном весе (Light…Black) ===== */
(function(){
/* габарит части контура выше уровня y (ствол и засечка над перекладиной) */
function topBox(cs,y){let x1=-1e9,y1=-1e9;for(const c of cs){if(c.op==='sub'||c.hole)continue;for(const n of c.nodes){if(n.y>y){if(n.x>x1)x1=n.x;if(n.y>y1)y1=n.y;}}}return x1>-1e9?{x1,y1}:null;}
/* ť: апостроф справа от ствола t — всегда отдельный знак с зазором от ствола и перекладины;
   верх — у линии выносных (не ниже верха ствола), высота — как у гачека ď */
function tCaron(G,grot){const T=G['t'];if(!T)return;
  G['ť']={shape:g=>{const k=gk(g),d=mkDims(k,false),base=T.shape(g),h=k.h,gap=Math.max(30,k.S*0.2);
      const tb=topBox(base,h+2)||{x1:k.w*0.4,y1:h};
      const x0=Math.max(k.w*0.62,tb.x1+gap),y0=h+gap,top=Math.min(k.asc,Math.max(tb.y1,y0+d.mh0*1.1)),tw=d.tw;
      return [...base,k.poly([[x0,y0],[x0+tw*0.7,y0],[x0+tw*1.1,top],[x0+tw*0.4,top]])];},
    w:T.w,k:'xh',opt:{}};}
tCaron(FONTS.volt.GL,true);if(FONTS.kvadra.GL!==FONTS.volt.GL)tCaron(FONTS.kvadra.GL,true);
if(!FONTS.codex)return;
const G=FONTS.codex.GL;tCaron(G,false);
/* огонэк Кодекса: хвост растёт из нижнего штриха основы (у ноги A, у ствола a/I/i/u, под чашей e) и уходит вниз-вправо;
   верх хвоста заходит в штрих на половину его толщины, поэтому не отрывается при тонком пере */
const ogX={A:K=>K.R-K.S*0.5,a:K=>K.R-K.S*0.5,E:K=>K.cx+K.bw*0.2,e:K=>K.cx+K.bw*0.2,I:K=>K.cx,i:K=>K.cx};
const ogon=(K,x,yIn)=>{const {S,H}=K,t=Math.max(S*0.4,H*1.1,22),ty=Math.max(H*0.85,t*0.42,16),dd=Math.max(K.desc*0.42,ty*3),rx=Math.max(t*1.3,S*0.62),ry=dd/2;
  /* крюк: от точки крепления вниз-влево и обратно вправо к острому концу (как у классического огонэка) */
  return [K.rc(x-t*0.45,-ty*0.6,x+t*0.35,yIn),K.band(x,-ry,rx,ry,90,300,t,ty)];};
const withOg=(ch,base,U,bx)=>{const B=G[base];if(!B)return;
  G[ch]={shape:g=>{const K=mkU(g,U,ch),x=ogX[bx](K);return [...B.shape(g),...ogon(K,x,Math.max(K.sy*0.5,K.so>3?K.S*0.3:0,12))];},w:B.w,k:B.k,opt:{}};};
withOg('Ą','A',true,'A');withOg('ą','a',false,'a');withOg('Ę','E',true,'E');withOg('ę','e',false,'e');withOg('Į','I',true,'I');withOg('į','i',false,'i');
/* Ө ө: средняя черта от середины левой до середины правой стенки (а не от S — при малых засечках черта отрывалась) */
const fita=(ch,base,U)=>{const B=G[base];if(!B)return;G[ch]={shape:g=>{const K=mkU(g,U,ch),{L,R,h,sx,sy}=K;
  return [...B.shape(g),K.rc(L+sx*0.5,h/2-sy*0.45,R-sx*0.5,h/2+sy*0.45)];},w:B.w,k:B.k,opt:{}};};
fita('Ө','О',true);fita('ө','о',false);
})();
