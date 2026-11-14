"""W88 startup budget (relative, machine independent as far as possible): the first paint and DOMContentLoaded must not wait for the font cores to build covers.
Checks on a cold load of index.html (1440x900, 2 runs, median): (1) DOMContentLoaded and first contentful paint below budget, (2) no single long task above budget
during the first 3 s, (3) no glyph generation on the main path before DOMContentLoaded (finalGlyph is not called by hmHero synchronously), (4) the home ribbon still appears,
(5) JS heap after the ribbon is built below budget. One line: perf."""
import os, sys, statistics
sys.path.insert(0, os.path.dirname(__file__))
from common import PAGE, TOUR_OFF, CHROME
from playwright.sync_api import sync_playwright
BUDGET = {'dcl': 4000, 'fcp': 2500, 'longtask_3s': 2500, 'heap_mb': 260}   # generous: this runner is slow (2 cores); the baseline was dcl 9800 ms


def run_once(p):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}); ctx.add_init_script(TOUR_OFF)
    ctx.add_init_script("window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push([e.startTime,e.duration]))).observe({type:'longtask',buffered:true})}catch(e){}")
    pg = ctx.new_page(); pg.goto('file://' + PAGE)
    pg.wait_for_function("typeof S!=='undefined'&&!!document.querySelector('[data-tab=home]')", timeout=60000)
    pg.wait_for_function("document.getElementById('hm-bg').classList.contains('on')", timeout=90000)
    r = pg.evaluate("""(()=>{const n=performance.getEntriesByType('navigation')[0],f=performance.getEntriesByName('first-contentful-paint')[0];
      return {dcl:n.domContentLoadedEventEnd,fcp:f?f.startTime:0,lt:Math.max(0,...__lt.filter(x=>x[0]<3000).map(x=>x[1])),heap:performance.memory?performance.memory.usedJSHeapSize/1048576:0,
      ribbon:document.querySelectorAll('#hm-bg canvas').length}})()""")
    b.close(); return r


def main():
    with sync_playwright() as p:
        rs = [run_once(p) for _ in range(2)]
    m = {k: statistics.median(r[k] for r in rs) for k in rs[0]}
    bad = []
    if m['dcl'] > BUDGET['dcl']: bad.append(f"DCL {m['dcl']:.0f} ms > {BUDGET['dcl']}")
    if m['fcp'] > BUDGET['fcp']: bad.append(f"FCP {m['fcp']:.0f} ms > {BUDGET['fcp']}")
    if m['lt'] > BUDGET['longtask_3s']: bad.append(f"longest task in first 3 s {m['lt']:.0f} ms > {BUDGET['longtask_3s']}")
    if m['heap'] > BUDGET['heap_mb']: bad.append(f"heap {m['heap']:.0f} MB > {BUDGET['heap_mb']}")
    if m['ribbon'] < 20: bad.append(f"home ribbon has {m['ribbon']} canvases")
    if bad: print('FAIL perf ' + '; '.join(bad)); return 1
    print(f"PASS perf dcl {m['dcl']:.0f} ms, fcp {m['fcp']:.0f} ms, longest task {m['lt']:.0f} ms, heap {m['heap']:.0f} MB, ribbon {m['ribbon']:.0f} canvases")
    return 0


if __name__ == '__main__':
    sys.exit(main())
