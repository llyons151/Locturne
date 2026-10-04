# Research track 2: platform, policy and market shifts that open first-mover windows (2025–2026)

Date: 2026-10-03. Researched for a solo, student, iOS-first Expo/RN dev who is building Locturne (AlarmKit + Screen Time). He grows apps through short-form video, is weak at retention and needs cash soon.

Evidence quality key:
- **A** = primary source (Apple, Google or Meta newsroom/developer docs, court filings, SEC).
- **B** = reputable press or a well-known industry data firm (MacRumors, 9to5Mac, TechCrunch, AppleInsider, RevenueCat, Superwall, Bloomberg, ABC).
- **C** = SEO blog, vendor marketing or unverified aggregator. Treat as a directional hint only.

---

## TL;DR ranking (best window for this founder first)

| # | Window | Open since | Crowding now | Likely window | Fit for him |
|---|---|---|---|---|---|
| 1 | **Free cloud LLM for small developers** (Apple Foundation Models on Private Cloud Compute, free under the Small Business Program and 2M downloads), plus on-device FM with image input | iOS 27, Sept 2026 | Low. It is weeks old and needs an entitlement request | ~9–18 months before "AI feature" stops being a differentiator | **High.** It removes the token-cost risk that kills cash-poor AI apps |
| 2 | **Siri AI + App Intents/App Schemas** (shipped 14 Sep 2026, English) | 3 weeks | Very low among indies; big apps (WhatsApp, Audible) first | ~6–12 months | **High as an add-on** to Locturne and every other app. Weak as a standalone app |
| 3 | **AlarmKit-based "accountability" apps** (non-sleep uses: meds, ADHD tasks, GLP-1 shot day, cooking/HIIT) | iOS 26, Sept 2025 | Medium in pure alarm/wake-up (Alarmy, Awake, AlarmK, RealAlarm, ToDo Alarm). Low in niches | Wake-up is closing. Niches are open ~12 months | **Medium-high.** He already has AlarmKit code to reuse |
| 4 | **Cheap real-time voice/vision AI** (Gemini Live ≈ $0.023/min, Flash-Lite $0.30/M input tokens) | 2025–26 price drops | High for generic companions and tutors. Lower for narrow, task-bound voice | Ongoing (a trend, not a window) | Medium. Viable only with a hard paywall and narrow use |
| 5 | **iOS 27 surface expansion**: Live Activities on Mac menu bar, CarPlay, Watch Smart Stack and landscape Dynamic Island; real-time widgets | Sept 2026 | Low | ~6–12 months | Medium. Cheap polish and "featured-ability", not a business |
| 6 | **HealthKit menopause/perimenopause types** (iOS 27) | Sept 2026 | Unknown or low for HealthKit-native indie apps (not verified) | ~12 months | Low-medium. Audience mismatch with his video audience |
| 7 | **US link-out payments** (0% Apple commission today) | May 2025 | Everyone can use it | Rate being set now. Apple proposes 5% for Small Business Program apps | **Low.** For a 15% Small Business Program dev, web checkout is roughly break-even |
| 8 | Age-verification laws, Australia's under-16 ban, school phone bans | 2025–26 | n/a | n/a | **Low.** These mostly create compliance work or B2B demand, not easy consumer apps |
| 9 | Meta glasses toolkit, Vision Pro, Android 17 AppFunctions | 2025–26 | Very low | Not monetizable yet | **Avoid for cash.** No public store (Meta), dead hardware market (AVP) |

---

## 1. Apple Foundation Models: free on-device and free cloud inference for small developers

**What it is**
- **iOS 26 (2025):** the Foundation Models framework gives Swift access to Apple's ~3B on-device model. It is free with no tokens, but needs an Apple Intelligence device (iPhone 15 Pro and later).
- **iOS 27 (WWDC, 8 June 2026):**
  - The framework becomes "a single native Swift API that supports more powerful on-device models with image input, support for server models, and the ability to build custom skills."
  - It can also route to Claude, Gemini or other providers.
  - **Small Business Program developers with fewer than 2M first-time downloads get free access to Apple Foundation Models on Private Cloud Compute (PCC).**
  - New Core AI framework for bring-your-own on-device models.
  - New Evaluations framework.
  - Vision integration (OCR, barcodes) and multimodal prompts. (A)
