# Web funnels, link-outs and paid CAC: where the money actually is

Researched 2026-10-08. Angle 1 of the "edge to $10K MRR" study.
Builds on docs/10K_MRR_PLAN.md, docs/PRICING_RESEARCH.md and docs/COMPETITOR_MARKETING.md.
It does not repeat them.

**Labels.** **V** = primary source or official doc. **S** = secondhand (vendor blog, press, agency).
**U** = unverified, or my own estimate or math. Most benchmark numbers in this space come from
vendors who sell the tools, so they are at best S.

---

## TL;DR

1. **Link-out is legal in the US today, and Apple takes 0% of it.** That could change in 2027.
   Apple has proposed 15% (5% for small businesses). The Supreme Court is reviewing the contempt
   finding. Plan as if the free window closes. (V/S)
2. **For Locturne, the fee saving from a web paywall is small.** You will be in Apple's Small
   Business Program at 15%. Web via Stripe saves about **$6 per $59.99 annual sale (about 12%)**.
   Every published test shows link-out conversion falling 5–26%. That wipes out the gain.
   Superwall's own model shows about **−1.3% net** for Small Business Program apps. (S/U)
3. **Paid ads only work at Locturne's price through Apple Ads on intent keywords.** US Health &
   Fitness median CPI is about $3.77, against about $7.80 on Meta. At about 7.5% download-to-paid,
   that is roughly **$50 per payer on Apple Ads versus $104 on Meta**. The first year is worth
   about $50 net, so Meta loses money and Apple Ads breaks even, before any optimisation. (S/U)
4. **The real edge is not fees. It is three things:** (a) Apple Ads exact-match on a handful of
   high-intent morning and bed phrases, with a matching Custom Product Page; (b) spending paid money
   *only* to boost organic videos that already won, never on new ad creative; (c) later, a web
   checkout used for its **cash-flow speed** (Stripe pays in about 2 days, Apple in about 33–75)
   and for out-of-app win-back offers, not as the main paywall.
5. **Recommendation:** launch with IAP only. Spend the first $100 on Apple's free Apple Ads credit.
   Add RevenueCat Web Billing (no extra RevenueCat fee) once you pass about $2K MRR. Use it first
   for email or SMS win-back and annual offers, then A/B test a US link-out button for 4+ weeks.
   Do not build a Meta web-quiz funnel in 2026–27.

---

## 1. Legal status of linking out (October 2026)

### United States

| Date | Event | Label |
|---|---|---|
| 30 Apr 2025 | Judge Gonzalez Rogers holds Apple in contempt. She bans any commission on link-out purchases and bans "scare screens". Apple changes its guidelines within a day. | V/S |
| 2 May 2025 | Apple guideline 3.1.1(a): US-storefront apps need no entitlement for buttons, links or calls to action to web purchase. | V |
| 11 Dec 2025 | The Ninth Circuit (No. 25-2935) **affirms contempt**. It rules the total commission ban overbroad. Apple may charge a fee limited to costs "genuinely and reasonably necessary" for the link hand-off. The case goes back down to set that rate. The court also upholds the bans on deterrent messaging. Apple may require the IAP button to be at least as prominent as the web button. | V/S |
| 30 Mar 2026 | Rehearing denied. | V |
| Apr 2026 | The Ninth Circuit lifts its stay, so the remand can proceed. | S |
| May 2026 | Justice Kagan denies Apple's request to stay the mandate. | S |
| 30 Jun 2026 | **The Supreme Court grants cert, limited to Question 1.** That question is whether contempt can rest on the "spirit" of an injunction that never mentioned commissions. The Court declined Question 2, which asked whether relief should cover only Epic. | V/S |
| 13 Aug 2026 | Apple's remand proposal: **15%** standard, **10%** for renewals and partner programs, **5%** for Small Business Program developers. Epic says the right number is about 0%. The Supreme Court refuses to pause the remand. | S |
| 14 Sep 2026 | Apple files its Supreme Court merits brief. No argument date was found. | V |

**What is allowed for a US app today (V, App Review Guidelines 3.1.1(a) and 3.1.3):**

