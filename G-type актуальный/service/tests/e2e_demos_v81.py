"""v81: home «Как это работает» demo layouts — no overlapping parts inside the stage (720x340 coordinates).
d1 bars above tiles with a gap, tiles bottom = canvas bottom; slider tracks start at their label; d3 kerning handle sits on a visible track
and the list does not touch it; d4 placeholder lines never lie on top of a tile."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

JS = """()=>[...document.querySelectorAll('.dm .dm-st')].slice(0,4).map(st=>{const o=st.getBoundingClientRect(),sc=o.width/720;
 const f=e=>{if(!e||getComputedStyle(e).display=='none')return null;const r=e.getBoundingClientRect();return {x:(r.left-o.left)/sc,y:(r.top-o.top)/sc,w:r.width/sc,h:r.height/sc}};
 const all=s=>[...st.querySelectorAll(s)].map(f).filter(Boolean);
 return {bars:all('.dm-bars>i'),tiles:f(st.querySelector('.dm-tiles')),cv:f(st.querySelector('.dm-cv')),lb:all('.dm-lb'),sl:all('.dm-sl'),
   tk:f(st.querySelector('.dm-tk')),hd:f(st.querySelector('.dm-hd')),list:f(st.querySelector('.dm-list')),hb:all('.dm-hb'),pt:all('.dm-tile.dm-p'),hero:f(st.querySelector('.dm-hero'))}})"""


def ov(a, b):
    return a['x'] < b['x'] + b['w'] and b['x'] < a['x'] + a['w'] and a['y'] < b['y'] + b['h'] and b['y'] < a['y'] + a['h']


def run(p):
    s = Session(p, 'demos_v81'); pg = s.pg
    try:
        out = []
        for w in (1600, 400):
            pg.set_viewport_size({'width': w, 'height': 1000}); pg.evaluate("setTab('home')"); pg.wait_for_timeout(600)
            for b in pg.query_selector_all('.dm .dm-box')[:4]:
                b.scroll_into_view_if_needed(); pg.wait_for_timeout(1500)
            d = pg.evaluate(JS)
            d1, d2, d3, d4 = d
            if d1['tiles']:
                last = max(b['y'] + b['h'] for b in d1['bars'])
                assert d1['tiles']['y'] - last >= 8, ('d1 bars touch tiles', w, last, d1['tiles'])
                assert abs(d1['tiles']['y'] + d1['tiles']['h'] - (d1['cv']['y'] + d1['cv']['h'])) <= 2, ('d1 tiles/canvas bottom', w)
            for dd, nm in ((d1, 'd1'), (d2, 'd2')):
                assert abs(dd['sl'][0]['x'] - dd['lb'][0]['x']) <= 1, (nm + ' slider track not aligned with label', w)
            assert d3['tk'] and d3['tk']['h'] >= 3, ('d3 track missing', w)
            assert abs((d3['hd']['y'] + d3['hd']['h'] / 2) - (d3['tk']['y'] + d3['tk']['h'] / 2)) <= 1.5, ('d3 handle off track', w)
            assert d3['list']['y'] - (d3['hd']['y'] + d3['hd']['h']) >= 8, ('d3 list touches handle', w)
            assert d3['list']['y'] + d3['list']['h'] <= d3['hero']['y'] + d3['hero']['h'] - 8, ('d3 list leaves the panel', w)
            for hb in d4['hb']:
                for t in d4['pt']:
                    assert not ov(hb, t), ('d4 lines over a tile', w)
            for i in range(len(d4['pt'])):
                for j in range(i + 1, len(d4['pt'])):
                    assert not ov(d4['pt'][i], d4['pt'][j]), ('d4 tiles overlap', w)
            out.append(str(w))
        assert not s.errs, s.errs[:3]
        return 'layouts ok at ' + ','.join(out)
    finally:
        s.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        try:
            print('PASS demos_v81', run(p))
        except Exception as e:
            print('FAIL demos_v81', repr(e)[:400]); sys.exit(1)
