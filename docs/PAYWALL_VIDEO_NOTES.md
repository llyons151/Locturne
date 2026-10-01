# "I Studied 10,000 Paywall Screens": checked against Locturne

Reviewed 2026-09-25. Video: Tim Gabe (ZipZap design agency),
https://www.youtube.com/watch?v=sYRhXB_ZcLI (12 min). Almost every number comes from
Adapty's *State of In-App Subscriptions 2026* and RevenueCat's *State of Subscription
Apps 2026*. Both reports were checked against the video below.

## His six patterns, fact-checked

| # | Claim in the video | What the source actually says | Verdict |
|---|---|---|---|
| 1 | "Weekly is the new monthly": 55.6% of revenue, converts 1.7–7.4x better than annual | True across all apps. In Health & Fitness, annual grew from 51% to 61% share, the only category where it's growing | Doesn't apply to Trundle. Already rejected in [PRICING_RESEARCH.md](PRICING_RESEARCH.md) |
| 2 | 82–89% of trial starts happen on install day; Cal AI and Lose It win by explaining the trial ("No payment due now", a reminder promise) | Matches RevenueCat/Adapty | Correct. **Locturne already does this** |
| 3 | "Structure over price": localization +62.3% LTV, trial +59.6%, plan count "63% more uplift than price" | These are **win rates** (the share of tests that won), not the size of the uplift. Localization 62.3%, trial 59.6%, plan duration 58.7%, plan count 57.1%, price 45.5%, visuals/copy 34.6%. The "63%" figure doesn't appear in the source | The ranking is useful. The numbers are misquoted |
| 3b | Weekly $7.40 LTV with no trial vs $54.50 with a trial (+636%) | That's what Adapty's blog says. Another Adapty page says $49.27. Correlational, across apps | Not a causal effect of adding a trial |
| 4 | Blinkist: showing when you'll be charged gave +23% conversion, −55% complaints, no change in churn | Well-documented case study | Correct. **Locturne already does this** |
| 5 | Higher prices convert better: median high-priced app 2.8%, mid-priced 2.0%, top quartile 6.1% | RevenueCat 2026 confirms it (low-priced apps 1.4%). Adapty: high-priced annual Health & Fitness plans earn $70 LTV vs $17 for low-priced ones | Correct but correlational. Serious apps charge more *and* attract high-intent users |
| 6 | 50+ experiments a year means 18.7x revenue | Adapty says this, and the blog calls it correlational. Top testers average 14.7 tests a year | Big apps both test more and earn more. Causation isn't shown |

## What Locturne already has (no change needed)

- A dated trial timeline: "Today: No payment due now" → Day 5 reminder → Day 7 charge
  date ([ONBOARDING_CONVERSION.md](ONBOARDING_CONVERSION.md) paywall spec).
- A reminder toggle, on by default (`remindTrial` in `content.ts`).
- A hard paywall placed after the user has *felt something* (the number, the setup,
  the `tomorrow` demo). This matches his "trust screen after emotion" point and Cal AI's
  long onboarding.
- A 7-day trial on annual (the video's trial-structure point; 3-day trials lose 55%
  on day 0).
- The billed amount is the biggest price, with no fake countdowns (his honesty pattern).

## What to change

1. **Raise the ceiling of the price test.** The current test plan is
   $34.99 / $39.99 / $44.99. That's a narrow range at the low end. Health & Fitness
   high-priced annual plans earn about 4x the LTV of low-priced ones, and Opal's main
   plan is $99.99/yr. **Done 2026-09-25: annual is now $59.99.** Test it against $39.99 (a big swing, which the doc already
   calls for) before fine-tuning. Keep lifetime at roughly 2–2.5x annual.
2. **Put structural tests before price tests.** Reorder the A/B list by win rate:
   1. Trial vs no trial (already first).
   2. **Plan count: three plans (lifetime/annual/monthly) vs annual + monthly vs
      annual only.** The current three-plan page has never been tested against fewer
      plans, and plan count wins 57% of the time.
   3. Annual price ($39.99 vs $59.99).
   4. Everything else (loader, notification timing, headline copy).
3. **Localize price, not copy, first.** His voice is the product, and translating it
   is expensive and risky. Price localization is cheap: set App Store Connect prices
   by storefront (or use Apple's regional equalization, then adjust key markets) instead
   of converting the US price. Translate copy only once analytics show a non-English
   market with real traffic.
4. **Choose a paywall SDK that can run tests without an app update.** `package.json`
   has no purchases SDK yet. None of the tests above can run without remote paywall
   config (RevenueCat Paywalls/Experiments, Superwall, or Adapty). Decide this before
   TestFlight. It's the practical part of pattern 6: the number of tests matters less
   than being able to run any at all after launch.

## Don't take from this video

- Weekly-first pricing (pattern 1). Wrong category, and the viral toggle version is
  banned (see PRICING_RESEARCH.md).
- The idea that 50 experiments *cause* 18.7x revenue. At launch traffic, each
  variant needs about 200 conversions, so realistically 3–5 tests in year one.

## Sources

- Adapty, high-performing paywall 2026: https://adapty.io/blog/high-performing-paywall-2026/
- Adapty, subscription app success 2026: https://adapty.io/blog/subscription-app-success-2026/
- Adapty SOIS 2026: https://adapty.io/state-of-in-app-subscriptions/
- RevenueCat SOSA 2026: https://www.revenuecat.com/state-of-subscription-apps
