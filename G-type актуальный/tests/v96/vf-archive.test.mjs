import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSuite, openPage, openEditor, HOOK_JS, sleep, assert } from "./lib.mjs";

const python = process.env.GTYPE_PYTHON || "python3";
const validate = `import io, json, sys, zipfile
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
z = zipfile.ZipFile(sys.argv[1])
assert z.testzip() is None, "ZIP CRC failed"
names = z.namelist()
ttfs = sorted(n for n in names if "/" not in n and (n.endswith("-VF.ttf") or n.endswith("-VF-Italic.ttf")))
assert len(ttfs) == 2 and any("-VF-Italic.ttf" in n for n in ttfs), names
assert len(names) == 4, names
for name in ttfs:
    wname = "woff2/" + name[:-4] + ".woff2"
    assert wname in names, (name, names)
    raw = z.read(name)
    assert raw[:4] in (b"\\x00\\x01\\x00\\x00", b"true"), name
    assert z.read(wname)[:4] == b"wOF2", wname
    a, b = TTFont(io.BytesIO(raw)), TTFont(io.BytesIO(z.read(wname)))
    for font in (a, b):
        for tag in ("fvar", "avar", "STAT", "HVAR", "gvar"):
            assert tag in font, (name, tag)
        axes = font["fvar"].axes
        expected = {"wght": (300, 400, 900), "wdth": (83, 100, 125) if "Italic" in name else (80, 100, 121), "opsz": (8, 14, 72)}
        if "Italic" not in name: expected["slnt"] = (-12, 0, 0)
        assert [axis.axisTag for axis in axes] == list(expected), (name, [axis.axisTag for axis in axes])
        assert all((axis.minValue, axis.defaultValue, axis.maxValue) == expected[axis.axisTag] for axis in axes), (name, [(axis.axisTag, axis.minValue, axis.defaultValue, axis.maxValue) for axis in axes])
        assert len(font["fvar"].instances) >= 4, (name, len(font["fvar"].instances))
        assert len(font.getBestCmap()) > 100, name
        inst = instancer.instantiateVariableFont(font, {"wght": axes[0].defaultValue}, inplace=False)
        assert inst.getBestCmap() == font.getBestCmap(), name
    assert a.getBestCmap() == b.getBestCmap(), name
    assert a.getGlyphOrder() == b.getGlyphOrder(), name
    assert a["hmtx"].metrics == b["hmtx"].metrics, name
    assert a["head"].unitsPerEm == b["head"].unitsPerEm, name
    assert (a["hhea"].ascent, a["hhea"].descent) == (b["hhea"].ascent, b["hhea"].descent), name
    for tag in ("GSUB", "GPOS"):
        assert (tag in a) == (tag in b), (name, tag)
print(json.dumps({"files": names, "styles": len(ttfs)}))`;

export default async function run() {
  const t = createSuite("vf-archive");
  const page = await openPage();
  try {
    await openEditor(page);
    await t.check("variable ZIP contains valid regular and italic TTF/WOFF2", async () => {
      await page.ev(HOOK_JS);
      await page.ev("window.__cap.length=0");
      await page.ev("document.querySelector('#ex-menu').click()");
      await sleep(300);
      await page.ev("document.querySelector('#ex-list [data-x=vf]').click()");
      await sleep(300);
      await page.ev("(()=>{const p=document.querySelector('#xpv');if(p&&!p.hidden)p.querySelector('[data-xa=go]').click()})()");
      let done = false;
      for (let i = 0; i < 600; i++) {
        await sleep(500);
        done = await page.ev("window.__cap.some(c=>c.name&&c.name.endsWith('-VF.zip'))&&document.querySelector('#ex-menu').getAttribute('aria-busy')!=='true'");
        if (done) break;
      }
      assert(done, "variable ZIP download did not complete");
      const captured = await page.ev(`(async()=>{const a=window.__cap.find(c=>c.name&&c.name.endsWith('-VF.zip'));const b=window.__cap.filter(c=>c.blob).pop();if(!b)throw new Error("ZIP blob missing");const bytes=new Uint8Array(await b.blob.arrayBuffer());if(bytes[0]!==80||bytes[1]!==75)throw new Error("captured blob is not a ZIP");let s="";for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));return {name:a.name,b64:btoa(s)}})()`);
      assert(captured.name.endsWith("-VF.zip"), captured.name);
      const path = join(mkdtempSync(join(tmpdir(), "gtype-vf-")), "font.zip");
      writeFileSync(path, Buffer.from(captured.b64, "base64"));
      const report = JSON.parse(execFileSync(python, ["-c", validate, path], { timeout: 120000 }).toString());
      assert(report.styles === 2, "missing VF styles");
    });
  } finally { page.close(); }
  return t.results;
}
