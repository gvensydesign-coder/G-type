require('../core_applik.js');
const A=APPLIK;const p=A.safe(Object.assign({},A.defaults,{stem:+process.argv[3]||150}));
for(const [id,lc] of [['Х',0],['Х',1],['Ш',1],['Я',1],['Ф',1],['Ж',1],['Н',1],['А',1],['О',1]]){
  const r=A.raw(id,!!lc,p,0);let y1=-1e9,y0=1e9;for(const c of r.contours)for(const n of c.nodes){y1=Math.max(y1,n.y);y0=Math.min(y0,n.y);}
  console.log(id,lc,'H',r.H,'dy',r.dy.toFixed(1),'top',y1.toFixed(0),'bot',y0.toFixed(0));}
