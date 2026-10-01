# Sub Club notes: batch 04

Source: 15 Sub Club podcast transcripts (Jan to Jun 2024), auto-captions. Numbers marked "(?)" are ones where the caption looks garbled or the speaker is ambiguous.

## How to Pitch Your App to TechCrunch (TechCrunch writer, not named in the clip, 2024-01-03, https://youtu.be/r9eCBn3Ralc)
- **Relevance:** low. PR pitching only.
- **Findings:** A solid app with good design is only "zero" now. Coverage comes from differentiation, a timely hook (a new platform API or model, current events), or the founders' personal story. Writers get about 500 pitches a day (anecdote). Keep pitches to a short subject line, a few sentences, and one strong screenshot inline. Attach or link a press kit. Skip tracking pixels. Give a direct phone number or email, because deadlines are tight.

## Lessons from 121 A/B Tests (Kenneth Schlenker, Opal, 2024-01-10, https://youtu.be/4le1GR2BF6M)
- **Relevance:** high. Opal is a screen-time and app-blocking app on iOS with a paywall in onboarding and scheduled blocking. It is the closest analog to Trundle in this batch.
- **Findings:**
  - **Paywall placement.** Across many iterations, the paywall should come early in onboarding but not on the first screen. Put it at the "peak motivation moment," after a few screens build intent. This took download-to-trial from about 7% to about 17% (captions say "177%", read as 17%). Evidence: iterated A/B tests on iOS, paid-acquisition users, audience mostly knowledge workers aged 25 to 40.
  - **Moving the paywall two screens earlier** can give about +10% trial starts. He cites this as an example of a cheap big win. It reads like a real Opal result, but he frames it loosely.
  - **Dismiss button.** Hiding the dismiss button or making it as discreet as possible was a winner. He also mentions setting the X button's opacity to 80% and getting +20% revenue. It is unclear whether that is Opal data or an illustration (?).
  - **Scheduled session.** Onboarding the user straight into a scheduled blocking session was a "huge win." The user picks distracting apps (for example Instagram or TikTok). The app then creates a Mon–Fri 9-to-5 block by default. The next day blocking starts on its own, without the user needing to remember, and that is what commits them. Editing must be easy, but the default is automatic. Evidence: A/B test, uplift size not given.
  - **Choice in onboarding hurt.** Every test that offered more choice (for example, how to disconnect) failed. Users have a limited "fatigue budget" and need one simple thing to commit to. Evidence: A/B tests.
  - **Blinkist-style paywall wins.** The transparent trial-timeline paywall (trial starts today, reminder on day 6, charge on day 7) is still the main onboarding paywall. Dozens of challengers never beat it. Once placement was right, paywall content was not a big lever.
  - **Day-1 re-engagement mostly failed.** Most attempts to re-engage users after onboarding and day one failed. The exception: when a user cancels their trial, a 50%-off offer via push (OneSignal) plus an in-app modal "works quite well." The offer was still being A/B tested at recording.
  - **Tiered referral rewards.** Invite 5 friends for a free year, 20 for lifetime, and a prize at 50, in a nicer UI. This gave +80% in users who send at least one referral (A/B test).
  - **Social feature.** Seeing friends' screen time gave only a slight uplift. The app uses phone-number sign-in partly to support it. Dropping email collection from onboarding was still being tested.
  - **Business model.** The early model was a hard-ish paywall pushing a pricey annual plan. He calls it the "gym membership effect": users pay partly to commit to changing. Annual price started at $69 and rose to about $99–100. They ran on 100%+ day-8 ROAS with a 7-day free trial, which let them read every test in about 8 days. They grew from about $0 to $5M ARR in a year on paid ads, with a team of 7.
  - **Freemium phase.** Phase two moves toward freemium. They made the onboarding paywall easier to dismiss. That raised activation and lowered ARPU "in a manageable way," and he judges the net as positive long term. Goal: raise retention while keeping first-year ARPU above about $2 (?). Paid penetration of MAU is about 17% (captions say "177%" (?)). He compares Duolingo at about 7–8% (captions say "78%" (?)).
