# Sub Club notes: batch 07

Source: 11 Sub Club / RevenueCat transcripts, April–August 2025. They are auto-captions, so names and numbers may be wrong; "(?)" marks figures I could not confirm.

## The Growth Formula: Churn, Retention Wins, & Smart Product Bets (Dan Layfield, Subscription Index / ex-Codecademy, 2025-04-16, https://youtu.be/XfcY_SdZaH8)
- **Relevance:** high. It covers where to spend effort on the funnel, the math of churn, the first session as the moment users decide, and cancellation-flow saves.
- **Findings:**
  - Screens that 100% of new users pass through (onboarding, purchase flow) should be "polished to a mirror finish". At Codecademy, rewriting the checkout error messages took about 2 days and lifted checkout conversion by roughly 1% (conservative estimate; observed data, web edtech). Because all new revenue passes through that page, that is about a 1% lift for the whole business.
  - Fix the funnel from the bottom up. Start with the highest-intent users, for example people who tapped pay and failed, instead of the step with the biggest drop-off. Some steps always lose a lot of people. (Opinion from experience.)
  - Users decide whether to start a trial almost entirely in session 0, probably within the first ~10 minutes (his reading of benchmark reports). Once you lose them, recovery channels are weak: a very good email campaign gets about 30% opens and about 2% net click-through.
  - Rules of thumb:
    - Average lifetime in months = 1 / monthly churn. At 20% churn that is 5 months.
    - Halving churn doubles lifetime.
    - Subscriber ceiling = new subscribers per month / monthly churn. For example, 500 / 0.10 = 5,000. Below the ceiling the subscriber count drifts up on its own, which can hide flat product work.
  - Measure retention by a core action repeated on a cadence, not by payments. Improving activation and the core habit always improves churn, and fixing churn upstream beats fixing it after the user has decided to leave.
  - Retention length is capped by how long the user has the problem. Fitness, dieting, dating, language learning and meditation are short-to-medium needs, so they need a very large audience or a plan structure that locks users in. "Short life cycle + small audience" is a sure way to die.
  - Activation milestones to track: sign-up → setup (for example, granting location permission) → first aha moment → 30-day activation → long-term retention.
  - As churn falls, a growing share of it is payment failures. At about 2% monthly churn, roughly 50% may be payment-based. Spending about 2 days writing good dunning emails is worth it.
  - Cancellation flows: pause, a temporary discount (for example, 50% off for 3 months, then back to full price) or a hidden lower tier, and "talk to support". Across his implementations these cut churn by 10–20% (observed data, several companies). Pause works best when the habit is episodic, as with learning to code. Track how many users take the discount, because these tactics become widely known and get gamed.
  - Regional pricing almost always raises revenue, but you then maintain about 10 price packages forever. Do simpler tactics first. Codecademy passed $50M ARR before adding a second tier.
- **Tactics:**
  - Right after purchase, ask one open-ended question, such as "Was anything confusing?" or "Did you have questions you couldn't answer before buying?"
  - Have people with fresh eyes (friends, usertesting.com) go through onboarding regularly.
  - Check that ads, the landing page and App Store screenshots match. The gaps between teams are where the easy fixes are.
  - Ship big bets in hacky milestones and expect the win on the 3rd or 4th attempt.
- **Caveats/contradictions:**
  - The host (David Barnard, weather app) shows a modal with a 7-day non-renewing "reverse trial" when a user dismisses the App Store payment sheet. He has seen little success from it.
  - He notes that many apps now show an instant discount when the payment sheet is dismissed. It can be very effective, but Apple has reportedly been pushing back on some developers over it.
  - He also warns that hiding the price near the CTA increases taps but makes more users back out at the Apple sheet.
  - Dan says not to copy other apps' visible A/B tests, because you cannot tell from outside what actually won.
- **Quote:** "Projects in progress don't do anything for your business."

