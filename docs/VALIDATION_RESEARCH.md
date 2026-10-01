# Trundle validation research

Researched September 23, 2026. This covers the problem, demand, target users,
competitors, positioning, iOS feasibility, monetization, distribution, a gated
validation plan, and an MRR estimate. It is research to inform decisions.
[GAME_PLAN.md](../GAME_PLAN.md) remains the source of truth for product direction.
Where a recommendation here conflicts with the game plan, the game plan wins until
it is deliberately updated.

This research was written while Trundle was a sleepy rock. The same day, the mascot
direction changed to a tired, sassy raccoon with a sleep mask
([MASCOT_DIRECTION.md](MASCOT_DIRECTION.md)). The findings refer to "a companion
character" and hold either way. Where the text says "rock", read "Trundle".

A designed version of the summary is published privately at
https://claude.ai/artifact/XAqv6UWNFmxDJA2fn14nz6.

**Evidence tags:**

- **[PR]** Peer-reviewed.
- **[POLL]** Major pollster with published methods.
- **[IND]** Industry or vendor survey.
- **[EST]** Third-party estimate or founder claim.
- **[OPINION]** Our judgement, not evidence.

Revenue figures for private companies are founder statements or third-party
estimates. Competitor-run review sites (blok.so, habitdoom, foqos) were used only
for complaint patterns.

## Verdict

1. **The problem is real and widely felt.**
   - 70% of US adults under 30 say they spend too much time on their phones.
   - Only 1 in 4 of those who tried to cut back say it went very well.
   - Half of US adults use a screen in bed every day.
2. **The category is crowded, but this exact combination is unclaimed.** We found no app that pairs a scheduled bedtime lock with a step-based morning unlock and a companion character. Walk-to-unlock apps exist, but they are small, generic, priced weekly and poorly reviewed. **Correction (September 24):** Opal already ships a bedtime lock *and* a morning lock (Opal Sleep, January 2026). Only the step-based unlock and the character are unclaimed. See section 14.
3. **The edge is "the gentlest lock that actually holds."** Competitors fall into three groups: strict and cold (Brick, Opal Deep Focus), soft and bypassable (one sec, Screen Time), or cute with no enforcement (Finch, Forest).
4. **The biggest risk is technical, not market.** Three problems:
   - Apple approval of the Family Controls entitlement.
   - Unreliable DeviceActivity callbacks.
   - No reliable instant automatic unlock at 200 steps.

   The dependable design is tapping the shield to check steps.
5. **Retention must be proven before launch.** The daily lock loop helps retention structurally, but mascot novelty fades. The north-star metric is "blocking still active at D7/D30."
6. **Start now with three steps:**
   - Request the entitlements.
   - Run a no-code concierge test of the ritual.
   - Post concept videos that link to a waitlist with a paid founding-member option.

## 1. The problem

### Bedtime phone use

