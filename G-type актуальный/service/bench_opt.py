# usage: python3 bench_opt.py <index.html> [runs]  -> median ms: dcl, load, lib render, TTI(last longtask end), editor open, proof run
import asyncio,sys,statistics
from playwright.async_api import async_playwright
INIT="""try{localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1')}catch(e){}
window.__lt=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true})}catch(e){}
window.__lib=0;new MutationObserver((m,o)=>{if(document.querySelector('.lcard')){window.__lib=performance.now();o.disconnect()}}).observe(document,{childList:true,subtree:true});"""
async def run(p,H):
    b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg=await (await b.new_context(viewport={'width':1440,'height':900})).new_page()
    await pg.add_init_script(INIT)
    await pg.goto('file://'+H,wait_until='load');await pg.wait_for_timeout(2500)
    r=await pg.evaluate("""()=>{const n=performance.getEntriesByType('navigation')[0];const lt=window.__lt;
      return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,lib:window.__lib,tti:lt.length?Math.max(...lt.map(x=>x[0]+x[1])):0,blocked:lt.reduce((a,x)=>a+x[1],0)}}""")
    await pg.wait_for_timeout(300)
    r['editor']=await pg.evaluate("""async()=>{const c=document.querySelector('.lcard[data-font=volt]');const t=performance.now();c.click();
      const raf=()=>new Promise(r=>requestAnimationFrame(()=>r()));await raf();await raf();window.__t0=t;return performance.now()-t}""")
    for i in range(400):
        q=await pg.evaluate("(()=>{try{return (!AP.running&&AP.res.size>=300)?AP.res.size:0}catch(e){return 0}})()")
        if q: break
        await pg.wait_for_timeout(100)
    r['proof']=await pg.evaluate("performance.now()-window.__t0")
    r['proof_n']=q
    await b.close();return r
async def main():
    async with async_playwright() as p:
        rs=[await run(p,sys.argv[1]) for _ in range(int(sys.argv[2]) if len(sys.argv)>2 else 3)]
        print(' '.join('%s=%d'%(k,statistics.median([x[k] for x in rs])) for k in rs[0]))
asyncio.run(main())
