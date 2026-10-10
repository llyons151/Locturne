# Home vs the best dashboards: will it convert?

Research of October 10, 2026. Mobbin teardown of about 60 home and "today" screens from
top-grossing apps (Opal, Brick, QUITTR, Duolingo, Finch, Oura, WHOOP, Rise, Bevel, Pillow,
Eight Sleep, Babbel, Monzo, Speak, Nike Run Club, Strava and others), checked against the
current Home (web build, day state, October 10). Builds on [HOME_10.md](HOME_10.md).

This is research, not a build.

## First, what "convert" means for Home

Locturne has a hard paywall, so nobody sees Home before they start a trial. Home can't
win installs. It decides two later numbers:

1. **Trial to paid (day 7).** Health & Fitness benchmarks: 35% (RevenueCat), 37.7% and 42.2%
   (Adapty 2026). See [VALIDATION_RESEARCH.md](VALIDATION_RESEARCH.md) and
   [STRATEGY_DEEP_DIVE.md](STRATEGY_DEEP_DIVE.md). GAME_PLAN's target is 30% or more.
2. **First renewal.** About 35% of annual cancellations happen in month one, and they follow
   whether the core action happened, not app opens (RevenueCat, cited in HOME_10).

Mobbin shows screens, not conversion numbers. So nothing here can forecast an exact rate. What
it can show is whether Home does what the top earners' homes do in the moments that decide
those two numbers.

## Verdict

**The structure is already at the top of the category.** A single-state hero (Brick, QUITTR),
a voice line (Duolingo, Finch), one action that changes with state (WHOOP), a count that never
resets, and a week strip (Duolingo's widget, Strava). Nothing on Home is clutter or a
dark pattern. Opal's home, by contrast, mixes peer comparison, gems, upsell-style meditation
cards and three different metrics.

Assuming the lock works reliably, I'd expect Home to land **at the category median (35 to 40%
trial to paid), not hurt it.** Getting above the median depends on three moments that Home
doesn't do as well as the best apps yet. In order of impact:

## The three gaps (ranked by effect on conversion)

### 1. Trial's last 2 days: the cancel button is the hero (biggest lever)

**Now:** in the last 2 trial days, `trialHero` replaces the hero and the primary button
becomes **"Manage subscription"** (home-screen.tsx:128–171). During the exact 48 hours when
the user decides whether to pay, the biggest thing on screen is a route to cancel, and the
proof that it's working (the mornings) is pushed aside.

**What the best apps do:** they keep the trial notice honest but **small**, and put the value
beside it.

