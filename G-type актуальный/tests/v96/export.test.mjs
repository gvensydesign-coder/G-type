import { createSuite, openPage, openEditor, exportFormat, magic, fontInfo, fontSignature, assert, eq, sleep } from "./lib.mjs";

const FORMATS = [["ttf", ["\x00\x01\x00\x00", "true"], null], ["otf", ["OTTO"], null], ["woff", ["wOFF"], "woff"], ["woff2", ["wOF2"], "woff2"]];

export default async function run() {
  const t = createSuite("export");
  const page = await openPage();
  try {
    await openEditor(page);
    const signatures = { volt: {}, propis: {} };
    for (const [fmt, magics, flavor] of FORMATS) {
      await t.check(`${fmt.toUpperCase()} export for Вольт is a valid font`, async () => {
        const r = await exportFormat(page, fmt);
        assert(r.name.toLowerCase().endsWith("." + fmt), "file name " + r.name);
        assert(r.bytes.length > 5000, "file too small: " + r.bytes.length);
        assert(magics.includes(magic(r.bytes)), "bad magic " + JSON.stringify(magic(r.bytes)));
        const info = fontInfo(r.bytes);
        assert(info.flavor === flavor, `flavor ${info.flavor}, want ${flavor}`);
        assert(info.cmap > 100 && info.glyphs > 100, "font looks empty: " + JSON.stringify(info));
        assert(fmt === "otf" ? info.tables.includes("CFF ") : info.tables.includes("glyf"), "outline table missing");
        signatures.volt[fmt] = fontSignature(r.bytes);
      });
    }
    await page.goto("library");
    await page.ev(`document.querySelector("#onb-skip")?.click()`);
    await page.ev(`document.querySelector("#view-library .lcard[data-font=propis]").click()`);
    for (let i = 0; i < 40; i++) {
      if (await page.ev(`(0,eval)("S").fontId==="propis"&&(0,eval)("S").tab==="edit"`)) break;
      await sleep(250);
    }
    await t.check("Пропись opens for export", async () => {
      assert(await page.ev(`(0,eval)("S").fontId==="propis"&&(0,eval)("S").tab==="edit"`), "font did not open");
    });
    for (const [fmt, magics, flavor] of FORMATS) {
      await t.check(`${fmt.toUpperCase()} export for Пропись is a valid font`, async () => {
        const r = await exportFormat(page, fmt);
        assert(r.name.toLowerCase().endsWith("." + fmt), "file name " + r.name);
        assert(r.bytes.length > 5000, "file too small: " + r.bytes.length);
        assert(magics.includes(magic(r.bytes)), "bad magic " + JSON.stringify(magic(r.bytes)));
        const info = fontInfo(r.bytes);
        assert(info.flavor === flavor, `flavor ${info.flavor}, want ${flavor}`);
        assert(info.cmap > 100 && info.glyphs > 100, "font looks empty: " + JSON.stringify(info));
        assert(fmt === "otf" ? info.tables.includes("CFF ") : info.tables.includes("glyf"), "outline table missing");
        signatures.propis[fmt] = fontSignature(r.bytes);
      });
    }
    for (const [font, byFormat] of Object.entries(signatures)) {
      await t.check(`${font}: Unicode, advances, metrics and OpenType features match across export formats`, async () => {
        const baseline = byFormat.ttf;
        assert(baseline, "TTF export missing");
        for (const ch of " AВм") assert(baseline.cmap.includes(ch.codePointAt(0)), `missing U+${ch.codePointAt(0).toString(16)}`);
        for (const [fmt] of FORMATS) eq(byFormat[fmt], baseline, `${font} ${fmt} differs from TTF`);
      });
    }
  } finally { page.close(); }
  return t.results;
}
