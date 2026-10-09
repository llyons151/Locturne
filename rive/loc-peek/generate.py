"""Builds scene.rml: Loc peeking over the panel's edge (rebuilt from scratch, October 7, 2026).

The drawing is clean vector parts in design/shapes.py. This file rigs them and animates them:

    Body (tilts and rises from its base)
      Head (breathes)
        Face: head outline with the eye slits cut out (even-odd)
          Eye R, Eye L: blink about their own centres
        Ear R, Ear L: turn about bases buried inside the head, so no seam can show
      Paw R, Paw L: each grabs the edge on its own pivot (they lean with him)

Motion: "Peek" rises in once (eyes open after he lands), then "Idle" loops: breathing, a slow
unimpressed lean, blinks and ear twitches with an elastic settle.

    python3 rive/loc-peek/generate.py && rive rive/loc-peek --verify
"""

import math
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / "design"))
import shapes  # noqa: E402

W, H = shapes.W, shapes.H
BASE = (W / 2, H)  # the body's pivot: centre of the edge

EYE_CENTRES = {"eyeR": (357, 220), "eyeL": (W - 357, 220)}
EAR_PIVOTS = {"earR": (410, 145), "earL": (W - 410, 145)}
PAW_PIVOTS = {"pawR": (518, H), "pawL": (W - 518, H)}

FPS = 60
# Easing curves (cubic-bezier, like CSS).
SOFT = (0.45, 0, 0.55, 1)     # breathing, leaning
OUT = (0.22, 1, 0.36, 1)      # arriving
SETTLE = (0.33, 0, 0.2, 1)    # a quick move that lands softly
BLINK = (0.4, 0, 0.6, 1)


# --- geometry -------------------------------------------------------------------------------

def segments(cmds):
    """Absolute M/C/L/Z commands -> list of closed subpaths of (kind, c1, c2, end, start)."""
    subpaths, segs, cur, start = [], [], None, None
    for c in cmds:
        if c[0] == "M":
            if segs:
                subpaths.append(segs)
            segs, cur, start = [], c[1], c[1]
        elif c[0] == "C":
            segs.append(("C", c[1], c[2], c[3], cur))
            cur = c[3]
        elif c[0] == "L":
            segs.append(("L", None, None, c[1], cur))
            cur = c[1]
        elif c[0] == "Z":
            if cur != start:
                segs.append(("L", None, None, start, cur))
            subpaths.append(segs)
            segs, cur = [], start
    if segs:
        subpaths.append(segs)
    return subpaths


def vertices(seg_list, offset):
    """One closed subpath as detached cubic vertices, relative to `offset`."""
    ox, oy = offset
    out, poly = [], []
    n = len(seg_list)
    for k in range(n):
        kind, c1, _, _, start = seg_list[k]
        prev = seg_list[k - 1]
        x, y = start
        out_pt = c1 if kind == "C" else start
        in_pt = prev[2] if prev[0] == "C" else start

        def handle(p):
            return math.atan2(p[1] - y, p[0] - x), math.hypot(p[0] - x, p[1] - y)

        ir, idist = handle(in_pt)
        orr, odist = handle(out_pt)
        out.append(
            f'<CubicDetachedVertex x="{x - ox:.3f}" y="{y - oy:.3f}" inRotation="{ir:.5f}" '
            f'inDistance="{idist:.3f}" outRotation="{orr:.5f}" outDistance="{odist:.3f}"/>'
        )
        poly.append((x, y))
    area = sum(poly[k][0] * poly[(k + 1) % n][1] - poly[(k + 1) % n][0] * poly[k][1] for k in range(n))
    return out, area > 0  # y-down shoelace: positive is clockwise on screen


def path(name, cmds, offset, at=(0, 0), pid=None):
    """A PointsPath placed at `at` (shape space), vertices relative to `offset`."""
    blocks = []
    for sp in segments(cmds):
        verts, cw = vertices(sp, offset)
        ident = f' id="{pid}"' if pid else ""
        inner = "\n".join("    " + v for v in verts)
        blocks.append(
            f'<PointsPath x="{at[0]:.3f}" y="{at[1]:.3f}" isClosed="true" isClockwise="{str(cw).lower()}" '
            f'name="{name}"{ident}>\n{inner}\n</PointsPath>'
        )
    return "\n".join(blocks)


def black_fill(rule="nonZero"):
    return f'<Fill fillRule="{rule}" name="Fill">\n    <SolidColor colorValue="FF000000" name="Black"/>\n</Fill>'


def indent(text, n):
    return "\n".join((" " * n + line) if line.strip() else line for line in text.split("\n"))


# --- animation ------------------------------------------------------------------------------

