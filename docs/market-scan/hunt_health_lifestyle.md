# Hunt: Health & Fitness, Medical, Lifestyle, Food & Drink (2026-10-03) — PARTIAL

**Status: incomplete.** The iTunes Search API began returning 403/429 for this IP after four scans,
and the WebSearch budget for the session (200 calls) was already used up. Only four niches were fully
scanned with appscan. Everything else below is a *candidate from the chart data* and has **not** passed
the "scan before judging" rule, so nothing unscanned is recommended.

A background waiter (`hl/waitrun.sh`, log `hl/waitrun.log`) keeps probing; when the API unblocks it runs
`hl/batch1.json`, `batch2.json`, `batch3.json` through a slower copy of appscan and writes one file per niche to
`hl/<name>.txt`. Read those files to finish the judging.

Revenue figures are rank-based proxies from RUBRIC.md (grade C) unless stated.

## Scanned candidates

### 1. Starbucks / drink-chain "secret menu" app — BORDERLINE (best signal so far)
- Wedge: secret-menu and order-hack app covering several chains (Starbucks, Dutch Bros, Chick-fil-A, Taco Bell,
  Chipotle) with "show the barista" order cards, built around the TikTok drinks that go viral.
- Demand: Your Secret Menu for Starbucks (Anthem Ventures, launched 2021, 15,561 ratings, 4.74★, updated
  2026-08-17) sits at **Food & Drink top-grossing #28** on a subscription with a free trial. Food & Drink is a
  smaller category, so #28 is roughly $30–100K/mo (grade C).
