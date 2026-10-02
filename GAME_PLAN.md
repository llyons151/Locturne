# Locturne: game plan

Updated September 24, 2026. This is the source of truth for product direction. It
replaces the September 21 plan, which is archived at
[docs/archive/GAME_PLAN_2026-09-21.md](docs/archive/GAME_PLAN_2026-09-21.md). The
reasoning behind it is in [docs/IDEA_SCORECARD.md](docs/IDEA_SCORECARD.md),
[docs/VALIDATION_RESEARCH.md](docs/VALIDATION_RESEARCH.md) and
[docs/DESIRE_VALIDATION.md](docs/DESIRE_VALIDATION.md) (what makes people want it).

## The product in one line

**Your apps go to sleep at bedtime and don't wake up until you get out of bed.**

Locturne is a paid iOS app for people who scroll in bed at both ends of the night.
At bedtime it blocks the apps the user chose. In the morning they stay blocked
until the user walks 200 steps. A sassy, tired raccoon voice runs the whole thing.
He's strict about the situation and never shames the user.

## Why this, and why now

- **The problem is big.** Pew (Sept 2026): 62% of 18–29s say their phone hurts
  their sleep, and only 25% of people who tried to cut back say it went extremely or very well.
- **The bedtime lock is table stakes.** Opal advertises it ("Sleep Time 10PM–8AM
  Block All"). **The morning is the wedge.** Opal's morning ends at a clock time,
  even if you're still in bed. Locturne's ends when you get up. Morning-task apps
  are a proven market: Alarmy has 82M downloads, and Early went from launch to
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
3. At the morning start time the step count begins. The apps stay blocked.
4. The user walks 200 steps and the apps wake up until the next bedtime.
5. An always-blocked list stays blocked in every state. If an app is on both
   lists, the always-blocked rule wins.

Rules carried over from the previous plan:
- Steps count from the morning start time, including steps taken before the app
  is opened. Opening the app doesn't start the count.
- The count resets each morning. Reopening the app never resets progress.
- Bedtime takes precedence: walking at night never unlocks apps.
- 200 is a default to test, not a validated number. The target is adjustable.
- The user controls the schedule and both app lists at all times, but **every
  settings change takes effect from the next bedtime** (decided 2026-10-01). An edit
  made during the night waits for the following night, so nothing can be loosened
  from bed. The settings screen says so plainly.
- Nights can be switched off per weekday. A night that's off has no morning lock
  either (decided 2026-10-01). The always-blocked list still applies.
- The rules live in `src/lib/lock-state.ts` (tests: `npm test`).

## Daytime controls (v1, decided 2026-10-01)

People paying for a blocker will be upset if they can't block an app at 2pm, so v1
gives them three plain controls on top of the night and morning loop:

1. **Always-blocked list.** Blocked in every state (already in the core loop).
2. **Block now.** Pick apps and a duration, then tap go. Loc "naps" for the session.
   It starts right away, because it only tightens things. Only an emergency unlock
   or a pass can end it early. Built on the same code as naps, which move up from
   v1.1 to v1.
3. **Daily time limits.** For example, Instagram for 30 minutes a day, using the
   Screen Time usage-threshold events. When the limit is hit, the app is blocked
   until the next day. Like every other settings change, a looser limit takes
   effect from the next bedtime.

Precedence, strongest first: always-blocked, then bedtime or morning lock, then
Block now, then a reached daily limit. Walking 200 steps never lifts Block now or a
daily limit. All of this lives in `src/lib/lock-state.ts`.

Guardrails:
- iOS caps how many activities one app can monitor at once (about 20). Budget the
  bedtime chain first. Limits and sessions get whatever is left, and the app says
  so plainly if a new limit doesn't fit.
- The nightly self-check and the revocation warnings also cover these controls.
- **Out of scope:** multiple custom daytime schedules, website-only rules and usage
  stats.
- The App Store listing and paywall still sell a sleep app that also blocks, not a
  general blocker.

## Humane exits (required for v1)

- **Passes:** a few scarce passes a month for sick days, travel or a baby asleep
  in the room, written in his voice. Using one unlocks the morning without
  walking. Exact count and duration are to be tuned.
- **Emergency unlock:** always available, deliberate, and never clears the
  always-blocked list silently.
- **Accessible alternative:** a non-walking way to wake him (to be designed), for
  users who can't walk 200 steps.
- No money stakes, penalties, streak shaming or "neglect" states.

## Reliability is a feature

- Build the steps on CoreMotion (`CMPedometer`), counted live in the app while he
  narrates. **Don't use HealthKit** for the gate: it lags and can't be read while
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
  - A heavy italic serif for his lines. No brand accent color.
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
- **Onboarding shape:** about 25 screens (details in
  [docs/ONBOARDING_CONVERSION.md](docs/ONBOARDING_CONVERSION.md)):
  1. A 7-question quiz.
  2. The "hours a week on your phone in bed" number.
  3. Set up apps and times ("tonight's lock is ready").
  4. A two-page paywall with a 7-day trial on the annual plan.
  5. The lock **arms only after purchase**. Nothing ever blocks the phone of
     someone who hasn't paid.

## Build order

**Step 0: now**
- ~~Finish Apple Developer Program enrollment.~~ Done 2026-09-28.
- ~~Register the App ID, the three extension IDs and the App Group, then request
  Family Controls (Distribution).~~ Done 2026-09-28; approved by 2026-10-01. See
  [docs/ENTITLEMENT_SETUP.md](docs/ENTITLEMENT_SETUP.md).
- ~~Set `ios.bundleIdentifier` in `app.json`.~~ `com.lukelyons.locturne`.
- Dev is on Linux with no confirmed Mac, so native extensions are built with EAS
  Build.

**Step 1: device spike (about 2 weeks, before any real UI).** On a real iPhone,
prove:
1. Blocks apply at bedtime and hold for 3+ nights with the app closed.
2. The morning step count unlocks at 200, from the shield tap or the app.
3. Revocation is detected.

If any of these fail, stop and redesign.

**Step 2: v1**
- Onboarding quiz and paywall.
- Night, morning and day home states.
- Morning walk screen with a live count and his lines.
- Custom shield text.
- Always-blocked list.
- Block now (with naps) and daily time limits.
- Passes, emergency unlock and the accessible alternative.
- Reliability checks and honest status.
- Morning share card ("Bed 11:41. Up 7:02. 213 steps. Still disappointed.").
- Settings.

**Step 3: v1.1, only after real users**
- A real alarm (AlarmKit) to lead with the morning.
- Streak widget and a bedtime Live Activity.
- Buddy/couples mode: a partner gets a message if bedtime breaks; no money moves.
- Scheduled naps ("tuck him in now" ships in v1 as Block now).
- Put him to bed early.
- An opt-in "went to bed earlier" dataset for a published result later.

## Marketing (runs alongside the build, starting now)

- **Before the app exists:** 20–30 concept videos across angles, linking to a
  waitlist.
  - The hook to test first: "I have to walk 200 steps before TikTok works."
  - Signal to look for: "what app is this?" comments and sign-ups.
- **At launch:** daily founder videos across 2–3 accounts, plus paid niche
  creators at $2–3 CPM.
  - Measure payers per 1K views, not views.
  - $10K a month takes roughly 20–25M views a year.

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
- Stats dashboards, sleep scores, soundscapes, or sleep tracking.
- Android, squads or leaderboards, a cosmetic economy, NFC.
- Illustrated mascot art for v1.
- Weekly pricing.
