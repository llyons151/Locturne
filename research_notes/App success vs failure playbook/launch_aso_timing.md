# Launch mechanics for iOS subscription apps: ASO, timing, featuring, ratings, first 30–90 days

Research date: 2026-10-09. Scope: iOS, mostly US, 2023–2026 evidence where it exists. A recurring caveat: much of the quantitative ASO literature comes from vendors who sell ASO, ads or review tools, and several of the most-quoted figures (featuring uplift, ratings uplift, launch boost) are from 2011–2018. These are flagged inline.

## 1. ASO for a new app (keywords, title/subtitle, screenshots, CPPs, In-App Events, pre-orders, honeymoon boost)

### Takeaway
The first three screenshots, the icon, the title and the rating drive most install decisions. Very few visitors scroll further or read the description, so creative quality matters more than keyword cleverness for a new app. The new-app "honeymoon" ranking boost is an unconfirmed ASO folk theory: the only primary evidence is a 2014 Sensor Tower post with two examples. Developers also reported that new apps barely ranked in search from about 2025 to mid-2026, with some movement around WWDC 2026. Custom Product Pages give small average uplifts (about 3–7%). I found no quantified evidence for In-App Events uplift. Pre-orders count as day-one downloads, but no source quantifies a guaranteed chart lift.

### Cited Findings
**Product page conversion benchmarks**
- AppTweak (H1 2024) puts Health & Fitness page-view-to-install conversion on the iOS App Store at 30.8%, behind Utilities and Finance. The same dataset gives 23.2% on Google Play. — [Adjust, citing AppTweak](https://www.adjust.com/blog/what-is-a-good-conversion-rate)
- Sonar, aggregating StoreMaven, SplitMetrics and Phiture data, gives a lower H&F range of about 15–25% on iOS. Sources differ on whether they mean impression-to-install or page-view-to-install. — [Sonar](https://trysonar.app/blog/app-store-conversion-rate); see also [Adapty benchmarks](https://adapty.io/blog/app-store-conversion-rate/)
- Semnexus (2026) lists typical H&F ranges of 25–40% page-view-to-install. The column labels in the source are unclear. — [Semnexus](https://semnexus.com/app-store-conversion-funnel-impression-to-install-benchmarks-2026/)

**Screenshots**
- "Nearly 100% of users view the first 1–3 screenshots… only 9% scroll through all screenshots." — [PICC](https://explore.picc.co/app-store-screenshots-costing-downloads/)
- Phiture puts the share of users who scroll through screenshots at just 13%. — [Phiture](https://phiture.com/asostack/why-7-seconds-could-make-or-break-your-mobile-app-f41000fb2a17/)
- ButterKit gives an average scroll rate of 17%. — [ButterKit](https://www.butterkit.app/guides/app-store-design-cheatsheet/)
- Sonar attributes to StoreMaven eye-tracking the finding that 60% of users never scroll past the first impression (icon, first 2–3 screenshots, name, rating). It also attributes to StoreMaven that 70% of visitors decide without reading the full description. These are secondary attributions; the original StoreMaven report was not found. — [Sonar](https://trysonar.app/blog/app-store-conversion-rate)
- One source cites a SplitMetrics 2024 report finding that captioned screenshots outperformed captionless ones by 25–30% in conversion rate. The primary report was not verified. — [Sonar, screenshot captions](https://trysonar.app/blog/app-store-screenshot-captions)
- On iOS, the first three portrait screenshots appear directly in search results. — [AppFollow](https://appfollow.io/blog/aso-screenshots-best-practices)

**Custom Product Pages (CPPs) and In-App Events**
- An older AppTweak benchmark found apps saw a 6.6% conversion increase from CPP ad variations (games up to 8%). A later AppTweak report gives an average CVR boost of 3.2%. — [AppTweak CPP guide](https://www.apptweak.com/en/aso-blog/guide-to-custom-product-pages-cpp); [AppTweak CPP + Apple Ads](https://www.apptweak.com/en/aso-blog/apple-search-ads-custom-product-pages-best-practices)
- Only about 31% of top apps use CPPs (AppTweak ASO Benchmarks, via a secondary source). — [AppDrift](https://appdrift.co/blog/app-store-custom-product-pages-guide)
- Apple says In-App Events can appear on the Today, Games and Apps tabs, in search results and on the product page. Apple's examples include "fitness challenges" and seasonal content. — [Apple, Getting featured](https://developer.apple.com/app-store/getting-featured/)
- A 2023 study (via Statista) found that 30% of apps and 40% of mobile games ran in-app events. — [Statista](https://www.statista.com/statistics/1490301/us-apps-aso-ios-in-app-events) (via search snippet)

**Pre-orders**
- Pre-orders download automatically on release day. — [Apple, Getting featured](https://developer.apple.com/app-store/getting-featured/)
- Pre-orders are counted as downloads on the day the app becomes available, which "can result in a significant boost in rankings." This is a third-party guide's claim. — [App Developer Magazine](https://appdevelopermagazine.com/ios-app-pre-ordering-process-guide/)
- Appfigures notes that some apps (for example Apple Music Classical) hit #1 on launch day partly through pre-orders. It is ambivalent ("maybe") about whether this reflected real demand. — [Appfigures](https://appfigures.com/resources/insights/20230421/2-apple-music-classical-hit-a-milestone-but-is-there-real-demand)
- New apps can run a pre-order window of 2–180 days. Sonar calls the ranking boost an "unproven hypothesis" and recommends measuring retained orders and fulfilled downloads. — [Sonar pre-order guide](https://trysonar.app/blog/app-store-pre-order-ios)

**Honeymoon / new-app ranking boost**
- Sensor Tower (2014) claims Apple gives new apps a keyword-ranking boost for about 7 days, then rankings drop sharply. The evidence is two example apps, and the author admits the mechanism is unknown. — [Sensor Tower 2014](https://sensortower.com/blog/why-app-store-keyword-rankings-drop-dramatically-seven-days-after-launch)
- AppFollow calls it a theory held by ASO experts. It cites three US launches where most keyword gains came from the title and subtitle. — [AppFollow](https://appfollow.io/blog/how-to-reach-and-stay-in-the-top-positions-in-the-app-store-after-a-release)
- PricePush (2026) reports that "for about a year, new apps barely ranked on the App Store," and that developers saw rankings move again around WWDC 2026. The author flags the small sample and that this is developer-reported. He reads Apple's direction as a shift from exact keyword matching toward semantic interpretation of metadata, creative and reviews. The post also cites Sensor Tower: the top 1% of publishers take about 80% of new installs. — [PricePush](https://pricepush.app/blog/app-store-rankings-2026)
- Apple's search guidance lists relevance, downloads, ratings and reviews among ranking factors (as summarized by Sonar). — [Sonar pre-order guide](https://trysonar.app/blog/app-store-pre-order-ios)

### Inferences
- For Locturne, screenshot 1–3 plus the icon are the highest-leverage ASO asset. Screenshot captions should carry the core promise ("your apps sleep until you get out of bed"). The description is close to irrelevant for conversion.
- Do not plan around a honeymoon window. If one exists, it is short and unverified. Treat launch week as the time to observe keyword positions daily, not as the strategy itself.
- Given the 2025–26 reports of weak new-app search ranking, organic search alone is unlikely to carry the launch. External traffic (videos), featuring and Apple Ads are the realistic drivers.
- CPPs are mainly useful as Apple Ads or video-traffic landing pages. A CPP per hook (for example "can't get out of bed" or "doomscroll in bed") could be tested, but expect single-digit uplifts.
- An In-App Event around January ("New Year, new mornings" challenge) is a cheap extra surface, also eligible for featuring attachment. Its uplift is unquantified.

### Gaps
- No primary, quantified 2023–2026 study of keyword strategy specific to brand-new, zero-rating apps. Advice found was generic.
- No quantified In-App Event download uplift study was found (AppTweak sells the measurement tool but published no aggregate).
- Original StoreMaven and SplitMetrics screenshot studies could not be opened; figures are secondhand.
- No source verified whether Apple's ranking change around WWDC 2026 is real or lasting.

## 2. Apple featuring: nomination form, lead times, criteria, measured impact

### Takeaway
Featuring Nominations in App Store Connect (launched November 2024) is the official route. There are three nomination types, including "App Launch", which also covers pre-orders. Apple asks for at least 2 weeks' notice on its marketing page, 3 weeks minimum in the help docs, and up to 3 months ahead "for wider consideration". The best uplift data (App of the Day around +685% median weekly US downloads) dates from 2017–18. Uplift is far larger for lesser-known apps than for apps already in their category top 20.

### Cited Findings
- Nomination types are New Content, App Enhancements, and App Launch ("the launch or pre-order of your new app"). — [App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring)
- Form fields: name, type, detailed description (state the purpose and priority, plus specific details and objectives), publish date or range, platforms, countries, localizations, an attached In-App Event, up to 5 supplemental URLs (including public TestFlight links), and "Helpful Details" (accessibility, inclusivity, priority, unique aspects of the app or team). The type can't be changed after submission. — [App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring)
- Lead time: "minimum lead time of 3 weeks" (ASC Help). The marketing page says "at least two weeks' notice", and up to three months in advance for wider consideration. Roles allowed to nominate: Account Holder, Admin, App Manager, Marketing. — [ASC Help](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring); [Apple, Getting featured](https://developer.apple.com/app-store/getting-featured/)
- Apple says it has no checklist. It considers UX, UI design, innovation, uniqueness ("a fresh approach to a familiar category"), accessibility, localization, and the product page (screenshots, previews, description, positive ratings and reviews). All business models are considered. App of the Day is open to new or established apps. If an app is being considered, Apple may email a request for promotional artwork. — [Apple, Getting featured](https://developer.apple.com/app-store/getting-featured/)
- Apple opened self-nomination to all developers in November 2024. — [TechCrunch 2024-11-13](https://techcrunch.com/2024/11/13/apple-now-lets-app-developers-apply-to-be-featured-on-the-app-store)
- Sensor Tower (iOS 11 era, from September 2017) found median US downloads in the week after the feature rose 685% for App of the Day, 802% for Game of the Day, 222% for Stories, and 240% for App Lists. It also found mostly larger publishers being featured, though 29% of featured apps came from publishers with fewer than 10K downloads. — via [9to5Mac](https://9to5mac.com/2018/04/20/ios-11-app-store-developers-are-happy/) and [John Koetsier](https://johnkoetsier.com/?p=11407) (secondary coverage of Sensor Tower and Apptopia)
- Apptopia (30 days of data, 2017) found an average +1,747% boost for apps and up to +2,172% for a weekday feature. Apps already in their category top 20 gained only about 44%. 19 apps went from unranked into the overall charts, and weekday features beat weekend features. — same secondary coverage as above ([MacRumors thread](https://forums.macrumors.com/threads/app-of-the-day-major-download-boost.2080026/), [9to5Mac](https://9to5mac.com/2018/04/20/ios-11-app-store-developers-are-happy/))
- Older Distimo data found the average featured iPhone app rose about 15 rank spots in its first 3 days, but a third saw no gain. PocketGamer reported that featured status "lacks long-term sales appeal". — [TechCrunch/Distimo 2012](https://techcrunch.com/2012/01/26/distimo-getting-featured-in-the-android-market-can-boost-apps-ranking-by-172-while-featured-828-after); [PocketGamer.biz](https://www.pocketgamer.biz/app-store-featured-status-lacks-long-term-sales-appeal/)

### Inferences
- For a January-relevant launch, a nomination should be filed 3+ weeks ahead at minimum, ideally 6–12 weeks. A late-November or early-December nomination targeting early January is in range of the "up to three months" guidance.
- The nomination description should lead with what Apple says it values: native, HIG-faithful UI (fits Locturne's native SwiftUI controls direction), novel use of Screen Time / barometer / motion APIs (innovation), accessibility, and a "fresh approach to a familiar category". A public TestFlight link and an attached In-App Event can go in the same nomination.
- Featuring spikes are large in relative terms for unknown apps but decay quickly. Treat a feature as a burst to convert into ratings and retained subscribers, not as a growth plan.

### Gaps
- No 2023–2026 quantified study of App of the Day or Today-story uplift was found. The 2017–18 numbers predate personalization changes and may overstate current effects.
- No public data on nomination acceptance rates, or on whether hard-paywall subscription apps are featured less often.

## 3. Ratings: early rating count/score and SKStoreReviewController timing

### Takeaway
Moving from 3 to 4 stars is consistently associated with much higher conversion (estimates range from about +46% to +89%). I found no study that isolates rating count. The system caps the review prompt at 3 displays per user per 365 days. Ask after a success moment, never from a button, and never gate the prompt on sentiment.

### Cited Findings
- Alchemer (formerly Apptentive) reports that moving from 3 to 4 stars can raise conversion by 89%. The methodology is not published. — [Alchemer 2022 benchmarks](https://www.alchemer.com/resources/blog/mobile-app-ratings-and-reviews-2022-benchmarks/)
- NP Digital (April 2024, 49 companies) gives a relative download index of 1.00 for 5-star apps, 0.83 for 4-star and 0.57 for 3-star, which implies about +46% for 4 over 3 stars. — [Neil Patel / NP Digital](https://neilpatel.com/marketing-stats/app-downloads-vs-ratings/)
- Apptentive 2015: a 2-star to 5-star move gave about +570% expected conversion. 96% of surveyed users would consider a 4-star app, versus 50% for 3-star and 15% for 2-star (stated intent). — [MarketingProfs](https://marketingprofs.com/charts/2015/27665/how-influential-are-mobile-app-star-ratings); [MarTech](https://martech.org/app-store-ratings-a-single-star-jump-can-mean-340-percent-more-downloads)
- Fiksu observed chart-rank boosts for apps rated ≥4 stars and drops for apps under 3 stars. This is old and possibly experimental. — [TechCrunch](https://techcrunch.com/?p=866402)
- Apple: the system limits the prompt to 3 displays per app per 365 days. Don't call it in response to a button tap, because it may not present. It has no effect in TestFlight. The app decides the timing. — [Apple docs requestReview(in:)](https://developer.apple.com/documentation/storekit/skstorereviewcontroller/requestreview(in:)); [Apple Dev Forums](https://developer.apple.com/forums/thread/81703)
- Gating the prompt behind "Do you like the app?" (a sentiment pre-filter) is cited as a rejection risk under guideline 1.1.7. — [vp0](https://vp0.com/blogs/apple-in-app-store-review-prompt-safely)
- Practitioner guidance: ask after a moment of satisfaction, about once per version, to users active for about a week. These are recommendations, not Apple rules. — [Sonar](https://trysonar.app/blog/how-to-get-app-reviews); [CleverTap](https://clevertap.com/?p=6264)

### Inferences
- For Locturne, the natural success moment is right after a completed morning wake-up ("apps awake"), ideally after several consecutive successful mornings, not on day 1. That spends one of the three yearly prompts on a high-satisfaction moment.
- Apple lists positive ratings in its featuring criteria, so a launch-week ratings base also helps the featuring case. A TestFlight or waitlist cohort that converts on day one can seed early ratings legitimately, without incentives.

### Gaps
- No study isolates rating count (for example 0 vs 20 vs 200 ratings) as a conversion driver. Note that iOS hides the average until enough ratings exist, and the threshold is not documented.
- Ratings-uplift sources are vendors with undisclosed methodologies.

## 4. Launch timing: January seasonality, day of week, pre-orders

### Takeaway
January is reliably the strongest Health & Fitness month. In January 2025, category IAP revenue hit an all-time high of $385M (+10% YoY), and downloads were the highest since January 2022. App-level installs peak in the first week of January. Day-of-week evidence is old and weak. "Avoid Friday; release mid-week" is the most consistent advice, and weekday features beat weekend ones.

### Cited Findings
- January 2025 Health & Fitness: downloads rose slightly YoY to the highest since January 2022. IAP revenue rose about 10% YoY to an all-time high of $385M, attributed to New Year's resolutions. The US was more than half of global H&F consumer spend in 2024. — [Sensor Tower, State of Mobile Health & Fitness 2025](https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025)
- Sensor Tower (2020): "January has consistently been the top month for Health & Fitness app downloads," with 2020 an exception due to lockdowns. — [Sensor Tower](https://sensortower.com/blog/health-and-fitness-app-record-download-growth)
- App-level first-week-of-January peaks: Planet Fitness reached about 81K downloads in the first week of January 2022, and one virtual fitness program in Q1 2021 peaked near 250K in week 1 before declining through March. — [Sensor Tower Q1 2022](https://sensortower.com/blog/2022-q1-android-top-5-health%20and%20fitness-units-us-600af518241bc16eb8dce802); [Sensor Tower Q1 2021](https://sensortower-china.com/blog/2021-q1-unified-top-5-virtual%20fitness%20programs-units-us-63e0fbe2e1714cfff1d8b3b4)
- Day of week: Mobilewalla (2011) found 42% of Sunday-released iOS apps reached the top 240 versus 10% on Friday. Sensor Tower (2015) found no blanket answer, varying by category. A third-party guide advises a Tuesday or Wednesday release on the theory that editorial decisions happen Thursday (unverified). — [TechCrunch 2011](https://techcrunch.com/2011/12/19/sunday-is-the-best-day-to-launch-your-mobile-app); [Sensor Tower 2015](https://sensortower.com/blog/best-days-launch-promote-ios-app-2015/); [App Developer Magazine](https://appdevelopermagazine.com/the-best-day-to-launch-or-market-your-ios-app/)
- Weekday features produced higher download gains than weekend features (Apptopia 2017). — [MacRumors thread / Apptopia coverage](https://forums.macrumors.com/threads/app-of-the-day-major-download-boost.2080026/)

### Inferences
- For a sleep and wake-up app, launching publicly in December with a pre-order or soft launch, then concentrating marketing and an In-App Event on roughly December 26 to January 7, aligns with the strongest H&F demand window. A Featuring nomination should target early January with 6+ weeks' lead.
- Launch on a Tuesday or Wednesday. Avoid Fridays. Note that January 1 2027 is a Friday, so a "resolutions" push is better anchored on Monday January 4 or Tuesday January 5, 2027.
- Expect a January cohort to churn more (resolution behavior). Measure it separately.

### Gaps
- No RevenueCat January-specific trial or conversion data was found, and nothing specific to sleep or alarm apps (versus fitness and gyms) on January seasonality.
- Sensor Tower's 2025 report gave no subcategory figures for sleep or meditation.
- No credible 2023–2026 day-of-week launch study was found.

## 5. Concentrating launch: stacking channels in 48h and chart velocity

### Takeaway
Chart rank is widely believed to weight recent download velocity, but Apple does not publish the formula. Overall #1 needed about 156K downloads in a day in recent years. Category top-10 in H&F likely needs a few thousand iOS downloads a day (an estimate from 2022 data). Indie write-ups show Product Hunt and Reddit yield only dozens of downloads each, while a single press hit or feature dwarfs them. Stacking helps only if the combined burst approaches category-chart thresholds.

### Cited Findings
- Sensor Tower (via TechCrunch) estimated that about 156K downloads in a day were needed for overall #1, up from 114K in 2019, with a 2020 peak of 185K. Downloads are "only one of several factors" in the Top Charts algorithm. Apptopia believes the algorithm weighs velocity, usage, new users and more. — [TechCrunch](https://techcrunch.com/?p=2329196); [iPhone in Canada](https://www.iphoneincanada.ca/2022/06/03/how-many-downloads-does-it-take-to-hit-1-in-the-app-store-and-play-store/)
- Vendor glossaries claim velocity, not total volume, determines chart position, and that rank decays when velocity flattens. These are marketing sources. — [MWM glossary](https://mwm.ai/de/glossary/top-free); [AppSamurai](https://appsamurai.com/glossary/boost-burst-campaign/)
- AppTweak 2022: the #10 iOS US fitness and workout app (Peloton) had 664K iOS downloads from January to October 2022, about 2,200 a day. This is a subcategory list, not the official chart; the per-day figure is the researcher's arithmetic. — [AppTweak](https://www.apptweak.com/en/aso-blog/most-downloaded-fitness-and-workouts-apps)
- Slopes (indie) reported that a TUAW mention drove 164 downloads in one day, while Reddit and Product Hunt produced only a few dozen downloads each. — [Slopes Diaries #7](https://blog.curtisherbert.com/slopes-diaries-7-so-hows-that-going-for-you/)
- Overcast's 2014 launch combined press, a mid-level App Store feature and a burst of tweets on launch day. The result was 319K downloads in 2014. — [marco.org](https://marco.org/2015/01/15/overcast-sales-numbers)

### Inferences
- For Locturne, the realistic chart target is the H&F category chart (or Lifestyle/Productivity, depending on category choice), not overall. Even then, sustaining top 10 needs thousands of downloads a day, so only a viral video or a feature gets there. A 48h stack is worth doing because it costs little, but expect Product Hunt and Reddit to contribute tens of installs, not hundreds.
- The more valuable effect of a concentrated burst is likely fast early ratings and a quick read on conversion and retention data, rather than chart rank.

### Gaps
- No 2023–2026 indie case study with measured chart movement from a 48h multi-channel stack.
- No current published H&F category-chart thresholds; vendors (Appfigures, Sensor Tower) hold these behind paywalls.

## 6. Apple Search Ads (Apple Ads) for a small app at about $60/yr

### Takeaway
2026 H&F Apple Ads benchmarks are about $1.50–1.60 per tap and about $2.40–2.95 per install (US). At a $59.99/yr hard-paywall price, payback within the first year looks plausible if download-to-paid is near RevenueCat's hard-paywall median (10.7%). It fails if conversion is at freemium-like levels (about 2%). This is arithmetic from benchmarks, not a published case.

### Cited Findings
- SplitMetrics (US, April–June 2026) puts H&F at about $1.50 CPT, 62.7% tap-to-install, and about $2.38 CPI. — [SplitMetrics](https://www.splitmetrics.com/blog/apple-search-ads)
- AppTweak US H&F median is $1.59 CPT with 54% generic-campaign conversion, about $2.94 CPI (Sonar's worked example). — [Sonar](https://trysonar.app/blog/apple-search-ads-cost)
- Adwave gives a CPI range of $1.50–$8 for category terms and $0.50–$3 for branded terms. A WatsSpace table claims $3.25–5.25 H&F CPI without citing sources. — [Adwave](https://adwave.com/resources/fitness-app-advertising); [WatsSpace](https://watsspace.com/blog/are-apple-ads-worth-it/)
- RevenueCat SOSA 2026 (via SaaStr) gives median download-to-paid of 10.7% for hard paywalls versus 2.1% for freemium, and 38.7% for the top 10% of hard paywalls. North America download-to-paid across all models is 2.8%. — [SaaStr summary of RevenueCat SOSA](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)
- Adwave: fitness install-to-paid typically runs 3–8%, and 5–15% for well-positioned apps. — [Adwave](https://adwave.com/resources/fitness-app-advertising)

### Inferences (researcher arithmetic, not sourced figures)
- Net first-year revenue per annual subscriber at $59.99 with the 15% Small Business Program rate is about $51.
- At $2.38–2.94 CPI:
  - 10.7% download-to-paid: about $22–27 per payer, roughly 2x return in year 1.
  - 5%: about $48–59 per payer, around break-even.
  - 2%: about $119–147 per payer, a loss.
- Branded and exact-intent keywords ("screen time alarm", "alarm that makes you get up", competitor names) should be cheaper and convert better than generic ones. Run them with a capped daily budget (for example $10–20/day) for 2–4 weeks, judging by cost per trial or per paid user, not CPI.
- Start Apple Ads only once download-to-trial and trial-to-paid are measured from organic users. Otherwise payback can't be computed.

### Gaps
- No published indie case of Apple Ads payback for a hard-paywall annual plan near $60.
- CPT in January is likely higher because of H&F competition. No January-specific CPT data was found.

## 7. Iteration in the first 90 days: metrics and decision thresholds

### Takeaway
Use RevenueCat's medians as the bar. For hard paywalls, download-to-paid is about 10.7% median and 38.7% for the top 10%. Download-to-trial is 8.9% for higher-priced apps versus 4.4% for lower-priced. H&F trial-to-paid is about 39.9% median and 68.3% for the top 10% (SOSA 2025). Half of all paid conversions happen on day 0, and 55% of 3-day-trial cancellations happen on day 0, so the first session decides most outcomes. H&F classic retention is about 8–13% at D7 and 3–8% at D30, depending on source.

### Cited Findings
- SOSA 2026 (via SaaStr):
  - Download-to-paid is 10.7% (hard paywall) vs 2.1% (freemium).
  - Revenue per install at D14 is $2.32 vs $0.27; at D60 it is $3.09 vs $0.38.
  - 50% of paid conversions happen on Day 0.
  - 55% of 3-day-trial cancellations happen on Day 0. Day-0 cancellations are 39.8% for 7-day trials, 35.7% for 14-day and 31% for 30-day.
  - Trial-to-paid is 42.5% for 17–32 day trials vs 25.5% for trials of 4 days or less.
  - Download-to-trial is 8.9% for higher-priced apps vs 4.4% for lower-priced.
  - Median annual price is $34.80.
  - [SaaStr](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)
- SOSA 2025 H&F: median trial-to-paid 39.9%, top 10% 68.3%. H&F monetizes at about 2x other categories, with a median 60-day revenue per install of $0.63. — [Athletech News](https://athletechnews.com/fitness-apps-monetizable-winner-take-all-or-most/); primary at [RevenueCat SOSA 2025](https://revenuecat.com/state-of-subscription-apps-2025)
- H&F trial start rate is about 5–7% of installs at the median and 12–15%+ for the top 5% (agency summary). — [RocketShip HQ](https://www.rocketshiphq.com/?p=5592)
- Retention benchmarks for H&F conflict:
  - One compilation gives D1 about 20%, D7 about 8%, D30 about 3–4%.
  - Another, built on Adjust 2024, gives 27% / 13% / 8%.
  - iOS all-category figures are D1 27%, D7 14%, D30 8%.
  - AppsFlyer found H&F had the highest YoY iOS retention growth (+22%).
  - Sources: [Sonar retention](https://trysonar.app/blog/app-user-retention-benchmarks-and-what-moves-it); [Adjust](https://www.adjust.com/blog/what-makes-a-good-retention-rate/); [AppsFlyer 2025](https://appsflyer.com/?p=453529)
- Phiture's guidance: benchmark against your own cohorts and category, and mind the classic vs rolling definitions. — [Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/)

### Inferences (suggested decision thresholds for Locturne, derived from the medians above)
- **Product page conversion (page view → install):** under about 20% means rework screenshots 1–3 and the icon before buying traffic. The H&F iOS reference band is 25–31%.
- **Install → trial start (hard paywall):** under about 5% means fix onboarding and the paywall; about 9% is roughly the high-price median; 12%+ is a strong signal.
- **Trial → paid:** under about 30% means the trial experience or first mornings aren't delivering; about 40% is the H&F median; 60%+ is top-decile.
- **Download → paid:** under about 5% is a weak hard-paywall result (Apple Ads won't pay back); about 10% is the median; 15%+ means scale paid acquisition.
- **D7 retention (classic):** H&F reference is about 8–13%. A wake-up app used every morning should beat this. Under about 10% suggests the morning loop is failing.
- **Day-0 trial cancellations:** with a 3-day trial, expect about half to cancel on day 0. If that's much higher, the first night/morning setup is the leak, so weigh a 7-day trial, which has lower day-0 cancellation and higher trial-to-paid.
- **Timing:** use the 14-day mark to read paywall and onboarding experiments, because day-0 conversion dominates. Use the 30–60 day mark for trial-to-paid and refunds. Use 90 days to decide on paid scaling.

### Gaps
- Primary RevenueCat 2026 H&F category figures were not verified directly; numbers come via secondary summaries.
- No authoritative iOS-only H&F D7/D30 2025 benchmark; sources conflict and mix definitions.
- No benchmark specific to sleep or alarm utilities, as opposed to fitness.
