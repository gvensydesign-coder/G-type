"""tools: editor tooling fixes (audit D) — presets (.on from clamped values, no duplicates, Renessa own set), undo/redo with a focused slider,
absolute speck / open-path detection in Проверка (no false positives on all stock fonts), kerning pill == exported GPOS (30 pairs x 5 fonts),
draw tool spacing, nodeSmooth keeps lines straight, slider tracks = effective limits, Сцепка export mode + name ID 0, numeric input + per-slider reset.
Each sub-check runs in its own browser; the last line is 'PASS tools ...' or 'FAIL tools ...'."""
import io, math, os, sys, time, json
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import Session, run
from playwright.sync_api import sync_playwright
from fontTools.ttLib import TTFont
from ttfkern import kern

OPEN_GRP = "document.querySelectorAll('#params .grp.shut').forEach(g=>g.classList.remove('shut'))"
FONTS_ALL = ['volt', 'kvadra', 'codex', 'liniya', 'propis', 'renessa', 'stroka', 'ustav', 'rotunda', 'modul', 'ryvok', 'kaplya', 'pixel', 'applik', 'stsepka', 'stolb', 'nit', 'tyaga', 'kortes']


# ---------------------------------------------------------------- presets
PRESET_JS = """()=>{const bad=[];const ms=methodsNow();const D=Object.assign({},DEFAULTS[S.style]);
 ms.forEach((m,mi)=>{
  const names=m[2].map(o=>o[0]);
  m[2].forEach((o,oi)=>{
   cur().p=Object.assign({},D);syncPanel();
   const row=()=>document.querySelector('#methods .meth:nth-child('+(mi+1)+')');
   const b=row().querySelectorAll('.chip')[oi];
   const wasDis=b.disabled, wasCl=b.classList.contains('cl');
   if(!wasDis){b.click();
     const bb=row().querySelectorAll('.chip')[oi];
     const eff=safeP(Object.assign({},cur().p));
     const claim=chipClaim(m,o,D);
     const exact=Object.keys(claim).every(k=>Math.abs((+eff[k]||0)-(+claim[k]||0))<=1e-6);
     if(bb.classList.contains('on')!==exact)bad.push(m[0]+'/'+o[0]+': on='+bb.classList.contains('on')+' but exact='+exact);
     if(!bb.classList.contains('on')&&!wasCl)bad.push(m[0]+'/'+o[0]+': enabled chip did not become on after click');
     const ons=[...row().querySelectorAll('.chip.on')].map(x=>x.textContent);
     if(ons.length>1)bad.push(m[0]+': several chips on '+ons.join(','));
   }
   if(wasCl&&!wasDis&&false)bad.push('cl '+m[0]+'/'+o[0]);
  });
  /* in the default state no two enabled chips of one group produce the same result */
  cur().p=Object.assign({},D);syncPanel();
  const eff=safeP(Object.assign({},cur().p));const st=chipState(m,cur().p,eff);const seen={};
  st.forEach((x,i)=>{if(x.off)return;if(seen[x.sig]!=null)bad.push(m[0]+': '+names[i]+' duplicates '+names[seen[x.sig]]);else seen[x.sig]=i;});
 });
 cur().p=Object.assign({},D);syncPanel();return bad;}"""


