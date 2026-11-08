"""Renders one moon from a JSON parameter file with Blender Cycles (test pipeline, 2026-11-07).

  blender -b -P tools/moon-render/render.py -- tools/moon-render/moons/eclipse.json [--preview]

The moon is a real 3D sphere: NASA's LOLA elevation (maps/height16.png, from ldem_4.tif) displaces
the mesh, and NASA's LROC colour map (maps/lroc_color_poles_16k.tif) gives the surface and fine
crater bump. Each moon JSON sets the surface colouring and the lights; the camera, size and render
settings are the same for every moon so a set stays consistent. Output: out/<id>.png, RGBA, transparent.
Maps: NASA's Scientific Visualization Studio, CGI Moon Kit (svs.gsfc.nasa.gov/4720).
"""

import json
import time
T0 = time.time()
def tick(msg): print(f'TICK {time.time()-T0:6.1f}s {msg}', flush=True)
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

HERE = Path(__file__).resolve().parent
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
P = json.loads(Path(args[0]).read_text())
PREVIEW = '--preview' in args
# --style soft | porcelain: the app-style takes (2026-11-07). Same sphere and camera, a calmer surface:
# only the big maria shapes, low relief, the moon's own palette (moon-lab moons.json sky/moon colours), soft light.
STYLE = args[args.index('--style') + 1] if '--style' in args else None
if STYLE:
    lab = json.loads((HERE.parent / 'moon-lab' / 'moons.json').read_text())
    m = next(m for k in ('moons', 'rare', 'limited') for m in lab.get(k, []) if m['id'] == P['id'])
    hx = lambda c: [int(c.lstrip('#')[j:j + 2], 16) for j in (0, 2, 4)]
    mixc = lambda a, b, t: '#' + ''.join(f'{round(x + (y - x) * t):02X}' for x, y in zip(hx(a), hx(b)))
    # Dark maria → the moon's two colours → a pale top, all from the moon's palette in the app.
    orb = ['', mixc(m['sky'][-1], m['moon'][0], 0.45), m['moon'][0], m['moon'][1], mixc(m['moon'][1], '#FFFFFF', 0.5)]
    soft = {'relief': 0.9, 'bump': 0.08, 'colorMap': 'lroc_soft_4k.png', 'heightMap': 'height_soft_km.npy',
            'ramp': orb[1:], 'lumMin': 0.12, 'lumMax': 0.5, 'lightAngle': 9}
    P.update(soft)
    if STYLE == 'porcelain':
        P.update({'roughness': 0.75, 'specular': 0.2, 'coat': 0.3, 'coatRoughness': 0.5, 'sheen': 0.5})
    P['id'] = f"{P['id']}-{STYLE}"

# ——— Scene ———
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == 'OPTIX'
scene.cycles.device = 'GPU'
scene.cycles.samples = 64 if PREVIEW else P.get('samples', 512)
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 4
res = 768 if PREVIEW else P.get('resolution', 4096)
scene.render.resolution_x = scene.render.resolution_y = res
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '16'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = P.get('look', 'AgX - Base Contrast')
scene.view_settings.exposure = P.get('exposure', 0.0)

world = bpy.data.worlds.new('World')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0

# ——— Moon mesh: a sphere built in numpy, real lunar elevation baked into the vertices ———
# (bpy.ops / bmesh sphere builders took ~3 minutes at this density and laid UVs out differently.)
# Longitude 0 (the near side) faces the camera; `spin` turns the moon. UVs are the maps' own
# equirectangular layout: u from -180° to 180°, v from the south pole to the north.
SEG = 1024 if PREVIEW else P.get('segments', 3072)
nu, nv = SEG + 1, SEG // 2 + 1
lon = np.linspace(-math.pi, math.pi, nu, dtype=np.float64)
lat = np.linspace(-math.pi / 2, math.pi / 2, nv, dtype=np.float64)
LON, LAT = np.meshgrid(lon, lat)  # (nv, nu), south row first
hk = np.load(HERE / 'maps' / P.get('heightMap', 'height_km.npy'))  # (rows north→south, cols -180→180), km
H, W = hk.shape
fx = (LON + math.pi) / (2 * math.pi) * (W - 1)
fy = (math.pi / 2 - LAT) / math.pi * (H - 1)
x0, y0 = np.floor(fx).astype(int), np.floor(fy).astype(int)
x1, y1 = np.minimum(x0 + 1, W - 1), np.minimum(y0 + 1, H - 1)
tx, ty = fx - x0, fy - y0
h = (hk[y0, x0] * (1 - tx) * (1 - ty) + hk[y0, x1] * tx * (1 - ty) + hk[y1, x0] * (1 - tx) * ty + hk[y1, x1] * tx * ty)
r = 1.0 + h / 1737.4 * P.get('relief', 2.5)
sp = math.radians(P.get('spin', 0))
L2 = LON + sp
co = np.stack([r * np.cos(LAT) * np.sin(L2), -r * np.cos(LAT) * np.cos(L2), r * np.sin(LAT)], -1).reshape(-1, 3)
iu, iv = np.meshgrid(np.arange(SEG), np.arange(nv - 1))
a0 = (iv * nu + iu).ravel()
quads = np.stack([a0, a0 + 1, a0 + nu + 1, a0 + nu], -1)  # counter-clockwise seen from outside
mesh = bpy.data.meshes.new('moon')
mesh.vertices.add(len(co))
mesh.vertices.foreach_set('co', co.astype(np.float32).ravel())
nq = len(quads)
mesh.loops.add(nq * 4)
mesh.loops.foreach_set('vertex_index', quads.astype(np.int32).ravel())
mesh.polygons.add(nq)
mesh.polygons.foreach_set('loop_start', np.arange(0, nq * 4, 4, dtype=np.int32))
uvs = np.stack([(LON + math.pi) / (2 * math.pi), (LAT + math.pi / 2) / math.pi], -1).reshape(-1, 2)
uvl = mesh.uv_layers.new(name='UVMap')
uvl.data.foreach_set('uv', uvs[quads.ravel()].astype(np.float32).ravel())
mesh.update(calc_edges=True)
mesh.validate()
mesh.shade_smooth()
moon = bpy.data.objects.new('moon', mesh)
scene.collection.objects.link(moon)
tick('sphere')

