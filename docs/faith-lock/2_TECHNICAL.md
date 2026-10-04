# Faith app, track 2: can "pray in Hallow/YouVersion for N minutes to unlock" work on iOS?

Research date 2026-10-03. Repo read-only. Evidence labels:
**[APPLE-DOC]** Apple documentation · **[DTS]** Apple engineer on the forums ·
**[FORUM]** developer reports on forums · **[CODE]** working open-source code ·
**[REPO]** what Locturne already does · **[VENDOR]** a company's own page ·
**[ANEC]** user anecdote / blog · **[INFER]** my reasoning, not verified on a device.

Note on method: the web-search quota ran out at the start, so most evidence comes from
direct fetches of Apple doc JSON, Apple forum threads (the `device-activity` tag listing,
pages 1–2), GitHub (`gh`), vendor pages, and a few Brave result pages. Nothing here was
tested on a device.

---

## TL;DR

- **Mechanism: yes, and it's documented.** Add a `DeviceActivityEvent` with the prayer
  app's `ApplicationToken` and a threshold (e.g. 10 min). In
  `eventDidReachThreshold`, the monitor extension clears the `ManagedSettingsStore`
  shield. Apple's own `DeviceActivityMonitor` sample shields from the extension, and the
  docs say the store can be changed "when an interval starts, ends, or meets a threshold".
  **It's Locturne's daily-limit code turned around:** `armLimit()` in
  `src/lib/screen-time.ts` already arms a midnight–23:59 window with a threshold event
  and `includesPastActivity: true`. For this idea, the actions just swap
  (`intervalDidStart → blockSelection`, `eventDidReachThreshold → unblockSelection`), and
  react-native-device-activity can configure all of that from JS. Little or no new Swift.
- **Reliability is the problem, not whether it's possible.** iOS 26.2–26.4 had a
  well-documented bug where `eventDidReachThreshold` **fires immediately or early**
  (Apple: "known issue"). It was said to be fixed in 26.5, but there are new reports on
  **26.5.2 (Jul 2026)** and of a 10-min event firing at about 5 min (Aug 2026). Missed
  and batched events are also reported. Here, an early fire means a **free unlock**
  (fails open), and a missed fire means the user **stays locked** (fails closed).
  Either way, the in-app path (a) has to exist as a fallback.
- **Hallow's audio problem is real.** Screen Time counts foreground, screen-on time.
  Listening with the screen locked almost certainly doesn't count (several user reports,
  no Apple statement). Hallow is audio-first, so a typical "start a 10-min prayer, lock
  the phone" session may register about 1 minute. YouVersion *reading* would count;
  YouVersion *audio Bible* with the screen locked would not.
- **Identity:** tokens are opaque. The user has to pick Hallow/YouVersion in
  `FamilyActivityPicker`. We can't pre-select by bundle ID and can't verify what they
  picked. We can only show it back with `Label(token)`. Both apps sit in the **Reference**
  category.
- **Verification:** only time in the foreground is measured, never prayer. Cheating is
  trivial: leave YouVersion open on the desk, or pick a fun app that isn't blocked as the
  "prayer app".
- **In-app path (a):** BSB (public domain since 2023-04-30), WEB and KJV (outside the
  UK) are free for commercial use. **YouVersion now has a free developer Platform with an
  official Expo SDK** (BibleReader, VerseOfTheDay, BSB id 3034; NIV etc. after accepting a
  license). ESV API is non-commercial only. API.Bible is $29+/mo, and copyrighted
  versions cost from $10/mo each when monetized. USCCB daily Mass readings (NABRE) need a
  paid license for any app.
- **Locturne reuse:** roughly **55–65% of the code** carries over, and **about 80–90% of
  the hard, risky native/entitlement work**.

---

## 1. Exact mechanism

### 1.1 API shape [APPLE-DOC]
- `DeviceActivityEvent(applications: Set<ApplicationToken>, categories:, webDomains:, threshold: DateComponents, includesPastActivity: Bool)` (iOS 15+; `includesPastActivity` iOS 17.4+).
  <https://developer.apple.com/documentation/deviceactivity/deviceactivityevent>
