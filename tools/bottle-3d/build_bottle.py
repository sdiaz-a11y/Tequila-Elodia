"""Builds the ELODIA bottle in Blender from the silhouette of the official photo and exports an optimized GLB.

Run: blender -b -P build_bottle.py -- <work_dir> <out.glb> [preview_prefix]
work_dir holds profile.json, albedo.jpg and orm.png (see bottle_profile.py / build_textures.py).
"""
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
work, out_glb = Path(argv[0]), Path(argv[1])
preview = argv[2] if len(argv) > 2 else None

P = json.load(open(work / "profile.json"))
Y0, Y1, CX, W, H = P["y0"], P["y1"], P["cx"], P["w"], P["h"]
HALF = P["half"]
HB = Y1 - Y0  # bottle height in image pixels -> 1.0 unit
SPLIT = 188  # where the stopper ends and the glass body begins (image row)
SEGMENTS = 72
STOP_SIDES = 8
UV_DARK = (0.02, 0.02)  # a pixel outside the bottle: plain dark glass

bpy.ops.wm.read_factory_settings(use_empty=True)


def half_at(y):
    return HALF[min(max(int(round(y)) - Y0, 0), len(HALF) - 1)]


def smoothed(y, win):
    lo, hi = max(Y0, int(y - win)), min(Y1, int(y + win))
    vals = [half_at(v) for v in range(lo, hi + 1)]
    return sum(vals) / len(vals)


def body_radius(y):
    """Silhouette half-width, with the neck coil's bumps ironed out (the coil is rebuilt as geometry)."""
    raw = half_at(y)
    if y < 285:
        return raw
    if y > 760:
        return raw
    s = smoothed(y, 38)
    # blend in/out of the smoothed region so the collar and the cone keep their exact outline
    a = min(1.0, (y - 285) / 25.0, (760 - y) / 25.0)
    return raw * (1 - a) + s * a


def z_of(y):
    return (Y1 - y) / HB


def uv_front(x, z):
    px = CX + x * HB
    py = Y1 - z * HB
    return (px / W, 1.0 - py / H)


def new_object(name, bm):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def lathe(name, rows, sides, radius_of, phase=0.0, decal=True, smooth=True, cap_top=False, cap_bottom=False):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    col = bm.loops.layers.color.new("mask")
    rings = []
    for y in rows:
        r = radius_of(y) / HB
        z = z_of(y)
        ring = []
        for k in range(sides):
            a = phase + 2 * math.pi * k / sides
            ring.append(bm.verts.new((r * math.sin(a), -r * math.cos(a), z)))  # a=0 faces the viewer (-Y)
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            f.smooth = smooth
    bm.faces.ensure_lookup_table()
    bm.normal_update()
    side = bm.faces[0]
    c = side.calc_center_median()
    if side.normal.dot(Vector((c.x, c.y, 0))) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    for cap, ring, up in ((cap_top, rings[0], 1), (cap_bottom, rings[-1], -1)):
        if cap:
            f = bm.faces.new(ring)
            f.smooth = False
            f.normal_update()
            if f.normal.z * up < 0:
                f.normal_flip()
    for f in bm.faces:
        for loop in f.loops:
            v = loop.vert.co
            if decal:
                loop[uv].uv = uv_front(v.x, v.z)
                rr = math.hypot(v.x, v.y)
                facing = (-v.y / rr) if rr > 1e-6 else 0.0
                t = min(max((facing - 0.10) / 0.45, 0.0), 1.0)
                m = t * t * (3 - 2 * t)
                if facing < 0.05:
                    loop[uv].uv = UV_DARK
            else:
                loop[uv].uv = UV_DARK
                m = 1.0
            loop[col] = (m, m, m, 1.0)
    return new_object(name, bm)


# ── stopper: 8 flat faces, flat shaded ──────────────────────────────────────
stop_rows = list(range(Y0 + 2, SPLIT + 6, 3))
k22 = math.cos(math.pi / STOP_SIDES)
stopper = lathe(
    "stopper", stop_rows, STOP_SIDES, lambda y: half_at(y) / k22, phase=math.pi / STOP_SIDES, decal=False, smooth=False, cap_top=True
)

# ── glass body: collar, neck, cone and base ─────────────────────────────────
rows = list(range(SPLIT, 740, 6)) + list(range(740, 1440, 28)) + list(range(1440, Y1 - 5, 6)) + [Y1 - 6, Y1 - 3]
rows = sorted(set(rows))
body = lathe("body", rows, SEGMENTS, body_radius, decal=True, smooth=True, cap_bottom=True)

