"""cells: инструмент «Ячейки» в «Отрисуй свой шрифт» — протяжка закрашивает ячейки без щелей, соседние сливаются в одни чернила,
смена формы пересобирает контуры (и плавно переходит), отмена/повтор, ластик, подсетка, связь настроек, сохранение после перезагрузки,
сборка шрифта с чернилами, тема и телефон, без ошибок консоли."""
import io, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, SHOTS, shot as _shot, LOGS
from e2e_draw import Session, Draw, setup, openpane
from draw_scaffold import SCAFFOLD
from fontTools.ttLib import TTFont

QA = os.path.join(LOGS, 'qa_cells')
c = lambda i, j: ((i + .5) * 70, (j + .5) * 70)   # центр ячейки (10 x 10, ячейка 70)


LSK = 'gtype-draw-n7'
_rl = [0]


def reload_ls(s, raw, force=False):
    """Reload with the drawing storage key guaranteed at document start. A localStorage write made right before pg.reload() is intermittently not
    visible to the reloaded document in headless Chromium (the product has no code path that deletes the key: checked with a removeItem/clear/setItem
    tracer; a pending persistSoon timer of the old page may also overwrite a key set by hand), so the key is (re)installed by an init script that runs
    once, before the app scripts: `force` always (hand-made old-format data), otherwise only when it went missing."""
    _rl[0] += 1
    s.ctx.add_init_script("try{const f='lsfix%d';if(!sessionStorage.getItem(f)){sessionStorage.setItem(f,'1');if(%s||localStorage.getItem(%s)===null)localStorage.setItem(%s,%s)}}catch(e){}"
                          % (_rl[0], 'true' if force else 'false', json.dumps(LSK), json.dumps(LSK), json.dumps(raw)))
    s.pg.reload(); s.pg.wait_for_function("typeof GT_DRAW!=='undefined'&&typeof S!=='undefined'", timeout=30000)


def cl(d, expr):
    return d.pg.evaluate(f"(()=>{{const t=GT_DRAW._t,C=t.cl;return {expr}}})()")


def sig(d):
    """подпись чернил: число контуров, узлов и габарит"""
    return cl(d, "(()=>{const it=C.curCell();if(!it)return null;const cs=it.cs;let n=0;for(const k of cs)n+=k.nodes.length;const b=impBBox(cs);return [cs.length,n,Math.round(b.x0),Math.round(b.y0),Math.round(b.x1),Math.round(b.y1)]})()")


