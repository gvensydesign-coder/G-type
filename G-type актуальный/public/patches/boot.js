(function () {
  function add(src) {
    var s = document.createElement("script");
    s.src = src + "?t=" + Date.now();
    document.body.appendChild(s);
  }
  function start() {
    add("/patches/layout.js");
    add("/patches/visual.js");
    add("/patches/distortion.js");
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
