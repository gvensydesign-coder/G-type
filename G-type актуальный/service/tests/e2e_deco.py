"""decorative styles (ui_deco_d1.js): preview toggle in the specimen, parameter panel, export menu section, every style exports a loadable TTF."""
import io, os, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all
from fontTools.ttLib import TTFont

SUFFIX = {'deco_outline': 'Outline', 'deco_inline': 'Inline', 'deco_shadow': 'Shadow', 'deco_cameo': 'Cameo'}


def canvas_sig(s):
    """hash and dark-pixel count of the specimen canvas"""
    return s.js("""(()=>{const c=document.querySelector('#spec'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;
      let h=0,n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>40){n++;h=(h*31+d[i]+d[i+1]*7+d[i+3]*13+(i>>2))|0;}}return [h,n];})()""")


def wait_draw(s, before, timeout=90000):
    s.pg.wait_for_function("DCU.stamp>%d" % before, timeout=timeout)


def deco_check(p):
    s = Session(p, 'deco')
    try:
        pg = s.pg
        s.open_font('volt'); s.open_panes()
        pg.evaluate("setTab('edit')")
        pg.wait_for_selector('#decob', timeout=10000)
        # menu section
        labels = s.js("[...document.querySelectorAll('#ex-list .xsec')].map(x=>x.textContent).join('|')")
        assert 'Декоративные начертания' in labels, labels
        items = s.js("[...document.querySelectorAll('#ex-list [data-x^=deco_]')].map(b=>b.dataset.x).join(' ')")
        assert items == 'deco_outline deco_inline deco_shadow deco_cameo', items
        # preview toggle
        plain = canvas_sig(s)
        assert plain[1] > 500, f'specimen empty {plain}'
        assert s.js("document.querySelector('#decobar').hidden") is True
        st0 = s.js("DCU.stamp||0")
        pg.click('#decob')
        pg.wait_for_function("!document.querySelector('#decobar').hidden", timeout=5000)
        wait_draw(s, st0)
        assert pg.get_attribute('#decob', 'aria-pressed') == 'true'
        sigs = {}
        keys = s.js("[...document.querySelectorAll('#dcu-sel option')].map(o=>o.value)")
        assert len(keys) == 7, keys
        for k in keys:
            st0 = s.js("DCU.stamp||0")
            pg.select_option('#dcu-sel', k)
            wait_draw(s, st0)
            sg = canvas_sig(s)
            assert sg[1] > 300, f'{k}: preview empty {sg}'
            assert sg[0] != plain[0], f'{k}: preview equals plain specimen'
            assert sg[0] not in sigs.values(), f'{k}: same picture as another style'
            sigs[k] = sg[0]
            # every parameter has a label and a tooltip
            n = s.js("document.querySelectorAll('#decobar input[type=range]').length")
            assert n >= 1, f'{k}: no sliders'
            tips = s.js("[...document.querySelectorAll('#decobar label')].every(l=>l.title&&l.querySelector('span').textContent.length>2)")
            assert tips is True, f'{k}: missing tooltip/label'
        # a slider changes the picture
        st0 = s.js("DCU.stamp||0")
        pg.select_option('#dcu-sel', 'outline')
        wait_draw(s, st0)
        a = canvas_sig(s)
        st0 = s.js("DCU.stamp||0")
        s.js("(()=>{const r=document.querySelector('#decobar input[data-p=w]');r.value=r.max;r.dispatchEvent(new Event('input',{bubbles:true}));})()")
        wait_draw(s, st0)
        b = canvas_sig(s)
        assert a[0] != b[0], 'slider has no effect'
        # both themes keep the preview visible
        pg.evaluate("document.querySelector('#theme-btn').click()")  # theme toggle lives in the «?» popover in work modes
        pg.wait_for_function("document.documentElement.dataset.theme==='dark'", timeout=30000)
        pg.wait_for_timeout(500)
        assert canvas_sig(s)[1] > 300, 'preview empty in dark theme'
        pg.evaluate("document.querySelector('#theme-btn').click()")  # theme toggle lives in the «?» popover in work modes
        # toggle off restores the plain specimen
        pg.click('#decob')
        pg.wait_for_function("document.querySelector('#decobar').hidden", timeout=30000)
        pg.wait_for_timeout(800)
        back = canvas_sig(s)
        assert back[0] == plain[0], 'specimen not restored after toggling off'
        # exports: each of the four menu items downloads a TTF that loads
        rep = []
        for item, suf in SUFFIX.items():
            name, data, path = s.download(item, timeout=240000)
            f = TTFont(io.BytesIO(data))
            assert 'glyf' in f and f.getBestCmap(), f'{item}: no glyphs'
            fam = f['name'].getDebugName(1)
            assert fam.endswith(suf) or suf in fam, f'{item}: family {fam}'
            cm = f.getBestCmap()
            gn = cm.get(ord('о')) or cm.get(ord('o'))
            assert f['glyf'][gn].numberOfContours > 0, f'{item}: empty о'
            assert suf in name, f'{item}: file name {name}'
            rep.append(f'{suf}={len(data)//1024}K')
            s.pg.wait_for_function("!document.querySelector('#ex-menu').hasAttribute('aria-busy')", timeout=240000)
        assert not s.errs, f'page errors {s.errs[:3]}'
        return ' '.join(rep) + f' styles={len(keys)}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('deco', deco_check)]))
