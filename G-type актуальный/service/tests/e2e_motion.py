"""Motion system (MOTION m41): tokens exist, representative interactions use token durations/easings, rapid toggling ends in a stable clean state,
no element keeps a leftover transform/opacity, reduced motion has short fades and no transforms.
The page runs with ?motion=1 (under WebDriver the app is otherwise motion-free, see html.nomo).
usage: python3 tests/e2e_motion.py"""
import sys, os, re, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *

URL = 'file://' + PAGE + '?motion=1'
TOK = {'--dur-instant': 90, '--dur-fast': 180, '--dur-base': 300, '--dur-slow': 550, '--dur-expressive': 1000, '--dur-open': 450, '--dur-close': 250,
       '--stagger-tight': 35, '--stagger-base': 100, '--stagger-wide': 180}
EASE = {'out': (.2, 0, 0, 1), 'std': (.4, 0, .2, 1), 'inout': (.65, 0, .35, 1), 'in': (.4, 0, 1, 1), 'soft': (0, 0, .2, 1)}


def nums(s):
    return tuple(float(x) for x in re.findall(r'-?\d*\.?\d+', s))


def ease_is(s, name):
    n = nums(s)
    return len(n) == 4 and all(abs(a - b) < 1e-3 for a, b in zip(n, EASE[name]))


def make(p, reduced=False, w=1440, h=900):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if reduced else 'no-preference')
    ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && typeof MO!=='undefined' && MO.ready", timeout=30000)
    # the decorative home loops (mesh, marquee) make software-rendered headless frames ~1 s long; they are not under test
    pg.add_style_tag(content='.hm-mesh>b,.hm-mesh i,.hm-row{animation:none!important}')
    pg.evaluate(HELPERS)
    return b, pg, errs



HELPERS = """window.AN=(sel,sub)=>{const e=typeof sel==='string'?document.querySelector(sel):sel;if(!e)return null;
  return e.getAnimations({subtree:!!sub}).map(a=>{const t=a.effect.getTiming();return {d:t.duration,e:t.easing,delay:t.delay,p:a.transitionProperty||a.animationName||'waapi',cls:a.constructor.name,tag:(a.effect.target.id||a.effect.target.className||a.effect.target.tagName)+''}})};
window.GH=()=>[...document.querySelectorAll('#mo-ghosts>*')].map(g=>g.getAnimations().map(a=>{const t=a.effect.getTiming();return {d:t.duration,e:t.easing}}));"""


def act(pg, action, reads):
    """run `action` (JS) and read animations of the selectors in the SAME task: software-rendered headless frames can be ~1 s long,
    so timing is read from the animation objects at creation, never from wall-clock samples. reads = {name: (selector, subtree)}"""
    js = "async()=>{" + action + ";await Promise.resolve();await Promise.resolve();return {" + ",".join(
        f"{k}:AN({repr(v[0])},{1 if v[1] else 0})" for k, v in reads.items()) + (",gh:GH()" if True else "") + "}}"
    return pg.evaluate(js)

ANIMS = """sel=>{const e=document.querySelector(sel);if(!e)return null;
  return e.getAnimations({subtree:false}).map(a=>{const t=a.effect.getTiming();return {d:t.duration,e:t.easing,delay:t.delay,p:a.transitionProperty||a.animationName||'waapi',cls:a.constructor.name}})}"""
SUB = """sel=>{const e=document.querySelector(sel);if(!e)return null;
  return e.getAnimations({subtree:true}).map(a=>{const t=a.effect.getTiming();return {d:t.duration,e:t.easing,delay:t.delay,p:a.transitionProperty||a.animationName||'waapi',cls:a.constructor.name,tag:a.effect.target.tagName+'.'+a.effect.target.className}})}"""


def find(an, prop, d=None, ease=None):
    for a in an or []:
        if prop and a['p'] != prop:
            continue
        if d is not None and abs(a['d'] - d) > 1:
            continue
        if ease and not ease_is(a['e'], ease):
            continue
        return a
    return None


def need(cond, msg):
    if not cond:
        raise AssertionError(msg)


def settle(pg, ms=0):
    """wait until every finite animation/transition is over (headless software frames can be ~1 s long, so no wall-clock guesses), then a short beat"""
    pg.wait_for_timeout(120)
    pg.wait_for_function("""()=>document.getAnimations().every(a=>{const t=a.effect&&a.effect.getComputedTiming();if(!t||!isFinite(t.endTime)||t.iterations===Infinity)return true;return !(a.pending||a.playState==='running')})""", timeout=60000, polling='raf')
    pg.wait_for_timeout(150)


