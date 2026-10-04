# Track 1: Behavioral science applied to Locturne's onboarding

Research date: 2026-10-03. Scope: peer-reviewed literature (economics, social psychology, survey
methodology, health communication) applied screen by screen to the 28-step flow in
`src/features/onboarding/content.ts` / `steps.tsx`. Read alongside docs/NIGHT_PHONE_SCIENCE.md and
docs/ONBOARDING_CONVERSION.md. This document tries not to repeat them, and says where it disagrees
with them.

## How to read the grades

| Grade | Meaning |
|---|---|
| **A** | Pre-registered RCT / large field experiment, or a meta-analysis of experiments, with numbers |
| **B** | A single lab or field experiment, or a meta-analysis with heavy heterogeneity or publication-bias concerns |
| **C** | Large correlational / survey data |
| **D** | Single-app observation, vendor data, anecdote |
| **E** | Theory or opinion |

"Verified" means I read the number in the primary source or its abstract during this session.
"From memory" means it's a well-known number I couldn't re-fetch: the session's web-search budget ran
out partway through. Check those before you quote them publicly.

**Caveat that applies to everything:** none of these studies tested a paid bedtime blocker's
onboarding. Every prediction below is a transfer from another domain. The A/B tests at the end exist
to close that gap.

---

## 0. The ten findings that matter most (ranked by expected impact × confidence)

1. **Walking people through setting a commitment produces far more take-up than offering it.**
   In Allcott, Gentzkow & Song (2022), only 23% of participants said they were interested in screen
   limits at baseline, but **78% set binding limits and kept them through the end of a 12-week
   experiment** once a survey walked them through it. The authors think simply offering the tool
   would have had smaller effects. Locturne's setup-before-paywall design is the right one. It also
   gives you a citable stat to replace the weak 85% one (§1.1, §2.2). **[A, verified]**
2. **Consumers anticipate auto-renew inertia and avoid offers that exploit it.** In a 1.4M-reader
   field experiment, auto-renewing trials *lowered* take-up by 35% and total subscribers by 23% over
   20 months. The authors conclude that firms that "credibly promise easy cancellation and timely
   reminders" may gain customers. Apple trials always auto-renew, so the reminder toggle, the dated
   timeline and the cancel copy are the levers. Make them more concrete, not less (§6.3).
   **[A, verified]**
3. **Loss framing has no reliable advantage for prevention behaviors** (O'Keefe & Jensen 2007,
   93 studies: r = .03, in favour of *gain* framing). The "over N years of your life" line is a loss
   and fear frame, built on a 57-year extrapolation from a default age of 22. It is the most likely
   place the flow backfires with skeptical Gen Z viewers (§5.1). **[A for framing; E for the
   backfire prediction]**
4. **The `age` question is only used for the lifetime line.** Its subtitle, "Sleep needs change with
   age.", describes a purpose the reveal no longer has, because the sleep-room line was removed. Either
   make the reason honest or cut the question, and test cutting it together with the lifetime line
   (§5.2). **[E/legal; high confidence about the code fact]**
5. **Response-scale ranges change the answers and the user's self-judgment** (Schwarz et al. 1985).
   The night buckets are well calibrated: their middle option (30–60 min) brackets the
   peer-reviewed norm of about 42 min. Keep them, and never "test" a higher-range scale. That would
   be manipulating the number (§3). **[A for the effect; verified norm]**
6. **Self-reported phone time correlates only r = .38 with logs** (Parry et al. 2021, 106 effects).
   The reveal number is an honest *perception*, not a measurement. Keep "Based on your answers", and
   plan to reconcile it with real Screen Time data during the trial (§3.3). **[A, verified]**
7. **Fresh-start effect: commitment-contract creation on stickK rose 145% at the New Year** and 63%
   at the start of a week (Dai, Milkman & Riis 2014). A January 2–5 launch is ideal. Use "night one"
   language, but don't delay the start date, because that burns trial days (§7). **[B/C, verified]**
8. **Future lock-in / Save More Tomorrow.** People commit more readily when the restriction starts
   later. "Your apps sleep at 11:30 PM" is already future-dated in daytime onboarding, but not for
   someone onboarding at 12:40 AM inside the window. Test the in-window case (§1.4). **[A for SMarT;
   E for the transfer]**
9. **If-then plans work, though about half as well as the famous number.** The 2025 update of the
   implementation-intentions meta-analysis (642 tests) gives a pooled d ≈ 0.36, not 0.65. Effects are
   larger with an if-then format and rehearsal. Rewrite `commit` as an explicit if-then, and keep the
   `walk` rehearsal (§4.2). **[A, verified]**
10. **Reactance is the main risk for a blocker.** Controlling language raises reactance, and a
    freedom-restoring postscript lowers it (Miller et al. 2007). Loc's "Change anything later" and
    "Emergency unlock, anytime" are doing real work. Add a "the only time that's mine" answer for
    revenge-bedtime-procrastinators, so the app doesn't read as taking away their only free time
    (§2.1, §8). **[B]**

---

## 1. Commitment devices and present bias

### 1.1 Allcott, Gentzkow & Song (2022), "Digital Addiction", *AER* 112(7): 2424–63

Source: https://www.aeaweb.org/articles?id=10.1257/aer.20210867. Working paper with full text:
https://www.nber.org/papers/w28936. All numbers below are verified from the paper's introduction.

**Design.** About 2,000 U.S. adult Android users recruited through Facebook and Instagram ads. They
installed "Phone Dashboard", which logged screen time and, for the Limit group, let them set per-app
daily limits. **Changes took effect the next day**, and limits "in most cases could not be immediately
overridden", unlike iOS Screen Time. There were two randomized treatments:
- **Bonus:** $2.50 per hour for reducing use of FITSBY apps (Facebook, Instagram, Twitter, Snapchat,
  browsers, YouTube) for 3 weeks.
- **Limit:** access to the limit tool for about 12 weeks.

The study ran during the early COVID period. Registered: AEARCTR-0005796.

**Key numbers:**
| Finding | Number |
|---|---|
| Limit tool effect on FITSBY use | −22 min/day (−16%) over 12 weeks; only a slight decline over time |
| Take-up with no incentive | **78% set binding limits and kept using them through the final weeks** |
| Share with any positive limit | ~89% |
| Opted out of limits entirely | ~4% |
| Baseline *interest* in limits | Only 23% "moderately/very" interested; 34% "not at all" |
| Said they used their phone "too much" | Average ideal reduction: 34% |
| Willingness to pay for 3 weeks of limits | Mean **$4.20**; 58% would pay something; 20% > $10 |
| Underprediction of next-period use (control) | 6.1 min/day (~4%): slight naivete |
| Bonus effect | −56 min/day (−39%) during; −19 min/day after; −12 min/day 3 weeks later (habit formation) |
| Projection bias | Anticipatory response only 12% of what fully attentive habit formation predicts |
| Modelled share of use caused by self-control problems | **31%** (48 min/day of a 153 min/day baseline) |
| Baseline use of any commercial limiting app | Only 5% |

**What it predicts for Locturne:**

- **The gap between 23% interest and 78% take-up is the most important number for onboarding.**
  Demand for commitment is latent. It appears when someone is *walked through* setting the limit to
  match their own stated ideal. The authors write that simply offering the functionality without
  that walkthrough "would have had smaller effects". This directly supports `bedtime` → `wake` →
  `method` → `apps` → `ready` → `commit` before the paywall. It also suggests a refinement: their
  walkthrough tied the limit to *the user's own stated ideal*. Locturne asks what the user *does* but
  never what they *want*. **Test:** at `bedtime`, before the wheel, have Loc ask
  "What time do you *wish* you put the phone down?" and default the wheel to that answer. That makes
  the schedule visibly the user's own ideal, which supports both autonomy (§8) and consistency (§4.3).
  Confidence: medium.
- **Next-day changes.** Phone Dashboard's "changes effective next day" rule is the commitment
  mechanism. NIGHT_PHONE_SCIENCE.md Principle 2 already recommends it. This study is the strongest
  evidence for keeping it: the limit's effect barely decayed.
- **Pricing sanity check.** $4.20 per 3 weeks annualizes to about $73 a year. That was the *average*
  across a general Facebook-recruited sample, most of whom weren't interested in limits at baseline.
  The 20% willing to pay more than $10 per 3 weeks annualize to over $170 a year. $59.99 a year sits
  below the general-population mean, in a market Locturne's TikTok funnel pre-selects for interest.
  This is weak support for the price, not for raising it. MPL valuations aren't purchases (Grade B for
  this use).
