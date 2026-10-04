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

build="${TMPDIR:-/tmp}/locturne-native-tests"
rm -rf "$build" && mkdir -p "$build"

for file in Shared.swift DeviceActivityMonitorExtension.swift; do
  { printf '#if canImport(FoundationNetworking)\nimport FoundationNetworking\n#endif\n'
  sed -E \
    -e '/^import (DeviceActivity|FamilyControls|ManagedSettings|NotificationCenter|UIKit|WebKit|os)$/d' \
    -e 's/\bDate\(\)/harnessNow()/g' \
    -e 's/\bDate\.now\b/harnessNow()/g' \
    -e 's/Bundle\.main\.bundleIdentifier!/"com.lukelyons.locturne.test"/' \
    -e 's/, privacy: \.public\)/)/g' \
    "$src/$file"; } >"$build/$file"
done

# All the copies of Shared.swift must be the same file: the tests run one of them.
for other in "$root"/targets/*/Shared.swift; do
  cmp -s "$other" "$src/Shared.swift" || { echo "targets differ: $other" >&2; exit 1; }
done

swiftc -swift-version 5 -suppress-warnings -o "$build/native-tests" \
  "$here/Shims.swift" "$build/Shared.swift" "$build/DeviceActivityMonitorExtension.swift" \
  "$here/Harness.swift" "$here/Tests.swift" "$here/Fixtures.swift" "$here/main.swift"

# The handoff fixtures: the real app code's App Group writes, in this time zone.
cd "$root"
NATIVE_FIXTURES="$build/fixtures" node --test --experimental-test-module-mocks --test-reporter=dot \
  src/lib/native-handoff.test.ts >/dev/null

NATIVE_FIXTURES="$build/fixtures" "$build/native-tests" "$@"