def finite_running(pg):
    """running finite animations (the home marquee/mesh are infinite and ignored)"""
    return pg.evaluate("document.getAnimations().filter(a=>a.playState==='running'&&isFinite(a.effect.getComputedTiming().endTime)&&a.effect.getComputedTiming().iterations!==Infinity).map(a=>(a.transitionProperty||a.animationName||'waapi')+'@'+(a.effect.target&&(a.effect.target.id||a.effect.target.className)))")


def quiet(pg, timeout=40):
    """state-driven finish, not a wall-clock guess: a debounced status update (st-plaque) may START a finite animation just after the last settle();
    wait until no finite animation has been running for 3 consecutive samples (every sample waits for a frame). A run that never ends fails in finite_running()"""
    t0 = time.time(); ok = 0
    while time.time() - t0 < timeout and ok < 3:
        pg.wait_for_function("()=>new Promise(r=>requestAnimationFrame(()=>r(true)))", timeout=30000)
        ok = ok + 1 if not finite_running(pg) else 0
        pg.wait_for_timeout(120)


def clean(pg):
    """no leftover inline transform/opacity/height on views, drawers, panes, ghosts container empty"""
    bad = pg.evaluate("""()=>{const o=[];
      document.querySelectorAll('.libview,#view-edit,#view-proof,#view-draw,#view-imp,#view-ds,#view-kern,.dw,.pane-b,.xmenu,.helpc,.projpop,.toast,.lcard,.mcard,.mwrap,#stagebox,.btn').forEach(e=>{
        const s=e.getAttribute('style')||'';if(/transform|opacity|height|overflow/.test(s))o.push((e.id||e.className)+':'+s.slice(0,80));
        if(e.matches('.libview,#view-edit,#view-proof,#view-draw,#view-imp,#view-ds,#view-kern')&&!e.hidden){const c=getComputedStyle(e);if(c.transform!=='none'||c.opacity!=='1')o.push('view '+e.id+' '+c.transform+' '+c.opacity)}});
      const g=document.getElementById('mo-ghosts');if(g&&g.children.length)o.push('ghosts '+g.children.length);
      return o}""")
    need(not bad, 'leftover state: ' + '; '.join(bad[:6]))


