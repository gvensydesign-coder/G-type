import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { ensureServer, startChrome } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes("--strict");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = readdirSync(here).filter((f) => f.endsWith(".test.mjs") && (!only.length || only.some((o) => f.includes(o)))).sort();

const server = await ensureServer(resolve(here, "../.."));
const chrome = await startChrome();
const t0 = Date.now();
const all = [];
try {
  for (const f of files) {
    console.log(`\n# ${f}`);
    const tf = Date.now();
    try { all.push(...(await (await import(pathToFileURL(join(here, f)).href)).default())); }
    catch (e) { console.log(`  FAIL  ${f} crashed: ${e.message}`); all.push({ name: f, label: "crash", ok: false, pending: false, msg: e.message }); }
    console.log(`  (${Math.round((Date.now() - tf) / 1000)}s)`);
  }
} finally { chrome.kill(); server?.kill(); }
const pass = all.filter((r) => r.ok).length;
const fail = all.filter((r) => !r.ok && !r.pending).length;
const pend = all.filter((r) => !r.ok && r.pending).length;
console.log(`\n${pass} passed, ${fail} failed, ${pend} known-pending (latin m), ${Math.round((Date.now() - t0) / 1000)}s${strict ? " [--strict]" : ""}`);
process.exit(fail || (strict && pend) ? 1 : 0);
