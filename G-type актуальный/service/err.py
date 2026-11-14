import asyncio,sys
from playwright.async_api import async_playwright
import os
async def SH(pg,path):
    if os.environ.get('GT_SHOTS'): await pg.screenshot(path=path)  # screenshots are opt-in: GT_SHOTS=1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1400,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append('console:'+m.text) if m.type=='error' else None)
        await pg.goto('file://'+sys.argv[1]);await pg.wait_for_timeout(2500)
        print(errs[:5])
        left=[e for e in errs if 'ERR_TUNNEL' not in e and 'net::' not in e]
        await SH(pg,'logs/e_shot.png')
        await b.close()
        print(left)
        return 1 if left else 0
sys.exit(asyncio.run(main()))
