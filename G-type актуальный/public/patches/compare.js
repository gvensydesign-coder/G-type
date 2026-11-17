/* Сравнение шрифтов: плашка выбора, экран «Рядом / Наложение», входы из библиотеки,
   избранного, черновиков и истории редактора. Шрифты рисует сервисный движок (libRun). */
(function () {
  "use strict";
  if (window.__GT_COMPARE_PATCH__) return;
  window.__GT_COMPARE_PATCH__ = true;

  var KEY = "gtype-compare-v1";
  var MAXN = 4;
  var MAXLEN = 60;
  var STYLE_ID = "gtype-compare-patch";
  var TRAY_TABS = { home: 1, library: 1, fav: 1, profile: 1, folder: 1 };
  var LINES = [
    { c: "#141416", w: 1.5, d: [], cap: "butt" },
    { c: "#55555d", w: 1.5, d: [7, 4], cap: "butt" },
    { c: "#85858e", w: 1.75, d: [0.1, 4], cap: "round" },
    { c: "#6a6a72", w: 1.5, d: [10, 3, 1, 3], cap: "butt" },
  ];
  var MARKS = ["var(--ink)", "var(--text-2)", "var(--text-2)", "var(--text-2)"];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function phone() { return matchMedia("(max-width:720px)").matches; }
  function still() { return matchMedia("(prefers-reduced-motion:reduce)").matches; }
  function tabNow() { try { return S.tab; } catch (e) { return ""; } }
  function fname(id) {
    try { return (typeof fmeta === "function" ? fmeta(id).name : FONTS[id].name) || id; } catch (e) { return id; }
  }
  function fkind(id) {
    try {
      var m = fmeta(id);
      return m.tags.slice(0, 2).map(function (t) { return tagById(t)[1]; }).join(", ");
    } catch (e) { return ""; }
  }
  function say(t) { try { toast(t); } catch (e) {} }

  /* ---------- стили ---------- */
  var NOTCH2 =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http%3A//www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cpath d='M0 0A16 16 0 0 1 16 16L16 26A30 30 0 0 0 46 56L56 56A16 16 0 0 1 72 72L0 72Z'/%3E%3C/svg%3E\")";
  var RING2 =
    "linear-gradient(#000 0 0) left top/calc(100% - 71px) 100% no-repeat," +
    "linear-gradient(#000 0 0) left bottom/100% calc(100% - 71px) no-repeat," +
    NOTCH2 + " right top/72px 72px no-repeat";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = [
      ".ico.i-cmp{--ic:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3.5' y='5.5' width='11' height='11' rx='2.5'/%3E%3Cpath d='M9.5 8.5h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2'/%3E%3C/svg%3E\")}",

      /* «…» рядом с сердечком */
      ":root{--cb:40px;--cb-gap:10px}",
      "@media (max-width:720px),(pointer:coarse){:root{--cb:44px}}",
      "#view-cmp>*{flex-shrink:0}",
      ".lcard .heart{width:var(--cb);height:var(--cb);min-width:var(--cb);min-height:var(--cb)}",
      ".lcard .lc-more{position:absolute;left:auto;top:auto;bottom:10px;right:calc(10px + var(--cb) + var(--cb-gap));width:var(--cb);height:var(--cb);min-width:var(--cb);min-height:var(--cb);opacity:1;color:var(--muted);transform:none}",
      ".lcard .lc-more .ico{width:24px;height:24px}",
      ".lcard .lc-more:hover,.lcard .lc-more:focus-visible,.lcard .lc-more[aria-expanded=true]{background:var(--panel);color:var(--ink)}",
      ".lcard:not(.list>.lcard) .lt.tags{--mh:calc(var(--cb) + 10px - 16px);--mx:calc(10px + var(--cb)*2 + var(--cb-gap) - 12px);-webkit-mask:linear-gradient(#000 0 0) left top/100% max(0px,calc(100% - var(--mh))) no-repeat,linear-gradient(90deg,#000 calc(100% - var(--mx) - 18px),transparent calc(100% - var(--mx))) left bottom/100% var(--mh) no-repeat;mask:linear-gradient(#000 0 0) left top/100% max(0px,calc(100% - var(--mh))) no-repeat,linear-gradient(90deg,#000 calc(100% - var(--mx) - 18px),transparent calc(100% - var(--mx))) left bottom/100% var(--mh) no-repeat}",
      "@media (pointer:coarse){.lcard:not(.list>.lcard) .lt.tags{-webkit-mask:none;mask:none}.lcard:not(.list>.lcard) .heart{grid-row:4;grid-column:1;justify-self:end;left:2px;top:-6px}.lcard:not(.list>.lcard) .lc-more{position:relative;grid-row:4;grid-column:1;justify-self:end;align-self:start;top:-6px;left:2px;bottom:auto;right:auto;margin-right:calc(var(--cb) + var(--cb-gap))}}",
      ".list>.lcard{grid-template-columns:minmax(200px,36%) minmax(0,1fr) auto auto auto auto!important;grid-template-areas:\"cv ln lb mrt hrt nb\" \"cv lt lb mrt hrt nb\"!important}",
      ".list>.lcard .lc-more{position:static;grid-area:mrt;transform:none;margin:0}",
      ".list>.lcard .heart{position:static;grid-area:hrt}",
      "@media (max-width:720px){.list>.lcard{grid-template-columns:minmax(0,1fr) auto auto auto!important;grid-template-areas:\"cv cv cv cv\" \"ln mrt hrt nb\" \"lt lt lt lt\" \"lb lb lb lb\"!important}}",

      /* отметка выбора по той же форме карточки с вырезом */
      ".lcard.cmp-on:has(>.notch):not(.list>.lcard){--cring:var(--ink)}",
      ".lcard.cmp-on:has(>.notch):not(.list>.lcard)::after{inset:2px;border-radius:calc(var(--r) - 2px);-webkit-mask:" + RING2 + ";mask:" + RING2 + "}",
      ".list>.lcard.cmp-on{box-shadow:inset 0 0 0 2px var(--ink)!important}",
      ".lcard.cmp-pickable,.dd-card.cmp-pickable{cursor:pointer}",
      ".dd-card.cmp-on{position:relative}",
      ".dd-card.cmp-on::after{content:\"\";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 2px var(--ink);pointer-events:none}",

      /* карточка шрифта при наведении */
      ".hcard .hc-act{flex-wrap:wrap}",
      ".hcard .hc-act .hc-open{flex:1 1 100%}",
      ".hcard .hc-act .hc-cmp{flex:1 1 0;min-width:0;min-height:var(--h-lg,42px);padding:0 var(--s4,16px)}",
      ".hcard .hc-act .hc-cmp .ico{width:20px;height:20px;margin-right:var(--s2,8px)}",
      ".hcard .hc-act .hc-cmp[aria-pressed=true]{background:var(--ink);color:var(--on-ink)}",

      /* кнопки входа */
      ".cmp-enter{display:inline-flex;align-items:center;gap:var(--s2,8px)}",
      ".cmp-enter .ico{width:20px;height:20px}",
      ".cmp-enter[aria-pressed=true]{background:var(--ink);color:var(--on-ink)}",
      "#dd-sect .vhead .cmp-enter{margin-left:auto}",
      "#dd-sect .vhead .cmp-enter+.dd-pref{margin-left:0}",

      /* плашка выбора */
      ".cmp-tray{position:fixed;left:calc(var(--rw,64px) + var(--pad,14px)*2);right:var(--pad,14px);bottom:calc(var(--pad,14px) + var(--cmp-lift,0px) + env(safe-area-inset-bottom,0px));z-index:60;display:flex;justify-content:center;pointer-events:none;visibility:hidden;opacity:0;transform:translateY(16px);transition:opacity var(--dur-fast) var(--ease-in),transform var(--dur-fast) var(--ease-in),bottom var(--dur-base) var(--ease-out),visibility 0s linear var(--dur-fast)}",
      ".cmp-tray.on{visibility:visible;opacity:1;transform:none;transition:opacity var(--dur-base) var(--ease-out),transform var(--dur-base) var(--ease-out),bottom var(--dur-base) var(--ease-out),visibility 0s}",
      ".cmp-tin{pointer-events:auto;display:flex;align-items:center;gap:var(--s3);background:var(--paper);box-shadow:var(--sh-3);border-radius:var(--r-pill);padding:var(--bar-in,8px) var(--bar-in,8px) var(--bar-in,8px) var(--s5);min-height:58px;max-width:100%;min-width:0}",
      ".cmp-tl{flex:none;font-weight:600;font-size:var(--fs-base);white-space:nowrap;color:var(--ink)}",
      ".cmp-tl em{font-style:normal;color:var(--muted);font-weight:500}",
      ".cmp-tchips{display:flex;gap:var(--s2);min-width:0;overflow-x:auto;flex-wrap:nowrap}",
      ".cmp-tc{flex:none;display:inline-flex;align-items:center;height:34px;padding:0 4px 0 var(--s3);border-radius:var(--r-pill);background:var(--panel);font-weight:600;font-size:var(--fs-base);white-space:nowrap;animation:cmp-pop var(--dur-base) var(--ease-out) both}",
      ".cmp-tc button{position:relative;width:26px;height:26px;margin-left:var(--s1);border:0;border-radius:50%;background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:background var(--dur-fast),color var(--dur-fast)}",
      ".cmp-tc button::after{content:\"\";position:absolute;inset:-9px}",
      ".cmp-tc button:hover{background:var(--surface-3);color:var(--ink)}",
      ".cmp-tc .ico{width:14px;height:14px}",
      ".cmp-go{flex:none;min-height:var(--h-lg,42px);padding:0 var(--s5);font-size:var(--fs-base);font-weight:700}",
      "@keyframes cmp-pop{from{transform:scale(.8);opacity:0}60%{transform:scale(1.04)}to{transform:none;opacity:1}}",
      "body.cmp-tray-on .libview{padding-bottom:calc(var(--cmp-h,58px) + var(--pad,14px)*3)!important}",
      "@media (max-width:720px){",
      ".cmp-tray{left:8px;right:8px;bottom:calc(88px + var(--cmp-lift,0px) + env(safe-area-inset-bottom,0px))}",
      ".cmp-tin{flex-wrap:nowrap;border-radius:var(--r-pill);padding:12px 12px 12px var(--s4);min-height:68px;width:100%;gap:var(--s3)}",
      ".cmp-tl:has(+.cmp-tchips){display:none}",
      ".cmp-tl:not(:has(+.cmp-tchips)){white-space:normal;font-size:var(--fs-sm,13px);line-height:1.3}",
      ".cmp-tchips{flex:1 1 auto;scrollbar-width:none;-ms-overflow-style:none}.cmp-tchips::-webkit-scrollbar{display:none}",
      ".cmp-go{flex:none;min-height:44px;padding:0 var(--s4)}",
      "body.cmp-tray-on .libview{padding-bottom:calc(var(--cmp-h,58px) + 96px + var(--pad,12px))!important}",
      "}",

      /* экран сравнения */
      "#view-cmp{gap:clamp(12px,1.6vw,20px);color:var(--ink)}",
      "#view-cmp.cmp-in{animation:cmp-in var(--dur-open) var(--ease-out) both}",
      "#view-cmp.cmp-out{animation:cmp-out var(--dur-close) var(--ease-in) both;pointer-events:none}",
      "@keyframes cmp-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}",
      "@keyframes cmp-out{to{opacity:0;transform:translateY(8px)}}",
      "#view-cmp .vhead{align-items:flex-start}",
      ".cmp-lead{margin:var(--s1) 0 0;color:var(--muted);font-size:var(--fs-base);max-width:62ch}",
      ".cmp-bar{display:flex;align-items:center;gap:var(--s5);background:var(--paper);box-shadow:var(--sh-2);border-radius:var(--r-pill);padding:var(--bar-in,8px);min-height:58px}",
      ".cmp-bar .seg{flex:none;background:var(--panel);padding:3px;position:relative}",
      ".cmp-bar .seg button{min-height:36px;padding:0 var(--s5);font-weight:600;position:relative;z-index:1}",
      ".cmp-bar .seg button[aria-disabled=true]{opacity:.45;cursor:not-allowed}",
      ".cmp-sz{display:flex;align-items:center;gap:var(--s3);flex:1;min-width:0;padding-right:var(--s4)}",
      ".cmp-sz label{flex:none;font-weight:600;color:var(--muted)}",
      ".cmp-sz output{flex:none;min-width:56px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}",
      ".cmp-sz input{flex:1;min-width:0;width:auto}",
      ".cmp-chiprow{display:flex;align-items:center;gap:var(--s3)}",
      ".cmp-cap{flex:none;min-width:96px;font-size:var(--fs-sm);font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}",
      ".cmp-chips{display:flex;flex-wrap:nowrap;gap:var(--s2);overflow-x:auto;min-width:0;flex:1;--fl:0px;--fr:0px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 var(--fl),#000 calc(100% - var(--fr)),transparent);mask-image:linear-gradient(90deg,transparent,#000 var(--fl),#000 calc(100% - var(--fr)),transparent)}",
      ".cmp-chips[data-hs~=l]{--fl:28px}.cmp-chips[data-hs~=r]{--fr:28px}",
      ".cmp-chip{flex:none;display:inline-flex;align-items:center;gap:var(--s2);height:var(--h-lg,42px);padding:0 var(--s4);border:0;border-radius:var(--r-pill);background:var(--paper);box-shadow:var(--sh-1);font:600 var(--fs-base)/1 var(--f-ui);color:var(--ink);white-space:nowrap;cursor:pointer;transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),opacity var(--dur-fast) var(--ease-out)}",
      ".cmp-chip:hover{background:var(--panel)}",
      ".cmp-chip .ck{width:16px;height:16px;border-radius:50%;border:1.75px solid var(--line-strong,var(--track-on));display:grid;place-items:center;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)}",
      ".cmp-chip .ck .ico{width:12px;height:12px;opacity:0;color:var(--ink);transition:opacity var(--dur-fast) var(--ease-out)}",
      ".cmp-chip[aria-pressed=true]{background:var(--ink);color:var(--on-ink)}",
      ".cmp-chip[aria-pressed=true]:hover{background:var(--ink)}",
      ".cmp-chip[aria-pressed=true] .ck{background:var(--on-ink);border-color:var(--on-ink)}",
      ".cmp-chip[aria-pressed=true] .ck .ico{opacity:1}",
      ".cmp-chip[aria-disabled=true]{opacity:.45;cursor:not-allowed}",
      ".cmp-chip[aria-disabled=true]:hover{background:var(--paper)}",
      ".cmp-stagewrap{display:grid;grid-template-rows:0fr;opacity:0;margin-top:calc(-1*clamp(12px,1.6vw,20px));transition:grid-template-rows var(--dur-close) var(--ease-in),opacity var(--dur-fast) var(--ease-in),margin var(--dur-close) var(--ease-in)}",
      ".cmp-stagewrap>div{overflow:hidden;min-height:0}",
      "#view-cmp[data-view=overlay] .cmp-stagewrap{grid-template-rows:1fr;opacity:1;margin-top:0;transition:grid-template-rows var(--dur-slow) var(--ease-out),opacity var(--dur-base) var(--ease-out) 60ms,margin var(--dur-base) var(--ease-out)}",
      ".cmp-stage{position:relative;background:var(--canvas);border-radius:var(--r-lg);box-shadow:var(--sh-1);padding:var(--s7) var(--s6) var(--s5);overflow:hidden;cursor:text}",
      ".cmp-stage:focus-within{box-shadow:inset 0 0 0 2px var(--focus-ring)}",
      ".cmp-field{position:relative;width:100%}",
      ".cmp-field canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}",
      ".cmp-in{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;padding:0;margin:0;background:transparent;color:transparent;caret-color:transparent;font-size:16px;cursor:text;z-index:2;outline:0;box-shadow:none!important}",
      ".cmp-caret{position:absolute;width:2px;background:#141416;display:none;pointer-events:none;animation:cmp-blink 1.1s steps(1) infinite;z-index:1}",
      "@keyframes cmp-blink{50%{opacity:0}}",
      ".cmp-legend{position:relative;z-index:4;margin-top:var(--s4);display:flex;gap:var(--s2);flex-wrap:nowrap;overflow-x:auto;align-items:center;font-size:var(--fs-sm)}",
      ".cmp-lg{flex:none;display:inline-flex;align-items:center;gap:var(--s2);height:34px;padding:0 var(--s3);border-radius:var(--r-pill);font-weight:600;color:#2a2a30;transition:background var(--dur-fast) var(--ease-out)}",
      ".cmp-lg:hover{background:rgba(20,20,22,.07)}",
      ".cmp-lg:focus-visible{outline:2px solid #141416;outline-offset:-2px;box-shadow:none}",
      ".cmp-gx{flex:none;margin-left:auto;padding-left:var(--s4);color:#6a6a72;font-weight:500}",
      ".cmp-gx.nt{margin-left:var(--s3);padding-left:0;color:#2a2a30}",
      ".cmp-mk{flex:none;width:28px;height:8px;overflow:visible}",
      ".cmp-fh .cmp-mk{display:none}",
      "#view-cmp[data-view=overlay] .cmp-fh .cmp-mk{display:block}",
      ".cmp-grid{display:grid;gap:var(--s3);grid-template-columns:repeat(var(--n,2),minmax(0,1fr))}",
      ".cmp-card{position:relative;background:var(--card);box-shadow:var(--sh-1);border-radius:var(--r-lg);padding:var(--s4);display:flex;flex-direction:column;gap:var(--s3);min-width:0}",
      ".cmp-card::after{content:\"\";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 0 var(--ink);pointer-events:none;transition:box-shadow var(--dur-fast) var(--ease-out)}",
      ".cmp-card.sel::after{box-shadow:inset 0 0 0 2px var(--ink)}",
      ".cmp-card.in{animation:cmp-card-in var(--dur-base) var(--ease-out) both}",
      ".cmp-card.out{animation:cmp-card-out var(--dur-fast) var(--ease-in) both}",
      "@keyframes cmp-card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
      "@keyframes cmp-card-out{to{opacity:0;transform:scale(.98)}}",
      ".cmp-fh{display:flex;align-items:center;gap:var(--s3);min-height:40px}",
      ".cmp-ft{min-width:0;flex:1}",
      ".cmp-ft b{display:block;font-size:18px;font-weight:700;letter-spacing:-.01em;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".cmp-ft small{display:block;font-size:var(--fs-sm);color:var(--muted);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".cmp-x{position:relative;flex:none;width:40px;height:40px;border:0;border-radius:50%;background:var(--panel);color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),transform var(--dur-instant) var(--ease-out)}",
      ".cmp-x:hover{background:var(--surface-3);color:var(--ink)}",
      ".cmp-x:active{transform:scale(1.06)}",
      ".cmp-x[disabled]{opacity:.35;cursor:not-allowed}",
      ".cmp-x .ico{width:18px;height:18px}",
      "@media (max-width:720px){.cmp-x{width:44px;height:44px}}",
      ".cmp-sw{display:grid;grid-template-rows:1fr;flex:1;transition:grid-template-rows var(--dur-base) var(--ease-out),opacity var(--dur-base) var(--ease-out) 60ms}",
      ".cmp-sw>div{min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:var(--s2)}",
      "#view-cmp[data-view=overlay] .cmp-sw{grid-template-rows:0fr;opacity:0;flex:0;transition:grid-template-rows var(--dur-base) var(--ease-out),opacity var(--dur-fast) var(--ease-in)}",
      ".cmp-sample{position:relative;flex:1;background:var(--canvas);border-radius:var(--r-md);min-height:180px;overflow:hidden;cursor:text}",
      ".cmp-sample canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}",
      ".cmp-sample:focus-within{box-shadow:inset 0 0 0 2px var(--focus-ring)}",
      ".cmp-note{margin:0;font-size:var(--fs-sm);color:var(--muted);line-height:1.35}",
      ".cmp-slot{border:1.5px dashed var(--line-strong,var(--track-on));border-radius:var(--r-lg);min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--s2);padding:var(--s6);text-align:center;color:var(--muted);animation:cmp-card-in var(--dur-base) var(--ease-out) both}",
      ".cmp-slot b{color:var(--ink);font-size:16px}",
      ".cmp-slot span{max-width:30ch}",
      ".cmp-open{min-height:var(--h-lg,48px);width:100%;font-size:var(--fs-base);font-weight:700}",
      ".cmp-card:not(.sel) .cmp-open{font-weight:600}",
      "@media (max-width:1100px){.cmp-grid[data-n=\"3\"],.cmp-grid[data-n=\"4\"]{--n:2}}",
      "@media (max-width:720px){",
      ".cmp-grid{--n:1!important}",
      ".cmp-bar{flex-wrap:wrap;border-radius:var(--r-xl);gap:var(--s3);padding:var(--s2)}",
      ".cmp-bar .seg{width:100%}.cmp-bar .seg button{flex:1;min-height:44px}",
      ".cmp-sz{flex:1 0 100%;padding:0 var(--s3) var(--s2)}",
      ".cmp-chiprow{flex-direction:column;align-items:stretch;gap:var(--s2)}",
      ".cmp-cap{min-width:0;padding-left:var(--s2)}",
      ".cmp-chips{margin:0 calc(-1*var(--pad,12px));padding:0 var(--pad,12px)}",
      ".cmp-chip{height:44px}",
      ".cmp-stage{padding:var(--s5) var(--s4) var(--s3)}",
      ".cmp-gx:not(.nt){display:none}",
      "}",

      /* история редактора */
      ".hist-l li{position:relative}",
      ".hist-l li:has(.hist-cmp) .hist-i{padding-right:112px}",
      ".hist-cmp{position:absolute;right:var(--s2);top:50%;transform:translateY(-50%);z-index:2}",
      ".hist-cmpf{display:flex;align-items:center;gap:var(--s3);width:calc(100% - var(--s4));margin:var(--s2) var(--s2) var(--s2);min-height:var(--h-lg,42px);padding:0 var(--s3);border:0;border-radius:var(--r-sm);background:transparent;color:var(--ink);font:600 var(--fs-base)/1 var(--f-ui);text-align:left;cursor:pointer;transition:background var(--dur-fast)}",
      ".hist-cmpf:hover{background:var(--panel)}",
      ".hist-cmpf .ico{width:20px;height:20px}",
      ".hist-cmpf .nx{margin-left:auto;color:var(--muted)}",
      ".hist-pick{display:none;flex-direction:column;gap:var(--s1);padding:0 var(--s2) var(--s2);min-height:0;overflow:hidden}",
      "#hist.cmp-pick .hist-pick{display:flex;animation:cmp-in var(--dur-fast) var(--ease-out) both}",
      "#hist.cmp-pick .hist-l,#hist.cmp-pick .hist-e,#hist.cmp-pick .hist-cmpf,#hist.cmp-pick .hist-h{display:none}",
      ".hist-pick .hp-h{display:flex;align-items:center;gap:var(--s2);padding:var(--s1) var(--s1) var(--s2);font-weight:700}",
      ".hist-pick .hp-l{display:flex;flex-direction:column;gap:2px;overflow-y:auto;max-height:min(340px,50vh)}",
      ".hist-pick .hp-i{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);min-height:var(--h-lg,44px);padding:0 var(--s3);border:0;border-radius:var(--r-sm);background:transparent;color:var(--ink);font:600 var(--fs-base)/1 var(--f-ui);text-align:left;cursor:pointer}",
      ".hist-pick .hp-i:hover,.hist-pick .hp-i:focus-visible{background:var(--panel)}",
      ".hist-pick .hp-i small{font-weight:500;color:var(--muted);font-size:var(--fs-sm)}",
    ].join("\n");
    document.head.appendChild(st);
  }

  /* ---------- выбор (общий, переживает перезагрузку) ---------- */
  var SEL = [];
  var MODE = null; /* null | "fav" | "drafts": режим отметок */
  var DRMETA = {};

  function loadSel() {
    var a = [];
    try { a = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { a = []; }
    if (!Array.isArray(a)) a = [];
    SEL = a.filter(function (k) {
      return typeof k === "string" && (k.indexOf("d:") === 0 || (typeof FONTS !== "undefined" && FONTS[k]));
    }).filter(function (k, i, arr) { return arr.indexOf(k) === i; }).slice(0, MAXN);
  }
  function saveSel() { try { localStorage.setItem(KEY, JSON.stringify(SEL)); } catch (e) {} }
  function isDraftKey(k) { return k.indexOf("d:") === 0; }
  function keyName(k) {
    if (isDraftKey(k)) { var m = DRMETA[k.slice(2)]; return m ? m.name : "Черновик"; }
    return fname(k);
  }

  function addKey(k) {
    if (SEL.indexOf(k) >= 0) return true;
    if (SEL.length >= MAXN) {
      say("В сравнении уже четыре шрифта. Уберите один, чтобы добавить «" + keyName(k) + "».");
      return false;
    }
    SEL.push(k); saveSel(); changed();
    return true;
  }
  function removeKey(k) {
    var i = SEL.indexOf(k);
    if (i < 0) return;
    SEL.splice(i, 1); saveSel(); changed();
  }
  function toggleKey(k) {
    if (SEL.indexOf(k) >= 0) { removeKey(k); return true; }
    return addKey(k);
  }
  function setSel(keys) {
    SEL = keys.slice(0, MAXN); saveSel(); changed();
  }

  function changed() {
    markCards();
    renderTray();
    if (CMP.open && CMP.mode === "shared") syncShared();
  }

  /* ---------- плашка ---------- */
  var tray = null, tin = null;
  function buildTray() {
    if (tray) return;
    tray = document.createElement("div");
    tray.id = "cmp-tray";
    tray.className = "cmp-tray";
    tray.setAttribute("role", "region");
    tray.setAttribute("aria-label", "Сравнение шрифтов");
    tin = document.createElement("div");
    tin.className = "cmp-tin";
    tray.appendChild(tin);
    document.body.appendChild(tray);
    tin.addEventListener("click", function (e) {
      var u = e.target.closest("[data-un]");
      if (u) { removeKey(u.getAttribute("data-un")); return; }
      var g = e.target.closest("#cmp-go");
      if (g) openShared(g);
    });
  }
  function trayWanted() {
    if (CMP.open) return false;
    if (!TRAY_TABS[tabNow()]) return false;
    return SEL.length > 0 || !!MODE;
  }
  function renderTray() {
    buildTray();
    var show = trayWanted(), n = SEL.length;
    if (show) {
      var chips = SEL.map(function (k) {
        return '<span class="cmp-tc" data-k="' + esc(k) + '">' + esc(keyName(k)) +
          '<button type="button" data-un="' + esc(k) + '" aria-label="Убрать «' + esc(keyName(k)) + '» из сравнения"><i class="ico i-close" aria-hidden="true"></i></button></span>';
      }).join("");
      var html;
      if (n === 0) {
        html = '<span class="cmp-tl">Сравнение: <em>' + (MODE === "drafts" ? "отметьте два черновика" : "отметьте от двух до четырёх шрифтов") + "</em></span>";
      } else if (n === 1) {
        html = '<span class="cmp-tl">Сравнение:</span><span class="cmp-tchips">' + chips + '</span><span class="cmp-tl"><em>· добавьте ещё ' + (isDraftKey(SEL[0]) ? "один черновик" : "один") + "</em></span>";
      } else {
        html = '<span class="cmp-tl">Сравнение:</span><span class="cmp-tchips">' + chips + '</span><button type="button" class="btn pri cmp-go" id="cmp-go">Сравнить ' + n + "</button>";
      }
      if (tin.getAttribute("data-h") !== html) { tin.setAttribute("data-h", html); tin.innerHTML = html; }
    }
    tray.classList.toggle("on", show);
    tray.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) tray.removeAttribute("inert"); else tray.setAttribute("inert", "");
    document.body.classList.toggle("cmp-tray-on", show);
    if (show) {
      document.documentElement.style.setProperty("--cmp-h", tin.offsetHeight + "px");
      startLift();
    }
  }
  var liftTimer = 0;
  function startLift() {
    if (liftTimer) return;
    liftTimer = setInterval(function () {
      if (!tray || !tray.classList.contains("on")) { clearInterval(liftTimer); liftTimer = 0; return; }
      liftNow();
    }, 250);
    liftNow();
  }
  function liftNow() {
    if (!tin) return;
    var cur = parseFloat(document.documentElement.style.getPropertyValue("--cmp-lift")) || 0;
    var r = tin.getBoundingClientRect();
    var nat = { top: r.top + cur, bottom: r.bottom + cur, left: r.left, right: r.right };
    var lift = 0;
    $$("#toast.on,.drn:not(.off)").forEach(function (el) {
      var q = el.getBoundingClientRect();
      if (q.width < 2 || q.height < 2) return;
      if (nat.right <= q.left || nat.left >= q.right) return;
      if (q.bottom < nat.top - 8 || q.top > nat.bottom + 8) return;
      lift = Math.max(lift, nat.bottom - q.top + 8);
    });
    lift = Math.round(lift);
    if (lift !== cur) document.documentElement.style.setProperty("--cmp-lift", lift + "px");
  }

  /* ---------- отметки на карточках ---------- */
  function markCards() {
    $$(".lcard[data-font]").forEach(function (c) {
      var on = SEL.indexOf(c.getAttribute("data-font")) >= 0;
      c.classList.toggle("cmp-on", on);
      var pick = MODE === "fav" && !!c.closest("#favgrid");
      c.classList.toggle("cmp-pickable", pick);
      if (pick) c.setAttribute("aria-pressed", on ? "true" : "false"); else c.removeAttribute("aria-pressed");
    });
    $$(".dd-card[data-card]").forEach(function (c) {
      var k = "d:" + c.getAttribute("data-card");
      var rec = DRMETA[c.getAttribute("data-card")];
      var can = !!rec && rec.mode === "edit";
      var on = SEL.indexOf(k) >= 0;
      c.classList.toggle("cmp-on", on);
      var pick = MODE === "drafts" && can;
      c.classList.toggle("cmp-pickable", pick);
      if (pick) c.setAttribute("aria-pressed", on ? "true" : "false"); else c.removeAttribute("aria-pressed");
    });
    var fb = $("#cmp-fav-btn"), db = $("#cmp-dd-btn");
    if (fb) fb.setAttribute("aria-pressed", MODE === "fav" ? "true" : "false");
    if (db) db.setAttribute("aria-pressed", MODE === "drafts" ? "true" : "false");
    syncHcardBtn();
  }

  /* ---------- меню «…» ---------- */
  function hookMenu() {
    if (!window.PORT || typeof PORT.cardMenu !== "function" || PORT.cardMenu.__cmp) return;
    var orig = PORT.cardMenu;
    var w = function (btn, fid) {
      var r = orig.apply(this, arguments);
      var m = $$(".menu70").pop();
      if (m && btn.getAttribute("aria-expanded") === "true") wireMenu(m, btn, fid);
      return r;
    };
    w.__cmp = 1;
    PORT.cardMenu = w;
  }
  function wireMenu(m, btn, fid) {
    var inject = function () {
      var fav = m.querySelector('[data-m="fav"]');
      if (!fav || m.querySelector('[data-m="cmp"]')) return;
      var on = SEL.indexOf(fid) >= 0;
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "menuitem"); b.setAttribute("data-m", "cmp");
      b.innerHTML = '<i class="ico i-cmp" aria-hidden="true"></i>' + (on ? "Убрать из сравнения" : "Сравнить");
      fav.after(b);
    };
    inject();
    new MutationObserver(inject).observe(m, { childList: true });
    m.addEventListener("click", function (e) {
      var b = e.target.closest('[data-m="cmp"]');
      if (!b) return;
      e.stopPropagation();
      toggleKey(fid);
      PORT.cardMenu(btn, fid);
    });
  }

  /* ---------- карточка при наведении ---------- */
  function hcId(el) {
    var l = el.getAttribute("aria-label") || "";
    var m = /«(.+)»/.exec(l);
    if (!m) return "";
    return Object.keys(FONTS).filter(function (id) { return fname(id) === m[1]; })[0] || "";
  }
  function hookHcard() {
    var h = $("#hcard");
    if (!h || h.__cmp) return;
    h.__cmp = 1;
    var act = $(".hc-act", h);
    if (!act) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn hc-cmp";
    var heart = $(".hc-heart", act);
    if (heart) act.insertBefore(b, heart); else act.appendChild(b);
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var id = hcId(h);
      if (id) toggleKey(id);
    });
    new MutationObserver(syncHcardBtn).observe(h, { attributes: true, attributeFilter: ["aria-label", "hidden", "class"] });
    syncHcardBtn();
  }
  function syncHcardBtn() {
    var h = $("#hcard"), b = h && $(".hc-cmp", h);
    if (!b) return;
    var id = hcId(h), on = !!id && SEL.indexOf(id) >= 0;
    b.setAttribute("aria-pressed", on ? "true" : "false");
    var t = on ? "В сравнении" : "Сравнить";
    var lab = (on ? "Убрать из сравнения: " : "Сравнить: ") + (id ? fname(id) : "");
    b.title = lab; b.setAttribute("aria-label", lab);
    b.innerHTML = '<i class="ico ' + (on ? "i-check" : "i-cmp") + '" aria-hidden="true"></i>' + t;
  }

  /* ---------- избранное ---------- */
  function favIds() {
    return Object.keys(FONTS).filter(function (id) { return FAVS.has(id); });
  }
  function hookFav() {
    var ctl = $("#view-fav .vhead .vctl");
    if (!ctl || $("#cmp-fav-btn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "cmp-fav-btn"; b.className = "btn cmp-enter";
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<i class="ico i-cmp" aria-hidden="true"></i>Сравнить избранное';
    ctl.insertBefore(b, ctl.firstChild);
    b.addEventListener("click", function () {
      var ids = favIds();
      if (ids.length < 2) { say("Для сравнения нужно не меньше двух избранных шрифтов."); return; }
      if (ids.length <= MAXN) { MODE = null; setSel(ids); openShared(b); return; }
      MODE = MODE === "fav" ? null : "fav";
      markCards(); renderTray();
    });
    var fg = $("#favgrid");
    if (fg && !fg.__cmp) {
      fg.__cmp = 1;
      fg.addEventListener("click", function (e) {
        if (MODE !== "fav") return;
        var c = e.target.closest(".lcard");
        if (!c) return;
        e.stopPropagation(); e.preventDefault();
        if (e.target.closest(".heart,.lc-more")) { return; }
        toggleKey(c.getAttribute("data-font"));
      }, true);
      fg.addEventListener("keydown", function (e) {
        if (MODE !== "fav" || (e.key !== "Enter" && e.key !== " ")) return;
        var c = e.target.closest(".lcard");
        if (!c || e.target !== c) return;
        e.stopPropagation(); e.preventDefault();
        toggleKey(c.getAttribute("data-font"));
      }, true);
    }
  }

  /* ---------- черновики ---------- */
  function readDrafts() {
    return new Promise(function (res) {
      var out = [];
      try {
        var q = indexedDB.open("gtype-drafts-v1", 1);
        q.onupgradeneeded = function () { try { q.result.createObjectStore("d", { keyPath: "id" }); } catch (e) {} };
        q.onsuccess = function () {
          try {
            var rq = q.result.transaction("d", "readonly").objectStore("d").getAll();
            rq.onsuccess = function () { res(rq.result || []); };
            rq.onerror = function () { res([]); };
          } catch (e) { res([]); }
        };
        q.onerror = function () { lsDrafts(res); };
        return;
      } catch (e) {}
      lsDrafts(res);
    });
  }
  function lsDrafts(res) {
    var out = [];
    try {
      var ix = JSON.parse(localStorage.getItem("gtype-drafts-v1-idx") || "[]");
      ix.forEach(function (id) {
        try { var r = JSON.parse(localStorage.getItem("gtype-drafts-v1-d-" + id)); if (r) out.push(r); } catch (e) {}
      });
    } catch (e) {}
    res(out);
  }
  function refreshDraftMeta() {
    if (!window.GT_DRAFTS || !GT_DRAFTS.list) return;
    if (GT_DRAFTS.ready && !GT_DRAFTS.ready()) return;
    var l = GT_DRAFTS.list(), m = {};
    l.forEach(function (d) { m[d.id] = d; });
    DRMETA = m;
    SEL = SEL.filter(function (k) { return !isDraftKey(k) || !!m[k.slice(2)]; });
  }
  function hookDrafts() {
    var sect = $("#dd-sect");
    if (!sect) return;
    refreshDraftMeta();
    var head = $(".vhead", sect);
    if (head && !$("#cmp-dd-btn", head)) {
      var b = document.createElement("button");
      b.type = "button"; b.id = "cmp-dd-btn"; b.className = "btn cmp-enter";
      b.setAttribute("aria-pressed", MODE === "drafts" ? "true" : "false");
      b.innerHTML = '<i class="ico i-cmp" aria-hidden="true"></i>Сравнить';
      var pref = $(".dd-pref", head);
      if (pref) head.insertBefore(b, pref); else head.appendChild(b);
      b.addEventListener("click", function () {
        var edit = Object.keys(DRMETA).filter(function (id) { return DRMETA[id].mode === "edit"; });
        if (edit.length < 2) { say("Для сравнения нужно не меньше двух черновиков редактора."); return; }
        MODE = MODE === "drafts" ? null : "drafts";
        markCards(); renderTray();
      });
    }
    var grid = $("#dd-grid", sect);
    if (grid && !grid.__cmp) {
      grid.__cmp = 1;
      grid.addEventListener("click", function (e) {
        if (MODE !== "drafts") return;
        var c = e.target.closest(".dd-card");
        if (!c) return;
        e.stopPropagation(); e.preventDefault();
        var id = c.getAttribute("data-card"), m = DRMETA[id];
        if (!m || m.mode !== "edit") { say("Сравнить можно только черновики редактора."); return; }
        toggleKey("d:" + id);
      }, true);
      grid.addEventListener("keydown", function (e) {
        if (MODE !== "drafts" || (e.key !== "Enter" && e.key !== " ")) return;
        var c = e.target.closest(".dd-card");
        if (!c || e.target !== c) return;
        e.preventDefault();
        var id = c.getAttribute("data-card"), m = DRMETA[id];
        if (m && m.mode === "edit") toggleKey("d:" + id);
      }, true);
      $$(".dd-card", grid).forEach(function (c) { if (!c.hasAttribute("tabindex")) c.tabIndex = 0; });
    }
    markCards();
    renderTray();
  }

  /* ---------- «Две строки» ---------- */
  function renameTwoLines() {
    var b = $("#cmpb");
    if (b) {
      var t = b.textContent;
      var n = /А$/.test(t) ? "Две строки с А" : "Две строки";
      if (t !== n) b.textContent = n;
      var title = "Две строки: сейчас и вариант для сравнения";
      if (b.title !== title) b.title = title;
      if (b.getAttribute("aria-label") !== n) b.setAttribute("aria-label", n);
    }
    var s = $("#cmpsrc");
    if (s && s.getAttribute("aria-label") !== "Вариант для второй строки") s.setAttribute("aria-label", "Вариант для второй строки");
    $$("[data-tip],[title]").forEach(function (e) {
      ["data-tip", "title"].forEach(function (a) {
        var v = e.getAttribute(a);
        if (v === "Тестер, сравнение, декоративные начертания") e.setAttribute(a, "Тестер, две строки, декоративные начертания");
      });
    });
    $$(".tour-card").forEach(function (c) {
      var t = $(".tour-t,h3,h2,b", c);
      if (/Запомнить как А/.test(c.textContent) && t && t.textContent === "Сравнение") t.textContent = "Две строки";
      $$("p,div,span", c).forEach(function (e) {
        if (e.children.length === 0 && e.textContent.indexOf("Тестер, сравнение двух вариантов") === 0)
          e.textContent = "Тестер, две строки и декоративные начертания. Это только просмотр: сам шрифт они не меняют.";
      });
    });
  }

  /* ---------- история редактора ---------- */
  function hookHist() {
    var h = $("#hist");
    if (!h || h.__cmp) return;
    h.__cmp = 1;
    var lst = $("#hist-l", h), empty = $("#hist-e", h);
    var foot = document.createElement("button");
    foot.type = "button"; foot.className = "hist-cmpf";
    foot.innerHTML = '<i class="ico i-cmp" aria-hidden="true"></i>Сравнить с другим шрифтом<i class="ico i-chev-right nx" aria-hidden="true"></i>';
    (empty || lst).after(foot);
    var pick = document.createElement("div");
    pick.className = "hist-pick";
    foot.after(pick);
    foot.addEventListener("click", function () { renderPick(pick); h.classList.add("cmp-pick"); var f = $(".hp-i", pick); if (f) f.focus({ preventScroll: true }); });
    pick.addEventListener("click", function (e) {
      if (e.target.closest("[data-hpback]")) { h.classList.remove("cmp-pick"); foot.focus({ preventScroll: true }); return; }
      var i = e.target.closest("[data-hp]");
      if (i) { var id = i.getAttribute("data-hp"); closeHist(); openLocal([liveItem(), fontItem(id)], foot); }
    });
    h.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && h.classList.contains("cmp-pick")) {
        e.stopPropagation(); e.preventDefault(); h.classList.remove("cmp-pick"); foot.focus({ preventScroll: true });
      }
    }, true);
    var addRows = function () {
      var t;
      try { t = HIST.st("ed"); } catch (e) { return; }
      if (!t) return;
      $$("li", lst).forEach(function (li) {
        var b = $(".hist-i", li);
        if (!b || $(".hist-cmp", li)) return;
        var i = +b.getAttribute("data-i");
        if (i === t.i) return;
        var c = document.createElement("button");
        c.type = "button"; c.className = "btn sm hist-cmp"; c.setAttribute("data-hi", String(i));
        c.textContent = "Сравнить";
        c.setAttribute("aria-label", "Сравнить с версией: " + (t.list[i] ? t.list[i].l : ""));
        li.appendChild(c);
      });
    };
    addRows();
    new MutationObserver(addRows).observe(lst, { childList: true });
    lst.addEventListener("click", function (e) {
      var c = e.target.closest(".hist-cmp");
      if (!c) return;
      e.stopPropagation(); e.preventDefault();
      var i = +c.getAttribute("data-hi");
      closeHist();
      openLocal([liveItem(), histItem(i)], c);
    }, true);
    new MutationObserver(function () { if (h.hidden) h.classList.remove("cmp-pick"); }).observe(h, { attributes: true, attributeFilter: ["hidden"] });
  }
  function closeHist() { try { HIST.close(false); } catch (e) {} }
  function renderPick(box) {
    var ids = Object.keys(FONTS).filter(function (id) { return id !== S.fontId && (id !== "imp" || (typeof impHasInk === "function" && impHasInk())); });
    box.innerHTML = '<div class="hp-h"><button type="button" class="ibtn sm" data-hpback aria-label="Назад к истории"><i class="ico i-chev-left" aria-hidden="true"></i></button>Выберите шрифт</div>' +
      '<div class="hp-l">' + ids.map(function (id) {
        return '<button type="button" class="hp-i" data-hp="' + esc(id) + '"><span>' + esc(fname(id)) + "</span><small>" + esc(fkind(id)) + "</small></button>";
      }).join("") + "</div>";
  }

  /* ---------- элементы сравнения ---------- */
  function fontItem(id) {
    return { key: id, id: id, name: fname(id), kind: fkind(id), slot: null, open: function () { libOpen(id); } };
  }
  function liveItem() {
    var id = S.fontId;
    return { key: "h:live", id: id, name: "Ваша версия", kind: fname(id) + " с вашими правками", slot: null, open: function () { window.setTab("edit"); } };
  }
  function histItem(i) {
    var t = HIST.st("ed"), e = t.list[i], id = S.fontId;
    var o = HIST.unflat(e.c);
    var slot = { styles: normStyles(id, o.styles), edits: o.edits || {} };
    var base = !!e.base;
    return {
      key: "h:" + i, id: id, slot: slot,
      name: base ? fname(id) + ", исходный" : e.l,
      kind: base ? "Исходное состояние: " + fname(id) + " из библиотеки" : "Версия из истории правок",
      open: function () { try { HIST.go("ed", i); } catch (x) {} window.setTab("edit"); },
    };
  }
  function draftItem(rec) {
    var pr = { fonts: {} };
    pr.fonts[rec.fid] = JSON.parse(JSON.stringify({ family: rec.data.family, edits: rec.data.edits, styles: rec.data.styles }));
    projSanitize(pr);
    var slot = mkSlot(rec.fid, pr.fonts[rec.fid]);
    return {
      key: "d:" + rec.id, id: rec.fid, slot: slot, name: rec.name,
      kind: "Черновик, редактор",
      open: function () { try { GT_DRAFTS.continueDraft(rec.id); } catch (e) {} },
    };
  }
  function resolveKeys(keys) {
    var needD = keys.some(isDraftKey);
    var p = needD ? readDrafts() : Promise.resolve([]);
    return p.then(function (recs) {
      var by = {};
      recs.forEach(function (r) { by[r.id] = r; });
      var out = [];
      keys.forEach(function (k) {
        if (isDraftKey(k)) {
          var r = by[k.slice(2)];
          if (r && r.mode === "edit" && r.data && FONTS[r.fid]) { try { out.push(draftItem(r)); } catch (e) {} }
        } else if (FONTS[k]) out.push(fontItem(k));
      });
      return out;
    });
  }
  function candidateKeys() {
    var keys = Object.keys(FONTS).filter(function (id) { return id !== "imp" || (typeof impHasInk === "function" && impHasInk()); });
    var dr = Object.keys(DRMETA).filter(function (id) { return DRMETA[id].mode === "edit"; }).map(function (id) { return "d:" + id; });
    return dr.concat(keys);
  }

  /* ---------- движок: тексты шрифтом сервиса ---------- */
  var RC = new Map();
  function runOf(it, txt) {
    var k = it.key + "\u0001" + txt, r = RC.get(k);
    if (r) return r;
    var back = S.fontId;
    try {
      useFont(it.id);
      r = libRun(it.id, txt, undefined, "regular", it.slot || undefined);
    } catch (e) { r = { items: [], tot: 0, cap: 700 }; }
    finally { try { if (FONTS[back]) useFont(back); } catch (e) {} }
    if (RC.size > 4000) RC.clear();
    RC.set(k, r);
    return r;
  }
  function nodesSig(run) {
    if (!run.items.length) return "";
    return JSON.stringify(run.items[0][0].cs.map(function (c) { return c.nodes.map(function (n) { return [Math.round(n.x), Math.round(n.y)]; }); }));
  }
  function inkOf(it) {
    if (it._ink) return it._ink;
    var r = runOf(it, "х"), xh = 0;
    if (r.items.length) r.items[0][0].cs.forEach(function (c) { c.nodes.forEach(function (n) { if (n.y > xh) xh = n.y; }); });
    if (!xh) xh = (runOf(it, "Н").cap || 700) * 0.72;
    var a = runOf(it, "а"), A = runOf(it, "А");
    var caps = !!a.items.length && !!A.items.length && nodesSig(a) === nodesSig(A);
    it._ink = { xh: xh, caps: caps };
    return it._ink;
  }
  function spaceW(it) {
    var r = runOf(it, " ");
    return r.tot > 0 ? r.tot : 260;
  }
  function wrap(it, text, size, maxw) {
    var sc = size / 1000, words = [], pos = 0, sw = spaceW(it) * sc;
    text.split(" ").forEach(function (w, i) {
      var start = text.indexOf(w, pos);
      if (w === "") { pos += 1; return; }
      var r = runOf(it, w);
      words.push({ s: w, start: start, end: start + w.length, run: r, w: r.tot * sc });
      pos = start + w.length;
    });
    var lines = [], cur = null;
    words.forEach(function (w) {
      if (cur && cur.w + sw + w.w <= maxw) { w.x = cur.w + sw; cur.w += sw + w.w; cur.words.push(w); }
      else { w.x = 0; cur = { w: w.w, words: [w] }; lines.push(cur); }
    });
    return { lines: lines, sc: sc, sw: sw };
  }

  /* ---------- состояние экрана ---------- */
  var CMP = {
    open: false, mode: "shared", items: [], cand: [], view: "side", text: phone() ? "Гармония" : "Гармония и ритм",
    want: 72, wantO: null, eff: 72, sel: "", from: "home", opener: null, hl: null, dom: null,
  };

  function buildView() {
    if (CMP.dom) return CMP.dom;
    var app = $(".app") || document.body;
    var v = document.createElement("section");
    v.className = "libview"; v.id = "view-cmp"; v.hidden = true; v.setAttribute("aria-label", "Сравнение шрифтов");
    v.setAttribute("data-view", "side");
    v.innerHTML =
      '<div class="vhead"><div><h2>Сравнение шрифтов</h2><p class="cmp-lead">Печатайте прямо в образце, текст одинаков во всех карточках.</p></div>' +
      '<div class="vctl"><button type="button" class="btn" id="cmp-close"><i class="ico i-close" aria-hidden="true"></i>Закрыть</button></div></div>' +
      '<div class="cmp-bar" role="group" aria-label="Параметры сравнения">' +
      '<div class="seg" id="cmp-seg" role="group" aria-label="Режим"><button type="button" data-v="side" aria-pressed="true" class="on">Рядом</button><button type="button" data-v="overlay" aria-pressed="false">Наложение</button></div>' +
      '<div class="cmp-sz"><label for="cmp-size">Размер</label><input id="cmp-size" type="range" min="16" max="160" step="1" value="72"><output id="cmp-sizev" for="cmp-size">72 px</output></div></div>' +
      '<div class="cmp-chiprow"><div class="cmp-cap" id="cmp-cnt"></div><div class="cmp-chips" id="cmp-chips" role="group" aria-label="Шрифты"></div></div>' +
      '<div class="cmp-stagewrap"><div><section class="cmp-stage" id="cmp-stage" aria-label="Наложение контуров"><div class="cmp-field" id="cmp-field"><canvas aria-hidden="true"></canvas><input class="cmp-in" id="cmp-in-o" type="text" maxlength="' + MAXLEN + '" autocomplete="off" spellcheck="false" aria-label="Образец в наложении"><i class="cmp-caret"></i></div><div class="cmp-legend" id="cmp-legend"></div></section></div></div>' +
      '<section class="cmp-grid" id="cmp-grid" aria-label="Выбранные шрифты"></section>';
    app.appendChild(v);
    CMP.dom = {
      v: v, seg: $("#cmp-seg", v), size: $("#cmp-size", v), out: $("#cmp-sizev", v), chips: $("#cmp-chips", v), cnt: $("#cmp-cnt", v),
      stage: $("#cmp-stage", v), field: $("#cmp-field", v), legend: $("#cmp-legend", v), grid: $("#cmp-grid", v), inO: $("#cmp-in-o", v),
      caret: $(".cmp-caret", v),
    };
    wireView();
    return CMP.dom;
  }

  function markSvg(i, card) {
    var l = LINES[i];
    return '<svg class="cmp-mk" viewBox="0 0 28 8" aria-hidden="true"><line x1="1" x2="27" y1="4" y2="4" stroke="' + (card ? MARKS[i] : l.c) + '" stroke-width="' + l.w + '"' +
      (l.d.length ? ' stroke-dasharray="' + l.d.join(" ") + '"' : "") + ' stroke-linecap="' + l.cap + '"/></svg>';
  }

  function selKey() {
    if (!CMP.items.some(function (x) { return x.key === CMP.sel; })) CMP.sel = CMP.items[0] ? CMP.items[0].key : "";
    return CMP.sel;
  }

  function renderChips() {
    var d = CMP.dom, on = CMP.items.map(function (x) { return x.key; });
    var list = CMP.cand;
    d.chips.innerHTML = list.map(function (c) {
      var isOn = on.indexOf(c.key) >= 0, dis = !isOn && CMP.items.length >= MAXN;
      return '<button type="button" class="cmp-chip" data-k="' + esc(c.key) + '" aria-pressed="' + isOn + '"' + (dis ? ' aria-disabled="true"' : "") + '><span class="ck"><i class="ico i-check" aria-hidden="true"></i></span>' + esc(c.name) + "</button>";
    }).join("");
    d.cnt.textContent = "Выбрано " + CMP.items.length + " из " + MAXN;
    var ob = $('[data-v="overlay"]', d.seg);
    if (CMP.items.length < 2) ob.setAttribute("aria-disabled", "true"); else ob.removeAttribute("aria-disabled");
    edge();
  }
  function edge() {
    var e = CMP.dom && CMP.dom.chips; if (!e) return;
    var l = e.scrollLeft > 2, r = e.scrollLeft + e.clientWidth < e.scrollWidth - 2;
    e.setAttribute("data-hs", (l ? "l " : "") + (r ? "r" : ""));
  }

  function cardHTML(it, i) {
    var info = inkOf(it), sel = it.key === selKey();
    return '<article class="cmp-card' + (sel ? " sel" : "") + '" data-k="' + esc(it.key) + '" aria-label="' + esc(it.name) + '">' +
      '<div class="cmp-fh">' + markSvg(i, true) + '<div class="cmp-ft"><b>' + esc(it.name) + "</b><small>" + esc(it.kind || "") + "</small></div>" +
      '<button type="button" class="cmp-x" data-rm="' + esc(it.key) + '" aria-label="Убрать «' + esc(it.name) + '» из сравнения" title="Убрать из сравнения"' + (CMP.items.length <= 1 ? " disabled" : "") + '><i class="ico i-close" aria-hidden="true"></i></button></div>' +
      '<div class="cmp-sw"><div><div class="cmp-sample"><canvas aria-hidden="true"></canvas><input class="cmp-in" type="text" maxlength="' + MAXLEN + '" autocomplete="off" spellcheck="false" aria-label="Образец: ' + esc(it.name) + '"><i class="cmp-caret"></i></div>' +
      (info.caps ? '<p class="cmp-note">Строчные нарисованы как прописные. В паре со строчными этого шрифта сравнивайте высоту и ширину знаков.</p>' : "") +
      '</div></div><button type="button" class="btn cmp-open' + (sel ? " pri" : "") + '" data-open="' + esc(it.key) + '">Открыть в редакторе</button></article>';
  }

  function renderCards(newKey) {
    var d = CMP.dom, n = CMP.items.length;
    d.grid.style.setProperty("--n", Math.max(2, n));
    d.grid.setAttribute("data-n", String(n));
    d.grid.innerHTML = CMP.items.map(cardHTML).join("") +
      (n < 2 ? '<div class="cmp-slot"><b>Добавьте второй шрифт</b><span>Выберите его в ряду выше, и карточки встанут рядом.</span></div>' : "");
    if (newKey) { var c = $('[data-k="' + newKey.replace(/"/g, '\\"') + '"]', d.grid); if (c && !still()) c.classList.add("in"); }
    $$(".cmp-in", d.grid).forEach(function (i) { i.value = CMP.text; });
    d.inO.value = CMP.text;
    renderLegend();
    layout();
  }
  function renderLegend() {
    var d = CMP.dom;
    var notes = CMP.items.filter(function (x) { return inkOf(x).caps; }).map(function (x) {
      return '<span class="cmp-gx nt">' + esc(x.name) + ": строчные нарисованы как прописные</span>";
    }).join("");
    d.legend.innerHTML = CMP.items.map(function (x, i) {
      return '<span class="cmp-lg" tabindex="0" data-i="' + i + '">' + markSvg(i) + esc(x.name) + "</span>";
    }).join("") + notes + '<span class="cmp-gx">Тонкие линии показывают высоту строчных</span>';
  }

  /* размеры: предел по ширине */
  function fitMax() {
    var d = CMP.dom, t = CMP.text || "Аа";
    if (CMP.view === "overlay" && CMP.items.length) {
      var cs = getComputedStyle(d.stage);
      var W = d.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
      var tot = cells(t).reduce(function (a, c) { return a + c.w; }, 0);
      return Math.floor(W / Math.max(tot, 1) * 1000);
    }
    var cap = 999;
    $$(".cmp-sample", d.grid).forEach(function (s, i) {
      var it = CMP.items[i]; if (!it) return;
      var W = s.clientWidth - 2 * padOf();
      var lw = 1;
      t.split(" ").forEach(function (w) { if (w) lw = Math.max(lw, runOf(it, w).tot); });
      cap = Math.min(cap, Math.floor(W / lw * 1000));
    });
    return cap;
  }
  function padOf() { return phone() ? 14 : 18; }
  function cells(t) {
    return Array.prototype.map.call(t, function (ch) {
      var w = 0;
      CMP.items.forEach(function (it) { w = Math.max(w, runOf(it, ch).tot || 0); });
      if (!w) w = ch === " " ? 260 : 0;
      return { ch: ch, w: w };
    });
  }

  function applySize() {
    if (!CMP.open) return;
    var d = CMP.dom, ov = CMP.view === "overlay";
    var mx = Math.max(24, Math.min(ov ? 400 : 200, fitMax()));
    d.size.max = String(mx);
    var w = ov ? (CMP.wantO == null ? Math.round(mx * 0.9) : CMP.wantO) : CMP.want;
    var v = Math.max(16, Math.min(w, mx));
    d.size.value = String(v); CMP.eff = v;
    d.out.textContent = v + " px";
    var p = (v - 16) / Math.max(1, mx - 16) * 100;
    d.size.style.setProperty("--lo", "0%"); d.size.style.setProperty("--hi", p + "%");
    draw();
  }

  function layout() {
    if (!CMP.open) return;
    /* высота образцов под самый длинный перенос; потом рисуем */
    var d = CMP.dom;
    if (CMP.view === "side") {
      var need = 180, size = CMP.eff || 72;
      $$(".cmp-sample", d.grid).forEach(function (s, i) {
        var it = CMP.items[i]; if (!it) return;
        var W = s.clientWidth - 2 * padOf();
        var L = wrap(it, CMP.text, size, W);
        need = Math.max(need, Math.round(L.lines.length * size * 1.2 + 2 * padOf() + 8));
      });
      $$(".cmp-sample", d.grid).forEach(function (s) { s.style.minHeight = need + "px"; });
    }
    applySize();
  }

  function fitCv(cv) {
    var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    return { c: c, w: w, h: h };
  }

  function drawSide() {
    var d = CMP.dom, size = CMP.eff, ink = "#141416";
    $$(".cmp-sample", d.grid).forEach(function (s, i) {
      var it = CMP.items[i]; if (!it) return;
      var cv = $("canvas", s), f = fitCv(cv), c = f.c, pad = padOf();
      var L = wrap(it, CMP.text, size, f.w - 2 * pad), lh = size * 1.2;
      var total = L.lines.length * lh, top = Math.max(pad * 0.5, (f.h - total) / 2);
      c.fillStyle = ink;
      var caretPos = null, idx = caretIndex(s);
      L.lines.forEach(function (ln, li) {
        var base = top + li * lh + lh * 0.5 + (runOf(it, "Н").cap || 700) * L.sc * 0.5;
        ln.words.forEach(function (w) {
          var x0 = pad + w.x;
          w.run.items.forEach(function (p) {
            c.fill(pathOf(p[0].cs, function (px, py) { return [x0 + (p[1] + px) * L.sc, base - py * L.sc]; }), "nonzero");
          });
          if (idx != null && idx >= w.start && idx <= w.end) {
            var pre = runOf(it, w.s.slice(0, idx - w.start)).tot * L.sc;
            caretPos = { x: x0 + pre, y: top + li * lh };
          }
        });
        if (idx != null && !caretPos && ln.words.length && idx > ln.words[ln.words.length - 1].end) {
          var lw = ln.words[ln.words.length - 1];
          var nx = L.lines[li + 1];
          if (!nx || idx < nx.words[0].start) caretPos = { x: pad + lw.x + lw.w + (idx > lw.end ? L.sw * (idx - lw.end) : 0), y: top + li * lh };
        }
      });
      placeCaret($(".cmp-caret", s), caretPos, lh * 0.8, lh * 0.1);
    });
  }
  function caretIndex(box) {
    var i = $(".cmp-in", box);
    if (!i || document.activeElement !== i) return null;
    return i.selectionStart === i.selectionEnd ? i.selectionStart : null;
  }
  function placeCaret(el, pos, h, dy) {
    if (!el) return;
    if (!pos) { el.style.display = ""; el.style.left = "-9px"; return; }
    el.style.display = "block";
    el.style.left = pos.x + "px"; el.style.top = (pos.y + dy) + "px"; el.style.height = h + "px";
  }

  function drawOverlay() {
    var d = CMP.dom, size = CMP.eff, cv = $("canvas", d.field);
    var cs = cells(CMP.text), sc = size / 1000;
    var cw = d.field.clientWidth, H = Math.round(size * 1.3);
    d.field.style.height = H + "px";
    var f = fitCv(cv), c = f.c;
    var tot = cs.reduce(function (a, x) { return a + x.w; }, 0) * sc;
    var x0 = Math.max(0, (f.w - tot) / 2), base = Math.round(size * 1.0);
    c.strokeStyle = "rgba(20,20,22,.3)"; c.lineWidth = 1; c.setLineDash([]);
    c.beginPath(); c.moveTo(0, base + 0.5); c.lineTo(f.w, base + 0.5); c.stroke();
    c.fillStyle = "#6a6a72"; c.font = "500 12px " + (css("--f-ui") || "Onest, system-ui, sans-serif"); c.textAlign = "right";
    c.fillText("Базовая линия", f.w, base + 16);
    var hl = CMP.hl;
    CMP.items.forEach(function (it, i) {
      var l = LINES[i], dim = hl != null && hl !== i, on = hl === i;
      c.globalAlpha = dim ? 0.35 : 1;
      var yx = base - inkOf(it).xh * sc;
      c.strokeStyle = l.c; c.lineWidth = 1; c.setLineDash([]); c.globalAlpha = (dim ? 0.35 : 1) * 0.4;
      c.beginPath(); c.moveTo(0, Math.round(yx) + 0.5); c.lineTo(f.w, Math.round(yx) + 0.5); c.stroke();
      c.globalAlpha = dim ? 0.35 : 1;
      c.strokeStyle = on ? "#141416" : l.c; c.lineWidth = on ? 2.75 : l.w; c.setLineDash(l.d); c.lineCap = l.cap; c.lineJoin = "round";
      var x = x0;
      cs.forEach(function (cell) {
        if (cell.ch !== " ") {
          var r = runOf(it, cell.ch), ox = x + (cell.w - r.tot) / 2 * sc;
          r.items.forEach(function (p) {
            c.stroke(pathOf(p[0].cs, function (px, py) { return [ox + (p[1] + px) * sc, base - py * sc]; }));
          });
        }
        x += cell.w * sc;
      });
    });
    c.globalAlpha = 1; c.setLineDash([]);
    var i = d.inO, idx = document.activeElement === i && i.selectionStart === i.selectionEnd ? i.selectionStart : null;
    if (idx != null) {
      var cx = x0; for (var k = 0; k < Math.min(idx, cs.length); k++) cx += cs[k].w * sc;
      d.caret.style.display = "block"; d.caret.style.left = (cx - 1) + "px"; d.caret.style.top = (base - size * 0.8) + "px"; d.caret.style.height = size + "px";
    } else d.caret.style.display = "";
  }
  function draw() {
    if (!CMP.open) return;
    if (CMP.view === "overlay") drawOverlay(); else drawSide();
  }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  /* ---------- открытие и закрытие ---------- */
  function syncShared() {
    resolveKeys(SEL).then(function (items) {
      if (!CMP.open || CMP.mode !== "shared") return;
      var prev = CMP.items.map(function (x) { return x.key; });
      CMP.items = items;
      if (!items.length) { closeCmp(); return; }
      var added = items.map(function (x) { return x.key; }).filter(function (k) { return prev.indexOf(k) < 0; })[0];
      if (CMP.view === "overlay" && items.length < 2) setView("side", true);
      var gone = prev.filter(function (k) { return !items.some(function (x) { return x.key === k; }); });
      var swap = function () { renderChips(); renderCards(added); };
      if (gone.length && !still()) {
        var cards = gone.map(function (k) { return $('[data-k="' + k.replace(/"/g, '\\"') + '"]', CMP.dom.grid); }).filter(Boolean);
        cards.forEach(function (c) { c.classList.add("out"); });
        setTimeout(swap, 180);
      } else swap();
    });
  }

  function showView() {
    var d = buildView();
    $$(".app > section, .app > .cols").forEach(function (e) { if (e !== d.v) e.hidden = true; });
    document.body.classList.add("tab-lib");
    document.body.classList.remove("tab-proof");
    d.v.hidden = false;
    d.v.classList.remove("cmp-out");
    d.v.classList.remove("cmp-in"); void d.v.offsetWidth;
    if (!still()) d.v.classList.add("cmp-in");
    d.v.scrollTop = 0;
    window.scrollTo(0, 0);
    renderTray();
  }

  function begin(items, mode, opener) {
    if (!items.length) { say("Нечего сравнивать: выберите шрифты."); return; }
    ensureStyles();
    try { if (window.HIST && HIST.open === true) HIST.close(false); } catch (e) {}
    CMP.mode = mode; CMP.items = items; CMP.from = tabNow() === "compare" ? CMP.from : tabNow();
    CMP.opener = opener || document.activeElement; CMP.sel = items[0].key;
    CMP.view = "side"; CMP.wantO = null; CMP.hl = null; RC.clear();
    var d = buildView();
    d.v.setAttribute("data-view", "side");
    $$("button", d.seg).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === "side")); b.classList.toggle("on", b.getAttribute("data-v") === "side"); });
    var have = items.map(function (x) { return x.key; });
    var candItems = candidateKeys().filter(function (k) { return have.indexOf(k) < 0; });
    CMP.cand = items.map(function (x) { return { key: x.key, name: x.name }; }).concat(candItems.map(function (k) { return { key: k, name: keyName(k) }; }));
    CMP.open = true;
    showView();
    renderChips(); renderCards();
    setTimeout(function () { layout(); edge(); }, 40);
    var cl = $("#cmp-close", d.v); if (cl) cl.focus({ preventScroll: true });
  }
  function openShared(opener) {
    resolveKeys(SEL).then(function (items) {
      if (items.length < 1) return;
      begin(items, "shared", opener);
    });
  }
  function openLocal(items, opener) { begin(items, "local", opener); }

  function closeCmp(silent) {
    if (!CMP.open) return;
    var d = CMP.dom;
    CMP.open = false;
    var back = CMP.from, op = CMP.opener;
    var done = function () {
      d.v.hidden = true; d.v.classList.remove("cmp-out", "cmp-in");
      if (!silent) {
        window.setTab(back);
        requestAnimationFrame(function () {
          renderTray();
          try { if (op && document.contains(op) && op.offsetParent !== null) op.focus({ preventScroll: true }); else { var g = $("#cmp-go") || $('.rail [data-tab="' + back + '"]'); if (g) g.focus({ preventScroll: true }); } } catch (e) {}
        });
      }
    };
    if (silent || still()) { done(); return; }
    d.v.classList.remove("cmp-in"); d.v.classList.add("cmp-out");
    setTimeout(done, 250);
  }

  function setView(v, quiet) {
    if (v === CMP.view) return;
    if (v === "overlay" && CMP.items.length < 2) return;
    var d = CMP.dom;
    CMP.view = v; d.v.setAttribute("data-view", v);
    $$("button", d.seg).forEach(function (b) { var on = b.getAttribute("data-v") === v; b.setAttribute("aria-pressed", String(on)); b.classList.toggle("on", on); });
    layout();
    setTimeout(layout, 60); setTimeout(layout, 360);
  }

  function setHl(i) { CMP.hl = i; draw(); }

  /* ---------- события экрана ---------- */
  function wireView() {
    var d = CMP.dom;
    $("#cmp-close", d.v).addEventListener("click", function () { closeCmp(); });
    d.seg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.getAttribute("aria-disabled") === "true") { say("Для наложения нужно не меньше двух шрифтов."); return; }
      setView(b.getAttribute("data-v"));
    });
    d.size.addEventListener("input", function () {
      if (CMP.view === "overlay") CMP.wantO = +d.size.value; else CMP.want = +d.size.value;
      layout();
    });
    d.chips.addEventListener("scroll", edge);
    d.chips.addEventListener("click", function (e) {
      var b = e.target.closest(".cmp-chip"); if (!b) return;
      var k = b.getAttribute("data-k"), on = CMP.items.some(function (x) { return x.key === k; });
      if (!on && CMP.items.length >= MAXN) { say("В сравнении не больше четырёх шрифтов. Уберите один, чтобы добавить другой."); return; }
      if (on && CMP.items.length <= 1) { say("В сравнении остаётся хотя бы один шрифт."); return; }
      toggleItem(k);
    });
    d.grid.addEventListener("click", function (e) {
      var r = e.target.closest("[data-rm]");
      if (r && !r.disabled) { toggleItem(r.getAttribute("data-rm")); return; }
      var o = e.target.closest("[data-open]");
      if (o) { var it = CMP.items.filter(function (x) { return x.key === o.getAttribute("data-open"); })[0]; if (it) openItem(it); return; }
      var s = e.target.closest(".cmp-sample");
      if (s && !e.target.closest(".cmp-in")) $(".cmp-in", s).focus();
    });
    d.grid.addEventListener("pointerdown", function (e) { var c = e.target.closest(".cmp-card"); if (c) pickCard(c.getAttribute("data-k")); });
    d.grid.addEventListener("focusin", function (e) {
      var c = e.target.closest(".cmp-card");
      if (c) { pickCard(c.getAttribute("data-k")); if (CMP.view === "overlay") setHl(CMP.items.map(function (x) { return x.key; }).indexOf(c.getAttribute("data-k"))); }
      if (e.target.matches(".cmp-in")) draw();
    });
    d.grid.addEventListener("focusout", function () { setHl(null); setTimeout(draw, 0); });
    d.grid.addEventListener("mouseover", function (e) {
      var c = e.target.closest(".cmp-card");
      if (c && CMP.view === "overlay") setHl(CMP.items.map(function (x) { return x.key; }).indexOf(c.getAttribute("data-k")));
    });
    d.grid.addEventListener("mouseleave", function () { setHl(null); });
    d.legend.addEventListener("mouseover", function (e) { var l = e.target.closest(".cmp-lg"); if (l) setHl(+l.getAttribute("data-i")); });
    d.legend.addEventListener("mouseleave", function () { setHl(null); });
    d.legend.addEventListener("focusin", function (e) { var l = e.target.closest(".cmp-lg"); if (l) setHl(+l.getAttribute("data-i")); });
    d.legend.addEventListener("focusout", function () { setHl(null); });
    d.stage.addEventListener("click", function (e) { if (!e.target.closest(".cmp-lg")) d.inO.focus(); });
    d.v.addEventListener("input", function (e) {
      var el = e.target; if (!el.classList.contains("cmp-in")) return;
      var t = el.value.replace(/\n/g, " ");
      if (t.length > MAXLEN) { t = t.slice(0, MAXLEN); el.value = t; }
      CMP.text = t;
      $$(".cmp-in", d.v).forEach(function (i) { if (i !== el && i.value !== t) i.value = t; });
      renderLegend(); layout();
    });
    ["keyup", "click", "select", "focus", "blur"].forEach(function (ev) {
      d.v.addEventListener(ev, function (e) { if (e.target.classList && e.target.classList.contains("cmp-in")) setTimeout(draw, 0); }, true);
    });
    document.addEventListener("selectionchange", function () { if (CMP.open && document.activeElement && document.activeElement.classList.contains("cmp-in")) draw(); });
    addEventListener("resize", function () { if (CMP.open) { layout(); edge(); } });
    if (window.ResizeObserver) new ResizeObserver(function () { if (CMP.open) draw(); }).observe(d.grid);
    new MutationObserver(function () { if (CMP.open) { RC.clear(); draw(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  function pickCard(k) {
    if (CMP.sel === k) return;
    CMP.sel = k;
    $$(".cmp-card", CMP.dom.grid).forEach(function (c) {
      var on = c.getAttribute("data-k") === k;
      c.classList.toggle("sel", on);
      var b = $(".cmp-open", c); if (b) b.classList.toggle("pri", on);
    });
  }
  function toggleItem(k) {
    if (CMP.mode === "shared") {
      var on = SEL.indexOf(k) >= 0;
      if (!on && SEL.length >= MAXN) { say("В сравнении не больше четырёх шрифтов. Уберите один, чтобы добавить другой."); return; }
      if (on && SEL.length <= 1) return;
      toggleKey(k);
      return;
    }
    var i = -1;
    CMP.items.forEach(function (x, j) { if (x.key === k) i = j; });
    if (i >= 0) {
      if (CMP.items.length <= 1) return;
      var cards = $('[data-k="' + k.replace(/"/g, '\\"') + '"]', CMP.dom.grid);
      CMP.items.splice(i, 1);
      if (CMP.view === "overlay" && CMP.items.length < 2) setView("side", true);
      renderChips();
      if (cards && !still()) { cards.classList.add("out"); setTimeout(function () { renderCards(); }, 180); } else renderCards();
    } else {
      resolveKeys([k]).then(function (items) {
        if (!items[0]) return;
        CMP.items.push(items[0]);
        renderChips(); renderCards(k);
      });
    }
  }
  function openItem(it) {
    CMP.open = false;
    CMP.dom.v.hidden = true;
    document.body.classList.remove("cmp-tray-on");
    try { it.open(); } catch (e) {}
    setTimeout(renderTray, 50);
  }

  /* ---------- Esc и смена вкладки ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !CMP.open) return;
    if ($(".menu70") || ($("#toast.on") && false)) return;
    e.preventDefault(); e.stopPropagation();
    closeCmp();
  }, true);

  function hookTab() {
    if (typeof window.setTab !== "function" || window.setTab.__cmp) return;
    var o = window.setTab;
    var w = function () {
      if (CMP.open) {
        CMP.open = false;
        CMP.dom.v.hidden = true; CMP.dom.v.classList.remove("cmp-in", "cmp-out");
      }
      var r = o.apply(this, arguments);
      var tn = tabNow();
      if (MODE === "fav" && tn !== "fav") MODE = null;
      if (MODE === "drafts" && tn !== "profile" && tn !== "folder") MODE = null;
      setTimeout(function () { sweep(); renderTray(); markCards(); }, 0);
      return r;
    };
    w.__cmp = 1;
    window.setTab = w;
  }

  /* ---------- обход DOM ---------- */
  var sweeping = false;
  function sweep() {
    if (sweeping) return;
    sweeping = true;
    try {
      ensureStyles();
      hookMenu();
      hookHcard();
      hookFav();
      hookDrafts();
      hookHist();
      renameTwoLines();
      markCards();
    } catch (e) { console.error(e); }
    finally { sweeping = false; }
  }

  function boot() {
    ensureStyles();
    loadSel();
    buildTray();
    hookTab();
    sweep();
    renderTray();
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(sweep, 60); })
      .observe(document.body, { childList: true, subtree: true });
    if (window.GT_DRAFTS && GT_DRAFTS.whenReady) GT_DRAFTS.whenReady(function () { refreshDraftMeta(); saveSel(); sweep(); renderTray(); });
    window.addEventListener("storage", function (e) { if (e.key === KEY) { loadSel(); changed(); } });
    window.GT_COMPARE = {
      sel: function () { return SEL.slice(); },
      add: addKey, remove: removeKey, toggle: toggleKey, clear: function () { setSel([]); },
      open: function () { openShared(null); },
      close: function () { closeCmp(); },
      isOpen: function () { return CMP.open; },
      view: function () { return CMP.view; },
      items: function () { return CMP.items.map(function (x) { return x.key; }); },
      selected: function () { return CMP.sel; },
      max: MAXN,
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
