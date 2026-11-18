const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../service/core21.js'), 'utf8');
const { impXml, svgImport } = new Function(source + '\nreturn { impXml, svgImport };')();

test('ordinary SVG still parses', () => {
  const result = impXml('<svg viewBox="0 0 100 100"><path d="M0 0L50 0L0 50Z"/></svg>');
  assert.equal(result.kids[0].tag, 'svg');
  assert.equal(result.kids[0].kids[0].tag, 'path');
});

test('deep SVG is rejected as complex without a stack overflow', () => {
  const source = '<svg>' + '<g>'.repeat(10000) + '</g>'.repeat(10000) + '</svg>';
  const result = svgImport(source);
  assert.equal(result.cs.length, 0);
  assert.ok(result.warn.includes('complex'));
});

test('oversized SVG element tree is rejected before traversing it', () => {
  const source = '<svg>' + '<g/>'.repeat(50000) + '</svg>';
  const result = svgImport(source);
  assert.equal(result.cs.length, 0);
  assert.ok(result.warn.includes('complex'));
});