- **Tactics:**
  - The flow asks for current screen time and a few questions, then builds a mini report. It projects lifetime phone use (a US average of about 22 years, using 5h08m a day over waking hours). Then it reframes: "we can save you 3–5 years." The trial offer comes right after.
  - Ask age during onboarding and branch the flow. Older professionals see the annual paywall. Students see referral and free paths.
  - Attribution: ask "where did you hear about us" in onboarding and segment ROAS by the answer. He calls it the most reliable method they have.
  - Ship one release every Monday and judge it on day-8 ROAS.
  - Prioritize big swings. Small UI tweaks can beat weeks of feature work.
  - Ads: mission-led creator videos that don't even show the product. They licensed an organic video from a creator who already used Opal. Creative is about 80% of the ad work.
- **Caveats/contradictions:** He admits 121 tests was too many and they should have prioritized bigger swings. The hard-paywall and annual-plan funnel suits 25–40 knowledge workers but not students, and he thinks it caps growth at around $10–30M ARR. That is why they are moving toward freemium, the opposite of Duolingo's path.
- **Quote:** "you need to get the pay wall to be as early as possible in the onboarding but not too early"

## App Strategy: Succeeding with Freemium and Hybrid Monetization (Paul Ganev, Surfline, 2024-01-24, https://youtu.be/3HqbctsBrCw)
- **Relevance:** medium. A freemium framework and pricing versus market size, not onboarding.
- **Findings:**
  - Size the market with SAM, not TAM. Commitment and frequency of the activity are the variables most often left out.
  - If your serviceable market is small, weight effort toward ARPU rather than subscriber growth. Charge something like $120/yr, not $20 (host and guest opinion).
  - He splits willingness to pay into purchasing power, commitment or passion, and strength of the value proposition.
  - The freemium "golden rule": balance conversion against free-user retention. Doubling conversion at the cost of free retention shrinks the pool you convert from. If forced to choose, favor free retention.
  - Most conversions happen in the first 7 days, then a trickle continues. For Surfline, baseline free-to-paid conversion has risen steadily over five years as the product improved. Launches give a spike, then settle at a higher baseline (observed data).
  - He prefers "unlimited use of limited features" over metered access (New York Times style). Frequent free use means habit plus more chances to message users. Both models were tested; results not given.
  - Taking away free features you used to give creates entitlement and resistance. Surfline went from free to paid.
  - Monetizing the free base: unskippable pre-roll video ads before the cams. Brand perks for subscribers (for example surf-park discounts) instead of ads behind the paywall.
- **Tactics:** Freemium works as a habit and education funnel, and the tradeoff is lower CAC. Surfline spends $0 on paid acquisition. Growth comes from SEO spot pages, brand, and word of mouth.
- **Caveats/contradictions:** He warns freemium hurts early, since it adds a step before payment. It also takes years of testing where to draw the free/paid line.

## Apple's Response to the EU's DMA (panel: David Barnard, Jacob Eiting, Jens-Fabian Goetzmann, Nico Wittenborn, Gabriel of Runway, 2024-01-29, https://youtu.be/TM7g8ZK6kc8)
- **Relevance:** low. EU regulation and fees. One onboarding data point.
- **Findings:**
  - EU alternative terms and the 50¢ Core Technology Fee only make sense for apps with high conversion, high annual price, and few retained free users. Most developers should stay on the old terms.
  - Aside: David had just launched a hard paywall on Weather Up. Over its first 24 hours, the trial start rate was about 25%, so about 75 of every 100 installers never start a trial (anecdote, press-driven traffic).
  - EU is about 12% of App Store revenue across RevenueCat customers.

