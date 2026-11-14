"""xform: shared transform handles (ui_xform_x1.js) — draw (select tool), pen extras, custom glyph, imported glyph.
Core checks per mode: corner scale x1.5, Shift = proportional, edge = stretch one axis, rotate 45 deg (point coordinates), undo/redo, Esc cancels, numeric W/H/angle, mirror."""
import io, os, sys, math, json
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, LOGS, shot as _shot
from e2e_draw import setup, Draw

QA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'qa_XF')
os.environ.setdefault('GT_SHOTS', '')


def near(a, b, tol=0.6):
    return abs(a - b) <= tol


class DrawXF:
    """handle-level helpers for the draw view"""
    def __init__(self, p):
        self.s, self.d = setup(p); self.pg = self.s.pg
        self.sc = self.pg.evaluate("GT_DRAW._t.V.s")

    def handle(self, kind, i=0):
        return self.pg.evaluate("""([k,i])=>{const r=document.getElementById('dr-cv').getBoundingClientRect(),g=GT_DRAW._t.xf().geom();
          const p=k==='c'?g.corners[i]:k==='e'?g.edges[i]:g.rot;return [r.left+p[0],r.top+p[1]]}""", [kind, i])

    def bb(self, idx=None):
        return self.pg.evaluate("""(idx)=>{const t=GT_DRAW._t,L=idx==null?t.selAll():idx;let b=null;
          for(const i of L){const q=impBBox(t.cur.items[i].cs);b=b?{x0:Math.min(b.x0,q.x0),y0:Math.min(b.y0,q.y0),x1:Math.max(b.x1,q.x1),y1:Math.max(b.y1,q.y1)}:q;}
          return b?[b.x0,b.y0,b.x1,b.y1].map(v=>Math.round(v*100)/100):null}""", idx)

    def nodes(self, i=0):
        return self.pg.evaluate("GT_DRAW._t.cur.items[%d].cs.flatMap(c=>c.nodes.map(n=>[n.x,n.y]))" % i)

    def drag(self, start, dx, dy, shift=False, alt=False, steps=6, esc=False, up=True):
        pg = self.pg
        pg.mouse.move(*start)
        if shift: pg.keyboard.down('Shift')
        if alt: pg.keyboard.down('Alt')
        pg.mouse.down()
        for k in range(1, steps + 1):
            pg.mouse.move(start[0] + dx * self.sc * k / steps, start[1] - dy * self.sc * k / steps)
            if esc and k == steps // 2:
                pg.keyboard.press('Escape')
        if up: pg.mouse.up()
        if shift: pg.keyboard.up('Shift')
        if alt: pg.keyboard.up('Alt')
        pg.wait_for_timeout(60)

    def drag_to_world(self, start, wx, wy, shift=False, steps=8):
        pg = self.pg; X, Y = self.d.w2s(wx, wy)
        pg.mouse.move(*start)
        if shift: pg.keyboard.down('Shift')
        pg.mouse.down()
        for k in range(1, steps + 1):
            pg.mouse.move(start[0] + (X - start[0]) * k / steps, start[1] + (Y - start[1]) * k / steps)
        pg.mouse.up()
        if shift: pg.keyboard.up('Shift')
        pg.wait_for_timeout(60)

    def undo_len(self): return self.pg.evaluate("GT_DRAW._t.cur.undo.length")
    def bar(self, f): return float(self.pg.input_value(f'#xf-bar-dr [data-f={f}]'))
    def setf(self, f, v):
        sel = f'#xf-bar-dr [data-f={f}]'
        self.pg.fill(sel, str(v)); self.pg.press(sel, 'Enter'); self.pg.wait_for_timeout(80)
    def shot(self, name):
        _shot(self.pg, os.path.join(QA, name))


