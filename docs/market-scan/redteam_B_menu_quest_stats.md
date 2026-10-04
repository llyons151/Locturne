# Red team B: secret menu / IRL side quests / Apple Music stats

Date: 2026-10-04. Bar: `redteam_gamer_irl.md`. Grades: A = read directly from App Store or Apple docs;
B = inferred from A data; C = rank-proxy estimate or memory.

Method: the iTunes Search API is blocked, so I used the apps.apple.com web search, which returns about 12
results per term, then ran iTunes lookup on those ids. Script: `rtB/dump.py`, raw JSON in `rtB/A.json`,
`A2.json`, `B.json`, `C.json`. Because each term returns so few results, **every competitor count is a
floor**. App pages are in `rtB/p*.html`. The WebSearch budget was used up, so I have no third-party
revenue data. The review RSS feeds look stale: their newest entries are 2025-06 and 2026-01.

## Overall

| Candidate | Verdict |
|---|---|
| A. Multi-chain fast-food secret menu | **KILLED** |
| A'. Fast-food macros / high-protein orders | **KILLED** (clone flood) |
| B. Randonaut / IRL side quest | **KILLED** as a business. At most a 1–2 week video experiment |
| C. Apple Music listening stats | **KILLED** |

None survives. All three fail the same way the gamer-IRL idea did: one incumbent earns the money and no
follower gets traction. Two of the three also have a structural problem: a hostile audience in A, a data
ceiling in C.

---

## A. Multi-chain "secret menu" / order hacks: KILLED

**Competitors** (18 terms scanned, 124 unique apps, most of them official chain apps; `rtB/A.json`)

Starbucks-only drink apps (A):

| App | Ratings | Note |
|---|---|---|
| Your Secret Menu for Starbucks | 15,561 | F&D #28 grossing |
| Secret Menu Coffee Recipes (Sepia) | 11,844 | |
| Secret Menu Recipes (陈) | 4,444 | |
| Sipzy | 4,055 | |
| Secret Menu: Coffee Recipes | 957 | |
| Secret Menu Pro for New Coffee | 8 | 2026-07 |
| Star Secret Menu: DIY Coffee | 2 | 2025-12 |
| Drink Share | 0 | 2026-08 |
| 2015 Big Book / Do Tri apps | — | dead |

Only one of these is on a chart. Four followers have more than 4K ratings and none of them is on a chart.

**Multi-chain fast-food secret menus have already been tried, and it failed.**
- Big Book Apps shipped "Fast Food Secret Menu Guide" and "Secret Menu for McDonald's" in 2015. They have
  21 and 9 ratings, are rated 2.9★, and have not been updated since 2015–17.
- The best fast-food entry is **Secret Menu: Burger Guide** (Trevor Nemanic, 2023, In-N-Out only). It has
  **3,909 ratings, 4.75★, is updated regularly, and has no chart slot.** It is also the developer's only app.
  So even the strongest burger "secret menu" brand has not turned into revenue.
- Secret Menu for Super Duper (2025) has 3 ratings.

**Searching a chain name returns the official apps.** "taco bell hacks", "chipotle hacks" and "fast food
hacks" all return Taco Bell, Chipotle, Chick-fil-A, Sonic and Jack in the Box first, each with 0.2–4M
ratings. ASO for chain names is unwinnable.

**Is the Starbucks app's money real and durable?** (A)
- Anthem Ventures has only this one app. It sells a hard paywall: PRO at $4.99–9.99/week-style tiers,
  $49.99, $69.99 and $99.99.
- Version history: v3.0.17 (2023-07), then **a 26-month gap**, then v4.0 (2025-10), 4.1 and 4.2, then 4.4
  (2026-08). Revenue survived two years with no updates, so it is a cash-cow listing.
- Reviews (stale RSS, 2024-06 to 2025-06): 50 written reviews, **29 of them 1★**. Typical complaints:
  - "$5 a week to access anything at all"
  - "$260/year"
  - "**my 8 year old** clicked on a link in a video… charged $5.34 every week for a year and a half"
  - "**Downloaded because the ads are convincing**"
  - "drinks you can just look up on TikTok"
