# Getting to $10K MRR: what has to be true

Written October 2, 2026. The question: how does Locturne get to $10K a month, and
what gives it the stand-out factor? Three research passes ran on the same day:
case studies of apps that got from $0 to $10K+, competitor reviews and new
launches, and the levers that keep paying users. This builds on
[STAND_OUT_ANGLES.md](STAND_OUT_ANGLES.md) and
[STRATEGY_DEEP_DIVE.md](STRATEGY_DEEP_DIVE.md) rather than repeating them.
[GAME_PLAN.md](../GAME_PLAN.md) stays the source of truth, and nothing here is
applied to it yet. Rankings and estimates are **[OPINION]**. Sources are at the
end.

## 1. Verdict

1. **The mechanic won't make it stand out.** "Locked until you do a physical
   thing" is now a commodity. The apps in this exact niche with verified revenue
   data all earn under $500 MRR. Reveille got 3M views from five faceless accounts
   and makes $121 a month (section 3).
2. **The stand-out factor is one thing you can see in 3 seconds, plus a voice.**
   Every winner had one: a push-up on camera (Erly), "photo in, calories out" (Cal
   AI), a brain that rots (Brainrot). Locturne's is **"my apps are asleep until I
   walk downstairs"**, with the height meter moving on screen. No competitor uses
   the barometer. Nobody else has a character either.
3. **Most of the product is already right.** The plan already covers the gaps the
   reviews point to: automatic proof with no camera and no hardware, changes that
   wait until the next bedtime, loud warnings when access is revoked, and humane
   passes. What's missing is a handful of retention features and, above all, a
   distribution engine.
4. **$10K MRR is mostly about distribution, and renewals decide whether it lasts.**
   You need about 2,350 paying annual subscribers. In Health & Fitness, only about
   25–30% of annual subscribers renew, so the base drains every year.
5. **The fastest real path:** your face on video every day, plus paid
   micro-creators on performance CPM, starting the moment the morning flow works
   on your phone. Every app that got there fast had either a founder audience or
   a paid creator engine at launch. Organic-only founder video got Puff Count
   there, but it took about four years.

## 2. The math

| Input | Value |
|---|---|
| Net per annual sub per month | $59.99 × 0.85 ÷ 12 ≈ **$4.25** |
| Subs needed for $10K MRR, annual only | **≈ 2,350** |
| Realistic mix (75% annual, 25% monthly at ~$8.50 net) | ≈ 1,900 annual + 600 monthly |
| Download → paid (hard paywall, $59.99) | ~7.5% [OPINION]; RevenueCat median 10.7% |
| Installs needed in year one | **≈ 30–35K** |
| Installs per 1K views (from IDEA_SCORECARD) | ~1.5–2 |
| **Views needed in year one** | **≈ 15–25M** |

- That's about **50–70K views a day**, every day for a year. Your past total of
  about 1M views per project is roughly two to three weeks of that pace.
- **Renewal is the treadmill.** At 25% annual renewal, three of every four
  subscribers have to be replaced each year. If renewal rises from 25% to 40%, the
  views needed in year two drop by about a fifth.
- **The month-12 problem:** an annual plan bought in month 2 counts toward MRR
  until month 14. So hitting $10K at month 12 mostly means having sold about 2,000
  annual plans during the year. The renewal fight starts in year two.

## 3. What the winners did that the clones didn't

### Winners (self-reported or estimated, so treat them as rough sizes)

| App | Result | Price | What spread it |
|---|---|---|---|
| **Erly** (push-up alarm) | $1K by week 3, $50K+/mo by month 4 | $29.99/yr, $9.99/mo | First on AlarmKit, push-up shown on camera; paid creators at $2–3 CPM |
| **Brainrot** | $26K in its first 30 days | Superwall paywall | **450 days of daily founder vlogs** and 200K+ followers before launch |
| **Unrot** | ~$45K/mo (estimate) | Trial behind a hard paywall | 31-screen chat onboarding voiced by a brain mascot |
| **Focus Friend** | ~$100K/mo, #1 App Store, Apple award | $14.99/yr | A bean that knits while you stay off your phone; Hank Green's audience |
| **Opal** | $10M ARR with 11 people | Expensive annual from day one | Paid ads judged on day-8 return, 121 paywall tests, blocks scheduled during onboarding |
| **Cal AI** | $1M MRR in 7 months | $29.99/yr | About 250 creators on monthly retainers |
| **Puff Count** | $44K/mo, then sold | — | Founder-face TikTok, 50M organic views, about 4 years |

