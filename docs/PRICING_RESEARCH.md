# Weekly vs monthly vs annual: should Trundle sell a weekly plan?

Researched 2026-09-24. **The question:** is it true that a weekly subscription with a
1-week free trial drastically increases how many users pay, and does that apply to
Trundle?

Current plan (see `ONBOARDING_CONVERSION.md`; `PRICES` in `content.ts` is canonical):
- $59.99/yr with a 7-day trial (raised from $39.99 on 2026-09-25)
- $9.99/mo with no trial, behind "See other plans"

Evidence tags:
- **[C]** causal: an A/B test.
- **[X]** correlational: a benchmark across many apps.
- **[A]** anecdotal: a founder's self-report.

## Verdict

**The claim is half true.**

**What's true:**
- A weekly plan with a trial does get more people to pay *something*.
- Adapty's data (16K apps) shows weekly converting 1.7–7.4x better than annual [X].
- In the one clean three-arm A/B test (a PDF scanner, Apphud), conversion went from 1.21% on monthly to 2.29% on weekly with a trial, and ARPU doubled [C].
- It works because the first charge after the trial is only about $5. Apple's rule that the billed amount must be the biggest price on the paywall lets "$4.99" be the headline number.

**What's not true, or not shown:**
- **It has not been shown to earn more money over time in a habit or health app.** Weekly subscribers almost all churn:
  - RevenueCat 2026: about 1–2% of weekly subscribers are still paying after a year, vs 20–40% on annual [X].
  - Grouped by each app's main plan, weekly-led apps make about half the revenue per install of annual-led apps at day 60 [X].
- **Weekly is rare in Trundle's category, and annual is growing there.**
  - Health & Fitness gets about 60% of its revenue from annual plans (Adapty 60.6%, RevenueCat 59%), and annual's share is still rising [X].
  - Only 4.5% of Health & Fitness subscriptions are weekly [X].
- **The "weekly + trial has the highest LTV" stat is one vendor's cross-app correlation.**
  - It comes from Adapty and quotes inconsistent numbers ($49.27 vs $54.50).
  - The apps behind it are mostly utility, photo and AI apps running paid ads.
  - It compares different apps, so it can't tell you what would happen if *you* switched.
- **The viral version of the tactic is dead on iOS.** It was a toggle paywall: annual with no trial vs weekly with a free trial.
  - Apple has rejected trial toggles under 3.1.2 since January 2026.
  - In April 2026 Apple pulled Cal AI for four days, partly for showing a weekly price bigger than the billed amount.

**For Trundle: keep annual with a trial as the default. Don't switch to a weekly plan with a trial.** Once there's enough traffic, a weekly plan without a trial is worth one A/B test as a secondary option. The reasons follow.

## Why the claim spreads

- **"Payers" and "revenue" get mixed up.** A weekly trial converts to a $4.99 charge, so the share of trial users who pay looks great. What matters is dollars per install at day 60–90, and that metric rarely appears in the screenshots.
- **The people posting are in weekly's best niche.** They run AI, looksmax, photo and utility apps. The need is one-off or novelty-driven, and paid Meta/TikTok ads need cash back within weeks. There, weekly really wins. Utilities get 73.6% of revenue from weekly [X].
- **Weekly's share is shrinking in health.** Its share of all app revenue grew from 43% to 55% (Adapty 2023→2025). The same data shows Health & Fitness moving the other way.

## The data

### Conversion (supports the claim)
| Figure | Source | Type |
|---|---|---|
| Install→trial at upper-mid prices: weekly 9.8%, annual 1.8%, monthly 0.3% | Adapty SOIS 2026 | X |
| Weekly converts 1.7–7.4x better than annual at every price tier | Adapty 2026 | X |
| PDF scanner conversion: monthly 1.21%, weekly 1.63%, weekly + trial 2.29%; ARPU $0.12 → $0.24 | Apphud case study (2023) | C |
| Toggle paywall (weekly + trial vs annual): +19% ARPU in Fits | RevenueCat (2026) | C, but this pattern is now banned |
| Adam Lyttle: weekly revenue $2.5K → $5.3K after adding weekly + trial | RevenueCat / X | A |

### Retention (contradicts the claim)
**Still paying after a year:**
| Plan | RevenueCat 2026 median | Adapty 2026, with trial |
|---|---|---|
| Weekly | 1–2% | 5.5% |
| Monthly | 6–14% | 14.2% |
| Annual | 20–40% | 19.9% |

**Other retention data:**
- Weekly year-1 retention fell 4.2% → 3.4% in RevenueCat 2025 ("rarely exceeds 10% at six months") [X].
- Weekly subscriptions lose 42–65% at the first renewal (RevenueCat, Sep 2026) [X].
- First-renewal rates in Health & Fitness: weekly 54%, monthly 57%, annual 25% (RevenueCat 2026) [X].
- Share of subscribers with auto-renew still on: weekly 18.7%, monthly 39.2%, yearly 83.4% (RevenueCat 2026) [X].

