/* ===== «Рывок» (Ryvok Display) v2 — чёрный плотный широкий гротеск с «лезвиями» прорыва =====
   Порядок (type-design-foundation): метрики и система штрихов → база: сверхтяжёлый широкий гротеск на компонентах
   (стволы с косым входом, перекладины со срезанными концами, квадратные кольца с узкими щелями-счётчиками, диагонали-параллелограммы)
   → лишь затем уникальный слой: 1–2 «лезвия» на глиф (K.wedge): конец горизонтали или стопа переходит в длинный острый клин
   с вогнутой верхней кромкой (мазок кисти). Лезвия — op:'post', основание вдвинуто на 2.4 ед. внутрь штриха.
   Правила: стопа (BL/BR) — левые и правые ножки; конец нижней перекладины/терминала (BL/BR на торце); верх (TL/TR) —
   только у части знаков. «Скорость» удлиняет левые клинки (blade), «Симметрия» выравнивает правые (sym) и даёт перспективу.
   Знаки оригинальные, юникейс: строчные = прописные. */
(function(){
const F={id:'ryvok',name:'Рывок',family:'Ryvok Display',tag:'Лезвия прорыва · тяжёлый дисплей',S0:196,GL:{},charset:'basic',
  desc:'Монументальный чёрный гротеск: тяжёлые широкие знаки, счётчики-щели, косые срезы и длинные лезвия, срывающиеся с ножек и концов перекладин. Пресеты — Прорыв, Симметрия, Скорость, Чистый. Прописные и строчные — один регистр.',
  sample:'ПРОРЫВ · BREAKTHROUGH'};
F.sampleText='БУДУЩЕЕ ТОКИО';
/* ---------- параметры ---------- */
if(!PARAMS.some(r=>r[0]==='spk'))PARAMS.push(
  ['cham','Фаска углов и срезов, %',0,100,1,'Шипы'],['spk','Лезвия: длина, %',0,100,1,'Шипы'],['fury','Ярость (острота), %',0,100,1,'Шипы'],
  ['lean','Наклон лезвий: вниз +, вдоль −',-100,100,1,'Шипы'],['spkU','Лезвия сверху, %',0,100,1,'Шипы'],['spkD','Лезвия на ножках, %',0,100,1,'Шипы'],
  ['spkS','Лезвия на концах перекладин, %',0,100,1,'Шипы'],['sym','Симметрия: правые лезвия, %',0,100,1,'Шипы'],['persp','Перспектива: трапеция',-60,60,1,'Динамика'],['blade','Скорость: удлинить левые, %',0,100,1,'Динамика']);
const RY=['cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade'];
const pv=(p,k,d)=>p[k]==null||!isFinite(+p[k])?d:+p[k];
/* ---------- размеры от параметров ---------- */
/* v3: лезвия растут из штриха — рог вдоль базовой линии (основание = толщина штриха, вогнутая кромка, острый кончик) */
function D(p){const h=p.capH,k=p.wdth/100,u=h*k,S=p.stem,H=p.hair;
  const spk=CL(pv(p,'spk',72),0,100)/100,fu=CL(pv(p,'fury',70),0,100)/100,bl=CL(pv(p,'blade',0),0,100)/100,sy=CL(pv(p,'sym',45),0,100)/100;
  const sU=CL(pv(p,'spkU',70),0,100)/100,sD=CL(pv(p,'spkD',100),0,100)/100,sS=CL(pv(p,'spkS',80),0,100)/100;
  const Lb=0.62*h*spk*(0.72+0.6*fu)*0.92,ln=CL(pv(p,'lean',85),-100,100)/100;
  const tw=36-8*fu,kk=1.6+0.8*fu;
  const dnf=L=>Math.min(L*(0.08+0.22*(ln+1)/2)*(1+0.7*bl),0.075*h*(1+3.6*bl));
  const upf=L=>Math.min(L*0.4,0.12*h);
  const Lbl=Math.min((0.5+0.22*bl)*h,Lb*sD*(1+1.3*bl)),Lbr=Math.min(0.46*h,Lb*sD)*(0.7+0.3*sy);
  const Lsl=Math.min((0.5+0.22*bl)*h,Lb*sS*(1+1.3*bl)),Lsr=Math.min(0.46*h,Lb*sS)*(0.7+0.3*sy);
  const Ltl=Math.min(0.3*h,Lb*sU*0.9),Ltr=Ltl*(0.7+0.3*sy);
  const fw=L=>CL(0.95*L,0.16*h,0.34*h),c=Math.min(S*0.0063*CL(pv(p,'cham',60),0,100),0.2*h);
  const A=(L,lf)=>L>=24?(lf?0.8:0.95)*L+6:0;
  const aBL=A(Lbl,1),aBR=A(Lbr),aSL=A(Lsl,1),aSR=A(Lsr),aTL=Ltl>=20?0.8*Ltl+6:0,aTR=Ltr>=20?0.95*Ltr+6:0;
  return {p,h,k,u,S,H,Hm:H*0.86,Lbl,Lbr,Lsl,Lsr,Ltl,Ltr,Dd:0,Dt:0,tw,kk,aBL,aBR,aSL,aSR,aTL,aTR,sy,bl,ln,dnf,upf,
    Dmax:dnf(Math.max(Lbl,Lsl,Lbr,Lsr)),Utop:upf(Math.max(Ltl,Ltr))+4,c,ci:c*0.55,e:Math.min(S*0.0034*CL(pv(p,'cham',60),0,100),0.3*S),gm:0.15*h,
    pers:CL(pv(p,"persp",0),-60,60)/100*0.4,ymid:h*0.51};}
const allow=(d,fl)=>({l:Math.max(fl.includes('l')?d.aBL:0,fl.includes('f')?d.aSL:0,fl.includes('L')?d.aTL:0),
  r:Math.max(fl.includes('r')?d.aBR:0,fl.includes('e')?d.aSR:0,fl.includes('R')?d.aTR:0)});
/* ---------- набор инструментов формы ---------- */
const mk=pts=>mkc(pts.map(q=>({x:q[0],y:q[1],a:null,b:null})),false);
const sub=c=>Object.assign(c,{op:'sub'}),post=c=>Object.assign(c,{op:'post'});
function kit(g,fl){const p=g.p,d=D(p),al=allow(d,fl||'');
  const K=Object.assign({g,p,d,fl},d);K.xl=al.l;K.W=Math.max(40,g.w-al.l-al.r);K.w=g.w;
  K.pg=mk;K.rc=(x0,y0,x1,y1)=>mk([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
  /* прямоугольник с фасками углов: [нл, нп, вп, вл] */
  K.ch=(x0,y0,x1,y1,a,b,c,e)=>{const o=[];
    if(a>0.5)o.push([x0,y0+a],[x0+a,y0]);else o.push([x0,y0]);
    if(b>0.5)o.push([x1-b,y0],[x1,y0+b]);else o.push([x1,y0]);
    if(c>0.5)o.push([x1,y1-c],[x1-c,y1]);else o.push([x1,y1]);
    if(e>0.5)o.push([x0+e,y1],[x0,y1-e]);else o.push([x0,y1]);return mk(o);};
  K.hole=(x0,y0,x1,y1,ci)=>{x1=Math.max(x1,x0+10);y1=Math.max(y1,y0+10);const c=Math.min(ci==null?K.ci:ci,(x1-x0)/2-3,(y1-y0)/2-3);return sub(K.ch(x0,y0,x1,y1,c,c,c,c));};
  K.cut=pts=>sub(mk(pts));
  /* ствол: косой вход сверху (левый угол выше), стопа слегка скошена вниз-влево */
  K.st=(x0,x1,y0,y1,tp,bt)=>{const et=tp?K.e:0,eb=bt?K.e*0.8:0;return mk([[x0,y0],[x1,y0+eb],[x1,y1-et],[x0,y1]]);};
  /* перекладина со скошенными торцами: l/r — косой срез (верхний угол выступает) */
  K.bar=(x0,x1,y0,y1,l,r)=>{const ec=Math.min(K.e*0.9,(y1-y0)*0.5,(x1-x0)*0.3);return mk([[x0+(l?ec:0),y0],[x1-(r?ec:0),y0],[x1,y1],[x0,y1]]);};
  K.dg=(xa,ya,xb,yb,hw)=>mk([[xa-hw/2,ya],[xa+hw/2,ya],[xb+hw/2,yb],[xb-hw/2,yb]]);
  K.hwOf=(dx,dy)=>K.S*Math.sqrt(1+(dx/dy)*(dx/dy))*0.97;
  /* --- лезвие (рог): основание a→b на торце штриха (a — прямая кромка, b — вогнутая), вершина T; n — единичный вектор внутрь штриха --- */
  K.wedge=(a,b,T,n)=>{const bx=b[0]-a[0],by=b[1]-a[1],w0=Math.hypot(bx,by);if(w0<8)return [];
    const sg=by>=0?1:-1,slp=Math.abs((T[1]-a[1])/((T[0]-a[0])||1)),tw=Math.min(K.tw*Math.min(2,Math.hypot(1,slp)),w0*0.5),kk=K.kk,e=2.4+60*Math.abs(K.pers);
    const A=t=>[a[0]+(T[0]-a[0])*t,a[1]+(T[1]-a[1])*t];
    const C=t=>{const f=Math.pow(1-t,kk),q=A(t);return [q[0]+bx*f,q[1]+by*f+sg*tw*(1-f)];};
    const T2=[T[0],T[1]+sg*tw];
    const ta=Math.hypot(T[0]-a[0],T[1]-a[1])||1,dp=Math.min(0.32*K.S,w0*0.8)+e;
    return [post(mk([[a[0]-(T[0]-a[0])/ta*e,a[1]-(T[1]-a[1])/ta*e],T,T2,C(0.85),C(0.7),C(0.5),C(0.3),C(0.12),[b[0]+n[0]*dp,b[1]+n[1]*dp]]))];};
  const fw=L=>CL(0.95*L,0.16*K.h,0.34*K.h);
  /* высота кончика над основанием: слева — вниз (dn) / вверх при sym, справа — вверх */
  K.tipL=L=>-K.dnf(L)*(1-K.sy)+K.upf(L)*K.sy;
  K.tipR=L=>K.upf(L)*(0.35+0.65*K.sy)-K.dnf(L)*(1-K.sy)*0.2;
  /* нижние рога: BL — влево от левой кромки (основание y..y+w), BR — вправо */
  K.BL=(x,y,L,w)=>{L=L==null?K.Lbl:L;if(L<24)return [];w=w||fw(L);return K.wedge([x,y],[x,y+w],[x-L,y+K.tipL(L)],[1,0]);};
  K.BR=(x,y,L,w)=>{L=L==null?K.Lbr:L;if(L<24)return [];w=w||fw(L);return K.wedge([x,y],[x,y+w],[x+L,y+K.tipR(L)],[-1,0]);};
  /* то же на торцах перекладин/терминалов (основание — весь торец) */
  K.SL=(x,y0,y1)=>{const L=K.Lsl;if(L<24)return [];return K.wedge([x,y0],[x,y1],[x-L,y0+K.tipL(L)],[1,0]);};
  K.SR=(x,y0,y1)=>{const L=K.Lsr;if(L<24)return [];return K.wedge([x,y0],[x,y1],[x+L,y0+K.tipR(L)],[-1,0]);};
  /* по косой кромке: p0 — нижний угол, p1 — точка выше по кромке */
  K.BLe=(p0,p1,L)=>{L=L==null?K.Lbl:L;if(L<24)return [];const w=fw(L),s=Math.min(1,w/(p1[1]-p0[1]));
    return K.wedge([p0[0]+0.3*K.S,p0[1]],[p0[0]+(p1[0]-p0[0])*s,p0[1]+(p1[1]-p0[1])*s],[p0[0]-L,p0[1]+K.tipL(L)],[1,0]);};
  K.BRe=(p0,p1,L,wv)=>{L=L==null?K.Lbr:L;if(L<24)return [];const w=wv||fw(L),s=Math.min(1,w/(p1[1]-p0[1]));
    return K.wedge([p0[0]-0.3*K.S,p0[1]],[p0[0]+(p1[0]-p0[0])*s,p0[1]+(p1[1]-p0[1])*s],[p0[0]+L,p0[1]+K.tipR(L)],[-1,0]);};
  /* верхние: TL — влево от верхнего левого конца (прямая верхняя кромка уходит вверх), TR — вправо */
  K.TL=(x,y,L,w)=>{L=L==null?K.Ltl:L;if(L<20)return [];w=w||K.H;return K.wedge([x,y],[x,y-w],[x-L,y+K.upf(L)],[1,0]);};
  K.TR=(x,y,L,w)=>{L=L==null?K.Ltr:L;if(L<20)return [];w=w||K.H;return K.wedge([x,y],[x,y-w],[x+L,y+K.upf(L)],[-1,0]);};
  return K;}
/* смещение в рамку знака + перспектива (трапеция): низ — полная ширина, верх уже (tau>0), либо наоборот */
function place(K,cs){const tau=K.pers,h=K.h,cx=K.w/2,xl=K.xl;
  return xf(cs,(x,y)=>{x+=xl;if(tau===0)return [x,y];const t=Math.max(-0.4,Math.min(1.5,y/h)),s=tau>=0?1-tau*t:1-Math.abs(tau)*(1-t);return [cx+(x-cx)*s,y];});}
const reg=(chs,build,wf,fl)=>{fl=fl||'';
  const e={shape:g=>{const K=kit(g,fl);return place(K,build(K));},w:p=>{const d=D(p),a=allow(d,fl);return Math.max(30,wf(d))+a.l+a.r;},k:'cap',opt:{}};
  for(const ch of chs)F.GL[ch]=e;};
/* ширины тела знака: доля ширины ячейки u и минимум по стволам/просветам */
const wd=(f,nst,extra)=>d=>Math.max(f*d.u,nst*d.S+(nst-1)*d.gm+(extra||0));
const W_N=wd(0.96,2),W_O=wd(1.0,2),W_E=wd(0.82,1,0.5*0+130),W_P=wd(0.94,2),W_A=wd(1.06,2,60),W_M=wd(1.4,3,60),W_W=wd(1.5,3,80),W_X=wd(1.0,2,40),W_S=wd(0.95,2),W_Z=wd(0.95,2);
/* ---------- общие построения ---------- */
const ring=(K,x0,y0,x1,y1,cs,tv,th,hc)=>[K.ch(x0,y0,x1,y1,cs[0],cs[1],cs[2],cs[3]),K.hole(x0+tv,y0+th,x1-tv,y1-th,hc)];
const barY=K=>[K.ymid-K.Hm/2,K.ymid+K.Hm/2];
const tvR=K=>K.S+Math.max(0.18*K.S,48);/* FX3: round wall = stem + horn flare (what an H stem measures at 0.25 cap), >= 1.18 stem */
const beakK=K=>Math.min(0.24*(K.h-2*K.H),K.S*0.5);
const bk3=K=>Math.min(beakK(K),0.45*(K.h*0.49-K.H-K.Hm/2));
const yBowl=K=>Math.max(K.h*0.58,2*K.H+0.1*K.h);
/* ================= ЛАТИНИЦА / КИРИЛЛИЦА (юникейс) ================= */
reg('AА',K=>{const {W,h,S,H}=K;let xt=W*0.27,hw=K.hwOf(xt,h);const ta=Math.max(hw*1.7,S*1.5);xt=(W-ta)/2;hw=K.hwOf(xt,h);
  const yb=h*0.22,xi=y=>hw+xt*y/h;
  return [K.dg(hw/2,0,xt+hw/2,h,hw),K.dg(W-hw/2,0,W-xt-hw/2,h,hw),K.rc(xi(yb)-6,yb,W-xi(yb)+6,yb+H),
    ...K.BLe([0,0],[xt,h]),...K.BRe([W,0],[W-xt,h])];},W_A,'lr');
/* B / В */
reg('BВ',K=>{const {W,h,S,H,c}=K,ym=K.ymid,Wt=W-S*0.18;
  return [K.ch(0,ym-K.Hm/2,Wt,h,0,0,c,0),K.ch(0,0,W,ym+K.Hm/2,0,c,c,0),
    K.hole(S,ym+K.Hm/2,Wt-S*1.05,h-H),K.hole(S,H,W-S*1.05,ym-K.Hm/2),...K.BL(0,0)];},W_P,'l');
/* P / Р */
reg('PР',K=>{const {W,h,S,H,c}=K,yb=h*0.36;
  return [K.rc(0,0,S,h),K.ch(0,yb,W,h,0,c,c,0),K.hole(S,yb+H,W-S*1.05,h-H),...K.BL(0,0)];},W_P,'l');
/* R */
reg('R',K=>{const {W,h,S,H,c}=K,yb=h*0.36,hl=S*1.08,xt=W*0.46;
  return [K.rc(0,0,S,h),K.ch(0,yb,W,h,0,c,c,0),K.hole(S,yb+H,W-S*1.05,h-H),K.dg(W-hl/2,0,xt,yb+H*0.6,hl),
    ...K.BL(0,0),...K.BRe([W,0],[xt+hl/2,yb+H*0.6])];},W_P,'lr');
/* C / С  и  Э */
const Cb=(K,mir)=>{const {W,h,S,H,c,ci}=K,bk=beakK(K),bw=S*0.95,ec=Math.min(K.e*1.2,(H+bk)*0.6);
  const pts=[[c,0],[W,0],[W,H+bk],[W-bw,H+bk],[W-bw,H],[S+ci,H],[S,H+ci],[S,h-H-ci],[S+ci,h-H],[W-bw,h-H],[W-bw,h-H-bk],[W,h-H-bk],[W-ec,h],[c,h],[0,h-c],[0,c]];
  const X=mir?x=>W-x:x=>x,o=[mk(pts.map(q=>[X(q[0]),q[1]]))];
  if(!mir)o.push(...K.SR(W,0,H+bk));else o.push(...K.SL(0,0,H+bk));
  return o;};
reg('CС',K=>Cb(K,false),wd(0.98,2),'e');
reg('Э',K=>Cb(K,true),wd(0.98,2),'f');
/* D */
reg('D',K=>{const {W,h,S,H,c}=K,cd=c*1.5;
  return [K.ch(0,0,W,h,0,cd,cd,0),K.hole(S,H,W-S*1.1,h-H),...K.BL(0,0)];},W_O,'l');
/* E / Е */
reg('EЕ',K=>{const {W,h,S,H}=K,[b0,b1]=barY(K),Wm=W*0.9;
  return [K.rc(0,0,S,h),K.bar(0,W,h-H,h,0,1),K.bar(0,Wm,b0,b1,0,1),K.rc(0,0,W,H),...K.TL(0,h),...K.SR(W,0,H)];},W_E,'Le');
/* F */
reg('F',K=>{const {W,h,S,H}=K,[b0,b1]=barY(K),Wm=W*0.84;
  return [K.rc(0,0,S,h),K.bar(0,W,h-H,h,0,1),K.bar(0,Wm,b0,b1,0,1),...K.TL(0,h)];},wd(0.8,1,130),'L');
/* G */
reg('G',K=>{const {W,h,S,H,c,ci}=K,bk=beakK(K),bw=S*0.95,yg=h*0.47;
  const pts=[[c,0],[W-c,0],[W,c],[W,yg],[W*0.5,yg],[W*0.5,yg-H],[W-S,yg-H],[W-S,H],[S+ci,H],[S,H+ci],[S,h-H-ci],[S+ci,h-H],[W-bw,h-H],[W-bw,h-H-bk],[W,h-H-bk],[W-K.e*1.2,h],[c,h],[0,h-c],[0,c]];
  return [mk(pts),...K.BR(W,c)];},wd(1.0,2),'r');
/* H / Н */
reg('HН',K=>{const {W,h,S,H}=K,[b0,b1]=barY(K);
  return [K.st(0,S,0,h,1,0),K.st(W-S,W,0,h,1,0),K.rc(S-2,b0,W-S+2,b1),...K.BL(0,0),...K.BR(W,0)];},W_N,'lr');
/* I */
reg('I',K=>[K.st(0,K.W,0,K.h,1,0),...K.BL(0,0,K.Lbl*0.8)],d=>d.S*1.02,'l');
/* J */
reg('J',K=>{const {W,h,S,H,c}=K,bk=beakK(K),bw=S*0.9;
  const pts=[[c,0],[W-c,0],[W,c],[W,h],[W-S,h-K.e],[W-S,H],[bw,H],[bw,H+bk],[0,H+bk],[0,c]];
  return [mk(pts),...K.SL(0,0,H+bk)];},wd(0.86,2),'f');
/* K / К */
reg('KК',K=>{const {W,h,S,H}=K,ym=K.ymid;const hw=S*1.15;
  return [K.st(0,S,0,h,1,0),K.dg(S*0.9,ym-H*0.3,W-hw/2,h,hw),K.dg(W-hw/2,0,S*1.1,ym+H*0.35,hw),
    ...K.BL(0,0),...K.BRe([W,0],[S*1.1+hw/2,ym+H*0.35],K.Lbr)];},W_X,'lr');
/* L */
reg('L',K=>{const {W,h,S,H}=K;
  return [K.pg([[0,0],[W,0],[W,H],[S,H],[S,h-K.e],[0,h]]),...K.SR(W,0,H)];},wd(0.8,1,130),'e');
/* M / М */
reg('MМ',K=>{const {W,h,S,H}=K,hw=K.hwOf(W/2-S*0.6,h*0.8)*0.95,yv=h*0.2;
  return [K.st(0,S,0,h,1,0),K.st(W-S,W,0,h,1,0),K.dg(W/2,yv,hw/2+S*0.15,h,hw),K.dg(W/2,yv,W-hw/2-S*0.15,h,hw),
    ...K.BR(W,0)];},W_M,'r');
/* N / И */
const Nb=(K,W0,mir,fl2)=>{const {h,S}=K,hw=K.hwOf(W0-S*1.3,h)*1.0;
  const o=[K.st(0,S,0,h,1,0),K.st(W0-S,W0,0,h,1,0)];
  o.push(mir?K.dg(hw/2,0,W0-hw/2,h,hw):K.dg(W0-hw/2,0,hw/2,h,hw));
  if(!fl2||fl2.includes('l'))o.push(...K.BL(0,0));if(!fl2||fl2.includes('r'))o.push(...K.BR(W0,0));return o;};
reg('N',K=>Nb(K,K.W,false),W_N,'lr');
reg('И',K=>Nb(K,K.W,true,'r'),W_N,'r');
/* Й: И + скоба */
/* FX3: marks scale with the stem. gap = max(0.3 stem, 40); breve ends are blocks >= 0.5 stem (Cyrillic breve: thick ends), middle >= 0.4 stem */
const mkGap=K=>Math.max(0.3*K.S,40);
const breve=(K,x0,x1,y0)=>{const te=0.5*K.S,m=0.4*K.S,dr=Math.max(0.06*K.h,40),yT=y0+te+dr,ew=(x1-x0)*0.3,xc=(x0+x1)/2;
  return mk([[x0,yT],[x0+ew,yT],[xc,y0+m],[x1-ew,yT],[x1,yT],[x1,yT-te],[xc,y0],[x0,yT-te]]);};
reg('Й',K=>{const {W,h,S}=K,gap=mkGap(K),bx=W*0.2;
  return [...Nb(K,W,true,'r'),breve(K,bx,W-bx,h+gap)];},W_N,'r');
/* O / О */
reg('OО',K=>{const {W,h,S,H,c}=K;
  return ring(K,0,0,W,h,[c,c,c,c],tvR(K),H);},W_O,'');
/* Q */
reg('Q',K=>{const {W,h,S,H,c}=K,hl=S*0.85;
  return [...ring(K,0,0,W,h,[c,c,c,c],tvR(K),H),K.dg(W*0.8,-h*0.13,W*0.5,H*0.8,hl)];},W_O,'');
/* S, 5 */
const Sb=(K,v)=>{
  const {W,h,S,H,c,ci}=K,ym=K.ymid,bk=bk3(K),bw=S*0.95,m0=ym-K.Hm/2,m1=ym+K.Hm/2,o=[];
  const ciU=Math.min(ci,0.4*(h-H-m1)),ciL=Math.min(ci,0.4*(m0-H));
  const upR=(beak)=>{const t=beak?h-H-bk:h-H;const pts=[[S,m1+ciU],[S+ciU,m1],[W+20,m1],[W+20,t]];if(beak)pts.push([W-bw,t],[W-bw,h-H]);
    pts.push([S+ciU,h-H],[S,h-H-ciU]);return K.cut(pts);};
  const loL=(beak)=>{const t=beak?H+bk:H;const pts=[[-20,m0],[W-S-ciL,m0],[W-S,m0-ciL],[W-S,H+ciL],[W-S-ciL,H]];if(beak)pts.push([bw,H],[bw,t],[-20,t]);else pts.push([-20,H]);return K.cut(pts);};
  if(v==='S'){o.push(K.ch(0,0,W,h,0,c,0,c),upR(true),loL(true),...K.SL(0,0,H+bk));}
  else{o.push(K.ch(0,0,W,h,0,K.e*1.2,0,0),upR(false),loL(true),...K.SL(0,0,H+bk));}
  return o;};
reg('S',K=>Sb(K,'S'),W_S,'f');
/* T / Т */
reg('TТ',K=>{const {W,h,S,H}=K,xs=W/2-S/2;
  return [K.rc(0,h-H,W,h),K.st(xs,xs+S,0,h-H+2,0,1),...K.TL(0,h,K.Ltl*0.9,H),...K.TR(W,h,K.Ltr*0.9,H)];},wd(0.96,1,180),'LR');
/* U */
reg('U',K=>{const {W,h,S,H,c}=K;
  return [K.ch(0,0,W,h,c,c,0,0),K.cut([[S+K.ci,H],[W-S-K.ci,H],[W-S,H+K.ci],[W-S,h+20],[S,h+20],[S,H+K.ci]]),...K.BR(W,c)];},W_N,'r');
/* V */
reg('V',K=>{const {W,h,S}=K,hw=K.hwOf(W/2-S*0.4,h)*0.98;
  return [K.dg(W/2,0,hw/2,h,hw),K.dg(W/2,0,W-hw/2,h,hw),];},wd(1.02,2));
/* W */
reg('W',K=>{const {W,h,S}=K,b1=W*0.27,b2=W-b1,xc=W/2,hw=K.hwOf(b1-S*0.5,h)*0.92;
  return [K.dg(b1,0,hw/2,h,hw),K.dg(b1,0,xc,h,hw),K.dg(b2,0,xc,h,hw),K.dg(b2,0,W-hw/2,h,hw),];},W_W);
/* X / Х */
reg('XХ',K=>{const {W,h,S}=K,hw=K.hwOf(W-S*1.5,h)*0.9;
  return [K.dg(hw/2,0,W-hw/2,h,hw),K.dg(W-hw/2,0,hw/2,h,hw),...K.BLe([0,0],[W-hw,h]),...K.BRe([W,0],[hw,h])];},W_X,'lr');
/* Y */
reg('Y',K=>{const {W,h,S}=K,yj=h*0.46,hw=K.hwOf(W/2-S*0.5,h-yj)*0.95,xs=W/2-S/2;
  return [K.dg(hw/2,h,W/2,yj,hw),K.dg(W-hw/2,h,W/2,yj,hw),K.st(xs,xs+S,0,yj+hw*0.1,0,1)];},W_X);
/* Z */
reg('Z',K=>{const {W,h,S,H}=K,hw=K.hwOf(W-S*1.4,h-H)*0.95;
  return [K.rc(0,h-H,W,h),K.rc(0,0,W,H),K.dg(hw/2+W*0.02,H*0.4,W-hw/2-W*0.02,h-H*0.4,hw),...K.TL(0,h,K.Ltl,H),...K.SR(W,0,H)];},W_Z,'Le');
/* ---------- Кириллица: собственные формы ---------- */
const bowlLow=(K,x0,x1,yb)=>{const {S,H,c}=K;
  return [K.ch(x0,0,x1,yb,0,c,c,0),K.hole(x0+S,H,x1-S*1.05,yb-H)];};
reg('П',K=>{const {W,h,S,H}=K;
  return [K.st(0,S,0,h,0,0),K.st(W-S,W,0,h,0,0),K.rc(0,h-H,W,h),...K.BL(0,0),...K.BR(W,0)];},W_N,'lr');
reg('Б',K=>{const {W,h,S,H}=K,yb=yBowl(K);
  return [K.rc(0,0,S,h),K.bar(0,W,h-H,h,0,1),...bowlLow(K,0,W,yb),...K.TL(0,h)];},wd(0.92,2),'L');
reg('Г',K=>{const {W,h,S,H}=K;
  return [K.pg([[0,0],[S,0],[S,h-H],[W,h-H],[W-K.e*0.9,h],[0,h]]),...K.TL(0,h)];},wd(0.78,1,130),'L');
const Lb=K=>{const {W,h,S,H}=K,hw=K.hwOf(W*0.5-S*0.5,h)*0.98,xt=W*0.5;
  return [K.st(W-S,W,0,h,1,0),K.rc(xt-hw/2,h-H,W,h),K.dg(hw/2,0,xt,h,hw),...K.BLe([0,0],[xt-hw/2,h])];};
reg('Л',Lb,wd(0.98,2),'l');
reg('Д',K=>{const {W,h,S,H}=K,fd=h*0.12,hw=K.hwOf(W*0.4,h)*0.98,xt=W*0.5,fw=Math.min(S*0.9,hw);
  return [K.st(W-S-10,W-10,0,h,1,0),K.rc(xt-hw/2,h-H,W-10,h),K.dg(hw/2+10,0,xt,h,hw),K.rc(0,0,W,H),K.rc(0,-fd,fw,H),K.rc(W-fw,-fd,W,H),
    ...K.BL(0,-fd,K.Lbl*0.8,fd+H*0.9),...K.BR(W,-fd,K.Lbr,fd+H*0.9)];},wd(1.06,3,-60),'lr');
reg('Ж',K=>{const {W,h,S}=K,hw=K.hwOf(W-S*1.3,h)*0.84,xs=W/2-S/2;
  return [K.dg(hw/2,0,W-hw/2,h,hw),K.dg(W-hw/2,0,hw/2,h,hw),K.st(xs,xs+S,0,h,1,0),...K.BLe([0,0],[W-hw,h]),...K.BRe([W,0],[hw,h])];},wd(1.4,3,90),'lr');
reg('Ч',K=>{const {W,h,S,H}=K,yb=h*0.30;
  return [K.st(0,S,yb,h,1,0),K.st(W-S,W,0,h,1,0),K.rc(0,yb,W-S+2,yb+H),...K.BR(W,0)];},wd(0.98,2),'r');
const Sh=K=>{const {W,h,S,H}=K,xm=(W-S)/2;const o=[K.st(0,S,0,h,1,0),K.st(xm,xm+S,0,h,1,0),K.st(W-S,W,0,h,1,0),K.rc(0,0,W,H)];
  o.push(...K.BR(W,0));return o;};
reg('Ш',Sh,wd(1.4,3,0),'r');
reg('Щ',K=>{const {W,h,S,H}=K,fd=h*0.3;return [...Sh(K).filter(c=>c.op!=='post'),K.rc(W-S*1.3,-fd,W,H),...K.BR(W,-fd,K.Lbr,fd+H*0.9)];},wd(1.4,3,0),'r');
reg('Ц',K=>{const {W,h,S,H}=K,fd=h*0.3;
  return [K.st(0,S,0,h,1,0),K.st(W-S,W,0,h,1,0),K.rc(0,0,W,H),K.rc(W-S*1.3,-fd,W,H),...K.BR(W,-fd,K.Lbr,fd+H*0.9)];},W_N,'r');
reg('Ь',K=>{const {W,h,S}=K,yb=yBowl(K);return [K.st(0,S,0,h,1,0),...bowlLow(K,0,W,yb),...K.BL(0,0)];},wd(0.95,2),'l');
reg('Ъ',K=>{const {W,h,S,H}=K,yb=yBowl(K),a=Math.max(S*1.2,W*0.3);
  return [K.pg([[0,h-H],[a+S,h-H],[a+S,h],[0,h]]),K.rc(a,0,a+S,h),...bowlLow(K,a,W,yb),...K.TL(0,h,K.Ltl,H),...K.BL(a,0)];},wd(1.22,3,-30),'lL');
reg('Ы',K=>{const {W,h,S}=K,yb=yBowl(K),gap=Math.max(36,K.h*0.06),Wb=W-S-gap;
  return [K.st(0,S,0,h,1,0),K.st(W-S,W,0,h,1,0),...bowlLow(K,0,Wb,yb),...K.BL(0,0)];},wd(1.28,3,60),'l');
reg('У',K=>{const {W,h,S}=K,hw=K.hwOf(W*0.7,h)*0.97,xb=Math.max(hw/2,W*0.26),y1=h*0.46,xl=y=>xb+(W-hw/2-xb)*y/h;
  return [K.dg(xb,0,W-hw/2,h,hw),K.dg(hw/2,h,xl(y1),y1,hw)];},W_X);
reg('Ф',K=>{const {W,h,S,H,c}=K,y0=h*0.17,y1=h*0.83,xs=W/2-S/2;
  return [...ring(K,0,y0,W,y1,[c,c,c,c],tvR(K),H),post(K.st(xs,xs+S,0,h,1,0))];},wd(1.3,3,70),'');
reg('Ю',K=>{const {W,h,S,H,c}=K,[b0,b1]=barY(K),wr=Math.max(W*0.66,2*S+K.gm),x0=W-wr;
  return [K.st(0,S,0,h,1,0),K.rc(S-2,b0,x0+2,b1),...ring(K,x0,0,W,h,[c,c,c,c],tvR(K),H),...K.BL(0,0)];},wd(1.5,4,0),'l');
reg('Я',K=>{const {W,h,S,H,c}=K,yb=h*0.36,hl=S*1.08,xt=W*0.54;
  return [K.st(W-S,W,0,h,1,0),K.ch(0,yb,W,h,0,0,0,c),K.hole(S*1.05,yb+H,W-S,h-H),K.dg(hl/2,0,xt,yb+H*0.6,hl),
    ...K.BR(W,0)];},W_P,'r');
reg('Ё',K=>{const {W,h,S,H}=K,[b0,b1]=barY(K),Wm=W*0.9,ds=Math.min(0.8*S,(W-40)/2.9),yd=h+mkGap(K),dg=0.9*ds,dx0=(W-2*ds-dg)/2;
  return [K.rc(0,0,S,h),K.bar(0,W,h-H,h,0,1),K.bar(0,Wm,b0,b1,0,1),K.rc(0,0,W,H),K.rc(dx0,yd,dx0+ds,yd+ds),K.rc(dx0+ds+dg,yd,dx0+2*ds+dg,yd+ds),
    ...K.TL(0,h),...K.SR(W,0,H)];},W_E,'Le');
function Sb3(K,flat){const {W,h,S,H,c,ci}=K,ym=K.ymid,bk=bk3(K),bw=S*0.95,m0=ym-K.Hm/2,m1=ym+K.Hm/2,xb=W*0.3;
  const ciU=Math.min(ci,0.4*(h-H-m1)),ciL=Math.min(ci,0.4*(m0-H));
  const upL=flat?K.cut([[-20,m1],[W-S-ciU,m1],[W-S,m1+ciU],[W-S,h-H-ciU],[W-S-ciU,h-H],[-20,h-H]]):K.cut([[-20,m1],[W-S-ciU,m1],[W-S,m1+ciU],[W-S,h-H-ciU],[W-S-ciU,h-H],[bw,h-H],[bw,h-H-bk],[-20,h-H-bk]]);
  const loL=flat?K.cut([[-20,m0],[W-S-ciL,m0],[W-S,m0-ciL],[W-S,H+ciL],[W-S-ciL,H],[-20,H]]):K.cut([[-20,m0],[W-S-ciL,m0],[W-S,m0-ciL],[W-S,H+ciL],[W-S-ciL,H],[bw,H],[bw,H+bk],[-20,H+bk]]);
  return [K.ch(0,0,W,h,0,c,c,0),upL,loL,K.cut([[-20,m0-2],[xb,m0-2],[xb,m1+2],[-20,m1+2]]),...(flat?K.TL(0,h):K.SL(0,0,H+bk))];}
reg('З',K=>Sb3(K),W_S,'f');
/* ---------- цифры ---------- */
reg('0',K=>{const {W,h,S,H,c}=K;return ring(K,0,0,W,h,[c,c,c,c],tvR(K),H);},wd(0.9,2),'');
reg('1',K=>{const {W,h,S,H}=K,x1=W-S,yf=h*0.78;
  return [K.st(x1,W,0,h,0,0),K.pg([[x1+2,h],[0,yf],[0,yf-H],[x1+2,h-H*1.7]]),...K.BL(x1,0)];},d=>Math.max(0.6*d.u,2.3*d.S),'l');
reg('2',K=>{const {W,h,S,H,c,ci}=K,ym=K.ymid,bk=bk3(K),bw=S*0.95,m0=ym-K.Hm/2,m1=ym+K.Hm/2;
  const ciU=Math.min(ci,0.4*(h-H-m1)),ciL=Math.min(ci,0.4*(m0-H));
  const upL=K.cut([[-20,m1],[W-S-ciU,m1],[W-S,m1+ciU],[W-S,h-H-ciU],[W-S-ciU,h-H],[bw,h-H],[bw,h-H-bk],[-20,h-H-bk]]);
  const loR=K.cut([[S,m0-ciL],[S+ciL,m0],[W+20,m0],[W+20,H],[S+ciL,H],[S,H+ciL]]);
  return [K.ch(0,0,W,h,0,0,c,0),upL,loR,...K.SR(W,0,H)];},W_S,'e');
/* FX3: 3 = flat-top three with a horn on the top bar (З keeps the beak terminal) */
reg('3',K=>Sb3(K,true),wd(0.86,2),'L');
reg('4',K=>{const {W,h,S,H}=K,xs=W*0.62,yb=h*0.2,hw=K.hwOf(xs-S*0.3,h-yb)*0.7;
  return [K.st(xs,xs+S,0,h,0,0),K.rc(0,yb,W,yb+H),K.dg(hw/2,yb,xs+S-hw/2,h,hw),...K.BL(xs,0,Math.min(K.Lbl,xs*0.7),yb*0.5)];},wd(1.08,2,0),'l');
reg('5',K=>Sb(K,'5'),W_S,'f');
const sixB=K=>{const {W,h,S,H,c,ci}=K,bk=Math.min(beakK(K),0.45*(K.h-H-Math.max(K.h*0.56,2*H+0.12*K.h))),bw=S*0.95,yB=Math.max(h*0.56,2*H+0.12*h),t=h-H-bk;
  return [K.ch(0,0,W,h,c,c,0,c),K.cut([[S,yB],[W+20,yB],[W+20,t],[W-bw,t],[W-bw,h-H],[S+ci,h-H],[S,h-H-ci]]),K.hole(S,H,W-S*1.05,yB-H)];};
reg('6',K=>[...sixB(K),...K.BL(0,K.c)],W_S,'l');
reg('9',K=>{const {W,h}=K;return [...ROT(sixB(K),W,h),...K.BR(W,K.c)];},W_S,'r');
reg('8',K=>{const {W,h,S,H,c}=K,ym=K.ymid;
  return [K.ch(0,0,W,h,c,c,c,c),K.hole(S,ym+K.Hm/2,W-S,h-H),K.hole(S,H,W-S,ym-K.Hm/2)];},wd(0.94,2),'');
reg('7',K=>{const {W,h,S,H}=K,hw=K.hwOf(W*0.6,h)*0.95;
  return [K.rc(0,h-H,W,h),K.dg(W*0.3,0,W-hw/2,h-H*0.5,hw),...K.TL(0,h,K.Ltl,H),...K.BLe([W*0.3-hw/2,0],[W-hw,h-H*0.5])];},wd(0.9,1,180),'lL');
/* ---------- знаки ---------- */
reg('.',K=>[K.rc(0,0,K.W,K.W)],d=>d.S*0.95,'x');
reg(',',K=>{const w=K.W;return [K.rc(0,0,w,w),K.pg([[w*0.12,3],[w*0.88,3],[w*0.15,-w*0.75]])];},d=>d.S*0.95,'x');
reg(':',K=>{const w=K.W;return [K.rc(0,0,w,w),K.rc(0,K.h*0.5-w*0.3,w,K.h*0.5+w*0.7)];},d=>d.S*0.95,'x');
reg(';',K=>{const w=K.W;return [K.rc(0,K.h*0.5-w*0.3,w,K.h*0.5+w*0.7),K.rc(0,0,w,w),K.pg([[w*0.12,3],[w*0.88,3],[w*0.15,-w*0.75]])];},d=>d.S*0.95,'x');
reg('!',K=>{const w=K.W,d=w*0.92;return [K.pg([[0,K.h],[w,K.h],[w*0.78,w*1.7],[w*0.22,w*1.7]]),K.rc(w*0.04,0,w*0.04+d,d)];},d=>d.S*1.02,'x');
reg('?',K=>{const {W,h,S,H}=K,xc=W/2,ds=S*0.92,y0=h*0.52;
  return [K.rc(0,h-H,W,h),K.rc(0,h-H-Math.min(0.2*h,S*0.6),Math.min(S*0.95,W*0.3),h),K.rc(W-S,y0,W,h),K.rc(xc-S/2,y0,W,y0+H),K.rc(xc-S/2,ds+Math.max(40,H*0.4),xc+S/2,y0+H),K.rc(xc-ds/2,0,xc+ds/2,ds)];},wd(0.84,2,0),'x');
reg('"',K=>{const w=K.W,a=w*0.4,y=K.h*0.62;return [K.pg([[0,K.h],[a,K.h],[a*0.75,y],[a*0.25,y]]),K.pg([[w-a,K.h],[w,K.h],[w-a*0.25,y],[w-a*0.75,y]])];},d=>d.S*1.7,'x');
reg("'",K=>{const w=K.W,y=K.h*0.62;return [K.pg([[0,K.h],[w,K.h],[w*0.75,y],[w*0.25,y]])];},d=>d.S*0.62,'x');
const dash=f=>K=>{const w=K.W,hh=K.H*0.9,y=K.ymid;return [K.bar(0,w,y-hh/2,y+hh/2,1,1)];};
/* FX3: hyphen < en < em, minus = figure width (0.9u) and shorter than the em dash */
reg('-',dash(),d=>Math.max(d.S*1.1,d.u*0.3),'x');reg('–',dash(),d=>Math.max(d.S*1.7,d.u*0.52),'x');reg('—',dash(),d=>Math.max(d.S*2.9,d.u*1.12),'x');
const parL=K=>{const {W,h,S,H,c}=K,t=h*1.06,b=-h*0.06,s=S*0.8,a=H*0.8;return [K.pg([[0,b+c*0.5],[c*0.5,b],[W,b],[W,b+a],[s,b+a],[s,t-a],[W,t-a],[W,t],[c*0.5,t],[0,t-c*0.5]])];};
reg('(',parL,d=>Math.max(d.S*1.7,d.u*0.36),'x');reg(')',K=>MIRX(parL(K),K.W),d=>Math.max(d.S*1.7,d.u*0.36),'x');
reg('/',K=>{const {W,h,S}=K,hw=S*0.9;return [K.dg(hw/2,0,W-hw/2,h,hw)];},d=>Math.max(d.u*0.5,d.S*2.2),'x');
const gu=(K,left)=>{const {S,h}=K,m=h*0.5,t=S*0.8,a=Math.min(h*0.17,S*1.3),dx=t*1.2,sk=[];
  for(let i=0;i<2;i++){const x=i*(t*1.4+dx*0.2);sk.push(K.pg([[x+dx,m+a],[x+dx+t,m+a],[x+t,m],[x+dx+t,m-a],[x+dx,m-a],[x,m]]));}
  return left?sk:MIRX(sk,K.W);};
reg('«',K=>gu(K,true),d=>d.S*3.6,'x');reg('»',K=>gu(K,false),d=>d.S*3.6,'x');
/* типографские знаки: запятая (блок + треугольный хвост) поднимается к верху прописных; ‘ — поворот на 180°; пары — два знака */
const qmW=d=>d.S*0.7;
const qmDims=w=>({bh:w*0.8,tl:w*0.85});
const qm=(K,x0,w,yTop)=>{const {bh,tl}=qmDims(w),yb=yTop-bh;
  return [K.rc(x0,yb,x0+w,yTop),K.pg([[x0+w*0.12,yb+3],[x0+w*0.88,yb+3],[x0+w*0.15,yb-tl]])];};
const qmOpen=(K,x0,w,yTop)=>{const {bh,tl}=qmDims(w),yc=(yTop+yTop-bh-tl)/2;return ROT(qm(K,x0,w,yTop),2*x0+w,2*yc);};
reg('’',K=>qm(K,0,K.W,K.h),d=>qmW(d));
reg('‘',K=>qmOpen(K,0,K.W,K.h),d=>qmW(d));
reg('”',K=>{const w=qmW(K.d);return [...qm(K,0,w,K.h),...qm(K,K.W-w,w,K.h)];},d=>qmW(d)*2.5);
reg('“',K=>{const w=qmW(K.d);return [...qmOpen(K,0,w,K.h),...qmOpen(K,K.W-w,w,K.h)];},d=>qmW(d)*2.5);
reg('„',K=>{const w=qmW(K.d),t=qmDims(w).bh;return [...qm(K,0,w,t),...qm(K,K.W-w,w,t)];},d=>qmW(d)*2.5);
/* … : три квадрата точки, зазор вдвое уже, чем у трёх набранных точек */
reg('…',K=>{const z=K.S*0.95,g=(K.W-3*z)/2;return [0,1,2].map(i=>K.rc(i*(z+g),0,i*(z+g)+z,z));},d=>d.S*0.95*3.7);
/* − : горизонталь знака «+» на оси цифр, толщина дефиса, ширина цифры */
reg('−',dash(),wd(0.9,2),'');
reg('&',K=>{const {W,h,S,H,c}=K,Wl=W*0.84,yl=Math.max(h*0.56,2*H+0.14*h),Wu=Math.min(W*0.94,Math.max(W*0.66,1.9*S+0.1*h)),yu=yl-H,hl=S*1.0;
  return [...ring(K,0,0,Wl,yl,[c,c,c,c],tvR(K),H),...ring(K,W*0.04,yu,W*0.04+Wu,h,[c,c,c,c],S*0.95,H*0.9),K.dg(W*0.46,h*0.4,W-hl/2,0,hl),...K.BRe([W,0],[W*0.46+hl/2,h*0.4],null,H*0.8)];},d=>Math.max(1.08*d.u,(2.1*d.S+0.1*d.h)/0.84),'r');
reg('№',K=>{const {W,h,S,H,c}=K,wn=Math.max(W*0.62,2*S+K.gm*0.7),xo=wn+W*0.05,wo=W-xo,ho=h*0.5,hh=Math.min(S*0.7,wo*0.3);
  return [...Nb(K,wn,false),...ring(K,xo,h-ho,W,h,[c*0.6,c*0.6,c*0.6,c*0.6],hh,hh*0.9),K.rc(xo,0,W,K.H*0.7)];},wd(1.46,3,40),'lr');
/* ---------- CS68: · • ° © ₽ @ # % * + = \ | — те же блоки: прямоугольные плиты, косые полосы, срезы ---------- */
reg('·',K=>{const w=K.W;return [K.rc(0,K.h*0.34-w/2,w,K.h*0.34+w/2)];},d=>d.S*0.95,'x');
reg('•',K=>{const w=K.W;return [K.rc(0,K.h*0.46-w/2,w,K.h*0.46+w/2)];},d=>d.S*1.7,'x');
reg('°',K=>{const {W,h,S,c}=K,s=W,t=Math.min(S*0.62,s*0.3);return ring(K,0,h-s,s,h,[c*0.5,c*0.5,c*0.5,c*0.5],t,t,2);},d=>d.S*1.9,'x');
reg('+',K=>{const {W,h,S,H}=K,ym=h*0.47,a=Math.min(W/2,ym-30,h-ym-30),v=Math.min(S*0.9,H*0.9),t=H*0.8;return [K.rc(W/2-v/2,ym-a,W/2+v/2,ym+a),K.bar(0,W,ym-t/2,ym+t/2,1,1)];},d=>Math.max(d.S*3.2,d.u*0.62),'x');
reg('=',K=>{const {W,h,H}=K,g=Math.max(H*1.1,h*0.12),ym=h*0.47,t=H*0.8;return [K.bar(0,W,ym+g/2,ym+g/2+t,1,1),K.bar(0,W,ym-g/2-t,ym-g/2,1,1)];},d=>Math.max(d.S*3.0,d.u*0.58),'x');
reg('\\',K=>{const {W,h,S}=K,hw=S*0.9;return [K.dg(W-hw/2,0,hw/2,h,hw)];},d=>Math.max(d.u*0.5,d.S*2.2),'x');
reg('|',K=>[K.rc(0,-K.h*0.08,K.W,K.h*0.98)],d=>d.S*1.0,'x');
reg('©',K=>{const {W,h,S,H,c}=K,hh=h*0.9,y0=(h-hh)/2,t=Math.min(S*0.95,W*0.17),th=Math.min(H*1.1,hh*0.15),ix=W*0.3,iy=h*0.32,iw=W*0.4,ih=h*0.36,b=Math.min(S*0.5,iw*0.3),bh=Math.min(H*0.5,ih*0.3);
  return [...ring(K,0,y0,W,y0+hh,[c,c,c,c],t,th,2),post(K.rc(ix,iy,ix+b,iy+ih)),post(K.rc(ix,iy+ih-bh,ix+iw,iy+ih)),post(K.rc(ix,iy,ix+iw,iy+bh))];},wd(1.05,2,80),'x');
reg('₽',K=>{const P=F.GL['Р'].shape(K.g),{W,h,H}=K;return [...P,K.rc(-K.S*1.05,h*0.4,W*0.86,h*0.4+H*0.6)];},d=>F.GL['Р'].w(Object.assign({},d.p||{},{})),'');
reg('@',K=>{const {W,h,S,H,c}=K,hh=h*0.88,y0=(h-hh)/2,t=Math.min(S*0.95,W*0.17),th=Math.min(H*1.1,hh*0.15),ix=W*0.3,iw=W*0.34,iy=h*0.34,ih=h*0.3,b=Math.min(S*0.5,iw*0.3),bh=Math.min(H*0.5,ih*0.3);
  return [...ring(K,0,y0,W,y0+hh,[c,c,c,c],t,th,2),sub(K.rc(W*0.6,y0-10,W+10,y0+hh*0.3)),post(K.rc(ix,iy,ix+b,iy+ih)),post(K.rc(ix+iw-b,iy-bh*0.3,ix+iw,iy+ih+bh)),post(K.rc(ix,iy,ix+iw,iy+bh)),post(K.rc(ix,iy+ih-bh,ix+iw,iy+ih)),post(K.rc(ix+iw-b,iy,ix+iw+b*1.1,iy+bh))];},wd(1.05,2,80),'x');
reg('#',K=>{const {W,h,S,H}=K,v=S*0.8,t=H*0.7,x1=W*0.33,x2=W*0.67;
  return [K.rc(x1-v/2,0,x1+v/2,h),K.rc(x2-v/2,0,x2+v/2,h),K.bar(0,W,h*0.3-t/2,h*0.3+t/2,1,1),K.bar(0,W,h*0.65-t/2,h*0.65+t/2,1,1)];},wd(0.9,2,100),'x');
reg('%',K=>{const {W,h,S,H,c}=K,s=Math.min(W*0.38,h*0.3),t=Math.min(S*0.62,s*0.3),th=Math.min(H*0.6,s*0.3),hw=S*0.85;
  return [...ring(K,0,h-s,s,h,[c*0.5,c*0.5,c*0.5,c*0.5],t,th,2),...ring(K,W-s,0,W,s,[c*0.5,c*0.5,c*0.5,c*0.5],t,th,2),K.dg(hw/2,0,W-hw/2,h,hw)];},wd(1.0,2,100),'x');
reg('*',K=>{const {W,h,S}=K,cx=W/2,cy=h*0.74,L=Math.min(W*0.5,h*0.24),b=Math.min(S*0.4,L*0.45);
  return [K.rc(cx-b/2,cy-L,cx+b/2,cy+L),K.dg(cx-L*0.85,cy-L*0.85,cx+L*0.85,cy+L*0.85,b*1.25),K.dg(cx+L*0.85,cy-L*0.85,cx-L*0.85,cy+L*0.85,b*1.25)];},d=>Math.max(d.S*3.4,d.u*0.6),'x');
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
/* ================= регистр, наборы, параметры ================= */
const G=F.GL;
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',sym='.,:;!?"\'-–—()/&№«»‘’“”„…−·•°©₽@#%*+=\\|';
for(const c of lat+cy)if(G[c])G[c.toLowerCase()]=G[c];
G['y']=G['У'];
F.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
F.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' '].filter(c=>G[c]);
for(const c of Object.keys(G))if(!F.CHARSET.includes(c))delete G[c];
const R0={wdth:104,capH:700,xh:700,asc:910,desc:190,stem:220,hair:183,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:14,track:0,space:330,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,
  cham:60,spk:72,fury:70,lean:85,spkU:70,spkD:100,spkS:80,sym:20,persp:0,blade:0};
F.DEFAULTS={regular:{...R0},italic:{...R0,wdth:104,slant:12,space:340,blade:70,spkD:100,lean:100,spkU:60,spkS:90,fury:80,sym:30}};
const HID=['hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn'];
F.params={wdth:['Ширина знаков, %',88,130,1],capH:['Высота прописных',640,760,1],stem:['Основные штрихи',170,290,1]};
for(const k of HID)F.params[k]=null;
F.methods=[
  ['Характер','Готовые системы лезвий.',[
    ['Прорыв',{spk:72,fury:70,lean:85,spkU:70,spkD:100,spkS:80,sym:20,persp:0,blade:0,slant:0,cham:60}],
    ['Симметрия',{spk:62,fury:65,lean:60,spkU:70,spkD:100,spkS:90,sym:100,persp:18,blade:0,slant:0,cham:50}],
    ['Скорость',{spk:66,fury:80,lean:100,spkU:60,spkD:100,spkS:90,sym:30,persp:0,blade:70,slant:12,cham:60}],
    ['Чистый',{spk:0,fury:0,persp:0,blade:0,slant:0,cham:40}]]],
  ['Вес','Толщина вертикалей.',[['Жирный',{stem:196}],["Тяжёлый",{stem:220}],["Чёрный",{stem:245}]]],
  ['Лезвия','Длина лезвий.',[['Короткие',{spk:30}],['Средние',{spk:55}],['Длинные',{spk:100}]]],
  ['Перспектива','Трапеция знака.',[['Прямая',{persp:0}],['Вниз шире',{persp:30}],['Вверх шире',{persp:-30}]]],
  ['Скорость','Удлинение левых клинков.',[['Нет',{blade:0}],['Клинки',{blade:55}],['Мечи',{blade:100}]]],
  ['Срезы','Косые срезы и фаски колец.',[['Прямые',{cham:15}],['Срез',{cham:60}],['Грань',{cham:100}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;
const ALLCH=[...lat,...latl,...cy,...cyl,...'0123456789'].join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:'IHНПL',stemFy:[0.62,0.68],hang:true,asc:ALLCH,desc:ALLCH,holeK:0.02,aboveBase:true};
/* пределы взаимозависимы: капитель → ширина → вертикаль (две вертикали + щель в самом узком знаке) → горизонталь (0.85 вертикали,
   но три перекладины + две щели ≥ 0.09h) → лезвия (длины от высоты; вылеты вверх/вниз задают asc/desc) → перспектива/клинки */
function ryLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',640,760,700);cl('wdth',88,130,104);
  const h=q.capH,u=h*q.wdth/100;
  cl('stem',120,Math.min(0.38*h,(0.98*u-0.27*h)/2),220);q.stem=Math.round(q.stem);
  q.hair=Math.round(Math.min(q.stem*0.85,0.262*h));/* FX3: stem floor 120 for the Light weight */L.hair=[q.hair,q.hair];
  cl('xh',h,h,h);cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);
  cl('cham',0,100,60);cl('spk',0,100,72);cl('fury',0,100,70);cl('lean',-100,100,85);cl('spkU',0,100,70);cl('spkD',0,100,100);cl('spkS',0,100,80);cl('sym',0,100,20);
  cl('persp',-60,60,0);cl('blade',0,100,0);
  cl('sb',6,40,14);
  const d=D(q);
  const mg=Math.max(0.3*q.stem,40),mk=Math.max(mg+0.8*q.stem,mg+0.5*q.stem+Math.max(0.06*h,40)),asc=Math.ceil(h+Math.max(0.24*h,d.Utop,mk))+2,desc=Math.ceil(Math.max(0.3*h,0.12*h+d.Dmax))+2;
  cl('asc',asc,asc,asc);cl('desc',desc,desc,desc);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='ryvok')return _pl(p,font);return ryLim(p);};
/* вес (FX3): лестница шире, шаги видны даже при замере на 0.25 капы (там в штрих входят лапы-рога, +48): Light 126 · Regular 171 · Bold 231 · Black 266 при capH 700 (1.36 / 1.35 / 1.15; потолок штриха 0.38·capH) */
WSCALE.ryvok=0.62;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='ryvok'){const rt={Light:0.18,Regular:0.245,Bold:0.33,Black:0.38}[wn];if(rt)o.stem=Math.round(p.capH*rt);o.hair=Math.round(Math.min(o.stem*0.85,0.262*p.capH));o.wdth=wn==='Black'?Math.min(130,Math.round(p.wdth*1.04)):p.wdth;o.sb=p.sb;return paramLimits(o,'ryvok').q;}
  return o;};
/* кернинг: базовая таблица + классы «шипов»; значения меряются по профилям (площадь белого), защита от столкновения — kernMeasure */
Object.assign(KC_L,{yA:'EFLГTZSCGЕЁСЗЪБ2357',yD:'AVWXYKЖЛЯУ4М'});
Object.assign(KC_R,{yB:'TZSJЭЗ2357ТСCG',yC:'AVWXYЛДУ4',yF:'BDEFHIKLMNOPRUВГЕИЙКНПРЦЧШЩЬЫЮФ0689'});
/* кернинг по телу знака: font.kernBody=[0.15,0.9,0.1] — зазор между телами (без рогов) в полосе 0.15h–0.9h → 0.1h; защита рогов от столкновения — по полному профилю (kernMeasure) */
Object.assign(KC_L,{yL:lat+cy+'0123456789'});Object.assign(KC_R,{yR:lat+cy+'0123456789'});
F.kernBody=[0.15,0.9,0.1];F.kernTwin=true;/* FIX-ENGINE: строчные близнецы в классах прописных (аб = АБ) */
/* FX3: right-open letters (Г Т Р Ф …) before punctuation and opening quotes before letters: same body-gap rule, own classes */
Object.assign(KC_R,{yP:'.,:;!?»”’…„-–—)'});Object.assign(KC_L,{yQ:'«„“‘('});
KERN_TABLE.ryvok=[['yL','yR',1],['yL','yP',1],['yQ','yR',1]];
/* FX3: horn-to-horn clearance: after kerning the Euclidean white between the full profiles (horns included) is >= 0.06·capH (42 u) */
const _kmR=kernMeasure;
kernMeasure=function(a,b,t,f,p){const r=_kmR(a,b,t,f,p);if(!r||CUR_FONT!=='ryvok'||a.r0<0||b.r0<0)return r;
  const hg=0.06*p.capH,st=(KP_Y1-KP_Y0)/KP_N,m=Math.ceil(hg/st);let need=-1e9;
  for(let j=a.r0;j<=a.r1;j++){const ra=a.R[j];if(ra==null)continue;
    for(let q=Math.max(b.r0,j-m);q<=Math.min(b.r1,j+m);q++){const lb=b.L[q];if(lb==null)continue;const dy=(q-j)*st;if(Math.abs(dy)>=hg)continue;
      const n=Math.sqrt(hg*hg-dy*dy)-((a.adv-ra)+lb);if(n>need)need=n;}}
  if(need>r.k)r.k=Math.round(need);return r;};
/* FX3: exact slant for post/hhea (stems measure 11.8° at slant 12; the 18.7° seen in the audit came from the horn edges) */
F.italicAngle=p=>-Math.round(Math.atan(Math.tan((p&&p.slant||0)*Math.PI/180)+0.1317)*1800/Math.PI)/10;/* FIX-ENGINE: видимый наклон = сдвиг + собственный наклон рогов (замер Н, п, I курсива: 19–20° при сдвиге 12°) */
FONTS.ryvok=F;
/* ползунки «Шипы»/«Динамика» — только у Рывка: у остальных шрифтов скрыты */
for(const id in FONTS)if(id!=='ryvok'){const f=FONTS[id];f.params=f.params||{};for(const k of RY)if(!(k in f.params))f.params[k]=null;}
})();
