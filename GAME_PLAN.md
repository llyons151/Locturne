# Locturne: game plan

Updated October 1, 2026 (wake-up methods, daytime controls, build status and the
launch timeline); v1 wake-up methods widened to five on October 9, 2026. This is the source of truth for product direction. It
replaces the September 21 plan, which is archived at
[docs/archive/GAME_PLAN_2026-09-21.md](docs/archive/GAME_PLAN_2026-09-21.md). The
reasoning behind it is in [docs/IDEA_SCORECARD.md](docs/IDEA_SCORECARD.md),
[docs/VALIDATION_RESEARCH.md](docs/VALIDATION_RESEARCH.md) and
[docs/DESIRE_VALIDATION.md](docs/DESIRE_VALIDATION.md) (what makes people want it).

## The product in one line

**Your apps go to sleep at bedtime and don't wake up until you get out of bed.**

Locturne is a paid iOS app for people who scroll in bed at both ends of the night.
At bedtime it blocks the apps the user chose. In the morning they stay blocked
until the user proves they're up: by going downstairs, walking 200 steps or
scanning a code in another room (see "Wake-up methods"). A sassy, tired raccoon voice runs the whole thing.
He's strict about the situation and never shames the user.

## Why this, and why now

- **The problem is big.** Pew (Sept 2026): 62% of 18–29s say their phone hurts
  their sleep, and only 25% of people who tried to cut back say it went extremely or very well.
