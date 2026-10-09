# Product edges, platform shifts and moat

Written 2026-10-08. Part of the "edge to $10K MRR" study. This file covers one angle:
product-level edges and platform changes that could make Locturne harder to copy
or viral by design. It does not repeat GAME_PLAN, 10K_MRR_PLAN §4,
STAND_OUT_ANGLES, WIDGETS, LIVE_ACTIVITY_IDEA or LIFE_TASK_UNLOCKS.

**Labels.** **V** = checked at a primary source (Apple, Google, the company's own
page). **S** = one secondary or self-reported source. **U** = unverified, or my
inference. Opinions are marked [OPINION].

**Research limits.** The shared web-search budget ran out after about 25 searches,
so a few points (Group Purchases launch date, Finch's social numbers, Android
barometer share) could not be checked further. They are marked U.

---

## 1. Short version

- **Nothing in iOS 27 sherlocks Locturne.** Apple's 2026 Screen Time work is for
  parents (Time Allowances, Schedules, Ask to Browse). Adults still get "Ignore
  Limit". iOS 27 adds no sleep, alarm or morning-lock feature. **V/S.**
- **The Screen Time APIs didn't change either.** DeviceActivity is still unreliable
  and there's still no event-based unlock. That keeps reliability a real edge for
  whoever does the hard work. **S.**
- **Four new Apple features are worth being early on.** None is an "Erly on
  AlarmKit" window by itself, but together they're cheap and new:
  1. **Group Purchases**: one person buys seats and invites others, with Apple
     handling the invite (launches "this winter"). It's a ready-made partner plan.
     **V/S.**
  2. **Retention Messaging**: a custom message and offer on Apple's cancel screen,
     including trial cancels. **V/S.**
  3. **Live Activities in iOS 27** show in StandBy and the landscape Dynamic Island,
     and appear on Apple Watch automatically. **V.**
  4. **Free Apple Foundation Models on Private Cloud Compute** for Small Business
     Program apps under 2M downloads. AI costs nothing to run. **V.**
- **Built-in virality didn't build this category.** Erly reached about $50K a month
  with no in-app referral feature at all. Paid creators filming the demo did it.
  **S.** Social features help mainly with **retention**: Duolingo says Friend
  Streaks make a daily lesson 22% more likely. **V.** A single referee about doubles
  goal success in stickK's self-reported data. **S.**
- **The social fit is one person, not a squad.** A "wake buddy" (one friend or
  partner who gets a cheerful "Sam's up" from Loc) has the best evidence and no
  shaming. Leaderboards and "who got up first" squads are crowded and weak.
- **Android: not in year one.** Android converts installs to paid at about a third
  of iOS's rate (0.9% vs 2.6%). **V.** Play policy pushes blockers away from
  Accessibility. **V.** The hero barometer method is mostly on pricier Android
  phones. **S.** Put a waitlist on the website instead.
- **The tech is not the moat.** Walk-to-unlock is already a crowded indie category
  (7+ apps), and a barometer check is a few days of work for anyone. What's hard to
  copy is Loc, a reputation for never failing silently, the founder's video reach,
  and (if built) pair links between users.

---

## 2. Platform shifts in 2026

### 2.1 What Apple shipped

