# 05 — Competitors and market size (numbers first)

Researched 2026-10-08. One angle of "how does Locturne reach $10K MRR, and where is
a real edge?" This doc updates COMPETITOR_MARKETING.md section 2 (2026-10-05),
10K_MRR_PLAN.md section 3 and VALIDATION_RESEARCH.md section 14. It does not repeat them.

**Evidence tags**
- **V** = verified today from a primary source (App Store listing, iTunes API, the company's own page, TrustMRR's RevenueCat data).
- **S** = secondary source (press, case study, estimator site, founder claim relayed by others).
- **U** = unverified or my own estimate. Treat it as a rough size only.

**Limits of this pass.** The web-search budget ran out after about 25 searches. So the
segment quotes in section 5 come mostly from App Store reviews (real, dated and linked),
not Reddit. iTunes API use: 19 requests, spaced 6 seconds apart.

---

## 1. Short version

1. **Money in this space sits in four places:** Opal (about $10M ARR), Alarmy (about
   $33M revenue in 2025, mostly ads), the new wave of hard-paywall "get out of bed"
   alarms (Erly, Wayk: about $50–75K a month each), and screen-time apps with a
   character (Unrot, Brainrot, Focus Friend: about $25–150K a month each, numbers conflict).
2. **The exact niche ("apps stay locked until you get out of bed") still has no
   app with traction.** All 15+ direct apps have 0–5 ratings. The best one with
   verified revenue, BlockIt, makes **$469 MRR**.
3. **The niche is filling up fast.** Since August 2026: Anchor Morning (alarm, scan a
   code, apps lock), Groggy, Alba, Bed Lock, Morning First, Dawnova, Bedrot, Bedline,
   9to9 and Mumzy. None has more than 5 ratings yet.
4. **The big players have moved close, but not onto the exact spot.** Opal Sleep
   locks apps for an hour after waking (time-based). one sec has "Phone-Free Morning"
   (HealthKit wake detection, time-based) and links to the Awake alarm. Erly
   screenshots show a "Bedtime App Lock" (S). Alarmy and Wayk do not advertise app
   locking. No big app unlocks on *proof you left the bed*.
5. **$10K MRR needs about 2,000 paying annual subscribers at $59.99.** That is roughly
   10% of Erly's or Wayk's estimated paying base. It is reachable, but only if Locturne
   sells to the "can't get out of bed" alarm buyer and the "phone in bed" Opal buyer,
   not only to people already searching for a morning app lock. My estimate: the narrow niche
   alone can give **$2–4K MRR** in year one. The rest needs the broader framing. (U)

---

## 2. Revenue and download estimates

Ratings are US App Store, pulled from the iTunes lookup API on 2026-10-08 (V).
Revenue numbers are worldwide unless noted.

### Adjacent apps with real money

