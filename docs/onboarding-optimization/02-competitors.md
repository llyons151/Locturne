# Track 2: Competitor and best-in-class onboarding teardowns (2025–2026)

Researched 2026-10-03. Builds on docs/OPAL_ONBOARDING_RESEARCH.md, ONBOARDING_CONVERSION.md,
PAYWALL_VIDEO_NOTES.md, PRICING_RESEARCH.md, STAND_OUT_ANGLES.md and IDEA_SCORECARD.md. It doesn't
repeat them. The new material is Opal's current captured flow and paywall pages, Apple's 2026
enforcement changes (rating prompts in onboarding, trial toggles, exit offers), Lazyweb's July 2026
corpus statistics, Superwall's multi-page and transaction-abandon data, and teardowns of Brainrot,
Unrot, Wayk, Quittr, Rise, Haven, ClearSpace and Clear 30.

**Evidence grades used:** [A/B#] A/B test with numbers · [A/B] A/B test, no numbers · [BENCH] benchmark or
corpus statistic (correlational) · [OBS] one app's observed flow · [ANEC] anecdote or founder claim ·
[OPINION]. Revenue figures from screensdesign/Adapty/Lazyweb are third-party **estimates**, not
verified. Screen counts depend on how the capture tool counts screens, so compare them loosely.

**Limits:** the session's web-search budget ran out partway through. Groggy's and BedLock's onboarding
couldn't be reconstructed: neither has a public teardown, and both had 0 ratings at last check
(IDEA_SCORECARD.md). Pages behind Mobbin, Pageflows and Lazyweb's paywall weren't viewable.
Whatever isn't cited below is marked unverified.

---

## 1. Headline findings

1. **Locturne's skeleton already matches the category leaders.** About 28 screens, the paywall at
   ~0.9 of the flow, a quiz, then a labor-illusion loader, then a personal "years of your life"
   number, then the permission, then commitment, then a two-page paywall. Opal, Brainrot, Unrot,
   Quittr and Wayk all run the same arc. Don't restructure. The gains left are in **details on four
   screens** (reveal, apps, plans, declined) and in **not copying** what Apple now rejects.
2. **Three tactics the category uses are now rejection risks. Don't copy them:**
   - **Rating prompts during onboarding.** Opal, Brainrot (twice), Wayk, Haven, Umax and Cal AI all
     do it. Apple began rejecting this under 5.6.3 in **June 2026**
     ([RevenueCat, 2026-06-18](https://www.revenuecat.com/blog/engineering/dont-prompt-ratings-during-onboarding)).
   - **Trial toggles.** Rejected under 3.1.2 since **January 2026**. Already avoided.
   - **Repeated or "one-time, gone forever" exit offers.** Rejected under 5.6
     ([Apple forum](https://developer.apple.com/forums/thread/768912)).
3. **One exit offer is fine; more than one is not.** An informal Apple contact told Superwall that
   one post-dismiss offer is allowed and that looping or resurfacing it is not
   ([Superwall, 2026-06-03](https://superwall.com/blog/external-checkout-a-b-testing-and-trial-toggles-confirmed-apples-rules-for-ios)).
   Locturne's single exit-offer design is on the right side of that line. Keep the copy free of
   urgency.
4. **The two-page paywall is right.** Superwall saw 12.41% conversion on multi-page onboarding
   paywalls vs 9.07% on single-page across 40M+ opens (Feb–May 2026, observational)
   ([Superwall](https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why.md)).
   Opal now runs **three pages**: value + proof, then *pick your reminder day*, then timeline + plans.
5. **The biggest gap is the reveal.** Opal and Brainrot give a bad number and then a *good* number
   ("Opal will get you back 5 years"), and carry the good number into the paywall. Locturne's reveal
   stops at the bad number. That gives two specific fixes: a "the better number" beat, and a
   personalized plans headline.
6. **Use what the user picked.** Locturne asks for the FamilyActivityPicker selection before the
   paywall (Opal asks after it), but never shows the chosen apps on the offer. Render the selected
   app tokens, asleep, on `offer`/`plans`. Of everything here, this is the most "theirs".
7. **Price check:** $59.99/yr with a 7-day trial sits with the sleep apps: Rise $69.99, Alarmy $59.99,
   Loóna $59.99, Anchor $59.99. That's above the screen-time indies ($19.99–$29.99) and below Opal
   ($99.99). Supported. No change.

---

## 2. App-by-app teardowns

### 2.1 Opal (closest scaled competitor). Current 2026 flow

Sources: screensdesign capture, 39 screens including post-paywall
([main](https://screensdesign.com/apps/opal-screen-time-control/),
[variant 132825](https://screensdesign.com/apps/opal-screen-time-control/?vs=132825)); Jacob
Rushfinn's teardown of the conversational redesign
([retention.blog, 2026-06-18](https://www.retention.blog/p/chat-based-onboarding)); Lazyweb's
August 2026 listing of 21 onboarding screens and 105 total
([Lazyweb](https://experiments.lazyweb.com/company/opal)); the App Store listing (checked 2026-10-03,
[link](https://apps.apple.com/us/app/opal-screen-time-control/id1497465230)). [OBS]

Screensdesign capture (questionnaire variant):

| # | Screen |
|---|---|
| 1–2 | Loader, then **ATT prompt on screen 2** |
| 3–6 | Welcome with product mockup and "Get Started"; session intro; app-blocking showcase; login link |
| 7 | **Press-logo social proof** |
| 8–11 | Quiz: daily screen time ("5–7 hours"), habit to change, age ("25–34"), occupation ("Remote Worker") |
| 12–13 | Loaders: "Calculating", then "Preparing report" (labor illusion) |
| 14–15 | **"Some not-so-good news, and some great news."** Then a usage-statistics report |
| 16–17 | **In-app 5-star rating prompt** plus a "Write a Review" screen |
| 18 | Motivational stat: **"9 years+ reclaimed"** (the good-news number) |
| 19–23 | Screen Time explainer, then the system prompt, "Connecting to Screen Time", Face ID, and "approved" confirmation |
| 24 | Personalized goals with checkmarks (value recap) |
| 25 | **Paywall**: before/after productivity chart, progress timeline, **"Try for $0.00"**, 7-day trial on yearly |
| 26–31 | "You're all set", gem unlock, **account creation after the paywall**, gem username, leaderboard and friends |
| 32–34 | Feature carousel, then **app selection after the paywall** ("up to 3 distracting apps") |
| 35–36 | Notification warm-up, then the system prompt (**after the paywall**) |
| 37 | **"How did you hear about us?" after the paywall** |

Conversational redesign (Rushfinn, June 2026). Questions arrive as chat bubbles: name → new to the
app? → what matters most → age → what describes you → average daily screen time. A visual guide shows
"exactly where you need [the user] to press" before the native Screen Time sheet. The aha moment is
**"Jacob, Opal will get you back 5 years of your life."** Rushfinn: "Opal could likely strip away
everything else in their flow, just show these numbers."

Paywall (Rushfinn):
- **Page 1:** value props, social proof, mention of the free week.
- **Page 2:** **the user picks which day they want the trial reminder.**
- **Page 3:** trial timeline focused on activation (not billing), with a *paid-trial* option set.
  "Only a small percentage of users purchase the paid trial."
- **Exit offer:** **Monthly $19.99 with a 1-week trial.** It's a different product, not a discount.

Post-paywall, the chosen goal is echoed back. Rushfinn's criticism: "they just start blocking apps…
I don't really understand [how] to customize."

App Store IAPs (2026-10-03): Weekly $4.99, Monthly $19.99, **Yearly $99.99**, "Opal Pro" $49.99,
Student Weekly $9.99. 4.7★ from 89K ratings. Editors' Choice. It has a free tier with one Rule
([habitdoom](https://habitdoom.com/blog/is-opal-free)). Opal's sleep feature is a schedule ("Set
daily work hours, sleep, and routines") and "Sleep" appears in the Opal Score. It doesn't have a
get-out-of-bed unlock.

Known result, already in the repo: moving to a hard onboarding paywall took conversion from 7% to 17%
(Sub Club) [ANEC/founder-reported].

**What Opal does that Locturne doesn't:**
1. ATT on screen 2. Don't copy: Locturne has no paid UA, so ATT buys nothing.
2. Press logos. Locturne has none yet.
3. Rating prompt pre-paywall. Now a 5.6.3 rejection risk.
4. A "great news" number.
5. A reminder-day picker.
6. App picker, account, notifications and attribution all after the paywall.
7. A monthly-with-trial exit offer.

### 2.2 Brainrot: Screen Time Control (viral screen-time blocker, May 2025)

[screensdesign](https://screensdesign.com/apps/brainrot-screen-time-control/) [OBS]. 51 screens.
Estimated $150K/mo, 4.5★.

- **4 screens:** value prop and stats preview.
- **6 screens:** brain mascot, plus an interactive **"brain rot" slider where the mascot decays as
  screen time rises**.
- **7 quiz screens:** goal, impact, persona, loss-of-control timing, previous attempts, age, daily
  usage slider.
- **4 analysis screens:**
  - a three-stage loader ("analyzing your habits / calculating profile / generating insights")
  - an **"Attention Profile" archetype (e.g. "Nighttime Scroller")**
  - lifetime cost
  - a **dot-grid life visualization, "21 years"**
- **5 screens:** "Get Time Back" (the good-news half), dopamine education, method comparison,
  university name-drops (Oxford/Harvard/Cambridge).
- **6 social-proof and permission screens:** two rating modals, testimonials, **Screen Time prompt at
  ~25 of 51**, activity consent, a commitment screen ("Let's do this!").
- **8 post-commitment screens:** weekly benefits, then a **"tap 5× to break the chain"** micro-gesture,
  then congratulations, then the paywall.

The paywall is yearly + weekly, with "7K+ 5-Star Reviews". **A "50% OFF FOREVER" pop-up appears
moments after the paywall shows** (screensdesign showcase text).

The archetype label ("Nighttime Scroller") is the most transferable new idea. Locturne already
collects enough to assign one.

### 2.3 Unrot: Earn your screentime

[screensdesign](https://screensdesign.com/showcase/unrot-earn-your-screentime) [OBS]. 31 steps,
4+ min. Estimated $40–45K/mo.

- **Chat interface with a brain mascot.**
- An animated core-loop demo, then annual time lost.
- **Hold-to-confirm button before the paywall.** This is the only other in-category hold-to-commit
  found, so Locturne's `commit` has precedent.
- ATT and notification warm-ups.
- A "two paths" frame: Brainrot vs Unrot lifestyle.
- Hard paywall, two plans. **A secondary offer with a steeper discount and countdown fires if the
  user hesitates.**

### 2.4 Wayk: mission alarm (Feb 2026; 25M TikTok views in 30 days)

[screensdesign](https://screensdesign.com/apps/wayk-alarm-clock-to-wake-up/) [OBS],
[First 1000](https://read.first1000.co/p/how-an-alarm-app-got-25-million-views),
[App Store](https://apps.apple.com/app/id6758021281). 21 onboarding screens.

- **Quiz:** "Sleep through alarms", "Just 5 more minutes", age/gender.
- **Education:** a "Groggy Zone" explainer and **"Biology, Not Laziness"**, a no-shame reframe close
  to Loc's voice.
- **Setup:** wake time (5:30 AM), mission pick ("Make Your Bed"), alarm days/sound, referral code
  field.
- **Personal number:** "5.0x speed improvement" speedometer.
- **Commitment:** a **signature pad with "I Commit" that states the exact wake time**, then a
  **receipt-style shareable card** (Night/Dawn/Modern/Bold/Film styles).
- **Permission order:** ATT → AlarmKit → microphone → camera → notifications, all before the paywall.
- **In-app rating prompt** ("Are you enjoying Wayk?").
- **Paywall:** "Try For $0.00", Yearly vs Monthly, "SAVE 75%", 3-day trial, benefits timeline.
- **IAPs:** Monthly $9.99; Yearly at $19.99 / $29.99 / $39.99 / $59.99 (price tests). 4.7★,
  20K ratings.
- **Estimates:** $75K/mo, 150K installs.

Its marketing is the playbook DESIRE_VALIDATION.md already cites: POV caption + raw reaction + app in
action.

### 2.5 QUITTR (TikTok-driven, ~$250K MRR reported in ~4 months; already in repo)

[screensdesign](https://screensdesign.com/apps/quittr-quit-porn-now/?vs=202258) [OBS]. 40 screens,
~15 min.

- **Start:** Google sign-in early.
- **Quiz:** a 14-question assessment, including **"How did you hear" inside the quiz**, then
  education carousels with press logos.
- **Commitment:** **a signature pad ("Sign to Commit")**.
- **Plan:** a "calculating and finalizing" loader at 100%, then a **personalized dependency score**,
  plan summary, and notification warm-up.
- **Paywall:** monthly $14.99, annual about $2.50/mo (~$29.99), **3-day trial on yearly**,
  **"80% savings" scarcity banner with countdown timer**, CTAs "Become a QUITTR" / "Claim Your Offer
  Now". A lifetime variant exists. "Over one million users" avatar stack.

RevenueCat relays QUITTR's observation that longer time in onboarding correlates with conversion
([RevenueCat](https://www.revenuecat.com/blog/growth/fix-onboarding-funnels)) [ANEC, correlational].

### 2.6 RISE: Sleep Tracker (best sleep-category comparable)

[screensdesign](https://screensdesign.com/apps/rise-sleep-tracker/),
[App Store](https://apps.apple.com/us/app/rise-sleep-tracker/id1453884781),
[Growth Gems #43](https://growthgems.substack.com/p/12-gems-from-from-b2b-to-a-500k-arr) [OBS + ANEC].

- **Value prop:** 5 screens, including a **testimonial carousel and "How did you hear about us?" at
  screen 5**.
- **Quiz:** gender/age, **student status**, goals, challenges, sleep practices, caffeine.
- **Personal numbers:** **sleep need "8h 30m" with an adjustment slider** (~screen 20), then sleep
  debt, then an energy-schedule reveal (~screen 23).
- **Permissions, each with a warm-up:** Motion → Apple Health → ATT → notifications last.
- **Paywall:** stacked plans, **"Redeem 7 Days Free"**, a **"30-day money-back guarantee" badge**,
  Apple Editors' Choice and Sleep Foundation laurels, a trial billing timeline. Monthly is
  purchasable directly.
- **IAPs:** $69.99, $59.99, $35.99 and $9.99 memberships (price tests). 4.7★, 71K ratings.

The co-founder's rules: "The job of the onboarding is never to show people how to use the app." "If
you don't have an obvious answer from your A/B test, it probably is not better." They ran hundreds of
user interviews before testing.

### 2.7 Alarmy, Erly, Loóna, Sleep Reset, Pokémon Sleep

- **Alarmy:** Premium Basic $4.99/mo and $41.99/yr; Standard and Plus $59.99/yr. Estimated
  $300–450K/mo. 4.8★, 192K ratings
  ([Adapty](https://adapty.io/paywall-library/alarmy/),
  [screensdesign](https://screensdesign.com/apps/alarmy-loud-alarm-clocksleep/)). [OBS] The onboarding
  details weren't viewable.
- **Erly:** set wake time → pick mission → alarm → camera-verified push-ups → streaks. $9.99/mo or
  $29.99/yr with a free trial. Built on Superwall. Reported $30K/mo in month 3 and $50K/mo in month 4.
  Grew via $2–3 CPM creator deals
  ([Superframeworks](https://superframeworks.com/case-study/erly)). [ANEC]
- **Loóna:** 18–25 step onboarding with a **"Personalizing your escapes…" multi-bar loader**.
  $12.99/mo; $39.99 or $59.99/yr; 7-day trial. Estimated $70K/mo on ~5K downloads
  ([screensdesign](https://screensdesign.com/apps/loona-sleep-reduce-anxiety/),
  [Lazyweb](https://www.lazyweb.com/research/building-your-plan-loading-screen-prevalence)). [OBS]
- **Sleep Reset:** clinical CBT-I. Free sleep assessment → personalized plan → coach. "Pick-your-price"
  first-week trial, a money-back guarantee, about $197/mo provider pricing
  ([Sleep Reset](https://www.thesleepreset.com/partners/providers)). A different business. Its one
  transferable idea is the assessment framing. [OBS]
- **Pokémon Sleep:** free-to-play with no onboarding paywall. Not comparable for monetization.

### 2.8 Other screen-time apps

- **ClearSpace:** ~7-step onboarding: quiz → custom permission priming → dashboard. **Soft paywall
  *after* permission grants** with a single annual plan, 7-day trial, a timeline of benefits and a
  **before/after screen-time graphic**. Estimated $55–60K/mo
  ([screensdesign](https://screensdesign.com/showcase/clearspace-reduce-screen-time)). [OBS]
- **one sec:** freemium. $19.99/yr, $2.99–3.99/mo, lifetime $49.99–99.99, family plans. Estimated
  $100K/mo ([Adapty](https://adapty.io/paywall-library/one-sec-screen-time-focus/),
  [AppPricingLab](https://apppricinglab.com/iap/apple/1532875441)). [OBS]
- **Jomo:** free tier. $29.99/yr with a 3-day trial, $5.99/mo, **$14.99 student annual**, $99.99
  lifetime ([Jomo](https://jomo.so/pricing)). [OBS]
- **ScreenZen:** free and donation-funded. About 75K DAU earning "a few hundred bucks a month" from
  tips ([habitdoom](https://habitdoom.com/blog/screenzen-alternative-iphone)). [ANEC] This is the
  free ceiling Locturne is priced against.
- **Brick:** $59 one-time NFC hardware, no subscription. About 55.6K ratings at 4.9★
  ([habitdoom](https://habitdoom.com/blog/brick-vs-other-app-blockers)). [OBS]
- **Roots:** onboarding asks daily screen time, then "what would you do with the time" (Locturne's
  `time-back` has the same structure). Weekly $7.99
  ([TechCrunch](https://techcrunch.com/2024/06/20/roots-introduces-a-screen-time-app-for-tracking-digital-dopamine/)). [OBS]
- **Unpluq / Blok:** no public teardown found. Unverified.
- **Clear 30** (weed-quitting, Superwall case):
  - Conversation-style onboarding using a **value equation**: the user's weekly spend ($55/wk) vs the
    program price ($30/yr).
  - **The paywall switched from a feature carousel to a day-by-day program preview: conversion went
    from 20% to 30%.**
  - Disclosing the price during onboarding added about 3%.
  - Revenue went from $10K to $30K/mo in 8 weeks
    ([Superwall](https://superwall.com/blog/how-two-founders-tripled-their-app-revenue-in-8-weeks)).
    [ANEC; before/after, likely not randomized]

### 2.9 Direct "locked until you're out of bed" apps

| App | Mechanic | Onboarding / price | Source |
|---|---|---|---|
| **Groggy: Stop Scrolling in Bed** (Sept 16, 2026) | Night lock; morning unlock by photographing completed tasks | 0 ratings at last check; no teardown public. **Unverified** | IDEA_SCORECARD.md |
| **BedLock** (Apr 2026) | Apps locked until AI verifies a photo of your made bed | Product Hunt launch; no teardown or prices found | [Product Hunt](https://www.producthunt.com/p/bedlock/bedlock-2) |
| **Anchor** | AlarmKit + scan to dismiss, scheduled lock, 3 overrides a month, "Set in Stone" | $9.99/mo, $59.99/yr, $129.99 lifetime, **no trial** | STAND_OUT_ANGLES.md |
| **SleepLock** | Bedtime lock, streaks, "hours won back" | $1.99/wk, $4.99/mo, $9.99/yr, $29.99 lifetime | STAND_OUT_ANGLES.md |
| **SleepShield** | Alarm-tied app lock that holds for hours after waking | Unverified | [App Store](https://apps.apple.com/us/app/sleepshield%E7%9D%A1%E7%9C%A0%E9%97%B9%E9%92%9F%E9%93%83%E5%A3%B0%E4%B8%93%E6%B3%A8%E7%95%AA%E8%8C%84%E9%92%9F%E6%97%B6%E9%97%B4%E7%AE%A1%E7%90%86/id6753810442?l=en-US) |
| **Unbed** | NFC block taps to stop the alarm; "Hard Mode" blocks apps until scanned | Free app + one-time hardware; 12K+ shipped | [hunted.space](https://www.hunted.space/product/unbed-app) |
| **Heaven: Prayer Lock** (same mechanic, faith angle) | Screen Time lock until prayer | $3.99/wk, $14.99/mo, $59.99/yr | [App Store](https://apps.apple.com/us/app/-/id6740999608) |

None of the direct competitors has a public, documented onboarding that outperforms Locturne's.
Nothing to copy from them. Watch Groggy's App Store screenshots, because they reveal its paywall.

### 2.10 Viral hard-paywall and best-in-class apps outside the category

- **Cal AI:**
  - Experiment volume: 123 iOS experiments, 160 paywall designs, 424 variants, **61 experiments on
    the onboarding paywall alone**.
  - Reported results: **+31% trial-to-paid over 12 months**; 87% paywall presentation rate; 63%
    transaction completion.
  - Revenue: $28K in month 1, $115K in month 2, $1M MRR within 6 months, $40M annualized at 18
    months.
  - **Winning designs listed: a spin-wheel discount unlock, video paywalls, multi-page flow.**
    Triggers included **transaction abandonment** and win-backs
    ([Superwall case study](https://superwall.com/case-studies/cal-ai)). [ANEC, vendor case study]
  - Cal AI also asks for an App Store rating in onboarding
    ([Cravotta](https://saas-accelerator.beehiiv.com/p/this-is-how-top-apps-manipulate-you-into-giving-5-stars)).
    Now a rejection risk.
- **Haven (Bible Chat):**
  - Onboarding: feature carousel → **rating warm-up + system rating prompt** → notifications →
    Sign in with Apple → name via chatbot → quiz → **"building your plan" loader** →
    personalization confirmation.
  - Paywall: **personalized with the user's name**, 7-day trial then weekly, **trial reminder
    toggle**.
  - Estimated $400K/mo
    ([screensdesign](https://screensdesign.com/apps/haven-bible-chat/)). [OBS]
- **Bible Chat (Bookvitals):** 3-step chat-first onboarding with a soft paywall after a demo answer
  ([screensdesign](https://screensdesign.com/showcase/bible-chat-daily-devotional)). [OBS]
- **Umax:** ATT → gender → **rating request** → referral code → notifications → account → selfies →
  "unlocking results" → Pro gate. Estimated $65K/mo
  ([screensdesign](https://screensdesign.com/apps/umax-become-hot/)). [OBS]
- **Headway:**
  - Onboarding: 39-screen web path, quiz, **"Commitment pact"**.
  - Paywall: soft; 7-day trial on yearly; three tiers, with the 3-month plan framed as best value.
  - **After the trial starts, a "reward chest" reveals a discounted upgrade**
    ([screensdesign](https://screensdesign.com/apps/headway-daily-micro-learning/)). [OBS]
  - Lazyweb counted 19 experiments, 3 of which changed CTA text
    ([Lazyweb](https://www.lazyweb.com/research/calm-vs-headway-wellness-paywall-experiments)).
- **Calm:** cutting free content from ~90% to ~5% took subscription conversion from ~2% to ~7%
  ([Lazyweb/Sacra summary](https://www.lazyweb.com/research/calm-vs-headway-wellness-paywall-experiments)).
  [ANEC] 19 experiments detected, 12 on the paywall, 7 changing CTA copy.
- **Flo:**
  - ~70-screen, ~7-minute questionnaire with a commitment prompt right before the paywall.
  - 52 experiments detected, only 6 on the paywall
    ([Lazyweb](https://www.lazyweb.com/research/flo-health-app-experiments.md)). [OBS]
  - "7% conversion" is a secondary-source figure. Unverified.
- **Noom:** a 77–113 screen web funnel, 10–15 min
  ([RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel)). Paid a **$56M
  cash + $6M credit class-action settlement** over "risk-free" trials and hard cancellation. The
  settlement requires a **separate affirmative action (checkbox or digital signature) to accept
  auto-renewal** and an easy cancel button
  ([Winston & Strawn](https://www.winston.com/en/class-action-insider/noom-settlement-showcases-potential-pitfalls-on-auto-renewals.html)).
- **BetterMe:** 38 screens, 11 quiz questions
  ([Lazyweb](https://www.lazyweb.com/research/how-many-quiz-questions-health-fitness-apps.md)). [OBS]
- **Finch:**
  - Onboarding: 46 steps opening on pet hatching, 15 quiz screens.
  - Paywall: **soft**, 7-day trial, "43% discount", **timeline visual**
    ([screensdesign](https://screensdesign.com/apps/finch-self-care-pet/)). [OBS]
  - The mascot-led, warm-not-salesy approach is the closest tonal analog to Loc.
- **Lose It!:**
  - Longer onboarding gave double-digit trial-start gains before diminishing returns (already in
    repo).
  - Uses a "Generating Your Custom Plan" loader with a rating badge.
- **Duolingo, Blinkist, Headspace:**
  - Already covered in the repo. Blinkist's timeline paywall is the origin of `offer`.
  - Nothing new found for 2026.
- **Puff Count** (Cravotta): switching from a soft to a hard paywall took revenue to $44K MRR. The
  pre-paywall flow was "50,000 people have already quit" social proof
  ([beehiiv](https://saas-accelerator.beehiiv.com/p/this-onboarding-mistake-cost-me-thousands-of)).
  [ANEC]
- **BoldVoice:**
  - Removing the dismiss button, and separately adding an un-closable discount exit offer, both raised
    trial starts. **In both tests refunds rose more than trial starts.** Both were rolled back.
  - It now judges paywalls on **net revenue after refunds per exposed user on matured cohorts**
    ([RevenueCat Sub Club 2026](https://www.revenuecat.com/blog/growth/anada-lakra-boldvoice-sub-club-podcast-2026)).
    [A/B, no numbers]

---

## 3. Comparison table

Prices are US, as observed. "Screens" uses each source's count, including post-paywall where noted.

| App | Onboarding screens | Paywall type & position | Main price | Trial | Notable tactic |
|---|---|---|---|---|---|
| **Locturne** (current) | 28 (+declined) | Hard, 2 pages (`offer`, `plans`) at ~0.9 | $59.99/yr; $9.99/mo | 7 days on annual | Hold-to-agree commit; life grid; live 20-step walk; one exit-offer A/B |
| Opal | 21–39 | Hard-ish trial paywall (a free tier exists), 3 pages, ~0.65 of the full flow; app picker, account and notifications after | $99.99/yr; $19.99/mo; $4.99/wk | 7 days yearly | "Not-so-good news, great news" + "years back"; reminder-day picker; monthly-trial exit offer |
| Brainrot | 51 | Hard, last | Yearly + weekly | Not shown | Decaying-brain slider; archetype; "21 years" dot grid; "50% OFF FOREVER" pop-up |
| Unrot | 31 | Hard, last | 2 plans | Free trial | Chat mascot; **hold-to-confirm**; countdown second offer |
| Wayk | 21 | Hard, last | $19.99–59.99/yr (tests); $9.99/mo | 3 days | **Signature "I Commit" with wake time**; shareable receipt; "Biology, not laziness" |
| QUITTR | 40 | Hard, last | ~$29.99/yr; $14.99/mo | 3 days | **Signature pledge**; dependency score; countdown "80%" |
| RISE | 34 | Hard, last | $69.99/yr (also $59.99 and $35.99 tests) | 7 days | Adjustable "sleep need" number; Editors' Choice laurel; money-back badge |
| Alarmy | n/a | Soft/upsell | $59.99/yr; $4.99/mo | Unverified | Missions; 82M downloads |
| Erly | n/a | Hard (Superwall) | $29.99/yr; $9.99/mo | Free trial | Camera-verified push-ups; creator CPM deals |
| Loóna | 18–25 | Hard | $39.99–59.99/yr; $12.99/mo | 7 days | Multi-bar personalization loader |
| ClearSpace | ~7 | Soft, after permissions | Annual only | 7 days | Before/after graphic; benefit timeline |
| one sec | n/a | Freemium | $19.99/yr | 7 days (1SE help) | Friction pause |
| Jomo | n/a | Freemium | $29.99/yr; $14.99 student | 3 days | Student annual |
| Anchor | n/a | Hard | $59.99/yr; $129.99 lifetime | None | Overrides; "Set in Stone" |
| Cal AI | n/a | Hard, multi-page | ~$29.99/yr (tested weekly through lifetime) | Yes | **Spin wheel**; transaction-abandon offer; 61 onboarding-paywall tests |
| Haven | ~19 chapters | Hard, personalized by name | Weekly after trial | 7 days | Rating prompt; plan loader; **reminder toggle** |
| Headway | 39 (web) | Soft | 3 tiers | 7 days yearly | Commitment pact; post-purchase discount chest |
| Finch | 46 | Soft | Annual | 7 days | Pet hatching; timeline |
| Flo | ~70 | Hard | Unverified | Yes | Commitment prompt before the paywall |
| Noom | 77–113 (web) | Hard | Unverified | Yes | Long web funnel; $56M settlement |

---

## 4. Cross-app patterns, with numbers

| Pattern | Who | Corpus number | Locturne now |
|---|---|---|---|
| **Total onboarding length** | Category leaders run 21–51 screens | Flows with a paywall: **median 14, mean 17.2 steps**; without one: median 10 (129 flows, July 2026) ([Lazyweb](https://www.lazyweb.com/research/are-onboarding-flows-with-a-paywall-longer.md)) [BENCH] | 28. Long for the general corpus, normal for this category |
| **Paywall position** | Almost always near the end | **Median relative position 0.89**; 77.5% in the final third; 27.5% on the very last step; none first (40 flows) ([Lazyweb](https://www.lazyweb.com/research/how-far-into-onboarding-do-apps-place-the-paywall.md)). Health & Fitness: 54% of flows have one, at ~0.84 ([Lazyweb](https://www.lazyweb.com/research/do-health-and-fitness-apps-paywall-in-onboarding)) [BENCH] | `plans` at 26/28 ≈ 0.93. Matches |
| **Quiz length** | Opal 6, Brainrot 7, Quittr 14, Finch 15, Rise 13, BetterMe 11 | Health & Fitness **median 4.5, mean 6.2 question screens**; 90th percentile across all quiz apps is 10 ([Lazyweb](https://www.lazyweb.com/research/how-many-quiz-questions-health-fitness-apps.md), [Lazyweb](https://www.lazyweb.com/research/longest-onboarding-quizzes-benchmark.md)) [BENCH] | 9 question screens (nights, night-minutes, nights-per-week, morning-minutes, found, age, alarm, tried, time-back). Near the 90th percentile. **Don't add any** |
| **Personal number before the paywall** | Opal (years back), Brainrot (21 yrs + archetype), Quittr (dependency score), Rise (sleep need), Unrot (yearly loss), Wayk (5× speed) | Lazyweb: 12 of 40 flows put a value-reveal or plan screen right before the paywall; it recommends "value recap, then paywall" (no lift data) ([Lazyweb](https://www.lazyweb.com/research/what-screen-comes-right-before-the-onboarding-paywall.md)) [BENCH] | `reveal` (bad number only); `ready` is the recap. Missing the good-news half |
| **"Building your plan" loader** | Opal, Brainrot, Quittr, Loóna, Haven, Lose It, Rise | Only ~1.2% of ~751 apps (likely an undercount: the regex ran on vision text) ([Lazyweb](https://www.lazyweb.com/research/building-your-plan-loading-screen-prevalence)) [BENCH]. Near-universal in viral quiz apps | `math` (~3 s). Keep |
| **Commitment device** | Signature: Quittr, Wayk, Fabulous (thumbprint). Hold: Unrot, **Locturne**. Tap: Brainrot ("tap 5×"). Pact or prompt: Headway, Flo, Opal | **No public A/B with numbers for any of these.** Closest proxy: a commitment checkbox gave +11% in a mortgage funnel ([Indie Hackers](https://indiehackers.com/post/if-you-cant-avoid-a-long-onboarding-process-add-a-commitment-checkbox-to-increase-conversions-2f2222f759)) [ANEC] | `commit` hold-to-agree. Keep |
| **Social proof** | Press logos (Opal, Quittr), rating counts (Brainrot "7K+ 5-star"), user counts (Quittr "1M"), laurels (Rise Editors' Choice, Sleep Foundation), university name-drops (Brainrot), testimonial carousels (Rise, Quittr) | No category A/B found | None. Correct pre-launch (see §6) |
| **Rating prompt in onboarding** | Opal, Brainrot ×2, Wayk, Haven, Umax, Cal AI | **Apple began rejecting under 5.6.3, June 2026** | None. Correct |
| **Permission timing** | Screen Time before the paywall, after the number: Opal, Brainrot. Notifications after the paywall: Opal. All before the paywall: Wayk, Rise (notifications last). ATT early: Opal, Wayk, Umax | n/a | FamilyControls and apps before the paywall; Motion at `walk`; notifications after (trial reminder or first night). No ATT. Good |
| **App selection** | Opal: **after** the paywall (max 3 apps). Brainrot: unknown | n/a | Before the paywall (`apps`). Keep, but use it (§5 R2) |
| **Paywall pages** | Opal 3, Locturne 2, Rise 1 plus timeline modal, Brainrot 1 plus pop-up | Superwall: **multi-page 12.41% vs single-page 9.07%** (40M+ opens, Feb–May 2026; observational). Multi-page is only 24% of opens [BENCH] | 2. Good |
| **Price in the CTA** | Opal and Wayk "Try for $0.00"; Rise "Redeem 7 Days Free" | Only 11.6% of 1,886 CTAs include a price; "try for $0.00" is the most common price phrasing ([Lazyweb](https://www.lazyweb.com/research/do-apps-put-price-in-paywall-button.md)) [BENCH] | "Start 7-day free trial / No payment due now". Fine |
| **Trial reminder** | Opal (pick the day), Haven (toggle), **Locturne (toggle, on)** | No public A/B | Present |
| **Trial toggle** | Banned in 2026 | 3.1.2 rejections since January 2026 ([RevenueCat](https://www.revenuecat.com/blog/growth/rip-toggle-paywall)) | Not used |
| **Visible close/X** | Most hard paywalls hide it | 26.2% of 2,708 paywall screens show an exit; exit-visible paywalls use "free/trial" CTA copy more (38.4% vs 31.7%) ([Lazyweb](https://www.lazyweb.com/research/do-paywalls-with-a-visible-close-button-use-different-cta-copy.md)) [BENCH]. Adapty ships a close-button delay; **no public lift data** ([Adapty](https://adapty.io/blog/adapty-february-2024-updates)) | Hard paywall with a decline path to the exit offer |
| **Exit offer** | Opal: monthly + trial. Brainrot: 50% forever pop-up. Unrot and Quittr: countdown discounts. Cal AI: spin wheel + transaction-abandon. Headway: post-purchase chest | Superwall transaction-abandon: 5–22% of entrants convert ([Superwall](https://superwall.com/blog/growth-sessions-transaction-abandon-recap)). An 18-company cohort got **17% of revenue** from abandon paywalls, lower refunds (3.3% vs 6.8%), and **"a few apps received scrutiny from Apple"** ([Superwall, 2024](https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study)) [BENCH/vendor] | One offer, 3-arm A/B |
| **Spin-the-wheel** | Cal AI (iOS, listed as a winner) | No Apple guideline names it; manipulative-offer rejections under 5.6 exist. If the wheel always lands on the same prize, the "chance" is fake: an FTC deception risk [OPINION] | None. Keep it that way |
| **Countdown / "gone forever"** | Quittr, Unrot, Brainrot | Apple's 5.6 rejection quoted exactly this: "Once you close your one-time offer, it's gone!" ([Apple forum](https://developer.apple.com/forums/thread/768912)) | None |
| **Name question** | Opal (first question), Haven, Quittr | n/a | Not asked |
| **Attribution question** | Opal **after** the paywall; Rise at screen 5; Quittr in the quiz | n/a | `found`, before the paywall |
| **Price points (sleep/morning)** | Rise $69.99, Alarmy $59.99, Loóna $59.99, Anchor $59.99, Wayk $19.99–59.99, Erly $29.99, SleepLock $9.99 | — | $59.99. In the band |

---

## 5. Recommendations: what to copy, with evidence and the specific change

Ordered by expected impact ÷ effort.

### R1. `reveal`: add the good-news half, then carry it to the paywall. **Copy.**
- **Evidence:**
  - Opal ("Some not-so-good news, and some great news", then "Opal will get you back 5 years"),
    Brainrot ("Get Time Back") and Rushfinn's commentary [OBS, consistent across the top three
    category apps].
  - Lazyweb's "value recap, then paywall" [BENCH, no lift].
  - Clear 30's paywall rewrite around the user's own program: 20% → 30% [ANEC].
- **Change:**
  - Split `reveal` into two beats on the same screen: the current rolling number + life grid, then a
    second line that animates in after a tap or a 1.5 s pause.
  - Example: *"Now the good number. Your phone stays out of bed, and that's ~6 hours a week
    back. Roughly a full night's sleep. Every week."* Be careful with the sleep claim. ONBOARDING_CONVERSION.md
    already warns about health claims under 1.4.1 and FTC rules, so frame it as **hours of phone in
    bed** (true by mechanism for the blocked apps), not sleep gained.
  - On `plans`, change the headline from "Try Locturne free" to the user's number:
    **"Take back your 6 hours a week."** Loc's line underneath: *"Free for a week. I'll do the
    hard part. You walk."*
  - Light users keep their separate screen.
- **Expected impact:** small to moderate. Confidence: medium.

### R2. `offer` and `plans`: show the apps they picked, asleep. **Copy, adapted.**
- **Evidence:**
  - Personalization on the paywall: Haven (name), Opal post-paywall (goal echo), Clear 30 (program
    preview) [OBS/ANEC].
  - It's also the logical use of the investment Locturne asks for at `apps`. Opal asks for app
    selection *after* the paywall, so Locturne paying that cost earlier only makes sense if the
    paywall uses it.
- **Change:**
  - At the top of `offer` (the "Tonight $0" row), render the selected FamilyControls
    `ApplicationToken`s as their icons, dimmed with a small moon or "zz". SwiftUI `Label(token)`
    shows icon and name without exposing identity to the app.
  - Use a native view, no glow.
  - Copy: *"Tonight at 11:30, these go to sleep."*
  - If they picked categories rather than apps, show the category label.
- **Expected impact:** moderate (an endowment effect on the paywall). Confidence: medium-low (no
  direct A/B). **A good first A/B once traffic allows.**

### R3. Never add a rating prompt, ATT, countdown, "forever" or spin-wheel to onboarding. **Don't copy.**
- **Evidence:**
  - Apple 5.6.3 onboarding rating rejections, June 2026
    ([RevenueCat](https://www.revenuecat.com/blog/engineering/dont-prompt-ratings-during-onboarding)).
  - 5.6 "one-time offer" rejection
    ([Apple forum](https://developer.apple.com/forums/thread/768912)).
  - FTC fake-urgency and deceptive-pricing exposure.
  - The brand rules ("no fake urgency", VOICE.md).
- **Ask for the rating at a real high point instead:** after the **first verified morning proof**
  (`first-morning` success, day 2). That's also the most honest 5-star moment in the app. Use
  `SKStoreReviewController` only.

### R4. `declined` exit offer: keep it to one, fire it on two triggers, no urgency. **Copy the safe version.**
- **Evidence:**
  - Apple's informal "one post-dismiss offer is OK, looping is not" [ANEC, Superwall/Apple].
  - Transaction-abandon cohort data: 17% of revenue, lower refunds, some Apple scrutiny
    [BENCH/vendor].
  - BoldVoice: un-closable exit offers drove refunds above the gains [A/B].
- **Change:**
  1. Trigger the same exit offer when the user cancels the StoreKit sheet after tapping the CTA
     (transaction abandon), not just when they decline. Still **once per install** (the
     `wasExitOfferShown` flag already exists).
  2. The offer must have a clear "No thanks" and never re-show next session.
  3. Copy stays as is ("Fair. Two free weeks, then.") with no "only now" language.
  4. Consider Opal's shape as a future arm: **monthly $9.99 with a 7-day trial**. Not now.
- **A note for the experiment track:** a 3-arm test on a solo founder's launch traffic will take a
  long time to read. Judge it like BoldVoice: net revenue after refunds per exposed user, on matured
  cohorts.
- **Expected impact:** small and positive. Confidence: medium.

### R5. Trial reminder: make the promise unbreakable. **Fix.**
- The `plans` toggle "Remind me 2 days before it ends" makes a material promise.
- Code check: `scheduleTrialReminder` (src/lib/notifications.ts:271) asks for notification
  permission right after purchase, which is good. But **if the user denies, the reminder can't fire
  and nothing tells them.**
- Opal's reminder-day picker and Haven's toggle depend on push the same way. Noom's settlement and
  the FTC's 2026 ROSCA posture make a broken reminder promise a needless risk:
  - Uber's amended complaint alleges charges before a trial ended and "Try for free" without
    express informed consent.
  - Shutterstock settled for $35M in May 2026.
  - An ANPRM to revive click-to-cancel was issued in March 2026
    ([Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life),
    [Mondaq](https://www.mondaq.com/unitedstates/dodd-frank-consumer-protection-act/1798116/shutterstock-settles-with-ftc-for-%2435-million-for-subscription-and-negative-option-marketing-practices)).
- **Change:** if permission is denied and the reminder is on, show one line on `armed`: *"Notifications
  are off, so I can't nudge you. Trial ends Oct 10. Put it in your calendar. I would."* Better still,
  add an "Add to Calendar" button (EventKit write-only, no read access).
- **Impact:** trust, refunds and compliance. Confidence: high that it's worth doing.

### R6. Optional archetype label on `reveal` or `math`. **Test later.**
- **Evidence:** Brainrot's "Attention Profile: Nighttime Scroller" [OBS]. Quiz apps commonly name
  the user, and archetypes are shareable, which fits the TikTok distribution.
- **Change:** derive a label from `nights` + `night-minutes`. Examples:
  - *"Diagnosis: One-More-Video Insomniac."*
  - *"Diagnosis: Recreational Ceiling Scroller."*

  Loc deadpan, never shaming. Put it on the share image from `reveal`.
- **Expected impact:** mostly organic shares, not conversion. Confidence: low.

### R7. `found` (attribution): keep it before the paywall for now. **Don't copy Opal here.**
- Opal moves attribution after the paywall, which saves a screen for the people who matter most.
- But the founder's whole distribution is short-form video, and attribution from **non-buyers** is
  what tells you which videos bring the wrong audience.
- **Revisit** once PostHog has two weeks of launch data. If more than 80% answer TikTok, cut the
  question and rely on link-level UTMs and the App Store Connect "source" data.
- Confidence: medium.

### R8. Social proof: build the slot now and switch it on with real data. **Copy the form, not the fakery.**
- **Evidence:** every scaled competitor uses some form of social proof (§4). Fabricated proof
  violates the FTC fake-review rule (2024, already in the repo). No category A/B was found.
- **Change:**
  - Add a remote-config line to `plans` under the plan cards. Off at launch.
  - Turn it on once the real App Store rating is ≥4.6 with ≥100 ratings: *"4.8 ★ from 312
    people who also hate mornings."*
  - Before then, the only honest proof is the founder's own. For example, `deal` could carry a footnote: *"Made by
    one student who kept losing mornings to his phone."* Short and real.
  - **Don't** use press laurels or university name-drops (Brainrot) until they're real.
- Confidence: medium.

### R9. Keep the commit screen. Wayk's tweak isn't worth the change. **Already have it.**
- Hold-to-agree is used by Unrot; signatures by Quittr, Wayk and Fabulous. No published A/B favors
  either one.
- Wayk's version names the exact wake time, and Locturne's already does ("Phone down at 11:30 PM.
  Downstairs to wake them.").
- Wayk adds a **shareable "receipt"** after the commitment. Locturne's share already lives on
  `reveal`. Don't add a second share.
- Confidence: medium.

### R10. Don't copy these either

- **Opal's paid-trial tier choice.** "Only a small percentage" buy it, and it adds complexity.
- **Weekly plans.** Already rejected in PRICING_RESEARCH.md.
- **Rise's "30-day money-back guarantee" badge.** Refunds go through Apple, so a developer can't
  guarantee them. 2.3.1/3.1.2 risk and an FTC promise risk [OPINION].
- **Headway's post-purchase discount chest.** It would undercut the annual you just sold.
- **A "two paths: rot vs unrot" binary frame.** It shames, which conflicts with GAME_PLAN.
- **ATT.** No paid UA.
- **Sign-in before the paywall** (Quittr, Haven). 5.1.1(v), and it's unnecessary.
- **A student weekly** (Opal $9.99/wk, a bad deal). Jomo's $14.99 **student annual** is the version
  worth considering for a Gen Z/student audience, but that's a pricing-track decision. [OPINION]
- **A name question.** Opal, Haven and Quittr ask, and it would let Loc address the user ("Fine,
  Sam."), but it adds a keyboard screen with no evidence of lift. Low priority; skip for v1.
  [OPINION]

---

## 6. Apple and FTC actions relevant to onboarding (2024–2026)

| Date | Body | Action | Locturne exposure |
|---|---|---|---|
| Jan 2026 | Apple 3.1.2 | Trial on/off toggles rejected ("confusing and may prevent users from understanding… auto-renewing subscription") ([RevenueCat](https://www.revenuecat.com/blog/growth/rip-toggle-paywall)) | None (the reminder toggle doesn't change the product) |
| Jun 2026 | Apple 5.6.3 | Rating prompts during onboarding rejected ([RevenueCat](https://www.revenuecat.com/blog/engineering/dont-prompt-ratings-during-onboarding)) | None. Keep it that way (R3) |
| Jun 2026 (informal) | Apple via Superwall | One exit offer OK; looping/resurfacing not; remote A/B tests allowed; US-only external checkout allowed alongside IAP, not instead of it ([Superwall](https://superwall.com/blog/external-checkout-a-b-testing-and-trial-toggles-confirmed-apples-rules-for-ios)) | `declined` complies if shown once (R4) |
| 2024 and ongoing | Apple 5.6 | "One-time offer… gone" exit paywall rejected ([forum](https://developer.apple.com/forums/thread/768912)); transaction-abandon apps "received scrutiny" ([Superwall](https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study)) | Keep exit copy urgency-free |
| Mar 2026 | RevenueCat guidance | Don't remotely enable exit offers after approval to evade review ([RevenueCat](https://www.revenuecat.com/blog/engineering/exit-offers-in-revenuecat-paywalls)) | Make sure the exit-offer arm is **on during App Review** |
| Mar 2026 | FTC | ANPRM to re-propose the Negative Option (click-to-cancel) rule ([Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life)) | Apple-handled cancellation covers most of it; keep "cancel anytime" true and point to Settings → Subscriptions in-app |
| May 2026 | FTC | Shutterstock $35M ROSCA settlement ([Mondaq](https://www.mondaq.com/unitedstates/dodd-frank-consumer-protection-act/1798116/shutterstock-settles-with-ftc-for-%2435-million-for-subscription-and-negative-option-marketing-practices)) | Disclosure before billing info: StoreKit + `plans` legal |
| 2025–26 | FTC v. Uber (amended) | "Try for free" without express informed consent; charging before the trial ended ([Goodwin](https://www.goodwinlaw.com/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life)) | Trial dates on `offer` must exactly match StoreKit's |
| 2022 | Class action v. Noom | $56M + $6M credits; requires a separate affirmative auto-renew consent and an easy cancel ([Winston](https://www.winston.com/en/class-action-insider/noom-settlement-showcases-potential-pitfalls-on-auto-renewals.html)) | The StoreKit sheet is the affirmative action. Fine |
| Aug 2024 | FTC rule | Fake reviews and testimonials banned (in repo) | R8: real proof only |

---

## 7. Open items (not verified this session)

- **Groggy and BedLock:** onboarding, prices and paywall. Next step: download them and screen-record.
  Both are free to install.
- **Opal's current exact trial-tier prices** (the paid-trial options). Unverified.
- **Brainrot's** current prices: its App Store id now resolves to a different app ("Heaven: Prayer
  Lock").
- **Cal AI's spin wheel:** whether it's still live on iOS after the 2026 enforcement. Unverified.
- **Close-button delay:** no public lift numbers found anywhere.
- **Signature vs hold-to-commit:** no public A/B found.

## 8. Sources

All inline. Main ones:
[screensdesign Opal](https://screensdesign.com/apps/opal-screen-time-control/) ·
[retention.blog Opal](https://www.retention.blog/p/chat-based-onboarding) ·
[Opal App Store](https://apps.apple.com/us/app/opal-screen-time-control/id1497465230) ·
[Brainrot](https://screensdesign.com/apps/brainrot-screen-time-control/) ·
[Unrot](https://screensdesign.com/showcase/unrot-earn-your-screentime) ·
[Wayk](https://screensdesign.com/apps/wayk-alarm-clock-to-wake-up/) ·
[QUITTR](https://screensdesign.com/apps/quittr-quit-porn-now/?vs=202258) ·
[RISE](https://screensdesign.com/apps/rise-sleep-tracker/) ·
[Haven](https://screensdesign.com/apps/haven-bible-chat/) ·
[ClearSpace](https://screensdesign.com/showcase/clearspace-reduce-screen-time) ·
[Cal AI × Superwall](https://superwall.com/case-studies/cal-ai) ·
[Superwall multi-page](https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why.md) ·
[Superwall transaction abandon](https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study) ·
[Lazyweb paywall position](https://www.lazyweb.com/research/how-far-into-onboarding-do-apps-place-the-paywall.md) ·
[Lazyweb flow length](https://www.lazyweb.com/research/are-onboarding-flows-with-a-paywall-longer.md) ·
[Lazyweb H&F quiz length](https://www.lazyweb.com/research/how-many-quiz-questions-health-fitness-apps.md) ·
[RevenueCat rating prompts](https://www.revenuecat.com/blog/engineering/dont-prompt-ratings-during-onboarding) ·
[RevenueCat toggle ban](https://www.revenuecat.com/blog/growth/rip-toggle-paywall) ·
[BoldVoice](https://www.revenuecat.com/blog/growth/anada-lakra-boldvoice-sub-club-podcast-2026).
