# Research 4: Adjacent pivots and games/daily-puzzle monetization

Researched 2026-10-03 for Locturne's solo founder. Builds on docs/IDEA_SCORECARD.md,
STRATEGY_DEEP_DIVE.md and VALIDATION_RESEARCH.md (Opal, Early, Alarmy, one sec,
Clearspace, ScreenZen and Flint are already covered there; only new facts are
added here).

Evidence labels:
- **[PRIMARY]** company, founder or platform's own statement
- **[PRESS]** journalism or an interview write-up
- **[ESTIMATE]** third-party app-intel/traffic estimate (Sensor Tower, screensdesign, Latka, etc.). These are often off by 2x or more.
- **[DERIVED]** my arithmetic from cited inputs
- **[OPINION]** judgement

---

## Part A: adjacent pivots from the Locturne codebase

### A1. Who is making money (new data points)

| App | Mechanic | Revenue / scale | Date | Evidence | Source |
|---|---|---|---|---|---|
| Opal | Blocker, freemium (3 free blocks/day) | $5M ARR on hard paywall, then $10M+ ARR after switching to freemium. Conversion fell from 20% to 9%. 1M+ DAU, **two-thirds high-school/college students**. "Opal for Schools" grew out of student use. | 2026 podcast | [PRIMARY] | https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026 |
| Quittr | Porn quitting: streak, panic button, community, hard paywall | $37K in month 1, $250K MRR by month 4; ~$500K/mo and ~100K payers by Aug 2025. $3 CPM influencer deals (one 9.9M-view video paid $40K). 25% onboarding conversion. $12.99/mo or $45/yr. | 2024–25 | [PRESS] | https://startupspells.com/p/porn-addiction-app-quittr-250k-mrr-4-months ; https://theweek.com/health/the-app-tackling-porn-addiction |
| Quittr (risk) | — | Data exposure of hundreds of thousands of users' habits | 2025 | [PRESS] | https://www.404media.co/viral-quittr-porn-addiction-app-exposed-the-masturbation-habits-of-hundreds-of-thousands-of-users/ |
| Pushscroll | Exercise to earn scroll time | ~$60K–100K/mo. $1M+ iOS+Android proceeds in a year, organic. | 2025–26 | [ESTIMATE]/[PRESS] | https://www.getbraavo.com/blog/from-0-to-1m-the-organic-growth-playbook-behind-pushscroll/ ; https://trendapps.dev/app/ios/6741765734/ |
| Unrot | Earn screen time with walking, journaling etc. Brain mascot, hard paywall. | ~85K installs/mo, ~$45K/mo. 56K ratings (top new entrant since 2025). | 2025–26 | [ESTIMATE] | https://mwm.ai/apps/unrot-earn-your-screentime/6746537171 ; https://dev.to/samtj/i-analyzed-204-screen-time-apps-to-find-out-why-mine-gets-zero-downloads-2g80 |
| Brainrot: Screen Time Control | Gamified blocker | $26K in first 30 days (Product Hunt #1). Later estimates $10K–55K/mo. | May 2025 on | [PRESS]/[ESTIMATE] | https://whatastartup.substack.com/p/from-brainrot-to-26k-in-30-days ; https://screensdesign.com/apps/brainrot-screen-time-control/ |
| Focus Friend (Hank Green) | Cozy focus pet (a bean knits while you don't use your phone). Free, $14.99/yr plus cosmetics. | #1 US download chart at its Aug 2025 launch. ~1.4M+ downloads, ~$100–150K/mo. Google Play App of the Year. | 2025 | [PRESS]/[ESTIMATE] | https://www.tubefilter.com/2025/08/20/hank-green-tops-app-store-charts-focus-friend/ ; https://screensdesign.com/apps/focus-friend-by-hank-green/ |
| Finch | Gamified self-care pet | ~$4M/mo in May 2025, bootstrapped. D30 retention reportedly beats Duolingo/Calm. | 2025 | [ESTIMATE] (investor tweet) | https://x.com/ArfurRock/status/1924499333929373958 |
| BePresent | Blocker plus streaks/XP, $59.99/yr | Latka ~$330K ARR vs another ~$150K/mo estimate. The sources conflict. | Sept 2025 | [ESTIMATE, low] | https://getlatka.com/companies/bepresentapp.com |
| Brick | $59 NFC hardware plus app | 60K+ units sold (Feb 2026), "very big jump" into 2026. One store estimate says ~$616K/mo. | 2026 | [PRESS]/[ESTIMATE] | https://fortune.com/2026/02/13/analog-gen-z-phone-addiction-bloom-brick-app-blockers-dumb-phones-social-media/ ; https://brandsearch.co/brands/getbrick.app |
| ScreenZen | Free, donation-only friction | 500K+ MAU, 30K+ ratings. Shows how hard it is to charge for basic friction. | 2026 | [PRIMARY]/[ESTIMATE] | https://screenzen.co/ |
| Alarmy | Mission alarm | ~$22M revenue in 2024, 2M DAU. ~60% of 2023 revenue was **ads**, ~30% subscriptions. | 2024 | [PRESS] (Korean press) | https://starterinsight.com/yourdomain-com-alarmy-delightroom-english-analysis/ ; https://verve.com/case-studies/delightroom-alarmy/ |
| Early | Push-up alarm (AlarmKit) | $50K+/mo within 4 months. 200K+ downloads. | 2026 | [PRESS] | https://yespress.io/early-push-up-alarm-app-50000-month |
| Bark / Qustodio | Parental control | Bark $23.1M (2024), raised $67M. Qustodio ~$35M ARR (May 2025). | 2024–25 | [ESTIMATE] | https://craft.co/qustodio ; https://ideausher.com/blog/app-like-bark-development/ |
| Tiimo | ADHD visual planner | 2025 iPhone App of the Year, raised $4.8M. ~$200K/mo estimate; another source says <$1M/yr. The estimates conflict. | 2025–26 | [ESTIMATE] | https://daringfireball.net/2025/12/2025_app_store_award_winners ; https://app.sensortower.com/overview/1480220328?country=US |
| Long tail | Push Up Time: $256 MRR. Dawn (quit lust): $1,111 MRR. | | 2026 | [ESTIMATE] | https://www.whatsthe.app/pushuptimeappblocker ; https://www.whatsthe.app/07472150-7a69-4323-8ae2-e9f5fef1d40f |

### A2. Saturation signal

- A July 2026 indie analysis counted **204 screen-time apps, 103 of them launched
  since Jan 2025**. The new winners are Unrot, Brainrot, Pushscroll, PushUp Time,
  FocusFlight, Focus Friend and touch grass. All have a *"one-sentence behaviour
  story"* (what it makes you do) or a creator behind them. The author's
  privacy-first plain blocker got one review in three weeks. [PRESS, n=1 author]
  https://dev.to/samtj/i-analyzed-204-screen-time-apps-to-find-out-why-mine-gets-zero-downloads-2g80
- Student blockers are crowded too: Habit Doom, Forest, Freedom, Blok (NFC),
  LockedIn (school-day lock with geofencing and an admin dashboard), plus Opal for
  Schools. https://habitdoom.com/blog/best-app-blockers-for-students ;
  https://www.lockedinapp.co/screen-time-app-for-schools
- Gambling: at least 7 iOS quit-gambling blockers (Bet Block, Betless, Bet Breaker,
  Casino Block, QuitGenius, Gambling Guardian, BETTR OFF) plus Gamban as the
  incumbent. None publishes revenue. [App Store listings]
  https://apps.apple.com/us/app/block-online-gambling-gamban/id1459803064

### A3. Pivot options scored by reuse of existing work

Locturne already has Screen Time shielding (FamilyControls/ManagedSettings/
DeviceActivity), AlarmKit, CoreMotion step/barometer sensing, a long onboarding,
a RevenueCat hard paywall, a mascot and a voice. **[OPINION]** on the reuse % and
openness below.

| Pivot | Reuse | Market proof | Openness | Notes |
|---|---|---|---|---|
| **Earn-your-scroll by movement** (Pushscroll/Unrot style; steps or stairs as currency all day) | ~80% (CoreMotion, shields, paywall) | Strong ($45–100K/mo leaders) | **Low**: the 2025 gold rush is over and it's dominated by the 3–4 above | Viable only as a *feature* of Locturne (an "earn more time" mode), not a fresh app |
| **Porn quitting** | ~50% (shields, web-domain blocking, streaks, paywall) | Very strong (Quittr ~$500K/mo) | Low–medium: many clones, Apple review is sensitive, data-leak trust risk | Grows through faith/fitness creators at $3 CPM, but the founder's audience (gamers) overlaps only partly |
| **Gambling / sports-betting quitting** | ~55% (WebDomain shields, streaks) | Unproven: no public revenue | **Medium-high** (fragmented, no breakout winner) | Fits young-male gamer audience (Stake, Roobet, CS skins). Sensitive topic, so be careful with marketing claims. Worth a 1-week demand test with videos |
| **Gamer-specific blocker** ("lock Valorant/LoL/Marvel Rivals until homework/sleep") | ~70% | No direct comps found | **Open but unproven** | Matches his fandom distribution exactly. The catch is that many games run on PC/console, where iOS Screen Time can't reach |
| **Students / exam season** | ~75% | Opal's DAU is two-thirds students | Low (Opal free tier, Forest, school B2B) | B2B to schools is a slow sales cycle and wrong for a student founder needing cash |
| **Parents/teens** (`.child` authorization) | ~40% | Bark $23M, Qustodio $35M | Low | Only one parental-control app per device. Texas/Utah/California age laws. Docs/TEEN_ACCOUNTS.md already recommends against it |
| **ADHD planners** | ~20% | Tiimo, Finch | Low | Mostly new code |
| **Cozy focus pet** (Focus Friend/Finch) | ~50% (+ mascot Loc) | Strong ($100K+/mo, $4M/mo) | Medium | Both leaders had a big creator (Hank Green) or years of polish. The real lesson is to **put game feel into Locturne** (Loc the raccoon sleeping/waking with your apps, cosmetics), not to start a new app |
| **Accountability partner** | ~30% | Covenant Eyes (legacy, $17/mo), Ever Accountable | Low on iOS | iOS cannot screenshot or log other apps, so it's weak tech-wise |

**Conclusion for A [OPINION]:** none of the adjacent pivots beats finishing
Locturne. The ones that reuse the most code (earn-by-movement, students) are the most
saturated. The only open-ish adjacent niches are **gambling-quit for young men** and a
**gamer-specific lock**. Both match his gamer video audience, but neither has revenue
proof. They would be cheap follow-on SKUs (≈2–4 weeks each on the same engine) after
Locturne ships, not replacements. The common thread among 2025–26 winners: a
one-sentence physical behaviour, a mascot or game feel, hard paywall plus
$2–3 CPM creator video. Locturne already has all three.

---

## Part B: games and daily-puzzle monetization 2025–26

### B1. What fandom -dles actually earn

| Case | Facts | Evidence | Source |
|---|---|---|---|
| **LoLdle family** (Benjamin Widawski) | Started Aug 2022 as a passion project. Now a **full-time "gaming publisher"** running LoLdle, Pokedle, Dotadle and Smashdle. LoLdle alone ~**5M pageviews/month**. Moved to Venatus ad management, which gave +30% RPM and +32% CPM. Revenue not disclosed. | [PRIMARY: ad partner case study] | https://www.venatus.com/case-studies/loldle-case-study |
| LoLdle revenue guess | Siteworthtraffic: ~$2.9K/mo. This is a formula-based guess and very low quality. | [ESTIMATE, low] | https://www.siteworthtraffic.com/report/loldle.net |
| LoLdle revenue range | 5M PV × gaming display RPM $2–6 ≈ **$10–30K/mo for LoLdle alone**, before the other 3 sites. Treat it as a range, not a fact. | [DERIVED] | RPM: https://toolsignal.site/articles/blog-display-ad-rpm-by-niche-2026 |
| Actorle (Laszlo Kiss) | **~$3K/mo from display ads**, down from the Wordle-era peak. ~$50/mo hosting, a few hours/week. Ads beat donations and affiliates. | [PRESS] (Oct 2023) | https://indiehustle.beehiiv.com/p/an-actor-guessing-game-making-4-000-every-month |
| CineNerdle | Ko-fi, then ad agencies approached him, then ads plus an ad-free premium sub. Now full-time (PhD on hold). 6K+ user-submitted puzzles. | [PRESS] | https://hey.gg/blog/cinenerdle |
| Clues by Sam (Johannes Ahvenniemi) | Daily logic puzzle, May 2025. 50K+ DAU by early 2026. **No ads: sells puzzle packs**, which cover part of his living costs. Also freelances for Netflix Puzzled. | [PRESS]/Wikipedia | https://en.wikipedia.org/wiki/Clues_By_Sam ; https://aftermath.site/clues-by-sam-wordle-daily-puzzle-game/ |
| Quordle | $5 "buy a coffee" donations, then acquired by Merriam-Webster (Jan 2023, undisclosed) | [PRESS] | https://gameworldobserver.com/2023/01/23/merriam-webster-acquires-quordle-worlde-clone |
| Teuteuf Games (Worldle, Tradle, Flagle, WhenTaken, GeoGrid) | Grew from one -dle into a company with hiring pages, played by "hundreds of thousands" daily. | [PRIMARY] | https://teuteuf.fr/ |

### B2. Acquisitions: did anyone sell one?

- **Wordle → NYT**, Jan 2022, "low seven figures". [PRESS] https://www.thewrap.com/wordle-copies-online-games-business/
- **Heardle → Spotify**, Jul 2022, undisclosed. [PRESS] https://www.forbes.com/sites/madelinehalpert/2022/07/12/spotify-buys-wordle-music-trivia-spinoff-heardle/
- **Quordle → Merriam-Webster**, Jan 2023, undisclosed. [PRESS]
- **Puzzmo → Hearst**, Dec 2023, undisclosed. Now syndicated to 50+ Hearst brands plus Polygon. [PRESS] https://www.pocketgamer.biz/zach-gage-and-orta-theroxs-puzzle-platform-puzzmo-acquired-by-hearst-newspapers/
- **Pixel Flow (Loom Games) → Scopely** majority stake, 2026, a mobile puzzle with 10M+ players. [PRIMARY] https://www.scopely.com/en/news/scopely-to-acquire-majority-stake-in-breakout-mobile-game-pixel-flow-and-the-development-team-behind-it
- **No public sale of a fandom-IP -dle found.** **[OPINION]** Strategic buyers (publishers, dictionaries, Spotify) buy *original or generic* formats they can own. A LoL or Marvel -dle sits on someone else's IP, so it can't carry exclusive rights. Its realistic exit is a small private sale (Flippa-type), not a strategic buyout. The one sold Flippa item found was an iOS word-search app at ~$3.2K/mo profit, with the price undisclosed in the search snippet. https://flippa.com/10608905-daily-word-search-puzzles
- Legal risk: NYT has sent takedowns to "hundreds" of Wordle clones over the green/yellow 5×6 grid. A Japanese Pokémon Wordle came down after an NYT request on **3 Oct 2026**. [PRESS] https://www.npr.org/2024/03/13/1238142507/cease-desist-new-york-times-wordle-spin-offs ; https://www.siliconera.com/fan-game-pokemon-wordle-to-be-taken-down/

### B3. IP rules matter for fandom choice

- **Riot (LoL, Valorant, TFT)** fan-project policy: it **explicitly allows passive ad revenue**. It **forbids crowdfunding, Patreon-style paywalls (without a written license) and operating the project as a business entity**. Ads are fine; Patreon/premium tiers are not. [PRIMARY] https://www.riotgames.com/en/legal
- Rivaldle is a **Marvel Rivals** -dle (rivaldle.com, started 2025). Marvel Rivals lost ~85% of Steam concurrents from 644K (Jan 2025) to ~98K (Oct 2025), and sits around 60–77K in Sept–Oct 2026. [PRESS] https://esportsinsider.com/marvel-rivals-declining-players ; https://beebom.com/marvel-rivals-player-count/
  **[OPINION] This is the main reason for the leaky bucket.** A -dle's ceiling is its fandom's daily active base. Picking a launch-spike live-service game means the funnel shrinks under you. LoLdle chose 15-year evergreen fandoms (LoL, Pokémon, Dota, Smash).

### B4. Ad economics: what it takes to make $1.5–2K/month

- Gaming display RPM is about **$2–6 per 1,000 sessions** (2025–26 publisher data). [ESTIMATE] https://toolsignal.site/articles/blog-display-ad-rpm-by-niche-2026
- Managed gaming ad networks have traffic floors: **Playwire self-serve 100K PV/mo, managed 500K. Venatus 1.5M PV/mo with ≥20% Tier-1 traffic.** [PRESS] https://blog.nitropay.com/nitro-vs-playwire-vs-venatus-which-ad-network-is-right-for-gaming-publishers/ ; https://publishergrowth.com/software/venatus
- **[DERIVED]** $1.5–2K/mo at a $3–4 RPM needs roughly **400–650K pageviews/month**, about 13–22K PV/day. With 4–5 modes per -dle (each mode is a pageview), that is maybe **3–6K daily players across a portfolio**. LoLdle-scale (5M PV) is 8–10x that.
- Web-portal alternative: Poki pays developers 50% of revenue from Poki-sourced players and **100% from players you bring yourself**. CrazyGames pays 60% of ad revenue. Some studios make up to ~$1M/yr on Poki. [PRESS] https://app.cinevva.com/guides/web-game-monetization ; https://www.thestreet.com/crypto/newsroom/poki-turning-web-games-into-million-dollar-businesses
- Discord Activities: devs keep 90% of IAP. No daily-puzzle revenue cases found. [PRESS] https://sacra.com/c/discord/

### B5. Mobile, cozy, idle, hybrid-casual (solo-dev view)

- Mobile puzzle in 2025: $10B IAP, +14% YoY. Growth came from Sort, Block and Screw subgenres. Magic Sort CPI ~$0.50, with weak long-term retention. Winners are funded studios buying UA, so this is not a fit for a student with no UA budget. [PRESS] https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/
- Solo Steam successes: **Rusty's Retirement** (desktop-overlay idle farm) ~550K copies by Jul 2025, ~$4M gross estimate. Its supporter DLC had an 11% attach rate (~$111K). **Magic Research** (idle) made $400K in 12 months from two Reddit posts. **The Operator** (solo) ~$1.2–1.6M. [PRESS]/[ESTIMATE] https://newsletter.gamediscover.co/p/how-rustys-retirement-idle-farmed ; https://medium.com/@anulagarwal12/a-solo-game-developer-generated-over-150-000-in-8-months-from-his-game-with-only-2-reddit-posts-1927d5c4c99f ; https://www.gamesradar.com/games/puzzle/in-a-huge-win-for-niche-games-this-solo-devs-4-hour-software-adventure-has-racked-up-usd1-million-in-revenue/
  **[OPINION]** These are hits that took 1–2 years of work and pay out in lumps, which doesn't fit "needs income now".

### B6. B2B, sponsorship and licensing

- Publishers want daily games for subscriber retention. NYT: Games added 110K of 250K new digital subs in Q1 2025. Its head of games says bundle users "are far more likely to retain". [PRESS] https://digiday.com/media/the-next-level-for-us-the-new-york-times-eyes-longer-play-sessions-for-games-in-subscription-drive/ ; https://aftermath.site/new-york-times-wordle-connections-puzzmo-games/
- Amuse Labs (PuzzleMe) runs custom -dle-style games for NY Post, Merriam-Webster and The Atlantic. B2B demand exists, but it goes through platforms. [PRIMARY] https://amuselabs.com/?p=11709
- **[OPINION]** The most realistic B2B route for him is **sponsorship or commissions from game studios/esports orgs and gaming media** ("make a -dle for our game launch"), priced as a flat build fee plus monthly hosting. No public price data was found, so this needs direct outreach to test.

### B7. Fixing the retention problem (ranked, [OPINION] informed by the cases above)

1. **Pick evergreen, huge fandoms** (Pokémon, LoL, Smash, Minecraft, Elden Ring/Souls broadly, anime) over launch-spike live-service games. This is the biggest single fix.
2. **Run a portfolio on one engine** (LoLdle runs 4 sites; Teuteuf runs 5+). One codebase, many fandoms, shared ad stack. Cross-link the sites so one fandom's dip doesn't sink income.
3. **Offer 4–6 modes per day** (classic, quote, ability, splash, emoji). This multiplies pageviews per visit, which is what ad RPM pays on. Rivaldle already does this.
4. **Streaks, stats and a share grid.** Duolingo: users who reach a 7-day streak are 2.4x likelier to return the next day. [PRIMARY] https://blog.duolingo.com/how-duolingo-streak-builds-habit
5. **Use the daily answer as daily content.** His proven skill is short-form video, so post a "today's LoLdle-style" clip or reveal every day. A -dle is the only product where the content pipeline *is* the product.
6. **Sell packs or an archive, not a Patreon**, where the IP owner allows it. Clues by Sam's puzzle packs worked on original IP, but Riot forbids paywalls without a license. On fan-IP sites, stick to ads only.

### B8. Bottom line for B [OPINION]

- **Is there a cash path?** Yes, a modest and slow one: ad-supported -dle portfolios on evergreen fandoms. This is proven to support at least one full-time solo publisher (LoLdle) and a few $3K/mo side incomes (Actorle). He needs roughly 400–650K PV/mo to hit $1.5–2K/mo [DERIVED]. Expect months of compounding, not a launch spike. There's real IP and takedown risk, and no strategic exit for fan-IP sites.
- **It complements Locturne rather than competing with it.** A -dle portfolio is low-maintenance (hours/week once built) and monetizes his existing video skill and gamer audience. It could also be a cross-promo channel for Locturne/gamer-lock SKUs to the same young-male gamer audience.
- **What I'd skip:** hybrid-casual/mobile puzzle (UA-funded studio game), Steam idle/cozy as an income plan (lottery-like timing), and Patreon on Riot IP (forbidden).