## Boost Conversion and Retention with Jobs to Be Done (Daphne Tideman, growth advisor, 2025-05-02, https://youtu.be/6aRgV8ntAnc)
- **Relevance:** high. It covers onboarding personalization, bringing the aha moment forward, early progress for activation, and objection handling.
- **Findings:**
  - Emotional drivers are much stronger than functional ones (for example, "I feel insecure" versus "I want to get fit"). Social drivers such as accountability and kudos also matter. Messaging that stays functional hits a ceiling (opinion).
  - Show, don't tell. Welltory, a health tracker, pulls the user's own data during onboarding and gives them insights right there, instead of claiming "we give insights" (example cited).
  - Ask onboarding questions so you can adapt content, social proof and language to the user's job, not only to learn about them. Examples:
    - Headspace shows different content for "sleep" versus "stress/anxiety".
    - Ladder's quiz matches the user to a specific coach. The host only saw that Ladder fit him after the quiz and after using its exercise-swap feature.
  - Activation means giving the smallest possible feeling of progress in the first session, even if the progress is mostly perceived. Examples:
    - A gratitude app doing its first practice, or a "3-day challenge", inside onboarding.
    - Language apps getting you into a tiny first lesson.
    - A fitness plan as the proof of progress.
    - LinkedIn's "profile X% complete".
    - For goals that can't be done now (taxes), getting the user to set a reminder or finish step 1.
  - Most people download apps on the go, so plan for a few spare minutes, not a full session.
  - Many users are not actively looking. Bring the "time to switch" aha moment into ads and store screenshots. Transformation ads (before/after, people like the viewer) are among the strongest formats. Her example: Tractive's discount-led ads missed the job; a review about tracking a runaway husky states the job far better.
  - Signal that your messaging is wrong: users are hard to convert and activate, but retain well once they "get it".
  - Price by job to be done. Once the app becomes a "painkiller", price sensitivity falls and price increases go through more easily.
    - The host's weather app made about $100K last year at $40/yr. He is considering a $20/yr tier on cheaper data for users whose job doesn't need premium data, partly as a retention/downgrade option.
    - Advice: don't add tiers too early.
- **Tactics:**
  - Interviews: "What were you using before?", "Why did you switch?", "What almost stopped you from signing up?" Also ask what questions friends asked when the user recommended the app; people forget their own doubts but remember their friends'.
  - Review mining: spend hours reading reviews yourself to pick up the users' language.
  - Test job-to-be-done messages with Meta ads: same visual, different copy. Judge by cost per trial, or by CTR for small budgets. Also use 5-second tests (UsabilityHub).
  - Hallway testing: she gave dog-park strangers a free year of a vet-chat app to try it and found many onboarding problems in 1–2 hours.
  - Win-back: tell churned users about new features that fix their original objection. Ladder never emailed the host about exercise swapping.
- **Caveats/contradictions:** She calls streaks "quite flawed" as a mechanism but doesn't expand. Most evidence here is anecdote and advisor opinion, not A/B data.
- **Quote:** "When I experience this, I want this so that I can…" (her framing template for a job to be done).

## The Pros and Cons of Google App Campaigns (UAC) (Ashley (?), UA specialist, 2025-05-13, https://youtu.be/bvD3Ps7vSA0)
- **Relevance:** low. It is an ads clip. UAC on Android reaches Play Store traffic that is very high intent, "like branded search", which no other channel sells. On iOS, Search and YouTube are the value. The downsides are little control or visibility over placements (display/AdMob can soak up spend), and SKAN historically missed web-to-app conversions from Search.

## Freemium Done Right: Lessons From a Multi-Billion-Dollar App (Chris Hulls, Life360, 2025-05-14, https://youtu.be/nlSS7uFb2XI)
- **Relevance:** medium. It covers freemium design (free engagement plus paid safety), the long-term cost of stacking dark patterns, and cheap validation tests.
- **Findings:**
  - Model: free daily location sharing (used about 10x a day, and parents open the app about 22 times a day (?)) keeps users engaged. Safety features are what people pay for. People say they'd pay for peace of mind, but only do so if the product keeps it top of mind. About 1 in 8 families pay. Scale is about 80M active users and about $400M revenue (?).
  - They didn't monetize until about 10M active users, a deliberate but somewhat arbitrary choice for a commodity category.
  - A written, internal "free user bill of rights":
    - Core map, location history and place alerts stay free.
    - No dark patterns.
    - Transparent notice before changes.
    - Ads must never block the job to be done (no 30-second full-screen interstitials).
  - Each small growth hack (a "Continue" CTA instead of "Subscribe", the price placed far from the CTA) looks harmless alone. Stacked, they erode brand trust in ways short A/B tests and holdouts can't detect; you would need about a 5-year holdout (opinion from both Hulls and the host).
  - Sizing tests as a percentage of users is a mistake at scale. Painted-door (fake feature) tests on about 100 users are enough to spot a big effect.
  - Some failures are one-way doors. For Life360, killing phone batteries creates permanent distrust even after a fix.
