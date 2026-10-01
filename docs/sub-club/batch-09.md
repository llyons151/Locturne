# Sub Club notes: batch 09

Source: Sub Club podcast (RevenueCat) auto-caption transcripts, Feb-Apr 2026. Names and numbers come from auto-captions; uncertain figures are marked "(?)".

## How ElevenLabs Ships So Fast With Small Teams (Jack McDermott & Tanmay Jain(?), ElevenLabs, 2026-02-04, https://youtu.be/3r8pr9w_lDQ)
- **Relevance:** medium. Useful points on stripping onboarding quizzes, simple consumer pricing and finding the aha moment; most of the episode is org culture and launches.
- **Findings:**
  - Onboarding quizzes can be over-optimized. The ElevenReader team spent many experiment cycles polishing its onboarding funnel and in hindsight should first have tested a baseline: sign-up form straight into the product's empty state, shown to ~10% of users for ~5 days, to measure how much the quiz actually adds (retrospective opinion from their "biggest fail of the year"). Consumer audiobook/text-to-speech app.
  - Their aha moment is "bring your own book/PDF, pick the voice you want reading it". Shortening the time from install to hearing your content in a chosen voice worked better than goal-setting quiz screens (observed, no numbers). "Fewer screens to the aha" beat funnel tuning.
  - Biggest win of the year (ElevenReader): removed a whole pricing tier and priced in hours of listening instead of credits/characters. Consumers don't think in tokens (observed; no numbers given).
  - Flagship ElevenLabs app: web offers ~5 plans but mobile offers one price, which they test with different incentives. Simplicity keeps the team accountable (opinion/practice).
  - Voice choice has a very long tail: 600+ voices and no single voice above ~10-12% of use, median ~1-2% (observed data). Personal choice is part of the value.
  - Former-founder lesson: cutting the price doesn't fix retention if users don't care about the product (anecdote, B2B).
  - Sharable moments have to match value the user is proud of, like milestone badges (hours of agent calls, similar to YouTube 100k plaques). Copying "Spotify Wrapped" rarely works (opinion). RevenueCat's CEO saw far more organic screenshots after shipping a good-looking mobile home screen than from any share feature they had built.
- **Tactics:** one mobile price, varied by incentive; price in consumer units (hours) rather than credits; a holdout test of "no onboarding" vs the full quiz; watching Reddit/Discord/X for spontaneous sharing to find the aha.
- **Caveats/contradictions:** Contradicts the common advice that long personalization quizzes always lift conversion. They didn't give numbers, and the "strip it" result is a lesson learned, not a published A/B result.
- **Quote:** "just being simple, clear, and direct about who the app is for and trying to get you to that aha with fewer screens"
- Other: growth via earned media (launch treated as a Twitter thread first, then video), branded search, Meta/TikTok/ASA; tiny "speedboat" pods.

## How Skylight Doubled Subscription Prices to $79 (Michael Segal & Mark Ungerer, Skylight, 2026-02-18, https://youtu.be/AilakPuHdf4)
- **Relevance:** high. A price-doubling test, a free-trial test that failed, an opt-out subscription bundle at checkout, native IAP vs web checkout, and the first-30-days habit window.
- **Findings:**
  - Price went from $39/yr to $79/yr for new customers only, with minimal loss in attach rate or retention. They called it the most transformative change to ARR (observed). Tests varied both subscription price and hardware discount. $99 was slightly better on paper (ARPU), but they picked $79 because $99 drifted toward the "not worth it / disgust" zone in qualitative research (A/B plus customer interviews). Hardware-attached family calendar; parents.
  - $39/yr was a "magic number where people don't really care", which let them paywall photos without much pushback early on (opinion/observed).
  - More than half of calendar buyers subscribe (observed attach rate).
  - Free trial test failed: they tested trials both with and without a card up front, and neither lifted conversion. The people who took the trial were about the same people who would have subscribed anyway. They blame under-resourcing, since one test is not enough (A/B, no numbers). Purchase intent is decided up front for considered purchases.
  - They switched on-device QR checkout from web to Apple IAP and saw a >100% conversion lift on that (small) flow (A/B/observed). Less friction beat saving the 30% fee. In one test, IAP "paid for itself" through higher conversion.
  - Opt-out bundling in their own web store: the subscription is turned on by default with a free month and a hardware discount if you keep it. "Most people don't" opt out (observed). That's a much higher attach rate than Amazon or retail, where this isn't possible.
  - Changing how bundle contents are merchandised barely moved the attach rate. Buyers want "the whole thing" (observed).
  - Habit window: after ~30 days (often days to weeks), family behavior patterns set and it's very hard to get users to adopt new features. Newer customers who set up more features during onboarding keep using them (observed). They want to squeeze more aha moments into setup, possibly with conversational AI onboarding.
  - Paywall-line rule: whatever the customer came to buy must stay free, or they feel duped. Put new, instantly understandable modules (meal planning) behind the paywall. Moving a feature out of the paywall later is easier than moving one in (opinion from experience). Paywalling something that feels like it should be free triggers anger and disgust in reviews even when the numbers go up.
  - Renewal trick: they don't label which features are premium for subscribers, so at renewal time users judge overall value and don't audit what they used. Renewal rates are high for heavy and light bundle users alike (observed).
  - Grandfathered existing subscribers ("legacy plus") and honored the old price for anyone who asked, indefinitely. They chose goodwill over "a couple million dollars" (practice).
  - ~20% of surveyed customers call the product "life-changing". Those users drive word of mouth, and the product goal is to reach 50% (survey).
  - Founder advice: get payback on day zero by charging an annual/upfront amount (~$60-70/yr) instead of $5/month (opinion).
