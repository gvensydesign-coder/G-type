"""proof-fix (Stage 5B): one-click fixes in the «Проверка» tab.
Fixture: a drawn font (6 glyphs built through the real draw -> «Создать шрифт» path) whose raw contours are then damaged on purpose:
  А/A  sidebearings out of the margin rule (S.edits sbL/sbR)   -> mar   (fixable)
  Т    outer contour reversed                                  -> dir   (fixable)
  Г    two nodes 0.3 u apart                                   -> dup   (fixable)
  О    curve nodes at 45 degrees, no extremes                  -> ext   (fixable)
  V    two overlapping outer contours                          -> ovl   (fixable)
  Н    stems 30 % thicker than the system (lint «ствол отличается») -> no automatic fix: no button
Checks: buttons only for fixable findings (+ the group bar), fix + undo/redo round trip (one labelled history entry), fix-all in one entry,
fixed font exports and parses (fontTools), a failing fix leaves the glyph untouched and marks the finding, speck removal, amber / red colours,
layout at 1440 and 400 (nothing past the card edge), both themes."""
import io, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, LOGS, SHOTS, shot
import e2e_draw as E
from fontTools.ttLib import TTFont
from fontTools.pens.areaPen import AreaPen

SEED = """() => {
 const D=GT_DRAW._t.D;
 const mk=(ch,cs)=>{ D.g[ch]={items:[{k:'add',t:'rect',cs:cs}],s:true,cs:drnEval([{k:'add',cs:cs}]),cols:8,sp:null}; };
 mk('Н',[drnRect(60,0,160,700),drnRect(380,0,480,700),drnRect(60,300,480,400)]);
 mk('О',[drnEllipse(260,350,260,350)]);
 mk('Т',[drnRect(0,600,520,700),drnRect(210,0,310,700)]);
 mk('Г',[drnRect(60,0,160,700),drnRect(60,600,420,700)]);
 mk('A',[drnPoly([[0,0],[110,0],[260,520],[410,0],[520,0],[310,700],[210,700]])]);
 mk('V',[drnPoly([[0,700],[110,700],[260,180],[410,700],[520,700],[310,0],[210,0]])]);
}"""
BREAK = """() => {
 const rec=k=>IMP.glyphs[k];
 const rect=(x0,y0,x1,y1)=>({hole:false,nodes:[{x:x0,y:y0,a:null,b:null},{x:x1,y:y0,a:null,b:null},{x:x1,y:y1,a:null,b:null},{x:x0,y:y1,a:null,b:null}]});
 const T=rec('Т'); T.c=T.c.map((c,i)=>i===0?{hole:c.hole,nodes:reverseNodes(c.nodes)}:c);
 const G=rec('Г'); G.c=G.c.map((c,i)=>i===0?{hole:c.hole,nodes:[c.nodes[0],{x:c.nodes[0].x+0.3,y:c.nodes[0].y,a:null,b:null},...c.nodes.slice(1)]}:c);
 const V=rec('V'); V.c=[rect(0,0,520,300),rect(0,200,520,700)];
 const O=rec('О'); {const cx=260,cy=350,r=260,K=0.5522847498307936*r,N=[];
   for(let i=0;i<4;i++){const t=Math.PI/4+i*Math.PI/2,x=cx+r*Math.cos(t)*0.9999,y=cy+r*Math.sin(t)*0.9999,tx=-Math.sin(t),ty=Math.cos(t);
     N.push({x,y,a:{x:x-tx*K,y:y-ty*K},b:{x:x+tx*K,y:y+ty*K}});}
   O.c=[{hole:false,nodes:N}];}
 const H=rec('Н'); H.c=[{hole:false,nodes:[[60,0],[190,0],[190,300],[350,300],[350,0],[480,0],[480,700],[350,700],[350,400],[190,400],[190,700],[60,700]].map(q=>({x:q[0],y:q[1],a:null,b:null}))}];
 for(const k of ['Т','Г','V','О','Н']){const r=rec(k); r.bb=impBBox(r.c); r.v=++IMP.ver; delete r.id;}
 S.edits['A']={sbL:-60,sbR:-60};
 IMP.ver++; iuRegisterNow();
 return Object.keys(IMP.glyphs).join('');
}"""
IMPSIG = "(()=>JSON.stringify([Object.keys(IMP.glyphs).sort().map(k=>[k,IMP.glyphs[k].c]),S.edits]))()"
ISSUES = "(()=>{const o={};computeProof().forEach((r,c)=>{if(r.issues.length)o[c]=r.issues.map(i=>i.lvl+':'+i.t);});return o;})()"
FIXABLE = {'A', 'А', 'Т', 'Г', 'О', 'V'}   # findings with an automatic fix (А twins A: shared sidebearings, ONE button on the first card)
BUTTONS = {'A', 'Т', 'Г', 'О', 'V'}


