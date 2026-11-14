/* Static scans for tests/e2e_jank.py (detectors 5, 6, 7). Evaluated in the page; returns {inset:[], tangent:[], icons:[]}.
   Every record is {d: descriptor, p: parent descriptor, ...numbers}; the python side applies the whitelist. */
(()=>{
  const vw=innerWidth,vh=innerHeight;
  const out={inset:[],tangent:[],icons:[]};
  const skip=new Set(['SCRIPT','STYLE','SVG','CANVAS','OPTION','TEXTAREA']);
  function desc(e){
    let s=e.tagName.toLowerCase();
    if(e.id)s+='#'+e.id;
    const c=(typeof e.className==='string'?e.className:'').trim().split(/\s+/).filter(x=>x&&!/^(on|mo-|go$|is-)/.test(x)).slice(0,2);
    if(c.length)s+='.'+c.join('.');
    return s;
  }
  function text(e){return [...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0,22);}
  function shown(e){
    if(e.closest('[hidden],#mo-ghosts,[aria-hidden=true],[inert]'))return false;
    const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
    for(let n=e;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05)return false;}
    return true;
  }
  const alpha=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 0;const p=m[1].split(',').map(parseFloat);return p.length>3?p[3]:1;};
  function boxy(e,cs){
    cs=cs||getComputedStyle(e);
    if(alpha(cs.backgroundColor)>0.04)return true;
    if(['Top','Left','Bottom','Right'].filter(s=>parseFloat(cs['border'+s+'Width'])>0&&cs['border'+s+'Style']!=='none'&&alpha(cs['border'+s+'Color'])>0.04).length>=3)return true;   /* a rule on one side is a divider, not a card */
    if(cs.boxShadow!=='none'&&/\b1px\b/.test(cs.boxShadow)&&!/inset/.test(cs.boxShadow))return true;
    return false;
  }
  const onScreen=r=>r.right>0&&r.left<vw&&r.bottom>0&&r.top<vh;
  /* ---- 5. tight inset ---- */
  const seen=new Set();
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let n;
  while((n=walker.nextNode())){
    const s=n.textContent.trim();if(!s)continue;
    const e=n.parentElement;if(!e||skip.has(e.tagName.toUpperCase())||e.closest('svg,script,style'))continue;
    if(seen.has(n))continue;seen.add(n);
    const rg=document.createRange();rg.selectNodeContents(n);
    const tr=rg.getBoundingClientRect();if(tr.width<2||tr.height<2||!onScreen(tr))continue;
    if(!shown(e))continue;
    /* nearest box that frames this text */
    let box=null;
    for(let a=e;a&&a!==document.body&&a!==document.documentElement;a=a.parentElement){
      const cs=getComputedStyle(a);
      if(boxy(a,cs)){box=a;break;}
    }
    if(!box)continue;
    const br=box.getBoundingClientRect();
    if(br.width*br.height>0.55*vw*vh)continue;                   /* page-size surfaces are not cards */
    if(br.width<=0||tr.left<br.left-1||tr.right>br.right+1)continue; /* overflowing/clipped text is a different problem */
    const fs=parseFloat(getComputedStyle(e).fontSize)||14;
    const cy=(tr.top+tr.bottom)/2,dl=tr.left-br.left,dr=br.right-tr.right,dt=(cy-.36*fs)-br.top,db=br.bottom-(cy+.36*fs);   /* vertical: optical text box (cap height ~ .72em) around the line centre */
    if(dt<0||db<0)continue;
    const cs=getComputedStyle(box);
    const m=Math.min(dl,dr,dt,db);
    if(m<8)out.inset.push({d:desc(box)+(text(box)?'"'+text(box)+'"':'"'+s.slice(0,22)+'"'),p:desc(box.parentElement||box),t:s.slice(0,22),dl:Math.round(dl*10)/10,dr:Math.round(dr*10)/10,dt:Math.round(dt*10)/10,db:Math.round(db*10)/10,w:Math.round(br.width),h:Math.round(br.height),fs});
  }
  /* ---- 6. near-tangent siblings ---- */
  for(const par of document.body.querySelectorAll('*')){
    if(skip.has(par.tagName.toUpperCase())||par.closest('svg,[hidden],#mo-ghosts'))continue;
    const kids=[...par.children].filter(k=>{
      if(skip.has(k.tagName.toUpperCase()))return false;
      const r=k.getBoundingClientRect();if(r.width<6||r.height<6||!onScreen(r))return false;
      const cs=getComputedStyle(k);if(cs.position==='absolute'||cs.position==='fixed'||cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.05)return false;
      return boxy(k,cs);
    });
    if(kids.length<2||kids.length>60)continue;
    const R=kids.map(k=>k.getBoundingClientRect());
    for(let i=0;i<kids.length;i++)for(let j=0;j<kids.length;j++){
      if(i===j)continue;const a=R[i],b=R[j];
      const gx=b.left-a.right,gy=b.top-a.bottom;
      const oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top),ox=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      if(gx>=.99&&gx<=3.01&&oy>=.5*Math.min(a.height,b.height))out.tangent.push({d:desc(kids[i])+'|'+desc(kids[j]),p:desc(par),gap:Math.round(gx*10)/10,axis:'x',n:kids.length});
      if(gy>=.99&&gy<=3.01&&ox>=.5*Math.min(a.width,b.width))out.tangent.push({d:desc(kids[i])+'|'+desc(kids[j]),p:desc(par),gap:Math.round(gy*10)/10,axis:'y',n:kids.length});
    }
  }
  /* ---- 7. mixed icons in one toolbar ---- */
  function iconOf(host){
    const s=host.querySelector(':scope>svg, :scope>.ico, :scope>i.ico, :scope>*>svg');
    if(!s)return null;
    const r=s.getBoundingClientRect();if(r.width<4)return null;
    if(s.tagName.toLowerCase()==='svg'){
      const cs=getComputedStyle(s);
      const vb=(s.getAttribute('viewBox')||'0 0 24 24').split(/[\s,]+/).map(parseFloat);
      const sc=r.width/(vb[2]||24);
      const filled=cs.fill!=='none'&&cs.stroke==='none';
      let sw=parseFloat(cs.strokeWidth);if(!isFinite(sw)||filled)sw=0;
      return {w:Math.round(r.width*10)/10,sw:Math.round(sw*sc*100)/100,kind:filled?'fill':'stroke'};
    }
    return {w:Math.round(r.width*10)/10,sw:-1,kind:'mask'};
  }
  const groups=new Map();
  for(const b of document.body.querySelectorAll('button,a,label,[role=button]')){
    if(b.closest('[hidden],#mo-ghosts')||!shown(b))continue;
    const p=b.parentElement;if(!p)continue;
    const ic=iconOf(b);if(!ic)continue;
    if(!groups.has(p))groups.set(p,[]);groups.get(p).push({b,ic});
  }
  for(const [p,list] of groups){
    if(list.length<3)continue;
    const sizes=new Set(list.map(x=>Math.round(x.ic.w))),sws=new Set(list.filter(x=>x.ic.kind==='stroke').map(x=>x.ic.sw));
    const kinds=new Set(list.map(x=>x.ic.kind));
    const swSpread=sws.size?Math.max(...sws)-Math.min(...sws):0;
    const szSpread=Math.max(...list.map(x=>x.ic.w))-Math.min(...list.map(x=>x.ic.w));
    if(szSpread>1.01||swSpread>.15){
      out.icons.push({d:desc(p),p:desc(p.parentElement||p),sizes:[...sizes].join('/'),sw:[...sws].join('/'),kinds:[...kinds].join('+'),n:list.length});
    }
  }
  return out;
})()