- **Tactics:** new-customer-only price increase with grandfathering; testing price and bundle discount together; opt-out subscription at checkout with a free month; native IAP for in-context purchases; no premium badges for existing subscribers; survey question "is it life-changing?".
- **Caveats/contradictions:** A hardware purchase means intent is already high, so the no-trial lesson may not carry over to app-only products. The host notes Duolingo's trial works well. They admit they have no growth PM and test lightly.
- **Quote:** "We keep our pulse on the emotional reaction to where the line is, not just some quant AB test of what performs."
- Other: hardware is not a moat; retail placement (Costco, Best Buy) acts as an endorsement; inventory debt instead of VC.

## App Revenue Is Booming and It's Not Just AI Apps (Olivia Moore, Andreessen Horowitz, 2026-02-27, https://youtu.be/VPtNcQ2ySHg)
- **Relevance:** low. Market overview.
- **Findings:** Non-game app IAP revenue passed games. Non-game revenue grew ~21% YoY, and only ~$3.5B of that was generative AI (Sensor Tower). ChatGPT anchored consumers at $20/mo, up from the ~$60/yr norm, which opens room for higher tiers and usage-based "whale" pricing. The top AI apps monetize at ~2x the ARPU of their pre-AI equivalents (a16z data).
- Other: VC thesis on opinionated vertical AI apps; AI productivity (>$1M ARR per employee).

## Stop Celebrating Conversion Wins Before Checking Renewals (Sara Grana, Yousician, 2026-02-28, https://youtu.be/f_pNVYDlaBc)
- **Relevance:** medium-high. Discipline for judging paywall/pricing tests on renewals, refunds and win-back.
- **Findings:**
  - Win-back trap: a "cancel auto-renew → send offer" flow looked great, but many users cancelled right away, got a refund, then took the offer, so the net effect was negative (observed, language-learning/Babbel era). Always include refunds and chargebacks in the analysis.
  - Price-increase tests can look like wins at launch while control beats test once renewals come in ~6 months later (observed pattern).
  - Lifetime-plan tests: the alternative plan always "loses" on upfront revenue unless you compare against its projected LTV, e.g. an annual that renews to ~€300 vs a €100 lifetime (?) (opinion/example).
  - Web-checkout cohorts renew much better than IAP cohorts. A shift in purchase mix (web vs app, monthly vs annual, discounted vs full price) can look like a product retention win when cohort-level renewal is actually flat (observed across companies).
  - Discounts bring revenue now but lower renewal. Price increases shrink the pool of users you can later upgrade.
  - Stacked A/B wins (5-10% each) rarely add up to company growth. If they don't show in topline, re-check the tests (observed).
  - Host: the free-trial toggle paywall (trial off by default, user switches it on) produced surprisingly big lifts, but Apple has begun rejecting it and 6-12 month cohorts are unverified (host observation).
- **Tactics:** revenue bridge in Excel (new, upgrade, renewal, reactivation) annotated with decisions; calendar reminders to re-check price or discount tests at 3/6/12 months; check refunds after ~2 weeks; renewal-rate scenario thresholds to flag a false winner early; segment by plan, discount, web vs app, channel.
- **Caveats/contradictions:** A cautious counterpoint to the "toggle trial" and "paywall tweak = 25% lift" enthusiasm.

## How Mojo Increased ARPU 60% In Just Five Months (Michal Parizek, Mojo, 2026-03-01, https://youtu.be/plEgbUsVzV8)
- **Relevance:** high. Concrete paywall and pricing tests with lifts, plus recurring paywalls for existing free users.
- **Findings:**
  - ARPU up 60% in 5 months from a series of paywall and pricing tests. Mojo is a video/social-content creation app; audiences split into US/English, EU and LatAm.
  - Annual as the default: they moved the monthly plan behind a "view all plans" button so the first paywall screen showed only annual. Annual adoption rose by ~15-20 percentage points (A/B).
  - Monthly-equivalent anchoring: a small line under the annual price ("equivalent to ~$10/month"), set against the ~$25(?) monthly. ~10% revenue lift in the US and ~30-40% in Brazil and Mexico (A/B). Their hypothesis is that price-sensitive markets respond more to per-month framing.
  - Lower LatAm prices than the App Store's exchange-rate default did better (A/B).
  - Paywall design depends on culture. In Japan, a long scrolling paywall with lots of reviews/social proof and a free-vs-pro comparison gave ~+20% revenue. The same design failed in the US, where a clean paywall with a slider, background video and punchy lines won (A/B).
  - Main metric was ARPU at day 7 (they had a 3-day trial). Proxy for renewals: 7-day cancellation rate. A higher price that won on day-7 revenue was rejected because its 7-day cancellation rate was much higher, and a 1-year model showed less long-term revenue (observed).
  - Only ~50% of Mojo's revenue comes on day 1, against ~80% industry-wide in RevenueCat data. He credits a deliberately generous free tier plus paywall campaigns for existing users (observed).
  - App-open paywall for existing free users, capped at once a week, drove ~15% of new revenue. No noticeable negative reviews or support complaints (observed, review analysis).
  - Winners were only rolled out in the geos where they were re-confirmed. Some wins were geo-specific or even negative elsewhere.