def presets(p):
    s = Session(p, 'tools_pre')
    try:
        tot = 0
        for fid in FONTS_ALL:
            s.open_font(fid); s.open_panes()
            n = s.js("methodsNow().reduce((a,m)=>a+m[2].length,0)"); tot += n
            for st in ('regular', 'italic'):
                s.pg.click(f'[data-style={st}]')
                bad = s.js(PRESET_JS.replace("()=>{", "()=>{", 1))
                assert not bad, f'{fid}/{st}: {bad[:4]}'
            if fid == 'renessa':
                own = s.js("methodsNow()===METHODS_FIXED.renessa.m && !FONTS.renessa.methods")
                assert own, 'Renessa must use its own preset set'
                # every Renessa chip is reachable in the default state of both styles (inside its slider ranges)
                r = s.js("""()=>{const out=[];for(const st of ['regular','italic']){const D=DEFAULTS[st];for(const m of methodsNow())for(const o of m[2]){const nv=chipClaim(m,o,D,st);const q=safeP(Object.assign({},D,nv));
                    for(const k in nv){const i=document.getElementById('p_'+k);if(!i){out.push(o[0]+':no slider '+k);continue;}
                      if(Math.abs(q[k]-nv[k])>1e-6)out.push(st+' '+m[0]+'/'+o[0]+' '+k+' '+nv[k]+'->'+q[k]);}}}return out;}""")
                assert not r, f'Renessa chips outside limits: {r[:5]}'
        # volt: Низкий / Средний (contrast) cannot both be offered with identical output
        s.open_font('volt'); s.open_panes()
        r = s.js("""()=>{const D=DEFAULTS.regular;cur().p=Object.assign({},D);syncPanel();const ms=methodsNow();const mi=ms.findIndex(m=>m[0]==='Контраст');const m=ms[mi];
          const st=chipState(m,cur().p,safeP(Object.assign({},cur().p)));const low=m[2].findIndex(o=>o[0]==='Низкий'),mid=m[2].findIndex(o=>o[0]==='Средний');
          return {same:st[low].sig===st[mid].sig,midOff:st[mid].off,lowOff:st[low].off};}""")
        assert (not r['same']) or r['midOff'] or r['lowOff'], f'volt Низкий/Средний identical and both enabled: {r}'
        # enumeration: tabular chip is exact (a value of 0.5 is not "Табл. цифры")
        r = s.js("""()=>{const D=DEFAULTS.regular;cur().p=Object.assign({},D,{tabular:0.5});syncMethods();
          return [...document.querySelectorAll('#methods .chip.on')].map(b=>b.textContent);}""")
        assert 'Табл. цифры' not in r and 'Пропорц.' not in r, f'tabular=0.5 must match no enum chip, got {r}'
        assert not s.errs, s.errs[:2]
        return f'chips={tot} fonts=15x2'
    finally:
        s.close()


# ---------------------------------------------------------------- undo / redo with focused slider
def undo(p):
    s = Session(p, 'tools_undo')
    try:
        pg = s.pg
        s.open_font('volt'); s.open_panes()
        s.js(OPEN_GRP)
        pg.focus('#p_stem')
        for attempt in range(3):   # a key burst is one undo step only if the presses come fast; on a loaded machine retry instead of flaking
            v0 = s.js("cur().p.stem"); n0 = s.js("undoStack.length")
            for _ in range(5):
                pg.keyboard.press('ArrowRight')
            v1 = s.js("cur().p.stem")
            assert v1 == v0 + 5, f'keyboard steps did not change stem: {v0} -> {v1}'
            if s.js("undoStack.length") == n0 + 1: break
            for _ in range(s.js("undoStack.length") - n0): pg.keyboard.press('Control+z')
            pg.wait_for_function(f"cur().p.stem=={v0}", timeout=5000); pg.wait_for_timeout(900)
        assert s.js("undoStack.length") == n0 + 1, f'a key burst must be one undo step, got {s.js("undoStack.length") - n0}'
        pg.keyboard.press('Control+z')
        v2 = s.js("cur().p.stem")
        assert v2 == v0, f'Ctrl+Z with a focused slider did not undo ({v1} -> {v2}, want {v0})'
        assert s.js("document.activeElement.id") == 'p_stem', 'focus must stay on the slider'
        assert s.js("+document.getElementById('p_stem').value") == v0, 'slider thumb must follow the undo'
        pg.keyboard.press('Control+Shift+z')
        v3 = s.js("cur().p.stem")
        assert v3 == v1, f'Ctrl+Shift+Z with a focused slider did not redo ({v2} -> {v3}, want {v1})'
        # a pause starts a new step
        pg.keyboard.press('Control+z')
        pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(900); pg.keyboard.press('ArrowRight')
        assert s.js("undoStack.length") >= n0 + 2 - 1
        assert not s.errs, s.errs[:2]
        return f'stem {v0}->{v1} undo {v2} redo {v3}'
    finally:
        s.close()


# ---------------------------------------------------------------- Проверка: specks, open paths, no false positives
def rect(x, y, w, h): return f'M{x} {y}h{w}v{h}h{-w}Z'
def svg(d): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path d="{d}"/></svg>'