- `includesPastActivity`: whether usage between the schedule's start and the moment you
  call `startMonitoring` counts. If the schedule doesn't start on the hour, iOS counts
  from the nearest earlier round hour. Apple gives no default (in practice, false).
  <https://developer.apple.com/documentation/deviceactivity/deviceactivityevent/includespastactivity>
- `DeviceActivityMonitor` sample: `let store = ManagedSettingsStore()`, with the comment
  "You can use the `store` property to shield apps when an interval starts, ends, or
  meets a threshold." **So yes, the monitor extension can change ManagedSettingsStore.**
  This is the standard pattern. <https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor>
- Category shields can exempt specific apps:
  `ShieldSettings.ActivityCategoryPolicy.specific(_ categories, except: Set<Token<Activity>>)`
  and `.all(except:)`. That matters because Hallow and YouVersion are both in the
  **Reference** category (App Store pages). If a user blocks "Reference" or "all apps",
  the prayer app must go in `except`.
  <https://developer.apple.com/documentation/managedsettings/shieldsettings/activitycategorypolicy>

### 1.2 Proposed design [INFER, built from REPO patterns]
```
DeviceActivityCenter.startMonitoring("faith-day",
  during: Schedule(04:00 → 23:59, repeats: true),
  events: ["prayed": Event(applications: [hallowToken, youversionToken],
                           threshold: DateComponents(minute: 10),
                           includesPastActivity: true)])

monitor.intervalDidStart("faith-day")       → store.shield = distracting apps (the "until you pray" state)
monitor.eventDidReachThreshold("prayed")    → sanity check (§2.1), then clear store, write
                                               "prayedOn = today" to the App Group, send a local notification
monitor.intervalDidEnd                      → nothing (the next day's start re-shields)
```
- Several prayer apps can go in one event, so their time adds up (event-level sum). Use
  separate events if each app needs its own minutes.
- Remember that **thresholds reset each interval** and an event fires **at most once per
  interval**. "Pray again to unlock again after 2 h" needs extra intervals or events.
  There's a cap of about 20 monitored activities, and intervals must be ≥15 min
  ([REPO] docs/VALIDATION_RESEARCH.md §5, forum 729841).
- Re-locking N hours after the unlock would need a one-off schedule. Non-repeating
  schedules had missing callbacks on 26.3.1 (forum 820956). Prefer "unlocked for the
  rest of the day" (that's also what Psalmo does [VENDOR]).

### 1.3 Same pattern as Locturne? Yes [REPO]
- `src/lib/screen-time.ts` `armLimit()`: a midnight–23:59 repeating window, a single event
  with `threshold: hourMinute(minutes)` and `includesPastActivity: true`, and
  `configureActions(... 'intervalDidStart' → unblockSelection; 'eventDidReachThreshold' → blockSelection)`.
  The faith app just **swaps the two actions**, and the event's selection is the prayer
  app instead of the limited apps.
- `targets/ActivityMonitorExtension/Shared.swift` (react-native-device-activity, about
  1.9k lines) already parses events, thresholds and `includesPastActivity`, and runs
  `blockSelection`/`unblockSelection` actions declaratively. **Path (b) needs about zero
  new Swift for the happy path.** The only new native code is a premature-fire guard
  (~20 lines) in `DeviceActivityMonitorExtension.swift`.
- `reapplyLocturneBlocks()` and the App Group key discipline (overlapping rules on one
  shield list) carry over unchanged.

---

## 2. Reliability (2025–2026)

