# Faith app market, demand, distribution and monetization ("scripture before scroll")

Research date: 2026-10-03. Track 3 of the faith-app study.

**Evidence grades**
- **A**: primary source or audited data (company press, App Store/iTunes API, Barna release).
- **B**: reputable secondary source (trade press, analytics firm snippet, case-study blog quoting founders).
- **C**: estimate, third-party scrape, or single anecdote.

**Method caveat:** this session's WebSearch budget was exhausted, and Brave/Bing fallbacks were rate-limited
after a few queries. The evidence below comes from WebFetch on known URLs, the iTunes Search API (a full
competitor scan), App Store review pages, and the repo's earlier research in `docs/app-opportunities/`.
Items marked **UNVERIFIED** could not be checked this session.

---

## 0. Headline finding: the exact concept is already a crowded category

I scanned the iTunes Search API with 26 queries (prayer lock, bible app blocker, salah lock, and so on). I
kept apps whose description combines app blocking or Screen Time with faith content and that were released
in or after 2024.

- **About 140 faith "lock" apps, of which 111 launched in 2026 alone** (28 in 2025, 1 in 2024). About 41
  of them are Muslim (salah) or other-faith variants. (A, raw API counts; the filter is heuristic, so read
  it as roughly ±15.)
- Only 8 have 1,000 or more US ratings. The leaders by ratings:

| App | Launched | US ratings | Price seen | Notes |
|---|---|---|---|---|
| Bible Mode: Reduce Screen Time (Friday Labs) | May 2025 | 12.4K, 4.9★ | 3-day trial; had a "GenZ version" | Widgets plus blocking plus AI Bible chat |
| Pray Screen Time – Bible Focus (Manifest Automation) | Nov 2024 | 9.7K, 4.9★ | ~$50/yr, 3-day trial, ads in free tier | Earliest of the leaders |
| BibleScroll: Christian Focus (Screen Detox Inc) | Feb 2026 | 5.8K, 4.8★ | $10/wk or $60/yr, hard paywall | **Blocks apps until you read in YouVersion.** This is the "spend N minutes in YouVersion" idea, already shipped |
| Sanctify – Prayers & App Block (Sacred Studios) | Oct 2025 | 3.4K | – | "Made by Christians for Christians" |
| Just Pray (Muslim) | Aug 2025 | 4.7K | – | |
| Aqimo: Salah Focus | Dec 2025 | 1.4K | – | |
| Bible Focus: Earn Screen Time | Jun 2025 | 1.2K | – | |
| Bible Break: Screen Time Limit | Dec 2025 | 1.2K | – | |
| Heaven: Prayer Lock & Bible (Turkish studio) | Mar 2025 | rating reset | $3.99/wk, $14.99/mo, $59.99/yr | Took over the old Brainrot app id |

Adjacent winners: **Scroll The Bible** (Dec 2025, 16.1K ratings) turns the Bible into a vertical "doomscroll"
feed, and **Bible Widgets** (Monkey Taps, May 2025, 115.8K ratings) does verse widgets.
Source: `https://itunes.apple.com/search?...`. The raw JSON is in the scratchpad (`it_*.json`, `it2_*.json`).

**What this means:**
- The mechanic is not a moat. It is the default 2026 "vibe-coded faith app."
- The long tail (100+ apps with fewer than 100 ratings) shows that most entrants get no traction.
- Winning would depend on distribution and brand, not on the lock itself.
- Locturne's Screen Time engine is table stakes here, not an edge.

---

## 1. Market size and growth

### Revenue of faith apps

