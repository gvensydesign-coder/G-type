import { diffSfnt, createSuite, openPage, openEditor, openDistortGroup, setSlider, exportFormat, fontInfo, assert, eq, sleep } from "./lib.mjs";

export default async function run() {
  const t = createSuite("distort");
  const page = await openPage();
  try {
    await openEditor(page);
    const baseline = await exportFormat(page, "ttf");
    await openDistortGroup(page);

    await t.check("«Искажение» group is inside the «Настройки» drawer, right after «Наклон и ритм»", async () => {
      const r = await page.ev(`(()=>{const h=[...document.querySelectorAll('#pcard #params > .grp > h5, #pcard #params h5')].map(e=>e.textContent.trim());
        const g=document.querySelector('#gt-dst-grp');return {h,inDrawer:!!g.closest('#pcard'),vis:g.offsetWidth>0,
        prev:g.previousElementSibling&&g.previousElementSibling.querySelector('h5')?.textContent.trim()}})()`);
      assert(r.inDrawer && r.vis, "group missing or invisible: " + JSON.stringify(r));
      assert(r.h.indexOf("Искажение") === r.h.indexOf("Наклон и ритм") + 1, "order: " + r.h.join(" | "));
      eq(r.prev, "Наклон и ритм", "previous sibling group");
    });

    const px = () => page.ev(`(()=>{const c=document.querySelector('#dst-cv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0,ink=0;for(let i=0;i<d.length;i+=4){h=(h*31+d[i]+d[i+1]*3+d[i+2]*7+d[i+3]*11)|0;if(d[i+3]>0)ink++}return {h,ink,w:c.width,hh:c.height}})()`);
    await t.check("changing a slider changes the sample canvas pixels", async () => {
      await setSlider(page, "dst-r-twist", 0);
      const a = await px();
      assert(a.ink > 100, "sample canvas is empty: " + JSON.stringify(a));
      await setSlider(page, "dst-r-twist", 70);
      const b = await px();
      assert(a.h !== b.h, "canvas pixels did not change for twist=70");
      await setSlider(page, "dst-r-slant", 20);
      const c = await px();
      assert(c.h !== b.h, "canvas pixels did not change for slant=20");
    });

    await t.check("all-zero sliders export a TTF byte-identical to the baseline", async () => {
      await page.ev(`window.__GT_DISTORT_API.set({slant:0,sx:100,sy:100,jit:0,twist:0,lens:0,wave:0,noise:0,spikes:0,slice:0,pix:0})`);
      await sleep(600);
      assert(!(await page.ev(`window.__GT_DISTORT_API.active()`)), "distortion still active at zero");
      const z = await exportFormat(page, "ttf");
      assert(z.bytes.length === baseline.bytes.length, `size ${z.bytes.length} vs baseline ${baseline.bytes.length}`);
      const bad = diffSfnt(z.bytes, baseline.bytes);
      assert(!bad.length, "tables differ from baseline: " + bad.join(","));
    });

    await t.check("a non-zero effect exports a different, valid TTF", async () => {
      await setSlider(page, "dst-r-twist", 70);
      assert(await page.ev(`window.__GT_DISTORT_API.active()`), "distortion not active");
      const d = await exportFormat(page, "ttf");
      assert(diffSfnt(d.bytes, baseline.bytes).includes("glyf"), "distorted TTF has the same glyf table as baseline");
      const info = fontInfo(d.bytes);
      assert(info.glyphs > 100 && info.cmap > 100, "font looks empty: " + JSON.stringify(info));
    });
  } finally { page.close(); }
  return t.results;
}
