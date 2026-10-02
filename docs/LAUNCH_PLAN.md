# Launch plan: features first, then UI

Written October 1, 2026. This is the full path from today to a January 2027
launch, in build order: native engine first, then money and data, then UI, then
beta and store. It also covers the new **wake-up methods** idea.

It builds on [GAME_PLAN.md](../GAME_PLAN.md) (still the source of truth),
[STRATEGY_DEEP_DIVE.md](STRATEGY_DEEP_DIVE.md), [STAND_OUT_ANGLES.md](STAND_OUT_ANGLES.md)
and [TODO.md](TODO.md). Two research passes were run for it on October 1 (wake-up
methods, and launch readiness); their sources are at the end. Dates and odds are
**[OPINION]**. Nothing here changes GAME_PLAN until you approve the decisions in
section 1.

## 0. The plan in ten lines

1. **Oct 1–14: device spike.** First EAS dev build; prove the bedtime lock holds
   with the app closed, the morning unlock works, and revocation is detected.
2. **Oct 15 – Nov 15: the engine.** Scheduling, a method-agnostic unlock engine,
   steps + scan-a-code methods, passes, emergency unlock, diagnostics.
3. **Nov 1–20: money and data.** RevenueCat, PostHog, the event list.
4. **Nov 10 – Dec 10: UI.** Wire onboarding to the real APIs, then home states,
   the wake-up screens, shield text, settings, share card, notifications.
5. **From Nov 20: internal TestFlight**; external beta from Dec 1.
6. **Mid-Nov: submit a build to App Review early** to flush out Screen Time
   rejections, and nominate the app for featuring.
7. **By Dec 18: 1.0 approved and on manual release.** Store page, Custom Product
   Pages and a New Year in-app event ready; pre-orders open.
8. **Jan 2–5, 2027: launch** with daily videos.
9. **February: v1.1** (AlarmKit alarm, widget, morning Live Activity, the next
   wake-up method).
10. **Marketing runs the whole time**, starting this week, because views decide
    the outcome more than any feature.

## 1. Decisions you need to make

| # | Decision | Recommendation |
|---|---|---|
| D1 | Adopt **wake-up methods** (section 2)? | Yes, as "ways to prove you're up", not an alarm-mission menu. v1 ships **Go downstairs** (the hero, emphasized; chosen by the user Oct 1), **Steps** and **Scan your code**. |
| D2 | Allow camera-based methods (push-ups, photo match, sunlight)? They conflict with GAME_PLAN's "no AI/photo verification of goals". | Not for v1. Decide on **push-ups** (on-device pose counting) after launch data. Keep photo-judging banned. |
| D3 | NFC (banned in GAME_PLAN)? | Keep it banned. A printable QR code does the same job for free. |
| D4 | Two-part wake-up against getting back into bed (100 steps, then 100 more ~10 min later)? | Build it as a setting, off by default, and test it in the beta. Nothing else in the category fixes back-to-bed. |
| D5 | Launch price | $39.99/yr first, test $59.99 later (STRATEGY_DEEP_DIVE §2). Anchor is $59.99; Clockblock is $5.99 one-time. |
| D6 | App Store category | **Health & Fitness**: Erly and Wayk are there, and it gets the New Year lift. Opal and Brick are in Productivity. |
| D7 | Launch date | Jan 2–5, 2027, with February as the no-shame fallback. |

## 2. Wake-up methods

### The idea

"How do you want to prove you're up?" A few distinct ways to wake Loc, each with
its own lines. It's useful because people's homes differ (stairs, small
apartments, a coffee machine they always walk to), and it multiplies marketing:
every method is its own video series for the same promise.

### What the research says

- **The method must prove you left bed.** Alarmy's most-used missions (math,
  shake, memory) can all be done lying down. They suit oversleepers, not
  Locturne's user, who is awake and scrolling.
- **The viral winners each had one hero method** shown on camera: push-ups for
  Erly, Wayk (25M TikTok views and #15 on the App Store in 30 days) and
  Pushscroll (one 16M-view video), and grass for Touch Grass. Variety helps
  through more video formats, not because users want a menu.
- **No published data shows that more methods improve retention.** Alarmy's own
  answer to users getting used to a method is to chain methods. Choice overload is
  real exactly when a new user doesn't know what will work. So: pre-select a
  default and offer few options.
- **Real users found location the most dependable.** One writeup found math,
  steps and shake all failed them; a photo of the fridge worked. A barcode or QR
  code gives the same "go to the kitchen" proof without AI.
- **iOS can't detect "a different room"** from Wi-Fi strength (Apple DTS: no
  supported API). A code that lives in that room is the practical room check.