| App | Figure | Grade | Source |
|---|---|---|---|
| Hallow (Catholic; Christian more broadly) | **April 2025 net revenue $9.7M** (Lent/Easter month) | B (Appfigures, via search snippet; page returned 403) | https://appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue |
| Hallow | About $40M net revenue in 2025 | B (repo research citing Appfigures) | same, and `docs/app-opportunities/3_DEMAND_NICHES.md` |
| Hallow | "$51.4M annual income" estimate; 20M+ downloads; $157M+ raised | C (journalist estimate) | https://unherd.com/2025/05/you-wont-find-god-on-your-iphone/ |
| Hallow | 22M+ downloads (Sep 2026); 1B+ prayers (Jun 2025); 2,000+ parishes and schools partnered for 2026–27 | A (Hallow press feed) | https://hallow.com/blog/category/press-release/feed/ |
| Hallow | US App Store: 4.9★ from 378K ratings; $9.99/mo, $69.99/yr; family $119.99; student $2.50/mo | A / B | App Store; https://research.contrary.com/company/hallow |
| Hallow | Sensor Tower public estimate "1M downloads, $1M revenue last month" (Mar 2026) | C (ST public pages often understate; this conflicts with Appfigures) | app.sensortower.com/overview/1405323394 |
| Hallow | About $105M total funding (Jan 2025); ~40% of users not Catholic (Aug 2024) | B | Contrary Research |
| Bible Chat (Bookvitals, Romania) | About $15M annualised, 10M users, $14M Series A (Feb 2025) | B | romania-insider (repo research) |
| Bible Chat | About $250–300K MRR (Mar 2025); "90%+ of TikTok views are paid" | C | X / Steven Cravotta, Appfigures insight 20250418 (repo research) |
| Bible Chat | Estimated $450K/mo, ~1.25M monthly installs; 4.9★ from 364K US ratings; soft paywall, 7-day trial then weekly | C (screensdesign) / A (ratings) | https://screensdesign.com/showcase/bible-chat-daily-devotional |
| Haven – Bible Chat (E12 Holdings) | Estimated $400K/mo; 149K US ratings; 19-step quiz onboarding; personalised paywall; 7-day trial then weekly | C | https://screensdesign.com/apps/haven-bible-chat/ |
| Bible BFF | $60K MRR and 60K downloads within ~1 month of its July 2025 launch; $6.99/wk hard paywall | B (SGE, founder-sourced) | https://www.socialgrowthengineers.com/newly-released-gen-z-bible-is-now-a-60k-mrr-app |
| Bibly | 60K downloads, $10K MRR in its first month (2026) | B | https://www.socialgrowthengineers.com/30-day-app-breakthroughs |
| Unchaind (faith-based quit-porn) | "€875K ARR in 16 days"; acquired by Rocapine | B | https://superwall.com/case-studies/unchaind |
| YouVersion (Life.Church, nonprofit, free) | 1B+ installs; ~1B app opens every 40 days; 670M+ plan completions; 14M US ratings, #2 in Reference. Funded by donations and Hobby Lobby's David Green | A | https://www.youversion.com/press ; Wikipedia |
| Pray.com | 18M+ downloads; ~$34M raised; data-broker and breach controversies | B | Contrary; Wikipedia |
| Glorify | About $84M raised (per Contrary); current revenue **UNVERIFIED** | B | Contrary |
| Abide, Lectio 365, Dwell | **UNVERIFIED** (no data retrieved this session) | – | – |
| Faith-lock apps (Bible Mode, Pray Screen, BibleScroll) | **No public revenue found.** Ratings suggest roughly 100K–500K lifetime downloads for the leaders (C, my inference at ~1–3% rating rate) | C | – |

**Read:**
- Faith is a proven, sizeable subscription category, with at least five apps at $5M–$50M a year.
- The money concentrates in:
  - one premium content brand (Hallow, carried by Catholic institutions plus celebrities);
  - paid-UGC AI chat studios (Bible Chat, Haven).
- No faith-lock app has visible public revenue yet.

### Demand: the "faith revival" evidence is mixed

**United States (Barna):**
- **Weekly Bible reading jumped in one year.** It rose from 30% to 49% for Gen Z and from 34% to 50% for
  Millennials (2024 to 2025). (A, Barna) https://www.barna.com/research/barna-trends-2025-pt-1/
- **Gen Z churchgoers now attend 1.9 weekends a month**, the highest Barna has recorded.
  (A) https://www.barna.com/research/barnas-top-trends-of-2025-part-2/
- **Men outpace women.** 43% of men vs 36% of women attend weekly in 2025, the largest gap in Barna's 25
  years of tracking. Younger men now read the Bible more than younger women. (A; n = 5,580 online,
  Jan–Jul 2025) https://www.barna.com/trends/church-attendance-women-men/

