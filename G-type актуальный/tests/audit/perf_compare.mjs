import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureServer, startChrome, openPage, openEditor, exportFormat, sleep } from "../v96/lib.mjs";

const root = process.cwd();
const html = join(root, "public", "g-type-v96.html");
const current = readFileSync(html);
const baseline = readFileSync(process.env.GTYPE_BASELINE_HTML);
const server = await ensureServer(root);
const chrome = await startChrome();

async function measure(version) {
  const page = await openPage();
  try {
    await openEditor(page);
    await page.send("Performance.enable");
    const out = [];
    for (const font of ["volt", "propis"]) {
      if (font === "propis") {
        await page.goto("library");
        await page.ev(`document.querySelector("#onb-skip")?.click()`);
        await page.ev(`document.querySelector("#view-library .lcard[data-font=propis]").click()`);
        for (let i = 0; i < 40; i++) {
          if (await page.ev(`(0,eval)("S").fontId==="propis"&&(0,eval)("S").tab==="edit"`)) break;
          await sleep(250);
        }
      }
      const start = performance.now();
      const result = await exportFormat(page, "ttf");
      const durationMs = Math.round(performance.now() - start);
      await page.send("HeapProfiler.collectGarbage");
      const metrics = await page.send("Performance.getMetrics");
      const heap = metrics.result?.metrics?.find(x => x.name === "JSHeapUsedSize")?.value;
      out.push({ version, font, durationMs, bytes: result.bytes.length, heapBytes: heap ?? null });
    }
    return out;
  } finally { page.close(); }
}

try {
  for (const version of ["current", "baseline", "baseline", "current"]) {
    writeFileSync(html, version === "current" ? current : baseline);
    for (const row of await measure(version)) console.log("PERF_RESULT " + JSON.stringify(row));
  }
} finally {
  writeFileSync(html, current);
  chrome.kill();
  server?.kill();
}
