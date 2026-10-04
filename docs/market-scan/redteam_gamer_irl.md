# Red team: "Gamer IRL" (game-style city map + game-themed weather/widgets)

Date: 2026-10-04. Verdict: **KILLED as proposed** (original genre styles + pay-once packs + ETA + widgets as a 6-week bet).
Survives only as an optional ≤2-week, video-first experiment (see the end).

Grades: A = read directly from App Store / developer site; B = inferred from A data; C = rank-proxy estimate.

---

## 1. True competitor count: a clone flood has formed, and it has already shipped the proposed wedge

Sources: one successful iTunes Search call ("game maps irl", 200 results, saved as `gm_search.json`), the
apps.apple.com web fallback (`scans_fsg/ws.py`) over 14 map terms and 9 weather/widget terms (`scratch_gm.txt`,
`scratch_gw.txt`), the earlier `w_gmaps.txt`, plus a lookup of the 5 newest clones. The Search API went
back to 403 on the next call, so terms like "8 bit map" and "pixel map" could only be checked through the
shallow web fallback (about 10–12 results per term). Treat the counts below as a **floor**.

**Real-location game-map apps (true competitors): 17 found** (A)

| App | Seller | Released | Ratings | Grossing |
|---|---|---|---|---|
| Game Maps IRL | Retry Apps (Istanbul) | 2025-03-14 | 29,139 (4.62) | Navigation #19, top-free #22 |
| Mappr: Game Maps | Eren Kulaksiz | 2026-05-22 | 142 | – |
| MapGT: Game Maps & Navigation | Rotu Teknoloji | 2026-07-28 | 35 | – |
| Game Maps IRL: SpawnMap GPS | Asiye Guney | 2025-08-06 | 31 | – |
| MapShifter: Stylized Game Map | Filipp Bazun | 2026-04-23 | 13 | – |
| Game Maps Online: Car Maps | Chetan Shah | 2025-05-30 | 7 | – |
| Gaming Maps – Game Street View | Tulsi Vasani | 2025-09-15 | 7 | – |
| Game Maps: IRL | MapleByte Digital | 2026-08-06 | 6 | – |
| Game Maps – IRL Navigation | LOOP Mobile | 2026-06-24 | 5 | – |
| MapWizard: V Map & Tracker | Govand Qader | 2026-01-07 | 5 | – |
| Pixel Maps – Game Maps IRL | Amaan Ali | 2026-01-16 | 4 (2.0★) | – |
| SpawnMe: Game Map Navigation | Firat Kali | 2026-07-31 | 2 | – |
| Game Maps Real Life | Fatih Alkan | 2026-01-28 | 1 | – |
| Game Maps Reality IRL | Murat Kalayci | 2026-08-12 | 0 | – |
| Game Maps – Play the IRL Map | Deniz Busra Ozdiyar | 2026-06-22 | 0 | – |
| Game GPS Navigator | Mykhailo Dykun | 2026-01-06 | 0 | – |
| Mission Map: Your IRL Minimap | Brandon Thomas | 2025-06-24 | 0 | – |

- **By year:** 2025 = 5; **2026 = 12**. **In the last 90 days (since 2026-07-06) = 4**: MapGT, SpawnMe,
  MapleByte and Murat Kalayci, roughly one new clone every 3 weeks. Nearly all come from small Turkish
  app studios, the same ecosystem as the leader.