| App | US ratings (V) | Launched (V) | Revenue estimate | Tag | Notes |
|---|---|---|---|---|---|
| **Alarmy** | 248,589 | Oct 2016 | ₩46B (about $33M) revenue and ₩20B operating profit in 2025. ₩33.7B in 2024, ₩23B in 2023. About 90M downloads, 4.6M MAU | S | Ads are the main revenue line. In 2023, ads were ₩14.3B of ₩24B. So subscriptions are maybe $10–15M (U). Latest update (Oct 7) adds "Multiple Missions". No app lock. |
| **Opal** | 89,406 | Dec 2020 | $10M ARR with 11 staff (May 2025). Another database says $4.8M for 2024 | S | Earlier research says 1M DAU, two-thirds students (S). No 2026 figure found. |
| **Brick** (app for a $59 NFC puck) | 56,595 | Sep 2023 | No revenue figure found | U | Hardware, one-time payment, no subscription. 56.6K ratings means it is huge for hardware. |
| **Unrot** | 56,862 | Jun 2025 | $40–45K/mo, 35–85K installs a month (estimator, page conflicts) | S | **Big redesign in late Sep 2026 angered paying users** (see section 5). |
| **ScreenZen** | 51,227 | Jul 2021 | Donations only. 1M+ Android downloads | S | Free. It sets the "free is good enough" baseline. |
| **one sec** | 23,668 | Sep 2020 | No revenue figure. 18 staff (Apr 2026) | S | A team of 18 suggests at least a few $M a year. (U) |
| **Brainrot** | 22,631 | May 2025 | $26K in its first 30 days (founder). Estimator says $150K/mo but contradicts itself | S | Hard paywall, yearly and weekly plans, "50% off forever" follow-up offer. |
| **Wayk** | 19,796 | **Feb 3, 2026** | $75K/mo, 150K installs (screensdesign estimate). AppGoblin says 12.2K installs (Android) | S | Same as Erly but 8 months old. Hard paywall, web checkout via Paddle (reviews mention it). |
| **Erly** | 15,990 | Sep 3, 2025 | $50K+/mo, 200K+ downloads (founder via case study) | S | First on AlarmKit. Paid creators. |
| **Focus Friend** | 8,456 | Jul 2025 | ~$800K net in the first weeks (Appfigures). Later "$100K/mo" (uncited blog) | S / U | Revenue per download only $0.27 (Appfigures). |
| **Rise (Rise Science)** | 71,348 | Aug 2019 | No figure found | U | Sleep coach, $59.99–69.99/yr. No app blocking. Mentions "doom-scrolling" in its copy. |
| **Jomo** | 2,472 | Oct 2022 | "Nearly 300,000 people have used it". Self-funded team of 2–3 | S | Small. |
| **Awake** (alarm) | 1,386 | Sep 2025 | — | — | Mission alarm that **integrates with one sec** to block social apps in the morning. |
| **wakn up** | 142 | Mar 2026 | — | — | Mission alarm. Blocks apps until the wake mission is done. Duel feature. |
| **Unbed** | 757 | Jul 31, 2026 | — | — | NFC "block" you tap to stop the alarm. Fast rating growth for hardware: 757 in 10 weeks. |

### The direct niche (apps locked until a morning proof)

All checked with the iTunes search API (V). Ratings are US.

| App | Launched | US ratings | Unlock proof |
|---|---|---|---|
| Rise: Morning App Blocker | Feb 17, 2026 | 1 | Steps or photo |
| PushLock | Feb 24, 2026 | 325 | Push-ups (earn time, not morning-specific) |
| wakn up | Mar 21, 2026 | 142 | Alarm mission |
| Arise Alarm & App Blocker | Apr 22, 2026 | 1 | Alarm |
| MorningLock | Apr 28, 2026 | 3 | Routine |
| Kindwake | May 20, 2026 | 3 | Morning blocker |
| goob: alarm & app blocker | Jun 3, 2026 | 0 | Alarm |
| First Light | Jul 14, 2026 | 2 | Routine |
| Bed Lock: Morning App Blocker | Jul 19, 2026 | 0 | Checklist (up to 3 tasks), pitched at ADHD |
| **Anchor Morning** | **Sep 13, 2026** | 0 | **Scan a code across the room to stop the alarm, then apps lock or stay locked. AlarmKit.** |
| **Groggy** | Sep 16, 2026 | 0 | Photo of each morning task |
| **Morning First** | Sep 19, 2026 | 0 | Routine checklist |
| **Bedrot** | Sep 26, 2026 | 0 | Bedtime blocker |
| **Alba** | Sep 29, 2026 | 1 | Walk to a chosen spot and photo it, or a short walk |
| **Dawnova** | Sep 4, 2026 | 3 | 15 steps plus outdoor daylight |
| **9to9** | Sep 1, 2026 | 0 | Fixed 9 PM to 9 AM lock |
| **Bedline** | Oct 5, 2026 | 0 | Bedtime blocker |
| **Mumzy** | Aug 10, 2026 | 0 | Bedtime blocker |

Bold = launched in the last 60 days. That is **about one new direct or near-direct app a week**.

**Verified revenue for clones (TrustMRR, RevenueCat-backed, V):** BlockIt (apps blocked
until push-ups, founded Mar 2026): **$469 MRR, 148 active subs, $5,801 all-time**.
Earlier docs list Reveille $121, Rizen $279 and Alarm Arcade $33 all-time.

**What this means:** the *idea* is clearly attractive to indie builders. No one has
made it work commercially yet. The clones that are tracked have no distribution, not a
bad product. The winners next door (Erly, Wayk) prove that "make me get out of bed" sells
when paired with paid creators.

---