- **"Self-control problems explain about 31% of use"** is a *modelled* estimate for social apps across
  the whole day, not for bedtime. Don't put it in Loc's mouth (VOICE.md rule), and don't present it
  as "31% of your phone time is wasted".
- **Only 5% used any limiting app at baseline.** That is the market's real obstacle: awareness and
  trust, not demand. It argues for spending onboarding time on *how it works and how you get out of
  it* (`tomorrow`, the reassurance line), not on more quiz questions.

**A better `stat` screen (recommended).** Replace or A/B the 85% morning statistic with a
commitment-demand fact, which also works as social proof for a pre-launch app with no reviews:

> **78%**
> of people given app limits they couldn't skip chose to keep them on, for 12 weeks.
> *Allcott, Gentzkow & Song, American Economic Review, 2022*
> Loc (aside): "So it's not just you. It's not just me either."

This is accurate to the paper ("set binding limits and continued using them through the final
weeks"). It is peer-reviewed. It answers the main unspoken objection ("I'll just turn it off"), and it
is social proof without fake reviews. Grade A evidence; the conversion prediction is E. Confidence:
medium-high that it beats a generic morning stat on trust.

### 1.2 Present bias and who takes up commitment

- **Laibson (1997), "Golden Eggs and Hyperbolic Discounting", *QJE* 112(2)**
  (https://doi.org/10.1162/003355397555253). This paper sets up the β–δ model: present-biased people
  value illiquid commitment. Theory (E), and the foundation of everything below.
- **Augenblick & Rabin (2019), *Review of Economic Studies* 86(3): 941–975**
  (https://faculty.haas.berkeley.edu/ned/Augenblick-Rabin_ExperimentOnTimePreference.pdf). In a
  real-effort task, people chose 10–12% fewer tasks for "now" than for any future date (β ≈ 0.83).
  Participants **understood at most about 24% of their own present bias**, and showed projection bias
  (4–12% fewer tasks chosen right after working). **[A/B, verified via abstract]**
  *Prediction:* most Locturne buyers are **partially naive**. They will underestimate how much they'll
  want to override at 12:30 AM. That's good for the product, since the lock binds. It's bad for
  retention if they also overestimate their future adherence and then churn or refund after
  "losing". This is why D35 net revenue (already the repo's metric) is right, and why lapse handling
  ("passes", no shame) matters more than onboarding polish for LTV.
- **Carrera, Royer, Stehr, Sydnor & Taubinsky (2022), "Who Chooses Commitment?", *REStud* 89(3):
  1205–44** (https://www.nber.org/papers/w26161). In a gym experiment (N = 1,248), take-up of
  commitment contracts was high but **driven by noise and wrong beliefs**: about half of those who
  committed to *more* gym visits also committed to *fewer*. **[A, verified]**
  *Prediction:* a high hold-to-agree completion rate on `commit` does **not** prove users are
  sophisticated or want the product. Don't read `commit` completion as intent. Watch refunds and
  week-1 cancellations by `commit` hold-duration or hesitation instead. Allcott et al. (footnote 4)
  argue their limits differ because people *kept using* them for 12 weeks. Locturne's equivalent is
  nights armed, not the button.
- **Giné, Karlan & Zinman (2010), "Put Your Money Where Your Butt Is", *AEJ: Applied* 2(4)**
  (https://www.socialscienceregistry.org/trials/1129; summary at
  https://poverty-action.org/node/12726/pdf). A money-at-stake smoking commitment had only **11%
  take-up**. It raised 6-month quit rates by 3 percentage points, and the effect persisted at 12
  months. **[A]** Compare that with 78% take-up for costless, flexible limits in Allcott. **Hard,
  costly commitments get low take-up; soft, flexible ones get high take-up.** This is strong
  empirical support for GAME_PLAN's "no money stakes, no punishment" rule, and for the emergency
  unlock.
- **Bryan, Karlan & Nelson (2010), "Commitment Devices", *Annual Review of Economics* 2: 671–698**
  (https://ideas.repec.org/a/anr/reveco/v2y2010p671-698.html). This review distinguishes hard
  commitments (financial or physical) from soft ones (psychological costs). Take-up of hard
  commitments is generally low, and many takers fail and pay the penalty: a welfare warning.
  Locturne is a *physical-hard but cost-soft* device (you must walk, but there's no penalty), which
  is close to the take-up sweet spot. **[A review]**
- **Schilbach (2019), "Alcohol and Self-Control", *AER* 109(4): 1290–1322**
  (https://www.aeaweb.org/doi/10.1257/aer.20170458). Most of 229 Chennai cycle-rickshaw drivers chose
  sobriety incentives over higher unconditional pay: real demand for commitment in a domain where
  people know they struggle. **[A]** Transfer: demand for commitment is highest when people have
  first-hand recent experience of failing. That is the case for someone onboarding at 1 AM straight
  from TikTok (see §1.4).
- **DellaVigna & Malmendier (2006), "Paying Not to Go to the Gym", *AER* 96(3)** (from memory). Gym
  members on flat monthly contracts paid about $70 a month and averaged about 4.3 visits a month
  (~$17 a visit, versus a $10 pay-per-visit option), and took months to cancel. **[C/A]** This is
  overconfidence about future use. Ethically, it argues for the reminder and for not making the
  annual plan's default depend on overconfidence. Commercially, it's why annual plans work.

### 1.3 What this means for the hold-to-agree and the paywall (summary)
- Commitment demand is real but partly noise (Carrera). Don't make the commitment step **harder** to
  "filter for intent". Make it **meaningful**: the user's own ideal, an if-then plan, and easy
  reversibility.
- Soft commitment gets the most take-up (Giné vs Allcott). Keep "Passes cover sick days and travel.
  Change anything later." on `commit`.

### 1.4 Future lock-in: when the commitment starts matters
- **Thaler & Benartzi (2004), "Save More Tomorrow", *JPE* 112(S1)** (from memory;
  https://doi.org/10.1086/380085). 78% of employees offered the plan joined, and average saving rates
  rose from 3.5% to 13.6% over 40 months, because the increases started *later*. **[A, field]**
- **Rogers & Bazerman (2008), "Future lock-in", *OBHDP* 106(1)** (from memory). People favour "should"
  choices more when they take effect in the future. **[B]**
- **Beshears, Dai, Milkman & Benartzi (2021), *OBHDP*.** A fresh-start date for a future savings
  increase raised enrollment at that date by about 50%, with no drop in immediate enrollment
  (https://anderson-review.ucla.edu/fresh-start-framing-boosts-retirement-plan-participation/). **[A]**

*Application:* daytime onboarding is already future lock-in ("Your apps sleep at 11:30 PM"). The
untested case is **someone onboarding inside their own bedtime window** (`isInsideBedtime` exists in
estimate.ts). For them, buying means the lock starts *now*, the most present-biased frame possible.
**A/B test (in-window installs only):** "They go to sleep the moment you're done" vs "Tonight's off
the record. They sleep from 11:30 PM tomorrow. The morning gate still starts tomorrow." The second
should raise purchase. Its risk is delaying the first-night activation event, so judge on D35 net
revenue, not on purchase. Note a subtlety: Schilbach and the "hot state" argument (§1.2) predict the
*highest* commitment demand at 1 AM. Present bias and hot-state demand pull in opposite directions,
which is exactly why this should be tested and not argued. Confidence: low–medium on direction.

---

## 2. Bedtime procrastination, phone use in bed, and the morning (copy accuracy)

### 2.1 Bedtime procrastination
- **Kroese, De Ridder, Evers & Adriaanse (2014), *Frontiers in Psychology* 5:611**
  (https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00611/full). Defines
  bedtime procrastination as "failing to go to bed at the intended time, while no external
  circumstances prevent a person from doing so." N = 177 (MTurk, mean age 38). It correlated r = .61
  with insufficient sleep and r = −.52 with self-regulation. **[C, verified]**
- **Kroese et al. (2016), *Journal of Health Psychology*** (https://dspace.library.uu.nl/bitstream/handle/1874/346688/Bedtime.pdf).
  A representative Dutch sample of N = 2,431: over 50% regularly go to bed later than they'd like,
  and 45% feel tired 2+ days a week. Bedtime procrastination mediated the self-regulation →
  insufficient-sleep link. **[C]**
- **Valshtein, Oettingen & Gollwitzer (2020), *Psychology & Health* 35(3): 275–301.** Two RCTs
  (N = 510, N = 250) found mental contrasting with implementation intentions reduced the gap between
  planned and actual bedtime versus controls. **But participants did not sleep significantly more or
  go to bed earlier.** The gap closed mostly because they *revised their intended bedtime to be more
  realistic* (https://solvingprocrastination.com/study-bedtime-procrastination-mcii-technique/). **[A,
  with an important null]** *Implication for `bedtime`:* an unrealistic default (11:30 PM for someone
  who sleeps at 1:30) produces a lock that feels punitive and gets loosened or abandoned. Kovacs et al.
  2021, in NIGHT_PHONE_SCIENCE.md, found people drift toward weaker settings. Default the wheel to
  something anchored on the user's own answer (see §1.1, "what time do you wish…"), not a universal
  11:30.
- **"Revenge bedtime procrastination."** A popular term (from the Chinese 报复性熬夜, spread in
  English in 2020). Academic work is thin and mostly cross-sectional. It frames late-night scrolling
  as reclaiming free time that days without autonomy took away. **[E/C]** *Copy implication:* the
  `nights` options don't cover this motive. Add:
  - Option: "It's the only time that's mine."
  - Echo on `math`: "Your time, you said. Keep it. Just not the feed."

  This pre-empts the strongest reactance trigger for a blocker: "you're taking my only free time".
  It also lets the reassurance line ("Only the apps you pick") do more work. Confidence: medium.

### 2.2 Phone use in bed and sleep (effect sizes for accurate copy)
- **Hjetland, Skogen, Hysing, Gradisar & Sivertsen (2025), *Frontiers in Psychiatry*,
  doi:10.3389/fpsyt.2025.1548273**
  (https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1548273/full).
  45,202 Norwegian students aged 18–28 (SHoT 2022). **87.2% use screens after going to bed, for
  about 42 min a night, on about 6.3 nights a week.** Each extra hour of screens in bed was linked to
  59% higher odds of insomnia symptoms and 24 min less sleep. Cross-sectional, with a 35% response
  rate. Social-media-only users did *not* sleep worse than other screen users. **[C, verified]**
  - The repo already uses the 24-minute and 42-minute figures correctly.
  - **New and useful:** 6.3 nights a week. If `nights-per-week` starts empty, fine. If it
    pre-selects days, pre-selecting all 7 is closest to the norm. Don't pre-select fewer to make the
    number look "honest". That would be understating.
  - The finding that social-media-only users don't sleep worse means the app shouldn't claim that
    feeds are uniquely harmful. "It's the time, not the app" is the accurate line.

### 2.3 The `stat` screen: "85% of U.S. adults check their phone within 10 minutes of waking"
- **True source:** Reviews.org, "Cell Phone Addiction" survey
  (https://www.reviews.org/mobile/cell-phone-addiction/). The current edition (published
  January 1, 2026) reports **84.6%**. It was an online **Pollfish** survey of about 1,000 U.S. adults
  in Q4 2025, weighted by age, gender and region, with a stated ±4% margin of error. Reviews.org is a
  commercial affiliate-review site. The figure changes every year (earlier editions said "nearly 85%"
  or 89%). **[C-minus: opt-in panel, single item, not peer-reviewed]**
- **Is it citable?** Yes, if you attribute it ("Reviews.org survey, 2026") and phrase it as "Nearly
  85%". Showing "85%" with no source puts Loc's credibility behind a marketing poll. It is accurate
  enough for an interstitial, but it is the weakest number in the flow. Older alternatives are
  worse or stale. Deloitte's Global Mobile Consumer Survey (2016) found 43% of Americans use their
  phone within 5 minutes of waking
  (https://www.cbsnews.com/philadelphia/news/43-percent-of-americans-use-smartphone-within-5-minutes-of-waking-up-survey/).
  Common Sense Media (2019) is about checking *before sleep*, not waking.
- **Better-sourced replacements, in order of preference:**
  1. **Allcott 78%** (§1.1): peer-reviewed RCT, works as commitment social proof. Place it where
     `stat` is now. Its echo no longer depends on the morning answer, so move the `MORNING_ECHO`
     lines to `math` or drop them.
  2. **Hjetland 87% / 42 min / 6.3 nights**: peer-reviewed, the target demographic, and about the
     night half of the product. Copy: "**9 in 10** students use their phone after getting into bed.
     About 42 minutes a night, almost every night." Footnote: "Survey of 45,202 students, Frontiers
     in Psychiatry, 2025." Caveats: it's "screens", not "phones", and Norwegian students. Saying
     "students" (not "Americans") keeps it accurate. Place it **after** `night-minutes` and
     `nights-per-week`, never before: shown first, it would anchor the answers (§3).
     - **Boomerang risk:** descriptive norms pull below-average people *up* toward the norm unless an
       injunctive cue is added (Schultz et al. 2007, *Psychological Science*, from memory). A light
       user told "the average is 42 minutes" may decide they don't need the app. The flow already
       routes light users (<60 min a week) to the morning pitch. For them, show the morning stat
       instead.
  3. **Keep Reviews.org** but show "Nearly 85%" and a one-line source.

---

## 3. Survey methodology: how the questions shape "the number"

### 3.1 Response-alternative (scale-range) effects
- **Schwarz, Hippler, Deutsch & Strack (1985), *Public Opinion Quarterly* 49(3): 388–395**
  (doi:10.1086/268936; summarised at
  https://api.isr.umich.edu/keyword/behavioral-reports-judgments-regarding-tv-usage/). People
  estimated daily TV time on either a low-range scale ("up to ½ h" … "more than 2½ h") or a
  high-range scale ("up to 2½ h" … "more than 4½ h"). From memory: **16.2% reported more than 2½ h on
  the low scale versus 37.5% on the high scale.** The high-scale group also rated TV as more
  important in their lives and were less satisfied with their leisure. People use the scale's
  middle as information about what's "normal". Reviewed in Schwarz (1999), "Self-reports: How the
  questions shape the answers", *American Psychologist* 54: 93–105. **[A, classic and widely
  replicated in survey methodology]**
- **What this means for Locturne:**
  - `night-minutes` buckets (<10 / 10–30 / **30–60** / 1–2 h / 2 h+): the middle option brackets the
    peer-reviewed norm of about 42 min (Hjetland). **This is the honest calibration.** The values
    used (5/20/45/90/150) are at or below each bucket's midpoint, so the number leans low. Keep both.
  - `morning-minutes` buckets (<5 / 5–15 / **15–30** / 30–60 / 1 h+): there's no good norm for
    "phone in bed after the alarm". A middle of 15–30 minutes is plausible but unvalidated. The
    morning share is also presented in the reveal's sub-line ("2 of them before you're even up").
    Since 20 min × 7 = 2.3 h a week, an average person sees a substantial number. No change needed,
    but don't widen the upper buckets.
  - **The scale also moves the user's self-judgment, not just the number.** Picking the top or
    second-highest bucket tells the user "I'm above normal", and that drives motivation. An honest
    scale gives heavy users the truthful signal for free.
  - **Ethical line (firm):** shifting bucket ranges upward to inflate the reveal would be textbook
    survey manipulation. Testing that and shipping the "winner" is exactly the dark pattern that FTC
    and Apple 5.1.1/2.3 language targets, and it's the kind of thing a skeptical TikTok commenter
    screen-records. **Don't run that test.** Order effects (descending vs ascending options) are
    milder. On mobile, people pick the first option more when the list scrolls
    (https://www.mzes.uni-mannheim.de/en/publications/details/exploring-scale-direction-effects-and-response-behavior-across-pc-and-smartphone-surveys).
    Keep ascending order, and keep all five options visible without scrolling on small phones.
- **Disagreement with ONBOARDING_CONVERSION.md:** it cites "Buckets beat sliders for self-report
  (Ellis 2019; Schwarz 1985) [S]". Neither paper shows that. Schwarz 1985 shows buckets *bias*
  reports through their range. Ellis 2019 shows usage *scales* predict real use poorly, though single
  estimates and "habit" framings do better. Buckets are still the right UI (fast, one tap, and they
  cap absurd answers), but cite them as a UX choice, not as evidence of accuracy.

### 3.2 Anchoring
Anchors inside the flow:
- **The age wheel's default is 22** (`AGE_DEFAULT`). Anyone who just taps Continue gets
  `yearsLeft = 57`, the largest lifetime number for most adults over 22. That's a default doing
  persuasion work, and it overstates the lifetime line for users who are actually older. Defaults
  are strong (§4.6), so assume a meaningful share of users don't move the wheel. **Check analytics:**
  what share of `age` answers are exactly 22? If it's high, the lifetime line is inflated for them.
  (Fix in §5.2.)
- **The bedtime wheel defaults to 11:30 PM.** See §2.1 on realistic defaults.
- **"About two minutes"** on `deal` anchors how long the user expects onboarding to take. With 28
  screens, a 20-step walk and an Apple permission flow, real median time is probably 4–6 minutes
  (unverified; check PostHog). Galesic & Bosnjak (2009, *Public Opinion Quarterly*, from memory)
  found longer *stated* survey length lowers starts, and longer *actual* length raises breakoff. A
  stated length that's exceeded makes the paywall feel like one more ask. **Fix:** change the line
  to the measured median ("About three minutes" if true), or "A few questions, then I set up
  tonight."

### 3.3 People misestimate their own phone use
- **Parry et al. (2021), *Nature Human Behaviour* 5: 1535–1547**
  (https://www.gwern.net/doc/psychology/2021-parry.pdf). A pre-registered meta-analysis of 106 effect
  sizes from samples totalling 52,007 people. Self-reported and logged use correlate **r = .38**
  (95% CI .33–.42). Problematic-use scales correlate r = .25. **Under 10% of self-reports fell within
  5% of logs.** Over- and under-reporting were equally common across studies (47% each). The pooled
  ratio of means was 1.21 (more over-reporting, not significant). Duration estimates leaned toward
  over-reporting, frequency estimates toward under-reporting. **[A, verified]**
- **Ellis, Davidson, Shaw & Geyer (2019), *International Journal of Human-Computer Studies*.**
  Compared scales with iOS Screen Time logs. Correlations were generally poor, but **single
  estimates, and items framing use as habit rather than addiction, did better**
  (https://researchportal.bath.ac.uk/en/publications/do-smartphone-usage-scales-predict-behavior/).
  **[B]** *This supports Locturne's single-estimate bucket question and its "habit, not addiction"
  voice.*
- **Andrews, Ellis, Shaw & Piwek (2015), *PLoS ONE* 10(10)** (https://eprints.lancs.ac.uk/id/eprint/75876/).
  With N = 23, estimated *number of checks* didn't correlate with actual checks. People are much
  worse at frequency than duration. **[B, small]** *Don't ask "how many times do you check".*
- **Sewall et al. (2020), *Mobile Media & Communication*.** Inaccuracy is systematic and related to
  usage level and well-being. **[B]**

**What this means for the reveal's credibility:**
1. At the individual level, the reveal number has about ±50% error. "Based on your answers you
   spend about…" is the honest and correct hedge. Keep it. **Don't** add precision, such as
   "7 hours 34 minutes".
2. Duration self-reports lean high on average. Rounding *down* and using sub-midpoint bucket values
   compensates for that. The repo's conservative rounding is methodologically justified, not just
   ethically nice.
3. **Biggest opportunity: reconcile the number with logs during the trial.** If a
   DeviceActivityReport can show real in-window use (ONBOARDING_CONVERSION.md lists this as
   unverified), the Day-5 trial reminder could say "You guessed about 7½ hours a week. Last week
   your sleeping apps got [n] minutes." Accurate self-monitoring feedback is one of the
   best-supported behavior-change techniques (Harkin et al. 2016, d ≈ 0.40, already in
   NIGHT_PHONE_SCIENCE.md). It also replaces a perception with a fact at the moment of the payment
   decision. Feasibility is unverified; treat it as a device spike.
4. **Ethical limit:** the number may be presented as "time on your phone in bed", never as "time
   wasted" or "sleep lost". Allcott's 31% means most phone time in bed is time people endorse. The
   repo already follows this. Keep it.

---

## 4. The persuasion-and-commitment toolkit, screen by screen

### 4.1 Mere measurement, the question-behavior effect, and self-persuasion
- **Wood, Conner, Miles, Sandberg, Taylor, Godin & Sheeran (2016), *Personality and Social
  Psychology Review* 20(3).** Asking intention or self-prediction questions changes later behavior,
  d+ = 0.24 across 116 tests. Effects are larger for socially desirable, easy behaviors and student
  samples (https://eprints.whiterose.ac.uk/id/eprint/88297/). **[A/B: publication-bias concerns]**
- Self-persuasion: self-generated arguments persuade more than arguments you're given (Aronson 1999,
  *American Psychologist*; Briñol, McCaslin & Petty 2012, *JPSP*, both from memory). **[B]**
- **Applied:** `time-back` ("What would you do with them?") is a self-persuasion and change-talk item,
  and it's echoed on the `offer` headline. That's the most theory-consistent question in the flow.
  **Keep it, and consider moving it to right after the reveal**, as Loc's reply to "Let's fix this".
  The question then gets asked when the stake is most vivid, and the user's own answer becomes the
  bridge into setup. Confidence: low–medium; it's a cheap A/B.
- The quiz *as* a question-behavior intervention means a user who quits before the paywall may still
  scroll less tonight. That's nice ethically, but it isn't revenue.

### 4.2 Implementation intentions (`commit`, `walk`)
- **Gollwitzer & Sheeran (2006), *Advances in Experimental Social Psychology* 38:** d = 0.65 across
  94 tests. **Superseded by Sheeran, Listrom & Gollwitzer (2025), "The when and how of planning: …
  642 tests", *European Review of Social Psychology* 36(1): 162–194**
  (https://kops.uni-konstanz.de/handle/123456789/69905). Across 642 tests the raw pooled d is about
  **0.36**; outcomes range d = .27–.66. Effects are **larger with a contingent if-then format, high
  goal motivation, and rehearsed plans.** **[A]**
- **Disagreement with NIGHT_PHONE_SCIENCE.md §3.5:** it cites d = 0.65. Use about 0.36 as the
  current best estimate.
- **Applied to `commit`.** The current title, "Phone down at 11:30 PM. Downstairs to wake them.", is
  a goal plus a rule, not an if-then. Proposed:
  > **The deal.**
  > When it's 11:30, your apps go to sleep.
  > When the alarm goes, you go downstairs. Then they wake up.
  > *Passes cover sick days and travel. Change anything later.*
  > [Hold to agree] → "Fine. Deal."
- `walk` is **rehearsal**, the moderator that increased effects. It's the most evidence-backed screen
  in the setup block. Keep it before the paywall, and keep it skippable.
- MCII (§2.1) adds naming the inner obstacle. `tried` partly does this. Low-cost addition: on
  `tried-echo`, have Loc name the obstacle and the plan: "When you think 'one more video', it's
  already asleep."

### 4.3 Commitment and consistency (hold-to-agree)
- Cialdini's commitment principle: commitments that are **active, effortful, public and freely
  chosen** are more binding. Foot-in-the-door meta-analyses show small average effects (Burger 1999,
  *PSPR*, from memory). **[B]**
- **Don't cite the "sign at the top" honesty study** (Shu, Mazar, Gino, Ariely & Bazerman 2012,
  *PNAS*). It was retracted in 2021 after data problems, and a large replication failed (Kristal et
  al. 2020, *PNAS*). Any blog saying "signing increases follow-through" probably rests on it.
- **Hold-to-agree evidence:** no peer-reviewed test of a hold button exists. It's a Fabulous/Opal-style
  pattern (Grade D). Theory predicts a small gain in felt commitment (active and effortful) and a
  small conversion gain at most. Carrera et al. warn that completion ≠ intent.
- **Test:** hold vs tap ("Deal."). Measure paywall conversion *and* nights armed in week 1. Prediction:
  conversion is the same within noise, with slightly better week-1 adherence for hold. Confidence:
  low.
- **Public commitment** is the strongest lever and is currently unused. The `reveal` share button
  shares a *problem* ("My raccoon is disappointed"), not a *commitment*. **Test:** a share option on
  `armed`: "Locked from 11:30 tonight. My raccoon checks if I'm up." That's public commitment, and
  free distribution to the founder's TikTok audience. Confidence: medium on adherence, low on viral
  lift.

### 4.4 IKEA effect and effort justification (setup before paywall)
- **Norton, Mochon & Ariely (2012), *Journal of Consumer Psychology* 22(3)**
  (https://papers.ssrn.com/abstract=1777100). Self-assembled products were valued about 63% more,
  **but only when assembly succeeded.** **[B]** Co-author note: Ariely-associated papers have had
  integrity problems. The repo claims Ariely & Wertenbroch (2002) was retracted in September 2026; I
  couldn't verify that. The IKEA effect has independent replications, and a 2025 meta-analysis in
  *Psychology & Marketing* (Pelled et al.; 55 studies, N = 5,454, d = 0.57) is reported by secondary
  sources
  (https://siliconcanals.com/n-people-who-cant-throw-out-the-crooked-shelf-they-built-themselves-arent-sentimental-fifty-five-studies-covering-5454-people-found-that-building-a-thing-quietly-rewrites/).
  Treat it as **[B, primary unverified]**.
- **Applied:** `bedtime` → `apps` → `ready` is assembly. The condition "completion has to succeed"
  matters. The two places it can *fail* are `screen-time` (an Apple permission denial) and `apps`
  (choice overload, §4.7). A failed or abandoned assembly produces the *opposite* of the IKEA effect.
  Make those two screens bulletproof before adding any more "investment" screens.

### 4.5 Endowed progress and goal gradient (progress bar)
- **Nunes & Drèze (2006), *JCR* 32(4).** A 10-stamp card with 2 stamps pre-filled was completed by
  **34%**, versus **19%** for an empty 8-stamp card (N = 300, car wash)
  (https://ideas.repec.org/a/oup/jconrs/v32y2006i4p504-512.html). **[B: one field study, widely
  cited, few direct replications]**
- **Kivetz, Urminsky & Zheng (2006), *JMR* 43(1): 39–58.** Purchases speed up as people approach a
  reward. "Illusionary" progress also works
  (https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf). **[B]**
- **Survey-methodology evidence on progress bars** (Villar, Callegaro & Yang 2013, *Social Science
  Computer Review*, meta-analysis of 32 experiments, from memory). Constant-speed bars don't reduce
  breakoff. **Fast-then-slow** bars reduce it, and **slow-then-fast** bars increase it. **[A]** The
  repo's endowed-start, fast-to-slow bar matches this.
- **Watch-out:** "fast-to-slow" means the *late* setup screens feel slow. That's where the Apple
  permission and the picker sit. Fine, as long as no new screens are added late.

### 4.6 Defaults
- **Jachimowicz, Duncan, Weber & Johnson (2019), *Behavioural Public Policy* 3(2): 159–186.**
  58 studies, N = 73,675: d = 0.68 (95% CI 0.53–0.83), with large heterogeneity. Defaults are
  **stronger in consumer domains** and when they work through **endorsement** (the default signals a
  recommendation) or **endowment**
  (https://ideas.repec.org/a/cup/bpubpo/v3y2019i02p159-186_00.html). **[A]**
- **Applied:** the annual plan pre-selected (endorsement), the reminder toggle on, the stairs →
  downstairs default, and the bedtime and age defaults all inherit this force. Use it for things the
  user would endorse (annual with trial, reminder on). **Don't** let it set facts *about* the user
  (age 22, 11:30 bedtime). Those overstate the number or create an unrealistic lock.

### 4.7 Choice overload
- **Chernev, Böckenholt & Goodman (2015), *JCP* 25(2): 333–358.** 99 observations, N = 7,202. The
  average effect of assortment size on overload is small. Overload appears when **choice-set
  complexity, task difficulty, preference uncertainty and an effort-minimizing goal** are high
  (https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual).
  **[A]**
- **Applied:**
  - The 2 paywall plans are no concern. Keep it at two.
  - The `method` question as a single yes/no about stairs is ideal: low complexity, no preference
    uncertainty.
  - **`apps` (Apple's FamilyActivityPicker) has every overload condition.** Hundreds of apps, high
  uncertainty ("which ones *really* keep me up?"), a tired user at night, an effort-minimizing goal.
  The predicted failure is **deferral**: picking nothing, or quitting. Loc's copy should cut
  complexity: "Start with Social and Entertainment. Add the rest later." Category selection is
  supported by the picker. Measure the share of users who confirm with zero or one app, and the drop
  at this step. Confidence: medium–high that this is the biggest friction point in setup.

### 4.8 Labor illusion (`math`)
- **Buell & Norton (2011), *Management Science* 57(9): 1564–1579.** When a website shows the work it
  is doing, people value the service more, even with longer waits. That's operational transparency
  (https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376). **[B: lab studies; field follow-ups in
  food service]**
- **The mechanism is *seeing the work*, not waiting.** A generic "analyzing…" spinner is the weak
  version, and savvy users read it as theatre. Locturne's arithmetic is simple and true, so show it:
  > 45 min × 6 nights
  > + 20 min × 6 mornings
  > = about 6½ hours a week
  > Loc: "One more video, you said. Counting all of them."

  This is the labor illusion done honestly. It also makes the reveal number *auditable*, which fixes
  the credibility problem from §3.3. Keep it at 3 seconds or less. Confidence: medium.

### 4.9 Personalization and tailoring (echo lines)
- Tailored messages beat generic ones, but modestly: r ≈ .07 in the Noar, Benac & Harris (2007)
  *Psychological Bulletin* meta-analysis of tailored print health messages (from memory). **[A,
  small]** The echoes (`NIGHTS_ECHO`, `ALARM_ECHO`, `TRIED_ECHO`, `OFFER_HEADLINES`) are cheap
  tailoring. Keep them, but don't add questions *only* to feed an echo. Each extra question costs more
  than a small tailoring gain is worth.

### 4.10 Peak-end
- **Alaybek, Dalal, Fyffe et al. (2022), *OBHDP* 170.** Meta-analysis of 174 effect sizes: the
  peak-end effect on retrospective evaluations is **r = .58**, about as strong as the overall mean,
  and robust across boundary conditions
  (https://ideas.repec.org/a/eee/jobhdp/v170y2022ics0749597822000334.html). **[A]**
- **Applied:** the onboarding's emotional *peak* is currently the reveal, a *negative* peak. Its
  *end* is the paywall. Two implications:
  1. Put a **positive** peak between the reveal and the paywall. `walk` (live steps, "I'm up. Don't
     talk to me yet.") and `tomorrow` (shield lifts) are the candidates, and both are already in the
     right place.
  2. **For trial→paid**, the remembered trial is its best night or morning plus its last one. The
     Day-5 reminder and the Day-6/7 mornings are what get evaluated. Make the reminder recap the
     best morning ("Tuesday you were downstairs by 7:04"), not just "trial ends Friday". Confidence:
     medium.

---

## 5. Framing the reveal

### 5.1 Loss vs gain framing, fear appeals, and the "years of your life" line
- **O'Keefe & Jensen (2007), *Journal of Health Communication* 12(7).** 93 studies, N = 21,656: for
  prevention behaviors, **gain-framed messages were slightly more persuasive (r = .03)**, driven by
  dental hygiene. Other domains showed no difference
  (https://pubmed.ncbi.nlm.nih.gov/17934941/). **[A]**
- **O'Keefe & Jensen (2009), *Journal of Communication*.** For *detection* behaviors, loss framing had
  a tiny advantage (r = −.04, 53 studies). **[A]** Blocking apps at bedtime is prevention, not
  detection.
- **Fear appeals: Tannenbaum et al. (2015), *Psychological Bulletin* 141(6)** (doi:10.1037/a0039729,
  from memory; couldn't fetch). Fear appeals are effective on average (d ≈ 0.29), more so **when
  paired with efficacy statements** and for **one-time behaviors**, with little evidence of backfire.
  **[A]** A subscription purchase *is* a one-time behavior, and "Let's fix this" → setup is the
  efficacy pairing. So the threat → efficacy sequence is defensible.
- **Reactance and credibility risk (E, but specific).** The lifetime line multiplies a ±50%
  self-estimate (§3.3) by 52 weeks and by up to 57 remaining years (default age 22, life expectancy
  79), then shows it on a life grid. Three problems:
  1. **Extrapolation credibility.** Habits change. Allcott's own users cut 22 min a day with a tool.
     Projecting today's rate to age 79 is the kind of number a commenter calls "fake math".
  2. **It's a TikTok cliché.** Lots of "you'll spend X years on your phone" content exists. Gen Z
     viewers are primed to discount it, and discounting a persuasive attempt is itself a reactance
     response.
  3. **Shame drift.** VOICE.md and CLAUDE.md say "strict but never shaming". A life grid of months
     lit up as lost is closer to guilt than anything else in the flow.
- **Recommended A/B (high priority):**
  - **Arm A (current):** weekly hours → year grid → "That's over N years of your life."
  - **Arm B (gain, year only):** weekly hours → year grid → "That's 394 hours a year. You could have
    them back." (or "…16 days a year, back.") No age needed.
  - **Arm C (sleep-room, honest gain):** weekly hours → "With me, those hours are for sleeping, or
    reading, or nothing at all." (time-back echo)

  Primary metric: `reveal` → `plans` conversion and trial starts. Secondary: share rate. Prediction
  from the literature: B ≈ A on conversion (O'Keefe), with fewer negative comments if screen-recorded.
  If B ties, ship B: it drops a question and an ethical liability. Confidence that B doesn't *lose* by
  much: medium.

### 5.2 The `age` question (probable backfire)
- **Code fact:** `age` feeds only `yearsLeft`/`lifetimeDays` (the lifetime line) and `sleepNeed`.
  `sleepNeed` drives `showSleepRoom`, and the sleep-room line was removed from the reveal. So the
  subtitle "**Sleep needs change with age.**" describes a use the answer no longer has. That's a
  transparency problem: GOV.UK question guidance, already cited in ONBOARDING_RESEARCH.md, and Apple
  5.1.1's data-minimization spirit.
- **Costs of asking:**
  - One more screen.
  - A sensitive-feeling question in an anonymous app.
  - The under-13 gate teaches 11-year-olds to scroll the wheel up.
  - The wheel default of 22 inflates the lifetime line for anyone who doesn't move it.
  - Possible COPPA "actual knowledge" questions. Flag this for the legal or compliance track; I'm not
    giving legal advice.
- **Options:**
  1. If the B arm in §5.1 ties or wins, **delete `age`**, and rely on the App Store age rating plus
     terms for the 13+ policy. (Check with the legal track whether an explicit gate is needed.)
  2. If the lifetime line stays, change the subtitle to the true reason: "For one number later. It
     stays on your phone."
- Confidence: high that the current subtitle should change; medium that removal is net-positive.

### 5.3 Shareable copy
"About 7½ hours a week on my phone in bed. My raccoon is disappointed." is self-deprecating, which is
fine and on-voice. "Disappointed" sits near the shame line, though. Alternative: "About 7½ hours a
week on my phone in bed. A raccoon is now in charge." It's funnier, frames the app as the fix, and
makes no moral judgment.

---

## 6. The paywall: price perception, trials, inertia and reminders

### 6.1 The zero-price effect ("$0 today")
- **Shampanier, Mazar & Ariely (2007), *Marketing Science* 26(6): 742–757.** Cutting both prices by 1¢
  (Hershey's Kiss 1¢→0¢, Lindt 15¢→14¢) flipped choices toward the free item. "Free" is treated as
  categorically different from cheap
  (https://people.duke.edu/~dandan/webfiles/PapersPI/Zero%20as%20a%20Special%20Price.pdf). **[B]**
  Field evidence is mixed: no zero-price effect in Swedish prescription-drug choices (Ching et al.)
  (https://cbade.hkbu.edu.hk/wp-content/uploads/2020/09/20181221_CHING.pdf). Ariely is a co-author;
  see the §4.4 caveat.
- **Most relevant field evidence, from Miller, Sahni & Strulov-Shlain (§6.3):** a €0 trial vs a €0.99
  trial raised take-up **9%** during the promo, but **long-run subscriptions didn't differ**. **[A,
  verified]**
- **Applied:** "$0 today" on the timeline and "No payment due now" on the CTA are right, and are
  supported at Grade A for *take-up*. Don't expect them to move trial→paid. The repo's Sub Club notes
  on "$0.00 CTA" are consistent with this.

### 6.2 Pennies-a-day framing ("$5.00/month" secondary line)
- **Gourville (1998), "Pennies-a-Day", *JCR* 24(4): 395–408.** Reframing an aggregate cost as a small
  daily cost raises compliance, because people compare it to small, trivial expenses. It weakens or
  reverses when the daily amount stops feeling trivial
  (https://ideas.repec.org/a/oup/jconrs/v24y1998i4p395-408.html). **[B]**
- **Atlas & Bartels (2018), *JCR*, "Periodic Pricing and Perceived Contract Benefits"** (from memory).
  Per-period price framing makes long contracts feel like they deliver more benefits. **[B]**
- **Applied:** $59.99 a year = **16¢ a night**. The product is literally a per-night service, so the
  "night" framing has conceptual fit that "$5.00/month" lacks. **Test:** secondary line "$5.00/month"
  vs "16¢ a night". Apple requires the billed amount to stay most prominent, and both arms keep
  $59.99/year as the big number. Prediction: a small lift for "16¢ a night" with students, who
  compare against coffee and snacks. Confidence: low–medium. Cheap test.

### 6.3 Free trials, auto-renewal inertia, and the reminder toggle
- **Miller, Sahni & Strulov-Shlain (2026 version), "Sophisticated Consumers with Inertia: Long-Term
  Implications from a Large-Scale Field Experiment"**
  (https://marketing.wharton.upenn.edu/wp-content/uploads/2026/02/Strulov-Shlain-Avner-PAPER-Subscriptions.pdf;
  summary at https://gsb.stanford.edu/insights/auto-renew-snags-new-subscribers-its-not-good-way-keep-them).
  1.4M readers of a European newspaper, randomized 2×2×2: auto-renew vs auto-cancel, 2- vs 4-week
  trial, €0 vs €0.99. Verified results:
  - Auto-renew **lowered take-up by 35%** and total subscribers by 23% over 20 months.
  - Short-run paid subscriptions were higher (about +20% at 4 months), but the advantage vanished
    within 2 years.
  - Most consumers anticipate their inertia and avoid inertia-exploiting offers. Auto-renew takers
    were over-represented as "naifs", up to 5×.
  - The auto-renew take-up penalty is equivalent to roughly a **€4 price increase** on the promo.
  - The authors conclude: "businesses that can credibly promise easy cancellation and timely
    reminders might end up with more consumers and larger revenues."

  **[A, verified]**
- **Einav, Klopack & Mahoney (2023), "Selling Subscriptions", NBER w31547 / *AER*.** Using
  card-replacement shocks, inattention raises subscription revenue by an average of 89% (14% to over
  200% across services), with more inattention among less financially sophisticated consumers
  (https://www.nber.org/papers/w31547). **[A]**
- **What this means for Locturne:**
  1. Apple trials *must* auto-renew, so the auto-renew take-up penalty is built in. The only
     mitigation is to make the anticipated inertia trap feel **defused**. The reminder toggle (on by
     default), the dated `offer` timeline ("Day 7, Oct 10: $59.99 unless you cancel before then") and
     "I remind you. Grudgingly." are exactly what the authors prescribe. **Keep all three. That is now
     Grade-A-supported, not just Blinkist folklore.**
  2. **Make the promise more credible and concrete.** "Remind me 2 days before it ends" →
     "**I'll remind you on Oct 8.** Cancel in Settings, two taps." Check the cancel claim on a device
     first. A date beats a duration for credibility.
  3. **Keep the promise even when notifications are denied.** The code prompts for notifications
     after purchase when the toggle is on (`scheduleTrialReminder`). If the user denies, the reminder
     silently can't fire. Add a fallback: an in-app banner from Day 5, and a Live Activity or widget
     line if one exists. A broken "I'll remind you" is the most trust-destroying failure here, and
     invites "scam" reviews.
  4. **Ethics and strategy.** Einav et al. show inattention is lucrative but concentrated among less
     sophisticated consumers. Students on a TikTok funnel are exactly that group, and refunds and
     1-star "charged me" reviews hit an indie app's ranking hard. The reminder is good ethics *and*
     good D35 economics.
- **Exit offer (`declined`):** these studies don't test discount vs longer trial. The repo's A/B is
  right. One prediction from the sophistication result: the **longer-trial** arm extends exposure to
  an auto-renew trap for people who just showed they're wary of one. Its take-up may be lower than
  intuition says, unless the reminder promise is repeated on the exit screen ("Same deal: I remind
  you two days before."). Confidence: low.

### 6.4 Anticipated regret
Anticipated regret shapes choice: people pick options that minimize expected regret (Zeelenberg 1999,
from memory; Grade B). At the paywall, the regret the user anticipates is "I'll forget and get
charged $60". The reminder removes it. A competing regret, "I'll keep scrolling every night", is what
the `reveal` and `offer` headline set up. **Don't** add explicit regret-inducing copy ("Don't let
another year go by"). It's controlling language (§8) and close to a shame mechanic.

---

## 7. Timing: the fresh-start effect and the January launch

- **Dai, Milkman & Riis (2014), "The Fresh Start Effect", *Management Science* 60(10): 2563–2582**
  (https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf).
  Verified from the PDF:
  - Google searches for "diet" rise 14.4% at the start of a week, 3.7% at the start of a month and
    **82.1% at the New Year**.
  - Gym visits rise 33.4% (new week), 14.4% (new month), 11.6% (new year) and 47.1% (new semester).
  - **Commitment-contract creation on stickK rises 62.9% (new week), 23.6% (new month) and 145.3%
    (New Year)**, and 55.1% after federal holidays.

  **[C: large observational datasets, corroborated by experiments]**
- **Beshears et al. (2021)** (§1.4): fresh-start framing of a *future* date raised commitment take-up
  by about 50%, without lowering immediate take-up. **[A]**
- **Applied:**
  1. **Launch Jan 2–5 is very well-timed.** stickK's +145% is the closest published analog to "demand
     for a self-chosen commitment device".
  2. **Copy:** a January-only variant of `hello` or `deal`: "New year. Same raccoon. Earlier nights."
     And frame tonight as a landmark: `ready` → "**Night one.** Tonight's lock is ready." Every user
     gets a personal "night one", a mini fresh start, without delaying anything.
  3. **Don't** offer "start Monday" or "start on the 1st". Apple trial days start at purchase, so a
     delayed start burns trial nights and delays activation. The only exception is the in-window
     test in §1.4.
  4. **Re-engagement:** schedule win-back and lapse notifications for Mondays, the 1st of the month,
     and the user's birthday (if age is kept, there's no birthday). This is already in
     NIGHT_PHONE_SCIENCE.md.
  5. **Mid-January decay.** Fresh-start motivation fades. Expect trial→paid on Jan 2–5 cohorts
     (charging Jan 9–12) to be *lower* than trial-start enthusiasm implies. Plan cash flow on
     conversion, not starts (see the user's income constraint).

---

## 8. Autonomy, reactance and Loc's voice

- **Self-determination theory: Ntoumanis et al. (2021), *Health Psychology Review* 15(2): 214–244.**
  73 trials. SDT-based interventions produce small-to-medium gains in autonomous motivation and health
  behavior. **Gains in need support and autonomous (not controlled) motivation predict behavior
  change**
  (https://research.birmingham.ac.uk/en/publications/a-meta-analysis-of-self-determination-theory-informed-interventio/).
  **[A, modest and heterogeneous]**
- **Reactance: Brehm (1966) theory. Miller, Lane, Deatrick, Young & Potts (2007), *Human
  Communication Research* 33: 219–240.** Controlling language ("you must", "stop") raises reactance.
  A short **restoration-of-freedom postscript** ("the choice is yours") reduces it. Rains (2013, *HCR*)
  meta-analysis: reactance is anger intertwined with counter-arguing (from memory). **[B]**
  (https://doi.org/10.1111/j.1468-2958.2007.00297.x)
- **Strict-lock stress:** GoalKeeper (Kim et al. 2019, in NIGHT_PHONE_SCIENCE.md). The strongest
  lockout cut use the most (d 0.54), but caused the most stress, and 20 of 36 people loosened their
  goals. **[B, small]**

**Audit of current copy:**
| Screen | Line | Read | Change |
|---|---|---|---|
| `hello` | "No apps until you're out of bed." | Controlling, but it's the product promise and the user chose to download it | Keep |
| `deal` | "Up means up" | Firm rule, framed as the product | Keep |
| `reveal` CTA | "Let's fix this" | Collaborative ("let's"), with efficacy | Keep |
| `commit` | "Phone down at 11:30 PM." | Imperative, but self-set | Make it if-then (§4.2); keep "Change anything later." (the freedom restoration) |
| `offer` | "Only the apps you pick. Emergency unlock, anytime." | Autonomy restoration at the point of payment | Keep. This line is doing real anti-reactance work |
| `under-13` | "Thirteen and up. Those are the rules." | Controlling, aimed at a child | Fine for a gate |
| `tried-echo` (screen-time) | "Screen Time has an Ignore button. I don't." | Signals strictness. Could trigger "trapped" reactance | Body already says there's an emergency unlock. Keep |
| `nights` | No "my only free time" option | Leaves revenge procrastinators feeling misread | Add the option (§2.1) |
| Share text | "My raccoon is disappointed." | Mild moral judgment | Swap (§5.3) |

Overall: **Loc's voice is already unusually autonomy-supportive** for a blocker. The principle to
keep: the *rule* is strict, the *language* never is, and every rule ships with a way out in the same
breath.

---

## 9. Humor, mascots and anthropomorphism

- **Humor and persuasion (meta-analytic):**
  - Walter, Cody, Xu & Murphy (2018), "A priest, a rabbi, and a minister walk into a bar: A
    meta-analysis of humor effects on persuasion", *Human Communication Research* 44(4). From memory:
    humor has **small** effects on persuasion and attitudes, with somewhat larger effects on attention
    and liking. **[A; exact effect sizes unverified]**
  - Eisend (2009, *Journal of the Academy of Marketing Science*), a meta-analysis of humor in
    advertising, from memory: humor raises attention and positive affect, and **slightly lowers
    source credibility**. **[A, unverified numbers]**
- **Anthropomorphism:** a meta-analysis plus experiments (via
  https://uta-ir.tdl.org/uta-ir/handle/10106/28658) finds anthropomorphism improves brand attitude
  through self-brand connection. It works **better for familiar brands and experience products, and
  worse for unfamiliar brands**. **[B]** Locturne is unfamiliar at launch; it is an experience
  product.
- **Duolingo:** Duo's success is real but **anecdotal as causal evidence (D)**. No published A/B
  isolates the mascot.
- **Applied predictions:**
  1. Loc's **similarity** move ("I don't do mornings well either", "Same.") builds relatedness, the
     SDT need, and liking. It also cuts moralizing, which is the anti-reactance function from §8.
     This is the best-supported use of the mascot. Keep it.
  2. **Humor costs credibility where credibility is needed.** Keep Loc *out of* the number (the
     reveal is already mostly voice-free) and out of the legal and price lines. "I remind you.
     Grudgingly." is fine: the joke sits *on top of* a factual promise, not instead of one.
  3. Without art, Loc is a *voice*, not a face. Anthropomorphism research mostly tests visual
     characters. Expect a smaller effect and less risk. The real test is whether the founder's TikToks
     make the voice recognizable. (Don't pitch troll mascots; Loc is a raccoon.)

---

## 10. Where the current flow may be backfiring (ranked)

| # | Risk | Mechanism | Evidence | Fix | Confidence |
|---|---|---|---|---|---|
| 1 | Lifetime "years of your life" line | Extrapolated loss frame; cliché; shame drift; inflated by the default age | O'Keefe & Jensen (no loss advantage), Parry (±50% input), reactance theory | A/B arms B and C (§5.1) | Medium |
| 2 | `age` subtitle claims a purpose the answer doesn't serve | Transparency; data minimization | Code fact | Honest subtitle, or delete the question with the lifetime line | High |
| 3 | `apps` picker overload → deferral or abandonment | Complexity + uncertainty + effort-minimizing goal | Chernev 2015 | Category-first copy; measure zero-app confirms | Medium-high |
| 4 | Trial reminder can silently fail if notifications are denied | A broken inertia promise | Miller et al. (the credibility of the reminder is what earns take-up) | In-app Day-5 banner fallback | High that it matters if it happens |
| 5 | "About two minutes" vs real length | Expectation violation before the paywall | Galesic & Bosnjak 2009 | Use the measured median | Medium |
| 6 | Weak 85% stat with no source | Credibility | Reviews.org, Pollfish opt-in | Allcott 78% or Hjetland 87%, with source | Medium |
| 7 | Default bedtime 11:30 for late sleepers | Unrealistic commitment → loosening or abandonment | Valshtein 2020 null; Kovacs drift; GoalKeeper | "When do you wish…" default | Medium |
| 8 | In-window onboarding: lock starts *now* | Present bias at the moment of purchase | SMarT; future lock-in | A/B (§1.4) | Low (direction contested) |
| 9 | `found` mid-quiz breaks the self-reflection arc | Narrative interruption | Theory only (E) | Optional test: move to first question as an easy warm-up | Low |
| 10 | Treating `commit` completion as intent | Commitment take-up is noisy | Carrera 2022 | Use nights armed and refunds as the intent signal | High (analytics hygiene) |

---

## 11. A/B test backlog from this track

All judged on **D35 net revenue per install** (repo standard), with trial-start rate and refunds as
secondaries. Expect small effects. At early install volumes, run these one at a time, in this order.

| Priority | Test | Arms | Predicted | Evidence | Confidence |
|---|---|---|---|---|---|
| 1 | Reveal payoff | A: lifetime years · B: "394 hours a year. You could have them back." (no age Q) · C: time-back gain | B ≥ A; ship B if it ties (drops a question and a liability) | O'Keefe & Jensen; Tannenbaum | Medium |
| 2 | `stat` content | A: 85% morning (sourced) · B: Allcott 78% kept limits · C: Hjetland 87% / 42 min | B wins on trust and paywall conversion | Allcott 2022 | Medium |
| 3 | Reminder copy | "Remind me 2 days before it ends" vs "I'll remind you on Oct 8. Cancel in Settings anytime." | B raises trial starts | Miller, Sahni & Strulov-Shlain | Medium |
| 4 | `math` loader | Generic counting vs visible true arithmetic | Visible arithmetic raises reveal trust | Buell & Norton | Low-medium |
| 5 | Per-period price line | "$5.00/month" vs "16¢ a night" | Small lift for "a night" | Gourville; Atlas & Bartels | Low-medium |
| 6 | Bedtime default | 11:30 PM vs the user's stated "wish" time | Better week-1 adherence, same conversion | Allcott walkthrough; Valshtein | Medium on adherence |
| 7 | `commit` format | Current vs explicit if-then | Same conversion; better nights armed | Sheeran 2025 | Low-medium |
| 8 | In-window start | Lock now vs from tomorrow's bedtime | Unknown direction | SMarT vs hot-state demand | Low |
| 9 | Hold vs tap | — | Null on conversion | Carrera; no direct evidence | Low |

**Not to test (ethical line):** inflated bucket ranges, a default age chosen to maximize the
lifetime number, fake progress or labor beyond the real arithmetic, countdown urgency, and hiding the
reminder toggle.

---

## 12. Disagreements with existing repo docs (summary)

1. **ONBOARDING_CONVERSION.md:** "Buckets beat sliders for self-report (Ellis 2019; Schwarz 1985)
   [S]" misreads both papers (§3.1).
2. **NIGHT_PHONE_SCIENCE.md §3.5:** implementation-intentions d = 0.65 is the 2006 estimate. The
   2025 642-test update is about 0.36 (§4.2).
3. **sub-club/APPLIED_TO_LOCTURNE.md** rates the 85% stat "Keep. Low stakes, weak source". I agree
   on weak; I disagree on keep. A peer-reviewed alternative (Allcott 78%) does more work in the same
   slot (§2.3).
4. **NIGHT_PHONE_SCIENCE.md** says Ariely & Wertenbroch (2002) was retracted in September 2026. I
   couldn't verify that, since it's after my reliable knowledge and the search budget ran out. Treat
   it as unverified, and apply the same caution to the zero-price and IKEA papers Ariely co-authored.
   The IKEA effect has independent support; the zero-price effect is mixed in the field.
5. **The age question:** ONBOARDING_RESEARCH.md said "Do not ask for age … without a concrete
   product need". The need it was added for (the sleep-room line) has since been removed from the
   reveal (§5.2).

---

## Sources (primary first)

- Allcott, Gentzkow & Song 2022, AER: https://www.aeaweb.org/articles?id=10.1257/aer.20210867 · NBER w28936: https://www.nber.org/papers/w28936
- Augenblick & Rabin 2019, REStud: https://faculty.haas.berkeley.edu/ned/Augenblick-Rabin_ExperimentOnTimePreference.pdf
- Carrera et al. 2022, REStud (NBER w26161): https://www.nber.org/papers/w26161
- Giné, Karlan & Zinman 2010: https://www.socialscienceregistry.org/trials/1129 · https://poverty-action.org/node/12726/pdf
- Bryan, Karlan & Nelson 2010: https://ideas.repec.org/a/anr/reveco/v2y2010p671-698.html
- Schilbach 2019, AER: https://www.aeaweb.org/doi/10.1257/aer.20170458
- Laibson 1997, QJE: https://doi.org/10.1162/003355397555253
- Thaler & Benartzi 2004, JPE: https://doi.org/10.1086/380085
- Beshears, Dai, Milkman & Benartzi 2021: https://anderson-review.ucla.edu/fresh-start-framing-boosts-retirement-plan-participation/
- Kroese et al. 2014: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00611/full · Kroese et al. 2016: https://dspace.library.uu.nl/bitstream/handle/1874/346688/Bedtime.pdf
- Valshtein, Oettingen & Gollwitzer 2020: https://solvingprocrastination.com/study-bedtime-procrastination-mcii-technique/
- Hjetland et al. 2025: https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1548273/full
- Reviews.org phone survey (84.6%, Q4 2025): https://www.reviews.org/mobile/cell-phone-addiction/
- Deloitte 2016 (43% within 5 min): https://www.cbsnews.com/philadelphia/news/43-percent-of-americans-use-smartphone-within-5-minutes-of-waking-up-survey/
- Common Sense Media 2019: https://www.commonsensemedia.org/press-releases/the-new-bedtime-companion-devices
- Schwarz et al. 1985 (summary): https://api.isr.umich.edu/keyword/behavioral-reports-judgments-regarding-tv-usage/ · Schwarz 1999: https://dornsife.usc.edu/norbert-schwarz/self-report/
- Parry et al. 2021: https://www.gwern.net/doc/psychology/2021-parry.pdf
- Ellis et al. 2019: https://researchportal.bath.ac.uk/en/publications/do-smartphone-usage-scales-predict-behavior/
- Andrews et al. 2015: https://eprints.lancs.ac.uk/id/eprint/75876/
- Scale direction on mobile: https://www.mzes.uni-mannheim.de/en/publications/details/exploring-scale-direction-effects-and-response-behavior-across-pc-and-smartphone-surveys
- Wood et al. 2016: https://eprints.whiterose.ac.uk/id/eprint/88297/
- Sheeran, Listrom & Gollwitzer 2025: https://kops.uni-konstanz.de/handle/123456789/69905
- Norton, Mochon & Ariely 2012: https://papers.ssrn.com/abstract=1777100
- Nunes & Drèze 2006: https://ideas.repec.org/a/oup/jconrs/v32y2006i4p504-512.html
- Kivetz, Urminsky & Zheng 2006: https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf
- Buell & Norton 2011: https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376
- Chernev et al. 2015: https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual
- Jachimowicz et al. 2019: https://ideas.repec.org/a/cup/bpubpo/v3y2019i02p159-186_00.html
- O'Keefe & Jensen 2007: https://pubmed.ncbi.nlm.nih.gov/17934941/ · 2009: https://www.cbsm.com/articles/33455-the-relative-persuasiveness-of-gain-framed-and-loss-framed-messages-for-encouraging-disease-detectio
- Dai, Milkman & Riis 2014: https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf
- Alaybek et al. 2022 (peak-end): https://ideas.repec.org/a/eee/jobhdp/v170y2022ics0749597822000334.html
- Shampanier, Mazar & Ariely 2007: https://people.duke.edu/~dandan/webfiles/PapersPI/Zero%20as%20a%20Special%20Price.pdf · Ching et al. (no field zero-price effect): https://cbade.hkbu.edu.hk/wp-content/uploads/2020/09/20181221_CHING.pdf
- Gourville 1998: https://ideas.repec.org/a/oup/jconrs/v24y1998i4p395-408.html
- Miller, Sahni & Strulov-Shlain 2026: https://marketing.wharton.upenn.edu/wp-content/uploads/2026/02/Strulov-Shlain-Avner-PAPER-Subscriptions.pdf · https://gsb.stanford.edu/insights/auto-renew-snags-new-subscribers-its-not-good-way-keep-them
- Einav, Klopack & Mahoney 2023: https://www.nber.org/papers/w31547
- Ntoumanis et al. 2021: https://research.birmingham.ac.uk/en/publications/a-meta-analysis-of-self-determination-theory-informed-interventio/
- Miller et al. 2007 (controlling language): https://doi.org/10.1111/j.1468-2958.2007.00297.x
- Anthropomorphism meta-analysis: https://uta-ir.tdl.org/uta-ir/handle/10106/28658
- IKEA 2025 meta-analysis (secondary report): https://siliconcanals.com/n-people-who-cant-throw-out-the-crooked-shelf-they-built-themselves-arent-sentimental-fifty-five-studies-covering-5454-people-found-that-building-a-thing-quietly-rewrites/

**From memory, not re-fetched this session (verify before quoting):** the Schwarz 1985 16.2%/37.5%
figures; Tannenbaum et al. 2015 d ≈ 0.29; Thaler & Benartzi's 78% / 3.5%→13.6%; Rogers & Bazerman
2008; DellaVigna & Malmendier 2006 figures; Villar, Callegaro & Yang 2013; Galesic & Bosnjak 2009;
Schultz et al. 2007; Noar et al. 2007 r ≈ .07; Walter et al. 2018 and Eisend 2009 effect sizes; Atlas
& Bartels 2018; Zeelenberg 1999; Burger 1999; Rains 2013.
