/* ===== Оси вариативного шрифта и «Униширинные» (ui_vfx.js): параметры меню «Скачать» + панель «Оси» в редакторе =====
   Параметры хранятся в localStorage (gtype-vfopt-v1, всё в try/catch). Экспорт читает vfxOpts(). */
const VFXO_KEY='gtype-vfopt-v1';
const VFXO={axes:{wght:true,wdth:false,opsz:false,slnt:false},uniwidth:false};
const VFX_UI_RU={wght:'Насыщенность',wdth:'Ширина',opsz:'Оптический размер',slnt:'Наклон'};
try{const j=JSON.parse(localStorage.getItem(VFXO_KEY)||'null');if(j&&j.axes&&typeof j.axes==='object'){for(const t in VFXO.axes)if(typeof j.axes[t]==='boolean')VFXO.axes[t]=j.axes[t];VFXO.uniwidth=j.uniwidth===true;}}catch(e){}
function vfxSaveOpts(){try{localStorage.setItem(VFXO_KEY,JSON.stringify(VFXO));}catch(e){}}
function vfxOpts(){const a=VFX_ORDER.filter(t=>VFXO.axes[t]);return {axes:a.length?a:['wght'],uniwidth:VFXO.uniwidth};}
const VFXP={bytes:null,sig:'',busy:false,info:null,face:null,n:0,style:'regular'};
function vfxSig(){return JSON.stringify([CUR_FONT,S.style,S.styles[S.style].p,S.edits,vfxOpts()]);}
function vfxMenuInit(){
  const m=$('#ex-list');if(!m||m.querySelector('.xopts'))return;
  if(!$('#vfx-css')){const st=document.createElement('style');st.id='vfx-css';
    st.textContent='#ex-list .xopts{padding:4px 16px 10px;display:grid;gap:8px;font:500 14px var(--f-ui)}'
      +'#ex-list .xopts .chk{min-height:30px}#ex-list .xopts .xh{font:600 12px var(--f-ui);color:var(--muted);letter-spacing:.02em;margin-top:2px}'
      +'#vfx-pane .vfx-row{display:grid;grid-template-columns:140px 1fr 56px;align-items:center;gap:10px;min-height:36px}'
      +'#vfx-pane .vfx-row output{font-variant-numeric:tabular-nums;text-align:right}#vfx-pane .vfx-bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden;margin:8px 0}'
      +'#vfx-pane .vfx-bar i{display:block;height:100%;width:0;background:var(--accent);transition:width var(--dur-fast)}'
      +'#vfx-txt{min-height:56px;padding:6px 2px;outline:none;font-size:40px;line-height:1.25;word-break:break-word}';
    document.head.appendChild(st);}
  const box=document.createElement('div');box.className='xopts';box.setAttribute('role','group');box.setAttribute('aria-label','Параметры вариативного шрифта');
  box.innerHTML='<div class="xh">Оси вариативного шрифта</div>'
    +VFX_ORDER.map(t=>'<label class="chk"><input type="checkbox" data-vfax="'+t+'"'+(VFXO.axes[t]?' checked':'')+'><span>'+VFX_UI_RU[t]+'</span></label>').join('')
    +'<div class="xh">Метрика</div><label class="chk" title="Ширина знаков у каждого веса и италика равна ширине Regular, кернинг пересчитан внутри неё: текст не прыгает при смене веса"><input type="checkbox" id="vfx-uw"'+(VFXO.uniwidth?' checked':'')+'><span>Униширинные</span></label>';
  const vf=m.querySelector('[data-x=vf]');
  if(vf)vf.parentNode.insertBefore(box,vf.nextSibling);else m.appendChild(box);
  box.addEventListener('change',e=>{const t=e.target;
    if(t.dataset.vfax)VFXO.axes[t.dataset.vfax]=t.checked;else if(t.id==='vfx-uw')VFXO.uniwidth=t.checked;
    vfxSaveOpts();vfxPaneSync();});
  box.addEventListener('click',e=>e.stopPropagation());
  /* Tab внутри блока не закрывает меню */
  box.addEventListener('keydown',e=>{if(e.key==='Tab')e.stopPropagation();});
  vfxPaneInit();
  const eb=$('#ex-menu');if(eb)eb.addEventListener('click',vfxAvailSync);const rd=$('#rail-dl');if(rd)rd.addEventListener('click',vfxAvailSync);
}
/* недоступные оси для текущего шрифта и начертания: чекбокс неактивен, подсказка объясняет причину */
function vfxAvailSync(){
  let av;try{av=vfxAvailable(S.style,S.styles[S.style].p);}catch(e){return;}
  document.querySelectorAll('#ex-list [data-vfax]').forEach(i=>{const t=i.dataset.vfax,ok=av.includes(t);i.disabled=!ok;
    i.parentNode.title=ok?'':(t==='slnt'&&S.style==='italic'?'У италика наклон уже в начертании (ital 0/1)':'Для этого шрифта ось недоступна: форма меняется отдельными начертаниями');});
}
/* ---------- панель «Оси»: сборка по требованию, ползунки -> font-variation-settings ---------- */
function vfxPaneInit(){
  if($('#vfx-pane'))return;
  const host=$('#specwrap .chiprow')||$('.specwrap');if(!host)return;
  /* свёрнутая по умолчанию панель (.pane, paneInit из ui_ds_s1.js): шапка-чип «Оси» в ряду образца, тело открывается под рядом */
  const d=paneEl('ed-axes','Оси','<div class="vfx-body"><p class="vfx-note" style="margin:6px 0;color:var(--muted)">Соберите вариативный шрифт в памяти — ползунки покажут оси на образце. Набор осей — в меню «Скачать».</p>'
    +'<button class="btn sm" id="vfx-build" type="button">Собрать оси</button><div class="vfx-bar" hidden><i></i></div><div id="vfx-sl"></div>'
    +'<div id="vfx-txt" contenteditable="true" spellcheck="false" hidden>Жизнь ыдЯ Hamburgefonstiv 1234</div></div>',{bid:'vfx-body'});d.id='vfx-pane';
  host.appendChild(d);paneInit(d,'ed-axes',false);
  $('#vfx-build').addEventListener('click',vfxBuildPreview);
}
function vfxPaneSync(){const b=$('#vfx-build');if(!b)return;
  const stale=VFXP.bytes&&VFXP.sig!==vfxSig();b.textContent=VFXP.bytes?(stale?'Пересобрать (параметры изменились)':'Пересобрать'):'Собрать оси';}
