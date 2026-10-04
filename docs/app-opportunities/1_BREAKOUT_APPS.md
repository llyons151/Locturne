# Breakout indie / small-team consumer apps, Jan 2025 – Oct 2026

Research date: 2026-10-03. Track: apps that went from ~0 to $10K+/mo recently, especially solo or tiny teams.

**Evidence key**
- **SR** = founder self-report (interview, podcast, X post). Usually unaudited, sometimes includes gross rather than net figures, and favours peak months.
- **SR-V** = self-reported but backed by a revenue-verification service (TrustMRR via Stripe/RevenueCat connection).
- **3P** = third-party estimate (Sensor Tower, Appfigures, screensdesign/mwm/Apptopia-style estimators). These are often off by 2x or more.
- **PR** = press release or press coverage that repeats company claims.

**Caveats.** Most of these come from survivorship-biased media: Starter Story, Social Growth Engineers (SGE), Superwall case studies and stork.ai recaps of Starter Story videos. Several of those outlets have a commercial interest in the "anyone can do this" story (courses, paywall SDKs). Treat "$X/month" headlines as peak months, often gross. I could not verify any of them against App Store data myself. Where a figure appears only in a secondary recap, it says so.

---

## 1. Example table (36 apps)

| # | App | Category / what it does | Launch | Revenue / downloads (date, source) | Evidence | Team | How it grew | Price model |
|---|---|---|---|---|---|---|---|---|
| 1 | **Erly ("Early")** | Alarm you dismiss with push-ups (AlarmKit) | MVP late 2025; first influencer video Dec 2025 | $1K by week 3, $30K in month 3, $50K in month 4; $50K in the last 28 days; 50K downloads in the last 30 days (Jun 2026); 200K+ downloads in 2026. Starter Story, Jul 2026 | SR | Solo (24-year-old ex-CPA) | Paid lifestyle / "day in the life" creators filming morning routines, at $2–3 CPM with view guarantees, 2–4 videos per creator per month; about 2:1 return ($5K → $10K) | Free trial, then $9.99/mo or $29.99/yr |
| 2 | **Wayk** | Mission alarm (make bed, photo proof, etc.) for heavy sleepers | Feb 2026 | "$45K in 45 days" (X post by a third party, Apr 2026); screensdesign estimate ~$75K/mo, 150K installs | 3P | Dialed Labs Inc (small) | 102-screen quiz onboarding, streaks/badges, $10 referral program | Trial → yearly/monthly |
| 3 | **Pushscroll** | Push-ups earn social-media minutes (Screen Time API) | ~early 2025 (App Store id 6741765734) | $30K MRR and 300K downloads in 4 months (Starter Story, Jan 2026); later "~$100K MRR", >$1M lifetime proceeds in 1 year (Braavo, Jul 2026) | SR + lender blog | 2 (marketer + dev) | Content-first: faked app demos on TikTok/IG before building; ~40M views; ManyChat comment-to-DM; a $5K influencer spend *failed* | Subscription |
| 4 | **Cal AI** | Photo calorie counter | May 2024 | $30M revenue in 2025; $5.7M in Jan 2026; 15M+ downloads; acquired by MyFitnessPal at ~$50M ARR (2026) | SR + press (TechCrunch, CNBC) | 2–4 teens, later ~20 | Creator / UGC army plus paid; Superwall paywall testing (3x MRR in 10 months) | Hard paywall, subscription |
| 5 | **Quittr** | Quit-porn / recovery | Aug 2024 | $250K MRR by Jan 2025; "$500K/mo" (Starter Story, Dec 2024, peak claim); ~$4M total revenue by late 2025 | SR | 2 (App Mafia) | Retainer influencers for young self-improvement men; meme ads; community | $6.99/wk or $29.99/yr, no trial |
| 6 | **Unchaind** | Faith-based quit-porn (Quittr adjacent) | 2025 | "€875K ARR within 16 days", 500K+ downloads; acquired by Rocapine | PR / Superwall case study | Studio (Applo) + publisher | Studio playbook; a feature-preview paywall lifted conversion 50% | Subscription |
| 7 | **Bible BFF** | Bible retold in Gen-Z slang, AI chat | Jul 2025 | $60K MRR and 60K downloads within ~1 month (SGE, Oct 2025) | SR via SGE | Small | 49 TikTok feeder accounts; one "spilling tea" hook hit 5.6M views; 13.1M views total | $6.99/wk after trial, hard paywall |
| 8 | **Bibly** | Bible / education | ~Q1 2026 | 60K downloads, $10K MRR (SGE, Apr 2026) | SR via SGE | Small | Existing creator ecosystem | Subscription |
| 9 | **Gleam** | "Duolingo for social skills" | ~early 2026 | 30K → 70K downloads and $100K+ MRR within 30 days (SGE, Apr 2026) | SR via SGE | Founder + storytelling agency | 10-minute TikTok "storytime" videos with the app as the payoff; top video 2.6M views | Subscription |
| 10 | **GoTall** | Teen height predictor and habits (quiz → paywall) | ~mid 2025 (id 6747467975) | "Averages $100K/mo", $1.2M/yr (Starter Story, 2026) | SR | Solo (20-year-old NYU student) | 10 TikToks/day for a month to find formats → DMed 50 creators/day → paid spend behind winning UGC. Built in **Expo** + Superwall | $5/wk or $35/yr; 91% paywall show rate |
| 11 | **Stella** | AI manifestation / affirmation audio | ~May 2026 | $300–340K/mo, 12K payers, 200K+ downloads within ~60 days (Starter Story, Jul 2026) | SR | Small; founder has 4M followers | Pre-existing personal audience; ManyChat DMs | Subscription |
| 12 | **Snag** | Finds free items listed nearby | 2025 (id 6755341741) | $30K MRR in under 4 months (Starter Story) | SR | Solo student (built 45 apps in a year) | UGC at scale, winners turned into paid ads | Subscription |
| 13 | **Chart Detector AI (Timo)** | Photo of a stock/crypto chart → AI analysis | Mid-2025 | ~$56K/mo; $260K+ lifetime; 90K downloads (2026) | SR | 2 brothers | **TikTok ads only**: Smart+ with broad targeting, optimizing for subscription events, ~$18K/mo spend, 25–30% net margin | Hard paywall, $12.99/wk or $59.99 per 6 months |
| 14 | **Go Viral** | Predicts a video's performance | 2025 | $50K MRR in 3 months (SGE, Jul 2025) | SR via SGE | Team behind Chart AI | 7 faceless AI-slideshow accounts, 10M views | Subscription |
| 15 | **Jungle** | AI study app (upload notes → gamified quiz tree) | ~2024–25 | $2K → $15K MRR after one viral video → $100K/mo (Superwall, Nov 2025) | SR | 2 founders | Mass DMs (got them banned on X), a $20K viral video, 30 creators making ~400 videos/week; 30–40% of new users from word of mouth | Subscription |
| 16 | **Coconote** | AI lecture notes | 2024 | $100K ARR in 45 days, $1M ARR in 4 months, $6.7M ARR, then exit to Quizlet (Sub Club, Mar 2026) | SR | 2 founders + ~25 part-time creators | No paid ads; creators with ~5K followers and a Gmail address, not agency influencers | 1 free note, then $99.99 → $129.99/yr (raising the price *raised* trust) |
| 17 | **Turbo AI** | AI notes for students | Early 2024 | 5M users, 8-figure ARR (TechCrunch, Oct 2025) | PR | 2 dropouts | Campus virality and creators | ~$20/mo |
| 18 | **Halo AI** | AI consumer app (exact function unclear) | ~early 2026 | "$300K MRR in 45 days" (Superwall Podcast, Apr 2026) | SR | Founder + 85 creators | ~300 videos/day across 4 platforms from one format; funded with a $100K personal loan | Two-paywall onboarding |
| 19 | **Pingo AI** | AI language speaking partner | Jan 2025 | $200K MRR by Jul 2025; "millions ARR" in under a year | PR (YC) | 2 founders, YC S25 ($500K raised) | Creators / UGC | Subscription |
| 20 | **Flamme / Flame** | Couples questions | Existed since 2023 (rebrand) | $3K → $10K MRR in <8 months; 250K downloads, 58M views (Jun 2026) | SR | Small | "Phone farm": 4–5 phones × 3–5 TikTok accounts, up to 150 variants/day, $0 ads | Subscription |
| 21 | **UsTwo** | Couples app | ~Mar 2026 | 9K downloads in 14 days, "millions" of views (SGE, Apr 2026) | SR via SGE | Small | A repeatable side-by-side-phones format | n/a |
| 22 | **Brainrot** | Screen-time app that "rots" your brain avatar | Late 2024 | $26K in the first 30 days; 5K downloads on day 1 | SR | Solo first-time iOS developer | 200K personal followers built up during the build; #1 on Product Hunt | Subscription (Superwall) |
| 23 | **BePresent** | Screen time / app blocker | 2023 | $75K ARR, 500K users (2025 pitch); later SGE says $20K MRR and 40K monthly downloads using 7 TikTok + 2 IG accounts | SR | 2 brothers, $750K pre-seed | Owned TikTok accounts | $59.99/yr after a 1-week trial |
| 24 | **Touch Grass** | Photograph real grass to unlock apps | Mar 2025 | 50K downloads (press, Apr 2025); revenue unknown | PR | Solo (Rhys Kentish) | Press virality (TechCrunch, Digital Trends) | Freemium; $5.99/mo or $49.99/yr |
| 25 | **BuyBye** | Shopping-app blocker / cost in hours of work | 2025 (id 6744707747) | ~$10K/mo, 25K installs (estimate) | 3P | Small | Superwall: a 50% price rise lifted proceeds per user 25% | Subscription |
| 26 | **Buy'r** | Scan a product → see who owns the brand | Jan 2026 | 50K downloads in week 1, #1 in Health & Fitness; 70K downloads and $30K MRR by day 37 (SGE) | PR + SR | 3, self-funded; co-founder has 4M followers | Creator credibility plus waitlist | Subscription |
| 27 | **ToneAdapt** | Guitar tone matching to your gear | Apr 12 (2026) | $24K in the first month; $3.6K MRR and 322 subscribers by May 7 (TrustMRR) | SR-V | Solo college student | TikTok/IG/YT/FB demos | Subscription |
| 28 | **3AK** | Track-and-field form training | Dec 2025 | ~$70K revenue, 40K users, >$20K/mo run rate by Jun 2026 | SR (Starter Story) | 2 athletes, no-code / AI | Niche community | Subscription |
| 29 | **PropGPT** | AI sports-betting props | ~2025 | $8.9K MRR, $20K last 30 days, $206K total (TrustMRR, May 2026) | SR-V | Small | Superwall pricing tests | $9.99/wk |
| 30 | **Floga** | Yoga app | Pre-launch May 2025 | $120K in 24 hours from a lifetime deal, then ~$10K MRR | SR | Solo | Pre-launch audience and lifetime deal | LTD + subscription |
| 31 | **Latvian portfolio dev ("28 apps")** | Many small utilities | 2025 | $100 → $10K MRR in 8 months; $25K+ MRR by Dec 2025; $84K total | SR | Solo | Volume: ship many, keep winners | Subscriptions |
| 32 | **Tea** | Women anonymously review men | 2023; went viral Jul 2025 | 6.1M downloads, ~$5M gross (Appfigures, Oct 2025); **pulled by Apple Oct 2025** after a data breach | 3P | Small startup | Organic virality, #1 overall | Subscription |
| 33 | **Halo-style "studio" apps: Rizz God, LookLab AI, Flirt AI, Symmetry, Mojo** | Looksmaxxing / rizz / AI | 2025–26 | Superwall case studies cite only % lifts, no absolute figures | SR | Studios | UGC plus paywall testing | Weekly subscriptions |
| 34 | **Umax / RizzGPT (App Mafia, pre-window reference)** | AI face rating / dating replies | 2023–24 | Umax ~$500K/mo at peak; RizzGPT ~$80K/mo | SR | Tiny | UGC | Weekly subscriptions |
| 35 | **Bible Chat (pre-window reference)** | AI Bible chat | May 2023 | ~$250–300K MRR (Mar 2025); 90%+ of TikTok views are *paid* | 3P / SR | Studio | Paid TikTok | Subscription |
| 36 | **Puff Count (pre-window reference)** | Quit vaping | 2019 | $40–44K MRR in 2024, then sold to a European studio | SR | Solo | Hundreds of self-made TikToks | Subscription |

