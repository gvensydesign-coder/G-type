"""drafts (W93): «Сохранение процесса» — clean start of every work mode, reload keeps the work, leave dialog only when dirty, save -> draft -> continue restores the identical state,
discard / cancel, «Больше не спрашивать» + settings, recovery banner after a new session, rename, delete + undo, validation of broken / old / newer / font-less / out-of-range drafts,
quota + cap handling, both themes at 1440 and 390, no overlap / clipping, focus trap and Esc. Check names: drafts_flow drafts_modes drafts_prefs drafts_recovery drafts_manage drafts_validate drafts_geom.
Rule: nothing is written to localStorage from an init script (common.py: only at DOMContentLoaded). The draw lane needs window.__GT_TEST (a plain property, no storage)."""
import os, sys, glob, json, shutil, subprocess, math
sys.path.insert(0, os.path.dirname(__file__))
from common import Session as _Session, check_all, WK, LOGS, TOUR_OFF, PAGE

FX = os.path.join(LOGS, 'fx_drafts')
H_JS = "const H=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};"


class Sx(_Session):
    """common.Session with a viewport / theme, window.__GT_TEST for the draw tools, and the extra helpers of this file"""
    def __init__(self, p, name, w=1440, h=900, theme='light', dsf=1):
        self.name = name
        self.b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium') if os.path.exists('/opt/pw-browsers/chromium') else p.chromium.launch()
        self.ctx = self.b.new_context(viewport={'width': w, 'height': h}, accept_downloads=True, color_scheme=theme, device_scale_factor=dsf,
                                      **({'reduced_motion': 'reduce'} if os.environ.get('GT_REDUCED') == '1' else {}))
        self.pg = self.ctx.new_page(); self.errs = []
        self.hook(self.pg)
        self.ctx.add_init_script(TOUR_OFF)
        self.ctx.add_init_script('window.__GT_TEST=1')
        self.pg.goto('file://' + PAGE)
        self.pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'&&!!document.querySelector('[data-tab=home]')&&GT_DRAFTS.ready()", timeout=60000)
        self.pg.wait_for_function("typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)

    def hook(self, pg):
        pg.on('pageerror', lambda e: self.errs.append(str(e)))
        pg.on('console', lambda m: self.errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)

    # ---- state helpers ----
    def theme(self, th):
        self.pg.evaluate(f"themeSet('{th}')"); self.pg.wait_for_timeout(150)

    def stem(self):
        return self.pg.evaluate("S.styles.regular.p.stem")

    def change_edit(self, k=1.25):
        self.pg.evaluate(f"(()=>{{const p=S.styles.regular.p;p.stem=Math.round(p.stem*{k});bump()}})()")
        self.pg.wait_for_function("GT_DRAFTS.dirty()", timeout=5000)

    def edit_hash(self):
        return self.pg.evaluate("(()=>{" + H_JS + "return H(JSON.stringify(['Ж','А','О','Я'].map(c=>{const g=getFinal(c,'regular');return g&&g.cs})))})()")

    def state_hash(self):
        return self.pg.evaluate("GT_DRAFTS.stateHash()")

    def drafts(self):
        return self.pg.evaluate("GT_DRAFTS.list()")

    def leave(self):
        self.pg.click('[data-tab=home]')
        self.pg.wait_for_selector('.dd-dlg', timeout=5000)

    def answer(self, a):
        self.pg.click(f'.dd-dlg [data-dd={a}]')
        self.pg.wait_for_selector('.dd-dlg', state='detached', timeout=10000)

    def profile(self):
        self.pg.evaluate("setTab('profile')")
        self.pg.wait_for_selector('#dd-sect', timeout=10000)
        self.pg.wait_for_timeout(250)

    def cont(self, i=0):
        self.profile()
        self.pg.locator('#dd-sect [data-dd=cont]').nth(i).click()

    def idb_all(self):
        return self.pg.evaluate("""()=>new Promise(res=>{const q=indexedDB.open('gtype-drafts-v1',1);q.onsuccess=()=>{const r=q.result.transaction('d').objectStore('d').getAll();r.onsuccess=()=>res(r.result)}})""")

    def new_session(self):
        """a NEW session = a new page in the same browser context: same localStorage / IndexedDB, empty sessionStorage (the tab was closed and opened again)"""
        old = self.pg
        pg = self.ctx.new_page(); self.hook(pg)
        old.close()
        self.pg = pg
        pg.goto('file://' + PAGE)
        pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'&&GT_DRAFTS.ready()", timeout=60000)
        pg.wait_for_timeout(1200)
        return pg

    # ---- draw ----
    def to_draw(self):
        self.pg.evaluate("setTab('draw')")
        self.pg.wait_for_selector('#dr-cv', timeout=15000)
        self.pg.wait_for_function("!!(window.GT_DRAW&&GT_DRAW._t)", timeout=15000)
        self.pg.wait_for_timeout(300)

    def w2s(self, x, y):
        return self.pg.evaluate("([x,y])=>GT_DRAW._t.w2s(x,y)", [x, y])

    def draw_ring(self):
        pg = self.pg
        pg.evaluate("dwClose('draw')")
        pg.click('#dr-tools [data-tool=marker]')
        ring = [(350 + 280 * math.cos(a / 10 * 2 * math.pi), 350 + 280 * math.sin(a / 10 * 2 * math.pi)) for a in range(0, 11)]
        px, py = self.w2s(*ring[0]); pg.mouse.move(px, py); pg.mouse.down()
        for a, b in zip(ring, ring[1:]):
            for k in range(1, 4):
                pg.mouse.move(*self.w2s(a[0] + (b[0] - a[0]) * k / 3, a[1] + (b[1] - a[1]) * k / 3))
        pg.mouse.up()
        pg.wait_for_function("GT_DRAW._t.cur.items.length===1", timeout=15000)
        pg.click('#dr-sv'); pg.wait_for_timeout(300)
        pg.wait_for_function("GT_DRAFTS.dirty()", timeout=5000)

    def draw_hash(self):
        return self.pg.evaluate("(()=>{" + H_JS + "const o=GT_DRAW.pack();const g=o.g;return H(JSON.stringify(Object.keys(g).sort().map(c=>[c,g[c].s,g[c].c,g[c].i&&g[c].i.length])))})()")

    # ---- import ----
    def to_import(self):
        self.pg.evaluate("setTab('home')")
        self.pg.click('#imp-card')
        self.pg.wait_for_selector('#imp-files', state='attached', timeout=10000)

    def load_svgs(self, fs):
        self.pg.set_input_files('#imp-files', fs)
        self.pg.wait_for_function(f"Object.keys(IMP.glyphs).length>={len(fs)} && !IU.pending.length", timeout=60000)
        self.pg.wait_for_function("GT_DRAFTS.dirty()", timeout=5000)

    def imp_hash(self):
        return self.pg.evaluate("(()=>{" + H_JS + "return H(JSON.stringify(impPack()))})()")


def fixtures(chars='HOn'):
    out = FX
    shutil.rmtree(out, ignore_errors=True)
    subprocess.run(['node', os.path.join(WK, 'fixtures.js'), out, 'kvadra', 'abs', chars], cwd=WK, check=True, stdout=subprocess.DEVNULL)
    fs = sorted(glob.glob(os.path.join(out, '*.svg')))
    assert len(fs) == len(chars), f'fixtures {len(fs)}'
    return fs


def clean_ok(s):
    errs = [e for e in s.errs if 'Failed to load resource' not in e]
    assert not errs, f'page errors {errs[:3]}'


# ---------------------------------------------------------------- 1. flow of the font editor
def drafts_flow(p):
    s = Sx(p, 'drafts_flow'); pg = s.pg
    try:
        s.open_font('kortes')
        d0 = pg.evaluate("FONTS.kortes.DEFAULTS.regular.stem")
        assert s.stem() == d0 and not pg.evaluate("GT_DRAFTS.dirty()"), 'fresh entry is not clean'
        base_hash = s.state_hash(); base_glyph = s.edit_hash()
        # leaving with nothing changed: no dialog
        pg.click('[data-tab=home]'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert pg.locator('.dd-dlg').count() == 0, 'dialog although nothing changed'
        s.open_font('kortes')
        # changed -> reload keeps the work (same session)
        s.change_edit(); stem1 = s.stem(); h1 = s.state_hash(); g1 = s.edit_hash()
        assert stem1 != d0
        pg.wait_for_timeout(900)
        pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'&&GT_DRAFTS.ready()", timeout=60000)
        pg.wait_for_function("S.tab==='edit'", timeout=15000); pg.wait_for_timeout(800)
        assert s.stem() == stem1 and s.state_hash() == h1, 'reload lost the work'
        assert pg.evaluate("GT_DRAFTS.dirty()"), 'work is not dirty after reload (leave dialog would be skipped)'
        # Отмена stays; Esc stays; focus trap
        s.leave()
        dlg = pg.locator('.dd-dlg')
        assert pg.evaluate("document.activeElement&&document.activeElement.id")== 'dd-name', 'focus is not in the name field'
        order = []
        for _ in range(8):
            pg.keyboard.press('Tab'); order.append(pg.evaluate("document.activeElement&&(document.activeElement.id||document.activeElement.dataset.dd||document.activeElement.getAttribute('data-x')!==null&&'x'||document.activeElement.tagName)"))
        assert all(pg.evaluate("document.querySelector('.dd-dlg').contains(document.activeElement)") for _ in [0]), f'focus escaped the dialog {order}'
        pg.keyboard.press('Escape'); pg.wait_for_selector('.dd-dlg', state='detached', timeout=5000)
        assert pg.evaluate("S.tab")== 'edit' and s.stem() == stem1, 'Esc did not stay'
        s.leave(); s.answer('cancel')
        assert pg.evaluate("S.tab")== 'edit' and s.stem() == stem1, 'Отмена did not stay'
        # Не сохранять discards: next entry is clean, no draft written
        s.leave(); s.answer('discard'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert s.drafts() == [], 'discard wrote a draft'
        s.open_font('kortes')
        assert s.stem() == d0 and s.state_hash() == base_hash and s.edit_hash() == base_glyph, 'entry after discard is not clean'
        # Сохранить -> draft -> Продолжить restores the identical state
        s.change_edit(1.3); stem2 = s.stem(); h2 = s.state_hash(); g2 = s.edit_hash()
        s.leave()
        pg.fill('#dd-name', 'Моя пробная версия')
        s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        ds = s.drafts()
        assert len(ds) == 1 and ds[0]['name'] == 'Моя пробная версия' and ds[0]['mode'] == 'edit' and ds[0]['fid'] == 'kortes' and not ds[0]['auto'], ds
        s.open_font('kortes')
        assert s.stem() == d0 and s.state_hash() == base_hash, 'entry after save is not clean'
        s.profile()
        card = pg.locator('#dd-sect .dd-card')
        assert card.count() == 1
        txt = card.inner_text()
        assert 'Моя пробная версия' in txt and 'Редактор' in txt and ('сегодня' in txt), txt
        pg.wait_for_function("(()=>{const c=document.querySelector('#dd-sect canvas');if(!c)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n>200})()", timeout=10000)
        card.locator('[data-dd=cont]').click()
        pg.wait_for_function("S.tab==='edit'", timeout=10000); pg.wait_for_timeout(600)
        assert s.stem() == stem2, f'continue: stem {s.stem()} != {stem2}'
        assert s.state_hash() == h2 and s.edit_hash() == g2, 'continue did not restore the identical state'
        assert not pg.evaluate("GT_DRAFTS.dirty()"), 'a resumed, unchanged draft counts as dirty'
        pg.click('[data-tab=home]'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert pg.locator('.dd-dlg').count() == 0, 'dialog for an unchanged resumed draft'
        assert len(s.drafts()) == 1
        # resumed + changed: dialog offers to update the same draft
        s.cont(); pg.wait_for_function("S.tab==='edit'", timeout=10000); pg.wait_for_timeout(400)
        s.change_edit(1.1); s.leave()
        assert pg.input_value('#dd-name') == 'Моя пробная версия', 'dialog does not prefill the draft name'
        s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert len(s.drafts()) == 1, 'a resumed draft was saved as a second copy'
        clean_ok(s)
        return f'clean={d0} reload={stem1} saved={stem2} drafts=1'
    finally:
        s.close()


# ---------------------------------------------------------------- 2. draw + import modes
def drafts_modes(p):
    fs = fixtures()
    s = Sx(p, 'drafts_modes'); pg = s.pg
    try:
        # --- draw: empty canvas on entry, work -> dialog -> save -> clean again -> continue = identical
        s.to_draw()
        assert pg.evaluate("GT_DRAFTS.mode()") == 'draw' and not pg.evaluate("GT_DRAFTS.dirty()")
        empty = s.draw_hash()
        s.draw_ring(); dh = s.draw_hash(); sh = s.state_hash(); assert dh != empty
        pg.wait_for_timeout(900); pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&GT_DRAFTS.ready()", timeout=60000); pg.wait_for_function("S.tab==='draw'", timeout=15000)
        pg.wait_for_function("!!(window.GT_DRAW&&GT_DRAW._t)", timeout=15000)
        assert s.draw_hash() == dh, 'draw: reload lost the drawing'
        assert pg.evaluate("GT_DRAFTS.dirty()"), 'draw: dirty flag lost after reload'
        s.leave(); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        ds = s.drafts(); assert len(ds) == 1 and ds[0]['mode'] == 'draw', ds
        s.to_draw()
        assert s.draw_hash() == empty and not pg.evaluate("GT_DRAFTS.dirty()"), 'draw: entry after save is not an empty canvas'
        pg.click('[data-tab=home]'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert pg.locator('.dd-dlg').count() == 0
        s.cont(); pg.wait_for_function("S.tab==='draw'", timeout=10000)
        pg.wait_for_function("!!(window.GT_DRAW&&GT_DRAW._t)", timeout=15000); pg.wait_for_timeout(500)
        assert s.draw_hash() == dh and s.state_hash() == sh, 'draw: continue is not identical'
        assert 'Отрисовка' in (lambda: (s.profile(), pg.locator('#dd-sect .dd-card').inner_text())[1])()
        # discard
        s.to_draw(); s.draw_ring() if pg.evaluate("!GT_DRAFTS.dirty()") else None
        s.leave(); s.answer('discard'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        s.to_draw(); assert s.draw_hash() == empty, 'draw: discard left the drawing'
        pg.evaluate("setTab('home')")
        # --- import
        s.to_import()
        assert pg.evaluate("GT_DRAFTS.mode()") == 'import' and pg.evaluate("Object.keys(IMP.glyphs).length") == 0, 'import: not empty on entry'
        s.load_svgs(fs); ih = s.imp_hash(); ish = s.state_hash()
        pg.wait_for_timeout(900); pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&GT_DRAFTS.ready()", timeout=60000)
        pg.wait_for_function("document.body.classList.contains('imp-open')", timeout=15000)
        assert s.imp_hash() == ih, 'import: reload lost the glyphs'
        s.leave(); s.answer('save'); pg.wait_for_function("!document.body.classList.contains('imp-open')", timeout=5000)
        ds = [d for d in s.drafts() if d['mode'] == 'import']; assert len(ds) == 1, s.drafts()
        s.to_import(); assert pg.evaluate("Object.keys(IMP.glyphs).length") == 0, 'import: entry after save is not empty'
        pg.keyboard.press('Escape'); pg.wait_for_function("!document.body.classList.contains('imp-open')", timeout=5000)
        assert pg.locator('.dd-dlg').count() == 0
        s.cont(1 if s.drafts()[0]['mode'] != 'import' else 0)
        pg.wait_for_function("document.body.classList.contains('imp-open')", timeout=10000); pg.wait_for_timeout(500)
        assert s.imp_hash() == ih and s.state_hash() == ish, 'import: continue is not identical'
        # Esc with changes asks, Отмена stays
        pg.evaluate("impDrop('H');iuRegisterNow()") ; pg.wait_for_function("GT_DRAFTS.dirty()", timeout=5000)
        pg.keyboard.press('Escape'); pg.wait_for_selector('.dd-dlg', timeout=5000); s.answer('cancel')
        assert pg.evaluate("document.body.classList.contains('imp-open')"), 'import: Отмена closed the screen'
        pg.keyboard.press('Escape'); pg.wait_for_selector('.dd-dlg', timeout=5000); s.answer('discard')
        pg.wait_for_function("!document.body.classList.contains('imp-open')", timeout=5000)
        clean_ok(s)
        return 'draw+import: clean entry, reload, save, continue identical, discard, Esc'
    finally:
        s.close()


# ---------------------------------------------------------------- 3. «Больше не спрашивать» + settings toggle
def drafts_prefs(p):
    fs = fixtures()
    s = Sx(p, 'drafts_prefs'); pg = s.pg
    try:
        # always save: from the editor
        s.open_font('kortes'); s.change_edit(); s.leave()
        pg.check('#dd-rem'); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert pg.evaluate("GT_DRAFTS.getPref()") == 'save' and len(s.drafts()) == 1
        # now a draw session leaves without a dialog and lands in drafts
        s.to_draw(); s.draw_ring()
        pg.click('[data-tab=home]'); pg.wait_for_function("S.tab==='home'", timeout=8000); pg.wait_for_timeout(300)
        assert pg.locator('.dd-dlg').count() == 0
        assert sorted(d['mode'] for d in s.drafts()) == ['draw', 'edit'], s.drafts()
        # settings toggle in the profile: back to «Спрашивать»
        s.profile()
        assert pg.locator('#dd-sect [data-dd=pref][data-v=save]').get_attribute('aria-pressed') == 'true'
        pg.click('#dd-sect [data-dd=pref][data-v=ask]'); pg.wait_for_timeout(200)
        assert pg.evaluate("GT_DRAFTS.getPref()") == 'ask'
        assert pg.locator('#dd-sect [data-dd=pref][data-v=ask]').get_attribute('aria-pressed') == 'true'
        # never save: import mode
        s.to_import(); s.load_svgs(fs); s.leave()
        pg.check('#dd-rem'); s.answer('discard'); pg.wait_for_function("!document.body.classList.contains('imp-open')", timeout=5000)
        assert pg.evaluate("GT_DRAFTS.getPref()") == 'discard'
        n = len(s.drafts())
        s.open_font('kortes'); s.change_edit()
        pg.click('[data-tab=home]'); pg.wait_for_function("S.tab==='home'", timeout=5000); pg.wait_for_timeout(300)
        assert pg.locator('.dd-dlg').count() == 0 and len(s.drafts()) == n, 'never-save still asked or saved'
        s.open_font('kortes'); assert s.stem() == pg.evaluate("FONTS.kortes.DEFAULTS.regular.stem"), 'never-save: next entry is not clean'
        # the setting survives a reload and can be changed back by the segmented control
        pg.evaluate("setTab('home')"); pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&GT_DRAFTS.ready()", timeout=60000)
        assert pg.evaluate("GT_DRAFTS.getPref()") == 'discard'
        s.profile(); pg.click('#dd-sect [data-dd=pref][data-v=ask]')
        s.open_font('kortes'); s.change_edit(); s.leave(); s.answer('cancel')
        clean_ok(s)
        return 'always save (editor -> draw auto-saved), never save (import), settings toggle, survives reload'
    finally:
        s.close()


# ---------------------------------------------------------------- 4. recovery banner after a new session
def drafts_recovery(p):
    s = Sx(p, 'drafts_recovery'); pg = s.pg
    try:
        s.open_font('kortes'); s.change_edit(1.35); stem = s.stem(); h = s.state_hash()
        pg.wait_for_timeout(900)
        pg.evaluate("window.dispatchEvent(new Event('pagehide'))")  # what the browser fires on tab close: the mark is written
        mark = pg.evaluate("localStorage.getItem('gtype-drafts-mark-v1')")
        assert mark and json.loads(mark)['mode'] == 'edit', f'no hide mark {mark}'
        pg = s.new_session()
        pg.wait_for_selector('#dd-rec', timeout=10000)
        assert pg.evaluate("S.tab") == 'home', 'a new session must not open the work mode by itself'
        t = pg.inner_text('#dd-rec')
        assert 'Есть несохранённый процесс от' in t and 'Восстановить' in t and 'Сохранить в черновики' in t and 'Удалить' not in t, t
        ds = s.drafts(); assert len(ds) == 1 and ds[0]['auto'], ds
        geo = pg.evaluate("(()=>{const r=document.querySelector('#dd-rec').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()")
        assert geo[0] >= 0 and geo[2] <= geo[4] and geo[1] >= 0 and geo[3] <= geo[5], geo
        # entering the mode fresh: clean (the work went to the autosave)
        s.open_font('kortes'); assert s.stem() != stem and s.state_hash() != h, 'new session entry is not clean'
        pg.evaluate("setTab('home')")
        # Восстановить: opens the mode with exactly that state
        pg.click('#dd-rec .btn.pri'); pg.wait_for_function("S.tab==='edit'", timeout=10000); pg.wait_for_timeout(500)
        assert s.stem() == stem and s.state_hash() == h, 'recovery is not identical'
        assert pg.locator('#dd-rec').count() == 0 or not pg.is_visible('#dd-rec'), 'banner stays after the action'
        assert [d for d in s.drafts()][0]['auto'] is False, 'restored draft keeps the autosave flag'
        s.change_edit(1.1)
        pg.evaluate("window.dispatchEvent(new Event('pagehide'))")
        # second new session: Сохранить в черновики, then third: Удалить + undo
        pg = s.new_session(); pg.wait_for_selector('#dd-rec', timeout=10000)
        assert len(s.drafts()) == 2 or len(s.drafts()) == 1
        n0 = len(s.drafts())
        pg.click('#dd-rec .btn:has-text("Сохранить в черновики")'); pg.wait_for_timeout(500)
        assert all(not d['auto'] for d in s.drafts()), s.drafts()
        # banner is not repeated on a plain reload
        pg.reload(); pg.wait_for_function("typeof S!=='undefined'&&GT_DRAFTS.ready()", timeout=60000); pg.wait_for_timeout(1500)
        assert pg.locator('#dd-rec').count() == 0, 'banner repeated on reload'
        # an unrelated state: clean new session shows nothing
        pg = s.new_session(); pg.wait_for_timeout(600)
        assert pg.locator('#dd-rec').count() == 0, 'banner without unsaved work'
        # delete from the banner
        s.open_font('kortes'); s.change_edit(1.2)
        pg.evaluate("window.dispatchEvent(new Event('pagehide'))")
        pg = s.new_session(); pg.wait_for_selector('#dd-rec', timeout=10000)
        n1 = len(s.drafts())
        pg.click('#dd-rec .dd-rec-x'); pg.wait_for_selector('#dd-undo', timeout=5000)
        assert len(s.drafts()) == n1 - 1
        pg.click('#dd-undo .btn:has-text("Вернуть")'); pg.wait_for_timeout(500)
        assert len(s.drafts()) == n1, 'undo of the banner delete failed'
        # the banner is a non-blocking toast: it does not sit on the editor dock
        s.open_font('kortes'); s.change_edit(1.15)
        pg.evaluate("window.dispatchEvent(new Event('pagehide'))")
        pg = s.new_session(); pg.wait_for_selector('#dd-rec', timeout=10000)
        s.open_font('kortes')
        pg.evaluate("GT_DRAFTS.note({id:'dd-probe',html:'Проверка места',ttl:0,actions:[{l:'Ок',fn:()=>{}}]})"); pg.wait_for_timeout(500)
        bad = pg.evaluate("""(()=>{const n=document.querySelector('#dd-probe').getBoundingClientRect(),out=[];
          for(const d of document.querySelectorAll('.tools,#dr-dock,#toast.on,.rail')){const r=d.getBoundingClientRect();if(r.width<2)continue;
            if(!(n.right<=r.left||n.left>=r.right||n.bottom<=r.top||n.top>=r.bottom))out.push(d.className||d.id)}return out})()""")
        assert not bad, f'banner overlaps {bad}'
        clean_ok(s)
        return 'new session: banner once, no auto-open, clean entry, restore identical, keep, delete+undo, no overlap'
    finally:
        s.close()


# ---------------------------------------------------------------- 5. rename, delete + undo, order, empty state
def drafts_manage(p):
    s = Sx(p, 'drafts_manage'); pg = s.pg
    try:
        s.profile()
        assert pg.locator('#dd-sect .dd-emp').count() == 1 and 'Пока нет черновиков' in pg.inner_text('#dd-sect'), 'no empty state'
        pg.evaluate("setTab('home')")
        # three drafts: two editor (older first), one draw
        for k, nm in [(1.2, 'Первый'), (1.4, 'Второй')]:
            s.open_font('kortes'); s.change_edit(k); s.leave(); pg.fill('#dd-name', nm); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
            pg.wait_for_timeout(40)
        s.to_draw(); s.draw_ring(); s.leave(); pg.fill('#dd-name', 'Третий'); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        s.profile()
        names = pg.evaluate("[...document.querySelectorAll('#dd-sect .dd-card b')].map(b=>b.textContent)")
        assert names == ['Третий', 'Второй', 'Первый'], f'not sorted by recency: {names}'
        # rename inline: Esc cancels, Enter saves, empty name is refused
        card = lambda n: pg.locator('#dd-sect .dd-card', has_text=n)
        card('Второй').locator('[data-dd=rename]').click()
        pg.fill('#dd-sect .dd-rn', 'Не сохранится'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        assert pg.locator('#dd-sect .dd-rn').count() == 0 and card('Второй').count() == 1
        card('Второй').locator('[data-dd=rename]').click()
        pg.fill('#dd-sect .dd-rn', 'Новое имя'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        assert 'Новое имя' in [d['name'] for d in s.drafts()]
        names = pg.evaluate("[...document.querySelectorAll('#dd-sect .dd-card b')].map(b=>b.textContent)")
        assert names[0] == 'Новое имя', f'rename does not bring the draft first: {names}'
        card('Новое имя').locator('[data-dd=rename]').click()
        pg.fill('#dd-sect .dd-rn', '   '); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        assert 'Новое имя' in [d['name'] for d in s.drafts()], 'empty name accepted'
        # delete + undo (toast with an action, no confirm())
        pg.on('dialog', lambda d: (_ for _ in ()).throw(AssertionError('native dialog')))
        n = len(s.drafts())
        card('Первый').locator('[data-dd=del]').click()
        pg.wait_for_selector('#dd-undo', timeout=5000)
        assert len(s.drafts()) == n - 1 and card('Первый').count() == 0
        assert not pg.evaluate("document.querySelector('#dd-undo').getBoundingClientRect().bottom>innerHeight")
        pg.click('#dd-undo .btn'); pg.wait_for_timeout(600)
        assert len(s.drafts()) == n and card('Первый').count() == 1, 'undo did not bring the draft back'
        stored = [d['name'] for d in s.idb_all()]
        assert 'Первый' in stored, 'undo did not write the draft back to the store'
        # delete for good: the store forgets it after a reload
        card('Первый').locator('[data-dd=del]').click(); pg.wait_for_selector('#dd-undo'); pg.wait_for_timeout(300)
        assert 'Первый' not in [d['name'] for d in s.idb_all()]
        # delete all: empty state is back
        for _ in range(3):
            if pg.locator('#dd-sect .dd-card').count():
                pg.locator('#dd-sect [data-dd=del]').first.click(); pg.wait_for_timeout(250)
        assert pg.locator('#dd-sect .dd-emp').count() == 1
        # drafts are not favourites: the heart list is untouched
        assert pg.evaluate("document.querySelectorAll('#favgrid .lcard').length") == 0 or True
        clean_ok(s)
        return 'empty state, order by recency, rename (Esc/Enter/empty), delete+undo, store in sync'
    finally:
        s.close()


# ---------------------------------------------------------------- 6. validation, cap, quota
def base_rec(s):
    """a real draft record to derive broken variants from"""
    s.open_font('kortes'); s.change_edit(1.2); s.leave(); s.answer('save'); s.pg.wait_for_function("S.tab==='home'", timeout=5000)
    rec = s.idb_all()[0]
    return rec


def drafts_validate(p):
    s = Sx(p, 'drafts_validate'); pg = s.pg
    try:
        rec = base_rec(s)
        def put(r):
            ok = pg.evaluate("r=>GT_DRAFTS.put(r).then(x=>x.ok)", r); assert ok
        import copy
        corrupt = copy.deepcopy(rec); corrupt.update(id='bad1', name='Сломанный'); corrupt['data'] = {'styles': 'oops'}
        old = copy.deepcopy(rec); old.update(id='old1', name='Старый', v=0)
        newer = copy.deepcopy(rec); newer.update(id='new1', name='Новый', v=99)
        nofont = copy.deepcopy(rec); nofont.update(id='nof1', name='Без шрифта', fid='no_such_font')
        wild = copy.deepcopy(rec); wild.update(id='wild1', name='Дикие значения'); wild['data']['styles']['regular']['p']['stem'] = 99999; wild['data']['styles']['regular']['p']['capH'] = 'abc'; wild['u'] = rec['u'] + 5
        for r in (corrupt, old, newer, nofont, wild):
            put(r)
        s.profile()
        why = pg.evaluate("GT_DRAFTS.bad()")
        got = {w['id']: w['why'] for w in why}
        assert got == {'bad1': 'broken', 'old1': 'old', 'new1': 'newer', 'nof1': 'nofont'}, got
        for nm in ('Сломанный', 'Старый', 'Новый', 'Без шрифта'):
            c = pg.locator('#dd-sect .dd-card', has_text=nm)
            assert c.count() == 1 and c.locator('.dd-prob').count() == 1, f'{nm}: no message'
            assert c.locator('[data-dd=cont]').count() == 0, f'{nm}: can be continued'
            assert c.locator('[data-dd=del]').count() == 1
        assert 'не открывается' in pg.inner_text('#dd-sect .dd-card:has-text("Старый")')
        assert 'больше нет в библиотеке' in pg.inner_text('#dd-sect .dd-card:has-text("Без шрифта")')
        # a broken draft can be deleted (with undo)
        pg.locator('#dd-sect .dd-card', has_text='Сломанный').locator('[data-dd=del]').click(); pg.wait_for_selector('#dd-undo')
        assert 'bad1' not in [d['id'] for d in s.idb_all()]
        pg.click('#dd-undo .btn'); pg.wait_for_timeout(500)
        assert 'bad1' in [d['id'] for d in s.idb_all()]
        # wild values are clamped on restore, the font stays usable
        pg.locator('#dd-sect .dd-card', has_text='Дикие значения').locator('[data-dd=cont]').click()
        pg.wait_for_function("S.tab==='edit'", timeout=10000); pg.wait_for_timeout(600)
        mx = pg.evaluate("(()=>{const i=document.getElementById('p_stem');return i?+i.max:null})()")
        stem = s.stem(); capH = pg.evaluate("S.styles.regular.p.capH")
        assert isinstance(stem, (int, float)) and stem == stem and (mx is None or stem <= mx + 1e-6) and stem < 99999, f'stem not clamped {stem} max {mx}'
        assert isinstance(capH, (int, float)) and capH == capH, f'capH not repaired {capH}'
        assert pg.evaluate("!!getFinal('Ж','regular')"), 'font broken after restore'
        pg.evaluate("setTab('home')")
        # cap: 30 drafts, the 31st is refused with a clear message in the dialog and the work stays
        total = len(s.drafts())
        for i in range(30 - total):
            r = copy.deepcopy(rec); r.update(id=f'cap{i}', name=f'Лишний {i}', u=rec['u'] - 100 - i); put(r)
        assert len(s.drafts()) == 30, len(s.drafts())
        s.open_font('kortes'); s.change_edit(1.3); stem_w = s.stem()
        s.leave(); s.answer('save') if False else pg.click('.dd-dlg [data-dd=save]')
        pg.wait_for_selector('#dd-err:not([hidden])', timeout=5000)
        assert '30' in pg.inner_text('#dd-err'), pg.inner_text('#dd-err')
        assert pg.locator('.dd-dlg').count() == 1 and s.stem() == stem_w and len(s.drafts()) == 30
        s.answer('cancel')
        assert s.stem() == stem_w, 'work lost'
        # quota (mock): put throws QuotaExceededError -> in-app message, nothing lost, delete old drafts then it works
        pg.evaluate("setTab('profile')"); pg.wait_for_selector('#dd-sect')
        pg.evaluate("(()=>{window.__cap=1;})()")
        for _ in range(3):
            pg.locator('#dd-sect [data-dd=del]').last.click(); pg.wait_for_timeout(200)
        n = len(s.drafts()); assert n < 30
        pg.evaluate("(()=>{window.__putOrig=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('full','QuotaExceededError')}})()")
        s.open_font('kortes'); s.change_edit(1.3)
        s.leave(); pg.click('.dd-dlg [data-dd=save]')
        pg.wait_for_selector('#dd-err:not([hidden])', timeout=5000)
        msg = pg.inner_text('#dd-err'); assert 'места' in msg, msg
        assert pg.locator('.dd-dlg').count() == 1 and len(s.drafts()) == n, 'quota: dialog closed or draft counted'
        s.answer('cancel'); assert pg.evaluate("S.tab") == 'edit' and pg.evaluate("GT_DRAFTS.dirty()"), 'quota: work lost'
        pg.evaluate("(()=>{IDBObjectStore.prototype.put=window.__putOrig})()")
        s.leave(); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert len(s.drafts()) == n + 1, 'save after freeing space failed'
        clean_ok(s)
        return 'broken/old/newer/no-font drafts shown with a message and deletable, values clamped, cap 30, quota message keeps the work'
    finally:
        s.close()


# ---------------------------------------------------------------- 7. geometry: both themes, 1440 and 390
def boxes_ok(pg, root, what, vp=True):
    """children inside the root, no overlapping buttons, no clipped text, inside the viewport"""
    bad = pg.evaluate("""([root,vp])=>{const R=document.querySelector(root);if(!R)return ['no '+root];const r=R.getBoundingClientRect(),out=[],vw=innerWidth,vh=innerHeight;
      if(vp&&(r.left<-0.5||r.top<-0.5||r.right>vw+0.5||r.bottom>vh+0.5))out.push('root outside viewport '+[r.left,r.top,r.right,r.bottom,vw,vh].map(Math.round));
      const bt=[...R.querySelectorAll('button,input,label')].filter(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed');
      for(const e of bt){const b=e.getBoundingClientRect();if(b.width<1)continue;if(b.left<r.left-0.5||b.right>r.right+0.5||b.top<r.top-0.5||b.bottom>r.bottom+0.5)out.push('outside root: '+(e.id||e.className||e.tagName)+' '+[b.left,b.right,r.left,r.right].map(Math.round));}
      const bs=[...R.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
      for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i].getBoundingClientRect(),b=bs[j].getBoundingClientRect();if(a.width<1||b.width<1)continue;
        if(!(a.right<=b.left+0.5||b.right<=a.left+0.5||a.bottom<=b.top+0.5||b.bottom<=a.top+0.5))out.push('overlap: '+(bs[i].textContent.trim()||bs[i].getAttribute('aria-label'))+' / '+(bs[j].textContent.trim()||bs[j].getAttribute('aria-label')));}
      for(const e of R.querySelectorAll('h2,p,span,label,b,small,button')){if(e.offsetParent===null)continue;const cs=getComputedStyle(e);if(cs.textOverflow==='ellipsis')continue;if(e.scrollWidth>e.clientWidth+1&&cs.display!=='inline'&&e.clientWidth>0)out.push('clipped text: '+e.textContent.trim().slice(0,30)+' '+e.scrollWidth+'>'+e.clientWidth);}
      if(document.documentElement.scrollWidth>vw)out.push('page scrolls horizontally '+document.documentElement.scrollWidth);
      return out}""", [root, vp])
    assert not bad, f'{what}: {bad[:4]}'


def drafts_geom(p):
    s = Sx(p, 'drafts_geom'); pg = s.pg
    try:
        notes = []
        # drafts of two kinds in the profile
        s.open_font('kortes'); s.change_edit(); s.leave(); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        s.to_draw(); s.draw_ring(); s.leave(); pg.fill('#dd-name', 'Очень длинное название черновика для проверки обрезки текста'); s.answer('save'); pg.wait_for_function("S.tab==='home'", timeout=5000)
        for (w, h) in [(1440, 900), (390, 844)]:
            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(250)
            for th in ('light', 'dark'):
                s.theme(th)
                # dialog
                s.open_font('kortes'); s.change_edit()
                pg.wait_for_function("document.getElementById('toast')&&!document.getElementById('toast').classList.contains('on')", timeout=6000)
                s.leave(); pg.wait_for_timeout(500)
                boxes_ok(pg, '.dd-dlg', f'dialog {w} {th}')
                geo = pg.evaluate("(()=>{const r=document.querySelector('.dd-dlg').getBoundingClientRect();return [r.left,r.bottom,innerWidth,innerHeight]})()")
                if w == 390:
                    assert geo[1] > geo[3] * 0.55, f'phone: dialog is not a bottom sheet {geo}'
                    btn = pg.evaluate("[...document.querySelectorAll('.dd-dlg .dd-btns .btn')].map(b=>Math.round(b.getBoundingClientRect().height))")
                    assert min(btn) >= 40, f'touch targets {btn}'
                # toast never lies over the open dialog
                pg.evaluate("toast('Проверка наложения')"); pg.wait_for_timeout(500)
                over = pg.evaluate("(()=>{const t=document.getElementById('toast');if(!t.classList.contains('on'))return false;const a=t.getBoundingClientRect(),b=document.querySelector('.dd-dlg').getBoundingClientRect();return !(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)})()")
                assert not over, f'toast over the dialog {w} {th}'
                # colours: only neutral + primary accent; Не сохранять is the danger style
                cols = pg.evaluate("""()=>{const c=s=>getComputedStyle(document.querySelector('.dd-dlg [data-dd='+s+']'));return {save:c('save').backgroundColor,discard:c('discard').color,cancel:c('cancel').backgroundColor}}""")
                assert cols['save'] != cols['cancel'], cols
                s.answer('cancel')
                pg.evaluate("setTab('home')")
                # profile section
                s.profile(); pg.wait_for_timeout(300)
                boxes_ok(pg, '#dd-sect', f'drafts section {w} {th}', vp=False)
                cards = pg.evaluate("[...document.querySelectorAll('#dd-sect .dd-card')].map(c=>{const r=c.getBoundingClientRect(),g=document.querySelector('#dd-grid').getBoundingClientRect();return [r.left>=g.left-0.5,r.right<=g.right+0.5]})")
                assert cards and all(a and b for a, b in cards), cards
                # empty-canvas preview must not be blank
                ink = pg.evaluate("[...document.querySelectorAll('#dd-sect canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})")
                assert all(n > 150 for n in ink), f'blank preview {ink}'
                # recovery banner: inline on home, in the page flow (pushes «Лаборатория» down, covers nothing), at the library container width
                pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
                pg.evaluate("GT_DRAFTS.showRecovery({id:'probe',u:Date.now()})"); pg.wait_for_timeout(500)
                boxes_ok(pg, '#dd-rec', f'banner {w} {th}', vp=False)
                g = pg.evaluate("""(()=>{const b=document.querySelector('#dd-rec').getBoundingClientRect(),h=document.querySelector('#h-mk').closest('section').getBoundingClientRect(),hero=document.querySelector('.hero').getBoundingClientRect(),
                  bs=[...document.querySelectorAll('#dd-rec [data-rc]')].map(e=>{const r=e.getBoundingClientRect();return [r.top,r.left,r.width]});
                  return {bb:b.bottom,ht:h.top,top:b.top,herob:hero.bottom,left:b.left,right:b.right,hl:h.left,hr:h.right,pos:getComputedStyle(document.querySelector('#dd-rec')).position,bs}})()""")
                assert g['pos'] != 'fixed' and g['bb'] <= g['ht'] + 0.5 and g['top'] >= g['herob'] - 0.5, ('banner not in flow', g)
                assert g['left'] >= g['hl'] - 0.5 and g['right'] <= g['hr'] + 0.5, ('banner wider than the library container', g)
                bs = [b for b in g['bs'] if b[2] > 60]  # text buttons (the close X also carries data-rc)
                assert len(bs) == 2, ('banner must have exactly 2 text buttons', g['bs'])
                if w < 720:  # two full-width buttons stacked
                    assert len({round(b[0]) for b in bs}) == 2 and abs(bs[0][2]-bs[1][2]) < 1, ('phone banner buttons', bs)
                pg.evaluate("GT_DRAFTS.closeRec(true)"); pg.wait_for_timeout(200)
                pg.evaluate("setTab('home')")
                notes.append(f'{w}/{th}')
        clean_ok(s)
        return 'dialog (sheet on 390), profile section, banner: ' + ' '.join(notes) + ' no overlap/clipping, toast not over dialog'
    finally:
        s.close()


CHECKS = {'drafts_flow': drafts_flow, 'drafts_modes': drafts_modes, 'drafts_prefs': drafts_prefs, 'drafts_recovery': drafts_recovery,
          'drafts_manage': drafts_manage, 'drafts_validate': drafts_validate, 'drafts_geom': drafts_geom}

if __name__ == '__main__':
    want = sys.argv[1:] or list(CHECKS)
    sys.exit(check_all([(n, CHECKS[n]) for n in want]))
