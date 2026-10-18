# Native tests: the monitor extension on Linux

The monitor extension decides what sleeps while Locturne is closed. Before these tests,
the only way to run it was a night on a real iPhone. `run.sh` compiles the real sources
(`targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift` plus the
library's `Shared.swift`) against stand-ins for Apple's frameworks (`Shims.swift`) and
runs two sets of checks.

- **`Tests.swift`: 47 scenarios** written against the extension directly. They cover:
  - bedtime windows;
  - off nights, including a window after midnight belonging to the evening before;
  - a routine edit that's due, with iOS starting the window a little early;
  - an unreadable routine (it still locks);
  - shift-worker nights;
  - the morning words and their tap;
  - overlaps (a nap, a limit or the always list holding the same app);
  - list edits that wait for bedtime, including the `empty` flag;
  - the emergency pause across the rest of the night and the next bedtime;
  - stand-down;
  - the heartbeat log;
  - the Gregorian day key;
  - a limit threshold delivered late, just after midnight (ignored);
  - the words left on the shields when a rule ends with the app closed: a nap, a night off, a
    limit's midnight or mid-day start, an emergency-paused morning (`shown(app)` runs the
    library's real lookup).
- **`Fixtures.swift`: the JS↔Swift handoff.** `src/lib/native-handoff.test.ts` drives the
  real app code: onboarding's arm, routine and list edits, a limit with Block now, the
  emergency unlock, a lapsed subscription, and both clock changes. It runs against a fake
  library that stores exactly what the library's JS stores. Each scenario becomes a JSON
  fixture: the App Group as the app left it, then every callback iOS would make with the app
  closed, and what the app's own rules (`readLock`) say should be shielded after each one.
  The Swift side replays the callbacks and must agree. This catches a renamed key, a wrong
  value type or a timing mismatch between the two halves, which neither side's unit tests
  can see.

- **`ShieldTapTests.swift`: "I'm up" on the morning shield, end to end with Locturne
  closed.** The ShieldAction extension's real `handleAction` and `locturneMorningCheck`
  (LocturneMorningCheck.swift) run against a scripted pedometer (`PedometerScript`: steps,
  floors up and down, an error, no step counter, an answer that's slow or never comes), and
  the ShieldConfiguration extension's real lookup says which words and button an app shows
  (`drawn`, `buttonType`). Each scenario is a whole night with the App Group in the shapes
  screen-time.ts writes. It covers every method: steps (at, under and over the goal, a custom
  goal), downstairs (a floor down or up with 20+ steps, a lift, no barometer), and scan,
  place and push-ups (the tap opens Locturne unless the steps are walked). It also covers the
  4-second timeout, double taps, a pass night, stand-down, the next bedtime after a
  shield-won morning, a schedule holding the same app, the always list, and category picks.
- **`WakeFixtures.swift` with `src/lib/native-wake-handoff.test.ts`: the tap across both
  halves.**
  1. The app's real code arms a night for each method and writes the shields.
  2. Swift replays the night, checks the app's own morning words and button, taps, and saves
     the App Group it leaves.
  3. The JS side reads that back with the app's readers: `currentProof`, `getMorningsWon`,
     `readLock`, and a `syncLock` that must not put the apps back to sleep.

  `run.sh` does the three in order.

```sh
npm run test:native          # this time zone
npm run test:native:tz       # the five zones test:tz uses
native-tests/run.sh handoff  # only tests whose name contains "handoff"
```

## What the copy changes

`run.sh` copies the sources into a temp folder and only:
- drops the Apple-only imports;
- routes `Date()` and `Date.now` through the harness clock;
- names the bundle;
- strips `privacy: .public` from log lines;
- in the ShieldAction files, swaps `DispatchQueue.main` for the harness's queue
  (`drainMain(seconds:)` runs what's due), and drops the `ShieldActionExtension` class, which
  only forwards each tap to `handleAction`. Its three `handle` overloads differ only by token
  type, and here every token is one type.

Everything else runs as it ships. The App Group is kept in memory (`MemoryDefaults`),
because Linux's UserDefaults hands back whole numbers as `Int`, which `as? Double` refuses.
iOS hands back an `NSNumber`, which accepts it.

## What it can't tell you

Only a real night on the phone can show these:
- whether iOS calls the extension on time, or at all;
- the memory limit (about 6 MB);
- what the shield screen really looks like;
- whether `ManagedSettingsStore` behaves the way the stand-in assumes. The stand-in keeps
  whatever was last written.
- what CoreMotion's step and floor history really says after a walk, or how long the query
  takes. `PedometerScript` answers whatever the test says.
- whether iOS redraws the shield with the new words after a tap answered `.defer`, and
  whether it calls the app or the category `handle` for an app picked as part of a category.
- whether the open-Locturne notification is delivered, and that tapping it lands on Home.

The device test script ([docs/v1-build/DEVICE_TEST_SCRIPT.md](../docs/v1-build/DEVICE_TEST_SCRIPT.md))
still covers those.

## Toolchain on this machine (Arch Linux)

You need Swift 6 from swift.org (the Ubuntu 24.04 tarball works). It needs
`libncurses.so.6`: symlink `/usr/lib/libncursesw.so.6` into a folder and put that folder on
`LD_LIBRARY_PATH`. Then point the script at the toolchain:

```sh
export SWIFT_TOOLCHAIN=~/.local/share/swift-6.2/usr LD_LIBRARY_PATH=~/.local/share/swift-6.2/lib
```

On macOS with Xcode installed, `swiftc` is already on the PATH.

## Known trap (not a bug today)

`cleanUpAfterActivity(name)` in react-native-device-activity clears every key that
*starts with* `actions_for_<name>`. So cleaning up `limit-1` would also wipe the actions of
`limit-10` to `limit-19`, and cleaning up `night-1` would wipe those of `night-10` to `night-15`.

This can't bite today:
- there are at most 5 limits (`MAX_LIMITS`);
- night windows are only ever cleaned up all together (`disarmNight`).

If either of those changes, name the activities so that none is a prefix of another.

## Robustness (`RobustnessTests.swift`)

- **Races:** a tap whose pedometer answer is still on the way while the last window's end
  arrives again, the app proves the morning on Home, a second tap answers, or the next night starts.
- **App Group data the app never meant to write:** a missing or half-typed routine, armed
  record, proofs, count, picks, schedules, nap and waiting edit. The extensions mustn't crash or
  wake apps wrongly.
- **A fuzzed week, 40 seeds:** iOS delivers every night callback early, late, twice or not at all
  (SplitMix64, so a seed replays). Each day checks: held at 3 am, locked at 7:20 against a short
  walk, one proof, bedtime apps awake by day, the always app asleep.
- **Clock edges:** a 00:00–00:15 night, an 18:00–12:00 night, and the 2026 clock changes of the
  five zones `test:native:tz` runs.

`knownBug(...)` tests print `BUG` and don't fail the run; once one passes it prints `FIXED?`.
The bad-number tests (±∞, 9.3e18, NaN times) now run every time: they used to crash the extensions, and a new crash there stops the whole run.
