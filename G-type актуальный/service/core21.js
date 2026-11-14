/* ===== «Свой шрифт из файлов»: импорт векторных знаков из SVG (чистый JS, без библиотек) =====
   svgImport(текст) -> {cs, w, h, bb, warn:[...], vb}
     cs  — контуры знака {hole,nodes:[{x,y,a,b}]} в системе «у вверх», 1000 ед. = высота холста (viewBox), низ холста y=0;
     bb  — габарит чернил {x0,y0,x1,y1}; warn — тихие предупреждения (текст, изображения, маски …).
   Поддержано: path (все команды, дуги → кубики, относительные/абсолютные/короткие), rect (в т.ч. со скруглением), circle, ellipse,
   line, polyline, polygon, вложенные g с transform (matrix/translate/scale/rotate/skewX/skewY), use, viewBox, fill-rule,
   стили атрибутами / style / <style> с простыми селекторами; обводка без заливки превращается в контур движком «скелет + перо» (core18).
   Контуры: направление по правилу заливки, объединение (csgUnion), экстремумы и упрощение (skRefit). */
const IMPX={ENT:{lt:'<',gt:'>',amp:'&',quot:'"',apos:"'",nbsp:' '}};
function impDecode(s){return s.indexOf('&')<0?s:s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,(m,e)=>{
  if(e[0]==='#'){const c=e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return isFinite(c)&&c>0&&c<0x110000?String.fromCodePoint(c):m;}
  return IMPX.ENT[e]!=null?IMPX.ENT[e]:m;});}
