# Faith "scripture before scroll" app — competitor landscape

Research date: 2026-10-03. Track 1 of the faith-lock idea (competitors only).

## Method and evidence labels

- **A (primary):** Apple's iTunes Search/Lookup API and App Store product pages (US storefront),
  pulled 2026-10-03. Rating counts are **US-store ratings**, not downloads. Prices are the
  in-app purchase list shown on the App Store page; it mixes current, legacy and A/B-test SKUs.
  Google Play install bands come from Play listing pages.
- **B (reputable secondary):** figures already gathered in this repo from Appfigures, SGE and press
  (docs/app-opportunities/*.md).
- **C (weak):** developers' marketing claims on their own sites, and inference.
- **Limit:** this session had used up its web-search budget, so TikTok, Reddit, Product Hunt and
  press coverage could **not** be searched. Bing/DDG fetches returned nothing useful or a captcha.
  No Sensor Tower or Appfigures revenue figures were found for the dedicated lock apps. Treat the
  marketing column as gaps unless it is cited.
- Raw data: `scratchpad/faith/raw_*.json` (about 40 App Store queries); filtering scripts are in
  `scratchpad/faith/`.

## Headline: the category is saturated on iOS

- About **300 live US App Store apps** combine a faith practice with Screen Time app blocking
  (keyword filter over the App Store search results; ±10% depending on the filter). (A)
- Launch velocity by month of first release: 2025: 2–9 per month. 2026: Jan 13, Feb 27,
  **Mar 40, Apr 41, May 41, Jun 38**, Jul 33, Aug 15, Sep 14. (A) The cloning peak was
  Mar–Jun 2026, and it is still running at about 15 per month.
- Split: roughly 155 Christian (Protestant-generic), ~100 Muslim (salah lock), ~8 Catholic,
  ~6 Jewish, a few LDS, Hindu and Sikh. (A, keyword classification)
- Concentration: only **~10 apps have ≥1,000 US ratings**, ~37 have ≥100, and **~240 have fewer
  than 20**. A long tail of vibe-coded clones (names such as "Prayer Lock: X", "Bible Lock",
  "FaithLock", "PrayLock" are each reused by 3–6 different developers). (A)
- **New, important:** **Book Vitals Inc. (Bible Chat, ~$15M annualised revenue, B) shipped
  "Bible Chat Lock: App Blocker" on 2026-10-02**, the day before this research. It sets hours,
  holds apps, and asks "for a moment with God first". The largest Christian app studio has
  now entered. (A) https://apps.apple.com/us/app/id6814801984
- **The "use your existing prayer app" gap is partly taken:** **BibleScroll (Screen Detox Inc,
  the maker of BePresent, 65.9K ratings)** "blocks your most distracting apps, every day, until
  you spend time reading the Bible… connected directly with the YouVersion Bible app." It has
  5,771 ratings and launched 2026-02-01. **Attend** (launched 2026-09-22) also offers an
  optional YouVersion connection. (A)

## Tier 1: leaders (Christian)

| App (developer) | Launched | US ratings / score | Price (IAP list) | Unlock mechanic | Notes |
|---|---|---|---|---|---|
| **Bible Mode: Reduce Screen Time** (Friday Labs LLC) [link](https://apps.apple.com/us/app/bible-mode-reduce-screen-time/id6744124873) | 2025-05-02 | **12,427 / 4.92** | "Supporter" SKUs $4.99–$59.99; annuals at $39.99 and $59.99 | **Scan a physical Bible page with the camera** or do an in-app verse reflection; "just 2 minutes" | Site claims "200,000+ Christians" and "15,000+ five-star reviews" (C, self-reported) https://www.biblemode.app. Has added Bible chat, Quiet Time, games, sleep stories, widgets. iOS only. The category leader. Reviews praise accountability and ADHD help; no low-star reviews were shown on the page. |
| **Pray Screen Time – Bible Focus** (Manifest Automation) [link](https://apps.apple.com/us/app/pray-screen-time-bible-focus/id6737241669) | 2024-11-15 (first mover) | **9,671 / 4.88**; Android 10K+ installs, 4.8 (2.57K reviews) | Pro $7.99–$9.99 weekly/monthly, $29.99–$59.99/yr; free tier with ads | A short prayer before unlocking; a rule set per app | Last updated 2025-09-19, so it may be stagnating. Complaints (A): "$32 a month???"; **must watch 2×30s ads to unlock** on the free tier; ads glitch; "same prayer every time"; a March update blocked a whole category even after praying; no trial. |
| **BibleScroll: Christian Focus** (Screen Detox Inc / BePresent) [link](https://apps.apple.com/us/app/biblescroll-christian-focus/id6755406222) | 2026-02-01 | **5,771 / 4.82** | Pro $9.99/wk, $59.99/yr; "annual donation" SKUs $25–$199.99 | **Reading time in YouVersion** unlocks the apps; 7-day trial, then subscription | Backed by an established screen-time studio. Complaints (A): "easy to modify the lock" (weak enforcement); paid $60 before testing; a session was lost when the phone slept. |
| **Sanctify – Prayers & App Block** (Sacred Studios) [link](https://apps.apple.com/us/app/sanctify-prayers-app-block/id6751909914) | 2025-10-10 | **3,393 / 4.84** | $5.99/wk, $49.99/yr, $19.99/yr win-back | "Faith Lock" pauses IG/TikTok/Snap/X until a moment of prayer and Scripture | Copies Bible Chat's description style ("top Christian app"). Complaints (A): long emotional onboarding, then a hard paywall; "won't let you delete it" (likely a Screen Time auth confusion). |
| **Bible Focus: Earn Screen Time** (Rewired LLC) [link](https://apps.apple.com/us/app/bible-focus-earn-screen-time/id6747103808) | 2025-06-12 | 1,191 / 4.81 | $4.99/wk, $12.99/mo, $29.99–$79.99/yr | **Coin economy**: pray, meditate, scan your Bible, take quizzes, **check into church (geofence)**, then spend coins on app time; cost escalates | Reviews name the creator "BiblewithDaniel" as the referral source (A: influencer marketing). Complaints: paywall ("Should God be free?"), bugs, no KJV; mentions "RIP Romans app" (apparently a predecessor or competitor). |
| **Bible Break: Screen Time Limit** (Code By Cutting) [link](https://apps.apple.com/us/app/bible-break-screen-time-limit/id6755405918) | 2025-12-05 | 1,190 / 4.75; Android 10K+, 4.4 | $5/mo, $9.99, $29.99–$39.99/yr | **1 verse read = 1 minute of screen time** | Complaint (A): "minutes don't line up" with actual reading time. |
| **Faith Mode – Christian Habits** (Max Mode LLC) [link](https://apps.apple.com/us/app/faith-mode-christian-habits/id6761586723) | 2026-04-05 | 986 / 4.84 | $4.99/wk, $44.99/yr; **student $1.99/wk, $19.99/yr** | Read Scripture or pray to unlock; compares Bible minutes with distraction minutes | Reviews cite **TikTok discovery** (A). Complaints: not free; a forced AI-journal consent. |
| **Bible Widget: FaithLocked** (V. C. González Martín) [link](https://apps.apple.com/us/app/bible-widget-faithlocked/id6764309082) | 2026-05-28 | 886 / 4.84; **Android 10K+, 4.9 (3.05K)** | $9.99/wk, $19.99–$49.99/yr, **$149.99 lifetime**, coins and streak freezes | Locks apps at scheduled prayer times; the free plan gives 2 prayers a day | Freemium with a gamified economy. Updated today. |

## Tier 2: notable smaller or adjacent Christian apps (all A)

| App | Launched | Ratings | Price | Mechanic or angle |
|---|---|---|---|---|
| PrayLock (Ruvix) id6741477596 | 2025-03 | 383 | $4.99/wk, $9.99–$39.99/yr | Pray once a day for loved ones to unlock |
| Alma: Prayer Lock & Bible chat (Committed Tech) id6760668380 | 2026-04 | 382 | $3.99–$5.99/wk, $39.99–$49.99/yr | Morning lock until prayer, devotional and feelings check-in |
| Bible Lock: Put God First (MJH Ventures) id6754575475 | 2026-01 | 321 | $4.99–$39.99; **"Sponsor 3 People" $69.99** | Read today's Scripture to continue; web filter |
| praise lock (You Can Just Do Things LLC) id6759266143 | 2026-03 | 279 | $7.99–$29.99/wk, $39.99–$79.99/yr | Mood, then an AI-generated prayer, then unlock |
| Bible Focus – App Blocker (Daniel Ni) id6758116005 | 2026-03 | 198 | $29.99–$59.99/yr | Read a verse to unlock; iOS 26+ |
| Prayer Screen (D. Ruzzman) id6770019309 | 2026-07 | 174 | $4.99/wk, $39.99/yr | "Hold to pray", scheduled hours, verse feed |
| Put God First (Stay Here **Nonprofit**) id6759613793 | 2026-03 | 139 | sub + lifetime | Morning-anchored lock |
| BibleSwipe: Stop Doomscrolling id6791399960 | 2026-08 | 103 | – | Swipe-feed substitute |
| Prayblock / Praymate (Nutrico) id6747301595 | 2025-11 | 68 | $3.99–$4.99/wk, $29.99–$39.99/yr | Pray to unlock |
| **Scripture Before Scroll** (James Liberty) id6771953135 | 2026-05 | 38 | no IAP listed | **The exact proposed name is already taken** |
| Prayerful – Pray to Unlock, Mercy, Lock&Pray, HolyLock, GraceLock, Verse Lock, Selah: Pause Before You Scroll, selah lock, Selah: Screen Time App, Type the Verse: Bible Lock, VerseLocked, DuoFaith, Doorpost: Bible Unlocks Apps, Holy Mode, FaithKey, Biblemaxxing… | 2026 | 0–30 each | $3.99–$9.99/wk, $29.99–$59.99/yr typical | Variants of pray, read or type a verse to unlock |
| **Attend: Christian Screen Time** id6811427451 | 2026-09-22 | 0 | – | Read a passage to continue; optional YouVersion connection |
| **Bible Chat Lock: App Blocker** (Book Vitals) id6814801984 | **2026-10-02** | 0 | – | Scheduled holds plus a "moment with God" before opening |
| Android only: "prayer lock: christian focus" (Covenant Studios LLC) `com.maubaron.prayerlock` | – | **Play 100K+ installs, 4.6 (10.4K reviews)** | – | Could not find an iOS twin. The largest Android player found. |

Non-blockers that compete for the same "phone into faith" job: **Scroll The Bible** (16,107
ratings, Dec 2025; a TikTok-style verse feed, no blocking); **Bible Widgets** by Monkey Taps
(115,778 ratings; lock-screen verses, no blocking); Bible Chat (364K); Haven (149K);
Creed (68K). (A)

**Big incumbents:** Hallow (378K ratings), YouVersion (13.8M), Glorify (99.9K), Pray.com (193K),
Abide (122K) and Dwell (87K) — **none mentions app blocking or Screen Time in its App Store
description** as of 2026-10-03. (A) Book Vitals is the first large faith studio to enter, and it
did so with a separate app rather than a feature.

## Catholic

- **Little Way: Catholic Prayer** (Refine Journal LLC) id6760742231 — 262 ratings, 4.94,
  2026-03. "Prayer Shield": a Hail Mary **for a real person who asked for prayer**, then the app
  opens. Premium $9.99/mo, $59.99/yr, $79.99 founding lifetime. The same developer also makes
  "Biblemaxxing: Bible App Lock". (A)
- **Damascus** (Damascus Inc., Catholic ministry) id6755117736 — 607 ratings, 4.91, 2026-05.
  "Scripture Before Scrolling — let prayer be the key that unlocks your phone", inside a full
  Catholic suite (Mass readings, rosary, team leaderboards, events). Damascus+ $7.99/mo,
  $59.99/yr, **Family $119.99/yr**. (A)
- Rosary Lock: Pray Then Scroll (24 ratings, $29.99–$59.99/yr), CathoLock (6), Crucis,
  Rosary First. (A)
- Hallow, the dominant Catholic app (~$40M net revenue in 2025, B, Appfigures via repo doc),
  has **no lock feature listed**. This is the clearest incumbent gap, but Damascus and Little Way
  are already working on it.

## Muslim (salah lock), the most mature analogue

The mechanic differs: apps are blocked **at the five prayer times** (adhan-scheduled
DeviceActivity), with "confirm you prayed" to unlock.

| App | Launched | US ratings | Android | Price |
|---|---|---|---|---|
| Just Pray (Ihsan Studios) id6747154163 | 2025-08 | 4,747 | – | $3.99–$5.99/wk, $8.99/mo, $29.99–$39.99/yr, **Family $79.99/yr**; "Circles" accountability |
| Prayr – Salah & Focus id6752878561 | 2025-10 | 1,467 | **50K+**, 4.9 | $4.99–$8.99, $19.99–$49.99/yr |
| Aqimo: Salah Focus id6754220985 | 2025-12 | 1,373 | – | $19.99–$49.99/yr |
| Salah Focus: Prayer Locker id6755317094 | 2025-11 | 861 | – | $4.99–$9.99/wk, $12.99/mo, $49.99/yr |
| SalahScreen id6748571304 | 2025-10 | 451 | – | $2.99–$9.99, $29.99–$49.99/yr |
| Deenback, Salah Lock, Sukoon, SalahMode, Quran Unlock, Prayer Pause, 5Locks, Taqwa, Noor, Qif, … | 2025–26 | 20–420 | Prayer Time App Blocker (Urban Software Lab) 10K+ | similar |

FivePrayer (14,607 ratings, Feb 2026) is a salah tracker with a reminder overlay, not
FamilyControls blocking. (A)

## Jewish, LDS and other faiths (all tiny)

Torah Lock – Daily Tehillim (42 ratings), Daven Lock: Personal Siddur (19), Torah First,
ShabbatLock, Boker Tov, Prayer Lock Jewish (launched 2026-10-01); PonderLock: LDS (16),
Disciple Mode (104, LDS-leaning by classifier, unverified); Dharma Lock (Hindu, 46),
Hindu Mode, SimranLock (Sikh). (A) Every religion now has at least one clone.

## Hardware (Brick-like)

Nothing faith-branded was found. Search was not possible this session; unverified.

## Pricing norms (A)

- The modal structure is **$4.99–$9.99/week or $29.99–$59.99/year**, with a 3–7 day trial and a
  hard paywall after an onboarding quiz.
- Lifetime offers run $79.99–$149.99.
- Family plans exist only in Damascus ($119.99) and Just Pray ($79.99).
- "Donation/sponsor" SKUs (BibleScroll, Bible Lock) are a faith-specific tactic to absorb
  "should God be free?" objections.
- The most repeated review complaint across the category is **"I have to pay to pray?"**. The
  next most common are weak enforcement, unlock bugs and ads that gate prayer.

## Marketing (what the evidence shows)

- **Reviews name TikTok and faith creators as the discovery channel:** Faith Mode ("saw this app
  on TikTok"), Bible Focus ("BiblewithDaniel showed me this app"), Bible Mode ("I seen someone
  post about this app"). (A, review text)
- Category analogues from repo research: Bible BFF ran **49 owned TikTok accounts**, reaching
  $60K MRR in about a month (B, SGE). Bible Chat drives 90%+ of its TikTok views through paid
  placements (B).
- Not verified this session: each competitor's TikTok handle, follower counts and ad spend.

## Assessment

### How crowded
Extremely. About 300 iOS apps; peak cloning of ~40 per month in Mar–Jun 2026. Leaders have
~6–12K US ratings after 8–17 months. A BePresent-backed entrant already offers the
YouVersion-integration angle, and Bible Chat's studio entered on 2026-10-02. The
"verse/prayer to unlock" mechanic is fully commoditised and buildable in days from Opal/Screen
Time templates. The roughly 240 apps with fewer than 20 ratings show that shipping one is easy
and getting distribution is the real problem.

### Who is winning
1. **Bible Mode**: first to scale. Its physical-Bible-scan gimmick is very demonstrable on
   video. Claims 200K users (C). 12.4K ratings.
2. **Pray Screen**: first mover (Nov 2024), but stale and ad-heavy, with complaints that make it
   vulnerable.
3. **BibleScroll**: studio-backed, YouVersion-integrated, $59.99/yr.
4. **Sanctify** and **Bible Chat Lock**: Bible-Chat-style growth machines. Watch Book Vitals,
   which has a proven ~$15M/yr paid-TikTok engine (B).

Muslim side: Just Pray, Prayr, Aqimo.

### Remaining gaps (ranked by how open they look)
1. **Hallow / Catholic integration.** No app found that unlocks on *time spent in Hallow*. iOS
   DeviceActivity threshold events can detect "N minutes in app X", which is presumably how
   BibleScroll handles YouVersion, so this is technically feasible. Catholic-specific lockers
   (Damascus, Little Way) are small and suite-heavy. Moderately open, but Hallow could ship this
   itself.
2. **Multi-app "bring your own prayer app".** Hallow, Glorify, Pray.com, Abide, Dwell or
   YouVersion time all counting. BibleScroll covers only YouVersion. This is open, but it is a
   feature, not a moat, and BePresent can copy it in a sprint.
3. **Couples, family and church B2B.** Family plans are rare (Damascus, Just Pray). There is no
   church, youth-group or small-group dashboard. Bible Focus has church check-in;
   Damascus has team leaderboards. Youth pastors buying for a group is unaddressed, but it is
   slow, sales-led and minors raise FamilyControls (.child authorization) and COPPA complexity.
4. **Morning-anchored "God before phone".** Alma, Put God First and Bible Lock already pitch
   this. Locturne's existing *wake-up / phone-held-until-morning-routine* tech is the
   differentiator: a combined "out of bed, then devotional, then apps" flow. No competitor found
   pairs physical wake-up verification with devotion.
5. **Enforcement quality and non-predatory pricing.** The most common complaints are easy
   bypass, unlock bugs, ads before prayer and $9.99/week pricing. A reliable, fairly priced
   option would win reviews, but it is not a distribution moat.

### Clone speed
A competent solo dev with FamilyControls code already working (Locturne's case) could ship a
parity product in **1–2 weeks**; the market shows dozens doing it monthly. Any new
differentiator, such as Hallow-time unlocks, could be copied by BePresent or Book Vitals within
**2–4 weeks** of it showing traction. A defensible position would have to come from
distribution (an owned creator audience or church channels) or brand/denomination trust, not
from the mechanic.

## Key URLs
- Bible Mode https://apps.apple.com/us/app/id6744124873 · https://www.biblemode.app
- Pray Screen https://apps.apple.com/us/app/id6737241669 · https://prayscreen.com · Play `com.fkr.prayscreen`
- BibleScroll https://apps.apple.com/us/app/id6755406222
- Sanctify https://apps.apple.com/us/app/id6751909914
- Bible Focus https://apps.apple.com/us/app/id6747103808 · http://trybiblefocus.com
- Bible Break https://apps.apple.com/us/app/id6755405918 · https://bible-break.com
- Faith Mode https://apps.apple.com/us/app/id6761586723
- FaithLocked https://apps.apple.com/us/app/id6764309082 · https://www.faithlocked.app
- Bible Chat Lock https://apps.apple.com/us/app/id6814801984
- Attend https://apps.apple.com/us/app/id6811427451
- Scripture Before Scroll https://apps.apple.com/us/app/id6771953135
- Little Way https://apps.apple.com/us/app/id6760742231 · Damascus https://apps.apple.com/us/app/id6755117736
- Just Pray https://apps.apple.com/us/app/id6747154163 · Prayr https://apps.apple.com/us/app/id6752878561 · Aqimo https://apps.apple.com/us/app/id6754220985
- Android prayer lock (Covenant Studios) https://play.google.com/store/apps/details?id=com.maubaron.prayerlock
- Hallow/Bible Chat revenue (B): docs/app-opportunities/3_DEMAND_NICHES.md (Appfigures, Romania Insider)
