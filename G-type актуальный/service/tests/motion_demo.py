"""Motion demo + frame check (MOTION_SKILL section 12).
Software-rendered headless frames are far slower than real time, so the demo steps the page timeline deterministically: right after an action every
Animation (CSS transitions, CSS animations, WAAPI) is paused and its currentTime is advanced frame by frame (30 fps, 60 fps for measured motions),
one screenshot per step. Result: exact frames of what a 60 Hz display shows. Timer-driven flows (export button) are sampled in real time.
Outputs: logs/motion_demo.mp4 (+ ../keep/motion_demo.mp4), logs/motion_contact_*.png, logs/motion_measure.txt
usage: python3 tests/motion_demo.py [--quick]"""
import sys, os, io, time, json, shutil, subprocess, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import numpy as np
from PIL import Image, ImageDraw, ImageFont

QUICK = '--quick' in sys.argv
OUT = os.path.join(LOGS, 'motion_demo')
KEEP = os.path.abspath(os.path.join(WK, '..', 'keep'))
URL = 'file://' + PAGE + '?motion=1'
FPS = 30
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
STYLE = '.hm-mesh>b,.hm-mesh i,.hm-row{animation:none!important}'

FREEZE = """async(action)=>{
  await (new Function('return (async()=>{'+action+'})()'))();
  await Promise.resolve();await Promise.resolve();
  if(window.MO&&MO.flush)MO.flush();
  const as=document.getAnimations().filter(a=>{const t=a.effect&&a.effect.getComputedTiming();return t&&isFinite(t.endTime)&&t.iterations!==Infinity&&a.effect.target&&a.effect.target.isConnected});
  as.forEach(a=>a.pause());window.__as=as;
  return Math.max(0,...as.map(a=>a.effect.getComputedTiming().endTime));}"""
STEP = "t=>{(window.__as||[]).forEach(a=>{try{const e=a.effect.getComputedTiming().endTime;a.currentTime=(a.transitionProperty==='display')?Math.min(t,e-1):Math.min(t,e)}catch(e){}})}"
FINISH = "()=>{(window.__as||[]).forEach(a=>{try{a.finish()}catch(e){}});window.__as=[]}"


def png(pg, clip=None):
    kw = {'type': 'png'}
    if clip:
        kw['clip'] = clip
    return Image.open(io.BytesIO(pg.screenshot(**kw))).convert('RGB')


def capture(pg, action, fps=FPS, tail=60, head=2, clip=None, maxms=1600):
    """returns list of PIL frames: head frames before, the animation stepped at fps, then tail ms of the settled end state"""
    frames = [png(pg, clip) for _ in range(head)]
    end = pg.evaluate(FREEZE, action)
    end = min(end, maxms)
    n = int(math.ceil(end * fps / 1000.0)) + 1
    for i in range(n):
        t = i * 1000.0 / fps
        pg.evaluate(STEP, t)
        frames.append(png(pg, clip))
    pg.evaluate(FINISH)
    pg.wait_for_timeout(80)
    for _ in range(max(2, int(tail * fps / 1000))):
        frames.append(png(pg, clip))
    return frames, end


def realtime(pg, action, ms, clip=None):
    """timer-driven flows: run the action, then sample as fast as the page allows; returns [(t_ms, frame)]"""
    t0 = time.time()
    out = []
    pg.evaluate("async(a)=>{(new Function(a))()}", action)
    while (time.time() - t0) * 1000 < ms:
        out.append(((time.time() - t0) * 1000, png(pg, clip)))
    return out


def open_page(p, w, h, theme):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=theme, has_touch=(w < 700), device_scale_factor=1)
    ctx.add_init_script(TOUR_OFF)
    ctx.add_init_script("try{localStorage.setItem('gtype-theme-v1','%s')}catch(e){}" % theme)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function("typeof S!=='undefined' && typeof MO!=='undefined' && MO.ready", timeout=60000)
    pg.add_style_tag(content=STYLE)
    pg.evaluate("window.scrollTo(0,0)")
    pg.wait_for_timeout(600)
    return b, pg, errs