def full(p):
    s, d = setup(p, 'cells'); pg = s.pg

    def pc(sel):
        """клик по панели «Сетка ячеек» (ящик закрывается при рисовании: открыть снова)"""
        if not pg.evaluate("dwSec('draw')==='cells'"): openpane(pg, 'cells')
        pg.click(sel)
    pg.evaluate("dwClose('draw')")
    assert pg.is_visible('#dr-tools [data-tool=cells]'), 'tool button missing'
    d.tool('cells'); pg.wait_for_timeout(200)
    assert d.st("t.D.tool") == 'cells' and d.st("t.D.grid") == 'cell'
    assert pg.evaluate("document.querySelector('[data-pane=dr-cells]').hidden") is False
    # горячая клавиша «=» (7 снова переходит к знаку «7»)
    d.tool('shape'); assert pg.evaluate("document.querySelector('[data-pane=dr-cells]').hidden") is True
    d.key('='); assert d.st("t.D.tool") == 'cells'
    # протяжка: быстрая, 3 шага на отрезок — без щелей, ячеек столько, сколько на пути
    d.path([c(2, 8), c(2, 1)], steps=2)
    n1 = cl(d, "C.cellN(C.curCell())"); assert n1 == 8, n1          # вся колонка, без пропусков
    d.path([c(2, 8), c(6, 8), c(7, 7), c(7, 3)], steps=2)
    n2 = cl(d, "C.cellN(C.curCell())"); assert n2 >= 8 + 5 + 3, n2
    s1 = sig(d); assert s1 and s1[0] >= 1 and s1[1] >= 8, s1
    # слитые чернила: одна связная форма без «заноз» и самопересечений
    chk = cl(d, "(()=>{const cs=C.curCell().cs;return {bad:cxCross(cs).size,holes:cs.filter(c=>c.hole).length,outer:cs.filter(c=>!c.hole).length,nodes:cs.reduce((a,c)=>a+c.nodes.length,0)}})()")
    assert chk['bad'] == 0 and chk['outer'] == 1 and chk['nodes'] < 120, chk
    # кисть 3: квадратный след 3x3
    pg.evaluate("document.querySelector('#dr-opt #dr-csz').value=3;document.querySelector('#dr-opt #dr-csz').dispatchEvent(new Event('input',{bubbles:true}))")
    assert d.st("t.D.cs.size") == 3
    d.click(*c(5, 4)); assert cl(d, "C.cellN(C.curCell())") >= n2 + 5, 'size 3 stamp'
    pg.evaluate("document.querySelector('#dr-opt #dr-csz').value=1;document.querySelector('#dr-opt #dr-csz').dispatchEvent(new Event('input',{bubbles:true}))")
    # ластик
    nb = cl(d, "C.cellN(C.curCell())")
    pg.click('#dr-opt [data-cm=erase]'); d.click(*c(2, 1)); assert cl(d, "C.cellN(C.curCell())") == nb - 1, 'eraser'
    pg.click('#dr-opt [data-cm=draw]')
    # смена формы: контуры меняются
    sc = sig(d)
    openpane(pg, 'cells')
    pc('#dr-cl [data-cla=square]'); pg.wait_for_timeout(150)
    sq = sig(d); assert sq != sc, ('shape change', sc, sq)
    pc('#dr-cl [data-cla=hex]'); pc('#dr-cl [data-clb=hex]'); pg.wait_for_timeout(150)
    hx = sig(d); assert hx != sq, 'hex'
    # переход A->B и поворот: ползунки
    pc('#dr-cl [data-cla=circle]'); pc('#dr-cl [data-clb=square]')
    for sel, v in (('#dr-ct', 60), ('#dr-cr', 30), ('#dr-cn', 70)):
        pg.evaluate("([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}", [sel, v])
    pg.wait_for_timeout(200)
    assert d.st("t.D.cs.t") == 60 and d.st("t.D.cs.rot") == 30 and d.st("t.D.cs.rnd") == 70
    mo = sig(d); assert mo != hx
    # геометрия для всех форм и поворотов: чисто, без самопересечений
    bad = cl(d, """(()=>{const it=C.curCell(),g0=it.cl.g,o=[];const [g,c,s]=[it.cl.g,it.cl.c,null];
      for(const a of DRC.SH.map(x=>x[0]))for(const rot of [0,17,45]){const cs=drcInk(Object.assign({},g0,{a,b:a,t:0,rot}),c,s);
        const nn=cs.reduce((q,k)=>q+k.nodes.length,0);if(!cs.length||cxCross(cs).size||nn>400)o.push([a,rot,cs.length,cxCross(cs).size,nn]);}return o})()""")
    assert not bad, bad
    # отмена / повтор
    pg.click('#dr-undo'); pg.wait_for_timeout(100)
    pg.click('#dr-undo'); pg.click('#dr-undo'); pg.wait_for_timeout(100)
    u3 = sig(d)
    for _ in range(40):
        if not pg.evaluate("!document.querySelector('#dr-undo').disabled"): break
        pg.click('#dr-undo')
    assert cl(d, "C.curCell()") is None, 'undo to empty removes the layer'
    for _ in range(60):
        if pg.evaluate("document.querySelector('#dr-redo').disabled"): break
        pg.click('#dr-redo')
    assert cl(d, "C.cellN(C.curCell())") > 0 and sig(d) == mo, ('redo restores', sig(d), mo)
    # переход плавный: в середине анимации чернила — смесь, по окончании — точные контуры
    pg.evaluate("window.__GT_CELLANIM=1")
    pc('#dr-cl [data-cla=hex]'); pg.wait_for_timeout(120)
    mid = cl(d, "!!C.curCell()._anim&&C.ANI.it===C.curCell()")
    assert mid, 'animation running'
    pg.wait_for_timeout(700)
    assert cl(d, "!C.curCell()._anim&&!C.curCell()._stale") and sig(d) != mo
    pg.evaluate("window.__GT_CELLANIM=0")
    # подсетка
    ns = cl(d, "C.cellN(C.curCell())")
    pc('#dr-cl #dr-csub + i'); pg.wait_for_timeout(100)
    assert d.st("t.D.cs.sub") == 1
    pc('#dr-cl [data-cact=sub]'); d.click(*c(8, 8)); pg.wait_for_timeout(100)
    assert cl(d, "C.curCell().cl.s.length>0"), 'subgrid cell'
    sub_ok = cl(d, "(()=>{const cs=C.curCell().cs;return cxCross(cs).size===0&&cs.length>=1})()")
    assert sub_ok
    pc('#dr-cl [data-cact=main]')
    # скрыть сетку
    pg.click('#dr-opt [data-act=cshow]'); assert d.st("t.D.cshow") is False
    pg.click('#dr-opt [data-act=cshow]')
    # «Случайно» и «Сброс»
    pc('#dr-cl [data-ca=rand]'); pg.wait_for_timeout(100)
    pc('#dr-cl [data-ca=reset]'); pg.wait_for_timeout(150)
    assert d.st("t.D.cs.a") == 'circle' and d.st("t.D.cs.sub") == 0 and d.st("t.D.cs.rows") == 10
    # размеры сетки: 6x8 и нижние ряды
    for sel, v in (('#dr-cc', 6), ('#dr-crw', 8), ('#dr-cd', 1)):
        pg.evaluate("([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}", [sel, v])
    assert d.st("t.D.cs.cols") == 6 and d.st("t.D.cs.rows") == 8 and d.st("t.D.cs.desc") == 1
    assert abs(pg.evaluate("GT_DRAW._t.snapPt(0,0)[0]") - 0) < 1e-6
    pc('#dr-cl [data-ca=reset]')
    # панель всегда показывает настройки знака: смена формы из кода (без клика) обновляет чипы и подписи
    pg.evaluate("GT_DRAW._t.cl.cellSet({a:'hex',b:'oct',t:0})"); openpane(pg, 'cells')
    assert pg.evaluate("document.querySelector('#dr-cl [data-cla=hex]').getAttribute('aria-pressed')==='true'&&document.querySelector('#dr-cl [data-clb=oct]').getAttribute('aria-pressed')==='true'"), 'panel follows settings'
    pc('#dr-cl [data-ca=reset]')
    # выпуклые части следуют форме ячейки с полной кривизной: стойка из 3 кругов = капсула, одна ячейка = круг (отклонение < 1 ед.)
    dev = cl(d, """(()=>{const g={a:'circle',b:'circle',t:0,rot:0,rows:10,cols:10,rnd:40},mx=(cells,ref)=>{let m=0;for(const c of drcInk(g,cells,null)){const N=c.nodes;
      for(let i=0;i<N.length;i++){const A=N[i],B=N[(i+1)%N.length],P=[[A.x,A.y],A.b?[A.b.x,A.b.y]:[A.x,A.y],B.a?[B.a.x,B.a.y]:[B.x,B.y],[B.x,B.y]];
        for(let k=0;k<=16;k++){const t=k/16,u=1-t,q=[0,1].map(z=>u*u*u*P[0][z]+3*u*u*t*P[1][z]+3*u*t*t*P[2][z]+t*t*t*P[3][z]);m=Math.max(m,Math.abs(ref(q[0],q[1])));}}}return m;};
      return [mx([3,0,3,1,3,2],(x,y)=>Math.hypot(x-245,y-Math.max(35,Math.min(175,y)))-35),mx([3,3],(x,y)=>Math.hypot(x-245,y-245)-35)]})()""")
    assert max(dev) < 1.0, ('convex curvature', dev)
    # ряд многоугольников при скруглении > 0: края прямые, без зубцов (разброс < 1.5 ед.)
    zig = cl(d, """(()=>{const o=[];for(const a of ['square','diamond','tri','pent','hex','oct'])for(const rot of [0,15,30,45,60]){
      const g={a,b:a,t:0,rot,rows:10,cols:10,rnd:40},cells=[];for(let i=1;i<=8;i++)cells.push(i,3);let lo=1e9,hi=-1e9,lo2=1e9,hi2=-1e9;
      for(const c of drcInk(g,cells,null)){const N=c.nodes;for(let i=0;i<N.length;i++){const A=N[i],B=N[(i+1)%N.length],P=[[A.x,A.y],A.b?[A.b.x,A.b.y]:[A.x,A.y],B.a?[B.a.x,B.a.y]:[B.x,B.y],[B.x,B.y]];
        for(let k=0;k<=12;k++){const t=k/12,u=1-t,x=u*u*u*P[0][0]+3*u*u*t*P[1][0]+3*u*t*t*P[2][0]+t*t*t*P[3][0],y=u*u*u*P[0][1]+3*u*u*t*P[1][1]+3*u*t*t*P[2][1]+t*t*t*P[3][1];
          if(x>210&&x<490){if(y>245){lo=Math.min(lo,y);hi=Math.max(hi,y);}else{lo2=Math.min(lo2,y);hi2=Math.max(hi2,y);}}}}}
      if(hi-lo>1.5||hi2-lo2>1.5)o.push([a,rot,hi-lo,hi2-lo2]);}return o})()""")
    assert not zig, ('zigzag', zig)
    # активная вкладка набора читается: индикатор вставлен и красится в чернила
    assert pg.inner_text('#dr-setb').replace('\n', ' ').startswith('Базовая кириллица'), 'set pill shows the current set (D5: dropdown instead of tabs)'
    # сохранить знак, собрать шрифт: у буквы есть чернила
    d.key('Escape')
    pg.click('#dr-sv'); pg.wait_for_timeout(300)
    assert d.st("t.D.g['А']&&t.D.g['А'].s") is True
    inkA = d.st("t.D.g['А'].cs.length")
    assert inkA >= 1
    # второй знак той же сеткой: Н (колонки + перемычка), потом круг, квадрат, шестиугольник
    d.goto('Б'); d.tool('cells')
    d.path([c(2, 8), c(2, 1)], steps=2); d.path([c(2, 8), c(6, 8)], steps=2)
    pg.click('#dr-sv'); pg.wait_for_timeout(200)
    # сохранение после перезагрузки
    pg.evaluate("GT_DRAW.onHide()")
    stored = pg.evaluate("JSON.parse(localStorage.getItem('gtype-draw-n7'))")
    assert stored['g']['А']['i'][0].get('l') and stored['cg'], 'cell data persisted'
    cellsA = d.st("t.D.g['А'].items.find(i=>i.cl).cl.c.length")
    csA = d.st("t.D.g['А'].cs.length")
    reload_ls(s, pg.evaluate("localStorage.getItem('gtype-draw-n7')"))
    assert pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv'); pg.wait_for_timeout(300)
    assert d.st("t.D.g['А']&&t.D.g['А'].s") is True
    assert d.st("t.D.g['А'].items.find(i=>i.cl).cl.c.length") == cellsA and d.st("t.D.g['А'].cs.length") == csA
    d.goto('А'); d.tool('cells'); pg.wait_for_timeout(150)
    assert cl(d, "C.cellN(C.curCell())") > 0 and d.st("t.D.grid") == 'cell'
    d.click(*c(8, 0)); assert cl(d, "C.cellN(C.curCell())") > 0   # можно продолжить правку
    # связь «Сетки»: смена формы в одном знаке меняет и сохранённый другой
    pg.click('#dr-opt [data-act=cshow]'); pg.click('#dr-opt [data-act=cshow]')
    openpane(pg, 'cells')
    pc('#dr-cl [data-clk=grid]')
    pc('#dr-cl [data-cla=square]'); pc('#dr-cl [data-clb=square]'); pg.wait_for_timeout(400)
    pg.wait_for_function("!Object.keys(GT_DRAW._t.D.g).some(c=>GT_DRAW._t.D.g[c]._cst)", timeout=10000)
    assert d.st("t.D.g['Б'].items.find(i=>i.cl).cl.g.a") == 'square', 'link grids propagates'
    pc('#dr-cl [data-clk=none]')
    # сборка шрифта и TTF: у «А» и «Б» есть контуры
    pg.click('#dr-sv'); pg.wait_for_timeout(200)
    pg.click('#dr-fontb'); pg.fill('#dr-nm', 'Ячейки тест'); pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    assert pg.evaluate("IMP.glyphs['А']&&IMP.glyphs['А'].c.length>0&&IMP.glyphs['Б'].c.length>0")
    pg.evaluate("document.getElementById('view-draw').hidden=true;GT_DRAW.onHide()")
    pg.evaluate("iuRegisterNow()")
    name, data, path = s.download('ttf')
    f = TTFont(io.BytesIO(data)); cm = f.getBestCmap(); glyf = f['glyf']
    for ch in 'АБ':
        g = glyf[cm[ord(ch)]]; assert g.numberOfContours >= 1 and g.yMax > 400, (ch, g.numberOfContours, g.yMax)
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'cells {n1}->{n2}, nodes {chk["nodes"]}, shape change {sc[:2]}->{sq[:2]}->{hx[:2]}, persisted {cellsA} cells, ttf А/Б ok'


