# Research track 3: Demand-side niches (underserved, proven WTP, weak incumbents)

Date: 2026-10-03. Researcher: subagent (web search; Reddit direct fetch was blocked, so Reddit signal comes via secondary write-ups, which is a real limitation).

## Evidence labels
- **A (strong)**: company-reported numbers, Appfigures/Sensor Tower estimates cited by name, major press, App Store review pages.
- **B (medium)**: credible secondary write-ups (trade blogs, startup case studies, comparison articles summarising reviews).
- **C (weak)**: SEO/competitor-authored "best X apps" pages, niche-idea sites, single anecdotes. Competitor blogs are biased (they exist to sell the alternative), but they are still a signal that someone is spending money attacking the incumbent.

Revenue estimates from Sensor Tower/Appfigures are model estimates, not reported revenue. All numbers below are as cited, not invented.

## Baseline benchmarks (for sizing)
- RevenueCat State of Subscription Apps 2026: Health & Fitness median trial-to-paid 37.7%; median yearly price H&F $39.94, Education $44.99; D60 revenue per install H&F $0.66; only 4.6% of new apps hit $10K/month within two years. (A) https://www.revenuecat.com/state-of-subscription-apps
- Proof that solo/teen-founder apps grown on short-form video can reach real money: Cal AI ~$30M+ run rate, acquired by MyFitnessPal Mar 2026 (A/B) https://www.fortune.com/2025/09/27/gen-z-founder-treats-college-like-vacation-30-million-app-by-18 ; Quittr ~$250K MRR in 4 months, later ~$500K/month (B) https://startupspells.com/p/porn-addiction-app-quittr-250k-mrr-4-months ; Finch ~$30-40M ARR bootstrapped (B) https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money
- General mood: "subscription creep" backlash (Reddit post, 180+ upvotes) (B) https://tech.yahoo.com/apps/articles/subscription-creep-backlash-grows-users-084000792.html. Implication: one-time or "lifetime" options and generous free tiers are a marketable wedge against hated incumbents.

---

## Ranked niches (best fit for this founder first)

Ranking weights: proven WTP > short-form reachability > incumbent weakness > fit with a solo iOS/Expo dev who is weak at retention and needs cash soon. Bonus where his existing Screen Time / FamilyControls work on Locturne transfers.

### 1. Quit sports betting (young men) — strongest founder fit
- **Pain:** CNN got 100+ responses from young men who call themselves "sports gambling sober" (Feb 2026) (A) https://www.cnn.com/2026/02/01/sport/gambling-addiction-impact-recovery ; NPR on rising cost of online betting addiction among young people (Feb 2026) (A) https://www.npr.org/2026/02/14/nx-s1-5648263/the-rising-cost-of-online-betting-addiction-among-young-people ; ~60% of 18-22 year-olds have bet on sports; 20-year-old males ~40% of hotline calls (C, secondary stat) https://www.addictionhelp.com/gambling/sports-betting/sports-betting-and-young-men/
- **WTP:** The exact template (quit-X for young men, streak + panic button, meme marketing) is proven by Quittr: 25% download-to-paid, ~$45/yr, ~$500K/month (B) https://startupspells.com/p/porn-addiction-app-quittr-250k-mrr-4-months. Existing gambling apps already charge: Gamblr $49.99/yr, QuitGambl up to $34.99/yr, Betttr $13-100/mo (A, App Store) https://apps.apple.com/app/id6772988498
- **Incumbent weakness:** No dominant consumer brand; field is a dozen tiny 2025-26 apps (Gamblr, QuitBet, QuitGambl, "i'm done.", Gamble Quit). A "Betless" quit-gambling app is listed for sale on Flippa (C, suggests small-scale players) https://flippa.com/12209531-betless-quit-gambling. Blockers (Gamban, BetBlocker) are utilitarian, not habit/identity products.
- **Trust gap to exploit:** Quittr exposed ~600K users' relapse data via misconfigured Firebase (404 Media, Jan 2026) (B) https://wetinkmag.com/posts/they-paid-to-quit-porn-the-app-sold-them-out-instead/ — "on-device, no account" is a real differentiator for addiction apps.
- **Reachability:** Very high. Sports TikTok, parlay-loss memes, "I lost $X" confessionals; Quittr's $100 meme ad got 10.8M views (B) https://startupspells.com/p/quittr-meme-ad-vs-onlyfans-porn-recovery-app-trolls-of
- **Wedge:** iOS app that actually blocks DraftKings/FanDuel/PrizePicks/Kalshi-style apps and sites with Screen Time API (he already has this tech from Locturne), plus "money not lost" counter, game-day urge mode (blocks harder during NFL Sunday / March Madness), on-device-only data. Price like Quittr (~$40-50/yr).
- **Risks:** Sensitive health-adjacent category; App Review on addiction claims; must avoid gambling ads in marketing; some may see it as "copying Quittr."