def settle(pg, ms=1800):
    pg.wait_for_timeout(ms)


def caption(img, text, sub=''):
    im = img.copy()
    d = ImageDraw.Draw(im, 'RGBA')
    w = im.width
    d.rectangle([0, 0, w, 30], fill=(0, 0, 0, 170))
    d.text((10, 5), text + ('   ' + sub if sub else ''), font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14 if w < 700 else 16), fill=(255, 255, 255, 255))
    return im


def bez(x1, y1, x2, y2):
    def f(t):
        lo, hi = 0.0, 1.0
        for _ in range(40):
            m = (lo + hi) / 2
            xm = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3
            if xm < t:
                lo = m
            else:
                hi = m
        m = (lo + hi) / 2
        return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3
    return f


E_OUT, E_IN, E_STD, E_INOUT = bez(.2, 0, 0, 1), bez(.4, 0, 1, 1), bez(.4, 0, .2, 1), bez(.65, 0, .35, 1)


def progress(frames, base=0):
    """normalised pixel progress 0..1 of a frame stack: 1 - |f_i - f_end| / |f_0 - f_end|"""
    arr = [np.asarray(f, dtype=np.int16) for f in frames]
    end = arr[-1]
    d = np.array([np.abs(a - end).mean() for a in arr])
    d0 = d[base] if d[base] > 0 else 1
    return 1 - d / d0, d


def curve(name, pr, fps, dur, ease, delay=0, pred=None):
    """compare a normalised progress series (index 0 = t0) with the token curve: t50 / t90 crossing times and RMSE (in % of travel)"""
    dt = 1000.0 / fps
    pr = np.clip(np.asarray(pr, dtype=float), 0, 1)
    if pred is None:
        pred = lambda t: ease(min(1, max(0, (t - delay) / dur)))
    def cross(v):
        for i, x in enumerate(pr):
            if x >= v:
                return i * dt
        return float('nan')
    exp50 = next((i * 0.25 for i in range(4000) if pred(i * .25) >= .5), None)
    exp90 = next((i * 0.25 for i in range(4000) if pred(i * .25) >= .9), None)
    t50, t90 = cross(.5), cross(.9)
    ts = np.arange(len(pr)) * dt
    rmse = float(np.sqrt(np.mean((np.array([pred(t) for t in ts]) - pr) ** 2)) * 100)
    return f'{name}: dur {dur:.0f}ms | t50 {t50:.0f} vs {exp50:.0f} ({(t50-exp50)/dt:+.1f} fr) | t90 {t90:.0f} vs {exp90:.0f} ({(t90-exp90)/dt:+.1f} fr) | curve RMSE {rmse:.1f}% of travel'


def pixprog(frames):
    """progress of a cropped frame stack: 1 - |f - end| / |pre - end| (frames[1] = pre, frames[2:] = t0..)"""
    arr = [np.asarray(f, dtype=np.int16) for f in frames]
    end = arr[-1]
    ds = [np.abs(a - end).mean() for a in arr[1:]]
    d0 = max(ds) or 1
    return [1 - d / d0 for d in ds[1:]]


def gray(f, box):
    x0, y0, x1, y1 = box
    return np.asarray(f.convert('L'), dtype=np.int16)[y0:y1, x0:x1]


def track(frames, axis, band, blk, rng, maxstep=None):
    """position of a block (taken from the pre-action frame) in every step frame by SAD search along one axis; returns normalised travel 0..1.
    band = (x0,y0,x1,y1) search window, blk = (a,b) start/end of the block along the axis inside the window (window coords), rng = (lo,hi) candidate starts"""
    pre = gray(frames[1], band)
    seq = [gray(f, band) for f in frames[2:]]
    a, b = blk
    ref = pre[:, a:b] if axis == 'x' else pre[a:b, :]
    def pos(img, prev=None):
        best, bp = None, 0
        lo, hi = (rng[0], rng[1]) if (maxstep is None or prev is None) else (max(rng[0], int(prev) - 2), min(rng[1], int(prev) + maxstep))
        for q in range(lo, hi):
            c = img[:, q:q + (b - a)] if axis == 'x' else img[q:q + (b - a), :]
            sad = np.abs(c - ref).sum()
            if best is None or sad < best:
                best, bp = sad, q
        return bp
    ps = []
    for g in seq:
        ps.append(pos(g, ps[-1] if ps else a))
    ps = np.array(ps, dtype=float)
    p0, p1 = float(a), ps[-1]
    return (ps - p0) / ((p1 - p0) or 1), p1 - p0


