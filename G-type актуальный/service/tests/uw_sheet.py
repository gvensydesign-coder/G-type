# usage: python3 tests/uw_sheet.py <fam_dir> <famuw_dir> <FontPrefix> <out.png>
# Left: normal family weights, right: uniwidth family (same advances): rows Light/Regular/Bold/Black + Italic.
import sys
from PIL import Image, ImageDraw, ImageFont
fam, uw, pre, out = sys.argv[1:5]
rows = ['Light', 'Regular', 'Bold', 'Black', 'Italic', 'BlackItalic']
txt = 'Hamburgefonstiv Жизнь ыдЯ 1234'
S = 44
fl = ImageFont.load_default()
W = 1800; H = len(rows) * 70 + 50
im = Image.new('RGB', (W, H), (250, 250, 247)); d = ImageDraw.Draw(im)
d.text((20, 8), 'normal family', fill=(120, 120, 120), font=fl); d.text((W // 2 + 20, 8), 'uniwidth (advances = Regular)', fill=(120, 120, 120), font=fl)
for i, r in enumerate(rows):
    y = 34 + i * 70
    for col, base in enumerate((fam, uw)):
        try: f = ImageFont.truetype('%s/%s-%s.ttf' % (base, pre, r), S, layout_engine=ImageFont.Layout.RAQM)
        except Exception as e: continue
        d.text((20 + col * W // 2, y + 40), txt, font=f, fill=(20, 20, 20), anchor='ls')
        d.text((20 + col * W // 2, y - 2), r, fill=(150, 150, 150), font=fl)
    d.line([(W // 2 - 10, 0), (W // 2 - 10, H)], fill=(220, 220, 220))
im.save(out)
