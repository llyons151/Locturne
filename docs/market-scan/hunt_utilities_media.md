# Hunt: Utilities, Photo & Video, Graphics & Design, Entertainment, Music, Social, Developer Tools

Date: 2026-10-03/04. Source: `recent_grossing_2024plus.tsv` and `all_charts.tsv` (grossing and paid charts), then a scan of every candidate.

**Data caveat.** The iTunes Search API returned HTTP 403 partway through, probably because several hunters were sharing the IP. Scans marked **[full]** used `appscan.py`, which looks 200 results deep per keyword. Scans marked **[web]** used a fallback I wrote, `hu/webscan.py`, with the same flags. It scrapes the top ~12 apps.apple.com iPhone search results per keyword and then calls the iTunes lookup API. That is a sample of the top results, so its counts read low next to `appscan`, but the launch share among the top results is still a usable flood signal. WebSearch was out of budget, so the only revenue evidence is chart rank. Every revenue figure below is a chart-rank estimate, grade C. Raw outputs are in `hu/w_*.txt` and `s_*.txt`.

What the slice shows overall: most of the 2024+ money in these categories comes from AI generators (video, song, interior and tattoo), short-drama streaming and AI companions. Those are all clone wars or need capital, so I skipped them. The useful signals are a few specific-audience utilities that newcomers took onto the charts: Strum (guitarists), Game Maps IRL (gamers), myCar/HiCar/CARFACE (car owners, using iOS 26 CarPlay widgets), TextPort (people who need message evidence), and Reverse Singing. Two collector niches also reached the charts: TCG card scanners and LEGO via Brickify.

---

## Candidates

### 1. "Chords from any song" for guitarists (Strum-style), with a wedge into bass, ukulele or worship-song chords. **BORDERLINE (leaning PASS)**
- **Wedge:** paste a song (from your library, an audio file or a link) and get playable chords, a capo suggestion and a simplified beginner version, plus a looped practice mode. Start with one audience Strum serves poorly, such as bass lines or simplified beginner voicings.
- **Demand:** Strum - Play Guitar launched 2025-08-06. It has **20,063 ratings, 4.67 stars, and sits at Music grossing #28.** Chordify is at Music #50 (33.7K ratings), Chord ai at Music #94 (5.9K), Ultimate Guitar at #7 and Songsterr at #22. Estimate: Strum is probably above $100K/mo (C). This newcomer reached the top 30 in 14 months.
- **Scan [full]:** `appscan.py --namemust 'chord|guitar|strum|play along|tab' --must 'chord' "chords from any song" "guitar chords song" "chord finder ai" "play any song guitar" "strum guitar"`. Result: 309 matches, of which 22 launched in 2025 and **46 in 2026**. The regex is broad, so many matches are tuners or lesson apps. Top 5: Ultimate Guitar 479K/4.73, Simply Guitar 397K, Fender Tune 151K, GuitarTuna 148K, Yousician 139K, all updated in 2026. **[web]** narrow chord scan: 46 matches, 9 launched in 2026. True "any song to chords" competitors: Strum, Chord ai, Chordify, ChordU (3.17 stars) and Autochords.
- **Why open:** only about four true "any song" apps exist, and Strum took #28 in a single year. Chord ai has 5.9K ratings after 7 years. Adjacent niches (bass, ukulele, piano chords from any song) show no dedicated winner in the web scan.
- **Kill risks:** chord detection is real machine-learning work, so 8 weeks is tight. Open models such as the BTC chord transformer or Essentia exist, and on-device CoreML is possible. Pulling audio from YouTube is a ToS and App Review risk, so stick to file and library import. The 46 launches in 2026 suggest copycats are starting.
- **Scores:** Demand 5, Openness 3, Buildability 3, Video/ASO 5 ("this app turned X into chords" is native guitar-TikTok content), Retention-independence 3. Founder fit is medium: great for video, but he'd need to care about guitar.

