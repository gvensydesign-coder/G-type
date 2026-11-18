import { test } from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureServer, startChrome, openPage, sleep, assert, HOOK_JS } from '../v96/lib.mjs';

test('imported glyph download opens export preview and produces a font', async () => {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const server = await ensureServer(root);
  const chrome = await startChrome();
  const page = await openPage();
  try {
    await page.goto('import');
    await page.ev(`document.querySelector('#onb-skip')?.click()`);
    await page.ev(`(()=>{
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path d="M100 900 L500 100 L900 900 Z"/></svg>';
      const dt=new DataTransfer();dt.items.add(new File([svg],'А.svg',{type:'image/svg+xml'}));
      const input=document.querySelector('#imp-files');input.files=dt.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    let ready = false;
    for (let i = 0; i < 60; i++) {
      ready = await page.ev(`!!(FONTS.imp && document.querySelector('#imp-build') && !document.querySelector('#imp-build').disabled)`);
      if (ready) break;
      await sleep(250);
    }
    assert(ready, 'imported glyph did not enable font download');
    await page.ev(HOOK_JS);
    await page.ev(`document.querySelector('#imp-build').click()`);
    await sleep(500);
    const preview = await page.ev(`(()=>({open:!!document.querySelector('#xpv')&&!document.querySelector('#xpv').hidden,format:document.querySelector('#xpv [data-xf="ttf"]')?.getAttribute('aria-pressed'),button:!!document.querySelector('#xpv [data-xa="go"]')}))()`);
    assert(preview.open && preview.format === 'true' && preview.button, 'download did not open the existing export preview: ' + JSON.stringify(preview));
    await page.ev(`document.querySelector('#xpv [data-xa="go"]').click()`);
    let count = 0;
    for (let i = 0; i < 60; i++) {
      count = await page.ev(`window.__cap.filter(x=>x.name).length`);
      if (count) break;
      await sleep(500);
    }
    assert(count > 0, 'font was not downloaded');
    const font = await page.ev(`(async()=>{const a=window.__cap.filter(x=>x.name).pop();const b=new Uint8Array(await (await fetch(a.href)).arrayBuffer());return {name:a.name,length:b.length,magic:[...b.slice(0,4)]}})()`);
    assert(font.name.endsWith('.ttf') && font.length > 1000 && font.magic.join(',') === '0,1,0,0', 'download is not a TTF font: ' + JSON.stringify(font));

    await page.goto('draw');
    await page.ev(`document.querySelector('#onb-skip')?.click()`);
    await page.ev(`document.querySelector('[data-tool="shape"]').click()`);
    await page.ev(`([...document.querySelectorAll('.dr-gl')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Знак Н'))).click()`);
    const mouse = (type, x, y, down) => page.send('Input.dispatchMouseEvent', {
      type, x, y, button: type === 'mouseMoved' && !down ? 'none' : 'left', buttons: down ? 1 : 0, clickCount: 1,
    });
    for (const [c0, r0, c1, r1] of [[0, 0, 1, 7], [3, 0, 4, 7], [1, 3, 3, 4]]) {
      const xa = 509 + c0 * 62.6 + 1, ya = 633 - r0 * 62.6 - 1;
      const xb = 509 + c1 * 62.6, yb = 633 - r1 * 62.6;
      await mouse('mouseMoved', xa, ya, false);
      await mouse('mousePressed', xa, ya, true);
      for (let i = 1; i <= 4; i++) await mouse('mouseMoved', xa + (xb - xa) * i / 4, ya + (yb - ya) * i / 4, true);
      await mouse('mouseReleased', xb, yb, false);
      await sleep(200);
    }
    await page.ev(`document.querySelector('#dr-sv').click()`);
    await sleep(250);
    const drawState = await page.ev(`(()=>{const c=document.querySelector('#dr-cv'),r=c.getBoundingClientRect();return {ready:!document.querySelector('#dr-fontb').disabled,saved:document.querySelector('#dr-setb').textContent,button:document.querySelector('#dr-sv').textContent,tool:document.querySelector('.dr-ib.on')?.getAttribute('aria-label'),rect:[r.x,r.y,r.width,r.height]}})()`);
    assert(drawState.ready, 'drawn glyph did not enable font download: ' + JSON.stringify(drawState));
    await page.ev(`document.querySelector('#dr-fontb').click()`);
    await sleep(300);
    await page.ev(`document.querySelector('#dr-mfo').click()`);
    await sleep(500);
    const drawPreview = await page.ev(`!!document.querySelector('#xpv')&&!document.querySelector('#xpv').hidden`);
    assert(drawPreview, 'drawing download did not open the export preview');

    await page.goto('home');
    await page.ev(`document.querySelector('#onb-skip')?.click()`);
    await page.ev(`document.querySelector('#flow-card').click()`);
    await page.ev(`(()=>{const n=document.querySelector('#fl-name');n.value='Мой шрифт Проверка';n.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await page.ev(`document.querySelector('[data-a="method"][data-m="import"]').click()`);
    await page.ev(`document.querySelector('[data-a="next"]').click()`);
    await sleep(300);
    await page.ev(`document.querySelector('[data-a="openmode"]').click()`);
    await sleep(500);
    await page.ev(`(()=>{
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path d="M100 900 L500 100 L900 900 Z"/></svg>';
      const dt=new DataTransfer();dt.items.add(new File([svg],'А.svg',{type:'image/svg+xml'}));
      const input=document.querySelector('#imp-files');input.files=dt.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    let wizardReady = false;
    for (let i = 0; i < 60; i++) {
      wizardReady = await page.ev(`!!(FONTS.imp && !document.querySelector('#imp-build').disabled)`);
      if (wizardReady) break;
      await sleep(250);
    }
    assert(wizardReady, 'wizard SVG glyph did not import');
    await page.ev(`document.querySelector('#fl-chip').click()`);
    await sleep(250);
    await page.ev(`document.querySelector('[data-a="next"]').click()`);
    await sleep(500);
    const wizard = await page.ev(`(()=>({name:(0,eval)('S').family,step:GT_FLOW.FL.step,preview:!!document.querySelector('#xpv')&&!document.querySelector('#xpv').hidden}))()`);
    assert(wizard.name === 'Мой шрифт Проверка' && wizard.step === 3 && !wizard.preview, 'wizard did not keep its font name or stage: ' + JSON.stringify(wizard));
  } finally {
    page.close();
    chrome.kill();
    server?.kill();
  }
});
