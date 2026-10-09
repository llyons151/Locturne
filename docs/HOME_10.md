# Home 10/10: what the dashboard should have

Research of October 7, 2026, done by three tracks in parallel:

- A teardown of about 30 home screens: blockers, wake-up apps, health dashboards and mascot apps.
- The evidence on what home screens do for behaviour and retention.
- An inventory of what Locturne already has that Home could show.

This is research, not a build. The decisions at the bottom are open.

## The one-sentence answer

A 10/10 Home answers **"what state are my apps in, and what do I do next?"** in one glance. It
uses Loc's voice to say it. Then it proves the app is working, with a count of mornings you got
up that never resets.

Everything else is secondary or lives elsewhere.

## What the evidence says

Tags in brackets show how strong the evidence is:

- **[Strong]**: a randomised trial (RCT) or a meta-analysis.
- **[Mod]**: one good controlled study, or a large dataset from the company itself.
- **[Weak]**: a small pilot, observational data or a vendor blog.
- **[Unverified]**: a figure that couldn't be traced to a primary source.

### 1. The block changes behaviour; information doesn't

- **one sec** (PNAS 2023) cut actual openings of the target apps by 57%. In its controlled
  experiment, though, the informational message was no better than control. The friction did
  the work. [Mod] https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409
- **Pop-up awareness notices had no effect on screen time** (Loid et al., 2020). [Mod]
- **No published RCT shows that Apple's Screen Time dashboard reduces use.**
- **So a usage chart on Home is decoration.** It isn't treatment. It's fine as a secondary card,
  but it shouldn't be the hero.

### 2. Paid apps churn on proof of value, not on opens

- **RevenueCat 2026:** about 35% of annual-plan cancellations happen in the first month.
  Retention at the first renewal is "an activation and time-to-value problem". Repeated core
  actions predict renewal; app opens don't.
  https://www.revenuecat.com/blog/growth/first-renewal-churn.md [Mod, vendor data]
- **Home's second job:** show that the core loop happened ("14 mornings you got up").

### 3. Streaks: keep the good part, drop the cliff

- **Duolingo:** a 7-day streak goes with 2.4x more next-day returns. [Mod, correlational]
- **Broken streaks** (Silverman & Barasch, JCR 2023, 7 studies): engagement drops after a break.
  It drops most when people blame themselves, and least when the streak can be repaired. [Mod]
- **For Locturne:** use a cumulative count that never resets, and frame a miss as "rough night",
  never as your fault. This matches NIGHT_PHONE_SCIENCE (show "nights kept / mornings walked")
  and VOICE (no guilt).

### 4. Don't grade the night

- **Fake "bad night" feedback made people feel worse** during the day, whatever their real
  sleep was (Gavriloff 2018, RCT). [Mod]
- **"Orthosomnia"** is anxiety caused by sleep scores. [Weak]
- **Locturne can't measure sleep anyway.** So: no sleep score and no morning grade.

### 5. Progress bars pull people forward

- **Goal gradient:** people speed up as they near a goal (Kivetz 2006).
- **Endowed progress:** starting the bar already partly filled raised completion from about 19%
  to 34% (Nunes & Drèze 2006). Those two figures are from memory of the paper; the search didn't
  surface them. [Mod]
- **The morning proof** (steps, floors, the downstairs hold) should fill visibly.

### 6. Glanceable surfaces outside the app help

- Duolingo widget users retained better, even after allowing for selection; no number given.
  [Mod, observational]
- Gratitude widget users retained 25% better. [Weak/Mod]
- **Expect about 10% of users to adopt a widget.**
- **At night, the best Home is one you don't open.** A Live Activity or StandBy widget gives the
  status without unlocking the phone.

### 7. Time-of-day homes are convention, not proven

- **Oura and Rise do it**, and users like it.
- **No outcome data exists.** [Weak]
- **Do it cheaply**: the same layout with different content.

### 8. A mascot that reacts helps; a sad mascot probably backfires

- **Mood that reacts to the user:** teens whose virtual pet reacted to their breakfast photos
  were about twice as likely to eat breakfast. [Weak]
- **A sad mascot after a lapse** has never been studied directly. By analogy with the
  broken-streak findings, it likely backfires after a lapse. [Inference]

## What the best home screens share (competitor teardown)

