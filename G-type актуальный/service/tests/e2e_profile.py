"""Profile section: rail avatar entry, profile view (owner / guest / empty), edit drawer (cover, avatar crop, links, signature), pins (≤4, old showcase migrates),
folder «Созданные шрифты» (filters, grid/list, rename, ready, hide, delete with inline confirm, «Продолжить»), home without «Продолжить работу»,
визитка PNG, backup export/import, author signature in the exported TTF (fontTools), accent buttons, notch geometry, both themes, phone 390, no console errors,
no horizontal overflow, no alert/confirm/prompt. One PASS/FAIL line per check (tests/common.py)."""
import io, os, sys, json, glob, subprocess, shutil
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, WK, LOGS
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont

FX = os.path.join(LOGS, 'fx_profile')
os.makedirs(FX, exist_ok=True)
SEED = """(async()=>{
 for (const [id,d] of [['renessa',-6],['stroka',10],['modul',8],['kaplya',12],['ustav',6]]) { libOpen(id); S.styles.regular.p.stem=(S.styles.regular.p.stem||100)+d; bump(); }
 setTab('home'); await new Promise(r=>setTimeout(r,300)); return PROF.projects().map(f=>f.key);})()"""
NAME = {'lib:renessa': 'Ренесса', 'lib:stroka': 'Строка', 'lib:modul': 'Модуль', 'lib:kaplya': 'Капля', 'lib:ustav': 'Устав'}
META = """PROF.setMeta(Object.assign(PROF.meta(),{first:'Анна',last:'Морозова',bio:'Шрифтовой дизайнер. Рисую кириллические гротески и антиквы.',
 links:[{net:'Telegram',url:'https://t.me/morozova'},{net:'Сайт',url:'https://morozova.ru'}]}))"""
READY = """(()=>{for(const k of ['lib:renessa','lib:stroka','lib:modul','lib:kaplya']){PROF.setReady(k,true);PROF.setVis(k,'pub');}
 PROF.togglePin('lib:renessa');PROF.togglePin('lib:stroka');PROF.togglePin('lib:modul');PROF.render&&PROF.render(true);})()"""


