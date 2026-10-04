# Red team A: Minecraft build guides and the Picolo-replacement party game

Date: 2026-10-04. Grades: A = read directly from an App Store page, the iTunes lookup, or a developer or Mojang page; B = inferred from A data; C = an estimate from chart rank; M = from memory and not re-verified this session.
Raw data is in `market/rtA/`: `mc_w3.txt`, `party_w.txt`, the product pages `p<id>.html`, `mug.txt` (the Mojang usage guidelines), the review JSON files, and `ids.py`. I did not use the iTunes Search API. Everything comes from the apps.apple.com web search, lookup, and product pages.

---

## Candidate A: Minecraft build guides. Verdict: **KILLED as proposed**

### 1. The proposed wedge is already on the store and is not gaining traction (A)
- **Noobo, "Minecraft Build Guides"** (Icy Studios, launched **2026-03-09**). Its listing reads: "interactive 3D Minecraft build guides… Rotate every model, zoom in, inspect individual blocks and reveal each structure layer by layer… 200+ Minecraft builds… exact material lists". It also has a mascot, "NOOBO the cute Creeper". Pricing is $3.99–4.99 a week, $7.99–14.99 a month, and $19.99–44.99 a year. **It has 87 ratings after 7 months.**
- **ENDER, "Builds for Minecraft"** (launched **2026-09-09**). Its listing reads: "real interactive 3D model… floor slider to move through a build one layer at a time… like a LEGO instruction manual… replace blocks with your own… exact material lists… redstone contraptions". It has no in-app purchases (free) and **1 rating**.
- So "a 3D layer-by-layer viewer plus a bigger catalogue" has shipped twice in 2026, and one of those apps is free. This is the same pattern as the Gamer IRL kill: the wedge exists and isn't moving.
- WBuilds' own site already claims **550+ builds and new builds every Friday**, so "a bigger, fresher catalogue" isn't a gap either.

### 2. Competitor count across the keyword variants (A)
- I scanned 17 terms in total. The 12 new ones were house ideas, build ideas, blueprints, litematica, schematics, craft guide, builder guide, mc build guide, build tutorial, building ideas, wbuilds and hypecraft.
- After removing addon, skin and sandbox apps, that leaves **about 22 true build-guide apps**.
- **Launches: 2025 = 4** (Building Guide for MC by Melian, EasyBuild, Master Builder, WBuilds) and **2026 = 6** (Noobo, Craft Block Tool, Buildings for MC MC, Builds Guide Tutor, MineCompa, ENDER). **3 of these came in the last 90 days.**
- **Only one launch since 2024 has passed 600 ratings, and that's WBuilds.** The other followers have 437, 87, 56, 7, 4, 2, 1, 0 and 0. Most of the older apps are stale or rated below 4.0.
- **HypeCraft** has 6,203 ratings but **no grossing slot**, even though it charges $9.99 a week. Rating count does not predict revenue here.

### 3. Who WBuilds really is (A)
- The developer is Sagar Khurana. His other apps are **"Cheat Codes for GTA Cheats Pro"** (4,039 ratings) and an invoice maker.
- HypeCraft's developer (Hector Ullate) runs the same playbook: GTA San Andreas Cheats (4.5K ratings) plus seven unrelated apps.
- **These are ASO and ad-arbitrage app studios, not Minecraft creators.**
- A WBuilds review says: "when I watched… ads it said it was completely for free… only free for seven days… false advertisement". That's a kid describing **paid user acquisition**.
- WBuilds' site claims **500K+ downloads and 63.7K Google Play ratings against 4.1K on iOS**, and a free web version. Its scale comes from Android, the web and ads, not TikTok-native iOS.
- In-app purchases: $2.99 a week; $2.99–3.99 a month; $12.99–24.99 a year; a $13 or $39.99 lifetime; and a $12.99/yr "Pro Cheats" pass.
- Rating histogram: 3392 / 401 / 109 / 40 / 194 (5★ down to 1★).

