/* ===== Полный набор: диакритика латиницы, расширенная кириллица, знаки на компонентах ===== */
const MK={};
/* Размеры знаков: толщина следует штриху, но размеры знака и отступ ограничены долями высоты прописной (C),
   чтобы в тяжёлых весах знаки не росли вместе со stem. cap — знак над прописной (компактнее). */
function mkDims(k,cap){const {S,H,w}=k,C=(k.p&&k.p.capH)||700;
  const t=Math.max(26,Math.min(H*1.0,S*0.62));
  const mw=Math.min(Math.max(S*1.55,k.h*0.36),Math.max(w*0.62,S*1.75),S*2.6+80,C*(cap?0.56:0.6));
  const mhMax=C*(cap?0.215:0.27),mh=Math.min(Math.max(t*2.1,H*1.9)*(cap?0.82:1),mhMax);
  /* Кодекс: отступ знака растёт со штрихом (в Bold/Black точки и акуты не садятся на засечки и флажки) */
  /* Вольт/Квадра: просвет между знаком и буквой = max(0.3·ствол, 40) от верха ФОРМЫ (с учётом свисания круглых): в Bold/Black знак не слипается с буквой */
  const gap=Math.max(30,C*(cap?0.06:0.075),CUR_FONT==='codex'?S*0.3:0,(CUR_FONT==='volt'||CUR_FONT==='kvadra'||CUR_FONT==='stroka')?Math.max(40,S*0.32)+(k.ov||0):0);
  const tw=Math.min(Math.max(S*0.52,t*1.35),mw*0.42);
  /* кольцо: высота ≤ 0.26C (прописные) / 0.3C, просвет не меньше ~40% размера */
  const rh=Math.min(Math.max(mh*1.12,t*2.6),C*(cap?0.255:0.3)),rw=Math.min(Math.max(rh*1.3,S*1.2),mw*0.7);
  const ds=Math.min(S*0.85,mw*0.42,mh*(cap?0.95:0.9));
  return {t,mw,mh,gap,tw,rh,rw,ds,C,cap,mh0:Math.max(t*2.1,H*1.9)*(cap?0.82:1)};}
function band(k,x0,y0,x1,y1,th){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,nx=-dy/L*th/2,ny=dx/L*th/2;
  return k.poly([[x0+nx,y0+ny],[x1+nx,y1+ny],[x1-nx,y1-ny],[x0-nx,y0-ny]]);}
MK.acute=(k,cx,y,d)=>[k.poly([[cx-d.mw*0.3,y],[cx-d.mw*0.3+d.tw,y],[cx+d.mw*0.32,y+d.mh],[cx+d.mw*0.32-d.tw,y+d.mh]])];
MK.grave=(k,cx,y,d)=>xf(MK.acute(k,cx,y,d),(x,yy)=>[2*cx-x,yy]);
MK.circ=(k,cx,y,d)=>{const a=d.mw*0.5,tw=d.tw*0.9;return [k.poly([[cx-a,y],[cx-a+tw,y],[cx+tw*0.5,y+d.mh],[cx-tw*0.5,y+d.mh]]),k.poly([[cx+a,y],[cx+a-tw,y],[cx-tw*0.5,y+d.mh],[cx+tw*0.5,y+d.mh]])];};
MK.caron=(k,cx,y,d)=>xf(MK.circ(k,cx,y,d),(x,yy)=>[x,2*y+d.mh-yy]);
MK.dier=(k,cx,y,d)=>{const s=d.ds,g=Math.max(s*0.55,30);return [k.dot(cx-g/2-s,y,s),k.dot(cx+g/2,y,s)];};
MK.dot=(k,cx,y,d)=>{const s=d.ds;return [k.dot(cx-s/2,y,s)];};
/* кольцо: бока по вертикали (S), верх/низ по горизонтали (H), но не толще трети размера */
MK.ring=(k,cx,y,d)=>{const W=d.rw,Hh=d.rh,tv=Math.min(Math.max(d.t*1.1,k.S*0.42),W*0.32),th=Math.min(d.t*0.95,Hh*0.3);
  return k.ring(cx-W/2,y,cx+W/2,y+Hh,[1,1,1,1],tv,th);};
