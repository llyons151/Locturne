"""Loc's peek, drawn from scratch as clean vector parts (October 6, 2026).

Artboard space: 600 x 320, the panel's edge along the bottom (y = 320). Each part is its own
closed shape, layered so that nothing tears when it moves: the ears' bases and the paws'
bottoms sit deep inside or below other black, never on an edge.

Shapes are SVG path strings in absolute M/C/L/Z. The right half is authored; `mirror` makes
the left, so Loc is symmetric until the rig tilts him.
"""

import re

W, H = 600, 320

# The head, right half: top centre, temple, cheek, three cheek tufts, then down past the edge.
HEAD_RIGHT = [
    ("M", (300, 104)),
    ("C", (354, 104), (406, 112), (434, 138)),
    ("C", (458, 160), (472, 184), (476, 208)),
    # Cheek fur sweeps out and down in soft locks; the last ducks behind the edge.
    ("C", (490, 216), (504, 228), (512, 246)),
    ("C", (513, 249), (511, 251), (508, 250)),
    ("C", (496, 248), (486, 251), (478, 256)),
    ("C", (490, 266), (500, 278), (504, 292)),
    ("C", (505, 295), (503, 297), (500, 296)),
    ("C", (490, 295), (480, 298), (472, 303)),
    ("C", (482, 312), (490, 322), (492, 336)),
    ("L", (468, 400)),
]

EAR_RIGHT = [
    ("M", (380, 128)),
    ("C", (392, 102), (414, 82), (438, 76)),
    ("C", (458, 71), (472, 82), (471, 100)),
    ("C", (470, 118), (458, 140), (440, 162)),
    ("Z",),
]

# A hand over the edge: four rounded fingertips, in front of the cheek fur.
PAW_RIGHT = [
    # The inner edge starts inside the face, so its corner never shows against the fur.
    ("M", (448, 360)),
    ("L", (448, 308)),
    ("C", (454, 293), (484, 287), (500, 293)),
    ("C", (504, 284), (520, 284), (524, 295)),
    ("C", (528, 285), (543, 285), (546, 295)),
    ("C", (550, 287), (565, 288), (566, 300)),
    ("C", (567, 306), (567, 312), (567, 318)),
    ("L", (567, 360)),
    ("Z",),
]

EYE_RIGHT = [
    ("M", (334, 214)),
    ("C", (346, 211), (366, 212), (380, 217)),
    ("C", (374, 230), (346, 232), (334, 214)),
    ("Z",),
]


def mx(p):
    return (W - p[0], p[1])


def mirror(cmds):
    """The same closed shape reflected across the centre line."""
    out = []
    for c in cmds:
        out.append((c[0],) + tuple(mx(p) for p in c[1:]))
    return out


def head():
    """The full head outline: right half down, across below the edge, left half back up."""
    right = HEAD_RIGHT
    # Walk the right half backwards, mirrored, for the left side (bottom up to the top).
    pts = [right[0][1]]
    segs = []
    for c in right[1:]:
        segs.append(c)
    left = []
    cur = mx(segs[-1][-1])
    for k in range(len(segs) - 1, -1, -1):
        seg = segs[k]
        start = right[0][1] if k == 0 else segs[k - 1][-1]
        if seg[0] == "C":
            left.append(("C", mx(seg[2]), mx(seg[1]), mx(start)))
        else:
            left.append(("L", mx(start)))
    return right + [("L", mx(right[-1][-1]))] + left + [("Z",)]


def d(cmds):
    out = []
    for c in cmds:
        out.append(c[0] + " ".join(f"{x:g},{y:g}" for x, y in c[1:]))
    return " ".join(out)


PARTS = {
    "head": head(),
    "earR": EAR_RIGHT,
    "earL": mirror(EAR_RIGHT),
    "pawR": PAW_RIGHT,
    "pawL": mirror(PAW_RIGHT),
    "eyeR": EYE_RIGHT,
    "eyeL": mirror(EYE_RIGHT),
}


def preview_svg(scale=2, eyes=True):
    """Loc on a moon-blue panel over the black strip, as he'll sit in the app."""
    body = " ".join(d(PARTS[k]) for k in ("head",) + (("eyeR", "eyeL") if eyes else ()))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W*scale}" height="{(H+60)*scale}" viewBox="0 0 {W} {H+60}">
<rect width="{W}" height="{H}" fill="#5A6FA8"/><rect y="{H}" width="{W}" height="60" fill="#000"/>
<path d="{d(PARTS['earR'])}"/><path d="{d(PARTS['earL'])}"/>
<path fill-rule="evenodd" d="{body}"/>
<path d="{d(PARTS['pawR'])}"/><path d="{d(PARTS['pawL'])}"/>
</svg>'''


if __name__ == "__main__":
    import sys
    open(sys.argv[1], "w").write(preview_svg(eyes="--no-eyes" not in sys.argv))
