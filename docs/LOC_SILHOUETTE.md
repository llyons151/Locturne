# Loc as an animated silhouette

Research of October 10, 2026. The goal: put Loc in onboarding, starting from the onboarding
rating (8.5/10, "you never see Loc"). The user's brief is that he **stays a silhouette** and is
**animated eventually**.

This is research, not a build.

## What exists

- **`assets/images/loc/loc-peek-source.png`:** Loc peeking over an edge, with his head, ears,
  cheek fluff and two paws. It's traced to an SVG path in `src/features/home/loc-peek.tsx`
  (`LocSilhouette`), drawn in the strip's black in front of the moon.
- **[MASCOT_DIRECTION.md](MASCOT_DIRECTION.md):** a tired, sassy raccoon. His props are a sleep
  mask (down at night, pushed up by day) and his tail wrapped round him like a blanket.
- **Painted art in `assets/onboarding/raccoon-*.png`:** an older direction, not silhouettes.

## How a silhouette acts

A silhouette has no face, so all the acting is in the **outline**. That's a strength: it reads
at any size, works in both themes and never looks "vibe coded". Wordless games like *Limbo*
and *Inside*, and shadow puppetry, show how much it can carry. What a silhouette Loc can use:

| Tool | Reads as |
|---|---|
| **Ears** | Up = alert or smug; flat or back = done with you; one ear flick = "I heard that" |
| **Posture** | Slumped = asleep or groggy; sitting up tall = smug; a slow stretch = waking |
| **Tail** | Wrapped round him = asleep (his blanket); swishing = sass; puffed = betrayal |
| **Breathing** | A 1–2% rise and fall says "alive" even when he's still |
| **Eye slits (negative space)** | Two thin cuts that show the sky behind him: half-closed = sleepy, wide = betrayed. **This is the one face feature worth adding.** It's still a pure silhouette, just with holes in it. |
| **The mask** | A shape on his head: pulled down at night, pushed up by day |

**Two open choices:**
- **The mask's colour.** MASCOT_DIRECTION makes it the one brand colour. In an all-black
  silhouette, a coloured mask would be the only colour in the whole app. Either it stays black
  (a shape only), or it's the single accent. This is your call.
- **No glow.** No rim light or halo round the silhouette (CLAUDE.md). Against the moon he just
  reads as black on light.

## Where he goes in onboarding (3 moments, restrained)

Keep it to a few moments, in line with the "premium motion" decision. He isn't on every screen:
his voice already is.

1. **`hello`:** curled up asleep in front of the moon, tail over his nose. He's on the screen
   whose headline is "I don't do mornings well either". One slow breath, and an ear flick when
   they tap.
2. **`reveal`:** he sits up as the number rolls, and his ears go flat when "485 hours a year"
   lands. That's the bad-news beat, acted out.
3. **`plans`:** peeking over the edge of the before/after card, like the Home peek. The same
   asset means the same character.

Later: `tomorrow` (the stairs demo) is where the "betrayal look" from the video idea goes,
with the mask up and eyes wide when the meter fills. That's also the best clip for short-form
videos.

## Technology

| Option | Fits a silhouette? | States and reactions | Cost |
|---|---|---|---|
| **Rive** (`@rive-app/react-native`) | Best. Vector, with bones and meshes for ears and tail | **A state machine:** one file holds asleep, groggy, smug, awake and betrayed, blends between them, and takes inputs from the app | A new native module, so a dev build (you already need one for Screen Time). An animator who knows Rive |
| **Lottie** (`lottie-react-native`, bundled with Expo) | Good | Linear clips only, with no states. The app would have to stitch the clips together | Needs After Effects and an animator |
| **SVG + Reanimated** (already installed) | Good for simple motion | Only what you code: breathing, ear flick, tail sway, done by moving separate parts | No new dependencies, but every motion is hand-coded |

**Recommendation: Rive for the final Loc, with SVG + Reanimated as the stepping stone.**

- **Rive's state machine matches how Loc works.** Onboarding, Home and the wake-up screen all
  set his state ("asleep", "smug", "betrayed") and he moves between them on his own. This is
  how Duolingo animates its characters.
