(function () {
  var STYLE_ID = "gtype-layout-patch";
  var CARD_IDS = ["flow-card", "imp-card", "draw-card", "paper-card"];

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      "#createcards{grid-template-columns:repeat(2,minmax(0,1fr))!important}" +
      "@media (max-width:720px){#createcards{grid-template-columns:minmax(0,1fr)!important}}" +
      "#createcards #flow-card,#createcards #imp-card,#createcards #draw-card,#createcards #paper-card{" +
      "grid-column:auto!important}" +
      "#createcards #flow-card{order:1!important}" +
      "#createcards #imp-card{order:2!important}" +
      "#createcards #draw-card{order:3!important}" +
      "#createcards #paper-card{order:4!important}" +
      "#view-paper .pp-head{justify-content:flex-start!important}" +
      "@media (min-width:1400px){" +
      "#view-paper .pp-wrap{max-width:none!important;width:100%!important}}";
    document.head.appendChild(st);
  }

  function orderCreateCards() {
    var box = document.getElementById("createcards");
    if (!box) return;
    var anchor = null;
    CARD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.parentNode !== box) return;
      if (anchor && el.previousElementSibling !== anchor) anchor.after(el);
      anchor = el;
    });
  }

  function removePpHome() {
    var view = document.getElementById("view-paper");
    if (!view) return;
    var btn = view.querySelector("#pp-home");
    if (btn) btn.remove();
  }

  function removeLessonsByTopic() {
    document.querySelectorAll(".cm-tool").forEach(function (el) {
      var h = el.querySelector("h3");
      if (h && h.textContent.trim() === "Уроки по теме") el.remove();
    });
  }

  var applying = false;
  function apply() {
    if (applying) return;
    applying = true;
    try {
      ensureStyles();
      orderCreateCards();
      removePpHome();
      removeLessonsByTopic();
    } finally {
      applying = false;
    }
  }

  apply();
  new MutationObserver(apply).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();