def shots(p):
    """снимки: глиф из двух слоёв (круглые стойки + квадратные акценты на подсетке) и панель со списком слоёв; светлая/тёмная, 1440 и 400 px
    (папка: CELLS_SHOTS_DIR, по умолчанию logs/qa_cells) — только с GT_SHOTS=1"""
    out = os.environ.get('CELLS_SHOTS_DIR', QA); os.makedirs(out, exist_ok=True)
    for vp, tag in (({'width': 1440, 'height': 900}, 'd'), ({'width': 400, 'height': 860}, 'm')):
        for th in ('light', 'dark'):
            s, d = setup(p, 'cells_' + tag + th, vp); pg = s.pg
            if th == 'dark': pg.evaluate("document.documentElement.setAttribute('data-theme','dark')")
            pg.evaluate("dwClose('draw')"); d.tool('cells')
            d.path([c(2, 9), c(2, 0)], steps=6); d.path([c(2, 9), c(5, 9), c(7, 8), c(7, 5), c(5, 4), c(2, 4)], steps=4)
            pg.evaluate("dwOpen('draw','cells')"); pg.wait_for_timeout(300)
            pg.click('#dr-cl [data-lact=add]')
            pg.evaluate("GT_DRAW._t.cl.cellSet({a:'square',b:'square',sub:1,sl:0,sa:'square',sb:'square',act:'sub'})")
            pg.evaluate("dwClose('draw')")
            d.path([c(0.6, 9.4), c(3.4, 9.4)], steps=4); d.path([c(8.4, 0.6), c(9.4, 0.6)], steps=2); d.path([c(8.4, 4.4), c(9.4, 4.4)], steps=2)
            pg.evaluate("GT_DRAW._t.cl.cellSet({act:'main'})")
            pg.evaluate("GT_DRAW._t.cl.cellFlush()")
            pg.click('#dr-cl [data-lact=add]') if False else None
            pg.evaluate("dwOpen('draw','cells')"); pg.wait_for_timeout(450)
            pg.evaluate("document.querySelector('#dr-cl [data-lact=ren]')&&0")
            _shot(pg, os.path.join(out, f'{tag}_{th}_layers.png'))
            if tag == 'm':
                pg.evaluate("dwClose('draw')"); pg.wait_for_timeout(350)
                _shot(pg, os.path.join(out, f'{tag}_{th}_canvas.png'))
            s.close()
    return 'shots ' + out