async function vfxBuildPreview(){
  if(VFXP.busy)return;VFXP.busy=true;
  const bar=$('#vfx-pane .vfx-bar'),fill=bar.firstChild,btn=$('#vfx-build');bar.hidden=false;fill.style.width='0';btn.disabled=true;
  let yl=Date.now();const o=vfxOpts(),style=S.style,sig=vfxSig();
  try{
    const r=await buildVariableTTF(style,S,{axes:o.axes,uniwidth:o.uniwidth,tick:async(k,i,n)=>{fill.style.width=Math.round(i*100/n)+'%';
      if(Date.now()-yl>40){await new Promise(x=>setTimeout(x,0));yl=Date.now();}}});
    const fam='GTVFPrev'+(++VFXP.n),ff=new FontFace(fam,r.bytes.buffer.slice(0));await ff.load();document.fonts.add(ff);
    if(VFXP.face)try{document.fonts.delete(VFXP.face);}catch(e){}
    VFXP.face=ff;VFXP.bytes=r.bytes;VFXP.sig=sig;VFXP.info=r;VFXP.style=style;VFXP.fam=fam;
    const sl=$('#vfx-sl');sl.innerHTML='';
    for(const a of r.axisInfo){const row=document.createElement('div');row.className='vfx-row';
      row.innerHTML='<label for="vfx-'+a.tag+'">'+(VFX_UI_RU[a.tag]||a.tag)+'</label><input type="range" id="vfx-'+a.tag+'" min="'+a.min+'" max="'+a.max+'" step="'+(a.tag==='opsz'?0.5:1)+'" value="'+a.def+'" data-tag="'+a.tag+'"><output>'+a.def+'</output>';
      sl.appendChild(row);}
    const t=$('#vfx-txt');t.hidden=false;t.style.fontFamily="'"+fam+"',sans-serif";vfxApply();
    sl.oninput=e=>{if(e.target.dataset.tag){e.target.nextSibling.textContent=e.target.value;vfxApply();}};
    toast('Оси собраны: '+r.axes.join(', ')+(r.axesDropped.length?' (не вошли: '+r.axesDropped.join(', ')+')':''));
  }catch(e){toast('Не удалось собрать оси. Попробуйте ещё раз');}
  finally{VFXP.busy=false;btn.disabled=false;bar.hidden=true;vfxPaneSync();}
}
function vfxApply(){const t=$('#vfx-txt');if(!t)return;
  t.style.fontVariationSettings=[...document.querySelectorAll('#vfx-sl input[data-tag]')].map(i=>"'"+i.dataset.tag+"' "+i.value).join(',');
  t.style.fontStyle='normal';}
document.addEventListener('DOMContentLoaded',()=>{vfxMenuInit();});