def setup(p, name, size=None, broken=True):
    s, d = E.setup(p, name)
    if size:
        s.pg.set_viewport_size(size)
    pg = s.pg
    pg.evaluate(SEED)
    assert pg.evaluate("GT_DRAW._t.buildFont('Проба')") is True
    pg.wait_for_function("S.fontId==='imp'&&!S.live", timeout=60000)
    if broken:
        pg.evaluate(BREAK)
    pg.evaluate("setTab('proof')")
    if broken:
        pg.wait_for_selector('#pfix:not([hidden])', timeout=20000)
    pg.wait_for_timeout(700); pg.evaluate("HIST.flush('ed')")  # let the debounced history commit of the fixture land before any baseline is taken
    return s, pg


def cards(pg):
    return pg.evaluate("[...document.querySelectorAll('#pgrid .pc')].map(el=>({ch:el.querySelector('.pt b').textContent,fx:!!el.querySelector('.chip.fx'),lvl:el.className.match(/l(\\d)/)[1]}))")


def buttons(p):
    s, pg = setup(p, 'pfx_btn'); out = []
    cs = {c['ch']: c for c in cards(pg)}
    got = {ch for ch, c in cs.items() if c['fx']}
    assert got == BUTTONS, ('fix buttons only on fixable findings, twins A/А get one', got)
    assert pg.evaluate("!![...document.querySelectorAll('#pgrid .pc')].find(el=>el.querySelector('.pt b').textContent==='А').querySelector('.pfx-na')"), 'the twin card says it is fixed together with its twin'
    assert 'Н' in cs and not cs['Н']['fx'], 'stem finding has no automatic fix'
    iss = pg.evaluate(ISSUES)
    assert any('ствол' in t for t in iss.get('Н', [])), iss.get('Н', iss)
    # amber, not red: all of these are warnings
    assert all(c['lvl'] == '1' for ch, c in cs.items() if ch in FIXABLE), cs
    assert cs['Н']['lvl'] == '1', 'the unfixable finding is a warning'
    tok = lambda v, prop='color': pg.evaluate("(([v,prop])=>{const e=document.createElement('i');e.style.color='var('+v+')';document.body.appendChild(e);const c=getComputedStyle(e).color;e.remove();return c;})", [v, prop])
    bc = lambda cls: pg.evaluate("(cls)=>{const e=document.createElement('div');e.className=cls;document.querySelector('#pgrid').appendChild(e);const c=getComputedStyle(e).borderTopColor;e.remove();return c;}", cls)
    assert bc('pc l1') == tok('--warn'), 'warnings amber'
    assert bc('pc l2') == tok('--bad'), 'errors red'
    bar = pg.inner_text('#pfix')
    assert 'Исправить всё (5)' in bar and 'знаков' in bar, bar
    kinds = pg.evaluate("[...document.querySelectorAll('#pfix [data-pfk]')].map(b=>b.dataset.pfk)")
    assert set(kinds) == {'mar', 'dir', 'dup', 'ext', 'ovl', 'all'}, kinds
    # the fix button carries the accent, warnings keep the amber border
    col = pg.evaluate("getComputedStyle(document.querySelector('#pgrid .chip.fx')).backgroundColor")
    assert col in ('rgb(252, 71, 60)', 'rgb(237, 63, 53)'), col
    assert not s.errs, s.errs[:3]
    s.close()
    return f'fixable={sorted(got)} kinds={kinds}'