### Clones in Locturne's exact niche (verified RevenueCat data on TrustMRR)

| App | Mechanic | MRR |
|---|---|---|
| Reveille | Mission alarm; 3M views from 5 automated accounts | **$121** |
| BlockIt | Apps blocked until push-ups | **$453** |
| Rizen | No-snooze alarm | **$279** |
| Alarm Arcade | Game alarm | $33 all-time |

### The pattern

1. **One visual idea, not a menu of features.** The clones advertised lists like
   "push-ups, object hunt, flappy bird". So lead with downstairs, keep steps as
   the fallback, and keep Scan quiet in the marketing.
2. **A real face or a paid creator, not a faceless farm.** Faceless automation is
   the failure pattern in this niche.
3. **Something new to ride.** Opal was first on the Screen Time API, Erly was first
   on AlarmKit, and Brainrot and Unrot rode the word "brainrot". Locturne is late
   to both APIs. The barometer is its new thing: "my phone knows if I actually
   went downstairs" is a fresh claim.
4. **A hard paywall from day one, with onboarding that sells an identity.** Unrot's
   mascot-voiced onboarding is the best evidence that a character converts in
   this category. That supports giving Loc's voice the run of the quiz.
5. **The product works on its own on day two.** Opal credits scheduled blocks for
   retention. The bedtime schedule already does this.

## 4. The stand-out factor, specifically

Each item below is backed by both review evidence and the case studies. Ranked
[OPINION].

### 1. "Your legs are the key" (own the downstairs demo)
- **Gap:** no competitor uses a sensor to check that you got out of bed. Opal Sleep's
  "Morning Assist" is a one-hour timer you can wait out in bed. Alarmy and Erly
  reviews are full of failed photo checks. Brick, Halo, Unbed and Anchor all need
  something you carry or scan. **Evidence: strong.**
- **What it needs:** the downstairs screen has to look great on camera. That means
  a big live height reading, Loc narrating, and a clear moment when the apps wake
  up (restrained, no splashes, per the moon decision). This screen is the ad.
- **Line:** "No tag. No dock. No photo. Your legs are the key."

### 2. Loc, everywhere a decision happens
- **Evidence:** Focus Friend, Finch, Pixel Pals and Duolingo all put the character
  outside the app (widget, Dynamic Island, notifications), and it reacts to what
  the user does. That evidence is case-based but consistent. Unrot's mascot
  onboarding sells in this exact category.
