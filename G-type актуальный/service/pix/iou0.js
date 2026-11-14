// iou of two glyph recipes over res/pw (left aligned, cells): node pix/iou0.js О 0
const S=require('./sheet.js');const lim=require('./limits.json').table;
const [,,a,b]=process.argv;
function iou(A,B){const m=c=>{let x0=1e9,y0=1e9;for(const [x,y] of c){x0=Math.min(x0,x);y0=Math.min(y0,y);}return new Set(c.map(([x,y])=>(x-x0)+','+(y-y0)));};
 const sa=m(A),sb=m(B);let i=0;for(const k of sa)if(sb.has(k))i++;return i/(sa.size+sb.size-i);}
const out=[];
for(let r=6;r<=24;r++){const mx=lim[String(r)]||[3,3];const pws=[...new Set([1,1.5,2,2.5,3,3.5,4,5].filter(p=>p<=mx[0]).concat([mx[0]]))];
 const row=[];for(const pw of pws){const ga=S.glyph(a,r,pw,0),gb=S.glyph(b,r,pw,0);if(!ga||!gb)continue;row.push(pw+':'+iou(ga.cells,gb.cells).toFixed(2));}
 out.push('res'+r+' max'+mx[0]+' '+row.join(' '));}
console.log(out.join('\n'));
