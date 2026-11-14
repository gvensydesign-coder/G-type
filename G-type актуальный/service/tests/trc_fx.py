"""Raster fixtures for the image tracer: glyph polygons (tests/trc_fx.js) -> PNG + PGM, clean and photo-like variants.
usage: python3 tests/trc_fx.py <json> <outdir> [height=600]"""
import sys, os, json, random
from PIL import Image, ImageDraw, ImageChops, ImageFilter
import numpy as np

def render(glyph, H=600, pad=0.12, ss=4):
    pts = [p for c in glyph['cs'] for p in c['pts']]
    x0 = min(p[0] for p in pts); x1 = max(p[0] for p in pts); y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
    s = H * (1 - 2 * pad) / (y1 - y0)
    W = int((x1 - x0) * s + 2 * pad * H)
    im = Image.new('L', (W * ss, H * ss), 0)
    for c in glyph['cs']:
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).polygon([((p[0] - x0) * s * ss + pad * H * ss, (y1 - p[1]) * s * ss + pad * H * ss) for p in c['pts']], fill=255)
        im = ImageChops.logical_xor(im.convert('1'), m.convert('1')).convert('L')
    im = im.resize((W, H), Image.LANCZOS)
    return 255 - np.array(im, dtype=np.uint8)          # black ink on white

def photo(g, seed):
    rng = np.random.RandomState(seed)
    im = Image.fromarray(g).filter(ImageFilter.GaussianBlur(1.6))
    a = np.array(im, dtype=np.float32)
    H, W = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    light = 0.62 + 0.38 * (xx / W * 0.7 + (1 - yy / H) * 0.3)          # gradient lighting: 62..100 %
    a = a * light + rng.normal(0, 7, a.shape)
    a = a * 0.86 + 0.14 * 190                                          # grey paper, weaker contrast
    # specks and a stain on the paper
    for _ in range(28):
        x, y = rng.randint(0, W), rng.randint(0, H)
        r = rng.randint(1, 3)
        a[max(0, y - r):y + r, max(0, x - r):x + r] -= rng.randint(60, 120)
    a = np.clip(a, 0, 255).astype(np.uint8)
    import io
    b = io.BytesIO(); Image.fromarray(a).save(b, 'JPEG', quality=62); b.seek(0)
    return np.array(Image.open(b).convert('L'))

def save_pgm(path, a):
    with open(path, 'wb') as f:
        f.write(b'P5\n%d %d\n255\n' % (a.shape[1], a.shape[0])); f.write(a.tobytes())

if __name__ == '__main__':
    js, out = sys.argv[1], sys.argv[2]
    H = int(sys.argv[3]) if len(sys.argv) > 3 else 600
    os.makedirs(out, exist_ok=True)
    base = os.path.splitext(os.path.basename(js))[0]
    for ch, gl in json.load(open(js)).items():
        g = render(gl, H)
        tag = f'{base}_{ord(ch):04X}'
        Image.fromarray(g).save(f'{out}/{tag}_clean.png'); save_pgm(f'{out}/{tag}_clean.pgm', g)
        p = photo(g, ord(ch))
        Image.fromarray(p).save(f'{out}/{tag}_photo.jpg', quality=90); save_pgm(f'{out}/{tag}_photo.pgm', p)
        # inverted + scaled-up variant (light ink on dark)
    print('ok', out)