def best_block(img, axis, lo, hi, size):
    """the window of `size` along axis inside [lo,hi) with the most contrast (a distinctive block to track)"""
    best, bp = -1, lo
    for q in range(lo, hi - size, 4):
        c = img[:, q:q + size] if axis == 'x' else img[q:q + size, :]
        v = c.std()
        if v > best:
            best, bp = v, q
    return bp


def measure(name, frames, fps, dur, ease, delay=0):
    """pixel progress (whole frame) vs token curve; used for the segmented indicator (single moving element)"""
    pre = frames[1]
    arr = [np.asarray(f, dtype=np.int16) for f in frames[2:]]
    end = arr[-1]
    d = np.array([np.abs(a - end).mean() for a in arr])
    d0 = np.abs(np.asarray(pre, dtype=np.int16) - end).mean() or 1
    return curve(name, 1 - d / d0, fps, dur, ease, delay)


def run_variant(p, w, h, theme, vid, meas):
    b, pg, errs = open_page(p, w, h, theme)
    tag = f"{w}x{h} {theme}"
    clips = []   # (title, frames, fps)

    def add(title, frames, fps=FPS):
        clips.append((title, frames, fps))

    try:
        phone = w < 700
        # ---- views: home -> library -> editor -> proof -> home (ghost leave + cascade)
        settle(pg, 900)
        add('home (hero entrance is a one-time load effect; shown settled)', [png(pg) for _ in range(8)])
        fr, e = capture(pg, "setTab('library')", fps=60 if meas is not None else FPS)
        add('view: home -> library (leave 180ms, rise + cascade 550ms)', fr, 60 if meas is not None else FPS)
        settle(pg, 1500)
        fr, e = capture(pg, "switchFont('kvadra');setTab('edit')")
        add('view: library -> editor', fr)
        settle(pg, 2200)
        # ---- drawer
        fr, e = capture(pg, "dwOpen('edit','grid')", fps=60 if meas is not None else FPS, maxms=1100)
        add('drawer open (450ms out, content +90ms), canvas push in sync', fr, 60 if meas is not None else FPS)
        if meas is not None:
            band = (500, 300, w, 500)
            pre0 = gray(fr[1], band)
            a0 = best_block(pre0, 'x', 0, 400, 80)
            tr, dx = track(fr, 'x', band, (a0, a0 + 80), (0, band[2] - band[0] - 80))
            meas.append(curve(f'[{tag}] drawer open: canvas push (#stagebox margin-left, travel {dx:.0f}px)', tr, 60, 450, E_OUT))
        settle(pg, 2500)
        fr, e = capture(pg, "dwOpen('edit','presets')")
        add('drawer: switch section (180ms crossfade, no re-slide)', fr)
        settle(pg, 1500)
        fr, e = capture(pg, "dwOpen('edit','all')")
        add('drawer: all sections', fr)
        settle(pg, 2500)
        sel = pg.evaluate("""()=>{const ps=[...document.querySelectorAll('#pcard .pane')].filter(p=>p._pane&&!p.hidden&&p.getClientRects().length);
          if(!ps.length)return null;const p=ps[0];p.id=p.id||'mo-pane-x';return '#'+p.id}""")
        if sel:
            if pg.evaluate(f"document.querySelector('{sel}')._pane.open"):
                pg.evaluate(f"document.querySelector('{sel}')._pane.toggle()")
                settle(pg, 1500)
            pr_ = pg.evaluate(f"""()=>{{const p=document.querySelector('{sel}');p.scrollIntoView({{block:'start'}});const r=p.getBoundingClientRect();return [r.left,r.bottom,r.right]}}""")
            pg.wait_for_timeout(300)
            fr, e = capture(pg, f"document.querySelector('{sel}')._pane.toggle()", fps=60 if meas is not None else FPS)
            add('pane expand (300ms, chevron rotates)', fr, 60 if meas is not None else FPS)
            if meas is not None:
                sy = int(pr_[1])
                band = (max(0, int(pr_[0])), sy - 2, min(w, int(pr_[2])), h)
                tr, dy = track(fr, 'y', band, (2, 30), (0, band[3] - band[1] - 30), maxstep=80)
                meas.append(curve(f'[{tag}] pane expand: next pane header travel {dy:.0f}px (waapi height)', tr, 60, 300, E_STD))
            settle(pg, 1800)
            fr, e = capture(pg, f"document.querySelector('{sel}')._pane.toggle()")
            add('pane collapse (250ms ease-in)', fr)
            settle(pg, 1500)
        fr, e = capture(pg, "dwClose('edit')", maxms=800)
        add('drawer close (250ms ease-in)', fr)
        settle(pg, 2000)
        # ---- segmented indicator
        sr = pg.evaluate("()=>{const b=document.querySelector('[data-style=italic]');const g=b.parentElement;const r=g.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}")
        sclip = {'x': max(0, sr[0] - 4), 'y': max(0, sr[1] - 4), 'width': min(w - max(0, sr[0] - 4), sr[2] + 8), 'height': sr[3] + 8}
        fr, e = capture(pg, "document.querySelector('[data-style=italic]').click()", fps=60 if meas is not None else FPS)
        add('Прямой -> Италик: shared indicator slides (180ms in-out)', fr, 60 if meas is not None else FPS)
        if meas is not None:
            box = (int(sclip['x']), int(sclip['y']), int(sclip['x'] + sclip['width']), int(sclip['y'] + sclip['height']))
            meas.append(curve(f'[{tag}] segmented indicator (control only)', pixprog([f.crop(box) for f in fr]), 60, 180, E_INOUT))
        settle(pg, 1500)
        pg.evaluate("document.querySelector('[data-style=regular]').click()")
        settle(pg, 1500)
        # ---- popover
        fr, e = capture(pg, "document.querySelector('#help').click()")
        add('popover open (180ms)', fr)
        settle(pg, 1500)
        fr, e = capture(pg, "document.querySelector('#help').click()")
        add('popover close (90ms)', fr)
        settle(pg, 1500)
        if phone:
            fr, e = capture(pg, "document.querySelector('#rail-more-btn')&&document.querySelector('#rail-more-btn').click()", maxms=900)
            add('phone: «Ещё» sheet rises', fr)
            settle(pg, 2000)
            fr, e = capture(pg, "document.querySelector('#rail-more-btn')&&document.querySelector('#rail-more-btn').click()", maxms=900)
            add('phone: sheet closes', fr)
            settle(pg, 1500)
            fr, e = capture(pg, "dwOpen('edit','grid')", maxms=1000)
            add('phone: drawer = bottom sheet', fr)
            settle(pg, 2500)
            pg.evaluate("dwClose('edit')")
            settle(pg, 1500)
        # ---- toast
        fr, e = capture(pg, "toast('Сохранено: пример.ttf')")
        add('toast in (300ms)', fr)
        settle(pg, 3500)
        # ---- export flow (timer driven, real-time samples of the header)
        pg.evaluate("void(EX_RUN.ttf=()=>new Promise(r=>setTimeout(r,1300)))")
        box = pg.evaluate("(()=>{const b=document.querySelector('#ex-menu');const r=(b.offsetParent?b:document.querySelector('#rail-dl')).getBoundingClientRect();return {x:Math.max(0,r.left-120),y:Math.max(0,r.top-20),width:Math.min(%d,r.width+240),height:r.height+40}})()" % w)
        pg.evaluate("document.querySelector('#ex-menu').click()") if not phone else pg.evaluate("document.querySelector('#rail-dl')&&document.querySelector('#rail-dl').click()")
        settle(pg, 500)
        t0 = time.time()
        pg.evaluate("(()=>{const i=document.querySelector('#ex-list [data-x=ttf]');i&&i.click()})()")
        samples = []
        while time.time() - t0 < 5.2:
            samples.append(((time.time() - t0) * 1000, png(pg, box)))
        # resample to 30 fps by timestamp
        rs = []
        for k in range(int(5.2 * FPS)):
            tt = k * 1000.0 / FPS
            rs.append(min(samples, key=lambda s: abs(s[0] - tt))[1])
        add('export: button -> loader (after 300ms) -> success -> back (real-time samples)', rs)
        settle(pg, 500)
        # ---- home: recent card close (FLIP)
        pg.evaluate("recNote('kvadra');recNote('volt');recNote('stroka');setTab('home')")
        settle(pg, 3500)
        if pg.evaluate("!!document.querySelector('#recent .mx')"):
            pg.evaluate("document.querySelector('#recent').scrollIntoView({block:'center'})")
            settle(pg, 800)
            fr, e = capture(pg, "document.querySelector('#recent .mwrap .mx').click()")
            add('recent work: close x collapses the card, siblings slide (FLIP)', fr)
        settle(pg, 1500)
        # ---- button presses (real pointer, small clip, real-time)
        pg.evaluate("window.scrollTo(0,0)")
        sels = ['.rail .rb[data-tab=library]', '.btn.pri'] if not phone else ['.rail .rb[data-tab=library]']
        for sel2 in sels:
            if not pg.evaluate("s=>!!document.querySelector(s)&&document.querySelector(s).getBoundingClientRect().width>0", sel2):
                continue
            r = pg.evaluate("s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:Math.max(0,r.left-24),y:Math.max(0,r.top-24),width:r.width+48,height:r.height+48}}", sel2)
            pg.mouse.move(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2)
            smp = []
            t0 = time.time()
            smp.append((0, png(pg, r)))
            pg.mouse.down()
            while time.time() - t0 < 0.5:
                smp.append(((time.time() - t0) * 1000, png(pg, r)))
            pg.mouse.up()
            t1 = time.time()
            while time.time() - t1 < 0.7:
                smp.append(((time.time() - t0) * 1000, png(pg, r)))
            pg.mouse.move(2, 2)
            add('button press / release: ' + sel2, [s[1] for s in smp], 12)
        # ---- done
        sheet(vid, tag, clips)
        if errs:
            print('PAGE ERRORS', tag, errs[:3])
        return clips
    finally:
        b.close()


