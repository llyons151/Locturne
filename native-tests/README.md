# Native tests: the monitor extension on Linux

The monitor extension decides what sleeps while Locturne is closed. Before these tests,
the only way to run it was a night on a real iPhone. `run.sh` compiles the real sources
(`targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift` plus the
library's `Shared.swift`) against stand-ins for Apple's frameworks (`Shims.swift`) and
runs two sets of checks.

- **`Tests.swift`: 24 scenarios** written against the extension directly. They cover:
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
  - the Gregorian day key.
- **`Fixtures.swift`: the JS↔Swift handoff.** `src/lib/native-handoff.test.ts` drives the
  real app code: onboarding's arm, routine and list edits, a limit with Block now, the
  emergency unlock, a lapsed subscription, and both clock changes. It runs against a fake
  library that stores exactly what the library's JS stores. Each scenario becomes a JSON
  fixture: the App Group as the app left it, then every callback iOS would make with the app
  closed, and what the app's own rules (`readLock`) say should be shielded after each one.
  The Swift side replays the callbacks and must agree. This catches a renamed key, a wrong
  value type or a timing mismatch between the two halves, which neither side's unit tests
  can see.

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
- strips `privacy: .public` from log lines.

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
- there are at most 3 limits (`MAX_LIMITS`);
- night windows are only ever cleaned up all together (`disarmNight`).

If either of those changes, name the activities so that none is a prefix of another.