def kf(frame, value, ease):
    """ease: None (linear), 'hold', a cubic tuple, or ('elastic', amplitude, period)."""
    if isinstance(ease, tuple) and ease and ease[0] == "elastic":
        _, amp, period = ease
        return (f'<KeyFrameDouble value="{value:.5f}" frame="{frame}" interpolationType="elastic">\n'
                f'    <ElasticInterpolator easingValue="easeOut" amplitude="{amp}" period="{period}"/>\n'
                f'</KeyFrameDouble>')
    if isinstance(ease, tuple):
        x1, y1, x2, y2 = ease
        return (f'<KeyFrameDouble value="{value:.5f}" frame="{frame}" interpolationType="cubic">\n'
                f'    <CubicEaseInterpolator x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>\n'
                f'</KeyFrameDouble>')
    kind = "hold" if ease == "hold" else "linear"
    return f'<KeyFrameDouble value="{value:.5f}" frame="{frame}" interpolationType="{kind}"/>'


def track(objid, prop, frames, base=0.0):
    """frames: [(frame, offset, ease)]; keyed values are absolute, so base + offset."""
    body = "\n".join(indent(kf(f, base + v, e), 8) for f, v, e in frames)
    return (f'<KeyedObject objectId="{objid}">\n    <KeyedProperty property="{prop}">\n'
            f'{body}\n    </KeyedProperty>\n</KeyedObject>')


ID = {
    "body": "0:20", "head": "0:21", "earR": "0:22", "earL": "0:23",
    "eyeR": "0:24", "eyeL": "0:25", "pawR": "0:26", "pawL": "0:27",
}


def peek():
    """Rises in once: overshoots a hair, squashes as he lands, ears follow through, eyes
    open, then the hands grab the edge, right first."""
    hide = H - 60  # enough to put the ear tips below the edge
    return [
        track(ID["body"], "y", [(0, hide, OUT), (50, -7, SOFT), (70, 0, None)], base=BASE[1]),
        track(ID["head"], "scaleY", [(0, 1, "hold"), (46, 1, SETTLE), (56, 0.97, SOFT), (72, 1, None)]),
        track(ID["head"], "scaleX", [(0, 1, "hold"), (46, 1, SETTLE), (56, 1.018, SOFT), (72, 1, None)]),
        # Ears trail the rise pressed back, then spring upright.
        track(ID["earR"], "rotation", [(0, 0.22, "hold"), (42, 0.22, SETTLE), (52, -0.07, ("elastic", 0.6, 0.35)), (84, 0, None)]),
        track(ID["earL"], "rotation", [(0, -0.22, "hold"), (44, -0.22, SETTLE), (54, 0.07, ("elastic", 0.6, 0.35)), (86, 0, None)]),
        # Eyes open a beat after he lands: he's looking at you now.
        track(ID["eyeR"], "scaleY", [(0, 0.004, "hold"), (64, 0.004, OUT), (80, 1, None)]),
        track(ID["eyeL"], "scaleY", [(0, 0.004, "hold"), (64, 0.004, OUT), (80, 1, None)]),
        track(ID["pawR"], "y", [(0, 70, "hold"), (54, 70, OUT), (66, -4, SOFT), (76, 0, None)], base=PAW_PIVOTS["pawR"][1] - BASE[1]),
        track(ID["pawL"], "y", [(0, 70, "hold"), (60, 70, OUT), (72, -4, SOFT), (82, 0, None)], base=PAW_PIVOTS["pawL"][1] - BASE[1]),
    ], 90


def idle():
    """An eight-second loop: two breaths, a slow unimpressed lean and back, a blink and a
    double blink, and one twitch per ear."""
    n = 480
    blink = lambda: [(0, 1, "hold"), (150, 1, BLINK), (155, 0.004, BLINK), (163, 1, "hold"),
                     (396, 1, BLINK), (401, 0.004, BLINK), (408, 1, BLINK), (413, 0.004, BLINK), (421, 1, "hold"), (n, 1, None)]
    return [
        track(ID["head"], "scaleY", [(0, 1, SOFT), (120, 1.014, SOFT), (240, 1, SOFT), (360, 1.014, SOFT), (n, 1, None)]),
        track(ID["head"], "scaleX", [(0, 1, SOFT), (120, 0.996, SOFT), (240, 1, SOFT), (360, 0.996, SOFT), (n, 1, None)]),
        track(ID["body"], "rotation", [(0, 0, "hold"), (190, 0, SOFT), (260, -0.035, "hold"), (330, -0.035, SOFT), (420, 0, None), (n, 0, None)]),
        track(ID["eyeR"], "scaleY", blink()),
        track(ID["eyeL"], "scaleY", blink()),
        track(ID["earL"], "rotation", [(0, 0, "hold"), (80, 0, SETTLE), (85, -0.12, ("elastic", 0.7, 0.3)), (115, 0, "hold"), (n, 0, None)]),
        track(ID["earR"], "rotation", [(0, 0, "hold"), (300, 0, SETTLE), (304, 0.15, ("elastic", 0.7, 0.3)), (338, 0, "hold"), (n, 0, None)]),
    ], n


# --- scene ----------------------------------------------------------------------------------

