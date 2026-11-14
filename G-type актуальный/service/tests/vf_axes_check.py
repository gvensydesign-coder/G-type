# usage: python3 tests/vf_axes_check.py <vf.ttf> <static_dir> [out_dir]
# 1) fvar/avar/STAT sanity and Russian instance names; 2) instancer at every static point vs the static build (rasterised XOR);
# 3) random design-space points: topology (components, holes) of sample glyphs equals the default instance.
import sys, os, json
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
vf, sd = sys.argv[1], sys.argv[2]
outd = sys.argv[3] if len(sys.argv) > 3 else '/tmp/vfax'
os.makedirs(outd, exist_ok=True)
GL = 'HOnoaegsBRKЖжыЯбфЮ&@%80'
SZ = 160
tt = TTFont(vf); probs = []
for t in ('fvar', 'avar', 'STAT', 'HVAR', 'gvar'):
    if t not in tt: probs.append('no ' + t)
axes = [a.axisTag for a in tt['fvar'].axes]
names = tt['name']
ru = [r for r in names.names if r.langID == 0x419]
if not ru: probs.append('no Russian names')
inst = [names.getDebugName(i.subfamilyNameID) for i in tt['fvar'].instances]
if len(set(inst)) != len(inst): probs.append('duplicate instance names')
def full(loc):
    return {a.axisTag: loc.get(a.axisTag, a.defaultValue) for a in tt['fvar'].axes}
def mkinst(loc, fn):
    f = instancer.instantiateVariableFont(TTFont(vf), full(loc), inplace=False)
    f.save(fn); return fn
def render(fn, ch):
    f = ImageFont.truetype(fn, SZ)
    im = Image.new('L', (SZ * 2, SZ * 2), 0); ImageDraw.Draw(im).text((SZ // 2, SZ * 3 // 2), ch, font=f, fill=255, anchor='ls')
    return np.array(im) > 127
def topo(a):
    lab, n = ndimage.label(a); lab2, h = ndimage.label(~a)
    big = lambda L, k: sum(1 for i in range(1, k + 1) if (L == i).sum() >= 40)   # ignore sliver-size pixel noise
    return big(lab, n), big(lab2, h) - 1
pts = json.load(open(os.path.join(sd, 'points.json')))
worst = {}
for i, p in enumerate(pts):
    loc = {k: p[k] for k in ('wght', 'wdth', 'opsz', 'slnt') if k in axes}
    fn = mkinst(loc, os.path.join(outd, 'i%d.ttf' % i))
    stat = os.path.join(sd, p['file']); diffs = []
    for ch in GL:
        a, b = render(fn, ch), render(stat, ch)
        u = (a | b).sum() or 1
        diffs.append((a ^ b).sum() / u)
    d = float(np.mean(diffs)); m = float(np.max(diffs))
    worst.setdefault(p['kind'], []).append((d, m, loc))
tol = {'named': (0.06, 0.22), 'opsz': (0.08, 0.25), 'slnt': (0.08, 0.25), 'mid': (0.12, 0.30), 'rand': (0.15, 0.50)}
if os.path.basename(vf).startswith('codex'): tol['rand'] = (0.25, 0.50)  # dense uncial: paramLimits clamp the stem steeply in narrow+heavy, interpolation between corners is looser
for k, L in worst.items():
    md = max(x[0] for x in L); mm = max(x[1] for x in L)
    ok = md <= tol[k][0] and mm <= tol[k][1]
    print('static-vs-instance %-5s n=%d meanXOR<=%.3f maxXOR=%.3f %s' % (k, len(L), md, mm, 'ok' if ok else 'BAD ' + str(max(L, key=lambda x: x[1])[2])))
    if not ok: probs.append('xor ' + k)
# topology on the 20 random design-space points: components/holes of the instance equal those of the static build at the same point
badt = 0
for i, p in enumerate(pts):
    if p['kind'] != 'rand': continue
    fn = os.path.join(outd, 'i%d.ttf' % i); stat = os.path.join(sd, p['file'])
    for ch in GL:
        ta, tb = topo(render(fn, ch)), topo(render(stat, ch))
        if ta != tb:
            badt += 1; print('topology differs', ch, {k: p[k] for k in ('wght', 'wdth', 'opsz', 'slnt')}, 'instance', ta, 'static', tb)
print('topology random points 20 glyphs', len(GL), 'bad', badt)
if badt: probs.append('topology')
print(os.path.basename(vf), 'axes', axes, 'instances', len(inst), 'ru', len(ru), probs or 'OK')
sys.exit(1 if probs else 0)
