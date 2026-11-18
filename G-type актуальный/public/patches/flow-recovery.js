/* Restore navigation context only. Source glyphs remain owned by their existing drafts. */
(function () {
  'use strict';
  const KEY = 'gtype-flow-session-v1';
  const methods = ['draw', 'stroke', 'paper', 'import'];
  const presets = ['min', 'full', 'lat', 'custom'];
  function storage(action, value) {
    try {
      if (action === 'get') return sessionStorage.getItem(KEY);
      if (action === 'set') sessionStorage.setItem(KEY, value);
      else sessionStorage.removeItem(KEY);
    } catch (_) { /* Storage restrictions must not interrupt the editor. */ }
  }
  addEventListener('pagehide', function () {
    const flow = window.GT_FLOW, f = flow && flow.FL;
    if (!f || !f.route) { storage('remove'); return; }
    storage('set', JSON.stringify({v:1, name:f.name, method:f.method,
      preset:f.preset, custom:f.custom, step:f.step, started:!!f.started}));
  });
  function restore(attempt) {
    // The packaged editor initializes its UI asynchronously after window.load.
    if (!window.GT_FLOW && (attempt || 0) < 100) {
      setTimeout(function () { restore((attempt || 0) + 1); }, 50);
      return;
    }
    const raw = storage('get');
    storage('remove');
    const nav = performance.getEntriesByType('navigation')[0];
    if (!raw || !nav || nav.type !== 'reload') return;
    let saved;
    try { saved = JSON.parse(raw); } catch (_) { return; }
    if (!saved || saved.v !== 1 || !methods.includes(saved.method) ||
        !presets.includes(saved.preset) || typeof saved.name !== 'string' ||
        saved.name.length > 400 || typeof saved.custom !== 'string' ||
        saved.custom.length > 400 || !Number.isInteger(saved.step) ||
        saved.step < 1 || saved.step > 4) return;
    const flow = window.GT_FLOW;
    if (!flow || !flow.FL || typeof flow.show !== 'function') return;
    const step = Math.min(saved.step, 2);
    Object.assign(flow.FL, {name:saved.name, method:saved.method,
      preset:saved.preset, custom:saved.custom, step:step, max:step,
      started:saved.started === true, dl:null});
    flow.show(step);
    if (saved.step > 2) {
      const text = 'Шаги восстановлены. Проверьте сохранённые знаки и соберите шрифт заново перед скачиванием.';
      const body = document.getElementById('fl-body');
      if (body) {
        const note = document.createElement('p');
        note.id = 'fl-recovery-note';
        note.setAttribute('role', 'status');
        note.textContent = text;
        body.prepend(note);
      }
    }
  }
  if (document.readyState === 'complete') setTimeout(restore, 0);
  else addEventListener('load', function () { setTimeout(restore, 0); }, {once:true});
})();

