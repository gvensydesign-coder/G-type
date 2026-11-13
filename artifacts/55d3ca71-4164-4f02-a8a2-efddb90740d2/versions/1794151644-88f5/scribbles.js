// «Почеркушки»: полотно, где Michael рисует от руки линии, каракули, мазки и знаки по классам,
// а рядом окно-превью сразу показывает, как это будет жить в стиле (кипение, повтор, свечение).
// Рисунки хранятся в базе окна (scribbles/<класс>) и в браузере — дальше стиль берёт их вместо процедурных.

export const SCRIB_CLASSES = [
  { k: 'light', name: 'Линии света', color: '#f4eec0',
    hint: 'Дуги и пучки из 2–5 кривых, как обводка света у края лампы или проёма. Рисуй одну дугу-пучок на образец, примерно четверть круга.',
    slots: 6 },
  { k: 'outline', name: 'Контур', color: '#2a1810',
    hint: 'Обводку с нажимом: начало тонкое, середина толще, бывают разрывы и перелёт за край. Можно 2–3 линии рядом, как поиск формы.',
    slots: 6 },
  { k: 'hatch', name: 'Штрих и каракули в тени', color: '#3a2a3c',
    hint: 'Заполни квадрат так, как закрашиваешь тень: зигзаги маркером, штриховка, петли. Превью повторит образец по тени шара.',
    slots: 6 },
  { k: 'brush', name: 'Мазки кисти', color: '#b0623a',
    hint: 'Отдельные короткие мазки: запятые, лопатки, сухая кисть. Один-три мазка на образец, крупно.',
    slots: 8 },
  { k: 'eyes', name: 'Глаза богатыря', color: '#f2ecd2',
    hint: 'Один глаз крупно в каждом поле. Прорезь, контур зрачка, веко. Превью ставит его зеркально на маску лица и моргает.',
    slots: [['open', 'Открыт'], ['blink', 'Моргание (закрыт)'], ['angry', 'Гнев'], ['hurt', 'Боль'], ['calm', 'Спокоен']] },
  { k: 'marks', name: 'Знаки эмоций', color: '#c8382a',
    hint: 'Знак целиком в каждом поле. Нарисуй 2–3 похожих варианта подряд (поля «вар. 2», «вар. 3») — они будут сменяться 6 раз в секунду.',
    slots: [['anger', 'Гнев'], ['anger2', 'Гнев, вар. 2'], ['exclaim', '«!»'], ['question', '«?»'], ['sweat', 'Пот'], ['shock', 'Шок'], ['sparkle', 'Искры'], ['swirl', 'Растерян'], ['spark', 'Ярость'], ['sleep', 'Сон']] },
  { k: 'glow', name: 'Свечение', color: '#6dff96',
    hint: 'Лучи, штрихи ореола, искры вокруг светящейся точки (центр поля = центр света).',
    slots: 6 },
  { k: 'fx', name: 'Брызги, искры, пыль', color: '#ffb35a',
    hint: 'Мелочь: точки, запятые, капли, искры. Каждый образец — одна частица крупно.',
    slots: 8 },
  { k: 'fire', name: 'Огонь: языки и линии', color: '#ff8a2a',
    hint: 'Линии внутри языка пламени: 2–3 изогнутые линии снизу вверх с крючком на кончике. Поле = один язык (низ поля = основание огня).',
    slots: 6 },
  { k: 'water', name: 'Вода: рябь и волны', color: '#9ad8e8',
    hint: 'Короткие знаки ряби: дуги, «чайки», двойные волны, вытянутые по горизонтали. Течение пойдёт слева направо.',
    slots: 6 },
  { k: 'splash', name: 'Брызги и капли', color: '#e8f8ff',
    hint: 'Одна капля, корона брызг или россыпь из 2–3 капель на поле. Низ поля — вода.',
    slots: 6 },
  { k: 'smoke', name: 'Дым, пар, жар', color: '#b8a8a0',
    hint: 'Завитки и волнистые линии: дым над огнём, пар, жар. Один завиток на поле.',
    slots: 6 },
  { k: 'aura', name: 'Линии ауры', color: '#ffd35a',
    hint: 'Высокие языки ауры снизу вверх: 1–3 линии рядом, с утолщением внизу и острым кончиком.',
    slots: 6 },
  { k: 'runes', name: 'Знаки круга ауры', color: '#6dff96',
    hint: 'Знак или руна крупно в каждом поле. 8 знаков встанут по кругу под ногами персонажа.',
    slots: [['r1', 'Знак 1'], ['r2', 'Знак 2'], ['r3', 'Знак 3'], ['r4', 'Знак 4'], ['r5', 'Знак 5'], ['r6', 'Знак 6'], ['r7', 'Знак 7'], ['r8', 'Знак 8']] },
  { k: 'env', name: 'Наброски окружения', color: '#2a1810',
    hint: 'Свободные длинные линии поиска формы с перелётом за край: как над проёмом на кадре из тоннеля. Рисуй во всю ширину поля.',
    slots: 6 },
];

