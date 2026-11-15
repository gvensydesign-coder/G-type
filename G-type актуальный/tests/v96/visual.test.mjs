import { createSuite, openPage, openEditor, VIS_FN, assert, sleep } from "./lib.mjs";

const VIEWS = [["home", "#view-lib"], ["library", "#view-library"], ["community", "#view-comm"], ["edit", "#view-edit"]];

const SMALL = `(()=>{${VIS_FN}const bad=[];for(const e of document.querySelectorAll('body *')){
if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;if(['SCRIPT','STYLE','OPTION'].includes(e.tagName))continue;
if(!vis(e))continue;const f=parseFloat(getComputedStyle(e).fontSize);if(f>0&&f<11.99)bad.push(f+'px '+(e.id||e.className||e.tagName)+' «'+e.textContent.trim().slice(0,24)+'»')}return bad})()`;
const ROUND = `(()=>{${VIS_FN}const bad=[];let n=0;for(const b of document.querySelectorAll('button,a,[role=button]')){if(!vis(b))continue;const s=getComputedStyle(b);
if(!/%/.test(s.borderTopLeftRadius)||parseFloat(s.borderTopLeftRadius)<50)continue;const r=b.getBoundingClientRect();n++;
if(Math.abs(r.width-r.height)>1)bad.push((b.id||b.className)+' '+r.width.toFixed(1)+'x'+r.height.toFixed(1))}return {n,bad}})()`;
const SCROLL = `({sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,iw:innerWidth})`;

export default async function run() {
  const t = createSuite("visual");
  const page = await openPage();
  try {
    for (const w of [1440, 390]) {
      for (const [hash] of VIEWS) {
        let ready = null;
        const open = async () => {
          if (ready === `${hash}${w}`) return;
          if (hash === "edit") await openEditor(page, w); else { await page.goto(hash, w, w === 390 ? 844 : 900); await page.ev(`document.querySelector('#onb-skip')?.click()`); await sleep(300); }
          ready = `${hash}${w}`;
        };
        if (w === 1440) {
          await t.check(`no visible text under 12px on ${hash}`, async () => {
            await open();
            const bad = await page.ev(SMALL);
            assert(bad.length === 0, `${bad.length} smaller than 12px: ${bad.slice(0, 6).join("; ")}`);
          });
          await t.check(`round buttons are circles (|w-h| <= 1) on ${hash}`, async () => {
            await open();
            const r = await page.ev(ROUND);
            assert(r.n > 0, "no round buttons found, selector stale");
            assert(r.bad.length === 0, `${r.bad.length}/${r.n} not circles: ${r.bad.slice(0, 5).join("; ")}`);
          });
        }
        await t.check(`no horizontal page scroll at ${w} on ${hash}`, async () => {
          await open();
          const s = await page.ev(SCROLL);
          assert(s.sw <= s.iw + 1 && s.bw <= s.iw + 1, `scrollWidth ${s.sw}/${s.bw} > viewport ${s.iw}`);
        });
      }
    }
  } finally { page.close(); }
  return t.results;
}
