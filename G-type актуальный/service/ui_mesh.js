/* ===== Мягкие пятна меш-градиента (Stage 4A): растр вместо живого filter:blur(30px) =====
   Было: четыре круга .hm-mesh>.l2 i с filter:blur(30px), внутри слоя с filter:blur(8px), оба слоя двигаются (transform) — браузер пересчитывал размытие
   на каждом кадре (главная: 5-8 к/с в headless). Стало: размытое пятно один раз рисуется в маленький холст (1/K размера, гауссово размытие тремя
   проходами box-blur, sigma = 30 px как у CSS blur(30px)), кладётся фоном ::before (inset -3 sigma) вокруг эллипса; сам элемент остаётся прежним боксом; анимируется только transform.
   Цвет — из --bc (--m1..--m4, свой в светлой и тёмной теме); при смене темы и размера пятна рисуются заново. Без этого модуля (или пока пятно не готово)
   остаётся прежний CSS: класс .mk включает растр. Те же пятна в обложке профиля (ui_prof_a coverHTML): их ловит MutationObserver на #view-profile. */
(function(){
  const SIG=30,M=SIG*3,K=4;
  const rgbOf=(()=>{let c;return s=>{c=c||document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,1,1);x.fillStyle='#000';x.fillStyle=s;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]];};})();
  function boxes(sg,n){const w=Math.sqrt(12*sg*sg/n+1);let wl=Math.floor(w);if(wl%2===0)wl--;const wu=wl+2,m=Math.round((12*sg*sg-n*wl*wl-4*n*wl-3*n)/(-4*wl-4)),r=[];for(let i=0;i<n;i++)r.push(i<m?wl:wu);return r;}
  function boxH(a,b,w,h,r){const iar=1/(r+r+1);for(let y=0;y<h;y++){let o=y*w,ti=o,li=o,fv=a[o],lv=a[o+w-1],val=(r+1)*fv;for(let j=0;j<r;j++)val+=a[o+Math.min(j,w-1)];
    for(let x=0;x<w;x++){const add=x+r<w?a[o+x+r]:lv,sub=x-r-1>=0?a[o+x-r-1]:fv;val+=add-sub;b[o+x]=val*iar;}}}
  function boxV(a,b,w,h,r){const iar=1/(r+r+1);for(let x=0;x<w;x++){let fv=a[x],lv=a[x+(h-1)*w],val=(r+1)*fv;for(let j=0;j<r;j++)val+=a[x+Math.min(j,h-1)*w];
    for(let y=0;y<h;y++){const add=y+r<h?a[x+(y+r)*w]:lv,sub=y-r-1>=0?a[x+(y-r-1)*w]:fv;val+=add-sub;b[x+y*w]=val*iar;}}}
  function blobURL(w,h,rgb){
    const cw=Math.max(4,Math.ceil((w+2*M)/K)),ch=Math.max(4,Math.ceil((h+2*M)/K)),c=document.createElement('canvas');c.width=cw;c.height=ch;
    const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.beginPath();x.ellipse(cw/2,ch/2,w/2/K,h/2/K,0,0,Math.PI*2);x.fill();
    const src=x.getImageData(0,0,cw,ch),n=cw*ch;let a=new Float32Array(n),b=new Float32Array(n);for(let i=0;i<n;i++)a[i]=src.data[i*4+3];
    for(const bw of boxes(SIG/K,3)){const r=(bw-1)/2;boxH(a,b,cw,ch,r);boxV(b,a,cw,ch,r);}
    for(let i=0;i<n;i++){const o=i*4;src.data[o]=rgb[0];src.data[o+1]=rgb[1];src.data[o+2]=rgb[2];src.data[o+3]=Math.round(a[i]);}
    x.putImageData(src,0,0);return c.toDataURL('image/png');
  }
  function paint(el){
    const mk=el.classList.contains('mk'),w=el.offsetWidth,h=el.offsetHeight;if(!w||!h)return;
    const col=getComputedStyle(el).getPropertyValue('--bc').trim()||getComputedStyle(el).backgroundColor,key=w+'x'+h+'|'+col;
    if(el.dataset.mk===key)return;
    el.style.setProperty('--mkb','url('+blobURL(w,h,rgbOf(col))+')');el.dataset.mk=key;
    if(!mk){el.classList.add('mk');}
  }
  /* одно пятно за кадр (около 5-30 мс каждое), перерисовка после изменения размера — с задержкой 120 мс, чтобы не пересчитывать на каждый пиксель */
  let raf=0,tm=0,q=[];
  function step(){raf=0;const el=q.shift();if(el){try{paint(el);}catch(e){}}if(q.length)raf=requestAnimationFrame(step);}
  function run(){tm=0;q=[...document.querySelectorAll('.hm-mesh>.l2 i')];if(!raf)raf=requestAnimationFrame(step);}
  function scan(){if(tm)clearTimeout(tm);tm=setTimeout(run,first?0:120);first=false;}
  let first=true;
  const ro=typeof ResizeObserver==='function'?new ResizeObserver(scan):null,seen=new WeakSet();
  function watch(){document.querySelectorAll('.hm-mesh').forEach(m=>{if(!seen.has(m)){seen.add(m);if(ro)ro.observe(m);}});scan();}
  function init(){
    watch();
    new MutationObserver(scan).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    const pv=document.getElementById('view-profile');if(pv)new MutationObserver(watch).observe(pv,{childList:true,subtree:true});
    window.addEventListener('resize',scan);
  }
  window.MESH={scan,watch,paint};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
