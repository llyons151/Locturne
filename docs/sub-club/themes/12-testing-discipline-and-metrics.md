# 12 · Testing discipline, metrics, and benchmarks

Added theme: how guests judge tests and which numbers they steer by. Citation format `B09 · 2026-02-28`. "(?)" = garbled-caption number. Tags: **[Hard]** / **[Freemium]** / **[Both]**.

## Consensus

1. **Judge paywall and pricing tests on downstream revenue (renewals, refunds, cancels), not trial starts or day-0 conversion.** [Both, critical for Hard]
   - BoldVoice: gold-standard metric is net revenue after refunds per exposed user on a mature cohort (trial + a week + ≥2 weeks for refunds); harder paywalls won on trials and lost on refunds (A/B; B10 · 2026-09-16).
   - Yousician: price raises look like wins at launch, control wins at ~6-month renewal; win-back offer net negative after refunds; stacked 5–10% wins rarely show in topline (observed; B09 · 2026-02-28).
   - Mojo: primary metric ARPU at day 7; proxy for renewal = 7-day cancellation rate; rejected a day-7 winning price because its cancel rate spiked (B09 · 2026-03-01).
   - Simply: soft paywall won on ARPU for months, then turned out to sell year subs to users with no keyboard (B10 · 2026-06-24). Savvy Navvy: "through the roof" test decayed at 100% rollout (B10). Weather Up: monthly default +10% subs, −60% early LTV (B04). Reading.com: high prices spiked LTV then faded over 2 years (B07). Burner & Falzon: price-test results change a year later at renewal (B02, B06). Pray.com: judge placement on downstream metrics (B05).

2. **Take big swings early; incremental tweaks are for scale.** [Both]
   - Petit: first paywall changes unlock 20–30%, then gains shrink to 2–3%; then do structural changes (paywall first-screen vs end vs none; free vs premium split) (B02 · 2022-03-02). Opal: 121 tests was too many — prioritise big swings (B04). Built With Science and RevenueCat hosts: the further from target, the more radical the test (B10, B04). Carvell: early on, big swings measured by cohort, not A/B (B01). Steve Young: when small, look for big obvious differences (B03).
   - Scale thresholds (Seufert): ~10k DAU test durations; ~100k test prices; ~1M test everything (B02).

3. **Watch a small set of funnel metrics daily, especially paywall views.** [Both]
   - Superwall: % of installs that see a paywall (B02). Genius Scan: daily founder email of 5–10 metrics incl. paywall views, 30- vs 90-day moving averages (B06). Aperture: check install → first-open (~70%) before blaming onboarding (B03). Opal: day-8 ROAS weekly (B04). Burner: cohort LTV projected from day-8 and day-30 (B08).

4. **Long-run effects need long holdouts.** [Both]
   - Duolingo: 3–6-month control groups; a new push turns negative after ~6 weeks (B08). Life360: stacked growth hacks need ~5-year holdouts to see (B07). Duolingo "premium trap" shows green 6–12 months then fails (B08).

5. **Most tests fail; iterate on losers.** [Both]
   - Burner: ~1 in 4–5 paywall tests wins (B08). Built With Science: ~70% fail first try (B10). Life360: only inconclusive tests are failures — segment losses (B10). Layfield: big bets win on 3rd–4th attempt (B07). Don't copy others' visible tests — you can't see what won (Layfield B07; Alper Taner B08).

6. **Payback period over LTV for early decisions.** [Both]
   - Ladder: payback, LTV:CAC "a fantasy" early (B03, B06). Falzon: LTV forecasts "rest on sand" (B06). Mojo: 30-day payback, no pLTV (B05). Phil Carter: payback ideally <3 months; LTV:CAC 3x gold standard (B06). Investor view: LTV:CAC ~6x strong, <3x cools interest (B01).

## Contested
- Deezer shipped a no-winner homepage variant on gut feel; positive weeks later (B06). Skylight: "pulse on the emotional reaction, not just quant AB" (B09). Visible hit $10M ARR with no paywall or price tests (B10). vs LinkedIn's 1,000+ tests/yr and Duolingo's ~400 concurrent (B08).
- Benchmarks as targets: hosts warn against it (B04, B06 · 2024-12-23); Shot Pattern's above-benchmark numbers were "juiced" by warm traffic (B07); Alper Taner: a low install→trial is "a fact, not a problem" until tested (B08).

## Key benchmarks (RevenueCat unless noted)

| Metric | Value | Source |
|---|---|---|
| Download→paid within 30 days | median 1.7%; LQ 0.6%; UQ 4.2% | B04 · 2024-03-11 |
| Download→paid by D35, hard vs freemium | 10.7% vs 2.1% | B09 · 2026-03-06 |
| Year-1 retention, hard vs freemium | ~26.8% vs ~27.7% (P90 54% vs 58%) | B09 · 2026-03-06 |
| Median year-1 retention | ~27–30%; annual first renewal ~30.5%→~28% (2023) | B09; B04 |
| Median annual retention | ~35% (host) | B08 · 2025-10-15 |
| Trial→paid median | ~31% (host) | B10 · 2026-05-20 |
| Install→trial, health/fitness | 15–20% (Alper Taner); ~6% (Natal's figure) | B08; B10 |
| Day-14 realized LTV per download | $0.35 NA vs $0.08 global | B04 · 2024-03-11 |
| Median new app revenue at month 12 | ~$50/mo; UQ ~$300–400 | B04 · 2024-03-11 |
| Top 10% MRR growth vs median | 306% vs 5.3% | B09 · 2026-03-06 |
| Churned monthly subs resubscribing in 12 mo | >10% | B04 · 2024-03-11 |
| Consumer annual yr-1 retention "very good" | ~70% (GP Bullhound) | B03 · 2023-09-20 |
| ~50% annual retention "not bad" | Mosaic | B06 · 2024-12-11 |
| PMF survey "very disappointed" | ≥40% | B02 · 2022-05-25 |
| Paid UA viability | <~$1 revenue/install US can't work (Petit) | B03 · 2023-08-07 |
