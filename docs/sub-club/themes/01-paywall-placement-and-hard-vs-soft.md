# 01. Paywall placement, and hard vs soft paywalls

Cross-episode synthesis of Sub Club batches 01–10. Citations use `B04 · 2024-01-10` (batch file + episode date). "(?)" means the number came from garbled auto-captions. Applicability tags: **[Hard]** = holds for hard-paywall apps, **[Freemium]** = holds for freemium/soft apps, **[Both]**.

Evidence strength, strongest first: A/B test with numbers > A/B test without numbers > large-sample benchmark data (RevenueCat) > observed data from one app > anecdote > opinion.

## Consensus

1. **The purchase decision happens in the first session. Most trials start on day 0.** [Both, strongest for Hard]
   - RevenueCat benchmarks, in several years' reports: about 70%+ of trial starts within 24 hours (B04 · 2024-03-11), over 80% on day one (B06 · 2025-03-17), about 80% of conversions on day 0 (B09 · 2026-03-06), and close to 90% in some categories (Phil Carter citing SOSA, B09 · 2026-04-15).
   - Practitioners report the same: Shamanth Rao saw 90%+ of trial starts within 24h across clients (B01 · 2021-08-25). Thomas Petit saw about 70% on day 0 (B05 · 2024-08-21). Sylvain Gauchet says about 80% of conversions come from the first-day paywall (B06 · 2025-03-14). Dan Layfield reads the benchmarks as meaning the decision falls in the first ~10 minutes (B07 · 2025-04-16).
   - SOSA 2025 calls skipping the onboarding paywall an "own goal".
   - Exceptions: freemium apps with generous free tiers and recurring paywall campaigns (Mojo gets ~50% of revenue after day 1, B09 · 2026-03-01) and Google Play data showing late purchasers (see Contested).

2. **Putting a paywall in or at the end of onboarding is the biggest single placement win reported.** [Both]
   - Opal: iterated A/B tests on placement took download-to-trial from ~7% to ~17% (B04 · 2024-01-10). Moving the paywall two screens earlier gave ~+10% trial starts, though the framing was loose.
   - Mojo: its first experiment put the paywall at the end of onboarding, with a trial. It still produces the majority of Mojo's trials (A/B, no numbers; B05 · 2024-07-10).
   - FitnessAI: moving the paywall before onboarding and adding a video gave ~+80% conversion, and paywall view rate went from ~40% to ~85%. The two changes were made together (B02 · 2022-06-29).
   - Matter: a more aggressive placement plus copy and visual changes more than doubled paywall views, which lifted subscriber conversion ~30% (B03 · 2023-12-13).
   - Steve Young: a soft, closable onboarding paywall doubled revenue for a panic-attack app. A friend saw the same doubling (anecdote; B03 · 2023-08-23).
   - Zumba: a hard paywall after onboarding and before the product raised overall conversion (A/B; B07 · 2025-08-06).
   - Life360: even this freemium giant keeps an onboarding paywall, because removing it would cut new subscribers significantly (B10 · 2026-05-13).

3. **Show the paywall to more users, more often. Paywall-view rate is an under-watched lever.** [Both]
   - Superwall: most apps show the paywall to under 80% of installs, and view rate tracks install-to-paid. The usual winning test is "all of the above": before onboarding, after it, on every app open, and on locked features (observed across clients; B02 · 2022-06-29).
   - Genius Scan: "showing paywalls more often is almost always better". A UI refresh moved a high-intent button into a drawer, which cut paywall views ~10–20% (?) and went unnoticed for months (B06 · 2025-01-22).
   - Tinder: a top-nav paywall entry, treated as a throwaway test, earned ~$50M (A/B; B08 · 2026-01-07).
   - Mojo: an app-open paywall for existing free users, capped at once a week, drove ~15% of new revenue with no visible complaints (B09 · 2026-03-01).
   - Phil Carter: every user should see a paywall in the first session, then metered contextual paywalls after that (B03 · 2023-12-13).
   - onX: many users didn't know they were on a free plan (B06 · 2025-03-07).

