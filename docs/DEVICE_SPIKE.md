# Device spike: Screen Time on a real iPhone

Started October 1, 2026. This is GAME_PLAN Step 1 and [TODO.md](TODO.md) §3: prove
blocking works on a device before building more UI.

## How the pieces fit

```
App (React Native)                      Extensions (Swift, run by iOS)
  lib/lock-state.ts   the rules            targets/ActivityMonitorExtension
  lib/screen-time.ts  calls the library      wakes at schedule boundaries, applies shields
  components/screen-time-picker.tsx        targets/ShieldConfiguration
            │                                draws the block screen
            ▼                              targets/ShieldAction
   App Group: group.com.lukelyons.locturne ◄─ handles the block screen's button
   (selections, shield text, scheduled actions)
```

At bedtime the app is usually closed, so it can't decide anything then. It pre-programs
the monitor extension ahead of time, and the library stores those instructions in the App
Group for the extension to carry out. `lock-state.ts` runs in the app: it decides what to
schedule, and when the morning unlock happens.

Apple's picker returns an opaque token, never app names. We store it under a list id
(`'night'` or `'always'`), and those ids are what `lock-state.ts` treats as "apps".

## Setup (done 2026-10-01)

- Library: `react-native-device-activity` 0.6.1, with `expo-dev-client`.
- `app.json`: the library's plugin with the Team ID and App Group, and
  `copyToTargetFolder: false`.
- `targets/`: copied from the library. Each `expo-target.config.js` sets the bundle ID
  registered with Apple. The library's default would have been `.ActivityMonitorExtension`
  instead of our `.DeviceActivityMonitor`.
- `eas.json`: `development`, `preview` and `production` profiles.
- A trial `expo prebuild` on Linux produced four targets with the right bundle IDs, Team
  ID, iOS 16.4, and Family Controls + App Group entitlements on all four. Nothing has been
  compiled yet: only EAS (macOS) can do that.

## First build: what you run

Before this, tick **Family Controls (Distribution)** on all four App IDs
([ENTITLEMENT_SETUP.md](ENTITLEMENT_SETUP.md) section 4).

1. Make a free account at expo.dev.
2. `npm i -g eas-cli`, then `eas login`.
3. `eas init` links the project. It adds an `extra.eas.projectId` to `app.json`.
4. `eas device:create`. Open the link on the iPhone and install the profile.
5. On the iPhone: Settings → Privacy & Security → Developer Mode → on (it restarts).
6. `eas build --profile development --platform ios`. Sign in with your Apple ID when
   asked, and let EAS create the certificate and the four provisioning profiles.
7. Install the build from the link EAS gives you, then run `npx expo start` on the
   laptop and open the project in the dev build (same Wi-Fi network).

## Test script

On the **You** tab, tap **Screen Time lab**:

1. **Allow Screen Time.** Expect Apple's prompt; Access becomes `approved`.
2. **Pick night apps.** Expect Apple's picker as a sheet. Pick TikTok (or anything).
3. **Put them to sleep.** Open the app: expect the shield with "Shh. I'm sleeping. So
   are they." Close Locturne completely and check that the shield stays up.
4. **Wake them.** The app opens normally again.
5. **Read this morning's steps.** Allow Motion. After 7:00, expect a count and a phase.

Write down anything that fails, with the log lines, under "Results".

## The bedtime schedule (built 2026-10-02)

- `lib/night-plan.ts` splits bedtime → morning start into equal windows of 15–45
  minutes (23:30–07:00 is ten 45-minute windows). At most 16, because iOS allows about 20
  monitored activities per app.
- `armNight()` registers each window as a daily repeating DeviceActivity schedule. When a
  window starts, the monitor extension shields the `night` list, with Locturne closed.
  Because every window re-applies the block, one missed start is covered by the next one
  within 45 minutes. That's GAME_PLAN's chaining.
- Nothing unshields at morning start. The **morning check** (`getLockState` + pedometer)
  wakes the apps once the steps reach 200.
- Arming during the night also shields straight away, rather than relying on iOS to fire
  a window that has already started.
- The lab shows **Last window start**, read from the extension's own log. That's proof iOS
  ran the block while the app was closed.

**Known gaps, on purpose for the spike:**
- Every night is on. Weekday nights-off need weekday-specific schedules, and 7 nights ×
  windows would exceed iOS's activity limit. To design after the spike.
- A Wake or emergency unlock during the night gets re-blocked at the next window start
  (bedtime wins). The real emergency unlock will need to pause the windows.
- Settings changes aren't deferred to the next night yet (the lab re-arms immediately).

**To verify on the phone:**
- Windows that cross midnight (23:30–00:15) fire. The test night won't cover this unless
  run near midnight. The first real night will.

### Test steps

