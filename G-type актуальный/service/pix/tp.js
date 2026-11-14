/* topology profile of chars across resolutions: node pix/tp.js "&€" [pw] [serif] */
const S=require('./sheet.js');
function topo(cells){const set=new Set(cells.map(c=>c[0]+','+c[1]));let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cells){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 x0--;y0--;x1++;y1++;const W=x1-x0+1,H=y1-y0+1;const m=new Uint8Array(W*H);for(const [x,y] of cells)m[(y-y0)*W+(x-x0)]=1;
 const lab=v=>{const L=new Int32Array(W*H);let n=0,r=[];for(let i=0;i<W*H;i++){if(m[i]!==v||L[i])continue;n++;const st=[i];L[i]=n;let b=false,s=0;while(st.length){const k=st.pop();s++;const x=k%W,y=(k-x)/W;if(!x||!y||x===W-1||y===H-1)b=true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(m[j]===v&&!L[j]){L[j]=n;st.push(j);}}}r.push([s,b]);}return r;};
 return lab(1).length+'/'+lab(0).filter(a=>!a[1]).length;}
const [,,str,pw,serif]=process.argv;
for(const ch of str){let l=ch+' ';for(let r=6;r<=24;r++){const g=S.glyph(ch,r,+pw||1.5,+serif||0);l+=(g?topo(g.cells):'-')+' ';}console.log(l);}
