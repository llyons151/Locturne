# Locturne: everything left to do

Compiled September 24, 2026 from [GAME_PLAN.md](../GAME_PLAN.md),
[ONBOARDING_CONVERSION.md](ONBOARDING_CONVERSION.md),
[MORNING_ANGLE.md](MORNING_ANGLE.md), [DESIRE_VALIDATION.md](DESIRE_VALIDATION.md)
the onboarding rating (7.5/10) and
[NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md) (September 27 research). GAME_PLAN stays the source of truth. Anything
marked *idea* isn't adopted until it's copied into GAME_PLAN.

Tick items off here as they're done.

## 1. Decisions only you can make

- [x] **Moving the goalposts:** *Decided 2026-10-01: all settings changes, loosening
  or tightening, apply from the next bedtime, with a plain note on the settings screen.* should changes that *loosen* the lock (removing apps,
  moving bedtime later, lowering the step target) only take effect the next night?
  Tightening would still apply instantly. That's how Erly handles it, and Phone
  Dashboard did the same in the Allcott 2022 trial. A study of 8,000+ HabitLab users
  (Kovacs 2021) found people drift to weaker settings whenever they can, so the
  research ranks this as the highest-value change. It conflicts with GAME_PLAN's
  rule that "the user controls the schedule at all times."
  ([MORNING_ANGLE.md](MORNING_ANGLE.md) #6; [NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md) Principle 2)
- [ ] **Stay-up rule:** do we build the two-part wake-up for v1 (100 steps, then 100
  more after about 10 minutes), or wait for concierge data?
- [ ] **Lead hook:** "My phone won't work until I get out of bed" or "I have to walk
  200 steps before TikTok works"? Settle it with concept videos.
- [ ] **Passes:** how many a month, and how long each one lasts.
- [ ] **Accessible alternative:** a non-walking way to wake him (not designed yet).
- [ ] **Step target:** is 200 right? It's a default to test, not a validated number.
- [x] **Wake-up methods:** *Decided 2026-10-01: "Go downstairs" (barometer, ≥2.5 m
  change in a live session) is the hero method, chosen in onboarding by "Are there
  stairs between your bed and your coffee?" right after `wake`. Steps and Scan are
  the alternatives.* Plan in [DOWNSTAIRS_METHOD.md](DOWNSTAIRS_METHOD.md) and
  [LAUNCH_PLAN.md](LAUNCH_PLAN.md) §2.
- [ ] **Build your own morning:** let users chain methods and set their own targets,
  places and per-day mornings on a "Your morning" screen, with onboarding still
  picking one default? The user asked for morning control on 2026-10-01; this is an *idea*
  until it's copied into GAME_PLAN. [WAKE_METHODS_100.md](WAKE_METHODS_100.md)
- [ ] **Microphone methods:** allow on-device sound checks (kettle, shower, flush)?
  They're cheatable with a recording. Decide alongside LAUNCH_PLAN D2 (camera).

## 2. Step 0: accounts and IDs (blocking everything native)

- [x] Finish Apple Developer Program enrollment. Team ID `9N5WZT8LV3` (2026-09-28).
- [x] Register the App ID, the three extension IDs and the App Group (2026-09-28).
- [x] Request Family Controls (Distribution). It's one request per developer
  account now, submitted 2026-09-28. See [ENTITLEMENT_SETUP.md](ENTITLEMENT_SETUP.md).
- [x] Apple's approval email arrived (by 2026-10-01).
- [x] Enable Family Controls (Distribution) on all four App IDs (2026-10-01).
- [x] Set `ios.bundleIdentifier` in `app.json` (`com.lukelyons.locturne`).
- [x] Configure EAS Build and the Screen Time extensions (2026-10-01, [DEVICE_SPIKE.md](DEVICE_SPIKE.md)).
- [x] First development build on the iPhone (EAS build `c26d2c10`; manual blocking works, [DEVICE_SPIKE.md](DEVICE_SPIKE.md)).
- [ ] Before launch: a USPTO class 9 trademark check on "Locturne", and a check that
  the social handles are free.

## 3. Step 1: device spike (about 2 weeks, before any more UI)

On a real iPhone, prove:
- [ ] Blocks apply at bedtime and hold for 3+ nights with the app closed.
  DeviceActivity schedules are chained in intervals under about 45 minutes. *Built 2026-10-03; the device run is still to do ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)).*
