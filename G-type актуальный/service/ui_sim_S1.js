/* ===== «Применить к похожим…» для правок точек (контур и скелет). Логика переноса — core_sim_S1.js ===== */
const SIMUI={sel:new Set(),node:false,job:0,res:new Map(),hint:0};
(function(){const st=document.createElement('style');st.textContent=`
#simdlg .cu-card>*{flex:none}
#simdlg .cu-row.end{position:sticky;bottom:-20px;background:var(--paper);padding:10px 0 2px;margin-bottom:-4px}
#simdlg .sm-prev{display:flex;flex-wrap:wrap;gap:8px;min-height:20px}
#simdlg #sm-grid{max-height:20vh}
#simdlg .sm-c{width:132px;background:var(--panel);border-radius:var(--r-sm);padding:6px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:var(--fs-xs);color:var(--muted);text-align:center}
#simdlg .sm-c .sm-cv{display:flex;gap:2px;align-items:center}
#simdlg .sm-c canvas{width:60px;height:56px}
#simdlg .sm-c span{line-height:1.25}
#simdlg .sm-c.bad{box-shadow:inset 0 0 0 1.5px var(--accent)}
#simdlg .sm-c b{font-size:var(--fs-base);color:var(--ink)}
#sim-open[hidden]{display:none}
.stage>.nrow:has(#sim-open:not(:disabled):not([hidden])){display:flex!important}
#sim-open.hint{background:var(--accent);color:var(--accent-ink);font-weight:600}
`;document.head.appendChild(st);})();
const simPEdits=()=>{const e=S.edits[S.sel];if(!e)return {keys:[],n:0};
  const keys=Object.keys(e).filter(k=>/^\d+:\d+$/.test(k)&&e[k]&&(e[k].p||e[k].a!==undefined||e[k].b!==undefined));
  const sk=e.sk?Object.keys(e.sk).filter(k=>!k.endsWith(':ops')):[];
  return {keys,sk,n:keys.length+sk.length};};
const simIsSk=()=>{const f=FONTS[CUR_FONT];return !!(f&&typeof f.pen==='function'&&GL[S.sel]&&typeof GL[S.sel].skel==='function');};
function simSrcKeys(){const P=simPEdits();const all=simIsSk()?(P.sk||[]):P.keys;
  if(SIMUI.node&&S.node&&!S.node.lat){const k=S.node.sk?S.node.si+':'+S.node.ni:S.node.ci+':'+S.node.ni;
    const sel=simIsSk()?all.filter(x=>x===k||(S.node.sk&&(x===S.node.si+':cap0'||x===S.node.si+':cap1')&&false)):all.filter(x=>x===k);
    if(sel.length)return sel;}
  return all;}
function simMount(){
  const row=document.querySelector('.nrow');if(!row||$('#sim-open'))return;
  const b=document.createElement('button');b.type='button';b.id='sim-open';b.className='btn sm';b.textContent='Применить к похожим…';
  b.title='Перенести правки точек этого знака на похожие знаки (по роли узла в конструкции)';b.addEventListener('click',simOpen);row.appendChild(b);simSync();}
