# Morning engine and wake-up screens

Built October 3, 2026 (GAME_PLAN Step 2 "the engine" and the Step 4 wake-up screens).
Covers the morning gate, arming the night from the saved routine, the steps and
downstairs methods, and the `/wake` screen. Nothing here has run on an iPhone yet: it
passes `tsc`, `npm test` (incl. `npm run test:tz`), `expo lint` and an iOS JS bundle
export on Linux. The checklist at the end is what to run on the phone.

## What was built

| File | What it does |
|---|---|
| `src/lib/lock-controller.ts` | The single path from rules to shields: `readLock`, `syncLock`, `proveMorning`, `armRoutine`, `onLockChange` |
| `src/lib/morning-proof.ts` | Proof store. `recordProof` now refuses proofs that don't count (returns `false`); `proofCounts` is the pure rule |
| `src/lib/lock-state.ts` | Added `nightsAround` (the night `now` is in or last finished, and the next one) and exported `Night` |
| `src/lib/wake/arming.ts` | Pure: which night windows iOS should monitor and whether swapping them now is safe |
| `src/lib/wake/steps.ts` | Pure step count: history + live, never summed, light cadence cap |
| `src/lib/wake/downstairs.ts` | Pure barometer detector: 2.5 m, held 5 s, 5-minute session, noise/drift/spike handling, flat/no-signal |
| `src/lib/wake/lines.ts` | Loc's lines for both methods and the off-morning states |
| `src/hooks/use-lock.ts` | `useLock()`: live `LockState`, re-synced on mount, foreground, proof, and the next boundary |
| `src/features/wake/*` | The screen: `WakeScreen`, `DownstairsView`, `StepsView`, sensor hooks, shared parts |
| `src/app/wake.tsx` | Route `/wake`, registered in `_layout.tsx` as a `fullScreenModal` |

Tests: `lock-controller.test.ts` (against a fake `screen-time.ts`), `wake/arming.test.ts`,
`wake/steps.test.ts`, `wake/downstairs.test.ts`, `wake/lines.test.ts`, plus `nightsAround`
cases in `lock-state.test.ts`.

## Public API other features use

```ts
// src/hooks/use-lock.ts
useLock(): LockState                    // phase, blocked, morningKey, nextChange, ...

// src/lib/lock-controller.ts
readLock(now?): LockState               // no side effects
syncLock(now?): LockState               // apply the state to shields; safe any time
proveMorning(kind, now?): LockState | null  // record + sync; null if not the morning / already proved
armRoutine(now?): Promise<'armed'|'kept'|'disarmed'|'deferred'|'unavailable'>  // throws if iOS refuses
onLockChange(listener): () => void

// src/lib/morning-proof.ts
recordProof({ morningKey, kind, at }): boolean   // then call syncLock()
```

- **Onboarding** calls `armRoutine()` after `saveRoutine()` and purchase. The **Routine tab**
  calls `armRoutine()` after each `saveRoutine()` (it may answer `deferred`; the next sync
  retries on its own).
- **Scan** (another feature) ends with `recordProof({ morningKey: readLock().morningKey,
  kind: 'scan', at: Date.now() })` then `syncLock()`, or simply `proveMorning('scan')`.
- **Route:** `/wake` opens the routine's method; `/wake?method=downstairs` or
  `/wake?method=steps` opens that one. A routine whose method is `scan` redirects to `/scan`.

## Design decisions

### The morning gate

- **The night stays held into the morning.** Checked against `armNight`: windows only shield
  at their start, and `intervalDidEnd` for night windows has no action, so nothing unshields at
  morning start. `nightHeld` stays `true` until `syncLock` sees the phase is `day` or `off` and
  calls `wakeApps('night')`, which re-shields always-blocked, Block now and used-up limits
  straight after. A proof never lifts those (precedence untouched).
- **Bedtime always wins, enforced twice.** `proveMorning` only records in the `morning` phase,
  and `recordProof` itself refuses a stairs/steps/scan proof timed before that morning's start.
  Without the second check, 200 steps at 23:30 would have been stored under tomorrow's key
  and unlocked tomorrow at 07:00 without a walk. Passes and emergency unlocks count whenever
  they were made (a pass used the night before covers the morning).
- **Opening in `morning` (or `night`) with the night not held re-shields only if this night was
  armed before it began** (`armedAt <= night.start`). That catches a missed window or shields
  lost and restored, without locking someone who finished onboarding at 07:30 (that morning
  never had a night lock).
