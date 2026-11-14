// W96-F: the in-page Brotli encoder (core_woff2.js) against node's zlib.brotliDecompressSync on edge cases and random/structured data
const fs=require('fs'),z=require('zlib'),path=require('path');
const M=new Function(fs.readFileSync(path.join(__dirname,'..','core_all.js'),'utf8')+'\nreturn {brotliEncode};')();
let seed=12345;const rnd=()=>(seed=(Math.imul(seed,1103515245)+12345)>>>0)/4294967296;
const cases=[['empty',new Uint8Array(0)],['one',Uint8Array.of(7)],['two',Uint8Array.of(1,1)],['zeros 100k',new Uint8Array(100000)],
  ['run+lit',Uint8Array.from({length:5000},(_,i)=>i%97<60?65:(i*31)&255)],
  ['random 70k',Uint8Array.from({length:70000},()=>rnd()*256|0)],
  ['two symbols',Uint8Array.from({length:3000},()=>rnd()<.5?0:255)],
  ['text',fs.readFileSync(path.join(__dirname,'..','core3b.js'))],
  ['all 256',Uint8Array.from({length:256*8},(_,i)=>i&255)],
  ['sparse alphabet',Uint8Array.from({length:4000},()=>[3,9,200,17,64][rnd()*5|0])],
  ['big copy',(()=>{const a=new Uint8Array(200000);for(let i=0;i<64;i++)a[i]=rnd()*256|0;for(let i=64;i<a.length;i++)a[i]=a[i-64];return a;})()]];
let bad=0,tot=0;
for(const [n,d] of cases){const c=M.brotliEncode(d);let ok=false;try{ok=Buffer.from(z.brotliDecompressSync(Buffer.from(c))).equals(Buffer.from(d));}catch(e){}
  if(!ok){bad++;console.log('BAD',n);}tot+=d.length?c.length/d.length:0;}
console.log('brotli selftest cases',cases.length,'bad',bad);
process.exit(bad?1:0);
