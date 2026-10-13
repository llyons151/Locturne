# Home as the morning: making Home interactive

Research of October 11, 2026. **Research only, nothing is built.** It answers the user's question:
"should the home page be utilized more, not just have these random-ass pages… the home page could
become more interactive". It builds on [HOME_10.md](HOME_10.md) (October 7) and
[UI_INSPIRATION.md](UI_INSPIRATION.md). GAME_PLAN.md still wins wherever they differ.

## The short answer

**Yes. Home should become the morning.** When the apps are waiting for you to get up, Home itself
turns into the live challenge: the step count climbing, the floor meter, the check-in button. You
should not have to tap into another page to see whether you're winning.

There is one exception: **anything that needs the camera** (push-ups and scan) still opens a
full-screen camera, because the camera has to fill the screen to work. That camera is launched from
Home and drops you back on Home for the payoff. It is a short trip out and back, not a separate
"page" with its own layout.

Every morning surface also gets **one look**: Home's sky, Home's type, Home's single button. The
only pure-black screen left is the live camera, where black is the camera's frame.

## What the app does today (October 11)

- **Home** (`src/features/home/home-screen.tsx`, drawn in SwiftUI by `home-content.ios.tsx`) is a
  calm status screen. It has the mornings pill, today's screen time, the week dots, a moon icon, one
  big headline, a sentence, and one capsule button. Loc peeks over the moon and talks
  (`loc.tsx`).