4. **Hard paywalls convert far better, and aggregate data shows no retention penalty.** [Hard]
   - SOSA 2026: download-to-paid by day 35 was 10.7% for hard paywalls vs 2.1% for freemium. Year-1 retention was about equal (~26.8% vs ~27.7%). Benchmark data, correlational (B09 · 2026-03-06).
   - Steve Young's one-feature app: organic revenue went from ~$1–2k to $10k/month on a hard paywall, then fell to ~$5k/month once Apple forced an X (observed, single app; B03 · 2023-08-23).
   - Burner: a soft paywall (7-day trial with "maybe later") raised revenue, and then a hard, trial-required paywall drove "tons of growth" (sequential tests, no numbers; B02 · 2022-07-13).
   - V1 Sports: switching freemium to a trial gave ~80–90% revenue growth in 12 months (observed; B05 · 2024-11-27).
   - Phil Carter: one client's switch from hard paywall to freemium cut subscriber conversion by more than 50% and was rolled back within weeks (B09 · 2026-04-15).
   - Opal reached $10M ARR with ~11 people on a hard paywall (B09 · 2026-04-29). Coconote reached $6.7M ARR on a near-hard paywall (B09 · 2026-03-18). Babbel runs one (B05 · 2024-08-07).

5. **Freemium only makes sense when free users give value back: network effects, UGC, virality, data, or ad revenue. Otherwise go hard.** [Both, decision rule]
   - The rule comes from many independent guests:
     - Petit and Seufert: match paywall aggressiveness to network effects (B02 · 2022-03-02).
     - Barnard: Nomorobo's free landline tier produced the data behind the paid product (B03 · 2023-11-01).
     - Babbel: ask what your free base does for the business (B05 · 2024-08-07).
     - AllTrails: free users create most of the UGC (B01 · 2021-11-17).
     - onX: pick based on TAM (B06 · 2025-03-07).
     - SOSA 2026 hosts (B09 · 2026-03-06).
     - Life360: hard paywalls fit "high-conviction, non-social apps" (B10 · 2026-05-13).
     - Phil Carter: freemium is "chess" for billion-dollar scale; bootstrapped apps should go hard (B09 · 2026-04-15).
   - Low-revenue indie heuristic (Steve Young): under ~$1k/month, try a hard paywall to learn whether anyone wants the app (B03).

6. **Put the paywall after a few screens that build intent, not on the very first screen.** [Hard]
   - Opal: early, "at the peak motivation moment", but not screen one (B04 · 2024-01-10).
   - Sylvain: the screens before the paywall matter as much as the paywall itself (B06 · 2025-03-14).
   - Natal host: "your paywall is only as good as the story leading up to it" (B10 · 2026-06-08).
   - Coconote describes "long onboarding into a hard paywall, trial in the first session" as the current meta (B10 · 2026-05-20).
   - Against: Jacob Eiding says a first-screen buy button beats a delayed paywall that only a fifth of users see (opinion; B04 · 2024-03-11).

## Contested

**A. Hard paywall vs freemium over the long run.**
- *For hard:* the SOSA 5x conversion figure, Phil Carter's −50% freemium failure, and Steve Young, Burner, V1 and Coconote (all above). The SOSA hosts suggest launching hard and loosening later.
- *For freemium:*
  - Opal, the closest analog to Trundle, moved from a hard paywall to true freemium at $10M ARR to chase scale. Payers/MAU fell from ~20% to ~9%, DAU "exploded" past 1M, organic growth rose and students became ~2/3 of DAU. Revenue impact was not quantified ("pays back tenfold", CEO claim; B09 · 2026-04-29). In 2024 Schlenker had already said the hard, annual-plan funnel caps growth at ~$10–30M ARR because students can't pay $99/yr (B04 · 2024-01-10).
  - Phil Carter saw +75% LTV per user when one client moved to freemium with a multi-step paywall (B09 · 2026-04-15).
  - Duolingo's "premium trap": moving free features behind the paywall looks green for 6–12 months, then fails (B08 · 2026-01-21).
  - Super Unlimited (VPN) keeps conversion deliberately low to protect ratings and rank (B09 · 2026-04-01).
  - Widgetsmith deletes any app that asks for money first (opinion; B01 · 2021-06-30).
  - Barnard calls a hard paywall "kind of a cop-out" long-term, though a fine start (B03 · 2023-08-23). He cites Duolingo overtaking the hard-paywalled Babbel (B08 · 2025-10-15).
