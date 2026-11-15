import { createSuite, openPage, openEditor, exportFormat, magic, fontInfo, assert } from "./lib.mjs";

const FORMATS = [["ttf", ["\x00\x01\x00\x00", "true"], null], ["otf", ["OTTO"], null], ["woff", ["wOFF"], "woff"], ["woff2", ["wOF2"], "woff2"]];

export default async function run() {
  const t = createSuite("export");
  const page = await openPage();
  try {
    await openEditor(page);
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
      });
    }
  } finally { page.close(); }
  return t.results;
}
