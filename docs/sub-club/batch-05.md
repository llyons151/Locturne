# Sub Club notes: batch 05

Episodes June to November 2024. Sources are auto-captions, so names and numbers may be off; uncertain figures are marked "(?)".

## From Corporate Web Developer to Full-Time Indie Hacker (Sebastian Röhl, HabitKit, 2024-06-26, https://youtu.be/RGUh3odS8wY)
- **Relevance:** medium. A solo indie habit-tracker founder: relevant for seasonality, ASO-led growth and underpricing, but there is almost nothing on onboarding or paywall design.
- **Findings:**
  - His first app (a fitness tracker) made about $100 in 6 months, with roughly 100 downloads in week 1 and about 10 a week after that. Adding features did not fix a distribution problem. (Observed data, indie.)
  - HabitKit was validated before launch: one tweet of the main screen (a habit grid of colored tiles) got about 800 likes. In its first month it earned more than the previous app did in 6 months, then ran at about $1.5k a month. (Anecdote.)
  - The inflection came from ranking top 5 for a large App Store and Google Play keyword, not from any change he made: "nothing changed for 3 months." (Observed.)
  - Habit apps are heavily seasonal. In 2023 he had about 120k downloads and about $51k in revenue. January and February 2024 alone brought about $60k, and March to May about $51k more, driven by New Year resolutions. (Observed data.)
  - He charges $0.99 a month, about $6 a year, or $15 lifetime. Jacob and David think this is badly underpriced and bet that doubling the price would about double revenue. Sebastian had kept postponing an increase "after the next feature." (Opinion, untested.)
  - The app collects no contact info (no email). The hosts advise an opt-in email list as a hedge against changes to the store algorithm. (Opinion.)
- **Tactics:** Time-box the experiment (12 months, with ramen profitability as the success bar). Ship an MVP in about 2 months. Build in public on X and LinkedIn as a second channel. Price test on iOS separately from Android, since Android users are more price-sensitive.
- **Caveats/contradictions:** The growth was luck, organic and algorithm-driven, and he had no causal explanation for it. He also receives Google Play reviews complaining that "$1 a month" is too much, which pulls against the advice to raise prices.
- **Quote:** "Keep doubling it until your haters folder gets too big." (Jacob, on pricing)

## Growing to $1M MRR with Paywall and Pricing Experiments (Francescu Santoni, Mojo, 2024-07-10, https://youtu.be/wlNbb4veyfM)
- **Relevance:** high. This is a direct paywall and pricing experimentation story from a video-creation app with over $1M MRR, 40M downloads and a team of 30.
- **Findings:**
  - Before Mojo, their AR app got a big "wow" effect, Apple featuring and hundreds of thousands of downloads, but no retention. They shut it down. Lesson: a gimmick that gets downloads is not product-market fit, and retention is the proxy that matters. (Anecdote.)
  - They charged from day zero to measure real interest ("a dollar is a dollar"). At the Product Hunt launch they set a 30-day trial at $10 a month (the founder first wanted $1) and hoped for one trial from an unknown country. They got about 30 trials on day zero, even with a glitchy app. (Anecdote.)
  - For years they had no paywall shown during onboarding; the paywall came only when users hit a limit. Apple's App Store team told them they weren't "pushing the paywall enough."
  - Their first big experiment, **putting the paywall at the end of onboarding**, generated what the guest says is still the majority of their trials today. The team had resisted it because users "hadn't tried the app yet," but the trial covered that concern. (A/B test, exact numbers not given.)
  - They ran experiments one quarter at a time, in priority order: (1) paywall position; (2) entirely different paywall concepts (video vs. simple, lots of text, scrolling, trial reminder, trial toggle), mixing the "silver bullets"; (3) localized paywalls per country (the US is only about a third of revenue); (4) smaller tweaks inside the winning paywall; (5) price tests.
  - Raising prices lifted ARPU by roughly +50% (?) overall. A recent test in Turkey, where inflation had eaten the local price, rolled out at +100% on price. (Test result, approximate.)
  - They charge more deliberately, to target prosumers and small businesses. Users and App Store reviews complain about $60-70 a year. One user said they should charge 10x because agencies build businesses on Mojo. (Observed and anecdote.)
  - Pushing the yearly plan simplified paid-UA payback. They aim for a 30-day payback on cohorts blended by country and platform, with no pLTV modeling. (Tactic.)
  - Organic virality came from the output: early animated Instagram stories made people DM "how did you do that?" They spent zero on ads until they were at several hundred thousand in revenue (monthly, per the captions (?)). Influencer campaigns in Brazil flopped on direct ROI, but Brazil became a top-3 to top-5 country weeks later. (Anecdote.)
  - They still haven't tested a weekly plan, tiers, or CRM. CRM is judged single-digit growth at high effort because no top-5 language covers more than two-thirds of users. (Opinion.)
