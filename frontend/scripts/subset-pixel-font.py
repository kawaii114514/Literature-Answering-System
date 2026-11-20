"""Subset Fusion Pixel Font (12px proportional, zh_hans) for the LitEvidence frontend.

The full font carries ~38k glyphs (~700 KB). The UI only uses it for short labels and
book spines, so we ship two WOFF2 files split by unicode-range:

  fusion-pixel-12px-latin.woff2  Latin, punctuation, arrows and a few symbols
  fusion-pixel-12px-zh.woff2     CJK punctuation, full-width forms and the 6763 GB2312 hanzi

Usage (needs `pip install fonttools brotli`):

  gh release download <tag> --repo TakWolf/fusion-pixel-font \
      --pattern "fusion-pixel-font-12px-proportional-otf.woff2-v<tag>.zip"
  python frontend/scripts/subset-pixel-font.py <unzipped dir>

Font: https://github.com/TakWolf/fusion-pixel-font (SIL Open Font License 1.1).
"""
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

SOURCE = "fusion-pixel-12px-proportional-zh_hans.otf.woff2"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "fonts")


def gb2312(lo: int, hi: int) -> str:
    chars = []
    for lead in range(lo, hi + 1):
        for trail in range(0xA1, 0xFF):
            try:
                chars.append(bytes([lead, trail]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return "".join(chars)


def span(lo: int, hi: int) -> str:
    return "".join(chr(code) for code in range(lo, hi + 1))


LATIN = (
    span(0x20, 0x7E) + span(0xA0, 0xFF)
    + span(0x2010, 0x2027) + span(0x2030, 0x205E)   # dashes, quotes, ellipsis, bullets
    + span(0x2190, 0x21FF)                           # arrows
    + span(0x2318, 0x2318) + span(0x23CE, 0x23CE)   # command key, return key
    + span(0x25A0, 0x25FF) + span(0x2600, 0x26FF) + span(0x2700, 0x27BF)
)
CJK = span(0x3000, 0x303F) + span(0xFF00, 0xFFEF) + gb2312(0xB0, 0xF7)


def build(source_dir: str, name: str, text: str) -> None:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    font = TTFont(os.path.join(source_dir, SOURCE))
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    target = os.path.normpath(os.path.join(OUT, name))
    font.flavor = "woff2"
    font.save(target)
    print(f"{name}: {len(font.getBestCmap())} code points, {os.path.getsize(target)} bytes")


if __name__ == "__main__":
    directory = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(OUT, exist_ok=True)
    build(directory, "fusion-pixel-12px-latin.woff2", LATIN)
    build(directory, "fusion-pixel-12px-zh.woff2", CJK)