- **Tactics:** annual-only first screen with monthly under "view all plans"; per-month equivalent line on the annual plan; geo-specific pricing; 3 parallel test streams by geo at 1-2 week cadence; a third-party paywall tool so tests ship in days; weekly-capped app-open paywall; paywall triggers after key engagement events.
- **Caveats/contradictions:** Optimizing for early revenue (ARPU at day 7) was a deliberate choice to shorten UA payback. He admits that separating results from UA changes is hard.
- **Quote:** "users will not react the way how you kind of offer fear they react"

## The Counterintuitive Way To Nudge Users Into Free Trials (Anmol Tiwari, Duolingo, 2026-03-02, https://youtu.be/ml2ofz2TfIU)
- **Relevance:** high. Trial reminders, trial length, repeat trials, reverse trials ("free taste"), and paywall clarity from Duolingo.
- **Findings:**
  - Principle: aim for clarity and confidence, not persuasion. Timelines showing what happens on which day, and clear refund amounts when switching plans (practice). Freemium language learning; mass-market audience.
  - Trial reminder: they used to send a notification ~2 days before trial end automatically. Letting users choose which day they get the reminder (added friction) increased trial conversion (A/B, no numbers). It draws attention to the promise of a reminder, so users hold off canceling and judge value around day 5-6.
  - Contextual onboarding upsell: they framed the subscription as an onboarding question ("learn with or without ads?", "learn faster or at your own pace?") instead of dropping the standard Super upsell into onboarding. That gave much higher trial opt-in and was "one of our biggest wins last year" (A/B, no number). New users convert far more than existing ones.
  - Loss aversion: trials start more often when framed as "keep your progress / finish this lesson" after running out of hearts or energy (observed).
  - Trial length: moving from 14 to 7 days (late 2024), combined with more trials per user, gave more net conversions over time. It also doubled experiment velocity because results come in 7 days instead of 14 (A/B).
  - Multiple trials per user across lifecycle stages. Users may have been busy the first time, and each trial is another decision point (observed as effective).
  - "Free taste" (reverse trial): 3 days of Super or Max with no card and no auto-renew. It works for free-to-paid and for paid-to-paid upsells (e.g. Super subscribers trying Max). Also used for single features, like one free AI video call (observed as effective).
  - Free-taste copy: labeled clearly as a 3-day free preview and framed as a reward ("you just earned this"). Moving it from a chest on the learning path to after a lesson felt more rewarding. Timers add urgency. After it ends, a bottom drawer says "your X benefits have ended" with options to continue or resubscribe.
  - ML personalization of the ad mix (own subscription ads vs third-party ads), which plan to promote, and a bandit choosing upsell creatives. They report wins, no numbers.
  - Region: in China, subscription services usually use paid trials (~$0.99) instead of $0 trials because auto-renewal is unfamiliar. Paid trials also show up in parts of Europe. The host adds that a $1 trial sends ad networks a stronger day-1 signal.
  - Track day-0 cancellation as an intent signal. Once a trial is cancelled, users rarely un-cancel.
- **Tactics:** user-chosen reminder day; timeline paywall; 7-day trial; repeat trial eligibility (needs separate SKUs/offers on iOS); free taste framed as a reward after an activity; "benefits ended" drawer; upsell phrased as an onboarding preference question.
- **Caveats/contradictions:** Counterintuitive that friction (picking a reminder day) raised conversion. The host says reverse trials are hard to communicate because users fear auto-charge.
- **Quote:** "our goal is not to persuade users to try this. Our goal is to give them clarity and confidence to purchase."

## The Hidden Cost of Underpricing Your Subscription (Patrick Rills, Lose It!, 2026-03-03, https://youtu.be/Vv2h5If8gGU)
- **Relevance:** high. Doubling price from $39.99 to ~$80/yr, grandfathering, and lifecycle discounts.
- **Findings:**
  - Price was $39.99/yr from 2012 until 2026. Over the years they tested $5 to $120/yr, and $40 was the equilibrium: higher prices cut conversion enough that revenue didn't net out. Calorie tracking / weight loss; freemium.
  - In late 2024 a test of ~$80 broke even on net revenue for the first time. It was repeated on iOS and Android, across new, existing and reactivated cohorts, with similar results. That made the move safe, and it unlocked paid UA (rising CAC, Meta restricting health ads) and covers AI feature costs (A/B).
  - Retention after the increase has been stable. He credits the strong free product, which keeps users engaged even if they don't pay (observed).
  - A higher list price leaves room for deeper lifecycle discounts (25/50/75%). A bigger percent-off tends to convert better even at a higher absolute price (opinion based on their in-app sale system).
  - Full rollout matched experiment results in the first month, January (observed).
  - They did not raise prices for existing subscribers. Apple's opt-in flow for price increases is confusing, can't be A/B tested, and the attrition risk was unknown. They have a history of grandfathering, e.g. moving the barcode scanner out of the paywall only for new users.
  - App users arriving from ads don't comparison-shop on price, so being cheap isn't much of a differentiator. The exception: the low price helped during early COVID uncertainty (opinion).
  - Premium was priced in line with competitors at ~$80 because the product team felt the price signaled lower value.
