/* ===== «Поделиться шрифтом» (Stage 3): живой постер вашего шрифта, PNG 1080x1350 и петля WebM =====
   Постер = чистая функция времени (seek(t)) на canvas, формат 540x675 условных единиц; петля 7,4 с, кадр-постер 5,4 с.
   Шрифт постера: из знаков самого шрифта собирается вариативный шрифт только с нужными знаками (buildVariableTTF с opts.chars, ось wght 300-900),
   FontFace -> canvas; вес меняется по настоящей оси. Нет оси (сборка не удалась): статичный TTF одного веса, вес не движется.
   Правило проекта: ничего не выходит за край. Поле 24, сжатие по границам чернил (actualBoundingBox), длинное имя: уменьшение до 64, затем две строки с зазором между строками >= 8 % кегля.
   Скачивание: saveFile (то же, что у «Скачать»). Reduced motion (MO.off()) = только кадр-постер. API: SHARE.open(id,name), SHARE.close(), SHARE.rec(t). */
(function(){
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),mix=(a,b,t)=>a+(b-a)*t;
  const bez=(x1,y1,x2,y2)=>t=>{if(t<=0||t>=1)return clamp(t);let a=0,b=1,m,x;for(let i=0;i<22;i++){m=(a+b)/2;x=3*(1-m)*(1-m)*m*x1+3*(1-m)*m*m*x2+m*m*m;x<t?a=m:b=m}m=(a+b)/2;return 3*(1-m)*(1-m)*m*y1+3*(1-m)*m*m*y2+m*m*m};
  const TRV=bez(.45,0,.1,1),ARR=bez(.25,.8,.25,1),SOFT=bez(.4,0,.2,1),EIN=bez(.4,0,1,1);
  const P=(t,a,b,e)=>{const p=clamp((t-a)/(b-a));return e?e(p):p};
  /* Stage 4B: форматы 1:1 / 4:5 / 9:16 (ширина 540 условных единиц, высота 540 / 675 / 960; PNG x2 = 1080 x 1080 / 1350 / 1920, видео x4/3 = 720 x 720 / 900 / 1280),
     темы постера light / dark / accent (не зависят от темы сервиса), содержимое: сетка знаков или своя фраза (1-3 строки, по чернилам в поле) */
  const W=540,D=7.4,POSTER=5.4,G=24,MINS=64,CAPMAX=215,PHMAX=40;
  const FMTS={'1:1':{id:'1:1',H:540,ar:'1/1',px:1080},'4:5':{id:'4:5',H:675,ar:'4/5',px:1350},'9:16':{id:'9:16',H:960,ar:'9/16',px:1920}};
  const THEMES={
    light:{bg:'#efeff1',ink:'#0b0b0c',card:'#ffffff',muted:'#6a6a72',track:'#d6d6db',on:'#ffffff',sh1:'rgba(17,17,26,.12)',sh2:'rgba(17,17,26,.2)'},
    dark:{bg:'#131316',ink:'#f4f4f6',card:'#202025',muted:'#a0a0aa',track:'#3a3a41',on:'#0b0b0c',sh1:'rgba(0,0,0,.45)',sh2:'rgba(0,0,0,.55)'},
    accent:{bg:'#FC473C',ink:'#0b0b0c',card:'#ffffff',muted:'#0b0b0c',track:'rgba(11,11,12,.28)',on:'#ffffff',sh1:'rgba(70,8,4,.22)',sh2:'rgba(70,8,4,.32)'}};
  const WEIGHTS=[['Light',300],['Regular',400],['Bold',700],['Black',900]];
  const GRID='АБВЖЗКМОПРСТУФЦЧабвжзкмопрстуфцч';
  const SKEY='gtype-share-v1',UI0={f:'4:5',t:'light',m:'grid'};
  const SH={m:null,face:null,fam:'',static:false,k0:1,hero:null,rec:null,open:false,t:POSTER,run:false,raf:0,t0:0,busy:false,gen:0,faces:new Map(),dom:null,F:FMTS['4:5'],theme:'light',mode:'grid',key:'',cache:{}};
  try{const j=JSON.parse(localStorage.getItem(SKEY)||'null');if(j){if(FMTS[j.f])SH.F=FMTS[j.f];if(THEMES[j.t])SH.theme=j.t;if(j.m==='phrase'||j.m==='grid')SH.mode=j.m;}}catch(e){}
  const saveUi=()=>{try{localStorage.setItem(SKEY,JSON.stringify({f:SH.F.id,t:SH.theme,m:SH.mode}));}catch(e){}};
  const wOf=k=>{const i=Math.min(2,Math.floor(k)),f=k-i;return mix(WEIGHTS[i][1],WEIGHTS[i+1][1],f)};
  const UF=(k,px)=>`${wOf(k).toFixed(1)} ${px}px "${SH.fam}"`;
  const SF=(w,px)=>`${w} ${px}px Onest,system-ui,sans-serif`;
  const ent=(t,a,d,e=ARR)=>P(t,a,a+d,e),ext=(t,a,d)=>P(t,a,a+d,EIN);
  const wv=t=>SH.static?SH.k0:Math.max(0,Math.min(3,P(t,1.9,2.5,SOFT)+P(t,3.0,3.6,SOFT)+P(t,4.1,4.7,SOFT)-3*P(t,6.55,7.25,SOFT)));
  function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  const rec=(n,x0,y0,x1,y1,rest,inn)=>{if(SH.rec)SH.rec.push({n,x0,y0,x1,y1,rest,in:inn})};
  /* раскладка по формату и содержимому: карточка + плашка внизу, дорожка веса над ними, поле героя между шапкой и дорожкой */
  function lay(F,mode){
    const H=F.H,bw=W-2*G;let card,chip;
    if(mode==='phrase'){const bh=F.id==='1:1'?104:112;card={x:G,y:H-G-bh,w:306,h:bh};chip={x:G+318,y:card.y,w:bw-318,h:bh};}
    else if(F.id==='1:1'){card={x:G,y:H-G-150,w:306,h:150};chip={x:G+318,y:card.y,w:bw-318,h:150};}
    else if(F.id==='4:5'){card={x:G,y:H-G-211,w:306,h:211};chip={x:G+318,y:card.y,w:bw-318,h:211};}
    else{card={x:G,y:H-G-110-12-250,w:bw,h:250};chip={x:G,y:H-G-110,w:bw,h:110};}
    const trackY=card.y-48;return {H,card,chip,trackY,top:G+34+14,bot:trackY-28};
  }
  /* общая подгонка блока строк по чернилам: ширина поля на всех весах, высота поля, потолок кегля; строки выровнены по левому краю, блок по центру поля */
  function fitBlock(c,lines,ks,ah,capMax,aw){
    aw=aw||W-2*G;
    const ink=(ls,sz)=>{let L=0,R=0,A=0,Dd=0;for(const k of ks){c.font=UF(k,sz);for(const l of ls){const q=c.measureText(l);L=Math.max(L,q.actualBoundingBoxLeft);R=Math.max(R,q.actualBoundingBoxRight);A=Math.max(A,q.actualBoundingBoxAscent);Dd=Math.max(Dd,q.actualBoundingBoxDescent);}}return [L,R,A,Dd]};
    c.font=UF(3,100);const cap100=c.measureText('Н').actualBoundingBoxAscent||c.measureText('H').actualBoundingBoxAscent||70;
    let sz=100;for(let i=0;i<6;i++){const [L,R]=ink(lines,sz);sz*=aw/Math.max(1,L+R)}sz*=.998;
    sz=Math.min(sz,capMax*100/cap100);
    const geo=sz=>{const per=lines.map(l=>ink([l],sz));let pitch=sz*cap100/100*1.18;
      for(let i=0;i+1<lines.length;i++)pitch=Math.max(pitch,per[i][3]+per[i+1][2]+sz*.16);/* чернильный зазор между строками >= 8 % кегля (здесь 16 %) */
      const h=per[0][2]+(lines.length-1)*pitch+per[lines.length-1][3];return {per,pitch,h}};
    let g=geo(sz);
    for(let i=0;i<3&&g.h>ah;i++){sz*=ah/g.h*.995;g=geo(sz)}
    sz=Math.max(12,sz);g=geo(sz);
    const [L]=ink(lines,sz);
    return {lines,size:sz,L,pitch:g.pitch,h:g.h,asc:g.per[0][2],cap:sz*cap100/100};
  }
  const KS13=[0,.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3],KS5=[0,1,2,2.5,3];
  const ksOf=()=>SH.static?[SH.k0]:KS13;
  /* название-герой (режим «Знаки»): одна строка, при длинном названии до MINS, затем две строки; на 9:16 до трёх строк, что даёт наибольший кегль */
  function heroFit(c){const m=SH.m,F=SH.F,L=lay(F,'grid'),key=m.name+'|'+SH.fam+'|'+F.id+'|g';if(SH.hero&&SH.hero.key===key)return SH.hero;
    const ks=ksOf(),ah=L.bot-L.top;
    let best=fitBlock(c,[m.name],ks,ah,CAPMAX);
    const ws=m.name.split(' ');
    if(ws.length>1&&(best.size<MINS||F.id==='9:16')){
      const cands=[];for(let i=1;i<ws.length;i++)cands.push([ws.slice(0,i).join(' '),ws.slice(i).join(' ')]);
      if(F.id==='9:16')for(let i=1;i<ws.length;i++)for(let j=i+1;j<ws.length;j++)cands.push([ws.slice(0,i).join(' '),ws.slice(i,j).join(' '),ws.slice(j).join(' ')]);
      for(const ls of cands){const f=fitBlock(c,ls,ks,ah,CAPMAX);if(f.size>best.size*1.02)best=f}
    }
    return SH.hero=Object.assign(best,{key,y0:L.top+(ah-best.h)/2});}
  /* своя фраза: деление по словам на 1-3 строки, самая ровная раскладка для каждого числа строк (по ширине на самом тяжёлом весе), берётся та, где кегль больше */
  function phraseFit(c){const m=SH.m,F=SH.F,L=lay(F,'phrase'),key=m.phrase+'|'+SH.fam+'|'+F.id+'|p';if(SH.ph&&SH.ph.key===key)return SH.ph;
    const ks=SH.static?[SH.k0]:KS5,ah=L.bot-L.top-8,ws=m.phrase.split(' ').filter(Boolean);
    c.font=UF(3,100);const wd=s=>c.measureText(s).width;
    const maxN=Math.min(ws.length,F.id==='9:16'?5:3),wc=new Map(),wj=(i,j)=>{const k=i+'|'+j;if(!wc.has(k))wc.set(k,wd(ws.slice(i,j).join(' ')));return wc.get(k)};
    /* для каждого числа строк: деление по словам с наименьшей самой широкой строкой (на самом тяжёлом весе), при равенстве самое ровное */
    const parts=[];
    for(let n=1;n<=maxN;n++){
      const memo=new Map(),go=(i,r)=>{const k=i+'|'+r;if(memo.has(k))return memo.get(k);let b=null;
        if(r===1){const w=wj(i,ws.length);b={mx:w,sp:0,cuts:[ws.length]};}
        else for(let j=i+1;j<=ws.length-r+1;j++){const w=wj(i,j),t=go(j,r-1);if(!t)continue;const mx=Math.max(w,t.mx),sp=Math.max(w,t.mx)-Math.min(w,t.mn||t.mx);if(!b||mx<b.mx-.5||(Math.abs(mx-b.mx)<=.5&&sp<b.sp))b={mx,sp,mn:Math.min(w,t.mn||t.mx),cuts:[j,...t.cuts]};}
        memo.set(k,b);return b};
      const r=go(0,n);if(!r)continue;let p=0;parts.push(r.cuts.map(c=>{const l=ws.slice(p,c).join(' ');p=c;return l}));
    }
    let best=null;for(const ls of parts){const f=fitBlock(c,ls,ks,ah,CAPMAX);if(!best||f.size>best.size*1.04)best=f}
    return SH.ph=Object.assign(best,{key,y0:L.top+8});}/* под шапкой, как заголовок режима «Знаки» */
  /* название в карточке (режим «Фраза»): одна строка по чернилам внутри карточки */
  function nameFit(c,L){const m=SH.m,key=m.name+'|'+SH.fam+'|'+SH.F.id+'|n';if(SH.nf&&SH.nf.key===key)return SH.nf;
    const f=fitBlock(c,[m.name],SH.static?[SH.k0]:KS5,L.card.h-32,56,L.card.w-36);return SH.nf=Object.assign(f,{key});}
  /* знак в ячейке сетки: кегль так, чтобы чернила самого широкого знака лежали внутри ячейки (на Black и Bold) */
  function gridSize(c,L,gw,gh){const key=SH.m.grid.join('')+'|'+SH.fam+'|'+SH.F.id;if(SH.gs&&SH.gs.key===key)return SH.gs.v;
    let gs=Math.min(gw*.69,gh*.62);
    for(const k of (SH.static?[SH.k0]:[2,3])){c.font=UF(k,100);let mw=1,mh=1;for(const ch of SH.m.grid){const q=c.measureText(ch);mw=Math.max(mw,q.actualBoundingBoxLeft+q.actualBoundingBoxRight);mh=Math.max(mh,q.actualBoundingBoxAscent+q.actualBoundingBoxDescent)}
      gs=Math.min(gs,(gw-8)/mw*100,(gh-8)/mh*100)}
    SH.gs={key,v:gs};return gs;}
  /* «Тяга», режим «Блок» открыт: на постере выровненный блок (контуры движка, толщина по весам), а не строка шрифта. Знаки: текст блока из редактора; Своя фраза: фраза 1-3 строками. */
  const blockOn=()=>{try{return !!(SH.m&&SH.m.id==='tyaga'&&S.fontId==='tyaga'&&window.TYB&&TYB.poster&&TYB.poster.on());}catch(e){return false;}};
  function blockFit(){
    const m=SH.m,F=SH.F,ph=SH.mode==='phrase',L=lay(F,ph?'phrase':'grid'),aw=W-2*G-6,ah=L.bot-L.top-(ph?8:0),T=TYB.poster;
    const key=[ph?m.phrase:T.text(),JSON.stringify(TYB.state()),JSON.stringify(cur().p),F.id,ph].join('|');if(SH.bk&&SH.bk.key===key)return SH.bk.f;
    const f=ph?T.phrase(m.phrase,aw,ah,150,F.id==='9:16'?5:3):T.fit(T.text(),true,T.width(),aw,ah,150);
    if(f){f.y0=ph?L.top+8:L.top+(ah-f.h)/2;f.x0=G+3;}
    SH.bk={key,f};return f;}
  function draw(c,t){
    const m=SH.m,F=SH.F,H=F.H,PAL=THEMES[SH.theme]||THEMES.light,ph=SH.mode==='phrase',LY=lay(F,ph?'phrase':'grid');c.save();c.fillStyle=PAL.bg;c.fillRect(0,0,W,H);
    const bk=blockOn()?blockFit():null,hf=bk||(ph?phraseFit(c):heroFit(c)),k=wv(t);if(bk){SH.hero=SH.ph=bk;}
    c.font=SF(600,15);const nm='Новый шрифт',pw=c.measureText(nm).width+30,pht=34,py=G;
    c.fillStyle=PAL.ink;rr(c,G,py,pw,pht,17);c.fill();c.fillStyle=PAL.on;c.textBaseline='middle';c.textAlign='left';c.fillText(nm,G+15,py+pht/2+.5);rec('pill',G,py,G+pw,py+pht,1);
    c.save();const bx=W-G,by=py,bh=34;c.beginPath();c.rect(bx-190,by,190,bh);c.clip();c.fillStyle=PAL.ink;c.textBaseline='middle';c.textAlign='right';
    c.fillText('00',bx,by+bh/2);const w00=c.measureText('00').width,dw=c.measureText('0').width;
    const rs=P(t,6.7,7.0,SOFT),lab=(i,a)=>{if(a<=0)return;c.globalAlpha=a;c.textAlign='right';c.fillText(String(WEIGHTS[i][1])[0],bx-w00,by+bh/2);c.fillText(WEIGHTS[i][0],bx-w00-dw-8,by+bh/2)};
    if(SH.static)lab(SH.k0,1);
    else if(t<6.55){for(let i=0;i<4;i++){const d=i-k;if(Math.abs(d)>=1)continue;c.globalAlpha=1-Math.abs(d);c.textAlign='right';c.fillText(String(WEIGHTS[i][1])[0],bx-w00,by+bh/2+d*26);c.fillText(WEIGHTS[i][0],bx-w00-dw-8,by+bh/2+d*26)}}
    else{lab(3,1-rs);lab(0,rs)}
    c.globalAlpha=1;c.restore();
    c.font=SF(600,15);rec('label',bx-(c.measureText('Regular').width+dw*3+18),by+8,bx,by+bh-8,1);
    c.fillStyle=PAL.ink;c.textBaseline='alphabetic';c.textAlign='left';c.font=UF(k,hf.size);
    if(bk)TYB.poster.draw(c,bk,k,bk.x0,bk.y0,bk.sc,PAL.ink).forEach((r,i)=>rec('hero'+i,r.x0,r.y0,r.x1,r.y1,1));
    else hf.lines.forEach((l,i)=>{const bl=hf.y0+hf.asc+i*hf.pitch;c.fillText(l,G+hf.L,bl);const q=c.measureText(l);rec('hero'+i,G+hf.L-q.actualBoundingBoxLeft,bl-q.actualBoundingBoxAscent,G+hf.L+q.actualBoundingBoxRight,bl+q.actualBoundingBoxDescent,1)});
    const tx0=G+12,tx1=W-G-12,ty=LY.trackY,kx=tx0+(tx1-tx0)*k/3;
    c.fillStyle=PAL.track;rr(c,tx0,ty-2,tx1-tx0,4,2);c.fill();c.fillStyle=PAL.ink;rr(c,tx0,ty-2,Math.max(4,kx-tx0),4,2);c.fill();
    for(let i=0;i<4;i++){const x=tx0+(tx1-tx0)*i/3;c.fillStyle=x<=kx+1?PAL.ink:PAL.track;c.beginPath();c.arc(x,ty,3.5,0,7);c.fill()}
    c.fillStyle=PAL.card;c.beginPath();c.arc(kx,ty,12,0,7);c.fill();c.fillStyle=PAL.ink;c.beginPath();c.arc(kx,ty,8,0,7);c.fill();rec('track',tx0-12,ty-12,tx1+12,ty+12,1);
    const cin=ent(t,.5,.6),cout=ext(t,6.4,.4),cv=cin*(1-cout),dy=(1-cin)*24+cout*24;
    if(cv>0){c.save();c.globalAlpha=cv;c.translate(0,dy);
      const {x:cx,y:cy,w:cw,h:ch}=LY.card;rec('card',cx,cy+dy,cx+cw,cy+ch+dy,dy<.01);
      c.shadowColor=PAL.sh1;c.shadowBlur=24;c.shadowOffsetY=6;c.fillStyle=PAL.card;rr(c,cx,cy,cw,ch,22);c.fill();c.shadowColor='transparent';
      if(ph){const nf=nameFit(c,LY);c.fillStyle=PAL.ink;c.textAlign='left';c.textBaseline='alphabetic';c.font=UF(k,nf.size);
        const bl=cy+(ch-nf.h)/2+nf.asc,x0=cx+18+nf.L;c.fillText(m.name,x0,bl);const q=c.measureText(m.name);
        rec('nm',x0-q.actualBoundingBoxLeft,bl-q.actualBoundingBoxAscent+dy,x0+q.actualBoundingBoxRight,bl+q.actualBoundingBoxDescent+dy,0,'card');}
      else{
      const cols=8,rows=4,gw=(cw-28)/cols,gh=(ch-28)/rows,grid=m.grid,gs=gridSize(c,LY,gw,gh);
      const cell=i=>[cx+14+(i%cols)*gw+2,cy+14+Math.floor(i/cols)*gh+2];
      const path=[1,3,5,7,15,12].filter(i=>i<grid.length),seq=[2.6,3.2,3.8,4.4,5.0];let hl=null;
      if(t>=2.6&&path.length>1){let i=0;while(i<path.length-1&&i<seq.length-1&&t>=seq[i+1])i++;const a=cell(path[i]),b=cell(path[Math.min(i+1,path.length-1)]);
        const u=P(t,seq[i],seq[i]+.42,TRV);hl=[mix(a[0],b[0],u),mix(a[1],b[1],u)];if(t>=seq[Math.min(seq.length,path.length)-1]+.42)hl=cell(path[path.length-1])}
      const ho=hl?P(t,2.6,2.9,SOFT)*(1-P(t,6.4,6.6)):0;
      if(hl){c.globalAlpha=cv*ho;c.fillStyle=PAL.ink;rr(c,hl[0],hl[1],gw-4,gh-4,12);c.fill();rec('hl',hl[0],hl[1]+dy,hl[0]+gw-4,hl[1]+gh-4+dy,dy<.01,'card')}
      const glyphs=col=>{c.fillStyle=col;c.textAlign='center';c.textBaseline='alphabetic';c.font=UF(k,gs);
        for(let i=0;i<grid.length;i++){const e=ent(t,.9+i*.035,.35);if(e<=0)continue;const gx=cx+14+(i%cols)*gw+gw/2,gy=cy+14+(Math.floor(i/cols)+.5)*gh;
          c.save();c.globalAlpha=cv*e;c.translate(gx,gy+gs/3+(1-e)*8);c.scale(mix(.8,1,e),mix(.8,1,e));c.fillText(grid[i],0,0);c.restore();
          if(col===PAL.ink&&SH.rec){const q=c.measureText(grid[i]);rec('ch',gx-q.actualBoundingBoxLeft,gy+gs/3-q.actualBoundingBoxAscent+dy,gx+q.actualBoundingBoxRight,gy+gs/3+q.actualBoundingBoxDescent+dy,0,'card')}}};
      glyphs(PAL.ink);
      if(hl&&ho>0){c.save();rr(c,hl[0],hl[1],gw-4,gh-4,12);c.clip();c.globalAlpha=ho;glyphs(PAL.on);c.restore()}}
      c.restore()}
    const xin=ent(t,.4,.6),xout=ext(t,6.35,.4),xv=xin*(1-xout),xdy=(1-xin)*24+xout*24;
    if(xv>0){c.save();c.globalAlpha=xv;c.translate(0,xdy);
      const {x,y,w,h}=LY.chip;rec('chip',x,y+xdy,x+w,y+h+xdy,xdy<.01);
      c.shadowColor=PAL.sh2;c.shadowBlur=28;c.shadowOffsetY=8;c.fillStyle=PAL.ink;rr(c,x,y,w,h,22);c.fill();c.shadowColor='transparent';
      c.fillStyle=PAL.on;c.textAlign='left';c.textBaseline='alphabetic';
      const cnt=m.count+' '+cvPl(m.count,'знак','знака','знаков'),wide=w>=h*2.4;
      c.font=UF(3,100);const pw9=c.measureText(m.pair).width,ps=wide?Math.min(66,h-44):Math.min(66,(w-36)/Math.max(1,pw9)*100,(h-62)/.74);
      c.font=UF(3,ps);const cap=c.measureText(m.pair).actualBoundingBoxAscent||ps*.7;
      const pby=wide?y+(h+cap)/2:(h>=200?y+98:y+18+cap);
      c.font=UF(k,ps);c.fillText(m.pair,x+18,pby);const q=c.measureText(m.pair);
      rec('pair',x+18-q.actualBoundingBoxLeft,pby-q.actualBoundingBoxAscent+xdy,x+18+q.actualBoundingBoxRight,pby+q.actualBoundingBoxDescent+xdy,0,'chip');
      c.globalAlpha=xv*.7;c.font=SF(600,13);
      if(wide){c.textAlign='right';c.textBaseline='middle';c.fillText(cnt,x+w-18,y+h/2);const cw2=c.measureText(cnt).width;rec('cnt',x+w-18-cw2,y+h/2-8+xdy,x+w-18,y+h/2+8+xdy,0,'chip');}
      else{const cb=h>=200?y+h-24:y+h-20;c.fillText(cnt,x+18,cb);const cw2=c.measureText(cnt).width;rec('cnt',x+18,cb-11+xdy,x+18+cw2,cb+4+xdy,0,'chip');}
      c.restore()}
    c.restore();
  }
  /* ---------- состояние шрифта и сборка шрифта постера ---------- */
  function stateOf(id){return id===S.fontId?S:(()=>{const sl=S.lib[id]||(S.lib[id]=mkSlot(id));return {family:sl.family||FONTS[id].family,edits:sl.edits,styles:sl.styles};})();}
  /* фраза: только знаки шрифта; нет знака, но есть его прописная/строчная пара: берётся пара; остальное пропускается (список в miss) */
  function phraseOf(f,raw){
    const have=new Set(f.CHARSET||[]),out=[],miss=[];
    for(const ch0 of String(raw||'').replace(/\s+/g,' ').slice(0,PHMAX*2)){
      let ch=ch0;if(ch!==' '&&!have.has(ch)){const u=ch.toUpperCase(),l=ch.toLowerCase();ch=have.has(u)?u:have.has(l)?l:'';if(!ch&&!miss.includes(ch0))miss.push(ch0);}
      if(ch)out.push(ch);
    }
    const text=out.join('').replace(/ +/g,' ').trim().slice(0,PHMAX).trim();
    return {text,miss};
  }
  const PBASE='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя 0123456789.,!?:;-—–«»()…';
  function model(id,name,phrase,pm){
    const f=FONTS[id],have=new Set(f.CHARSET||[]),ok=s=>[...s].filter(ch=>ch===' '||have.has(ch)).join('');
    let nm=ok(String(name||'').trim()).replace(/\s+/g,' ').trim();
    if(nm.length>24){let c=nm.slice(0,24);if(nm[24]!==' '&&c.includes(' '))c=c.slice(0,c.lastIndexOf(' '));nm=c.trim();}
    {const i=nm.lastIndexOf(' ');if(nm.length>=22&&i>0&&nm.length-i-1===1)nm=nm.slice(0,i).trim();}/* длинное имя режется по границе слова, не посреди слова */if(!nm)nm=ok(String(f.name||'').trim());
    /* Stage 4A: свой нарисованный шрифт: название может состоять из ещё не нарисованных букв; тогда на постере буквы самого шрифта, не «Aa» запасным шрифтом */
    if(!nm)nm=[...have].filter(ch=>/\p{L}/u.test(ch)).slice(0,4).join('')||'Aa';
    let pair=[...'Аа'].every(ch=>have.has(ch))?'Аа':[...'Aa'].every(ch=>have.has(ch))?'Aa':[...have].filter(ch=>/\p{L}/u.test(ch)).slice(0,2).join('')||'Aa';
    /* 32 разных знака: 4 ряда без повторов; строчная, у которой в шрифте тот же рисунок, что у прописной (Рывок, Модуль), считается повтором */
    const seen=new Set(),grid=[],sg=ch=>{const u=ch.toUpperCase(),g=f.GL&&f.GL[ch];return u!==ch&&g&&f.GL[u]&&JSON.stringify(g)===JSON.stringify(f.GL[u])?u:ch},add=ch=>{if(grid.length>=32||!have.has(ch))return;const k=sg(ch);if(seen.has(k))return;seen.add(k);grid.push(ch)};
    for(const ch of GRID+'ГДЕИЛНХШЭЮЯгдеилнхшэюяЩЫЬЙЁщыьйёQRSGFJLNUWZqrsgfjlnuwz0123456789')add(ch);
    for(const ch of f.CHARSET||[])if(/\p{L}/u.test(ch))add(ch);
    for(const ch of f.CHARSET||[])add(ch);
    const pr=phraseOf(f,phrase);
    const sub=[...new Set([...nm,...pair,...grid,...(pm?PBASE:''),...pr.text])].filter(ch=>ch===' '||have.has(ch));
    return {id,name:nm,pair,grid,count:(f.CHARSET||[]).length,sub,phrase:pr.text||nm,miss:pr.miss,raw:String(phrase||'').trim(),pm:!!pm};
  }
  /* Stage 4A: сборка шрифта постера общая для окна и для заранее запущенной (в простое) сборки. FLY: ключ -> {warm, cons, subs, fg, p}.
     Сборка отменяется, когда ждать некому: прогрев (warm) её не отпустил и ни одно окно текущего поколения (SH.gen) её не ждёт. Прогрев (SHARE.warm) работает кусками в requestIdleCallback:
     следующий знак начинается, только если в простое хватает времени на средний знак (или истёк timeout 500 мс), и не при вводе (isInputPending);
     как только окно подключилось к той же сборке (fg), она идёт в обычном темпе окна (передышка каждые 40 мс). */
  const FLY=new Map(),ric=window.requestIdleCallback?(f,o)=>requestIdleCallback(f,o):(f=>setTimeout(()=>f({didTimeout:true,timeRemaining:()=>0}),50));
  const keyOf=(m,st,sty,p)=>m.id+'|'+sty+'|'+JSON.stringify(p)+'|'+Object.keys(st.edits||{}).length+'|'+[...m.sub].sort().join('');
  const PO={axes:['wght'],altFeats:['calt','liga','locl','ccmp','clig','rlig','lig1','lig2']};/* постер рисует обычный текст: нужны только свойства «по умолчанию», без swsh/smcp/case/ss01… (Пропись: 8,7 с -> 4,1 с) */
  async function bgSlot(fl){
    for(let k=0;k<3&&!fl.fg;k++){
      try{if(navigator.scheduling&&navigator.scheduling.isInputPending&&navigator.scheduling.isInputPending()){await new Promise(r=>setTimeout(r,60));continue;}}catch(e){}
      const dl=await new Promise(r=>ric(r,{timeout:80}));
      if(fl.fg||dl.didTimeout||dl.timeRemaining()>=fl.est)return;
    }
  }
  function startFly(key,m,st,sty){
    const fl={warm:false,cons:new Set(),subs:new Set(),fg:false,est:8,last:0,p:null,done:false};
    const alive=()=>{fl.fg=[...fl.cons].some(g=>g===SH.gen);return fl.warm||fl.fg;};fl.alive=alive;
    const reg=async(bytes,opts)=>{const fam='GTShare'+(++SH.n||(SH.n=1));const f=new FontFace(fam,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),opts);await f.load();document.fonts.add(f);return {fam,f};};
    fl.p=(async()=>{
      await 0;/* сначала подключаются ждущие (cons/warm), потом первый tick проверяет, что сборку кто-то ждёт */
      let ff,stat=false,yl=Date.now();
      const tick=async(k,i,n)=>{
        if(!alive())throw new Error('cancel');
        const now=performance.now();if(fl.last&&window.__GT_STEPS)window.__GT_STEPS.push([i,Math.round(now-fl.last)]);if(fl.last)fl.est=Math.min(45,Math.max(4,.5*fl.est+.5*(now-fl.last)));
        fl.subs.forEach(f=>{try{f(i/n);}catch(e){}});
        if(fl.fg){if(Date.now()-yl>40){await new Promise(x=>setTimeout(x,0));yl=Date.now();}}else await bgSlot(fl);
        if(!alive())throw new Error('cancel');
        fl.last=performance.now();
      };
      try{
        const r=await buildVariableTTF(sty,st,Object.assign({chars:m.sub,tick},PO));
        ff=await reg(r.bytes,{weight:'300 900'});
      }catch(e){
        if(!alive())throw e;
        /* нет оси веса: статичный TTF того же набора знаков, вес не движется */
        const w=weightOf(st.styles.regular.p),r=buildTTF(sty,st,{weight:w.weight,weightName:w.name,chars:m.sub,altFeats:PO.altFeats});ff=await reg(r.bytes,{});stat=true;
      }
      const out={fam:ff.fam,f:ff.f,static:stat,sub:new Set(m.sub),k0:(()=>{const nm=typeof famNearest==='function'?famNearest(st.styles[sty].p):'Regular';const i=WEIGHTS.findIndex(w=>w[0]===nm);return i<0?1:i})()};
      SH.faces.set(key,out);
      if(SH.faces.size>3){const k0=SH.faces.keys().next().value,o=SH.faces.get(k0);SH.faces.delete(k0);try{document.fonts.delete(o.f);}catch(e){}}
      return out;
    })();
    fl.p.then(()=>{fl.done=true;},()=>{fl.done=true;}).then(()=>{if(FLY.get(key)===fl)FLY.delete(key);});
    return fl;
  }
  function flyFor(m,fg){
    const st=stateOf(m.id),sty=S.style||'regular',p=(st.styles[sty]||st.styles.regular).p,key=keyOf(m,st,sty,p);
    if(SH.faces.has(key))return {key,hit:SH.faces.get(key)};
    let fl=FLY.get(key);if(!fl){fl=startFly(key,m,st,sty);FLY.set(key,fl);}
    return {key,fl};
  }
  async function faceFor(m,tick,gen){
    const r=flyFor(m,true);if(r.hit)return r.hit;
    const fl=r.fl;fl.cons.add(gen);fl.fg=true;if(tick)fl.subs.add(tick);
    try{const out=await fl.p;if(gen!==SH.gen)throw new Error('cancel');return out;}
    finally{fl.cons.delete(gen);if(tick)fl.subs.delete(tick);}
  }
  /* заранее, в простое: окно «Поделиться» потом открывается с готовым шрифтом. Вызывают: меню «Скачать» (ui_c exOpen), рисование (шрифт сохранён). */
  function warm(id,name){
    try{
      id=id||S.fontId;if(!FONTS[id]||SH.open||id!==S.fontId)return false;/* только текущий шрифт: у остальных состояние ещё не загружено в S (open() сначала делает switchFont) */
      const m=model(id,name!=null?name:(id===S.fontId?S.family:FONTS[id].name)),r=flyFor(m);
      if(r.hit){if(SH.mode==='phrase')warmPhrase();return true;}
      r.fl.warm=true;r.fl.p.then(()=>{if(SH.mode==='phrase')warmPhrase();},()=>{});
      return true;
    }catch(e){return false;}
  }
  /* режим «Фраза»: набор знаков шире (весь алфавит и знаки препинания), его шрифт собирается заранее, в простое, пока открыт режим «Знаки» или после прогрева */
  function warmPhrase(){
    try{const d=SH.dom,id=S.fontId;if(!FONTS[id]||(SH.m&&SH.m.id!==id&&SH.open))return;
      const m=model(id,SH.open&&d?d.nm.value:S.family,SH.open&&d?d.ph.value:'',true),r=flyFor(m);
      if(!r.hit){r.fl.warm=true;r.fl.p.catch(()=>{});}
    }catch(e){}
  }
  function warmedPhrase(){try{const id=S.fontId,m=model(id,SH.open&&SH.dom?SH.dom.nm.value:S.family,SH.open&&SH.dom?SH.dom.ph.value:'',true),st=stateOf(id),sty=S.style||'regular';return SH.faces.has(keyOf(m,st,sty,(st.styles[sty]||st.styles.regular).p));}catch(e){return false;}}
  function warmed(id,name){try{id=id||S.fontId;const m=model(id,name!=null?name:(id===S.fontId?S.family:FONTS[id].name)),st=stateOf(id),sty=S.style||'regular';return SH.faces.has(keyOf(m,st,sty,(st.styles[sty]||st.styles.regular).p));}catch(e){return false;}}
  /* ---------- панель ---------- */
  const CSS=`
.pst{--sh:min(640px,calc(100vh - 4 * var(--s6)));position:fixed;inset:0;z-index:95;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:var(--s6)}
.pst[hidden]{display:none}
.pst-sc{position:absolute;inset:0;background:rgba(10,10,12,.46);opacity:0;transition:opacity var(--dur-base) var(--ease-out)}
.pst-card{position:relative;width:min(880px,100%);max-height:100%;display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:var(--s6);padding:var(--s6);border-radius:var(--r-lg);background:var(--surface,var(--card));color:var(--text);box-shadow:var(--sh-3);opacity:0;transform:translateY(8px) scale(.985);transition:opacity var(--dur-base) var(--ease-out),transform var(--dur-base) var(--ease-out);overflow:auto;scrollbar-width:none}
.pst-card::-webkit-scrollbar{display:none}
.pst.on .pst-sc{opacity:1}.pst.on .pst-card{opacity:1;transform:none}
.pst.off .pst-sc,.pst.off .pst-card{transition-duration:var(--dur-fast);transition-timing-function:var(--ease-in,ease-in)}
.pst-st{display:grid;place-items:center;height:var(--sh);min-width:0}
.pst-pv{--ar:.8;--pbg:#efeff1;--pfg:#6a6a72;--ptr:#d6d6db;--pink:#0b0b0c;position:relative;width:min(100%,calc(var(--sh) * var(--ar)));aspect-ratio:var(--ar);border-radius:var(--r-md);overflow:hidden;box-shadow:var(--sh-2);background:var(--pbg)}
.pst-pv.sw{animation:pstsw var(--dur-base) var(--ease-out)}
@keyframes pstsw{from{opacity:.4;transform:scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pst-pv.sw,.pst-f.in{animation:none}}
.pst-pv canvas{display:block;width:100%;height:100%}
.pst-load{position:absolute;inset:0;display:grid;place-content:center;gap:var(--s3);justify-items:center;background:var(--pbg);color:var(--pfg);font:600 var(--fs-md) var(--f-ui);text-align:center;padding:0 var(--s4);transition:opacity var(--dur-base) var(--ease-out)}
.pst-load[hidden]{display:none}
.pst-bar{width:160px;max-width:100%;height:6px;border-radius:var(--r-pill);background:var(--ptr);overflow:hidden;display:block}
.pst-bar b{display:block;height:100%;width:0;border-radius:inherit;background:var(--pink);transition:width var(--dur-fast) linear}
.pst-side{display:grid;gap:var(--s3);align-content:center;min-width:0}
.pst-h{display:flex;align-items:center;gap:var(--s3)}
.pst-h h2{margin:0;font:700 var(--fs-2xl)/1.15 var(--f-ui);letter-spacing:-.02em;flex:1;min-width:0}
.pst-side p{margin:0;color:var(--muted);font-size:var(--fs-md);line-height:1.45}
.pst-f{display:grid;gap:var(--s1);min-width:0}
.pst-f[hidden]{display:none}
.pst-f.in{animation:pstin var(--dur-base) var(--ease-out)}
@keyframes pstin{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.pst-f label,.pst-f .pst-lb{font-size:var(--fs-sm);color:var(--muted);font-weight:600}
.pst-f input{height:var(--h-md);border:0;border-radius:var(--r-pill);background:var(--surface-3,var(--panel));padding:0 var(--s4);font:500 var(--fs-md) var(--f-ui);color:var(--text);min-width:0}
.pst-f input:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
.pst-seg{display:flex;width:100%;min-width:0}
.pst-seg button{flex:1 1 0;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:0 var(--s2);overflow:hidden;text-overflow:ellipsis}
.pst-seg button:disabled{opacity:.5;cursor:default}
.pst-dot{flex:none;width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(128,128,128,.55)}
.pst-b{display:flex;gap:var(--s2);flex-wrap:wrap;margin-top:var(--s1)}
.pst-b .btn{flex:1 1 120px;justify-content:center}
.pst-b .btn[hidden]{display:none}
.pst-b [data-r=png]{flex-basis:100%}
.pst-msg{min-height:1.45em}
@media (max-width:720px){
.pst{--sh:42vh;padding:0;place-items:end stretch}
.pst-card{grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;align-content:start;width:100%;max-height:94vh;border-radius:var(--r-lg) var(--r-lg) 0 0;padding:var(--s4);gap:var(--s3);transform:translateY(24px)}
.pst-st{align-items:start}
.pst-h h2{font-size:var(--fs-xl)}
.pst-lead{display:none}
.pst-side{align-content:start}
.pst-seg button{min-height:38px}
.pst-b .btn,.pst-f input{min-height:44px}
.pst-card{padding-bottom:0}
.pst-b{position:sticky;bottom:0;z-index:2;background:var(--surface,var(--card));padding:var(--s2) var(--s4) calc(var(--s4) + env(safe-area-inset-bottom,0px));margin:0 calc(-1 * var(--s4))}
.pst-b::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:20px;pointer-events:none;background:linear-gradient(to bottom,transparent,var(--surface,var(--card)))}
.pst-msg{padding-bottom:var(--s2)}}`;
  const FMT_LIST=[['1:1','1:1'],['4:5','4:5'],['9:16','9:16']],THEME_LIST=[['light','Светлая'],['dark','Тёмная'],['accent','Акцент']],MODE_LIST=[['grid','Знаки'],['phrase','Своя фраза']];
  const segHtml=(r,lab,list,dots)=>`<div class="pst-f"><span class="pst-lb" id="pst-l${r}">${lab}</span><div class="seg pst-seg" role="group" aria-labelledby="pst-l${r}" data-r="${r}">${list.map(([v,t])=>`<button type="button" data-v="${v}" aria-pressed="false">${dots?`<i class="pst-dot" style="background:${THEMES[v].bg}"></i>`:''}${t}</button>`).join('')}</div></div>`;
  /* FX80 A09: только явный H.264 — голый 'video/mp4' в Chromium даёт VP9 в контейнере MP4, он не играет в соцсетях и на iOS */
  const MP4S=['video/mp4;codecs=avc1','video/mp4;codecs=avc1.42E01E','video/mp4;codecs=h264'],WEBMS=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  const mimeOf=l=>{try{return window.MediaRecorder&&typeof MediaRecorder.isTypeSupported==='function'&&HTMLCanvasElement.prototype.captureStream?l.find(m=>MediaRecorder.isTypeSupported(m))||'':'';}catch(e){return '';}};
  const SUGGEST=['Привет, мир','Съешь ещё булок','Hello, world','Aa Bb Cc'];
  function suggest(id){const f=FONTS[id];for(const c of SUGGEST){const r=phraseOf(f,c);if(!r.miss.length&&r.text)return c;}return '';}
  function ensureDom(){
    if(SH.dom)return SH.dom;
    const st=document.createElement('style');st.id='pst-css';st.textContent=CSS;document.head.appendChild(st);
    const el=document.createElement('div');el.className='pst';el.id='pst';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','pst-t');
    el.innerHTML=`<div class="pst-sc" data-r="sc"></div><div class="pst-card" data-r="card">
<div class="pst-st"><div class="pst-pv" data-r="pv"><canvas data-r="cv" aria-label="Постер вашего шрифта" role="img"></canvas><div class="pst-load" data-r="load"><span class="pst-bar"><b data-r="bar"></b></span><span data-r="lt">Собираем веса шрифта…</span></div></div></div>
<div class="pst-side"><div class="pst-h"><h2 id="pst-t">Поделиться шрифтом</h2><button class="ibtn" type="button" data-r="x" aria-label="Закрыть"><i class="ico i-close" aria-hidden="true"></i></button></div>
<p class="pst-lead">Живой постер вашего шрифта. Кадр-постер сохраняется в PNG, петля в видео.</p>
${segHtml('sf','Формат',FMT_LIST)}${segHtml('st','Тема постера',THEME_LIST,1)}${segHtml('sm','Что на постере',MODE_LIST)}
<p class="pst-blk" data-r="blk" hidden></p>
<div class="pst-f"><label for="pst-nm">Название на постере</label><input id="pst-nm" type="text" maxlength="24" autocomplete="off" data-r="nm"></div>
<div class="pst-f" data-r="phf" hidden><label for="pst-ph">Фраза</label><input id="pst-ph" type="text" maxlength="${PHMAX}" autocomplete="off" placeholder="Своя фраза" data-r="ph"></div>
<div class="pst-b"><button class="btn pri" type="button" data-r="png">Скачать PNG</button><button class="btn" type="button" data-r="webm">Скачать WebM</button><button class="btn" type="button" data-r="mp4" hidden>Скачать MP4</button></div>
<p class="pst-msg" data-r="msg" aria-live="polite"></p></div></div>`;
    document.body.appendChild(el);
    const q=n=>el.querySelector('[data-r='+n+']'),d={el,q,sc:q('sc'),card:q('card'),pv:q('pv'),cv:q('cv'),load:q('load'),bar:q('bar'),lt:q('lt'),x:q('x'),nm:q('nm'),ph:q('ph'),phf:q('phf'),png:q('png'),webm:q('webm'),mp4:q('mp4'),msg:q('msg'),sf:q('sf'),st:q('st'),sm:q('sm'),blk:q('blk')};
    SH.dom=d;
    d.x.addEventListener('click',close);d.sc.addEventListener('click',close);
    el.addEventListener('keydown',e=>{
      if(e.key==='Tab'){const f=[...el.querySelectorAll('button:not([disabled]),input')].filter(x=>x.offsetParent);if(!f.length)return;const a=f[0],z=f[f.length-1];
        if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});
    d.nm.addEventListener('change',()=>refresh());
    d.nm.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();d.nm.blur();}});
    d.ph.addEventListener('input',()=>{clearTimeout(SH.pt);SH.pt=setTimeout(refresh,300);});/* набор текста: пересборка шрифта (если появились новые знаки) не чаще раза в 300 мс */
    d.ph.addEventListener('change',()=>{clearTimeout(SH.pt);refresh();});
    d.ph.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();d.ph.blur();}});
    const seg=(g,fn)=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&g.contains(b))fn(b.dataset.v);});
    seg(d.sf,setFormat);seg(d.st,setTheme);seg(d.sm,setMode);
    d.png.addEventListener('click',exportPng);d.webm.addEventListener('click',()=>exportVideo('webm'));d.mp4.addEventListener('click',()=>exportVideo('mp4'));
    new ResizeObserver(()=>{if(SH.open&&SH.face)render();}).observe(d.cv);
    document.addEventListener('visibilitychange',syncPlay);
    document.addEventListener('keydown',e=>{if(SH.open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}},true);/* Esc закрывает, где бы ни был фокус */
    return d;
  }
  /* состояние контролов -> DOM: сегменты, пропорции и цвета превью, поле фразы */
  function syncUi(anim){
    const d=SH.dom;if(!d)return;const pal=THEMES[SH.theme];
    const sg=(g,v)=>[...g.children].forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
    sg(d.sf,SH.F.id);sg(d.st,SH.theme);sg(d.sm,SH.mode);
    d.pv.style.setProperty('--ar',String(W/SH.F.H));d.pv.style.setProperty('--pbg',pal.bg);d.pv.style.setProperty('--pfg',SH.theme==='light'?'#6a6a72':pal.muted);
    d.pv.style.setProperty('--ptr',SH.theme==='light'?'#d6d6db':'rgba(128,128,128,.35)');d.pv.style.setProperty('--pink',pal.ink);
    {const b=blockOn();d.blk.hidden=!b;d.blk.textContent=b?(SH.mode==='phrase'?'Режим «Блок»: фраза выровнена по ширине, как блок «Тяги».':'Режим «Блок»: на постере выровненный блок из редактора.'):'';d.el.dataset.block=b?'1':'';}
    d.el.dataset.fmt=SH.F.id;d.el.dataset.theme=SH.theme;d.el.dataset.mode=SH.mode;
    const was=d.phf.hidden;d.phf.hidden=SH.mode!=='phrase';
    if(was&&!d.phf.hidden&&anim){d.phf.classList.remove('in');void d.phf.offsetWidth;d.phf.classList.add('in');}
    if(anim){d.pv.classList.remove('sw');void d.pv.offsetWidth;d.pv.classList.add('sw');}
  }
  function setFormat(id){if(!FMTS[id]||SH.busy||FMTS[id]===SH.F)return;SH.F=FMTS[id];saveUi();syncUi(true);if(SH.face)render();}
  function setTheme(id){if(!THEMES[id]||SH.busy||id===SH.theme)return;SH.theme=id;saveUi();syncUi();if(SH.face)render();}
  function setMode(id){if((id!=='grid'&&id!=='phrase')||SH.busy||id===SH.mode)return;SH.mode=id;saveUi();const d=SH.dom;
    if(id==='phrase'&&!d.ph.value.trim())d.ph.value=suggest(SH.m.id);
    syncUi(true);refresh();}
  function render(t){
    const d=SH.dom;if(!d||!SH.face)return;if(t!=null)SH.t=t;
    const r=d.cv.getBoundingClientRect(),dp=Math.min(window.devicePixelRatio||1,2),w=Math.max(2,Math.round(r.width*dp)),h=Math.round(w*SH.F.H/W);
    if(d.cv.width!==w||d.cv.height!==h){d.cv.width=w;d.cv.height=h;}
    const c=d.cv.getContext('2d');c.setTransform(w/W,0,0,w/W,0,0);draw(c,SH.t);
  }
  function syncPlay(){
    const want=SH.open&&SH.face&&!document.hidden&&!(window.MO&&MO.off())&&!SH.busy;
    if(want&&!SH.run){SH.run=true;SH.t0=performance.now()-SH.t*1000;const f=n=>{if(!SH.run)return;SH.t=((n-SH.t0)/1000)%D;render();SH.raf=requestAnimationFrame(f);};SH.raf=requestAnimationFrame(f);}
    else if(!want&&SH.run){SH.run=false;cancelAnimationFrame(SH.raf);}
    if(!want&&SH.open&&SH.face&&!SH.busy){SH.t=POSTER;render();}
  }
  /* MP4 только если браузер умеет его записывать; иначе кнопки нет. WebM как раньше */
  function syncCaps(){
    const d=SH.dom;if(!d)return;
    const wm=mimeOf(WEBMS),mp=mimeOf(MP4S);
    d.mp4.hidden=!mp;d.webm.hidden=false;
    const lock=!SH.face||SH.busy;
    d.png.disabled=lock;d.webm.disabled=lock||!wm;d.mp4.disabled=lock||!mp;
    d.webm.title=wm?'':'Этот браузер не записывает видео: сохраните PNG';
    d.card.querySelectorAll('.pst-seg button,input').forEach(b=>{b.disabled=!!SH.busy;});
  }
  function note(){
    const d=SH.dom,m=SH.m;if(!d||!m)return;const a=[];
    if(SH.static)a.push('У этого шрифта нет оси веса: постер без движения весов.');
    if(SH.mode==='phrase'){
      if(m.raw&&m.miss.length)a.push((m.phrase&&m.raw&&phraseOf(FONTS[m.id],m.raw).text?'Нет в шрифте, пропущено: ':'В шрифте нет знаков этой фразы: ')+m.miss.join(' ')+'.');
    }
    d.msg.textContent=a.join(' ');
  }
  /* idle prebuild of the phrase subset; while an export holds the dialog busy the timer is re-armed instead of dropped */
  function armPhrase(){clearTimeout(SH.wp);SH.wp=setTimeout(()=>{if(!SH.open||SH.mode!=='grid')return;if(SH.busy)armPhrase();else warmPhrase();},500);}
  function useModel(m,f){
    const d=SH.dom;SH.m=m;SH.face=f;SH.fam=f.fam;SH.static=f.static;SH.k0=f.k0;SH.hero=SH.ph=SH.nf=SH.gs=null;
    if(document.activeElement!==d.nm)d.nm.value=m.name;
    d.load.hidden=true;syncCaps();note();SH.t=POSTER;render();syncPlay();
    if(SH.mode==='grid'&&SH.open)armPhrase();
  }
  async function prep(m){
    const d=ensureDom(),gen=++SH.gen;
    SH.m=m;SH.face=null;if(document.activeElement!==d.nm)d.nm.value=m.name;
    d.load.hidden=false;d.bar.parentNode.hidden=false;d.bar.style.width='0';d.lt.textContent='Собираем веса шрифта…';syncCaps();
    try{
      const f=await faceFor(m,v=>{d.bar.style.width=Math.round(v*100)+'%';},gen);
      if(gen!==SH.gen)return;
      useModel(m,f);
    }catch(e){
      if(gen!==SH.gen||(e&&e.message==='cancel'))return;
      d.lt.textContent='Не удалось собрать постер. Попробуйте ещё раз';d.bar.parentNode.hidden=true;
    }
  }
  /* название или фраза изменились: тот же набор знаков (или уже собранный) = только перерисовка, новые знаки = пересборка шрифта постера */
  function refresh(){
    if(!SH.open||!SH.m||!SH.dom)return;const d=SH.dom;
    const m=model(SH.m.id,d.nm.value,SH.mode==='phrase'?d.ph.value:'',SH.mode==='phrase'),r=flyFor(m);
    const cur=SH.face&&SH.face.sub&&m.id===SH.m.id&&m.sub.every(ch=>SH.face.sub.has(ch))?SH.face:null;/* уже собранный шрифт покрывает все знаки (фразу сократили): пересборка не нужна */
    if(r.hit||cur){SH.gen++;SH.run=false;cancelAnimationFrame(SH.raf);useModel(m,cur||r.hit);return;}
    SH.run=false;cancelAnimationFrame(SH.raf);prep(m);
  }
  async function open(id,name,o){
    id=id||S.fontId;if(!FONTS[id]){return;}
    {const tt=document.getElementById('toast');if(tt)tt.classList.remove('on');}/* a toast shown a moment ago must not stay over the dialog */
    document.body.dataset.pst='1';/* пока диалог открыт, toast уходит в строку сообщения диалога, а не поверх него */
    if(id!==S.fontId){try{switchFont(id);}catch(e){}}
    const d=ensureDom();SH.opener=(o&&o.opener)||document.activeElement;
    /* W89 C: макет постера челленджа («Сообщество»): формат, тема и фраза из пресета; прежние настройки возвращаются при закрытии, в память диалога пресет не пишется */
    const pend=window.SHARE&&SHARE.pending;if(pend){SHARE.pending=null;}
    SH.ch=(o&&o.ch)||(pend&&pend.ch)||null;SH.prev=null;
    const pset=(o&&o.preset)||(pend&&pend.preset);
    if(pset){const pr=pset;SH.prev={F:SH.F,theme:SH.theme,mode:SH.mode};
      if(FMTS[pr.fmt])SH.F=FMTS[pr.fmt];if(THEMES[pr.theme])SH.theme=pr.theme;if(pr.mode==='phrase'||pr.mode==='grid')SH.mode=pr.mode;
      if(pr.phrase)d.ph.value=String(pr.phrase).slice(0,PHMAX);}
    const m0=model(id,name!=null?name:(id===S.fontId?S.family:FONTS[id].name),'');
    d.nm.value=m0.name;if(SH.mode==='phrase'&&!d.ph.value.trim())d.ph.value=suggest(id);
    d.el.hidden=false;d.el.classList.remove('off');SH.open=true;SH.m=m0;syncUi();syncCaps();
    requestAnimationFrame(()=>{d.el.classList.add('on');});
    prep(model(id,m0.name,SH.mode==='phrase'?d.ph.value:'',SH.mode==='phrase'));
    setTimeout(()=>{try{d.nm.focus({preventScroll:true});}catch(e){}},60);
  }
  function close(){
    const d=SH.dom;if(!d||!SH.open)return;
    SH.open=false;SH.gen++;SH.run=false;cancelAnimationFrame(SH.raf);clearTimeout(SH.pt);
    if(SH.prev){SH.F=SH.prev.F;SH.theme=SH.prev.theme;SH.mode=SH.prev.mode;SH.prev=null;}
    d.el.classList.remove('on');d.el.classList.add('off');delete document.body.dataset.pst;
    const done=()=>{if(!SH.open)d.el.hidden=true;};setTimeout(done,(window.MO&&MO.off())?0:200);
    try{if(SH.opener&&SH.opener.focus)SH.opener.focus({preventScroll:true});}catch(e){}
  }
  /* ---------- экспорт ---------- */
  const base=()=>(typeof psSafe==='function'?psSafe(SH.m.name):'font')+'-poster-'+SH.F.id.replace(':','x');
  function off(S_){const o=document.createElement('canvas');o.width=Math.round(W*S_);o.height=Math.round(SH.F.H*S_);const c=o.getContext('2d');c.setTransform(S_,0,0,S_,0,0);return [o,c];}
  async function exportPng(){
    if(!SH.face||SH.busy)return;
    const [o,c]=off(2);draw(c,POSTER);
    const blob=await new Promise(r=>o.toBlob(r,'image/png'));if(!blob){toast('Не удалось собрать картинку. Попробуйте ещё раз');return;}
    const ok=await saveFile(base()+'.png',new Uint8Array(await blob.arrayBuffer()),'image/png');
    if(ok&&SH.ch){try{document.dispatchEvent(new CustomEvent('gtype:poster',{detail:{ch:SH.ch,fmt:SH.F.id,theme:SH.theme,mode:SH.mode,font:SH.m&&SH.m.id,name:SH.m&&SH.m.name,canvas:o}}));}catch(e){}}
  }
  async function exportVideo(kind){
    if(!SH.face||SH.busy||!window.MediaRecorder)return;const d=SH.dom;
    const mt=mimeOf(kind==='mp4'?MP4S:WEBMS);
    if(!mt){toast('Этот браузер не записывает видео');return;}
    SH.busy=true;syncPlay();syncCaps();
    const [o,c]=off(4/3);
    try{
      const rc=new MediaRecorder(o.captureStream(30),{mimeType:mt,videoBitsPerSecond:4e6}),ch=[];
      if(kind==='mp4'&&!/avc1|h264/i.test(rc.mimeType||mt))throw new Error('mp4 codec');
      const done=new Promise(r=>{rc.ondataavailable=e=>e.data&&e.data.size&&ch.push(e.data);rc.onstop=r;});
      rc.start();const s0=performance.now();draw(c,0);
      await new Promise(res=>{const f=n=>{const t=(n-s0)/1000;d.msg.textContent='Запись петли: '+Math.min(D,Math.ceil(t))+' из '+Math.ceil(D)+' с';if(t>=D){rc.stop();res();return;}draw(c,t);requestAnimationFrame(f);};requestAnimationFrame(f);});
      await done;
      const ty=mt.split(';')[0],blob=new Blob(ch,{type:ty});d.msg.textContent='';
      await saveFile(base()+'.'+kind,new Uint8Array(await blob.arrayBuffer()),ty);
    }catch(e){toast('Не удалось записать видео. Попробуйте ещё раз');d.msg.textContent='';}
    finally{SH.busy=false;syncCaps();note();syncPlay();}
  }
  /* для проверок: рамки всех элементов кадра t */
  function recFrame(t){const [o,c]=off(1);SH.rec=[];draw(c,t);const r=SH.rec;SH.rec=null;return {r,W,H:SH.F.H,G,size:(SH.mode==='phrase'?SH.ph:SH.hero)&&(SH.mode==='phrase'?SH.ph:SH.hero).size,fmt:SH.F.id,mode:SH.mode};}
  window.SHARE={open,close,warm,warmed,warmedPhrase,recFrame,get state(){return SH;},D,POSTER,mp4:()=>mimeOf(MP4S),syncCaps};
})();
