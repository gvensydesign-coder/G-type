/* HM: главная — фоновая лента образцов шрифтов (canvas из тех же контуров, что и обложки). */
const HM_WORDS=['Шрифт','Буквы','Type','Знаки','Слово','Ритм','Форма','Линия','Строка','Вес'];
let HM_SIG='';
/* одна лента собирается по одному шрифту за задачу (не блокирует первый кадр), в простое и только пока открыта главная;
   готовая лента появляется плавно (#hm-bg.on). Холсты строятся в памяти и вставляются разом: сдвиг на −50 % остаётся бесшовным. */
function hmFont(id,word,H,dpr){
  useFont(id);
  const run=libRun(id,word);if(!run.items.length)return null;
  const cap=H*0.5,sc=cap/run.cap,w=Math.ceil(run.tot*sc+H*0.6);
  const cv=document.createElement('canvas');cv.width=Math.round(w*dpr);cv.height=Math.round(H*dpr);cv.style.width=w+'px';cv.style.height=H+'px';
  const c=cv.getContext('2d');c.scale(dpr,dpr);c.fillStyle='#000';const base=H*0.5+cap*0.5;
  for(const [g,xx] of run.items)c.fill(pathOf(g.cs,(px,py)=>[H*0.3+xx*sc+px*sc,base-py*sc]),'nonzero');
  return cv;
}
function hmFill(box,parts){
  box.textContent='';
  parts.forEach(cv=>box.appendChild(cv));
  parts.forEach(cv=>{const d=document.createElement('canvas');d.width=cv.width;d.height=cv.height;d.style.width=cv.style.width;d.style.height=cv.style.height;d.getContext('2d').drawImage(cv,0,0);box.appendChild(d);});
}
const HM_JOB={n:0,q:null,H:0,rows:null,parts:null};
const hmHome=()=>S.tab==='home'||S.tab==='lib';
function hmStep(){
  const J=HM_JOB;J.tid=0;if(!J.q||!J.q.length||!hmHome())return;
  const n=J.n,back=S.fontId,dpr=Math.min(window.devicePixelRatio||1,1.5);
  try{const t=J.q.shift();const cv=hmFont(t.id,t.word,J.H,dpr);if(cv)J.parts[t.row].push(cv);}
  catch(e){console.error(e);}
  finally{try{useFont(back);}catch(e){}}
  if(n!==J.n)return;
  if(J.q.length){hmSched();return;}
  const bg=document.getElementById('hm-bg');if(!bg)return;
  for(const k of ['a','b']){const b=bg.querySelector('[data-row='+k+']');if(b)hmFill(b,J.parts[k]);}
  J.q=null;requestAnimationFrame(()=>bg.classList.add('on'));
}
function hmSched(){const J=HM_JOB;if(J.tid)return;
  const go=()=>hmStep();
  J.tid=window.requestIdleCallback?requestIdleCallback(go,{timeout:600}):setTimeout(go,30);}
/* вернулись на главную: продолжить прерванную сборку */
function hmResume(){if(HM_JOB.q&&HM_JOB.q.length)hmSched();}
function hmHero(){
  const bg=document.getElementById('hm-bg');if(!bg)return;
  const ids=libIds().filter(id=>id!=='imp'),sig=ids.join(',');if(sig===HM_SIG)return;HM_SIG=sig;
  const J=HM_JOB;J.n++;J.tid=0;bg.classList.remove('on');
  J.H=Math.round(Math.min(190,Math.max(110,innerWidth*0.11)));
  const rot=ids.slice(3).concat(ids.slice(0,3));
  J.parts={a:[],b:[]};
  J.q=ids.map((id,k)=>({row:'a',id,word:fmeta(id).name})).concat(rot.map((id,k)=>({row:'b',id,word:HM_WORDS[k%HM_WORDS.length]})));
  hmSched();
}
