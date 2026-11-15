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

/* Тост и GT_MSG: на hover/focus пауза оставшегося ttl, без сброса анимации ухода. */
(function () {
  "use strict";
  if (window.__GT_VISUAL_MSG_PAUSE__) return;
  window.__GT_VISUAL_MSG_PAUSE__ = true;

  (function ensureMsgPauseStyles() {
    var id = "gtype-msg-pause-css";
    if (document.getElementById(id)) return;
    var st = document.createElement("style");
    st.id = id;
    st.textContent = ".toast.on{pointer-events:auto}";
    document.head.appendChild(st);
  })();

  var gtNativeTimeout = window.setTimeout.bind(window);
  var gtNativeClearTimeout = window.clearTimeout.bind(window);

  function armPausable(el, ms, onFire, assignTm) {
    if (!el || !(ms > 0) || typeof onFire !== "function") return null;
    var remain = ms;
    var paused = false;
    var t0 = Date.now();
    var tid = 0;
    var hoverIn = false;

    function engaged() {
      return hoverIn || el.contains(document.activeElement);
    }

    function schedule() {
      gtNativeClearTimeout(tid);
      tid = gtNativeTimeout(function () {
        onFire();
      }, remain);
      if (assignTm) assignTm(tid);
      t0 = Date.now();
    }

    function sync() {
      var want = engaged();
      if (want && !paused) {
        paused = true;
        gtNativeClearTimeout(tid);
        remain -= Date.now() - t0;
        if (remain < 0) remain = 0;
        if (assignTm) assignTm(0);
      } else if (!want && paused) {
        paused = false;
        schedule();
      }
    }

    function onPointerEnter() {
      hoverIn = true;
      sync();
    }
    function onPointerLeave() {
      hoverIn = false;
      sync();
    }
    function onFocusIn() {
      sync();
    }
    function onFocusOut() {
      requestAnimationFrame(sync);
    }

    schedule();
    el.addEventListener("pointerenter", onPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return {
      cancel: function () {
        gtNativeClearTimeout(tid);
        el.removeEventListener("pointerenter", onPointerEnter);
        el.removeEventListener("pointerleave", onPointerLeave);
        el.removeEventListener("focusin", onFocusIn);
        el.removeEventListener("focusout", onFocusOut);
      },
    };
  }

  function wrapDraftsNote() {
    var D = window.GT_DRAFTS;
    if (!D || typeof D.note !== "function" || D.note.__gtMsgPause) return false;
    var orig = D.note;
    D.note = function (o) {
      var n = orig.apply(this, arguments);
      if (!n || !n.el || !o || !(o.ttl > 0)) return n;
      clearTimeout(n.tm);
      n.tm = 0;
      var ctrl = armPausable(
        n.el,
        o.ttl,
        function () {
          if (n.el && n.el.isConnected) D.closeNote();
        },
        function (id) {
          n.tm = id;
        }
      );
      if (ctrl && n.el) {
        var x = n.el.querySelector(".drn-x");
        if (x) {
          x.addEventListener(
            "click",
            function () {
              ctrl.cancel();
            },
            { once: true }
          );
        }
      }
      return n;
    };
    D.note.__gtMsgPause = true;
    return true;
  }

  function isToastDismiss(fn, delay) {
    if (delay !== 2600 || typeof fn !== "function") return false;
    var src = Function.prototype.toString.call(fn);
    return src.indexOf("classList") >= 0 && src.indexOf("remove") >= 0 && src.indexOf("on") >= 0;
  }

  function installToastDismissHook() {
    if (installToastDismissHook.done) return true;
    if (typeof window.setTimeout !== "function") return false;
    var orig = window.setTimeout;
    gtNativeTimeout = orig.bind(window);
    gtNativeClearTimeout = window.clearTimeout.bind(window);
    window.setTimeout = function (fn, delay) {
      var id = orig.apply(this, arguments);
      if (isToastDismiss(fn, delay)) {
        orig(function () {
          clearTimeout(id);
        }, 0);
        var el = document.getElementById("toast");
        if (el) armPausable(el, delay, fn);
      }
      return id;
    };
    installToastDismissHook.done = true;
    return true;
  }

  function installHooks() {
    wrapDraftsNote();
    installToastDismissHook();
  }

  installHooks();
  document.addEventListener("DOMContentLoaded", function () {
    installHooks();
    setTimeout(installHooks, 0);
    setTimeout(installHooks, 50);
  });
  window.addEventListener("load", installHooks);
  var n = 0;
  var poll = setInterval(function () {
    installHooks();
    if (
      (window.GT_DRAFTS && window.GT_DRAFTS.note && window.GT_DRAFTS.note.__gtMsgPause) &&
      installToastDismissHook.done
    ) {
      clearInterval(poll);
    } else if (++n > 400) {
      clearInterval(poll);
    }
  }, 50);
})();
