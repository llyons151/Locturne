# Trundle idea scorecard

September 24, 2026. This is a rating of the idea, a plan to raise it, and a revenue
model. It builds on [VALIDATION_RESEARCH.md](VALIDATION_RESEARCH.md) (sections 13–14
cover the hard paywall and Opal Sleep) and three new research passes on revenue,
winners vs. losers, and demand. The scores and probabilities are **[OPINION]**; the
inputs are cited below. [GAME_PLAN.md](../GAME_PLAN.md) stays the source of truth
until it is updated.

## Rating: 6 / 10 as currently framed

| Dimension | Score | Why |
|---|---|---|
| Problem strength | 9 | Pew (Sept 2026, n=9,750): 62% of smartphone owners aged 18–29 say it hurts how much sleep they get, and only 25% of people who tried to cut back say it went extremely or very well. About 85% check their phone within 10 minutes of waking. |
| Willingness to pay | 7 | Opal converted 20% of downloads to paid when it had a hard paywall; Brick and Bloom sell $39–59 hardware. Price pushback starts around $100/yr. |
| Founder–market fit | 8 | Short-form video is how this category grows (Quittr, BePresent, Early, Finch). |
| Structural retention | 6 | A nightly lock keeps working by default, but Health & Fitness annual renewal is the lowest of any category (about 28–30%). |
| Differentiation | 4 | Opal Sleep covers bedtime plus a one-hour morning lock. At least 12 walk-to-unlock clones exist; none has more than about 155 ratings. |
| Defensibility | 3 | Every feature can be copied in a sprint. The only moats available are voice/brand, distribution and trust. |
| Technical feasibility | 5 | Screen Time API bugs are unresolved (one sec's founder listed 7 in March 2026). Long DeviceActivity schedules misfire, and the Family Controls entitlement is needed per extension. |

## The biggest finding: lead with the morning, not the night

- **The bedtime half is taken.** Opal advertises "Sleep Time 10PM–8AM Block All"
  as a preset tile.
- **The morning half is a proven market that no blocker owns.**
  - Alarmy: 82M downloads and about $15M revenue (2022).
  - **Early**, a push-up alarm built on iOS 26 AlarmKit, went from $1K in week 3
    to about $50K/month four months after its December 2025 launch, at $29.99/yr
    and $2–3 creator CPMs [founder via Starter Story, medium evidence].
- **Walk-to-unlock alone has never broken out.** It only scaled when bundled into
  something bigger (Unrot, Alarmy's walking mission).

**Reframe:** Trundle is *the alarm that won't give your apps back until you get out
of bed*, and the bedtime lock is what sets up the morning. Opal ends mornings at a
clock time while you're still in bed; Trundle makes you get up. That is the video,
the App Store headline and the difference from Opal.

## How to make it a 10

Ranked by leverage.

1. **Morning-first positioning plus an AlarmKit alarm.** The alarm wakes you, your
   apps stay asleep, and you walk 200 steps to wake them. Market it against
   Alarmy and Early, not Opal.
2. **Reliability is the product.**
   - Chain DeviceActivity intervals under about 45 minutes instead of one long
     schedule.
   - Run a nightly self-check that the shields actually applied.
   - Detect when Screen Time access has been revoked, and say plainly when a block
     failed.

   One silent failure ends trust (see the Steppin reviews and Opal's June 2026 V4
   bug).
3. **Live step counting with CoreMotion, narrated in his voice.** Don't use
   HealthKit: it lags and can't be read while the phone is locked. Add light
   anti-shake checks, since TikTok already has "how to cheat a walk app" pages.
4. **Humane exits from day one.** A few scarce, voiced "sick / travel / baby asleep"
   passes per month (the Brick model), plus a non-walking accessible option. No
   competitor handles these cases, and it helps App Review.
5. **Quiz onboarding, then a hard paywall.**
   - Build the quiz around one number from the user's own answers.
   - Schedule tonight's lock *during* onboarding (an Opal A/B win).
   - $29.99–34.99/yr. Cheaper annual plans renew at 36% vs. 23%.
   - Show plain renewal terms (guideline 3.1.2). No fake timers.
   - Keep a freemium fallback ready: Opal's revenue grew after it went free.
6. **The voice is the moat.**
   - A large library of lines that react to lateness, streak, weekday, weather and
     excuses.
   - A daily morning share card ("Bed 11:41. Up 7:02. 213 steps. Still
     disappointed.").
   - A streak widget and a bedtime Live Activity.
7. **A distribution engine, not one viral hit.**
   - Post as the founder daily or near-daily across 2–3 accounts, plus a
     creator-retainer pilot at $2–3 CPM.
   - Measure payers per 1K views, not views.
   - $10K MRR takes about 20–25M views a year.
8. **Buddy or couples mode.** A partner gets a message if you break bedtime, and a
   partner can hold the Screen Time passcode (iOS 26.4 requires it to revoke
   access). Opal doesn't have this.
9. **Evidence moat.** Collect opt-in "bedtime shift" data from launch and publish a
   result (the one sec playbook: its peer-reviewed study is a lasting advantage).
10. **Request the Family Controls distribution entitlement now.** Approval takes
    days to months. *(Submitted 2026-09-28, one account-level request.)*

Done well, 1–7 make it an 8/10 idea. A 10 needs the market's verdict: videos that
convert and D30 blocking still active above 20%.

## Revenue model

**Base rates** (RevenueCat 2026, 115K apps):
- Only **17.3% of new apps reach $1K MRR within two years, and 4.6% reach $10K**.
- 14,700 new subscription apps launch every month.
- Apps launched in 2025 or later hold only 3% of subscription revenue.

**Central inputs:**

| Input | Value |
|---|---|
| Installs per 1K views | 1.5, plus a 1.3× organic multiplier (weak evidence; comes from Quittr and Early) |
| Hard-paywall download→paid | 9–10% |
| Plan mix | 75% annual at $34.99 |
| Annual renewal | 28% |
| Year-one net revenue per payer | about $30 |

**What views are worth:** 1M views ≈ 1,950 installs ≈ 185 payers ≈ $5.5K of
first-year net revenue (about $550–650 MRR-equivalent). At $3 CPM, 1M paid views
costs $3K and returns about 2×, so paid creators are fundable if conversion hits
the median.

| Month-12 scenario | What it takes | MRR | Probability [OPINION] |
|---|---|---|---|
| Fizzle | ~1M views total (the founder's past pace), or conversion at P25 | under $1K | 45% |
| Solid | ~10M views/yr (daily posting plus some creators), median conversion | $3–6K | 30% |
| Strong | 25M+ views/yr, a creator engine, morning-first hook lands | $10–25K | 18% |
| Breakout | An Early- or Quittr-style hit, top-decile conversion | $50K+ | 7% |

**Honest summary:** the most likely single outcome is under $1K MRR. The expected
value is driven by the 25% chance of $10K+, and that chance depends almost
entirely on reaching 10–25M views a year and keeping D30 retention. The product
idea is good enough; the distribution machine and reliability decide the money.

## Sources (new in this pass)

- Pew, Sept 1, 2026: https://www.pewresearch.org/short-reads/2026/09/01/about-half-of-americans-say-they-spend-too-much-time-on-their-smartphone/
- AASM bedtime doomscrolling (Feb 2026): https://aasm.org/americans-are-doomscrolling-at-bedtime-prioritizing-screen-time-over-sleep/
- Reviews.org 2026 phone habits: https://www.reviews.org/mobile/cell-phone-addiction/
- Snooze study, Scientific Reports 2025: https://www.nature.com/articles/s41598-025-99563-y
- Opal founder, Sub Club 2026: https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026
- RevenueCat State of Subscription Apps 2026: https://www.revenuecat.com/state-of-subscription-apps
- Summary of RevenueCat 2026 base rates: https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth
- Renewal rates by category: https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category
- Early push-up alarm: https://www.indiehackers.com/post/how-a-simple-alarm-clock-app-makes-50k-month-RYmogGgIR0fKfLDBl7a0
- Quittr economics: https://startupspells.com/p/porn-addiction-app-quittr-250k-mrr-4-months
- BePresent TikTok network: https://www.socialgrowthengineers.com/productivity-app-tiktok-ig-strategy-to-20k-mrr-40k-installs
- Unrot: https://www.getbraavo.com/blog/how-unrot-bootstrapped-to-1m-downloads/
- Screen Time API bugs (one sec founder): https://developer.apple.com/forums/thread/819997
- iOS 26.4 revocation passcode: https://www.techlockdown.com/articles/ios26-update-screen-time-protected-app-permissions
- Brick emergency unbricks: https://getbrick.com/pages/emergency-unbricks
- Walk-app cheating on TikTok: https://www.tiktok.com/discover/how-to-trick-a-walk-app-think-your-walking
- Kroese 2016 (source of the unsupported "53%" statistic; don't use it): https://journals.sagepub.com/doi/abs/10.1177/1359105314540014

## Considered and rejected: money stakes / escrow

The idea: users deposit money into escrow and forfeit it to an "anti-charity" or a
friend if they break their limit. Commitment contracts do work for some people
(stickK, Beeminder). Rejected for Trundle **[OPINION]**:

- **GAME_PLAN rules it out.** The plan explicitly excludes money stakes and
  punishment mechanics.
- **The failure signal is unreliable.** Charging people money based on
  DeviceActivity events, which misfire, would lead to chargebacks, refunds and
  1-star reviews.
- **Regulation and Apple review.** Holding user funds brings money-transmission
  and escrow rules. Stakes also sit awkwardly with App Store payment rules. The
  habit app Pact faced FTC action over its charges.
- **It clashes with the brand.** The whole edge is "strict but kind". Losing money
  to a cause you hate is the most guilt-driven mechanic possible.
- **It's easy to escape.** Revoking Screen Time access or deleting the app gets
  around the stake.

The kind version that keeps the social pressure is buddy mode (item 8 above): a
friend gets a message, but no money moves. Money stakes might work as a separate
product, but not inside Trundle.

## New competitors found while checking names (September 24, 2026)

App Store search, US storefront:

- **Groggy: Stop Scrolling in Bed** (Till Moritz Theurer), released **Sept 16,
  2026**, 0 ratings. It locks apps at night; in the morning they unlock only after
  the user photographs each completed task. Its pitch is almost Trundle's:
  "Usual Screen Time blocker apps unlock when the clock says so, even if you are
  still in bed."
- **BedLock: morning focus** (David Ziman), released April 2026, 0 ratings. It locks
  apps until an AI verifies a photo of your made bed.
- **goob: get out of bed** (Nov 2025, 0 ratings) is an alarm with routines and
  challenges.

**Meaning:** the morning-unlock concept is being copied by other indies right now.
Nobody has traction yet. Speed, distribution, voice and reliability decide the
winner.

## Name candidates (undecided)

App Store availability was checked on September 24. Trademarks were not checked;
search https://tmsearch.uspto.gov in class 9 before committing.

| Name | Fit | Conflicts found |
|---|---|---|
| **Bandit** (favorite) | A raccoon's mask makes him a bandit: "he steals your apps at bedtime and gives them back when you get up." Easy to spell after hearing it. | No screen-time or sleep app uses it; only games and a tiny social app. It's a common word. |
| **Trundle** (keep) | A trundle bed slides out from under a bed, so the name is a sleep pun. | The League of Legends champion. |
| Sleepyhead | Teasing and warm | Tiny apps with 0–3 ratings |
| Lights Out | Clear | Puzzle games; too descriptive to trademark |
| Bedhead | Funny | The Bed Head hair-care brand. Avoid. |
| Groggy | Was the best fit | **Taken** by a direct competitor (above) |

Also taken or crowded: Yawn, Dozy, Nightlock, Tucked, Hush, Rouse, Upright,
Sleepover.

## The one sec blueprint

The founder of one sec didn't invent blocking. He added one psychological twist
(breathe before the app opens), and that twist carried the product. His lasting
moat was a peer-reviewed study showing 57% fewer app opens. A corrected detail
from a blurb the user shared: its first viral moment was a Twitter screen
recording, not TikTok.

For Trundle, blocking is the commodity and the twist is "your apps stay asleep
until you get out of bed." Two differences from one sec:
- **It fires once a day, not dozens of times,** so the morning moment has to carry
  the voice, the share card and the streak.
- **It's more complex to build,** so ship the smallest version first.

## "All-out marketing" expectation

This assumes about 25M views in year one (daily founder posting across 2–3
accounts plus paid creators) and uses the revenue model inputs above. It shows
first-year net revenue after Apple's 15% cut, before creator spend.

| Conversion | Installs | Payers | Year-1 net | MRR-equivalent |
|---|---|---|---|---|
| Low (0.5 installs/1K views, 4% pay) | ~14K | ~550 | ~$16K | ~$1.4K |
| **Central (1.5/1K, 9.5% pay)** | **~49K** | **~4.6K** | **~$139K** | **~$11.6K** |
| High (4/1K, 18% pay) | ~160K | ~29K | ~$864K | ~$72K |

- **Creator spend:** if half those views are paid at $3 CPM, that's about $37K.
- **Renewals:** only about 28% of annual subscribers renew, so year two has to be
  won with new installs.
- Views don't guarantee conversion. The pre-launch concept-video test is what
  narrows this range.
