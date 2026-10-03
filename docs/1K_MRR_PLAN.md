# $1K MRR by December 3, 2026

Written October 3, 2026. The goal: $1,000 MRR within two months, as close to
guaranteed as possible, even if the start is brute force. Six research passes ran the
same day: fast $0→$1K case studies, paid ad costs, a paid creator engine, an organic
short-form playbook, App Review risk, and pricing levers. Their sources are at the
end. This builds on [10K_MRR_PLAN.md](10K_MRR_PLAN.md) and
[LAUNCH_PLAN.md](LAUNCH_PLAN.md). **Nothing here is applied to
[GAME_PLAN.md](../GAME_PLAN.md) yet.** Section 9 lists what would change. Odds,
budgets and dates are **[OPINION]**.

## 1. Verdict

1. **It's possible, but not guaranteed.** Only about 17% of new subscription apps
   ever reach $1K MRR, and the ones that do take a median of about 60 days
   (RevenueCat 2026). This plan gives Locturne roughly 3.5–4 weeks of selling.
2. **Estimated odds [OPINION]:**
   - Founder videos only: **~25–35%** by Dec 3.
   - The full engine below (founder accounts, paid micro-creators, campus,
     a small ads test): **~45–55%** by Dec 3.
   - **~65–75%** by mid-January, when New Year demand peaks for this category.
3. **You can't simply buy it.** Apple Ads, the cheapest paid channel, costs about
   **$118 per paying subscriber** at median funnel rates. That puts 200 payers at
   about $25K. A Meta campaign costs about twice that and can't exit its learning
   phase on a $1–5K budget. An annual subscriber is worth at most about $51 to you.
4. **The levers that do work, in order:**
   1. **Ship earlier:** submit to App Review by about Oct 21, not Nov 3.
   2. **Start posting real footage now, not mid-November.**
   3. **Run paid micro-creators on CPM deals (pay per 1K views), the Erly
      model.** Erly is the closest comparable and reached $1K about 3 weeks after
      its first creator video.
   4. **Get one demo format that shows the downstairs meter within 2 seconds.**
   5. **Push the conversion rate,** because every point of install→trial cuts the
      views you need.

## 2. The math

How RevenueCat counts MRR:
- Annual plans count as price ÷ 12, so $59.99 = **$5.00 MRR**.
- Monthly counts in full, so $9.99 = **$9.99 MRR**.
- Trials count **$0** until they convert.
- MRR is gross by default; "Proceeds" is the view after Apple's 15%.
- Cancelled-but-unexpired subscriptions still count.

| | Value |
|---|---|
| Paying subs for $1K gross MRR, annual only | **~200** (~210 trial conversions after ~4% refunds) |
| Same, net of the 15% fee | ~235 |
| With ~25% of payers on monthly | ~160 payers |
| Download→paid, hard paywall | median 10.7% (RevenueCat 2026), top quartile >20% |
| Install→trial × trial→paid, Health & Fitness | median 6.9% × 37.7%, about 2.6% |
| **Installs needed by about Nov 26** | **~2,000 (strong funnel) to ~5,000 (median)** |
| Installs per 1K views (thin evidence) | 1–5 for a demo-able app; Cal AI's best case about 10 |
| **On-target views needed, launch → Nov 26** | **~0.5M–2.5M** |

**Timing:**
- A 7-day trial started after **Nov 26** doesn't become MRR by Dec 3.
- A trial started on launch day (about Nov 10) first counts on about Nov 17.
- A 14-day trial (the exit-offer arm) has to start by about **Nov 19**.
- So the real selling window is **about 16 days**. Monthly purchases count from
  day 0.

**Cash vs MRR:** 200 annual conversions = $1K MRR but about **$12K in cash** that
month. Track MRR, trials in flight, and cash separately.

## 3. Timeline (working back from Dec 3)

Nov 10, 2026 is a Tuesday. App Review is fastest on Wednesdays.