### 2. Game-style map "IRL" for gamers (Game Maps IRL), with an adjacent game-HUD camera. **BORDERLINE (leaning PASS)**
- **Wedge:** see your real location as a stylised video-game map (minimap, quest markers, "fast travel" points), plus a share or recording mode built for TikTok. The adjacent idea is a "life as a video game" HUD camera (health bar, quest text, minimap overlay on video). The HUD scan found no dedicated app in the top results, so this is whitespace with no proven demand yet.
- **Demand:** Game Maps IRL launched 2025-03-14. It has **29,139 ratings, 4.62 stars, Navigation grossing #19.** A clone, Game Weather IRL (2026-04, 192 ratings, 3.98), already sits at **Weather #78**. Estimate: probably $30–100K/mo (C, since Navigation is a smaller category).
- **Scan [web]:** `--must 'video game|game map|gta|minimap|hud|rpg|quest|game-style|game style' "game maps irl" "video game map real life" "gta map" "game hud real life" "irl game" "game weather" "video game style map"`. Result: 29 matches, 15 launched in 2026, but the true clones are tiny: Mappr 142 ratings, MapGT 35, SpawnMap 31, MapShifter 13. Only one app holds the money.
- **Why open:** one winner, and every 2026 clone has under 150 ratings. The Gen Z gamer audience is exactly the founder's, and the product is visual by nature, which suits his videos.
- **Kill risks:** IP and trade dress (styles evoking GTA or Zelda; the incumbent relies on a "not affiliated" disclaimer, so avoid game names and logos). Novelty retention: the money may come from impulse weekly subscriptions. Map tile cost at scale: use MapLibre with OpenFreeMap or self-hosted vector tiles, not paid Mapbox.
- **Scores:** Demand 4, Openness 4, Buildability 4 (MapLibre custom styles in Expo, 4–6 weeks), Video/ASO 5, Retention-independence 2. **Best founder fit in this slice.**

### 3. CarPlay widget dashboards (iOS 26 shows iPhone widgets in CarPlay). **BORDERLINE (race under way)**
- **Wedge:** custom CarPlay widgets (photos, gauges, a "now playing" card, startup sound), aimed at one car-culture audience that generic apps miss, such as JDM, Tesla or truck owners.
- **Demand:** three newcomers are already on charts. **myCar** (2025-11-20): 12,809 ratings, 4.60 stars, **Utilities #34**. **Car Dashboard Widgets - HiCar** (2026-05-19): 1,166 ratings, 4.07 stars, **Navigation #16**. **CARFACE** (2026-07-08, requires iOS 26): 440 ratings, 3.91 stars, **Navigation #30**. Generic "Car Auto Play" apps sit at Utilities #76 and #99. Estimate: HiCar and myCar together probably above $100K/mo (C).
- **Scans:** **[full]** `--namemust 'car|auto|drive|dash' --must 'carplay|car play' ...`: 76 matches, 15 launched in 2025 and **42 in 2026**, though many are generic "Car Play Connect" apps. **[web]** widget-specific scan: 25 matches, **16 launched in 2026**. Ratings among the chart widget apps: myCar 4.60, HiCar 4.07, CARFACE 3.91, Carvia 3.31.
- **Why open:** iOS 26 opened this surface only last year. Several leaders are poorly rated (below 4.1) and only months old. The build is just WidgetKit, which the founder already knows from Locturne.
- **Kill risks:** a fast clone race. 16 of 25 sampled apps launched in 2026, so by launch this could be past the 25-launch fail line. Apple could also tighten CarPlay widget rules.
- **Scores:** Demand 4, Openness 2, Buildability 5, Video/ASO 4 (car content films well), Retention-independence 3.

### 4. Text message export to PDF for court or evidence (TextPort). **BORDERLINE**
- **Wedge:** export a conversation to a timestamped PDF or CSV formatted for court, insurance or HR. ASO-led and retention doesn't matter, because it's a high-intent, one-off job.
- **Demand:** TextPort (2025-05-16): 1,324 ratings, 4.39 stars, **Utilities #62**. Estimate: $10–40K/mo (C).
- **Scan [web]:** `--must 'export|backup|pdf' "text message export" "export imessages" "imessage to pdf" "save text messages"`. Result: 21 matches, 12 launched since 2025 and 8 in 2026. Competitors are weak: Messages and Chat Export PDF (4183 ratings, 4.54), TextKeep 285, MsgKeep 108, TextScape **2.79**, ChatSave **2.74**, ChatPDF 3.09, Export Messages 3.20 (stale since 2015).
- **Why open:** competitors are poorly rated, and the money sits with one or two apps.
- **Kill risks:** iOS has **no Messages API**. TextPort says it "pulls it straight out of iMessage" on the phone, which most likely means screen-capture and OCR, and it offers a Mac/Windows companion for full history. Building a reliable on-phone extractor (scrolling screen recording plus Vision OCR) is the hard part. Clone pace is rising (8 in 2026 already). Zero video fit.
- **Scores:** Demand 3, Openness 3, Buildability 2, Video/ASO 3 (ASO only), Retention-independence 5.