# ——— Surface material ———
mat = bpy.data.materials.new('moon')
mat.use_nodes = True
nt = mat.node_tree
N, L = nt.nodes, nt.links
N.clear()
out = N.new('ShaderNodeOutputMaterial')
bsdf = N.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Roughness'].default_value = P.get('roughness', 1.0)
bsdf.inputs['Coat Weight'].default_value = P.get('coat', 0.0)
bsdf.inputs['Coat Roughness'].default_value = P.get('coatRoughness', 0.03)
bsdf.inputs['Sheen Weight'].default_value = P.get('sheen', 0.0)
bsdf.inputs['Sheen Roughness'].default_value = 0.4
bsdf.inputs['Specular IOR Level'].default_value = P.get('specular', 0.15)
L.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

uv = N.new('ShaderNodeTexCoord')
col = N.new('ShaderNodeTexImage')
col.image = bpy.data.images.load(str(HERE / 'maps' / P.get('colorMap', 'lroc_color_poles_16k.tif')))
col.interpolation = 'Cubic'
L.new(uv.outputs['UV'], col.inputs['Vector'])

# Surface colour: the real albedo's brightness mapped onto the moon's ramp (dark maria → bright highlands).
lum = N.new('ShaderNodeRGBToBW')
L.new(col.outputs['Color'], lum.inputs['Color'])
lvl = N.new('ShaderNodeMapRange')  # stretch the map's own range so the ramp is used end to end
lvl.inputs['From Min'].default_value = P.get('lumMin', 0.08)
lvl.inputs['From Max'].default_value = P.get('lumMax', 0.55)
L.new(lum.outputs['Val'], lvl.inputs['Value'])
ramp = N.new('ShaderNodeValToRGB')
stops = P['ramp']
cr = ramp.color_ramp
cr.interpolation = 'B_SPLINE'
while len(cr.elements) < len(stops):
    cr.elements.new(0.5)
for i, s in enumerate(stops):
    h = s.lstrip('#')
    srgb = [int(h[j:j + 2], 16) / 255 for j in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    cr.elements[i].position = i / (len(stops) - 1)
    cr.elements[i].color = (*lin, 1)
L.new(lvl.outputs['Result'], ramp.inputs['Fac'])
mix = N.new('ShaderNodeVectorMath')
mix.operation = 'SCALE'
L.new(ramp.outputs['Color'], mix.inputs[0])
mix.inputs['Scale'].default_value = P.get('albedo', 1.0)
L.new(mix.outputs['Vector'], bsdf.inputs['Base Color'])

# Fine crater detail: bump from the colour map, on top of the mesh's real relief.
bump = N.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = P.get('bump', 0.35)
bump.inputs['Distance'].default_value = 0.004
L.new(lum.outputs['Val'], bump.inputs['Height'])
L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
moon.data.materials.append(mat)

# ——— Camera: the same for every moon ———
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 200
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
fill = P.get('fill', 0.8)  # the disc's share of the frame width
cam.location = (0, -2 / (fill * 36 / 200), 0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam


def sun(name, toward, colour, strength, angle=0.4):
    """A sun lamp shining from direction `toward` (x right, y away from camera, z up)."""
    d = bpy.data.lights.new(name, 'SUN')
    d.energy = strength
    d.color = colour
    d.angle = math.radians(angle)
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.rotation_euler = (-Vector(toward)).to_track_quat('-Z', 'Y').to_euler()


def hexlin(h):
    h = h.lstrip('#')
    c = [int(h[j:j + 2], 16) / 255 for j in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


for i, l in enumerate(P['lights']):
    sun(f'sun{i}', l['from'], hexlin(l['colour']), l['strength'], max(l.get('angle', 0.4), P.get('lightAngle', 0)))

out_dir = HERE / 'out'
out_dir.mkdir(exist_ok=True)
scene.render.filepath = str(out_dir / (P['id'] + ('-preview' if PREVIEW else '') + '.png'))
tick('render start')
bpy.ops.render.render(write_still=True)
tick('render done')
print('WROTE', scene.render.filepath)