- My read (B): the money comes from paid ads sold into a **young, mostly female Starbucks-drink audience**
  on a weekly hard paywall. That is not the founder's male Gen Z gamer audience, and it is not organic.
- Chart neighbours at F&D #28–54 include apps with 3–15 ratings (Sanity #36, Spot #54), so the threshold
  for those ranks is low. **Estimate ≈ $15–50K/mo (C).**
- Durability risk (memory, not verified): Starbucks' 2025 "Back to Starbucks" plan cut menu items and
  customisations, which reduces what a secret menu can offer.

**Trademark and App Review (B)**
- Every 2025–26 entrant avoids "Starbucks" in its name: "for New Coffee", "Star Secret Menu". The older
  apps keep the brand because they were approved before.
- A new "Secret Menu for Taco Bell / Chipotle" name is likely to hit guideline 5.2.1 or 4.1. Without the
  brand in the name, the app has no ASO.

**Content sourcing**
- The incumbents say they use "fan-created customisations shared publicly online" plus user submissions.
- The data is free, so the product is commodity. The reviews already make this argument ("just look it
  up on TikTok").

**Male Gen Z willingness to pay:** I found no evidence that they pay. No fast-food hack app for men is on
any chart. The one burger app with traction (3.9K ratings) earns nothing visible.

### A'. Fast-food macros / high-protein orders: KILLED (clone flood)

**MenuFit** (Kosco Digital, launched 2025-08)
- H&F **#27 grossing**, #55 free, 54,463 ratings. That is about $100–300K/mo (C).
- Pricing: $9.99–48 subscriptions.
- It ships every 1–3 weeks (v1.0.51). This is real money held by a fast-moving leader.

**Competitor scan** (10 more terms, `A2.json`)
- **57 matches: 13 launched in 2025 and 33 in 2026**, all from shallow 12-result pages.
- Followers: LeanBites 3,890, FoodieFit 732, Order Fit 519, What2Eat 418, MenuPal 130, MacroMenu 118,
  MacroBite, MacrosMap, MacroMate, Fastfoodie, MenuScore, Menu AI, MenuLens, PlateMate, munch, and others.
- None of them is on a chart.
- This is past the rubric's ~25-launches-in-2026 flood threshold, and it overlaps the "AI calorie" clone war.

---

## B. Randonauting / IRL side quests: KILLED

**Competitors** (14 terms scanned, 135 apps, `B.json`)

Randonaut-specific apps (A):

| App | Ratings | Rating | Last update | Note |
|---|---|---|---|---|
| Randonautica | 13,038 | 3.53★ | — | Nav #55 grossing |
| Randonauting Location Around | 5,199 | — | 2025-03 (stale) | |
| Randonauting Adventure Around | 332 | — | — | |
| GoRandom | 4 | — | — | |
| Geo Roulette | 1 | — | — | 2025 |
| Random Earth | 0 | — | — | 2026 |

The randonaut wedge itself is uncrowded. But the clone with 5.2K ratings got its traffic from ASO on
"randonaut" terms and still never reached a chart.

**The "side quest" framing proposed as the wedge is a forming clone flood** (A). I found **≥22 IRL
side-quest or real-life-quest apps launched 2025–26** on 12-result pages:
- Sidequest: Explore Your City (206)
- SideQuest – Walk & Level Up (185)
- thirdspace (94)
- Sidequest: Nearby Activities (17)
- Side-Quest, Glimsp, Sidekix, SideQuest: Tiny Adventures, Sidequests HQ, Sidequest Everyday,
  SideQuest Rediscover your City, Leveling IRL Quests, QuestDay, kai, SideQwest, Daily Sidequests, SideQ,
  Quester, Mossway, Kuji, questUP, Offquest, IRL Life Quest, Quest Log

**None has more than 210 ratings.** This is the gamer-IRL pattern exactly.

**Is Randonautica durable?**
- 13K ratings in 6.6 years is small for an app that went viral in 2020, so its scale today is modest.
- It ships updates monthly (v3.2.4 to v3.3.3, Mar–Sep 2026) and is still Nav #55 grossing and #61 free.
- **Estimate ≈ $10–30K/mo (C)**, and probably decaying from 2020.
- Reviews (A, 2024-09 to 2026-01): 27 of the 50 are 1★. The main complaints:
  - Points land in **"someone's backyard"**, "private property" (at least 4 reviews).
  - Paywall or tokens before you can try it ("seen it on tiktok… asking me for money").
  - "Used to be fun".

**Safety and App Review**
- Trespass is the core failure of the product, not an edge case.
- Other review flags: wasp stings, "took me to my ex's house", a nude photo in the UGC feed.
- A new app needs land-use filtering (public POI only), which removes the "spooky" draw that the reviews
  ask for ("Bring back the scary stuff").
- UGC moderation (guideline 1.2) adds build scope.

**Retention:** this is a novelty used once with friends, and the reviews describe exactly that. That is
the founder's known weak spot.

**What survives:** a ≤2-week, no-paywall-until-the-first-quest video test, to farm the POV format "the
app sent me here". Expect gamer-IRL economics if it works at all. **Month 3 ≈ $0–2K, month 12 ≈
$0–5K/mo (C).** I would not schedule it.

---

## C. Apple Music listening stats / year-round Replay: KILLED

**The data ceiling (A, Apple docs JSON)**
- `GET /v1/me/recent/played/tracks` has `limit` **default 30, maximum 30**.
- From developer-community memory (C): it returns no play timestamps and pagination stops after about 50
  items.
- `MPMediaItem.playCount` is a cumulative count for library songs only.
- Competitors confirm this in their own descriptions:
  - Song Stats: "data for past time frames… available only from the time that you install".
  - Played (2026-07): "For older history, import Apple Music CSV exports".
- So an accurate Wrapped-style product needs constant polling or a privacy-export import. That is a weak
  first-run experience.

**The strongest possible entrant already tried and stalled**
- **stats.fm for Apple Music** (StatsFM B.V., 2025-09) has 869 ratings, **3.68★, and no chart slot**.
- That is despite the stats.fm brand and its 47K-rating Spotify app at Music #64.

**Competitors** (10 terms, `C.json`)
- Song Stats 899, stats.fm AM 869, PlayTally 381 (paid **$2.99**, Music *paid* #56, a small amount of
  money), musicat 267 (supports AM), snd.wave (stale since 2020), TuneTrack (stale since 2020).
- **2026 launches:** Music : Songs, Stats; MuzGo; SurgePod; Stats for Apple Music (1.5★); Marquee;
  Played; Cadence; Soundcheck; Replayd; shuffl.fm. That is at least 10 tiny apps.
- **Airbuds** (161,900 ratings) gives Apple Music users a free weekly recap.

**Apple Replay** (memory, C): Apple has brought Replay into the Music app with monthly and year-round
views (iOS 18-era). That steadily erodes the core job.

**Demand:** no Apple-Music stats app is on any grossing chart. **FAIL.**

---

## Verdict summary

1. **A, secret menu:** KILLED.
   - The multi-chain version was tried in 2015 and died.
   - The best burger guide has 3.9K ratings and $0 on the charts.
   - The Starbucks money is paid-ads plus a weekly paywall aimed at kids and teen girls.
   - Brand names now appear blocked in new app titles.
2. **A', fast-food macros:** real money (MenuFit H&F #27) but **33 launches in 2026**. KILLED.
3. **B, randonaut / side quest:** the side-quest flood has ≥22 apps, all under 210 ratings. Randonautica
   is ~$10–30K/mo, with trespass baked into the product. KILLED. A video experiment only.
4. **C, Apple Music stats:** the API is capped at 30 recent plays, the stats.fm Apple Music app sits at
   3.68★ with no chart slot, and no app in the niche is on a grossing chart. KILLED.
