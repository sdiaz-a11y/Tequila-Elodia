"""Sends the photo to the free Hunyuan3D 2.1 Space (shape only). Usage: python hunyuan_space.py <image.png> <out_dir>"""
import json
import shutil
import sys
from pathlib import Path

from gradio_client import Client, handle_file

image = sys.argv[1]
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

client = Client("tencent/Hunyuan3D-2.1")
result = client.predict(
    image=handle_file(image),
    mv_image_front=None,
    mv_image_back=None,
    mv_image_left=None,
    mv_image_right=None,
    steps=30,
    guidance_scale=5.0,
    seed=1234,
    octree_resolution=256,
    check_box_rembg=True,
    num_chunks=8000,
    randomize_seed=False,
    api_name="/shape_generation",
)
print("RESULT", json.dumps(result, default=str)[:1500])
first = result[0]
path = first.get("value") if isinstance(first, dict) else first
if isinstance(path, str) and Path(path).exists():
    dest = out / "hunyuan_shape.glb"
    shutil.copy(path, dest)
    print("SAVED", dest, dest.stat().st_size)
