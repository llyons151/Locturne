# Honest status and notifications

Built October 3, 2026, for GAME_PLAN Step 2 ("Honest status" and "Notifications"). Nothing
here has run on a phone yet: the Swift needs an EAS build, and the checklist at the end is
what to try first.

## What was built

| Piece | File | Job |
| --- | --- | --- |
| Extension heartbeat | `targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift` | Logs every callback iOS runs, with whether a shield was up afterwards |
| Heartbeat reader | `src/lib/heartbeat.ts` | Reads the log, adds the library's own window-start records, runs the self-check on stored data |
| Self-check and status | `src/lib/health.ts` (+ `health.test.ts`) | Pure: per-night verdicts, then one status with Loc's words |
| `useHealth()` | `src/hooks/use-health.ts` | The status for any screen, kept fresh; also keeps notifications in line |
| Notifications | `src/lib/notifications.ts` (+ `notifications.test.ts`) | Plans and schedules local notifications; permission timing |
| Diagnostics | `src/app/(dev)/diagnostics.tsx`, `src/features/dev/diagnostics/` | Hidden screen for beta testers at `/diagnostics`, with a shareable text report |
| Config | `package.json`, `app.json` | `expo-notifications` ~57.0.21 and its config plugin |

### The heartbeat (Swift)

Each of the six `DeviceActivityMonitor` callbacks now ends with one call:

```swift
recordLocturneHeartbeat(activity: activity.rawValue, callback: "intervalDidStart")
```

placed after the existing `reapplyLocturneBlocks` (where there is one) and before
`notifyAppWithName`. The new function sits at the bottom of the Locturne section:

- Builds one small dictionary: `activity`, `callback`, `at` (ms since 1970, like the
  library's own event times) and `shielded` (`isShieldActive()` from `Shared.swift`, read
  after the callback has done its work).
- Prepends it to the array under `locturne.heartbeat` in the App Group, keeping the newest
  100 (`LOCTURNE_HEARTBEAT_KEEP`). That's roughly 10 KB, about four nights of 16 windows plus
  limits, well inside the extension's ~6 MB.
- Plain property-list types only (`String`, `Double`, `Bool`), so the app reads it through the
  library's `userDefaultsGet` like every other Locturne key. `heartbeat.ts` also accepts the
  Bool arriving as 0/1.

`Shared.swift` (the library's copy) is untouched. Keep `LOCTURNE_HEARTBEAT_KEY`,
`LOCTURNE_HEARTBEAT_KEEP` and the entry shape in step with `src/lib/heartbeat.ts`.

**Swift risks:** it hasn't been compiled. The call sites run inside methods without an
`@available` annotation, calling an `@available(iOS 15.0, *)` function, which is the same
pattern the file already uses for `reapplyLocturneBlocks` (the target is iOS 16.4). Reading
`isShieldActive()` creates no new `ManagedSettingsStore`; it reads the shared `store`.

### The nightly self-check (`health.ts`)

`checkNights` looks at the last 7 nights plus tonight. A night is checked only if the routine
has that evening on, it started after the schedule was armed (`armedAt`), and bedtime is at
least 5 minutes past. It uses the **armed** times, because those are what iOS runs. Verdicts:

- `onTime`: a `night-*` window's `intervalDidStart` ran within 5 minutes of bedtime.
- `late`: the first one to run was later (a later window in the chain caught it).
- `missed`: no window ran at all that night.
- `noShield`: windows ran, but every one ended with no shield up.
- `unknown`: no heartbeat and the log can't vouch for that night (it has rolled over, or the
  installed extension predates the heartbeat). Never reported as fine or as missed.

