#!/usr/bin/env python3
"""Compare editor artifacts by decoded content across zlib versions."""
import hashlib
import re
import sys
import zlib
from pathlib import Path

BLOCK = re.compile(r'<script type="text/plain" id="(zc|zu|zm)" data-n="(\d+)">([^<]*)</script>')
B91 = [chr(c) for c in range(33, 127) if c not in (39, 60, 92)]


def b91dec(value):
    table = {c: i for i, c in enumerate(B91)}
    out = bytearray()
    v, bits, count = -1, 0, 0
    for char in value:
        digit = table.get(char)
        if digit is None:
            continue
        if v < 0:
            v = digit
            continue
        v += digit * 91
        bits |= v << count
        count += 13 if (v & 8191) > 88 else 14
        while count > 7:
            out.append(bits & 255)
            bits >>= 8
            count -= 8
        v = -1
    if v > -1:
        out.append((bits | v << count) & 255)
    return bytes(out)


def normalized(path):
    page = Path(path).read_text(encoding="utf-8")
    found = []

    def replace(match):
        ident, length, packed = match.groups()
        plain = zlib.decompress(b91dec(packed), -15)
        if len(plain) != int(length):
            raise ValueError(f"{path}: wrong decoded length for {ident}")
        found.append(ident)
        digest = hashlib.sha256(plain).hexdigest()
        return f'<script id="{ident}" data-n="{length}" data-sha256="{digest}"></script>'

    result = BLOCK.sub(replace, page)
    if sorted(found) != ["zc", "zm", "zu"]:
        raise ValueError(f"{path}: expected zc, zu, zm blocks")
    return result


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: compare_artifacts.py committed.html rebuilt.html")
    committed, rebuilt = normalized(sys.argv[1]), normalized(sys.argv[2])
    if committed != rebuilt:
        at = next((i for i, (a, b) in enumerate(zip(committed, rebuilt)) if a != b), min(len(committed), len(rebuilt)))
        lo, hi = max(0, at - 32), at + 64
        sys.exit(f"committed and rebuilt editors differ at {at}: "
                 f"{committed[lo:hi]!r} != {rebuilt[lo:hi]!r}; "
                 f"lengths {len(committed)} and {len(rebuilt)}")
    print("committed and rebuilt editors match after decoding")
