/* ===== Декоративные начертания (d1): интерфейс =====
   · раздел «Декоративные начертания» в меню «Скачать» (4 пункта: Контурное, Оконтуренное, Оттенённое, Выворотное);
   · кнопка «Декор» в образце редактора: предпросмотр строится той же геометрией, что и экспорт (decoGlyph → buildTTF/decoApply);
   · панель параметров со ползунками в процентах штриха; пределы из измерения шрифта. */
const DCU={
  on:false,sel:'outline',
  /* варианты в списке: ключ → {style,variant} */
  V:{
    outline:{style:'outline',ru:'Контурное',tip:'Только линия по контуру знака, середина пустая.'},
    inline_in:{style:'inline_in',ru:'Оконтуренное — внутренняя линия',tip:'Чёрный знак с белой линией внутри, на расстоянии от края.'},
    inline_out:{style:'inline_out',ru:'Оконтуренное — внешняя обводка',tip:'Чёрный знак и вторая линия вокруг него через белый просвет.'},
    shadow_block:{style:'shadow',variant:'block',ru:'Оттенённое — белый знак',tip:'Знак белый с контуром, чёрная тень-выдавка под углом.'},
    shadow_solid:{style:'shadow',variant:'solid',ru:'Оттенённое — отделённая тень',tip:'Чёрный знак и сплошная тень, отделённая белым просветом.'},
    shadow_hatch:{style:'shadow',variant:'hatch',ru:'Оттенённое — штриховая тень',tip:'Чёрный знак и тень из косых штрихов.'},
    cameo:{style:'cameo',ru:'Выворотное',tip:'Белая буква на чёрном прямоугольнике на каждый знак.'}
  },
  /* параметры по вариантам: ключ, подпись, подсказка */
  P:{
    outline:[['w','Толщина линии','Ширина контурной линии, % от основного штриха']],
    inline_in:[['d','От края','Расстояние от края знака до белой линии, % штриха'],['w','Толщина линии','Ширина белой линии, % штриха']],
    inline_out:[['g','Просвет','Белый промежуток между знаком и внешней линией, % штриха'],['w','Толщина линии','Ширина внешней линии, % штриха']],
    shadow_block:[['angle','Угол тени','Направление тени в градусах: −45 — вправо вниз'],['depth','Глубина','Длина тени, % штриха'],['w','Контур','Толщина контура белого знака, % штриха']],
    shadow_solid:[['angle','Угол тени','Направление тени в градусах: −45 — вправо вниз'],['depth','Глубина','Длина тени, % штриха'],['g','Просвет','Белый промежуток между знаком и тенью, % штриха']],
    shadow_hatch:[['angle','Угол тени','Направление тени в градусах: −45 — вправо вниз'],['depth','Глубина','Длина тени, % штриха'],['g','Просвет','Белый промежуток между знаком и тенью, % штриха'],['pitch','Шаг штриха','Расстояние между штрихами, % штриха']],
    cameo:[['pad','Поля','Отступ буквы от края прямоугольника по бокам, % штриха'],['round','Скругление','Скругление углов прямоугольника, % от половины меньшей стороны'],['gap','Зазор','Белая щель между соседними прямоугольниками, % штриха']]
  },
  vals:{},        /* ключ варианта → {параметр: значение} */
  busy:false,sig:'',tm:0
};
/* спецификация для buildTTF/предпросмотра */
function dcuSpec(key){
  const v=DCU.V[key];if(!v)return null;
  const params=Object.assign({},DCU.vals[key]||{});
  if(v.variant)params.variant=v.variant;
  return {style:v.style,params};
}
/* группа меню → вариант: Оконтуренное и Оттенённое экспортируют выбранный в панели вариант своей группы */
const DCU_GROUP={outline:['outline'],inline:['inline_in','inline_out'],shadow:['shadow_block','shadow_solid','shadow_hatch'],cameo:['cameo']};
function dcuKeyFor(group){const g=DCU_GROUP[group];return g.includes(DCU.sel)?DCU.sel:g[0];}
/* единицы шрифта для текущего шрифта: измерение по образцам знаков */
function dcuMeasure(k){
  const st=S.styles[k||S.style];
  return decoMeasureSt(st,S.edits,S.fontId);
}
/* ---------- экспорт ---------- */
async function dcuExport(group){
  ensureKern();
  const key=dcuKeyFor(group),spec=dcuSpec(key);if(!spec)return false;
  const w=weightOf(S.styles.regular.p);
  toast('Собираю '+DCU.V[key].ru.toLowerCase()+'…');await new Promise(r=>setTimeout(r,30));
  let ok=true;
  for(const k of ['regular','italic']){
    const r=buildTTF(k,S,{weight:w.weight,weightName:w.name,decorate:spec});
    const nm=r.psName||(psSafe(S.family)+'-'+k);
    ok=await saveFile(nm+'.ttf',r.bytes,'font/ttf');if(!ok)break;
  }
  return ok;
}
/* ---------- предпросмотр в образце ---------- */
function dcuPreview(){
  const cv=$('#spec');if(!cv||!DCU.on)return;
  const key=DCU.sel,spec=dcuSpec(key);if(!spec)return;
  const box=cv.parentElement,maxH=specMaxH(),maxW=Math.max(200,box.clientWidth-40);
  const rawT=String(S.text||''),ph=!rawT.trim();
  const txt=ph?smpDefault():(rawT.replace(/[ \t]+$/,'')||' ');
  const rows=['regular','italic'];
  let fs=S.specSize,lays,total;
  const data={};
  for(const k of rows){
    const st=S.styles[k],m=decoMeasureSt(st,S.edits,S.fontId);
    const used=new Map();
    for(const ch of txt){if(ch==='\n'||used.has(ch))continue;const g=finalGlyph(ch,st,S.edits)||(ch.toUpperCase()!==ch?finalGlyph(ch.toUpperCase(),st,S.edits):null);used.set(ch,g);}
    const gl=[...used.values()].filter(Boolean);
    const bx=spec.style==='cameo'?decoBoxOf(st.p,gl.map(g=>g.cs),dcResolve(spec,m)):null;
    const dec=new Map();
    for(const [ch,g] of used){if(!g){dec.set(ch,null);continue;}
      if(!g.cs||!g.cs.length){dec.set(ch,{cs:[],adv:g.adv});continue;}
      let r;try{r=decoGlyph(g,spec,m,bx,S.fontId+'|'+k+'|'+ch+'|'+JSON.stringify(st.p).length+'|'+(typeof ver!=='undefined'?ver:0));}catch(e){r={cs:g.cs,adv:g.adv};}
      dec.set(ch,r);}
    data[k]=dec;
  }
  const layout1=(k,fsz)=>{
    const sc=fsz/1000,lines=[],dec=data[k];
    const adv=ch=>{const d=dec.get(ch);return d?d.adv*sc:0;};
    const kf=(a,b)=>spec.style==='cameo'?0:kernOf(a,b,k,false)*sc;
    for(const para of txt.split('\n')){
      let line={chars:[],w:0};const sp=adv(' ');
      para.split(' ').forEach((wd,wi)=>{
        let ww=0,pv='';for(const ch of wd){ww+=adv(ch)+(pv?kf(pv,ch):0);pv=ch;}
        if(line.chars.length&&line.w+sp+ww>maxW){lines.push(line);line={chars:[],w:0};}
        else if(wi>0&&line.chars.length)line.w+=sp;
        pv='';for(const ch of wd){if(pv)line.w+=kf(pv,ch);line.chars.push({ch,x:line.w});line.w+=adv(ch);pv=ch;}
      });
      lines.push(line);
    }
    return {lines,sc};
  };
  for(let it=0;it<16;it++){
    lays=rows.map(k=>layout1(k,fs));
    let wmax=0;lays.forEach(L=>L.lines.forEach(l=>{if(l.w>wmax)wmax=l.w;}));
    total=14;lays.forEach(L=>total+=L.lines.length*fs*1.15+10);total+=8;
    const mhF=Math.max(maxH,110);if((wmax<=maxW+0.5&&total<=mhF)||fs<=12)break;
    fs=Math.max(12,Math.floor(fs*Math.min(0.97,maxW/wmax,mhF/total)));
  }
  const H=Math.ceil(Math.max(110,total));
  box.style.height=Math.min(H,Math.max(maxH,110))+'px';cv.style.height=H+'px';
  const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
  const fg=css('--glyph'),dim=css('--glyph-dim'),ln=css('--line');
  let y=14;const RC=[];
  rows.forEach((k,ri)=>{
    const L=lays[ri],sc=L.sc,col=ph?dim:(k===S.style?fg:dim),dec=data[k],RR=[];RC.push(RR);
    L.lines.forEach(line=>{
      const base=y+fs*0.86;
      for(const it of line.chars){const d=dec.get(it.ch);RR.push({ch:it.ch,x0:20+it.x,x1:20+it.x+(d?d.adv*sc:0),y0:y+fs*0.04,y1:y+fs*1.06});
        if(!d||!d.cs.length)continue;
        const tf=(x,yy)=>[20+it.x+x*sc,base-yy*sc];
        c.fillStyle=col;c.fill(pathOf(d.cs,tf),'nonzero');}
      y+=fs*1.15;
    });
    y+=10;if(ri<rows.length-1){c.strokeStyle=ln;c.beginPath();c.moveTo(20,y-8);c.lineTo(w-20,y-8);c.stroke();}
  });
  smpCommit('spec',RC,ph?'':rawT,{left:20,line:{y0:14+fs*0.04,y1:14+fs*1.06},pitch:fs*1.15,spw:fs*0.26});
  S.specFs=fs;DCU.stamp=(DCU.stamp||0)+1;
}
/* ---------- панель ---------- */
function dcuRenderBar(){
  const bar=$('#decobar');if(!bar)return;
  bar.hidden=!DCU.on;if(!DCU.on)return;
  const key=DCU.sel,m=dcuMeasure(),v=DCU.V[key],ps=DCU.P[key]||[];
  const vals=DCU.vals[key]||(DCU.vals[key]={});
  const lim=decoLimits(v.style,m);
  const opts=Object.keys(DCU.V).map(k=>'<option value="'+k+'"'+(k===key?' selected':'')+'>'+DCU.V[k].ru+'</option>').join('');
  let h='<label class="dcu-f" title="'+v.tip+'"><span>Начертание</span><select id="dcu-sel" aria-label="Декоративное начертание">'+opts+'</select></label>';
  for(const [pk,ru,tip] of ps){
    let mn,mx,step=1,def=DCS_DEF[v.style][pk];
    if(pk==='angle'){mn=-180;mx=180;step=5;}
    else if(pk==='round'){mn=0;mx=100;}
    else{const L=lim[pk]||[1,100];mn=L[0];mx=L[1];}
    let cur=vals[pk]!=null?vals[pk]:def;cur=Math.max(mn,Math.min(mx,cur));
    h+='<label class="dcu-f" title="'+tip+'"><span>'+ru+'</span><input type="range" data-p="'+pk+'" min="'+mn+'" max="'+mx+'" step="'+step+'" value="'+cur+'" aria-label="'+ru+'"><output>'+cur+(pk==='angle'?'°':'%')+'</output></label>';
  }
  bar.innerHTML=h;
  bar.querySelector('#dcu-sel').addEventListener('change',e=>{DCU.sel=e.target.value;dcuRenderBar();dcuRedraw();});
  bar.querySelectorAll('input[type=range]').forEach(inp=>inp.addEventListener('input',()=>{
    const pk=inp.dataset.p;(DCU.vals[DCU.sel]||(DCU.vals[DCU.sel]={}))[pk]=+inp.value;
    inp.nextElementSibling.textContent=inp.value+(pk==='angle'?'°':'%');
    clearTimeout(DCU.tm);DCU.tm=setTimeout(dcuRedraw,90);}));
}
function dcuRedraw(){if(typeof schedule==='function')schedule();}
function dcuToggle(on){
  DCU.on=on;const b=$('#decob');if(b){b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');}
  dcuRenderBar();dcuRedraw();
}
/* ---------- встраивание ---------- */
function dcuInit(){
  /* стили панели: токены дизайн-системы, обе темы */
  if(!document.getElementById('dcu-css')){const st=document.createElement('style');st.id='dcu-css';
    st.textContent='.decobar{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;padding:10px 14px;border-radius:var(--r-sm);background:var(--panel)}'
      +'.decobar[hidden]{display:none}'
      +'.dcu-f{display:inline-flex;align-items:center;gap:10px;font-size:var(--fs-base);color:var(--ink)}'
      +'.dcu-f span{font-weight:600;white-space:nowrap}'
      +'.dcu-f input[type=range]{width:120px}'
      +'.dcu-f output{min-width:44px;font-weight:600;font-variant-numeric:tabular-nums}'
      +'.dcu-f select{min-height:40px;border-radius:var(--r-pill);border:0;padding:0 14px;background:var(--paper);color:var(--ink);font:600 var(--fs-base) var(--f-ui)}'
      +'#ex-list .xsec{padding:10px 16px 4px;font:600 var(--fs-sm) var(--f-ui);color:var(--muted);letter-spacing:.02em}'
      +'#ex-list .xsep{height:1px;margin:6px 8px;background:var(--line)}';
    document.head.appendChild(st);}
  /* кнопка в образце */
  const cmp=$('#cmpb');
  if(cmp&&!$('#decob')){
    const b=document.createElement('button');b.type='button';b.className='chip';b.id='decob';b.textContent='Декор';
    b.title='Декоративные начертания: контурное, оконтуренное, оттенённое, выворотное';b.setAttribute('aria-pressed','false');
    cmp.parentNode.insertBefore(b,cmp.nextSibling);
    b.addEventListener('click',()=>dcuToggle(!DCU.on));
    const tools=cmp.closest('.spectools')||cmp.parentNode.parentNode;
    const bar=document.createElement('div');bar.className='decobar';bar.id='decobar';bar.hidden=true;bar.setAttribute('role','group');bar.setAttribute('aria-label','Декоративные начертания');
    tools.appendChild(bar);
  }
  /* раздел в меню «Скачать» */
  const m=$('#ex-list');
  if(m&&!m.querySelector('[data-x=deco_outline]')){
    const sep=document.createElement('div');sep.className='xsep';sep.setAttribute('role','separator');
    const sec=document.createElement('div');sec.className='xsec';sec.setAttribute('role','presentation');sec.textContent='Декоративные начертания';
    m.append(sep,sec);
    for(const [g,ru,tip] of [['outline','Контурное .ttf','Только контурная линия, середина пустая'],['inline','Оконтуренное .ttf','Знак с внутренней линией или внешней обводкой — по выбору в панели «Декор»'],['shadow','Оттенённое .ttf','Знак с тенью-выдавкой — вариант по выбору в панели «Декор»'],['cameo','Выворотное .ttf','Белые буквы на чёрных прямоугольниках']]){
      const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.x='deco_'+g;b.textContent=ru;b.title=tip;m.appendChild(b);
      EX_RUN['deco_'+g]=()=>dcuExport(g);
    }
  }
}
/* предпросмотр: поверх штатной отрисовки образца */
(function(){
  const _ds=drawSpecimen;
  drawSpecimen=function(){
    if(DCU.on&&!(S.cmp&&S.cmp.on)){try{dcuPreview();return;}catch(e){console.warn('deco preview',e);}}
    return _ds.apply(this,arguments);
  };
})();
document.addEventListener('DOMContentLoaded',()=>{try{dcuInit();}catch(e){console.warn('deco init',e);}});