- **Tactics:** repeat price tests across platforms and cohorts before rolling out; new-user-only increase; planned intervention when a grandfathered user turns off auto-renew ("your price will change"); an in-app lifecycle discount engine; adding ads, one-off IAPs and affiliates to the free tier.
- **Caveats/contradictions:** Contrasts with others who raised prices on existing users. Their retention stability may rely on a generous free tier.
- **Quote:** "what are prices if not information about how something valuable is"

## Dynamic Paywalls That Drove Millions in New Revenue (Shawn Gong, Tinder/Grindr, 2026-03-04, https://youtu.be/sckREcCQQys)
- **Relevance:** medium-high. Plan structure, choice overload, unbundling cannibalization and a failed super-premium tier.
- **Findings:**
  - Problem: too many tiers and plans (Plus/Gold/Platinum × weekly/monthly, plus à la carte items) caused decision overload. Some users bought nothing. Others bought Platinum "because it's the most expensive" and only used Gold features (user research). Dating; mass market.
  - An ML model predicted willingness to pay and showed each user the single SKU they were most likely to buy. A/B against the static paywall, starting with a small scope, gave a "multi-million dollar annual increase" (estimated). They tracked counter-metrics: repurchase, cancellation, long-term.
  - Advice for apps without ML: offer three tiers. It turns "buy or not?" into "which one?", which lifts conversion (opinion / decoy framing).
  - Unbundling Passport (travel mode) as a 1/3/7-day à la carte item: conversion "went crazy" but cannibalized Plus. Raising the à la carte price cut cannibalization and raised total revenue. They then priced the 7-day Passport the same as a 7-day Plus subscription (a decoy that makes the subscription the obvious deal) and showed the subscription first with à la carte as a second-chance offer (A/B sequence, no numbers).
  - Tinder Select (~$499/mo) mostly failed despite whales and survey interest. There was an identity/brand mismatch: a luxury tier doesn't feel special inside a mass-market pool. It is being scaled down (observed).
  - Users decide emotionally, in about a second, and don't read feature comparisons (opinion).
- **Tactics:** personalized single-SKU paywall; 3-tier structure; decoy pricing of à la carte vs subscription; subscription first, à la carte fallback.
- **Caveats/contradictions:** The revenue number is a projection. Stated willingness to pay (surveys) didn't predict Select's uptake.
- **Quote:** "if we only offer one product, your decision is should I buy or not... three products, now you are thinking which one"

## Why Web Onboarding Should Sell The Problem, Not The Solution (Leon Sasson, Rise Science, 2026-03-05, https://youtu.be/0Rx4S-TvZdI)
- **Relevance:** high. A sleep app (directly adjacent to Trundle) on web vs app onboarding, paid trials vs free trials, and billing trust.
- **Findings:**
  - Porting app onboarding to the web failed at least twice (2022 and later). Web funnels only started working once they treated the web as a separate channel and surface and went through "hundreds and hundreds of iterations" (observed). Sleep/energy app.
  - Web ads reach a different audience: older (40-60+), more female, more e-commerce shoppers and fewer habitual app downloaders. They have lower intent but often high willingness to pay (observed). They lean toward Facebook's main app over Instagram.
  - App onboarding is about time-to-value (impress before asking for a trial). Web onboarding should sell the problem: help users realize their symptoms (tiredness etc.) are a sleep problem, personalize the problem, and save the solution/plan for later in the app. Pitching features and plans too early on the web didn't work (observed).
  - Creative that flopped for app campaigns sometimes wins on web and vice versa. Web and app performance can be uncorrelated month to month, which makes the whole business more robust.
  - Web ad algorithms learn faster because there are no SKAN/privacy delays, so creative iteration is much quicker.
  - Persona-matched funnels (e.g. "tired and want morning productivity" vs "50-year-old woman with menopause sleep issues") are the "holy grail". They are partly implemented and operationally heavy.
  - Web pricing: shorter plans (monthly, quarterly), and usually no free trial. A heavily discounted first period (e.g. half-price first month) beats free trials because it trains the ad algorithm away from people who start trials and cancel instantly (A/B, no numbers).
  - Billing trust is table stakes on the web: easy cancel, plan changes, refunds, support and chargeback handling. Without an easy cancel flow, trial conversion looks inflated but causes anger, chargebacks and card-network flags (observed).
- **Tactics:** problem-first web quiz; discounted paid intro instead of a free trial; monthly/quarterly plans on web; testing the same creative on web and app campaigns separately; persona-specific creative-to-funnel matching.
- **Caveats/contradictions:** He says others find free trials on web work just as well, so test it. Reverses the app rule "get to the aha fast" for web traffic.
- **Quote:** "trying to go straight to the aha moment... because they're just higher on the consideration phase"

## How One Offline Event Turned Into 4 Million Online Views (Larissa Morimoto, PhotoRoom, 2026-03-06, https://youtu.be/_HnZIIf8H2o)
- **Relevance:** low. Brand and offline marketing.
- **Findings:** A London LED-screen photo booth reached ~15,000 passers-by. The recorded UGC got 4M+ views and branded search rose ~18%. A Japan event with a comedian gave no uplift because his audience wasn't the ICP (same lesson as Calm's LeBron campaign). Avoid putting >70% of budget in one paid channel. Measure brand with branded search and awareness surveys, not CPA.
- Other: build UGC capture into any offline event.

