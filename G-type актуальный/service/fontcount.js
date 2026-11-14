// prints the number of registered fonts (derived from the registry, so check.sh needs no hard-coded count)
const fs=require('fs');
const n=new Function(fs.readFileSync(__dirname+'/core_all.js','utf8')+'\nreturn Object.keys(FONTS).length;')();
console.log(n);
