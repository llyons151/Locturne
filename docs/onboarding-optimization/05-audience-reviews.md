# Track 5: The audience, the traffic source, and what they say in their own words

Researched 2026-10-03 for the Locturne onboarding-conversion study. Builds on
`docs/DESIRE_VALIDATION.md` (Reddit pain quotes, viral-video patterns), `docs/TEEN_ACCOUNTS.md`
(Ask to Buy, state age laws), `docs/PRICING_RESEARCH.md` and the sub-club notes. Those docs'
findings aren't repeated here. Where this track disagrees with them, it says so (section 10).

## Evidence grades
- **[AB#]** A/B test with numbers. **[AB]** A/B test without numbers.
- **[BENCH]** Benchmark or correlational data.
- **[OBS]** Something seen in one app, or counted from a review sample.
- **[ANEC]** Anecdote or founder claim. **[OPINION]** Our judgement.

## Method and limits
- **App Store reviews: 6,860 unique reviews from 10 competitors.** Pulled from Apple's public
  customer-review RSS feed (US store, 10 pages × "most recent" and "most helpful"):
  - Opal (id1497465230)
  - ScreenZen (id1541027222)
  - one sec (id1532875441)
  - Alarmy (id1163786766)
  - Wayk (id6758021281)
  - Brick (id6448794069)
  - Erly (id6751428380)
  - Jomo (id1609960918)
  - ClearSpace (id1572515807)
  - Roots (id6446800962)

  1–2★ reviews (n = 1,369) were tagged with keyword rules, then read by hand. Counts are a
  lower bound because keyword rules miss paraphrases. The "most recent" feed only reaches
  ~500 reviews back. For Wayk and Erly that is Feb–Oct 2026, which is exactly the
  TikTok-driven cohort. App pages are `https://apps.apple.com/us/app/id<ID>`. Reviews are
  cited as [App ★ date "title"], because Apple has no per-review permalinks.
- **Reddit: 885 comments + ~600 posts from 2024–2026**, from the Arctic Shift archive
  (r/nosurf, r/digitalminimalism, r/productivity, r/getdisciplined, r/sleep, r/college).
  - Several single-keyword searches timed out (e.g. "opal" in r/iphone). r/iphone is thin here.
  - r/nosurf has AI-written and soft-promo posts. Suspect ones are marked [suspect].
- **TikTok: comments and discover pages could not be fetched** (they render empty to fetchers,
  as the earlier research also found). TikTok behaviour is inferred from App Store reviews
  that say "I saw this on TikTok/Instagram/YouTube". That is a decent proxy: the people who
  felt misled write exactly those reviews.
- **The session's web-search budget ran out partway through.** Several numbers below are
  marked "unverified" where I couldn't open the primary source.

---

## 1. Top findings (read this if nothing else)

1. **The #1 one-star pattern for TikTok-driven hard-paywall apps is "I did the whole quiz,
   then it asked me to pay". It is not price.** [OBS]
   - Wayk: 82% of its 245 recent 1–2★ reviews are about paying (200/245). 31 complain about
     answering questions before the paywall. 32 say "I thought it was free" or "you didn't
     tell me". 18 say "no X / stuck on the paywall".
   - Erly: 79% (102/129).
   - Older, search-led blockers sit at 21–53% (ScreenZen 21%, Brick 22%, Opal 30%,
     one sec 50%).
   - The words are consistent: "Will ask you a bunch of questions and only after set up will
     ask you to pay" [Wayk 1★ 2026-04-21 "Scam"]. "They should tell you before you do anything
     that you have to pay" [Wayk 1★ 2026-03-23 "No"]. "Disclose that at the start" [Wayk 1★
     2026-07-03].
   - Locturne's flow is 26 screens of investment, then a hard paywall. That is the same shape.