- **PCC rules:**
  - You must request an entitlement through a contact form.
  - It works only where Apple Intelligence is available.
  - TestFlight installs don't count toward the 2M limit.
  - If you cross 2M downloads, you get 6 months to migrate.
  - Apple's page publishes no rate limits or quotas. **Unknown: per-user quotas and latency.** (A)

**Evidence apps benefit**
- In Sept 2025 Apple published a newsroom roundup of FM-using apps, heavily indie: Stoic Journal, Smart Gym, Motivation, CellWalk, Essayist, OmniFocus and others. Being in an Apple roundup is the main proven visibility payoff. (B, MacStories)
- I found **no hard download or revenue case study** of an indie app that grew because of FM. The "first-mover" benefit is plausible but unproven.
- Apple's own App Store ecosystem release says 40+ of the top 100 apps in 2025 had consumer AI features, and those apps grew billings faster. (A, but that is correlation)

**Constraints**
- Device floor: Apple Intelligence devices only (iPhone 15 Pro and later).
- English-first: Siri AI isn't in the EU or China at launch, and Apple Intelligence regional rules apply.
- iOS 26 reached 79% of all iPhones by June 2026 (A/B, MacRumors/Apple). iOS 27 has only just shipped, so the iOS 27-only reachable base is small now but grows fast through early 2027.
- Expo path: `@react-native-ai/apple` (Callstack) wraps on-device FM for the Vercel AI SDK on iOS 26+ (B, Callstack/ai-sdk.dev). **Unverified: whether it supports the iOS 27 PCC/server model or image input yet.** He may need a small Expo native module in Swift. He has Swift skills, so this is doable.

**Crowding**
- PCC is weeks old and gated by an entitlement request, so few indies have shipped on it.
- On-device FM features already appear in hundreds of apps (journaling, notes), so "uses Apple AI" alone is not novel.
- The window is in using *free cloud-grade* inference for features that previously needed a paid API: image understanding, longer reasoning, conversational coaching.

**Window length:** about 9–18 months. Apple tends to feature early adopters in its first year. After that it becomes table stakes.

**Ideas a solo Expo dev could ship in 4–8 weeks**
1. **Locturne add-on:** a morning briefing or a sassy "Loc" voice line generated per user, at zero inference cost. It ties into his voice-as-mascot direction.
2. **Photo-to-structured-data utility with a hard paywall**, for example:
   - snap a fridge or pantry and get a meal plan,
   - snap a gym machine and get its form cues,
   - snap a receipt and get a split bill.

   These previously cost $0.002–0.01 per call on GPT or Gemini. Now they are free under 2M downloads. Cal AI-style apps proved "camera → AI answer" converts on TikTok.
3. **A study app for students** (his own demographic): photo of notes → quiz/flashcards, fully on-device. This is a crowded category (Gauth, Quizlet), so it would need a sharp hook.
4. **A private journaling or "reflection" app** whose pitch is "AI that never leaves your phone." Privacy is a real wedge, but Stoic already does this, so the bar is higher.

Sources:
- https://www.apple.com/newsroom/2026/06/apple-aids-app-development-with-new-intelligence-frameworks-and-advanced-tools/ (A)
- https://developer.apple.com/private-cloud-compute/ (A)
- https://developer.apple.com/wwdc26/guides/ios/ (A)
- https://www.macstories.net/news/apple-highlights-apps-using-its-foundation-models-framework/ (B)
- https://www.callstack.com/blog/on-device-apple-llm-support-comes-to-react-native (B)
- https://www.macrumors.com/2026/06/09/ios-26-adoption-stats-wwdc/ (B)
- https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/ (A)

---

## 2. Siri AI + App Intents / App Schemas / View Annotations