- **Tactics:** Show the paywall at the end of onboarding, with a trial. Hire one dedicated monetization owner who logs every experiment in Notion. Use a paywall tool so non-engineers can iterate. Localize paywalls. Re-price by country for inflation. Default to yearly.
- **Caveats/contradictions:** He avoids multiple tiers because of complexity for customers, engineering and analytics, even though segmentation looks like the ideal. Price rises also increase churn among low-value users, so he is still unsure how to price for both prosumers and casual users.
- **Quote:** "If somebody isn't mad at you about your pricing, your pricing is wrong." (Jacob)

## News Corp's Data Strategy Can Teach Small Businesses (Taylor Wells, News Corp / ex-Disney+, 2024-07-24, https://youtu.be/ReoC3jQkXqk)
- **Relevance:** low. This is about data and analytics practice; there is no onboarding or paywall content.
- **Findings:** Indies should start with 10 to 20 logical events and a generic, keyed event schema; data has no value until someone acts on it. Disney+'s in-house event pipeline cost about $1k a day against about $33k a day for Adobe. Bluey was buried in the UI even though it had about 98-99% completion rates. The best "dashboard" is a smart person emailing three bullets a day. Most early Disney+ viewers were adults without kids, against expectations. (Anecdotes, opinion.)
- **Quote:** none.

## Marketing an Award-Winning Language App Through Offline Channels (Stephen, Babbel, 2024-08-07, https://youtu.be/bRQUlMpdDfI)
- **Relevance:** medium. Mostly offline ads, but it includes a clear argument for a hard paywall and a quiz-style onboarding.
- **Findings:**
  - Babbel runs a hard paywall with one free lesson. The guest argues freemium drops users into a suboptimal product and gives you no idea why they left. He says he has rarely bought an app through a free experience he wasn't already going to buy. (Opinion, language learning, broad and older audience.)
  - Their replacement for freemium is a "discovery stage," as in sales. A long registration and quiz asks many questions up front and pitches how Babbel fits the user's needs, "so by the end you feel compelled to buy without testing the app." (Tactic.)
  - Test for freemium: ask what your free base does for the business (ad revenue? sharing?). If it does nothing, consider a hard paywall. (Opinion.)
  - Babbel doesn't track DAU/MAU. It optimizes a proprietary "learner success" metric aligned with the user's goal, not with opens. (Opinion.)
  - Users who commit to the most premium or longest plans stick much longer "because there's money on the line." (Observed, directional.)
  - Web funnel: when someone sees a TV ad, there's roughly a 50/50 split between visiting the web and the app. The web quiz happens with zero commitment, before the "black box" of a download, and yields better data. (Observed.)
- **Tactics:** Buy national, broad radio and TV spots for cheap CPMs (cheaper than Meta, he claims). Measure with "how did you hear about us" answers, spike attribution after TV spots, incrementality tests and MMM.
- **Caveats/contradictions:** He concedes a hard paywall "may not be right for most apps." Offline channels suit broad, older, higher-income audiences.
- **Quote:** "I don't know if I've ever purchased an app through a free experience that I wasn't already going to purchase anyway."

