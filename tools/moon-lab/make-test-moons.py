"""Writes tools/moon-lab/test-moons.json: 100 colour-first test moons for the moon lab (user, 2026-11-02:
"more interested in colours ... skies that match the moons"). No patterns: each moon is the lab's usual
sky + moon + halo (+ an optional colour wash or second moon), designed as a pair.

Every colour is built in OKLCH so the ramps climb evenly: a sky runs from a near-black tint of its top
hue, through a deep middle, to a lit horizon; a moon runs from a saturated shade to a near-white tint,
and its halo sits between the moon and the horizon. Run: python3 tools/moon-lab/make-test-moons.py
"""

import json
import math
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent / 'test-moons.json'


def oklch(L, C, H):
    """OKLCH to #rrggbb, pulling chroma in until the colour fits sRGB."""
    for _ in range(40):
        a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
        l_, m_, s_ = L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.2914855480 * b
        l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
        rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
               -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
               -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
        if all(-0.001 <= v <= 1.001 for v in rgb):
            break
        C *= 0.93
    enc = lambda v: 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    return '#' + ''.join(f'{round(min(max(enc(min(max(v, 0), 1)), 0), 1) * 255):02X}' for v in rgb)


def sky(top, mid, hor, v=1.0, hor_l=0.66, mid_l=0.40):
    """Four stops, dark to the lit horizon: top hue near black, top hue deep, middle hue, horizon hue."""
    return [oklch(0.07, 0.016 * v, top), oklch(0.21, 0.075 * v, top), oklch(mid_l, 0.11 * v, mid), oklch(hor_l, 0.12 * v, hor)]


def moon(dark, light=None, v=1.0, dark_l=0.64, light_l=0.96):
    """Two stops: a saturated shade (the craters) to a near-white tint (the face)."""
    return [oklch(dark_l, 0.11 * v, dark), oklch(light_l, 0.012 + 0.035 * v, dark if light is None else light)]


def glow(h, v=1.0):
    return oklch(0.74, 0.12 * v, h)


def wash(*hues, l=0.82, c=0.13):
    return [oklch(l, c, h) for h in hues]


SETS = [
    ('quiet', 'Quiet', 'one colour, held back'),
    ('vivid', 'Vivid', 'one colour, turned all the way up'),
    ('pairs', 'Pairs', 'a moon against its opposite sky'),
    ('horizons', 'Horizons', 'skies that change colour on the way down'),
    ('special', 'Special', 'colour washes and second moons'),
]
MOONS = []


def add(set_, name, note, sky_, moon_, glow_, **extra):
    MOONS.append({'set': set_, 'name': name, 'note': note, 'sky': sky_, 'moon': moon_, 'glow': glow_, **extra})


def mono(set_, name, note, h, v, hor_l=0.6, moon_v=None, light_l=0.96):
    """One hue all the way through: sky, moon and halo."""
    mv = v if moon_v is None else moon_v
    add(set_, name, note, sky(h, h, h, v, hor_l), moon(h, h, mv, light_l=light_l), glow(h, mv))


