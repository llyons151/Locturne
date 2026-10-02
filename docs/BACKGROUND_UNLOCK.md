# Unlocking without opening the app

Written October 1, 2026, after the user pushed back on "it has to be measured live,
with the app open" ([DOWNSTAIRS_METHOD.md](DOWNSTAIRS_METHOD.md) §2). Two research
passes dug into every route iOS offers. Short version: **the app doesn't need to
be open, for steps or for downstairs.** Our code needs a few seconds of runtime
*after* the walk, and iOS has several legitimate ways to get it. None of them is
proven on a device yet, so this is a spike list, not a promise (GAME_PLAN: don't
promise an automatic unlock until it's shown to work).

## 1. The two facts that unlock everything

1. **The motion chip keeps a history.** `CMPedometer.queryPedometerData(from:to:)`
   returns steps, **and `floorsAscended` / `floorsDescended`**, recorded by the
   coprocessor while our app wasn't running (about 7 days kept). So "steps since
   7:00" and "floors gone down since 7:00" can be read *after* the fact. Only the
   raw barometer (`CMAltimeter`) has no history.
2. **Our code can run briefly without the UI.** Each of these gives a few seconds
   of native Swift, enough to query the pedometer and clear the shield:

| Surface | Where the code runs | User effort | Status |
|---|---|---|---|
| **Shield button** ("I'm up") | ShieldAction extension | Tap the block screen they're already looking at | Unshielding from here is **confirmed by Apple DTS** (thread 807934). CoreMotion inside the extension is **untested anywhere**. |
| **Notification action** without `.foreground` | App process, in the background | Tap "I'm up" on a notification | Documented; ~10–30 s budget. CoreMotion works in the app process. |
| **App Intent** (`openAppWhenRun = false`, conforming to `LiveActivityIntent`) | App process, in the background | Lock Screen / Control Center control, Action Button, widget button, Siri, Shortcuts | Documented; low review risk. one sec already changes Screen Time restrictions from a background Shortcuts intent. |
| **Shortcuts "App Is Opened" automation** (TikTok → run our intent) | App process | One-time setup per app (one sec and Opal already make users do this) | The magic flow: walk, tap TikTok, it opens. **Unknown whether it fires while the app is shielded.** |
| **DeviceActivityMonitor** at chained 15-min intervals | Monitor extension | None (fully automatic) | Can unshield (standard). Up to 15 min lag; launch flakiness on iOS 17.4+; CoreMotion inside untested. |
| **AlarmKit** stop / secondary button | App process | Part of waking up | `stopIntent` sometimes doesn't fire (open bug). Good as a start signal, not the unlock. |
| BG app refresh, HealthKit hourly delivery, silent push | App process | None | Unpredictable timing. Safety nets only. |

**Rejected:** background location or silent audio to keep the app alive. Apple DTS
said plainly an app "cannot use 'location' background mode just to keep Core Motion
working", and 2.5.4 rejections for this were still happening in 2026. Also
rejected: absolute altitude (broken since iOS 17.4) and HealthKit `flightsClimbed`
(can't be read while locked, hourly at best, no descents).

## 2. "Go downstairs" without the app

Three signals, from simplest to most precise. Use them together.

### A. Floors from history (zero effort)
`floorsDescended` (or ascended) since the morning start, plus a few steps. The chip
only counts floors **while walking**, so lifts don't count, and it can't be faked
from bed.
- **Risk:** a floor is roughly 3 m, and one flight at home is about 2.7–3.0 m, right
  on the threshold. One developer saw `nil` floors after walking stairs twice in a
  minute (forum 748101). No shipping app publicly relies on `floorsDescended`. It
  might miss a single flight, so it **can't be the only signal**.

### B. The two-tap barometer (the precise one)
The user's own behavior gives the baseline:
1. In bed, they try TikTok and hit the shield. Tapping **"I'm up"** records the air
   pressure *right now* (that's the in-bed baseline) and the shield changes to
   "Go downstairs, then tap again."
2. Downstairs, they tap TikTok again, then "I'm up". The pressure is read again.
3. A drop of about **0.3 hPa (≈2.5 m)** with some steps in between → unlocked.

Weather drift over a few minutes is about 0.1 hPa or less, so the long-baseline
problem disappears. The app never opens. Up or down both count.
- **Depends on:** reading `CMAltimeter` pressure inside the ShieldAction extension
  for about a second. If that fails, the same two taps work as **notification
  actions** in the background app process, where the barometer definitely works
  (the shield tap posts the notification).

### C. Already downstairs
If they got up before touching the phone, the first tap has no in-bed baseline.
Fall back to A (floors since the morning start) or to steps. Since they're already
up, a modest step count since the morning start is fair proof.

### Deciding rule (to tune on a device)
Unlock if **any** of:
- the two-tap pressure delta is ≥ ~0.3 hPa with ≥ 10 steps between taps;
- `floorsDescended + floorsAscended` ≥ 1 since the morning start, with ≥ 20 steps;
- the steps-only fallback target is met (the "walk 200 instead" path).

## 3. Steps without the app

Easier, because steps have history. Tapping "I'm up" on the shield (or a
notification, control or widget) queries steps since the morning start. At ≥ 200 the
shield clears; otherwise the shield says "143 / 200. Keep going."

## 4. What the user sees

- **Default, zero setup:** the shield has an "I'm up" button. Morning notification:
  "Apps are asleep. Go downstairs." with an "I'm up" action.
- **Optional, in settings:** "Unlock the moment you open TikTok" sets up the
  Shortcuts automation (only if test 2 below passes). And a Lock Screen / Control
  Center "I'm up" control.
- **The app stays the place for the show:** his lines, the live meter, the share
  card. People who want it can open it, but nobody has to.
- If a check fails for a technical reason, say so and offer steps. Never fail
  silently.

## 4b. Recommended no-app flow (decided shape, Oct 1)

**Why not background location limited to a morning window (say 7:00–9:00)?**
- Review judges the *purpose*, not the duration. The location background mode is
  declared for the whole app, and "keep the motion sensors running" isn't a
  location feature, so it gets rejected either way.
- It also can't start on its own at 7:00. A location session has to be started
  while the app is in the foreground, so it would have to run all night from
  bedtime, with the location indicator showing and the battery draining.

The window idea does work for the **DeviceActivity checks**, which are allowed. The
flow, with the morning start at 7:00:

1. **7:00:** a DeviceActivity interval starts. The shield switches to morning text
   ("Morning. Downstairs first.") with an **I'm up** button. A time-sensitive
   notification: "Apps are asleep. Go downstairs."
2. **In bed, they reach for TikTok:** the shield shows. Tapping **I'm up** records
   the pressure baseline and the time. Shield: "Go down, then tap again."
3. **Downstairs, they tap TikTok, then I'm up:** the extension checks the pressure
   drop, the steps and floors in between, then clears the shield. TikTok opens. A
   notification with his line ("Fine. You're up.").
4. **Already up before touching the phone:** the first tap finds floors or steps
   since 7:00 and unlocks straight away.
5. **7:00–9:00, automatic net:** chained 15-minute DeviceActivity intervals (8 of
   them) check the floors/steps history and unlock anyone who went down without
   tapping. They take up to 15 min, so they're a backup, not the main path.
6. **After 9:00:** nothing unlocks by time (that's the product). The shield's I'm
   up button keeps working all day.

If CoreMotion doesn't work inside the extension (test 1 below), steps 2–3 move to
the notification's **I'm up** action, which runs in the background app process.

## 4c. Fully automatic: they just walk downstairs (preferred, Oct 1)

The user asked for no taps at all. The unlock doesn't have to happen the instant
they reach the bottom of the stairs, only **by the time they want an app**. Two
automatic triggers cover that:

**1. Rolling pressure samples (no tap, ≤15 min).** Each 15-minute DeviceActivity
interval in the morning window wakes the monitor extension. It:
- reads the pressure and stores it (one sample per 15 minutes);
- compares it with the previous sample. A drop or rise of ≥ ~0.3 hPa with steps in
  between means they changed floors → unlock;
- also checks `floorsDescended`/`floorsAscended` and steps since the morning start.

Comparing against the sample from 15 minutes earlier (not from bedtime) keeps
weather drift tiny: under ~0.1 hPa against a floor's ~0.35 hPa. Eight intervals
cover a 2-hour window, within the ~20-activity limit next to the bedtime schedule.

**2. The moment they open TikTok (no tap, instant).** That's exactly when it matters.
Two candidate hooks, both untested:
- The **ShieldConfiguration extension** runs to draw the shield every time a blocked
  app is opened. If it can read the barometer and pedometer and clear the store, the
  shield flashes "You're up." and goes away. Its sandbox is stricter than
  ShieldAction's, so this is the riskiest test.
- A **Shortcuts "App Is Opened" automation** for each blocked app runs our check
  intent. Needs one-time setup and has to fire on a shielded app.

**What stays manual:** the shield's **I'm up** button and the notification action are
only fallbacks for when the automatic check hasn't caught up yet. The 7:00
notification becomes optional information, not a step.

Risks: the monitor extension sometimes launches late on iOS 17.4+ (FB13556935), and
everything here depends on CoreMotion working in the extensions (test 1). Steps
history (no barometer) still works for the automatic sweep if the barometer
doesn't.

## 5. On-device tests, in order

These go into the Phase 0 spike ([LAUNCH_PLAN.md](LAUNCH_PLAN.md) §3). Each one is
a few lines of Swift that log to the App Group and `os_log`.

1. **CoreMotion in the ShieldAction extension.** With Motion granted to the app,
   does `queryPedometerData` return steps and floors? Does a `CMAltimeter` pressure
   reading arrive within about a second? Then clear the shield and return `.defer`.
   Check it in a **TestFlight build** too (807934 saw unshielding work in debug but
   not TestFlight).
2. **Shortcuts "App Is Opened"** on a shielded app: does it fire and run our intent
   before the shield settles?
3. **App Intent from a Control with the phone locked** and the app force-quit:
   pedometer query, shield write and App Group read all succeed?
4. **Notification action** in the background with the app terminated: time
   budget, pedometer, barometer, shield clear.
5. **Floors on real stairs:** 10 trips down one flight in 3+ homes. Is
   `floorsDescended` ≥ 1, and how many seconds after reaching the bottom?
6. **Two-tap pressure delta:** bed → downstairs, across several days and weather,
   against a phone left still as a control.
7. DeviceActivityMonitor 15-min check with rolling pressure samples (§4c): does it
   wake on time with the phone locked, and can it read the barometer?
8. ShieldConfiguration extension: can it read CoreMotion and clear the shield while
   drawing it (§4c, instant unlock on opening the app)?

If test 1 passes, the cleanest design ships with no extra surfaces. If it fails,
tests 3–4 give the same result through the app process.

## 6. Engineering notes

- All of this is **Swift**, not JS: a background launch can't wait for React Native.
  Put the check in one shared Swift function used by the ShieldAction extension, the
  App Intent and the notification handler. The rules stay mirrored in
  `src/lib/lock-state.ts` and its tests.
- `targets/ShieldAction/Shared.swift` (from react-native-device-activity) already
  has `unblockSelection` and `sendNotification` action types. A new
  "check motion, then unblock" action is a small addition (~30–60 lines).
- Keep the morning state in App Group UserDefaults, not files with `.complete`
  protection, so it can be read while the phone is locked.
- Extensions have about 6 MB of memory: CoreMotion is fine; nothing heavy.
- `expo-notifications` owns the notification delegate in JS. A background action
  needs a native handler; check how the two coexist before building.

## Sources

- Unshielding from ShieldAction (DTS, plus the TestFlight caveat): <https://developer.apple.com/forums/thread/807934>
- CMPedometer history and floors: <https://developer.apple.com/documentation/coremotion/cmpedometer>, <https://developer.apple.com/documentation/coremotion/cmpedometerdata>
- Nil floors report: <https://developer.apple.com/forums/thread/748101>
- Background location can't be used to keep Core Motion alive (DTS): <https://developer.apple.com/forums/thread/841001>
- 2.5.4 rejections: <https://ptkd.com/journal/guideline-2-5-4-background-location-without-necessity>
- Absolute altitude broken: <https://developer.apple.com/forums/thread/751610>
- HealthKit locked / background delivery: <https://developer.apple.com/forums/thread/824819>, <https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:)>
- Interactive widgets / Live Activity intents: <https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities>
- Controls: <https://developer.apple.com/tutorials/data/documentation/widgetkit/creating-controls-to-perform-actions-across-the-system.md>
- Intent authentication policy: <https://developer.apple.com/documentation/appintents/intentauthenticationpolicy>
- one sec's Shortcuts automations: <https://feedback.one-sec.app/help/articles/4303002>, <https://tutorials.one-sec.app/troubleshooting/iphone-or-ipad-app-does-not-work-as-expected>
- App-open detection only via Shortcuts (DTS): <https://developer.apple.com/forums/thread/838231>
- Shields can't open the parent app: <https://developer.apple.com/forums/thread/820790>
- AlarmKit stopIntent bug: <https://developer.apple.com/forums/thread/815064>, <https://developer.apple.com/forums/thread/829593>
- Monitor extension limits: <https://developer.apple.com/forums/thread/735454>, <https://developer.apple.com/forums/thread/745035>
- Background notification actions: <https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types>
- BG refresh timing: <https://developer.apple.com/forums/thread/725675>
- Pressure to height (1 hPa ≈ 8.3 m): <https://pmc.ncbi.nlm.nih.gov/articles/PMC4431287/>
- Weather references: <https://open-meteo.com/en/docs>, <https://developer.apple.com/documentation/weatherkit/currentweather>
