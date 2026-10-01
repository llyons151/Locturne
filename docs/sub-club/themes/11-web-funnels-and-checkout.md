# 11 · Web funnels, web checkout vs in-app purchase

Added theme (not in the original suggested list) because ~12 episodes cover it and the evidence conflicts. Citation format `B07 · 2025-06-13`. "(?)" = garbled-caption number. Tags: **[Hard]** / **[Freemium]** / **[Both]**.

## Consensus

1. **Native IAP converts much better than web checkout at the moment of purchase.** [Both]
   - Microsoft 365: trial→paid ~5x higher on the App Store than some direct channels (card on file, trust in Apple) (observed; B04 · 2024-05-02).
   - Skylight: switching on-device QR checkout from web to IAP gave >100% conversion lift on that flow; IAP "paid for itself" (A/B/observed; B09 · 2026-02-18).
   - Dipsy (RevenueCat $40k test): web-only CTA had far fewer trial starts; proceeds/user ~$1.96 web vs ~$2.09 (?) IAP — ~6% worse at 30% fee, clearly worse at 15%; given a choice with 30% off on web, only 68 of 203 converters went to web (A/B; B07 · 2025-06-13).
   - Zumba: paywall-to-web lost ~35% of initial conversion, ~25% after redesign (B07 · 2025-08-06). Astropad: frictionless App Store buying mattered (B01).

2. **Web cohorts renew better, so web can win on LTV — if you have brand, trust and resources.** [Both]
   - Dipsy: ~3.5% web annual subs turned off auto-renew vs ~19% App Store (B07). Zumba: net +17% LTV after round two (Apple-sheet-like checkout, Apple/Google Pay default, redirect back) (B07). Yousician: web cohorts renew much better — but purchase-mix shifts can masquerade as retention wins (B09 · 2026-02-28). Reading.com: web copy of in-app onboarding → ~50% better trial, ~30% better paid conversion, credited to a trusted domain (observed; B07 · 2025-05-28).

3. **For indies and Small Business Program apps, app-to-web is not worth it.** [Hard, indie]
   - Petit: "a full zero" for brandless new apps; "save 30%" is a lie (B07 · 2025-08-21); saving fees is a bad reason; real margin gap smaller than 30 vs 3% (B05 · 2024-08-21). Barnard: stay on IAP if in the Small Business Program (B07). Crowley: real margin gain 15–20%, not 30% (B08).

4. **Web-to-app (ads → web quiz → app) is a separate channel with different audiences and rules.** [Both]
   - Real wins: audience expansion on Meta, access to Google Search/YouTube/Outbrain, warm-up before friction (Petit B05); older, more female, higher-WTP audiences (Rise B09, Simply B10, Babbel B05); faster ad learning without SKAN (Rise B09); early payer-prediction signals (Ladder q6, B05); cash flow — Stripe pays near-same-day vs ~60 days (Hudson B06).
   - Built With Science sends ~90% of paid traffic to a web quiz; the same quiz in the iOS app converted worse (B10 · 2026-09-02). Simply: ~20% of revenue from web; made Facebook work for the first time (B10).
   - Don't copy the app flow 1:1 (Rise failed twice; Simply advises against) — though Hudson says a funnel that works in-app almost always works on web, and Reading.com's 1:1 copy won. Web onboarding should "sell the problem" (Rise).
   - Web offers: money-back guarantees, discounted paid intros, multi-year plans, pause/partial-refund save flows (themes 03, 08).

## Contested
- Web vs app conversion: Hudson "web usually no worse, often better, esp. higher price" (B06) and Reading.com vs Microsoft, Skylight, Dipsy, Zumba (above). Brand/domain trust is the stated explanation.
- Dark patterns on web: $1-then-upsell, per-day prices, "continue" adds to cart — inflate LTV, bring refunds/chargebacks/regulators (Hudson B06, Lennox B10, Barnard chargeback B03).

## Evidence table

| Claim | App / guest | Number | Evidence type | Source |
|---|---|---|---|---|
| App Store trial→paid vs direct | Microsoft 365 | ~5x | observed | B04 · 2024-05-02 |
| Web→IAP on-device checkout | Skylight | >100% lift | A/B / observed | B09 · 2026-02-18 |
| Web-only vs IAP proceeds/user | Dipsy (RevenueCat) | ~$1.96 vs ~$2.09 (?) | A/B | B07 · 2025-06-13 |
| Choice: web at 30% off vs IAP | Dipsy | 68 of 203 chose web | A/B | B07 · 2025-06-13 |
| Early auto-renew off web vs IAP | Dipsy | ~3.5% vs ~19% | observed | B07 · 2025-06-13 |
| Paywall-to-web conversion loss; net LTV | Zumba | −35%→−25%; +17% LTV | test | B07 · 2025-08-06 |
| Web copy of onboarding | Reading.com | +50% trial, +30% paid | observed test | B07 · 2025-05-28 |
| Paid traffic to web quiz | Built With Science | ~90% | observed | B10 · 2026-09-02 |
| Web share of revenue | Simply | ~20% | observed | B10 · 2026-06-24 |
| App-to-web for indies | Thomas Petit | "a full zero" | opinion | B07 · 2025-08-21 |
| Web payout speed | Nathan Hudson | same-day vs ~60 days | observed | B06 · 2025-01-08 |
