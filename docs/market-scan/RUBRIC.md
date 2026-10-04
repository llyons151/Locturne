# Opportunity hunt: shared rubric (read fully before starting)

Date: 2026-10-03. Goal: find the highest-value iOS app a specific solo founder can build, where demand
is PROVEN and the market is still OPEN. A previous pass recommended a "pray-to-unlock" app without
checking the store; it turned out ~300 such apps exist. **Never recommend a niche you have not scanned.**

## Founder
- Full-time college student, solo, builds iOS-first apps in Expo/React Native, can write some Swift.
  Has working Screen Time (FamilyControls) blocking, AlarmKit, CoreMotion, quiz onboarding + hard paywall
  (RevenueCat) code from his current app Locturne (morning alarm that keeps apps blocked until you get up).
- Distribution: makes his own short-form videos (~1M views on past projects; a Marvel Rivals daily
  guessing game "Rivaldle"). Little ad budget. Historically weak at retention.
- Needs cash; prefers 4–8 week builds. Male, Gen Z, gamer. US market.

## Tools (no web-search budget needed; use these first)
Working dir: /tmp/claude-1000/-home-mokey-Documents-Projects-Locturne/7e2a4ac7-665f-4453-b29c-cb646c60c9a0/scratchpad/market
- `all_charts.tsv` – US top-grossing / top-free / top-paid, top 100 for 24 categories (pulled today), with
  release date, rating count, stars, last update. Games included.
- `recent_grossing_2024plus.tsv` – the 600+ apps launched since 2024 that are ALREADY on a top-grossing chart
  (strongest "a newcomer can make money here" signal). Includes a description snippet.
- `python3 appscan.py --namemust 'regex' --exclude 'regex' [--must 'regex on name+desc'] [--list] "kw1" "kw2" ...`
  Searches the US App Store (200 results per keyword), returns competitor count, rating buckets,
  launches per year (2025/2026 flood check), top competitors with top-grossing slots. Use 3–6 keywords
  and tight regexes; eyeball with --list to make sure counts are true competitors.
- iTunes lookup: `curl "https://itunes.apple.com/lookup?id=ID&country=us"`; reviews RSS:
  `https://itunes.apple.com/us/rss/customerreviews/id=ID/sortBy=mostRecent/json`
- WebSearch/WebFetch (load via ToolSearch "select:WebSearch,WebFetch") may be rate-limited: use sparingly
  for revenue evidence (Appfigures/Sensor Tower snippets, founder posts, Starter Story).
- Revenue proxy (rough, label as estimate): US top-grossing rank in a category ~ in Health/Lifestyle/
  Productivity/Education #1–20 ≈ $500K+/mo, #20–50 ≈ $100–500K, #50–100 ≈ $30–150K; smaller categories
  (Reference, Books, Utilities, Sports, Navigation, Weather) lower. Ratings ≈ 1–3% of downloads.

## Pass/fail gates (every candidate must report numbers for each)
1. PROVEN DEMAND: at least one app squarely in the niche earns real money: on a top-grossing chart, OR
   credible revenue ≥ ~$20K/mo. Bonus: an app launched 2024+ got there (newcomers can win).
2. OPEN MARKET (from appscan, true competitors only):
   - FAIL if 2026 launches > ~25 true competitors (clone flood), or if the niche is a known 2025–26 clone
     war (AI calorie, quit porn, faith lock, generic screen-time blocker, AI headshot/photo, AI Bible chat,
     rizz/looksmax, AI companion, wake-up alarm with tasks, earn-screen-time-by-exercise, homework solver).
   - GOOD if: few true competitors launched 2025–26, AND either leaders are stale (no update 12+ months),
     poorly rated (<4.3), hated for price, or the money sits with 1–3 apps leaving a clear wedge.
3. BUILDABLE solo in Expo in ≤8 weeks, no licensing/data cost that kills margins, no regulated-medical/
   financial-advice risk, no need for a two-sided network.
4. FOUNDER FIT: films well in short-form video (or grows via ASO search where retention doesn't matter).

## Output
Write findings to the file named in your task. For each candidate (aim 6–10, quality over quantity):
- Niche + one-line product wedge
- Demand evidence (apps, chart slots, revenue figures with source + grade A/B/C)
- appscan command used + key numbers (competitors, 2025/2026 launches, top 5 with ratings/last update)
- Why it's open (specific incumbent weakness) and what could kill it
- Scores 1–5: Demand, Openness, Buildability, Video/ASO fit, Retention-independence
- Verdict: PASS / BORDERLINE / FAIL (keep FAILs briefly — they're useful)
Also list niches you rejected quickly and why. Don't invent numbers.
Return a summary ≤500 words listing your PASS/BORDERLINE candidates with key numbers.