### The menu

| Method | Proof | Build cost | Cheat risk | Video hook | When |
|---|---|---|---|---|---|
| **Walk it off** (200 steps) | CMPedometer since morning start | Low; partly done | Medium (shaking); anti-shake check | "I have to walk 200 steps before TikTok works" | **v1, default** |
| **Scan your code** (QR from the app, or any product barcode the user registers, kept in another room) | `expo-camera` barcode scan | Low | Medium (photo of the code); per-user QR, product barcodes harder to copy | "The code lives on my coffee machine" | **v1**; also the accessible alternative |
| **Go downstairs** (≈3 m altitude change) | Barometer `relativeAltitude` (not `floorsAscended`, which is unreliable) | Low–medium | Hard to fake from bed | "I have to go downstairs before Instagram works" | **v1, the hero method** (user's pick, Oct 1). See [DOWNSTAIRS_METHOD.md](DOWNSTAIRS_METHOD.md) |
| **Push-ups** (on-device pose count) | Vision body pose or a VisionCamera pose plugin | High (tuning) | Low with camera | Proven: the category's biggest videos | After launch, needs D2 |
| Photo matched to a reference spot | Vision feature prints, on-device | Medium | Medium | "Prove you're in the kitchen" | Only if the photo ban is lifted |
| Sunlight / outside photo | Camera + scene labels | Medium | Medium; fails before sunrise | "Touch grass" | Only if the ban is lifted |
| **Avoid:** math, memory, typing, shake, saying a phrase | n/a | n/a | Can be done in bed | Weak for this audience | Never as a gate |

### How it fits the product

- **The promise doesn't change:** "your apps don't wake up until you get up". The
  methods are only different ways to prove it.
- **Onboarding:** one yes/no screen after `wake`: "Are there stairs between your
  bed and your coffee?" Yes selects **Go downstairs**, no selects **Walk it off**,
  and a small link opens the other ways. Details in
  [DOWNSTAIRS_METHOD.md](DOWNSTAIRS_METHOD.md) §3. Changing it later follows the
  next-bedtime rule.
- **Loc has lines for each method** ("Scan the coffee machine. Yes, the actual
  one."). This is where variety pays off: new lines, not just a new sensor.
- **Optional hard mode** (later, opt-in only): chain two methods. Never as a
  penalty.
- **Accessibility:** Scan covers users who can move a short distance but can't do
  200 steps. Passes and the emergency unlock remain for everyone else.
- **Marketing:** each method gets its own 5–10 video series and its own Custom
  Product Page (section 7), so you can see which one sells.

## 3. Phase 0: device spike (Oct 1–14)

Already set up: `react-native-device-activity` 0.6.1, the three extension
targets, EAS profiles and the Screen Time lab screen ([DEVICE_SPIKE.md](DEVICE_SPIKE.md)).
Nothing has been compiled yet.

1. Tick Family Controls (Distribution) on **all four** bundle IDs. App Review has
   an unresolved 2026 issue where builds get flagged for Screen Time use without
   the entitlement, and the request is per bundle ID.
2. Run the first development build and the lab test script.
3. Prove the GAME_PLAN Step 1 gates: a scheduled lock holds 3+ nights with the app
   closed; 200 steps unlock it; revoked access is detected.
4. Learn the platform's limits early:
   - **A shield button can't open your app** (no API; the library's `openApp`
     does nothing). Test sending a local notification from the ShieldAction
     extension instead ("Tap to start your walk").
   - Calling `startMonitoring()` on an already-monitored activity fires
     `intervalDidEnd`, which can re-block or unblock unexpectedly.
   - The monitor extension has about 6 MB of memory. Keep it to: read the App
     Group, decide, write the shield, exit.
5. **Background unlock tests** ([BACKGROUND_UNLOCK.md](BACKGROUND_UNLOCK.md) §5),
   first of all: does CoreMotion (pedometer history, barometer) work inside the
   ShieldAction extension? If yes, "I'm up" on the shield unlocks without the app.
6. Patch the known library crash (issue #96: an invalid base64 selection
   crash-loops the app and extensions) with `patch-package`, or validate before
   writing.

**Exit:** all three gates pass. If not, stop and redesign before any UI work.

## 4. Phase 1: the engine (Oct 15 – Nov 15)

Build the whole product with ugly UI first. Each item is done when it works on
your phone with the app closed.

### 4.1 Scheduling and lock reliability
- Bedtime schedule per weekday, chained DeviceActivity intervals under ~45 min.
- **Redundant locking:** apply shields in the monitor extension at schedule start,
  again whenever the app opens (re-checked from timestamps), and never rely on a
  single callback. Shields persist through reboot and force-quit, so locking early
  is safe; the **morning unlock is the critical path**.
- Settings changes apply from the next bedtime (already in `lock-state.ts`).
- Always-blocked list, which wins over everything.
- Use `shield.applications` / `applicationCategories`, **not**
  `blockedApplications`, which has been rejected under 2.5.1.

### 4.2 Unlock engine (method-agnostic)
- Extend `lock-state.ts` so the morning gate is satisfied by a **proof** from any
  method (`steps`, `scan`, later `altitude`, `pose`), plus passes and the emergency
  unlock. Adding a method then never touches the lock rules. Keep the timezone
  sweep tests passing.
- **Steps:** on open, query CMPedometer history from the morning start so steps
  walked with the app closed count; live updates only while open. Light anti-shake
  check (cadence vs accelerometer).
- **Scan:** register a code during setup (print or show a per-user QR, or scan any
  product barcode), then match it in the morning.
- **Two-part wake-up** behind a setting (D4).
- **Passes:** a monthly allowance with a short delay and a "go back to sleep"
  button in front (one sec found the dismiss button does the work).
- **Emergency unlock:** always available and deliberate; never clears the
  always-blocked list.

### 4.3 Honest status and diagnostics
- Detect revoked Screen Time access on every open and say so plainly.
- **Extension heartbeat:** each extension writes a small ring-buffer log to the App
  Group (lock applied, interval started/ended, errors). The app reads it and
  uploads it. This is your only window into the extensions when building on Linux.
- Nightly self-check: did tonight's lock actually apply?
- A hidden diagnostics screen (auth status, schedules registered, last heartbeat)
  for beta testers to screenshot.
- This also powers the weekly "your lock held 7 of 7 nights" report
  ([STAND_OUT_ANGLES.md](STAND_OUT_ANGLES.md) angle 3).

### 4.4 Notifications
- Morning start ("Apps are asleep. 200 steps."), bedtime warning, shield-tap
  notification, day-5 trial reminder, revoked-access alert.
- Time-sensitive interruption level for the bedtime and morning ones; at most ~2 a
  day. Ask for permission after the first successful night, not at install.

## 5. Phase 2: money and data (Nov 1–20)

- **RevenueCat:** annual with a 7-day trial + monthly. Multi-plan layout, **no
  trial toggle** (rejected since January 2026), billed price most prominent,
  Terms/Privacy links on the paywall itself. Restore. Exit-offer arms via remote
  config.
- **The lock arms only after purchase** (GAME_PLAN).
- **PostHog** (free tier: events, flags, surveys, error tracking) in the app only,
  never in extensions.
- **Events:** onboarding step views, Screen Time auth granted/denied, apps selected
  (count only), method chosen, paywall viewed, trial started; `lock_applied` (from
  the heartbeat), `morning_unlock_started`, steps/scan progress, `unlock_completed`
  (minutes from morning start), pass used, emergency unlock, access revoked.
- **Key activation metric:** the share of trial starters who complete a first
  morning unlock. Deliver it inside the trial.
- **Attribution:** "How'd you find me?" in onboarding (already built), plus one
  Custom Product Page URL per video angle.
- **Privacy:** App Privacy label (RevenueCat needs Purchase History, plus User ID if
  set), `NSMotionUsageDescription`, camera usage string for Scan, privacy manifest.
  Make all three declarations match; mismatches were the main review friction for
  one shipped blocker.

## 6. Phase 3: UI (Nov 10 – Dec 10)

Most visual work exists from onboarding. This phase wires it to real APIs and
builds the screens the engine needs.

1. **Onboarding, wired:** Apple's picker (the "Done" button disabled until at
   least one app is picked; one shipped blocker lost 35% of users who granted
   access but picked nothing), real permission prompts, StoreKit prices, the
   wake-up method screen, "Armed" shown only once tonight's schedule is confirmed.
   The open fixes in TODO §4 (morning-first quiz opener, end on tomorrow morning).