- **What it needs:** the shield line, the morning walk, notifications and the share
  card are all in v1 already. Add next: **a Live Activity running from bedtime
  through the morning lock** (Loc asleep, then grumpy until you're up) and a
  lock-screen widget. GAME_PLAN has both in v1.1. Keep them first in line after
  launch, alongside AlarmKit.
- **Failure mode:** jokes wear out (repeat guard, STAND_OUT_ANGLES §2.1). When the
  brand is a character, the company's behaviour becomes the character's
  reputation. Duolingo lost about 400K TikTok followers after its AI memo.

### 3. The stay-up check (the back-to-bed fix)
- **Gap:** "Phone apps don't stop sleepy-me from going back to bed after I shut off
  the alarm." Nobody checks that you *stayed* up. Every tap-a-tag app has this
  hole. **Evidence: medium** (an explicit want, but from a single quote).
- **What it needs:** this is open decision D4. **Recommend building it as an
  opt-in "Strict mornings" setting for the beta:** after the downstairs trip, a
  second short check about 10 minutes later. It's a real, filmable difference
  ("it checks I didn't crawl back to bed") and it costs little on top of the
  unlock engine.

### 4. Honesty as the brand: the lock *and* the bill
- **Lock:** about 16% of 1–3 star reviews are about blocks that **silently** stopped
  working. The top request on Opal's forum, open since February 2025, is to stop
  people revoking Screen Time access in one second. Already planned: revocation
  warnings and the nightly self-check. **Add:** an optional onboarding step to
  hand the Screen Time passcode to a partner. Since iOS 26.4, revoking access
  needs that passcode (STAND_OUT_ANGLES §8 notes this). It's the honest version
  of "unbeatable".
- **Bill:** about 24% of 1–3 star reviews in the category are about surprise
  renewals or price. Already planned: the Tonight / Day 5 / Day 7 timeline and
  the day-5 reminder. Make Loc say it ("Heads up. Day 7 I charge you $59.99.
  Cancel in Settings if I'm not worth it."). At $59.99 this is a retention
  feature, not a legal chore.

### 5. One app for both ends of the night
- **Gap:** competitors are either a bedtime lock or an alarm-mission app, so people
  stack two apps or buy hardware. **Evidence: medium-strong.** Already the core
  loop, so keep "both ends of the night" in the App Store subtitle.

### Watch closely: Anchor
Anchor has the same $59.99 annual price, three overrides a month (your passes) and
"Set in Stone" (your next-bedtime rule). It's still pre-launch. Its key is a scan.
Locturne's answer is that the barometer is automatic and covers bedtime as well.
Check its App Store page at least monthly.

## 5. Keeping the money (the levers after the install)

Ranked [OPINION]. Numbers are from RevenueCat's 2026 State of Subscription Apps
unless marked otherwise.

1. **Test a 14-day trial against 7 days on the main paywall, not just the exit
   offer.** On annual plans, 5–9 day trials renew at about 25% the first time and
   10–16 day trials at about 36%. That's a correlation (apps choose their own
   trial length), but it fits a habit that takes two weeks. The exit offer's
   default arm is already 14 days, so this extends a test you already run. Judge
   it on net revenue per install at day 35, the same way.
2. **Apple's Retention Messaging API** in the cancel flow. RevenueCat reports an
   average 36% of cancelling users saved in Apple's beta (a vendor figure). Pair
   it with a "Loc's year" recap sent 7–14 days before each annual renewal.
3. **A transaction-abandon paywall.** About half of started purchases are never
   finished. Across 18 Superwall apps, a follow-up offer to those users brought in
   17% of revenue, with half the refund rate. It needs care: one offer, no timer,
   the same honesty rules as the exit offer.
4. **Win-back offers** (iOS 18+) for lapsed annual subscribers. Only about 5% come
   back unprompted, so expect a small lift; it's cheap to set up.
5. **The morning share card in v1, plus a monthly "Loc's report card".** Spotify
   Wrapped is the extreme case (downloads +21–35% in Wrapped week). The useful part
   is a screenshot-native card that makes the user look good, which doubles as raw
   footage for creators.
6. **Price stays $59.99** (decided 2026-10-01). One Superwall case found $44.99
   beat $59.99 by 10% on revenue per user, and cheaper plans renew better (36% vs
   23%). High-priced apps still earn far more per payer, so keep $59.99 and run
   $44.99 as an arm once there's traffic.

## 6. Distribution: where the $10K actually comes from

1. **Founder face, daily, from mid-November.** Brainrot and Puff Count are your
   path. Real footage of the real lock, in your dorm, on your stairs. Post on
   2–3 accounts. Track sign-ups per 1K views per hook (STRATEGY_DEEP_DIVE §5b).
2. **A performance-CPM micro-creator program from launch.** In 2026 these run
   about $0.50–1.00 per 1K views, stepping down as views grow. Paid TikTok costs
   $8–18 CPM. Recruit 30–50 creators with 500–15K followers each, posting 3–5 real
   morning videos a month. Put the 2–3 best on fixed retainers, Cal AI style.
   **Never** faceless automation (Reveille).
3. **Long-tail search first, then exact-match Apple Ads with a Custom Product Page
   per intent.** Examples: "stop scrolling in bed", "app blocker morning", "alarm
   make me get up". Custom Product Pages showed +23% downloads on the same spend
   (vendor data). Look up real keyword costs in the Apple Ads planner, since none
   are published.
4. **App Store featuring.** Focus Friend's 2025 Cultural Impact award shows Apple
   rewards healthy-phone apps with craft and character. Nominate before the New
   Year window (already in Step 5).
5. **Affiliates later.** one sec pays 40% of the first year plus 30% recurring. Keep
   it in mind for sleep and productivity creators once you have reviews.

## 7. Suggested changes to GAME_PLAN (not applied)

1. Add Anchor, Opal Sleep's Morning Assist, Halo by ScreenZen, lumi and Lights Out
   to the competitor line.
2. Decide D4 as **build "Strict mornings" (the stay-up check) as an opt-in for the
   beta.**
3. Add an optional "hand your Screen Time passcode to someone" step to onboarding.
4. Add a 7- vs 14-day main-trial test to Step 3 next to the exit-offer test, and
   add the Retention Messaging API and win-back offers to Step 3 or v1.1.
5. Keep the Live Activity and widget at the front of v1.1, with AlarmKit.
6. Marketing: add the performance-CPM creator program at launch, and an explicit
   "no faceless accounts" rule.

## 8. Biggest risks

- **Views.** 15–25M in year one is 15–25× your past per-project total. Everything
  else is secondary.
- **Survivorship bias.** The case studies only cover winners. The verified data in
  this niche is mostly under $500 MRR.
- **Price friction.** The closest analogs charge $29.99. $59.99 has to *feel* worth
  it on the paywall and in the first week.
- **Platform reliability.** One silent failure means a 1-star review. The spike
  gates still come first.

## Sources

**Case studies**
- Erly: <https://superframeworks.com/case-study/erly>, <https://www.stork.ai/blog/this-push-up-alarm-app-hit-50kmonth>
- Opal: <https://speedinvest.com/blog/scaling-smart-how-opal-built-a-10m-arr-business-in-just-2-years>, <https://revenuecat.com/blog/growth/kenneth-schlenker-opal-sub-club-podcast>
- Brainrot: <https://www.wearefounders.uk/he-built-an-app-to-fix-his-phone-addiction-it-made-26k-in-30-days/>, <https://www.indiehackers.com/post/fYbp8x4WWqltdifUwCZJ>
- Unrot (estimate): <https://screensdesign.com/showcase/unrot-earn-your-screentime>
- Focus Friend: <https://www.builtbyfoundry.io/blog/hank-green-focus-friend-app>, <https://www.macstories.net/news/apple-announces-45-app-store-awards-finalists-for-2025/>
- Cal AI: <https://superframeworks.com/case-study/cal-ai>, <https://getlatka.com/interviews/cal-ai-zach-yadegari-2025>
- Puff Count: <https://saas-accelerator.beehiiv.com/p/why-i-sold-my-44k-mrr-app>
- one sec: <https://www.revenuecat.com/blog/growth/frederik-riedel-expected-12-his-app-cut-screen-time-by-57>, <https://one-sec.app/affiliate/>
- QUITTR: <https://www.starterstory.com/quittr-breakdown>, <https://vc.ru/growth/1762617-kak-quittr-dorosli-do-35k-den> (the revenue figures conflict)
- Niche clones: <https://trustmrr.com/startup/reveille>, <https://trustmrr.com/startup/blockit>, <https://trustmrr.com/startup/rizen-no-snooze-alarm-clock.md>, <https://trustmrr.com/startup/alarm-arcade>

**Reviews and competitors**
- Category complaint share (a competitor's blog, medium evidence): <https://unstar.app/blog/opal-forest-freedom-one-sec-jomo-screen-time-apps-ranked-2026>
- Opal forum, the passcode request: <https://community.opalapp.com/t/feature-request-lock-opals-screen-time-access-behind-screen-time-passcode/567>
- Opal Sleep: <https://opalapp.com/help/how-do-i-use-sleep-mode>, <https://community.opalapp.com/t/introducing-sleep/10292>
- Erly reviews: <https://apps.apple.com/us/app/-/id6751428380?see-all=reviews>
- Alarmy reviews: <https://apps.apple.com/us/app/alarmy-alarm-clock-sleep/id1163786766?see-all=reviews>
- Unbed reviews: <https://apps.apple.com/us/app/unbed/id6739950076?see-all=reviews>
- Back-to-bed quote: <https://andrewjrose.substack.com/p/dont-build-habit-simply-install-an/comments>
- Anchor: <https://www.anchormorning.app/>. Halo: <https://screenzen.co/halo>. Lights Out: <https://apps.apple.com/us/app/lights-out-bedtime-lock/id6793205976>. lumi: <https://www.producthunt.com/products/lumi-sleep-lock-alarm>

**Retention, pricing, distribution**
- RevenueCat 2026: <https://www.revenuecat.com/state-of-subscription-apps>, <https://www.revenuecat.com/blog/growth/free-trial-length>, <https://www.revenuecat.com/blog/average-subscription-renewal-rates-by-app-category/>
- Retention Messaging API: <https://www.revenuecat.com/feature/retention-messaging>
- Win-back: <https://www.revenuecat.com/blog/growth/guide-to-apple-win-back-offers>, <https://heise.de/-11310636>
- Transaction-abandon paywall: <https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study>
- Price tests: <https://superwall.com/solutions/price-testing-optimization>
- Finch retention: <https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl>
- Duolingo backlash: <https://www.ypulse.com/newsfeed/2025/05/22/duolingo-deleted-their-instagram-and-tiktok-posts-after-getting-backlash-over-ai/>
- Spotify Wrapped: <https://thehustle.co/12062021-Spotify-Wrapped>
- Creator CPMs: <https://viral.app/blog/guides/sub-1-cpm-ugc-playbook>
- Custom Product Pages: <https://trysonar.app/blog/custom-product-pages-for-apple-search-ads>, <https://www.mobileaction.co/report/apple-ads-2026-benchmark-report/executive-summary/>
