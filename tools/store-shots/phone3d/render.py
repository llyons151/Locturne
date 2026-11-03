# Renders the iPhone 17 Pro model at any angle, transparent background, with a screenshot on the screen.
# Run through render.sh. Model: "iPhone 17 Pro" by Ranguel on Sketchfab, CC Attribution (credit required).
#
#   blender -b --python render.py -- --shot ../shots/01-shield.png --yaw 25 --pitch -10 --out out/x.png
#   blender -b --python render.py -- --grid      (every angle, into --outdir: body PNG + screen mask + corners in grid.json;
#                                                 compose.sh drops any screenshot onto them in a second)
#
# yaw:   turn left/right around the vertical axis (+ = screen turns to face right of frame)
# pitch: lean back/forward (+ = top tips away from camera)
# roll:  spin in the picture plane. Free to do afterwards by rotating the PNG, so the grid skips it.
import bpy, sys, os, math, argparse
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--shot', default=None, help='screenshot for the screen (default: model wallpaper)')
ap.add_argument('--yaw', type=float, default=0)
ap.add_argument('--pitch', type=float, default=0)
ap.add_argument('--roll', type=float, default=0)
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'phone.png'))
ap.add_argument('--grid', action='store_true')
ap.add_argument('--outdir', default=os.path.join(HERE, 'out'))
ap.add_argument('--size', type=int, default=3840, help='long side of the image in px')
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--off', action='store_true', help='screen off (black glass)')
ap.add_argument('--glare', type=float, default=0.05, help='screen sheen strength head-on (0 = none)')
a = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, 'source', 'iPhone 17 Pro.glb'))
meshes = [o for o in scn.objects if o.type == 'MESH']

# Dynamic Island: the model leaves a see-through hole showing the selfie camera. Lay a solid black pill over it,
# just under the cover glass (import coordinates: screen faces +Y, top of phone is +Z).
import bmesh
ix0, ix1, iz0, iz1, iy = -0.0109, 0.0095, 0.0638, 0.0702, 0.00352  # a hair wider than the hole
r_ = (iz1 - iz0) / 2; cx_ = (ix0 + ix1) / 2; cz_ = (iz0 + iz1) / 2; half = (ix1 - ix0) / 2 - r_
bm = bmesh.new(); verts = []
for side, (start, end) in ((1, (-90, 90)), (-1, (90, 270))):
    for k in range(25):
        t = math.radians(start + (end - start) * k / 24)
        verts.append(bm.verts.new((cx_ + side * half + r_ * math.cos(t), iy, cz_ + r_ * math.sin(t))))
bm.faces.new(verts); me = bpy.data.meshes.new('island'); bm.to_mesh(me); bm.free()
pill = bpy.data.objects.new('island', me); scn.collection.objects.link(pill)
for poly in me.polygons:
    if poly.normal.y < 0: me.flip_normals()
island = bpy.data.materials.new('Island'); island.use_nodes = True
ib = island.node_tree.nodes['Principled BSDF']
ib.inputs['Base Color'].default_value = (0.002, 0.002, 0.003, 1); ib.inputs['Roughness'].default_value = 0.25
ib.inputs['Specular IOR Level'].default_value = 0.04
me.materials.append(island)
meshes.append(pill)

# One pivot at the phone's centre so rotations turn the phone about itself.
pivot = bpy.data.objects.new('pivot', None)
scn.collection.objects.link(pivot)
lo = Vector((min((o.matrix_world @ Vector(c))[i] for o in meshes for c in o.bound_box) for i in range(3)))
hi = Vector((max((o.matrix_world @ Vector(c))[i] for o in meshes for c in o.bound_box) for i in range(3)))
centre = (lo + hi) / 2
for o in scn.objects:
    if o.parent is None and o is not pivot:
        o.location -= centre
        o.parent = pivot

# Which way does the screen face? Average normal of the OLED faces, in object space.
screen_obj = next(o for o in meshes if any(s.material and s.material.name == 'OLED' for s in o.material_slots))
oled_idx = [i for i, s in enumerate(screen_obj.material_slots) if s.material and s.material.name == 'OLED'][0]
n = Vector((0, 0, 0))
for p in screen_obj.data.polygons:
    if p.material_index == oled_idx:
        n += p.normal * p.area
n = -(screen_obj.matrix_world.to_3x3() @ n).normalized()  # this mesh's OLED normals point into the phone

# Screen content: swap the wallpaper image for the screenshot in every OLED texture node.
oled = bpy.data.materials['OLED']
if a.off:
    for s in screen_obj.material_slots:
        if s.material is oled:
            s.material = bpy.data.materials['OLED off']