## The Top 10% of Apps Grew 306%. Everyone Else? Barely Beat Inflation, SOSA 2026 (David Barnard & Jacob Eiting, RevenueCat, 2026-03-06, https://youtu.be/UO0NQNfICwo)
- **Relevance:** high. Industry benchmarks from RevenueCat's State of Subscription Apps 2026 on hard paywalls, trials, cancellation timing and CTA copy.
- **Findings (report data, aggregated RevenueCat plus Appfigures):**
  - Hard paywalls convert ~5x better than freemium: 10.7% download-to-paid by day 35 vs 2.1%. Year-1 retention is roughly equal (median ~26.8% hard vs ~27.7% freemium; P90 54% vs 58%). You don't sacrifice retention in aggregate.
  - ~80% of conversions happen on day 0 across the industry (host). Intent peaks right after install, and "50% day-1 retention would be great", so ask while users are primed.
  - 55% of all 3-day-trial cancellations happen on day 0, and the share is rising as consumers get savvier.
  - Trials of 17+ days convert 42.5% vs 25.5% for short trials (~70% better), yet more apps moved to 3-day trials. Hosts call this correlation, not causation (selection bias). Short trials win on cash flow and experiment speed.
  - AI apps: ~41% more revenue per payer but churn ~30% faster (year-1 retention 21% vs 31%). Hosts say they lack stored state and lock-in, while apps holding user history (Strava, Dropbox) are defensible.
  - Annual subscriptions: of annual subscribers who churn, 34% turn off auto-renew in month 1 and only ~11% in month 12 (4.7% in month 11). Most decide right after the charge, not at renewal.
  - Google Play: nearly a third of cancellations are involuntary billing failures. Cost and "not using enough" together make up ~70% of stated cancellation reasons. "Found a better app" is small.
  - Market: the top 10% of apps grew MRR 306%, the median 5.3%, and the bottom lost revenue. The top 25% grew 80%. New subscription apps per month rose from ~2,000 (Jan 2022) to ~14,700 (Jan 2026). iOS takes 77% of new launches. 69% of revenue comes from apps released before 2020. Median year-1 retention is ~27-30%.
  - Paywall CTAs: "Continue" is the most common, then "Subscribe". Host recalls Duolingo's "Try for $0" beat "Try for free".
- **Tactics/opinions:** hard paywall unless free users bring network, virality or data value (or launch hard and loosen later). Founders undercharge out of impostor syndrome, and pricing is reversible. Jacob favors the "Blinkist-style" trial reminder paywall as brand-positive. Turn on Google Play grace periods and billing-issue messaging.
- **Caveats/contradictions:** The hosts themselves warn that hard-paywall and long-trial stats are correlational. Mojo (same batch) counters with a generous free tier giving 50% of revenue after day 1.
- **Quote:** "You're never going to have them as primed and as jazzed about your product as they are right now."

## The Art of Driving Retention Through Product (Ben Gammon, Ladder, 2026-03-07, https://youtu.be/UCiGz2aBUhU)
- **Relevance:** high. Activation metric, habit loops, streaks, widgets, and stored progress as retention.
- **Findings:**
  - Work backward from results. Five-star reviews showed "getting results" drives retention, which in fitness means consistency. The activation target started at 4 workouts/week and was lowered to 3 (science-backed). The product's job became getting users to 3 workouts a week (observed). Strength-training app; subscription.
  - Ethos is "don't make me think": open, press play, do the workout.
  - The journal (logging reps and weights) feeds personalized weight recommendations and progress/PR messages after each workout ("+62% on dumbbell bench"). ~70-75% of users now log each workout (observed). It builds up stored state and pride, which makes the app sticky.
  - Adoption rose because a "welcome workout" had coach voiceovers explaining in the moment to open the journal and log weights. In-the-moment instruction is "10x more effective" than FAQs or notifications (opinion from observation).
  - The streak structure is deliberately simple: a check mark per workout, 3 check marks make a weekly streak, and a home-screen calendar widget lights up completed days. About a third of users install the widget. They don't prompt for it first ("you haven't earned that trust") and they give install instructions. The widget works as a billboard and gets noticed by friends (observed; correlation with retention claimed but no number).
  - Users of both workouts and the new nutrition feature convert at much higher rates when new and retain better (observed ~100 days after launch). Nutrition came from the annual survey.
  - Feedback: large surveys (7,500+ responses to a 45-minute annual survey) beat 5-10 user interviews in consumer apps, where interviewees don't represent the base (opinion).
  - For new features, judge early proxies (logging on day 1 and day 2, week 2-4 retention) before full retention data exists.
- **Tactics:** pick one consistency north star (3/week); check mark to weekly streak to widget; coach voiceover teaching features during first use; progress-since-start summaries; ask for the widget after earning trust.
- **Caveats/contradictions:** Retention claims are correlations. He admits benchmarks for widget adoption are unclear.
- **Quote:** "retention is king. It gives you permission to do everything else upstream."

