# Mist in won days (Home week strip)

User's ask, 2026-10-08: a day you got up fills with a little of the blurred mist from the
bottom of the background. It should be native Swift, act like a fluid sim inside the circle when
the phone moves or shakes, and look amazing.

## Research: which technique

| Option | Verdict |
| --- | --- |
| Particle fluid (LiquidFun / SPH, as in Kodeco's LiquidFun + Metal tutorial) | Reads as water drops, not mist. Rejected. |
| Shader-only fake (noise that offsets with tilt) | Cheap, but nothing actually sloshes or settles. Rejected. |
| **Eulerian Stable Fluids (Stam), density = mist** (as in FluidDynamicsMetal, PocketFlow, Fluidium) | Picked. Mist is a dye field, so it reads as fog, swirls naturally, and stays cheap at small sizes. |

Key points from building it:
- **Uniform gravity does nothing in a closed jar.** The pressure solve cancels it. Gravity and
  shake have to push on the mist in proportion to how much denser it is than the jar's average
  (Boussinesq), and that's what makes it slosh.
- **Plain semi-Lagrangian advection washes a 32-cell jar to grey in seconds.** The fix is
  MacCormack advection plus "settling", where droplets drift downhill on their own and pile up
  against the wall, keeping the total amount of mist constant.
- **CPU sim, GPU draw.** A 32×32 grid costs ~0.25 ms a step on desktop, so seven dots are cheap.
  Metal handles the look: a warp, a 9-tap blur, grain, the moon's blues and a faint glass edge.
- CoreMotion device motion (gravity, userAcceleration, rotationRate) needs no permission prompt.
  The app is portrait-locked, so the device axes map straight onto the screen.

## Where it lives

- `modules/mist-dot/ios/MistFluid.swift`: the solver (Foundation only, so it runs on Linux).
- `modules/mist-dot/ios/MistDotModule.swift`: shared motion reader, Metal view, shader.
- `src/features/home/home-content.ios.tsx`: won days host `MistDotView` inside their ring.
  Builds without the module fall back to the white check circle.
- `tools/mist-dot/`: off-device harness. `main.swift` runs rest/tilt/shake/spin/flat scenarios
  and `render.py` mirrors the shader in numpy. Preview: `docs/design-references/mist-dot-preview.png`.

Tuning knobs (in `MistFluid`): `sink`, `fling`, `spin`, `settling`, `vorticity`, `damping`, `breath`, `fill`.
Final tuning needs a real device.
