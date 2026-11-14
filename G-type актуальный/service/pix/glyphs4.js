/* character table, marks, composition, serif, cleanup, italic, edits */
function recipes4(PXE,G){
const {CL}=PXE;const {sub,mirrorBox,rot180,flipV,bbox}=G._h;
/* ---- marks ---- */
const MK={};
const mdims=K=>({mh:K.mh,mt:K.mt});
function put(B,x,y,w,v){B.rect(x,y,x+w,y+1,v==null?3:v);}
MK.acute=(K,B,cx,y,wm)=>{const {mh,mt}=K;for(let k=0;k<mh;k++)put(B,cx-Math.floor(mh/2)+k,y+k,mt);};
MK.grave=(K,B,cx,y,wm)=>{const {mh,mt}=K;for(let k=0;k<mh;k++)put(B,cx+Math.floor(mh/2)-k-mt+1,y+k,mt);};
MK.circumflex=(K,B,cx,y,wm)=>{const {mh,mt}=K;const w=wm;for(let k=0;k<mh;k++){const d=mh-1-k;put(B,cx-Math.floor(w/2)+Math.floor(w/2)-d-0,y+k,mt);}
  for(let k=0;k<mh;k++){const d=mh-1-k;put(B,cx+d+ (w%2?0:0),y+k,mt);}};
MK.caron=(K,B,cx,y,wm)=>{const {mh,mt}=K;for(let k=0;k<mh;k++){const d=k;put(B,cx-d,y+k,mt);put(B,cx+d,y+k,mt);}};
MK.macron=(K,B,cx,y,wm)=>{const w=Math.max(3,wm);B.rect(cx-Math.floor(w/2),y,cx-Math.floor(w/2)+w,y+Math.max(1,K.mt>1?2:1),3);};
MK.breve=(K,B,cx,y,wm)=>{const w=Math.max(4,wm),x0=cx-Math.floor(w/2),ew=Math.max(1,Math.min(K.sv>=2?2:1,Math.floor((w-1)/3))),bt=Math.max(1,K.mt),tot=K.H>=12?K.mh+1:K.mh;
  B.rect(x0,y,x0+w,y+bt,3);B.rect(x0,y,x0+ew,y+tot,3);B.rect(x0+w-ew,y,x0+w,y+tot,3);};
MK.tilde=(K,B,cx,y,wm)=>{const mt=K.mt,w=Math.max(4,wm);const x0=cx-Math.floor(w/2);for(let i=0;i<w;i+=1){const up=(i%2===1)?1:0;put(B,x0+i*1,y+(up?1:0),1);}if(mt>1){for(let i=0;i<w;i++){const up=(i%2===1)?1:0;put(B,x0+i,y+(up?1:0)+0,1);}}};
MK.diaeresis=(K,B,cx,y,wm)=>{const d=Math.max(1,K.sv>=3?2:1),g=Math.max(1,wm-2*d);const x0=cx-Math.floor((2*d+g)/2);B.rect(x0,y,x0+d,y+d,3);B.rect(x0+d+g,y,x0+2*d+g,y+d,3);};
MK.dot=(K,B,cx,y,wm)=>{const d=Math.max(1,K.sv>=3?2:(K.sv>=2?2:1));B.rect(cx-Math.floor(d/2),y,cx-Math.floor(d/2)+d,y+d,3);};
MK.ring=(K,B,cx,y,wm)=>{const x0=cx-1;B.rect(x0+1,y,x0+2,y+1,3);B.rect(x0,y+1,x0+1,y+2,3);B.rect(x0+2,y+1,x0+3,y+2,3);B.rect(x0+1,y+2,x0+2,y+3,3);};
MK.dblacute=(K,B,cx,y,wm)=>{MK.acute(K,B,cx-1-Math.floor(K.mt/2),y,wm);MK.acute(K,B,cx+1+K.mh-1,y,wm);};
MK.cedilla=(K,B,cx,y,wm)=>{B.rect(cx,-1,cx+K.mt,0,3);B.rect(cx-1,-2,cx+K.mt-1,-1,3);B.rect(cx,-2,cx+K.mt,-1,3);};
MK.ogonek=(K,B,cx,y,wm)=>{B.rect(cx,-1,cx+K.mt,0,3);B.rect(cx+K.mt,-2,cx+K.mt+1,-1,3);};
/* mark height rows (for ring 3) */
const mhOf=(K,kind)=>kind==='ring'?3:(kind==='dot'||kind==='diaeresis'?Math.max(1,K.sv>=2?2:1):(kind==='macron'?1:K.mh));
const mwOf=(K,kind)=>{const mh=K.mh;switch(kind){case'acute':case'grave':return mh+K.mt-1;case'circumflex':case'caron':return 2*(mh-1)+K.mt;case'macron':return 3+(K.sv>=3?1:0);
  case'breve':return 4;case'tilde':return 4;case'diaeresis':return 2*Math.max(1,K.sv>=3?2:1)+Math.max(1,Math.round(K.sv/2));case'dot':return 1;case'ring':return 3;default:return 3;}};
/* ---- character table ---- */
const T={};/* ch -> {r:recipeKey|fn, h:'cap'|'x', marks:[[kind,pos]], top:'cap'|'x'|'asc'} */
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for(const c of lat){T[c]={r:c,k:'cap'};}
for(const c of 'abcdefghijklmnopqrstuvwxyz'){T[c]={r:c,k:'xh'};}
for(const c of '0123456789')T[c]={r:c,k:'cap'};
/* Cyrillic twins */
const twins={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','І':'I','Ј':'J','Ѕ':'S','Ү':'Y','а':'a','с':'c','е':'e','о':'o','р':'p','у':'y','х':'x','і':'i','ј':'j','ѕ':'s','һ':'h','ү':'y'};
for(const c in twins)T[c]=T[twins[c]];
for(const c of 'БГДЖЗИЛПУФЦЧШЩЪЫЬЭЮЯЂЉЊЋЏҐҒҚҢӨҰҺӘЄ')T[c]={r:c,k:'cap'};
/* lowercase Cyrillic as small-capital forms at x-height: [recipe, widthKey] */
const low={'в':'B','г':'Г','д':'Д','ж':'Ж','з':'З','и':'И','к':'K','л':'Л','н':'H','п':'П','т':'T','ц':'Ц','ч':'Ч','ш':'Ш','щ':'Щ','ъ':'Ъ','ы':'Ы','ь':'Ь','э':'Э','ю':'Ю','я':'Я'};
for(const c in low)T[c]={r:low[c],k:'xh',small:1};
T['б']={r:'б',k:'xh'};T['ф']={r:'ф',k:'xh'};
T['ђ']={r:'ђ',k:'xh'};T['ћ']={r:'ћ',k:'xh'};T['љ']={r:'љ',k:'xh'};T['њ']={r:'њ',k:'xh'};T['џ']={r:'џ',k:'xh',small:1};
T['ғ']={r:'ғ',k:'xh'};T['қ']={r:'қ',k:'xh'};T['ң']={r:'ң',k:'xh'};T['ө']={r:'ө',k:'xh'};T['ұ']={r:'ұ',k:'xh'};T['ә']={r:'ә',k:'xh'};T['є']={r:'є',k:'xh'};T['ґ']={r:'ґ',k:'xh'};
T['ı']={r:'ı',k:'xh'};T['ß']={r:'ß',k:'cap'};T['Æ']={r:'Æ',k:'cap'};T['æ']={r:'æ',k:'xh'};T['Œ']={r:'Œ',k:'cap'};T['œ']={r:'œ',k:'xh'};
T['Ø']={r:'O',k:'cap',ov:'slash'};T['ø']={r:'o.w',k:'xh',ov:'slash'};T['Ł']={r:'L',k:'cap',ov:'lbar'};T['ł']={r:'l',k:'xh',ov:'lbar'};T['Đ']={r:'D',k:'cap',ov:'dbar'};T['đ']={r:'d',k:'xh',ov:'dbar'};
/* punctuation */
for(const c of '.,:;!?"\'-–—−()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…¡¿⁄ªº‹›·')T[c]={r:c,k:'cap',ns:1};
/* composites: [base, mark] ; position 'top' / 'bot' */
const CM=[
 ['À','A','grave'],['Á','A','acute'],['Â','A','circumflex'],['Ã','A','tilde'],['Ä','A','diaeresis'],['Å','A','ring'],['Ā','A','macron'],['Ă','A','breve'],['Ą','A','ogonek'],
 ['à','a','grave'],['á','a','acute'],['â','a','circumflex'],['ã','a','tilde'],['ä','a','diaeresis'],['å','a','ring'],['ā','a','macron'],['ă','a','breve'],['ą','a','ogonek'],
 ['Ç','C','cedilla'],['Ć','C','acute'],['Č','C','caron'],['ç','c','cedilla'],['ć','c','acute'],['č','c','caron'],
 ['Ď','D','caron'],['ď','d','tick'],['È','E','grave'],['É','E','acute'],['Ê','E','circumflex'],['Ë','E','diaeresis'],['Ē','E','macron'],['Ė','E','dot'],['Ě','E','caron'],['Ę','E','ogonek'],
 ['è','e','grave'],['é','e','acute'],['ê','e','circumflex'],['ë','e','diaeresis'],['ē','e','macron'],['ė','e','dot'],['ě','e','caron'],['ę','e','ogonek'],
 ['Ğ','G','breve'],['ğ','g','breve'],['Ì','I','grave'],['Í','I','acute'],['Î','I','circumflex'],['Ï','I','diaeresis'],['Ī','I','macron'],['İ','I','dot'],['Į','I','ogonek'],
 ['ì','ı','grave'],['í','ı','acute'],['î','ı','circumflex'],['ï','ı','diaeresis'],['ī','ı','macron'],['į','i','ogonek'],
 ['Ñ','N','tilde'],['Ń','N','acute'],['Ň','N','caron'],['ñ','n','tilde'],['ń','n','acute'],['ň','n','caron'],
 ['Ò','O','grave'],['Ó','O','acute'],['Ô','O','circumflex'],['Õ','O','tilde'],['Ö','O','diaeresis'],['Ō','O','macron'],['Ő','O','dblacute'],
 ['ò','o','grave'],['ó','o','acute'],['ô','o','circumflex'],['õ','o','tilde'],['ö','o','diaeresis'],['ō','o','macron'],['ő','o','dblacute'],
 ['Ř','R','caron'],['ř','r','caron'],['Ś','S','acute'],['Ş','S','cedilla'],['Š','S','caron'],['ś','s','acute'],['ş','s','cedilla'],['š','s','caron'],
 ['Ť','T','caron'],['ť','t','tick'],['Ù','U','grave'],['Ú','U','acute'],['Û','U','circumflex'],['Ü','U','diaeresis'],['Ū','U','macron'],['Ů','U','ring'],['Ű','U','dblacute'],
 ['ù','u','grave'],['ú','u','acute'],['û','u','circumflex'],['ü','u','diaeresis'],['ū','u','macron'],['ů','u','ring'],['ű','u','dblacute'],
 ['Ý','Y','acute'],['Ÿ','Y','diaeresis'],['ý','y','acute'],['ÿ','y','diaeresis'],['Ź','Z','acute'],['Ż','Z','dot'],['Ž','Z','caron'],['ź','z','acute'],['ż','z','dot'],['ž','z','caron'],
 ['Ё','Е','diaeresis'],['ё','е','diaeresis'],['Й','И','breve'],['й','и','breve'],['Ў','У','breve'],['ў','у','breve'],['Ї','І','diaeresis'],['ї','ı','diaeresis'],
 ['Ѓ','Г','acute'],['ѓ','г','acute'],['Ќ','К','acute'],['ќ','к','acute']];
for(const [c,b,m] of CM)T[c]={base:b,mark:m};
T['Ë']=T['Ё'];T['ë']=T['ё'];
/* ---- render one base recipe into a Bm ---- */
const HC=new Set(['3','?','¿','&','Æ','Đ','D','Ø','G']);
function drawBase(K,spec,B){
  let P=PXE.prims(K,B);const r=spec.r;
  /* тяжёлый вес на малой высоте: у сложных знаков горизонтали не толще (H-3)/4, иначе чаши и просветы схлопываются */
  if(HC.has(r)){const hc=Math.max(1,Math.floor((K.H-3)/4));if(K.sh>hc){const K2=Object.assign({},K,{sh:hc});K2.ym=Math.ceil((K.H-hc)/2);P=PXE.prims(K2,B);}}
  if(spec.small){const Q=sub(P,K.X,K.Wn,K.xm);const f=G[r];if(!f)return false;f(Q);return true;}
  const f=G[r];if(!f)return false;f(P);return true;}
/* overlays */
function overlay(K,B,ov){const bb=B.cells();let x0=1e9,x1=-1e9;for(const [x] of bb){x0=Math.min(x0,x);x1=Math.max(x1,x);}
  const sv=K.sv,sh=Math.min(K.sh,Math.max(1,Math.floor((K.H-3)/4)));
  if(ov==='slash'){let ya=1e9,yb=-1e9;for(const c of bb){ya=Math.min(ya,c[1]);yb=Math.max(yb,c[1]);}const n=yb-ya+1,bw=x1-x0+1,hs=Math.max(1,Math.round(sh/2));
    /* линия идёт из левого нижнего угла просвета в правый верхний и продолжается до краёв знака: просвет всегда делится */
    const hx0=x0+sv,hx1=x1-sv,hy0=ya+sh,hy1=yb-sh,sl=(hx1-hx0)/Math.max(1,hy1-hy0);
    for(let y=ya;y<=yb;y++){const x=CL(Math.round(hx0+(y-hy0)*sl),x0,x1-hs+1);B.rect(x,y,x+hs,y+1,1);}}
  if(ov==='lbar'){const H=K.k!=='cap'?K.A:K.H;const y=Math.round(H*0.45);B.rect(x0-1,y,x1+2,y+sh,1);}
  if(ov==='dbar'){if(K.k!=='cap'){const y=Math.min(K.A-sh,K.X+Math.max(1,Math.round((K.A-K.X)/2)));B.rect(x1-K.sv-1,y,x1+2,y+sh,1);}else{const y=Math.round(K.H*0.5);B.rect(x0-1,y,x1+2,y+sh,1);}}
}
/* число замкнутых просветов (4-связный фон, не касающийся рамки) */
function holesOf(B){const cs=B.cells();if(!cs.length)return 0;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cs){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  x0--;y0--;x1++;y1++;const W=x1-x0+1,H=y1-y0+1,m=new Uint8Array(W*H);for(const [x,y] of cs)m[(y-y0)*W+x-x0]=1;let n=0;const seen=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){if(m[i]||seen[i])continue;let b=false;const st=[i];seen[i]=1;while(st.length){const k=st.pop(),x=k%W,y=(k-x)/W;if(!x||!y||x===W-1||y===H-1)b=true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(!m[j]&&!seen[j]){seen[j]=1;st.push(j);}}}
    if(!b)n++;}return n;}