## 3. Market size

There is no public, trustworthy number for the "screen-time app" category. Sensor
Tower and Appfigures do not break it out in free reports. Market-research PDFs are
not usable (VALIDATION_RESEARCH.md already rejects them). So this is a bottom-up estimate.

### What we know

- **All app spending:** consumers spent $167B on in-app purchases in 2025, up about
  10%. Non-game apps passed games for the first time, up 21% year on year. (S, Sensor Tower)
- **Opal:** about $10M ARR (2025). (S)
- **Alarmy:** revenue up 37% in 2025 (₩33.7B to ₩46B). Mission alarms are a growing,
  profitable category. (S)
- **The 2025–26 hard-paywall wave:** Unrot, Brainrot, Erly and Wayk all launched between May 2025 and Feb 2026.
  Together they are probably **$2–4M a year** run-rate. (S/U)
- **Older adoption data:** a survey (undated, AYTM) found 46% of consumers interested in screen-time
  limiting, but only 2% using a service. (S, old)

### Bottom-up estimate (U)

| Bucket | Annual consumer spend, worldwide | How I got it |
|---|---|---|
| Opal | ~$10–12M | Reported ARR, small growth |
| one sec, Jomo, ClearSpace, AppBlock, BlockSite, Freedom (iOS share) and smaller blockers | ~$8–15M | one sec has 18 staff. The rest are mid-size |
| Character / earn-your-time apps (Unrot, Brainrot, Focus Friend, others) | ~$3–6M | Estimator ranges above |
| Hardware blockers (Brick, Unpluq, Halo) | ~$5–15M one-time | Brick's 56K ratings suggest hundreds of thousands of units at $59 |
| **Screen-time / blocker total** | **~$25–50M a year** | |
| Mission alarms (Alarmy subs, Erly, Wayk, others) | ~$15–25M subscription | Alarmy subs plus about $1.5M a year for Erly and Wayk together |

**How many people pay (U):** at an average of about $60 a year, $25–50M means
**about 400K–800K paying subscribers worldwide** for blockers. The US is probably half
of that (US-first marketing, English-only apps). So **about 200K–400K Americans pay for a
screen-time blocker today**. Add about 100–200K US mission-alarm subscribers.

**Trend 2024 to 2026 (S/U):** growing, and the growth comes from new entrants, not from Opal.
- 2024: one big player (Opal) plus long-tail blockers.
- 2025: the character wave (Brainrot, Unrot, Focus Friend) arrived, and Alarmy grew 37%.
- 2026: the AlarmKit wave (Erly, Wayk, Awake, Anchor) arrived, and Opal and one sec added morning features.
- My guess: total spend up roughly 1.5–2× from 2024 to 2026. (U)

### Where the money sits

1. **One big all-day blocker (Opal)** takes most of the pure-blocker revenue.
2. **Viral, character-led or mission-led apps with hard paywalls** are the fast growers.
   They rise on paid creators and then fade (Focus Friend fell out of the top charts within weeks).
3. **Hardware** (Brick) is big and has no subscription.
4. **Free tools** (ScreenZen, Apple Screen Time) cap what people will pay for basic blocking.

**Locturne's slice:** if Locturne got 1% of US blocker payers plus 1% of US
mission-alarm payers, that is about 3,000–6,000 subscribers. That is 1.5–3× the 2,000
needed for $10K MRR. (U)

---

## 4. Have the big players shipped "get out of bed to unlock"?

| App | Morning app lock? | How it unlocks | Since | Tag |
|---|---|---|---|---|
| **Opal** | Yes: Sleep's "Morning Assist / Full Assist" blocks all apps for one hour after waking | **Time** (or Emergency Pass) | Jan 30, 2026. Off by default. No new morning features in release notes since (latest 4.18, Oct 5: bug fixes) | V (earlier docs) |
| **one sec** | Yes: "Phone-Free Morning" (was "Good Morning Countdown") delays apps for 30–60 minutes after HealthKit sees you wake | **Time**, triggered by sleep data. Also works with the **Awake** alarm | v5.0 (date not shown). Help article updated about 7 months ago. The help page says HealthKit detection is unreliable | V |
| **Erly** | A screenshot caption shows "Bedtime App Lock, 10 PM to 10 AM" | Schedule. Not tied to the push-up proof as far as I can see | Unknown. The App Store description does not mention it | S |
| **Wayk** | Not in its listing or design teardown. **One review (Oct 1, 2026)** says "I liked the app blocking feature but it would apply to days beyond the days that alarm was set" | Unknown | Possibly recent | U |
| **Alarmy** | No. Its description has no app lock. Latest feature: Multiple Missions per alarm | — | — | V |
| **Anchor Morning** | Yes. Scan a code across the room to stop the alarm. Then the "morning app group" locks for a set window, or until you scan | **Physical proof** (scan or NFC) for the alarm. The lock is a time window or scan-to-unlock | Sep 13, 2026 | V |
| **Awake + one sec** | Yes, as two apps working together | Alarm mission, then a one sec time block | 2025–26 | V |