- **No follower has passed 150 ratings.** In 19 months the leader is the only app making money.
- **The proposed wedge is already on the store** (A, from the apps' own descriptions):
  - **MapGT:** "real navigation app — live turn-by-turn directions, honest ETAs … wrapped in ten
    hand-crafted game worlds." It has 35 ratings.
  - **MapShifter:** six "hand-crafted, game-inspired worlds", turn-by-turn for driving, walking and
    cycling, OSM place search and offline maps. It has 13 ratings.
  - **Game Maps Reality IRL:** "real GPS navigation app with original themed map skins". It has 0 ratings.
  - **MapleByte:** "Original game-style visual map themes", plus fog of war. It has 6 ratings.
  - So **"original genre styles + ETA + real navigation"** has been tried at least four times in 2026, and
    none of them gained traction. The wedge is not new and is not working.
- **Adjacent apps:** per-game companion maps such as MapGenie and the GTA, RDR2, Tarkov and DayZ maps
  (a different job), and the HUD and minimap terms (no dedicated real-world app found). The leader itself has
  just spun off **"GoGirl – Girly Maps"** (2026-09-14, 20 ratings), so it is reskinning for new audiences on
  its own.

**Weather/widgets** (shallow scan): Game Weather IRL (2026-04-29, 192 ratings, Weather **#78**,
top-free #71), RetroWeather TV (2026-02, 409, a retro-TV look rather than games), Skydex Pixel Weather
(2026-04, 68), CapyCast (2026-03, 0), Pixel Weather (2017, stale), DailyWX and GameTime Weather (tiny). No
new entrant turned up in the last 90 days, so this niche is less crowded. It is also much smaller: Weather
#78 sits beside apps with 2–58 ratings (Turbli+, Venturi, Aspen Weather), so the threshold for that rank
is very low.

## 2. Is Game Maps IRL's revenue durable?

- **Developer** (A, retryapps.co site and JS bundle): Retry Apps is "a developer duo from Istanbul" with
  "8 apps, 1M+ downloads" **in total**. Its tagline is "We Don't Ship Apps, We Ship Viral Hits." The site
  says Game Maps IRL "grew entirely through organic content … No ads, no funding" and describes the
  app as "**GTA-style maps**". Its other apps are Piggy Bank/Mani (408 ratings), Calmy, Swipey, Lunor (AI
  photo), RoadRank, Soulify, Apnea, CamGuide and ToonFlow. All are small.
- **Implied downloads:** the whole studio has about 1M, so Game Maps IRL is probably 0.5–0.9M. With 29K
  ratings that is a 3–6% rating rate, which is high and points to aggressive prompting. One review says the
  app "asks you to review it before you've even seen the maps", and the distribution is 81% 5★
  (23,557 / 2,588 / 1,545 / 296 / 1,153). **The rating count overstates its scale** (B).
- **Durability signals:**
  - In its favor: it is still Navigation #19 grossing and #22 top-free, 19 months after launch. Its
    developer account ID is new (6775402222, about mid-2026), and v2.0 shipped on 2026-06-12, a
    re-org/relaunch after a five-month gap from v1.5 (Jan) to v2.0 (Jun). Since then it has updated about
    monthly (v2.1–2.4, Jun–Sep). Sitting at #22 top-free means it still gets steady new installs, not one
    old spike.
  - Gap: I could not get a chart history (no Sensor Tower or Appfigures access, and the web-search budget
    was used up), so I can't tell whether #19 is the peak or the trough. That stays unverified.
- **Revenue estimate:** Navigation #19 sits between MapQuest and Wavve Boating. That is roughly
  **$30–90K/mo US gross (C)**. Weather #78 is roughly **$3–10K/mo (C)**.
- **Viral evidence:** the developer says growth was organic content. YouTube results are small: "Game Maps
  IRL App Review" 5.1K views, "POV: You made an app that turns your life into GTA V!" 45K views (Short),
  and a "GTA V map in my Hyundai… CarPlay" video at 1K views. TikTok and Reddit pages could not be fetched
  (403/blocked). The big views sit with GTA-vs-real-life content (Shorts at 1–14M views) and CarPlay
  tutorials (745K–3.1M). Those are the hooks.

## 3. Legal/IP: the incumbent's draw *is* the game IP

- Reviews say what users are buying (A): "**almost the same as the game itself**", "the art styles feel
  **very faithful to the original styles of each game**", "I'm a huge **RDR2** fan and I love the
  personal touches with the RDR2 screen" (Game Weather IRL), and "only one that is western (not red dead
  redemption)", posted as a *complaint*.
- **This is the trap.** Original genre styles are the safe route, but they remove the reason people buy.
  Matching the games closely brings the risks that the incumbent carries:
  - App Store guideline 5.2.1 (third-party IP) removal on a rights-holder complaint.
  - Take-Two's history of aggressive enforcement (from memory, not re-verified this session: the
    re3/reVC DMCA takedowns and the 2021 lawsuit, and takedowns of GTA fan projects).
  - The incumbent survives for now with an "unofficial, not affiliated" disclaimer, and its own site says
    "GTA-style". A newcomer can't count on the same tolerance.
- **Guideline 4.3 spam / 4.1 copycat:** with 17+ near-identical "Game Maps IRL" apps (several literally
  named "Game Maps: IRL", "Game Maps IRL: SpawnMap"), review is a real rejection risk for app #18. A
  distinct name and visuals help, but expect review back-and-forth.
- **Map data** (low risk, manageable):
  - OSM data is ODbL. You only need visible "© OpenStreetMap contributors" attribution.
  - Hosting: Protomaps PMTiles (about 120 GB planet) on Cloudflare R2, with no egress fees, costs only
    a few $/mo. OpenFreeMap is free but has no SLA.
  - Avoid Mapbox: its per-MAU billing after the free tier scales badly against a pay-once model.
- **CarPlay:** a navigation app needs Apple's CarPlay navigation entitlement, which is granted on request
  and is not guaranteed. The incumbent's marketing and reviews lean heavily on CarPlay ("Best turn-by-turn
  … on CarPlay"). Without it you are behind on the feature people film.

## 4. Retention and pay-once economics

- The reviews point to a novelty product: "The map itself is still just a gimmick… just a yellow line"
  (2★). Yet it still sits at #19, which shows **navigation quality is not why people buy**. They buy
  the look and the CarPlay flex. ETA, which the hunt reports called the top complaint, is a 3★ wish-list
  item, not a switching reason.
- **The pay-once wedge already exists:** the incumbent sells "Unlock All Maps" at **$49.90** and $29.99
  on offer, next to $7.99/wk, $9.99–14.99/mo and $39.99–79.99/yr (A). "Greedy developers" is the
  complaint of non-payers. The payers already have a lifetime option.
- **Pay-once vs weekly:** for an impulse novelty with fast churn, the weekly trial captures most revenue
  in the first week. Selling $9.99–19.99 packs needs about 3–5× the conversion of a $7.99/wk plan just to
  match revenue per install. That higher conversion is unproven, so pay-once is a positioning angle, not a
  revenue advantage. If built, use a hard paywall with weekly + yearly + lifetime, the way the incumbent
  does.
- **Weather:** Game Weather IRL's own reviews show the same pattern. People love the RDR2 scene, hate
  the immediate paywall, and complain that it has "only 3 themes". It is a theme-art business, and the
  money sits in about 200 RDR2 fans.

## 5. Build difficulty (Expo/RN solo)

- **Styled map:** easy. Use @maplibre/maplibre-react-native (needs a dev build and config plugin) with
  custom style JSON and PMTiles. Expect 1–2 weeks, but the art and style design of each "world" is the
  real cost, and it is ongoing.
- **ETA/routes:** moderate. MKDirections needs a small Swift Expo module (free). Alternatives are
  OSRM/Valhalla, which you would host and pay for, or a routing API priced per request.
- **Turn-by-turn live navigation** (rerouting, voice, background location, lock-screen Live Activity):
  hard, 3–4+ weeks to do well. The clones above already claim it.
- **CarPlay:** a separate native template app plus the entitlement wait. Not realistic in 6 weeks.
- **Widgets:** moderate. WidgetKit in Swift via `@bacons/apple-targets` or Expo's widget target support.
  The founder has done native targets in Locturne.
- **WeatherKit:** 500K calls/mo included with the developer program, then paid tiers. Fine at small
  scale. It needs Apple attribution and a server-side JWT or the native API.
- **Summary:** a map MVP with original styles and ETA takes about 3–4 weeks, and widgets plus weather
  about 2 more. The scope fits the time box. The problem is that the market has already shown this build
  does not win.

## 6. Founder fit (video)

- **Strong match on paper.** The hook "I turned my city into GTA" taps a proven appetite: GTA-vs-real-life
  Shorts reach 1–14M views and CarPlay videos 0.7–3M. The leader grew with no ads, which is the founder's
  own playbook.
- **But the hook is the IP name.** With original art, "I turned my city into a video game" is a weaker
  hook, and comment sections will point viewers to the more faithful incumbent, which sits one search
  away. The only app-specific video I found with traction ("POV: you made an app that turns your life into
  GTA V") reached 45K views, not millions. Others reached 1–5K.
- The founder's track record (Rivaldle, ~1M views) came from a daily game, a retention format. This is a
  one-shot novelty, so each video gives a spike, not compounding users.

## Revenue range for a well-executed challenger (C, reasoning-based)

- **Month 3: $0.5–4K/mo net** (median about $1–2K). Inputs are launch videos and modest search
  (branded "game maps" searches go to the leader, and 17 others split the long tail). It reaches $8–15K
  only if one video hits several million views and CarPlay is live, and CarPlay won't be.
- **Month 12: $0–6K/mo** (median about $1–3K). Pay-once means revenue tracks how often videos get posted,
  with no MRR floor. The clone rate of about 1 per 3 weeks and the leader's own spin-offs keep pressing
  on rank. Upside of about $20–30K/mo needs becoming the clear #2 on the Navigation chart. In 19 months none
  of the 16 followers has done that, including ones with 10 worlds and turn-by-turn navigation.
- **Weather add-on: +$0.3–2K/mo** at most (the leader is around $3–10K at #78).

## Verdict

**KILLED (as proposed).**
1. The wedge (original styles, real navigation, ETA, multiple worlds) is already shipped by at least
   four 2026 apps with 0–35 ratings.
2. There are 12 clones in 2026 and 4 in the last 90 days, a forming flood, and none has passed 150 ratings.
3. Reviews show buyers pay for faithfulness to GTA, RDR2 and Cyberpunk, which a careful challenger can't
   legally copy.
4. Pay-once is already offered by the leader ($49.90 unlock-all).
5. The weather half is a single-digit-thousand-dollar niche.

**The only version worth considering:** a ≤2-week test, phone-only map with 2 strong original worlds and
a lifetime + weekly paywall. Post 5 videos. Continue only if one video passes 500K views *and* converts
more than $1K in the first week. Otherwise drop it. Don't build weather, widgets or CarPlay first.