- *Context that resolves most of it:* freemium wins arrived after brand, scale and word of mouth existed (Opal, Duolingo, Life360, Super Unlimited at 1M downloads/day). Hard wins are in bootstrapped, early or non-social apps.
- **For a new hard-paywall iOS app, the evidence favors starting hard.**

**B. Does a hard paywall give a false read on product-market fit?**
- Jeff Morris (ex-Tinder): people pay to try, then churn, and annual plans hide bad retention for 12 months. Tinder waited for a match and a chat before charging (opinion; B08 · 2026-01-07).
- RevenueCat attributes the 2023 drop in retention partly to more aggressive, earlier paywalls (B04 · 2024-03-11). SOSA 2025 says more aggressive early monetization shows up as churn later (B06).
- Pray.com: paywall-first can raise initial conversion but hurt long-tail LTV (opinion; B05 · 2024-10-30).
- Against: SOSA 2026 finds equal year-1 retention for hard and freemium in aggregate (B09). Mojo and Coconote charged from day 0 specifically to measure real demand (B05, B09). BoldVoice charges to find its ideal customer (B10 · 2026-09-16).
- **Applies to Hard:** judge on renewals and refunds, not trial starts (see theme 12).

**C. Making the close button hard to find.**
- *For:*
  - Opal: hiding the dismiss button or making it discreet "was a winner". An X at 80% opacity gave +20% revenue, though it is unclear whether that was Opal data (?) (B04 · 2024-01-10).
  - Steve Young: delaying the X by ~5s raises revenue, which he calls "edgy" (B03).
- *Against:*
  - BoldVoice tested a no-X hard paywall, and separately an undismissable discount after dismissal. Both lifted trial starts, but refunds rose by more than the gain, so neither shipped (A/B on mature cohorts; B10 · 2026-09-16).
  - Apple forced an X on Steve Young's app (B03).
  - Genius Scan refuses slow fade-in X buttons on brand grounds (B06).
  - Super Unlimited keeps an obvious X (B09).
  - Life360 warns that stacked small dark patterns erode trust in ways short tests can't see (B07 · 2025-05-14).
- **Applies to Hard:** any "harder" variant has to be judged net of refunds.

**D. Paywall before value, or after activation?**
- Hannah Parvaz: users who reached 6 stories converted 2x better from trial to paid. Even so, the onboarding trial offer brought so much more volume that it stayed, and the trial was re-offered later to warmer users (B03 · 2023-10-18).
- Zumba found the paywall before the product won (B07). Coconote uses one free note, then the trial (B09).
- Morris: never ask for a card before a successful outcome (B08). Genius Scan skips the onboarding paywall entirely, and Jacob says that could cost it 3x revenue (opinion; B06).
- The resolution most guests reach: paywall in onboarding **plus** contextual paywalls after value moments. Zumba shows a paywall when the free welcome class closes, and it converts well (B07). Lose It shows one after setup of premium features (B02). Duolingo shows one when hearts run out (B09 · 2026-03-02).

**E. Late conversions.**
- Google Play data shows most IAP purchasers wait over a year (B04 · 2024-05-20).
- Surfline: most conversions come in the first 7 days, then a trickle continues (B04 · 2024-01-24).
- Lose It: free users who haven't converted within 30 days have single-digit odds of ever converting (B02 · 2023-07-12).
- **Applies to Freemium only.** A hard-paywall app has no free pool to convert later.

## Evidence table