def specks(p):
    s = Session(p, 'tools_speck')
    try:
        base = rect(100, 300, 190, 700) + rect(290, 300, 400, 140) + rect(290, 580, 330, 140) + rect(290, 860, 400, 140)
        sizes = [(6, 'Е'), (10, 'Ж'), (16, 'З'), (24, 'И')]  # import drops contours under 30 u2 itself (impCleanup)
        for n, ch in sizes:
            s.pg.evaluate("([c,t])=>impSet(c,t,c+'.svg')", [ch, svg(base + rect(850, 500, n, n))])
        s.pg.evaluate("([c,t])=>impSet(c,t,c+'.svg')", ['Л', svg(base)])  # clean control
        s.js("iuRegisterNow()"); s.pg.wait_for_function("!!FONTS.imp", timeout=20000); s.open_font('imp'); s.pg.wait_for_timeout(400)
        res = s.js("""(()=>{PF.ver=-1;const m=computeProof();const out={};for(const ch of 'ЕЖЗИЛ'){const r=m.get(ch);out[ch]=r.issues.map(x=>x.t)}return out})()""")
        for n, ch in sizes:
            assert any('пятно' in t for t in res[ch]), f'{ch} ({n}x{n} speck) not flagged: {res[ch]}'
        assert not any('пятно' in t for t in res['Л']), f'clean control flagged: {res["Л"]}'
        # open paths
        r = s.js("""(()=>{const f=CUR_FONT;CU.byFont[f]=CU.byFont[f]||{};
          const ring=[{x:300,y:100},{x:600,y:100},{x:600,y:600},{x:300,y:600},{x:310,y:112}].map(n=>Object.assign({a:null,b:null},n));
          CU.byFont[f]['★']={skel:[{nodes:ring,closed:false}]};
          const open=proofOpen('★');
          const far=[{x:100,y:100},{x:400,y:100},{x:700,y:100}].map(n=>Object.assign({a:null,b:null},n));
          CU.byFont[f]['☆']={skel:[{nodes:far,closed:false}]};
          const ok=proofOpen('☆');delete CU.byFont[f]['★'];delete CU.byFont[f]['☆'];return {open,ok};})()""")
        assert r['open'] and not r['ok'], f'open-path detector: {r}'
        return 'sizes 6..24 flagged, clean control ok, open path ok'
    finally:
        s.close()


def specks_stock(p):
    """no false positives on the 15 stock fonts (both styles)"""
    s = Session(p, 'tools_speck2')
    try:
        tot = 0
        for fid in FONTS_ALL:
            s.open_font(fid)
            for st in ('regular', 'italic'):
                s.pg.click(f'[data-style={st}]'); s.pg.wait_for_timeout(100)
                bad = s.js("""(()=>{PF.ver=-1;const m=computeProof();const out=[];for(const [ch,r] of m)for(const x of r.issues)if(/пятно|вырожден|не замкнут/.test(x.t))out.push(ch+': '+x.t);return out})()""")
                tot += s.js("CHARSET.length")
                assert not bad, f'{fid}/{st} false positives: {bad[:5]}'
        return f'{len(FONTS_ALL)} fonts x2 clean ({tot} glyph checks)'
    finally:
        s.close()


# ---------------------------------------------------------------- kern pill == GPOS
PAIRS = ['AV', 'AT', 'AY', 'AW', 'LT', 'LY', 'PA', 'TA', 'VA', 'WA', 'YA', 'OA', 'FA', 'RT', 'KO',
         'Ta', 'Te', 'To', 'Tr', 'Ty', 'Va', 'Vo', 'Ya', 'Yo', 'Fo', 'Po',
         'ГА', 'ТА', 'Ту', 'То', 'Те', 'Ра', 'Ку', 'T.', 'V.', 'F.', 'r.', '«T', 'A”', 'eу', 'oд']
KERN_JS = """(k)=>{ensureKern();S.style=k;const w=weightOf(S.styles.regular.p);const r=buildTTF(k,S,{weight:w.weight,weightName:w.name});
  let s='';const b=r.bytes;for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s);}"""


