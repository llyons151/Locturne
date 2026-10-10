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

### Round 2 (same day)

- **Ear clipping fixed.** Each ear's cut-out used to include a chunk of head-top past its base,
  which swung out as a nub and left a flat cut behind. Now each ear piece keeps only a thin strip
  below its base, inset from both ends, and a rounded "root" sits under each ear so the joint
  stays smooth at any angle.
- **Seven dramatic bits** for memes and videos. Each is a two- to five-second timeline that
  plays on top of any state, then hands back to it:

  | Bit | What happens | His line |
  |---|---|---|
  | Side-eye | Hard side-eye with a slow blink in the middle | "TikTok wants you back. Absolutely not." |
  | Dramatic zoom | Head turn, then a fast push-in on wide eyes | "TikTok. At 2 AM." |
  | Screech | Ducks, then pops up with `> <` eyes and a fanged mouth, vibrating | "IT'S. SEVEN. AM." |
  | Dead inside | Pinpoint pupils, a thousand-yard stare, one eye twitching | "Day three of being a morning person." |
  | Faint | A gasp, then X eyes, keels over, slides slowly out of frame | "You took the stairs. I need to lie down." |
  | Vibrating | Eyes narrowed to slits, ears pinned, shaking | "Someone said 'one more video.'" |
  | Nope | Drops out of sight, peeks back with eyes darting, drops again | "Not here. Never was." |

- **New rig parts for these:** a mouth (a hole with the teeth put back as body), X eyes, `> <`
  eyes, pupil size, shake and zoom, all as spring channels. A Rive version would carry these
  over as the same inputs and timelines.
- Stills are in `design-references/loc-animation/dramatic.png`.

### Round 3: keyframed rewrite (same day)

The motion engine was rebuilt. Before, every value simply sprang toward a target, so all
movement had the same floaty feel.

**The engine now:**
- Each bit is a set of keyframe tracks per channel, and every segment has its own easing:
  anticipation, snap, hold, overshoot, an accelerating fall. Springs only carry him back to
  his state afterwards, and drive follow-through.
- State changes are staggered. Going to sleep: eyes close, then the mask comes down, then he
  sinks, then the ears settle. Waking reverses it.
- Each state has a habit that plays only when nothing else is running:
  - groggy nods off and jolts awake;
  - asleep twitches mid-dream, with a deeper breath every fourth one;
  - smug gives a slow satisfied blink;
  - awake looks around;
  - betrayed has trembling pupils.

**The face:**
- The top lids slant for anger or worry, and the lower lids rise for a squint. The whole eye
  no longer rotates.
- The pupils have catchlights.
- The sleep mask works as his brows: it shoots up in shock and presses down in rage.
- Fast vertical moves stretch him slightly, and the ears lag head turns and lift when he drops.

**The bits** each follow a comic structure (setup, punchline, deadpan button), and the caption
lines land on the beats:
- **Side-eye** ends with a "caught" snap.
- **Dramatic zoom** has a jump cut, then an innocent look away.
- **Screech** takes a breath first, then goes deadpan with "…" and "Morning."
- **Dead inside** has a twitching eye and a long blink.
- **Faint:** a gasp, a freeze, X eyes, a fall that speeds up, then his ears peek back first.
- **Vibrating** builds pressure, pops, then deflates.
- **Nope** drops, peeks with darting eyes, drops again, then rises looking innocent.

**Other:** the page has half- and quarter-speed playback for review. Filmstrips of every bit
are in `design-references/loc-animation/filmstrips/`; each one was reviewed frame by frame.

### Round 4: skeleton and physics (same day)

**The problem:** the user said he "moves unnatural, just changes positions". He was a rigid
cut-out: the body slid and rotated as one stiff piece, and only the ears were hinged.

**The research:**
- **Binding and weighting (Rive and Spine).** Rigged mascots bind their artwork to a bone
  hierarchy. Every vertex is weighted to one or more bones, and the weights add up to 100%, so
  shapes bend where the bones meet. Sources: https://rive.app/docs/editor/manipulating-shapes/bones
  and https://rive.app/blog/intro-to-meshes
