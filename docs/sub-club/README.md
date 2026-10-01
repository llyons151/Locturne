# Sub Club research

## What this is

These are research notes on all **149 episodes of Sub Club** (June 2021 to September 2026). Sub Club is RevenueCat's podcast about subscription apps, hosted by David Barnard and Jacob Eiting.

**Why this source:** the guests are operators: founders, growth leads, and heads of monetization at Opal, Duolingo, Tinder, Ladder, Zumba, Lose It!, Mojo, Coconote, Rise and others. They often share real A/B test results, prices and funnel numbers from subscription apps. RevenueCat's yearly State of Subscription Apps data is also discussed on the show. Trundle is a hard-paywall iOS subscription app, and this is the best available body of evidence for one. It also includes two episodes from Opal, the closest competitor.

## Method

1. We pulled auto-caption transcripts for all 149 episodes. Auto-captions garble names and numbers, so any figure we couldn't confirm is marked **"(?)"** throughout.
2. We split the transcripts by date into 10 batches of about 130k words each. A separate agent read each batch in full and wrote paraphrased notes per episode: relevance, findings with evidence type, tactics, and caveats. Those notes are `batch-01.md` … `batch-10.md`.
3. One more agent read all 10 batch files and reorganized the findings by topic into `themes/`. Each theme file has three parts:
   - **Consensus:** claims backed by several independent sources.
   - **Contested:** claims where sources disagree, with each side's context.
   - **Evidence table:** each claim with the app or guest, the number, the evidence type, and a citation.

   Findings are ranked by evidence strength: A/B test with numbers > A/B without numbers > benchmark data > observed data from one app > anecdote > opinion. Each finding is also tagged for whether it applies to hard-paywall apps, freemium apps, or both.
4. **We did not commit the full transcripts.** Everything here is paraphrased, and the only quotes are short ones. Citations take the form `B04 · 2024-01-10`, meaning batch file `batch-04.md` and the episode's air date. Each batch file carries the YouTube link.

## File map

| File | Contents |
|---|---|
| `batch-01.md` | 13 episodes, 2021-06 → 2022-01 |
| `batch-02.md` | 15 episodes, 2022-02 → 2023-07 |
| `batch-03.md` | 13 episodes, 2023-08 → 2023-12 |
| `batch-04.md` | 15 episodes, 2024-01 → 2024-06 (includes Opal 2024) |
| `batch-05.md` | 12 episodes, 2024-06 → 2024-11 |
| `batch-06.md` | 22 episodes, 2024-12 → 2025-04 (includes SOSA 2025 minisodes) |
| `batch-07.md` | 11 episodes, 2025-04 → 2025-08 |
| `batch-08.md` | 13 episodes, 2025-09 → 2026-01 |
| `batch-09.md` | 18 episodes, 2026-02 → 2026-04 (includes SOSA 2026, Rise, Opal 2026) |
| `batch-10.md` | 17 episodes, 2026-04 → 2026-09 |
| `themes/01-paywall-placement-and-hard-vs-soft.md` | Where the paywall goes; hard paywall vs freemium; close buttons |
| `themes/02-paywall-design-and-copy.md` | Trial-timeline paywall, annual-first layout, per-month display, CTA copy, defaults, tiers on the paywall |
| `themes/03-trials.md` | Trial length, card up front, removing trials, paid trials, reverse trials, repeat trials |
| `themes/04-pricing-and-plan-mix.md` | Price level and raises, elasticity, grandfathering, analog anchoring, annual vs monthly, tiers, lifetime plans |
| `themes/05-onboarding-length-quizzes-personalization.md` | Long vs short onboarding, quizzes, personalization, qualification questions, where login goes |
| `themes/06-activation-aha-and-first-days.md` | Count-based activation, aha moments inside onboarding, auto-commitment, the 30-day habit window |
| `themes/07-retention-habits-notifications.md` | Notification timing, streaks, shame, stored state, social units, referrals, seasonality |
| `themes/08-cancellation-winback-offers.md` | Churn timing, save flows, easy cancel, win-back, discounts, involuntary churn |
| `themes/09-psychology-principles.md` | Commitment/sunk cost, loss aversion, clarity, defaults, emotion, goals, shame, scarcity, social proof |
| `themes/10-competitors-and-analogs.md` | Opal (both episodes in detail), Rise, Calm/Headspace, Welltory, RoboKiller and other analogs |
| `themes/11-web-funnels-and-checkout.md` | IAP vs web checkout, web-to-app quizzes (added theme) |
| `themes/12-testing-discipline-and-metrics.md` | Judging tests on renewals and refunds, big swings, holdouts, benchmark table (added theme) |
| `themes/13-acquisition-organic-and-paid.md` | Traffic quality, short-form video, creators, paid thresholds (added theme) |

