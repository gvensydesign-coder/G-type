/* ===== Профессиональный тестер шрифта (#7): набор, различимость, цветность, водопад =====
   Подключается к образцу редактора: drawSpecimen вызывает TT.draw(), когда включён «Тестер».
   Настройки хранятся отдельно для каждого шрифта (localStorage, всё в try/catch). */
const TT={on:false,fid:null,s:null,thr:0.15,gfHook:null,info:{},res:{},t:0,ui:false};
const TT_KEY='gtype-tt-v1';
const TT_DEF={pt:24,lh:120,tr:0,al:'left',hy:false,cols:60,paper:'light',tab:'set',on:false};
const TT_PT_PX=96/72,TT_PT_MM=0.3528;
/* эталонный абзац (Н. В. Гоголь, «Мёртвые души», общественное достояние) */
const TT_GOGOL='В ворота гостиницы губернского города NN въехала довольно красивая рессорная небольшая бричка, в какой ездят холостяки: отставные подполковники, штабс-капитаны, помещики, имеющие около сотни душ крестьян, — словом, все те, которых называют господами средней руки. В бричке сидел господин, не красавец, но и не дурной наружности, ни слишком толст, ни слишком тонок; нельзя сказать, чтобы стар, однако ж и не так чтобы слишком молод. Въезд его не произвёл в городе совершенно никакого шума и не был сопровожден ничем особенным; только два русские мужика, стоявшие у дверей кабака против гостиницы, сделали кое-какие замечания, относившиеся, впрочем, более к экипажу, чем к сидевшему в нём.';
const TT_PRESETS=[
  ['Панграммы',[
    ['В чащах юга жил-был цитрус…','В чащах юга жил-был цитрус… — да, но фальшивый экземпляръ'],
    ['Съешь ещё этих мягких булок','Съешь ещё этих мягких французских булок, да выпей же чаю'],
    ['Экс-граф? Плюш изъят…','Экс-граф? Плюш изъят. Бьём чуждый цен хвощ!'],
    ['Южно-эфиопский грач…','Южно-эфиопский грач увёл мышь за хобот на съезд ящериц'],
    ['The quick brown fox','The quick brown fox jumps over the lazy dog'],
    ['Pack my box','Pack my box with five dozen liquor jugs'],
    ['Sphinx of black quartz','Sphinx of black quartz, judge my vow'],
    ['How vexingly quick','How vexingly quick daft zebras jump!']]],
  ['Текст',[
    ['Абзац: Гоголь, «Мёртвые души»',TT_GOGOL]]],
  ['Типографика',[
    ['Тире, кавычки, №, §, цифры','Дефис: жил-был, кто-нибудь. Короткое тире: 1914–1918 гг. Длинное — вот так.\n«Ёлочки и „лапки“», “quotes”, 5 %, № 7, § 12, ¶, ©, ®, ™.\n0123456789 · 3×4=12 · 12:30 · 1 234 567,89 ₽ · (a+b)/c · @ & …']]]
];
const TT_SETS=[['I','l','1','|'],['O','0','О'],['Ѕ','5'],['З','3','Э'],['Ч','У','4'],['rn','m'],['cl','d'],['ив','иб'],['р','п'],['ш','щ'],['ь','ъ'],['Б','6']];
const TT_WF=[8,10,12,14,18,24,36,48,72];

