import { createSuite, openPage, openEditor, assert } from "./lib.mjs";

export default async function run() {
  const t = createSuite("heatmap");
  const page = await openPage();
  try {
    await openEditor(page);
    await t.check("default Вольт sample scores 100", async () => {
      const sc = await page.ev(`HEAT.run(HEAT.TEXT).score`);
      assert(sc === 100, "score " + sc);
    });
    await t.check("kerning pair НО −160 is flagged and lowers the score", async () => {
      const r = await page.ev(`(()=>{const tx="НО НОЧИ НОМЕР ЖЕЛЕЗО";const st=S.styles[S.style]||S.styles.regular;
        const hit=r=>r.items.filter(i=>i.t==='pair'&&(i.a||'')+(i.b||'')==='НО');
        const b=HEAT.run(tx);const bs=Math.max(...hit(b).map(i=>i.sev||0));
        const ok=kernApply(st,'Н','О',-160,'exc');let a;try{a=HEAT.run(tx)}finally{kernReset(st,'Н','О')}
        const after=HEAT.run(tx);
        return {ok,hits:hit(a).length,sev:Math.max(...hit(a).map(i=>i.sev||0)),dev:Math.min(...hit(a).map(i=>i.dev)),b:b.score,a:a.score,bs,restored:after.score}})()`);
      assert(r.ok, "kernApply refused НО −160");
      assert(r.bs === 0, "НО flagged before kerning change (sev " + r.bs + ")");
      assert(r.hits > 0 && r.sev > 0.1, `НО not flagged: hits ${r.hits}, severity ${r.sev}`);
      assert(r.dev < -0.1, "flagged as too tight expected, dev " + r.dev);
      assert(r.a < r.b, `score did not drop: ${r.b} -> ${r.a}`);
      assert(r.restored === 100, "score not restored after reset: " + r.restored);
    });
  } finally { page.close(); }
  return t.results;
}
