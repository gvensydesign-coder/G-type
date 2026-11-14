"""autokern (Stage 5B): auto-spacing and auto-kerning for drawn fonts (draw mode, pane «Интервалы и кернинг»).
Fixture: a drawn alphabet seeded straight into the draw state (Cyrillic Н О Т Г А, Latin A V T Y, full stop) + the real UI buttons / toggles / slider.
Checks: auto-spacing is deterministic, class-consistent (reference «н»/«о»: round side 74-90 % of the straight one, symmetric glyphs symmetric, diagonal/open sides tighter),
clamped, skips empty / degenerate glyphs; toggle reverts exactly; history entries are labelled and undo/redo move the state; auto-kerning is deterministic, scales with the
strength control (0 = none), preview canvas shows the kerned line tighter; the built font carries the class values in styles.kc (existing kerning view reads them: src cls/guard)
and the exported TTF has GPOS kern with exactly those values (fontTools); off = the previous values are removed; blocked cases (no glyphs, one glyph) do not throw; layout at 1440 / 400."""
import io, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, LOGS, SHOTS
import e2e_draw as E
from fontTools.ttLib import TTFont

SEED = """() => {
 const D=GT_DRAW._t.D;
 const mk=(ch,cs)=>{ D.g[ch]={items:[{k:'add',t:'rect',cs:cs}],s:true,cs:drnEval([{k:'add',cs:cs}]),cols:8,sp:null}; };
 const A=[drnPoly([[0,0],[110,0],[260,520],[410,0],[520,0],[310,700],[210,700]])];
 const V=[drnPoly([[0,700],[110,700],[260,180],[410,700],[520,700],[310,0],[210,0]])];
 const Y=[drnPoly([[0,700],[120,700],[260,380],[400,700],[520,700],[320,320],[320,0],[200,0],[200,320]])];
 const T=[drnRect(0,600,520,700),drnRect(210,0,310,700)];
 mk('Н',[drnRect(60,0,160,700),drnRect(380,0,480,700),drnRect(60,300,480,400)]);
 mk('О',[drnEllipse(260,350,260,350)]);
 mk('Т',T); mk('T',T);
 mk('Г',[drnRect(60,0,160,700),drnRect(60,600,420,700)]);
 mk('А',A); mk('A',A); mk('V',V); mk('Y',Y);
 mk('.',[drnRect(0,0,110,110)]);
}"""
SP = "(()=>{const T=GT_DRAW._t,o={};for(const ch of Object.keys(T.D.g)){if(!T.D.g[ch].s||!T.D.g[ch].cs.length)continue;const s=T.spOf(ch);o[ch]=[s.l,s.r];}return o;})()"
SYM_KEYS = "ТАТА"


def setup(p, name, size=None, seed=True):
    s, d = E.setup(p, name)
    if size:
        s.pg.set_viewport_size(size)
    if seed:
        s.pg.evaluate(SEED)
        s.pg.evaluate("GT_DRAW._t.analyze();GT_DRAW._t.D.built=false")
    s.pg.evaluate("dwOpen('draw','spk')")
    s.pg.wait_for_selector('#dr-aksp', state='visible', timeout=10000)
    return s, s.pg


def labels(pg):
    return pg.evaluate("HIST.info('dr').labels")