def roundtrip(p):
    s, pg = setup(p, 'pfx_rt')
    base = pg.evaluate(IMPSIG); n0 = pg.evaluate("HIST.info().n")
    t_before = pg.evaluate("JSON.stringify(IMP.glyphs['Т'].c)")
    # a single glyph: the «Т» card button
    pg.evaluate("[...document.querySelectorAll('#pgrid .pc')].find(el=>el.querySelector('.pt b').textContent==='Т').querySelector('.chip.fx').click()")
    pg.wait_for_function("!(" + ISSUES + ")['Т']", timeout=20000)
    info = pg.evaluate("HIST.info()")
    assert info['n'] == n0 + 1 and info['labels'][-1] == 'Исправление: направление «Т»', info
    assert pg.evaluate("IMP.glyphs['Т'].c.every(c=>!pfDirBad(c))"), 'direction fixed'
    assert pg.evaluate("JSON.stringify(IMP.glyphs['Т'].c)") != t_before
    others = pg.evaluate("Object.keys(IMP.glyphs).filter(k=>k!=='Т').map(k=>JSON.stringify(IMP.glyphs[k].c)).join('|').length")
    # undo: the exact data comes back, the finding is back
    pg.evaluate("HIST.undo()"); pg.wait_for_function("(" + ISSUES + ")['Т']", timeout=20000)
    assert pg.evaluate(IMPSIG) == base, 'undo restores the contours and edits byte for byte'
    pg.evaluate("HIST.redo()"); pg.wait_for_function("!(" + ISSUES + ")['Т']", timeout=20000)
    assert pg.evaluate("IMP.glyphs['Т'].c.every(c=>!pfDirBad(c))")
    pg.evaluate("HIST.undo()"); pg.wait_for_function("(" + ISSUES + ")['Т']", timeout=20000)
    # margins (editor edits, not contours): button on «A», undo restores S.edits
    e0 = pg.evaluate("JSON.stringify(S.edits)")
    pg.evaluate("[...document.querySelectorAll('#pgrid .pc')].find(el=>el.querySelector('.pt b').textContent==='A').querySelector('.chip.fx').click()")
    pg.wait_for_function("!(" + ISSUES + ")['A']", timeout=20000)
    q = pg.evaluate("(()=>{const r=computeProof().get('A');return [r.lsb,r.rsb,S.edits.A];})()")
    assert q[0] >= 4 and q[1] >= 4, q
    assert pg.evaluate("HIST.info().labels.at(-1)") == 'Исправление: поля «A»'
    pg.evaluate("HIST.undo()"); pg.wait_for_function("(" + ISSUES + ")['A']", timeout=20000)
    assert pg.evaluate("JSON.stringify(S.edits)") == e0
    assert not s.errs, s.errs[:3]
    s.close()
    return f'undo/redo exact, labels ok, others={others}'


def fix_all(p):
    s, pg = setup(p, 'pfx_all')
    base = pg.evaluate(IMPSIG); n0 = pg.evaluate("HIST.info().n")
    pg.click('#pfix [data-pfk=all]')
    pg.wait_for_function("document.querySelector('#pfix').hidden", timeout=30000)
    iss = pg.evaluate(ISSUES)
    left = {c: v for c, v in iss.items() if c not in ('Н', 'H')}
    left = {c: [t for t in v if not t.startswith('1:части слились')] for c, v in left.items()}
    left = {c: v for c, v in left.items() if v}
    assert not left, ('everything fixable is fixed, re-check ran', left)
    assert any('ствол' in t for t in iss.get('Н', [])), 'the unfixable finding stays reported'
    info = pg.evaluate("HIST.info()")
    assert info['n'] == n0 + 1 and info['labels'][-1] == 'Исправлено знаков: 5', info
    assert 'Исправлено: 5' in pg.inner_text('#toast')
    # the fixed font: raw data valid, then the real export parses
    ok = pg.evaluate("""(()=>{let n=0;for(const k of Object.keys(IMP.glyphs)){for(const c of IMP.glyphs[k].c){if(c.nodes.length<3)return 'short '+k;
        for(const q of c.nodes){if(!Number.isFinite(q.x)||!Number.isFinite(q.y))return 'nan '+k;}n++;}}return n;})()""")
    assert isinstance(ok, int) and ok >= 6, ok
    name, data, path = s.download('ttf')
    f = TTFont(io.BytesIO(data)); cm = f.getBestCmap(); gs = f.getGlyphSet(); glyf = f['glyf']
    for ch in 'ТГОV':
        assert ord(ch) in cm, f'{ch} missing'
        g = glyf[cm[ord(ch)]]
        assert g.numberOfContours > 0 and g.xMax > g.xMin, ch
        xs = list(g.coordinates)
        assert all(-5000 < x < 5000 and -5000 < y < 5000 for x, y in xs), ch
    # O: on-curve points at the four extremes
    g = glyf[cm[ord('О')]]; co = g.coordinates; fl = g.flags
    on = [co[i] for i in range(len(co)) if fl[i] & 1]
    assert any(abs(y - g.yMax) <= 1 for x, y in on) and any(abs(x - g.xMax) <= 1 for x, y in on), ('extremes are nodes', g.xMax, g.yMax, on[:6])
    # contours of Т all clockwise (TrueType outer)
    pen = AreaPen(gs); gs[cm[ord('Т')]].draw(pen); assert pen.value < 0, pen.value
    # one undo: the damaged font again (exact)
    pg.evaluate("HIST.undo()"); pg.wait_for_selector('#pfix:not([hidden])', timeout=30000)
    assert pg.evaluate(IMPSIG) == base
    assert not s.errs, s.errs[:3]
    s.close()
    return f'fixed 5, one entry, export {len(f.getGlyphOrder())} glyphs, undo exact'