def mkimg(name, w, h, k=0):
    path = os.path.join(FX, name)
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=((40 + y * 180 // h + k * 30) % 256, (90 + k * 50) % 256, (200 - y * 120 // h) % 256))
    for i in range(0, w + h, 90):
        d.line([(i, 0), (i - h, h)], fill=(255, 255, 255), width=14)
    d.ellipse([w // 3, h // 4, w // 3 + h // 2, h // 4 + h // 2], fill=(250, 220, 40))
    im.save(path)
    return path


def boot(p, name):
    s = Session(p, name)
    s.dialogs = []
    s.pg.on('dialog', lambda d: (s.dialogs.append(d.message), d.dismiss()))
    return s


def reload(pg):
    pg.reload()
    pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]') && typeof PROF!=='undefined'", timeout=30000)


def go(pg, tab):
    pg.evaluate(f"setTab('{tab}')")
    pg.wait_for_function(f"S.tab==='{tab}'", timeout=5000)
    pg.wait_for_selector('#view-' + ('profile' if tab == 'profile' else 'pfolder') + ' .pf-wrap', timeout=5000)
    pg.wait_for_timeout(120)


def vis(pg, sel):
    return pg.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return r.width>0&&r.height>0&&c.visibility!=='hidden'&&c.display!=='none'}", sel)


def img_size(pg, expr):
    return pg.evaluate("e=>new Promise(r=>{const i=new Image();i.onload=()=>r([i.naturalWidth,i.naturalHeight,e.slice(5,15)]);i.onerror=()=>r(null);i.src=e;})".replace('e=>', 'async()=>{const e=' + expr + ';return await (').replace('})', '})') + ')') if False else pg.evaluate("async()=>{const e=" + expr + ";return await new Promise(r=>{const i=new Image();i.onload=()=>r([i.naturalWidth,i.naturalHeight,e.slice(5,15)]);i.onerror=()=>r(null);i.src=e;});}")


# ---------------------------------------------------------------------------------------------------------------------------------------------
def edit_flow(p):
    s = boot(p, 'prof_edit')
    try:
        pg = s.pg
        cover_big = mkimg('cover_big.png', 2600, 1300, 1)
        ava = mkimg('ava.png', 900, 700, 2)
        # --- empty profile: empty state, checklist, red dot, neutral avatar ---
        go(pg, 'profile')
        assert pg.locator('.pf-emp').count() == 1 and pg.locator('.pf-chk').count() == 1, 'empty state / checklist missing'
        assert pg.evaluate("document.querySelector('#rail-profile').dataset.inc") == '1' and pg.locator('#rail-profile .dot').count() == 1, 'rail dot'
        assert pg.locator('#rail-profile .avt.neutral').count() == 1, 'neutral rail avatar'
        assert pg.locator('.pf-name.ph').count() == 1
        # --- drawer: Save is disabled until a change; cancel with unsaved changes asks inline ---
        pg.click('.pf-act [data-pf=edit]')
        pg.wait_for_selector('.pf-drawer')
        assert pg.is_disabled('[data-save]'), 'Save must start disabled'
        pg.fill('#pf-f', 'Анна')
        assert not pg.is_disabled('[data-save]') and pg.is_visible('.pf-drawer .note')
        pg.keyboard.press('Escape')
        pg.wait_for_selector('.pf-uc')
        pg.click('[data-uc=stay]')
        assert pg.locator('.pf-uc').count() == 0 and pg.locator('.pf-drawer').count() == 1
        pg.click('.pf-dh [data-x]')
        pg.wait_for_selector('.pf-uc')
        pg.click('[data-uc=drop]')
        pg.wait_for_selector('.pf-drawer', state='detached')
        assert pg.evaluate("PROF.meta().first") == '', 'discarded draft was saved'
        # --- name is required; bio limit; links validation and the maximum of 4 ---
        pg.click('.pf-act [data-pf=edit]')
        pg.wait_for_selector('.pf-drawer')
        pg.fill('#pf-b', 'x' * 170)
        assert pg.evaluate("document.querySelector('#pf-b').value.length") == 160
        assert pg.inner_text('.pf-cnt').strip() == '160/160' and pg.evaluate("document.querySelector('.pf-cnt').classList.contains('max')")
        pg.fill('#pf-b', 'Шрифтовой дизайнер. Рисую гротески.')
        pg.click('[data-save]')
        assert pg.locator('.pf-drawer').count() == 1, 'saved without a name'
        pg.fill('#pf-f', 'Анна'); pg.fill('#pf-l', 'Морозова')
        pg.click('[data-add]')
        pg.fill('.pf-lrow[data-i="0"] input', 'abcdef')
        t = pg.inner_text('.pf-err[data-e="0"]')
        assert 'https://' in t, t
        pg.fill('.pf-lrow[data-i="0"] input', 'https://x')
        assert 'Проверьте адрес' in pg.inner_text('.pf-err[data-e="0"]')
        pg.fill('.pf-lrow[data-i="0"] input', 'https://t.me/morozova')
        assert not pg.evaluate("document.querySelector('.pf-err[data-e=\"0\"]').classList.contains('show')")
        for i in range(1, 4):
            pg.click('[data-add]:not([disabled])')
            pg.wait_for_function(f"document.querySelectorAll('.pf-lrow').length=={i + 1}")
        assert pg.locator('.pf-lrow').count() == 4, pg.locator('.pf-lrow').count()
        assert pg.is_disabled('[data-add]'), 'add must be disabled at 4'
        assert 'Максимум 4' in pg.inner_text('.pf-addl .hint')
        pg.click('[data-save]')  # three empty links: blocked with inline errors
        assert pg.locator('.pf-drawer').count() == 1 and 'Вставьте ссылку' in pg.inner_text('.pf-err[data-e="1"]')
        pg.fill('.pf-lrow[data-i="1"] input', 'https://behance.net/morozova')
        pg.select_option('.pf-lrow[data-i="1"] select', 'Behance')
        pg.fill('.pf-lrow[data-i="2"] input', 'https://dribbble.com/morozova')
        pg.select_option('.pf-lrow[data-i="2"] select', 'Dribbble')
        pg.fill('.pf-lrow[data-i="3"] input', 'https://morozova.ru')
        pg.select_option('.pf-lrow[data-i="3"] select', 'Сайт')
        # --- avatar: upload -> crop (drag + zoom) -> 400px JPEG ---
        with pg.expect_file_chooser() as fc:
            pg.click('[data-up=avatar]')
        fc.value.set_files(ava)
        pg.wait_for_selector('.pf-crop canvas')
        box = pg.locator('.pf-crop canvas').bounding_box()
        pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        pg.mouse.down(); pg.mouse.move(box['x'] + box['width'] / 2 - 40, box['y'] + box['height'] / 2 - 15, steps=4); pg.mouse.up()
        pg.evaluate("(()=>{const z=document.querySelector('.pf-zoom input');z.value=220;z.dispatchEvent(new Event('input',{bubbles:true}));})()")
        assert pg.inner_text('.pf-zoom output').strip() == '220%'
        pg.click('[data-crop-ok]')
        pg.wait_for_selector('.pf-crop', state='detached')
        pg.wait_for_selector('.pf-avr .avt.img')
        # --- cover: upload a 2600px picture, preview, then save everything ---
        with pg.expect_file_chooser() as fc:
            pg.click('[data-up=cover]')
        fc.value.set_files(cover_big)
        pg.wait_for_selector('.pf-cvp .cv.img')
        pg.click('[data-save]')
        pg.wait_for_selector('.pf-drawer', state='detached')
        pg.evaluate("PROF.idle()")
        m = pg.evaluate("PROF.meta()")
        assert m['first'] == 'Анна' and len(m['links']) == 4 and m['links'][1]['net'] == 'Behance'
        a = img_size(pg, "PROF.img.avatar")
        assert a and a[0] == 400 and a[1] == 400 and a[2].startswith('image/jpeg'), a
        c = img_size(pg, "PROF.img.cover")
        assert c and max(c[0], c[1]) <= 1600 and c[2].startswith('image/jpeg'), c
        assert pg.locator('.pf-cover.img img').count() == 1 and pg.locator('.pf-head .avt.img').count() == 1
        assert pg.locator('#rail-profile .avt.img').count() == 1, 'rail avatar image'
        assert pg.inner_text('.pf-name').strip() == 'Анна Морозова' and pg.locator('.pf-soc[data-i]').count() == 4
        # --- the crop output depends on the gestures: re-crop with another zoom gives another picture ---
        a1 = pg.evaluate("PROF.img.avatar")
        pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer')
        pg.click('[data-recrop]'); pg.wait_for_selector('.pf-crop canvas')
        pg.evaluate("(()=>{const z=document.querySelector('.pf-zoom input');z.value=100;z.dispatchEvent(new Event('input',{bubbles:true}));})()")
        pg.click('[data-crop-ok]'); pg.wait_for_selector('.pf-crop', state='detached')
        pg.click('[data-save]'); pg.wait_for_selector('.pf-drawer', state='detached'); pg.evaluate("PROF.idle()")
        a2 = pg.evaluate("PROF.img.avatar")
        assert a1 != a2 and img_size(pg, "PROF.img.avatar")[:2] == [400, 400], 'crop did not change the result'
        # --- persistence across reload (localStorage meta + IndexedDB images) ---
        pg.wait_for_timeout(300)
        reload(pg)
        pg.wait_for_function("PROF.img.avatar.length>0 && PROF.img.cover.length>0", timeout=10000)
        go(pg, 'profile')
        assert pg.inner_text('.pf-name').strip() == 'Анна Морозова' and pg.locator('.pf-cover.img img').count() == 1
        assert pg.locator('#rail-profile .avt.img').count() == 1
        # --- remove the cover and the photo ---
        pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer')
        pg.click('[data-rmcv]'); pg.click('[data-rmav]')
        assert pg.is_disabled('[data-rmcv]') and pg.is_disabled('[data-rmav]')
        pg.click('[data-save]'); pg.wait_for_selector('.pf-drawer', state='detached'); pg.evaluate("PROF.idle()")
        assert pg.locator('.pf-cover.img').count() == 0 and pg.locator('.pf-ghost').count() == 1, 'default cover must come back'
        assert pg.evaluate("PROF.img.cover==='' && PROF.img.avatar===''") and pg.locator('#rail-profile .avt:not(.img)').count() == 1
        assert not s.dialogs, f'system dialogs used: {s.dialogs}'
        assert not s.errs, s.errs[:3]
        return 'empty state+dot, cancel/confirm, name required, bio 160, link errors, max 4, avatar crop 400 jpeg, cover<=1600, reload persists, remove'
    finally:
        s.close()


def guest_flow(p):
    s = boot(p, 'prof_guest')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        go(pg, 'profile')
        assert pg.locator('.pf-own').count() >= 6, 'owner elements expected in owner mode'
        txt = pg.inner_text('#view-profile')
        pg.click('[data-pf=guest]')
        pg.wait_for_selector('.pf-gpill')
        assert 'Вы смотрите как гость' in pg.inner_text('.pf-gpill') and 'Вернуться' in pg.inner_text('.pf-gpill')
        own = pg.evaluate("document.querySelectorAll('#view-profile .pf-own,#view-profile .pf-tools,#view-profile .pf-chk,#view-profile .pf-add,#view-profile [data-pf=edit],#view-profile [data-pf=edit-links],#view-profile [data-pf=vit-edit],#view-profile [data-pf=smp-edit],#view-profile [data-pf=guest],#view-profile [data-pf=card],#view-profile [data-pf=backup],#view-profile .pf-slot,#view-profile .pen').length")
        assert own == 0, f'{own} owner-only elements in the guest DOM'
        t = pg.inner_text('#view-profile')
        for bad in ('Редактировать профиль', 'Инструменты автора', 'Черновик', 'Устав', 'Резервная копия', 'Визитка автора', 'Добавить ссылку', 'Изменить витрину'):
            assert bad not in t, f'«{bad}» leaked into the guest view'
        assert 'Поделиться' in t and pg.locator('.sk-pins .sk-card').count() == 3
        assert '4 шрифта' in pg.inner_text('.pfc .fm'), pg.inner_text('.pfc .fm')
        # guest folder: only finished fonts in the profile, no owner controls
        pg.click('.pfc')
        pg.wait_for_function("S.tab==='folder'")
        pg.wait_for_selector('#pf-flist .pf-fc')
        assert pg.locator('.pf-gpill').count() == 1
        assert pg.locator('#pf-flist .pf-fc').count() == 4
        assert pg.evaluate("document.querySelectorAll('#view-pfolder .pf-own,#view-pfolder .badge,#view-pfolder [data-pf=cont],#view-pfolder [data-pf=more],#view-pfolder .seg.sm,#view-pfolder [data-pf=filter]').length") == 0
        ft = pg.inner_text('#pf-flist')
        assert 'Устав' not in ft and 'Ренесса' in ft and 'Открыть' in ft
        # visibility toggles propagate: hide Ренесса as the owner -> gone from guest folder and showcase
        pg.click('.pf-gpill [data-pf=unguest]')
        pg.wait_for_selector('.pf-gpill', state='detached')
        assert pg.locator('#pf-flist .pf-fc').count() == 5 and pg.locator('[data-pf=filter]').count() == 3
        pg.click('.pf-fc[data-card="lib:renessa"] [data-pf=vis][data-v=hid]')
        pg.wait_for_function("document.querySelector('.pf-fc[data-card=\"lib:renessa\"] [data-v=hid]').classList.contains('on')")
        go(pg, 'profile')
        assert pg.locator('.sk-pins .sk-card').count() == 2, 'hiding must unpin'
        pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill')
        assert pg.locator('.sk-pins .sk-card').count() == 2 and 'Ренесса' not in pg.inner_text('#view-profile .sk-host') and '3 шрифта' in pg.inner_text('.pfc .fm')
        # 'Открыть' leaves guest mode and opens the editor with that font
        pg.click('.pfc'); pg.wait_for_selector('#pf-flist .pf-fc')
        pg.click('.pf-fc[data-card="lib:stroka"] [data-pf=open-font]')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='stroka'", timeout=10000)
        assert pg.locator('.pf-gpill').count() == 0 and not pg.evaluate("PROF.guest")
        assert vis(pg, '#rail-profile'), 'D5: the profile button is on the rail in work modes too'
        # guest pill: Esc and the button both return
        go(pg, 'profile'); pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill')
        pg.keyboard.press('Escape'); pg.wait_for_selector('.pf-gpill', state='detached')
        assert pg.locator('.pf-own').count() > 0
        # leaving the profile ends guest mode
        pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill')
        pg.evaluate("setTab('home')"); pg.wait_for_selector('.pf-gpill', state='detached')
        go(pg, 'profile'); assert pg.locator('.pf-own').count() > 0 and not pg.evaluate("PROF.guest")
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'guest DOM has no owner elements; drafts/hidden never shown; toggles propagate; Открыть/Esc/leave end guest mode'
    finally:
        s.close()


def pins_flow(p):
    s = boot(p, 'prof_pins')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        pg.evaluate("(()=>{PROF.setReady('lib:ustav',true);PROF.setVis('lib:ustav','pub');})()")
        go(pg, 'profile')
        assert pg.locator('.sk-pins .sk-card').count() == 3 and pg.locator('.sk-pins .sk-slot').count() == 1
        # canvas samples use the real font: non-empty and different per font
        sig = pg.evaluate("""[...document.querySelectorAll('.sk-pins .sk-card canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,h=0;for(let i=3;i<d.length;i+=4)if(d[i]>0){n++;h=(h*31+i)%1000003}return [n,h]})""")
        assert all(a[0] > 500 for a in sig) and len({tuple(a) for a in sig}) == 3, sig
        # limit is four: pin the 4th from the folder menu, the 5th is disabled (hint), unpinning frees a slot
        go(pg, 'folder')
        pg.click('.pf-fc[data-card="lib:kaplya"] [data-pf=more]')
        pg.wait_for_selector('.menu.pop:not([hidden])')
        assert 'Закрепить в профиле' in pg.inner_text('.menu.pop [data-pf=m-pin]')
        pg.click('.menu.pop [data-pf=m-pin]')
        pg.wait_for_function("PROF.pinCount()===4")
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pin = pg.locator('.menu.pop [data-pf=m-pin]')
        assert pin.is_disabled() and 'места заняты' in pin.inner_text(), pin.inner_text()
        pg.keyboard.press('Escape')
        pg.wait_for_selector('.menu.pop', state='detached')
        pg.click('.pf-fc[data-card="lib:modul"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        assert 'Открепить' in pg.inner_text('.menu.pop [data-pf=m-pin]')
        pg.click('.menu.pop [data-pf=m-pin]')
        pg.wait_for_function("PROF.pinCount()===3")
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        assert not pg.locator('.menu.pop [data-pf=m-pin]').is_disabled()
        pg.click('.menu.pop [data-pf=m-pin]')
        pg.wait_for_function("PROF.pinCount()===4")
        # profile: pin buttons on the works, no per-font sample editor any more, no counters
        go(pg, 'profile')
        assert pg.locator('.sk-pins .sk-card').count() == 4 and pg.locator('[data-pf=vit-edit],[data-pf=smp-edit],.pf-vcard,.pf-slot').count() == 0
        pg.click('.sk-pins .sk-card >> nth=0 >> [data-sk=pin]'); pg.wait_for_function("PROF.pinCount()===3")
        assert pg.locator('.pinn,.sk-card .badge').count() == 0 and 'из 4' not in pg.inner_text('#view-profile')
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'pins <=4 (menu + profile buttons), limit hint, real-font canvases differ, no number badges / counters'
    finally:
        s.close()


def folder_flow(p):
    s = boot(p, 'prof_folder')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        go(pg, 'folder')
        assert pg.inner_text('#view-pfolder h1').strip() == 'Созданные шрифты'
        assert pg.evaluate("document.querySelector('#rail-back').getBoundingClientRect().width")>0
        chips = pg.evaluate("[...document.querySelectorAll('.pf-filters .chip')].map(c=>c.textContent.replace(/\\s+/g,' ').trim())")
        assert chips == ['Все 5', 'Черновики 1', 'Готовые 4'], chips
        # the view toggle sits on the filter row, right of the chips
        r = pg.evaluate("(()=>{const f=document.querySelector('.pf-filters').getBoundingClientRect(),sg=document.querySelector('.pf-filters .seg').getBoundingClientRect(),c=document.querySelector('.pf-filters .chip:last-of-type').getBoundingClientRect();return [sg.left>c.right,Math.abs(sg.right-f.right)<=1,Math.abs((sg.top+sg.bottom)/2-(c.top+c.bottom)/2)<=2]})()")
        assert all(r), r
        # filters
        pg.click('[data-pf=filter][data-f=draft]'); pg.wait_for_function("document.querySelectorAll('#pf-flist .pf-fc').length===1")
        assert 'Устав' in pg.inner_text('#pf-flist')
        pg.click('[data-pf=filter][data-f=ready]'); pg.wait_for_function("document.querySelectorAll('#pf-flist .pf-fc').length===4")
        pg.click('[data-pf=filter][data-f=all]'); pg.wait_for_function("document.querySelectorAll('#pf-flist .pf-fc').length===5")
        # grid / list: list rows, persists across reload
        pg.click('[data-pf=view][data-m=list]'); pg.wait_for_selector('#pf-flist.pf-rows .pf-frow')
        assert pg.locator('#pf-flist .pf-frow').count() == 5
        pg.click('[data-pf=view][data-m=grid]'); pg.wait_for_selector('#pf-flist.pf-fgrid')
        pg.click('[data-pf=view][data-m=list]'); pg.wait_for_timeout(100)
        reload(pg); go(pg, 'folder')
        assert pg.locator('#pf-flist.pf-rows .pf-frow').count() == 5, 'list view must persist'
        pg.click('[data-pf=view][data-m=grid]')
        # draft: «Продолжить» opens the editor with that font; the avatar is gone from the rail there
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=cont]')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='ustav'", timeout=10000)
        assert vis(pg, '#rail-profile') and not vis(pg, '#rail-back')   # D5: profile stays on the rail in work modes
        go(pg, 'folder'); assert vis(pg, '#rail-profile')
        # status: draft -> ready (menu) makes it publishable; ready -> draft hides and unpins
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        assert pg.locator('.menu.pop [data-pf=m-hide]').is_disabled() and pg.locator('.menu.pop [data-pf=m-pin]').is_disabled()
        pg.click('.menu.pop [data-pf=m-ready]')
        pg.wait_for_function("PROF.byKey('lib:ustav').st==='ready'")
        assert not pg.locator('.pf-fc[data-card="lib:ustav"] [data-pf=vis][data-v=pub]').is_disabled()
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=vis][data-v=pub]')
        pg.wait_for_function("PROF.byKey('lib:ustav').vis==='pub'")
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-ready]')
        pg.wait_for_function("PROF.byKey('lib:ustav').st==='draft' && PROF.byKey('lib:ustav').vis==='hid'")
        # rename: menu -> inline input -> Enter; Esc cancels; the editor family follows
        pg.click('.pf-fc[data-card="lib:kaplya"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-rename]')
        pg.wait_for_selector('.pf-rn')
        pg.keyboard.press('Escape'); pg.wait_for_selector('.pf-rn', state='detached')
        assert 'Капля' in pg.inner_text('.pf-fc[data-card="lib:kaplya"]')
        pg.click('.pf-fc[data-card="lib:kaplya"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-rename]'); pg.wait_for_selector('.pf-rn')
        pg.fill('.pf-rn', 'Капля Нова'); pg.keyboard.press('Enter')
        pg.wait_for_selector('.pf-rn', state='detached')
        assert 'Капля Нова' in pg.inner_text('.pf-fc[data-card="lib:kaplya"]') and pg.evaluate("S.lib.kaplya.family") == 'Капля Нова'
        # delete with inline confirmation: cancel keeps, confirm resets library font (never removes the built-in font)
        pg.click('.pf-fc[data-card="lib:modul"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-del]')
        pg.wait_for_selector('.pf-fc.confirm [role=alertdialog]')
        assert 'Модуль' in pg.inner_text('.pf-fc.confirm') and 'останется в библиотеке' in pg.inner_text('.pf-fc.confirm')
        pg.click('[data-pf=del-no]'); pg.wait_for_selector('.pf-fc.confirm', state='detached')
        assert pg.locator('.pf-fc[data-card="lib:modul"]').count() == 1
        pg.click('.pf-fc[data-card="lib:modul"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-del]'); pg.wait_for_selector('.pf-fc.confirm')
        pg.click('[data-pf=del-ok]')
        pg.wait_for_function("document.querySelectorAll('#pf-flist .pf-fc').length===4", timeout=5000)
        assert pg.evaluate("!!FONTS.modul && !PROF.test.isCustom('modul')"), 'built-in font must stay, edits reset'
        assert pg.evaluate("document.querySelector('.pf-filters .chip').textContent.replace(/\\s+/g,' ').trim()") == 'Все 4'
        # a drawn draft (module storage) is listed, continues in «Отрисовать», and deletes cleanly
        pg.evaluate("""(()=>{const sq=[{x:0,y:0,a:null,b:null},{x:300,y:0,a:null,b:null},{x:300,y:600,a:null,b:null},{x:0,y:600,a:null,b:null}];
          localStorage.setItem('gtype-draw-n7',JSON.stringify({v:1,name:'Мой рисунок',set:'cyr',ch:'А',grid:'mod',built:0,g:{'А':{i:[],s:1,c:impPackC([{hole:false,nodes:sq}]),w:0,sp:0,an:0}}}));PROF.render(true);})()""")
        pg.wait_for_selector('.pf-fc[data-card="draw"]')
        assert 'Мой рисунок' in pg.inner_text('.pf-fc[data-card="draw"]') and 'Черновик' in pg.inner_text('.pf-fc[data-card="draw"]')
        ink = pg.evaluate("(()=>{const c=document.querySelector('.pf-fc[data-card=\"draw\"] canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})()")
        assert ink > 200, 'drawn glyph preview is empty'
        pg.click('.pf-fc[data-card="draw"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-del]'); pg.wait_for_selector('.pf-fc.confirm')
        pg.click('[data-pf=del-ok]'); pg.wait_for_selector('.pf-fc[data-card="draw"]', state='detached')
        assert pg.evaluate("localStorage.getItem('gtype-draw-n7')===null || PROF.test.drawInfo()===null || PROF.test.drawInfo().n===0")
        pg.evaluate("""localStorage.setItem('gtype-draw-n7',JSON.stringify({v:1,name:'Ещё',set:'cyr',ch:'А',grid:'mod',built:0,g:{'Б':{i:[],s:1,c:impPackC([{hole:false,nodes:[{x:0,y:0,a:null,b:null},{x:300,y:0,a:null,b:null},{x:300,y:600,a:null,b:null}]}]),w:0,sp:0,an:0}}}));PROF.render(true);""")
        pg.wait_for_selector('.pf-fc[data-card="draw"]')
        pg.click('.pf-fc[data-card="draw"] [data-pf=cont]')
        pg.wait_for_function("S.tab==='draw'", timeout=10000)
        assert vis(pg, '#rail-profile')   # D5
        pg.evaluate("localStorage.removeItem('gtype-draw-n7')")
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'filters+counts, grid/list persists, Продолжить (editor + draw), ready/hide/pin rules, rename (+family), delete confirm (lib keeps font, draw draft), no dialogs'
    finally:
        s.close()


