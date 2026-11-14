/* ===== DEMOS (Stage 2): живые демо инструментов (ячейки, насыщенность, кернинг, экспорт) =====
   Источник: demos84 (утверждённые демо), перенесены как есть: тот же вид, сюжеты и тайминги. CSS: ui_demos.css (всё под .dm, классы dm-*).
   Кадр = чистая функция времени t (seek(t)), без таймеров; играет только rAF, пока демо видно (IntersectionObserver), вкладка активна и нет reduced motion / автоматизации (MO.off()).
   Первый кадр = постер (кадр, который рассказывает историю сам); создание DOM откладывается до первого показа (запас 200px), место зарезервировано CSS (aspect-ratio), сдвига нет.
   Где: главная «Как это работает» (#dm-home) и подсказки инструментов: кнопки [data-dm-help=cells|weight|kern|save] открывают общий поповер #dmpop.
   API: DM.mount(host,key,{io}) -> {init,ctl(bool),seek(t),el}, DM.help(btn,hint), DM.hintHTML(hint,cls). */
(function(){
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),mix=(a,b,t)=>a+(b-a)*t;
  const bez=(x1,y1,x2,y2)=>t=>{if(t<=0||t>=1)return clamp(t);let a=0,b=1,m,x;for(let i=0;i<22;i++){m=(a+b)/2;x=3*(1-m)*(1-m)*m*x1+3*(1-m)*m*m*x2+m*m*m;x<t?a=m:b=m}m=(a+b)/2;return 3*(1-m)*(1-m)*m*y1+3*(1-m)*m*m*y2+m*m*m};
  const TRV=bez(.45,0,.1,1),ARR=bez(.25,.8,.25,1),SOFT=bez(.4,0,.2,1),LIN=x=>x;
  const P=(t,a,b,e)=>{const p=clamp((t-a)/(b-a));return e?e(p):p};
  const seg=(t,p,e=SOFT)=>{if(t<=p[0][0])return p[0][1];for(let i=0;i<p.length-1;i++)if(t<p[i+1][0])return mix(p[i][1],p[i+1][1],e(P(t,p[i][0],p[i+1][0])));return p[p.length-1][1]};
  const pulse=(t,a)=>P(t,a,a+.12,SOFT)-P(t,a+.14,a+.32,SOFT);
  const press=(el,v)=>el.style.setProperty('--pr',v);
  /* cursor: keys=[{t,p:[x,y]|fn,e,o}]; travel eased between keys */
  function Cur(el){return(t,keys)=>{let i=0;while(i<keys.length-1&&t>=keys[i+1].t)i++;const a=keys[i],b=keys[Math.min(i+1,keys.length-1)];const pa=a.pp||(a.pp=typeof a.p=='function'?a.p():a.p),pb=b.pp||(b.pp=typeof b.p=='function'?b.p():b.p);
    const u=b.t>a.t?P(t,a.t,b.t,b.e||TRV):1;const x=mix(pa[0],pb[0],u),y=mix(pa[1],pb[1],u);el.style.transform=`translate(${x}px,${y}px)`;el.style.opacity=mix(a.o??1,b.o??1,u);return[x,y]}}
  /* odometer: digit columns, last digit first */
  function Roll(host,n){host.classList.add('dm-rl');host.innerHTML='';const cols=[];for(let i=0;i<n;i++){const s=document.createElement('s'),q=document.createElement('i');q.innerHTML=Array.from({length:30},(_,k)=>`<u>${k%10}</u>`).join('');s.appendChild(q);host.appendChild(s);cols.push(q)}
    return v=>{v=Math.max(0,v);for(let i=0;i<n;i++){const u=Math.pow(10,n-1-i),q=v/u,b=Math.floor(q),f=q-b;const pos=u==1?v:b+(f>.86?SOFT((f-.86)/.14):0);const m=((pos%10)+10)%10;{const op=i<n-1?clamp((v-u*.86)/(u*.14)):1;cols[i].parentNode.style.opacity=op};cols[i].style.transform=`translateY(${-(m+10)*1.2}em)`}}}
  const CURSVG='<svg class="dm-cur" data-r="cur" viewBox="0 0 22 22"><path d="M4 3l13 6.5-5.5 1.8L9 17.5z"/></svg>';

  /* ---------- the four demos: fn(X) -> {D, POSTER, seek}; X = {st, q(name), pt, rc, k} ---------- */
  const DEMOS={
  d1:{html:u=>`<svg width="0" height="0" style="position:absolute"><filter id="dmg${u}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur data-r="gb" in="SourceGraphic" stdDeviation="2.6"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"/></filter><filter id="dmh${u}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur data-r="gb2" in="SourceGraphic" stdDeviation=".6"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -6"/></filter></svg><div class="dm-hero" data-r="hero"><div class="dm-hh"><b class="dm-ttl">Ячейки</b><i class="dm-ph" style="width:48px"></i><i class="dm-ph" style="width:36px"></i><button class="dm-btn dm-gh" data-r="clr">Очистить</button></div><div class="dm-rail"><i class="dm-ph" style="width:52px"></i><i class="dm-ph" style="width:36px"></i><i class="dm-ph" style="width:60px"></i><i class="dm-ph" style="width:44px"></i><i class="dm-ph" style="width:56px"></i></div><div class="dm-cv" data-r="cv"><div class="dm-cells" data-r="cells"></div></div><div class="dm-set"><div class="dm-seg" data-r="seg"><i class="dm-th"></i><button data-r="b1">Круги</button><button data-r="b2">Ромбы</button></div><div class="dm-row"><span class="dm-lb">Переход</span><span class="dm-val"><span data-r="val"></span><small>%</small></span></div><div class="dm-sl" data-r="sl"><i class="dm-fl"></i><i class="dm-kn"></i></div><div class="dm-bars"><i class="dm-ph" style="width:200px"></i><i class="dm-ph" style="width:340px"></i><i class="dm-ph" style="width:260px"></i></div></div><div class="dm-tiles"><i></i><i></i><i></i></div></div><div class="dm-sat dm-lt" data-r="line"><span class="dm-slot" data-r="slot"><b class="dm-gl" data-r="gl">Ж</b><i class="dm-cells" data-r="lcells" style="filter:url(#dmh${u})"></i></span><span class="dm-tx">ук</span></div><div class="dm-fly" data-r="fly"><div class="dm-cells" data-r="fcells" style="position:absolute"></div></div>`,mk:X=>{const q=X.q,pt=X.pt,rc=X.rc;
    const gl=q('gl'),lcells=q('lcells'),gb2=q('gb2'),cv=q('cv'),cells=q('cells'),fly=q('fly'),fcells=q('fcells'),slot=q('slot'),seg_=q('seg'),th=seg_.firstElementChild,b1=q('b1'),b2=q('b2'),clr=q('clr'),sl=q('sl'),gb=q('gb'),cur=Cur(q('cur')),roll=Roll(q('val'),3);
    const stem=[...Array(9)].map((_,r)=>[r,4]),L=[[0,0],[1,1],[2,2],[3,3],[4,4],[5,3],[6,2],[7,1],[8,0]],R=L.map(([r,c])=>[r,8-c]),SP=[stem,L,R],TT=[[2.4,3.4],[3.8,4.6],[4.9,5.7]];
    const D=12.7,POSTER=10.2;let pitch=0,seq=[],pairs=[],G=[];
    function mkGroup(g,ps,cs){g.innerHTML='';g.style.setProperty('--cs',cs+'px');const A=seq.map(o=>{const e=document.createElement('i');e.className='dm-cl';e.style.left=(o.c+.5)*ps+'px';e.style.top=(o.r+.5)*ps+'px';g.appendChild(e);return e});
      const B=pairs.map(([a,b])=>{const e=document.createElement('i');e.className='dm-br';const x0=(seq[a].c+.5)*ps,y0=(seq[a].r+.5)*ps,x1=(seq[b].c+.5)*ps,y1=(seq[b].r+.5)*ps,d=Math.hypot(x1-x0,y1-y0);e.style.cssText=`left:${x0}px;top:${y0}px;width:${d}px;transform:rotate(${Math.atan2(y1-y0,x1-x0)}rad) scaleX(var(--bs,0)) scaleY(var(--bs,0))`;g.appendChild(e);return e});const TH=pairs.map(([a,b])=>Math.atan2((seq[b].r-seq[a].r),(seq[b].c-seq[a].c)));return{g,A,B,ps,cs,TH}}
    function build(){pitch=cv.clientWidth/9;if(!pitch)return;gb.setAttribute('stdDeviation',pitch*.1);seq=[];const seen={};
      cv.querySelectorAll('.dm-dt').forEach(e=>e.remove());for(let r=0;r<9;r++)for(let c=0;c<9;c++){const d=document.createElement('i');d.className='dm-dt';d.style.cssText=`left:${(c+.5)*pitch}px;top:${(r+.5)*pitch}px`;cv.insertBefore(d,cells)}
      SP.forEach((s,k)=>s.forEach(([r,c],i)=>{const key=r+','+c;if(seen[key]!==undefined)return;seen[key]=seq.length;seq.push({r,c,tf:TT[k][0]+(TT[k][1]-TT[k][0])*i/(s.length-1)})}));
      pairs=[];seq.forEach((a,i)=>seq.forEach((b,j)=>{const wz=(q,w)=>q.r==4&&q.c==4&&Math.abs(w.r-4)==1&&Math.abs(w.c-4)==1;if(j>i&&Math.abs(a.r-b.r)<=1&&Math.abs(a.c-b.c)<=1&&!wz(a,b)&&!wz(b,a))pairs.push([i,j])}));
      const ps=slot.clientWidth/9;gb2.setAttribute('stdDeviation',ps*.1);fly.style.width=fly.style.height=cv.clientWidth+'px';fcells.style.inset='0';
      G=[mkGroup(cells,pitch,pitch*.66),mkGroup(fcells,pitch,pitch*.66),mkGroup(lcells,ps,ps*1.45)];lcells.style.inset='0'}
    const cell=(r,c)=>pt(cv,(c+.5)/9,(r+.5)/9);
    function seek(t){if(pitch!==cv.clientWidth/9)build();
      const M=t<1.1?100:t<2.0?100*(1-P(t,1.1,2.0,SOFT)):t<6.7?0:100*P(t,6.7,8.1,SOFT);
      const n=seq.length,fi=seq.map(o=>P(t,o.tf-.1,o.tf+.4,ARR)),fo=seq.map((o,i)=>1-P(t,11.3+(n-1-i)*.026,11.3+(n-1-i)*.026+.28,SOFT)),f=fi.map((x,i)=>x*fo[i]);
      G.forEach(o=>{o.g.style.setProperty('--rd',mix(50,10,M/100)+'%');o.g.style.setProperty('--ro',M*.45+'deg');const rho=M*.45*Math.PI/180;
        o.A.forEach((e,i)=>e.style.setProperty('--sc',f[i]));o.B.forEach((e,k)=>{const[a,b]=pairs[k],al=o.TH[k]+Math.PI/2-rho;e.style.setProperty('--bh',o.cs*mix(1,Math.abs(Math.cos(al))+Math.abs(Math.sin(al)),M/100)+'px');e.style.setProperty('--bs',Math.min(P(t,Math.max(seq[a].tf,seq[b].tf)-.05,Math.max(seq[a].tf,seq[b].tf)+.4,ARR),fo[a],fo[b]))})});
      const w=(seg_.clientWidth-6)/2,g=P(t,1.0,1.55,TRV)*(t<6)+(t>=6?1-P(t,6.6,7.15,TRV):0);th.style.width=w+'px';th.style.transform=`translateX(${w*(1-g)}px)`;
      b1.style.color=`color-mix(in srgb,var(--on-ink) ${g*100}%,var(--text-2))`;b2.style.color=`color-mix(in srgb,var(--on-ink) ${(1-g)*100}%,var(--text-2))`;
      press(b1,pulse(t,1.0));press(b2,pulse(t,6.6));press(clr,pulse(t,11.2));
      roll(M);const x=sl.clientWidth*M/100;sl.children[1].style.left=x+'px';sl.children[0].style.width=x+'px';
      const fp=P(t,8.2,9.2,TRV),a=rc(cv),b=rc(slot),s=b.h/a.h,sw=P(t,8.95,9.3,SOFT),back=P(t,11.9,12.5,SOFT);
      fly.style.opacity=P(t,8.05,8.3)*(1-sw);lcells.style.opacity=sw*(t<11.3?1:1);
      gl.style.opacity=1-sw*(1-back)+0;if(t>=11.3)gl.style.opacity=back;
      fly.style.transform=`translate(${mix(a.x,b.x+(b.w-a.w*s)/2,fp)}px,${mix(a.y,b.y,fp)}px) scale(${mix(1,s,fp)})`;
      const K=[{t:0,p:pt(clr,.86,.65)},{t:.3,p:pt(clr,.86,.65)},{t:1.0,p:pt(b1,.93,.8)},{t:1.4,p:pt(b1,.93,.8)}];
      SP.forEach((s,k)=>{const[t0,t1]=TT[k];K.push({t:t0,p:cell(...s[0])});s.forEach((q,i)=>K.push({t:t0+(t1-t0)*i/(s.length-1),p:cell(...q),e:LIN}))});
      const bp=pt(b2,.93,.8);K.push({t:6.6,p:bp},{t:6.9,p:bp},{t:7.9,p:pt(seg_,-.09,3)},{t:9.6,p:pt(seg_,-.09,3)},{t:10.8,p:pt(clr,.86,.65)},{t:12.7,p:pt(clr,.86,.65)});
      K.sort((p,q)=>p.t-q.t);cur(t,K)}
    return{D,POSTER,seek}}},
  d2:{html:u=>`<div class="dm-hero" data-r="hero"><div class="dm-hh"><b class="dm-ttl">Параметры</b><button class="dm-btn dm-gh" data-r="rst">Сбросить</button></div><div class="dm-rail"><i class="dm-ph" style="width:52px"></i><i class="dm-ph" style="width:36px"></i><i class="dm-ph" style="width:60px"></i><i class="dm-ph" style="width:44px"></i><i class="dm-ph" style="width:56px"></i></div><div class="dm-wd" data-r="wd">Фонарь</div><div class="dm-ct"><div class="dm-row"><span class="dm-lb">Насыщенность</span><span class="dm-val"><span data-r="val"></span><span>0</span></span></div><div class="dm-sl" data-r="sl"><i class="dm-fl"></i><i class="dm-kn"></i></div></div></div><div class="dm-sat dm-lt" data-r="card"><b data-r="cg">Ф</b></div>`,mk:X=>{const q=X.q,pt=X.pt,rc=X.rc;
    const wd=q('wd'),cg=q('cg'),sl=q('sl'),fl=sl.children[0],kn=sl.children[1],rst=q('rst'),curE=q('cur'),cur=Cur(curE),roll=Roll(q('val'),2);
    const D=10.4,POSTER=6.9,W0=300,WP=[[0,W0],[1.6,W0],[4.2,820],[4.5,820],[5.8,560],[8.2,560],[9.4,W0]];
    function seek(t){const W=Math.round(seg(t,WP)/10)*10,Wc=seg(t,WP);
      const wv=`"wght" ${Wc}`;wd.style.fontVariationSettings=wv;cg.style.fontVariationSettings=wv;
      roll(W/10);const f=(Wc-100)/800,x=sl.clientWidth*f;kn.style.left=x+'px';fl.style.width=x+'px';
      press(kn,P(t,1.4,1.55)*(1-P(t,5.9,6.05))+0);press(rst,pulse(t,8.1));
      const kp=w=>{const r=rc(sl);return[r.x+r.w*(w-100)/800,r.y+12]};
      const rp=pt(rst,.86,.65);
      const K=[{t:0,p:rp},{t:.3,p:rp},{t:1.4,p:kp(W0)},{t:1.6,p:kp(W0)},{t:5.8,p:kp(560)},{t:6.0,p:kp(560)},{t:6.9,p:[kp(560)[0]+46,kp(560)[1]-30]},{t:7.2,p:[kp(560)[0]+46,kp(560)[1]-30]},{t:8.0,p:rp},{t:10.4,p:rp}];
      cur(t,K);if(t>=1.6&&t<5.8){const p=kp(Wc);curE.style.transform=`translate(${p[0]}px,${p[1]}px)`}}
    return{D,POSTER,seek}}},
  d3:{html:u=>`<div class="dm-hero" data-r="hero"><div class="dm-hh"><b class="dm-ttl">Кернинг</b><button class="dm-btn dm-gh" data-r="rst">Сбросить</button></div><div class="dm-rail"><i class="dm-ph" style="width:52px"></i><i class="dm-ph" style="width:36px"></i><i class="dm-ph" style="width:60px"></i><i class="dm-ph" style="width:44px"></i><i class="dm-ph" style="width:56px"></i></div><i class="dm-band" data-r="band"></i><div class="dm-wd" data-r="wd"><span data-r="t">Т</span><span data-r="a">А</span><span>НЕЦ</span></div><i class="dm-tk" data-r="tk"></i><i class="dm-hd" data-r="hd"></i><div class="dm-list"><p><i></i><i class="dm-ph" style="width:200px"></i></p><p><i></i><i class="dm-ph" style="width:320px"></i></p><p><i></i><i class="dm-ph" style="width:260px"></i></p></div></div><div class="dm-sat dm-lt" data-r="card"><b>ТА</b><span class="dm-kv"><small>Кернинг</small><span class="dm-val"><span class="dm-sg" data-r="sg">−</span><span data-r="val"></span></span></span></div>`,mk:X=>{const q=X.q,pt=X.pt,rc=X.rc;
    const a=q('a'),tt=q('t'),band=q('band'),hd=q('hd'),sg=q('sg'),rst=q('rst'),hero=q('hero'),wdE=q('wd'),cur=Cur(q('cur')),roll=Roll(q('val'),2),stg=X.st;
    const D=10.2,POSTER=6.4,VP=[[0,0],[1.7,0],[3.7,-92],[4.0,-92],[4.7,-70],[8.0,-70],[9.1,0]];
    function seek(t){const V=seg(t,VP);a.style.marginLeft=(120+V)/1000+'em';
      roll(Math.round(-V));sg.style.opacity=clamp(-V/3);
      const ra=rc(a),rt=rc(tt),h=rc(hero),x0=rt.x+rt.w,x1=Math.max(ra.x,x0+2);
      band.style.left=x0-h.x+'px';band.style.width=(x1-x0)+'px';
      const w=rc(wdE),hy=w.y+w.h-h.y+8;hd.style.left=(ra.x-h.x)+'px';hd.style.top=hy+'px';q('tk').style.top=(hy+8)+'px';
      press(hd,P(t,1.5,1.65)*(1-P(t,4.8,4.95)));press(rst,pulse(t,7.9));
      const hp=()=>{const r=hd.getBoundingClientRect(),s=stg.getBoundingClientRect();return[(r.left-s.left)/X.k+10,(r.top-s.top)/X.k+10]},ph=hp();
      const rp=pt(rst,.86,.65),K=[{t:0,p:rp},{t:.4,p:rp}],p0=ph;
      K.push({t:1.5,p:p0},{t:1.7,p:p0});
      if(t<1.7)cur(t,K);else if(t<4.8){cur(t,[{t:0,p:ph},{t:99,p:ph,e:LIN}])}else{const pe=ph,qq=[pe[0]+150,pe[1]-10];cur(t,[{t:4.8,p:pe},{t:5.4,p:qq},{t:7.0,p:qq},{t:7.8,p:rp},{t:10.2,p:rp}])}}
    return{D,POSTER,seek}}},
  d4:{html:u=>`<div class="dm-hero" data-r="hero"><div class="dm-hh"><b class="dm-ttl">Экспорт</b><span class="dm-bt" data-r="sv"><i class="dm-ba"></i><i class="dm-bp"></i><i class="dm-bs" data-r="bs"></i><i class="dm-pg" data-r="pg"></i><span class="dm-l dm-l0" data-r="l0">Скачать шрифт</span><span class="dm-l dm-l1" data-r="l1"><span data-r="pc"></span><span>%</span></span><span class="dm-l dm-l2" data-r="l2"><svg viewBox="0 0 24 24"><path data-r="ckp" d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>Готово</span></span></div><div class="dm-rail"><i class="dm-ph" style="width:52px"></i><i class="dm-ph" style="width:36px"></i><i class="dm-ph" style="width:60px"></i><i class="dm-ph" style="width:44px"></i><i class="dm-ph" style="width:56px"></i></div><div class="dm-tile dm-k1" style="left:130px">Аа</div><div class="dm-tile dm-k2" style="left:266px">Жж</div><div class="dm-tile dm-p dm-t2" style="left:130px"></div><div class="dm-tile dm-p dm-t2" style="left:266px"></div><div class="dm-tile dm-p dm-t2" style="left:402px;width:200px"></div><div class="dm-hb" style="top:58px"><i class="dm-ph" style="width:120px"></i><i class="dm-ph" style="width:80px"></i></div><div class="dm-hb" style="top:172px"><i class="dm-ph" style="width:150px"></i><i class="dm-ph" style="width:96px"></i></div></div><div class="dm-sat dm-lt dm-tr" data-r="tray"><div class="dm-th"><b>Загрузки</b><button class="dm-btn dm-gh" data-r="clr">Убрать</button></div><div class="dm-trow dm-a"><i></i><i class="dm-ph" style="width:56px"></i></div><div class="dm-trow dm-b" data-r="slot"><i class="dm-sb" data-r="sb"></i></div></div><div class="dm-ft" data-r="fr"><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>MyFont.ttf<svg class="dm-ck" data-r="fck" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>`,mk:X=>{const q=X.q,pt=X.pt,rc=X.rc;
    const sv=q('sv'),fr=q('fr'),slot=q('slot'),sb=q('sb'),clr=q('clr'),cur=Cur(q('cur')),roll=Roll(q('pc'),3),pg=q('pg'),ba=sv.querySelector('.dm-ba'),bs=q('bs'),l0=q('l0'),l1=q('l1'),l2=q('l2'),ckp=q('ckp'),fck=q('fck');
    const D=11.4,POSTER=7.6,PP=[[1.6,0],[2.4,38],[3.5,66],[4.5,100]];
    const xf=(el,o,y)=>{el.style.opacity=o;el.style.transform=`translateY(${(1-o)*y}px)`};
    function seek(t){
      const s1=P(t,1.5,1.9,SOFT),s2=P(t,4.55,5.0,SOFT),idle=P(t,10.15,10.5,SOFT),ok=s2*(1-P(t,9.8,10.15,SOFT)),pr=seg(t,PP);
      press(sv,pulse(t,1.3));
      /* one label at a time: l0 out, l1 in, l1 out, l2 in; on the way back l2 out, then l0 in */
      xf(l0,clamp(t<4.55?1-P(t,1.5,1.7,SOFT):idle),-6);xf(l1,P(t,1.7,1.95,SOFT)*(1-P(t,4.55,4.75,SOFT)),6);xf(l2,P(t,4.75,5.0,SOFT)*(1-P(t,9.8,10.15,SOFT)),6);
      const pv=t<9.8?pr:100;roll(pv);pg.style.width=pv+'%';pg.style.opacity=s1*(1-s2);
      bs.style.opacity=ok;ba.style.opacity=1-ok;ckp.style.strokeDashoffset=1-P(t,4.8,5.2,SOFT)*(ok>0?1:0);
      const a=rc(sv),b=rc(slot),w=b.w;fr.style.width=w+'px';
      const em=P(t,5.1,5.5,ARR),tr=P(t,5.4,6.6,TRV),ex=P(t,9.4,9.95,SOFT);
      const sx=a.x+a.w-w,sy=a.y+a.h+10;
      const x=mix(sx,b.x,tr)-ex*14,y=mix(sy+(1-em)*-14,b.y,tr);
      fr.style.opacity=clamp(em)*(1-ex);fr.style.transform=`translate(${x}px,${y}px) scale(${mix(.86,1,tr)})`;
      fck.style.strokeDashoffset=1-P(t,6.6,7.0,SOFT);
      sb.style.opacity=1-P(t,6.2,6.7,SOFT)+P(t,10.0,10.5,SOFT);
      press(clr,pulse(t,9.2));
      const cp=pt(clr,.82,.65),sp=pt(sv,.88,.75),rest=pt(sv,.88,2.4);
      cur(t,[{t:0,p:cp},{t:.4,p:cp},{t:1.2,p:sp},{t:1.65,p:sp},{t:2.6,p:rest},{t:8.0,p:rest},{t:9.0,p:cp},{t:11.4,p:cp}])}
    return{D,POSTER,seek}}},
  d5:{html:u=>{const AL='АБВГДЕЖЗИЙКЛМНОП',cells=[...AL].map((c,i)=>`<div class="dm-ce"><i class="dm-cb"></i><u></u><b>${c}</b><em>04${(0x10+i).toString(16).toUpperCase()}</em></div>`).join(''),file=n=>`<div class="dm-fr"><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg><span>${n}.svg</span></div>`;
    return `<div class="dm-hero" data-r="hero"><div class="dm-hh"><b class="dm-ttl">Свой шрифт</b><span class="dm-lb" data-r="cnt">0 / 16</span><span class="dm-bt" data-r="bt"><i class="dm-ba"></i><i class="dm-bs" data-r="bs"></i><span class="dm-l dm-l0" data-r="l0">Создать шрифт</span><span class="dm-l dm-l2" data-r="l2"><svg viewBox="0 0 24 24"><path data-r="ckp" d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>Готово</span></span></div><div class="dm-rail"><i class="dm-ph" style="width:52px"></i><i class="dm-ph" style="width:36px"></i><i class="dm-ph" style="width:60px"></i><i class="dm-ph" style="width:44px"></i><i class="dm-ph" style="width:56px"></i></div><div class="dm-gr" data-r="gr">${cells}</div><div class="dm-pv" data-r="pv"><span>Д</span><span>О</span><span>М</span><span class="dm-cbars"><i class="dm-ph" style="width:96px"></i><i class="dm-ph" style="width:64px"></i></span></div></div><div class="dm-sat dm-lt dm-tr" data-r="tray"><div class="dm-th"><b>Файлы</b><span class="dm-lb">3 SVG</span></div><div class="dm-fl">${['д','о','м'].map((n,i)=>file(n).replace('class="dm-fr"',`class="dm-fr" data-r="r${i}"`)).join('')}</div></div>${['д','о','м'].map((n,i)=>`<div class="dm-fc" data-r="fc${i}"><svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg><span data-r="fn${i}">${n}.svg</span></div>`).join('')}`},mk:X=>{const q=X.q,pt=X.pt,rc=X.rc;
    const cells=[...q('gr').children],TG=[4,14,12],rows=[0,1,2].map(i=>q('r'+i)),fcs=[0,1,2].map(i=>q('fc'+i)),fns=[0,1,2].map(i=>q('fn'+i)),ws=[...q('pv').querySelectorAll('span')].slice(0,3),cnt=q('cnt'),bt=q('bt'),bs=q('bs'),l0=q('l0'),l2=q('l2'),ckp=q('ckp'),cur=Cur(q('cur'));
    const D=12,POSTER=6.4,T0=[.9,3.1,5.3],xf=(el,o,y)=>{el.style.opacity=o;el.style.transform=`translateY(${(1-o)*y}px)`};let last=-1;
    function seek(t){let n=0;const rest=P(t,10.7,11.2,SOFT);
      TG.forEach((ci,k)=>{const t0=T0[k],lift=P(t,t0+.5,t0+.7,SOFT),fl=P(t,t0+.5,t0+1.4,TRV),out=1-P(t,10.3+k*.1,10.65+k*.1,SOFT),f=P(t,t0+1.25,t0+1.75,ARR)*out;if(f>.5)n++;
        const ce=cells[ci],b=ce.querySelector('b');ce.style.background=`color-mix(in srgb,var(--canvas) ${f*100}%,var(--panel))`;b.style.color=`color-mix(in srgb,var(--glyph) ${f*100}%,var(--text-3))`;b.style.transform=`scale(${mix(1,1.3,f)})`;ce.querySelector('.dm-cb').style.opacity=1-f;ce.querySelector('u').style.opacity=1-f;ce.querySelector('em').style.opacity=1-f;
        rows[k].style.opacity=1-.65*lift*(1-rest);
        const a=rc(rows[k]),c=rc(ce),fc=fcs[k];fc.style.width=mix(a.w,c.w,fl)+'px';fc.style.height=mix(a.h,c.h,fl)+'px';fc.style.transform=`translate(${mix(a.x,c.x,fl)}px,${mix(a.y,c.y,fl)}px)`;fc.style.opacity=P(t,t0+.5,t0+.6)*(1-P(t,t0+1.25,t0+1.7,SOFT));fns[k].style.opacity=1-P(fl,0,.5);
        ws[k].style.opacity=.12+.88*f;ws[k].style.transform=`translateY(${(1-f)*8}px)`});
      if(n!==last){last=n;cnt.textContent=n+' / 16'}
      const s2=P(t,8.35,8.8,SOFT)*(1-P(t,10.3,10.6,SOFT)),s3=P(t,8.35,8.8,SOFT)*(1-P(t,10.4,10.8,SOFT));bs.style.opacity=s3;q('bt').firstElementChild.style.opacity=1-s3;/* one label at a time, same button width (grid stack) */xf(l0,t<9?1-P(t,8.35,8.6,SOFT):P(t,10.55,10.85,SOFT),-6);xf(l2,P(t,8.6,8.9,SOFT)*(1-P(t,10.3,10.55,SOFT)),6);ckp.style.strokeDashoffset=1-P(t,8.7,9.1,SOFT)*(s2>0?1:0);press(bt,pulse(t,8.1));
      const rp=pt(bt,.9,.85),bp=pt(bt,.7,.6),K=[{t:0,p:rp},{t:.3,p:rp}];
      T0.forEach((t0,k)=>{const rpt=pt(rows[k],.5,.5);K.push({t:t0,p:rpt},{t:t0+.5,p:rpt},{t:t0+1.4,p:pt(cells[TG[k]],.5,.5)})});
      K.push({t:7.5,p:bp},{t:8.4,p:bp},{t:10,p:rp},{t:12,p:rp});cur(t,K)}
    return{D,POSTER,seek}}},
  d6:{html:u=>{const AL='АБВГДЕЖЗИЙКЛМНОП',cells=[...AL].map(c=>`<i class="dm-c6">${c}</i>`).join('');
    return `<div class="dm-hero" data-r="hero"><div class="dm-hh"><b class="dm-ttl">Базовая кириллица</b><span class="dm-lb" data-r="cnt">0 из 64</span><button class="dm-btn dm-gh" data-r="ok">Готово</button></div><div class="dm-rail"><i class="dm-ph" style="width:52px"></i><i class="dm-ph" style="width:36px"></i><i class="dm-ph" style="width:60px"></i><i class="dm-ph" style="width:44px"></i><i class="dm-ph" style="width:56px"></i></div><div class="dm-cvs" data-r="cvs"><svg class="dm-gd" viewBox="0 0 260 232"><line x1="0" x2="260" y1="36" y2="36"/><line x1="0" x2="260" y1="96" y2="96"/><line class="dm-bl" x1="0" x2="260" y1="184" y2="184"/><line x1="0" x2="260" y1="214" y2="214"/><g class="dm-gh" data-r="gh"><path d="M88 36V184M172 36V184M88 108H172"/></g></svg><svg class="dm-gs" data-r="gs" viewBox="0 0 260 232"><path pathLength="1" d="M89 37C88 80 86 140 90 184"/><path pathLength="1" d="M173 36C171 90 174 150 171 184"/><path pathLength="1" d="M88 110C115 106 145 112 172 108"/></svg><span class="dm-tl"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg></span></div><span class="dm-lb dm-zl">Знаки</span><div class="dm-gr6" data-r="gr6">${cells}</div></div><div class="dm-sat dm-lt" data-r="card"><span class="dm-w6"><b data-r="wn">Н</b><b>ОС</b></span><span class="dm-lb dm-sm">Образец</span></div>`},mk:X=>{const q=X.q,pt=X.pt,rc=X.rc;
    const gs=q('gs'),cvs=q('cvs'),gh=q('gh'),ps=[...gs.querySelectorAll('path')],cells=[...q('gr6').children],ok=q('ok'),cnt=q('cnt'),wn=q('wn'),cur=Cur(q('cur')),TG=13,ST=[[1.0,2.3],[2.7,4.0],[4.4,5.3]],Ls=ps.map(p=>p.getTotalLength());
    const D=10.6,POSTER=7.3,tip=(k,u)=>{const p=ps[k].getPointAtLength(Ls[k]*u);const r=pt(cvs,p.x/260,p.y/232);return[r[0]-1,r[1]-1]};let last='';
    function seek(t){const sw=P(t,5.6,6.4,SOFT);
      ps.forEach((p,k)=>{p.style.strokeDashoffset=1-P(t,ST[k][0],ST[k][1],LIN)});gs.style.setProperty('--sw',mix(3,24,sw));gh.style.opacity=clamp(1-sw+P(t,9.8,10.4,SOFT));
      const fp=P(t,6.8,7.7,TRV),c=rc(cells[TG]),v=rc(cvs),gc=[v.x+v.w*130/260,v.y+v.h*110/232],s=(c.h*.6)/(148*v.w/260);
      gs.style.transform=`translate(${(c.x+c.w/2-gc[0])*fp}px,${(c.y+c.h/2-gc[1])*fp}px) scale(${mix(1,s,fp)})`;gs.style.opacity=t<7.5?1:1-P(t,7.5,7.8);
      const f=P(t,7.45,7.95,ARR)*(1-P(t,9.6,10.0,SOFT)),ce=cells[TG];ce.style.background=`color-mix(in srgb,var(--canvas) ${f*100}%,var(--panel))`;ce.style.color=`color-mix(in srgb,var(--glyph) ${f*100}%,var(--text-2))`;ce.style.transform=`scale(${mix(1,1.15,f)})`;
      const wf=P(t,7.7,8.2,ARR)*(1-P(t,9.6,10.0,SOFT));wn.style.opacity=.14+.86*wf;wn.style.transform=`translateY(${(1-wf)*8}px)`;
      const txt=(f>.5?1:0)+' из 64';if(txt!==last){last=txt;cnt.textContent=txt}
      press(ok,pulse(t,6.7));
      const okp=pt(ok,.86,.65),K=[{t:0,p:okp},{t:.3,p:okp}];
      ST.forEach(([a,b],k)=>{K.push({t:a,p:tip(k,0)});for(let i=1;i<=8;i++)K.push({t:a+(b-a)*i/8,p:tip(k,i/8),e:LIN})});
      K.push({t:6.5,p:okp},{t:10.6,p:okp});cur(t,K)}
    return{D,POSTER,seek}}}
  };
  const INFO={
    d1:{t:'Ячейки',c:'Проведите по сетке: соседние ячейки сливаются в одну букву',a:'Демо: по сетке 9 на 9 проводят три штриха, ячейки сливаются в букву Ж, она встаёт в строку «Жук»'},
    d2:{t:'Насыщенность',c:'Тяните ползунок: буквы становятся толще или тоньше сразу',a:'Демо: ползунок насыщенности двигают от 300 до 820 и обратно, слово «Фонарь» меняет толщину'},
    d3:{t:'Кернинг',c:'Двигайте ручку между буквами, чтобы поправить зазор',a:'Демо: ручка между «Т» и «А» сдвигается влево, зазор закрывается, значение кернинга меняется'},
    d4:{t:'Экспорт',c:'«Скачать шрифт» — файл сразу появляется в загрузках',a:'Демо: нажимают «Скачать шрифт», идёт прогресс, готовый файл MyFont.ttf падает в загрузки'},
    d5:{t:'Собрать знак из знаков',c:'Бросьте SVG в ячейки: знаки встают на места и становятся шрифтом',a:'Демо: три SVG-файла из списка падают в ячейки Д, О, М сетки знаков, слово «ДОМ» в образце собирается, кнопка «Собрать шрифт» меняется на «Готово»'},
    d6:{t:'Отрисовать свой шрифт',c:'Рисуйте контур на сетке: он станет знаком и сразу встанет в слово',a:'Демо: на сетке с направляющими рисуют три штриха буквы Н, штрихи становятся знаком, он встаёт в ячейку и в слово «НОС»'}
  };
  const HINTS={cells:'d1',weight:'d2',kern:'d3',save:'d4'};

  /* ---------- mount: one demo in a host element ---------- */
  let UID=0;
  const reduced=()=>window.MO?MO.off():matchMedia('(prefers-reduced-motion:reduce)').matches;
  const all=new Set();
  const ioShow=new IntersectionObserver(es=>es.forEach(e=>{const i=e.target._dm;if(i){i.vis=e.isIntersecting;i.sync()}}),{threshold:0});
  const ioInit=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const i=e.target._dm;if(i){ioInit.unobserve(e.target);i.init()}}}),{rootMargin:'200px'});
  function mount(host,key,o){
    o=o||{};const def=DEMOS[key],info=INFO[key],u=++UID;
    host.innerHTML=`<div class="dm dm-${key}" style="--dm-goo:url(#dmg${u})"><div class="dm-box" role="img" aria-label="${info.a}"></div></div>`;
    const root=host.firstElementChild,box=root.firstElementChild;
    const inst={key,root,box,api:null,vis:!o.io,ctl:o.io!==false?true:false,t:0,raf:0,run:false,t0:0,k:1};
    box._dm=inst;
    inst.init=()=>{if(inst.api)return inst;
      box.innerHTML=`<div class="dm-st" aria-hidden="true">${def.html(u)}${CURSVG}</div>`;
      const st=box.firstElementChild,X={st,k:1,q:n=>st.querySelector('[data-r="'+n+'"]')};
      X.pt=(el,fx=.5,fy=.5)=>{const r=el.getBoundingClientRect(),s=st.getBoundingClientRect();return[(r.left-s.left+r.width*fx)/X.k,(r.top-s.top+r.height*fy)/X.k]};
      X.rc=el=>{const r=el.getBoundingClientRect(),s=st.getBoundingClientRect();return{x:(r.left-s.left)/X.k,y:(r.top-s.top)/X.k,w:r.width/X.k,h:r.height/X.k}};
      inst.X=X;inst.st=st;inst.api=def.mk(X);inst.t=inst.api.POSTER;
      inst.fit=()=>{const W=box.clientWidth;if(!W)return;/* one stage (720x340), uniformly scaled to the card width */
        X.k=W/720;st.style.transform=`scale(${X.k})`;inst.seekNow()};
      inst.seekNow=()=>{try{inst.api.seek(inst.t)}catch(e){}};
      new ResizeObserver(inst.fit).observe(box);inst.fit();
      if(document.fonts&&document.fonts.ready)document.fonts.ready.then(inst.seekNow);
      inst.sync();return inst};
    const tick=n=>{if(!inst.run)return;inst.t=((n-inst.t0)/1000)%inst.api.D;inst.seekNow();inst.raf=requestAnimationFrame(tick)};
    inst.play=()=>{if(inst.run||!inst.api)return;inst.run=true;inst.t0=performance.now()-inst.t*1000;inst.raf=requestAnimationFrame(tick)};
    inst.pause=()=>{inst.run=false;cancelAnimationFrame(inst.raf)};
    inst.sync=()=>{const go=inst.api&&inst.ctl&&inst.vis&&!document.hidden&&!reduced();go?inst.play():inst.pause()};
    inst.seek=t=>{inst.t=t;inst.seekNow()};
    inst.ctrl=v=>{inst.ctl=!!v;inst.sync()};
    all.add(inst);
    if(o.io===false){/* controlled by the owner (popover) */}else{ioShow.observe(box);ioInit.observe(box)}
    return inst}
  document.addEventListener('visibilitychange',()=>all.forEach(i=>i.sync()));
  try{matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',()=>all.forEach(i=>i.sync()))}catch(e){}

  /* ---------- home: «Как это работает» ---------- */
  /* ---------- home slider: cards keep their design size; the number of visible cards follows the width ---------- */
  const mod=(a,n)=>((a%n)+n)%n;
  const CMIN=440,CMAX=720;/* narrowest / widest card (px): 440 = stage scale .61 (smallest legible), 720 = the design width of the stage (scale 1) */
  const AUTO=5500;/* ms between slides (autoplay) */
  function carousel(g,N){
    const view=document.createElement('div');view.className='dm-view';
    const car=document.createElement('div');car.className='dm-car';car.id='dm-car';car.tabIndex=0;
    car.setAttribute('role','region');car.setAttribute('aria-roledescription','карусель');car.setAttribute('aria-label','Как это работает');
    g.parentNode.insertBefore(car,g);car.appendChild(view);view.appendChild(g);
    const dots=document.createElement('div');dots.className='dm-dots';dots.setAttribute('role','group');dots.setAttribute('aria-label','Выбор карточки');
    dots.innerHTML=Array.from({length:N},(_,i)=>`<button type="button" class="dm-dot" aria-label="Карточка ${i+1} из ${N}"></button>`).join('');car.appendChild(dots);
    const head=g.closest('section')?.querySelector('.vhead');
    const act=document.createElement('div');act.className='vact';
    act.innerHTML='<button class="arr" type="button" data-dir="-1" aria-label="Предыдущая карточка"><i class="ico i-chev-left"></i></button><button class="arr" type="button" data-dir="1" aria-label="Следующая карточка"><i class="ico i-chev-right"></i></button>';
    if(head)head.appendChild(act);
    const figs=[...g.children];
    const S={n:N,cw:CMAX,step:0,idx:0,mode:'static',anims:[],timer:0,hover:false,touchHold:0,inView:true,busy:false};
    const phone=()=>matchMedia('(max-width:719px)').matches;
    const X=(f,s)=>{f.style.transform=`translateX(${s*S.step}px)`};
    const slots=i=>figs.map((_,k)=>mod(k-i,N));
    function paint(){/* final positions + a11y state for the current index */
      const sl=slots(S.idx);
      figs.forEach((f,k)=>{if(S.mode==='swipe'){f.style.transform='';f.removeAttribute('aria-hidden');return}
        X(f,sl[k]);const vis=sl[k]<S.n;if(vis)f.removeAttribute('aria-hidden');else f.setAttribute('aria-hidden','true');f.toggleAttribute('inert',!vis)});
      dots.querySelectorAll('.dm-dot').forEach((d,k)=>{const on=k===S.idx;if(d.getAttribute('aria-current')!==String(on))d.setAttribute('aria-current',on)});
    }
    function cancelAnims(){S.anims.forEach(a=>{try{a.cancel()}catch(e){}});S.anims=[];S.busy=false;g.classList.remove('dm-moving')}
    function fit(){
      const sw=phone(),gap=parseFloat(getComputedStyle(g).columnGap)||20,W=car.clientWidth;
      cancelAnims();
      if(sw){S.mode='swipe';S.n=N}
      else{if(!W)return;const n=Math.max(1,Math.min(N,Math.floor((W+gap)/(CMIN+gap))));S.n=n;S.mode=n>=N?'static':'carousel';if(S.mode==='static')S.idx=0;
        S.cw=Math.min(CMAX,(W-(n-1)*gap)/n);S.step=S.cw+gap;
        car.style.setProperty('--dm-cw',S.cw+'px');car.style.setProperty('--dm-used',(S.n*S.cw+(S.n-1)*gap)+'px')}
      if(sw){car.style.removeProperty('--dm-cw');car.style.removeProperty('--dm-used')}
      const ctl=S.mode==='carousel';dots.hidden=!ctl;act.hidden=!ctl;
            paint();sched()}
    const dur=()=>{if(reduced())return 0;return window.MO&&MO.D?MO.D('slow'):550};
    const ease=()=>window.MO&&MO.E?MO.E('out'):'cubic-bezier(.2,0,0,1)';
    /* one step (dir=+1: next, -1: prev). Clone-free loop: cards are placed by (index - current) mod N; the card that leaves on one side is moved
       (off-screen, behind the clip) to the other end, so there is no rewind. */
    function step1(dir,d,e){
      cancelAnims();paint();
      const old=slots(S.idx);S.idx=mod(S.idx+dir,N);
      if(d<=0){paint();return Promise.resolve()}
      S.busy=true;g.classList.add('dm-moving');const mine=S.anims=[];
      const ps=figs.map((f,k)=>{let from=old[k];if(dir<0&&from===N-1)from=-1;const to=from-dir;
        const a=f.animate([{transform:`translateX(${from*S.step}px)`},{transform:`translateX(${to*S.step}px)`}],{duration:d,easing:e,fill:'both'});mine.push(a);return a.finished.catch(()=>0)});
      dots.querySelectorAll('.dm-dot').forEach((x,k)=>x.setAttribute('aria-current',k===S.idx));
      return Promise.all(ps).then(()=>{if(S.anims===mine){cancelAnims();paint();sched()}})}
    function go(dir){if(S.mode!=='carousel')return Promise.resolve();const p=step1(dir,dur(),ease());sched();return p}
    function goTo(k){if(S.mode!=='carousel')return;let d=mod(k-S.idx,N);if(!d)return;const back=d>N/2;const cnt=back?N-d:d;
      let p=Promise.resolve();for(let i=0;i<cnt;i++){const last=i===cnt-1;p=p.then(()=>step1(back?-1:1,cnt>1?Math.round(dur()*.6):dur(),last?ease():'linear'))}sched();return p}
    /* autoplay */
    const focusIn=()=>!!car.querySelector(':focus-visible')||car.matches(':focus-visible');
    const can=()=>S.mode==='carousel'&&!S.hover&&!S.touchHold&&!focusIn()&&S.inView&&!document.hidden&&!reduced()&&!S.busy;
    function sched(){clearTimeout(S.timer);S.timer=0;if(can())S.timer=setTimeout(()=>{S.timer=0;if(can())go(1);else sched()},AUTO)}
    S.can=can;
    car.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){S.hover=true;sched()}});
    car.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){S.hover=false;sched()}});
    car.addEventListener('focusin',sched);car.addEventListener('focusout',()=>setTimeout(sched,0));
    let hold=0,sx=0,sy=0,sid=null;
    car.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;clearTimeout(hold);S.touchHold=1;sched();sx=e.clientX;sy=e.clientY;sid=e.pointerId;hold=setTimeout(()=>{S.touchHold=0;sched()},12000)});
    car.addEventListener('pointerup',e=>{if(sid!==e.pointerId||e.pointerType==='mouse')return;sid=null;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5)go(dx<0?1:-1)});
    car.addEventListener('pointercancel',()=>{sid=null});
    car.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){if(S.mode!=='carousel')return;e.preventDefault();go(e.key==='ArrowRight'?1:-1)}});
    act.addEventListener('click',e=>{const b=e.target.closest('[data-dir]');if(b)go(+b.dataset.dir)});
    dots.addEventListener('click',e=>{const b=e.target.closest('.dm-dot');if(b)goTo([...dots.children].indexOf(b))});
    new IntersectionObserver(es=>{S.inView=es[es.length-1].isIntersecting;sched()},{threshold:0}).observe(car);
    document.addEventListener('visibilitychange',sched);
    try{matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',sched)}catch(e){}
    /* all six demos are created as soon as the section is near the screen (a card must not pop in while it slides); only visible ones play (ioShow) */
    const ioAll=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){ioAll.disconnect();g.querySelectorAll('.dm-box').forEach(b=>b._dm&&b._dm.init())}},{rootMargin:'200px'});ioAll.observe(car);
    new ResizeObserver(fit).observe(car);
    matchMedia('(max-width:719px)').addEventListener('change',fit);
    fit();
    Object.assign(S,{go,goTo,fit,figs,car,view,cycle:AUTO});Object.defineProperty(S,'running',{get:()=>!!S.timer});return S;
  }
  function home(){
    const g=document.getElementById('dm-home');if(!g||g.dataset.ready)return;g.dataset.ready='1';
    const ks=['d1','d2','d3','d4','d5','d6'];
    g.innerHTML=ks.map((k,i)=>`<figure class="dm-fig" role="group" aria-roledescription="слайд" aria-label="${i+1} из ${ks.length}"><div class="dm-h" data-dm="${k}"></div><figcaption><b>${INFO[k].t}</b><span>${INFO[k].c}</span></figcaption></figure>`).join('');
    g.querySelectorAll('.dm-h').forEach(h=>mount(h,h.dataset.dm));
    DM.car=carousel(g,ks.length);
  }

  /* ---------- tool hints: one shared popover ---------- */
  let pop=null,cur_=null,trig=null;
  function ensure(){if(pop)return pop;
    pop=document.createElement('div');pop.className='helpc dm-pop';pop.id='dmpop';pop.setAttribute('role','dialog');pop.tabIndex=-1;pop.hidden=true;
    pop.innerHTML='<div class="dm-pslot"></div><div class="dm-pt"><b></b><span></span></div>';document.body.appendChild(pop);return pop}
  function place(){if(!pop||pop.hidden||!trig)return;
    if(!trig.isConnected||!trig.getClientRects().length){close(true);return}
    const r=trig.getBoundingClientRect(),vw=innerWidth,vh=innerHeight,w=pop.offsetWidth,h=pop.offsetHeight;
    let left=clamp(r.left+r.width/2-w/2,12,Math.max(12,vw-w-12)),top=r.bottom+8,below=true;
    if(top+h>vh-12){top=r.top-h-8;below=false}
    top=clamp(top,12,Math.max(12,vh-h-12));
    pop.style.left=left+'px';pop.style.top=top+'px';pop.style.transformOrigin=(clamp(r.left+r.width/2-left,0,w))+'px '+(below?'0':'100%')}
  function open(btn,hint){
    const key=HINTS[hint];if(!key)return;ensure();
    if(trig===btn&&!pop.hidden){close();return}
    if(trig&&trig!==btn)trig.setAttribute('aria-expanded','false');
    trig=btn;btn.setAttribute('aria-expanded','true');
    const slot=pop.firstElementChild;let host=slot.querySelector('[data-dmk="'+key+'"]');
    if(!host){host=document.createElement('div');host.dataset.dmk=key;slot.appendChild(host);host._i=mount(host,key,{io:false})}
    [...slot.children].forEach(c=>{c.hidden=c!==host;if(c._i)c._i.ctrl(c===host)});
    pop.setAttribute('aria-label','Как это работает: '+INFO[key].t);pop.lastElementChild.firstChild.textContent=INFO[key].t;pop.lastElementChild.lastChild.textContent=INFO[key].c;
    pop.hidden=false;host._i.init();host._i.vis=true;host._i.sync();cur_=key;
    place();requestAnimationFrame(()=>{place();try{pop.focus({preventScroll:true})}catch(e){}})}
  function close(quiet){if(!pop||pop.hidden)return;pop.hidden=true;[...pop.firstElementChild.children].forEach(c=>c._i&&c._i.ctrl(false));
    if(trig){trig.setAttribute('aria-expanded','false');if(!quiet&&document.activeElement===pop)try{trig.focus({preventScroll:true})}catch(e){}}trig=null;cur_=null}
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('[data-dm-help]');
    if(b){e.preventDefault();e.stopPropagation();open(b,b.dataset.dmHelp);return}
    if(pop&&!pop.hidden&&!e.target.closest('#dmpop'))close(true)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pop&&!pop.hidden){e.stopPropagation();e.preventDefault();close();}},true);
  addEventListener('resize',()=>place());
  document.addEventListener('scroll',()=>place(),true);
  /* help button markup (used by the tool panels) */
  const hintHTML=(hint,cls)=>`<button type="button" class="dm-q${cls?' '+cls:''}" data-dm-help="${hint}" aria-label="Как это работает: ${INFO[HINTS[hint]].t}" aria-haspopup="dialog" aria-expanded="false" title="Как это работает"><i class="ico i-help" aria-hidden="true"></i></button>`;
  /* writes only on change: it is called from dwApply, which a MutationObserver re-runs on any attribute write inside the drawer (an unconditional write = endless loop) */
  const setHint=(b,h)=>{if(b.hidden!==!h)b.hidden=!h;if(h){if(b.dataset.dmHelp!==h){b.dataset.dmHelp=h;b.setAttribute('aria-label','Как это работает: '+INFO[HINTS[h]].t)}}else if(trig===b)close(true)};
  const DM=window.DM={mount,home,hintHTML,setHint,close,INFO,HINTS,all};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',home);else home();
})();