### 2. Pokémon / TCG collecting tools
- **Market:** Pokémon Company best year ever (~$3.3B revenue FY to Feb 2026); Target TCG sales on pace for >$1B in 2025 (B) https://shopify.substack.com/p/tcg-boom
- **WTP:** Collectr PRO $7.99/mo or $59.99/yr, 2M+ users; Sensor Tower snippet ~200K downloads and ~$400K revenue in a month (A-, Sensor Tower page via search snippet) https://app.sensortower.com/overview/1603892248?country=US ; many scanner clones charge $39.99/yr to $99.99 lifetime (A, App Store) https://apps.apple.com/es/app/id6749888428
- **Incumbent weakness:** Collectr reviews cite aggressive paywalls, limited free scans, scanner inaccuracy on variants, shifting tiers (B) https://justuseapp.com/en/app/1603892248/collectr-tcg-portfolio-app/reviews
- **Reachability:** Extremely high — pack-opening and "pulled a $500 card" content is native TikTok/Shorts.
- **Wedge:** Don't fight Collectr on full portfolio. Narrow: (a) pull-rate / pack-opening log ("what did my $X of packs actually return?"), shareable pull recaps; (b) set-completion master-set checklist with binder view; (c) cheap/one-time scanner for a single game (One Piece, Lorcana) where incumbents are weaker.
- **Risks:** Price data is the moat and costs money (TCGplayer API access restricted; paid sources like PriceCharting/pokemontcg.io). Crowded with AI scanner clones. Not verified: exact data-licence costs.

### 3. Test-prep micro-niches (DMV permit, nursing NCLEX, etc.) — good for weak retention
- **WTP:** Zutobi (DMV permit prep) Sensor Tower estimate ~$300-400K/month, weekly plans from $4.99 (A-, Sensor Tower via snippet) https://app.sensortower.com/overview/1394069110?country=US ; NCLEX QBanks: UWorld ~$139/30 days, $249/90 days; Archer $39-99, students complain about cost with no pass guarantee (B) https://yournursingspace.com/blogs/news/best-nclex-prep-courses-2026
- **Why it suits him:** Users need it for weeks, then leave — revenue comes from up-front weekly/one-shot passes, so retention matters less. Students are his peer group; StudyTok is huge.
- **Incumbent weakness:** Zutobi uses weekly-subscription pricing (a common complaint pattern); NCLEX is expensive and desktop-first. Quizlet moved Learn mode/practice tests behind paywall and students "flooded Reddit and TikTok" for alternatives (C, competitor blog) https://www.mintdeck.app/blog/quizlet-paywall-free-alternative
- **Wedge:** Pick one exam with a clear deadline and content he can license or write (e.g., a single US state permit test, or a specific cert like CNA / pharmacy tech / real-estate licence), make the daily "streak to test day" loop, sell a one-time "until you pass" pass.
- **Risks:** Content creation/accuracy load; state handbooks change; NCLEX needs clinically accurate questions (likely needs a nurse collaborator).

### 4. Faith: Gen Z Christian daily habit
- **WTP:** Hallow ~$40M net revenue in 2025 (Appfigures), $69.99/yr, huge Lent spikes (A) https://appfigures.com/resources/insights/hallow-lent-surge-prayer-app-revenue ; Bible Chat ~$15M annualised revenue, 10M users, $14M Series A (A) https://www.romania-insider.com/bible-chat-investment-round-faith-app-romania-feb-2025
- **Demand trend:** US Bible sales +14% in 2025 after +20% in 2024 (Circana); Barna reports Gen Z/millennial men attendance rising (B) https://www.christian.org.uk/news/bible-sales-reach-record-high-as-gen-z-shows-increasing-openness/
- **Incumbent weakness:** YouVersion is free but dated/broad; Hallow is Catholic-specific and expensive; AI chat apps raise doctrinal-trust concerns. Not verified with review mining here.
- **Reachability:** ChristianTok is large and young; predictable seasonal spikes (Lent, Advent, New Year).
- **Wedge:** "Scripture before scroll" — Screen Time shield that unlocks social apps after a daily verse/prayer (direct reuse of Locturne tech), aimed at Protestant Gen Z men. Note: verse-lock apps may already exist; check before building.
- **Risks:** Must be authentic to the audience; denominational nuance.