- **Tactics:** They added ads only about a year ago: native, contextual units (for example, a one-tap Uber offer when landing at an airport) and no ads for minors. Later they plan lead-gen style offers (driving data → insurance) that add value. They stopped selling raw location data because of the press and regulatory scrutiny.
- **Caveats/contradictions:** Hulls says there is no one-size-fits-all model, and a "teaser" implicit freemium is also valid. He admits he talked to users less than recommended and relies on empathy.
- **Quote:** "Nobody runs a holdout group long enough to see the cumulative effect of that." (host/Jacob, agreed by Hulls)

## What Reading.com Learned Testing Prices and Funnels (Tim Dikun, Teaching.com / Reading.com, 2025-05-28, https://youtu.be/gk2YqZuGP9g)
- **Relevance:** high. It includes concrete price, trial and web-funnel test results.
- **Findings:**
  - **Price test (RevenueCat Experiments):** They launched at $6.99/mo and tested $4.99 up to $19.99/mo. $12.49 had the best LTV lift given reach, while $14.99 was slightly higher early on. They picked $12.49 to keep the audience broad because parents recommend apps to each other. Two years of look-backs: higher prices spike LTV at first but fade; $12.49 still wins (A/B test; kids reading app for parents of 3–8 year olds).
  - **Monthly without trial vs with trial:** Annual was about 50% off monthly. Removing the monthly trial pushed more users to annual, but realized LTV fell 17% (A/B test). His reading: hesitant monthly users wouldn't try annual and wouldn't pay monthly upfront, so they were lost entirely. The host notes this goes against the now-standard "no trial on monthly" playbook, and the higher price point may matter.
  - **30-day money-back guarantee instead of a trial (web funnels only):** Conversion is much lower, but every purchase sent back to Meta is a high-intent buyer. The algorithm finds better users, who stay longer, and few ask for refunds (observed data). The host warns this only works if the product really delivers.
  - **Web funnel vs in-app:** They copied the in-app onboarding 1:1 onto the web. Trial conversion was about 50% better and paid conversion about 30% better (observed test). They credit trust from a memorable, authoritative domain; many users type reading.com directly after seeing an ad.
  - **Aha moment:** Users who read their first story book retain much better, but the first book arrives at lesson 10. They are looking for a book-like experience in lesson 1. Parents who finish even one lesson with their child "get it".
  - **Onboarding friction on purpose:** The product requires a parent to sit with the child. Onboarding slides and in-app parent content explain why. Cancellations still say "I shouldn't have to do this." It is a niche audience that pays more and stays longer.
  - **Upsell after purchase:** a $9.99 one-time purchase for all printable PDFs, which are otherwise drip-fed with a subscription. About 20% of web trial starters and buyers take it.
  - **Natural churn:** The product "works itself out of a job". Younger starters stay longer, and some pause usage for 6 months but keep paying. They plan to extend the curriculum to 3rd grade.
- **Tactics:**
  - Kids-category constraints: no third-party analytics SDKs (they built first-party analytics), limited attribution, and a "grown-up gate" before any web link, which makes app-to-web impractical.
  - All marketing is done by channel-expert contractors (Meta, Google, Apple Ads, lifecycle) who file weekly reports.
- **Caveats/contradictions:** The host's own RevenueCat app-to-web test (Dipsy) showed the opposite of Reading.com's web-funnel result. Brand and domain trust may explain the difference.

## Building Apps Faster: How AI and React Native are Changing the Game (Charlie Cheever, Expo, 2025-06-11, https://youtu.be/1AX89fxL5FU)
- **Relevance:** low. It is about dev tooling. Relevant points:
  - RevenueCat's report found React Native apps monetize better than native, which all three speakers attribute mostly to selection bias (VC-funded, newer, cross-platform apps).
  - Iteration speed matters more than language.
  - Craigslist's plain app has a 4.8 rating from about 450K reviews: users rate the outcome, not pixel polish.
  - Expo tooling points: Expo Go, config plugins/CNG, EAS builds.

