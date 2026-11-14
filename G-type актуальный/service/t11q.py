import asyncio,sys
from playwright.async_api import async_playwright
import os
async def SH(pg,path):
    if os.environ.get('GT_SHOTS'): await pg.screenshot(path=path)  # screenshots are opt-in: GT_SHOTS=1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.add_init_script("try{localStorage.setItem('gtype-tour-v1','1')}catch(e){}")  # обучение проверяется отдельно (ft.py)
        errs=[];bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and 'font' not in m.text.lower() and 'net::' not in m.text else None)
        await pg.goto('file://'+sys.argv[1]);await pg.wait_for_function("typeof S!=='undefined'&&!!document.querySelector('.lcard')");await pg.wait_for_timeout(300)
        await SH(pg,'logs/u_volt.png')
        for fid in ['volt','kvadra','stroka','codex']:
            await pg.click('[data-tab=home]');await pg.click('[data-tab=library]');await pg.click(f'#libgrid .lcard[data-font={fid}]');await pg.wait_for_function(f"S.fontId==='{fid}'&&!S.live");await pg.wait_for_timeout(300)
            await SH(pg,f'logs/u_{fid}.png')
            if fid!='volt':
                await pg.click('[data-tab=proof]');await pg.wait_for_function("S.tab==='proof'");await pg.wait_for_timeout(1200)
                await SH(pg,f'logs/p_{fid}.png')
                await pg.click('[data-tab=edit]');await pg.wait_for_timeout(400)
        # persistence roundtrip
        j=await pg.evaluate('JSON.stringify(projectJSON()).length')
        print('proj',j)
        await pg.set_viewport_size({'width':400,'height':900});await pg.wait_for_timeout(500)
        for t in ['home','edit','proof']:
            await pg.evaluate(f"setTab('{t}')");await pg.wait_for_timeout(500)
            sw=await pg.evaluate('[document.documentElement.scrollWidth,innerWidth]');print('mobile',t,sw)
            if sw[0]>sw[1]: bad.append('hscroll '+t)
            await SH(pg,f'logs/u_m_{t}.png')
        print('errors',errs)
        await b.close()
        return 1 if (errs or bad) else 0
sys.exit(asyncio.run(main()))