- **The Rive rigging video** ("Snow day! Rig and animate with Rive",
  https://www.youtube.com/watch?v=GpCyXo4VujA, watched frame by frame because transcribing the
  audio failed). It builds hips → chest → head, plus a chain of bones down the scarf, then
  staggers each child bone's keys a few frames after its parent's.
- **Successive breaking of joints, and drag.** Motion travels down the chain one joint after
  another. Too slow an offset looks awkward; too fast can't be seen.
  https://www.brianlemay.com/Pages/animationschool/animation/1stsemesteranimation/successivebreaking.html
- **Spine's physics constraints.** Inertia, strength and damping per bone give automatic
  secondary motion. https://esotericsoftware.com/spine-physics-constraints
- **Moving holds.** A fully frozen character reads as dead, so keep tiny motion going
  (Thomas & Johnston, *The Illusion of Life*). https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation

**What changed in the prototype:**
- **The body is now a skinned mesh.** The silhouette is a texture on a grid of about 2,400
  vertices, skinned on the GPU with WebGL. Each vertex is weighted to seven bones: root (the
  paws, planted on the ledge), body, head, two ears and two cheek-fluffs. The face cut-outs and
  the mask ride the head bone.
- **Bending:**
  - Posture squashes and stretches the body from the ledge instead of sliding him up and down.
  - A lean splits between the body (38%) and the head (62%).
  - The head turns slightly toward wherever his eyes are looking.
- **Successive breaking:** authored poses reach the head about 60 ms after the body, and the
  ears about 110–130 ms after.
- **Physics:**
  - The head swings on the neck like a pendulum and bobs.
  - The ears trail the head's acceleration.
  - The cheek fluff jiggles.
  - The shake effect is kept out of the physics input, so the ears don't flail.
- **Moving hold:** a slow two-frequency weight shift runs under everything, with the head
  countering the body.
- **Captions now run on the bit's own clock,** so they stay on the beat at any speed or frame
  rate.
- **Cost:** about 0.6 ms per character per frame.

Frame-stepped filmstrips are in `design-references/loc-animation/filmstrips-skeleton/`. They
were filmed with a frozen clock that's advanced by hand: `window.__loc.advance(ms)`.

**For the app:** this is the same bones-and-weights model a Rive file uses. An animator who
rebuilds Loc in Rive would use the same bones (root, body, head, ears, fluff), and the same
physics settings would carry over to Rive's constraints.

## In the app (October 10, 2026)

On Home, Loc peeks over the panel's bottom edge, in front of the moon (`src/features/home/loc.tsx`).

**How it's built:**
- **`loc-rig.ts`:** the skeleton, physics and face, ported from the browser study to typed
  TypeScript.
- **`loc-stage.tsx`:** a DOM component (`'use dom'`). On iOS it runs in a transparent webview
  (`@expo/dom-webview`, part of SDK 57); on web it renders inline.
- **`loc-path.ts`:** the silhouette path, now shared with the static `LocSilhouette`.
- **His canvas spans the panel's full width,** so the blanket lump can travel along the edge;
  he sits in the middle, at 27% of the width.

**Mood follows Home:**
- A held night, or Block now, is `asleep`.
- The locked morning is `groggy`.
- Otherwise he's `awake`.

**User changes the same day:**
- **Eyes:** solid white with black pupils, not holes. They're also less wide by default
  (open 0.8, a light squint), because they read as bugging out.
- **Sleep mask:** first tried as a crop of the moon texture, then chosen from the headband
  study (`design-references/loc-animation/headband-study.html`, nine treatments). The user
  picked option 2, **a window to the moon**: the mask is cut through him, so the real moon
  behind him shows in it. Pure silhouette, with no new color.
- **Hit him twice (the second tap within 2.5 s of the first): under the covers.** Revised the
  same day: the lump is lower and wider (about 9 pt high and a fifth of the width across), he
  stays under for about 4.6 s, and the lump roams most of the edge, from about 18% to 82% of
  the width.
  1. He dives below the edge.
  2. The nav strip's black edge lumps up where he is and wanders left and right, with a soft
     ripple trailing the way it's moving (about 15 pt high).
  3. He bursts back out.
- **One tap** pokes him, as before.