- [ ] The morning count (CMPedometer, not HealthKit) unlocks at 200 steps, from the
  shield tap or from opening the app. *Built 2026-10-03; the device run is still to do ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)).*
- [ ] Revoked Screen Time access is detected and shown plainly. *Built 2026-10-03; the device run is still to do ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)).*
- [ ] A nightly self-check confirms the shields actually applied. *Built 2026-10-03; the device run is still to do ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)).*
- [ ] Light anti-shake checks. *Built 2026-10-03; the device run is still to do ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)).*

If any of these fail, stop and redesign.

## 4. Onboarding (the preview in `src/features/onboarding/`)

Fixes that are still open from the rating:
- [ ] **Open the quiz with a morning question,** e.g. "When your alarm goes off,
  what do you grab first?" Present bedtime as the reason the morning works.
- [ ] **A live 20-step walk before the paywall,** with the Motion permission request
  framed around it, and showing that shaking the phone doesn't count. It replaces
  or follows the animated `tomorrow` demo.
- [x] **End onboarding on tomorrow morning:** "Tomorrow 7:00, TikTok stays asleep
  until you're up." *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [ ] **Make the reveal hit harder.** The 394-square grid is dense. Consider a
  separate morning number ("N minutes before your feet touch the floor").
- [ ] **Morning-first paywall timeline:** Tonight / Tomorrow 7:00 first walk /
  Day 5 reminder / Day 7 charge. Morning-first headline.
- [ ] *Idea:* a "what do you need before you're up?" step (authenticator, Slack,
  Maps, baby monitor), plus the line "Calls and texts still work. Your feeds don't."
- [ ] *Idea:* **an if-then plan screen** (about two taps). The user picks their own
  plan: "When I'm in bed and reach for my phone, I'll ___" (charger across the room
  / open my audiobook / lights off). He repeats it back at bedtime in week one. Two
  RCTs found if-then plans reduce bedtime procrastination (Valshtein 2020). Could
  pair with his line "When the alarm goes, you get up. Then we talk about TikTok."
  ([NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md) Principle 7)
- [ ] Less text-only: replace the text-only `deal` screen with a real screen
  recording of the lock and unlock once one exists.
- [ ] The "What have you tried?" answer only feeds the next screen. Use it again
  or accept that.

Needs the real app:
- [ ] StoreKit prices and intro-offer eligibility (all trial strings depend on it). *Paywall reads every price and trial string from `src/lib/purchases.ts`; a dev stub stands in until RevenueCat.*
- [ ] Real Restore, and live Terms and Privacy URLs. *Restore is wired to the purchases stub; `LEGAL_URLS` are placeholders.*
- [x] Real FamilyControls, CMPedometer and notification prompts. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Apple's `FamilyActivityPicker` in place of the preview chips. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Rewrite the copy that names picked apps (`commit`, `offer` timeline, paywall
  checklist, Share text). Tokens are opaque, so use a `Label(token)` icon row or
  "Your apps" / "N apps". ([ONBOARDING_CONVERSION.md](ONBOARDING_CONVERSION.md), Sept 26 review) *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Show "Armed" only once tonight's schedule is confirmed. If it can't be set,
  say so. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [ ] Real day-5 trial reminders, plus an in-app fallback when notifications are off. *Reminder scheduling built (`scheduleTrialReminder`); the in-app fallback isn't.*
- [ ] Teen child accounts, which need a parent to authorize Screen Time.
- [ ] The declined path: save the setup, arm nothing, and make at most one
  follow-up offer. The exit offer is now a 3-arm test (`EXIT_OFFERS`: none /
  half-price $29.99 / 14 days free at full price). The real app needs remote config to
  assign the arm, the $29.99 StoreKit product and a 14-day intro offer, and has to
  remember that the offer was shown. *Built: saves, arms nothing, one exit offer, remembered. Remote-config arm assignment waits for RevenueCat.*
- [ ] Send the `found` answer ("How'd you find me?") to analytics with the purchase event.
- [x] Ask for Motion & Fitness after purchase (the pre-paywall step test was removed). *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [ ] A VoiceOver pass on a real device.

## 5. Step 2: v1 app

