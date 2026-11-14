(function () {
  var STYLE_ID = "gtype-art-patch";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      "#createcards #flow-card.lcard .imp-ph::after{background-image:url(\"art/flow.webp\")}" +
      "#createcards #draw-card.lcard .imp-ph::after{background-image:url(\"art/own.webp\")}" +
      "#createcards #paper-card.lcard .imp-ph::after{background-image:url(\"art/paper.webp\")}" +
      "#view-flow .fl-next::before{content:\"\";display:block;width:min(260px,70%);aspect-ratio:600/403;margin:0 auto var(--s4);background:url(\"art/next.webp\") center/contain no-repeat;flex:none}" +
      ".es-art.gt-art-coll{background-image:url(\"art/collections.webp\")}" +
      ".es-art.gt-art-draft{background-image:url(\"art/drafts.webp\")}";
    document.body.appendChild(st);
  }

  function tagEmpties() {
    var nodes = document.querySelectorAll(".es");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var title = el.querySelector(".es-t");
      var art = el.querySelector(".es-art");
      if (!title || !art) continue;
      var text = title.textContent || "";
      if (text.indexOf("Подборок") !== -1) art.classList.add("gt-art-coll");
      else if (text.indexOf("черновик") !== -1) art.classList.add("gt-art-draft");
    }
  }

  function boot() {
    ensureStyles();
    tagEmpties();
    var obs = new MutationObserver(tagEmpties);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
