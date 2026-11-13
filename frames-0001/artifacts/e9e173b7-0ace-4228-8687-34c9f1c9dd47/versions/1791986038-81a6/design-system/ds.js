(()=>{
const D=window.DS_DATA,$=s=>document.querySelector(s),root=document.documentElement;
try{const q=$('#ds-qr');if(q&&window.qrSvg)q.innerHTML=qrSvg('https://podhvat.example/c/0241',{label:'QR-код карточки'})+'<small>podhvat.example/c/0241</small>'}catch(e){}
const hex=c=>{c=c.trim();if(c[0]==='#'){if(c.length===4)c='#'+[...c.slice(1)].map(x=>x+x).join('');return c}const m=c.match(/\d+/g);return '#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('')};
const lum=h=>{const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const cv=n=>hex(getComputedStyle(document.body).getPropertyValue(n)||getComputedStyle(root).getPropertyValue(n));
const sw=(el,list)=>{$(el).innerHTML=list.map(([v,name,use])=>`<div class="sw"><i style="background:var(${v})"></i><div><b>${name}</b><code>${v}</code> <em class="val" data-v="${v}"></em><br><em>${use}</em></div></div>`).join('')};
sw('#sw-semantic',[['--app-bg','Фон','Страница'],['--card-bg','Карточка','Непрозрачная поверхность'],['--app-text','Текст','Основной'],['--secondary','Вторичный текст','Подписи, пояснения'],['--secondary-bg','Нейтральная плашка','Вторичные кнопки, уведомления'],['--field-fill','Заливка поля','Поля без обводки'],['--error-text','Ошибка','Текст ошибки']]);
sw('#sw-brand',[['--ink','Ink','Основная кнопка, текст'],['--paper','Paper','Фон светлой темы'],['--lime','Lime','Главное действие'],['--limeStrong','Lime strong','Нажатое состояние'],['--air','Air','Фон главной и случая'],['--airDark','Air dark','Карточки на air'],['--airSurface','Air surface','Светлая air-плашка']]);
sw('#sw-status',[['--success','Success','Идёт, готово'],['--warning','Warning','Нужно внимание'],['--danger','Danger','Срочно, ошибка'],['--info','Info','Фокус, ссылки']]);
const pairs=[['Текст на фоне','--app-text','--app-bg'],['Текст на карточке','--app-text','--card-bg'],['Вторичный текст на фоне','--secondary','--app-bg'],['Вторичный текст на карточке','--secondary','--card-bg'],['Ink на лайме (кнопка)','--ink','--lime'],['Lime на ink (активный тег)','--lime','--ink'],['Ошибка на карточке','--error-text','--card-bg'],['Заливка поля на карточке','--field-fill','--card-bg']];
const css=n=>cv(n);
function paint(){
  document.querySelectorAll('.val').forEach(e=>{try{e.textContent=cv(e.dataset.v)}catch{}});
  $('#contrast tbody').innerHTML=pairs.map(([n,a,b])=>{const A=css(a),B=css(b),r=ratio(A,B),ui=n.includes('Граница');const need=ui?3:4.5;return `<tr><td>${n}</td><td><code>${A} на ${B}</code></td><td>${r.toFixed(2)} : 1</td><td class="${r>=need?'ok':'bad'}">${r>=need?'✓ ≥ '+need:'ниже '+need}</td></tr>`}).join('');
}
const scale=[['Display','34 / 38 · 400','Подхватим вместе','font-size:34px;line-height:38px;letter-spacing:-.8px;font-weight:400'],['Heading','30 / 34 · 400','Что произошло дальше?','font-size:30px;line-height:34px;letter-spacing:-.7px;font-weight:400'],['Title','18 / 24 · 600','Найти помощника','font-size:18px;line-height:24px;font-weight:600'],['Body large','16 / 24 · 400','Поля формы, длинные абзацы','font-size:16px;line-height:24px'],['Body','15 / 22 · 400','Если вы встретили животное, начнём с безопасности.','font-size:15px;line-height:22px'],['Label','14 / 20 · 600','Продолжить','font-size:14px;line-height:20px;font-weight:600'],['Caption','12 / 18 · 400','Городской парк · #0241','font-size:12px;line-height:18px;color:var(--secondary)'],['Micro','10 / 14 · 400','Главная · Рядом · Случай · Связь','font-size:10px;line-height:14px;color:var(--secondary)']];
$('#type-scale').innerHTML=scale.map(([n,m,t,s])=>`<div style="display:grid;grid-template-columns:130px 1fr;gap:16px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--app-border,#e7eae6)"><div style="font-size:13px"><b>${n}</b><br><code>${m}</code></div><div style="${s}">${t}</div></div>`).join('');
$('#icon-grid').innerHTML=D.icons.map(n=>`<div><span class="ds-ico" style="--m:url(../assets/flaticon/${n}.svg)"></span>${n}</div>`).join('');
let theme='light';
function gallery(){$('#gallery').innerHTML=D.screens.map(s=>`<figure><img loading="lazy" src="screens/${s.id}-${theme}.webp" alt="${s.name}"><figcaption><b>${s.name}</b><code>${s.id}</code></figcaption></figure>`).join('')}
function setTheme(t){theme=t;document.body.classList.toggle('dark',t==='dark');$('#theme').textContent=t==='dark'?'Светлая тема':'Тёмная тема';$('#theme').setAttribute('aria-pressed',t==='dark');paint();gallery();try{localStorage.setItem('ds-theme',t)}catch{}}
$('#theme').onclick=()=>setTheme(theme==='dark'?'light':'dark');
$('#motion').onclick=function(){const on=!document.body.classList.contains('reduce-motion');document.body.classList.toggle('reduce-motion',on);this.setAttribute('aria-pressed',on)};
const demo=$('#demo-fade');const press=()=>{if(document.body.classList.contains('reduce-motion'))return;demo.animate([{transform:'scale(1)'},{transform:'scale(.92)'},{transform:'scale(1)'}],{duration:240,easing:'cubic-bezier(.22,.7,.2,1)'})};demo.onclick=press;demo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();press()}};
let saved='light';try{saved=localStorage.getItem('ds-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch{}
setTheme(saved);
const links=[...document.querySelectorAll('.ds-nav a')];const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('on',a.hash==='#'+e.target.id))}),{rootMargin:'-40% 0px -55% 0px'});document.querySelectorAll('main section').forEach(s=>io.observe(s));
})();
