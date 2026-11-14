// usage: node tests/stress_cover.js check.sh  -> every registered font id appears in a stress lane of check.sh, every stress_*.js script is used
const fs=require('fs'),path=require('path');
const wk=path.join(__dirname,'..');
const ids=new Function(fs.readFileSync(path.join(wk,'core_all.js'),'utf8')+'\nreturn Object.keys(FONTS);')();
const sh=fs.readFileSync(process.argv[2]||path.join(wk,'check.sh'),'utf8').split('\n').filter(l=>/node[ ~](stress|kern_)/.test(l)||/stress150-|j_s150 |j_kern/.test(l)).join('\n');
const miss=ids.filter(id=>!new RegExp('(^|[^a-z])'+id+'([^a-z]|$)').test(sh)&&!sh.includes('stress_'+id+'.js'));
const scripts=fs.readdirSync(wk).filter(f=>/^stress_.*\.js$/.test(f)).filter(f=>!sh.includes(f));
console.log('fonts',ids.length,'missing stress lane:',miss.join(',')||'none','unused scripts:',scripts.join(',')||'none');
console.log(miss.length||scripts.length?'bad 1':'bad 0');
process.exit(miss.length||scripts.length?1:0);
