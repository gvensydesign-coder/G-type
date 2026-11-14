// Test helper: loaded with `node -r ./fixed_clock.js ...`. Freezes Date.now() so the font
// head.modified timestamp is constant and TTF/WOFF md5s are reproducible. Not part of the page.
Date.now = () => 1760000000000;
