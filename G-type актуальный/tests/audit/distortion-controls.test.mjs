import { test } from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureServer, startChrome, openPage, openEditor, openDistortGroup, sleep, assert } from '../v96/lib.mjs';

test('distortion chips and variants work in the editor', async () => {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const server = await ensureServer(root);
  const chrome = await startChrome();
  const page = await openPage();
  try {
    await openEditor(page);
    await openDistortGroup(page);
    const chip = '#dst-fxnames [data-fx="twist"]';
    await page.ev(`document.querySelector('${chip}').click()`);
    await sleep(250);
    const on = await page.ev(`(()=>{const e=document.querySelector('${chip}');return {pressed:e.getAttribute('aria-pressed'),value:document.querySelector('#dst-r-twist').value}})()`);
    assert(on.pressed === 'true' && +on.value > 0, 'effect chip did not enable its slider');
    await page.ev(`document.querySelector('${chip}').click()`);
    await sleep(250);
    const off = await page.ev(`(()=>{const e=document.querySelector('${chip}');return {pressed:e.getAttribute('aria-pressed'),value:document.querySelector('#dst-r-twist').value}})()`);
    assert(off.pressed === 'false' && +off.value === 0, 'effect chip did not disable its slider');

    const before = await page.ev(`window.__GT_DISTORT_API.snapshot().seed`);
    await page.ev(`(()=>{const e=document.querySelector('#dst-var');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await sleep(700);
    const variants = await page.ev(`(()=>[...document.querySelectorAll('#dst-vars canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=3;i<d.length;i+=4)if(d[i])ink++;const r=c.getBoundingClientRect();return {ink,width:r.width,height:r.height}}))()`);
    assert(variants.length === 5 && variants.every(v => v.ink > 100 && v.width > 20 && v.height > 20), 'variant previews are empty or hidden: ' + JSON.stringify(variants));
    await page.ev(`document.querySelector('#dst-vars [data-variant="1"]').click()`);
    await page.ev(`document.querySelector('#dst-apply').click()`);
    const after = await page.ev(`window.__GT_DISTORT_API.snapshot().seed`);
    assert(after === before + 97, `selected variant was not applied: ${before} -> ${after}`);
  } finally {
    page.close();
    chrome.kill();
    server?.kill();
  }
});