## External Payment Link vs In-App Purchase: RevenueCat's $40k Experiment (David Barnard, RevenueCat / Dipsy app, 2025-06-13, https://youtu.be/R3gbKaowcq4)
- **Relevance:** medium. It is a paywall A/B test of in-app purchase (IAP) against a web checkout link.
- **Findings:**
  - Four-variant test on Dipsy (a US dating-ideas app (?)):
    - A: existing React Native paywall.
    - B: the same paywall rebuilt in RevenueCat Paywalls.
    - C: IAP buttons plus a "try for free and save 30%" button that goes to the web.
    - D: the same paywall, but the CTA goes to the web only.
  - Web-only had far fewer trial starts, but web trials converted to paid at much higher rates. Proceeds per user after fees: web-only about $1.96 versus IAP-only about $2.09 (?). That is about a 6% drop, close to a wash at a 30% Apple fee. At the 15% small-business fee, web clearly loses.
  - Given the choice (C), even with 30% off on the web, only 68 of 203 converters went to the web. In-app, 75 picked annual and 57 picked monthly. Users prefer IAP, or it is simply the path of least resistance.
  - Early renewal signal: only about 3.5% of web annual subscribers had turned off auto-renew, versus about 19% on the App Store for the same cohort. Web LTV is likely higher.
- **Tactics:** They only sent users out to the web on the paywall's main CTA. Web users could still switch to monthly or quarterly plans.
- **Caveats/contradictions:**
  - The checkout form felt heavy even with Apple Pay.
  - The copy was deliberately left unoptimized.
  - Realized LTV of $10,000 for B versus $6,800 for D (?) seems to be gross before fees.
  - Barnard's conclusion: a hybrid approach, and stay on IAP if you are in the Small Business Program.

## Turning a Side Project into a Six-Figure Subscription Business (Eric Duffett, Shot Pattern, 2025-07-10, https://youtu.be/V04KKC-s_cQ)
- **Relevance:** medium. It is an indie case study on demand that already exists, benchmarks, pricing up and cheap UGC ads.
- **Findings:**
  - His first app (meditation for golfers) failed over 5 years. Target users never felt the problem, never searched for a fix and had no intent to buy. He only learned this through interviews after building everything. The small signal that older men and coaches liked it was ignored because he was fixated on his hypothesis.
  - His second app (a golf strategy GPS) fit a behavior influencers had already taught for years: measuring the course in Google Maps. It is easier to ride a trend than create one. He shipped v1 in 3 weeks.
  - Strong early sign of product-market fit: strangers paying who never talked to him.
  - Early organic benchmarks: about 25% trial starts, about 75% trial conversion, and about 17% overall (?) (probably download to paid). These were well above the State of Subscription Apps benchmarks and gave him confidence to turn down a $75K acquisition offer.
  - He shipped features that justified doubling the price to about $75/yr, then started paid ads.
  - A quick screen recording with auto-captions (CapCut) beat paid creator videos ($750 and $1,500). Installs cost about $0.70, while revenue per download was about $3.50–4.
  - Results: 2024 revenue about $185K, of which he paid himself $100K. Now ARR is above $500K, with $500–600K in sales expected and about half of that profit.
- **Tactics:**
  - Build in public inside a niche community (golf Twitter, about 1–2.6K followers). Tease features before launch; one teaser drew 25–40K impressions and inbound offers.
  - Pay creators, then reuse their content as ads.
- **Caveats/contradictions:** He admits the benchmarks were "juiced" by where downloads came from (a warm, organic audience). The business is seasonal, with a winter trough.
- **Quote:** "It's way easier to ride a trend than to create a trend." (Jacob)

## The Past, Present, and Future of Building on Apple (John Gruber, Daring Fireball, 2025-07-23, https://youtu.be/4h2x6DMgVzU)
- **Relevance:** low. It covers the history of Apple's developer relations: the 1990s near-bankruptcy explains its grip on control and commissions, and they argue for an "App Store 3.0" reset with lower fees and free link-outs.
- The only product-psychology note: in 2008, iPhone apps succeeded by being built phone-first for quick "tap, tap, done" use, not as shrunk desktop apps.

