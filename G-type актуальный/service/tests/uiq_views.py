"""Shared by the responsive UI audits (e2e_icons/rows/focus/rail/overflow): viewports and view navigation.
Usage: for (w,h,th) in combos(): pg=new_page(b,w,h,th); for name in VIEWS: goto(pg,name); audit..."""
import os
VIEWPORTS = [(1440, 900), (390, 844), (768, 1024)]
THEMES = ['light', 'dark']
# dev filters (not used by check.sh): GT_W=390,768 GT_TH=light
if os.environ.get('GT_W'):
    VIEWPORTS = [v for v in VIEWPORTS if str(v[0]) in os.environ['GT_W'].split(',')]
if os.environ.get('GT_TH'):
    THEMES = [t for t in THEMES if t in os.environ['GT_TH'].split(',')]
VIEWS = ['home', 'library', 'fav', 'edit', 'edit-drawer', 'proof', 'kern', 'draw', 'import']
PAGE = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html'))
TOUR_OFF = "try{localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1')}catch(e){}"


def new_page(b, w, h, theme):
    ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=theme, has_touch=(w < 1000), is_mobile=False)
    ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page()
    pg.goto(PAGE)
    pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'&&!!document.querySelector('[data-tab=home]')", timeout=30000)
    pg.wait_for_timeout(1200)
    return pg


def _home(pg):
    pg.evaluate("typeof iuClose==='function'&&document.body.classList.contains('imp-open')&&iuClose()")
    pg.evaluate("typeof dwClose==='function'&&dwClose()")
    pg.evaluate("setTab('home')")


def goto(pg, name):
    """Navigate to a view; every state is reached through the public API so it is deterministic."""
    pg.evaluate("typeof helpToggle==='function'&&helpToggle(false)")
    if name in ('home', 'library', 'fav'):
        _home(pg)
        pg.evaluate(f"setTab('{name}')")
    elif name in ('edit', 'edit-drawer', 'proof', 'kern'):
        tab = 'edit' if name.startswith('edit') else name
        if pg.evaluate("S.fontId!=='volt'||['home','library','fav','draw'].includes(S.tab)"):
            _home(pg)
            pg.evaluate("setTab('library')")
            pg.wait_for_selector('#libgrid .lcard[data-font=volt]', timeout=40000)
            pg.evaluate("document.querySelector('#libgrid .lcard[data-font=volt]').click()")
            pg.wait_for_function("S.fontId==='volt'&&!S.live", timeout=30000)
        pg.evaluate("typeof dwClose==='function'&&dwClose('edit')")
        pg.evaluate(f"setTab('{tab}')")
        pg.wait_for_function(f"S.tab==='{tab}'", timeout=10000)
        if name == 'edit-drawer':
            pg.evaluate("dwOpen('edit','params')")
    elif name == 'draw':
        _home(pg)
        pg.evaluate("setTab('draw')")
        pg.wait_for_selector('.dr-g #dr-side', state='attached', timeout=15000)
    elif name == 'import':
        _home(pg)
        pg.evaluate("document.querySelector('#imp-card').click()")
        pg.wait_for_function("document.body.classList.contains('imp-open')", timeout=10000)
    pg.wait_for_timeout(600)
    if name in ('edit', 'edit-drawer', 'proof', 'kern'):  # W88: the background proof scan (chip count) is idle work now; wait until it settled so the chip is in its steady state
        pg.wait_for_timeout(1500); pg.wait_for_function("typeof AP==='undefined'||!AP.running", timeout=60000); pg.wait_for_timeout(300)
