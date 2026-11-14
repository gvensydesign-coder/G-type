const fs=require('fs');const src=fs.readFileSync('../core_all.js','utf8');
const V=new Function(src+';return FONTS.volt;')();
const S=require('./sheet.js');
const miss=[];for(const ch of V.CHARSET){if(ch===' '||ch===' '||ch===' '||ch===' ')continue;const g=S.glyph(ch,12,1.5,0);if(!g)miss.push(ch);}
console.log(V.CHARSET.length,miss.length,miss.join(' '));
