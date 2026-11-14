# usage: python3 vfcheck.py <vf_dir> <fam_dir>
# For each <id>-<style>-VF.ttf in vf_dir: fvar has wght 300..900; instancer at wght 300 and 900
# has the same glyph count as the static fam file (Light / Black, same style). Prints one line per file.
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

GLY = 'HOnoaegsBRKЖжыЯбфЮ&@%80'
CUR_SZ = [160]   # hairline fonts (nit: 1-2 px strokes at 160 px) are rasterised larger so the XOR measures the shape, not sub-pixel rounding
SZ = {'nit': 480}
def _render(fn, ch, sz=160):
    sz = CUR_SZ[0]
    f = ImageFont.truetype(fn, sz)
    im = Image.new('L', (sz * 2, sz * 2), 0); ImageDraw.Draw(im).text((sz // 2, sz * 3 // 2), ch, font=f, fill=255, anchor='ls')
    return np.array(im) > 127
def xor_vs_static(vf_path, static_path, loc, tmp):
    inst = instancer.instantiateVariableFont(TTFont(vf_path), loc, inplace=False); inst.save(tmp)
    d = []
    for ch in GLY:
        a, b = _render(tmp, ch), _render(static_path, ch)
        d.append((a ^ b).sum() / max(1, (a | b).sum()))
    return float(np.mean(d)), float(np.max(d))
BASE = {'volt': 'VoltGrotesk', 'kvadra': 'KvadraSans', 'stroka': 'StrokaSans', 'codex': 'CodexUncial', 'liniya': 'Liniya', 'propis': 'PropisScript', 'pixel': 'PixelGrid', 'renessa': 'RenessaSerif', 'rotunda': 'RotundaLibros', 'ustav': 'UstavDisplay', 'nit': 'Nit', 'tyaga': 'Tyaga', 'kortes': 'Kortes'}
# pixel: the VF keeps the Regular cell topology (weight = outline offset), the static weights re-lay the cells, so instances match the family less tightly
TOL = {'nit': (0.10, 0.25), 'pixel': (0.20, 0.50), 'renessa': (0.08, 0.25), 'propis': (0.08, 0.20), 'stroka': (0.055, 0.16)}  # propis: hairline script strokes (30 u = 6 px at 200 px): the quad approximation of the static (48 pts) vs the VF (52 pts) differs by up to 8 u, italic matches at < 0.05  # renessa: round Light italic masters are refitted for point compatibility (4-8 u, hairline-thin strokes)
vf_dir, fam_dir = sys.argv[1], sys.argv[2]
bad = 0
for fn in sorted(glob.glob(os.path.join(vf_dir, '*-VF.ttf'))):
    name = os.path.basename(fn)
    fid, style = name.split('-')[0], name.split('-')[1]
    probs = []
    CUR_SZ[0] = SZ.get(fid, 160)
    vf = TTFont(fn)
    if 'fvar' not in vf:
        print(name, 'no fvar'); bad += 1; continue
    axes = {a.axisTag: (a.minValue, a.maxValue) for a in vf['fvar'].axes}
    if axes.get('wght') != (300, 900):
        probs.append('wght axis %s' % (axes.get('wght'),))
    suffix = 'Italic' if style == 'italic' else ''
    counts = {}
    for wn, w in (('Light', 300), ('Black', 900)):
        static = os.path.join(fam_dir, '%s-%s%s.ttf' % (BASE[fid], wn, suffix))
        if not os.path.exists(static):
            probs.append('missing ' + os.path.basename(static)); continue
        inst = instancer.instantiateVariableFont(TTFont(fn), {'wght': w})
        n_inst = inst['maxp'].numGlyphs
        n_static = TTFont(static)['maxp'].numGlyphs
        counts[w] = (n_inst, n_static)
        if n_inst != n_static:
            probs.append('glyphs wght%d %d!=%d' % (w, n_inst, n_static))
    # every named instance (Light/Regular/Bold/Black) vs the static family file: rasterised XOR within tolerance
    for wn, w in (('Light', 300), ('Regular', 400), ('Bold', 700), ('Black', 900)):
        static = os.path.join(fam_dir, '%s-%s%s.ttf' % (BASE[fid], wn, suffix))
        if os.path.exists(static):
            loc = {a.axisTag: a.defaultValue for a in vf['fvar'].axes}; loc['wght'] = w
            m, mx = xor_vs_static(fn, static, loc, '/tmp/_vfcheck_inst.ttf')
            tm, tx = TOL.get(fid, (0.05, 0.16))
            if m > tm or mx > tx: probs.append('xor %s %.3f/%.3f' % (wn, m, mx))
    print(name, 'axes', axes, 'glyphs', counts, probs or 'OK')
    bad += bool(probs)
print('bad', bad)
sys.exit(1 if bad else 0)
