# Hunt: Education, Books, Reference, Productivity, Business (2026-10-03/04)

Method: I mined `recent_grossing_2024plus.tsv` (about 150 rows in these 5 categories) and the grossing, free and paid charts in `all_charts.tsv`. That gave about 35 niche candidates. I scanned every candidate I judged on.

**Scan caveat:** other agents were using the iTunes Search API at the same time, and it rate-limited hard (403s). Scans marked **[itunes]** used `appscan.py` (up to 200 results per keyword). Scans marked **[web]** used `scans_edu/wscan.py`. That script runs the apps.apple.com web search and then an iTunes lookup, with the same regex filters and year counts as appscan. But it returns only about 25–80 IDs per query, so **[web] competitor counts are a lower bound** (roughly 1/3 to 1/5 of an [itunes] count). Raw outputs are in `scans_edu/*.txt`.

Revenue numbers are rank-based estimates from the RUBRIC proxy (grade C) unless stated otherwise. WebSearch was exhausted (the session hit its 200-search cap), so there is no third-party revenue data.

## Headline finding

**Exam/test prep is a template-studio flood. It fails across the board.** The same sellers publish a near-identical app for every exam: EASY PASS COMPANY, Best Fun Games LLC, Higher Learning Technologies, Prepia, MastrAPI, Danila Danilenko, Hanh Le, Mapola, Elegant eLearning. The 2026 launch counts from my scans:
DMV 49 · Part 107 drone 51 · HVAC/EPA 608 45 · real estate 41 · citizenship 55 · ASVAB 36 · NCLEX 21 · CDL 14 · CNA 11 · allied-health (EMT/phleb/PTCB/ARDMS) 19 [web] · pilot 21 [itunes] / 11 [web]. Only high-ARPU, high-effort sub-niches (pilot, sonography) still show a newcomer winning.

---

## Candidates

### 1. Minecraft build guides (step-by-step blueprints) — **PASS (best founder fit)**
- **Wedge:** a WBuilds-style guide with a free daily build, a 3D layer-by-layer viewer, and a much bigger, fresher catalogue. Reviews say "running out of things to build" and complain that "everything is premium". Optional AI "build this from a screenshot".
- **Demand:** WBuilds (Sagar Khurana, solo dev, **launched 2025-12-11**) is at **Reference #61 grossing** and Reference #45 free, with 4,136 ratings in about 10 months. Pricing: $2.99/wk, $2.99–3.99/mo, $12.99–24.99/yr, $13–39.99 lifetime (from the App Store page). Estimated ~$10–40K/mo (C). HypeCraft (2024-07) has 6,203 ratings at 4.52 but isn't on the chart.
- **Scans [web]:** `wscan.py --must 'minecraft|block' --namemust 'build|guide|...' "minecraft building guide" "minecraft builds" "minecraft build ideas" "minecraft blueprints" "minecraft house ideas"` gave 19 matches. A second scan (redstone/castle/3d blueprint/mc builds/minecraft guide) gave 27. Together that's about 25–30 distinct true competitors. **Launches: 2025 ≈ 5, 2026 ≈ 6**, and only 2 have more than 1.5K ratings. Top: HypeCraft 6.2K/4.52, WBuilds 4.1K/4.63, House building for MC 1.5K/3.96, MC Constructor 1.3K/3.99 (last updated 2024-01), Redstone Guide 1.0K/4.40 (last updated 2024-01).
- **Why it's open:** only one app makes money, and its 1-star reviews are all about the paywall and thin content. The older apps are stale or rated under 4.0. Adjacent gaps: redstone tutorials (the leader is stale since 2024), survival-base "starter kits", and builds for Bedrock vs Java.
- **What could kill it:**
  - Mojang/Microsoft IP and App Review 4.1/5.2.1. You must use "for Minecraft" naming and can't use their assets.
  - The audience is kids, so parents pay, ARPU is low, and you need COPPA-safe analytics.
  - Content pipeline: every build needs block-accurate layer data. That means building them yourself, commissioning builders, or importing .schem files you have rights to.
  - Free YouTube/TikTok tutorials are the substitute.