def sheet(vid, tag, clips):
    """contact sheet per variant: one row per clip, 8 evenly spaced frames"""
    cols = 8
    thumbw = 200 if '390' not in tag else 120
    rows = []
    for title, frames, fps in clips:
        idx = [int(i * (len(frames) - 1) / (cols - 1)) for i in range(cols)]
        ims = []
        for i in idx:
            f = frames[i]
            ims.append(f.resize((thumbw, int(f.height * thumbw / f.width))))
        rh = max(i.height for i in ims)
        row = Image.new('RGB', (cols * (thumbw + 4), rh + 22), (24, 24, 28))
        d = ImageDraw.Draw(row)
        d.text((4, 3), title[:110], font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12), fill=(235, 235, 240))
        for k, im in enumerate(ims):
            row.paste(im, (k * (thumbw + 4), 20))
        rows.append(row)
    # split in sheets of 6 rows
    per = 6
    for s in range(0, len(rows), per):
        part = rows[s:s + per]
        H = sum(r.height + 4 for r in part)
        im = Image.new('RGB', (part[0].width, H), (12, 12, 14))
        y = 0
        for r in part:
            im.paste(r, (0, y))
            y += r.height + 4
        name = os.path.join(LOGS, f"motion_contact_{tag.replace(' ', '_')}_{s // per + 1}.png")
        im.save(name)
        print('contact sheet', name)
    vid.append((tag, clips))