function simSync(){const b=$('#sim-open');if(!b)return;const n=simPEdits().n;const okm=S.mode==='points'||S.mode==='skel';b.hidden=!okm;b.disabled=!n||!okm;if(!n)b.classList.remove('hint');}
function simHint(){simSync();const b=$('#sim-open');if(!b||b.disabled)return;b.classList.add('hint');clearTimeout(SIMUI.hint);SIMUI.hint=setTimeout(()=>b.classList.remove('hint'),7000);}
const _syncNodeSim=syncNodeInfo;syncNodeInfo=function(){_syncNodeSim.apply(this,arguments);simMount();simSync();};
const _onUpSim=onUp;onUp=function(e){const k=drag&&drag.kind,moved=drag&&(k==='pt'||(k==='sk'&&drag.moved));const r=_onUpSim.apply(this,arguments);if(moved)simHint();return r;};
document.addEventListener('DOMContentLoaded',()=>{simMount();});
function simAvail(c){return !!(GL[c]&&!isSpaceCh(c)&&(isLetter(c)||isDigit(c))&&edKey(c)!==edKey(S.sel));}
function simOpen(){
  if(!simPEdits().n)return;
  let el=$('#simdlg');
  if(!el){el=document.createElement('div');el.id='simdlg';el.className='cu-modal';el.hidden=true;
    el.innerHTML=`<div class="cu-card pn-sim" role="dialog" aria-labelledby="sm-t"><h4 id="sm-t">Применить к похожим</h4>
<div class="cu-msg" id="sm-msg"></div>
<div class="pn-pre" id="sm-scope"></div>
<div class="pn-lab">Группы</div><div class="pn-pre" id="sm-pre"></div>
<div class="pn-lab">Знаки вручную</div><div class="pn-grid" id="sm-grid"></div>
<div class="pn-lab">До и после</div><div class="sm-prev" id="sm-prev"></div>
<div class="cu-row end"><button type="button" class="btn" id="sm-cancel">Отмена</button><button type="button" class="btn pri" id="sm-go">Применить</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('pointerdown',e=>{if(e.target===el)simClose();});
    $('#sm-cancel').addEventListener('click',simClose);$('#sm-go').addEventListener('click',simGo);
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden){e.stopPropagation();simClose();}},true);}
  SIMUI.sel=new Set();SIMUI.node=false;SIMUI.res=new Map();SIMUI.src=S.sel;
  const twin=edKey,seen=new Set(),grid=$('#sm-grid');grid.innerHTML='';
  for(const c of CHARSET){if(!simAvail(c)||seen.has(twin(c)))continue;seen.add(twin(c));
    const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=c;b.dataset.ch=c;
    b.addEventListener('click',()=>{const k=twin(c);if(SIMUI.sel.has(k))SIMUI.sel.delete(k);else SIMUI.sel.add(k);simRefresh();});grid.appendChild(b);}
  const pre=$('#sm-pre');pre.innerHTML='';
  PEN_GROUPS.forEach(([name,chars])=>{const members=[...chars].filter(simAvail).map(twin);
    const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=name;b.dataset.mem=members.join('|');
    b.addEventListener('click',()=>{const on=members.length&&members.every(k=>SIMUI.sel.has(k));for(const k of members){if(on)SIMUI.sel.delete(k);else SIMUI.sel.add(k);}simRefresh();});
    if(!members.length)b.hidden=true;pre.appendChild(b);
    if([...chars].some(c=>twin(c)===twin(S.sel)))for(const k of members)SIMUI.sel.add(k);});
  const sc=$('#sm-scope');sc.innerHTML='';
  if(S.node&&!S.node.lat&&simSrcKeys().length>1){SIMUI.canNode=true;
    const b=document.createElement('button');b.type='button';b.className='chip';b.id='sm-node';b.textContent='Только выбранный узел';
    b.addEventListener('click',()=>{SIMUI.node=!SIMUI.node;SIMUI.res=new Map();simRefresh();});sc.appendChild(b);}
  else SIMUI.canNode=false;
  el.hidden=false;simRefresh();}
function simClose(){const el=$('#simdlg');if(el)el.hidden=true;SIMUI.job++;}
function simRefresh(){
  $$('#sm-grid .chip').forEach(b=>b.classList.toggle('on',SIMUI.sel.has(edKey(b.dataset.ch))));
  $$('#sm-pre .chip').forEach(b=>{const m=b.dataset.mem?b.dataset.mem.split('|'):[];b.classList.toggle('on',m.length>0&&m.every(k=>SIMUI.sel.has(k)));});
  const nb=$('#sm-node');if(nb)nb.classList.toggle('on',SIMUI.node);
  const keys=simSrcKeys();
  $('#sm-msg').textContent='Правки узлов знака «'+SIMUI.src+'»: '+keys.length+'. Сдвиг подстраивается под размер каждого знака.';
  simPreview();}
function simDrawG(cv,g,p){const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);if(!g)return;
  const hh=Math.max(p.capH,p.xh)*1.12+p.desc*0.0,sc=Math.min((h-6)/(p.capH*1.1+60),(w-6)/Math.max(g.adv,1));
  const ox=(w-g.adv*sc)/2,oy=h-3-60*sc;
  const P=pathOf(g.cs,(x,y)=>[ox+(x)*sc,oy-y*sc]);c.fillStyle=getComputedStyle(document.body).color||'#111';c.fill(P,'nonzero');}
function simTargetEval(t){
  const st=S.styles[S.style]||cur(),p=st.p,edS=S.edits[SIMUI.src],edT=S.edits[t];
  const sel=SIMUI.node?simSrcKeys():null;
  let res;try{res=simTransfer(SIMUI.src,t,p,edS,edT,sel);}catch(err){res={none:true,why:'нет соответствия'};}
  if(res.none)return {t,bad:true,why:res.why};
  const ed=simMerge(edT,res);
  const styles=(S.style==='italic'?['italic','regular']:['regular','italic']).map(k=>S.styles[k]).filter(Boolean);
  let chk;try{chk=simCheck(t,edT,ed,styles);}catch(err){chk={ok:false,msg:'Не удалось проверить форму. Попробуйте ещё раз'};}
  return {t,res,ed,ok:chk.ok,why:chk.ok?(res.partial?'узлов '+res.matched+' из '+res.total:''):chk.msg};}
function simPreview(){
  const box=$('#sm-prev'),targets=[...SIMUI.sel],job=++SIMUI.job;box.innerHTML='';
  const go=$('#sm-go');go.disabled=true;go.textContent='Применить';
  if(!targets.length)return;
  const cards=new Map();
  for(const t of targets){const d=document.createElement('div');d.className='sm-c';d.dataset.t=t;
    d.innerHTML='<b>'+t+'</b><div class="sm-cv"><canvas></canvas><canvas></canvas></div><span>проверка…</span>';box.appendChild(d);cards.set(t,d);}
  let i=0;const step=()=>{if(job!==SIMUI.job)return;
    const t=targets[i++];if(t===undefined){simGoState();return;}
    let r=SIMUI.res.get(t+(SIMUI.node?'#n':''));if(!r){r=simTargetEval(t);SIMUI.res.set(t+(SIMUI.node?'#n':''),r);}
    const d=cards.get(t);if(d){const cv=d.querySelectorAll('canvas')[1],cv0=d.querySelectorAll('canvas')[0],sp=d.querySelector('span'),p=(S.styles[S.style]||cur()).p;
      const st=S.styles[S.style]||cur();
      simDrawG(cv0,finalGlyph(t,st,S.edits,{slant:false}),p);
      if(!r.res){sp.textContent=r.why;d.classList.add('bad');simDrawG(cv,finalGlyph(t,st,S.edits,{slant:false}),p);}
      else{const after=finalGlyph(t,st,Object.assign({},S.edits,{[edKey(t)]:r.ed}),{slant:false});
        simDrawG(cv,r.ok?after:finalGlyph(t,st,S.edits,{slant:false}),p);
        sp.textContent=r.ok?(r.why||'узлов '+r.res.matched):'отклонено: '+r.why;if(!r.ok)d.classList.add('bad');}}
    setTimeout(step,0);};
  setTimeout(step,0);}
function simGoState(){let n=0;for(const t of SIMUI.sel){const r=SIMUI.res.get(t+(SIMUI.node?'#n':''));if(r&&r.res&&r.ok)n++;}
  const go=$('#sm-go');go.disabled=!n;go.textContent=n?'Применить ('+n+')':'Применить';}
function simGo(){
  const ok=[],skip=[];const keyN=t=>t+(SIMUI.node?'#n':'');
  const list=[...SIMUI.sel].map(t=>SIMUI.res.get(keyN(t))||simTargetEval(t));
  if(!list.some(r=>r.res&&r.ok)){simClose();toast('Ни один знак не подошёл — ничего не изменено');return;}
  snap();
  for(const r of list){if(r.res&&r.ok){S.edits[r.t]=r.ed;ok.push(r.t);}else skip.push(r.t);}
  simClose();SKD=null;bump();syncNodeInfo();schedule();
  toast('Применено к '+ok.length+': '+ok.join(' ')+(skip.length?' · пропущено: '+skip.join(' '):''));}
