#!/usr/bin/env python3
"""Build presentation/slides.pdf from deck.json and slides/*.html, so the deck opens on GitHub.

Usage: python3 presentation/build_pdf.py [--chrome PATH] [--workdir DIR]

Needs Google Chrome (headless) and network access for the Google Fonts the deck uses.
The slide HTML in slides/ is the source; this is a read-only export.
"""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PRINT_CSS = """
@page { size: 1920px 1080px; margin: 0; }
html, body { margin: 0; padding: 0; background: #ffffff; }
* { box-sizing: border-box; }
section { width: 1920px; height: 1080px; position: relative; overflow: hidden; break-after: page; page-break-after: always; }
section:last-of-type { break-after: auto; page-break-after: auto; }
h1, h2, h3, p, ul, ol, table { margin: 0; }
h1 { font-size: 96px; font-weight: 600; line-height: 1.1; }
h2 { font-size: 64px; font-weight: 600; line-height: 1.15; }
h3 { font-size: 44px; font-weight: 600; line-height: 1.2; }
p { font-size: 32px; line-height: 1.4; }
aside { display: none; }
table { border-collapse: collapse; }
th, td { padding: 0.35em 0.6em; border-bottom: 1px solid rgba(127,127,127,.35); text-align: left; }
/* A flow connector between two boxes: a straight arrow, as in the Slides format. */
x-connector { display: block; height: 3px; align-self: center; position: relative; background: currentColor; flex: none; }
x-connector::after { content: ""; position: absolute; right: -2px; top: 50%; transform: translateY(-50%);
  border-left: 14px solid currentColor; border-top: 9px solid transparent; border-bottom: 9px solid transparent; }
x-shape, x-icon, x-embed { display: block; }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default=CHROME)
    ap.add_argument("--workdir", help="Scratch folder Chrome can read (default: a temp dir)")
    a = ap.parse_args()

    deck = json.loads((HERE / "deck.json").read_text())
    hrefs = sorted({f["href"] for f in deck.get("faces", {}).values() if f.get("href")})
    links = "".join(f'<link rel="stylesheet" href="{h}">' for h in hrefs)
    slides = "\n".join((HERE / "slides" / f"{sid}.html").read_text() for sid in deck["order"])
    page = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{deck.get("title", "Slides")}</title>'
            f'{links}<style>{PRINT_CSS}</style></head><body>{slides}</body></html>')

    work = Path(a.workdir) if a.workdir else Path(tempfile.mkdtemp())
    work.mkdir(parents=True, exist_ok=True)
    src, pdf = work / "slides-print.html", work / "slides.pdf"
    src.write_text(page)
    subprocess.run([a.chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=8000", f"--print-to-pdf={pdf}", src.as_uri()],
                   check=True, capture_output=True)
    shutil.copy(pdf, HERE / "slides.pdf")
    print(HERE / "slides.pdf", f"({len(deck['order'])} slides)")


if __name__ == "__main__":
    main()
