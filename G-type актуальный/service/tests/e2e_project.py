"""project round-trip: volt deco on n + AV kerning exception + imported glyph set -> save JSON ->
clear storage, reload, open the JSON file -> everything restored (state and exported GPOS)."""
import io, os, sys, glob
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import Session, check_all, PAGE
from e2e_import import make_fixtures, CHARS
from fontTools.ttLib import TTFont
from ttfkern import kern

S2 = """([x,y])=>{const s=skMap().s(x,y),r=$('#stage').getBoundingClientRect();return [r.left+s[0],r.top+s[1]];}"""


def add_deco_and_kern(s):
    pg = s.pg
    s.open_font('volt')
    # stroke deco on n (pen, stroke tool, add op)
    s.js("selectGlyph('n')")
    pg.wait_for_function("S.sel==='n' && !S.live", timeout=20000)
    pg.click('[data-mode=pen]')
    pg.wait_for_function("S.mode==='pen'", timeout=10000)
    pg.click('#pn-tool [data-pnt=s]')
    pg.click('#pn-op [data-pno=add]')
    W = s.js("rawGlyph().w")
    for x, y in [(W - 70, 50), (W + 70, -30)]:
        X, Y = s.js("(" + S2 + ")([%d,%d])" % (x, y))
        pg.mouse.click(X, Y)
        pg.wait_for_timeout(150)
    pg.keyboard.press('Enter')
    pg.wait_for_function("S.edits.n&&S.edits.n.deco&&S.edits.n.deco.length>=1", timeout=10000)
    # kerning exception AV = -60
    pg.evaluate("document.getElementById('kern-open').click()")
    pg.wait_for_function("S.tab==='kern' && !!document.getElementById('kk-v')", timeout=10000)
    pg.fill('#kk-a', 'A'); pg.fill('#kk-b', 'V')
    pg.wait_for_function("KK.a==='A' && KK.b==='V'", timeout=5000)
    pg.fill('#kk-v', '-60'); pg.dispatch_event('#kk-v', 'change')
    pg.wait_for_function("(S.styles[S.style].ku||{})['AV']===-60", timeout=10000)
    pg.evaluate("setTab('edit')")
    pg.wait_for_function("S.tab==='edit'", timeout=10000)


def import_glyphs(s):
    pg = s.pg
    fs = make_fixtures()
    pg.evaluate("setTab('home')")  # W93: a UI click on the rail would ask «Сохранить процесс?» (edits are present); the project round-trip keeps them, so leave programmatically
    pg.click('#imp-card')
    pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
    pg.set_input_files('#imp-files', fs)
    pg.wait_for_function(f"Object.keys(IMP.glyphs).length>={len(CHARS)} && !IU.pending.length", timeout=60000)
    pg.click('#imp-build')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)


def project_check(p):
    s = Session(p, 'project')
    try:
        pg = s.pg
        add_deco_and_kern(s)
        import_glyphs(s)
        pg.click('#settings')
        pg.wait_for_selector('#projpop', state='visible', timeout=10000)
        with pg.expect_download(timeout=60000) as d:
            pg.click('#pj-s')
        dl = d.value
        path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs', 'project_roundtrip.json')
        dl.save_as(path)
        assert dl.suggested_filename.endswith('.json'), dl.suggested_filename
        s.close()

        # fresh page with storage cleared: only the file can bring the work back
        s = Session(p, 'project2')
        pg = s.pg
        pg.evaluate("try{localStorage.clear()}catch(e){}")
        pg.reload()
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        pg.wait_for_timeout(300)
        assert s.js("Object.keys(S.edits).filter(k=>S.edits[k].deco).length") == 0, 'storage not cleared'
        pg.click('#settings')
        pg.wait_for_selector('#projpop', state='visible', timeout=10000)
        pg.set_input_files('#pj-l', path)
        pg.wait_for_function("S.fontId==='imp' && S.tab!==undefined && !S.live", timeout=30000)
        got = s.js("""(()=>{const v=S.lib.volt||{};return {
            deco: !!(v.edits&&v.edits.n&&v.edits.n.deco&&v.edits.n.deco.length),
            kern: (v.styles&&v.styles.regular&&v.styles.regular.ku||{}).AV,
            imp: Object.keys(IMP.glyphs).length}})()""")
        assert got['deco'], f'deco on n not restored: {got}'
        assert got['kern'] == -60, f'kerning not restored: {got}'
        assert got['imp'] == len(CHARS), f'imported glyphs not restored: {got}'
        # exported Volt keeps the kerning exception
        # W93: the restored project is unsaved work, so go through the library programmatically (a rail click would ask «Сохранить процесс?» and «Не сохранять» would drop the restored kerning)
        pg.evaluate("setTab('library')")
        pg.click('#libgrid .lcard[data-font=volt]')
        pg.wait_for_function("S.fontId==='volt' && !S.live", timeout=30000)
        # a fresh entry starts clean; the restored Volt went to Профиль → Черновики as an auto draft and «Продолжить» brings it back
        did = pg.evaluate("(GT_DRAFTS.list().find(d=>d.mode==='edit'&&d.fid==='volt')||{}).id")
        assert did, 'restored project was not kept as a draft'
        pg.evaluate("GT_DRAFTS.continueDraft(%r)" % did)
        pg.wait_for_function("S.tab==='edit' && S.fontId==='volt'", timeout=15000)
        _, data, _ = s.download('ttf')
        av = kern(TTFont(io.BytesIO(data)), 'A', 'V')
        assert av == -60, f'exported AV={av} after restore'
        assert not s.errs, f'page errors {s.errs[:3]}'
        s.close()
        return f"deco=n kern=AV{got['kern']} imp={got['imp']} gpos_AV={av}"
    finally:
        try:
            s.close()
        except Exception:
            pass


if __name__ == '__main__':
    sys.exit(check_all([('project', project_check)]))
