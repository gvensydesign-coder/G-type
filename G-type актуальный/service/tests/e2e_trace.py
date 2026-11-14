"""trace: raster glyph images -> library (dialog, bulk), editor «Обвести картинку», undo/redo, persistence; IoU and node counts."""
import os, sys, subprocess, shutil, json
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Session, check_all, WK, LOGS, shot
import numpy as np
from PIL import Image, ImageDraw, ImageChops

FX = os.path.join(LOGS, 'fx_trace')
CH = {'H': 0x48, 'T': 0x54, 'O': 0x4F, 'S': 0x53, 'a': 0x61}

def make_fixtures():
    shutil.rmtree(FX, ignore_errors=True); os.makedirs(FX)
    js = os.path.join(FX, 'kvadra.json')
    subprocess.run(['node', os.path.join(WK, 'tests', 'trc_fx.js'), js, 'kvadra', ''.join(CH)], cwd=WK, check=True, stdout=subprocess.DEVNULL)
    subprocess.run([sys.executable, os.path.join(WK, 'tests', 'trc_fx.py'), js, FX], check=True, stdout=subprocess.DEVNULL)
    # complexity fixture: 1000 separate blobs
    rng = np.random.RandomState(5); a = np.full((600, 600), 255, np.uint8)
    for i in range(1000):
        x, y = rng.randint(4, 592), rng.randint(4, 592); a[y:y + 5, x:x + 5] = 0
    Image.fromarray(a).save(os.path.join(FX, 'noise.png'))
    # light glyph on dark paper (auto-invert)
    g = np.array(Image.open(os.path.join(FX, 'kvadra_%04X_clean.png' % CH['H'])))
    Image.fromarray(255 - g).save(os.path.join(FX, 'H_inverted.png'))

def src_mask(ch, tag='clean'):
    return np.array(Image.open(os.path.join(FX, 'kvadra_%04X_clean.png' % CH[ch]))) < 128

def iou_page(s, ch):
    """IoU of the stored glyph with the source: contours are mapped onto the source ink bbox."""
    m = src_mask(ch); ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    polys = s.js("""ch=>{const r=IMP.glyphs[ch];return {bb:r.bb,cs:r.c.map(c=>csgFlatten(c))}}""" .replace('ch=>', '(ch)=>') if False else f"(()=>{{const r=IMP.glyphs['{ch}'];return {{bb:impBBox(r.c),cs:r.c.map(c=>csgFlatten(c))}}}})()")
    bb = polys['bb']; sc = (y1 - y0) / (bb['y1'] - bb['y0'])
    im = Image.new('1', (m.shape[1], m.shape[0]), 0)
    for c in polys['cs']:
        t = Image.new('1', im.size, 0)
        ImageDraw.Draw(t).polygon([(x0 + (p[0] - bb['x0']) * sc, y1 - (p[1] - bb['y0']) * sc) for p in c], fill=1)
        im = ImageChops.logical_xor(im, t)
    a = np.array(im, dtype=bool)
    return (a & m).sum() / (a | m).sum()

def nodes_of(s, ch):
    return s.js(f"IMP.glyphs['{ch}'].c.reduce((n,c)=>n+c.nodes.length,0)")