### Round 5: entrances and exits, acted rather than slid

**The problem:** he used to ride the moon's sink, so the whole canvas moved like an elevator,
at one speed, with his paws dragged along. The user said it looked cheap.

**The research:** *The Animator's Survival Kit* (anticipation, takes, stagger timing), overshoot
and settle, squash for impact and stretch for speed, and how peek and ledge-grab moves are
staged: hands placed on the edge as their own beat. The rig now gives the paws their own drop
channel, separate from the body.

**Peeking up** (1.65 s, starting 350 ms after Home is selected, so the moon gets a head start):
1. The ear tips surface and twitch, listening.
2. The eyes rise just over the edge and check left, then right.
3. A held beat.
4. He pops up, stretching as he goes, overshoots and settles with a squash, while the ears
   trail and then flick.
5. The paws slap onto the edge last.

If he's asleep, it's one slow rise instead, with the paws last.

**Ducking down** (0.56 s):
1. A small rise first.
2. A drop that speeds up, stretching as he falls.
3. The ears flip up, and the paws let go a beat after the body.

**Testing:** a dev-only hook, `window.__locDev` (`advance(ms)`, `resume()`, `rig`), steps his
clock by hand. These were reviewed frame by frame in the web build.

**Not yet checked on a device:** the webview on the iPhone. If the current dev build is missing
the DOM webview module, it needs a new dev build.

### Round 6: options for a real crawl-out, and the vanishing exit (October 10, 2026)

**The problem (user, with a screenshot of the peek):** the entrance doesn't look good, and when
you leave Home he "just kinda disappears".

**Why he vanishes:** he lives inside the Home page. A tab switch fades the page out within about
100 ms (`fadeThrough` in `app-tabs.tsx`: out by 40% of a 260 ms switch), but his duck takes
560 ms. The page, and him with it, is gone before the move gets going.

**Why the peek reads badly:** mid-peek he's a head and eyes rising from behind a flat edge, with
no paws or arms. The paws only land at the end, so most of the move reads as a floating head.

**Entrance options:**
- **A. Ledge climb.** One paw slaps over the edge, claws spread, then the other. He hauls
  himself up with effort (ears pinned back, eyes squeezed), chin over the edge, elbows over,
  then a settle and an exhale. Needs the paws as their own bones that can reach and grip.
- **B. Out from under the covers.** The blanket lump from the burrow gag scurries in along the
  edge, stops, bulges, and he bursts out ears first. Reuses the lump and makes the nav strip
  his bed.
- **C. Mood-dependent.** Groggy: one paw flops over, he drags himself up like getting out of
  bed, mask crooked. Awake: a quick vault. Asleep: the lump stays, breathing.

**Exit options:**
1. **Move Loc to the nav strip's layer** (`AppTabs`), which stays put across tabs, so his exit
   is actually seen: he dives under the covers and the lump scurries off along the edge. Coming
   back reverses it.
2. **Make the exit fit the fade** (about 100 ms). Cheap, but it's barely a move.

**Recommendation:** B with exit 1, since it gives him one story (he lives under the covers),
or A if he should feel physical. Prototype in the browser and review filmstrips before porting.

**Built (user: "sounds good"):** B with exit 1.
- `Loc` is drawn by the tabs layout (`src/app/(tabs)/_layout.tsx`). Home only publishes his
  mood, and that it's the picked tab, through `LocCue`.
- **Leaving (1.3 s):** a dive with no wind-up, because Home is already fading. The lump comes
  up where he went under, shuffles back a touch, then runs off the right edge, toward the other
  tabs' buttons.
- **Arriving (2.65 s, starting 120 ms after Home is picked):** the lump runs in from the right
  and brakes in the middle. It wriggles twice, then he bursts out with his eyes wide. The paws
  slap down, and he checks left and right.
- **Asleep:** the lump drifts in, and he rises slowly.
- Taps are ignored while any lump bit is playing. A lump bit that interrupts another starts
  from where the lump already was.
- Reviewed as filmstrips in the web build, stepped with `__locDev`. Not yet checked on a device.