| Claim | App / guest | Number | Evidence type | Source |
|---|---|---|---|---|
| Hard paywall converts ~5x freemium, same yr-1 retention | RevenueCat SOSA 2026 | 10.7% vs 2.1% D35; 26.8% vs 27.7% retention | observed (benchmark, correlational) | B09 · 2026-03-06 |
| Paywall placement iteration lifts trial starts | Opal | download→trial ~7%→~17% | A/B (iterated) | B04 · 2024-01-10 |
| Paywall two screens earlier | Opal | ~+10% trial starts | A/B (loosely framed) | B04 · 2024-01-10 |
| Discreet/hidden dismiss button won; X at 80% opacity | Opal | +20% revenue (?) | A/B (source unclear) | B04 · 2024-01-10 |
| Paywall before onboarding + video | FitnessAI / Superwall | ~+80% conversion; view rate 40%→85% | A/B (confounded) | B02 · 2022-06-29 |
| Most apps show paywall to <80% of installs | Superwall clients | <80% | observed | B02 · 2022-06-29 |
| End-of-onboarding paywall = majority of trials | Mojo | not given | A/B | B05 · 2024-07-10 |
| Hard paywall after onboarding raised conversion | Zumba | not given | A/B | B07 · 2025-08-06 |
| Aggressive placement doubles views → +30% conversion | Matter (Phil Carter client) | 2x views, +30% | observed | B03 · 2023-12-13 |
| Hard paywall revenue; forced X halves it | Steve Young app | $1–2k→$10k→$5k/mo | observed (1 app) | B03 · 2023-08-23 |
| Soft onboarding paywall doubled revenue | panic-attack app | 2x | anecdote | B03 · 2023-08-23 |
| Soft→hard (trial-required) paywall | Burner | "tons of growth" | sequential tests | B02 · 2022-07-13 |
| Freemium→trial switch | V1 Sports | +80–90% revenue in 12 mo | observed | B05 · 2024-11-27 |
| Freemium switch failed, rolled back | Phil Carter client | >−50% sub conversion | observed | B09 · 2026-04-15 |
| Freemium + multi-step paywall succeeded | Phil Carter client | +75% LTV/user | observed | B09 · 2026-04-15 |
| Hard→freemium at scale | Opal | payers/MAU 20%→9%; DAU >1M | observed (revenue unquantified) | B09 · 2026-04-29 |
| Hard paywall / undismissable discount lifts trials but refunds exceed gain | BoldVoice | not given | A/B (mature cohorts) | B10 · 2026-09-16 |
| Trial starts within 24h | RevenueCat 2024 | ~70%+ | observed (benchmark) | B04 · 2024-03-11 |
| Trial starts on day 1 | SOSA 2025 | >80% | observed (benchmark) | B06 · 2025-03-17 |
| Trial starts within 24h of install | Shamanth Rao clients | 90%+ | observed | B01 · 2021-08-25 |
| Day-0 share up to ~90% in some categories | Phil Carter (SOSA) | 80–90% | observed (benchmark) | B09 · 2026-04-15 |
| Weekly-capped app-open paywall for free users | Mojo | ~15% of new revenue | observed | B09 · 2026-03-01 |
| Top-nav paywall entry | Tinder | ~$50M | A/B | B08 · 2026-01-07 |
| Moving a button cut paywall views | Genius Scan | −10–20% (?) | observed (accidental) | B06 · 2025-01-22 |
| Onboarding trial offer kept despite activated users converting 2x | Aperture client | 2x trial→paid after 6 stories | observed + test | B03 · 2023-10-18 |
| Onboarding paywall kept in freemium | Life360 | "significant" subs | observed | B10 · 2026-05-13 |
| Hard paywall weather app, first-24h trial start | Weather Up | ~25% | anecdote | B04 · 2024-01-29 |
| Free-user conversion after 30 days | Lose It | single-digit % | observed | B02 · 2023-07-12 |
| Most IAP buyers wait >1 year | Google Play | not given | observed (platform) | B04 · 2024-05-20 |
| Paywall-first hurts long-tail LTV | Pray.com | none | opinion | B05 · 2024-10-30 |
| Hard paywall fakes PMF | Jeff Morris (Tinder) | none | opinion | B08 · 2026-01-07 |
| Under $1k/mo → try hard paywall | Steve Young | none | opinion | B03 · 2023-08-23 |
| Delayed X (~5s) raises revenue | Steve Young | none | anecdote | B03 · 2023-08-23 |
| Hard paywall may move app to paid category in ASO | BlueThrone | none | unverified claim | B08 · 2025-10-15 |
