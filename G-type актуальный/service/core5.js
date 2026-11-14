/* ===== VOLT: библиотека шрифтов — реестр, шероховатость, перо ===== */
/* ---- шероховатость: детерминированный «грубый» срез ---- */
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function roughContour(c,amt,seed,step){
  const r=rng(seed),ns=c.nodes,n=ns.length,out=[];
  const jit=()=>[(r()*2-1)*amt*0.45,(r()*2-1)*amt*0.45];
  const J=ns.map(()=>jit());
  for(let i=0;i<n;i++){
    const A=ns[i],B=ns[(i+1)%n],ja=J[i],jb=J[(i+1)%n];
    out.push({x:A.x+ja[0],y:A.y+ja[1],a:A.a&&{x:A.a.x+ja[0],y:A.a.y+ja[1]},b:A.b&&{x:A.b.x+ja[0],y:A.b.y+ja[1]}});
    const straight=near1s(A.b,A)&&near1s(B.a,B);
    if(straight){
      const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy);
      if(len>step*1.4){
        const m=Math.min(6,Math.floor(len/step)),nx=-dy/len,ny=dx/len;
        for(let k=1;k<=m;k++){
          const t=k/(m+1),o=(r()*2-1)*amt*0.5,tj=(r()*2-1)*amt*0.3;
          const px=A.x+dx*t+ja[0]+(jb[0]-ja[0])*t+nx*o+dx/len*tj,py=A.y+dy*t+ja[1]+(jb[1]-ja[1])*t+ny*o+dy/len*tj;
          out.push({x:px,y:py,a:null,b:null});
        }
      }
    }
  }
  return {hole:c.hole,nodes:out};
}
function near1s(p,n){return !p||(Math.abs(p.x-n.x)<0.5&&Math.abs(p.y-n.y)<0.5);}
function roughGlyph(cs,amt,ch){
  const d=GL[ch],sid=hashStr(d&&d.shape?d.shape.toString():ch);
  return cs.map((c,ci)=>Object.assign(roughContour(c,amt,(sid^Math.imul(ci+1,2654435761))>>>0,110),{off:c.off}));
}
/* ---- перо: контуры по осевой линии с контрастом широкого пера ---- */
const D2R=Math.PI/180;
function densify(pts,step){
  const out=[pts[0]];
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/step));
    for(let k=1;k<=n;k++)out.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
  return out;
}
function SPL(pts){
  const o=[pts[0]],P=[pts[0],...pts,pts[pts.length-1]];
  for(let i=1;i<P.length-2;i++){const p0=P[i-1],p1=P[i],p2=P[i+1],p3=P[i+2];
    for(let k=1;k<=10;k++){const t=k/10,t2=t*t,t3=t2*t;
      o.push([0,1].map(c=>0.5*((2*p1[c])+(-p0[c]+p2[c])*t+(2*p0[c]-5*p1[c]+4*p2[c]-p3[c])*t2+(-p0[c]+3*p1[c]-3*p2[c]+p3[c])*t3)));}}
  return o;
}
function penWidth(K,th){return K.hairW+(K.stemW-K.hairW)*Math.abs(Math.sin(th-K.nib*D2R));}
/* список точек -> узлы с кривыми; прямые участки остаются прямыми */
function toNodes(list,closed,tan){
  const n=list.length,keep=[0];let lk=0;
  const ang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
  for(let i=1;i<n-(closed?0:1);i++){
    const nx=list[(i+1)%n];
    let da=Math.abs(ang(list[lk],list[i])-ang(list[i],nx));da=Math.min(da,Math.PI*2-da);
    if(da>0.07||Math.hypot(list[i][0]-list[lk][0],list[i][1]-list[lk][1])>150){keep.push(i);lk=i;}
  }
  if(!closed&&keep[keep.length-1]!==n-1)keep.push(n-1);
  const m=keep.length,nodes=[];
  const straightSeg=(i0,i1)=>{ // все точки между лежат на хорде
    const A=list[i0],B=list[i1%n],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1;
    for(let k=i0+1;k<(i1<=i0?i1+n:i1);k++){const P=list[k%n];if(Math.abs((P[0]-A[0])*dy-(P[1]-A[1])*dx)/L>0.9)return false;}return true;};
  const seg=[];for(let q=0;q<(closed?m:m-1);q++)seg.push(straightSeg(keep[q],keep[(q+1)%m]===0&&closed?n:keep[(q+1)%m]));
  for(let q=0;q<m;q++){
    const i=keep[q],P=list[i],pv=list[closed?(i-1+n)%n:Math.max(0,i-1)],nx=list[closed?(i+1)%n:Math.min(n-1,i+1)];
    let tx=nx[0]-pv[0],ty=nx[1]-pv[1];const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
    const prevK=keep[closed?(q-1+m)%m:Math.max(0,q-1)],nextK=keep[closed?(q+1)%m:Math.min(m-1,q+1)];
    const dp=Math.hypot(P[0]-list[prevK][0],P[1]-list[prevK][1])/3,dn=Math.hypot(list[nextK][0]-P[0],list[nextK][1]-P[1])/3;
    const sIn=closed?seg[(q-1+m)%m]:(q>0?seg[q-1]:true),sOut=closed?seg[q]:(q<m-1?seg[q]:true);
    nodes.push({x:P[0],y:P[1],a:sIn||(!closed&&q===0)?null:{x:P[0]-tx*dp,y:P[1]-ty*dp},b:sOut||(!closed&&q===m-1)?null:{x:P[0]+tx*dn,y:P[1]+ty*dn}});
  }
  return nodes;
}
function nodesArea(ns){let s=0;for(let i=0;i<ns.length;i++){const a=ns[i],b=ns[(i+1)%ns.length];s+=a.x*b.y-b.x*a.y;}return s/2;}
function pen(K,path,o){
  o=o||{};const out=[];
  let pts=densify(path,30);const n0=pts.length;if(n0<2)return out;
  const closed=n0>8&&Math.hypot(pts[0][0]-pts[n0-1][0],pts[0][1]-pts[n0-1][1])<1.5;
  if(closed)pts.pop();
  const n=pts.length,cl=[0];
  for(let i=1;i<n;i++)cl.push(cl[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const L=cl[n-1]||1,left=[],right=[];
  for(let i=0;i<n;i++){
    const a=closed?pts[(i-1+n)%n]:pts[Math.max(0,i-1)],b=closed?pts[(i+1)%n]:pts[Math.min(n-1,i+1)];
    const th=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const w=o.wf?o.wf[0]+(o.wf[1]-o.wf[0])*cl[i]/L:penWidth(K,th);
    const nx=-Math.sin(th),ny=Math.cos(th);
    left.push([pts[i][0]+nx*w/2,pts[i][1]+ny*w/2]);right.push([pts[i][0]-nx*w/2,pts[i][1]-ny*w/2]);
  }
  if(closed){
    const A=toNodes(left,true),B=toNodes(right,true);
    const aa=Math.abs(nodesArea(A)),ab=Math.abs(nodesArea(B));
    out.push(mkc(A,aa<ab),mkc(B,ab<aa));
  }else{
    const A=toNodes(left,false),B=toNodes(right.slice().reverse(),false);
    out.push(mkc(A.concat(B),false));
    if(o.serif)out.push(...serifs(K,pts,o.serif));
  }
  return out;
}
/* засечки на концах штриха: t — верхний конец, b — нижний; стиль зависит от знака */
function serifs(K,pts,code){
  const out=[],g=K.g,th=Math.max(K.hairW*1.4,46),len=K.stemW*1.8*K.serif;if(len<4)return out;
  let top=pts[0],bot=pts[0];for(const p of pts){if(p[1]>top[1])top=p;if(p[1]<bot[1])bot=p;}
  const ends=[pts[0],pts[pts.length-1]],near=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])<26;
  const v=K.v%3;
  const add=(p,isTop)=>{
    const x=p[0],y=p[1],st=isTop?['w','s','h'][v]:['s','w','s'][v];
    if(st==='s')out.push(RR(g,x,y+(isTop?-th*0.5:th*0.5),len,th,0));
    else if(st==='w'){const e=y,s=isTop?-1:1;out.push(PG(g,[[x-len*0.5,e],[x+len*0.5,e],[x+len*0.2,e+s*th*2.4],[x-len*0.28,e+s*th*0.9]]));}
    else{const e=y,s=isTop?-1:1;out.push(PG(g,[[x-len*0.5,e],[x+len*0.5,e],[x+len*0.28,e+s*th*0.9],[x-len*0.2,e+s*th*2.2]]));}
  };
  if(code.indexOf('t')>=0&&ends.some(e=>near(e,top)))add(top,true);
  if(code.indexOf('b')>=0&&ends.some(e=>near(e,bot)))add(bot,false);
  return out;
}
/* вензеля: завиток и хвост */
function curl(K,x,y,dir){
  if(K.sw<0.05)return [];
  const R=150*K.sw,pts=[];
  for(let i=0;i<=40;i++){const t=i/40,a=(90-dir*t*320)*D2R,r=R*(1-0.7*t);pts.push([x+r*Math.cos(a),y-R+r*Math.sin(a)]);}
  return pen(K,pts,{wf:[K.hairW*1.9,K.hairW*0.6]});
}
function tail(K,x,y,dir){
  if(K.sw<0.05)return [];
  const R=190*K.sw;
  return pen(K,SPL([[x,y],[x+dir*R*0.7,y-R*0.28],[x+dir*R*1.4,y-R*0.05],[x+dir*R*1.8,y+R*0.4]]),{wf:[K.hairW*1.8,K.hairW*0.5]});
}
/* ---- реестр шрифтов ---- */
const FONTS={};
function snapshotGL(){return {GL:Object.assign({},GL),CHARSET:CHARSET.slice(),GROUPS:GROUPS.map(g=>g.slice())};}
let CUR_FONT='volt';
function useFont(id){
  const f=FONTS[id];if(!f)return;
  for(const k of Object.keys(GL))delete GL[k];
  Object.assign(GL,f.GL);
  CHARSET.length=0;f.CHARSET.forEach(c=>CHARSET.push(c));
  GROUPS.length=0;f.GROUPS.forEach(g=>GROUPS.push(g));
  DEFAULTS.regular={opsp:100,...f.DEFAULTS.regular};DEFAULTS.italic={opsp:100,...f.DEFAULTS.italic};
  CUR_FONT=id;
}
FONTS.volt=Object.assign(snapshotGL(),{
  id:'volt',name:'Вольт Нуар',family:'Volt Noir',tag:'Нуар · нео-футуризм',
  desc:'Исходный шрифт: широкие вертикали, узкие горизонтали, острые шпоры.',
  sample:'ВОЛЬТ Noir 2077',
  DEFAULTS:{regular:{...DEFAULTS.regular,wdth:116,xh:540,stem:236,hair:122,innerR:0.7,round:1.2,spur:70,sb:38,track:-6,space:230},italic:{...DEFAULTS.italic,wdth:112,xh:540,stem:230,hair:118,innerR:0.7,round:1.2,spur:70,sb:38,track:-6,space:225}},
  params:{},methods:null,sym:true
});