- [Babbel](https://mobbin.com/screens/ff2df18e-7279-4b7c-abc3-84d54a6f5a72): the weekly
  summary (activity, goal bar, "Continue learning") fills the screen, and "Your free trial
  will end in 6 days" is a thin strip at the bottom.
- [Monzo Extra](https://mobbin.com/screens/da9f02af-72af-4af8-abd1-e06147f4872e): "Enjoying
  Extra?" sits next to a "Most used" card showing what you actually used.
- [Yazio](https://mobbin.com/screens/fc420109-4578-4886-80fd-93e41d7bccaa): the cancel path
  shows what you'd lose before the button.

**Locturne version:** keep the normal state hero and action. Add one quiet line under it:
"Trial ends Thursday. 5 mornings up so far." with a small "Manage" link. The paywall's promise
("I'll remind you") is still kept, and cancelling stays one tap away, so it's still honest.
The difference is the user reads the proof first.

### 2. Day 0 to the first morning: the empty dashboard

**Now:** I couldn't check this render. The web build fills the week with mock checks
(`MOCK_WEEK`), so the screenshot shows 7 of 7. On a real first day the strip is 7 empty
circles and the pill says "0 mornings".

**Why it matters:** the share of trial starters who complete a first morning is the number most
likely to predict paying (TODO.md:218 already plans to track it). "A blank first-day
dashboard" is a top complaint about Bevel (HOME_10).

**What the best apps do:**
[Oura](https://mobbin.com/screens/f6c46e74-427e-4197-9d63-03ed1f42a114) shows "0" with
**"Getting started: your activity goal today is your baseline"**, so zero reads as a beginning.
[Speak](https://mobbin.com/screens/7acbb2fc-3817-408f-9db3-25380bb43706) and
[Liven](https://mobbin.com/screens/92b03f22-7a06-49d3-8833-69ad40444247) show a 1-of-7 strip as
"Amazing start!".

**Locturne version:** before the first proof, the strip and pill say "Starts tonight" or
"First morning: tomorrow, 7 am, downstairs" instead of 0 and empty circles. The hero says
what will happen at bedtime tonight, and Loc's line tells them what tomorrow morning will look
like. No new elements, just day-0 wording.

### 3. The morning win is too small to remember or share

**Now:** after the proof, the wake screen shows Loc's line, one status line and Done
(wake-screen.tsx:152, deliberately "no confetti"). The count goes up on Home, but nobody sees
it go up.

**What the best apps do:** every top habit app turns the completion into a moment with the
count as the hero:
[Speak](https://mobbin.com/screens/7acbb2fc-3817-408f-9db3-25380bb43706),
[Numo](https://mobbin.com/screens/6bd56122-0f37-4c7c-a21b-9bfb35dd4cca),
[Finch](https://mobbin.com/screens/aa4e5c2e-3cb5-48e5-8fa4-5441894d435a),
[Nike Run Club](https://mobbin.com/screens/931d5b5c-bc58-44f6-80e1-478c4ae9d594),
[How We Feel](https://mobbin.com/screens/824dac5c-f611-4999-888c-8c3163475a2f). Most have a
**Share** button.

**Locturne version:** keep the restraint (no confetti, no particles; see the "premium motion"
decision). Make the number the hero: "**8** mornings up" ticks from 7 to 8, the week strip
fills today's dot, and one specific fact ("1 flight, 7:06"). Add a Share button for the
morning card (TODO.md:214). This is also the short-form video engine: every share is a
real-footage ad.

## Smaller notes

- **Screen time pill (top right).** Fine as a secondary. Don't promote it: information alone
  doesn't change behaviour (HOME_10 §1). Opal's
  [peer comparison](https://mobbin.com/screens/30c475b4-40dc-466b-b504-b2ac3ca3bfa2) ("19% lower
  than your peers") is the only screen-time framing that sells, and JS can't read the numbers.
- **The night is the dashboard you don't open.** Opal, Forest and Apple Fitness all put the
  live state on the lock screen
  ([Forest](https://mobbin.com/screens/916918da-b9a5-4e16-923a-41d439e60c3f)). That's the v1.1
  Live Activity, still the right call.
- **Don't copy:** sleep scores and "poor" grades
  ([Bevel](https://mobbin.com/screens/5d156e6a-f1ba-4b4f-8360-31122d692ee4),
  [Pillow](https://mobbin.com/screens/c1fde433-1ad8-42b0-bd41-f36d6c8fe3f4)), gems and
  "Top 17% worldwide"
  ([Opal profile](https://mobbin.com/screens/a4301fe8-32d4-4b09-8054-bf68100ced03)), resettable
  streaks with a Reset button
  ([QUITTR](https://mobbin.com/screens/a1d13446-5549-4fa0-af60-11c8018beebe)).

## Open decisions

1. **Trial window:** keep the state hero and move the trial notice to a quiet line with the
   mornings count (recommended), or keep the current takeover?
2. **Day 0 wording:** replace "0 mornings" and the empty strip with "Starts tonight" until the
   first proof?
3. **Morning moment:** make the count the hero of the wake success screen, with Share?

## How to measure it

Ship with PostHog (GAME_PLAN step 3) and watch, per trial cohort:

- the share who complete a first morning by day 2;
- mornings completed in the trial week, split by converted vs not;
- trial-to-paid by whether they saw the trial notice on Home.

If converters average 4 or more mornings in the trial and non-converters 1 or fewer, gap 2
(day 0 to first morning) is where the money is.
