# Onboarding and paywall for conversion

September 24, 2026. This covers Locturne's quiz onboarding, the personal number, and
the hard paywall. It **supersedes the screen-count recommendations** in
[ONBOARDING_RESEARCH.md](ONBOARDING_RESEARCH.md) and
[OPAL_ONBOARDING_RESEARCH.md](OPAL_ONBOARDING_RESEARCH.md). Those were written for
a free prototype and focused on usability. Their accessibility, honesty and
permission findings still apply. [GAME_PLAN.md](../GAME_PLAN.md) stays the source
of truth.

**Update, October 3, 2026:** the eight-track study in
[ONBOARDING_OPTIMIZATION.md](ONBOARDING_OPTIMIZATION.md) audits the flow as built and
corrects parts of this doc (the bucket citation and the real-data reveal). Read it first.

**Evidence labels:**
- **[S]** Controlled experiment or large dataset.
- **[M]** Vendor or operator data with numbers.
- **[W]** Teardown or anecdote.
- **[J]** Our judgment.

No test here was run on a sleep or blocker app; everything is transferred from
other apps.

## Summary of decisions

| Decision | Choice | Main evidence |
|---|---|---|
| Length | **About 25 screens, about 3 minutes** | Category range is 17–42 screens [W]. Lose It and Adapty found longer onboarding beat shorter [M]. Opal: "as early as possible, but not too early" (7% → 17%) [M] |
| Questions | **7 quiz questions plus 3 setup inputs** | Winners ask 6–12 real questions [W]. Personalization gave +8.5% trial starts and +17% paid [M]. Every answer must feed the number or a setting (5.1.1(v)) |
| Format | One question per screen, tap buckets, haptic on every tap | Buckets beat sliders for self-report (Ellis 2019; Schwarz 1985) [S]. Haptics raised add-to-cart by 32%+ (JCR 2025) [S] |
| The number | **Hours a week on your phone in bed**, not "sleep lost" | Screens in bed displace about 24 min of sleep per hour, not 60 (Hjetland 2025) [M]. Health-claim risk under 1.4.1 and FTC rules |
| Setup | **Before the paywall, but only armed after purchase** | IKEA effect needs the setup completed (Norton 2012) [S]. Opal's scheduled-session win [M]. A non-payer's phone must never lock [J] |
| Paywall | **2 pages:** value recap, then a trial timeline (yearly only; monthly behind "See other plans") | Multi-page paywalls convert 12.4% vs 9.1% [S, correlational]. Blinkist: +23% trial starts, −55% complaints [M] |
| Trial | **7 days**, on the annual plan only | 3-day trials: 55% of cancellations happen on day 0 [S]. RCT: 7-day beat 3-day, +21% subscriptions [S]. Covers 7 bedtime/morning cycles |
| Prices | **$59.99/yr** (trial; raised from $39.99 on 2026-09-25, see PAYWALL_VIDEO_NOTES.md) and **$9.99/mo** (no trial, behind a sheet) | Health & Fitness medians [S]. Below Opal and Rise, in line with Cal AI and Quittr. Raised from $34.99/$6.99 during the build; the code (`PRICES` in `content.ts`) is canonical |
| Notifications | Right after purchase, framed as "I'll remind you before your trial ends" | Foodnoms: +58% conversion, +23% LTV [M]. Blinkist opt-in went from 6% to 74% [M] |
| Rating prompt | **Not in onboarding.** Ask after the first successful 200-step unlock | Apple says ask after a satisfying action; review gating is banned [S] |
| Leave out | Sign-in, gender, ATT, fake reviews or user counts, countdowns, trial toggle | 5.1.1(v), FTC fake-review rule (2024), 2.3.1, 3.1.2 toggle ban (Jan 2026) |

## The questions

Durations use buckets centered on real norms. The mean in-bed screen time for
students is about 42 minutes a night. Numbers in brackets are the values used in
the math; they are deliberately at or below the bucket midpoints.

