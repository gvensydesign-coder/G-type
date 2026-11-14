import asyncio,sys,json,statistics
from playwright.async_api import async_playwright
INIT="""try{localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1')}catch(e){}
window.__lt=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true})}catch(e){}"""
async def run(p,H,pre=None):
    b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    ctx=await b.new_context(viewport={'width':1440,'height':900})
    pg=await ctx.new_page()
    await pg.add_init_script(INIT)
    if pre: await pg.add_init_script(pre)
    await pg.goto('file://'+H);await pg.wait_for_timeout(3000)
    r=await pg.evaluate("""()=>{const n=performance.getEntriesByType('navigation')[0];const lt=window.__lt;
      const fcp=performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint');
      const last=lt.length?Math.max(...lt.map(x=>x[0]+x[1])):0;
      return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,fcp:fcp&&fcp.startTime,tti:last,longtasks:lt.length,blocked:lt.reduce((a,x)=>a+x[1],0)}}""")
    await b.close();return r
async def main():
    async with async_playwright() as p:
        rs=[await run(p,sys.argv[1]) for _ in range(int(sys.argv[2]) if len(sys.argv)>2 else 3)]
        for k in rs[0]:
            v=[x[k] for x in rs if x[k] is not None]
            print(k,round(statistics.median(v)))
asyncio.run(main())
