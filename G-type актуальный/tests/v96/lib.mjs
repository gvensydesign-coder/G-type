import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PORT = 9418;
export const URL_ = "http://127.0.0.1:4177/g-type-v96.html";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function ensureServer(root) {
  try { const r = await fetch(URL_, { method: "HEAD" }); if (r.ok) return null; } catch {}
  const p = spawn("python3", ["-m", "http.server", "4177", "--bind", "127.0.0.1", "-d", "public"], { cwd: root, stdio: "ignore" });
  for (let i = 0; i < 50; i++) { await sleep(200); try { if ((await fetch(URL_, { method: "HEAD" })).ok) return p; } catch {} }
  throw new Error("server did not start");
}

export async function startChrome() {
  const p = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/chrome-h-${process.pid}`, "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 100; i++) { await sleep(200); try { await fetch(`http://127.0.0.1:${PORT}/json/version`); return p; } catch {} }
  throw new Error("chrome did not start");
}

export async function openPage() {
  const t = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pend = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const page = {
    send,
    async ev(expr) {
      const m = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (m.result.exceptionDetails) throw new Error("eval: " + (m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text));
      return m.result.result.value;
    },
    async viewport(w, h) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    },
    async goto(hash = "home", w = 1440, h = 900) {
      await page.viewport(w, h);
      await send("Storage.clearDataForOrigin", { origin: "http://127.0.0.1:4177", storageTypes: "all" });
      await send("Page.navigate", { url: `${URL_}?t=${Date.now()}#${hash}` });
      await sleep(500);
      for (let i = 0; i < 80; i++) {
        if (await page.ev(`document.readyState==="complete"&&!!document.querySelector(".rail")&&!!window.HEAT&&!!window.__GT_DISTORT_API&&location.hash==="#${hash}"`).catch(() => false)) break;
        await sleep(250);
      }
      await sleep(700);
    },
    async hash(h) { await page.ev(`location.hash=${JSON.stringify("#" + h)}`); await sleep(1800); },
    close() { try { ws.close(); } catch {} fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`).catch(() => {}); },
  };
  return page;
}

export const RAIL_JS = `(()=>{const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
return [...document.querySelectorAll('.rail button, .rail a, .rail [role=button]')].filter(vis).map(b=>(b.getAttribute('aria-label')||b.dataset.tip||b.title||b.textContent).trim())})()`;

export function fontInfo(buf) {
  const f = join(mkdtempSync(join(tmpdir(), "v96-")), "f.bin");
  writeFileSync(f, buf);
  const py = `import sys,json
from fontTools.ttLib import TTFont
f=TTFont(sys.argv[1]);cm=f.getBestCmap()
print(json.dumps({"glyphs":len(f.getGlyphOrder()),"cmap":len(cm),"flavor":f.flavor,"tables":sorted(f.keys())}))`;
  return JSON.parse(execFileSync("python3", ["-c", py, f]).toString());
}

export const magic = (buf) => Buffer.from(buf.slice(0, 4)).toString("latin1");

// ---- mini test framework ----
export function createSuite(name) {
  const results = [];
  const suite = {
    results,
    async check(label, fn, { pending = false } = {}) {
      let err;
      for (let a = 0; a < (pending ? 1 : 2); a++) {
        try { await fn(); err = null; break; } catch (e) { err = e; if (a === 0) await sleep(2500); }
      }
      const r = { name, label, ok: !err, pending, msg: err ? String(err.message || err) : "" };
      results.push(r);
      const tag = r.ok ? "PASS" : pending ? "PENDING" : "FAIL";
      console.log(`  ${tag}  ${label}${r.ok ? "" : "\n        " + r.msg.split("\n").join("\n        ")}`);
    },
  };
  return suite;
}
export function assert(c, m) { if (!c) throw new Error(m || "assertion failed"); }
export function eq(a, b, m) { assert(JSON.stringify(a) === JSON.stringify(b), `${m || "not equal"}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
export function near(a, b, tol, m) { assert(Math.abs(a - b) <= tol, `${m || "not near"}: got ${a}, want ${b}±${tol}`); }

export const HOOK_JS = `(()=>{if(window.__cap)return;window.__cap=[];const o=URL.createObjectURL.bind(URL);URL.createObjectURL=function(b){try{if(b instanceof Blob)window.__cap.push({blob:b})}catch(e){}return o(b)};
const ac=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__cap.push({name:this.download,href:this.href});return ac.apply(this,arguments)}})()`;

// Export one format from the «Скачать» menu; returns {name, bytes:Buffer}.
export async function exportFormat(page, fmt) {
  await page.ev(HOOK_JS);
  await page.ev(`window.__cap.length=0`);
  await page.ev(`(()=>{const m=document.querySelector('#ex-list');if(m.hidden)document.querySelector('#ex-menu').click()})()`);
  await sleep(300);
  await page.ev(`document.querySelector('#onb-skip')?.click()`);
  await page.ev(`document.querySelector('#ex-list [data-x="ttf"]').click()`);
  await sleep(600);
  await page.ev(`document.querySelector('#xpv [data-xf="${fmt}"]').click()`);
  await sleep(200);
  await page.ev(`document.querySelector('#xpv [data-xa="go"]').click()`);
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const n = await page.ev(`window.__cap.filter(c=>c.name).length`);
    if (n) break;
  }
  const r = await page.ev(`(async()=>{const a=window.__cap.filter(c=>c.name).pop();if(!a)return null;const r=await fetch(a.href);const b=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return {name:a.name,b64:btoa(s)}})()`);
  if (!r) throw new Error("no download captured for " + fmt);
  return { name: r.name, bytes: Buffer.from(r.b64, "base64") };
}

export async function openEditor(page, w = 1440) {
  await page.goto("edit", w, 900);
  await page.ev(`document.querySelector('#onb-skip')?.click()`);
  await sleep(300);
  const id = await page.ev(`(0,eval)("S").fontId`);
  assert(id === "volt", `editor opened with font ${id}, want volt`);
}

export async function openDistortGroup(page) {
  await page.ev(`(()=>{const pc=document.querySelector('#pcard');if(pc.dataset.open!=='1')document.querySelector('#rb-edit').click()})()`);
  await sleep(700);
  await page.ev(`(()=>{const g=document.querySelector('#gt-dst-grp');if(g.classList.contains('shut'))g.querySelector('h5').click()})()`);
  await sleep(500);
}

export async function setSlider(page, id, v) {
  await page.ev(`(()=>{const e=document.querySelector('#${id}');e.value=${v};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await sleep(500);
}

// Per-table sfnt comparison. The export stamps head.created/modified (and so
// head.checkSumAdjustment) with the wall clock, so those 20 bytes are masked.
export function sfntTables(buf) {
  const n = buf.readUInt16BE(4), out = {};
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16, tag = buf.toString("latin1", o, o + 4);
    const off = buf.readUInt32BE(o + 8), len = buf.readUInt32BE(o + 12);
    const d = Buffer.from(buf.subarray(off, off + len));
    if (tag === "head") { d.fill(0, 8, 12); d.fill(0, 20, 36); }
    out[tag] = d;
  }
  return out;
}
export function diffSfnt(a, b) {
  const A = sfntTables(a), B = sfntTables(b), bad = [];
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (!A[k] || !B[k] || Buffer.compare(A[k], B[k])) bad.push(k);
  return bad;
}

// True for elements the user can actually see (not display:none, inert, aria-hidden, transparent).
export const VIS_FN = `const vis=e=>{const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
for(let n=e;n&&n.nodeType===1;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;
if(n.hasAttribute('inert')||n.hasAttribute('hidden')||n.getAttribute('aria-hidden')==='true')return false;}return true};`;
