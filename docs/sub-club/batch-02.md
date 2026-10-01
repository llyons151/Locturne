# Sub Club notes: batch 02

Source: auto-caption transcripts of 15 Sub Club episodes/clips (Feb 2022 to Jul 2023). Names and numbers come from auto-captions and may be wrong; uncertain ones are marked "(?)".

## Unlocking Higher Prosumer Subscription Retention (Colette Nataf, MileIQ / Lightning AI, 2022-02-16, https://youtu.be/gyKqV7FnlhY)
- **Relevance:** low. Mostly about ad targeting, company history and parental leave; some notes on pricing and retention.
- **Findings:**
  - MileIQ (mileage tracker, prosumer/solopreneurs) launched at about $60/yr when few apps charged that much. Investors pushed for a $0.99 plan to "not lose market share"; she doubts that was ever true (opinion).
  - Competitors copied MileIQ's decade-old prices without testing them. She thinks nobody in the category actually knows the right price (observation).
  - Work-driven use cases (people who drive for their job) retain for years because the need only ends when the job does. Retention is structural, not the result of tactics (observed data, 5+ years of cohorts).
  - Early App Store rules required a permanently free tier and did not allow forced trials. Being able to require a trial now is one of the biggest changes (historical).
- **Tactics:** growth team is called "Try and Buy": it owns onboarding, subscription management and pricing tests. Occasional promos tied to seasonal moments (Tax Day, Black Friday).
- **Other:** Lightning AI does Facebook interest-audience testing ("audience fatigue"); ATT had little effect on interest targeting.

## Subscription App Trends 2022 (Thomas Petit and Eric Seufert, independent consultants, 2022-03-02, https://youtu.be/m_4VUFKI_KE)
- **Relevance:** medium. Mostly ATT and measurement, but the Q&A has solid points on paywalls, price testing and early churn.
- **Findings:**
  - Petit: the first paywall changes can unlock 20-30% more output. After a few rounds of iteration the gains shrink to 2-3%, which is hard to measure. Past that point, big structural changes pay off more than tweaks: paywall as the first screen vs end of onboarding vs none, and how much you give free vs premium (practitioner observation).
  - Petit: you need about 400 (?) renewal pairs at first renewal to get significant price-test results, which means tens of thousands of users. Small apps should make radical choices and ship instead of A/B testing prices (opinion + practice).
  - Seufert: at small scale, test big differences such as subscription duration (yearly vs quarterly) before price points. At ~10k DAU test durations; at ~100k test prices within a plan; at ~1M test everything (opinion).
  - Seufert: the key metric is the first renewal of your main plan (year-2 renewal for annual, month-4 for quarterly).
  - Paywall aggressiveness should match network effects. Apps that need free users' activity (Strava, AllTrails) can't paywall hard. Apps with no network effect (many fitness apps) can run very aggressive paywalls (opinion).
  - High churn right after first payment often means too many people were pushed into paying. To fix a funnel step, look at the step before it (opinion).
  - The main driver of first payment to first renewal is getting users to complete a core activity about 3 times (3 meditations, 3 workouts, 3 shared edits) (practitioner claim). Use in-app messages if they open the app but skip the core action, and push if they stop opening it. "You're not going to convince people not to churn if they stop using the app."
  - The "Blinkist paywall" (promise to remind users before the trial ends) was widely adopted in 2021 to raise trial-to-paid.
  - Seufert: a web-first funnel (Facebook to web onboarding, capture email and intent, then send to the app) gives measurability and easier personalization than in-app onboarding.
- **Tactics:** trial-end reminder paywall; define a core activity and push for 3 completions; simplify the app so users reach the main retention action instead of getting lost among features.
- **Caveats/contradictions:** Petit hedges that paywall work does pay early on; his warning is about testing too early and too small. Apple Search Ads is good early but caps out (2-5% of spend at $2M+/mo scale).
- **Quote:** "Stop doing incremental and take big leaps."
- **Other:** content fortresses, Apple regulation, MMPs vs media mix modeling, affiliate marketing (mostly not worth it), and the idea that the creative is the targeting.

