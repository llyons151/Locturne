# Base Rates and Monetization Patterns: Successful vs Unsuccessful iOS Subscription Apps

Researched 2026-10-09. Primary sources are RevenueCat State of Subscription Apps (SOSA) 2024/2025/2026 and Adapty State of In-App Subscriptions (SOIS) 2025/2026, plus Superwall's onboarding-paywall analysis.

**Sample bias, applies to almost everything below.** RevenueCat (115K+ apps, $16B+ revenue in SOSA 2026) and Adapty (16K+ apps, $3B in SOIS 2026) only see apps that installed a subscription SDK. Those apps already intend to monetize, and many are run by teams who test paywalls. The many apps that ship and earn nothing without integrating these SDKs are under-counted, so the real base rates for "any app" are worse. Each vendor also sells paywall, trial or experiment tooling, which biases their framing (for example, "apps that experiment earn 40x more").

Several RevenueCat web pages contradict themselves, and some numbers came through secondary press (ppc.land, 9to5Mac). Conflicts are flagged inline.

---

## 1. Base rates: how many new subscription apps reach $1K / $10K / $100K, and what does the median app earn?

### Takeaway
Most new subscription apps make almost nothing. RevenueCat finds only about 17% of new apps reach $1K monthly revenue within two years, and about 4.6% reach $10K. The median app earns about $50–72 a month after its first year. Outcomes are extremely concentrated (top 10% grow +306% YoY while the median grows +5%). Health & Fitness is one of the stronger categories per install. Productivity is mid-pack and has the weakest annual renewal.

