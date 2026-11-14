"""Responsive layout audit at 1440x900, phone 390x844 and tablet 768x1024, both themes, 9 views (home, library, fav, edit, edit drawer, proof, kern, draw, import):
no horizontal page scroll, no element sticking out of the viewport, no clipped text (overflow hidden / ellipsis), no controls overlapping,
touch targets >= 40px on phone. One PASS/FAIL line."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from uiq_views import *
from uiq_checks import audit

T0 = time.time(); BAD = []; N = 0
SHOT = os.environ.get('GT_SHOTS')
with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h) in [v for v in VIEWPORTS if not os.environ.get('GT_W') or str(v[0]) in os.environ['GT_W'].split(',')]:
        for th in THEMES:
            pg = new_page(b, w, h, th)
            for v in VIEWS:
                goto(pg, v); N += 1
                if SHOT and w < 1000:
                    os.makedirs('qa_UIQ', exist_ok=True); pg.screenshot(path=f'qa_UIQ/{v}_{th}_{w}.png')
                for x in audit(pg, w < 600):
                    BAD.append(f'{w} {th} {v}: {x}')
            pg.context.close()
    b.close()
for x in sorted(set(BAD))[:int(os.environ.get('GT_MAX','60'))]: print('  ', x)
print(('PASS' if not BAD else 'FAIL') + f' overflow {len(BAD)} layout issues, {N} view states (3 widths x 2 themes x 9 views) t={time.time()-T0:.1f}s')
sys.exit(1 if BAD else 0)