## Optimizing Funnels, Pricing, and Retention at Zumba (Lucy Levy & Nicole Page, Zumba, 2025-08-06, https://youtu.be/-GHpDJm8MgY)
- **Relevance:** high. It covers long onboarding, a paywall before the app, trial length, removing the monthly trial, the aha moment, habit loops and app-to-web. Most of it is A/B test backed.
- **Findings:**
  - **Longer onboarding beat "get them to the paywall fast":**
    - They added questions (interest, level) and value interstitials, and recommended a program before the user entered the app. Conversion went up a lot (A/B test; fitness app for beginners and people returning to fitness).
    - Then they put a hard paywall after onboarding, before the user sees the product, and overall conversion rose again. Both results contradicted the team's assumptions.
  - **Pricing and trials:**
    - Before: $19.99/mo and $129/yr, both with trials, and conversion was poor.
    - Now: $14.99/mo with no trial, and $99/yr with a 7-day trial.
    - A 7-day trial beat the longer trials common in fitness (14 or 30 days): users felt more urgency and engaged more.
    - Annual share went from about 30% to about 60%. Annual trial-to-paid went from the 30s to about 56%. They credit a mix of pricing, app-to-web, beginner content and the first-time user experience.
    - The host notes that roughly 25% now pay $15 upfront.
  - **Guided programs instead of a content library:** goal-based programs chosen in onboarding (weight loss, getting started, fun, stress). Users in programs watch about 2x as many videos, and month-to-month retention about doubled. Fewer choices is the value over free YouTube.
  - **Aha moment = 3 classes.**
    - Onboarding asks for a weekly class goal, defaulted to 3, with copy saying 3 classes a week brings progress and others have succeeded with 3.
    - The home screen has a class counter toward 3.
    - Early messaging pushes toward class 3.
  - **Audience:** More than 70–75% of onboarding respondents say they are beginners, so they refocused content on beginner intensity and complexity.
  - **One free class:** a "Zumba 101" welcome class for everyone, no trial needed. A paywall appears whenever the user closes it, and that paywall converts well because the user has just had high-intent value.
    - Users ask for more free classes, but they keep it to one to protect the LTV-to-CAC ratio.
  - **Retention:**
    - After class: a celebration screen, badges (classes, steps), a rating (liked it? too hard/easy/intense?) that feeds recommendations, and the next class shown at the top of the home screen on return.
    - Push notifications are timed to each user's usual workout day and hour. They are testing a Friday nudge ("try a short or fun class") against a known Friday dip, and a weekly stats recap.
  - **Community:** Chat threads about classes failed; users didn't want to talk after class. Next they will try in-context community, like a live class.
  - **App-to-web:**
    - Paywall-to-web lost about 35% of initial conversion, improved to about 25% in round two.
    - Higher annual trial-to-paid on the web, better retention and no Apple fee gave a net 17% LTV lift.
    - In round two, users choose the package in-app, then land on a stripped-down web checkout that mimics Apple's sheet. It defaults to Apple Pay or Google Pay when available and redirects straight back to the app.
    - No extra discount was offered for choosing the web.
- **Tactics:**
  - Paywall CTA is "Start today", which beat alternatives and nudges users toward a first class.
  - Treat every launch as a hypothesis and re-check old features.
  - Interview churned users and one-class users. Many left for in-person classes, which is fine for Zumba's business.
  - Next idea: send only high-intent paywall placements (post-welcome-class) to the web and keep low-intent ones (settings, early screens) on IAP.
- **Caveats/contradictions:** Zumba has a 24-year brand, existing web payments infrastructure and a web team. They acknowledge that the CPA rise from web checkout is scary until you look at LTV.
- **Quote:** "Challenge all of your assumptions… we introduced friction, but it really did help us." (Nicole, paraphrased)

