const S=require('./sheet.js');
const [,,str,res,pw,serif]=process.argv;
for(const ch of str){const g=S.glyph(ch,+res||12,+pw||1.5,+serif||0);if(!g){console.log(ch,'none');continue;}
 const cs=g.cells;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cs){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const m=new Map(cs.map(c=>[c[0]+','+c[1],c[2]]));console.log(ch);
 for(let y=y1;y>=y0;y--){let l='';for(let x=x0;x<=x1;x++){const v=m.get(x+','+y);l+=v?(v===3?'+':v===2?'o':'#'):'.';}console.log(l);}}