## App Growth: Defining Addressable Market for Apps (Paul Ganev, Surfline, 2024-02-06, https://youtu.be/5LjcT4HZ8BU)
- **Relevance:** low. A clip from the Surfline episode above.
- **Findings:** Same TAM → SAM → SOM points. Start with market research, then cut it down using your own analytics (geography, demographics, commitment). A small SAM means focusing on ARPU or adjacent markets.

## Building a Content Marketing Flywheel (Fares Ksebati, MySwimPro, 2024-02-21, https://youtu.be/HALDkO4UiLQ)
- **Relevance:** medium. Mostly content marketing, but it has useful pricing and packaging data.
- **Findings:**
  - **Price increases barely moved conversion.** They went from free to $10/mo, then about $100/yr, $120/yr, and now $180/yr. Conversion rate "didn't really change much" at each step, so they kept raising prices as the product improved. Evidence: sequential price changes plus A/B tests; swim coaching app; fitness adults.
  - **Price-sensitivity survey.** A Van Westendorp-style survey (four "too cheap / too expensive" questions, the method credited to the Ladder founder) went to free and paid users. The average landed near the current price, but a segment said they would pay $200–300/yr. He thinks roughly 20% of payers could pay far more, which argues for tiers and packages over one winning price.
  - **Entitlement complaints.** Many "too expensive" reviews come from users who lost features that used to be free. He says premium positioning at a higher price attracts people ready to pay, and some people complain at any price.
  - **Validate before building.** A mockup landing page with 4 value props and an email capture, with traffic from Twitter DMs, got 200 signups in a couple of weeks before the app existed.
- **Tactics:**
  - Put the app on screen for about 30% of a video rather than hard-selling it. About a third of videos carry a 60s+ integration.
  - Use App Store custom product page URLs per social channel for attribution.
  - Survey users on how they found the app.
- **Caveats/contradictions:** Paid ads failed twice and were on a third attempt at recording. He blames weak analytics and slow iteration. Organic search has plateaued.

## The Future of Subscription Apps / State of Subscription Apps 2024 (David Barnard & Jacob Eiting, RevenueCat, 2024-03-11, https://youtu.be/uo5EjSoQhUg)
- **Relevance:** high. Benchmarks on conversion timing, retention, and win-back.
- **Findings (RevenueCat data, 2024 report):**
  - **Download-to-paid within 30 days:** median 1.7%, lower quartile 0.6%, upper quartile 4.2% (a 7x spread). North America converts far higher than other regions in almost every category.
  - **Trial timing:** most trial starts (about 70%+ "on average", read from a chart) happen within 24 hours of install, in nearly every category.
  - **Value per download:** realized LTV per download at day 14 is $0.35 in North America versus $0.08 globally, a 4x gap on both stores. Japan and South Korea monetize well, and better on Play than on the App Store.
  - **Retention fell:** the share of monthly subscribers retained at 12 months dropped 14% (relative) in 2023. First renewal rates fell about 3% relative for monthly and about 13% relative for annual. Annual first renewal went from about 30.5% to about 28% in absolute terms. They attribute it to more aggressive, earlier paywalls, lower-intent users at scale, and inflation.
  - **Win-back:** over 10% of churned monthly subscribers resubscribe within 12 months, and more than that in media and entertainment. The pool of churned users only grows, so reactivation compounds.
  - **Power law:** the top 5% of new apps make 200x+ the monthly revenue of the bottom quartile a year after launch. The median new app makes about $50/month at month 12. The upper quartile makes about $300–400/month.
- **Tactics:**
  - Focus effort on the first session and getting the trial started. Jacob: a buy button on the first screen will beat a delayed paywall that only about a fifth of downloads ever see.
  - If a user doesn't subscribe in session one, send a discount within the first 24 hours (credited to Jake Moore, Superwall). David planned to implement it.
  - Leave win-back until the churned base is large, hundreds to thousands of users, not 15.
  - The further you are from target metrics, the more radical your experiments should be.