# ——— Quiet: one hue, low chroma. Restraint reads as expensive. ———
mono('quiet', 'Pearl Grey', 'Silver on a blue-grey night. The plainest one, on purpose.', 255, 0.22, 0.5)
mono('quiet', 'Bone', 'Warm ivory on a soft brown dark.', 80, 0.28, 0.52)
mono('quiet', 'Slate', 'Cool blue-grey, like wet stone after rain.', 240, 0.38, 0.5)
mono('quiet', 'Sage', 'Grey-green, calm and dusty.', 140, 0.42, 0.52)
mono('quiet', 'Clay', 'Terracotta: a muted red-brown, warm all the way down.', 45, 0.5, 0.52)
mono('quiet', 'Mist', 'Pale powder blue in a hazy sky.', 230, 0.5, 0.6)
mono('quiet', 'Mauve', 'Dusty pink-purple, faded like an old photograph.', 330, 0.42, 0.52)
mono('quiet', 'Sand', 'Light sand on a dusk the colour of a dune.', 85, 0.45, 0.56)
mono('quiet', 'Ink', 'Deep navy ink and a moon that is nearly white.', 268, 0.62, 0.4, moon_v=0.3)
mono('quiet', 'Lilac', 'Soft lilac, cool and light.', 300, 0.5, 0.58)
mono('quiet', 'Celadon', 'The pale green-blue of old porcelain glaze.', 175, 0.42, 0.54)
mono('quiet', 'Rosewater', 'A whisper of pink on a rose-brown night.', 12, 0.42, 0.54)
mono('quiet', 'Graphite', 'Almost no colour at all: charcoal and soft white.', 250, 0.08, 0.42)
mono('quiet', 'Butter', 'Pale butter yellow over a warm olive dark.', 95, 0.5, 0.56)
mono('quiet', 'Fog', 'Grey-teal fog off the sea.', 205, 0.36, 0.52)
mono('quiet', 'Plum', 'Deep plum, with a moon the colour of plum skin in the light.', 320, 0.55, 0.46)
mono('quiet', 'Moss', 'Forest-floor green, dim and soft.', 128, 0.45, 0.48)
mono('quiet', 'Champagne', 'Pale gold, like the bubbles in a glass.', 78, 0.35, 0.58, light_l=0.97)
mono('quiet', 'Petal', 'Very pale blush on a dusky pink night.', 355, 0.36, 0.56, light_l=0.97)
mono('quiet', 'Midnight', 'True midnight blue, with a bright cool moon.', 264, 0.72, 0.44, moon_v=0.45)

# ——— Vivid: one hue, high chroma. ———
mono('vivid', 'Electric Blue', 'A blue so bright it hums.', 258, 1.4, 0.6)
mono('vivid', 'Ultraviolet', 'Deep violet turned all the way up.', 300, 1.4, 0.56)
mono('vivid', 'Emerald', 'Rich, cut-gem green.', 155, 1.3, 0.6)
mono('vivid', 'Tangerine', 'Juicy orange from top to bottom.', 55, 1.4, 0.66)
mono('vivid', 'Hot Pink', 'Loud, happy pink.', 352, 1.4, 0.64)
mono('vivid', 'Cobalt', 'Saturated cobalt, darker and deeper than Electric Blue.', 262, 1.5, 0.5)
mono('vivid', 'Lime', 'Zesty lime-green on a dark green night.', 128, 1.3, 0.7)
mono('vivid', 'Scarlet', 'Pure red, bold and glossy.', 27, 1.45, 0.55)
mono('vivid', 'Turquoise', 'Tropical-water turquoise.', 192, 1.3, 0.64)
mono('vivid', 'Saffron', 'Golden yellow-orange, like the spice.', 78, 1.4, 0.7)
mono('vivid', 'Fuchsia', 'Purple-pink, bright as a flower.', 332, 1.4, 0.6)
mono('vivid', 'Cyan', 'Clear, icy cyan.', 215, 1.3, 0.64)
mono('vivid', 'Ruby', 'Dark jewel red, with a rose-pink moon.', 12, 1.3, 0.48)
mono('vivid', 'Chartreuse', 'The yellow-green between lime and lemon.', 115, 1.3, 0.72)
mono('vivid', 'Sapphire', 'Deep jewel blue.', 250, 1.35, 0.54)
mono('vivid', 'Coral', 'Bright coral, warm and pink-orange.', 35, 1.3, 0.68)
mono('vivid', 'Amethyst', 'Rich purple, a touch bluer than Ultraviolet.', 290, 1.25, 0.56)
mono('vivid', 'Jade', 'Bright jade green, between emerald and teal.', 168, 1.25, 0.62)
mono('vivid', 'Marigold', 'Deep yellow-orange, like the flower.', 68, 1.35, 0.7)
mono('vivid', 'Magenta', 'Full magenta.', 342, 1.45, 0.58)


# ——— Pairs: the sky one hue, the moon its opposite (or a near-opposite). ———
def pair(name, note, sky_h, moon_h, v=1.0, moon_v=1.0, hor_l=0.5, mid_shift=0, light_l=0.96):
    add('pairs', name, note, sky(sky_h, sky_h + mid_shift, sky_h + mid_shift, v, hor_l), moon(moon_h, moon_h, moon_v, light_l=light_l), glow(moon_h, moon_v))


