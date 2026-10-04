# Track 6: Measuring and optimizing onboarding conversion with low, spiky traffic

Research date 2026-10-03. Inputs read: BRIEF.md, docs/ANALYTICS.md, src/lib/analytics.ts,
src/lib/analytics-start.ts, src/lib/revenuecat.ts, src/lib/purchases.ts,
src/features/onboarding/onboarding-flow.tsx (tracking calls), screens/paywall.tsx, and the
"Test roadmap" in docs/sub-club/APPLIED_TO_LOCTURNE.md.

Evidence grades: **[A#]** A/B with numbers, **[A]** A/B, **[B]** benchmark or correlational,
**[S]** single-app observation, **[N]** anecdote, **[O]** opinion or my own reasoning,
**[M]** my own calculation (scripts in the scratchpad: `ss.py`, `bayes.py`).

---

## 0. The 12 findings that matter most

1. **The repo's sample sizes for revenue reads are too optimistic.** APPLIED_TO_LOCTURNE says a
   revenue read needs ~4,000 installs per arm. At 5% install→paid, 4,000/arm only detects about a
   **30%** relative lift in payers or net revenue per install (RPI). A 20% lift needs **~8,000/arm**
   for payers and **~8,000/arm** for RPI [M]. At 2k installs/month, a revenue-powered two-arm test
   takes **8 months**. Don't plan to run revenue-powered tests below ~10k installs a month.
2. **Make decisions on a fast proxy and confirm with revenue later.** The proxy is
   **"trial started and auto-renew still on at 72 hours" per install**. It catches most early
   cancellations: RevenueCat reports 39.8% of all 7-day-trial cancellations happen on day 0
   [B, RevenueCat SOSA 2026]. Unlike raw trial starts, it isn't fooled by tests that inflate
   low-intent trials. Net revenue per install at D35 stays the confirmation metric and the
   guardrail.
3. **Use Bayesian expected loss, not p < 0.05.** For a solo founder, shipping a variant that's
   actually a tie costs nothing. Shipping a loser is the only real cost. My simulation at a 15%
   baseline with 1,000 installs per arm: a "ship if P(beat) > 80%" rule ships a true **−10%**
   variant only 3% of the time, and catches a true **+20%** variant 85% of the time [M]. A
   frequentist test at that n detects the +20% only about 40% of the time.
4. **CUPED doesn't help onboarding tests.** New installs have no pre-period. Eppo's docs say so
   directly [B]. What does help: regression adjustment on covariates measured before the arms
   diverge (for paywall tests, the quiz answers), plus stratifying by `found` × week.
5. **Bandits are the wrong tool for the paywall.** The reward is delayed 7–35 days, traffic
   mix swings with each video (Simpson's-paradox risk when allocation changes over time), and
   you need an estimate of the effect, not just a winner.
6. **The current exit-offer analysis in PostHog will be biased.** `paywall_viewed.exit_arm` is
   the *resolved* arm. It becomes `none` when prices haven't loaded, when the Apple ID isn't
   trial-eligible (for `longer-trial`), and on reruns. So the "none" group fills up with repeat
   trialers and slow networks. Analyze by the **assigned** arm, which PostHog doesn't have
   today. Fix: register `exit_arm_assigned` as a super property at startup, and log a
   `paywall_closed` event in **every** arm, including `none`, for triggered analysis.
7. **Triggered analysis makes the exit-offer test 20–50× cheaper.** Only people who close
   `plans` are affected. Comparing arms among closers, with the trigger logged identically in
   every arm, detects "offer vs no offer" with a few hundred closers per arm instead of
   thousands of installs [M/O].
8. **For onboarding (pre-paywall) tests, assign locally the way the exit arm already is**,
   not with PostHog remote flags. PostHog flags load asynchronously and aren't there on the
   first frame of the first launch [B, PostHog bootstrapping docs]. Register the arm as a super
   property at assignment, and analyze per install (intention-to-treat). **For price, trial and
   paywall-copy tests, use RevenueCat Experiments**, which is free on RevenueCat's Pro tier below
   $2.5k MTR and enrolls new customers at first open [B, RC docs]. Drive copy variants through
   offering **metadata**, which the code already reads for `exit_arm`. Superwall isn't needed.
9. **Before/after comparisons are useless here.** Example: if TikTok installs trial at 8% and
   App Store search installs at 25%, moving TikTok's share from 50% to 90% drops the blended
   rate from 16.5% to 9.7% with no product change [M]. The `found` answer only exists for people
   who reach step 8. Use App Store Connect campaign links (`ct=`) in every bio and video for
   pre-install source counts.
10. **There's no qualitative loop yet, and that's the best use of the next 3 months.** Run 3
    rounds × 5 people (NN/g) on the web preview and TestFlight, plus 5-second comprehension
    tests on `offer` and `plans` via Lyssna's free plan. Pre-launch, these find bigger problems
    than any A/B test you can afford.
11. **Instrumentation gaps:** no back-tap event, no backgrounding event (and `ms_on_previous`
    includes background time), no time-to-first-screen, no prices-load latency, no plan-toggle
    event, no reminder-toggle state on purchase, no hold-to-agree or demo-completion detail, no
    `paywall_closed` in the `none` arm, no assigned arm, no RevenueCat
    `trackCustomPaywallImpression`. Section 8 lists them all with types.
12. **Launch plan:** ship the obvious stuff untested, keep **one** randomized test running at a
    time below ~10k installs/month, and use the New Year spike for the single highest-variance
    question: **paywall position**, or a two-arm exit offer, not three arms.

---

## 1. Why statistics bite hard here: the numbers

### 1.1 Baselines to plan with

| Rate | Planning value | Source / grade |
|---|---|---|
| Install → trial (hard paywall, onboarding) | 12–17% | Opal 7%→17% after the hard paywall move (repo research, [S]). Health & Fitness median trial start ~5–7%, top 5% 12–15%+ (secondary citation of RevenueCat SOSA 2025, **unverified** against the PDF) |
| Trial → paid, Health & Fitness | median 39.9%, top decile 68.3% | RevenueCat SOSA 2026, via secondary summary [B] (https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026) |
| Hard paywall, D35 download → paid | median 10.7% (2026), 12.1% (2025) | RevenueCat SOSA 2026 [B] (same URL) |
| Share of 7-day-trial cancellations on day 0 | 39.8% | RevenueCat SOSA 2026 [B] (https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app.md, https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/) |
| Web2app quiz funnels: paywall reach | ~13% of clicks reach the paywall, ~23% of paywall viewers buy | FunnelFox report [B]. Web funnels with paid traffic, so not comparable to an in-app quiz after install |

Note: 10.7% D35 download→paid for hard paywalls is a *median across all hard-paywall apps*,
many of them paid-UA products. My planning value for Locturne is ~5% install→paid (15% × 35%),
in line with the repo. Organic viral Gen Z traffic could be lower, so plan conservatively.

### 1.2 Sample size per arm (two-sided α = 0.05, 80% power, relative lift) [M]

Formula: standard two-proportion z-test (Evan Miller's calculator gives the same:
https://evanmiller.org/ab-testing/sample-size.html).

**Install → trial**

| Baseline | +10% | +20% | +30% | +50% |
|---|---|---|---|---|
| 8% | 18,900 | 4,900 | 2,300 | 880 |
| 12% | 12,000 | 3,100 | 1,440 | 560 |
| 15% | 9,300 | 2,400 | 1,100 | 420 |
| 20% | 6,500 | 1,700 | 770 | 290 |

**Install → paid** (the real outcome, readable only after ~D10 for trial→paid and ~D35 for refunds)

| Baseline | +10% | +20% | +30% | +50% |
|---|---|---|---|---|
| 4% | 39,500 | 10,300 | 4,800 | 1,860 |
| 5% | 31,200 | 8,200 | 3,800 | 1,470 |
| 6% | 25,700 | 6,700 | 3,100 | 1,210 |

**Net revenue per install (RPI) at D35.** Model: 5% pay; 85% of payers on annual ($59.99 ×
0.85 after Apple's small-business cut), 15% monthly (2 × $9.99 × 0.85 by D35). Mean RPI ≈
$2.29, SD ≈ $10.36, coefficient of variation ≈ 4.5. n/arm: **+10%: 32,000 · +20%: 8,000 ·
+30%: 3,600 · +50%: 1,300.** RPI is no easier than install→paid: the zeros dominate the
variance.

**Time to read a two-arm test** (50/50 split, all installs enrolled):

| Installs/month | Per arm per month | Trial +30% (1,100/arm) | Trial +20% (2,400/arm) | Revenue +20% (8,000/arm) + 35 days |
|---|---|---|---|---|
| 2,000 | 1,000 | ~5 weeks | ~10 weeks | 8 months + 5 weeks: **not feasible** |
| 5,000 | 2,500 | ~2 weeks | ~4 weeks | ~3.2 months + 5 weeks |
| 10,000 | 5,000 | ~1 week | ~2 weeks | ~7 weeks + 5 weeks |
| 20,000 | 10,000 | days | ~1 week | ~3.5 weeks + 5 weeks |

**Disagreement with the repo:** APPLIED_TO_LOCTURNE's "~4,000 installs per arm" revenue read
only detects ~30% lifts. That's fine *if* you accept that only big effects will show, but say
so in the plan. Its "Test 1: plan count, 3 cards vs Annual + Other plans" is also stale: the
paywall already dropped Lifetime and shows only Annual + Monthly (paywall.tsx line 48).

### 1.3 What effect sizes to expect

Most product changes are small. Kohavi, Tang & Xu (*Trustworthy Online Controlled Experiments*,
Cambridge UP 2020) report that most ideas at Microsoft, Bing and Google fail to improve their
target metric, and that dramatic results usually mean a bug ("Twyman's law", ch. 3:
https://www.cambridge.org/core/books/trustworthy-online-controlled-experiments/twymans-law-and-experimentation-trustworthiness/886425EC1B92BD23A0DC5E6817785190).
Kohavi's rule of thumb is that real experimentation starts at "tens of thousands of users" and
gets comfortable around 200k (Lenny's Podcast notes:
https://podpulse.ai/podcast-notes-and-takeaways/lennys-podcast-product-growth-career-the-ultimate-guide-to-ab-testing-ronny-kohavi-airbnb-microsoft-amazon)
[O, expert]. Paywall-structure changes (position, trial vs not, price, plan count) are the
exception: they can move conversion by 20–100%, as in Opal's 7%→17%. **So at Locturne's scale,
test only structural, high-variance changes, and ship everything else on judgment.**

---

## 2. Which statistical approach, when

### 2.1 Frequentist fixed horizon (the default you shouldn't peek at)

Fix n in advance and look once. Peeking at a fixed-horizon test and stopping at the first
p < 0.05 inflates false positives far above 5% (Evan Miller, "How Not To Run an A/B Test",
2010: https://www.evanmiller.org/how-not-to-run-an-ab-test.html). Fine for one-off reads at
20k installs/month. At 2–5k/month it's underpowered for anything but huge effects.

### 2.2 Sequential / always-valid inference (when you will peek)

- **mSPRT / always-valid p-values:** Johari, Pekelis & Walsh, "Always Valid Inference:
  Bringing Sequential Analysis to A/B Testing" (arXiv 1512.04922, Optimizely's Stats Engine:
  https://arxiv.org/abs/1512.04922). You can peek as often as you like without inflating
  alpha. The cost is less power at any fixed n. Statsig implements mSPRT
  (https://statsig.com/blog/sequential-testing-on-statsig).
- **Evan Miller's simple sequential test** (https://evanmiller.org/sequential-ab-testing.html)
  works on a phone calculator. Pick N, the total number of conversions you're willing to
  collect across both arms (his calculator gives it). Stop when treatment conversions minus
  control conversions reaches **2√N** (treatment wins), or when the total reaches N (no
  winner). It's one-sided and assumes a 50/50 split. It's a good fit for the exit-offer
  triggered test (§5), where the conversions are exit-offer trial starts.
- **When to use:** guardrails (crash spikes, SRM, refund spikes) always get monitored
  continuously. For the primary metric, use sequential when traffic is spiky and you'd stop
  early on a big win anyway, which describes a viral launch.

### 2.3 Bayesian probability-to-beat with expected loss (my recommended default)

- Chris Stucchio's decision rule (VWO SmartStats): pick a "threshold of caring" ε and stop
  when the expected loss of choosing a variant falls below ε
  (https://www.chrisstucchio.com/blog/2014/bayesian_ab_decision_rule.html, whitepaper:
  https://www.chrisstucchio.com/pubs/VWO_SmartStats_technical_whitepaper.pdf). GrowthBook calls
  this "risk" (https://docs.growthbook.io/statistics/details). PostHog's Experiments default to
  Bayesian. RevenueCat Experiments report "chance to win" and credible intervals
  (https://www.revenuecat.com/docs/tools/experiments-v1/experiments-results-v1).
- **Why it fits a founder:** you're not publishing a paper. You need to choose the version
  that makes more money and avoid big mistakes. Expected loss puts a cost on being wrong.
- **What my simulation shows** (Beta(1,1) priors, 15% baseline, 1,500 runs per cell) [M]:

| n/arm | True lift | P(beat) > 95% | P(beat) > 80% |
|---|---|---|---|
| 1,000 | 0% | 4% | 21% (ships a tie: harmless) |
| 1,000 | +20% | 58% | 85% |
| 1,000 | +30% | 84% | 95% |
| 1,000 | −10% | 0.1% | **3%** (ships a loser) |
| 2,000 | +20% | 83% | 97% |
| 2,000 | −10% | 0.1% | 1% |

  **Rule for Locturne:** ship B when P(B beats A) ≥ 80% **and** expected loss < 2% relative
  **and** no guardrail is worse with P ≥ 70%. For changes that are expensive to reverse
  (price), raise the bar to 95%. Bayesian results still suffer under heavy optional stopping,
  so fix a *minimum* run of two full weeks (both weekdays and two weekends, and at least 2
  video spikes) before any decision.

### 2.4 Multi-armed bandits (Thompson sampling): mostly no

- Bandits work best when the reward arrives almost instantly, like CTR
  (https://engineering.ezcater.com/multi-armed-bandit-experimentation). With a reward days
  later (trial→paid on day 7, refunds by day 35), the bandit allocates on stale or proxy data.
  Delayed-feedback variants exist
  (https://ar5iv.arxiv.org/html/2202.00846, https://proceedings.mlr.press/v244/gigli24a.html)
  but they're research code, not something to run solo.
- Changing allocation over time while the traffic mix changes (TikTok spike vs App Store
  search lull) creates Simpson's paradox in pooled results
  (VWO: https://help.vwo.com/hc/en-us/articles/900005577303).
- Bandits optimize; they don't estimate. You'd never learn *how much* the 14-day trial costs
  in refunds.
- **The one acceptable use:** 3–5 headline variants on `hello`, rewarded by reaching `reveal`
  (minutes, not days). Even this is low value below ~10k installs/month. Skip it until then.

### 2.5 Variance reduction

- **CUPED** (Deng, Xu, Kohavi & Walker, WSDM 2013: https://exp-platform.com/cuped/) cut variance
  by ~50% at Bing using *pre-experiment* behavior of the same user. New installs don't have
  any. Eppo's docs: CUPED "is generally less effective for newer users, for example, when
  testing onboarding flow changes, there is no prior data to leverage, just the assignment
  dimensions" (https://docs.geteppo.com/statistics/cuped/). Statsig's docs agree
  (https://docs.statsig.com/stats-engine/variance_reduction).
- **What works instead:**
  1. **Regression adjustment on pre-divergence covariates.** For a *paywall-only* test, every
     quiz answer (`nightMinutes`, `morningMinutes`, `found`, `age_bracket`, `alarm`, `tried`)
     is measured before the arms diverge, so it's a legitimate covariate. Fit `converted ~ arm
     + covariates` on paywall viewers. Variance falls by roughly the covariates' R². I'd guess
     5–15% here [O, unverified], which is worth about 5–15% fewer installs. It's cheap: a
     PostHog SQL export and a few lines of Python.
  2. **Stratification / post-stratification by `found` × install week.** Randomization already
     removes bias. Stratifying guards against a chance imbalance in a small sample (say, one
     arm got more of a single viral day) and tightens the estimate.
  3. **Triggered analysis** (§5). The biggest lever by far for the exit offer.
  4. **Shorter-latency metric.** Trials with auto-renew on at 72h vs D35 revenue. You'll
     still need the confirmation.

### 2.6 Delayed revenue: a two-stage protocol

1. **Decide** on the fast metric, "trial and auto-renew on at 72h per install", with the
   Bayesian rule above.
2. **Ship with a holdback:** keep 10% of new installs on the old variant for 5 more weeks.
3. **Confirm** on D35 RPI (net of refunds) from RevenueCat Experiments or the RC→PostHog
   events. If the holdback shows the winner's RPI is worse with P ≥ 80%, roll back. This is
   the "holdout" practice from Kohavi et al. and the Duolingo practice already in the repo.

---

## 3. Before/after fails with viral traffic, and how to stratify

- **Mix shift example** [M]: TikTok installs trial at 8%, App Store search at 25%. With a
  50/50 mix, blended = 16.5%. On a day a video pops and TikTok is 90%: 0.9×8 + 0.1×25 = 9.7%.
  That's a 41% "drop" with no product change. Viral spikes also skew young (under-18s need a
  parent for Screen Time; Opal saw students who can't pay annual prices, per the repo).
- **Day effects:** New Year resolution traffic (Jan 1–10) is a different population from
  February traffic. Any pre/post across that boundary is meaningless.
- **What to do:**
  - Randomize everything you want to learn from (A/B, not pre/post).
  - When pre/post is unavoidable (an App Store release that changes the whole flow), compare
    **within strata**: by `found` answer, `age_bracket`, and install day. Weight both periods to
    the same mix (direct standardization) and report the adjusted difference.
  - Bump `ONBOARDING_VERSION` (already a super property) and never pool versions.
  - **Source before the quiz:** `found` arrives at step 8, so early quitters have no source.
    Put an App Store Connect **campaign link** (`https://apps.apple.com/app/idXXXX?pt=…&ct=tiktok_vid23`)
    in every TikTok/IG/YouTube bio and pinned comment. App Analytics then reports product-page
    views → installs by `ct` (pre-install funnel only, aggregated). Post a "video log" (date,
    platform, `ct`) next to the PostHog data so spikes can be labelled.
  - Report results **per stratum** too: an effect can differ between TikTok and search users,
    and your future mix may not match the test period.

---

## 4. Proxy metrics that predict revenue early

| Proxy | Latency | Predicts | Strength of evidence | Fails when |
|---|---|---|---|---|
| Paywall view rate (installs reaching `plans`) | minutes | upper bound on trials | mechanical [O] | a test moves the paywall earlier (reach rises, quality falls) |
| Trial start per install | minutes | trial volume | mechanical | tests that change trial framing ($0.00 CTA, 14-day trial, hiding monthly) can raise starts and lower trial→paid |
| **Trial + auto-renew still on at 72h** | 3 days | trial→paid | strong, near-mechanical: trial→paid ≈ share with auto-renew on at expiry × billing success. 39.8% of 7-day-trial cancellations happen on day 0 (RC SOSA 2026) [B]. RC's trial chart labels auto-renew-off trials "Abandoned" (https://www.revenuecat.com/docs/dashboard-and-metrics/charts/trial-conversion-chart) | people who cancel day 0 "to be safe" but would have re-subscribed (rare: 95% of cancelling annual subscribers never return, RC 2026 via 9to5mac [B]) |
| Auto-renew off within 24h (inverse) | 1 day | trial regret, price shock, distrust | same | — |
| First proven morning in the trial (`morning_unlocked` with `morning_number` = 1 within 3 days) | 1–3 days | trial→paid, D30 retention | **hypothesis.** The Mojo-style activation proxy in the repo [S]. No public correlation figure found | — |
| D35 net revenue per install | 35 days | the outcome | it *is* the outcome | — |

**How strong are the correlations?** I found no published coefficient between trial start
and revenue across experiments. Treat it as unverified. Derived expectation [M/O]: if ~60%
of trials don't convert, and ~40% of those cancellations happen on day 0, then ~24% of trials
cancel on day 0. Expect a day-0 cancel rate of 20–25%. Above 35% means the paywall is
overselling, or the trial screen didn't make the charge date clear.

**Validate the proxy on your own data in month 2:** after the first ~300 trial starters, a
PostHog SQL query on per-person rows: `auto_renew_on_72h`, `first_morning_by_d3`, `converted`.
Report the conversion rate by each proxy's yes/no. If "first morning by D3" splits conversion
by 2× or more, it becomes the activation north star for the trial-week product work.

---

## 5. The exit-offer test: the one test already running, and how to read it

The code assigns `none` / `half-price` / `longer-trial` uniformly at install (`pickExitArm`,
App Group), and tags RevenueCat with `exit_arm`. Good. Problems:

1. **Resolved vs assigned arm.** `paywall_viewed.exit_arm` comes from `exitArm` in
   onboarding-flow.tsx, which is `'none'` when `offers` is null (prices not loaded yet), when
   `offerShownBefore`, or (via `resolveExitArm`) when a `longer-trial` person isn't
   trial-eligible. Grouping by it puts prior trialers and slow-network users into "none". That's
   **selection bias** that favors none's comparison groups unpredictably. The PostHog side has
   no assigned arm at all.
   **Fix:** at startup, `registerProperties({ exit_arm_assigned: assignedArm })`. That needs a
   `getAssignedExitArm()` exported from the provider (revenuecat.ts already computes it). Keep
   `exit_arm` in `paywall_viewed` as `exit_arm_shown` for diagnostics.
2. **No trigger event in the `none` arm.** In `none`, closing `plans` calls `exit()` →
   `onboarding_exited`. In the other arms it calls `go('declined')` → `paywall_viewed` with
   page `declined`. **Fix:** fire `paywall_closed { page, exit_arm_assigned, offer_will_show }`
   in `leave` *before* branching, in all arms. This is the counterfactual logging Kohavi
   recommends for triggered analysis.
3. **Triggered analysis math** [M]: suppose 40% of installs reach `plans` and 80% of those
   close it. That's 32% of installs, or ~640 closers/month at 2k installs. Among closers the
   comparison is ~1% (none: someone who later restarts) vs maybe 5–15% (offer accepted).
   Detecting 1% vs 6% needs ~260 closers per arm, so ~1.2 months at 2k/month with 3 arms, a
   few days at 20k. **Trial starts per closer resolve fast. Net revenue per closer is the hard
   part**, since half-price halves revenue per converter and the 14-day trial may refund more.
   Read D35 net revenue per closer by arm, with the Bayesian rule.
4. **Three arms at 2k/month is too many for the revenue question.** Recommendation: if traffic
   is below 5k/month after launch week, drop to two arms. Use `metadataArm` to turn one off
   without an app update (the code already supports this via the offering metadata). Which
   two? Keep `longer-trial` vs `none` first. Half-price is irreversible in a TikTok
   "hack" sense (open question 3 in APPLIED). The longer trial costs nothing if it doesn't
   convert.
5. **Contamination risks:** reinstalling deletes the App Group, so a person can be re-randomized
   and see the offer again; RevenueCat creates a new anonymous customer too. Watch for
   `found` = "a friend" spikes with `declined` conversions. Optional: also cap by
   `checkTrialOrIntroductoryPriceEligibility` (already effectively done for `longer-trial`).
6. **Interaction with RevenueCat Experiments:** the code lets `exit_arm` in the *current
   offering's metadata* override everyone's arm. If you later run an RC Experiment whose
   variant offerings have **different** metadata (one with `exit_arm`, one without), the exit
   arm becomes confounded with the experiment arm. **Rule:** copy identical `exit_arm` metadata
   into every experiment variant's offering.

---

## 6. Tooling: what to use for what

| Job | Tool | Why | Cost at Locturne's scale |
|---|---|---|---|
| Event funnel, step drop-off, retention, dashboards, alerts | **PostHog** (already integrated) | events defined, super properties for `found`/`method` | free to 1M events/month. At ~50 events per install, 20k installs/month ≈ 1M events from onboarding alone, so expect a small bill at the top scenario (PostHog pricing: https://posthog.com/pricing, check current per-event rate) |
| Pre-paywall onboarding tests (copy, order, length, reveal line) | **Local randomization** (like `pickExitArm`) + PostHog super property + PostHog Experiments with a custom exposure event, or plain funnels broken down by the arm | PostHog flags arrive asynchronously. On the first launch they're missing when `hello` renders unless you bootstrap, and bootstrapping needs a server that precomputes flags (https://posthog.com/docs/feature-flags/bootstrapping-and-local-evaluation). Local assignment is offline, instant, and needs no backend | free |
| Price, trial length, plan mix, paywall copy | **RevenueCat Experiments** | Enrolls *new customers the moment they open the app for the first time* (intention-to-treat per install). Up to 4 variants. Revenue-based results (realized LTV per customer, kept updated for 400 days after stopping), Bayesian "chance to win" (https://www.revenuecat.com/docs/tools/experiments-v1/configuring-experiments-v1, https://www.revenuecat.com/docs/tools/experiments-v1/experiments-results-v1). Works with the custom paywall because the code reads `offerings.current`. Variant offerings can carry **metadata** (e.g. `{ "cta": "Try for $0.00", "headline": "…" }`), so copy tests need no app update | Experiments and Targeting are on the Pro tier, free to $2.5k MTR, then 1% of MTR (https://www.revenuecat.com/blog/company/navigating-revenuecats-new-pricing-for-existing-users). **Verify** the current plan names on the pricing page |
| Audience-specific offerings (e.g. teens, a country) | **RevenueCat Targeting** | Rules by country, app version, platform and **custom attributes** (`found` is already set as an attribute in setup.ts), plus placements (https://www.revenuecat.com/docs/tools/targeting) | Pro tier |
| Cancellation reasons | **RevenueCat Customer Center** (react-native-purchases-ui ≥ 8.7) | Native UI (fits the native-controls rule). Built-in cancel survey ("Too expensive / Don't use the app / Bought by mistake", configurable). `onFeedbackSurveyCompleted` gives the option ID to send to PostHog. Docs say selections aren't posted to RC's backend from RN, so capture them yourself (https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native.md, https://revenuecat.com/docs/tools/customer-center/customer-center-configuration) | free |
| Superwall | **Skip for now** | Its value is no-code paywall iteration and built-in experiments. Locturne's paywall is custom RN tuned to reference screenshots. Switching means rebuilding it in Superwall's editor, plus a second source of truth beside RevenueCat. Free under $10k monthly attributed revenue (https://superwall.com/docs/support/faq/2801653905-how-does-superwalls-pricing-work) | free below $10k MAR |
| PostHog Surveys | Optional; better as native UI | Surveys are supported in RN, but its popup is a custom RN sheet, which the native-controls rule rejects. Build the one-question exit survey as a native action sheet/menu (`@expo/ui`) and `track()` the answer | 1,500 responses/month free (https://posthog.com/surveys/pricing) |

**Wiring RevenueCat Experiments with the custom paywall:**
- Call `Purchases.trackCustomPaywallImpression()` when `plans` is shown. Without it, enrolled
  customers count as not having seen a paywall and are excluded from the "Exposed" view (RC
  configuring docs). **Check the installed `react-native-purchases` version supports it**
  (unverified).
- Read the primary analysis on **all enrolled** customers (intention-to-treat), not just
  "Exposed", unless the variants are identical before the paywall. For a paywall-only test,
  "Exposed" is fine and more sensitive.
- Put `paywall_variant` (the offering identifier) into `paywall_viewed` and `purchase_result`,
  so PostHog funnels can split by the RC variant too.

**Exposure: at assignment or at view?**
- **Assignment** (install) gives an unbiased intention-to-treat estimate. Effects get diluted
  by people who never reach the changed screen, but it's always valid.
- **Exposure at the divergence point** (first screen where the arms differ) is more sensitive,
  but only valid if (a) the exposure event fires in **every** arm, including control, at the
  same moment, and (b) nothing before it differs between arms. Example: for a paywall-position
  test (paywall after `tomorrow` vs after `commit`) the arms diverge at `tomorrow`'s exit, so
  exposure = "left `tomorrow`" in both arms. *Not* `paywall_viewed`, whose rate the test
  itself changes.
- With PostHog flags, `$feature_flag_called` fires when the code reads the flag. Read it at
  the divergence screen, never at app start, or everyone counts as exposed.

**Sample ratio mismatch (SRM) checks.** Fabijan et al., "Diagnosing Sample Ratio Mismatch in
Online Controlled Experiments", KDD 2019 (https://dl.acm.org/doi/10.1145/3292500.3330722):
about 6% of Microsoft's experiments had SRM, nearly always a bug. Procedure:
- Daily chi-square on **assigned** counts per arm (PostHog: unique persons with
  `exit_arm_assigned` = X, first seen in the window). Expected 1/3 each. **Alarm at
  p < 0.001.**
- Also check SRM on the exposure event at the divergence point. A mismatch there, with none at
  assignment, means the arms lose people differently *before* divergence. That's a bug.
- Calculator: https://www.gigacalculator.com/calculators/sample-ratio-mismatch-calculator.php
- **Run an A/A first:** in the first week, also assign a dummy `aa_arm` (A1/A2) at install and
  compare funnels. It verifies randomization, SRM tooling, and analysis queries for free.

---

## 7. Qualitative methods for pre-launch and low traffic

The highest-value research before January. Nielsen: 5 users find most usability problems.
Run 3 rounds of 5 and fix between rounds, rather than one study of 15
(https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/). Results vary by
study: some 5-user rounds caught only ~55% of the issues
(https://www.nngroup.com/articles/5-test-users-qual-quant/).

### 7.1 Who to recruit

- **Your TikTok audience** is the actual target. Post a "testing my app, 10 people, 15 minutes"
  video or story. Screen with 3 questions in a Google Form: age (18+ only for sessions), "Do you
  use your phone in bed most nights?", iPhone yes/no. Pay $10–15 gift cards, or lifetime access
  after launch. Lifetime is cheaper but biases answers toward kindness.
- **Classmates and friends:** good for usability rounds, bad for "would you pay" questions.
- Avoid people who know the app's story. They already understand the deal.

### 7.2 Round 1–2: moderated think-aloud on the web preview (Oct–Nov)

Web preview = `expo export` build. Analytics are **off on web** today (`Platform.OS === 'web'`
returns early in analytics-start.ts). For unmoderated web tests, consider a separate PostHog
project key used only on web with `app_env = 'web_preview'`, so step drop-off from testers is
measured without mixing into production.

**Script (15 min, Zoom or in person, screen shared from their phone browser):**
1. "I'm testing the app, not you. Please think out loud: what you see, what you expect, what
   confuses you."
2. Hand them the link. Don't explain the product.
3. Probes, only when they stall: "What do you think happens if you tap that?" "What are you
   looking for?"
4. At `reveal`: "What does this number mean to you? Is it believable?" (watch for
   disbelief vs a gut punch)
5. At `tomorrow`: "In your own words, what happens tomorrow morning?" (the core
   comprehension check: apps locked until they walk or go downstairs)
6. At `offer` and `plans`: "What will you pay today? When does that change? How do you stop
   it?" Wrong answers here are **trial anxiety**. Fix before launch.
7. After: "If a friend asked what this app does, what would you say?" "Which screen felt
   longest?" "Was there a moment you almost quit?" "What would make you not start the trial?"
8. Rate: "How likely would you be to start the free week, 0–10?" Treat it as directional only.

**Log per session:** the screen of every hesitation > 5 s, every misunderstanding, the verbatim
summary of the product. Fix anything 2+ of 5 people hit.

### 7.3 5-second and first-click tests (Lyssna free plan)

Lyssna's free plan includes 5-second, preference and first-click tests, with 15
self-recruited responses viewable (https://pricingsaas.com/companies/lyssna, secondary source;
verify). Maze has a limited free tier (https://blog.uxtweak.com/maze-pricing/).
- **`plans` screenshot, 5 seconds, then:** "How much would you pay today?" (target ≥ 80%
  "nothing/$0"). "What happens after 7 days?" (target ≥ 70% mention $59.99/year). "What was
  the main button?" "What's this app for?"
- **`offer` timeline, 5 seconds:** "When would you be charged?" "Would you get a reminder?"
- **Preference test:** current `plans` vs a version with "$0.00 due today" larger. Ask
  "Which feels more trustworthy, and why?" The *why* is the useful part.
- **First-click on `plans`:** where do they tap to *not* pay? (The close button must be
  findable, App Review 3.1.2, and findable closes feed the exit offer.)

### 7.4 TestFlight (Nov–Dec)

- External testing allows up to 10,000 testers. Testers send screenshot feedback from the
  TestFlight app. In the "What to Test" notes, ask for exactly 2 things per build: e.g. "Do
  the onboarding cold. Screenshot any screen where you hesitated." / "Tomorrow morning, did
  your apps stay asleep until you got up?"
- TestFlight purchases are sandbox and never charge, so **no money metric is measurable**.
  Use TestFlight for activation: did the first night arm, and did the first morning unlock
  (`night_checked`, `morning_unlocked`)?
- After the 3rd morning, a 3-question form (link via push): "What almost made you turn it
  off?" "Which wake-up method did you use, and was it annoying or fine?" "What would you tell
  a friend?"

### 7.5 PostHog session replay (React Native)

- It's off today because screens show picked app names. Options, in order of safety:
  1. **Keep it off.** Rely on step events plus qualitative sessions. My recommendation until
     ~5k installs/month.
  2. Turn it on **only for onboarding steps before `screen-time`** (`hello` … `tomorrow`) with
     sampling (e.g. 20%), and stop it at `screen-time`. PostHog masks all text inputs and
     images by default, and `PostHogMaskView` masks explicit regions
     (https://posthog.com/docs/session-replay/privacy,
     https://posthog.com/docs/session-replay/installation/react-native). Whether the RN SDK
     exposes start/stop for recording mid-session is **unverified**; check before relying on
     it. Apple's `FamilyActivityPicker` and shield run out of process, but don't assume they
     aren't captured.
  3. Either way, update privacy.html and the App Privacy label ("Product interaction"), and
     never record under-13 (already opted out).

### 7.6 Micro-surveys that run inside the app (post-launch, low traffic)

Native UI only (an `@expo/ui` menu or a plain list screen), one question, skippable, and
`track()` the answer. The privacy policy must mention surveys (ANALYTICS.md already flags
this).

**A. On `declined`, or on the second close (people leaving at the paywall):**
Loc: *"Before you go. What was it? One tap. I won't cry."*
- "Too expensive"
- "Not sure it'd work on me"
- "Don't want to give Screen Time access"
- "Just looking for now"
- "I'll start it later"
- "Something else"

Event: `paywall_exit_reason { reason, page, exit_arm_assigned }`. At ~600 closers a month
with ~20% answering, that's ~120 answers a month. Enough to rank the reasons. Weight it above
anything else in the first two months: if "Not sure it'd work" leads, invest in `tomorrow`
and proof. If "Too expensive" leads, prioritize the price test.

**B. Trial cancel (auto-renew off during trial):** iOS doesn't let you interrupt cancellation
in Settings. Only cancellations started *from the app* (You tab → Manage subscription) can show
a survey first. Route that button through **RevenueCat Customer Center** so its native
feedback survey runs first. Customize the options:
- "Too expensive"
- "It didn't wake me up / I cheated"
- "Too strict / annoying"
- "I don't need it anymore"
- "Bug / it didn't lock"
- "Bought by mistake"

**C. Day-3 activation check (push after the 3rd proven morning):** *"Three mornings. Honestly,
how's it going?"* Options: "Working" / "Working, but annoying" / "I keep using passes" / "It
didn't lock".

**D. Why didn't you start the trial? (re-engagement):** someone who closed the paywall and
reopens the app later. On the next open, show once: *"You left at the price. Was it the
price?"* "Yes" / "No, something else" / "Leave me alone". Only if they opted into
notifications; otherwise it's just on open.

---

## 8. Analytics audit: gaps in the current events

What exists is solid: per-step views with `ms_on_previous`, answers as super properties,
paywall views with price-load state, purchase start and result, a version super property,
RC→PostHog linking via `$posthogUserId`, and strict privacy rules. Gaps, by priority:

| # | Gap | Why it matters | Proposed event / property (add to `Events` in analytics.ts) |
|---|---|---|---|
| 1 | **Assigned exit arm not in PostHog**; `paywall_viewed.exit_arm` is the resolved arm | biased arm comparison; no SRM check; no intention-to-treat | super property `exit_arm_assigned` registered at startup; rename the existing one to `exit_arm_shown` (or keep it and add a reason) |
| 2 | **No `paywall_closed` in the `none` arm** | triggered analysis impossible | `paywall_closed: { page: string; exit_arm_assigned: string; offer_will_show: boolean }`, fired in `leave` before branching |
| 3 | **Back taps not tracked** (`wentBack` is set but never sent) | back-taps flag confusing screens and re-reading of the reveal | `onboarding_back: { from_step: string; to_step: string }` |
| 4 | **Backgrounding not tracked; `ms_on_previous` includes background time** | most abandonment is app-switching, not the close button. Time-on-step outliers are polluted | `onboarding_backgrounded: { step: string; ms_on_step: number }`, plus `ms_foreground` next to `ms_on_previous` |
| 5 | **Time to first screen** | slow cold start on old iPhones kills step 1 | `onboarding_started.ms_since_launch` (JS start timestamp → first `hello` frame) |
| 6 | **Prices-load latency and eligibility** | `prices_loaded: false` at `plans` means a broken paywall; there's no ms and no "loaded later" | `offers_loaded: { ms: number; trial_eligible: boolean; currency: string }`. `offers_failed` gets `ms`, and `retry` gets an event |
| 7 | **Plan toggles** | how many people inspect Monthly and come back; whether Monthly steals trials | `plan_selected: { plan: 'annual' \| 'monthly'; page: string }` |
| 8 | **Reminder toggle state** | does turning it off predict cancelling? (test 7 in the roadmap needs it) | add `remind_trial: boolean` to `purchase_started`/`purchase_result`, or `trial_reminder_set: { on: boolean }` at purchase |
| 9 | **Hold-to-agree detail** | partial holds released early = hesitation at `commit` | `commit_hold: { completed: boolean; attempts: number; ms_to_complete: number \| null }` |
| 10 | **Tomorrow-demo completion** | did they watch the 6-second demo or skip past it? It's the core comprehension screen | `demo_finished: { watched_ms: number; completed: boolean; replays: number }` |
| 11 | **Purchase latency** | Apple sheet + Face ID failures | `ms` on `purchase_result` |
| 12 | **RevenueCat paywall impression** | RC Experiments' "Exposed" view excludes everyone without it | `Purchases.trackCustomPaywallImpression()` on `plans` |
| 13 | **Offering/variant id** | joining RC Experiments to PostHog funnels | `paywall_variant` (offering identifier + metadata hash) on `paywall_viewed`, `purchase_*` |
| 14 | **Exit-reason survey, cancel survey** | qualitative "why" at scale | `paywall_exit_reason`, `cancel_reason`, `checkin_answer` (§7.6) |
| 15 | **Screen Time denial retries** | how many retry after denying | `attempt` on `screen_time_access` |
| 16 | **Reveal share** | brief mentions a share button; **no share code found** in src/features/onboarding. If built, it's the viral loop's only in-app signal | `reveal_shared: { completed: boolean; activity: string \| null }` |
| 17 | **Pre-install source** | `found` only exists from step 8 | not an event: App Store `ct` campaign links + a dated video log |
| 18 | **Web preview analytics off** | unmoderated web tests produce no data | optional separate key on web, `app_env='web_preview'` |
| 19 | **Experiment registry** | `ONBOARDING_VERSION` is bumped by hand; experiments will multiply | one `experiments` super property map (`exp_<name>: arm`) set at assignment, plus `experiment_assigned: { name, arm }` once per install |

Notes:
- The **age step's drop-off includes under-13s**, who disappear silently (`stopForChild` sends
  nothing, by design). Expect an apparent drop at `age` that isn't abandonment. Don't
  "optimize" it.
- `exit_arm` on RevenueCat is set at provider creation for every install. Good: RC can do the
  SRM check even before PostHog is fixed.
- Confirm the RC→PostHog event names (`rc_trial_converted_event`, `rc_cancellation_event`, …)
  and whether refunds arrive as a cancellation with a reason or as their own event, before
  building the D35 RPI insight.

---

## 9. The funnel dashboard to build (and alarms)

Extends ANALYTICS.md's 8 views. Filter internal users. Always break down by
`onboarding_version`.

**1. Step funnel with drop-off per step** (ordered by `step_index`; strict order off, because
of edits and back-taps). Columns: entrants, % lost at this step, median and p75 of
`ms_foreground`, back-tap rate, background rate.

**2. The same funnel broken down by `onboarding_found`, `onboarding_age_bracket`, and (after
`method`) `onboarding_method`.** Steps before `found` can't be split by it. Use install day
plus the video log instead.

**3. Time-on-step outliers:** median `ms_foreground` per step vs a reading-time budget (word
count ÷ 4 words/s + 1.5 s per tap). Flag steps where p75 is above 3× budget (confusion) or the
median is below 0.5× budget (skimmed: the screen may be useless).

**4. Paywall block:** reach (`plans` / installs), `prices_loaded=false` share, `plan_selected`
monthly share, `purchase_started`/`plans` views, Apple sheet cancel rate
(`purchase_result=cancelled` / started), success rate, trials per install, then
`paywall_closed` → exit-offer accept by assigned arm.

**5. Trial quality:** day-0 auto-renew-off rate, 72h auto-renew-on rate per install, first
morning by D3, D35 RPI by `found` and arm.

**6. Health:** SRM p-value per running experiment; `offers_failed` rate; `$exception` per
1,000 onboarding starts; `night_checked` missed + noShield.

### What "good" looks like, and alarm thresholds

There are no trustworthy published per-screen drop-off benchmarks for long in-app quiz
onboardings. What's out there is SaaS product-tour data (e.g. "tours of 9+ steps complete at
8%") or web2app funnels with paid traffic. Neither fits a 28-step in-app quiz after an
intentional install [B, weak]. So use **your own baseline** from the first 2 weeks, and these
starting thresholds [O]:

| Metric | Healthy starting expectation | Alarm |
|---|---|---|
| Single-tap quiz step loss (`nights` … `time-back`) | ≤ 2–4% each | > 5%, or 2× its own 7-day median |
| `hello` → `deal` loss | ≤ 10% | > 15% (the first screen gets the curious and the misclicks) |
| `math`/`reveal`, `tomorrow` | ≤ 5% | > 8% |
| `screen-time` (Apple prompt) grant | ≥ 85% of those who see it | < 80% |
| `apps` picked ≥ 1 | ≥ 95% | < 90% |
| Installs reaching `plans` | ≥ 40% | < 30% |
| `plans` → trial | 25–40% for a hard paywall after a long investment flow [O, from Opal's 17% of installs ÷ reach] | < 15% |
| Prices not loaded at `plans` | < 1% | > 2% |
| Apple sheet cancel after tapping CTA | unknown, measure | > 40% (Face ID or price surprise) |
| Day-0 auto-renew off (share of trials) | 20–25% [M, derived] | > 35% |
| Refunds within 14 d of first charge | measure | > 5% of charges, or any spike |
| SRM | p > 0.001 | p < 0.001: stop and debug |

PostHog alerts can be set on trends insights; set them on the alarm rows.

---

## 10. Ship without testing vs test

**Just ship (judgment, external evidence, or pure fixes)** [O, Kohavi-consistent: test where
you're uncertain *and* it's worth the cost]:
- Anything qualitative testing shows people misunderstand (charge date, what "downstairs" means).
- Bugs, crashes, prices loading too late, cold-start speed, accessibility, Apple compliance.
- Changes backed by strong, multi-app A/B evidence with low downside: the trial timeline on
  `offer`, "No payment due now" under the CTA, the reminder toggle, annual pre-selected. All
  already in the repo's research.
- Instrumentation (§8).
- Copy polish inside Loc's voice that doesn't change the offer.

**Test (uncertain, high variance, or expensive to get wrong):**
- Paywall position (after `tomorrow` vs after `commit`): GAME_PLAN's investment-first order vs Opal's lever.
- Price ($39.99 vs $59.99) and trial vs no trial on annual: irreversible-feeling, revenue-defining.
- Exit offer (already built).
- Quiz length: drop 4 questions (`alarm`, `tried` + `tried-echo`, `time-back`) vs full. Evidence
  on long vs short quiz flows is contested and app-specific. Long flows win for some (Opal),
  lose for others.
- The reveal's "N years of your life" line: brand risk (no-guilt voice) vs loss framing.

---

## 11. Experimentation calendar: now → launch (Jan 2–5, 2027) → month 6

Scenarios: **Low** 2k installs/month, **Mid** ~5–10k, **High** 20k. Launch month is likely 2–4×
a normal month (New Year + launch videos).

### Pre-launch (Oct 3 – Dec 31)
| When | Do |
|---|---|
| Oct (now) | Add the §8 events #1–#13 and the `experiments` registry; `trackCustomPaywallImpression`; `exit_arm_assigned` super property; `paywall_closed` in all arms. Build the §9 dashboard against TestFlight data. |
| Oct–Nov | Qual round 1 (5 people, web preview) → fix → round 2 (5, TestFlight) → fix. Lyssna 5-second tests on `offer` and `plans` (15 responses each). |
| Nov | Customer Center wired to "Manage subscription" with custom cancel reasons; the `declined` exit-reason question; privacy policy updated for surveys. |
| Dec | Qual round 3 (5 fresh people from the TikTok audience, on TestFlight overnight: night 1 + morning 1). A/A check of assignment in TestFlight (SRM machinery). Decide the launch test (below). Create the RC Experiment variants now (offerings + identical `exit_arm` metadata) so launch day needs no build. |

### Launch window (Jan 2 – Jan 31)
- **Ship the best-judgment version.** It's the baseline. Don't launch with a half-tested idea.
- **One randomized test only,** picked for the spike:
  - **Low/Mid:** exit offer in **two arms** (`none` vs `longer-trial`), read on the triggered
    population (closers). Fast-proxy decision by ~week 3, D35 revenue confirmation by early
    March. Also run the A/A dummy arm on assignment for SRM confidence.
  - **High (20k+ in January):** also run **paywall position** via local assignment as a
    second, orthogonal randomization. Independent assignments, different surfaces.
    Interactions are rare (Kohavi), but check the 2×2 cells.
- Daily: SRM, `offers_failed`, the day-0 cancel rate, refunds, and 1-star reviews mentioning
  billing. Watch the `paywall_exit_reason` mix.

### Months 2–3 (Feb–Mar)
| Scenario | Test | Decision metric | Expected time |
|---|---|---|---|
| Low (2k) | Paywall position (local assignment) | trials with auto-renew on at 72h per install; only effects ≥ 30% will show | ~5–8 weeks + confirmation via holdback |
| Mid (5–10k) | Paywall position, then price $39.99 vs $59.99 (RC Experiments) | same; price must confirm on D35 RPI | 2–4 weeks each + 5 weeks confirmation |
| High (20k) | Price (RC Exp.) ∥ quiz length (local) | D35 RPI for price; trials+72h for quiz length | ~3–4 weeks each, running in parallel |

Also in month 2: validate the proxies (§4) on the first ~300 trials, and run the month-1 RPI
read by `found` (which video angles bring payers).

### Months 4–6 (Apr–Jun)
| Scenario | Test |
|---|---|
| Low | Trial vs no trial on annual **only if** the exit reasons say "not sure it'd work" is low; otherwise improve `tomorrow`/proof qualitatively. Re-run qual round 4 with real users who cancelled. |
| Mid | Trial vs no trial; CTA copy via RC offering metadata ("Start 7-day free trial" vs "Try for $0.00"); reminder day. |
| High | Above, plus the reveal lifetime line; a 10% holdout on the day-3 check-in push; start bandit-free headline tests on `hello` (reward = reach `reveal`). |

**Retention holdouts** (push types, recap): only from Mid traffic up, 10% holdout, read at 3
and 6 months (consistent with the repo's Duolingo note).

---

## 12. Concrete next actions for the code (no edits made)

1. `revenuecat.ts`: expose `assignedExitArm()` on the provider (or in purchases.ts) so
   analytics-start.ts can `registerProperties({ exit_arm_assigned })` at startup.
2. `onboarding-flow.tsx` `leave`: `track('paywall_closed', …)` before branching.
3. `onboarding-flow.tsx` `back`: `track('onboarding_back', { from_step, to_step })`.
4. AppState listener inside the flow: `onboarding_backgrounded`, and subtract background time
   from `ms_on_previous` (new `ms_foreground`).
5. `fetchOffers`: time it and `track('offers_loaded', { ms, trial_eligible, currency })`.
6. paywall.tsx: `plan_selected` on toggle; pass `remind_trial` into `purchase_*`.
7. Commit hold button and tomorrow demo: `commit_hold`, `demo_finished`.
8. `Purchases.trackCustomPaywallImpression()` on `plans` (check the SDK version).
9. A small `experiments.ts` (pure, tested like `pickExitArm`): `assign(name, arms, random)` →
   App Group persisted, registered as `exp_<name>`, `experiment_assigned` once.
10. Update docs/ANALYTICS.md and docs/sub-club/APPLIED_TO_LOCTURNE.md's sample sizes
    (4k → 8k/arm for a 20% revenue read) when the founder approves.

---

## Sources

- Kohavi, Tang, Xu. *Trustworthy Online Controlled Experiments*, Cambridge UP 2020, ch. 3 Twyman's law: https://www.cambridge.org/core/books/trustworthy-online-controlled-experiments/twymans-law-and-experimentation-trustworthiness/886425EC1B92BD23A0DC5E6817785190
- Kohavi on Lenny's Podcast (notes): https://podpulse.ai/podcast-notes-and-takeaways/lennys-podcast-product-growth-career-the-ultimate-guide-to-ab-testing-ronny-kohavi-airbnb-microsoft-amazon
- Deng, Xu, Kohavi, Walker 2013, CUPED: https://exp-platform.com/cuped/
- Eppo CUPED docs: https://docs.geteppo.com/statistics/cuped/
- Statsig variance reduction: https://docs.statsig.com/stats-engine/variance_reduction ; sequential testing: https://statsig.com/blog/sequential-testing-on-statsig
- Johari, Pekelis, Walsh, Always Valid Inference: https://arxiv.org/abs/1512.04922
- Evan Miller: https://www.evanmiller.org/how-not-to-run-an-ab-test.html ; https://evanmiller.org/sequential-ab-testing.html ; https://evanmiller.org/ab-testing/sample-size.html
- Stucchio, Bayesian decision rule: https://www.chrisstucchio.com/blog/2014/bayesian_ab_decision_rule.html ; VWO whitepaper: https://www.chrisstucchio.com/pubs/VWO_SmartStats_technical_whitepaper.pdf
- GrowthBook statistics: https://docs.growthbook.io/statistics/details
- Fabijan et al. KDD 2019, SRM: https://dl.acm.org/doi/10.1145/3292500.3330722 ; overview: https://en.wikipedia.org/wiki/Sample_ratio_mismatch
- Bandits and delayed reward: https://engineering.ezcater.com/multi-armed-bandit-experimentation ; https://ar5iv.arxiv.org/html/2202.00846 ; https://proceedings.mlr.press/v244/gigli24a.html ; VWO on Simpson's paradox: https://help.vwo.com/hc/en-us/articles/900005577303
- RevenueCat Experiments: https://www.revenuecat.com/docs/tools/experiments-v1 ; configuring: https://www.revenuecat.com/docs/tools/experiments-v1/configuring-experiments-v1 ; results: https://www.revenuecat.com/docs/tools/experiments-v1/experiments-results-v1
- RevenueCat Targeting: https://www.revenuecat.com/docs/tools/targeting
- RevenueCat Customer Center: https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native.md ; https://revenuecat.com/docs/tools/customer-center/customer-center-configuration
- RevenueCat trial conversion chart: https://www.revenuecat.com/docs/dashboard-and-metrics/charts/trial-conversion-chart
- RevenueCat SOSA 2026 benchmarks: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 ; trial cancellations: https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app.md ; https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/
- RevenueCat pricing: https://www.revenuecat.com/blog/company/navigating-revenuecats-new-pricing-for-existing-users
- PostHog: experiments RN: https://posthog.com/docs/experiments/installation/react-native ; bootstrapping: https://posthog.com/docs/feature-flags/bootstrapping-and-local-evaluation ; flag costs: https://posthog.com/docs/feature-flags/cutting-costs ; surveys pricing: https://posthog.com/surveys/pricing ; replay privacy: https://posthog.com/docs/session-replay/privacy ; RN replay: https://posthog.com/docs/session-replay/installation/react-native
- Superwall pricing: https://superwall.com/docs/support/faq/2801653905-how-does-superwalls-pricing-work
- NN/g: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ ; https://www.nngroup.com/articles/5-test-users-qual-quant/
- Lyssna pricing (secondary): https://pricingsaas.com/companies/lyssna ; Maze pricing (secondary): https://blog.uxtweak.com/maze-pricing/
- FunnelFox web2app benchmarks: https://blog.funnelfox.com/onboarding-funnel-optimization/
- SRM calculator: https://www.gigacalculator.com/calculators/sample-ratio-mismatch-calculator.php
