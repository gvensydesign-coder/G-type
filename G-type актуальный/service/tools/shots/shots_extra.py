from shots_lib import *
from PIL import Image, ImageDraw, ImageFont
import glob
for theme in ('light','dark'):
    with sync_playwright() as p:
        s=Sess(p,theme); pg=s.pg
        pg.evaluate("libOpen('renessa')"); pg.wait_for_timeout(3600)
        pg.screenshot(path='/tmp/ed.png',clip={'x':900,'y':0,'width':540,'height':70})
        s.tab('profile',1500)
        pg.evaluate("document.getElementById('sk-hw').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
        r=pg.evaluate("(()=>{const e=document.querySelector('#sk-works .sk-card:nth-child(3)').getBoundingClientRect();return [e.x,e.y,e.width,e.height]})()")
        pg.evaluate("document.getElementById('view-profile').scrollTop-=0")
        pg.screenshot(path='/tmp/cards.png',clip={'x':80,'y':max(0,r[1]-10),'width':1360,'height':min(300,900-r[1])})
        s.close()
    a=Image.open('/tmp/ed.png').convert('RGB');b=Image.open('/tmp/cards.png').convert('RGB')
    bg=(15,15,17) if theme=='dark' else (239,239,241)
    W=1400;sheet=Image.new('RGB',(W,a.height+b.height+60),bg)
    sheet.paste(a,(W-a.width-20,10));sheet.paste(b,(20,a.height+40))
    sheet.save(OUT+'/15_license_badge_%s.png'%theme)
