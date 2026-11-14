import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg=await b.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+sys.argv[1]);await pg.wait_for_function("typeof switchFont==='function'&&!!document.querySelector('.lcard')");await pg.wait_for_timeout(500)
        cov=await pg.evaluate("[...document.querySelectorAll('.lcard')].map(c=>c.textContent.replace(/\\s+/g,' ')).filter(t=>t.includes('Капля'))")
        assert cov,cov
        await pg.evaluate("switchFont('kaplya')");await pg.wait_for_function("S.fontId==='kaplya'&&!S.live")
        def path(): return "(()=>{const g=getFinal('a',S.style);return JSON.stringify(g.cs)})()"
        a=await pg.evaluate(path())
        await pg.evaluate("S.styles[S.style].p.melt=85;bump();")
        c=await pg.evaluate(path())
        assert a!=c,'melt does not change outline'
        r=await pg.evaluate("(()=>{const o=buildTTF(S.style,{family:FONTS.kaplya.family,edits:{},styles:S.styles},{});return o.bytes.length})()")
        assert r>10000,r
        print('PASS kaplya cover',cov[0][:40],'melt changes outline, ttf bytes',r,'errors',errs)
        await b.close()
        return 1 if errs else 0
sys.exit(asyncio.run(main()))