- **In the morning, Home only shows a button** ("Start walking", "Go downstairs", "Start
  push-ups", "Scan my code", "Check in"). The button pushes a **full-screen modal**:
  - `/wake` (`wake-screen.tsx`) for steps, downstairs and push-ups, on the blue night-sky
    background (`AppBackground`).
  - `/scan` (`scan-screen.tsx`) on the near-black `Nocturne.bg`.
  - `/place` (`place-screen.tsx`) on pure `#000000`.
  - Push-ups then opens a second full-screen camera on top (`PushupsCamera`, black).
- **Each page has its own layout**: a "TopBar" with an X, the voice line set top-left, the meter
  at the bottom. Home is centred. So the morning visibly drops you into a different app.
- **The success moment** happens on the wake page ("I'm up. Don't talk to me yet." plus Done), and
  then you close it to get back to a Home that now says day.

The user's complaint is fair. The most important moment in the product (GAME_PLAN: "the morning
is the wedge") is the one place where Home steps aside.

## Question 1: challenge on Home, or separate pages?

### What strong apps do

The pattern across categories is consistent. **Progress lives on Home. Focused "doing" that needs
the whole screen goes full-screen, briefly, and returns to Home.**

| App | What Home shows | What goes full-screen | Source |
|---|---|---|---|
| **Sweatcoin** | Home *is* a giant live step ring ("Steps today 2,006 · Goal achieved") with the week strip under it | Nothing for steps | [Mobbin](https://mobbin.com/screens/e33a8910-f06f-45e8-9120-d79f2bfda541), [goal hit](https://mobbin.com/screens/d2547f6d-14a5-4c78-ae50-e9be602c4622) |
| **Google Health (Fitbit)** Today | Step ring "8,762 of 10,000" as the hero, Start button beside it | The workout itself (big live number, pause) | [Today](https://mobbin.com/screens/f8b0d51e-7031-4837-b6cf-69f2eec4614d), [workout](https://mobbin.com/screens/a245d546-1ba0-4e7e-a246-478246b31243) |
| **Apple Fitness** | The rings are locked to the top of Summary; other cards can be rearranged, the rings can't | Workouts (on Watch) | [MacStories, watchOS 11](https://www.macstories.net/stories/watchos-11-the-macstories-review/4/), [iMore](https://imore.com/fitness-app-everything-you-need-know) |
| **Finch** | Home changes with state: the bird asleep in its nest in the morning, "Adventuring · back in 2:33:22" with a progress bar, "Goals completed for today!" | Nothing; goals are checked off on Home | [sleepy](https://mobbin.com/screens/f4a915f9-425c-45c9-9d34-7da294122379), [adventuring](https://mobbin.com/screens/d8ce4c68-ad5c-4400-a957-10a4d8befa2f), [done](https://mobbin.com/screens/fcc689aa-dda7-4a0d-8c50-c1ea37c8bf99) |
| **Duolingo** | The path is Home; the next lesson's Start button pops up right on it, Duo beside it | The lesson | [Mobbin](https://mobbin.com/screens/fd077091-e8e9-413f-9aff-bb68984e5b04) |
| **Opal** | The active rule leads Home: "Stop By · 1 app blocked · 4m left · Unblock Apps" | Session setup sheets | [Home](https://mobbin.com/screens/ef91eca7-9f2b-4980-b222-7a5ab0249cd9) |
| **Shop / delivery apps** | The live order sits as a card on Home with its progress bar | Tap for the full tracking map | [Shop](https://mobbin.com/screens/3fea0af7-4ca1-4974-a81c-4dd695f0acda), [Glovo](https://mobbin.com/screens/39ef8f73-3ddc-4517-858c-2a86ab9b1e85) |
| **Alarmy, Me+, Kiwake** | An alarm list | The mission takes over the whole screen, because it's tied to a ringing alarm you must silence | [Alarmy missions](https://alar.my/en/blog/alarmy-wake-up-mission), [Me+](https://mobbin.com/flows/f62ba067-3b19-470e-974b-2b4e4a9a36fe), [Kiwake review](https://www.tapsmart.com/apps/review-kiwake-alarm-clock-waking-up-made-easy/) |
| **Barcode scanners** (Luma, Lifesum, Chick-fil-A, MacroFactor) | n/a | Always a full-screen black camera with a frame | [Luma](https://mobbin.com/screens/07fa77cb-8f6f-40e1-aba9-1eafb60954bf), [Lifesum](https://mobbin.com/screens/2cc49161-a736-4c09-8cd0-49989843ef62), [Chick-fil-A](https://mobbin.com/screens/357a8dce-7fca-4b64-8fc8-c096d90abe99) |
| **Jomo, Waymo, Opal** | | The live state also goes *outside* the app, into the Dynamic Island | [Jomo](https://mobbin.com/screens/37fe77cb-8f7e-4762-961d-89e3097459a2), [Waymo](https://mobbin.com/screens/4efe7527-be42-43db-b5b0-88f9673179d4), [Opal](https://mobbin.com/screens/fc3f12d6-0024-4c1e-b7b3-d5d4cd9488b9) |

**Why Alarmy is the odd one out:** its mission is the way to silence a loud alarm, so it has to
grab the screen. Locturne has no ringing alarm in v1 (AlarmKit is v1.1). The user opens Locturne
by choice, to see where they stand. That is the Sweatcoin, Fitbit and Finch situation, not the
Alarmy one.

### What Apple says

Apple's guidance on modal screens ([HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality),
quoted from a [mirror](https://unpkg.com/apple-hig-mcp@1.1.3/content/modality.md)):

- Use a modal to "help people perform a distinct, narrowly scoped task" or to "help them
  concentrate on a complex task".
- "Use modality only when it helps people focus."
- "Aim to keep modal tasks simple, short, and streamlined."

Walking 200 steps over 10 minutes while making coffee isn't a narrowly scoped task that needs
focus. A step count is a status, like a ring. Doing push-ups to a camera, or lining up a barcode,
is exactly the narrow, focused kind of task a full-screen modal is for.

### The evidence on progress (from HOME_10)

- **Goal gradient** (Kivetz 2006): people speed up as they near a goal. That only works if they
  *see* the bar, in the place they look first. That place is Home.
- **Endowed progress** (Nunes & Drèze 2006): a bar that starts partly filled gets finished more
  often. Locturne gets this for free: steps since the morning start already count before the app
  opens. Today that head start is hidden behind a button. On Home it's the first thing they see:
  "64 of 200, already."

### Verdict

**Move the morning onto Home.** Steps, downstairs and leave-the-house render inline. Push-ups and
scan launch a full-screen camera from Home, and the result lands back on Home. The separate morning
pages (`/wake`, the morning half of `/scan` and `/place`) stop being destinations.

## Question 2: what makes a Home feel "interactive"

"Interactive" doesn't mean more buttons. It means **the screen visibly responds to what you and the
world are doing.** Concrete patterns, each with what it would be in Locturne:

1. **Numbers that move by themselves.** The count ticks up as you walk, with the digits rolling
   (SwiftUI's `contentTransition(.numericText)`, already used for Home's countdown). Sweatcoin and
   Fitbit both make the live number the hero. *Locturne:* the step count, the floors meter, the
   distance to your place.
2. **A shape that fills.** A ring or bar that closes toward the goal (Apple's rings, Sweatcoin).
   *Locturne:* one thin white ring or track, the same for every method. `@expo/ui` has `Gauge`
   and `ProgressView`, so it can be native. White on the sky, no colour fill, no glow.
3. **The character reacts to your progress, not just to pokes.** Finch's bird is asleep, then off
   adventuring, then celebrating. Duolingo drives Duo with a Rive state machine (idle, reacting,
   celebrating; [Duolingo blog](https://blog.duolingo.com/world-character-visemes),
   [Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)).
   *Locturne:* Loc already has moods (`asleep`, `groggy`, `awake`) and answers pokes. Add progress
   moments: a line when you start moving, one near halfway, one at "almost", and a final one.
   They stay absurd doom, not cheering ("50 steps. The prophecy weakens.").
4. **Haptics tied to real events.** A light tick when the downstairs hold starts (already in
   `downstairs-view.tsx`), a tick at each 50 steps while Home is open, and a success at the end
   (`haptic.done`). Rule: one haptic per meaningful event, never per step.
5. **One state per time of day, and visible changes between them.** Oura, Headspace and Finch
   change what Home shows through the day. *Locturne:* the states in the proposal below. When the
   proof lands, Home morphs in place (the ring completes, the number settles, the headline
   crossfades to "Apps awake") instead of showing a separate success page.
6. **The primary action is right there and changes with state.** Duolingo's Start sits on the
   path; Fitbit's Start sits by the ring. *Locturne:* Home already has one capsule button; it just
   needs to *do* the thing in the morning instead of navigating away.
7. **Live state outside the app.** Jomo, Opal and Waymo put the live state in the Dynamic Island.
   Apple: Live Activities are for tasks "that have a defined beginning and end", "end … immediately
   after the task completes", and never more than eight hours
   ([HIG mirror](https://unpkg.com/apple-hig-mcp@1.1.3/content/platforms/ios/live-activities.md)).
   A morning wake-up fits that exactly. *Locturne:* already planned for v1.1
   ([LIVE_ACTIVITY_IDEA.md](LIVE_ACTIVITY_IDEA.md)): "137/200" in the island. Building Home's
   morning first makes the island a copy of something that already exists.
8. **Direct touch on the hero.** Loc already takes pokes. Keep it. Don't add swipe gestures to the
   hero itself; a gesture that does something different in each state is hard to discover.

What does **not** make a Home interactive: more cards, stats tiles, tips, or a chart that changes
nothing. HOME_10's "never on Home" list still stands.

## Question 3: one look, or a look per method?

**Recommend: one visual treatment for every method.** The method only changes the number, the unit
and Loc's lines.

Why:

- **The promise is one thing.** GAME_PLAN: "The methods are only different ways to prove it." Five
  looks say five products.
- **Users combine methods** (memory: methods are building blocks users combine; "walk 200 steps
  instead" is offered every morning). Switching from stairs to steps shouldn't change the room
  you're standing in.
- **It's what the user keeps reacting to.** Black pages beside blue-gradient pages read as
  unfinished (UI_INSPIRATION diagnosis #4, "the background looks unfinished").
- **Apple Fitness does this.** Every activity type closes the same rings.

The one shared template: **Home's sky and moon** (`AppBackground` / `NightSky`, unchanged, no moon
animation), Loc's line, **one big centred number with a unit**, one thin white ring or track, one
capsule button, and a quiet line of other ways underneath. Centred, like Home is now.

The **only exception is the live camera** (push-ups, scan). It's black because the camera feed
fills it. Keep the same type, the same white capsule and Loc in the bottom strip, so it still feels
like the same app.

## Question 4: the proposal

### Home's states across the day

The layout stays the same all day: top row, sky, hero, one button, Loc over the moon. Only the
content changes ("do it cheaply", HOME_10 §7).

| State | When | Hero | Button | Loc | Top row |
|---|---|---|---|---|---|
| **Day** | Apps awake | "Apps sleep at 11:00 PM · in 4h 12m" (as now) | "Tomorrow: 200 steps at 7:00" (as now) | Awake, random lines on poke | Mornings pill, screen time, week dots |
| **Evening** | Last hour before bedtime | "Apps sleep in 38m" | As day | `bedtimeSoon` line (exists) | As day |
| **Night** | Apps asleep | "Your apps are asleep" | **None** | Asleep | Hide screen time; keep it short |
| **Morning, to prove** | Morning start until proof | **The live challenge** (next table) | The method's action | Groggy, then progress lines | Mornings pill only, so the hero gets the room |
| **Morning, live** | A downstairs session or a check-in in progress | The live meter, bigger | Cancel, or nothing | Narrating | Hidden; tab strip hidden (see below) |
| **Morning, done** | Just proved | Morphs in place: "Up at 7:06. Apps awake." plus the method fact ("212 steps") | "Done" collapses it to Day | `wakeDone` line (exists) | The new mist dot fills in today's slot |
| **Paused / off / unprotected** | As now | As now | As now | As now | As now |

"Morning, done" is HOME_10's open decision 4 (one-time card vs full screen). This proposal answers
it: **in place on Home**, which is the more interactive version of the one-time card.

### How each method renders on Home

All five use the same hero: number, unit, ring, line, button.

| Method | Number on Home | How it updates | Button | Leaves Home? |
|---|---|---|---|---|
| **Walk it off** (default) | "64 / 200 steps", ring 32% | Live while Home is open (`useStepCount`, which already reads history since morning start plus live updates). No start tap. | None needed while counting; "Other ways" link | **Never.** Most users only ever see this one |
| **Go downstairs** | Idle: "Go down a floor". Live: "1.8 of 2.5 m", ring filling, then a 5-second hold that fills a second ring | Barometer session started by a tap (`useDownstairs`) | "Start" in bed, then "Cancel" while live | **No.** Home goes into its live state |
| **Leave the house** | "1.2 km from Gym", or just "Get to Gym" | One location read per tap (`readFix`, `submitPlaceFix`) | "Check in" | **No.** "Not there yet" or "can't tell yet" shows inline under the number |
| **Push-ups** | "0 / 20 push-ups", ring empty (the total is kept across tries, `getRepsDone`) | Only while the camera is open | "Start push-ups" opens the full-screen camera | **Yes, the camera only.** Setup tips ("lean the phone on the floor, side-on") sit on Home or in a compact native sheet the first time |
| **Scan your code** | "Scan the code in the kitchen" (the code's label) | n/a | "Scan" opens the full-screen camera | **Yes, the camera only.** A match closes it and Home does the success morph |

**"Walk 200 steps instead"**: steps are counted for every morning anyway. So under every
non-steps hero, show a quiet live line, "or walk it off: 64 / 200", which is both the fallback and
proof the app is watching. Whether it unlocks automatically, or needs a tap to switch, is an open
decision below.

**Maps:** don't put a live map on Home for "leave the house". The check is one location read, not
tracking. A distance line does the job. A small static map of the saved place could be a later
option.

### What stays a separate screen

| Screen | Why it stays |
|---|---|
| **Push-up camera** (`PushupsCamera` in `pushups-view.tsx`) | The camera has to fill the screen, and the phone is on the floor two steps away. It's the "complex, focused task" Apple's modal guidance describes. |
| **Scan camera** (the viewfinder in `scanner.tsx`) | Every scanner on Mobbin is a full-screen black camera. A small inline viewfinder makes it harder to aim. |
| **Code setup and place picking** (`/scan?mode=setup`, `/place-pick`) | Setup, done by day. Not part of the morning. |
| **Other ways out** (`/exits`, passes and emergency) | Already a native form sheet. Keep it, opened from Home's quiet "Other ways" link. |
| **Night / not-morning states of `/wake`** | Not needed: Home already explains night and day. |

### Two traps to design around

1. **Tabs during a live session.** If someone taps the Apps tab halfway down the stairs, Home
   unmounts and the barometer session dies. Fix: while a downstairs session or a check-in is live,
   hide the tab strip (Locturne draws its own strip in `components/app-tabs.tsx`, so this is in
   our control). Steps need nothing: they're read from history, so leaving Home loses nothing.
2. **Deep links into `/wake`.** Notifications (`notifications.ts`, `use-app-start.ts`) and the
   shield's flow open `/wake`. Keep the route, but make it select the Home tab in its morning
   state (and open the camera straight away for push-ups or scan, if asked), so nothing outside
   the app has to change.

Also keep the screen awake (`useKeepAwake`) only while Home is in the morning or live state, as
`wake-screen.tsx` does now.

### Project rules this respects

- **No glow:** the ring is a plain white stroke on the sky. No tinted shadows, halos or bloom on
  success.
- **Moon untouched:** the success morph changes the hero and the ring only, never the moon (memory:
  the restrained transition won).
- **No moon-photo decorations.**
- **Native controls:** sheets (push-up setup tips) and menus (other ways) via `@expo/ui`; the ring
  can be `@expo/ui` `Gauge` / `ProgressView`.
- **Centred:** the hero is centred, like Home now.
- **No punishment, no timed unlocks:** nothing new here earns minutes or penalises a miss. A
  morning that's not done yet just shows progress.
- **Not a clone:** the parts come from several apps (Sweatcoin's live number, Finch's state changes,
  Duolingo's in-place start, the scanners' camera). Nobody's whole layout.

### What it would take in this codebase

Rough, for planning. Nothing here has been started.

| Piece | Files | Size |
|---|---|---|
| Pull the "proof recorded" logic out of the wake page into a hook (`proveMorning`, the success haptic, the VoiceOver announcement, the first-morning notification ask, the pretend-morning path) | New `src/features/wake/use-morning-proof.ts`, from `wake-screen.tsx` `onMet` | ~60 lines moved |
| Morning hero, one component per method plus the shared template (number, unit, ring, line, button, "or walk it off" line) | New `src/features/home/morning/` (`morning-hero.tsx`, `steps-hero.tsx`, `stairs-hero.tsx`, `place-hero.tsx`, `camera-hero.tsx`) reusing `useStepCount`, `useDownstairs`, `readFix`/`submitPlaceFix`, `lines.ts` | ~400–550 lines new |
| iOS drawing | `home-content.ios.tsx` (SwiftUI via `@expo/ui`): swap the button for the hero while in the morning; `Gauge` or a `Circle` trim for the ring; `numericText` on the count | ~100–150 lines changed |
| Web drawing (needed for `/wake-preview` in the browser) | `home-content.tsx` | ~80 lines |
| Home state | `home-screen.tsx`: the morning, live and done states; hide the top row and tab strip while live | ~80 lines changed |
| Loc's progress lines | `loc-lines.ts` (new moments: started, halfway, almost, done per method), `loc.tsx` moment keys | ~60 lines plus writing the lines |
| Tab strip hide | `components/app-tabs.tsx` | ~20 lines |
| Routing | `app/wake.tsx` becomes a hand-off to Home (or opens a camera); `use-app-start.ts` and `notifications.ts` keep working | ~40 lines |
| Retire the morning halves | `wake-screen.tsx` (most of it goes), the morning stages of `scan-screen.tsx` and `place-screen.tsx` (setup halves stay); the scan camera becomes its own small full-screen route | ~−400 lines |
| Dev tooling | `features/dev/wake-lab/` and the You → UI rows open Home in a fake morning instead of `/wake` | ~40 lines |
| Tests | Move `wake-screen.test.ts` cases into `home-screen.test.ts`; add morning-state tests | ~150 lines |

**Total:** roughly 1,000–1,200 lines touched, about 400 net new. For one person, about **4–6
working days**, plus a device pass, because the barometer, pedometer and camera can't be fully
judged in the browser. It touches files other sessions are editing right now (`wake-screen.tsx`,
`scan-screen.tsx`, `place-screen.tsx`, the wake lab), so it should wait for those to land.

**A cheaper first step (about 1 day):** do steps only. It's the default method, it needs no start
tap, and it's read from history. Put the live "64 / 200" hero and ring on Home's morning state, and
leave the other methods' buttons as they are. If the user likes how it feels on the phone, do the
rest.

## Open decisions

1. **Go ahead with "Home is the morning"?** Steps, downstairs and place inline; push-ups and scan
   as a full-screen camera launched from Home. (Recommended.)
2. **Steps first, or all methods at once?** Steps-only is about a day and covers the default
   method. (Recommended: steps first.)
3. **The steps fallback under other methods:** show "or walk it off: 64 / 200" live and **unlock
   automatically** at 200, or show it but require a tap to switch? Automatic is simpler and
   GAME_PLAN says steps prove the same thing, but someone who picked push-ups might want push-ups
   to be the only way.
4. **The success moment:** morph in place on Home (recommended), or keep a short full-screen
   "I'm up" beat before Home?
5. **Hide the tab strip during a live downstairs session?** (Recommended, so a stray tap can't
   kill the session.)
6. **Ring or bar?** A ring reads as "fitness" (Apple, Sweatcoin). Locturne's thin white track
   (`components/meter.tsx`) is already its own. Both are fine without glow; pick by mockup.

## Sources

Mobbin screens (iOS):

- Sweatcoin home ring: https://mobbin.com/screens/e33a8910-f06f-45e8-9120-d79f2bfda541 and https://mobbin.com/screens/d2547f6d-14a5-4c78-ae50-e9be602c4622
- Google Health (Fitbit) Today: https://mobbin.com/screens/f8b0d51e-7031-4837-b6cf-69f2eec4614d, workout: https://mobbin.com/screens/a245d546-1ba0-4e7e-a246-478246b31243
- Finch states: https://mobbin.com/screens/f4a915f9-425c-45c9-9d34-7da294122379, https://mobbin.com/screens/d8ce4c68-ad5c-4400-a957-10a4d8befa2f, https://mobbin.com/screens/fcc689aa-dda7-4a0d-8c50-c1ea37c8bf99
- Duolingo home: https://mobbin.com/screens/fd077091-e8e9-413f-9aff-bb68984e5b04
- Opal home: https://mobbin.com/screens/ef91eca7-9f2b-4980-b222-7a5ab0249cd9, Dynamic Island: https://mobbin.com/screens/fc3f12d6-0024-4c1e-b7b3-d5d4cd9488b9
- Jomo Dynamic Island: https://mobbin.com/screens/37fe77cb-8f7e-4762-961d-89e3097459a2; Waymo: https://mobbin.com/screens/4efe7527-be42-43db-b5b0-88f9673179d4
- Shop live order on home: https://mobbin.com/screens/3fea0af7-4ca1-4974-a81c-4dd695f0acda; Glovo: https://mobbin.com/screens/39ef8f73-3ddc-4517-858c-2a86ab9b1e85
- Me+ wake-up mission flow: https://mobbin.com/flows/f62ba067-3b19-470e-974b-2b4e4a9a36fe; Pillow alarm: https://mobbin.com/flows/1bbe0c8f-e619-471a-92d1-403750fd1dcd
- Scanners: Luma https://mobbin.com/screens/07fa77cb-8f6f-40e1-aba9-1eafb60954bf, Lifesum https://mobbin.com/screens/2cc49161-a736-4c09-8cd0-49989843ef62, Chick-fil-A https://mobbin.com/screens/357a8dce-7fca-4b64-8fc8-c096d90abe99

Web:

- Apple HIG, Modality: https://developer.apple.com/design/human-interface-guidelines/modality (quoted via https://unpkg.com/apple-hig-mcp@1.1.3/content/modality.md)
- Apple HIG, Live Activities: https://developer.apple.com/design/human-interface-guidelines/live-activities (quoted via https://unpkg.com/apple-hig-mcp@1.1.3/content/platforms/ios/live-activities.md)
- Alarmy missions: https://alar.my/en/blog/alarmy-wake-up-mission, https://alar.my/en/blog/how-to-choose-alarmy-mission
- Kiwake review: https://www.tapsmart.com/apps/review-kiwake-alarm-clock-waking-up-made-easy/
- Apple Fitness Summary, rings locked on top: https://www.macstories.net/stories/watchos-11-the-macstories-review/4/, https://imore.com/fitness-app-everything-you-need-know
- Brick home-screen timer: https://www.apartmenttherapy.com/brick-app-review-37523373, https://www.theaureview.com/technology/brick-review/
- Duolingo and Rive state machines: https://blog.duolingo.com/world-character-visemes, https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life
- Uber Live Activities (live trip state outside the app): https://www.uber.com/newsroom/were-redesigning-the-uber-app-just-for-you
- Goal gradient and endowed progress: see [HOME_10.md](HOME_10.md) §5
