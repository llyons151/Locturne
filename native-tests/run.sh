#!/usr/bin/env bash
# Compiles the real monitor-extension Swift (targets/ActivityMonitorExtension) against the
# stand-ins in Shims.swift and runs the scenarios in Tests.swift, then replays the handoff
# fixtures that src/lib/native-handoff.test.ts writes (Fixtures.swift). Linux or macOS, Swift 6.
#
# The sources are copied, not edited. The copy only:
#   - drops the Apple-only imports (Shims.swift stands in for them), keeping Foundation;
#   - routes `Date()` and `Date.now` through the harness clock, so a test can step a night;
#   - names the bundle, which Linux has none of;
#   - drops `os` log interpolation options (`privacy: .public`), which the Logger stand-in
#     doesn't take.
# Everything else, the library's Shared.swift included, runs exactly as it ships.
#
# Usage: native-tests/run.sh [name filter]   (needs `swiftc` on PATH, or SWIFT_TOOLCHAIN=<usr dir>)
#        TZ=Pacific/Chatham native-tests/run.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$here")"
src="$root/targets/ActivityMonitorExtension"

if [[ -n "${SWIFT_TOOLCHAIN:-}" ]]; then export PATH="$SWIFT_TOOLCHAIN/bin:$PATH"; fi
if ! command -v swiftc >/dev/null; then
  echo "swiftc not found: put it on PATH or set SWIFT_TOOLCHAIN (see native-tests/README.md)" >&2
  exit 1
fi

# Independent reviewers and timezone checks may run concurrently.
build="$(mktemp -d "${TMPDIR:-/tmp}/locturne-native-tests.XXXXXX")"

# The ShieldAction extension's own files ("I'm up" on the morning shield) and the
# ShieldConfiguration extension's lookup (the words and button an app shows) run too: their
# Shared.swift and Locturne.swift are the same files (checked below). They also lose
# CoreMotion and ManagedSettingsUI, and `DispatchQueue.main` becomes the harness's queue.
copy() {
  { printf '#if canImport(FoundationNetworking)\nimport FoundationNetworking\n#endif\n'
  sed -E \
    -e '/^import (CoreMotion|DeviceActivity|FamilyControls|ManagedSettings|ManagedSettingsUI|NotificationCenter|UIKit|WebKit|os)$/d' \
    -e 's/\bDate\(\)/harnessNow()/g' \
    -e 's/\bDate\.now\b/harnessNow()/g' \
    -e 's/DispatchQueue\.main\./harnessMain./g' \
    -e 's/Bundle\.main\.bundleIdentifier!/"com.lukelyons.locturne.test"/' \
    -e 's/, privacy: \.public\)/)/g' \
    "$1"; } >"$build/$(basename "$1")"
}
for file in Shared.swift Locturne.swift DeviceActivityMonitorExtension.swift; do copy "$src/$file"; done
copy "$root/targets/ShieldAction/LocturneMorningCheck.swift"
# Without the delegate class at its end, which only forwards each tap to `handleAction`.
copy "$root/targets/ShieldAction/ShieldActionExtension.swift"
sed -i '/^class ShieldActionExtension: ShieldActionDelegate/,$d' "$build/ShieldActionExtension.swift"
copy "$root/targets/ShieldConfiguration/ShieldConfigurationExtension.swift"

# All the copies of Shared.swift and Locturne.swift must be the same file: the tests run one of them.
for shared in Shared.swift Locturne.swift; do
  for other in "$root"/targets/*/"$shared"; do
    cmp -s "$other" "$src/$shared" || { echo "targets differ: $other" >&2; exit 1; }
  done
done

swiftc -swift-version 5 -suppress-warnings -o "$build/native-tests" \
  "$here/Shims.swift" "$build/Shared.swift" "$build/Locturne.swift" "$build/DeviceActivityMonitorExtension.swift" \
  "$build/ShieldActionExtension.swift" "$build/LocturneMorningCheck.swift" "$build/ShieldConfigurationExtension.swift" \
  "$here/Harness.swift" "$here/Tests.swift" "$here/ShieldTapTests.swift" "$here/RobustnessTests.swift" "$here/Fixtures.swift" "$here/WakeFixtures.swift" "$here/main.swift"

# The handoff fixtures: the real app code's App Group writes, in this time zone. The wake
# fixtures go under fixtures/wake: a night per wake-up method and a tap on its shield.
cd "$root"
NATIVE_FIXTURES="$build/fixtures" node --test --experimental-test-module-mocks --test-reporter=dot \
  src/lib/native-handoff.test.ts src/lib/native-wake-handoff.test.ts >/dev/null

# A failing scenario still leaves the others' App Groups to read back, so read them, then fail.
status=0
NATIVE_FIXTURES="$build/fixtures" NATIVE_WAKE_RESULTS="$build/wake-out" "$build/native-tests" "$@" || status=$?

# The App Group each shield tap left, read back by the app's own code (proof, count, Home's
# phase, the next sync). Only when the Swift run saved some (a name filter may skip them).
if [[ -d "$build/wake-out" ]]; then
  if ! out=$(NATIVE_WAKE_RESULTS="$build/wake-out" node --test --experimental-test-module-mocks --test-reporter=dot \
    --test-name-pattern="reads what the shield left" src/lib/native-wake-handoff.test.ts 2>&1); then
    echo "$out" >&2
    echo "FAIL the app's reading of the shield's App Group (src/lib/native-wake-handoff.test.ts)"
    exit 1
  fi
  echo "ok   the app reads the App Group every shield tap left ($(ls "$build/wake-out" | wc -l) scenarios)"
fi
exit "$status"