| Pattern | Who does it well | Locturne version |
|---|---|---|
| One hero equals one state | Brick ("Bricked" timer), Forest (plant), Oura "one big thing" | "Asleep until your wake-up" / "Sleeps in 1h 12m" |
| Changes by time of day | Oura's daily highlight, Rise's day windows, Duo's widget mood, Pokémon Sleep | Evening, night, locked morning and day views |
| One voice line beside the hero | CARROT Weather, Duolingo | Loc's line, read through the tone setting |
| One primary action that changes with state | Forest, WHOOP action button | Night: none. Morning: "Go downstairs". Day: "Block now" |
| A morning payoff screen | Pokémon Sleep wake-up reveal, Pillow last-night rings | "Up at 7:06. 1 flight. Apps awake." with no grading |
| 2–3 small secondary cards, can be hidden | WHOOP, Bevel, Apple Fitness | Apps card, usage chart, passes |
| Forgiving progress | Gentler Streak (rest days don't break it) | "Mornings you got up: 23", never back to 0 |
| Lock state outside the app | Opal Live Activities and Rules widget, Jomo widgets | v1.1 Live Activity and StandBy widget (LIVE_ACTIVITY_IDEA, WIDGETS) |

**What users complain about:**

- Scores nobody understands (Opal's Focus %), and "a list of numbers" (Oura).
- Clutter where the pet, goals and stats compete (Finch).
- Gems, points and seeds that mean nothing (Opal, Zero).
- Upsells on the home screen (Sleep Cycle, Hatch, Zero).
- A blank first-day dashboard (Bevel).
- A primary action buried by a redesign (Opal).
- Widgets that go blank (Rise, Zero).

**The closest competitors** are BedLock, MornDash, lumi, Unbed and Erly. All of them use streaks
that reset, or "win or loss" mornings. None has a well-documented home screen. This niche's Home
is unclaimed.

## The 10/10 Home, element by element

### Must have (v1)

1. **Honest status hero, one line, with the time.** This is the first thing on screen in every
   state.
   - It **must** read the real state. Today it always says "Tonight's schedule", even with
     nothing armed or a lapsed subscription.
   - If protection is broken (Screen Time access off, subscription ended, nothing picked), the
     hero says so with the fix button. That replaces everything else. This is "never fails
     silently".
2. **Loc's line**, read through the tone setting (mild, grumpy, unbearable). Home ignores tone
   today (ONBOARDING_10:191). Firsts keep taking over the line.
3. **The next action, which changes with state:**

   | State | Hero | Action |
   |---|---|---|
   | Day | "Apps sleep at 11:00 PM · in 4h 12m" | Optional "Block now", which opens the Sleep sheet |
   | Evening (last hour) | "Apps sleep in 38m" | None, or "Put them to sleep now" |
   | Night | "Asleep until your wake-up" | **None.** Dark, short, nothing to scroll |
   | Morning (locked) | "Apps are waiting for you to get up" | **Big "Go downstairs" / "Start walking" / "Scan my code"** with progress already filled in |
   | Morning (done) | Morning reveal: "Up at 7:06. Apps awake." | None |
   | Paused or night off | Plain wording of what's paused and until when | None |
   | Unprotected | The problem | "Open Settings" / "See plans" |

   The committed version had the morning button. The uncommitted diff dropped it. **This is the
   most important missing piece**, because the morning is the product's wedge.
4. **Bedtime apps card** (the current `BedtimeApps`): real icons, a badge, a countdown. It already
   handles every state well. Keep it.
5. **Ways out, findable but quiet:** in night and morning, a small "Use a pass (2 left)" link.
   The uncommitted diff removed it. It's a humane exit and a GAME_PLAN requirement.
6. **Subscription and trial notice** in the last 2 days of a trial (TODO.md:170 assigns it to
   Home). It's also dropped right now.

### Should have (v1 if time allows, otherwise v1.1)

7. **"Mornings you got up" count**, which never resets ("23 mornings · 9 of the last 10").
   - It's built from `locturne.morningProofs`, which only keeps the last 30 records. A lifetime
     count needs a separate counter.
   - It proves value during the first 90 days (RevenueCat), and it can't "break".
   - It's small and sits under the hero, not as a hero.
   - Passes and emergencies don't count, and they don't subtract either.
8. **The morning reveal card**, shown once after proof: wake time, method and something specific
   ("1 flight", "212 steps"). This is the share card's seed (TODO:214). It's the morning payoff
   moment that Pokémon Sleep and Pillow do well.
9. **The usage chart stays, but under the apps card, never above it.** The user asked for it on
   October 7, so it stays. The evidence says it won't change behaviour, so it shouldn't grow. JS
   can't read the numbers either (they live only in Apple's report extension), so no captions
   like "down 20%" are possible.
10. **Pending-change note**: "Your new bedtime starts tomorrow". This only shows when an edit is
    waiting. It reassures users and backs the next-bedtime rule. Users loosen their own rules
    over time (Kovacs), so it should be visible.
11. **Day-state limits line**, for example "Instagram: used up today". Only show it when a limit
    exists. The data is there (`limitUsedUpToday`).

### Later (v1.1+)

12. **Live Activity** from bedtime to morning, and a **StandBy or lock-screen widget** with Loc's
    state face. This is the real "dashboard" at night, without opening the app.
13. **A value reminder about 7–14 days before renewal**, and around day 30: "What Loc did this
    month: 26 mornings up, 4 passes".
14. **Wake-time regularity**: a quiet weekly line about when you got up. Regularity is a gain
    frame, not phone use.

### Never on Home

- **A sleep score, a morning grade or "hours slept".** We can't measure sleep, and negative
  feedback makes people feel worse.
- **A streak that resets to 0, a "0 days" hero, or a sad or disappointed Loc after a miss.**
- **Upsells or paywall prompts**, except the honest "subscription ended, so apps can't sleep"
  state.
- **Tips, articles, daily quotes or anything new to read at night.**
- **Gems, points or badges.**
- **Stat tiles or decorative rings** (already on the BRAND_PRINCIPLES kill list).
- **A usage chart as the hero**, or anything that makes the night screen worth scrolling.

## Gaps in the current build (uncommitted Home, Oct 7)

| Gap | Severity |
|---|---|
| Hero says "Tonight's schedule" even when nothing is protected | High: breaks "never fails silently" |
| No morning action button or live progress on Home | High: the wedge isn't on the main screen |
| No pass or emergency link at night or in the morning | Medium: a GAME_PLAN requirement |
| Trial and subscription notice missing | Medium: TODO:170 |
| Tone setting ignored | Low |
| HOME_SPEC contradicts itself (says "no charts", and also describes a chart and an Endel layout that isn't built) | Docs: needs a rewrite once the decisions below are made |
| Orphaned files: `night-meter.tsx` (partly), `moon-lock.tsx`, `loc-peek.tsx` | Cleanup |

## Open decisions for the user

1. **The count.** Show "mornings you got up" on Home in v1 (recommended), or keep it for the
   share card or the You tab?
2. **The day action.** Show a "Block now" button on Home by day, or keep it on the Sleep button
   only? (Recommended: Sleep button only, so Home stays calm.)
3. **The night screen.** Strip it to the hero plus Loc only, hiding the chart and apps card after
   bedtime (recommended), or keep one layout all day?
4. **The morning reveal.** Make it a one-time card on Home, or a full-screen moment straight
   after the proof?
5. **HOME_SPEC.** Rewrite it around this doc and drop the "not a dashboard" language, since the
   chart is now in?

## Sources

These are the key URLs; the full citations are in the research transcripts.

- one sec, PNAS 2023: https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409
- RevenueCat, first-renewal churn: https://www.revenuecat.com/blog/growth/first-renewal-churn.md
- Duolingo streaks: https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- Duolingo widget: https://blog.duolingo.com/widget-feature/
- Broken streaks, Silverman & Barasch: https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch
- Gavriloff 2018 (feedback and fatigue): https://www.ndcn.ox.ac.uk/publications/854408
- Kovacs, "Not Now, Ask Later": https://arxiv.org/abs/2101.11743
- Opal home redesign: https://opalapp.com/blog/introducing-the-new-opal-home-screen-track-your-screen-time-and-improve-your-focus
- Opal Focus Score feedback: https://community.opalapp.com/t/new-home-focus-score-your-feedback/2014
- Oura Today tab: https://ouraring.com/blog/new-oura-app-experience/
- Brick: https://www.protectyoungeyes.com/devices/brick
- Gentler Streak: https://neura.health/insight/gentler-streak-app-hands-on-review
- Erly case study: https://superframeworks.com/case-study/erly
- MornDash: https://apps.apple.com/app/id6757863001
- Bevel: https://screensdesign.com/showcase/bevel-health-performance
- Finch: https://screensdesign.com/showcase/finch-self-care-pet
- Pokémon Sleep: https://www.nintendolife.com/reviews/mobile/pokemon-sleep
