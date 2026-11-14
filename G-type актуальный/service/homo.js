const fs=require('fs');
const src=fs.readFileSync('core_all.js','utf8')+'\n'+fs.readFileSync('audit.js','utf8').split('\n').filter(l=>/^function (flat|raster)|^  (for|const|if|return|pts|  )/.test(l)).join('\n');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,finalGlyph,GL,flatC};')();
const pairs=['AА','BВ','EЕ','KК','MМ','HН','OО','PР','CС','TТ','XХ','aа','eе','oо','pр','cс','xх','yу','iі','jј','sѕ','ÏЇ'];
function rast(cs,x0,y0,W,H,R){const wn=new Int16Array(W*H);for(const c of cs){const P=M.flatC(c,12);for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(a[1]===b[1])continue;const d=b[1]>a[1]?1:-1,lo=Math.min(a[1],b[1]),hi=Math.max(a[1],b[1]);
 for(let r=0;r<H;r++){const y=y0+(r+0.5)*R;if(y<lo||y>=hi)continue;const x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);const q0=Math.max(0,Math.ceil((x-x0)/R-0.5));for(let q=q0;q<W;q++)wn[r*W+q]+=d;}}}return wn;}
const ids=process.argv[2]?process.argv[2].split(','):Object.keys(M.FONTS);
const SKIP={kortes:['yу'],stsepka:['yу'],nit:['aа','pр']};/* «Нить»: латинские a и p — настоящие рукописные формы (одноэтажная a, p с выносным), кириллические а, р — капитель; остальные пары — один и тот же знак *//* «Сцепка»: латинская y (от Y) и кириллическая у (от У) нарисованы по разным рецептам — утверждено заказчиком */
for(const id of ids){M.useFont(id);const f=M.FONTS[id];const p={...f.DEFAULTS.regular,rough:0,slant:0};const st={p,lat:M.newLattice(),hg:[],kern:{}};
 const bad=[];
 for(const pr of pairs){if((SKIP[id]||[]).includes(pr))continue;const [l,c]=[...pr];if(!f.GL[l]||!f.GL[c])continue;
  const g1=M.finalGlyph(l,st,{},{slant:false}),g2=M.finalGlyph(c,st,{},{slant:false});
  const R=6,x0=-300,y0=-400,W=Math.ceil(1900/R),H=Math.ceil(1500/R);
  const a=rast(g1.cs,x0,y0,W,H,R),b=rast(g2.cs,x0,y0,W,H,R);let i=0,u=0;for(let k=0;k<W*H;k++){const A=a[k]!==0,B=b[k]!==0;if(A&&B)i++;if(A||B)u++;}
  const iou=u?i/u:1;const dw=Math.round(g1.adv-g2.adv);if(iou<0.985||Math.abs(dw)>4)bad.push(`${l}${c} iou=${iou.toFixed(3)} dAdv=${dw}`);}
 console.log(id.padEnd(8),bad.join(' | ')||'ok');}
console.log('fonts',ids.length);