- **Caveats/contradictions:** Benchmarks are for context and ideas, not targets. On regional pricing, lowering prices in poorer countries may just discount the middle-class buyers who already convert.
- **Quote:** "I will beat you just by putting a buy button on the first screen by pure law of numbers"

## Lessons from a Lackluster Launch (David Barnard, Weather Up, 2024-03-20, https://youtu.be/p15schrqNzo)
- **Relevance:** high. A founder's own paywall A/B test and pricing mistakes.
- **Findings:**
  - **Default plan A/B test (paywall pre-selection, $4/mo vs $40/yr, even split).**
    - Annual default: about 800 chose annual and about 400 chose monthly, so about 33% switched away from the default.
    - Monthly default: about 1,100 chose monthly and only about 100 switched to annual.
    - The monthly default gave about 10% more paying subscribers (he later cites it as "20%" in the Microsoft and Google episodes (?)). Realized LTV in the first month was about 60% lower. He expects the monthly arm never to catch up once annual renewals land.
    - Over 30% of monthly subscribers had turned off auto-renew within month 1.
    - Evidence: RevenueCat Experiments A/B test, statistically significant; weather app, press-launch traffic.
  - **Launch price and discount.** $40/yr was probably too high for a commodity category. Weather nerds compare against Carrot Weather at about $30/yr for its top tier. His biggest regret is not running a launch discount (25–50% off). Press coverage printed the $40 price with no urgency. In hindsight he'd do about $30/yr with a launch price around $19.99.
  - **Traffic source changes willingness to pay.** Press traffic is browsing curiosity. Search traffic ("I need a weather app") and paid-ad traffic set up expectations differently. Paywall offers could vary by source.
  - **Value, not cost.** He priced from his own data costs (widgets constantly refresh weather data). Price to perceived value, and use analytics to see who actually uses the expensive features.
  - **Outcome:** close to 2,000 subscribers at $40/yr from the relaunch.
  - **Ship steadily.** Holding features back for one big "3.0" launch was a mistake for a subscription app. Steady shipping keeps editorial and press attention.
- **Tactics:**
  - A custom SwiftUI paywall with a feature video, built behind RevenueCat's footer paywall in under a day. The video doubled as the press pitch.
  - Experiment scheduled to start at 12:01 a.m. on launch day.
  - A follow-up test of $40 versus $39.99 annual, set up without code changes.
  - Plan: relaunch with one or two new features plus a sale, then test win-back offers.
- **Caveats/contradictions:** The data comes from a launch cohort. Later search-driven users may behave differently, and the subtle test may need longer runs. It contradicts the common advice to default to monthly for faster feedback: that cost LTV here.
- **Quote:** "10% more people became subscribers when they saw $4 versus seeing 40" (then LTV fell about 60%)

## Scaling Your Subscription App with Meta Ads (Marcus Burke, independent consultant, 2024-04-04, https://youtu.be/Pb5TuG77O7M)
- **Relevance:** medium. Mostly ads, but with clear onboarding, pricing, and trial implications.
- **Findings:**
  - **Trial is only a proxy.** Trials convert to paid only about 30–50% of the time. Optimizing ads for trial start can find low-value trialists.
  - **Age drives trial conversion.** He usually excludes under-25s, sometimes under-30s, at first. Meta loves cheap young users who produce cheap trials that don't convert. Older users "just convert better" (observed across client accounts).
  - **3-day vs 7-day trial.** A 3-day trial only speeds up reading results. If 7 days converts 5–10% better, keep 7 days.
  - **Match price to placement.** Reels and UGC-style ads bring younger, lower-intent users. An $80–90/yr price will struggle with that traffic.
  - **Tracking limits.** SKAN under-reports trials by about 50%. The SKAN 3 privacy threshold is 88 installs/day per campaign ID, dropping to about 20 in SKAN 4 (AppsFlyer data).