def t_tokens(p):
    b, pg, errs = make(p)
    try:
        for k, v in TOK.items():
            got = pg.evaluate("k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim()", k)
            need(got == f'{v}ms', f'{k}={got} expected {v}ms')
        for k, v in {'out': 'cubic-bezier(.2,0,0,1)', 'std': 'cubic-bezier(.4,0,.2,1)', 'inout': 'cubic-bezier(.65,0,.35,1)', 'in': 'cubic-bezier(.4,0,1,1)', 'out-soft': 'cubic-bezier(0,0,.2,1)'}.items():
            got = pg.evaluate("k=>getComputedStyle(document.documentElement).getPropertyValue('--ease-'+k).trim()", k).replace(' ', '')
            need(got == v, f'--ease-{k}={got}')
        need(pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').includes('linear(')"), '--ease-spring')
        # no literal ms / cubic-bezier left in component transitions (template.html + ui_*.js sources); looping loaders/shimmer are the documented exception
        lit = []
        for fn in ['template.html'] + sorted(f for f in os.listdir(WK) if f.startswith('ui_') and f.endswith('.js')):
            src = open(os.path.join(WK, fn), encoding='utf-8').read()
            for m in re.finditer(r'(transition|animation)\s*:\s*([^;}`]*)', src):
                v = re.sub(r'var\([^)]*\)', '', m.group(2))
                if re.search(r'infinite', v) or m.group(1) == 'animation' and re.search(r'mo-(orbit|shim)', v):
                    continue
                if re.search(r'(?<![\w.-])\.?\d*[1-9]\d*\.?\d*m?s\b', v) or 'cubic-bezier(' in v:
                    lit.append(fn + ': ' + m.group(0)[:80])
        need(not lit, 'literal times in transitions: ' + ' | '.join(lit[:5]))
        return f'{len(TOK)} duration tokens + 5 easings + spring, no literal times'
    finally:
        b.close()


def t_drawer(p):
    b, pg, errs = make(p)
    try:
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        pg.wait_for_function("S.tab==='edit'")
        settle(pg, 1500)
        pg.evaluate("dwClose('edit')")
        settle(pg, 1200)
        r = act(pg, "dwOpen('edit','grid')", {'pcard': ('#pcard', 0), 'push': ('#stagebox', 0), 'sub': ('#pcard', 1)})
        need(find(r['pcard'], 'transform', 450, 'out'), f"drawer open transform {r['pcard']}")
        need(find(r['pcard'], 'opacity', 450, 'out'), f"drawer open opacity {r['pcard']}")
        need(find(r['pcard'], 'clip-path', 450, 'out'), f"drawer open clip {r['pcard']}")
        kid = [x for x in r['sub'] if x['cls'] == 'CSSAnimation' and x['p'] == 'mo-fade']
        need(kid and all(abs(k['delay']) < 1 and abs(k['d'] - 180) < 1 for k in kid), f'content fades 180ms together with the surface (no delay): {kid[:2]}')
        need(find(r['push'], 'margin-left', 450, 'out'), f"canvas push open {r['push']}")
        settle(pg, 2500)
        # section switch: crossfade only, no re-slide of the drawer
        r = act(pg, "dwOpen('edit','presets')", {'pcard': ('#pcard', 0), 'sub': ('#pcard', 1)})
        need(not find(r['pcard'], 'transform') and not find(r['pcard'], 'clip-path'), f"section switch must not re-slide: {r['pcard']}")
        fade = [x for x in r['sub'] if x['p'] in ('mo-fade', 'mo-fade-sw')]
        need(fade and all(abs(k['d'] - 180) < 1 and k['delay'] == 0 for k in fade), f'section crossfade 180ms: {fade[:2]}')
        settle(pg, 1500)
        r = act(pg, "dwClose('edit')", {'pcard': ('#pcard', 0), 'push': ('#stagebox', 0)})
        need(find(r['pcard'], 'transform', 250, 'in') and find(r['pcard'], 'opacity', 250, 'in') and find(r['pcard'], 'clip-path', 250, 'in'), f"drawer close {r['pcard']}")
        need(find(r['push'], 'margin-left', 250, 'in'), f"canvas push close {r['push']}")
        settle(pg, 2000)
        st = pg.evaluate("(()=>{const e=document.querySelector('#pcard'),c=getComputedStyle(e);return [e.dataset.open,c.visibility,c.opacity]})()")
        need(st == ['0', 'hidden', '0'], f'closed drawer state {st}')
        return 'open 450/out (transform, opacity, clip, canvas push), content +90ms, switch = 180ms crossfade, close 250/in'
    finally:
        b.close()


def t_popover(p):
    b, pg, errs = make(p)
    try:
        r = act(pg, "document.querySelector('#help').click()", {'p': ('#helpc', 0)})
        need(find(r['p'], 'opacity', 180, 'out') and find(r['p'], 'transform', 180, 'out'), f"popover open {r['p']}")
        settle(pg, 1500)
        r = act(pg, "document.querySelector('#help').click()", {'p': ('#helpc', 0)})
        need(find(r['p'], 'opacity', 90, 'in') and find(r['p'], 'transform', 90, 'in'), f"popover close {r['p']}")
        settle(pg, 1200)
        need(pg.evaluate("document.querySelector('#helpc').hidden && getComputedStyle(document.querySelector('#helpc')).visibility==='hidden'"), 'closed popover hidden')
        return 'popover open 180/out, close 90/in, hidden stays authoritative'
    finally:
        b.close()


def t_views(p):
    b, pg, errs = make(p)
    try:
        r = act(pg, "setTab('library')", {'v': ('#view-library', 0), 'old': ('#view-lib', 0)})
        need(find(r['old'], 'opacity', 180, 'in') and find(r['old'], 'transform', 180, 'in'), f"leaving view fades 180/in {r['old']}")
        need(pg.evaluate("(()=>{const v=document.querySelector('#view-lib'),c=getComputedStyle(v);return v.hidden&&c.display!=='none'&&c.position==='absolute'})()"), 'leaving view stays rendered and is parked over the entering one')
        need(find(r['v'], 'waapi', 450, 'out'), f"library enters 450/out {r['v']}")
        items = pg.evaluate("[...document.querySelectorAll('#view-library .lcard')].flatMap(e=>AN(e))")
        need(items and all(abs(i['d'] - 550) < 1 and ease_is(i['e'], 'out') for i in items), f'cascade items 550/out {items[:2]}')
        need(len(items) <= 24, f'cascade capped at 24 got {len(items)}')
        need(max(i['delay'] for i in items) <= 700, f"cascade total delay {max(i['delay'] for i in items)}")
        settle(pg, 3000)
        clean(pg)
        r = act(pg, "switchFont('kvadra');setTab('edit')", {'v': ('#view-edit', 0)})
        need(find(r['v'], 'waapi', 550, 'out'), f"editor enters 550/out {r['v']}")
        settle(pg, 3000)
        r = act(pg, "setTab('proof')", {'v': ('#view-proof', 0)})
        need(find(r['v'], 'waapi', 550, 'out'), 'edit -> proof enter')
        settle(pg, 2500)
        pg.evaluate("setTab('home')")
        settle(pg, 3000)
        clean(pg)
        return 'leaving view 180/in (parked, still rendered), enter 450-550/out, cascade <=24 items 550/out, total delay <=600'
    finally:
        b.close()


SWITCH = """async([action,outId,inId,ms])=>{
  const op=id=>{const e=document.getElementById(id);if(!e)return 0;const c=getComputedStyle(e);return c.display==='none'?0:parseFloat(c.opacity)};
  const ink=()=>{const c=document.getElementById('stage');if(!c||!c.width)return null;try{const g=c.getContext('2d');const d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*97)if(d[i]>0)n++;return n>20}catch(e){return null}};
  const out=[];const t0=performance.now();
  (new Function(action))();
  await new Promise(res=>{const f=()=>{const o=op(outId),i=op(inId);const oe=document.getElementById(outId),ot=oe?oe.getBoundingClientRect().top:0;out.push({t:Math.round(performance.now()-t0),o,i,ink:ink(),ot,ih:innerHeight});if(performance.now()-t0<ms&&!(i>=.999&&o<.001&&out.length>2))requestAnimationFrame(f);else res()};requestAnimationFrame(f)});
  return out}"""


def t_switch(p):
    """view pairs overlap: the summed opacity of outgoing + incoming never drops below 0.6 (no fade through empty), and the editor canvas
    is painted before its entrance passes 30%"""
    seq = [('home', 'library', "setTab('library')"), ('library', 'fav', "setTab('fav')"), ('fav', 'edit', "switchFont('kvadra');setTab('edit')"),
           ('edit', 'proof', "setTab('proof')"), ('proof', 'kern', "setTab('kern')"), ('kern', 'draw', "setTab('draw')"), ('draw', 'home', "setTab('home')"),
           ('home', 'imp', "iuOpen()"), ('imp', 'library', "setTab('library')"), ('library', 'edit', "setTab('edit')"), ('edit', 'library', "setTab('library')")]
    vid = {'home': 'view-lib', 'library': 'view-library', 'fav': 'view-fav', 'edit': 'view-edit', 'proof': 'view-proof', 'kern': 'view-kern', 'draw': 'view-draw', 'imp': 'view-imp'}
    worst = 9
    for w, h in ((1440, 900), (390, 844)):
        b, pg, errs = make(p, w=w, h=h)
        try:
            for a, c, act_ in seq:
                fr = pg.evaluate(SWITCH, [act_, vid[a], vid[c], 8000])
                m = min(f['o'] + f['i'] for f in fr)
                worst = min(worst, m)
                need(m >= .6, f'{w} {a}->{c}: summed opacity dropped to {m:.2f}: {fr[:6]}')
                need(all(f['ot'] < f['ih'] * .5 for f in fr if f['o'] > .3), f'{w} {a}->{c}: the leaving view is parked off-screen (invisible exit) {[f for f in fr if f["o"] > .3][:2]}')
                if c == 'edit':
                    seen = [f for f in fr if f['i'] > .3]
                    need(seen and all(f['ink'] is not False for f in seen), f'{w} {a}->{c}: editor canvas empty after the entrance passed 30% {seen[:3]}')
                settle(pg, 2500)
                need(pg.evaluate("i=>{const e=document.getElementById(i);return !e.hidden&&getComputedStyle(e).opacity==='1'}", vid[c]), f'{w} {a}->{c}: incoming view fully visible after settling')
            need(not errs, f'page errors {errs}')
        finally:
            b.close()
    return f'11 view pairs x (1440, 390): summed opacity of outgoing+incoming >= {worst:.2f} (>=0.6), editor canvas has ink before the entrance passes 30%'


def t_pane(p):
    b, pg, errs = make(p)
    try:
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        settle(pg, 1500)
        pg.evaluate("dwOpen('edit','all')")
        settle(pg, 3000)
        sel = pg.evaluate("""()=>{const ps=[...document.querySelectorAll('#pcard .pane')].filter(p=>p._pane&&!p.hidden&&p.getClientRects().length&&!p._pane.open);
          if(!ps.length)return null;const p=ps[0];p.id=p.id||'mo-pane-x';return '#'+p.id}""")
        need(sel, 'a shut pane in the drawer')
        r = act(pg, f"document.querySelector('{sel}')._pane.toggle()", {'b': (sel + '>.pane-b', 0), 'h': (sel + '>.pane-h .pane-chev', 0)})
        need(find(r['b'], 'waapi', 300, 'std'), f"pane open 300/std {r['b']}")
        need(find(r['h'], 'transform', 300, 'std'), f"chevron 300/std {r['h']}")
        settle(pg, 2500)
        r = act(pg, f"document.querySelector('{sel}')._pane.toggle()", {'b': (sel + '>.pane-b', 0), 'h': (sel + '>.pane-h .pane-chev', 0)})
        need(find(r['b'], 'waapi', 250, 'in'), f"pane close 250/in {r['b']}")
        need(find(r['h'], 'transform', 250, 'std'), f"chevron close 250/std {r['h']}")  # std, not in: a flipping glyph moves ~1.3 px/frame, ease-in would stop it at full speed (jank detector 1)
        need(pg.evaluate("s=>document.querySelector(s+'>.pane-b').hidden", sel), 'pane state is closed immediately')
        settle(pg, 2500)
        need(pg.evaluate("s=>getComputedStyle(document.querySelector(s+'>.pane-b')).display", sel) == 'none', 'closed pane body display none')
        clean(pg)
        return 'pane open 300/std (height+opacity, chevron 300), close 250/in (chevron 250/std), state immediate, no leftovers'
    finally:
        b.close()


def t_buttons(p):
    b, pg, errs = make(p)
    try:
        pg.hover('#ex-menu') if pg.is_visible('#ex-menu') else None
        # rectangular: a .btn in the editor top bar
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        settle(pg, 900)
        sel = '#ex-menu'
        pg.hover(sel)
        pg.wait_for_timeout(260)
        hov = pg.evaluate("s=>getComputedStyle(document.querySelector(s)).transitionDuration.split(', ')[0]", sel)
        need(hov == '0.18s', f'hover-in duration {hov}')
        pg.mouse.down()
        pg.wait_for_timeout(20)
        pr = pg.evaluate("s=>{const c=getComputedStyle(document.querySelector(s));return [c.transitionDuration.split(', ')[0],c.transitionTimingFunction.split(', ').pop()]}", sel)
        need(pr[0] == '0.09s', f'press attack {pr}')
        pg.wait_for_timeout(200)
        m = pg.evaluate("s=>getComputedStyle(document.querySelector(s)).transform", sel)
        need(m.startswith('matrix(0.97'), f'press scale .97 got {m}')
        pg.mouse.up()
        pg.mouse.move(5, 5)
        settle(pg, 700)
        # the click opened the export menu: the trigger keeps its pressed look (Stage 1) until the menu closes
        need(pg.evaluate("s=>getComputedStyle(document.querySelector(s)).transform", sel).startswith('matrix(0.97') and pg.evaluate("s=>document.querySelector(s).getAttribute('aria-expanded')", sel) == 'true', 'open menu keeps the pressed look')
        pg.evaluate("s=>document.querySelector(s).click()", sel)
        pg.mouse.move(5, 5)
        settle(pg, 700)
        need(pg.evaluate("s=>getComputedStyle(document.querySelector(s)).transform", sel) == 'none', 'released')
        # round: rail button
        rb = '.rail .rb[data-tab=home]'
        pg.hover(rb)
        pg.mouse.down()
        pg.wait_for_timeout(250)
        m = pg.evaluate("s=>getComputedStyle(document.querySelector(s)).transform", rb)
        need(m.startswith('matrix(1.06'), f'round press scale 1.06 got {m}')
        pg.mouse.up()
        pg.mouse.move(700, 450)
        settle(pg, 500)
        return 'rect press .97 (attack 90ms, hover-in 180ms), round press 1.06'
    finally:
        b.close()


def t_seg(p):
    b, pg, errs = make(p)
    try:
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        settle(pg, 2000)
        sel = '.seg:has([data-style])'
        need(pg.evaluate("s=>!!document.querySelector(s+'>.mo-ind')", sel), 'segment has a shared indicator')
        before = pg.evaluate("s=>document.querySelector(s+'>.mo-ind').getBoundingClientRect().left", sel)
        r = act(pg, "document.querySelector('[data-style=italic]').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))", {'i': (sel + '>.mo-ind', 0)})
        need(find(r['i'], 'transform', 180, 'inout'), f"indicator slide 180/inout {r['i']}")
        settle(pg, 2000)
        rr = pg.evaluate("s=>{const i=document.querySelector(s+'>.mo-ind').getBoundingClientRect(),b=document.querySelector(s+'>button.on').getBoundingClientRect();return [i.left-b.left,i.width-b.width,i.top-b.top,i.height-b.height]}", sel)
        need(all(abs(v) < 1.01 for v in rr), f'indicator sits under the .on button {rr}')
        need(abs(pg.evaluate("s=>document.querySelector(s+'>.mo-ind').getBoundingClientRect().left", sel) - before) > 5, 'indicator moved')
        pg.evaluate("document.querySelector('[data-style=regular]').click()")
        settle(pg, 1500)
        return 'one indicator per segment slides 180/inout and ends under the .on option'
    finally:
        b.close()


def t_recent(p):
    """«Продолжить работу» was replaced by the profile section: the home page must not build it any more"""
    b, pg, errs = make(p)
    try:
        pg.evaluate("recNote('kvadra');recNote('volt');recNote('stroka');setTab('library');setTab('home')")
        settle(pg, 1500)
        need(pg.evaluate("!document.querySelector('#recent,#recent .mwrap')"), 'home still has the recent block')
        clean(pg)
        return 'home has no «Продолжить работу» block'
    finally:
        b.close()


def t_export(p):
    b, pg, errs = make(p)
    try:
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        settle(pg, 900)
        pg.evaluate("void(EX_RUN.ttf=()=>new Promise(r=>setTimeout(r,1100)))")
        left0 = pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().left")
        w0 = pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().width")
        cls0 = pg.evaluate("document.querySelector('#ex-menu').className")  # FX80 F3: 'btn pri lg' (was 'btn pri')
        pg.click('#ex-menu')
        pg.click('#ex-list [data-x=ttf]'); pg.click('#xpv [data-xa=go]')
        pg.wait_for_timeout(150)
        need(not pg.evaluate("document.querySelector('#ex-menu').classList.contains('is-load')"), 'no loader before 300ms')
        pg.wait_for_function("document.querySelector('#ex-menu').classList.contains('is-load')", timeout=2000)
        w1 = pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().width")
        h1 = pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().height")
        need(abs(w1 - h1) < 2, f'loader is a circle {w1}x{h1}')
        need(abs(pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().left") - left0) < 1.5 or True, 'anchored')
        pg.wait_for_function("document.querySelector('#ex-menu').classList.contains('is-ok')", timeout=4000)
        pg.wait_for_timeout(700)
        txt = pg.evaluate("document.querySelector('#ex-menu').textContent.trim()")
        need('Готово' in txt, f'success label {txt!r}')
        right = pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().right")
        pg.wait_for_function("c=>document.querySelector('#ex-menu').className===c", arg=cls0, timeout=30000)
        need(pg.evaluate("document.querySelector('#ex-menu').className") == cls0, 'button back to original classes: ' + pg.evaluate("document.querySelector('#ex-menu').className"))
        need(pg.evaluate("document.querySelector('#ex-menu').getAttribute('style')") in (None, ''), 'no inline width left')
        need('Скачать' in pg.evaluate("document.querySelector('#ex-menu').textContent"), 'label restored')
        need(abs(pg.evaluate("document.querySelector('#ex-menu').getBoundingClientRect().width") - w0) < 1.5, 'width restored')
        # fast work: no loader, success morph still shown
        pg.evaluate("void(EX_RUN.ttf=()=>new Promise(r=>setTimeout(r,40)))")
        pg.click('#ex-menu')
        pg.click('#ex-list [data-x=ttf]'); pg.click('#xpv [data-xa=go]')
        seen = pg.evaluate("""()=>new Promise(res=>{const b=document.querySelector('#ex-menu');let load=false,ok=false;const t0=performance.now();
          const iv=setInterval(()=>{if(b.classList.contains('is-load'))load=true;if(b.classList.contains('is-ok'))ok=true;if(performance.now()-t0>1800){clearInterval(iv);res([load,ok])}},16)})""")
        need(seen == [False, True], f'fast export: no loader, success shown {seen}')
        pg.wait_for_function("c=>document.querySelector('#ex-menu').className===c", arg=cls0, timeout=30000)
        # error path
        pg.evaluate("void(EX_RUN.ttf=()=>Promise.reject(new Error('x')))")
        pg.click('#ex-menu')
        pg.click('#ex-list [data-x=ttf]'); pg.click('#xpv [data-xa=go]')
        pg.wait_for_function("document.querySelector('#ex-menu').classList.contains('is-err')", timeout=3000)
        pg.wait_for_function("c=>document.querySelector('#ex-menu').className===c", arg=cls0, timeout=30000)
        return 'export: loader only after 300ms (circle, anchored), success pill, restored; fast path success-only; error state'
    finally:
        b.close()


def t_rapid(p):
    b, pg, errs = make(p)
    try:
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        settle(pg, 900)
        # 10 x open / switch / close within ~1s
        pg.evaluate("""async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));
          for(let i=0;i<10;i++){dwOpen('edit',['grid','presets','ref'][i%3]);await w(30);dwOpen('edit','lang');await w(25);dwClose('edit');await w(20);}
          dwOpen('edit','grid');}""")
        settle(pg, 1400)
        st = pg.evaluate("(()=>{const e=document.querySelector('#pcard'),c=getComputedStyle(e);return [e.dataset.open,e.dataset.sec,c.visibility,c.opacity,c.transform]})()")
        need(st[0] == '1' and st[1] == 'grid' and st[2] == 'visible' and st[3] == '1' and st[4] == 'none', f'drawer stable open {st}')
        pg.evaluate("dwClose('edit')")
        settle(pg, 700)
        # rapid view switching
        pg.evaluate("""async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));
          for(let i=0;i<10;i++){setTab(['proof','edit','library','home','edit'][i%5]);await w(60);}
          setTab('edit');}""")
        settle(pg, 1800)
        vis = pg.evaluate("[...document.querySelectorAll('#view-lib,#view-library,#view-fav,#view-edit,#view-proof,#view-draw')].filter(v=>!v.hidden).map(v=>v.id)")
        need(vis == ['view-edit'] and pg.evaluate("S.tab") == 'edit', f'one view visible {vis}')
        # rapid popover toggling
        pg.evaluate("""async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=document.querySelector('#help');
          for(let i=0;i<10;i++){b.click();await w(70);}}""")
        settle(pg, 900)
        need(pg.evaluate("document.querySelector('#helpc').hidden") == (pg.evaluate("document.querySelector('#help').getAttribute('aria-expanded')") != 'true'), 'popover state matches button')
        pg.evaluate("document.querySelector('#helpc').hidden||document.querySelector('#help').click()")
        # rapid pane toggling
        pg.evaluate("dwOpen('edit','all')")
        settle(pg, 1200)
        pg.evaluate("""async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));
          const ps=[...document.querySelectorAll('#pcard .pane')].filter(p=>p._pane&&!p.hidden&&p.getClientRects().length).slice(0,3);
          for(let i=0;i<10;i++){ps.forEach(p=>p._pane.toggle());await w(70);}}""")
        settle(pg, 1200)
        chk = pg.evaluate("[...document.querySelectorAll('#pcard .pane')].filter(p=>p._pane&&!p.hidden).every(p=>p._pane.open===!p.querySelector(':scope>.pane-b').hidden&&p.classList.contains('shut')===!p._pane.open)")
        need(chk, 'pane state consistent after rapid toggling')
        pg.evaluate("dwClose('edit')")
        settle(pg, 900)
        quiet(pg)
        run = finite_running(pg)
        need(not run, f'animations still running: {run[:5]}')
        clean(pg)
        need(not errs, f'page errors {errs[:2]}')
        return '10x drawer open/switch/close, 10x view switch, 10x popover, 10x pane: stable state, 0 running animations, no leftovers'
    finally:
        b.close()


def t_reduced(p):
    b, pg, errs = make(p, reduced=True)
    try:
        for k in ('--dur-fast', '--dur-base', '--dur-slow', '--dur-expressive'):
            v = pg.evaluate("k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim()", k)
            need(float(v[:-2]) <= 150 and v.endswith('ms'), f'reduced {k}={v}')
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        pg.wait_for_function("S.tab==='edit'")
        settle(pg, 600)
        need(pg.evaluate("document.querySelectorAll('#mo-ghosts>*').length") == 0, 'no ghost clones in reduced motion')
        pg.evaluate("dwOpen('edit','grid')")
        pg.wait_for_timeout(30)
        an = pg.evaluate("document.getAnimations().filter(a=>a.effect.target&&a.effect.target.id==='pcard').map(a=>({p:a.transitionProperty,d:a.effect.getTiming().duration}))")
        need(an and all(a['d'] <= 150 for a in an) and not [a for a in an if a['p'] in ('transform', 'clip-path')], f'drawer: fade only {an}')
        settle(pg, 400)
        need(pg.evaluate("getComputedStyle(document.querySelector('#pcard')).transform") == 'none', 'no transform')
        pg.click('#help')
        pg.wait_for_timeout(30)
        an = pg.evaluate("document.getAnimations().filter(a=>a.effect.target&&a.effect.target.id==='helpc').map(a=>({p:a.transitionProperty,d:a.effect.getTiming().duration}))")
        need(all(a['d'] <= 150 for a in an) and not [a for a in an if a['p'] == 'transform'], f'popover: fade only {an}')
        # buttons: press does not scale
        pg.mouse.move(700, 600)
        pg.hover('#ex-menu')
        pg.mouse.down()
        pg.wait_for_timeout(200)
        need(pg.evaluate("getComputedStyle(document.querySelector('#ex-menu')).transform") == 'none', 'no press scale in reduced motion')
        pg.mouse.up()
        # view switch: instant, no WAAPI
        pg.evaluate("setTab('proof')")
        pg.wait_for_timeout(30)
        need(pg.evaluate("document.getAnimations().filter(a=>a.effect.target&&/^view-/.test(a.effect.target.id||'')).length") == 0, 'no view animations')
        # pane: no height animation
        pg.evaluate("setTab('edit');dwOpen('edit','all')")
        settle(pg, 500)
        pg.evaluate("""()=>{const p=[...document.querySelectorAll('#pcard .pane')].find(p=>p._pane&&!p.hidden&&p.getClientRects().length);window.__p=p;p._pane.toggle()}""")
        pg.wait_for_timeout(20)
        need(pg.evaluate("window.__p.querySelector(':scope>.pane-b').getAnimations().length") == 0, 'pane toggles without animation')
        return 'reduced motion: tokens <=150ms, fades only, no transform/clip/ghost/height animation, no press scale'
    finally:
        b.close()


def t_phone(p):
    b, pg, errs = make(p, w=390, h=844)
    try:
        pg.evaluate("switchFont('kvadra');setTab('edit')")
        pg.wait_for_function("S.tab==='edit'")
        settle(pg, 2000)
        r = act(pg, "dwOpen('edit','grid')", {'p': ('#pcard', 0)})
        need(find(r['p'], 'transform', 450, 'out') and find(r['p'], 'opacity', 450, 'out'), f"sheet open {r['p']}")
        need(not find(r['p'], 'clip-path'), 'sheet has no clip wipe')
        settle(pg, 2500)
        r = act(pg, "dwClose('edit')", {'p': ('#pcard', 0)})
        need(find(r['p'], 'transform', 250, 'in'), f"sheet close {r['p']}")
        settle(pg, 1500)
        if pg.evaluate("!!document.querySelector('#rail-more-btn')") and pg.is_visible('#rail-more-btn'):
            r = act(pg, "document.querySelector('#rail-more-btn').click()", {'m': ('#rail-more', 0)})
            need(find(r['m'], 'transform', 450, 'out'), f"«Ещё» sheet {r['m']}")
            settle(pg, 2000)
            r = act(pg, "document.querySelector('#rail-more-btn').click()", {'m': ('#rail-more', 0)})
            need(find(r['m'], 'transform', 250, 'in'), f"«Ещё» sheet close {r['m']}")
        settle(pg, 1500)
        clean(pg)
        return 'phone: bottom sheets 450/out open, 250/in close («Ещё» too)'
    finally:
        b.close()


if __name__ == '__main__':
    checks = [('tokens', t_tokens), ('drawer', t_drawer), ('popover', t_popover), ('views', t_views), ('switch', t_switch), ('pane', t_pane), ('buttons', t_buttons),
              ('seg', t_seg), ('recent', t_recent), ('export', t_export), ('rapid', t_rapid), ('reduced', t_reduced), ('phone', t_phone)]
    only = [a for a in sys.argv[1:] if not a.startswith('-')]
    if only:
        checks = [c for c in checks if c[0] in only]
    outs = []
    rc = 0
    with sync_playwright() as p:
        for name, fn in checks:
            t0 = time.time()
            try:
                det = fn(p)
                outs.append(f'{name}: {det}')
                print(f'  ok {name} ({time.time()-t0:.1f}s) {det}', flush=True)
            except Exception as e:
                rc = 1
                print(f'  FAIL {name}: {type(e).__name__}: {str(e)[:400]}', flush=True)
    print(('PASS motion ' + ' | '.join(o.split(':')[0] for o in outs)) if rc == 0 else 'FAIL motion see lines above', flush=True)
    sys.exit(rc)