### Cited Findings
- **SOSA 2026 (2025 data):** 17.3% of new apps hit $1K monthly revenue within two years. By category: Photo & Video 21.4%, Gaming 20.0%, Business 14.7%. 4.6% hit $10K within two years (Photo & Video 7.3%, Gaming 8.9%, Business 1.6%). — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Trend:** the $1K share fell from 19% to 17% and the $10K share from 5.3% to 4.6% between the 2025 and 2026 reports. ppc.land describes these as MRR milestones. — [ppc.land on SOSA 2026](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
- **SOSA 2025 preview, different wording:** "nearly 20%" of new apps reach $1,000 in *revenue* within two years, and about 5% reach $10,000. Photo & Video is highest (27.57% / 8.75%). This wording reads as cumulative revenue, not MRR, so it conflicts with the MRR framing used for 2026. — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **SOSA 2024 (2023 data):** 17.2% of apps reach $1K/month and 3.5% reach $10K/month. 59% of apps that hit $1K go on to $2.5K, and 60% of those go on to $5K. The median app earns under $50/month after 12 months. 9to5Mac also reports that the top 5% in Travel and Productivity earned under $1K/month, which is surprising and unverified against the PDF. — [9to5Mac on SOSA 2024](https://9to5mac.com/2024/03/13/mobile-app-revenue/)
- **Time to milestone (SOSA 2026), for apps that get there:**
  - Median time to $1K monthly revenue is 58 days (Gaming 32, Social & Lifestyle 45, Business 113).
  - Median time to $10K is 109 days.
  - SOSA 2025 gave 60 days to $1K.
  - Sources: [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Monthly revenue one year after launch (SOSA 2026):**
  - Median about $72, top quartile above $429, top 10% above $2,574.
  - The middle 50% spans $16–$429.
  - Top-quartile threshold by category: Productivity $1,250, Business $4,554, Education $3,614, Travel $822, Gaming $552.
  - Sources: [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [ppc.land](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
- **First-year revenue (SOSA 2025):** the top 5% of new apps earned $8,880 and the bottom 25% earned at most $19. — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Growth concentration (SOSA 2026):**
  - Median app MRR growth was +5.3% YoY. The top 25% grew +80%, the top 10% grew +306%, and the bottom 25% shrank by 33%.
  - Monthly new subscription-app launches rose from about 2,000 (Jan 2022) to 14,700+ (Jan 2026).
  - Apps launched before 2020 still earn 69% of subscription revenue.
  - Sources: [Subscription Insider](https://www.subscriptioninsider.com/article-type/news/revenuecat-data-shows-subscription-app-growth-concentrating-at-the-top); [ppc.land](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
- **Adapty SOIS 2026 (2025 data):**
  - Median app earns $492/month.
  - 59.3% of subscription apps earn under $1,000 *in total*, and 7.2% exceed $100K.
  - The top 10% capture 94.5% of subscription revenue.
  - Adapty's median is far higher than RevenueCat's $72. Its sample likely skews to more established, paywall-optimizing apps, since it is a paywall-testing tool.
  - Source: [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/)
- **TrendApps (non-subscription-specific, chart-reaching apps only):** 18.3% of 59,391 active apps earned more than $1K/month, and the top 1% took 79.9% of revenue. — via [Quash summary](https://quashbugs.com/blog/mobile-app-statistics-report) (secondary)
- **Health & Fitness strength:**
  - SOSA 2024: H&F apps perform at least 2x better than all other categories combined after a year. — [9to5Mac](https://9to5mac.com/2024/03/13/mobile-app-revenue/)
  - SOIS 2026: H&F has the highest median one-year install LTV ($1.21), ahead of Productivity ($1.10) and Utilities ($1.09). — [Adapty H&F benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)

### Inferences
- A realistic prior for a new indie app is about a 1-in-6 chance of $1K MRR within two years and about a 1-in-20 chance of $10K MRR. Apps outside RevenueCat or Adapty samples probably do worse.
- Apps that reach $1K tend to do it fast (median about 2 months). If an app is far from $1K after about 4–6 months, it is statistically unlikely to get there without a big change in distribution or monetization.
- Launch volume grew about 7x since 2022, which makes per-app outcomes harder (crowding).
- "$100K" is mostly a top-decile outcome. RevenueCat did not publish a $100K-MRR base rate, and Adapty's 7.2% is for *total* revenue above $100K in a monetizing-tool sample.

### Gaps
- There is no published share of new apps reaching $100K MRR.
- RevenueCat's $1K/$10K wording is inconsistent ("MRR" vs "monthly revenue" vs cumulative "revenue"), and the full PDF was not accessible.
- I found no Appfigures or Sensor Tower base-rate data for subscription apps specifically. I also found no revenue base rates for the screen-time or habit niche. Third-party Opal estimates conflict ($500K vs $4.8M/yr, Screensdesign vs Lazyweb), so they are not reliable.
- The H&F-specific $1K/$10K milestone shares were not found. RevenueCat's H&F category page returned 404.

---

## 2. Hard paywall vs freemium vs trial: conversion, revenue per install, retention

### Takeaway
Hard paywalls convert about 5x more downloads to paid (median about 11–12% vs about 2% by day 35) and earn about 8x more revenue per install in the first two weeks. One-year retention of converted payers is about the same (27% vs 28%). Refunds are somewhat higher on hard paywalls. Trial users retain better than direct buyers.

### Cited Findings
- **SOSA 2026, download-to-paid by day 35:**
  - Hard paywall: 10.7% median, top quartile above 20.0%, top 10% at 38.7%.
  - Freemium: 2.1% median, top quartile above 4.5%.
  - Revenue per install: D14 is $2.32 (hard) vs $0.27 (freemium), and D60 is $3.09 vs $0.38.
  - Source: [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **SOSA 2025:** the day-35 download-to-paid median was 12.11% for hard paywall vs 2.18% for freemium, and median 14-day revenue was about 8x higher for hard paywalls. — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **One-year retention of converted users (SOSA 2026):** hard paywall 27%, freemium 28%. — [ppc.land](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
- **Monthly-plan year-1 retention (SOSA 2025):** median 12.8% for hard paywall vs 9.3% for freemium. This conflicts in direction with the 2026 figures above, though it measures a different metric. — [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Refunds by paywall type (SOSA 2025):** hard paywall 5.8% vs freemium 3.4%. — [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Conversion timing:**
  - Hard-paywall conversions spike at days 4–7 (25.7%), which is consistent with trial-to-paid rollovers.
  - For freemium, 23% of conversions happen after six weeks.
  - Source: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Adapty SOIS 2026:**
  - Hard paywalls generate 21% higher LTV per subscriber than soft paywalls.
  - Trial subscribers retain 1.4–1.7x better than direct buyers.
  - Onboarding paywalls *without* a trial convert at 37.45% (of paywall viewers) but produce the lowest long-term value.
  - Source: [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/)
- **Trials and LTV (Adapty SOIS 2025):** in the US, trials raise 12-month LTV by 64%. — [App Developer Magazine on SOIS 2025](https://appdevelopermagazine.com/in-app-subscriptions-report-for-2025/)
- **H&F benchmarks (SOSA 2026):**
  - Download-to-trial: 6.9% median (top performers above 23%).
  - Trial-to-paid: 37.7% median (top quartile above 51.4%).
  - Download-to-paid by D35: 2.9% median across paywall types (top quartile above 6.2%).
  - Revenue per install: $0.48 at D14 and $0.66 at D60.
  - Trial strategy: 59% of H&F apps use a mix of trial and no-trial offers, and 18.3% use no trial.
  - Source: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **H&F revenue per install (SOSA 2025):** D14 median $0.44, upper quartile $1.31, P90 $2.97. D60 median $0.63, P90 $4.19. — [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **App Store vs Google Play D60 revenue per install (SOSA 2025):** $0.38 vs $0.14. — [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)

### Inferences
- For an iOS H&F-adjacent app, a hard paywall is the base-rate-favoured choice. It brings about 5x the conversion and about 8x the early revenue per install, with roughly equal payer retention. The cost is somewhat higher refunds and fewer free users to spread word of mouth.
- A trial-gated hard paywall (trial required to enter) gets both the hard-paywall conversion and the trial retention lift. No-trial direct purchase converts well up front but has the lowest LTV according to Adapty.

### Gaps
- No controlled A/B data comparing hard and freemium paywalls. All comparisons are cross-app, so selection bias is likely: apps that suit hard paywalls choose them.
- No screen-time or habit-specific paywall-type data.

---

## 3. Trial length, plan duration (weekly/monthly/annual) and price points

### Takeaway
Longer trials (17–32 days) convert trials to paid best (about 42–46% median vs about 25% for trials of 4 days or less), but most apps use short trials. H&F is the one category where annual plans still dominate and are growing (about 61% of revenue). Weekly plans dominate the overall market's revenue but retain terribly. Higher prices lower conversion counts but raise LTV per payer sharply.

### Cited Findings
- **Trial-to-paid by trial length (SOSA 2026):** 17–32 days 42.5%, 5–9 days 37.4%, 10–16 days 35.4%, 4 days or less 25.5%. — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Trial-to-paid by trial length (SOSA 2025):** 17–32 days 45.7% vs 26.8% for shorter trials. Top apps exceed 60% at any length. — [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Trial length mix (SOSA 2026):** 4 days or less is 46.5% of trials (up from 42.1%), 5–9 days 39.9%, 17–32 days 5.0%. — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Share of trial cancellations that happen on day 0, by trial length (SOSA 2026):**
  - 3-day trial 55.4%, 7-day 39.8%, 14-day 35.7%, 30-day 31.1%.
  - 84% of 3-day-trial cancellations and 64% of 7-day-trial cancellations happen by day 1.
  - Sources: [RevenueCat SOSA 2026 part 2](https://www.revenuecat.com/sosa-2026-insights-part-2); [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Trial-to-paid by category:**
  - SOSA 2026: Travel 43.5%, H&F 37.7%, Gaming 25.0%, Photo & Video 22.2%.
  - SOSA 2025: H&F median 39.9%, top 10% at 68.3%.
  - Adapty SOIS 2026: global trial-to-paid 25.6%, H&F 35.0%. H&F weekly plans with trial convert trials at 42.2%, and H&F install-to-trial is 9.5% (global 10.9–11.2%, North America 14.5%).
  - Sources: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/); [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/); [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- **Trial-to-paid by geography (SOSA 2026):** North America 34.2%, Asia-Pacific 31.9%, Western Europe 29.7%, India and Southeast Asia 15.2%. — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Plan mix:**
  - Adapty SOIS 2026: weekly plans are about 56% of all subscription revenue (43.3% in 2023). H&F is the only category where annual dominates (60.6% of revenue, up from 51% in 2023), and Utilities is 73.6% weekly.
  - SOSA 2026 overall mix: monthly 42%, yearly 34%. The yearly share fell from 41.4% to 33.6% YoY.
  - Sources: [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/); [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/); [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **H&F plan mix (SOSA 2025):** yearly plans are 67% of subscriptions sold. The SOSA 2026 page contradicts itself here (68% annual in one place, 68% monthly in another). — [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/); [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Productivity plan mix (SOSA 2026):** the page both says 91% of revenue comes from monthly plans and gives a 77% monthly or 77% yearly mix. It is self-contradictory, so treat it as unresolved. — [SOSA 2026 Productivity](https://www.revenuecat.com/state-of-subscription-apps-2026-productivity/)
- **D14 revenue per install by an app's dominant plan (SOSA 2026, citing Phil Carter):**
  - Annual $0.36, monthly $0.18, weekly $0.07. At D60: $0.46 / $0.24 / $0.09.
  - The dashboard figure for weekly-dominant apps differs ($0.19 at D14, $0.32 at D60).
  - Source: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Median prices:**
  - SOSA 2026: weekly $5.99, monthly about $10 (another section says $7–8), yearly $31.60 rising to $34.80.
  - Adapty SOIS 2026 (2025 global medians): $7.48/week, $12.99/month, $38.42/year. European apps charge 29–39% more than North American apps.
  - SOSA 2025: the median app price is $29.99, and upper-quartile prices are almost 3x higher.
  - Sources: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/); [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Price effects:**
  - SOSA 2025, high- vs low-priced apps:
    - Year-1 LTV per payer: median $55.21 vs $8.08.
    - D35 download-to-paid: 2.7% vs 1.5% (counter-intuitively higher for high-priced apps, which likely reflects hard-paywall and category mix).
    - Download-to-trial: 9.8% vs 4.3%.
    - Trial-to-paid: 28.4% vs 47.8%.
    - Source: [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
  - SOSA 2026, realized LTV per payer after year one: high-priced $62.19, mid $26.07, low $10.69. One-year retention is 23% for high-priced vs 36% for low-priced. — [ppc.land](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
  - Adapty SOIS 2026: high- vs low-priced H&F annual plans have about $70 vs $17 one-year LTV. High-tier weekly plans make 5.2x more revenue per install than low-tier ones. — [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/); [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/)
- **H&F realized LTV per payer (SOSA 2026):** month-1 median $24.23 (top quartile above $39), year-1 $35.64. SOSA 2025 put month-1 at a median of $16.44 (upper quartile $31.12). — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Productivity year-1 realized LTV per payer (SOSA 2026):** $24.95. — [SOSA 2026 Productivity](https://www.revenuecat.com/state-of-subscription-apps-2026-productivity/)
- **Payer value by region (SOSA 2026):** North America year-1 LTV per payer is $32, about 40% above the $23 global median. — [ppc.land](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)

### Inferences
- For an H&F or wellness iOS app with a strong annual focus, a premium annual price (well above the $31–38 median yearly price) is consistent with the LTV data. Expect fewer trial-to-paid conversions in exchange for 3–6x LTV per payer.
- Very short trials (3 days) attract heavy day-0 cancellation and the lowest trial-to-paid rate. 7-day trials are the common middle ground. Longer trials convert better but defer revenue.
- Weekly plans inflate early revenue per install in some categories but retain at about 1% after a year. That is a poor fit for a habit product whose value is long-term.

### Gaps
- No controlled trial-length experiments for H&F or productivity specifically. All comparisons are cross-app.
- RevenueCat's "high/mid/low priced" tier cut-offs were not visible.

---

## 4. Onboarding length, quiz-style onboarding and paywall placement

### Takeaway
Evidence is thin and mostly observational or from vendors. Paywalls shown during onboarding drive the bulk of trial starts because 80–90% of trials start on day 0. Multi-page onboarding paywalls converted 37% better than single-page ones in Superwall's 40M-open dataset. Apps with paywalls tend to have longer onboarding flows (median 14 steps vs 10), but no rigorous study links quiz length to conversion.

### Cited Findings
- **Superwall, Feb–May 2026, about 40M onboarding paywall opens:**
  - Single-page paywalls converted at 9.07% (trial or purchase, per paywall view) and multi-page at 12.41%, a +37% relative lift.
  - Only 24% of opens were multi-page.
  - Method: observational, excluded zero-transaction paywalls, no category or price controls, and the vendor sells the tooling.
  - Superwall recommends 2–3 value screens before the price.
  - Source: [Superwall blog](https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why.md)
- **Superwall customer anecdotes:**
  - Stompers found a single-page paywall beat a multi-page one on yearly trial starts.
  - Another app reported +240% trial starts and +97% proceeds per user from an extra trial offer to unsubscribed users.
  - These are unverified testimonials. — [Superwall A/B testing page](https://superwall.com/features/ab-testing)
- **Lazyweb, 129 flows:** onboarding flows with a paywall averaged 17.2 steps (median 14), vs 12.4 (median 10) without. This is correlation only and has no conversion data. — [Lazyweb Research](https://www.lazyweb.com/research/are-onboarding-flows-with-a-paywall-longer)
- **Day-0 trial starts:**
  - SOSA 2026: 82.1% of H&F trial starts happen on day 0 (Business 89.9%, Productivity 78%, the lowest).
  - Adapty: 86.1% of H&F trials start on day 0, and 89–90% across all categories.
  - Sources: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/); [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/)
- **Experimentation (Adapty):**
  - SOIS 2026: apps running experiments earn 40x more than apps that don't. — [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/)
  - SOIS 2025: up to 100x more. — [App Developer Magazine](https://appdevelopermagazine.com/in-app-subscriptions-report-for-2025/)
  - Both are correlational and vendor-interested. Bigger apps can afford to test, so the causation likely runs both ways.
- **Quiz length:** one forum founder reported +12% conversion from cutting a quiz from 8 to 4 questions. This is anecdotal. — [web2wave community](https://community.web2wave.com/t/how-long-should-the-quiz-be-before-the-paywall/105)

### Inferences
- The onboarding paywall is effectively the whole conversion event for trial-based apps, since about 80–90% of trials start on install day. Its design deserves the most testing effort.
- A short multi-step value build-up (2–3 screens) before or inside the paywall is the best-supported pattern. There is no evidence that very long quizzes help by themselves.

### Gaps
- No published randomized test of quiz length or paywall position on trial-to-paid or revenue per install.
- No screen-time-app onboarding data.

---

## 5. Retention, renewal and refunds

### Takeaway
First renewal is the big filter. RevenueCat puts median first annual renewal at about 23–40% by category (Productivity lowest at 23%). Older SOSA 2025 data gives a 61.7% first-renewal figure (see the definition conflicts below). Adapty puts H&F first renewal at 30.3%, the worst category. One-year survival is about 28% for annual, 8% for monthly and about 1% for weekly. Refunds run 2–6%: higher for H&F, annual plans and hard paywalls.

### Cited Findings
- **Year-1 retention by plan (SOSA 2026 part 2):** annual 31% → 28%, monthly 10% → 8%, weekly 1.7% → 1.2% (2023 → 2024 cohorts). — [RevenueCat SOSA 2026 part 2](https://www.revenuecat.com/sosa-2026-insights-part-2)
- **First annual renewal (SOSA 2026 part 2):**
  - Median is 23–40% by category (Productivity 23%, the lowest; Business 40%).
  - Second renewal is 44–64% and third is 56–70%.
  - First renewal for weekly and monthly plans is 53–61%.
  - The same page also says "yearly plans renew at 83.4% overall" vs monthly 39.2% and weekly 18.7%. That is an undefined "active renewal rate" and conflicts with the medians, so do not use it as a base rate.
  - Source: [SOSA 2026 part 2](https://www.revenuecat.com/sosa-2026-insights-part-2)
- **SOSA 2025 (earlier definition):**
  - First annual renewal 61.7% (down from 64.9%), second 53.4%, third above 77%.
  - Year-1 retention is 44.1% for yearly plans and 17.0% for monthly.
  - Monthly year-1 retention by price: low 22.5%, mid 16.4%, high 12.2%.
  - These differ markedly from the 2026 figures, likely because of a different metric or cohort definition.
  - Source: [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **SOSA 2026, plan retention by price:** monthly plans retain 10.8% (low-priced) vs 6.1% (high-priced), and weekly plans retain 1.3% vs 1.0%. — [ppc.land](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
- **Adapty SOIS 2026:**
  - Global average renewal retention is 59.2% at the 1st renewal, then 45.1%, 37.1%, 31.6% and 27.6% at the 5th.
  - First-renewal retention by category: Utilities 58.1%, H&F 30.3% (the lowest).
  - Day-380 retention for trial subscribers: annual 19.9%, monthly 14.2%, weekly 5.5%.
  - Sources: [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/); [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/)
- **Annual cancellation timing (SOSA 2026 part 2):**
  - Month 1 accounts for about 35% of all annual-plan cancellations (23–50% by category).
  - Months 3–11 average about 5% per month, and month 12 spikes to 9–14%.
  - Source: [SOSA 2026 part 2](https://www.revenuecat.com/sosa-2026-insights-part-2)
- **Reactivation within a year (SOSA 2026 part 2):** annual 5% (3–8%), monthly 20% (Productivity 36.1%, the highest). — [SOSA 2026 part 2](https://www.revenuecat.com/sosa-2026-insights-part-2)
- **Refunds (SOSA 2025):**
  - 2–5% of payers overall: H&F 4.71%, Education 4.86%, Travel 1.51% (the lowest).
  - Hard paywall 5.8% vs freemium 3.4%, and low-priced plans 2.2%.
  - Source: [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- **Refunds by plan (Adapty SOIS 2025):** annual plans have the highest refund rate (4.2%), and weekly or short plans the lowest. — [App Developer Magazine](https://appdevelopermagazine.com/in-app-subscriptions-report-for-2025/)

### Inferences
- For an annual-first H&F or habit app, plan for roughly 30–40% of annual subscribers to renew in year 2 and about a third of eventual annual cancellations to happen in the first month. Early habit formation (weeks 1–4) is where retention is won or lost.
- Model a refund reserve of about 5% for a hard-paywall annual H&F app.

### Gaps
- No 2026 refund data was found.
- RevenueCat's renewal definitions changed between reports, so 2025 and 2026 figures are not comparable.
- No screen-time or habit-category renewal data.

---

## 6. How fast revenue happens: day-0 conversions and first-month revenue

### Takeaway
Revenue is front-loaded. About half of all paid conversions happen on install day (72% in Productivity). 80–90% of trials start on day 0. Hard-paywall conversions cluster in days 0–7, while freemium has a long tail (23% after six weeks). Apps that hit $1K MRR do so in a median of about 2 months.

### Cited Findings
- **Day-0 paid conversions (SOSA 2026):**
  - 50.6% of paid conversions happen on day 0. Another section of the same page says about one-third, which is a conflict.
  - By category: Productivity 71.9% (the highest), Education 28.5% (the lowest).
  - By region: North America 44.2%, Middle East and Africa 63.5%.
  - Source: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Day-0 trial starts:**
  - SOSA 2025: 82% of trial starts happen on install day. Median trial-start rate is 6.2% (P90 20.3%).
  - Adapty SOIS 2026: 89.4% of trial starts happen on day 0 (86.1% for H&F), with a small secondary window at days 4–14 (2.6% in H&F).
  - Sources: [SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/); [Adapty SOIS 2026](https://adapty.io/state-of-in-app-subscriptions/); [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- **Hard paywall vs freemium timing (SOSA 2026):** hard-paywall conversions spike at days 4–7 (25.7%, as trials convert). Freemium has 23% of conversions after six weeks. — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Revenue-per-install accumulation:**
  - H&F revenue per install grows from $0.48 (D14) to $0.66 (D60) median, so about 73% of 60-day revenue arrives in the first two weeks (SOSA 2026).
  - For hard paywalls it is $2.32 to $3.09, about 75%.
  - Source: [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **LTV accumulation:**
  - H&F month-1 realized LTV per payer is $24.23 vs a year-1 value of $35.64, so about 68% of year-1 payer value is realized in month 1. This is consistent with annual plans being charged upfront. — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)
  - Weekly-plus-trial LTV grows from $7.40 to $54.50 over 12 months (Adapty, all categories). — [Adapty H&F](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- **Time to milestone (SOSA 2026):** median 58 days to $1K monthly revenue and 109 days to $10K, for apps that get there. — [SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps)

### Inferences
- With an upfront-charged annual plan and a 7-day trial, most cash arrives within about 8 days of install. Cash flow tracks install volume almost directly, which matters for a developer who needs income soon.
- Because day 0 is decisive, the success of first-session onboarding is a stronger lever than later re-engagement for conversion. Re-engagement still drives renewal.

### Gaps
- No published "share of first-year revenue that arrives in month 1" for apps as a whole. The H&F figures above are derived from per-payer LTV and revenue-per-install medians, not reported directly.
- The day-0 paid-conversion figure is internally inconsistent on RevenueCat's page (50.6% vs about one-third).
