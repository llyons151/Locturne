# Locturne — setup notes

Product source of truth: [GAME_PLAN.md](GAME_PLAN.md). The app is being rebuilt from
scratch; there is no app code yet. The earlier prototype is at the git tag
`rock-prototype`.
The technical notes below are earlier implementation leads, not verified SDK 57
guarantees. Check current official documentation before implementing native services.

## How iOS blocking works
Apple's Screen Time API, three frameworks:
- `FamilyControls` — permission prompt and the app picker (`FamilyActivityPicker`).
- `ManagedSettings` — puts the block screens ("shields") on the chosen apps.
- `DeviceActivity` — schedules and background monitoring, runs in an app extension.

Limits to design around:
- The shield screen allows only a title, subtitle, icon and two buttons. No custom UI,
  and it can't deep-link straight into our app.
- The apps the user picks come back as opaque tokens — our code can't see which apps
  they are.
- The APIs don't really work in the simulator. A real iPhone is required.

## Accounts and approvals
- Apple Developer Program: $99/yr.
- Family Controls entitlement: the development version works immediately. The
  distribution version is one request form per developer account (submitted
  2026-09-28). Details and status in
  [docs/ENTITLEMENT_SETUP.md](docs/ENTITLEMENT_SETUP.md).

## Build route
Development machine is Linux; Xcode only runs on macOS.

The rebuild will use Expo (React Native, TypeScript), scaffolded fresh on SDK 57, so the
working route is:

- **Expo + `react-native-device-activity` + EAS Build.** EAS compiles on cloud Macs, so
  it works from Linux. Needs a custom dev client (Expo Go can't load the Screen Time
  native code). Extension problems have to be debugged without Xcode. See the iOS feasibility section of
  [docs/VALIDATION_RESEARCH.md](docs/VALIDATION_RESEARCH.md) for its current state.

Fallback if that gets painful: a used Mac mini (~$300–500) and native Swift/SwiftUI for
the extensions.

## Gotchas
- After installing any package, stop the dev server and restart it with
  `npx expo start -c`. A server that was already running keeps compiling with its old
  setup and caches the bad output. Symptom seen on the phone: "runtime not ready …
  cannot read property 'code' of undefined" (the animation library compiled without
  its plugin).
- Don't open `localhost` links on the phone — scan the QR code from `npx expo start`.

## Native work for the current plan

- Keep scheduled and always-blocked app selections distinct. Waking Loc must
  only release scheduled restrictions.
- Persist the bedtime/morning schedule and wake state; native enforcement cannot
  depend on the dashboard remaining open.
- Evaluate native step-count access for the 200-step morning ritual, including
  historical steps since the morning start, permissions, device support, and
  background execution. Do not assume a foreground live counter handles this.
- Verify how reaching the step target can update shields when the app is closed.
  If opening Locturne is necessary, document that limitation in the experience.
- Test on a real iPhone across restarts, midnight, schedule edits, time-zone changes,
  permission changes, and overlapping restrictions.
- Resolve manual sleep, bypass, and accessibility flows from the game plan before
  implementing their enforcement rules.