/* ---------- хранилище (по шрифту) ---------- */
function ttStore(){try{return JSON.parse(localStorage.getItem(TT_KEY)||'{}')||{};}catch(e){return {};}}
function ttSave(){try{const a=ttStore();a[TT.fid]=TT.s;localStorage.setItem(TT_KEY,JSON.stringify(a));}catch(e){}}
function ttLoad(){
  TT.fid=S.fontId;let st={};try{st=ttStore()[TT.fid]||{};}catch(e){}
  const s=Object.assign({},TT_DEF);
  for(const k of Object.keys(TT_DEF)){if(st[k]!==undefined&&typeof st[k]===typeof TT_DEF[k])s[k]=st[k];}
  s.pt=Math.min(144,Math.max(6,s.pt));s.lh=Math.min(220,Math.max(80,s.lh));s.tr=Math.min(400,Math.max(-100,s.tr));s.cols=Math.min(100,Math.max(20,s.cols));
  if(!['left','center','right','justify'].includes(s.al))s.al='left';
  if(!['set','dis','col','wf'].includes(s.tab))s.tab='set';
  if(!['light','dark'].includes(s.paper))s.paper='light';
  TT.s=s;TT.on=!!s.on;
  if(TT.ui)ttSync();
}
/* ---------- глифы и метрики ---------- */
function ttGlyph(ch,k){
  if(TT.gfHook){const h=TT.gfHook(ch,k);if(h)return h;}
  const o=(S.live&&k===S.style)?FAST:undefined;
  return o?getFinal(ch,k,o):gfSmart(ch,k);
}
function ttAdv(ch,k){const g=ttGlyph(ch,k);return g?g.adv:0;}
/* средняя ширина знака (с пробелами) на 1000 ед. — по эталонному абзацу */
function ttAvg(k){let w=0,n=0;for(const ch of TT_GOGOL){w+=ttAdv(ch,k);n++;}return n?w/n:500;}
/* переносы по правилам русского языка (упрощённо): между слогами, не оставляя одну букву; ь, ъ, й не отрываются */
function ruBreaks(w){
  const V='аеёиоуыэюя',low=w.toLowerCase(),v=[];
  for(let i=0;i<low.length;i++)if(V.includes(low[i]))v.push(i);
  const out=[];
  for(let q=0;q+1<v.length;q++){
    const a=v[q],b=v[q+1];let cut=b-a-1===0?b:b-1;
    if(cut<b&&(low[cut]==='ь'||low[cut]==='ъ'))cut++;
    if(cut>=2&&low.length-cut>=2)out.push(cut);
  }
  return out;
}
/* набор: слова, перенос слов, выключка. Возвращает строки со словами и позициями */
function ttLayout(text,k,fs,maxW,s){
  const sc=fs/1000,tr=s.tr/1000*fs,lines=[],live=!!(S.live&&k===S.style);
  const spw=ttAdv(' ',k)*sc+tr;
  const mkWord=str=>{const chars=[];let x=0,pv='';
    for(const ch of str){if(pv)x+=kernOf(pv,ch,k,live)*sc;const gn=ctxName(pv,ch);chars.push({ch,gn,x});x+=ttAdv(gn,k)*sc+tr;pv=ch;}
    return {chars,w:Math.max(0,x-(chars.length?tr:0)),str};};
  const hyph=s.hy&&s.al==='justify';
  for(const para of text.split('\n')){
    let line={words:[],w:0};
    const flush=last=>{line.last=!!last;lines.push(line);line={words:[],w:0};};
    const put=wd=>{if(line.words.length)line.w+=spw;wd.lx=line.w;line.words.push(wd);line.w+=wd.w;};
    for(const str of para.split(' ')){
      if(!str)continue;
      let rest=str,wd=mkWord(rest);
      for(let guard=0;guard<12;guard++){
        const add=(line.words.length?spw:0)+wd.w;
        if(!line.words.length||line.w+add<=maxW+0.01){put(wd);break;}
        let done=false;
        if(hyph){
          const m=rest.match(/^([^а-яёА-ЯЁ]*)([а-яёА-ЯЁ]+)/);
          const off=m?m[1].length:0,br=m?ruBreaks(m[2]).map(c=>c+off):[];
          for(let bi=br.length-1;bi>=0;bi--){
            const head=mkWord(rest.slice(0,br[bi])+'-');
            if(line.w+(line.words.length?spw:0)+head.w<=maxW+0.01){
              put(head);flush(false);rest=rest.slice(br[bi]);wd=mkWord(rest);done=true;break;}
          }
        }
        if(!done)flush(false);
      }
    }
    flush(true);
  }
  /* выключка */
  for(const L of lines){
    const n=L.words.length;let off=0,ex=0;
    if(s.al==='center')off=(maxW-L.w)/2;else if(s.al==='right')off=maxW-L.w;
    else if(s.al==='justify'&&!L.last&&n>1&&L.w<maxW)ex=(maxW-L.w)/(n-1);
    L.words.forEach((wd,i)=>{wd.x=off+wd.lx+ex*i;});
    L.off=off;L.ex=ex;
    if(ex)L.w=maxW;
  }
  return {lines,sc,spw};
}
/* ---------- набор на холсте образца ---------- */
function ttPaper(){
  return TT.s.paper==='dark'?{bg:css('--cvd-paper')||'#141416',fg:css('--cvd-ink')||'#f2f2f4',dim:css('--cvd-nbr')||'rgba(255,255,255,.22)'}:{bg:css('--canvas')||'#fff',fg:css('--glyph')||'#000',dim:css('--line')||'#ddd'};
}
function ttText(){const r=String(S.text||'');return !r.trim()?smpDefault():(r.replace(/[ \t]+$/,'')||' ');}
function ttDrawLines(c,L,k,fs,lh,x0,y0,fg,o,rec,rs){
  let y=y0;rs=rs||1;
  for(const line of L.lines){
    const base=y+(lh-fs)/2+fs*0.86;
    for(const wd of line.words)for(const it of wd.chars){
      const g=ttGlyph(it.gn||it.ch,k);
      if(rec){const ax=(x0+wd.x+it.x)*rs;rec.push({ch:it.ch,x0:ax,x1:ax+(g?g.adv*L.sc*rs:0),y0:(y+(lh-fs)/2+fs*0.04)*rs,y1:(y+(lh-fs)/2+fs*1.06)*rs});}
      if(!g||!g.cs.length)continue;
      const tf=(x,yy)=>[x0+wd.x+it.x+x*L.sc,base-yy*L.sc];
      if((o&&!TT.gfHook)||g.live)fillCSG(c,g.cs,tf,fg);else{c.fillStyle=fg;c.fill(pathOf(g.cs,tf),'nonzero');}}
    y+=lh;}
  return y;
}
TT.draw=function(){
  const s=TT.s,cv=$('#spec'),box=cv.parentElement,k=S.style;
  const fs=s.pt*TT_PT_PX,lh=fs*s.lh/100;
  const boxW=Math.max(160,box.clientWidth-8),avg=ttAvg(k)*fs/1000+s.tr/1000*fs;
  const maxW=Math.min(2400,Math.max(40,s.cols*avg));
  /* истинный формат сохраняется; если он шире окна — образец уменьшается целиком */
  const sc=Math.min(1,(boxW-40-52)/maxW);/* справа — зазор под кнопку сворачивания */
  const L=ttLayout(ttText(),k,fs,maxW,s);
  const H=Math.ceil(28+L.lines.length*lh);
  const maxH=Math.min(250,Math.max(150,specMaxH()));
  box.style.height=Math.min(Math.ceil(H*sc),maxH)+'px';cv.style.height=Math.ceil(H*sc)+'px';cv.style.width='';
  const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
  const P=ttPaper();c.fillStyle=P.bg;c.fillRect(0,0,w,h);
  c.save();c.scale(sc,sc);
  /* границы формата */
  c.save();c.strokeStyle=P.dim;c.lineWidth=1/sc;c.setLineDash([3,4]);c.beginPath();c.moveTo(20.5,6);c.lineTo(20.5,H-6);c.moveTo(20.5+maxW,6);c.lineTo(20.5+maxW,H-6);c.stroke();c.restore();
  const ph=!String(S.text||'').trim(),RR=[];
  if(ph)c.globalAlpha=.38;/* пусто: образец по умолчанию приглушён */
  ttDrawLines(c,L,k,fs,lh,20,14,P.fg,S.live&&k===S.style?FAST:undefined,RR,sc);
  c.restore();
  smpCommit('spec',[RR],ph?'':String(S.text||''),{left:20*sc,line:{y0:(14+(lh-fs)/2+fs*0.04)*sc,y1:(14+(lh-fs)/2+fs*1.06)*sc},pitch:lh*sc,spw:fs*0.26*sc});
  let chars=0;L.lines.forEach(l=>{chars+=l.words.reduce((a,wd)=>a+wd.chars.length,0)+Math.max(0,l.words.length-1);});
  const meas=L.lines.length?Math.round(chars/L.lines.length):0;
  TT.info={scale:sc,fs,lh,maxW,lines:L.lines.length,perLine:meas,hyph:L.lines.filter(l=>l.words.length&&/-$/.test(l.words[l.words.length-1].str)).length};
  S.specFs=fs;ttSync();
  if(s.tab!=='set'){clearTimeout(TT.t);TT.t=setTimeout(()=>TT.panel(),140);}
};
TT.hook=function(){if(TT.fid!==S.fontId)ttLoad();if(!TT.on||(S.cmp&&S.cmp.on)){const cv=$('#spec');if(cv&&cv.style.width)cv.style.width='';return false;}TT.draw();return true;};
/* ---------- растр строки ---------- */
function ttRaster(str,k,px,W,H,base){
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d',{willReadFrequently:true});
  const L=ttLayout(str,k,px,1e6,{tr:0,al:'left',hy:false});const sc=px/1000;
  c.fillStyle='#000';
  for(const wd of (L.lines[0]?L.lines[0].words:[]))for(const it of wd.chars){const g=ttGlyph(it.gn||it.ch,k);if(!g||!g.cs.length)continue;
    c.fill(pathOf(g.cs,(x,y)=>[2+wd.x+it.x+x*sc,base-y*sc]),'nonzero');}
  const d=c.getImageData(0,0,W,H).data,bits=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++)bits[i]=d[i*4+3]>=96?1:0;
  return bits;
}
function ttHas(str,k){for(const ch of str){const g=ttGlyph(ch,k);if(!g||!g.cs.length)return false;}return true;}
/* разность двух строк при кегле px: 1 − IoU по пикселям */
function ttDiff(a,b,k,px){
  px=px||12;let w=0;for(const ch of (a.length>b.length?a:b))w+=ttAdv(ch,k)*px/1000;
  const W=Math.ceil(w+6),H=Math.ceil(px*1.5),base=Math.round(px*1.05);
  const A=ttRaster(a,k,px,W,H,base),B=ttRaster(b,k,px,W,H,base);
  let i=0,u=0;for(let n=0;n<A.length;n++){if(A[n]&&B[n])i++;if(A[n]||B[n])u++;}
  return {diff:u?1-i/u:1,iou:u?i/u:0};
}
const ttScript=ch=>/[Ѐ-ӿ]/.test(ch)?'c':/[A-Za-z]/.test(ch)?'l':'o';
/* ---------- «Различимость» ---------- */
TT.dis=function(){
  const k=S.style,out=[];let bad=0,total=0;
  for(const set of TT_SETS){
    const pairs=[];
    for(let i=0;i<set.length;i++)for(let j=i+1;j<set.length;j++){
      const a=set[i],b=set[j];
      if(!ttHas(a,k)||!ttHas(b,k)){pairs.push({a,b,miss:true});continue;}
      const r=ttDiff(a,b,k,12);
      const homo=r.iou>0.999&&(ttScript(a[0])+ttScript(b[0])).split('').sort().join('')==='cl'&&a.length===1&&b.length===1;
      const isBad=!homo&&r.diff<TT.thr;
      if(!homo){total++;if(isBad)bad++;}
      pairs.push({a,b,diff:r.diff,bad:isBad,homo});
    }
    out.push({set,pairs});
  }
  TT.res.dis={sets:out,bad,total};return TT.res.dis;
};
function ttVerdictDis(r){
  const bp=[];r.sets.forEach(S2=>S2.pairs.forEach(p=>{if(p.bad)bp.push(p.a+'/'+p.b);}));
  if(!r.total)return 'В этом шрифте нет знаков для проверки.';
  if(!bp.length)return 'Различимость хорошая: все '+r.total+' пар отличаются заметно даже при 12 px.';
  return 'Внимание: '+bp.length+' из '+r.total+' пар слишком похожи при 12 px — '+bp.slice(0,8).join(', ')+(bp.length>8?'…':'')+'. В мелком тексте их легко спутать.';
}
function ttDrawDis(box){
  const r=TT.dis(),k=S.style;box.innerHTML='';
  const hd=document.createElement('div');hd.className='tt-head';
  hd.innerHTML='<p class="tt-verdict '+(r.bad?'bad':'ok')+'" id="tt-verdict"></p><label class="tt-f" title="Пара считается похожей, если растровые изображения различаются меньше, чем на этот процент"><span>Порог различия</span><span class="tt-in"><input type="range" id="tt-thr" min="2" max="40" step="1" aria-label="Порог различия"></span><output id="tt-thr-o"></output></label>';
  hd.querySelector('.tt-verdict').textContent=ttVerdictDis(r);
  box.appendChild(hd);
  const th=hd.querySelector('#tt-thr');th.value=Math.round(TT.thr*100);hd.querySelector('#tt-thr-o').textContent=Math.round(TT.thr*100)+' %';
  th.addEventListener('input',()=>{TT.thr=+th.value/100;ttDrawDis(box);});
  const grid=document.createElement('div');grid.className='tt-dgrid';box.appendChild(grid);
  for(const st of r.sets){
    const card=document.createElement('div');card.className='tt-dcard';
    const cvw=document.createElement('canvas');cvw.className='tt-dcv';
    card.appendChild(cvw);
    const row=document.createElement('div');row.className='tt-pairs';
    for(const p of st.pairs){
      const e=document.createElement('span');e.className='tt-pair'+(p.bad?' bad':'')+(p.homo?' homo':'')+(p.miss?' miss':'');
      e.dataset.pair=p.a+'/'+p.b;
      e.title=p.miss?'Нет в этом шрифте':p.homo?'Один и тот же знак по задумке (латиница и кириллица)':p.bad?'Слишком похожи: различие '+Math.round(p.diff*100)+' %':'Различимы: различие '+Math.round(p.diff*100)+' %';
      e.textContent=p.a+' / '+p.b+(p.miss?' —':p.homo?' =':' '+Math.round(p.diff*100)+' %');
      row.appendChild(e);}
    card.appendChild(row);grid.appendChild(card);
    /* холст: каждый элемент набора крупно и мелко */
    const big=44,small=12,gap=18;let wbig=0;
    const items=st.set.map(it=>{let w=0;for(const ch of it)w+=ttAdv(ch,k);return {it,wb:w*big/1000,ws:w*small/1000};});
    items.forEach(x=>wbig+=Math.max(x.wb,x.ws)+gap);
    const W=Math.ceil(Math.max(120,wbig+8)),H=86;cvw.style.width=W+'px';cvw.style.height=H+'px';
    const d=Math.min(window.devicePixelRatio||1,2);cvw.width=W*d;cvw.height=H*d;const c=cvw.getContext('2d');c.setTransform(d,0,0,d,0,0);
    const fg=css('--glyph');let x=4;
    for(const x2 of items){
      for(const [px,base] of [[big,52],[small,80]]){
        const L=ttLayout(x2.it,k,px,1e6,{tr:0,al:'left',hy:false});
        for(const wd of L.lines[0].words)for(const ch of wd.chars){const g=ttGlyph(ch.gn||ch.ch,k);if(!g||!g.cs.length)continue;c.fillStyle=fg;c.fill(pathOf(g.cs,(gx,gy)=>[x+wd.x+ch.x+gx*L.sc,base-gy*L.sc]),'nonzero');}}
      x+=Math.max(x2.wb,x2.ws)+gap;}
  }
};
/* ---------- «Цветность» ---------- */
TT.col=function(){
  const k=S.style,s=TT.s,px=16,sc=px/1000;
  const txt=(String(S.text||'').length>=250?String(S.text).replace(/\n+/g,' '):TT_GOGOL);
  const avg=ttAvg(k)*px/1000+s.tr/1000*px,maxW=Math.round(Math.min(Math.max(avg*s.cols,200),900));
  const L=ttLayout(txt,k,px,maxW,Object.assign({},s,{al:'justify',hy:true}));
  const lhp=Math.round(px*1.4),W=maxW+8,H=L.lines.length*lhp+12;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d',{willReadFrequently:true});
  c.fillStyle='#000';
  /* высота строчных по «х» */
  let xh=480;{const g=ttGlyph('х',k)||ttGlyph('x',k);if(g){let m=0;for(const q of g.cs)for(const n of q.nodes)if(n.y>m)m=n.y;if(m>200)xh=m;}}
  const xhp=Math.max(3,Math.round(xh*sc)),asc=Math.round(px*0.78),dsc=Math.round(px*0.22);
  const bases=[];let y=6;
  L.lines.forEach(line=>{const base=y+Math.round((lhp-px)/2+px*0.86);bases.push(base);
    for(const wd of line.words)for(const it of wd.chars){const g=ttGlyph(it.gn||it.ch,k);if(!g||!g.cs.length)continue;c.fill(pathOf(g.cs,(gx,gy)=>[4+wd.x+it.x+gx*sc,base-gy*sc]),'nonzero');}
    y+=lhp;});
  const img=c.getImageData(0,0,W,H).data,ink=(x,yy)=>img[(yy*W+x)*4+3]>=96?1:0;
  /* плотность строк (полоса x-высоты) и слов */
  const dens=[],words=[];
  L.lines.forEach((line,li)=>{
    const b=bases[li];let cnt=0;const x0=4,x1=4+maxW;
    for(let yy=b-xhp;yy<b;yy++)for(let x=x0;x<x1;x++)cnt+=ink(x,yy);
    if(!line.last&&line.words.length>1)dens.push(cnt/((x1-x0)*xhp));
    line.words.forEach((wd,wi)=>{
      const a=Math.floor(4+wd.x),z=Math.ceil(4+wd.x+wd.w);let n=0;
      for(let yy=b-xhp;yy<b;yy++)for(let x=a;x<z;x++)n+=ink(x,yy);
      const gapB=wi?(wd.x-(line.words[wi-1].x+line.words[wi-1].w)):0;
      words.push({str:wd.str,li,x:a,w:z-a,b,dens:n/(Math.max(1,z-a)*xhp),gap:gapB,idx:words.length});});
  });
  const mean=a=>a.length?a.reduce((p,q)=>p+q,0)/a.length:0,sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)*(v-m))));};
  const lineCV=dens.length>1?sd(dens)/(mean(dens)||1):0;
  const gaps=[];L.lines.forEach(l=>{if(!l.last&&l.words.length>1)for(let i=1;i<l.words.length;i++)gaps.push(l.words[i].x-(l.words[i-1].x+l.words[i-1].w));});
  const nominal=L.spw,gapCV=gaps.length>1?sd(gaps)/(mean(gaps)||1):0;
  const gapDev=gaps.length?mean(gaps.map(g=>Math.abs(g-nominal)/nominal)):0;
  /* «реки»: вертикальные белые просветы шире 0,22 кегля, идущие через 3 и более строки подряд */
  const minRun=Math.max(4,Math.round(Math.max(px*0.22,nominal*0.95))),runs=[];
  L.lines.forEach((line,li)=>{
    const b=bases[li],rs=[];let st=-1;
    for(let x=4;x<=4+maxW;x++){
      let white=x<4+maxW;
      if(white)for(let yy=b-asc;yy<=b+dsc&&white;yy++)if(ink(x,yy))white=false;
      if(white){if(st<0)st=x;}else if(st>=0){if(x-st>=minRun&&st>6&&x<4+maxW-2)rs.push([st,x]);st=-1;}}
    runs.push(rs);});
  const rivers=[],badL=new Set();
  for(let li=0;li<runs.length;li++){
    for(const r of runs[li]){
      let len=1;
      if(li&&!L.lines[li-1].last){for(const q of runs[li-1]){const ov=Math.min(q[1],r[1])-Math.max(q[0],r[0]);if(ov>=Math.min(q[1]-q[0],r[1]-r[0])*0.5){len=(q.len||1)+1;break;}}}
      r.len=len;if(len>=3){rivers.push({li,len});for(let t=0;t<len;t++)badL.add(li-t);}}}
  const riverFrac=L.lines.length?badL.size/L.lines.length:0;
  const raw=3*lineCV+0.35*gapCV+0.4*gapDev+1.2*riverFrac;
  const score=Math.max(0,Math.min(1,1-raw));
  /* худшие слова: отклонение плотности и пробела перед словом */
  const md=mean(words.map(w=>w.dens))||1;
  words.forEach(w=>{w.bad=0.6*Math.abs(w.dens/md-1)+0.4*(w.gap?Math.min(1.5,Math.abs(w.gap-nominal)/nominal):0);});
  const worst=words.filter(w=>/[\p{L}\p{N}]{2,}/u.test(w.str)).sort((a,b)=>b.bad-a.bad).slice(0,6).map(w=>w.idx);
  TT.res.col={score,lineCV,gapCV,gapDev,riverFrac,rivers:rivers.length,lines:L.lines.length,words,worst,W,H,bases,maxW,px,lhp,img:cv};
  return TT.res.col;
};
function ttVerdictCol(r){
  const s=r.score;
  let t=s>=0.75?'Цветность ровная: текстовое пятно серое и спокойное.':s>=0.5?'Цветность приемлемая, но в пятне есть заметные светлые и тёмные места.':'Цветность неровная: пятно «рябит» — есть слишком тёмные или светлые строки и слова.';
  if(r.riverFrac>0.12)t+=' Видны «реки» — белые просветы, идущие через несколько строк: уменьшите межсловный пробел или расширьте формат.';
  else if(r.gapDev>0.45)t+=' Межсловные пробелы сильно растягиваются: расширьте формат.';
  return t;
}
function ttDrawCol(box){
  const r=TT.col();box.innerHTML='';
  const hd=document.createElement('div');hd.className='tt-head';
  hd.innerHTML='<p class="tt-verdict '+(r.score>=0.5?'ok':'bad')+'" id="tt-verdict"></p><div class="tt-score" title="Оценка равномерности серого пятна: 1 — идеально ровное"><b id="tt-col-score"></b><span>из 1</span></div>';
  hd.querySelector('.tt-verdict').textContent=ttVerdictCol(r);
  hd.querySelector('#tt-col-score').textContent=r.score.toFixed(2).replace('.',',');
  box.appendChild(hd);
  const meta=document.createElement('p');meta.className='tt-note';
  meta.textContent='Абзац по формату, 12 pt, '+r.lines+' строк. Разброс плотности строк '+(r.lineCV*100).toFixed(1).replace('.',',')+' %, «реки»: '+r.rivers+'.';
  box.appendChild(meta);
  /* тепловая полоса: по ячейке на слово */
  const strip=document.createElement('canvas');strip.className='tt-strip';strip.id='tt-strip';
  const SW=Math.max(240,Math.min(900,(box.clientWidth||600)-8)),SH=22;
  const d=Math.min(window.devicePixelRatio||1,2);strip.width=SW*d;strip.height=SH*d;strip.style.width=SW+'px';strip.style.height=SH+'px';
  const sc=strip.getContext('2d');sc.setTransform(d,0,0,d,0,0);
  const acc=css('--accent');
  const mb=Math.max(0.01,...r.words.map(w=>w.bad));
  const cw=SW/r.words.length;
  r.words.forEach((w,i)=>{const t=Math.min(1,w.bad/mb);sc.globalAlpha=0.12+0.88*t;sc.fillStyle=acc;sc.fillRect(i*cw,0,Math.max(1,cw-0.5),SH);});
  sc.globalAlpha=1;sc.strokeStyle=css('--glyph');sc.lineWidth=2;
  r.worst.forEach(i=>sc.strokeRect(i*cw,1,Math.max(2,cw),SH-2));
  box.appendChild(strip);
  /* абзац с отмеченными словами */
  const cv=document.createElement('canvas');cv.className='tt-para';cv.id='tt-para';
  cv.width=r.W*d;cv.height=r.H*d;cv.style.width=r.W+'px';cv.style.height=r.H+'px';
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);
  c.fillStyle='#fff';c.fillRect(0,0,r.W,r.H);
  c.globalAlpha=0.55;c.drawImage(r.img,0,0);c.globalAlpha=1;
  const bh=Math.round(r.px*1.2),bt=Math.round(r.px*0.95);
  r.words.forEach(w=>{const t=Math.min(1,w.bad/mb);c.fillStyle='rgba(252,71,60,'+(0.05+0.4*t).toFixed(2)+')';c.fillRect(w.x,w.b-bt,w.w,bh);});
  c.strokeStyle=dsColor('accent');c.lineWidth=1.5;
  r.worst.forEach(i=>{const w=r.words[i];c.strokeRect(w.x-1,w.b-bt,w.w+2,bh);});
  const wrap=document.createElement('div');wrap.className='tt-parawrap';wrap.appendChild(cv);box.appendChild(wrap);
  const wl=document.createElement('p');wl.className='tt-note';wl.id='tt-worst';
  wl.textContent='Самые заметные слова: '+r.worst.map(i=>'«'+r.words[i].str.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'')+'»').join(', ')+'.';
  box.appendChild(wl);
}
/* ---------- «Водопад» ---------- */
function ttDrawWf(box){
  box.innerHTML='';const s=TT.s,k=S.style;
  let line=(String(S.text||'').split('\n').find(t=>t.trim())||'Съешь ещё этих мягких французских булок').trim();
  if(line.length>48){line=line.slice(0,48);const i=line.lastIndexOf(' ');if(i>20)line=line.slice(0,i);}
  const wrap=document.createElement('div');wrap.className='tt-wf';box.appendChild(wrap);
  const P=ttPaper(),W=Math.max(240,(box.clientWidth||600)-8);
  for(const pt of TT_WF){
    const fs=pt*TT_PT_PX,lh=Math.ceil(fs*Math.max(1.05,s.lh/100));
    const row=document.createElement('div');row.className='tt-wf-row';row.dataset.pt=pt;
    const lab=document.createElement('span');lab.className='tt-wf-l';lab.textContent=pt+' pt';
    const cv=document.createElement('canvas');cv.className='tt-wf-cv';
    const cw=Math.max(120,W-64);cv.style.width=cw+'px';cv.style.height=lh+'px';
    const d=Math.min(window.devicePixelRatio||1,2);cv.width=cw*d;cv.height=lh*d;
    const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.fillStyle=P.bg;c.fillRect(0,0,cw,lh);
    const L=ttLayout(line,k,fs,1e6,{tr:s.tr,al:'left',hy:false});
    ttDrawLines(c,{lines:[L.lines[0]],sc:L.sc},k,fs,lh,8,0,P.fg);
    row.appendChild(lab);row.appendChild(cv);wrap.appendChild(row);
  }
}
/* ---------- панель режимов ---------- */
TT.panel=function(){
  const box=$('#ttout');if(!box||!TT.on||TT.s.tab==='set')return;
  try{
    if(TT.s.tab==='dis')ttDrawDis(box);else if(TT.s.tab==='col')ttDrawCol(box);else if(TT.s.tab==='wf')ttDrawWf(box);
  }catch(e){console.error(e);box.textContent='Не удалось открыть тестер. Перезагрузите страницу и попробуйте снова';}
};
/* ---------- интерфейс ---------- */
const TT_TIPS={
  pt:'Кегль — размер шрифта. Пункт Adobe = 1/72 дюйма = 0,3528 мм.',
  lh:'Интерлиньяж — расстояние между базовыми линиями соседних строк. Обычно 120–140 % кегля.',
  tr:'Трекинг — одинаковое изменение промежутков между всеми буквами, в тысячных долях кегля. Если его увеличивают намеренно, чтобы выделить слово, это называется «разрядка».',
  al:'Выключка — как строки выровнены в колонке. «По формату» растягивает пробелы так, чтобы обе кромки были ровными.',
  hy:'Переносы по слогам уменьшают растяжение пробелов в тексте «по формату».',
  cols:'Формат набора — ширина колонки в знаках. Для чтения лучше всего 60–70 знаков в строке, допустимо 45–75.',
  paper:'Бумага — светлый или тёмный фон образца.'
};
function ttBuild(){
  const row=$('.chiprow'),tools=$('.spectools');if(!row||!tools||$('#tt-on'))return;
  const chip=document.createElement('button');chip.className='chip';chip.type='button';chip.id='tt-on';chip.textContent='Тестер';
  chip.title='Профессиональный набор: кегль в пунктах, интерлиньяж, трекинг, выключка, формат, различимость, цветность, водопад';
  row.insertBefore(chip,row.firstChild);
  const bar=document.createElement('div');bar.className='tt-bar';bar.id='ttbar';bar.hidden=true;
  const seg=(id,lab,items,tip,df)=>'<div class="tt-f" data-for="'+(df||'set')+'" title="'+tip+'"><span>'+lab+'</span><div class="seg" id="'+id+'" role="group" aria-label="'+lab+'">'+items.map(i=>'<button type="button" data-v="'+i[0]+'" title="'+i[2]+'">'+i[1]+'</button>').join('')+'</div></div>';
  bar.innerHTML=
   '<div class="seg tt-tabs" id="tt-tabs" role="group" aria-label="Режим тестера">'+
     [['set','Набор','Образец с настройками набора'],['dis','Различимость','Часто путаемые знаки рядом: I l 1 |, О 0, З 3 Э …'],['col','Цветность','Равномерность серого пятна и «реки» в тексте по формату'],['wf','Водопад','Одна строка во всех размерах от 8 до 72 pt']].map(t=>'<button type="button" data-tab="'+t[0]+'" title="'+t[2]+'">'+t[1]+'</button>').join('')+'</div>'+
   '<div class="tt-grid" id="tt-grid">'+
    '<label class="tt-f" data-for="set" title="'+TT_TIPS.pt+'"><span>Кегль</span><span class="tt-in"><input type="range" id="tt-pt" min="6" max="144" step="0.5" aria-label="Кегль, пункты"><input type="number" id="tt-ptn" min="6" max="144" step="0.5" aria-label="Кегль в пунктах"></span><output id="tt-pt-o"></output></label>'+
    '<label class="tt-f" data-for="set wf" title="'+TT_TIPS.lh+'"><span>Интерлиньяж</span><span class="tt-in"><input type="range" id="tt-lh" min="80" max="220" step="1" aria-label="Интерлиньяж, проценты"><input type="number" id="tt-lhn" min="4" max="400" step="0.5" aria-label="Интерлиньяж в пунктах"></span><output id="tt-lh-o"></output></label>'+
    '<label class="tt-f" data-for="set wf col" title="'+TT_TIPS.tr+'"><span>Трекинг</span><span class="tt-in"><input type="range" id="tt-tr" min="-100" max="400" step="5" aria-label="Трекинг, тысячные кегля"></span><output id="tt-tr-o"></output></label>'+
    '<label class="tt-f" data-for="set col" title="'+TT_TIPS.cols+'"><span>Формат</span><span class="tt-in"><input type="range" id="tt-cols" min="20" max="100" step="1" aria-label="Формат, знаков в строке"></span><output id="tt-cols-o"></output></label>'+
    seg('tt-al','Выключка',[['left','Влево','Влево'],['center','По центру','По центру'],['right','Вправо','Вправо'],['justify','По формату','По формату']],TT_TIPS.al)+
    '<div class="tt-f" data-for="set" title="'+TT_TIPS.hy+'"><span>Переносы</span><button class="chip" type="button" id="tt-hy" aria-pressed="false">Переносы</button></div>'+
    seg('tt-paper','Бумага',[['light','Светлая','Светлая бумага'],['dark','Тёмная','Тёмная бумага']],TT_TIPS.paper,'set wf')+
    '<label class="tt-f" data-for="set wf col" title="Готовые тексты: панграммы, абзац, типографика"><span>Текст</span><select id="tt-pre" aria-label="Готовый текст"><option value="">Выбрать…</option>'+
      TT_PRESETS.map((g,gi)=>'<optgroup label="'+g[0]+'">'+g[1].map((it,ii)=>'<option value="'+gi+'.'+ii+'">'+it[0]+'</option>').join('')+'</optgroup>').join('')+'</select></label>'+
   '</div>';
  tools.appendChild(bar);
  const out=document.createElement('div');out.className='tt-out';out.id='ttout';out.hidden=true;tools.appendChild(out);
  TT.ui=true;
  const upd=fn=>{fn();ttSave();ttSync();schedule();clearTimeout(TT.t);TT.t=setTimeout(()=>TT.panel(),0);};
  chip.addEventListener('click',()=>upd(()=>{TT.s.on=!TT.s.on;TT.on=TT.s.on;}));
  $('#tt-tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)upd(()=>{TT.s.tab=b.dataset.tab;});});
  const ptSet=v=>{v=Math.min(144,Math.max(6,+v||24));TT.s.pt=Math.round(v*2)/2;S.specSize=Math.round(TT.s.pt*TT_PT_PX);};
  $('#tt-pt').addEventListener('input',e=>upd(()=>ptSet(e.target.value)));
  $('#tt-ptn').addEventListener('change',e=>upd(()=>ptSet(e.target.value)));
  $('#tt-lh').addEventListener('input',e=>upd(()=>{TT.s.lh=+e.target.value;}));
  $('#tt-lhn').addEventListener('change',e=>upd(()=>{const v=+e.target.value;if(v>0)TT.s.lh=Math.min(220,Math.max(80,Math.round(v/TT.s.pt*100)));}));
  $('#tt-tr').addEventListener('input',e=>upd(()=>{TT.s.tr=+e.target.value;}));
  $('#tt-cols').addEventListener('input',e=>upd(()=>{TT.s.cols=+e.target.value;}));
  $('#tt-al').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)upd(()=>{TT.s.al=b.dataset.v;});});
  $('#tt-paper').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)upd(()=>{TT.s.paper=b.dataset.v;});});
  $('#tt-hy').addEventListener('click',()=>upd(()=>{TT.s.hy=!TT.s.hy;}));
  $('#tt-pre').addEventListener('change',e=>{const v=e.target.value;if(!v)return;const [g,i]=v.split('.').map(Number);
    S.ctx=false;S.text=TT_PRESETS[g][1][i][1];const t=$('#txt');if(t)t.value=S.text;autosizeTxt();persist();e.target.value='';upd(()=>{});});
  ttSync();
}
function ttSync(){
  const s=TT.s;if(!s||!$('#ttbar'))return;
  const pt=s.pt,px=pt*TT_PT_PX,mm=pt*TT_PT_MM,lhpt=pt*s.lh/100,f1=v=>(Math.round(v*10)/10).toString().replace('.',',');
  $('#tt-on').classList.toggle('on',TT.on);$('#tt-on').setAttribute('aria-pressed',TT.on?'true':'false');
  const sw=$('#specwrap');sw.classList.toggle('tt-on',TT.on);
  $('#ttbar').hidden=!TT.on;$('#ttout').hidden=!(TT.on&&s.tab!=='set');
  sw.classList.toggle('tt-alt',TT.on&&s.tab!=='set');
  $$('#tt-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===s.tab));
  $('#tt-grid').hidden=s.tab==='dis';$$('#tt-grid .tt-f').forEach(e=>{e.hidden=!(e.dataset.for||'set').split(' ').includes(s.tab);});
  $('#tt-pt').value=pt;$('#tt-ptn').value=pt;$('#tt-pt-o').textContent=f1(pt)+' pt = '+f1(mm)+' мм = '+Math.round(px)+' px';
  $('#tt-lh').value=s.lh;$('#tt-lhn').value=Math.round(lhpt*2)/2;$('#tt-lh-o').textContent=f1(lhpt)+' pt = '+s.lh+' %';
  $('#tt-tr').value=s.tr;$('#tt-tr-o').textContent=(s.tr>0?'+':'')+s.tr+' / 1000 em';
  $('#tt-cols').value=s.cols;$('#tt-cols-o').textContent=s.cols+'\u00a0зн.'+(s.cols>=60&&s.cols<=70?' · оптимум':s.cols<45||s.cols>75?' · вне\u00a045–75':'')+(TT.on&&s.tab==='set'&&TT.info.scale<0.995?' · масштаб\u00a0'+Math.round(TT.info.scale*100)+'\u00a0%':'');
  $$('#tt-al button').forEach(b=>b.classList.toggle('on',b.dataset.v===s.al));
  $$('#tt-paper button').forEach(b=>b.classList.toggle('on',b.dataset.v===s.paper));
  const hy=$('#tt-hy');hy.classList.toggle('on',s.hy);hy.setAttribute('aria-pressed',s.hy?'true':'false');
  hy.disabled=s.al!=='justify';hy.title=s.al==='justify'?TT_TIPS.hy:'Переносы нужны для выключки «По формату»';
}
function ttInit(){ttBuild();ttLoad();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ttInit);else ttInit();
