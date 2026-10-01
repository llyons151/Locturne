# Sub Club notes: batch 06

Source: 22 Sub Club transcripts, Dec 2024 to Apr 2025. The transcripts are auto-captions, and a few were machine-translated back into English. Names and numbers may be garbled. Anything marked "(?)" is uncertain. Most of the short March 2025 episodes are State of Subscription Apps (SOSA) 2025 "minisodes".

## Why Most Apps Hit a Revenue Ceiling (Patrick Falzon(?), The App Shop / ex-Mosaic Group, 2024-12-11, https://youtu.be/hQ3Sbnrr3FM)
- **Relevance:** low to medium. The transcript is badly garbled by translation. It is mostly about portfolio strategy, exits and LTV skepticism, with a few retention and pricing points.
- **Findings:**
  - Most single apps hit a revenue ceiling. Keyword rank tops out and the pool of people who will ever pay is finite, so portfolios grow by adding products. This is opinion.
  - LTV is a poor steering metric: there are too many assumptions and forecasts that rest on sand. He manages on payback period plus LTV:CAC instead. Early-stage companies can't wait 12 months for payback. Later-stage companies can accept longer payback. Opinion based on operator experience.
  - Around 50% annual subscriber retention is "not bad" for mobile. Retention improves in years 2 to 5 for surviving cohorts. Observed at Mosaic.
  - With price tests, results often look different a year later when cohorts renew. Trial-period behavior is the earliest usable proxy for future retention. His advice is to be conservative when rolling out a winner. Anecdote.
  - RoboKiller (spam-call blocker): users pay *not* to interact with the app, because the value happens in the background. The team had to surface that invisible value (e.g. reports and notifications showing what was blocked) so users could see it. Anecdote. This is directly relevant to any "works while you sleep" product.
  - Paid acquisition gives diminishing returns on organic uplift.
- **Tactics:** survey users, interview them, and feed app reviews into an LLM to learn why people actually pay. Diversify ad creative across designers rather than letting one designer's style dominate. Scale one channel at a time so you can read its effect.
- **Caveats/contradictions:** the transcript is too garbled to get reliable numbers. The "big fish in a small pond" framing conflicts with the venture-scale advice given in other episodes.

## Using Subscription App Benchmarks to Make Better Growth Decisions (Phil Carter, Elemental Growth, 2024-12-23, https://youtu.be/7QA-UtGCGJY)
- **Relevance:** medium. It is a framework for diagnosing where a funnel is weak and includes several case examples about pricing and the annual vs monthly mix.
- **Findings:**
  - The subscription value loop calculator runs on RevenueCat data: about 30,000 apps, 290M subscribers and about $7B in revenue. Acquisition-cost metrics come from a survey of about 600 respondents. Benchmark source.
  - Targets: LTV:CAC of 3x is the "gold standard" for consumer apps. Payback should ideally be under 3 months, or even within month 1. Opinion.
  - Case (edtech): retention beat the p75, but subscriber conversion was low, price was above category and ad efficiency was poor. The fix was onboarding optimization, paywall optimization and a subscriber survey. Anecdote with no numbers.
  - Case (fitness): too much value was free, so both price and conversion were low. A survey showed free users felt no need to pay. Anecdote.
  - Case: annual retention beat peers but monthly retention lagged, and the annual price was above peers. The fix was a more generous annual discount plus paywall nudges toward annual. Anecdote.
  - No app is p95 on every metric. Winners are "good enough" everywhere and outstanding on one or two metrics. Tinder, for example, is weak on retention but excellent at converting and tiering in months 1 to 6. Opinion.
  - Early adopters outperform later users on every metric, so early LTV:CAC figures will degrade as you scale.
- **Tactics:** use a 12-month average of your metrics and compare against category and tier (p50 for indie developers, p75 or p95 for funded teams). Track account registration rate as a proxy for activation, because it is needed for win-back. Push users into annual plans when annual retention is your strength.
- **Caveats/contradictions:** the hosts warn against obsessing over single benchmarks. One example: two years spent moving trial start rate from 10% to 12% when other levers mattered more. Hard paywalls inflate trial start rate, so the model has to be read in context.
- **Quote:** "Just build a really good product" appears at both ends of the midwit meme.

