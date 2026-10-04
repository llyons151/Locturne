# Track 3: Paywall, pricing and trial evidence (quantitative), applied to Locturne

Researched 2026-10-03. Reviewed against `src/features/onboarding/screens/paywall.tsx`,
`src/lib/purchases.ts`, `src/lib/notifications.ts`, `src/lib/revenuecat.ts`, and the repo's
earlier work (`docs/sub-club/`, `PRICING_RESEARCH.md`, `PAYWALL_VIDEO_NOTES.md`,
`1K_MRR_PLAN.md`). This doc covers new material and says where it disagrees with those docs.

**Evidence grades:** **A** = A/B test with numbers · **A-** = A/B test without numbers ·
**B** = benchmark across many apps (correlational) · **C** = observation from one app or
vendor · **D** = anecdote · **E** = opinion. "Unverified" means I couldn't confirm it from a
primary source.

**Limit:** this session's web-search budget ran out partway through. Lifetime-plan, charm-price
and CTA-copy evidence therefore leans on pages I could fetch directly and on well-known
papers. Those spots are marked.

---

## TL;DR (what's new beyond the repo docs)

1. **The H&F annual first renewal is only 25% (median).** High-priced annual plans renew
   at 23%, against 36% for low-priced ones. That makes Locturne a **year-one cash business**:
   plan around the first charge and refunds, not renewals. Price $59.99 accordingly. It's
   probably right for cash, but the renewal lift from a cheaper price is real. [B]
2. **Rework the half-price exit arm.** Today it's a separate product at **$29.99 that renews
   at $29.99 forever** (`PRODUCT_IDS` comment in `purchases.ts`). That permanently halves the
   LTV of everyone who takes it, and with a TikTok audience the "close the paywall for half
   price" trick will end up in the comments. Better: **$29.99 for the first year, then
   $59.99**, as a pay-up-front intro offer on a $59.99 exit product. It has no trial, so the
   cash arrives at purchase, not 7–14 days later. [E, built on Apple's intro-offer mechanics]
3. **Fire the exit offer on a cancelled Apple purchase sheet too, not only when the paywall
   is closed.** Right now `revenuecat.ts` returns `cancelled` and the flow "says nothing"
   (onboarding-flow.tsx:414). People who tapped the CTA and then backed out of Apple's sheet
   are the highest-intent decliners. Superwall: 5–22% of them convert, and Apple has
   confirmed one offer after a cancelled transaction is allowed. [C]
4. **At launch traffic, a 3-arm exit test can't be read.** Detecting 5% vs 8% conversion
   on the exit screen takes about 1,050 decliners per arm, and judging on revenue takes about
   3x that. Run **two arms** (agreeing with `1K_MRR_PLAN.md`): 14-day trial vs none. The
   "none" holdout is the only way to learn whether the screen adds revenue or just takes it
   from people who would have paid full price later. [E plus a power calculation]
5. **Keep the 7-day trial and the dated timeline.** On 7-day trials, 39.8% of cancellations
   happen on day 0. That's the "I'll forget to cancel" anxiety the reminder exists for. Use
   Apple's **Retention Messaging** (WWDC26 added a no-server App Store Connect setup; average
   save rate +1.4 pp, about +82%) and detect in-app when a trial has been cancelled. [B, C]
