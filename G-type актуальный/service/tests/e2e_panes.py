"""panes: every collapsible section is a .pane (no <details>), headers toggle (aria-expanded) and persist across reload,
exactly one pane open by default in the editor settings column (fonts volt and pixel), draw and import screens, proof metrics."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all

VIS = "e=>!!(e.offsetParent&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0)"
HEADS = """(root)=>{const r=document.querySelector(root);if(!r)return [];
 return [...r.querySelectorAll('.pane')].filter(p=>{const h=p.querySelector(':scope>.pane-h');return h&&h.offsetParent&&h.getBoundingClientRect().width>0;})
  .map(p=>({key:p.dataset.pane,open:p.querySelector(':scope>.pane-h').getAttribute('aria-expanded')==='true',
            body:p.querySelector(':scope>.pane-b').hidden===false}))}"""
DET = "()=>[...document.querySelectorAll('details,summary')].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>0).map(e=>e.tagName+'#'+e.id)"


def toggle_all(pg, root):
    """click every visible header once; return {key: expected_open}"""
    want = {}
    for h in pg.evaluate(HEADS, root):
        sel = f"{root} .pane[data-pane='{h['key']}']>.pane-h"
        pg.click(sel)
        want[h['key']] = not h['open']
    return want


def check_view(s, enter, root, name, one_open=False):
    pg = s.pg
    enter()
    heads = pg.evaluate(HEADS, root)
    assert heads, f'{name}: no panes found in {root}'
    bad = pg.evaluate(DET)
    assert not bad, f'{name}: visible details/summary {bad}'
    if one_open:
        n = sum(1 for h in heads if h['open'])
        assert n == 1, f'{name}: {n} panes open by default (want 1): {heads}'
    for h in heads:
        assert h['open'] == h['body'], f'{name}: {h["key"]} aria-expanded and body visibility disagree'
    want = toggle_all(pg, root)
    now = {h['key']: h['open'] for h in pg.evaluate(HEADS, root)}
    for k, v in want.items():
        assert now[k] == v, f'{name}: {k} did not toggle'
    pg.reload()
    pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
    enter()
    after = {h['key']: h['open'] for h in pg.evaluate(HEADS, root)}
    for k, v in want.items():
        assert after.get(k) == v, f'{name}: {k} not persisted ({after.get(k)} != {v})'
    # keyboard: a header is a real button with aria-expanded
    kinds = pg.evaluate("(root)=>[...document.querySelectorAll(root+' .pane>.pane-h')].filter(h=>h.offsetParent).map(h=>h.tagName+':'+h.hasAttribute('aria-expanded'))", root)
    assert all(k == 'BUTTON:true' for k in kinds), f'{name}: header not a button with aria-expanded: {set(kinds)}'
    return len(want)


GRP = "()=>Object.fromEntries([...document.querySelectorAll('#params .grp')].map(g=>{const h=g.querySelector('h5');return [h.textContent,[h.getAttribute('aria-expanded')==='true',!g.classList.contains('shut'),h.getAttribute('role'),h.tabIndex]]}))"


def groups(s):
    """parameter groups (.grp h5): button semantics + aria-expanded, default only «Пропорции» open, mouse and keyboard toggles persist across reload and across fonts"""
    pg = s.pg
    pg.evaluate("try{localStorage.clear()}catch(e){}")
    pg.reload(); pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
    s.open_font('volt'); pg.evaluate("dwOpen('edit','params')"); pg.wait_for_timeout(300)
    g = pg.evaluate(GRP)
    assert len(g) >= 4, g
    assert all(v[2] == 'button' and v[3] == 0 and v[0] == v[1] for v in g.values()), f'group header semantics: {g}'
    assert [k for k, v in g.items() if v[0]] == ['Пропорции'], f'default open groups: {[k for k, v in g.items() if v[0]]}'
    pg.click('#params .grp:has(h5:text-is("Штрихи")) h5')              # mouse: open «Штрихи»
    pg.focus('#params .grp:has(h5:text-is("Пропорции")) h5'); pg.keyboard.press('Enter')  # keyboard: close «Пропорции»
    pg.focus('#params .grp:has(h5:text-is("Форма")) h5'); pg.keyboard.press('Space')     # keyboard: open «Форма»
    g = pg.evaluate(GRP)
    assert g['Штрихи'][0] and not g['Пропорции'][0] and g['Форма'][0], g
    pg.reload(); pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
    for fid in ('volt', 'kvadra'):
        pg.evaluate("setTab('home')"); s.open_font(fid); pg.evaluate("dwOpen('edit','params')"); pg.wait_for_timeout(300)
        g = pg.evaluate(GRP)
        assert g['Штрихи'][0] and g['Форма'][0] and not g['Пропорции'][0], f'{fid}: groups not remembered: {g}'
    return 'groups ok (default, mouse+keyboard, persisted across reload and fonts)'


def run(p):
    out = []
    s = Session(p, 'panes')
    try:
        for fid in ('volt', 'pixel'):
            def enter(fid=fid):
                s.pg.evaluate("setTab('home')")
                s.open_font(fid)
                s.pg.evaluate("dwOpen('edit','all')")  # settings live in the rail drawer; «all» shows every section (test view)
            s.pg.evaluate("try{localStorage.clear()}catch(e){}")
            s.pg.reload(); s.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
            out.append(f'{fid}={check_view(s, enter, "#pcard .panel", "edit-" + fid, one_open=True)}')
        # proof metrics pane
        def enter_proof():
            s.open_font('volt'); s.pg.evaluate("setTab('proof')"); s.pg.wait_for_function("S.tab==='proof'", timeout=10000)
        s.pg.evaluate("try{localStorage.clear()}catch(e){}")
        s.pg.reload(); s.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
        out.append(f'proof={check_view(s, enter_proof, "#view-proof", "proof")}')
        # draw
        def enter_draw():
            s.pg.evaluate("setTab('draw')"); s.pg.wait_for_selector('#dr-side', state='attached', timeout=15000)
            s.pg.evaluate("dwOpen('draw','all')"); s.pg.wait_for_function("!!document.querySelector('#dr-side .pane-h')&&document.querySelector('#dr-side').offsetParent!==null", timeout=15000)
        s.pg.evaluate("try{localStorage.clear()}catch(e){}")
        s.pg.reload(); s.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
        out.append(f'draw={check_view(s, enter_draw, ".dr", "draw")}')
        # import
        def enter_imp():
            s.pg.evaluate("setTab('home')"); s.pg.wait_for_selector('#imp-card', timeout=10000)
            s.pg.click('#imp-card'); s.pg.wait_for_function("!!document.querySelector('.impview .pane-h')&&document.querySelector('.impview').offsetParent!==null", timeout=15000)
            s.pg.evaluate("dwOpen('import','all')"); s.pg.wait_for_timeout(300)
        s.pg.evaluate("try{localStorage.clear()}catch(e){}")
        s.pg.reload(); s.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function'", timeout=30000)
        out.append(f'import={check_view(s, enter_imp, ".impview", "import")}')
        out.append(groups(s))
        assert not s.errs, f'console errors: {s.errs[:3]}'
    finally:
        s.close()
    return ' '.join(out)


if __name__ == '__main__':
    sys.exit(check_all([('panes', run)]))