- **The new runtime is built on Nitro** and needs Expo SDK 53+ and iOS 15.1+, which is fine
  here. Expo Go isn't supported, which doesn't matter because the app already uses a dev build.
- **One thing to check before building:** the docs for the new package's state machine inputs
  were thin. Confirm the input API in the repo first.

### The path that doesn't paint you into a corner

1. **Stage 1 (now, no new dependencies).** Build one component, `<Loc pose="asleep" | "sitting"
   | "peek" />`. Draw each pose as a silhouette SVG made of separate parts (body, head, ears,
   tail), and give it a small Reanimated idle: breathing plus the occasional ear flick. Every
   screen uses only this component.
2. **Stage 2 (when the art is ready).** Swap the component's insides for a Rive file with a
   state machine. The screens don't change, and `pose` becomes a state machine input.

### Where the art comes from

- **The peek pose already exists.** Asleep-curled and sitting-up are needed.
- **MASCOT_DIRECTION says to hire a human illustrator,** and AI is for moodboards only. A
  silhouette is the cheapest character to commission: no colour, no shading, just shapes.
- **Commission it from a Rive animator, delivered as a `.riv` with named parts.** Then Stage 1
  and Stage 2 use the same drawing.

## Before building

Earlier, a code-drawn animation showcase was rejected. So get a reference first: one or two
silhouette animations you like (an app, a game, a short clip). That sets the style of motion
before anything is drawn.

## Open decisions

1. **Reference:** which silhouette animation should Loc move like?
2. **Mask colour:** black (a shape only) or the one accent colour?
3. **Eye slits:** add the negative-space eyes, or keep a pure outline?
4. **Art source:** commission a Rive animator now, or start Stage 1 with traced poses?

## Sources

- Rive React Native runtime: https://rive.app/docs/runtimes/react-native/react-native
- Adding Rive to Expo: https://rive.app/docs/runtimes/react-native/adding-rive-to-expo
- Rive React Native repo: https://github.com/rive-app/rive-react-native/
- Expo Lottie reference: https://docs.expo.dev/versions/latest/sdk/lottie

## Browser prototype (October 10, 2026)

The prototype is `design-references/loc-animation/loc-in-motion.html`, also published as a
private artifact. It isn't in the app. It rigs the traced peek silhouette, the same path as
`LocSilhouette`:

- **The ears** are cut from the one path. Each rotates around its base on a soft spring, so it
  overshoots and settles (follow-through).
- **The eye slits** are holes cut in the shape, with pupils that follow the pointer. A blink
  closes the lids from top and bottom instead of squashing the eye, as in the Rive tutorial.
- **The sleep mask** slides from over the eyes (asleep) up to the forehead, crooked when he's
  groggy.
- **Five states:** asleep, groggy, awake, smug, betrayed. Each is a set of targets that he
  springs between, the way a Rive state machine blends.
- **Four reactions:** poke, ear flick, number lands, duck and peek. The idle layer (breathing,
  blinks every 2–5 s, glances) runs on its own timers.

**What it showed:**
- **He only reads against something light.** Black on the dark sky disappears, so every
  placement needs the moon, or another light shape, behind him.
- **At 32 pt he's a blob.** At 48 pt and above, the ears and mask read.
- **Without eye slits he's mostly ears and posture.** Smug and awake become hard to tell apart.

**Videos watched:**
- Rive Interactive Character Showcase (Praneeth Kawya Thathsara, Mascot Engine):
  https://www.youtube.com/watch?v=ZwcJ7kKG1ec
- How to Make Your Rive Character Feel Alive: https://www.youtube.com/watch?v=UaIH-F02X38
- Building Tension Through Animation in INSIDE (AI and Games):
  https://www.youtube.com/watch?v=0oT2dZTFKcw
- Duolingo on driving Rive characters: https://blog.duolingo.com/world-character-visemes

To download YouTube on this machine, yt-dlp needs `--js-runtimes node --remote-components
ejs:github --extractor-args "youtube:player_client=mweb"`.