### 5. GLP-1 companion (protein / half-portions, not another shot log)
- **WTP:** Shotsy 4.8★ from 31K+ ratings, raised $2.25M, raised price $29.99→$49.99/yr (B) https://glp3planner.com/resources/shotsy-alternatives ; RevenueCat H&F medians apply.
- **Saturation:** 30+ GLP-1 tracker apps by April 2026 (C) https://meagain.com/best-glp-1-tracker-apps — shot logging is a commodity.
- **Unmet need:** Reddit r/GLP1 complaint paraphrased: "I'm constantly editing serving sizes to a third and it's exhausting"; lean-mass loss concerns, protein priority (C, paraphrased; no thread link) https://clinicalnutritionreport.com/articles/best-glp1-app-reddit-2026/
- **Reachability:** High (GLP-1 TikTok, before/after content), but he isn't the audience.
- **Wedge:** Protein-first photo logger that defaults to "I ate a third of this." Competes with Cal AI/MFP, so it must be very narrow.
- **Risks:** Crowded, medical claims, audience mismatch with founder.

### 6. Perimenopause / menopause tracking
- **Incumbent weakness (fresh):** Balance (most-downloaded peri tracker) v2.2.5 redesign May 2026 caused lost data — "lost data" in 37 reviews, users reporting 3 years gone (B) https://apps.apple.com/us/app/balance-menopause-hormones/id1503345959?see-all=reviews&platform=ipad ; Midday pricing not public (C) https://www.go-go-gaia.com/blog/best-perimenopause-tracking-app.html
- **WTP:** Category market estimates are vendor reports (C). Femtech flagged as a top 2026 growth category (C) https://www.businessofapps.com/news/app-market-trends-2026/
- **Reachability:** Huge peri-TikTok, but founder is a male student — authenticity is hard; would need a female creator partner.
- **Wedge:** Apple Watch / HealthKit hot-flash + HRT dose log with a one-tap doctor report and guaranteed local data export.
- **Risks:** Many new entrants (Menolog, Crest, Symptive, thePause, etc.).

### 7. ADHD / neurodivergent visual planning
- **WTP:** Tiimo: iPhone App of the Year 2025, ~3M downloads, ~$54-80/yr or $12/mo (A) https://mjtsai.com/blog/2025/12/11/2025-app-store-awards/
- **Weakness:** Price complaints and no Android/web (C, competitor blog) https://lifestack.ai/blog/tiimo-alternative. Niche-idea site claims ADHD routine apps have <10 serious competitors (C, low trust) https://appopportunity.com/blog/underserved-app-niches-2026
- **Reachability:** ADHDTok is very large and buys tools.
- **Wedge:** Do one ADHD pain point extremely well (time-blindness "leave-the-house" countdown, or body-doubling) rather than a full planner against an Apple-awarded incumbent.
- **Risks:** ADHD users churn fast — the very retention weakness he has.

### 8. Dog training / puppy owners
- **WTP:** Woofz grew $5.2M→$20M revenue in a year, bootstrapped, 21M downloads (A) https://tech.eu/2025/08/01/bootstrapped-and-thriving-how-woofz-hit-20m-without-vc-funding/
- **Reachability:** Dog content is top-tier on short-form.
- **Weakness:** Not well evidenced here; Woofz/Dogo are well-funded and content-heavy.
- **Wedge:** Breed- or problem-specific (reactive dogs, crate/separation anxiety) with video check-ins.
- **Risks:** Content production heavy; strong incumbents.

### 9. Hobby trackers with price-hike backlash: fishing and golf
- **Fishing:** Fishbrain paywalls almost everything at $10-13/mo; reviews: "Over $70 for a year is crazy", ~$80/yr "just to view pictures posted on local lakes" (B) https://apps.apple.com/us/app/fishbrain-fishing-app/id477967747?see-all=reviews&platform=ipad
- **Golf:** 18Birdies Premium $99.99/yr, complaints about cost, pop-ups, UX changes; Golf Pad $29.99/yr as alternative (B) https://www.scoringzone.net/blog/18birdies-review.html
- **Reachability:** Golf and fishing TikTok are big and male, matching his creator voice.
- **Wedge:** Fishing: fast private catch log + "where/when did I catch" spot memory, no social, one-time price. Golf: course GPS data is a licence cost; better wedge is practice/stats (e.g., putting or range practice games).
- **Risks:** Map/course data costs; seasonal.

### 10. Chronic illness symptom tracking (POTS, ME/CFS, IBS)
- **WTP:** Bearable 900K+ users, freemium (B) https://bearable.app/best-pots-app-2024/ ; Nerva (IBS hypnotherapy) charges ~$200/yr, complaints about repetitive content (B) https://psycholux.ai/relief/nerva-app-review-ibs-alternative
- **Weakness:** Generic trackers; niche-site claim that chronic-pain trackers average 3.2★ (C).
- **Wedge:** Condition-specific "pacing" (energy envelope) with Apple Watch HR — note Visible already does this for ME/CFS.
- **Risks:** Medical, small and sensitive audiences.

