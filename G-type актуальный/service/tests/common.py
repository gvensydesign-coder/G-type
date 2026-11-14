"""Shared helpers for the slow e2e checks (tests/e2e_*.py).
Each check prints one final line: 'PASS <name> <details>' or 'FAIL <name> <reason>' and exits 0/1.
All waits are state waits (wait_for_function / expect_download), no fixed sleeps except short UI settles."""
import os, sys, io, zipfile, time, json
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
import brotli_shim  # noqa: F401,E402  (W96: fontTools reads .woff2 only with a 'brotli' module; the shim uses the system libbrotli when the pip wheel is missing)

WK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGE = os.environ.get('GT_PAGE') or os.path.join(WK, 'index.html')
LOGS = os.path.join(WK, 'logs')
CHROME = '/opt/pw-browsers/chromium'
# W92: the flags are written at DOMContentLoaded, NOT at document creation. ROOT CAUSE of the old «state did not survive reload» flake: an init script (add_init_script) that touches localStorage (even a
# plain getItem) runs before the new document owns its storage area; on a reload / navigation Chromium then drops what the previous document had written (measured on a bare 2-line page: init script with
# setItem 3/30 and 5/30 lost, getItem 7/30, no init script 0/30, same write deferred to DOMContentLoaded 0/30; the app has no remove/clear call, traced). The app reads these flags lazily (tour: on `load`, onboarding: when it opens), so DOMContentLoaded is early enough.
# Do not seed localStorage from an init script in a test that reloads and checks storage; seed after load (evaluate) and reload, or defer like this.
TOUR_OFF = "try{document.addEventListener('DOMContentLoaded',()=>{try{localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1');localStorage.setItem('gtype.onb.v1','1')}catch(e){}},{once:true})}catch(e){}"
os.makedirs(LOGS, exist_ok=True)
SHOTS = bool(os.environ.get('GT_SHOTS') or os.environ.get('DR_SHOTS'))  # screenshots are opt-in: GT_SHOTS=1


def shot(pg, path, **kw):
    """Screenshot only when GT_SHOTS is set (default runs write no PNG)."""
    if SHOTS:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        pg.screenshot(path=path, **kw)