## Why App Economy Disruption Won't Happen As Fast As You Think (Eric Seufert, Mobile Dev Memo, 2026-03-08, https://youtu.be/eKVHg2z3E_8)
- **Relevance:** low. Macro view on AI and distribution.
- **Findings:** Cheaper app production is inflationary for distribution: more supply makes standing out harder, so distribution beats code (opinion). Vibe-coded apps haven't produced notable companies. Copycats copy ads and features but can't copy a repeatable creative process. Use AI defensively, e.g. daily App Store scans for copycats (done at Fabulous). If price wars happen, he expects more ad monetization and not collapsing CPMs.

## How ElevenLabs Turns Feature Launches Into a Growth Engine (Luke Harris, ElevenLabs, 2026-03-09, https://youtu.be/fp_ld0mrNMg)
- **Relevance:** low. Paid UA and launch operations.
- **Findings:** Each launch is turned into an X thread, a landing page, and Meta/Google/TikTok creative variants. A custom GPT trained on their top and bottom ad copy rewrites launch copy. In-house "AI creative producers" make motion-design ads with AI voiceovers for fast hook testing. Spend is on track for $100M+ in ads. Google Search is the biggest channel, with 10-20% week-over-week scaling steps. In-platform lift studies with holdouts showed, e.g., only ~200 of 500 attributed conversions were incremental. They replaced a localization vendor with an LLM GitHub action. Also: remind existing users of new features in-app, which many apps skip (host).

## $6.7M ARR, No Paid Ads, and an Exit to Quizlet in 2 Years (Brett Bauman & Zack Hargett, Coconote, 2026-03-18, https://youtu.be/Wg70HlO-5gY)
- **Relevance:** high. Long onboarding, near-hard paywall, premium price test, login placement, trial-extension save offers, and positioning to the buyer.
- **Findings:**
  - Trajectory: $100k ARR in 45 days, $1M in 4 months, $2M in 5 months, $6.7M at exit. No paid ads (UGC creators only) and ~50% EBITDA margins throughout (observed). AI lecture note-taker for students and lifelong learners.
  - Near-hard paywall: one free note, then a trial. They charged from day one with a free trial to build momentum.
  - Price: launched at $99.99/yr and $19.99/mo. ~80% chose annual. A test at $129/yr gave both more users and more revenue ("the magical" result), and they stayed there (A/B). A premium price signals reliability, which matters because students trust the app not to lose a recording before an exam (opinion).
  - Onboarding: roughly doubling onboarding length to ~15 screens (more investment, personalization feel, social proof) raised trial starts 16% (A/B).
  - Login first cost ~10% drop-off. Moving account creation after the paywall, at the end of onboarding, was their "biggest win". Apple/Google IAP means no account is needed to buy (A/B/observed).
  - Web cancellation flow saved ~25% of would-be cancellers. Of the discount (~30% off), 3-month summer pause and "need more time? +7 days" trial extension offers, the trial extension was by far the most effective (observed). Once users leave auto-renew, it's hard to get them back.
  - Messaging: asking customers to describe the app surfaced "never miss a key detail". They used that verbatim on the first App Store screenshot.
  - Positioning: framing the product as a solution to a problem, or tied to identity ("I'm a student who records every class"), converts. Framing it as a novel toy doesn't. A 41M-view "brain-rot PDF" video (Minecraft parkour background) drove little revenue.
  - Buyer vs user: "my mom changed my life" videos targeted parents as payers for a ~$130/yr study tool.
  - Retention drivers: identity-linked, frequently repeated use (going to class), plus a growing archive of notes that builds lock-in.
  - UGC: recruit small creators (5-10k followers, Gmail contact). Agency-managed creators take more than they give. Keep a small, hands-on team (5-12 creators, 25 now) and tell them what converts. Performance-cut clips of the same raw footage (by a clipping agency) beat boosting organic posts, but paid ads never reached first-purchase profitability.
- **Tactics:** long personalized onboarding with social proof, then a paywall, then login; annual-heavy pricing at a premium price; trial-extension save offer; testimonial language in screenshots; marketing to the payer.
- **Caveats/contradictions:** Directly contradicts the ElevenLabs "strip the quiz" lesson (longer onboarding +16% here). Cancellation-flow wins were web/Stripe only. Apple's retention offers are in limited beta and probably discount-only.
- **Quote:** "if you frame your product as a novel toy, people are going to treat it like a toy"

## How the World's #1 VPN App Reached 1 Billion Downloads (Tanuj Chatterjee, Super Unlimited, 2026-04-01, https://youtu.be/Y16aBkMc6hk)
- **Relevance:** medium. Generous freemium as a growth engine, soft paywall, rating-prompt timing, and screenshot tests; mostly a scale and infrastructure story.
- **Findings:**
  - 1M+ downloads a day, mostly organic, and 1B+ lifetime. #1 for "VPN" in 67 of 71 tracked iOS countries (observed). Consumer VPN; freemium with ads.
  - Deliberately low free-to-paid conversion: a very generous free tier ("unlimited", a couple of ads) maximizes the top of the funnel, ratings and rank. "Don't mess with" the top of the funnel (strategy/opinion).
  - No login and a soft paywall with an obvious close X. No ads on the very first session, so users see value first. He'd rather "leave 10% on the table" than burn trust by over-monetizing (opinion).
  - Rating prompts come only after value has been delivered, and not too often. 2M+ ratings. Ratings broken down by country revealed quality problems in specific markets (practice).
  - Success metric is intent to come back, not time in app (average session ~30 seconds).
  - Modernized App Store screenshots lost ~80% of A/B tests. Users preferred the familiar "stale" ones (A/B). Big listing changes are risky for a #1 app.
  - Growth came from fixing complaints in their own and competitors' reviews, and from service quality. Geopolitical spikes (Turkey's Instagram ban: 15M downloads in 4 days) settle at a higher new baseline.
  - Premium value: no ads, more locations, faster servers, support, and now multi-device (Windows). Next: bundling eSIM and second-number apps into the base.