else:
    # Screen = pure light: the screenshot's pixels come out unchanged (Standard view transform below).
    ont = oled.node_tree
    ont.nodes.clear()
    tex = ont.nodes.new('ShaderNodeTexImage'); tex.interpolation = 'Cubic'
    if a.grid:  # black screen: compose.sh adds the screenshot later (screen light just adds on top of the sheen)
        tex.image = bpy.data.images.new('black', 4, 4); tex.image.pixels = [0, 0, 0, 1] * 16
    else:
        tex.image = bpy.data.images.load(os.path.abspath(a.shot)) if a.shot else bpy.data.images['wallpaper']
    uv = ont.nodes.new('ShaderNodeTexCoord'); flip = ont.nodes.new('ShaderNodeMapping')
    flip.inputs['Location'].default_value[0] = 1; flip.inputs['Scale'].default_value[0] = -1  # model's UVs are mirrored
    em = ont.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1
    mo = ont.nodes.new('ShaderNodeOutputMaterial')
    ont.links.new(uv.outputs['UV'], flip.inputs['Vector']); ont.links.new(flip.outputs['Vector'], tex.inputs['Vector'])
    ont.links.new(tex.outputs['Color'], em.inputs['Color']); ont.links.new(em.outputs['Emission'], mo.inputs['Surface'])

# Cover glass ('Glass' in the model): was 78% black tint over the whole screen. Make it clear; the sheen is on the screen.
g0 = bpy.data.materials['Glass'].node_tree
g0.nodes.clear()
gt = g0.nodes.new('ShaderNodeBsdfTransparent'); gout = g0.nodes.new('ShaderNodeOutputMaterial')
g0.links.new(gt.outputs['BSDF'], gout.inputs['Surface'])

if not a.off:
    # Screen sheen: a clean soft sheen from an imaginary softbox overhead (not the studio HDRI, whose
    # window grid looked messy on the screen). The sheen follows the reflection direction, so it slides as the phone turns,
    # and gets stronger at grazing angles. a.glare = head-on strength.
    g = oled.node_tree
    tc2 = g.nodes.new('ShaderNodeTexCoord'); sep = g.nodes.new('ShaderNodeSeparateXYZ')
    box = g.nodes.new('ShaderNodeMapRange'); box.interpolation_type = 'SMOOTHSTEP'
    box.inputs['From Min'].default_value = 0.05; box.inputs['From Max'].default_value = 0.75
    lw = g.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.3
    fr = g.nodes.new('ShaderNodeMapRange'); fr.inputs['To Min'].default_value = a.glare; fr.inputs['To Max'].default_value = min(1, a.glare * 2)
    mul = g.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    em = g.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1, 1, 1, 1)
    add = g.nodes.new('ShaderNodeAddShader'); go = next(x for x in g.nodes if x.type == 'OUTPUT_MATERIAL')
    screen_em = go.inputs['Surface'].links[0].from_socket if go.inputs['Surface'].links else None
    g.links.new(tc2.outputs['Reflection'], sep.inputs['Vector']); g.links.new(sep.outputs['Z'], box.inputs['Value'])
    g.links.new(lw.outputs['Fresnel'], fr.inputs['Value'])
    g.links.new(box.outputs['Result'], mul.inputs[0]); g.links.new(fr.outputs['Result'], mul.inputs[1])
    g.links.new(mul.outputs['Value'], em.inputs['Strength'])
    g.links.new(screen_em, add.inputs[0]); g.links.new(em.outputs['Emission'], add.inputs[1])
    g.links.new(add.outputs['Shader'], go.inputs['Surface'])

# Camera looks down -Y at the phone standing upright (long side = Z), screen facing the camera.
# Rotate the model so its screen normal points at the camera (camera sits at -Y looking +Y).
base = n.to_track_quat('-Y', 'Y')  # screen normal -> -Y (toward camera), model up stays up-ish
pivot.rotation_mode = 'QUATERNION'
base_q = base.inverted()

def pose(yaw, pitch, roll):
    turn = Euler((math.radians(-pitch), math.radians(roll), math.radians(yaw)), 'ZXY').to_quaternion()
    pivot.rotation_quaternion = turn @ base_q

# Long lens from far away: realistic product look, little distortion.
cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 100
cam = bpy.data.objects.new('cam', cam_data)
scn.collection.objects.link(cam)
cam.location = (0, -0.52, 0)
cam.rotation_euler = (math.radians(90), 0, 0)
scn.camera = cam

