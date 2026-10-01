# Sub Club notes: batch 03

Thirteen episodes, 2023-08-07 to 2023-12-27. Source: auto-captions, so names and numbers may be garbled. Numbers I'm unsure of are marked "(?)". Two transcripts (Wavve, Ladder) read like machine translations back into English, so their wording is looser than usual.

## What it Takes to Succeed with Paid User Acquisition (Thomas Petit, independent UA consultant, 2023-08-07, https://youtu.be/i_XoG6I2RiM)
- **Relevance:** medium. Mostly about paid UA, but it sets useful thresholds for when paid spend makes sense at all, plus a payback model.
- **Findings:**
  - Before spending on paid ads, run three checks: a clear goal (return, learning, or reaching critical mass), cash you can afford to lose, and current revenue per install. Opinion from a consultant with hundreds of clients.
  - Algorithmic platforms (Meta, TikTok, Google) need about 10–20 optimization events per campaign per day. That works out to roughly $10–20k/month per channel. He calls $0–50k/month the hardest zone and wouldn't start a channel below $10k/month. Observed across clients.
  - Running $20/day with hand-picked targeting is a waste. Narrow audiences cost more, and if you optimize for installs or clicks instead of trials, the platform sends you the traffic least likely to convert. Explanation of how the auction works.
  - Small budgets ($5–10k) should go to Apple Search Ads and micro-influencers, which don't depend on optimizing past the install. Cheap Google web search campaigns sending people to a simple landing page are a good way to test messaging before the app is even built.
  - Rule of thumb: a US subscription app earning under ~$1 per install can't make paid work. Revenue per user from featuring or high-intent search traffic overstates what paid traffic will earn. (Barnard said featuring drags his ARPU down, and high-intent keyword traffic inflates it.)
  - Example (anecdote via Barnard): a profitable bootstrapped developer with a 7-day trial spends on paid only if it pays back by day 366. He assumes 40% of annual subscribers renew in year one and that renewals then climb to 60–70%.
  - Judge channels by blended cost per paying subscriber and how it trends as spend moves up or down. Cut the data by country and platform. Platform-reported trials can be the worst-converting ones.
  - Creative is now the main lever you control, and "ugly wins." Experts can't predict winners any better than chance. Test radically different concepts, not 20 versions of one. A single winning creative can change a company's trajectory ("100x"). The best ad Monkey Taps (a motivation app) ever ran was a screenshot of a notification.
- **Tactics:** Before an app launches, test messaging with small web search budgets. Use several creative sources (in-house, creators, agency, founder selfie videos). Open with a hook that isn't about the app, then move to the product, and make clear it's an app so App Store visitors don't bounce.
- **Caveats/contradictions:** He wouldn't give a single minimum ARPU because it varies by country and category. Clickbait ads that get engagement but few installs end up penalized by the auction.
- **Quote:** "Ugly wins, but the truth is you cannot anticipate what's going to win."

## From Consultancy to $10M in ARR (Vince Mayfield, Talking Parents, 2023-08-09, https://youtu.be/RJbtWjEgN4g)
- **Relevance:** medium. A good price-increase case study and tier design. The category (court-ordered co-parenting) isn't like ours.
- **Findings:**
  - They doubled the price for existing subscribers from $4.99 to $9.99/month and planned on losing half of them. They lost about a quarter, and some came back later. Observed data. Every raise came bundled with features users had asked for in surveys (recorded and transcribed "accountable calling").
  - They later added a $24.99 tier with video calling. iOS users skewed toward the higher tier, and Android users were more price-sensitive. Observed.
  - Starting too low (free, then $4.99) became "business debt" that made later raises painful. Jacob Eiding's advice: start high, because lowering a price never makes anyone angry. That matters most for long-retention products.
  - Upgrade incentive between users: each parent's tier decides which features they get, so one parent having video pushes the other to upgrade.
  - Replying by hand to every App Store review counts as marketing for future readers, not only the reviewer. Anecdote.
- **Tactics:** Survey users about which features they'd pay for, and ship those alongside the price raise. Keep a free web tier as a fallback so a raise doesn't strand anyone.
- **Caveats/contradictions:** About 60% of users are court-ordered to use the app, which dulls price sensitivity, so the churn result may not carry over.

