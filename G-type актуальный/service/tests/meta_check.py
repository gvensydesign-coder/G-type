"""Font passport check (OS/2, name, gasp, head) and language coverage of exported TTF files.
usage: python3 tests/meta_check.py fam    # fam/*.ttf  (9 fonts x 4 weights x 2 styles)
       python3 tests/meta_check.py lib    # lib-*.ttf  (9 fonts x 2 styles, weight from the default parameters)
Per file: name IDs (RIBBI grouping), OS/2 (weight/width class, fsSelection, PANOSE ranges, unicode ranges, code pages, x/cap height,
xAvgCharWidth), gasp, head. Per family: grouping and consistent classes. Languages: coverage recomputed from the real cmap with an
independent Python port of the rule must equal the JS coverage computed from CHARSET (tests/lang_dump.js).
Prints one line per problem and 'bad N' at the end; exit 1 when N > 0."""
import glob, json, os, re, subprocess, sys, unicodedata
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.O_S_2f_2 import intersectUnicodeRanges

WK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
mode = sys.argv[1] if len(sys.argv) > 1 else 'fam'
files = sorted(glob.glob(os.path.join(WK, 'fam', '*.ttf'))) if mode == 'fam' else sorted(glob.glob(os.path.join(WK, 'lib-*.ttf')))
assert files, 'no files for mode ' + mode
bad = 0
def fail(fn, msg):
    global bad
    bad += 1
    print('BAD', os.path.basename(fn), msg)