# Studio HDRI for reflections, hidden from the camera (transparent background).
world = bpy.data.worlds.new('w'); scn.world = world; world.use_nodes = True
nt = world.node_tree; nt.nodes.clear()
env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.join(HERE, 'studio.hdr'))
mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 1.0
out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
nt.links.new(env.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
mp.inputs['Rotation'].default_value[2] = math.radians(35)

r = scn.render
r.engine = 'CYCLES'
r.film_transparent = True
r.resolution_x = round(a.size * 0.5625); r.resolution_y = a.size; r.resolution_percentage = 100
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'; r.image_settings.compression = 40
scn.view_settings.view_transform = 'Standard'  # keeps screenshot colours exact
c = scn.cycles
c.samples = a.samples; c.use_denoising = True; c.adaptive_threshold = 0.02
c.max_bounces = 8; c.transparent_max_bounces = 12; scn.render.use_persistent_data = True
prefs = bpy.context.preferences.addons['cycles'].preferences
for kind in ('OPTIX', 'CUDA'):
    try:
        prefs.compute_device_type = kind; prefs.get_devices()
        devs = [d for d in prefs.devices if d.type == kind]
        if devs:
            for d in prefs.devices: d.use = d.type == kind
            c.device = 'GPU'; print('device', kind)
            if kind == 'OPTIX': c.denoiser = 'OPTIX'
            break
    except TypeError:
        pass

def render(yaw, pitch, roll, path):
    pose(yaw, pitch, roll)
    r.filepath = path
    bpy.ops.render.render(write_still=True)
    print('wrote', path)

def screen_corners():
    """Screenshot corners (TL, TR, BR, BL) in output pixels, from the screen's UV layout (texture is read at 1-u, v)."""
    import numpy as np
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    me_ = screen_obj.data; uvl = me_.uv_layers.active.data; mw = screen_obj.matrix_world
    A, B = [], []
    for poly in me_.polygons:
        if poly.material_index != oled_idx: continue
        for li in poly.loop_indices:
            u, v = uvl[li].uv; A.append((u, v, 1)); B.append(tuple(mw @ me_.vertices[me_.loops[li].vertex_index].co))
    M = np.linalg.lstsq(np.array(A), np.array(B), rcond=None)[0]
    W, H = r.resolution_x, r.resolution_y; pts = []
    for u, v in ((1, 1), (0, 1), (0, 0), (1, 0)):
        p3 = Vector(np.array((u, v, 1)) @ M); q = world_to_camera_view(scn, cam, p3)
        pts.append([round(q.x * W, 2), round((1 - q.y) * H, 2)])
    return pts

def render_mask(path):
    """Alpha = where the screen shows (frame, island and everything else cut it out)."""
    hold = bpy.data.materials.get('_hold') or bpy.data.materials.new('_hold')
    hold.use_nodes = True; hn = hold.node_tree; hn.nodes.clear()
    hn.links.new(hn.nodes.new('ShaderNodeHoldout').outputs[0], hn.nodes.new('ShaderNodeOutputMaterial').inputs['Surface'])
    white = bpy.data.materials.get('_white') or bpy.data.materials.new('_white')
    white.use_nodes = True; wn = white.node_tree; wn.nodes.clear()
    wn.links.new(wn.nodes.new('ShaderNodeEmission').outputs[0], wn.nodes.new('ShaderNodeOutputMaterial').inputs['Surface'])
    saved = [(o, i, sl.material) for o in meshes for i, sl in enumerate(o.material_slots)]
    for o, i, m in saved:
        o.material_slots[i].material = white if m is oled else (m if m and m.name == 'Glass' else hold)
    keep = (c.samples, c.use_denoising, c.use_adaptive_sampling); c.samples = 4; c.use_denoising = False; c.use_adaptive_sampling = False
    r.filepath = path; bpy.ops.render.render(write_still=True)
    c.samples, c.use_denoising, c.use_adaptive_sampling = keep
    for o, i, m in saved: o.material_slots[i].material = m

if a.grid:
    import json
    os.makedirs(a.outdir, exist_ok=True)
    meta_path = os.path.join(a.outdir, 'grid.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    yaws = list(range(-75, 76, 15))
    pitches = [-30, -15, 0, 15, 30]
    jobs = [(y, p) for p in pitches for y in yaws]
    jobs.sort(key=lambda j: (abs(j[1]) + abs(j[0]) / 2, -j[0]))  # most useful (near upright, mild turns) first
    jobs += [(y, p) for p in (-15, 0, 15) for y in (150, 165, 180, 195, 210)]  # back views
    for y, p in jobs:
        name = f'yaw{y:+04d}_pitch{p:+03d}'.replace('+', 'p').replace('-', 'm')
        path = os.path.join(a.outdir, name + '.png')
        if os.path.exists(path) and name in meta: continue
        render(y, p, 0, path)
        back = abs(((y + 180) % 360) - 180) > 90
        if not back:
            render_mask(os.path.join(a.outdir, name + '.mask.png'))
        meta[name] = {'yaw': y, 'pitch': p, 'size': [r.resolution_x, r.resolution_y], 'screen': None if back else screen_corners()}
        json.dump(meta, open(meta_path, 'w'), indent=1)
else:
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    render(a.yaw, a.pitch, a.roll, os.path.abspath(a.out))