### 5. Worship-musician tools: ambient pads in all 12 keys, click and cue tracks, set control. **BORDERLINE (poor founder fit)**
- **Wedge:** a modern pad, click and cue app for small-church worship teams, with Sunday set lists, foot-pedal control and App Intents/Siri ("next song"). Use original pad and click content and avoid copyrighted backing tracks.
- **Demand:** Worship Backing Tracks (XME) **Music #82** with only 4,962 ratings; Whoop Triggerz Plus (C-Dub) **Music #75** with 3,134; Loops By CDub **Music #84** with 1,249. On the paid chart, AeroPads ($6.99) is #22 and AutoPad ($6.99) #34. Estimate: each $10–40K/mo (C). Few users paying high prices.
- **Scans:** **[full]** `--namemust 'worship|track|pad|loop|multitrack|stem|church|playback' --must 'backing track|multitrack|stems|click track|pad' "worship backing tracks" "worship pads" "multitracks church" "backing tracks live" "click track worship"`. Result: **28 matches, 2 launched in 2025 and 5 in 2026.** Top: Spark 25K (a different audience), WBT 4,962/4.87, XME Loops 4,940/4.89, MultiTracks Playback 4,296/4.77, Prime MultiTrack 2,095. **[web]**: 38 matches, 7 in 2026.
- **Why open:** low launch rate, and the money sits with two small publishers (XME and C-Dub) whose apps are dated.
- **Kill risks:** incumbents are well rated (4.8+). Backing tracks need licensing, so stick to pads and clicks. The founder isn't in this audience. Total market is small.
- **Scores:** Demand 3, Openness 4, Buildability 4, Video/ASO 2, Retention-independence 4 (weekly Sunday use).

### 6. Apple Music listening stats or "year-round Wrapped". **BORDERLINE**
- **Wedge:** stats.fm-style top artists and tracks, streaks and shareable cards for Apple Music users, built from on-device `MPMediaItem` play counts and MusicKit recently played, plus widgets.
- **Demand:** stats.fm for Spotify is at **Music #64** (47K ratings). No Apple-Music-specific app is on any chart, so demand is indirect. A lever: Spotify's 2025 API policy (as I understand it, not verified here) limits extended quota for new developers, which locks newcomers out on the Spotify side, while Apple Music is open.
- **Scan [full]:** `--namemust 'stat|replay|wrapped|music|listen|track' --must 'apple music' --exclude 'converter|player|download' "apple music stats" "apple music replay" "music listening stats" "apple music wrapped" "listening history"`. Result: 57 loose matches, 3 in 2025 and 11 in 2026. True competitors: Song Stats for Apple Music (899 ratings, 4.45), **stats.fm for Apple Music (2025-09, 869 ratings, 3.68 stars)**, TuneTrack (3.16 stars, stale since 2020).
- **Why open:** the only competitors are poorly rated or stale.
- **Kill risks:** no proof of Apple-side revenue. Apple's own Replay keeps improving. Play-count data is incomplete for streamed, non-library songs.
- **Scores:** Demand 2, Openness 4, Buildability 4, Video/ASO 4 (shareable cards), Retention-independence 3.

### 7. Dynamic Island / Lock Screen live lyrics (Live Activities). **BORDERLINE → FAIL on licensing**
- **Demand:** Dynamic-Lyrics (2024-04): 9,059 ratings, **4.28 stars, Music #62**. Lyrix (2024-09): 7,148 ratings, **Music #92**, but Lyrix is artist-lyrics widgets. CARFACE bundles car lyrics and is at Navigation #30.
- **Scans:** **[full]** `--namemust 'lyric' --must 'dynamic island|live activit|lock screen|real-?time|synced' ...`: 40 matches, 6 in 2025 and **27 in 2026**, all with under 400 ratings. **[web]**: 24 matches, 16 in 2026.
- **Why open:** the leader is rated 4.28 and the clones are tiny. It uses Live Activities, which few apps do well.
- **Kills it:** synced-lyrics licensing (Musixmatch or LyricFind fees; using free LRCLIB is a copyright risk), and the 2026 clone wave is starting.
- **Scores:** Demand 3, Openness 3, Buildability 2, Video/ASO 4, Retention-independence 3.

### 8. Projection-mapping and VJ app for the phone (Lazy Lighting). **BORDERLINE (small)**
- **Demand:** Lazy Lighting (2025-09-21): only 364 ratings but **Graphics & Design #93**. Estimate: under $15K/mo (C).
- **Scan [web]:** `--must 'projector|projection' "projection mapping" "projector light show" "vj app projector" "halloween projection"`. Result: 28 matches, and the true competitors are ProjectX (74), Pro Mapper (53) and illumibot (23). Wide open, but small.
- **Kill risks:** a tiny market and seasonal demand (Halloween and Christmas window projections), though those seasons film extremely well. Needs Metal/Skia warp rendering.
- **Scores:** Demand 2, Openness 5, Buildability 3, Video/ASO 4, Retention-independence 3.

