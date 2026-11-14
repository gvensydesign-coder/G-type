/* node pix/mkttf.js out.ttf style weightName|- '{"res":16,...}'   (weightName: Light|Regular|Bold|Black, '-' = raw params) */
const fs=require('fs');
const M=new Function(fs.readFileSync(__dirname+'/../core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,buildTTF,famParams};')();
const [,,out,style,wn,ov]=process.argv;
M.useFont('pixel');const f=M.FONTS.pixel;
let p=Object.assign({},f.DEFAULTS[style||'regular'],JSON.parse(ov||'{}'));
if(wn&&wn!=='-'){const o=JSON.parse(ov||'{}');p=M.famParams(Object.assign({},f.DEFAULTS[style||'regular'],o),wn);Object.assign(p,o.res!=null?{res:o.res}:{},o.pshape!=null?{pshape:o.pshape}:{},o.pgap!=null?{pgap:o.pgap}:{},o.pstag!=null?{pstag:o.pstag}:{},o.pserif!=null?{pserif:o.pserif}:{},o.ptr!=null?{ptr:o.ptr}:{});}
const st={family:f.family,edits:{},styles:{}};
for(const s of ['regular','italic'])st.styles[s]={p:s===(style||'regular')?p:f.DEFAULTS[s],lat:M.newLattice(),hg:[],kern:{}};
const r=M.buildTTF(style||'regular',st,{weight:400,weightName:wn&&wn!=='-'?wn:'Regular'});
fs.writeFileSync(out,Buffer.from(r.bytes));console.log('ok',out,r.bytes.length);