def trace_check(p):
    make_fixtures()
    s = Session(p, 'trace'); pg = s.pg
    out = []
    try:
        pg.click('#imp-card'); pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
        # 1) single image with a recognizable name -> preview dialog
        f_h = os.path.join(FX, 'H_upper.png'); shutil.copy(os.path.join(FX, 'kvadra_0048_clean.png'), f_h)
        pg.set_input_files('#imp-files', f_h)
        pg.wait_for_selector('#trdlg:not([hidden])', timeout=10000)
        pg.wait_for_function("document.querySelector('#tr-n').textContent.includes('Узлов')", timeout=20000)
        shot(pg, os.path.join(LOGS, 'trace_dlg_1440.png'))
        n0 = pg.evaluate("document.querySelector('#tr-n').textContent")
        # slider live update: raise «Убрать мелочь» and «Гладкость»
        pg.evaluate("(()=>{const e=document.querySelector('#tr-sm');e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}))})()")
        pg.wait_for_function("document.querySelector('#tr-o2').textContent==='90%'", timeout=5000)
        pg.evaluate("(()=>{const e=document.querySelector('#tr-sm');e.value=40;e.dispatchEvent(new Event('input',{bubbles:true}))})()")
        pg.wait_for_function("document.querySelector('#tr-o2').textContent==='40%' && !document.querySelector('#tr-busy').offsetParent", timeout=20000)
        # inverted toggle flips the result into an error (no contours or full page) -> message, apply disabled is allowed; then back
        pg.click('#tr-ok'); pg.wait_for_function("!!IMP.glyphs['H']", timeout=5000)
        assert pg.evaluate("document.querySelector('#trdlg').hidden")
        # 2) bulk by file name
        files = []
        for ch, nm in (('O', 'O_upper.png'), ('S', 'S_upper.png'), ('T', 'T_upper.png'), ('a', 'a_lower.jpg')):
            dst = os.path.join(FX, nm)
            shutil.copy(os.path.join(FX, 'kvadra_%04X_%s.%s' % (CH[ch], 'photo' if nm.endswith('jpg') else 'clean', 'jpg' if nm.endswith('jpg') else 'png')), dst)
            files.append(dst)
        pg.set_input_files('#imp-files', files)
        pg.wait_for_function("['O','S','T','a'].every(c=>!!IMP.glyphs[c])", timeout=60000)
        # 3) complexity refusal and auto-invert
        pg.set_input_files('#imp-files', os.path.join(FX, 'noise.png').replace('noise', 'noise'))
        # noise.png has no glyph name -> goes to pending, not traced: use a slot drop path instead
        # 4) quality: IoU and nodes
        res = {}
        for ch in 'HTOSa':
            res[ch] = (round(iou_page(s, ch), 4), nodes_of(s, ch))
        for ch in 'OSa':
            assert res[ch][1] <= 30, f'{ch} nodes {res[ch][1]}'
        assert nodes_of(s, 'H') <= 14 and nodes_of(s, 'T') <= 10, f"H/T nodes {res['H']} {res['T']}"
        assert res['H'][0] >= 0.97 and res['T'][0] >= 0.97 and res['O'][0] >= 0.97 and res['S'][0] >= 0.97, f'iou {res}'
        assert res['a'][0] >= 0.97, f'iou a {res["a"]}'
        out.append('clean ' + ' '.join(f'{c}:{v[0]}/{v[1]}n' for c, v in res.items()))
        # 5) build, editor action, undo/redo
        pg.click('#imp-build'); pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)
        pg.evaluate("selectGlyph('S')"); pg.wait_for_selector('#ie-trc', timeout=10000)
        before = pg.evaluate("IMP.glyphs['S'].id||0")
        nb = nodes_of(s, 'S')
        with pg.expect_file_chooser() as fc:
            pg.click('#ie-trc')
        fc.value.set_files(os.path.join(FX, 'kvadra_0053_photo.jpg'))
        pg.wait_for_selector('#trdlg:not([hidden])', timeout=10000)
        pg.wait_for_function("document.querySelector('#tr-n').textContent.includes('Узлов')", timeout=20000)
        pg.set_viewport_size({'width': 400, 'height': 860}); pg.wait_for_timeout(300)
        shot(pg, os.path.join(LOGS, 'trace_dlg_400.png'))
        w = pg.evaluate("(()=>{const c=document.querySelector('.tr-card').getBoundingClientRect();return [c.left,c.right,document.documentElement.scrollWidth]})()")
        assert w[0] >= 0 and w[1] <= 401 and w[2] <= 401, f'mobile overflow {w}'
        pg.set_viewport_size({'width': 1440, 'height': 900})
        pg.click('#tr-ok'); pg.wait_for_function("document.querySelector('#trdlg').hidden", timeout=5000)
        pg.wait_for_function(f"IMP.glyphs['S'].src.includes('photo')", timeout=5000)
        iou_ph = round(iou_page(s, 'S'), 4); np_ = nodes_of(s, 'S')
        assert iou_ph >= 0.97, f'photo S iou {iou_ph}'
        pg.evaluate("undo()"); pg.wait_for_function("!IMP.glyphs['S'].src.includes('photo')", timeout=5000)
        assert nodes_of(s, 'S') == nb, 'undo did not restore glyph'
        pg.evaluate("redo()"); pg.wait_for_function("IMP.glyphs['S'].src.includes('photo')", timeout=5000)
        out.append(f'photoS {iou_ph}/{np_}n undo/redo ok')
        # 6) persistence through project pack/unpack
        cnt = pg.evaluate("(()=>{const p=JSON.parse(JSON.stringify(impPack()));impUnpack(p);return Object.keys(IMP.glyphs).length+':'+IMP.glyphs['S'].c.length})()")
        assert cnt.split(':')[0] == '5', f'persist {cnt}'
        # 7) complexity message in the dialog
        pg.evaluate("selectGlyph('H')"); pg.wait_for_selector('#ie-trc', timeout=10000)
        with pg.expect_file_chooser() as fc:
            pg.click('#ie-trc')
        fc.value.set_files(os.path.join(FX, 'noise.png'))
        pg.wait_for_function("document.querySelector('#tr-msg').textContent.includes('Слишком сложное')", timeout=30000)
        assert pg.evaluate("document.querySelector('#tr-ok').disabled")
        pg.click('#tr-cancel')
        # 8) auto-invert (light on dark)
        with pg.expect_file_chooser() as fc:
            pg.click('#ie-trc')
        fc.value.set_files(os.path.join(FX, 'H_inverted.png'))
        pg.wait_for_function("document.querySelector('#tr-n').textContent.includes('Узлов')", timeout=20000)
        assert pg.evaluate("document.querySelector('#tr-inv').checked"), 'auto-invert off'
        pg.click('#tr-ok'); pg.wait_for_function("document.querySelector('#trdlg').hidden", timeout=5000)
        assert not s.errs, f'page errors {s.errs[:3]}'
        return ' | '.join(out) + f' | dlg {n0}'
    finally:
        s.close()

if __name__ == '__main__':
    sys.exit(check_all([('trace', trace_check)]))
