"""Measures the bottle silhouette from the official PNG's alpha channel and builds the decal textures."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
im = Image.open(src).convert("RGBA")
a = np.asarray(im)
alpha = a[..., 3]
print("size", im.size, "alpha min/max", alpha.min(), alpha.max(), "opaque share", round((alpha > 128).mean(), 3))
mask = alpha > 128
ys = np.where(mask.any(axis=1))[0]
xs = np.where(mask.any(axis=0))[0]
y0, y1, x0, x1 = ys[0], ys[-1], xs[0], xs[-1]
print("bbox x", x0, x1, "y", y0, y1)
cx = (x0 + x1) / 2
rows = []
for y in range(y0, y1 + 1):
    r = np.where(mask[y])[0]
    if len(r):
        rows.append((y, r[0], r[-1]))
half = np.array([(r - l) / 2 for _, l, r in rows])
ctr = np.array([(l + r) / 2 for _, l, r in rows])
print("row count", len(rows), "max half", half.max(), "centre drift", round(ctr.min(), 1), round(ctr.max(), 1))
for y in range(y0, y1 + 1, 60):
    i = y - y0
    print(" y", y, "half", half[i])
json.dump({"y0": int(y0), "y1": int(y1), "cx": float(cx), "half": half.tolist(), "ctr": ctr.tolist(), "w": im.size[0], "h": im.size[1]}, open(out / "profile.json", "w"))