def scene(backdrop="00000000"):
    P = shapes.PARTS
    bx, by = BASE
    # Face: the head outline plus both eyes as even-odd holes. The shape sits at minus the
    # body's position so its paths draw in artboard space.
    eyes = []
    for k in ("eyeR", "eyeL"):
        cx, cy = EYE_CENTRES[k]
        eyes.append(path("Eye " + k[-1], P[k], (cx, cy), at=(cx, cy), pid=ID[k]))
    face = (f'<Shape x="{-bx}" y="{-by}" name="Face">\n'
            + indent(path("Outline", P["head"], (0, 0)), 4) + "\n"
            + indent("\n".join(eyes), 4) + "\n"
            + indent(black_fill("evenOdd"), 4) + "\n</Shape>")

    def part(key, label):
        px, py = EAR_PIVOTS.get(key) or PAW_PIVOTS[key]
        return (f'<Shape x="{-px}" y="{-py}" name="{label}">\n'
                + indent(path("Path", P[key], (0, 0)), 4) + "\n"
                + indent(black_fill(), 4) + "\n</Shape>")

    ears = []
    for key, label in (("earR", "Ear R"), ("earL", "Ear L")):
        px, py = EAR_PIVOTS[key]
        ears.append(f'<Node x="{px - bx}" y="{py - by}" name="{label} Pivot" id="{ID[key]}">\n'
                    + indent(part(key, label), 4) + "\n</Node>")
    paws = []
    for key, label in (("pawR", "Paw R"), ("pawL", "Paw L")):
        px, py = PAW_PIVOTS[key]
        paws.append(f'<Node x="{px - bx}" y="{py - by}" name="{label} Pivot" id="{ID[key]}">\n'
                    + indent(part(key, label), 4) + "\n</Node>")

    # First sibling draws on top: paws in front of the face, face in front of the ears. The
    # paws are his, so they lean with the body (not the head, so breathing leaves them be).
    head = (f'<Node name="Head" id="{ID["head"]}">\n' + indent(face, 4) + "\n"
            + indent("\n".join(ears), 4) + "\n</Node>")
    body = (f'<Node x="{bx}" y="{by}" name="Body" id="{ID["body"]}">\n'
            + indent("\n".join(paws), 4) + "\n" + indent(head, 4) + "\n</Node>")

    peek_tracks, peek_len = peek()
    idle_tracks, idle_len = idle()
    return f'''<Rive version="1" kind="fragment">
    <!-- Generated by generate.py from design/shapes.py. Edit those, not this. -->
    <Artboard isComponent="true" defaultStateMachineId="0:7" styleId="0:5" clip="true" width="{W}" height="{H}" name="Loc Peek" id="0:2">
        <LayoutComponentStyle name="Artboard Style" id="0:5"/>

        <!-- Transparent: the app's moon shows behind him (and through his eyes). -->
        <Fill name="Background">
            <SolidColor colorValue="{backdrop}" name="Color"/>
        </Fill>

{indent(body, 8)}

        <StateMachine name="Peek" id="0:7">
            <StateMachineLayer name="Layer 1" id="0:8">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState>
                    <StateTransition stateToId="0:12"/>
                </EntryState>
                <AnimationState x="160" animationId="0:10" id="0:12">
                    <StateTransition stateToId="0:13" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="360" animationId="0:11" id="0:13"/>
            </StateMachineLayer>
        </StateMachine>

        <LinearAnimation fps="{FPS}" duration="{peek_len}" name="Peek" id="0:10">
{indent(chr(10).join(peek_tracks), 12)}
        </LinearAnimation>

        <LinearAnimation fps="{FPS}" loopValue="loop" duration="{idle_len}" name="Idle" id="0:11">
{indent(chr(10).join(idle_tracks), 12)}
        </LinearAnimation>
    </Artboard>

    <ComponentAsset artboardId="0:2" name="Loc Peek"/>

    <!-- Preview only: Loc on the moon-blue panel above the black tab strip, as in the app.
         The app loads the "Loc Peek" artboard, which is transparent. -->
    <Artboard styleId="0:41" x="{W + 80}" width="{W}" height="{H + 60}" name="Preview" id="0:40">
        <LayoutComponentStyle name="Preview Style" id="0:41"/>
        <Fill name="Strip">
            <SolidColor colorValue="FF000000" name="Black"/>
        </Fill>
        <NestedArtboard artboardId="0:2" name="Loc">
            <NestedStateMachine animationId="0:7" name="Peek"/>
        </NestedArtboard>
        <Shape x="{W / 2}" y="{H / 2}" name="Panel">
            <Rectangle width="{W}" height="{H}" name="Path"/>
            <Fill name="Fill">
                <SolidColor colorValue="FF5A6FA8" name="Moon Blue"/>
            </Fill>
        </Shape>
    </Artboard>
</Rive>
'''


if __name__ == "__main__":
    backdrop = sys.argv[1] if len(sys.argv) > 1 else "00000000"
    (HERE / "scene.rml").write_text(scene(backdrop))
