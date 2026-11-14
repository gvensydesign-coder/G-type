"""W89 C: section «Сообщество» (Уроки / Челленджи). Checks: rail entry + router (reload, Back), lessons list + filters, read/favourite persistence, article (demos, glossary popover, quiz),
demos paused off-screen, every CTA lands in the right mode/state, favourites in «Избранное», challenge page sections, auto/manual progress, .ics, themes x 390/1440 geometry (nothing clipped/overlapping in cards). One line: comm."""
import os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
from common import *

TODAY = "window.__COMM_TODAY='2026-11-09';"


def mk(p, w=1440, h=900, theme='light', reduced=False):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    kw = {'reduced_motion': 'reduce'} if reduced else {}
    c = b.new_context(viewport={'width': w, 'height': h}, accept_downloads=True, **kw)
    c.add_init_script(TOUR_OFF + ";" + TODAY)
    pg = c.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
    pg.goto('file://' + PAGE + '?motion=1')
    pg.wait_for_function("typeof S!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)
    if theme != 'light':
        pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", theme)
    return b, c, pg, errs


READY = "typeof S!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()"


def reload(pg):
    """Persistence check without retries: first wait until the section's debounced write (250 ms, flushed on pagehide) is in localStorage exactly as COMM.store() holds it, then reload ONCE and require
    that the new document reads the identical string back. No reload loop and no re-seeding: the old empty-localStorage flake was the test init script touching localStorage at document creation (see TOUR_OFF in common.py)."""
    pg.wait_for_function("(()=>{const s=localStorage.getItem('gtype-comm-v1');return !!s&&s===JSON.stringify(COMM.store())})()", timeout=10000)
    pre = pg.evaluate("localStorage.getItem('gtype-comm-v1')")
    pg.reload()
    pg.wait_for_function(READY, timeout=180000)
    post = pg.evaluate("localStorage.getItem('gtype-comm-v1')")
    assert post == pre, f'state did not survive reload: before {pre!r} after {post!r}'


def goto(pg):
    pg.click('[data-tab=community]')
    pg.wait_for_function("S.tab==='community'&&COMM.built()&&document.querySelectorAll('.cm-card,.cm-ban').length>0", timeout=15000)


GEO = """()=>{const bad=[];const SEL='.cm-card,.cm-chc,.cm-ban,.cm-hp,.cm-box,.cm-tool,.cm-hero,.cm-quiz,.cm-cta,.cm-next,.cmf-card,.cm-demo,.cm-work,.cm-pop.on';
const vw=document.documentElement.clientWidth;
document.querySelectorAll('.cm-tag').forEach(tg=>{const pv=tg.parentElement.querySelector('.cm-pv');if(!pv)return;const a=tg.getBoundingClientRect(),b=pv.getBoundingClientRect();if(a.width&&a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom)bad.push(['TAG OVERLAPS POSTER',tg.textContent]);});
if(document.documentElement.scrollWidth>vw+1)bad.push(['PAGE H-SCROLL',document.documentElement.scrollWidth,vw]);
document.querySelectorAll(SEL).forEach(card=>{if(card.offsetParent===null&&!card.matches('.cm-pop'))return;const cr=card.getBoundingClientRect();
 const label=(card.className+'').split(' ')[0]+':'+(card.querySelector('h1,h2,h3')||card).textContent.trim().slice(0,22);
 if(cr.right>vw+1||cr.left<-1)bad.push(['CARD OUT OF VIEWPORT',label,cr.left|0,cr.right|0]);
 const items=[];
 card.querySelectorAll('*').forEach(e=>{if(e.closest('canvas,svg,.vh,.cm-pop,.cm-howp'))return;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||e.matches('.vh'))return;
  const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;
  if(e.closest('[hidden]'))return;
  if(e.matches('.cm-wx')&&false)return;
  const tn=[...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim());
  if(r.left<cr.left-1||r.right>cr.right+1||r.top<cr.top-1||r.bottom>cr.bottom+1)bad.push(['CHILD OUTSIDE '+label,e.className||e.tagName,[r.left-cr.left,cr.right-r.right,r.top-cr.top,cr.bottom-r.bottom].map(v=>Math.round(v))]);
  if(tn&&(e.scrollWidth>e.clientWidth+1)&&cs.overflow!=='visible'&&e.clientWidth>0)bad.push(['TEXT CLIPPED '+label,e.className||e.tagName,e.scrollWidth,e.clientWidth]);
  if(tn){const own=[...e.childNodes].filter(c=>c.nodeType===3&&c.textContent.trim());const rg=document.createRange();rg.setStartBefore(own[0]);rg.setEndAfter(own[own.length-1]);const q=(cs.webkitLineClamp&&cs.webkitLineClamp!=='none')?e.getBoundingClientRect():rg.getBoundingClientRect();if(q.width>1)items.push({e,q,t:own[0].textContent.trim().slice(0,14)});}
 });
 for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){const A=items[a],B=items[b];if(A.e.contains(B.e)||B.e.contains(A.e))continue;
  const o=Math.min(A.q.right,B.q.right)-Math.max(A.q.left,B.q.left),v=Math.min(A.q.bottom,B.q.bottom)-Math.max(A.q.top,B.q.top);
  if(o>2&&v>2)bad.push(['TEXT OVERLAP '+label,A.t,B.t]);}
});return bad}"""


def geo(pg, where):
    bad = pg.evaluate(GEO)
    assert not bad, f'{where}: {bad[:6]}'


def scroll_all(pg):
    pg.evaluate("(async()=>{const v=document.getElementById('view-comm');for(let y=0;y<=Math.max(document.documentElement.scrollHeight,v.scrollHeight);y+=500){window.scrollTo(0,y);v.scrollTop=y;await new Promise(r=>setTimeout(r,40))}window.scrollTo(0,0);v.scrollTop=0})()")
    pg.wait_for_timeout(300)


def c_router(p):
    b, c, pg, errs = mk(p)
    try:
        # rail entry after «Избранное», with tooltip
        order = pg.evaluate("[...document.querySelectorAll('.rb[data-tab]')].map(b=>b.dataset.tab)")
        assert order.index('community') == order.index('fav') + 1, order
        tip = pg.evaluate("document.querySelector('[data-tab=community]').dataset.tip")
        assert tip == 'Сообщество', tip
        assert pg.evaluate("getComputedStyle(document.querySelector('[data-tab=community] .ico'),'::before').maskImage!=='none'||getComputedStyle(document.querySelector('[data-tab=community] .ico')).maskImage!=='none'"), 'icon'
        assert not pg.evaluate("COMM.built()"), 'must be lazy: nothing built before the first visit'
        goto(pg)
        assert pg.evaluate("location.hash")=='#community', pg.evaluate("location.hash")
        assert pg.locator('.cm-tabs').count() == 0, 'one landing: no Уроки/Челленджи switch'
        assert pg.locator('.cm-ban').count() == 1 and pg.locator('#cm-les .cm-card').count() == 6
        # Back returns to the landing at the same scroll position
        pg.evaluate("document.querySelector('#cm-les .cm-grid').scrollIntoView()")
        pg.wait_for_timeout(200)
        y0 = pg.evaluate("[scrollY, document.getElementById('view-comm').scrollTop]")
        assert max(y0) > 200, y0
        # sub-state: article, then browser Back returns to the list, then to the previous tab
        pg.click('.cm-card [data-act=open]')
        pg.wait_for_function("COMM.state().a==='a1'&&document.querySelector('.cm-art')")
        pg.go_back()
        pg.wait_for_function("COMM.state().a===null&&document.querySelector('.cm-grid')", timeout=5000)
        pg.wait_for_timeout(200)
        y1 = pg.evaluate("[scrollY, document.getElementById('view-comm').scrollTop]")
        assert abs(max(y1) - max(y0)) < 8, (y0, y1)
        assert pg.evaluate("S.tab")=='community'
        # reload keeps the section and the place
        pg.evaluate("window.scrollTo(0,0);document.getElementById('view-comm').scrollTop=0")
        pg.click('.cm-ban [data-act=och]')
        pg.wait_for_function("COMM.state().c==='coffee'&&document.querySelector('.cm-hero')")
        pg.go_back()
        pg.wait_for_function("COMM.state().c===null&&document.querySelector('.cm-ban')", timeout=5000)
        pg.go_forward()
        pg.wait_for_function("COMM.state().c==='coffee'&&document.querySelector('.cm-hero')", timeout=5000)
        pre = pg.evaluate("localStorage.getItem('gtype-comm-v1')")
        reload(pg)
        try:
            pg.wait_for_function("S.tab==='community'&&COMM.built()&&COMM.state().c==='coffee'&&document.querySelector('.cm-hero')", timeout=15000)
        except Exception:
            raise AssertionError('pre=' + str(pre) + ' after reload: ' + str(pg.evaluate("[S.tab,location.hash,COMM.built(),JSON.stringify(COMM.state()),localStorage.getItem('gtype-nav-v1'),localStorage.getItem('gtype-comm-v1')]")))
        # leaving hides the view
        pg.click('[data-tab=home]')
        pg.wait_for_function("S.tab==='home'")
        assert pg.evaluate("document.getElementById('view-comm').hidden")
        pg.go_back()
        pg.wait_for_function("S.tab==='community'", timeout=5000)
        assert not errs, errs[:3]
        return 'rail+router ok'
    finally:
        b.close()


def c_lessons(p):
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        assert pg.locator('.cm-card').count() == 6
        for card in pg.locator('.cm-card').all():
            assert card.locator('.cm-cv canvas').count() == 1 and card.locator('h3').count() == 1 and card.locator('.cm-lead').count() == 1
            chips = card.locator('.cm-chip').all_inner_texts()
            assert chips[0].endswith('мин') and 'Для новичков' not in chips, chips
            assert card.locator('[data-act=open]').inner_text().startswith('Читать')
            assert card.locator('[data-act=fav]').get_attribute('aria-pressed') == 'false'
        # covers are drawn (non-blank) with real glyphs
        ink = []
        for i in range(6):
            pg.evaluate(f"document.querySelectorAll('.cm-card canvas')[{i}].scrollIntoView({{block:'center'}})")
            pg.wait_for_timeout(350)
            ink.append(pg.evaluate(f"(()=>{{const cv=document.querySelectorAll('.cm-card canvas')[{i}],x=cv.getContext('2d'),d=x.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(Math.abs(d[i]-d[0])+Math.abs(d[i+1]-d[1])+Math.abs(d[i+2]-d[2])>60)n++;return n}})()"))
        assert all(n > 20 for n in ink), ink
        # favourite + filter
        pg.locator('.cm-card [data-act=fav]').nth(1).click()
        assert pg.locator('.cm-card [data-act=fav]').nth(1).get_attribute('aria-pressed') == 'true'
        assert 'Избранное' in pg.inner_text('.cm-bar-f') and pg.evaluate("document.querySelector('.cm-bar-f [data-f=fav]').textContent")=='Избранное · 1', pg.inner_text('.cm-bar-f')
        pg.click('.cm-bar-f [data-f=fav]')
        assert pg.locator('.cm-card').count() == 1
        pg.click('.cm-bar-f [data-f=unread]')
        assert pg.locator('.cm-card').count() == 6
        # read state: open article, scroll to end -> «Прочитано»; the list reflects it, filters recount
        pg.evaluate("COMM.open('a1')")
        pg.wait_for_function("document.querySelector('.cm-art')")
        pg.evaluate("window.scrollTo(0,1e7);document.getElementById('view-comm').scrollTop=1e7")
        pg.wait_for_function("COMM.store().read.a1===1", timeout=5000)
        pg.go_back()
        pg.wait_for_function("document.querySelector('.cm-grid')")
        pg.click('.cm-bar-f [data-f=all]')
        assert pg.locator('.cm-card').first.locator('.cm-state.done').count() == 1
        pg.click('.cm-bar-f [data-f=unread]')
        assert pg.locator('.cm-card').count() == 5
        # persistence across reload
        reload(pg)
        pg.wait_for_function("S.tab==='community'&&document.querySelector('.cm-grid')", timeout=15000)
        st = pg.evaluate("COMM.store()")
        assert st['read'].get('a1') == 1 and st['fav'].get('a2') == 1, st
        assert pg.locator('.cm-card [data-act=fav][aria-pressed=true]').count() == 1
        assert not errs, errs[:3]
        return 'list+filters+persist ok'
    finally:
        b.close()


def c_article(p):
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        words = {}
        for aid in ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']:
            pg.evaluate(f"COMM.open('{aid}')")
            pg.wait_for_function(f"document.querySelector('.cm-art[data-art={aid}]')")
            words[aid] = pg.evaluate("document.querySelector('.cm-prose').innerText.split(/\\s+/).filter(Boolean).length")
            assert 400 <= words[aid] <= 700 + 80, (aid, words[aid])
            nd = pg.locator('.cm-demo').count()
            assert 2 <= nd <= 3, (aid, nd)
            assert pg.locator('.cm-term').count() >= 2, aid
            assert pg.locator('.cm-quiz .cm-q').count() == 2 and pg.locator('.cm-cta [data-act=cta]').count() == 2 and pg.locator('[data-act=next]').count() == 1
            cw = pg.evaluate("document.querySelector('.cm-prose').getBoundingClientRect().width")
            assert 560 <= cw <= 720, cw
            geo(pg, 'article ' + aid)
        # glossary popover (custom, not title)
        pg.evaluate("COMM.open('a1')")
        pg.wait_for_function("document.querySelector('.cm-art[data-art=a1]')")
        t = pg.locator('.cm-term').first
        assert t.get_attribute('title') is None
        t.scroll_into_view_if_needed()
        t.click()
        pg.wait_for_function("document.querySelector('#cm-pop.on')")
        r = pg.evaluate("(()=>{const r=document.getElementById('cm-pop').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight,document.getElementById('cm-pop').innerText.length]})()")
        assert r[0] >= 0 and r[1] >= 0 and r[2] <= r[4] and r[3] <= r[5] and r[6] > 20, r
        pg.keyboard.press('Escape')
        pg.wait_for_function("!document.querySelector('#cm-pop.on')")
        # quiz: wrong -> friendly neutral feedback, change answer -> right
        q = pg.locator('.cm-q').first
        q.scroll_into_view_if_needed()
        q.locator('.cm-opt').nth(1).click()
        fb = q.locator('.cm-fb').inner_text()
        assert len(fb) > 10 and q.locator('.cm-opt.no').count() == 1
        col = pg.evaluate("getComputedStyle(document.querySelector('.cm-opt.no')).borderColor+getComputedStyle(document.querySelector('.cm-fb')).color")
        assert 'rgb(252, 71, 60)' not in col, 'accent colour is for primary buttons/errors only'
        q.locator('.cm-opt').nth(0).click()
        assert q.locator('.cm-opt.ok').count() == 1 and 'cm-fb' in (q.locator('.cm-fb').get_attribute('class') or '')
        pg.locator('.cm-q').nth(1).locator('.cm-opt').nth(0).click()
        assert pg.evaluate("COMM.store().quiz.a1")
        # try-it controls change a demo
        pg.evaluate("document.querySelector('.cm-demo .cm-dc button, .cm-demo .cm-dc input')&&0")
        assert pg.locator('.cm-demo').first.locator('.cm-dc button,.cm-dc input').count() >= 1
        assert not errs, errs[:3]
        return 'article ok words=' + ','.join(str(v) for v in words.values())
    finally:
        b.close()


def c_pause(p):
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        pg.wait_for_function("COMM.anim.visible()>0")
        a = pg.evaluate("COMM.anim.ticks()")
        pg.wait_for_timeout(500)
        assert pg.evaluate("COMM.anim.ticks()") > a + 3, 'covers must animate on screen'
        # leave the section: the loop stops
        pg.click('[data-tab=home]')
        pg.wait_for_function("S.tab==='home'")
        pg.wait_for_timeout(300)
        a = pg.evaluate("COMM.anim.ticks()")
        pg.wait_for_timeout(500)
        assert pg.evaluate("COMM.anim.ticks()") <= a + 1, 'hidden section must not tick'
        # article: demo on screen ticks, off screen it stops
        goto(pg)
        pg.evaluate("COMM.open('a1')")
        pg.wait_for_function("document.querySelector('.cm-demo')")
        pg.evaluate("document.querySelector('.cm-demo').scrollIntoView({block:'center'})")
        pg.wait_for_function("COMM.anim.visible()>0")
        a = pg.evaluate("COMM.anim.ticks()")
        pg.wait_for_timeout(500)
        assert pg.evaluate("COMM.anim.ticks()") > a + 3
        pg.evaluate("window.scrollTo(0,1e7);document.getElementById('view-comm').scrollTop=1e7")
        pg.wait_for_function("COMM.anim.visible()===0", timeout=5000)
        pg.wait_for_timeout(300)
        a = pg.evaluate("COMM.anim.ticks()")
        pg.wait_for_timeout(500)
        assert pg.evaluate("COMM.anim.ticks()") <= a + 1, 'off-screen demos must be paused'
        assert not errs, errs[:3]
        return 'pause ok'
    finally:
        b.close()


def c_reduced(p):
    b, c, pg, errs = mk(p, reduced=True)
    try:
        goto(pg)
        pg.wait_for_timeout(300)
        a = pg.evaluate("COMM.anim.ticks()")
        pg.wait_for_timeout(500)
        assert pg.evaluate("COMM.anim.ticks()") <= a + 2, 'prefers-reduced-motion: static covers'
        assert not errs, errs[:3]
        return 'reduced ok'
    finally:
        b.close()


CTAS = {
    'lines': "S.tab==='edit'&&S.fontId==='kvadra'&&S.guides===true",
    'draw': "S.tab==='draw'",
    'weight': "S.tab==='edit'&&S.fontId==='kvadra'&&!!document.getElementById('p_stem')&&document.getElementById('p_stem').offsetParent!==null",
    'tester': "S.tab==='edit'&&document.getElementById('tt-on')&&document.getElementById('tt-on').classList.contains('on')",
    'kern-ta': "S.tab==='kern'&&KK.a==='Т'&&KK.b==='А'",
    'autokern': "S.tab==='draw'",
    'kortes': "S.tab==='edit'&&S.fontId==='kortes'&&S.text==='ROMA ОЯ'",
    'ot': "S.tab==='edit'&&S.fontId==='kortes'&&document.getElementById('ex-menu').getAttribute('aria-expanded')==='true'",
    'tyaga-block': "S.fontId==='tyaga'&&document.querySelector('#tyb-view [data-m=blk]').classList.contains('on')",
    'vf': "S.fontId==='kvadra'&&document.getElementById('ex-menu').getAttribute('aria-expanded')==='true'",
    'import': "document.body.classList.contains('imp-open')&&!document.getElementById('view-imp').hidden",
}


def c_cta(p):
    seen = set()
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        acts = pg.evaluate("COMM.data.arts.flatMap(a=>a.cta.map(c=>[a.id,c.act]))")
        assert len(acts) == 12
        for aid, act in acts:
            if act in seen:
                continue
            seen.add(act)
            if not pg.evaluate("S.tab==='community'"):
                pg.click('[data-tab=home]') if not pg.is_visible('[data-tab=community]') else None
            pg.evaluate(f"COMM.open('{aid}')")
            pg.wait_for_function(f"S.tab==='community'&&document.querySelector('.cm-art[data-art={aid}]')")
            btn = pg.locator(f'.cm-cta [data-cta={act}]')
            btn.scroll_into_view_if_needed()
            btn.click()
            try:
                pg.wait_for_function(CTAS[act], timeout=8000)
            except Exception:
                raise AssertionError('CTA ' + act + ' state: ' + str(pg.evaluate("[S.tab,S.fontId,S.guides,S.text,document.getElementById('ex-menu').getAttribute('aria-expanded'),(document.querySelector('#tyb-view [data-m=blk]')||{}).className,(document.getElementById('tt-on')||{}).className]")))
            # coming back through the rail shows the list (article was closed by the CTA), Back stays in the app
            pg.evaluate("setTab('home')")
            pg.wait_for_function("S.tab==='home'")
            pg.click('[data-tab=community]')
            pg.wait_for_function("S.tab==='community'&&document.querySelector('.cm-grid')", timeout=5000)
        assert seen == set(CTAS) - set(), seen
        assert not errs, errs[:3]
        return f'{len(seen)} CTAs ok'
    finally:
        b.close()


def c_fav(p):
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        pg.locator('.cm-card [data-act=fav]').nth(2).click()
        pg.click('[data-tab=fav]')
        pg.wait_for_function("S.tab==='fav'&&!document.getElementById('fav-art').hidden", timeout=5000)
        assert pg.inner_text('#fav-art-h') == 'Статьи'
        assert pg.locator('#fav-artlist .cmf-card').count() == 1
        geo(pg, 'fav')
        pg.click('#fav-artlist [data-fa=open]')
        pg.wait_for_function("S.tab==='community'&&COMM.state().a==='a3'&&document.querySelector('.cm-art')", timeout=5000)
        pg.click('[data-tab=fav]')
        pg.wait_for_function("S.tab==='fav'")
        pg.click('#fav-artlist [data-fa=fav]')
        pg.wait_for_function("document.getElementById('fav-art').hidden")
        assert pg.evaluate("Object.keys(COMM.store().fav).length")==0
        assert not errs, errs[:3]
        return 'fav ok'
    finally:
        b.close()


def c_chall(p):
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        pg.wait_for_function("document.querySelector('.cm-ban')")
        txt = pg.inner_text('.cm-ban')
        assert re.search(r'Идёт · осталось 21 день', txt), txt
        heads = pg.locator('.cm-sec h2').all_inner_texts()
        assert 'Уроки' in heads and 'Скоро' in heads and 'Завершённые' in heads, heads
        assert pg.locator('.cm-chc .cm-cv canvas').count() >= 3
        assert 'Пример от G-type' not in txt and 'До конца' not in txt and pg.locator('.cm-cd,[role=timer],#cm-cd').count() == 0, 'no example tag, no countdown'
        st = pg.evaluate("['coffee','card','sign','hero'].map(i=>COMM.status(COMM.data.chs.find(c=>c.id===i)).k).join()")
        assert st == 'run,soon,done,done', st
        geo(pg, 'ch list')
        pg.click('.cm-ban [data-act=och]')
        pg.wait_for_function("document.querySelector('.cm-hero')")
        h2 = pg.locator('.cm-ch h2').all_inner_texts()
        for need in ['Правила', 'Сроки', 'Рекомендации', 'Как поможет G-type', 'Мой прогресс', 'Мои работы', 'Вопросы и ответы']:
            assert need in h2, (need, h2)
        assert 'Пример от G-type' not in pg.inner_text('.cm-hero') and 'До конца' not in pg.inner_text('.cm-hero')
        assert pg.locator('.cm-ol li').count() >= 5 and pg.locator('.cm-tl li.now .cm-today').count() == 1
        assert pg.locator('.cm-faq .pane').count() >= 3 and pg.locator('.cm-cd,[role=timer],#cm-cd').count() == 0
        geo(pg, 'ch page')
        # done challenge shows «Итоги» placeholder, no winners
        pg.evaluate("COMM.openCh('sign')")
        pg.wait_for_function("document.querySelector('.cm-res')")
        assert 'не опубликованы' in pg.inner_text('.cm-res')
        pg.evaluate("COMM.openCh('coffee')")
        pg.wait_for_function("document.querySelector('.cm-hero')&&COMM.state().c==='coffee'")
        # progress: auto ticks from real actions, manual boxes tick
        n0 = pg.evaluate("document.querySelectorAll('#cm-prog li.done').length")
        assert n0 == 0, n0
        pg.click('.cm-fonts [data-act=cfont]')
        pg.wait_for_function("document.querySelectorAll('#cm-prog li.done').length===1||S.tab==='edit'")
        pg.evaluate("COMM.openCh('coffee')")
        pg.wait_for_function("document.querySelector('.cm-hero')&&COMM.state().c==='coffee'&&document.querySelector('#cm-prog li.done')")
        pg.click('[data-act=preset]')
        pg.evaluate("COMM.openCh('coffee')")
        pg.wait_for_function("document.querySelectorAll('#cm-prog li.done').length>=2")
        pg.evaluate("document.dispatchEvent(new CustomEvent('gtype:poster',{detail:{ch:'coffee',fmt:'4:5',theme:'accent',mode:'phrase',font:'rotunda',name:'Ротунда',canvas:(()=>{const c=document.createElement('canvas');c.width=400;c.height=500;c.getContext('2d').fillRect(0,0,400,500);return c})()}}))")
        pg.evaluate("COMM.openCh('coffee')")
        pg.wait_for_function("document.querySelectorAll('#cm-prog li.done').length===3&&document.querySelectorAll('#cm-works .cm-work').length===1")
        pg.locator('#cm-prog input[data-au="0"]').first.check()
        assert pg.evaluate("document.querySelectorAll('#cm-prog li.done').length")==4
        for i in range(5):
            pg.locator('.cm-chk input[data-ci]').nth(i).check()
        pg.wait_for_function("document.querySelectorAll('#cm-prog li.done').length===5")
        reload(pg)
        pg.wait_for_function("S.tab==='community'&&document.querySelector('#cm-prog')", timeout=15000)
        assert pg.evaluate("document.querySelectorAll('#cm-prog li.done').length")==5
        # poster template opens the real share dialog prepared (4:5 / accent / phrase)
        pg.click('[data-act=poster]')
        pg.wait_for_function("document.getElementById('pst')&&!document.getElementById('pst').hidden", timeout=8000)
        assert pg.evaluate("SHARE&&true")
        pg.keyboard.press('Escape')
        # .ics
        with pg.expect_download() as d:
            pg.click('[data-act=ics]')
        path = os.path.join(LOGS, 'comm.ics')
        d.value.save_as(path)
        s = open(path, 'rb').read().decode('utf-8')
        assert s.startswith('BEGIN:VCALENDAR\r\n') and 'DTSTART;VALUE=DATE:20261102' in s and 'DTEND;VALUE=DATE:20261201' in s and s.endswith('END:VCALENDAR\r\n')
        assert all(len(l.encode()) <= 75 for l in s.split('\r\n'))
        assert not errs, errs[:3]
        return 'challenges ok'
    finally:
        b.close()


def c_covers(p):
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        ids = pg.evaluate("COMM.covers()")
        assert len(ids) == 6, ids
        n = 0
        for (w, h) in [(300, 150), (358, 179), (416, 208), (578, 289)]:
            for cid in ids:
                D = pg.evaluate(f"COMM.cover('{cid}').D")
                po = pg.evaluate(f"COMM.cover('{cid}').poster")
                ts = [D * i / 48 for i in range(49)] + [po]
                for tt in ts:
                    r = pg.evaluate(f"COMM.coverCheck('{cid}',{w},{h},{tt})")
                    assert r['err'] is None, (cid, w, tt, r['err'])
                    assert r['tiny'] == 0, f'cover {cid} {w}x{h} t={tt:.2f}: {r["tiny"]} isolated blobs < 6 px2'
                    assert r['both'] <= 0.10 * max(1, r['bandPx']), f'cover {cid} {w}x{h} t={tt:.2f}: highlight overlaps glyph ink ({r["both"]}/{r["bandPx"]})'
                    assert r['edge'] == 0, f'cover {cid} {w}x{h} t={tt:.2f}: {r["edge"]} px leave the 4 px safe margin'
                    bx = r['boxes']
                    for q in bx:
                        assert q['fs'] >= 11
                        assert q['x0'] >= 4 and q['y0'] >= 4 and q['x1'] <= w - 4 and q['y1'] <= h - 4, (cid, w, tt, q)
                    for i in range(len(bx)):
                        for j in range(i + 1, len(bx)):
                            a, b2 = bx[i], bx[j]
                            assert a['x1'] <= b2['x0'] or b2['x1'] <= a['x0'] or a['y1'] <= b2['y0'] or b2['y1'] <= a['y0'], ('labels overlap', cid, w, tt, a['t'], b2['t'])
                    n += 1
        # group centring at the poster frame: ink bbox centre within 12 % of the cover centre (L5 'vf': word + panel is the group, exempt)
        BB = '''([w,h])=>{const TP={bg:'#ffffff',ink:'#000000',mut:'#707070',line:'#909090',surf:'#f2f2f2',oni:'#ffffff'};const out={};for(const id of COMM.covers()){const cv=document.createElement('canvas');cv.width=w*2;cv.height=h*2;const c=cv.getContext('2d');c.scale(2,2);const C=COMM.cover(id);C.draw(c,w,h,C.poster,{},TP);const d=c.getImageData(0,0,w*2,h*2).data;let x0=1e9,x1=-1;for(let y=0;y<h*2;y++)for(let x=0;x<w*2;x++){const k=(y*w*2+x)*4;if(d[k]<250||d[k+1]<250||d[k+2]<250){if(x<x0)x0=x;if(x>x1)x1=x}}out[id]=((x0+x1)/2)/(w*2)}return out}'''
        for sz in [[300, 150], [416, 208], [578, 289]]:
            cc = pg.evaluate(BB, sz)
            for cid, cx in cc.items():
                if cid != 'vf':
                    assert abs(cx - .5) <= .12, ('cover group not centred', cid, sz, round(cx, 3))
        # label pills at the poster frame are opaque and readable in both themes (text on pill >= 4.5:1)
        for th in ['light', 'dark']:
            pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", th)
            cr = pg.evaluate('''(()=>{const cs=getComputedStyle(document.documentElement),tok=n=>{const e=document.createElement('i');e.style.color='var('+n+')';document.body.appendChild(e);const v=getComputedStyle(e).color;e.remove();return v.match(/[0-9.]+/g).map(Number)},L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])},a=L(tok('--text')),b=L(tok('--surface'));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)})()''')
            assert cr >= 4.5, (th, 'pill contrast', cr)
        pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", 'light')
        # the first painted frame of every cover is its poster frame (so a cover never rests on a half-faded label)
        for i in range(6):
            pg.evaluate(f"document.querySelectorAll('.cm-card canvas')[{i}].scrollIntoView({{block:'center'}})")
            pg.wait_for_timeout(250)
        fr = pg.evaluate("COMM.anim.insts().filter(i=>i.id).map(i=>[i.id,i.first,i.cv.isConnected&&COMM.cover(i.id).poster])")
        assert len(fr) == 6 and all(a == b for _, a, b in fr), fr
        # covers are neutral: the frame takes the panel token, never the accent
        col = pg.evaluate("getComputedStyle(document.querySelector('.cm-card .cm-cv')).backgroundColor")
        pan = pg.evaluate("(()=>{const e=document.createElement('i');e.style.background='var(--panel)';document.body.appendChild(e);const v=getComputedStyle(e).backgroundColor;e.remove();return v})()")
        assert col == pan and col != 'rgb(252, 71, 60)', (col, pan)
        assert not pg.evaluate("[...document.querySelectorAll('#view-comm *')].some(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgb(252, 71, 60)'&&!e.closest('.btn')})"), 'accent used outside primary buttons'
        # no blank frames: every 50 ms over one whole loop of each cover (the cover's own clock stepped deterministically via COMM.render(i, t)), ink = pixels that differ from the frame background; min >= 30 % of the median
        STEP = """(k)=>{const cv=document.querySelectorAll('.cm-card canvas')[k],i=cv._cm,out=[];for(let t=0;t<i.D;t+=0.05){COMM.render(i,t);const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let q=0;q<d.length;q+=16)if(Math.abs(d[q]-d[0])+Math.abs(d[q+1]-d[1])+Math.abs(d[q+2]-d[2])>60)n++;out.push(n)}return out}"""
        rat = []
        for th in ('light', 'dark'):
            pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", th)
            pg.wait_for_timeout(300)
            for k in range(6):
                pg.evaluate(f"document.querySelectorAll('.cm-card canvas')[{k}].scrollIntoView({{block:'center'}})")
                pg.wait_for_timeout(500)
                o = pg.evaluate(STEP, k)
                med = sorted(o)[len(o) // 2]
                r = min(o) / max(med, 1)
                rat.append(f'{th[0]}{k}:{r:.2f}')
                assert med > 200 and r >= .3, (th, k, 'blank frames in the loop', min(o), med, [round(i * .05, 2) for i, v in enumerate(o) if v < .3 * med][:10])
        assert not errs, errs[:3]
        return f'{n} cover frames contained (4 sizes, whole loop + poster); no blank frames, min/median ink ' + ' '.join(rat)
    finally:
        b.close()


IMG = ("data:image/svg+xml;utf8," + "%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23d9d9de'/%3E%3Crect x='100' y='100' width='600' height='600' fill='%23222'/%3E%3C/svg%3E")


def c_ratio(p):
    """Every cover frame is 2:1 at any width; the canvas backing store is 2:1 too (no stretch); an entry with `cover` renders an <img> in the same frame."""
    b, c, pg, errs = mk(p)
    try:
        goto(pg)
        n = 0
        for w in [390, 768, 1024, 1440, 1920]:
            pg.set_viewport_size({'width': w, 'height': 900})
            pg.wait_for_timeout(300)
            scroll_all(pg)
            pg.wait_for_timeout(300)
            r = pg.evaluate("""[...document.querySelectorAll('#view-comm .cm-cv')].map(e=>{const q=e.getBoundingClientRect(),cv=e.querySelector('canvas'),cq=cv&&cv.getBoundingClientRect();return {w:q.width,h:q.height,cw:cq&&cq.width,ch:cq&&cq.height,bw:cv&&cv.width,bh:cv&&cv.height}})""")
            assert len(r) >= 6 + 3, (w, len(r))  # 6 lessons + the challenge cards
            for q in r:
                assert abs(q['w'] / q['h'] - 2) <= .01, (w, 'frame', q)
                assert abs(q['cw'] / q['ch'] - 2) <= .01, (w, 'canvas box', q)
                assert q['bw'] > 100 and abs(q['bw'] / q['bh'] - 2) <= .01, (w, 'backing store', q)
                n += 1
            pv = pg.evaluate("""[...document.querySelectorAll('#view-comm .cm-pv')].map(e=>{const q=e.getBoundingClientRect(),cv=e.querySelector('canvas');return {w:q.width,h:q.height,bw:cv.width,bh:cv.height}})""")
            for q in pv:
                assert abs(q['w'] / q['h'] - .8) <= .01 and abs(q['bw'] / q['bh'] - .8) <= .01, (w, 'poster 4:5', q)
        # user cover images: lesson and challenge entries with `cover` render <img> in the same frame (non-2:1 source, object-fit cover)
        pg.set_viewport_size({'width': 1024, 'height': 900})
        pg.evaluate("""(u)=>{const d=COMM.data;d.arts[0].cover=u;d.arts[0].coverAlt='Тестовая обложка';d.chs.find(c=>c.id==='card').cover=u;COMM.refresh();}""", IMG)
        pg.wait_for_function("document.querySelectorAll('#view-comm .cm-cv img').length===2")
        pg.wait_for_function("[...document.querySelectorAll('#view-comm .cm-cv img')].every(i=>i.complete&&i.naturalWidth>0)")
        im = pg.evaluate("""[...document.querySelectorAll('#view-comm .cm-cv')].filter(e=>e.querySelector('img')).map(e=>{const i=e.querySelector('img'),q=e.getBoundingClientRect(),iq=i.getBoundingClientRect();return {w:q.width,h:q.height,iw:iq.width,ih:iq.height,fit:getComputedStyle(i).objectFit,alt:i.alt,cv:!!e.querySelector('canvas')}})""")
        assert len(im) == 2, im
        for q in im:
            assert q['fit'] == 'cover' and q['alt'] and not q['cv'], q
            assert abs(q['w'] / q['h'] - 2) <= .01 and abs(q['iw'] / q['ih'] - 2) <= .01, q
        assert im[0]['alt'] == 'Тестовая обложка' or im[1]['alt'] == 'Тестовая обложка', im
        pg.screenshot(path=os.environ.get('COMM_IMG_SHOT', '/dev/null'), full_page=False) if os.environ.get('COMM_IMG_SHOT') else None
        assert not errs, errs[:3]
        return f'{n} cover frames 2:1 at 5 widths, backing store 2:1, img cover ok'
    finally:
        b.close()


def c_geo(p):
    n = 0
    for (w, h) in [(390, 844), (1440, 900)]:
        for th in ['light', 'dark']:
            b, c, pg, errs = mk(p, w, h, th)
            try:
                goto(pg)
                scroll_all(pg)
                geo(pg, f'{w} {th} list')
                for aid in ['a1', 'a3', 'a5']:
                    pg.evaluate(f"COMM.open('{aid}')")
                    pg.wait_for_function(f"document.querySelector('.cm-art[data-art={aid}]')")
                    geo(pg, f'{w} {th} {aid}')
                for cid in ['coffee', 'card', 'sign']:
                    pg.evaluate(f"COMM.openCh('{cid}')")
                    pg.wait_for_function(f"document.querySelector('.cm-hero')&&COMM.state().c==='{cid}'")
                    pg.evaluate("[...document.querySelectorAll('.cm-faq .pane')].forEach(pn=>{const h=pn.querySelector('.phead,button,summary');h&&h.click()})")
                    pg.wait_for_timeout(250)
                    geo(pg, f'{w} {th} ch {cid}')
                assert not errs, errs[:3]
                n += 1
            finally:
                b.close()
    return f'{n} viewport/theme combos clean'


BOX = "(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height}}"
INK = """(cv)=>{const c=cv.getContext('2d');if(cv.width<2)return -1;const d=c.getImageData(0,0,cv.width,cv.height).data,q=[d[0],d[1],d[2],d[3]];let n=0;for(let k=0;k<d.length;k+=8){if(Math.abs(d[k]-q[0])+Math.abs(d[k+1]-q[1])+Math.abs(d[k+2]-q[2])+Math.abs(d[k+3]-q[3])>24)n++}return n}"""


def c_layout(p):
    """W90: community container = library container (edges, +-1 px, both themes, 1280/1650/1920), the heading row and heading->content gap equal the library's, compact lesson cards,
    every cover paints when scrolled into view, the banner height follows its text block, article / challenge page edges = library edges, text >= 11 px."""
    n = 0
    for th in ['light', 'dark']:
        for w in [1280, 1440, 1650, 1920]:
            b, c, pg, errs = mk(p, w, 1000, th, reduced=True)
            try:
                pg.click('[data-tab=library]')
                pg.wait_for_function("document.querySelector('#libgrid .lcard')")
                pg.wait_for_timeout(600)
                lv = pg.evaluate(BOX, '#view-library .vhead')
                lg = pg.evaluate(BOX, '#libgrid')
                lt = pg.evaluate(BOX, '#lib-tags')
                lh2 = pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('#lib-count'));return [c.fontSize,c.fontWeight,c.letterSpacing]})()")
                lgap_head = lg['t'] - lv['b']
                lgap_sec = lv['t'] - lt['b']
                gcols = pg.evaluate("getComputedStyle(document.querySelector('#libgrid')).columnGap")
                goto(pg)
                pg.wait_for_timeout(600)
                cm = pg.evaluate(BOX, '.cm')
                assert abs(cm['l'] - lv['l']) <= 1 and abs(cm['r'] - lv['r']) <= 1, (th, w, 'container edges', cm, lv)
                ban = pg.evaluate(BOX, '.cm-ban')
                assert abs(ban['l'] - lv['l']) <= 1 and abs(ban['r'] - lv['r']) <= 1, (th, w, 'banner edges', ban, lv)
                vh = pg.evaluate(BOX, '#cm-les .vhead')
                gr = pg.evaluate(BOX, '#cm-grid')
                assert abs((gr['t'] - vh['b']) - lgap_head) <= 1, (th, w, 'heading->content gap', gr['t'] - vh['b'], lgap_head)
                assert abs((vh['t'] - ban['b']) - lgap_sec) <= 1, (th, w, 'section gap', vh['t'] - ban['b'], lgap_sec)
                assert abs(vh['h'] - lv['h']) <= 1, (th, w, 'heading row height', vh['h'], lv['h'])
                assert pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('#cm-lh'));return [c.fontSize,c.fontWeight,c.letterSpacing]})()") == lh2, 'heading type'
                assert pg.evaluate("getComputedStyle(document.querySelector('#cm-grid')).columnGap") == gcols, 'grid gap'
                # chips on the right of the heading, on the same row
                fb = pg.evaluate(BOX, '#cm-les .cm-bar-f')
                hh = pg.evaluate(BOX, '#cm-lh')
                assert fb['l'] > hh['r'] and abs((fb['t'] + fb['h'] / 2) - (hh['t'] + hh['h'] / 2)) <= 2 and abs(fb['r'] - lv['r']) <= 1, (th, w, 'filters not on the heading row', fb, hh)
                # the lesson grid and the library grid use the same column logic: as many columns as fit
                cols = pg.evaluate("new Set([...document.querySelectorAll('#cm-grid .cm-card')].map(e=>Math.round(e.getBoundingClientRect().left))).size")
                exp = max(1, int((lg['w'] + 14) // (300 + 14)))
                assert cols == min(6, exp), (th, w, 'columns', cols, exp)
                # challenge sections: same heading row and gap
                for hsel in pg.evaluate("[...document.querySelectorAll('#cm-main>.cm-sec>h2')].map((e,i)=>i)"):
                    hb = pg.evaluate(f"(()=>{{const h=document.querySelectorAll('#cm-main>.cm-sec>h2')[{hsel}],g=h.nextElementSibling,a=h.getBoundingClientRect(),z=g.getBoundingClientRect();return [a.height,z.top-a.bottom]}})()")
                    assert abs(hb[0] - lv['h']) <= 1 and abs(hb[1] - lgap_head) <= 1, (th, w, 'challenge heading', hb)
                # plain flex cards, equal height per row: description -> footer <= 24 px (+ the height a taller neighbour adds), no blank band between tags/title/description, footer never wraps, tag row one line from 360 px
                cd = pg.evaluate("""[...document.querySelectorAll('#cm-grid .cm-card')].map(c=>{const l=c.querySelector('.cm-lead'),rg=document.createRange();rg.selectNodeContents(l);const q=l.scrollHeight>l.clientHeight+1?l.getBoundingClientRect():rg.getBoundingClientRect(),a=c.querySelector('.cm-act'),cr=c.getBoundingClientRect(),h3=c.querySelector('h3').getBoundingClientRect(),ch=c.querySelector('.cm-chips').getBoundingClientRect(),lr=l.getBoundingClientRect(),
                    bt=[...a.children].map(e=>{const r=e.getBoundingClientRect();return Math.round(r.top+r.height/2)}),ct=[...c.querySelectorAll('.cm-chips>*')].map(e=>Math.round(e.getBoundingClientRect().top));
                    return {gap:a.getBoundingClientRect().top-q.bottom,b1:h3.top-ch.bottom,b2:lr.top-h3.bottom,btn:bt,chips:ct,w:cr.width,h:cr.height,top:Math.round(cr.top),tt:c.querySelector('h3').title,lt:c.querySelector('.cm-lead').title,lvl:c.innerText.includes('Для новичков')}})""")
                rows = {}
                for x in cd:
                    rows.setdefault(x['top'], []).append(x)
                for x in cd:
                    mg = min(y['gap'] for y in rows[x['top']])
                    assert mg <= 24 and x['gap'] - mg <= 48, (th, w, 'dead gap above the footer (tightest card in the row, extra from a taller neighbour <= 2 lines)', x['gap'], mg)
                    assert x['b1'] <= 14 and x['b2'] <= 14, (th, w, 'blank band between tags/title/description', x['b1'], x['b2'])
                    assert max(x['btn']) - min(x['btn']) <= 2, (th, w, 'footer wraps', x)
                    assert x['w'] < 360 or max(x['chips']) - min(x['chips']) <= 2, (th, w, 'tag row wraps', x)
                    assert x['tt'] and x['lt'] and not x['lvl'], 'title attributes, level said once in the section'
                assert all(max(y['h'] for y in v) - min(y['h'] for y in v) <= 1 for v in rows.values()), (th, w, 'cards in a row differ in height')
                assert 'Для новичков' in pg.inner_text('#cm-les .vhead'), 'level note next to the heading'
                # banner follows its text block (content height; padding excluded is checked too)
                # banner: 2 columns (text | 2:1 cover), no 4:5 poster, title at the left padding, cover at the right padding, no empty middle
                assert pg.locator('.cm-ban .cm-pv').count() == 0 and pg.locator('.cm-ban .cm-cv').count() == 1 and pg.locator('.cm-ban .cm-tag').count() == 0
                bn = pg.evaluate("""(()=>{const b=document.querySelector('.cm-ban'),cs=getComputedStyle(b),r=b.getBoundingClientRect(),cv=document.querySelector('.cm-ban .cm-cv').getBoundingClientRect(),tx=document.querySelector('.cm-bx').getBoundingClientRect(),h3=document.querySelector('.cm-ban h3'),rg=document.createRange();rg.selectNodeContents(h3);const tr=rg.getBoundingClientRect(),g=parseFloat(cs.columnGap);
                    return {l:r.left+parseFloat(cs.paddingLeft)+1,r:r.right-parseFloat(cs.paddingRight)-1,tl:h3.getBoundingClientRect().left,cr:cv.right,cl:cv.left,cw:cv.width,ch:cv.height,tr:tr.right,g,vt:tx.top+tx.height/2,vc:cv.top+cv.height/2,cols:cs.gridTemplateColumns.split(' ').length}})()""")
                assert abs(bn['tl'] - bn['l']) <= 1 and abs(bn['cr'] - bn['r']) <= 1, (th, w, 'banner edges', bn)
                assert abs(bn['cw'] / bn['ch'] - 2) <= .01, (th, w, 'banner cover not 2:1', bn)
                assert bn['cols'] == 2 and abs(bn['vt'] - bn['vc']) <= 3, (th, w, 'banner columns / vertical centring', bn)
                assert bn['cl'] - bn['tr'] <= 2 * bn['g'] + 8, (th, w, 'empty middle in the banner', bn['cl'] - bn['tr'], bn['g'])
                # every cover paints once scrolled into view
                cnt = pg.evaluate("document.querySelectorAll('#cm-main canvas').length")
                for i in range(cnt):
                    pg.evaluate(f"document.querySelectorAll('#cm-main canvas')[{i}].scrollIntoView({{block:'center'}})")
                    pg.wait_for_timeout(260)
                    ink = pg.evaluate(f"({INK})(document.querySelectorAll('#cm-main canvas')[{i}])")
                    assert ink > 20, (th, w, 'blank cover', i, ink)
                # text >= 11 px, accent only on buttons
                small = pg.evaluate("[...document.querySelectorAll('#view-comm *')].filter(e=>[...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())&&e.getBoundingClientRect().width>0&&!e.closest('canvas,.vh,.cm-pop')&&parseFloat(getComputedStyle(e).fontSize)<11).map(e=>e.className)")
                assert not small, (th, w, 'text < 11px', small[:4])
                geo(pg, f'{th} {w} landing')
                if w == 1650:
                    for what, js, sel in [('article', "COMM.open('a1')", '.cm-prog'), ('challenge', "COMM.openCh('coffee')", '.cm-hero')]:
                        pg.evaluate(js)
                        pg.wait_for_function("document.querySelector('.cm-art,.cm-hero')")
                        pg.wait_for_timeout(500)
                        bx = pg.evaluate(BOX, sel)
                        assert abs(bx['l'] - lv['l']) <= 1 and abs(bx['r'] - lv['r']) <= 1, (th, what, 'edges', bx, lv)
                        if what == 'article':
                            col = pg.evaluate(BOX, '.cm-col')
                            assert col['w'] <= 700 and abs((col['l'] + col['r']) / 2 - (lv['l'] + lv['r']) / 2) <= 1, ('reading column', col)
                        geo(pg, f'{th} {what}')
                assert not errs, errs[:3]
                n += 1
            finally:
                b.close()
    return f'{n} theme/width combos: container = library, heading gap, compact cards, covers paint, banner height'


def c_pop(p):
    """W90 pass 3: «В избранное» = the library .heart (class, size, icon, states), «Читать» = primary button, no countdown / example tag, popover «Как участвовать» (open, Esc, outside, second click, focus, inside viewport and banner, no layout push) at 390 and 1440."""
    n = 0
    for (w, h, red) in [(1440, 900, False), (390, 844, False), (1440, 900, True)]:
        b, c, pg, errs = mk(p, w, h, 'light', reduced=red)
        try:
            pg.click('[data-tab=library]')
            pg.wait_for_function("document.querySelector('#libgrid .lcard .heart')")
            pg.wait_for_timeout(500)
            HV = "(e)=>{const c=getComputedStyle(e),i=getComputedStyle(e.querySelector('.ico')),r=e.getBoundingClientRect();return {cls:e.className,w:r.width,h:r.height,mask:(i.webkitMaskImage||i.maskImage||''),col:c.color,rad:c.borderRadius,ico:i.width}}"
            ref = pg.evaluate(f"({HV})(document.querySelector('#libgrid .lcard .heart'))")
            goto(pg)
            pg.wait_for_timeout(500)
            hr = pg.evaluate(f"({HV})(document.querySelector('#cm-grid .cm-card [data-act=fav]'))")
            assert hr['cls'] == 'heart' and ref['cls'] == 'heart', (ref, hr)
            assert abs(hr['w'] - ref['w']) <= 1 and abs(hr['h'] - ref['h']) <= 1 and hr['mask'] == ref['mask'] and hr['rad'] == ref['rad'] and hr['ico'] == ref['ico'] and hr['col'] == ref['col'], {k: (ref[k], hr[k]) for k in ref if k != 'mask' and ref[k] != hr[k]}
            # same position: bottom-right corner of the card, 10 px
            pos = pg.evaluate("(()=>{const c=document.querySelector('#cm-grid .cm-card').getBoundingClientRect(),e=document.querySelector('#cm-grid .cm-card .heart').getBoundingClientRect();return [c.right-e.right,c.bottom-e.bottom]})()")
            assert all(abs(v - 10) <= 1 for v in pos), pos
            pg.click('#cm-grid .cm-card [data-act=fav]')
            pg.wait_for_timeout(350)
            st = pg.evaluate(f"({HV})(document.querySelector('#cm-grid .cm-card .heart'))")
            assert pg.get_attribute('#cm-grid .cm-card [data-act=fav]', 'aria-pressed') == 'true' and st['mask'] != hr['mask'] and st['col'] == 'rgb(252, 71, 60)', (st['col'], st['mask'] == hr['mask'])
            assert pg.get_attribute('#cm-grid .cm-card [data-act=fav]', 'aria-label').startswith('Убрать из избранного')
            pg.click('#cm-grid .cm-card [data-act=fav]')
            assert pg.get_attribute('#cm-grid .cm-card [data-act=fav]', 'aria-label').startswith('В избранное')
            # Читать is the primary (accent) button
            assert pg.evaluate("[...document.querySelectorAll('#cm-grid [data-act=open]')].every(b=>b.classList.contains('btn')&&b.classList.contains('pri')&&getComputedStyle(b).backgroundColor==='rgb(252, 71, 60)')")
            # no countdown, no example tag
            assert pg.locator('.cm-cd,[role=timer],#cm-cd,.cm-tag').count() == 0 and 'До конца' not in pg.inner_text('#cm-main')
            # popover
            btn = pg.locator('.cm-howb')
            assert btn.get_attribute('aria-expanded') == 'false' and btn.get_attribute('aria-controls') == 'cm-howp'
            before = pg.evaluate("[document.querySelector('.cm-ban').getBoundingClientRect().height,document.querySelector('#cm-les').getBoundingClientRect().top+window.scrollY+document.getElementById('view-comm').scrollTop]")
            if red:
                assert pg.evaluate("getComputedStyle(document.querySelector('#cm-howp')).transform") == 'none'
            geo_state = lambda: pg.evaluate("(()=>{const p=document.querySelector('#cm-howp'),r=p.getBoundingClientRect(),b=document.querySelector('.cm-ban').getBoundingClientRect(),cs=getComputedStyle(p),vw=document.documentElement.clientWidth,vh=innerHeight;return {on:p.classList.contains('on'),op:+cs.opacity,vis:cs.visibility,inV:r.left>=15&&r.right<=vw-15&&r.top>=0&&r.bottom<=vh,dn:(()=>{const t=document.querySelector('.cm-howb').getBoundingClientRect();return Math.abs(r.top-t.bottom-8)<=4&&Math.abs(r.left-t.left)<=4/* trigger is scaled .97 while open */})(),tb:(()=>{const t=document.querySelector('.cm-howb').getBoundingClientRect();return [t.left,t.bottom]})(),hit:['.cm-ban h3','.cm-bl'].some(q=>{const x=document.querySelector(q).getBoundingClientRect();return r.left<x.right&&r.right>x.left&&r.top<x.bottom&&r.bottom>x.top}),r:[r.left,r.top,r.right,r.bottom],f:document.activeElement.className}})()")
            btn.click(); pg.wait_for_timeout(400)
            s1 = geo_state()
            if w <= 1060:
                # stacked banner: inline disclosure (not floating), inside the card padding, pushes content down
                pg.wait_for_timeout(450)
                d = pg.evaluate("(()=>{const p=document.querySelector('#cm-howp'),c=p.querySelector('.cm-howc').getBoundingClientRect(),b=document.querySelector('.cm-ban'),B=b.getBoundingClientRect(),cs=getComputedStyle(b),x=document.querySelector('.cm-bx').getBoundingClientRect(),L=document.querySelector('#cm-les').getBoundingClientRect(),t=document.querySelector('.cm-howb').getBoundingClientRect();return {pos:getComputedStyle(p).position,on:p.classList.contains('on'),vis:getComputedStyle(p).visibility,c:[c.left,c.top,c.right,c.bottom],inL:c.left-B.left-parseFloat(cs.paddingLeft),inR:B.right-c.right-parseFloat(cs.paddingRight),inB:B.bottom-c.bottom-parseFloat(cs.paddingBottom),les:L.top-c.bottom,belowBtn:c.top-t.bottom,bw:[x.left,x.right,c.left,c.right]}})()")
                assert d['pos'] == 'static' and d['on'] and d['vis'] == 'visible', d
                assert abs(d['inL']) <= 1 and abs(d['inR']) <= 1 and d['inB'] >= -1, ('disclosure inset equals the card content edges, inside the card', d)
                assert d['les'] >= 8 and d['belowBtn'] >= 8, ('nothing overlaps «Уроки», disclosure under the button', d)
                grown = pg.evaluate("document.querySelector('.cm-ban').getBoundingClientRect().height")
                assert grown > before[0] + 100, ('disclosure expands the banner', before, grown)
                assert btn.get_attribute('aria-expanded') == 'true'
                assert not pg.evaluate("[...document.querySelectorAll('.cm-ban *')].some(e=>{const r=e.getBoundingClientRect(),B=document.querySelector('.cm-ban').getBoundingClientRect();return r.width&&(r.right>B.right+0.5||r.left<B.left-0.5||r.bottom>B.bottom+0.5)})"), 'nothing sticks out of the banner card'
            else:
                assert s1['on'] and s1['op'] > .95 and s1['vis'] == 'visible' and s1['inV'] and s1['dn'] and not s1['hit'], ('opens below the button at its left edge, inside viewport (16 px), not over title/lead', w, s1)
                assert btn.get_attribute('aria-expanded') == 'true'
                after = pg.evaluate("[document.querySelector('.cm-ban').getBoundingClientRect().height,document.querySelector('#cm-les').getBoundingClientRect().top+window.scrollY+document.getElementById('view-comm').scrollTop]")
                assert abs(after[0] - before[0]) <= 1 and abs(after[1] - before[1]) <= 1, ('popover pushed the layout', before, after)
            geo(pg, f'{w} popover open')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
            s2 = geo_state()
            assert not s2['on'] and s2['vis'] == 'hidden' and 'cm-howb' in s2['f'] and btn.get_attribute('aria-expanded') == 'false', (w, s2)
            btn.click(); pg.wait_for_timeout(300)
            if w > 1060:
                pg.mouse.click(5, h - 5); pg.wait_for_timeout(300)
                assert not geo_state()['on'], 'outside click closes'
                btn.click(); pg.wait_for_timeout(300)
            btn.click(); pg.wait_for_timeout(450)
            s3 = geo_state()
            assert not s3['on'] and 'cm-howb' in s3['f'], ('second click closes, focus on the button', s3)
            assert not errs, errs[:3]
            n += 1
        finally:
            b.close()
    return f'{n} runs: heart = library .heart, Читать primary, no countdown, popover open/Esc/outside/toggle/focus/viewport'


def c_space(p):
    """W90 pass 4: seg filter spans the grid edges at <= 720 with an equal-inset thumb, «Сегодня» chip legible and inset like the card padding, challenge page section cards share padding / heading gap / list spacing, hero poster not in an uneven panel."""
    LUM = "(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])}"
    n = 0
    for theme in ('light', 'dark'):
        for w, h in [(390, 844), (768, 1024), (1440, 900), (1920, 1080)]:
            b, c, pg, errs = mk(p, w, h, theme)
            try:
                goto(pg)
                pg.wait_for_timeout(500)
                if w <= 720:
                    e = pg.evaluate("(()=>{const f=document.querySelector('.cm-bar-f').getBoundingClientRect(),g=document.querySelector('#cm-grid').getBoundingClientRect(),h=document.querySelector('.cm-ban').getBoundingClientRect();return [f.left-g.left,f.right-g.right,f.left-h.left,f.right-h.right]})()")
                    assert all(abs(v) <= 1 for v in e), ('seg filter edges = grid / banner edges', e)
                th = pg.evaluate("(()=>{const f=document.querySelector('.cm-bar-f'),t=f.querySelector('button.on'),F=f.getBoundingClientRect(),T=t.getBoundingClientRect();return {L:T.left-F.left,R:F.right-T.right,T:T.top-F.top,B:F.bottom-T.bottom}})()")
                assert abs(th['T'] - th['B']) <= .5 and abs(th['L'] - th['T']) <= 1, ('seg thumb insets (first segment is on)', th)
                pg.evaluate("COMM.openCh('coffee')")
                pg.wait_for_function("document.querySelector('.cm-hero')&&COMM.state().c==='coffee'")
                pg.wait_for_timeout(500)
                ch = pg.evaluate(f"""(()=>{{const L={LUM};const li=document.querySelector('.cm-tl li.now'),c=li.querySelector('.cm-today'),r=li.getBoundingClientRect(),q=c.getBoundingClientRect(),cs=getComputedStyle(c),p=parseFloat(getComputedStyle(li).paddingBottom);
                  const P=x=>x.match(/[\\d.]+/g).map(Number),mix=(f,b)=>{{const a=f.length>3?f[3]:1;return 'rgb('+[0,1,2].map(i=>f[i]*a+b[i]*(1-a)).join(',')+')'}};const base=P(getComputedStyle(li).backgroundColor),a=L(cs.color),bg=L(mix(P(cs.backgroundColor),base.length>3&&base[3]<1?[255,255,255]:base));return {{ratio:(Math.max(a,bg)+.05)/(Math.min(a,bg)+.05),bottom:r.bottom-q.bottom,right:r.right-q.right,top:q.top-r.top,pad:p,pt:parseFloat(getComputedStyle(li).paddingTop)}}}})()""")
                assert ch['ratio'] >= 4.5 and ch['bottom'] >= ch['pad'] - 1 and abs(ch['right'] - ch['pad']) <= 1 and ch['top'] >= ch['pt'] - 1, ('«Сегодня» chip', ch)
                bx = pg.evaluate("""(()=>{const R=[...document.querySelectorAll('.cm-box')].map(x=>{const cs=getComputedStyle(x),h=x.querySelector(':scope>h2'),nx=h&&h.nextElementSibling,hr=h&&h.getBoundingClientRect(),nr=nx&&nx.getBoundingClientRect();return {t:h&&h.textContent,p:[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].join(),gap:nx?Math.round(nr.top-hr.bottom):null}});
                  const L=[...document.querySelectorAll('.cm-ol,.cm-ul,.cm-chk')].map(l=>{const k=[...l.children];return k.length>1&&k[1].getBoundingClientRect().top>=k[0].getBoundingClientRect().bottom-1?Math.round(k[1].getBoundingClientRect().top-k[0].getBoundingClientRect().bottom):null}).filter(v=>v!==null);return {R,L}})()""")
                assert len(bx['R']) >= 6 and len({r['p'] for r in bx['R']}) == 1, ('challenge section cards share padding', bx['R'])
                assert len({r['gap'] for r in bx['R'] if r['gap'] is not None}) <= 2 and max(r['gap'] for r in bx['R'] if r['gap'] is not None) - min(r['gap'] for r in bx['R'] if r['gap'] is not None) <= 4, ('heading to content gap', bx['R'])
                assert max(bx['L']) - min(bx['L']) <= 4, ('list item spacing', bx['L'])
                hp = pg.evaluate("(()=>{const h=getComputedStyle(document.querySelector('.cm-hp'));return [h.backgroundColor,h.paddingTop]})()")
                assert hp[0] == 'rgba(0, 0, 0, 0)' and hp[1] == '0px', ('hero poster is not inside an uneven panel', hp)
                geo(pg, f'{theme} {w} challenge')
                assert not errs, errs[:3]
                n += 1
            finally:
                b.close()
    return f'{n} theme/width combos: seg filter edges + thumb insets, today chip contrast/inset, challenge cards share padding and gaps'


def c_system(p):
    """W91 design review: systemic rules, both themes. Pills one height/type spec, radii from the token scale, nested radius = outer - padding (nearest token), hero buttons = banner buttons (lg), btn.sm / btn >= 40 px on phones,
    sibling cards share padding, tool cards align to the box left edge and leave no orphan row, empty «Мои работы» fills its card with the CTA inside, focus ring neutral 2 px, no !important in the section CSS."""
    n = 0
    JS = """(()=>{const cs=getComputedStyle(document.documentElement);const R=['--r-xs','--r-sm','--r-md','--r-lg','--r-xl'].map(k=>parseFloat(cs.getPropertyValue(k)));
      const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
      const pills=[...document.querySelectorAll('.cm-chip,.cm-st,.cm-kick,.cm-tag,.cm-today')].filter(vis).map(e=>{const c=getComputedStyle(e);return [e.className,Math.round(e.getBoundingClientRect().height*10)/10,c.fontSize,c.fontWeight]});
      const rad=new Set();document.querySelectorAll('#view-comm *,.cmf *').forEach(e=>{if(!vis(e))return;const b=getComputedStyle(e).borderTopLeftRadius;if(b!=='0px'&&b!=='50%'&&!/%/.test(b)){const v=parseFloat(b);if(v<500&&!R.includes(v))rad.add((e.className||e.tagName)+':'+b)}});
      const pad=sel=>[...new Set([...document.querySelectorAll(sel)].filter(vis).map(e=>getComputedStyle(e).padding))];
      const nested=[...document.querySelectorAll('.cm-demo,.cm-work')].filter(vis).map(o=>{const i=o.querySelector('.cm-dv,img');const oc=getComputedStyle(o),ic=getComputedStyle(i);return [o.className,parseFloat(oc.borderTopLeftRadius),parseFloat(oc.paddingTop),parseFloat(ic.borderTopLeftRadius)]});
      const bt=[...document.querySelectorAll('#view-comm .btn,.cmf .btn')].filter(vis).map(e=>[(e.className),Math.round(e.getBoundingClientRect().height*10)/10]);
      return {pills,rad:[...rad],pad,nested,bt,R}})()"""
    for theme in ('light', 'dark'):
        for w, h in [(390, 844), (1440, 900)]:
            b, c, pg, errs = mk(p, w, h, theme)
            try:
                goto(pg)
                pg.wait_for_timeout(400)
                pg.locator('.cm-card [data-act=fav]').nth(1).click()
                for stage in ('land', 'chall', 'art', 'fav'):
                    if stage == 'chall':
                        pg.evaluate("COMM.openCh('coffee')")
                        pg.wait_for_function("document.querySelector('.cm-hero')&&COMM.state().c==='coffee'")
                    elif stage == 'art':
                        pg.evaluate("COMM.open('a1')")
                        pg.wait_for_function("document.querySelector('.cm-art')&&COMM.state().a==='a1'")
                    elif stage == 'fav':
                        pg.click('[data-tab=fav]')
                        pg.wait_for_function("S.tab==='fav'&&!document.getElementById('fav-art').hidden")
                    pg.wait_for_timeout(500)
                    r = pg.evaluate(JS)
                    where = f'{theme} {w} {stage}'
                    for cls, hh, fs, fw in r['pills']:
                        assert abs(hh - 28) <= .5 and fs == '12px' and fw == '600', (where, 'pill spec 28px / 12px / 600', cls, hh, fs, fw)
                    assert not r['rad'], (where, 'radii must come from --r-* (8/12/16/22/28/pill/50%)', r['rad'])
                    for o, orad, opad, irad in r['nested']:
                        near = min(r['R'], key=lambda t: abs(t - max(orad - opad, 8)))
                        assert abs(irad - near) <= 4 and irad <= orad, (where, 'nested radius ~ outer - padding', o, orad, opad, irad)
                    if stage in ('land', 'chall', 'fav'):
                        assert len(r['pad'] if False else pg.evaluate("[...new Set([...document.querySelectorAll('.cm-card .cm-body,.cm-chc .cm-body,.cmf-card').values()].filter(e=>e.getBoundingClientRect().width>0).map(e=>getComputedStyle(e).padding))]")) <= 1, (where, 'sibling cards share padding')
                    if stage in ('land', 'fav'):
                        hc = pg.evaluate("[...document.querySelectorAll('.cm-card .heart,.cmf-card .heart')].filter(h=>h.getBoundingClientRect().width>0).map(h=>{const b=h.parentElement.querySelector('.btn'),x=h.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.round(((x.top+x.bottom)-(y.top+y.bottom))/2*10)/10})")
                        assert hc and all(abs(v) <= 1 for v in hc), (where, 'heart is centred on the Читать button row', hc)
                    if stage == 'art':
                        q = pg.evaluate("""(async()=>{const fs=document.querySelector('.cm-q');const o=[...fs.querySelectorAll('.cm-opt')];for(const x of o){x.click();if(fs.querySelector('.cm-opt.no'))break}
                          await new Promise(r=>setTimeout(r,400));const n=fs.querySelector('.cm-opt.no');if(!n)return null;const cs=getComputedStyle(n),pr=document.createElement('i');pr.style.color='var(--danger)';document.body.appendChild(pr);const dg=getComputedStyle(pr).color;pr.remove();
                          return {col:cs.color,dg,sh:cs.boxShadow,icon:getComputedStyle(n.querySelector('.dot'),'::after').content}})()""")
                        assert q and q['col'] == q['dg'] and q['dg'] in q['sh'] and q['icon'] != 'none', (where, 'wrong quiz answer = danger colour + icon', q)
                    if w <= 720:
                        small = [x for x in r['bt'] if x[1] < 40 and 'cm-wx' not in x[0] and 'ibtn' not in x[0]]
                        assert not small, (where, 'touch targets >= 40 px', small[:4])
                    if stage == 'chall':
                        g = pg.evaluate("""(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const hero=[...document.querySelectorAll('.cm-hero .cm-act .btn')].map(e=>Math.round(e.getBoundingClientRect().height));
                          const box=q('.cm-box'),tool=q('.cm-tool'),chk=q('.cm-tool-chk'),cont=q('.cm-tools');
                          const hb=document.querySelector('.cm-box h2').getBoundingClientRect().left,th=document.querySelector('.cm-tool h3').getBoundingClientRect().left;
                          const tp=getComputedStyle(document.querySelector('.cm-tool')).padding,bp=getComputedStyle(document.querySelector('.cm-box')).padding;
                          const rows={};document.querySelectorAll('.cm-tool').forEach(e=>{const r=e.getBoundingClientRect();(rows[Math.round(r.top)]=rows[Math.round(r.top)]||[]).push(Math.round(r.height))});
                          const em=document.querySelector('#cm-works .cm-empty'),eb=em&&em.closest('.cm-box'),er=em&&em.getBoundingClientRect(),br=eb&&eb.getBoundingClientRect();
                          return {hero,cw:chk.width,cont:cont.width,hb,th,tp,bp,rows,eb:em?[Math.round(br.bottom-er.bottom),getComputedStyle(eb).paddingBottom,em.querySelector('[data-act=prep]')?1:0]:null}})()""")
                        assert all(abs(x - (42 if w > 720 else 48)) <= 1 for x in g['hero']), (where, 'hero buttons are lg like the banner', g['hero'])
                        assert abs(g['cw'] - g['cont']) <= 1, (where, 'checklist card spans the grid (no orphan)')
                        assert g['tp'] == g['bp'] or w <= 720, (where, 'tool card padding = box padding', g['tp'], g['bp'])
                        assert w <= 720 or abs(g['hb'] - g['th']) <= 1, (where, 'tool and box headings share a left edge', g['hb'], g['th'])
                        assert all(max(v) - min(v) <= 1 for v in g['rows'].values()), (where, 'tool cards in a row share height', g['rows'])
                        assert g['eb'] and g['eb'][2] == 1 and abs(g['eb'][0] - float(g['eb'][1][:-2])) <= 1, (where, 'empty «Мои работы» fills its card, CTA inside', g['eb'])
                        pg.keyboard.press('Tab')
                        pg.evaluate("document.querySelector('.cm-faq .pane-h').focus()")
                        pf = pg.evaluate("(()=>{const e=document.activeElement;return [e.matches(':focus-visible'),getComputedStyle(e).outlineOffset]})()")
                        assert pf == [True, '-2px'], (where, 'FAQ pane header focus ring is inset (the pane clips an outer ring)', pf)
                        # focus ring: neutral 2 px outline, never accent
                        pg.evaluate("document.querySelector('.cm-hero [data-act=ics]').focus()")
                        pg.keyboard.press('Shift+Tab'); pg.keyboard.press('Tab')
                        pg.wait_for_timeout(300)
                        fr = pg.evaluate("(()=>{const c=getComputedStyle(document.activeElement);return [c.outlineWidth,c.outlineStyle,c.outlineColor]})()")
                        assert fr[0] == '2px' and fr[1] == 'solid' and '252, 71, 60' not in fr[2], (where, 'focus ring', fr)
                assert not errs, errs[:3]
                n += 1
            finally:
                b.close()
    css = open(os.path.join(os.path.dirname(__file__), '..', 'ui_comm.css')).read()
    assert '!important' not in css, 'no !important in ui_comm.css'
    return f'{n} theme/width combos: pills 28/12/600, radii on the token scale, nested radius, hero = lg buttons, touch >= 40, card padding, tools grid without orphan, empty works fills card, neutral focus ring'


def c_demos(p):
    """W91: every inline article demo (all 6 lessons) keeps ALL its ink (glyphs, guide lines, labels, lens frame) at least 2 px away from every canvas edge: every loop frame (poster + 12), every slider at min / mid / max,
    every chip / segment / switch state, at 390 and 1440 (and 360 / 768 for the narrow and mid layouts). No whitelist: guide lines stop 8 px short of the edges. The «Увеличение» slider of the overshoot demo
    must read exactly the magnification of the lens (label == value)."""
    JS = """async()=>{const M=2,out=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const edge=(i)=>{const cv=i.cv,d=Math.min(devicePixelRatio||1,2),c=cv.getContext('2d'),W=cv.width,H=cv.height,B=Math.ceil(M*d),a=c.getImageData(0,0,W,H).data;let n=0,first=null;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(a[(y*W+x)*4+3]<24)continue;if(x<B||x>=W-B||y<B||y>=H-B){n++;if(!first)first=[x/d,y/d]}}return n?[n,first]:null};
      for(const i of COMM.anim.insts().filter(i=>i.draw&&!i.cov)){const fig=i.cv.closest('figure'),id=fig.dataset.demo;fig.scrollIntoView({block:'center'});await wait(200);const D=i.D;i.D=0;
        const chk=(what)=>{const e=edge(i);if(e)out.push([id,what,e])};
        i.manual=false;for(const t of [null,...Array.from({length:13},(_,k)=>D*k/12)]){COMM.render(i,t);chk('frame '+(t===null?'poster':t.toFixed(2)))}
        for(const inp of fig.querySelectorAll('input[type=range]')){const mn=+inp.min,mx=+inp.max;for(const v of [mn,(mn+mx)/2,mx]){inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));COMM.render(i,undefined);chk('slider '+inp.id+'='+v);
          if(id==='a1-over'){const lab=inp.closest('.ctl').querySelector('output').textContent;if(lab!=='×'+(+v).toFixed(1))out.push([id,'label',lab,v])}}}
        for(const b of fig.querySelectorAll('.chip,.seg button,.tgl input')){b.click();COMM.render(i,undefined);chk('control '+(b.textContent||'switch').trim().slice(0,12))}
        i.D=D;}
      return out}"""
    n = 0
    for w, h, theme in [(1440, 900, 'light'), (390, 844, 'dark'), (768, 1024, 'light'), (360, 740, 'light')]:
        b, c, pg, errs = mk(p, w, h, theme)
        try:
            goto(pg)
            for a in ('a1', 'a2', 'a3', 'a4', 'a5', 'a6'):
                pg.evaluate(f"COMM.open('{a}')")
                pg.wait_for_function("document.querySelector('.cm-art')")
                pg.wait_for_timeout(500)
                bad = pg.evaluate(JS)
                assert not bad, (f'{theme} {w} {a}: ink within 2 px of a canvas edge / label != magnification', bad[:5])
                n += pg.locator('figure.cm-demo').count()
            assert not errs, errs[:3]
        finally:
            b.close()
    return f'{n} demo canvases x (13 frames + poster, slider min/mid/max, controls): no ink within 2 px of any edge; overshoot label = lens magnification'


def _seed(pg, js):
    pg.evaluate("(()=>{const s=COMM.store();" + js + ";COMM.refresh()})()")
    pg.wait_for_timeout(300)


PROG_JS = """(sel)=>{const cv=document.querySelector(sel+' .cm-cv'),rp=document.querySelector(sel+' .cm-rp');if(!rp)return null;const a=cv.getBoundingClientRect(),r=rp.getBoundingClientRect(),i=rp.querySelector('i').getBoundingClientRect();
 const cs=getComputedStyle(rp),fs=getComputedStyle(rp.querySelector('i')),root=getComputedStyle(document.documentElement);
 return {dl:Math.abs(r.left-a.left),dr:Math.abs(r.right-a.right),db:Math.abs(r.bottom-a.bottom),h:r.height,fill:i.width/r.width,bg:cs.backgroundColor,fillBg:fs.backgroundColor,ink:root.getPropertyValue('--ink').trim(),accent:root.getPropertyValue('--accent').trim(),
  rad:[fs.borderTopLeftRadius,fs.borderTopRightRadius,cs.borderTopLeftRadius,cs.borderTopRightRadius].join(),role:rp.getAttribute('role'),now:rp.getAttribute('aria-valuenow'),vh:(rp.parentElement.querySelector('.vh')||{}).textContent,
  tags:[...document.querySelectorAll(sel+' .cm-chips .cm-chip')].map(e=>e.textContent.trim()),pos:cs.position,z:cs.zIndex,after:!!(rp.previousElementSibling&&rp.previousElementSibling.matches('canvas,img'))}}"""


def _rgb(c):
    import re as _r
    v = [float(x) for x in _r.findall(r'[\d.]+', c)]
    if c.startswith('color('):   # color-mix() computes to color(srgb r g b / a) with 0..1 channels
        v = [x * 255 for x in v[:3]] + v[3:]
    return v + [1.0] if len(v) == 3 else v


def c_progress(p):
    """W92: reading progress = 3 px bar on the bottom edge of the 2:1 cover (not a tag): only for 0 < p < 100 %, flush with the cover corners (square ends), track = --ink at low alpha, fill = --ink (never the accent),
    role=progressbar + aria-valuenow + visually hidden «Прочитано N %», over an own cover image too, read lesson = check tag and no bar, same bar on «Избранное» cards; light + dark, 1440 + 390."""
    n = 0
    for w, h, theme in [(1440, 900, 'light'), (1440, 900, 'dark'), (390, 844, 'dark'), (390, 844, 'light')]:
        b, c, pg, errs = mk(p, w, h, theme)
        try:
            goto(pg)
            _seed(pg, "s.prog.a2=.4;s.prog.a3=.9;s.read.a1=1;s.prog.a1=1;s.prog.a4=0;s.fav.a2=1;s.prog.a5=1")   # a5 = 100 % but not marked read: no bar, no tag; a3 90 %
            ink_ok = lambda x, y: abs(x[0] - y[0]) < 2 and abs(x[1] - y[1]) < 2 and abs(x[2] - y[2]) < 2
            r = pg.evaluate(PROG_JS, '.cm-card[data-art=a2]')
            assert r, 'no progress bar on a 40 % lesson'
            assert r['role'] == 'progressbar' and r['now'] == '40' and r['vh'] == 'Прочитано 40 %', r
            assert r['dl'] < .6 and r['dr'] < .6 and r['db'] < .6 and abs(r['h'] - 3) < .1, ('bar not flush with the cover bottom edge / not 3 px', r)
            assert abs(r['fill'] - .4) < .01, r
            assert r['rad'] == '0px,0px,0px,0px', ('square ends', r)
            assert r['pos'] == 'absolute' and r['after'], r
            assert not any('%' in t for t in r['tags']) and r['tags'][0].endswith('мин'), ('no % tag in the tag row', r['tags'])
            ink = _rgb(pg.evaluate("c=>{const e=document.createElement('i');e.style.color=c;document.body.appendChild(e);const v=getComputedStyle(e).color;e.remove();return v}", r['ink']))
            acc = _rgb(pg.evaluate("c=>{const e=document.createElement('i');e.style.color=c;document.body.appendChild(e);const v=getComputedStyle(e).color;e.remove();return v}", r['accent']))
            fill, track = _rgb(r['fillBg']), _rgb(r['bg'])
            assert ink_ok(fill, ink) and fill[3] == 1 and not ink_ok(fill, acc), ('fill must be the neutral ink token, not accent', fill, ink, acc)
            assert ink_ok(track, ink) and 0.05 <= track[3] <= .35, ('track = ink token at low alpha', track)
            r3 = pg.evaluate(PROG_JS, '.cm-card[data-art=a3]')
            assert r3 and r3['now'] == '90', r3
            for aid, why in (('a1', 'read'), ('a4', 'zero'), ('a5', '100 % unmarked'), ('a6', 'untouched')):
                assert pg.evaluate(PROG_JS, f'.cm-card[data-art={aid}]') is None, f'bar on a {why} lesson'
            assert pg.locator('.cm-card[data-art=a1] .cm-state.done .i-check').count() == 1 and 'Прочитано' in pg.inner_text('.cm-card[data-art=a1] .cm-state.done .vh'), 'read lesson keeps the check tag'
            assert pg.locator('.cm-card .cm-state').count() == 1, 'only the read lesson has a status tag'
            # own cover image: the bar sits above it, still flush
            pg.evaluate("COMM.data.arts.find(a=>a.id==='a2').cover=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect width='200' height='100' fill='%23c33'/%3E%3C/svg%3E\";COMM.refresh()")
            pg.wait_for_timeout(300)
            ri = pg.evaluate(PROG_JS, '.cm-card[data-art=a2]')
            assert ri and ri['db'] < .6 and ri['dl'] < .6 and ri['dr'] < .6 and pg.locator('.cm-card[data-art=a2] .cm-cv img').count() == 1, ri
            geo(pg, f'{w} {theme} progress list')
            # Избранное: the same bar, flush with the bottom edge of the card
            pg.click('[data-tab=fav]')
            pg.wait_for_function("S.tab==='fav'&&!document.getElementById('fav-art').hidden")
            fb = pg.evaluate("""()=>{const k=document.querySelector('.cmf-card[data-art=a2]'),rp=k&&k.querySelector('.cm-rp');if(!rp)return null;const a=k.getBoundingClientRect(),r=rp.getBoundingClientRect();return {l:Math.abs(r.left-a.left),r:Math.abs(r.right-a.right),b:Math.abs(r.bottom-a.bottom),h:r.height,now:rp.getAttribute('aria-valuenow'),ov:getComputedStyle(k).overflow}}""")
            assert fb and fb['l'] < .6 and fb['r'] < .6 and fb['b'] < .6 and abs(fb['h'] - 3) < .1 and fb['now'] == '40' and fb['ov'] == 'hidden', fb
            n += 1
            assert not errs, errs[:3]
        finally:
            b.close()
    return f'{n} theme/width combos: 3 px bar flush at the cover bottom (square ends, ink fill, low-alpha ink track), 0<p<100 only, aria ok, own cover + Избранное ok'


def c_lazy(p):
    """W92: the community texts and code are not parsed at startup (block #zm stays in the page, CM_DATA / COMM undefined until first use); first use = tab, deep link #community, an article or challenge after
    reload, Избранное with articles, or a font change while a challenge is active; every deep link restores its place."""
    b, c, pg, errs = mk(p)
    try:
        assert pg.evaluate("!!document.getElementById('zm')&&typeof CM_DATA==='undefined'&&COMM.built()===false&&typeof __cmStub==='object'&&!__cmStub.loaded()"), 'community must not be loaded at startup'
        pg.click('[data-tab=library]')
        pg.click('[data-tab=fav]')
        pg.wait_for_function("S.tab==='fav'")
        assert pg.evaluate("!!document.getElementById('zm')&&!__cmStub.loaded()&&document.getElementById('fav-art').hidden"), 'empty favourites must not load it'
        goto(pg)
        assert pg.evaluate("!document.getElementById('zm')&&__cmStub.loaded()&&typeof CM_DATA!=='undefined'&&COMM.built()")
        # article deep link after reload
        pg.evaluate("COMM.open('a3')")
        pg.wait_for_function("COMM.state().a==='a3'&&document.querySelector('.cm-art[data-art=a3]')")
        reload(pg)
        pg.wait_for_function("S.tab==='community'&&COMM.state().a==='a3'&&document.querySelector('.cm-art[data-art=a3] h1,.cm-art[data-art=a3]')", timeout=15000)
        assert pg.evaluate("location.hash")=='#community'
        # a new document opened through the #community link lands in the stored place
        pg.goto('file://' + PAGE + '?motion=1&dl=1#community')
        pg.wait_for_function("S.tab==='community'&&COMM.state().a==='a3'&&document.querySelector('.cm-art[data-art=a3]')", timeout=60000)
        # challenge deep link
        pg.evaluate("COMM.openCh('coffee')")
        pg.wait_for_function("COMM.state().c==='coffee'&&document.querySelector('.cm-hero')")
        reload(pg)
        pg.wait_for_function("S.tab==='community'&&COMM.state().c==='coffee'&&document.querySelector('.cm-hero')", timeout=15000)
        # reload on home with an active challenge: still nothing loaded; changing the font loads it and ticks the progress item
        pg.click('[data-tab=home]')
        pg.wait_for_function("S.tab==='home'")
        pg.wait_for_function("(()=>{const s=localStorage.getItem('gtype-comm-v1');return !!s&&JSON.parse(s).act==='coffee'})()", timeout=10000)
        pg.reload()
        pg.wait_for_function(READY, timeout=180000)
        pg.wait_for_function("S.tab==='home'")
        assert pg.evaluate("!!document.getElementById('zm')&&!__cmStub.loaded()"), 'startup with an active challenge must not load the section'
        pg.evaluate("switchFont(S.fontId==='rotunda'?'modul':'rotunda')")
        pg.wait_for_function("__cmStub.loaded()&&COMM.store().ch.coffee&&COMM.store().ch.coffee.a.font===1", timeout=10000)
        assert not errs, errs[:3]
        return 'not parsed at startup; tab, deep links (article, challenge, #community in a new document) and the auto-progress hook load it on first use'
    finally:
        b.close()


def _s(pg):
    pg.wait_for_timeout(300)
    return pg.evaluate("({tab:S.tab,a:COMM.state().a,c:COMM.state().c,hash:location.hash,art:!!document.querySelector('.cm-art'),hero:!!document.querySelector('.cm-hero'),land:!!document.querySelector('.cm-ban'),sy:Math.round(Math.max(scrollY,document.getElementById('view-comm').scrollTop))})")


def _is(pg, where, **want):
    s = _s(pg)
    for k, v in want.items():
        assert s[k] == v, f'{where}: {k}={s[k]!r}, expected {v!r}; state {s}'
    return s


def _land(pg, where):
    return _is(pg, where, tab='community', a=None, c=None, land=True, art=False, hero=False)


def c_nav(p):
    """W95: every control in «Сообщество» leads where its label says. «Все уроки» / «Все челленджи» always land on the community landing (never on «Избранное» / the previous tab), whatever way
    the page was entered (landing, Избранное, profile, home, reload / #community deep link, next lesson, challenge -> lesson link); browser Back / Forward walk the real history without loops;
    the rail button inside an article / challenge = landing; filters and empty-state buttons, hearts, term popovers, «Как участвовать», theme toggle mid-article. 1440 and 390."""
    for (w, h) in [(1440, 900), (390, 844)]:
        b, c, pg, errs = mk(p, w, h)
        W = f'{w}: '
        try:
            # 1 landing -> article -> «Все уроки»; scroll restored; Back/Forward
            goto(pg)
            pg.evaluate("document.querySelector('#cm-les .cm-grid').scrollIntoView()")
            pg.wait_for_timeout(200)
            y0 = _s(pg)['sy']
            assert y0 > 200, y0
            pg.locator('.cm-card [data-act=open]').first.click()
            _is(pg, W + 'article', tab='community', a='a1', art=True)
            pg.click('.cm-art .cm-back')
            s = _land(pg, W + 'back button from landing-entered article')
            assert abs(s['sy'] - y0) < 8, (y0, s)
            assert pg.evaluate("history.length") <= 5
            pg.go_back()
            _is(pg, W + 'Back from landing', tab='home')
            pg.go_forward()
            _land(pg, W + 'Forward')
            # 2 «Избранное» -> article -> «Все уроки» (the reported bug: it went back to «Избранное»)
            pg.locator('.cm-card [data-act=fav]').nth(2).click()
            pg.click('[data-tab=fav]')
            pg.wait_for_function("S.tab==='fav'&&!document.getElementById('fav-art').hidden", timeout=5000)
            pg.click('#fav-artlist [data-fa=open]')
            _is(pg, W + 'article from fav', tab='community', a='a3', art=True)
            pg.click('.cm-art .cm-back')
            _land(pg, W + '«Все уроки» from an article opened in Избранное')
            pg.go_back()
            _is(pg, W + 'Back = the article just left', tab='community', a='a3', art=True)
            pg.go_back()
            _is(pg, W + 'Back = Избранное', tab='fav')
            pg.go_forward()
            _is(pg, W + 'Forward = article', tab='community', a='a3')
            pg.go_forward()
            _land(pg, W + 'Forward = landing')
            # 3 reload / deep link on an article: «Все уроки» -> landing, same tab
            pg.evaluate("COMM.open('a2')")
            pg.wait_for_function("COMM.state().a==='a2'&&document.querySelector('.cm-art')")
            reload(pg)
            pg.wait_for_function("S.tab==='community'&&COMM.state().a==='a2'&&document.querySelector('.cm-art')", timeout=15000)
            pg.click('.cm-art .cm-back')
            _land(pg, W + 'back button after reload')
            pg.goto('file://' + PAGE + '?motion=1&dl=1#community')
            pg.wait_for_function("S.tab==='community'&&document.querySelector('.cm-grid,.cm-art')", timeout=60000)
            pg.evaluate("COMM.open('a4')")
            pg.wait_for_function("COMM.state().a==='a4'&&document.querySelector('.cm-art')")
            pg.goto('file://' + PAGE + '?motion=1&dl=2#community')
            pg.wait_for_function("S.tab==='community'&&COMM.state().a==='a4'&&document.querySelector('.cm-art')", timeout=60000)
            pg.click('.cm-art .cm-back')
            _land(pg, W + 'back button on a deep link')
            # 4 home / profile entry (the stored place is an article): rail -> article, «Все уроки» -> landing, Back stays in the app
            pg.evaluate("COMM.open('a2')")
            pg.wait_for_function("COMM.state().a==='a2'")
            pg.evaluate("setTab('home')")
            pg.wait_for_function("S.tab==='home'")
            pg.evaluate("setTab('profile')")
            pg.wait_for_function("S.tab==='profile'||S.tab==='folder'")
            pg.evaluate("setTab('community')")
            _is(pg, W + 'profile -> section resumes the article', tab='community', a='a2', art=True)
            pg.click('.cm-art .cm-back')
            _land(pg, W + 'back button, entered from profile')
            pg.go_back()
            _is(pg, W + 'Back after that = the article', tab='community', a='a2')
            pg.go_back()
            assert _s(pg)['tab'] in ('profile', 'folder'), _s(pg)
            # 5 next lesson: «Все уроки» lands on the landing, Back walks the lessons back
            pg.evaluate("setTab('community')")
            pg.wait_for_function("S.tab==='community'")
            pg.evaluate("COMM.nav({})")
            pg.wait_for_function("document.querySelector('.cm-grid')")
            pg.evaluate("COMM.open('a1')")
            pg.wait_for_function("COMM.state().a==='a1'")
            nxt = pg.evaluate("document.querySelector('.cm-next [data-act=next]').dataset.id")
            nt = pg.inner_text('.cm-next b')
            pg.locator('.cm-next [data-act=next]').scroll_into_view_if_needed()
            pg.click('.cm-next [data-act=next]')
            _is(pg, W + 'next lesson', a=nxt, art=True)
            assert pg.inner_text('.cm-art h1') == nt, (nt, pg.inner_text('.cm-art h1'))
            assert pg.evaluate("Math.max(scrollY,document.getElementById('view-comm').scrollTop)") < 40, 'next lesson must open at the top'
            pg.click('.cm-art .cm-back')
            _land(pg, W + 'back button after next lesson')
            pg.go_back()
            _is(pg, W + 'Back = next lesson', a=nxt)
            pg.go_back()
            _is(pg, W + 'Back = first lesson', a='a1')
            pg.go_back()
            _land(pg, W + 'Back = landing')
            # 6 challenge -> lesson link -> «Все уроки»; challenge «Все челленджи»
            pg.click('.cm-ban [data-act=och]')
            _is(pg, W + 'challenge', c='coffee', hero=True)
            pg.click('.cm-hero .cm-back')
            _land(pg, W + '«Все челленджи» from the banner')
            pg.click('.cm-ban [data-act=och]')
            pg.wait_for_function("COMM.state().c==='coffee'")
            lk = pg.locator('.cm-lk').first
            lid = lk.get_attribute('data-id')
            lk.scroll_into_view_if_needed()
            lk.click()
            _is(pg, W + 'lesson from the challenge', a=lid, art=True, c=None)
            pg.click('.cm-art .cm-back')
            _land(pg, W + '«Все уроки» after challenge -> lesson')
            pg.go_back()
            _is(pg, W + 'Back = lesson', a=lid)
            pg.go_back()
            _is(pg, W + 'Back = challenge', c='coffee', hero=True)
            pg.go_back()
            _land(pg, W + 'Back = landing')
            # challenge deep link after reload: «Все челленджи» -> landing, not another tab
            pg.evaluate("COMM.openCh('coffee')")
            pg.wait_for_function("COMM.state().c==='coffee'&&document.querySelector('.cm-hero')")
            reload(pg)
            pg.wait_for_function("S.tab==='community'&&COMM.state().c==='coffee'&&document.querySelector('.cm-hero')", timeout=15000)
            pg.click('.cm-hero .cm-back')
            _land(pg, W + '«Все челленджи» after reload')
            # 7 rail «Сообщество» inside an article / challenge = landing; on the landing nothing moves
            pg.evaluate("COMM.open('a3')")
            pg.wait_for_function("COMM.state().a==='a3'&&document.querySelector('.cm-art')")
            pg.click('[data-tab=community]') if w > 500 else pg.evaluate("document.querySelector('[data-tab=community]').click()")
            _land(pg, W + 'rail inside an article')
            pg.evaluate("COMM.openCh('coffee')")
            pg.wait_for_function("COMM.state().c==='coffee'")
            pg.evaluate("document.querySelector('[data-tab=community]').click()")
            _land(pg, W + 'rail inside a challenge')
            pg.evaluate("document.querySelector('[data-tab=community]').click()")
            _land(pg, W + 'rail on the landing')
            # 8 filters, empty-state buttons, hearts
            pg.evaluate("Object.keys(COMM.store().fav).forEach(k=>delete COMM.store().fav[k])")
            pg.evaluate("COMM.refresh()")
            pg.click('.cm-bar-f [data-f=fav]')
            assert pg.locator('.cm-card').count() == 0 and pg.is_visible('#cm-empty')
            assert pg.inner_text('#cm-empty button') == 'Показать все уроки'
            pg.click('#cm-empty button')
            assert pg.locator('.cm-card').count() == 6 and pg.get_attribute('.cm-bar-f [data-f=all]', 'aria-pressed') == 'true'
            pg.locator('.cm-card [data-act=fav]').nth(1).click()
            assert pg.inner_text('.cm-bar-f [data-f=fav]') == 'Избранное · 1'
            pg.click('.cm-bar-f [data-f=fav]')
            assert pg.locator('.cm-card').count() == 1
            pg.locator('.cm-card [data-act=fav]').first.click()            # un-heart inside the filter: card goes, focus must stay inside the list controls
            assert pg.is_visible('#cm-empty')
            assert pg.evaluate("!!document.activeElement.closest('.cm-bar-f,#cm-empty')"), pg.evaluate("document.activeElement.outerHTML.slice(0,80)")
            pg.click('#cm-empty button')
            # unread: mark all read -> empty state with its button
            pg.evaluate("COMM.data.arts.forEach(a=>COMM.store().read[a.id]=1);COMM.refresh()")
            pg.click('.cm-bar-f [data-f=unread]')
            assert pg.locator('.cm-card').count() == 0 and pg.inner_text('#cm-empty b') == 'Все уроки прочитаны'
            pg.click('#cm-empty button')
            assert pg.locator('.cm-card').count() == 6
            pg.evaluate("COMM.data.arts.forEach(a=>delete COMM.store().read[a.id]);COMM.refresh()")
            # article heart: toggles, mirrors on the landing and in «Избранное»; does not navigate
            pg.locator('.cm-card [data-act=open]').nth(3).click()
            pg.wait_for_function("COMM.state().a==='a4'")
            hb = pg.locator('.cm-art .cm-ah [data-act=fav]')
            hb.click()
            assert hb.get_attribute('aria-pressed') == 'true' and _s(pg)['a'] == 'a4'
            pg.click('.cm-art .cm-back')
            _land(pg, W + 'after the article heart')
            assert pg.locator('.cm-card[data-art=a4] [data-act=fav][aria-pressed=true]').count() == 1
            pg.click('[data-tab=fav]')
            pg.wait_for_function("S.tab==='fav'&&document.querySelector('#fav-artlist [data-id=a4]')")
            pg.evaluate("document.querySelector('#fav-artlist [data-fa=fav]').click()")
            pg.evaluate("setTab('community')")
            pg.wait_for_function("S.tab==='community'&&document.querySelector('.cm-grid')")
            assert pg.locator('.cm-card [data-act=fav][aria-pressed=true]').count() == 0
            # 9 article internals: term popover, «Прочитано» chip is a state (no control), «Как участвовать», CTA closes the article, theme toggle
            pg.evaluate("document.querySelector('.cm-howb') && 0")
            pg.click('.cm-howb')
            assert pg.get_attribute('.cm-howb', 'aria-expanded') == 'true' and _s(pg)['land']
            pg.click('.cm-howb')
            assert pg.get_attribute('.cm-howb', 'aria-expanded') == 'false'
            pg.evaluate("COMM.open('a1')")
            pg.wait_for_function("COMM.state().a==='a1'&&document.querySelector('.cm-art')")
            if pg.locator('.cm-term').count():
                t = pg.locator('.cm-term').first
                t.scroll_into_view_if_needed()
                t.click()
                pg.wait_for_function("document.querySelector('#cm-pop.on')")
                assert _s(pg)['a'] == 'a1'
                pg.keyboard.press('Escape')
                pg.wait_for_function("!document.querySelector('#cm-pop.on')")
                assert _s(pg)['a'] == 'a1' and _s(pg)['tab'] == 'community'
            assert pg.locator('.cm-ah .cm-state').count() == 1 and pg.evaluate("document.querySelector('.cm-ah .cm-state').tagName") == 'SPAN'
            n0 = pg.evaluate("document.querySelectorAll('.cm-art canvas').length")
            pg.evaluate("document.documentElement.setAttribute('data-theme','dark')")
            pg.wait_for_timeout(300)
            assert _s(pg)['a'] == 'a1' and pg.evaluate("document.querySelectorAll('.cm-art canvas').length") == n0
            pg.click('.cm-art .cm-back')
            _land(pg, W + 'back button after theme toggle')
            pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
            pg.evaluate("COMM.open('a1')")
            pg.wait_for_function("COMM.state().a==='a1'")
            pg.locator('.cm-cta [data-cta=lines]').scroll_into_view_if_needed()
            pg.click('.cm-cta [data-cta=lines]')
            pg.wait_for_function("S.tab==='edit'", timeout=8000)
            pg.go_back()
            _land(pg, W + 'Back from a work mode opened by an article link = the lessons list')
            assert not errs, errs[:3]
        finally:
            b.close()
    return 'back buttons, Back/Forward, rail, filters, hearts, popovers, theme: 1440 + 390'


if __name__ == '__main__':
    sel = sys.argv[1:]
    cs = [('comm_router', c_router), ('comm_lessons', c_lessons), ('comm_article', c_article), ('comm_pause', c_pause), ('comm_reduced', c_reduced),
          ('comm_covers', c_covers), ('comm_ratio', c_ratio), ('comm_cta', c_cta), ('comm_fav', c_fav), ('comm_chall', c_chall), ('comm_geo', c_geo), ('comm_layout', c_layout), ('comm_pop', c_pop), ('comm_nav', c_nav), ('comm_space', c_space), ('comm_system', c_system), ('comm_demos', c_demos), ('comm_progress', c_progress), ('comm_lazy', c_lazy)]
    if sel:
        cs = [x for x in cs if any(s in x[0] for s in sel)]
    sys.exit(check_all(cs))