- **The bedtime lock is table stakes.** Opal advertises it ("Sleep Time 10PM–8AM
  Block All"). **The morning is the wedge.** Opal's morning ends at a clock time,
  even if you're still in bed. Locturne's ends when you get up. Morning-task apps
  are a proven market: Alarmy has 82M downloads, and Erly went from launch to
  about $50K a month in four months.
- **Other indies are circling.** Groggy (Sept 16, 2026) and BedLock (April 2026)
  have the same idea and 0 ratings. Speed, distribution, voice and reliability
  decide the winner.
- **It fits the founder.** Short-form video is how this category grows, and a hard
  paywall makes paid creators profitable.

**What we compete on:** the morning hook, the voice, and never failing silently.
**Not:** blocking features, stats, or sleep tracking. v1 still ships the basic
daytime controls a paying user expects (see "Daytime controls"), but only as table
stakes, not as a feature race with Opal.

## Core loop

1. During onboarding the user picks the apps that sleep at night, a bedtime and a
   morning start time. **Tonight's lock is scheduled before onboarding ends.**
2. At bedtime, Loc falls asleep and the selected apps are blocked.
3. At the morning start time the apps stay blocked until the user proves they're
   up with their wake-up method.
4. Once the proof is in (for example, a trip downstairs or 200 steps), the apps
   wake up until the next bedtime.
5. An always-blocked list stays blocked in every state. If an app is on both
   lists, the always-blocked rule wins.

Rules carried over from the previous plan:
- Steps count from the morning start time, including steps taken before the app
  is opened. Opening the app doesn't start the count.
- The count resets each morning. Reopening the app never resets progress.
- Bedtime takes precedence: no proof at night (stairs, steps, scan) unlocks apps.
- 200 is a default to test, not a validated number. The target is adjustable.
- The user controls the schedule and both app lists at all times, but **every
  settings change takes effect from the next bedtime** (decided 2026-10-01). An edit
  made during the night waits for the following night, so nothing can be loosened
  from bed. The settings screen says so plainly.
- Nights can be switched off per weekday. A night that's off has no morning lock
  either (decided 2026-10-01). The always-blocked list still applies.
- The rules live in `src/lib/lock-state.ts` (tests: `npm test`).

## Wake-up methods (decided 2026-10-01, five for v1 since 2026-10-09)

The promise stays "your apps don't wake up until you get up". The methods are only
different ways to prove it, each with its own lines from Loc. Details in
[docs/DOWNSTAIRS_METHOD.md](docs/DOWNSTAIRS_METHOD.md) and
[docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md) section 2.

| Method | Proof | v1 role |
|---|---|---|
| **Walk it off** | 200 steps on `CMPedometer` since the morning start | **The default** (2026-10-10): top of "How you get up" and the routine's starting method; also the "steps instead" fallback every morning |
| **Go downstairs** | Barometer `relativeAltitude`: a change of at least 2.5 m held about 5 s, in a live session of up to about 5 min. Up or down both count. | The hero for marketing; picked in onboarding by anyone with stairs. |
| **Scan your code** | A per-user QR or a registered product barcode kept in another room | Alternative; the leading candidate for the accessible option |
| **Leave the house** | An in-app "I'm out" check reads location once: at least ~150 m from the saved home spot, or at a saved place (gym, campus, café). When-In-Use permission only, no background geofence. Optional light check: the camera's exposure value (brightness only, never the picture) confirms daylight; before sunrise it's location only. | Alternative; the "get outside / see the sky" morning |
| **Push-ups** | Phone leaning on the floor two steps away, side-on; the front camera counts the reps (Apple Vision body pose, on the phone, nothing recorded). Loc peeks over the bottom strip, reacting, and says the count out loud. | Alternative; the effort option and a strong video ("my alarm watches me do push-ups") |

- **Onboarding asks one question,** not a menu, right after `wake`: "Are there
  stairs between your bed and your coffee?" Yes picks downstairs; no picks steps;
  a small link shows the rest.
- **Every morning offers "walk 200 steps instead".** It proves the same thing, so
  it isn't loosening, and it covers a dead barometer or travel.
- **If the barometer is missing or reads flat,** say so and offer steps. Never
  leave someone stuck.
- Changing the method follows the next-bedtime rule.
- Never as a gate: math, memory, typing, shaking or saying a phrase (all doable in
  bed). Photo methods wait for launch data and a decision; photo judging stays
  banned. Push-ups moved from the proximity sensor to the camera on 2026-10-10 (user's
  call): it counts real body pose, never judges a photo, and nothing is kept.
- **Push-ups, as built (2026-10-10):** a rep is the elbow bending past 115° and straightening
  past 140°, with the shoulders dropping 0.4 of the torso, only in a plank (torso within 45° of
  horizontal, hands under the shoulders). That refuses curls standing or sitting, arm pumps
  lying on your back, and waving at the camera. Tuned and tested on 19 real clips in several
  lights and framings, no fake reps from any cheat ([docs/PUSHUP_TESTS.md](docs/PUSHUP_TESTS.md)).
  Elbow angles are only true side-on, which is why Loc asks for side-on. Rules and numbers in
  `src/lib/wake/pushups.ts` (`PUSHUPS`); the camera is `modules/pose-camera` (Swift, Vision).
  The web preview runs the same rules on a laptop webcam via MediaPipe
  (`/wake-lab?method=pushups`, or add `&demo=1` for a pretend body). Tune on a device; check
  the overlay follows a raised arm on the first build (front-camera orientation).
- **Leave the house, as built (2026-10-09):** the saved-place half only. The person
  picks a place in Routine (address search or "I'm there now"), only while the apps
  are awake. In the morning, Check in reads location once: within 120 m on a fix
  accurate to 80 m and under a minute old counts, and a vaguer fix is "can't tell
  yet", never a yes. Rules in `src/lib/place.ts`, screen at `/place`. Not built yet:
  the "~150 m from home" mode and the daylight check. Needs a new dev build
  (expo-location).
- **Background unlock** (being tested): an "I'm up" tap on the shield, then a
  second check downstairs, might unlock without opening the app
  ([docs/BACKGROUND_UNLOCK.md](docs/BACKGROUND_UNLOCK.md)). Don't promise it until
  it works on a device.
- **More methods later:** a pool of 100 candidates, plus the "build your own
  morning" idea, is in [docs/WAKE_METHODS_100.md](docs/WAKE_METHODS_100.md).
  Leave the house (#25) and proximity push-ups (#57) were adopted for v1 on
  2026-10-09. **Find Loc in AR** (#67) is logged as the leading v1.1 candidate: hide
  Loc in a room at night with the camera, find him there in the morning. Most
  on-brand method and ready-made videos, but ARKit has to re-recognise the room in
  morning light, so it's too risky for v1.

## Daytime controls (v1, decided 2026-10-01)

People paying for a blocker will be upset if they can't block an app at 2pm, so v1
gives them three plain controls on top of the night and morning loop:

1. **Always-blocked list.** Blocked in every state (already in the core loop).
   The bedtime and always lists also take websites typed in by hand (reddit.com), blocked by
   iOS's web content filter while their list sleeps (user request, October 10; see
   docs/WEBSITE_BLOCKING.md).
2. **Block now.** Pick apps and a duration, then tap go. Loc "naps" for the session.
   It starts right away, because it only tightens things. Only an emergency unlock
   or a pass can end it early. Built on the same code as naps, which move up from
   v1.1 to v1.
3. **Daily time limits.** For example, Instagram for 30 minutes a day, using the
   Screen Time usage-threshold events. When the limit is hit, the app is blocked
   until the next day. Like every other settings change, a looser limit takes
   effect from the next bedtime.

Precedence, strongest first: always-blocked, then bedtime or morning lock, then
Block now, then a reached daily limit. The morning proof never lifts Block now or a
daily limit. All of this lives in `src/lib/lock-state.ts`.

Guardrails:
- iOS caps how many activities one app can monitor at once (about 20). Budget the
  bedtime chain first. Limits and sessions get whatever is left, and the app says
  so plainly if a new limit doesn't fit.
- The nightly self-check and the revocation warnings also cover these controls.
- **Out of scope:** multiple custom daytime schedules and website-only rules.
  Home includes a compact blue-gradient screen-time chart with a seven-day trend line
  (user reference, October 7). Usage is a dedicated page opened from Home, with screen-time totals, a bar chart
  and all reported apps ranked by time used (user request, October 7).
- The App Store listing and paywall still sell a sleep app that also blocks, not a
  general blocker.

## Humane exits (required for v1)

- **Passes:** a few scarce passes a month for sick days, travel or a baby asleep
  in the room, written in his voice. Using one unlocks the morning without
  walking. Exact count and duration are to be tuned.
- **Emergency unlock:** always available, deliberate, and never clears the
  always-blocked list silently.
- **Accessible alternative:** a way to wake him for users who can't walk 200 steps
  or take stairs. Scan your code (a short walk to one spot) is the leading
  candidate; passes and the emergency unlock cover everyone else. Not final.
- No money stakes, penalties, streak shaming or "neglect" states.

## Reliability is a feature

- Build the steps on CoreMotion (`CMPedometer`), counted live in the app while he
  narrates, and read from history on open so steps walked with the app closed
  count. Downstairs uses the barometer in a short live session, because weather
  drift makes overnight pressure comparisons useless. **Don't use HealthKit** for the gate: it lags and can't be read while
  the phone is locked. Add light anti-shake checks.
- The dependable unlock is a tap on the shield or opening the app to check steps.
  **Don't promise an automatic unlock** until it has been shown to work on a
  device.
- Chain DeviceActivity schedules in short intervals (under about 45 minutes)
  rather than one long schedule. Run a nightly self-check that shields applied.
- Detect when Screen Time access has been revoked or protection is off, and say so
  plainly. Never imply protection is active when it isn't.

## Look and voice

How to keep the brand from reading as generated:
[docs/BRAND_PRINCIPLES.md](docs/BRAND_PRINCIPLES.md).

- **Visual direction: "Nocturne"** ([docs/COLOR_RESEARCH.md](docs/COLOR_RESEARCH.md),
  section 5).
  - A monochrome interface with white pill buttons and frosted chips.
  - One typeface, SF Pro Rounded, for everything (chosen 2026-10-06); his lines are its heavy italic. No brand accent color.
  - Color comes from imagery. The references are the user's three screenshots
    (the art-events app, the travel app, Opal).
- **The voice is the mascot.** v1 has no illustrated art: his lines, set big, carry
  the personality. Later options, none needed for launch: photographing a
  customized plush raccoon, or commissioned art. Don't ship raw AI-generated
  mascot art.
- **Where he shows up:** the block screen (a small icon plus his line as the
  title; iOS doesn't allow full-screen art there), the morning walk, the home
  state, notifications, and the morning share card.
- **Never glow** (CLAUDE.md). Never troll-like, and never icy blue (see the LoL
  Trundle conflict).
- **Name: Locturne** (lock + nocturne, said "lock-turn"). Decided September 27, 2026,
  replacing Trundle (September 24); the reasoning is in
  [docs/NAME_RESEARCH.md](docs/NAME_RESEARCH.md). The raccoon is **Loc**, the way the
  app is Duolingo and the owl is Duo. Still run a USPTO class 9 check and a social
  handle check before launch.
- **Voice rules and line bank:** [docs/VOICE.md](docs/VOICE.md).

## Money

- **Hard paywall at the end of onboarding:** two plans on one page (lifetime dropped
  2026-09-26: at $99.99 next to a $59.99 annual it skipped the trial and capped LTV):
  **Annual $59.99 with
  a 7-day free trial, selected by default** and shown with its per-month price
  ($5.00/month as the smaller detail under $59.99/year; raised from $39.99 on 2026-09-25, see [docs/PAYWALL_VIDEO_NOTES.md](docs/PAYWALL_VIDEO_NOTES.md)), and Monthly $9.99 (no trial).
  The page before it (`offer`) is the dated trial timeline: Tonight $0 / Day 5
  reminder / Day 7 charge date (restored 2026-09-25, [docs/sub-club/APPLIED_TO_LOCTURNE.md](docs/sub-club/APPLIED_TO_LOCTURNE.md) P2). Plain renewal terms (App Store
  guideline 3.1.2): the billed amount is the biggest price on each card. No fake
  countdowns, struck-through prices or hidden prices.
- **One exit offer, as an A/B test** (changed 2026-09-25): closing the paywall shows
  one of three arms, once: no offer, annual at $29.99/year (half price) with the same
  trial, or full-price annual with 14 days free. **Default arm: 14 days free**
  (2026-09-26), since a half-price offer behind the close button spreads fast on TikTok. Judge on net revenue after refunds per
  install at day 35 (`EXIT_OFFERS` in `content.ts`; [docs/sub-club/APPLIED_TO_LOCTURNE.md](docs/sub-club/APPLIED_TO_LOCTURNE.md) test 3).
  The half-price product also appears as a downgrade in iOS Settings. There's no timer.
  The full price is named as a plain comparison, never struck through.
- Keep a freemium fallback ready if word of mouth is weak (Opal's revenue grew after
  it went freemium).
- **Onboarding shape:** about 22 screens to the paywall, redesigned 2026-10-05
  ([docs/ONBOARDING_10.md](docs/ONBOARDING_10.md): Loc replies to every answer, the times come
  first, a grumpiness setting; the age question is cut). Earlier details in
  [docs/ONBOARDING_CONVERSION.md](docs/ONBOARDING_CONVERSION.md):
  1. How grumpy he should be, then bedtime and alarm, then a 6-question quiz in their own times.
  2. The "hours a week on your phone in bed" number, then their night drawn with and without him.
  3. Set up apps, then the deal: the editable schedule and hold to agree.
  4. A two-page paywall with a 7-day trial on the annual plan.
  5. The lock **arms only after purchase**. Nothing ever blocks the phone of
     someone who hasn't paid.

## Build order

Target: **launch January 2–5, 2027**, with February as the no-shame fallback. The
dates come from [docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md); the launch date itself
is still an open decision (below). Order of priority if time runs short: cut Scan
and the share card before any reliability work. Downstairs stays.

**Step 0: accounts and IDs. Done.**
- ~~Apple Developer Program, App ID, the three extension IDs, App Group, Family
  Controls (Distribution) approval, bundle ID `com.lukelyons.locturne`.~~ Done
  2026-09-28 to 10-01 ([docs/ENTITLEMENT_SETUP.md](docs/ENTITLEMENT_SETUP.md)).
- ~~EAS Build with the three Screen Time extensions.~~ First dev build compiled and
  installed on the iPhone (dev is on Linux; EAS does the macOS part).
- ~~Family Controls (Distribution) ticked on all four App IDs.~~ Done 2026-10-01.
  Step 0 is complete.

**Step 1: device spike (Oct 1–14). In progress.** Exit gates, on a real iPhone:
1. Blocks apply at bedtime and hold for 3+ nights with the app closed.
   *Manual blocking works; the chained bedtime schedule is built but not yet run
   overnight.*
2. The morning proof unlocks: 200 steps, and a downstairs trip logged on real
   stairs, from the app (and from the shield if the background unlock works).
3. Revocation is detected.

If any of these fail, stop and redesign. Also learn the platform's limits here: a
shield button can't open the app, re-registering a monitored activity fires
`intervalDidEnd`, and the monitor extension has about 6 MB of memory.

**Built ahead of the spike** (UI on real data, needs device tests): the
Routine tab (schedule, nights, wake-up method, step target, next-bedtime note),
the Nap tab with Block now and the sideways moon clock, daily limits and the
always-blocked list on the Apps tab, and the lock rules in `lock-state.ts` and
`daily-limits.ts` with timezone sweep tests.

**Built October 3, needs device tests** ([docs/v1-build/INTEGRATION.md](docs/v1-build/INTEGRATION.md)):
most of Step 2 and Step 4's screens, all on one lock controller (`syncLock`):
- The method-agnostic morning gate.
- Steps (history plus live, a cadence cap) and downstairs (barometer).
- Scan your code.
- Passes (3 a month, open decision 4) and the emergency unlock (pauses tonight only).
- Off nights skipped by the monitor extension.
- Heartbeat log, nightly self-check, honest status and the diagnostics screen.
- Local notifications.
- Real onboarding (Screen Time prompt, Apple's picker, the stairs question, arming after
  purchase).
- Home, Routine and You on real state, shield words per state, firsts and the rating prompt.

RevenueCat is built behind `src/lib/purchases.ts` (2026-10-03,
[docs/v1-build/purchases.md](docs/v1-build/purchases.md)); it goes live once the store setup in
[docs/REVENUECAT_SETUP.md](docs/REVENUECAT_SETUP.md) is done. Still to build: PostHog, the
share card, the icon and splash, and the background unlock. None of it has passed the
Step 1 device gates yet.

**Step 2: the engine (Oct 15 – Nov 15).** Works on the phone with the app closed,
ugly UI is fine.
- Weekday-specific schedules (nights off), inside iOS's ~20-activity budget.
- A method-agnostic unlock engine: the morning gate takes a proof from any method,
  so adding a method never touches the lock rules.
- Steps (history plus live, light anti-shake), downstairs, scan, leave the house,
  push-ups.
- Passes, emergency unlock (pausing the night windows), the accessible option.
- Honest status: revocation on every open, an extension heartbeat log in the App
  Group, the nightly self-check, a hidden diagnostics screen for beta testers.
- Notifications: morning start, bedtime warning, shield tap, day-5 trial reminder,
  revoked access. Asked for on onboarding's `armed` screen, right after purchase, once he's
  said what they're for (decided 2026-10-03); the first successful night is the second
  chance.

**Step 3: money and data (Nov 1–20).** RevenueCat (annual with trial plus monthly,
no trial toggle, restore, exit-offer arms by remote config). PostHog in the app
only, never in extensions. The lock arms only after purchase. Key metric: the share
of trial starters who complete a first morning unlock.

**Step 4: v1 UI (Nov 10 – Dec 10).**
- Onboarding wired to real APIs: Apple's picker, permissions, StoreKit prices, the
  `method` question, "Armed" only once tonight is confirmed.
- Night, morning and day home states.
- Wake-up screens: downstairs (Start, live height meter, "steps instead" link),
  the live walk with his lines, scan, leave the house, push-ups (rep count in his voice).
- Custom shield text per state; passes, emergency and can't-sleep path.
- Morning share card ("Bed 11:41. Downstairs 7:02. Still disappointed.").
- App icon and splash (the template ones are still in `app.json`).
- A VoiceOver pass on a real device.

**Step 5: beta, review and store (Nov 20 – Dec 18).**
- Internal TestFlight from about Nov 20, external from Dec 1 (100–300 waitlist
  users).
- Submit an early build to App Review in mid-November to flush out Screen Time
  problems, and nominate for featuring.
- 1.0 approved and on manual release by Dec 18 (review slows Dec 23–27). Store
  page, Custom Product Pages per video angle, a New Year in-app event, pre-orders.
- Trademark (USPTO class 9) and social handle checks.

**Step 6: v1.1, only after real users (February onward)**
- A real alarm (AlarmKit) to lead with the morning.
- Loc's moon in the Dynamic Island while apps are asleep (night and morning Live
  Activities, push-started; [docs/LIVE_ACTIVITY_IDEA.md](docs/LIVE_ACTIVITY_IDEA.md)) and a
  streak widget.
- The next wake-up method, chosen by which video series converted best. Find Loc
  in AR is the leading candidate (logged 2026-10-09).
- Buddy/couples mode: a partner gets a message if bedtime breaks; no money moves.
- Scheduled naps and "put him to bed early" (Block now already ships in v1).
- An opt-in "went to bed earlier" dataset for a published result later.

## Open decisions

Decided 2026-10-01: **launch at $59.99/yr** (LAUNCH_PLAN D5's $39.99 start is
rejected; a lower price can still be tested after launch).

1. **Launch date:** January 2–5, 2027 (D7).
2. **App Store category:** Health & Fitness, where Erly and Wayk sit, recommended
   (D6).
3. **Back-to-bed fix:** build the two-part wake-up as an off-by-default setting
   for the beta, or wait for data (D4).
4. **Passes:** how many a month and how long each lasts.
5. **Accessible alternative:** confirm Scan, or design something else.
6. **Lead hook:** settled by the first videos of the real app, not by opinion.

## Marketing (starts once the app is polished)

Decided 2026-10-01: **build first, then advertise the real app.** No concept videos
of an app that doesn't exist; good content needs real footage of the lock and the
morning. The cost: no early signal on the hook, and the beta needs testers from
somewhere.

- **Trigger:** once the morning flow works on the phone with real UI (target
  mid-November, Step 4), put up a waitlist page on Cloudflare Pages (TikTok blocks
  App Store links in personal bios) and start the videos, so there are testers for
  the external beta and a list for launch.
- 20–30 videos across angles, all real screen and real stairs. Downstairs gets its
  own series ("I have to go downstairs before Instagram works").
  - The hook to test first: "I have to walk 200 steps before TikTok works."
  - Signal to look for: "what app is this?" comments and sign-ups.
- **At launch:** daily founder videos across 2–3 accounts, plus paid niche
  creators at $2–3 CPM.
  - Measure payers per 1K views, not views.
  - $10K a month takes roughly 20–25M views a year.

**October 26 checkpoint:** did the spike pass? Yes: keep building v1. No:
redesign. The video signal (about 1+ sign-up per 1K views is working; under 0.3
means change the hook, [docs/STRATEGY_DEEP_DIVE.md](docs/STRATEGY_DEEP_DIVE.md)
section 5) moves to the first weeks of real-app videos in November.

## Gates

A TestFlight group of 100–300 users should show:
- **D30:** at least 20% still have blocking active.
- Fewer than 1 in 50 nights with a missed block.
- Roughly 30% or more of trials turning into paid subscriptions.

Pass, then launch hard. Fail, then fix it or stop, **before** spending the
audience. Expectations: most new apps stay under $1K a month; a strong result is
$10–25K a month by month 12 ([docs/IDEA_SCORECARD.md](docs/IDEA_SCORECARD.md)).

## Ideas to test (not committed yet)

From [docs/DESIRE_VALIDATION.md](docs/DESIRE_VALIDATION.md), September 24, 2026.

- **Lead hook:** test "My phone won't work until I get out of bed" against "I have
  to walk 200 steps before TikTok works."
- **Positioning:** "the one lock you can't beat from bed."
- **Back-to-bed risk:** after unlocking, people may get back into bed and scroll.
  Measure it in the concierge week.
  - Candidate fix, a two-part wake-up: 100 steps, then the last 100 count only
    after about 10 minutes.
- **Viral features:**
  1. His voice as real audio, aiming to become a TikTok sound.
  2. Roasts when the anti-shake check catches cheating.
  3. An "excuse court" for passes, with rulings from the line bank rather than AI.
  4. The morning share card as a receipt, including "time wasted in bed".
  5. A falling-asleep goodnight at bedtime.

## Not part of the plan

- Money stakes or escrow, punishments, guilt mechanics, or a pet that suffers.
- Timed earned unlocks (walk to buy 10–15 minutes of access) or AI/photo
  verification of goals.
- Detailed stats dashboards, sleep scores, soundscapes, or sleep tracking.
  Exception (October 7 user request): a compact Home screen-time chart with total
  usage and daily average over 7 or 30 days. Remove the Home mascot illustration.
- Android, squads or leaderboards, a cosmetic economy, NFC.
- Illustrated mascot art for v1.
- Weekly pricing.
