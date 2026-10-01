# 08 · Cancellation, churn timing, save offers, win-back, discounts

Cross-episode synthesis of Sub Club batches 01–10. Citation format `B09 · 2026-03-06`. "(?)" = garbled-caption number. Tags: **[Hard]** / **[Freemium]** / **[Both]**.

## Consensus

1. **Annual subscribers decide to leave right after the first charge, not at renewal.** [Both]
   - SOSA 2026: of annual subscribers who churn, 34% turn off auto-renew in month 1, ~11% in month 12, 4.7% in month 11 (benchmark; B09 · 2026-03-06). SOSA 2025: month 1 is the single biggest month (~27% (?); hosts also said "over 40%" — inconsistent) and the final month is second (B06 · 2025-03-17). BlueThrone host repeats it (B08 · 2025-10-15).
   - Weather Up: >30% of monthly subscribers turned off auto-renew within month 1 (B04 · 2024-03-20). Dipsy: ~19% of App Store annual subs had auto-renew off early vs ~3.5% on web (B07 · 2025-06-13).
   - Implication: the first weeks after conversion are a retention window, not just onboarding (theme 06).

2. **Cancellation save flows work: 10–25% saved, and "more time" beats discounts for trial users.** [Both, but in-app IAP limits what you can offer]
   - Layfield: pause, temporary discount (e.g. 50% off 3 months), hidden lower tier, "talk to support" cut churn 10–20% across several companies (observed; B07 · 2025-04-16). Pause fits episodic habits.
   - Coconote: web cancel flow saved ~25% of would-be cancellers; of ~30% off, 3-month pause and "+7 days" trial extension, the extension won "by far" (tests; B09 · 2026-03-18, B10 · 2026-05-20).
   - Opal: on trial cancellation, a 50%-off push + in-app modal "works quite well" — the one day-1 re-engagement that worked (A/B in progress; B04 · 2024-01-10).
   - FitnessAI: a cheaper plan in the same App Store subscription group shows on Apple's cancel screen; ~10–15% of subs are on it (observed; B02 · 2022-06-29).
   - Petit: with web billing, "we refund half and you keep the subscription" — a "massive" share accepted (anecdote; B05 · 2024-08-21).
   - Quizlet: pause and short exam-prep packages shown only to relevant cancellers (B06 · 2025-03-08).

3. **Make cancellation easy; hard offboarding backfires.** [Both]
   - Google requires one-tap cancel; trust depends on it (B04 · 2024-05-20). Crowley: hard offboarding gets you sued; churned users are your best remarketing pool (B08 · 2025-11-12). Paddle: dark patterns hurt long-term, FTC click-to-cancel (B06). Rise: without easy cancel, trial conversion looks inflated but causes chargebacks and card-network flags (B09 · 2026-03-05). Slopes: "you're not skiing, I don't want your money" (B02). Phil Carter: cancel flow can ask why and offer a discount but must stay easy to find (B03).

4. **Win-back is a real, compounding revenue line — but build it once the churned base is big.** [Both]
   - RevenueCat: >10% of churned monthly subs resubscribe within 12 months (B04 · 2024-03-11). Burner: 20–30% of new subs are returning former subscribers (B08 · 2025-12-10). LinkedIn: a growing share of new subs are "boomerangs" (B08 · 2025-09-17).
   - Apple iOS 18 win-back offers: RevenueCat estimate ~1–2% lift, "free money" (B04 · 2024-06-17).
   - Wait until hundreds–thousands have churned, not 15 (Barnard/Jacob, B04); small apps at $100k/mo chasing win-back is usually the wrong priority (B04 · 2024-05-02); skip cancel-flow discounts before PMF (Reid DeRamus, B03 · 2023-09-06).

5. **Win-back works best when something changed — new content, a fixed objection, a better offer.** [Both]
   - Crunchyroll emailed churners when requested shows arrived (B03). Ladder re-contacted declined leads after its price reset → biggest month (B03 · 2023-11-29). Daphne: tell churners about features fixing their original objection (B07). Quizlet: "you asked, we built" + hyperlocal proof (B06). LinkedIn: "5 new things since you left" + second trial after 12 months (B08). Captions: cancelled users jump the support queue (B05).