- A button, link or price comparison sending US users to your own web checkout is allowed, with
  no entitlement and no Apple fee **for now**.
- **You must still offer IAP in the app.** Cal AI was briefly pulled in April 2026 for hiding
  Apple's option behind Stripe-only checkout and a misleading trial toggle (guideline 3.1.2(c)).
  It came back after fixing both. (S, TechCrunch)
- 3.1.3(b): content bought on the web may unlock in the app if it is also sold as IAP. (V)
- 3.1.3: "Developers can send communications outside of the app to their user base about purchasing
  methods other than in-app purchase." This is allowed **in every country**, not just the US. (V)
- Gate the link-out UI to the US storefront. Other storefronts still reject it. (V/S)

**Risk:** if the Supreme Court reverses the contempt finding (decision likely by mid-2027, U),
Apple could reinstate a 27% (12% for small businesses) link-out fee. Even if Apple loses there,
the remand will probably set some fee. Apple's own 5% small-business proposal is a reasonable
planning number. (U)

### EU, Japan, elsewhere

- **EU (from 1 Oct 2026):** link-out purchases pay a single **15%** (10% for qualifying
  developers). In-app IAP is 15% for most small developers. So the link-out saving in the EU is
  roughly zero for Locturne. (S, 9to5Mac, Aug 2026)
- **Japan (MSCA, Dec 2025):** web link-out about **15%**, third-party in-app payments about 21%.
  A coalition of more than 600 companies calls it unviable. (S)
- **Everywhere else:** IAP only in the app. Out-of-app email is fine. (V)

**Bottom line:** web link-out is a US-only lever for Locturne, and probably temporary.

---

## 2. Web funnels

There are two different things, often confused:

- **App-to-web (link-out):** the user is already in the app and taps "Pay on web".
- **Web-to-app (web2app):** an ad leads to a web quiz, then a web paywall where the user pays,
  then the app download. The purchase happens before install. This was legal before Epic, because
  nothing happens in the app. It is how BetterMe, Noom, Zumba and others buy users on Meta.

### Tools and fees

| Tool | What it does | Fee | Label |
|---|---|---|---|
| RevenueCat Web Billing (Stripe) | Web paywall, web purchase links, redemption links that unlock the app with no login, US link-out button | No extra RevenueCat fee beyond the normal plan (free to $2.5K MTR, then about 1%). Stripe 2.9% + $0.30, Stripe Tax $0.50 optional. Stripe Billing 0.7% only if you use the Stripe Billing integration | V (docs) / S (1%) |
| RevenueCat + Paddle | Paddle is the merchant of record and handles global sales tax | Paddle about 5% + $0.50 | S |
| Stripe Managed Payments (MoR) | Stripe as merchant of record | About 3.5% on top, so about 6.4% + $0.30 | S |
| Superwall web checkout (Stripe) | Web paywalls and link-out tests without app updates | Paywall fee about 1% above a free $10K monthly attributed revenue tier (Indie). Plus Stripe. | S |
| FunnelFox / web2app.tools / Adapty / Botsi | Full Meta-ad quiz funnels | Not published. Sales-led and aimed at teams spending heavily. | U |

### What the data says (all vendor data, so S at best)

