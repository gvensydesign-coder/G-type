// Замечания Michael: булавка на листе, на 3D-предмете или в окне смешения. Хранятся в db (notes/<id>), Claude читает и отвечает полем reply.
// Плюс «Передать Claude» — записка в handoff/<id> с тем, что сделать с библиотекой.
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v != null) e.setAttribute(k, v); } for (const k of kids) e.append(k); return e; };
const WHERE = { sheet: 'Лист', preview: '3D-превью', blend: 'Смешение', general: 'Общее' };

export class Notes {
  constructor(lib, { onJump, onChange }) {
    this.lib = lib; this.items = new Map(); this.onJump = onJump; this.onChange = onChange ?? (() => {});
    this.drawer = el('aside', { class: 'notes', hidden: '' });
    this.listBox = el('div', { class: 'nlist' });
    this.filter = 'open';
    const fb = (k, t) => el('button', { class: 'nf' + (k === this.filter ? ' on' : ''), onclick: (e) => { this.filter = k; this.drawer.querySelectorAll('.nf').forEach((b) => b.classList.toggle('on', b === e.target)); this.render(); } }, t);
    this.drawer.append(
      el('div', { class: 'nhead' }, el('b', {}, 'Замечания'), el('button', { 'aria-label': 'Закрыть', onclick: () => this.toggle(false) }, '✕')),
      el('p', { class: 'hint' }, 'Нажми «✎ Замечание» на листе, в 3D или в смешении и кликни по месту. Я вижу их и отвечаю здесь же.'),
      el('div', { class: 'row' }, fb('open', 'Открытые'), fb('all', 'Все'), fb('done', 'Готово'), el('button', { onclick: () => this.ask({ where: 'general', label: 'Общее' }) }, '+ Общее')),
      this.listBox);
    document.body.append(this.drawer);
    // окно ввода
    this.dlg = el('dialog', { class: 'ndlg' });
    this.ta = el('textarea', { rows: 5, placeholder: 'Что поправить? Например: штрихи тени гуще и короче, цвет холоднее…', 'aria-label': 'Текст замечания' });
    this.dlgLabel = el('p', { class: 'hint' });
    this.dlg.append(el('b', {}, 'Замечание'), this.dlgLabel, this.ta, el('div', { class: 'row end' }, el('button', { onclick: () => this.dlg.close() }, 'Отмена'), el('button', { class: 'primary', onclick: () => this.commit() }, 'Сохранить')));
    document.body.append(this.dlg);
  }
  list() { return [...this.items.values()].sort((a, b) => a.t - b.t); }
  openCount() { return this.list().filter((n) => n.status !== 'done').length; }
  async load() {
    const db = this.lib.db;
    if (db) {
      try {
        // живое обновление: мои ответы появляются без перезагрузки
        this.unsub = db.collection('notes').onSnapshot((snap) => { this.items.clear(); for (const d of snap.docs ?? []) { const v = d.data(); if (v?.id) this.items.set(v.id, v); } this.number(); this.render(); this.onChange(); }, (e) => console.warn('notes', e));
        return;
      } catch (e) { console.warn('notes', e); }
    }
    try { for (const n of JSON.parse(localStorage.getItem('ss-notes') ?? '[]')) this.items.set(n.id, n); } catch { /* нет */ }
    this.number(); this.render(); this.onChange();
  }
  number() { this.list().forEach((n, i) => { n.num = i + 1; }); }
  async put(n) {
    this.items.set(n.id, n); this.number(); this.render(); this.onChange();
    const { num, ...doc } = n;
    if (this.lib.db) { try { await this.lib.db.doc('notes/' + n.id).set(doc); } catch (e) { console.warn(e); } }
    else try { localStorage.setItem('ss-notes', JSON.stringify(this.list())); } catch { /* нет */ }
  }
  async del(id) {
    this.items.delete(id); this.number(); this.render(); this.onChange();
    if (this.lib.db) { try { await this.lib.db.doc('notes/' + id).delete(); } catch (e) { console.warn(e); } }
    else try { localStorage.setItem('ss-notes', JSON.stringify(this.list())); } catch { /* нет */ }
  }
  ask(ctx) { this.pending = ctx; this.ta.value = ''; this.dlgLabel.textContent = (WHERE[ctx.where] ?? '') + (ctx.label ? ' · ' + ctx.label : ''); this.dlg.showModal(); this.ta.focus(); }
  commit() {
    const text = this.ta.value.trim(); if (!text) { this.dlg.close(); return; }
    const c = this.pending ?? {}; const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    this.put({ id, t: Date.now(), status: 'open', text, reply: '', ...c }); this.dlg.close(); this.toggle(true);
  }
  toggle(on = this.drawer.hidden) { this.drawer.hidden = !on; if (on) this.render(); }
  open(id) { this.toggle(true); this.render(id); }
  render(focus) {
    const L = this.list().filter((n) => this.filter === 'all' || (this.filter === 'done' ? n.status === 'done' : n.status !== 'done'));
    this.listBox.replaceChildren(...L.map((n) => {
      const card = el('div', { class: 'ncard' + (n.id === focus ? ' focus' : '') + (n.status === 'done' ? ' done' : '') },
        el('div', { class: 'nmeta' }, el('b', {}, '№' + n.num), ' ', WHERE[n.where] ?? '', n.label ? ' · ' + n.label : '', ' · ', new Date(n.t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })),
        el('p', {}, n.text),
        n.reply ? el('p', { class: 'reply' }, el('b', {}, 'Claude: '), n.reply) : '',
        el('div', { class: 'row' },
          n.where !== 'general' ? el('button', { onclick: () => this.onJump?.(n) }, 'Показать место') : '',
          el('button', { onclick: () => this.put({ ...n, status: n.status === 'done' ? 'open' : 'done' }) }, n.status === 'done' ? 'Вернуть' : 'Готово'),
          el('button', { onclick: () => { if (confirm('Удалить замечание?')) this.del(n.id); } }, 'Удалить')));
      return card;
    }), L.length ? '' : el('p', { class: 'hint' }, 'Пока пусто.'));
    if (focus) this.listBox.querySelector('.focus')?.scrollIntoView({ block: 'nearest' });
  }
  async handoff(text, summary) {
    const id = 'h' + Date.now().toString(36);
    const doc = { id, t: Date.now(), text, ...summary };
    if (this.lib.db) { await this.lib.db.doc('handoff/' + id).set(doc); return true; }
    return false;
  }
}
