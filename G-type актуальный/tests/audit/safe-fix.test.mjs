import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../../public/patches/heat.js', import.meta.url), 'utf8');
const start = source.indexOf('  function gv(');
const end = source.indexOf('  function wireFix(', start);
assert(start >= 0 && end > start);

function fixture(blocked = false) {
  const calls = [];
  const state = { styles: { regular: {} }, edits: {} };
  const ctx = {
    S: state,
    evalS: () => state,
    GL: {},
    FAST: {},
    kernOf: () => 0,
    window: {
      kernInfo: () => ({ blocked, hi: 20 }),
      kernApply: (_st, _a, _b, v) => calls.push(['apply', v]),
      snap: () => calls.push(['snap']),
      persist: () => calls.push(['persist']),
      schedule: () => calls.push(['schedule']),
      toast: (message) => calls.push(['toast', message]),
    },
  };
  const fix = runInNewContext(source.slice(start, end) + '\nsafeFix', ctx);
  const finding = { t: 'pair', key: 'regular', a: 'Н', b: 'О', items: [{ site: {
    PA: {}, PB: {}, dx: 0, n: 1, D: 1000, t: 400,
  } }] };
  const heat = { areaGap: (_a, _b, dx) => ({ a: dx, min: dx }), refresh: () => calls.push(['refresh']) };
  return { fix, finding, heat, state, calls };
}

const limited = fixture();
assert.equal(limited.fix(limited.finding, limited.heat), true);
assert.deepEqual(limited.calls.find(x => x[0] === 'apply'), ['apply', 20]);
assert.deepEqual(limited.state.edits, {}, 'pair fix must not silently change side bearings');
assert.match(limited.calls.find(x => x[0] === 'toast')[1], /предел/);

const blocked = fixture(true);
assert.equal(blocked.fix(blocked.finding, blocked.heat), true);
assert.equal(blocked.calls.some(x => x[0] === 'snap' || x[0] === 'apply'), false);

console.log('safeFix: limited and blocked pair cases passed');