# ── neck coil: the raised dark rope ─────────────────────────────────────────
TURNS, COIL_TOP, COIL_BOT = 5.5, 308.0, 702.0
curve = bpy.data.curves.new("coil", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = 15.0 / HB
curve.bevel_resolution = 3
curve.use_fill_caps = True
spline = curve.splines.new("POLY")
N = int(TURNS * 40)
spline.points.add(N)
for i in range(N + 1):
    t = i / N
    y = COIL_TOP + (COIL_BOT - COIL_TOP) * t
    ang = -2 * math.pi * TURNS * t + 0.6
    r = (body_radius(y) + 5.0) / HB
    spline.points[i].co = (r * math.sin(ang), -r * math.cos(ang), z_of(y), 1.0)
coil_obj = bpy.data.objects.new("coil", curve)
bpy.context.scene.collection.objects.link(coil_obj)
bpy.context.view_layer.objects.active = coil_obj
coil_obj.select_set(True)
bpy.ops.object.convert(target="MESH")
coil_obj = bpy.context.view_layer.objects.active
coil_obj.name = "coil"
bm = bmesh.new()
bm.from_mesh(coil_obj.data)
uv = bm.loops.layers.uv.verify()
col = bm.loops.layers.color.new("mask")
for f in bm.faces:
    f.smooth = True
    for loop in f.loops:
        loop[uv].uv = UV_DARK
        loop[col] = (1, 1, 1, 1)
bm.to_mesh(coil_obj.data)
bm.free()
if coil_obj.data.color_attributes.get("mask") is None:
    pass

# ── material: dark glass + gold artwork (albedo x mask), roughness/metal from the ORM map ──
mat = bpy.data.materials.new("ElodiaBottle")
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

alb = nt.nodes.new("ShaderNodeTexImage")
alb.image = bpy.data.images.load(str(work / "albedo.jpg"))
alb.image.colorspace_settings.name = "sRGB"
mask = nt.nodes.new("ShaderNodeVertexColor")
mask.layer_name = "mask"
mul = nt.nodes.new("ShaderNodeMix")
mul.data_type = "RGBA"
mul.blend_type = "MULTIPLY"
mul.inputs["Factor"].default_value = 1.0
nt.links.new(alb.outputs["Color"], mul.inputs["A"])
nt.links.new(mask.outputs["Color"], mul.inputs["B"])
nt.links.new(mul.outputs["Result"], bsdf.inputs["Base Color"])

orm = nt.nodes.new("ShaderNodeTexImage")
orm.image = bpy.data.images.load(str(work / "orm.png"))
orm.image.colorspace_settings.name = "Non-Color"
sep = nt.nodes.new("ShaderNodeSeparateColor")
nt.links.new(orm.outputs["Color"], sep.inputs["Color"])
nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
bsdf.inputs["Coat Weight"].default_value = 0.6
bsdf.inputs["Coat Roughness"].default_value = 0.03

mat.use_backface_culling = True
glass = bpy.data.materials.new("ElodiaGlass")
glass.use_nodes = True
gn = glass.node_tree
gb = gn.nodes["Principled BSDF"]
gb.inputs["Base Color"].default_value = (0.012, 0.012, 0.015, 1)
gb.inputs["Roughness"].default_value = 0.06
gb.inputs["Metallic"].default_value = 0.0
gb.inputs["Coat Weight"].default_value = 0.6
gb.inputs["Coat Roughness"].default_value = 0.03
glass.use_backface_culling = True
body.data.materials.clear()
body.data.materials.append(mat)
for o in (stopper, coil_obj):
    o.data.materials.clear()
    o.data.materials.append(glass)
    for name in list(o.data.uv_layers.keys()):
        o.data.uv_layers.remove(o.data.uv_layers[name])
    for ca in list(o.data.color_attributes):
        o.data.color_attributes.remove(ca)

# ── clean-up: weld, recompute normals, centre the bottle on its base ────────
for o in (stopper, body, coil_obj):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
for o in (stopper, body):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()

tri = sum(len(o.data.polygons) for o in (stopper, body, coil_obj))
print("POLYS (quads/ngons)", tri)

# ── export ──────────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
for o in (stopper, body, coil_obj):
    o.select_set(True)
out_glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(out_glb),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_texcoords=True,
    export_normals=True,
    export_vertex_color="MATERIAL",
    export_cameras=False,
    export_lights=False,
    export_image_format="AUTO",
    export_materials="EXPORT",
)
print("EXPORTED", out_glb, out_glb.stat().st_size // 1024, "KB")

# ── previews (flat texture view; the real look comes from the web viewer) ───
if preview:
    scn = bpy.context.scene
    scn.render.engine = "BLENDER_WORKBENCH"
    scn.display.shading.light = "STUDIO"
    scn.display.shading.color_type = "TEXTURE"
    scn.render.resolution_x, scn.render.resolution_y = 600, 900
    scn.render.film_transparent = False
    scn.world = bpy.data.worlds.new("w")
    scn.world.color = (0.5, 0.5, 0.5)
    ctr = Vector((0, 0, 0.5))
    for name, ang in (("front", 0), ("side", 90), ("back", 180)):
        cam = bpy.data.objects.new("cam" + name, bpy.data.cameras.new("c" + name))
        scn.collection.objects.link(cam)
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = 1.15
        a = math.radians(ang)
        cam.location = ctr + Vector((math.sin(a) * 4, -math.cos(a) * 4, 0))
        cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler()
        scn.camera = cam
        scn.render.filepath = f"{preview}_{name}.png"
        bpy.ops.render.render(write_still=True)