| Dates | Build / store | Distribution |
|---|---|---|
| **Oct 3–9** | Admin checklist (section 6) **this week**. Finish the overnight spike tests. | Warm up 3–5 TikTok accounts on 2 phones (7–14 days of normal scrolling, then 1 post a day). Founder account starts posting **real build footage**: the shield, manual blocking, a stairs test. Submit the App Store featuring nomination. Build a list of ~150 micro-creators. |
| **Oct 10–16** | Engine work. Upload an external TestFlight build (beta review takes 1–3 days). | DM creators and sign **15–20**. Put up the Cloudflare page (`locturne.app`, with `/c/<name>` redirects per creator). Daily posts. Pitch the TechCrunch writer who covered Steppin (Jan 2025). |
| **by Wed Oct 21** | **Submit a feature-complete 1.0 candidate** with both subscriptions, **no exit offer**, and manual release. Include a demo video and detailed review notes. | Creators get TestFlight and film. Recruit 3–5 campus ambassadors. 2–3 posts a day. |
| **On approval** | Set up a pre-order releasing Tue **Nov 10**. Create creator offer codes and Custom Product Pages. Set up Retention Messaging. | Waitlist CTA → "pre-order on the App Store". |
| **Nov 3–5** | Submit the final build as an update to the pre-order version. Use expedited review only if a rejection blocks the date. | Creators lock their launch-week posts. |
| **Nov 10 (launch)** | Pre-orders turn into downloads. | Creators post. **10–15 unique posts a day** across your accounts. Whop campaign live. Apple Ads test at $50–100/day. Campus flyers. One Reddit "I built this" post per allowed sub. |
| **Nov 12–24** | 1.0.1 with the exit offer, disclosed in review notes; phased release. | Spark-boost the 2–3 videos that are already working. |
| **Nov 17** | First trials convert. | **Checkpoint 1** (section 7). Scale or kill each channel. |
| **Nov 26** | Last trial start that counts by Dec 3. | Keep going: monthly purchases still count. |
| **Dec 3** | Measure. | Whatever the number, keep posting into the January surge. |

**If 1.0 isn't approved by about Oct 31:** skip the pre-order and release manually
the moment it's approved.

**Build scope:** this moves Steps 2–5 of GAME_PLAN from mid-December into
October. If time runs short, use GAME_PLAN's priority order and **cut Scan and the
share card before any reliability work**. Downstairs, steps, passes, emergency
unlock, revocation warnings, the paywall and RevenueCat are the minimum.

## 4. The engine

### 4a. Your own accounts (free, the biggest lever)
- **Accounts:**
  - 1 founder-face account (business account, so it can carry a bio link to the
    Cloudflare page).
  - 2–4 niche accounts: Loc reacting to the morning, sleep/morning slideshows,
    "downstairs challenge".
  - About 3 accounts per phone. Mirror your best posts to Reels and Shorts, once
    each per platform.
- **Never post the same file to two of your own TikTok accounts.** Since Sept 2025
  TikTok removes duplicated or unoriginal posts from the For You feed. Vary the
  footage, hook and caption on every post.