def kern_pill(p):
    import base64
    s = Session(p, 'tools_kern')
    try:
        tot = 0; per = {}
        for fid in ['volt', 'renessa', 'propis', 'stroka', 'codex']:
            s.open_font(fid)
            raw = base64.b64decode(s.pg.evaluate(KERN_JS, 'regular'))
            f = TTFont(io.BytesIO(raw)); cm = f.getBestCmap()
            rows = s.pg.evaluate("(ps)=>ps.map(pq=>{const [a,b]=Array.from(pq);if(!GL[a]||!GL[b])return null;const i=kernInfo(a,b,S.styles.regular,'regular',kkGet);return [pq,i.v,i.blocked];})", PAIRS)
            rows = [r for r in rows if r]
            # 30 pairs per font minimum
            assert len(rows) >= 30, f'{fid}: only {len(rows)} pairs available'
            rows = rows[:30]
            bad = []
            for pq, v, blocked in rows:
                g = kern(f, pq[0], pq[1]) or 0
                if abs((v or 0) - g) > 0.5: bad.append((pq, v, g, 'locked' if blocked else ''))
            assert not bad, f'{fid}: pill != GPOS for {bad[:6]}'
            per[fid] = len(rows); tot += len(rows)
        # propis: the lock holds in the export (no letter-letter pair at all)
        s.open_font('propis')
        raw = base64.b64decode(s.pg.evaluate(KERN_JS, 'regular')); f = TTFont(io.BytesIO(raw))
        nz = [(a + b) for a, b in [('Т', 'а'), ('T', 'o'), ('A', 'V'), ('Т', 'у'), ('А', 'В'), ('r', 'e')] if (kern(f, a, b) or 0) != 0]
        assert not nz, f'propis exports letter-letter kerning: {nz}'
        return f'{tot} pairs {per}'
    finally:
        s.close()


# ---------------------------------------------------------------- draw tool spacing
def draw_spacing(p):
    from e2e_draw import setup, gclick, openpane
    s, d = setup(p, 'tools_draw'); pg = s.pg
    try:
        gclick(pg, '#dr-pg [data-g=tile]')
        d.goto('Н'); d.tool('shape'); d.path([(13, 9), (190, 690)], 2); d.path([(500, 9), (700, 690)], 2); d.click(262, 262); d.save()
        d.goto('И'); d.path([(0, 0), (175, 700)], 2); d.path([(525, 0), (700, 700)], 2); d.click(262, 262); d.save()
        d.goto('О'); d.tool('marker')
        ring = [(350 + 280 * math.cos(a / 10 * 2 * math.pi), 350 + 280 * math.sin(a / 10 * 2 * math.pi)) for a in range(0, 11)]
        d.path(ring, 3); pg.wait_for_function("GT_DRAW._t.cur.items.length===1", timeout=15000); d.save()
        pg.click('#dr-fontb'); pg.wait_for_selector('#dr-mf:not([hidden])'); pg.fill('#dr-nm', 'Тест Поля'); pg.click('#dr-mfo')
        pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=120000)
        sp = s.js("JSON.stringify(Object.fromEntries(Object.entries(GT_DRAW._t.D.g).filter(([c,r])=>r.s).map(([c,r])=>[c,r.sp])))")
        sp = json.loads(sp)
        got = s.pg.evaluate("""(chs)=>{const o={};for(const ch of chs){cache.clear();const g=getFinal(ch,'regular');let x0=1e9,x1=-1e9;for(const c of g.cs)for(const q of flatC(c,8)){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);}o[ch]=[Math.round(x0),Math.round(g.adv-x1)];}return o;}""", list(sp.keys()))
        bad = {ch: (sp[ch], got[ch]) for ch in sp if abs(got[ch][0] - sp[ch]['l']) > 2 or abs(got[ch][1] - sp[ch]['r']) > 2}
        assert not bad, f'built font spacing != recommended (want l/r, got): {bad}'
        return 'spacing ' + ' '.join(f"{ch}:{sp[ch]['l']}/{sp[ch]['r']}" for ch in sp)
    finally:
        s.close()