| # | Question | Answers | Used for |
|---|---|---|---|
| Q1 | What happens most nights? | "One more video" / I scroll because I can't sleep / I lose track of time / Honestly, all of it | Echoed in his lines; tone |
| Q2 | After you get into bed, how long are you on your phone? | <10 min [5] / 10–30 [20] / 30–60 [45] / 1–2 h [90] / 2 h+ [150] | Number (S) |
| Q3 | How many nights a week? | 1–2 [1.5] / 3–4 [3.5] / 5–6 [5.5] / Every night [7] | Number (n); prevents a blind ×7 |
| Q4 | In the morning, how long are you on your phone before you get up? | <5 min [3] / 5–15 [10] / 15–30 [20] / 30–60 [45] / 1 h+ [75] | Number (M); sets up the walk |
| Q5 | How old are you? | Under 13 (polite exit) / 13–17 / 18–25 / 26–64 / 65+ | Sleep need: 8 h for teens, otherwise 7 h (AASM) |
| Q6 | How do you feel when your alarm goes off? | Wrecked / Groggy / Fine (I'm lying) / Fine (really) | Echoed back on the result and the paywall |
| Q7 | What would you do with the time back? | Sleep more / Read / Gym / Slow mornings / Something else | The gain frame on the result; paywall headline |
| Setup | Bedtime (B), wake time (W), apps | Time pickers in 15-minute steps; FamilyActivityPicker | Formula B; the actual schedule |

Also optional: a first name for his lines, and "What have you tried?" (Screen Time /
willpower / other apps / nothing), which leads to the reframe: "Screen Time has an
'Ignore' button. I don't."

**Your original four questions are all here:** night phone time, morning phone
time, bedtime and wake time. Q3, Q5 and Q7 are the additions that earn their
place.

## The number

**Formula A, the headline:** weekly minutes = S × n + M × n. Round **down** to the
nearest half hour. The yearly figure is weekly × 52, shown as whole 24-hour days.

**Formula A2, the lifetime payoff:** the user enters an exact age on a number wheel
(10–99; under 13 goes to the age gate). Lifetime days = yearly hours × (79 − age) ÷ 24,
rounded down, where 79 is U.S. life expectancy at birth (CDC NCHS, 2024 data). Shown on
the reveal in whole years only, "Over N years.", and left out under a year. The "by 79"
was dropped on September 24 (read awkwardly, and leaned on guilt).

**The reveal grid (revised 2026-09-24):** the grid is one year, and the payoff line
states the same count as the boxes, so the number never disagrees with what's on screen.
Each box is 1 hour if every hour of the year fits on screen without clipping (sized to the
space left, 7 px squares minimum, 1,000 max); otherwise each box is 1 day. A centered
caption under the grid says which: "Each box is 1 hour." The payoff reads "That's 394
hours a year." (or "That's 32 days a year."), then the lifetime line. Under the big
number, a bold line pulls out the morning share: "2 of them before you're even up."
(skipped under half an hour). Earlier versions
used 10-hour boxes next to a lifetime-days number, which read as miscounted.

The reveal no longer shows the sleep-room line (Formula B), the alarm echo, or the
estimate footnote. User feedback: too much text, felt like bloat.

**Formula B, the supporting line:**
- Time in bed T = W − B (add 24 h if it crosses midnight).
- Sleep room O = T − S − 15 min to fall asleep.
- Show this line only if O is less than the sleep need.
- Frame it as a schedule comparison, never as "sleep lost."

**Formula C, footnote only:** the cited association: "In a study of about 45,000
students, each hour on screens in bed was linked to about 24 minutes less sleep."

**Worked example:** 45 min at night, 20 min in the morning, every night, 11:30 PM to
7:00 AM, age 22.
- A: 65 × 7 = 455 min, shown as **"about 7½ hours a week."** Yearly: about 16 days.
- A2: 394 h × 57 years ÷ 24 = **935 days**, "Over 2 years."
- B: 450 − 45 − 15 = 390 min, about 6½ h of room. That's under 7 h, so the line
  shows.

**Result screen copy:**

> Based on your answers, you spend about
> **7½ hours**
> …a week on your phone in bed.
> [grid: 394 boxes]
> Each box is 1 hour.
> **That's 394 hours a year.**
> **Over 2 years.**

**Edge cases:**
- **Under an hour a week in total:** skip the cost number and say "You're
  already ahead. I'll keep it that way."
- **Shift workers:** offer an "I work nights" option. Show Formula A only.
- **Time in bed under 3 h or over 14 h:** ask the user to confirm AM or PM.
- **Under 13:** exclude.

**Words to use and avoid:**
- Use: "spend", "on your phone in bed", "room for sleep", "about".
- Never use: "lose/lost sleep", "sleep debt", "risk", "deprived", "diagnosis",
  "guaranteed".

**Later, after the device spike:** a `DeviceActivityReport` extension may be able
to show the user's *real* logged phone use during their bedtime window, which would
be stronger than a self-report. This is unverified: history availability and
hourly breakdowns are unknown.

## Screen by screen (about 25 screens)

**A. Hook (3)**
1. Cold open: one of his lines in the big italic serif, plus a "Go on" pill.
   The line depends on the clock (fixed hours, since bedtime isn't answered yet):
   10 PM–4:59 AM "It's 12:47." / "Why are we awake." (real time);
   5–9:59 AM "You're still in bed." / "I can tell. I'm also still in bed.";
   otherwise "Your phone keeps me up." / "I'm Loc. Raccoon. I'd like to sleep."
2. How it works, in 3 beats: locks at bedtime → stays locked → 200 steps and it's
   back. Use a real screen recording once one exists.
3. "Seven questions. Then I do math on your nights." Sectioned progress bar starts.

**B. Quiz (8)**

4–7. Q1–Q4.
8. Interstitial: one cited statistic (Reviews.org: about 85% of U.S. adults check
   their phone within 10 minutes of waking) and a quip from him that echoes their
   morning-minutes answer. It follows the morning question, so it stays on the
   morning angle. Reviews.org is an industry survey, weaker than Pew.
9–11. Q5–Q7.

**C. Reveal (2)**
12. A short loader (3 seconds or less) that honestly lists what it's calculating.
    A/B test removing it.
13. **The number**, counting up with a haptic. The math is visible underneath.

**D. Setup: the investment (8)**
14. Screen Time explainer: "I need this to lock anything. Your data stays on your
    phone."
15. FamilyControls system prompt.
16. App picker, with light guidance. No list of modes.
17. Bedtime.
18. Wake time (when the 200-step lock starts).
19. Motion explainer.
20. Motion system prompt.
21. **"Tonight's lock is ready":** "11:30 PM · 4 apps · tomorrow: 200 steps." It is
    ready but **not armed**.

**E. Commit and pay (4)**
22. Hold to commit: "No scrolling before 200 steps." Haptics ramp up during the
    hold.
23. Paywall page 1: a recap in *their* numbers, apps and times, headlined with the
    Q7 answer ("Let's get your mornings back").
24. Paywall page 2: the trial timeline and the plans.
25. After purchase: an armed confirmation ("Armed. See you at 11:30."), then the
    notification explainer ("I'll warn you before lockdown and before your trial
    ends"), then the system prompt, which can be skipped.

**Declined:** keep the setup saved and arm nothing. Show one honest fallback
screen, at most **one** follow-up offer and never on a loop (Apple, June 2026).
Nothing ever blocks the phone of someone who hasn't paid.

## Paywall spec

The look is Nocturne: monochrome dark, a white pill button, headlines in the
italic serif, and badges as an inverted white pill. **No glow.**

**Top to bottom:**
1. "Restore" in small text.
2. A headline echoing Q7, with one line from him under it.
3. Three benefits built from their setup:
   - "{apps} go to sleep at {bedtime}"
   - "Back after 200 morning steps"
   - "Passes for sick days"
4. **Timeline:**
   - **Today:** "Tonight's lock arms. No payment due now."
   - **Day 5:** "I'll remind you with a notification that your trial is ending." (backed by the in-app fallback when notifications are off)
   - **Day 7:** "You'll be charged on {date}, cancel anytime before."
5. Plans: only yearly is on the page. The price line ("Unlimited free access for
   7 days, then **$39.99 per year**. ($3.33/month)") sits under the timeline and
   must be fully visible without scrolling on a 390×844 screen. Per Apple 3.1.2,
   the billed amount is the most prominent price; $3.33/month is smaller and dimmer. "See other plans" opens a sheet with yearly still
   selected and **Monthly: $9.99/month, no free trial** underneath (Calm's
   pattern; not a trial toggle).
   - Per-week pricing may appear, but it must be **smaller** than the billed price.
6. The button: "Start my free trial", or "Subscribe for $9.99/month" from the
   sheet.
7. "No payment due now · Cancel anytime in Settings."
8. Auto-renew terms, then Terms · Privacy · Restore.
9. Social proof only once real ratings exist.

**Sell Locturne's own features, not "Screen Time access."** Guideline 4.10 forbids
monetizing built-in capabilities such as the Screen Time APIs.

**A/B tests in order** (big swings only until each variant has about 200
conversions):
1. Trial vs no trial.
2. $39.99 vs $59.99 (the current default), then fine-tune around the winner.
3. Loader vs no loader.
4. Notifications before vs after the paywall.
5. Personalized vs generic headline.
6. Later: one honest abandon offer, while watching refunds.

**Measure:** download→paid by day 35 (median 10.7%, top decile 38.7%), trial→paid,
refunds (the hard-paywall median is 5.8%), day-0 cancellations, and **D30 blocking
still active**.

## Visuals without an art budget

- **No controlled evidence** shows that mascot art converts better in onboarding.
- **Haptics have strong evidence;** use them on every selection, the hold and the
  reveal.
- **Kinetic type:** the number counts up, and his lines type on.
- One real screen recording of the lock and unlock loop.
- Monochrome, with no glow.

## Sources

- RevenueCat 2026 benchmarks: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- Longer onboarding (Lose It): https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short
- Adapty onboarding tests: https://adapty.io/blog/how-to-fix-your-onboarding-flow/
- Superwall multi-page paywalls: https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why
- Opal's 121 A/B tests: https://subclub.com/episode/lessons-from-121-ab-tests-kenneth-schlenker-opal
- Blinkist honest paywall: https://growth.design/case-studies/trial-paywall-challenge
- Foodnoms notification test: https://ryanwesley.com/paywall-optimization-success-story/
- Trial length and day-0 cancellations: https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app
- 3-day vs 7-day trial RCT: https://pmc.ncbi.nlm.nih.gov/articles/PMC12217587/
- Toggle ban: https://www.revenuecat.com/blog/growth/rip-toggle-paywall
- Apple rules clarification, June 2026: https://superwall.com/blog/external-checkout-a-b-testing-and-trial-toggles-confirmed-apples-rules-for-ios
- 5.6 rejection for a "one-time offer": https://developer.apple.com/forums/thread/768912
- Transaction-abandon study: https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study/
- Haptic rewards (JCR 2025): https://academic.oup.com/jcr/article/52/5/1043/8120234
- Labor illusion (Buell & Norton 2011): https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376
- IKEA effect (Norton, Mochon & Ariely 2012): https://doi.org/10.1016/j.jcps.2011.08.002
- Sleep need: https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/
- Screens in bed, 45k students (Hjetland 2025): https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1548273/full
- Tablet use and bedtime (Chinoy 2018): https://pmc.ncbi.nlm.nih.gov/articles/PMC5974725/
- Self-report accuracy (Parry 2021): https://www.nature.com/articles/s41562-021-01117-5
- Single-question self-report (Ellis 2019): https://researchportal.bath.ac.uk/en/publications/do-smartphone-usage-scales-predict-behavior/
- FTC health-claims guidance: https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance
- FTC fake-review rule: https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Teardowns: https://screensdesign.com (Cal AI, Quittr, Opal, Brainrot, Unrot, Prayer Lock, Wayk, Rise)

## Draft build (September 24, 2026)

The flow is built as a viewable preview: Home → **Preview onboarding**, or open
`/onboarding?step=<id>` to jump to any screen. Code is in `src/features/onboarding/`.
Native parts are simulated and labelled "PREVIEW": the Screen Time, motion and
notification prompts; Apple's app picker; purchases; Restore, Terms and Privacy.

The draft went through two rounds of audits (conversion/UX and
compliance/voice/accessibility). Changes from this spec:

**New screens**
- **`tomorrow`**, a demo right after the reveal: the morning block screen, then a
  0 → 200 step count with his lines, landing one step at a time from 190. The
  user sees the product before paying, and the screen doubles as the TikTok shot.
- **`first-morning`**, after purchase: steps count from the alarm, and at 200 the
  user taps the block screen or opens the app. Passes cover bad mornings.

**Questions**
- **Q4 asks about phone time specifically.** The earlier wording counted all time
  lying in bed, which inflated the number.
- **Under-13s exit politely.**
- **"What have you tried?" is in** (added Sept 24, evening), after the alarm
  question and before "time back". One choice (Screen Time limits / another blocker /
  willpower / phone in another room / nothing yet), then a `tried-echo` screen where
  he answers the objection: "Screen Time has an Ignore button. I don't." The replies
  are `TRIED_ECHO` in `content.ts`. The answer isn't used anywhere else yet.

**The number**
- **Anyone under an hour a week gets the mornings pitch** instead of a cost
  number. No "0 hours" or "0 days" wording.
- **The count-up lands first** (with a tick per hour), then the grid fills.

**Paywall**
- A headline in his voice and a dated timeline. The day-5 reminder is conditional
  ("if notifications are on"), and the timeline says "cancel by {date}".
- The same three timeline rows for both plans, so the plan cards never jump.
- "Billed today" on monthly. The badge is computed ("Save 58% vs monthly").
- The renewal terms sit at 13pt under the plans. Restore, Terms and Privacy are
  tappable.

**Permissions and commitment**
- Permission explainers use "Continue" with no skip; the system prompt's own
  "Don't Allow" is the choice. This follows 5.1.1(iv).
- **Commit:** a personalized pledge. At rest the hold button is outlined so it
  doesn't read as disabled, and VoiceOver gets a plain "I agree".

**Accessibility**
- Pages scroll only when they don't fit (small screens, large text).
- Display type is capped at 1.3× Dynamic Type.
- 44pt touch targets, progress segments at 3:1 contrast, card hairline edges.
- The time picker is adjustable with VoiceOver.

**Voice**
- Numbers are set upright, so the italic serif always means he's talking.
- Headlines no longer imply sleep gains.

**Still needs the real app:**
- StoreKit prices and intro-offer eligibility.
- Real Restore, and the Terms and Privacy URLs.
- FamilyControls / CMPedometer / notification prompts.
- Apple's app picker.
- "Armed" shown only once tonight's schedule is confirmed.
- Real day-5 reminders, including an in-app fallback when notifications are off.
- Teen child accounts, which need a parent to authorize Screen Time.

**Audit scores:** about 6.4 at round 1, 8.0 at round 2, 8.6 at round 3.

Round 3 fixes applied afterwards:
- **Late night:** copy for onboarding after bedtime ("Armed. Starting now.", "This
  morning, 7:00 AM"), and the demo's eyebrow now matches.
- **Night shifts:** daytime presets.
- **Misfires:** a double-tap guard, and a "Hold it. Don't just tap." hint on a quick
  tap. Mobile browsers' long-press text selection and callout are blocked on the
  hold button.
- **Wording:** "That's 16 full days." as its own full-contrast line. The shield
  button shows a static "Check steps", because a real shield can't count live.
  Radio states are fixed.

The remaining ceiling is real-app work (native APIs, StoreKit, a device
VoiceOver pass), art, and funnel data. A 10/10 has to be earned with real
conversion numbers, not audits.

Paywall fixes (September 24, evening), each backed by a source:
- **Price above the fold:** timeline spacing tightened so the price line is fully
  visible at 390×844. A cut-off price is a 3.1.2(c) risk ("billed amount not
  clear and conspicuous" rejection, Sept 21 2026).
- **Per-month breakdown subordinate:** "$3.33/month" is 14pt and secondary color.
  Apple: the billed amount "must be the most prominent pricing element"; other
  pricing must be "subordinate in position and size"
  (https://developer.apple.com/app-store/subscriptions/).
- Headline ("How your free trial works") and Day 5 copy unchanged: no evidence
  found for changing either.
- **`tomorrow`:** dropped the "About two minutes…" line so the demo fits.
- Prices in this doc now match the code ($39.99/yr, $9.99/mo).

## Rating, September 24, 2026 (late)

**7/10** as a pre-launch flow. Based on screenshots of all 29 screens at 390×844
(web preview) and the code. The earlier 8.6 was an audit of compliance and usability.
This rating is about whether the flow will convert and whether it sells the wedge.

**Strong:** the structure matches proven hard-paywall funnels (quiz → number → demo →
setup → commit → Blinkist timeline). The `tomorrow` demo is the best screen. The
paywall is compliant, and the voice is consistent.

**Costing points:**
1. **The alarm question does nothing.** `answers.alarm` is collected and never
   used, which breaks this doc's own rule that every answer feeds the number or a
   setting. Echo it somewhere or cut it.
2. **The morning wedge is undersold.** The opener, the quiz and the number are all
   about nights, which is Opal's ground. "Won't work until you get out of bed" only
   shows up on the `deal` screen, as body text.
3. **The reveal is weak emotionally.** A 394-square grid is dense and abstract, and
   "Over 2 years by 79." reads awkwardly. The lifetime line also pulls against the
   no-guilt voice.
4. **Mostly text.** Apart from the moon and the demo, the screens are type on
   black, and the questions leave about 40% of the screen empty. There's no
   screen recording of the real lock yet.
5. **He goes quiet at the paywall.** "How your free trial works" is generic. Keeping
   Blinkist's layout is right, but one line in his voice would keep the brand at
   the money moment.
6. **Nothing is measured.** This is a simulated preview, so every score before
   TestFlight is a guess.

**Fixed the same evening:**
- Point 1, in part: the daytime cold open is now "No apps until you're out of bed." /
  "I'm Loc. Raccoon. I don't do mornings either." The late-night and early-morning
  openers are unchanged. The reveal pulls out the morning hours ("2 of them before
  you're even up."). The full morning research is in [MORNING_ANGLE.md](MORNING_ANGLE.md).
- Point 2: the alarm answer is echoed on the `offer` page (`ALARM_ECHO` in
  `content.ts`, e.g. "Groggy, you said. So am I. We walk anyway.").
- Point 3, in part: "by 79" is removed; the line reads "Over 2 years."
- Point 5: the paywall has his line under the title, "Try me for a week. I'll sleep
  through most of it." The price is still fully visible at 390×844. (It said "Seven
  nights free" until 2026-10-03, when B14 took trial wording out of anything bigger
  than the billed price.)

**Re-rated after the fixes: 7.5/10.** The alarm question and the paywall voice are
fully fixed. The morning angle and the reveal are only partly fixed: the quiz still
opens on nights, and the grid is still dense. Still open: a live 20-step walk before
the paywall and an activation plan for the first morning (see
[MORNING_ANGLE.md](MORNING_ANGLE.md)), real footage, and funnel data.

## Rating, September 25, 2026

**8/10** as a pre-launch flow, up from 7.5. Based on screenshots of all 27 screens at
390×844 (web preview, taken at 3 AM so the late-night copy showed) and the code.

**What improved:** the `motion` screen is now a live 10-step test, which closes the
"prove it works before paying" gap. The `ready` schedule card (times, the 200-step
line, real app icons) is the best setup screen. The mocked Apple alert tells people
what's coming, and `tried-echo` handles the main objection well. `tomorrow` is still
the strongest screen.

**Costing points:**
1. **The reveal lifetime line breaks the voice rules.** "That's over 2 years of your
   life, gone." is guilt, which VOICE.md and this doc both rule out
   (`lifetimeSentence` in `estimate.ts`). The age hint, "So does how much time is left
   to spend.", reads morbid for the same reason.
2. **The quiz has a lot of empty space.** Every moon question has about 150 px of
   blurred moon between the title and the answers.
3. **`offer` is the weakest screen before the money.** It's plain text on black, with
   the bottom 40% empty. It says "TikTok, Instagram and 1 more" when three names
   would fit.
4. **Paywall details:** the title leaves "works" alone on the second line. The
   timeline icons are 12 px and hard to see. "We'll remind you" breaks from his "I".
5. **The ending is three sparse screens** (`armed`, `first-morning`, `done`), with the
   top half of each empty. `done` could fold into `first-morning`.
6. **Nothing is measured yet.** Same as before: anything above 8 needs TestFlight data.

**Fixed the same day:** point 5. `done` is merged into `first-morning`, which is now
the last screen. It ends with "That's it. Go to sleep." / "I'll be asleep. Don't wake
me." `armed` and `first-morning` no longer get the old top padding, which dated from
when the moon rested in the top corner, so their content sits centered. Point 1 is
still open: the lifetime line may work well as loss framing, and it's the founder's
decision whether to keep it and add an exception to VOICE.md.
Point 1, later the same day: the lifetime line now reads "That's over 2 years of your
life." The loss framing stays, and "gone" is dropped.
Also fixed the same day: the age hint is now just "Sleep needs change with age." On the
paywall, the title breaks as "How your free / trial works" with no orphan, the timeline
icons went from 12 to 15 px on a wider bar, and Day 5 says "I'll remind you". The price
line is still fully visible at 390×844.

## Cut/move check against this doc, September 25, 2026

A code-only review suggested six changes. Checked against the evidence above, four
of them don't hold up:

| Suggestion | Verdict | Why |
|---|---|---|
| Cut 3–4 screens before the reveal | **Rejected as a goal** | Longer onboarding beat shorter (Lose It, Adapty [M]); 27 screens is in the 17–42 range [W]. Cut only screens that don't earn their place. |
| Echo or cut Q1 (`nights`) | **Supported: echo it** | Personalization gave +8.5% trial starts [M]; the table above says Q1 is "echoed in his lines", but the code never uses it. |
| Move age next to bedtime/wake | **Rejected** | No evidence on placement. The spec puts it at Q5, and the lifetime line needs it before the reveal. |
| Cut the 85% statistic | **Rejected** | It's in the spec (screen 8) and sets up the morning angle. No evidence either way; the weak Reviews.org source is the only open point. |
| Merge `ready` and `commit` | **Rejected** | The IKEA effect needs completed setup [S]. The flow already has fewer setup screens than the spec (8 vs 11 between the reveal and the price). |
| Wire or delete `declined` | **Supported: wire it** | The spec's declined path calls for one honest fallback screen. Right now nothing reaches it, and the paywall's X just exits. |

**One supported move:** bedtime and wake belong to setup, after the reveal (spec
screens 17–18). They're in the quiz now, but the reveal number doesn't use them
(Formula A is `S × n + M × n`). Moving them to after the reveal and before `tomorrow`
(the demo shows the wake time) puts the number 2 screens earlier without cutting
anything, and turns them into investment.

**Applied the same day:**
- **`bedtime` and `wake` now come after the reveal**, before `tomorrow`. The reveal is
  screen 15 of 27 instead of 17. The math loader's third line changed from "Your
  schedule" to "Nights a week", so it only lists what the number is actually made of.
- **Q1 is echoed** as the loader headline (`NIGHTS_ECHO` in `content.ts`, e.g.
  "“One more video.” Counting all of them."). "Can't sleep" gets sympathy, not advice.
- **`declined` is wired up.** Exit on `offer` or `plans` goes to "Fair." once. After
  that, Exit really exits, so the follow-up offer never loops.

**Re-rated: 8/10**, from web-preview screenshots at 390×844 and the code. What's
still open: real footage and funnel data.

**Founder decisions, September 25, 2026:**
- **The quiz stays night-first.** It follows the order of the product (bedtime, then
  morning) and of the moon scene, and Locturne sells on both. This overrides
  MORNING_ANGLE.md §4's morning-first quiz, which was judgment [J] with teardown
  support [W] and no test data. Mornings are still covered by the opener, the `deal`
  beats, the morning statistic, the reveal's morning line, the `tomorrow` demo and the
  step test. A morning-first Q1 can be an A/B test once there's traffic.
- **`tried` doesn't need a second echo.** Its job is handling the objection right
  away, on `tried-echo`. The paywall already echoes Q6 and Q7, and repeating a third
  answer there would be the kind of bloat that was cut from the reveal.
- **Re-rated after these decisions: 8.5/10.** With both points settled, nothing is
  left to fix in the preview's structure or copy. The rest has to come from the real
  build: native Screen Time, pedometer and StoreKit, real lock footage, and
  TestFlight funnel data.

## Paywall redesign, September 25, 2026

The `plans` page was rebuilt from two references the user supplied: a dark card
paywall (title, checklist, radio plan rows, pill button) and a plant app's "Try for
free" plan list (Lifetime, Annual (labelled Yearly there), Monthly, reminder toggle). **It replaces the
Blinkist trial timeline and the "See other plans" sheet.** That gives up Blinkist's
published result (+23% trial starts, −55% complaints) in exchange for a layout that
shows all three plans side by side. It's worth an A/B test once there's traffic.

**Top to bottom:** the title "Pick a plan", his line, then three checks
("TikTok and 2 more sleep at 11:30 PM", "Awake again after 200 morning steps",
"Passes for sick days and travel"). Then the plan cards:
- **Lifetime:** $99.99 once. "Pay once. Yours forever." ($99.99 is placeholder
  pricing, in line with Jomo's $99.99 and AppBlock's $89.99; see VALIDATION_RESEARCH.)
- **Annual, selected by default:** $39.99/year, then "($3.33/month) · 7 days free"
  under it, with a computed "Save 66%" badge against 12 months of monthly. (Labelled
  "Annual", not "Yearly", at the user's request.)
- **Monthly:** $9.99/month, "No free trial".

Under the cards is "Remind me before the trial ends", on by default and shown only
for the trial. The button and fine print change with the plan: "Start 7-day free
trial", "Subscribe for $9.99/month" or "Buy lifetime for $99.99".

**Deliberately different from the references:**
- **The per-month price sits under the billed price, not in place of it.** Apple
  3.1.2 requires the billed amount to be the most prominent price, and this doc
  records a Sept 21 2026 rejection for exactly that. The plant reference does the
  same thing ($220, then "$18.33 per month"). The annual plan still looks cheaper,
  because $3.33/month sits right above the $9.99 monthly plan.
- **No struck-through prices** (the plant app's $250 → $220). There was never a
  higher price, so a "was" price would be a fake discount (FTC).
- **No purple art or glow**, because of the project's no-glow rule. The cards are
  Nocturne monochrome, with a white border on the selected plan.
- **The reminder toggle isn't a trial toggle.** It doesn't change the plan or the
  price, so the January 2026 toggle ban doesn't apply.

## Three changes after the 7/10 review, September 25, 2026

A code-only review rated the flow 7/10. The founder took three of its fixes:

- **An exit offer on `declined`.** Closing the paywall now leads to "Fair. Half
  price, then.": annual at **$19.99/year instead of $39.99**, with the same 7-day
  trial. It's shown once, and closing it again really exits. There's no timer and no
  struck-through price. The full price is stated as a plain comparison, because the
  user saw it on the page before. The real app needs it as a separate annual product in
  the same subscription group (it renews at $19.99), and has to remember that the offer
  was shown so reinstalling can't farm it. Half off follows Opal's retention offer
  (PRICING_RESEARCH.md). `PRICES.annualOffer` in `content.ts` sets it.
- **`intro` is merged into `deal`.** Its line ("First, a few questions. Then I do math
  on your nights...") now sits under the three beats, and the button reads "Ask away".
  The first question is now screen 3 instead of 4.
- **The 10-step walk test (`motion`) is removed for now.** Asking someone who
  downloaded the app from bed to stand up and walk before the paywall is friction.
  `step-test.tsx` is kept but not used. **Open:** the Motion & Fitness prompt needs a
  new home after purchase, next to the notification prompt on `armed`.

The flow is 25 screens (from 27).

**Still open from that review:** social proof near the paywall (the biggest gap),
and a line connecting the alarm answer to the reveal number.

## Four changes from the Sub Club research, September 25, 2026

From [sub-club/APPLIED_TO_LOCTURNE.md](sub-club/APPLIED_TO_LOCTURNE.md) (all 149 episodes of
RevenueCat's podcast). The founder took items 1, 2, 4 and 6:

- **The Annual card's big number is now $59.99/year**, with "$5.00/month · 7 days free"
  as the detail. It had the per-month price as the headline, which broke this doc's own
  3.1.2 rule.
- **`offer` is the trial timeline again** for trial-eligible users: Tonight ("{apps}
  sleep at {bedtime}. $0 today.") / Day 5 ("I remind you. Grudgingly.") / Day 7 ({date}:
  $59.99 for the year, unless you cancel before then). Headline and alarm echo stay.
  Users without trial eligibility keep the Now / With me rows. `plans` is unchanged.
- **New step `found`** after `time-back`: "How'd you find me?" (TikTok / Instagram /
  YouTube / A friend / App Store / Somewhere else). It's attribution for payers per 1K
  views, and the one allowed exception to "every answer feeds the number or a setting",
  since it's never shown back. Opal calls this its most reliable attribution.
- **The exit offer is an A/B test** (`EXIT_OFFERS`, `DEFAULT_EXIT_OFFER` in
  `content.ts`): `none` (closing exits), `half-price` ($29.99/year, same trial) or
  `longer-trial` (full price, 14 days free; trial-eligible users only). Discount offers
  lost to refunds at BoldVoice and Yousician, and an extension beat a discount at
  Coconote. Preview an arm with `/onboarding?step=plans&exit=longer-trial`.


## Three changes from the conversion review, September 26, 2026

- **Lifetime is dropped from `plans`.** After annual went to $59.99, the $99.99 lifetime
  was 1.67× annual (PAYWALL_VIDEO_NOTES.md says 2–2.5×) and sat first on the page. It let
  buyers skip the trial, capped LTV, and would have muddied the trial test. The paywall is
  now Annual (default, 7-day trial) and Monthly.
- **The default exit arm is `longer-trial`** (14 days free at full price), not
  `half-price`. A $29.99 offer behind the close button is easy to spread ("just hit X"),
  which matters for a TikTok-driven audience, and it shows as a downgrade in iOS Settings.
  All three arms are still in the test.
- **`found` moved to between `stat` and `age`.** It sat right before the math loader and
  stalled the build-up to the reveal. Mid-quiz, after the statistic, is a natural break,
  and every install (payers and non-payers) still answers it.

## Will it convert? Review, September 26, 2026

A code-and-docs review of the current flow (25 screens, `STEPS` in `content.ts`).

**Verdict: the onboarding is good enough to launch, and more preview polish won't move
conversion much.** The structure is the proven hard-paywall pattern: quiz, personal
number, aha demo, setup that starts tonight, commitment, dated trial timeline, two plans,
one exit offer. Every piece is backed by the Sub Club research and the earlier ratings.
What decides conversion from here is outside the preview:

1. **Trial → paid depends on the lock working, and that isn't proven yet.** Family
   Controls isn't approved and the device spike hasn't run. GAME_PLAN says the spike
   comes before more UI.
2. **A blocker's trial is the week it annoys you.** Day 5 lands after a few mornings of
   being blocked. People who revoke Screen Time or delete the app to get out also cancel.
   The day-5 reminder needs a recap of what they got (mornings up, time before getting up)
   and one in-app save when a cancellation is detected (APPLIED_TO_LOCTURNE items 5 and 7).
   This is the biggest conversion lever left, and it lives after onboarding.
3. **The app-name copy can't ship as written.** `FamilyActivityPicker` returns opaque
   tokens (APP_PICKER_RESEARCH.md), but `commit`, the `offer` timeline, the paywall
   checklist and the Share text all put app names into plain strings ("TikTok and 2 more
   sleep at 11:30 PM"). Picked categories don't even have a count. These lines need a
   version that works from tokens: a native `Label(token)` icon row, or "Your apps" /
   "3 apps".
4. **The real Screen Time prompt is heavier than the mock.** iOS asks for Face ID or the
   passcode after "Continue". It's the right place for it (Opal does it pre-paywall), but
   measure exits here first once it's real.
5. **No social proof near the paywall.** It can't exist before launch. Add a rating or a
   user count once TestFlight has one.

Nothing in the flow's structure or copy (apart from item 3) needs changing before
TestFlight. Funnel data will say more than another rating round.
