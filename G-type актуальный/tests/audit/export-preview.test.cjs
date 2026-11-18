const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, process.argv[2] || '../../service/ui_port_x.js'), 'utf8');
const context = {
  window: {PROF: {}, PORT: {}}, document: {readyState: 'loading', addEventListener() {}},
  FONTS: {test: {CHARSET: [' ', '\u00a0', '\u2002', '\u2003', '\u2009', '\u202f', 'A', 'B']}},
  S: {fontId: 'test', styles: {regular: {}, italic: {}}},
  getFinal(c, style) { return {cs: c === 'A' || (c === 'B' && style === 'regular') ? [[1]] : []}; }
};
vm.createContext(context);
vm.runInContext(source.replace('const XP=', 'window.stats=xStats;const XP='), context);
const result = context.window.stats();
assert.equal(result.n, 2, 'whitespace must not count as drawable glyphs');
assert.deepEqual(Array.from(result.emp), ['B'], 'real missing italic contour must remain reported');
assert.equal(result.rows.find(r => r.label === 'Латиница').got, 1);
assert.equal(context.FONTS.test.CHARSET.length, 8, 'analysis must not change the charset');
console.log('PASS: whitespace exclusion, missing italic contour, coverage, charset immutability');
