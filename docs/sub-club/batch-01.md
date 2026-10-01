# Sub Club notes: batch 01

Source: Sub Club podcast (RevenueCat), 13 episodes, June 2021 to January 2022. Transcripts are auto-captions, so names and numbers may be garbled; uncertain numbers are marked "(?)". Everything here is paraphrased.

## Reaching 50 Million App Downloads (David Smith, Widgetsmith, 2021-06-30, https://youtu.be/pjfD3llaSF8)
- **Relevance:** medium. It argues the opposite of a hard paywall. Useful as the case against one.
- **Findings:**
  - A generous freemium paywall worked as a marketing budget. Widgetsmith went viral on TikTok and hit #1 partly because the core feature was free. The subscription covers things with real ongoing costs (weather data, tide data, graphical assets). (Anecdote. Home-screen widget app, mass consumer audience.)
  - Smith's rule: the paid tier should be clearly worth paying for, never an arbitrary restriction that feels mean-spirited. (Opinion.)
  - He deletes any app whose first screen asks for money. His view is that an upfront paywall signals an app that is paying for distribution. (Opinion. Conflicts with hard-paywall practice.)
  - Durability after the viral spike came from built-in word of mouth: the widget sits on the home screen and people share screenshots of it. Revenue is ads plus subscriptions and depends on usage, not new installs. (Observed.)
  - His failures came from a market that was too small and from ongoing costs he didn't model. His weather app turned "from a business into a charity" once data costs outran one-time revenue. (Anecdote.)
  - Paid UA never paid back for him as a solo developer. (Anecdote.)
- **Tactics:** Ship on day one of a new iOS API to get Apple's attention. Design for the most common screen size (iPhone XR/11 at the time), using his own analytics. Add ads and paid assets after reaching fit, not before.
- **Caveats/contradictions:** He's an indie with no UA spend, so his economics differ. Jacob's pushback on the episode: apps that spend on UA are pushed toward aggressive paywalls, but they then pay for users they immediately alienate.
- **Quote:** "if you get too uptight that the first thing ... the app does ... is ask for money ... I'm just closing that app and deleting it"

## App Growth Strategy (Alex Ross, Greg / Gregarious, 2021-07-14, https://youtu.be/wzzNG1ye_xw)
- **Relevance:** medium-high. Retention built on reminders, a 30-day trial, and partner distribution at the moment of need.
- **Findings:**
  - The founders solved retention before growth. They picked one behaviour tied to retention (watering reminders via heavy push) and tested for six months whether it stuck. The app now "looks like a water reminder app." (Observed. Plant care, consumer.)
  - Retention model: an external trigger (a feeling or a reminder) plus value delivered when the user opens the app. Plants provide no emotional trigger, so reminders substitute for one. (Opinion/framework.)
  - Distribution at the moment of need: plant retailers put a 10x10cm QR card in each shipped plant. In exchange, customers get a free subscription tier for N months (first 6, now 3). This brought roughly 15,000 users (range given 10k-20k (?)). (Observed.)
  - A 30-day trial, which Ross calls "too much for a mobile app," stretches payback. Trial length, Apple's payout delay and the billing cycle mean up to about 90 days before cash comes back. (Observed.)
  - Paid Facebook/Instagram ads ran at roughly break-even ($1 in, $1 back). (Observed, early.)
  - Incentivised referrals through promo codes had too much friction and underperformed. User-generated plant pages indexed by Google form an SEO loop. (Observed/hypothesis.)
- **Tactics:** Beta of about 1,000-2,000 users recruited from Facebook groups and Reddit. Workers found on Craigslist weighed plants to collect training data.
- **Caveats/contradictions:** Ross concedes the 30-day trial is long. There are no conversion numbers.

