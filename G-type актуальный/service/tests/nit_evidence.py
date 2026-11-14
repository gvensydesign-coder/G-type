"""approval sheets for «Нить»: editor 1440 light + dark (settings panel open), library card, hover card. usage: python3 tests/nit_evidence.py outdir"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import PAGE, TOUR_OFF, CHROME
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    for theme in ('light', 'dark'):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, color_scheme=theme); ctx.add_init_script(TOUR_OFF)
        pg = ctx.new_page(); pg.goto('file://' + PAGE)
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        pg.evaluate("t=>{document.documentElement.dataset.theme=t}", theme)
        pg.evaluate("setTab('library')"); pg.wait_for_selector('#libgrid .lcard[data-font=nit]', timeout=15000); pg.wait_for_timeout(1500)
        card = pg.locator('#libgrid .lcard[data-font=nit]'); card.scroll_into_view_if_needed(); pg.wait_for_timeout(500)
        card.screenshot(path=f'{OUT}/card_{theme}.png')
        pg.screenshot(path=f'{OUT}/library_{theme}.png')
        pg.click('#libgrid .lcard[data-font=nit]'); pg.wait_for_function("S.fontId==='nit'&&!S.live", timeout=30000)
        pg.evaluate("setTab('edit')"); pg.wait_for_function("S.tab==='edit'", timeout=10000)
        pg.evaluate("typeof edOpenAll==='function'&&edOpenAll()"); pg.evaluate("typeof dwOpen==='function'&&dwOpen('edit','all')")
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{OUT}/editor_{theme}.png')
        # thick preview: thickness 60 to show the range
        pg.evaluate("S.styles[S.style].p.nlw=60;bump();"); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{OUT}/editor_{theme}_thick.png')
        ctx.close()
    b.close()
