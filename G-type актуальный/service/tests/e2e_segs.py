"""Segmented / toggle button groups: activating, hovering or pressing a button must not move or resize any button of its group (<= 0.5 px),
the sliding indicator (.mo-ind) must sit exactly on the active button, no transform may stay after the press scale. Light + dark, every view.
Groups are found generically: any element with >= 2 visible direct <button> children (also through .vtw wrappers) where one child is 'on' / aria-pressed / aria-selected."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from common import Session, SHOTS

TOL = 0.5
FIND = """()=>{
  const vis=e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return r.width>0&&r.height>0&&c.visibility!=='hidden'&&c.display!=='none'&&r.bottom>0&&r.right>0&&r.left<innerWidth&&r.top<innerHeight};
  const isOn=b=>b.classList.contains('on')||b.getAttribute('aria-pressed')==='true'||b.getAttribute('aria-selected')==='true';
  const kids=g=>[...g.children].flatMap(c=>c.tagName==='BUTTON'?[c]:(c.classList&&c.classList.contains('vtw')?[...c.children].filter(x=>x.tagName==='BUTTON'):[]));
  const out=[];let n=0;
  for(const g of document.querySelectorAll('*')){
    if(g.closest('.rail,#rail-more,.mo-ind'))continue;
    const bs=kids(g).filter(b=>vis(b)&&!b.disabled);
    if(bs.length<2||!bs.some(isOn))continue;
    if(bs.some(b=>b.closest('.dw[inert]')))continue;
    g.dataset.sgq='g'+(n++);bs.forEach((b,i)=>b.dataset.sgb=String(i));
    out.push({id:g.dataset.sgq,cls:(g.id?'#'+g.id:'')+'.'+[...g.classList].join('.'),n:bs.length});
  }
  return out;}"""
BOXES = """id=>{const g=document.querySelector('[data-sgq='+id+']');if(!g)return null;
  const o=g.getBoundingClientRect();/* positions relative to the group: a toolbar that re-centres as a whole is not a button shift */
  return [...g.querySelectorAll('button[data-sgb]')].filter(b=>b.closest('[data-sgq]')===g).map(b=>{const r=b.getBoundingClientRect();return [b.dataset.sgb,r.left-o.left,r.top-o.top,r.width,r.height,getComputedStyle(b).transform]})}"""
IND = """id=>{const g=document.querySelector('[data-sgq='+id+']');if(!g||g.getAttribute('data-ind')!=='1')return null;
  const i=g.querySelector(':scope>.mo-ind');const b=[...g.querySelectorAll('button')].find(x=>x.classList.contains('on')&&x.closest('[data-sgq]')===g);if(!i||!b)return null;
  const a=i.getBoundingClientRect(),r=b.getBoundingClientRect();return [a.left-r.left,a.top-r.top,a.width-r.width,a.height-r.height]}"""


def delta(a, b):
    m = {x[0]: x for x in a}
    worst = 0.0
    who = None
    for y in b:
        x = m.get(y[0])
        if not x:
            continue
        d = max(abs(x[1] - y[1]), abs(x[2] - y[2]), abs(x[3] - y[3]), abs(x[4] - y[4]))
        if d > worst:
            worst, who = d, y[0]
    return worst, who


def settle(pg, ms=420):
    pg.evaluate("window.MO&&MO.flush&&MO.flush()")
    pg.wait_for_timeout(ms)


def enter(s, mode):
    pg = s.pg
    if mode in ('home', 'library'):
        pg.evaluate("typeof iuClose==='function'&&document.body.classList.contains('imp-open')&&iuClose()")
        pg.evaluate(f"setTab('{mode}')")
    elif mode in ('edit', 'proof', 'kern'):
        if not pg.evaluate("S.fontId==='kvadra'"):
            s.open_font('kvadra')
        pg.evaluate(f"setTab('{mode}')")
    elif mode == 'draw':
        pg.evaluate("setTab('draw')")
        pg.wait_for_selector('.dr-g #dr-side', state='attached', timeout=15000)
    elif mode == 'import':
        pg.evaluate("setTab('home')")
        pg.evaluate("document.querySelector('#imp-card').click()")
        pg.wait_for_function("document.body.classList.contains('imp-open')", timeout=10000)
    pg.wait_for_function(f"document.body.dataset.rm==='{mode}'", timeout=10000)
    settle(pg, 500)


def audit_view(s, mode, theme, log):
    pg = s.pg
    enter(s, mode)
    pg.evaluate(f"document.documentElement.dataset.theme='{theme}'")
    settle(pg, 400)
    groups = pg.evaluate(FIND)
    bad = []
    nb = 0
    for g in groups:
        gid = g['id']
        pg.mouse.move(2, 2)
        settle(pg, 120)
        base = pg.evaluate(BOXES, gid)
        if not base:
            continue
        idx = [b[0] for b in base]
        # indicator sits on the active button
        ind = pg.evaluate(IND, gid)
        if ind and max(abs(v) for v in ind) > TOL:
            bad.append(f'{mode}/{theme} {g["cls"]}: indicator off the active button by {[round(v, 2) for v in ind]}')
        for k in idx:
            sel = f'[data-sgq={gid}] button[data-sgb="{k}"]'
            if not pg.is_visible(sel):
                continue
            nb += 1
            box = pg.locator(sel).first.bounding_box()
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            # hover
            pg.mouse.move(cx, cy)
            settle(pg, 300)
            h = pg.evaluate(BOXES, gid)
            d, who = delta(base, h)
            if d > TOL:
                bad.append(f'{mode}/{theme} {g["cls"]} hover[{k}]: button {who} moved {d:.2f}px')
            # press (not released on the button, so nothing activates)
            pg.mouse.down()
            settle(pg, 260)
            pr = pg.evaluate(BOXES, gid)
            d, who = delta(base, pr)
            is_seg = pg.evaluate("id=>!!document.querySelector('[data-sgq='+id+']').matches('.seg,.vtabs,.tt-tabs,.dr-seg,.imp-seg')", gid)
            if is_seg and d > TOL:
                bad.append(f'{mode}/{theme} {g["cls"]} press[{k}]: button {who} moved {d:.2f}px')
            pg.mouse.move(2, 2)
            pg.mouse.up()
            settle(pg, 120)
        # activation: click every button, compare the whole group with the baseline of the SAME button set
        for k in idx:
            sel = f'[data-sgq={gid}] button[data-sgb="{k}"]'
            if not pg.is_visible(sel):
                continue
            before = pg.evaluate(BOXES, gid)
            if before is None:
                break
            if pg.evaluate("s=>{const b=document.querySelector(s);return b.classList.contains('on')||b.getAttribute('aria-pressed')==='true'||b.getAttribute('aria-selected')==='true'}", sel):
                continue
            tag = pg.evaluate("s=>document.querySelector(s).closest('[data-sgq]').matches('#vtabs,.vtabs,.top .seg')", sel)
            box = pg.locator(sel).first.bounding_box()
            pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
            pg.mouse.move(2, 2)
            settle(pg, 520)
            after = pg.evaluate(BOXES, gid)
            if after is None:
                break   # the click rebuilt the view (nav tab): geometry of that group is re-audited in its own view
            if len(after) != len(before):
                continue
            d, who = delta(before, after)
            if d > TOL:
                bad.append(f'{mode}/{theme} {g["cls"]} activate[{k}]: button {who} moved/resized {d:.2f}px')
            left = [a for a in after if a[5] not in ('none', 'matrix(1, 0, 0, 1, 0, 0)')]
            if left:
                bad.append(f'{mode}/{theme} {g["cls"]} activate[{k}]: transform left on button {left[0][0]}: {left[0][5]}')
            ind = pg.evaluate(IND, gid)
            if ind and max(abs(v) for v in ind) > TOL:
                bad.append(f'{mode}/{theme} {g["cls"]} activate[{k}]: indicator off the active button by {[round(v, 2) for v in ind]}')
            if mode in ('edit', 'proof', 'kern') and tag:   # top nav: go back to the view under test
                enter(s, mode)
                pg.evaluate(f"document.documentElement.dataset.theme='{theme}'")
                settle(pg, 300)
                break
        log.append(f'{mode}/{theme}:{len(groups)}g')
    return bad, nb


def segs(p):
    s = Session(p, 'segs')
    bad = []
    log = []
    total = 0
    try:
        s.open_font('kvadra')
        for theme in ('light', 'dark'):
            for mode in ('home', 'library', 'edit', 'proof', 'kern', 'draw', 'import'):
                b, nb = audit_view(s, mode, theme, log)
                bad += b
                total += nb
        # the top bar explicitly: Прямой/Италик and Редактор/Проверка/Кернинг, every transition, both themes
        for theme in ('light', 'dark'):
            enter(s, 'edit')
            s.pg.evaluate(f"document.documentElement.dataset.theme='{theme}'")
            settle(s.pg, 300)
            for steps in (['proof', 'kern', 'edit'], ['kern', 'proof', 'edit']):
                prev = s.pg.evaluate("[...document.querySelectorAll('#vtabs button')].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
                for t in steps:
                    s.pg.evaluate(f"setTab('{t}')")
                    settle(s.pg, 420)
                    cur = s.pg.evaluate("[...document.querySelectorAll('#vtabs button')].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
                    for a, b2 in zip(prev, cur):
                        if max(abs(x - y) for x, y in zip(a, b2)) > TOL:
                            bad.append(f'top tabs {theme}: a tab moved while switching to {t}: {a} -> {b2}')
                    prev = cur
            for st in ('italic', 'regular'):
                prev = s.pg.evaluate("[...document.querySelectorAll('header.top .seg button')].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
                s.pg.evaluate(f"setStyle&&setStyle('{st}')") if s.pg.evaluate("typeof setStyle==='function'") else s.pg.click(f'header.top .seg [data-style={st}]')
                settle(s.pg, 420)
                cur = s.pg.evaluate("[...document.querySelectorAll('header.top .seg button')].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
                for a, b2 in zip(prev, cur):
                    if max(abs(x - y) for x, y in zip(a, b2)) > TOL:
                        bad.append(f'top style seg {theme}: moved on {st}: {a} -> {b2}')
        assert not s.errs, s.errs[:3]
        assert not bad, '; '.join(bad[:14]) + (f' (+{len(bad) - 14} more)' if len(bad) > 14 else '')
        return f'{total} buttons audited (hover/press/activate), both themes, all views, <= {TOL}px, indicator centred, no leftover transform'
    finally:
        s.b.close()


if __name__ == '__main__':
    t0 = time.time()
    rc = 0
    try:
        with sync_playwright() as p:
            msg = segs(p)
        print(f'PASS segs {msg} t={time.time() - t0:.1f}s')
    except Exception as e:  # noqa
        rc = 1
        print(f'FAIL segs {type(e).__name__}: {str(e)[:2500]}')
    sys.exit(rc)