- **Tactics:** support team reports to product; debug builds tested in real conditions (elevators); feature flags to ship per-country algorithms; cloud for surges and bare metal for baseline.
- **Caveats/contradictions:** Works because of huge organic volume and low marginal cost per free user. The opposite of the SOSA hard-paywall advice. He admits their LTV is low.
- Other: SEO/GEO is early and small; ASA used for brand defense and specific keywords.

## The AI Growth Playbook for Subscription Apps (Phil Carter, Elemental Growth, 2026-04-15, https://youtu.be/UYIgu02h8cs)
- **Relevance:** high. First-session magic, personalization, extrinsic triggers, multi-step paywalls, trials vs AI costs, and a hard-paywall-to-freemium case.
- **Findings:**
  - Day-0 share of trial starts rose from ~70-75% (2023-24) to 80%+, and almost 90% in some categories (RevenueCat SOSA data as cited). Convert in the first session, ideally within 30-60 seconds of a "magical" moment (opinion).
  - Tolan (AI companion) as the model onboarding: an oracle asks personal questions, matches you to a companion with a personality, explains why, and drops you into voice chat within a minute or two. The personality infographic is a shareable artifact (anecdote). AI makes real-time reactions to quiz answers possible, and even jokes, so onboarding feels fun and already useful.
  - Hyper-personalization: onboarding quiz answers produce an n-of-1 plan that adapts with each logged session (Runna, Ladder). Quiz data also helps optimize paid marketing, especially in web funnels (opinion/examples).
  - Extrinsic triggers build habits (Hooked model). Use platform surfaces (notifications tied to real events, widgets, keyboards, live activities, desktop overlays) that are useful in themselves, not nagging. Examples: Granola meeting alerts, Wispr Flow's persistent widget that later teaches tips. Triggers should become intrinsic habits over time (opinion/examples).
  - Value-to-noise ratio: shipping more features adds noise. Prune features that don't correlate with retention and keep the hero features (opinion).
  - Win of the year: moving a client from a hard paywall to freemium with a multi-step paywall ("free forever, but try the best version free for 7 days, then subscribe") plus pricing changes gave +75% LTV per user (client result, unnamed).
  - Fail of the year: another client's switch to freemium cut subscriber conversion by >50% and was rolled back in weeks (client result). For most apps, especially bootstrapped ones, a hard paywall is right. Freemium is "chess" for billion-dollar scale (Spotify, Duolingo, Strava).
  - AI apps: offer basic vs AI-heavy tiers, shorter trials and tighter freemium to cap compute cost (Tolan shortened its 7-day trial), and credits beyond usage caps. Referral credits act as a viral loop. Cal AI's ~$30/yr entry price was cited as part of its success (host).
  - PhotoRoom showed its AI feature in the first 6 seconds of ads, which lowered CAC and unlocked Mexico, Brazil and Indonesia (anecdote).
  - Runna went from tens to 400+ creative concepts a month. Avoid fully AI-generated fake testimonials (FTC risk). Use AI to vary voice, music and language on real people.
- **Tactics:** magical-first-minute onboarding; quiz answers feeding a visible personalized plan; widget or notification triggers that are useful on their own; multi-step paywall for freemium; tiering AI cost.
- **Caveats/contradictions:** Freemium results split, +75% at one client and -50% at another. The host pushes back on "use cheaper LLMs" if it hurts quality.
- **Quote:** "the bottleneck is the capacity of a human brain to absorb the most valuable parts of your product experience"

