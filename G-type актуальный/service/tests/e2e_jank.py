"""jank: frame-level detectors (Stageshow film checks) for the real UI.
Dynamic (virtual 60 fps clock, tests/jank_probe.js): every animation is paused and advanced one frame per rAF, getBoundingClientRect of every visible element is
sampled each frame while the main flows run (panels, popovers, tabs, sets, save glyph, draw cells + a cell setting, theme, toast).
  1 settle snap        element moves 0.5-3 px in its last step and does not decelerate (or jumps 0.5-3 px alone: 'jump')
  2 appears-then-moves element visible >= 1 static frame before its motion starts
  3 near-empty         a visible container (surface) has < 10 % of its area covered by content for >= 2 frames
  4 anchor drift       the edge of a popover/menu facing its trigger moves > 1 px, or any edge moves > 1 px once the popover is fully opaque
Static (tests/jank_static.js; all views x light/dark x 1440/400):
  5 tight inset        text closer than 8 px to the edge of its card/button/chip
  6 near-tangent       sibling boxes whose facing edges are 1-3 px apart
  7 mixed icons        icons in one toolbar with different size or stroke width (or stroke next to mask icons)
Intentional cases live in WL below with a reason (pattern is matched against 'detector|flow-or-view|descriptor|parent'). A whitelist line that matches nothing is reported.
usage: python3 tests/e2e_jank.py [dyn|static]   (env GT_JANK_V=1 prints every finding, also the whitelisted ones)"""
import sys, os, re, json, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from uiq_views import goto, VIEWS
from e2e_draw import Draw
from draw_scaffold import SCAFFOLD

HERE = os.path.dirname(__file__)
PROBE = open(os.path.join(HERE, 'jank_probe.js')).read()
STATIC = open(os.path.join(HERE, 'jank_static.js')).read()
URL = 'file://' + PAGE + '?motion=1'
VERBOSE = bool(os.environ.get('GT_JANK_V'))
ONLY = os.environ.get('GT_JANK_ONLY')   # dev: probe only flows whose name matches (the others just run)

# (detector, regex, reason)
WL = [
    (5, r'span\.ok', 'proof coverage tiles: the glyph fills a 26x28 tile on purpose'),
    (7, r'div\.vact', 'carousel arrows (22px) next to the «Все шрифты» link whose round arrow button is a 32px CTA by design'),
]


def whitelisted(det, key):
    for i, (d, rx, why) in enumerate(WL):
        if d == det and re.search(rx, key):
            USED.add(i)
            return why
    return None


USED = set()

# ------------------------------------------------------------------ analysis of one flow

def series(el, ticks):
    """tick -> (l,t,r,b,op); missing = None"""
    out = [None] * ticks
    for t, l, tp, w, h, op in el['s']:
        if w > 0 and h > 0:
            out[t] = (l, tp, l + w, tp + h, op)
    return out


def step(a, b):
    return max(abs(a[i] - b[i]) for i in range(4))