## Understanding When to Use Web2App and How to Do It Well (Thomas Petit, independent consultant, 2024-08-21, https://youtu.be/SsFIj8IVJwI)
- **Relevance:** medium-high. Web funnels, quiz onboarding, win-back via cancel flows and audience expansion. Less about in-app paywalls.
- **Findings:**
  - Saving on fees is a bad reason to go web2app. Web checkout converts worse (no Apple trust, credit card entry vs. Face ID). Retention, refunds and involuntary churn differ, and you need dunning. The fee gap is real but smaller than "30% vs 3%" suggests. (Opinion, broad client experience.)
  - Better attribution is also oversold, since Safari cookie limits and web-to-app reconciliation are messy.
  - The real wins are these:
    - Audience expansion: Meta shows web-destination ads to different people. Reach can be 2M of a 20M (?) eligible audience over 6 months on app-install ads alone, and running both campaign types raises total reach.
    - Channel access: Google Search with separate brand/competitor/generic messaging, YouTube with device targeting, Taboola/Outbrain, Pinterest, Reddit.
    - A "warm-up" before high-friction steps.
  - Ladder (fitness), via David: by about question 6 of a web survey they can predict how likely a user is to pay, and they send that signal back to Meta and TikTok early. Most revenue is still charged in-app on iOS. The leverage is early signal quality, not fees. (Anecdote.)
  - Only two levers matter in paid UA: better creative, and sending better, earlier quality signals. There are "no hacks" in campaign structure.
  - About 70% of subscriptions (trials) start on day 0 for his subscription clients, so SKAN's 24-hour window wasn't fatal. Gaming companies redesigned their day 0 to produce propensity signals. (Observed.)
  - For hard-to-sell or intimidating products (a premium couples-therapy app, finance), start with a soft, fun web mini-game or quiz, then lead into the serious product. Brain training used "what's your IQ?" quizzes. Charging on the web there would be counterproductive; it's about warming users up. (Anecdote.)
  - Fitness (Noom) can run about 50 onboarding screens because intent is high. The same length would fail for an instant-value app like Photoroom. (Opinion.)
  - Owning the transaction enabled a cancel-flow counter-offer: "we refund half of what you paid and you keep the subscription." A "massive" share of would-be churners took it, retention on that segment was decent, and users left with a good impression. This isn't possible with IAP. (Anecdote, numbers not given.)
  - B2B and prosumer teams need invoices and company billing, which IAP can't provide. That is a legitimate reason to go web.
- **Tactics:** Match the web flow to ad context (Blinkist sends Outbrain traffic to article-like pages and Facebook traffic to a different flow). Use different creative and CTA for web campaigns. Send brand-search and big-discount traffic to web checkout, since high intent tolerates the friction.
- **Caveats/contradictions:** Everything is "it depends." Never go 100% web or 100% app. He calls tricky unsubscribe flows terrible and soon illegal, while defending the refund offer as a win-win.
- **Quote:** "The hack is sending better signals early of differentiating quality."

## Marketing Your App More Efficiently with Apple Search Ads (Dilip Reddy, Search Ads Optimization, 2024-09-04, https://youtu.be/86etr70XVJU)
- **Relevance:** low. Almost all of this is Apple Search Ads mechanics.
- **Findings:**
  - On ASA: bid low on your brand keywords and watch impression share, because Apple favors the relevant app. Report brand ROAS separately from generic. Start new countries with deliberately low bids. Lower weak keywords rather than deleting them, and use negatives only when certain. Blend ROAS with absolute revenue.
  - Two non-ASA points:
    - Judge payback on a longer horizon. Some teams target 100% ROAS by the 365-day renewal.
    - David still retains about 20% of his first-month subscribers after 7 years. (Anecdote.)
  - A theory, flagged as a "conspiracy theory": running ASA on a keyword may lift organic rank for that keyword.
- **Quote:** none.