1. Reload the app (no new build needed). Open the lab.
2. **Arm test night**. It starts in 2 minutes and lasts 30, in two 15-minute windows.
3. Wake the apps first if they're asleep. Then fully close Locturne and wait 2–3 minutes.
   The picked app should be blocked without you touching anything.
4. Reopen the lab. **Last window start** should show `night-0` at the start time. After
   15 minutes, `night-1`.
5. After the 30 minutes: walk 200 steps, then tap **Morning check**. It should say "apps
   woken".
6. Then **arm the real schedule** (5) with your actual bedtime, and leave it for the
   3-night test.

## Still to prove (TODO §3)

- Scheduled shields at bedtime with the app closed, chained in windows under 45 min.
- The 200-step unlock from the app, and from the shield button if that's possible.
- Revocation detection. `getAccess()` doesn't update until the app restarts.
- A nightly self-check, and light anti-shake checks.
- 3+ nights holding.

## Tested off-device (2026-10-01)

Everything Linux can check. `npm test` runs it all (about 30 s); `npm run test:tz` repeats
it in five time zones.

- **Lock rules** (`lock-state.test.ts`, `lock-state.sweep.test.ts`): hand-written cases,
  plus every 30 minutes of 2026 for 10 schedules × 5 night patterns × 3 step counts,
  compared with a separately written reference. Passed in 8 time zones, including the
  30-minute DST shift (Lord Howe), the 45-minute offset (Chatham) and a midnight DST change
  (Santiago).
  - **Bugs it found and fixed:** the first version judged "is it night?" by the time of
    day. On the night clocks go back, a 01:30 bedtime passed, the clock fell back to 01:00,
    and the app thought bedtime hadn't happened yet. Apps unlocked the previous morning
    would have woken for an hour. And `nextChange` (what the scheduler will use)
    disagreed with the phase by up to an hour. Nights are now real start and end
    instants. A bedtime the clocks skip past morning start means no night that date.
  - Mutation check: 11 of 12 deliberate bugs made the tests fail. The 12th
    (`Math.max` on steps left) can't change behaviour.
- **Wrapper** (`screen-time.test.ts`): against a fake library. Status mapping, asking for
  `individual` (never child) access, list ids, shield text, and the button only closing.
- **Generated iOS project** (`expo prebuild` on Linux): 4 targets. Correct bundle IDs,
  Team ID, iOS 16.4, Family Controls + App Group entitlements on all four, the three
  extensions embedded, and the right extension point for each. The extensions inherit the App
  Group setting from the project level. The shield keys and the 0–255 colours we send match
  what the Swift reads.
- **Web**: `/screen-time-lab`, the You tab link, Home and onboarding load with no console
  errors. The lab shows its "iPhone only" message.

**Not tested, needs EAS or the phone:** compiling the Swift. The generated project uses
Xcode 16 folder-synced groups with `objectVersion = 54`, which is normal for this plugin on
EAS but unverified here. Also untested: everything Apple-side, the picker, real shields,
and the pedometer.

## Results on the iPhone

- **2026-10-02: first development build finished on EAS** (build `c26d2c10`). The app
  and all three Swift extensions compile and sign with the Family Controls entitlement, which
  settles the `objectVersion` worry above.
- **2026-10-02: manual blocking works on the iPhone.** Through the lab: Screen Time access,
  Apple's picker, and shielding the picked apps all work. Shielded icons on the home
  screen are greyed out by iOS; apps can't change that look (see below).
- Still to check from the lab: that the shield stays up with Locturne fully closed, the
  shield's text and moon icon, Wake, and the step reading.

### To test: list edits and revocation (added 2026-10-01)

Needs a new dev build, because the monitor extension changed (`settleLocturneLists`).
1. **Removal waits for bedtime.** Put two apps in Always asleep. Remove one: the Apps tab
   should say it stays asleep until bedtime, and it should stay shielded. Add a third:
   shielded at once.
2. **Bedtime settles it with the app closed.** Arm a test night, close Locturne, and wait
   for the first window. The removed app should open; the others stay shielded.
3. **Revocation while running.** With a night armed or an always list, go to Settings →
   Screen Time and remove Locturne's access, then switch back without force-quitting. The
   You tab should say access is off. If it still says on, note whether
   `armedWindowNames()` and `isShieldActive()` in the lab changed, since those are the
   signals it relies on.

### Home-screen icons can't be customised

Asked 2026-10-02: could blocked apps show a little moon instead of being greyed out? No.
iOS draws the dimmed icon itself, and no API lets an app badge or restyle another app's
icon. What Locturne controls is the shield that appears when a blocked app is opened: the
icon (currently SF Symbol `moon.zzz.fill`), title, subtitle, colours and buttons. That's
where his moon and voice go. ManagedSettings can also hide apps from the home screen
entirely, which is a different product decision.
