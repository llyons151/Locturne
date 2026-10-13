# Locturne rating, 2026-10-13

The user asked for a 1–10 rating and what it takes to reach 10. It's based on GAME_PLAN.md,
docs/TODO.md, docs/DEVICE_SPIKE.md, the code, and web-preview screenshots of onboarding (14
steps), Home, Routine, Apps, You, the Sleep sheet and a list page.

## Overall: 7/10

The design, writing and logic are 8–9 level. The score is held down by things that can't be
seen in a screenshot: the lock hasn't been proven on a phone over several nights, and the app
can't be sold yet.

| Area | Score | Why |
| --- | --- | --- |
| Idea and positioning | 8.5 | One clear line ("no apps until you're out of bed"), a morning wedge Opal doesn't have. Groggy and BedLock have the same idea, so speed matters. |
| Onboarding | 8.5 | Their own times on every screen, the hours-a-week number, a dated trial timeline, hold to agree. Earlier rating stands: you barely see Loc. |
| Voice | 8.5 | Loc's lines are the brand and they're funny. |
| Main tabs | 7.5 | Clean and consistent, but each tab is a separate page you visit rather than one place the morning happens (docs/HOME_INTERACTIVE.md). Routine's speech bubble crowds the title. You is a long settings list. |
| Loc as a character | 6 | A still silhouette peeking at the bottom. The voice carries him; the visuals don't yet. |
| Engineering | 8.5 | 1,000+ tests, timezone sweeps, honest status. Solid foundations. |
| Proven on a device | ? | TODO.md still has the Step 1 gates open: blocks hold 3+ nights with the app closed, the 200-step unlock, revocation detected. |
| Ready to sell | 3 | Placeholder Expo icon, RevenueCat key is `REPLACE_WITH_…`, no App Store record or Paid Apps agreement, no TestFlight. |

## What a 10 takes, in order

1. **Prove the lock.** Run the Step 1 gates on the phone and log them in DEVICE_SPIKE.md: 3
   nights with the app closed, a real morning unlock by steps and by stairs, a revoke while
   the app runs. A blocker that fails once loses the customer (the GAME_PLAN gate is under 1
   missed night in 50). Nothing below matters until this passes.
2. **Stop adding features.** v1 already has five wake-up methods, limits, websites, naps,
   passes and an emergency unlock. Every one adds device-test surface for one person. Freeze
   scope until launch; new ideas go to v1.1.
3. **Make it sellable.** Icon and splash, the store setup in REVENUECAT_SETUP.md, the App Store
   record, the LLC/D-U-N-S path (LLC_PLAN.md), privacy labels, TestFlight.
   **Deadline: the App Launch featuring nomination by October 31** (EDGE_10K.md).
4. **Build the morning payoff.** The moment the apps wake up is the product's peak and its
   video. Give it a real success moment and the share card ("Bed 11:41. Downstairs 7:02.
   Still disappointed."). It's planned but not built.
5. **Put Loc on screen at the big moments.** Falling asleep at bedtime, grumbling awake in the
   morning, the onboarding hello. The SVG + Reanimated plan in LOC_SILHOUETTE.md, still a
   silhouette.
6. **Decide on the interactive Home** (HOME_INTERACTIVE.md). Doing the morning on Home is what
   would take the tabs from 7.5 to 9. The steps-only version is about a day.
7. **Small polish:** the Routine bubble overlapping its title; a VoiceOver pass on the device.
8. **Earn the 10 with numbers.** In the end a 10 means 20–50 TestFlight users where at least
   20% are still blocking at D30 and about 30% of trials pay (GAME_PLAN Gates). Those
   numbers will say more than another round of UI.