## How To Make a Living as a Solo App Developer in 2022 (David Barnard, RevenueCat, 2022-03-08, https://youtu.be/4VRfqsOr0vI)
- **Relevance:** low. A short clip taken from the trends webinar.
- **Findings:** go niche in an area where people already spend money (fishing, knitting), and know how you'll get attention before you build. Subscriptions make small niche apps viable (opinion).

## Lessons from Buying and Operating 40 Apps (Michael Ritter, Maple Media, 2022-03-16, https://youtu.be/JxaxueDCd0s)
- **Relevance:** medium. Portfolio view of trials, onboarding and paywall portability.
- **Findings:**
  - Free trials work when the value shows up over a full cycle. WeCal (calendar) uses a 7-day trial so users enter data and see a full week, including the unique "agenda" view. The same approach converts poorly in a weather app, where people use it for one storm and leave (portfolio observation).
  - Paywall screen details carry across apps: button color, language and CTA. Offer structure does not carry across (annual vs monthly, trial vs none, IAP vs subscription) and has to match the product and what users already pay for elsewhere (observed across ~37 apps).
  - An A/B test showed teal was a notably bad paywall color (test result, no number given).
  - Onboarding: get users into the app as fast as possible and teach later with tips and "what's new" screens. Evidence is a games anecdote where players skipped tutorials and then didn't understand the game. Prefers apps whose rules users already know (opinion).
  - Ratings: 4.2 is borderline, 4.5 is good, 4.8 is great (opinion).
  - Customer support is an under-rated retention lever for subscriptions (opinion).
  - Cross-promotion only works when it's native and explicit ("from the makers of…") and aimed at loyal users; generic cross-promo carousels do little.
- **Caveats/contradictions:** does little price testing. With a portfolio he prefers changes that lift every app over grinding one app's price.
- **Quote:** "We realized teal is not a good color."

## From Indie Side Project to $1M in ARR (Curtis Herbert, Slopes, 2022-03-30, https://youtu.be/QdpK3cotWR8)
- **Relevance:** high. A seasonal-use app, pricing framed around a real-world analogy, lifecycle email, and honest churn.
- **Findings:**
  - Slopes (ski tracking) made about $600 (?) in its first two years as a paid-upfront app ($4.99 to $7.99). It grew about 2-2.5x a year after moving to subscriptions in 2015 (self-reported numbers).
  - Framed the annual plan as a "season pass" because skiers already buy yearly season passes. The real-world analogy made the subscription easy to accept.
  - Launch pricing was $19.99/yr plus $8.99/mo, with the monthly deliberately priced to make annual look good (price anchoring). Many people bought monthly anyway because they only ski a few days a year. He replaced monthly with consumable day passes, called "single-use pass" to satisfy App Review, because billing skiers monthly through summer felt like a dark pattern. A competitor's reviews filled with "why am I billed in summer" complaints.
  - With auto-renew, he checked that non-returning skiers were cancelling, and was glad they were: "you're not skiing, I don't want your money" (values-driven retention stance).
  - Grandfathered original paid-upfront buyers with features kept unlocked. This limited backlash.
  - Word of mouth came from share cards (a 3D run image with stats) because skiers like to brag, plus the group nature of skiing. Almost no paid ads early (about $5k (?) on Instagram).
  - Asking for email in onboarding (2015, newsletter opt-in) built a large list. Many users welcomed it despite developer assumptions.
  - Lifecycle email via Vero, triggered by server events (first recording of the season, 10th activity, no activity after N days). Each flow has its own conversion goal, one to drive a purchase and another to drive a recording. One early email pushes users to enable "smart reminders" so the app prompts them at the resort, which builds the habit. Emails are written with a personal "from Curtis" feel.
  - First hire was marketing/growth rather than a developer, because shipping more features "never" drove word of mouth as expected (reflection).
