# Build: core_all.js + index.html from the source files.
# Default: comments stripped and blank/indent lines trimmed in the bundled JS and CSS
#          (tokenizer-aware: strings, regex and template literals are copied verbatim),
#          then (Stage 5A) the two JS bundles (core engines, UI) are stored compressed inside index.html:
#          raw deflate (zlib level 9, best of a few strategies) -> base91 text (91 printable ASCII chars: no < ' \\ space)
#          in <script type="text/plain" id="zc|zu" data-n="raw UTF-8 byte length">, and a tiny starter (zboot.js, ~2.3 KB) inflates them
#          SYNCHRONOUSLY at parse time and runs each as an ordinary inline <script> (top-level const/let stay global, DOMContentLoaded unchanged).
#          Round-trip is verified in the build (Python inflate of the base91 text must equal the source bytes).
# --nocompress: strip only, plain <script> blocks (core_all.js is always the plain stripped core).
# --debug: no stripping, no compression; output is the readable concatenation.
import re, sys, os, zlib

DEBUG = '--debug' in sys.argv
NOCOMP = DEBUG or '--nocompress' in sys.argv

B91 = [chr(c) for c in range(33, 127) if c not in (39, 60, 92)]   # same alphabet as zboot.js

def b91enc(data):
    out = []; b = 0; n = 0
    for byte in data:
        b |= byte << n; n += 8
        if n > 13:
            v = b & 8191
            if v > 88: b >>= 13; n -= 13
            else: v = b & 16383; b >>= 14; n -= 14
            out.append(B91[v % 91]); out.append(B91[v // 91])
    if n:
        out.append(B91[b % 91])
        if n > 7 or b > 90: out.append(B91[b // 91])
    return ''.join(out)

def b91dec(text):
    T = {c: i for i, c in enumerate(B91)}; out = bytearray(); v = -1; b = 0; n = 0
    for ch in text:
        d = T.get(ch)
        if d is None: continue
        if v < 0: v = d
        else:
            v += d * 91; b |= v << n; n += 13 if (v & 8191) > 88 else 14
            while True:
                out.append(b & 255); b >>= 8; n -= 8
                if n <= 7: break
            v = -1
    if v > -1: out.append((b | v << n) & 255)
    return bytes(out)

def zpack(js):
    """JS text -> (base91 text of the smallest raw-deflate stream, raw UTF-8 length); verified by a full round trip"""
    raw = js.encode('utf-8'); best = None
    for ml in (9, 8):
        for strat in (zlib.Z_DEFAULT_STRATEGY, zlib.Z_FILTERED):
            c = zlib.compressobj(9, zlib.DEFLATED, -15, ml, strat); d = c.compress(raw) + c.flush()
            if best is None or len(d) < len(best): best = d
    e = b91enc(best)
    assert b91dec(e) == best and zlib.decompress(best, -15) == raw, 'compression round trip failed'
    return e, len(raw), len(best)

files = ['core1.js', 'core2.js', 'core3a.js', 'core4.js', 'core10.js', 'core10b.js', 'core5.js', 'core7.js', 'core11.js', 'core11i.js', 'core11s.js', 'core12.js', 'core9.js', 'core13.js', 'core14.js', 'core16.js', 'core17x.js', 'core17.js', 'core11j.js', 'core11y.js', 'core18.js', 'core18c.js', 'core18a.js', 'core18b.js', 'core_renessa.js', 'core19.js', 'core15.js', 'core_w.js', 'core12s.js', 'core18z.js', 'core_ustav_n1.js', 'core_renessa_w.js', 'core3b.js', 'core_otf.js', 'core_woff2.js', 'core3v.js', 'core_vfx.js', 'core20.js', 'core21.js', 'core21b.js', 'core26.js', 'core22.js', 'core_sim_S1.js', 'core25.js', 'core24.js', 'core_ryvok_n4.js', 'core_kaplya.js', 'core_basic_n1.js', 'core_ot_o1.js', 'core_renessa_o.js', 'core_pixel_p1.js', 'core_applik.js', 'core_stsepka.js', 'core_stolb.js', 'core_nit.js', 'core_tyaga.js', 'core_kortes.js', 'core_cs68.js', 'core_kern_fx.js', 'core_hyg.js', 'core_draw_n7.js', 'core_deco_d1.js', 'core_lang_l1.js', 'core_meta_l1.js']
ui_files = ['ui_a.js', 'ui_smp.js', 'ui_ds_s1.js', 'ui_demos.js', 'ui_b.js', 'ui_c.js', 'ui_d.js', 'ui_live.js', 'ui_sk.js', 'ui_draw_common.js', 'ui_xform_x1.js', 'ui_custom.js', 'ui_pen.js', 'ui_sim_S1.js', 'ui_kern.js', 'ui_autoproof.js', 'ui_imp.js', 'ui_trace.js', 'ui_lib_u1.js', 'ui_podb.js', 'ui_hm_h1.js', 'ui_shell.js', 'ui_modul.js', 'ui_draw_n7.js', 'ui_ot_o1.js', 'ui_stsepka.js', 'ui_tyaga.js', 'ui_kortes.js', 'ui_deco_d1.js', 'ui_lang_l1.js', 'ui_tester_t1.js', 'ui_vfx.js', 'ui_ed_e1.js', 'ui_pixel_p1.js', 'ui_prof_a.js', 'ui_prof_b.js', 'ui_prof_c.js', 'ui_expl.js', 'ui_status.js', 'ui_port.js', 'ui_port_x.js', 'ui_share.js', 'ui_tour.js', 'ui_tips.js', 'ui_mesh.js', 'ui_motion.js', 'ui_fhint.js', 'ui_proof_fix.js', 'ui_hist.js', 'ui_onb.js', 'ui_comm_boot.js', 'ui_drafts.js', 'ui_heat.js', 'ui_under.js', 'ui_nav.js']
# community section (v92): data + code are NOT in the UI bundle; they are packed as a third block <script type="text/plain" id="zm"> that is only inflated and run on first use (ui_comm_boot.js calls __zrun('zm'))
comm_files = ['ui_comm_data.js', 'ui_comm.js']

KW_BEFORE_REGEX = {'return','typeof','instanceof','in','of','new','delete','void','throw','case','do','else','yield','await'}

def strip_js(src):
    """Remove // and /* */ comments; drop indentation and blank lines of code lines.
    Newlines that end a line comment or a multi-line block comment are kept (ASI safe).
    String, template and regex literals are copied verbatim."""
    out = []
    n = len(src); i = 0
    bol = True                  # at the start of a code line (only blanks so far)
    last = ('start',)          # last significant token, for regex-vs-division
    stack = []                  # 'T' = template text; ['E', depth] = ${ expression }
    def rstrip():
        while out and out[-1] in ' \t\r':
            out.pop()
    while i < n:
        top = stack[-1] if stack else None
        if top == 'T':
            c = src[i]
            if c == '\\':
                out.append(src[i:i+2]); i += 2; continue
            if c == '`':
                out.append(c); stack.pop(); i += 1; last = ('lit',); bol = False; continue
            if c == '$' and src.startswith('${', i):
                out.append('${'); stack.append(['E', 0]); i += 2; last = ('op', '{'); bol = False; continue
            out.append(c); i += 1; bol = False; continue
        c = src[i]
        if c == '\n':
            if not bol:
                rstrip(); out.append('\n'); bol = True
            i += 1; continue
        if c in ' \t\r':
            if not bol:
                out.append(c)
            i += 1; continue
        if c == '/' and src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and src.startswith('/*', i):
            j = src.find('*/', i + 2)
            assert j >= 0, 'unterminated block comment'
            com = src[i:j+2]; i = j + 2
            if '\n' in com:
                if not bol:
                    rstrip(); out.append('\n'); bol = True
            elif not bol:
                out.append(' ')
            continue
        if c in '\'"':
            j = i + 1
            while src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j+1]); i = j + 1; last = ('lit',); bol = False; continue
        if c == '`':
            out.append(c); stack.append('T'); i += 1; bol = False; continue
        if c == '/':
            regex_ok = (last[0] in ('start', 'kw')) or (last[0] == 'op' and last[1] not in ')]')
            if regex_ok:
                k = i + 1; inclass = False; closed = False
                while k < n and src[k] != '\n':
                    ch = src[k]
                    if ch == '\\':
                        k += 2; continue
                    if inclass:
                        if ch == ']': inclass = False
                    elif ch == '[': inclass = True
                    elif ch == '/':
                        closed = True; break
                    k += 1
                if closed:
                    k += 1
                    while k < n and (src[k].isalnum() or src[k] == '_'):
                        k += 1
                    out.append(src[i:k]); i = k; last = ('lit',); bol = False; continue
        if c == '{' and top is not None and top != 'T':
            top[1] += 1
        if c == '}' and top is not None and top != 'T':
            if top[1] == 0:
                stack.pop(); out.append('}'); i += 1; last = ('lit',); bol = False; continue
            top[1] -= 1
        if c.isalnum() or c in '_$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$'):
                j += 1
            w = src[i:j]
            out.append(w); i = j; bol = False
            if w in KW_BEFORE_REGEX:
                last = ('kw', w)
            elif w[0].isdigit():
                last = ('lit',)
            else:
                last = ('id', w)
            continue
        out.append(c); i += 1; bol = False; last = ('op', c)
    return ''.join(out)

def strip_css(src):
    """Remove /* */ comments and trim indentation and blank lines (CSS has no template literals)."""
    src = re.sub(r'/\*.*?\*/', lambda m: '\n' * m.group(0).count('\n'), src, flags=re.S)
    lines = [l.strip() for l in src.split('\n')]
    return '\n'.join(l for l in lines if l)

core = ''.join(open(f, encoding='utf-8').read() + '\n' for f in files)
ui = ''.join(open(f, encoding='utf-8').read() + '\n' for f in ui_files)
comm = ''.join(open(f, encoding='utf-8').read() + '\n' for f in comm_files)
# build id: hash of the raw sources; keys the on-disk proof cache so a new build never reads stale results
import hashlib
BID = hashlib.sha1((core + ui + comm).encode('utf-8')).hexdigest()[:10]
ui = ui.replace('__BID__', BID)
template = open('template.html', encoding='utf-8').read()
template = template.replace('/*DEMOS_CSS*/', open('ui_demos.css', encoding='utf-8').read())
template = template.replace('/*COMM_CSS*/', open('ui_comm.css', encoding='utf-8').read())
template = template.replace('/*HEAT_CSS*/', open('ui_heat.css', encoding='utf-8').read())

if not DEBUG:
    core = strip_js(core)
    ui = strip_js(ui)
    comm = strip_js(comm)
    template = re.sub(r'(<style>)(.*?)(</style>)', lambda m: m.group(1) + strip_css(m.group(2)) + m.group(3), template, flags=re.S)

open('core_all.js', 'w', encoding='utf-8').write(core)
ZINFO = ''
if NOCOMP:
    assert '</script' not in comm and '<!--' not in comm, 'community source cannot sit raw inside a <script> element'
    t = template.replace('/*CORE*/', core).replace('/*UI*/', ui)
    t = t.rstrip('\n') + '\n<script type="text/plain" id="zm" data-raw="1">' + comm + '</script>\n'
else:
    zc, nc, dc = zpack(core); zu, nu, du = zpack(ui); zm, nm, dm = zpack(comm)
    boot = strip_js(open('zboot.js', encoding='utf-8').read())
    blk = '<script type="text/plain" id="%s" data-n="%d">%s</script>\n'
    zhtml = (blk % ('zc', nc, zc)) + (blk % ('zu', nu, zu)) + '<script id="zb">\n' + boot + "\n__zrun('zc');__zrun('zu');\n</script>"
    zmhtml = blk % ('zm', nm, zm)
    zsrc = '<script>\n/*CORE*/\n</script>\n<script>\n/*UI*/\n</script>'
    assert zsrc in template, 'template: script placeholders changed'
    t = template.replace(zsrc, zhtml)
    t = t.rstrip('\n') + '\n' + zmhtml + '\n'   # last block of the page; not run at start: inflated on first use of the community tab
    ZINFO = ' core %d->%d->%d ui %d->%d->%d comm(lazy) %d->%d->%d' % (nc, dc, len(zc), nu, du, len(zu), nm, dm, len(zm))
open('index.html', 'w', encoding='utf-8').write(t)
print('mode=%s core_all.js=%d index.html chars=%d bytes=%d%s' % ('debug' if DEBUG else 'strip', len(core), len(t), len(t.encode('utf-8')), ' zip(raw->deflate->base91):' + ZINFO if ZINFO else ''))
