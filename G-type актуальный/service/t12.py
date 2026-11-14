import asyncio,sys,collections,re
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.goto('file://'+sys.argv[1]);await pg.wait_for_function("typeof switchFont==='function'&&!!document.querySelector('.lcard')");await pg.wait_for_timeout(500)
        total=0
        for fid in ['volt','kvadra','stroka','codex']:
            await pg.evaluate(f"switchFont('{fid}')");await pg.wait_for_function(f"S.fontId==='{fid}'&&!S.live")
            r=await pg.evaluate('''()=>{const res=computeProof();const o=[];for(const [ch,r] of res)for(const i of r.issues)o.push(ch+': '+i.t+' ['+i.lvl+']');return o}''')
            c=collections.Counter(re.sub(r'[-\d]+','N',x.split(': ',1)[1]) for x in r)
            print(fid,len(r),dict(c))
            if r: print(r[:20])
            total+=len(r)
        await b.close()
        return 1 if total else 0
sys.exit(asyncio.run(main()))
