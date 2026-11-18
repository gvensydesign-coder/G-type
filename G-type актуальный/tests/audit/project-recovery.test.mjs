import { test } from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureServer, startChrome, openPage, openEditor, sleep, assert } from '../v96/lib.mjs';

test('damaged project keeps the working copy and valid project restores it', async () => {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const server = await ensureServer(root);
  const chrome = await startChrome();
  const page = await openPage();
  try {
    await openEditor(page);
    const before = await page.ev(`(()=>{const s=(0,eval)('S');return JSON.stringify({font:s.fontId,text:s.text,edits:s.edits,styles:s.styles})})()`);
    await page.ev(`(()=>{const d=new DataTransfer();d.items.add(new File(['{broken'],'broken.gtype',{type:'application/json'}));const i=document.querySelector('#pj-l');i.files=d.files;i.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await sleep(350);
    const afterBad = await page.ev(`(()=>{const s=(0,eval)('S');return JSON.stringify({font:s.fontId,text:s.text,edits:s.edits,styles:s.styles})})()`);
    assert(afterBad === before, 'invalid JSON replaced the current project');

    await page.ev(`(()=>{const p=projectJSON();p.text='AUDIT RESTORED';window.__auditValidProject=JSON.stringify(p);(0,eval)('S').text='TEMPORARY'})()`);
    await page.ev(`(()=>{const d=new DataTransfer();d.items.add(new File([window.__auditValidProject],'valid.gtype',{type:'application/json'}));const i=document.querySelector('#pj-l');i.files=d.files;i.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await sleep(350);
    const restored = await page.ev(`(0,eval)('S').text`);
    assert(restored === 'AUDIT RESTORED', `valid project did not restore text: ${restored}`);
    await page.ev(`(()=>{const p=projectJSON(),slot=p.fonts.volt;
      window.__auditLegacyProject=JSON.stringify({app:'volt',v:1,styles:slot.styles,edits:slot.edits,family:slot.family,text:'LEGACY RESTORED'})})()`);
    await page.ev(`(()=>{const d=new DataTransfer();d.items.add(new File([window.__auditLegacyProject],'legacy.gtype',{type:'application/json'}));const i=document.querySelector('#pj-l');i.files=d.files;i.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await sleep(350);
    const legacy = await page.ev(`(()=>{const s=(0,eval)('S');return {font:s.fontId,text:s.text,wdth:s.styles.regular.p.wdth}})()`);
    assert(legacy.font === 'volt' && legacy.text === 'LEGACY RESTORED', 'legacy project did not restore');

    const changed = legacy.wdth + (legacy.wdth < 200 ? 1 : -1);
    await page.ev(`(()=>{snap();(0,eval)('S').styles.regular.p.wdth=${changed};bump()})()`);
    await page.ev(`document.querySelector('#undo').click()`);
    assert(await page.ev(`(0,eval)('S').styles.regular.p.wdth`) === legacy.wdth, 'undo did not restore the prior width');
    await page.ev(`document.querySelector('#redo').click()`);
    assert(await page.ev(`(0,eval)('S').styles.regular.p.wdth`) === changed, 'redo did not reapply the width');
  } finally {
    page.close();
    chrome.kill();
    server?.kill();
  }
});