def analyze(flow, res, watch):
    found = []
    ticks = res['ticks']
    ser = []
    for el in res['els']:
        s = series(el, ticks)
        ser.append((el, s))
    flagged = {1: set(), 2: set()}
    for idx, (el, s) in enumerate(ser):
        pres = [i for i, v in enumerate(s) if v]
        if len(pres) < 2:
            continue
        # per tick step (only between two present ticks)
        d = [0.0] * ticks
        for i in range(1, ticks):
            if s[i] and s[i - 1]:
                d[i] = step(s[i], s[i - 1])
        mov = [i for i in range(1, ticks) if d[i] > .01]
        last = pres[-1]
        # ---- 1. settle snap
        if mov:
            k = mov[-1]
            if k <= last - 2 and 0.5 <= d[k] <= 3 and (s[k][4] > .3):
                run = 0
                j = k - 1
                while j >= 1 and d[j] > .01:
                    run += 1
                    j -= 1
                if run >= 2 and d[k] >= .8 * d[k - 1]:
                    found.append((1, 'snap', el, f'last step {d[k]:.2f}px after {d[k-1]:.2f}px (tick {k})'))
                    flagged[1].add(idx)
                elif run == 0:
                    found.append((1, 'jump', el, f'jumps {d[k]:.2f}px in one frame (tick {k})'))
                    flagged[1].add(idx)
        # ---- 2. appears-then-moves
        first = pres[0]
        vis = lambda i: s[i] and s[i][4] >= .1
        v = next((i for i in pres if vis(i)), None)
        if v is not None and (v > 0 or (el['s'][0][0] > 0)) and v < ticks - 2:
            if v > 0 and s[v - 1] is not None and s[v - 1][4] >= .1:
                continue
            nxt = v + 1
            if nxt < ticks and s[nxt] and vis(nxt) and d[nxt] <= .01:
                m = next((i for i in range(nxt + 1, ticks) if d[i] > .3 and s[i] and vis(i)), None)
                if m is not None and all(s[i] and vis(i) for i in range(v, m + 1)) and m - v <= 30:
                    tot = sum(d[i] for i in range(m, ticks))
                    if tot >= 2:
                        found.append((2, 'appears-then-moves', el, f'visible at tick {v}, static until {m}, then moves {tot:.1f}px'))
                        flagged[2].add(idx)
    # ---- 3. near-empty containers
    for sel, cv in res['cov'].items():
        empty = [c[0] for c in cv if c[1] > .6 and c[2] < .10]
        mx = max([c[2] for c in cv] or [0])
        if mx > .2:
            run = best = 0
            for i, c in enumerate(cv):
                if c[1] > .6 and c[2] < .10:
                    run += 1
                    best = max(best, run)
                else:
                    run = 0
            if best >= 2:
                found.append((3, 'near-empty', {'d': sel, 'p': ''}, f'{best} consecutive frames with < 10 % content (max {mx:.0%})'))
    # ---- 4. anchor drift
    for w in watch:
        cand = [(el, s) for el, s in ser if el['d'].startswith(w['d'])]
        for el, s in cand[:1]:
            op1 = [v for v in s if v and v[4] >= .99]
            if not op1:
                continue
            ref = op1[len(op1) // 2]
            tr = w['trig']
            # edge facing the trigger
            tcx, tcy = (tr[0] + tr[2]) / 2, (tr[1] + tr[3]) / 2
            dist = {0: abs(ref[0] - tcx), 2: abs(ref[2] - tcx), 1: abs(ref[1] - tcy), 3: abs(ref[3] - tcy)}
            # the anchored edge is the one closest to the trigger's matching edge
            dist = {0: abs(ref[0] - tr[0]) if False else min(abs(ref[0] - tr[0]), abs(ref[0] - tr[2])),
                    2: min(abs(ref[2] - tr[0]), abs(ref[2] - tr[2])),
                    1: min(abs(ref[1] - tr[1]), abs(ref[1] - tr[3])),
                    3: min(abs(ref[3] - tr[1]), abs(ref[3] - tr[3]))}
            ae = min(dist, key=dist.get)
            worst = 0
            for v in s:
                if v and v[4] > .02:
                    worst = max(worst, abs(v[ae] - ref[ae]))
            if worst > 1.0:
                found.append((4, 'anchor-drift', el, f'anchor edge {["left","top","right","bottom"][ae]} drifts {worst:.1f}px while opening/closing'))
            wo = 0
            for v in op1:
                wo = max(wo, max(abs(v[i] - ref[i]) for i in range(4)))
            if wo > 1.0:
                found.append((4, 'open-drift', el, f'edge moves {wo:.1f}px while fully opaque'))
    # dedupe descendants: keep an element only if its parent is not flagged the same way
    out = []
    names = {}
    for f in found:
        names.setdefault((f[0], f[1]), set()).add(f[2]['d'])
    for f in found:
        if f[0] in (1, 2) and f[2].get('p') in names.get((f[0], f[1]), ()) and f[2]['p']:
            continue
        out.append(f)
    return out


# ------------------------------------------------------------------ flows

class Rig:
    def __init__(self, p, w=1440, h=900, theme='light'):
        self.b = p.chromium.launch()
        self.ctx = self.b.new_context(viewport={'width': w, 'height': h}, color_scheme=theme, accept_downloads=True)
        self.ctx.add_init_script(TOUR_OFF)
        self.ctx.add_init_script('window.__GT_TEST=1')
        self.pg = self.ctx.new_page()
        self.errs = []
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.pg.goto(URL)
        self.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && typeof MO!=='undefined' && MO.ready && typeof JK==='undefined'", timeout=30000)
        self.pg.wait_for_function("typeof bgQuiet!=='function'||bgQuiet()", timeout=180000)   # W88: startup work runs in idle slices; flows are measured on a quiet page
        self.pg.add_style_tag(content='.hm-mesh>b,.hm-mesh i,.hm-row{animation:none!important}')   # decorative loops of the home page
        self.pg.evaluate(PROBE)
        self.findings = []
        self.flows = 0

    def rect(self, sel):
        return self.pg.evaluate("s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]}", sel)

    def flow(self, name, action, cont=(), watch=(), min_ticks=10):
        pg = self.pg
        if ONLY and not re.search(ONLY, name):
            action()
            return None
        wl = []
        for w in watch:
            wl.append({'d': w[0], 'trig': self.rect(w[1])})
        t0 = time.time()
        pg.evaluate("o=>JK.start(o)", {'cont': list(cont), 'min': min_ticks})
        action()
        res = pg.evaluate("JK.finish()")
        if VERBOSE:
            print(f'  flow {name} {time.time()-t0:.1f}s ticks {res["ticks"]}', flush=True)
        self.flows += 1
        for f in analyze(name, res, wl):
            self.findings.append((name,) + f)
        return res

    def ev(self, js, *a):
        return self.pg.evaluate(js, *a) if a else self.pg.evaluate(js)

    def settle(self, ms=120):
        self.pg.wait_for_timeout(ms)


def dyn(p):
    r = Rig(p)
    pg = r.pg
    ev = r.ev
    click = lambda sel: ev("s=>document.querySelector(s).click()", sel)

    # ---- home / library chrome
    r.flow('help-open', lambda: ev("helpToggle(true)"), watch=[('div#helpc', '#help')])
    r.settle()
    r.flow('help-close', lambda: ev("helpToggle(false)"), watch=[('div#helpc', '#help')])
    r.settle()
    r.flow('project-open', lambda: click('#settings'), watch=[('div#projpop', '#settings')])
    r.settle()
    r.flow('project-close', lambda: click('#settings'), watch=[('div#projpop', '#settings')])
    r.settle()
    r.flow('theme-dark', lambda: click('#theme-btn'))
    r.settle(200)
    r.flow('theme-light', lambda: click('#theme-btn'))
    r.settle(200)
    r.flow('tab-library', lambda: ev("setTab('library')"), cont=['#view-library', '#view-lib'])
    r.settle(300)
    r.flow('tab-fav', lambda: ev("setTab('fav')"), cont=['#view-fav'])
    r.settle(300)
    # ---- editor
    ev("setTab('library')")
    pg.wait_for_selector('#libgrid .lcard[data-font=kvadra]', timeout=10000)
    r.settle(300)
    ev("document.querySelector('#libgrid .lcard[data-font=kvadra]').click()")   # font build = long tasks, not a motion flow
    pg.wait_for_function("S.fontId==='kvadra'&&!S.live&&S.tab==='edit'", timeout=30000)
    r.settle(1500)
    r.flow('style-italic', lambda: click('[data-style=italic]'), cont=['#stagebox'])
    r.settle(200)
    r.flow('style-regular', lambda: click('[data-style=regular]'), cont=['#stagebox'])
    r.settle(200)
    r.flow('glyph-select', lambda: ev("selectGlyph('Ж')"))
    r.settle(200)
    for sec in ('params', 'presets', 'grid'):
        r.flow('drawer-' + sec, (lambda s=sec: ev(f"dwOpen('edit','{s}')")), cont=['#pcard'], watch=[])
        r.settle(500)
    r.flow('drawer-switch', lambda: ev("dwOpen('edit','ref')"), cont=['#pcard'])
    r.settle(300)
    r.flow('drawer-close', lambda: ev("dwClose('edit')"), cont=['#pcard'])
    r.settle(400)
    r.flow('export-open', lambda: click('#ex-menu'), watch=[('div#ex-list', '#ex-menu')], cont=['#ex-list'])
    r.settle(200)
    r.flow('export-close', lambda: click('#ex-menu'), watch=[('div#ex-list', '#ex-menu')])
    r.settle(300)
    r.flow('tab-proof', lambda: ev("setTab('proof')"), cont=['#view-proof'])
    r.settle(400)
    r.flow('tab-kern', lambda: ev("setTab('kern')"), cont=['#view-kern'])
    r.settle(400)
    r.flow('tab-edit', lambda: ev("setTab('edit')"), cont=['#view-edit'])
    r.settle(400)
    r.flow('toast-in', lambda: ev("toast('Сохранено в браузере')"), cont=['#toast'])
    r.flow('toast-out', lambda: ev("document.querySelector('#toast').classList.remove('on')"))
    r.settle(200)
    r.flow('pane-collapse', lambda: click('#sw-toggle'))
    r.settle(300)
    r.flow('pane-expand', lambda: click('#sw-toggle'))
    r.settle(300)
    # ---- draw mode
    ev("setTab('home')")
    r.settle(600)
    r.flow('tab-draw', lambda: ev(SCAFFOLD), cont=['#view-draw'])
    pg.wait_for_selector('#dr-cv', timeout=15000)
    pg.wait_for_function("typeof GT_DRAW!=='undefined'&&!!GT_DRAW._t", timeout=15000)
    r.settle(700)

    class S_:  # Draw wants an object with .pg
        pass
    s_ = S_(); s_.pg = pg
    d = Draw(s_)
    pg.evaluate("dwClose('draw')")
    r.settle(400)
    d.tool('cells')
    r.settle(400)
    c = lambda i, j: ((i + .5) * 70, (j + .5) * 70)
    r.flow('draw-cells', lambda: d.path([c(2, 8), c(2, 2), c(6, 2)], steps=2), min_ticks=10)
    r.settle(300)
    ev("dwOpen('draw','cells')")
    r.settle(600)
    r.flow('cell-shape', lambda: click('#dr-cl [data-cla=square]'), min_ticks=24)
    r.settle(300)
    ev("(()=>{const e=document.querySelector('#dr-cr');e.value=30;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()")
    r.settle(400)
    r.flow('save-glyph', lambda: click('#dr-sv'), min_ticks=24)
    r.settle(500)
    r.flow('draw-drawer-close', lambda: ev("dwClose('draw')"), cont=['#dr-side'])
    r.settle(300)
    r.flow('draw-test-open', lambda: click('#dr-testb'), cont=['#dr-mt .dr-mc'], min_ticks=24)
    r.settle(500)
    r.flow('draw-test-close', lambda: click('#dr-mtc'), min_ticks=24)
    r.settle(400)
    r.flow('draw-font-open', lambda: click('#dr-fontb'), cont=['#dr-mf .dr-mc'], min_ticks=24)
    r.settle(500)
    r.flow('draw-font-close', lambda: click('#dr-mfx'), min_ticks=24)
    r.settle(300)
    # ---- import
    ev("setTab('home')")
    r.settle(600)
    r.flow('import-open', lambda: click('#imp-card'), cont=['#view-imp', '#imp-side'], min_ticks=30)
    r.settle(600)
    r.flow('import-close', lambda: ev("iuClose()"), min_ticks=30)
    r.settle(300)
    errs = r.errs[:3]
    out = (r.findings, r.flows, errs)
    r.b.close()
    return out


def static(p):
    findings = []
    n = 0
    for theme in ('light', 'dark'):
        for (w, h) in ((1440, 900), (400, 844)):
            b = p.chromium.launch()
            ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=theme, has_touch=(w < 1000))
            ctx.add_init_script(TOUR_OFF)
            pg = ctx.new_page()
            pg.goto('file://' + PAGE)
            pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'&&!!document.querySelector('[data-tab=home]')", timeout=30000)
            pg.wait_for_timeout(1000)
            for v in VIEWS + ['draw-cells', 'help', 'project']:
                try:
                    if v == 'draw-cells':
                        goto(pg, 'draw')
                        pg.evaluate("dwOpen('draw','cells')")
                        pg.wait_for_timeout(500)
                    elif v == 'help':
                        goto(pg, 'home')
                        pg.evaluate("helpToggle(true)")
                        pg.wait_for_timeout(300)
                    elif v == 'project':
                        goto(pg, 'edit')
                        pg.evaluate("document.querySelector('#settings').click()")
                        pg.wait_for_timeout(300)
                    else:
                        goto(pg, v)
                except Exception as e:
                    findings.append(('static', 0, 'error', {'d': v, 'p': ''}, str(e)[:80]))
                    continue
                res = pg.evaluate(STATIC)
                n += 1
                tag = f'{v}/{theme}/{w}'
                for x in res['inset']:
                    findings.append((tag, 5, 'tight-inset', x, f"{x['t']!r} l{x['dl']} r{x['dr']} t{x['dt']} b{x['db']} in {x['w']}x{x['h']}"))
                for x in res['tangent']:
                    findings.append((tag, 6, 'near-tangent', x, f"gap {x['gap']}px ({x['axis']}) of {x['n']} siblings"))
                for x in res['icons']:
                    findings.append((tag, 7, 'mixed-icons', x, f"sizes {x['sizes']} stroke {x['sw']} kinds {x['kinds']} ({x['n']} icons)"))
                pg.evaluate("typeof helpToggle==='function'&&helpToggle(false)")
            b.close()
    return findings, n, []