- **A night switched off:** see "Risky" below. `syncLock` wakes the apps whenever the phase is
  `off` or `day` and the night is held.

### Arming (`armRoutine`, `wake/arming.ts`)

- Arms the routine in force at the next bedtime (`pending ?? active`), via the existing
  `planNightWindows` budget (at most 16 of iOS's ~20 activities; nap and limits keep theirs).
  Windows only depend on the two times, so changing which nights are on doesn't re-arm.
  No nights on, or a night under 15 minutes, disarms.
- **Phantom nights.** Windows repeat daily at clock times, so arming a pending edit early can
  fire a window outside any real night. Example: morning moved 07:00 → 08:00 at 07:05 after the
  walk; the new windows start at 07:15 and 07:45 and would re-shield apps the rules say are
  awake. `planArming` checks every window start between now and the edit (and now itself,
  since iOS may run a window's start on registration). A start that's inside the current
  routine's night, or inside the new routine's night that runs past the edit, is fine (at most
  an earlier bedtime once, which only tightens). Anything else defers to that phantom night's
  end; every later `syncLock` retries.
- `syncLock` re-arms in the background whenever the plan isn't `keep`, but only if something
  was already armed. Nothing arms before onboarding's explicit call, so nothing blocks before
  purchase.
- Arming during the night shields straight away.

### Steps

- History from `Pedometer.getStepCountAsync(morningStart, now)` on open and every 10 s, plus
  `watchStepCount` live. The count is `max(history, base + live)`, never the sum, so steps in
  both sources count once. Steps walked with the app closed count. On return from the
  background it re-subscribes and re-reads history. Never HealthKit.
- **Anti-shake, light and documented:** CMPedometer's own step detection is the real filter.
  On top, credited live steps can't exceed 4 steps/s averaged since the screen opened (+8 for
  batching); history added after opening has the same cap. Brisk walking is ~2/s, running ~3/s,
  so honest walks are never trimmed. Refused steps are counted (`refused`) for a future roast.
  It won't stop shaking at a walking rhythm; downstairs is the stronger proof.

### Downstairs

- `Barometer.addListener` (expo-sensors, iOS `CMAltimeter`), `relativeAltitude` in metres
  (verified in the v57 docs: iOS only, relative to session start). ~1 Hz; we ask for 500 ms.
- Rules: baseline is the median of the first second; each reading is the median of the last
  2 s; a change of ≥ 2.5 m either way starts a hold; the hold breaks below 2.1 m or if the
  direction flips; 5 s held = met; holds can't start after 5 minutes (timed out). Only a
  reading can finish a hold, never a clock tick.
- No readings for 6 s = `noSignal`; 30 s and 10+ readings that never move by a millimetre =
  `flat` (a working sensor always jitters). Both say so plainly and make "Walk N steps
  instead" the primary button.
- The session stops if the app goes to the background (iOS pauses the altimeter); coming back
  shows Start again rather than judging a gap. The screen keeps itself awake
  (`expo-keep-awake`, added as a direct dependency; it was already installed via `expo`).

### Screens

- Monochrome Nocturne, over the same `AppBackground` sky as the tabs (moon untouched). His
  line in the heavy italic serif (`*word*` upright), body in grey, big upright serif number,
  the thin white track used on Home and Nap. No glow, no particles, no confetti. The success
  moment is a 500 ms fade: his line, "Apps awake until 11 pm", Done, a success haptic.
- Downstairs: Start → live meter (metres, direction, track, "Hold 3 s") → his lines by state.
  "Walk N steps instead" is always visible until it's met. Steps: count, track, "N more and
  your apps wake up". If the routine is downstairs, steps offers "Go downstairs instead"; if
  it's scan, both offer "Scan your code instead".
- Night: "Shh. Not yet." Day: "I'm awake. Technically." Night off: "Night off. Nothing to prove."
- No pickers, menus or sheets were needed, so no @expo/ui; the only system UI is the
  Settings deep link when Motion & Fitness is off.

## Stubbed, risky or for someone else

- **Off nights still get shielded (needs a Swift change).** The night windows repeat daily and
  the monitor extension shields at every window start whatever the weekday. On a night that's
  switched off the apps sleep anyway until Locturne is opened (then `syncLock` wakes them).
  Fix options, both outside this work: (a) in `DeviceActivityMonitorExtension.swift`, skip
  the night shield when the evening isn't in `locturne.routine`'s `activeNights` (mind the
  `pending` edit), or (b) weekday-specific schedules, which blow the ~20-activity budget unless
  windows get longer. (a) is recommended.
- **Something must call `syncLock` on every app open.** `useLock` does it while mounted. If
  Home (or the root) doesn't mount `useLock`, a stale `nightHeld` after an off night or a
  missed sync stays shielded, because `useStandingBlocks` re-applies the night list whenever
  `nightHeld` is true. Recommend Home uses `useLock()` (it needs the phase anyway).
- **app.json motion permission text** only mentions steps; downstairs uses the same Motion &
  Fitness permission. Suggest: "Locturne checks your steps and stairs each morning to wake
  your apps. That's all it uses motion for." (not my file).
- **Pending routine never re-armed if the app isn't opened** between the edit and its bedtime
  when arming was deferred. Deferral only happens for edits that move the morning later and
  are saved during or just after the morning; the old windows keep protecting meanwhile.
- **Background unlock** (shield "I'm up" button, notification actions) is not built. The
  pure detectors are ready to mirror in Swift if that spike passes.
- **Thresholds** (2.5 m, 5 s, 4 steps/s, 6 s / 30 s sensor checks) are first guesses from the
  docs, to tune from the device logs below.

## On-device test checklist

Dev build with this branch. Settings → Privacy & Security → Motion & Fitness allowed unless a
step says otherwise. "Arm" means finishing onboarding (or a lab call to `armRoutine`).

**Steps**
1. Set the routine's morning start a few minutes ahead, arm, wait for morning. Walk ~50 steps
   with Locturne closed. Open `/wake?method=steps`: the count starts at ~50, not 0.
2. Walk with the screen open: the number climbs every ~2–3 s; lines change at 40% ("I can hear
   you walking…") and 80% ("Fine. *Fine.*").
3. Reach the goal: "I'm up. Don't talk to me yet.", success haptic, "Apps awake until …".
   Open a bedtime app: no shield. An always-blocked app: still shielded.
4. Background the app halfway, walk 30 steps, return: the count includes them within ~10 s.
5. Shake the phone hard for 20 s: note how many steps CMPedometer credits (log it); compare to
   walking. Report back; this sets whether the cadence cap needs to be tighter.
6. Turn Motion & Fitness off for Locturne: the screen says so and offers Open Settings.

**Downstairs**
7. In bed, `/wake` (routine method downstairs): Start. Lie still 2 minutes: meter stays under
   ~0.3 m, never "Hold".
8. Walk down one flight with the screen on: meter climbs, "Hold 5 s" counts down at the bottom,
   unlock. Note the metres shown at the bottom. Repeat 10 times on your stairs; log the peak and
   time to unlock.
9. Walk down and straight back up: no unlock.
10. Walk upstairs from the ground floor: unlocks too.
11. Start and wait 5 minutes without moving: "Five minutes and no stairs. Start again."
12. Start, then press the side button (lock) mid-session and unlock: session reset to Start.
13. "Walk N steps instead" switches to steps and the steps already walked count.

**The gate**
14. Night: open `/wake` after bedtime: "Shh. Not yet.", no Start. Walk 200 steps at night, then
    wait for morning start: apps stay asleep until a new proof after morning start.
15. Morning already proved: `/wake` shows "I'm awake. Technically."
16. Arm in the afternoon; the first bedtime window shields with Locturne closed; next morning,
    opening the app does not wake anything before a proof.
17. Missed-window recovery: with a night armed, manually wake the bedtime list from the lab at
    02:00, then open the app: the night list is shielded again.
18. First install at 07:30 (morning, nothing armed before last night): finishing onboarding
    does not lock that morning; tonight's bedtime does.
19. Block now running, prove the morning: the nap's apps stay asleep. A used-up limit: stays.
20. Routine edit: at 14:00 move bedtime earlier, save, `armRoutine` → armed; tonight shields at
    the new time. At 07:05, after proving, move the morning to 08:00: `deferred`; no re-shield at
    07:15; after 08:00 open the app and it re-arms.
21. Switch tonight off on the Routine tab (effective tomorrow's bedtime): expect the known gap
    above, the apps shielded at bedtime that night; opening Locturne wakes them. Confirms
    the Swift fix is needed.