MK.macron=(k,cx,y,d)=>[k.st(cx-d.mw*0.5,y+d.mh*0.25,cx+d.mw*0.5,y+d.mh*0.25+Math.min(d.t,d.mh*0.6))];
/* тильда: волна, вершины скруглены по round шрифта (Квадра — круглая, Вольт — мягче, фаска при kappa≈0) */
MK.tilde=(k,cx,y,d)=>{const a=d.mw*0.55,T=Math.min(d.t*1.1,d.mh*0.5),hh=Math.max(T*1.7,d.mh*0.82),amp=(hh-T)/2,lo=y+T/2,hi=lo+2*amp,
    x1=cx-a/3,x2=cx+a/3,rf=Math.max(0,Math.min(1,k.p.round==null?0.6:k.p.round)),R=a*0.62*rf,t=T/2;
  return [k.poly([[cx-a,lo+t],[x1,hi+t,R],[x2,lo+t,R],[cx+a,hi+t],[cx+a,hi-t],[x2,lo-t,R],[x1,hi-t,R],[cx-a,lo-t]])];};
MK.breve=(k,cx,y,d)=>GR.Breve(k,cx-d.mw*0.5,cx+d.mw*0.5,y);
MK.dacute=(k,cx,y,d)=>[...MK.acute(k,cx-d.mw*0.32,y,{...d,mw:d.mw*0.7,tw:d.tw*0.85}),...MK.acute(k,cx+d.mw*0.32,y,{...d,mw:d.mw*0.7,tw:d.tw*0.85})];
/* бреве: высота ограничена, как у прочих знаков */
GR.Breve=(k,x0,x1,y0)=>{const C=k.p.capH||700,cap=k.h>(k.p.xh||k.h)*1.05;let t=Math.min(Math.max(k.H*0.85,30),k.S*0.6);
  const hh=Math.min(t*2.4,C*(cap?0.2:0.25));t=Math.min(t,hh*0.46);
  return GRP(9,[...k.ring(x0,y0,x1,y0+hh*2,[1,1,1,1],Math.min(t*1.15,(x1-x0)*0.3),t),k.cut(x0-20,y0+hh,x1+20,y0+hh*2+20)[0]]);};
/* под строкой */
/* седиль: ствол вниз из нижнего штриха и крюк влево; внешний и внутренний угол скруглены по round (как хвост j/y) */
MK.ced=(k,cx,y,d)=>{const dsc=k.desc||210,th=Math.min(d.t*0.95,dsc*0.24),tv=Math.min(Math.max(d.t*1.1,k.S*0.42),k.S*0.55,dsc*0.4),
    dd=Math.min(dsc*0.74,Math.max(dsc*0.55,th*2.6)),xR=cx+tv/2,xs=cx-tv/2,xL=cx-Math.max(tv*1.5,Math.min(d.mw*0.36,tv*2.4)),
    rO=Math.max(0,Math.min(k.rad(xR-xL,dd*2),dd*0.75)),yTop=-dd+Math.max(rO*1.05,th*1.8),
    rI=rO>0?Math.max(2,Math.min(k.radIn(rO,xs-xL,dd),(dd-th)*0.9)):0,yA=Math.max(k.H*0.5,8);
  return [...GRP(11,[k.RR(xL,-dd,xR,yTop,[0,rO,0,0]),SUB(k.RR(xL-60,-dd+th,xs,yTop+60,[0,rI,0,0]))[0]]),k.st(xs,yTop-1,xR,yA)];};
MK.ogon=(k,cx,y,d)=>{const t=d.t*0.7,x=k.w-k.S*0.55,dh=Math.max(t*1.3,k.desc*0.27);return [k.st(x-t,-dh,x,t*0.3),k.st(x-t,-dh,x+t*1.5,-dh+t*0.9)];};
/* композиты: база + знак */
function compose(G,ch,base,marks,o){const B=G[base];if(!B)return;o=o||{};
  G[ch]={shape:g=>{const k=gk(g),cap=B.k!=='xh',d=mkDims(k,cap);const top=o.top!=null?o.top(k):(cap?k.p.capH:k.h);const y=top+d.gap;
      const cx=o.cx?o.cx(k):k.w/2;let out=[...B.shape(g)];for(const m of marks)out=out.concat(MK[m](k,cx,m==='ced'||m==='ogon'?0:y,d));
      if(o.extra)out=out.concat(o.extra(k,d));return out;},
    w:B.w,k:B.k,opt:B.opt||{}};}