`rollUpHealth` turns that, `getProtection()`, `getAccess()` and the armed night into one
`Health` (`level`, `title`, `detail`). Order: no iPhone, access not set up, access off
(VOICE.md's "Until then I'm just a raccoon" line), all nights off (`idle`), nothing armed
(`attention`), last judged night missed or unshielded (`attention`), then `ok`. `ok` only
appears when protection is on and a night is armed, and its detail says "Tonight is off"
when the next night is switched off.

`useHealth()` returns `[health, recheck]` and re-reads on focus, on return to the
foreground, and on Screen Time status changes, like `useProtection`. `readHealth()` is the
same without React.

### Notifications (`notifications.ts`)

All local, all one-off dates planned for the next 8 days by `planNotifications` (pure,
tested). One-offs rather than weekly repeats, because a weekly trigger can't follow an edit
that waits for bedtime, a night switched off, or a clock change. The plan is redone on every
`useHealth` mount, whenever protection changes, and whenever a caller runs
`rescheduleNotifications()`. At most about 19 pending, well under iOS's 64.

| Kind | When | Words |
| --- | --- | --- |
| Bedtime warning | 15 min before each night that's on | "Bedtime in 15 minutes." / "Then your apps sleep. Then I sleep." |
| Morning start | Morning start after each night that's on | "Morning." / "Your apps stay asleep until you're up. I'm not getting up first." |
| Revoked access | Replaces the bedtime warning while protection is `off`; no morning note then | "Screen Time access is off." / "So I can't block anything tonight. Turn it back on in Settings. Until then I'm just a raccoon." |
| Trial reminder | Local noon, 2 to 3 days before a 7-day trial ends (keeps the paywall's "2 days before" promise) | "Your free trial ends in 2 days." / end date, how to cancel, "No hard feelings. Some feelings." |
| Shield tap | Morning only, sent by the shield's button | "Up already?" / "Tap here and prove it. Then they wake." |

Nothing about nights is scheduled while no night is armed (before purchase) or before Screen
Time access is set up. Each night follows the routine in force when it starts, so a pending
edit shows from its first bedtime.

**Permission** is asked after the first successful night (GAME_PLAN): `isGoodMomentToAsk`
(pure) is true while iOS would still show its prompt and either a night held or a morning
proof exists. `shouldAskForNotifications()` reads those facts; `askForNotifications()` shows
the prompt and schedules everything if allowed.

### Public API for other screens

- `useHealth(): [Health, recheck]` and `readHealth()` (`@/hooks/use-health`). Show `title`
  and `detail` as they are.
- `rescheduleNotifications(routine?)`: call with no arguments after `saveRoutine`. It plans
  from the stored routine and the pending edit, so tonight keeps the old times.
- `shouldAskForNotifications()`, `askForNotifications()`.
- `scheduleTrialReminder(trialStart)`, `cancelTrialReminder()`: for purchases. The start is
  kept in the App Group (`locturne.trialStart`), so a later reschedule (including the one
  right after permission is granted) keeps it.
- `shieldTapNotification(phase)`: the payload for the shield button (below).
- `configureNotifications()`: shows banners while the app is open. Called lazily by the
  functions above; the root layout can call it at start-up too.

## What's stubbed or left to others

- **Shield-tap follow-up: feasible, not wired.** A shield button can't open the app, but the
  library's shield actions support `sendNotification`, and tapping that notification does
  open Locturne. Wiring it is one change in `setShieldText` in `src/lib/screen-time.ts` (not
  owned here), for the morning shield only:
  ```ts
  { primary: { behavior: 'close', actions: payload ? [{ type: 'sendNotification', payload }] : [] } }
  ```
  with `payload = shieldTapNotification(phase)`. It posts immediately (the library's
  `sendNotification` uses no trigger) and only shows if notification permission was granted.
  Routing the tap to the wake screen needs a response listener in the root layout
  (`Notifications.addNotificationResponseReceivedListener`), also not owned here.
- **Revocation with the app closed can't be detected.** When access is revoked, iOS stops the
  monitor extension too, so nothing runs to notice. What we do: on the next open,
  `useHealth` sees protection `off` and swaps every bedtime warning for the revoked-access
  one, so the reminder lands before the next bedtime if access stays off.
- **Trial reminder needs permission by day 5.** Permission waits for the first good night, so
  someone who never has one (or says no) won't get the reminder the paywall promised.
  Purchases may want to ask at trial start when "Remind me" is on; that's a product call.
- **Old builds:** until the new extension is installed, the heartbeat log is empty and the
  self-check falls back to the library's last-start-per-window records. Older nights then
  read `unknown`, never `missed`.
- **Weekday schedules.** The night windows repeat daily; nights-off scheduling belongs to the
  engine work. The self-check only judges nights the routine has on.
- **No link to `/diagnostics` yet.** Open it by URL (`locturne://diagnostics`) or add a row on
  the You tab in dev and TestFlight builds.
- **`app.json`:** the `expo-notifications` plugin adds the `aps-environment` entitlement to
  the main app. EAS syncs the Push Notifications capability onto the App ID; if a build fails
  on provisioning, that's why. Local notifications alone don't need it, so dropping the
  plugin is the fallback.

## On-device test checklist

Needs a new development build (the monitor extension and a new native module changed).

1. **Heartbeat appears.** Arm a test night in the Screen Time lab, close Locturne, wait for
   the first window. Open `/diagnostics`: "Extension heartbeats" shows `night-0
   intervalDidStart · shield up` at the window's time.
2. **Self-check, on time.** After a real armed night, "Self-check" shows the night as
   `onTime` and Home's status (via `useHealth`) reads "Bedtime is set."
3. **Self-check, missed.** Arm a test night, then turn off Screen Time access for Locturne
   before it starts and back on after it ends. The night should read `missed`; the status
   says iOS never put him to bed.
4. **Revoked access.** Revoke access in Settings, return to the app without force-quitting.
   The status reads "Screen Time access looks off" (or "is off" after a restart). In
   diagnostics, scheduled notifications show `revoked.*` instead of `bedtime.*` and no
   `morning.*`.
5. **Permission timing.** Fresh install: no prompt during onboarding. After the first
   morning unlock, `shouldAskForNotifications()` is true; after answering, false.
6. **Notifications fire.** With permission, set bedtime 20 minutes ahead (wait for the edit
   to apply or use a fresh install): the warning arrives 15 minutes before; the morning note
   at morning start. Turn one night off: its two notifications disappear from diagnostics.
7. **Trial reminder.** Call `scheduleTrialReminder(new Date())`: diagnostics lists `trial`
   at noon five days out (four if started before noon).
8. **Share report.** Tap Share report, choose Copy, paste into Notes: every section is there
   as plain text.
9. **Memory.** Over a few nights, check Console for the monitor extension being killed
   (`jetsam`) and that heartbeats keep coming.
