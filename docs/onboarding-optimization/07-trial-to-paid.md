# Track 7: Trial to paid, refunds and the first 7 days

Research date: 2026-10-03. Scope: what happens after the user taps "Start 7-day free trial": the
first night, the first morning, days 1–7, the charge, refunds and cancellation saves. It also
covers what the last onboarding screens (`armed`, `first-morning`) must set up for those days.

Evidence grades, as in the brief:
**[A/B#]** A/B test with numbers · **[A/B]** A/B without numbers · **[Bench]** benchmark or
correlational data · **[Obs]** a single app's observation · **[Anec]** anecdote · **[Opin]**
opinion · **[Doc]** platform documentation (what is technically true, not what converts).

Code reviewed (read only): `src/features/onboarding/steps.tsx` (`armed`, `first-morning`),
`content.ts`, `setup.ts`, `src/lib/notifications.ts`, `src/lib/shield-copy.ts`,
`src/features/wake/wake-screen.tsx`, `src/features/home/review-prompt.ts`,
`src/lib/first-run.ts`, `src/lib/wake/downstairs-watch.ts`, plus GAME_PLAN.md, TODO.md,
ONBOARDING_CONVERSION.md and sub-club/APPLIED_TO_LOCTURNE.md.

---

## TL;DR: the eight things that matter most

1. **The paywall promises "I remind you" on Day 5, but the app doesn't ask for notifications
   until after the first proven morning** (`isGoodMomentToAsk` in `notifications.ts`, called from
   `wake-screen.tsx`). Anyone whose first morning doesn't happen, or who taps "Don't Allow",
   never gets the reminder. The in-app fallback is still unbuilt (TODO.md §"Real day-5 trial
   reminders… the in-app fallback isn't"). That combination produces "they charged me without
   warning" refunds and 1-star reviews. **Fix:** ask for notifications on `armed`, framed
   around the trial reminder, and build the in-app Day-5 card. Evidence: Blinkist opt-in went
   from 6% to 74% with this framing [A/B#], Foodnoms moved the prompt to right after the paywall
   [A/B#, confounded], and RevenueCat's post-purchase guidance says the same [Opin/Bench]. This
   **disagrees with GAME_PLAN's "ask after the first successful night"**. The founder must decide.
2. **The first morning also depends on notifications.** On the first morning the morning-start
   note and the shield-tap follow-up ("Up already? Tap here and prove it") are the bridge from
   the shield into the app. Without permission, night 1 has no bridge. Asking on `armed` fixes
   this too.
3. **The shield and `first-morning` disagree for downstairs, the hero method.** The shield says
   "Go downstairs, then open Locturne." `first-morning` says "Open me and tap Start. Then go
   downstairs." The barometer session only listens after Start and stops in the background
   (`downstairs-watch.ts`). A user who obeys the shield on morning 1 walks down, opens the app,
   and is told to start and climb again. A failed first morning is the worst possible activation
   event. **Fix the shield copy before anything else in this doc.**
4. **Day-0/1 is where 7-day trials die.** RevenueCat SOSA 2026: 64% of 7-day-trial
   cancellations happen on day 0–1 [Bench]. Most of these are defensive ("cancel now so I'm not
   charged"), not judgments of the product. A *credible* reminder promise (fix 1), a restated
   charge date on `armed`, and a line saying "cancelling keeps your free week" all attack that.
5. **Turn on consumption-data refund handling in RevenueCat from day one.** Two vendor case
   studies report refund rates falling 36–43% (Dipsea 3%→1.9%, Fotorama 4%→2.3%) [Obs,
   vendor-reported]. Annual plans refund more than other durations (4.2% vs 2.6% weekly, Adapty 2025,
   already in PRICING_RESEARCH) [Bench]. It needs a consent line in the Terms. Be honest: if
   the lock never armed, prefer granting.
6. **Detect auto-renew-off client-side (RevenueCat `willRenew` / `unsubscribeDetectedAt`) and
   show one save on the next calm open.** For a trial user, StoreKit *does* allow a promotional
   offer (they are a current subscriber). It takes effect at the next renewal, which here is
   the first paid year. Win-back offers do **not** apply, because they need a lapsed *paid*
   subscription. Apple's Retention Messaging API is in a pre-release program. Apply after launch.
7. **The day-5 reminder should be a receipt, not a warning.** Recount what happened (mornings
   up, nights held, minutes the apps slept), then the date and how to cancel. Reschedule it on
   every app open so the numbers are current. Evidence for recap copy is weak [Opin]. Evidence
   for the reminder itself *raising* trust and trial starts is solid [A/B#].
8. **Keep the rating prompt on the first proven morning**, but never in the same minute as
   another system prompt. Fix 1 removes today's collision: the notification prompt fires on the
   wake screen, then the rating prompt on Home. Ratings move store conversion a lot
   [Bench, weak sources].

---

## 1. Benchmarks

### 1.1 When trials get cancelled

| Finding | Number | Grade | Source |
|---|---|---|---|
| 3-day trials: share of cancellations on day 0 | 55.4% | Bench | RevenueCat SOSA 2026, via [RC: post-purchase screen](https://www.revenuecat.com/blog/growth/post-purchase-screen) |
| 3-day trials: cancellations on day 0–1 | 84% | Bench | same |
| **7-day trials: cancellations on day 0–1** | **64%** | Bench | same; [RC: 7-day trial](https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app.md) |
| 30-day trials: day-0 share | 31.1% | Bench | same |
| Annual subscriptions: share of cancellations in month 1 | ~35% | Bench | same |

**What this means for Locturne.** Most cancellations happen before the user has had a single
night, so they can't be about the product. They're about *trust in the charge*. Users cancel
right after starting so they won't forget. Two things follow:

- Anything that makes "I won't forget" feel solved raises trial→paid. A credible reminder, a
  visible date, and the knowledge that cancelling now doesn't end the free week all count.
- **Cancelling during the trial doesn't end it for Locturne users.** With App Store
  subscriptions the entitlement stays active until the trial's expiry date. RevenueCat says
  "An unsubscribe does not mean that the entitlement is inactive"
  ([RC CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info.md)) [Doc]. So a
  day-0 canceller keeps getting nights and mornings for the rest of the week. That's a
  *save window*, not a lost user (see §6).

### 1.2 Trial→paid rates

| Segment | Rate | Grade | Source |
|---|---|---|---|
| Trials ≤4 days, median | 25.5% | Bench | RC SOSA 2026 via [RC 7-day trial](https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app.md) |
| Trials 5–9 days, median | ~37% | Bench | RC SOSA 2026 (already cited in docs/PRICING_RESEARCH.md) |
| Trials 17–32 days, median | 42.5% | Bench | same |
| Health & Fitness trial→paid | 35.0% (Adapty) / 42.2% (Adapty H&F 2026) | Bench | [Adapty state of subscriptions](https://adapty.io/state-of-in-app-subscriptions/), docs/VALIDATION_RESEARCH.md |
| Hard paywall, median day-35 download→paid | 10.7% (vs 2.1% freemium) | Bench | RC SOSA 2026 (search summary of [SOSA](https://www.revenuecat.com/state-of-subscription-apps)) |

GAME_PLAN's "roughly 30% of trials to paid" gate is **below the 5–9-day median (~37%)**. That's
reasonable for a new app, but it's not ambitious. A warm founder audience will inflate it early
(APPLIED_TO_LOCTURNE conflict 8). Keep the gate. Read it net of refunds and on real App Store
cohorts, not TestFlight.

### 1.3 What predicts conversion during the trial

- **Count of the core action.** Aperture saw 2x trial→paid at 6 stories, Ladder uses 3 workouts
  a week, and Petit saw ~3 completions drive the first renewal (Sub Club, already in
  APPLIED_TO_LOCTURNE A1) [Obs]. Locturne's core action is a *proven morning*. Its hypothesis
  of "3 proven mornings in the trial" stands. I'd add a **leading indicator: first morning proven
  by day 2.** That's the one the onboarding can actually move.
- **Notification opt-in.** Airship 2026: iOS push opt-in users retain about 2× better
  ([Airship](https://www.airship.com/resources/mobile-app-push-notification-benchmarks-2026/),
  cited in VALIDATION_RESEARCH) [Bench, correlational: opted-in users are self-selected].
- **Longer trials don't add activation, they delay decisions.** RevenueCat's own trial-length
  piece notes that "activation didn't improve. People weren't consuming more content; they were
  delaying" [Bench/Opin]. That matters for the 14-day exit-offer arm. Its trial→paid should be
  read against the extra free week of lock it gives away.

---

## 2. The first night and first morning are the "aha"

### 2.1 Why this product is unusual

Most apps' aha happens in the app, in the first session. Locturne's happens **twice, offline,
hours after onboarding**:

1. **Night:** the user taps Instagram in bed and meets Loc's shield. This is passive. The user
   doesn't have to do anything right. The lock just has to work.
2. **Morning:** the user proves they're up and the apps wake. This is active. It can fail
   through permission, copy, sensor or user confusion, at 7 a.m., while groggy.

Fogg's model says behaviour happens when **motivation, ability and a prompt** meet at the same
moment, and that raising ability (making it easier) beats raising motivation
([behaviormodel.org](https://behaviormodel.org/)) [Opin, widely used model]. At 7 a.m.:

- Motivation is high: they want Instagram.
- Ability is where the morning can fail. Do they know *exactly* what to do? Does the first
  thing they try work?
- The prompt is the shield plus a notification. The notification needs permission they haven't
  given yet (§2.3).

So the last onboarding screens have to maximize **ability and prompt for the first morning**.
They don't need to sell the product again.

### 2.2 Habit literature: what the trial can and can't do

- **Lally et al. 2010**, *European Journal of Social Psychology*. 96 participants took on one
  daily health behaviour. Median time to plateau automaticity was **66 days, range 18–254**.
  **Missing a single day did not materially affect habit formation**: automaticity dropped by
  0.29 that day, a very small decrease
  ([UCL](https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit),
  [summary](https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit))
  [peer-reviewed, small sample].
  - **What it means:** a 7-day trial can't build a habit. It can only produce *felt value*:
    "I got up, my mornings were different."
  - **What it means:** a missed morning is not a setback. That supports GAME_PLAN's
    "no streak loss, passes don't reset anything", and gives Loc a line: "One bad morning
    doesn't count. I checked. There's a study."
- **Implementation intentions** ("if X, then I will Y"). Gollwitzer & Sheeran 2006,
  *Advances in Experimental Social Psychology*, meta-analysis of 94 tests: **d = 0.65** on goal
  attainment
  ([summary](https://www.thebehavioralscientist.com/glossary/implementation-intentions))
  [meta-analysis, A-grade for the general effect, not tested in apps].
  - **What it means:** `commit` ("Phone down at 11:30. Downstairs to wake them.") already is an
    implementation intention. `armed`/`first-morning` can add the *physical* one: where the
    phone sleeps tonight.
- **Rise** pitches that "80% of users feel benefits within five days". It runs a 7-day trial on a
  ~$69.99 annual plan behind a long personalised onboarding
  ([RC: onboarding too short](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short.md))
  [Obs, marketing claim]. Felt benefit before the reminder day is the pattern Locturne should copy.
- **Alarmy:** I found no public data on its first-alarm or test-mission activation (searches
  turned up only Play Console store-listing tests: +26% install conversion, Google case study
  [Obs]). Alarmy's onboarding has users try a mission on setup. That's observable in the app,
  but its effect is **unverified**.

### 2.3 What the code does now (gaps)

| Gap | Where | Why it matters |
|---|---|---|
| Notifications asked only after the first proven morning | `wake-screen.tsx` `onMet` → `shouldAskForNotifications` → `isGoodMomentToAsk` | Night-1 bedtime warning, morning-start note and shield-tap bridge don't exist on the night that matters most. The Day-5 reminder silently never lands for anyone who doesn't prove a morning *and* allow. |
| Day-5 in-app fallback not built | TODO.md line 169 | The paywall's "I remind you" is unconditional on `offer`. Copy in ONBOARDING_CONVERSION says it should be conditional ("if notifications are on"); the live `offer` row reads "Day 5: I remind you. Grudgingly." |
| Shield vs `first-morning` instructions for downstairs | `shield-copy.ts` `PROOF.downstairs` = "Go downstairs" + ", then open Locturne"; `content.ts` `METHOD_COPY.downstairs.morning` = "Open me and tap Start. Then go downstairs." | Barometer needs Start first and the app in the foreground (`downstairs-watch.ts`). Following the shield fails on morning 1. |
| Two system prompts back to back on the first morning | Notification prompt on the wake screen, then `useReviewPrompt` on Home | Stacked prompts lower acceptance of both [Opin]. Fix 1 removes it. |
| `armed` doesn't restate the charge date | `steps.tsx` `case 'armed'` | The last money fact the user sees is on `plans`. A restated date after purchase is cheap insurance against "surprise charge" refunds [Opin, supported by Blinkist complaint data]. |

---

## 3. Recommended `armed`

Today: "Armed. See you at {bed}." → body → [Continue] → Motion & Fitness prompt → `first-morning`.

Proposed order (each step its own beat, no new screen if avoidable):

**3.1 Keep the success state exactly as is**, then the Motion prompt (it's needed before the
first morning; already correct).

**3.2 Add the notification ask as a new beat right after Motion.** Either a second state of
`armed` or a tiny `remind` step. Priming copy in Loc's voice, one screen, a real button, then
iOS's prompt:

> **"Last thing. Can I text you?"** (headline)
> "Three kinds, and that's it: ten minutes before bedtime, when the morning starts, and two
> days before you're charged. I'm not chatty. I'm a raccoon."
> [Allow notifications] (shows iOS prompt) · secondary text button "Not now"

- **Why here:** it's the moment the user best understands the value ("you'll be charged" was
  seconds ago).
  - Blinkist's paywall rework (timeline + "we'll remind you 2 days before") took notification
    opt-in **6% → 74%**, raised trial starts **+23%**, cut complaints **−55%** and cut trial
    cancellations **−4%**
    ([UX Planet, Blinkist](https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b))
    [A/B#].
  - Foodnoms moved the prompt "from before the paywall to directly after", with a Day-5 local
    reminder. Starts +58%, trial→paid −15.9%, paying +59.6%, realized LTV +23.3%
    ([Ryan Wesley](https://ryanwesley.com/paywall-optimization-success-story/)) [A/B#, but the
    whole paywall changed at once, so the prompt's own effect is unknown; sample size not given].
  - RevenueCat's post-purchase guidance: "Request notification permissions during post-purchase
    with explicit value ('We'll remind you before trial ends')"
    ([RC](https://www.revenuecat.com/blog/growth/post-purchase-screen)) [Opin from the largest
    data holder].
- **Why "Not now" is a text button:** an Apple "Don't Allow" is permanent. A soft "Not now"
  keeps the iOS prompt for the existing after-the-first-morning moment. **Keep
  `isGoodMomentToAsk` as the second chance** for people who tapped "Not now".
- **The conflict:** GAME_PLAN says "notifications permission is asked after the first
  successful night". The reasoning was presumably "ask once value is proven". For most apps
  that's right. Here the reminder *is* the value the user was just sold, and the first morning
  needs the notification bridge. **I recommend changing GAME_PLAN.** Confidence: medium-high.
- **Expected impact:**
  - Opt-in: ~45–55% iOS baseline (Airship) → **65–75%** with trial framing.
  - Day-5 reminder delivered: from (first-morning provers × opt-in) to (~70% of all trialists),
    plus the in-app fallback for the rest.
  - Trial→paid: **+1–4 points**, through fewer defensive day-0 cancels and better
    first-morning success. *Estimate, not measured.*
  - Refunds and billing 1-stars: down, direction-confident, size unknown.

**3.3 Restate the money once, plainly, on the same beat or below the headline:**

> "Free until {Mon, Jan 12}. I'll remind you {Sat, Jan 10}. Cancel any time in Settings, and
> you still keep the whole free week."

- "Keep the whole free week" is true for App Store trials (the entitlement runs to expiry,
  §1.1), and it defuses the defensive day-0 cancel. **Verify on device/sandbox** that
  RevenueCat's entitlement stays active after cancelling in sandbox before shipping the claim.
- **Risk:** it may *increase* day-0 cancellations, because cancelling is now costless.
  - But those users keep using the lock, so they stay reachable for the save in §6.
  - And users who'd have cancelled anyway now cancel *knowing* they're covered, so fewer
    uninstall in a panic.
  - Blinkist's honesty move *reduced* cancellations (−4%) [A/B#].
  - **A/B it if traffic allows.** Otherwise ship. Confidence: medium.

**3.4 One physical implementation intention: where the phone sleeps** (optional chip question,
2 seconds):

> "Where does your phone sleep tonight?" [Across the room] [Next to me] [Another room]

- It feeds settings, which keeps ONBOARDING_CONVERSION's rule. It picks the bedtime
  notification line ("Charger. Across the room. Go.") and Loc's morning line.
- "Across the room" is also physically the best wake-up method: you must stand to stop the alarm.
- Evidence:
  - Gollwitzer & Sheeran d=0.65 [meta-analysis, general].
  - "Phone in another room" is already an answer on `tried`, so users recognise it.
  - No app-specific A/B exists [Opin].
- Low cost. Expected impact on trial→paid: small; on first-morning success: small-positive.
  Confidence: low-medium. **Skip it if `armed` is getting long.** The notification ask matters
  far more.

**3.5 Don't add on `armed`:**
- A forced "test unlock tonight" walk. The `walk` step already does a 20-step taste.
  Re-walking at 11 p.m. is friction.
- AlarmKit. It's v1.1 per GAME_PLAN, and it's a second permission.
- A widget push. There's nothing to install yet.

**3.6 The "Starting now" path (bought after bedtime) is the blocker paradox at its sharpest.**
The user came from TikTok at 11:45 p.m., paid, and is blocked *immediately*. This is the best
video moment and the highest day-0-cancel risk. Keep it (GAME_PLAN: tightening is immediate),
but on that path:
- Show the humane exits **once**, in his voice:
  > "Asleep now. If something real comes up, there's an emergency unlock. It's slow on
  > purpose."
- Tag analytics with `night_armed.now` (already logged) and **compare day-0 cancel rate for
  `now: true` vs `false`**. If `now: true` cancels much more, the next experiment is copy, not
  mechanics.

---

## 4. Recommended `first-morning`

Today it ends on the morning plan rows + "That's it. Bed at {bed}." + "I'll be asleep. Don't
wake me." That's good. Changes:

1. **Fix the downstairs instructions everywhere** (this is the most important item in this doc
   for activation):
   - `shield-copy.ts` morning, downstairs: "Open Locturne and tap Start. Then the stairs."
     Today it says "Go downstairs, then open Locturne."
   - Keep `first-morning` rows as they are. They're right.
   - Per APPLIED_TO_LOCTURNE A2, make the *first* morning's shield literal, then switch to the
     line bank.
   - Expected impact: on first-morning success for downstairs users (the default for anyone
     with stairs), potentially large. A confused failure here is a cancel. Confidence: high
     that it matters; the size is unknown.
2. **One row for the money, the same as on `armed`**, so the last screen before bed carries the
   date: "Free week | Ends {Mon}. I remind you {Sat}." Users screenshot or remember the last
   screen [Opin].
3. **One row for the bad day, already there** ("Use a pass. No walking."). Add nothing more.
   Lally says one miss doesn't matter. Say so later, on the morning a pass is used, not now.
4. **If Motion was denied** the screen already says so. Good. **If notifications were denied or
   skipped**, add one row: "Notifications | Off, so you won't hear from me. The reminder will be
   on my Home screen instead." That keeps the paywall promise honest.
5. **Keep it ending on bed.** "Good night" is the right CTA. No upsell, no share, no rating ask
   here. The user hasn't experienced anything yet.

Expected combined impact of §3 + §4 on trial→paid: **+2–5 points** relative to today. Most of
it comes from fewer first-morning failures and fewer defensive cancels. *Estimate; the
biggest uncertainty is the real first-morning failure rate, which the device spike and first
cohort must measure.*

---

## 5. The blocker paradox

**Evidence that blocking annoys.**
- *GoalKeeper*, Kim, Jung, Ko & Lee 2019, *Proc. ACM IMWUT*, 4-week field study, n=36.
  Restrictive lockouts were more effective than warnings, but caused **more frustration and
  pressure, mainly because usage contexts and needs vary**
  ([KAIST record](https://koasas.kaist.ac.kr/handle/10203/269100)) [peer-reviewed, small n].
- *one sec*, Grüning, Riedel & Lorenz-Spreen 2023, *PNAS* 120(8) e2213114120. Friction (not a
  hard block) cut target-app openings **57%**
  ([one sec](https://one-sec.app/)) [peer-reviewed field study]. Friction that can be passed
  still works, and that's what passes and the emergency unlock are.
- Opal says freemium fails when "the free tier feels like a crippled trial"
  ([RC/Opal](https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026.md))
  [Obs]. Not directly about strictness.

**What's compatible with GAME_PLAN** (no loosening, no punishment, no timed earned unlocks):
- **Context exits, named early, used without shame.** GoalKeeper's frustration came from
  *context* (a real need the block didn't foresee). Passes and the emergency unlock already
  answer that.
  - Make sure the user *knows* they exist **before** the first frustrated moment: `armed`
    "starting now" line (§3.6), and the `first-morning` "Bad day" row.
  - No first-week "softer mode". It would teach that the product is soft.
- **Make the night shield feel like company, not a wall.** The current lines ("Shh. I'm
  sleeping. So are they.") do this. The joke lands on him, never on the user (VOICE.md).
- **Never block something the user didn't choose.** Onboarding already has them pick apps in
  Apple's picker. The one danger is a user who picks Messages or Maps out of zeal. Opinion:
  **don't** add a warning step; Apple's picker is enough.
- **Graduated onboarding, compatible version.** Don't propose fewer nights or a weaker morning.
  Instead, make the first week's *mornings* easier to understand, not easier to pass: literal
  first-morning shield copy (A2), the walk taste in onboarding, Start-first downstairs.
- **Measure it.** Event when a shield is shown and the emergency unlock is used in nights 1–3,
  joined to cancellation. If emergency-unlock users cancel at 2x, the response is copy and
  education, never mechanics.

---

## 6. Detecting trial cancellation and one in-app save

### 6.1 Detection (no own server needed)

- RevenueCat `EntitlementInfo.willRenew`, `unsubscribeDetectedAt`, `periodType == trial`.
  These update when the app becomes active. There may be an hours-long delay unless App Store
  Server Notifications go to RevenueCat
  ([RC CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info.md)) [Doc].
  **Turn on Apple → RevenueCat server notifications** (also needed for §7).
- Fire PostHog `trial_cancelled` with the day of the trial and the counts so far (mornings
  proven, nights held). This is the single most useful analytics event for this track.

### 6.2 What StoreKit allows

| Mechanism | Usable on a trial user who turned auto-renew off? | Notes | Grade |
|---|---|---|---|
| **Promotional offer** (same product) | **Yes, technically.** They're a current subscriber. | Redeeming re-enables renewal; on the *same* product the offer applies **at the next renewal** (i.e., the first paid year). It needs a signed offer; RevenueCat signs it. Up to 10 active promo offers per subscription ([Apple](https://developer.apple.com/documentation/storekit/setting-up-promotional-offers.md); [RC community](https://community.revenuecat.com/general-questions-7/redeeming-ios-promotion-offer-on-the-same-subscription-product-1140)) | Doc |
| Promo offer as "+1 free week" | Probably. A promo offer with payment mode *free*, 1 week, would apply after the trial ends. | **Unverified.** Test in sandbox that a free promo period can follow an intro free trial on the same product. | — |
| **Win-back offer** (iOS 18) | **No.** Eligibility is built on a lapsed *paid* subscription. Trial-only users who never paid don't qualify ([appsops summary](https://appsops.store/blog/ios-subscription-promotional-offers)) | Secondary source; Apple's page didn't load. Treat as likely. | Doc (secondary) |
| **Retention Messaging API** | Shown on Apple's Confirm Cancellation screen in Settings: text, text + image, switch-plan, or promotional offer. Pre-release program, per-app approval, needs a server endpoint ([Adapty](https://adapty.io/blog/apple-s-retention-messaging-api/), [RC docs](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-retention-messaging-api)) | Whether it shows for *trial* cancellations isn't documented in what I read. Vendors report "retention rate" but admit it isn't causal. | Doc, no outcome data |

### 6.3 Which save

Evidence from Sub Club (already in APPLIED_TO_LOCTURNE C1):
- Opal's 50% off on trial cancel "works quite well" [A/B in progress].
- Coconote's "+7 days" beat discounts "by far" [Obs].
- Yousician's discount save was net negative after refunds [Obs].

**Recommendation, compatible with the exit-offer A/B already planned:**
- **One modal, once, on the first *calm* open after `trial_cancelled`.** Daytime, not during a
  morning walk, not at bedtime.

  > "You turned me off. Fair. You still have me until {Mon}."
  > "If it's the price: half off the first year, and I stop asking." [Half off] · [No thanks]

- The *first* line is not a save. It reassures them the week continues, which keeps them using
  the lock. Those mornings are the real save.
- **Don't run it until the exit-offer arms have read.** If `half-price` loses net of refunds as
  an exit offer, it'll lose here too.
- **Do not** show a save to anyone with a failed arm or revoked Screen Time access. Fix their
  lock first.
- Expected impact: Opal-style saves on trial cancel recover maybe **5–15% of cancellers**
  *[Opin/estimate; no public numbers]*. On a base where ~60% of trialists cancel, that's
  **+1–3 points trial→paid**, at a lower price. **Judge on D35 net revenue per install**, as
  APPLIED_TO_LOCTURNE says.
- **Retention Messaging API:** apply once live. Start with a *text-only* message (no discount):
  "Your free week continues until {date}. Cancelling now just means I won't charge you." That's
  honest, and it may convert some users who cancel to be safe into users who cancel later and
  rethink [Opin].

---

## 7. Refunds, grace period, billing retry

### 7.1 How Apple refunds work
- The user requests at reportaproblem.apple.com, or in-app via `Transaction.beginRefundRequest`
  if the app offers it ([Apple](https://developer.apple.com/documentation/storekit/transaction/beginrefundrequest(in:)-63bvd.md)) [Doc].
- Apple sends `CONSUMPTION_REQUEST`. The developer has **12 hours** to call Send Consumption
  Information, otherwise Apple decides without the data
  ([RC](https://www.revenuecat.com/blog/company/handle-apple-refund-requests-automatically)) [Doc/Obs].
- **V2 of the endpoint** has 5 fields: `customerConsented` (must be `true` or the request is
  rejected with HTTP 400), `consumptionPercentage`, `deliveryStatus`, `refundPreference`
  (`GRANT_FULL` / `GRANT_PRORATED` / `DECLINE`) and `sampleContentProvided`. It works for
  auto-renewables, and Apple calculates the prorated share itself
  ([Apple ConsumptionRequest](https://developer.apple.com/documentation/appstoreserverapi/consumptionrequest.md)) [Doc].

### 7.2 How much it helps

| Case | Before → after | Grade |
|---|---|---|
| Dipsea (RevenueCat, "submit data and let Apple decide") | 3% → 1.9% refund rate in ~15 days | Obs, vendor case study |
| Fotorama (Adapty) | 4% → 2.3% | Obs, vendor; "decline 60–70% of requests" claim unsupported ([Adapty](https://adapty.io/blog/how-to-cut-your-apps-subscription-refund-rate/)) |
| Annual refund rate | 4.2% (vs weekly 2.6%) | Bench, Adapty 2025 (PRICING_RESEARCH) |
| H&F refunds | ~4.7% | Bench (VALIDATION_RESEARCH) |
| Hard-paywall median refunds | 5.8% | Bench (ONBOARDING_CONVERSION) |

**Recommendation (ship before launch, ~1 hour):**
- In RevenueCat, set refund handling to **"Submit consumption data and let Apple decide"**.
- Add the consent clause to the Terms ("we may share usage information with Apple to help
  resolve refund requests").
- `sampleContentProvided = true`: there was a free trial.
- Expected: annual refunds from ~4–5% to ~2.5–3.5% of charges. At $59.99, every refund
  avoided is ~$50 net. *Estimate from two vendor cases; selection bias likely.*
- **Honesty rule:** if the user's lock never armed (`night_armed` never true), or Screen Time
  was revoked for most of the year, they didn't get the product. Don't fight that refund.
  RevenueCat's global setting can't do this per user, so accept it. Since "let Apple decide"
  is neutral, it's fine.
- **Don't add a prominent in-app "Request refund" button.** There's no evidence either way
  [Opin]. A "Cancel subscription" link in You (APPLIED_TO_LOCTURNE C2) is enough.

### 7.3 Billing grace period and retry
- Apple retries failed renewals for up to **60 days**. Grace period options are **3, 16 or 28
  days** for monthly and longer subscriptions, and recoveries inside grace keep the original
  billing date and revenue
  ([Apple](https://developer.apple.com/documentation/storekit/reducing-involuntary-subscriber-churn.md)) [Doc].
- App Store Connect lets you choose **"All renewals" or "Only paid to paid"**
  ([Apple help](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions)) [Doc].
  "All renewals" includes the trial → first-year charge.
- **Recommendation:** enable it, **All renewals, 16 days**.
  - Trial converts with a dead card are common among students [Opin].
  - A 16-day grace keeps the lock working while Apple retries, so the user doesn't wake up to an
    unlocked phone and decide they don't need it.
  - 28 days gives away close to a month of a $60/year product on failure. 16 is the middle.
  - Grade: Opin, no comparative data found.
- Billing-issue in-app message: link to `https://apps.apple.com/account/billing` [Doc], in
  VOICE.md's plain register:

  > "Apple couldn't charge your card. Your apps still sleep for now. Update it here."

### 7.4 Copy that prevents refunds and 1-star reviews
- Blinkist: complaints **−55%** once the trial and reminder were explicit [A/B#].
- A Locturne-specific risk: TikTok users who installed for the bit and forgot. The **date on
  `offer`, `plans`, `armed` and `first-morning`**, plus a delivered reminder, is the defence.
- Apple's own pre-charge email for third-party trials: **unverified**. One Apple forum reply
  *expects* a 24h notice, but it isn't documented
  ([forum](https://developer.apple.com/forums/thread/95882)). Don't rely on it.

---

## 8. The day-5 reminder

**Evidence.**
- Blinkist (above) [A/B#].
- MarketingSherpa: a registration form offering a 3-day-before email reminder lifted sign-ups
  **+16.4%**, and the reminder "didn't hurt conversions to paid"
  ([MarketingSherpa](https://marketingsherpa.com/article/case-study/simple-email-cancellation-reminder-lifts))
  [A/B#, older, email].
- Duolingo: letting users choose the reminder day raised conversion (Sub Club, in
  APPLIED_TO_LOCTURNE) [A/B].
- **No public A/B on recap content vs plain reminder.** Recap copy is [Opin], but it follows the
  "surface the value they didn't see" pattern (APPLIED_TO_LOCTURNE A3).

**Current copy** (`notifications.ts` `COPY.trial`): "Your free trial ends in 2 days." / date,
annual starts, how to cancel, "No hard feelings. Some feelings." It's honest and clear, but
it has no value.

**Proposed.** The local notification's content is fixed when scheduled, so **reschedule the
trial reminder in `rescheduleNotifications` with the latest counts** (it already runs on
change). Then:

- Title: "Five nights. {n} mornings up."
- Body: "Your apps slept {h} hours. Free until {Monday}, then $59.99 for the year. Cancel in
  Settings › Apple ID › Subscriptions. I'd rather you didn't."
- If no morning was proven:

  > "Your free week ends {Monday}. Then $59.99 for the year. I haven't seen you get up yet.
  > Cancel in Settings, or let me try once more tomorrow."

  That's honest, never shaming, and a user who never activated is the most likely refund.
  Telling them clearly lowers refunds [Opin].
- **Timing:**
  - Keep "≥2 days before".
  - Prefer **just after the reminder-day morning** over local noon. Ideally fire it when that
    morning is proven, or at the morning-start time + 90 min as a fallback. That's the
    moment the value is fresh [Opin].
  - The current noon is fine if this is complex.
- **In-app fallback (must ship, TODO line 169):** a Home card on the reminder day for anyone
  without notification permission, with the same words. The card must appear before the
  morning walk ends, not replace Loc's morning receipt.
- Expected impact: the recap vs plain copy, unknown, perhaps ±1 point. The *delivery* of the
  reminder (§3.2 + fallback) is what protects refunds and reviews. Confidence it's worth doing:
  medium.

---

## 9. Rating prompt

- **Current:** `useReviewPrompt` shows `StoreReview.requestReview()` after a proven morning, once
  per app version. Good. iOS caps the prompt at 3 per 365 days and doesn't say whether it showed.
- **Evidence on ratings and store conversion** (all [Bench], vendor blogs, quality uneven):
  - 3→4 stars: ~+89% conversion (multiple ASO vendors).
  - 3.6→4.2: ~+60% (AppTweak 2025, via
    [Sonar](https://trysonar.app/blog/app-store-conversion-rate)).
  - "79% check rating before download"
    ([AppFollow](https://appfollow.io/blog/ratings-and-reviews-part-1)).
  - None of these is a clean causal study. The direction is not in doubt.
- **For a new app the *count* matters as much as the average.** Store pages with few ratings look
  untested.
  - Launch-week ratings from people who just had a successful morning are the best possible.
  - The first proven morning is the highest-volume positive moment during the New Year launch.
  - **Keep it on the first proven morning**, on Home after the morning receipt (A3), not on the
    wake screen.
- **Changes:**
  - Never in the same session as the notification prompt. §3.2 moves that prompt to the night
    before, which fixes it.
  - Don't prompt on a morning unlocked by a pass or emergency (`isWakeProof` already excludes
    those). Good.
  - Optional later test: first vs third proven morning. A user who's done three is more
    committed, but there are fewer of them before the day-5 reminder. Low priority.
- **Don't reset ratings** on updates during launch month.

---

## 10. The 7-day journey (proposed)

| When | What | New or existing | Evidence |
|---|---|---|---|
| Purchase → `armed` | Arm; Motion prompt; **notification priming + prompt**; restated date; optional "where does the phone sleep" | Notification ask and date **new** | §3 |
| `first-morning` | Fixed downstairs script; date row; notifications-off row | Rows **new**, copy fix | §4 |
| Night 1, bedtime −10 min | Bedtime heads-up (now delivered, because of the earlier permission) | existing | R1 |
| Night 1 | Shield; "starting now" users see the emergency line once | copy **new** | §3.6 |
| Morning 1 | Literal first-morning shield; shield-tap notification bridge; walk; **morning receipt** ("Last night: 4 apps asleep…"); rating prompt on Home | Shield copy fix; receipt per A3 | §2, §9 |
| Any day, on `trial_cancelled` | One calm-moment modal: "You still have me until {Mon}" + (if the exit-offer test supports it) half off as a promo offer | **new** | §6 |
| Days 2–4 | Nothing extra. No "come back" pushes (Opal A/B: they failed) | existing rule | R1 |
| Day 5 (or reminder day for the 14-day arm) | Recap reminder, rescheduled with live counts; in-app card fallback | copy + fallback **new** | §8 |
| Day 7 | Charge. Consumption handling and 16-day grace in place | config **new** | §7 |
| First open after charge | One line, no confetti: "Paid up. I'm still not a morning person." Then the normal Home | Opin, optional | — |

---

## 11. Analytics to add (to read this track's bets)

- `notifications_prompt` {where: armed | first_morning_success, result}
- `trial_cancelled` {trial_day, mornings_proven, nights_held, emergency_used, arm_now}
- `trial_converted`, `refund` (from RevenueCat → PostHog), `billing_issue`
- `first_morning_result` {method, proven: bool, minutes_after_wake, failure: no_motion | no_barometer | backgrounded | never_opened}
- `trial_reminder_delivered` {channel: push | in_app}
- Key derived metrics:
  - % of trialists with a proven morning by day 2 (leading indicator).
  - Day-0/1 cancel share (benchmark: 64% of cancels).
  - Trial→paid net of refunds by notification permission and by `arm_now`.

---

## 12. Prioritised recommendations with expected impact

| # | Change | Screen / place | Grade of evidence | Expected effect on trial→paid | Confidence |
|---|---|---|---|---|---|
| 1 | Fix downstairs shield copy (Start first) | `shield-copy.ts` | Mechanism (code) | Avoids failed first mornings for the default method. Possibly the largest single effect | High (it matters), size unknown |
| 2 | Notification priming + prompt on `armed`, trial-reminder framing; keep the after-first-morning ask as a second chance | `armed` | A/B# (Blinkist, Foodnoms; confounded) + RC guidance | +1–4 pts; fewer refunds and billing 1-stars | Medium-high |
| 3 | Day-5 in-app fallback card | Home | Required by the paywall promise | Protects refunds and reviews more than conversion | High |
| 4 | Consumption-data refund handling + Terms consent | RevenueCat config | Obs (2 vendor cases) | Not trial→paid; −1 to −2 pts refund rate on annual charges | Medium |
| 5 | Restate charge date + "cancelling keeps the week" | `armed`, `first-morning` | A/B# (Blinkist honesty) / Opin | +0–2 pts via fewer panic cancels; may raise day-0 cancel *clicks* while lowering real churn | Medium; verify the entitlement behaviour in sandbox |
| 6 | Trial-cancel detection + one calm save (promo offer) | Home modal | Obs (Opal, Coconote) / Doc | +1–3 pts, at lower price; judge net | Low-medium |
| 7 | Day-5 recap copy, rescheduled with live counts | `notifications.ts` | Opin | ±1 pt | Low |
| 8 | Billing Grace Period, All renewals, 16 days | App Store Connect | Doc / Opin on duration | Recovers a slice of failed first charges | Medium |
| 9 | "Where does your phone sleep" chip | `armed` | Meta-analysis (general) / Opin | Small | Low |
| 10 | Emergency-unlock line on "starting now" + cancel-rate split | `armed` | Opin (GoalKeeper context) | Small | Low |
| 11 | Apply for Retention Messaging API; text-only message first | Server / RC | Doc, no outcome data | Unknown | Low |

**Combined, honest expectation:** items 1–3 and 5 together plausibly move trial→paid from a
baseline in the low 30s into the mid-to-high 30s. Most of that comes from not losing users to a
broken first morning or a broken promise. Everything else is incremental. These are estimates
built on other apps' numbers. The first real cohort will replace them.

## 13. Disagreements with prior repo docs

- **GAME_PLAN, notifications after the first successful night.** Recommend moving the primary
  ask to `armed` (§3.2). ONBOARDING_CONVERSION.md already recommended "right after purchase";
  the code followed GAME_PLAN instead.
- **ONBOARDING_CONVERSION, the timeline's day-5 row "conditional (if notifications are on)".**
  The live `offer` row is unconditional ("I remind you. Grudgingly."). Either make it true for
  everyone (fallback card, §8) or soften the row. Prefer the first.
- **APPLIED_TO_LOCTURNE C1 left the StoreKit question open.** Answer: promotional offers are
  allowed for in-trial users and apply at the next renewal. Win-back offers are not allowed for
  trial-only users. A "+1 free week" promo still needs a sandbox check.
- **APPLIED_TO_LOCTURNE C3 says grace period "on".** Specify **All renewals** (so the trial
  conversion is covered) and a duration (16 days suggested).

## Sources not verifiable in this session
- Apple's exact eligibility text for win-back offers (the doc page didn't render). I relied on a
  secondary summary.
- Whether Apple emails users before a third-party free trial converts.
- Alarmy's internal activation data.
- Whether Retention Messaging messages appear on *trial* cancellations.
- The "90% of billing issues resolve within 28 days" figure circulating in vendor blogs. Not
  found on Apple's page; not used.
