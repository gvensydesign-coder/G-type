/* node tools/nz_dump.js 'chars' '{"nlw":5,...}' [raw]  -> JSON {ch:{adv,cs:[{hole,pts:[[x,y]..]}]}} (product glyph through the safety net, or raw with 3rd arg) */
const M=require('./nz_load.js');M.useFont('nit');const Z=M.NZS,F=M.FONTS.nit;
const chars=[...process.argv[2]],ov=JSON.parse(process.argv[3]||'{}'),raw=process.argv[4]==='raw';
const p=M.paramLimits({...F.DEFAULTS.regular,...ov},'nit').q,out={};
for(const ch of chars){const r=raw?Z.build(ch,Z.eng(p)):Z.get(ch,p);out[ch]={adv:r.adv,fb:r.fallback||'',cs:r.cs.map(c=>({hole:c.hole,pts:M.flatC(c,10)}))};}
console.log(JSON.stringify(out));