## Why Opal Stopped Chasing Revenue to Build a Billion-User App (Kenneth Schlenker, Opal, 2026-04-29, https://youtu.be/tJnJflSXaE4)
- **Relevance:** high. Direct competitor category (screen time / app blocking). Covers the switch from hard paywall to freemium, where to draw the free line, streaks, gem rewards, and retention.
- **Findings:**
  - Opal hit $10M ARR with ~11 people on a hard paywall, then switched to true freemium to pursue a billion users. Paid penetration (payers / MAU) fell from ~20% to ~9%, but DAUs "exploded" past 1M, organic growth rose a lot, and revenue grew with it ("pays back tenfold", CEO claim, no exact numbers). 10M+ downloads. Screen time / focus.
  - Freemium unlocked new segments. Students are now ~2/3 of DAU. Students then pulled in schools: Opal for Schools blocks banned apps on campus, sold per student and started from an inbound request from a high school. Family word of mouth runs both ways between teens and parents (observed).
  - Test for the free/paid line: "Would a non-payer recommend the app? If not, give away more." A stingy, trial-like free tier gets none of the organic benefits (opinion/rule).
  - Measure both install LTV and total retention (free plus paid) and look for changes that raise both. Example: the number of free "blocks" (scheduled blocks or open limits). They tested 1 through several and settled on 3: enough for a real experience while power users pay for more (A/B series).
  - Biggest win of the year: streaks, counted their own way (focus-based), shown as a custom animated flame (not an emoji) with Opal gems at milestones. It improved retention and growth (observed, no number).
  - Most-loved interaction: tapping to crack open a gemstone unlocked at usage milestones. It's expensive to build and not directly measurable, but it's what users remember and talk about (qualitative). Gem theme: opal is the tactile opposite of a warm glass phone and is "said to calm the mind".
  - Early retention is "top rank", on par with or better than Duolingo, Spotify and Strava (claim, no number). The next challenge: most people agree they use their phone too much but balk at "an app that blocks apps". Growth to the next 100M needs no setup, less commitment, and coaching rather than just restriction (strategy).
  - A viral organic film by a user (the "your phone is a nuclear-grade weapon aimed against you" ad) was licensed as-is with the logo added. It has been seen by tens of millions and runs for years. They hired a user-creator for an "Olivia Unplugged" educational channel (screen time, bedtime routines, making friends offline): 0 to ~700k followers in months.
  - The "Scrolling Kills" billboard and stickers (no Opal branding) had no measurable download impact but helped close a school deal. Treat it as brand.
  - Competition from many vibe-coded screen-time clones helps educate the market. Copying Opal limits clones to the existing niche.
  - "If your user wins, you win". Build AI on the user's side, not to manipulate.
- **Tactics:** generous freemium with capped blocks (3); a streak tied to the core behavior (focus), with custom visuals; variable-reward gem unlocks at milestones; school phone-policy distribution; family feature in progress; licensing user-made organic videos as ads.
- **Caveats/contradictions:** Contradicts the SOSA "hard paywall converts 5x" advice. It worked for Opal after it had brand, scale and word of mouth, and Phil Carter saw a -50% freemium failure. Revenue impact isn't quantified.
- **Quote:** "Retention is the ultimate proof of value. If a user comes back, you're creating something real."

## Batch-level patterns
- **Check early wins against downstream metrics.** Yousician, Mojo and Tinder all reject or re-check tests that win on day-0/day-7 revenue until they see renewals, refunds, 7-day cancellation rate and repurchase. Mojo killed a winning higher price when its 7-day cancel rate spiked. Yousician found a win-back offer was net negative once refunds were counted.
- **Most conversion happens in the first session.** ~80% of conversions (up to ~90% in some categories) happen on day 0, and 55% of 3-day-trial cancellations also happen on day 0. Onboarding, paywall and trial-reminder framing in the first minutes decide most revenue (SOSA, Phil Carter, Duolingo).
- **Hard paywall vs freemium is the batch's biggest disagreement.** SOSA: hard paywalls convert 5x (10.7% vs 2.1%) at similar retention. Coconote grew on a near-hard paywall. Opal, Super Unlimited and Mojo win with generous free tiers that drive word of mouth and later conversions (Mojo gets 50% of revenue after day 1). Phil Carter saw +75% LTV at one client and -50% conversion at another after switching to freemium. Freemium seems to need scale, virality or low marginal cost.
- **Trial design is shifting.** 7-day beats 14-day on net and doubles test speed (Duolingo). Users choosing their reminder day lifts conversion. Paid or discounted trials beat free ones on the web and in China (Rise, Duolingo). A trial extension is the best save offer (Coconote). Trials added nothing where purchase intent was already set up front (Skylight).
- **Price increases usually work when they apply to new users only.** Skylight $39 to $79 and Lose It! $40 to ~$80 held conversion and retention, and Coconote's $99 to $129 raised both users and revenue. All grandfathered existing users, and Skylight passed on $99 despite slightly better math because of emotional-backlash risk.
- **Paywall layout.** Annual-first with monthly hidden (+15-20pp annual share), per-month anchoring (+10% US, +30-40% LatAm), 3 tiers or decoy pricing (Tinder), and culture-specific design: a long, social-proof-heavy paywall won in Japan while a clean punchy one won in the US.
- **Onboarding length depends on context.** ElevenReader found fewer screens to the aha worked better than quiz tuning. Coconote got +16% trial starts from doubling onboarding to ~15 screens. Web traffic needs "sell the problem" (Rise). The common thread: personalization should visibly produce a plan or result, and login goes after the paywall (Coconote's biggest win).
- **Habit mechanics tied to the core behavior drive retention.** Ladder's 3 workouts/week, check marks, weekly streak and home-screen widget (~1/3 install it). Opal's focus streak and gem unlocks. Logged progress acts as stored state (Ladder journal ~70-75% usage). Skylight: habits set within ~30 days, so feature adoption has to happen in onboarding.
- **Clarity and trust over persuasion.** Duolingo's timeline and reminder choice, Skylight's rule that the core purchase stays free, Super Unlimited's easy-close paywall and value-first rating prompts, Rise's easy web cancellation. All frame trust as a conversion lever, not a cost.
- **Organic content and UGC beat paid for many.** Coconote ($6.7M ARR, no paid ads), Opal (licensed a user film, hired a user-creator), Super Unlimited (1M downloads/day organic). The recurring rule is to frame the product as a solution or identity, not a toy.
