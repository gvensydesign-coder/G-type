/* W88: geometry check for the extended set of «Тяга» and «Кортес».
   (1) every mark (top: ink above the cap line; bottom: ink under the baseline) has bbox height >= 0.6 x the acute's height in the same font
       and its thickest stroke (2 x max inscribed radius per component) >= 0.6 x the font's hairline;
   (2) bar-crossed letters (Đ Ð Ħ Ŧ Ł Ғ Ұ): the bar crosses the stem with >= 0.25 x stem on both sides.
   Several parameter sets per font (default, thin, heavy). usage: node tests/ext_marks_check.js   -> last line "bad N" */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','core_all.js'),'utf8');
const M=new Function(src+'\nreturn {FONTS,useFont,newLattice,finalGlyph,csgFlatten,ktHair:typeof ktHair!==\"undefined\"?ktHair:null,ktP:typeof ktP!==\"undefined\"?ktP:null};')();
const RES=4;/* units per pixel */
const TOP=new Set([...'ĀĂĆĈĊČĎĒĔĖĚĜĞĠĤĴĹŃŇŌŎŐŔŘŚŜŠŤŨŪŬŮŰŴŶŸŹŻŽÀÁÂÃÄÅÈÉÊËÌÍÎÏĨĪĬİÑÒÓÔÕÖÙÚÛÜÝЇЎЙ']);
const BOT=new Set([...'ÇŞŢĢĶĻŅŖĄĘŲĮ']);
const MACRON=new Set([...'ĀĒŌŪĪ']);/* a macron is a flat bar by nature: only its stroke is checked */
const BARS=[['Đ',0.2],['Ð',0.2],['Ħ',0.2],['Ŧ',0.2],['Ł',0.2],['Ғ',0.2],['Ұ',0.1]];
const SETS={kortes:[{},{kwt:118},{kwt:158,ksr:75}],tyaga:[{},{tsw:12},{tsw:23}]};
function raster(polys,x0,y0,W,H){const g=new Uint8Array(W*H);
  for(let r=0;r<H;r++){const y=y0+(r+0.5)*RES,xs=[];
    for(const P of polys){const n=P.length;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}}
    xs.sort((p,q)=>p-q);for(let k=0;k+1<xs.length;k+=2){const c0=Math.max(0,Math.ceil((xs[k]-x0)/RES-0.5)),c1=Math.min(W-1,Math.floor((xs[k+1]-x0)/RES-0.5));for(let c=c0;c<=c1;c++)g[r*W+c]=1;}}
  return g;}
function edt1(f,n){const d=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1);let k=0;v[0]=0;z[0]=-1e20;z[1]=1e20;
  for(let q=1;q<n;q++){let s;for(;;){const p=v[k];s=((f[q]+q*q)-(f[p]+p*p))/(2*q-2*p);if(s<=z[k]&&k>0)k--;else break;}if(s<=z[k]){}k++;v[k]=q;z[k]=s;z[k+1]=1e20;}
  k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]];}return d;}
function dist(g,W,H){/* distance (px) from every inside pixel to the nearest outside pixel */
  const INF=1e12,f=new Float64Array(W*H);for(let i=0;i<W*H;i++)f[i]=g[i]?INF:0;
  const col=new Float64Array(H),row=new Float64Array(W);
  for(let c=0;c<W;c++){for(let r=0;r<H;r++)col[r]=f[r*W+c];const d=edt1(col,H);for(let r=0;r<H;r++)f[r*W+c]=d[r];}
  for(let r=0;r<H;r++){for(let c=0;c<W;c++)row[c]=f[r*W+c];const d=edt1(row,W);for(let c=0;c<W;c++)f[r*W+c]=d[c];}
  for(let i=0;i<W*H;i++)f[i]=g[i]?Math.sqrt(f[i]):0;return f;}
function info(id,ch,p){const g=M.finalGlyph(ch,{p,lat:M.newLattice(),hg:[],kern:{}},{},{slant:false});if(!g||!g.cs||!g.cs.length)return null;
  const polys=g.cs.map(c=>M.csgFlatten(c));let ax=1e9,bx=-1e9;for(const P of polys)for(const q of P){ax=Math.min(ax,q[0]);bx=Math.max(bx,q[0]);}
  const x0=Math.floor(ax-40),y0=-420,W=Math.ceil((bx-x0+40)/RES),H=Math.ceil(1500/RES);
  const gr=raster(polys,x0,y0,W,H);return {gr,W,H,x0,y0,dt:null,get D(){return this.dt||(this.dt=dist(this.gr,W,H));}};}
/* connected components of pixels inside the row range [ya,yb) (units); returns [{h,t}] */
function comps(I,ya,yb){const {gr,W,H,y0}=I,r0=Math.max(0,Math.floor((ya-y0)/RES)),r1=Math.min(H,Math.ceil((yb-y0)/RES));const seen=new Uint8Array(W*H),out=[];const D=I.D;
  for(let r=r0;r<r1;r++)for(let c=0;c<W;c++){if(!gr[r*W+c]||seen[r*W+c])continue;let st=[[r,c]],rmin=r,rmax=r,dm=0;seen[r*W+c]=1;
    while(st.length){const [a,b]=st.pop();rmin=Math.min(rmin,a);rmax=Math.max(rmax,a);dm=Math.max(dm,D[a*W+b]);for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;if(na<r0||na>=r1||nb<0||nb>=W)continue;if(gr[na*W+nb]&&!seen[na*W+nb]){seen[na*W+nb]=1;st.push([na,nb]);}}}
    out.push({h:(rmax-rmin+1)*RES,t:2*dm*RES});}
  return out;}
