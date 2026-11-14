"""Work-mode grid + drawer insets (FLY). For every mode (edit/draw/import) x every drawer section, at 1440 and 1280, both themes:
drawer top/bottom flush with the canvas, drawer left flush with the first block (sample / top bar), gaps drawer-canvas = canvas-glyph column = block-canvas,
one header height, header padding-left = body inset, close icon on the right inset and vertically centred, no horizontal overflow.
Tablet 768 / phone 390: drawer may overlay, but no overflow and no clipping by the viewport. Screenshots (GT_SHOTS=1 or --shots) go to logs/dw_shots/.
usage: python3 tests/e2e_dwgrid.py [--report] [--shots TAG]   (--report prints all deviations and never fails)"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from e2e_rail import enter

REPORT = '--report' in sys.argv
SHOT_TAG = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
MODES = {
    # mode: (drawer, canvas, first block, glyph column or None, sections)
    'edit': ('#pcard', '#stagebox', '.specwrap', '.gcard', ['params', 'presets', 'special', 'grid', 'ref', 'ot', 'lang', 'all']),
    'draw': ('#dr-side', '.dr-mid', '.dr-top', '.dr-gwrap', ['grid', 'con', 'recs', 'all']),
    'import': ('#imp-side', '.imp-lib', '.imp-top', None, ['up', 'opt', 'pv', 'lg', 'all']),
}
MEAS = """([dr,cv,bk,gl])=>{
  const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom}};
  const d=R(dr),c=R(cv),b=R(bk),g=gl?R(gl):null,de=document.querySelector(dr);
  const h=de.querySelector(':scope>.dw-h'),hr=h.getBoundingClientRect(),t=h.querySelector('.dw-t').getBoundingClientRect(),x=h.querySelector('.dw-x'),xi=(x.querySelector('.ico')||x).getBoundingClientRect(),xr=x.getBoundingClientRect();
  let minL=1e9,minE='';
  de.querySelectorAll('button,input,select,textarea,label,h3,h4,h5,canvas,.pane-h,.pane-t,.seg,.chip,.btn,.tg').forEach(e=>{
    if(h.contains(e)||e.closest('.dw-off,[hidden]'))return;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);
    if(r.width<2||r.height<2||cs.visibility==='hidden'||cs.display==='none')return;if(r.left<minL){minL=r.left;minE=e.tagName+'.'+e.className+'#'+e.id}});
  return {d,c,b,g,hh:hr.height,hl:t.left-d.l,hxr:d.r-xi.right,hcy:Math.abs((xr.top+xr.bottom)/2-(hr.top+hr.bottom)/2),bodyL:minL-d.l,minE,
    ovf:document.documentElement.scrollWidth-innerWidth,help:Math.max(...[...document.querySelectorAll('.rail .rpill')].map(p=>p.getBoundingClientRect()).filter(r=>r.height>0).map(r=>r.bottom)),
    clip:(d.l<-0.5||d.r>innerWidth+0.5||d.t<-0.5||d.b>innerHeight+0.5)}}"""


def settle(pg, dr):
    """wait until the drawer transition and the canvas push (margin transition) are over"""
    pg.wait_for_timeout(120)
    pg.wait_for_function("d=>{const e=document.querySelector(d);return ['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(e).transform)&&getComputedStyle(e).opacity==='1'}", arg=dr)
    pg.wait_for_timeout(350)


def analyse(m, n, tag, w):
    out = []
    dev = lambda k, v, lim=1: out.append(f'{tag} {k}={v:.1f}') if abs(v) > lim else None
    d, c, b, g = n['d'], n['c'], n['b'], n['g']
    dev('top', d['t'] - c['t']); dev('bottom', d['b'] - c['b']); dev('left-vs-block', d['l'] - b['l'])
    gap = c['l'] - d['r']; dev('gap-dw-canvas-vs-block', gap - (c['t'] - b['b']))
    if g: dev('gap-dw-canvas-vs-canvas-glyph', gap - (g['l'] - c['r']))
    dev('canvas-bottom-vs-rail', c['b'] - n['help'])
    return out, n['hh'], n['hl'], n['hxr'], n['hcy'], n['bodyL']


def run_all(p):
    s = Session(p, 'dwgrid'); pg = s.pg; pg.set_default_timeout(20000)
    fails, heads, n_ok, report, ME = [], [], 0, [], {}
    try:
        for theme in ('light', 'dark'):
            pg.evaluate(f"document.documentElement.dataset.theme='{theme}'")
            for w, hgt in ((1440, 900), (1280, 800)):
                pg.set_viewport_size({'width': w, 'height': hgt})
                for mode, (dr, cv, bk, gl, secs) in MODES.items():
                    enter(pg, mode, s); pg.evaluate("document.documentElement.dataset.theme='%s'" % theme)
                    for sec in secs:
                        pg.evaluate(f"dwOpen('{mode}','{sec}')"); settle(pg, dr)
                        if pg.evaluate(f"dwSec('{mode}')") is None:
                            continue  # section not available in this state (e.g. «Свой знак» without an active custom mode)
                        tag = f'{mode}/{sec}/{w}/{theme}'
                        nn = pg.evaluate(MEAS, [dr, cv, bk, gl])
                        o, hh, hl, hxr, hcy, bl = analyse(mode, nn, tag, w)
                        heads.append((tag, hh, hl, hxr, hcy, bl)); ME[tag] = nn['minE']; fails += o; n_ok += 1
                        if nn['ovf'] > 0: fails.append(f'{tag} horizontal overflow {nn["ovf"]}')
                        if SHOT_TAG and w == 1440 and sec in ('params', 'grid', 'up'):
                            os.makedirs(os.path.join(LOGS, 'dw_shots'), exist_ok=True)
                            pg.screenshot(path=os.path.join(LOGS, 'dw_shots', f'{SHOT_TAG}_{mode}_{theme}.png'))
                    pg.evaluate(f"dwClose('{mode}')")
        # header/body insets: one header height, header padding = body inset, close icon on the right inset, vertically centred
        H = [h[1] for h in heads]; hl = [h[2] for h in heads]
        if max(H) - min(H) > 1: fails.append(f'header height varies {min(H):.1f}..{max(H):.1f}')
        if max(hl) - min(hl) > 1: fails.append(f'header left inset varies {min(hl):.1f}..{max(hl):.1f}')
        for tag, hh, hlft, hxr, hcy, bl in heads:
            if abs(hlft - hxr) > 1: fails.append(f'{tag} header left inset {hlft:.1f} != right inset {hxr:.1f}')
            if bl < 1e8 and abs(bl - hlft) > 1: fails.append(f'{tag} body inset {bl:.1f} != header inset {hlft:.1f} ({ME.get(tag)})')
            if hcy > 1: fails.append(f'{tag} close not centred ({hcy:.1f})')
        # tablet / phone: overlay allowed; no overflow, no clipping
        for w, hgt in ((768, 1024), (390, 844)):
            pg.set_viewport_size({'width': w, 'height': hgt})
            for mode, (dr, cv, bk, gl, secs) in MODES.items():
                enter(pg, mode, s)
                for sec in secs:
                    pg.evaluate(f"dwOpen('{mode}','{sec}')"); settle(pg, dr)
                    if pg.evaluate(f"dwSec('{mode}')") is None: continue
                    nn = pg.evaluate(MEAS, [dr, cv, bk, gl]); tag = f'{mode}/{sec}/{w}'
                    if nn['ovf'] > 0: fails.append(f'{tag} horizontal overflow {nn["ovf"]}')
                    if nn['clip']: fails.append(f'{tag} drawer clipped by the viewport {nn["d"]}')
                    n_ok += 1
                pg.evaluate(f"dwClose('{mode}')")
        assert not s.errs, s.errs[:3]
    finally:
        s.close()
    if REPORT:
        for f in fails: print(f)
        print(f'{len(fails)} deviations in {n_ok} drawer states')
        return 'report'
    assert not fails, f'{len(fails)} deviations: ' + '; '.join(fails[:12])
    return f'{n_ok} drawer states (3 modes x sections x 1440/1280 x 2 themes + 768/390) flush top/bottom/left, equal gaps, one header, no overflow'


if __name__ == '__main__':
    with sync_playwright() as p:
        sys.exit(run('dwgrid', lambda: run_all(p)))