/* крошечный XML-разборщик: дерево {tag,attrs,kids,text} */
function impXml(src){
  const root={tag:'#root',attrs:{},kids:[],text:''},st=[root],n=src.length;let i=0;
  while(i<n){
    const lt=src.indexOf('<',i);
    if(lt<0){st[st.length-1].text+=src.slice(i);break;}
    if(lt>i)st[st.length-1].text+=src.slice(i,lt);
    if(src.startsWith('<!--',lt)){const e=src.indexOf('-->',lt+4);i=e<0?n:e+3;continue;}
    if(src.startsWith('<![CDATA[',lt)){const e=src.indexOf(']]>',lt);st[st.length-1].text+=src.slice(lt+9,e<0?n:e);i=e<0?n:e+3;continue;}
    if(src.startsWith('<!DOCTYPE',lt)||src.startsWith('<!doctype',lt)){let j=lt+9,depth=0;while(j<n){const c=src[j];if(c==='[')depth++;else if(c===']')depth--;else if(c==='>'&&depth<=0)break;j++;}i=j+1;continue;}
    if(src[lt+1]==='?'||src[lt+1]==='!'){const e=src.indexOf('>',lt);i=e<0?n:e+1;continue;}
    if(src[lt+1]==='/'){const e=src.indexOf('>',lt);if(st.length>1)st.pop();i=e<0?n:e+1;continue;}
    let j=lt+1,q=null;while(j<n){const c=src[j];if(q){if(c===q)q=null;}else if(c==='"'||c==="'")q=c;else if(c==='>')break;j++;}
    let inner=src.slice(lt+1,j);const self=inner.endsWith('/');if(self)inner=inner.slice(0,-1);
    const m=/^\s*([^\s\/>]+)/.exec(inner);if(!m){i=j+1;continue;}
    const tag=m[1].replace(/^.*:/,'').toLowerCase(),attrs={};
    const re=/([^\s=\/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;re.lastIndex=m[0].length;let am;
    while((am=re.exec(inner))){{let k=am[1].replace(/^xlink:/i,'').toLowerCase();attrs[k]=impDecode(am[2]!=null?am[2]:am[3]);}}
    const el={tag,attrs,kids:[],text:''};st[st.length-1].kids.push(el);if(!self)st.push(el);
    i=j+1;}
  return root;}
/* ---------- CSS ---------- */
function impDecl(s){const o={};for(const part of String(s).split(';')){const i=part.indexOf(':');if(i<0)continue;const k=part.slice(0,i).trim().toLowerCase();if(k)o[k]=part.slice(i+1).replace(/!important/i,'').trim();}return o;}
function impCss(text){const rules=[];text=text.replace(/\/\*[\s\S]*?\*\//g,'');const re=/([^{}@]+)\{([^{}]*)\}/g;let m;
  while((m=re.exec(text))){const d=impDecl(m[2]);for(const s of m[1].split(',')){const sel=s.trim().split(/\s+/).pop();if(sel)rules.push({sel,d});}}return rules;}
function impSelOk(sel,el){
  const m=/^([a-zA-Z0-9_-]*|\*)((?:[.#][\w-]+)*)$/.exec(sel);if(!m)return false;
  if(m[1]&&m[1]!=='*'&&m[1].toLowerCase()!==el.tag)return false;
  const cls=(el.attrs['class']||'').split(/\s+/);
  for(const t of (m[2].match(/[.#][\w-]+/g)||[])){if(t[0]==='.'){if(!cls.includes(t.slice(1)))return false;}else if(el.attrs.id!==t.slice(1))return false;}
  return true;}
/* ---------- матрицы ---------- */
const IMPM0=[1,0,0,1,0,0];
function impMul(A,B){return [A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]];}
function impXform(s){let M=IMPM0;if(!s)return M;const re=/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;let m;
  while((m=re.exec(s))){const a=m[2].split(/[\s,]+/).filter(x=>x!=='').map(Number);if(a.some(v=>!isFinite(v)))continue;let T=null;
    switch(m[1]){
      case 'matrix':if(a.length>=6)T=a.slice(0,6);break;
      case 'translate':T=[1,0,0,1,a[0]||0,a[1]||0];break;
      case 'scale':T=[a[0]==null?1:a[0],0,0,a[1]==null?(a[0]==null?1:a[0]):a[1],0,0];break;
      case 'rotate':{const r=(a[0]||0)*Math.PI/180,c=Math.cos(r),sn=Math.sin(r);T=[c,sn,-sn,c,0,0];
        if(a.length>=3)T=impMul(impMul([1,0,0,1,a[1],a[2]],T),[1,0,0,1,-a[1],-a[2]]);break;}
      case 'skewX':T=[1,0,Math.tan((a[0]||0)*Math.PI/180),1,0,0];break;
      case 'skewY':T=[1,Math.tan((a[0]||0)*Math.PI/180),0,1,0,0];break;}
    if(T)M=impMul(M,T);}
  return M;}
/* ---------- данные пути ---------- */
function impArcCubics(x1,y1,rx,ry,phiDeg,fa,fs,x2,y2){
  rx=Math.abs(rx);ry=Math.abs(ry);if(!rx||!ry||(x1===x2&&y1===y2))return null;
  const phi=phiDeg*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi);
  const dx=(x1-x2)/2,dy=(y1-y2)/2,x1p=c*dx+s*dy,y1p=-s*dx+c*dy;
  const lam=x1p*x1p/(rx*rx)+y1p*y1p/(ry*ry);if(lam>1){const k=Math.sqrt(lam);rx*=k;ry*=k;}
  const num=rx*rx*ry*ry-rx*rx*y1p*y1p-ry*ry*x1p*x1p,den=rx*rx*y1p*y1p+ry*ry*x1p*x1p;
  let co=den?Math.sqrt(Math.max(0,num/den)):0;if(fa===fs)co=-co;
  const cxp=co*rx*y1p/ry,cyp=-co*ry*x1p/rx,cx=c*cxp-s*cyp+(x1+x2)/2,cy=s*cxp+c*cyp+(y1+y2)/2;
  const ang=(ux,uy,vx,vy)=>{const a=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);return a;};
  const th1=ang(1,0,(x1p-cxp)/rx,(y1p-cyp)/ry);let dth=ang((x1p-cxp)/rx,(y1p-cyp)/ry,(-x1p-cxp)/rx,(-y1p-cyp)/ry);
  if(!fs&&dth>0)dth-=2*Math.PI;else if(fs&&dth<0)dth+=2*Math.PI;
  const nseg=Math.max(1,Math.ceil(Math.abs(dth)/(Math.PI/2)-1e-9)),d=dth/nseg,t=4/3*Math.tan(d/4),out=[];
  const P=a=>[cx+rx*Math.cos(a)*c-ry*Math.sin(a)*s,cy+rx*Math.cos(a)*s+ry*Math.sin(a)*c];
  const D=a=>[-rx*Math.sin(a)*c-ry*Math.cos(a)*s,-rx*Math.sin(a)*s+ry*Math.cos(a)*c];
  for(let i=0;i<nseg;i++){const a0=th1+i*d,a1=a0+d,p0=P(a0),p1=P(a1),d0=D(a0),d1=D(a1);
    out.push([p0[0]+t*d0[0],p0[1]+t*d0[1],p1[0]-t*d1[0],p1[1]-t*d1[1],i===nseg-1?x2:p1[0],i===nseg-1?y2:p1[1]]);}
  return out;}
/* строка d -> [{nodes:[{x,y,a,b}],closed}] (локальные координаты; a — входная ручка узла, b — выходная) */
function impPathD(d){
  const subs=[];let sp=null,x=0,y=0,x0=0,y0=0,lcx=0,lcy=0,lqx=0,lqy=0,prev='',cmd='',i=0;const n=d.length;
  const re=/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;
  const ws=()=>{while(i<n&&(d.charCodeAt(i)<=32||d[i]===','))i++;};
  const num=()=>{ws();re.lastIndex=i;const m=re.exec(d);if(!m)throw new Error('num');i=re.lastIndex;return parseFloat(m[0]);};
  const flag=()=>{ws();const c=d[i];if(c!=='0'&&c!=='1')throw new Error('flag');i++;return +c;};
  const ensure=()=>{if(!sp||sp.closed){sp={nodes:[{x,y,a:null,b:null}],closed:false};subs.push(sp);}};
  const last=()=>sp.nodes[sp.nodes.length-1];
  const lineTo=(px,py)=>{ensure();sp.nodes.push({x:px,y:py,a:null,b:null});x=px;y=py;};
  const cubTo=(x1,y1,x2,y2,px,py)=>{ensure();last().b={x:x1,y:y1};sp.nodes.push({x:px,y:py,a:{x:x2,y:y2},b:null});lcx=x2;lcy=y2;x=px;y=py;};
  try{
    while(true){
      ws();if(i>=n)break;
      const ch=d[i];
      if(/[A-Za-z]/.test(ch)){cmd=ch;i++;}else if(!cmd)break;
      const rel=cmd===cmd.toLowerCase(),C=cmd.toUpperCase();
      if(C==='Z'){ensure();sp.closed=true;const f=sp.nodes[0],l=last();
        if(sp.nodes.length>1&&Math.abs(f.x-l.x)<1e-7&&Math.abs(f.y-l.y)<1e-7){f.a=l.a;sp.nodes.pop();}
        x=x0;y=y0;prev='Z';cmd='';sp.closed=true;continue;}
      const was=prev;
      switch(C){
        case 'M':{let a=num(),b=num();if(rel){a+=x;b+=y;}sp={nodes:[{x:a,y:b,a:null,b:null}],closed:false};subs.push(sp);x=x0=a;y=y0=b;cmd=rel?'l':'L';prev='M';continue;}
        case 'L':{let a=num(),b=num();if(rel){a+=x;b+=y;}lineTo(a,b);break;}
        case 'H':{let a=num();if(rel)a+=x;lineTo(a,y);break;}
        case 'V':{let b=num();if(rel)b+=y;lineTo(x,b);break;}
        case 'C':{let a=num(),b=num(),c=num(),e=num(),f=num(),g=num();if(rel){a+=x;b+=y;c+=x;e+=y;f+=x;g+=y;}cubTo(a,b,c,e,f,g);break;}
        case 'S':{let c=num(),e=num(),f=num(),g=num();if(rel){c+=x;e+=y;f+=x;g+=y;}
          const a=(was==='C'||was==='S')?2*x-lcx:x,b=(was==='C'||was==='S')?2*y-lcy:y;cubTo(a,b,c,e,f,g);break;}
        case 'Q':{let a=num(),b=num(),f=num(),g=num();if(rel){a+=x;b+=y;f+=x;g+=y;}
          const sx=x,sy=y;cubTo(sx+2/3*(a-sx),sy+2/3*(b-sy),f+2/3*(a-f),g+2/3*(b-g),f,g);lqx=a;lqy=b;break;}
        case 'T':{let f=num(),g=num();if(rel){f+=x;g+=y;}
          const a=(was==='Q'||was==='T')?2*x-lqx:x,b=(was==='Q'||was==='T')?2*y-lqy:y;
          const sx=x,sy=y;cubTo(sx+2/3*(a-sx),sy+2/3*(b-sy),f+2/3*(a-f),g+2/3*(b-g),f,g);lqx=a;lqy=b;break;}
        case 'A':{const rx=num(),ry=num(),ph=num(),fa=flag(),fs=flag();let f=num(),g=num();if(rel){f+=x;g+=y;}
          const cu=impArcCubics(x,y,rx,ry,ph,fa,fs,f,g);if(!cu)lineTo(f,g);else for(const q of cu)cubTo(q[0],q[1],q[2],q[3],q[4],q[5]);break;}
        default:throw new Error('cmd');}
      prev=C;
    }
  }catch(e){/* битый хвост пути отбрасывается, всё прочитанное остаётся */}
  return subs;}
/* ---------- примитивы -> путь ---------- */
function impShapeD(el){
  const a=el.attrs,f=k=>{const v=parseFloat(a[k]);return isFinite(v)?v:0;};
  switch(el.tag){
    case 'path':return a.d||'';
    case 'rect':{const x=f('x'),y=f('y'),w=f('width'),h=f('height');if(!(w>0&&h>0))return '';
      let rx=a.rx!=null?Math.abs(f('rx')):null,ry=a.ry!=null?Math.abs(f('ry')):null;if(rx==null)rx=ry==null?0:ry;if(ry==null)ry=rx;rx=Math.min(rx,w/2);ry=Math.min(ry,h/2);
      if(!rx||!ry)return 'M'+x+' '+y+'H'+(x+w)+'V'+(y+h)+'H'+x+'Z';
      return 'M'+(x+rx)+' '+y+'H'+(x+w-rx)+'A'+rx+' '+ry+' 0 0 1 '+(x+w)+' '+(y+ry)+'V'+(y+h-ry)+'A'+rx+' '+ry+' 0 0 1 '+(x+w-rx)+' '+(y+h)+'H'+(x+rx)+'A'+rx+' '+ry+' 0 0 1 '+x+' '+(y+h-ry)+'V'+(y+ry)+'A'+rx+' '+ry+' 0 0 1 '+(x+rx)+' '+y+'Z';}
    case 'circle':case 'ellipse':{const cx=f('cx'),cy=f('cy');const rx=el.tag==='circle'?f('r'):f('rx'),ry=el.tag==='circle'?f('r'):f('ry');if(!(rx>0&&ry>0))return '';
      return 'M'+(cx+rx)+' '+cy+'A'+rx+' '+ry+' 0 0 1 '+cx+' '+(cy+ry)+'A'+rx+' '+ry+' 0 0 1 '+(cx-rx)+' '+cy+'A'+rx+' '+ry+' 0 0 1 '+cx+' '+(cy-ry)+'A'+rx+' '+ry+' 0 0 1 '+(cx+rx)+' '+cy+'Z';}
    case 'line':return 'M'+f('x1')+' '+f('y1')+'L'+f('x2')+' '+f('y2');
    case 'polyline':case 'polygon':{const v=(a.points||'').split(/[\s,]+/).filter(s=>s!=='').map(Number);if(v.length<4||v.some(z=>!isFinite(z)))return '';
      let s='M'+v[0]+' '+v[1];for(let i=2;i+1<v.length;i+=2)s+='L'+v[i]+' '+v[i+1];return s+(el.tag==='polygon'?'Z':'');}}
  return '';}
/* ---------- цвет и стиль ---------- */
function impPaint(v){
  if(v==null)return null;v=String(v).trim().toLowerCase();
  if(!v||v==='none'||v==='transparent')return {none:true};
  if(v==='white')return {white:true};
  let m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if(m){let h=m[1];if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return r+g+b>=3*250?{white:true}:{};}
  m=/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);if(m)return (+m[1]+ +m[2]+ +m[3])>=3*250?{white:true}:{};
  return {};}
const IMP_INH=['fill','stroke','stroke-width','fill-rule','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-opacity','stroke-opacity','visibility','stroke-dasharray','color'];
function impStyleOf(el,ps,rules){
  const own={};
  for(const k of IMP_INH.concat(['opacity','display']))if(el.attrs[k]!=null)own[k]=el.attrs[k];
  for(const r of rules)if(impSelOk(r.sel,el))Object.assign(own,r.d);
  if(el.attrs.style)Object.assign(own,impDecl(el.attrs.style));
  const st=Object.assign({},ps);for(const k of IMP_INH)if(own[k]!=null)st[k]=own[k];
  st.opacity=own.opacity!=null?own.opacity:'1';st.display=own.display||'';
  return st;}
/* ---------- обход дерева ---------- */
function impCollect(el,ids){if(el.attrs.id)ids[el.attrs.id]=el;for(const k of el.kids)impCollect(k,ids);}
function impCollectCss(el,rules){if(el.tag==='style')for(const r of impCss(el.text))rules.push(r);for(const k of el.kids)impCollectCss(k,rules);}
function impWalk(el,M,ps,X,depth){
  if(depth>40)return;
  const st=impStyleOf(el,ps,X.rules);
  if(st.display==='none'||parseFloat(st.opacity)===0)return;
  const t=el.tag;
  if(el.attrs.transform)M=impMul(M,impXform(el.attrs.transform));
  if(t==='defs'||t==='symbol'||t==='clippath'||t==='mask'||t==='style'||t==='title'||t==='desc'||t==='metadata'||t==='lineargradient'||t==='radialgradient'||t==='filter'||t==='pattern'||t==='marker')return;
  if(t==='text'||t==='tspan'||t==='image'||t==='foreignobject'){X.warn.add(t==='text'||t==='tspan'?'text':t);return;}
  if(el.attrs['clip-path']&&el.attrs['clip-path']!=='none')X.warn.add('clip');
  if(el.attrs.mask&&el.attrs.mask!=='none')X.warn.add('mask');
  if(t==='svg'||t==='g'||t==='a'||t==='switch'||t==='#root'){
    let M2=M;
    if(t==='svg'&&depth>0&&el.attrs.viewbox){/* вложенный svg: viewBox -> x,y,width,height */}
    for(const k of el.kids){impWalk(k,M2,st,X,depth+1);if(t==='switch')break;}
    return;}
  if(t==='use'){const h=(el.attrs.href||'').replace(/^#/,''),r=X.ids[h];if(!r||X.useDepth>8)return;
    const M2=impMul(M,[1,0,0,1,parseFloat(el.attrs.x)||0,parseFloat(el.attrs.y)||0]);X.useDepth++;
    if(r.tag==='symbol'){for(const k of r.kids)impWalk(k,M2,st,X,depth+1);}else impWalk(r,M2,st,X,depth+1);X.useDepth--;return;}
  const d=impShapeD(el);if(!d)return;
  if(st.visibility==='hidden'||st.visibility==='collapse')return;
  const subs=impPathD(d);if(!subs.length)return;
  const T=(p)=>p&&{x:M[0]*p.x+M[2]*p.y+M[4],y:M[1]*p.x+M[3]*p.y+M[5]};
  X.ns=(X.ns||0)+subs.length;for(const s0 of subs)X.nn=(X.nn||0)+s0.nodes.length;
  if(X.ns>IMP_MAXSUB||X.nn>IMP_MAXNODE)throw {imp:'complex',n:X.ns};
  const S=subs.map(s=>({closed:s.closed,nodes:s.nodes.map(nd=>{const q=T(nd);q.a=T(nd.a);q.b=T(nd.b);return q;})}));
  const fillP=impPaint(st.fill==null?'#000':(st.fill==='currentcolor'?(st.color||'#000'):st.fill)),strokeP=impPaint(st.stroke==null?'none':st.stroke);
  const fo=parseFloat(st['fill-opacity']),so=parseFloat(st['stroke-opacity']);
  if(fillP&&!fillP.none&&!fillP.white&&!(fo===0)){
    if(String(st.fill||'').indexOf('url(')>=0)X.warn.add('paint');
    X.items.push({kind:'fill',subs:S,rule:st['fill-rule']==='evenodd'?'evenodd':'nonzero'});}
  else if(fillP&&fillP.white)X.skippedWhite=(X.skippedWhite||0)+1;
  if(strokeP&&!strokeP.none&&!strokeP.white&&!(so===0)){
    const sw=parseFloat(st['stroke-width']);const w=(isFinite(sw)?sw:1)*Math.sqrt(Math.abs(M[0]*M[3]-M[1]*M[2]));
    if(w>0){if(st['stroke-dasharray']&&st['stroke-dasharray']!=='none')X.warn.add('dash');
      X.items.push({kind:'stroke',subs:S,w,cap:st['stroke-linecap']||'butt',join:st['stroke-linejoin']||'miter',ml:parseFloat(st['stroke-miterlimit'])||4});}}
}
/* ---------- обводка -> контур (движок «скелет + перо») ---------- */
function impStrokeContours(item){
  const out=[];const w=item.w,half=w/2;
  const font={pen:()=>skPen('ell',{rx:half,ry:half,ang:0,stem:w}),simpTol:0.8,id:'impstroke'};
  const j=item.join==='round'?'round':item.join==='bevel'?'bevel':'miter';
  for(const s of item.subs){
    let ns=s.nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null}));
    if(s.closed&&ns.length>1){const f=ns[0],l=ns[ns.length-1];if(Math.hypot(f.x-l.x,f.y-l.y)<1e-6){f.a=l.a;ns.pop();}}
    if(ns.length<2){if(ns.length===1&&item.cap==='round'){out.push(...skShape([{dot:true,x:ns[0].x,y:ns[0].y,r:half}],font,{stem:w,hair:w}));}continue;}
    const n=ns.length;
    const dirIn=i=>{const p=ns[i],q=p.a||ns[(i-1+n)%n];const dx=p.x-q.x,dy=p.y-q.y,l=Math.hypot(dx,dy);return l>1e-9?[dx/l,dy/l]:null;};
    const dirOut=i=>{const p=ns[i],q=p.b||ns[(i+1)%n];const dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy);return l>1e-9?[dx/l,dy/l]:null;};
    const nodes=ns.map((p,i)=>{
      const a=dirIn(i),b=dirOut(i);let smooth=false;
      if((s.closed||(i>0&&i<n-1))&&a&&b)smooth=a[0]*b[0]+a[1]*b[1]>0.9962;
      const o={x:p.x,y:p.y,a:p.a,b:p.b,type:smooth?'smooth':'corner'};if(!smooth)o.j=j;return o;});
    const cap=item.cap==='round'?'R':'F';
    if(!s.closed&&item.cap==='square'){/* квадратное окончание: удлиняем концы на half */
      const d0=dirOut(0),d1=dirIn(n-1);
      if(d0){nodes[0].x-=d0[0]*half;nodes[0].y-=d0[1]*half;if(nodes[0].b){nodes[0].b={x:nodes[0].b.x-d0[0]*half,y:nodes[0].b.y-d0[1]*half};}}
      if(d1){nodes[n-1].x+=d1[0]*half;nodes[n-1].y+=d1[1]*half;if(nodes[n-1].a){nodes[n-1].a={x:nodes[n-1].a.x+d1[0]*half,y:nodes[n-1].a.y+d1[1]*half};}}}
    if(!s.closed){nodes[0].a=null;nodes[n-1].b=null;}
    const st={nodes,cap0:cap,cap1:cap};if(s.closed&&n>=3)st.closed=true;
    try{out.push(...skShape([st],font,{stem:w,hair:w}));}catch(e){}}
  return out;}
/* ---------- контуры: направление и правило заливки ---------- */
function impFlat(c,seg){return flatC(c,seg||8);}
function impArea(pts){let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;}
function impInPoly(P,x,y){let r=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])r=!r;}return r;}
function impRev(c){return {hole:c.hole,nodes:reverseNodes(c.nodes)};}
/* элемент -> нормализованные контуры (внешние против часовой, отверстия по часовой) */
function impItemFill(item){
  let cs=item.subs.filter(s=>s.nodes.length>=2).map(s=>({hole:false,nodes:s.nodes.map(n=>({x:n.x,y:n.y,a:n.a,b:n.b}))}));
  cs=cs.filter(c=>c.nodes.length>=3);
  if(!cs.length)return [];
  if(item.rule==='evenodd'&&cs.length>1){
    const P=cs.map(c=>impFlat(c,8));
    cs=cs.map((c,i)=>{const pr=P[i];const sx=pr[0][0],sy=pr[0][1];/* пробная точка — вершина самого контура: внутри другого он, только если вложен */
      let depth=0;for(let j=0;j<P.length;j++)if(j!==i&&impInPoly(P[j],sx,sy))depth++;
      const ccw=impArea(pr)>0;const wantCCW=depth%2===0;return ccw===wantCCW?c:impRev(c);});}
  return csgUnion(cs);}
