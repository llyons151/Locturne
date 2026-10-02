# Strategy deep dive: direction, timeline, money

Written September 30, 2026, ten days into the project. This is an outside-view
review of where Locturne stands. It builds on [GAME_PLAN.md](../GAME_PLAN.md) (still
the source of truth), [IDEA_SCORECARD.md](IDEA_SCORECARD.md) and
[VALIDATION_RESEARCH.md](VALIDATION_RESEARCH.md). Scores, dates and probabilities
are **[OPINION]**. Market facts are cited in section 6.

## 1. Verdict in five lines

1. **The direction is right, but the mechanic is no longer unique.** "Your apps
   don't wake up until you get out of bed" is a clear, filmable wedge that Opal
   doesn't own. Flint, SleepShield, Sunbreak and Unbed (744 ratings) are already
   close, though (section 6). Don't pivot. Win on the complete night-plus-morning
   loop with no hardware, the voice, reliability and speed.
2. **The order of work has drifted.** The plan says to prove the native lock on a
   real iPhone before building more UI. Ten days in there are about 9K lines of UI
   and 6K lines of research docs, and zero lines of Screen Time code. The biggest
   risk is still untested.
3. **Distribution is untested too.** No waitlist and no concept videos yet, even
   though the plan says marketing "starts now". Views decide the money far more
   than any screen does.
4. **Realistic launch: January to February 2027.** January is the best month of
   the year for a self-improvement app, so aim for it, but don't skip the
   reliability gate to make it.
5. **Executed well, month-12 is most likely $5–15K MRR.** Unconditionally (counting
   the ways it can go wrong), the single most likely outcome is still under $1K MRR.
   The gap between those two numbers is almost entirely views.

## 2. Direction: what to keep, change and stop

### Keep
- **Morning-first positioning.** It's the only part of the product that's
  meaningfully different from Opal, and it's the video.
- **Hard paywall with an annual trial.** It fits a creator-led acquisition model
  where every view needs to pay back.
- **The voice as the mascot, no illustrated art for v1.** Cheap to make, hard to
  copy, and it's what people will screenshot.
- **Reliability and honest status as a feature.** In this category one silent
  failure means a 1-star review and a refund.

### Change
- **Do the device spike next, before any more onboarding polish.** The Family
  Controls *Development* entitlement already works on a registered iPhone, so
  there's no need to wait for Apple's distribution approval to start.
  - Look at `react-native-device-activity` (Kingstinct), which wraps FamilyControls,
    ManagedSettings and DeviceActivity, with an Expo config plugin and extension
    targets. It could cut the spike from weeks to days. Check it supports Expo SDK
    57 before committing to it.
  - Debugging extensions without Xcode logs is the hardest part of building on
    Linux. Write extension events to the App Group and show them on a hidden debug
    screen in the app. If you can borrow or rent a Mac (a school lab, a used M1 Mac
    mini, or a cloud Mac for a month), the spike gets much faster.