### 11. Couples apps
- **WTP:** Paired ~$200K/month (≈$2.4M ARR), 8M downloads, 4x revenue in a year (B) https://www.revenuecat.com/blog/growth/three-of-the-ways-that-paired-4x-revenues
- **Reachability:** Couples content is strong on TikTok.
- **Weakness:** No strong backlash found. Wedge would be a specific couple type (long-distance, newly engaged).
- **Risks:** Two-sided activation halves conversion; retention-heavy.

### 12. Group expense splitting (Splitwise backlash)
- **Pain:** Splitwise free tier limited to ~3-4 expenses/day with cooldowns and ads; loudest complaint (B, multiple competitor blogs) https://www.areweeven.com/blog/splitwise-free-vs-pro-2026
- **WTP:** Weak — the backlash is about wanting free; many free alternatives (Tricount, Splid, Settle Up).
- **Wedge:** Trip-scoped one-time purchase ("$4.99 per trip") marketed to students on spring break. Low ceiling.

### 13. Plant care
- **Pain:** Planta $35.99/yr; price is "almost always the reason" people look for alternatives (C, competitor blog) https://www.getgrowli.app/blog/planta-alternatives
- **Weakness:** Crowded (Greg, Plant Parent, PictureThis, Planta). Low priority.

### 14. LEGO tools
- **Pain:** Brickit $14.99/mo after a 3-day trial; reviews call it a cash grab; scanner misses (B) https://justuseapp.com/en/app/1477221636/brickit-rebuild-your-lego/reviews ; Rebrickable has no official app (B).
- **Wedge:** Native iOS front-end for Rebrickable-style set/parts tracking with a fair price. Smaller audience than TCG; LEGO trademark care needed.

### 15. Reptile keepers / caregivers (watch list, weak WTP evidence)
- Reptiles: a wave of 2025-26 trackers (Shed, ReptiCare, CareTrack, Husbandry.Pro) shows interest but tiny market and no revenue evidence (C) https://apps.apple.com/us/app/shed-reptile-feeding-tracker/id6761770562
- Caregivers for aging parents: many new apps (CircleCare $6.99/mo, Caily, CareMinder) but no revenue proof; payers are 40-60 y/o, harder to reach via his channel (C) https://www.kinnect.club/blog/best-family-caregiver-apps

## Also checked, de-prioritised
- Strava: 2023 50% hike; 2025 r/Strava thread "Is Strava pushing subscriptions too hard?" (619 score, cited secondhand) (C) https://www.runifyapp.com/blog/strava-alternatives — social network effects make it hard to displace.
- Duolingo AI-first backlash (Apr 2025), later walked back (A) https://www.the74million.org/article/as-duolingo-turns-to-ai-some-users-say-language-app-has-joined-the-dark-side/ — content-heavy to compete.
- Day One price/sync complaints (B) https://forums.dayoneapp.com/forums/topic/feedback-from-a-13-year-user-app-complexity-workflow-changes-and-pricing-conc/ ; Rocket Money fee/cancellation complaints (C) — bank-data cost and trust make finance hard solo.
- Lifting: Hevy ($23.99/yr, $74.99 lifetime) is cheap and loved — no gap.
- Muslim prayer apps: Pillars already holds the "design-led, privacy" wedge vs Muslim Pro.
- Quit weed (Grounded) — exists, no revenue data found; same playbook as #1 but smaller.

## Cross-cutting takeaways
1. The best-proven indie playbook right now is a **"quit/replace a bad habit" app for young men, marketed with memes** (Quittr) and **"one-input → instant result" AI utilities** (Cal AI). #1 and #2 fit his audience and channel.
2. His Locturne Screen Time/shield tech is a reusable moat for #1 (betting blocker) and #4 (scripture-before-scroll). Few small competitors can do real app blocking well.
3. Backlash windows found in 2025-26: Balance data loss (May 2026), Collectr paywall sentiment, Quizlet paywall, Splitwise limits, Fishbrain/18Birdies pricing, Quittr breach (trust). Price-backlash niches only pay if users already pay; Splitwise/Planta users mostly want free.
4. For weak retention + cash needs, prefer **deadline-bound** (test prep) or **one-time high-intent** purchases, or categories with Quittr-like 25% up-front conversion.

## Gaps / caveats
- Reddit could not be fetched directly; Reddit sentiment is via secondary sources, often competitor blogs (biased).
- Sensor Tower numbers came from search-result snippets of their overview pages, not verified dashboards.
- No independent revenue figures found for Tiimo, Fishbrain, gambling-quit apps, Grounded, or GLP-1 trackers other than Shotsy funding/pricing.