2. **A large share of the angry users are minors or people with no card. No price fixes
   that.** [OBS]
   - Quotes: "my dad doesn't want to give me his credit card" [Wayk 1★ 2026-07-10]. "I'm a
     13-year-old who can't get up out of bed for school" [Wayk 2★ 2026-09-07]. "I do not have
     a card attached to my phone" [Wayk 1★ 2026-03-05]. "the money it took I got for my
     birthday" [Wayk 2★ 2026-09-04].
   - Keyword rules flag 23 of 245 Wayk low reviews (9%) for parent/age/card terms, plus 11
     for school. That's a floor: many teens don't state their age.
   - Pew: ~60% of US teens 13–17 use TikTok daily, and 16% are on it "almost constantly"
     ([Pew, Dec 2024](https://www.pewresearch.org/internet/2024/12/12/teens-social-media-and-technology-2024/)).
     Also 63% of US adults under 30 use TikTok
     ([Pew, Mar 2026](https://pewresearch.org/short-reads/2026/03/02/8-facts-about-americans-and-tiktok)).
     [BENCH]
3. **Even a $0.00 free trial needs a payment method on the Apple Account.** [ANEC, Apple
   Community threads: [1](https://discussions.apple.com/thread/255072238),
   [2](https://origin-discussions2-us-dr-prz.apple.com/thread/254512535); unverified against
   an Apple doc]
   - So "No payment due now" doesn't help a teen with no card. Their only path is a parent.
   - Under-13s, and under-18s where a family turns it on, also go through Ask to Buy
     ([Apple](https://support.apple.com/105055)). `docs/TEEN_ACCOUNTS.md` covers the
     pending-purchase mechanics.
4. **"Charged even though I cancelled" and "you said you'd remind me" make up the
   second-largest cluster.** [OBS]
   - Examples: [Opal 1★ 2026-09-06] "claims it will give you a reminder... I didn't receive a
     reminder at all and they took $50"; [Wayk 1★ 2026-05-29]; [Erly 1★ 2026-01-24].
   - **Locturne risk:** the plans screen has "Remind me 2 days before it ends" switched on,
     but notification permission isn't asked during onboarding. If the reminder is a local
     notification and permission was never granted, the promise silently breaks. That is the
     exact 1★ review above. See R4.
5. **The objections people raise before paying are mostly "why pay when X is free".**
   [OBS + Reddit]
   - X is the iPhone alarm, Screen Time, a $10 alarm clock, or "just delete the app".
     Fear of bypassing comes second ("I knew the passcode so eventually I'd just turn it back
     off").
   - Opal's 5★ reviews often praise that it's *free* ("Low Screen Time blockers cost money.
     I'm just happy this one was free." [Opal 5★ 2026-08-30]). Locturne will be compared with
     a free-tier Opal.
6. **What makes people say "worth it" is a physical barrier they can't beat lying down.**
   [OBS]
   - "the physical barrier actually helps yall" [Brick 5★]. "I hate this alarm with a passion
     but damn does it work well... no more 'just 5 more minutes'" [Wayk 5★ 2026-09-28].
     "I've deleted this app multiple times because it literally makes you get out of bed...
     I re-download it" [Wayk 5★ 2026-09-29].
   - Worth-it reviews almost never mention features. They mention one outcome ("I went to bed
     earlier", "I wake up on time") and the feeling of the barrier.
7. **January is real but double-edged.** [BENCH]
   - Health & Fitness IAP revenue hit an all-time high of $385M in Jan 2025 (+10% YoY), with
     the most January downloads since 2022
     ([Sensor Tower](https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025)).
   - H&F refund rates rise ~20% in January, peaking at 2.4% in the third week
     ([RevenueCat](https://www.revenuecat.com/blog/growth/how-to-tackle-new-year-subscription-churn)).
   - A Jan 3 install on a 7-day trial is charged Jan 10, so the first annual charges land
     right before that refund peak.
8. **There is no public A/B evidence that sharing from onboarding drives installs.** [OPINION]
   - The best evidence is founder testimony that one screen can be the marketing: "Most of
     Umax's success came from the design of one single screen"
     ([Superwall/Blake Anderson](https://superwall.com/blog/part-2-how-to-design-a-viral-app-in-2025)).
   - Build the reveal card to be screenshotted, but don't expect onboarding shares to move
     installs. Locturne's share engine is the founder's videos plus post-purchase morning
     receipts.

---

## 2. The pain, in their words (phrase bank for quiz options and headlines)

Phrases that recur across sources. Ones already in `DESIRE_VALIDATION.md` are listed briefly
for completeness; new ones are quoted in full.

### Night
| Their phrase | Source | Use for |
|---|---|---|
| "lying in bed unlocking it for 'one thing' that turned into forty minutes" | [r/digitalminimalism 85↑](https://reddit.com/r/digitalminimalism/comments/1woli1p) | `nights` option, `night-minutes` echo |
| "I'd scroll through the early AMs and wouldn't start feeling tired till 4am… just accepted that I was a night owl" | [r/getdisciplined](https://reddit.com/r/getdisciplined/comments/1wkg0e1) | `nights` option ("Suddenly it's 2 AM") |
| "two hours every single night just mindlessly scrolling TikTok and Instagram in the dark until 1 AM" | [r/digitalminimalism 237↑](https://reddit.com/r/digitalminimalism/comments/1vnom17) | reveal echo |
| "lying there with my phone is sometimes the only time nobody needs anything from me. If I give that up too, it feels like the whole day was never really mine." | [r/sleep 67↑](https://reddit.com/r/sleep/comments/1uscl5b) | **New `nights` option** (revenge bedtime procrastination). It is also the strongest *objection* to a bedtime lock. |
| "classical revenge bedtime procrastination: when you know you should sleep but you stay up scrolling… because it feels like the only free time you have" | [r/sleep](https://reddit.com/r/sleep/comments/1w9s5z5/_/p8d493o) | same |
| "i dont even enjoy what im watching anymore… lying in bed scrolling for 2 hours and realize i dont even remembr what i watched" | [r/nosurf 96↑](https://reddit.com/r/nosurf/comments/1vld8aw) | `nights` option ("I don't even enjoy it") |
| "it's not entertainment anymore it's just a reflex. my hand does it before my brain even decides to" | [r/nosurf](https://reddit.com/r/nosurf/comments/1t1lmf5) [suspect: mentions a competitor] | same |
| "every night, i get in bed, grab my phone, and watch youtube for nearly 3 hours" | [r/digitalminimalism](https://reddit.com/r/digitalminimalism/comments/1v19sgo) | `night-minutes` 2h+ |

### Morning
| Their phrase | Source | Use for |
|---|---|---|
| "I wake up and my phone is already in my hand and I don't remember picking it up" | [r/nosurf](https://reddit.com/r/nosurf/comments/1t1lmf5) | `alarm` rewrite |
| "a bunch of what I assumed was me being groggy in the mornings was apparently just the scroll" | [r/nosurf](https://reddit.com/r/nosurf/comments/1txs461) [suspect] | `stat` echo / `tomorrow` |
| "not 'I shouldn't,' I can't. and because there's nothing to reach for I just... don't." | same | **Paywall check line**: users name the shift from "shouldn't" to "can't" as what works |
| "I used to set 20 alarms and go right back to sleep" | [Wayk 5★ 2026-10-02] | `alarm` option |
| "turning them off in my sleep, waking up late with no memory of ever turning them off" | [Erly 5★ 2026-09-15] | `alarm` option |
| "no more 'just 5 more minutes'" | [Wayk 5★ 2026-09-28] | `alarm` option |
| "I waste at least 3–4 hours on bed" | [r/productivity](https://reddit.com/r/productivity/comments/1vqo0yj) | `morning-minutes` top bucket |
| "I'm awake, not tired, just stuck" / "40 minutes of scrolling in bed before my feet even touched the floor" | DESIRE_VALIDATION | `alarm` option |
| "I hate getting out of the top bunk" | [Alarmy 5★ 2026-09-30] | Student-coded detail for videos (dorm) |

### What they've tried (for `tried`)
| Their phrase | Source |
|---|---|
| "i tried blocking it with screen time before but the problem was i knew the passcode so eventually i'd just turn it back off" | [r/nosurf](https://reddit.com/r/nosurf/comments/1cf9sjp/_/pddqegs) |
| "I've tried the apps, but always just ended up deleting them" | [Brick 5★ 2026-07-05] |
| "without deleting my most distracting apps a million times" | [Brick 5★ 2025-12-24] |
| "Amazon $10 alarm clock… keep the phone away from bed" (the top advice, and a free alternative) | [r/college](https://reddit.com/r/college/comments/1u27khe/_/oqvg7zx) |
| "charged my phone in the hallway… went back to bed mad at my own feet" | [r/digitalminimalism](https://reddit.com/r/digitalminimalism/comments/1woli1p) |
| "The extra step to unbrick it is a better guardrail than the option to 'ignore' a limit" | [Brick 5★ 2026-07-12] |

**Pattern:** people describe the problem as **their hand or body acting without them** ("my hand
does it", "turning them off in my sleep", "what my hands did"). They don't describe it as a
choice or a moral failing. Loc's voice fits this: it's the phone's fault and the raccoon's
problem, never the user's. Options written as things that *happen to* the user ("Suddenly
it's 2 AM") will feel truer than options written as confessions. [OPINION]

---

## 3. Objections, in their words, mapped to the screen that should answer them

| # | Objection (verbatim) | Volume signal | Where it bites | Screen that answers it | Suggested copy (Loc) |
|---|---|---|---|---|---|
| O1 | "Will ask you a bunch of questions and only after set up will ask you to pay" / "Disclose that at the start" / "Put that in the description beforehand" | Wayk 31 + 32, Erly 21 + 11 of their low reviews [OBS] | After the paywall, as a 1★ review | **`deal`** (step 2) + App Store listing | See R1: one plain line on `deal` saying it's a paid app with a free week |
| O2 | "Why do I have to pay to wake up" / "I can set one for free on the alarm app" / "I'll just keep my normal alarm" | The most common short 1★ on Wayk and Erly | At the paywall | **`plans`** (Loc line), `tried-echo` | "Your alarm is free. It also has a snooze button." |
| O3 | "Screen Time is free" / "Opal… offers a free service" / "Low Screen Time blockers cost money. I'm just happy this one was free" | Opal 5★ praise for "free" [OBS] | At the paywall, among people who've tried blockers | **`tried-echo`** for screen-time and blocker answers (exists), **`plans`** check row | Keep "Screen Time has an Ignore button. I don't." |
| O4 | "I'll just delete it" / "Why do all that when I can just delete the app in 5 seconds?" / "I've tried the apps, but always just ended up deleting them" | Common on Reddit; Brick reviews | Before install, and at the `screen-time` explainer | **`screen-time`** (step 21), stated plainly (VOICE rule 5: clear when it matters) | "You *can* turn me off. It takes Settings, your passcode, and admitting it at 1 AM." |
| O5 | "I knew the passcode so eventually I'd just turn it back off" / "easily bypassed in settings, with a single click" [one sec 1★] / "troubleshoot-reset screen time" [ScreenZen 1★] | 38 "bypass" low reviews across blockers | After purchase, as churn and 1★ | `tried-echo` (screen-time) + the product's emergency-unlock design | Don't over-promise. Never say "impossible". "It's annoying on purpose." |
| O6 | "subscription for an app is a scam" / "Another greedy subscription app" / "no one needs another subscription" / "It's a money grab… soo expensive for an nfc tag" (Brick) | one sec 50% of low reviews about money | At the paywall | **`plans`**: the monthly-equivalent line, plus "Cancel in Settings" | "$5 a month. Less than the coffee you'll now have time for." [OPINION; test] |
| O7 | "I'm not starting a free trail just to forget and then get charged" / "you think I would remember to cancel?" | Wayk [OBS] | At the trial CTA | **`offer`** timeline (exists) + reminder that actually fires (R4) | "Day 5: I'll remind you. I'm reliable about two things. That's one." |
| O8 | "charged me even tho I ended trial" / "didn't remind me" / "still charging me after I cancel" | Wayk 10, Opal and Erly several | Week 2 → refund request + 1★ | Post-purchase: a reliable reminder, a cancel how-to, and the Consumption API (R10) | — |
| O9 | "no X / it wouldn't let me get off of the subscription page / pops right back up" | Wayk 18 | At the paywall → 1★ | `plans` / `declined` | Visible close → one exit offer → a calm "door" screen. Not a loop (R5) |
| O10 | "I'm broke" / "I'm a 13-year-old" / "my dad doesn't want to give me his credit card" | Wayk 23 + 10 | At the paywall | Age-aware paywall copy for 13–17 (R6) | — |
| O11 | "If I stop scrolling in bed, when do I get any time to myself?" | r/sleep 67↑ | Before install (video comments) and at `commit` | **`nights`** option + echo; `bedtime` screen | "Keep your hour. Just have it before bed, not in it." |
| O12 | "Steps can be faked" / "found a work around to the 'take a picture of' and… go back to sleep" [Wayk 1★ 2026-06-19] | Wayk, Alarmy | After purchase | Product (anti-shake) and content (cheat-fail videos) | — |
| O13 | "Walking then going back to bed" (risk 1 in DESIRE_VALIDATION) | Inferred | After purchase | Product | — |

---

## 4. One-to-two-star paywall complaints: taxonomy and counts

Keyword-tagged 1–2★ reviews per app (a review can match several themes). [OBS]

| App | 1–2★ n | Money / trial / charge | "Survey then paywall" or "not told" | Bugs / broken | Bypass |
|---|---|---|---|---|---|
| Wayk (TikTok-driven, hard paywall, 3-day trial) | 245 | 200 (82%) | 74 | 17 | 3 |
| Erly (creator-driven, hard paywall) | 129 | 102 (79%) | 42 | 10 | 0 |
| Roots | 62 | 33 (53%) | 4 | 24 | 2 |
| one sec | 153 | 77 (50%) | 20 | 39 | 6 |
| Opal | 369 | 112 (30%) | 21 | 148 | 11 |
| Alarmy | 138 | 39 (28%) | 11 | 39 | 5 |
| Brick | 101 | 22 (22%) | 0 | 33 | 6 |
| ScreenZen | 34 | 7 (21%) | 0 | 14 | 4 |

How to read this:
- **Wayk and Erly are Locturne's closest analogs:** short-form traffic, hard paywall at the end
  of a quiz, Health & Fitness category.
- **Wayk sub-themes**, from 245 low reviews:
  - questions or setup before the paywall: 31
  - "thought it was free / not told": 32
  - parent, age or card: 23
  - "no X / stuck on the paywall": 18
  - school: 11
  - "charged after cancel / no reminder": 10
  - "broke / can't afford": 10
- **Ratings don't show this.** Wayk is still 4.73★ overall (19.6K ratings). In the "most
  recent" feed (Feb–Oct 2026), 36% of written reviews are ≤2★. Star *ratings* come mostly
  from in-app prompts aimed at happy users. Written reviews come from angry ones. So the
  public rating survives, but the review text on the product page scares off search visitors.
  [OBS]
- **Opal is a different shape:** its pain is bugs and redesigns (148), not the paywall. Once
  an app has a free tier, the paywall complaints shrink. This is a choice, not a fault, for a
  hard-paywall app.

### Representative verbatims (most-cited sub-themes)
- **Setup-then-pay:**
  - "Made me go through the entire set up before telling me I have to pay a subscription to
    use it. Disclose that at the start." [Wayk 1★ 2026-07-03]
  - "would be reasonable if I could see the price before they collect all my data and
    signature." [Wayk 1★ 2026-06-07] (this one is about the commitment/signature screen)
  - "I just filled out dumb ahh questions for like 20mins straight just to get slapped with
    39.99 a year" [Erly 1★ 2026-06-14]
- **Felt like bait:**
  - "I was told in the ad it was totally completely free" [Wayk 2★ 2026-07-02]
  - "I've seen lots of people say it's free but it's trying to make me pay." [Wayk 1★ 2026-10-01]
  - "Hey so why are we advertising this as a free app… Be upfront about it at least."
    [Wayk 1★ 2026-09-22]
- **Signature screen backlash:**
  - "makes you legitimately sign off on the stuff just to offer a measly '3 day trial'"
    [Wayk 2★ 2026-08-22]
  - "pls remove the singnicher part it makes me feel unsafe" [Wayk 2★ 2026-03-21]
  - → Locturne's `commit` hold-to-agree screen is the same device. It works in Opal's data
    (sub-club notes), but here it gets called a manipulation tactic when it comes right
    before an *undisclosed* price. Disclosing the price early (R1) defuses this.
- **Trial confusion:**
  - "WARNING: THE 'FREE WEEK' IS NOT A TRIAL! … It immediately charged me $20" [one sec 1★
    2024-07-29]
  - "asked if you want to try a free trial for one year for $19.99 with one week free… I
    immediately saw a $54 charge" [one sec 1★ 2024-10-14]
  - Note: Locturne's `offer` CTA is "See the free week". "Free week" is the exact phrase that
    review calls misleading. Keep "7-day free trial" on the purchase CTA (already the case on
    `plans`).
- **Reminder broken:** "The App Store says the trial is free and they will alert you before
  you are charged… They did not warn me and charged me $30." [Wayk 1★ 2026-05-29]
- **Annual-only sticker shock:** "I'm not signing up for a year without knowing if I like it
  and I'm not paying 5x the yearly price so I can test it for a month." [Erly 1★ 2026-01-06]
  - That's an argument for the trial on annual, which Locturne already has. It also shows
    that a large annual-vs-monthly ratio reads as a trick to some people. Locturne: $9.99 ×
    12 = $119.88 vs $59.99, about 2×. Fine.

### What people say made it worth it (5★ language to reuse)
- **"I hate it, which is why it works"** (Alarmy, Wayk):
  - "Hate it But It Annoyingly Worked" [Alarmy 5★ 2026-10-02]
  - "I have to cover my ears to make the coffee that it requires" [Erly 5★ 2026-08-11]
- **"The only thing that worked":**
  - "Wayk actually gets me up, it's the only thing that's worked for me" [Wayk 5★ 2026-10-02]
  - "I've been at war with my phone for a long time. No solution worked" [Brick 5★]
- **Physical barrier:**
  - "Something about the added physical barrier of getting up from the couch… makes you
    realize you'd rather be doing something" [Brick 5★ 2026-08-03]
  - "I'm telling on myself how lazy I am that I don't want to get up and walk to the Brick"
    [Brick 5★ 2026-06-19]
- **One concrete outcome:**
  - "I'm going to bed earlier… that alone makes it worth it" [Brick 5★ 2026-06-12]
  - "I had trouble not scrolling before bed and when I wake up, now with my phone
    automatically bricked, I am not allowed to do that any more, so I just go to bed"
    [Brick 5★ 2026-01-16]
  - "It's helped me get out of the habit of going on my phone right when I wake up in the
    morning" [Opal 5★ 2026-08-13]
- **Students say it saved school:**
  - "this app is single handedly saving my college degree" [Opal 5★ 2026-09-22]
  - "I'm a grad student and I was failing my classes because I couldn't get my face out of
    my phone… worth every penny" [Brick 5★ 2026-02-07]

→ **Paywall checklist rows should be outcomes in this language**, not features: "You go to bed
when you said you would." / "You're up before you're on your phone." / "No Ignore button."
[OPINION]

---

## 5. Gen Z and students: willingness to pay, access to payment, discounts, price

### Data
- **TikTok reach by age:**
  - 63% of US adults 18–29 use TikTok, vs 44% of 30–49
    ([Pew 2026](https://pewresearch.org/short-reads/2026/03/02/8-facts-about-americans-and-tiktok)).
  - About 60% of US teens 13–17 use it daily
    ([Pew 2024](https://www.pewresearch.org/internet/2024/12/12/teens-social-media-and-technology-2024/)).
    [BENCH]
  - I couldn't verify a share of US TikTok *viewers* by age band for a given video. TikTok
    doesn't publish it, and creator analytics show it only to the creator. **The founder's
    own analytics from past videos (Rivaldle, Soulsdoku) are the best data available. Check
    the age split there before deciding how much the teen problem matters.**
- **Payment access:** Gen Z leans on debit cards (43% primary) over credit (34%), and >20% have
  never used a credit card
  ([US News survey](https://www.usnews.com/banking/articles/survey-gen-z-millennials-are-ditching-the-credit-card-for-other-payment-methods),
  [Retail Brew](https://www.retailbrew.com/stories/2025/04/08/gen-z-is-over-credit-cards-as-debit-cards-and-bnpl-gain-traction-survey)).
  [BENCH]
  - Debit works fine on an Apple Account, so **18+ students are mostly reachable.**
  - The real wall is **under-18s**: no card of their own, gift-card balance alone reportedly
    can't start a subscription trial (Apple Community, unverified), and Ask to Buy applies.
- **Students say price is the barrier, and discounts earn goodwill:**
  - Roots offers student and needs-based discounts. At least 8 of its 275 sampled reviews are
    5★ *because of* the discount: "Thank you so much for the student discount" [Roots 5★
    2024-12-27]; "as a low income student, they have…"; "I was able to choose how much I'm
    able to pay/month". [OBS]
  - Roots also sees the downside of having no free option: "the target audience… is largely
    going to be from 13–21, which most kids in that age can't pay" [Roots 3★ 2026-07-17].
  - Opal sells a $9.99 "Student Weekly" (PRICING_RESEARCH).
  - No A/B data on a student discount's effect on conversion turned up. [none]
- **Price anchors in the reviews:**
  - Wayk/Erly users balk at **$20–$40/year** ("$2.49 a month for a glorified alarm?" [Erly
    1★ 2026-01-11]; "im not paying 30 dollars for an alarm" [Erly 1★]). One Wayk reviewer
    quotes "$60 FEE PER YEAR" [Wayk 2★ 2026-08-19].
  - The RevenueCat median annual price is $34.80, with most between $29.99 and $39.99
    ([SaaStr summary of SOSA 2026](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)).
    [BENCH]
  - Locturne's $59.99 is ~2× the alarm-app anchor and ~0.6× Opal's $99.99 annual.
  - **The listing category decides which anchor people use.** In Health & Fitness, next to
    Erly and Wayk, users anchor on "alarm app ≈ $30". Framed as "the phone lock you can't
    beat from bed", they anchor on blockers.
- **A Canadian poll (Jan 13–15, 2026, n = 1,230):** 47% of 18–24s say they are actively
  trying to reduce screen time. Of those:
  - 46% leave the phone in another room
  - 8% use a blocking tool
  - 65% cite physical health, "e.g. sleep"

  ([Narrative Research / Logit](https://logitgroup.com/wp-content/uploads/2026/02/Reducing-Screen-Time-Press-Release-Tables.pdf)).
  The 18–24 base is only 31 unweighted respondents, so treat these as directional.
  [BENCH, weak]
  - "Phone in another room" is the most common thing people have tried. That supports
    keeping it as a `tried` option with a strong echo.

### What this means for Locturne
- The **18–29 card-holders** are the buyers. The **13–17s** will come in volume from TikTok
  and can't buy. They are the main source of 1★ reviews.
  - Content can **steer the age mix**: dorm, first job, 9-to-5 and "I'm 24 and" framing pulls
    18+. "Late for school", "my mom" and the school bus pull under-18s. Wayk's angriest
    reviewers name "school" and "bus".
  - Make the videos 18+-coded. [OPINION, strongly suggested by the review evidence]
- **Don't add a weekly or student tier at launch** (agrees with PRICING_RESEARCH). Instead:
  - Give 13–17s an honest paywall (R6).
  - Use **offer codes** for student creators and campus ambassadors.
  - Treat "Student? Email me" as a support policy, the way Roots does, not a SKU. Roots shows
    this is cheap and earns 5★ reviews. [OPINION, medium confidence]
- **Monthly vs annual for students:** the "I won't commit to a year without trying" objection
  is answered by the 7-day trial on annual. Keep monthly with no trial as the decoy.
  - The reviews show students hate *surprise annual charges* most ("I did not choose to pay
    yearly", "charged me for a year"). That argues for making the summary sentence say
    "**$59.99 charged on Jan 10** unless you cancel", with a date, not just "after 7 days".
    It already shows the charge date on `offer`. Repeat it on `plans`.

---

## 6. Short-form-video installs: behaviour, message match, founder practice

### What the evidence says
- **Video → install:** Pushscroll's best video got ~200K users from ~8M views, i.e. about
  2.5% of viewers installed. A competitor with 40M monthly views made only ~$6K MRR
  ([Braavo](https://www.getbraavo.com/blog/from-0-to-1m-the-organic-growth-playbook-behind-pushscroll/)).
  Views are not intent. [ANEC with numbers]
- **Install → paid with a hard paywall:**
  - RevenueCat median download-to-paid by Day 35 is 10.7% for hard paywalls vs 2.1% for
    freemium. The top 10% reach 38.7%. Day-60 revenue per install is $3.09 vs $0.38
    ([RevenueCat](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)).
    [BENCH]
  - Cal AI: "approximately 20 to 25 percent of users who complete the onboarding flow
    convert either to a paying plan immediately or into the free trial". Moving sign-in to
    the end cut drop-off the most, and adding investment questions "even when those
    questions did not affect the app experience" raised conversion (reported via CNBC
    search snippet; article blocked, so treat as [ANEC]). Superwall's case study: 61
    experiments on the onboarding paywall alone, +31% trial-to-paid over 12 months
    ([Superwall](https://superwall.com/case-studies/cal-ai)).
  - Quittr: "25% download-to-paid" with a 99% onboarding completion rate and a hard paywall
    with no trial ([Yuma Ueno](https://yumaueno.substack.com/p/the-20-year-old-who-took-an-app-to)).
    Founder claim, unverified. [ANEC]
- **Social traffic converts worse than search traffic.** One secondary source puts organic
  App Store search page conversion at 30–65% vs TikTok *ads* at 3–15%
  ([semnexus](https://semnexus.com/app-store-conversion-rate-by-traffic-source-2026); SEO
  site, weak). I couldn't find a primary RevenueCat or Adapty number comparing TikTok with
  search for trial conversion. The often-repeated claim "TikTok users have 50% lower trial
  conversion than Facebook" has no primary source I could verify. [unverified]
- **Attribution is mostly invisible.** Viewers close TikTok and search the App Store, so the
  install looks organic ([Chottulink](https://chottulink.com/blog/how-to-track-which-influencer-actually-drove-your-app-installs-without-guessing/)).
  Locturne's `found` question is the right tool. Keep it.
- **How TikTok traffic behaves in onboarding (from the reviews):** these users arrive excited
  and primed by a demo ("I was so excited", "I've been looking for this forever" recur in
  Wayk's 1★ reviews). Many assumed "free" because the video didn't mention price or a creator
  said free. They finish the quiz (investment works). Then they rage-quit at the paywall
  rather than drop off midway. Their drop-off is concentrated at the paywall, not spread
  through the quiz. [OBS]

### Message match: hook → App Store page → first screen
- No public A/B test of "first screen echoes the video" turned up. Founder practice is
  consistent, though:
  - **Umax** made one screen the ad. RizzGPT's screens "fit seamlessly into viral TikTok
    slideshow trends" ([Superwall](https://superwall.com/blog/part-2-how-to-design-a-viral-app-in-2025)).
  - **Quittr's** creator brief required showing the app (DESIRE_VALIDATION).
  - **Cal AI** iterates on one winning format "the 100th iteration of the same concept"
    ([betterlaunch summary](https://www.betterlaunch.co/playbooks/episodes/blake-3apps)).
  - [ANEC]
- **"As seen on TikTok":** no evidence it helps. Putting a third-party trademark in App Store
  screenshots risks review rejection. Don't. [OPINION]
- **Locturne's chain should be one sentence, verbatim, three times:**
  - video hook "My phone won't work until I get out of bed"
  - → App Store screenshot 1 caption
  - → `hello` headline (currently "No apps until you're out of bed." Close enough. Pick one
    wording and use it everywhere).
- **Custom Product Pages** (up to 35, each with its own screenshots) can match a specific video
  family, e.g. a "bedtime betrayal" page vs a "200 steps" page. Linking a CPP from a TikTok
  bio or creator link gives a message-matched store page. Apple added per-CPP deep links in
  2025. If that's available in App Store Connect, a CPP can pass a `?src=` parameter, so
  `hello` can echo the exact video. **Verify in ASC before relying on it.** [OPINION; Apple
  feature unverified this session]

---

## 7. Shareable ("content") onboarding screens

- **Evidence that sharing *from onboarding* drives installs: none found** (no A/B, no founder
  numbers). [none] The strongest proven loop is the *product screen inside videos* (Umax,
  Cal AI's scan, Wayk's mission). Viewers seeing someone else's screen is the share. [ANEC]
- **Screens worth designing as content** (screenshot-ready, 9:16, readable without context):
  1. **`reveal`.** "About X hours a week on your phone in bed" plus the life grid. It's the
     TikTok "Caught in 4K" format (DESIRE_VALIDATION concept 5) and the most likely to be
     screen-recorded by creators doing "rate my onboarding" videos. The share card should
     carry Loc's line, the number, and "locturne" small at the bottom.
  2. **`commit`.** "The deal. Phone down at 11:30 PM. Downstairs to wake them." A contract
     is a meme-friendly format. But see the backlash in section 4: only safe after the price
     is disclosed.
  3. **The `tomorrow` demo animation.** It is the video hook in miniature. Make sure it looks
     good screen-recorded.
- **Measure, don't assume:** log `reveal_share_tapped` and `reveal_share_completed`. Add a
  `found` value for "Someone's screenshot". [OPINION]
- The **post-purchase morning receipt** (DESIRE_VALIDATION §5) will do more than any
  onboarding share. Recurring daily content beats a one-off number. [OPINION]

---

## 8. January / New Year

### Data
- **Health & Fitness, Jan 2025:**
  - IAP revenue $385M, an all-time high, +10% YoY
  - downloads the highest of any January since 2022

  ([Sensor Tower](https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025)).
  [BENCH]
- **Jan 1, 2025:** H&F installs +46% (Adjust, via search snippet
  [link](https://www.adjust.com/blog/2024-holiday-app-trends/); not opened, unverified). 2023:
  January installs 34% above the H1 average, +36% vs December
  ([Adjust](https://www.adjust.com/blog/health-tracker-installs-and-retention-data/), via
  snippet). [BENCH]
- **Refunds:** H&F refund rates rise ~20% in January, peaking at **2.4% in week 3**
  ([RevenueCat](https://www.revenuecat.com/blog/growth/how-to-tackle-new-year-subscription-churn)).
  [BENCH]
- **Trial cancellations:** about 40% of 7-day-trial cancellations happen on Day 0
  ([SaaStr summary of SOSA 2026](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)).
  Health & Fitness has the highest trial-to-paid rate (~35–38%) but the lowest first-renewal
  retention (~30%) (multiple SOSA summaries, e.g.
  [tasu.ai](https://tasu.ai/library/trial-to-paid-conversion-rate-benchmark); secondary).
  [BENCH]
- **The "resolutioner" cohort** is impulse-driven and has the year's lowest LTV
  ([Digital Yield Group](https://digitalyieldgroup.com/blog/health-fitness-apps-the-resolutioner-churn-problem/);
  vendor blog, weak). [OPINION-grade]
- **No screen-time-app-specific January data was found.** The category is listed under
  Productivity (Opal, Brick), which has a weaker January lift than H&F. LAUNCH_PLAN's choice
  of Health & Fitness for the January lift is consistent with this.

### What it means for onboarding copy
- **The January visitor is motivated by the date, not by last night.** They're more willing to
  start a trial and more likely to refund in week 3. The flow should make the *first two
  mornings* succeed (activation) and make the charge date impossible to miss. [OPINION]
- **Don't say "resolution", "new you" or "fresh start".** That's wellness language, banned by
  VOICE. Loc being tired of the whole thing is funnier and on-brand: "New year. Same bed."
- **The annual charge on Day 7 (≈Jan 9–12 for a Jan 2–5 launch) lands just before the week-3
  refund peak.** Every refund also costs the RevenueCat-reported conversion. See R10.

---

## 9. Recommendations (by screen id), with confidence

Expected-impact estimates are [OPINION] unless tagged otherwise.

### R1. Say it's paid on `deal`, not only at `offer`. (High priority, medium confidence on net conversion, high confidence on fewer 1★)
- Add one plain line under the beats on `deal`: **"Locturne is a paid app. The first week's
  free, and I'll show you the price before you start it."** It follows VOICE rule 5 (money is
  "clear when it matters").
- Also, App Store listing line 1 and the last screenshot: "7 days free, then $59.99/year".
- **Why:** the single biggest 1★ theme for the two closest analogs. It also defuses the
  "signature screen" backlash on `commit`.
- **Trade-off:** some TikTok minors and "free-only" users will leave at screen 2 instead of
  screen 26. They were never going to pay. But they would have reached `reveal` and maybe
  shared it, and some of them leave 1★ reviews today.
- **A/B it.** Arm A: current. Arm B: disclosure line. Primary metric: D35 net revenue per
  install (sub-club). Secondary: 1★ rate per 1K installs and refund rate.
- My prior: net revenue is flat to slightly down at worst. Review text gets much better, which
  protects App Store page conversion for search traffic (the higher-intent traffic). Confidence
  medium.

### R2. Rewrite quiz options in their words (see section 11 for full copy). Medium impact, high confidence it's at least neutral.

### R3. Answer the "free alternative" objections where they arise.
- `tried` gets two options from the review language: **"Deleting the apps"** and **"Phone
  across the room"** (merging the existing "Phone in another room"). Each gets its own
  `tried-echo`.
- `plans` Loc line rotates by `tried` answer, e.g. Screen Time → "Screen Time is free. It also
  has an Ignore button."
- Checklist rows are outcomes (section 4), not features.

### R4. Make the trial reminder real. (High priority, high confidence)
- Notifications aren't asked during onboarding, but `plans` promises "Remind me 2 days before
  it ends" (on by default).
- Either ask for notification permission *at that moment*, if the toggle stays on after
  purchase ("So I can remind you on day 5." → system prompt on `armed`). Or schedule a
  fallback in a way that doesn't need permission (there isn't one on iOS for local
  notifications).
- If permission is denied, show the date plainly on `armed`: "No reminder from me, then. It
  renews on **Jan 10**. Settings → your name → Subscriptions."
- **Why:** "you said you'd remind me" is a top 1★ and refund trigger [OBS: Opal, Wayk, Erly].
- **Note:** this disagrees with BRIEF/ONBOARDING's "notifications asked after first night".
  Keep that for *nightly* notifications, but the trial reminder needs its own contextual ask.

### R5. A visible close on `plans` → one exit offer → a calm door, not a loop.
- Wayk's "no X / pops right back" accounts for 18 of its low reviews.
- After `declined` and its offer, show: **"Fair. I'll be here. Asleep, mostly."** with Restore
  and a "Start the free week" link. Then let the app sit there. Don't re-show the paywall on
  every cold launch within the same minute.
- Hard paywall means no free use; that's unchanged.

### R6. Honest paywall for 13–17 (age is known from the `age` wheel).
- For 13–17, swap the reassurance line under the CTA to: **"Under 18? Your parent may need to
  approve this in Ask to Buy."** Add a share action: "Send to a parent", which opens the
  share sheet with an App Store link and one plain sentence: "I want an app that locks my
  phone at bedtime and keeps it locked until I get out of bed."
- The parent becomes the buyer, and parents are a sympathetic audience for this product.
- This stays within TEEN_ACCOUNTS' "no teen path" recommendation (it's copy plus a share
  sheet, not a parent mode).
- Confidence medium on conversion; high on fewer "I'm 13 and it made me pay" reviews.

### R7. Steer content to 18+ framing.
- Dorm and top bunk, first job, "I'm 22 and…", roommate POV. Avoid "late for school", "my
  mom" and school-bus setups.
- Brief creators: **never say "free app"; say "free week"**. Pin a comment with the price.
- **Why:** the Wayk reviews tie "saw it on TikTok/YouTube" to "thought it was free" and to
  minors.

### R8. Make one message match end to end. Pick the hook sentence and use it in the video, App Store screenshot 1 and `hello`. Use CPPs per video family once deep links are verified.

### R9. Rating-prompt timing.
- Ask for a rating (`SKStoreReviewController`) only after the **2nd–3rd successful morning
  unlock**, never on purchase day.
- Wayk's 4.73★ despite 36% negative written reviews shows that prompt timing decides the star
  average.
- Pair it with R1 so the *written* reviews improve too. Confidence high.

### R10. January refund defence.
- Implement App Store Server **Consumption Information** (Apple asks the developer for usage
  data when a refund is requested). RevenueCat can automate this; Dipsea cut refunds from 3%
  to 1.9% with RevenueCat's refund handling
  ([RevenueCat](https://www.revenuecat.com/blog/growth/how-to-tackle-new-year-subscription-churn)).
  [ANEC with numbers]
- Make day-1 and day-2 mornings succeed, since activation predicts keeping the subscription
  (sub-club).

### R11. Student goodwill without a SKU.
- Offer codes for student creators and ambassadors.
- A support macro: "Student and it's too much? Email me." Grant 50% via offer code.
- It costs little and has generated public 5★ reviews for Roots. Low impact on conversion;
  positive on reviews and word of mouth.

---

## 10. Where this disagrees with earlier docs

- **"Notifications not asked in onboarding" (BRIEF).** True for nightly notifications, but the
  trial reminder needs a contextual permission ask at purchase, or the promise breaks (R4).
- **`offer` CTA "See the free week".** "Free week" is the exact phrase in a one sec 1★
  ("THE 'FREE WEEK' IS NOT A TRIAL"). It's fine as a *navigation* button, but the purchase CTA
  must keep saying "free trial" plus the charge date. It already does on `plans`.
- **The commitment / hold-to-agree (`commit`)** is supported by Opal's data, but in Wayk's
  reviews it reads as a manipulation tactic when the price is hidden. Keep it, *with* R1.
- **1K_MRR_PLAN: "Save discounts for January".** The January cohort is the lowest-LTV and
  highest-refund cohort. A January discount stacks low price on low retention. Prefer the
  existing exit-offer A/B and no public New Year sale. [OPINION, medium]
- **DESIRE_VALIDATION ranked "My phone won't work until I get out of bed" over "walk 200 steps
  before TikTok works".** I agree, and add an age reason: "before TikTok works" codes young
  and invites the teen segment that can't pay.

---

## 11. Copy: rewritten quiz options and headlines (Loc's voice, users' words)

Rules applied: under ~8 words; no exclamation marks; no guilt; no wellness words; the
punchline lands on Loc or the phone. Options describe things that *happen to* the user. Keep
the numeric buckets that feed the math.

### `hello` (default)
- Headline: **"My phone won't work until I get out of bed."** (if the video uses that hook)
  or keep "No apps until you're out of bed." Match the video, whichever it is.
- Loc: "I'm Loc. Raccoon. I don't do mornings well either." (keep)

### `deal` (add the R1 line)
- Beats: Bedtime / Morning / Up means up (keep).
- New last line: **"It's a paid app. First week's free. I'll show you the price before you
  start it."**

### `nights`: "What happens most nights?"
1. "One more video. Then twelve more." (keep; it's already their language)
2. **"I look up and it's 2 AM."** (replaces "I lose track of time"; from "scroll through the
   early AMs", "until 1 AM")
3. **"It's the only time that's mine."** (new; revenge bedtime procrastination, r/sleep)
4. "I can't sleep, so I scroll." (keep)
5. **"I don't even enjoy it. My thumb does."** (new; "it's just a reflex", "what my hands did")
6. "Honestly, all of it." (keep)

Echo lines for the `math` loader:
- 2 AM → "Two AM. My time. Not yours."
- only-mine → "Keep your hour. Have it before bed, not in it." (answers O11 without guilt)
- thumb → "Your thumb's fired. I'll tell it."

### `alarm`: rewrite from feelings to behaviour (their words)
Headline: **"Alarm goes off. Then what?"**
1. **"Snooze. Snooze. Snooze."**
2. **"Phone. Then somehow it's 7:40."** (DESIRE_VALIDATION r/nosurf quote)
3. **"I'm awake. I just don't get up."** ("awake, not tired, just stuck")
4. **"I turn it off in my sleep."** (Erly/Wayk 5★ language)
5. "I get up. Rarely."

This keeps the "wrecked/groggy" signal out. It wasn't used in math, so check `content.ts`
before replacing. If the feeling answer feeds the paywall echo, map "Snooze" → wrecked and
"Phone" → groggy.

### `tried`: "What have you tried?"
1. "Screen Time limits" (keep)
2. "Another blocker app" (keep)
3. **"Deleting the apps"** (new)
4. **"Phone across the room"** (replaces "Phone in another room"; matches the Reddit phrasing
   "I literally got up and went and got it")
5. "Willpower" (keep)
6. "Nothing yet" (keep)

New `tried-echo` entries:
- delete → line **"You'll reinstall them by Thursday."** Body: "You don't have to delete
  anything. The apps you pick just sleep at night and wake up when you're out of bed."
- across the room (replaces the other-room echo) → line **"And then you walked over and got
  it."** Body: "With me, the phone can stay by the bed. The apps stay asleep until you're up
  and moving."

Existing echoes stay ("Screen Time has an Ignore button. I don't." is the best line in the
flow).

### `time-back`: add their outcome language
"Sleep more" / "Read" / "Work out" / **"Actually be on time"** (new; Wayk/Erly users: "late
for work", "miss my bus", "make it to class") / "Slow mornings" / "Something else".
- The paywall echo for "on time": "You'll be early. Don't get used to it."

### `reveal`
- Keep the number and the grid. Add a share-card variant title:
  **"I spend {X} hours a week on my phone in bed."** First person reads better as a
  screenshot.
- Loc at the bottom of the card: "I'd like those back. For sleeping."

### `screen-time` (answers O4/O5 plainly)
- Add one honest line: **"You can switch me off in Settings. It's annoying on purpose."**
- Admitting the exit builds trust with people who've seen every blocker bypassed. It also
  keeps VOICE's "never claim there's no way out".

### `offer` / `plans`
- `offer` Day-5 row: **"I remind you. I'm reliable about two things. This is one."** (only if
  R4 ships)
- `plans` summary: **"Free until Jan 10. Then $59.99 a year, unless you cancel."** (real date)
- Loc line by `tried`:
  - screen-time → "Screen Time is free. It also has an Ignore button."
  - nothing/willpower → "Your alarm is free. It also has a snooze button."
  - blocker → "Most of them stop at 7:00. I stop when you're up."
- Checklist (outcomes): "Phone down when you said." / "Apps wake when you're up. Not before."
  / "No Ignore button."
- 13–17: CTA sub-line "Under 18? A parent may need to approve this." plus "Send to a parent".

### `declined` door (R5)
- "Fair. I'll be here. Asleep, mostly."

---

## 12. Launch-week variant (Jan 2–9, 2027)

Date-gated copy only; no logic changes beyond the existing time-of-day opener.

| Screen | Default | Launch week |
|---|---|---|
| `hello` (day) | "No apps until you're out of bed." / Loc opener | **"New year. Same bed."** / "I'm Loc. I don't do resolutions. I do locks." |
| `hello` (5–10 AM) | "You're still in bed." / "I can tell. I'm also still in bed." | **"It's 2027. You're still in bed."** / "Me too. Let's fix one of us." |
| `deal` | + R1 line | same, + "Starts tonight. Not Monday." (beats the "I'll start Monday" delay) |
| `reveal` | hours/week + life grid | Add an annualised line: **"In 2027, that's about {X×52/24} days. In bed. On your phone."** |
| `commit` | "The deal. Phone down at 11:30 PM…" | **"The deal for 2027."** + same terms |
| `offer` | timeline | Same; the charge date shows the real January date |
| `plans` | — | No New Year discount (section 10). Loc: "No sale. I'm too tired for a sale." |
| `armed` | "Armed. See you at 11:30 PM." | "Armed. First night of the year. Don't make it weird." |

Also for launch week:
- App Store in-app event "New Year 30-Morning Challenge" (already in LAUNCH_PLAN). Make the
  event card say "7 days free, then $59.99/yr" (R1 logic).
- Creator brief: 18+-coded setups (R7), "free week" not "free app", and show the paywall
  price in at least one cut.

---

## 13. Open questions and cheapest tests
1. **What's the founder's own TikTok audience age split?** It's in TikTok analytics for past
   videos. If more than ~30% are under 18, R6 and R7 become top priority.
2. **R1 disclosure A/B:** run it from launch day. It's copy-only and can be shipped through
   the existing PostHog flag setup. Metric: D35 net revenue per install, plus 1★ per 1K
   installs.
3. **Can a $0 trial start with gift-card balance only?** Test on a sandbox Apple Account with
   no card, before launch. It decides whether the 13–17 copy should say "add a card" or
   "ask a parent".
4. **CPP deep links:** check App Store Connect for per-page deep link support. If it's there,
   `hello` can echo the exact video.

## Sources (primary data in this track)
- App Store customer-review RSS (US), pulled 2026-10-03, e.g.
  `https://itunes.apple.com/us/rss/customerreviews/page=1/id=6758021281/sortby=mostRecent/json`.
  App pages:
  - [Wayk](https://apps.apple.com/us/app/id6758021281)
  - [Erly](https://apps.apple.com/us/app/id6751428380)
  - [Opal](https://apps.apple.com/us/app/id1497465230)
  - [one sec](https://apps.apple.com/us/app/id1532875441)
  - [Brick](https://apps.apple.com/us/app/id6448794069)
  - [Alarmy](https://apps.apple.com/us/app/id1163786766)
  - [ScreenZen](https://apps.apple.com/us/app/id1541027222)
  - [Roots](https://apps.apple.com/us/app/id6446800962)
  - [ClearSpace](https://apps.apple.com/us/app/id1572515807)
  - [Jomo](https://apps.apple.com/us/app/id1609960918)
- Reddit via the Arctic Shift API; links inline.
- Pew 2024 teens, Pew 2026 TikTok; Sensor Tower H&F 2025; RevenueCat SOSA 2026 blog and
  New Year churn blog; SaaStr SOSA summary; Superwall Cal AI case study and viral-app post;
  Braavo Pushscroll; Yuma Ueno on Quittr; Apple Ask to Buy (support.apple.com/105055); Apple
  Community threads on gift-card balance; Narrative Research / Logit Jan 2026 poll; US News
  and Retail Brew on Gen Z payments. All linked inline.