### Revenue per install (contradicts the claim)
- By each app's dominant plan, at day 14 / day 60 (RevenueCat 2026) [X]:
  - Yearly: $0.36 / $0.46
  - Monthly: $0.18 / $0.29
  - Weekly: $0.19 / $0.32
- One analyst's cut of the same data puts weekly at about 1/5 of yearly [X].

### Does a trial help a weekly plan?
- Weekly trial users renew at 59.2% vs 37.0% for people who bought directly (Adapty 2026) [X]. Selection bias applies: people who choose a trial differ from people who buy directly.
- Adapty 2025 found that a trial lifts weekly day-30 retention from 23% to 42% [X].
- Trials **lower** 12-month LTV in Lifestyle (−21%) and Productivity (−14%), and raise it in Health & Fitness (+64%) (Adapty 2026) [X].
- Trials of 5–9 days convert about 37% of trial users to paid. Trials of 4 days or less convert 25.5%. With 3-day trials, 55% of cancellations happen on day 0 (RevenueCat 2026) [X]. This supports keeping 7 days.

### Refunds and reputation
- Weekly has the lowest refund rate: 2.6% vs 4.2% for annual (Adapty 2025) [X].
- The damage to reputation is qualitative but real:
  - Avast's "fleeceware" report covered 204 apps using 3-day trials into $4–12/week plans.
  - Practitioners call weekly plans "predatory" for long-term products.
  - California's trial rules (AB 2863) have applied since July 2025. The UK's subscription rules arrive in 2027, and the FTC restarted its rulemaking in March 2026.

### Apple rules
- A free trial on a weekly plan is allowed, for any trial length.
- Seven days is the shortest subscription Apple allows.
- The billed amount must be the most prominent price on the paywall.
- Trial toggles are rejected (since January 2026).
- Plans shown side by side are fine, including a badge on the plan that has the trial.

## Competitors (US App Store, checked 2026-09-24)

| Sell a weekly plan | Don't |
|---|---|
| **Opal** ($4.99/wk, plus a $9.99 "Student Weekly"; annual $99.99 with a 7-day trial is the main plan) | **Every sleep/morning app checked:** Rise, Alarmy, Erly, Wayk, Calm, Headspace, Sleep Cycle, BetterSleep, ShutEye |
| Roots ($7.99/wk) | **Most screen-time apps:** one sec, Jomo, Freedom, Clearspace, Blok, Refocus, QUITTR |
| Brainrot ($4.99/wk), WalkBlock ($3.99/wk, a walk-to-unlock clone) | **Habit apps:** Finch, Fabulous, Stoic |
| Umax ($3.99/wk is the main plan), Cal AI (tested weekly, settled on $29.99/yr) | |
| BetterMe and Headway (billed in 4- and 12-week cycles) | |

**What stands out:**
- Freedom's setup is exactly Trundle's: $39.99/yr with a 7-day trial.
- QUITTR grew to a reported $250K MRR in about 4 months from TikTok with **no weekly plan**, at $12.99/mo and $39.99/yr.
- Opal is the closest competitor and does sell weekly, but only as a secondary option. It keeps annual with a 7-day trial as the main plan, and its student weekly targets teens.

## Why weekly fits Trundle worse than the average app

1. **The annual plan is part of how Trundle works.**
   - Trundle is a commitment device: you lock your future self out of your apps.
   - With a weekly plan, you're one cancellation away from escaping the lock after any bad morning.
   - With an annual plan, you've committed to the habit. Adapty says the same of Health & Fitness: "the annual commitment is part of the product psychology."
2. **The value builds over months.** The first week is the hardest: the lock bites and there's no streak yet. With weekly billing, the first renewal lands at the worst possible moment.
3. **Growth is organic, not paid ads.** Weekly's biggest advantage is fast payback on ad spend. Trundle gets its installs from short-form video, so it has no ad budget to earn back and doesn't need that speed.
4. **The math is close, not a clear win.** This is a rough model, not a measurement: $4.99/wk after a 7-day trial, a 15% Apple fee, and weekly retention from the benchmarks above.

   | Scenario (weekly year-1 retention) | Weekly payments per payer, year 1 | Net per payer |
   |---|---|---|
   | Pessimistic (1.5%) | 5.9 | $25 |
   | Middle (3%) | 7.7 | $33 |
   | Optimistic (5.5%) | 9.6 | $41 |
   | **Annual $39.99** | 1, and about 28% renew | **$34 in year 1, about $43.50 over 2 years** |

   Weekly only wins if it brings in roughly **1.3–1.7x more paying users than annual** (1.05x in the optimistic case). The cross-app data suggests that's possible. Health & Fitness buyers' strong preference for annual suggests it isn't. Only a test inside Trundle can settle this.