| Test | Conversion | Revenue | Notes |
|---|---|---|---|
| Superwall link-out test, May 2025 | **−11.9%** paywall conversion | **+19.9% net proceeds** at 30% Apple fee; **−1.3% at the 15% Small Business rate** | Sample not disclosed |
| RevenueCat's own app, May 2025 to Apr 2026 | 7.8% → 7.4% (**−5%**) | Active subs −1%; refunds **+36%**; subs set to renew on web more than 2× (users forget to cancel) | RevenueCat titled the post "Why you shouldn't use app-to-web" |
| Adapty App 1, standard 30% tier | 4.95% → 3.69% (**−26%**) | ARPU **+53%**, mainly from selling longer web-only plans | One app |
| Adapty App 3, Small Business 15% tier | Paid conversion +55% | **ARPU −9%** | The fee saving was too small |
| FunnelFox State of Web2App 2026 | 13% reach the paywall; **3% buy**; web 3.0% vs in-app 1.5% | Global ARPPU about $27–31. The plan mix is mostly 1-month (49%) and 1-week (31%) plans. **Annual is only 12%.** | Self-selected sample. Several headline numbers in the report contradict its own charts. |
| FunnelFox refunds | 92% of refunds happen in the first month; median 1.6 days | **Annual plans refund about 18× more than weekly** | Relevant: Locturne is annual-first |
| FunnelFox payments | **30–50% of initiated payments fail**; retries recover up to 17.5% | Apple Pay is 60% of web payments | Apple Pay must be the default |
| RevenueCat SOSA 2026 | Web is **3.2%** of all revenue (4.9% in North America). Only **1.3%** of the smallest apps have any web revenue; 41% of the largest do. | | V (RevenueCat's own data) |

**How to read this.** The web wins are real for apps that (a) pay 30%, (b) sell weekly or monthly
plans to cold Meta traffic, and (c) have a growth team. Locturne has none of these at launch. It
pays 15%, sells a $59.99 annual plan with a 7-day trial, and is run by one person.

### Pitfalls specific to Locturne

1. **No accounts.** Web purchases need a way to unlock the app. RevenueCat **redemption links**
   handle this without a login (V). Without them you need to add sign-in, which is friction and
   App Review surface.
2. **Onboarding lives in the app.** Screen Time permission and app selection must happen on the
   phone. A web quiz would come before the "aha" moment of the onboarding, not replace it.
3. **Refunds and chargebacks become your problem.** Apple handles refunds on IAP. On Stripe,
   annual-plan refunds and disputes hit you directly, at about $15 per dispute (U). FunnelFox
   finds annual plans refund 18× more.
4. **Sales tax.** On plain Stripe you are the seller. Digital subscriptions are taxable in many US
   states. A merchant of record (Paddle about 5%) removes that work but halves the saving. (S/U)
5. **App Review.** Always show IAP alongside the web option, at equal prominence. Show the real
   billed amount and renewal terms clearly. Gate the button to the US storefront. (V)
6. **Two billing systems.** That means double the support, cancellation confusion and harder
   analytics. RevenueCat's verdict: treat it as a narrow, measured experiment. (S)

---

## 3. Paid acquisition unit economics

### Revenue per paying user (U, my math)

| Path | Gross | Fees | Net first year |
|---|---|---|---|
| IAP, Small Business Program 15% | $59.99 | $9.00 + about $0.60 RevenueCat | **about $50.40** |
| Web via RevenueCat + Stripe (US) | $59.99 | $2.04 Stripe + $0.50 Tax + $0.60 RevenueCat | **about $56.85** (before any sales tax owed) |
| Web via Paddle (merchant of record) | $59.99 | about $3.50 + $0.60 | **about $55.90** |
| Monthly $9.99, IAP | $9.99/mo | 15% | $8.49/mo |

Renewal adds value later. The RevenueCat 2026 report puts year-one retention for annual hard-paywall
subscribers at about 27% (S). Earlier studies put cheaper annual plans nearer 36%
(PRICING_RESEARCH). Two-year value is therefore about **$50 + 0.3 × $50 ≈ $65** (U).

**Sustainable CAC (U):** the most you can pay per **paying subscriber** is about **$50** for
first-year break-even and about **$60–65** for two-year break-even. Since you are cash-poor, target
**≤ $35 per payer**, which still pays back within the first year.

### Channel cost benchmarks (US, iOS)

| Metric | Apple Ads (search) | Meta | TikTok | Label |
|---|---|---|---|---|
| CPT / CPC | H&F median CPT **$1.68**, Productivity $1.74, Utilities $1.23 (2025, about 2,800 US advertisers) | Avg CPC about $0.78–1.14, CPM about $12–14 | Spark Ads CPM about $10 | S (AppTweak) / S |
| CPI | H&F **$3.77**, Productivity **$3.58**, Utilities $2.25 | Subscription H&F median **$7.80** (IQR $5–12); productivity $6.20 | Tier 1 health $3.50–8.00 (wide disagreement) | S |
| Tap-to-install | H&F 50%, generic keywords 54%, competitor keywords 50%, brand 73% | | | S |
| Trial-to-paid | H&F median **37.7%**; 5–9 day trials 37.4% | same | same | S (RevenueCat 2026) |
| Download-to-paid D35 | Hard paywall median **10.7%** (was 12.1%); H&F all-model median 2.9% | | | S (RevenueCat 2026) |
| Minimum budget | **None.** $100 credit for new advertisers | About $5/day technically; Meta says aim for 50 events per week per ad set | **$50/day per campaign, $20/day per ad group** | S |

### Cost per payer (U, my math, at 7.5% download-to-paid per the 10K plan)

| Channel | CPI | Cost per payer | vs $50 net |
|---|---|---|---|
| Apple Ads, long-tail exact match (CPI about $2.50) | $2.50 | **$33** | Profitable |
| Apple Ads, H&F median | $3.77 | **$50** | Breaks even |
| Apple Ads, competitor terms ("opal", "one sec") | about $4–6 | $55–80 | Loss unless conversion is high |
| Meta app install, median | $7.80 | **$104** | Heavy loss |
| Meta, boosting a proven organic video (CPI about $3–4, U) | $3.50 | $47 | Near break-even |
| Meta web2app (CPC $0.90 ÷ about 2% annual-trial checkout, U) | n/a | about $45 per trial, about $100+ per payer | Loss |

Payback is immediate when the annual plan converts. But **Apple pays out about 33–75 days after
the sale** (by the end of the following fiscal month, S), and Stripe pays in about 2 business days
(S). At $10/day you are floating about $300–600 before Apple pays. That is fine at that scale. The
cash-flow gap only bites at $100+/day.

### Apple Ads keywords

Apple publishes no per-keyword CPT, and no third-party source had data for these exact terms. You
must look them up in the Apple Ads keyword planner (popularity 5–100) before bidding. My
expectations, all **U**:

| Term | Expected competition | Why |
|---|---|---|
| "screen time" | **High.** Opal, one sec, ScreenZen, Jomo and Apple's own Screen Time intent all compete | Broad, high volume, mixed intent (parents) |
| "app blocker" | **High.** Opal's subtitle is "Focus, App Blocker & Timer" | Core category term |
| "alarm clock" | **Very high, low fit.** Alarmy and many alarm apps; most searchers want a plain alarm | Volume is not intent |
| "sleep" | Very high, wrong intent (sounds, trackers, Calm) | Avoid |
| "stop scrolling" / "phone addiction" | **Medium** | Intent matches |
| Long tail: "stop scrolling in bed", "app blocker morning", "alarm get out of bed", "wake up app blocker" | **Low.** Likely popularity 5–20, cheap taps | Matches the product exactly. Start here. |

---

## 4. Recommendation for a cash-poor solo founder

### Web paywall: not at launch

- **At launch (Jan 2027):** IAP only via RevenueCat. Join the Small Business Program (15%).
  Add no web checkout. The saving is about $6 per sale. Measured conversion loss of 5–26% cancels
  it, and Apple's link-out fee may return in 2027.
- **At about $2K MRR (around month 3–4):** turn on **RevenueCat Web Billing with Stripe**. Do not
  use it as the main paywall. Use it for:
  1. **Out-of-app win-back and annual-upgrade emails** to lapsed and monthly users. This is legal
     in every country (3.1.3) and costs 3% instead of 15%.
  2. **Creator link-in-bio pages** with a code or discount, unlocked through redemption links.
  3. Faster cash: about 2 days instead of about 2 months.
- **At about $5K MRR with US paid traffic:** A/B test a US-only "Save on web" button against IAP,
  50/50 for at least 4 weeks, with Apple Pay as the default. Keep it only if **net revenue per
  paywall viewer** wins at day 60, after refunds.
- **Do not** build a Meta quiz funnel. That model suits weekly or monthly plans, $10K+/month
  spend and a growth team. (S, FunnelFox, RevenueCat)

### Paid acquisition with tiny budgets

**Rule zero:** paid money only amplifies what organic already proved. Do not spend until organic
shows a paywall-view-to-trial rate of at least 8–10% from real users (U threshold).

**Phase 1: Apple Ads, free money first (launch week to week 4)**

- Use Apple Ads Advanced, not Basic, to claim the **$100 credit**.
- One campaign, US only, **exact match**, 8–15 long-tail morning and bed phrases, plus your own
  brand name.
- Max CPT $1.50. Daily budget **$5–10**.
- Point it at a Custom Product Page whose first screenshot is "Your apps stay asleep until you get
  out of bed".
- **Kill rules (U):** pause a keyword after 30 taps with no trial. Pause the campaign if cost per
  trial stays above **$20** after 15 trials. At 37–45% trial-to-paid, $20 per trial is about
  $45–55 per payer.
- **Scale rule:** if cost per trial is at or below $12 (about $30 per payer) after 20+ trials, raise
  the budget 30% per week. Watch that day-8 trial conversion holds.

**Phase 2: boost proven organic winners (from month 1 to 2, once videos exist)**

- Take any organic video that hits 3× your median views **and** produces sign-ups.
- Boost it on Meta as a **Partnership/Reel ad** at **$10/day for 7 days ($70 per test)**.
  Optimise for app install with a RevenueCat-linked trial event.
- TikTok Ads Manager's $50/day campaign minimum rules it out until you are profitable. Use TikTok
  Promote on your own posts for small tests, if offered (U).
- **Kill if** CPI is above $5 or cost per trial is above $20 after $70.
- **Budget cap:** never let total monthly paid spend exceed **30% of last month's net revenue**
  until a channel has shown cost per payer below $35 for 4 straight weeks.

**Phase 3: scale what clears $35 per payer (month 3+)**

- Move paid creator retainers (see 10K_MRR_PLAN §6) into the same budget, judged by the same
  $35 bar.
- Send RevenueCat's "trial converted" event to Meta. Optimise for trial starts until you have
  50+ events per week per ad set (S, RocketShip HQ).

### Rough numbers for the plan (U)

| Month | Paid spend/day | Cost per payer | New payers from paid/mo | MRR added from paid |
|---|---|---|---|---|
| Jan 2027 | $5–10 (Apple credit) | $35–50 | 5–8 | about $25–35 |
| Mar 2027 | $15 | $35 | about 13 | about $55 |
| Jun 2027 | $50 | $35 | about 43 | about $180 |
| Dec 2027 | $150 | $40 | about 110 | about $470 |

So paid ads are a **multiplier on organic, not a path to $10K by themselves**. About 210 new annual
payers a month (about $10K MRR at steady state after year one) would cost about $7–10K/month in
ads at a $35–50 cost per payer. That is only affordable once organic revenue already exists.

---

## 5. The strongest edge found

**Long-tail morning-intent Apple Ads plus a matching Custom Product Page.** It is the only paid
channel where Locturne's $59.99 annual price clears CAC with median-level numbers. The exact
phrases ("stop scrolling in bed", "alarm get out of bed") describe Locturne's whole product and
probably nobody else's. Competitors with bigger budgets fight over "screen time" and "app blocker".
The cost to test it is $0 after the credit.

Second edge: **cash velocity through Stripe for out-of-app offers.** It is small but real for a
founder with $0–100/month.

Not an edge: the web paywall fee saving at the 15% tier. The numbers say it is a wash or a loss.

---

## Sources

Legal
- Ninth Circuit opinion, Epic v. Apple No. 25-2935 (11 Dec 2025): https://law.justia.com/cases/federal/appellate-courts/ca9/25-2935/25-2935-2025-12-11.html
- Fenwick summary: https://www.fenwick.com/insights/publications/ninth-circuit-largely-upholds-ruling-in-epic-v-apple
- Mondaq summary: https://www.mondaq.com/unitedstates/trials-appeals-compensation/1724710/epic-v-apple-the-ninth-circuit-weighs-in
- Supreme Court docket 25-1311: https://www.supremecourt.gov/docket/docketfiles/html/public/25-1311.html
- Apple merits brief (14 Sep 2026): https://www.supremecourt.gov/DocketPDF/25/25-1311/424150/20260914154510009_2026-09-14%20No.%2025-1311%20Apple-Epic%20Merits%20Opening%20Brief.pdf
- AppleInsider, cert granted (30 Jun 2026): https://appleinsider.com/articles/26/06/30/us-supreme-court-agrees-to-hear-apples-epic-games-appeal
- SCOTUSblog, stay denied (May 2026): https://www.scotusblog.com/2026/05/court-tuns-down-apples-request-to-pause-order-holding-it-in-contempt/
- TechCrunch, Apple proposes 15% (14 Aug 2026): https://techcrunch.com/2026/08/14/apple-proposes-to-take-a-15-cut-of-purchases-made-outside-the-app-store/
- Digit, 15/10/5 tiers: https://www.digit.in/features/gaming/apple-vs-epic-games-explained-six-years-of-legal-war-ends-with-a-15-commission-offer.html
- Apple App Review Guidelines 3.1.1(a), 3.1.3: https://developer.apple.com/app-store/review/guidelines/
- TechCrunch, Cal AI crackdown (21 Apr 2026): https://techcrunch.com/2026/04/21/apples-cal-ai-crackdown-signals-its-still-policing-the-app-store/
- 9to5Mac, EU fee overhaul (18 Aug 2026): https://9to5mac.com/2026/08/18/apple-overhauls-app-store-fees-in-the-eu-with-new-unified-terms/
- Automaton, Japan MSCA fees: https://automaton-media.com/en/news/new-japanese-law-meant-to-ensure-fair-competition-for-mobile-game-developers-neutralized-by-apples-new-japan-specific-fees/

Web funnels
- Superwall, app-to-web initial data: https://superwall.com/blog/initial-data-is-in-app-to-web-conversion-rates-after-the-app-store-ruling
- RevenueCat, "Why you shouldn't use app-to-web" (Apr 2026): https://www.revenuecat.com/blog/growth/why-you-shouldnt-use-app-to-web
- RevenueCat app-to-web (GRTV case): https://www.revenuecat.com/app-to-web
- RevenueCat Web Billing docs: https://www.revenuecat.com/docs/web/overview
- RevenueCat redemption links: https://www.revenuecat.com/docs/web/redemption-links
- RevenueCat web purchase button: https://www.revenuecat.com/docs/tools/paywalls/creating-paywalls/web-purchase-button
- Adapty, web paywalls one year in (Sep 2026): https://adapty.io/blog/app-to-web-paywalls-ios-one-year-data/
- FunnelFox, State of Web2App 2026: https://funnelfox.com/state-of-web2app/
- Admiral Media, web2app vs app install: https://admiral.media/web-to-app-vs-app-install-ads/
- Stripe Managed Payments fees (competitor blog): https://dodopayments.com/blogs/stripe-managed-payments-fees-explained
- Superwall vs RevenueCat pricing guide: https://newly.app/guides/revenuecat-vs-superwall
- Paddle, what Cal AI taught us about app2web: https://www.paddle.com/blog/what-cal-ai-taught-us-about-app2web

Paid acquisition
- AppTweak Apple Ads benchmarks 2026: https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks
- Sonar, Apple Search Ads cost and indie budgets (Sep 2026): https://trysonar.app/blog/apple-search-ads-cost
- SplitMetrics CPT benchmarks: https://splitmetrics.com/benchmarks/cost-per-tap-cpt/
- RocketShip HQ, Meta cost benchmarks: https://www.rocketshiphq.com/meta-cost-benchmarks-mobile-app-installs/
- RocketShip HQ, trial vs paid optimisation: https://www.rocketshiphq.com/meta-optimize-trial-starts-vs-paid-conversions-ios/
- Admiral Media, 2026 benchmarks: https://admiral.media/mobile-app-marketing-benchmarks-2026/
- Semnexus, TikTok vs Meta 2026: https://semnexus.com/tiktok-vs-meta-app-user-acquisition-2026-performance-data
- RevenueCat, State of Subscription Apps 2026: https://www.revenuecat.com/state-of-subscription-apps
- Adapty, State of in-app subscriptions 2026: https://adapty.io/state-of-in-app-subscriptions/
- TikTok minimum budgets: https://tlinky.com/tiktok-ads-minimum-budget/
- Meta budget guidance (50 events/week): https://developers.meta.com/horizon/resources/launch-ad-campaign/
- Apple payouts overview (timing, S): https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments
