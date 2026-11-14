"""v83 (H2) permanent home rules. One PASS/FAIL line.
 1. «Как это работает»: the inner app-window panel (.dm-hero) has ONE inset (--dm-in = 16 stage px) from the card edge on top, right and bottom,
    for all 6 demos at every width (one stage 720x340 scaled to the card width, also on the phone); tolerance +-1 px at stage scale.
 1b. Panel inner padding (--dm-pad = 20 stage px): the header row and the corner control (Сбросить / Очистить / Собрать шрифт / Готово) have EQUAL top and right insets from the panel edge (+-1), title centre = control centre (+-1), all demos, one layout.
 1c. Header -> content gap = --dm-hgap (8 stage px, >= 8) for every demo.
 2. No demo element (panel, floating tile, chip, cursor, text) leaves its card: sampled over the whole loop of every demo (clipped by own overflow:hidden parents only).
 3. Home section headings: left edge of the heading text = left edge of the section content and of its first card (+-1 px); the gap heading -> content is the same
    for every home section (head box -> content = the vsec gap, heading text -> content equal within 1.5 px).
 4. Nothing is cut at the right edge (swipe rows with a fade excepted: popular fonts, phone demo row): cards of Лаборатория / По стилю / Избранное and the visible demo cards end inside the column and the viewport
    (the popular-fonts row is the one deliberate swipe row with a fade); the page has no horizontal overflow."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from uiq_views import PAGE, TOUR_OFF
T0 = time.time(); BAD = []
def bad(m):
    BAD.append(m); print('  ', m)

COMBOS = [(3840, 'dark'), (1920, 'dark'), (1440, 'light'), (1440, 'dark'), (1024, 'light'), (768, 'dark'), (390, 'light'), (390, 'dark')]

def new(b, w, theme):
    ctx = b.new_context(viewport={'width': w, 'height': 1000}, color_scheme=theme)
    ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(PAGE)
    pg.wait_for_function("typeof S!=='undefined'&&typeof DM!=='undefined'&&!!DM.car&&!!document.querySelector('#dm-home .dm-box')", timeout=30000)
    pg.evaluate("setTab('home')"); pg.wait_for_timeout(500)
    pg.evaluate("DM.all.forEach(i=>{i.ctrl&&i.ctrl(false);i.init&&i.init()})")  # create every demo, freeze the loop (frames are set with seek)
    pg.wait_for_function("[...document.querySelectorAll('#dm-home .dm-box')].every(b=>b._dm&&b._dm.api)", timeout=10000)
    pg.wait_for_timeout(300)
    return ctx, pg, errs

INSET = """(()=>[...document.querySelectorAll('#dm-home .dm-box')].map(bx=>{const i=bx._dm,k=i.X.k,B=bx.getBoundingClientRect(),h=bx.querySelector('.dm-hero').getBoundingClientRect();
 const hh=bx.querySelector('.dm-hh').getBoundingClientRect(),cb=bx.querySelector('.dm-hh .dm-btn,.dm-hh .dm-bt'),ti=bx.querySelector('.dm-hh .dm-ttl'),c=cb&&cb.getBoundingClientRect(),tt=ti&&ti.getBoundingClientRect();
 return {key:i.key,k,top:(h.top-B.top)/k,right:(B.right-h.right)/k,bottom:(B.bottom-h.bottom)/k,tok:parseFloat(getComputedStyle(bx.querySelector('.dm-hero')).top),
  pad:parseFloat(getComputedStyle(bx.closest('.dm')).getPropertyValue('--dm-pad')),hT:(hh.top-h.top)/k,hR:(h.right-hh.right)/k,
  gap:(()=>{let m=1e9;for(const e of bx.querySelector('.dm-hero').children){if(e.matches('.dm-hh,.dm-rail'))continue;if(getComputedStyle(e).display==='none')continue;const r=e.getBoundingClientRect();if(r.height>0)m=Math.min(m,r.top)}return (m-hh.bottom)/k})(),hg:parseFloat(getComputedStyle(bx.closest('.dm')).getPropertyValue('--dm-hgap')),
  cT:c&&(c.top-h.top)/k,cR:c&&(h.right-c.right)/k,dy:c&&tt&&((tt.top+tt.height/2)-(c.top+c.height/2))/k}}))()"""

# every painted element of a demo stage, clipped by its own overflow parents (not by the stage), vs the card box
OUT = """(()=>{const res=[];const boxes=[...document.querySelectorAll('#dm-home .dm-box')];
 for(const bx of boxes){const i=bx._dm,st=i.st,B=bx.getBoundingClientRect(),D=i.api.D;
  for(let n=0;n<=14;n++){const t=D*n/14;i.seek(t);
   for(const e of st.querySelectorAll('*')){if(e.closest('svg')&&e.tagName.toLowerCase()!=='svg')continue;if(e.closest('defs'))continue;
    let o=1,clip=null,vis=true;for(let a=e;a&&a!==st;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden'){vis=false;break}o*=parseFloat(cs.opacity);
      if(a!==e&&(cs.overflowX!=='visible'||cs.overflowY!=='visible')){const r=a.getBoundingClientRect();clip=clip?[Math.max(clip[0],r.left),Math.max(clip[1],r.top),Math.min(clip[2],r.right),Math.min(clip[3],r.bottom)]:[r.left,r.top,r.right,r.bottom]}}
    if(!vis||o<.02)continue;const r=e.getBoundingClientRect();if(r.width<.5||r.height<.5)continue;
    let l=r.left,tp=r.top,rr=r.right,bt=r.bottom;if(clip){l=Math.max(l,clip[0]);tp=Math.max(tp,clip[1]);rr=Math.min(rr,clip[2]);bt=Math.min(bt,clip[3]);if(rr<=l||bt<=tp)continue}
    const d=Math.max(B.left-l,B.top-tp,rr-B.right,bt-B.bottom);
    if(d>1.01)res.push({key:i.key,t:+t.toFixed(2),el:(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)||e.tagName,out:+d.toFixed(1)})}}
  i.seek(i.api.POSTER)}
 return res})()"""

# one template: left tile and panel rects identical across the 6 demos; content inside x 130..580, y 62..288 of the panel; no compact markers
TPL = """(()=>[...document.querySelectorAll('#dm-home .dm-box')].map(bx=>{const i=bx._dm,k=i.X.k,S=i.st.getBoundingClientRect(),R=e=>{const r=e.getBoundingClientRect();return [(r.left-S.left)/k,(r.top-S.top)/k,r.width/k,r.height/k]};
 const hero=bx.querySelector('.dm-hero'),H=hero.getBoundingClientRect(),lt=bx.querySelector('.dm-lt'),out=[];
 i.seek(i.api.POSTER);for(const e of hero.children){if(e.matches('.dm-hh,.dm-rail'))continue;const r=e.getBoundingClientRect();if(getComputedStyle(e).display==='none')continue;
  const l=(r.left-H.left)/k,t=(r.top-H.top)/k,rr=(r.right-H.left)/k,bb=(r.bottom-H.top)/k;if(l<129||rr>581||bb>289||t<61)out.push([e.className,+l.toFixed(1),+t.toFixed(1),+rr.toFixed(1),+bb.toFixed(1)])}
 return {key:i.key,lt:lt&&R(lt),hero:R(hero),out,compact:!!bx.querySelector('[data-c],.dm-lbars')||i.st.hasAttribute('data-c'),ltCount:bx.querySelectorAll('.dm-lt').length}}))()"""
# d4 / d5 corner button: one label at a time, one width (sampled over the loop)
BTN = """(()=>{const res=[];for(const bx of document.querySelectorAll('#dm-home .dm-box')){const i=bx._dm,bt=bx.querySelector('.dm-bt');if(!bt)continue;let w0=bt.offsetWidth,over=0,wd=0,n=0;
 for(let t=0;t<=i.api.D;t+=.04){i.seek(t);n++;const ops=[...bt.querySelectorAll('.dm-l')].map(l=>parseFloat(getComputedStyle(l).opacity));if(ops.filter(o=>o>.05).length>1)over++;if(Math.abs(bt.offsetWidth-w0)>.5)wd++}
 i.seek(i.api.POSTER);const hr=bx.querySelector('.dm-hero').getBoundingClientRect(),br=bt.getBoundingClientRect(),k=i.X.k;
 res.push({key:i.key,over,wd,n,w:w0,inside:(hr.right-br.right)/k})}return res})()"""
SEC = """(()=>[...document.querySelectorAll('#view-lib>.vsec')].filter(s=>!s.hidden&&s.querySelector(':scope>.vhead h2')).map(s=>{const h=s.querySelector('.vhead h2'),vh=s.querySelector(':scope>.vhead'),rg=document.createRange();rg.selectNodeContents(h);const t=rg.getBoundingClientRect(),vb=vh.getBoundingClientRect();
 const c=vh.nextElementSibling,cr=c.getBoundingClientRect(),first=c.querySelector('.lcard,.dm-fig,.coll,.mcard,.cc,.mini,.vcard')||c.firstElementChild,fr=first.getBoundingClientRect();
 const kids=[...(c.id==='dm-car'?c.querySelectorAll('.dm-view .dm-fig:not([aria-hidden])'):c.children)].map(x=>x.getBoundingClientRect().right);
 return {id:h.id,hl:t.left,cl:cr.left,fl:fr.left,headGap:cr.top-vb.bottom,textGap:cr.top-t.bottom,cb:cr.right,maxr:Math.max(...kids),vh:vb.height,fade:c.classList.contains('hs-fade')||(innerWidth<720&&!!c.querySelector('.hs-fade'))}}))()"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for w, th in COMBOS:
        ctx, pg, errs = new(b, w, th); tag = f'{w}/{th}'
        ins = pg.evaluate(INSET)
        if len(ins) != 6: bad(f'{tag}: {len(ins)} demos in the slider, expected 6')
        for d in ins:
            vals = [d['top'], d['right'], d['bottom']]
            if max(vals) - min(vals) > 1.01 or any(abs(v - 16) > 1.01 for v in vals) or abs(d['tok'] - 16) > .01:
                bad(f'{tag}: {d["key"]} (k={d["k"]:.2f}) panel insets top/right/bottom {[round(v, 2) for v in vals]} stage px, expected 16 each')
            if abs(d['hT'] - d['pad']) > 1.01 or abs(d['hR'] - d['pad']) > 1.01 or abs(d['pad'] - 20) > .01:
                bad(f'{tag}: {d["key"]} header row insets top/right {d["hT"]:.2f}/{d["hR"]:.2f}, expected the panel padding token {d["pad"]}')
            if abs(d['gap'] - d['hg']) > 1.01 or d['hg'] < 8: bad(f'{tag}: {d["key"]} header -> content gap {d["gap"]:.2f}, expected the token {d["hg"]} (>= 8)')
            if d['cT'] is not None and (abs(d['cT'] - d['cR']) > 1.01 or abs(d['cT'] - d['pad']) > 1.01):
                bad(f'{tag}: {d["key"]} corner control top/right inset {d["cT"]:.2f}/{d["cR"]:.2f}, must be equal ({d["pad"]})')
            if d['dy'] is not None and abs(d['dy']) > 1.01:
                bad(f'{tag}: {d["key"]} title centre is {d["dy"]:.2f} off the corner control centre')
        tp = pg.evaluate(TPL)
        for d in tp:
            if d['compact'] or d['ltCount'] != 1: bad(f'{tag}: {d["key"]} has a compact/adaptive marker or {d["ltCount"]} left tiles')
            if d['out']: bad(f'{tag}: {d["key"]} content outside the shared area (130..580 x 62..288): {d["out"][:3]}')
        for nm in ('lt', 'hero'):
            ref = tp[0][nm]
            for d in tp[1:]:
                if max(abs(a - c) for a, c in zip(d[nm], ref)) > 1.01: bad(f'{tag}: {nm} rect differs: {d["key"]} {[round(x, 1) for x in d[nm]]} vs d1 {[round(x, 1) for x in ref]}')
        if tp[0]['lt'] and max(abs(a - c) for a, c in zip(tp[0]['lt'], [20, 88, 196, 148])) > 1.01: bad(f'{tag}: left tile rect {tp[0]["lt"]}, expected 20,88,196,148')
        for d in pg.evaluate(BTN):
            if d['over']: bad(f'{tag}: {d["key"]} button shows two labels at once in {d["over"]}/{d["n"]} frames')
            if d['wd']: bad(f'{tag}: {d["key"]} button width changes ({d["wd"]} frames)')
        out = pg.evaluate(OUT)
        if out: bad(f'{tag}: elements outside their card: {out[:4]} (+{max(0, len(out) - 4)})')
        # sections: heading alignment + gap, right edges (document order, no scrolling needed: rects only)
        pg.evaluate("DM.all.forEach(i=>i.seek&&i.seek(i.api.POSTER))")
        sec = pg.evaluate(SEC)
        if len(sec) < 4: bad(f'{tag}: home sections found {len(sec)}')
        hg = [round(s['headGap'], 1) for s in sec]; one = [s for s in sec if s['vh'] <= 48]; tg = [s['textGap'] for s in one]  # a wrapped head (phone: controls on a 2nd row) is measured by its box
        if max(hg) - min(hg) > .6: bad(f'{tag}: head->content gap differs per section {dict(zip([s["id"] for s in sec], hg))}')
        if max(tg) - min(tg) > 1.5: bad(f'{tag}: heading text->content gap differs {dict(zip([s["id"] for s in one], [round(x, 1) for x in tg]))}')
        for s in sec:
            if abs(s['hl'] - s['cl']) > 1 or abs(s['hl'] - s['fl']) > 1: bad(f'{tag}: {s["id"]}: heading left {s["hl"]:.1f} vs content {s["cl"]:.1f} / first card {s["fl"]:.1f}')
            if not s['fade'] and s['maxr'] > min(s['cb'], w) + 1: bad(f'{tag}: {s["id"]}: a card ends at {s["maxr"]:.1f}, past the column edge {s["cb"]:.1f}')
        ov = pg.evaluate("document.documentElement.scrollWidth-innerWidth")
        if ov > 0: bad(f'{tag}: horizontal page overflow {ov}')
        if errs: bad(f'{tag}: errors {errs[:2]}')
        ctx.close()
    b.close()
for x in BAD[:40]: print('  ', x)
print(('PASS' if not BAD else 'FAIL') + f' home_v83 {len(BAD)} problems; 6 demos: equal panel insets, one shared template (identical left tile / panel rects, content area), d4/d5 button one label at a time, nothing outside the card over the loop, heading left = card left, one heading->content gap, no cut right edges at {len(COMBOS)} width/theme combos t={time.time()-T0:.1f}s')
sys.exit(1 if BAD else 0)
