# Wake preview: every morning screen, any hour, no phone

_Added 2026-10-11._ Lets you open the **real** morning screen for each wake-up method
in a browser (or a dev build), at any time of day, with the sensors and native views
replaced by fakes. Edit the screen file, and it hot-reloads. No iOS rebuild, no waiting
for 7 am.

## On your phone: You → UI

_Added 2026-10-11._ In a dev build (`__DEV__`), the You tab has a **UI** section above
Developer: Home (morning), Walk steps, Go downstairs, Push-ups, Scan a code, Get to a
place. One tap fakes the morning and every sensor (`fakeTheMorning` in `wake-preview.ts`;
a fake you already picked in Wake preview is kept) and opens the real screen. Edit the
screen file with `npx expo start` running and it hot-reloads on the phone. For the other
states (halfway, access off, wrong code…), use Developer → **Wake preview**.

## How to use it (browser)

1. `npx expo start`, press `w`. (Web storage is in memory: every reload starts at
   onboarding. Tap **Exit**.)
2. **You** tab → Developer → **Wake preview**. (Route: `/wake-preview`. Opening it
   by URL reloads the page, so go through the app.)
3. Pick a fake for each method, then tap **Open the morning** on its card. That turns on
   the **fake morning** and opens the real screen.
4. A pass records nothing and moves no shields. It sets Time of day to "Fake morning,
   done". Open again, or set Lock back to "Fake morning" to rerun.

In a browser the fakes start **on**. On a phone they start **off** (real sensors), so
the preview only changes what you choose.

## How you can tell what's fake

- Every fake option in the controls is labelled **"Fake …"**.
- Fake views on screen carry a dashed amber **FAKE · …** tag (scan viewfinder, push-up
  camera).
- A small amber line at the bottom of the morning screens lists what is fake there,
  e.g. `FAKE: morning · pedometer · barometer`. It floats and takes no taps, so it can't
  move your layout. Turn it off with **FAKES badge on screen**.
- In code, every fake lives in `src/features/dev/wake-lab/` and its comment starts
  with FAKE.

## What's real and what's fake, per method

| Method | Screen you edit (real) | Faked | Fake lives in |
|---|---|---|---|
| Walk steps | `src/features/wake/steps-view.tsx` | Pedometer (expo-sensors CMPedometer). Fake walks 3.5 steps/s. | `fake-sensors.ts` `fakePedometer` |
| Go downstairs | `src/features/wake/downstairs-view.tsx` | Barometer (CMAltimeter) + its Motion permission. Fake: Start → ~1.5 s still → ~8 s on the stairs → the 5 s hold. | `fake-sensors.ts` `fakeStairs` |
| Push-ups (sideways is the main way; the camera screen turns its contents with the phone) | `src/features/wake/pushups-view.tsx` (and `pose-overlay.tsx`) | **Native Swift**: the Vision pose camera (`modules/pose-camera`). Fake draws a body (`lib/wake/pose-demo.ts`). | `demo-camera.tsx`, `pushups-preview.ts` |
| Scan a code | `src/features/scan/scan-screen.tsx`, camera box in `scanner.tsx` | Camera (expo-camera CameraView). Fake viewfinder has two buttons: right code, wrong code. | `fake-viewfinder.tsx` |
| Get to a place | `src/features/place/place-screen.tsx`, live map `live-map.tsx` | The GPS read (expo-location, `readFix`) and the live position (`use-live-fix.ts`). Fake **walking there** walks you in from ~900 m over 45 s. Map tiles need the next build (`PlaceSearch.area`); until then a dark grid. | `stand-ins.ts` `fakeFix` |
| All | Home, `wake-screen.tsx` | The clock: **Fake morning** makes `useLock` see a morning to prove. | `wake-preview.ts` `phase` |

With no real code or place set up (always the case in a browser), the fake morning uses
stand-ins: a code the fake viewfinder's "right code" matches, and a place called
**Fake gym**. Turn off **Stand-in code and place** to see the "There is no code" and
"There is no place" screens.

### States you can force

- **Steps:** walking, halfway there, already walked (passes on open), standing still,
  Motion & Fitness off, no step counter.
- **Downstairs:** down, up, half a floor (stalls in "moving"), times out (5 min, run
  20× fast → 15 s), stuck sensor, no readings, Motion off, no barometer.
- **Push-ups:** phone fakes: sideways (either way), upright (nudged to turn), flat, upside down; fake bodies (good reps, half reps, too
  quick, plank hold, standing, nobody, tour), phone tilt, permission and failure
  setups, rep goal, 15 s timeout, tuning numbers.
- **Scan:** fake viewfinder, asks for access first, access off.
- **Place:** walking there (live map), there, 700 m away, too vague, slow fix (4 s spinner), access off,
  approximate location, Location Services off, no answer.

## What you still need a phone for

The preview runs the real screen code. It can't show:

- **The camera feed itself** and Vision's real joint tracking (push-ups), and the real
  barcode detector.
- **iOS's own permission prompts** (the fakes skip straight to the answer).
- **SwiftUI controls** (`@expo/ui`: menus, pickers, switches). The browser shows the
  React Native fallbacks from `controls.tsx`, not the iOS ones in `controls.ios.tsx`.
- **The Shield screens** (Screen Time extension, Swift in `targets/`), and anything
  under `modules/` (moon orb, etc.).
- Exact fonts, safe areas and blur on an iPhone. The browser is close, not identical.

The wake lab (`/wake-lab?method=…`, You → Developer → "Test …") is still there for
testing the **real sensors** on a phone at any hour.