- [x] Home states for night, morning and day. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Morning walk screen: live count with his lines. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] **A first-morning script for him,** plus a notification at the morning start
  time on day 1. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Custom shield text (small icon plus his line as the title). *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Always-blocked list (wins over the bedtime list). *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] Block now: pick apps and a duration, then go; built with naps (GAME_PLAN "Daytime controls"). Needs a device test.
- [x] Daily time limits per app (usage-threshold events), blocked until the next day once hit. Needs a device test.
- [x] Add Block now and daily limits to `lock-state.ts` with the precedence order, plus tests.
- [x] Budget DeviceActivity monitors (16 night + 1 nap + 3 limits) and tell the user when iOS refuses a limit.
- [ ] Device-test the overlap re-apply: a nap or limit ending mid-night must leave bedtime and always apps shielded.
- [ ] Per-rule shield text ("Daily limit used up") — iOS has one shield config for the app today. *Partly built: the app sets words per state, and the night windows carry a named bedtime shield. Limit and nap words with the app closed still use the last words written ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)).*
- [x] Removing apps from a limit (or the bedtime/always lists) waits for bedtime (2026-10-01). Apple's picker edits a draft; additions apply now, removals at the next bedtime, settled by the monitor extension or on app open. It also fixes removed apps staying shielded forever (iOS keeps one merged blocklist). Needs a device test.
- [x] Revoked Screen Time access is detected while the app runs (2026-10-01): besides the cached status, `getProtection` checks that an armed night still has its windows and that held lists have a shield up. Shown on the You and Apps tabs. Needs a device test.
- [x] Passes, the emergency unlock, and the accessible alternative. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] *Idea:* **a short delay and a "go back to sleep" button in front of every
  exit** (passes and the emergency unlock), one sec style. In the one sec trial the
  dismiss button did the work; the message alone did nothing (Grüning 2023).
  ([NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md) Principle 10) *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [ ] *Idea:* **a "can't sleep" path** on the shield or in the app, separate from
  passes, that never unlocks feeds. He gives the insomnia-therapy rule in his voice:
  get up, go to another room, do something quiet, come back when sleepy. Allowed
  apps (audiobook, podcast) are fine. If someone uses it often, point gently to real
  help (a doctor, or the free CBT-i Coach app). Some people scroll *because* they
  can't sleep, and a bare lock leaves them lying awake.
  ([NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md) Principle 4)
- [ ] *Idea:* **an optional wind-down lock** that starts 30 minutes before bedtime
  ("he gets sleepy before you do"). The best restriction studies used 30 min (He
  2020) and 60 min (Bartel 2019). Ship as an A/B test (see section 8).
  ([NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md) Principle 1)
- [x] Reliability checks and honest status ("Until then I'm just a raccoon"). *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [ ] Morning share card ("Bed 11:41. Up 7:02. 213 steps. Still disappointed.").
- [x] Settings: schedule, both app lists, step target. *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [x] A rating prompt after the first successful 200-step unlock (never in
  onboarding). *Built 2026-10-03 ([v1-build/INTEGRATION.md](v1-build/INTEGRATION.md)), needs a device test.*
- [ ] Analytics: D1, D7 and D30 walk completion, **the share of trial starters who
  complete a first walk** (the key activation metric), missed-block nights, and
  back-to-bed rate.

## 6. v1.1 (only after real users)

- [ ] A real alarm (AlarmKit) to lead with the morning.
- [ ] Streak widget, and Loc's moon in the Dynamic Island while apps sleep
  ([LIVE_ACTIVITY_IDEA.md](LIVE_ACTIVITY_IDEA.md)).
- [ ] Buddy/couples mode (a message to a partner, no money).
- [ ] Scheduled naps, and "put him to bed early" ("tuck him in now" moved to v1 as Block now).
- [ ] *Idea (Oct 1):* **"Loc naps while you work"**, i.e. block apps while you're at
  your laptop. Real distance sensing doesn't work well: Bluetooth signal strength is
  unreliable, Macs have no UWB, and background BLE needs a Mac app plus location
  permission. The clean route is a **Focus filter**: turning on a "Work" Focus on
  the Mac syncs to the iPhone (Share Across Devices), which runs Locturne's Focus
  filter intent in the background and starts a nap. A Mac Focus can switch on
  automatically when an app like VS Code opens. It's off the morning wedge, so
  after launch only, as a nap trigger.
