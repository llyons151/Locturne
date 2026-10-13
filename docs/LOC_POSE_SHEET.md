# Loc pose sheet: image prompts

Written October 12, 2026. It follows open decision 1 in [MASCOT_STRATEGIES.md](MASCOT_STRATEGIES.md):
run one GPT Image 2.5 Sunburst sheet from the peek silhouette to explore poses. The output is
for reference and tracing only; nothing AI-generated ships as-is.

## How to run it

- **Model:** GPT Image 2.5 Sunburst, in ChatGPT or through the API.
- **Attach:** `assets/images/loc/loc-peek-source.png` as the style reference.
- **Output:** a square image, 2048×2048 or larger, with a transparent background. If
  transparency fails, use a flat pure-white background. A black silhouette keys out cleanly.
- Run prompt A first. Run prompt B once you've picked the poses you like. Use prompt C to add
  or redo poses.

## Prompt A: the pose sheet (16 poses)

```
Use the attached image as the exact character and style reference. It's "Loc", a raccoon
drawn as a solid flat black silhouette: big rounded head, two tall pointed ears (the left one
slightly taller), spiky cheek fluff on both sides, and small round knuckled paws.

Make a character pose sheet: a 4×4 grid of 16 equal square cells on a transparent background.
There's one pose per cell, centred, with generous empty space around it. No grid lines, borders,
labels, numbers or text anywhere.

STYLE RULES (strict, every cell):
- 100% solid flat black (#000000) fill only. No grey, shading, gradients, outlines, texture,
  highlights, glow, or drop shadows.
- No facial features at all: no eyes, mouth, nose or mask markings. The silhouette is solid.
  All acting comes from the outline: ears, posture, paws and tail.
- Same character and same proportions in every cell. The head is the same size in every cell,
  and the full body is about 2.5 heads tall when sitting.
- A thick, bushy raccoon tail with a rounded tip. It's part of the solid silhouette.
- Clean smooth vector-like curves, like a cut-paper shadow puppet. Stubby cute cartoon
  proportions, not realistic.
- Every pose sits on the same invisible floor line, at the same height in its cell, except
  where a pose says otherwise.
- Side-on or three-quarter views are fine, but the outline must read clearly at small sizes:
  keep ears, paws and tail separated from the body by clear gaps where possible.

POSES, left to right, top to bottom:
Row 1 (moods):
1. Asleep: curled into a tight ball on the floor, tail wrapped over his nose like a blanket,
   ears relaxed.
2. Groggy: sitting slumped, head drooping forward, one ear flopped sideways, arms hanging.
3. Awake: sitting upright, alert, both ears straight up, paws resting on his knees.
4. Smug: sitting tall, chin raised, arms crossed, tail curled up behind him.
Row 2 (reactions):
5. Betrayed: recoiling backwards, ears flat back, tail puffed up huge, paws raised in shock.
6. Side-eye: body facing forward, head turned sharply sideways, shoulders hunched up.
7. Screech: standing on hind legs, arms thrown up, ears pinned back, tail bristling.
8. Dead inside: sitting completely limp, slouched, arms dangling, ears drooping, staring
   straight ahead.
Row 3 (drama):
9. Fainting: mid-fall backwards, one paw on his forehead, body tilted 45 degrees.
10. Fainted: lying flat on his back on the floor, limbs splayed, tail limp.
11. Fuming: hunched forward, fists clenched at his sides, ears pinned flat, tail stiff.
12. Nope: only the top of his head, ears and two paws visible above a flat ledge line, the
    same peek as the reference, but ducking lower so the eyes area is hidden.
Row 4 (actions):
13. Ledge climb: one paw slapped over a flat ledge edge, the top of his head just rising
    behind it.
14. Hauling up: both elbows hooked over the ledge, chin on the edge, ears pinned back
    with effort.
15. Waking stretch: standing on hind legs, arms stretched high overhead, back arched, a
    big yawn posture.
16. Clinging: lying on his belly and gripping the floor with both front paws, body stretched
    out as if being dragged backwards by his tail.

The ledge in poses 12–14 is a straight horizontal edge in solid black. Its bottom is cropped
flat, matching the reference.
```

## Prompt B: the parts sheet (for rigging)

Run this in the same chat, after A, so it keeps the same character.

```
Same character and style as before: Loc, the solid flat black raccoon silhouette.

Make a rigging parts sheet on a transparent background. Draw Loc in the neutral "Awake"
sitting pose (pose 3), then lay out his body parts separately, like a paper cut-out puppet kit,
each piece with a clear gap around it:
- head without ears (including the cheek fluff)
- left ear
- right ear
- torso
- left arm with paw
- right arm with paw
- left leg with foot
- right leg with foot
- tail

Each piece has a rounded overlapping end at its joint (like a paper fastener joint), so it can
be rotated without gaps showing. Every piece is at the same scale as the assembled figure.
Assembled figure on the left third; parts arranged in a loose grid on the right two thirds.

Solid flat black (#000000) only. No eyes, faces, outlines, shading, grey, glow, shadows,
labels or text.
```

## Prompt C: follow-ups

```
Keep the exact same character, proportions, head size and flat black silhouette style as the
pose sheet. Redraw only pose [N] as: [description]. Single pose, centred, transparent
background, same rules: solid black only, no facial features, no text.
```

## What happens after

1. **Slice the sheet** into cells, and key out the background if it isn't transparent.
2. **Pick the poses**, then clean and trace each to an SVG path (potrace, then hand edits).
   The hand edits are what make the drawing ours (see the copyright note in
   MASCOT_STRATEGIES).
3. **Rig, don't flipbook.** The sheet holds key poses, not in-between frames, and AI can't
   draw in-betweens consistently. The parts sheet (B) becomes the bones: root, body, head,
   ears, arms, legs, tail, the same model as the current rig in `loc-rig.ts`. Each sheet pose
   becomes a set of bone targets, and the existing engine (keyframes, staggered joints,
   physics) moves between them.
4. **The rig adds the face.** The eyes, mouth and moon-window mask are cut in by the rig, so
   none are drawn in the sheet.

Pose → rig mapping: poses 1–4 are the states (asleep, groggy, awake, smug), 5–11 feed the
dramatic bits (betrayed, side-eye, screech, dead inside, faint, vibrating), 12–14 are the
entrance options (nope, ledge climb), and 15–16 are the waking stretch and the Live Activity
"dragged out of bed" idea.

## Round 2: lock the head first (same day)

**Sheet v1 was rejected** (`design-references/loc-poses/sheet-v1-rejected.png`). Loc drifted
into a generic fox/cat: snouts, floppy ears, white line-art seams, melted limbs. Causes:
- the reference only shows a head, so the model invented the body from stock clip art;
- the prompt allowed side views, which forced it to invent a profile (and a snout);
- 16 poses in one image left about 300 px per figure, so detail came from memory.

**Fix:** generate one front-facing sitting Loc first, then use it as the reference. The result
(`design-references/loc-poses/loc-sitting-locked.png`) keeps the original head. Its weak spot
is the lower body: no arms, and the paws read as a row of toes.

From now on: front-facing only (slight turns at most), four poses per image, and attach both
`loc-peek-source.png` and `loc-sitting-locked.png`.
