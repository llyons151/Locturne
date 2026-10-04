# Hunt: Finance, Shopping, Sports, Travel, Navigation, Weather, News, Games (solo-dev niches)

Date: 2026-10-03/04. Sources: `recent_grossing_2024plus.tsv` (147 rows in these 8 categories), `all_charts.tsv`
(grossing + paid for each category), App Store product pages (in-app purchase prices via `iap.sh`,
~10 "most helpful" reviews per app via `rev.py`), iTunes lookup.

## Method and data caveats (read first)

1. **Candidate generation:** I listed every 2024+ launch already on a grossing chart in the 8 categories
   and grouped them into niches. Then I added stale, low-rated or price-hated incumbents from the grossing
   and paid charts, plus founder-fit ideas (game companions, trackers, daily puzzles).
2. **appscan.py ran for only 6 niches** (card scanners, deer/hunting, game maps, game weather, golf swing,
   plane/ATC). The iTunes Search API then returned **HTTP 429/403** for the rest of the session, because
   several hunt agents share one IP.
   - **Fallback (`scans_fsg/ws.py`):** scrape `apps.apple.com/us/iphone/search` (about 10–12 apps per
     keyword, 5–6 keywords per niche), then enrich through iTunes lookup, apply the same must/namemust/exclude
     regexes and count launches by year.
   - **Why this matters:** the fallback sees roughly 30–90 apps per niche, not 200 per keyword. Treat its
     2025/2026 launch counts as a **lower bound** and as a ratio: when most of a ~40-app sample launched in
     2026, the niche is flooding.
   - Raw outputs are in `scans_fsg/` (`*.txt` = appscan, `w_*.txt` = fallback).
3. **Reviews and revenue:** the iTunes reviews RSS returns zero entries for every app today, so review
   quotes come from the product-page "most helpful" set. WebSearch budget was exhausted, so every revenue
   figure is the rubric's rank proxy (**grade C**) unless a price list is quoted (grade A for prices only).
4. **Overlap:** `hunt_weak_incumbents.md` (another agent) already covers game-themed weather, bowling,
   ATC, speedometers and package trackers. I agree with those verdicts and only summarise them here.

## What the 2024+ chart data says about these categories

- **Gamer-skinned utilities are a real, new money pattern.** Two newcomers, neither from a big studio:
  - **Game Maps IRL** (2025-03): Navigation **#19** grossing, 29.1K ratings.
  - **Game Weather IRL** (2026-04, solo developer): Weather **#78** grossing, 192 ratings.
  - Both are hated for price, and both fit the founder's gamer identity almost exactly.