### 4. Is Reference #61 real money? Only modestly (B/C)
- The Reference grossing chart has a low floor. **#99 is "Magic poster" with 5 ratings**, and #97 has 762 ratings.
- WBuilds sits at #61 between Glorify and Picture Bird.
- **Estimate: about $8–25K/mo US iOS gross (C)**, before Apple's 15–30% cut and before ad spend. Net of ads, the margin is unknown.

### 5. IP and policy (A from mojang.com; M for Apple)
- **The Minecraft Usage Guidelines never authorize paid apps.**
  - They cover videos, servers, mods, books, events and hand-crafted goods, nothing else.
  - The closing rule: "**If something isn't covered by these guidelines… that probably means we don't want you to do it… please don't do it without getting written permission.**"
  - Revocation: "permissions… may be revoked at any time… if we don't like what you are doing."
- **Naming:**
  - "You may not use the Minecraft name as the primary or dominant name or title". Their example of a name they reject is "Minecraft – the ultimate help app" ("we're not cool with this").
  - "Builds for Minecraft" style naming is the tolerated pattern. Noobo's "Minecraft Build Guides" violates it.
  - You must carry the disclaimer "NOT AN OFFICIAL MINECRAFT [PRODUCT]. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT".
  - No Minecraft textures, logo, fonts or screenshots in the branding. Showing block textures in a 3D viewer uses Mojang assets, so you need original or look-alike textures.
- **The risk is tolerance, not permission.** Hundreds of "for Minecraft" apps survive. Apple rejects some under 5.2.1 and 4.1 when they lack an authorization document or use the name dominantly (M). A takedown only takes one complaint.
- **The audience is kids.** All the apps are rated 4+.
  - Payers are under-13s using Ask to Buy, or parents.
  - The new US app-store age laws require parental consent for minors' purchases: Texas SB2420, with Utah and Louisiana in 2026. Texas SB2420 was reportedly enjoined in Dec 2025 (M, unverified).
  - Expect low trial-to-paid conversion and refund requests. The WBuilds kid reviewer: "I don't have the money".
  - You'd need COPPA-safe analytics, and TikTok won't let you advertise to under-13s.

### 6. Content production for a solo dev (B)
- You'd build each structure in-game, export it with Litematica or WorldEdit `.schem`, parse the NBT into JSON, and render it in three.js or SceneKit. A medium build takes about 1–3 hours, so **100 builds ≈ 150–300 hours**, plus original textures.
- Free sources (Planet Minecraft, minecraft-schematics.com, Grabcraft) are user uploads with **no commercial license**. Scraping them is copyright exposure, and the builders are vocal online.
- The cheaper alternative is commissioning builders on Fiverr, at about $10–50 per build (M).

### 7. Revenue estimate for a challenger
- Month 3: **$0–1K/mo**.
- Month 12: **$1–5K/mo** in the base case, which is Noobo's trajectory.
- Upside: $10–20K/mo, but only if a TikTok hit converts kids' parents. Nothing in the data shows that happening for any follower.
- **Kill reasons:** the wedge has already been shipped twice in 2026 without traction; the incumbent's moat is ad spend plus Android plus 550 builds; there's no license path; and the payers are kids.

---

## Candidate B: party/drinking card game replacing Picolo. Verdict: **KILLED**

### 1. Competitors (A)
- A 12-term web scan (drinking game, party game, picolo, truth or dare, never have i ever, most likely to, imposter game, kings cup, party games for adults, drinking games for adults, bachelorette, spin the bottle) returned **about 105 true competitors** in a shallow sample of about 12 per term.
- **Launches: 2025 = 19, 2026 = 11.**
- The shelf is crowded:
  - **Over 100K ratings:** Exposed 233K, Charades 136K.
  - **10K–99K ratings:**
    - Imposter Game 91.6K (2025)
    - Wavelength 63K
    - Truth or Dare DH3 44K
    - Imposter Who? 30.6K (2025)
    - Fakeit 26.5K (2025)
    - Couples Games 23K
    - Splash 21.6K (2025)
    - Would You Rather 20K
    - Truth or Dare Cricket 16K
    - Cheers 15.9K (4.94★)
