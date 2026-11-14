import asyncio,sys,collections,re
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.goto('file://'+sys.argv[1]);await pg.wait_for_function("typeof switchFont==='function'&&!!document.querySelector('.lcard')");await pg.wait_for_timeout(500)
        total=0
        for fid in sys.argv[2].split(','):
            await pg.evaluate(f"switchFont('{fid}')");await pg.wait_for_function(f"S.fontId==='{fid}'&&!S.live")
            names=await pg.evaluate("FAM_W.map(w=>w[0])")
            for style in ['regular','italic']:
              for wn in names:
                r=await pg.evaluate('''([style,wn])=>{S.style=style;const base=FONTS[CUR_FONT].DEFAULTS[style];S.styles[style].p=famParams(base,wn);bump();const res=computeProof();const o=[];for(const [ch,r] of res)for(const i of r.issues)o.push(ch+': '+i.t+' ['+i.lvl+']');return o}''',[style,wn])
                print(fid,style,wn,len(r),r[:6]);total+=len(r)
        await b.close()
        return 1 if total else 0
sys.exit(asyncio.run(main()))