### FAILs (scanned)
- **TCG and sports card scanners:** proven money (Collectr Reference #8, HoloDex #15, Foloy Entertainment #68, Spoly, StarSnap and more), but **[full] 449 matches, 108 launched in 2025 and 256 in 2026.** A clone flood.
- **LEGO / minifig scanners:** Brickify (2026-02) reached Reference #29 with 5.5K ratings, but **[web] 37 matches, 20 in 2026.** Flood, and Brickify already bundles LEGO with TCG.
- **Reverse-singing challenge:** Reverse Audio: Sing Challenge Music #39 (30K ratings in 11 months), Reverse Singing Music #88. **[full] 208 matches, 112 launched in 2025 and 59 in 2026.** A trend-driven flood that has already peaked.
- **Digicam / retro camera filters:** WayShot (2025-08) at Photo & Video #73. **[full] 191 matches, 65 in 2026.** Flood.
- **Mobile client for AI coding agents** (Moshi at Dev Tools #5, Happy, Omnara): **[full] 95 matches, 81 in 2026.** Flood, and Developer Tools grossing is thin.
- **AI usage-limit trackers** (Limits, Nowdex, CodexBar, CUStats): part of the same flood, with minimal revenue.
- **TV show tracker:** no app on any grossing chart; **[web] 22 of 36 launched in 2026.**
- **Video-game backlog / log ("Letterboxd for games"):** **no app on any chart** (GAMEYE 2.7K, CLZ 1.6K); **[web] 16 of 38 in 2026.** Fails the demand gate.
- **Game companion stat trackers** (Marvel Rivals and others): no money except Poke Genie (Utilities #85, Pokémon GO-specific). Marvel Rivals has no official API, and Tracker Network has no chart slot.
- **Tuner / metronome / practice:** Tunable has been stale since 2021-08 (6.8K ratings, $7.99), but Fender Tune (151K), GuitarTuna (#12) and Soundbrenner dominate for free. **[web] 11 of 40 in 2026.** No wedge.
- **Stem separation / vocal remover:** Moises at #16 and Stemz at #73 dominate, it's AI-wrapper adjacent, GPU costs are high, and **[web] 13 of 41 were in 2026.**
- **Teleprompter:** BIGVU (#59) and Teleprompter.com (Productivity #84) are strong (4.7–4.8) and actively updated. No weakness to exploit.
- **Watch-face galleries:** Facer (Lifestyle #78), Clockology (G&D #96) and WatchLab are entrenched commodity products.
- **Text-story / fake-chat video makers:** TextingStory has 65K ratings but no chart slot, so demand is unproven.
- **Minecraft addons:** saturated (20 or more apps with 10K–100K ratings) and Mojang brand-guideline risk.
- **Ringtones:** ClipTone (2024-11) reached Music #54 with 119K ratings, but this is a commodity niche with heavy ad spend (Zedge and others).
- **Binaural beats:** Moongate at #20 and Anima (2025-10) at #79. A calm/sleep clone space with health-claim risk.

### Rejected without a full scan (clone wars or capital-heavy)
AI video, photo, song and dance generators; AI interior, tattoo and car-mod design; AI companions and "AI town"; short-drama streaming; storage cleaners; VPNs; TV remotes and screen mirroring; QR scanners; 2FA authenticators (paid-UA arbitrage); second-number apps (telecom costs); dating (needs a two-sided network); compliment-classmates apps like Valid/Gas (needs a network); Instagram unfollower trackers (API and ToS risk); "Car Play Connect" apps (misleading-category arbitrage); wearable AI note-taker hardware (Pocket, Fieldy).

### iOS 26/27 feature angles
- **CarPlay widgets:** the clearest proof in this slice that a new OS surface creates a gold rush (candidate 3). The window is closing.
- **Live Activities:** lyrics (candidate 7) is the main grossing example and is blocked by licensing. A Live Activity "set or song timer" for worship teams or gigging musicians could be a differentiator inside candidate 5.
- **App Intents / Siri:** best used as a feature inside candidates 1 and 5 (for example "next song", or "loop bars 5–8").
- **Foundation Models (on-device):** no grossing app in this slice is clearly built on it yet. The best fit is free on-device text work inside a candidate, such as quest text for the game HUD in candidate 2 or chord-chart cleanup in candidate 1, not as a standalone product.
- **AlarmKit:** no grossing AlarmKit app turned up in these seven categories. The obvious AlarmKit plays (wake-up alarm with tasks) are a listed clone war.