**Conclusion (opinion):** no app with more than about 1,000 ratings ties the morning unlock to
proof you left the bedroom. That spot is still open. But **Anchor Morning is the closest
direct rival** (same AlarmKit plus Screen Time stack, scan to unlock, $39.99/yr).
**Opal or Erly could close the gap with one update.** Erly is the real threat: it
already owns the "get out of bed" buyer, has a bedtime lock, and has camera-verified proof.

Nothing found from Erly, Wayk, Alarmy or Opal since 2026-08 announcing an
out-of-bed unlock. Their release notes since August are bug fixes, plus Alarmy's
Multiple Missions. (V for release notes. Press could not be searched after the budget ran out.)

---

## 5. Pricing table

From App Store in-app purchase lists (V) unless noted. Apple does not label periods,
so periods are matched by price where obvious.

| App | Weekly | Monthly | Annual | Lifetime / one-time | Trial / model |
|---|---|---|---|---|---|
| **Locturne (plan)** | — | — | **$59.99** | — | 7-day trial, hard paywall |
| Opal | $4.99, $9.99 (and a $9.99 "Student Weekly") | $19.99 | $99.99 (and $49.99 "Pro") | $399 (earlier doc) | Freemium plus paywall |
| one sec | — | $6.99 | $19.99 | $99.99; Family $149 | Freemium |
| Unrot | $9.99 | $13.99 (likely) | $29.99 / $34.99 / $69.99 | $49.99 | Hard paywall with trial. Reviews: "$10 a week or 70 a year" |
| Brainrot | weekly plan (price not listed) | $3.99 | — | $49.99 | Hard paywall, "50% off forever" offer (S) |
| ScreenZen | — | — | Free | — | Donations |
| Jomo | not checked | | | | Freemium |
| Brick | — | — | — | $59 hardware (S) | No subscription |
| Erly | — | $9.99 | $29.99 (also $19.99 and $39.99 variants) | — | 3-day trial, hard paywall |
| Wayk | $6.99 | $9.99 | $29.99 (also $19.99 and $59.99 variants) | — | 3-day trial, hard paywall |
| Alarmy | — | $4.99 / $7.49 / $8.99 | $59.99 / $69.99 | — | Free with ads plus Premium |
| Awake | — | $6.49 (likely) | $19.99 (likely) | $59.99 | Freemium |
| Focus Friend | — | — | $14.99 (S, earlier doc) | — | Freemium |
| Rise (sleep) | — | $9.99 | $59.99 / $69.99 | — | Trial |
| **Anchor Morning** | $2.99 | $6.99 | **$39.99** (website says $59.99) | $79.99 (website: $129.99) | **No free trial** |
| **Groggy** | $7.99 | — | $49.99; "Founding Year" $24.99 | — | Hard paywall |
| BlockIt | — | — | — | — | $469 MRR / 148 subs ≈ $3.17 per sub per month |

**What this means:**
- At $59.99/yr, Locturne is **twice Erly and Wayk** ($29.99) and **above Anchor**
  ($39.99) and Groggy ($49.99).
- It is level with Rise and Alarmy's top tier, and well under Opal ($99.99).
- The cheapest well-known rival with the same morning promise is one sec ($19.99/yr, time-based).
- Reviews of Erly, Wayk, Unrot, Opal and Alarmy repeat **"a subscription for an alarm"**
  and **"$30 is steep"**, mostly from teenagers. **$59.99 only works if the buyer is
  an adult who sees Locturne as a sleep and screen-time product (Opal and Rise pricing),
  not as an alarm (Erly and Wayk pricing).** (Opinion)

