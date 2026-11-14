/* Акцент, чёрная подложка рейла и оси вариативного файла по умолчанию. */
(function () {
  "use strict";
  if (window.__GT_VISUAL_PATCH__) return;
  window.__GT_VISUAL_PATCH__ = true;

  var STYLE_ID = "gtype-visual-patch";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = [
      ".btn.pri,body:not(.tab-lib) .top .btn.pri,#view-edit .nrow .btn.pri,.imp-pop .btn.pri,.tr-card .btn.pri,.onb-btn.pri,.dm .dm-btn.dm-pri,.rb.dl{",
      "background:var(--accent-press)!important;color:var(--on-accent)!important}",
      ".btn.pri:hover,body:not(.tab-lib) .top .btn.pri:hover,#view-edit .nrow .btn.pri:hover,.imp-pop .btn.pri:hover,.tr-card .btn.pri:hover,.onb-btn.pri:hover,.dm .dm-btn.dm-pri:hover,.rb.dl:hover{",
      "background:var(--accent-hover)!important}",
      ".btn.pri:active,body:not(.tab-lib) .top .btn.pri:active,#view-edit .nrow .btn.pri:active,.onb-btn.pri:active,.rb.dl:active{",
      "background:var(--accent-press)!important}",
      ".logo i{color:inherit!important}",
      ".rail .logo::after{background:currentColor!important}",
      "#rail-profile .dot,.rb-dot{background:var(--ink)!important;box-shadow:0 0 0 2px var(--bg)!important}",
      ".notch .nb.go,.lcard.on .nb.go{background:var(--accent-press)!important;color:var(--on-accent)!important;border-color:var(--accent-press)!important}",
      ".lcard.on{border-color:var(--ink)!important}",
      ".lcard.on .nb:not(.go){background:var(--ink)!important;border-color:var(--ink)!important;color:var(--on-ink)!important}",
      ".vlink:hover .ico{background:var(--accent-press)!important;color:var(--on-accent)!important}",
      ".fchip,.pa .chip.fx,.pfix .chip.fx,.badge{background:var(--ink)!important;color:var(--on-ink)!important}",
      ".pa .chip.fx:hover,.pfix .chip.fx:hover{background:var(--ink)!important}",
      ".smp-caret{background:var(--ink)!important}",
      ".smp-sel i{background:color-mix(in srgb,var(--ink) 28%,transparent)!important}",
      ".smp-box.smp-on::after{box-shadow:inset 0 0 0 2px var(--ink)!important}",
      "input[type=checkbox],input[type=radio],input[type=range]{accent-color:var(--ink)!important}",
      "@media (min-width:721px){",
      ".rpill,.rpill.foot{background:var(--rail)!important}",
      ".rail .logo{background:var(--rail)!important;color:var(--on-rail)!important}",
      "html[data-theme=dark] .rail .logo{background:var(--rail-hi)!important;color:var(--rail)!important}",
      ".rail .rb:not(.dl){color:var(--on-rail)!important}",
      ".rail .rb.on:not(.dl){background:var(--rail-hi)!important;color:var(--rail)!important}",
      ".rail .rb.dl,.rail .rb.dl.on{color:var(--on-accent)!important}",
      "}",
    ].join("");
    document.head.appendChild(st);
  }

  var AX_KEY = "gtype-vfopt-v1";
  var AX_MARK = "gtype-vfopt-v2";
  var migrated = false;

  function migrateAxes() {
    if (migrated) return true;
    var boxes = document.querySelectorAll("#ex-list [data-vfax]");
    if (!boxes.length) return false;
    var mark = "";
    try { mark = localStorage.getItem(AX_MARK) || ""; } catch (e) { mark = ""; }
    if (mark === "1") { migrated = true; return true; }
    var next = { axes: { wght: true, wdth: true, opsz: true, slnt: true }, uniwidth: false };
    try { localStorage.setItem(AX_KEY, JSON.stringify(next)); } catch (e) {}
    boxes.forEach(function (i) {
      if (i.disabled) return;
      if (i.checked) return;
      i.checked = true;
      i.dispatchEvent(new Event("change", { bubbles: true }));
    });
    try { localStorage.setItem(AX_MARK, "1"); } catch (e) {}
    migrated = true;
    return true;
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Имя пресета пишется в <option> через innerHTML. Без экранирования короткая подпись создаёт тег и выполняет его. */
  function guardPresetName() {
    if (typeof window.cmpOptions !== "function" || cmpOptions.__gtEsc) return typeof window.cmpOptions === "function";
    if (typeof window.loadPre !== "function") return false;
    var orig = cmpOptions;
    var read = loadPre;
    function wrapped() {
      window.loadPre = function () {
        return read().map(function (it) {
          return { name: escHtml(it.name), p: it.p };
        });
      };
      try { return orig(); }
      finally { window.loadPre = read; }
    }
    wrapped.__gtEsc = true;
    window.cmpOptions = wrapped;
    return true;
  }

  function boot() {
    ensureStyles();
    if (!guardPresetName()) {
      var tries = 0;
      var timer = setInterval(function () {
        if (guardPresetName() || ++tries > 40) clearInterval(timer);
      }, 50);
    }
    if (migrateAxes()) return;
    var obs = new MutationObserver(function () {
      if (migrateAxes()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