def spacing(p):
    s, pg = setup(p, 'ak_sp')
    # empty and degenerate glyphs are skipped (no throw)
    pg.evaluate("""(()=>{const D=GT_DRAW._t.D;D.g['Ы']={items:[],s:true,cs:[],cols:6,sp:null};
      D.g['Ь']={items:[],s:true,cols:6,sp:null,cs:[{hole:false,nodes:[{x:0,y:0,a:null,b:null},{x:100,y:0,a:null,b:null},{x:200,y:0,a:null,b:null}]}]};})()""")
    before = pg.evaluate(SP); assert 'Ы' not in before
    pg.click('#dr-aksp'); pg.wait_for_function("GT_DRAW._t.AK().sp===1", timeout=10000)
    after = pg.evaluate(SP)
    assert after != before, 'auto-spacing changes the metrics'
    o = pg.evaluate("GT_DRAW._t.optSp()")
    assert 'Ы' not in o['sp'] and 'Ь' not in o['sp'], 'empty / degenerate glyphs are skipped'
    sp = o['sp']; ref = o['ref']
    # deterministic: off -> on -> same numbers; a second computation from scratch too
    pg.evaluate("GT_DRAW._t.akSetSp(false)"); mid = pg.evaluate(SP)
    pg.evaluate("GT_DRAW._t.akSetSp(true)"); again = pg.evaluate(SP)
    assert again == after, 'deterministic'
    # the toggle reverts exactly
    assert mid == before, 'off restores the previous metrics'
    # class consistency
    h, o_ = sp['Н'], sp['О']
    assert h['l'] == h['r'] and o_['l'] == o_['r'], 'symmetric glyphs are symmetric'
    ratio = o_['l'] / h['l']
    assert 0.73 <= ratio <= 0.91, ('round side against the straight one (reference н/о)', ratio, ref)
    assert sp['Т']['l'] < h['l'] and sp['А']['l'] < h['l'] and sp['V']['l'] < h['l'], 'open / diagonal sides are tighter than the straight one'
    assert sp['А']['l'] == sp['A']['l'] and sp['Т']['l'] == sp['T']['l'], 'twins get the same spacing'
    lo, hi = max(10, round(0.2 * ref['sbS'])), round(1.25 * ref['sbS'])
    for ch, v in sp.items():
        assert isinstance(v['l'], int) and isinstance(v['r'], int) and lo <= v['l'] <= hi and lo <= v['r'] <= hi, ('clamped', ch, v, lo, hi)
    # history: labelled entries, undo / redo move the state
    labs = labels(pg)
    assert 'Авто-интервалы' in labs and 'Интервалы: исходные' in labs, labs
    pg.evaluate("HIST.undo()"); pg.wait_for_function("GT_DRAW._t.AK().sp===0", timeout=10000)
    assert pg.evaluate(SP) == before
    pg.evaluate("HIST.redo()"); pg.wait_for_function("GT_DRAW._t.AK().sp===1", timeout=10000)
    assert pg.evaluate(SP) == after
    # UI: the toggle shows the state and works
    assert pg.is_checked('#dr-aksw')
    pg.click('#dr-aksw + i'); pg.wait_for_function("GT_DRAW._t.AK().sp===0", timeout=10000)
    assert pg.evaluate(SP) == before and not pg.is_checked('#dr-aksw')
    assert not s.errs, s.errs[:3]
    s.close()
    return f'ref={ref} н={h["l"]}/{h["r"]} о={o_["l"]}/{o_["r"]} ratio={ratio:.2f}'


def kerning(p):
    s, pg = setup(p, 'ak_k')
    pg.click('#dr-aksp'); pg.wait_for_function("GT_DRAW._t.AK().sp===1")
    pg.click('#dr-akk'); pg.wait_for_function("GT_DRAW._t.AK().k===1", timeout=10000)
    kn = pg.evaluate("(k=>({vals:k.vals,n:k.n}))(GT_DRAW._t.akKern(false))")
    assert kn['n'] >= 6 and kn['vals'].get('T|A', 0) <= -6 and kn['vals'].get('A|V', 0) <= -6, kn
    assert all(-150 <= v <= 60 and v % 2 == 0 for v in kn['vals'].values()), ('clamped, even', kn)
    # deterministic: recomputed from scratch
    again = pg.evaluate("(()=>{const T=GT_DRAW._t,G={};for(const ch of T.allList()){if(!T.R(ch)||!T.R(ch).cs.length)continue;const sp=T.spOf(ch);G[ch]={cs:T.R(ch).cs,l:sp.l,r:sp.r};}return drnKernAuto(G,100,100).vals;})()")
    assert again == kn['vals'], 'deterministic'
    # strength: 0 = none, monotone
    vals = {}
    for sv in (0, 40, 100, 150):
        pg.fill('#dr-aks', str(sv)); pg.wait_for_function(f"GT_DRAW._t.AK().s=={sv}", timeout=10000)
        vals[sv] = pg.evaluate("GT_DRAW._t.akKern(false).vals")
    assert vals[0] == {}, 'strength 0 gives no kerning'
    assert abs(vals[40]['T|A']) < abs(vals[100]['T|A']) < abs(vals[150]['T|A']), {k: v.get('T|A') for k, v in vals.items()}
    assert pg.inner_text('#dr-akso') == '150 %'
    # history labels
    labs = labels(pg)
    assert 'Авто-кернинг' in labs and 'Сила кернинга 150 %' in labs, labs
    pg.evaluate("HIST.undo()"); pg.wait_for_function("GT_DRAW._t.AK().s===100", timeout=10000)
    pg.evaluate("HIST.undo()"); pg.wait_for_function("GT_DRAW._t.AK().s===40", timeout=10000)
    pg.fill('#dr-aks', '100'); pg.wait_for_function("GT_DRAW._t.AK().s===100")
    # the preview: two lines, the kerned one is narrower
    pg.fill('#dr-akt', 'ТАТА АТ VAV'); pg.wait_for_timeout(300)
    ext = pg.evaluate("""(()=>{const c=document.querySelector('#dr-akpv'),x=c.getContext('2d'),W=c.width,H=c.height,d=x.getImageData(0,0,W,H).data;
      const bg=[d[0],d[1],d[2]];const ink=(i)=>Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2])>120;
      const r=[[0,0],[0,0]];for(let half=0;half<2;half++){let mx=0,n=0;for(let y=Math.floor(H*half/2)+Math.floor(H*0.16);y<Math.floor(H*(half+1)/2);y++)for(let xx=0;xx<W;xx++){if(ink((y*W+xx)*4)){n++;if(xx>mx)mx=xx;}}r[half]=[mx,n];}return r;})()""")
    assert ext[0][1] > 200 and ext[1][1] > 200, ('both preview lines have ink', ext)
    assert ext[1][0] < ext[0][0], ('kerned line is tighter', ext)
    # test window uses the kerning too
    assert pg.evaluate("GT_DRAW._t.akPair('Т','А')") < 0
    assert not s.errs, s.errs[:3]
    s.close()
    return f'n={kn["n"]} T|A@40/100/150={vals[40]["T|A"]}/{vals[100]["T|A"]}/{vals[150]["T|A"]} preview={ext}'