def write_video(vid, path):
    d = os.path.join(OUT, 'v')
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    n = 0
    sizes = {}
    # fixed canvas per variant, 30 fps output; clips with other fps are resampled
    lst = []
    for tag, clips in vid:
        w0 = None
        for title, frames, fps in clips:
            step = fps / float(FPS)
            m = max(1, int(round(len(frames) * FPS / fps)))
            for k in range(m):
                fr = frames[min(len(frames) - 1, int(k * step))]
                if fr.width < 400:      # small clips are centred on a 1440x900 / 390x844 stage
                    canvas = Image.new('RGB', (1440 if '390' not in tag else 390, 900 if '390' not in tag else 844), (20, 20, 24))
                    sc = min(canvas.width / fr.width, 400 / fr.height, 3)
                    fr2 = fr.resize((int(fr.width * sc), int(fr.height * sc)), Image.LANCZOS)
                    canvas.paste(fr2, ((canvas.width - fr2.width) // 2, (canvas.height - fr2.height) // 2))
                    fr = canvas
                elif fr.height < 300:
                    canvas = Image.new('RGB', (1440, 900), (20, 20, 24))
                    sc = min(canvas.width / fr.width, 3)
                    fr2 = fr.resize((int(fr.width * sc), int(fr.height * sc)), Image.LANCZOS)
                    canvas.paste(fr2, ((canvas.width - fr2.width) // 2, (canvas.height - fr2.height) // 2))
                    fr = canvas
                fr = caption(fr, tag, title)
                if fr.size != (1440, 900) and fr.size != (390, 844):
                    fr = fr.resize((1440, 900))
                fr.save(os.path.join(d, f'{n:06d}.png'))
                n += 1
            # hold: 6 frames between clips
            for _ in range(6):
                os.link(os.path.join(d, f'{n-1:06d}.png'), os.path.join(d, f'{n:06d}.png'))
                n += 1
    # two sizes: pad phone variant onto the desktop canvas (side by side not needed: pillarbox)
    files = sorted(os.listdir(d))
    big = (1440, 900)
    for f in files:
        im = Image.open(os.path.join(d, f))
        if im.size != big:
            c = Image.new('RGB', big, (16, 16, 18))
            sc = big[1] / im.height
            im2 = im.resize((int(im.width * sc), big[1]), Image.LANCZOS)
            c.paste(im2, ((big[0] - im2.width) // 2, 0))
            im = c
        im.save(os.path.join(d, f))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(d, '%06d.png'), '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', path], check=True)
    return n


if __name__ == '__main__':
    os.makedirs(LOGS, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(KEEP, exist_ok=True)
    vid, meas = [], []
    variants = [(1440, 900, 'light'), (1440, 900, 'dark'), (390, 844, 'light'), (390, 844, 'dark')]
    if QUICK:
        variants = variants[:1]
    with sync_playwright() as p:
        for i, (w, h, th) in enumerate(variants):
            t0 = time.time()
            run_variant(p, w, h, th, vid, meas if (i == 0 or (w == 1440 and th == 'dark')) and w == 1440 else None)
            print('variant', w, th, f'{time.time()-t0:.0f}s', flush=True)
    path = os.path.join(LOGS, 'motion_demo.mp4')
    n = write_video(vid, path)
    shutil.copy(path, os.path.join(KEEP, 'motion_demo.mp4'))
    for f in os.listdir(LOGS):
        if f.startswith('motion_contact_'):
            shutil.copy(os.path.join(LOGS, f), os.path.join(KEEP, f))
    with open(os.path.join(LOGS, 'motion_measure.txt'), 'w') as f:
        f.write('\n'.join(meas) + '\n')
    shutil.copy(os.path.join(LOGS, 'motion_measure.txt'), os.path.join(KEEP, 'motion_measure.txt'))
    print('\n'.join(meas))
    print(f'video {path} frames {n}')
