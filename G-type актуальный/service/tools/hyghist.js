const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,famParams,finalGlyph,CHARSET,hygHas,outlineHygiene};')();
const id=process.argv[2];M.useFont(id);const f=M.FONTS[id];
const st={p:M.famParams(f.DEFAULTS.regular,'Regular'),lat:M.newLattice(),hg:[],kern:{}};
const bins={};let tot=0,types={};
const H=(g)=>{for(const c of g.cs)for(let i=0;i<c.nodes.length;i++){const L=c.nodes.length,p=c.nodes[(i+L-1)%L],q=c.nodes[i],r=c.nodes[(i+1)%L];
 const ha=M.hygHas(q,'a'),hb=M.hygHas(q,'b');const un=(x,y)=>{const l=Math.hypot(x,y);return l>1e-6?[x/l,y/l]:null};
 const a=ha?un(q.x-q.a.x,q.y-q.a.y):un(q.x-p.x,q.y-p.y),b=hb?un(q.b.x-q.x,q.b.y-q.y):un(r.x-q.x,r.y-q.y);if(!a||!b)continue;
 const ang=Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1])))*180/Math.PI;tot++;
 const k=(ha||hb)?(ha&&hb?'cc':'cl'):'ll';const bn=ang<1?'0-1':ang<4?'1-4':ang<18?'4-18':ang<45?'18-45':'45+';bins[k+bn]=(bins[k+bn]||0)+1;}};
for(const ch of M.CHARSET){const g=M.finalGlyph(ch,st,{},{hyg:false});if(g&&g.cs&&g.cs.length)H(g);}
console.log(id,'nodes',tot,JSON.stringify(bins));