def imp_flow(p):
    out = os.path.join(FX, 'svg')
    shutil.rmtree(out, ignore_errors=True)
    subprocess.run(['node', os.path.join(WK, 'fixtures.js'), out, 'kvadra', 'abs', 'HOnoxeaspl'], cwd=WK, check=True, stdout=subprocess.DEVNULL)
    fs = sorted(glob.glob(os.path.join(out, '*.svg')))
    s = boot(p, 'prof_imp')
    try:
        pg = s.pg
        pg.click('#imp-card'); pg.wait_for_selector('#imp-files', state='attached')
        pg.set_input_files('#imp-files', fs)
        pg.wait_for_function("Object.keys(IMP.glyphs).length>=10 && !IU.pending.length", timeout=60000)
        pg.click('#imp-build'); pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)
        go(pg, 'folder')
        assert pg.locator('.pf-fc[data-card="imp"]').count() == 1 and 'Черновик' in pg.inner_text('.pf-fc[data-card="imp"]')
        assert pg.evaluate("document.querySelector('.pf-fc[data-card=\"imp\"] canvas').getContext('2d').getImageData(0,0,50,50).data.length")>0
        # exporting the file marks the font ready
        pg.click('.pf-fc[data-card="imp"] [data-pf=cont]'); pg.wait_for_function("S.tab==='edit'&&S.fontId==='imp'")
        s.download('ttf')
        pg.wait_for_function("PROF.byKey('imp')&&PROF.byKey('imp').st==='ready'", timeout=10000)
        go(pg, 'folder')
        assert 'Готов' in pg.inner_text('.pf-fc[data-card="imp"]')
        pg.click('.pf-fc[data-card="imp"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        pg.click('.menu.pop [data-pf=m-del]'); pg.wait_for_selector('.pf-fc.confirm')
        assert 'все его знаки' in pg.inner_text('.pf-fc.confirm')
        pg.click('[data-pf=del-ok]'); pg.wait_for_selector('.pf-fc[data-card="imp"]', state='detached')
        assert pg.evaluate("!FONTS.imp && Object.keys(IMP.glyphs).length===0 && !S.lib.imp"), 'own font must be removed'
        assert pg.evaluate("S.fontId!=='imp' && !!FONTS[S.fontId]")
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'assembled font listed as draft, export marks ready, delete removes glyphs/font safely'
    finally:
        s.close()


def home_flow(p):
    s = boot(p, 'prof_home')
    try:
        pg = s.pg
        pg.evaluate(SEED)
        pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
        body = pg.inner_text('#view-lib')
        assert 'Продолжить работу' not in body and 'Продолжить работу' not in pg.inner_text('body')
        assert pg.evaluate("!document.querySelector('#recent,#sec-recent,#h-rec,.mwrap')"), 'old «Продолжить работу» nodes still in the DOM'
        # opening fonts no longer builds that section
        pg.evaluate("libOpen('kvadra')"); pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
        assert 'Продолжить работу' not in pg.inner_text('body') and pg.locator('#home-more .minis').count() <= 1
        # profile page: no cover button, no camera badge, no ring, no number badges
        go(pg, 'profile')
        t = pg.inner_text('#view-profile')
        assert 'обложк' not in t.lower() and pg.locator('.cbtn,.cam,.pinn,[data-act=cover],[data-act=avatar-pick]').count() == 0
        ring = pg.evaluate("(()=>{const o=[];for(const s of ['#view-profile .pf-head .avt','#rail-profile','#rail-profile .avt']){const e=document.querySelector(s),c=getComputedStyle(e);o.push([s,c.boxShadow,c.outlineStyle,c.borderTopWidth,/rgba\\(0, 0, 0, 0\\)/.test(c.outlineColor)?'0px':c.outlineWidth])}return o})()")
        for sel, sh, ol, bw, ow in ring:
            assert sh == 'none' and (ol == 'none' or ow == '0px') and bw == '0px', f'ring around {sel}: {sh} {ol} {bw}'
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'home has no «Продолжить работу»; profile has no cover button / camera badge / avatar ring / number badges'
    finally:
        s.close()


def card_flow(p):
    s = boot(p, 'prof_card')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        ava = mkimg('ava2.png', 800, 800, 3)
        pg.evaluate("setTab('profile')")
        pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer')
        with pg.expect_file_chooser() as fc:
            pg.click('[data-up=avatar]')
        fc.value.set_files(ava); pg.wait_for_selector('.pf-crop canvas'); pg.click('[data-crop-ok]'); pg.wait_for_selector('.pf-crop', state='detached')
        pg.click('[data-save]'); pg.wait_for_selector('.pf-drawer', state='detached')
        go(pg, 'profile')
        res = []
        for th in ('light', 'dark'):
            pg.evaluate(f"themeSet('{th}')")
            pg.click('[data-pf=card]'); pg.wait_for_selector('.pf-cardprev canvas[data-ready="1"]', timeout=15000)
            pg.click(f'[data-th={th}]'); pg.wait_for_selector('.pf-cardprev canvas[data-ready="1"]', timeout=15000)
            info = pg.evaluate("""(()=>{const c=document.querySelector('.pf-cardprev canvas'),x=c.getContext('2d');
              const px=(a,b)=>Array.from(x.getImageData(a,b,1,1).data);
              return {w:c.width,h:c.height,bg:px(30,1330),av:px(196,340),chipArea:px(120,1230),cards:[px(150,900),px(500,900),px(850,900)]}})()""")
            assert info['w'] == 1080 and info['h'] == 1350, info
            assert info['bg'][:3] != info['av'][:3], 'avatar region equals the background: not painted'
            pg.screenshot(path=os.path.join(LOGS, f'card_{th}.png'), clip=pg.locator('.pf-cardprev canvas').bounding_box()) if os.environ.get('GT_SHOTS') else None
            with pg.expect_download(timeout=30000) as d:
                pg.click('[data-dl]')
            path = os.path.join(LOGS, f'vizitka_{th}.png')
            d.value.save_as(path)
            assert d.value.suggested_filename == 'gtype-vizitka-anna-morozova.png', d.value.suggested_filename
            im = Image.open(path)
            assert im.size == (1080, 1350) and im.format == 'PNG', (im.size, im.format)
            colors = len(set(im.convert('RGB').resize((108, 135)).getdata()))
            assert colors > 400, f'визитка looks empty ({colors} colours)'
            res.append((th, colors))
            pg.click('.pf-dlg [data-x] >> nth=-1'); pg.wait_for_selector('.pf-dlg', state='detached')
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'визитка 1080x1350 PNG renders (cover fade, avatar, 3 real-font samples, link) and downloads in both themes: ' + str(res)
    finally:
        s.close()


def backup_flow(p):
    s = boot(p, 'prof_backup')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        ava = mkimg('ava3.png', 700, 700, 4)
        go(pg, 'profile')
        pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer')
        with pg.expect_file_chooser() as fc:
            pg.click('[data-up=avatar]')
        fc.value.set_files(ava); pg.wait_for_selector('.pf-crop canvas'); pg.click('[data-crop-ok]'); pg.wait_for_selector('.pf-crop', state='detached')
        pg.click('[data-save]'); pg.wait_for_selector('.pf-drawer', state='detached'); pg.evaluate("PROF.idle()")
        stem0 = pg.evaluate("S.lib.renessa.styles.regular.p.stem")
        before = pg.evaluate("PROF.projects().map(f=>[f.key,f.st,f.vis,f.pin].join('|')).sort()")
        pg.click('[data-pf=backup]'); pg.wait_for_selector('.pf-dlg')
        with pg.expect_download(timeout=20000) as d:
            pg.click('[data-dl]')
        bpath = os.path.join(LOGS, 'backup_profile.json'); d.value.save_as(bpath)
        assert d.value.suggested_filename == 'gtype-backup-anna-morozova.json', d.value.suggested_filename
        b = json.load(open(bpath, encoding='utf-8'))
        assert b['app'] == 'g-type' and b['kind'] == 'profile-backup' and b['version'] == 1 and b['profile']['first'] == 'Анна'
        assert set(b['fonts']) == {'lib:renessa', 'lib:stroka', 'lib:modul', 'lib:kaplya', 'lib:ustav'} and b['images']['avatar'].startswith('data:image/jpeg')
        pg.click('.pf-dlg [data-x] >> nth=-1'); pg.wait_for_selector('.pf-dlg', state='detached')
        # damage the state, then restore: invalid files first
        pg.evaluate("PROF.removeProject('lib:renessa');PROF.setMeta(Object.assign(PROF.meta(),{first:'Другой',proj:{}}));PROF.render(true)")
        assert pg.evaluate("!PROF.test.isCustom('renessa')")
        pg.click('[data-pf=backup]'); pg.wait_for_selector('.pf-dlg')
        junk = os.path.join(FX, 'junk.json'); open(junk, 'w').write('{not json')
        wrong = os.path.join(FX, 'wrong.json'); open(wrong, 'w').write('{"app":"other","kind":"x"}')
        for f, msg in ((junk, 'не в формате JSON'), (wrong, 'нет резервной копии')):
            pg.click('[data-restore]') if False else None
            pg.set_input_files('#pf-imp', f)
            pg.wait_for_selector('.pf-bk .errm')
            assert msg in pg.inner_text('.pf-bk .errm'), pg.inner_text('.pf-bk .errm')
        pg.set_input_files('#pf-imp', bpath)
        pg.wait_for_selector('.pf-bk .conf')
        assert 'будут заменены' in pg.inner_text('.pf-bk .conf')
        pg.click('.pf-bk [data-cn]')
        assert pg.locator('.pf-bk .conf').count() == 0 and pg.evaluate("PROF.meta().first") == 'Другой', 'cancel must not restore'
        pg.set_input_files('#pf-imp', bpath); pg.wait_for_selector('.pf-bk .conf'); pg.click('.pf-bk [data-ok]')
        pg.wait_for_selector('.pf-dlg', state='detached'); pg.evaluate("PROF.idle()")
        assert pg.evaluate("PROF.meta().first") == 'Анна'
        assert pg.evaluate("S.lib.renessa.styles.regular.p.stem") == stem0, 'font edits not restored'
        after = pg.evaluate("PROF.projects().map(f=>[f.key,f.st,f.vis,f.pin].join('|')).sort()")
        assert after == before, (before, after)
        assert pg.evaluate("PROF.img.avatar.length")>1000 and pg.locator('#rail-profile .avt.img').count() == 1
        assert pg.inner_text('.pf-name').strip() == 'Анна Морозова'
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'backup json (profile+images+5 font slots) exports; junk/wrong files rejected inline; cancel keeps data; confirm restores profile, avatar, edits, showcase'
    finally:
        s.close()


def sign_flow(p):
    s = boot(p, 'prof_sign')
    try:
        pg = s.pg
        pg.evaluate("libOpen('volt'); S.styles.regular.p.stem=(S.styles.regular.p.stem||100)+9; bump();")
        pg.evaluate(META)
        pg.evaluate("setTab('edit')"); pg.wait_for_function("S.tab==='edit' && !S.live", timeout=20000)
        name, data, path = s.download('ttf')
        f = TTFont(io.BytesIO(data)); nm = f['name']
        n9, n12 = nm.getName(9, 3, 1, 0x409), nm.getName(12, 3, 1, 0x409)
        assert n9 and n9.toUnicode() == 'Анна Морозова', n9
        assert n12 and n12.toUnicode() == 'https://morozova.ru', n12
        # export marks the customised font as ready in «Созданные шрифты»
        pg.wait_for_function("PROF.byKey('lib:volt')&&PROF.byKey('lib:volt').st==='ready'", timeout=10000)
        # toggle off: the file carries no author signature
        pg.evaluate("setTab('profile')")
        pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer')
        pg.click('label.pf-sign'); pg.click('[data-save]'); pg.wait_for_selector('.pf-drawer', state='detached')
        assert pg.evaluate("window.GT_AUTHOR===null")
        pg.evaluate("setTab('edit')"); pg.wait_for_function("S.tab==='edit' && !S.live", timeout=20000)
        name2, data2, _ = s.download('ttf')
        nm2 = TTFont(io.BytesIO(data2))['name']
        g9 = nm2.getName(9, 3, 1, 0x409)
        assert not (g9 and 'Морозова' in g9.toUnicode()) and not nm2.getName(12, 3, 1, 0x409), 'signature must be absent when the toggle is off'
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return f'TTF name ID9="{n9.toUnicode()}" ID12="{n12.toUnicode()}" with the toggle on, absent when off; export marks font ready'
    finally:
        s.close()


def rgb(pg, expr):
    return pg.evaluate(expr)


def accent_flow(p):
    s = boot(p, 'prof_accent')
    try:
        pg = s.pg
        res = []
        for th in ('light', 'dark'):
            pg.evaluate(f"themeSet('{th}')")
            pg.evaluate("setTab('home')"); pg.wait_for_timeout(250)
            tok = pg.evaluate("(()=>{const c=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase();return [c('--accent'),c('--accent-hover'),c('--accent-press')]})()")
            assert tok[0] == '#fc473c' and tok[1] not in ('#c22d24', '#d9342a') and tok[2] not in ('#c22d24', '#d9342a') and len(set(tok)) == 3, tok
            for sel in ('.hero .btn.pri', ):
                st = pg.evaluate("s=>{const b=document.querySelector(s),c=getComputedStyle(b);return [c.backgroundColor,c.color,+c.fontWeight]}", sel)
                assert st[0] == 'rgb(252, 71, 60)' and st[1] == 'rgb(255, 255, 255)' and st[2] >= 700, (sel, st)
                pg.hover(sel); pg.wait_for_timeout(350)
                h = pg.evaluate("s=>getComputedStyle(document.querySelector(s)).backgroundColor", sel)
                assert h == 'rgb(237, 63, 53)', f'hover {h}'
                pg.mouse.move(5, 5)
            # every .btn.pri in every reachable place: filled with the brand colour (hidden ones included)
            pg.evaluate("setTab('edit')"); pg.wait_for_timeout(300)
            bad = pg.evaluate("[...document.querySelectorAll('.btn.pri')].filter(b=>{if(b.disabled)return false;const bg=getComputedStyle(b).backgroundColor;return bg!=='rgb(252, 71, 60)'&&bg!=='rgba(0, 0, 0, 0)'}).map(b=>b.id||b.className)")
            assert not bad, f'{th}: primary buttons not brand: {bad}'
            dl = pg.evaluate("(()=>{const b=document.querySelector('#ex-menu'),c=getComputedStyle(b);return [c.backgroundColor,c.color,+c.fontWeight]})()")
            assert dl[0] == 'rgb(252, 71, 60)' and dl[1] == 'rgb(255, 255, 255)' and dl[2] >= 700, ('Скачать', dl)
            # profile primary + drawer Save
            pg.evaluate("setTab('profile')"); pg.wait_for_timeout(300)
            pe = pg.evaluate("(()=>{const b=document.querySelector('.pf-act .btn.pri'),c=getComputedStyle(b);return [c.backgroundColor,c.color,+c.fontWeight]})()")
            assert pe[0] == 'rgb(252, 71, 60)' and pe[1] == 'rgb(255, 255, 255)', pe
            # red stays for errors/destructive: «Удалить» confirm uses --danger
            dg = pg.evaluate("(()=>{const e=document.createElement('button');e.className='btn danger solid';document.body.appendChild(e);const c=getComputedStyle(e).backgroundColor;e.remove();const d=getComputedStyle(document.documentElement).getPropertyValue('--danger').trim();return [c,d]})()")
            assert dg[0] != 'rgb(252, 71, 60)', dg
            res.append(th)
        assert not s.errs, s.errs[:3]
        return 'accent #FC473C on every .btn.pri (hero Найти, Скачать, profile) in both themes; hover #ED3F35; red only danger'
    finally:
        s.close()


def geom_flow(p):
    s = boot(p, 'prof_geom')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        out = []

        def notch(label):
            pg.wait_for_selector('.pfc')
            pg.wait_for_timeout(250)
            g = pg.evaluate("""(()=>{const r=e=>{const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom,w:b.width,h:b.height}};
              const c=document.querySelector('.pfc'),n=c.querySelector('.notch'),b=c.querySelector('.nb'),f=c.querySelector('.pfc-fan');
              return {card:r(c),notch:r(n),nb:r(b),fan:r(f),vh:innerHeight}})()""")
            c, n, b = g['card'], g['notch'], g['nb']
            assert abs(n['r'] - c['r']) <= 1 and abs(n['t'] - c['t']) <= 1, (label, 'notch not in the corner', c, n)
            assert abs((b['l'] + b['r']) / 2 - (n['l'] + n['r']) / 2) <= 1 and abs((b['t'] + b['b']) / 2 - (n['t'] + n['b']) / 2) <= 1, (label, 'button not centred in the cut', n, b)
            assert abs(c['h'] - pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fc-h'))")) <= 40 or c['h'] >= 208, (label, 'card too short', c['h'])
            if c['b'] > g['vh'] - 4 or c['t'] < 4:
                pg.evaluate("document.querySelector('.pfc').scrollIntoView({block:'center'})"); pg.wait_for_timeout(250)
                g = pg.evaluate("(()=>{const r=e=>{const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom,w:b.width,h:b.height}};const c=document.querySelector('.pfc');return {card:r(c)}})()")
                c = g['card']
            clip = {'x': c['r'] - 110, 'y': c['t'] - 20, 'width': 130, 'height': 130}
            clip['x'] = max(0, clip['x'])
            im = Image.open(io.BytesIO(pg.screenshot(clip=clip))).convert('RGB')
            ox, oy = c['r'] - clip['x'], c['t'] - clip['y']   # card's top-right corner inside the clip
            px = lambda dx, dy: im.getpixel((int(round(ox + dx)), int(round(oy + dy))))
            bgc = px(-6, -10)
            far = lambda a, b: max(abs(a[i] - b[i]) for i in range(3))
            # concentric: inside the cut ring between the button (r 20) and the cut edge (r 28) is page background; beyond the edge is the card
            import math
            cx, cy = -28, 28
            for ang in (135, 160, 180, 200, 225):
                a = math.radians(ang)
                ring = px(cx + 24 * math.cos(a), cy - 24 * math.sin(a) * -1 if False else cy + 24 * math.sin(a) * -1)
            # sample on the lower-left arc of the cut
            ring_ok = []
            for ang in (110, 135, 160, 180, 200, 225, 250):
                a = math.radians(ang)
                x_in, y_in = cx + 24.5 * math.cos(a), cy - 24.5 * math.sin(a)
                x_out, y_out = cx + 31.5 * math.cos(a), cy - 31.5 * math.sin(a)
                ring_ok.append((far(px(x_in, y_in), bgc), far(px(x_out, y_out), bgc)))
            assert px(-3, 3) and far(px(-3, 3), bgc) <= 4, (label, 'cut corner is not page background', px(-3, 3), bgc)
            bad = [r for r in ring_ok if r[0] > 5]
            assert not bad, (label, 'gap ring around the button is not page background', ring_ok)
            lower = [r for r in ring_ok if r[1] >= 3]
            assert len(lower) >= 4, (label, 'outside the cut the card colour must show', ring_ok)
            out.append((label, [round(v) for v in (c['w'], c['h'])]))
        # owner (tools card next to the folder card)
        go(pg, 'profile'); notch('owner')
        pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill'); notch('guest')
        pg.click('.pf-gpill [data-pf=unguest]')
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
        go(pg, 'profile'); notch('phone-owner')
        pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill'); notch('phone-guest')
        assert not s.errs, s.errs[:3]
        return 'folder card: notch in the corner, button concentric with the cut, fan clipped - owner / guest / phone: ' + str(out)
    finally:
        s.close()


def layout_flow(p):
    s = boot(p, 'prof_layout')
    try:
        pg = s.pg
        pg.evaluate(SEED); pg.evaluate(META); pg.evaluate(READY)
        shots = os.path.join(WK, 'qa_prof')
        os.makedirs(shots, exist_ok=True)
        keep = bool(os.environ.get('GT_SHOTS'))

        def overflow(label):
            o = pg.evaluate("""(()=>{const d=document.documentElement,v=document.querySelector('.libview:not([hidden])');return [d.scrollWidth-innerWidth, v?v.scrollWidth-v.clientWidth:0,
              [...document.querySelectorAll('.pf-wrap *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1&&!e.closest('.pf-vgrid')}).slice(0,3).map(e=>e.className)]})()""")
            assert o[0] <= 1 and not o[2], (label, o)

        def row_align():
            # D5: «Поделиться» / «Редактировать профиль» sit on the NAME row (grid .pf-tx), right-aligned to the content; the link chips keep their own row below
            r = pg.evaluate("""(()=>{const a=document.querySelector('.pf-act .btn.pri')||document.querySelector('.pf-act .btn:last-child'),s=[...document.querySelectorAll('.pf-socs .chip')].map(c=>c.getBoundingClientRect()),b=a.getBoundingClientRect();
              const tx=document.querySelector('.pf-tx').getBoundingClientRect(),nm=document.querySelector('.pf-name').getBoundingClientRect();
              return {btnMid:(b.top+b.bottom)/2,nameMid:(nm.top+nm.bottom)/2,chipTop:Math.min(...s.map(x=>x.top)),btnBottom:b.bottom,btnRight:b.right,rowRight:tx.right,btnLeft:b.left,nameRight:nm.right}})()""")
            return r
        for th in ('light', 'dark'):
            pg.set_viewport_size({'width': 1440, 'height': 900})
            pg.evaluate(f"themeSet('{th}')")
            go(pg, 'profile'); pg.wait_for_timeout(400)
            overflow(th + ' profile')
            r = row_align()
            assert abs(r['nameMid'] - r['btnMid']) <= 8 and r['chipTop'] >= r['btnBottom'] - 1, (th, 'buttons must sit on the name row, chips below', r)
            assert abs(r['btnRight'] - r['rowRight']) <= 1 and r['btnLeft'] >= r['nameRight'] - 1, (th, 'button must be right-aligned after the name', r)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'profile_owner_{th}.png'))
            pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill'); pg.wait_for_timeout(300)
            r = row_align()
            assert abs(r['nameMid'] - r['btnMid']) <= 8 and abs(r['btnRight'] - r['rowRight']) <= 1, (th, 'guest action row', r)
            overflow(th + ' guest')
            if keep:
                pg.screenshot(path=os.path.join(shots, f'profile_guest_{th}.png'))
            pg.click('.pfc'); pg.wait_for_selector('#pf-flist .pf-fc'); pg.wait_for_timeout(300)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'folder_guest_{th}.png'))
            pg.click('.pf-gpill [data-pf=unguest]'); pg.wait_for_timeout(200)
            overflow(th + ' folder')
            if keep:
                pg.screenshot(path=os.path.join(shots, f'folder_grid_{th}.png'))
            pg.click('[data-pf=view][data-m=list]'); pg.wait_for_selector('#pf-flist .pf-frow'); pg.wait_for_timeout(250)
            overflow(th + ' folder list')
            if keep:
                pg.screenshot(path=os.path.join(shots, f'folder_list_{th}.png'))
            pg.click('[data-pf=view][data-m=grid]')
            # cover bleeds under the rail and from the top edge, fades into the page background
            cv = pg.evaluate("(()=>{go=0;return 0})()") if False else None
            go(pg, 'profile')
            geo = pg.evaluate("(()=>{const c=document.querySelector('.pf-cover').getBoundingClientRect();return [c.left,c.top,c.right,innerWidth]})()")
            assert geo[0] <= 1 and geo[1] <= 1 and geo[2] >= geo[3] - 1, ('cover must reach the left, top and right edges', geo)
            pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer'); pg.wait_for_timeout(450)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'drawer_{th}.png'))
            ava = mkimg('ava4.png', 800, 600, 5)
            with pg.expect_file_chooser() as fc:
                pg.click('[data-up=avatar]')
            fc.value.set_files(ava); pg.wait_for_selector('.pf-crop canvas'); pg.wait_for_timeout(350)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'crop_{th}.png'))
            pg.click('.pf-dlg [data-x] >> nth=0'); pg.wait_for_selector('.pf-dlg', state='detached')
            pg.keyboard.press('Escape'); pg.wait_for_selector('.pf-drawer', state='detached', timeout=3000)
        # phone
        for th in ('light', 'dark'):
            pg.evaluate(f"themeSet('{th}')")
            pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(250)
            go(pg, 'profile'); pg.wait_for_timeout(400)
            overflow('phone profile ' + th)
            n = pg.evaluate("[...document.querySelectorAll('.rail .rb')].filter(b=>{const r=b.getBoundingClientRect(),c=getComputedStyle(b);return r.width>0&&r.height>0&&c.visibility!=='hidden'}).length")
            assert n <= 7, f'phone bar has {n} items'  # W94: 7 = Главная, Библиотека, Избранное, Сообщество, тема, проект, профиль (Сообщество was added in v90; v91 baseline has the same 7)
            r = pg.evaluate("(()=>{const rl=document.querySelector('.rail').getBoundingClientRect();return [rl.top>innerHeight/2,rl.width>=innerWidth-40]})()")
            assert all(r), ('rail is not the bottom bar', r)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'profile_phone_{th}.png'))
            pg.click('.pf-act [data-pf=edit]'); pg.wait_for_selector('.pf-drawer'); pg.wait_for_timeout(450)
            d = pg.evaluate("(()=>{const r=document.querySelector('.pf-drawer').getBoundingClientRect();return [r.left,r.right,r.top,r.bottom,innerWidth,innerHeight]})()")
            assert d[0] <= 1 and d[1] >= d[4] - 1 and d[2] > 20 and d[3] >= d[5] - 1, ('drawer must be a bottom sheet', d)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'drawer_phone_{th}.png'))
            pg.keyboard.press('Escape'); pg.wait_for_selector('.pf-drawer', state='detached', timeout=3000)
            go(pg, 'folder'); pg.wait_for_timeout(300)
            overflow('phone folder ' + th)
            assert pg.evaluate("document.querySelectorAll('#pf-flist .pf-fc').length")==5
            if keep:
                pg.screenshot(path=os.path.join(shots, f'folder_phone_{th}.png'))
            assert vis(pg, '#rail-back') and not vis(pg, '[data-tab=fav]'), 'phone folder bar: back instead of favourites'
        # empty profile screenshot (new user) on desktop
        pg.set_viewport_size({'width': 1440, 'height': 900})
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'both themes: tags row + button on one line, cover bleeds, no horizontal overflow (profile/guest/folder/list); phone 390: bottom bar<=6, bottom-sheet drawer, stacked'
    finally:
        s.close()


