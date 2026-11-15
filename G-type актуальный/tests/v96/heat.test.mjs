import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSuite, openPage, openEditor, assert, sleep } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PAPER = resolve(here, "fixtures/blank-partial.png");

const skipTours = (page) => page.ev(`document.querySelector('.tour-skip')?.click();document.querySelector('#onb-skip')?.click()`);

async function openHash(page, hash) {
  await page.ev(`location.hash=${JSON.stringify("#" + hash)}`);
  await sleep(2500);
  await skipTours(page);
  await sleep(500);
}
async function setFiles(page, selector, files) {
  const doc = (await page.send("DOM.getDocument", { depth: 1 })).result.root.nodeId;
  const q = (await page.send("DOM.querySelector", { nodeId: doc, selector })).result.nodeId;
  await page.send("DOM.setFileInputFiles", { nodeId: q, files });
}
async function waitFor(page, expr, tries = 40, ms = 1000) {
  for (let i = 0; i < tries; i++) {
    if (await page.ev(expr)) return true;
    await sleep(ms);
  }
  return false;
}

// Glyph outlines of a library font as one SVG per letter, named uniXXXX.svg (the import dialog maps the name to the letter).
async function svgFixtures(page, letters) {
  const dir = mkdtempSync(join(tmpdir(), "v96-svg-"));
  const svgs = JSON.parse(await page.ev(`(()=>{const o={};for(const ch of ${JSON.stringify(letters)}){const g=getFinal(ch,'regular');if(!g||!g.cs.length)continue;
    let d='';for(const c of g.cs){const P=flatC(c,6);if(P.length)d+='M'+P.map(p=>p[0].toFixed(1)+' '+(1000-p[1]).toFixed(1)).join('L')+'Z';}
    o[ch]='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(Math.ceil(g.adv)+40)+' 1300"><path fill-rule="nonzero" d="'+d+'" transform="translate(20 100)"/></svg>';}
    return JSON.stringify(o)})()`));
  const files = [];
  for (const [ch, svg] of Object.entries(svgs)) {
    const f = join(dir, "uni" + ch.codePointAt(0).toString(16).padStart(4, "0") + ".svg");
    writeFileSync(f, svg);
    files.push(f);
  }
  return files;
}