def phone(p):
    s, d = setup(p, 'cells_ph', {'width': 400, 'height': 860}); pg = s.pg
    d.tool('cells'); pg.wait_for_timeout(150)
    assert pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), 'no horizontal page scroll'
    d.path([c(2, 8), c(2, 2)], steps=3)
    pg.evaluate("dwOpen('draw','cells')"); pg.wait_for_timeout(400)
    pg.click('#dr-cl [data-lact=add]'); pg.click('#dr-cl [data-lact=add]'); pg.click('#dr-cl [data-lact=ren]'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.activeElement.id")=='dr-lyin', 'rename field focused'
    assert pg.evaluate("[...document.querySelectorAll('#dr-cl .dr-ly,#dr-cl .dr-lbar,#dr-cl .dr-ly-in')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})"), 'layers list fits 400 px'
    pg.keyboard.press('Escape')
    assert pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
    pg.evaluate("dwClose('draw')"); pg.wait_for_timeout(300)
    nav = pg.evaluate("(()=>{const o=document.querySelector('#dr-opt').getBoundingClientRect(),r=document.querySelector('#rail').getBoundingClientRect();return [o.bottom,r.top,r.height<r.width]})()")
    assert (not nav[2]) or nav[0] <= nav[1] + 1, ('dock above the bottom nav', nav)
    pg.evaluate("dwOpen('draw','cells')"); pg.wait_for_timeout(400)
    assert pg.evaluate("(()=>{const e=document.querySelector('#dr-cl');const r=e.getBoundingClientRect();return r.width>200&&r.right<=innerWidth+1})()"), 'panel fits'
    assert pg.evaluate("[...document.querySelectorAll('#dr-cl button,#dr-cl input')].every(e=>{const r=e.getBoundingClientRect();return !r.width||r.right<=innerWidth+1})")
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return 'phone 400 ok'


def lay(d):
    """слои активного знака: [(имя, скрыт, ячеек)]"""
    return d.st("t.cl.cellItems().map((i,k)=>[i.cl.n||'Слой '+(k+1),!!i.cl.h,t.cl.cellN(i)])")


def ev(pg, js, arg=None):
    return pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)


