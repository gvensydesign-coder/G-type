/* node deco_make_d1.js outdir [fonts] [variants]: TTF каждого шрифта × декоративного варианта (параметры по умолчанию) */
const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,buildTTF,famParams,weightOf,decoMeasureSt,dcResolve,dcShape,dcFitLoops};')();
const out=process.argv[2]||'out_deco';fs.mkdirSync(out,{recursive:true});
const fonts=(process.argv[3]||Object.keys(M.FONTS).join(',')).split(',');
const VAR={outline:['outline',{}],inline_in:['inline_in',{}],inline_out:['inline_out',{}],shadow_block:['shadow',{variant:'block'}],shadow_solid:['shadow',{variant:'solid'}],shadow_hatch:['shadow',{variant:'hatch'}],cameo:['cameo',{}]};
const vars=(process.argv[4]||Object.keys(VAR).join(',')).split(',');
for(const id of fonts){M.useFont(id);const f=M.FONTS[id];
  const DW=process.env.DECO_W,DS=process.env.DECO_STY||'regular';/* optional: DECO_W=Light|Bold|Black, DECO_STY=italic (family weights; default build unchanged) */
  const p0=DW?M.famParams(f.DEFAULTS[DS],DW):{...f.DEFAULTS[DS]};
  const st={family:f.family,edits:{},styles:{[DS]:{p:p0,lat:M.newLattice(),hg:[],kern:{}}}};
  M.buildTTF(DS,st,{});
  const meta={m:M.decoMeasureSt(st.styles[DS],{},id),R:{},ms:{}};
  for(const v of vars){const [style,params]=VAR[v];const t=process.cpuUsage().user;
    const r=M.buildTTF(DS,st,{decorate:{style,params}});
    fs.writeFileSync(`${out}/${id}-${v}.ttf`,Buffer.from(r.bytes));
    meta.R[v]=M.dcResolve({style,params},meta.m);meta.ms[v]=Math.round((process.cpuUsage().user-t)/1e3);
    console.log(id,v,Math.round((process.cpuUsage().user-t)/1e3),'ms',r.bytes.length,r.glyphCount,JSON.stringify(M.dcShape.st||{}),'lost',M.dcFitLoops.lost||0);M.dcShape.st={calls:0,bad:0,shrink:0};M.dcFitLoops.lost=0;}
  fs.writeFileSync(`${out}/${id}-meta.json`,JSON.stringify(meta));}
