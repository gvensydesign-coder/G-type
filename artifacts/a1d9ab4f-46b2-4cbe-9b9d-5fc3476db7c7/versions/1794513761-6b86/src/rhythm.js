// «Ритм боя»: точное парирование, точный уклон с контрударом, окно оглушения и «открытые» моменты Лешего,
// буфер ввода и боевые подсказки. Все числа здесь; main.js только вызывает эти правила в нужных местах.
// Для переноса в Godot: RH -> Tuning.RH (tuning.gd), RhythmHud -> combat_hud.gd (см. README «Перенос»).

export const RH = {
  buffer: 0.22,          // нажатие запоминается на 0,22 с и срабатывает, как только действие станет доступно
  // --- парирование: нажатие ПКМ открывает окно; удар когтями в окне = «Точно!»
  parryWin: 0.2,         // окно точного парирования после нажатия
  parrySpam: 0.07,       // окно, если жать чаще чем раз в parrySpamGap (без «долбления» кнопки)
  parrySpamGap: 0.45,
  parryRefund: 12,       // точное парирование возвращает выносливость
  parryStun: 2.6,        // оглушение после точного парирования (обычное от стойкости: T.staggerDur)
  deflectPoise: 34,      // стойка парирования (удержание ПКМ) больше не оглушает сразу: «Отбив» сбивает стойкость
  earlyBand: 0.35,       // нажал щит раньше окна не более чем на это: подсказка «Рано»
  lateBand: 0.2,         // нажал щит после удара не позже чем через это: подсказка «Поздно»
  // --- уклонение (Q) и перекат (C)
  dodgeIF: [0.01, 0.34], // кадры неуязвимости уклона, с
  rollIF: [0.06, 0.55],  // кадры неуязвимости переката, с
  perfect: 0.2,          // удар пришёлся в первые 0,2 с уклона = «Точный уклон»
  perfectSlow: [0.3, 0.45], // замедление: масштаб времени, длительность (реальные секунды)
  counterWin: 1.1,       // после точного уклона ЛКМ = контрудар
  counter: { dmg: 26, poise: 40, lunge: 1.3 },
  dodgeCancel: 0.3,      // вторая половина уклона сразу переходит в удар
  hurtCancel: 0.42,      // из оглушения от удара можно уйти уклоном / перекатом после 0,42 с
  recoilShield: 0.12,    // после принятого на щит удара щит снова парирует через 0,12 с (серии Лешего)
  // --- окна Лешего
  stunDmg: 1.3,          // урон по оглушённому
  openDmg: 1.2,          // урон по «открытому» (промах супера, восстановление после удара)
  openPoise: 1.5,
  poiseMax: 75,
  // --- подсказки: время контакта удара (время приёма Лешего, с) для колец тайминга и блика
  hitAt: { claw: 1.24, backhand: 1.12, grab: 1.0, leap: 2.0 },
  glintLead: 0.42,       // блик на когтях за 0,42 с до удара (всегда)
  ringLead: 0.75,        // кольцо тайминга появляется за 0,75 с (режим обучения)
  // --- «открыт»: с какого времени приёма Леший уязвим (до конца приёма)
  openFrom: { claw: 1.55, backhand: 1.3, throw: 2.45, volley: 2.45, leap: 2.15, roots: 1.65, grab: 1.45 },
};

const $ = (id) => document.getElementById(id);

// HUD: метка над Лешим, всплывающие оценки у героя, полосы оглушения и стойкости, панель полигона
export class RhythmHud {
  constructor() {
    this.tele = $('tele'); this.teleKey = $('tele-key'); this.teleTxt = $('tele-txt'); this.ring = $('tele-ring');
    this.fb = $('fb'); this.fbT = 0;
    this.stun = $('stun'); this.stunFill = $('stun-fill'); this.stunTxt = $('stun-txt');
    this.poise = $('poise-fill'); this.poiseBar = $('poise');
    this.open = $('open-tag');
    this.counter = $('counter-prompt');
    this.panel = $('train');
    this.stats = { parry: 0, early: 0, late: 0, deflect: 0, dodge: 0, counter: 0, open: 0, taken: 0 };
  }
  feedback(text, kind = 'good', t = 0.9) {
    this.fb.textContent = text;
    this.fb.className = 'show ' + kind;
    this.fbT = t;
  }
  place(el, v) {
    if (v.z > 1) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = '';
    el.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
    el.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
  }
  // kind: '' | 'block' | 'dodge' | 'run'; ring: 0..1 (1 = только появилось, 0 = жми сейчас) или null
  telegraph(kind, ring, now) {
    this.tele.className = kind ? 'show ' + kind + (now ? ' now' : '') : '';
    if (!kind) return;
    this.teleKey.textContent = kind === 'block' ? 'ПКМ' : kind === 'dodge' ? 'Q' : '⟷';
    this.teleTxt.textContent = kind === 'block' ? 'щит' : kind === 'dodge' ? 'уклон' : 'с линии';
    if (ring == null) this.ring.style.opacity = 0;
    else { this.ring.style.opacity = 1; this.ring.style.transform = `translate(-50%,-50%) scale(${1 + ring * 1.6})`; }
  }
  update(dt) {
    if (this.fbT > 0) { this.fbT -= dt; if (this.fbT <= 0) this.fb.className = ''; }
  }
  renderPanel(opts) {
    const s = this.stats;
    this.panel.innerHTML =
      `<b>Полигон ритма</b>` +
      `<div><kbd>1</kbd> кольца тайминга: <i>${opts.rings ? 'вкл' : 'выкл'}</i></div>` +
      `<div><kbd>2</kbd> время: <i>${opts.slow ? '×0,5' : '×1'}</i></div>` +
      `<div><kbd>3</kbd> Леший: <i>${{ mix: 'всё вперемешку', claw: 'только когти', super: 'только суперы' }[opts.mode]}</i></div>` +
      `<div><kbd>4</kbd> бессмертие: <i>${opts.god ? 'вкл' : 'выкл'}</i></div>` +
      `<hr><div class="ln">точных парирований <b>${s.parry}</b> · отбивов <b>${s.deflect}</b></div>` +
      `<div class="ln">рано <b>${s.early}</b> · поздно <b>${s.late}</b></div>` +
      `<div class="ln">точных уклонов <b>${s.dodge}</b> · контрударов <b>${s.counter}</b></div>` +
      `<div class="ln">ударов в «открыт» <b>${s.open}</b> · пропущено <b>${s.taken}</b></div>`;
  }
}
