"""languages + passport: hover card, library language filter, import screen / draw screen hints, «О шрифте», passport in the exported TTF."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS, shot
from fontTools.ttLib import TTFont

RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 0h60v70H10z"/></svg>'
RU = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
PUNCT = ".,:;!?-()–—«»№'"


def lang_check(p):
    s = Session(p, 'lang')
    try:
        pg = s.pg
        notes = []
        # ---- the literal example from the brief: Ukrainian on a bare Russian alphabet ----
        miss = pg.evaluate("ru=>langOf(LANG_BY_ID.uk,new Set(Array.from(ru))).missing.join(' ')", RU)
        assert miss == 'Ґ ґ Є є І і Ї ї', f'ukrainian missing: {miss!r}'
        # ---- hover card: languages block replaces «Базовый/Расширенный» ----
        if not pg.is_visible('[data-tab=library]'):
            pg.click('[data-tab=home]')
        pg.click('[data-tab=library]')
        pg.wait_for_selector('#libgrid .lcard[data-font=volt]')
        pg.hover('#libgrid .lcard[data-font=volt]')
        pg.wait_for_function("document.querySelector('#hcard.on .hc-lang')", timeout=8000)
        want = s.js("(()=>{const c=langCover('volt');return c.filter(r=>r.status==='full').length+' из '+c.length;})()")
        got = s.js("document.querySelector('#hcard .hl-h b').textContent")
        assert got == want, f'hover count {got!r} != {want!r}'
        txt = s.js("document.querySelector('#hcard').innerText")
        assert 'Русский' in txt and 'Базовый' not in txt and 'Расширенный' not in txt, 'hover card text'
        near = s.js("document.querySelector('#hcard .hl-near').innerText")
        assert 'не хватает Җ җ' in near, f'volt near-languages: {near!r}'
        pg.mouse.move(2, 2)
        pg.wait_for_function("!document.querySelector('#hcard.on')", timeout=5000)
        pg.hover('#libgrid .lcard[data-font=ustav]')
        pg.wait_for_function("document.querySelector('#hcard.on')&&document.querySelector('#hcard .hc-n').textContent==='Устав'", timeout=8000)
        ust = s.js("document.querySelector('#hcard .hc-lang').innerText")
        assert ust.startswith('Языки') and 'Русский' in ust and 'не хватает' in ust, f'ustav hover: {ust!r}'
        ukm = s.js("langMissText(langCover('ustav').find(r=>r.id==='uk'))")
        assert 'Ґ ґ Є є І і Ї ї' in ukm, f'ustav uk missing {ukm!r}'
        notes.append('hover ok')
        pg.mouse.move(2, 2)
        # ---- library filter ----
        pg.click('#lf-btn')
        assert s.js("document.querySelector('#lf-btn').getAttribute('aria-expanded')") == 'true'
        n_uk = s.js("+document.querySelector('.lf-chip[data-tag=lang-uk] em').textContent")
        pg.click('.lf-chip[data-tag=lang-uk]')
        ids = s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>c.dataset.font)")
        exp = s.js("libIds().filter(id=>langTagIds(id).includes('lang-uk'))")
        assert ids and sorted(ids) == sorted(exp) and len(ids) == n_uk, f'lang-uk filter {ids} vs {exp} ({n_uk})'
        assert 'ustav' not in ids and 'volt' in ids, 'ustav has no Ukrainian'
        assert s.js("document.querySelectorAll('#lib-fchips .fchip').length") == 1, 'selected language is shown as a chip in the search field'
        assert s.js("document.querySelector('.lf-chip[data-tag=lang-uk]').getAttribute('aria-pressed')") == 'true'
        assert s.js("document.querySelector('#lf-n').textContent") == '1'
        assert s.js("document.querySelector('.lf-chip[data-tag=lang-tt]').disabled") is True, 'zero-count chip must be disabled (FX80 F3)'   # Tatar: nobody has Җ җ
        s.js("LQ.tags.push('lang-tt');libRenderLibrary()")
        assert s.js("document.querySelector('#lib-empty').hidden") is False, 'empty state for an impossible combination'
        s.js("LQ.tags=LQ.tags.filter(t=>t!=='lang-tt');libRenderLibrary()")
        pg.click('.lf-chip[data-tag=lang-ru]')   # AND: uk + ru
        ids2 = s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>c.dataset.font)")
        assert sorted(ids2) == sorted(exp), f'uk+ru {ids2}'
        pg.click('.lf-chip[data-tag=lang-uk]'); pg.click('.lf-chip[data-tag=lang-ru]')
        # search suggestion by language name
        pg.fill('#lib-q', 'украин')
        sug = s.js("[...document.querySelectorAll('#lib-sug .sug')].map(b=>b.dataset.tag)")
        assert 'lang-uk' in sug, f'suggestions {sug}'
        pg.fill('#lib-q', '')
        notes.append(f'filter uk={len(ids)}')
        # mobile width: the facet panel must not overflow
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.wait_for_timeout(300)
        over = s.js("document.documentElement.scrollWidth-document.documentElement.clientWidth")
        assert over <= 1, f'horizontal overflow {over}px at 390px'
        pg.set_viewport_size({'width': 1440, 'height': 900})
        # dark theme renders without errors
        s.js("themeSet('dark')"); pg.wait_for_timeout(200)
        shot(pg, os.path.join(LOGS, 'lang_dark.png'))
        s.js("themeSet('light')")
        # ---- import screen: set coverage and missing letters ----
        pg.evaluate("""([svg,ru,pu])=>{for(const ch of ru+pu){impSet(ch,svg);}iuRegisterNow();iuOpen();}""", [RECT, RU, PUNCT])
        pg.evaluate("dwOpen('import','lg')")
        pg.wait_for_selector('#imp-lang')
        t = s.js("document.querySelector('#imp-lang').innerText")
        assert 'Языки вашего набора' in t and 'Русский' in t, f'import block: {t!r}'
        nx = s.js("(()=>{const set=lgImpSet();const n=langNext(null,set,3);return n.map(r=>r.name+': '+langMissText(r));})()")
        assert nx and nx[0].split(': ', 1)[1] in t, f'import hint {nx} not in {t!r}'
        # empty set first: hint to upload
        s.js("(()=>{for(const k of Object.keys(IMP.glyphs))delete IMP.glyphs[k];IMP.ver++;iuRegisterNow();})()")
        t0 = s.js("document.querySelector('#imp-lang').innerText")
        assert 'Загрузите знаки' in t0, f'empty import hint {t0!r}'
        # a Ukrainian-ready set shows the next language with the exact letters
        UK = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгдежзийклмнопрстуфхцчшщьюя' + PUNCT
        pg.evaluate("([svg,chars])=>{for(const ch of Array.from(chars))impSet(ch,svg);iuRegisterNow();}", [RECT, UK])
        t1 = s.js("document.querySelector('#imp-lang').innerText")
        assert 'Украинский' in t1 or 'Следующий язык' in t1, f'import near block {t1!r}'
        notes.append('import ok')
        s.js("iuClose()")
        # ---- draw screen ----
        s2 = Session(p, 'lang2')
        try:
            s2.pg.evaluate("""([ru,pu])=>{const g={};const cs=[{hole:false,nodes:[{x:0,y:0,a:null,b:null},{x:300,y:0,a:null,b:null},{x:300,y:600,a:null,b:null},{x:0,y:600,a:null,b:null}]}];
              for(const ch of ru+pu.replace('№','').replace("'",'')){g[ch]={i:[],s:1,c:impPackC(cs),w:0,sp:0};}
              localStorage.setItem('gtype-draw-n7',JSON.stringify({v:1,name:'T',set:'cyr',ch:'А',grid:'mod',g}));}""", [RU, PUNCT])
            s2.pg.evaluate("setTab('draw')")
            s2.pg.wait_for_selector('#dr-side', state='attached'); s2.pg.evaluate("dwOpen('draw','recs')")  # the languages block lives in the collapsible «Рекомендации и языки» pane
            s2.pg.wait_for_selector('#lg-draw', timeout=10000)
            s2.pg.wait_for_function("document.querySelector('#lg-draw').innerText.includes('Нарисуйте')", timeout=10000)
            dt = s2.js("document.querySelector('#lg-draw').innerText")
            assert 'Русский' in dt and '№' in dt, f'draw hint {dt!r}'
            assert not s2.errs, f'page errors {s2.errs[:3]}'
        finally:
            s2.close()
        notes.append('draw ok')
        # ---- «О шрифте» + passport inside the exported file ----
        s.js("switchFont('kvadra')"); s.js("setTab('edit')")
        pg.wait_for_function("S.fontId==='kvadra'", timeout=20000)
        items = s.js("[...document.querySelectorAll('#ex-list [data-x]')].map(b=>b.dataset.x).join(' ')")
        assert items.endswith(' about'), f'menu {items}'
        s.js("document.querySelector('#ex-menu').click()")
        pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'")
        s.js("document.querySelector('[data-x=about]').click()")
        pg.wait_for_selector('#about-font:not([hidden]) .ab-digits span', timeout=10000)
        digits = s.js("[...document.querySelectorAll('#ab-body .ab-digits span')].map(x=>+x.textContent)")
        assert len(digits) == 10, f'PANOSE digits {digits}'
        body = s.js("document.querySelector('#ab-body').innerText")
        assert 'Латинский текстовый' in body and 'Языки: ' in body and 'Насыщенность' in body and 'Ширина' in body, 'passport text'
        wcls = s.js("(()=>{const w=weightOf(S.styles.regular.p);return w.weight;})()")
        pg.keyboard.press('Escape')
        pg.wait_for_function("document.querySelector('#about-font').hidden", timeout=3000)
        name, data, path = s.download('ttf')
        f = TTFont(io.BytesIO(data)); o = f['OS/2']
        got = [o.panose.bFamilyType, o.panose.bSerifStyle, o.panose.bWeight, o.panose.bProportion, o.panose.bContrast,
               o.panose.bStrokeVariation, o.panose.bArmStyle, o.panose.bLetterForm, o.panose.bMidline, o.panose.bXHeight]
        assert got == digits, f'dialog PANOSE {digits} != file {got}'
        assert o.usWeightClass == wcls, f'weight class {o.usWeightClass} != {wcls}'
        assert f['name'].getDebugName(10) and f['name'].getName(10, 3, 1, 0x419), 'description in the exported file'
        assert not s.errs, f'page errors {s.errs[:3]}'
        notes.append(f'passport ok w{o.usWeightClass} wd{o.usWidthClass}')
        return ' '.join(notes)
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('lang', lang_check)]))
