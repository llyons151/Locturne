# Research track 5: Economics by category and traps to avoid

Compiled 2026-10-03. Evidence quality labels:
- **[A]** primary dataset from a billing/measurement platform or Apple itself (large n, methodology published)
- **[B]** reputable secondary reporting of an [A] source, or a vendor's own campaign data (biased sample, but real)
- **[C]** blog/SEO aggregator, unverified, or single anecdote. Use only as directional.

Where a number could not be confirmed it is marked "unverified". No numbers were invented; derived figures are labelled "my calc".

---

## 1. Subscription app benchmarks

### RevenueCat State of Subscription Apps 2026 (115k+ apps, $16B+ revenue) [A]
Sources: https://www.revenuecat.com/state-of-subscription-apps , https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 , SaaStr summary https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth , TechCrunch https://techcrunch.com/2026/03/10/ai-powered-apps-struggle-with-long-term-retention-new-report-shows

Overall:
- Download-to-paid (D35), global median: **2.0%**. North America **2.8%** vs India/SEA 0.7%.
- **Hard paywall vs freemium** download-to-paid (D35): **10.7% vs 2.1%** (≈5x). Top-10% hard paywall apps: 38.7%.
- **Revenue per install**: hard paywall **$2.32 (D14) / $3.09 (D60)** vs freemium $0.27 / $0.38 (≈8x). North America D60 RPI (all models) $0.55.
- 1-year retention is roughly the same for both models (freemium 28%, hard 27%) — hard paywall does not cost you retention.
- Median prices: **weekly $5.99, monthly ~$10, annual $34.80** (up from $31.60). NA annual median $39.99.
- High-priced apps: download-to-trial 8.9% vs low-priced 4.4%; annual LTV per payer $62.19 vs $10.69. Pricing higher does not kill conversion.
- Trial length: 17–32 day trials convert at 42.5% median vs ≤4-day at 25.5%. **55% of 3-day trial cancellations happen on Day 0**; ~1/3 of conversions happen on Day 0; 60%+ within week 1.
- **Milestones (apps launched in last 2 years): 17.3% reach $1K MRR, 4.6% reach $10K MRR.** For those that make it: median **58 days to $1K MRR**, 109 days to $10K (survivorship — this is time among winners, not a forecast).
- Supply shock: new subscription app launches ~2,000/month (Jan 2022) → **14,700+/month (Jan 2026)**. Apps launched pre-2020 earn 69% of revenue; apps launched 2025+ earn ~3%.
- Polarization: median MRR growth 5.3% YoY; top decile +306%; bottom quartile shrinks >33%.
- Billing-failure share of cancellations: Google Play 31% vs App Store 14%.
- One claim in RevenueCat's 10-minute summary (via fetch) said annual year-1 churn worsened "from 56% to ~72%" — **unverified**, treat with caution; it conflicts with the 2025 report's 44.1% annual renewal median unless definitions differ.

By category (2026 page) [A]:
| Category | Download→trial D30 | Trial→paid | Median price | Days to $1K MRR | % reaching $1K / $10K (2 yrs) |
|---|---|---|---|---|---|
| Business | 9.1% (highest) | – | – | 113 (slowest) | – / 1.6% |
| Health & Fitness | 6.9% | 37.7% | $4.99/wk, $9.99/mo, $39.94/yr | 87 | – |
| Education | 6.5% | – | $6.89/wk, $9.99/mo, $44.99/yr (highest annual) | – | – |
| Gaming | 4.4% | 25.0% | $4.99–5.81/wk, $4.99/mo, $24.99/yr | 32 (fastest) | 20.0% / 8.9% (highest) |
| Media & Ent. | 4.0% | – | – | – | – |
| Photo & Video | – | 22.2% | – | – | 21.4% / – ; median MRR 1 yr after launch $124 (highest category) |
| Productivity | – | – | 77% of plans monthly | 71 | – |
| Travel | – | 43.5% (highest) | $20/yr | – | – |
Health & Fitness D35 download-to-paid 2.9%.