- **TikTok-native car culture:** **Wheelz** (2026-06, Navigation #43, 3.8K ratings in 4 months) and
  **Enroad** (2026-01, Navigation #84, 6.7K ratings) are "social drive trackers": heat maps, top speed,
  0–60, leaderboards.
- **Hunting gadget apps earn far beyond their size:** **Track N Trail** (2025-06) uses the camera to
  highlight blood trails and is Navigation **#11** grossing with only 2.4K ratings. Navigation's top 30
  is mostly hunting, fishing and off-road (onX, HuntWise, HuntStand, BaseMap, GOHUNT, Spartan Forge).
- **Shopping and Finance newcomers are all clone floods:** card scanners, thrift-profit AI, restock
  alerts, clearance/penny finders, settlement claimers, subscription cancellers, AI chart analysis.
- **Games:** every 2024+ grossing game is a studio title (merge, sort, 4X). No solo-dev word or daily
  game is on the Games grossing chart; the money in daily puzzles sits with NYT Games (#39). Pokémon TCG
  Pocket (#25) is the TCG companion driver, but its companion niche (scanners) is flooded.

---

## Candidates

### 1. Game-style real-world map (with optional CarPlay): "your city as an open-world game map"
- **Wedge:** Live location and navigation drawn in original game-genre map styles (open-world crime
  city, neon cyberpunk, fantasy parchment, retro 16-bit).
  - Add what the incumbent lacks: ETA and travel time (its top review complaint), saved places,
    home-screen widgets.
  - Sell themes once (about $9.99–$19.99 per pack or $29.99 for all) against the incumbent's $79.99/yr.
- **Demand:** **Game Maps IRL** (Retry Apps, launched 2025-03-14) is **Navigation #19 grossing** with
  29,139 ratings at 4.62. The ratings suggest roughly 1–3M downloads in 18 months.
  - Its in-app purchases (grade A): Weekly $7.99, Monthly $9.99 / $14.99, Yearly $79.99 / $39.99 offer,
    "Unlock All Maps" $49.90 / $29.99.
  - Revenue estimate: about $50–150K/mo from the rank proxy (grade C). Navigation is a smaller category.
- **Scans:**
  - appscan `--must '(map|navigat|gps|direction).*(game|gta|rpg|minimap)|…' --exclude 'stop|geography|quiz|…'`
    on "game maps irl", "gta map", "video game gps", "minimap navigation", "game style navigation",
    "rpg map", "game hud": 69 matches, but most are per-game maps (DayZ, Tarkov, Minecraft).
  - True "your real location in game style" competitors are about 12. Fallback scan `w_gmaps.txt`:
    22 matches, 2025: 7, **2026: 12**. All 2026 entrants are tiny: Mappr 142 ratings, MapGT 35,
    MapShifter 13, Game Maps: IRL 6, SpawnMe 2, Pixel Maps 4 (2.0★), several with 0.
  - No clone besides the leader has traction.
- **Why it's open:**
  - The leader is hated for price. Its most helpful reviews (2026-05 to 2026-09) average **3.0★**:
    "Incredible concept, greedy developers… absurd amount of money", "Needs… how much time it would
    take", "new patch made cyberpunk map worse", plus "scam" and "paywall" themes.
  - The 2026 clones are low-effort, so polish plus original art plus fair pricing has room.
- **What could kill it:**
  - **IP.** The leader rides GTA and Cyberpunk look-alikes ("unofficial"). Take-Two is litigious, so
    styles must be genre-original, with no game names in metadata.
  - **CarPlay** navigation needs Apple's navigation entitlement, which is not guaranteed. Ship
    phone-first.
  - The clone count is already 12 in 2026 and rising.
- **Build (about 5–7 weeks):** MapLibre React Native with custom style JSON and Protomaps PMTiles on
  Cloudflare R2 (near-zero cost), MKDirections for routes and ETA (free), plus WidgetKit widgets.
- **Scores:** Demand 4 · Openness 3 · Buildability 4 · Video/ASO fit 5 · Retention-independence 4.
- **Verdict: PASS (with IP discipline).** It is the strongest gamer-fit niche with chart proof. It pairs
  with #2: one "IRL gamer" brand with both a map and a weather app is a credible portfolio.

### 2. Game-themed weather + widgets (summary; full write-up in hunt_weak_incumbents.md #1)
- **Demand:** **Game Weather IRL** (solo developer, 2026-04-29) is **Weather #78 grossing** with 192
  ratings and 3.98★. Theme packs sell at **$29.99 each**; premium ranges $3.99–$59.99.
- **Scans:**
  - appscan "game weather", "video game weather", "pixel weather", "gamer weather app", "retro weather":
    17 matches. Fallback: 19 matches, 2026: 7, nearly all with 0–68 ratings (Skydex 68, CapyCast 0,
    RetroWeather 0).
- **Why it's open:** reviews say "only 3 themes", "over priced", "alerts don't work".
- **What could kill it:** IP (as above), and Weather is a small category.
- **Scores:** Demand 3 · Openness 4 · Buildability 4 (WeatherKit) · Video 5 · Retention-independence 4.
- **Verdict: PASS.** This is the cheapest test of the "gamer-skinned utility" thesis, and it can share
  art and pipeline with #1.

### 3. Blood-trail tracking camera for hunters
- **Wedge:** A camera filter (Metal shader or vision-camera frame processor) that boosts blood-red hues and
  suppresses red leaves and soil, plus:
  - drop-pin trail breadcrumbs,
  - a "last blood" marker,
  - an optional shot-placement recovery-wait timer.
  - Price: one season pass ($19.99/season or about $29.99 lifetime) against the incumbent's
    $29.99–$49.99/yr.
- **Demand:** **Track N Trail** (2025-06-05) is **Navigation #11 grossing** with 2,441 ratings at 4.76.
  - Its in-app purchases (grade A): "Tracking Subscription" $26.99 / $29.99 / $44.99 / $49.99 and
    "Track N Trail Subscription" $39.99 / $49.99.
  - Revenue estimate: about $30–100K/mo in season (grade C). It also bundles parcel land maps.
  - Related chart evidence: rackline.ai deer scoring (2025-09) is Sports #91 with 68 ratings; DeerCast
    is Weather #4; Deer Hunters MoonGuide is Navigation #22.
- **Scans:**
  - appscan "deer hunting", "blood trail tracking", "deer scoring", "rut predictor", "whitetail hunting
    app": 209 matches, but most are hunting *games* and map suites.
  - Fallback `w_blood.txt` ("blood tracking app", "blood trail deer", "find blood deer", "blood tracker
    hunting", "blood light camera"): **only 2 true competitors**, Track N Trail and FastRak Blood
    Trackers (44 ratings). The other 23 matches are blood-pressure or blood-sugar apps.
- **Why it's open:**
  - It is a single-app niche.
  - The leader's 2-star review reads: "it also picked up the red on the leaves… anywhere else".
  - The leader's price is "30 bucks"; the bundled maps that justify it are expensive data the wedge
    doesn't need.
- **What could kill it:**
  - Seasonality: deer season runs October–January, so revenue is lumpy.
  - Accuracy is the whole product.
  - The founder isn't (as far as we know) a hunter, so it needs field testing.
  - onX or HuntStand could add the feature.
  - Navigation rank inflates in season.
- **Build:** 3–5 weeks (camera shader, plus GPS breadcrumbs in MapKit).
- **Scores:** Demand 3 · Openness 5 · Buildability 4 · Video/ASO fit 4 (before/after "app finds blood"
  clips are visceral and hunting TikTok is huge, though content restrictions apply) ·
  Retention-independence 4 (seasonal pass).
- **Verdict: BORDERLINE-PASS.** It is the most open niche in the hunt, but founder fit and seasonality
  are the risks. Start now if at all: it is peak season.

### 4. Social drive tracker (heat map, top speed, 0–60, friend leaderboards)
- **Wedge:** Auto-detected drives, a personal heat map of every road driven, a top-speed and 0–60 log, car
  "garage" profiles, and weekly friend and local leaderboards. Price fairly: no re-billing on rename, no
  surprise annual charge.
- **Demand:**
  - **Wheelz** (2026-06-02): **Navigation #43**, 3,826 ratings in 4 months. Pro is $2.99/wk,
    $4.99/mo, $39.99/yr.
  - **Enroad** (2026-01-06): **Navigation #84**, 6,736 ratings. Pro ranges $6.99/wk to $57.99/yr.
  - Both came from TikTok ("Saw it in TikTok…"). Revenue estimate: $20–80K/mo each (grade C).
- **Scans:**
  - Fallback `w_drive.txt` (broad: drive tracker, driving stats, top speed tracker, car meet app, drive
    heat map, 0-60 timer): 48 matches, 2026: 18. Mileage loggers and speedometers dominate.
  - Fallback `w_drive2.txt` (social-drive only): 22 matches, 2025: 5, **2026: 11**: Open Road 821,
    TripRank 10, Revv 1, Social Ride 0, Rev 0, car-meet apps.
- **Why it's open:**
  - **Enroad's reviews: 7 of 10 are 1★**, about billing ("The new update made me pay again…",
    "Pay for pro? We change the name so you must again").
  - Wheelz has trial-charge complaints.
  - The niche is under a year old.
- **What could kill it:**
  - A 2026 copy wave has started, and Wheelz is shipping fast (it just added navigation).
  - Background location costs battery.
  - "Top speed" glorifies speeding: App Store review and liability risk, so frame it as a track-day
    and road-trip log.
  - It is social, so it is weakly network-dependent.
- **Build:** 5–7 weeks (background location, trip detection, heat-map rendering, leaderboards backend).
  The founder's weak retention is less critical here because the core loop is automatic.
- **Scores:** Demand 4 · Openness 2 · Buildability 3 · Video/ASO fit 5 (Gen Z car content) ·
  Retention-independence 3.
- **Verdict: BORDERLINE.** The demand is real and the audience fits, but it's already a race between two
  funded-looking apps and about 10 clones.

### 5. "Fog of war" exploration map (uncover the world as you walk or drive)
- **Wedge:** Fog of World's mechanic with a modern game feel:
  - XP and levels per neighbourhood, % of city explored, badges, shareable "my city explored" cards,
  - a home-screen widget,
  - one-time purchase.
- **Demand:** **Fog of World** (Ollix, 2012) is **Travel paid #10 at $30.00** (3,082 ratings, 4.81,
  updated 2026-05). It is not on a grossing chart and is not a newcomer, so demand is proven only as
  upfront paid sales. Revenue estimate is unclear (grade C, likely about $5–20K/mo).
  - Adjacent: been (Travel #58) and Pin Traveler (#57) country-collector maps.
- **Scans:** fallback `w_fog.txt`: 43 matches (mostly street-view and map viewers). **True fog-of-war
  competitors: about 6**: Fog of World, Been To (580), World Uncovered (stale since 2020), Tiles (2025-12,
  1), FogWalk (2026-08, 0), Gallivant (0). Fog-of-war launches: 2025: 1, 2026: 1.
- **Why it's open:**
  - The leader is a 2012 design at $30 with no free tier.
  - Its reviews ask for quality-of-life fixes ("needs some QOL changes"); the newest are from 2024.
  - Nobody has a Gen Z or gamer version.
- **What could kill it:**
  - Demand proof is thinner than the rubric wants (no grossing slot).
  - Background location battery cost.
  - Retention depends on habit, which overlaps the founder's weakness, though pay-once pricing
    softens it.
- **Build:** 4–6 weeks (background location, H3 or geohash tiles, Skia fog layer).
- **Scores:** Demand 2 · Openness 5 · Buildability 4 · Video/ASO fit 5 ("I've explored 37% of my
  city") · Retention-independence 3.
- **Verdict: BORDERLINE.** It is very open with great video, but needs a demand check first, for example
  a TikTok concept test or an estimate of Fog of World's sales.

### 6. Virtual rain gauge (rainfall totals at saved locations)
- **Demand:**
  - **RainDrop** (2023): **Weather #10 grossing**, 22.2K ratings. Plans are $2.99–$9.99/mo and
    $29.99–$49.99/yr.
  - **Precip** (2024-04): Weather #32.
  - **RainTotal** (2026-02, solo): Weather #100 with 302 ratings. A 2026 newcomer charted.
- **Scans:** fallback `w_rain.txt`: 23 matches, 2025: 4, 2026: 5. True gauges: RainDrop, Precip, Rain
  Tally (467), RainTotal (302), Rain Gauge Pro (77) and 0–5-rating stragglers.
- **Why it's open:** RainDrop removed its free tier and then restored it after backlash ("Latest update
  eliminated free/basic option", 2026-03). Subscription is its most common review theme.
- **What could kill it:** the audience is farmers, gardeners and lawn people, a poor fit for the founder
  with weak video potential. Rainfall data (MRMS radar QPE) is free but technically fiddly.
- **Scores:** Demand 4 · Openness 3 · Buildability 3 · Video/ASO fit 2 · Retention-independence 4.
- **Verdict: BORDERLINE (an ASO play, not for this founder).**

### 7. AI golf swing feedback
- **Demand:** Swing Coach (2025-03) is Sports #58 at $14.99/mo or $119.99/yr, with 10/10 helpful reviews
  at 5★. GolfFix is #94, Sportsbox #97 and V1 #100.
- **Scans:**
  - appscan "golf swing", "golf practice", "golf swing analyzer", "golf coach ai", "golf drills": 423
    matches, 2026: 133 (polluted by golf games).
  - Fallback `w_golfprac.txt`: 34 matches, **2026: 14**, including Swing Sensei (523), SwingFeel and
    Scratch AI (2025-09, 1.8K).
- **Why it fails:** incumbents are well rated (4.8+) and the 2026 wave is on. Real club and body pose
  tracking is hard ML.
- **Scores:** Demand 4 · Openness 2 · Buildability 2 · Video 4 · Retention-independence 3.
- **Verdict: FAIL.**

### 8. TCG / sports card scanner
- **Demand:** huge. Collectr is Reference #8, plus HoloDex, FoilSnap, Acorn, MyDex, Double Holo, CollX,
  StarSnap, Cardora and SPcard. Many launched 2025–26.
- **Scan:** appscan "pokemon card scanner", "tcg card scanner", "sports card scanner", "card value
  scanner", "trading card price": 494 matches, **2025: 124, 2026: 268**.
- **Verdict: FAIL.** This is a textbook clone flood, despite strong founder fit.

### 9. Prediction-market wallet tracker (Polymarket/Kalshi whales)
- **Demand:** **Prediction Radar** (2026-09-02) is already Finance #41 with 324 ratings, priced
  **$14.99/wk or $44.99/mo**.
- **Scan:** fallback `w_predict.txt`: 27 matches, **2026: 20** (PolyCat, PolyScout, Hunch AI, Polycool,
  Alerts for Polymarket…).
- **Verdict: FAIL.** A 2026 flood has formed. It is also gambling- and finance-adjacent (copy-trading
  framing), so it fails the regulated-advice gate.

---

## Rejected quickly (scan numbers in `scans_fsg/`)

| Niche | Chart evidence | Scan result | Why rejected |
|---|---|---|---|
| Class-action settlement finder | Settlemate F#17, ClaimHunt #26, Collect #32, PayMe #45, Payout #44, MoneyPilot #43, OweYou #69 | 28 matches: **2025: 11, 2026: 16** | Clone war |
| Thrift / resale AI value scanner | ThriftAI S#7, Thrifty #73, Thrift AI #56, Pocket Pricer #76 | 34 matches: **2025: 10, 2026: 23** | Clone war |
| Clearance / penny-deal finder | Drop S#22 (2.93★), Penny #30, Scavenger #63 | 8 matches, 6 launched in 2026 | Scraping retailer stock data; ToS and data risk; 2026 rush |
| Restock alerts (TCG/sneakers) | HotStock S#6, TrackaLacker #16, PokeRestock #50 | 17 matches: 2025: 6, 2026: 9 | Scraping and bot infrastructure; TCG restock wave |
| Subscription canceller | SubPilot F#27, SubSeek #35, Subee #92 | Not scanned separately | Bank-link (Plaid) cost; Rocket Money owns the category; 2025–26 clones on chart |
| AI chart / stock analysis | Trade AI, TradeGPT, Profit AI, Benson, Danelfin | Not scanned | Financial-advice risk; obvious flood |
| Tanning / UV timer | Beam W#71 ($49.99/yr), SPF #57 | 48 matches: **2025: 16, 2026: 23** | Flood; weekly-paywall clones |
| Country-days / tax-residency tracker | Bounded T#50 (2026), Domicile365 F#79 ($19.99/mo) | 55 matches: **2026: 32** | AI-built clone wave in 2026 |
| Server tip tracker | ServerLife F#50 | 29 matches: **2026: 17** | Flood; low price ceiling |
| Fishing log / AI fishing | Fishbrain Sp#8, Fishbox #77, Deep Dive #90 | 42 matches: **2026: 24** | Flood plus entrenched social leaders |
| Turbulence / fear of flying | Turbulence Forecast W#38 (205 ratings) | 27 matches: **2026: 12** | Small demand; 2026 wave |
| Aurora forecast | Aurora Forecast. W#80, My Aurora Pro paid #7 | 31 matches: 2026: 11 | Leader has 69.7K ratings at 4.74; seasonal and regional; low US demand |
| Rockhounding map | RockHoundR N#81 (2026, 112 ratings) | 21 matches: 2026: 10 | Tiny demand; wave started; weak founder fit |
| Sneaker release calendar | Sole Retriever S#12, Sneaker Crush #84, J23 paid #9 (stale since 2022) | 28 matches: 2026: 4 | Shelf owned by Nike, GOAT and retailers; needs a release-data feed |
| Bowling score tracker | Lanetalk Sp#70 (3.84★), PinPal paid #15 (stale since 2023) | 34 matches: **2026: 14** | Flood started; small demand (agrees with the other hunt) |
| Video-game backlog tracker | None on any grossing chart | 38 matches: 2026: 16 | No proven money, and a 2026 wave anyway |
| PSN/Xbox trophy tracker | None on chart | 24 matches: 2026: 10 | No proven money |
| Daily "-dle" guessing game (Rivaldle-style) | NYT Games G#39 only; no solo daily game on a chart | 35 matches: 2026: 12 | No proof that a standalone daily guesser earns on iOS; works better as a web game for virality |
| Pokémon GO companion (Poke Genie) | Utilities #85, 210K ratings | Not scanned | Remote raids are a two-sided network; IV scanning is commoditised |
| Live ATC radio | ATC Live T#4 (2026, $89.99/yr) | appscan plane/ATC: 325 matches, 2026: 58 | Needs audio-feed infrastructure (agrees with the other hunt) |
| Plane-overhead AR (FlightSky T#30, FlightDeck #40) | Several 2024–26 newcomers | Same scan (2026: 58) | ADS-B data licensing cost; crowded |
| Speedometer / HUD | Five on Navigation chart | Fallback | ASO weekly-sub arbitrage; poor video fit (agrees with the other hunt) |
| CarPlay widgets / dashboards (HiCar N#16, CARFACE #30) | 2026 newcomers charting | Other agent's `s_carplay.txt`: 76 matches, **2026: 42** | Flood |
| Package tracker | TrackPack S#5 (2026) | Other hunt | Ads-driven arbitrage; carrier API costs |
| Disney wait times / dining alerts | MagicTable T#45, Disney World Lines T#72 | Not scanned | Depends on scraping; ToS risk |
| Local news and news apps | Publishers only | n/a | Content businesses |
| CrimeRadar dispatch audio (News #27) | 2025 newcomer, 40K ratings | Not scanned | Needs scanner-audio infrastructure and AI transcription cost; Citizen incumbent |

## Bottom line for this slice

- **Gamer-skinned utilities:**
  - **Proof:** Game Maps IRL is Navigation #19 and Game Weather IRL is Weather #78. Both are 2025–26
    newcomers, both are hated for price, and their 2026 clones have no traction.
  - **Fit:** this is the only pattern here that matches the founder's identity and video skills.
  - **Recommendation:** build the map first (bigger money), with original genre art and one-time theme
    packs.
- **Blood-trail camera:** the most *open* niche found (2 true competitors, leader at Navigation #11).
  The risks are founder fit and seasonality.
- **Everything with a 2025–26 chart newcomer in Finance and Shopping is a clone flood.** The newcomers
  prove demand, but the window has already closed.