- **Tactics:**
  - Ask age, gender, and "where did you hear about us" in onboarding, and cross-check against Meta's age and gender reporting.
  - Show onboarding reviews from someone in the target demographic.
  - Reuse winning ad creative in App Store screenshots for continuity.
  - Consolidate campaigns early.
  - Test creative in a separate campaign that uses the same optimization event and core markets.
- **Caveats/contradictions:** Survey attribution never matches ad data one-to-one; users name the first touchpoint. All the modeling is "scrappy" estimation.

## Learning and Profiting from Black Swan Events (Val Agostino, Monarch Money, 2024-04-17, https://youtu.be/ikMjQ-asevU)
- **Relevance:** low-medium. Product discovery methods and positioning. No funnel numbers.
- **Findings:**
  - Subscriptions align the product with the user; ad-supported products drift toward serving advertisers. That was Monarch's founding choice versus Mint.
  - The "viable" bar in an MVP is much higher in mature categories.
  - "Five whys" on "see everything in one place" led to the real need: a feeling of control, order from chaos. He says messaging should sell that, not the dashboard.
  - JTBD example: bill due-dates turned out to serve users with ADD and people making sure cash covers upcoming bills.
- **Tactics:**
  - A public roadmap voting board (Productboard) linked from settings.
  - Clickable prototypes shown to the users who voted for a feature, before building it.
- Other: the Mint shutdown raised daily signups 20–30x overnight. A fast importer and an authentic founder post on Reddit captured it.

## Operating Like a Start-up inside the World's Biggest Company (Ramit Arora, Microsoft, 2024-05-02, https://youtu.be/ClaqLrboX2I)
- **Relevance:** medium. One strong conversion data point, plus prioritization.
- **Findings:**
  - **App Store checkout converts better.** Trial-to-paid is about 5x higher on the App Store than on some of Microsoft's direct channels. He attributes it to the card already being on file, frictionless purchase, and trust in Apple to manage subscriptions (observed data, Microsoft 365 consumer).
  - **Bundles retain.** Bundling many occasional jobs (scan, docs, PDF, notes) keeps retention up at the suite level, because each single job is infrequent.
  - **Fix the purchase flow first.** Transaction failures of 5–6% had to be fixed. The biggest wins are often plain purchase-flow and first-run improvements.
- **Tactics:**
  - The neutralize / differentiate / maintain / incubate framework for competing, judged through jobs-to-be-done.
  - Require an estimated-impact number before any project.
  - Host's point: small apps chasing win-back at $100k/mo revenue is usually the wrong priority.

## Optimizing your Keywords and Monetization, Part 2 (Ramit Arora, Microsoft, 2024-05-15, https://youtu.be/fPenDf1Wj2I)
- **Relevance:** high. Paywall A/B test results from a very high-traffic app.
- **Findings (Microsoft 365 mobile paywall tests, results given as "very successful" without figures):**
  - **CTA wording.** If there is a free trial, the CTA must say so (for example "Try free for 1 month"). A "Buy now" CTA under a trial headline makes people afraid to tap because they fear an instant charge.
  - **Visual cards.** Cards with GIFs or illustrations beat lines of text. Example: showing 1TB of storage going to each of six family members.
  - **Default the pricier plan.** Making Family ($9.99) the default instead of Personal ($6.99) raised sales of both. Personal, now listed below Family, rose "a lot more." He calls it a decoy or anchor effect.
  - **Monthly-equivalent price.** Showing the annual plan as a per-month price (about $8/mo) won.
  - **Android monetizes far less.** Android CPI limits can be about 50x lower than iOS (?). He sees roughly an 80/20 iOS vs Android revenue split despite Android's install base.
- **Tactics:**
  - ASO built on jobs-to-be-done keywords (resume, invoice, budget, notes), not only brand or competitor terms.
  - Rotate out keywords you've held in the top 3 for about a year.
  - Use Apple Search Ads to find profitable keywords.
- **Caveats/contradictions:** David repeats his Weather Up monthly-default result here as a "20% increase" in conversion. The Weather Up episode says about 10%.