def rot_pts(pts, cx, cy, deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


def same_pts(a, b, tol=0.8):
    ka = sorted((round(x, 0), round(y, 0)) for x, y in a); kb = sorted((round(x, 0), round(y, 0)) for x, y in b)
    return all(abs(p[0] - q[0]) <= tol and abs(p[1] - q[1]) <= tol for p, q in zip(sorted(a), sorted(b))) if len(a) == len(b) else False


def draw_core(p):
    X = DrawXF(p); pg = X.pg; d = X.d
    try:
        d.goto('Н'); d.tool('shape'); pg.click('#dr-opt [data-sh=rect]')
        d.path([(100, 100), (300, 300)], 3)
        d.tool('select'); d.click(200, 200)
        assert X.pg.evaluate("GT_DRAW._t.selAll().length") == 1
        pg.wait_for_selector('#xf-bar-dr:not([hidden])', timeout=5000)
        # 1. corner scale x1.5 (snap off for exact numbers): drag top-right corner by (+100,+100) around bottom-left
        pg.evaluate("GT_DRAW._t.D.snap=false")
        u0 = X.undo_len(); b0 = X.bb()
        X.drag(X.handle('c', 2), 100, 100)
        b1 = X.bb()
        assert all(near(u, v) for u, v in zip(b1, [100, 100, 400, 400])), ('corner x1.5', b0, b1)
        assert X.undo_len() == u0 + 1, 'one undo step per gesture'
        # 2. Shift = proportional: bbox is 300x300; drag corner +90 x, +10 y -> both scale by the larger factor
        X.drag(X.handle('c', 2), 90, 10, shift=True)
        b2 = X.bb(); w, h = b2[2] - b2[0], b2[3] - b2[1]
        assert near(w, h, 0.5) and near(w, 390, 1.0), ('shift proportional', b2)
        # 3. edge: right edge midpoint, +110 -> X stretch only
        X.drag(X.handle('e', 1), 110, 40)
        b3 = X.bb()
        assert near(b3[2] - b3[0], 500, 1.0) and near(b3[3] - b3[1], h, 0.5), ('edge stretch x only', b3)
        # 4. Alt = from centre: left-bottom corner dragged outward by 50 -> both edges move
        bA = X.bb(); X.drag(X.handle('c', 0), -50, -50, alt=True)
        bB = X.bb(); assert near(bB[0], bA[0] - 50, 1) and near(bB[2], bA[2] + 50, 1), ('alt centre', bA, bB)
        # undo / redo return the previous states
        pg.click('#dr-undo'); assert all(near(u, v, 0.3) for u, v in zip(X.bb(), bA)), 'undo'
        pg.click('#dr-redo'); assert all(near(u, v, 0.3) for u, v in zip(X.bb(), bB)), 'redo'
        # 5. Esc cancels the gesture
        u1 = X.undo_len(); bc = X.bb()
        X.drag(X.handle('c', 2), 80, 80, esc=True)
        assert all(near(u, v, 0.3) for u, v in zip(X.bb(), bc)) and X.undo_len() == u1, ('esc cancel', bc, X.bb(), u1, X.undo_len())
        # 6. numeric fields: W keeps left/bottom, H keeps bottom
        X.setf('w', 240); bw = X.bb(); assert near(bw[2] - bw[0], 240, 0.6) and near(bw[0], bc[0]), ('W field', bw)
        X.setf('h', 180); bh = X.bb(); assert near(bh[3] - bh[1], 180, 0.6) and near(bh[1], bc[1]), ('H field', bh)
        # 7. rotate 45 via the rotation handle: node coordinates must equal an exact rotation about the bbox centre
        bb = X.bb(); cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2; n0 = X.nodes(); u2 = X.undo_len()
        X.drag_to_world(X.handle('r'), cx + 300 * math.cos(math.radians(135)), cy + 300 * math.sin(math.radians(135)))
        n1 = X.nodes()
        assert same_pts(n1, rot_pts(n0, cx, cy, 45)), ('rotate 45', n0, n1)
        assert near(X.bar('a'), 45, 0.01) and X.undo_len() == u2 + 1, ('angle field', X.bar('a'))
        # Shift snaps to 15 deg steps: 45 + 26 = 71 -> 75
        bb = X.bb(); cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        start = X.handle('r')
        # world position of the handle -> angle around the centre
        hw = pg.evaluate("(()=>{const t=GT_DRAW._t,g=t.xf().geom();return [t.V.x0+g.rot[0]/t.V.s, t.V.yt-g.rot[1]/t.V.s]})()")
        a_h = math.degrees(math.atan2(hw[1] - cy, hw[0] - cx))
        X.drag_to_world(start, cx + 300 * math.cos(math.radians(a_h + 26)), cy + 300 * math.sin(math.radians(a_h + 26)), shift=True)
        assert near(X.bar('a'), 75, 0.01), ('shift 15deg snap', X.bar('a'))
        # angle field back to 0 restores the original rectangle; then 90 swaps W/H
        X.setf('a', 0); bz = X.bb(); assert near(bz[2] - bz[0], 240, 1.2) and near(bz[3] - bz[1], 180, 1.2), ('angle 0', bz)
        X.setf('a', 90); bq = X.bb(); assert near(bq[2] - bq[0], 180, 1.2) and near(bq[3] - bq[1], 240, 1.2), ('angle 90', bq)
        pg.click('#xf-bar-dr [data-a=r90]'); bq2 = X.bb(); assert near(bq2[2] - bq2[0], 240, 1.2), ('rot90 button', bq2)
        # 8. mirror: asymmetric triangle; the ONE mirror button (#dr-mir) lives in the transform bar while a selection is active
        pg.evaluate("GT_DRAW._t.cur.items.splice(0,1);GT_DRAW._t.setSel([])")
        d.tool('shape'); pg.click('#dr-opt [data-sh=tri]'); d.path([(100, 100), (300, 300)], 3)
        d.tool('select'); d.click(130, 140)
        assert pg.evaluate("!!document.querySelector('#xf-bar-dr #dr-mir')"), 'mirror button moved into the bar'
        t0 = sorted(X.nodes()); b = X.bb()
        pg.click('#dr-mir')
        t1 = sorted(X.nodes()); assert X.bb() == b
        assert same_pts(t1, [(b[0] + b[2] - x, y) for x, y in t0]), ('mirror h', t0, t1)
        pg.click('#xf-bar-dr [data-a=fv]'); t2 = sorted(X.nodes())
        assert same_pts(t2, [(b[0] + b[2] - x, b[1] + b[3] - y) for x, y in t0]), ('mirror v', t2)
        pg.click('#dr-undo'); pg.click('#dr-undo')
        assert same_pts(sorted(X.nodes(0)), t0), 'undo mirror'
        # 9. grid snap: with snap on the dragged right edge lands on a grid line (cell 100)
        pg.evaluate("GT_DRAW._t.D.snap=true")
        hw = pg.evaluate("(()=>{const t=GT_DRAW._t,g=t.xf().geom();return [t.V.x0+g.edges[1][0]/t.V.s, t.V.yt-g.edges[1][1]/t.V.s]})()")
        X.drag_to_world(X.handle('e', 1), 372 + 7 / X.sc, hw[1])
        assert near(X.bb()[2], 400, 0.6), ('snap to grid', X.bb())
        pg.evaluate("GT_DRAW._t.D.snap=false")
        # 10. multi-select: Shift+click adds a shape; the group scales around its common bbox
        d.tool('shape'); pg.click('#dr-opt [data-sh=rect]'); d.path([(100, 450), (200, 550)], 3)
        d.tool('select'); d.click(130, 270)
        assert pg.evaluate("GT_DRAW._t.selAll().length") == 1
        pg.keyboard.down('Shift'); d.click(150, 500); pg.keyboard.up('Shift')
        assert pg.evaluate("GT_DRAW._t.selAll().length") == 2
        gb = X.bb(); X.pg.mouse.move(*X.handle('c', 2)); gw = gb[2] - gb[0]
        X.drag(X.handle('c', 2), gw * 0.5, 0)
        gb2 = X.bb(); assert near(gb2[2] - gb2[0], gw * 1.5, 1.0) and near(gb2[3] - gb2[1], gb[3] - gb[1], 0.6), ('group scale x', gb, gb2)
        r2 = X.bb([1]); assert r2[2] - r2[0] > 100 * 1.4, ('second shape scaled with the group', r2)
        # Shift+click on a selected shape removes it from the group; marquee selects both
        pg.keyboard.down('Shift'); d.click(150, 500); pg.keyboard.up('Shift')
        assert pg.evaluate("GT_DRAW._t.selAll().length") == 1
        pg.evaluate("GT_DRAW._t.setSel([])")
        sx, sy = d.w2s(-80, 760); ex, ey = d.w2s(560, 20)
        pg.mouse.move(sx, sy); pg.mouse.down(); pg.mouse.move((sx + ex) / 2, (sy + ey) / 2); pg.mouse.move(ex, ey); pg.mouse.up()
        assert pg.evaluate("GT_DRAW._t.selAll().length") == 2, 'marquee'
        pg.keyboard.press('Control+a'); assert pg.evaluate("GT_DRAW._t.selAll().length") == 2
        # arrows move the group (Shift x10 when the grid snap is off)
        gb3 = X.bb(); pg.keyboard.press('ArrowRight'); pg.keyboard.press('Shift+ArrowUp')
        gb4 = X.bb(); assert near(gb4[0], gb3[0] + 1, 0.1) and near(gb4[1], gb3[1] + 10, 0.1), ('arrows', gb3, gb4)
        assert not s_errs(X), s_errs(X)
    finally:
        X.s.close()
    return 'corner x1.5, shift, edge, alt, rot45, 15deg snap, esc, undo/redo, W/H/angle, mirror, snap, group'


def s_errs(X):
    return [e for e in X.s.errs if 'ERR_' not in e][:3]


class PenXF:
    """handle-level helpers for the editor «Перо» mode (stage canvas)"""
    def __init__(self, p):
        from common import Session
        self.s = Session(p, 'xfpen'); self.pg = self.s.pg
        self.s.open_font('volt')
        self.s.js("selectGlyph('n')")
        self.pg.wait_for_function("S.sel==='n' && !S.live", timeout=20000)
        self.pg.click('[data-mode=pen]')
        self.pg.wait_for_function("S.mode==='pen'", timeout=10000)
        self.sc = self.s.js("V.sc")

    def w2s(self, x, y):
        return self.pg.evaluate("""([x,y])=>{const s=skMap().s(x,y),r=$('#stage').getBoundingClientRect();return [r.left+s[0],r.top+s[1]]}""", [x, y])

    def draw_fig(self, pts):
        self.pg.click('#pn-tool [data-pnt=f]'); self.pg.click('#pn-op [data-pno=add]')
        for x, y in pts:
            self.pg.mouse.click(*self.w2s(x, y)); self.pg.wait_for_timeout(80)
        self.pg.keyboard.press('Enter'); self.pg.wait_for_timeout(250)

    def select(self, id):
        """click the first node of element id: handles are shown only for an element picked by a click"""
        n = self.pg.evaluate("(id)=>{const n=decoAbs(penEl(id),penM())[0];return [n.x,n.y]}", id)
        self.pg.mouse.click(*self.w2s(*n)); self.pg.wait_for_timeout(150)

    def handle(self, kind, i=0):
        return self.pg.evaluate("""([k,i])=>{const r=$('#stage').getBoundingClientRect(),g=xfPen().geom();
          const p=k==='c'?g.corners[i]:k==='e'?g.edges[i]:g.rot;return [r.left+p[0],r.top+p[1]]}""", [kind, i])

    def pts(self, ids=None):
        return self.pg.evaluate("""(ids)=>{const M=penM();ids=ids||penGroupIds();const o=[];for(const id of ids)for(const n of decoAbs(penEl(id),M))o.push([n.x,n.y]);return o}""", ids)

    def bb(self):
        return [round(v, 2) for v in self.pg.evaluate("""(()=>{const M=penM();let b=null;for(const id of penGroupIds())b=XF.union(b,penElBox(penEl(id),M));return b?[b.x0,b.y0,b.x1,b.y1]:null})()""")]

    def drag(self, start, dx, dy, shift=False, alt=False, steps=6, esc=False):
        pg = self.pg; pg.mouse.move(*start); self.sc = self.s.js("V.sc")
        if shift: pg.keyboard.down('Shift')
        if alt: pg.keyboard.down('Alt')
        pg.mouse.down()
        for k in range(1, steps + 1):
            pg.mouse.move(start[0] + dx * self.sc * k / steps, start[1] - dy * self.sc * k / steps)
            if esc and k == steps // 2: pg.keyboard.press('Escape')
        pg.mouse.up()
        if shift: pg.keyboard.up('Shift')
        if alt: pg.keyboard.up('Alt')
        pg.wait_for_timeout(120)

    def drag_to_world(self, start, wx, wy, shift=False, steps=8):
        pg = self.pg; X, Y = self.w2s(wx, wy); pg.mouse.move(*start)
        if shift: pg.keyboard.down('Shift')
        pg.mouse.down()
        for k in range(1, steps + 1):
            pg.mouse.move(start[0] + (X - start[0]) * k / steps, start[1] + (Y - start[1]) * k / steps)
        pg.mouse.up()
        if shift: pg.keyboard.up('Shift')
        pg.wait_for_timeout(120)

    def bar(self, f): return float(self.pg.input_value(f'#xf-bar-pn [data-f={f}]'))
    def setf(self, f, v):
        sel = f'#xf-bar-pn [data-f={f}]'; self.pg.fill(sel, str(v)); self.pg.press(sel, 'Enter'); self.pg.wait_for_timeout(200)
    def undo_len(self): return self.pg.evaluate("undoStack.length")
    def deco(self): return self.pg.evaluate("JSON.stringify(penList())")


def pen_core(p):
    X = PenXF(p); pg = X.pg; s = X.s
    try:
        W = s.js("rawGlyph().w")
        X.draw_fig([(W - 110, 110), (W + 50, 110), (W + 50, 250)])   # right triangle on the right foot of n
        assert s.js("penGroupIds().length") == 0, 'no handles right after drawing (they would catch the next click)'
        X.select('e1')
        assert s.js("penGroupIds().join()") == 'e1', 'figure selected by a click'
        pg.wait_for_selector('#xf-bar-pn:not([hidden])', timeout=5000)
        # 1. corner scale x1.5 about the opposite corner
        b0 = X.bb(); u0 = X.undo_len()
        X.drag(X.handle('c', 2), (b0[2] - b0[0]) * 0.5, (b0[3] - b0[1]) * 0.5)
        b1 = X.bb()
        assert near(b1[2] - b1[0], (b0[2] - b0[0]) * 1.5, 1.2) and near(b1[3] - b1[1], (b0[3] - b0[1]) * 1.5, 1.2) and near(b1[0], b0[0], 0.3) and near(b1[1], b0[1], 0.3), ('corner x1.5', b0, b1)
        assert X.undo_len() == u0 + 1, ('one undo step', u0, X.undo_len())
        # 2. Shift = proportional
        w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
        X.drag(X.handle('c', 2), 30, 3, shift=True)
        b2 = X.bb(); assert near((b2[2] - b2[0]) / (b2[3] - b2[1]), w1 / h1, 0.02) and (b2[2] - b2[0]) > w1 + 15, ('shift proportional', b1, b2)
        # 3. edge: right edge only changes X
        X.drag(X.handle('e', 1), 40, 25)
        b3 = X.bb(); assert near(b3[3] - b3[1], b2[3] - b2[1], 0.8) and (b3[2] - b3[0]) > (b2[2] - b2[0]) + 25, ('edge stretch x', b2, b3)
        # undo / redo
        pg.click('#undo'); assert all(near(u, v, 0.3) for u, v in zip(X.bb(), b2)), ('undo', X.bb(), b2)
        pg.click('#redo'); assert all(near(u, v, 0.3) for u, v in zip(X.bb(), b3)), 'redo'
        # Esc cancels
        u1 = X.undo_len(); d1 = X.deco()
        X.drag(X.handle('c', 2), 60, 60, esc=True)
        assert X.deco() == d1 and X.undo_len() == u1, ('esc', u1, X.undo_len())
        # 4. numeric W / H keep left / bottom
        bn = X.bb(); X.setf('w', 200); bw = X.bb()
        assert near(bw[2] - bw[0], 200, 1.2) and near(bw[0], bn[0], 0.5), ('W', bw)
        X.setf('h', 130); bh = X.bb(); assert near(bh[3] - bh[1], 130, 1.2) and near(bh[1], bn[1], 0.8), ('H', bh)
        # 5. rotate 45 through the handle: element nodes equal an exact rotation about the bbox centre
        bb = X.bb(); cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2; n0 = X.pts()
        X.drag_to_world(X.handle('r'), cx + 250 * math.cos(math.radians(135)), cy + 250 * math.sin(math.radians(135)))
        n1 = X.pts(); exp = rot_pts(n0, cx, cy, 45)
        assert all(abs(a[0] - b[0]) <= 1.2 and abs(a[1] - b[1]) <= 1.2 for a, b in zip(n1, exp)), ('rot45', n0, n1, exp)
        assert near(X.bar('a'), 45, 0.01), ('angle field', X.bar('a'))
        X.setf('a', 0); n2 = X.pts()
        assert all(abs(a[0] - b[0]) <= 1.5 and abs(a[1] - b[1]) <= 1.5 for a, b in zip(n2, n0)), ('angle 0 returns', n0, n2)
        # 6. mirror about the bbox centre
        bm = X.bb(); t0 = X.pts(); pg.click('#xf-bar-pn [data-a=fh]'); t1 = X.pts()
        assert all(abs((bm[0] + bm[2] - a[0]) - b[0]) <= 1.2 and abs(a[1] - b[1]) <= 1.2 for a, b in zip(t0, t1)), ('mirror h', t0, t1)
        pg.click('#xf-bar-pn [data-a=r90]'); assert near(X.bb()[2] - X.bb()[0], bm[3] - bm[1], 2.0), ('rot90', X.bb(), bm)
        # 7. multi-select: a second figure; Shift+click on a node of the first adds it; the group scales together
        X.draw_fig([(80, 80), (230, 80), (230, 200)])
        X.select('e2'); assert s.js("penGroupIds().join()") == 'e2'
        node = X.w2s(*s.js("(()=>{const M=penM(),n=decoAbs(penEl('e1'),M)[0];return [n.x,n.y]})()"))
        pg.keyboard.down('Shift'); pg.mouse.click(*node); pg.keyboard.up('Shift'); pg.wait_for_timeout(150)
        assert s.js("penGroupIds().join()") == 'e2,e1', s.js("penGroupIds().join()")
        g0 = X.bb(); X.drag(X.handle('c', 2), -(g0[2] - g0[0]) * 0.1, 0)
        g1 = X.bb(); assert (g1[2] - g1[0]) < (g0[2] - g0[0]) - 30 and near(g1[0], g0[0], 0.3) and near(g1[3] - g1[1], g0[3] - g0[1], 6), ('group scale (right edge snaps to the guide)', g0, g1)
        # topology guard: a transform that would detach an element from the letter is rolled back (one toast, state untouched)
        d1 = X.deco(); u3 = X.undo_len()
        X.drag(X.handle('c', 2), (g1[2] - g1[0]) * 1.2, 0)
        assert X.deco() == d1 and X.undo_len() == u3, 'detaching transform rolled back'
        errs = [e for e in s.errs if 'ERR_' not in e][:3]
        assert not errs, errs
    finally:
        s.close()
    return 'figure on n: corner x1.5, shift, edge, rot45, esc, undo/redo, W/H/angle, mirror, group'


class CuXF(PenXF):
    """«Свой знак»: strokes of a new glyph on Liniya, same handle helpers (bar id xf-bar-cu)"""
    def __init__(self, p):
        from common import Session
        self.s = Session(p, 'xfcu'); self.pg = self.s.pg; pg = self.pg
        self.s.open_font('liniya')
        pg.click('#cu-add'); pg.wait_for_selector('#cu-ch', state='visible', timeout=10000)
        pg.fill('#cu-ch', 'ѣ'); pg.wait_for_function("document.getElementById('cu-msg').textContent.length>0", timeout=5000)
        pg.click('#cu-go'); pg.wait_for_function("S.mode==='draw' && !!document.getElementById('cu-done')", timeout=10000)
        self.sc = self.s.js("V.sc")

    def handle(self, kind, i=0):
        return self.pg.evaluate("""([k,i])=>{const r=$('#stage').getBoundingClientRect(),g=xfCu().geom();
          const p=k==='c'?g.corners[i]:k==='e'?g.edges[i]:g.rot;return [r.left+p[0],r.top+p[1]]}""", [kind, i])

    def pts(self, ids=None):
        return self.pg.evaluate("cuRec().skel.flatMap(st=>st.dot?[[st.x,st.y]]:st.nodes.map(n=>[n.x,n.y]))")

    def bb(self):
        return [round(v, 2) for v in self.pg.evaluate("""(()=>{const r=cuRec();let b=null;for(const i of cuGroupIdx())b=XF.union(b,cuStrokeBox(r.skel[i]));return b?[b.x0,b.y0,b.x1,b.y1]:null})()""")]

    def bar(self, f): return float(self.pg.input_value(f'#xf-bar-cu [data-f={f}]'))
    def setf(self, f, v):
        sel = f'#xf-bar-cu [data-f={f}]'; self.pg.fill(sel, str(v)); self.pg.press(sel, 'Enter'); self.pg.wait_for_timeout(200)
    def deco(self): return self.pg.evaluate("JSON.stringify(cuRec().skel)")
    def click(self, x, y, shift=False):
        if shift: self.pg.keyboard.down('Shift')
        self.pg.mouse.click(*self.w2s(x, y)); self.pg.wait_for_timeout(120)
        if shift: self.pg.keyboard.up('Shift')


def custom_core(p):
    X = CuXF(p); pg = X.pg; s = X.s
    try:
        xh = s.js("cur().p.xh")
        s.js("S.snap=false;window.gstate=()=>({vg:[],hg:[]})")   # exact numbers: no step, no guide magnet (snapping itself is covered in the draw check)
        X.click(60, xh * 0.55); X.click(60, 0); X.click(180, 0); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)     # stroke 1: L
        X.click(30, xh * 0.3); X.click(110, xh * 0.3); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)        # stroke 2: bar crossing the stem
        assert s.js("cuRec().skel.length") == 2
        # selection: click a node, Shift+click a node of the other stroke -> group of two (Ctrl+A does the same)
        assert s.js("cuGroupIdx().length") == 0, 'no handles right after drawing'
        X.click(60, 0); assert s.js("cuGroupIdx().join()") == '0', s.js("cuGroupIdx().join()")
        X.click(110, xh * 0.3, shift=True); assert s.js("cuGroupIdx().join()") == '0,1', s.js("cuGroupIdx().join()")
        pg.keyboard.press('Escape'); pg.keyboard.press('Control+a'); assert s.js("cuGroupIdx().length") == 2, 'Ctrl+A'
        pg.wait_for_selector('#xf-bar-cu:not([hidden])', timeout=5000)
        # 1. corner x1.5
        b0 = X.bb(); u0 = X.undo_len()
        X.drag(X.handle('c', 2), (b0[2] - b0[0]) * 0.5, (b0[3] - b0[1]) * 0.5)
        b1 = X.bb()
        assert near(b1[2] - b1[0], (b0[2] - b0[0]) * 1.5, 1.5) and near(b1[3] - b1[1], (b0[3] - b0[1]) * 1.5, 1.5), ('corner x1.5', b0, b1)
        assert X.undo_len() == u0 + 1, ('one undo step', u0, X.undo_len())
        # 2. Shift proportional
        w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
        X.drag(X.handle('c', 2), 40, 2, shift=True); b2 = X.bb()
        assert near((b2[2] - b2[0]) / (b2[3] - b2[1]), w1 / h1, 0.02) and b2[2] - b2[0] > w1 + 20, ('shift', b1, b2)
        # 3. edge: X only
        X.drag(X.handle('e', 1), 60, 30); b3 = X.bb()
        assert near(b3[3] - b3[1], b2[3] - b2[1], 1.0) and b3[2] - b3[0] > b2[2] - b2[0] + 40, ('edge', b2, b3)
        # undo / redo (the strokes live in the same undo stack)
        pg.click('#undo'); assert all(near(u, v, 0.4) for u, v in zip(X.bb(), b2)), ('undo', X.bb(), b2)
        pg.click('#redo'); assert all(near(u, v, 0.4) for u, v in zip(X.bb(), b3)), ('redo', X.bb(), b3)
        # Esc cancels the gesture
        u1 = X.undo_len(); d1 = X.deco()
        X.drag(X.handle('c', 2), 70, 70, esc=True)
        assert X.deco() == d1 and X.undo_len() == u1, 'esc'
        # 4. numeric W/H
        bn = X.bb(); X.setf('w', 260); bw = X.bb(); assert near(bw[2] - bw[0], 260, 1.0) and near(bw[0], bn[0], 0.5), ('W', bw)
        X.setf('h', 240); bh = X.bb(); assert near(bh[3] - bh[1], 240, 1.0) and near(bh[1], bn[1], 0.5), ('H', bh)
        # 5. rotate 45
        bb = X.bb(); cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2; n0 = X.pts()
        X.drag_to_world(X.handle('r'), cx + 250 * math.cos(math.radians(135)), cy + 250 * math.sin(math.radians(135)))
        n1 = X.pts(); exp = rot_pts(n0, cx, cy, 45)
        assert all(abs(a[0] - b[0]) <= 1.2 and abs(a[1] - b[1]) <= 1.2 for a, b in zip(n1, exp)), ('rot45', n0, n1, exp)
        assert near(X.bar('a'), 45, 0.01)
        X.setf('a', 0); n2 = X.pts(); assert all(abs(a[0] - b[0]) <= 1.0 and abs(a[1] - b[1]) <= 1.0 for a, b in zip(n2, n0)), 'angle 0 returns'
        # 6. mirror
        bm = X.bb(); t0 = X.pts(); pg.click('#xf-bar-cu [data-a=fh]'); t1 = X.pts()
        assert all(abs((bm[0] + bm[2] - a[0]) - b[0]) <= 1.0 and abs(a[1] - b[1]) <= 1.0 for a, b in zip(t0, t1)), 'mirror h'
        errs = [e for e in s.errs if 'ERR_' not in e][:3]
        assert not errs, errs
    finally:
        s.close()
    return 'ѣ on Liniya, 2 strokes: corner x1.5, shift, edge, rot45, esc, undo/redo, W/H/angle, mirror, Shift+click, Ctrl+A'