## Making Web2App Work (Nathan Hudson, Perceptycs, 2025-01-08, https://youtu.be/f8E5GoWbTKo)
- **Relevance:** high. It gives the most concrete onboarding and quiz craft advice in the batch: interludes, social proof matched to objections, and what personalization should target.
- **Findings:**
  - A good onboarding answers the user's questions rather than asking yours. You can answer a question *with* a question. Calm's "are you here to sleep, focus…?" tells users what the app does. Opinion from many client funnels.
  - "Interludes" are screens between questions. They carry one of three kinds of content:
    - evidence (charts, social proof, testimonials);
    - reassurance for known anxieties (Headway's "how often do you worry?" followed by "many people do");
    - functionality, so users finish onboarding knowing how the product works.
    Time-to-result charts ("abs by summer") belong here.
  - Social proof should target the specific objection the user holds: does it work, is it safe, who validated it. "Join 20M users" does little for a small app. "People like you who had X" plus a matching testimonial works better. Opinion.
  - Personalize on *context*, not just on echoing answers. His counterexample was a sleep app that asks your bedtime and then only personalizes the reminder time, which he calls functional but emotionally flat. The better example asks your job and then speaks to that role's specific problem. He warns that returns diminish quickly with more personalization. Opinion.
  - "A good onboarding tells a story. A great one echoes the user's story back to them."
  - Web conversion is usually no worse than app conversion and often better, especially for higher-priced products. Observed across clients.
  - A funnel that already works in the app, copied to the web, almost always works. Utility apps with hard paywalls should use a simple landing page and checkout rather than invent quiz questions.
  - For small apps, the web's biggest win is cash flow: Stripe pays out almost the same day, versus roughly 60 days on the app stores. That keeps the iteration loop fast.
  - One client sold a roughly £200/yr (?) subscription on a sensitive topic through a webinar/VSL funnel because users weren't emotionally ready to buy immediately. YouTube clips of the webinar drove people to the full video.
  - One developer switched from a free web trial to a $1 first-month intro to screen out fake cards. Anecdote.
- **Tactics:** send more funnel events to Meta from the web (signup, trial, purchase) and use the Conversions API. Web allows money-back guarantees instead of trials, one-click upsells and bundles. Give influencers dedicated landing pages with UTM parameters. Don't take spend from an in-app campaign that is barely clearing learning thresholds just to fund a web test.
- **Caveats/contradictions:** dark patterns on the web inflate LTV. Examples: no reminder during the trial, or "continue" buttons that silently add items to the cart. Refunds, fraud, chargebacks and sales tax become your job.
- **Quote:** "A good web onboarding journey tells a story. A great web onboarding journey echoes their story back to them."

## Bootstrapping a Subscription App to 5M MAU (Bruno Virlet, Genius Scan, 2025-01-22, https://youtu.be/vGQUPvDHB_4)
- **Relevance:** high. It includes real accidental A/B tests on paywall entry points and plan structure.
- **Findings:**
  - They removed the cheaper tier: Plus at about $0.99/mo and Ultra at about $3/mo. Daily purchases stayed at about 100/day, but all of them became Ultra. This shows demand was inelastic and the low tier was cannibalizing Ultra. Observed data.
  - They hid the monthly plan behind a secondary tap. Nearly everyone now buys annual. Observed data.
  - Moving the OCR button into a drawer during a UI refresh cut paywall views by about 10-20% (?). It was a high-intent entry point, so the revenue hit was larger. Nobody noticed for months. Observed data.
  - A remote promo banner failed (a database integer overflowed) and the hardcoded fallback banner showed instead, which roughly **doubled purchases**. A follow-up A/B test confirmed that the fallback's different copy and icon was the winner. Accidental A/B test.
  - Rules of thumb that "almost always" hold: fewer steps is better, and showing the paywall more often is better. Beyond that, test, because intuition fails.
  - Moving to subscriptions: they started with a cloud-storage subscription, since users understood recurring cost for storage. Later they folded premium features into it. Legacy one-time buyers were grandfathered. No backlash. Anecdote.
  - They deliberately avoid a paywall in onboarding and dismiss buttons that fade in slowly. They also removed ads (casino ads performed best), trading short-term revenue for word of mouth. Opinion and brand choice.
- **Tactics:** a daily founder email of about 5-10 key metrics such as paywall views. Charts show daily values plus 30-day and 90-day moving averages; 30-day below 90-day is a warning. Add a "How did you hear about us?" survey with 3 big buttons and a free-text field. Founders answer support email themselves.
- **Caveats/contradictions:** Jacob says they could "triple revenue" with an onboarding paywall. Bruno declines because it doesn't fit the brand, which contradicts the batch's dominant "paywall in onboarding" advice. It is bootstrapped and not maximizing revenue.
- **Quote:** "Showing paywalls more often is almost always better."

## Should You Ditch Freemium for a Free Trial Model? (unnamed guest, sports video platform, 2025-01-31, https://youtu.be/z-DvsM5-VVU)
- **Relevance:** medium. It is a short clip about moving from freemium to a free trial.
- **Findings:**
  - Freemium is "the most complicated monetization strategy" for D2C. They couldn't reconstruct the original thesis behind their freemium tier, so they switched to a free trial for simplicity. The guest claims that switching from freemium to a trial "you're just going to make more money", at the cost of burned users and bad reviews. Opinion and anecdote.
  - The core free interaction between students/athletes and their instructors stays unpaywalled as a non-negotiable value.
  - Host: older apps carry "business strategy debt" such as high-value features left free. Consumers now accept higher prices.
- **Tactics:** periodically re-audit why each monetization decision exists, list the 4-5 assumptions you operate on, and rebuild from the simplest model.
- **Caveats/contradictions:** this contradicts Deezer, Weather Channel and Flo in the same batch, who defend generous free tiers.

## Level Up Your App Marketing (Shireen(?), Deezer, 2025-02-06, https://youtu.be/G_NFsGVtejU)
- **Relevance:** low to medium. It is mostly brand vs performance marketing, but it has two useful lessons on freemium and on overriding test results.
- **Findings:**
  - Deezer once degraded its free tier heavily to force upgrades. It backfired: free users concluded the product was bad and left for competitors. They reworked free to be ad-profitable and treat it as a conversion tool. Anecdote.
  - A homepage A/B test had no winner over control. They shipped the branded variant anyway on gut feeling, and it showed positive results weeks later. Anecdote.
  - A logo change was validated by asking users to draw the old logo from memory, and the purple heart won across all segments.
  - LTV:CAC more than doubled in 2 years through heavy test volume. Observed.
  - Other topics: marketing measurement (MMM plus incrementality tests and geo-lift) and the argument that performance marketing hits a ceiling without brand.
- **Caveats/contradictions:** this is a music-streaming scale company, so most of it doesn't transfer to a small app.

## The Right (and Wrong) Way to Grow with Google App Campaigns (Ashley Black, Candid Consulting, 2025-02-19, https://youtu.be/0ZrKNzakTLk)
- **Relevance:** low. It is almost entirely about ad operations.
- Other topics: Google App Campaigns (UAC) budgets of about $200-300/day on Android US and $500+/day on iOS. Change bids and budgets by at most 20%, every 2-3 days. Use one campaign per region with about 5 themed ad groups. Plain stock images work as image assets. Low CPMs often signal junk inventory. For subscription apps, optimize for trial start rather than purchase, because the 7-day delay is too long. Target-ROAS bidding works about 50/50 for subscription apps. YouTube started showing the ATT prompt in July 2024.

## Optimizing Trial-to-Paid Conversions (Rachel Chukura, The Weather Company, 2025-03-03, https://youtu.be/CUUPVF6LK5Q)
- **Relevance:** medium. It covers a freemium plus trial hybrid, segment-targeted paywalls, and test duration.
- **Findings:**
  - A generous ad-supported free tier plus a premium tier aimed at one persona: "weather enthusiast" power users who want more radar and hourly data. Paywall moments sit inside core features users already love, such as radar. Anecdote.
  - They use AI propensity models to predict who is likely to subscribe. Models must be retuned because economics and competition drift.
  - Tests can reach statistical significance within 24 hours at their scale, but they run longer because purchase behavior depends on external conditions (the weather itself). Observed.
- **Tactics:** they test trial length and button details. Research combines interviews, surveys and product analytics, and checks what users say against what they actually do.
- **Caveats/contradictions:** she explicitly argues against pushing subscriber counts over user experience. There are no hard numbers.

## Maximize Revenue with Regional Pricing (Dmitry Gurski, Flo Health, 2025-03-04, https://youtu.be/EenRStcmZvw)
- **Relevance:** medium to high on pricing method. It is less relevant for a US-first launch.
- **Findings:**
  - Judge price tests on ARPU, not conversion. A price half as high can produce 3x retention and higher total ARPU. Observed across many tests.
  - Don't use the Big Mac index or Netflix/Spotify prices. App buyers in countries like Brazil skew wealthier and toward iOS. In rich countries, Android's optimal price is only about 15-20% lower than iOS.
  - Brazil: a large price cut raised conversion and retention. It also made paid acquisition profitable, because the conversion rate became high enough to feed ad algorithms on cheap inventory. Revenue grew by "hundreds of percent" year over year, and Brazil became their #3-4 market. Test data.
  - Growth outside English-speaking markets was about 80% vs about 35% inside them. English-speaking markets are about 70% of revenue. He thinks willingness to pay follows where Spotify and Netflix have normalized subscriptions.
  - Scale: about 300k installs/day, about 70M MAU, about 6M paying subscribers. They give Flo away free in 50+ countries (about 20M free subscriptions) as charity.
- **Tactics:** brute-force many price cells per region and pick the winner by ARPU.
- **Caveats/contradictions:** this only works at huge volume, and small apps can't test regionally this way.

## Turning Gamification Into a Retention Powerhouse (Anton Derlyatka, Sweatcoin, 2025-03-05, https://youtu.be/dITpBPf66NM)
- **Relevance:** high on habit and psychology for a behavior-change app. It is medium on monetization, since they only recently added subscriptions.
- **Findings:**
  - About 70% of people lack intrinsic motivation to exercise. Guilt-based fitness messaging ("lazy bum, go run") doesn't reach them, so Sweatcoin reframed the message as "you walk anyway, earn something." Opinion from the founder.
  - Reframing steps as a growing *balance* rather than a daily count that resets to zero creates lock-in and a feeling of being "rich." Observed and qualitative.
  - Endowment effect: users would buy others' coins for about 1-5¢ but would only sell their own for about 50¢-$1. User survey.
  - Rewarded video capped at 1-3 views/day *improved* retention and engagement. Allowing more views reduced retention. About 20% of users engage with it and the rest ignore it. Test data.
  - Referral bootstrap: the first screen offered two ways to earn, walk or invite a friend for 5 coins. Unlocking a hidden marketplace after 30 invites turned micro-influencers into a growth channel. Paid acquisition is still only about 10%.
  - Two user types: "come for rewards" (less sticky) and "come for health". Some reward seekers convert into health seekers.
  - With NHS funding, diabetes-prevention program completion rose from about 25% to 89%. Activity rose by about 20% on the free app and about 45% with NHS-funded prizes.
  - Gamification only works when layered on something genuinely good for the user. "People agree to be slightly manipulated" when the underlying goal is theirs.
- **Tactics:** cap daily earnings so the economy is sustainable, and let premium lift the caps and remove ads. Rotate a small daily curated reward set (4 per day) instead of a huge catalog. Seed a "groundswell" with friendly creators making channel-native content, then amplify winners with paid.
- **Caveats/contradictions:** Anton thinks they added subscriptions 12-18 months too late. Virality is described as uncontrollable spikes, like a nuclear reaction.
- **Quote:** "Gamification can be super successful if applied properly to the right underlying experience."

## Reactivation Campaigns for Maximum Impact (Jackson Shuttleworth, Duolingo, 2025-03-06, https://youtu.be/mplRJHyNn60)
- **Relevance:** high. It covers notification timing, the first days of lapse, and social win-back for a daily-habit app.
- **Findings:**
  - Even 1-2 days away makes coming back significantly harder. The easiest retention is never letting the streak break. Observed across many experiments.
  - Duolingo sends one reminder per missed day for 7 days, then stops its practice reminders. Efficacy has already dropped sharply by day 7. If users don't return by day 3-4, "it's tough sledding." Observed.
  - **Letting users choose a reminder time loses.** Scheduling the next day's reminder 23.5 hours after the user's first practice of the day consistently beat user-set times and other strategies. Many experiments.
  - Friend-initiated nudges ("get your friend back") are among the best resurrection campaigns. Even nudges from leaderboard strangers beat Duolingo-branded messages. About 55-60% of users have an in-app friend. Observed.
  - Weekly progress-report emails comparing this week to last week work, especially since email has room for more content than a push. Copy tone (hopeful, challenge, passive-aggressive) is tested constantly. The practice-reminder copy has been under test for 6 years, with an ML bandit picking the variant for each user.
  - Year in Review delivers a delightful payoff even to users who were active for only a few days. Seasonal moments (back to school, New Year) drive returns.
- **Tactics:** show users their own activity data and let copy frame it as motivating. After a friend win-back, move the user into a shared feature such as Friend Streaks.
- **Caveats/contradictions:** the tactics are for daily-use apps. Less frequent apps (golf, weekly fitness) need different time scales.
- **Quote:** "As soon as you set a time, the likelihood that you're going to be free at that time for perpetuity is just zero."

## Increasing Monetization with Targeted Upsells (Brandon (surname unclear), onX Maps, 2025-03-07, https://youtu.be/kaA-7OQz07c)
- **Relevance:** medium to high. It covers upsell context, tier design, and simply telling users they're on free.
- **Findings:**
  - A big learning: many users didn't realize they were on the free plan. Making that obvious and showing what's behind the paywall was the first lever. Observed.
  - Tiers work when they map to a problem the user already understands. onX Hunt tiers by geography (1 state, 2 states, Elite with all 50 states plus Canada and Mexico at about $100/yr) rather than by a feature basket users can't parse. Opinion backed by their results.
  - Don't add a second tier until there's a clear user need, because it adds complexity. Duration variants of a single tier are easier.
  - Elite adds brand partner discounts (e.g. First Lite apparel) that can pay back the price in one purchase and drive cross-promotion.
  - The most effective upsells are native to the flow and targeted by cohort ("who") and context ("when": just used feature X, how long they've been a user). The paywall should continue the context, like AllTrails showing a 3D video after a free user taps 3D.
  - Choose trial vs freemium based on total addressable market. The niche Hunt app runs a trial strategy; Duolingo-sized markets can afford millions of free users.
- **Tactics:** experiment by moving features in and out of the free tier. Raise the paywall view rate. Set guardrail metrics: uninstalls, repeat use, support tickets and reviews.

## Re-engaging Churned Users (Caroline Walthall, Quizlet, 2025-03-08, https://youtu.be/kPcedpX1LOw)
- **Relevance:** medium to high. It covers win-back, cancellation surveys and plan flexibility.
- **Findings:**
  - Churn has three buckets: natural end of need (e.g. students graduating), involuntary billing failure, and not seeing enough value. About a third of Quizlet's "no longer needed" churners just finished one exam, and they are still worth targeting. Survey data.
  - A cancellation survey is best practice. Start with interviews and free text to find categories rather than inventing them.
  - Win-back works best with personalized value: new content relevant to what they used, "you asked, we built," and hyperlocal social proof such as other students in their course. FOMO is part of the appeal.
  - Discount win-backs should be tiered by tenure, bigger for long-tenured subscribers, and never blanket, or users learn to cancel in order to get 50% off.
  - Flexibility builds trust: they added a monthly plan after mid-year starters balked at annual. They also offer a pause option and short 3-6 month exam-prep packages, shown only to relevant cancelers.
  - Re-trials are given selectively, only if about a year has passed and the user shows signs of real return.
- **Caveats/contradictions:** there are no hard numbers.

## How to Use Segmentation to Maximize LTV (Greg Stewart, Ladder, 2025-03-09, https://youtu.be/H70Kcp83Oxs)
- **Relevance:** high. It covers the trial setup, the activation metric, and offers segmented by activation.
- **Findings:**
  - A 7-day free trial with **no credit card up front**, which is deliberately unusual. The product does the selling: get users through 1-2 workouts and the likelihood to pay is "very high." Observed data.
  - The activation north star is 3 workouts per week. Hitting it in week 1 makes week 2 "exponentially" more likely and predicts month-1 retention. Conversion is predictable from trial workouts. Observed.
  - Offers are segmented by workouts completed in the trial:
    - users with zero workouts see only monthly, because they lack context for a premium price;
    - users with 1-2+ workouts get the annual plan pitched just before and just after the trial ends (discount plus extra features plus a commitment framing);
    - if annual isn't taken, they get a discounted first-month intro offer.
    Observed practice.
  - A $5 first month (full price $29.99/mo) retained about **half** of takers into month 2 at full price, consistently. Test data.
  - Annual subscribers now outnumber monthly, after price testing plus paywall anchoring to annual.
  - Effort split: about 90% on product activation levers and about 10% on deals.
  - A social "cheers" feature (double-tap to cheer someone mid-workout) correlated with workout completion and retention. They now engineer more outbound cheers so new triallers receive them. Observed correlation.
  - Payback period is used instead of LTV for decisions. LTV is too slow and macro.
- **Tactics:** a web quiz captures persona (modality, equipment, location) and routes to team/coach creative. Six-week "strength series" program starts serve as urgency moments for discounts ("tomorrow is day one").
- **Quote:** "We use the product to convince, not getting them to pay and then hoping that something happens after the fact."

## How to Succeed on iOS vs. Android (Matt Rouif, Photoroom, 2025-03-10, https://youtu.be/glwYYVsCNPM)
- **Relevance:** low to medium. The lesson is platform sequencing.
- **Findings:**
  - Launch on iOS first and add Android about 1.5-2 years later, once product-market fit shows (influencer comments asking "when Android?"). He would do it the same way again.
  - At GoPro, iOS users were worth about 10x Android users in aggregate. For photo apps, the ratio was about 30x. Photoroom closes the gap because business users pay regardless of platform. Observed.
  - Apple takes 30% in year 1 vs Google's 15% on all subscriptions, so Android margins are higher. Use native Android idioms (e.g. the share icon).
- **Caveats/contradictions:** this is platform strategy, not onboarding.

## How to Unlock Revenue Growth on Google Play (Tammy Toh, Google Play, 2025-03-11, https://youtu.be/DHD3SnHR2oM)
- **Relevance:** medium. It covers hybrid monetization and offer sequencing.
- **Findings:**
  - Optimize subscriptions first, then add consumables. In Eastern markets (Asia, Africa, Middle East), almost half of buyers purchase consumable IAPs rather than subscriptions, repeatedly. Play data.
  - "Hybrid buyers" (subscription plus consumables) are about 7% of buyers but bring in about 25% of revenue. They spend about 3x a subscription-only buyer. Play data.
  - Emerging-market prices average about 40% below developed markets.
  - Too many offers cause decision paralysis. Show the offer most likely to fit the user's signals at the right point in their journey, while keeping prices consistent for everyone.
  - Play supports installment annual plans: annual price, billed monthly with a commitment.
  - Play's resubscriber data suggests less "subscription fatigue" than headlines claim.
- **Caveats/contradictions:** consumables cannibalize subscriptions and lower ARPPU. The trade-off is a higher share of users who pay.

## How to Maximize Web Subscriptions (Lucas Lovell, Paddle, 2025-03-12, https://youtu.be/4cg-cFP3zJs)
- **Relevance:** medium. It covers web retention tooling and win-back.
- **Findings:**
  - The two numbers that matter on the web are funnel conversion and first renewal. Teams over-focus on the first. Opinion.
  - Web funnels work best for highly personalized categories: health, fitness, wellness and language learning. Productivity and media lag.
  - Web allows cancellation flows with reasons, downgrade and pause flows instead of cancel, and money-back guarantees instead of trials. These can be *better* UX than the App Store. Hard-to-cancel dark patterns hurt long-term business, and the FTC click-to-cancel rule applies.
  - Discounted web win-backs work. An email collected in the app can legally be used to push users to web pricing minutes after they skip the in-app paywall.
- **Caveats/contradictions:** the guest works for a payments vendor, so this is a vendor perspective.

## How to Optimize User Acquisition Across Major Ad Channels (Shane Ly, AppsFlyer, 2025-03-13, https://youtu.be/j2Drz5BRTbo)
- **Relevance:** low.
- Other topics: ad measurement changes. TikTok, Snap and Meta are now "advanced SRNs," a step up from self-reporting networks. Apple Search Ads added view-through attribution. YouTube now shows the ATT prompt. ATT opt-in varies from under 10% to 50-60% by app. Reddit is an emerging install channel. Build a data pipeline for trial-to-paid by channel so that channels whose triallers churn become visible.

## Building More Successful Paywalls (Sylvain Gauchet, Babbel / Growth Gems, 2025-03-14, https://youtu.be/zza9ZIB8jyk)
- **Relevance:** high. It is a curated list of paywall tactics with one hard number.
- **Findings:**
  - The screens before the paywall matter as much as the paywall itself. Tell a story from the hook onward so the paywall is the natural "ask." He cites Daryl Stone (ex-Calm). Rise Sleep and 222 are named as strong examples. Opinion.
  - **Multi-screen paywall at Mimo: +60% trial opt-in rate** vs a single screen. It breaks features, how the trial works, social proof and basic vs Pro into steps. Test result cited from Mimo. On long single paywalls, plans often end up below the fold.
  - Loss aversion and sunk cost: show a generic paywall, then let users set up premium features in the rest of onboarding, then show a feature paywall ("these are part of Premium"). If they decline, show what they'll lose. Tactic, no number.
  - Analyze onboarding and post-onboarding paywalls separately; users behave differently (Thomas Petit). Most conversions (about 80%) happen on the first-day paywall, so early-stage apps shouldn't over-invest in later paywalls.
  - Layered paywall: a feature-specific paywall first, then an "everything in Premium" paywall on dismiss, then a one-time IAP for just that feature.
  - Aggressive tactics (trial toggles, wheel-of-fortune discounts, backup offers) work, but stacking them feels scammy and raises churn. Implementation matters: Calm's daily gift uses a finger-circling meditation bowl instead of a wheel, which fits the brand. Endel's apple-tree discount game felt disconnected.
- **Tactics:** break a long paywall into 3-4 pages and A/B test it. Role-play the onboarding as a conversation with a shop clerk to spot pushy moments.
- **Quote:** the paywall is "really the ask of the sale; if you don't frame anything before, you're missing out."

## The 2025 State of Subscription Apps Report (David Barnard and Jacob Eiting, RevenueCat, 2025-03-17, https://youtu.be/NWT7wIxDkLY)
- **Relevance:** high. It gives industry-wide data on trial timing, early cancellation and price vs retention.
- **Findings:**
  - **Over 80% of trial starts happen on the first day** of app use. Not showing a paywall in onboarding is an "own goal." RevenueCat data.
  - Annual-plan auto-renew turn-offs peak in **month 1**, right after the first charge, not before renewal. It is the single biggest month, around 27% (?) of cancellations (the hosts also say "over 40%" at one point, which is inconsistent). The final month is the second spike. RevenueCat data.
  - Lower-priced apps retain much better after year 1 (report p.71). Barnard's own weather app priced at $40/yr sits at about 40% retention, and he suspects a lower price would have helped. Correlation, not causation. Ladder at $30/mo retains well because it delivers high value.
  - On the Google Play churn survey, the top reasons are cost and not enough usage (effectively one value problem). Fewer than 10% say they left for a competitor.
  - Year-1 retention is trending down year over year, in the 30-40% range. The more aggressive the early-funnel monetization, the more churn shows up later.
  - AI apps convert at about the same rate as other apps but monetize more per user.
  - About 5% of apps make roughly $9k (?)/month one year after launch. The transcript is garbled here.
  - Active renewal: 40-60% of monthly renewers actually used the app that month. Weekly-plan renewers used it far less.
  - Consumables alongside subscriptions are growing (e.g. AI credits). One app was slammed in reviews for a pricey subscription that included too few credits.
- **Caveats/contradictions:** the hosts stress not changing strategy based on one benchmark. Cohort mix (press vs paid traffic) makes price tests hard for small apps.

## Welcome to Sub Club Podcast (David Barnard, 2025-03-20, https://youtu.be/gWBRt5pNgLI)
- **Relevance:** none. It is a 1-minute trailer with no content.

## Fueling Growth with AI and Viral Product Features (Ajay Mehta, Portola / Tolan, 2025-04-02, https://youtu.be/p4C6i3xJKV0)
- **Relevance:** high. It covers a character/mascot-led app, a voice personality-quiz onboarding, and forced early monetization.
- **Findings:**
  - Onboarding is a voice-AI "personality quiz" led by an animated oracle character. It asks fun, oddly specific questions ("what part of TikTok do you get stuck on?") in the style of an enneagram or astrology reading rather than functional ones. It then reflects back what it learned, assigns a matched character, and carries the answers into the first chats as "memories." Observed as a big "wow" moment. The host's kids laughed at the personalized reactions.
  - The activation moment is the user's first *long* conversation. A small fraction of users stuck indefinitely, and the work was getting more people over that threshold. D5/D7/D15 retention rose as they improved conversation quality, onboarding and a "planet" space for shared investment. Observed.
  - They soft-launched free, then added a paywall 2-3 weeks later because users talking 30-40 min/day made token costs soar. Being forced to monetize early helped: renewals became a clearer product signal than free-user drop-off. Growth has been close to self-funding. Anecdote.
  - Growth runs on TikTok through a stable of small creators paid per post or on retainer, posting to their own accounts, plus some large-creator paid placements. About 1 in 20 videos takes off. Winning angles were everyday-life companion moments: studying at 3 a.m., cooking, getting ready, dating advice. User-generated content followed.
  - Results: about $1M ARR at about 500k downloads, then multiples of that ARR and 800k+ downloads after going viral. #1 in their category. The audience is about 80-90% women aged 15-25.
  - A non-human, cute character (deliberately not anime or humanoid) keeps it non-romantic and shareable. Users show their Tolan to friends.
- **Caveats/contradictions:** it is venture-backed ($10M seed), and the early luck is acknowledged by the hosts. Character design and animation were a major investment (Unity-rendered), and the hosts say that is hard to copy.
- **Quote:** "Monetization is a forcing function for product." (host)

## Batch-level patterns
- **The paywall belongs in or right after onboarding, framed by the story before it.** Evidence: SOSA shows over 80% of trial starts on day 1. Sylvain says the pre-paywall story matters as much as the paywall. Genius Scan is the notable exception: it deliberately skips the onboarding paywall and accepts lower revenue.
- **Activation predicts conversion better than paywall tricks.** Ladder (1-2 workouts means a very high chance of paying, 3 per week in week 1), Tolan (first long conversation), Duolingo (never break the streak) and Sweatcoin all put most of their effort into getting users to the core action fast. Ladder's split was about 90% product and 10% deals.
- **Segment offers by engagement.** Ladder gives zero-activity triallers monthly or a cheap intro and pitches annual only to activated users. onX targets upsells by cohort and recent feature use. Quizlet tiers win-back discounts by tenure. Google Play says to show the one offer that fits the user's signals rather than every option.
- **Personalization should be emotional or contextual, not merely functional.** Nathan Hudson's warning uses a *sleep app* that only personalizes reminder time. Tolan's quiz reflects the user back, playfully, and carries answers forward as memories. Duolingo found that user-chosen reminder times lose to behavior-based timing (23.5h after the last session).
- **Loss aversion and sunk cost are the psychology that works.** Examples: set up premium features during onboarding and then show what you'd lose (Sylvain), a coin balance that grows instead of resetting (Sweatcoin), the streak (Duolingo), and endowment (users value their own coins 10-50x higher). The consistent caveat is that manipulation only holds up when the underlying goal is the user's own.
- **Price vs retention trade-off.** Lower prices retain better (SOSA p.71; Flo's half price gave 3x retention). Judge price tests on ARPU or payback, not conversion (Flo, Ladder, Falzon). Removing a cheap tier can lift revenue when demand is inelastic (Genius Scan).
- **Paywall entry points and copy are fragile.** Genius Scan lost about 10-20% of paywall views from one moved button and doubled purchases with fallback banner copy. Mimo gained +60% trial opt-in by splitting the paywall across screens. Test layout, entry points and copy, not just price.
- **Churn happens early and is mostly about value.** Annual auto-renew turn-offs peak in month 1, right after the charge. Duolingo sees win-back efficacy collapse by day 3-7. Churn surveys point to cost and low usage, not competitors. The remedies are early habit-building, visible value, and flexibility (pause, shorter plans, easy cancel) over dark patterns.
- **Freemium vs trial is contested.** One guest says "switch to a trial and you'll make more money." Deezer, Weather Channel, Flo and Genius Scan say degrading free, or charging those who can't pay, backfires. The recurring rule is to choose based on market size and how much value you give away (onX: a niche market suits a trial strategy).
- **Early growth for character-led or consumer apps came from TikTok creator stables and referrals.** Tolan and Sweatcoin both built cheap distribution into the product's shareability rather than leaning on paid ads.
