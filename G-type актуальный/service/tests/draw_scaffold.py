"""Test scaffold: a fixed full-screen #view-draw section (until the shell provides one) + mount of GT_DRAW."""
SCAFFOLD = """() => {
  let sec = document.getElementById('view-draw');
  if (!sec) { sec = document.createElement('section'); sec.id = 'view-draw';
    sec.style.cssText = 'position:fixed;inset:0;z-index:60;background:var(--bg,#e7e7ea);padding:16px;overflow:hidden';
    document.body.appendChild(sec); }
  if (typeof setTab === 'function') setTab('draw');  /* the real app path: hides the library views and switches the rail */
  sec.hidden = false;
  GT_DRAW.mount(sec); GT_DRAW.onShow();
  return !!document.getElementById('gtdraw');
}"""