def import_core(p):
    from e2e_import import make_fixtures, CHARS
    from common import Session
    fs = make_fixtures(); s = Session(p, 'xfimp'); pg = s.pg
    try:
        pg.click('#imp-card'); pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
        pg.set_input_files('#imp-files', fs)
        pg.wait_for_function(f"Object.keys(IMP.glyphs).length>={len(CHARS)} && !IU.pending.length", timeout=60000)
        pg.click('#imp-build')
        pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)
        s.js("selectGlyph('H')"); pg.wait_for_function("S.sel==='H' && !S.live", timeout=20000)
        pg.click('[data-mode=points]'); pg.wait_for_function("S.mode==='points'", timeout=10000)
        pg.wait_for_selector('#ie-xf', timeout=10000); pg.click('#ie-xf')
        pg.wait_for_selector('#xf-bar-im:not([hidden])', timeout=5000)
        bb = lambda: s.js("(()=>{const b=impBBox(rawGlyph().cs.filter(c=>!c.off&&c.op!=='sub'));return [b.x0,b.y0,b.x1,b.y1]})()")
        b0 = bb(); u0 = s.js("undoStack.length")
        g = pg.evaluate("""()=>{const r=$('#stage').getBoundingClientRect(),g=xfImp().geom();return [r.left+g.corners[2][0],r.top+g.corners[2][1]]}""")
        sc = s.js("V.sc"); pg.mouse.move(*g); pg.mouse.down()
        for k in range(1, 7): pg.mouse.move(g[0] + 40 * sc * k / 6, g[1] - 40 * sc * k / 6)
        pg.mouse.up(); pg.wait_for_timeout(400)
        b1 = bb()
        assert (b1[2] - b1[0]) > (b0[2] - b0[0]) + 5 or (b1[3] - b1[1]) > (b0[3] - b0[1]) + 5, ('scaled', b0, b1)
        assert s.js("undoStack.length") == u0 + 1, 'one undo step'
        s.js("undo()"); pg.wait_for_timeout(300)
        b2 = bb(); assert all(near(a, b, 1.0) for a, b in zip(b0, b2)), ('undo', b0, b2)
        assert not s.errs, s.errs[:3]
        return 'H from file: corner scale, one undo step, undo restores'
    finally:
        s.close()


def main():
    return check_all([('xform', draw_core), ('xform-pen', pen_core), ('xform-custom', custom_core), ('xform-import', import_core)])


if __name__ == '__main__':
    sys.exit(main())