const H = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export class ScribblePad {
  constructor({ onExit } = {}) {
    this.onExit = onExit; this.active = false;
    this.cls = SCRIB_CLASSES[0].k; this.slot = null; this.size = 5; this.erase = false;
    this.data = {};                 // cls -> { slots: { key: { s: [[x,y,p,...], ...] } } }
    this.saving = Promise.resolve(); this.timer = null;
    this._ui();
    this.db = null;
    (async () => { try { this.db = window.claude?.use ? await window.claude.use('db') : null; } catch { this.db = null; } this._status(); })();
  }
  _slots(c = this.cls) {
    const C = SCRIB_CLASSES.find((x) => x.k === c);
    return Array.isArray(C.slots) ? C.slots : Array.from({ length: C.slots }, (_, i) => [String(i + 1), 'Образец ' + (i + 1)]);
  }
  _ui() {
    const el = document.createElement('div'); el.id = 'scribUi'; el.hidden = true;
    el.innerHTML = `
      <div class="sc-head"><h2>Почеркушки</h2><span class="muted">Рисуй от руки: мышью, пером или пальцем. Всё сохраняется само.</span><button id="scExit">Готово, вернуться</button></div>
      <div class="sc-body">
        <nav id="scCls"></nav>
        <section class="sc-draw">
          <div id="scHint"></div>
          <div class="row" id="scSlots"></div>
          <div class="sc-wrap"><canvas id="scCanvas" width="1024" height="1024"></canvas></div>
          <div class="row sc-tools">
            <div class="sl"><span>Толщина</span><input id="scSize" type="range" min="1" max="24" step="0.5" value="5"><output id="scSizeO">5</output></div>
            <button id="scErase">Ластик</button><button id="scUndo">Отменить</button><button id="scClear">Очистить поле</button>
          </div>
          <p id="scStat" class="muted"></p>
        </section>
        <section class="sc-prev">
          <h2>Как это будет в стиле</h2>
          <canvas id="scPrev" width="720" height="720"></canvas>
          <p id="scPrevCap" class="muted"></p>
        </section>
      </div>`;
    document.body.appendChild(el); this.el = el;
    const $ = (s) => el.querySelector(s); this.$ = $;
    for (const C of SCRIB_CLASSES) {
      const b = document.createElement('button'); b.dataset.k = C.k;
      b.innerHTML = `<span class="sw" style="background:${C.color}"></span>${C.name}<span class="cnt" data-c="${C.k}"></span>`;
      b.onclick = () => this.pick(C.k); $('#scCls').appendChild(b);
    }
    $('#scExit').onclick = () => this.close();
    $('#scSize').oninput = (e) => { this.size = +e.target.value; $('#scSizeO').value = e.target.value; };
    $('#scErase').onclick = () => { this.erase = !this.erase; $('#scErase').classList.toggle('on', this.erase); };
    $('#scUndo').onclick = () => { const s = this._cur(); if (s.s.length) { s.s.pop(); this._changed(); } };
    $('#scClear').onclick = () => { const s = this._cur(); s.s = []; this._changed(); };
    const cv = $('#scCanvas'); this.cv = cv; this.ctx = cv.getContext('2d');
    this.pv = $('#scPrev'); this.pctx = this.pv.getContext('2d');
    cv.addEventListener('pointerdown', (e) => this._down(e));
    cv.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', () => this._up());
    cv.style.touchAction = 'none';
    window.addEventListener('keydown', (e) => { if (this.active && (e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); $('#scUndo').click(); } });
  }
  _status(msg) {
    const base = this.db ? 'Сохраняется в окно, я увижу рисунки сам.' : 'База окна недоступна: рисунки только в этом браузере.';
    if (this.$) this.$('#scStat').textContent = (msg ? msg + '. ' : '') + base;
  }
  async start() {
    this.active = true; this.el.hidden = false;
    await this._loadAll();
    this.pick(this.cls);
    const loop = () => { if (!this.active) return; this._preview(); this._raf = requestAnimationFrame(loop); };
    loop();
  }
  async close() {
    clearTimeout(this.timer); await this._flush();
    this.active = false; this.el.hidden = true; cancelAnimationFrame(this._raf);
    this.onExit?.();
  }
  pick(k) {
    this.cls = k; const C = SCRIB_CLASSES.find((x) => x.k === k);
    this.el.querySelectorAll('#scCls button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
    this.$('#scHint').innerHTML = `<b>${C.name}.</b> ${C.hint}`;
    const box = this.$('#scSlots'); box.innerHTML = '';
    const slots = this._slots();
    if (!slots.some(([key]) => key === this.slot)) this.slot = slots[0][0];
    for (const [key, label] of slots) {
      const b = document.createElement('button'); b.dataset.k = key; b.textContent = label;
      b.onclick = () => { this.slot = key; this.pick(this.cls); }; box.appendChild(b);
      if (this._get(k, key).s.length) b.classList.add('has');
    }
    box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === this.slot));
    this._counts(); this._draw();
  }
  _get(c, key) {
    const d = (this.data[c] ??= { slots: {} });
    return (d.slots[key] ??= { s: [] });
  }
  _cur() { return this._get(this.cls, this.slot); }
  _counts() {
    this.el.querySelectorAll('[data-c]').forEach((s) => {
      const d = this.data[s.dataset.c]; const n = d ? Object.values(d.slots).filter((x) => x.s.length).length : 0;
      s.textContent = n ? ` · ${n}` : '';
    });
  }

  // ------------------------------------------------------------ рисование
  _pt(e) {
    const r = this.cv.getBoundingClientRect();
    let p = e.pressure; if (e.pointerType === 'mouse' || !p) p = 0.6;
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, p];
  }
  _down(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.cv.setPointerCapture?.(e.pointerId);
    const p = this._pt(e);
    if (this.erase) { this.erasing = true; this._eraseAt(p); return; }
    this.cur = { w: this.size / 1024, p: [p] }; this.lastT = performance.now();
  }
  _move(e) {
    if (this.erasing) { this._eraseAt(this._pt(e)); return; }
    if (!this.cur) return;
    const p = this._pt(e); const l = this.cur.p[this.cur.p.length - 1];
    const d = Math.hypot(p[0] - l[0], p[1] - l[1]); if (d < 0.002) return;
    // мышь: нажим из скорости (быстро = тоньше), как у кисти
    if (e.pointerType === 'mouse') { const dt = Math.max(1, performance.now() - this.lastT); p[2] = Math.max(0.25, Math.min(1, 1.1 - (d / dt) * 60)); p[2] = l[2] * 0.6 + p[2] * 0.4; }
    this.lastT = performance.now();
    this.cur.p.push(p); this._draw();
  }
  _up() {
    if (this.erasing) { this.erasing = false; this._changed(); return; }
    if (!this.cur) return;
    if (this.cur.p.length > 1) { const s = this._cur(); s.s.push(this._pack(this.cur)); this._changed(); }
    this.cur = null; this._draw();
  }
  _eraseAt(p) {
    const s = this._cur(); const r = 0.02; const before = s.s.length;
    s.s = s.s.filter((st) => { for (let i = 1; i < st.length; i += 3) if (Math.hypot(st[i] - p[0], st[i + 1] - p[1]) < r) return false; return true; });
    if (s.s.length !== before) this._draw();
  }
  _pack(st) { const out = [Math.round(st.w * 1e4) / 1e4]; for (const q of st.p) out.push(Math.round(q[0] * 1e3) / 1e3, Math.round(q[1] * 1e3) / 1e3, Math.round(q[2] * 100) / 100); return out; }
  _unpack(a) { const p = []; for (let i = 1; i < a.length; i += 3) p.push([a[i], a[i + 1], a[i + 2]]); return { w: a[0], p }; }
  _changed() {
    this._draw(); this._counts(); this.pick(this.cls); this._status('Есть изменения');
    clearTimeout(this.timer); this.timer = setTimeout(() => this._flush(), 1200);
    this.dirty = (this.dirty ?? new Set()); this.dirty.add(this.cls);
  }
  // штрих как кисть: ширина по нажиму, кончики сужаются; j — дрожь «кипения»
  _stroke(ctx, st, S, ox = 0, oy = 0, color = '#1a110c', j = 0, seed = 0, rot = 0, cx = 0.5, cy = 0.5) {
    const n = st.p.length; if (n < 2) return;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = st.p.map((q, i) => {
      let x = q[0] - cx, y = q[1] - cy; const X = x * cs - y * sn, Y = x * sn + y * cs;
      // кипение плавное вдоль линии: общий сдвиг + медленная волна (не зубцы)
      const jx = j ? (H(seed) - 0.5) * j + Math.sin(i * 0.23 + seed * 1.7) * j * 0.35 : 0;
      const jy = j ? (H(seed + 9) - 0.5) * j + Math.sin(i * 0.19 + seed * 2.3 + 1) * j * 0.35 : 0;
      return [ox + (X + jx) * S, oy + (Y + jy) * S, q[2]];
    });
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      const t = i / (n - 1); const taper = Math.min(1, Math.min(t, 1 - t) * 6 + 0.25);
      ctx.lineWidth = Math.max(0.6, st.w * S * (0.35 + 0.9 * P[i][2]) * taper);
      ctx.beginPath(); ctx.moveTo(P[i - 1][0], P[i - 1][1]); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke();
    }
  }
  _strokes(c, key) { return (this.data[c]?.slots[key]?.s ?? []).map((a) => this._unpack(a)); }
  _draw() {
    const ctx = this.ctx, W = this.cv.width;
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(0, 0, W, W);
    // бумага + сетка-помощник
    ctx.strokeStyle = 'rgba(80,60,40,.12)'; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * W / 4, 0); ctx.lineTo(i * W / 4, W); ctx.moveTo(0, i * W / 4); ctx.lineTo(W, i * W / 4); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(200,56,42,.25)'; ctx.beginPath(); ctx.arc(W / 2, W / 2, 10, 0, Math.PI * 2); ctx.stroke();
    if (this.cls === 'eyes') { ctx.strokeStyle = 'rgba(80,60,40,.25)'; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.ellipse(W / 2, W / 2, W * 0.36, W * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    for (const st of this._strokes(this.cls, this.slot)) this._stroke(ctx, st, W, W / 2, W / 2);
    if (this.cur) this._stroke(ctx, this.cur, W, W / 2, W / 2, '#5a2a1a');
  }

  // ------------------------------------------------------------ превью
  _all(c) { const d = this.data[c]; if (!d) return []; return Object.entries(d.slots).filter(([, v]) => v.s.length).map(([k, v]) => ({ k, s: v.s.map((a) => this._unpack(a)) })); }
  _preview() {
    const ctx = this.pctx, W = this.pv.width; const t = performance.now() / 1000; const step = Math.floor(t * 8);
    const all = this._all(this.cls); const cap = this.$('#scPrevCap');
    ctx.fillStyle = '#1c1512'; ctx.fillRect(0, 0, W, W);
    const ink = '#1a110c';
    const sample = (i) => all.length ? all[((i % all.length) + all.length) % all.length] : null;
    const boil = 0.012;
    if (!all.length) { ctx.fillStyle = '#a99b80'; ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Нарисуй образец слева', W / 2, W / 2); cap.textContent = ''; return; }
    if (this.cls === 'light') {
      const g = ctx.createRadialGradient(W / 2, W / 2, 10, W / 2, W / 2, W * 0.32); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#f4eec0'); g.addColorStop(1, 'rgba(244,238,192,0)');
      ctx.fillStyle = '#3a2418'; ctx.fillRect(0, 0, W, W); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * 0.32, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 8; k++) { const sm = sample(k); for (const st of sm.s) this._stroke(ctx, st, W * 0.5, W / 2 + Math.cos(k * 0.785) * W * 0.3, W / 2 + Math.sin(k * 0.785) * W * 0.3, '#f4eec0', boil, step * 7 + k, k * 0.785 + Math.PI / 2); }
      cap.textContent = 'Пучки повторяются по кругу у края света и дрожат 8 раз в секунду.';
    } else if (this.cls === 'outline') {
      ctx.fillStyle = '#c9a77a'; ctx.beginPath(); ctx.ellipse(W / 2, W / 2, W * 0.28, W * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      const sm = sample(step >> 3); for (const st of sm.s) this._stroke(ctx, st, W * 0.9, W / 2, W / 2, ink, boil, step);
      cap.textContent = 'Обводка поверх формы, кипит (каждый кадр чуть сдвигается), образцы сменяются.';
    } else if (this.cls === 'hatch') {
      const R = W * 0.36; ctx.fillStyle = '#d8b88a'; ctx.beginPath(); ctx.arc(W / 2, W / 2, R, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(W / 2, W / 2, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#8a6a58'; ctx.beginPath(); ctx.arc(W / 2 - R * 0.35, W / 2 - R * 0.35, R * 1.05, 0, Math.PI * 2); ctx.rect(W, 0, -W, W); ctx.fill('evenodd');
      ctx.beginPath(); ctx.arc(W / 2 - R * 0.35, W / 2 - R * 0.35, R * 1.05, 0, Math.PI * 2); ctx.rect(W, 0, -W, W); ctx.clip('evenodd');
      let i = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const sm = sample(i++); for (const st of sm.s) this._stroke(ctx, st, W * 0.3, W * (0.12 + x * 0.25), W * (0.12 + y * 0.25), '#3a2a3c', boil, step + i); }
      ctx.restore();
      cap.textContent = 'Образцы повторяются плиткой внутри тени шара.';
    } else if (this.cls === 'brush') {
      const pal = ['#b0623a', '#7a3c26', '#d8945a', '#5a3020', '#e8c08a'];
      for (let i = 0; i < 26; i++) { const sm = sample(i); const x = H(i * 3.1) * W, y = H(i * 7.7) * W; for (const st of sm.s) this._stroke(ctx, st, W * (0.22 + H(i) * 0.15), x, y, pal[i % pal.length], boil * 0.5, step + i, H(i * 5.3) * 6.28); }
      cap.textContent = 'Мазки ложатся вразброс, с поворотом и разными цветами.';
    } else if (this.cls === 'eyes') {
      ctx.fillStyle = '#5a4034'; ctx.beginPath(); ctx.ellipse(W / 2, W / 2 + 60, W * 0.38, W * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1c16'; ctx.fillRect(W * 0.1, W * 0.3, W * 0.8, W * 0.14);
      const blinkNow = (t % 3.2) < 0.16;
      const want = blinkNow ? 'blink' : (['angry', 'hurt', 'calm'][Math.floor(t / 4) % 3]);
      const pickK = (k) => all.find((a) => a.k === k) ?? all.find((a) => a.k === 'open') ?? all[0];
      const sm = pickK(want);
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(W / 2 + sgn * W * 0.18, W * 0.47); ctx.scale(sgn, 1);
        for (const st of sm.s) this._stroke(ctx, st, W * 0.3, 0, 0, '#f2ecd2', boil * 0.4, step);
        ctx.restore();
      }
      cap.textContent = `Глаз ставится зеркально на маску; сейчас: «${(this._slots().find((s) => s[0] === sm.k) ?? [0, sm.k])[1]}». Моргание раз в 3 с.`;
    } else if (this.cls === 'marks') {
      ctx.fillStyle = '#5a4034'; ctx.beginPath(); ctx.arc(W * 0.42, W * 0.62, W * 0.22, 0, Math.PI * 2); ctx.fill();
      const groups = {}; for (const a of all) { const base = a.k.replace(/\d+$/, ''); (groups[base] ??= []).push(a); }
      const keys = Object.keys(groups); const g = groups[keys[Math.floor(t / 2.2) % keys.length]];
      const sm = g[Math.floor(t * 6) % g.length]; const pop = 1 + Math.max(0, 0.25 - (t % 2.2)) * 1.5;
      for (const st of sm.s) this._stroke(ctx, st, W * 0.42 * pop, W * 0.7, W * 0.3, '#c8382a', boil * 0.6, Math.floor(t * 6));
      cap.textContent = 'Знак у головы, 6 кадров в секунду, варианты одного знака сменяют друг друга.';
    } else if (this.cls === 'glow') {
      const g = ctx.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W * 0.16); g.addColorStop(0, '#f0fff0'); g.addColorStop(0.4, '#6dff96'); g.addColorStop(1, 'rgba(109,255,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * 0.16, 0, Math.PI * 2); ctx.fill();
      const sm = sample(step >> 2); const rot = (step % 4) * 0.4;
      for (const st of sm.s) this._stroke(ctx, st, W * 0.8, W / 2, W / 2, '#6dff96', boil, step, rot);
      cap.textContent = 'Лучи вокруг светящейся точки мерцают шагами и чуть поворачиваются.';
    } else if (this.cls === 'fx') {
      for (let i = 0; i < 40; i++) { const sm = sample(i); const life = ((t * 0.4 + H(i)) % 1); const x = H(i * 2.3) * W, y = (H(i * 4.1) * W + life * W * 0.6) % W; ctx.globalAlpha = 1 - life; for (const st of sm.s) this._stroke(ctx, st, W * 0.12, x, y, '#ffb35a', boil, step + i, H(i * 9) * 6.28); }
      ctx.globalAlpha = 1;
      cap.textContent = 'Частицы падают и гаснут; каждая — один из твоих образцов.';
    } else if (this.cls === 'fire') {
      const fl = (k, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(W * .5, W * (.12 + .04 * Math.sin(step))); ctx.quadraticCurveTo(W * (.78 + k), W * .6, W * .5, W * .9); ctx.quadraticCurveTo(W * (.22 - k), W * .6, W * .5, W * (.12 + .04 * Math.sin(step))); ctx.fill(); };
      fl(.04, '#d8401c'); fl(-.06, '#ff8a2a'); fl(-.14, '#ffd25a');
      const sm = sample(step >> 1); for (const st of sm.s) this._stroke(ctx, st, W * .75, W / 2, W * .52, '#3a0c06', boil, step);
      const s2 = sample((step >> 1) + 1); for (const st of s2.s) this._stroke(ctx, st, W * .5, W * .52, W * .6, '#fff6d0', boil, step + 3);
      cap.textContent = 'Тёмные и светлые линии ложатся поверх языков и сменяются 6 раз в секунду.';
    } else if (this.cls === 'water') {
      ctx.fillStyle = '#1c3458'; ctx.fillRect(0, W * .25, W, W * .5); ctx.fillStyle = '#2f5c86'; ctx.fillRect(0, W * .35, W, W * .3);
      for (let i = 0; i < 14; i++) { const sm = sample(i); const x = ((H(i * 2.3) + t * .08) % 1) * W * 1.2 - W * .1, y = W * (.3 + H(i * 4.1) * .4); for (const st of sm.s) this._stroke(ctx, st, W * .16, x, y, i % 3 ? '#9ad8e8' : '#050a18', boil, (step >> 2) + i); }
      cap.textContent = 'Рябь плывёт по течению шагами, светлая и тёмная.';
    } else if (this.cls === 'splash') {
      ctx.fillStyle = '#1c3458'; ctx.fillRect(0, W * .75, W, W * .25);
      for (let i = 0; i < 12; i++) { const sm = sample(i); const life = ((t * .8 + H(i)) % 1); const vx = (H(i * 3) - .5) * .5, vy = .9 + H(i * 5) * .4; const x = W * (.5 + vx * life), y = W * (.78 - vy * life + 1.2 * life * life); for (const st of sm.s) this._stroke(ctx, st, W * .12, x, y, '#e8f8ff', boil, step + i); }
      cap.textContent = 'Брызги летят дугами от воды и падают обратно.';
    } else if (this.cls === 'smoke') {
      ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(W * .5, W * .7); ctx.lineTo(W * .58, W * .95); ctx.lineTo(W * .42, W * .95); ctx.fill();
      for (let i = 0; i < 5; i++) { const sm = sample(i); const life = ((t * .25 + i / 5) % 1); for (const st of sm.s) this._stroke(ctx, st, W * (.2 + life * .15), W * (.5 + (H(i) - .5) * .2), W * (.7 - life * .6), '#b8a8a0', boil, (step >> 1) + i); }
      cap.textContent = 'Завитки поднимаются над огнём и растут.';
    } else if (this.cls === 'aura') {
      ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.ellipse(W / 2, W * .58, W * .14, W * .3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(W / 2, W * .24, W * .07, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 9; i++) { const sm = sample(i + step); const life = ((t * .5 + i / 9) % 1); const a = i / 9 * 6.28; for (const st of sm.s) this._stroke(ctx, st, W * .22, W * (.5 + Math.cos(a) * .24), W * (.9 - life * .7), i % 3 ? '#ffd35a' : '#fffbe6', boil, step + i); }
      cap.textContent = 'Языки ауры взлетают вокруг силуэта и сменяются шагами.';
    } else if (this.cls === 'runes') {
      ctx.strokeStyle = '#6dff96'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * .45, 0, 6.28); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, W / 2, W * .39, 0, 6.28); ctx.stroke();
      const rot = (step >> 1) * .05;
      for (let i = 0; i < 8; i++) { const sm = sample(i); const a = i / 8 * 6.28 + rot; for (const st of sm.s) this._stroke(ctx, st, W * .14, W / 2 + Math.cos(a) * W * .29, W / 2 + Math.sin(a) * W * .29, '#6dff96', boil * .4, step, a + Math.PI / 2); }
      cap.textContent = '8 знаков встают по кругу под ногами, круг медленно поворачивается.';
    } else if (this.cls === 'env') {
      ctx.fillStyle = '#6a6470'; ctx.beginPath(); ctx.moveTo(W * .1, W * .85); ctx.lineTo(W * .3, W * .4); ctx.lineTo(W * .55, W * .3); ctx.lineTo(W * .85, W * .5); ctx.lineTo(W * .92, W * .85); ctx.fill();
      for (let i = 0; i < 3; i++) { const sm = sample(i + (step >> 3)); for (const st of sm.s) this._stroke(ctx, st, W * .8, W / 2, W * (.33 + i * .12), '#1c1410', boil, step + i, (i - 1) * .12); }
      cap.textContent = 'Линии поиска формы лежат поверх скал и горизонта, дрожат 4 раза в секунду.';
    }
  }

  // ------------------------------------------------------------ хранение
  async _flush() {
    const dirty = [...(this.dirty ?? [])]; this.dirty = new Set();
    for (const c of dirty) {
      const d = { cls: c, savedAt: new Date().toISOString(), slots: Object.fromEntries(Object.entries(this.data[c]?.slots ?? {}).filter(([, v]) => v.s.length)) };
      try { localStorage.setItem('pfScrib_' + c, JSON.stringify(d)); } catch { /* приватный режим */ }
      if (this.db) {
        this.saving = this.saving.then(() => this.db.doc('scribbles/' + c).set(d)).then(() => this._status('Сохранено'), (e) => this._status('Не сохранилось в окно (' + (e?.code || 'ошибка') + '), осталось в браузере'));
        await this.saving;
      } else this._status('Сохранено в браузере');
    }
  }
  async _loadAll() {
    if (this.loaded) return; this.loaded = true;
    for (const C of SCRIB_CLASSES) {
      let d = null;
      if (this.db) { try { const s = await Promise.race([this.db.doc('scribbles/' + C.k).get(), new Promise((r) => setTimeout(() => r(null), 8000))]); if (s?.exists) d = s.data(); } catch { d = null; } }
      if (!d) { try { const s = localStorage.getItem('pfScrib_' + C.k); if (s) d = JSON.parse(s); } catch { d = null; } }
      if (d?.slots) this.data[C.k] = { slots: d.slots };
    }
  }
}