def pair_value(font, a, b):
    """GPOS kern adjustment for the pair, first matching subtable (as a shaper does)"""
    cm = font.getBestCmap(); ga, gb = cm[ord(a)], cm[ord(b)]; gpos = font['GPOS'].table
    for lk in gpos.LookupList.Lookup:
        for st in lk.SubTable:
            if st.LookupType == 9:
                st = st.ExtSubTable
            if st.LookupType != 2:
                continue
            if ga not in st.Coverage.glyphs:
                continue
            if st.Format == 1:
                ps = st.PairSet[st.Coverage.glyphs.index(ga)]
                for r in ps.PairValueRecord:
                    if r.SecondGlyph == gb:
                        return r.Value1.XAdvance if r.Value1 else 0
            else:
                c1 = st.ClassDef1.classDefs.get(ga, 0); c2 = st.ClassDef2.classDefs.get(gb, 0)
                v = st.Class1Record[c1].Class2Record[c2].Value1
                return v.XAdvance if v and getattr(v, 'XAdvance', None) else 0
    return 0


def export(p):
    res = {}
    for name, strength, on in (('k100', 100, True), ('k150', 150, True), ('off', 100, False)):
        s, pg = setup(p, 'ak_' + name)
        pg.click('#dr-aksp'); pg.wait_for_function("GT_DRAW._t.AK().sp===1")
        if on:
            pg.click('#dr-akk'); pg.wait_for_function("GT_DRAW._t.AK().k===1")
            pg.fill('#dr-aks', str(strength)); pg.wait_for_function(f"GT_DRAW._t.AK().s=={strength}")
        want = pg.evaluate("GT_DRAW._t.akKern(false)&&GT_DRAW._t.akKern(false).vals")
        assert pg.evaluate("GT_DRAW._t.buildFont('Кёрн')") is True
        pg.wait_for_function("S.fontId==='imp'&&!S.live", timeout=60000)
        kc = pg.evaluate("S.styles.regular.kc||null")
        if on:
            assert kc == want, ('built font carries the computed class values', kc, want)
            info = pg.evaluate("(()=>{const i=kkInfo('Т','А');return [i.src,i.v];})()")
            assert info[0] in ('cls', 'guard') and info[1] < 0, ('the kerning view reads them', info)
        else:
            assert not kc or not any(k in kc for k in (pg.evaluate("GT_DRAW._t.AK().kw") or [])), kc
            assert pg.evaluate("GT_DRAW._t.AK().k") == 0
        name_, data, path = s.download('ttf')
        f = TTFont(io.BytesIO(data))
        assert 'GPOS' in f and any(fr.FeatureTag == 'kern' for fr in f['GPOS'].table.FeatureList.FeatureRecord), 'GPOS kern in the export'
        pv = {pair: pair_value(f, *pair) for pair in (('Т', 'А'), ('А', 'Т'), ('A', 'V'), ('Т', 'О'), ('Н', 'Н'))}
        res[name] = (pv, kc, info[1] if on else None)
        assert all(-150 <= v <= 60 for v in pv.values()), pv
        assert not s.errs, s.errs[:3]
        s.close()
    pv100, kc100, iv = res['k100']; pv150 = res['k150'][0]; pvoff = res['off'][0]
    assert pv100[('Т', 'А')] < 0 and pv100[('Т', 'А')] == iv, ('exported value equals the kerning view value', pv100, iv)
    assert pv100[('Н', 'Н')] == 0, 'straight-straight pair is not kerned'
    assert pv150[('Т', 'А')] < pv100[('Т', 'А')] < 0, ('strength 150 kerns tighter than 100', pv100, pv150)
    assert pvoff != pv100, ('off is the default table, not the auto values', pvoff, pv100)
    return f'T-A off/100/150 = {pvoff[("Т","А")]}/{pv100[("Т","А")]}/{pv150[("Т","А")]}'