5. **The audience does skew young.** TikTok viewers include teens with no card or a small budget, which is Opal's reason for a student weekly. That's the one real argument *for* testing a weekly plan.

## Recommendation

1. **At launch, keep what's planned:**
   - Annual $39.99 with a 7-day trial is the only plan on the paywall.
   - The "See other plans" sheet has monthly with no trial.
   - This is the category-standard setup (Freedom, Rise, Headspace, Opal's main plan).
2. **Don't put a trial on a weekly plan.** It moves the trial away from annual, where it lifts LTV most in Health & Fitness. It also turns the lock into a week-by-week decision.
3. **Test weekly without a trial, as a downsell, once there's traffic.** A few thousand paywall views per arm is the minimum.
   - **Control:** annual + trial on the page; monthly $9.99 in the sheet.
   - **Variant:** the same, but the sheet offers **$4.99/week, no trial** instead of monthly (or next to it).
   - **Judge it by** net revenue per install at day 60 and day 90, plus refunds and 1-star reviews that mention billing. Don't judge it by conversion rate or trial starts.
   - Show the billed price ("$4.99 per week") as the biggest price. Never show a per-week breakdown of the annual plan bigger than $39.99. That's what got Cal AI pulled.
4. **Tests likely to beat weekly:**
   - A discount offer to people cancelling during the trial (Opal: 50% off).
   - A longer annual trial (Headspace gives 14 days on annual and 7 on monthly).
   - Both keep users on annual.

## Open gaps
- No published randomized test of weekly vs annual in a health, habit or screen-time app.
- No public data linking weekly plans to App Store rating damage or chargebacks.
- Captions in RevenueCat's 2026 report contradict themselves on the Health & Fitness plan mix. The 59–60% annual revenue figure is consistent across both vendors.

## Sources
- RevenueCat State of Subscription Apps 2026: https://www.revenuecat.com/state-of-subscription-apps
- RevenueCat 2026 summary: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- RevenueCat SOSA 2025: https://www.revenuecat.com/state-of-subscription-apps-2025
- RevenueCat, weekly subscriptions (2025): https://www.revenuecat.com/blog/growth/weekly-subscriptions
- RevenueCat, renewal rates by category: https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category
- RevenueCat, first-renewal churn (2026): https://www.revenuecat.com/blog/growth/first-renewal-churn
- RevenueCat, one-year retention: https://www.revenuecat.com/blog/growth/one-year-retention-rates-insights
- RevenueCat, R.I.P. toggle paywall: https://www.revenuecat.com/blog/growth/rip-toggle-paywall
- Adapty SOIS 2026: https://adapty.io/blog/mobile-app-monetization-2026/
- Adapty, weekly vs monthly vs annual: https://adapty.io/blog/weekly-monthly-annual-subscription-plan/
- Adapty, trial vs direct purchase: https://adapty.io/blog/free-trial-vs-direct-purchase-subscription-apps/
- Adapty, high-performing paywall 2026: https://adapty.io/blog/high-performing-paywall-2026/
- Adapty SOIS 2025: https://adapty.io/blog/state-of-in-app-subscriptions-2025-in-10-minutes/
- Adapty case studies: https://adapty.io/case-studies/travel-app/ , https://adapty.io/case-studies/feeld/ , https://adapty.io/case-studies/productivity-app-and-autopilot/
- Apphud experiment case study: https://apphud.com/blog/experiments-case-study
- Superwall, Apple rules (June 2026): https://superwall.com/blog/external-checkout-a-b-testing-and-trial-toggles-confirmed-apples-rules-for-ios
- Cal AI removal: https://www.macrumors.com/2026/04/21/apple-cal-ai-app-store-removal/
- Apple intro offers: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/
- Apple subscriptions guidance: https://developer.apple.com/app-store/subscriptions/
- Opal on Sub Club: https://subclub.com/episode/lessons-from-121-ab-tests-kenneth-schlenker-opal
- QUITTR: https://startupspells.com/p/porn-addiction-app-quittr-250k-mrr-4-months
- Avast fleeceware: https://blog.avast.com/fleeceware-apps-on-mobile-app-stores-avast
- Auto-renewal field experiment: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4065098
- California AB 2863: https://www.cooley.com/news/insight/2025/2025-06-04-california-automatic-renewal-law-amendments-take-effect-on-july-1-2025
- Competitor App Store listings: see the links in the survey (Opal id1497465230, Freedom id1269788228, Rise id1453884781, Jomo id1609960918, Roots id6446800962, WalkBlock id6756827348)