## Proven Growth and Retention Strategies (Andy Carvell, Phiture, 2021-07-28, https://youtu.be/Vjmp0gFhwHg)
- **Relevance:** high. Covers the lifecycle and notification framework and testing onboarding with daily cohorts.
- **Findings:**
  - Notification impact = reach x relevance x frequency. Reach is the opt-in rate and funnel stage. Relevance can be measured by click-through rate. Highly relevant messages tolerate high frequency before users opt out. The best notifications score high on all three. (Framework from SoundCloud, about 500M pushes per month.)
  - SoundCloud messaging experiments moved retention by 5 percentage points. Before that result, engineers resisted more notifications. (Observed.)
  - Start lifecycle work by asking users what they think, hope and expect at each stage, not by reading funnels. (Opinion.)
  - The user journey starts at the ad and the store page, which set the expectation that the first session must deliver. (Opinion.)
  - Use a CRM or in-app messaging layer (Braze and similar) to test onboarding without waiting on an engineering backlog. Each day's installs form a fresh cohort, so you can iterate daily with even a few hundred installs. (Tactic.)
  - Tests at the top of the funnel have the most leverage because that's where most users still are. (Jacob, from Elevate: nine times out of ten, late-funnel tests didn't matter.)
  - Developers aren't typical users. Consumers often welcome relevant messages, including SMS (GoodRx, older users). Give a clear opt-in/opt-out choice in onboarding. (Observed/opinion.)
  - Stage the work. Early on, take big swings measured by cohort, not A/B tests. At scale, a 0.1% lift in conversion or one extra month of subscription lifetime becomes meaningful. (Opinion.)
- **Tactics:** Run risky messaging tests in a small market first (SoundCloud used Pakistan). Build in sharing to "sow seeds" for virality. Localize the store listing early.
- **Caveats/contradictions:** Carvell says most early apps are 2-3 years from product-market fit.
- **Quote:** "not all notifications are equal ... the really killer ones ... have high reach, high relevance and high frequency"

