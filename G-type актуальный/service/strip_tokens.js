// usage: node --expose-internals cmp_tokens.js debug.html strip.html  -> compares JS token streams of all <script> blocks
const fs = require('fs');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const zlib = require('zlib');
const B91 = []; let nb = 0; for (let c = 33; c < 127; c++) if (c !== 39 && c !== 60 && c !== 92) B91[c] = nb++;
const unb = s => { const o = []; let v = -1, b = 0, n = 0; for (let i = 0; i < s.length; i++) { const d = B91[s.charCodeAt(i)]; if (d === undefined) continue; if (v < 0) v = d; else { v += d * 91; b |= v << n; n += (v & 8191) > 88 ? 13 : 14; do { o.push(b & 255); b >>= 8; n -= 8; } while (n > 7); v = -1; } } if (v > -1) o.push((b | v << n) & 255); return Buffer.from(o); };
// plain <script> blocks, then the compressed bundles (Stage 5A: <script type="text/plain" id="zc|zu" data-n=..>base91(raw deflate)</script>) decoded in document order
const scripts = f => { const h = fs.readFileSync(f, 'utf8'); const o = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (const m of h.matchAll(/<script type="text\/plain" id="z[cum]" data-n="(\d+)">([\s\S]*?)<\/script>/g)) { const r = zlib.inflateRawSync(unb(m[2])).toString('utf8'); if (Buffer.byteLength(r) !== +m[1]) throw new Error('data-n mismatch'); o.push(r); }
  for (const m of h.matchAll(/<script type="text\/plain" id="zm" data-raw="1">([\s\S]*?)<\/script>/g)) o.push(m[1]);   // debug build: the lazy community block holds the plain source
  return o; };
const toks = src => { const o = []; for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest', allowHashBang: true })) o.push(t.type.label + '\u0001' + (t.value === undefined ? '' : (typeof t.value === 'object' && t.value && 'pattern' in t.value ? 're:' + t.value.pattern + '/' + t.value.flags : String(t.value)))); return o; };
const [a, b] = [scripts(process.argv[2]), scripts(process.argv[3])];
let bad = 0, total = 0;
for (let k = 0; k < Math.max(a.length, b.length); k++) {
  const ta = toks(a[k] || ''), tb = toks(b[k] || '');
  total += ta.length;
  if (ta.length !== tb.length) { console.log('script', k, 'token count differs', ta.length, tb.length); bad++; continue; }
  for (let i = 0; i < ta.length; i++) if (ta[i] !== tb[i]) { console.log('script', k, 'token', i, JSON.stringify(ta[i]).slice(0, 120), 'vs', JSON.stringify(tb[i]).slice(0, 120)); bad++; break; }
}
console.log('scripts', a.length, b.length, 'tokens', total, 'mismatches', bad);
process.exit(bad ? 1 : 0);
