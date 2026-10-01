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

## Still to prove (TODO §3)

- Scheduled shields at bedtime with the app closed, chained in windows under 45 min.
- The 200-step unlock from the app, and from the shield button if that's possible.
- Revocation detection. `getAccess()` doesn't update until the app restarts.
- A nightly self-check, and light anti-shake checks.
- 3+ nights holding.

## Results

Nothing yet.