pair('Peach & Teal', 'A peach moon on deep teal. Warm on cool.', 205, 58, 1.0, 1.0)
pair('Gold & Navy', 'A gold moon on navy. The classic.', 264, 85, 1.0, 1.1, 0.42)
pair('Mint & Plum', 'A mint moon on dark plum.', 325, 168, 0.9, 0.9)
pair('Pink & Forest', 'A soft pink moon over a deep forest green.', 152, 2, 0.9, 0.9, 0.44)
pair('Lemon & Violet', 'A lemon moon on violet.', 295, 102, 1.1, 1.0)
pair('Coral & Blue', 'A coral moon on clear blue.', 252, 32, 1.0, 1.1, 0.52)
pair('Ice & Rust', 'An icy blue moon over a rust-red dusk.', 42, 225, 0.9, 0.8)
pair('Lavender & Olive', 'A lavender moon over an olive night.', 112, 298, 0.8, 0.9)
pair('Apricot & Indigo', 'An apricot moon on deep indigo.', 275, 62, 1.1, 1.0, 0.44)
pair('Aqua & Wine', 'An aqua moon on a wine-dark sky.', 8, 190, 0.9, 0.9, 0.42)
pair('Rose & Slate', 'A rose moon on cool slate.', 240, 6, 0.5, 0.9)
pair('Butter & Teal', 'A butter-yellow moon on teal.', 198, 96, 1.0, 0.9)
pair('Blush & Navy', 'A blush-pink moon on navy.', 262, 14, 0.9, 0.8, 0.42)
pair('Lime & Purple', 'A lime moon on purple. Loud, but it works.', 305, 126, 1.1, 1.1)
pair('Sky & Cocoa', 'A sky-blue moon on a cocoa-brown night.', 52, 235, 0.6, 0.9)
pair('Orange & Cyan', 'An orange moon on cyan. Like a film poster.', 215, 52, 1.0, 1.2)
pair('Cream & Emerald', 'A cream moon on deep emerald.', 155, 85, 1.1, 0.45, 0.44)
pair('Lilac & Gold', 'A lilac moon over an old-gold dusk.', 80, 298, 0.8, 0.9, 0.52)
pair('Red & Teal', 'A red moon on near-black teal. Dramatic.', 200, 25, 0.7, 1.25, 0.36)
pair('White & Ultramarine', 'A white moon on ultramarine. Simple and strong.', 266, 262, 1.35, 0.12, 0.5, light_l=0.98)


# ——— Horizons: skies whose hue turns on the way down, like real dusks. ———
def hz(name, note, top, mid, hor, moon_dark, moon_light=None, v=1.0, moon_v=1.0, hor_l=0.68, glow_h=None):
    add('horizons', name, note, sky(top, mid, hor, v, hor_l), moon(moon_dark, moon_light, moon_v), glow(moon_dark if glow_h is None else glow_h, moon_v))