---

## 2. Market-level data (RevenueCat State of Subscription Apps 2026)

Source: https://www.revenuecat.com/state-of-subscription-apps

- New subscription app launches per month went from ~2,000 (Jan 2022) to **14,700+ (Jan 2026)**, about 7x. iOS accounts for ~77% of new launches.
- Apps launched before 2020 earn **69%** of subscription revenue. Apps launched in 2025 or later earn **3%**.
- **Hard paywall: 10.7% download-to-paid by D35, versus 2.1% for freemium**, with "nearly identical" year-one retention.
- Health & Fitness has the highest D14 revenue per install ($0.48 median), 37.7% median trial-to-paid, and 68% of its plans are annual.
- High-priced apps earn $62 RLTV per payer in year one, versus $11 for low-priced apps.
- AI apps earn 41% more revenue per payer but **churn 30% faster**.
- 55% of 3-day-trial cancellations happen on day 0.
- Top 10% of apps grew MRR 306% YoY; the median grew 5.3%.
- Appfigures: 557K new App Store submissions in 2025 (+24% YoY), the biggest year since 2016, attributed to AI coding tools plus a TikTok/creator growth playbook ([Appfigures](https://appfigures.com/resources/insights/20251205?f=2)).

---

## 3. Patterns

### 3.1 Distribution is the product
Nearly every breakout above grew through one repeatable short-form format, run at volume. Founders say this explicitly:
- "Building doesn't really matter so much. Getting views is more of the unknown." (Erly)
- "Focus on top of funnel only." (Erly, via Starter Story)
- Pat Walls (Starter Story) reports that about 6 of the 12 founders he talks to each week are succeeding with iOS apps.

The common sequence:
1. The founder posts natively (or fakes an app demo before the app exists) to find a winning format. GoTall: 10 posts/day. Pushscroll: mock-up videos.
2. Clone that format across many accounts or creators. Bible BFF: 49 accounts. Flamme: 15–20 accounts on a phone farm. Jungle: 30 creators making ~400 videos/week. Halo: 85 creators making ~300 videos/day.
3. Optionally put paid spend behind the winners: Spark Ads, or TikTok Smart+ optimizing for subscription events.

There are two variants:
- **(a) Organic volume.** Owned accounts or cheap creators. Coconote used ~5K-follower creators found by Gmail address, never agency-repped influencers.
- **(b) CPM-bought lifestyle creators with view guarantees.** Erly paid $2–3 CPM.

Paid-only can work for a hard-paywall, high-ARPU app (Chart Detector: about $18K/mo of ad spend at 25–30% margin). A large existing audience is the cheat code (Stella, Brainrot, Buy'r).

### 3.2 Mechanics that are breaking out right now
- **"Physical-proof" self-control (most relevant to Locturne).** Push-ups to scroll (Pushscroll), push-ups to dismiss an alarm (Erly), mission alarms (Wayk, AlarmK, ByeBed), touch grass (Touch Grass), steps to unlock (Steppin, WalkLock). These spread because the mechanic is visible on camera and explains itself in 2 seconds.
  - **AlarmKit (iOS 26, fall 2025)** opened a new window for reliable third-party alarms. Erly and Wayk both launched into it within months, and AlarmK, ByeBed and ToDo Alarm followed.
  - A third-party X post cites Alarmy at ~$500K/mo and 500K downloads/mo (attributed to Sensor Tower), which suggests the alarm category has real spending.
- **Quit / self-improvement for young men.** Quit porn (Quittr → Unchaind → many clones), quit vaping (Puff Count), looksmaxxing (Umax), height (GoTall), social skills (Gleam).
- **Faith.** Bible Chat → Bible BFF → Bibly → Digible. Good unit economics, and creators repost content in this niche.
- **"Camera → AI verdict" utilities.** Calories (Cal AI), charts (Chart Detector), faces (Umax / LookLab), rashes (Rash ID), product ownership (Buy'r).
- **Student AI study tools.** Coconote, Turbo AI, Jungle, Studily. Students cluster physically, so word of mouth works.
- **Hobby niches with passionate communities.** Guitar tone (ToneAdapt), track and field (3AK), sports props (PropGPT).

### 3.3 Monetization norms
- Hard or near-hard paywalls after a long quiz onboarding are standard. Examples: Wayk's 102 screens; GoTall shows the paywall to 91% of users.
- **Weekly plans ($5–13/wk)** dominate impulse / AI / looksmax apps.
- **Annual plans ($30–130/yr)** dominate utility, habit and study apps.
- Erly charges only $29.99/yr. Coconote found **raising** its price to $129.99 *increased* trust. Locturne's $59.99/yr sits above Erly and next to BePresent ($59.99), in line with RevenueCat's high-price finding.

### 3.4 Saturation and clone speed
- **Clones arrive within weeks, and often before the original hits $10K.**
  - GoTall's founder found a similar app for sale on Acquire for ~$20K before he built his, and a "GoTaller" clone now sits on the store.
  - Pushscroll's niche now has "Push Up Time – App Blocker" at $256 MRR (whatsthe.app), plus many "push-ups to unlock" apps.
  - After Erly (Dec 2025) came Wayk (Feb 2026), AlarmK, ByeBed, Pushy and Pact. Prajwal Tomar publicly said he researched the alarm market "before building Pact."
- **Saturated:**
  - AI calorie trackers: Cal AI plus dozens of copies (PlateLens, Callie, Miora, Nutrola…). The leader was acquired, and review/listicle SEO is now crowded.
  - Quit-porn: Quittr, Unchaind, Relay, Brainbuddy, Fortify, Neuro, Overcomer…
  - Looksmax / rizz AI.
  - AI Bible chat.
  - Generic AI photo / headshot apps: ChatGPT and Gemini are absorbing image generation (a16z, Mar 2026).
  - Screen-time blockers: Opal, one sec, ScreenZen, Jomo, ClearSpace, BePresent, Brainrot, Unrot, Pushscroll, Touch Grass. Here a *new mechanic* is still needed to break out.
- **Durability is weak.** AI apps churn 30% faster (RevenueCat). "Growth hacks are temporary… they exploit gaps that eventually get filled" (Jungle). Tea was pulled by Apple. The 2025+ launch cohort earns only 3% of subscription revenue. Exits happen early: Cal AI → MyFitnessPal, Coconote → Quizlet, Puff Count → a studio, Unchaind → Rocapine. That suggests founders cash out before the decay.
- **Retention is the moat when the mechanic can be copied.** Erly cites streaks, a difficulty curve, and "not being so annoying people uninstall on day 3." Jungle's growing tree drives word of mouth. HabitKit is the slow-burn counterexample: launched 2022, ~$28K MRR in 2025, seasonal with a New Year spike, grown by building in public rather than viral spikes.

### 3.5 Implications for this founder (judgment, not research)
- His video skill matches what actually drives these breakouts. The bottleneck is whether the *mechanic films well*.
  - Erly and Wayk prove that "alarm you physically have to beat" films well and sells.
  - Locturne's "apps sleep until you go downstairs / walk 200 steps" is in the same visual family. It is also directly contested by Erly ($29.99/yr, 200K+ downloads), Wayk (~$75K/mo estimated), Pushscroll and the AlarmKit wave.
  - Clones will arrive within 4–8 weeks of any visible traction.
- Cash-fast playbook seen repeatedly:
  1. Founder posts ~10 videos/day for 2–4 weeks to find one format.
  2. Clone it across 3–5 owned accounts.
  3. Then pay creators $2–3 CPM with view guarantees, reinvesting at around 2:1 like Erly.
- The leaky-bucket risk is real for this category. Alarm and blocker apps that annoy people get uninstalled. Streaks and a difficulty curve were the retention levers cited by the most comparable winner.

---

## 4. Sources

- Erly / Early:
  - https://x.com/starter_story/status/2100265779073835162
  - https://finance.biggo.com/news/3bfa9061a5fd5981
  - https://www.indiehackers.com/post/how-a-simple-alarm-clock-app-makes-50k-month-RYmogGgIR0fKfLDBl7a0
  - https://yespress.io/early-push-up-alarm-app-50000-month
  - https://apps.apple.com/us/app/erly-wake-up-early/id6751428380
- Wayk / alarm market:
  - https://screensdesign.com/apps/wayk-alarm-clock-to-wake-up/
  - https://x.com/PrajwalTomar_/status/2044090376424993045
  - https://alarmify.com/vs/wayk/
  - https://byebed.com/blog/best-mission-alarm-apps-2026/
  - https://todo-alarm.com/blog/ios-26-alarmkit-apps/
- Pushscroll:
  - https://www.starterstory.com/Pushscroll
  - https://www.getbraavo.com/blog/from-0-to-1m-the-organic-growth-playbook-behind-pushscroll/
  - https://www.whatsthe.app/pushuptimeappblocker
- Cal AI:
  - https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/
  - https://www.cnbc.com/2025/09/06/cal-ai-how-a-teenage-ceo-built-a-fast-growing-calorie-tracking-app.html
  - https://superwall.com/case-studies/cal-ai
  - https://getlatka.com/companies/calai.app
- Quittr:
  - https://www.starterstory.com/quittr-breakdown
  - https://x.com/appmafia_/status/1959386404095693145
  - https://www.laweekly.com/from-broke-to-bold-how-alex-slater-built-quittr-into-a-1m-digital-wellness-powerhouse-at-19/
- Unchaind: https://superwall.com/case-studies/unchaind
- Bible BFF / Bibly / Gleam / Go Viral / Buy'r / UsTwo / fitness 10K→40K (SGE):
  - https://www.socialgrowthengineers.com/newly-released-gen-z-bible-is-now-a-60k-mrr-app
  - https://www.socialgrowthengineers.com/30-day-app-breakthroughs
  - https://www.socialgrowthengineers.com/from-abandoned-app-to-100k-mrr-in-30-days
  - https://www.socialgrowthengineers.com/50k-mrr-in-3-months-for-go-viral-app
  - https://www.socialgrowthengineers.com/one-video-takes-fitness-app-from-10k-to-40k-mrr
- Buy'r press: https://lifestyle.kbew98country.com/story/1500/buyr-surpasses-50000-users-in-first-week-and-climbs-to-1-on-the-app-store-signaling-a-cultural-shift-toward-economic-transparency/
- GoTall:
  - https://www.starterstory.com/stories/i-can-t-believe-this-app-makes-100k-month
  - https://www.stork.ai/blog/the-100kmonth-tiktok-app-idea
  - https://apps.apple.com/py/app/gotaller-height-predictor/id6753605862 (clone)
- Stella: https://www.starterstory.com/stories/she-built-this-300k-month-app-in-60-days
- Snag: https://www.stork.ai/blog/es/the-4-hour-30kmo-app-blueprint
- Chart Detector AI: https://finance.biggo.com/news/3d134c33f35c1357
- Jungle: https://superwall.com/blog/this-ai-study-app-makes-usd100k-mo-heres-how-no-code
- Coconote:
  - https://www.revenuecat.com/blog/growth/brett-zack-coconote-sub-club-podcast-2026
  - https://www.arr.club/coconote/how-coconote-bootstrapped-to-6-7m-arr-and-acquired-by-quizlet-in-2-years
- Turbo AI: https://techcrunch.com/2025/10/23/20-year-old-dropouts-built-ai-notetaker-turbo-ai-to-5-million-users/
- Halo AI: https://www.buzzsprout.com/2522779/episodes/18958462-dillion-verma-0-to-300k-mo-in-45-days-with-my-ai-app-just-copy-me
- Pingo AI: https://www.ycombinator.com/companies/pingo-ai
- Flamme: https://www.stork.ai/blog/how-5-phones-built-a-10kmonth-app
- Brainrot: https://www.wearefounders.uk/he-built-an-app-to-fix-his-phone-addiction-it-made-26k-in-30-days/
- BePresent: https://bulletpitch.beehiiv.com/p/bepresent
- Touch Grass:
  - https://techcrunch.com/2025/03/17/this-app-limits-your-screen-time-by-making-you-literally-touch-grass/
  - https://yourstory.com/2025/04/touch-grass-app-social-media-detox-rhys-kentish
- Steppin: https://www.fastcompany.com/91264345/this-app-locks-you-out-of-social-media-until-you-go-for-a-walk
- BuyBye: https://superwall.com/case-studies ; https://apps.apple.com/us/app/-/id6744707747
- ToneAdapt: https://trustmrr.com/founder/kyanbuilds ; https://www.stork.ai/blog/this-bros-ai-built-a-25kmo-tone-machine
- PropGPT: https://trustmrr.com/startup/propgpt-ai-props-analysis
- Floga / Latvian portfolio:
  - https://www.buildmvpfast.com/blog/portfolio-app-strategy-multiple-apps-revenue-solo-founder-2026
  - https://www.indiehackers.com/post/tech/from-physical-product-to-10k-mo-app-JLVZDxJ9RfjdYdvINqgp
- Tea:
  - https://appfigures.com/resources/insights/20251017?f=2
  - https://techcrunch.com/2025/10/22/apple-confirms-it-pulled-controversial-dating-apps-tea-and-teaonher-from-the-app-store/
- App Mafia / Umax / RizzGPT: https://il.ly/blog/app-mafia
- Bible Chat:
  - https://x.com/StevenCravotta/status/1899897706312577285
  - https://appfigures.com/resources/insights/20250418?f=5
- Puff Count: https://saas-accelerator.beehiiv.com/p/why-i-sold-my-44k-mrr-app
- HabitKit: https://www.revenuecat.com/blog/growth/sebastian-rohl-habitkit-launched-podcast-2026
- Starter Story trends: https://yuanchang.org/en/posts/dumb-iphone-apps-making-rich/
- TikTok-driven $10K apps: https://stealwhatworks.com/blogs/news/apps-over-10k-month-through-tiktok
- Survivorship-bias caveat: https://getappniche.com/guides/ios-app-success-stories
- RevenueCat SOSA 2026: https://www.revenuecat.com/state-of-subscription-apps
- a16z Top 100 (6th ed., Mar 2026): https://a16z.com/100-gen-ai-apps-6/
- Calorie-tracker saturation: https://www.mycallie.app/en/blog/best-ai-calorie-tracker-apps-2026 ; https://platelens.app/blog/best-calorie-tracking-apps-2026
- Quit-porn saturation: https://tryneuroapp.com/blog/best-porn-addiction-apps-2026/

## 5. Gaps / not verified
- No Sensor Tower or Appfigures numbers were pulled directly for Erly, Wayk or Pushscroll. All revenue figures for them are self-reported or come from estimator sites.
- Halo AI's product could not be identified.
- 3AK's numbers come only from a Starter Story recap.
- The Sub Club 2026 episodes were not listened to in full.
- The web-search budget ran out before I could check Alarmy's Sensor Tower figure or Erly's retention or churn.
