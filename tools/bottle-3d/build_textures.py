"""Builds the two textures for the bottle from the official PNG: albedo (dark glass + gold artwork) and ORM (roughness/metal)."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert("RGBA")
rgba = np.asarray(im).astype(np.float32) / 255.0
rgb, alpha = rgba[..., :3], rgba[..., 3]

mx = rgb.max(axis=2)
mn = rgb.min(axis=2)
sat = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
# Warm gold: red leads, blue trails, with enough saturation and brightness.
warm = np.clip((r - b - 0.10) / 0.20, 0, 1) * np.clip((r - g + 0.02) / 0.10, 0, 1)
gold = np.clip((sat - 0.28) / 0.22, 0, 1) * np.clip((mx - 0.38) / 0.22, 0, 1) * warm
inner = np.asarray(Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(31))).astype(np.float32) / 255.0
gold *= inner
# The neck (above the label) carries only the stopper collar ring; the rim highlights there are not artwork.
gold[:330, :] *= np.where(np.arange(gold.shape[0])[:330, None] > 215, 1.0, 0.0) * np.where(np.arange(gold.shape[0])[:330, None] < 275, 1.0, 0.0)

# Keep the artwork, drop the photo's own reflections: darken what is not gold.
DARK = np.array([0.012, 0.012, 0.015], dtype=np.float32)
base = DARK[None, None, :] * (1 - gold[..., None]) + rgb * gold[..., None]

# Lift the gold slightly: the real material is metallic and will be lit by the viewer.
base = np.clip(base * (1 + 0.15 * gold[..., None]), 0, 1)


def srgb(x):
    return np.clip(x, 0, 1) ** (1 / 2.2)


# Albedo is stored in sRGB; the stored decal is already display-referred.
albedo = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8), "RGB")
albedo.save(out / "albedo.jpg", quality=90, optimize=True)

soft = Image.fromarray((gold * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.8))
goldmask = np.asarray(soft).astype(np.float32) / 255.0
orm = np.zeros(goldmask.shape + (3,), dtype=np.float32)
orm[..., 0] = 1.0  # occlusion
orm[..., 1] = 0.06 * (1 - goldmask) + 0.34 * goldmask  # roughness: polished glass vs satin gold
orm[..., 2] = goldmask  # metallic only on the gold
orm_img = Image.fromarray((orm * 255).astype(np.uint8), "RGB").resize((768, 1152), Image.LANCZOS)
orm_img.save(out / "orm.png", optimize=True)

print("gold share inside bottle:", round(float(gold[alpha > 0.5].mean()), 3))
print("albedo", (out / "albedo.jpg").stat().st_size // 1024, "KB; orm", (out / "orm.png").stat().st_size // 1024, "KB")
Image.fromarray((gold * 255).astype(np.uint8), "L").resize((512, 768)).save(out / "gold_preview.png")
