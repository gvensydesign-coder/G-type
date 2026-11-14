import sys,os
sys.path.insert(0,'tests')
from playwright.sync_api import sync_playwright
import gfonts
ROOT=os.path.abspath('.')
PAGE='file://'+ROOT+'/index.html?sk70=1'
OUT=ROOT+'/sketch70'
os.makedirs(OUT,exist_ok=True)
class Sess:
    def __init__(self,p,theme='light',w=1440,h=900,seed=True,colls=True,acc=1,nameFont='renessa'):
        self.b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        self.ctx=self.b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,color_scheme=theme,has_touch=(w<500))
        gfonts.install(self.ctx)
        self.ctx.add_init_script("try{localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1');localStorage.setItem('gtype-theme-v1','%s')}catch(e){}"%theme)
        self.pg=self.ctx.new_page(); self.errs=[]
        self.pg.on('pageerror',lambda e:self.errs.append(str(e)))
        self.pg.on('console',lambda m:self.errs.append(m.text) if m.type=='error' and 'net::' not in m.text else None)
        self.pg.goto(PAGE); self.pg.wait_for_function("typeof S!=='undefined' && typeof SK70!=='undefined' && !!document.querySelector('[data-tab=home]')",timeout=30000)
        self.pg.wait_for_timeout(500)
        if seed:
            self.pg.evaluate("SK70.seed({colls:%s,acc:%d,nameFont:%r})"%('true' if colls else 'false',acc,nameFont))
    def tab(self,t,wait=900):
        self.pg.evaluate("setTab('%s')"%t); self.pg.wait_for_timeout(wait)
    def shot(self,name,**kw):
        self.pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
        self.pg.screenshot(path=OUT+'/'+name+'.png',**kw)
    def close(self):
        self.b.close()