def empty_shots(p):
    s = boot(p, 'prof_empty')
    try:
        pg = s.pg
        keep = bool(os.environ.get('GT_SHOTS'))
        shots = os.path.join(WK, 'qa_prof'); os.makedirs(shots, exist_ok=True)
        for th in ('light', 'dark'):
            pg.evaluate(f"themeSet('{th}')"); go(pg, 'profile'); pg.wait_for_timeout(450)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'profile_empty_{th}.png'))
            pg.evaluate("setTab('home')"); pg.wait_for_timeout(450)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'home_{th}.png'))
            pg.evaluate("libOpen('kvadra')"); pg.wait_for_function("S.tab==='edit'"); pg.wait_for_timeout(450)
            if keep:
                pg.screenshot(path=os.path.join(shots, f'editor_rail_{th}.png'))
            pg.evaluate("setTab('home')")
        assert not s.errs, s.errs[:3]
        return 'empty profile / home / editor rail captured'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('profile_edit', edit_flow), ('profile_guest', guest_flow), ('profile_pins', pins_flow), ('profile_folder', folder_flow),
                        ('profile_imp', imp_flow), ('profile_home', home_flow), ('profile_card', card_flow), ('profile_backup', backup_flow),
                        ('profile_sign', sign_flow), ('profile_accent', accent_flow), ('profile_geom', geom_flow), ('profile_layout', layout_flow),
                        ('profile_empty', empty_shots)]))