## App Store Ethics, Dark Patterns, and Rule-Breakers (Steve P. Young, App Masters, 2023-08-23, https://youtu.be/w9HAwvWKJQc)
- **Relevance:** high. Direct hard-paywall data, paywall placement in onboarding, and a "try a hard paywall" heuristic.
- **Findings:**
  - Hard paywall in Steve's own simple one-feature app: organic revenue went from about $1–2k to $10k/month with no close button. When Apple made them add an X, revenue fell to about $5k/month. Trial-to-paid averaged about 35%. Observed data, single app.
  - A friend's crossword app tested a hard paywall against freemium and saw revenue rise. A later test compared the hard paywall with "lock most content, keep one puzzle free." Anecdote. He cites Calm locking most meditations while letting you see the whole catalog.
  - Adding a soft, closable paywall to onboarding doubled revenue for Anya's panic-attack app. She deliberately avoided a hard paywall because someone mid-panic needs relief, not a purchase screen. Anecdote. A friend reported the same doubling around 2017–18 (?).
  - Delaying the paywall's X by about 5 seconds raises revenue. He calls it "edgy" because it makes a soft paywall feel hard.
  - Heuristic: an indie making under ~$1k/month should try a hard paywall to find out whether users actually want the app. Opinion.
  - Barnard: very few people just forget to cancel. Some apps convert only about 5% of trials (even 3-day ones) to paid. Single-digit trial-to-paid means no product-market fit, and 10–20%+ means real value.
  - Most users never reach "ask for a review after 10 uses." Ask after the first success, during onboarding, or right after the paywall is dismissed.
  - Barnard moved his weather app to a hard paywall because widgets and complications, its main value, can't carry ads and cost money per user. Every free trial loses him roughly $0.10–$1 (?).
  - Health, fitness, and mental health convert best among the categories App Masters sees. Pick "painkiller" categories.
  - A simple icon change raised paywall views 57%. Anecdote from Steve's video.
- **Tactics:** Put the paywall in onboarding. Show the review prompt in onboarding or after the paywall. When you're small, test by looking for big obvious differences instead of waiting on statistical significance.
- **Caveats/contradictions:** Barnard still says freemium is right for most apps long-term and calls a hard paywall "kind of a cop-out" (though a fine starting point). He also describes a web flow that took a $1 "trial cost" payment and then charged about $70 on a vague continue button. He had to file a chargeback, which is the risky end of web funnels. The episode also covers fake reviews and keyword-install boosting (ASO black hat), noted here only.
- **Quote:** "If you're not making at least a thousand dollars a month try a hard paywall."

