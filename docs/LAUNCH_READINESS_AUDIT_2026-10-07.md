# Locturne launch readiness audit

October 7, 2026. Scope: blocking reliability, morning proof recovery, subscription
boundaries, release configuration and device validation. UI, styling, screen copy,
assets and existing workspace edits were left untouched.

**Locturne still needs its real iPhone gates before launch.** Six code issues were
reproduced and fixed. Automated checks exercise the rules and native callback
handling, but cannot establish that iOS delivers those callbacks overnight or that
the extension stays within its memory budget.

## Reliability fixes

| Issue | Trigger and previous behavior | Result after the fix | Regression coverage |
| --- | --- | --- | --- |
| Lost daily limit monitoring | A saved limit survived a failed registration or dropped activity. With unchanged picks and no pending edit, foreground settling never registered it again. | Foreground settling restores missing monitoring, retries refused registration on the next open, preserves today's reached mark, and leaves healthy activities alone. Stood-down limits stay stopped. | `src/lib/limit-backstops.test.ts` |
| Shields left lifted after registration failure | Settling a list unshielded its old picks, then a limit registration rejected before standing shields were reapplied. | A `finally` restores every surviving standing rule even when registration fails. | `src/lib/limit-backstops.test.ts` |
| Step counting stopped by an initial query failure | Permission and availability succeeded, but the first history query rejected. No live listener or history retry started. | Live counting starts from zero and history polling continues. Recovered history uses the existing cadence cap; a failed initial read can temporarily delay credit for earlier steps. | `src/lib/wake/step-watch.test.ts` |
| Incorrect successful night verdict | The first callback had no shield, then a later window shielded. The self-check used the first callback's time. A picked list could also conceal an explicitly absent shield. | The first callback with usable shield evidence determines timing. An explicitly unshielded or empty callback cannot establish success. | `src/lib/health.test.ts` |
| Incomplete or obsolete night schedules counted as protection | One bedtime window disappeared, or obsolete native generation names supplied the expected total count. Protection could report on; obsolete windows could prevent recovery even though Swift ignores their callbacks. | Protection checks the expected names in the committed generation. The controller replaces incomplete or obsolete generations while retaining the original armed time. Disarming still stops all generations. | `src/lib/screen-time.test.ts`, `src/lib/monitoring-recovery.test.ts` |
| Free subscriptions in an ordinary release archive | An archive outside the production EAS profile inherited `EXPO_PUBLIC_FREE_TESTING=1`. Startup enabled the entitled purchase stub. | The flag is honored only in development or with explicitly enabled preview labs. Ordinary releases use the real store when configured, otherwise the closed provider. Existing EAS production guards remain. | `src/lib/release-boundaries.test.ts` |

The notification test fixture now registers a complete night schedule with the
correct window count. Previously it claimed 16 monitored windows while supplying
only `night-0`, which correctly fails the stricter protection check.

The self-check preserves the existing treatment of older library event entries
whose shield evidence is unknown. Even modern heartbeats record aggregate shield
presence and whether the night list has picks, rather than proving every selected
app was shielded. Device checks must establish actual app blocking.

## Automated verification

The baseline had 781 JavaScript tests: 779 passed, 2 skipped. The native harness
passed 75 scenarios before changes. New regressions failed against the previous
implementation before their fixes were applied.

| Check | Result |
| --- | --- |
| Full JavaScript suite in UTC, Europe/London, Pacific/Chatham and America/Santiago | 792 tests per zone; 790 passed, 2 skipped, 0 failed |
| Full JavaScript suite in America/New_York | 792 passed, 0 skipped, 0 failed, including both DST cases |
| Native Swift harness in all five zones | 75 of 75 scenarios passed in each zone |
| Full JavaScript suite after the dependency updates | 792 tests; 790 passed, 2 skipped, 0 failed |
| Release boundary tests including two additional installed dependency regressions | 5 of 5 passed; the repository now defines 794 tests |
| TypeScript and lint | Passed |
| Expo configuration introspection | Passed |
| SDK dependency compatibility | Six patch mismatches remain, listed below |
| Dependency security audit | 0 critical findings; two underlying high severity advisories remain, reported through 21 dependency entries |

The five timezone sweeps preceded the two tooling dependency updates. The full
JavaScript suite then passed again with those updates installed. The two added
dependency regressions verify rejected malicious quoting and source-map offsets,
plus ordinary quoting and source-map lookup behavior.

The Swift harness compiles the real monitor extension and Shared.swift against
Linux framework stand-ins, and replays App Group fixtures produced by real
JavaScript entry points. It does not compile an iOS archive or verify Apple
framework behavior, callback delivery, provisioning or memory use. See
[native test limits](../native-tests/README.md).

Expo configuration introspection confirms the main app's Family Controls
entitlement and `group.com.lukelyons.locturne` App Group, Motion and Camera usage
descriptions, and the absence of `aps-environment` for local-only notifications.
This confirms generated configuration, not distribution provisioning.

