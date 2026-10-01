# Sub Club notes: batch 10

17 episodes, 2026-04-30 to 2026-09-22. Transcripts are auto-captions. Names and numbers may be wrong, and uncertain figures are marked "(?)".

## How Duolingo Built a $1BN/Year "Free" App, tl;dr (Cem Kansu, Duolingo, 2026-04-30, https://youtu.be/rvoPibwyPZs)
- **Relevance:** medium. It covers CTA copy test results and the "premium trap" warning, but it's a short recap episode.
- **Findings:**
  - Paywall CTA copy, from Duolingo A/B tests (freemium language learning, mass-market): "Subscribe" was the baseline. "Start my free trial" was a big lift, "Try for free" beat that, and "Try for $0.00" was best and is (he thinks) live now. Evidence: A/B tests, described without figures. He reads it as the explicit zero making "this tap costs nothing" land emotionally.
  - The "premium trap": moving free features behind the paywall turns metrics green for 6–12 months, then stops working and leaves room for a free competitor. This is opinion backed by their experience.
  - Quantify negative feedback before acting on it. In 2016, complaints that Duolingo lacked Finnish were about 3x the complaints about ads, so they shipped ads. Evidence: an internal analysis.
  - Users begged for on-demand human tutors, Duolingo built it, and almost nobody used it because live speaking to a stranger was too scary. Don't take feature requests at face value. Evidence: anecdote.
- **Tactics:** They ran hundreds of A/B tests on small copy changes. They'll accept a losing experiment when it serves the long-term strategy ("take the long view").
- **Caveats/contradictions:** A later guest (Solid Starts episode, below) asks whether "Try for $0.00" is black-hat when the product auto-renews. Its clarity depends on the rest of the paywall.
- **Quote:** "If you only always go by positive revenue metrics, you will burn yourself to the ground."

## Protecting Freemium at 100M Users AND Driving $500M Revenue (Giordano Contestabile, Life360, 2026-05-13, https://youtu.be/hPwt12zZMCY)
- **Relevance:** medium. The monetization at scale, first-7-day activation and ML paywall targeting all transfer. Freemium only makes sense because of Life360's network effects.
- **Findings:**
  - Scale: about 100M MAU, about 3M subscribers, about 4 people per paid subscription (so about 12% of MAU benefit), close to $500M annual revenue.
  - The top reason people give for not subscribing is "the free tier is good enough." Their answer is to add paid value and diversify tiers, not to degrade the free tier.
  - Cutting free location history from 2 days to 6 or 12 hours doubled subscribers "from the hook." They didn't ship it because it would hurt free users and safety. Evidence: an A/B test they deliberately left unshipped.
  - Hard paywalls make sense for high-conviction, non-social apps with no network effects. Freemium makes sense when the free base is the moat and drives virality (parents telling parents). This is opinion.
  - They keep an onboarding paywall anyway. It adds one screen of friction, and removing it would cut a significant number of new subscribers.
  - First 7 days: creating or joining a circle and inviting others is strongly correlated with day-7 retention, and day-7 retention with retention a year later. Evidence: observed data.
  - Mid-boarding nudges are personalized. On day 2, if you haven't used location history, the prompt names a circle member: "What was John up to yesterday?"
  - Banners, pushes and emails become noise. A cute animated dog on app open ("peekaboo", tap to pet) drove strong adoption of the pet profile feature. Evidence: observed, no figure given.
  - They have three tiers (silver, gold, platinum). Most people pick gold. An ML model using about 900 data points showed platinum on the paywall to high-propensity users. That doubled the share of new users choosing platinum with no loss of gold subscribers. Evidence: an experiment.
  - Circles of 3–4 people convert and retain much better than smaller or larger ones. A major churn cause is kids leaving for college. Pets and trackers extend the lifecycle.
  - In-app referral and gifting mechanics failed "across the board": parents aren't viral, even though about 40% of users say someone told them about the app. Evidence: repeated failed tests.
  - The only experiments they count as failures are inconclusive ones. Losses get segmented to find sub-audiences where the idea worked.
