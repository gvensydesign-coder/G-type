#!/usr/bin/env python3
"""Собрать финальную страницу сервиса.

v94 собирается из template.html и модулей. delta/*.diff поднимает
ядро, интерфейс, сообщество и разметку до упакованной v96.
Патчи public/patches вшиваются в конец страницы.
"""
import hashlib
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
DELTA = ROOT / "delta"
OUT = REPO / "public" / "g-type-v96.html"
PATCHES = ["layout.js", "visual.js", "distortion.js"]

EXPECT = {
    "html": "b60faf4ac0d7",
    "zc": "58f34118fde5",
    "zu": "be2531ebd731",
    "zm": "a71ebbed2d32",
}


def sha(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:12]


DIFF_FILE = {"html": "html.diff", "zc": "core.diff", "zu": "ui.diff", "zm": "zm.diff"}


def apply_diff(name: str, text: str) -> str:
    diff = DELTA / DIFF_FILE[name]
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / f"{name}.txt"
        target.write_text(text, encoding="utf-8")
        proc = subprocess.run(
            ["patch", "--forward", "--batch", "-p0", str(target)],
            input=diff.read_bytes(),
            cwd=tmp,
        )
        if proc.returncode != 0:
            sys.exit(f"delta/{name}.diff не встал на свежую сборку v94")
        return target.read_text(encoding="utf-8")


def split_page(html: str):
    marker = '<script type="text/plain" id="zc"'
    at = html.find(marker)
    if at < 0:
        sys.exit("в собранной странице нет блока zc")
    rest = html[at:]
    blocks = {}
    for ident in ("zc", "zu", "zm"):
        m = re.search(
            rf'<script type="text/plain" id="{ident}" data-n="(\d+)">([^<]*)</script>',
            rest,
        )
        if not m:
            sys.exit(f"нет блока {ident}")
        blocks[ident] = m.group(2)
    boot = re.search(r'<script id="zb">.*?</script>', rest, re.S)
    if not boot:
        sys.exit("нет стартового скрипта zb")
    return html[:at], blocks, boot.group(0)


def main():
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    import assemble  # запускает сборку v94 и пишет index.html

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    prefix, blocks, boot = split_page(html)

    decoded = {
        "zc": assemble.b91dec(blocks["zc"]),
        "zu": assemble.b91dec(blocks["zu"]),
        "zm": assemble.b91dec(blocks["zm"]),
    }
    import zlib

    plain = {
        ident: zlib.decompress(decoded[ident], -15).decode("utf-8")
        for ident in decoded
    }
    plain["html"] = prefix

    lifted = {name: apply_diff(name, plain[name]) for name in ("html", "zc", "zu", "zm")}
    for name, text in lifted.items():
        digest = sha(text.encode("utf-8"))
        if digest != EXPECT[name]:
            sys.exit(f"{name}: ожидался {EXPECT[name]}, получился {digest}")

    packed = {}
    for ident in ("zc", "zu", "zm"):
        b91, raw_len, _ = assemble.zpack(lifted[ident])
        packed[ident] = (raw_len, b91)

    curator = "\n".join(
        (REPO / "public" / "patches" / name).read_text(encoding="utf-8")
        for name in PATCHES
    )
    if "</script" in curator:
        sys.exit("патч содержит закрытие script")

    page = lifted["html"]
    blk = '<script type="text/plain" id="%s" data-n="%d">%s</script>\n'
    page += blk % ("zc", packed["zc"][0], packed["zc"][1])
    page += blk % ("zu", packed["zu"][0], packed["zu"][1])
    page += boot + "\n"
    page += blk % ("zm", packed["zm"][0], packed["zm"][1])
    page += '<script id="gtype-curator">\n' + curator + "\n</script>\n</body></html>\n"
    OUT.write_text(page, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