class Session:
    """Fresh browser context on index.html at 1440x900 (headless)."""

    def __init__(self, p, name):
        self.name = name
        self.b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
        self.ctx = self.b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True, **({'reduced_motion': 'reduce'} if os.environ.get('GT_REDUCED') == '1' else {}))
        self.pg = self.ctx.new_page()
        self.errs = []
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.pg.on('console', lambda m: self.errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
        self.ctx.add_init_script(TOUR_OFF)
        self.pg.goto('file://' + PAGE)
        self.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=60000)
        self.pg.wait_for_function("typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)  # W88: startup work (home ribbon, covers, autokern) runs in idle slices; checks start on a quiet page

    def js(self, expr):
        return self.pg.evaluate(expr)

    def open_font(self, fid):
        # W93: programmatic navigation is never blocked by the «Сохранить процесс?» guard (a rail click would ask and discarding would drop the work the test just built)
        if self.pg.evaluate(f"S.tab==='edit' && S.fontId==='{fid}' && !S.live"):
            return  # already in this font's editor (e.g. just restored by a reload): a library round trip would start it clean
        self.pg.evaluate("setTab('library')")
        if fid == 'imp':  # the registered import font is the test's own work: resume it instead of starting the import flow clean (keepNext lasts one tick, so click in the same task)
            self.pg.evaluate("(f)=>{GT_DRAFTS.keepNext();document.querySelector('#libgrid .lcard[data-font='+f+']').click()}", fid)
        else:
            self.pg.click(f'#libgrid .lcard[data-font={fid}]')
        self.pg.wait_for_function(f"S.fontId==='{fid}' && !S.live", timeout=30000)
        self.pg.evaluate("setTab('edit')")
        self.pg.wait_for_function("S.tab==='edit'", timeout=10000)

    def leave_ask(self, action='discard'):
        """W93: leaving a work mode with changes through the rail asks «Сохранить процесс?» (ui_drafts.js); answer it (discard by default) so the helper can go on."""
        try:
            self.pg.wait_for_selector('.dd-dlg', timeout=500)
        except Exception:
            return False
        self.pg.click(f'.dd-dlg [data-dd={action}]')
        self.pg.wait_for_selector('.dd-dlg', state='detached', timeout=10000)
        return True

    def open_panes(self):
        """Editor panels (preview, modes, axes, OpenType, languages) are collapsed by default: expand them for checks that need their controls."""
        self.pg.evaluate("typeof edOpenAll==='function'&&edOpenAll()")
        self.pg.evaluate("S.tab==='edit'&&typeof dwOpen==='function'&&dwOpen('edit','all')")  # editor settings live in the rail drawer; «all» shows every section
        self.pg.wait_for_timeout(250)

    def download(self, item, timeout=120000):
        """Click Скачать -> item (data-x) and return (suggested_name, bytes)."""
        self.pg.wait_for_function("!document.querySelector('#ex-menu').hasAttribute('aria-busy')", timeout=timeout)
        self.pg.evaluate("document.querySelector('#ex-menu').click()")
        self.pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'", timeout=10000)
        with self.pg.expect_download(timeout=timeout) as d:
            self.pg.evaluate("x=>document.querySelector('[data-x='+x+']').click()", item)
            self.pg.evaluate("(()=>{const p=document.querySelector('#xpv');if(p&&!p.hidden)p.querySelector('[data-xa=go]').click();})()")  # «Перед скачиванием»: форматы файлов шрифта подтверждаются кнопкой «Скачать»
        dl = d.value
        path = os.path.join(LOGS, 'dl_' + self.name + '_' + item + '_' + dl.suggested_filename)
        dl.save_as(path)
        with open(path, 'rb') as f:
            data = f.read()
        return dl.suggested_filename, data, path

    def close(self):
        self.b.close()


def run(name, fn):
    """Run fn() -> details string. Print PASS/FAIL line; return exit code."""
    t0 = time.time()
    try:
        det = fn()
        print(f'PASS {name} {det} t={time.time()-t0:.1f}s', flush=True)
        return 0
    except Exception as e:  # noqa
        import traceback  # Stage 4A: name the failing line (bare asserts print an empty message)
        fr = [f for f in traceback.extract_tb(e.__traceback__) if f.filename.endswith('.py') and 'e2e_' in f.filename]
        at = f' @{os.path.basename(fr[-1].filename)}:{fr[-1].lineno}' if fr else ''
        print(f'FAIL {name} {type(e).__name__}: {str(e)[:300]}{at} t={time.time()-t0:.1f}s', flush=True)
        return 1


def check_all(checks):
    """checks: list of (name, fn). Each check gets its own browser; runs sequentially in this process."""
    rc = 0
    with sync_playwright() as p:
        for name, fn in checks:
            rc |= run(name, lambda: fn(p))
    return rc


def vf_zip(data):
    """W96-R: the variable-font export is ONE zip (X-VF.ttf [+ X-VF-Italic.ttf] in the root, woff2/X-VF.woff2 [+ Italic]); returns {basename: bytes}."""
    z = zipfile.ZipFile(io.BytesIO(data))
    assert z.testzip() is None
    return {n.split('/')[-1]: z.read(n) for n in z.namelist()}


def vf_ttf(data, italic=False):
    """The regular (or italic) VF .ttf out of the variable-font zip."""
    d = vf_zip(data)
    k = [n for n in d if n.endswith('.ttf') and (('Italic' in n) == italic)]
    assert len(k) == 1, sorted(d)
    return d[k[0]]


def ttf_bytes_ok(data):
    from fontTools.ttLib import TTFont
    f = TTFont(io.BytesIO(data))
    return f


def glyph_sigs(font):
    """name -> (glyf bytes, advance) for every glyph; cmap as {codepoint: name}."""
    glyf = font['glyf']
    out = {}
    for n in font.getGlyphOrder():
        g = glyf[n]
        out[n] = (g.compile(glyf) if g.numberOfContours != 0 else b'', font['hmtx'][n][0])
    cmap = {}
    for t in font['cmap'].tables:
        cmap.update(t.cmap)
    return out, cmap
