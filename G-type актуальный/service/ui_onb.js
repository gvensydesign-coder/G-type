/* Stage 4C: первое знакомство (4 шага, демо d1-d4). Прототип одобрен: stage4/onb/proto.html. Ключ gtype.onb.v1; ?onb=1 открывает под автоматизацией, ?onb=0 отключает. */
(()=>{
  const STEPS=[
    {k:'d1',h:'Рисуйте буквы по клеткам',p:'Проведите по сетке — соседние ячейки сольются в одну букву.'},
    {k:'d2',h:'Меняйте насыщенность',p:'Один ползунок делает все буквы толще или тоньше сразу.'},
    {k:'d3',h:'Поправьте зазоры',p:'Двигайте ручку между буквами, чтобы подобрать кернинг.'},
    {k:'d4',h:'Сохраните и пользуйтесь',p:'Нажмите «Скачать шрифт» — готовый файл сразу окажется в загрузках.'}
  ];
  const N=STEPS.length,KEY='gtype.onb.v1',DLY=120;
  const $=id=>document.getElementById(id);
  const root=$('onb'),dlg=$('onb-dlg'),scrim=root.firstElementChild,slidesEl=$('onb-slides'),dotsEl=$('onb-dots'),
        count=$('onb-count'),bSkip=$('onb-skip'),bBack=$('onb-back'),bNext=$('onb-next'),app=document.querySelector('.app');
  let mem=false;
  const seen=()=>{try{return localStorage.getItem(KEY)==='1'}catch(e){return mem}};
  const markSeen=()=>{mem=true;try{localStorage.setItem(KEY,'1')}catch(e){}};
  const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
  const phone=()=>matchMedia('(max-width:560px)').matches;
  const EO='cubic-bezier(.2,0,0,1)',EI='cubic-bezier(.4,0,1,1)';

  let built=false,auto=false,slides=[],dots=[],insts=[],cur=0,isOpen=false,opener=null,anims=[],openAnims=[];
  function build(){
    if(built)return;built=true;
    STEPS.forEach((s,i)=>{
      const el=document.createElement('div');el.className='onb-slide';el.id='onb-s'+i;
      el.innerHTML='<div class="onb-demo"></div><h2 class="onb-h" id="onb-h'+i+'"></h2><p class="onb-p"></p>';
      el.querySelector('h2').textContent=s.h;el.querySelector('p').textContent=s.p;
      el.setAttribute('inert','');el.setAttribute('aria-hidden','true');
      slidesEl.appendChild(el);slides.push(el);insts.push(null);
      const d=document.createElement('button');d.type='button';d.className='onb-dot';d.setAttribute('aria-label','Шаг '+(i+1)+' из '+N+': '+s.h);
      d.addEventListener('click',()=>go(i));dotsEl.appendChild(d);dots.push(d);
    });
  }
  function demo(i){
    if(insts[i])return insts[i];
    const host=slides[i].querySelector('.onb-demo');
    const m=DM.mount(host,STEPS[i].k,{io:false});m.init();m.vis=true;m.ctrl(false);insts[i]=m;return m;
  }
  function playOnly(i){insts.forEach((m,j)=>{if(m&&j!==i)m.ctrl(false)});const m=demo(i);m.seek(m.api.POSTER);m.ctrl(true)}
  function ui(){
    count.textContent='Шаг '+(cur+1)+' из '+N;
    dots.forEach((d,i)=>{if(i===cur)d.setAttribute('aria-current','step');else d.removeAttribute('aria-current')});
    const last=cur===N-1;
    bBack.hidden=cur===0;bSkip.hidden=last;bNext.textContent=last?'Создать шрифт':'Далее';
    dlg.setAttribute('aria-labelledby','onb-h'+cur);
    if(isOpen&&!(document.activeElement&&document.activeElement!==document.body&&document.activeElement.getClientRects().length&&dlg.contains(document.activeElement)))dlg.focus({preventScroll:true});
  }
  function fin(){anims.forEach(a=>{try{a.finish()}catch(e){}});anims=[]}
  function go(n){
    if(!isOpen||n<0||n>=N||n===cur)return;
    fin();
    const dir=n>cur?1:-1,out=slides[cur],inn=slides[n],R=reduced(),dx=R?0:12;
    out.classList.remove('on');out.classList.add('leaving');out.setAttribute('inert','');out.setAttribute('aria-hidden','true');
    inn.classList.add('on');inn.removeAttribute('inert');inn.removeAttribute('aria-hidden');
    cur=n;playOnly(n);ui();
    const a1=out.animate(R?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'none'},{opacity:0,transform:'translateX('+(-dx*dir)+'px)'}],{duration:R?90:180,easing:EI,fill:'forwards'});
    const a2=inn.animate(R?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateX('+(dx*dir)+'px)'},{opacity:1,transform:'none'}],{duration:R?90:300,delay:R?0:DLY,easing:EO,fill:'backwards'});
    a1.onfinish=()=>{out.classList.remove('leaving');a1.cancel()};
    anims=[a1,a2];
    const nx=insts[n+1]?null:n+1;if(nx!==null&&nx<N)(window.requestIdleCallback||setTimeout)(()=>{if(isOpen)demo(nx)});
  }
  function open(o){
    o=o||{};if(isOpen)return;build();
    opener=o.opener||document.activeElement;isOpen=true;auto=!!o.auto;
    cur=Math.max(0,Math.min(N-1,o.step||0));
    slides.forEach((s,i)=>{s.classList.toggle('on',i===cur);s.classList.remove('leaving');if(i===cur){s.removeAttribute('inert');s.removeAttribute('aria-hidden')}else{s.setAttribute('inert','');s.setAttribute('aria-hidden','true')}});
    app.setAttribute('inert','');app.setAttribute('aria-hidden','true');
    root.hidden=false;
    ui();playOnly(cur);
    const R=reduced(),P=phone();
    openAnims.forEach(a=>a.cancel());
    const o1=scrim.animate([{opacity:0},{opacity:1}],{duration:R?90:450,easing:EO,fill:'backwards'});
    const o2=dlg.animate(R?[{opacity:0},{opacity:1}]:P?[{transform:'translateY(100%)'},{transform:'none'}]:[{opacity:0,transform:'translateY(16px) scale(.97)'},{opacity:1,transform:'none'}],{duration:R?90:450,easing:EO,fill:'backwards'});
    openAnims=[o1,o2];
    try{dlg.focus({preventScroll:true})}catch(e){}
    (window.requestIdleCallback||setTimeout)(()=>{if(isOpen&&cur+1<N)demo(cur+1)});
  }
  function close(why){
    if(!isOpen)return;isOpen=false;markSeen();fin();if(auto){auto=false;try{if(typeof hintMark==='function')hintMark('tour:welcome')}catch(e){}}
    insts.forEach(m=>m&&m.ctrl(false));
    const R=reduced(),P=phone();openAnims.forEach(a=>a.cancel());
    const c1=scrim.animate([{opacity:1},{opacity:0}],{duration:R?90:250,easing:EI,fill:'forwards'});
    const c2=dlg.animate(R?[{opacity:1},{opacity:0}]:P?[{transform:'none'},{transform:'translateY(100%)'}]:[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(8px) scale(.98)'}],{duration:R?90:250,easing:EI,fill:'forwards'});
    openAnims=[c1,c2];
    c2.onfinish=()=>{if(isOpen)return;root.hidden=true;c1.cancel();c2.cancel();openAnims=[];
      app.removeAttribute('inert');app.removeAttribute('aria-hidden');
      if(why!=='create'){const t=(opener&&opener.isConnected&&opener!==document.body)?opener:$('help');try{t.focus({preventScroll:true})}catch(e){}}opener=null;};
    document.dispatchEvent(new CustomEvent('gtype:onb-close',{detail:{reason:why||'close',step:cur}}));
  }
  /* controls */
  bNext.addEventListener('click',()=>{cur===N-1?close('create'):go(cur+1)});
  bBack.addEventListener('click',()=>go(cur-1));
  bSkip.addEventListener('click',()=>close('skip'));
  const ob=$('onb-open');if(ob)ob.addEventListener('click',()=>{if(typeof helpToggle==='function')helpToggle(false);open({step:0,opener:$('help')})});
  document.addEventListener('gtype:onb-close',e=>{if(e.detail&&e.detail.reason==='create'&&typeof setTab==='function')setTab('draw')});
  document.addEventListener('keydown',e=>{
    if(!isOpen)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close('esc');return}
    if(e.key==='ArrowRight'&&cur<N-1){e.preventDefault();go(cur+1);return}
    if(e.key==='ArrowLeft'&&cur>0){e.preventDefault();go(cur-1);return}
    if(e.key==='Tab'){
      const f=[...dlg.querySelectorAll('button')].filter(b=>!b.disabled&&!b.closest('[inert]')&&b.getClientRects().length);
      if(!f.length){e.preventDefault();return}
      const a=document.activeElement,i=f.indexOf(a);
      if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}
      else if(!e.shiftKey&&(i===f.length-1||i<0)){e.preventDefault();f[0].focus()}
    }
  },true);
  document.addEventListener('focusin',e=>{if(isOpen&&!dlg.contains(e.target)){dlg.focus({preventScroll:true})}});

  /* swipe between steps (phone; rubber-band is capped at 14px so nothing leaves the card) */
  let sw=null;
  slidesEl.addEventListener('pointerdown',e=>{if(!isOpen||!phone()||e.button>0)return;sw={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),lock:false,dx:0}});
  slidesEl.addEventListener('pointermove',e=>{
    if(!sw||e.pointerId!==sw.id)return;
    const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
    if(!sw.lock){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){sw.lock=true;fin();try{slidesEl.setPointerCapture(e.pointerId)}catch(_){}}else if(Math.abs(dy)>10){sw=null;return}else return}
    sw.dx=dx;
    const edge=(dx>0&&cur===0)||(dx<0&&cur===N-1),k=edge?.15:.4,s=slides[cur];
    s.style.transform='translateX('+Math.max(-14,Math.min(14,dx*k))+'px)';
    s.style.opacity=String(1-Math.min(Math.abs(dx)/500,.4));
  });
  const endSw=e=>{
    if(!sw||(e&&e.pointerId!==sw.id))return;const w=sw;sw=null;if(!w.lock)return;
    const s=slides[cur],dx=w.dx,v=Math.abs(dx)/Math.max(1,performance.now()-w.t);
    const to=dx<0?cur+1:cur-1,ok=(Math.abs(dx)>48||v>.35)&&to>=0&&to<N;
    s.style.transform='';s.style.opacity='';
    if(ok)go(to);else if(!reduced()){const a=s.animate([{opacity:1-Math.min(Math.abs(dx)/500,.4),transform:'translateX('+Math.max(-14,Math.min(14,dx*.4))+'px)'},{opacity:1,transform:'none'}],{duration:180,easing:EO});anims=[a]}
  };
  slidesEl.addEventListener('pointerup',endSw);slidesEl.addEventListener('pointercancel',endSw);

  window.ONB={open,close,go,get step(){return cur},get isOpen(){return isOpen},insts:()=>insts,N,reset(){mem=false;try{localStorage.removeItem(KEY)}catch(e){}},seen};

  /* first visit: opens once ~500 ms after load; never under automation unless ?onb=1 (?onb=0 disables) */
  const q=location.search,force=/[?&]onb=1/.test(q);
  if(!/[?&]onb=0/.test(q)&&(force||(!navigator.webdriver&&!seen())))setTimeout(()=>{if(!isOpen)open({auto:!force||!seen()})},500);
})();