function impCleanup(cs){
  /* упрощение: сгладить, добавить экстремумы, убрать мусор */
  let out=cs.filter(c=>c.nodes.length>=3&&Math.abs(impArea(impFlat(c,6)))>30);
  try{out=csgSimplify(out);}catch(e){}
  try{out=out.map(c=>{const r=skRefit(c,1.2,true);return r&&r.nodes?r:c;});}catch(e){}
  for(const c of out){c.hole=impArea(impFlat(c,6))<0;}
  return out;}
function impBBox(cs){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const c of cs){const n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
    const curve=!!(a.b||b.a);
    if(!curve){x0=Math.min(x0,a.x);x1=Math.max(x1,a.x);y0=Math.min(y0,a.y);y1=Math.max(y1,a.y);continue;}
    const P=[[a.x,a.y],a.b?[a.b.x,a.b.y]:[a.x,a.y],b.a?[b.a.x,b.a.y]:[b.x,b.y],[b.x,b.y]];
    for(let k=0;k<=24;k++){const q=bz(P,k/24);x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}}}
  return x1>x0||y1>y0?{x0,y0,x1,y1}:null;}
/* ---------- главная функция ---------- */
const IMP_MAXSUB=800,IMP_MAXNODE=20000; /* предел сложности одного файла: больше — отказ (иначе страница зависает) */
function svgImport(text){
  const warn=new Set();let root;
  try{root=impXml(String(text));}catch(e){return {cs:[],warn:['bad'],bb:null};}
  let svg=null;const find=(e)=>{if(svg)return;if(e.tag==='svg'){svg=e;return;}for(const k of e.kids)find(k);};find(root);
  if(!svg)return {cs:[],warn:['nosvg'],bb:null};
  const rules=[],ids={};impCollectCss(root,rules);impCollect(root,ids);
  const X={rules,ids,items:[],warn,useDepth:0};
  try{impWalk(svg,IMPM0,{},X,0);}catch(e){if(e&&e.imp==='complex')return {cs:[],warn:['complex'],bb:null,n:e.n};throw e;}
  /* холст: viewBox, иначе width/height, иначе габарит рисунка */
  let vb=null;const vbs=(svg.attrs.viewbox||'').split(/[\s,]+/).map(Number);
  if(vbs.length===4&&vbs.every(isFinite)&&vbs[2]>0&&vbs[3]>0)vb={x:vbs[0],y:vbs[1],w:vbs[2],h:vbs[3]};
  else{const w=parseFloat(svg.attrs.width),h=parseFloat(svg.attrs.height);if(w>0&&h>0)vb={x:0,y:0,w,h};}
  /* заливки: по элементу, затем общее объединение; обводки — через перо */
  const parts=[];
  try{
    for(const it of X.items){
      if(it.kind==='fill'){const c=impItemFill(it);if(c.length)parts.push(...c);}
      else{const c=impStrokeContours(it);if(c.length)parts.push(...c);}}
  }catch(e){warn.add('geom');}
  if(!parts.length)return {cs:[],warn:[...warn],bb:null,vb};
  let cs=parts.length>1?csgUnion(parts):parts;
  if(!vb){const b=impBBox(cs);vb=b?{x:b.x0,y:b.y0,w:Math.max(1,b.x1-b.x0),h:Math.max(1,b.y1-b.y0)}:{x:0,y:0,w:1000,h:1000};}
  /* единицы: высота холста = 1000, низ холста y=0 (y вверх) */
  const u=1000/vb.h;
  cs=cs.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:(n.x-vb.x)*u,y:(vb.y+vb.h-n.y)*u,a:n.a&&{x:(n.a.x-vb.x)*u,y:(vb.y+vb.h-n.a.y)*u},b:n.b&&{x:(n.b.x-vb.x)*u,y:(vb.y+vb.h-n.b.y)*u}}))}))
    .map(c=>mkc(c.nodes,c.hole));
  cs=impCleanup(cs);
  /* направление: внешние против часовой, отверстия по часовой (mkc уже ориентирует по hole) */
  cs=cs.map(c=>mkc(c.nodes,c.hole));
  return {cs,warn:[...warn],bb:impBBox(cs),vb:{w:vb.w*u,h:1000},units:u};}