**What it is**
- Siri AI shipped **14 Sep 2026**: personal context, onscreen awareness and multi-app actions, built on Apple Foundation Models developed with Gemini.
- Languages: English beta first. French, Japanese, Korean, Portuguese and Spanish follow in October 2026.
- Regions and devices: not in the EU or China at launch. Runs on iPhone 15 Pro, iPhone 16 and later. (A)
- iOS 27 developer side:
  - App Schemas: Siri reasons over your entities with no training phrases.
  - View Annotations API: map on-screen views to entities.
  - App Intents Testing framework.
  - Entity schemas feed the Spotlight semantic index. (A)
- Named launch integrations: WhatsApp and Audible now; Outlook, Notability and Tripsy coming. (A)
- Commentary claims that apps on SiriKit alone won't surface in Siri AI. (C)

**Evidence it drives growth:** none quantified. "App Intents are the new ASO" is a widely repeated claim (C, blakecrosley.com, techbetweenthelines.com) with **no empirical discovery data**. Treat it as a reasonable bet, not a proven channel.

**Crowding:** very low among indie apps three weeks in.

**Window:** 6–12 months, until intents become universal.

**Ideas:** mostly a feature layer rather than a standalone app.
- For Locturne: "Hey Siri, set my Locturne alarm for 6:30", "Siri, how did I do this week?", and a schema-conforming alarm entity. It is cheap, may win editorial attention, and makes a good short video ("I asked Siri to make sure I get out of bed").
- For any new utility: design the core action as an App Intent from day one.

Sources:
- https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/ (A)
- https://developer.apple.com/videos/play/wwdc2026/343/ (A)
- https://blakecrosley.com/blog/app-intents-are-apples-new-api-to-your-app (C)

---

## 3. AlarmKit (iOS 26) and "accountability" apps