### RevenueCat 2025 report (75k+ apps) [A]
Source: https://www.revenuecat.com/state-of-subscription-apps-2025 ; Slashdot/TechCrunch coverage https://developers.slashdot.org/story/25/03/17/1946256/sobering-revenue-stats-of-70k-mobile-apps-show-why-devs-beg-for-subscriptions , https://www.techrepublic.com/article/news-apps-revenue-developers/
- Hard paywall D35 conversion 12.11% vs freemium 2.18%.
- **Annual plan renewal median 44.1%** (down from 47.1%); monthly 17.0%; weekly 3.4% (these are "% still subscribed at 1 year" by plan type).
- Trial→paid medians: Travel 48.7%, Media & Ent 43.8%, Health & Fitness 39.9%.
- Photo & Video: 27.57% reach $1K, 8.75% reach $10K within 2 years (best category for milestones in 2025).
- ~20% reach $1K/month in 2 years; ~5% reach $10K. Median days to $1K among winners: 60.
- Top 5% of apps earn 500x the rest (up from 200x in 2024). 25th percentile apps earn $5–20/month after a year.
- Health & Fitness D60 ARPU median $0.63.

### Adapty State of In-App Subscriptions 2026 (16k apps, $3B revenue) [A, vendor sample]
Sources: https://adapty.io/state-of-in-app-subscriptions/ , https://adapty.io/blog/mobile-app-monetization-2026/ , https://ppc.land/95-of-app-subscription-revenue-goes-to-top-10-adaptys-2026-benchmark-report/
- **Weekly plans = 55.5% of subscription revenue** (2025) vs 43.3% in 2023; monthly 11.7%; annual 22.5%.
- Install-to-trial at upper-mid pricing: weekly 9.8% vs annual 1.8% vs monthly 0.3%.
- Weekly + 3-day trial is the best 12-month-LTV config (~$49.27).
- 89.4% of trials start on Day 0 — onboarding paywall is where money is made.
- Health & Fitness: highest trial→paid (35%) but lowest R1 retention (30.3%); only category where annual dominates revenue (60.6%).
- Trial LTV premium vs direct buy: Utilities +85.1%, H&F +63.6%, Education +50.4%; **negative** for Lifestyle (−21.2%) and Productivity (−13.7%) → in those, skip the trial.
- Lifestyle one-time purchase revenue share jumped to 26.3% (from 5.9%) — lifetime purchase is resurging there.
- **Distribution: 57.7% of apps earn <$1,000 total revenue; top 10% capture 94.5% of revenue.**
- iOS = 84.75% of subscription revenue; Europe monthly prices now 39% above NA ($15.25 vs $10.95).
- Apps running 50+ experiments: median revenue $914K vs $48.8K for 1-experiment apps (correlation, not causation).

### Superwall [B, vendor]
- Multi-page onboarding paywalls 12.41% vs single-page 9.07% conversion (40M paywall opens, Feb–May 2026): https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why

### Market context [A]
- Appfigures/TechCrunch: 2025 app downloads declined for the 5th straight year while consumer spending hit ~$156B; non-game spend outpaced games: https://techcrunch.com/2026/01/14/app-downloads-declined-again-in-2025-but-consumer-spending-soared-to-nearly-156b/

**Takeaways for this founder:** iOS, NA audience, hard paywall at onboarding, weekly or annual-with-trial, price at or above median. The base rate for any new subscription app reaching $1K MRR is ~1 in 5–6 in two years, and it's getting worse as launches 7x'd.

---

## 2. Organic short-form video / UGC: what converts and is it saturated?

Evidence [B] — Playkit (UGC creator network) State of Tech UGC 2025: https://playkit.substack.com/p/state-of-tech-ugc-2025-report
- 69,764 videos → 755M+ views → 7M+ attributed downloads ≈ **~9 downloads per 1,000 views** (my calc; vendor-attributed, campaign-optimised, likely optimistic).
- Avg creator CPM paid by Playkit: **$3.95** vs Meta ads ~$20 CPM; micro-influencers ~$119 CPM.
- Top categories by views: **Relationship/Dating (234.8M), Education/Language (230.8M), AI creative tools (123.4M)**.
- 59.4% of 700+ companies spent <$15K.