/* число компонент ink (4-связность) */
function compsOf(B){const cs=B.cells();if(!cs.length)return 0;const m=new Set(cs.map(c=>c[0]+','+c[1]));let n=0;
  for(const [x,y] of cs){const k=x+','+y;if(!m.has(k))continue;n++;const st=[[x,y]];m.delete(k);while(st.length){const [a,b]=st.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(a+dx)+','+(b+dy);if(m.has(q)){m.delete(q);st.push([a+dx,b+dy]);}}}}return n;}
/* ---- serif pass: stems with free ends get a foot / flag ---- */
function addSerifs(K,B,isCap){
  const sf=K.sf,sfh=K.sfh||1,sv=K.sv;const cs=B.cells();const g=(x,y)=>B.g(x,y)>0;
  let minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;for(const [x,y] of cs){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}
  /* find vertical runs of width sv-ish: scan columns for runs length>=3 */
  const add=[],grp=[];let cur=null;const gp=(x,y)=>{add.push([x,y]);cur.push([x,y]);};
  for(let x=minx;x<=maxx;x++){let y=miny;while(y<=maxy){if(!g(x,y)){y++;continue;}let y1=y;while(y1<=maxy&&g(x,y1))y1++;
      const len=y1-y;if(len>=Math.max(3,Math.round(K.X*0.5))){
        /* stem columns: measure width of run at mid */
        const ym=Math.floor((y+y1)/2);let xl=x;while(g(xl-1,ym)&&g(xl-1,y)===g(xl,y))xl--;
        if(xl===x){let xr=x;while(g(xr+1,ym))xr++;const w=xr-x+1;
          if(w<=sv+1&&w>=1){
            /* настоящий ствол: конец плоский на всю ширину (иначе это бок чаши с закруглённым углом) */
            const flatEnd=(yy)=>{for(let xx=x;xx<=xr;xx++)if(!g(xx,yy))return false;return true;};
            /* bottom end at baseline: serif both sides */
            const yb=y,yt=y1-1,tall=yt-yb+1>sfh;
            const freeAt=(yy,dir)=>{for(let k=1;k<=sf+1;k++){if(g(x+(dir<0?-k:w-1+k),yy))return false;}return true;};
            const wide=(yy)=>{/* the row at the end is the stem itself */let c=0;for(let xx=x-1;xx<=xr+1;xx++)if(g(xx,yy))c++;return c<=w;};
            if(tall&&yb===0&&wide(yb)&&flatEnd(yb)){if(freeAt(yb,-1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(x-k,yb+r);}if(freeAt(yb,1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(xr+k,yb+r);}}
            if(tall&&(yt===K.X-1||yt===K.H-1)&&wide(yt)&&flatEnd(yt)){if(freeAt(yt,-1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(x-k,yt-r);}if(isCap&&yt===K.H-1&&freeAt(yt,1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(xr+k,yt-r);}}
          }}}
      y=y1;}}
  const h0=holesOf(B),c0=compsOf(B);B.sg=[];for(const gq of grp){for(const [x,y] of gq)B.s(x,y,1);if(holesOf(B)>h0||compsOf(B)>c0)for(const [x,y] of gq)B.c(x,y);else B.sg.push(gq);}
}
/* 4-connectivity: diagonal-only contacts get one extra cell (top-row candidate) so staircases share edges */
function connect(B){const cs=B.cells();const add=[];
  for(const [x,y] of cs){
    if(B.g(x+1,y+1)&&!B.g(x+1,y)&&!B.g(x,y+1))add.push([x,y+1]);
    if(B.g(x+1,y-1)&&!B.g(x+1,y)&&!B.g(x,y-1))add.push([x+1,y]);}
  for(const [x,y] of add)B.s(x,y,1);}
/* orphan removal: value-1 cells without any 8-neighbour */
function orphans(B){for(const [x,y,v] of B.cells()){if(v!==1)continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&B.g(x+dx,y+dy))n++;if(!n)B.c(x,y);}}
/* tick for ď ť (comma-like apostrophe at upper right) */
function tick(K,B,x1,yTop){const t=Math.max(2,Math.round(K.H*0.22));const x=x1+1;B.rect(x,yTop-t,x+K.sv,yTop,3);}
function addMark(K,B,kind,base,k){
  const cs=B.cells();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cs){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(kind==='cedilla'||kind==='ogonek'){const cx=kind==='cedilla'?Math.floor((x0+x1)/2):x1-K.mt+1-(kind==='ogonek'?1:0);MK[kind](K,B,cx,0,3);return;}
  if(kind==='tick'){if(base==='t'){tick(K,B,K.sv,y1+1);return;}tick(K,B,x1,(base==='d')?K.A:K.X+Math.round((K.H-K.X)*0.5)+1);return;}
  const cap=k==='cap';let top=cap?K.H:K.X;
  /* tall lowercase (d, t) not accented; dotless forms top = X */
  const mh=mhOf(K,kind);let wm=mwOf(K,kind);
  const bw=x1-x0+1;if(kind==='breve')wm=Math.max(4,Math.round(bw*0.6));/* parity match for symmetric marks */
  if(['circumflex','caron','macron','breve','diaeresis','ring'].includes(kind)){if(((bw-wm)&1)!==0){wm+=1;}}
  const cx=x0+Math.floor((bw-1)/2)+((bw%2===0&&wm%2===0)?0:0);
  const ycur=top+K.gap;
  let cxx=x0+Math.floor(bw/2);
  if(kind==='circumflex'||kind==='caron'){cxx=x0+Math.floor((bw-K.mt)/2);if(((bw-K.mt)&1))cxx=x0+Math.floor((bw-K.mt)/2);}
  if(kind==='acute'||kind==='grave'){cxx=x0+Math.floor((bw-(K.mh+K.mt-1))/2)+Math.floor(K.mh/2);}
  if(kind==='tilde')cxx=x0+Math.floor(bw/2);
  if(kind==='dot')cxx=x0+Math.floor((bw-1)/2);
  if(kind==='ring')cxx=x0+Math.floor((bw-1)/2)+0;
  if(kind==='macron'||kind==='breve'||kind==='diaeresis')cxx=x0+Math.floor(bw/2);
  MK[kind](K,B,cxx,ycur,wm);
}
/* ---- main build: returns {cells:[[x,y,v]], minx,maxx} before italic/edit ---- */
function build(ch,K){return buildSpec(T[ch],K);}
function buildSpec(spec,K){
  if(!spec)return null;
  const B=new PXE.Bm(K);
  const baseSpec=spec.base?T[spec.base]:spec;
  K.k=baseSpec.k;
  if(!drawBase(K,baseSpec,B))return null;
  if(baseSpec.ov)overlay(K,B,baseSpec.ov);
  if(K.serif&&!baseSpec.ns)addSerifs(K,B,baseSpec.k==='cap');
  connect(B);orphans(B);
  if(spec.mark){addMark(K,B,spec.mark,spec.base,baseSpec.k);connect(B);}
  return B;}
/* Проверка засечек: добавленные клетки (с засечками минус без) — только ряды, примыкающие боком (в том же ряду) к стволу; острова <= 2 клеток недопустимы.
   Возвращает список замечаний. */
function serifAudit(ch,K){const spec=T[ch];if(!spec||spec.mark)return [];const B=buildSpec(spec,K);if(!B)return [];const o=[];
  for(const gq of (K.serif?(B.sg||[]):[])){const S=new Set(gq.map(c=>c[0]+','+c[1]));
    /* каждый ряд группы: пробег клеток засечки упирается боком (в том же ряду) в ствол, не входящий в группу */
    for(const [x,y] of gq){let ok=false;for(const d of [-1,1]){let xx=x;while(S.has((xx+d)+','+y))xx+=d;if(B.g(xx+d,y)&&!S.has((xx+d)+','+y)){ok=true;break;}}
      if(!ok){o.push(ch+': засечка без бокового касания ('+x+','+y+')');break;}}
    if(gq.length<=2&&gq.length<K.sf*(K.sfh||1))o.push(ch+': короткая засечка');}
  if(PXE.islands(B.cells())&&!/[.,:;!?¡¿"'‘’‚“”„…·•°ªº]/.test(ch)&&!spec.base)o.push(ch+': остров <= 2 клеток');
  return o;}
return {T,build,buildSpec,MK,mhOf,serifAudit};}
if(typeof module!=='undefined')module.exports=recipes4;
