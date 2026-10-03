# v1 integration: wiring the five pieces together

Written October 3, 2026, after merging the five v1 branches (morning engine, exits and
scan, status and notifications, onboarding, v1 screens). This pass did the hand-offs each
doc listed. Nothing here has run on an iPhone; the checklist at the end is for the next EAS
build, in the order to try it.

The per-piece docs still hold the detail:
[morning-engine.md](morning-engine.md), [exits-and-scan.md](exits-and-scan.md),
[status-and-notifications.md](status-and-notifications.md), [onboarding.md](onboarding.md),
[v1-screens.md](v1-screens.md).

## What was wired

### One lock sync

- `syncLock` (src/lib/lock-controller.ts) is the only path from rules to shields, and now
  also writes the shield's words (it absorbed `applyShieldText`). `readLock` passes the real
  daytime facts (a running Block now via `peekNap`, used-up limits), so `blockNowUntil` is
  real and the shield copy no longer reads them itself.
- The root runs it on every open and foreground (`useStandingBlocks`, which now settles list
  and limit changes and then calls `syncLock` instead of only re-shielding). Home reads
  `useLock()`. They overlap on purpose; a sync is idempotent.

### Install day and mornings nobody armed

- New pure rule `armedInTime(now, settings, armedSince)` in lock-state.ts: only a night
  armed before its morning started can lock that morning. `readLock` treats any other
  morning as unlocked, so finishing onboarding at 3 pm reads as day (not "Go downstairs"),
  and with nothing armed (before purchase, declined) no morning claims to be locked.
  Arming at 23:30 still locks the coming morning.
- Re-arming (every routine edit re-arms) used to reset `armedAt`, which would have freed a
  morning edited at 07:20. `ArmedNight.since` now keeps the first armed time across re-arms
  (`armedSince()`); the old `nightWasArmed` check is folded into the same rule.

### Routine saves

- `saveRoutine` applies at once while nothing is armed (declined paywall, every night off);
  with a night armed it still waits for bedtime. Tests in routine.test.ts.
- Every save re-arms (`armRoutine`, Routine tab) and reschedules notifications (Routine tab
  and onboarding's `saveSetup`). Onboarding's `armTonight` now goes through `armRoutine`,
  keeping its "Armed only once iOS reports every window" check.

### Startup

- `useAppStart` (tabs layout): no saved routine opens onboarding; a routine that's paid for
  but not armed (an Ask to Buy or bank check that went through later) arms tonight.

### Honest status on Home

- Home reads `useHealth()`: access off or never given replaces the screen with health.ts's
  words; an `attention` status (bedtime not scheduled, a missed or shield-less night) shows
  as a quiet warning note under the status line.
- An emergency pause shows as its own look ("I'll allow it. This once. Maybe." and when the
  bedtime apps sleep again), since `readLock` still reports `night` during a pause.
- The Apps tab shows the bedtime list from its draft during a pause (`shownSelection`),
  with "Awake tonight after an emergency unlock" instead of the removals note.
- A scan routine with no code set up falls back to steps on Home and `/wake`, with "Set up
  your code" next to the button.

### Shield tap and closed-app shield words

- The morning shield's button now sends `shieldTap` (moved into shield-copy.ts; notifications
  re-exports it as `shieldTapNotification`) as a `sendNotification` action. Its `userInfo`
  url is `locturne://wake`.
- `onNotificationTap` + `opensWakeScreen` (notifications.ts), mounted from `useAppStart`:
  tapping the shield-tap or morning-start notification opens `/wake`, including from a cold
  launch.
- Named bedtime shield: `armNight`'s `blockSelection` actions carry
  `shieldId: 'locturne-night'`, and `syncLock` keeps that shield's words current
  (`setNightShieldText`). The monitor extension copies it into the live shield at each
  window start, so at bedtime with the app closed the shield says "Shh. I'm sleeping. So are
  they." The library also writes it as the bedtime list's own config, so `setShieldText` now
  writes that per-list config too, or the bedtime words would outlast the night.

### Off nights (Swift)