### 2.1 Threshold firing bugs
| Issue | Versions | Evidence |
|---|---|---|
| `eventDidReachThreshold` fires right after `startMonitoring`, or before the threshold | iOS 26.0 betas (Jun 2025) → 26.4 final | [DTS] "This is a known issue that is currently being investigated." (Jan 2026), threads [809410](https://developer.apple.com/forums/thread/809410), [814559](https://developer.apple.com/forums/thread/814559), [793747](https://developer.apple.com/forums/thread/793747), [819997](https://developer.apple.com/forums/thread/819997). FBs 21267341, 21450954, 18927456, 18061981. Often happens **while charging** and on **the first pickup after 6+ h idle**. Also affects Apple's own App Limits. |
| Said to be fixed | 26.5 beta 1 (Apr 2026) | [DTS] "the team in charge of that framework already confirmed the fix is in place" (814559). |
| **Reported again** | **26.5.2 (Jul 2026)** | [FORUM] [838510](https://developer.apple.com/forums/thread/838510): fires at +0 s and then not at the real threshold. No Apple reply. |
| Early by about 2× (10-min event at about 5 min) | 26.x and 18.x | [FORUM] [840907](https://developer.apple.com/forums/thread/840907) (Aug 2026). Proposes checking elapsed time locally and re-arming. No Apple reply. |
| Events not firing, corrupted usage totals | 26.x | [FORUM] [819997](https://developer.apple.com/forums/thread/819997) |
| Missed, batched or delayed events. Re-registering thresholds after a restart → "phantom" catch-up floods, and about 50% of events missed for apps already used that day | iOS 18–26 | [CODE] ScreenTime-BMAD, an open-source "earn reward-app time by using learning apps" project (the exact (b) mechanic for kids), docs `SAME_DAY_TRACKING_FIX_ATTEMPTS.md`, `PHANTOM_FIX_ATTEMPTS.md` (15+ fix attempts, Feb 2026): <https://github.com/aminenidae/ScreenTime-BMAD> |
| Monitor extension stops being called after days without opening the host app | 26.x | [FORUM] [846053](https://developer.apple.com/forums/thread/846053) (unanswered) |
| Tokens change after OS updates. Stored tokens still decode and still shield, but token **comparisons** break | since iOS 16 | [FORUM] [825251](https://developer.apple.com/forums/thread/825251), [758325](https://developer.apple.com/forums/thread/758325) |

**What this means for (b):**
- An early or immediate fire **unlocks without prayer** (fails open). Guard it:
  ignore the event if `now − max(intervalStart, armedAt) < threshold` (the
  workaround from forum 814559). This doesn't catch "fired at 5 of 10 minutes" during
  real use. Accept that; it's a habit app, not a security app.
- A missed fire **keeps the user locked out after praying** (fails closed). That's the
  worse failure for reviews. There must always be a fallback: tap the shield → "I
  prayed" → open our app → path (a) (a 60-s verse/prayer), or a manual check.
- **Use a single coarse event (10 min), not minute-by-minute counting.** BMAD's trouble
  came from 240 one-minute events and re-arming. One threshold per day on a repeating
  window, never restarted mid-day, is the shape least exposed to the phantom-flood
  issue. Don't re-call `startMonitoring` on every app launch. Locturne's "re-arm only
  when the list changes" rule is already right.

### 2.2 Other constraints
- **Memory:** the monitor extension has a hard **6 MB** limit (crashes with
  `EXC_RESOURCE`). [FORUM/accepted] [735454](https://developer.apple.com/forums/thread/735454).
  one sec's developer asked Apple to raise it in Apr 2026 (FB22279215, still open):
  [823431](https://developer.apple.com/forums/thread/823431). The unlock is a tiny store
  write, so this is fine. Don't do networking or verse fetching in the extension.
- **Schedules:** ≥15-min intervals, about 20 activities. [REPO/FORUM 729841]
- **Granularity:** `threshold` is `DateComponents`, so seconds are accepted. Apple
  documents no minimum. The practical floor in shipped and open-source code is
  **1 minute** (`DateComponents(minute: 1)` in BMAD). Sub-minute behavior is
  unverified. For this product, 5–15 min is the sensible range.
- **Latency:** Apple gives no guarantee. Reports range from about 1 minute to
  "irregular". Expect the shield to lift somewhere between "while they're still in
  Hallow" and "a few minutes later". Send a local notification from the extension so the
  user knows. [INFER]

### 2.3 Foreground only, and the Hallow audio problem
- Screen Time measures foreground time with the screen on. Several independent user
  reports say background or screen-locked audio is not counted ("YouTube only has 10
  mins of screen time for around 3 hours of listening with the screen off", r/iphone.
  Apple Community thread "Screen Time Doesn't Track Background Audio", Feb 2024). Apple
  has said nothing either way. **[ANEC], high consistency.** DeviceActivity thresholds
  read the same usage data as Screen Time App Limits (the 26.x bug hits both) [FORUM],
  so the same rule almost certainly applies. **Needs a device test.**
- Hallow (App Store: Reference, 4.9★, 378K ratings) is built around **audio-guided
  sessions** [VENDOR]. The natural Hallow use (start the Rosary, lock the phone, pray)
  will **under-count badly**. The user has to keep Hallow open on screen, which goes
  against how Hallow is meant to be used, or the app needs a different rule for audio
  apps.
- YouVersion (Reference) reading counts. Its audio Bible ("Ask Siri to play Bible audio
  chapters") with the screen locked won't.
- **No workaround via Now Playing:** an iOS app can't read another app's now-playing
  state (MPNowPlayingInfoCenter only covers your own app). [INFER, well known]

---

## 3. Identifying Hallow / YouVersion

- Tokens are opaque. The picker returns them, and only SwiftUI `Label(token)` can show an
  icon and name ([REPO] modules/blocked-apps). **We can't pre-select by bundle ID, and we
  can't check what was picked.** Non-tokenized usage data
  (`approvedWithDataAccess`) exists only for EU devices with an EU Apple Account (forum
  [849296](https://developer.apple.com/forums/thread/849296), Oct 2026, unanswered: "is
  there any official way outside the EU?").
- **Onboarding:** a dedicated step "Pick the prayer apps you already use". Open
  `FamilyActivityPicker` with instructions ("search 'Hallow'"; the picker has a search
  field), then show the pick back with `Label(token)` ("Got it: Hallow ✓"). Ask for
  **exactly one pick per slot** so the step can't get mixed up with the block list. Keep
  it as its own selection ID, separate from the block list, and add it to `except:` for
  any category shield.
- Token drift after iOS updates (§2.1) means the event can silently stop matching. If
  "prayedOn" hasn't been set for several days while the user says they prayed, ask them
  to re-pick. [INFER]
- **Second identity channel: Shortcuts personal automations.** "When *Hallow* is opened →
  run [our App Intent]" and "When *Hallow* is closed → run [ours]". In Shortcuts the user
  picks Hallow **by name**, which gives real open and close timestamps. This is the
  **only** supported app-open signal ([DTS] [838231](https://developer.apple.com/forums/thread/838231):
  "There is no callback mechanism that triggers when an application is opened ... no ...
  App Intent ... hooks that the system automatically triggers"; user-built Shortcuts are
  the supported path). Setup is manual and fiddly. one sec and Opal already make users do
  this ([REPO] BACKGROUND_UNLOCK.md). It's a possible "power user" cross-check, but not the
  main path. Whether "is closed" fires on screen lock, as opposed to app switch, is
  unverified.
- Launching the prayer app from our app: universal links (bible.com) or the app's URL
  scheme via `LSApplicationQueriesSchemes`. Hallow's and YouVersion's schemes are
  **unverified**. The shield itself **can't open any app** (`.none/.defer/.close` only,
  [REPO] VALIDATION_RESEARCH.md, forum 719905).

---

## 4. Verifying prayer, and ways to cheat

Only foreground minutes are measured. Ways to cheat:
1. Open YouVersion or Hallow and leave the phone on the desk (set Auto-Lock to "Never",
   or just keep tapping it).
2. Pick a fun app that isn't blocked (a game, a browser not on the block list) as the
   "prayer app". We can't check the token.
3. The premature-fire bug gives a free unlock (§2.1).
4. Revoke Screen Time access in Settings. There's no callback for that ([REPO]).
5. Use another device. Shields are per device.

Mitigations: show the picked prayer app on the shield and Home ("Unlocks after 10 min in
**Hallow**"), keep the honor-system framing (Conform calls the friction "a habit worth
keeping" [VENDOR]), accountability partner and streak, and a weekly reflection.

**One real verification hook (speculative):** YouVersion Platform OAuth supports exactly
one data permission, **`highlights`** ([VENDOR] developers.youversion.com/sign-in-apis.md:
"The only supported permission is `highlights`"). A "highlight a verse in YouVersion
today" rule could be checked from our app with a server or API call. That would be proof
of an action rather than time. It's unverified whether the Highlights API exposes dates.
It also can't run inside the 6 MB extension, so the unlock would happen when our app is
opened, not automatically. Note DPLA 3.3.3(P) if any Screen Time-derived result is sent
to a server (forum [848997](https://developer.apple.com/forums/thread/848997), open
question).

---

## 5. Option (a): Bible text and licensing

| Source | Status | Commercial app? | Evidence |
|---|---|---|---|
| **BSB** (Berean Standard Bible) | Public domain since **2023-04-30** | Yes. Verbatim text "invited to bear the Berean name". Don't use the name on altered text. | [VENDOR] <https://berean.bible/terms.htm> |
| **WEB** (World English Bible) | Public domain. "World English Bible" is a **trademark**: use the name only for faithful copies. | Yes | [VENDOR] <https://worldenglish.bible/>, <https://ebible.org/web/> |
| **KJV** | Public domain in practice **except the UK** (Crown letters patent, perpetual) | Yes outside the UK. In the UK, technically needs Cambridge UP permission. | [Wikipedia] <https://en.wikipedia.org/wiki/King_James_Version> |
| ASV (1901), Douay-Rheims (Challoner) | Public domain (age) | Yes | [INFER, standard knowledge, not fetched] |
| **YouVersion Platform** (new) | **Free app key.** REST API, Swift, Kotlin, React, and an **Expo SDK** (`@youversion/platform-react-native-expo-ui`, Expo SDK 56, dev build). Components: `BibleReader`, `BibleTextView`, `BibleCard`, `VerseOfTheDay`, plus a VOTD API. "Licensed and official access to more than a thousand Bible versions … including the NIV." BSB (id 3034) needs only the key. NIV (111) etc. need a license accepted per version on platform.youversion.com. Attribution required. Rate-limited (429 + Retry-After). Repos pushed daily (Oct 2 2026). | **Commercial terms not checked:** the license text sits behind the developer login. Read it before relying on NIV/NLT in a paid app. | [CODE] <https://github.com/youversion/platform-sdk-reactnative-expo>, <https://github.com/youversion/platform-sdk-swift>; [VENDOR] <https://developers.youversion.com/llms.txt> |
| **API.Bible** (American Bible Society) | Free Starter: 5,000 calls/mo, 3 copyrighted versions, **"strictly non-commercial"**. Pro **$29+/mo**, 150K calls. Copyrighted versions "**$10/mo per translation**" when monetized. CC/public-domain versions free. "Commercial use includes … freemium models." | Paid | [VENDOR] <https://api.bible/> |
| **ESV API** (Crossway) | "You must use the text for non-commercial purposes." A site that charges, shows ads or asks for donations counts as commercial. 500 verses per query, 5,000 queries/day. | **No** (needs a separate Crossway license) | [VENDOR] <https://api.esv.org/> |
| **bible-api.com** | Free hobby project (Tim Morgan). WEB default, KJV, 18 translations, random-verse endpoint. 15 req/30 s per IP. "Can and will go down". Open source, can self-host. | Uses PD texts, but **bundle the text instead of depending on it** | [VENDOR] <https://bible-api.com/> |
| **USCCB / NABRE / Lectionary** (Catholic daily readings) | NABRE: <5,000 words is free in print/eBook, **but that doesn't cover web use**. Lectionary daily readings are free only "on an RSS feed only on a website which does not condition access…". **Apps, paid or free, need a license plus royalties.** | Paid license (CCD Permissions, 202-541-3098) | [VENDOR] <https://www.usccb.org/offices/new-american-bible/permissions> |

**Recommendation [INFER]:** bundle BSB (and WEB/KJV) offline as the default. That's
zero cost, works offline, and works inside a shield/notification flow. Use our own
curated verse-of-the-day list (365 references, text pulled from the bundled BSB). Add
the YouVersion Expo SDK only if users ask for NIV/ESV-style versions, after reading its
license. For a Catholic segment (Hallow's audience), skip the official daily Mass readings
unless we pay the USCCB. Use PD Douay-Rheims or BSB with a liturgical-calendar reference
list instead (the *references* to the day's readings are facts; the NABRE *text* is the
licensed part — [INFER], check with counsel).

---

## 6. Android (brief)

- **Detecting time in a prayer app:** `UsageStatsManager.queryEvents()` with the special
  `PACKAGE_USAGE_STATS` permission (the user grants it in Settings) gives **per-package**
  foreground events. **Package names are visible**, so Hallow can be identified
  directly (`com.hallow…`, exact ID unverified) and summed precisely. On identity and
  accuracy, that's better than iOS. [APPLE-equivalent doc]
  <https://developer.android.com/reference/android/app/usage/UsageStatsManager>
- **Blocking:** the usual route is an AccessibilityService (detect the foreground app,
  show an overlay or go Home), or a usage-stats poll plus `SYSTEM_ALERT_WINDOW`. Play
  policy allows non-accessibility uses with a **prominent in-app disclosure plus
  consent** and a Play Console declaration. Since 2021, apps targeting API 31+ with an
  AccessibilityService need the declaration. "Autonomously initiate … actions" is
  banned for non-accessibility tools. [VENDOR]
  <https://support.google.com/googleplay/android-developer/answer/10964491>. Many
  blockers ship this way (Psalmo says it has iOS and Android versions [VENDOR]).
- **Effort:** a separate native module (Kotlin). Little of Locturne's iOS native layer
  carries over. Screen-locked audio is again not "foreground" in UsageStats [INFER].
  Verdict: feasible, about 3–5 weeks of extra native work. Do it after iOS.

---

## 7. How much of Locturne carries over

Sizes measured: `src/` ≈ 27.1k lines including tests (`src/features` ≈ 12.0k),
native Swift (targets plus module) ≈ 6.9k (three copies of the 1.9k-line `Shared.swift`).

| Layer | Reuse | Notes |
|---|---|---|
| Native extensions (`targets/ActivityMonitorExtension`, `ShieldConfiguration`, `ShieldAction`), react-native-device-activity, App Group plumbing, `modules/blocked-apps` (Label(token) rows) | **~90%** | Path (b) is `armLimit` with the actions swapped. Add a premature-fire guard and new shield copy ("Pray first"). Delete the downstairs/step/CoreMotion logic. |
| Entitlements, EAS build, config plugins, `docs/ENTITLEMENT_SETUP.md` know-how | **~100% of the know-how** | New bundle IDs need a new Family Controls Distribution request (1 day to 5+ weeks). |
| `src/lib/screen-time.ts`, `lock-state.ts`, `daily-limits.ts`, `emergency.ts`, `heartbeat`, `first-run`, `notifications`, `purchases/revenuecat`, `analytics`, `shield-copy` (+tests, sim harness) | **~65–75%** | The phase model changes from night/morning/day to "locked until prayed today". Purchases, analytics, emergency unlock and heartbeat carry over as they are. |
| `src/components`, `src/theme`, hooks | **~50%** | Glass cards, buttons, controls, app picker carry over. The night-sky/moon/Loc raccoon brand doesn't fit a faith app. |
| `src/features` (onboarding framework, paywall, apps list, routine, home) | **~25–35%** | The onboarding *engine* (navigation reducer, Shell, paywall layout, exit offers) carries over. Content, wake/downstairs/nap/scan features don't. |
| **Overall** | **≈55–65% of lines; ≈80–90% of the risky infra** | Estimate [INFER]. New work: a scripture/prayer reader (or the YouVersion SDK), a prayer-app picker step, VOTD content, faith copy and brand. |

---

## 8. Device tests before committing (in order)

1. **Background audio:** a 10-min Hallow session with the screen locked. Does a 3-min
   threshold fire? (Expected: no.) Same with the screen on and the app in the
   foreground. (Expected: yes.)
2. **Latency:** how long after crossing 10 min does `eventDidReachThreshold` arrive, and
   does the shield lift while the user is still in the prayer app? Test on iOS 26.5.x and
   27.x, charging and not charging.
3. **Premature fire:** arm at 04:00 with the phone on the charger overnight. Does the
   event fire at the first pickup?
4. **Category except:** block "Reference" + `except: [hallowToken]`. Is Hallow
   reachable?
5. **Token drift:** after an iOS point update, does the stored prayer token still match
   usage?
6. **Shortcuts "App Is Closed"** (optional): does it fire on screen lock or only on app
   switch?

## Sources (all fetched 2026-10-03 unless marked)
- Apple docs: DeviceActivityEvent <https://developer.apple.com/documentation/deviceactivity/deviceactivityevent>; includesPastActivity <https://developer.apple.com/documentation/deviceactivity/deviceactivityevent/includespastactivity>; DeviceActivityMonitor <https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor>; ActivityCategoryPolicy <https://developer.apple.com/documentation/managedsettings/shieldsettings/activitycategorypolicy>
- Forums: 809410, 814559, 793747, 819997, 838510, 840907, 846053, 823431, 735454, 825251, 758325, 838231, 849296, 848997, 820956 (all at `https://developer.apple.com/forums/thread/<id>`); tag listing <https://developer.apple.com/forums/tags/device-activity>
- ScreenTime-BMAD (earn-by-learning-app, open source): <https://github.com/aminenidae/ScreenTime-BMAD>
- Background audio not counted: Apple Community "Screen Time Doesn't Track Background Audio" (thread 255504293, discussions.apple.com), r/iphone "Does Screen Time factor in YouTube if the screen is off" (Feb 2023). Seen via Brave results, not fetched individually.
- Competitors (all in-app unlock; none found that unlock via time in an external prayer app): Bible Mode <https://apps.apple.com/us/app/bible-mode-reduce-screen-time/id6744124873> (4.9★, 12K, $4.99–$59.99 IAP); Conform <https://conformtojesus.app/app-blocker/>; Psalmo <https://psalmo.app/blog/block-apps-until-you-pray>; FaithLock <https://www.getfaithlock.com/>; Bible Lock, Bible Pause, Bible Focus, Bible Break, Bible Shield, Holy Focus (App Store results). **Gap:** I found no app doing path (b) with Hallow/YouVersion. That's either a differentiator, or a sign that others tried it and hit §2.
- App Store: Hallow <https://apps.apple.com/us/app/hallow-prayer-meditation/id1405323394>; YouVersion <https://apps.apple.com/us/app/bible/id282935706>
- Licensing: BSB <https://berean.bible/terms.htm>; WEB <https://worldenglish.bible/>; ESV <https://api.esv.org/>; API.Bible <https://api.bible/>; YouVersion Platform <https://developers.youversion.com/llms.txt>, <https://github.com/youversion>; USCCB <https://www.usccb.org/offices/new-american-bible/permissions>; bible-api.com <https://bible-api.com/>; KJV <https://en.wikipedia.org/wiki/King_James_Version>
- Android: <https://developer.android.com/reference/android/app/usage/UsageStatsManager>; <https://support.google.com/googleplay/android-developer/answer/10964491>
- Locturne repo: `src/lib/screen-time.ts` (`armLimit`), `targets/ActivityMonitorExtension/*`, `docs/ARCHITECTURE.md`, `docs/BACKGROUND_UNLOCK.md`, `docs/VALIDATION_RESEARCH.md`
