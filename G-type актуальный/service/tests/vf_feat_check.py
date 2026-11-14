"""usage: python3 tests/vf_feat_check.py <vf_dir> <fam_dir>
Features inside the VF files (HarfBuzz in Chromium, wght 400 and 900 through font-variation-settings), compared with the static family files:
 tyaga: «letter~…» -> .s1..s5 alternates via calt, liga and clig each alone; widths == static Regular / Black; features off -> tilde invisible; kern incl. alternates.
 kortes: calt pair swashes (positives change the ink, negatives do not), widths == static; ss01/ss02 present.
 nit: kern + widths == static. Prints 'PASS vffeat ...' or 'FAIL vffeat ...'."""
import base64, os, sys, hashlib
from playwright.sync_api import sync_playwright
from fontTools.ttLib import TTFont
vf_dir, fam_dir = sys.argv[1], sys.argv[2]
CHROME = '/opt/pw-browsers/chromium'
ST = {'tyaga': 'Tyaga', 'kortes': 'Kortes', 'nit': 'Nit'}
WN = {400: 'Regular', 900: 'Black'}
TY = ['С~', 'С~~~~~', 'Е~~', 'с~~', 'Ы~~~', 'А~', 'А~~~', 'и~~', 'E~~~~', 'Н~~~', 'ГА', 'Г~А', 'А~Т', 'О~~', 'Ж~']
KO = (['RO', 'ОЯ', 'ROMARTA', 'MOROCCO', 'ВСЯ'], ['RA', 'ЯО', 'R.'])
COMMON = ['Hamburgefonstiv', 'Привет мир', 'AVATAR ГАТА']
out = []; bad = []
def face(pg, fam, path):
    b = base64.b64encode(open(path, 'rb').read()).decode()
    pg.evaluate("""async ([n,b])=>{const bin=atob(b);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const f=new FontFace(n,u.buffer);await f.load();document.fonts.add(f);}""", [fam, b])
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    pg = br.new_page(); pg.set_content('<span id=a style="white-space:pre;position:absolute;font-size:500px"></span>')
    def width(fam, txt, feat='normal', w=400):
        return pg.evaluate("([f,t,ft,w])=>{const e=document.getElementById('a');e.style.fontFamily=f;e.style.fontFeatureSettings=ft;e.style.fontVariationSettings='\"wght\" '+w;e.textContent=t;return e.getBoundingClientRect().width}", [fam, txt, feat, w])
    def shot(fam, txt, feat, w=400):
        pg.evaluate("([f,t,ft,w])=>{const e=document.getElementById('a');e.style.fontFamily=f;e.style.fontFeatureSettings=ft;e.style.fontVariationSettings='\"wght\" '+w;e.textContent=t}", [fam, txt, feat, w])
        return hashlib.md5(pg.locator('#a').screenshot()).hexdigest()
    for fid, base in ST.items():
        vf = os.path.join(vf_dir, fid + '-regular-VF.ttf')
        if not os.path.exists(vf): continue
        face(pg, 'V' + fid, vf)
        for w, wn in WN.items():
            face(pg, 'S%s%d' % (fid, w), os.path.join(fam_dir, '%s-%s.ttf' % (base, wn)))
        n = 0
        feats = ['normal', '"calt" 1, "liga" 0, "clig" 0', '"calt" 0, "liga" 1, "clig" 0', '"calt" 0, "liga" 0, "clig" 1'] if fid == 'tyaga' else ['normal', '"kern" 0']
        texts = COMMON + (TY if fid == 'tyaga' else KO[0] + KO[1] if fid == 'kortes' else [])
        for w in WN:
            for t in texts:
                for ft in feats:
                    a = width('V' + fid, t, ft, w); b = width('S%s%d' % (fid, w), t, ft, w if False else 400)
                    n += 1
                    if abs(a - b) > 0.0025 * max(a, 1) + 1.5: bad.append('%s w%d %r %s vf %.0f static %.0f' % (fid, w, t, ft, a, b))
        if fid == 'tyaga':
            for t in TY[:8]:
                off = width('V' + fid, t, '"calt" 0, "liga" 0, "clig" 0'); base_w = width('V' + fid, t[0], 'normal')
                if abs(off - base_w) > 1.5: bad.append('tyaga tilde visible with features off %r' % t)
                if abs(width('V' + fid, t, 'normal') - off) < 5 and t[1:]: bad.append('tyaga ligature not applied in VF %r' % t)
            k = width('Vtyaga', 'ГА', '"kern" 1') - width('Vtyaga', 'ГА', '"kern" 0'); k2 = width('Vtyaga', 'Г~А', '"kern" 1') - width('Vtyaga', 'Г~А', '"kern" 0')
            if k > -40 * 0.5 or abs(k - k2) > 1.5: bad.append('tyaga kern VF %.1f %.1f' % (k, k2))
        if fid == 'kortes':
            for w in WN:
                for t in KO[0]:
                    if shot('V' + fid, t, '"calt" 1', w) == shot('V' + fid, t, '"calt" 0', w): bad.append('kortes swash not applied in VF w%d %r' % (w, t))
                for t in KO[1]:
                    if shot('V' + fid, t, '"calt" 1', w) != shot('V' + fid, t, '"calt" 0', w): bad.append('kortes negative changed in VF w%d %r' % (w, t))
            tags = {fr.FeatureTag for fr in TTFont(vf)['GSUB'].table.FeatureList.FeatureRecord}
            if not {'calt', 'ss01', 'ss02'} <= tags: bad.append('kortes features %s' % tags)
        out.append('%s %d width checks' % (fid, n))
    br.close()
print('\n'.join(bad[:20]))
print(('FAIL' if bad else 'PASS'), 'vffeat', '; '.join(out), 'bad', len(bad))
sys.exit(1 if bad else 0)