def layers(p):
    """слои ячеек: добавить / дублировать / переименовать / порядок / скрыть / удалить (с подтверждением), падежи, объединение в знаке и TTF,
    скрытые не попадают в шрифт, отмена, сохранение и обратная совместимость, телефон 400 px"""
    s, d = setup(p, 'cells_layers'); pg = s.pg
    pg.evaluate("dwClose('draw')"); d.tool('cells'); pg.wait_for_timeout(150)
    ob = lambda sel: (openpane(pg, 'cells') if not pg.evaluate("dwSec('draw')==='cells'") else None, pg.click(sel))
    # падежи «N ячеек · K слоёв»
    pl = cl(d, "[[0,1],[3,1],[10,2],[7,4],[0,5],[12,11],[1,21],[2,22],[3,25]].map(([n,k])=>C.clStatus(n,k))")
    assert pl == ['0 ячеек · 1 слой', '3 ячейки · 1 слой', '10 ячеек · 2 слоя', '7 ячеек · 4 слоя', '0 ячеек · 5 слоёв', '12 ячеек · 11 слоёв', '1 ячейка · 21 слой', '2 ячейки · 22 слоя', '3 ячейки · 25 слоёв'], pl
    # первая протяжка создаёт «Слой 1»
    assert lay(d) == []
    d.path([c(2, 8), c(2, 1)], steps=2)
    assert lay(d) == [['Слой 1', False, 8]], lay(d)
    openpane(pg, 'cells')
    txt = lambda: pg.evaluate("[...document.querySelectorAll('#dr-cl .dr-hint')].map(e=>e.textContent)")
    assert txt()[0] == '8 ячеек · 1 слой', txt()
    # второй слой: свои настройки, рисуем только в него
    ob('#dr-cl [data-lact=add]'); pg.wait_for_timeout(100)
    assert lay(d) == [['Слой 1', False, 8], ['Слой 2', False, 0]] and d.st("t.cur.al") == 1, lay(d)
    assert 'Скрытые слои не попадают в шрифт' in txt()
    ob('#dr-cl [data-cla=square]'); ob('#dr-cl [data-clb=square]')
    assert d.st("t.D.cs.a") == 'square' and cl(d, "C.cellItems()[0].cl.g.a") == 'circle' and cl(d, "C.cellItems()[1].cl.g.a") == 'square', 'own settings per layer'
    d.path([c(6, 8), c(6, 5)], steps=2)
    assert lay(d)[0][2] == 8 and lay(d)[1][2] == 4, lay(d)
    assert txt()[0] == '12 ячеек · 2 слоя', txt()
    # выбор слоя: панель берёт его настройки
    ob('#dr-cl [data-lsel="0"]'); pg.wait_for_timeout(100)
    assert d.st("t.cur.al") == 0 and d.st("t.D.cs.a") == 'circle'
    # сетка рисуется только у активного слоя; чернила неактивного не пропадают
    assert cl(d, "C.cellItems().every(i=>i.cs.length>=1)")
    # переименование: двойной щелчок, Enter; пустое имя не принимается; отмена возвращает имя
    openpane(pg, 'cells'); pg.dblclick('#dr-cl [data-lsel="1"]')
    pg.wait_for_selector('#dr-lyin'); pg.fill('#dr-lyin', '  Акценты  '); pg.keyboard.press('Enter'); pg.wait_for_timeout(80)
    assert lay(d)[1][0] == "Акценты" and d.st("t.cur.al") == 1, (lay(d), d.st("t.cur.al"))
    pg.click('#dr-undo'); pg.wait_for_timeout(80); assert lay(d)[1][0] == 'Слой 2', 'undo rename'
    pg.click('#dr-redo'); assert lay(d)[1][0] == 'Акценты'
    ob('#dr-cl [data-lact=ren]'); pg.fill('#dr-lyin', ''); pg.keyboard.press('Enter'); assert lay(d)[1][0] == 'Акценты', 'empty name ignored'
    ob('#dr-cl [data-lact=ren]'); pg.fill('#dr-lyin', 'x' * 40); pg.keyboard.press('Escape'); assert lay(d)[1][0] == 'Акценты', 'Esc cancels'
    # дублировать, порядок, отмена
    ob('#dr-cl [data-lact=dup]'); assert [l[0] for l in lay(d)] == ['Слой 1', 'Акценты', 'Акценты копия'] and d.st("t.cur.al") == 2
    assert lay(d)[2][2] == 4
    ob('#dr-cl [data-lact=up]'); assert [l[0] for l in lay(d)] == ['Слой 1', 'Акценты копия', 'Акценты'] and d.st("t.cur.al") == 1
    pg.click('#dr-undo'); pg.wait_for_timeout(60); assert [l[0] for l in lay(d)] == ['Слой 1', 'Акценты', 'Акценты копия'], 'undo reorder'
    pg.click('#dr-redo')
    # скрыть / показать (отмена тоже)
    ob('#dr-cl [data-lvis="1"]'); assert lay(d)[1][1] is True
    pg.click('#dr-undo'); assert lay(d)[1][1] is False; pg.click('#dr-redo'); assert lay(d)[1][1] is True
    # удаление с подтверждением (в странице, без confirm)
    ob('#dr-cl [data-lact=del]'); assert pg.is_visible('#dr-cl .dr-conf'), 'confirm row'
    ob('#dr-cl [data-lact=delno]'); assert len(lay(d)) == 3 and not pg.is_visible('#dr-cl .dr-conf')
    ob('#dr-cl [data-lact=del]'); ob('#dr-cl [data-lact=delok]'); assert [l[0] for l in lay(d)] == ['Слой 1', 'Акценты копия'] or len(lay(d)) == 2, lay(d)
    pg.click('#dr-undo'); assert len(lay(d)) == 3, 'undo delete'
    ob('#dr-cl [data-lact=del]'); ob('#dr-cl [data-lact=delok]')
    # Пять слоёв: падеж на странице
    for _ in range(3): ob('#dr-cl [data-lact=add]')
    assert len(lay(d)) == 5 and txt()[0].endswith('5 слоёв'), txt()
    for _ in range(3):
        ob('#dr-cl [data-lact=del]')       # пустые слои удаляются сразу
    assert len(lay(d)) == 2 and txt()[0].endswith('2 слоя'), (lay(d), txt())
    # теперь: «Слой 1» (колонка, кружки) и скрытый слой 2 (квадраты). Знак: чернила только видимых слоёв
    if not lay(d)[1][1]: ob('#dr-cl [data-lvis="1"]')
    assert lay(d)[1][1] is True and lay(d)[1][2] == 4, lay(d)
    ink = lambda: d.st("(()=>{const cs=t.evalGlyph();const b=impBBox(cs);return cs.length?[cs.length,Math.round(b.x0),Math.round(b.x1)]:null})()")
    one = ink(); assert one and one[0] == 1 and one[2] < 300, one          # только колонка слева
    ob('#dr-cl [data-lvis="1"]'); both = ink()
    assert both and both[0] == 2 and both[2] > 380, both               # колонка + квадраты: две формы
    assert pg.evaluate("document.querySelector('#dr-cl [data-lvis=\"1\"]').getAttribute('aria-pressed')") == 'true'
    # сохранение -> D.g[ch].cs = объединение; скрытие после сохранения исключает слой из знака
    d.save()
    assert d.st("t.D.g['А'].cs.length") == 2, 'union saved'
    d.goto('А'); d.tool('cells')
    ob('#dr-cl [data-lvis="1"]'); pg.evaluate("GT_DRAW.onHide();GT_DRAW.onShow()")
    assert d.st("t.D.g['А'].cs.length") == 1, 'hidden layer leaves the saved glyph'
    ob('#dr-cl [data-lvis="1"]')
    # Б: два слоя, один скрыт; В: два слоя видимы -> сборка шрифта и TTF
    for ch, hide in (('Б', True), ('В', False)):
        d.goto(ch); d.tool('cells')
        d.path([c(2, 8), c(2, 1)], steps=2)
        ob('#dr-cl [data-lact=add]'); d.path([c(7, 8), c(7, 5)], steps=2)
        if hide: ob('#dr-cl [data-lvis="1"]')
        d.save()
    assert d.st("t.D.g['Б'].cs.length") == 1 and d.st("t.D.g['В'].cs.length") == 2
    # сохранение, перезагрузка: имена, скрытость, число слоёв; старый формат загружается как «Слой 1»
    pg.evaluate("GT_DRAW.onHide();GT_DRAW.onShow()")
    st = pg.evaluate("JSON.parse(localStorage.getItem('gtype-draw-n7'))")
    ls = [i['l'] for i in st['g']['А']['i'] if 'l' in i]
    assert len(ls) == 2 and ls[1].get('n') in ('Акценты', 'Акценты копия') and ls[0].get('n') == 'Слой 1', ls
    hid = [i['l'].get('h') for i in st['g']['Б']['i'] if 'l' in i]; assert hid == [None, 1], hid
    old = {k: v for k, v in st.items()}
    for ch in old['g']:
        for i in old['g'][ch]['i']:
            if 'l' in i: i['l'].pop('n', None); i['l'].pop('h', None)
    old['cg'].pop('pl', None)
    old['g'] = {'Б': old['g']['Б']}
    old['g']['Б']['i'] = old['g']['Б']['i'][:1]
    reload_ls(s, json.dumps(old), force=True)
    assert pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv'); pg.wait_for_timeout(300)
    d.goto('Б'); d.tool('cells'); pg.wait_for_timeout(150)
    assert lay(d) == [['Слой 1', False, 8]], ('old single-layer data -> «Слой 1»', lay(d))
    assert d.st("t.D.g['Б'].cs.length") == 1
    # полное сохранение нового формата переживает перезагрузку
    d.path([c(7, 8), c(7, 4)], steps=2)
    ob('#dr-cl [data-lact=add]'); ob('#dr-cl [data-clb=square]'); ob('#dr-cl [data-cla=square]'); d.path([c(5, 3), c(8, 3)], steps=2)
    pg.click('#dr-fontb') if False else None
    pg.evaluate("GT_DRAW.onHide()")
    reload_ls(s, pg.evaluate("localStorage.getItem('gtype-draw-n7')"))
    assert pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv'); pg.wait_for_timeout(300)
    d.goto('Б'); d.tool('cells'); pg.wait_for_timeout(150)
    assert len(lay(d)) == 2 and cl(d, "C.cellItems()[1].cl.g.a") == 'square' and cl(d, "C.cellItems()[0].cl.g.a") == 'circle', lay(d)
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return 'layers ok'