hz('First Light', 'Indigo up top, rose in the middle, warm gold at the horizon.', 280, 340, 50, 35, 60)
hz('Afterglow', 'Blue into violet into coral: the minute after the sun goes.', 262, 305, 28, 355, 40)
hz('Golden Hour', 'Warm all the way: copper, amber, honey.', 35, 55, 80, 70, 88, v=1.1)
hz('Blue Hour', 'Navy into cornflower into pale sky. A cool, white-blue moon.', 266, 250, 232, 230, 220, moon_v=0.6, hor_l=0.72)
hz('Polar', 'Deep blue, then teal, then a green horizon: a northern night.', 255, 195, 150, 170, 185, moon_v=0.8)
hz('Desert Dusk', 'Violet over red rock over an orange horizon.', 292, 20, 62, 55, 72)
hz('Lagoon', 'Blue into turquoise into seafoam.', 250, 208, 172, 182, 190, moon_v=0.9)
hz('Flamingo', 'Purple into pink into coral, with a pink moon.', 302, 350, 22, 0, 20)
hz('Citrus', 'Green into lime into lemon.', 150, 115, 92, 95, 100)
hz('Velvet', 'Indigo into violet into deep rose.', 272, 300, 342, 322, 340, hor_l=0.6)
hz('Sea Glass', 'Slate blue into aqua into pale mint.', 232, 192, 162, 172, 172, v=0.8, moon_v=0.7)
hz('Embers', 'Wine into red into orange, with an amber moon.', 12, 32, 60, 45, 72, v=1.15, hor_l=0.64)
hz('Lavender Dawn', 'Lilac into mauve into a soft peach horizon.', 285, 315, 62, 302, 330, v=0.8, moon_v=0.7)
hz('Monsoon', 'Storm blue into teal into a wet green horizon.', 236, 200, 135, 140, 150, v=0.85, moon_v=0.7, hor_l=0.6)
hz('Grape Soda', 'Purple into magenta into pink. Fizzy.', 290, 322, 352, 330, 345, v=1.2)
hz('Tropic', 'Teal into jade into a lime-gold horizon.', 205, 165, 100, 110, 96, v=1.05)
hz('Rosé', 'Mauve into rose into a peach horizon.', 332, 10, 52, 22, 45, v=0.85)
hz('Nordic', 'Cold blue all the way down to a thin warm band.', 252, 235, 45, 45, 65, moon_v=0.9)
hz('Cotton Candy', 'Violet into pink, with a baby-blue horizon.', 300, 345, 235, 342, 0, moon_v=0.8)
hz('Solstice', 'Indigo into crimson into a gold horizon, and a gold moon.', 272, 12, 82, 80, 92, v=1.1)


# ——— Special: a colour wash across the moon, or a second moon, on a matched sky. ———
def sp(name, note, sky_, moon_, glow_, **extra):
    add('special', name, note, sky_, moon_, glow_, **extra)


