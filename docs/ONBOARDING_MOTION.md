# Onboarding: where motion and interaction should go

September 26, 2026. The question: which onboarding screens would get the most out of
animation or interaction, so that more people pay. This is an audit of the current
25-screen flow (`STEPS` in `src/features/onboarding/content.ts`). Nothing here is
built yet.

## What the evidence supports

Decoration on its own is the weakest lever. In Adapty's paywall tests, "visuals/copy"
changes won only 34.6% of the time, the lowest win rate of any category
([PAYWALL_VIDEO_NOTES.md](PAYWALL_VIDEO_NOTES.md)). Three kinds of motion do have
support:

1. **Letting the user drive the product before paying (the aha moment).** Simply Draw
   animating the child's own drawing during onboarding "really increased" conversion
   (sub-club theme 06). Locturne's version is watching *their* apps fall asleep and
   waking them up themselves.
2. **Investment: the user builds something and sees it take shape.** Burner, Duolingo
   and the IKEA effect (sub-club theme 09, [ONBOARDING_CONVERSION.md](ONBOARDING_CONVERSION.md)).
   The motion should make their choices look real and theirs.
3. **Haptics.** Haptic feedback raised add-to-cart by 32%+ (JCR 2025). The flow already
   has good coverage: taps, the math ticks, the rolling number, the reveal grid and the
   hold button.

The rest is craft with anecdotal support: Tinder's shimmer on the paywall, Duolingo
celebrating a purchase, Opal's gem-cracking interaction.

**Limits that still apply:** no glow (CLAUDE.md), no fake "building your plan" loaders
beyond the real math screen ([ONBOARDING_RESEARCH.md](ONBOARDING_RESEARCH.md)), respect
Reduce Motion (the flow already uses `useReducedMotion`), and italic serif is only for
Loc's voice.

## The gap in the current flow

The flow has three big moments: the reveal, `tomorrow` and `commit`. After `commit`,
the user sees text right up to the price. The screens with the most sway over the
purchase are `apps` → `ready` → `commit` → `offer`, the setup the user has just built.
That's where the motion is thinnest.

There's also a mismatch. `tomorrow` shows a hardcoded Instagram, because it runs before
the user picks apps. Nothing after `apps` shows *their* apps sleeping.

## Recommendations, ranked by expected effect on paying

### 1. `apps`: their apps go to sleep (high effect, low cost)

After tapping "Put 3 to sleep", each chosen icon in turn dims, shrinks slightly and gets
a small moon badge, with one `tick` haptic per app and a `thud` on the last. Then it
advances. It takes about a second. This is the moment the user's investment becomes
visible, and it previews the product using their own apps.

**Built September 26, 2026, as a transition** (`sleep-drop.tsx`, the founder's idea).
Tapping "Put N to sleep" fades the page. The picked icons lift slightly out of their rows,
then fall into the moon one after another, bottom one first. They shrink as they go, as
if dropping away into the distance, easing down onto the moon's face and fading out there. A light haptic
plays as each one lets go, and a success haptic at the end. As the last one vanishes,
"Tonight's lock is ready" fades in. About 2.4s for 3 apps (slowed down on the founder's request). The easing is slow in and
slow out, with no bounce, spin or overshoot. Reduce Motion skips straight to the next
screen. It's skipped when editing apps from `ready`.

**Rejected on the way (don't bring back):** splashes, ripples and droplets; dark glass
tiles with locks; recolouring the moon (a Terraria-Shimmer liquid); moon shake, swell or
bursts; icons shooting back out and an "Out cold." row; sinking under the moon's edge with frost. The founder's rules: the moon
never changes, it should feel premium rather than poppy, and it's a transition into the
next screen, not a show.

### 2. `offer`: the trial timeline shows their sleeping apps (high effect, low cost)

The "Tonight" row carries the sleeping icons from #1. The rows arrive one after another
(Tonight, Day 5, Day 7), so the eye reads the timeline in order. The Blinkist timeline is
the most replicated paywall win we have. This makes its first row concrete instead of a
sentence.

### 3. `tomorrow`: let the user drive it (high effect, medium cost)

It's currently a 6-second scripted film. Make two beats interactive:

- **The user taps the app**, not a scripted finger. The shield comes up under their own
  tap.
- **"Hold to walk"** under the phone. While held, the step count climbs with a footstep
  haptic every ~10 steps. At 200, the shield lifts with `done`.

This is the Simply Draw pattern without the friction of the real walk test that was cut.
It stays labeled as a demo. Keep auto-play as the fallback if they don't touch it for
about 3 seconds, and with Reduce Motion on.

### 4. `commit`: the lock closes (medium effect, low cost)

The hold already ramps haptics. The payoff at completion is only the button label
changing. Add a short end beat: the pledge text settles, a lock shackle closes with a
`thud`, then it advances. The user should feel something land before the price appears.

### 5. `bedtime` / `wake`: live readout (medium effect, low cost)

Under the wheel, a rolling number updates as they scroll: "Apps asleep for 8h 30m." The
setup starts to feel like it's being built. `RollingNumber` already exists.

### 6. The quiz run: small reactions (medium effect, low cost)

There are 11 moon screens in a row (`nights` → `time-back`). On selection, the chosen
pill springs (scale 0.97 → 1), and on 3–4 of the questions one short voice line fades in
before the page advances. Only where he has something to say, not on every screen. That
means lengthening `ADVANCE_AFTER_CHOICE_MS` on those screens only. This keeps momentum
without new screens.

### 7. `reveal` → `bedtime`: the squares go to sleep (medium effect, low cost)

On "Let's fix this", the lit squares dim back, one wave across the grid, before the next
screen. It's a before-and-after picture of the fix, and it connects the reveal to the
setup that follows.

### 8. `plans`: a sheen on the CTA (unproven, low cost)

Tinder's shimmer is anecdotal. A white light sweep could read as a glow under
CLAUDE.md's rule, so **this needs the founder's explicit OK before it's built**. If it's
approved: a neutral, monochrome sweep every ~4s on the Start button only.

### 9. `armed`: the purchase lands (reduces refunds and remorse, not conversion)

A live countdown to bedtime ([ONBOARDING_VARIETY.md](ONBOARDING_VARIETY.md) #6) and a
`done` haptic. Duolingo celebrates purchases. Keep it dry and in character, with no
confetti: he's tired.

## The bigger lever: the raccoon, animated

A mascot that reacts (asleep on `hello`, one eye opening at the reveal, a yawn at
`commit`, grumbling awake at 200 steps in `tomorrow`) would likely beat everything above
on its own. It needs real illustrated art in a state-machine format (Rive), not shapes
drawn in code. The code-drawn animation showcase was rejected. **Get a reference and
art first** ([MASCOT_DIRECTION.md](MASCOT_DIRECTION.md)). Don't start this as a code
task.

## Suggested order

Build 1 and 2 together (shared sleeping-icon component), then 4, then 3. Those four
touch the screens right before the paywall. 5–7 are polish. 8 needs a decision. The
raccoon is a separate art project.

Once the paywall SDK exists, test the bundle of 1–4 against the current flow as one
variant. Individually, none of them will move conversion enough to measure at launch
traffic.