def ttf_layers(p):
    """сборка шрифта: контуры = объединение видимых слоёв, скрытые не попадают в TTF"""
    s, d = setup(p, 'cells_ttf'); pg = s.pg
    pg.evaluate("dwClose('draw')"); d.tool('cells')
    for ch, hide in (('А', False), ('Б', True)):
        d.goto(ch); d.tool('cells')
        d.path([c(2, 8), c(2, 1)], steps=2)
        if pg.evaluate("dwSec('draw')!=='cells'"): openpane(pg, 'cells')
        pg.click('#dr-cl [data-lact=add]')
        pg.evaluate("GT_DRAW._t.cl.cellSet({a:'square',b:'square'})")
        d.path([c(7, 8), c(7, 5)], steps=2)
        if hide:
            if pg.evaluate("dwSec('draw')!=='cells'"): openpane(pg, 'cells')
            pg.click('#dr-cl [data-lvis="1"]')
        d.save()
    assert d.st("t.D.g['А'].cs.length") == 2 and d.st("t.D.g['Б'].cs.length") == 1
    pg.click('#dr-fontb'); pg.fill('#dr-nm', 'Слои тест'); pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    pg.evaluate("document.getElementById('view-draw').hidden=true;GT_DRAW.onHide()")
    pg.evaluate("iuRegisterNow()")
    name, data, path = s.download('ttf')
    f = TTFont(io.BytesIO(data)); cm = f.getBestCmap(); glyf = f['glyf']
    ga, gb = glyf[cm[ord('А')]], glyf[cm[ord('Б')]]
    assert ga.numberOfContours == 2, ga.numberOfContours                       # колонка + квадраты (объединение слоёв)
    assert gb.numberOfContours == 1, gb.numberOfContours                       # скрытый слой не в шрифте
    assert ga.xMax - ga.xMin > gb.xMax - gb.xMin + 100, (ga.xMax - ga.xMin, gb.xMax - gb.xMin)
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'ttf А {ga.numberOfContours} contours, Б {gb.numberOfContours}'