def blocked(p):
    s, pg = setup(p, 'pfx_blk')
    base = pg.evaluate(IMPSIG); n0 = pg.evaluate("HIST.info().n")
    # a fix whose check fails (as if it produced an invalid glyph): the glyph stays as it was, the finding is marked, no history entry
    pg.evaluate("""(()=>{window.__pp=window.pfPlan;window.pfPlan=function(ch,id,r,res){const pl=window.__pp(ch,id,r,res);if(pl&&ch==='Г')pl.verify=()=>false;return pl;};})()""")
    pg.evaluate("[...document.querySelectorAll('#pgrid .pc')].find(el=>el.querySelector('.pt b').textContent==='Г').querySelector('.chip.fx').click()")
    pg.wait_for_function("document.querySelector('#toast').textContent.includes('не удалось')", timeout=20000)
    assert pg.evaluate(IMPSIG) == base, 'failed fix leaves data untouched'
    assert pg.evaluate("HIST.info().n") == n0, ('no history entry for a failed fix', pg.evaluate("HIST.info().labels"))
    c = {x['ch']: x for x in cards(pg)}
    assert not c['Г']['fx'], 'no button on a finding that could not be fixed'
    assert pg.evaluate("[...document.querySelectorAll('#pgrid .pc')].find(el=>el.querySelector('.pt b').textContent==='Г').querySelector('.pfx-na')!==null"), 'marked as not auto-fixable'
    # a plan that throws while applying: same
    pg.evaluate("""(()=>{window.pfPlan=function(ch,id,r,res){const pl=window.__pp(ch,id,r,res);if(pl&&ch==='О')pl.apply=()=>{throw new Error('boom');};return pl;};})()""")
    pg.evaluate("PFIX_API.fixGlyph('О')")
    pg.wait_for_timeout(600)
    assert pg.evaluate(IMPSIG) == base and pg.evaluate("HIST.info().n") == n0, 'throwing fix leaves data untouched'
    # fix-all with some failing: the others are fixed in one entry, the failed stay
    pg.evaluate("PFIX.fail.clear()")
    pg.evaluate("window.pfPlan=window.__pp")
    pg.evaluate("""(()=>{window.pfPlan=function(ch,id,r,res){const pl=window.__pp(ch,id,r,res);if(pl&&ch==='V')pl.verify=()=>false;return pl;};})()""")
    pg.click('#pfix [data-pfk=all]')
    pg.wait_for_function("document.querySelector('#toast').textContent.includes('Не удалось')", timeout=30000)
    iss = pg.evaluate(ISSUES)
    assert 'V' in iss and not any(c in iss for c in ('Т', 'Г', 'О', 'A')), iss
    assert pg.evaluate("HIST.info().n") == n0 + 1
    pg.evaluate("window.pfPlan=window.__pp")
    # nothing fixable (no imp record, plain library font): the proof page works, no bar, no errors
    pg.evaluate("switchFont('volt')"); pg.wait_for_function("S.fontId==='volt'&&!S.live", timeout=30000)
    pg.evaluate("setTab('proof')"); pg.wait_for_timeout(800)
    assert pg.evaluate("document.querySelector('#pfix')===null||document.querySelector('#pfix').hidden")
    assert pg.evaluate("document.querySelectorAll('#pgrid .chip.fx').length") == 0, 'a clean font has no fix buttons'
    assert not s.errs, s.errs[:3]
    s.close()
    return 'failed / throwing / partial fixes safe'


