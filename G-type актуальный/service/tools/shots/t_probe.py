from shots_lib import *
with sync_playwright() as p:
    s=Sess(p,'light',390,844); pg=s.pg
    s.tab('library')
    pg.evaluate("document.getElementById('view-library').scrollTop=500"); pg.wait_for_timeout(400)
    print(pg.evaluate("(()=>{const b=document.querySelector('#view-library .lcard[data-font=stroka] .lc-more');const r=b.getBoundingClientRect();return [r.x,r.y,r.width,r.height,getComputedStyle(b).display]})()"))
    pg.click('#view-library .lcard[data-font=stroka] .lc-more'); pg.wait_for_timeout(400)
    print(pg.evaluate("[!!document.querySelector('.menu70'),document.querySelector('.menu70')&&document.querySelector('.menu70').getBoundingClientRect().toJSON()]"))
    pg.screenshot(path='/tmp/ph1.png'); print(s.errs); s.close()
