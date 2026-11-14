"""Icon centring audit helpers: paint-based. Screenshot every icon-only button, find the ink bbox against the
button's dominant colour and compare its centre with the button box centre (device px / 2 -> css px)."""
import io
from PIL import Image
from collections import Counter

CAND = """(()=>{
  const out=[];let i=0;
  for(const e of document.querySelectorAll('button,label.tg,.nb,.rb,.tbtn,.ibtn,.heart,[role=button]')){
    if(e.closest('[hidden]')||e.id==='rail-profile')continue; /* avatar button: a photo plus a status dot, not an icon */
    const r=e.getBoundingClientRect();
    if(r.width<18||r.height<18||r.width>72||r.height>72)continue;
    const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
    if(r.bottom>innerHeight||r.top<0||r.right>innerWidth||r.left<0)continue;
    const bef=getComputedStyle(e,'::before').content,hasIco=!!e.querySelector('.ico,svg')||(bef&&bef!=='none'&&bef!=='normal');
    if(!hasIco)continue;
    const txt=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');
    if(txt&&parseFloat(cs.fontSize)>0)continue; /* icon + visible text: skip */
    e.setAttribute('data-ia',String(i));out.push([i++,(e.id||e.className||e.tagName).toString().slice(0,30)+' '+(e.dataset.tab||e.dataset.mode||e.getAttribute('aria-label')||'')]);
  }
  return out;})()"""


def ink_off(png):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    w, h = im.size
    px = im.load()
    bg = Counter(im.getdata()).most_common(1)[0][0]
    xs, ys, n, sx, sy = [], [], 0, 0, 0
    x0, y0, x1, y1 = w, h, -1, -1
    m = int(min(w, h) * 0.12)  # ignore the rounded border region
    for y in range(m, h - m):
        for x in range(m, w - m):
            p = px[x, y]
            d = abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2])
            if d > 90:
                x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
    if x1 < 0:
        return None
    return ((x0 + x1 + 1) / 2 - w / 2, (y0 + y1 + 1) / 2 - h / 2, w, h)


def audit(pg, scale=2):
    """-> list of (name, dx, dy) in css px for every visible icon-only button."""
    res = []
    for i, name in pg.evaluate(CAND):
        r = pg.evaluate("i=>{const r=document.querySelector('[data-ia=\"'+i+'\"]').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}", i)
        try:
            png = pg.screenshot(clip=r, timeout=3000)
        except Exception:
            continue
        o = ink_off(png)
        if o is None:
            continue
        res.append((name, o[0] / scale, o[1] / scale))
    pg.evaluate("document.querySelectorAll('[data-ia]').forEach(e=>e.removeAttribute('data-ia'))")
    return res
