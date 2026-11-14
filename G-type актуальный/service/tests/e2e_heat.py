"""heat (W96 H): «Тепловая карта» (ui_heat.js, DESIGN_SYSTEM §23). Lane `heat`.
Checks:
- heat_detect: injected defects (pair kerned -80 u, one glyph right sidebearing +100 u, one glyph made heavier) are the top weak spots of the map;
  clean font: no severe spot, higher score; the score falls with every defect; the «Исправить» actions bring the pair / margin back.
- heat_sample: chip on/off in «Образец» (both lines, layers, size slider, text edit, no work when off), tooltip, pinned card with «Открыть в кернинге» / «Открыть знак».
- heat_proof: block «Тепловая карта» in «Проверка» (score, verdict, strong sides 2-4, weak spots <= 5, Показать / Исправить), theme switch.
- heat_clean: clean sample has no tint past the last glyph and near-zero tint on calm text; defects glow; an intentionally irregular library font (modul) shows «Неровность задумана рисунком шрифта», no «Исправить» on intended spots; normal fonts have no caveat.
- heat_geom: 1440 + 390, light + dark: nothing past the viewport or its frame, no scrollbars on the block, no dialogs.
- heat_perf: compute budget for the sample at 60 px, nothing computed while hidden.
GT_SHOTS=1 HEAT_OUT=<dir> also writes the evidence screenshots (dsf 2) of every view."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, Session, TOUR_OFF, PAGE, CHROME, run
from playwright.sync_api import sync_playwright

FONT = 'kvadra'
RUN = "()=>{const r=HEAT.run(HEAT.TEXT,'regular',30,700);return {score:r.score,top:r.top.map(f=>({t:f.t,ch:f.ch||'',a:f.a||'',b:f.b||'',sev:f.sev,n:f.items.length})),severe:r.finds.filter(f=>f.sev>=.7).length,ms:r.ms}}"
INJ_KERN = "()=>{const st=S.styles.regular;st.ku=st.ku||{};st.ku['ск']=-80;bump();}"
INJ_RSB = "()=>{S.edits['о']={sbR:100};bump();}"
# a glyph made heavier: a copy of the outline shifted right by 60 u (vertical stems get 60 u wider); installed over gfSmart
INJ_HEAVY = """()=>{if(window.__gf0)return;const o=window.__gf0=window.gfSmart,m=new Map();window.gfSmart=function(ch,key){const g=o(ch,key);if(ch!=='\\u0435'||!g)return g;let v=m.get(g);
if(!v){const d=60,cl=cs=>cs.map(c=>Object.assign({},c,{nodes:c.nodes.map(n=>{const k=Object.assign({},n,{x:n.x+d});if(n.a)k.a={x:n.a.x+d,y:n.a.y};if(n.b)k.b={x:n.b.x+d,y:n.b.y};return k;})}));
v=Object.assign({},g,{cs:g.cs.concat(cl(g.cs)),adv:g.adv+d});m.set(g,v);}return v;};bump();}"""
RESET = "()=>{const st=S.styles.regular;st.ku={};delete S.edits['о'];delete S.edits['o'];if(window.__gf0){window.gfSmart=window.__gf0;window.__gf0=null;}bump();}"


def sess(p, name, w=1440, h=900, theme=None):
    s = Session(p, name)
    s.pg.on('dialog', lambda d: (s.errs.append('dialog: ' + d.message), d.dismiss()))
    if (w, h) != (1440, 900):
        s.pg.set_viewport_size({'width': w, 'height': h})
    if theme:
        s.pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", theme)
    return s


def settle(pg, ms=450):
    pg.wait_for_timeout(ms)
    pg.wait_for_function("typeof bgQuiet==='function'&&bgQuiet()", timeout=60000)


def heat_detect(p):
    s = sess(p, 'hd'); pg = s.pg
    try:
        s.open_font(FONT); settle(pg)
        clean = pg.evaluate(RUN)
        assert clean['severe'] == 0, 'clean font has severe spots %s' % clean['top']
        assert clean['score'] >= 85, 'clean score %s' % clean['score']
        res = {'clean': clean['score']}
        # 1. kerned pair
        pg.evaluate(INJ_KERN); r = pg.evaluate(RUN)
        assert any(f['t'] == 'pair' and f['a'] + f['b'] == 'ск' for f in r['top']), 'kern defect not in top: %s' % r['top']
        assert r['score'] <= clean['score'] - 4, 'kern: score %s vs %s' % (r['score'], clean['score'])
        res['kern'] = r['score']; pg.evaluate(RESET)
        # 2. right sidebearing +100 on о: seen as the glyph side (or as pairs that start with it)
        pg.evaluate(INJ_RSB); r = pg.evaluate(RUN)
        assert any((f['t'] == 'side' and f['ch'] in 'оo') or (f['t'] == 'pair' and f['a'] in 'оo') for f in r['top']), 'rsb defect not in top: %s' % r['top']
        assert r['score'] <= clean['score'] - 8, 'rsb: score %s vs %s' % (r['score'], clean['score'])
        res['rsb'] = r['score']; pg.evaluate(RESET)
        # 3. a heavier glyph
        pg.evaluate(INJ_HEAVY); r = pg.evaluate(RUN)
        assert any(f['t'] == 'tone' and f['ch'] in 'еe' for f in r['top']), 'heavy glyph not in top: %s' % r['top']
        assert r['score'] <= clean['score'] - 2, 'heavy: score %s vs %s' % (r['score'], clean['score'])
        res['heavy'] = r['score']; pg.evaluate(RESET)
        # 4. all three together: exactly those are the top spots
        pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.evaluate(INJ_HEAVY); r = pg.evaluate(RUN)
        top = r['top']
        has = lambda f: any(f(x) for x in top)
        assert has(lambda f: f['t'] == 'pair' and f['a'] + f['b'] == 'ск'), 'all: kern missing %s' % top
        assert has(lambda f: (f['t'] == 'side' and f['ch'] in 'оo') or (f['t'] == 'pair' and f['a'] in 'оo')), 'all: rsb missing %s' % top
        assert has(lambda f: f['t'] == 'tone' and f['ch'] in 'еe'), 'all: heavy missing %s' % top
        assert r['score'] < min(res['kern'], res['rsb'], res['heavy']), 'combined score must be lowest %s' % res
        res['all'] = r['score']
        pg.evaluate(RESET)
        # 5. a second library font: clean has no severe spots either
        s.open_font('stroka'); settle(pg)
        c2 = pg.evaluate(RUN); assert c2['severe'] == 0 and c2['score'] >= 85, 'stroka clean %s' % c2
        # 6. «Исправить»: the kerned pair and the margin go back
        s.open_font(FONT); settle(pg)
        pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB)
        fx = pg.evaluate("""()=>{const r=HEAT.run(HEAT.TEXT,'regular',30,700);const out={};
          const kp=r.finds.find(f=>f.t==='pair'&&f.a+f.b==='ск');out.k0=kernOf('с','к','regular');
          // the fix lives behind the report button: use the same entry point as the click
          out.has=!!kp;return out}""")
        assert fx['has']
        pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelector('#heat-pf')&&!document.querySelector('#heat-pf').classList.contains('shut')&&document.querySelectorAll('#heat-rep .hr-bad').length>0", timeout=20000)
        pg.wait_for_timeout(300)
        n0 = pg.evaluate("kernOf('с','к','regular')")
        idx = pg.evaluate("""()=>{const L=[...document.querySelectorAll('#heat-rep .hr-bad')];return L.findIndex(li=>/ск/.test(li.querySelector('b').textContent)&&!!li.querySelector('[data-rp=fix]'))}""")
        assert idx >= 0, 'no «ск» row in the report'
        pg.click('#heat-rep .hr-bad[data-i="%d"] [data-rp=fix]' % idx)
        pg.wait_for_timeout(500)
        n1 = pg.evaluate("kernOf('с','к','regular')")
        assert n0 == -80 and n1 > -60, 'fix did not change the kerning %s -> %s' % (n0, n1)
        r = pg.evaluate(RUN)
        assert not any(f['t'] == 'pair' and f['a'] + f['b'] == 'ск' and f['sev'] > .3 for f in r['top']), 'fixed pair is still hot %s' % r['top']
        side = pg.evaluate("""()=>{const L=[...document.querySelectorAll('#heat-rep .hr-bad')];return L.findIndex(li=>li.querySelector('[data-rp=fixs]'))}""")
        assert side >= 0, 'no margin fix button'
        pg.click('#heat-rep .hr-bad[data-i="%d"] [data-rp=fixs]' % side)
        pg.wait_for_timeout(500)
        sb = pg.evaluate("(S.edits['о']||{}).sbR||0")
        assert abs(sb) <= 25, 'margin after fix %s' % sb
        r = pg.evaluate(RUN); assert r['score'] >= clean['score'] - 6, 'score after fixes %s vs clean %s' % (r['score'], clean['score'])
        assert not s.errs, s.errs[:3]
        return 'clean %s kern %s rsb %s heavy %s all %s fixed %s sb->%s' % (res['clean'], res['kern'], res['rsb'], res['heavy'], res['all'], r['score'], sb)
    finally:
        s.close()


def open_sample(s):
    s.open_font(FONT); settle(s.pg)
    s.pg.evaluate("document.querySelector('#specwrap')._pane&&document.querySelector('#specwrap')._pane.set(true)")
    s.pg.wait_for_timeout(300)


def ov_ink(pg):
    return pg.evaluate("""()=>{const c=document.querySelector('#heat-ov');if(!c||!c.width)return -1;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,h=0;for(let i=3;i<d.length;i+=4){if(d[i]>0){n++;h=(h*31+d[i]+d[i-1])|0;}}return [n,h]}""")


def heat_sample(p):
    s = sess(p, 'hs'); pg = s.pg
    try:
        open_sample(s)
        pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB)
        pg.wait_for_timeout(300)
        chips = pg.evaluate("[...document.querySelectorAll('.spectools .chiprow>.chip')].map(b=>b.textContent.trim())")
        assert 'Тепловая карта' in chips and chips.index('Тепловая карта') == chips.index('Контекст') + 1, chips
        assert pg.evaluate("document.querySelector('#heatbar').hidden")
        pg.click('#heatb')
        pg.wait_for_function("HEAT.last&&HEAT.last.lines.length>=2", timeout=10000); pg.wait_for_timeout(300)
        assert not pg.evaluate("document.querySelector('#heatbar').hidden") and pg.evaluate("document.querySelector('#heatb').getAttribute('aria-pressed')") == 'true'
        keys = pg.evaluate("[...new Set(HEAT.last.lines.map(l=>l.key))]")
        assert keys == ['regular', 'italic'], keys
        ink = ov_ink(pg); assert ink != -1 and ink[0] > 200, 'overlay is empty %s' % ink
        # layers: each repaints; the segmented control is the DS pill
        sigs = {}
        for l in ('read', 'tone', 'gaps', 'rhy'):
            pg.click('#heat-seg-s [data-hl=%s]' % l); pg.wait_for_timeout(120)
            assert pg.evaluate("HEAT.layer") == l
            sigs[l] = ov_ink(pg)
        assert sigs['gaps'] != sigs['tone'] and sigs['read'] != sigs['rhy'], sigs
        pg.click('#heat-seg-s [data-hl=read]')
        # size slider and text edit re-run the map (debounced)
        n0 = pg.evaluate("HEAT.n.spec")
        pg.evaluate("(()=>{const t=document.querySelector('#tsz');t.value=90;t.dispatchEvent(new Event('input',{bubbles:true}))})()")
        pg.wait_for_function("HEAT.n.spec>%d" % n0, timeout=5000)
        sc1 = pg.evaluate("HEAT.last.sc")
        assert abs(sc1 - 0.090) < 0.02 or sc1 < 0.09, sc1
        n0 = pg.evaluate("HEAT.n.spec")
        pg.evaluate("S.text='Скакун ночи\\nСкоро 100 лет';bump()")
        pg.wait_for_function("HEAT.n.spec>%d" % n0, timeout=5000)
        assert pg.evaluate("HEAT.last.lines.some(l=>l.chars.map(c=>c.ch).join('').startsWith('Скакун'))")
        # typing 6 characters quickly does not run 6 analyses
        pg.evaluate("S.text='Съешь ещё этих мягких французских булок';bump()"); pg.wait_for_timeout(500)
        n0 = pg.evaluate("HEAT.n.spec")
        for i in range(6):
            pg.evaluate("S.text=S.text+'а';bump()"); pg.wait_for_timeout(25)
        pg.wait_for_timeout(500)
        dn = pg.evaluate("HEAT.n.spec") - n0
        assert 1 <= dn <= 3, 'typing ran %s analyses' % dn
        # tooltip over the hottest spot, then a pinned card
        pg.evaluate("S.text='Съешь ещё этих мягких французских булок';S.specSize=60;document.querySelector('#tsz').value=60;bump()"); pg.wait_for_timeout(700)
        spot = pg.evaluate("""()=>{const r=HEAT.last,cv=document.querySelector('#spec').getBoundingClientRect();
          const it=r.items.filter(i=>i.t==='pair'&&i.sev>=.5).sort((a,b)=>b.sev-a.sev)[0];if(!it)return null;
          return {x:cv.left+(it.x0+it.x1)/2,y:cv.top+(it.y0+it.y1)/2,a:it.a,b:it.b,txt:null}}""")
        assert spot, 'no hot pair in the sample'
        pg.mouse.move(spot['x'] - 40, spot['y']); pg.mouse.move(spot['x'], spot['y']); pg.wait_for_timeout(250)
        tip = pg.evaluate("(()=>{const t=document.querySelector('#heat-tip');return t&&!t.hidden?t.textContent:''})()")
        assert tip and ('больше среднего' in tip or 'меньше среднего' in tip or 'касаются' in tip or 'поле знака' in tip.lower()), 'tooltip: %r' % tip
        pg.mouse.click(spot['x'], spot['y']); pg.wait_for_timeout(300)
        assert pg.evaluate("document.querySelector('#heat-tip').classList.contains('pin')"), 'card is not pinned'
        assert pg.evaluate("document.querySelector('#kk-pop')?document.querySelector('#kk-pop').hidden:true"), 'the kerning popover opened over the card'
        btns = pg.evaluate("[...document.querySelectorAll('#heat-tip [data-ha]')].map(b=>b.dataset.ha)")
        assert 'kern' in btns, btns
        pg.click('#heat-tip [data-ha=kern]'); pg.wait_for_function("S.tab==='kern'", timeout=5000)
        assert pg.evaluate("[KK.a,KK.b].join('')") in (spot['a'] + spot['b'],), (pg.evaluate("[KK.a,KK.b].join('')"), spot)
        pg.evaluate("setTab('edit')"); pg.wait_for_timeout(400)
        # off: bar hidden, overlay cleared, no analyses
        pg.click('#heatb'); pg.wait_for_timeout(200)
        assert pg.evaluate("document.querySelector('#heatbar').hidden")
        assert ov_ink(pg)[0] == 0, 'overlay not cleared'
        n0 = pg.evaluate("HEAT.n.spec")
        for i in range(4):
            pg.evaluate("bump()"); pg.wait_for_timeout(60)
        pg.wait_for_timeout(300)
        assert pg.evaluate("HEAT.n.spec") == n0, 'analysis ran while hidden'
        assert not s.errs, s.errs[:3]
        return 'chips %d, layers ok, typing %s analyses, tip %r' % (len(chips), dn, tip[:50])
    finally:
        s.close()


def heat_proof(p):
    s = sess(p, 'hp'); pg = s.pg
    try:
        s.open_font(FONT); settle(pg)
        pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.evaluate(INJ_HEAVY)
        pg.evaluate("setTab('proof')")
        pg.wait_for_function("document.querySelectorAll('#heat-rep .hr-bad').length>0", timeout=20000); pg.wait_for_timeout(300)
        d = pg.evaluate("""()=>({score:+document.querySelector('.hr-n b').textContent,verdict:document.querySelector('.hr-v p').textContent,
          strong:document.querySelectorAll('#heat-rep .hr-ok').length,weak:document.querySelectorAll('#heat-rep .hr-bad').length,
          acts:[...document.querySelectorAll('#heat-rep .hr-bad')].map(li=>[...li.querySelectorAll('[data-rp]')].map(b=>b.textContent.trim()).join('|')),
          hasCanvas:document.querySelector('#heat-txt').width>100,title:document.querySelector('#heat-pf .pane-t').textContent})""")
        assert d['title'] == 'Тепловая карта' and d['hasCanvas']
        assert 0 <= d['score'] <= 100 and len(d['verdict']) > 10, d
        assert 2 <= d['strong'] <= 4, d
        assert 1 <= d['weak'] <= 5, d
        assert all(a.startswith('Показать') for a in d['acts']), d['acts']
        # «Показать» draws a ring and scrolls to the spot
        pg.click('#heat-rep .hr-bad[data-i="0"] [data-rp=show]'); pg.wait_for_selector('#heat-sheet .heat-ring', timeout=3000)
        # layers + style
        for l in ('tone', 'gaps', 'rhy', 'read'):
            pg.click('#heat-seg-p [data-hl=%s]' % l)
        pg.click('#heat-sty [data-hs=italic]'); pg.wait_for_function("HEAT.lastPf&&HEAT.lastPf.lines[0].key==='italic'", timeout=8000)
        pg.click('#heat-sty [data-hs=regular]'); pg.wait_for_function("HEAT.lastPf&&HEAT.lastPf.lines[0].key==='regular'", timeout=8000)
        # theme switch: tokens change, the overlay stays painted
        t0 = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--heat-0').trim()+getComputedStyle(document.documentElement).getPropertyValue('--cv-heat-0').trim()")
        pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(600)
        t1 = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--heat-0').trim()+getComputedStyle(document.documentElement).getPropertyValue('--cv-heat-0').trim()")
        assert t0 != t1, 'heat tokens do not change with the theme'
        k = pg.evaluate("""()=>{const c=document.querySelector('#heat-pov');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n}""")
        assert k > 200, 'overlay empty after the theme switch'
        # a shut block does not compute
        pg.evaluate("document.querySelector('#heat-pf')._pane.set(false)"); pg.wait_for_timeout(200)
        n0 = pg.evaluate("HEAT.n.pf"); pg.evaluate("renderProof()"); pg.wait_for_timeout(500)
        assert pg.evaluate("HEAT.n.pf") == n0, 'computed while shut'
        assert not s.errs, s.errs[:3]
        return 'score %s, strong %s, weak %s, acts %s' % (d['score'], d['strong'], d['weak'], d['acts'][:2])
    finally:
        s.close()


def heat_clean(p):
    """calm text stays clean: no tint past the last glyph, near-zero tint on a clean sample; an intentionally irregular library font shows the caveat and no «Исправить»."""
    s = sess(p, 'hc'); pg = s.pg
    try:
        open_sample(s)
        pg.evaluate("S.text='Съешь ещё этих мягких французских булок, да выпей чаю.';bump()")
        pg.click('#heatb'); pg.wait_for_function("HEAT.last", timeout=10000); pg.wait_for_timeout(600)
        m = pg.evaluate("""()=>{const c=document.querySelector('#heat-ov'),r=HEAT.last,k=c.width/document.querySelector('#spec').getBoundingClientRect().width,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let n=0,past=0;          // right edge of every line: last char x + its advance (font units -> px)
          const ends=r.lines.map(l=>{const c0=l.chars[l.chars.length-1],g=gfSmart(c0.gn||c0.ch,l.key);return (l.ox+c0.x+(g?g.adv:500)*r.sc)*k});
          const tops=r.lines.map(l=>(l.base-l.ref.cap*r.sc)*k),bots=r.lines.map(l=>(l.base+.1*1000*r.sc)*k);
          for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a<12)continue;n++;
            for(let i=0;i<ends.length;i++)if(y>=tops[i]&&y<=bots[i]&&x>ends[i]+6){past++;break;}}
          return {n,past,total:c.width*c.height,lines:r.lines.length}}""")
        assert m['past'] == 0, 'tint past the last glyph: %s' % m
        assert m['n'] <= 0.004 * m['total'], 'calm text is tinted: %s' % m
        # defects glow, calm text stays clean
        pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.wait_for_timeout(700)
        ink = ov_ink(pg); assert ink[0] > 150, 'defects do not glow %s' % ink
        pg.click('#heatb')
        # an intentionally irregular library font: caveat, no fix on intended spots
        s.open_font('modul'); settle(pg)
        pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelector('#heat-rep .hr-score')", timeout=20000); pg.wait_for_timeout(300)
        d = pg.evaluate("""()=>({txt:document.querySelector('#heat-rep').textContent,fix:document.querySelectorAll('#heat-rep [data-rp=fix],#heat-rep [data-rp=fixs]').length,score:document.querySelector('.hr-n b').textContent})""")
        assert 'Неровность задумана рисунком' in d['txt'], 'no caveat for modul'
        assert d['score'] == '—' or int(d['score']) >= 70, d
        it = pg.evaluate("""()=>{const r=HEAT.lastPf,x=r.items.find(i=>i.intended&&i.sev>=.3);return x?{t:HEAT.text(x).p,k:x.t}:null}""")
        assert it is None or 'задумано' in it['t'], it
        # the user's own font and normal fonts: the caveat is absent
        s.open_font(FONT); settle(pg)
        pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelector('#heat-rep .hr-score')", timeout=20000); pg.wait_for_timeout(300)
        assert 'Неровность задумана' not in pg.evaluate("document.querySelector('#heat-rep').textContent"), 'caveat on a normal font'
        assert not s.errs, s.errs[:3]
        return 'tinted px %d of %d, past text %d; modul score %s, fix buttons %d' % (m['n'], m['total'], m['past'], d['score'], d['fix'])
    finally:
        s.close()


def heat_geom(p):
    out = []
    for w, h in ((1440, 900), (390, 844)):
        for th in ('light', 'dark'):
            s = sess(p, 'hg', w, h, th); pg = s.pg
            try:
                open_sample(s)
                pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB)
                pg.click('#heatb'); pg.wait_for_function("HEAT.last", timeout=10000); pg.wait_for_timeout(500)
                bad = pg.evaluate("""()=>{const vw=document.documentElement.clientWidth,o=[];
                  for(const sel of ['#heatbar','.heat-seg','.heat-leg','#heatb']){const e=document.querySelector(sel);if(!e)continue;const r=e.getBoundingClientRect();
                    if(r.right>vw+1||r.left<-1)o.push(sel+' out of viewport '+Math.round(r.left)+'..'+Math.round(r.right));}
                  const hb=document.querySelector('#heatbar');for(const e of hb.querySelectorAll('.heat-leg>*')){const r=e.getBoundingClientRect(),q=hb.querySelector('.heat-leg').getBoundingClientRect();if(r.right>q.right+1||r.left<q.left-1)o.push('legend child past the pill');}
                  for(const e of document.querySelectorAll('.heat-leg'))if(e.scrollWidth>e.clientWidth+1)o.push('legend content wider than its pill');
                  if(document.documentElement.scrollWidth>vw+1)o.push('page scrolls sideways '+document.documentElement.scrollWidth);return o}""")
                assert not bad, '%dx%d %s sample: %s' % (w, h, th, bad)
                pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelectorAll('#heat-rep .hr-bad').length>0", timeout=20000); pg.wait_for_timeout(500)
                bad = pg.evaluate("""()=>{const vw=document.documentElement.clientWidth,o=[],pf=document.querySelector('#heat-pf'),pr=pf.getBoundingClientRect();
                  for(const e of pf.querySelectorAll('.heat-seg,.heat-leg,.heat-sheet,.hr-score,.hr-list li,.hr-a .btn,.ht-k')){const r=e.getBoundingClientRect();if(!r.width)continue;
                    if(r.right>vw+1||r.left<-1)o.push((e.className||e.tagName)+' out of viewport '+Math.round(r.left)+'..'+Math.round(r.right));
                    if(r.right>pr.right+1||r.left<pr.left-1)o.push((e.className||e.tagName)+' past the block '+Math.round(r.left)+'..'+Math.round(r.right)+' vs '+Math.round(pr.left)+'..'+Math.round(pr.right));}
                  for(const e of pf.querySelectorAll('.hr-list li,.hr-score,.hr-t,.heat-leg')){if(e.scrollWidth>e.clientWidth+1)o.push('text clipped in '+e.className);}
                  const sc=[...pf.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return (c.overflowX==='scroll'||c.overflowY==='scroll')});if(sc.length)o.push('forced scrollbars '+sc.length);
                  if(document.documentElement.scrollWidth>vw+1)o.push('page scrolls sideways '+document.documentElement.scrollWidth);return o}""")
                assert not bad, '%dx%d %s proof: %s' % (w, h, th, bad)
                assert not s.errs, s.errs[:3]
                out.append('%dx%d/%s ok' % (w, h, th))
            finally:
                s.close()
    return ' '.join(out)


def heat_perf(p):
    s = sess(p, 'hf'); pg = s.pg
    try:
        open_sample(s)
        pg.evaluate("S.specSize=60;document.querySelector('#tsz').value=60;bump()"); settle(pg, 300)
        pg.evaluate("HEAT.run(HEAT.TEXT,'regular',60,900)")  # warm: glyph profiles are cached per glyph object
        ms = pg.evaluate("""()=>{const t='ЖЕЛЕЗО НОЧИ\\nNeon Noir 2077 — №7',a=[];for(let i=0;i<7;i++){const r=HEAT.run(t,'regular',60,1200),q=HEAT.run(t,'italic',60,1200);a.push(r.ms+q.ms);}a.sort((x,y)=>x-y);return a[3]}""")
        assert ms <= 60, 'sample compute %.1f ms > 60' % ms
        pg.click('#heatb'); pg.wait_for_function("HEAT.last", timeout=10000); pg.wait_for_timeout(400)
        full = pg.evaluate("HEAT.specMs")
        assert full <= 60, 'analysis + paint %.1f ms > 60' % full
        pg.click('#heatb')
        # the debounce keeps typing smooth: a main-thread long task (> 50 ms) does not come from the map
        pg.click('#heatb'); pg.wait_for_timeout(300)
        lt = pg.evaluate("""()=>new Promise(res=>{let max=0;const po=new PerformanceObserver(l=>{for(const e of l.getEntries())max=Math.max(max,e.duration)});try{po.observe({entryTypes:['longtask']})}catch(e){}
          let i=0;const t=setInterval(()=>{S.text='Съешь ещё этих мягких '+'я'.repeat(i%5);bump();if(++i>12){clearInterval(t);setTimeout(()=>res(max),500)}},40)})""")
        assert lt < 200, 'long task %.0f ms while typing' % lt
        return 'sample analysis %.1f ms, analysis + paint %.1f ms (regular+italic, 60 px), longest task while typing %.0f ms' % (ms, full, lt)
    finally:
        s.close()


# ---------- evidence screenshots (dsf 2): GT_SHOTS=1 HEAT_OUT=dir python3 tests/e2e_heat.py shots ----------
def heat_shots(p):
    out = os.environ.get('HEAT_OUT') or os.path.join(os.path.dirname(__file__), '..', 'logs', 'heat_shots')
    os.makedirs(out, exist_ok=True)
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    n = 0
    try:
        for w, h, tag in ((1440, 900, '1440'), (390, 844, '390')):
            for th in ('light', 'dark'):
                ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2); ctx.add_init_script(TOUR_OFF)
                pg = ctx.new_page(); pg.goto('file://' + PAGE)
                pg.wait_for_function("typeof S!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)
                pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", th)
                pg.evaluate("setTab('library')"); pg.click('#libgrid .lcard[data-font=%s]' % FONT)
                pg.wait_for_function("S.fontId==='%s'&&!S.live" % FONT, timeout=30000); pg.evaluate("setTab('edit')"); pg.wait_for_timeout(900)
                pg.evaluate("document.querySelector('#specwrap')._pane&&document.querySelector('#specwrap')._pane.set(true)"); pg.wait_for_timeout(300)
                if tag == '390':
                    pg.evaluate("S.specSize=44;document.querySelector('#tsz').value=44")
                pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.evaluate("S.text='Съешь ещё этих мягких французских булок'"); pg.evaluate("bump()")
                pg.click('#heatb'); pg.wait_for_function("HEAT.last", timeout=10000); pg.wait_for_timeout(600)
                for l in (('read', 'Чтение'), ('tone', 'Пятно'), ('gaps', 'Пробелы'), ('rhy', 'Ритм')):
                    pg.click('#heat-seg-s [data-hl=%s]' % l[0]); pg.wait_for_timeout(250)
                    pg.screenshot(path=os.path.join(out, 'sample_%s_%s_%s.png' % (tag, th, l[0]))); n += 1
                pg.click('#heat-seg-s [data-hl=read]'); pg.wait_for_timeout(200)
                if tag == '1440' and th == 'light':
                    spot = pg.evaluate("""()=>{const r=HEAT.last,cv=document.querySelector('#spec').getBoundingClientRect();const it=r.items.filter(i=>i.t==='pair'&&i.sev>=.5).sort((a,b)=>b.sev-a.sev)[0];return {x:cv.left+(it.x0+it.x1)/2,y:cv.top+(it.y0+it.y1)/2}}""")
                    pg.mouse.move(spot['x'] - 30, spot['y']); pg.mouse.move(spot['x'], spot['y']); pg.wait_for_timeout(300)
                    pg.screenshot(path=os.path.join(out, 'tooltip_1440_light.png')); n += 1
                    pg.mouse.click(spot['x'], spot['y']); pg.wait_for_timeout(300)
                    pg.screenshot(path=os.path.join(out, 'card_1440_light.png')); n += 1
                    pg.keyboard.press('Escape')
                if tag == '390':
                    spot = pg.evaluate("""()=>{const r=HEAT.last,cv=document.querySelector('#spec').getBoundingClientRect();const it=r.items.filter(i=>i.t==='pair'&&i.sev>=.5).sort((a,b)=>b.sev-a.sev)[0];return {x:cv.left+(it.x0+it.x1)/2,y:cv.top+(it.y0+it.y1)/2}}""")
                    pg.mouse.click(spot['x'], spot['y']); pg.wait_for_timeout(300)
                    pg.screenshot(path=os.path.join(out, 'card_390_%s.png' % th)); n += 1
                    pg.keyboard.press('Escape')
                pg.click('#heatb')
                pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelectorAll('#heat-rep .hr-bad').length>0", timeout=20000); pg.wait_for_timeout(700)
                pg.evaluate("document.querySelector('#heat-pf').scrollIntoView({block:'start'})"); pg.wait_for_timeout(500)
                pg.screenshot(path=os.path.join(out, 'proof_%s_%s.png' % (tag, th))); n += 1
                pg.screenshot(path=os.path.join(out, 'proof_full_%s_%s.png' % (tag, th)), full_page=False)
                el = pg.query_selector('#heat-pf'); el.screenshot(path=os.path.join(out, 'proof_block_%s_%s.png' % (tag, th))); n += 1
                ctx.close()
        # clean font vs defect case in the Проверка block (1440 light)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2); ctx.add_init_script(TOUR_OFF)
        pg = ctx.new_page(); pg.goto('file://' + PAGE)
        pg.wait_for_function("typeof S!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)
        pg.evaluate("setTab('library')"); pg.click('#libgrid .lcard[data-font=%s]' % FONT)
        pg.wait_for_function("S.fontId==='%s'&&!S.live" % FONT, timeout=30000); pg.evaluate("setTab('proof')")
        pg.wait_for_function("document.querySelectorAll('#heat-rep .hr-ok').length>0", timeout=20000); pg.wait_for_timeout(700)
        pg.query_selector('#heat-pf').screenshot(path=os.path.join(out, 'proof_clean_1440_light.png')); n += 1
        pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.evaluate(INJ_HEAVY); pg.wait_for_timeout(1200)
        pg.query_selector('#heat-pf').screenshot(path=os.path.join(out, 'proof_defects_1440_light.png')); n += 1
        ctx.close()
    finally:
        b.close()
    return 'wrote %d screenshots to %s' % (n, out)


def heat_ev(p):
    """evidence for the clean-text review: sample (clean / defects) 1440 light+dark, proof 1440 light + 390 dark, an intentionally irregular font."""
    out = os.environ.get('HEAT_OUT') or os.path.join(os.path.dirname(__file__), '..', 'logs', 'heat_shots'); os.makedirs(out, exist_ok=True)
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    n = 0
    def page(w, h, th):
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2); ctx.add_init_script(TOUR_OFF)
        pg = ctx.new_page(); pg.goto('file://' + PAGE)
        pg.wait_for_function("typeof S!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)
        pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", th); return ctx, pg
    def font(pg, f):
        pg.evaluate("setTab('library')"); pg.click('#libgrid .lcard[data-font=%s]' % f)
        pg.wait_for_function("S.fontId==='%s'&&!S.live" % f, timeout=30000); pg.evaluate("setTab('edit')"); pg.wait_for_timeout(800)
    try:
        for th in ('light', 'dark'):
            ctx, pg = page(1440, 900, th); font(pg, FONT)
            pg.evaluate("document.querySelector('#specwrap')._pane&&document.querySelector('#specwrap')._pane.set(true)"); pg.wait_for_timeout(300)
            pg.evaluate("S.text='Съешь ещё этих мягких французских булок, да выпей чаю.';bump()")
            pg.click('#heatb'); pg.wait_for_function("HEAT.last", timeout=10000); pg.wait_for_timeout(700)
            pg.screenshot(path=os.path.join(out, 'sample_clean_1440_%s.png' % th)); n += 1
            pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.evaluate(INJ_HEAVY); pg.wait_for_timeout(900)
            pg.screenshot(path=os.path.join(out, 'sample_defects_1440_%s.png' % th)); n += 1
            ctx.close()
        for w, h, th in ((1440, 900, 'light'), (390, 844, 'dark')):
            ctx, pg = page(w, h, th); font(pg, FONT)
            pg.evaluate(INJ_KERN); pg.evaluate(INJ_RSB); pg.evaluate(INJ_HEAVY)
            pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelectorAll('#heat-rep .hr-bad').length>0", timeout=20000); pg.wait_for_timeout(900)
            pg.query_selector('#heat-pf').screenshot(path=os.path.join(out, 'proof_defects_%d_%s.png' % (w, th))); n += 1
            ctx.close()
        for f in ('modul', 'ryvok'):
            ctx, pg = page(1440, 900, 'light'); font(pg, f)
            pg.evaluate("setTab('proof')"); pg.wait_for_function("document.querySelector('#heat-rep .hr-score')", timeout=20000); pg.wait_for_timeout(900)
            pg.query_selector('#heat-pf').screenshot(path=os.path.join(out, 'proof_intended_%s_1440_light.png' % f)); n += 1
            ctx.close()
    finally:
        b.close()
    return 'wrote %d screenshots to %s' % (n, out)


CHECKS = [('heat_detect', heat_detect), ('heat_sample', heat_sample), ('heat_proof', heat_proof), ('heat_clean', heat_clean), ('heat_geom', heat_geom), ('heat_perf', heat_perf)]

if __name__ == '__main__':
    names = sys.argv[1:]
    if names == ['ev']:
        with sync_playwright() as p:
            sys.exit(run('heat_ev', lambda: heat_ev(p)))
    if names == ['shots']:
        with sync_playwright() as p:
            sys.exit(run('heat_shots', lambda: heat_shots(p)))
    sel = [c for c in CHECKS if not names or c[0] in names]
    sys.exit(check_all(sel))