6. **The monthly anchor is weak.** At $9.99 monthly, annual is 6x the monthly price ("Save
   50%"). The category median is 4x ($39.94 / $9.99), and Opal's is 5x ($99.99 / $19.99).
   Raising monthly to **$12.99** makes the badge "Save 61%" and earns more from the people who
   do pick monthly. [E/B, cheap to test]
7. **Realistic launch funnel:** about **$0.65 / $1.40 / $2.75 net cash per install**
   (pessimistic / base / optimistic). $1.5–2K a month needs roughly **1,100–1,450 installs a
   month** in the base case and 2,400–3,200 in the pessimistic one. **Cash from a Jan 2
   launch lands around early March 2027**, because Apple pays within 45 days of the end of
   the fiscal month.
8. **Don't enable Family Sharing.** There's no published evidence it lifts conversion, and
   once enabled on a product it can't be turned off. Skip win-back offers and the Advanced
   Commerce API at launch. Do use offer codes for creators, Retention Messaging, and Billing
   Grace Period.

---

## 1. Benchmarks (latest available)

### 1.1 RevenueCat State of Subscription Apps 2026 (data through ~2025; published Mar 2026)

| Metric | Figure | Grade | Source |
|---|---|---|---|
| H&F download→trial (D30), median | **6.9%**; top quartile >23% | B | https://www.revenuecat.com/state-of-subscription-apps |
| H&F trial→paid, median | **37.7%**; top quartile >51.4% | B | same |
| H&F download→paid (D35), median | **2.9%**; top quartile >6.2% | B | same |
| Hard paywall vs freemium download→paid (D35), all categories | **10.7% vs 2.1%**; top 10% hard paywall 38.7% | B | https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 ; https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth |
| Hard paywall RPI D14 / D60 | **$2.32 / $3.09** (freemium $0.27 / $0.38) | B | same |
| H&F RPI D14 / D60, all models | **$0.48 / $0.66** median | B | https://www.revenuecat.com/state-of-subscription-apps |
| H&F year-1 realized LTV per payer | **$35.64** | B | same |
| H&F medians | annual **$39.94**, monthly **$9.99**; 68% annual | B | same |
| Download→trial by price tier (all) | high-priced **8.9%** vs low-priced **4.4%** | B (tier definitions unverified) | saastr link above |
| Realized LTV per user at 1 yr by tier | low **$10.69**, mid **$26.07**, high **$62.19** | B | https://revenuecat.com/sosa-26-insights/ |
| Annual retention after 1 yr by tier | high **23%** vs low **36%** | B | same; https://www.revenuecat.com/blog/growth/first-renewal-churn |
| H&F first renewal by plan | annual **25%**, monthly **57%**, weekly **54%** (medians) | B | https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category (updated 2026-04-24) |
| Share of annual cancellations in month 1 | **~30–35%** | B | first-renewal-churn link; https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/ |
| Cancelled annual subs who return within a year | **5%** ("95% never come back") | B | 9to5mac link above |
| Day-0 share of trial cancellations | 3-day **55%**, 7-day **39.8%**, 14-day **35.7%**, 30-day 31% | B | saastr link above |
| Day-0 share of paid conversions | **~50%** | B | same |
| Refunds by price tier | low **2.7%**, mid **3.9%**, high **4.5%** | B | via search summary of SOSA 2026 (unverified on the report page) |
| Refunds by access model | hard paywall **5.8%** vs free-first **3.4%** | B | same; also https://adapty.io/blog/refund-rate-metrics-and-benchmarking/ |
| Refunds by region | North America **3.4%**, IN/SEA **7.7%** | B | same (unverified on the report page) |
| Download→paid (D35) by region | North America **2.8%**, global 2.0%, IN/SEA **0.7%** | B | https://www.revenuecat.com/state-of-subscription-apps |
| Value per payer by region | NA **$32**, W. Europe $25, global $23, IN/SEA $14 | B | https://revenuecat.com/sosa-26-insights/ |
| Median annual price, NA vs IN/SEA | **$39.99 vs $18.32** | B | saastr link above |
| App Store share of cancellations from billing failures | **14%** (Google Play ~31%) | B | trends link above |

**Trial length, RevenueCat blog (2026-09-28, 17K+ apps, Aug 2025–Jul 2026)**:
https://www.revenuecat.com/blog/growth/free-trial-length [B]

| Trial length | Annual trial→paid | Monthly trial→paid | Weekly |
|---|---|---|---|
| ≤4 days | 24.0% | 39.6% | 22.3% |
| **5–9 days** | **33.0%** | 45.9% | 24.3% |
| 10–16 days | 43.0% | 46.6% | – |
| 17–32 days | 44.6% | 43.7% | – |

- In H&F monthly plans, **5–9 days beat 10–16 days (46.8% vs 40.4%)**.
- RevenueCat itself warns the jump at longer trials is partly selection. Someone still in a
  30-day trial on day 25 was always more likely to pay.
- No annual H&F split is published.

**SOSA 2025 (prior year, for trend):** H&F trial→paid 39.9% (top 10% 68.3%). H&F refunds
4.71%, the second highest after Education (4.86%). H&F D14 ARPU $0.44.
https://www.revenuecat.com/state-of-subscription-apps-2025 [B]

### 1.2 Adapty SOIS 2026 (16K+ apps, $3B+; H&F page published 2026-03-27)

https://adapty.io/blog/health-fitness-app-subscription-benchmarks/ ·
https://adapty.io/state-of-in-app-subscriptions/ [B]

- H&F install→trial: **11.2% global, 14.5% North America**. Trial→paid **42.2%**. Install→paid
  with no trial **3.7%**.
  - These are higher than RevenueCat's figures. The two vendors define and sample
    differently, so treat the gap between them as the uncertainty band.
- H&F annual LTV, high-priced (top 25%) vs low-priced (bottom 25%): **$70 vs $17**.
- H&F annual share of revenue: 51% → 56% → **61%** (2023→2025). It's the only category where
  annual is still growing.
- H&F 12-month install LTV: **$1.21**, the best of any category.
- Day-0 share of trial starts: **86.1%**.
- Only **~10% of apps use discounts**.
- Hard paywalls show **21% higher LTV** than soft ones, even though soft paywalls convert about
  50% better (https://adapty.io/blog/high-performing-paywall-2026/).
- Paywall-test **win rates** (the share of tests that raised LTV, not the size of the lift):
  localization 62.3%, trial 59.6%, plan duration 58.7%, plan count 57.1%, price 45.5%,
  visuals/copy 34.6%.
- New apps earn about 25% less than established ones at the median.
- In H&F, the top 10% of apps take 92.6% of revenue.

### 1.3 Reading the two vendors together

- **Install→trial in H&F: 7–11% median, 14.5% in North America.** A hard paywall placed after
  a long onboarding (Opal, 17%) sits at or above that. Treat 10% as the base case.
- **Trial→paid, H&F annual 7-day: 33–42%.** Locturne's audience is under 25. Sub Club guests
  (Opal, Petit, Burke) say young users trial and cancel more, so assume the low end.
- **Hard paywalls cost more in refunds (5.8%)**, and H&F is a high-refund category (4.7%).
  Budget **~5% of gross** for refunds.

---

## 2. Price point: $59.99 annual

### Evidence
- **For a higher price:**
  - High-priced apps convert more downloads to trials (8.9% vs 4.4%) [B].
  - High-priced H&F annual plans have about 4x the LTV of low-priced ones ($70 vs $17) [B].
  - Sub Club price raises held up: Skylight $39 → $79, Lose It! $40 → $80 (repeated A/B),
    Coconote $99.99 → $129 (`docs/sub-club/themes/04`).
  - All of this is correlational except Lose It!. Serious apps both charge more and attract
    high-intent users.
- **Against, or at least a cost:**
  - High-priced annual plans renew at **23% vs 36%** [B], and H&F annual renews at 25%.
  - At $59.99, roughly **1 in 4 payers ever pays a second time**, so nearly all of the value
    is year one.
  - The higher price makes that first charge bigger, which suits the founder's cash need. It
    may also raise refunds slightly (high tier 4.5% vs mid 3.9%) [B].
- **Competitors (checked):**
  - Opal: $99.99/yr, $19.99/mo, $4.99 and $9.99 weekly plus a $9.99 "Student Weekly"
    (https://apppricinglab.com/iap/apple/1497465230, data from 2026-03) [C].
  - Erly: $29.99/yr, $9.99/mo. It reports about $50K/month on about 50K downloads/month,
    which is roughly **$1 per download** (https://superframeworks.com/case-study/erly, its own
    claims) [D].
  - Freedom: $39.99/yr (`PRICING_RESEARCH.md`).
  - Where Locturne sits: **above the H&F median and Erly, below Opal.**
- **Charm and left-digit pricing:**
  - Field and lab evidence for prices ending in 9: Anderson & Simester 2003, *Quantitative
    Marketing and Economics* 1(1), catalog field experiments; Thomas & Morwitz 2005, *JCR*
    32(1), the left-digit effect. Not app-specific, and not re-verified this session.
  - App Store prices end in .99 anyway. The live question is whether **$59.99 vs $49.99**
    crosses a left digit that matters to a student. Both are "under $60/$50", so the
    left-digit effect predicts only a small penalty for 5 vs 4. [E]

### Recommendation [confidence: medium]
- **Launch at $59.99** (cash per payer matters, and New Year intent is high).
- Pre-register the **$39.99 vs $59.99** test as the first price test, judged on D35–D60 net
  cash per install. **Don't run it before ~6–7K installs per arm.** About 200 paid
  conversions per arm at roughly 3% install→paid means a viral month at least.
- If the funnel lands in the pessimistic case below (install→trial under 6%), the cheaper
  price is the first lever to pull, ahead of copy changes.

---

## 3. Monthly anchor and price display

### Evidence
- H&F median annual/monthly ratio is **~4x** ($39.94 / $9.99, RevenueCat). Opal's is 5x
  ($99.99 / $19.99). Locturne's is **6x** ($59.99 / $9.99), so the "Save 50%" badge is
  relatively weak and monthly looks relatively cheap. [B/C]
- Per-month display:
  - Mojo: per-month line +10% revenue in the US, +30–40% in LatAm [A, Sub Club].
  - Mojo: annual as default/only visible plan, monthly behind "view all plans", +15–20 pp
    annual uptake (https://www.revenuecat.com/blog/growth/paywall-tests-grow-app-revenue) [A].
- Apple's wording (https://developer.apple.com/app-store/subscriptions/): *"the amount that
  will be billed must be the most prominent pricing element… a breakdown price… should be
  displayed in a subordinate position and size."*
  - A per-week or per-day breakdown is allowed under that rule, if it's subordinate.
  - The current `PlanCard` complies: `$59.99/year` is big, `$5.00/month · 7 days free` is the
    detail.
- Per-day framing ("pennies-a-day"): Gourville 1998, *JCR* 24(4). It works for small amounts
  in lab studies, but not app-tested [B-lab].
  - "$0.16 a day" invites the Cal AI-style scrutiny.
  - The monthly equivalent is useful because it compares directly with the $9.99 card next
    to it.

### Recommendation
- **Keep the per-month breakdown** [A/B evidence; already done].
- **Test monthly at $12.99** (badge "Save 61%") or $14.99 (badge "Save 67%") against $9.99.
  - Expected effect: a small shift to annual plus more money from monthly takers.
  - Cost: one more App Store Connect product.
  - Confidence: low-medium [E plus benchmark]. Note it's a price test on a small slice of
    payers, so judge it on blended revenue per paywall view.
- Don't add a per-day line.

---

## 4. Plan count: single plan, two, or three; lifetime

### Evidence
- Plan-count tests win 57.1% of the time (Adapty) [B]. Mojo +15–20 pp annual by hiding
  monthly [A].
- Burner: 1 SKU beat 5 [A-]. Opal: every test that added choice lost [A-] (Sub Club).
- Adapty: "two plans often outperform three, though sometimes one outperforms two"
  (https://adapty.io/blog/the-10-types-of-mobile-app-paywalls/) [E/C].
- **Lifetime** (https://www.revenuecat.com/blog/growth/lifetime-subscriptions/, 2025-11-12)
  [C/D]:
  - Lifetime prices run 2x–12x annual (Moonly 2.1x, Fiit 2.5–3.1x, Calm 5x, Waking Up
    11.5x).
  - The main risk is cannibalization, and the post gives no share-of-revenue data.

### Lifetime verdict: dropping it was right at launch
The code comment says lifetime at $99.99 "skipped the trial and capped LTV". The numbers
change that picture a little but not the decision:
- With a 25% annual first renewal, the expected 2-year gross of an annual payer is about
  $59.99 × 1.25 ≈ **$75**. Lifetime at $99.99 would have **beaten** annual on cash per buyer,
  and paid up front with no trial leak.
- The real cost is choice overload on a two-card page, and lifetime pulling buyers away from
  the trial. There's no evidence either way for this category.
- **Keep it out of the paywall.** Lifetime is better used later as:
  - an in-app upsell to annual subscribers in month 10–11, before the renewal most of them
    won't make, priced at about 2–2.5x annual ($129.99–149.99) [E]; or
  - a later A/B test against the two-plan page.

### Recommendation
- Today's two cards (Annual selected, Monthly visible) is defensible. The best-evidenced
  variant is **annual-only on the card, monthly behind "Other plans"** (Mojo A/B).
- Run that as the first structural test, ahead of price. It wins about 57% of the time and
  needs less traffic than a price test. [A, medium confidence]

---

## 5. Trial design

### 5.1 Length
- Annual 5–9 days: 33.0% trial→paid. Annual 10–16 days: 43.0%. Both are biased by who stays
  in the trial [B].
- H&F monthly: 7-day beats 14-day (46.8% vs 40.4%) [B].
- Sub Club: Zumba's 7-day beat 14 and 30 days. Duolingo cut 14 → 7 days and got more net
  conversions [A].
- 3-day trials lose 55% of their cancellations on day 0 [B].
- For Locturne, 7 nights gives about 6 mornings of the core action. The activation-count
  findings (about 3 completions) fit inside 7 days.

**Keep 7 days** [confidence: medium-high]. The 14-day trial belongs only in the exit arm,
where the user has already said "not now".

### 5.2 Reminder toggle and showing the charge date
- **Blinkist** (https://growth.design/case-studies/trial-paywall-challenge;
  https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b)
  [A]:
  - Trial timeline plus reminder promise: **+23% trial starts, −55% complaints**.
  - Notification opt-in went from **6% to 74%**, asked *after* payment.
  - 33% of cancellations had come right after trial start.
  - Locturne already copies this: `scheduleTrialReminder` asks for notification permission
    right after a trial purchase.
- An unnamed meditation app's 3-screen "priming" paywall (trial pitch → "we'll remind you 2
  days before" → paywall): +72% trial starts, +180% paid
  (https://startupspells.com/p/3-page-priming-paywall-tripled-ltv-case-study). This is a
  secondary newsletter with no baseline or sample size [D].
  - It's structurally what `offer` → `plans` already is.
- I found **no published A/B test isolating the on-paywall reminder *switch*** against a
  plain promise. Superwall's trial-reminder page makes only qualitative claims
  (https://superwall.com/features/free-trial-reminders). Unverified.
- **Apple risk:** the January 2026 toggle ban targets toggles that "add or remove a free trial
  from the subscription purchase"
  (https://www.revenuecat.com/blog/growth/rip-toggle-paywall). A reminder switch doesn't change
  the product, so it should be fine.
  - A reviewer could still pattern-match on "a switch on the purchase screen" [E].
  - Mitigation: add one line to App Review notes: "The switch only schedules a local reminder
    notification; it doesn't change the product or trial."

### 5.3 CTA copy and "No payment due now"
- Duolingo: "Try for $0.00" > "Try for free" > "Start free trial" > "Subscribe". $0.00 also
  lifted trial→paid [A, Sub Club B08].
- I found no published app A/B test for "No payment due now" specifically.
  - SiteSpect's ecommerce "you won't be charged now" copy: +25% mobile purchases
    (https://www.sitespect.com/blog-brand-ab-tests-payment-terms-and-sees-big-wins/) [C,
    different domain].
- **Current CTA:** "Start 7-day free trial / No payment due now · cancel anytime". It's
  good.
- **Test** "Try 7 nights for $0.00" as the title, keeping the sub-line. It fits Loc's
  "nights" language. Expected effect: small and positive. Confidence: medium (one strong
  source).

### 5.4 Day-0 cancellation (new for this repo)
- On 7-day trials, **39.8% of all cancellations happen on day 0** [B]. Many of these users
  start the trial and immediately turn off auto-renew "so I don't forget". They keep the
  whole trial.
- For Locturne this is recoverable: the lock keeps working all week.

**Recommendations:**
- Read `willRenew === false` from RevenueCat CustomerInfo. Once a cancelled trial user
  completes their 2nd–3rd morning, show one honest line on Home, e.g. Loc: *"You cancelled.
  Smart, honestly. The week's still yours. If tomorrow goes like today, turning it back on is
  two taps."* No discount here.
- Turn on **Retention Messaging** (section 7) for the cancel screen itself.

---

## 6. Exit offers (`declined`)

### 6.1 What the evidence says
- **Superwall, transaction-abandon paywalls** (18 apps, about 500K users):
  https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study/
  - Exit-offer users produced **17% of revenue**.
  - Refunds: **3.3% (offer group) vs 6.8% (control)**.
  - **Caveat:** the "control" was all recent installs and the "variant" was abandoners. These
    aren't comparable groups, and Superwall admits it's "challenging to determine how many
    users would have converted without the campaign."
  - So: **C, not A.** Cannibalization is unmeasured.
- Superwall Growth Session (2025-09-04): 5–22% of users who enter a transaction-abandon
  campaign convert. Suggests longer trials for younger users.
  https://superwall.com/blog/growth-sessions-transaction-abandon-recap [C/E]
- Jake Mor (Superwall CEO): one app went from 23% to 30% conversion with an in-paywall
  slide-up offer (https://x.com/jakemor/status/2077591686193004610). Earlier, transaction-abandon
  discounts were "25–40% of revenue" in two of his own apps
  (https://x.com/jakemor/status/1805580424153846195) [D].
- Adapty: post-close welcome offers "typically generate 10–15% ARPU" [E/vendor].
- Sub Club counter-evidence:
  - BoldVoice: an undismissable discount lifted trials but lost on refunds [A].
  - Yousician: a win-back discount turned net negative [C].
  - Coconote: a 7-day extension was the best save for trial users [C].
- **Apple:** Superwall's off-the-record session with Apple (2026-06-03): "Showing any offer
  after a cancelled transaction is allowed — any price, any product". Repeated offers
  ("looping… resurfacing the offer in every session") are not
  (https://superwall.com/blog/external-checkout-a-b-testing-and-trial-toggles-confirmed-apples-rules-for-ios)
  [C, second-hand from Apple].
  - Locturne's one-time `markExitOfferShown` complies.

### 6.2 Problems with the current implementation
1. **The half-price arm is a permanent discount.** `PRODUCT_IDS` describes it as "$29.99 a
   year, 7-day free intro offer", and the fine print says "Auto-renews at $29.99/year".
   - With a 25% renewal rate, the renewal half matters little.
   - The bigger risk is **the trick leaking**: a short-form audience will post "close the
     paywall and it's half price" [E].
   - It also appears as a cheaper level in the iOS Settings subscription group. FitnessAI
     holds 10–15% of subscribers on a hidden cheaper plan [C, Sub Club].
2. **The exit offer only fires on paywall close, not on a cancelled Apple sheet.**
   `revenuecat.ts:203` returns `cancelled`, and the flow stays silent
   (onboarding-flow.tsx:414).
   - Transaction abandoners are the group Superwall's data is actually about, and the group
     Apple explicitly allows an offer for.
3. **Three arms can't be read at launch volume.**
   - Detecting 5% → 8% conversion on `declined` needs about 1,050 decliners per arm
     (α 0.05, power 0.8).
   - Judging on paid conversions needs about 3x that.
   - Launch traffic of 1–3K installs a month gives a few hundred decliners per arm.
4. **The 14-day arm delays cash.** Charges land 7 days later, and around the turn of an Apple
   fiscal month that means about a month later payout. That matters for a founder who needs
   cash now.

### 6.3 14 days vs half price, specifically
| | 14-day trial, full price | Half price (current: $29.99 forever) | **Proposed: first year $29.99, then $59.99, no trial** |
|---|---|---|---|
| Objection it answers | "Not sure it'll work for me" | "Too expensive" | "Too expensive" |
| Cash timing | Day 14 | Day 7 | **Day 0** |
| Payer value if converts | $50.99 net | $25.49 net now and at each renewal | $25.49 now, then $50.99 at each renewal |
| Trial leak | ~60–67% of trial starters never pay | same | none, but direct-buy refunds run higher (5.8% vs 3.4%) |
| Cannibalization/leak risk | low (price intact) | **high** | medium (first year only) |
| Evidence | Coconote extension save [C], Superwall "longer trials for younger users" [E] | Superwall TA aggregate [C], Opal 50% off at trial cancel [C] | none direct; Apple intro-offer "pay up front" mechanics |

**How to build the proposed arm:**
- Create a new annual product at $59.99 whose introductory offer is "Pay up front, 1 year,
  $29.99".
- Intro offers are one per subscription group per customer
  (https://developer.apple.com/app-store/subscriptions/). A decliner who never trialed is
  eligible. The `resolveExitArm` logic already handles ineligible people.
- Copy (3.1.2(c) requires the post-offer price): **"$29.99 for your first year, then
  $59.99/year. Auto-renews unless cancelled at least 24 hours before renewal."**
- Loc line: *"Fine. Half price. First year only, I'm not a charity."*

### 6.4 Recommendation for `declined` [overall confidence: medium-low; all evidence is C/D]
1. **Add the transaction-abandon trigger.** On the first `cancelled` result from `buy()`, go
   to `declined`, with the same one-per-install rule.
   - Expected effect: the most incremental use of the screen. Confidence: medium.
2. **Run two arms at launch: `longer-trial` (default) vs `none`, 50/50.**
   - Judge on D35 net cash per *paywall viewer*, not per decliner. That counts cannibalization:
     decliners who come back later from Home and pay full price.
3. **Replace the forever-$29.99 product** with the first-year-only version above. Hold it as
   arm 3 until traffic supports it, about after the first viral week.
4. Copy for the existing 14-day arm is fine. Keep "This only shows up here, once." It's true,
   and Apple bans looping, not one honest scarcity statement.

---

## 7. Apple's newer tools: which help an indie at launch

| Tool | What it does | Launch value | Notes / source |
|---|---|---|---|
| **Retention Messaging API** | Your message, or an offer or a "switch plan", on Apple's cancel-confirmation screen | **High, cheap** | WWDC26 added an **App Store Connect configuration path (no server)** plus a real-time server path. Early data: **+1.4 pp average save-rate lift (≈+82%)** (https://www.revenuecat.com/blog/engineering/wwdc26-whats-new-for-apps.md) [B/C, Apple's own number]. Adapty (2026-09-14) still describes per-app access requests for the real-time path (https://adapty.io/blog/apple-s-retention-messaging-api/). Check in App Store Connect which path is open to this account. Message idea for trial cancellers: *"Cancelling is fine. The lock keeps working until your trial ends. Loc will still be rude to you every morning."* |
| **Billing Grace Period** | Keeps access during billing retry | High, free | 14% of App Store cancellations are billing failures (SOSA 2026) [B] |
| **Offer codes** (custom codes like `LOCNEWYEAR`) | Free or discounted period, redeemed by link or code | **Medium-high for creators/campus** | Gives per-creator attribution with no SDK. Since WWDC26, redemption returns a `VerificationResult` (RevenueCat WWDC26 post). Apple: one-time-use or custom codes (https://developer.apple.com/app-store/subscriptions/). Use instead of public discounts |
| **Promotional offers (in-app)** | Discount for existing or former subscribers | Medium | Needed for an in-app "your trial ends Friday" save offer to users who cancelled during the trial. RevenueCat signs the offers. Eligibility of trial-only users as "former subscribers": I believe yes, unverified |
| **Win-back offers** (iOS 18+) | Apple shows offers to lapsed *paid* subscribers (App Store, Settings, in-app) | **Low at launch** | Requires prior paid time and a lapse period (https://www.revenuecat.com/blog/growth/guide-to-apple-win-back-offers). Annual users won't lapse until Jan 2028. Set one up for monthly churners in ~March 2027. Annual cancellers reactivate at only 5% a year [B] |
| **Monthly-billed annual plan** (WWDC26, iOS 26.5+) | Commit to 12 months, billed monthly | Low | Not available in the US or Singapore (RevenueCat WWDC26 post) |
| **Advanced Commerce API** | Large or dynamic catalogs, creator content, bundles | None | Built for large catalogs and needs approval (from memory, not re-verified) |
| **Consumption info (refund requests)** | Send usage data when a user requests a refund | Medium | Vendors claim about 80% of disputes won (Adapty refund post) [D]. RevenueCat can send this; enable it if it's on your plan (unverified). Locturne has strong usage evidence: nights locked, mornings walked |

---

## 8. Family Sharing

- No published data shows Family Sharing raises conversion or revenue for a single-user app.
  RevenueCat's docs only state the trade-off. Family-shared transactions are excluded from
  RevenueCat charts (https://www.revenuecat.com/docs/apple-family-sharing) [E].
- **It's irreversible per product.** Once enabled for a subscription it can't be turned off
  (Apple developer forums, https://developer.apple.com/forums/thread/743727; App Store Connect
  help).
- For Locturne:
  - Every family member would still need their own FamilyControls authorization and setup.
  - The likely sharers are parents adding teens, which pulls toward the teen-account issues
    in `docs/TEEN_ACCOUNTS.md`.
- **Recommendation: don't enable it at launch** [confidence: medium].
  - If "my partner wants it too" shows up in reviews, add a *separate* family product later
    rather than flipping the switch on the main SKU.

---

## 9. Regional pricing (Gen Z, global)

- North America payers are worth $32 vs $14 for IN/SEA [B]. NA D35 conversion is 2.8% vs 0.7%
  for IN/SEA. IN/SEA refunds are 7.7% [B].
- Localization tests win 62.3% of the time (Adapty) [B], but "localization" there mixes
  language and price.
- PPP vendors report +15–122% revenue
  (https://www.mirava.io/blog/why-purchasing-power-parity-pricing-is-a-must-for-mobile-apps).
  That's vendor marketing [E].
- **Recommendation:**
  - Launch on Apple's automatic price equalization from the US $59.99 base.
  - After 4 weeks, look at the `found` + storefront analytics. Manually lower annual only in
    storefronts with real traffic and poor install→trial. Likely candidates for an English
    TikTok audience: Philippines, India, Brazil, Mexico, Indonesia, Turkey. Target about
    $20–30 equivalent.
  - Remember that UK/EU prices include VAT, so proceeds there are about 15–20% below the
    sticker price before Apple's cut. Don't raise UK/EU above equalization at launch.
  - Confidence: medium.

---

## 10. Realistic launch funnel and cash model

### Assumptions (each with a source)
| Input | Pessimistic | Base | Optimistic | Basis |
|---|---|---|---|---|
| Install→trial | 6% | 10% | 15% | RC H&F 6.9% median; Adapty H&F 11.2% (NA 14.5%); Opal 17% (Sub Club) |
| Trial→paid (annual, 7-day) | 25% | 33% | 42% | RC annual 5–9 days 33.0%; RC H&F 37.7%; Adapty H&F 42.2%; young audience pulls this down |
| Refunds | 6% | 5% | 5% | H&F 4.7%; hard paywall 5.8% |
| Net proceeds per annual payer (blended) | $44 | $44 | $46 | US $59.99 × 0.85 = $50.99. Blended down for VAT markets and equalized lower prices (about 70% US assumed) |
| Monthly direct buys | ~0.5% of installs × $8.49 | same | same | small |

### Output
- **Year-one net cash per install:**
  - pessimistic **≈ $0.65**
  - base **≈ $1.40**
  - optimistic **≈ $2.80**
- Cross-checks:
  - Adapty H&F 12-month install LTV is $1.21.
  - RevenueCat H&F D60 RPI is $0.66 across *all* models. The hard-paywall RPI of $3.09 is an
    all-category gross figure.
  - Erly is about $1 per download at $29.99.
  - The base case sits between the H&F median and hard-paywall levels. That's plausible, not
    conservative.
- **Renewals add little in year two:** about 25% renew, so roughly +$0.35 per install
  (base case), and only from Jan 2028.

### Installs needed for $1.5–2K per month net cash
Annual billing means cash ≈ new annual payers that month × $44.

| Case | Payers needed/month | Installs needed/month | Views needed at 2 installs per 1K views (`1K_MRR_PLAN` target) |
|---|---|---|---|
| Pessimistic | 34–45 | **~2,300–3,100** | 1.2–1.6M |
| Base | 34–45 | **~1,100–1,450** | 0.55–0.7M |
| Optimistic | 34–45 | **~550–720** | 0.3–0.4M |

**This is a treadmill.** Annual cash doesn't recur monthly the way MRR suggests. Holding
$1.5–2K a month needs that install rate every month. The founder's track record (~1M views
per app) covers the base case *if* the views keep coming.

### Cash timing (Apple pays "within 45 days of the last day of the fiscal month")
Sources: https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments ;
15% Small Business Program rate starts "15 days after the end of the fiscal calendar month"
in which enrollment is approved (https://developer.apple.com/app-store/small-business-program/).

- A trial started Jan 2–5, 2027 charges Jan 9–12. That falls in Apple's January fiscal month,
  which ends around late January. **Payout comes around early March 2027.**
- Trials started in the second half of January charge in late January or early February.
  Some of those slip into the February fiscal month, paid around early April.
- **Practical upshot:** the first real money arrives about 2 months after launch.
  - The 14-day exit arm and any longer trial push a slice of it a month further out.
  - The pay-up-front exit offer (section 6.3) is the only paywall element that *pulls* cash
    forward.
- **Admin:** enroll in the Small Business Program **now** (already on the `1K_MRR_PLAN`
  checklist), so 15% is in effect well before January.

---

## 11. Concrete recommendations by screen

### `offer` (trial timeline)
- **Keep it** [A: Blinkist +23%; None to Run +23–25%].
- Change "Day 7 charge" to the actual date and price, e.g. **"Jan 9 · $59.99, unless you
  cancel. I'll remind you Jan 7."** The plans screen already uses `dateFromToday`. A concrete
  date beats "Day 7" for the "I'll forget" worry. [E, consistent with Blinkist]
- Confidence: medium.

### `plans`
1. **Ship as is**, with two additions:
   - App Review note about the reminder switch.
   - On a StoreKit `cancelled` result, route to `declined` once.
2. **First structural test:** annual-only card + "Other plans" link vs the current two cards.
   [A: Mojo +15–20 pp annual; plan count wins 57%]
3. **Second:** CTA "Try 7 nights for $0.00" vs "Start 7-day free trial". [A: Duolingo]
4. **Third:** monthly $12.99 vs $9.99. [E/B]
5. **Fourth, once there are ~6–7K installs per arm:** annual $39.99 vs $59.99, judged on D35–60
   net cash per install. [B]
6. **Don't add:** weekly, lifetime, per-day pricing, struck-through prices, countdowns.

### `declined`
1. Two arms at launch: **14-day (50%) vs none (50%)**, measured per paywall viewer.
2. Rebuild half-price as **first year $29.99, then $59.99, pay up front**. Hold it as arm 3.
   Retire the forever-$29.99 product: don't attach it to any offering. Product IDs can't be
   reused, so just leave it unused.
3. Trigger on paywall close **and** on the first cancelled purchase sheet.
4. Suggested Loc copy for the pay-up-front arm:
   - Headline: *"Fine. Half price."*
   - Body: *"$29.99 for your first year, then $59.99. This only shows up here, once."*
   - Aside: *"Don't tell the others."* (keep)

### After purchase (not onboarding, but where the money is kept)
- Retention Messaging (App Store Connect path).
- Billing Grace Period.
- In-app note for users who cancelled during the trial, on morning 2–3.
- Consumption info for refund requests.
- Win-back offers for monthly churners from about March 2027.

---

## 12. Where this disagrees with earlier repo docs

- **`APPLIED_TO_LOCTURNE.md` #6 and `1K_MRR_PLAN.md` §5:** both call for cutting the exit
  test. I agree with two arms, but say **keep a `none` holdout and swap half-price's
  structure** rather than drop discounting entirely.
- **`PRICING_RESEARCH.md`** quotes "annual about 28% renew". The H&F-specific figure is
  **25%**, and **23% for high-priced plans**. Use 23–25% for $59.99.
- **`PAYWALL_VIDEO_NOTES.md`** said to keep lifetime at about 2–2.5x annual. It has since been
  dropped, and I agree for the launch paywall. The cash math (lifetime $99.99 > expected
  2-year annual of ~$75) means a lifetime *upsell to existing annual subscribers* before their
  renewal is worth testing later.
- **The 3.3% vs 6.8% refund figure** for exit offers comes from comparing non-comparable
  groups. It shouldn't be cited as evidence that discounts lower refunds.

## Gaps (could not verify)
- An A/B test isolating a trial-reminder switch on the paywall.
- Lifetime share-of-revenue data.
- An app-specific charm-pricing test.
- Exact RevenueCat price-tier definitions.
- Whether users who only trialed are eligible for promotional offers.
- Current Advanced Commerce API scope.
- Whether this developer account can use Retention Messaging today.