# ---------- OpenType spec limits (independent of the generator) ----------
PAN_MAX = {2: [5, 15, 11, 9, 9, 10, 11, 15, 13, 7], 3: [5, 9, 11, 3, 6, 9, 10, 13, 13, 6]}
WNAME = {100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black'}
RIBBI = ('Regular', 'Italic', 'Bold', 'Bold Italic')
CP = {0: 'cp1252', 1: 'cp1250', 2: 'cp1251', 3: 'cp1253', 4: 'cp1254', 7: 'cp1257', 8: 'cp1258'}

def cp_bits(cmap):
    """code page bit set when all letters (Lu/Ll/Lt except U+0192, U+00B5) and >= 75 % of the other printable characters are present"""
    bits = 0
    for bit, codec in CP.items():
        L = Lh = O = Oh = 0
        for b in range(0x20, 0x100):
            try:
                c = bytes([b]).decode(codec)
            except UnicodeDecodeError:
                continue
            if c in ' ­\x7f':
                continue
            has = ord(c) in cmap
            if unicodedata.category(c) in ('Lu', 'Ll', 'Lt') and c not in 'ƒµ':
                L += 1; Lh += has
            else:
                O += 1; Oh += has
        if L == Lh and (not O or Oh / O >= 0.75):
            bits |= 1 << bit
    return bits

# ---------- languages: independent port of core_lang_l1.js ----------
dump = json.loads(subprocess.run(['node', os.path.join(WK, 'tests', 'lang_dump.js')], capture_output=True, check=True).stdout.decode('utf-8'))
def upper_of(L, i):
    lo = list(L['lo'])[i]
    if L.get('up'):
        u = list(L['up'])[i]
        return '' if u == '-' else u
    u = lo.upper()
    return u if len(u) == 1 and u != lo else ''
def lang_cover(cmapchars):
    out = {}
    for L in dump['db']:
        miss = []; missL = 0; total = len(L['lo'])
        for i, lo in enumerate(L['lo']):
            a = []
            up = upper_of(L, i)
            if up and up not in cmapchars: a.append(up)
            if lo not in cmapchars: a.append(lo)
            if a: missL += 1; miss += a
        mp = [c for c in dump['core'] + L.get('x', '') if c not in cmapchars]
        for g in L.get('any', []):
            if not any(c in cmapchars for c in g): mp.append(g[0])
        qb = None
        for q in L.get('q', []):
            m = [c for c in dict.fromkeys(q) if c not in cmapchars]
            if qb is None or len(m) < len(qb): qb = m
        if qb: mp += qb
        st = 'full' if not missL and not mp else 'almost' if missL <= total // 4 else 'none'
        out[L['id']] = (st, ' '.join(miss + mp))
    return out

fams = {}
for fn in files:
    f = TTFont(fn)
    n, o, hd, post, gasp = f['name'], f['OS/2'], f['head'], f['post'], f['gasp']
    nm = {i: n.getDebugName(i) for i in (1, 2, 3, 4, 5, 6, 10, 16, 17)}
    for i in (1, 2, 3, 4, 5, 6, 10, 16, 17):
        if not nm[i]: fail(fn, f'name ID {i} missing')
    keys = [(r.platformID, r.platEncID, r.langID, r.nameID) for r in n.names]
    if keys != sorted(keys): fail(fn, 'name records not sorted')
    if any(r.platformID != 3 for r in n.names): fail(fn, 'non-Windows name record')
    # --- names / RIBBI
    it = 'Italic' in (nm[17] or '')
    w = o.usWeightClass
    if mode == 'fam' or w in WNAME:
        wn = WNAME.get(w)
        if wn and nm[17] != (wn if not it else (wn + ' Italic' if wn != 'Regular' else 'Italic')) and nm[17] != wn + (' Italic' if it else ''):
            if not (wn == 'Regular' and nm[17] in ('Regular', 'Italic')):
                fail(fn, f'ID17 {nm[17]!r} vs weight class {w} ({wn})')
    rib = nm[17] in RIBBI
    if rib and (nm[1] != nm[16] or nm[2] != nm[17]): fail(fn, f'RIBBI ID1/2 {nm[1]!r}/{nm[2]!r} vs ID16/17 {nm[16]!r}/{nm[17]!r}')
    if not rib:
        wordname = nm[17].replace(' Italic', '')
        if nm[1] != nm[16] + ' ' + wordname or nm[2] != ('Italic' if it else 'Regular'): fail(fn, f'non-RIBBI ID1/2 {nm[1]!r}/{nm[2]!r}')
    if nm[4] != nm[16] + ' ' + nm[17]: fail(fn, f'ID4 {nm[4]!r}')
    if nm[6] != re.sub(r'\s+', '', nm[16]) + '-' + re.sub(r'\s+', '', nm[17]) or not re.fullmatch(r'[A-Za-z0-9]+-[A-Za-z0-9]+', nm[6] or ''): fail(fn, f'ID6 {nm[6]!r}')
    if not (nm[3] or '').endswith(nm[6] or '?'): fail(fn, f'ID3 {nm[3]!r}')
    if nm[5] != 'Version 1.000' or abs(hd.fontRevision - 1.0) > 1e-6: fail(fn, 'version')
    if not n.getName(10, 3, 1, 0x409) or not n.getName(10, 3, 1, 0x419): fail(fn, 'description (ID 10) must exist in en-US and ru-RU')
    # --- OS/2 style bits
    fs = o.fsSelection
    ribbi_it, ribbi_bold = 'Italic' in nm[2], 'Bold' in nm[2]
    if bool(fs & 1) != ribbi_it or bool(fs & 1) != bool(hd.macStyle & 2) or bool(fs & 1) != (post.italicAngle < 0): fail(fn, f'italic bits fs={fs:#x} mac={hd.macStyle} angle={post.italicAngle}')
    if bool(fs & 32) != ribbi_bold or bool(fs & 32) != bool(hd.macStyle & 1): fail(fn, f'bold bits fs={fs:#x} mac={hd.macStyle}')
    if bool(fs & 64) != (nm[2] == 'Regular'): fail(fn, f'REGULAR bit fs={fs:#x} ID2={nm[2]!r}')
    if not fs & 128: fail(fn, 'USE_TYPO_METRICS not set')
    if fs & ~(1 | 32 | 64 | 128): fail(fn, f'unexpected fsSelection bits {fs:#x}')
    if o.version != 4 or o.fsType != 0 or o.achVendID != 'GTYP': fail(fn, 'OS/2 version/fsType/vendor')
    if not 1 <= w <= 1000 or not 1 <= o.usWidthClass <= 9: fail(fn, f'classes weight {w} width {o.usWidthClass}')
    # --- PANOSE
    pv = [o.panose.bFamilyType, o.panose.bSerifStyle, o.panose.bWeight, o.panose.bProportion, o.panose.bContrast,
          o.panose.bStrokeVariation, o.panose.bArmStyle, o.panose.bLetterForm, o.panose.bMidline, o.panose.bXHeight]
    mx = PAN_MAX.get(pv[0])
    if not mx: fail(fn, f'PANOSE family kind {pv[0]}')
    else:
        if any(not (0 <= d <= m) for d, m in zip(pv, mx)): fail(fn, f'PANOSE out of range {pv}')
        if any(d < 2 for d in pv[1:]): fail(fn, f'PANOSE has Any/No fit digits {pv}')
        if pv[0] == 2 and (pv[7] >= 9) != bool(fs & 1): fail(fn, f'PANOSE letterform {pv[7]} vs italic')
    if o.sFamilyClass >> 8 not in (0, 1, 8, 9, 10): fail(fn, f'sFamilyClass {o.sFamilyClass:#x}')
    # --- unicode ranges / code pages / char indices
    cmap = f.getBestCmap()
    want = intersectUnicodeRanges(cmap.keys())
    have = {b for b in range(128) if (o.ulUnicodeRange1 | o.ulUnicodeRange2 << 32 | o.ulUnicodeRange3 << 64 | o.ulUnicodeRange4 << 96) >> b & 1}
    if want != have: fail(fn, f'ulUnicodeRange: cmap implies {sorted(want)}, file has {sorted(have)}')
    cpb = o.ulCodePageRange1 | o.ulCodePageRange2 << 32
    if cpb != cp_bits(cmap): fail(fn, f'ulCodePageRange {cpb:#x} vs cmap {cp_bits(cmap):#x}')
    bmp = [c for c in cmap if c <= 0xFFFF]
    if o.usFirstCharIndex != min(bmp) or o.usLastCharIndex != max(bmp): fail(fn, 'first/last char index')
    # --- heights and average width
    gl = f['glyf']
    def ymax(*cs):
        for c in cs:
            if c in cmap and gl[cmap[c]].numberOfContours: return gl[cmap[c]].yMax
    xh, ch = ymax(0x78, 0x445, 0x7A), ymax(0x48, 0x41D)
    if abs(o.sxHeight - xh) > 6 or abs(o.sCapHeight - ch) > 6: fail(fn, f'x/cap height {o.sxHeight}/{o.sCapHeight} vs glyphs {xh}/{ch}')
    adv = [f['hmtx'][g][0] for g in f.getGlyphOrder() if f['hmtx'][g][0] > 0]
    if o.xAvgCharWidth != round(sum(adv) / len(adv)): fail(fn, f'xAvgCharWidth {o.xAvgCharWidth} vs {round(sum(adv) / len(adv))}')
    # --- gasp / head
    gr = list(gasp.gaspRange.items())
    if gasp.version != 1 or [k for k, _ in gr] != sorted(k for k, _ in gr) or gr[-1][0] != 0xFFFF: fail(fn, f'gasp ranges {gr}')
    if any(not (v & 0x0A) or v > 15 for _, v in gr): fail(fn, f'gasp flags {gr}')
    if (hd.flags & 3) != 3 or hd.flags & 8: fail(fn, f'head.flags {hd.flags:#x}')
    for g in f.getGlyphOrder():
        gg = gl[g]
        if gg.numberOfContours and f['hmtx'][g][1] != gg.xMin: fail(fn, f'lsb != xMin in {g}'); break
    # --- languages: Python port over the real cmap == JS over CHARSET
    chars = {chr(c) for c in cmap}
    py = lang_cover(chars)
    fid = [k for k, v in dump['fonts'].items() if v['family'] == nm[16]]
    if len(fid) != 1: fail(fn, f'font id for family {nm[16]!r}: {fid}')
    else:
        js = {r['id']: (r['status'], r['missing']) for r in dump['fonts'][fid[0]]['cover']}
        for k in py:
            if py[k] != js[k]: fail(fn, f'language {k}: cmap says {py[k]}, CHARSET says {js[k]}')
    fams.setdefault(nm[16], []).append((fn, nm, o, pv, f))

# ---------- per-family consistency ----------
for fam, rows in fams.items():
    pairs = [(r[1][1], r[1][2]) for r in rows]
    if len(set(pairs)) != len(pairs): fail(fam, 'duplicate ID1/ID2')
    ribbi = [r for r in rows if r[1][17] in RIBBI]
    if len(ribbi) > 4: fail(fam, f'{len(ribbi)} RIBBI members')
    by1 = {}
    for r in rows: by1.setdefault(r[1][1], []).append(r[1][2])
    for k, v in by1.items():
        if sorted(v) != sorted(set(v)) or len(v) > 4: fail(fam, f'ID1 group {k!r}: {v}')
        if k != fam and sorted(v) != ['Italic', 'Regular']: fail(fam, f'non-RIBBI ID1 group {k!r} must be Regular+Italic, has {v}')
    for what, get in (('usWidthClass', lambda r: r[2].usWidthClass), ('PANOSE family/serif/arm', lambda r: (r[3][0], r[3][1], r[3][6])), ('sFamilyClass', lambda r: r[2].sFamilyClass),
                      ('vertical metrics', lambda r: (r[4]['hhea'].ascent, r[4]['hhea'].descent, r[2].sTypoAscender, r[2].sTypoDescender, r[2].usWinAscent, r[2].usWinDescent))):
        vals = {get(r) for r in rows}
        if len(vals) != 1 and not (mode == 'lib' and what == 'vertical metrics'): fail(fam, f'{what} differs inside the family: {sorted(map(str, vals))[:3]}')
    for it_flag in (False, True):
        seq = sorted(((r[2].usWeightClass, r[3][2]) for r in rows if ('Italic' in r[1][17]) == it_flag))
        if mode == 'fam' and len(seq) != 4: fail(fam, f'{len(seq)} weights for italic={it_flag}')
        if any(a[0] < b[0] and a[1] > b[1] for a, b in zip(seq, seq[1:])): fail(fam, f'PANOSE weight not monotonic with usWeightClass: {seq}')
print('files', len(files), 'families', len(fams), 'mode', mode)
print('bad', bad)
sys.exit(1 if bad else 0)