## The Advantages of Working On an App You Care About (Christian Selig, Apollo, 2024-09-18, https://youtu.be/Zutp27WEYd0)
- **Relevance:** low-medium. It covers indie pricing anecdotes and community feedback. The captions are a poor machine translation, so details are uncertain.
- **Findings:**
  - Apollo launched with a one-time $2.99 (?) purchase and had immediate revenue from pent-up beta demand.
  - It later moved to subscriptions: roughly $19.99 (?) lifetime, about $10 (?) a year. He raised prices to about $30-40 (?) and saw "basically no change" in uptake. That suggests large unmet willingness to pay. (Anecdote.)
  - The subreddit acted as a constant feedback loop and "north star." Explaining why he declined popular requests was received well. (Anecdote.)
  - Reddit's API pricing (about $20M (?) a year for Apollo) killed the app. The 30-day notice and grandfathered fixed-price subscribers made re-pricing impossible. (Anecdote.)
  - Juno (a YouTube app for Vision Pro) sells for $5 upfront and still makes about $100 a day at times (?).
- **Quote:** none.

## The Subscription App Industry Rebound (Eric Crowley, GP Bullhound, 2024-10-02, https://youtu.be/z8gqzjefXmk)
- **Relevance:** low-medium. Mostly investment and M&A, with useful framing on retention and net revenue retention.
- **Findings:**
  - Consumer subscription cohorts flatten after the "tourists" churn. His example: 100 users become 50 after year 1, then 45, 43, 42. After that, NRR grows through planned price increases every roughly 2 years (Netflix, Amazon Prime, Hulu), family plans, upsells and higher tiers. (Framework.)
  - Price increases work if you explain them ("here's why, here's what you get"). Best-of-breed apps keep their users. Hiding increases creates a desire to punish the company. (Opinion.)
  - Flo: freemium with over 60M MAU. It enters users' lives early (ages 15-17) and adds paid modules across life stages, so each module converts a few percent. It has over 50% organic users and word of mouth from mothers to daughters. (Observed.)
  - "Maslow's hierarchy of subscription": tie the product to identity or passion for retention. Add community features for belonging, leaderboards for esteem (Tractive dog-walk leaderboards), and fresh content for self-actualization. (Framework.)
  - Sherlocking: Apple ships features broad and shallow, and deep vertical apps keep their paying users.
  - Other: the Rule of 40 and "Rule of X," an M&A and aggregator exit market, and a forecast of more web subscription offers.
- **Quote:** none.

## How to Reduce Churn and Boost Growth with Fast, Empathetic Customer Support (Eli Winderbaum, Captions, 2024-10-16, https://youtu.be/XVfcICd2jok)
- **Relevance:** medium. Support as retention, a trial-length data point, and paywall copy ideas. AI video app with about 70 staff.
- **Findings:**
  - Captions runs a **3-day trial**. They tested 7-day and it performed worse for them, contrary to RevenueCat's report that 7-day trials do better. (A/B test, no numbers.)
  - They have no permanently free tier; everyone is a trial user or a paid subscriber. Good/better/best tiers let support upsell.
  - Time to first response is 58 seconds, using an AI agent (Parahelp) plus 24/7 follow-the-sun human staff. A competitor replying in 48 hours loses the user. (Observed.)
  - Contact rate is about 3% of subscribers a month, which he considers healthy. Watch for swings, such as a bad release or a promotion that support wasn't told about. (Observed.)
  - Suggested, untested: change "support" to "24/7 support" on the paywall and see if checkout conversion lifts. (Hypothesis.)
  - People who cancelled a trial or churned are bumped to the front of the support queue as a win-back touch. He is looking at Apple's new App Store win-back offers. (Tactic.)
  - Localization matters: launching the website in Portuguese produced a "huge lift" in Brazil installs. (Observed, no number.)
  - An in-app "since you last logged in, here's what changed" message, tailored to how long the user was away, is suggested for feature discovery and re-engagement. Many long-term users never find half the features. (Idea.)
  - Ask for an App Store review after every good support interaction.
- **Tactics:** Pipe RevenueCat entitlement, expiry and auto-renew status into Intercom so agents know if the user is in a trial, cancelled or paying. Hire power users from Discord as support staff. Route Discord support into in-app chat once you scale.
- **Caveats/contradictions:** 24/7 support is a promise you must keep once you market it. The 3-day trial beating 7-day may be specific to an instant-value AI video app.
- **Quote:** "Sales gets the party, support gets the hangover."