| Area | What changed | Effect on Locturne | Label |
|---|---|---|---|
| **Screen Time (user side)** | iOS 27 added Time Allowances (category budgets), Schedules, Ask to Browse and a redesigned dashboard, all aimed at **parents managing children**. | No overlap with an adult's own morning lock. Parents may see Apple as "enough" for kids; Locturne doesn't target kids. | V ([Apple newsroom, June 2026](https://www.apple.com/newsroom/2026/06/apple-unveils-next-generation-of-apple-intelligence-siri-ai-and-more/); [Apple dev news, Jun 8](https://developer.apple.com/news/)) |
| **Adult self-limits** | "Ignore Limit" still dismisses an adult's own limit in one tap. | Apple's own tool stays easy to beat, which is Locturne's reason to exist. | S ([Habit Doom, Jul 30 2026](https://habitdoom.com/blog/ios-27-screen-time-changes)) |
| **FamilyControls / DeviceActivity / ManagedSettings** | No meaningful change. Long-window reliability, readable shield state and event-based unlocks were not added. | Every blocker still fights the same bugs. Locturne's self-checks and "never fail silently" stay a real advantage. | S ([Habit Doom, Jun 9 2026](https://habitdoom.com/blog/wwdc-2026-screen-time-wishlist)) |
| **New age APIs** | Declared Age Range broadened; new PermissionKit with a Significant Change API. Since July, the App Store age-rating form asks about social-media features. | Only relevant if Locturne adds social features (answer the questionnaire honestly). | V ([Apple dev news](https://developer.apple.com/news/)) |
| **Sleep / Health** | watchOS 27 added Recovery HRV and a 0–10 **Readiness score** that uses the sleep score. The Health app suggests things like "improve a wind-down routine after a stretch of late nights". No alarm, Focus or morning-lock feature. | Apple is pushing into sleep *advice*, not app blocking. The "For You" wind-down nudge is the nearest thing to overlap. | V ([Apple newsroom, Sep 9 2026](https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/)) |
| **Sleep score API** | No developer API for Apple's sleep score was found. | Can't show Apple's score in Locturne. Fine: sleep stats are out of scope anyway. | S ([9to5Mac](https://9to5mac.com/2025/07/23/ios-26-code-hints-at-a-sleep-score-feature-for-apple-watch/), dev forum) |
| **Wake detection** | Apple DTS says there's no real-time "user woke up" callback. Apps can observe HealthKit sleep data written when the Watch ends a sleep session, or watch Sleep Focus turn off via `INFocusStatusCenter`. | A possible soft signal ("Loc noticed you're awake") but never proof of being up. Keep the sensor proof. | V ([Apple forum, DTS reply](https://developer.apple.com/forums/thread/834573)) |
| **AlarmKit** | No new iOS 27 AlarmKit API found; a beta bug report about deferred `alarmUpdates`. | The AlarmKit first-mover window closed in 2025 (Erly, then Anchor and Clockblock). Still worth adding as table stakes. | S ([Apple forum](https://developer.apple.com/forums/thread/844479)) |
| **Live Activities** | iOS 27: visible in the Dynamic Island in portrait **and landscape**, in **StandBy**, and automatically on **Apple Watch Smart Stack**, Mac menu bar and CarPlay. Can be scheduled to start at a set time. | The LIVE_ACTIVITY_IDEA plan now also puts Loc on the nightstand (StandBy) and the wrist for free. Bigger reason to do it early. | V ([WWDC26 session 223](https://developer.apple.com/videos/play/wwdc2026/223)) |
| **Foundation Models** | Rebuilt on-device model; images in prompts; a protocol that also fits Claude or Gemini. **Small Business Program apps with under 2M first-time downloads get Apple's larger Private Cloud Compute model at no API cost.** | Personalised Loc text (report cards, excuse-court rulings) can cost $0 to run. Evidence for AI features is mixed (§5). | V ([Apple "What's new in iOS 27"](https://developer.apple.com/wwdc26/guides/ios/)) |
| **App Intents / Siri** | Intent schemas with no fixed phrases; Siri AI "systemwide app actions". | "Hey Siri, how long till my apps wake up?" becomes cheap. Nice, not a growth lever. | V (same page) |
| **Subscriptions** | **Group Purchases** (one subscriber buys seats and invites others; Apple runs the invite; "this winter"). **Retention Messaging** (custom message, image and offer on the cancel screen; fall 2026; request-only API for now). **Bundles** across up to 5 developers; **Suites**. 12-month commitment plans (not in the US). | Group Purchases = a partner/roommate plan with no backend. Retention Messaging = Loc talks to people as they cancel the trial. Bundles = a possible cross-promo with a complementary indie (an alarm or study app). | V/S ([Apple dev news](https://developer.apple.com/news/); [Apple Bundles page](https://developer.apple.com/app-store/subscriptions/bundles-and-suites/); [MacRumors, Jun 11](https://www.macrumors.com/2026/06/11/apple-introduces-app-store-subscription-overhaul/); [RevenueCat docs](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-retention-messaging-api)) |

### 2.2 Sherlock risk

- **Today: low.** Apple shipped big Screen Time changes this year and none of them
  touched adults' mornings. **V.**
- **The plausible future sherlock** is a Sleep Focus option like "keep Downtime on
  until I've walked N steps" or "until Sleep Focus ends". Apple already has every
  part (Sleep schedule, Downtime, step count). Nothing points to it. **U.** The
  earliest it could arrive is WWDC 2027 (June), shipping September 2027.
- **Even then,** Apple's own limits have an "Ignore Limit" button and no
  personality. Sherlocked categories (flashlights, timers) were single-function
  utilities. Locturne's defence is to be a character and a habit, not a switch.
  [OPINION]

### 2.3 Where a fast mover can be "first" (ranked [OPINION])

| Opportunity | Ready when | Why it matters | Effort |
|---|---|---|---|
| **Partner seats via Group Purchases** | "This winter" (U on exact date) | Lines up with a January launch and New Year resolutions. Apple-run invites mean no referral backend. New StoreKit features are often shown in App Store editorial (U). | 2–3 days once Apple opens it |
| **Retention Messaging in Loc's voice** | Fall 2026; API is request-only | Shows on Apple's cancel screen, so it reaches trial cancellers on day 5–7, exactly where a hard paywall leaks. | 1–2 days + Apple approval |
| **Live Activity on StandBy + Watch** | Now (iOS 27) | Nightstand and wrist are where the user is at bedtime and at wake. Filmable. | Per LIVE_ACTIVITY_IDEA, 5–8 days |
| **Free cloud model for Loc's report card** | Now (iOS 27, eligible apps) | Personal monthly text at $0 cost. | 3–5 days |

---

## 3. Built-in virality: what actually worked

### 3.1 The evidence

| Mechanic | Evidence | Label |
|---|---|---|
| **Paid creators filming the demo** | Erly: $0 → $50K a month in four months. No in-app referral, invite or share feature; growth came from TikTok/Instagram creators at $2–3 CPM. | S ([Superframeworks case study](https://superframeworks.com/case-study/erly)) |
| **Friend streaks (pairs, small groups)** | Duolingo: learners with at least one Friend Streak are **22% more likely** to do their daily lesson, rising with more friends. Capped at 5. The hardest step was getting people to send the **first invite**. | V, company data ([Duolingo blog](https://blog.duolingo.com/product-lessons-friend-streak/)) |
| **A referee** | stickK: success 29% with no referee or stakes, 59% with a referee (self-reported, 2012). Warning from the founder: partners as referees sometimes "colluded" with the user. | S ([summary of NYT/stickK](https://goodmedicine.org.uk/blog/commitment-contracts-they-really-can-help-us-achieve-personally-difficult-goals)) |
| **Referral reward** | Opal: refer 5 friends who sign up → 1 year of Pro free; 50 → lifetime; invitee gets a 30-day trial. No published results. | V ([Opal help](https://opalapp.com/help/how-to-invite-friends-or-family-to-opal)) |
| **Friend leaderboards** | Opal (contacts-based, both must have opened Opal in the last 24 hours) and Jomo Squads have them. Many 2025–26 indie screen-time apps built around friends (Orbit, Limito, Screen Freedom) show single-digit ratings. | V/S ([Opal help](https://opal.so/help/how-to-invite-friends-or-family-to-opal); store pages) |
| **Social alarms** | "Friends see when you wake up" apps (Sleep Keeker, Wake N Shake 2012, Wake With Friends 2014) never broke out. 2026 versions (Snooze Squad, Sleepy Family) have almost no ratings. | S (old press; store pages) |
| **Synchronized daily social posting** | BeReal fell from ~73M MAU (2022 peak) to the mid-teens of millions by 2024–25 (third-party estimates, disputed by BeReal). A daily social ritual can spike then decay. | S ([PetaPixel](https://petapixel.com/2023/02/22/bereal-may-be-on-the-out-users-have-nearly-halved-since-peak); aggregators) |
| **Personal year/month recap** | Spotify Wrapped 2025: 200M users engaged in 24 hours; 500M+ shares on day one (counts include in-app shares and downloads). | S ([Music Week](https://www.musicweek.com/digital/read/spotify-wrapped-2025-was-biggest-ever-with-200-million-engaged-users/093178)) |
| **Widget-as-social-surface** | Locket: ~9M daily users (Aug 2025), profitable with 14 people, growth from friends' photos on each other's home screens. | S ([TechCrunch](https://techcrunch.com/2025/08/06/photo-sharing-app-locket-is-banking-on-a-new-celebrity-focused-feature-to-fuel-its-growth)) |
| **K-factor benchmarks** | Typical referral programs: K ≈ 0.15–0.25 (vendor content, no disclosed sample). No credible subscription-app benchmark found. | U ([ReferralCandy](https://www.referralcandy.com/blog/referral-program-benchmarks-whats-a-good-conversion-rate-in-2025)) |
| **Family Sharing** | An auto-renewable subscription can be shared with up to 5 family members. Turning it on in App Store Connect **can't be undone**. | V ([Apple subscriptions page](https://developer.apple.com/app-store/subscriptions/)) |

### 3.2 What this means for Locturne [OPINION]

- **Don't expect a viral loop to replace creators.** Nothing in this category grew
  from an in-app loop. Plan K ≈ 0.1. Treat social features as **retention and
  conversion** tools that also produce a few free installs.
- **Pairs beat groups.** Duolingo found the first invite is the bottleneck; stickK
  shows one referee is enough. Squads and leaderboards add comparison (and shame)
  without much evidence.
- **Only share good news.** "Sam's up. Downstairs at 7:12." is fine. "Sam is still in
  bed" is a public shaming feed; it breaks the "strict, never shames" rule and the
  GAME_PLAN ban on guilt mechanics. A missed morning stays private.
- **The partner already has a role.** STAND_OUT §8 / 10K plan §4 already suggest a
  partner holding the Screen Time passcode. A wake buddy uses the same person.
  Watch the stickK warning: a partner can collude. Locturne's sensor proof is
  the fix (the buddy can't wave you through).

### 3.3 Mechanics that fit, without shaming

| Mechanic | How it would work | Shame risk | Notes |
|---|---|---|---|
| **Wake buddy (1:1)** | Invite one person. When your apps wake, Loc sends them a push: "Sam's up. 200 steps, 7:12. Respect." They can tap one reaction back. Nothing is sent on a missed morning. | Low | Needs a tiny backend (Cloudflare Worker + push). The buddy doesn't need to subscribe; the invite is the install. |
| **Partner seats** | When Apple's Group Purchases opens: "Locturne for two" with Apple-run invites. Until then, Family Sharing or a referral code. | None | Cheapest pair growth. Price it so a pair pays more than one person (e.g. $79.99 for two) [OPINION]. |
| **Give a month / get a month** | Offer codes (Apple's one-time 18-digit codes or a custom code). Share link from the share card. | None | Opal-style. Small but nearly free. |
| **Monthly report card** | Already proposed in STAND_OUT §7. Wrapped is the evidence. Make it a 9:16 image in Loc's voice. | Low if it only celebrates | Highest-reach, cheapest social feature. |
| **Roommate/dorm "who got up first"** | 2–5 people, first up wins the day. | Medium (last place is visible) | Fits the student beachhead and filming, but GAME_PLAN excludes squads. Park it. |

---

## 4. Android

### 4.1 The facts

| Question | Answer | Label |
|---|---|---|
| Who's on iPhone? | 87% of US teens own an iPhone (Piper Sandler, fall 2025). The figure has held at 87–88% for years; the survey may under-sample low-income teens. | S ([AppleWorld.Today](https://appleworld.today/2025/10/survey-eighty-seven-percent-of-teens-report-they-own-an-iphone/)) |
| Does Android pay? | Median download-to-paid by day 35: **0.9% on Android vs 2.6% on iOS**. Trial-to-paid is the same (32.5% vs 32.6%). The gap is fewer Android users starting trials. Google Play sends no trial-ending reminder. | V ([RevenueCat, Mar 2026](https://www.revenuecat.com/blog/engineering/android-paywall-gap)) |
| Can you block apps on Android? | Yes, more freely than iOS. Two routes: Accessibility service (powerful, but Play requires a declaration, prominent disclosure and consent; non-accessibility apps are told to use narrower APIs; can't block uninstall except for parental control) or UsageStats + overlay + a `specialUse` foreground service. Android 15 tightened background starts and overlay-linked services. Android 17's Advanced Protection mode blocks non-accessibility apps from the Accessibility API. | V ([Play policy](https://support.google.com/googleplay/android-developer/answer/16585319)); S ([dev write-up](https://dev.to/rexa/how-to-block-apps-on-android-without-an-accessibilityservice-5gog), [Android docs](https://developer.android.com/guide/components/activities/background-starts)) |
| Reliability? | Background services get killed by some OEMs (Samsung, Xiaomi) unless battery optimisation is off. | S ([ProAndroidDev](https://proandroiddev.com/beyond-doze-building-reliable-background-execution-on-modern-android-including-oem-realities-5fa0a6e05672)) |
| Barometer? | Mostly on more expensive Android phones; no reliable share found. Step counters are near-universal. | S/U ([phyphox wiki](https://phyphox.org/wiki/index.php/Sensor:_Pressure)) |
| Competition? | Android already has many strong blockers and Alarmy (which uses Accessibility to keep its dismiss screen up). | S |

### 4.2 Cost with Expo [OPINION]

- The React Native screens, copy and lock-state rules (`src/lib/lock-state.ts`) carry
  over. Maybe 60–70% of the app.
- Everything that makes the product work is native and iOS-only today: three Swift
  modules (~570 lines) and four extension targets (DeviceActivity monitor, shield
  action, shield config, report). Android has no equivalent of shields or
  DeviceActivity, so it's a new design, not a port: a foreground service, an
  overlay block screen, alarms for bedtime/morning, a step counter and a
  barometer path.
- Estimate: **20–30 dev days** for a reliable v1, plus OEM testing on hardware the
  founder doesn't own, plus Play review of the permission declarations. Then
  every feature is built twice.

### 4.3 Verdict

**Not in year one.** The audience is ~87% iPhone, Android pays about a third as well
per install, the hero method is weaker on cheap phones, and reliability (the
brand promise) is harder. The time is worth more as content and iOS polish.
**Cheap hedge:** an "Android? Join the waitlist" link on the website and in video
pinned comments (about 1 day). Revisit if the waitlist passes ~2,000 or MRR passes
~$5K. [OPINION]

---

## 5. Data and AI edges

| Idea | Evidence | Verdict [OPINION] |
|---|---|---|
| **Monthly report card (personal stats in Loc's voice)** | Wrapped's reach (§3.1). Locturne already stores lock/unlock times, wake method and edit attempts on-device. | **Do it.** Template first; the free Apple model can add a personal line later. |
| **AI-written Loc lines** | RevenueCat 2026: AI apps earn 41% more first-year value per payer ($30.16 vs $21.37) but retain worse (annual retention 21.1% vs 30.7%). That's about AI-*product* apps, not a mascot feature. Apple's cloud model is free for eligible apps. | **Small, optional.** Keep the written line bank as the backbone (GAME_PLAN, repeat guard). Use AI only where a template can't personalise (report card, excuse court), with a template fallback. AI tone slips are a brand risk. ([PPC Land on RevenueCat](https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/)) |
| **Loc speaks out loud** | No direct evidence that a spoken mascot lifts retention. Pre-recorded voice lines on the shield/walk screens would help video, since creators' videos need sound. | **Test later as pre-rendered audio**, not live TTS. Low cost, medium video value. U |
| **Personalised sleep insights / scores** | Apple now does Readiness and wind-down suggestions for free (§2.1). Sleep scores are out of scope in GAME_PLAN. | **Skip.** Apple owns this. |
| **Journaling** | No evidence it fits a morning blocker; adds a task at the moment users want less. | **Skip.** |
| **Own data as a moat** | Nightly outcomes (which method, how long to get up, which bedtimes stick) could tune defaults and become a "Locturne users get up 23 minutes sooner" claim. STAND_OUT §6 covers the study idea. | **Weak moat, good marketing.** Collect opt-in, aggregate only. |
| **Sleep Focus / Watch wake signal** | Possible via `INFocusStatusCenter` or a HealthKit observer (§2.1). | **Use as a nudge, never as proof.** Small. |

---

## 6. Moat: what a funded rival copies in a week vs what's hard

| Feature or asset | Copy time for Opal / Alarmy / Erly | Why |
|---|---|---|
| Walk 200 steps to unlock | Days | Already 7+ "walk to unlock" apps (Walkaway, Socky, LimitFit, StepScroll…) and Alarmy's steps mission. **S** ([store pages](https://apps.apple.com/app/id6779288153)) |
| Block apps until the wake mission is done | Days | Wakn Up (Mar 2026) and Push Clock already do it. **S** |
| Barometer "go downstairs" | ~1 week | CMAltimeter is a public API. The edge is being first and owning the demo in video, not the code. |
| Passes, "edits wait until next bedtime" | Days | Anchor already has both. |
| Share card | Days | Commodity. |
| Bedtime + morning in one loop | 1–3 weeks for Opal | Opal has Sleep Time and Morning Assist; adding "until you walk" is small for them. **Biggest copy risk.** [OPINION] |
| **Loc (character, voice, 1,000+ written lines, consistent personality)** | Months, and it looks derivative | Finch, Duolingo and Focus Friend show attachment to a character builds over time and a copy reads as a knock-off. Opal's brand is calm focus; a sassy raccoon doesn't fit it. |
| **"Never fails silently" reputation** | Months to years | DeviceActivity is still flaky in iOS 27 (§2.1). Reviews accumulate slowly; ~16% of the category's bad reviews are about silent failures (10K plan §4). |
| **Founder distribution** | Not copyable | ~1M views track record; a face and voice that are the brand. Erly shows the channel matters more than the feature. |
| **Pair links (wake buddies, partner seats)** | Network effect per pair | Weak overall, but each linked pair has a switching cost: leaving means telling your buddy. |
| **Opt-in outcome data / a small study** | 6–12 months | Only matters as a marketing claim. |

**Bottom line [OPINION]:** treat features as rented, not owned. Ship them early and
make them look good on camera. Spend real effort only on the things in bold:
Loc, reliability, the founder's videos, and pair links.

---

## 7. Ranked product bets

Assumptions: $59.99/yr, ~85% net after Apple → about $4.25 MRR per annual
subscriber, so **$10K MRR ≈ 2,350 active subscribers**. Impacts are rough
[OPINION] ranges, not forecasts. "Conflicts" means a GAME_PLAN rule would need
the founder's sign-off.

| # | Bet | Dev days | Evidence | Expected MRR impact | Notes |
|---|---|---|---|---|---|
| 1 | **Retention Messaging + win-back offers in Loc's voice** ("Before you go: I'll do it for $39.99 this year.") | 1–2 + Apple approval | V that it exists and shows on the cancel screen; no published lift numbers | +2–5% trial-to-paid → ~+$200–500 at $10K scale | Cheapest bet. Request API access now. |
| 2 | **Wake buddy (1:1, good news only)** with an invite link that also gives the buddy a longer trial | 6–9 (backend on Cloudflare, push, invite deep link) | Duolingo +22% daily action (V); stickK referee ~2× (S) | Retention +5–10%, plus K ~0.05–0.1 from invites → ~+$500–1,000 | Pairs aren't squads, but get sign-off: GAME_PLAN bans squads/leaderboards. |
| 3 | **Partner seats ("Locturne for two")** via Group Purchases when Apple opens it; Family Sharing as a fallback decision | 2–3 when available | V that Group Purchases is coming; launch date U | +3–8% revenue per payer from pairs → ~+$300–800 | Family Sharing is irreversible: decide carefully. |
| 4 | **Monthly report card (Wrapped-style 9:16 image)** | 3–4 on-device; +2 for an AI line | Wrapped (S); already in STAND_OUT §7 | Mostly free reach: a few % more installs → ~+$200–500 | Celebrate only. Ship by end of first month after launch. |
| 5 | **Live Activity from bedtime to wake, now also on StandBy + Apple Watch** | 5–8 (per LIVE_ACTIVITY_IDEA) | V that iOS 27 puts it on StandBy and Watch; retention lift U | Retention + a filmable nightstand shot → ~+$200–600 | Already planned for v1.1; iOS 27 makes it worth more. |
| 6 | **Give a month / get a month (offer codes)** | 3–5 | Opal runs one (V); typical K 0.15–0.25 (U) | ~+$100–400 | Do after #2; shares the invite plumbing. |
| 7 | **Android waitlist (not the app)** | ~1 | RevenueCat 0.9% vs 2.6% (V); 87% teen iPhone (S) | $0 now; tells you if Android is ever worth 20–30 days | Full Android port: no, in year one. |
| 8 | **Free Apple cloud model for personal Loc lines** | 3–5 | V it's free; AI-feature retention evidence is negative-to-mixed | Small, ~$0–200 | Only after the line bank is solid. Template fallback always. |

**Do first:** #1 (tiny, request access now), #4 and #5 (cheap, filmable), then #2
and #3 together around the New Year launch window. Skip leaderboards, journaling,
sleep scores and Android in year one.

---

## Sources

Apple (primary)
- Apple newsroom, WWDC26: https://www.apple.com/newsroom/2026/06/apple-unveils-next-generation-of-apple-intelligence-siri-ai-and-more/
- Apple newsroom, health features (Sep 9 2026): https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/
- Apple Developer news (Time Allowances, subscriptions, age-rating form): https://developer.apple.com/news/
- What's new in iOS 27 (Foundation Models, App Intents, widgets): https://developer.apple.com/wwdc26/guides/ios/
- WWDC26 Live Activities essentials (session 223): https://developer.apple.com/videos/play/wwdc2026/223
- Bundles and Suites: https://developer.apple.com/app-store/subscriptions/bundles-and-suites/
- Subscriptions (Family Sharing, offer codes, win-back): https://developer.apple.com/app-store/subscriptions/
- Apple forums, wake detection (DTS reply): https://developer.apple.com/forums/thread/834573
- Apple forums, AlarmKit iOS 27 beta: https://developer.apple.com/forums/thread/844479

Google (primary)
- Play policy, Accessibility API: https://support.google.com/googleplay/android-developer/answer/16585319
- Android background activity starts: https://developer.android.com/guide/components/activities/background-starts

Secondary
- MacRumors, subscription overhaul (Jun 11 2026): https://www.macrumors.com/2026/06/11/apple-introduces-app-store-subscription-overhaul/
- RevenueCat, Retention Messaging API docs: https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-retention-messaging-api
- Habit Doom, WWDC 2026 and Screen Time: https://habitdoom.com/blog/wwdc-2026-screen-time-wishlist
- Habit Doom, iOS 27 Screen Time changes: https://habitdoom.com/blog/ios-27-screen-time-changes
- TechLockdown, iOS 27 Screen Time: https://www.techlockdown.com/articles/ios-27-screen-time-changes
- 9to5Mac, sleep score: https://9to5mac.com/2025/07/23/ios-26-code-hints-at-a-sleep-score-feature-for-apple-watch/
- RevenueCat, Android paywall gap (Mar 2026): https://www.revenuecat.com/blog/engineering/android-paywall-gap
- PPC Land on RevenueCat AI-app findings: https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/
- Superframeworks, Erly case study: https://superframeworks.com/case-study/erly
- Duolingo, Friend Streak lessons: https://blog.duolingo.com/product-lessons-friend-streak/
- stickK referee data (summary): https://goodmedicine.org.uk/blog/commitment-contracts-they-really-can-help-us-achieve-personally-difficult-goals
- Opal referral help: https://opalapp.com/help/how-to-invite-friends-or-family-to-opal
- Opal friends help: https://opal.so/help/how-to-invite-friends-or-family-to-opal
- Music Week, Wrapped 2025: https://www.musicweek.com/digital/read/spotify-wrapped-2025-was-biggest-ever-with-200-million-engaged-users/093178
- TechCrunch, Locket (Aug 2025): https://techcrunch.com/2025/08/06/photo-sharing-app-locket-is-banking-on-a-new-celebrity-focused-feature-to-fuel-its-growth
- PetaPixel, BeReal decline: https://petapixel.com/2023/02/22/bereal-may-be-on-the-out-users-have-nearly-halved-since-peak
- ReferralCandy benchmarks: https://www.referralcandy.com/blog/referral-program-benchmarks-whats-a-good-conversion-rate-in-2025
- AppleWorld.Today, Piper Sandler fall 2025: https://appleworld.today/2025/10/survey-eighty-seven-percent-of-teens-report-they-own-an-iphone/
- Blocking on Android without Accessibility: https://dev.to/rexa/how-to-block-apps-on-android-without-an-accessibilityservice-5gog
- ProAndroidDev, OEM background limits: https://proandroiddev.com/beyond-doze-building-reliable-background-execution-on-modern-android-including-oem-realities-5fa0a6e05672
- phyphox, pressure sensor: https://phyphox.org/wiki/index.php/Sensor:_Pressure
- Walkaway (walk-to-unlock example): https://apps.apple.com/app/id6779288153
- Sleep Keeker (old social alarm): https://www.phonearena.com/news/Sleep-Keeker-alarm-clock-app-lets-you-see-what-time-your-friends-wake-up_id64235