def report(findings, mode):
    """dedupe by (detector, descriptor); apply whitelist; print"""
    seen = {}
    for f in findings:
        flow, det, kind, el, msg = f
        key = f"{det}|{kind}|{flow}|{el['d']}|{el.get('p','')}"
        el = dict(el, d=re.sub(r'\"[^\"]*\"|\[[^\]]*\]', '', el['d']))   # same element class with other text/label = one finding
        f = (flow, det, kind, el, msg)
        if (det, el['d']) in seen:
            seen[(det, el['d'])][2].add(flow.split('/')[0] if mode == 'static' else flow)
            continue
        seen[(det, el['d'])] = [f, key, {flow.split('/')[0] if mode == 'static' else flow}]
    bad = []
    wl = 0
    for (det, d), (f, key, flows) in sorted(seen.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        why = whitelisted(det, f"{f[2]}|{d}|{f[3].get('p','')}")
        line = f"  [{det}] {f[2]:<18} {d[:60]:<60} {f[4]}  <- {','.join(sorted(flows))[:70]}"
        if why:
            wl += 1
            if VERBOSE:
                print('  ok' + line[1:] + f'   (whitelisted: {why})')
        else:
            bad.append(line)
    return bad, wl


def full(p):
    import threading
    out = []
    bad = []
    wl = 0
    flows = 0
    nviews = 0
    for mode, fn in (('dyn', dyn), ('static', static)):
        if len(sys.argv) > 1 and sys.argv[1] != mode:
            continue
        f, n, errs = fn(p)
        if errs:
            raise AssertionError('page errors: ' + repr(errs))
        b, w = report(f, mode)
        bad += b
        wl += w
        if mode == 'dyn':
            flows = n
        else:
            nviews = n
    for line in bad:
        print(line)
    unused = [i for i in range(len(WL)) if i not in USED]
    if len(sys.argv) <= 1 and unused:
        print('  stale whitelist entries:', [WL[i][1] for i in unused])
    assert not bad, f'{len(bad)} findings'
    return f'flows {flows} views {nviews} findings 0 whitelisted {wl}'


if __name__ == '__main__':
    def main():
        with sync_playwright() as p:
            return full(p)
    sys.exit(run('jank', main))