- **Tactics:** season-pass framing; consumable passes for occasional users instead of monthly; event-triggered lifecycle emails with a conversion goal per flow; location-based reminders to form the habit; email capture in onboarding; share cards.
- **Caveats/contradictions:** growth was slow and hard to attribute ("I don't know"). The 2.0 app was, in his words, bad but still spread by word of mouth, because product-market fit is set by the need.
- **Quote:** "You're not skiing, I don't want your money."

## How To Legally Bypass Apple's 30% Fee (Ariel Michaeli, Appfigures, and David Barnard, 2022-04-08, https://youtu.be/vVDXKSG36Vw)
- **Relevance:** low. Short clip on web payments via Stripe; it is legal, but tax and compliance are messy. Ariel predicted Apple would open up to external payments within 12-18 months.

## The Rise of Consumer SaaS (Eric Stromberg, Bedrock, 2022-04-13, https://youtu.be/TUeZNeedP6c)
- **Relevance:** medium. The cohort-churn framing is useful for reading early retention correctly.
- **Findings:**
  - His ebook subscription (Oyster) had about 15% month-1 churn, compared with Netflix-scale 3-4% blended. That comparison is wrong: new cohorts always churn more. What matters is that churn per cohort declines and levels off, e.g. 15% to 10% to 7.5% to about 7% (anecdote + framework from Barry McCarthy).
  - Watch the rate of change: churn should fall over time on a cohort basis. If it doesn't, you have a problem.
  - Mature subscription businesses get a moat from low blended churn. They spend less revenue replacing users and more on product.
  - Fight subscription fatigue with better products, not tactics. Annual plans, CRM and better targeting get you "5 or 10%" of the way (opinion).
  - Deepen into the user's workflow and go from single-player to multiplayer. Example: Equilab (equestrian app) added gait tracking, then a fall-alert safety feature that notifies a chosen contact, then stable-level community.
- **Tactics:** track churn by cohort month rather than blended; add features that involve a second person (a safety contact) to raise stickiness.
- **Other:** screenshot essays, the Universe Software thesis (buying SaaS/prosumer apps next to fintech).

## Creative App Marketing Strategies (Cliff Weitzman, Speechify, 2022-04-27, https://youtu.be/8pwJkHKPhw8)
- **Relevance:** low-medium. Mostly marketing; useful on niching and founder-led creative.
- **Findings:**
  - Starting with an acute niche (people with dyslexia) let a buggy early product survive, because desperate users retried 5 times. About 15% (?) of App Store reviews say the user cried on downloading it (anecdote).
  - Expanded outward in concentric circles: dyslexia, ADHD, low vision, then everyone. Now about 25% (?) neurodivergent and 75% neurotypical.
  - Early distribution: posted in 5 Facebook groups for parents of dyslexic kids plus 5 for ADHD and Reddit, with a personal accountability bet.
  - Ads: volume beats genius, since roughly 1 in 300 creatives takes off. They ship about 120 creatives a week. Best performers are 7-14s Instagram/Facebook product demos, plus founder-character ads on YouTube. Rule: CAC below the first payment, "renewals are gravy."
- **Other:** hiring comedians for ads; YouTube driving Chrome extension installs had good attribution.

## 8 Principles for Sustainable Growth (Sean Ellis and Ethan Garr, Breakout Growth, 2022-05-25, https://youtu.be/di0XmS2-j6o)
- **Relevance:** high. Aha moment, onboarding length vs speed to value, investment steps, and the must-have survey.
- **Findings:**
  - Must-have survey: "How would you feel if you could no longer use this product?" (very / somewhat / not disappointed). About 40% "very disappointed" is the threshold for a sustainable business (a benchmark from over a decade of use). RoboKiller ran it weekly alongside feature questions.
  - Dropbox: users of a single use case scored 30-40% "very disappointed". Users of all the use cases scored about 80%. Promoting every feature to new users backfired because the complexity scared them. They onboarded on one narrow use case, then fed users the next most relevant one, one at a time (observed data).
  - It is much easier to iterate a simple product toward product-market fit than a complex one.
  - Speed to value does not mean fewest steps. Noom's onboarding is about 60 steps (?). Each step builds investment and belief. The real aha is "I truly believe I will lose the weight with this," reinforced by a live goal-date estimate that improves as you enter more data ("you'll hit your goal by September" becomes "July"). Sean went through it himself and watched his wife get excited (coaching experience + anecdote).
  - Don't copy tactics such as countdown timers without knowing why they work for you. Choose a direction, state the why, then experiment.
  - North Star metric: units of core value delivered (Uber weekly rides). Many small successes build the habit ("100 rides beat one ride to Vegas"). Keep it simple and pick one in about an hour.
  - Talk to at least one customer every day, prioritizing the "very disappointed" group. It produces better experiments.
