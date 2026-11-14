/* ===== MOTION m41 (MOTION_SKILL.md): behaviour half of the motion system. CSS half = block «MOTION m41» in template.html; tokens = TOKENS m40.
   Everything here reads durations/easings from the CSS tokens (MO.D / MO.E), never literals.
   MO.off() = reduced motion OR automation without ?motion=1 (html.nomo): then state changes are instant and no WAAPI runs.
   Canvas / editor interactions (drag points, sliders, live preview) are not touched. */
(function(){
  'use strict';
  const root=document.documentElement;
  const rmq=matchMedia('(prefers-reduced-motion:reduce)');
  const cssv=n=>getComputedStyle(root).getPropertyValue(n).trim();
  function ms(n){const v=cssv(n);if(!v)return 0;return v.endsWith('ms')?parseFloat(v):v.endsWith('s')?parseFloat(v)*1000:(parseFloat(v)||0);}
  const D=k=>ms('--dur-'+k),E=k=>cssv('--ease-'+k)||'ease',ST=k=>ms('--stagger-'+k);
  const off=()=>root.classList.contains('nomo')||rmq.matches||typeof Element.prototype.animate!=='function';
  const wait=t=>new Promise(r=>setTimeout(r,t));
  const MO=window.MO={off,D,E,ST,wait,ready:false};
  const live=new Set();           /* running view/cascade animations (cancelled together on the next switch) */
  function track(a){if(!a)return a;live.add(a);const f=()=>live.delete(a);a.addEventListener('finish',f);a.addEventListener('cancel',f);return a;}
  const ghostBox=()=>{let g=document.getElementById('mo-ghosts');if(!g){g=document.createElement('div');g.id='mo-ghosts';g.setAttribute('aria-hidden','true');document.body.appendChild(g);}return g;};
  const reduceRect=r=>({left:r.left,top:r.top,width:r.width,height:r.height});

  /* ---------- 7 FLIP (single element) ---------- */
  MO.flip=function(el,mutate,o){
    o=o||{};const a=el.getBoundingClientRect();mutate();if(off())return null;const b=el.getBoundingClientRect();
    if(!b.width||!b.height)return null;
    return el.animate([{transform:'translate('+(a.left-b.left)+'px,'+(a.top-b.top)+'px) scale('+(a.width/b.width)+','+(a.height/b.height)+')'},{transform:'none'}],{duration:o.dur||D('base'),easing:o.easing||E('out')});
  };
  /* FLIP for a list: siblings slide to their new place, removed items collapse (ghost), new items rise in. key(el) must identify an item across the mutation. */
  MO.flipList=function(box,mutate,o){
    o=o||{};const key=o.key||(c=>c.dataset&&c.dataset.font);
    if(off()||!box.isConnected){mutate();return;}
    const old=new Map();[...box.children].forEach(c=>{const k=key(c);if(k!=null)old.set(k,{el:c,r:reduceRect(c.getBoundingClientRect())});});
    mutate();
    const kept=new Set();let n=0;
    [...box.children].forEach(c=>{
      const k=key(c);if(k==null)return;const o0=old.get(k),r=c.getBoundingClientRect();
      if(o0){kept.add(k);const dx=o0.r.left-r.left,dy=o0.r.top-r.top;
        if(Math.abs(dx)>.5||Math.abs(dy)>.5)track(c.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:D('base'),easing:E('out')}));}
      else track(c.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:D('base'),delay:D('close')*.6+(n++)*ST('tight'),easing:E('out'),fill:'backwards'}));
    });
    old.forEach((v,k)=>{if(kept.has(k))return;
      const g=v.el.cloneNode(true);[g,...g.querySelectorAll('*')].forEach(n=>{n.removeAttribute('id');[...n.attributes].forEach(at=>{if(at.name.startsWith('data-'))n.removeAttribute(at.name);});});
      try{const s=v.el.querySelectorAll('canvas'),d=g.querySelectorAll('canvas');s.forEach((cv,i)=>{if(!d[i])return;d[i].width=cv.width;d[i].height=cv.height;d[i].getContext('2d').drawImage(cv,0,0);});}catch(e){}
      Object.assign(g.style,{left:v.r.left+'px',top:v.r.top+'px',width:v.r.width+'px',height:v.r.height+'px',transformOrigin:'50% 50%'});
      g.inert=true;ghostBox().appendChild(g);
      const a=g.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.9)'}],{duration:D('close'),easing:E('in'),fill:'forwards'});
      const rm=()=>g.remove();a.addEventListener('finish',rm);a.addEventListener('cancel',rm);
    });
  };

  /* Keyed update of a row of chips (instead of innerHTML): kept chips are reused and slide to their new place (FLIP),
     new chips fade in and scale from .85 (--dur-base, ease-out, stagger-tight), removed chips leave as a ghost (--dur-fast, ease-in: the exit is shorter than the entrance).
     keys = wanted keys in order; make(k) -> new element; key(el) -> its key (default data-tag). Without motion (MO.off) or in a hidden box it is a plain update. */
  MO.keyed=function(box,keys,make,o){
    o=o||{};const kf=o.key||(c=>c.dataset&&c.dataset.tag);
    const old=new Map();[...box.children].forEach(c=>{const k=kf(c);if(k!=null)old.set(k,c);});
    const can=!off()&&box.isConnected&&box.getClientRects().length>0;
    const r0=new Map();if(can)old.forEach((c,k)=>r0.set(k,reduceRect(c.getBoundingClientRect())));
    const want=new Set(keys),gone=[];
    old.forEach((c,k)=>{if(!want.has(k)){gone.push([c,r0.get(k)]);c.remove();}});
    const fresh=[];let ref=box.firstChild;
    keys.forEach(k=>{let c=old.get(k);if(!c){c=make(k);fresh.push(c);}if(c===ref)ref=ref.nextSibling;else box.insertBefore(c,ref);});
    if(!can)return;
    keys.forEach(k=>{const c=old.get(k);if(!c)return;const a=r0.get(k),b=c.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;
      if(Math.abs(dx)>.5||Math.abs(dy)>.5)track(c.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:D('base'),easing:E('out')}));});
    fresh.forEach((c,i)=>track(c.animate([{opacity:0,transform:'scale(.85)'},{opacity:1,transform:'none'}],{duration:D('base'),delay:i*ST('tight'),easing:E('out'),fill:'backwards'})));
    gone.forEach(([el,r])=>{if(!r)return;const g=el.cloneNode(true);[g,...g.querySelectorAll('*')].forEach(n=>{n.removeAttribute('id');[...n.attributes].forEach(at=>{if(at.name.startsWith('data-'))n.removeAttribute(at.name);});});
      Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transformOrigin:'50% 50%'});g.inert=true;ghostBox().appendChild(g);
      const a=g.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.85)'}],{duration:D('fast'),easing:E('in'),fill:'forwards'});
      const rm=()=>g.remove();a.addEventListener('finish',rm);a.addEventListener('cancel',rm);});
  };

  /* ---------- 6.7 collapsible pane (called from paneInit) ---------- */
  function paneClean(b){b.classList.remove('mo-anim');b.style.removeProperty('--pane-d');}
  MO.paneStart=function(el,b,open){
    if(off()||!el.isConnected||!el.getClientRects().length)return null;
    const dw=el.closest('.dw');
    if(dw&&(dw.dataset.open!=='1'||dw.getAnimations().some(a=>a.pending||a.playState==='running')))return null;   /* the drawer is still opening/closing: its own motion carries the panes */
    const run=b._mo;let h0=0,d0=getComputedStyle(b).display;
    if(run){h0=b.getBoundingClientRect().height;run.cancel();b._mo=null;paneClean(b);}
    else if(!open){if(b.hidden||d0==='none')return null;h0=b.getBoundingClientRect().height;}
    if(d0==='none')d0='block';
    return {b,open,h0,d0};
  };
  MO.paneRun=function(c){
    const b=c.b;b.style.setProperty('--pane-d',c.d0);b.classList.add('mo-anim');
    const cs=getComputedStyle(b),H=b.getBoundingClientRect().height;
    if(!H){paneClean(b);return;}
    const f=Math.max(0,Math.min(1,c.h0/H)),px=v=>(parseFloat(v)||0),sc=k=>(px(cs[k])*f)+'px',nat=k=>cs[k];
    const part=g=>({height:g?H+'px':(c.h0>0?c.h0+'px':'0px'),paddingTop:g?nat('paddingTop'):sc('paddingTop'),paddingBottom:g?nat('paddingBottom'):sc('paddingBottom'),marginTop:g?nat('marginTop'):sc('marginTop'),marginBottom:g?nat('marginBottom'):sc('marginBottom')});
    const zero={height:'0px',paddingTop:'0px',paddingBottom:'0px',marginTop:'0px',marginBottom:'0px'};
    const frames=c.open
      ?[Object.assign(part(false),{opacity:f,offset:0}),{opacity:f,offset:.2},Object.assign(part(true),{opacity:1,offset:1})]
      :[{height:c.h0+'px',paddingTop:sc('paddingTop'),paddingBottom:sc('paddingBottom'),marginTop:sc('marginTop'),marginBottom:sc('marginBottom'),opacity:1,offset:0},{opacity:0,offset:.5},Object.assign({},zero,{opacity:0,offset:1})];
    const a=b.animate(frames,{duration:c.open?D('base'):D('close'),easing:c.open?E('std'):E('in')});
    b._mo=a;const done=()=>{if(b._mo===a){b._mo=null;paneClean(b);}};
    a.addEventListener('finish',done);a.addEventListener('cancel',done);
  };

  /* ---------- 6.4 segmented / tabs: one shared indicator ---------- */
  const SEG='.seg,.vtabs,.tt-tabs,.imp-seg';
  const segBtns=s=>[...s.querySelectorAll(':scope>button,:scope>.vtw>button')];
  const segRO=new ResizeObserver(es=>es.forEach(e=>segSync(e.target,false)));
  function segInit(s){if(s._ind!==undefined)return;s._ind=null;segRO.observe(s);segSync(s,false);}
  /* позиция кнопки внутри s: цепочка offsetParent (кнопка может лежать в обёртке .vtw, у которой своя система координат) */
  function offIn(b,s){let x=0,y=0,n=b;while(n&&n!==s){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;}return n===s?[x,y]:[b.offsetLeft,b.offsetTop];}
  function segSync(s,anim){
    const btns=segBtns(s);
    const on=btns.filter(b=>b.classList.contains('on')&&!b.disabled);
    if(on.length!==1||!s.offsetWidth||btns.length<2){s.removeAttribute('data-ind');return;}
    const b=on[0];
    const had=s.getAttribute('data-ind')==='1';
    if(had)s.removeAttribute('data-ind');
    s.classList.add('mo-probe');
    const cs=getComputedStyle(b),bg=cs.backgroundColor,sh=cs.boxShadow;
    s.classList.remove('mo-probe');
    const clear=/rgba?\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(bg);
    if(clear){return;}
    let ind=s._ind;
    if(ind&&ind.parentNode!==s)s.insertBefore(ind,s.firstChild);   /* a re-render (innerHTML) detached the indicator */
    if(!ind){ind=s._ind=document.createElement('i');ind.className='mo-ind';ind.setAttribute('aria-hidden','true');s.insertBefore(ind,s.firstChild);}
    const st=ind.style;
    const was=ind.classList.contains('go');
    if(!(anim&&had&&!off()))ind.classList.remove('go');
    const po=offIn(b,s);st.setProperty('--ix',po[0]+'px');st.setProperty('--iy',po[1]+'px');st.setProperty('--iw',b.offsetWidth+'px');st.setProperty('--ih',b.offsetHeight+'px');
    st.setProperty('--if',bg);st.setProperty('--is',sh==='none'?'none':sh);
    s.setAttribute('data-ind','1');
    if(!ind.classList.contains('go')){void ind.offsetWidth;requestAnimationFrame(()=>ind.classList.add('go'));}
  }
  const segDirty=new Set();let segRaf=0;
  function segFlush(){segRaf=0;const a=[...segDirty];segDirty.clear();a.forEach(s=>{if(s._ind===undefined)segInit(s);else segSync(s,true);});}
  function segQueue(s){segDirty.add(s);if(!segRaf)segRaf=requestAnimationFrame(segFlush);}
  MO.flush=()=>{if(segRaf){cancelAnimationFrame(segRaf);}segFlush();};   /* run pending indicator moves now (tests / frame stepping) */
  const segOf=n=>n&&n.closest?n.closest(SEG):null;

  /* ---------- 6.16 views: entering view rises (cascade), leaving view fades out as a ghost ---------- */
  const VIEWS='#view-lib,#view-library,#view-fav,#view-comm,#view-profile,#view-pfolder,#view-edit,#view-proof,#view-draw,#view-kern,#view-imp,#view-ds';
  const LIBV=new Set(['view-lib','view-library','view-fav','view-comm','view-profile','view-pfolder']);
  let vis=new Set();
  const inGhost=n=>!!(n&&n.closest&&n.closest('#mo-ghosts'));
  const visibleViews=()=>new Set([...document.querySelectorAll(VIEWS)].filter(v=>!v.hidden&&!inGhost(v)));
  /* The leaving view is NOT cloned: CSS keeps it rendered for the exit (display is a discrete transition on [hidden]); here it is only taken out of the grid flow
     and parked on the cell of the entering view, so both overlap while the old one fades up. Inline geometry is removed when it is over or the view returns. */
  function parkLeaving(v,rect){
    const app=v.parentElement;if(!app)return;
    const ar=app.getBoundingClientRect();
    Object.assign(v.style,{position:'absolute',left:(rect.left-ar.left-app.clientLeft)+'px',top:(rect.top-ar.top-app.clientTop)+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',zIndex:'1',overflow:'hidden'});
    clearTimeout(v._moT);const g=()=>{if(v.getAnimations&&v.getAnimations().some(a=>a.playState==='paused')){v._moT=setTimeout(g,2500);return;}unpark(v);};v._moT=setTimeout(g,2500);   /* normally ended by the transition events below; the timer only guards a missed event */
    v._moE=ev=>{if(ev.target===v&&(ev.propertyName==='display'||ev.type==='transitioncancel'))setTimeout(()=>{if(v.hidden&&getComputedStyle(v).display==='none')unpark(v);},0);};
    v.addEventListener('transitionend',v._moE);v.addEventListener('transitioncancel',v._moE);
  }
  function unpark(v){clearTimeout(v._moT);if(v._moE){v.removeEventListener('transitionend',v._moE);v.removeEventListener('transitioncancel',v._moE);v._moE=null;}['position','left','top','width','height','margin','zIndex','overflow'].forEach(k=>{v.style[k]='';});if(!v.getAttribute('style'))v.removeAttribute('style');}
  const CASC='.hero>h1,.hero>p,.hero>.srch,.hx-in>h1,.hx-in>.rtip,.hx-in>.srch,.srch.big,.sugrow,.tiles,.vhead,.lcard,.mcard,.coll,.tile,.empty,.pf-head,.pf-vcard,.pf-slot,.pf-tools,.pf-chk,.pf-emp,.pf-ftitle,.pf-filters,.pf-fc,.pf-frow';
  function inView(el){const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  function cascadeItems(v){
    const all=[...v.querySelectorAll(CASC)].filter(inView);
    const set=new Set(all);
    return all.filter(el=>{let p=el.parentElement;while(p&&p!==v){if(set.has(p))return false;p=p.parentElement;}return true;}).slice(0,24);
  }
  function riseItems(items,base){
    const n=items.length;if(!n)return;
    const step=Math.min(ST('wide'),600/Math.max(1,n-1));
    items.forEach((el,i)=>track(el.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{duration:D('slow'),delay:base+i*step,easing:E('out'),fill:'backwards'})));
  }
  function enterView(v,first){
    const cur=parseFloat(getComputedStyle(v).opacity);
    const from=(v._mo&&isFinite(cur))?cur:0;
    if(v._mo){v._mo.cancel();}
    const base=D('instant');
    if(LIBV.has(v.id)){
      v._mo=track(v.animate([{opacity:from},{opacity:1}],{duration:D('open'),delay:0,easing:E('out'),fill:'backwards'}));
      riseItems(cascadeItems(v),base/2);
    }else{
      v._mo=track(v.animate([{opacity:from},{opacity:1}],{duration:D('slow'),easing:E('out'),fill:'backwards'}));
      const kids=[...v.children].filter(k=>!k.hidden&&!k.matches('.dw,.dr-m,.cu-modal,script,style')&&getComputedStyle(k).position!=='fixed'&&inView(k)).slice(0,5);
      const step=Math.min(ST('base'),600/Math.max(1,kids.length-1));
      kids.forEach((k,i)=>{track(k.animate([{transform:'translateY(16px)'},{transform:'none'}],{duration:D('slow'),delay:i*step,easing:E('arrive'),fill:'backwards'}));
        track(k.animate([{opacity:0},{opacity:1}],{duration:D('fast'),delay:i*step,easing:'linear',fill:'backwards'}));});   /* opacity is quick, the rise is long: a child never sits visible and still before it moves, and never stays blank while its view is already opaque */   /* first child starts together with the fade-in: no frame where the view is visible and its content is still */
    }
    const a=v._mo;a.addEventListener('finish',()=>{if(v._mo===a)v._mo=null;});a.addEventListener('cancel',()=>{if(v._mo===a)v._mo=null;});
  }
  function viewsChanged(){
    const now=visibleViews(),entered=[...now].filter(v=>!vis.has(v)),left=[...vis].filter(v=>!now.has(v));
    vis=now;
    entered.forEach(v=>{if(v._moT)unpark(v);});
    if(!MO.ready||off()||!entered.length&&!left.length)return;
    if(!entered.length){return;}
    root.classList.add('mo-seen');
    /* new switch: finish what is still running */
    live.forEach(a=>{try{a.cancel();}catch(e){}});live.clear();
    /* phone: the leaving view still sits in the flow and pushes the entering one down, so it is taken out of flow BEFORE the entering view is measured */
    const sizes=left.map(v=>reduceRect(v.getBoundingClientRect()));
    left.forEach((v,i)=>Object.assign(v.style,{position:'absolute',margin:'0',width:sizes[i].width+'px',height:sizes[i].height+'px'}));   /* out of flow first ... */
    const rect=reduceRect(entered[0].getBoundingClientRect());                                                                            /* ... then the entering view sits where it will stay */
    left.forEach((v,i)=>parkLeaving(v,{left:rect.left,top:rect.top,width:sizes[i].width,height:sizes[i].height}));
    /* the incoming view is prepared first: the editor canvas is painted synchronously now (setTab would only draw it in the next rAF),
       so its entrance (started together with the leaving view's exit = overlap) never reveals an empty canvas */
    if(entered.some(v=>v.id==='view-edit')&&typeof drawEditor==='function'&&window.S&&S.tab==='edit'){try{drawEditor();if(typeof drawSpecimen==='function')drawSpecimen();}catch(e){}}
    entered.forEach(v=>enterView(v));
  }

  /* ---------- editor: Прямой / Италик swaps the canvas content (soft re-entry, no layout) ---------- */
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('[data-style]');if(!b||off())return;
    const st=document.getElementById('stagebox')||document.getElementById('stage');if(!st)return;
    requestAnimationFrame(()=>track(st.animate([{opacity:.35},{opacity:1}],{duration:D('fast'),easing:E('out')})));
  },true);

  /* ---------- 6.12 button -> loader -> success (export) ---------- */
  const OKTXT='Готово',ERRTXT='Ошибка';
  function flowTarget(){const a=document.getElementById('ex-menu'),b=document.getElementById('rail-dl');
    return a&&a.offsetParent?a:(b&&b.offsetParent?b:a);}
  function lblOf(btn){let l=btn.querySelector(':scope>.mo-lbl');
    if(!l){l=document.createElement('span');l.className='mo-lbl';while(btn.firstChild)l.appendChild(btn.firstChild);btn.appendChild(l);}
    return l;}
  function spinOf(btn){let s=btn.querySelector(':scope>.mo-spin');if(!s){s=document.createElement('span');s.className='mo-spin';s.setAttribute('aria-hidden','true');s.innerHTML='<i></i><i></i><i></i>';btn.appendChild(s);}return s;}
  function flowReset(btn){
    const t=btn._flow;if(t)t.dead=true;btn._flow=null;
    (btn.getAnimations?btn.getAnimations():[]).forEach(a=>{try{a.cancel();}catch(e){}});
    btn.classList.remove('mo-flow','is-load','is-spin','is-ok','is-err','mo-shake');btn.style.width='';btn.style.minWidth='';
    const l=btn.querySelector(':scope>.mo-lbl');if(l&&t&&t.html!=null)l.innerHTML=t.html;
    btn.removeAttribute('data-flow');
  }
  function flowStart(btn){
    if(off())return;
    if(btn._flow)flowReset(btn);
    const lbl=lblOf(btn),tok=btn._flow={dead:false,t0:performance.now(),html:lbl.innerHTML,w0:btn.offsetWidth,h0:btn.offsetHeight,round:Math.abs(btn.offsetWidth-btn.offsetHeight)<4,loaded:false};
    btn.classList.add('mo-flow');btn.setAttribute('data-flow','busy');spinOf(btn);
    btn.style.width=tok.w0+'px';
    tok.timer=setTimeout(async()=>{
      if(tok.dead)return;tok.loaded=true;
      btn.classList.add('is-spin');
      if(!tok.round){
        const a=btn.animate([{width:tok.w0+'px'},{width:tok.h0+'px'}],{duration:D('open'),easing:E('inout'),fill:'forwards'});
        try{await a.finished;}catch(e){return;}
        if(tok.dead)return;btn.style.width=tok.h0+'px';a.cancel();
      }
      if(tok.dead)return;btn.classList.remove('is-spin');btn.classList.add('is-load');
    },300);
  }
  async function flowEnd(btn,failed){
    const tok=btn._flow;if(!tok||tok.dead)return;
    clearTimeout(tok.timer);
    try{
      if(tok.loaded){await wait(D('fast'));if(tok.dead)return;}   /* a loader that has appeared stays long enough to read */
      const html=failed?'<i class="ico i-close"></i>'+ERRTXT:'<i class="ico i-check"></i>'+OKTXT;
      btn.classList.remove('is-load','is-spin');
      btn.classList.add(failed?'is-err':'is-ok');                 /* colour flows first (linear, base) */
      const lbl=lblOf(btn);lbl.innerHTML=html;lbl.style.opacity=0;
      /* target width of the success pill */
      const wasW=btn.style.width;btn.style.width='';btn.style.minWidth='0';
      const wOk=btn.offsetWidth;btn.style.minWidth='';btn.style.width=wasW;
      const curW=btn.offsetWidth;
      if(!tok.round&&Math.abs(curW-wOk)>1){
        const a=btn.animate([{width:curW+'px'},{width:wOk+'px'}],{duration:D('open'),easing:E('inout'),fill:'forwards'});
        lbl.animate([{opacity:0},{opacity:0,offset:.5},{opacity:1}],{duration:D('open'),easing:'linear',fill:'forwards'});
        await a.finished;if(tok.dead)return;btn.style.width=wOk+'px';a.cancel();
      }else{await lbl.animate([{opacity:0},{opacity:1}],{duration:D('fast'),easing:'linear',fill:'forwards'}).finished;}
      lbl.style.opacity='';lbl.getAnimations().forEach(x=>x.cancel());
      if(tok.dead)return;
      if(failed){btn.classList.add('mo-shake');}
      await wait(failed?1600:900);if(tok.dead)return;
      btn.classList.remove('mo-shake');
      /* back to the original button: colour back, label back, width back */
      btn.classList.remove('is-ok','is-err');
      const lb=lblOf(btn);lb.animate([{opacity:1},{opacity:0}],{duration:D('instant'),easing:'linear',fill:'forwards'});
      await wait(D('instant'));if(tok.dead)return;
      lb.innerHTML=tok.html;lb.getAnimations().forEach(x=>x.cancel());
      if(!tok.round&&Math.abs(btn.offsetWidth-tok.w0)>1){
        const a=btn.animate([{width:btn.offsetWidth+'px'},{width:tok.w0+'px'}],{duration:D('base'),easing:E('inout'),fill:'forwards'});
        lb.animate([{opacity:0},{opacity:0,offset:.4},{opacity:1}],{duration:D('base'),easing:'linear',fill:'forwards'});
        await a.finished;if(tok.dead)return;
      }
    }catch(e){}
    if(btn._flow===tok){const w=tok.w0;flowReset(btn);btn.style.width='';void w;}
  }
  let flowBtn=null;
  function flowInit(){
    const src=document.getElementById('ex-menu');if(!src||src._flowObs)return;src._flowObs=1;
    new MutationObserver(()=>{
      const busy=src.hasAttribute('aria-busy');
      if(busy&&!flowBtn){const t=flowTarget();if(t){flowBtn=t;flowStart(t);}}
      else if(!busy&&flowBtn){const t=flowBtn;flowBtn=null;const f=src.dataset.err==='1';src.removeAttribute('data-err');flowEnd(t,f);}
    }).observe(src,{attributes:true,attributeFilter:['aria-busy']});
  }

  /* ---------- 6.14 counters (import slot counts): digits tween in place ---------- */
  function tween(el,from,to){
    if(off()||from===to||!el.isConnected)return;
    const dur=D('slow'),t0=performance.now(),ease=t=>1-Math.pow(1-t,4);
    el.style.fontVariantNumeric='tabular-nums';
    const step=now=>{const t=Math.min(1,(now-t0)/dur);el.textContent=String(Math.round(from+(to-from)*ease(t)));if(t<1&&el.isConnected)requestAnimationFrame(step);else{el.textContent=String(to);}};
    el.textContent=String(from);requestAnimationFrame(step);
  }
  MO.tween=tween;

  /* ---------- 6.14b rolling numbers: only the changed digits roll (last digit first), unchanged characters stay put, tabular-nums.
     MO.num(el,text): same as el.textContent=text when motion is off, the element is hidden, or the non-digit text changes. Positions are aligned to the right edge. */
  MO.num=function(el,text){
    text=String(text);const prev=el.textContent;
    if(prev===text)return;
    if(off()||!el.isConnected||!el.getClientRects().length||!/\d/.test(text+prev)||prev.replace(/\d/g,'')!==text.replace(/\d/g,'')&&!/^\d+$/.test(prev+text)){el.textContent=text;return;}
    if(el._numA){el._numA.forEach(a=>{try{a.cancel();}catch(e){}});el._numA=null;}
    const n=Math.max(prev.length,text.length),P=prev.padStart(n,'\u0000'),T=text.padStart(n,'\u0000');
    el.style.fontVariantNumeric='tabular-nums';
    let html='',rank=0;const slots=[];
    for(let i=0;i<n;i++){
      const a=P[i]==='\u0000'?'':P[i],b=T[i]==='\u0000'?'':T[i];
      if(a===b){html+=b;continue;}
      html+='<span class="mo-dg" data-r="'+(n-1-i)+'"><i class="mo-o" aria-hidden="true">'+a+'</i><i class="mo-n">'+b+'</i></span>';
    }
    el.innerHTML=html;
    const dur=D('fast'),h=Math.max(8,parseFloat(getComputedStyle(el).fontSize)||14)*.6;
    const as=[];
    [...el.querySelectorAll('.mo-dg')].sort((x,y)=>x.dataset.r-y.dataset.r).forEach((g,k)=>{
      const o=g.firstChild,nn=g.lastChild,dl=k*ST('tight');
      as.push(o.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY('+(-h)+'px)'}],{duration:dur,delay:dl,easing:E('in'),fill:'both'}));
      as.push(nn.animate([{opacity:0,transform:'translateY('+h+'px)'},{opacity:1,transform:'none'}],{duration:dur,delay:dl,easing:E('arrive'),fill:'both'}));
    });
    el._numA=as;
    Promise.all(as.map(a=>a.finished)).then(()=>{if(el._numA===as){el._numA=null;el.textContent=text;}}).catch(()=>{});
  };
  /* phone bottom sheet: the section switch swaps content, the sheet height follows it (exception: height, same as panes) */
  MO.sizeFlip=function(e,h0){
    if(off()||!h0)return;
    const h1=e.offsetHeight;if(Math.abs(h1-h0)<3)return;
    const cs=getComputedStyle(e);const ov=e.style.overflow;
    const a=e.animate([{height:h0+'px'},{height:h1+'px'}],{duration:D('base'),easing:E('std')});
    e.style.overflow='hidden';const end=()=>{e.style.overflow=ov;};a.onfinish=end;a.oncancel=end;
  };

  /* ---------- hooks into existing functions (wrap, don't edit call sites) ---------- */
  function wrapGlobal(){
    /* editor glyph list: a few new glyphs pop in; a full rebuild does not cascade */
    if(typeof buildGlyphList==='function'&&!buildGlyphList.__mo){
      const f=buildGlyphList;
      buildGlyphList=function(){
        const box=document.getElementById('glyphs');
        const before=new Set(box?[...box.querySelectorAll('.gb')].map(b=>b.dataset.ch):[]);
        const r=f.apply(this,arguments);
        if(!off()&&box&&before.size){
          const add=[...box.querySelectorAll('.gb')].filter(b=>!before.has(b.dataset.ch));
          if(add.length&&add.length<=3)add.forEach(b=>track(b.animate([{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'none'}],{duration:D('base'),easing:E('out'),fill:'backwards'})));
        }
        return r;};
      buildGlyphList.__mo=1;
    }
    /* import: filled slots pop, counters tween */
    if(typeof iuRender==='function'&&!iuRender.__mo){
      const f=iuRender;
      iuRender=function(){
        const v=document.getElementById('view-imp');
        const prev=new Map(),cnt=new Map();
        if(v){v.querySelectorAll('.imp-slot').forEach(b=>prev.set(b.dataset.ch,/\bown\b/.test(b.className)?'own':/\bauto\b/.test(b.className)?'auto':'empty'));
          v.querySelectorAll('.imp-grp').forEach(g=>{const h=g.querySelector('h3'),n=g.querySelector('.cnt b');if(h&&n)cnt.set(h.textContent,parseInt(n.textContent,10));});}
        const r=f.apply(this,arguments);
        if(v&&!off()&&prev.size){
          v.querySelectorAll('.imp-slot').forEach(b=>{const was=prev.get(b.dataset.ch),now=/\bown\b/.test(b.className)?'own':/\bauto\b/.test(b.className)?'auto':'empty';
            if(was==='empty'&&now!=='empty')track(b.animate([{transform:'scale(.9)',opacity:.4},{transform:'scale(1.04)',opacity:1,offset:.6},{transform:'none',opacity:1}],{duration:D('base'),easing:E('out')}));});
          v.querySelectorAll('.imp-grp').forEach(g=>{const h=g.querySelector('h3'),n=g.querySelector('.cnt b');if(!h||!n)return;const o=cnt.get(h.textContent),nn=parseInt(n.textContent,10);if(o!=null&&o!==nn)tween(n,o,nn);});
        }
        return r;};
      iuRender.__mo=1;
    }
  }

  /* ---------- boot ---------- */
  function boot(){
    wrapGlobal();
    vis=visibleViews();
    document.querySelectorAll(SEG).forEach(segInit);
    flowInit();
    new MutationObserver(rs=>{
      let vc=false;const segs=new Set();
      for(const r of rs){
        if(r.target&&inGhost(r.target))continue;
        if(r.type==='attributes'){
          const t=r.target;
          if(r.attributeName==='hidden'){if(t.matches&&t.matches(VIEWS))vc=true;}
          else{const p=t.parentElement,s=t.tagName==='BUTTON'?segOf(p):null;if(s)segs.add(s);}
        }else if(r.type==='childList'){
          if(r.target.matches&&r.target.matches(SEG)&&r.addedNodes.length&&!(r.addedNodes[0].classList&&r.addedNodes[0].classList.contains('mo-ind')))segs.add(r.target);   /* buttons re-rendered inside a segmented control */
          r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches&&n.matches(VIEWS))vc=true;
            if(n.matches&&n.matches(SEG))segs.add(n);if(n.querySelectorAll)n.querySelectorAll(SEG).forEach(s=>segs.add(s));
            if(n.id==='ex-menu'||n.id==='rail-dl'||(n.querySelector&&n.querySelector('#ex-menu,#rail-dl')))setTimeout(flowInit,0);});
        }
      }
      if(vc)viewsChanged();
      segs.forEach(segQueue);
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','aria-pressed']});
    new MutationObserver(()=>document.querySelectorAll(SEG).forEach(s=>{if(s._ind!==undefined)segSync(s,false);})).observe(root,{attributes:true,attributeFilter:['data-theme']});
    window.addEventListener('load',()=>document.querySelectorAll(SEG).forEach(s=>{if(s._ind!==undefined)segSync(s,false);}));
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>document.querySelectorAll(SEG).forEach(s=>{if(s._ind!==undefined)segSync(s,false);}));
    setTimeout(()=>{MO.ready=true;vis=visibleViews();root.classList.add('mo-live');},700);
    setTimeout(()=>root.classList.add('mo-seen'),2200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