// Rectangles on the modular grid of the drawing screen (1440x900): letters made of blocks.
const BLOCKS = {
  Н: [[0, 0, 1, 7], [3, 0, 4, 7], [1, 3, 3, 4]], П: [[0, 0, 1, 7], [3, 0, 4, 7], [0, 6, 4, 7]],
  О: [[0, 0, 4, 1], [0, 6, 4, 7], [0, 0, 1, 7], [3, 0, 4, 7]], Е: [[0, 0, 1, 7], [1, 0, 4, 1], [1, 3, 3, 4], [1, 6, 4, 7]],
  Л: [[0, 0, 1, 6], [3, 0, 4, 7], [0, 6, 4, 7]], Р: [[0, 0, 1, 7], [1, 6, 4, 7], [1, 3, 4, 4], [3, 3, 4, 7]],
  С: [[0, 0, 1, 7], [1, 0, 4, 1], [1, 6, 4, 7]], К: [[0, 0, 1, 7], [1, 3, 3, 4], [3, 4, 4, 7], [3, 0, 4, 3]],
  н: [[0, 0, 1, 5], [3, 0, 4, 5], [1, 2, 3, 3]], о: [[0, 0, 4, 1], [0, 4, 4, 5], [0, 0, 1, 5], [3, 0, 4, 5]],
  п: [[0, 0, 1, 5], [3, 0, 4, 5], [0, 4, 4, 5]], е: [[0, 0, 1, 5], [1, 0, 4, 1], [1, 2, 3, 3], [1, 4, 4, 5]],
  л: [[0, 0, 1, 4], [3, 0, 4, 5], [0, 4, 4, 5]], с: [[0, 0, 1, 5], [1, 0, 4, 1], [1, 4, 4, 5]],
};
const key = (page, k, code, vk) => page.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }).then(() => page.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }));
// mode: "shape" (rectangle tool, drag), "pen" (corner clicks, close on the first point, Enter), "stroke" (drag a line per stem).
async function drawLetters(page, letters, mode = "shape", X0 = 509) {
  const CW = 62.6, BASE = 633, RH = 62.6;
  const mouse = (t, x, y, down) => page.send("Input.dispatchMouseEvent", { type: t, x, y, button: t === "mouseMoved" && !down ? "none" : "left", buttons: down ? 1 : 0, clickCount: 1 });
  const tool = async (name) => { await page.ev(`[...document.querySelectorAll('.dr-ib')].find(b=>(b.getAttribute('aria-label')||b.title||'').trim()===${JSON.stringify(name)}).click()`); await sleep(300); };
  if (mode === "pen") await tool("Перо");
  if (mode === "stroke") await tool("Штрих");
  for (const ch of letters) {
    await page.ev(`(()=>{const b=[...document.querySelectorAll('.dr-gl')].find(b=>(b.getAttribute('aria-label')||'').split(',')[0]==='Знак ${ch}');b.click()})()`);
    await sleep(250);
    for (const [c0, r0, c1, r1] of BLOCKS[ch]) {
      if (mode === "pen") {
        for (const [c, r] of [[c0, r0], [c1, r0], [c1, r1], [c0, r1], [c0, r0]]) {
          const x = X0 + c * CW, y = BASE - r * RH;
          await mouse("mouseMoved", x, y, false); await sleep(60);
          await mouse("mousePressed", x, y, true); await sleep(30);
          await mouse("mouseReleased", x, y, false); await sleep(150);
        }
        await key(page, "Enter", "Enter", 13); await sleep(250);
        continue;
      }
      let xa, ya, xb, yb;
      if (mode === "shape") { xa = X0 + c0 * CW + 1; ya = BASE - r0 * RH - 1; xb = X0 + c1 * CW; yb = BASE - r1 * RH; }
      else if (r1 - r0 > c1 - c0) { xa = xb = X0 + ((c0 + c1) / 2) * CW; ya = BASE - (r0 + 0.3) * RH; yb = BASE - (r1 - 0.3) * RH; }
      else { ya = yb = BASE - ((r0 + r1) / 2) * RH; xa = X0 + (c0 + 0.3) * CW; xb = X0 + (c1 - 0.3) * CW; }
      await mouse("mouseMoved", xa, ya, false);
      await mouse("mousePressed", xa, ya, true);
      for (let i = 1; i <= 4; i++) await mouse("mouseMoved", xa + ((xb - xa) * i) / 4, ya + ((yb - ya) * i) / 4, true);
      await mouse("mouseReleased", xb, yb, false);
      await sleep(200);
    }
    if (mode === "stroke") { await key(page, "Enter", "Enter", 13); await sleep(200); }
    await page.ev(`document.querySelector('#dr-sv').click()`);
    await sleep(300);
  }
}

// The same, on a text made of the glyphs the user actually has (the sample text of a tiny font may contain none of them).
const LAB_OWN = `(()=>{const S=(0,eval)("S");const av=Object.keys(IMP.glyphs).filter(c=>/\\p{L}/u.test(c));const w=[];for(let i=0;i<av.length;i+=4)w.push(av.slice(i,i+4).join(''));
  const r=HEAT.run(w.join(' '),'regular',60);const p=HEAT.run(HEAT.TEXT,'regular',24,900);
  return {font:S.fontId,tab:S.tab,on:HEAT.on,score:r.score,proof:p.score,used:r.gtUsed,glyphs:av.length,finite:r.items.every(i=>isFinite(i.sev)&&isFinite(i.dev))}})()`;
const LAB_STATE = `(()=>{const S=(0,eval)("S");const t=S.text||'';const r=HEAT.run(t,'regular',60);const p=HEAT.run(HEAT.TEXT,'regular',24,900);
  return {font:S.fontId,tab:S.tab,on:HEAT.on,last:HEAT.last?HEAT.last.score:null,score:r.score,proof:p.score,used:r.gtUsed,skipped:(r.gtSkipped||[]).length,items:r.items.length,
    finite:r.items.every(i=>isFinite(i.sev)&&isFinite(i.dev))}})()`;