- **Tactics:** use the PMF survey to segment must-have users; onboard into one narrow use case; show a projected outcome that improves with each answer; commit to a North Star quickly.
- **Caveats/contradictions:** directly contradicts "shortest path to value." Length works when each step builds belief. They also say to experiment rather than copy Noom.
- **Quote:** "It's really hard to iterate something that's already complex."

## Building a Community that Demands an App (Mark Kennedy and Jeff Bailey, None to Run, 2022-06-15, https://youtu.be/L7CSRQxpSGY)
- **Relevance:** high. Hard numbers on the Blinkist-style trial paywall, quick-trial buttons, annual mix, and conversion from high-intent traffic.
- **Findings:**
  - Beginner running app with community-first growth. They built an email list (~20k, now ~30k) and a Facebook group (~12.5k) from one SEO blog post ("3 flaws in Couch to 5K") before building the app.
  - Launch cohort (March 2020): about 89-90% trial-to-paid. Ongoing trial-to-paid about 80%. Install-to-trial started at 26% and is now about 20%. About 1,000 paying subs within a month, 9,000+ after about 2 years on low-hundreds of downloads a day (self-reported).
  - Of the 20% install-to-trial, about 18 points come from the onboarding paywall. A single onboarding screen comes before the paywall.
  - Blinkist-style trial paywall (explains how the trial works with a timeline and promises a reminder 2 days before the charge): +23-25% trial starts in their A/B test, matching Blinkist's ~23%. No significant drop in trial-to-paid; a net gain (A/B test).
  - Quick-trial card ("Redeem your free week" + price) on main tabs goes straight into Apple's purchase sheet for the yearly plan and skips the full paywall. About 100 subs in ~2 weeks (early, ongoing test).
  - Changed the paywall to show only yearly by default, with "see all plans" revealing monthly. Combined with the quick card, the yearly share went from 56% to 76% in ~2 weeks. Yearly LTV beats monthly even though yearly costs half as much per month.
  - Price: $35.99/yr, $5.99/mo. A higher price test did not beat it.
  - Free value lives outside the app (plan PDF, audio podcast, strength workouts). In-app, only one free workout per plan. Community share cards create FOMO, and non-users eventually join "the cool club."
  - Google Search ads send traffic to the blog post rather than the App Store, to build intent first (untested belief; David calls it smart).
  - App Store product page A/B test with new designed screenshots: +10% conversion.