## Insider Tips for Building Better, More Profitable Android Apps (Sarah Karam, Google Play, 2024-05-20, https://youtu.be/3k4C4JqG44M)
- **Relevance:** medium. Monetization-structure ideas and one surprising timing stat. The transcript reads like a machine re-translation.
- **Findings:**
  - **Late purchases are common.** Play data shows most users who make in-app purchases, subscriptions included, wait over a year before buying. The size of the effect varies by niche. She says it argues against assuming a user is lost after the first couple of weeks, and it contradicts the RevenueCat "first 24 hours" emphasis.
  - **Secondary product-market fit.** Apps with a strong second fit have about 3x the minutes per DAU and about 2x DAU/MAU (Google white paper). Example: Calm's sleep stories added a nightly trigger that meditation lacked.
  - **Diversify offers.** Hybrid and diversified monetization (weekly plans, prepaid plans, 7-day passes, consumables, tipping) wins in APAC and increasingly in the US. The US has many mid- and low-end Android users.
  - **Paid pass for AI apps.** For AI apps with high serving costs, a paid 7-day pass (about $2) can replace a costly free trial.
  - **Easy cancellation.** Google requires a one-tap cancel button despite developers blaming it for churn. She says trust depends on easy cancellation and renewal notice.
- **Tactics:** Start diversifying with price and plan tests before building a virtual currency. Newer Play features: student and senior plans with status verification, installments, "ask someone else to pay," anti-arbitrage tools, device checks against trial abuse, and custom store listings per search keyword.
- **Caveats/contradictions:** Premium Android users behave like iOS users. Copying iOS pricing works only if you target that segment.

## Why Duolingo's App Engagement Strategy Won't Work For Every App (Asya Paloni, Welltory, 2024-05-29, https://youtu.be/fLcgyUS4qjU)
- **Relevance:** high. Habit and retention psychology for apps whose "work" happens outside the app.
- **Findings:**
  - **No daily job in wellness.** Athletes and sick people have a daily event that prompts opening the app. Most people don't. Welltory's retention came from targeting the one universal trigger: boredom, or "existential horror" in a queue or on the couch. The app has to be as novel and entertaining as TikTok and must avoid shame.
  - **Why Duolingo's loop is special.** Duolingo can shame you into opening the app because the daily task is finished inside the app in 3–5 minutes and rewarded instantly. Health behaviors (sleeping 8 hours) happen outside the app, so shame-plus-streak loops don't transfer. Their personalized daily-plan and checklist approach was tried and dropped.
  - **Shame drives churn.** Welltory built "more scientific" Apple-style rings with smarter move goals. It worked for a small segment but caused shame and was not a retention driver. A tired user who knows they'll see failed goals simply won't open the app.
  - **Novelty.** A novelty system (about 45 message types with near-endless generated variants, built before LLMs) is what gave their initial retention boost (observed).
  - **Wellness is bigger than sleep.** She notes a quit-smoking app shouldn't want high retention, so retention isn't the goal for every product.
- **Tactics:**
  - The five principles: make it magical (value for zero effort; an HRV "liquid" that changes color from Apple Watch data), relevant (tie metrics to what the user cares about, such as GitHub commits), make sense in real time, novel, and pleasurable.
  - Seven retention drivers: magic, novelty, relief, personalization, gamification, bragging rights (shareable status images), social.
  - Innovation checklist: mission fit, then target persona (their main one is "The Dude"), then trigger, then jobs (meta and immediate), then retention drivers, then musts versus delighters.
- **Caveats/contradictions:** She says she hasn't solved how to show bad news (poor sleep, high stress) without shaming, and treats the framework as a thinking aid, not a scorecard. It pushes back on "build the Duolingo of X" advice.
- **Quote:** "you can't get a better night's sleep in five minutes in the grocery store line" (David, agreeing with her point)