**Counter-evidence (B):**
- Christianity Today (Apr 2026) says there is "no institutional revival."
- Pew finds "no clear evidence of a youth revival."
- Gallup puts confidence in organised religion at 36%.
- It describes spiritual curiosity without institutional trust.
- https://www.christianitytoday.com/2026/04/quiet-revival-that-wasnt-gen-z-church-america/

**UK "Quiet Revival": the report was WITHDRAWN on 26 Mar 2026.**
- The original claim was that 18–24 church attendance rose from 4% to 16% (young men 4% to 21%).
- YouGov admitted it had "failed to activate key quality control technologies" (fraudulent panel responses).
- **Do not cite it as evidence.** (A)
- https://www.christiantoday.com/news/bible-society-withdraws-quiet-revival-report-as-it-admits-data-was-faulty

**Bible sales:**
- US Bible sales in 2025 were the highest in 21 years: +12% on 2024 and double 2019.
- UK physical Bible sales rose 27.7% in 2025 (SPCK).
- (B) https://www.christian.org.uk/news/bible-sales-reach-record-high-as-gen-z-shows-increasing-openness/
- The repo's earlier "+14%" figure for 2025 conflicts with this source's 12%. Treat it as roughly +12–14%.

**#ChristianTok scale: UNVERIFIED.** TikTok tag pages could not be fetched. Indirect evidence that it is
large:
- Bible BFF earned 13.1M views across 49 accounts.
- Bibly's partner creator had multiple videos over 1M views.

---

## 2. UGC playbooks that worked

- **Bible BFF (B):**
  - 49 owned TikTok accounts produced 13.1M views, 349K shares and 208K bookmarks.
  - Hook (Aug 10, 2025): "Just found out there's a girl who read the entire Bible like she's spilling tea."
    It got **5.6M views, 1M likes and 120K bookmarks**, and pushed the app to #4 in Reference by Aug 12.
  - The format was female-led, with in-car POV videos; one creative format ran at volume; "Bible as
    gossip/entertainment, not Sunday school."
  - Source: SGE (above).
- **Bibly (B):** monetised an existing Christian creator who "reacted to Christian clips, pointed out
  mistakes, added biblical context." Several videos passed 1M views.
- **Bible Chat (C):** over 90% of its TikTok views are *paid* (Spark Ads / paid UGC). A studio model.
- **Hallow (A/B):**
  - Celebrity and mass media, which is not replicable for a solo founder.
  - Super Bowl LVIII spot (Feb 11, 2024, three days before Ash Wednesday) with Mark Wahlberg and Jonathan
    Roumie. It made Hallow the first religious app to reach #1 overall on the App Store.
  - Other celebrities: Chris Pratt; Liam Neeson, which backfired.
  - Institutional distribution through 2,000+ parishes and schools.
- **Pray.com (B):** "imitate, iterate, innovate" by copying Calm/Headspace formats (bedtime Bible stories).
  - TV ads worked for its older demographic.
  - One Meta creative carried tens of thousands of dollars of spend a day until Meta pulled it.
  - Advice: cap any single creative at 30% or less of spend.
  - Source: Sub Club episode (repo `docs/sub-club/batch-05.md`).
- **"Phone addiction plus faith" on TikTok:** I could not retrieve specific viral videos or view counts
  (search was blocked). **UNVERIFIED.** The supply side is clear, though: 111 lock apps launched in 2026
  and App Store copy says "reach for your phone before you reach for God" and "Biblemaxxing." The angle is
  almost certainly being pushed. Before building, he should run a manual check of TikTok searches for
  "prayer lock," "Bible Mode app" and "BibleScroll."

**Hooks likely to work (C, inference from the BFF, Opal and Quittr patterns):**
- POV confession: "my phone won't open TikTok until I read my Bible."
- Screen-time before/after screenshots: "I went from 9h of TikTok to…"
- Reaction or stitch to ChristianTok creators.
- Lent / New Year challenge framing.

---

## 3. Monetization

**Price points seen:**