`DeviceActivityMonitorExtension.swift`: at a night window's start, `locturneNightIsOn()`
reads `locturne.routine` from the App Group (the pending edit once its `from` is due, with
2 minutes' slack for early windows) and works out the evening the same way lock-state.ts
does (before morning start belongs to yesterday evening). On an off night,
`skipLocturneNight` skips the window's `blockSelection`, ends a stale night hold, unshields
the bedtime list and re-shields the standing rules. If the routine can't be read, it
shields: fail closed.

### Small things

- No more `as Href` casts for `/wake`, `/exits` or `/scan`.
- You tab: real pass count; Passes and Emergency open `/exits`; "Can't walk or use stairs"
  opens scan setup; a "Beta diagnostics" row opens `/diagnostics`.
- `app.json` motion permission mentions stairs as well as steps.
- The agent worktrees are removed and `.claude/worktrees/` is git-ignored.

## Skipped, and why

- **Morning shield words with the app closed.** The bedtime shield stays up into the morning
  showing the night words ("They wake up after 7 am, once you're out of bed", still true)
  and with no tap notification, until Locturne opens. Switching it at morning start needs an
  `intervalDidEnd` action on the last window, and re-registering an activity fires
  `intervalDidEnd` (GAME_PLAN, Step 1), which would re-shield in the daytime. The morning
  start notification opens the app, which switches the words and the tap on.
- **Named shields for limits and naps.** The library writes a named shield into the app-wide
  config as well, so a limit hit with the app closed would put "That's today's lot" on
  always-blocked apps too. Left on the last words the app wrote.
- **The You tab's notification toggles and plan row** are still placeholders.
- **`clearPendingRoutine()`** for the Routine tab's Undo: saving the active routine back works.
- **The health self-check still dates nights from the last arm**, not the first, because it
  judges them against the armed times, which an edit can change.

## What remains before launch (code)

~~RevenueCat behind `src/lib/purchases.ts` (and the exit-offer arm by remote config)~~
built 2026-10-03 ([purchases.md](purchases.md)); it goes live once the owner finishes
[../REVENUECAT_SETUP.md](../REVENUECAT_SETUP.md). Still to do: PostHog, live Terms and Privacy URLs, the morning share card, the icon and splash (asset list in
v1-screens.md), the background unlock spike, an in-app trial-reminder fallback, and a
VoiceOver pass.

## On-device test checklist (next EAS build), by priority

1. **It builds.** The Swift edits (heartbeat, off-night skip) have never compiled. If
   provisioning fails on `aps-environment`, the expo-notifications plugin is the cause
   (status-and-notifications.md); local notifications work without it. Camera, print and
   notifications need this new dev build, not an update.
2. **Three nights, app closed.** Arm in the afternoon. At bedtime with Locturne closed the
   bedtime apps are shielded with the "Shh" words; they hold all night and into the morning.
   Open `/diagnostics` each morning: heartbeats on time, the night judged on time. Repeat for
   3 nights.
3. **The morning unlocks.** Before a proof nothing wakes. Tap the shield's button: a
   notification arrives; tapping it opens `/wake`. Downstairs on your real stairs (note the
   metres shown) and 200 steps both unlock; always-blocked apps stay shielded.
4. **Off night.** Switch one night off on the Routine tab (it applies from the next
   bedtime). That night, with Locturne closed, nothing extra is shielded; the next active
   night locks as usual. This is the Swift fix.
5. **Install day and the exits.** Finish onboarding mid-afternoon: Home says day, not
   "Go downstairs". At night, use the emergency unlock: the bedtime apps wake, Home shows the
   pause, the Apps tab still lists them, and the next bedtime re-locks with the app closed.
   In the morning, a pass unlocks and the count drops.
6. Revoke Screen Time in Settings and reopen: Home and You say so plainly.
7. A routine edit at 14:00 re-arms (the new bedtime holds); an edit at 07:20 before proving
   leaves the morning locked.
8. Scan: set up a printed QR, then unlock with it in the morning; a different code fails.
9. Then the per-piece checklists in the other five docs.