## WWDC 2024: What Apps Need to Know (David Barnard, Jacob Eiting, Charlie Chapman, RevenueCat, 2024-06-17, https://youtu.be/ZH3jkj2WbM8)
- **Relevance:** medium-low. Platform features that touch win-back and onboarding.
- **Findings:**
  - **Win-back offers (iOS 18).** They target lapsed subscribers and are configured in App Store Connect. They can show as an automatic system popup when the user opens the app, on the App Store product page ("streamlined purchase," on by default), and possibly in editorial or personalized placements. You can share offer links.
  - Jacob's critique: most of the value in win-back comes from reaching churned users by email or push, which Apple doesn't provide. RevenueCat wants a server notification when a user becomes eligible. Their estimate: roughly a 1–2% lift, "free money."
  - **Custom product pages.** Up to 35 per app. They can deep-link into a tailored onboarding (for example a runner versus cyclist flow), work with Search Ads keywords, and act as coarse campaign attribution.
  - Other: StoreKit 1 is deprecated; contingent pricing for cross-app bundles; one screenshot set per device family; featuring nomination form; AdAttributionKit re-engagement needs iOS 18.

## Batch-level patterns
- **Paywall early, after intent.** Opal (7% → 17% trial starts), RevenueCat data (about 70%+ of trials start within 24 hours; a first-screen buy button beats a delayed paywall), and Weather Up's hard paywall (about 25% trial start) all push toward monetizing in the first session. Opal's refinement: not screen one, but right after a motivating "aha" such as a personalized projection. Google's Play data (most purchasers wait over a year) is the main counterpoint, and it fits freemium or hybrid apps.
- **Reduce trial anxiety.** Opal could never beat the Blinkist timeline paywall (reminder before charge). Microsoft found "Try free" CTAs beat "Buy now." Google insists on easy cancellation for trust. Reassurance at the purchase moment keeps winning over clever copy.
- **Defaults and anchors swing results.** Weather Up's default plan changed the mix massively (about 33% left the annual default, only about 8% left the monthly default). Microsoft's default of the pricier Family plan lifted both plans. Showing a monthly-equivalent price won. What's pre-selected, and in what order, is a high-leverage paywall test.
- **Conversion rate vs revenue can split.** A cheaper-looking default raised conversions about 10% but cut early LTV about 60% (Weather Up). An easier-to-dismiss paywall raised activation but cut ARPU (Opal). Several guests judge on revenue or ARPU per install, not conversion alone.
- **Fewer choices, automatic commitment.** Opal's onboarding choices always lost, while auto-creating a weekday blocking schedule was a big win. Welltory's "magic" principle (value for zero effort) points the same way. The best onboarding ends in something that happens tomorrow without the user remembering it.
- **Shame vs reward in habit loops.** Welltory argues shame and streak mechanics only work when the task can be finished inside the app in minutes (Duolingo). For behavior that happens in the physical world (sleep, health), showing failed goals drives churn. Relief, novelty, and bragging rights retain better.
- **Price tolerance is usually higher than founders assume, within a segment.** MySwimPro raised from about $100 to $180/yr with little change in conversion, and a survey found payers willing to go to $200–300. Opal ran $69 → about $99/yr at 100%+ day-8 ROAS. Counterpoint: in crowded commodity categories (weather), buyers anchor on competitors' prices. Several guests suggest tiers over a single winning price.
- **Who you acquire sets what converts.** Older users convert trials better (Marcus Burke: exclude under-25s). Press traffic has lower willingness to pay than search traffic (Weather Up). Students can't pay $99/yr (Opal). Asking age and source in onboarding and branching on the answers comes up again and again (Opal, Marcus Burke, MySwimPro).
- **Win-back is real but later.** Over 10% of churned monthly subscribers come back within 12 months (RevenueCat). Opal's trial-cancel 50%-off push worked where other day-1 re-engagement failed. A discount within 24 hours for non-converters was recommended. Several hosts say to build a full win-back program only once the churned base is large.
