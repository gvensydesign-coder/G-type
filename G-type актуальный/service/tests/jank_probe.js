/* Frame-level probe for tests/e2e_jank.py. Injected into the page.
   Virtual clock: every Web Animation / CSS transition that appears is paused and advanced by exactly 1000/60 ms per rAF tick,
   so the sampled frames are the same on every run, whatever the speed of the (software-rendered) headless browser.
   JK.start(opts) -> JK.finish() returns {ticks, els:{id:{d,s:[[tick,l,t,w,h,op],...]}}, cont:{sel:[[tick,surfaceOp,coverage],...]}} for every element that changed. */
(function(){
  const DT=1000/60;
  let S=null;
  const sk=new Set(['SCRIPT','STYLE','LINK','META','HEAD','BR','TITLE','PATH','G','CIRCLE','RECT','LINE','POLYLINE','POLYGON','USE','DEFS','TSPAN','TEXT','ELLIPSE','CLIPPATH','MASK']);
  function desc(e){
    let s=e.tagName.toLowerCase();
    if(e.id)s+='#'+e.id;
    const c=(typeof e.className==='string'?e.className:'').trim().split(/\s+/).filter(x=>x&&!/^(on|mo-|go$|is-)/.test(x)).slice(0,2);
    if(c.length)s+='.'+c.join('.');
    const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0,18);
    if(t)s+='"'+t+'"';
    else{const a=e.getAttribute&&(e.getAttribute('aria-label')||e.getAttribute('data-tab')||e.getAttribute('data-ch'));if(a)s+='['+a.slice(0,18)+']';}
    return s;
  }
  function pdesc(e){const p=e.parentElement;return p&&p!==document.body?desc(p):'';}
  function tick(){
    const t=S.tick++;
    /* 1. virtual clock */
    let live=0;
    for(const a of document.getAnimations()){
      if(a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('#jk-ignore,.rtip'))continue;
      let m=S.anims.get(a);
      if(!m){
        const tm=a.effect&&a.effect.getComputedTiming?a.effect.getComputedTiming():null;
        m={inf:!tm||tm.endTime===Infinity||tm.iterations===Infinity};
        S.anims.set(a,m);
        try{a.pause();}catch(e){}
        if(a.currentTime==null)try{a.currentTime=0;}catch(e){}
      }else if(!m.inf){
        try{a.currentTime=a.currentTime+DT;}catch(e){}
      }else{try{a.currentTime=a.currentTime+DT;}catch(e){}}
      if(!m.inf){const tm=a.effect.getComputedTiming();if(a.currentTime<tm.endTime){live++;S.liveList=(S.liveList||[]);if(S.liveList.length<6)S.liveList.push((a.transitionProperty||a.animationName||'waapi')+' '+(a.effect.target.id||a.effect.target.className)+' '+a.currentTime.toFixed(0)+'/'+tm.endTime+' '+a.playState);}}
    }
    S.live=live;S.liveList=[];
    if(live===0)S.quiet++;else S.quiet=0;
    /* 2. sample */
    const vw=innerWidth,vh=innerHeight;
    const opm=new Map();
    const all=document.body.querySelectorAll('*');
    for(const e of all){
      if(sk.has(e.tagName)||e.closest('svg')&&e.tagName!=='svg'||e.closest('.rtip,#glyphs,.lcard canvas,.dm'))continue;
      const r=e.getBoundingClientRect();
      const par=e.parentElement;
      let po=1;if(par&&opm.has(par))po=opm.get(par);
      let op=0;
      if(r.width>0&&r.height>0){
        const cs=getComputedStyle(e);
        op=cs.visibility==='hidden'?0:po*(+cs.opacity);
        if(cs.display==='none')op=0;
        opm.set(e,cs.visibility==='hidden'?0:po*(+cs.opacity));
      }else opm.set(e,0);
      if(r.width<=0||r.height<=0||r.right<-50||r.left>vw+50||r.bottom<-50||r.top>vh+50){
        let o=S.els.get(e);if(o){o.s.push([t,0,0,0,0,0]);}
        continue;
      }
      let o=S.els.get(e);
      if(!o){o={d:desc(e),p:pdesc(e),s:[]};S.els.set(e,o);S.order.push(o);
        if(t>0&&S.tick>1){/* element new after the start: previous ticks = absent */}}
      o.s.push([t,r.left,r.top,r.width,r.height,op]);
    }
    /* 3. containers */
    for(const sel of S.cont){
      const c=[...document.querySelectorAll(sel)].find(x=>{const r=x.getBoundingClientRect();return r.width>40&&r.height>40;});
      if(!c){(S.cov[sel]=S.cov[sel]||[]).push([t,0,0]);continue;}
      const cr=c.getBoundingClientRect();
      const G=24,cells=new Uint8Array(G*G);
      const so=opm.has(c)?opm.get(c):1;
      for(const e of c.querySelectorAll('*')){
        const isC=e.tagName==='CANVAS'||e.tagName==='svg'||e.tagName==='IMG'||e.tagName==='INPUT'||e.classList.contains('ico')||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
        if(!isC)continue;
        const eo=opm.get(e);if(!(eo>0.25))continue;
        const r=e.getBoundingClientRect();
        const x0=Math.max(0,Math.floor((r.left-cr.left)/cr.width*G)),x1=Math.min(G-1,Math.floor((r.right-cr.left)/cr.width*G));
        const y0=Math.max(0,Math.floor((r.top-cr.top)/cr.height*G)),y1=Math.min(G-1,Math.floor((r.bottom-cr.top)/cr.height*G));
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)cells[y*G+x]=1;
      }
      let n=0;for(const v of cells)n+=v;
      (S.cov[sel]=S.cov[sel]||[]).push([t,so,n/(G*G)]);
    }
  }
  function loop(){
    if(!S||S.stop)return;
    try{tick();}catch(err){S.err=String(err&&err.stack||err).slice(0,300);console.log('JKERR '+S.err);}
    if(S.fin&&((S.quiet>=4&&S.tick-S.finAt>=S.min)||S.tick-S.finAt>=S.max)){S.stop=true;S.resolve();return;}
    requestAnimationFrame(loop);
  }
  window.JK={
    start(o){
      o=o||{};
      S={tick:0,anims:new Map(),els:new Map(),order:[],cont:o.cont||[],cov:{},quiet:0,fin:false,min:o.min||14,max:o.max||48,stop:false};
      S.done=new Promise(r=>S.resolve=r);
      tick();
      requestAnimationFrame(loop);
    },
    async finish(){
      S.fin=true;S.finAt=S.tick;
      await S.done;
      const out={ticks:S.tick,els:[],cov:S.cov};
      for(const o of S.order){
        let ch=false;const s=o.s;
        for(let i=1;i<s.length;i++){const a=s[i-1],b=s[i];if(Math.abs(a[1]-b[1])>.01||Math.abs(a[2]-b[2])>.01||Math.abs(a[3]-b[3])>.01||Math.abs(a[4]-b[4])>.01||Math.abs(a[5]-b[5])>.001){ch=true;break;}}
        if(!ch&&s.length&&s[0][0]>0)ch=true;   /* appeared after the start */
        if(ch)out.els.push({d:o.d,p:o.p,s:s});
      }
      /* release the clock: finite animations jump to their end (events fire), infinite ones run again */
      for(const [a,m] of S.anims){try{if(m.inf)a.play();else a.finish();}catch(e){}}
      S=null;
      return out;
    },
    dbg(){return S?[S.tick,S.quiet,S.live,S.fin,S.err||'']:null;},
    cancel(){if(S){S.stop=true;for(const [a,m] of S.anims){try{if(m.inf)a.play();else a.finish();}catch(e){}}S=null;}}
  };
})();