## Marketing Your App on TikTok (Maddie Kirby, 1 Second Everyday, 2021-08-11, https://youtu.be/hhSRx2p2COQ)
- **Relevance:** medium for this founder, given his short-form video background. Low on paywalls.
- **Findings:**
  - Pick three content "buckets" (behind the scenes, app walkthroughs, trends), try ideas in each, and prune what doesn't land. (Tactic.)
  - A fast duet on a creator's viral video pitching the same idea (about 13M views (?)) got about 1M views, then several days of roughly 1M views per video. 1SE reached #1 in the App Store for the first time. Existing users posted "download 1SE" in the comments. (Observed.)
  - New Year is 1SE's biggest acquisition moment because people start annual habits then. (Observed. Relevant to habit apps.)
  - Posts shouldn't read as ads. "What app is that?" comments signal success. A proven format ("I recorded my life for X years") can be reused when a spike is needed. (Observed.)
  - Keep the sharing feature outside the paywall. A monthly share plus giveaway loop on Instagram produces monthly spikes. (Tactic.)
  - A creator's tutorial (the Widgetsmith story) worked as ideal onboarding: result, then why it's worth it, then the steps. (Hosts' observation.)
- **Tactics:** Brand ambassador program (200+ applicants, 26 chosen), paid in merch and access.
- **Caveats/contradictions:** Luck and timing dominate. The same video can flop and then succeed months later.

## How Apple's ATT Affects Developers (Shamanth Rao, RocketShip HQ, 2021-08-25, https://youtu.be/Sbz8pvKZwLI)
- **Relevance:** low-medium. Mostly ads, but it includes one useful trial-timing fact and a landing-page structure.
- **Findings:**
  - Nearly every subscription app he knows gets 90%+ of free-trial starts within 24 hours of install. The paywall moment is the first session. (Observed across clients.)
  - Subscription apps were hurt less by ATT than games. Cost per trial is usually under $50, so volume clears Apple's privacy thresholds. (Observed.)
  - Web landing pages in front of the App Store sell better than the store page. Structure: main value prop in the header, then social proof, then the most important emotional benefits, then features. (Tactic.)
- **Tactics:** Test web landing pages before building full web onboarding and web checkout.
- **Other:** iOS ad spend fell about 30-40% (?) as budget shifted to Android. Judge with blended CPA. Incrementality testing only helps the biggest spenders.

## Building, Refining, and Pricing a Top-Level App (Matthieu Rouif, PhotoRoom, 2021-09-27, https://youtu.be/lPxP3EeGcMA)
- **Relevance:** high. Covers getting to the "magic moment" in onboarding, an upsell inside onboarding, and price iteration.
- **Findings:**
  - In guerrilla tests (buying people a McDonald's meal in exchange for testing), users dropped off before ever seeing the background removed. The fix was to show the core magic as early in onboarding as possible. The host saw a background removed within about 3-4 taps of opening the app. (Qualitative testing. Photo editing app, consumer then prosumer.)
  - The same interviews revealed the best niche: resellers on Depop, Poshmark and Vinted. The team dropped video and casual uses to focus on this "pro" segment. (Observed.)
  - Pricing: started around $8-9/month to match other pro photo apps, with Spotify and Netflix at about $10/month as the ceiling users compare against. The US annual plan rose from $40 to $69. (Observed.)
  - The upsell is inside onboarding, which is one reason he avoids a price that looks too expensive at first sight. (Tactic.)
  - Monthly was pushed first so users would churn quickly and the team could learn from them. Feedback from paying users is worth more than feedback from free users. (Tactic.)
  - Demand is elastic: doubling the price roughly halves the number of payers, within about 10%. Not worth heavy price testing early. (Observed from GoPro/Replay days.)
  - Paid acquisition started only after fit, using demo videos that had gone viral organically as ad creative. Mix was roughly 30% paid, 70% organic. (Observed.)
- **Tactics:** Shipped an MVP in about two weeks, with subscriptions via RevenueCat from launch. One price for everyone for simplicity; a higher business tier is deferred. Growth and product share a single focus per quarter.
- **Caveats/contradictions:** Rouif thinks the pro segment is underpriced but keeps prices low to avoid alienating users.
- **Quote:** "we actually put forth first the monthly plan because we wanted people to churn and be able to talk to them"

## From Bootstrapping to Partnering With Sony (Seth Miller, Rapchat, 2021-10-06, https://youtu.be/n_1ruMSNh9E)
- **Relevance:** medium-high. Adding a paywall to a free app without backlash, plus persona segmentation.
- **Findings:**
  - Asking new users "why are you here, what are your aspirations," then reading metrics through that persona lens, was the "biggest unlock." Blended retention hid a hobbyist in India and a serious artist in Georgia behind one average. (Observed. Music creation, UGC.)
  - Early fit showed up qualitatively at scale (tweets, reviews) before metrics. (Opinion.)
  - Adding subscriptions to a 400k-MAU free app: nothing existing was paywalled and the free tier was upgraded. Only new premium tools (vocal effects, auto-mix) went into "Rapchat Gold." Users converted and kept converting. (Observed.)
  - Sharing loop: two share buttons (Twitter/Facebook) gave a "10x return." An auto-generated video of your track became the most-used feature because video does better in social feeds. More than 80% of 7M creators came organically. (Observed.)
  - Moving to subscriptions shifted product focus from top-of-funnel virality to the users who pay. (Opinion.)
- **Tactics:** Plans a second subscription layer to help artists earn money (distribution to Spotify and Apple Music).
- **Caveats/contradictions:** Miller would add subscriptions much earlier if starting again. Investors had told him to wait.
- **Other:** Raised from Sony and Adjacent. Facebook cloned the app, down to the flame "like" animation.

## Optimizing Your Subscription App for Growth (Eric Crowley, GP Bullhound, 2021-10-27, https://youtu.be/5enDhwv6tew)
- **Relevance:** medium. The tourists-vs-locals frame, plus investor benchmarks.
- **Findings:**
  - Average LTV misleads. Subscribers split into "locals" (use it every day or every season, retain almost flat) and "tourists" (a month or two), plus people who churn immediately. Find and measure the locals and build for them (for a walking app, add weather forecasts). (Framework from client data.)
  - Hosts' addition: old cohorts end up made mostly of locals. Trial-optimised Facebook campaigns bring in plenty of tourists. (Opinion.)
  - Post-ATT, CAC rose about 20-30%. Install-to-subscribe rate is the key measure of intent. (Observed.)
  - Organic partnerships as the long-term play: Pinkbike/Trailforks with trail associations, Pray.com with the NFL. (Examples.)
  - Investor benchmarks: LTV:CAC around 6x is strong and under 3x cools interest. Early-stage land grabs may accept 1-3x. Growth investors weight churn most, as a proxy for product quality. (Opinion.)
  - Spotify vs Pandora: subscription beats ads because each subscriber brings $10-20/month against pennies per ad user. (Case study.)
- **Tactics:** Consumable add-ons (Tinder-style boosts) as a route to net revenue retention; marketplaces only past about $20-50M ARR.
- **Caveats/contradictions:** Metrics depend on stage. There's a risk of hiding bad users when you "just look at the good ones."

## Growing Your App to 1M Paid Subscribers (Ron Schneidermann, AllTrails, 2021-11-17, https://youtu.be/ZYW6_DqEM7A)
- **Relevance:** high. Covers price tests, freemium walls, funnel prioritisation and targeting mainstream users over power users.
- **Findings:**
  - Price test: Pro was $50/year and users said it was too much. Tests at $30 and $15/year were "about a wash" on net revenue. They picked $30 to leave room for discounts and intro offers. (A/B test, outcome qualitative. Outdoor/hiking, mainstream consumer.)
  - No monthly plan. Annual auto-renew is called "magic," like an annuity. A monthly option is being considered for users outside the US. (Observed.)
  - Two walls, each with its own success metric: a registration wall (registration rate) and a Pro paywall (Pro conversion rate). Features move in front of and behind the walls constantly. (Observed.)
  - Free-to-Pro conversion builds over years within a cohort, "up and to the right." (Observed.)
  - While bootstrapped, they gave each quarter one funnel metric in sequence (bounce, sign-up, Pro conversion, retention). This got them to profitability by the end of 2017. (Observed.)
  - The big bet was repositioning from hardcore backcountry users, who have edge-case demands and are frugal, to beginners like Ron's wife: lower the barriers, build confidence, show approachable imagery. (Observed/opinion.)
  - Free users generate most of the UGC (reviews, photos, recordings), which limits how hard the paywall can squeeze them. (Observed.)
  - Growth: about 20k subscribers and about 1M registered users in 2015, then 1M paid and 25M registered by January 2021. Users who registered during COVID are converting, and COVID subscribers are retaining, above normal rates. (Observed.)
- **Tactics:** Legacy SEO traffic funnels into millions of free app installs a month. First move: two months reading every review and Reddit thread.
- **Caveats/contradictions:** He says they "haven't cracked the code" on pricing. Pro launched at about $3/month in 2012.
- **Quote:** "annual is magic like why mess with a good thing"

## Thriving Despite Apple's ATT (Eric Seufert, Heracles, 2021-12-01, https://youtu.be/yDl35hu1esQ)
- **Relevance:** low-medium. Mostly ads, with one product point on in-app personalization.
- **Findings:**
  - With degraded targeting, apps can't assume Facebook brought the "perfect user." They must infer intent from behaviour in the app and personalise: show something, see the reaction, adapt. (Opinion.)
  - At scale, paid UA should bring the majority (about 60-80% (?)) of new users. Optimising the product only for organic users optimises for a minority, so start paid early to learn what that audience wants. (Opinion.)
  - Shift product focus over the lifecycle, from newcomers to long-tenured users as the base ages. (Opinion.)
- **Other:** SKAdNetwork critique (privacy thresholds, the 100-campaign-ID limit). Diversify channels. Web storefronts give more room to personalise.

## Generating Recurring Revenue (Robbie Kellman Baxter, Peninsula Strategies, 2021-12-13, https://youtu.be/Pwe2V891fL8)
- **Relevance:** high. Covers onboarding into habit, the "forever promise," subscription fatigue and pricing diagnosis.
- **Findings:**
  - Most people who cancel do so in the first two months. Optimise onboarding so new users adopt the habits of steady users. You can see the result in month one without waiting for long-term LTV. (Observed across clients.)
  - Treat the purchase as the starting line. Map the ongoing problem or goal and the moments where you can intervene, then add benefits along that journey. (Framework.)
  - The "forever promise": state the ongoing problem you solve and for whom, and keep improving delivery for as long as they pay. Subscription pricing is earned through trust. (Framework.)
  - Find super users by comparing highest-LTV customers with mediocre ones (onboarding path, lead source, signup season). Then market only to lookalikes and turn away poor-fit prospects. (Tactic.)
  - Subscription fatigue has three causes:
    - The product doesn't justify recurring payment.
    - Overwhelm or guilt from unused value (unread magazines, uncooked meal kits).
    - Hidden cancel buttons.
    Fix guilt by resetting expectations: reading one or two articles makes the subscription worth it, and throwing some produce away is fine. (Consulting experience.)
  - Pricing matters less than people think. If the users who cancel are the ones not using the product, it's a product problem, not a price problem. Many products are inelastic ("if I use it I'll pay $5-10"). (Opinion.)
  - "Party in a bar" diagnostic for low conversion: an awareness problem, an onboarding problem (can't find the food), a content problem (used it all up), or an operational problem. Fix these before cutting the price. (Framework.)
  - First price: go low for a land grab, or high and lower it as your understanding grows. Anywhere in the reasonable range works to start. (Opinion.)
- **Tactics:** Put the ten best and worst customers on a whiteboard and look for differences.
- **Caveats/contradictions:** The "price high and lower later" advice conflicts with Spotify-style low-price land grabs. She acknowledges both.
- **Quote:** "fix the problems before you drop the price"

## How To Not Screw Up Switching to Subscriptions (Matt Ronge, Astropad, 2022-01-05, https://youtu.be/Xjha8GsOFUM)
- **Relevance:** high. Covers trials versus upfront payment, migrating paid users, and the lifetime-plan debate.
- **Findings:**
  - A 14-day web trial with no card, where the app locked at expiry, got huge download volume but low paid conversion. Switching to a $30 upfront App Store purchase raised revenue "way up." Frictionless App Store buying mattered. (Observed. Pro creative tool, Mac/iPad.)
  - Charging on the Mac side for an iPad-first problem underperformed. Charge where the user feels the need. (Observed.)
  - Subscriptions plus a free trial made a roughly $100/year price possible. $30 upfront felt like the ceiling. (Observed.)
  - Migration: existing buyers kept what they paid for. New features went into a new subscription SKU (Astropad Studio), "the carrot not the stick." Existing customers got a code for 3 free months with no card. He wishes he had been more generous. Most subscription revenue came from new customers. (Observed.)
  - Lifetime-plan debate:
    - Ronge: with about 50% annual churn, LTV is about 2x the annual price, so a high one-time price might be fine.
    - David Barnard: lifetime buyers are your highest-intent, longest-retaining users, so average-based LTV undercharges them. Lifetime still helps as a price anchor and an off-ramp for people who refuse subscriptions.
    - Jacob: LTV tends to "find a level" whatever the packaging.
    (Opinion plus anecdotal data.)
- **Tactics:** Price high initially; you can always come down. Keep the existing paid app to protect cash flow during the switch.
- **Caveats/contradictions:** Astropad has no lifetime plan. Maintaining two binaries is painful.
- **Quote:** "don't take a lot of the stuff they've been using and all of a sudden put it behind subscription"
- **Other:** Apple's Sidecar feature copied the product and cut revenue for its display-hardware line (Luna Display) about 10x. They recovered by adding Windows support.

## Growth, Revenue, and Marketing Strategies (Lisa Kennelly, Fishbrain / ex-Clue, 2022-01-19, https://youtu.be/rxuZb-mZlRI)
- **Relevance:** medium. Covers monetising late, value framing against physical alternatives, and brand spend.
- **Findings:**
  - At Clue (period tracking, with about 200 competitors at the time), the strategy was growth first. When it came time to monetise, they tested $1/month, monthly/quarterly/annual plans, a Wikipedia-style donation model, and "membership" vs "subscription" naming, with contributing to science as the value. In hindsight she would have tested monetisation earlier to get the audience ready. (Observed.)
  - Free SEO content that drove traffic was later moved behind the paywall. (Tactic.)
  - Fishbrain positions Pro against physical gear ("a fish finder on your phone," where fish finders cost about $300). She thinks they could price more aggressively. Older users often say "I don't pay for apps" even when they pay for Netflix. (Observed. Fishing, older US male audience.)
  - Pick the success metric that matches the real usage rhythm (monthly for period tracking, weekly for Untappd) rather than forcing daily use. (Opinion.)
  - About 10% of the performance budget goes to awareness (radio, billboards) in Q1, before the season starts. It's hard to measure; anecdotally, most US anglers have heard the ad. (Observed.)
  - Pro subscribers spend more in the marketplace. Adding commerce was harder than expected, and most commerce revenue comes from the web, not the app. (Observed.)
- **Tactics:** Pro perks inside commerce (free shipping above $10 (?)). Testing ads for free users. A real customer joins the company all-hands for Q&A.
- **Caveats/contradictions:** Layering on revenue streams complicates LTV and the company's focus. The hosts advise early founders to avoid it.

## Batch-level patterns
- **Deliver the magic in the first session.** PhotoRoom moved the core effect to within a few taps. Shamanth reports 90%+ of trials start within 24 hours of install. Baxter says most churn happens in the first two months. Carvell says the store page sets an expectation the first session must meet.
- **Price elasticity tends to be flat.** AllTrails found $15 and $30/year about a wash on revenue. PhotoRoom: doubling the price halves payers. Jacob says LTV "finds a level" across packaging. Baxter says many products are inelastic. The consensus is to pick a reasonable price, leave room to discount, and not over-test early.
- **Annual is prized, but monthly has uses.** AllTrails refuses monthly because "annual is magic." PhotoRoom led with monthly to learn from churners. Astropad used a trial to justify a price about 3x higher than upfront. Lifetime plans are contested: useful as an anchor or off-ramp, possibly underpricing your best users.
- **When converting free users, add value; don't take it away.** Rapchat paywalled only new features and upgraded the free tier. Astropad used a new SKU with 3 free months for existing buyers. Widgetsmith paywalls only things with real costs. In every case, backlash came from moving existing value behind a wall.
- **Segment users by intent.** Rapchat's "why are you here?" question, Crowley's locals vs tourists, Baxter's super users and AllTrails' repositioning toward beginners all make the same point: blended averages hide the users who pay. Asking about intent early is a cheap way to find them.
- **Reminders and triggers drive retention.** Greg rebuilt around watering push reminders. Carvell's reach x relevance x frequency says relevant notifications tolerate high frequency. Consumers want more messages than developers assume.
- **Ask users directly before building dashboards.** McDonald's tests (PhotoRoom), reading every review (AllTrails), interviews first (Phiture) and whiteboarding ten customers (Baxter) all came before heavy analytics.
- **Organic loops at the moment of need.** Greg's QR cards in plant boxes, AllTrails' SEO, Rapchat's shareable videos and 1SE's New Year and TikTok spikes: the best channels meet users exactly when the problem appears.
- **A soft-paywall bias runs through this batch.** Widgetsmith, AllTrails, Rapchat and Fishbrain are all freemium, and several guests dislike asking for money first. This batch has no hard-paywall A/B evidence either way. That's a gap to fill from later episodes before concluding anything for a hard-paywall product.