Other CPM data [C]: TikTok pay-per-view creator CPM ~$1–5, Shorts $3–10, Reels $5–12 (https://www.getviralytics.com/guides/what-is-a-good-cpm-for-ugc); "Canvas"-style ambassador accounts paid $2–6 CPM or ~$500/month + bonuses for 5–7 posts/week (https://getplugpro.com/guides/canvas-ugc-rates , https://www.conbersa.ai/learn/ugc-creator-rates-2026). Paid TikTok in-feed CPM $3–15 (https://iqfluence.io/public/blog/tiktok-advertising-cost).

Saturation evidence [A/B]:
- **Metricool 2026 TikTok study (2.3M posts, 92k accounts): views −31.3%, reach −28.7%, interactions −31.2% YoY; video volume +72%, image/carousel posts +~140%.** Carousel/slideshow saturation is real. https://metricool.com/press-release-tiktok-study-2026/
- Practitioners say the *template* (scripted testimonial, AI spokesperson, perfect review) now carries a trust penalty, not UGC itself [C]: https://44degrees.ai/blog/organic-ugc-creator-engine-for-apps
- Slideshow automation is being commoditised (AI agent + scheduler + phone farm pipelines are public tutorials) [C]: https://postiz.com/blog/automate-tiktok-slideshow-marketing-ai-agents-postiz — one example got only ~100 downloads.

Which categories fit organic short-form (synthesis, evidence [B/C]):
- Strong: visual before/after or emotional "result" categories — dating/relationships, language learning, AI photo/creative, fitness/looksmaxxing, calorie scanning (Cal AI grew this way, ~15M downloads reported [C]), habit/self-improvement with a dramatic hook, games with a shareable moment.
- Weak/needs ASO or paid: B2B, finance tools, generic utilities (scanner, VPN, cleaner), productivity — RevenueCat shows Business is slowest to $1K (113 days) and lowest at $10K (1.6%); these are search-intent categories.
- The founder's own track record (~1M views per app promo) is the asset; the founder-faced, real-footage format is less saturated than faceless slideshows.

Illustrative math (my calc, assumptions stacked, [C]): 1M views × ~9 downloads/1K = ~9K installs; × median hard-paywall D60 RPI $3.09 ≈ $28K gross. Real organic conversion and RPI for a new app are likely far lower (RevenueCat RPI is a median of established apps; Playkit attribution is optimistic). Treat as an upper bound, not a forecast.

---

## 3. AI-wrapper economics

- **RevenueCat 2026 [A]: AI apps earn 41% more revenue per payer but churn 30% faster.** Annual-plan retention 21.1% (AI) vs 30.7% (non-AI); monthly 6.1% vs 9.5%; refund rate 4.2% vs 3.5%. AI year-1 LTV per payer $30.16 vs $21.37. https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/ , https://techcrunch.com/2026/03/10/ai-powered-apps-struggle-with-long-term-retention-new-report-shows
- Inference cost: RevenueCat's worked example — ~$0.02–0.10 per active AI user/month for light text use; at $6 ARPU that's ~3% of revenue, but at $3.50 ARPU with heavier use ~17% ("structural margin problem") [A-ish, illustrative]. https://www.revenuecat.com/blog/growth/ai-feature-cost-subscription-app-margins
- AI app gross margins ~50–60% vs SaaS 80–90%; image APIs $0.02–0.20/image premium, fractions of a cent for cheap open models [C]: https://www.softwareseni.com/why-ai-gross-margins-are-so-much-lower-than-saas-and-what-that-means-for-your-business/ , https://apiframe.ai/blog/ai-image-api-pricing-2026 . Heavy video/companion chat is where costs bite (Inworld: $0.09–$18/DAU/month depending on stack [C] https://inworld.ai/resources/unit-economics-of-consumer-ai-apps).
- Commoditised/saturated:
  - **Calorie photo scanners**: dozens of clones (Callie, Nutrify, PlateLens, Calsy, SnapCalorie...), MyFitnessPal acquired Cal AI (Mar 2026) and owns the incumbent position; no one gives AI logging free; price competition ($34.99/yr vs $79.99) [C, many sources are competitor blogs]. https://www.calsy-app.com/blog/cal-ai-review
  - **AI headshots**: market still growing (~$400–500M est. 2025) but Adobe Firefly at $9.99/mo and HeadshotPro/Aragon dominate; enterprises moving away [C]. https://capturely.com/companies-moving-away-from-ai-headshots/
  - Photo enhancers, homework solvers (ChatGPT/Gemini apps do this for free), AI girlfriends/companions (high inference + App Store 1.2 UGC/moderation scrutiny — Feb 2026 rule puts anonymous chat under UGC requirements) — all saturated, plus platform-model risk: every frontier model release can make the wrapper obsolete.
- Takeaway: AI as a feature inside a non-AI value prop is fine; AI-as-the-product for a solo founder with retention weakness is the worst combination (fastest churn + variable COGS + commoditisation).

---

## 4. Ad-monetised apps/games

eCPMs 2026 (US iOS) [C, aggregator blogs citing AdMob/AppLovin]:
- Rewarded video ~$15–25 (AppLovin MAX tier-1 $22–28; 2025 AppLovin cites $15–40 in tier-1 gaming)
- Interstitial ~$5–10 (one source avg $9.64)
- Banner ~$0.50–1.50
Sources: https://www.revenuelab.fyi/blog/admob-ecpm-benchmarks-2026 , https://www.monetizemore.com/blog/how-much-ad-revenue-can-apps-generate/ , https://bidlogic.io/2026/07/31/q2-2026-ecpm-growth-interstitial-rewarded-video-and-banner-trends/

ARPDAU [B/C]: hypercasual $0.03–0.08; ads-only casual/puzzle blended $0.01–0.10; hybrid-casual (ads+IAP) $0.15–0.50; Appodeal: hypercasual lifetime ARPU $0.86; D90 ad revenue/user casual $0.55. https://blog.playio.co/arpdau-benchmarks-mobile-games , https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/

**DAU needed for $1.5–2K/month (my calc):** $1.5K/mo ≈ $50/day; $2K ≈ $67/day.
- Ads-only casual game at $0.03–0.08 ARPDAU (US-heavy): **~650–2,200 DAU**.
- Ads-only at a conservative $0.01–0.02 (global mix, banners/interstitials, non-game): **~2,500–6,700 DAU**.
- Utility with only banners (~5 impressions/day × $1 eCPM ≈ $0.005 ARPDAU): **~10,000–13,000 DAU**.
- Hybrid-casual at $0.15+: ~350–450 DAU.
Implication: ads only work with daily-habit products (daily puzzle games like the founder's Rivaldle/Soulsdoku). Sustained DAU is the hard part; viral spikes don't pay. Web daily games pay much less (web display CPMs lower) unless huge.

---

## 5. Fastest paths to first $1–2K/month: comparison

| Path | Evidence | Typical time-to-$1K | Probability signal | Fit for this founder |
|---|---|---|---|---|
| Consumer subscription iOS app (hard paywall) | RevenueCat [A] | 58 days median **among the 17% that make it** | ~17–20% reach $1K MRR in 2 yrs; 57.7% of Adapty apps earn <$1K lifetime | Good if founder video works; his edge is distribution |
| Paid upfront / lifetime iOS | Adapty [A] Lifestyle lifetime share 26.3%; RevenueCat says subs earn more per user [B] | Fast first dollar, no recurring | Low discoverability without audience | Good as a lifetime option alongside subs |
| Chrome extension | ExtensionPay/aggregators [C]: ~50% of monetised extensions <$100/mo, 15% $500–2K, 15% >$2K; ~4.7% of extensions are paid | Slow; SEO/store-search driven | Low-moderate | Poor match for short-form video |
| Shopify app | [C]: median listed app <$1K/mo; Shopify takes 0% of first $1M (https://shopify.dev/docs/apps/launch/distribution/revenue-share) | Months; B2B sales cycle, support burden | Moderate for niche boring problems | Needs merchant support time a student lacks |
| B2B micro-SaaS | Indie Hackers analyses [C]: first $ ~3 months; median 8–18 months to $1K MRR; ~70% never reach it | 8–18 mo | ~30% | Slow; distribution not via TikTok |
| Raycast extensions | Raycast store has 2,000+ extensions but **no paid marketplace found** [C] | n/a | — | Not a cash path |
| Mac menu bar apps (Gumroad/one-time) | Anecdotes [C] (e.g. IH "$100K with a simple Mac app") | variable | Low w/o audience | Weak |
| Notion templates / Gumroad digital goods | [C]: most Gumroad sellers <$100/mo; $1–10K/mo needs an audience | Fast if audience exists | Audience-dependent | Possible side-cash via his TikTok audience but off-brand |
| Freelance/contract RN/Expo dev | no dataset gathered | immediate | highest certainty | Most reliable cash; not "product" |

Honest read: nothing in the data shows a product path with a reliably higher probability than ~20–30% of hitting $1K/month inside a year. The founder's organic-video ability is the main lever that moves him out of the base rate, and it pairs best with a consumer iOS hard-paywall app in a visual/emotional category. If cash is needed in weeks, contract work is the only near-certain route.

---

## 6. App Store policy risks

Apple data [A]: https://www.apple.com/newsroom/2026/05/the-app-store-stopped-over-2-point-2-billion-usd-in-fraudulent-transactions-in-2025/
- 2025: 9.1M submissions reviewed; **>2M rejected** (1.2M new apps, ~800K updates).
- **>371,000 rejected for spam/copycat/misleading** (2024: >320,000) — rising.
- **>443,000 rejected for privacy** (5.1-type issues) — the single largest named reason.
- ~59,000 bait-and-switch apps removed; >22,000 rejected for hidden features.

Rule changes:
- **June 9, 2026: Guideline 4.3(b) tightened** — Apple can reject *and remove live apps* "indistinguishable from what is already widely available"; names dating, flashlight, sound effects, wallpaper, simple timers, fortune telling as needing a "meaningfully different" experience; repeated low-effort submissions can cost the developer account [B]: https://appcompliance.io/blog/apple-2026-app-review-guideline-changes/
- Feb 6, 2026: Guideline 1.2 — random/anonymous chat apps explicitly under UGC rules (filtering, reporting, blocking, contact info) [B].
- Developer reports of more 4.3(a) "design spam" hits on AI-built/template apps in 2025–26 [C]: https://ptkd.com/journal/app-store-rejection-4-3-a-ai-slop-design-spam , Apple dev forums https://developer.apple.com/forums/thread/812655
- **Jan 2026: mass rejections of "free trial toggle" paywalls under 3.1.2** as confusing/misleading, no announcement [B]: https://www.revenuecat.com/blog/growth/rip-toggle-paywall , https://adapty.io/blog/your-toggle-paywall-is-about-to-get-rejected/
- Back-to-back paywalls after decline can trigger 5.6 (developer code of conduct) [C]: https://revenueflo.com/blog/common-ios-paywall-rejections-and-the-fixes-that-work
- 3.1.2 basics: subscription must give ongoing value, ≥7-day period, clear price/terms before purchase.
- Fake countdown timers / fake discounts: no Apple-specific 2025–26 enforcement report found; they fall under 3.1.2 "misleading" and 5.6 dark-pattern language — **unverified as a specific crackdown**, but same risk class as the toggle.
- **Cal AI case (Apr 2026)**: Apple pulled the app for ~4 days after a viral post showed a Stripe payment sheet styled like native IAP with IAP removed; reinstated after fixes [B]: https://piunikaweb.com/2026/04/16/cal-ai-removed-from-app-store-viral-payment-sheet-post/ , https://mobilemarketingreads.com/apple-pulls-cal-ai-over-billing-design-and-payment-rule-violations-then-reinstates-app/ . Lesson: web-checkout tricks that hide IAP are a takedown risk, even for a top app.

Traps to avoid (synthesis):
1. Cloning a saturated template category (4.3b now allows removal of live apps).
2. AI-wrapper as the whole product (fastest churn + COGS + commoditised).
3. Toggle paywalls, disguised payment sheets, aggressive double paywalls.
4. Privacy manifest/data-collection mismatches (largest rejection bucket).
5. Relying on faceless slideshow farms in 2026 (volume +140%, reach −29%).
6. Ads-only monetisation without a daily habit loop.
7. Freemium for a solo founder with weak retention (5x worse conversion, same retention as hard paywall).