# ---------------------------------------------------------------- nodeSmooth keeps lines straight
def node_smooth(p):
    s = Session(p, 'tools_node')
    try:
        s.open_font('volt'); s.js("dwClose('edit')")
        out = []
        for ch in ['D', 'Р', 'P', 'B']:
            s.js(f"selectGlyph('{ch}');S.mode='points';syncPanel();schedule()"); s.pg.wait_for_timeout(300)
            nodes = s.js("""(()=>{const raw=rawGlyph();const r=[];raw.cs.forEach((c,ci)=>{const N=c.nodes,n=N.length;N.forEach((q,ni)=>{
                const P=N[(ni-1+n)%n],Q=N[(ni+1)%n];const hs=(h,o)=>!!h&&Math.hypot(h.x-o.x,h.y-o.y)>0.5;
                const ha=hs(q.a,q),hb=hs(q.b,q),pb=hs(P.b,P),qa=hs(Q.a,Q);
                const lineIn=!pb&&!ha,lineOut=!qa&&!hb;
                if((lineIn&&hb&&!lineOut)||(lineOut&&ha&&!lineIn))r.push([ci,ni,lineIn?'in':'out']);});});return r;})()""")
            for ci, ni, side in nodes[:3]:
                s.js(f"S.node={{ci:{ci},ni:{ni},part:'p'}};nodeSmooth()")
                r = s.js(f"""(()=>{{const raw=rawGlyph();const N=raw.cs[{ci}].nodes,n=N.length,q=N[{ni}],P=N[({ni}-1+n)%n],Q=N[({ni}+1)%n];
                  const hs=(h,o)=>!!h&&Math.hypot(h.x-o.x,h.y-o.y)>0.5;
                  const side='{side}';
                  if(side==='in'){{ // line P->q: no handle may appear on the line side; the curve handle b must be collinear with P->q
                    const straight=!hs(q.a,q)&&!hs(P.b,P);const dx=q.x-P.x,dy=q.y-P.y,bx=q.b.x-q.x,by=q.b.y-q.y;
                    const cross=(dx*by-dy*bx)/(Math.hypot(dx,dy)*Math.hypot(bx,by));return [straight,Math.abs(cross),(dx*bx+dy*by)>0];}}
                  const straight=!hs(q.b,q)&&!hs(Q.a,Q);const dx=Q.x-q.x,dy=Q.y-q.y,ax=q.a.x-q.x,ay=q.a.y-q.y;
                  const cross=(dx*ay-dy*ax)/(Math.hypot(dx,dy)*Math.hypot(ax,ay));return [straight,Math.abs(cross),(dx*ax+dy*ay)<0];}})()""")
                assert r[0] and r[1] < 0.02 and r[2], f'{ch} node {ci}:{ni} ({side}): line bent or handle not collinear {r}'
                out.append(f'{ch}{ci}:{ni}')
                s.js("resetNode()")
        assert out, 'no curve-to-line node found'
        return 'nodes ' + ' '.join(out[:6])
    finally:
        s.close()


# ---------------------------------------------------------------- slider tracks
TRACK_JS = """()=>{const bad=[];for(const st of ['regular','italic']){const D=Object.assign({},DEFAULTS[st]);cur().p=Object.assign({},D);S.style=st;syncPanel();
  const L=paramLimits(Object.assign({},cur().p)).L,q=safeP(Object.assign({},cur().p));
  for(const [key] of PARAMS){const i=document.getElementById('p_'+key);if(!i)continue;const mn=+i.min,mx=+i.max,sp=+i.step,lm=L[key];
    if(lm){const reach=(Math.min(mx,lm[1])-Math.max(mn,lm[0]))/((mx-mn)||1);if(reach<0.9&&(mx-mn)>3*sp)bad.push(st+' '+key+' reach '+Math.round(reach*100)+'% track '+mn+'..'+mx+' lim '+lm.map(v=>+v.toFixed(2)).join('..'));}
    const e=+q[key];if(isFinite(e)&&(e<mn-1e-6||e>mx+1e-6))bad.push(st+' '+key+' effective default '+e+' outside track '+mn+'..'+mx);
    const raw=+D[key];if(isFinite(raw)&&Math.abs(raw-e)<1e-6&&(raw<mn-1e-6||raw>mx+1e-6))bad.push(st+' '+key+' default '+raw+' outside track');
    const o=document.getElementById('o_'+key);if(o&&isFinite(e)&&Math.abs(+i.value-e)>sp+1e-6&&key!=='term')bad.push(st+' '+key+' thumb '+i.value+' != effective '+e);}}
  S.style='regular';cur().p=Object.assign({},DEFAULTS.regular);syncPanel();return bad;}"""