- **Scores:** Demand 3 · Openness 4 · Buildable 4 (a three.js/SceneKit voxel layer viewer is the hard part) · Video/ASO 5 (Minecraft build content is native to TikTok, and he's a gamer) · Retention-independence 3 (weekly drops sustain subscriptions).

### 2. AI pilot knowledge-test + mock-oral prep (FlyCowboys wedge) — **BORDERLINE**
- **Wedge:** ACS-based question bank (FAA material is public domain), explanations for every question, and an AI "examiner" mock oral checkride.
- **Demand:** FlyCowboys (**launched 2025-10-23**, only 101 ratings) is at **Education #94 grossing** at $29.99/mo and $83.99–167.99/yr. Estimated ~$30–60K/mo (C). Very high ARPU. Paid-chart incumbents: Prepware (3.89 and 2.58 stars, $9.99) and Sporty's ($14.99).
- **Scans:** [itunes] `appscan.py --must 'faa|knowledge test|written test|checkride|private pilot' ... "private pilot test prep" "faa written exam" "pilot ground school" "faa knowledge test"` found 121 competitors, with **2025: 9, 2026: 21**. [web] checkride/oral terms found 49, with 2026: 11. Top: Sporty's 11K/4.89, King Ground School 10.5K/4.88 (last updated 2025-10), King Test Prep 2.3K (last updated 2025-08), Aeroapps 1.5K, Prepware 137/3.89.
- **Why it's open:** the incumbents are video-course companies with legacy apps, and ASA Prepware is poorly rated. The AI oral exam is new, and that's exactly where FlyCowboys is getting paid.
- **What could kill it:** 21 launches in 2026 means template studios (e.g. Danila Danilenko) are arriving. The founder isn't a pilot, and accuracy matters. The US market is small (~60–70K student pilot certificates a year).
- **Scores:** Demand 3 · Openness 3 · Buildable 4 · Video/ASO 2 (ASO-driven; aviation TikTok exists but isn't his world) · Retention-independence 5 (users pay big for 1–3 months).

### 3. Anki-compatible spaced repetition app — **BORDERLINE**
- **Wedge:** imports .apkg decks and uses FSRS scheduling, with a modern UI and a fair subscription instead of a $24.99 upfront price. Aimed at med students and language learners. It can't use "Anki" in the name.
- **Demand:** AnkiMobile is at **Education #43 grossing** and **#1 paid** at $24.99. It has 4.04 stars, was last updated 2025-09-08 (stale), and is disliked for its price and UX. Estimated $100–500K/mo (C).
- **Scan [web]:** `"anki" "spaced repetition" "anki flashcards" "apkg" "flashcards spaced repetition" "srs flashcards"` found 38, with **2025: 5, 2026: 15** (mostly fewer than 20 ratings). Top: Quizlet 1.1M, Brainscape 21K, AlgoApp 20K, Noji 14K, AnkiMobile 2.3K/4.04, Koki 337, Azri (FSRS) 221.
- **Why it's open:** the money sits with one stale, poorly rated, paid app. Anki-compatible alternatives are tiny.
- **What could kill it:** AnkiMobile users are locked into AnkiWeb sync (there's no third-party sync, so imports only). The AI-flashcard clone war (Knowt, Turbo, Coconote, Cogni) owns "AI flashcards". Anki's trademark is enforced (Noji, formerly AnkiPro, had to rename). Heavy users are picky.
- **Scores:** Demand 4 · Openness 3 · Buildable 4 · Video/ASO 3 (he's a student; StudyTok) · Retention-independence 2.

### 4. ASL / sign-language learning — **BORDERLINE (proven, but a poor fit)**
- **Demand:** Ziggy (**launched 2026-07-21**) is already at **Education #33 grossing** and #19 free, with 3,799 ratings. Pricing: $7.99/wk, $49.99/yr. Lingvano is #23 and ASL Bloom #67. Estimated $100–500K/mo for Ziggy (C). This is the strongest "newcomer wins fast" signal in my slice.
- **Scan [itunes]:** `appscan.py --namemust 'asl|sign' --must 'sign language|asl' "learn asl" "sign language" "asl app" "american sign language"` found 107, with **2025: 10, 2026: 17**. Top: Lingvano 118K/4.88, ASL Pocket Sign 39K/4.81 (last updated 2025-08, stale), ASL Bloom 36K/4.90, Intersign 4.8K, Ziggy 3.7K, ASL Otty 3.6K (2025-10).
- **What could kill it:** you need hundreds of filmed sign videos from Deaf/fluent signers, which means real production cost. The Deaf community criticises hearing-made ASL apps. The founder doesn't sign. The flow of new apps is rising after Ziggy's success.
- **Scores:** Demand 5 · Openness 3 · Buildable 2 · Video/ASO 3 · Retention-independence 3.

### 5. Interactive fiction / AI fanfic roleplay (Y/n, Glimmer) — **BORDERLINE → FAIL for this founder**
- **Demand:** Y/n (2025-04) is at **Books #14** (Y/n+ $4.99/wk, $14.99/mo), Glimmer (2025-07) **#16**, Janitor (2025-11) #30, Okudu #43, Sagaland #71. Estimated $100–300K/mo each for the top two (C).
- **Scan [itunes]:** `"interactive stories" "choose your own adventure" "interactive fanfic" "ai story game" "interactive fiction"` found 66, with only **2025: 9, 2026: 9**. A gamer-angle variant [web] "AI text adventure / AI RPG / AI dungeon" found 38, with 2026: 12. AI Game Master has 5.6K ratings and Neverend (2026) 1K, but neither is on a grossing chart.
- **Why it fails here:**
  - It's functionally AI-companion roleplay. Reviews compare it to c.ai, and AI companion is a listed clone war.
  - The audience is teen girls, with romance and "smut" moderation and minors risk.
  - LLM cost per message.
  - The gamer variant (AI text RPG) has no grossing proof.
- **Scores:** Demand 4 · Openness 3 · Buildable 3 · Video/ASO 2 · Retention-independence 2.

### 6. Social-skills / charisma trainer (Gleam) — **BORDERLINE-FAIL**
- **Demand:** Gleam (2025-05) is at Education #82 grossing with 11.4K ratings.
- **Scan [web]:** 41 matches, **2025: 15, 2026: 15**. Social Wizard 6.7K (last updated 2025-04, stale), CharmXP 2.5K/4.40.
- **Why it fails:** it sits right next to the rizz/looksmax clone war. The launch rate on a small web sample suggests a large real count.
- **Scores:** D3 O2 B4 V4 R2.

### 7. Crochet/knitting pattern companion — **FAIL (fit + rising flood)**
- **Demand:** YarnPal (2024-12) is at Lifestyle #39 grossing with 33K ratings. Loopsy (2025-05) has 16K and LoopCraft (2025-10) 5.3K.
- **Scan [web]:** 34 matches, **2026: 17**.
- **Why it fails:** the money is already split three ways among 2024–25 entrants, and the audience is far from a Gen Z male gamer. Sewpal and WoodSense (hobby guides, both at Reference #58 and #23, both 2025) are run by identifier-farm studios (PIXELCELL, Next Vision), and the sewing/woodworking scan shows 14 launches in 2026.

### 8. AI construction cost estimator (SimplyWise) — **FAIL**
- SimplyWise (2024-09) is at **Business #10** with 37K ratings, so demand is real.
- **Scan [web]:** 50 matches, **2026: 24** (the copycats have arrived: Brite, Handy Bro…). Joist (#13) and Invoice Fly also own invoicing.
- The founder has no trade credibility.

### 9. Book trackers (Shelfy, SlowRead) — **FAIL (clone war)**
- Shelfy (2025-12) is at Books #37 and SlowRead (2026-07) #48, with near-identical "cozy tracker + TBR + reading timer" pitches. Bookly is #64, Fable #25, StoryGraph #99 (4.48, last updated 2026-03).
- **Scan [itunes]:** `"book tracker" "reading tracker" "tbr" "reading log" "bookshelf app"` found 152, with **2025: 35, 2026: 72**.

### 10. All mainstream exam prep — **FAIL**
All [itunes] unless marked; launches are for 2026:
- DMV/permit: 565 competitors, 49 launched (Zutobi #15, myDMV #17, DMV Genie #41)
- CDL: 130, 14 launched (none grossing)
- CNA: 42, 11 launched, none grossing
- NCLEX: 134, 21 launched (UWorld, Archer, Saunders, Picmonic; NCLEX Simple is at Medical #84)
- ASVAB: 121, 36 launched
- US citizenship: 171, 55 launched
- Real estate: 145, 41 launched
- EPA 608/HVAC: 131, 45 launched (SkillCat #66 is employer-funded and free)
- Part 107 drone: 78, 51 launched
- Allied health [web]: 57, 19 launched (Prepry ARDMS is at Medical #20, but HLT, Pocket Prep and the template studios are everywhere)
- Ham radio [web]: 29, 9 launched, none grossing

### 11. Game companions besides Minecraft — **FAIL (no money)**
- Fortnite, Roblox values/codes, Zelda/Elden Ring maps, Stardew [web]: none on a grossing chart. They are ad-supported, and Roblox value apps (2026: 9) have <2K ratings.
- MapTap.gg (2025-11, daily geography game, 14K ratings, Education #38 free) is a great Rivaldle-style fit, but it's at $2.99/mo and isn't on a grossing chart. Geography scan [web]: 49 matches, 2026: 10. **It fails the demand gate.**

---

## Rejected quickly
- **Teen driving-hours log** [web]: 29 matches, 2026: 21, none grossing.
- **Self-tape/actor line reader** [web]: 2026: 16, nothing grossing.
- **Gamified life RPG** [web]: 2026: 27, a clone war.
- **ADHD planners:** Structured and Tiimo dominate; 2026: 11 tiny ones.
- **Vertical micro-business apps** (Bakesy-style) [web]: noisy, 2026: 25.
- **TCG/collectible scanners:** another agent's scan found 2026: 256.
- **Antique/coin/vinyl/toy identifiers:** Next Vision farms.
- **Bible apps:** faith clone war.
- **AI note takers, chatbots, translators, PDF/fax/printer/scanner utilities, invoice makers:** clone wars or incumbent-owned.
- **IQ/brain training:** many 2024–26 clones (IQ Boost, IQ Elevate, IQ Masters).
- **Learn-Japanese:** [itunes] 157 matches, 2026: 38.
- **Co-parenting apps:** two-sided.
- **Finelo trading education:** financial-advice risk.
- **Wispr/agents:** infrastructure-heavy.

Not scanned, for lack of API budget: knots, IQ (beyond chart evidence), electrician exam, TEAS.