def mirror(p):
    """зеркало: для асимметричных форм (треугольник, пятиугольник) и поворотов результат = геометрическое зеркало прежних чернил;
    «=» открывает «Ячейки», «7» ведёт к знаку «7»"""
    s, d = setup(p, 'cells_mirror'); pg = s.pg
    pg.evaluate("dwClose('draw')"); d.tool('cells')
    # горячие клавиши
    d.tool('shape'); d.key('='); assert d.st("t.D.tool") == 'cells'
    d.tool('shape'); d.key('+'); assert d.st("t.D.tool") == 'cells'
    d.tool('shape'); d.key('7'); assert d.st("t.D.tool") == 'shape' and d.st("t.D.ch") == '7' and d.st("t.D.set") == 'num', 'key 7 goes to glyph 7'
    d.tool('cells')
    assert pg.evaluate("document.querySelector('#dr-tools [data-tool=cells]').dataset.tip").endswith('(=)')
    d.path([c(2, 8), c(2, 3)], steps=2); d.path([c(2, 8), c(6, 8), c(6, 6)], steps=2); d.click(*c(7, 2))
    res = []
    for shape in ('tri', 'pent', 'square'):
        for rot in (0, 17):
            for vert in (False, True):
                pg.evaluate("([a,r])=>GT_DRAW._t.cl.cellSet({a,b:a,t:0,rot:r,rnd:40})", [shape, rot]); pg.wait_for_timeout(50)
                pg.evaluate("GT_DRAW._t.cl.cellFlush()")
                old = pg.evaluate("JSON.parse(JSON.stringify(GT_DRAW._t.cl.curCell().cs))")
                pg.click('#dr-mir', modifiers=['Shift'] if vert else [])
                pg.evaluate("GT_DRAW._t.cl.cellFlush()")
                r = pg.evaluate("""([old,vert])=>{const t=GT_DRAW._t,it=t.cl.curCell(),W=700;const mo=drnAff(old,vert?(x=>x):(x=>W-x),vert?(y=>W-y):(y=>y));
                  let a=0,x=0;for(let X=2;X<700;X+=4)for(let Y=2;Y<700;Y+=4){const p=drnHit(mo,X,Y),q=drnHit(it.cs,X,Y);if(p||q)a++;if(p!==q)x++;}
                  return [x,a,it.cl.g.rot]}""", [old, vert])
                res.append((shape, rot, vert, r))
                assert shape != 'tri' or rot != 0 or not vert or r[2] == 180, r
                assert r[0] <= max(6, r[1] * 0.006), ('mirror xor', shape, rot, vert, r)
                pg.click('#dr-mir', modifiers=['Shift'] if vert else [])   # вернуть
    # поворот после двух зеркал вернулся
    assert d.st("t.D.cs.rot") == 17
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return 'mirror xor max ' + str(max(r[3][0] for r in res)) + '/' + str(min(r[3][1] for r in res))


if __name__ == '__main__':
    sys.exit(check_all([('cells', full), ('cells-phone', phone), ('cells-layers', layers), ('cells-ttf', ttf_layers), ('cells-mirror', mirror)] + ([('cells-shots', shots)] if SHOTS else [])))
