# Sub Club, applied to Locturne

September 25, 2026. The Sub Club research ([README.md](README.md), [themes/](themes/))
checked against Locturne's onboarding and paywall as they are in the working tree today,
uncommitted edits included (`STEPS` in `content.ts`, `renderStep` and `plansStep` in
`onboarding-flow.tsx`). [GAME_PLAN.md](../../GAME_PLAN.md) stays the source of truth.
Disagreements are listed under "Conflicts", not silently applied.

**Citations:** `T02` = `themes/02-…md`, plus app/guest and batch/date. **Evidence tags,
strongest first:** A/B# (A/B with numbers) > A/B (no numbers) > Bench (RevenueCat
benchmark, correlational) > Obs (one app) > Anec > Opin. No episode covers a wake-up
app (T10), so everything is transferred; Opal is the closest analog.

---

## TL;DR

Ranked by evidence strength × fit to Locturne × effort.

1. **Make $59.99/year the biggest number on the Annual card.** Right now `$5.00/month` is the headline price and `($59.99/year)` is the small detail. That breaks GAME_PLAN's own 3.1.2 rule and the Cal AI precedent. Ship now.
2. **Put the trial timeline back, on the `offer` page:** Tonight, $0 / Day 5, I remind you / Day 7, $59.99 unless you cancel. Keep the three-card `plans` page after it. This is the most replicated paywall win on the podcast (T02: None to Run +23–25% A/B#; unbeaten at Opal; Built With Science A/B#).
3. **Before launch, decide how tests will be judged and wire it up.** The metric is net revenue after refunds per install at D35, and the paywall needs a remote-config SDK. Harder paywall variants win on trial starts and lose on refunds (T12: BoldVoice A/B, Mojo, Yousician). TestFlight can't measure trial→paid at all.
4. **Add one tap: "How'd you find me."** Opal calls it its most reliable attribution, and four other guests ask it too (T13). Without it, the "payers per 1K views" goal in GAME_PLAN can't be measured.
5. **Design the 7-day trial around three walked mornings:** teach on the first shield, surface the invisible night, and put a recap in the day-5 reminder. Activation is a count of the core action (T06: Aperture 2x trial→paid, Ladder 3, Zumba 3, Petit ~3).
6. **Put the half-price exit offer behind a flag and test it** against no offer and against "14 days free at full price". Discount variants have lost once refunds are counted (T01/T12: BoldVoice A/B; T08: Yousician), and extensions beat discounts (T08: Coconote). The $29.99 product will also show up as a downgrade in iOS Settings (T08: FitnessAI Obs).
7. **Detect trial cancellations and show one in-app save; turn on Billing Grace Period.** This was Opal's only day-1 re-engagement that worked (T08 A/B). Payment failures become about half of churn once churn is low (T08: Layfield Obs).
8. **Test fewer plans on the page:** annual only, with monthly and lifetime behind "Other plans". If lifetime stays, reprice it to about 2–2.5x annual. Fewer choices won at Burner (A/B), Opal (A/B) and Mojo (+15–20pp annual, A/B#) (T02, T05).

---

## Current flow audit

These are the 25 screens in `STEPS` order, plus `declined` (one exit from `offer`/`plans`) and `under-13`.

| # | Screen | What it does now | Evidence says | Verdict | Cite |
|---|---|---|---|---|---|
| 1 | `hello` | "No apps until you're out of bed." + Restore | Put the paywall after intent-building screens, not first | Keep | T01: Opal (B04 · 2024-01-10) A/B |
| 2 | `deal` | 3 beats + "About two minutes" | Say what the app does early | Keep. Make sure "two minutes" is true, since the doc says ~3 | T05: Hudson on Calm, Opin |
| 3 | `nights` (Q1) | Why they scroll; echoed on the loader | Why-are-you-here questions segment users, and echoing answers back helps | Keep | T05: Rapchat Obs, Hudson Opin |
| 4–6 | `night-minutes`, `nights-per-week`, `morning-minutes` | Inputs to the number | Current usage → personal report → projection is the flow Opal won with | Keep | T05/T10: Opal (B04) tactic in winning flow |
| 7 | `stat` (85%) | External statistic + his echo | A "many people do" reassurance interlude | Keep. Low stakes, weak source | T05: Hudson Opin |
| 8 | `age` | Lifetime line, under-13 gate | Age predicts payment. Opal branches on it; under-25s tend to trial and cancel | Keep. **Also log it as a segment** | T05: Opal A/B, Petit Obs, Burke Obs |
| 9 | `alarm` | Echoed on `offer` | Echo the user's story | Keep | T05: Hudson Opin |
| 10–11 | `tried` → `tried-echo` | Handles the objection ("Screen Time has an Ignore button. I don't.") | Social proof and reassurance should target the actual objection | Keep. The best-supported interlude in the flow | T09: Hudson, Burke |
| 12 | `time-back` | Gain frame → paywall headline | Emotional drivers beat functional ones | Keep | T09: Daphne Opin, Monarch Obs |
| 13 | `math` loader | ≤3 s, lists the inputs | No Sub Club evidence either way | Keep. Its test is low priority | none |
| 14 | `reveal` | Weekly number, year grid, "over N years of your life", Share | A personal number inside onboarding is the pattern Rise and Opal won with. Showing failed goals drives churn *after* onboarding | Keep. The lifetime line is loss framing, so test it later rather than cut it now | T05/T10: Rise, Opal. T07: Welltory Obs |
| 15–16 | `bedtime`, `wake` | Wheels with presets (default 11:30 PM / 7:00 AM) | Default the user into a commitment that runs tomorrow | Keep | T06: Opal A/B ("huge win") |
| 17 | `tomorrow` demo | Shield → 0→200 count | Deliver the aha inside onboarding | Keep. The strongest screen | T06: PhotoRoom, Rise, Calm |
| 18 | `screen-time` | Explainer + mocked Apple alert | Permissions belong in onboarding when the core feature needs them | Keep. Measure exits here once it's real | T10: Opal |
| 19 | `apps` | App picker | Picking creates investment. Removing Burner's picker screen lost | Keep | T05: Burner A/B |
| 20 | `ready` | "Tonight's lock is ready." | Automatic commitment | Keep | T06: Opal A/B |
| 21 | `commit` | Hold to agree | Friction that builds investment converts. Forcing a trial after investment gets paid back in refunds | Keep. It's voluntary and has no trial attached | T09: Burner A/B, Duolingo A/B, BoldVoice A/B |
| 22 | `offer` | Headline echo, Now/With-me rows, reassurance | Timeline paywalls win, and a multi-screen paywall beat a single one | **Change:** make this the trial timeline | T02: None to Run A/B#, Opal A/B, Mimo A/B# |
| 23 | `plans` | 3 cards (Lifetime / **Annual, big price $5.00/mo** / Monthly), reminder toggle on, CTA "Start 7-day free trial" | Show the billed price as the big number; fewer choices; annual first; "$0.00" CTA | **Change:** fix the price hierarchy now, then test plan count and CTA | T02: Burner, Mojo A/B#, Duolingo A/B |
| — | `declined` | Once: annual $29.99 with trial, "Don't tell the others." | An undismissable discount after dismissal lifted trials but lost on refunds. Blanket discounts teach users to cancel | **Test**, don't assume | T01: BoldVoice A/B. T08: Quizlet Opin, Yousician Obs |
| 24 | `armed` | Notification prompt after purchase | A reminder promise raises conversion | Keep. Add the Motion prompt here | T02: Duolingo A/B |
| 25 | `first-morning` | What tomorrow looks like; passes | "The best onboarding ends in something that happens tomorrow" | Keep | T06: Opal / B04 synthesis |

---

## Already right (don't undo)

- **Hard paywall after a long onboarding.** ~5x freemium conversion, equal year-1 retention (T01: SOSA 2026 Bench); Opal ~7%→~17% (A/B#); Zumba (A/B).
- **Length that builds belief, with a personal number.** Lose It (A/B#), Coconote +16% (A/B#), Zumba (A/B) (T05). Keep cutting screens that don't feed the number, a setting or an objection.
- **Echoing answers** (`NIGHTS_ECHO`, `ALARM_ECHO`, `TRIED_ECHO`, `OFFER_HEADLINES`) (T05: Hudson Opin, Tolan Obs).
- **The aha before the paywall** (`tomorrow`) (T06: PhotoRoom, Rise, Calm).
- **Setup with defaults that starts tonight, armed only after purchase** (T06: Opal A/B "huge win").
- **No login.** Coconote's biggest win was moving it after the paywall (T05). Defer, don't delete, if sync is ever needed (Savvy Navvy).
- **7-day trial on annual, none on monthly** (T03: Zumba A/B, Duolingo A/B; monthly-trial removal contested: Reading.com lost).
- **Annual selected by default.** A monthly default cost Weather Up ~60% of first-month LTV (T02 A/B#).
- **Reminder toggle on by default** (T02: Duolingo A/B, None to Run A/B#).
- **A visible exit; one offer that never loops** (T01: BoldVoice A/B; Life360 Opin).
- **Native IAP, no weekly, no trial toggle** (T11: Dipsy A/B#; [PRICING_RESEARCH.md](../PRICING_RESEARCH.md)).
- **$59.99 annual.** New-user price raises held at Skylight, Lose It, Coconote (T04 A/B).
- **Rating prompt after the first unlock** (T13: Steve Young Opin) and **no shame anywhere** (T07: Welltory Obs).

---

## Recommended changes

### Onboarding

**O1. Add "How'd you find me." Ship.**
- **Why:** Opal calls this its most reliable attribution. Marcus Burke, MySwimPro, Genius Scan and Babbel ask it too (T13; B04 · 2024-01-10, Opal Obs). GAME_PLAN says to measure "payers per 1K views", and that's impossible without knowing which account or creator an install came from.
- **Locturne version:** one moon question after `time-back`, before `math`, so it doesn't sit next to the paywall.
  - Title: "How'd you find me." Sub: "Be honest. I won't be hurt. Much."
  - Options: TikTok / Instagram / YouTube / A friend / App Store / Somewhere else.
  - If short-form accounts multiply, a follow-up could ask which account.

**O2. Log age as a segment. Ship (analytics only).** Under-25s trial and cancel more (T05: Petit, Burke Obs); Opal branches on age (A/B). Split every funnel metric by <18 / 18–24 / 25+; don't branch the UI yet.

**O3. Social proof near the paywall, only once it's real.** Proof should answer the objection and come from people like the user; "Join 20M users" does nothing for a small app (T09: Hudson Opin, Burke Obs), and US paywalls should stay clean (T02: Mojo A/B#). Locturne version: one real TestFlight quote on `offer` answering "can't I just turn it off?", first name and age. Ship when it exists.

**O4. Keep the always-blocked list out of onboarding; offer it in week 1.** Added choice failed in every Opal onboarding test (T05 A/B), but features set up in the first ~30 days stick (T06: Skylight Obs). Offer it once after a good morning on day 2–3: "Anything that should never wake up? Your call."

### Paywall

**P1. Fix the price hierarchy on the Annual card. Ship now.**
- **What:** in `plansStep`, the Annual card sets `price` to `$5.00/month` and `detail` to `($59.99/year)`. So the per-month figure is the big number.
- **Why:** GAME_PLAN says "the billed amount is the biggest price on each card". PAYWALL_VIDEO_NOTES and ONBOARDING_CONVERSION record the Cal AI removal and a September 21 rejection for exactly this. The per-month line does help (Mojo +10% US revenue, A/B#), but it has to be the subordinate line.
- **Locturne version:** "$59.99/year" as the big number, then "$5.00/month · 7 days free" in secondary text. The Save badge stays.

**P2. Make `offer` the trial timeline. Ship; it becomes the baseline.**
- **Why:** the most replicated win in the dataset: None to Run +23–25% trial starts, no trial→paid drop (A/B#); unbeaten by dozens of challengers at Opal (A/B); Duolingo (A/B); Built With Science annual share 60%→75–85% (A/B#). The September 25 redesign gave this up. A two-screen paywall is itself supported (Mimo +60%, A/B# cited).
- **Locturne version:** keep the Q7 headline and his line, then three dated rows:
  - **Tonight:** "{apps} sleep at {bedtime}. $0 today."
  - **Day 5:** "I remind you. Grudgingly."
  - **Day 7, {date}:** "$59.99 for the year, unless you cancel. Two taps in Settings."
  - Then the one-line reassurance ("Only the apps you pick. Emergency unlock, anytime.").
  - The `plans` page is unchanged apart from P1.

**P3. Test plan count.**
- **Why:** fewer choices won at Burner (1 vs 5, A/B) and in every Opal onboarding test that added choice (A/B). Annual-first with monthly hidden gave +15–20pp annual share at Mojo (A/B#) and 56%→76% at None to Run (Obs). For a new app, the podcast's resolution is one plan plus a fallback (T02 Contested A).
- **Variant:** the Annual card alone, plus an "Other plans" link that opens a sheet with Monthly and Lifetime.

**P4. Test CTA copy: "Try for $0.00"** (keep the "No payment due now" sub-line). Duolingo: "$0.00" > "free" > "free trial" > "Subscribe", lifting trial→paid too (A/B, direction only); critics question its auto-renew clarity (T02 Contested E).

**P5. Reprice or demote Lifetime.** $99.99 is 1.67x annual, breaking PAYWALL_VIDEO_NOTES' 2–2.5x rule since annual went to $59.99. Lifetime buyers are the highest-intent users; underpriced lifetime caps revenue (T04 Contested D: Barnard, BlueThrone Opin). Move it to ~$149.99, or behind "Other plans" (P3).

**P6. Pick a paywall SDK with remote config and experiments before TestFlight. Ship.** No test below can run without it; `package.json` has none yet (PAYWALL_VIDEO_NOTES).

### Trial and pricing

**T1. Keep 7 days.** Value arrives over nights, not instantly; 3-day only won for instant-value Captions (T03 A/B), and 55% of 3-day cancels happen on day 0 (Bench).

**T2. Price test ($39.99 vs $59.99) with realistic expectations.** A proper read needs ~400 renewal pairs (T04: Petit Opin) and ~100k DAU scale (T12: Seufert Opin). Decide on D35 net revenue per install plus auto-renew-off within 7 days of the charge (Mojo's proxy, T12); re-check at month 12.

**T3. The day-5 reminder carries a recap, and the user can pick the reminder day.**
- **Why:** the reminder is the moment users judge value, around days 5–6. Letting users choose the reminder day raised trial conversion at Duolingo, even though it added friction (T02/T09 A/B; B09 · 2026-03-02).
- **Locturne version:**
  - Push on day 5: "Five nights. Four mornings up. You get charged {date}. Your call."
  - The reminder row on `plans` becomes "Remind me on Day 5 ▾" with Day 4, 5 or 6. Test it (low priority).

### First night and first morning (activation)

**A1. Define activation as three walked mornings in the trial. Hypothesis; confirm from data.**
- **Why:** activation is a count of the core action. Aperture saw 2x trial→paid at 6 stories (Obs). Ladder uses 3 workouts a week (Obs), Zumba defaults the goal to 3 (Obs), and Petit sees ~3 completions driving the first renewal (Opin) (T06).
- **Locturne version:**
  - Log `morning_unlocked_by_walk` and `night_block_held`. On the first real cohort, check which count separates trial→paid.
  - On Home, show a count that only goes up ("Mornings up: 2"). Never "missed", and passes don't reset anything (T07: Welltory).

**A2. The first morning teaches itself. Ship.**
- **Why:** in-the-moment instruction beat FAQs and pushes. Ladder's coach voiceover got ~70–75% of users logging (T06 Obs).
- **Locturne version:** on the first morning only, the shield subtitle is literal: "Walk 200 steps. Then tap Check steps." The in-app walk narrates live, per GAME_PLAN. From day 2, the usual line bank takes over.

**A3. Surface the night the user never saw. Ship.**
- **Why:** when value happens in the background, people only pay if they're shown it (T06: RoboKiller Anec, Life360 Opin).
- **Locturne version:** the first thing on screen after the morning unlock is a one-line receipt:
  - "Last night: 4 apps asleep, 11:30 to 7:02. You knocked twice. I didn't answer."
  - The joke lands on him, not the user. Feed the same data into the share card.
  - This depends on the device spike confirming shield-tap logging.

**A4. Ask for Motion on `armed`, with notifications.** Steps count from wake time before the app opens (GAME_PLAN), so permission must exist before the first morning. Sub Club evidence on permission timing is mixed (T05 Contested D).

### Days 1–7 retention and notifications

**R1. Few, schedule-tied notifications, with a holdout from launch.**
- **Why:** timing should follow behaviour (T07: Duolingo, many A/B), and Locturne's schedule is the behaviour. Most day-1 re-engagement failed at Opal (A/B). New pushes can turn negative after ~6 weeks (Duolingo holdout).
- **Locturne version:** only a bedtime heads-up (~15 minutes before), the day-5 trial reminder, and honest status alerts (access revoked, block failed). No "come back" pushes. Keep 10% of users off any new push type for 3+ months.

**R2. Lapses: a few plain messages, then stop.** Duolingo sends one per missed day for 7 days; days 3–4 decide it (T07 Obs). If the schedule is off or access revoked: days 1, 3 and 7, then silence, in VOICE.md's "Clear when it matters" register.

**R3. The v1.1 streak is a weekly count plus a widget.** Ladder's weekly check-marks + widget (~1/3 install it, a billboard) and Opal's streak ("biggest win of the year") retained; shame versions fail out of app (T07 Obs). "5 mornings up this week." A pass counts; weeks start fresh; no broken state.

**R4. Weekly recap through the month-1 cancel window. Test with a holdout.** 34% of annual churners turn off auto-renew in month 1 (T08: SOSA 2026 Bench); weekly reports are common retention tools (Duolingo, Zumba Obs). Sunday evening: "This week: 6 mornings up, 1 pass. I'm tired. That's your fault."

### Cancel and win-back

**C1. Detect trial cancellations and show one in-app save. Test.**
- **Why:** Opal's 50%-off push plus modal on trial cancel "works quite well" (A/B in progress). Coconote's "+7 days" beat discounts "by far" (web tests). Yousician's discount save was net negative after refunds (Obs) (T08).
- **Locturne version:** use the auto-renew-off signal from App Store Server Notifications. On the next open, show one modal:
  - "You turned me off. Fair. Want another week to decide?" / "Half price, and I'll stop asking."
  - Never repeat it and never interrupt a morning walk (T07: Lose It, interrupting the core flow caused churn).
  - StoreKit limits on offers during a trial are an open question (below).

**C2. Easy, honest cancel. Ship.** Hard offboarding backfires (T08: Crowley, Rise, Slopes). Settings → "Cancel subscription" links to Apple's page, after one optional "Why?" (cost / didn't use it / it broke / other); cost and low use are ~70% of churn reasons (T07 Bench).

**C3. Billing Grace Period and billing-issue messages on. Ship.** Payment failures are ~50% of churn once churn is ~2%/month (T08: Layfield Obs); SOSA 2026 recommends grace periods (said of Google Play; iOS has the equivalent).

**C4. Wait on win-back until hundreds have churned** (T08: Barnard/Jacob Opin; Apple win-back offers ~1–2%, estimate). Then lead with what changed ("I learned to be an alarm."), not a discount (T08: Crunchyroll, LinkedIn Obs).

---

## Conflicts with GAME_PLAN and earlier docs

1. **Paywall layout.** GAME_PLAN picks "three plans on one page" from the user's reference screenshots; Sub Club's strongest evidence favours a timeline, annual first and fewer choices (T02). GAME_PLAN also contradicts itself: "Onboarding shape" item 4 still says "two-page paywall".
   **Recommendation:** P2 puts the timeline on `offer` and leaves the reference-based `plans` page; P3 tests plan count. GAME_PLAN's plan decision stands until P3 reads.
2. **The Annual card breaks GAME_PLAN's own 3.1.2 rule** (P1). This is a code bug, not a policy question. Fix it.
3. **The exit offer ($29.99).** GAME_PLAN commits to it. The evidence says to judge it net of refunds (BoldVoice, Yousician) and not to teach users that dismissing pays (Quizlet).
   - Two Locturne-specific risks: a TikTok audience will share "close the paywall for half off", and the $29.99 product in the same subscription group appears as a downgrade in iOS Settings (FitnessAI: 10–15% of subscribers ended up on such a plan).
   - **Recommendation:** keep it built, behind a flag. Test it (test 3 below). Decide knowingly whether the Settings downgrade is acceptable.
4. **The freemium fallback.** GAME_PLAN says to keep freemium ready "if word of mouth is weak (Opal's revenue grew after it went freemium)". Opal switched at $10M ARR, with a brand and word of mouth already built (T01/T10 Obs). A client's switch to freemium cut conversion by more than 50% (T01: Phil Carter Obs). Freemium pays when free users give something back, such as virality (T01).
   **Recommendation:** reword the trigger. Consider freemium only once free users would bring distribution, for example share cards or student word of mouth. Never do it as a rescue for weak conversion.
5. **Lifetime at $99.99 vs PAYWALL_VIDEO_NOTES' 2–2.5x rule** (P5). Update one or the other.
6. **ONBOARDING_CONVERSION's rule that "every answer must feed the number or a setting"** would exclude the attribution question (O1).
   **Recommendation:** allow one exception for analytics that are never shown back to the user.
7. **The test order in ONBOARDING_CONVERSION and TODO.md** puts trial vs no trial first. Sub Club supports big structural swings first (T12: Petit), but also shows trials drive volume (T03: Duolingo A/B, Aperture), and the one no-lift case is a considered hardware purchase (Skylight).
   **Recommendation:** run the cheaper, better-evidenced structural tests first (see the roadmap). Trial vs no trial moves to 5th.
8. **The GAME_PLAN gate "~30% of trials turning into paid" in a TestFlight group.** TestFlight purchases are sandbox and free, so trial→paid can't be measured there. Warm, founder-led audiences also inflate every metric (68–90% trial→paid at None to Run and Natal; T13).
   **Recommendation:** measure the money gates in a small real App Store release. Treat early numbers as a ceiling.
9. **"Nothing ever blocks the phone of someone who hasn't paid."** Some apps give a first taste before the charge: BoldVoice gives day 1 free, Zumba one free class, Coconote one free note (T03/T06). A "free first night" would conflict with this rule.
   **Recommendation:** keep the rule. Listed as an open question.

---

## Don't do

- **Shame, streak-loss or "missed mornings" states.** Churn driver for out-of-app behaviour (T07: Welltory Obs); VOICE.md forbids them.
- **Freemium before scale** (conflict 4).
- **Web checkout to "save fees."** ~6% worse at 30%, clearly worse at 15% (T11: Dipsy A/B#); "a full zero" for new apps (Petit Opin).
- **Hiding or delaying the X.** Opal's discreet-X win is unclear (?); BoldVoice's no-X lost on refunds (T01 A/B).
- **Weekly plans, trial toggles, 3- or 14-day trials** (PRICING_RESEARCH; T03).
- **Blanket or repeated discounts** in save/win-back; users learn to cancel for 50% (T08: Quizlet, Layfield).
- **A v1 referral program.** Broke even at Lose It, failed at Life360 (T07 contested).
- **"Come back" pushes or novelty notification systems without a holdout** (T07: Duolingo, Opal).
- **More explanation on `plans`.** Added context at pricing lowered conversion (T02: Built With Science A/B). Explain on earlier screens.
- **Many small tests.** Opal: 121 was too many; ~1 in 4–5 paywall tests wins (T12). Plan 3–5 big swings in year 1.
- **Paid UA before conversion is proven, or under ~$10k/month per channel** (T13: Petit Obs).
- **Toy-viral hooks.** Coconote's 41M-view video made almost nothing; keep hooks problem-framed (T13).

---

## Test roadmap

**Primary metric for every test: net revenue after refunds per install, at D35.** Count all assigned installs, including those that quit before the paywall. D35 covers the 7-day trial, the first charge, and about 14 days of refunds (BoldVoice's mature-cohort rule, T12).

**Guardrails:**
- trial→paid;
- the refund rate at 14 days after the charge;
- auto-renew turned off within 7 days of the charge (Mojo's proxy);
- 1-star reviews that mention billing;
- D30 blocking still active (GAME_PLAN).

**Minimum sample (rough).** Assume ~15% install→trial (Opal 17%; Health & Fitness 15–20%, T12) and ~35% trial→paid, so about 5% install→paid.
- Detecting a 20% relative lift in trial starts at 80% power needs about **2,400 installs per arm**.
- A revenue read needs about 200 payers per arm (ONBOARDING_CONVERSION), so about **4,000 installs per arm**.
- Then wait 35 days after the last install.
- Traffic from viral videos swings in mix from day to day, so randomize. Don't compare before and after.

| # | Test | Arms | Why this order | Min. sample / time |
|---|---|---|---|---|
| 0 | Baseline (no test) | P1 + P2 + O1 shipped | Needed to know the baseline | 2–4 weeks of traffic |
| 1 | Plan count | 3 cards vs Annual + "Other plans" | High win rate for structural tests (Adapty via PAYWALL_VIDEO_NOTES) and strong Sub Club support (T02); trivial to build | ~4k installs/arm + 35 days |
| 2 | Paywall position | After `commit` (now) vs straight after `tomorrow`, with setup after purchase | A placement change was Opal's biggest lever (+10% for 2 screens earlier, A/B). Tests GAME_PLAN's investment-first order rather than assuming it | ~4k/arm + 35 days |
| 3 | Exit offer | none vs $29.99 half price vs 14 days free at $59.99 | Net of refunds is the whole question (BoldVoice, Coconote) | ~4k/arm (3 arms) + 35 days. Also watch Settings downgrades for 3 months |
| 4 | Price | $39.99 vs $59.99 | Already planned. Price elasticity is often flat (T04) | ~4k/arm + 35 days, re-read at month 12 |
| 5 | Trial vs no trial on annual | 7-day vs pay now | Big swing, but the evidence leans pro-trial (T03) | ~4k/arm + 35 days |
| 6 | CTA copy | "Start 7-day free trial" vs "Try for $0.00" | Cheap. Duolingo's direction-only result | ~2.4k/arm + 35 days |
| 7 | Reminder day | Fixed Day 5 vs user picks 4/5/6 | Duolingo A/B | ~4k/arm + 35 days |
| 8 | Reveal lifetime line | With vs without | Loss framing vs the no-guilt voice. Small expected effect | Only above ~10k installs/month |
| — | Retention holdouts | Recap push (R4), new push types | Effects turn negative after ~6 weeks (Duolingo) | 10% holdout, read at 3 and 6 months, on D90 blocking active and month-1 auto-renew off |

**When traffic is below ~2,000 installs a week:** run only tests 1–3, one at a time, and accept that only large differences (30%+) will be detectable (T12: Steve Young, Carvell).

---

## Open questions for the founder

1. **Expected installs per week at launch?** This decides whether A/B testing is possible at all, or whether the first months are big swings read as cohorts.
2. **Is the timeline allowed back on `offer`** (P2), given the paywall was rebuilt from your reference screenshots?
3. **The exit offer:** is it OK for $29.99/year to appear as a downgrade in iOS Settings for every subscriber, and are you comfortable with it spreading on TikTok as a "hack"?
4. **Lifetime:** reprice to ~$149.99, hide it behind "Other plans", or keep $99.99 and drop the 2–2.5x rule?
5. **The money gates:** where will trial→paid and refunds be measured, given TestFlight can't charge? A small App Store release?
6. **A free first night?** Would you ever test one night of blocking before the paywall (the BoldVoice/Zumba pattern), or is "nothing locks before payment" permanent?
7. **Teens:** under-18s need a parent to authorize Screen Time, and Opal found students can't pay annual prices. Do teens get their own path, or is the product 18+ in practice?
8. **Trial-cancel offers on iOS:** someone needs to confirm what StoreKit allows during an active trial before C1 is built (the Coconote-style extension is web-only in the evidence).
