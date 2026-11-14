"""simedit: point edits -> «Применить к похожим…». Volt: drag the n arch shoulder, apply to h u; Liniya: skeleton edit of o, apply to c e.
Exported TTF changes only for the source and the selected targets (plus Cyrillic twins); Undo restores the whole apply in one step."""
import io, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, glyph_sigs, LOGS, shot as _shot
from fontTools.ttLib import TTFont

STAGE = """([x,y])=>{const s=skMap().s(x,y),r=$('#stage').getBoundingClientRect();return [r.left+s[0],r.top+s[1]];}"""
PTS = """([ci,ni])=>{const r=rawGlyph();const n=r.cs[ci].nodes[ni];const s=toS(n.x,n.y),b=$('#stage').getBoundingClientRect();return [b.left+s[0],b.top+s[1]];}"""


def diff_names(s, base_sig):
    sig, cmap = glyph_sigs(TTFont(io.BytesIO(s.download('ttf')[1])))
    return {n for n in sig if sig[n] != base_sig.get(n)}, cmap


def names_of(cmap, chars):
    return {cmap.get(ord(c)) for c in chars if cmap.get(ord(c))}


def twins(s, chars):
    return s.js("(ks=>CHARSET.filter(c=>ks.includes(edKey(c))).join(''))(%s)" % repr(list(chars)))


def pick(s, chars):
    """select exactly these targets in the dialog"""
    s.js("""(cs=>{SIMUI.sel=new Set(cs.map(edKey));simRefresh();})(%s)""" % repr(list(chars)))


def apply_dialog(s, chars, shot=None):
    pg = s.pg
    pg.click('#sim-open')
    pg.wait_for_selector('#sm-go', state='visible', timeout=10000)
    pick(s, chars)
    pg.wait_for_function("!document.querySelector('#sm-go').disabled && document.querySelectorAll('#sm-prev .sm-c span').length>0 && ![...document.querySelectorAll('#sm-prev .sm-c span')].some(x=>x.textContent==='проверка…')", timeout=60000)
    info = s.js("[...document.querySelectorAll('#sm-prev .sm-c')].map(d=>d.dataset.t+':'+d.querySelector('span').textContent+(d.classList.contains('bad')?'!':'')).join('|')")
    if shot:
        _shot(pg, os.path.join(LOGS, shot))
    pg.click('#sm-go')
    pg.wait_for_selector('#simdlg', state='hidden', timeout=10000)
    return info


def undo_all(s, cond):
    for _ in range(6):
        if s.js(cond):
            break
        s.pg.click('#undo')
        s.pg.wait_for_timeout(120)
    assert s.js(cond), 'undo did not restore'


def simedit_check(p):
    s = Session(p, 'simedit')
    try:
        pg = s.pg
        # ---------- Volt: n arch shoulder -> h, u ----------
        s.open_font('volt')
        base_sig, base_cmap = glyph_sigs(TTFont(io.BytesIO(s.download('ttf')[1])))
        s.js("selectGlyph('n')")
        pg.wait_for_function("S.sel==='n' && !S.live", timeout=20000)
        pg.click('[data-mode=points]')
        assert s.js("$('#sim-open').disabled"), 'button must be disabled before edits'
        x, y = s.js("(" + PTS + ")([1,3])")
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x, y - 45, steps=6); pg.mouse.up()   # canvas is larger now: drag further so the shift in font units stays the same
        pg.wait_for_function("S.edits.n&&Object.keys(S.edits.n).some(k=>/^\\d+:\\d+$/.test(k))", timeout=10000)
        assert not s.js("$('#sim-open').disabled"), 'button not enabled after drag'
        assert s.js("$('#sim-open').classList.contains('hint')"), 'no hint after drag end'
        before = s.js("JSON.stringify(S.edits)")
        info = apply_dialog(s, 'hu', 'simedit_volt_dialog.png')
        pg.wait_for_function("S.edits.h&&S.edits.u", timeout=10000)
        assert not s.js("!!S.edits.m||!!S.edits.е"), 'untargeted glyph got edits'
        d, cmap = diff_names(s, base_sig)
        want_src = names_of(cmap, 'n')
        allowed = names_of(cmap, twins(s, 'nhu'))
        assert want_src | names_of(cmap, 'hu') <= d, f'changed {sorted(d)} info={info}'
        assert d <= allowed, f'unexpected glyphs changed {sorted(d - allowed)}'
        undo_all(s, "JSON.stringify(S.edits)==='%s'" % before.replace("'", "\\'"))
        assert s.js("!S.edits.h&&!S.edits.u"), 'undo (one step) left target edits'
        d2, _ = diff_names(s, base_sig)
        assert d2 <= want_src | names_of(cmap, 'n'), f'after undo extra {sorted(d2)}'
        # ---------- Liniya: skeleton o -> c, e ----------
        s.open_font('liniya')
        base_sig2, _ = glyph_sigs(TTFont(io.BytesIO(s.download('ttf')[1])))
        s.js("selectGlyph('o')")
        pg.wait_for_function("S.sel==='o' && !S.live", timeout=30000)
        pg.click('[data-mode=skel]')
        pg.wait_for_function("S.mode==='skel'", timeout=10000)
        s.js("(()=>{snap();S.edits.o={sk:{'0:0':{p:[0,14]},'0:2':{p:[0,-10]}}};bump();syncNodeInfo();})()")
        pg.wait_for_function("!$('#sim-open').disabled", timeout=10000)
        before2 = s.js("JSON.stringify(S.edits)")
        info2 = apply_dialog(s, 'ce', 'simedit_liniya_dialog.png')
        pg.wait_for_function("S.edits.c&&S.edits.e&&S.edits.c.sk&&S.edits.e.sk", timeout=10000)
        d, cmap2 = diff_names(s, base_sig2)
        allowed = names_of(cmap2, twins(s, 'oce'))
        assert names_of(cmap2, 'oce') <= d, f'changed {sorted(d)} info={info2}'
        assert d <= allowed, f'unexpected glyphs changed {sorted(d - allowed)}'
        undo_all(s, "JSON.stringify(S.edits)==='%s'" % before2.replace("'", "\\'"))
        assert s.js("!S.edits.c&&!S.edits.e"), 'undo left target edits'
        _shot(pg, os.path.join(LOGS, 'simedit_liniya_after_undo.png'))
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'volt[{info}] liniya[{info2}] undo=clean'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('simedit', simedit_check)]))