| App(s) | Price | Model |
|---|---|---|
| Hallow | $69.99/yr, $9.99/mo | Freemium plus trial |
| Bible BFF | $6.99/wk | Hard paywall |
| Bible Chat, Haven | Weekly after a 7-day trial | Soft paywall (Bible Chat: 10 free questions a day) |
| Faith locks: Heaven | $3.99/wk, $59.99/yr | – |
| Faith locks: Pray Screen | ~$50/yr | Free tier with ads |
| Faith locks: BibleScroll | $10/wk or $60/yr | Upfront, no trial |
| Muslim Pro | $29.99–$49.99/yr | Ads plus subscription |

**"Selling God's word" backlash: real but small in reviews, louder in media.**
- **Media and critics (B):**
  - UnHerd (Giles Fraser, May 2025) compared Hallow's $69.99 to "medieval indulgences."
  - Crisis Magazine attacked the "problematic monetization and celebritization of prayer."
  - Pray.com's head of growth: "some users think faith content should be free," so they keep a free tier
    and answer every review.
- **App Store reviews (A, quoted on the review pages):**
  - Hallow: about 1 in 10 shown reviews mentions price at all, and it is mild ("once you get past the
    paywall").
  - Bible Chat: no "selling God" complaints among those shown. Users say "I never buy subscriptions but
    this one was a must."
  - **The faith-lock apps get the harsher complaints:**
    - Pray Screen: "I just spent $50 for the year for an app that shows me an extremely short prayer once
      a day" (2★). "I feel like I've flushed $60 down the drain" (2★). "You need to watch a minimum of two
      30 second ads just to complete the prayer" (3★).
    - BibleScroll: "Upon install you have to pay for a year upfront" (3★). "I paid the $60 without testing…"
      (1★). Also: "At $10/wk, it is the most expensive subscription service I have. I think everyone should
      at least try it one week" (5★).
- **Takeaway:**
  - Users accept paying for *content and production value* (Hallow).
  - They resent paying for a thin lock wrapper around a short prayer.
  - Ads inside a prayer are an especially bad look.
  - A free daily verse or prayer, with payment for depth, is the safer framing.

**Trial-to-paid benchmarks (A, RevenueCat / Adapty, from repo research_5):**
- Health & Fitness: download-to-trial 6.9% and trial-to-paid 37.7%.
- Hard paywall: D35 conversion 12.1% vs 2.2% for freemium, with no 1-year retention penalty (27% vs 28%).
- **Lifestyle: a trial *lowers* LTV (−21%), and lifetime purchases make up 26% of Lifestyle revenue.**
  Faith apps usually list under Lifestyle or Reference, which argues for a lifetime option.

**Donations and tips (A):**
- YouVersion is fully donor-funded (Life.Church, David Green).
- Hallow has a "How can I donate" help article and sells gift cards.
- No evidence was found that tips sustain an indie faith app. **UNVERIFIED.**

**Church / youth-group B2B:**
- **Hallow** partners with 2,000+ parishes and schools for 2026–27 (A). Pricing is not public; the student
  plan is $2.50/mo and educators get 50% off.
- **Youth-ministry resource memberships** exist (Download Youth Ministry: Gold / Gold+ / Starter tiers with
  a 30-day trial). Prices were not shown. **UNVERIFIED.**
- **Judgment (C):**
  - B2B is a slow, relationship-driven sale.
  - Youth groups are mostly minors, and Screen Time "individual" authorization is meant for the device
    owner. Teens raise the `.child` / Family Sharing complexity (see the repo's TEEN_ACCOUNTS.md).
  - Not a fast-cash path. Possibly a later "group challenge" upsell.

**Seasonality (A/B):**
- Lent is the single biggest predictable spike in the App Store:
  - Hallow was top 3 on Ash Wednesday in 2022, 2023 and 2024, and #1 overall in Feb 2024.
  - April 2025 revenue was $9.7M.
- Pray40 participants (sources conflict):
  - 2024: 1M+ (Hallow) or "nearly 1.7M" (Pressenza).
  - 2025: "1.4M+" (ChurchLeaders) or "nearly 2M" (Epiphany).
  - 2026: billed as the "biggest ever"; the figure is UNVERIFIED.
- Other peaks: Easter is YouVersion's highest-engagement day ever; Advent; New Year (a general habit-app
  spike).
- **Next Lent: Ash Wednesday is 10 Feb 2027.** Launching by about mid-January 2027 would catch both New Year
  and Lent.

---

## 4. Retention

- **YouVersion streak and retention data: UNVERIFIED.** No figures were retrieved; its press page lists only
  installs, opens and plan completions.
- **Hallow retention: not disclosed** (Contrary). Its engagement features are Pray40 challenges, Prayer
  Families, and streaks.
- **Category benchmark (A, RevenueCat):** Health & Fitness has the highest trial-to-paid rate but the
  lowest year-1 retention (30.3%). AI-first apps churn 30% faster, which is relevant to Bible Chat clones.
- **Do faith apps retain better than generic habit apps?**
  - No hard data was found.
  - Indirect signals: Hallow's Lent-driven repeat spikes and 1B+ prayers; Bible Chat reviewers say they
    renew.
  - Identity-linked apps retain better (the "Maslow's hierarchy of subscription" framing in Sub Club).
  - Plausible but **unproven** (C).
- **Lock-specific risk (A, reviews):**
  - Lock apps get mechanic complaints: "blocked games even after I pray," "couldn't open any app but there
    was no prayer," "easy to modify the lock timer."
  - Reliability of the Screen Time lock is a retention lever where Locturne's tested engine could genuinely
    help.

---

## 5. Risks

1. **Saturation (A):** about 140 direct clones, 111 of them from 2026; BibleScroll already does the
   YouVersion integration. This is the biggest risk.
2. **Authenticity (B/C):**
   - Hallow's Liam Neeson backlash shows that faith audiences police who represents them. The CEO publicly
     called it a mistake in Dec 2024.
     https://www.ncregister.com/news/hallow-apps-alex-jones-calls-neeson-partnership-mistake
   - Sanctify markets itself as "made by Christians for Christians."
   - A casual or non-religious founder posting faith UGC risks being called out for "grifting."
   - Bible BFF shows that entertainment framing can work, but its creators were plausibly authentic.
   - Mitigation: a believing co-founder or creators, or a founder-on-camera voice that is honest about
     their own faith.
3. **Denominational split (B):**
   - Hallow is Catholic (rosary, saints); Protestant users want ESV/KJV/NIV, plans and devotionals.
   - Content has to choose a lane, or stay generic (verse plus a short prayer) and offer translation choice.
   - Bible Mode added KJV and ESV in response.
   - Licensing note: NIV and ESV text need publisher licences; KJV/WEB/BSB are public domain or free.
     (UNVERIFIED in detail.)
4. **Theological "prayer as a toll" criticism (B/C):**
   - The UnHerd critique ("Prayer is not useful… not just another form of self-management") applies
     *directly* to a lock that makes prayer the price of opening TikTok.
   - No specific article attacking prayer-lock apps was found (UNVERIFIED).
   - Framing matters: "put God first" or "first fruits," not "pay a prayer to unlock."
5. **App Store (B, from repo research):**
   - The Jan 2026 crackdown on free-trial toggle paywalls applies.
   - The Screen Time entitlement is required (Locturne already has it).
   - Faith content is fine in the US. Pray.com was pulled from the China App Store (Feb 2024).
6. **AI-content risk:** AI Bible chat is saturated (Bible Chat, Haven, Creed at 68K ratings, and Bible Mode's
   chat), and doctrinal errors erode trust.
7. **Data and privacy:** Pray.com's breach and data-broker story is a cautionary tale. Prayer content is
   sensitive data.

---

## 6. Expansion: Muslim and other faiths

- **Muslim Pro (A):**
  - 190M+ downloads; 4.7★ from 600K US ratings.
  - Subscriptions at $29.99–49.99/yr, plus ads, which are a source of complaints ("so many ads I barely can
    use the app").
  - Owned by Bitsmedia (Singapore). Revenue UNVERIFIED.
- **Pillars** holds the "design-led, privacy" position vs Muslim Pro (B, repo research).
- **Salah lock is already its own micro-category (A):** about 41 Muslim or other-faith lock apps since 2025.
  Examples: Just Pray (4.7K ratings), Aqimo, Salah Focus, SalahScreen, DeenLock, plus a "Hindu Mode: Pray
  Before Scroll."
- **Salah is a better structural fit for a lock** (five fixed prayer times a day, which a schedule can
  enforce), but competition is already forming.
- A founder outside the faith faces an even higher authenticity bar.

---

## 7. Bottom line for this founder (judgment)

**For:**
- Real willingness to pay in faith.
- A demographic trend (US young men reading the Bible more) that matches his audience.
- A predictable seasonal launch window: New Year, then Lent on 10 Feb 2027.
- The mechanic reuses Locturne.

**Against:**
- The exact product is one of about 140 clones, and three to four leaders are already at 5–12K ratings.
- Revenue for lock apps is unproven.
- Review complaints target "paying for a short prayer."
- The authenticity requirement is strict.
- The theological "toll" critique is ready-made for critics.

**If pursued, differentiate on three things:**
- **Who makes it:** an authentic voice on camera.
- **The content:** a real daily reading or plan, not a one-line prayer.
- **Reliability:** a lock that does not misfire.

Use Hallow-style seasonal challenges for retention spikes. Treat it as a test (two to three weeks of
founder videos before building), not a sure pivot.

---

## Sources (fetched this session)

- Appfigures Hallow Lent (via snippet): https://appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue
- Contrary Research, Hallow: https://research.contrary.com/company/hallow
- Hallow press feed: https://hallow.com/blog/category/press-release/feed/
- Hallow Wikipedia: https://en.wikipedia.org/wiki/Hallow_(app)
- UnHerd critique: https://unherd.com/2025/05/you-wont-find-god-on-your-iphone/
- Crisis Magazine: https://crisismagazine.com/podcast/is-hallow-shallow
- NCRegister, Neeson: https://www.ncregister.com/news/hallow-apps-alex-jones-calls-neeson-partnership-mistake
- ChurchLeaders, Pray40 2025: https://churchleaders.com/news/2213701-hallow-app-ceo-demonic-audio-lent-prayer-challenge.html
- Epiphany, Pray40: https://epiphanyradio.substack.com/p/hallows-pray40-lenten-challenge
- Pressenza, Pray40 2024: https://www.pressenza.com/2025/03/hallow-announces-worldwide-lent-prayer-challenge-leading-up-to-easter-pray40-the-way/
- SGE, Bible BFF: https://www.socialgrowthengineers.com/newly-released-gen-z-bible-is-now-a-60k-mrr-app
- SGE, Bibly: https://www.socialgrowthengineers.com/30-day-app-breakthroughs
- Screensdesign: https://screensdesign.com/apps/haven-bible-chat/ and https://screensdesign.com/showcase/bible-chat-daily-devotional
- Barna: https://www.barna.com/research/barna-trends-2025-pt-1/ , https://www.barna.com/research/barnas-top-trends-of-2025-part-2/ , https://www.barna.com/trends/church-attendance-women-men/
- Christianity Today: https://www.christianitytoday.com/2026/04/quiet-revival-that-wasnt-gen-z-church-america/
- Quiet Revival withdrawal: https://www.christiantoday.com/news/bible-society-withdraws-quiet-revival-report-as-it-admits-data-was-faulty
- Bible sales: https://www.christian.org.uk/news/bible-sales-reach-record-high-as-gen-z-shows-increasing-openness/
- YouVersion: https://www.youversion.com/press , https://en.wikipedia.org/wiki/YouVersion
- Pray.com: https://en.wikipedia.org/wiki/Pray.com
- Muslim Pro: https://www.muslimpro.com/ , https://apps.apple.com/us/app/muslim-pro-quran-athan-prayer/id388389451
- App Store pages and reviews: Hallow id1405323394, Bible Chat id6448849666, Bible Mode id6744124873, Pray Screen id6737241669, BibleScroll id6755406222, Heaven id6740999608
- iTunes Search API competitor scan: https://itunes.apple.com/search?term=...&entity=software&country=us
