# Pre-device review of the v1 integration

Written October 3, 2026, before the first EAS build of the integrated v1. It covers the lock
rules (`lock-state.ts`, `daily-limits.ts`, `night-plan.ts`, `wake/arming.ts`), the lock
controller (`syncLock`, `armRoutine`), proofs, passes and the emergency unlock, the App Group
records shared with the Swift extensions, and `targets/ActivityMonitorExtension`. Nothing here
has run on an iPhone; the aim was to catch what would otherwise cost a night of testing.

**Status after the fixes:** `npx tsc --noEmit` clean (it needs the generated, git-ignored
`expo-env.d.ts`; run `npx expo start` once or copy it from the main checkout), `npx expo lint`
clean, `npm test` 249 passing, and `npm run test:tz` passing in all five timezones.

## Bugs found

| # | Severity | Where | Scenario | Status |
|---|---|---|---|---|
| 1 | **High (crash)** | `src/lib/emergency.ts:115`, `src/features/apps/apps-list.tsx:138` via `saveLimits` | A JS `null` crosses the Expo bridge as `NSNull`, which isn't a property list, and `UserDefaults.set` throws: the app crashes. The emergency log writes `resumesAt: null` for every morning or Block-now emergency unlock; removing a daily limit with a night armed writes `pending.minutes: null`. The proof was already saved, so the morning still opened after relaunch, but the limit removal never saved. | Fixed: `sharedSet` and `saveLimits` drop null fields (`toPlist` in `screen-time.ts`); `getLimits` and `getEmergencyLog` read a missing field as null. The test fakes now throw on null like iOS does, which reproduced both crashes. |
| 2 | **High (lock never applies)** | `src/lib/screen-time.ts` `armNight` | `armNight` disarms first. If iOS refused any new window (an edit's re-arm, a re-arm while access is half-revoked), it disarmed again and deleted the armed record. With no record, `readLock` reads every morning as free, `syncLock` never retries (it only re-arms when something is armed), and the comment in `syncLock` claiming "the old windows stay armed" was false. | Fixed: on refusal the previous night's windows and record are put back. If iOS refuses those too, the record stays, so the morning stays locked, Home reports protection off, and the next sync retries. |
| 3 | **High (loosens from bed)** | `src/lib/wake/arming.ts:85` | Switching every night off (or making the night shorter than 15 minutes) planned `disarm` straight away, even while the edit was pending for the next bedtime. Disarming deletes the armed record, so a morning still locked became free on the next sync, and tonight's remaining windows stopped. That breaks the next-bedtime rule. | Fixed: it defers until the edit's `from`. The monitor extension already skips the windows at that bedtime, and the next sync after it disarms. |
| 4 | **Medium-high (stuck morning)** | `src/lib/morning-proof.ts:61` | `recordProof` refused any proof for a morning that already had one, even one that no longer counts (made before that morning's start as the clock now reads it: after flying west, or after an edit moved the start later). The morning then read as locked while every new proof was refused, the emergency unlock included, and `spendPass` used up a pass for nothing. Locked until bedtime. | Fixed: only a proof that still counts blocks another. |
| 5 | **Medium (lock ~45 min late)** | `targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift` `settleLocturneLists` | After an emergency unlock the bedtime list is parked in its draft until the next bedtime. The extension only swapped it back once bedtime had strictly passed, while `locturneNightIsOn` allows 2 minutes. If iOS starts the bedtime window a few seconds early, that window shields an empty list and nothing sleeps until the next window. | Fixed: the same 2-minute slack (and `NSNumber` reading, like the off-night check). Untested: the Swift hasn't compiled yet. |
| 6 | **Medium (silent feature loss)** | `src/lib/notifications.ts` `askForNotifications`, `scheduleTrialReminder` | Neither had a caller. Without permission, no bedtime, morning, revoked-access or shield-tap notification can show, so the morning shield's button did nothing visible. The trial reminder promised on the paywall was never scheduled. | Fixed: `useAppStart` and the wake screen's unlock show iOS's prompt once `shouldAskForNotifications()` says so (a night held or a morning was proven). `saveTrialReminder` now schedules or cancels the reminder from `trialStartedAt()`. No new UI. |
| 7 | **Medium (dev builds)** | `src/lib/purchases.ts` dev stub | The stub kept its entitlement in memory, so after a restart `isEntitled()` was false and `useAppStart` never re-armed a night that had been lost. | Fixed for testing: the root layout gives the stub the App Group as its store. RevenueCat replaces it before TestFlight. |

Reported by the device-test-script agent and confirmed: 2 (the revoke-and-restore variant),
5 and 6. The rest are from this review.

## Found but not changed (design questions or low severity)

1. **Notification prompt timing.** Permission waits for the first good night (GAME_PLAN), so
   on the first locked morning the shield's "Up already?" notification can't show. Asking
   before the first night would fix that; it's a product call. The docs also suggest one
   explaining line before iOS's prompt, which would be new UI, so it isn't there.
2. **Restore after revoking re-arms with a new `armedAt`.** The self-check skips nights before
   `armedAt`, so nights missed while access was off aren't listed once it's restored. `since`
   is kept, so mornings stay locked correctly. INTEGRATION.md chose this on purpose.
3. **Earlier bedtime armed before its edit applies.** An edit at 14:00 moving bedtime from
   23:00 to 22:00 arms the 22:00 windows at once (allowed: it only tightens). Between 22:00
   and 23:00 the rules in force still say `day`, so opening Locturne then wakes the bedtime
   apps until the next window re-shields them (within 45 minutes). Harmless but flickery.
4. **Same edit also turning tonight on.** The extension uses the pending routine only from
   its `from` (with 2 minutes' slack), so windows before it judge tonight with the old nights.
   If one edit moves bedtime earlier and switches an off night on, tonight's lock can start
   up to one window after the old bedtime. Rare; fixing it means teaching Swift which
   routine owns each window.
5. **An unpaid or declined user still reads `night` at bedtime.** `readLock` only uses the
   armed check for mornings. Nothing is shielded (the controller guards that), but Home may
   show the night state to someone with nothing armed. Worth a look against "never imply
   protection is on".
6. **The morning notification still fires after an emergency unlock** ("Your apps stay
   asleep until you're up") although that morning is already open.
7. **A nap on the bedtime list removes its per-list shield words when it ends** (the
   library's `unblockSelection` action deletes `shieldConfigurationForSelection_night`). The
   app-wide words are the same, so it only matters until the next sync.
8. **Daily limits run 00:00 to 23:59**, so use in the last minute of the day isn't counted.
9. **`cleanUpAfterActivity('night-1')` also clears `night-10` to `night-15`** (the library
   clears by prefix). Harmless today because `armNight` cleans every window before
   reconfiguring them all; keep it that way.

## Verified and fine

- App Group keys and shapes match between TS and Swift: `locturne.routine` (`active`,
  `pending.from`, `activeNights`, `morningStart`), `locturne.pendingLists`, `locturne.nap`
  (`end`, `list`), `locturne.limits` (`id`), `locturne.limitReached.<id>`,
  `locturne.nightHeld`, `locturne.heartbeat`, and the library's
  `shieldConfigurationForSelection_<id>` / `familyActivitySelectionIds`. All three targets
  share `group.com.lukelyons.locturne`, and the three `Shared.swift` copies match the
  library's.
- Off-night evening maths in Swift agrees with `getLockState` for bedtimes before and after
  midnight.
- Re-registering a night window (`intervalDidEnd` on re-register) is harmless: night windows
  have no end action, and the extension's end handler only re-applies standing blocks.
  Re-registering a limit runs its start action (unshield) and then re-shields a limit used up
  today, so that's harmless too.
- `planNightWindows` never makes a window under 15 minutes, and stays within 16 of the
  ~20-activity budget (plus 1 nap and 3 limits).
- No re-arm loop: `arm` calls `syncLock`, whose background `armRoutine` reuses the in-flight
  promise.

## Can't be checked without a device

- **Everything Swift.** The heartbeat, off-night skip and settle edits have never compiled.
- **Whether iOS fires `intervalDidStart` immediately** when a window is registered while
  "now" is inside it. Arming at night and the refused re-arm restore rely on it, with
  `sleepApps` in `arm()` as a backstop only when the app is open.
- **Whether iOS starts a window early**, and by how much (the 2-minute slack assumes seconds).
- **A one-off nap window that crosses midnight** (`repeats: false`, end clock before start).
- **Monitor extension memory.** Each callback decodes up to five selections plus the
  heartbeat array; it should be far under ~6 MB, but only Instruments can say.
- **Revocation:** whether `getActivities()` really comes back empty and the shield drops,
  which is what `getProtection` relies on while `getAuthorizationStatus` stays stale.
- **DST and timezone travel on the phone.** Repeating windows use clock-time components and
  the rules use real instants; the tests sweep five timezones, but the device's behaviour on
  a 02:00 window on spring-forward night is untested.

## What the device tester should watch for

1. Use the emergency unlock in the **morning**, and remove a daily limit **while a night is
   armed**: before the fix both crashed. The app must stay up.
2. Switch every night off **from bed** (night or locked morning): the apps must stay asleep
   until a proof, and that evening's bedtime must not shield.
3. After an emergency unlock at night, check the **next** bedtime locks on time with the app
   closed (heartbeat at bedtime with `shielded: true`, not one window later).
4. After the first good night, opening Locturne shows iOS's notification prompt; after
   allowing it, the morning shield button's "Up already?" notification arrives and opens
   `/wake`.
5. On the diagnostics screen, the armed record should never disappear after a routine edit;
   if iOS refuses an edit, the old bedtime still holds that night.
