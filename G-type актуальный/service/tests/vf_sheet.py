# usage: python3 tests/vf_sheet.py <vf.ttf> <out_prefix> [text]
# Axis-grid sheets: wght x wdth at opsz 12 and 72, a slnt strip and an opsz strip (whatever axes the file has).
import sys
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
fn, out = sys.argv[1], sys.argv[2]
text = sys.argv[3] if len(sys.argv) > 3 else 'Hamburgefonstiv Жизнь ыдЯ 1234'
tt = TTFont(fn)
ax = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in tt['fvar'].axes}
order = [a.axisTag for a in tt['fvar'].axes]
def setv(f, **kw):
    f.set_variation_by_axes([kw.get(t, ax[t][1]) for t in order])
def font(size):
    return ImageFont.truetype(fn, size, layout_engine=ImageFont.Layout.RAQM)
BG, FG, MUT = (250, 250, 247), (20, 20, 20), (130, 130, 130)
def sheet(path, cells, cols, size, title):
    pad = 18; lab = 15
    f = font(size); fl = ImageFont.load_default()
    # cell size from the widest line
    w = max(int(f.getlength(text)) for _, kw in cells for _ in [setv(f, **kw)]) + 2 * pad
    h = int(size * 1.35) + lab + pad
    rows = (len(cells) + cols - 1) // cols
    im = Image.new('RGB', (cols * w, rows * h + 30), BG); d = ImageDraw.Draw(im)
    d.text((pad, 8), title, fill=MUT, font=fl)
    for i, (lbl, kw) in enumerate(cells):
        x, y = (i % cols) * w, 30 + (i // cols) * h
        setv(f, **kw)
        d.text((x + pad, y + lab), text, font=f, fill=FG)
        d.text((x + pad, y + 2), lbl, fill=MUT, font=fl)
    im.save(path)
W = [300, 400, 700, 900]
if 'wdth' in ax and 'wght' in ax:
    dv = [ax['wdth'][0], ax['wdth'][1], ax['wdth'][2]]
    for op in ([12, 72] if 'opsz' in ax else [None]):
        cells = []
        for w in W:
            for dd in dv:
                kw = dict(wght=w, wdth=dd)
                if op: kw['opsz'] = op
                cells.append(('wght %d wdth %d%s' % (w, dd, (' opsz %d' % op) if op else ''), kw))
        sheet('%s_grid_opsz%s.png' % (out, op or 'x'), cells, 3, 40, fn.split('/')[-1] + ' - wght x wdth' + (' at opsz %d' % op if op else ''))
if 'slnt' in ax:
    cells = [('slnt %d wght %d' % (s, w), dict(slnt=s, wght=w)) for w in (300, 700) for s in (0, -6, -12)]
    sheet(out + '_slnt.png', cells, 3, 44, fn.split('/')[-1] + ' - slnt strip')
if 'opsz' in ax:
    cells = [('opsz %d' % o, dict(opsz=o)) for o in (8, 14, 24, 72)]
    sheet(out + '_opsz.png', cells, 2, 44, fn.split('/')[-1] + ' - opsz (same px size, text shows spacing/contrast shift)')