- **Tactics:** New features start free unless they cost real money to provide (e.g. roadside assistance). Premium is built as a new layer on top, not as an artificial gate. They ran a "freemium bill of rights" of things never to take from free users. They bundle a free Tile with some subscriptions.
- **Caveats/contradictions:** He acknowledges the RevenueCat stat that hard paywalls convert about 5x better than freemium. His view is that it doesn't apply at their scale or to apps with network effects.
- **Quote:** "Every feature that provides value to a user should be great in the free version."

## How Coconote hit $6.7M ARR Without Spending a Dollar on Ads, tl;dr (Brett and Zach, Coconote, 2026-05-20, https://youtu.be/rskuoYgoQzs)
- **Relevance:** high. It has concrete onboarding, login placement, pricing and trial-cancel-flow results.
- **Findings:**
  - They charged (via a free trial) from day one of launch. Revenue was the momentum that funded growth.
  - Price: launched at $99.99/yr to college students. Testing $129 produced more users and more revenue, and $129 has held since. Evidence: a price test. They think premium pricing signals reliability, which matters when users trust the app with lecture notes before an exam.
  - Roughly doubling onboarding to about 15 screens, with personalization and social proof, raised trial starts 16%. Evidence: A/B test. They describe "long onboarding into a hard paywall, trial in the first session" as the current meta, and say it works.
  - A login screen at the very start caused about 10% drop-off. Moving login to after the paywall, at the end of onboarding, was "the biggest win." Apple/Google accounts mean no account is needed to buy.
  - The trial cancellation flow tested discount (about 30% off), a 3-month pause (students leaving for summer) and a 7-day trial extension ("do you need more time?"). The extension won "by far." Overall about 25% of would-be cancellers were retained. Evidence: tests.
  - A 41M-view viral video drove almost no revenue because it framed the product as a toy. Problem/solution and identity content converts.
  - They asked customers how they'd describe the app. The consistent answer, "never miss a key detail," became the first App Store screenshot.
