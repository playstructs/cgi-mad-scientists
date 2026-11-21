"""Builds mad/public/pfp/<id>.png, the Mad Scientists portraits this site hosts.

The collection's originals (../MadScientists/images/<id>.png, 1 to 10000) are
2400px PNGs of 192px pixel art, each art pixel drawn 12.5px wide. This samples
every art pixel at its centre (nearest neighbour, palette kept), which gives
the art back at its own 192px: the same picture at about a fifth of the bytes
and 1/156 of the pixels a browser decodes. Portraits and gallery tiles show
it smaller than 192px.

    python3 mad/scripts/make-pfps.py [../../MadScientists/images]

Needs Pillow. Existing files are rewritten.
"""
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'MadScientists' / 'images'
OUT = ROOT / 'mad' / 'public' / 'pfp'
FIRST, LAST, SIZE = 1, 10000, 192


def build(n):
    with Image.open(SRC / f'{n}.png') as original:
        if original.size != (2400, 2400):
            raise ValueError(f'{n}.png is {original.size}, not 2400px')
        original.resize((SIZE, SIZE), Image.Resampling.NEAREST).save(OUT / f'{n}.png', optimize=True)
    return (OUT / f'{n}.png').stat().st_size


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    with ProcessPoolExecutor() as pool:
        sizes = list(pool.map(build, range(FIRST, LAST + 1), chunksize=100))
    print(f'{len(sizes)} portraits, {sum(sizes) / 1e6:.1f} MB, in {OUT.relative_to(ROOT)}')