## Drive Revenue and Retention (Ryan Beck, Pray.com, 2024-10-30, https://youtu.be/un0t53BDKXs)
- **Relevance:** medium-high. A faith app for an older demographic, with lessons on onboarding friction, paywall placement, quizzes and reaction to monetization.
- **Findings:**
  - They pivoted from a church social network (strong retention, but growth depended on in-person sales) to subscription content in 2019. Morning, noon and night prayers grew out of pastors' daily posts. (Anecdote.)
  - "Imitate, iterate, innovate": they copied proven Calm and Headspace formats (bedtime Bible stories, sleep Psalms, meditative prayer) to set benchmarks before innovating. (Tactic.)
  - They rebuilt the platform so onboarding flows and paywalls are server-driven and can be tested without app releases. (Tactic.)
  - **Requiring a phone number in onboarding**, left over from the social network, caused so much drop-off that they couldn't monetize. Removing it helped. (Observed; no numbers.)
  - Paywall placement: putting it first can raise initial conversion but hurt long-tail LTV. You have to judge by downstream metrics. (Opinion.)
  - A light quiz funnel in onboarding personalizes the faith journey. He cites Noom as a heavy example; Pray.com's is light. (Tactic.)
  - Older users have higher LTV but are harder to convert. TV worked well for them before and during the pandemic because they trust "as seen on TV." (Observed.)
  - Some users think faith content should be free. They keep a free tier and respond personally to every review; the CEO takes calls. (Tactic.)
  - One creative carried most of a Meta spend of tens of thousands of dollars a day. Meta pulled it without warning in January and CAC blew up. Keep any single creative at 30% or less of spend at most. (Anecdote.)
  - Revenue is the north star. Duolingo-style layering of subscription, then ads, then one-time purchases. (Opinion.)
- **Tactics:** Pull creative inspiration from gaming and dating apps. Keep one shared roadmap for growth and engineering. For TV, spread about 50% of spend widely so volatile prime-time slots don't dominate.
- **Caveats/contradictions:** He argues against paywall-first on LTV grounds, which conflicts with the Mojo and Babbel results in this batch. Guests seem to agree that placement has to be tested against long-term retention, not just trial starts.
- **Quote:** "Nobody complains about the price of something they don't want." (Jacob)

## How to Go Viral on TikTok (and Profit From It) (Joseph Choi, Viral App Founders, 2024-11-13, https://youtu.be/Woz2m8b8wno)
- **Relevance:** medium for the founder (who does short-form video), low for onboarding and paywalls.
- **Findings:**
  - About 95% of For You watch time goes to accounts you don't follow, so a zero-follower account can go viral. Test for a video: would a viewer share it (funny, controversial, or wow)? Put the product plug past the 50% watch-time mark. Use CTAs framed as lists or stories ("top 5 apps I use for…", a slideshow of "5 controversial rules at our wedding" with the POV app as rule 4, or "am I the only one who saw…"). Health, wealth and relationships sell.
  - Build one "viral hook" feature, such as a daily anxiety graph, as a funnel into the full app. Spotify-Wrapped clones for a niche go viral every year.
  - Validate with a waitlist before building: Breezy got about 5,000 signups from a 15-second video.
  - Creator deals: pick charismatic creators with under 50k followers who have had 1-2 viral hits. Have them post daily on a new branded account for $500-3,000 a month plus about $1,000 per million views (about $1 CPM). One founder reached $20k MRR from a single $3k-a-month creator.
- **Quote:** none.

