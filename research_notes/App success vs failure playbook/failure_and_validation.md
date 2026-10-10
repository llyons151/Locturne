# Why indie consumer apps fail, and what pre-launch validation catches it

Research date: 2026-10-09. Scope: consumer mobile apps, mainly iOS subscription apps. Self-reported numbers from founders are marked as such. Several Indie Hackers and Medium posts returned HTTP 403 and could not be read in full; those are listed under Gaps rather than cited for their content.

## Q1. What do indie app post-mortems (2020–2026) cite as reasons for failure?

### Takeaway
The causes cited most often are "nobody found it" (no distribution plan; relying on the App Store, Product Hunt or a few Reddit/HN posts) and "nobody needed it" (built before testing demand; "better, not different"). After those come conversion and structure failures: no free entry point, a long time-to-value, and pricing. Platform problems (App Review, API rule changes, delisting) are rarer, but when they happen they end the app. Products that went viral and then failed did so on retention, not distribution.

### Cited Findings
Post-mortem catalogue (date, app, numbers, cited cause):

1. **Planetoid, iOS game (written 2021, launched Nov 2016).** About a year of part-time work. The paid launch sold nothing in 2 months. A free version with ads reached about 300 installs. Cause: almost no marketing. The developer posted on Reddit and HN and "hoped the App Store would do the job." In the same post, a landing page plus 3 months of Google Ads for a second product (Minfinity) brought in 5 mailing-list signups, and that product was killed before it was built. The developer's lessons: validate demand and plan marketing before building, and keep the MVP to 3 weeks of spare time or less. — [kwcodes, DEV, 18 Nov 2021](https://dev.to/kwcodes/how-i-failed-5-side-projects-in-6-years-earning-0-3j19)
2. **Product-company job board (Oct 2020–May 2021).** Six months of evening work produced one real job posting. Outreach on LinkedIn, Reddit and HN failed, and the board shut down in May 2021. Cause: no traction or distribution. — [same source](https://dev.to/kwcodes/how-i-failed-5-side-projects-in-6-years-earning-0-3j19)
3. **Several "high-quality" apps (AI prompt extension, Reddit summariser, AI Kanban), 2025.** Fewer than 5 users across all of them. Ten straight days of build-in-public posts on X got zero engagement. The Reddit account was permanently banned after 3 weeks for self-promotion. Product Hunt sent "a couple of dozen visits" and almost no installs. Cause: the developer said they "believed that building a great product would inevitably lead users to find it." These are browser extensions rather than mobile apps, but the distribution lesson carries over. — [xor01 Substack, 28 Oct 2025](https://xor01.substack.com/p/building-isnt-enough-a-developers)
4. **41-app portfolio, paid-upfront iOS apps (2026).** Zero sales for 37 straight days (1 Sep–7 Oct 2026). 26 of the 41 apps were not visible in the store (in review, rejected or delisted). All 15 live apps were paid upfront ($0.99–$12.99) with no free entry point. The GitHub README linked to Releases rather than the App Store. The developer's Reddit account was suspended. Their lesson: "any factor at zero means the result is zero." — [phinnshen, DEV, 7 Oct 2026](https://dev.to/phinnshen/37-days-of-zero-app-store-sales-i-pulled-the-data-on-all-41-of-my-apps-2kl2)
5. **B2B SaaS waitlist launch (IH, 2025/26).** More than 300 waitlist signups turned into 3 paying users at launch, roughly 1%. The founders blamed a long time-to-value (setup was needed before users saw the core AI feature), low pricing that signalled low quality, and per-seat messaging that didn't fit solo users. — [Indie Hackers](https://www.indiehackers.com/post/300-waitlist-signups-launched-march-12-and-only-3-paying-users-where-is-our-gtm-failing-808aec814d) (summary from a search snippet; the page returned 403)
6. **Wikit, Taskware and others (SaaS, written Jul 2025).** Wikit took about a year to build. Only designer friends liked it, and users asked "why not just use Notion?" Taskware was "objectively better" (cleaner UI, faster) but not different. Several products "never made it past 20 users." Causes: no demand validation outside the founder's own circle, "better is not a strategy," marketing treated as an afterthought (a Product Hunt launch plus a few tweets), scope creep and an unreachable audience. The author's pre-build gate: **10 people who strongly want it and 3 who will pay now.** — [Andres Max, 3 Jul 2025](https://andresmax.substack.com/p/lessons-i-learned-from-my-failed)
7. **Poparazzi, iOS social photo app (small venture-backed team, 2021–2023).** It reached #1 on the App Store in May 2021, about 6.2M lifetime installs (Apptopia). MAU fell from about 4M at peak to about 2,000–3,000 before it shut down in April 2023, after a $15M Series A. No official reason was given. This is the clearest case of distribution without retention. — [TechCrunch, 1 May 2023](https://techcrunch.com/2023/05/01/once-hot-photo-sharing-social-app-poparazzi-is-shutting-down/)
8. **Artifact, AI news app (8-person team, shut down Jan 2024).** Systrom: "We have built something that a core group of users love, but we have concluded that the market opportunity isn't big enough to warrant continued investment." Coverage also cites the moderation load as too much for 8 people. He argued that making the tough call earlier is better. Cause: the market was too small, even though the product retained a core group. — [Engadget, Jan 2024](https://www.engadget.com/instagrams-founders-are-shutting-down-artifact-their-year-old-news-app-233431390.html)
9. **Apollo, indie Reddit client (shut down 30 Jun 2023).** Reddit's API pricing change made the app untenable. Cause: platform or API dependency, not product or demand. — [Wikipedia: Apollo (app)](https://en.wikipedia.org/wiki/Apollo_(app))
10. **Hey email, iOS (Jun 2020).** App Review rejected the app twice and threatened removal because it sold its subscription outside the app without offering in-app purchase. Cause: App Review and monetization rules. — [HN thread](https://news.ycombinator.com/item?id=23542937)
11. **HN reader app (2018) and HACK client (2022).** Both apps were rejected by App Review. One was approved only after the developer's post went viral. The other was blocked for lacking in-app account deletion. — [Medium "My App Is Dead in the Water"](https://medium.com/swlh/my-app-is-dead-in-the-water-93a97a137eff); [HN](https://news.ycombinator.com/item?id=33633324)
12. **Delisting or search-ranking drop (Russ Shanahan, 2019; outside the date range).** A ranking drop that could cut revenue by 44% meant "this business will not be sustainable." Cause: depending on a single App Store channel. — [russ.app](https://russ.app/2019/05/delisted-overnight)
13. **HabitKit founder's earlier app, liftbear (2022–23).** It had no real success "for a long time." The founder set himself a 12-month deadline in 2022 and went back to a job in April 2023 because HabitKit's income "wasn't enough to live off of." HabitKit later reached $10K MRR in 2024, and a December 2024 MKBHD feature, which he did not pitch, drove a large spike. A paid Times Square billboard had "modest" results. Lesson: early income is slow, and the survivor was a later app, not the first. — [Sebastian Röhl, 2024 year in review](https://sebastianroehl.substack.com/p/2024-my-indie-app-business-year-in)
14. **Itemlist (2022–23).** A rebrand doubled downloads, and Black Friday 2023 brought in more than $1,400 for the month. Most buyers chose yearly or lifetime plans, which kept MRR growth low. Lesson: naming and branding matter, and pricing-mix effects can hide growth. — [dabo.dev](https://dabo.dev/revealing-my-revenue-metrics)
15. **Screen-time blocker (habit-gated), production write-up (Jun 2026).** About 35% of installs granted Screen Time permission but never selected an app, and that cohort "retained far worse." The fix was disabling the picker's Done button until something is selected. Cause: an onboarding activation gap. — [habitdoom.com, 6 Jun 2026](https://habitdoom.com/blog/shipping-familycontrols-ios) (written by a competitor)

Aggregate and context data:
- CB Insights' analysis of 101 startup post-mortems (2017) ranks "no market need" first (about 42%), with running out of cash second. A later sample of 111 post-mortems put running out of cash or failing to raise first (38%). These are self-reported and not specific to apps. — [CB Insights summary (PDF)](https://www.talentica.com/wp-content/uploads/2024/02/The-20-Reasons-Startups-Fail.pdf); [SmartCompany](https://www.smartcompany.com.au/startupsmart/analysis/startups-fail-founders-capital/)
- RevenueCat 2024 (29K apps): only 17.2% of subscription apps reach $1K monthly revenue. 59% of those go on to reach $2.5K, and only 3.5% of all apps reach $10K. — [TechCrunch, 12 Mar 2024](https://techcrunch.com/2024/03/12/most-subscription-mobile-apps-dont-make-money-new-report-shows/). For the 2025 report (75K+ apps), a secondary summary gives about 20–25% reaching $1K within 2 years and about 5% passing $10K. The 2025 numbers were not verified at the source. — [Gigazine](https://gigazine.net/gsc_news/en/20250318-mobile-apps-subscriptions-revenue)
- RevenueCat 2026 (115K apps): the top 25% grew MRR by 80% or more year on year, while the bottom 25% shrank by more than 33%. 55.4% of 3-day-trial cancellations happen on day 0, and 84% by day 1. Month 1 accounts for 35% of all annual-plan cancellations. Apps that don't deliver the "aha" within the first hour tend to lose the trial. — [RevenueCat, 2026 benchmarks](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- Launch-timing failure mode: most indie launches pack all their marketing into launch day. The recommended window is more than 100 days: 45 before launch, launch day, and up to 60 after. — [Kickstart launch checklist](https://www.kickstart.tools/blog/the-ultimate-indie-ios-app-launch-checklist)
- On subscription resistance, some Indie Hackers commenters say they refuse subscription-priced apps outright and prefer lifetime licences. — [IH "subscription fatigue"](https://www.indiehackers.com/post/i-have-subscription-fatigue-dae7cd307c)

### Inferences
- Ranked by how often they appear in this sample: (1) no distribution or launching to no audience (items 1, 2, 3, 4, 6, 12); (2) built without a demand test, or "better, not different" (1, 5, 6); (3) conversion and structure problems such as no free entry, slow time-to-value or pricing (4, 5, 14, 15); (4) retention collapse after a burst of attention (7); (5) market too small (8); (6) platform, App Review or API problems (9, 10, 11, 12); (7) giving up or running out of runway before compounding starts (13; HabitKit took about 18 months to reach living income).
- The founders in this sample who succeeded (HabitKit, Itemlist) did so through repeated small distribution wins and naming or pricing iteration over 1–2 years, not on launch day.

### Gaps
- Several primary write-ups returned 403 and could not be read: Kaan Yildiz's "My App Portfolio Is Failing" (Medium), IH "I've given up on making apps," IH "15 apps and not a single sale in 2023," IH "15 lessons from 15 years" (paywalled), and IH Loominex (2024).
- I found few true indie iOS subscription-app post-mortems from 2020–2026 that include hard numbers. Most writers are SaaS or extension founders.

## Q2. How common is "great product, no distribution" versus "distribution but doesn't retain"?

### Takeaway
No study measures this split directly. In indie post-mortems, "no distribution" dominates by a wide margin. "Distribution but no retention" mostly shows up in venture-backed viral consumer apps (Poparazzi) and in subscription data showing trials cancelled on day 0.

### Cited Findings
- In the solo and indie sample above, roughly 6 of 8 failures cite no users or no discovery as the main problem. — [kwcodes](https://dev.to/kwcodes/how-i-failed-5-side-projects-in-6-years-earning-0-3j19), [xor01](https://xor01.substack.com/p/building-isnt-enough-a-developers), [phinnshen](https://dev.to/phinnshen/37-days-of-zero-app-store-sales-i-pulled-the-data-on-all-41-of-my-apps-2kl2), [Andres Max](https://andresmax.substack.com/p/lessons-i-learned-from-my-failed)
- Distribution without retention: Poparazzi went from #1 on the App Store and about 4M MAU to about 2–3K MAU. — [TechCrunch](https://techcrunch.com/2023/05/01/once-hot-photo-sharing-social-app-poparazzi-is-shutting-down/)
- At the subscription level, 84% of 3-day-trial cancellations happen by day 1, and annual-plan churn in year 1 rose from about 56% to about 72% between the 2025 and 2026 reports. — [RevenueCat 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- Activation leak in the app-blocker category: 35% of installs never selected an app to block. — [habitdoom](https://habitdoom.com/blog/shipping-familycontrols-ios)

### Inferences
- For a solo developer, distribution is the first constraint. Retention becomes the constraint only after a channel works. If both are zero, the result is zero (phinnshen's framing).
- Survivorship bias is likely, because founders with a working channel but poor retention write post-mortems less often.

### Gaps
- No quantified dataset splits indie app failures by cause.

## Q3. Pre-launch validation methods, evidence, and kill/continue thresholds

### Takeaway
The evidence base is thin and mostly comes from vendors. The most-cited waitlist-to-paid benchmark is 5–25% (about 20% when users are activated within a month, under 10% after 3 months; Lenny Rachitsky, 2022, B2B/SaaS-leaning). Real indie cases come in much lower, around 1%. Visitor-to-signup rates are a different metric and are often confused with waitlist-to-paid. App Store pre-orders are the strongest native iOS signal because they auto-install at launch.

### Cited Findings
**Waitlists**
- Waitlist-to-paid conversion is 5–25%. It averages about 20% if people come off the list within a month and falls below 10% after 3 months. Data collected by Lenny Rachitsky in 2022. — [speedrun Substack, 6 Jan 2026](https://speedrun.substack.com/p/the-growth-meta-how-to-build-a-waitlist); [IH thread](https://www.indiehackers.com/post/how-many-waiting-list-signups-should-we-have-before-building-mvp-05ea06e9ca)
- One vendor cites a median of about 11% waitlist conversion. — [Waitlister](https://waitlister.me/growth-hub/blog/waitlist-and-product-launch-statistics) (vendor)
- Rough ranges by product type: SaaS with urgent pain above 30%, non-essential DTC around 10–15%. — [Xartup Substack](https://xartup.substack.com/p/why-most-startup-waitlists-suck-and) (opinion, unverified)
- Real indie case: 300+ signups led to 3 paying users (about 1%). — [Indie Hackers](https://www.indiehackers.com/post/300-waitlist-signups-launched-march-12-and-only-3-paying-users-where-is-our-gtm-failing-808aec814d)
- Visitor-to-signup on a landing page (a different metric): warm traffic 25–45%, cold organic 10–20%, paid ads 3–10%. — [LaunchList](https://getlaunchlist.com/blog/why-is-my-waitlist-not-converting) (vendor)
- Waitlist to day-one download: about 5–10%. This comes from a blog and is unverified. — [brewedinpixels](https://brewedinpixels.com/en/indie-creator-faqs/16-validate-app-idea.html)

**Landing page or paid smoke tests**
- A landing page plus 3 months of Google Ads brought in 5 signups, and the project was killed. This is a working example of a smoke test that saved a build. — [kwcodes](https://dev.to/kwcodes/how-i-failed-5-side-projects-in-6-years-earning-0-3j19)
- Typical guide advice: run social ads at $5–10 a day for 1–2 weeks to a landing page, and use "under 100 waitlist signups → rethink" as a rule of thumb. — [brewedinpixels](https://brewedinpixels.com/en/indie-creator-faqs/16-validate-app-idea.html), [Ramam Tech](https://ramamtech.com/blog/how-to-validate-app-idea-fast) (rules of thumb, not benchmarks)
- Fake-door test: build a mock store listing whose "Download" button leads to a waitlist. — [Ramam Tech](https://ramamtech.com/blog/how-to-validate-app-idea-fast)
- Andres Max's pre-build gate: 10 people who strongly want it and 3 who will pay now. — [Andres Max](https://andresmax.substack.com/p/lessons-i-learned-from-my-failed)

**App Store pre-orders**
- Pre-orders auto-download to the customer's device on release. App Store Connect reports pre-orders placed, cancelled and fulfilled. Apple's "conversion rate" counts pre-orders as downloads and can exceed 100%. — [Apptamin](https://www.apptamin.com/blog/apple-pre-order-app/), [Bitrig](https://bitrig.com/blog/app-store-pre-orders)
- One indie developer collected about 650 pre-orders, which put the app straight into Top Paid on launch day. The launch conversion figure was not retrieved. — [Bitrig](https://bitrig.com/blog/app-store-pre-orders)

**TikTok or content tests**
- Guides recommend tracking signups rather than views, because views measure attention, not demand. I found no independent data on how well TikTok-driven waitlists predict downloads. — [brewedinpixels](https://brewedinpixels.com/en/indie-creator-faqs/16-validate-app-idea.html)

**Trial and paywall benchmarks (post-launch kill/continue signals)**
- Day-35 trial-to-paid is 10.7% with a hard paywall and 2.1% with freemium. Revenue per install at day 60 is $3.09 versus $0.38. Year-one retention of annual subscribers is about the same (27% versus 28%). Median trial-to-paid is 42.5% for 17–32-day trials and 25.5% for trials under 4 days. — [RevenueCat 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- The average time to reach $1K MRR is about 60 days among apps that get there. 59% of apps that reach $1K go on to $2.5K. — [Gigazine summary of RevenueCat 2025](https://gigazine.net/gsc_news/en/20250318-mobile-apps-subscriptions-revenue); [TechCrunch 2024](https://techcrunch.com/2024/03/12/most-subscription-mobile-apps-dont-make-money-new-report-shows/)

**Beta and TestFlight cohorts**
- In one write-up, direct one-to-one Discord beta outreach produced testers but no long-term users. Engaging individuals worked better than broadcasting. — [xor01](https://xor01.substack.com/p/building-isnt-enough-a-developers)

### Inferences
- Thresholds a report writer could propose, all derived from the sources above and none of them industry standards:
  - Waitlist: plan on 1–10% of signups paying, not 20%. Contact the list within 30 days of signup.
  - Landing page: if cold traffic converts to signup below about 3%, or fewer than about 100 signups come in after 1–2 weeks of $5–10/day, rethink.
  - Post-launch: if you're still far below $1K MRR around 60–90 days after a real distribution push, the RevenueCat percentiles put you among the roughly 80% of apps that never reach it. Hard-paywall trial-to-paid below about 10% is under the median.
- For iOS consumer apps, App Store pre-orders are the closest thing to a real pre-sale, because conversion to install is close to automatic. The open question is how many people tap pre-order.

### Gaps
- I found no independent, consumer-mobile-specific dataset on waitlist-to-paid conversion. The figures above are B2B-leaning or come from vendors.
- I found no published pre-order-to-paid-subscription conversion rate for subscription apps.
- I found no rigorous study of whether TikTok content tests predict app revenue.

## Q4. Risks specific to screen-time and app-blocker apps

### Takeaway
The category carries five specific risks. (1) Entitlement and App Review friction: Family Controls (Distribution) approval is needed per bundle ID and per extension, and reviewers flag leftover API use. (2) API reliability bugs, including picker crashes, schedule quirks and the intervalDidEnd trap. (3) A bypass Apple has never fixed: any user can turn off an app's Screen Time authorization in Settings with their own Face ID, and nothing is behind the Screen Time passcode. (4) Billing-anger reviews from trials that auto-convert to annual plans. (5) Free competition from iOS Screen Time itself and from ScreenZen, which is donation-funded.

### Cited Findings
- **Entitlement:** Family Controls (Distribution) must be requested per bundle ID, including each extension. Builds can't go to TestFlight or the App Store until it's approved. Apple wants a genuine parental-control or digital-wellbeing use case. — [Newly guide](https://newly.app/how-to/family-controls-entitlement); [dev.to, 2026](https://dev.to/twillywill/the-ios-screen-time-api-in-2026-what-apples-docs-dont-tell-you-151e). Some developers report extension entitlement requests stuck in "Submitted" with no reply. — [Apple forums](https://developer.apple.com/forums/tags/screen-time?page=4&sortBy=lastUpdated)
- **App Review:** One app was rejected under 2.5.1 ("public APIs in an unapproved manner") even after all Family Controls code had been removed. Another app was rejected under 2.3 (UIRequiredDeviceCapabilities) only after DeviceActivity extensions were added, despite an identical config that had passed before, and a dozen or more resubmissions were rejected. — [Apple forums thread 822078](https://developer.apple.com/forums/thread/822078); [Family Controls tag](https://developer.apple.com/forums/tags/family-controls?page=4&sortBy=lastUpdated). Rejections often come from privacy declarations that don't match what the binary does. — [habitdoom](https://habitdoom.com/blog/shipping-familycontrols-ios)
- **Reliability:** Apple acknowledged that FamilyActivityPicker crashes when a category's tokens exceed the memory limit, which hits heavy Safari users. On iOS 18.4 and later, the picker dismisses the sheet that presented it. — [Apple forums](https://developer.apple.com/forums/tags/family-controls?page=6). Calling startMonitoring() on an activity that is already monitored fires intervalDidEnd first, which can re-block apps mid-session. One developer reports DeviceActivity schedules become unreliable beyond about 45 minutes. — [habitdoom guide](https://habitdoom.com/blog/apple-screen-time-api-guide). The API doesn't work in the Simulator. — [folio3](https://www.folio3.com/mobile/blog/screentime-api-ios/)
- **Bypass:** In Settings, the user can open the app's entry, turn off Screen Time restriction, and confirm with the device owner's Face ID or passcode. This is not behind the Screen Time passcode. First reported in March 2023, it was still present in iOS 17, 18.5, 26.3 beta and 26.6 according to replies as late as May 2026. Apple staff have never responded. — [Apple forums thread 727291](https://developer.apple.com/forums/thread/727291). Reviews disagree on whether deleting the app removes shields. Habitdoom says shields survive force-quit, restart and uninstall. Others say toggling Settings > Screen Time defeats Opal. — [habitdoom](https://habitdoom.com/blog/shipping-familycontrols-ios); [Opal review roundup](https://unstar.app/blog/opal-forest-freedom-one-sec-jomo-screen-time-apps-ranked-2026) (several of these are written by competitors)
- **Refunds and billing:** One review analysis puts complaints about trials auto-converting to $99.99/year at 24% of Opal's 1–3-star reviews ("Opal charged me $99.99 the day my trial ended"). The analysis was not independently verified. Reliability complaints include Safari remaining usable with a full block on. — [justuseapp Opal reviews](https://justuseapp.com/en/app/1497465230/opal-save-time-daily/reviews); [makeheadway](https://makeheadway.com/blog/opal-app-review/)
- **Free competition:** ScreenZen describes itself as "the only FREE, donation-supported" screen-time blocker. Some smaller blockers are free with no IAP. AppBlock claims 10M+ users. — [ScreenZen App Store](https://apps.apple.com/us/app/-/id1541027222); [AppBlock App Store](https://apps.apple.com/app/apple-store/id1515753232)
- **Activation:** 35% of a blocker's installs granted permission but never chose apps to block, and that cohort retained far worse. — [habitdoom](https://habitdoom.com/blog/shipping-familycontrols-ios)

### Inferences
- The Settings toggle bypass means retention in this category depends on motivation and design, not on enforcement. "Unbypassable" marketing claims are risky.
- Get the distribution entitlement for every extension well before launch. A late entitlement or 2.3/2.5.1 rejection loop can push a launch back by weeks.
- Trial-to-annual billing anger is a predictable review and refund risk in this category. Clear trial-end messaging is the counter.

### Gaps
- I found no full post-mortem of a failed app-blocker business, and no published refund-rate data for the category.
- I found no reliable founder revenue story for one sec, Jomo or Brick in this pass. The earlier Locturne doc docs/VALIDATION_RESEARCH.md §3 covers competitors, including the Opal Sub Club interview.
- I found no data on what share of blocker users bypass through the Settings toggle or by uninstalling.