- **Tactics:** trial-timeline paywall with a reminder promise; "Redeem your free week" framing; one-tap trial straight to the Apple sheet; annual-first paywall with monthly hidden behind a link; weekly community calls; quarterly challenges; meetups and an ambassador program.
- **Caveats/contradictions:** the very high trial-to-paid comes from a warm, high-intent audience, and David suggests it may mean the paywall is too lenient. The quick-trial result is only about 2 weeks old and trial-to-paid was still unknown.
- **Quote:** "It's not just a free trial… redeem your free week." (David's paraphrase of the framing)

## Top 5 Considerations for Paywall Optimization (Jake Mor, Superwall, and Daryl Stone (?), Citizen, 2022-06-29, https://youtu.be/RFS1SFuw0Nw)
- **Relevance:** high. Placement, percent of installs seeing the paywall, video, CTA color, copy, and win-back.
- **Findings:**
  - Track the percent of installs that see the paywall. It is the most neglected metric, and most apps are below 80%. Paywall-view rate moves directionally with install-to-paid (observed across Superwall clients).
  - Placement: test paywalls before and after onboarding for new users, and on app open and on locked-feature tap for existing users. The usual winner is all of them: every app open, before any locked feature, both before and after onboarding ("more shots on goal").
  - FitnessAI (Jake's app): added a product video to the paywall and moved it before onboarding. Conversion up about 80%, installs-to-paywall-view went from about 40% to 85%, and the cohort converted downstream. Explanation: motivated buyers weren't finishing a weak onboarding (test result).
  - Best videos are high-production screen recordings of the app in a phone frame with text overlays, not live-action ads. Caveat: a video test at Citizen was flat.
  - CTA: the color itself doesn't matter; what matters is that the CTA is the only colored element, with high contrast on a plain paywall.
  - Copy: say exactly what to do ("Press the purple button below to start your free trial"). Sell outcomes and emotion, not features ("feel your strongest" rather than "AI weightlifting coach"). Take phrasing from user survey answers to "why do you love X."
  - Hard-paywall argument for new apps: charging for the worst version filters for people who truly have the problem, and they give the best feedback. When you paywall half the app, the paid half has to carry all the perceived value.
  - Put self-evidently valuable features behind the paywall. Innovative features users haven't experienced don't sell from a paywall.
  - Citizen uses two paywall moments: after the story plus signup, then again after the "safety profile" questions. Then a product demo for subscribers. Onboarding is framed as a narrative. The phrase "Never be alone" came from team copy brainstorms that were then tested.
  - Win-back trick: put a cheaper plan in the same App Store subscription group so people see it on Apple's cancel screen. About 10-15% of FitnessAI subscribers are on a plan only reachable from the cancel flow (observed).
  - Intent-based pricing: discounts by country, days since install, or lack of engagement (e.g. email 50% off to non-converters).
- **Tactics:** paywall before onboarding with a screen-recording video; paywall on every app open; single-color CTA; imperative CTA copy; hidden discounted plan in the subscription group; tiered discount rules by time and region.
- **Caveats/contradictions:** Citizen deliberately keeps its free core ungated for mission reasons and has only a monthly plan, a counterexample to hard-paywall advice. Jake is a vendor with an interest in more paywall exposure.
- **Quote:** "Usually more shots on goal are always better."

## Running Effective In-App Experiments (Giancarlo Musetti, Ad Hoc Labs / Burner, 2022-07-13, https://youtu.be/n6MlBd1qeIw)
- **Relevance:** high. Soft vs hard paywall, fewer SKUs, price-test pitfalls, and friction as investment.
- **Findings:**
  - Burner (second phone number, utility): the soft paywall (7-day trial with a "maybe later" skip) raised subscription revenue. The hard paywall (skip removed, trial required) then drove "tons of growth." Top-5 grossing utility for 5+ years (sequential test results, no numbers).
  - Cutting options: offering 1 prepaid product instead of 5 "drastically outperformed control" (A/B test).
  - Initial paywall shows one package (3 numbers) with monthly and annual. Subscription tiers are 1, 3 and 10 numbers. The 10-number tier did well. Annual is about 20% off monthly, and bigger bundles are about 15-20% off per number.
  - Annual price test ($49.99 / $59.99 control / $69.99): conversion moved as expected with price, but estimated LTV came out roughly break-even. The success bar was about ±15% opt-in change. They'll judge on real renewals a year later. Jacob: marginal buyers at the lower price will likely renew worse than average (test result + caution).
  - Removing the "choose your full phone number" screen to cut friction lost on trial starts. Picking a number creates investment and sunk cost (A/B test).
  - Jacob (Elevate anecdote): adding about 25 personalization steps to onboarding cut completion but did not hurt trial start or D1 retention. It dropped likely churners earlier and showed what the product would do.
  - Onboarding tests reach significance in 1-2 weeks at their volume. They run onboarding and lower-funnel tests in parallel if they don't interfere.
  - Idea process: cross-functional brainstorm, then an engineering complexity estimate, then competitor screenshot walls in Figma. They validate a premium tier with Van Westendorp and Gabor-Granger surveys and a fake-door "coming soon" test.
- **Tactics:** hard trial-gated paywall; fewer SKUs; annual-first discount; keep investment steps that let users customize something they care about; consider "what's your use case" for CRM personalization.
- **Caveats/contradictions:** drop-off at a screen doesn't mean the screen causes it. Removing it may just move the drop-off elsewhere. Friction behaves differently in B2B.
- **Quote:** "Sometimes a little bit of onboarding friction creates a better product."

## Brand Marketing, Product-Market Fit, and App Growth (Gessica Bicego, Paired, 2022-07-27, https://youtu.be/cP4KyUY8D4E)
- **Relevance:** low-medium. Mostly brand and channel strategy, with one useful messaging insight.
- **Findings:**
  - What users love in the app is often not what brought them in. Ad messages built around favorite in-app features don't convert, so acquisition messaging and retention messaging should differ (user research observation).
  - Keep 4-5 winning creatives live at once. At Blinkist, a Bill Gates reading-list ad got a cease-and-desist, and pulling it crashed the whole channel.
  - Paired (couples app) grew about 30x (?) to about 800k MAU mostly via Facebook.
- **Other:** Outbrain/Taboola "paid content" took 9 months to work at Blinkist; about 30% of budget goes to testing new channels; data stack (Adjust, RevenueCat, Amplitude, Snowflake, Looker); the Runtastic-to-adidas rename hurt ASO and conversion.

## Tinder: From Free App to $1B in Revenue (Phil Schwarz, Corazon Capital, ex-Tinder CMO, 2022-08-10, https://youtu.be/weFP-s6oe-E)
- **Relevance:** medium. Useful framework for deciding what goes behind the paywall; the note is translated/edited text.
- **Findings:**
  - Tinder stayed free until it had liquidity and product-market fit, then launched Tinder Plus in 2015. The internal debate was per-feature payments vs subscription; subscription won.
  - Paywall framework: charge for things that "break the rules of the game." If everyone did them the ecosystem would suffer, but a few paying users is fine. Unlimited right swipes (after adding a daily cap to curb indiscriminate swiping) and Passport location change are the examples.
  - Super Like was scarce by design (1 free per day), and marketing taught both senders and receivers that it was scarce, which gave it value. Extra Super Likes were then sold as an add-on.
  - Subscriptions fit predictable consumption and fail when consumption is variable (meal kits vs cat litter).
  - Validate willingness to pay early unless there is clear precedent. Compute LTV on gross profit and watch payback. Successful apps raise LTV as CAC rises.
  - Brand doesn't save churn: people cancel if they stop using the product (opinion).
- **Tactics:** a free daily ration of a scarce action with paid top-ups; make scarcity legible to both sides.

## Achieving Mission and Profit with Freemium Apps (Erin Webster-Schaller (?) and Paul Apollo (?), Lose It!, 2023-07-12, https://youtu.be/RzfWafWZ3yY)
- **Relevance:** high. Longer onboarding raised trial take, loss aversion at the paywall, in-app messaging vs email, and the 30-day conversion window.
- **Findings:**
  - Lengthening onboarding with extra questions, whose answers weren't necessarily used, raised trial take rate by double digits. They kept adding until returns diminished. It also improved free-user retention, so it helped more than monetization (A/B tests, 2018 onward).
  - Loss aversion: let users set up a premium feature during onboarding, e.g. "Weekender" calorie cycling ("want more calories on weekends?"). After they close the paywall, show "these features you configured are Premium; continue with Basic or subscribe?" Users who opt into such features convert more.
  - This does not work for every feature. Many premium features added to onboarding lost, and setting a carb goal "lost quite badly." It only works for features with immediate resonance on day 1. Never touch onboarding without an A/B test.
  - Onboarding's real job for weight loss is mindset: most users have failed before, and the flow helps them commit.
  - Free users who haven't converted in 30 days have a single-digit chance of ever converting, and mostly only after leaving and coming back as reactivated users. About 80% of monetization effort goes to new and reactivated users.
  - Escalating discounts for long-term free users ("won't give $40? will you give $5?"). Streak sales: a deep discount at a 30-day logging streak massively improved that small cohort's efficiency (A/B test).
  - In-app messages vs email with the same offer: in-app earned about 10x the revenue, measured against the full eligible cohort.
  - Timing: interrupting the logging flow caused churn and no upgrades. Messages after completing the day's log (on a high) worked much better. Returning users get "welcome back" celebratory copy plus new-user sales.
  - A persistent countdown timer bar for the sale stays visible after users dismiss the pop-up.
  - Discount messaging beats feature messaging for their price-sensitive audience.
  - Paid acquisition push in 2019: ROAS as low as about 10% of predicted LTV (?) at day 10. Abandoned. They stay organic/ASO-led and price at about half of MyFitnessPal (?).
  - Locking all macro features as a test made little money and made users angry. They rarely move free features behind the paywall.
  - Word of mouth: automated emails at weight-loss milestones (from 5 lb) ask for a success story. People share after they succeed, not while they're trying.
  - Referral program ($10 gift card when a referee goes premium) broke roughly even, didn't scale, and exposed users had lower LTV. Killed after about a year.
- **Tactics:** long investment-style onboarding; let users configure a premium feature, then use loss-aversion copy at the downgrade choice; a 30-day window focus; reactivation offers; milestone-triggered story requests; in-app messages after task completion; persistent sale timer; an in-app inbox (early).
- **Caveats/contradictions:** strong free product by design (mission), so conversion levers are discount-heavy. The 10% ROAS was predicted from a 10-day curve.
- **Quote:** "If you're going to employ this strategy it's not a silver bullet."

## Batch-level patterns
- **Friction that builds investment beats shortest-path onboarding.** Noom's ~60 steps, Lose It's lengthened onboarding (double-digit trial lift), Burner's number-picker screen (removing it lost), and Elevate's +25 steps (no metric harm) all point the same way. The caveat everywhere: the steps have to build belief or customization, and every change needs an A/B test.
- **Show the paywall to more people, earlier.** Superwall found most apps show it to under 80% of installs. FitnessAI's paywall before onboarding (+80% conversion), Burner's soft-to-hard move, and None to Run getting 18 of its 20 points of trial starts on the onboarding paywall all support earlier exposure. Citizen and Lose It are the mission-driven counterexamples with a strong free tier.
- **Trial-transparency paywalls work.** The Blinkist-style timeline plus reminder gave +23-25% trial starts with no trial-to-paid penalty (None to Run, matching Blinkist). Petit calls it the step that improved trial-to-paid.
- **Fewer choices, annual first.** Burner's 5-to-1 SKU cut won. None to Run's annual-default paywall moved the annual mix from 56% to 76%. "Redeem your free week" with a one-tap Apple sheet removes a screen.
- **Price tests are hard at small scale.** Petit says you need about 400 renewal pairs, Burner's test came out break-even pending renewals, and Seufert recommends testing duration before price. Consensus: make bold choices, test big differences, and judge on renewals.
- **Loss aversion and sunk cost as levers.** Configuring a premium feature before the paywall (Lose It), choosing your own number (Burner), and a goal date that improves as you answer (Noom).
- **Retention follows the core habit.** Push for about 3 completions of the core action (Petit), location reminders to form the habit (Slopes), messages timed after task completion (Lose It). All agree you can't stop churn once usage stops.
- **Win-back and discounting by segment.** A hidden cheaper plan in the subscription group reaches 10-15% of FitnessAI subscribers. Lose It uses escalating discounts after 30 days and streak sales. Intent-based pricing by country and time since install.
- **Honest monetization pays long-term.** Slopes dropped monthly billing for seasonal users and grandfathered early buyers. Trial reminders didn't hurt conversion. Several guests warn that dark patterns lift short-term but add churn.
- **High-intent, warm traffic makes the numbers.** None to Run gets about 80% trial-to-paid from blog and community users. Lose It is organic-first after paid failed. Early new cohorts churn much more, so judge churn by cohort trend (Stromberg).