---

## 6. Underserved segments

Quotes are real App Store reviews (US, most recent, pulled 2026-10-08), linked by app.

### a) People let down by an app they paid for (switchers)
Unrot changed its core loop in late September 2026. Paying users are angry right now.
- "I loved the app before the update. You used to have to get off your phone and do certain tasks in the real world." (Unrot, 1★, Oct 5) [link](https://apps.apple.com/us/app/unrot-earn-your-screen-time/id6746537171?see-all=reviews)
- "I, unfortunately, purchased the yearly subscription and the app is no longer the product I bought… they got rid of the quests." (Unrot, 1★, Oct 5)
- "I went from 10 hours of screentime to 2-3 hours a day… It's like finding out you're getting cheated on." (Unrot, 1★, Oct 3)
- A reviewer says the developer re-launched the old mechanic under a new app name ("Scrollwall"). Not verified. (U)

**Gap:** people who want **real-world proof before they get their apps back**, and who just lost it.
A short-term chance for content ("the app that still makes you get up").

### b) People who delete the app to escape
- "Works great just need to not be able to uninstall it… uninstalled the app to stop the alarm." (Wayk, 4★, Sep 30) [link](https://apps.apple.com/us/app/wayk-alarm-clock-to-wake-up/id6758021281?see-all=reviews)
- "I've deleted this app multiple times because it literally makes you get out of bed… it should be undeletable." (Wayk, 5★, Sep 29)

**Gap:** Screen Time can block deleting apps (Anchor's "Hardcore Mode" does this). Locturne should
say clearly whether it does. Users ask for it outright.

### c) Students and teenagers (big, but price-sensitive)
- "As a 14-year-old student and heavy sleeper… I also tend to doomscroll, which means I rarely get enough sleep. … I saw a sponsored video on Snapchat." (Wayk, 5★, Oct 6)
- "this app is single handedly saving my college degree from preventing my doom scrolling." (Opal, 5★, Sep 22) [link](https://apps.apple.com/us/app/opal-screen-time-control/id1497465230?see-all=reviews)
- "I think that $30.00 is a bit steep." (Wayk, 3★, Oct 4)
- Opal sells a "Student Weekly" plan, and two-thirds of its DAU are reported to be students (S).

**Gap:** students pair the problems "can't get up for school" and "doomscroll at night" in
one sentence. That is exactly Locturne's pairing. **But $59.99 is above what teens pay.**
The college segment (18+, has its own card) is the realistic target.

### d) ADHD and heavy sleepers
- "as someone with adhd i have a BAD habit of sleeping straight through my alarms, turning them off in my sleep… this is the only app that has really truly worked for me. I tried a competitor app but it was stupid expensive." (Erly, 5★, Sep 15) [link](https://apps.apple.com/us/app/erly-wake-up-early/id6751428380?see-all=reviews)
- Bed Lock (Jul 2026) pitches "WORKS FOR ADHD & FOCUS" in its listing. Nobody with traction owns ADHD mornings.
- Earlier research: hard blocks fail for ADHD users because they "rage-quit… or learn the bypass" (DEV Community, S).

**Gap:** an ADHD-friendly framing ("your phone stays boring until your body is up").
Be careful with medical claims.

### e) People with a partner in bed
- "Got me and my boyfriend up every time." (Wayk, 4★, Sep 30). Mission alarms wake the other person.
- An older app, Instant Wake Up, sells a "Don't Wake my Spouse" button, which shows the need is real (S).

**Gap:** Locturne's unlock (walk downstairs or 200 steps) is **silent**. Locturne does not need
to be the alarm. **"Your partner keeps sleeping; you just can't open TikTok until you're
downstairs"** is a claim no mission alarm can make. Underserved and cheap to message. (Opinion)

### f) Shift workers
No Reddit evidence could be gathered (search budget ran out). One designer's concept
says "every sleep app assumes you have one bedtime" (contra.com, S). SleepLock offers
work-night and rest-night schedules (S). **Small segment. A second schedule covers it. Do not lead with it.**

### g) Subscription-haters (not a segment to win; a cost to manage)
- "to expect $100+ a year for an alarm and puzzle is biblical levels of greed." (Alarmy, 1★, Oct 7) [link](https://apps.apple.com/us/app/alarmy-loud-alarm-clock/id1163786766?see-all=reviews)
- "Why would I pay a subscription for an alarm clock. There is no cloud processing involved and… so many identical apps using this exact template." (Erly, 1★, Jun 30)
- "Was absolutely stoked seeing all the videos on Insta of this concept, went to find out it's 100% paid subscription." (Unrot, 1★, Sep 16)
- Trial-charge complaints show up in every hard-paywall app's recent reviews (Erly, Wayk).

**Gap:** a clear trial reminder and an honest price before the quiz ends would set Locturne apart
from Wayk and Erly, which get "made me answer all these questions… just to have the whole
thing be a SUBSCRIPTION" reviews.

### h) Older adults
No evidence found either way. Reviewers in this space skew young. Not a launch target.

---

## 7. Honest assessment: how much of $10K MRR can the niche alone give?

**The target in subscribers.** $10K MRR at $59.99/yr = $5.00 a month per subscriber
before Apple's cut. That is **2,000 active annual subscribers**, or about 2,350 to clear
$10K after Apple's 15%. At a 40% trial-to-paid rate (H&F hard-paywall benchmark, S),
that is about 5,000–6,000 trials. At 5–8% install-to-trial, that is **70,000–120,000 installs**,
assuming about 25% renewal at month 12 (S).

**What the niche has shown so far:**
- Direct "locked until a morning proof" apps: none above 5 ratings. The best verified clone makes $469 MRR. (V)
- People searching for this exact thing are few. Most direct apps rank on "morning app
  blocker", and none has broken out. (V/U)
- **But** the buyer exists next door. Erly and Wayk got **36,000 US ratings** between them in about 13 months,
  selling "make me get out of bed". Opal's base is mostly students who scroll in bed. (V/S)

**My estimate (U, opinion):**

| Positioning | Who it reaches | Realistic year-one MRR |
|---|---|---|
| Niche only: "apps locked until you leave bed" (app-store searches, a few videos) | People already looking for a morning lock | **$1–3K** |
| Niche with founder videos leading on downstairs and the partner angle | Plus curious viewers: "what app is this?" | **$3–6K** |
| **Wider framing: "stop scrolling in bed, night and morning"** (Opal Sleep and Rise buyers) plus "the alarm that doesn't wake your partner" (Erly and Wayk buyers) | Revenge bedtime procrastination, college students, ADHD, people who share a bed | **$6–12K** |

So the narrow niche is likely **20–40% of the $10K**. The rest has to come from
selling to two bigger, proven groups:
1. **"I scroll in bed"** (Opal and one sec buyers, about $25–50M a year in spend).
2. **"I can't get out of bed"** (Erly, Wayk and Alarmy buyers, about $15–25M a year).

Locturne's product already covers both. The positioning has to say so.

**Three risks the numbers show:**
1. **Erly adds an out-of-bed unlock.** It has the buyers, a bedtime lock and camera proof.
   This is the most likely single update that hurts Locturne.
2. **Price.** At $59.99, Locturne is 2× the alarm apps its videos will be compared to. It
   needs to look like Opal or Rise (a sleep product), not an alarm. Or test $39.99 against $59.99 early.
3. **Clone speed.** About one new direct app a week. Being first is already lost. The edge
   has to be distribution (founder videos), the downstairs (barometer) proof, the silent
   unlock for people who share a bed, and Loc's voice. Not the feature list.

---

## Sources

**App Store (V, pulled 2026-10-08)**
- iTunes lookup/search API: `https://itunes.apple.com/lookup?id=…` and `/search?term=…` (ratings, release dates, descriptions, release notes for every app in section 2)
- Opal: https://apps.apple.com/us/app/opal-screen-time-control/id1497465230
- one sec: https://apps.apple.com/us/app/one-sec-screen-time-focus/id1532875441
- Unrot: https://apps.apple.com/us/app/unrot-earn-your-screen-time/id6746537171
- Wayk: https://apps.apple.com/us/app/wayk-alarm-clock-to-wake-up/id6758021281
- Erly: https://apps.apple.com/us/app/erly-wake-up-early/id6751428380
- Alarmy: https://apps.apple.com/us/app/alarmy-loud-alarm-clock/id1163786766
- Brick: https://apps.apple.com/us/app/brick-ditch-distractions/id6448794069
- Rise: https://apps.apple.com/us/app/rise-sleep-tracker/id1453884781
- Awake: https://apps.apple.com/us/app/awake-smart-alarm-clock/id6747604910
- Anchor Morning: https://apps.apple.com/us/app/anchor-morning/id6766728511 and https://www.anchormorning.app/
- Groggy: https://apps.apple.com/us/app/groggy-stop-scrolling-in-bed/id6802700389
- Review RSS feeds: `https://itunes.apple.com/us/rss/customerreviews/page=1/id=<id>/sortby=mostrecent/json` for Opal, Alarmy, Erly, Wayk and Unrot

**Revenue and company data**
- BlockIt (TrustMRR, V): https://trustmrr.com/startup/blockit
- Opal $10M ARR (S): https://speedinvest.com/blog/scaling-smart-how-opal-built-a-10m-arr-business-in-just-2-years
- Opal 2024 revenue $4.8M (S): https://app.lazyweb.com/company/opal
- Alarmy / Delight Room 2025 results (S): https://www.venturesquare.net/fr/1032475/ , https://www.venturesquare.net/fr/985159/ , https://www.indiehackers.com/post/alarmy-the-11-million-alarm-clock-app-c74024c017
- Erly (S): https://superframeworks.com/case-study/erly , https://www.stork.ai/blog/this-push-up-alarm-app-hit-50kmonth
- Wayk estimate (S): https://screensdesign.com/apps/wayk-alarm-clock-to-wake-up/ , https://screensdesign.com/showcase/wayk-alarm-clock-to-wake-up , https://appgoblin.info/apps/mg.WaykUp
- Unrot estimate (S): https://screensdesign.com/showcase/unrot-earn-your-screentime
- Brainrot (S): https://www.indiehackers.com/post/fYbp8x4WWqltdifUwCZJ , https://www.starterstory.com/businesses/brainrot-screen-time-control/revenue , https://screensdesign.com/showcase/brainrot-screen-time-control
- Focus Friend (S): https://appfigures.com/resources/insights/20250905 , https://www.builtbyfoundry.io/blog/hank-green-focus-friend-app
- one sec team size (S): https://www.revenuecat.com/blog/growth/frederik-riedel-expected-12-his-app-cut-screen-time-by-57
- one sec Phone-Free Morning (V): https://feedback.one-sec.app/help/articles/7826410-phone-free-morning-ios , https://feedback.one-sec.app/help/articles/4303002
- Jomo (S): https://jomo.so/manifesto , https://help.jomo.so/en/article/1fq5ura/
- ScreenZen (S): https://www.appbrain.com/app/screenzen%E3%83%BBscreen-time-control/com.screenzen , https://habitdoom.com/blog/screenzen-alternative-iphone
- Brick price (S): https://getbrick.com/products/brick
- Sensor Tower State of Mobile 2026 (S): https://sensortower.com/blog/state-of-mobile-2026
- AYTM survey (S, undated): https://aytm.com/post/screen-time-survey
- wakn up, Push Clock UP, AlarmLab app-blocking alarms (S): https://mwm.ai/apps/wakn-up/6758896186 , https://appgoblin.info/apps/6761768904
- Erly "Bedtime App Lock" screenshot caption (S): https://spark.mwm.ai/en/apps/erly-wake-up-early/6751428380
- Opal Sleep (V, from earlier doc): https://opalapp.com/help/how-do-i-use-sleep-mode
- Opal morning scheduling and review (S): https://paragraph.xyz/@henrypye/thoughts-on-screen-time-apps-24-weeks-in
- Partner alarm (S): https://apps.apple.com/us/app/instant-wake-up-alarm-clock/id1491016448
- Shift-worker concept (S): https://contra.com/community/v8zHs1t9-nights-circadian-planning-for-people
- ADHD blocker failure modes (S): https://dev.to/astraedus/the-best-free-adhd-app-blocker-for-android-34o2
- UpDude (open-source, NFC or pedometer morning lock, Android) (S): https://github.com/jakic12/UpDude