- **The imposter wave alone has put 4 apps launched in 2025 above 20K ratings.**

### 2. The one-time "party pass" wedge already exists, and the best-rated apps use it (A)
- **Imposter Game – Party Edition** sells Premium Access at **$2.99 or $9.99, one-time**. A review mentions "I bought the $10 lifetime pass", and another says "you can still play [free] unlike other games".
- **Cheers** (4.94★) sells **Cheers Premium at $9.99, $14.99 or $29.99, one-time**.
- Others mix one-time and subscription:
  - Fakeit: $39.99/$49.99 lifetime alongside a subscription.
  - Picolo: legacy $3.99 packs plus an $8.99 Premium.
- **Neither of the two pay-once apps is on a grossing chart.** Imposter is in Games, where the top-100 floor is very high. Cheers is in Entertainment, whose floor is low (§3), and still isn't there.

### 3. Picolo's revenue is legacy "zombie" subscriptions, not live demand (A/B)
- Picolo is Entertainment **#64 grossing**. It is **not on any free chart**, and its neighbors at #66 and #69 are TizzChat (5 ratings) and Pivexa (6 ratings). The Entertainment floor at that rank is low: **about $15–50K/mo (C)**.
- The studio, Marmelapp (France), is dormant. Picolo was last updated **2023-03**, Blaze in 2021-03, and Snax in 2022-01.
- The US review RSS has only **50 reviews over about 16 months**, the latest in 2026-05. That's low install velocity.
- **The 1★ reviews are about forgotten weekly renewals:**
  - "charging me $4.50 a WEEK FOR 3 YEARS"
  - "won't let me cancel"
  - "renews MULTIPLE times a month"
  - "they bet on you forgetting to cancel… as this is ultimately a drinking game"
- **That revenue can't be captured by a pay-once competitor.** It's billing inertia among old installs, not people choosing Picolo today.

### 4. How Imposter Game grew (A/B)
- It is a solo developer (Sven Vucak) who launched in 2025-05, riding the 2025 TikTok "imposter" trend.
- **His five follow-up party apps flopped**: 25, 13, 5, 0 and 0 ratings. The newest are Wayoff (2026-08) and Daringo (2026-08).
- The hit came from catching a format trend, not from a repeatable product edge. Several 2025 clones also reached 20–30K ratings riding the same wave, and none of them is on a grossing chart.

### 5. Alcohol policy and distribution (M/A)
- App Store guideline **1.4.3** bars apps that "encourage consumption of… excessive amounts of alcohol" (M).
- Drinking games survive at a 17+ rating, but the pressure shows (A):
  - Picolo's cards say "penalties", not drinks. A review asks them to change "penalties" to "shots".
  - Splash states it is "not intended for use as a drinking game".
- A 17+ alcohol app limits Apple Search Ads and TikTok promotion, and drinking content gets age-gated or suppressed on TikTok and Reels (M). That cuts against the founder's main channel. A non-alcohol version lands you straight in the imposter/charades clone pile.

### 6. One-time versus weekly
- At $2.99–9.99 one-time and roughly 2–5% buyer conversion, revenue is about $0.10–0.40 per install. A thin weekly trial typically makes several times that (B).
- With Cheers and Imposter already pay-once, "fair pricing" is not a differentiator.

### 7. Revenue estimate for a challenger
- Month 3: **$0–1K/mo**.
- Month 12: **$0.5–3K/mo**.
- Upside: a trend-lottery spike (like Imposter's) that decays, and even its own developer couldn't repeat it.

---

## Bottom line
Neither candidate survives:
- **Minecraft build guides:** the 3D wedge was already shipped twice in 2026 (Noobo, ENDER) without traction. The incumbent wins on ads, Android and 550 builds. Mojang gives no license path, and the payers are kids.
- **Picolo replacement:** the one-time wedge is already used by the best-rated apps (Imposter Game, Cheers). Picolo's grossing comes from forgotten weekly subscriptions at a dormant studio. The shelf has about 105 competitors and 30 launches in 2025–26.
