# Hunt: weak incumbents sitting on proven money (cross-category)

Date: 2026-10-03. Source: `all_charts.tsv` (non-Games grossing + paid), App Store product pages, iTunes lookup.

## Method and data caveats (read first)

1. **Chart filters.** From non-Games top-grossing (2,400 rows) and top-paid, I pulled:
   - stale apps (last update before 2025-10-03): 63 grossing apps;
   - low-rated apps (<4.3 stars, 1,000+ ratings): about 170, mostly dating, streaming, news and Chinese webnovel apps (not buildable);
   - solo-developer sellers (seller is a person's name): about 180 grossing apps;
   - top-paid utilities with 500+ ratings (one-time purchase proof).
2. **Reviews.** The iTunes customer-reviews RSS feed returns **zero entries for every app today**, including Instagram, so it is broken. Instead I parsed the ~10 unique reviews embedded in each `apps.apple.com/us/app/id…?see-all=reviews` page. Those are Apple's "most helpful" picks, **not the most recent**, so the price-hike signal is weaker than intended. Each review has a date, and I quote dates. I checked 33 apps this way and also pulled in-app purchase price lists from the product pages.
3. **appscan.py was blocked.** The iTunes Search API returned **HTTP 403 (rate-limited)** after my first scan. The first scan, ghost/spirit box, completed through appscan.py. For every other niche I used a fallback: the `apps.apple.com/us/iphone/search` web results (top ~24 apps per keyword, 3–4 keywords per niche), enriched through the iTunes lookup API (which still worked) for release date, ratings and last update. **These counts are a lower bound skewed toward top-ranked apps.** "2026 launches" here means launches that already rank in the top 24 for a keyword, which is a stronger flood signal than appscan's raw count. A queued appscan batch (`scans.sh`, `scans2.sh`) is ready to re-run when the API unblocks.
4. Revenue figures are the rubric's rank proxy (grade C) unless noted. WebSearch was unavailable because the session budget was exhausted.

---

## Candidates

### 1. Gamer-themed weather app ("weather like your favorite game")
- **Wedge:** A weather app plus home/lock-screen widgets that render conditions as original game-genre scenes (western frontier, cyberpunk city, voxel world, fantasy RPG HUD, retro 16-bit), each with lots of variety. The incumbent has only 3 themes.
- **Demand:** **Game Weather IRL** (solo dev Firat Tekin, launched 2026-04-29) is already **Weather #78 grossing** with only 192 ratings. That is a 2026 newcomer earning, so the bonus criterion is met. Its in-app purchases: theme packs at $29.99 each ("Outlaw Frontier", "Night City", "Voxel Worlds"), Premium $9.99 to $59.99 lifetime, plus $3.99–$29.99 tiers. Weather is a small category, so the estimate is roughly $5–20K/mo (grade C, unverified). Gate 1 is borderline on dollars but clear on "a newcomer got paid".
- **Scan (web fallback):** "game weather", "video game weather app", "pixel weather", "retro weather widget", "rpg weather". There are 48 results, but only about 8 are true themed-weather competitors: Game Weather IRL (192 ratings, 3.98), RetroWeather TV (2026-02, 409, 4.76; a retro TV look, not gaming), Skydex Pixel Weather (2026-04, 68), CapyCast Pixel Weather (2026-03, 0), Void Widgets retro (2025-12, 66), Pixel Weather (2017, $4.99, stale since 2024-03), Eorzea Weather for FFXIV (27), DailyWX. Five or six launched in 2025–26, all tiny, and only Game Weather IRL is on a chart.
- **Why it's open:** The incumbent is 5 months old with a 3.98 rating. The reviews it shows are mostly 2026-09 and repeat "only 3 themes", "over priced", "description was deceiving", "alerts don't work". People are paying $20–30 for a single skin, which shows willingness to pay for a gamer aesthetic.
- **Kill risks:** IP. Themes must be original art "inspired by" a genre, never RDR2 or Cyberpunk assets or names; the incumbent's "Night City" pack is already close to that line. Art production is the real cost, though AI-assisted pixel or voxel art plus Lottie or Rive helps. It is a small category, and Game Weather IRL can add themes quickly.
- **Build:** Apple WeatherKit (500K calls/mo included with the developer membership) plus WidgetKit widgets (Swift). Feasible in 4–6 weeks.
- **Scores:** Demand 3, Openness 4, Buildability 4, Video/ASO fit 5 (the founder is a gamer; "my weather app looks like [genre]" side-by-side clips), Retention-independence 4 (sold as lifetime theme packs, and widgets keep it on screen).
- **Verdict: PASS (best founder fit in this hunt).** Before committing, confirm the incumbent's earnings trajectory (Appfigures or Sensor Tower).

### 2. Party / drinking card game (Picolo replacement)
- **Wedge:** A modern Picolo with Gen Z prompts, custom player names, packs and **one-time "party pass" pricing** instead of a weekly subscription.
- **Demand:** **Picolo** is **Entertainment #64 grossing** (44.7K ratings, 4.72). Estimated $30–100K/mo (grade C). Its in-app purchases: Premium Subscription $4.49 / $7.99 / $13.99 / $45.99, plus $3.99 packs. In games, newcomers win: **Imposter Game – Party Edition** (solo dev, launched 2025-05) has 91.6K ratings and sits at Games free #44. Heads Up! is Games paid #2.
- **Scan (web fallback):** "drinking game", "party game adults", "picolo", "never have i ever". This gave 42 results, almost all true competitors. Launches: 2025: 7, 2026: 2. That is not a flood, but the shelf is full of established 2015–2019 apps (Cheers 15.9K, 4.94; Truth or Dare Chouic 13K; Never Ever 11K; 5 Second Rule 10K). Only Picolo is on a grossing chart.
- **Why it's open:** **Picolo has not been updated since 2023-03-07 (2.5+ years).** Its reviews show billing anger: "$5 a week is highway robbery" (2025-11), "FRAUD. Charging me $4.50 a WEEK for 3 years". Of 10 review texts, 22 mentions of "charge".
- **Kill risks:** It is easy to clone, and there are many free alternatives. Ratings are 17+, so App Store alcohol content rules apply. Charts for the category are thin, and money concentrates in one app.
- **Scores:** Demand 3, Openness 3, Buildability 5 (2–4 weeks; the content is the work), Video/ASO fit 5 (party clips, college audience), Retention-independence 5 (used per party, sold as one-time packs).
- **Verdict: BORDERLINE-PASS.** Cheap and fast to test with video, but the ceiling is likely low tens of thousands of dollars a month.

### 3. Randonauting / "IRL side quest" generator
- **Wedge:** A random-destination and side-quest generator. You pick a radius, get a random point plus a quest prompt, the app logs a trip journal and gives a shareable "what I found" card. It has a clean UI and none of Randonautica's token economy.
- **Demand:** **Randonautica** is **Navigation #55 grossing** and Navigation #61 free (13K ratings, **3.53 stars**). Its in-app purchases are complex: Pro $6.99/mo, $12.99, "Owl Tokens", "Daily Token Boost", radius add-ons, "Unlimited Points". Estimated $15–50K/mo (grade C).
- **Scan (web fallback):** "randonautica", "randonauting", "random coordinates adventure", "explore random places". There are only about 6 true competitors: Randonauting Location Around (5.2K, stale since 2025-03), Randonauting Adventure Around (332), Sidequest: Explore Your City (2026-03, 206), Glimsp (2025-12, 11), GeoSurprise and Random Place (0 ratings). No flood.
- **Why it's open:** The incumbent is rated 3.53 with nickel-and-dime tokens, the clones are stale, and no challenger is on a chart.
- **Kill risks:** The 2020 TikTok peak has passed, so demand may be fading. Safety and trespass concerns (the app must avoid private property and night use). The "quantum intention" framing is pseudo-science, so market it as "side quests".
- **Scores:** Demand 3, Openness 4, Buildability 5 (MapKit, about 3–4 weeks), Video/ASO fit 5 (POV "the app sent me here" is a native short-form format), Retention-independence 3.
- **Verdict: BORDERLINE-PASS.**

### 4. Speedometer / HUD (ASO play)
- **Demand:** Five speedometers are on the Navigation grossing chart: Speedometer Simple #31 (129K ratings), Orin Light (launched 2025-06) #61, Mikhail Nikitsin #70 (**stale since 2024-11**), WE DAO (launched **2026-04**) #71, BITHAUS #86. Two 2025–26 newcomers made the chart, so ASO works. Speedometer 55 Pro is Navigation paid #8.
- **Incumbent weakness:** The GPS Speedometer reviews say "Purely subscription based now… $4.99/week… over $250 per year" (2024-12) and "paid yearly, no trip stats" (2025-03).
- **Scan (web fallback):** 23 results. Launches: 2025: 2, 2026: 3. But the shelf is full of 15–65K-rating apps (Speedometer 55, Speedometer», Unicom clones).
- **Scores:** Demand 3, Openness 2, Buildability 5, Video fit 1, Retention-independence 4.
- **Verdict: BORDERLINE (ASO-only).** It's a weekly-subscription arbitrage market, a poor fit for a video-led founder.

### 5. Bill splitting (Splitwise replacement)
- **Demand:** **Splitwise** is **Finance #28 grossing** (28K ratings, **3.99**). Est. $100–500K/mo (grade C).
- **Weakness:** Of 10 review texts, 8 mention subscription and 6 mention limits: "No longer useful… paywalled" (2026-08), "Impossible to get your money out" (Splitwise Pay, 2025-09).
- **Scan (web fallback):** 24 results. Launches: 2025: 5, 2026: 4. The problem is that **free, well-rated alternatives already exist**: Tricount (7.2K, 4.88), Splid (4.1K, 4.91), Settle Up, and Split Pay (18K, 4.87; Finance #23 free).
- **Verdict: FAIL.** The angry users already have free places to go, the app is semi-two-sided, and it films poorly.

### 6. Bowling score / stats tracker
- **Demand:** Lanetalk is Sports #70 grossing (2.3K ratings, **3.84**). Its reviews include "Paywall score tracking?? Bye!" (2025-11) and "should be better for the price" (2026-03). PinPal ($8.99, Sports paid #15) **has not been updated since 2023-03** ("developer has given up", 2025-05). BowlSheet ($29.99) is paid #74.
- **Scan (web fallback):** 26 results. **2026: 13, 2025: 4.** Solo developers have already piled in.
- **Verdict: FAIL.** The flood has started, Lanetalk's real moat is its bowling-center sync network, and demand is small.

### 7. Walk-up / walkout songs for youth baseball
- **Demand:** BallparkDJ is Sports #57 grossing (26K ratings, 4.79; $6.99/yr activation). Next Batter Up ($5.49) is Sports paid #11, and Batter Up (launched 2026-05) is paid #72.
- **Scan (web fallback):** 22 results. **2026: 15 launches** (Walkup Pro, Dugout Dude, OnDeckDJ, Walk-Up Hype, WalkAmp…).
- **Verdict: FAIL.** A 2026 clone wave, and the incumbent is well rated.

### 8. Ghost hunting / spirit box (paid-upfront entertainment)
- **Demand:** Paid utilities pile up here: Spirit Talker (Lifestyle **paid #1**, $4.99, rated **2.75**, stale since 2025-02), Ghost Science M3 (Entertainment paid #3, $10.99), Necrophonic (Utilities paid #6, $9.99, **stale since 2022-06**), Spirit Contact Talker (paid #14, $7.99), and Ghost Hunter M2. It proves people pay upfront, but none of these apps is on a grossing chart.
- **appscan** (`--must '(spirit box|ghost|paranormal|evp|emf|itc)' --namemust '(spirit|ghost|paranormal|evp|emf|necro|ovilus|itc|haunt|...)'`, terms "spirit box", "ghost hunting", "ghost detector", "paranormal", "evp recorder", "emf meter ghost"): **195 competitors, 2025: 24, 2026: 58**. The top apps are Ghost Camera Detector Radar (55K), Spirit Board (52K) and GhostTube SLS (9.6K). None has a grossing slot.
- **Verdict: FAIL.** A clone flood, plus a "fake detector" honesty problem.

### 9. Live ATC radio
- **Demand:** **ATC – Live Air Traffic Radio** (launched **2026-01**) is already **Travel #4 grossing**, with an $89.99/yr plan that reviews complain about ("can't justify the price"). LiveATC Air Radio (Travel paid #2, **3.6 stars**) has reviews saying "SUPER unreliable" (2026-04). This is the best weak-incumbent-to-newcomer story in the data.
- **Verdict: FAIL on buildability.** It depends on owning or licensing ATC audio feeds and receivers. Record it as evidence that a polished, video-marketed reskin of an ugly incumbent can reach a top-5 grossing slot within 9 months.

### 10. Package tracker
- **Demand:** Five apps are on the Shopping grossing chart, including **TrackPack (launched 2026-06) at Shopping #5** and Parcels Hub at #10 (**3.49**, 7 of its 10 review texts are 1-star "scam", "$10 a week").
- **Scan (web fallback):** The shelf is dominated by Route (519K), AfterShip (164K), Parcel, 17TRACK and Deliveries.
- **Verdict: FAIL.** It's a paid-ads weekly-subscription arbitrage game, the founder has no ad budget, and carrier APIs cost money.

---

## Quickly rejected weak incumbents (with reason)

- **Weather Underground** (3.91, stale since 2025-06), NOAA Radar/Weather Forecast (Position Mobile, stale since 2024-12): generic weather is a mature, ad-funded market.
- **Find My Phone, Friends & Family** (3.56, stale since 2023-12, Social #80): its reviews are about billing scams, and the category is tracker spam with platform risk.
- **Cocktail Flow** (stale since **2019-12**, still Food #61 grossing) and 8,500+ Drink Recipes (stale since 2025-04): there's real demand and weak updating, but 8 of the top 24 results launched in 2025–26 (AI cocktail apps), and the fit with a college-age founder is weak. Borderline at best.
- **Yard Sale Treasure Map** (Shopping #31, solo dev, 36.5K ratings): needs a scraped listings data source.
- **Christmas List** (paid #4 Shopping, $2.99) and Christmas Gift List Tracker (#58 grossing): seasonal and crowded with well-rated free wishlist apps (Elfster, Giftful, GoWish).
- **Goal Horn Hub** ($3.99, Sports paid #20): too small, and 7 of the top 27 results launched in 2026.
- **Board Game Stats** (paid #6 Lifestyle): a loyal niche that is well served by the incumbent (4.87).
- **Pass2U / Walletsmith** (wallet-pass makers, Shopping #40/#48): 9 of the top 28 results launched in 2025–26, and Apple Wallet itself keeps adding features.
- **AnkiMobile** ($24.99, 4.04, Education #43): its users won't leave the Anki ecosystem, and AI flashcard apps are flooded.
- **Tarot!** (paid, stale since 2020, all 5-star reviews praising "pay once"): this shows that pay-once wins in tarot, but tarot and astrology is a clone war.
- **Miku, Camera Connect, Gazing, Zmodo, La Crosse** (low ratings): hardware companion apps.
- **Dating, streaming, news and webnovel** low-rated apps: network or content businesses.
- **Card scanners (TCG and sports)**: 10+ apps on grossing charts, most launched 2025–26. A known flood.
- **MagicTable (Disney dining alerts)** and Warehouse Runner (Costco stock): both depend on scraping, which carries terms-of-service risk.

## Cross-cutting takeaways

- The clearest pattern of **"ugly or abusive incumbent, then a polished 2026 newcomer reaches the chart"** is ATC Live (Travel #4), Game Weather IRL (Weather #78), TrackPack (Shopping #5) and the speedometer newcomers. Only Game Weather IRL's niche is also buildable and open for this founder.
- **Weekly-subscription anger** (Picolo, GPS Speedometer, Parcels Hub, Splitwise limits, Lanetalk paywall) is the most common complaint in the reviews I could read. A "pay once / lifetime" offer is a credible wedge in every one of those niches.
- **To redo when the Search API unblocks:** run `./runall.sh` in this folder. It re-runs appscan for PARTY, SPLIT, BOWLING, WALKUP, SPEEDO, GAMEWX, RANDONAUT, PACKAGE, GIFTLIST, GOALHORN and BOARDGAME, writing to `scans1.txt` and `scans2.txt`.
