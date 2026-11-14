const S=require('./sheet.js');
const [,,str,res,pw,serif]=process.argv;
const gs=[...str].map(ch=>{const g=S.glyph(ch,+res||12,+pw||1.5,+serif||0);return g?g.cells:[];});
let y1=-99,y0=99;for(const cs of gs)for(const [x,y] of cs){y1=Math.max(y1,y);y0=Math.min(y0,y);}
const lines=[];for(let y=y1;y>=y0;y--){let l='';for(const cs of gs){if(!cs.length){l+='  ';continue;}let x0=1e9,x1=-1e9;for(const c of cs){x0=Math.min(x0,c[0]);x1=Math.max(x1,c[0]);}
  const m=new Map(cs.map(c=>[c[0]+','+c[1],c[2]]));for(let x=x0;x<=x1;x++){const v=m.get(x+','+y);l+=v?(v===3?'+':v===2?'o':'#'):'.';}l+='  ';}lines.push(l);}
console.log(lines.join('\n'));