- appscan: `--namemust 'secret|menu|hack' --must 'secret menu|drink|starbucks' "secret menu" "starbucks secret menu" "fast food secret menu" "drink recipes starbucks" "menu hacks"`
  → **15 competitors**, 2025: 1, 2026: 3. Top: Your Secret Menu for Starbucks 15.6K (#28), Secret Menu Coffee
  Recipes 11.8K (2014), Secret Menu Recipes 4.4K, Sipzy 4.1K, Secret Menu: Coffee Recipes 957. The
  multi-chain scan ("fast food hacks", "taco bell secret menu"…) could not run because of the API block.
- Why it's open: only one app makes money, and all of them are Starbucks-only coffee apps. Nobody serves the
  fast-food hacks audience (Chipotle, Taco Bell, McDonald's) that skews younger and male.
- What could kill it: trademark rejection under App Review 4.1/5.2 (the incumbents survive with "unofficial"
  disclaimers); content upkeep; and a utility that people only open now and then, so retention is weak.
- Scores: Demand 3, Openness 4, Buildability 5, Video fit 5, Retention-independence 3.
- Verdict: **BORDERLINE**, pending the multi-chain scan.

### 2. Home-bar cocktails ("what can I make with my bottles") — BORDERLINE/FAIL
- Demand: Cocktail Flow is at **F&D #61** with 21.3K ratings and **has not been updated since 2019-12-14**,
  which makes it a stale incumbent. Mixel is at #86. Paid chart: Bevnap (2026) is paid #2, and Nightcap and
  Bartender's Choice (both 2026) are in the paid top 30.
- appscan: `--must 'cocktail' --namemust 'cocktail|bar|mix|drink|bartend' "cocktail recipes" "home bar cocktails" "cocktail maker ingredients" "mixology" "bartender"`
  → 103 competitors, 2025: 16, **2026: 22**. Only 6 apps have more than 1K ratings.
- Read: the leader is stale but the money is small, and 22 launches in 2026 put it close to the flood
  threshold. It's a weak fit for a Gen-Z founder because it is alcohol content with an older audience.
  Scores: D2 O2 B5 V3 R3. **FAIL-leaning BORDERLINE.**

### 3. Miniature painting / Warhammer hobby tracker — FAIL
- Demand: Games Workshop's official Warhammer 40,000: The App is at **Lifestyle #50** with 3.04★, but that
  revenue is a licensed subscription. Third-party paint trackers are tiny: Figure Case 543 ratings at $4.99,
  paintRack 217.
- appscan (games excluded): 83 matches. True third-party trackers show a 2026 burst of small apps
  (GreyForge, HoardX, Painting Ledger, Sprue, Hobby Codex, MiniMatch, MiniVault, IRONBUILT, ~8+ in 2026).
- No third-party app earns real money, there is GW IP risk, and the vibe-coded clones have started.
  **FAIL** on demand.

### 4. Sourdough starter tracker — FAIL (clone flood)
- Demand: Loaflo (2024) is at **F&D #43** with 527 ratings.
- appscan `--namemust 'sourdough|starter|loaf|levain'`: **2026 launches: 84** (Sordo, Kneadly, Loafy, Crumb,
  Proofed, RiseMate, Hooch, Autolyse…). This is a textbook clone war. **FAIL.**

## Unscanned candidates (from chart mining — NOT judged; scans queued)
| Niche | Chart evidence | Incumbent weakness seen | Queue file |
|---|---|---|---|
| Aligner/Invisalign wear timer | TrayMinder **Medical #100** (2017, 5.2K ratings) | Latest 50 reviews: 21 of 50 are 1–2★, about intrusive ads, stuck ads and a scam-style "$249.95 charged" popup | aligner |
| Snoring / teeth-grinding recorder | SnoreLab **Medical #4** (2012, 57K); AutoSnore (2025) paid #4 | "$10/mo", recording fails overnight | snore |
| Military PT-test prep (ACFT/AF PFA) | PFA Calculator (2026) paid #29; Military Benefits App (2026) Lifestyle #97 | — | military |
| Eating-out macros / high-protein fast food | MenuFit (2025) **H&F #27**, 54K ratings; Seed Oil Scout F&D #19 | newcomer reached the top 30 within a year | menufit |
| Ranked/gamified lifting (gamer fit) | Liftoff H&F #42, 98K | reviews: $80/yr surprise charge, buggy, long onboarding | rankedgym |
| Sauna / cold-plunge log | HotLog paid #34 | the web search page already shows ~6 sauna trackers launched 2025–26, so it may be flooding | sauna |
| Peptide calculator | PepCalc paid #11 ($9.99), Peptide Tracker paid #24 | regulatory/gray-market risk | peptide |
| Renal/gout diet | Kidney Pal Medical #32; PCOS Pal (2024) Medical #8 | medical-advice risk | renal |
| Crochet/knitting learning | YarnPal (2024) **Lifestyle #39**, 33K | 25 of 50 recent reviews are 1–2★ (paywall, "AI slop", patterns from the ads missing) | knitcross |
| Whiskey collection | BarrelBook (2025) F&D #72; OnlyDrams #29; Bourboneur 1.97★ #59 | Bourboneur is rated 1.97★ | whiskey |
| Also queued | HYROX, calisthenics, BJJ, coffee/espresso log, freeze-dryer/canning, dog training, baby solids, card scanner, GLP-1, kegel, contraction timer, breathwork, discipline, FODMAP, jump rope, hearing amp, farmers market, cocktail cabinet | | batch2/3 |

## Rejected quickly from the chart data (no scan needed or known clone war)
- AI calorie / photo calorie trackers (Cal AI, Numify, Calo): known clone war.
- Budget meal planner by supermarket: mise, TapCook, Potto, NeatEat, Whipp, Herbi, Chow and Vego **all launched
  June–Sept 2026** and are all on the F&D chart. That makes it a live clone war in its first months.
- Social-video recipe importers (Osta, Honeydew, RecipeSnap, RecipeVault, Flavorish, Inspo, ReciMe): saturated.
- Camera heart-rate / BP "monitors" (Heart Beat, Heartica, HeartIn, Wello, BP Mate): scammy flood, medical claims.
- GLP-1 trackers (MeAgain, Shotsy): already crowded (scan queued to confirm).
- AI companions/life advice (Tolan, Astra, Tipsy), manifestation, dating: banned categories or network-bound.
- Medical scribes, drug references, anatomy, nursing exam prep: B2B or licensed content, a poor fit.
- Hardware companions (Nanit, Owlet, Wyze, Hatch, BACtrack): need hardware.