def blocked(p):
    s, pg = setup(p, 'ak_blk', seed=False)
    # no glyphs at all: buttons off, calls are harmless
    assert pg.is_disabled('#dr-aksp') and pg.is_disabled('#dr-akk')
    pg.evaluate("GT_DRAW._t.akSetSp(true);GT_DRAW._t.akSetKern(true);GT_DRAW._t.akSetStr(80)")
    k = pg.evaluate("(k=>({n:k.n,vals:k.vals}))(GT_DRAW._t.akKern(true))"); assert k == {'n': 0, 'vals': {}}, k
    assert pg.evaluate("Object.keys(GT_DRAW._t.optSp().sp).length") == 0
    pg.evaluate("GT_DRAW._t.akSetSp(false);GT_DRAW._t.akSetKern(false)")
    # one glyph: spacing works, kerning has nothing to measure
    pg.evaluate("""(()=>{const D=GT_DRAW._t.D;D.g['Н']={items:[{k:'add',t:'rect',cs:[drnRect(60,0,160,700)]}],s:true,cs:drnEval([{k:'add',cs:[drnRect(60,0,160,700),drnRect(380,0,480,700),drnRect(60,300,480,400)]}]),cols:8,sp:null};GT_DRAW._t.analyze();})()""")
    pg.evaluate("GT_DRAW._t.akSetSp(true)")
    sp = pg.evaluate(SP); assert sp['Н'][0] == sp['Н'][1] and sp['Н'][0] >= 10, sp
    assert pg.is_disabled('#dr-akk'), 'kerning needs two glyphs'
    k = pg.evaluate("(k=>({n:k.n}))(GT_DRAW._t.akKern(true))"); assert k['n'] == 0, k
    # a font build with auto-kerning on and nothing to kern still works
    pg.evaluate("GT_DRAW._t.akSetKern(true)")
    assert pg.evaluate("GT_DRAW._t.buildFont('Один')") is True
    pg.wait_for_function("S.fontId==='imp'&&!S.live", timeout=60000)
    assert not pg.evaluate("S.styles.regular.kc"), 'no class values for a single glyph'
    # a corrupt saved state (bad numbers) is clamped on restore
    pg.evaluate("GT_DRAW._t.D.ak={sp:'x',k:2,s:-5,kw:[1,'ab']}")
    pg.evaluate("GT_DRAW.hist.apply({v:1,name:'x',set:'cyr',ch:'А',grid:'mod',ak:{sp:1,k:1,s:9999,kw:'bad'},g:{}})")
    ak = pg.evaluate("GT_DRAW._t.AK()"); assert ak['s'] == 150 and ak['kw'] == [] and ak['sp'] == 1, ak
    assert not s.errs, s.errs[:3]
    s.close()
    return 'empty / one glyph / corrupt state safe'


def layout(p):
    out = []
    for w, h in ((1440, 900), (400, 800)):
        for theme in ('light', 'dark'):
            s, pg = setup(p, f'ak_l{w}{theme}', {'width': w, 'height': h})
            pg.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
            pg.click('#dr-aksp'); pg.click('#dr-akk'); pg.wait_for_function("GT_DRAW._t.AK().k===1")
            pg.fill('#dr-akt', 'АТАКА ТОВАР ПОЛЯ.'); pg.wait_for_timeout(400)
            r = pg.evaluate("""(()=>{const side=document.querySelector('#dr-spkb'),b=side.getBoundingClientRect(),vw=document.documentElement.clientWidth,bad=[];
              for(const el of side.querySelectorAll('*')){const q=el.getBoundingClientRect();if(!q.width)continue;if(q.right>b.right+0.5||q.left<b.left-0.5)bad.push(el.tagName+'#'+el.id+':'+Math.round(q.left)+'-'+Math.round(q.right));}
              const pane=document.querySelector('[data-pane=dr-spk]').getBoundingClientRect();
              return {bad,left:b.left,right:b.right,pl:pane.left,pr:pane.right,vw,over:b.right>vw+0.5||b.left<-0.5,sw:side.scrollWidth,cw:side.clientWidth};})()""")
            assert not r['bad'], (w, theme, r)
            assert not r['over'], (w, theme, r)
            assert r['sw'] <= r['cw'] + 1, (w, theme, 'horizontal overflow in the pane', r)
            out.append(f'{w}{theme[0]}')
            d = os.environ.get('AK_SHOTS')
            if d:
                os.makedirs(d, exist_ok=True)
                pg.screenshot(path=os.path.join(d, f'autokern_{w}_{theme}.png'))
            assert not s.errs, s.errs[:3]
            s.close()
    return ' '.join(out)


if __name__ == '__main__':
    sys.exit(check_all([('autokern', spacing), ('autokern-kerning', kerning), ('autokern-export', export),
                        ('autokern-blocked', blocked), ('autokern-layout', layout)]))
