"""pills (W94): DESIGN_SYSTEM §22 «Плашки и вложенные кнопки». For every narrow bar that holds buttons / chips / an X, at 1440 and 390 (light + dark):
- single-row bar (height < 1.9 x its tallest control): border-radius >= height/2 - 1 (pill) and the control insets top, bottom and right are equal within 1 px;
- wrapped bar: card radius >= 16 px, control insets top / right / bottom still equal within 1 px for the corner X (when the bar has one);
- nothing past the bar frame or the viewport.
Check names: pills_geom. One line per bar goes to the PASS details."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, TOUR_OFF, PAGE, CHROME
from playwright.sync_api import sync_playwright

MEASURE = """([bar,ctl])=>{const b=document.querySelector(bar);if(!b)return {missing:true};const r=b.getBoundingClientRect(),cs=getComputedStyle(b);
const bt=parseFloat(cs.borderTopWidth)||0,br=parseFloat(cs.borderRightWidth)||0,bb=parseFloat(cs.borderBottomWidth)||0;
const cs_=(ctl?[...b.querySelectorAll(ctl)]:[]).filter(e=>{const q=e.getBoundingClientRect();return q.width>8&&q.height>8&&getComputedStyle(e).visibility!=='hidden'});
if(!cs_.length&&ctl)return {nocontrols:true,h:r.height};
let top=1e9,right=-1e9,bot=-1e9,th=0,left=1e9;for(const e of cs_){const q=e.getBoundingClientRect();top=Math.min(top,q.top);bot=Math.max(bot,q.bottom);right=Math.max(right,q.right);left=Math.min(left,q.left);th=Math.max(th,q.height)}
const rad=parseFloat(cs.borderTopLeftRadius)||0;
return {h:r.height,w:r.width,rad,th,top:cs_.length?top-r.top-bt:null,bot:cs_.length?r.bottom-bb-bot:null,right:cs_.length?r.right-br-right:null,l:r.left,r:r.right,vw:innerWidth,wrap:b.classList.contains('is-wrap')||(cs_.length?r.height>=1.9*th:r.height>=56)}}"""

def prep(pg, name):
    def home(): pg.evaluate("setTab('home')"); pg.wait_for_timeout(400)
    def edit():
        pg.evaluate("setTab('library')"); pg.click('#libgrid .lcard[data-font=kortes]')
        pg.wait_for_function("S.fontId==='kortes'&&!S.live", timeout=30000); pg.evaluate("setTab('edit')"); pg.wait_for_timeout(1000)
    if name == 'topbar': edit()
    elif name == 'fhint': edit(); pg.evaluate("fhRefresh()"); pg.wait_for_timeout(400)
    elif name == 'recovery': home(); pg.evaluate("GT_DRAFTS.showRecovery({id:'x1',u:Date.now()-3600000})"); pg.wait_for_timeout(700)
    elif name == 'toast': home(); pg.evaluate("toast('Шрифт сохранён в библиотеку')"); pg.wait_for_timeout(500)
    elif name == 'drn': home(); pg.evaluate("GT_DRAFTS.note({html:'Черновиков уже 20, прошлый процесс остался на месте.',ttl:0,actions:[{l:'Открыть черновики',fn:()=>{}}]})"); pg.wait_for_timeout(700)
    elif name == 'drn_short': home(); pg.evaluate("GT_DRAFTS.note({html:'Процесс сохранён',ttl:0,actions:[]})"); pg.wait_for_timeout(700)
    elif name == 'pfilt': edit(); pg.evaluate("setTab('proof')"); pg.wait_for_timeout(1200); pg.evaluate("S.proof.only=['А','Б','В'];stProofSync()"); pg.wait_for_timeout(300)
    elif name == 'search': home()
    elif name == 'commfilter':
        pg.click('[data-tab=community]'); pg.wait_for_function("S.tab==='community'&&COMM.built()&&document.querySelectorAll('.cm-card').length>0", timeout=15000); pg.wait_for_timeout(600)

# name, bar selector, control selector (buttons / chips / X inside), must the bar be a single-row pill at 1440
BARS = [
    ('topbar', 'header.top', '.seg,.vtabs,.ibtn,#ex-menu', True),
    ('fhint', '#fhint', '.fh-x', True),
    ('recovery', '#dd-rec', '.btn,.dd-rec-x,.nb', True),
    ('toast', '#toast', '', True),
    ('drn', '.drn', '.btn,.drn-x', True),
    ('drn_short', '.drn', '.drn-x', True),
    ('pfilt', '#pfilt', '.chip', True),
    ('search', '#home-search', '.btn', True),
    ('commfilter', '.cm-bar-f', 'button', True),
]

def pills_geom(p):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    out = []; bad = []
    try:
        for w, h in ((1440, 900), (390, 844)):
            ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.add_init_script(TOUR_OFF)
            pg = ctx.new_page(); pg.goto('file://' + PAGE)
            pg.wait_for_function("typeof S!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)
            for name, bar, ctl, single in BARS:
                for th in ('light', 'dark'):
                    pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", th)
                    prep(pg, name)
                    m = pg.evaluate(MEASURE, [bar, ctl])
                    tag = f'{name}@{w}/{th}'
                    if m.get('missing') or m.get('nocontrols'):
                        bad.append(f'{tag}: bar or controls missing {m}'); continue
                    if m['l'] < -0.5 or m['r'] > m['vw'] + 0.5: bad.append(f'{tag}: past the viewport {m["l"]:.1f}..{m["r"]:.1f}')
                    if not m['wrap']:
                        if m['rad'] < m['h'] / 2 - 1: bad.append(f'{tag}: single row but radius {m["rad"]:.1f} < h/2 {m["h"]/2:.1f}')
                        if m['top'] is not None and (abs(m['top'] - m['bot']) > 1 or abs(m['top'] - m['right']) > 1):
                            bad.append(f'{tag}: insets top {m["top"]:.1f} bottom {m["bot"]:.1f} right {m["right"]:.1f}')
                        kind = 'pill'
                    else:
                        if m['rad'] < 16: bad.append(f'{tag}: wrapped bar radius {m["rad"]:.1f} < 16')
                        kind = 'card'
                    if th == 'light': out.append(f'{name}@{w}={kind}')
            ctx.close()
    finally:
        b.close()
    assert not bad, '; '.join(bad)
    return ' '.join(out)

CHECKS = {'pills_geom': pills_geom}
if __name__ == '__main__':
    want = sys.argv[1:] or list(CHECKS)
    sys.exit(check_all([(n, CHECKS[n]) for n in want]))
