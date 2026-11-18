const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, process.argv[2] || '../../service/ui_port_x.js'), 'utf8');
const original = fs.readFileSync(path.join(__dirname, '../../service/ui_c.js'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, '../../service/core3b.js'), 'utf8');
const names = fs.readFileSync(path.join(__dirname, '../../service/core21b.js'), 'utf8');
const specimen = fs.readFileSync(path.join(__dirname, '../../service/ui_d.js'), 'utf8');
const saved = [];
const c = { window: {PROF: {}, PORT: {}}, document: {readyState:'loading',addEventListener(){},createElement(){return {getContext(){return {fillRect(){}}},toBlob(fn){fn({arrayBuffer:async()=>new ArrayBuffer(0)})}}}},
  FONTS:{test:{family:'Fallback'}},CUR_FONT:'test', S:{fontId:'test',family:'Example',style:'regular',styles:{regular:{p:{}},italic:{p:{}}}},
  weightOf:()=>({weight:700,name:'Bold'}),ensureKern(){},saveFile:async name=>{saved.push(name);return true;},
  buildWOFF:async b=>b,buildWOFF2:async b=>b,toast(){},setTimeout:fn=>fn(),specimenSheet:()=>100,
  vfxOpts:()=>({uniwidth:true}),Uint8Array,ArrayBuffer};
vm.createContext(c);
for (const fn of ['psSafe','famOwn','famEff','psSafe0']) {
  const line=names.split('\n').find(l=>l.startsWith('function '+fn+'('));
  vm.runInContext(line,c);
}
const start=core.indexOf('function buildTTF('),end=core.indexOf('  /* глифы */',start);
vm.runInContext(core.slice(start,end)+'return {psName,bytes:new Uint8Array()};}',c);
vm.runInContext(original.slice(original.indexOf('async function exportStyle('),original.indexOf('/* ---------- семейство')),c);
vm.runInContext(specimen.slice(specimen.indexOf('async function exportSpecimen('),specimen.indexOf('/* ---------- 4.')),c);
vm.runInContext(source.replace('const XP=','window.files=xFiles;const XP='),c);
(async()=>{
  let cases=0;
  for(const family of ['Example','X'.repeat(80),''])for(const weight of ['Regular','Light','Bold','Black']){
    c.S.family=family;c.weightOf=()=>({weight:700,name:weight});
    for(const fmt of ['ttf','otf','woff','woff2']){
      saved.length=0;await c.exportStyle('regular',fmt);await c.exportStyle('italic',fmt);
      assert.deepEqual(Array.from(c.window.files(fmt,100),f=>f[0]),saved);cases++;
    }
    for(const style of ['regular','italic']){c.S.style=style;saved.length=0;await c.exportSpecimen();assert.equal(c.window.files('png',100)[0][0],saved[0]);cases++;}
  }
  c.S.family='Example';
  assert.equal(c.window.files('fam',100)[0][0],'Example-uniwidth-family.zip');
  assert.equal(c.window.files('vf',100)[0][0],'Example-VF-uniwidth.zip');
  c.vfxOpts=()=>({});
  assert.equal(c.window.files('fam',100)[0][0],'Example-family.zip');
  assert.equal(c.window.files('vf',100)[0][0],'Example-VF.zip');
  console.log('PASS: '+cases+' preview/actual download comparisons and 4 archive names');
})().catch(e=>{console.error(e);process.exitCode=1;});