## Raising App Prices the RIGHT Way (Reid DeRamus, Substack / ex-Crunchyroll, Hulu, HBO Max, 2023-09-06, https://youtu.be/-7LdgMnxG5M)
- **Relevance:** medium. Covers how to raise prices, the early-stage retention focus, and analyzing churn during onboarding.
- **Findings:**
  - Executed well, a price increase mostly slows new-subscriber acquisition and barely moves existing-subscriber churn. Illustration: a 10% raise might take 100k new subs/month down to 80–90k. He says these numbers are made up. Observed across streaming companies.
  - Most of the revenue from a raise comes from existing subscribers. Raising only for new users leaves most of it on the table. Very early on, grandfather existing users instead.
  - "Your health metrics are too good": retention far above peers (some Substack writers keep 90% after a year) usually means you're underpriced. Barnard cites RevenueCat's median of about 30% retention on annual plans. Around 20% annual retention means you're not ready to raise.
  - Raise in small steps (+$1–2, as Spotify and Netflix do). Restate the value, and time the raise to a big launch (Disney+ announced ahead of major series premieres). Never blame inflation.
  - Useful analysis: compare people who cancel during the trial or first billing period with those who stay, and find the early behaviors that predict survival. The onboarding period (first session, first day, first month) is where to focus.
  - Before product-market fit, skip cancel-flow discounts and win-back tactics. The product should be what retains people.
  - Tiers: willingness to pay varies, so add a higher tier (Substack's pay-what-you-want "founding member" tier gets prices well above list). Keep it to three tiers or fewer.
- **Tactics:** Win-back: email churned users when the thing they asked for ships (Crunchyroll did this with requested shows), sometimes with a discount.
- **Caveats/contradictions:** Surveys on willingness to pay are only partly reliable, because stated and actual behavior differ.

## Building the Berkshire Hathaway of Consumer Subscriptions (Eric Crowley, GP Bullhound, 2023-09-20, https://youtu.be/1gbJPWlAPLE)
- **Relevance:** low. About the investment and M&A landscape.
- **Findings:** App Store revenue is about $95B, which he says tops 450 of the Fortune 500. For consumer subscriptions, 70% first-year annual retention counts as very good, against about 90% gross retention for B2B SaaS. The "3 C's" thesis: content (SEO) for acquisition, commerce for conversion, community for retention and word of mouth. He names family management, femtech, youth sports, and personal wealth as open categories. Talking Parents is one of his featured picks.

## VC Funding vs. Bootstrapping for Subscription Apps (Martín Siniawski, Podcast App / Rest, 2023-10-04, https://youtu.be/e8GJ1XnIKOc)
- **Relevance:** low. Mostly about fundraising. Of note: the team is building a sleep app, Rest.
- **Findings:** Podcast App reached about 130k paying subscribers. They noticed people using podcasts at night to fall asleep and launched Rest (sleep audio plus LLM "sleep coaching" for habits and routines). They got its first users by cross-promoting to existing users who listen at night, and they size the US sleep market at about $30B/year (?). He believes consumer apps need a big organic core, because paid CAC/LTV rarely works on its own. Long-tail SEO built his first company. Rest competes with Trundle only loosely.

## App Optimization Through Experimentation (Hannah Parvaz, Aperture, 2023-10-18, https://youtu.be/uQEXTUuHOZU)
- **Relevance:** high. ATT prompt placement, hard versus soft activation with numbers, and keeping the trial offer in onboarding.
- **Findings:**
  - ATT prompt placement: they tested several spots, and showing it on first launch had the least impact on anything, including sign-up, trial, conversion to paid, and hard activation. They are now rolling it out everywhere. A/B tests across clients. (Barnard notes Duolingo asks only after a few lessons, which may be deliberate so they track only engaged users.)
  - Hard activation threshold: in one content app, listening to 6 stories was the point where users became "hard activated." They gave everyone 10 free stories, since 6 was only an average. Users who reached 6 before starting a trial converted from trial to paid 2x better. After story 6, each next story kept about 98% of listeners. Observed data.
  - That did not mean moving the trial later. Offering the trial in initial onboarding brought in so much more volume that they never removed it. Instead they re-offered the trial after users got warmer. Test result, no numbers.
  - Find the specific drop-off step (in the example, starting the second story, not the first) and remove friction there with autoplay, tooltips, rewards, and light gamification.
  - Only about 70% of "true" App Store installs led to a first open in one product. Check that gap before blaming onboarding. Observed.
  - Churn depends on each user's own cadence. With a 21-day average visit gap, someone who usually comes every 18 days is at risk by day 19, while a 35-day user isn't.
  - North-star metric shape is cadence + action + revenue (for example, weekly active subscribers).
  - Paid basics: 50 conversions/week per ad set to exit learning, so about $6k/month is the minimum at a ~$5 CPI. Optimizing for post-install events needs about 120 installs/day. Platform visibility was about 60% of what the MMP showed.
  - Seasonality: November is expensive every year because of e-commerce, so shift to brand and awareness spend. Costs drop from December 1, and December 15 to late January ("Q5") is the cheapest, best time for digital subscriptions.
- **Tactics:** Test one message across 4 formats (iMessage, Notes app, UGC, SMS mockups), then iterate on the winning format. Pair cheap engagement or boosted posts ($1–2 CPM) with direct-response ads ($7–12 CPM) aimed at the same people.
- **Caveats/contradictions:** The first-launch ATT result goes against the common "prime them first" advice. She presents it as surprising.

## From Idea to 8-Figure Exit in 10 Years Flat (Aaron Foss, Nomorobo, 2023-11-01, https://youtu.be/x5fcgrSp9s0)
- **Relevance:** medium. How trial length was reasoned out, frictionless trials, and freemium as a data and acquisition loop.
- **Findings:**
  - A 14-day free trial was chosen on purpose because the value (a blocked robocall) may not show up in the first days. Two weeks is long enough for users to see it work. He says "just cancel if it doesn't work." Anecdote.
  - Removing friction was central, both on the trial and on the programmatic SEO pages that send people to it.
  - Pricing: $1.99/month or $19.99/year at the start, one of the earliest subscription apps. The later "Max" tier is $4.99/month, $49.99/year, or a $79.99/year family plan, built on user requests ("protect my whole family"). He thinks Apple's cut was cheaper than running billing himself at that price point.
  - Free landline blocking works as freemium: it produced the data that powers the paid mobile product, plus email upsells. Carriers built it in for free as a distribution channel. Barnard: freemium only works when free users give back value (data, community, word of mouth).
  - Growth came without paid ads: a 30k-email waitlist from FTC contest press, programmatic SEO pages for every spam phone number, and localized "top scams in your city" data pitched to reporters. That produced two to three press mentions a week for 10 years.
  - Nearly ran out of cash (about $944 in the bank) during the gap between the trial and Apple's payout. Negotiate supplier terms ahead of time.
- **Tactics:** Warm launch by emailing existing free users about the paid mobile app. Soft launch, fix bugs, then tell the press.
- **Caveats/contradictions:** Not a typical app. It had a public-interest story and government-supplied data.

## App Growth Through Strategic Partnerships (Adam Allore, Wavve Boating, 2023-11-15, https://youtu.be/TWnS7Fegf7s)
- **Relevance:** low. About validation and partnerships.
- **Findings:** He validated demand with a fake app (a web map pinned to iPad home screens) at a boat show for under $1k, collecting emails when visitors couldn't find it in the store. The first MVP was bad everywhere except the core value (the map). An emergency feature went unused. Early Apple Search Ads ran $0.50–$1 per install. Partnerships (Sea-Doo integration, boat club licenses) bring about 25% of acquisition. The hardest part of B2B2C licensing was getting members to activate at all, which was solved with deep links and very little authentication friction. Forgot to secure logo rights for social proof on store pages.

## How Ladder Cracked TikTok and Grew 500% (Greg Stewart, Ladder, 2023-11-29, https://youtu.be/rVUi0yFno5I)
- **Relevance:** high. Web quiz personalization, a price reset using survey method, annual-plan uptake numbers, no-card trials, and retention design (accountability, teams, seasons).
- **Findings:**
  - Price reset: they launched at $60/month because 1:1 coach chat was included. People arriving from Facebook ads didn't want chat, just a plan of what to do each day, and compared the price with Netflix or Spotify. A Van Westendorp survey (about 500 responses, segmented by source and goal) found an optimal point of about $29. They dropped chat and relaunched at $29.99/month. Survey plus about 100 user calls.
  - They didn't A/B test the price: the answer seemed obvious, and running multiple prices wasn't worth the complexity while trying to prove the product could scale.
  - Re-contacting the Facebook leads who had declined, now with the new price and positioning, gave their biggest month so far (January 2022). Win-back through a better offer.
  - Annual plan: after three years of mostly monthly plans (kept so month-1 to month-3 retention stayed clear), a simple side-by-side monthly/annual choice at the end of the trial moved annual from about 0% to about 20% of new payers. Dropping the annual to a $14.99/month equivalent ($179.99/year, 50% off monthly) raised it to about 30%. They studied Duolingo's published pricing work. Observed.
  - Web onboarding quiz: about 15 questions (days per week training, lifting frequency, style, equipment, location, goals), ending with 3 recommended programs ("teams"). About 1M completions in 18 months. The data showed about 1/3 of prospects wanted traditional bodybuilding, which Ladder didn't offer, and those users converted at half the rate. They launched that program and it became one of the fastest-growing.
  - Specific quiz answers are sent to TikTok as conversion events, so the algorithm learns which prospects are ideal (people who already lift) before any in-app signal exists. For every quiz-taker, about 3 people screenshot the ad and go straight to the App Store. Those two groups moved in lockstep, so quiz metrics stand in for everyone.
  - The free trial needs no credit card and never has, to lower commitment in a crowded market.
  - They measure payback period, not LTV:CAC ("a fantasy" at an early stage). Unit economics break even within a few months.
  - Retention design copies a personal trainer's pillars: programming (no thinking needed), coaching, and accountability. They call accountability the most important. Team chats led by a coach, where members do the same workout that day, drive consistency ("I wasn't going to train today, but..."). Getting users into chat earlier predicts workout completion. The team metric is workouts completed.
  - "Strength series" are 6-week seasons, six a year, tied to the fitness calendar. A badge requires 20 workouts. Each season start is a natural "start now" moment for acquisition.
  - Growth went from 9k to more than 50k paid subscribers in 2023.
- **Tactics:** Ad CTAs name a start date ("we start Monday," "start before New Year's") and say explicitly "go to my profile, tap the link." Put value props in users' own words, drawn by hand from about 16k App Store reviews. Build a quiz tool that non-engineers can edit.
- **Caveats/contradictions:** The first influencer cohort would pay $60 only because users saw coaches as heroes, so that price didn't hold for broader traffic. Their experience with a Facebook agency was a disaster ("never again an outside agency"). The TikTok playbook (budget changes several times a day) contradicts reps' advice.
- **Quote:** "Nobody buys or tries a fitness app to make friends. But that's exactly what has happened."

## The Subscription Value Loop (Phil Carter, Elemental Growth / ex-Quizlet, 2023-12-13, https://youtu.be/Zi1PREAhrFw)
- **Relevance:** high. Onboarding philosophy (including Rise, the sleep app), paywall placement data, pricing research method, promotions, and ethical trial design.
- **Findings:**
  - Framework: value creation (robust, rapid, repeatable, remarkable) leads to value delivery (organic loops first, paid only as a supplement) and then value capture (paywall, pricing and packaging, payments, promotions).
  - Rapid value: front-load delight and back-load work, so the user reaches the aha moment in the first session, ideally within about 30 seconds. Use the Reforge sequence: setup, then aha, then habit.
  - The right onboarding length varies. Noom's long quiz works because each question builds intent and makes the user feel listened to. Reflectly is short, delightful, and ends in a hard paywall. **Rise (sleep)** is his favorite: a few screens frame sleep as "a drug," name one metric (sleep debt), ask a few questions, optionally connect a wearable, and then show a personal sleep debt with bedtime, wake, and caffeine cutoff times, all within about two minutes. Barnard's point: the onboarding itself delivers the coaching value.
  - "Immersive onboarding" (Quizlet's term): show, don't tell. The App Store listing and ads already made the pitch, so don't repeat screenshots. Put the user into real use, as Duolingo does with a lesson inside onboarding.
  - Early onboarding can be rough while testing product-market fit, since a polished onboarding over a weak product sends a false signal (Jacob Eiding).
  - Matter (reading app): a more aggressive paywall placement plus copy and visual work more than doubled the paywall view rate, which lifted subscriber conversion about 30%. Observed with a client. A new feature (readable podcasts) nearly doubled subscriber conversion by widening product fit.
  - UDocs (edtech, South America): Van Westendorp plus conjoint analysis showed low willingness to pay for Pro over Light, and for annual over monthly. The costly ebook feature was valued least. They moved to a single tier with a lower annual price: +12% subscriber conversion and +10% net subscription revenue, with better margins.
  - Paywall one-two punch: make sure every user sees a paywall in the first session (many don't know a premium version exists). Then add metered, contextual paywalls when a user hits a free-use limit on a premium feature, instead of showing a paywall on every open.
  - When deciding how aggressive the paywall should be, consider product complexity, price level, growth loops (UGC or word of mouth means you need a generous free tier), audience (students are less patient and have less money), competition, and trial length (a month-long trial allows an aggressive paywall; a 3-day or no trial calls for care).
  - Paywall design: emotional appeal, images or video, a short feature list, and a highlighted annual plan with its monthly equivalent. Calm's paywall is tuned to the mindset of someone who can't sleep at 1am (soft blue, calming language). They also customize the paywall by entry point, such as a celebrity sleep story.
  - Duolingo celebrates the purchase (Duo becomes an astronaut and the app's look changes), which makes the paywall moment delightful and reminds non-payers what they're missing.
  - Early-stage consumer apps should offer one plan, annual only or monthly plus annual. More complexity costs conversions.
  - Payments: Blinkist-style transparent trial timeline and reminders are a win-win (Quizlet adopted it). Cancel flows can ask why and offer a discount, but must stay easy to find. US "click to cancel" rules are coming. Support alternative payment methods on the web (SEPA, iDEAL, Boleto, OXXO, Venmo, PayPal).
  - Promotions: activity-based discounts. Find the time by which 90% of subscribers have converted, and offer a discount to anyone who hasn't converted by then. Holiday promos work better with brand personality than with generic "act now" copy.
  - Sean Ellis 40% "very disappointed" test for product-market fit. Superhuman segmented users toward the highest-disappointment group.
  - Quantify offline word of mouth with the Reforge "word of mouth coefficient": new users from direct, branded search, or social divided by active users.
- **Tactics:** Put a paywall in the first session plus metered feature paywalls. Use Van Westendorp's four questions (too expensive, expensive, bargain, suspiciously cheap), then run conjoint on feature bundles, then A/B test the hypothesis.
- **Caveats/contradictions:** Barnard's MyFitnessPal example (a paywall on every launch is tolerable when the free value is large) cuts against Phil's advice not to tap users on the shoulder at every open. Phil agrees that more free value buys more leeway.
- **Quote:** "Front load as much delight and back load as much work."

## TikTok as a Growth Loop for Ladder (Greg Stewart, Ladder, 2023-12-18, https://youtu.be/6dYQ3AHhOiM)
- **Relevance:** low. A short clip repeating the TikTok section of the Nov 29 episode.
- **Findings:** No new data. Same points: organic performance tells you which ads will win, Spark ads (whitelisting creators' posts), raw iPhone-shot content, quiz answers as conversion events, and about 3 direct App Store installs per quiz completer.

## Pitch Your App to the Press (Matthew Panzarino, ex-TechCrunch, 2023-12-27, https://youtu.be/CXiVgq0X4x8)
- **Relevance:** low. About PR.
- **Findings:** Writers get about 500 pitches a day and judge on sender plus subject line. Pitch one writer who covers your space. Lead with what makes you different, because good design is only the baseline ("zero"). When a competitor has an outage or shuts down, market your own lasting advantages, not their failure, or the users you gain leave once the competitor recovers. A TechCrunch article can bring thousands of high-intent early adopters. Use a short body, no tracking pixels, and a detailed press kit that doesn't pre-write the story.

## Batch-level patterns
- **Paywall exposure beats paywall polish.** Moving the paywall into onboarding or the first session keeps producing large gains: doubled revenue (Steve's soft onboarding paywall), 2x paywall view rate giving +30% conversion (Matter), and $10k to $5k when a hard paywall was forced soft. Barnard and Phil both say many users don't know a premium version exists.
- **Hard paywall as a test, freemium as the destination.** Several guests (Steve, Barnard, Reflectly via Phil) back starting hard or aggressive to measure real willingness to pay. Freemium is justified only when free users give value back (Nomorobo data, AllTrails/Quizlet UGC).
- **Activation thresholds are measurable and worth designing around.** Hannah's 6 stories (users who reach it convert 2x better, ~98% step retention after) and Ladder's completed workouts and team-chat entry both tie retention to one repeated core action. Both give free usage past the average threshold.
- **Keep the trial offer early, then re-offer.** Hannah found the onboarding trial offer's volume outweighs better conversion from warmer users, so they re-offer later rather than moving it. Trial length should match how long the value takes to appear (Nomorobo's 14 days for robocalls). Barnard and Steve agree that "forgot to cancel" is a small effect.
- **Price from survey method, not guesswork.** Van Westendorp shows up twice (Ladder $60 to $29.99, UDocs single tier +12% conversion / +10% revenue). Simplify to one plan, and present annual side by side at about 50% off monthly (Ladder 0 to 20 to 30% annual uptake). Guests favor raising prices with bundled new value, and they found acquisition suffers more than retention.
- **Onboarding that delivers value itself.** Rise (sleep debt calculated in about 2 minutes), Noom, and Duolingo's in-onboarding lesson all use the quiz or setup to demonstrate the product ("show, don't tell"). Ladder's 15-question quiz personalizes, informs product roadmap decisions, and feeds ad targeting.
- **Accountability and social structure drive retention.** Ladder's coach-led team chats, 6-week seasons, and 20-workout badges reflect Eric Crowley's "community for retention." Seasons also create recurring "start now" dates for acquisition.
- **Organic core first, paid as an accelerant.** Petit's $10–20k/month floors, Martín's "big organic piece," Phil's value delivery, and Nomorobo's zero-ad growth all agree that paid only works on top of proven conversion and retention.
- **Win-back works best when the offer or product changes.** Ladder re-contacted declined leads after the price reset, Crunchyroll emailed churned users when requested shows arrived, and Reid advises against discount-driven cancel flows before product-market fit.