- **Tactics:** Save retention offers for trial cancellers. Offer more time before a discount. Use user phrasing for store copy. Recruit small creators (5–10K followers, a Gmail in the bio) over agency-repped influencers.
- **Caveats/contradictions:** The host notes the median trial-to-paid conversion is about 31% (RevenueCat report). Numbers are summarized by the host rather than shown in detail.
- **Quote:** "Login can wait. Value comes first." (host's paraphrase)

## How Removing the Free Trial Grew Monthly Subs 2000% (Nancy Anderson, Natal, 2026-05-27, https://youtu.be/gqN6Z5WAeiI)
- **Relevance:** high. It covers trust-before-paywall, removing the trial on monthly, onboarding length, and first-day activation via human outreach.
- **Findings:**
  - Natal is a pre- and postnatal fitness app for women, at about $25/month. Reported metrics: 93% of people who reach web checkout download the app, 68% trial-to-paid (industry average about 38% per her), and 17% download-to-trial (health and fitness average about 6% per her). Evidence: observed. She attributes this to trust built before the paywall, not to paywall design.
  - Biggest win of the year, copied from a Zumba episode: removing the free trial from the monthly option only. Monthly subs rose about 2,000%, quarterly about 46% and annual about 21%. Evidence: an experiment, now permanent. Her read is that warm, trusting users don't need a trial.
  - Onboarding is short on purpose, about 10–15 questions. Too many questions and users get frustrated and quit. Too few and they're confused about where to start. The first question (trying to conceive, pregnant, postpartum, never had a baby) filters about 50 programs down to about 15.
  - Biggest fail: building too many programs, which caused decision fatigue. Users who can't pick a starting program don't activate. They now route users to a recommended starting program.
  - A human-reviewed posture assessment for postpartum users leads 68–70% of those who finish it to complete a first workout. Evidence: observed.
  - A real coach DMs every new user on arrival. Users who engage with the in-app community return at 31% on day 2 and 14% on day 3 (these figures read as low for "better" retention, so treat them as uncertain (?)).
  - Every DM, comment and email across platforms gets a human reply within 24 hours, and has for 8 years. She believes this pre-paywall trust is the growth lever.
  - HSA payments via Flex, launched unannounced, brought in "tens of thousands" of revenue in two weeks. A trial is offered only on the annual plan for HSA.
  - Merging 4 separate apps into one ecosystem let them lower the price. Multiple apps confused users.
- **Tactics:** Soft-sell content only. Founder-led social. Coaches make content instead of hired UGC. No lead magnets or free workouts, because she thinks they attract the wrong audience. They added a few onboarding slides to route users better.
- **Caveats/contradictions:** She admits she can't A/B test trust, and data-driven colleagues push back. Removing the trial worked for a very warm, founder-led audience. The BuiltWithScience episode (below) found a no-trial toggle hurt, even with warm traffic.
- **Quote:** "The hack is build trust."

## How Life360 Thinks About Freemium vs. Hard Paywall (Giordano Contestabile, Life360, 2026-05-30, https://youtu.be/08MBmONP89w)
- **Relevance:** low. This is a clip of the 2026-05-13 episode.
- **Findings:** Same freemium points as above: the free tier is "good enough" and they won't degrade it, cutting location history to 6–12 hours doubled subscribers but wasn't shipped, and the onboarding paywall stays. See the full episode notes.

## Why Natal Converts 68% of Trials to Paid (Nancy Anderson, Natal, 2026-06-08, https://youtu.be/rdLCU3Q4hb8)
- **Relevance:** low. This is a clip of the 2026-05-27 episode.
- **Findings:** Same numbers as above: 93% checkout-to-download, 68% trial-to-paid vs about 38%, 17% download-to-trial vs about 6%. Adds the host's line that "your paywall is only as good as the story leading up to it," and that the story starts at the ad or the TikTok.

## How Simply Finally Cracked Facebook Ads with Web Funnels (Yoav Sharon, Simply, 2026-06-24, https://youtu.be/Xv04J1cr16Q)
- **Relevance:** high. It covers the aha moment in FTUE, soft paywall pitfalls, monthly vs annual, and the Japan paywall localization result.
- **Findings:**
  - Simply Draw added AI that animates the drawing a kid just finished during the first-time user experience. Kids ran to show their parents, and parents saw "positive screen time." It "really increased" conversion. Evidence: experiment, no figure given. Here the aha moment was aimed at the payer (the parent), not the user.
  - Biggest fail: a soft paywall at the end of Simply Piano onboarding won big on ARPU for months. They later found many of those subscribers only used touch-screen courses and had no keyboard, so they got no real value from a year's subscription. Segmenting showed kids did find value, so the soft paywall now appears only on accounts with a kid profile.
  - About 20% of revenue now comes from web funnels. Web flows let them bridge "lean-back" Facebook scrollers through consideration before the install. That made Facebook work for them for the first time, especially with older users. They advise against copying the App Store flow to the web.
  - Monthly plans beat annual on LTV in their mature apps. It only works once monthly renewal and retention are strong enough. Monthly also gives a fast feedback loop from usage gains to revenue. Annual discounts vary, sometimes 60% or more and up to 70–75% (?).
  - They tested weekly plans in some apps and don't offer them. Learning a skill takes time, and a weekly "are you sure you want to pay?" moment works against that.
  - Multi-app, multi-profile family accounts retain best of any segment "by far." A family plan with up to 5 profiles spreads usage across household members.
  - Japan localization: every metric rose except paywall conversion, which fell. A Japanese country manager told them Japanese users want a long, detailed paywall (company story, founders, values, lots of testimonials, lots of color). A long scrolling one-pager made conversion "skyrocket." Evidence: an experiment, no figure given.
  - They localized pricing with a custom purchasing-power index (Big Mac style) across all regions and saw a "dramatic" ARPU increase in most.
- **Tactics:** Sometimes they use a soft paywall first, sometimes they wait for users to feel value. They test it per app and per maturity. Cross-promotion between apps only happens where it adds user value (e.g. a "sing this song" indicator in Piano).
- **Caveats/contradictions:** The monthly-over-annual result goes against the common push to annual. It depends on strong retention, and they still offer both.
- **Quote:** "Growth would be easier if we could impact users during awareness and consideration phases without hurting their privacy." (lightly paraphrased)

## The 5 Biggest Meta Ads Mistakes Apps Make (Marcus Burke, 2026-06-26, https://youtu.be/G4cahCIrIgY)
- **Relevance:** low. It's about ads.
- Ads only: don't optimize for installs or cheap trials, because the signal is messy. Test creatives in relevant audiences (Canada at about 50% cheaper CPMs, or tier-3 regions) and check that winners transfer. Diversify away from UGC-only. Give each hero ad its own ad set.

## How We Grew Our App to $1M ARR with Zero Paid Ads (Coconote, 2026-07-07, https://youtu.be/VJvUpeZhSwU)
- **Relevance:** low. It's growth via creators.
- Clip: $100K ARR in 45 days, $1M in 4 months, $2M in 5 months. They tried about 30 creators in 2 months, and 3 made a big difference. They keep a small, hands-on creator team. Toy framing gets views but no payers, and problem/solution framing brings in users who pay more.

## The Bootstrapper's Path to $10M ARR Without Venture Capital (Andrew Maguire, Volo Ventures, 2026-07-08, https://youtu.be/1R1_ZbmLyJI)
- **Relevance:** low. It's about venture and fundraising.
- Fundraising/AI: product taste is the new bottleneck, not engineering. VC fits network-effect or utility businesses with low churn. Bootstrapped niche apps can reach $10M ARR. One side note is relevant: onboarding prompts for ratings inflate star averages, so star ratings are a weak quality signal.

## Make Ugly Ads to Grow Your App (Yuliya Lennox, BetterMe/Replika/Solid Starts, 2026-07-22, https://youtu.be/jzlPf100vy4)
- **Relevance:** medium. It's mostly ads, but it has a pointed ethics section on web-quiz funnels and dark patterns.
- **Findings:**
  - "Black hat" web-quiz growth is ending. Showing only a price per day, hiding the full price, and $1 plans followed by upsells users click through without reading have brought regulator attention and hurt the whole category. This is opinion.
  - Host anecdote: his wife did a long diet-app quiz ("60 questions in, sunk cost"), paid $1 for a plan, then kept tapping "continue" through upsells and was charged about $350–400. Support refused a refund and they recovered about half. It's a concrete example of sunk cost plus fine print turning into refund and chargeback risk.
  - Host questions whether Duolingo's "Try for $0.00" CTA is clear enough about the auto-renew.
  - Validate demand with marketing before building (sell a PDF or idea, then refund).
- **Tactics:** Ads only: make "ugly," pattern-breaking creative, test cheaply in countries like Indonesia, and localize.
- **Caveats/contradictions:** She is anti-brand ("nobody cares about your brand"), but a baby-feeding ad with AI fruit babies drew trust complaints at Solid Starts. Brand matters in trust-sensitive categories. The Savvy Navvy episode argues the opposite.
- **Quote:** "Sometimes your feed is so pretty that you need something ugly to take your attention from it."

## He left Google to build the Google Maps for boats (Jelte Liebrand, Savvy Navvy, 2026-08-05, https://youtu.be/sKonOtcJFTU)
- **Relevance:** medium. It has the two-year plan, the anonymous-accounts failure, and trust via partners.
- **Findings:**
  - Biggest win: a 2-year subscription, possible because of US web payments. It's $183 vs $129/yr, about 30% off. Lifetime revenue per user is about the same, but the cash arrives upfront, which transformed CAC payback and let them spend more on marketing. Evidence: observed.
  - Biggest fail: "anonymous accounts," which skipped signup to cut onboarding friction. The initial test results were "through the roof," then decayed after rollout to 100%. Users wanted accounts to sync across phone and iPad, support load spiked, and the early numbers were partly a metrics issue in the test region. Evidence: test, then rollout.
  - A/B testing is easy to misread at startup sample sizes, and a local metric can move while the funnel below it doesn't.
  - Endorsement by credible third parties (boat manufacturers, sailing instructors, chandleries) works as trust and validation. Instructors get the app free, their students get a discount, and no kickbacks are paid.
  - They run freemium in the US and a different model elsewhere (details not given). Boat bundles include 12 months free or an extended trial.
- **Tactics:** QR codes in physical shops. Instructors act as beta testers. They send no email marketing (the founder killed it).
- **Caveats/contradictions:** His anonymous-account failure conflicts with Coconote's login-after-paywall win. The difference is that Savvy Navvy removed accounts entirely, while Coconote only deferred login. Other topics: equity crowdfunding (first target £125K (?), raised about £370K (?)), with later rounds about £1M (?).
- **Quote:** "If you're trusting my life on the water... you bet your bottom that I want to know that this brand is good." (lightly trimmed)

## $10M ARR without ever testing a paywall (Luke Martin-Fuller, Visible, 2026-08-19, https://youtu.be/DnzG2OvRflI)
- **Relevance:** medium. It argues for product first and for qualifying users, with some web funnel details.
- **Findings:**
  - Visible is a hardware-attached wearable for chronic-illness pacing. It went from $1M to $10M ARR in 2 years with one paid channel (Meta), no lifecycle emails, no paywall tests and no price tests. It was cash-flow positive throughout. About 50% of acquisition is word of mouth.
  - Pricing: about $80 for the band at cost (no hardware margin), then $20/month or $14.99/month billed annually.
  - They sell only through a web funnel with a quiz. The quiz deliberately screens out people it won't help. The host argues the wrong payers hurt reviews, retention and product signals. Median time from landing to purchase is 10 days (a high-consideration purchase).
  - There's no free trial because hardware can't be trialed. They de-risk with a free app (no wearable) that shows the product's quality and brings in a big share of customers through word of mouth.
  - They built a free app for a year with 100 early users in a Facebook group before charging. It reached about 50K users through word of mouth.
  - Paid "community voices" program: members audition, get weekly briefs, and receive a flat fee for any video used in ads. They test on small budgets and scale one or two a week.
  - Features ship first to an early-access group. An AI natural-language data feature was hated there and pulled before general release. Users with brain fog resist change.
- **Tactics:** Qualify in the quiz. Share anonymized data with researchers (with opt-in consent), which builds trust. They didn't announce their Series A because consumers don't care.
- **Caveats/contradictions:** They admit big optimization gains are left on the table. It's not a recommendation to skip testing, just to sequence product first.
- **Quote:** "If the product isn't real, you just got like 60 pages of onboarding... you're just a paywall wrapper." (host)

## Why 90% of their paid traffic goes to a quiz, not the App Store (Ethan Ethier, Built With Science, 2026-09-02, https://youtu.be/EyoYQU6JyV8)
- **Relevance:** high. It covers the annual-first paywall with a trial timeline, a no-trial toggle test, a buddy add-on and web quizzes.
- **Findings:**
  - Fitness app from a 7M-subscriber YouTube channel. Price is $189/yr or $30/mo, positioned as "a personal trainer in your pocket," not a tracker, which they say supports premium pricing.
  - Trial-to-paid is 35–40% for organic YouTube traffic and about 25% for Meta. Evidence: observed.
  - Biggest win: a paywall redesign that shows only the annual plan up front (monthly behind a "view all plans" link) with a Blinkist-style trial timeline. Day 1: your personalized plan. Day 7: the plan adapts. Day 12: we remind you before the trial ends, and you can cancel any time. The annual share went from about 60% to 75–85% with no price change. Evidence: A/B test. They credit lower perceived risk and fewer choices.
  - Biggest fail: adding more explanatory context to a pricing page to clarify value lowered conversion. At the purchase moment, extra content overwhelms people who are already motivated. Evidence: A/B test.
  - They tested a no-trial toggle (pay now for 20% off plus a 30-day money-back guarantee, or a 14-day free trial). The first version was negative even with warm traffic. Their hypothesis was that the copy framed the trial as the worse deal. A new arm that frames both options as good is showing "a very strong lift." Evidence: A/B test in progress.
  - Gym buddy add-on: the quiz asks whether you want to add a buddy, both people get 15% off, and there's a small toggle on the paywall for those who declined. About 15% of trial starters add a buddy. It raises AOV and retention. Evidence: observed.
  - About 90% of paid traffic goes to a long personalized web quiz rather than the App Store. The quiz converts much better, and quiz answers build the in-app plan. The same quiz in the iOS app converted worse. On Android the in-app quiz matched the web.
  - Clickbait ads that got cheap trials showed sharp drops in trial-to-paid.
  - Tools like calorie and macro calculators rank in AI search and convert better than blog posts, feeding into the quiz.
  - "Quiet launches": ship features without announcing them so engagement metrics aren't inflated, and announce only once there's signal. A 100-person core beta group and about 1,000 wider beta testers see features first.
- **Tactics:** They list problems before solutions for each funnel step, document every test, and iterate on losers (about 70% of tests fail on the first try). They test big swings over granular tweaks because traffic is limited. They waited a full year after launch to run ads while improving trial-to-paid and retention first.
- **Caveats/contradictions:** Their no-trial result contrasts with Natal's big win from removing trials. The difference may be the discount-toggle framing, the $189 price, or monthly vs annual.
- **Quote:** "A great product will lift the floor more than any growth hacker tactic."

## Before you spend more on Meta Ads, watch this (Marcus Burke and Alper, compilation, 2026-09-15, https://youtu.be/E9NF-6AjQhs)
- **Relevance:** low. It's about ads, with one funnel point.
- Ads: about $10K is the minimum budget if cost per conversion is $10–15. Test 25+ creatives a week, with 80% iterations and 20% new. Don't treat Meta's 90% spend concentration as the "winner." Map trial events honestly (one account cut cost per trial about 35% by mapping trial as trial instead of purchase). Aim for 10–50% profit on the first purchase. Relevant point: Meta users arrive with "tiny attention spans" and almost no context, so most of the consultant's work is onboarding, paywall and pricing, not ads. Apps without a visual hook (habit trackers, VPNs) may never work on Meta.

## Why BoldVoice charged from day 1 and ignored the Duolingo freemium playbook (Anada Lakra, BoldVoice, 2026-09-16, https://youtu.be/-5zgc14t2gc)
- **Relevance:** high. It covers hard-paywall tests judged on refunds, a reverse-trial middle ground, and the right success metric for paywall tests.
- **Findings:**
  - BoldVoice is an AI accent and speech coaching app for non-native English professionals. They charged from launch in 2021: a 7-day trial and $10/month. Charging identifies the ideal customer profile (ICP), because willingness to pay signals that the problem resonates and filters out feedback from non-buyers.
  - Current pricing: annual-first at about $150/yr, monthly as a fallback, and a higher tier with AI chat at about $200/yr.
  - They tested a hard paywall (no dismiss X), and separately a dismissable paywall followed by an undismissable discount offer. Both lifted trial starts, because users had invested in onboarding. Refunds then spiked by more than the trial gain, so neither shipped. Evidence: A/B tests judged on mature cohorts.
  - Their gold-standard metric for any paywall test is net revenue after refunds per exposed user, on a mature cohort: trial, plus a week to convert, plus at least 2 more weeks for refunds to settle. Refunds hit after the charge lands on the bank statement, and refunders are angry users.
  - Current structure is effectively a reverse trial. If you dismiss the paywall you still get the speech assessment with full results, plus day 1 of the daily plan (a practice set and a coach video). From day 2 you must start a 7-day trial to continue. This serves users wary of card-on-file trials without training people to think the app is free.
  - Anything that forces or tricks people into a trial gets paid back in refunds and bad sentiment. Their "biggest fail" of the year was over-optimizing paywall wording and buttons instead of the product.
  - Don't mix playbooks. Duolingo's freemium works for a huge base of beginner learners. BoldVoice deliberately ignores beginners and targets high-intent professionals, whose alternative is expensive 1:1 coaching.
  - They started with international college students (the founder's own story), but students had lower willingness to pay and improve naturally. Working professionals who had felt the career cost converted best.
  - Every employee does at least 2 fifteen-minute user interviews a week via automated calendar invites to a mix of long-time subscribers, recent trialists and non-converters. They also run a weekly super-user group where engineers demo features before release, plus in-office observation sessions.
  - Happy users over-volunteer for calls. To reach unhappy users, use a 3-question reply-by-email survey or cancel-flow questions.
  - Accent Oracle is a free web tool with no gate that guesses your accent's origin from 10 seconds of speech. It went viral (about 100K Korean users in a day after one angel's Threads post). Showing a snippet of the full in-app results raised click-through to the app.
  - Annual-first shortens payback and reveals LTV/CAC per channel right away. TikTok traffic showed lower intent and loyalty.
- **Tactics:** Measure paywall tests on refunds and mature cohorts. Use a limited free "taster" after dismissal instead of a hard wall. Use a free viral web tool as the top of the funnel.
- **Caveats/contradictions:** The hard-paywall result runs against the "hard paywall converts 5x" narrative once refunds are counted. They still show the trial paywall first and don't remove it.
- **Quote:** "Anything that kind of forces or tricks people into starting a trial, you'll pay it when it comes to refunds."

## The affiliate marketing playbook for apps (Michael Butler, Insert Affiliate, and Mark Kennedy, None To Run, 2026-09-22, https://youtu.be/IhEY1B0PaIw)
- **Relevance:** low to medium. It's mostly about acquisition, but it has one paywall personalization tactic.
- **Findings:** Affiliate commissions typically run 15–40%. None To Run pays 20% on annual and 20% on monthly for 3 months. Useful for paywalls: users arriving through an affiliate link get a 1-month trial instead of 7 days, plus a custom paywall showing the creator's face ("glad Emma sent you, she'd love to give you a free month"). That borrows the creator's credibility at the moment of purchase. Also: about 30% of the host's annual subscribers renew, and "spillover" (buyers who skip the code) kept 20–30% of revenue even at a 100% commission.

## Batch-level patterns
- **Trust before the paywall matters more than paywall tweaks.** Natal (68% trial-to-paid, "hack is build trust"), Visible (no paywall tests, $10M ARR), Built With Science ("product lifts the floor") and BoldVoice (paywall over-optimization was the "biggest fail") all say this. It is the dominant theme of the batch.
- **Judge paywall tests on downstream revenue, not trial starts.** Hard paywall and forced-discount variants lifted trial starts at BoldVoice but lost on refunds. The Simply soft paywall won on ARPU for months, then turned out to attract users who got no value. Savvy Navvy's no-account test decayed after rollout. Wait for mature cohorts.
- **Removing trials is context-dependent.** Natal saw +2,000% monthly subs by dropping the trial on monthly only, with a very warm founder-led audience. Built With Science's pay-now-for-20%-off toggle lost until the copy stopped framing the trial as the inferior option.
- **Annual-first plus lower perceived risk.** Built With Science's Blinkist-style timeline with a reminder promise moved annual share from about 60% to about 80%. BoldVoice and Savvy Navvy (a 2-year plan at about 30% off) value upfront cash for CAC payback. Simply is the counterexample: monthly wins on LTV only when retention is strong.
- **Defer friction, don't delete it.** Moving login after the paywall was Coconote's biggest win (about 10% drop-off removed). Removing accounts entirely backfired at Savvy Navvy. Ask for commitment late, but keep what users actually need.
- **Onboarding length is a balance.** Coconote got +16% trial starts from about 15 screens. Natal keeps it to 10–15 questions and fights decision fatigue by routing users to one starting program. Built With Science's long web quiz outperforms the App Store and feeds personalization. Always route users to a clear first action.
- **Put the aha moment in the FTUE, aimed at whoever pays.** Examples: Simply Draw animates the child's drawing so parents see value, Natal's posture assessment leads 68–70% to a first workout, and Life360 ties circle creation and invites in week 1 to year-one retention.
- **Qualify rather than maximize.** Visible's quiz screens people out. BoldVoice ignores beginners. Coconote and BoldVoice charge from day one to find their ICP. Clickbait ads raised trials but hurt trial-to-paid at Built With Science.
- **Dark-pattern backlash is real.** The $1 plan plus upsell chain (host's wife charged about $350–400), per-day price framing, and even "$0.00" CTAs were questioned. Refunds, chargebacks and regulators are the cost.
- **Social or household units retain best.** Life360 circles of 3–4, Simply's multi-profile family plans, and Built With Science's gym buddy (15% of trials add one, and they retain better) all show this. A cheap add-on offered in the quiz beats cluttering the paywall.