- **Formats, roughly in this mix:**
  - **~50% POV / third-party demo:** "POV: my roommate's phone won't unlock until
    he walks downstairs." A comparable toilet-photo alarm video got 4.8M views in
    6 days.
  - **~30% slideshows with a conflict→reveal hook** ("my mom said I'd never get
    up for 8ams…"). Feature-led hooks flopped in the Larry/Snugly data.
  - **~20% founder face** ("I built an app that…").
  - **Every video shows the live height meter or the apps waking within 2
    seconds.** Demo-first content converted; motivational content without the
    product didn't (Reveille: 3M views, $121 MRR).
- **Path to the app:**
  - TikTok blocks App Store links in personal bios.
  - Say "Locturne" out loud and put it on screen in every video.
  - Pin "it's called Locturne on the App Store".
  - Make sure Locturne ranks #1 for its own name.
- **Comments:** reply to "what app is this?" quickly. Erly's growth came from a
  pinned reply under the creator video.

### 4b. Paid micro-creators (~$1.5–2K)
- **Who:** 15–20 creators with 2K–50K followers in morning routine, StudyTok,
  "that girl", dorm life and sleep.
- **Recruiting:** DM ~150, keep each message under 5 sentences, and put the money
  first. Skip broad influencer blasts (Pushscroll lost $2K on one).
- **Deal:** $30–75 base per video, plus $1.50–2 per 1K views measured at 7 days.
  Cap each video at $300–500. 2–4 videos over 30 days. Ask for a 30-day Spark
  code. **The real app has to be on screen.** Disclose with **#ad**, on screen
  and in speech, and switch on TikTok's commercial-content toggle.
- **TestFlight:** give creators TestFlight builds in October so the footage is
  ready at launch.
- **Scale rule:** move money to the top 3–5 performers on retainer (the Cal AI
  model).

### 4c. Campus (~$300–500)
- **Ambassadors:** 3–5 at your school, paid **$5–10 per paid conversion**, never
  per install.
- **Ambassador posts:** dorm-stairs videos from their own accounts. This also gets
  around the 3-accounts-per-phone limit.
- **Flyers:** "Can't make 8ams?" flyers in dorm stairwells during launch week.
- **Expectations:** evidence that ambassadors drive a hard-paywall app is weak, so
  keep this small.

### 4d. Whop Content Rewards (a $1K experiment)
- **Settings:** a UGC-type campaign, US audience, ~$1 per 1K views, max ~$150 per
  post, a 5K-view minimum, real face plus real app plus #ad.
- **Risks:** bot views, and clipper audiences with little intent to buy. Reject
  accounts whose view counts cluster at the payout cap.
- **Kill rule:** stop by Nov 20 if the attribution survey and campaign links show
  nothing.

### 4e. Paid ads (small, to learn)
- **Apple Ads:** $1.5–3K total, starting at launch, exact-match on intent
  keywords. Check suggested bids in the dashboard first, because no public
  per-keyword costs exist.
  - Examples: "app blocker", "screen time", "stop scrolling", "alarm get out of
    bed".
  - Also run a small competitor campaign (Opal, Alarmy). It's legal, but the
    tap-through rate is low.
  - **Scale only if cost per trial stays under about $15.**
- **Spark Ads:** $300–500, only on organic winners, Nov 12–24.
- **Skip Meta at this budget.**

### Budget tiers [OPINION]

| Tier | Spend | Mix | Odds by Dec 3 |
|---|---|---|---|
| Lean | ~$0–500 | Own accounts + campus | ~25–35% |
| **Recommended** | **~$3–4K** | Own accounts + 15–20 creators ($1.5–2K) + campus ($400) + Apple Ads test ($1K) + Spark ($300); Whop optional | **~45–55%** |
| Brute force | ~$8–10K | The above + Whop $1K + Apple Ads scaled to $4–5K if the cost per trial holds + more creator retainers | ~55–65%, with a real chance of losing money |

Money spent above the recommended tier buys odds slowly. In November most paid
users cost more than the year-one value they bring.

## 5. Product and paywall changes that help the date

1. **Take the exit offer out of 1.0.** App Review has rejected exit-discount
   paywalls (5.6 / 3.1.2), and **switching it on by remote config after approval
   breaks the developer agreement.** Ship it in 1.0.1, disclosed in the review
   notes. Cut the test to **two arms**: 1–3K installs can't support a 3-arm test.
2. **Keep $59.99/yr with a 7-day trial, plus $9.99/mo.**
   - The models show **no-trial and intro-price plans need about the same
     installs** as the current setup, and they bring in less cash.
   - Monthly counts double and starts immediately, so keep it plainly visible.
     Don't hide it.
3. **A weekly plan is not recommended.** $5.99/wk would cut the installs needed to
   about 2,000, but that's mostly how RevenueCat counts weekly plans (×4). Weekly
   plans also look like the scam apps, keep ~5% of payers after a year, and work
   against the honesty brand. The option exists; it's your call.
4. **Skip Black Friday promos.** 57% of apps earned less in Black Friday week
   than in a normal October week, and seasonal offers didn't correlate with doing
   better. Save discounts for January and win-back offers.
5. **Add a "Where did you hear about us?" screen** with creator handles and
   platforms. About 75% of installs show up as "organic", so this is your main
   attribution signal. Also use creator campaign links (`ct=` per creator), offer
   codes ("LOC-NAME = 14 days free") and one Custom Product Page per angle.
6. **Measure the first morning.** The share of trial starters who complete a
   morning unlock is the best early sign of trial→paid. Watch it daily from
   Nov 11.
7. **Paywall compliance:**
   - No toggle paywall.
   - "$59.99/year after 7-day free trial" has to be more prominent than "FREE".
   - Restore Purchases, plus Terms and Privacy links.
   - Specific motion and camera purpose strings (an automated 5.1.1 check now
     rejects vague ones).
   - The listing sells the wake-up mechanic and Loc, not "app blocking" (4.10
     bans charging for the Screen Time APIs themselves).

## 6. Admin checklist (this week; any item can quietly delay launch)

- [ ] Sign the Paid Apps agreement and enter tax and banking details. Without
  them, products don't load in review, which is a 2.1 rejection.
- [ ] **Enroll in the Small Business Program now.** The 15% rate starts 15 days
  after the end of the fiscal month you're approved in.
- [ ] Declare DSA trader status, or the app isn't distributed in the EU.
- [ ] Create the app record and a subscription group **with a localized display
  name** (this fixes "Missing Metadata"). Add both products with prices, review
  screenshots and the 7-day intro offer.
- [ ] Put Privacy policy and Terms URLs on Cloudflare.
- [ ] Fill in the age rating questionnaire.
- [ ] Check the Distribution entitlement on all 4 bundle IDs in the built .ipa
  (`codesign -d --entitlements` per target). Apps with the same three-extension
  setup were auto-flagged under 2.5.1 in Jul–Aug 2026 and sat for weeks, which
  is the main reason to submit early.
- [ ] Featuring nomination in App Store Connect (at least 2 weeks ahead; 3–8 weeks
  is better).
- [ ] Record a 2–3 minute demo on a real iPhone for review notes: the Screen Time
  prompt, the picker, the shield, the downstairs/steps unlock. Write out how a
  reviewer can test the morning without walking 200 steps, and disclose any
  reviewer shortcut.

## 7. Metrics and kill/scale rules

Track these daily from launch:
- views
- installs
- trial starts
- install→trial
- first-morning completion
- trials converted
- MRR (RevenueCat)
- spend per channel
- survey answers per channel

| Checkpoint | Healthy | Action if not |
|---|---|---|
| **Oct 26** (spike + early videos) | Spike gates pass; ≥1 video >50K; "what app?" comments | Gates failing → fix the engine before anything else. No traction → change the hook, not the volume |
| **Nov 14** (launch +4 days) | Install→trial ≥8%; ≥2 installs per 1K views | Under 5% install→trial → fix onboarding/paywall first; buying traffic into a leaky funnel wastes money |
| **Nov 17** (first conversions) | Trial→paid ≥30%; creator cost per trial <$15 | Move money to the top creators and the best format; kill Whop or Apple Ads if the cost per payer is over ~$60 |
| **Nov 24** | Trajectory ≥150 payers by Dec 3 | Go all-in on what works for the last 2 days of trial starts, then count on monthly purchases |
| **Dec 3** | $1K MRR | If short: the trials in flight plus the January surge make ~mid-January the realistic backstop. Don't discount to chase the date |

## 8. Risks

- **App Review delay**, especially the automated Screen Time flag. Mitigation:
  submit by Oct 21.
- **The build slips past Nov 3.** Every week of slip removes about a third of the
  selling window. Mitigation: cut Scan and the share card first.
- **No video breaks out.** Results follow a power law: Stronger had 11 of 725
  videos pass 1M views. Mitigation: volume across several accounts, and paid
  creators so you aren't relying on one account.
- **Funnel well below median.** That doubles everything else. Mitigation: the
  Nov 14 checkpoint before scaling spend.
- **Spike-then-decay.** Brainrot's June was lower than its first 5 days. MRR at
  Dec 3 has to come from steady posting, not one spike.
- **Student time.** 10–15 posts a day plus finishing the app is a lot. Batch-film
  on weekends.

## 9. What this would change in GAME_PLAN (not applied)

1. **Launch date:** Jan 2–5, 2027 → **Nov 10, 2026** (submit by Oct 21, pre-order).
2. **Marketing start:** mid-November → **now**, using real build footage only (still
   no concept videos of an app that doesn't exist).
3. **Exit offer:** out of 1.0, in 1.0.1, two arms.
4. **New in v1:** the "where did you hear about us" screen, creator offer codes and
   campaign links.
5. **Budget:** ~$3–4K for creators, campus and an ads test.

## 10. Decisions for you

1. Is the launch on **Nov 10** with submission by **Oct 21**? Or is Nov 3
   "feature-complete" too optimistic for an Oct 21 review build?
2. Budget tier: lean, recommended (~$3–4K), or brute force (~$8–10K)?
3. Do you start posting real build footage **this week**? This changes the
   Oct 1 "mid-November" decision.
4. A weekly plan: no (recommended) or yes?
5. Is "$1K MRR" gross (RevenueCat default, ~200 payers) or after Apple's cut
   (~235)?

## Sources

**Case studies and base rates**
- RevenueCat SOSA 2026 via SaaStr: <https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/>
- RevenueCat SOSA 2026: <https://www.revenuecat.com/state-of-subscription-apps>
- Erly: <https://superframeworks.com/case-study/erly>
- Brainrot: <https://www.wearefounders.uk/he-built-an-app-to-fix-his-phone-addiction-it-made-26k-in-30-days/>
- Pushscroll: <https://superwall.com/blog/our-app-makes-usd30k-month-profit-using-this-simple-strategy-copy-us>
- Dumbphone: <https://shortimize.com/blog/20k-downloads-and-9k-mrr-in-78-days-how-this-indie-app-turned-minimalism-into-millions-of-views>
- Cal AI: <https://getlatka.com/interviews/cal-ai-zach-yadegari-2025>, <https://blog.funnelfox.com/cal-ai-influencer-marketing/>
- QUITTR: <https://www.starterstory.com/quittr-breakdown>
- RiseApp: <https://www.starterstory.com/riseapp-breakdown>
- Stronger: <https://shortimize.com/blog/the-slideshow-strategy-that-generated-700000-users-in-275-days>
- Airbuds: <https://www.shortimize.com/blog/airbuds-300-tiktok-a-day-strategy-to-2-on-the-appstore>
- Flame: <https://www.stork.ai/blog/how-5-phones-built-a-10kmonth-app>

**Apps in this niche that stalled (TrustMRR revenue verified)**
- Reveille: <https://trustmrr.com/startup/reveille>
- BlockIt: <https://trustmrr.com/startup/blockit>
- Shutout: <https://trustmrr.com/startup/shutout>
- Habit Doom (self-reported): <https://habitdoom.com/blog/341-downloads-first-revenue>
- Touch Grass: <https://techcrunch.com/2025/03/17/this-app-limits-your-screen-time-by-making-you-literally-touch-grass/>

**Paid acquisition**
- AppTweak Apple Ads benchmarks: <https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks>
- Adapty Apple Ads 2026: <https://adapty.io/blog/apple-ads-benchmarks-2026/>
- Adapty, holiday seasonality: <https://adapty.io/blog/state-of-holidays-for-subscription-apps/>
- Adapty, first $10K on Meta: <https://adapty.io/blog/first-10k-meta-ads-subscription-apps/>
- Meta Q4 rates (weak source): <https://geistm.com/blog/meta-rate-trends-q4-2025/>
- RocketShip HQ (weak source): <https://www.rocketshiphq.com/?p=5516>

**Creators and organic**
- Whop Content Rewards: <https://docs.whop.com/memberships-and-access/third-party-apps/content-rewards>
- Clipping CPMs: <https://www.clipspeed.ai/blog/whop-content-rewards-clipping-guide.html>
- Bot-view risk: <https://luminaclippers.com/blog/content-rewards-bot-views>
- Sideshift: <https://sideshift.app>
- FTC endorsement guides: <https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking>
- TikTok blocks App Store bio links: <https://techcrunch.com/2023/03/08/tiktok-begins-blocking-links-to-app-stores-from-creators-bios/>
- TikTok unoriginal-content rules: <https://www.bigseller.pro/blog/articleDetails/3778/tiktok-unoriginal-content.htm>
- POV alarm video: <https://www.newsweek.com/woman-cant-wake-up-for-class-but-her-traumatic-solution-works-11557885>
- a16z on campus ambassadors: <https://future.a16z.com/college-ambassador-program-how-to-for-startups/>
- Steppin coverage: <https://techcrunch.com/2025/01/14/kayak-founder-returns-with-steppin-an-app-that-locks-you-out-of-social-media-until-you-go-for-a-walk>
- Apple featuring: <https://developer.apple.com/app-store/getting-featured>
- App Store campaign links: <https://developer.apple.com/help/app-store-connect/view-app-analytics/manage-campaigns>
- Offer codes: <https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes>

**App Review**
- Review times: <https://www.choicely.com/tutorials/how-long-does-app-review-take>
- Screen Time auto-flag thread: <https://developer.apple.com/forums/thread/838802>
- Entitlement on every target: <https://developer.apple.com/forums/thread/779449>
- Exit-offer rejection: <https://developer.apple.com/forums/thread/768912>
- Toggle paywall ban: <https://www.revenuecat.com/blog/growth/r-i-p-toggle-paywall-we-hardly-knew-ye/>
- Purpose-string check: <https://blog.eternalstorms.at/?p=9678>
- Small Business Program: <https://developer.apple.com/app-store/small-business-program/>
- Pre-orders: <https://developer.apple.com/app-store/pre-orders>

**Pricing**
- RevenueCat MRR definition: <https://www.revenuecat.com/docs/dashboard-and-metrics/charts/monthly-recurring-revenue-mrr-chart>
- Trial length: <https://www.revenuecat.com/blog/growth/free-trial-length>
- Adapty plan types: <https://adapty.io/blog/weekly-monthly-annual-subscription-plan/>
- Superwall testing: <https://superwall.com/blog/how-to-ab-test-a-paywall>