NEUTRAL = moon(285, 285, 0.15)
sp('Opaline', 'A pale moon shifting from pink to lilac to aqua, on a lilac night.', sky(282, 302, 330, 0.65, 0.56), NEUTRAL, glow(300, 0.6), tint={'angle': 110, 'stops': wash(355, 300, 205), 'amount': 0.6})
sp('Holographic', 'Pastel rainbow across a white moon, like foil.', sky(272, 300, 215, 0.9, 0.6), NEUTRAL, glow(260, 0.6), tint={'angle': 70, 'stops': wash(350, 80, 150, 220, 300), 'amount': 0.55})
sp('Oil Slick', 'A dark moon with teal, violet and gold slicked across it.', sky(268, 285, 300, 0.6, 0.34), moon(265, 265, 0.3, dark_l=0.3, light_l=0.62), glow(290, 0.8), tint={'angle': 140, 'stops': wash(190, 295, 85, 190, l=0.7, c=0.15), 'amount': 0.75})
sp('Sunset Moon', 'The sunset painted on the moon itself: gold at the top, violet below.', sky(285, 330, 30, 1.0, 0.6), NEUTRAL, glow(20), tint={'angle': 180, 'stops': wash(80, 30, 350, 300), 'amount': 0.65})
sp('Aurora Moon', 'Green into teal into violet across the moon, under a polar sky.', sky(255, 190, 150, 0.9, 0.58), NEUTRAL, glow(170, 0.9), tint={'angle': 160, 'stops': wash(150, 195, 295), 'amount': 0.6})
sp('Peach Melba', 'Peach into raspberry, on a raspberry dusk.', sky(340, 15, 55, 0.95, 0.64), NEUTRAL, glow(25), tint={'angle': 135, 'stops': wash(60, 10, 350), 'amount': 0.6})
sp('Tidepool', 'Aqua, mint and sand across the moon, on a sea-blue night.', sky(228, 195, 170, 0.85, 0.6), NEUTRAL, glow(185, 0.8), tint={'angle': 100, 'stops': wash(210, 165, 85), 'amount': 0.55})
sp('Mermaid', 'Teal into violet across the moon, on deep teal.', sky(250, 205, 180, 1.0, 0.56), NEUTRAL, glow(220), tint={'angle': 120, 'stops': wash(185, 230, 300), 'amount': 0.6})
sp('Sherbet', 'Orange, pink and lemon swirled across the moon.', sky(320, 25, 75, 1.0, 0.68), NEUTRAL, glow(40), tint={'angle': 60, 'stops': wash(55, 0, 100), 'amount': 0.6})
sp('Nebula Moon', 'Blue into magenta across the moon, on a violet night.', sky(278, 308, 338, 1.1, 0.56), NEUTRAL, glow(310), tint={'angle': 135, 'stops': wash(250, 300, 345), 'amount': 0.65})
sp('Fire Opal', 'Red into orange into gold across the moon, on an ember sky.', sky(18, 38, 62, 1.1, 0.6), NEUTRAL, glow(45), tint={'angle': 160, 'stops': wash(28, 55, 85), 'amount': 0.7})
sp('Glacier', 'Blue into cyan into white across the moon, on an icy sky.', sky(252, 225, 200, 0.85, 0.66), NEUTRAL, glow(215, 0.7), tint={'angle': 180, 'stops': wash(250, 210, 200, l=0.88, c=0.08), 'amount': 0.6})
sp('Iris', 'Violet into gold across the moon, like the flower.', sky(275, 292, 65, 0.9, 0.6), NEUTRAL, glow(300, 0.8), tint={'angle': 150, 'stops': wash(295, 300, 85), 'amount': 0.6})
sp('Midnight Garden', 'Violet into green across the moon, over a violet-green night.', sky(272, 300, 150, 0.85, 0.52), NEUTRAL, glow(160, 0.8), tint={'angle': 120, 'stops': wash(300, 230, 150), 'amount': 0.55})
sp('Prism Night', 'A full rainbow across the moon, on a deep blue sky.', sky(265, 262, 255, 1.2, 0.48), NEUTRAL, glow(260, 0.6), tint={'angle': 90, 'stops': wash(20, 80, 145, 230, 300, c=0.15), 'amount': 0.7})
sp('Paper Lantern', 'A warm, glowing amber moon on a soft orange dusk.', sky(30, 45, 65, 0.65, 0.6), moon(60, 80, 1.2, dark_l=0.7, light_l=0.97), glow(65, 1.2), glowOpacity=1)


def twin(name, note, sky_, moon_h, twin_h, at, size, v=1.0, tv=1.0):
    sp(name, note, sky_, moon(moon_h, moon_h, v), glow(moon_h, v), twin={'x': at[0], 'y': at[1], 'size': size, 'moon': moon(twin_h, twin_h, tv), 'glow': glow(twin_h, tv), 'glowOpacity': 0.6})


twin('Two Suns', 'A peach moon below and a small aqua one above, on a dusk that holds both.', sky(282, 330, 45), 50, 200, (0.8, 0.64), 0.22)
twin('Lovers', 'A pink moon and a small violet one, on a pink-to-violet night.', sky(298, 340, 15), 0, 300, (0.2, 0.66), 0.24)
twin('Tide', 'An aqua moon and a little gold one, over the sea.', sky(232, 200, 172), 182, 75, (0.78, 0.68), 0.18)
twin('Lemon & Lime', 'A lemon moon and a small lime one, on a green-gold night.', sky(150, 122, 95), 100, 135, (0.22, 0.67), 0.22)

assert len(MOONS) == 100, len(MOONS)
for m in MOONS:
    m['id'] = 'test-' + re.sub(r'[^a-z0-9]+', '-', m['name'].lower().replace('é', 'e')).strip('-')
    m['kind'] = 'test'
    m['tag'] = next(t for k, t, _ in SETS if k == m['set']).lower()
assert len({m['id'] for m in MOONS}) == 100
OUT.write_text(json.dumps({'sets': [{'key': k, 'title': t, 'sub': s} for k, t, s in SETS], 'moons': MOONS}, indent=1, ensure_ascii=False) + '\n')
print(len(MOONS), '->', OUT)