## Contested

**A. Discount-based saves and win-back: net positive or not?**
- *Positive:* Opal (trial-cancel 50%), Layfield (10–20%), Jake Mor/Superwall — send a discount within 24h to non-subscribers (B04 · 2024-03-11); Lose It escalating discounts for long-time free users and streak sales (A/B; B02); Phil Carter — offer a discount to anyone not converted by the time 90% of converters have (B03).
- *Negative/careful:* Yousician — a "cancel auto-renew → offer" flow looked great but many cancelled, got a refund, then took the offer: net negative once refunds counted (observed; B09 · 2026-02-28). Quizlet: never blanket-discount or users learn to cancel for 50% off; tier by tenure (B06). Layfield: saves get gamed as they become known (B07). LinkedIn avoids broad coupons, "our price is what it is" (B08). Barnard: instant discount on Apple-sheet dismiss can be very effective but Apple has pushed back on some developers (B07).

**B. Can IAP apps even run save flows?** Most rich save flows (pause, partial refund, trial extension) cited are web/Stripe-only (Coconote, Petit, Paddle). On iOS: Apple win-back offers, retention offers in limited beta and probably discount-only (B09 · 2026-03-18), and the subscription-group downgrade trick (FitnessAI). **Relevant to a hard-paywall iOS app: in-app you mainly have the trial-cancel detection + offer (Opal), subscription-group plans, and Apple offer codes.**

## Involuntary churn
- As churn falls, payment failures become a larger share — ~50% at ~2% monthly churn; spend ~2 days on dunning emails (Layfield, B07). Nearly a third of Google Play cancellations are billing failures; turn on grace periods (SOSA 2026, B09).

## Evidence table

| Claim | App / guest | Number | Evidence type | Source |
|---|---|---|---|---|
| Annual churners turning off auto-renew in month 1 | SOSA 2026 | 34% (M12 ~11%) | observed (benchmark) | B09 · 2026-03-06 |
| Month 1 biggest cancellation month | SOSA 2025 | ~27% (?) | observed (benchmark) | B06 · 2025-03-17 |
| Monthly subs turning off auto-renew in month 1 | Weather Up | >30% | observed | B04 · 2024-03-20 |
| Web vs App Store early auto-renew off | Dipsy | ~3.5% vs ~19% | observed | B07 · 2025-06-13 |
| Save flows cut churn | Dan Layfield | 10–20% | observed (several cos.) | B07 · 2025-04-16 |
| Cancel flow saved; extension beat discount/pause | Coconote | ~25% saved | tests | B10 · 2026-05-20 |
| Trial-cancel 50% off push + modal | Opal | "works quite well" | A/B (in progress) | B04 · 2024-01-10 |
| Hidden cheaper plan in subscription group | FitnessAI | 10–15% of subs | observed | B02 · 2022-06-29 |
| Refund-half-keep-sub offer (web) | Thomas Petit client | "massive" share | anecdote | B05 · 2024-08-21 |
| Win-back offer net negative after refunds | Yousician | — | observed | B09 · 2026-02-28 |
| Churned monthly subs resubscribe in 12 mo | RevenueCat | >10% | observed (benchmark) | B04 · 2024-03-11 |
| Returning former subs share of new subs | Burner | 20–30% | observed | B08 · 2025-12-10 |
| iOS 18 win-back offers lift | RevenueCat estimate | ~1–2% | opinion/estimate | B04 · 2024-06-17 |
| Payment failures share at 2% churn | Dan Layfield | ~50% | observed | B07 · 2025-04-16 |
| Google Play involuntary share | SOSA 2026 | ~1/3 | observed | B09 · 2026-03-06 |
| Streak-milestone sale | Lose It! | "massively" improved small cohort | A/B | B02 · 2023-07-12 |
| Re-contacting declined leads after price reset | Ladder | biggest month (Jan 2022) | observed | B03 · 2023-11-29 |
| Discount within 24h of non-conversion | Jake Mor (via hosts) | — | opinion | B04 · 2024-03-11 |
| Tier win-back discounts by tenure, never blanket | Quizlet | — | opinion | B06 · 2025-03-08 |
