"""onb (Stage 4C): first-run onboarding (4 steps with the demos d1-d4).
first visit opens ~500 ms after load (automation is spoofed off here; ?onb=1 forces it, the other lanes pre-seed gtype.onb.v1), seen = stored (and in memory when storage throws),
«?» -> «Как это работает» reopens, copy and labels, arrows / Esc / Tab trap / inert background / focus returns to the opener, CTA event + font creation,
motion timings (open 450, close 250, step out 180 + in 300 after 120; reduced motion 90 ms), demos pause when closed, phone swipe > 48 px,
nothing crosses the dialog frame on desktop (1440) and phone (400) in both themes at every step."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, PAGE, CHROME, shot as _shot, LOGS
from playwright.sync_api import sync_playwright

URL = 'file://' + PAGE
SPOOF = "Object.defineProperty(navigator,'webdriver',{get:()=>false});"
COPY = [('Рисуйте буквы по клеткам', 'Проведите по сетке — соседние ячейки сольются в одну букву.'),
        ('Меняйте насыщенность', 'Один ползунок делает все буквы толще или тоньше сразу.'),
        ('Поправьте зазоры', 'Двигайте ручку между буквами, чтобы подобрать кернинг.'),
        ('Сохраните и пользуйтесь', 'Нажмите «Скачать шрифт» — готовый файл сразу окажется в загрузках.')]
BOUNDS = """()=>{const d=document.getElementById('onb-dlg'),R=d.getBoundingClientRect(),bad=[],vw=innerWidth,vh=innerHeight;
 if(R.left<-.5||R.top<-.5||R.right>vw+.5||R.bottom>vh+.5)bad.push('dialog outside viewport '+[R.left,R.top,R.right,R.bottom,vw,vh].map(Math.round));
 if(d.scrollWidth>d.clientWidth+1)bad.push('dialog scrolls horizontally');
 const slide=d.querySelector('.onb-slide.on'),demo=slide.querySelector('.onb-demo'),DR=demo.getBoundingClientRect();
 for(const e of d.querySelectorAll('*')){if(e.closest('[inert]')&&!slide.contains(e))continue;if(e.closest('svg')&&e.tagName!=='svg')continue;
  const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')continue;
  const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;
  const inDemo=demo.contains(e),B=inDemo?DR:R,t=inDemo?1.5:1;
  /* clipped by an ancestor with overflow hidden inside the demo: judge the visible part */
  let vis=r;if(inDemo){let a=e.parentElement;while(a&&a!==demo){const o=getComputedStyle(a);if(o.overflow!=='visible'){const q=a.getBoundingClientRect();vis={left:Math.max(vis.left,q.left),top:Math.max(vis.top,q.top),right:Math.min(vis.right,q.right),bottom:Math.min(vis.bottom,q.bottom)};}a=a.parentElement;}}
  if(vis.left<B.left-t||vis.right>B.right+t||vis.top<B.top-t||vis.bottom>B.bottom+t)bad.push((e.id||e.className||e.tagName)+' '+[vis.left,vis.top,vis.right,vis.bottom].map(Math.round)+' vs '+[B.left,B.top,B.right,B.bottom].map(Math.round));
  if(!inDemo&&/^(H2|P|BUTTON|SPAN)$/.test(e.tagName)&&e.scrollWidth>e.clientWidth+1&&cs.overflow!=='visible')bad.push('text overflow '+(e.id||e.className));}
 return bad.slice(0,6);}"""


def ctx_for(p, w=1440, h=900, theme='light', reduced=False, touch=False, spoof=True, seed=None, query='', tour=True):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    c = b.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if reduced else 'no-preference', has_touch=touch, color_scheme=theme)
    pre = (SPOOF if spoof else '') + "try{localStorage.setItem('gtype-theme-v1','%s');" % theme
    pre += ("localStorage.setItem('gtype-tour-v1','1');localStorage.setItem('gtype-tour-sk-v1','1');" if tour else '')
    pre += (seed or '') + "}catch(e){}"
    c.add_init_script(pre)
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
    pg.goto(URL + query)
    pg.wait_for_function("typeof S!=='undefined'&&typeof ONB!=='undefined'&&!!document.querySelector('[data-tab=home]')", timeout=30000)
    return b, pg, errs


def flow(p):
    # first visit (no key): opens by itself ~500 ms after load, not at once
    b, pg, errs = ctx_for(p, tour=False)
    pg.wait_for_function("ONB.isOpen", timeout=4000)
    assert pg.evaluate("document.getElementById('onb').hidden") is False
    assert pg.evaluate("document.querySelector('.app').inert") is True, 'background must be inert'
    t = pg.evaluate("document.getElementById('onb-count').textContent"); assert t == 'Шаг 1 из 4', t
    assert pg.inner_text('#onb-skip') == 'Пропустить' and pg.inner_text('#onb-next') == 'Далее' and pg.is_hidden('#onb-back')
    assert pg.evaluate("document.getElementById('onb-dlg').getAttribute('role')") == 'dialog' and pg.evaluate("document.getElementById('onb-dlg').getAttribute('aria-modal')") == 'true'
    # copy of all four steps; Далее / Назад; last = «Создать шрифт», no «Пропустить»
    for i, (h, t) in enumerate(COPY):
        pg.wait_for_function(f"ONB.step=={i}")
        got = pg.evaluate("(()=>{const s=document.querySelector('.onb-slide.on');return [s.querySelector('.onb-h').textContent,s.querySelector('.onb-p').textContent]})()")
        assert got == [h, t], got
        assert pg.evaluate("document.getElementById('onb-count').textContent") == f'Шаг {i+1} из 4'
        if i < 3:
            assert pg.inner_text('#onb-next') == 'Далее'; pg.click('#onb-next'); pg.wait_for_timeout(560)
    assert pg.inner_text('#onb-next') == 'Создать шрифт' and pg.is_hidden('#onb-skip') and pg.is_visible('#onb-back')
    pg.click('#onb-back'); pg.wait_for_timeout(560); assert pg.evaluate("ONB.step") == 2 and pg.inner_text('#onb-next') == 'Далее'
    # keyboard
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100); assert pg.evaluate("ONB.step") == 3
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100); assert pg.evaluate("ONB.step") == 3, 'no wrap'
    pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(100); assert pg.evaluate("ONB.step") == 2
    # focus trap
    for k in range(10):
        pg.keyboard.press('Tab'); assert pg.evaluate("document.getElementById('onb-dlg').contains(document.activeElement)"), 'focus left the dialog (Tab)'
    for k in range(4):
        pg.keyboard.press('Shift+Tab'); assert pg.evaluate("document.getElementById('onb-dlg').contains(document.activeElement)"), 'focus left the dialog (Shift+Tab)'
    # demos: only the active one runs; all stop when the dialog closes
    run = pg.evaluate("ONB.insts().map(m=>!!(m&&m.run))"); assert sum(run) <= 1 and run[2], run
    # Esc closes; storage key written; focus returns to the opener (no opener = «?»)
    pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('onb').hidden", timeout=3000)
    assert pg.evaluate("localStorage.getItem('gtype.onb.v1')") == '1', 'seen flag'
    assert pg.evaluate("ONB.insts().every(m=>!m||!m.run)"), 'demos must pause when closed'
    assert pg.evaluate("document.querySelector('.app').inert") is False
    assert pg.evaluate("document.activeElement.id") == 'help', pg.evaluate("document.activeElement.id")
    # the old welcome tour must not start right after the first-visit onboarding
    pg.wait_for_timeout(1500); assert pg.evaluate("!TOUR.active()"), 'welcome tour started after the onboarding'
    # reload: stays closed
    pg.reload(); pg.wait_for_function("typeof ONB!=='undefined'"); pg.wait_for_timeout(1300)
    assert not pg.evaluate("ONB.isOpen"), 'must not reopen after it was seen'
    # «?» -> «Как это работает» reopens from step 1; closing returns focus to «?»
    pg.click('#help'); pg.wait_for_selector('#helpc:not([hidden])'); pg.click('#onb-open')
    pg.wait_for_function("ONB.isOpen && document.getElementById('helpc').hidden", timeout=3000)
    assert pg.evaluate("ONB.step") == 0
    pg.click('#onb-skip'); pg.wait_for_function("document.getElementById('onb').hidden", timeout=3000)
    assert pg.evaluate("document.activeElement.id") == 'help'
    # CTA: event with reason 'create' and the user lands in font creation (draw)
    pg.evaluate("window.__ev=[];document.addEventListener('gtype:onb-close',e=>window.__ev.push(e.detail))")
    pg.evaluate("ONB.open({step:3})"); pg.wait_for_timeout(500)
    assert pg.inner_text('#onb-next') == 'Создать шрифт'
    pg.click('#onb-next'); pg.wait_for_function("document.getElementById('onb').hidden", timeout=3000)
    ev = pg.evaluate("window.__ev"); assert len(ev) == 1 and ev[0]['reason'] == 'create', ev
    pg.wait_for_function("S.tab==='draw'", timeout=5000)
    assert not errs, errs[:3]
    b.close()
    # storage that throws: the dialog still works and the seen state is kept in memory
    b, pg, errs = ctx_for(p, seed="", query='?onb=1')
    pg.wait_for_function("ONB.isOpen", timeout=4000)
    pg.evaluate("Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')},configurable:true});0")
    pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('onb').hidden", timeout=3000)
    assert pg.evaluate("ONB.seen()") is True, 'memory fallback'
    b.close()
    return 'flow ok'


def motion(p):
    b, pg, errs = ctx_for(p, seed="", query='?onb=1&motion=1')
    pg.wait_for_function("ONB.isOpen", timeout=4000)
    d = pg.evaluate("(()=>{const a=document.getElementById('onb-dlg').getAnimations().concat(document.querySelector('.onb-scrim').getAnimations());return a.map(x=>x.effect.getTiming().duration)})()")
    assert d and set(d) == {450}, ('open 450 ms', d)
    pg.wait_for_timeout(700)
    pg.evaluate("window.__a=null;const s=document.querySelectorAll('.onb-slide');const o=new MutationObserver(()=>{});window.__w=()=>[...document.querySelectorAll('.onb-slide')].map(x=>x.getAnimations().map(a=>[a.effect.getTiming().duration,a.effect.getTiming().delay]))")
    pg.click('#onb-next'); pg.wait_for_timeout(40)
    w = pg.evaluate("window.__w()"); flat = sorted([tuple(x) for s in w for x in s])
    assert (180, 0) in flat and (300, 120) in flat, ('step out 180 / in 300 after 120', flat)
    pg.wait_for_timeout(600)
    pg.click('#onb-skip'); pg.wait_for_timeout(30)
    d = pg.evaluate("(()=>{const a=document.getElementById('onb-dlg').getAnimations();return a.map(x=>x.effect.getTiming().duration)})()")
    assert d and set(d) == {250}, ('close 250 ms', d)
    b.close()
    # reduced motion: 90 ms fades, the demos sit on the poster frame (not running)
    b, pg, errs = ctx_for(p, reduced=True, seed="", query='?onb=1&motion=1')
    pg.wait_for_function("ONB.isOpen", timeout=4000)
    d = pg.evaluate("document.getElementById('onb-dlg').getAnimations().map(x=>x.effect.getTiming().duration)"); assert d and set(d) == {90}, ('reduced open', d)
    pg.wait_for_timeout(300)
    assert pg.evaluate("ONB.insts().every(m=>!m||!m.run)"), 'reduced motion: demos on the poster frame'
    pg.click('#onb-next'); pg.wait_for_timeout(30)
    d = pg.evaluate("[...document.querySelectorAll('.onb-slide')].flatMap(x=>x.getAnimations().map(a=>a.effect.getTiming().duration))"); assert d and set(d) == {90}, ('reduced step', d)
    b.close()
    return 'motion ok'


def phone(p):
    b, pg, errs = ctx_for(p, 400, 800, touch=False, seed="", query='?onb=1')
    pg.wait_for_function("ONB.isOpen", timeout=4000); pg.wait_for_timeout(600)
    R = pg.evaluate("(()=>{const r=document.getElementById('onb-dlg').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()")
    assert R[0] == 0 and R[2] == 400 and abs(R[3] - 800) < 1, ('bottom sheet', R)
    assert pg.evaluate("getComputedStyle(document.querySelector('.onb-grab')).display") == 'block'
    box = pg.evaluate("(()=>{const r=document.getElementById('onb-slides').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
    y = box[1] + 60

    def swipe(dx):
        pg.mouse.move(box[0] + box[2] / 2, y); pg.mouse.down()
        for k in range(1, 9): pg.mouse.move(box[0] + box[2] / 2 + dx * k / 8, y + 2)
        pg.mouse.up(); pg.wait_for_timeout(650)
    swipe(-30); assert pg.evaluate("ONB.step") == 0, 'short swipe must not change the step'
    swipe(-110); assert pg.evaluate("ONB.step") == 1, 'swipe left = next'
    swipe(110); assert pg.evaluate("ONB.step") == 0, 'swipe right = back'
    swipe(110); assert pg.evaluate("ONB.step") == 0, 'no step before the first'
    assert not errs, errs[:3]
    b.close()
    return 'phone ok'


def frames(p):
    n = 0
    for (w, h) in [(1440, 900), (400, 800)]:
        for th in ['light', 'dark']:
            b, pg, errs = ctx_for(p, w, h, theme=th, seed="", query='?onb=1')
            pg.wait_for_function("ONB.isOpen", timeout=4000)
            assert pg.evaluate("document.documentElement.dataset.theme") == th
            for i in range(4):
                pg.wait_for_function(f"ONB.step=={i}"); pg.wait_for_timeout(700)
                bad = pg.evaluate(BOUNDS); assert not bad, (w, th, i + 1, bad)
                n += 1
                _shot(pg, os.path.join(LOGS, f'onb_{w}_{th}_s{i+1}.png'))
                if i < 3: pg.click('#onb-next')
            assert not errs, errs[:3]
            b.close()
    return f'{n} frames inside'


def run(p):
    return None


if __name__ == '__main__':
    sys.exit(check_all([('onb-flow', flow), ('onb-motion', motion), ('onb-phone', phone), ('onb-frames', frames)]))