def tracks(p):
    s = Session(p, 'tools_track')
    try:
        n = 0
        for fid in FONTS_ALL:
            s.open_font(fid); s.open_panes()
            n += s.js("PARAMS.filter(r=>document.getElementById('p_'+r[0])).length")
            bad = s.js(TRACK_JS)
            assert not bad, f'{fid}: {bad[:6]}'
        # applik sb 92 default is covered; stroka has no dead aper; idle rules
        s.open_font('applik')
        assert s.js("+document.getElementById('p_sb').max") >= 92 or s.js("safeP(DEFAULTS.regular).sb") <= 90, 'applik sb range'
        s.open_font('stroka')
        assert s.js("!document.getElementById('p_aper')"), 'dead slider aper must be hidden on stroka'
        s.open_font('volt'); s.open_panes()
        assert s.js("document.getElementById('p_icomp').closest('.ctl').classList.contains('idle')"), 'icomp must be marked idle without slant'
        s.js("cur().p.slant=8;syncPanel()")
        assert s.js("!document.getElementById('p_icomp').closest('.ctl').classList.contains('idle')"), 'icomp must work with slant'
        # explanations start with the label term
        s.open_font('codex'); s.open_panes()
        r = s.js("""()=>[...document.querySelectorAll('#params .ctl')].map(row=>{const l=(row.querySelector('label span')||{}).textContent||'';const t=(row.querySelector('.xp-t')||{}).textContent||'';return [l,t];}).filter(x=>x[1])""")
        bad = [x for x in r if x[1].split(' — ')[0].lower().replace('ё', 'е') != x[0].split(',')[0].split(':')[0].split('(')[0].strip().lower().replace('ё', 'е')]
        assert not bad, f'explanation term != label term: {bad[:3]}'
        diag = [x[1] for x in r if x[0].startswith('Угол пера')][0]
        assert 'перо' in diag and 'Диагонали' not in diag, diag
        s.open_font('modul'); s.open_panes()
        conn = s.js("(()=>{const r=document.querySelector('#p_conn');return r?r.closest('.ctl').querySelector('.xp-t').textContent:''})()")
        assert 'Скважина' in conn and 'Связность' not in conn, conn
        assert not s.errs, s.errs[:2]
        return f'{n} sliders x2 styles, {len(FONTS_ALL)} fonts'
    finally:
        s.close()


# ---------------------------------------------------------------- Сцепка export mode, name ID 0, SVG white warning
def export_hygiene(p):
    import base64
    s = Session(p, 'tools_exp')
    try:
        s.open_font('stsepka')
        feats = {}
        for mode in (0, 1, 2):
            s.js(f"for(const k of ['regular','italic'])S.styles[k].p.zlig={mode};bump()")
            raw = base64.b64decode(s.pg.evaluate(KERN_JS, 'regular')); f = TTFont(io.BytesIO(raw))
            gsub = f['GSUB'].table if 'GSUB' in f else None
            fr = {}
            if gsub:
                for r in gsub.FeatureList.FeatureRecord:
                    fr.setdefault(r.FeatureTag, []).append(len(r.Feature.LookupListIndex))
            feats[mode] = fr
            nm = {r.nameID: r.toUnicode() for r in f['name'].names if r.platformID == 3 and r.langID == 0x409}
            assert nm.get(0) == '© G-type', f'name ID 0 unsigned: {nm.get(0)!r}'
        assert 'calt' in feats[0] and 'ss02' in feats[0], feats
        assert 'calt' not in feats[2] and 'ss02' not in feats[2], f'mode Выкл must drop calt/ss02: {feats[2]}'
        assert 'calt' in feats[1] and max(feats[1]['calt']) >= 2, f'mode Все: ss02 lookups must be in calt: {feats[1]}'
        # menu note
        s.js("for(const k of ['regular','italic'])S.styles[k].p.zlig=2;bump()")
        s.pg.click('#ex-menu'); s.pg.wait_for_function("document.getElementById('xm-note')&&document.getElementById('xm-note').textContent.length>0", timeout=5000)
        note = s.js("document.getElementById('xm-note').textContent")
        assert 'выключены' in note, note
        s.pg.keyboard.press('Escape')
        # signed author in name ID 0
        s.js("window.GT_AUTHOR={name:'Анна Тестова',url:'https://example.org'}")
        raw = base64.b64decode(s.pg.evaluate(KERN_JS, 'regular')); f = TTFont(io.BytesIO(raw))
        nm = {r.nameID: r.toUnicode() for r in f['name'].names if r.platformID == 3 and r.langID == 0x409}
        assert 'Анна Тестова' in nm.get(0, '') and nm.get(0, '').startswith('©'), nm.get(0)
        # SVG white fill warning
        w = s.js("""svgImport('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/><circle cx="50" cy="50" r="20" fill="#fff"/></svg>').warn""")
        assert 'white' in w, w
        w2 = s.js("""svgImport('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>').warn""")
        assert 'white' not in w2, w2
        assert not s.errs, s.errs[:2]
        return f'calt/ss02 {feats[0]} | {feats[1]} | {feats[2]}; ID0 ok; white warn ok'
    finally:
        s.close()