def specks(p):
    s, pg = setup(p, 'pfx_spk', broken=False)
    assert pg.evaluate("document.querySelector('#pfix')===null||document.querySelector('#pfix').hidden"), 'a clean drawn font: nothing to fix'
    pg.evaluate("""(()=>{const H=IMP.glyphs['Н'];H.c=H.c.concat([{hole:false,nodes:[{x:250,y:480,a:null,b:null},{x:264,y:480,a:null,b:null},{x:264,y:494,a:null,b:null},{x:250,y:494,a:null,b:null}]}]);
      H.bb=impBBox(H.c);H.v=++IMP.ver;delete H.id;IMP.ver++;iuRegisterNow();})()""")
    pg.wait_for_function("(" + ISSUES + ")['Н']&&(" + ISSUES + ")['Н'].some(t=>t.includes('мелкое пятно'))", timeout=20000)
    pg.evaluate("setTab('edit');setTab('proof')"); pg.wait_for_selector('#pfix:not([hidden])')
    assert pg.evaluate("PFIX_API.fixesFor('Н',computeProof().get('Н'),computeProof()).out.includes('spk')"), 'speck is fixable'
    before = pg.evaluate("IMP.glyphs['Н'].c.length"); pg.wait_for_timeout(600); n0 = pg.evaluate("(HIST.flush('ed'),HIST.info().n)")
    pg.evaluate("PFIX_API.fixGlyph('Н',['spk'])"); pg.wait_for_function("!((" + ISSUES + ")['Н']||[]).some(t=>t.includes('мелкое пятно'))", timeout=20000)
    after = pg.evaluate("IMP.glyphs['Н'].c.length"); assert after == before - 1, (before, after)
    info = pg.evaluate("HIST.info()"); assert info['labels'][-1] == 'Исправление: пятна «Н»' and info['n'] == n0 + 1, info
    assert not pg.evaluate(ISSUES).get('Н'), 'clean after the fix'
    pg.evaluate("HIST.undo()"); pg.wait_for_function("IMP.glyphs['Н'].c.length==" + str(before), timeout=20000)
    assert not s.errs, s.errs[:3]
    s.close()
    return f'speck removed {before}->{after}, label ok, undo ok'


def layout(p):
    out = []
    for w, h in ((1440, 900), (400, 800)):
        for theme in ('light', 'dark'):
            s, pg = setup(p, f'pfx_l{w}{theme}', {'width': w, 'height': h})
            pg.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
            pg.wait_for_timeout(300)
            r = pg.evaluate("""(()=>{const bar=document.querySelector('#pfix'),b=bar.getBoundingClientRect(),vw=document.documentElement.clientWidth;
              const bad=[];const pr=document.querySelector('#view-proof').getBoundingClientRect();
              for(const el of bar.querySelectorAll('*')){const q=el.getBoundingClientRect();if(q.right>b.right+0.5||q.left<b.left-0.5)bad.push('bar:'+el.textContent);}
              for(const el of document.querySelectorAll('#pgrid .pc')){const c=el.getBoundingClientRect();for(const x of el.querySelectorAll('.pi *')){const q=x.getBoundingClientRect();if(q.width&&(q.right>c.right+0.5||q.left<c.left-0.5))bad.push('card:'+x.textContent.slice(0,20));}}
              return {bad,barW:b.width,vw,hs:document.documentElement.scrollWidth>vw+1,hv:document.querySelector('#view-proof').scrollWidth>pr.width+1};})()""")
            assert not r['bad'], (w, theme, r['bad'][:4])
            assert not r['hv'], (w, theme, 'horizontal scroll inside the proof page')
            out.append(f'{w}{theme[0]}')
            if SHOTS or os.environ.get('PFX_SHOTS'):
                d = os.environ.get('PFX_SHOTS') or LOGS
                os.makedirs(d, exist_ok=True)
                pg.evaluate("window.scrollTo(0,0);document.querySelector('#view-proof').scrollTop=0")
                pg.screenshot(path=os.path.join(d, f'proof_fix_{w}_{theme}.png'))
            assert not s.errs, s.errs[:3]
            s.close()
    return ' '.join(out)


if __name__ == '__main__':
    sys.exit(check_all([('proof_fix', buttons), ('proof_fix-roundtrip', roundtrip), ('proof_fix-all', fix_all),
                        ('proof_fix-blocked', blocked), ('proof_fix-specks', specks), ('proof_fix-layout', layout)]))