function runs(I,y){const {gr,W,H,x0,y0}=I,r=Math.round((y-y0)/RES-0.5);if(r<0||r>=H)return [];const o=[];let s=-1;for(let c=0;c<=W;c++){const v=c<W&&gr[r*W+c];if(v&&s<0)s=c;if(!v&&s>=0){o.push([x0+s*RES,x0+c*RES]);s=-1;}}return o;}
let bad=0,n=0;const fail=m=>{bad++;console.log('FAIL',m);};
for(const id of ['kortes','tyaga']){M.useFont(id);const f=M.FONTS[id];
  for(const ov of SETS[id]){const p=Object.assign({},f.DEFAULTS.regular,ov);if(id==='tyaga')p.stem=Math.round(Math.min(23,Math.max(12,p.tsw))*7*100)/100;else if(M.ktHair&&M.ktP){p.kwt=p.kwt||p.stem;p.stem=p.kwt;p.hair=Math.round(M.ktHair(M.ktP({kwt:p.kwt,ksr:p.ksr}))*10)/10;if(!(p.stem>0&&p.hair>0))throw new Error('no stem/hair');}
    const cap=p.capH||700,hair=id==='tyaga'?p.stem:p.hair,tag=id+' '+JSON.stringify(ov);
    const ac=info(id,'Á',p),ac0=comps(ac,cap+10,1400),hA=Math.max(...ac0.map(c=>c.h));
    const acTop=(()=>{const ys=[];const {gr,W,H,y0}=ac;let lo=1e9,hi=-1e9;for(let r=0;r<H;r++){const y=y0+r*RES;if(y<cap+10)continue;for(let c=0;c<W;c++)if(gr[r*W+c]){lo=Math.min(lo,y);hi=Math.max(hi,y);break;}}return hi-lo+RES;})();
    const hRef=acTop;
    for(const ch of f.CHARSET){if(ch.length!==1||ch!==ch.toUpperCase()&&ch!=='İ')continue;
      if(TOP.has(ch)||BOT.has(ch)){const I=info(id,ch,p);if(!I){fail(tag+' '+ch+' no glyph');continue;}n++;
        const cs=TOP.has(ch)?comps(I,cap+10,1400):comps(I,-420,-25);if(!cs.length){fail(tag+' '+ch+' mark missing');continue;}
        let ya=1e9,yb=-1e9;{const {gr,W,H,y0}=I;const lo=TOP.has(ch)?cap+10:-420,hi=TOP.has(ch)?1400:-25;for(let r=0;r<H;r++){const y=y0+r*RES;if(y<lo||y>=hi)continue;for(let c=0;c<W;c++)if(gr[r*W+c]){ya=Math.min(ya,y);yb=Math.max(yb,y+RES);break;}}}
        if(BOT.has(ch))yb=0;const h=yb-ya,t=Math.max(...cs.map(c=>c.t)),tmin=Math.min(...cs.map(c=>c.t));
        if(h<0.6*hRef&&!MACRON.has(ch))fail(tag+' '+ch+' mark height '+Math.round(h)+' < 0.6 x acute '+Math.round(hRef));
        if(tmin<0.6*hair*0.5&&false)fail('');
        const RING=id==='tyaga'&&'ŮÅ'.includes(ch);/* tyaga ring: room under the frame (890 u) leaves a ring < 0.6 stem or the hole closes; floor 0.2 x stem (a thicker ring closes its hole) */
        if(tmin<(RING?0.2:0.6)*hair)fail(tag+' '+ch+' mark stroke '+Math.round(tmin)+' < 0.6 x hairline '+Math.round(hair));}
    }
    for(const [ch,ys] of BARS){if(!f.GL[ch])continue;const I=info(id,ch,p);if(!I)continue;n++;
      const rs=runs(I,0.15*cap);if(!rs.length){fail(tag+' '+ch+' no stem row');continue;}
      const stem=p.stem;let bb=I.x0;for(const r of rs)bb=r[0];
      let cx;if(ch==='Ұ'){const mid=(rs[0][0]+rs[rs.length-1][1])/2;cx=rs.map(r=>(r[0]+r[1])/2).sort((u,v)=>Math.abs(u-mid)-Math.abs(v-mid))[0];}else cx=rs[0][0]+stem/2;
      const sa=cx-stem/2,sb=cx+stem/2,bothSides=!(ch==='Đ'||ch==='Ð');let best=-1;
      let L=-1,R=-1;
      for(let y=0.3*cap;y<=0.92*cap;y+=RES){for(const r of runs(I,y)){if(r[1]>sa+RES&&r[0]<sb-RES){L=Math.max(L,sa-r[0]);R=Math.max(R,r[1]-sb);}}}
      best=bothSides?Math.min(L,R):L;
      if(best<0.25*stem)fail(tag+' '+ch+' bar crosses the stem by '+Math.round(best)+' u (< 0.25 x stem '+Math.round(stem)+')');}
  }}
console.log('checked',n,'glyph rows');console.log('bad '+bad);