// Heavy letter / extra field on the first letters of the font's own sample; returns the scores before, with each defect, and after restoring.
const DEFECTS = `(async()=>{const S=(0,eval)("S");const sl=ms=>new Promise(r=>setTimeout(r,ms));
  const T=smpDefault();const L=layout(T,'regular',60,4000);const cnt={},gnOf={};
  L.lines.forEach(l=>l.chars.forEach(c=>{if(/[А-Яа-яЁё]/.test(c.ch)){cnt[c.ch]=(cnt[c.ch]||0)+1;gnOf[c.ch]=c.gn||c.ch;}}));
  const ok=c=>{const g=window.gfSmart(gnOf[c],'regular');return g&&g.cs&&g.cs.length};
  const cands=Object.keys(cnt).filter(ok).sort((a,b)=>cnt[b]-cnt[a]);
  const H=cands[0],F=cands[1]||cands[0];
  const sc=()=>HEAT.run(T,'regular',60).score;
  const base=sc();const orig=window.gfSmart;
  window.gfSmart=function(ch,key){const g=orig.apply(this,arguments);if(!g||!g.cs||ch!==gnOf[H])return g;const cs=g.cs.slice();
    for(const c of g.cs)cs.push(Object.assign({},c,{nodes:c.nodes.map(n=>({x:n.x+60,y:n.y,a:n.a&&{x:n.a.x+60,y:n.a.y},b:n.b&&{x:n.b.x+60,y:n.b.y}}))}));return Object.assign({},g,{cs});};
  const heavy=sc();window.gfSmart=orig;
  const adv=window.gfSmart(gnOf[F],'regular').adv;
  S.edits[F]={sbR:Math.round(adv*.4)};bump();const advMoves=Math.abs(window.gfSmart(gnOf[F],'regular').adv-adv)>1;const wide=sc();
  S.edits[F]={sbR:-Math.round(adv*.25)};bump();const tight=sc();
  delete S.edits[F];bump();const back=sc();
  return {H,F,base,heavy,wide,tight,back,advMoves}})()`;

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

    await t.check("all 19 fonts get a score on the default sample, the font's own text and the «Проверка» text", async () => {
      const r = await page.ev(`(async()=>{const ids=Object.keys(FONTS);const out={};const sl=ms=>new Promise(r=>setTimeout(r,ms));
        for(const id of ids){switchFont(id);await sl(200);ensureKern();await sl(100);const S=(0,eval)("S");
          const a=HEAT.run(smpDefault(),'regular',60),b=HEAT.run(S.text||smpDefault(),'regular',60),c=HEAT.run(HEAT.TEXT,'regular',24,900);
          out[id]=[a.score,b.score,c.score];}
        switchFont('volt');return out})()`);
      const ids = Object.keys(r);
      assert(ids.length >= 19, "fonts: " + ids.length);
      const bad = ids.filter((id) => r[id].some((v) => typeof v !== "number" || !isFinite(v) || v < 0 || v > 100));
      assert(!bad.length, "no score: " + bad.map((id) => id + " " + JSON.stringify(r[id])).join("; "));
      const low = ids.filter((id) => r[id][0] < 90);
      assert(!low.length, "even default sample below 90: " + low.map((id) => id + " " + r[id][0]).join(", "));
    });

    await t.check("a heavy letter or an extra side bearing lowers the score of every font, undoing it restores the score", async () => {
      const r = await page.ev(`(async()=>{const ids=Object.keys(FONTS);const out={};const sl=ms=>new Promise(r=>setTimeout(r,ms));
        for(const id of ids){switchFont(id);await sl(200);ensureKern();await sl(100);out[id]=await ${DEFECTS};}
        switchFont('volt');return out})()`);
      const miss = [], notBack = [];
      for (const [id, v] of Object.entries(r)) {
        if (!(Math.min(v.heavy, v.wide, v.tight) <= v.base - 2)) miss.push(`${id} base ${v.base} heavy ${v.heavy} wide ${v.wide} tight ${v.tight}`);
        if (v.advMoves && v.wide > v.base - 2) miss.push(`${id}: extra side bearing +0.4 not caught (${v.base} -> ${v.wide})`);
        if (v.back !== v.base) notBack.push(`${id} ${v.base} -> ${v.back}`);
      }
      assert(!miss.length, "defects not caught: " + miss.join("; "));
      assert(!notBack.length, "score not restored: " + notBack.join("; "));
    });

    await t.check("Пропись, Рывок, Капля, Аппликация: score present, intended irregularity is not a defect, a heavy letter is", async () => {
      const r = await page.ev(`(async()=>{const out={};const sl=ms=>new Promise(r=>setTimeout(r,ms));
        for(const id of ['propis','ryvok','kaplya','applik']){switchFont(id);await sl(200);ensureKern();await sl(100);out[id]=await ${DEFECTS};}
        switchFont('volt');return out})()`);
      for (const [id, v] of Object.entries(r)) {
        assert(typeof v.base === "number" && v.base >= 95, `${id}: base score ${v.base}`);
        assert(v.heavy <= v.base - 2, `${id}: heavy letter not caught (${v.base} -> ${v.heavy})`);
      }
    });

    await t.check("six spaces in a row land in «Сбои» (font with joins, library font)", async () => {
      const r = await page.ev(`(async()=>{const out={};const sl=ms=>new Promise(r=>setTimeout(r,ms));
        for(const id of ['volt','propis','modul']){switchFont(id);await sl(200);ensureKern();await sl(100);
          const T=smpDefault(),w=T.split(' '),mk=n=>w.slice(0,2).join(' '.repeat(n))+' '+w.slice(2).join(' ');
          const one=HEAT.run(mk(1),'regular',60),six=HEAT.run(mk(6),'regular',60);
          out[id]={one:one.score,six:six.score,oneW:one.top.some(f=>f.t==='word'),sixW:six.top.some(f=>f.t==='word')};}
        switchFont('volt');return out})()`);
      for (const [id, v] of Object.entries(r)) {
        assert(!v.oneW, `${id}: one space flagged`);
        assert(v.sixW, `${id}: six spaces not in «Сбои»`);
        assert(v.six < v.one, `${id}: score did not drop (${v.one} -> ${v.six})`);
      }
    });

    // ---- laboratory fonts ----
    await t.check("«Собрать из своих знаков»: SVG font gets a score automatically, skips unwritten letters with a neutral count", async () => {
      await page.goto("home", 1440, 900);
      await skipTours(page);
      const files = await svgFixtures(page, "нопаеткуслмиздяхбвгж");
      assert(files.length >= 15, "svg fixtures: " + files.length);
      await openHash(page, "import");
      await setFiles(page, "#imp-files", files);
      assert(await waitFor(page, `Object.keys(IMP.glyphs).length>=${files.length}&&!!FONTS.imp`), "glyphs not imported");
      await page.ev(`switchFont('imp');setTab('edit')`);
      await sleep(3500);
      const s = await page.ev(LAB_STATE);
      assert(s.font === "imp" && s.tab === "edit", JSON.stringify(s));
      assert(s.on, "heat map did not switch on by itself");
      assert(typeof s.score === "number" && s.used > 0, "no score: " + JSON.stringify(s));
      assert(s.finite, "NaN in items");
      assert(s.skipped > 0, "unwritten letters not skipped: " + JSON.stringify(s));
      const note = await page.ev(`(document.querySelector('#heatbar .heat-cnt')||{}).textContent||''`);
      assert(/В оценке \d+ знак/.test(note), "no count note: «" + note + "»");
    });
    await t.check("lab font: «Исправить» is offered where it applies and changes the font", async () => {
      await page.ev(`(0,eval)("S").edits['о']={sbR:260};bump()`);
      await sleep(400);
      await page.ev(`setTab('proof')`);
      assert(await waitFor(page, `!!(document.querySelector('#heat-rep')&&document.querySelector('#heat-rep .hr-score'))`, 30, 1000), "report not shown");
      const before = await page.ev(`({s:+document.querySelector('.hr-n b').textContent,btn:!!document.querySelector('#heat-rep [data-rp=fixs],#heat-rep [data-rp=fix]'),note:!!document.querySelector('#heat-rep .hr-cnt-note')})`);
      assert(before.btn, "no «Исправить» for an extra side bearing");
      assert(before.note, "no neutral count note in the report");
      await page.ev(`document.querySelector('#heat-rep [data-rp=fixs],#heat-rep [data-rp=fix]').click()`);
      await sleep(3500);
      const after = await page.ev(`({s:+document.querySelector('.hr-n b').textContent,sb:((0,eval)("S").edits['o']||{}).sbR})`);
      assert(after.s > before.s, `score did not improve: ${before.s} -> ${after.s}`);
      assert(Math.abs(after.sb || 0) < 120, "side bearing not corrected: " + after.sb);
      await page.ev(`delete (0,eval)("S").edits['o'];bump()`);
    });
    await t.check("«Отрисовать свой шрифт»: drawn font (a partial set) gets a score automatically", async () => {
      await page.goto("home", 1440, 900);
      await skipTours(page);
      await openHash(page, "draw");
      await drawLetters(page, "НОПЕЛРСКнопелс");
      await page.ev(`document.querySelector('#dr-fontb').click()`);
      await sleep(1200);
      await page.ev(`document.querySelector('#dr-mfo').click()`);
      assert(await waitFor(page, `(0,eval)("S").fontId==='imp'&&(0,eval)("S").tab==='edit'`, 30, 1000), "font not created");
      await sleep(3500);
      const s = await page.ev(LAB_STATE);
      assert(s.on, "heat map did not switch on by itself");
      assert(typeof s.score === "number" && s.used >= 3, "no score: " + JSON.stringify(s));
      assert(typeof s.proof === "number", "no score in «Проверка»: " + JSON.stringify(s));
      assert(s.finite, "NaN in items");
    });
    await t.check("«С листа бумаги»: font from blank-partial.png gets a score, unwritten letters are skipped", async () => {
      await page.goto("home", 1440, 900);
      await skipTours(page);
      await openHash(page, "paper");
      await page.ev(`document.querySelector('#pp-to-photo').click()`);
      await sleep(800);
      await setFiles(page, "#pp-file", [PAPER]);
      await sleep(5000);
      await page.ev(`document.querySelector('#pp-to-check').click()`);
      await sleep(5000);
      await page.ev(`document.querySelector('#pp-to-font').click()`);
      await sleep(6000);
      await page.ev(`document.querySelector('#pp-commit').click()`);
      assert(await waitFor(page, `(0,eval)("S").fontId==='imp'&&(0,eval)("S").tab==='edit'`, 40, 1000), "font not created");
      await sleep(3500);
      const s = await page.ev(`(()=>{const S=(0,eval)("S");const r=HEAT.run('ПОЛК ТУРА ФОРТ КОРМ','regular',60);const q=HEAT.run(S.text,'regular',60);
        return {on:HEAT.on,score:r.score,own:q.score,used:r.gtUsed,glyphs:Object.keys(IMP.glyphs).length,skipped:(q.gtSkipped||[]).length,finite:r.items.every(i=>isFinite(i.sev)&&isFinite(i.dev))}})()`);
      assert(s.glyphs >= 15 && s.glyphs < 66, "partial font expected, glyphs " + s.glyphs);
      assert(s.on, "heat map did not switch on by itself");
      assert(typeof s.score === "number" && typeof s.own === "number", "no score: " + JSON.stringify(s));
      assert(s.skipped > 0, "unwritten letters not skipped");
      assert(s.finite, "NaN in items");
    });
    await t.check("paper font: open-sided pairs (С Т, Е Ж, Т У) are not flagged, a really touching pair is, and «Исправить» spreads it", async () => {
      const r = await page.ev(`(()=>{const r=HEAT.run('АБВГ ДЕЖК ЛМОП РСТУ ФШЩ','regular',60);
        const bad=r.items.filter(i=>i.t==='pair'&&i.sev>=0.25).map(i=>i.a+i.b);return {score:r.score,bad}})()`);
      assert(r.score >= 97 && !r.bad.length, "clean handwriting flagged: " + JSON.stringify(r));
      await page.ev(`(0,eval)("S").edits['O']={sbR:-140};bump()`);
      await sleep(400);
      await page.ev(`setTab('proof')`);
      assert(await waitFor(page, `!!document.querySelector('#heat-rep .hr-score')`, 30, 1000), "report not shown");
      const before = await page.ev(`({s:+document.querySelector('.hr-n b').textContent,t:[...document.querySelectorAll('#heat-rep .hr-bad p')].map(p=>p.textContent).join('|'),b:!!document.querySelector('#heat-rep [data-rp=fix]')})`);
      assert(/касаются/.test(before.t) && before.b, "touching pair not offered a fix: " + JSON.stringify(before));
      await page.ev(`document.querySelector('#heat-rep [data-rp=fix]').click()`);
      await sleep(4000);
      const after = await page.ev(`({s:+document.querySelector('.hr-n b').textContent,t:[...document.querySelectorAll('#heat-rep .hr-bad p')].map(p=>p.textContent).join('|')})`);
      assert(after.s > before.s && !/касаются/.test(after.t), `fix did not separate the pair: ${before.s} -> ${after.s}`);
      await page.ev(`delete (0,eval)("S").edits['O'];bump();setTab('edit')`);
    });
    await t.check("Ctrl+Z after an edit brings the lab font score back", async () => {
      await sleep(1500);
      const sc = `(()=>{const av=Object.keys(IMP.glyphs).filter(c=>/\\p{L}/u.test(c));const w=[];for(let i=0;i<av.length;i+=4)w.push(av.slice(i,i+4).join(''));return HEAT.run(w.join(' '),'regular',60).score})()`;
      const base = await page.ev(sc);
      await page.ev(`(()=>{const ch=Object.keys(IMP.glyphs).filter(c=>/\\p{L}/u.test(c))[1];snap();(0,eval)("S").edits[ch]={sbR:Math.round(getFinal(ch,'regular').adv*.4)};bump()})()`);
      await sleep(1200);
      const low = await page.ev(sc);
      await page.ev(`document.body.focus()`);
      await key(page, "z", "KeyZ", 90).catch(() => {});
      await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "z", code: "KeyZ", windowsVirtualKeyCode: 90, modifiers: 2 });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "z", code: "KeyZ", windowsVirtualKeyCode: 90, modifiers: 2 });
      await sleep(1800);
      const back = await page.ev(sc);
      assert(low < base, `defect not caught (${base} -> ${low})`);
      assert(back === base, `undo did not restore the score: ${base} -> ${low} -> ${back}`);
    });
    await t.check("«Отрисовать свой шрифт», pen: corner clicks closed on the first point give a font with a score", async () => {
      await page.goto("home", 1440, 900);
      await skipTours(page);
      await openHash(page, "draw");
      await drawLetters(page, "НОПЕЛР", "pen");
      const n = await page.ev(`document.querySelector('#dr-setb').textContent`);
      assert(/[3-9]\s*из/.test(n), "pen glyphs not saved: " + n);
      await page.ev(`document.querySelector('#dr-fontb').click()`);
      await sleep(1200);
      await page.ev(`document.querySelector('#dr-mfo').click()`);
      assert(await waitFor(page, `(0,eval)("S").fontId==='imp'&&(0,eval)("S").tab==='edit'`, 30, 1000), "font not created");
      await sleep(3500);
      const s = await page.ev(LAB_OWN);
      assert(s.on && typeof s.score === "number" && s.used >= 3 && s.finite, "pen font not scored: " + JSON.stringify(s));
    });
    for (const method of ["draw", "stroke", "paper"]) {
      await t.check(`«Свой шрифт за четыре шага», способ «${method}»: до шага «Проверка» карта включена и считает`, async () => {
        await page.goto("home", 1440, 900);
        await skipTours(page);
        await page.ev(`document.querySelector('#flow-card').click()`);
        await sleep(1200);
        await page.ev(`document.querySelector('[data-a=method][data-m=${method}]').click()`);
        await sleep(500);
        await page.ev(`document.querySelector('[data-a=next]').click()`);
        await sleep(2000);
        await page.ev(`document.querySelector('[data-a=openmode]').click()`);
        await sleep(2500);
        await skipTours(page);
        await sleep(600);
        await skipTours(page);
        await sleep(400);
        if (method === "paper") {
          await page.ev(`document.querySelector('#pp-to-photo').click()`);
          await sleep(800);
          await setFiles(page, "#pp-file", [PAPER]);
          await sleep(5000);
          await page.ev(`document.querySelector('#pp-to-check').click()`);
          await sleep(5000);
          await page.ev(`document.querySelector('#pp-to-font').click()`);
          await sleep(6000);
          await page.ev(`document.querySelector('#pp-commit').click()`);
          assert(await waitFor(page, `(0,eval)("S").fontId==='imp'`, 40, 1000), "font not created");
        } else {
          await drawLetters(page, "НОПЕЛР", method === "draw" ? "shape" : method, method === "draw" ? 509 : 685);
          await page.ev(`document.querySelector('#fl-chip')&&document.querySelector('#fl-chip').click()`);
          await sleep(1800);
          await page.ev(`document.querySelector('[data-a=next]').click()`);
          assert(await waitFor(page, `(0,eval)("S").fontId==='imp'&&(0,eval)("S").tab==='edit'`, 30, 1000), "step «Проверка» not reached");
        }
        await sleep(3500);
        const s = await page.ev(LAB_OWN);
        assert(s.on, "heat map is off: " + JSON.stringify(s));
        assert(typeof s.score === "number" && typeof s.proof === "number" && s.finite, "no score: " + JSON.stringify(s));
      });
    }
    await t.check("a font with fewer than three glyphs does not crash the heat map", async () => {
      const r = await page.ev(`(()=>{try{const S=(0,eval)("S");for(const k of Object.keys(IMP.glyphs))if(!'Н'.includes(k))delete IMP.glyphs[k];IMP.ver++;iuRegisterNow();
        const q=HEAT.run('НН ПОЛК','regular',60);return {ok:true,score:q.score,verdict:q.verdict}}catch(e){return {ok:false,err:String(e)}}})()`);
      assert(r.ok, "threw: " + r.err);
    });
  } finally { page.close(); }
  return t.results;
}