## How V1 Sports Doubled Revenue with Bold Bets (Alex Prasad, V1 Sports, 2024-11-27, https://youtu.be/GiZ_xBcAMVs)
- **Relevance:** high. A freemium-to-trial switch on an existing user base, onboarding "why are you here" segmentation, pricing philosophy, and how to communicate a move of free features behind a paywall.
- **Findings:**
  - The company is a golf swing video analysis app that is 20-30 years old and has a B2B coach side (about 30% North American coach market share, high-80s% retention) plus a consumer side that had plateaued.
  - They **switched consumer from freemium to a free trial.** The freemium line (basic vs. advanced drawing tools) was "too thin a hair to split." Result: about 80-90% revenue growth in 12 months. (Observed.)
  - The cost was a wave of one-star reviews from users who had had features free for 9 years. They judged that "for every 4 that complain, 10 will subscribe," and say that is roughly what happened. (Anecdote.)
  - Free access stayed wherever a coach invited the student. That channel brings about a third of new registrations daily and was treated as untouchable. The other three-quarters of sign-ups hit the trial. (Tactic.)
  - Communication lesson: in a multi-point message, users hear only the first point. Explain the change honestly ("by subscribing we can deliver a better product") rather than raising prices silently. Nuance won't be credited, so don't spend weeks polishing the fifth email. (Opinion.)
  - "Positive friction": they added a "why are you here?" question to onboarding. About 10-15% of new registrations, hundreds a week, wanted to *find a coach*, a job the app wasn't serving. Those users are much more likely to subscribe. (Observed.)
  - Ask for the user's "measure of success" in onboarding, as B2B customer success does. Fringe users may drop, but they weren't ideal customers. (Opinion.)
  - Fewer, better customers beat "zombie" subscribers who forgot they pay. The average monthly active user spends 21 minutes a month in the app. (Observed.)
  - Pricing is about $70-80 (?) a year. He deliberately doesn't maximize the first price because repeat business and expansion revenue matter more. He calls maximizing it "commission breath." (Opinion.)
  - The core technology (video analysis) is commoditized. Differentiation comes from the coach marketplace and from outperforming competitors on execution. (Opinion.)
- **Tactics:** War-game an imaginary face-to-face conversation with the angry user ("would you do this in a real shop?") before shipping a change. Treat onboarding like a clerk greeting someone in a golf-improvement store: ask why they came, then show a "menu" of other options. Do unscalable manual experiments first and scale the winners.
- **Caveats/contradictions:** He is explicit that these are "experience shares, not advice." David, facing the same decision for his weather app, chose not to force existing free users onto the trial. Keeping the first price low contradicts the "raise your price" advice in other episodes.
- **Quote:** "When we communicate a nuanced message with three points, the first point is heard and the other two aren't."

## Batch-level patterns
- **Underpricing is the most common mistake:** HabitKit at $6 a year, Apollo raising prices with no drop in uptake, Mojo getting about +50% ARPU (?) from price rises and +100% in Turkey. The hosts repeat that some price complaints mean you're priced right. V1 Sports is the counterpoint: keep the entry price moderate when LTV comes from expansion.
- **A paywall in or at the end of onboarding, with a trial, drives most trial starts.** At Mojo it was their single biggest experiment. Pray.com warns that paywall-first can hurt long-tail LTV, so judge placement on downstream retention, not initial conversion.
- **Question-based onboarding does double duty: it personalizes and it qualifies.** Babbel's discovery quiz sells before the paywall, Ladder's question 6 predicts who will pay, Pray.com runs a light faith quiz, and V1's "why are you here?" found a 10-15% segment with high intent to subscribe. Friction that filters is acceptable.
- **Hard paywalls or trials beat freemium when the free tier does nothing for the business.** Babbel (hard paywall) and V1 (freemium to trial, about +80-90% revenue) both argue this. Freemium only earns its place if free users produce ads, virality or a pipeline (Flo, V1's coach-invited students).
- **Trial length is app-specific.** Captions found 3-day beat 7-day. Mojo used 30 days at launch to avoid accidental charges. Thomas Petit notes about 70% of trials start on day 0.
- **Removing one onboarding field can matter more than any paywall tweak.** Pray.com's required phone number blocked monetization.
- **Retention beats downloads as the real signal.** Mojo's AR app had a wow effect and was featured by Apple but had no retention. Cohorts flatten once the "tourists" leave, and identity or passion (Maslow framing) keeps the "locals."
- **Win-back and retention touches in this batch:** cancel-flow counter-offers with web billing, support priority for users who cancelled a trial, App Store win-back offers, "what changed since you left" messages, explained (not silent) price increases, and review requests after good support.
- **Organic distribution depends on seasonality and shareable output.** Habit apps spike in January. Mojo's animated stories and TikTok "viral hook" features show that output people share matters more than referral mechanics.