- [ ] An opt-in "went to bed earlier" dataset.
- [ ] Viral ideas to test: his voice as real audio, roasts when the anti-shake check
  catches cheating, "excuse court" for passes, and a falling-asleep goodnight.

## 7. Marketing (starts once the app is polished, decided 2026-10-01)

- [ ] A waitlist page, once the morning flow works with real UI (target mid-November).
- [ ] 20–30 videos of the real app across angles, morning-first. Watch for "what app is
  this?" comments and sign-ups.
- [ ] Safe stats for hooks: 85% check their phone within 10 minutes of waking, and
  60% of under-30s do so always or often. Use the "47 seconds" and "68% override"
  stats only in hooks, attributed, never in the store listing.
- [ ] App Store copy says "your apps", not "your phone", and makes no health claims.
- [ ] At launch: daily founder videos on 2–3 accounts, plus paid niche creators at
  $2–3 CPM. Measure payers per 1K views.

## 8. Launch gates (TestFlight, 100–300 users)

- [ ] D30: at least 20% still have blocking active.
- [ ] Fewer than 1 in 50 nights with a missed block.
- [ ] About 30% or more of trials become paid subscriptions.
- [ ] Then the A/B tests, in order: trial vs none, price ($39.99 vs $59.99, then fine-tune around the winner),
  the loader, notifications before vs after the paywall, personalized headline.
- [ ] A/B test the wind-down lock: at bedtime vs 30 minutes before. Judge on lock
  adherence and D30.

## 9. Doc housekeeping

- [x] GAME_PLAN says "Early"; the app is **Erly**. (Fixed 2026-10-01.)
- [x] [SETUP.md](../SETUP.md) says "there is no app code yet", which is out of date. (Fixed 2026-10-01.)

## 10. Wake-up method backlog (ideas, logged 2026-10-01)

All 100 methods from [WAKE_METHODS_100.md](WAKE_METHODS_100.md), with how each is
proven. Type: P = practical, M = marketing. None is adopted beyond the three v1
methods until it's copied into GAME_PLAN. The shortlists are at the end of that doc.
Code methods (D) can be filmed for marketing before launch.

**A. Height (barometer, `CMAltimeter`)**

- [ ] 1. Go downstairs (P+M; OK (v1 hero))
- [ ] 2. Go upstairs (ground-floor bedrooms) (P; OK)
- [ ] 3. Stair reps: down, up, down again (M; OK)
- [ ] 4. Lobby run (apartments) (P+M; OK)
- [ ] 5. Climb the building (M; OK)
- [ ] 6. Downstairs speedrun (M; OK)
- [ ] 7. Basement / laundry run (P; OK)
- [ ] 8. Downstairs and stay there (P; OK)

**B. Walking and movement (`CMPedometer`, `CMMotionActivity`, GPS)**

- [ ] 9. Walk it off (200 steps) (P; OK (v1))
- [ ] 10. Pick your number (500 / 1,000 steps) (P; OK)
- [ ] 11. Brisk minute (P; OK)
- [ ] 12. Two-part wake (P; OK)
- [ ] 13. Morning jog (P+M; OK)
- [ ] 14. Walk the dog (P+M; OK)
- [ ] 15. End of the street (P; OK)
- [ ] 16. Out and back (P; OK)
- [ ] 17. Sunrise walk (M; OK)
- [ ] 18. Bike ride (P; OK)
- [ ] 19. Commute unlock (P; OK)
- [ ] 20. Run a kilometre (P+M; OK)
- [ ] 21. Apple Watch steps (phone stays on the nightstand) (P; Hardware)
- [ ] 22. Wheelchair pushes (P; Hardware; a real accessibility option)
- [ ] 23. Walk with Loc (M; OK)
- [ ] 24. Steps, phone held upright (P; OK)

**C. Places (geofences, Wi-Fi, map points)**

- [ ] 25. Leave the house (P; OK)
- [ ] 26. Coffee shop unlock (M; OK)
- [ ] 27. Gym check-in (P+M; OK)
- [ ] 28. Campus arrival (P; OK)
- [ ] 29. Office arrival (P; OK)
- [ ] 30. Touch grass (M; OK)
- [ ] 31. Station or bus stop (P; OK)
- [ ] 32. Your landmark (P; OK)
- [ ] 33. Loc's pick (M; OK)
- [ ] 34. Friend's door (P+M; OK)
- [ ] 35. Out of Wi-Fi range (P; Weak (range varies))
- [ ] 36. Kitchen Wi-Fi node (P; Weak (mesh roaming is fickle))
- [ ] 37. Bakery run (M; OK)