## Strategic Data Filtering for Better Ad Performance (Thomas Petit, independent consultant, 2025-08-21, https://youtu.be/RgSs-hZ8M6M)
- **Relevance:** medium. It is mostly about ad signals, but onboarding answers are the main input, with notes on trial length and app-to-web.
- **Findings:**
  - **App-to-web (Aug 2025):** For indies and brandless new apps it is "a full zero": low trust, hard to analyze because refunds, renewals and trials all behave differently, and not worth it at a 15% fee. Big brands with resources should test it. Plans that win on the web resemble web-to-app plans more than in-app ones. The claim "just send them to the web and save 30%" is a lie.
  - **Hybrid monetization** (credits on top of tiers, IAP upsells) is slow to spread because it is complex to design without cannibalizing plans or frustrating users. Keep iterating subscription pricing and packaging until those wins slow down.
  - **Onboarding questions are the best way to separate low-value from high-value trials.**
    - In one mental-health app, users reporting high anxiety are far more valuable.
    - Adding onboarding questions specifically to create this variance is an advanced move.
    - Common strong predictors: age (under 25 often trial-and-cancel), stated goal, consumer versus prosumer/solopreneur, and device (latest iPhones and Pixels convert well).
    - Onboarding completion time predicted value in one app (very fast finishers were trial-and-cancel) but the reverse in another (fast finishers were the best users). It is not universal.
  - **Ad platforms need signal on day 1.** Anything after 24 hours is mostly useless to them. Shortening a trial from 7 to 3 days so the platform "sees" conversions does not help. Instead, delay the trial event a few hours and fire it only for users who show early activity, for example 3 sessions or workouts within 2 hours (Voyantis showed timing matters).
- **Tactics:**
  - Compare the event counts in Meta's Events Manager (or Google's "goals") with internal analytics; discrepancies over 10% must be fixed first.
  - Send filtered "qualified trial" events as a separate event.
  - Use value-based rules (bid modifiers) rather than excluding whole segments.
  - Send engineered predicted value (he likes month-13 value) through a server call so it can change without an app release.
  - Campaigns need about 10+ optimization events per day.
  - Revisit assumptions every ~6 months.
- **Caveats/contradictions:** Exclusion is his last resort. Exaggerating value gaps can derail the ad algorithm. He is not sure whether inflating revenue helps or hurts delivery.

## Batch-level patterns
- **Personalized onboarding is winning over fast paths to the paywall.** Zumba (A/B), Daphne (Ladder, Headspace, Welltory) and Petit all treat onboarding questions as both a conversion tool and a data source. The key is to actually use the answers: recommend a program or coach, or give a real insight before the paywall.
- **Aha moments are defined as counts and pulled forward.** Zumba sets a default goal of 3 and shows a counter toward 3 classes. Reading.com wants a book-like moment in lesson 1 instead of lesson 10. Daphne pushes a tiny first-session win or a "3-day challenge". Layfield says the trial decision happens in the first ~10 minutes.
- **The "no trial on monthly" playbook is contested.** Zumba removed the monthly trial and won (higher price, 7-day annual trial). Reading.com removed it and lost 17% LTV. Test it rather than copy it.
- **Short trials and paying upfront do well.** Zumba's 7-day trial beat 14 or 30 days on trial-to-paid. Reading.com's web money-back guarantee instead of a trial improved buyer quality for Meta's algorithm. Petit says shorter trials don't help ad signal.
- **Web checkout helps LTV but costs top-of-funnel conversion.** Dipsy −6% proceeds near-term; Zumba +17% LTV after cutting the drop from 35% to 25%; Reading.com's web funnel beat in-app. Auto-renew-off rates are about 3.5% on the web versus about 19% in-app. Success depends on brand trust, a checkout that mimics Apple's sheet, Apple Pay by default and resources. Indies and Small Business Program apps should skip it.
- **Price tests favor the middle, not the top.** Reading.com picked $12.49, not $14.99–19.99, because higher prices fade over time. Zumba cut prices from $19.99/$129 to $14.99/$99. Shot Pattern doubled its price only after shipping new value.
- **Habit and retention loops:** a celebration plus the next recommended action after each session, pushes timed to each user's usual moment, and progress indicators. Community features built as separate chat areas flopped (Zumba). Contextual, social cheering helped Ladder (mentioned).
- **Honesty and trust have compounding value.** Life360's free-user bill of rights and the warning against stacked dark patterns ("Continue" CTA, hidden price) sit alongside Layfield's point that a hidden price just moves the drop-off to Apple's payment sheet.
- **Talk to users, including those who never converted or churned.** This recurs in Daphne, Duffett (5 wasted years), Zumba (churned and one-class users) and Layfield (post-purchase question, fresh-eyes walkthroughs).
- **Cancellation saves (pause, temporary discount, hidden lower tier) cut churn by 10–20%.** A cheaper tier for users with lighter needs doubles as a downgrade path (the host's $20 weather tier idea).