const MARKOF={'À':'grave','Á':'acute','Â':'circ','Ã':'tilde','Ä':'dier','Å':'ring','Ā':'macron','Ă':'breve','Ç':'ced','Ć':'acute','Č':'caron',
  'È':'grave','É':'acute','Ê':'circ','Ë':'dier','Ē':'macron','Ė':'dot','Ě':'caron','Ì':'grave','Í':'acute','Î':'circ','Ï':'dier','Ī':'macron','İ':'dot',
  'Ñ':'tilde','Ń':'acute','Ň':'caron','Ò':'grave','Ó':'acute','Ô':'circ','Õ':'tilde','Ö':'dier','Ō':'macron','Ő':'dacute',
  'Ù':'grave','Ú':'acute','Û':'circ','Ü':'dier','Ū':'macron','Ů':'ring','Ű':'dacute','Ý':'acute','Ÿ':'dier','Ś':'acute','Ş':'ced','Š':'caron',
  'Ź':'acute','Ż':'dot','Ž':'caron','Ř':'caron','Ğ':'breve','Ď':'caron','Ť':'caron'};
for(const [u,l] of Object.entries(MARKOF)){const lo=u.toLowerCase();if(lo!==u)MARKOF[lo]=l;}
MARKOF['ş']='ced';MARKOF['ç']='ced';
const EXTLAT='ÀÁÂÃÄÅĀĂàáâãäåāăÇĆČçćčĎďĐđÈÉÊËĒĖĚĘèéêëēėěęĞğÌÍÎÏĪİĮìíîïīıįŁłÑŃŇñńňÒÓÔÕÖŌŐØòóôõöōőøŘřŚŞŠśşšŤťÙÚÛÜŪŮŰùúûüūůűÝŸýÿŹŻŽźżžĄąÆæŒœß';
const EXTCYR='ЃѓЌќЎўЂђЋћЉљЊњЏџҒғҚқҢңӨөҮүҰұҺһӘә';
function extendSet(G,font,grot){
  const base=c=>c.normalize('NFD')[0];
  for(const ch of EXTLAT){const m=MARKOF[ch];if(!m)continue;let b=base(ch);
    if(ch==='ı')continue;
    if('ìíîïī'.includes(ch))b='ı';
    if(!G[b])continue;compose(G,ch,b,[m]);}
  /* особые латинские */
  G['ı']={shape:g=>{const k=gk(g);return [k.st(0,0,k.S,k.h)];},w:G['i'].w,k:'xh',opt:G['i'].opt||{}};
  for(const [c,b] of [['ì','ı'],['í','ı'],['î','ı'],['ï','ı'],['ī','ı']])compose(G,c,b,[MARKOF[c]],{cx:k=>k.S/2});
  compose(G,'Ą','A',['ogon']);compose(G,'ą','a',['ogon']);compose(G,'Ę','E',['ogon']);compose(G,'ę','e',['ogon']);compose(G,'Į','I',['ogon'],{cx:k=>k.S/2});compose(G,'į','i',['ogon']);
  compose(G,'Ø','O',[],{extra:(k,d)=>[band(k,k.w*0.06,-k.h*0.06,k.w*0.94,k.h*1.06,d.t*1.15)]});
  compose(G,'ø','o',[],{extra:(k,d)=>[band(k,k.w*0.06,-k.h*0.08,k.w*0.94,k.h*1.08,d.t*1.1)]});
  compose(G,'Ł','L',[],{extra:(k,d)=>[band(k,-k.S*0.25,k.h*0.34,k.S*1.35,k.h*0.6,d.t*1.1)]});
  compose(G,'ł','l',[],{extra:(k,d)=>[band(k,-k.S*0.35,k.h*0.5,k.S*1.35,k.h*0.86,d.t*1.05)]});
  compose(G,'Đ','D',[],{extra:(k,d)=>[k.st(-k.S*0.3,k.h*0.46-d.t/2,k.S*1.55,k.h*0.46+d.t/2)]});
  compose(G,'đ','d',[],{extra:(k,d)=>{const y=k.h+(k.asc-k.h)*0.45;return [k.st(k.w-k.S*1.6,y,k.w+k.S*0.2,y+d.t)];}});
  /* ď ť ľ: апостроф справа вместо гачека */
  const apo=(k,d,x,top)=>[k.poly([[x,top-d.mh0*1.1],[x+d.tw*0.7,top-d.mh0*1.1],[x+d.tw*1.1,top],[x+d.tw*0.4,top]])];
  if(G['d'])G['ď']={shape:g=>{const k=gk(g),d=mkDims(k,false);return [...G['d'].shape(g),...apo(k,d,k.w+Math.max(24,k.S*0.25),k.asc)];},w:p=>(typeof G['d'].w==='function'?G['d'].w(p):G['d'].w*p.wdth/100)+p.stem*0.75,k:'xh',opt:{}};
  if(G['t'])G['ť']={shape:g=>{const k=gk(g),d=mkDims(k,false);return [...G['t'].shape(g),...apo(k,d,k.w*0.62,k.asc)];},w:G['t'].w,k:'xh',opt:{}};
  /* лигатуры-диграфы */
  const pair=(c,a,b,ov)=>{if(!G[a]||!G[b])return;G[c]={shape:g=>{const wa=g.w*0.5+g.S*ov,ga=Object.assign({},g,{w:wa}),gb=Object.assign({},g,{w:g.w-wa+g.S*ov});
      return [...G[a].shape(ga),...xf(G[b].shape(gb),(x,y)=>[x+wa-g.S*ov,y])];},w:p=>{const f=q=>typeof G[q].w==='function'?G[q].w(p):G[q].w*p.wdth/100;return f(a)+f(b)-p.stem*ov*0.5;},k:G[a].k,opt:{}};};
  if(grot){pair('Æ','A','E',0.6);pair('æ','a','e',0.6);pair('Œ','O','E',0.5);pair('œ','o','e',0.5);}
  else{pair('Æ','A','E',0.3);pair('æ','a','e',0.3);pair('Œ','O','E',0.3);pair('œ','o','e',0.3);}
  G['ß']={shape:g=>{const k=gk(g),{w,S,H}=k,a=k.asc,ym=a*0.55;
      return [k.st(0,0,S,a-S*0.5),...k.ring(0,ym-H/2,w*0.88,a+k.ov,[0,1,1,1]),...k.ring(0,-k.ov,w,ym+H/2,[0,1,1,0])];},w:G['b']?G['b'].w:560,k:'xh',opt:{}};
  /* кириллица */
  const fd=k=>Math.max(k.desc*0.62,k.H*1.5,90);
  compose(G,'Ѓ','Г',['acute']);compose(G,'ѓ','г',['acute']);compose(G,'Ќ','К',['acute']);compose(G,'ќ','к',['acute']);
  compose(G,'Ў','У',['breve']);compose(G,'ў','у',['breve']);
  compose(G,'Ғ','Г',[],{extra:(k,d)=>[k.st(-k.S*0.25,k.h*0.44,k.S*1.9,k.h*0.44+d.t)]});
  compose(G,'ғ','г',[],{extra:(k,d)=>[k.st(-k.S*0.25,k.h*0.44,k.S*1.9,k.h*0.44+d.t)]});
  compose(G,'Қ','К',[],{extra:k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,2)]});compose(G,'қ','к',[],{extra:k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,2)]});
  compose(G,'Ң','Н',[],{extra:k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,2)]});compose(G,'ң','н',[],{extra:k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,2)]});
  compose(G,'Ө','О',[],{extra:(k,d)=>[k.st(k.S-1,k.h/2-d.t/2,k.w-k.S+1,k.h/2+d.t/2)]});compose(G,'ө','о',[],{extra:(k,d)=>[k.st(k.S-1,k.h/2-d.t/2,k.w-k.S+1,k.h/2+d.t/2)]});
  if(G['Y'])G['Ү']=G['Y'];if(G['Y'])G['ү']={shape:g=>G['Y'].shape(g),w:G['y'].w,k:'xh',opt:{}};
  compose(G,'Ұ','Ү',[],{extra:(k,d)=>[k.st(k.w*0.18,k.h*0.28,k.w*0.82,k.h*0.28+d.t)]});compose(G,'ұ','ү',[],{extra:(k,d)=>[k.st(k.w*0.18,k.h*0.28,k.w*0.82,k.h*0.28+d.t)]});
  /* Џ/џ: как Ц — два ствола и нижняя перекладина, хвост по центру снизу, растёт из перекладины (одна часть) */
  if(grot){
    const dzhe=g=>{const k=gk(g),{w,h,S,H}=k,fd=k.fd(),tw=Math.max(S*0.62,H*1.1);
      return [k.st(0,0,S,h),k.st(w-S,0,w,h),k.st(0,0,w,H),k.st(w/2-tw/2,-fd,w/2+tw/2,H)];};
    if(G['П'])G['Џ']={shape:dzhe,w:G['П'].w,k:'cap',opt:G['П'].opt||{}};
    if(G['п'])G['џ']={shape:dzhe,w:G['п'].w,k:'xh',opt:G['п'].opt||{}};
  }else{
    const dzheU=(U,ch)=>g=>{const K=mkU(g,U,ch),{L,R,S,h}=K,dd=K.desc*0.5,by=K.sy*1.3,tw=S*0.72;
      return [...K.stem(L+S/2,0,h,'a',null),...K.stem(R-S/2,0,h,'a',null),K.rc(L,0,R,by),K.rc(K.cx-tw/2,-dd,K.cx+tw/2,by*0.6)];};
    if(G['П'])G['Џ']={shape:dzheU(true,'Џ'),w:G['П'].w,k:'cap',opt:{}};
    if(G['п'])G['џ']={shape:dzheU(false,'џ'),w:G['п'].w,k:'xh',opt:{}};
  }
  if(G['e']){G['ә']={shape:g=>ROT(G['e'].shape(g),g.w,g.h),w:G['e'].w,k:'xh',opt:{}};G['Ә']={shape:g=>ROT(G['e'].shape(g),g.w,g.h),w:G['О']?G['О'].w:640,k:'cap',opt:{}};}
  if(!grot){
    if(G['Ч'])G['Һ']={shape:g=>ROT(G['Ч'].shape(g),g.w,g.h),w:G['Ч'].w,k:'cap',opt:{}};
    if(G['h'])G['һ']=G['h'];
    if(G['Һ']){compose(G,'Ћ','Һ',[],{extra:(k,d)=>[k.st(-k.S*0.2,k.h-d.t,k.w*0.62,k.h)]});
      compose(G,'Ђ','Ћ',[],{extra:(k,d)=>[k.st(k.w-k.S*0.9,-Math.max(d.t*1.6,k.desc*0.4),k.w,k.h*0.2)]});}
    if(G['h']){compose(G,'ћ','h',[],{extra:(k,d)=>{const y=k.h+(k.asc-k.h)*0.45;return [k.st(-k.S*0.4,y,k.S*1.8,y+d.t)];}});
      compose(G,'ђ','ћ',[],{extra:(k,d)=>[k.st(k.w-k.S*0.9,-k.desc*0.6,k.w,k.h*0.3)]});}
    pair('Љ','Л','Ь',0.9);pair('љ','л','ь',0.9);pair('Њ','Н','Ь',0.9);pair('њ','н','ь',0.9);
  }
  if(grot){
    G['Һ']={shape:g=>{const k=gk(g),{w,h,S,H}=k,ya=h*0.62;return [k.st(0,0,S,h),...GRP(1,[...k.ring(0,0,w,ya,[0,0,1,0],null,null,[0,0,1,1]),k.cut(S,-80,w-S,H+1)[0],...k.ringJoins(0,0,w,ya,[0,0,1,1],1,1,0)])];},w:G['Н'].w,k:'cap',opt:{}};
    G['һ']=G['h'];
    const tshe=(g,hook,low)=>{const k=gk(g),{w,h,S,H}=k,xs=w*0.18,top=low?k.asc:h,ya=h*(low?1:0.62);
      const o=[k.st(xs,0,xs+S,top),...GRP(1,[...k.ring(xs,0,w,ya,[0,0,1,0],null,null,[0,0,1,1]),k.cut(xs+S,-80,w-S,H+1)[0],...k.ringJoins(xs,0,w,ya,[0,0,1,1],1,1,0)])];
      if(low)o.push(k.st(0,(h+top)/2,xs+S*1.9,(h+top)/2+H));else o.push(k.st(0,h-H,w*0.72,h));
      if(hook){const dd=low?k.desc*0.72:Math.max(H*1.4,k.desc*0.35);o.push(k.st(w-S,-dd,w,ya*0.5));o.push(k.st(w*0.5,-dd,w,-dd+H));}
      return o;};
    G['Ћ']={shape:g=>tshe(g,false,false),w:G['Н'].w,k:'cap',opt:{}};G['Ђ']={shape:g=>tshe(g,true,false),w:G['Н'].w,k:'cap',opt:{}};
    G['ћ']={shape:g=>tshe(g,false,true),w:G['h'].w,k:'xh',opt:{}};G['ђ']={shape:g=>tshe(g,true,true),w:G['h'].w,k:'xh',opt:{}};
    const withSoft=(g,leftFn,fr)=>{const k=gk(g),wl=g.w*fr,gl=Object.assign({},g,{w:wl});return [...leftFn(gl),...GR.softBowl(k,wl-k.S,g.w,k.h*0.56+k.H*0.5)];};
    G['Љ']={shape:g=>withSoft(g,GR.El,0.58),w:p=>(640+420)*p.wdth/100,k:'cap',opt:{}};
    G['љ']={shape:g=>withSoft(g,GR.El,0.58),w:p=>(590+380)*p.wdth/100,k:'xh',opt:{}};
    G['Њ']={shape:g=>withSoft(g,GR.H,0.6),w:p=>(660+420)*p.wdth/100,k:'cap',opt:{}};
    G['њ']={shape:g=>withSoft(g,GR.H,0.6),w:p=>(600+380)*p.wdth/100,k:'xh',opt:{}};
    /* знаки на компонентах */
    G['%']={shape:g=>{const k=gk(g),{w,h,S,H}=k,r=w*0.2,t=Math.max(H*0.8,S*0.45),hw=Math.min(k.dw(w*0.64,h)*0.9,w*0.3);
      return [...k.ring(0,h*0.56,r*2,h,[1,1,1,1],t,t*0.9),...k.ring(w-r*2,0,w,h*0.44,[1,1,1,1],t,t*0.9),k.dgC(w*0.18+hw*0.0,0,w*0.82,h,hw)];},w:G['%'].w,k:'cap',opt:G['%'].opt};
  }
  /* Й/й гротесков: бреве с тем же отступом и ограничением высоты, что у прочих знаков */
  if(grot)for(const c of 'Йй'){const B=G[c];if(!B)continue;
    G[c]=Object.assign({},B,{shape:g=>{const k=gk(g),{w,h}=k,d=mkDims(k,c==='Й'),bw=Math.min(w*0.5,k.S*2.6,d.mw),x0=(w-bw)/2;
      return [...GR.Ii(g),...GR.Breve(k,x0,x0+bw,h+d.gap)];}});}
  /* Ё/ё гротесков — те же точки, что у Ë/ë (один знак — одна система) */
  if(grot){compose(G,'Ё','E',['dier']);compose(G,'ё','e',['dier']);}
  if(G['Ï'])G['Ї']=G['Ï'];if(G['ï'])G['ї']=G['ï'];
  if(grot)G['°']={shape:g=>{const k=gk(g),t=Math.max(k.H*0.75,k.S*0.42),d=Math.max(k.S*1.7,t*3.4);return k.ring(0,k.p.capH-d,d,k.p.capH,[1,1,1,1],t,t*0.9);},w:p=>Math.max(p.stem*1.7,Math.max(p.hair*0.75,p.stem*0.42)*3.4),k:'cap',opt:{}};
  const add=Object.keys(G).filter(c=>(EXTLAT+EXTCYR).includes(c));
  for(const c of add)if(!font.CHARSET.includes(c))font.CHARSET.push(c);
  const gl=EXTLAT.split('').filter(c=>G[c]).join(''),gc=EXTCYR.split('').filter(c=>G[c]).join('');
  font.GROUPS=font.GROUPS.filter(x=>!/расширенн|диакритик/.test(x[0]));
  font.GROUPS.splice(font.GROUPS.length-2,0,['Латиница · диакритика',gl],['Кириллица · расширенная',gc]);
}
(function(){
  extendSet(FONTS.volt.GL,FONTS.volt,true);
  FONTS.kvadra.CHARSET=FONTS.volt.CHARSET.slice();FONTS.kvadra.GROUPS=FONTS.volt.GROUPS.map(x=>x.slice());
  extendSet(FONTS.codex.GL,FONTS.codex,false);
})();