The implementation follows the required
[Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and
[versioned Pedometer API](https://docs.expo.dev/versions/v57.0.0/sdk/pedometer/).
Expo documents live updates stopping in the background and the separate history
query used for iOS recovery.

## Remaining release gates

1. **Prove the lock on an iPhone.** Use an embedded-JavaScript preview build for
   three closed-app nights. Check the selected bedtime apps at bedtime and before
   opening Locturne each morning; save diagnostics and any extension crash or
   jetsam report. Prove steps walked with the app closed count, a real stairs trip
   unlocks, and always-blocked apps remain blocked after either proof. Also check
   off nights, emergency resumption, overlapping naps and limits, and revocation
   followed by restored access. The existing
   [device script](v1-build/DEVICE_TEST_SCRIPT.md) supplies the detailed runs; use
   the corrections below.
2. **Configure and test the real store.** The current `app.json` does not contain
   a valid RevenueCat Apple key. Development and preview profiles intentionally
   enable free testing, so they cannot validate billing. Complete
   [RevenueCat setup](REVENUECAT_SETUP.md), use a sandbox build with free testing
   disabled, and exercise purchase, restore, cancellation, pending approval,
   renewal and offline launch. The production profile correctly refuses a missing
   Apple key or either testing flag.
3. **Configure analytics.** The current `app.json` does not contain a valid PostHog
   key, so no events are sent. The startup integration already exists. Complete
   [analytics setup](ANALYTICS.md) and confirm first-night and first-morning events
   on a device before relying on those metrics.
4. **Resolve SDK patch drift before the release build.** `npx expo install --check`
   reports six mismatches: `@expo/ui` expects `~57.0.22`, `expo` `~57.0.27`,
   `expo-constants` `~57.0.21`, `expo-linking` `~57.0.12`,
   `expo-notifications` `~57.0.22`, and `expo-router` `~57.0.25`.
   Core SDK and UI dependency versions were left unchanged to preserve the current UI work.
   Align the SDK patches in a separate change and validate its native build.
5. **Verify public links on the phone.** Requests from this audit environment to
   `/terms`, `/privacy` and `/support` returned HTTP 403; the web tool also could
   not open them. This does not establish that users see a broken site. The
   October 4 update in [the App Review audit](APP_REVIEW_AUDIT.md) records them as
   deployed from the separate `locturne_landing` Astro project and identifies that
   project as their source of truth. Open all three from the app on the iPhone
   and confirm their content before submission. Do not redeploy stale
   `web/public` copies from this repository.
6. **Verify the production archive and profiles.** Build the current sources with
   EAS and confirm the main app and every included extension have appropriate
   distribution provisioning. The current workspace adds a `ScreenTimeReport`
   target requesting Family Controls under `.ScreenTimeReport`; the earlier
   account checklist covers the main app and the original three extensions.
   Confirm the additional ID if this target ships. Account approvals and an iOS
   compile cannot be established by Linux introspection or the native harness.

## Dependency security findings

Only two transitive package entries changed in `package-lock.json`; `package.json`
and the core Expo, React Native and UI versions did not change:

- `shell-quote` moved from 1.10.0 to 1.12.0, above the
  [1.11.0 fix for quoting after a comment token](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
  Tests confirm line terminators in a later token are rejected and normal quoting
  still works. No shell executes the adversarial input in these tests.
- `source-map-js` moved from 1.2.1 to the
  [1.2.2 fix for unreasonable indexed source-map offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
  Tests confirm invalid or excessively large offsets are rejected and normal
  source mapping still works.

The initial npm audit reported 23 affected dependency entries: 22 high severity
and 1 critical. After these updates it reports 21 high severity entries and no
critical entries. Those 21 entries propagate two underlying advisories:
[braces recursion exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
and [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
Both published advisories list no patched version as of this audit. The installed
paths run through Metro file matching and Expo CLI certificate tooling; these
findings do not by themselves establish an exploitable path in the shipped iOS
app. Track upstream fixes and assess build-tool inputs separately. npm's suggested
forced fixes include downgrades to Expo 44 and React Native 0.72, which would break
the SDK 57 version requirements.

## Device script corrections

The October 3 device script has useful scenarios, but its historical discrepancy
list is no longer a description of current code:

- Notification permission has callers in onboarding and `useAppStart`.
- Trial reminders follow the store through `followTrial` and `syncTrialEnd`.
- Swift can switch the bedtime shield to morning words while the app is closed;
  named standing shields and fallback restoration also exist.
- The early emergency-resumption race already has two minutes of settling slack.
- Re-arming the same times retains `timesSince`, and purchase state is stored in
  the App Group. The old claims about every re-arm erasing night evidence or every
  restart losing the dev subscription are obsolete.
- Saved proofs are judged against actual night timing; a blanket rule of one
  proof forever per calendar key no longer describes their replay protection.
- Current development and preview profiles skip the paywall through free testing.
  Explicitly disable that flag for the purchase scenarios.

Record the build ID, source revision, iOS version, schedule, selected test apps,
observed blocking and morning diagnostic report for each device run. A night passes
only when observed app access and the recorded evidence agree.