- **Start the concept videos this week.** Ten 15-second videos in two weeks on the
  two lead hooks ("My phone won't work until I get out of bed" vs "I have to walk
  200 steps before TikTok works"), linking to a one-page waitlist on Cloudflare
  Pages. This is free, needs no code, and is the only test of the number that
  matters most: payers (here, sign-ups) per 1K views.
- **Launch at $39.99/yr, then test $59.99.** $59.99 is above every direct
  competitor (Erly $29.99; Unbed and Flint $39.99; only Sunbreak is higher at
  $69.99) and well above the $34.80 median annual price. The scorecard's own data
  says cheaper annual plans renew better (36% vs 23%). On a TikTok comparison video,
  "the $60 one" loses. Section 4 shows revenue per install comes out about the same
  either way, so start where the conversion risk is lower and test upward once
  there's traffic.
- **Move the AlarmKit alarm to the first update after launch, not "v1.1 someday".**
  It's what made Erly work, it lets you market against Alarmy, and "alarm" is a far
  bigger App Store search term than "screen time". It shouldn't block v1.

### Stop (for now)
- **More research docs.** The research is already deeper than most funded apps'.
  The remaining unknowns (does the lock hold, does the hook convert, does anyone
  get back into bed) can only be answered by a device and an audience.
- **Onboarding polish.** At 4.3K lines it's ahead of the rest of the product. Its
  copy will change anyway once it's wired to the real picker, StoreKit and
  permissions.

## 3. Timeline

Assumes about 15–20 hours a week alongside full-time study, building on Linux with
EAS Build, and a quiet December finals period.

| Dates | Phase | Done when |
|---|---|---|
| Oct 1 – Oct 26 | **Device spike** + concept videos + waitlist | Blocks hold 3 nights with the app closed; 200 steps unlock; revocation detected. 10+ videos posted. |
| Oct 19 | Chase Apple about the distribution entitlement if there's no email | Approved |
| Oct 27 – Nov 30 | **v1 wiring**: real picker, RevenueCat/StoreKit, home states, walk screen, shield text, passes, emergency unlock, settings, analytics | Full loop works on your own phone for a week |
| Dec 1 – Jan 3 | **TestFlight** with 100–300 users from the waitlist | D14 blocking active ≥ 30%, missed blocks < 1 in 50 nights |
| ~Dec 20 | Submit to App Review (Family Controls apps can take longer the first time) | Approved |
| **Jan 4 – 11, 2027** | **Launch**, with daily founder videos | |
| Feb 2027 | First update: AlarmKit alarm, streak widget | |

- **Fallback:** if the spike runs long or review bounces, launch in February. Still
  fine. Launching an unreliable lock in January isn't.
- **The D30 gate becomes D14 for a January launch.** Keep checking D30 on the
  TestFlight group after launch, and pause paid creators if it's under 20%.
- **Chance of hitting a January launch: about 40%.** The usual slips: extension
  debugging on Linux, App Review questions about Family Controls, and exams.
- **The entitlement is the hard dependency for TestFlight.** 2026 forum threads
  report waits from 1 day to more than 6 weeks, and Apple has acknowledged a
  backlog. If there's no approval by about November 10, the December TestFlight
  date slips with it.
- **Watch for a TestFlight-only bug.** There's a known report of blocking silently
  failing for external TestFlight testers (Apple forums thread 784981). The
  self-check from the spike has to report this, or the gate data is worthless.
  Seed a few friends as internal testers to compare.

## 4. Money

### Unit economics at $59.99

| Input | Value | Source |
|---|---|---|
| Installs per 1K views | 1.5, ×1.3 organic | IDEA_SCORECARD (weak evidence) |
| Download → paid | ~7.5% (down from the scorecard's 9.5% for the higher price) | [OPINION] |
| Plan mix | 75% annual, 25% monthly | IDEA_SCORECARD |
| Net per annual payer | $51 (after Apple's 15% small-business cut) | |
| Net per monthly payer, year one | ~$25 (about 3 months average) | [OPINION] |
| **Year-one net per payer** | **~$44** | |
| **Year-one net per install** | **~$3.30** (vs ~$2.85 at $34.99 and 9.5%) | |

**Sanity check:** RevenueCat 2026 puts the median hard-paywall app at $3.09 revenue
per install by day 60, and Health & Fitness trial-to-paid at 35%. Both are close to
these inputs, so the model isn't optimistic about conversion. It's only as good as
the views assumption.

**1M views ≈ 1,950 installs ≈ 145 payers ≈ $6.4K of first-year net revenue.**
At a $3 CPM, 1M paid creator views costs $3K, so paid creators roughly double their
money if conversion hits these numbers.

### Year one after launch

| Views in year one | What it takes | Year-one net | Month-12 MRR | Chance [OPINION] |
|---|---|---|---|---|
| ~2M | Your past pace (about 1M per project), doubled | ~$13K | under $1.5K | 50% |
| ~10M | Near-daily posting on 2 accounts, some creators | ~$64K | $4–6K | 27% |
| ~25M | Daily on 3 accounts plus a creator engine; morning hook lands | ~$160K | $10–15K | 17% |
| One breakout | An Erly-style hit plus top-decile conversion | $500K+ | $40K+ | 6% |

- **"If executed right"** means the spike passes, it launches in January, the gates
  pass and you reach 15–25M views. Then the central outcome is **$8–15K MRR by
  month 12, about $100–160K of year-one net revenue**, before creator spend
  (roughly $20–35K) and taxes.
- **Renewals:** only about 28% of annual subscribers renew in Health & Fitness, so
  year two needs new installs too. A nightly lock that keeps working might beat
  that, which is worth measuring from day one.
- **Your track record cuts both ways.** About 1M views per project is the "fizzle"
  row, but you've done it twice, which most founders haven't. The jump that
  matters is from one-off virality to a daily posting habit, which is exactly what
  the `CONTENT_HOOKS.md` practice account trains.
- **Exit value, for context:** small subscription apps tend to sell for about 3–4×
  annual profit, so a steady $10K MRR app is a five- to six-figure asset even if you
  stop working on it.

## 5. The next three things to do

1. **This week:** a waitlist page on Cloudflare Pages and the first five concept
   videos.
2. **Next two weeks:** EAS dev build with the Screen Time extensions on your iPhone,
   and a test of blocks holding overnight.
3. **Oct 26 checkpoint:** spike passed? Videos producing "what app is this?"
   comments and sign-ups? If both, build v1. If the lock fails, redesign. If the
   videos fail, change the hook before building more.

## 5b. Waitlist targets [OPINION]

Work backwards from what the waitlist has to supply. These rates are rough rules
of thumb, not measured benchmarks.

| By | Sign-ups | Why |
|---|---|---|
| Oct 26 checkpoint | ~300 | Enough to read the signal. The rate matters more than the total (below). |
| Dec 1 (TestFlight) | ~1,000 | Typically only 20–30% of a waitlist actually installs a beta and uses it, so 1,000 sign-ups gives the 200–300 testers the gates need. |
| Jan launch | 2,500–5,000 | A launch email usually converts 10–20% to installs, so that's 250–1,000 day-one installs: enough for early reviews and a ranking bump. |

**The rate is the real test.** Measure sign-ups per 1K video views, per hook.
- About 1+ per 1K views: the hook works. Make more of that video.
- Under about 0.3 per 1K views: change the hook before building more.

Most viewers never tap a bio link, so judge by comparing hooks against each other,
not by the absolute number.

Ask for one thing on sign-up ("What app do you scroll in bed?"). It filters out
casual sign-ups and gives you copy for the videos. Emails go stale over months, so
email the list every 2–3 weeks with build progress.

## 6. Market check (September 30, 2026)

From a web search on September 30. Items marked [UNCERTAIN] are thin.

**Direct and close competitors**

| App | Mechanic | Traction | Price |
|---|---|---|---|
| [Unbed](https://apps.apple.com/us/app/unbed/id6739950076) | Alarm plus a physical NFC tag to tap; can block apps | 4.7★, 744 ratings, updated Sept 29 | $8.99/mo, $39.99/yr |
| Flint: Alarm to Screen Lock (id6780759875) | Alarm stops after squats, a walk or math; apps blocked until challenges are done | Too few ratings to show | $4.99/mo, $39.99/yr, $87.99 lifetime |
| [SleepShield](https://apps.apple.com/us/app/id6753810442) | Apps or the whole device locked until the alarm is dismissed | Small | |
| [Sunbreak](https://apps.apple.com/app/id6752121964) | Bedtime lock that ends at sunrise, with partner emails | 4.6★, 7 ratings | $8.99 / $69.99 |
| [BedLock](https://www.producthunt.com/p/bedlock/bedlock-2) | Locked until an AI checks a photo of your made bed | 1 upvote on Product Hunt | |
| [goob](https://www.goob.now/en) | Photo, push-up or chess alarm; no clear app blocking | Unknown | |
| Groggy | Photo of each morning task unlocks apps | Not indexed yet [UNCERTAIN]; check the App Store by hand | |

Walk-to-unlock apps (Socky, StepScroll, Stroll, FitScreen, Walkaway, Stepely) are a
long tail of tiny all-day "earn screen time" apps. None of them owns the morning
framing.

**Incumbents**
- **Erly:** 200K+ downloads and $50K+ a month by mid-2026, 4.8★ from about 16K
  reviews, $29.99/yr. It grew almost entirely on paid creators at $2–3 CPM with
  guaranteed views ([superframeworks, July 2026](https://superframeworks.com/case-study/erly)).
  This is the playbook to copy.
- **Opal:** ships about weekly. v4.0 added AI that "learns when you sleep". No
  morning or step unlock in the release notes yet, but the sleep features are the
  obvious way in ([version history](https://scout.appaloosa.io/en/apps/ios/com.withopal.opal/history)).
- **Alarmy:** no sign of app blocking on iOS [UNCERTAIN].

**Benchmarks (RevenueCat State of Subscription Apps 2026)**
- Hard paywall: median trial-to-paid 10.7% by day 35, and $3.09 revenue per install
  by day 60, against $0.38 for freemium
  ([RevenueCat](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)).
- Health & Fitness: the highest trial-to-paid rate (35%) and the lowest
  first-renewal rate (about 30%). 68% of revenue comes from annual plans.
- Only 5% of cancelled annual subscribers come back
  ([9to5Mac, May 2026](https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/)).
- No 2026 data compares $59.99 directly with $29.99–39.99 [UNCERTAIN].

**Platform risk**
- The one sec developer's seven Screen Time bugs are still mostly unanswered.
  WWDC 2026 and iOS 27 didn't fix DeviceActivity's long-schedule misfires, and there's
  still no API to read whether a shield is active
  ([forum](https://developer.apple.com/forums/thread/819997),
  [habitdoom](https://habitdoom.com/blog/wwdc-2026-screen-time-wishlist)).
- Distribution entitlement waits run from 1 day to 6+ weeks in 2026 threads
  ([826427](https://developer.apple.com/forums/thread/826427),
  [826340](https://developer.apple.com/forums/thread/826340)).
- Blocking can silently fail for external TestFlight testers
  ([784981](https://developer.apple.com/forums/thread/784981)).
