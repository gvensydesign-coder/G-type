"""vfx: export menu has axis checkboxes + «Униширинные»; a VF with the ticked axes downloads and validates (fvar axes, avar, STAT, RU names);
the «Оси» pane builds a VF in memory, the browser loads it and the sliders change the rendering of the specimen."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import vf_ttf, Session, check_all
from fontTools.ttLib import TTFont


def vfx_check(p):
    s = Session(p, 'vfx')
    try:
        pg = s.pg
        s.open_font('volt'); s.open_panes()
        boxes = s.js("[...document.querySelectorAll('#ex-list [data-vfax]')].map(b=>b.dataset.vfax).join(' ')")
        assert boxes == 'wght wdth opsz slnt', f'axis boxes {boxes}'
        assert s.js("!!document.querySelector('#ex-list #vfx-uw')"), 'no uniwidth checkbox'
        labels = s.js("[...document.querySelectorAll('#ex-list .xopts .chk span')].map(x=>x.textContent).join('|')")
        for w in ('Насыщенность', 'Ширина', 'Оптический размер', 'Наклон', 'Униширинные'):
            assert w in labels, f'label {w} missing: {labels}'
        # tick width (wght is on by default) and download a VF
        s.js("(()=>{const i=document.querySelector('#ex-list [data-vfax=wdth]');i.checked=true;i.dispatchEvent(new Event('change',{bubbles:true}));})()")
        name, data, path = s.download('vf', timeout=300000)
        assert name.endswith('-VF.zip'), name
        data = vf_ttf(data)
        f = TTFont(io.BytesIO(data))
        axes = [a.axisTag for a in f['fvar'].axes]
        assert axes == ['wght', 'wdth'], f'axes {axes}'
        assert 'avar' in f and 'STAT' in f and 'HVAR' in f, 'tables'
        assert any(r.langID == 0x419 for r in f['name'].names), 'no RU names'
        assert len(f['fvar'].instances) == 12, f'instances {len(f["fvar"].instances)}'
        # preview pane: build in memory, move sliders
        s.js("document.querySelector('#vfx-pane').open=true")
        s.js("document.querySelector('#vfx-build').click()")
        pg.wait_for_function("!!document.querySelector('#vfx-sl input[data-tag=wght]') && !document.querySelector('#vfx-build').disabled", timeout=300000)
        ok = s.js("document.fonts.check(\"20px \" + VFXP.fam)")
        assert ok, 'VF face not loaded'
        def width(w, d):
            return pg.evaluate("""([w,d])=>{const t=document.querySelector('#vfx-txt');
              for(const [k,v] of [['wght',w],['wdth',d]]){const i=document.querySelector('#vfx-sl input[data-tag='+k+']');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));}
              t.style.display='inline-block';t.style.whiteSpace='nowrap';return [t.getBoundingClientRect().width, t.style.fontVariationSettings]}""", [w, d])
        w1 = width(300, 100)[0]; w2 = width(900, 100)[0]; w3 = width(400, s.js("+document.querySelector('#vfx-sl input[data-tag=wdth]').min"))[0]
        assert abs(w1 - w2) > 8, f'wght slider does not change width: {w1} vs {w2}'
        wide = width(400, s.js("+document.querySelector('#vfx-sl input[data-tag=wdth]').max"))[0]
        assert wide > w3 + 40, f'wdth slider does not change width: {w3} vs {wide}'
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'axes={"".join(axes)} inst={len(f["fvar"].instances)} {len(data)//1024}K narrow={w3:.0f}px wide={wide:.0f}px'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('vfx', vfx_check)]))