- 50% of US adults use a screen in bed every day, and another 33% do most days or several days a week. 38% say doomscrolling worsens their sleep; among 18–24s the figure is 46%. [IND, run by a medical society] [AASM 2025, n=2,007](https://aasm.org/americans-are-doomscrolling-at-bedtime-prioritizing-screen-time-over-sleep/)
- 93% of Gen Z say they have stayed up past bedtime because of social media, compared with 80% of all adults. [IND] [AASM 2022](https://aasm.org/are-you-tiktok-tired-93-of-gen-z-admit-to-staying-up-past-their-bedtime-due-to-social-media/)
- 58% of Americans use screens in the hour before bed. [POLL] [NSF 2022](https://www.thensf.org/screen-use-disrupts-precious-sleep-time/)
- 49.5% of US adults sleep with their phone. [IND] [Reviews.org Q4 2025](https://www.reviews.org/mobile/cell-phone-addiction/)
- Heavier smartphone use is consistently associated with worse sleep quality, longer sleep latency and shorter sleep. Social media shows the strongest link. [PR] [JCSM meta-analysis](https://jcsm.aasm.org/doi/10.5664/jcsm.10392); [Kumar 2025](https://onlinelibrary.wiley.com/doi/10.1002/slp2.70002)
- Among adults, calling or texting after lights-out predicted worse sleep, higher insomnia scores and more fatigue. [PR, cross-sectional] [Exelmans & Van den Bulck 2016](https://pubmed.ncbi.nlm.nih.gov/26688552/)
- **Causal evidence (small):** in an RCT with 38 young adults, avoiding the phone for 30 minutes before bed led to faster sleep onset, longer sleep, better sleep quality, better mood and better working memory. [PR, pilot] [He et al. 2020, PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0228756)
- Bedtime procrastination was defined by [Kroese et al. 2014](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00611/full) [PR]. It is higher in women and in students. [PR, one Polish sample] [PMC6759770](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6759770/)
- **Light versus content:** the NSF 2024 consensus (Delphi method, 522 articles) agreed that the *content* of screen use before sleep impairs sleep. It did **not** reach consensus that screen light impairs adults' sleep. [PR] [Hartstein et al. 2024](https://pubmed.ncbi.nlm.nih.gov/38806392/) Blue-light glasses show little effect on actigraphic sleep. [PR] [PMC12668929](https://pmc.ncbi.nlm.nih.gov/articles/PMC12668929/)

**Meaning for Trundle:** blocking apps at bedtime targets the best-supported
mechanisms: engagement, arousal and sleep time lost to scrolling. Don't market on
blue light. The line to use is "It's not the light, it's the feed."

### Morning phone use and the 200-step question

- About 85% of US adults check their phone within 10 minutes of waking. [IND] [Reviews.org](https://www.reviews.org/mobile/cell-phone-addiction/) In 2016, 43% did so within 5 minutes. [IND, dated] [Deloitte via CBS](https://www.cbsnews.com/philadelphia/news/43-percent-of-americans-use-smartphone-within-5-minutes-of-waking-up-survey/)
- Using a device within 5 minutes of waking is associated with higher anxiety and depression scores. [PR, cross-sectional, **not causal**] [JMIR Mental Health 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7317625/) We found no good causal studies showing that morning scrolling harms mood or productivity.
- Morning light exposure is associated with faster sleep onset and better sleep quality. [PR] [Figueiro et al. 2017](https://www.sleephealthjournal.org/article/S2352-7218(17)30041-4/abstract)
- About 7,000 steps a day is associated with substantially lower mortality compared with 2,000. The lowest step count with a measurable benefit is about 2,500. [PR] [Ding et al. 2025](https://www.thelancet.com/journals/lanpub/article/PIIS2468-2667(25)00164-1/fulltext); [Stens et al. 2023](https://www.jacc.org/doi/10.1016/j.jacc.2023.07.029)
- **200 steps is about 2 minutes of walking.** [PR] [CADENCE-Adults](https://pmc.ncbi.nlm.nih.gov/articles/PMC6337834/) It is not exercise and not a health intervention. Its honest role is a pattern interrupt: get out of bed and away from the phone-in-bed loop, possibly toward daylight.

### Evidence that friction and blocking work

- **one sec** (PNAS 2023, n=280, 6 weeks): users closed the target app on 36% of attempts, and open attempts fell 37%. **The delay did the work; the reflective message did not.** [PR] [Grüning et al.](https://www.pnas.org/doi/10.1073/pnas.2213114120) A long-term follow-up (n=1,039, about 13 weeks) found the effects persisted. [PR] [Haliburton et al. CHI 2024](https://dl.acm.org/doi/10.1145/3613904.3642370)
- **Castelo et al.** (PNAS Nexus 2025, n=467): two weeks of blocked mobile internet improved mental health (dz=0.56), well-being (0.45) and sustained attention (0.23). **Only 25.5% met the compliance threshold.** [PR] [link](https://academic.oup.com/pnasnexus/article/4/2/pgaf017/8016017)
- **Allcott, Gentzkow & Song** (AER 2022): about 31% of social media use is attributable to self-control problems, and letting people set limits in advance reduced use. [PR] [link](https://www.aeaweb.org/articles?id=10.1257%2Faer.20210867)
- **Giné, Karlan & Zinman 2010:** few people take up commitment devices (11%), but they work for those who do. [PR] [link](https://www.aeaweb.org/articles?id=10.1257%2Fapp.2.4.213)
- Limiting social media reduced loneliness and depression [PR] [Hunt 2018](https://guilfordjournals.com/doi/10.1521/jscp.2018.37.10.751). Deactivating Facebook produced small well-being gains [PR] [Allcott 2020](https://www.aeaweb.org/articles?id=10.1257%2Faer.20190658).
- **Do not cite** Ariely & Wertenbroch 2002 on deadlines. It was **retracted in September 2026**. [Retraction Watch](https://retractionwatch.com/2026/09/03/procrastination-study-duke-dan-ariely-psychological-science-data-colada-tampering-retraction/)

### Why people abandon screen-time tools

- **Too weak:** users see digital-wellbeing apps as "not restrictive enough." [PR] [Roffarello & De Russis, CHI 2019](https://dl.acm.org/doi/10.1145/3290605.3300616)
- **Too strong:** hard blocks trigger reactance, and users circumvent or uninstall them. [PR, secondary citation of Lyngs 2020] [JMIR mHealth 2026](https://mhealth.jmir.org/2026/1/e56824/PDF)
- **One-tap bypass:** Screen Time's "Ignore Limit" is easy to dismiss. [anecdotal] [TechCrunch 2026](https://techcrunch.com/2026/06/24/if-you-want-to-cut-your-screen-time-just-get-a-brick/)
- No rigorous published bypass rates exist. Trundle's own numbers could become content.

**Meaning for Trundle:** there is a narrow band between too weak and too strict.
Trundle is strict only during a window people agree with, and its unlock is
effortful but always achievable. That should give better adherence than all-day
blocks. The idea that a companion framing reduces reactance is a hypothesis to
test.

## 2. Demand and target user

- **Pew, Sept 2026 (n=9,750).** [POLL] [link](https://www.pewresearch.org/short-reads/2026/09/01/about-half-of-americans-say-they-spend-too-much-time-on-their-smartphone/)
  - 53% of US adults say they spend too much time on their phone: 70% of 18–29s, 64% of 30–49s.
  - 45% tried to cut back in the past year (58% of 18–49s).
  - Only 25% of those who tried say they were very or extremely successful.
- **Harris/Haidt 2024 (Gen Z, 18–27):** 83% have taken steps to limit social media, and 47% wish TikTok didn't exist. [POLL] [link](https://theharrispoll.com/articles/gen-z-social-media-smart-phones/)
- **Pew teens:** 38% say they spend too much time on their phone. [POLL] [link](https://www.pewresearch.org/internet/2024/03/11/how-teens-and-parents-approach-screen-time/)
- **Proof that people pay:**
  - Opal has about $10M ARR and 1M+ DAU, and two-thirds of its DAU are students. [EST, founder]
  - Brick costs $59.
  - Bloom costs $39 and has sold 60K+ units. [press] [Fortune 2026](https://fortune.com/2026/02/13/analog-gen-z-phone-addiction-bloom-brick-app-blockers-dumb-phones-social-media/)
  - Alarmy has 65–75M downloads; people accept physical tasks in the morning.
- **Unreliable, don't use:** market-size reports (paywalled resellers) and dumbphone-growth percentages from blogs.

**Target user:**

- **Launch persona:** 19–30, iPhone, female-skewed (a hypothesis), who says "I lose an hour to TikTok in bed every night."
- **Students** bring volume and virality but convert less often.
- **Young workers (22–35)** are the likeliest payers.
- **Not parents at launch.** Parental control is a separate market.

## 3. Competitors

Ratings are from the US App Store unless noted. Revenue figures are estimates.

| App | Mechanic | Price | Rating | Scale | Top complaints |
|---|---|---|---|---|---|
| Opal | Screen Time sessions; Deep Focus can't be ended; gems | Freemium (3 free blocks/day), $19.99/mo, $99.99/yr, $399 lifetime | 4.7 (88K), Editors' Choice | ~$10M ARR, 1M DAU [EST] | Bypass by deleting the app; price |
| one sec | Delay/breathing screen before opening an app | Free for 1 app; $2.99/mo, $19.99/yr | 4.9 (55K+, 2024) | [EST] ~$100K/mo | Easy to push through |
| ScreenZen | Friction, open limits | Free (donations) | 4.9 (50K) | 500K+ MAU (claimed) | Wrongful blocks, lost streaks, token bug on iOS 17.4–17.5 |
| Halo (ScreenZen) | Bluetooth puck; bedroom blocking by proximity | $49 one-time | — | — | Bypass by going to another room; lag |
| Brick | NFC puck tap to lock/unlock; 5 emergency unlocks | $59 one-time | 4.9 (2.5K, CA) | [EST, low confidence] ~$616K/mo | Can be disabled in Settings; crashes |
| Bloom | NFC card, streaks, friends | $39 one-time | — | 60K+ units sold | Finicky NFC |
| Unpluq | NFC tag + barriers | $26.50 + $64/yr required | 4.49 | — | Required subscription |
| Blok | NFC card/keychain with modes | from $59.99/yr | 4.8 (628) | — | Flimsy chip |
| Foqos | Open-source NFC/QR blocker with profiles | Free | — | — | — |
| Jomo | Detailed rules and schedules | $29.99/yr, $99.99 lifetime | 4.8 (1.9K) | 250K users (claimed) | Auto-renewal charges, glitches |
| Clearspace | Push-ups to earn minutes | $44.99–79.99/yr | — | YC-backed | Inaccurate push-up tracking |
| Unrot | Shared "battery" of screen time | $7–70 IAP, no trial | 4.7 (57K) | Strong TikTok presence | No trial |
| Refocus | Strict mode, NFC, schedules | $7.99–59.99 | 4.8 (11K) | — | Free tier blocks all at once |
| AppBlock | Schedules, strict mode | $29.99–59.99/yr, $89.99 lifetime | 4.6 (6.7K) | 15M users (claimed) | Strict mode broke |
| Freedom | Blocking across devices | $39.99/yr, $199 lifetime | 4.4 | — | — |
| Forest | Tree dies if you leave; no real blocking | $39.99/yr Plus | 4.8 (1M+) | 60M+ users (claimed) | Novelty fades by about month 2 |
| Alarmy | Alarm dismissed by missions (steps, squats…) | $59/yr | 4.8 (247K) | 75M+ downloads (claimed) | Missions paywalled; "I have to stomp" |
| Finch | Self-care pet (not a blocker) | $39.99–79.99/yr, soft paywall | 4.95 (550K+) | ~$30–40M ARR [EST] | — |

**Walk-to-unlock apps.** All are small; nobody leads the niche.

| App | Rating | Price | Notes |
|---|---|---|---|
| Steppin | 4.5 (155) | — | 1 min per 100 steps. Blocks don't hold unless the app is reopened; unlock time miscounted |
| WalkLock | 4.6 (29) | $19.99/yr, $59.99 lifetime | Uses HealthKit only |
| Stryde | 4.5 (38) | — | Wearable step sync lags up to 15 min |
| StepTok | 4.2 (6) | $3.99/wk | "No rest days" complaint |
| WalkGate | — | — | No override; claims automatic unlock |
| Others | — | — | Steps Unlock, Socky, WayOut, StepScroll, WalkBlock have almost no reviews |

**Closest to bedtime plus a morning ritual:**

- **MindLock** locks around 3 AM and unlocks after a 1-minute meditation. 2 ratings; no steps; no character.
- **Anchor** is pre-launch with scheduled "At Rest" blocks.
- **Awake** is an alarm with tasks plus blocking.
- **Halo** blocks by proximity.
- **Routine Lock** and **Hisn** also lock apps until a morning routine is done.

**Mascots:**

- **Finch** is the benchmark.
- **Forest** relies on guilt; Trundle explicitly avoids that.
- Small pet blockers (Screencat, CatNap, Scrappy, Squishy, Screentime Pals) are tiny.
- No published data shows that mascots improve retention for blockers.

**Gaps nobody fills well:**

1. A bedtime lock with a step-based morning unlock and a character.
2. A small, humane step goal. Rivals use 10K-style goals or charge minutes per 100 steps.
3. A guilt-free character with real enforcement.
4. Reliability. Silently failing blocks are the most common complaint.
5. Fair pricing. Rivals charge weekly; hardware wins on "one-time."

Competitor sources:

- **Opal:** https://apps.apple.com/us/app/opal-screen-time-control/id1497465230 · https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026
- **one sec:** https://adapty.io/paywall-library/one-sec-screen-time-focus/
- **ScreenZen:** https://apps.apple.com/us/app/screenzen-screen-time-control/id1541027222 · https://developer.apple.com/forums/thread/756440
- **Halo:** https://whatifididnt.com/blog/screenzen-halo/
- **Brick:** https://apps.apple.com/ca/app/app/id6448794069
- **Unpluq:** https://www.unpluq.com/collections/all
- **Foqos:** https://github.com/awaseem/foqos
- **Jomo:** https://apps.apple.com/us/app/jomo-screen-time-blocker/id1609960918
- **Clearspace:** https://www.ycombinator.com/launches/KxS-clearspace-earn-your-screen-time-with-exercise
- **Unrot:** https://apps.apple.com/us/app/unrot-earn-your-screen-time/id6746537171
- **Refocus:** https://apps.apple.com/us/app/refocus-block-apps-websites/id1645639057
- **AppBlock:** https://apps.apple.com/us/app/appblock-block-apps-website/id1515753232
- **Forest:** https://screentimeindex.com/posts/forest-app-review/
- **Alarmy:** https://apps.apple.com/us/app/alarmy-loud-alarm-clock/id1163786766
- **Steppin:** https://apps.apple.com/us/app/steppin-steps-for-screen-time/id6737981423
- **WalkLock:** https://apps.apple.com/us/app/walklock-walk-to-unlock-apps/id1633153202
- **Stryde:** https://apps.apple.com/us/app/stryde-block-apps-for-steps/id6479675973
- **StepTok:** https://apps.apple.com/us/app/steptok-walk-to-unlock-apps/id6756244374
- **WalkGate:** https://walkgate.app/
- **MindLock:** https://apps.apple.com/us/app/mindlock-morning-screen-time/id6758919796
- **Anchor:** https://www.anchormorning.app/
- **Finch:** https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money
- **Screencat:** https://apps.apple.com/us/app/screencat-screen-time-pet/id6741950612

## 4. Our edge

> "Trundle goes to bed when you should. Your apps sleep with him. Two minutes of
> walking wakes you both up."

The honest answer to "what makes us better" is that today nothing does, because
the product isn't built. These are the potential advantages, ranked by how hard
they are to copy:

1. **Founder distribution.** The founder has about 1M views of track record on short-form video. Winners in this category are decided by distribution. Finch, Opal and Quittr all grew through short-form video. Trundle also films well: the rock falls asleep, the apps go dark, then a groggy morning walk. This advantage is the hardest to copy.
2. **A character is a brand, not a feature.** A competitor can ship "walk 200 steps" in a sprint; it can't ship attachment to Trundle.
3. **Strict but likeable.** The block is strict only during the night, and the unlock is always doable. A caring frame ("Trundle is sleeping") replaces a punitive one. No major blocker does this.
4. **An unclaimed combination.** Bedtime lock, morning walk and companion together is an opening, not a moat: Opal could add steps quickly.
5. **Reliability and honesty, if delivered.** Blocking reliably and saying plainly when protection is off would beat half the market. It is also our hardest technical problem.

**Not our edge:** the blocking itself (the same Apple API everyone uses), stats and
charts (Opal is years ahead), or walking to unlock on its own (a dozen apps do it).

**Positioning:** own the night and the first ten minutes of the morning, not
all-day screen time. Pitch it as "a Brick you don't have to buy": physical friction
from getting up and moving.

**Why people would want it:**

- **Functional:** they decide once, and it runs automatically.
- **Emotional:** control without scolding, and a small morning win.
- **Social:** a cute, shareable identity that fits the Gen Z "analog" trend.

**Why they would stop:**

- A block fails and they lose trust.
- The walk feels annoying when they're sick, traveling or rushed.
- The novelty wears off. Pokémon Sleep's monthly revenue fell from $10.6M to $5.1M in about 18 months. [link](https://www.pocketgamer.biz/pokmon-sleep-slumbers-over-150m-mark-despite-slowdown-since-first-anniversary/)
- They revoke Screen Time access in Settings, which Apple doesn't let apps prevent.

## 5. iOS feasibility

### Possible

- **Scheduled bedtime blocking with the app closed.** A `DeviceActivityMonitor` applies `ManagedSettingsStore` shields at `intervalDidStart`. [Apple](https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor)
- **Separate stores for each list.** Named stores (`always`, `sleep`, `nap`) are shared between the app and its extensions. [forum](https://developer.apple.com/forums/thread/716602)
- **Self authorization** (`.individual`) on iOS 16+. [WWDC22](https://developer.apple.com/videos/play/wwdc2022/110336/)
- **Schedule rules:** intervals must be at least 15 minutes. Use hour and minute components only. [forum](https://developer.apple.com/forums/thread/729841) react-native-device-activity allows at most 20 monitors.
- **Steps since morning start without opening the app.** `CMPedometer.queryPedometerData(from:to:)` keeps 7 days of history. Expo's `Pedometer.getStepCountAsync` is iOS-only; `watchStepCount` doesn't run in the background. [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/pedometer/)
- **Lifting shields from `ShieldActionDelegate`.** Clear the store and return `.defer`; Apple DTS confirmed this pattern. [forum](https://developer.apple.com/forums/thread/807934) The open-source app StepFirst queries CMPedometer in its ShieldAction extension and unlocks at 200 steps. [GitHub](https://github.com/Insouc1ant/StepFirst/blob/main/Extensions/AppShieldAction/ShieldActionExtension.swift)
- **Naps** as one-off schedules.

### Uncertain: prototype first

- Whether CMPedometer works inside the ShieldAction or DeviceActivityMonitor extensions, and whether motion permission is inherited.
- Memory limits. The monitor extension has a hard ~6 MB limit. [forum](https://developer.apple.com/forums/thread/735454) The ShieldAction limit is undocumented.
- Whether unshielding from ShieldAction works in TestFlight builds; one report says only debug builds work.
- Automatic unlock via chained 15-minute morning schedules.
- Whether the shield can show live "X / 200" progress. [forum](https://developer.apple.com/forums/thread/716340)

### Not possible

- **Instant automatic unlock at 200 steps via HealthKit.** Background delivery is hourly at best, and HealthKit can't be read while the device is locked. [forum](https://developer.apple.com/forums/thread/824819)
- **Opening the app from the shield.** Only `.none`, `.defer` and `.close` are available; a notification is the workaround. [forum](https://developer.apple.com/forums/thread/719905)
- **Live background pedometer updates**, and keeping the app alive just to count steps (App Review 2.5.4).
- **Preventing users from revoking Screen Time access.** There is no callback when they do.
- **Reading app names.** Tokens are opaque.

### Recommended morning unlock

1. A repeating schedule runs from bedtime to morning start. `intervalDidStart` applies the `sleep` store.
2. `intervalDidEnd` does **not** clear the store. It records `morningStart` and optionally sends a local notification.
3. **Primary unlock: the shield button.** It reads "Is Trundle awake?" and runs a CMPedometer query from `morningStart` to now. At 200 or more, the shields lift. Below that, the shield updates to show progress.
4. **Secondary unlock:** check on app foreground with `getStepCountAsync`.
5. **Bonus only, never promised:** an automatic unlock via HealthKit background delivery or chained schedules.
6. **Self-heal on every launch and callback** by reconciling App Group state with the shields that should be active.

This turns the API limitation into the ritual itself: knocking on Trundle's door.

### Gates and known bugs

- **Family Controls Distribution entitlement.**
  - Needs a separate approval for the app **and each extension** (4 bundle IDs).
    *Update 2026-09-28: the request form is now a single account-level request
    with no bundle ID field. See [ENTITLEMENT_SETUP.md](ENTITLEMENT_SETUP.md).*
  - Approval takes about a day to 5+ weeks, with no status updates.
  - Until every ID is approved, EAS and TestFlight builds are effectively blocked. [Apple](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement) · [RNDA README](https://github.com/kingstinct/react-native-device-activity) · [eas-cli#2715](https://github.com/expo/eas-cli/issues/2715)
- **Known iOS 26 issues:**
  - `eventDidReachThreshold` fires early. Fixed in 26.5 beta. [forum](https://developer.apple.com/forums/thread/814559)
  - No callbacks for non-repeating schedules on 26.3.1, which affects naps. [forum](https://developer.apple.com/forums/thread/820956)
  - Shields don't reapply in some TestFlight builds. [forum](https://developer.apple.com/forums/thread/801172)
- **Expo:** react-native-device-activity (config plugin) or `@bacons/apple-targets` can build the extensions on EAS without a Mac. The pedometer check needs custom Swift, and the build-and-test cycle will be slow.
- **App Review:**
  - Guideline 2.5.4 (background modes).
  - 5.1.3 (no ads use of motion or health data).
  - One developer was rejected 13+ times after adding DeviceActivity extensions. [forum](https://developer.apple.com/forums/thread/821157)
  - Include a demo video in the review notes, and don't claim auto-unlock unless it works.
- About 35% of users grant permission but pick no apps. Require at least one pick. [habitdoom](https://habitdoom.com/blog/shipping-familycontrols-ios)

### Device prototype order

1. Entitlement request (one per account as of 2026-09-28; submitted).
2. CMPedometer inside ShieldAction.
3. Unshielding in a TestFlight build.
4. CMPedometer in the monitor extension.
5. Chained schedules while the phone is locked.
6. A multi-night bedtime schedule.
7. `intervalDidEnd` for naps.
8. HealthKit wake frequency.
9. The shield refreshing to show "X / 200."
10. Notifications under Sleep Focus.
11. A full EAS build with custom Swift.

## 6. Product changes suggested by the research

All of these fit GAME_PLAN.md. Items marked [OPINION] are unvalidated.

1. Design the shield as Trundle's bedroom door: sleeping Trundle, the morning time and one button. It's the most-seen screen.
2. Show the reconcile health check on the dashboard: is Trundle guarding, and what is broken?
3. Ship rest days and a sick-day option early. "No rest days" is a recurring complaint about step apps.
4. Make step detection forgiving. Use on-device CMPedometer, not HealthKit, which lags when syncing from wearables.
5. Add a Lock Screen widget and bedtime and morning pushes. iOS push opt-in users retain about 2× better. [Airship 2026](https://www.airship.com/resources/mobile-app-push-notification-benchmarks-2026/)
6. [OPINION] Give each wake-up something small, reward-only and never taken away, such as what Trundle dreamed. It must not become a currency, a punishment or the main loop. Check it against the game plan first.
7. Require at least one app selection during setup.

The go-to-market research suggested travel or distance progression. That conflicts
with GAME_PLAN.md, and we excluded it.

## 7. Monetization benchmarks

GAME_PLAN.md leaves monetization undecided.

**RevenueCat 2026, Health & Fitness:** [link](https://www.revenuecat.com/state-of-subscription-apps)

- Download to trial: 6.9%.
- Trial to paid: 37.7%.
- Download to paid: 2.9%.
- Median prices: $9.99/mo, $39.94/yr.
- Year-1 LTV per payer: $35.64.

**Paywall type and trial length:**

- A hard paywall converts 10.7% of downloads to paid by day 35, against 2.1% for freemium.
- Revenue per install at day 60 is $3.09 with a hard paywall and $0.38 with freemium.
- Trials of 17–32 days convert 42.5%, against 25.5% for trials under 4 days.

**Renewals and refunds:**

- About 25% of H&F annual subscribers renew after year one. [link](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category)
- H&F refunds run about 4.7%.

**Adapty 2026 (H&F):** trial to paid 42.2%; hard paywall LTV about 21% higher than soft; annual plans make up 61% of revenue. [link](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)

**Lifetime pricing:** typically 2–12× the annual price. [link](https://www.revenuecat.com/blog/growth/lifetime-subscriptions)

**Opal:** conversion fell from 20% to 9% after the switch to freemium, but revenue
grew to $10M ARR, and free users became the marketing engine. [EST]

**Current lean [OPINION]:**

- A free core (one bedtime schedule and the morning walk), so the thing people see in videos works for them.
- A paid tier for depth: naps, the always-blocked list, extra schedules, widgets and rest-day flexibility.
- About $39.99/yr with a trial of 7+ days, plus a lifetime option to test.
- Decide only after TestFlight retention data exists.

## 8. Distribution

**How comparable apps grew:**

- **Quittr:** paid about $3 per 1K views to niche creators. It used a 12-page quiz and a hard paywall; about 25% of downloads became payers. Pricing was $12.99/mo or $45/yr. It reached about $250K MRR in 4–6 months. The founders said generic UGC worked less well. [EST] [link](https://boringcashcow.com/interview/interview-with-the-founder-of-quittr)
- **Cal AI:** the founder posted TikToks daily, then paid micro-influencers about $5 CPM. [EST] [link](https://whatastartup.substack.com/p/two-gen-z-founders-bootstrapped-cal-ai)
- **Finch:** its top organic TikTok has 63.4M views. It runs heavy Meta and TikTok ads that reuse UGC.
- **one sec:** grew from a viral screen recording, then gained credibility from its research.
- **Opal:** turned a viral user video into its best ad.
- **Slideshows:** no rigorous data exists on how slideshow views convert to installs.

**Formats that worked in this category:**

- A screen recording of the blocking moment.
- A viral user video reused as an ad.
- A quiz leading into a paywall.
- Content from a mascot account.
- Niche creators paid per view.

**Niches to test:** sleep schedules, students and exam season, dopamine detox,
"that girl" morning routines, hot-girl walks, cozy and kawaii.

**Video angles to A/B test:**

- (a) The cute rock.
- (b) "My phone goes to jail at 11 pm."
- (c) "I have to walk 200 steps to open TikTok."
- (d) "It's not the light, it's the feed."

**Paid ads:** iOS cost per install in H&F is about $4–8. [EST] At freemium's $0.38
revenue per install by day 60, ads lose money until the funnel is strong. Reuse the
best organic videos as ads only after retention holds.

## 9. Validation plan with gates

The thresholds below are our own suggested bars, set before looking at results.

| When | Step | Pass / signal |
|---|---|---|
| Week 0 | Request Family Controls Distribution (done 2026-09-28). After approval, run a device spike: pedometer in ShieldAction, TestFlight unshield, 3+ nights of scheduling | Shield-tap unlock works in TestFlight. Fallback: in-app check plus a notification |
| Weeks 1–2 | Concierge test with 10–15 people: iOS Downtime at bedtime, 200 steps before opening apps, step screenshots texted daily, interviews on day 3 and day 10 | Most are still doing it on day 7 and ask when the app launches. Warning signs: skipping when unobserved, or "pointless/annoying" |
| Weeks 1–3 | 20–30 concept videos across 4 angles on the main account and one fresh faceless account. Link to a "coming soon" waitlist with a paid founding-member option | Measure saves, shares, "what app is this?" comments, sign-ups and paid pre-orders. Pick the winning angle |
| Weeks 3–8 | TestFlight cohort of 100–300. Instrument blocking-active at D1/D7/D30, morning unlocks, on-time bedtime blocks, bypasses and revocations, and the Sean Ellis survey | Launch gate: D30 blocking-active ≥ 20% and flattening; ≥ 30–40% "very disappointed"; fewer than 1 in 50 nights with a missed block |
| After gate | Launch week: concentrated founder videos plus 10–30 paid niche creators, then monetization, then ads on proven organic videos | — |

Don't spend the video audience before the D30 curve flattens. The founder's earlier
apps were leaky buckets, and this is the main lesson from them.

Waitlist benchmarks are noisy: vendors cite about 11% signup. [EST]
[link](https://getlaunchlist.com/tools/waitlist-benchmark)
Sean Ellis test: [link](https://www.startuparchive.org/p/sean-ellis-on-how-to-tell-if-you-have-product-market-fit)

## 10. Retention benchmarks

- **Category curve:** broad H&F D1 is about 20–27%, D7 about 7%, D30 about 3%. Better apps reach D7 of 15–20% and D30 of 8–12%. [EST] [link](https://www.businessofapps.com/data/health-fitness-app-benchmarks/)
- **Six-month paid retention:** 40% is good and 70% is great. [link](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)
- **Duolingo:** the first week is the most fragile. The widely repeated "widget +60%" figure is **unverified**. [link](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- **Push opt-in:** about 44.5–54% on iOS. [link](https://www.airship.com/resources/mobile-app-push-notification-benchmarks-2026/)
- **North-star metric:** blocking still active at D7 and D30, not app opens.

## 11. MRR estimate

This is a model, not a forecast.

**Formula:** MRR ≈ monthly installs × paid % × revenue per payer per month × months accumulated.

**Inputs:**

- **Paid %:** 2–3% with freemium, about 10% with a hard paywall.
- **Revenue per payer:** about $4–5/month blended; most payers take annual at about $40/yr.
- **Install rate:** 1–5 installs per 1,000 views. This is an **assumption**; no reliable source exists.

| Scenario | Installs/mo | Paid % | New payers/mo | MRR at month 12 |
|---|---|---|---|---|
| Fizzles | 2,000 | 3% | 60 | ~$2–3K |
| Solid | 10,000 | 4% | 400 | ~$15–20K |
| Breakout | 50,000 | 5% | 2,500 | ~$100K+ |

**Central guess [OPINION]:** about $2K–20K MRR by the end of year one if it works;
$100K+ is possible but not the base case.

**Comparisons:**

- Quittr reached about $250K MRR in 4–6 months. [EST]
- Opal is at about $830K MRR after years. [EST]
- Existing walk-to-unlock apps probably make very little.

**Caveats:**

- A single viral spike isn't recurring revenue; installs need to arrive every month.
- Only about 25% of annual subscribers renew, which creates a cliff at month 12.
- Retention multiplies every other input in the model.

## 12. Claims to avoid in marketing

- Health, fitness or mood benefits from 200 steps.
- Blue light as the reason to block.
- The retracted Ariely & Wertenbroch 2002 paper.
- Market-size reports.
- Dumbphone-growth percentages.
- "53% have revenge bedtime procrastination."
- That morning scrolling *causes* anxiety.
- That Trundle reproduces the results of blocking studies.
- Automatic unlock, unless it has been proven on a device.

**Safe to use:**

- Pew's 70% and 1-in-4 figures.
- AASM's 50% of adults use a screen in bed daily.
- AASM's 93% of Gen Z stayed up late because of social media.
- The one sec 37% reduction, described as research on friction.
- The NSF consensus that content, not light, is the problem.
- Allcott's 31% self-control estimate.

## 13. Hard paywall analysis

Added September 24, 2026. The user wants a paid app with a hard paywall. This
section reuses the benchmarks in sections 7 and 8; no new sources were added.
GAME_PLAN.md currently lists "hard paywall" under "Not part of the current plan",
so it needs updating if this is adopted.

**The numbers favor a hard paywall:**

| Metric | Hard paywall | Freemium |
|---|---|---|
| Downloads that pay by day 35 | 10.7% | 2.1% |
| Revenue per install at day 60 | $3.09 | $0.38 |

- At about $3 per 1K views for niche creators, a hard paywall makes paid creator
  distribution profitable, and freemium doesn't.
- Quittr, the closest analog (a blocker-style app for a niche), used a quiz, a hard
  paywall and paid creators to reach about 25% download-to-paid. [EST]

**Why the category still has an opening:**

- Most blockers are freemium or one-time hardware, and they are framed around
  all-day productivity.
- The paid winners (Quittr, Cal AI, Unrot) won on **niche identity, quiz
  onboarding and distribution**, not on features or mascots.

**Opportunities, ranked [OPINION]:**

1. **Own "revenge bedtime procrastination."** It's a named, TikTok-native identity
   problem. Sleep apps (Calm, Rise) don't block, and blockers don't own the night.
2. **Nights only means less reactance.** Blocking only during a window users agree
   with should hold better than all-day blocks. That is structural retention, which
   is what paid renewals need.
3. **Reliability.** Silently failing blocks are the category's top complaint. Blocks
   that never fail win the reviews.
4. **The walk-to-unlock niche has no leader.** The apps in it are small, poorly
   reviewed and priced weekly.
5. **Fair pricing as a trust signal.** Annual pricing with a trial, and no weekly
   plans. Weekly pricing draws complaints in this niche (StepTok).

**Onboarding shape (the Quittr pattern, adapted):**

1. A quiz: what time you actually fall asleep, and the apps that keep you up.
2. A personal cost: hours lost per week, based only on the user's own answers.
   Don't invent statistics.
3. Set bedtime and pick apps: the user invests effort before the paywall.
4. Hard paywall with a trial that covers several real nights and mornings.

**Risks:**

- Opal could add steps.
- Creator CPMs rise as more apps copy this playbook.
- About 25% annual renewal creates a month-12 cliff.
- The Family Controls entitlement and device reliability remain the gating
  technical risks (section 5).

## 14. Correction: Opal already does sleep

Added September 24, 2026. The competitor table in section 3 missed this.

**What Opal Sleep does** (launched January 30, 2026, iOS only, **off by default**):

- **Sleep Assist:**
  - Off
  - Wind Down: "make it harder to use apps… but you're still in control"
  - Full Assist: blocks all apps at bedtime except allowed ones; "the only way to
    exit is to use your Emergency Pass"
- **Morning Assist:**
  - Off
  - Slow Uplift: reminders during the first 30 minutes after waking
  - Full Assist: blocks all apps for **one hour** after waking. Exit is by
    Emergency Pass only.
- Also includes soundscapes, guided meditation, bedtime stories, and an Opal Score
  that combines Sleep, Focus and Rest.
- The Emergency Pass is buried at Profile > Settings > FAQs > Advanced Features.
- Pricing (App Store listing): $4.99–$9.99/week, $19.99/month, $49.99–$99.99/year.
  Rated 4.7 from 88K ratings.

Sources: [Opal help: Sleep Mode](https://opalapp.com/help/how-do-i-use-sleep-mode),
[Introducing Sleep](https://opalapp.com/blog/introducing-sleep),
[App Store](https://apps.apple.com/us/app/opal-screen-time-control/id1497465230).

**What is still different about Trundle [OPINION]:**

| | Opal Sleep | Trundle |
|---|---|---|
| Place in the product | One feature, off by default, inside an all-day focus app | The whole product |
| Morning unlock | Wait an hour, or use the Emergency Pass | Get out of bed: 200 steps |
| What it fixes | Screen time | Lying in bed scrolling, at both ends of the night |
| Tone | Clean, premium, neutral | A sassy voice people screenshot |
| Price | Up to $99.99/yr | Room for about $29.99–39.99/yr |
| Marketing | Focus and productivity | Revenge bedtime procrastination |

**Honest read:** the feature gap is now narrow. Opal could copy a step unlock in a
sprint. What stays defensible is the same list as section 4: niche positioning,
founder distribution, voice, price and reliability. The concept-video test in
section 9 is now the key experiment: do "I have to walk 200 steps to open TikTok"
videos get "what app is this?" comments from people who haven't found Opal Sleep?
