# 03 · Retention, LTV and pricing: the treadmill side of $10K MRR

Researched 2026-10-08. One angle of "how does Locturne reach $10K MRR, and where is
a real edge?" This doc is about **keeping and pricing** subscribers, not getting
installs. It builds on, and does not repeat, `docs/10K_MRR_PLAN.md` (sections 2 and
5), `docs/PRICING_RESEARCH.md` (weekly plans) and `docs/sub-club/APPLIED_TO_LOCTURNE.md`
(paywall and cancel-flow tests).

The model is in [`03_mrr_model.csv`](03_mrr_model.csv) (13 scenarios × 36 months,
long format, one row per scenario-month).

**Evidence tags**
- **[V]** verified: I read the number at the primary source (paper, company filing,
  the vendor's own report page).
- **[S]** secondary or single source: a vendor blog, press write-up, founder
  self-report or podcast summary. Probably right in direction, not exact.
- **[U]** unverified or my own assumption/inference. Treat as a guess.

---

## TL;DR

1. **Renewal does not decide month-12 MRR. Install volume and conversion do.** An
   annual plan bought in month 2 counts toward MRR until month 14, whether or not
   the user has already switched off auto-renew. In the model, moving annual renewal
   from 25% to 40% changes the installs needed for $10K at month 12 by **zero**.
   Renewal decides what happens **after** month 12 (section 4).
2. **The cliff is real.** If installs stopped the day you hit $10K at month 12, MRR
   falls to about **$6.7K by month 18 and $2.4K by month 24** at 25% renewal. At 40%
   renewal it falls to $3.5K. Renewal is a year-two problem that you start solving
   in year one.
3. **To hold $10K forever** you need about **2,000 installs a month at 25% renewal,
   1,650 at 40%**. That's an 18% cut, worth having but not a substitute for
   distribution.
4. **Nobody publishes renewal for blockers or alarm apps.** The closest public
   numbers: Health & Fitness annual first renewal median **25%** (16–37% IQR) [V];
   high-priced apps renew worse (**23%** vs 36% for cheap ones) [V]; annual plans
   with **10–16 day trials renew at 36%, 5–9 day trials at 25%** [V, correlational].
   Sleep Cycle, the one public sleep subscription company, **lost 16% of its paying
   subscribers in 2025** (918k → 768k) [V].
5. **The blocker-specific churn threat is "graduation".** People buy a blocker to fix a
   habit. If it works, they feel they don't need it. If it doesn't, they quit in
   disgust. Locturne's edge is that **getting up in the morning never ends**. Frame
   and build it like an alarm clock (a permanent tool), not a course (something you
   finish).
6. **Pricing: keep the structure; change three things.** Keep $59.99/yr with a trial as the
   default and $9.99/mo. Test a **14-day trial**. Move lifetime to **$129.99–149.99**
   behind "Other plans" (at 25% renewal an annual buyer is worth about $102 gross,
   so $99.99 lifetime is roughly break-even, and it is cash now). Set lower prices in
   a few low-income countries after launch. **No weekly, no pay-what-you-want, no
   discount-led intro offer.**
7. **Biggest MRR levers, in order:** install volume, then paywall conversion
   (4% → 10% conversion cuts the needed installs by 60%), then trial length/renewal,
   then everything else (section 5).

---

## 1. Renewal and churn benchmarks

### 1a. Category benchmarks (RevenueCat, Adapty, 2025–2026)

| Metric | Value | Tag | Source |
|---|---|---|---|
| Health & Fitness **annual** first renewal, median (IQR) | **25%** (16–37%) | V | RevenueCat renewal benchmarks |
| Health & Fitness **monthly** first renewal | 57% (46–68%) | V | same |
| Health & Fitness **weekly** first renewal | 54% (39–64%) | V | same |
| Best categories, annual first renewal | Travel, Business 40% | V | same |
| Productivity / Photo annual first renewal | 23% | V | same |
| Annual year-one retention by **price tier** | low 36%, mid 26%, **high 23%** | V | same |
| Annual 2nd renewal / 3rd renewal (all categories) | 44–64% / 56–70% | S | 9to5mac summary of SOSA 2026 |
| Share of annual cancellations in **month 1** | 35% | S | same |
| Cancelled annual subs that ever come back | ~5% | S | same |
| Year-one retention all categories (SOSA 2025): annual / monthly / weekly | 44.1% / 17.0% / 3.4% | S | trends.vc citing RevenueCat SOSA 2025 |
| H&F share of revenue on annual plans | 51% (2023) → 61% (2025), the only category where annual share is still growing | V | Adapty H&F benchmarks |
| H&F median 12-month LTV per install | $1.21 (highest category); North America ≈ 2× global | V | Adapty |
| High-priced vs low-priced annual: 1-year LTV | $70 vs $17 | V | Adapty |
| Hard vs soft paywall LTV | hard +21% | S | Adapty (vendor) |
| Median subscription refund rate; annual plans | 2.71%; **6–7.6%** on annual | S | Adapty refund guide |

**Trial length vs first renewal (RevenueCat, 17,000+ apps, Aug 2025–Jul 2026, published 2026-09-28) [V, correlational]**

| Trial length | Annual: trial→paid | Annual: 1st renewal | Monthly: 1st renewal |
|---|---|---|---|
| No trial | – | 26.6% | 49.5% |
| ≤4 days | 24% | 18.3% | 54.2% |
| **5–9 days (Locturne today)** | ~33% | **25.3%** | 62.8% |
| **10–16 days** | ~43% | **36.4%** | 72.0% |
| 17–32 days | 44.6% | 47.5% | 77.5% |

Read this carefully. Apps choose their own trial length, so better apps may just
pick longer trials. It is still the strongest public hint that a 14-day trial is
worth testing for an annual-first app. The H&F monthly breakout shows the same
pattern (51.5% → 77.1% renewal from shortest to longest trial) [V].

### 1b. Blocker, alarm and sleep apps (everything public I could find)

No blocker or alarm app publishes renewal or churn. Here is what exists.

| App | What's public | Tag | What it tells you |
|---|---|---|---|
| **Opal** | $99.99/yr, $19.99/mo, $399 lifetime; free tier with one rule; students up to 50% off | S | The category leader charges more than Locturne and sells lifetime. |
| Opal | CEO (Apr 2026 podcast): conversion was deliberately cut from **20% to 9%** by giving more away free; grew **$5M → $10M ARR**; retention called "the ultimate proof of value" | S | At Opal's scale, free-tier reach beat paywall conversion. That's for an app with paid ads and press, not a solo hard paywall. |
| Opal | Reviews: blocks leak (notifications still arrive), VPN fights hotspot, "yearly only" too pricey, bugs "fixed" that aren't | S | Reliability failures are a cancel reason in this category. |
| **ScreenZen** | Free for ~3 years; **~75k DAU earns "a few hundred bucks a month"** from a tip jar | S (developer blog, via search excerpt) | Pay-what-you-want and tips don't pay in this category. |
| **one sec** | Third-party estimate ~$150K/month; soft paywall; founder said revenue "doubled every month" after Instagram ads | U / S | Paid ads aimed at heavy social users work. Revenue is an estimate. |
| **Brick** | $59 one-time hardware, "no subscriptions ever" | V | The category's loudest rival markets *against* subscriptions. Expect "why pay yearly?" comments. |
| **Freedom** | $29/yr for years | S | The low-price anchor in the category. |
| **Erly** (push-up alarm) | ~$50K/month by month 4 from creator videos, $29.99/yr / $9.99/mo | S (founder via case study; download numbers conflict) | Closest proven comp. Its annual is **half** Locturne's. |
| **Alarmy** | ~$11M (2021) → ~$22M (2024) revenue, mostly **ads**, subscription as an add-on, $4.99+ | S | The biggest wake-up app is not a subscription business. |
| **Sleep Cycle** (listed company) | Paying subs **918k → 768k** in 2025 (−16%); ARPU SEK 277/yr (~$27); sales −5.2% | V | Even a 15-year-old brand shrinks when new sales slow. This is the treadmill in a public filing. |

**Bottom line:** assume the H&F median (25% annual first renewal) for planning.
Locturne's high price (top tier) pushes the expectation down toward 23%. A daily
morning ritual pushes it up. Nothing public lets you claim better than 25% until
you have your own data. The first real renewal read comes in **January 2028**
(year-one buyers from January 2027).

---

## 2. Why people cancel blockers, and what raises renewal

### 2a. Cancel reasons

**General (Google Play cancellation survey, via RevenueCat) [S]**

| Reason | Share of cancels |
|---|---|
| Not using it enough | 37% |
| Cost | 35% |
| Other | 12% |
| Found a better app | 10% |
| Technical problems | 7% |
| Billing failure (involuntary, separate measure) | 15% of App Store churn, 28% of Google Play |

**Blocker-specific themes** (review mining via aggregators and forums; no clean counts exist)

| Theme | Evidence | Tag | Locturne risk |
|---|---|---|---|
| **Price vs free iOS Screen Time** | Unstar's analysis of 1–3★ reviews of Opal, Forest, Freedom, one sec, Jomo: "subscription surprise / trial-to-charge" is the biggest bucket at **24%**; Opal draws the most price anger at $99.99 | S (method not published) | High. $59.99 is premium. The renewal charge is the moment users ask "is this worth it vs Screen Time?" |
| **Bypass / it stopped working** | Users defeat blockers by deleting the app, changing a setting, restarting, or tapping "ignore". Opal reviews report leaks and notifications getting through | S | Medium. Locturne's guardrails help. Any leak a user discovers is also a reason to stop paying. |
| **Too strict → rage-quit** | "Easy-to-escape apps don't change behaviour; the strictest get rage-quit" (Unstar); "an aggressive blocker lasts about three days before you delete it" (Habi) | S | High on bad mornings (sick days, travel, early flights). |
| **The effect wears off** | Reviewers say one sec's pause "loses its psychological impact over time" | S | Low for the morning gate (physical action, not a pause). Higher for bedtime blocking. |
| **Habit fixed ("graduation")** | Users say things like "fixed my habit" and "hope to delete it in a few months and go back to Screen Time" | S/U (anecdotes, no counts) | **The structural threat.** A blocker that works makes itself unnecessary. |
| **Restriction feels like punishment** | Founder hypothesis (CTRL launch): people "side with the addiction against the app" | U | Fits GAME_PLAN's no-punishment rule. |

### 2b. What behavioural science says

| Finding | Tag | What it means for Locturne |
|---|---|---|
| **People do want commitment devices for phones.** In Allcott, Gentzkow & Song's field experiment (~2,000 users), **89%** set binding limits with no incentive. Limits cut use by **22 min/day (17%)**, and the effect was **still 19 min/day nine weeks after** the last prompt. | V (paper) | Demand doesn't fade within three months. That covers the trial and the early, cancel-heavy months. |
| **Willingness to pay:** the average participant gave up **$4.26 for 3 weeks** of limit access (≈ $74/yr annualised [U]). **58%** would pay something. **20%** would pay over $10 for 3 weeks. **42% would pay nothing.** | V | $59.99/yr sits inside measured willingness to pay, for the top ~half of the market. A hard paywall is right. The other half was never going to pay. |
| People **underestimate** their future use (by ~4%) and are inattentive to habit formation | V | Show the counterfactual: "without me you'd have scrolled X". People don't feel the value on their own. |
| **Opt-in blocking showed no significant effect** in one field experiment; forced blocking raised output by ~8 tasks/hour (WEIS 2017, via trends.vc) | S | Users who can switch it off will. Locturne's morning gate must stay hard to escape (guardrails). |
| **Gym habits take about 6 months** to form (30,000 members, Buyalskaya et al., PNAS 2023); the "21 days" idea has no science behind it | V (coverage of the paper) | A 7-day trial can't form a habit. The first year is the habit period, which helps renewal if the morning sticks. |
| **Overconfidence and auto-renew:** gym members overestimate attendance *and* how quickly they'll cancel automatic renewals. Monthly members were **17% more likely to still be enrolled after a year** than annual buyers (DellaVigna & Malmendier 2006) | V | Inertia works for monthly auto-renew. It does **not** carry annual renewals: one charge a year is a fresh decision. Year-in-review before renewal matters most here. |
| **Social referees roughly double follow-through.** stickK: 29% success with no stakes or referee, **59% with a referee**, ~80% with a referee plus money. 6–8 week commitments with weekly referee reports did best (ICWSM study of 397k commitments) | S (self-selected, self-reported) | A light "morning buddy" is the best-evidenced social feature. Real money stakes break the no-punishment rule. |
| Accountability partners raised check-ins but also **faking** in one study app (Shanbay, HICSS 2025) | S | The buddy should see *verified* events (walk done), not self-reports. Locturne's sensors already make this possible. |
| **Streaks:** Duolingo found 10-day streaks correlated with retention, ran 600+ streak experiments, and cut daily churn 40%+ over four years | S | Streaks work, but it took hundreds of experiments. Use a **never-reset count** (already in HOME_10) plus a freeze-style grace, not a fragile chain. |
| Year-in-review (Spotify Wrapped, Strava): no published retention effect | S | It's a reminder of value, not a proven retention lever. It's cheap, so do it, but don't count on it. |

### 2c. Features ranked by likely effect on renewal

Ranked by evidence strength × fit with Locturne [my ranking, U].

| # | Feature | Why | Evidence |
|---|---|---|---|
| 1 | **Make the morning gate permanent, like an alarm clock.** Default schedules run forever. Copy says "your morning routine" never "your 30-day program". No "you've graduated" moment. | Removes the graduation story. Alarm clocks don't churn because the need never ends. | U (reasoning) + DellaVigna inertia [V] |
| 2 | **Reliability above everything** (blocks hold, unlocks work, no leaks) | 7% of churn is technical, and in blockers a leak also breaks trust | S |
| 3 | **Pre-renewal value recap** ("Loc's year": mornings walked, hours not scrolled, longest run) sent 7–14 days before the annual charge, plus the same in Apple's Retention Messaging API cancel screen | Turns renewal into a decision with evidence. Counters underestimated value | V (underestimation) + S (Retention Messaging saves) |
| 4 | **Flex without escape:** a paid-for "sick day / travel day" token (e.g. 2 a month) instead of disabling the app | Avoids the rage-quit or uninstall on a bad morning while keeping the gate hard | S (rage-quit theme) / U |
| 5 | **Never-reset count + gentle streak with a freeze** | Duolingo pattern without shame | S |
| 6 | **Morning buddy** (one friend sees "Luke got up at 7:04 ✓", verified by sensor) | Referee effect; each buddy is also an install | S |
| 7 | **Weekly/monthly report card** | Cheap habit reinforcement and share material | U |
| 8 | **Billing grace period + retry** (setting only) | Billing is 15% of App Store churn | S |
| 9 | **Win-back offers** for lapsed annual subscribers | Only ~5% return on their own, so the lift is small but cheap | S |

**Don't:** money stakes or penalties (break GAME_PLAN). A 30/60/90-day "challenge"
frame as the main product, since it invites graduation. Fake-progress
accountability (self-reported check-ins).

---

## 3. Pricing structures in 2026

| Structure | Evidence | Verdict for Locturne |
|---|---|---|
| **Weekly plans** | Covered in PRICING_RESEARCH: ~1–2% still paying after a year; weekly-led apps earn about half the revenue per install by day 60 in habit categories; Apple rejects trial toggles | **No.** Unchanged. |
| **Annual vs monthly mix** | H&F 61% of revenue from annual and rising [V]. Model: monthly sub LTV ≈ **$48 gross** vs annual ≈ **$102** at 25% renewal [U, model] | Keep annual the default. Mix barely moves month-12 MRR (60% vs 90% annual = ±3% installs needed) but matters for cash and LTV. |
| **Trial length** | 10–16 day trials: 43% trial→paid and 36% renewal vs 33% / 25% for 5–9 days [V, correlational]. Low-income markets do better with 3-day trials, high-trust markets with 14 [S] | **Test 14 days vs 7 days** on the main paywall. This is the single best renewal lever in the data. |
| **Lifetime as an add-on** | Opal sells $399 lifetime (4× annual) [S]. Model: an annual buyer is worth ~$102 gross at 25% renewal, $127 at 40% [U] | Keep it as **cash**, not MRR. Price at **$129.99–149.99** behind "Other plans". At $99.99 it is break-even at best and lowers MRR. |
| **Family plans / Family Sharing** | No published retention effect found. Shared members inflate churn counts [S] | Turn on Family Sharing (free, a goodwill feature). No separate family tier before data. A shared bedroom is a natural place for a "morning buddy". |
| **Regional pricing (PPP)** | US >50% of H&F consumer spend, UK 2nd at 8% [S]. Memrise ~6× cheaper prices raised paid conversion +182% Brazil, +180% Turkey, +152% Indonesia, but only +5% India (revenue not reported) [V, Google blog]. Germany/Japan/Switzerland/UK pay most [S] | Launch on Apple's default equalisation. After launch, lower annual prices in **Brazil, Turkey, Indonesia, Mexico, India** to ~40–60% of US and judge on revenue per install. Expect a small total effect: the audience is English-speaking TikTok. |
| **Intro offers (pay-up-front discount)** | No head-to-head test vs free trial found. Discounted cohorts had lower LTV in a RevenueCat client example [S]. Exit-offer discounts lost once refunds were counted (sub-club) | Don't make a discount the main offer. Keep the existing exit-offer test. |
| **Pay what you want / tips** | ScreenZen: 75k DAU → "a few hundred dollars a month" [S] | **No.** |
| **Student discount** | Opal offers up to 50% [S]; under-25s trial-and-cancel more (sub-club) | Not at launch. It anchors a lower price for your core TikTok audience. Revisit with data. |
| **Price point $39.99 / $44.99 / $59.99** | Cheap apps renew better (36% vs 23%) [V, cross-app]; one Superwall case: $44.99 beat $59.99 by 10% revenue/user [S]; high-tier LTV 4× low-tier [V] | Keep $59.99 (decided). The model shows the three prices end up within ±2% of each other **if** a cheaper price converts ~25–40% better. $59.99 needs the fewest payers and is the safest for a solo founder's support load. |

**Which structure maximises 12-month MRR for a creator-driven hard paywall?**
Annual with a trial as the default, at the highest price conversion will bear, with
monthly as the escape hatch. Lifetime is a cash product, not MRR. In the model,
month-12 MRR is driven almost entirely by **installs × paid conversion × annual
price**. Plan mix and renewal barely touch it. The one structural choice that moves
both conversion **and** later renewal is **trial length**, so that's the test to run
first.

---

## 4. The model

### 4a. How it works

Each month *m* has installs *I(m)*. Paid subs = *I(m)* × conversion, split into
annual and monthly. Refunds are removed up front. Each cohort is then aged:

- **Annual:** counts in MRR at price/12 for its whole paid year, **even after
  auto-renew is switched off** (that's how RevenueCat counts MRR). It renews at r1,
  then 55%, 65%, 70%, 72% (RevenueCat's 2nd/3rd renewal ranges [S]).
- **Monthly:** first renewal 55% (between the no-trial 49.5% and the H&F 57% [V]),
  then 72%, 80%, 84%, 86%, 88%, 90%… That gives 12% still paying at month 12, a bit
  below RevenueCat's 17% all-category figure (conservative).
- **MRR (net)** = gross × 0.85 (Apple Small Business Program).
- **Ramp shape:** installs start at 20% of *N* in month 1 and rise in a straight
  line to *N* in month 12, then hold. "Flat" = *N* every month.
- The solver finds the *N* that gives exactly $10K net MRR in month 12.

**Base inputs:** $59.99/yr, $9.99/mo, 7% paid conversion per install, 75% annual,
25% annual renewal, 6% annual refunds, 2% monthly refunds.

### 4b. Results

| Scenario | Paid conv | Installs/mo needed by m12 (*N*) | Year-1 installs | MRR m24 if *N* held | *N* for $10K at m24 instead | *N* to hold $10K forever |
|---|---|---|---|---|---|---|
| **Base** ($59.99, 7%, 75% annual, 25% renew, ramp) | 7.0% | **5,210** | **37,500** | $18.3K | 2,850 | **2,010** |
| Flat installs (no ramp) | 7.0% | 3,270 | 39,300 | $12.4K | 2,630 | 2,010 |
| Renewal 36% | 7.0% | 5,210 | 37,500 | $19.2K | 2,720 | 1,740 |
| Renewal 40% | 7.0% | 5,210 | 37,500 | $19.5K | 2,680 | 1,660 |
| Conversion 4% | 4.0% | 9,120 | 65,600 | $18.3K | 4,990 | 3,520 |
| Conversion 10% | 10.0% | 3,650 | 26,300 | $18.3K | 1,990 | 1,410 |
| Annual share 60% | 7.0% | 5,370 | 38,600 | $17.7K | 3,030 | 2,210 |
| Annual share 90% | 7.0% | 5,060 | 36,400 | $18.8K | 2,690 | 1,850 |
| $44.99, same conversion | 7.0% | 6,490 | 46,700 | $18.1K | 3,590 | 2,560 |
| $39.99, same conversion | 7.0% | 7,060 | 50,800 | $18.0K | 3,930 | 2,820 |
| $44.99, conv +25%, renew 30% [U] | 8.8% | 5,150 | 37,100 | $18.4K | 2,790 | 1,910 |
| $39.99, conv +39%, renew 33% [U] | 9.7% | 5,110 | 36,800 | $18.5K | 2,750 | 1,840 |
| $59.99, renew 40%, conv 9% (strong product + 14-day trial) | 9.0% | 4,050 | 29,200 | $19.5K | 2,080 | 1,290 |

("Conv +25%/+39%" assumes conversion scales as (59.99/price)^0.8, my guess, plus a
renewal bump toward RevenueCat's low-price tier.)

### 4c. The treadmill: what happens if installs stop at month 12

Hit exactly $10K net at month 12 (base), then get zero new installs:

| Annual renewal | MRR m12 | MRR m18 | MRR m24 |
|---|---|---|---|
| 25% | $10,000 | $6,744 | **$2,368** |
| 36% | $10,000 | $7,020 | $3,233 |
| 40% | $10,000 | $7,120 | $3,548 |
| 50% | $10,000 | $7,370 | $4,335 |

### 4d. What the numbers say

1. **About 37,500 installs in year one, or ~5,200 a month by month 12**, to reach
   $10K net at month 12 with a launch ramp. This matches 10K_MRR_PLAN's 30–35K.
2. **Renewal has zero effect on the month-12 number.** It is a year-two lever.
   25% → 40% renewal cuts the installs needed to *hold* $10K by **18%**
   (2,010 → 1,660/mo).
3. **Conversion is the biggest in-app lever.** 4% → 10% cuts the installs needed by
   **60%**. Around 7%, each extra point of paywall conversion saves ~650 installs a month.
4. **Annual share barely matters for MRR** (±3%). It matters for **cash**: an annual
   sale puts ~$48 net in your account now, while a monthly sub pays ~$40 net over its
   whole life.
5. **Price is roughly a wash for MRR** if cheaper prices convert proportionally
   better, and strictly worse if they don't. $59.99 is the low-regret choice.
6. **Year-1 cash:** base ≈ **$3.06 net per install** in the first year (annual paid
   upfront). 37.5K installs ≈ **$115K cash collected** in year one before tax, even
   though MRR "only" reaches $10K at the end. Given the need for income now, this
   matters more than the MRR label. [U, model]

---

## 5. Changes ranked by expected MRR impact

Impact is relative to the base model. Confidence: H/M/L. All [U] estimates
unless a source is cited.

| Rank | Change | Expected effect | Confidence | Cost |
|---|---|---|---|---|
| 1 | **Paywall conversion work** (timeline paywall, price hierarchy fix, activation in trial: see sub-club P1/P2/A1) | Each +1pt conversion ≈ −12% installs needed. 7% → 9% ≈ −22% | M | Low, mostly done |
| 2 | **Test a 14-day trial vs 7-day** on the main annual paywall | Trial→paid +10pts and renewal +11pts in RevenueCat's cross-app data. Realistic own-app gain maybe +10–20% revenue per install and −10–15% steady-state installs. Risk: a later first charge delays cash a week | M (correlational) | Low |
| 3 | **Permanent-tool positioning + reliability** (no "program", schedules never expire, zero block leaks) | Protects against the graduation churn that would put Locturne *below* the 25% median. Worth roughly ±5–10pts of renewal | M | Low (copy) to ongoing (QA) |
| 4 | **Pre-renewal "Loc's year" recap + Retention Messaging API + Billing Grace Period** | Billing is 15% of App Store churn. A recap plus a cancel-screen save could add ~3–8pts to annual renewal | M | Medium |
| 5 | **Lifetime moved to $129.99–149.99, behind "Other plans"** | Stops a $99.99 lifetime cannibalising ~$102 annual LTV. Keeps a high-intent cash option | M | Trivial |
| 6 | **Flex days (2/month) instead of off-switches** | Cuts rage-quits on bad mornings. Small but compounding effect on month-1 cancels (35% of annual cancels happen in month 1) | L–M | Medium |
| 7 | **Morning buddy (sensor-verified)** | stickK referee effect (29% → 59% follow-through), plus each buddy is a potential install | L–M | High for v1. Post-launch |
| 8 | **PPP pricing** for BR/TR/ID/MX/IN | +2–5% revenue at most, given an English creator audience | L | Low |
| 9 | **Win-back offers** for lapsed annual subs (iOS 18+) | ~5% natural return. An offer might double it. Small | M | Low |
| 10 | Price $44.99 arm (after traffic) | ±5%. Only worth a test once there are ~400 renewal pairs | L | Low |
| ✗ | Weekly plan, pay-what-you-want, student discount at launch, money stakes, "30-day challenge" as the core product | Negative or unproven | – | – |

**The edge, in one line:** most blockers sell a cure, and cures churn when they work.
Locturne sells a **morning routine**, which never finishes. If the product, copy and
renewal recap all say "this is how you wake up now", Locturne can beat the 25%
median that cure-type apps are stuck with. That said, nothing here replaces the
~5,000 installs a month that month 12 needs.

---

## Sources

Benchmarks
- RevenueCat, renewal rates by category (SOSA 2026 data): https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category/
- RevenueCat, free trial length (2026-09-28): https://www.revenuecat.com/blog/growth/free-trial-length
- RevenueCat, State of Subscription Apps 2026: https://www.revenuecat.com/state-of-subscription-apps
- 9to5mac on SOSA 2026 part 2 (reactivation 5%, month-1 cancels 35%, 2nd/3rd renewal): https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/
- Adapty, H&F benchmarks (SOIS 2026): https://adapty.io/blog/health-fitness-app-subscription-benchmarks/
- Adapty, State of In-App Subscriptions 2026: https://adapty.io/state-of-in-app-subscriptions/
- Adapty, refund rate guide: https://uploads.adapty.io/the_guide_on_managing_refunds_for_subscription_apps.pdf
- RevenueCat, churn reasons: https://www.revenuecat.com/blog/growth/subscription-app-churn-reasons-how-to-fix/
- trends.vc, screen-time blocking apps (SOSA 2025 retention, WEIS 2017 opt-in result, Freedom $29): https://trends.vc/screen-time-blocking-apps-forced-versus-opt-in-the-licence-fence-lifetime-pricing/

Competitors
- Opal CEO podcast (via Podcast Addict listing): https://podcastaddict.com/episode/https%3A%2F%2Fmedia.transistor.fm%2Fa7812acd%2Fb1980868.mp3&podcastId=3144724
- Opal pricing review: https://www.autonomous.ai/ourblog/opal-app-review
- Opal reviews: https://justuseapp.com/en/app/1497465230/opal-save-time-daily/reviews
- Unstar 1–3★ review analysis: https://unstar.app/blog/opal-forest-freedom-one-sec-jomo-screen-time-apps-ranked-2026
- ScreenZen developer blog: https://www.screenzen.co/blog
- one sec estimate: https://screensdesign.com/showcase/one-sec-screen-time-focus ; RevenueCat interview: https://www.revenuecat.com/blog/growth/frederik-riedel-expected-12-his-app-cut-screen-time-by-57
- Brick: https://getbrick.com/products/brick
- Erly case study: https://superframeworks.com/case-study/erly
- Alarmy / DARO: https://daro.so/en/blogs/daro-alarmy-ad-monetization-guide
- Sleep Cycle year-end report 2025: https://storage.mfn.se/79dd61f8-4ccc-4bc2-b095-feedaf3fced8/sleep-cycle-year-end-report-2025.pdf ; https://www.inderes.fi/releases/sleep-cycle-year-end-report-a-year-of-deliberate-choices
- WhistleOut one sec review: https://www.whistleout.com/CellPhones/Apps/one-sec-app-review
- CTRL launch (founder hypothesis): https://www.producthunt.com/p/ctrl-4

Behavioural science
- Allcott, Gentzkow & Song, "Digital Addiction" (NBER w28936): https://www.nber.org/system/files/working_papers/w28936/revisions/w28936.rev0.pdf
- DellaVigna & Malmendier, "Paying Not to Go to the Gym" (AER 2006): https://eml.berkeley.edu/~ulrike/Papers/gym.pdf
- Buyalskaya et al., PNAS 2023 habit formation: https://pmc.ncbi.nlm.nih.gov/articles/PMC10151500 ; https://experts.caltech.edu/news/no-magic-number-for-time-it-takes-to-form-habits
- Bryan, Karlan & Nelson, "Commitment Devices" (2010): https://ideas.repec.org/a/anr/reveco/v2y2010p671-698.html
- Giné, Karlan & Zinman, CARES (take-up 11%): https://povertyactionlab.org/media/3662
- stickK referee figures: https://yaledailynews.com/?p=24449 ; ICWSM dataset: https://ojs.aaai.org/index.php/ICWSM/article/view/31440
- Accountability partners (Shanbay, HICSS 2025): https://aisel.aisnet.org/hicss-58/cl/teaching_and_learning_technologies/3
- Duolingo streaks: https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks

Pricing
- Memrise localized pricing test: https://android-developers.googleblog.com/2016/11/learn-tips-from-memrise-to-increase-in-app-conversions-with-pricing-experiments.html
- Local pricing summary (RevenueCat data): https://appsops.store/blog/revenuecat-data-local-pricing
- H&F spend by country (Sensor Tower via secondary): https://voxbooster.com/blog/fitness-app-statistics-2026
- Superwall lifetime playbook: https://superwall.com/solutions/lifetime-or-no-lifetime
- Apple introductory offers: https://developer.apple.com/documentation/storekit/implementing-introductory-offers-in-your-app
- RevenueCat Retention Messaging API: https://www.revenuecat.com/blog/engineering/apple-retention-messaging-api/ ; win-back: https://www.revenuecat.com/win-back
- Family Sharing churn counting: https://community.revenuecat.com/dashboard-tools-52/do-the-charts-and-benchmarks-account-for-family-sharing-7771
- UK DMCC subscription regime (renewal reminders; start Jan–spring 2027, so watch for the UK launch): https://brodies.com/insights/commercial-contracts-and-outsourcing/the-dmcca-subscription-contracts-the-timeline-just-got-shorter/ ; https://www.taylorwessing.com/de/insights-and-events/insights/2026/04/subscription-contracts