**D. Codes (camera barcode scan, the v1 "Scan your code" family)**

- [ ] 38. Scan your code (P; OK (v1))
- [ ] 39. Coffee bag barcode (P; OK)
- [ ] 40. Daily tear-off codes (P; OK)
- [ ] 41. Scavenger chain (M; OK)
- [ ] 42. Random room (P+M; OK)
- [ ] 43. Partner hides it (M; OK)
- [ ] 44. Code in the shower (M; OK)
- [ ] 45. Bathroom mirror (P; OK)
- [ ] 46. Inside the fridge (P+M; OK)
- [ ] 47. In the freezer (M; OK)
- [ ] 48. Feed the pet (P+M; OK)
- [ ] 49. Raccoon bin run (M; OK)
- [ ] 50. Front door, outside (P; OK)
- [ ] 51. In the car (P; OK)
- [ ] 52. The kettle (P; OK)
- [ ] 53. Toothpaste barcode (P; OK)
- [ ] 54. Water the plant (M; OK)
- [ ] 55. Cereal box (M; OK)
- [ ] 56. Medication reminder (P; OK)

**E. Body (sensors, no camera)**

- [ ] 57. Proximity push-ups (P+M; OK (no camera; still check D2))
- [ ] 58. Jumping jacks (P+M; Weak (pattern can be faked))
- [ ] 59. Squats (P; Weak)
- [ ] 60. Jump rope (M; Weak)
- [ ] 61. Dance break (M; Weak)
- [ ] 62. Heart rate up (P; Hardware)
- [ ] 63. Boss mode (P; OK)

**F. Camera with on-device vision**

- [ ] 64. Push-ups on camera (M; Decision)
- [ ] 65. Sun salutation (M; Decision)
- [ ] 66. AR kitchen (P+M; Decision; high build cost)
- [ ] 67. Find Loc in AR (M; Decision)
- [ ] 68. LiDAR room match (P; Decision; Pro phones only)
- [ ] 69. Daylight at the window (P; Decision; Weak)
- [ ] 70. Sky check (M; Decision)
- [ ] 71. Say hi to the pet (M; Decision)

**G. Sounds (on-device `SoundAnalysis`)**

- [ ] 72. Flush to unlock (M; Decision; Weak)
- [ ] 73. Kettle on (P+M; Decision; Weak)
- [ ] 74. Coffee grinder (P+M; Decision; Weak)
- [ ] 75. Wash your face (P; Decision; Weak)
- [ ] 76. Shower on (M; Decision; Weak)
- [ ] 77. Cook breakfast (M; Decision; Weak)
- [ ] 78. Birdsong (M; Decision; Weak)
- [ ] 79. Smoothie (M; Decision; Weak)
- [ ] 80. Brush your teeth (P; Decision; Weak)

**H. Smart home and devices**

- [ ] 81. Open the fridge (P+M; Hardware)
- [ ] 82. Kitchen motion (P; Hardware)
- [ ] 83. Hit the light switch (P; Hardware)
- [ ] 84. Kettle drawing power (P; Hardware)
- [ ] 85. Kitchen speaker (P; Weak (range))
- [ ] 86. Kitchen beacon (P; Hardware)
- [ ] 87. Step on the scale (P; Hardware)
- [ ] 88. Phone sleeps in the kitchen (P+M; OK; a big existing trend)
- [ ] 89. AirPods upright (P; Weak)

**I. People**

- [ ] 90. Housemate code (P+M; OK)
- [ ] 91. Wake-up buddy (M; OK)
- [ ] 92. Family mode (P; OK; a later product)
- [ ] 93. First one down (M; OK)
- [ ] 94. Walk together (M; OK)

**J. Ways to mix methods**

- [ ] 95. Roll the dice (M; OK)
- [ ] 96. Weekday / weekend (P; OK)
- [ ] 97. Travel mode (P; OK)
- [ ] 98. Seasons (P; OK)
- [ ] 99. Loc's choice of room (P; OK)
- [ ] 100. Accessible pick (P; OK; needs real user testing)
