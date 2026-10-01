# Family Controls entitlement setup

Written September 24, 2026. Updated September 28, 2026 after the actual request
(see "What changed" below). Apple renames portal labels from time to time, so
match by meaning if a label differs slightly.

## Status

| Item | Status |
|---|---|
| Apple Developer Program | Approved. Team ID `9N5WZT8LV3` |
| App Group and four App IDs | Registered 2026-09-28 |
| Family Controls (Distribution) request | Submitted 2026-09-28. Waiting on Apple's email to the account's iCloud address. If there's no reply by about October 19, follow up at https://developer.apple.com/contact/ |
| `ios.bundleIdentifier` in `app.json` | Set to `com.lukelyons.locturne` |

## IDs

Bundle IDs are permanent: they can't be renamed or deleted. Capabilities on an
ID can be changed at any time; the provisioning profile just gets regenerated on
the next EAS build.

| Bundle ID | Purpose |
|---|---|
| `com.lukelyons.locturne` | App |
| `com.lukelyons.locturne.DeviceActivityMonitor` | Applies and removes blocks on schedule |
| `com.lukelyons.locturne.ShieldConfiguration` | Look of the block screen |
| `com.lukelyons.locturne.ShieldAction` | Block-screen buttons (morning step check) |
| `group.com.lukelyons.locturne` | App Group: shared storage between the app and the extensions |

All four App IDs have **App Groups** (linked to `group.com.lukelyons.locturne`)
and **Family Controls (Development)** ticked. Nothing else.

A future widget is one more App ID (e.g. `com.lukelyons.locturne.Widget`) with
App Groups only. It doesn't need Family Controls because it only displays data.
Keep any state a widget might show in the App Group, not app-private storage.

## 1. Register the App Group

1. Open https://developer.apple.com/account/resources/identifiers/list/applicationGroup
2. Click **+**, choose **App Groups**, and click **Continue**.
3. Description: `Locturne shared`. Identifier: `group.com.lukelyons.locturne`.
4. Click **Continue**, then **Register**.

## 2. Register the four App IDs

Repeat for each bundle ID in the table.

1. Open https://developer.apple.com/account/resources/identifiers/list
2. Click **+**, choose **App IDs**, click **Continue**, choose **App**, and click
   **Continue**.
3. Description: for example, `Locturne` or `Locturne Shield Action`.
4. Bundle ID: **Explicit**, then enter the ID.
5. Under Capabilities, check **Family Controls (Development)** and **App Groups**.
6. Click **Continue**, then **Register**.
7. Open the new ID, click **Edit** or **Configure** next to App Groups, select
   `group.com.lukelyons.locturne`, and save.

## 3. Request distribution (once per developer account)

1. Sign in as the **Account Holder** and open
   https://developer.apple.com/contact/request/family-controls-distribution
2. The form shows only your name, email and Team ID, plus the terms. Accept and
   submit. There's no bundle ID dropdown or use-case box.
3. Apple replies by email. There's no status page or reference number.

Development builds on a registered iPhone work in the meantime. Distribution is
only needed for TestFlight and the App Store.

### What changed

The September 24 version of this doc (and VALIDATION_RESEARCH.md) said to submit
one request per bundle ID with a use-case description. On September 28 the form
was a single account-level request: "Once assigned to your developer account, you
can build apps that use the capabilities of the Family Controls Framework."
Whether each extension ID still needs separate sign-off after that is not
confirmed yet. Check each App ID after approval.

The form's terms: the app's primary purpose must be parental supervision or
personal focus/device-usage management; no use in organizational settings or on
another adult's device; device or usage data can't be shared, used for
advertising, or sent to data brokers.

### Use-case text (for App Review notes or if Apple asks)

> Locturne is a self-control app for adults who lose sleep to late-night phone use.
> The user chooses which of their own apps to restrict with FamilyActivityPicker and
> sets a bedtime and a morning start time. At bedtime, a DeviceActivityMonitor
> extension applies ManagedSettings shields to the selected apps. The apps stay
> shielded in the morning until the user walks 200 steps, measured on-device with
> CoreMotion, and then the shields are removed until the next bedtime. The
> ShieldConfiguration extension customizes the shield text, and the ShieldAction
> extension lets the user check their morning step progress from the shield. The
> user can edit their schedule, their app list, and an emergency unlock at any time.
> Authorization is requested for the individual user (.individual); the app does
> not control other people's devices. No usage data leaves the device.

## 4. After approval

1. Open each of the four App IDs. Under **Additional Capabilities**, enable
   **Family Controls (Distribution)** and save. If it's missing on an extension
   ID, that ID needs its own approval: contact Apple.
2. Regenerate provisioning profiles. EAS Build does this on the next build.
3. Add the Family Controls and App Group entitlements to the app and to each
   extension target in the Expo config or config plugin.