**Revised the same day (user):** "I liked the more aggressive [move]… not for popdown, do something like that when he comes up."
- **The way up is the aggressive move now.** The lump wriggles, then crouches, and he launches
  out with his eyes squeezed (`> <`) and his ears pinned back. He shoots about 70 units past his
  rest, drops into a squash as his paws slap the edge, and his eyes pop open to check the room.
  `LOC_VIEW` gained 140 units of headroom so the launch isn't cropped.
- **The way down is calm.** He slides out of sight with his ears folding and his paws going down
  with him. Then the lump runs off.

## Eye lab (October 10, 2026)

The user asked for 20 versions of his eyes, with animations, to experiment with:
`design-references/loc-animation/eye-study.html`, also published as a private artifact. It uses
the real silhouette and the mask window, in front of a flat moon.

**The 20 styles:**
1. Current
2. Moon window
3. Window + pupil
4. Buttons
5. Beads
6. Night dots
7. Heavy lids
8. Smug
9. Grumpy
10. Worried
11. Skeptical
12. Happy arcs
13. Asleep lines
14. Rubberhose
15. Pills
16. Rings
17. Jelly
18. Darting
19. Dizzy
20. Cartoon swaps

**How it works:**
- Each style idles on its own: blinks and glances.
- Each has its own move, which plays on a tap.
- Shared controls apply an expression to all of them: blink, look around, surprised,
  suspicious, angry, sleepy.
- There's also pointer follow, sizes (big, the app's width on Home, tiny) and speeds of 1×, ½×
  and ¼×.

**Pick (user, October 10, 2026): 04 Buttons, "with all the eye animations very dramatised".**
Shipped in `src/features/home/loc-rig.ts`:
- **Shape:** round whites (34 rig units) with big pupils (20) and two catchlights. A pupil
  never grows past 70% of its white, so the white always shows.
- **Lids show mood; squash is only for blinks.** A half-open mood keeps the eye round and
  lowers a lid across it. The lid slants with `slope` (angry or worried), the bottom lid rises
  with `squint`, and under a heavy lid the pupil sinks so it still peeks out. Only a blink
  squashes the eyeball itself, flat and wide, with the pupil hidden. Fully closed, the eye is
  a soft ‿ curve. Smug's `slope` changed from 16 to -8, so its lids droop to the outside.
  Graded from frame sheets: before this change smug and groggy were 5/10 (squashed slivers),
  after it 8 and 9.
- **Jelly:** a new `goo` channel on a loose spring (320, ζ 0.2), kicked by `pop()`. Every blink
  squashes the eyes flat and wide, then they bounce back open into a tall stretch.
- **Pupils:** a new `swell` channel. They swell on shocks (up to 1.7×) and shrink to trembling
  dots in a glare. Gaze runs on an underdamped spring, so glances overshoot. Fast glances
  stretch the eyeballs along the way they're moving.
- **Poke:** squeeze (> <, punched in oversized with a shudder), then a double take (eyes 1.3
  open, pupils 1.7×, mask flies up), then a glare (pupils 0.62× with jitter, lids slanted,
  mask slammed down).
- **Other moves:** arrive and the burrow return pop the eyes huge with swollen pupils. The
  groggy jolt and awake's double take pop too. Betrayed pops on entry.
- **Reduced motion:** no pops, the gaze is critically damped, and squeezes don't shake.
- **Burrow (user, October 10, 2026: faster, left to right, pop up angry):** 4 s instead of 5.9.
  He dives, the lump darts left to -0.3 (further left hides in the panel's corner), then hops
  back right and brakes. He launches up with his eyes squeezed shut, then snaps into a glare:
  ears pinned, mask down, trembling dot pupils. The glare holds about a second.
- **Burrow routes (user, October 10, 2026: "he shouldn't always just burrow to the left… he shouldn't feel so
  programmatic"):** `burrowLump` draws a new route on every double-tap:
  - The route is one of six shapes: one way and back, back and forth, a nervous zigzag, a fake-out (a nudge one
    way, then a dash the other), wriggling on the spot, or a run out with a stutter.
  - It starts left or right at random, with random distances, pauses and peeks, and an uneven hop rhythm.
  - He pops out when the route ends, about 1.8–3 s in, so the timing isn't fixed either.
