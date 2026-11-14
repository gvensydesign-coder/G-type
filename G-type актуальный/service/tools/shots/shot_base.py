import sys
sys.path.insert(0,'tests')
from playwright.sync_api import sync_playwright
import gfonts, os
PAGE='file://'+os.path.abspath('index.html')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    ctx=b.new_context(viewport={'width':1440,'height':900})
    gfonts.install(ctx)
    ctx.add_init_script("try{localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1')}catch(e){}")
    pg=ctx.new_page(); pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto(PAGE); pg.wait_for_function("typeof S!=='undefined' && !!document.querySelector('[data-tab=home]')")
    pg.evaluate("setTab('library')"); pg.wait_for_timeout(1500)
    pg.screenshot(path='/tmp/b_lib.png')
    pg.evaluate("setTab('profile')"); pg.wait_for_timeout(1000)
    pg.screenshot(path='/tmp/b_prof.png')
    print(pg.evaluate("S.tab"))
    b.close()