2. **Home states:** night, morning (locked, with progress), day.
3. **Wake-up screens:** the downstairs screen (Start, live height meter, "walk
   200 steps instead" link); the live walk with Loc's lines; the scan screen.
4. **Shield:** small icon plus his line as the title, per state.
5. **Passes / emergency / can't-sleep path.**
6. **Settings:** schedule, both lists, method, step target, with the
   next-bedtime note.
7. **Morning share card** and the weekly report.
8. **App icon and splash** (the template ones are still in `app.json`).
9. VoiceOver pass on a real device.

Design rules stay: Nocturne direction, no glow, no raw AI mascot art.

## 7. Phase 4–5: beta, review and the store (Nov 20 – Dec 18)

### Beta
- **Internal TestFlight first** (up to 100; they must be on your App Store Connect
  team). A known bug made shields silently fail for *external* testers, so
  compare the two groups and use the diagnostics screen.
- External beta from Dec 1 with 100–300 waitlist users.
- Gates (shortened to D14 for January): ≥30% still have blocking active at D14,
  fewer than 1 in 50 nights with a missed lock, trial-to-paid tracking.

### App Review
- **Submit an early build in mid-November**, even if unfinished in the UI, to
  surface Screen Time entitlement problems while there's time.
- Review notes: explain the flow, attach a device screen recording, and give the
  reviewer a way to see a shield within 2 minutes of setup (they can't wait for
  bedtime or walk 200 steps).
- No "impossible to bypass" or "guaranteed" claims (2.3.1); no competitor names in
  keywords.
- **Have 1.0 approved and on manual release by Dec 18.** Review slows around
  Dec 23–27.

### Store page
- **Title / subtitle direction:** "Locturne: Wake Up & App Blocker", with the
  subtitle on "get out of bed" or "walk to unlock". "Get out of bed", "stop
  doomscrolling" and "walk to unlock" have weak competition; "alarm clock" and
  "screen time" are brutal. Check volumes with Astro or Apple Ads before deciding.
- Screenshots: the first three decide installs; 3–7 word captions.
- **Custom Product Pages:** one per video angle (doomscroll in bed, can't get up,
  walk to unlock, scan your coffee machine). Up to 70 allowed, and they can rank
  for keywords.
- **In-app event:** "New Year 30-Morning Challenge" for January.
- **Featuring nomination** in App Store Connect by mid-November (Apple suggests up
  to 3 months ahead).
- **Pre-order** so December videos turn into launch-day installs.
- Trademark check (USPTO class 9) and social handles.

## 8. Marketing alongside the build

| When | What |
|---|---|
| This week | Waitlist page on Cloudflare Pages (TikTok blocks App Store links in personal bios). First 5 concept videos. |
| Oct | 10+ videos on the two lead hooks plus "Awake isn't the problem. Getting up is." Measure sign-ups per 1K views per hook. |
| Nov | Method series: "walk it off" and "scan your coffee machine" videos. Build-in-public clips. |
| Dec | Pre-order push. Line up 5–10 niche creators at $2–3 CPM (the Erly playbook) for January. |
| Launch week | Daily videos on 2–3 accounts, waitlist email with a CPP link, creators go live. |

Rating prompt after the first successful morning, never in onboarding.

## 9. After launch (February onward)

- **AlarmKit alarm** as the wake trigger, with its "open app" button going straight
  to the walk screen. Don't tie the unlock to dismissing the alarm: `stopIntent`
  reportedly doesn't fire on some dismissals.
- **Morning Live Activity** ("137 / 200 steps · apps asleep"). Morning only; Live
  Activities cap at 8 hours, so an overnight one won't work.
- **Streak widget.**
- **The next wake-up method**, picked by which video series converted best:
  push-ups if D2 says yes.
- Price test ($39.99 vs $59.99), then the other A/B tests in TODO §8.
- Buddy mode, naps, the opt-in study dataset.

## 10. Risks, ranked

1. **The lock isn't reliable** (Screen Time bugs, extension crashes). Mitigation:
   spike first, redundant locking, heartbeat diagnostics.
2. **Not enough views.** Mitigation: videos from this week, and kill hooks that
   don't produce sign-ups.
3. **App Review delays around Screen Time.** Mitigation: early submission in
   November, entitlement on all four IDs.
4. **The schedule slips** (exams, Linux debugging). Mitigation: cut Scan and
   the share card before cutting reliability work; February is fine. Downstairs
   stays: it's the hero method.
5. **A competitor gets the viral moment first.** Mitigation: speed and the voice,
   not more features.

## 11. What's cut from v1

Push-ups and any photo methods, NFC, AlarmKit, widgets, Live Activities, buddy
mode, naps, stats, Android. Each is either after launch or needs a decision.

## Sources

**Wake-up methods**
- Alarmy missions and popularity: <https://alar.my/en/blog/how-to-choose-alarmy-mission>, <https://alar.my/en/blog/alarmy-wake-up-mission>, <https://alar.my/en/blog/alarmy-global-viral-videos-2>
- A user for whom only a location photo worked: <https://technicallychallenged.substack.com/p/how-i-finally-tricked-myself-into>
- Erly: <https://superframeworks.com/case-study/erly>
- Wayk, 25M views in 30 days: <https://read.first1000.co/p/how-an-alarm-app-got-25-million-views>
- Pushscroll: <https://superwall.com/blog/our-app-makes-usd30k-month-profit-using-this-simple-strategy-copy-us>
- Touch Grass: <https://techcrunch.com/2025/03/17/this-app-limits-your-screen-time-by-making-you-literally-touch-grass/>
- Flow complaints: <https://malwaretips.com/blogs/flow-alarm-clock-scam-or-legit-the-49-nfc-dock-flow-trial-and-app-problems-explained/>
- BedLock: <https://www.producthunt.com/p/bedlock/bedlock-2>; wakn up: <https://hunted.space/product/wakn-up>
- Expo Pedometer, Barometer, Camera (SDK 57): <https://docs.expo.dev/versions/v57.0.0/sdk/pedometer/>, <https://docs.expo.dev/versions/v57.0.0/sdk/barometer/>, <https://docs.expo.dev/versions/v57.0.0/sdk/camera/>
- `floorsAscended` unreliable: <https://developer.apple.com/forums/thread/748101>
- No Wi-Fi signal strength on iOS: <https://developer.apple.com/forums/thread/835163>
- Shaking fools pedometers: <https://www.testdevlab.com/blog/testing-fitness-apps-can-you-cheat-the-algorithm>
- Choice overload (Chernev et al. 2015): <https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual>

**Launch readiness**
- `blockedApplications` rejected under 2.5.1: <https://developer.apple.com/forums/thread/776058>
- Automated Screen Time entitlement false positive (2026): <https://developer.apple.com/forums/thread/838802>, <https://developer.apple.com/forums/thread/779449>
- Toggle paywalls rejected: <https://www.revenuecat.com/blog/growth/r-i-p-toggle-paywall-we-hardly-knew-ye/>
- Shipping a FamilyControls app (privacy, picker drop-off): <https://habitdoom.com/blog/shipping-familycontrols-ios>
- Screen Time API bugs: <https://developer.apple.com/forums/thread/819997>, <https://developer.apple.com/forums/thread/819224>, <https://habitdoom.com/blog/apple-screen-time-api-guide>, <https://habitdoom.com/blog/ios-27-screen-time-changes>
- Extension memory: <https://developer.apple.com/forums/thread/823431>
- Library issue #96: <https://github.com/kingstinct/react-native-device-activity/issues/96>
- External TestFlight shield failures: <https://developer.apple.com/forums/thread/784981>
- Holiday review slowdown: <https://www.goodbarber.com/blog/app-store-connect-holiday-dec-23-27-a926>
- New Year seasonality: <https://www.mobileaction.co/blog/new-year-resolutions-health-fitness-apps>, <https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025>
- Featuring nominations: <https://developer.apple.com/app-store/getting-featured/>
- TikTok bio links: <https://techcrunch.com/2023/03/08/tiktok-begins-blocking-links-to-app-store-pages-from-creators-bios/>
- Benchmarks: <https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026>
- Custom Product Pages: <https://adapty.io/blog/custom-product-pages-app-store/>
- PostHog: <https://posthog.com/pricing>
- AlarmKit limits: <https://developer.apple.com/forums/thread/797158>, <https://developer.apple.com/forums/thread/815064>
- Live Activities: <https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities>
