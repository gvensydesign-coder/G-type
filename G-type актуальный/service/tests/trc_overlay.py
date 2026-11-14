"""usage: trc_overlay.py <fxdir> <dump.json> <out.png> name1,name2,... — source (faded) + traced outline + nodes (red) + handles (blue)"""
import sys, json
from PIL import Image, ImageDraw
fx, dump, out, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',')
D = json.load(open(dump))
tiles = []
for nm in names:
    base = Image.open(f'{fx}/{nm}.png' if nm.endswith('clean') else f'{fx}/{nm}.jpg').convert('RGB')
    im = Image.blend(base, Image.new('RGB', base.size, 'white'), 0.55)
    d = ImageDraw.Draw(im)
    for c in D[nm]['cs']:
        d.line([tuple(p) for p in c['poly']] + [tuple(c['poly'][0])], fill=(20, 60, 200), width=2)
        for n in c['nodes']:
            for h in ('a', 'b'):
                if n[h]: d.line([tuple(n['p']), tuple(n[h])], fill=(90, 160, 255), width=1)
        for n in c['nodes']:
            x, y = n['p']; d.rectangle([x - 4, y - 4, x + 4, y + 4], fill=(252, 71, 60))
    tiles.append(im)
W = sum(t.width for t in tiles); H = max(t.height for t in tiles)
sheet = Image.new('RGB', (W, H), 'white'); x = 0
for t in tiles: sheet.paste(t, (x, 0)); x += t.width
sheet.save(out)