**What it is**
- System-level alarms for third-party apps: they ring through Silent and Focus, show full-screen and on the Lock Screen, and appear in the Dynamic Island and on Apple Watch. It shipped Sept 2025. (A/B, MacRumors, WWDC25 session 230)
- iOS 27 added **no** notable AlarmKit or Screen Time API changes.
  - FamilyControls, DeviceActivity and ManagedSettings are unchanged. Long-standing blocker requests (reliable long-running monitoring, readable shield state, event-based unlocks) were not addressed. (C, habitdoom.com, consistent with Apple's guide not listing changes)
  - New APIs were Declared Age Range and PermissionKit (Ask to Browse), aimed at child accounts. (B, 9to5Mac)

**Who is in it**
- **Awake**, by Leo Mehlig (maker of Structured, a large indie planner).
  - Launched 15 Sep 2025, iOS 26-only.
  - Features: missions, a morning briefing, app *blocking on wake*, sleep planning, and a planned step-based "Wake Up Check."
  - Pricing: $6.49/mo or $19.99/yr.
  - **This is Locturne's closest direct competitor and is backed by an existing big audience.** (B, TechCrunch)
- **AlarmK – Mission Alarm** and **RealAlarm**, both AlarmKit-native. (App Store listings)
- **ToDo Alarm**: every task is an alarm. (C, own blog)
- **AutoSleep** adopted it. Alarmy exists.
- ToDo Alarm's blog claims Things, Todoist, TickTick and Fantastical had **not** adopted AlarmKit as of its writing. (C)

**Reliability risk:** Apple developer forum threads report AlarmKit alarms failing after iOS 26.2 beta updates and intermittent late firing with dense scheduling (A, Apple dev forums). This is worth Locturne's attention: reliability is the product.

**Evidence of featuring or growth:** no download numbers found for any AlarmKit app. Awake got TechCrunch coverage, which is the main visible payoff.

**Crowding:** the wake-up/mission-alarm niche is **medium and rising**, now a year in. Non-sleep "must not miss" niches are still thin.

**Window:** the wake-up sub-niche is mostly gone for "first mover" positioning, so Locturne must win on its hook (out of bed, downstairs barometer, apps sleeping) rather than on AlarmKit itself. Adjacent niches stay open about 12 months.

**Ideas that reuse Locturne code (4–6 weeks each)**
1. **GLP-1 shot-day alarm and log.** A weekly injection alarm that rings through Silent mode, plus site rotation, dose log and side effects.
   - Shotsy is the leader: ~1M downloads, 250k MAU, $19.99–39.99/yr (C, aggregator blogs; not verified with Sensor Tower).
   - The category is crowded with trackers, so the hook would have to be "an alarm you can't miss."
2. **ADHD "can't-ignore" task alarms.** ToDo Alarm proves the concept, and big task apps haven't moved.
3. **Medication and caregiver alarms for older parents.** An aging-population angle, and AlarmKit rings even on Silent.
4. **Pomodoro or "phone-down" study timer** that blocks apps (Screen Time) and rings via AlarmKit. This fits a student audience and school phone-ban culture, and mostly reuses his blocking stack.

Sources:
- https://www.macrumors.com/2025/06/11/ios-26-third-party-alarm-apps/ (B)
- https://techcrunch.com/2025/09/15/awakes-new-app-requires-heavy-sleepers-to-complete-tasks-in-order-to-turn-off-the-alarm (B)
- https://todo-alarm.com/blog/ios-26-alarmkit-apps/ (C)
- https://apps.apple.com/us/app/alarmk-mission-alarm/id6772219821
- https://origin-devforums.apple.com/forums/thread/809398 (A)
- https://developer.apple.com/forums/thread/825427 (A)
- https://habitdoom.com/blog/ios-27-screen-time-changes (C)
- https://9to5mac.com/2026/09/14/heres-whats-new-with-parental-control-features-in-ios-27-ipados-27-and-macos-27/ (B)
- https://github.com/EugeneFinch/glp1-companion-benchmarks-2026 (C)

---

## 4. AI cost curve: real-time voice and vision now cheap

**Prices (official Gemini pricing page, fetched 2026-10-03; A)**
- **Gemini 3.8 Live:**
  - audio in $3/M tokens (≈ $0.005/min),
  - audio out $12/M (≈ $0.018/min),
  - so roughly **$0.023 per minute of two-way voice**.
- Gemini 2.5 Flash Native Audio: same audio rates.
- **Gemini 3.5 Flash-Lite:** $0.30/M input (text, image, video, audio) and $2.50/M output.
- OpenAI gpt-realtime-2.1 is about $0.06–0.10/min, and the mini about $0.02–0.05/min (C, forasoft/layer3labs; not checked against OpenAI's page).

**What this enables:** a 10-minute daily voice session costs about $0.23 on Gemini Live, or roughly $7/month per heavy user. That still needs a $9.99+/mo or a hard yearly paywall. Vision calls cost fractions of a cent, and become free under PCC if he stays on Apple's stack.

**Crowding**
- AI companions are saturated: companion app counts are reportedly up 700% from 2022 to mid-2025 (B, citing TechCrunch via PYMNTS). They also carry regulatory and press risk.
- Narrow, task-bound voice use cases are less crowded:
  - spoken alarm "interrogation" (Locturne: Loc asks you a question you must answer out of bed),
  - language *speaking* drills for one exam,
  - interview practice for students,
  - daily check-in calls for elderly parents. ElliQ's NY State pilot showed 94% of users reported feeling less lonely. (B, WTOP/AP)

**Window:** this is a trend, not a closing window. Prices keep falling.

**Ideas**
- Locturne "Loc talks back" premium tier.
- "Mock oral exam" coach for one exam type, for students.
- An elderly-parent daily voice check-in that alerts the adult child. The buyer is the adult child, but the go-to-market is harder for a TikTok-native founder.

Sources:
- https://ai.google.dev/gemini-api/docs/pricing (A)
- https://www.forasoft.com/blog/article/openai-realtime-api-pricing (C)
- https://wtop.com/news/2026/05/ai-care-companions-for-seniors/ (B)

---

## 5. iOS 27 system surfaces (Live Activities, widgets, Controls)

- iOS 27 Live Activities show in the Dynamic Island in portrait **and landscape**. The same activity can appear on the Lock Screen, StandBy, the Apple Watch Smart Stack, the **Mac menu bar** and the **CarPlay Dashboard**. (B/C, aggregated from search; consistent with Apple's guide)
- Home Screen widgets update in **real time** while the app is active.
- WidgetKit gains App Intent-driven customization and dynamic styling.
- A new **Now Playing** framework and a **Music Understanding** framework (on-device audio analysis across six dimensions) arrived. (A, WWDC26 iOS guide)

**Crowding:** low; most apps lag a year on these.

**Window:** 6–12 months.

**Ideas**
- Locturne: a bedtime countdown Live Activity that appears in StandBy, on the Watch and on the Mac menu bar.
- A morning "streak" widget.
- Music Understanding could power a niche "alarm that picks the right song section to wake you" feature. That idea is speculative.

Sources:
- https://developer.apple.com/wwdc26/guides/ios/ (A)
- https://richontech.tv/p/full-list-of-whats-new-in-ios-27 (C)

---

## 6. Health and wearables

**HealthKit (iOS 27)**
- New read/write types: `MenopausalState` (none / perimenopause / menopause) and `BleedingAfterMenopause`.
- Workout heart-rate zones become first-class (`HKWorkoutZoneConfiguration`).
- The Health app adds perimenopause/menopause tracking for ages 40+. (B, MacRumors; react-native-healthkit PR #360 already adds the types, so Expo access is straightforward)
- **Watch out:** Apple's own Health app now covers basic menopause tracking, so a standalone tracker competes with the system.

**Camera nutrition (iOS 27)**
- Visual Intelligence food photos give qualitative rankings only and do not sync to Health.
- Nutrition-label scanning writes to HealthKit.
- This is a first-party feature, not an API, and **it does not kill Cal AI-style apps** (C, sahha.ai).

**GymKit on iPhone** needs AirPods Pro 3 plus compatible equipment, so the niche is tiny. (C)

**Apple Watch (watchOS 27)** gets Foundation Models, Vision and Core AI. (B, WWDC26 watchOS lab) This gives on-wrist AI for small utilities. Watch apps monetize poorly on their own.

**Vision Pro:** demand is weak. Reports describe a retreat, and the M5 refresh had minimal sales impact. **Avoid.** (B, 9to5Mac, PYMNTS)

**Meta Ray-Ban Display / AI glasses**
- The Device Access Toolkit (iOS and Android SDK) plus web apps are in developer preview.
- Distribution is capped at 100 testers or password-protected URLs, with **no public store yet**.
- Toolkit 1.0 "begins rolling out September 30, 2026," but public distribution is partner-gated and **iOS App Store publishing is blocked**. (B/C, gHacks, vr.org)
- Meta committed about $2M in developer grants.
- Connect 2026 coverage emphasized hardware and streaming partners, not an app store. (B, Engadget)
- **Verdict:** a genuine first-mover space with zero monetization path today. Possibly worth a weekend demo for short-form content, not for cash.

**Wearable rings:** not researched in depth. Oura has an API, but the ecosystem is small. No evidence found of an open opportunity.

Sources:
- https://www.macrumors.com/2026/06/08/ios-27-adds-perimenopause-and-menopause-tracking/ (B)
- https://github.com/kingstinct/react-native-healthkit/pull/360 (A, code)
- https://sahha.ai/blog/ios-27-health-fitness-developers/ (C)
- https://www.ghacks.net/2026/05/18/meta-opens-ray-ban-display-glasses-to-third-party-developers-through-wearables-toolkit/ (B)
- https://vr.org/articles/fall-glasses-platforms-stores-without-hardware-sdk-status-2026 (C)
- https://www.engadget.com/2267230/everything-announced-at-meta-connect-2026/ (B)
- https://9to5mac.com/2026/01/02/m5-vision-pro-launch-likely-made-minimal-sales-impact-report/ (B)

---

## 7. Payments and policy

**US anti-steering (Epic v. Apple)**
- Since the 30 Apr 2025 contempt order, US apps may link to web checkout, and Apple currently charges **0%** on those purchases.
- The Ninth Circuit upheld contempt but allowed Apple a cost-based commission, now being set by Judge Gonzalez Rogers.
- On 13 Aug 2026 Apple proposed **15% standard, 10% for partner programs and renewals, and 5% for Small Business Program apps**.
- Justice Kagan denied Apple's stay on 14 Aug 2026.
- SCOTUS granted cert (30 Jun 2026) on the contempt legal standard, with argument in the October 2026 term. (A, Apple 10-Q; B, MacDailyNews, AppleInsider)

**Conversion data**
- RevenueCat: IAP converted about 28% vs about 18% for link-out (B, RevenueCat via Daring Fireball, May 2025).
- Superwall: link-out showed −11.9% initial conversion but +19.85% net proceeds for 30%-fee apps. **For Small Business Program (15%) apps, net proceeds were −1.3%** at observed conversion; they turn positive only if trial-to-paid improves. (B, Superwall)

**Implication:** for a sub-$1M developer, web checkout is roughly neutral today. If Apple's 5% Small Business Program link-out rate is adopted, it becomes slightly negative to neutral. The real upside is **web-to-app funnels from TikTok bios**: users pay on the web before installing, which also captures email for retention. That suits his acquisition channel, but it is an optimization, not a window.

**EU DMA**
- New EU terms take effect **1 Oct 2026**:
  - IAP 26%, or 15% for Small Business Program and renewals after year one;
  - alternative payment processing 20% / 10%;
  - link-out 15% / 10%;
  - 5% Core Technology Commission for alternative marketplaces or web distribution.
- Minor relevance to him. (B, mjtsai/Apple developer page)

**Google Play (US)**
- After Epic v. Google, external links and alternative billing are allowed.
- Fees are 10% for auto-renewing subscriptions and 20% for other purchases on external links, reportable from 1 Oct 2026. (C, aggregators; verify on Play Console help)
- Android developer verification is required in Brazil, Indonesia, Singapore and Thailand from Sept 2026, globally from 2027. It costs $25, the same as Play registration. (B/C)

**Age-verification laws**
- **Texas SB2420**:
  - enjoined Dec 2025,
  - the Fifth Circuit stayed the injunction (28 May / 5 Jun 2026), so it is in effect,
  - SCOTUS declined to block it in July 2026.
- **Utah** delayed to 6 May 2027.
- **Louisiana** effective 1 Jul 2026. (B, law-firm alerts, CCIA)
- Apple's Declared Age Range API returns age bands. Under-18 Texas accounts go into Family Sharing with parental approval of downloads and purchases. (B, 9to5Mac, TechCrunch)
- **Effect on him:** an extra compliance step, and minors in Texas need parental approval for purchases. That adds friction for student-targeted paid apps. It creates little consumer-app demand.

**Australia under-16 social ban (10 Dec 2025)**
- Alternatives spiked briefly: Lemon8 #1, Yope +100k AU users. (B, Bloomberg, ABC)
- The government report found "no meaningful shift": teens returned to TikTok and Instagram, and under-16 use is now *rising* again. (B, France24/AFP)
- The window was about two weeks and is closed.

**School phone bans**
- 38 states plus DC require bans or restrictions as of June 2026. (B, Newsweek/Ballotpedia)
- Demand flows to B2B pouch contracts (Yondr-style, $5k–$5M per district), not consumer apps.
- The consumer angle is cultural tailwind for "phone-less" messaging. Opal says students are two-thirds of its daily active users after it went freemium. (B, RevenueCat Sub Club)
- This supports Locturne-style positioning rather than a new app.

Sources:
- https://www.sec.gov/Archives/edgar/data/0000320193/000032019326000020/aapl-20260627.htm (A)
- https://macdailynews.com/2026/08/14/u-s-supreme-court-clears-path-for-app-store-commission-showdown-as-apple-must-defend-its-rates-in-lower-court/ (B/C)
- https://appleinsider.com/articles/26/04/29/app-store-policy-must-change-as-epic-convinces-us-circuit-court-to-reverse-stay (B)
- https://superwall.com/blog/initial-data-is-in-app-to-web-conversion-rates-after-the-app-store-ruling (B)
- https://daringfireball.net/linked/2025/05/15/revenuecat-external-purchase-report (B)
- https://mjtsai.com/blog/2026/08/18/new-eu-app-store-terms-to-comply-with-dma/ (B)
- https://developer.apple.com/support/dma-and-apps-in-the-EU (A)
- https://taylancetech.com/blog/google-play-2026-changes-app-store-fees-third-party-stores (C)
- https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/ (B)
- https://ccianet.org/news/2026/07/supreme-court-opts-not-to-intervene-and-block-a-texas-app-store-law-that-likely-violates-first-amendment/ (B)
- https://www.wiley.law/alert-Key-Developments-With-State-App-Store-Accountability-Acts-as-Texas-Act-Takes-Effect (B)
- https://9to5mac.com/2025/11/04/app-store-texas-sb2420-new-apis/ (B)
- https://www.bloomberg.com/news/articles/2025-12-09/alternative-social-media-apps-surge-as-australia-teen-ban-starts (B)
- https://www.france24.com/en/live-news/20260430-no-meaningful-shift-from-social-media-sites-after-australia-teen-ban-govt-report (B)
- https://www.newsweek.com/map-shows-us-states-with-school-phone-bans-in-2026-11335155 (B)
- https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026 (B)

---

## 8. Android 17

- AppFunctions exposes app capabilities as tools for an on-device "Android MCP."
- Also new: App Bubbles, cross-device Handoff, mandatory adaptive layouts at API 37, a Contacts Picker and an EyeDropper API.
- Google moved to a continuous Canary channel. (A, Android Developers Blog)
- Low crowding, but he is iOS-first and his blocking stack (Screen Time) has no Android parity. **Not a priority.**

Sources:
- https://android-developers.googleblog.com/2026/06/Android-17.html (A)
- https://developer.android.com/about/versions/17/features (A)

---

## Recommendations for this founder (cash-first)

1. **Don't chase a new platform for its own sake.** Finish Locturne. Its AlarmKit "first mover" edge is already spent (Awake, AlarmK, RealAlarm), so its hook must carry it.
2. **Add the free windows to Locturne before launch (mid-Nov):**
   - App Intents / App Schemas for Siri AI,
   - a PCC/on-device FM "Loc" morning line,
   - a Live Activity bedtime countdown on Watch/StandBy.

   Each is a few days, each is an Apple-feature-able story, and each is a short-video hook ("Siri can't let me snooze").
3. **Request the PCC entitlement now.** It's free and gated by a form.
4. **Next app candidate (4–8 weeks):** a camera → AI-answer utility with a hard paywall, built on free PCC/on-device FM so the margin is about 85% with no inference bill. Pick a topic that films well on TikTok. Second choice: an AlarmKit "can't-miss" alarm for a narrow high-intent niche (GLP-1 shot day, or a phone-down study timer for students) that reuses Locturne's code.
5. **Ignore for now:** Meta glasses (no store), Vision Pro, age-verification "opportunities", web checkout (neutral at 15%), and AI companions (saturated and risky).

## Open uncertainties / not verified

- PCC rate limits and quotas; whether `@react-native-ai/apple` supports iOS 27 server models or image input.
- iOS 27 adoption share (it shipped about 3 weeks ago).
- Download or revenue numbers for any AlarmKit or FM app; no Sensor Tower or Appfigures data was accessed.
- Google Play external-link fee figures and Shotsy metrics come from C-grade aggregators.
- Live Activities on Mac/CarPlay comes from secondary summaries; confirm in Apple's ActivityKit docs.