**Gap:** no episode covers an alarm, wake-up or "get out of bed" app. The closest analogs are Opal (scheduled app blocking), Rise (sleep) and habit apps. See theme 10.

## Top 20 findings by evidence strength

Findings are ranked roughly by strength and number of independent sources. **[Hard]**, **[Freemium]** and **[Both]** mark where each one applies.

1. **Most conversion happens on day 0.** About 70% of trial starts fell within 24h in 2024, rising to 80%+ on day 0 by 2026 and nearly 90% in some categories. This comes from RevenueCat benchmarks in several yearly reports and matches practitioner reports of 70–90%. The first session decides revenue. [Both, strongest for Hard] (B04 · 2024-03-11, B06 · 2025-03-17, B09 · 2026-03-06, B01 · 2021-08-25)
2. **A trial-timeline paywall wins wherever it's tested.** The paywall shows what happens on each day and promises a reminder before the charge. At None to Run it raised trial starts 23–25% with no drop in trial-to-paid, matching Blinkist's own ~23%. Dozens of challengers never beat it at Opal. Duolingo got lifts from the timeline and from letting users pick their reminder day. At Built With Science, annual-first plus a timeline moved annual share from 60% to 75–85%. [Both] (B02 · 2022-06-15, B04 · 2024-01-10, B08 · 2026-01-21, B09 · 2026-03-02, B10 · 2026-09-02)
3. **A paywall inside onboarding, after a few intent-building screens, is the biggest placement win.** Opal's download-to-trial went from ~7% to ~17%. It produced most of Mojo's trials. FitnessAI saw +80% (confounded with other changes). At Zumba, a hard paywall after onboarding won. Life360 keeps its onboarding paywall even though it is freemium. [Both] (theme 01)
4. **Hard paywalls convert about 5x better than freemium, with equal year-1 retention in aggregate.** Download-to-paid by day 35 was 10.7% vs 2.1%, and retention was ~26.8% vs ~27.7% (SOSA 2026, correlational). Supporting cases: V1 Sports' switch from freemium to a trial gave +80–90% revenue. Phil Carter saw one client's switch to freemium cut conversion by more than 50%. [Hard] (B09 · 2026-03-06, B05 · 2024-11-27, B09 · 2026-04-15)
5. **Judge paywall and price tests on net revenue after refunds and renewals, not trial starts.** BoldVoice's no-X hard paywall raised trials but lost more to refunds. Mojo killed a price that won on day-7 revenue because its 7-day cancel rate was high. At Yousician, a win-back offer turned net negative and price raises lost at renewal. Weather Up's monthly default gave +10% subscribers but −60% early LTV. [Both] (theme 12)
6. **Show annual first, with monthly behind "view all plans", and show the annual price as a per-month figure.** Annual share rose 15–20 points at Mojo, from 56% to 76% at None to Run, and from 60% to 75–85% at Built With Science. The per-month line gave +10% revenue in the US and +30–40% in Latin America at Mojo. [Both] (theme 02)
7. **Most apps are underpriced, and raising the price for new users only (grandfathering existing ones) usually holds up.** Skylight went from $39 to $79 with minimal loss. Lose It! went from $40 to ~$80 and broke even on net revenue for the first time in 12 years (repeated A/B). Coconote went from $99.99 to $129 and gained more users and more revenue. MySwimPro went from ~$100 to $180 with flat conversion. [Both] (theme 04)
8. **Longer onboarding wins when each step builds belief or produces a visible personalized result.** Lose It! got double-digit trial lift, Zumba "a lot", and Coconote +16% from ~15 screens. Sesame's longer intake gave +40% (before/after comparison). Removing Burner's investment screen lost. The counter-evidence is ElevenReader and Tinder, where the aha moment is instant. [Hard especially] (theme 05)
9. **Fewer choices convert better.** Burner's 1 SKU drastically beat 5. At Opal, every onboarding test that added choice failed. Adding explanatory context to Built With Science's pricing page lowered conversion. When Genius Scan dropped its cheap tier, sales held and all went to the top tier. [Both] (themes 02, 05)
10. **Defaulting the user into a commitment that runs automatically tomorrow was a "huge win."** Opal auto-creates a Mon–Fri 9–5 blocking schedule during onboarding (A/B). This is the most directly transferable finding for scheduled blocking. [Both] (B04 · 2024-01-10)
11. **Trial CTA copy has to make the zero cost explicit.** At Duolingo, "Try for $0.00" beat "Try for free", which beat "Start free trial", which beat "Subscribe", and $0.00 lifted trial-to-paid too. At Microsoft, "Try free" beat "Buy now". One caveat: critics question whether "$0.00" is clear about auto-renewal. [Both] (B08 · 2026-01-21, B04 · 2024-05-15)
12. **Seven days is the default trial length that wins on net.** Zumba's 7-day trial beat 14- and 30-day trials. When Duolingo cut 14 days to 7, net conversions rose and test velocity doubled. Captions (instant value) found 3 days beat 7. Match the trial to how long the value takes to show up. [Both] (theme 03)
13. **Activation is a count of a repeated core action.** Examples: 6 stories (2x trial-to-paid), 3 workouts a week (Ladder), 3 classes (Zumba, with the goal defaulted to 3), ~3 completions before first renewal (Petit). Design the trial period around reaching that count. [Both] (theme 06)
14. **Annual subscribers decide to cancel right after the first charge.** 34% of annual churners turn off auto-renew in month 1, against ~11% in month 12 (SOSA 2026). Post-purchase weeks are a retention window. [Both] (B09 · 2026-03-06)
15. **Cancel-flow saves recover 10–25%, and for trial users "more time" beats a discount.** Layfield saw 10–20% across companies. Coconote saved ~25%, with a 7-day extension winning. Opal's 50%-off offer on trial cancel "works quite well". A hidden cheaper plan in the subscription group holds 10–15% of FitnessAI subscribers. Discount saves can turn net negative once refunds are counted (Yousician). [Both] (theme 08)
16. **Time reminders to behaviour, not to a time the user picks.** Duolingo's reminder at 23.5h after the last session beat user-set times across many experiments. Reminders stop after 7 days, and days 3–4 of a lapse are critical. New pushes can turn negative after ~6 weeks. [Both] (B06 · 2025-03-06, B08 · 2026-01-21)
17. **Shame-based streaks and goal loops drive churn for behaviour that happens outside the app, such as sleep and health. Simple, celebratory streaks on an achievable cadence retain.** Evidence: Welltory's shame finding, Ladder's weekly check-mark streak plus widget (~1/3 install it), and Opal's focus-based streak with gems, its biggest win of the year. [Both] (B04 · 2024-05-29, B09 · 2026-03-07, B09 · 2026-04-29)
18. **Put login and other costly fields after the paywall, but don't delete accounts.** Moving login was Coconote's biggest win (~10% less drop-off). A required phone number blocked Pray.com from monetizing. Savvy Navvy removed accounts entirely, and the results decayed after rollout. [Both] (theme 05)
19. **Native IAP beats web checkout at the point of purchase for small apps.** Microsoft saw ~5x better trial-to-paid through the App Store. Skylight got >100% more conversion by moving to IAP. At Dipsy, web came out ~6% worse after fees at 30% and clearly worse at 15%. Web cohorts renew better, but only brands with resources come out ahead. [Hard, indie] (theme 11)
20. **Freemium pays only when free users give value back through network effects, UGC, virality, data or ads, and usually only after scale.** Opal went freemium at $10M ARR (payers fell from ~20% to ~9% of MAU, DAU passed 1M, revenue gain unquantified). Duolingo warns of the "premium trap". Life360 left unshipped a change that would have doubled subscribers. For a new entrant, start hard. [Freemium] (themes 01, 10)