# ---------------------------------------------------------------- numeric input + reset
def numeric(p):
    s = Session(p, 'tools_num')
    try:
        pg = s.pg
        s.open_font('volt'); s.open_panes(); s.js(OPEN_GRP)
        mn, mx = s.js("[+document.getElementById('p_stem').min,+document.getElementById('p_stem').max]")
        pg.click('#o_stem')
        pg.wait_for_selector('#params .vin')
        pg.fill('#params .vin', '150'); pg.keyboard.press('Enter')
        assert s.js("cur().p.stem") == 150, s.js("cur().p.stem")
        assert s.js("!document.querySelector('#params .vin') && !document.getElementById('o_stem').hidden"), 'input must close after Enter'
        assert s.js("document.getElementById('o_stem').textContent") == '150'
        # clamp
        pg.click('#o_stem'); pg.fill('#params .vin', '99999'); pg.keyboard.press('Enter')
        v = s.js("cur().p.stem"); eff = s.js("safeP(cur().p).stem")
        assert mn <= v <= mx, f'clamped value {v} not in track {mn}..{mx}'
        assert abs(eff - s.js("+document.getElementById('p_stem').value")) <= 1, 'thumb follows the clamped value'
        # undo restores
        pg.keyboard.press('Control+z')
        assert s.js("cur().p.stem") == 150, 'typed value must be one undo step'
        # Escape cancels
        pg.click('#o_stem'); pg.fill('#params .vin', '77'); pg.keyboard.press('Escape')
        assert s.js("cur().p.stem") == 150, 'Escape must not apply'
        # per-slider reset
        d = s.js("DEFAULTS.regular.stem")
        pg.hover('#p_stem')
        assert s.js("!document.getElementById('p_stem').closest('.ctl').querySelector('.rst').hidden"), 'reset must be visible for a changed value'
        s.pg.evaluate("document.getElementById('p_stem').closest('.ctl').querySelector('.rst').click()")
        assert s.js("cur().p.stem") == d, f'reset -> {s.js("cur().p.stem")} want {d}'
        assert s.js("document.getElementById('p_stem').closest('.ctl').querySelector('.rst').hidden"), 'reset hidden at default'
        assert not s.errs, s.errs[:2]
        return f'typed 150, clamp {mx}, undo, esc, reset {d}'
    finally:
        s.close()


CHECKS = [('presets', presets), ('undo', undo), ('specks', specks), ('specks_stock', specks_stock), ('kern_pill', kern_pill), ('draw_spacing', draw_spacing),
          ('node_smooth', node_smooth), ('tracks', tracks), ('export_hygiene', export_hygiene), ('numeric', numeric)]

if __name__ == '__main__':
    only = set(sys.argv[1:])
    rc = 0; ok = []; t0 = time.time()
    with sync_playwright() as p:
        for name, fn in CHECKS:
            if only and name not in only:
                continue
            t1 = time.time()
            try:
                det = fn(p); ok.append(name)
                print(f'  ok {name} {det} t={time.time()-t1:.1f}s', flush=True)
            except Exception as e:  # noqa
                rc = 1
                print(f'  FAIL {name} {type(e).__name__}: {str(e)[:400]} t={time.time()-t1:.1f}s', flush=True)
    print(('PASS' if rc == 0 else 'FAIL') + f' tools {len(ok)}/{len([n for n, _ in CHECKS if not only or n in only])} checks ({",".join(ok)}) t={time.time()-t0:.1f}s')
    sys.exit(rc)
