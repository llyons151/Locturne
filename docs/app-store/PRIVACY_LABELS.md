# App Privacy answers (privacy "nutrition label")

Written October 3, 2026 from the code at commit 5138092; reasoning re-checked against the
code on October 5, 2026 (after commit a3af50c). Sources:
[web/public/privacy.html](../../web/public/privacy.html) and
[WEBSITE.md](../WEBSITE.md) "Facts the Privacy Policy rests on". ASC → your app → **App
Privacy**.

Apple's rules that decide the answers:
- **"Collect"** means sending data off the device where you or a partner can keep it for
  longer than it takes to serve the request in real time.
- **Data processed only on the device isn't collected** and isn't declared.
- **"Tracking"** means linking our data with other companies' data for ads or ad
  measurement, or sharing it with a data broker. Locturne does neither.
- **IP addresses** are declared by what you do with them, for example Coarse Location if you
  derive an approximate location from them.

The label covers the app (and its extensions) only. The website waitlist isn't part of it.

---

## A. A build with placeholder keys (dev and preview only)

Re-checked October 5, 2026. Both SDKs are in the code now: RevenueCat
(`react-native-purchases`, `src/lib/revenuecat.ts`, started by `purchases-start.ts`) and
PostHog (`posthog-react-native`, `src/lib/analytics-start.ts`). Each stays off without a real
key, and `app.json` still holds placeholders (`REPLACE_WITH_…`):
- No RevenueCat key: the dev stub in `src/lib/purchases.ts` runs and sends nothing. A
  production EAS build without an `appl_` key fails (`app.config.js`).
- No PostHog key: `startAnalytics` returns before creating a client, so no events, no
  exception capture, and no `$posthogUserId` attribute.
- Notifications are local. The extensions never load either SDK and make no network calls.
- Sharing (the scan-code PDF, the diagnostics text, the reveal message) goes through the iOS
  share sheet, by the user's choice. Other URLs open in Safari (legal pages) or Apple's
  manage-subscriptions sheet.

Such a build collects nothing (**Data Not Collected**), but it can't go to review: the stub
unlocks everything without a purchase (3.1.1). **Every reviewed build has a real RevenueCat
key, so use section B.**

---

## B. With RevenueCat and PostHog (the released app)

Answer **Yes, we collect data from this app**, then select these data types.

| Category → data type | Collected by | Purposes | Linked to user | Tracking |
|---|---|---|---|---|
| **Purchases → Purchase History** | RevenueCat (product, dates, price, trial status, App Store transaction IDs) | App Functionality, Analytics | **Yes** | No |
| **Identifiers → User ID** | RevenueCat's anonymous app user ID; PostHog's install `distinct_id` (and its own random `$device_id`, not a vendor ID). The PostHog id is also set on the RevenueCat customer as `$posthogUserId` | App Functionality, Analytics | **Yes** | No |
| **Usage Data → Product Interaction** | PostHog events (docs/ANALYTICS.md): onboarding steps viewed, answers and exits; Screen Time, Motion and notification permission results; how many apps were picked (never which); paywall views, purchases and restores; `$screen` per route; `morning_unlocked` (method, bucketed minutes after morning start), `pass_used`, `emergency_unlock`, `notification_opened`; PostHog's app lifecycle events | Analytics | **Yes** | No |
| **Diagnostics → Crash Data** | PostHog error tracking: **on** in code (`errorTracking.autocapture`: uncaught exceptions and unhandled rejections, not console) | App Functionality, Analytics | **Yes** | No |
| **Diagnostics → Other Diagnostic Data** | `night_checked` (did last night's block start: verdict, minutes late), `night_armed` (did arming tonight succeed, and why not), `offers_failed`; PostHog's device model, OS and app version, locale, time zone, screen size | App Functionality, Analytics | **Yes** | No |
| **Other Data → Other Data Types** | Every quiz answer sent to PostHog (`answerFor` in analytics.ts), as events and person properties: `nights` ("What happens most nights?"), `nightMinutes` (phone minutes in bed), `nightsPerWeek`, `morningMinutes` (phone minutes before getting up), `found` (how they heard about Locturne), `age_bracket` (13-17, 18-24, 25-34, 35+; never the age, nothing under 13), `tried` (what they've tried before), `timeBack` (what they want the time for), `method` (wake-up method). Never bedtime or wake times. | Analytics | **Yes** | No |
| **Location → Coarse Location** | **Only if PostHog GeoIP stays on.** The policy currently says PostHog derives country or region from the IP address. | Analytics | Yes | No |

**Not declared:**

| Data | Why not |
|---|---|
| Fitness (steps, altitude) | Read on the device and never sent, **as long as** analytics events carry the method used ("unlocked by steps") and never the counts. See mismatch 2. |
| Screen Time selections and usage | Opaque tokens that stay in the App Group. Apple's Family Controls terms forbid sending this data anyway. |
| Camera, scan code text | On the device only. |
| Precise location, contacts, photos, health, contact info | Not used. |
| Emails sent to hello@locturne.com from a future "Send feedback" | Not declared, if it opens Mail with an empty draft the user sends themselves. That meets Apple's optional-disclosure criteria: the user provides it, it's infrequent and optional, and they choose to send it each time. |
| Device ID | No IDFA and no IDFV. Checked 2026-10-03 in posthog-react-native 4.78.4: it sends `$device_name` from `expo-device`'s `modelName` ("iPhone 15", not the user's device name), and no vendor ID. Re-check on SDK upgrades. |

### Why "Linked to user: Yes" when there's no account

Apple counts data as linked if it's tied to a device-level or user-level ID, and both SDKs
key everything to a persistent install ID. RevenueCat's guidance says "No" is fine for
purely anonymous IDs. But PostHog events carry the same `distinct_id` across a whole
install, person profiles are on (`personProfiles: 'always'`), and the two datasets are
joined: the app never calls `identify`, but it sets PostHog's `distinct_id` on the
RevenueCat customer as `$posthogUserId`, so RevenueCat's PostHog integration sends trial
conversions, renewals and refunds to the same person.
Answering "Linked" is the conservative, defensible choice, and the label text ("Data
Linked to You: Purchases, Identifiers, Usage Data, Diagnostics, Other") is normal for a
subscription app. **[OPINION]**

If you'd rather show "Not Linked to You", all of these must be true:
- No `identify` call (true today).
- PostHog person profiles turned off (`personProfiles: 'never'`; today `'always'`).
- RevenueCat kept on anonymous IDs (true today).
- No attempt to join the two datasets (today `$posthogUserId` joins them).

Then answer "No" for Product Interaction, Diagnostics and Other Data. That gives up
per-user funnels.

### What changes when the SDKs ship

| Answer | Placeholder keys (A) | RevenueCat only | RevenueCat + PostHog |
|---|---|---|---|
| Collects data? | No | Yes | Yes |
| Purchase History | n/a | Yes | Yes |
| User ID | n/a | Yes | Yes |
| Product Interaction | n/a | No | Yes |
| Crash / Other Diagnostic Data | n/a | No | Yes |
| Other Data Types | n/a | No | Yes (setup answers) |
| Coarse Location | n/a | No | Only if GeoIP stays on |
| Tracking (any type) | n/a | No | No |

The label must match the build being reviewed. If RevenueCat is in the mid-November build
but PostHog isn't, submit the "RevenueCat only" column, then update the label the day
PostHog ships. The label can be edited at any time, without a new build.

---

## C. Privacy manifest (PrivacyInfo.xcprivacy)

These are separate from the label, but they have to agree with it.

- **Added 2026-10-03.** `app.json` → `ios.privacyManifests` (UserDefaults, `CA92.1` and
  `1C8F.1`) and a `PrivacyInfo.xcprivacy` in each `targets/` folder (`1C8F.1`). The
  extension folders are synced groups, so the file is bundled without project edits. Still
  check the archive's privacy report after the first TestFlight upload.
- **The app and every extension call `UserDefaults(suiteName:)`** (`targets/*/Shared.swift`,
  `modules/blocked-apps/ios/BlockedAppsModule.swift`). That's a "required reason" API.
  Declare `NSPrivacyAccessedAPICategoryUserDefaults` with reason `1C8F.1` (App Group shared
  with extensions) and `CA92.1` (app-only defaults) in:
  - the app, through `app.json` → `ios.privacyManifests`;
  - a `PrivacyInfo.xcprivacy` in each target folder.
- **What happens without them.** App Store Connect sends ITMS-91053 "Missing API
  declaration" warnings after upload, and since May 2024 it can refuse the build. Check the
  email after the first TestFlight upload.
- **Set `NSPrivacyTracking` to `false`.** `NSPrivacyCollectedDataTypes` in `app.json` lists
  table B's seven types (filled 2026-10-03), all linked, none tracking. If GeoIP is turned off,
  remove Coarse Location there and in the label. RevenueCat and PostHog ship their own
  manifests; check they're in the build's privacy report (Xcode → Archive → Generate Privacy
  Report, or ask EAS for the archive).


---

## D. Mismatches between the policy, the code and the plans

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | The policy's short version says the app "sends us two things" (RevenueCat, PostHog) as if they were already live. Both SDKs are in the code (2026-10-05) but send nothing until real keys replace the placeholders in app.json. Section 4 does say early builds may not include them. | privacy.html, "The short version" | Fine for the released app. Don't submit a label that claims collection the build doesn't do, or the reverse. Match the label to the build (table in B). |
| 2 | **Steps.** The policy says steps, stairs and scans "are never sent to us". LAUNCH_PLAN §5's event list includes "steps/scan progress" and `unlock_completed` with minutes from the morning start. | LAUNCH_PLAN §5 vs privacy.html §2 | Send only the method and the outcome ("unlocked by steps"), never step counts or altitude. If counts are ever sent, declare **Health & Fitness → Fitness** and rewrite the policy first. **Done 2026-10-03** ([ANALYTICS.md](../ANALYTICS.md)): events carry the method and how the walk ended, never counts. |
| 3 | **Age.** Onboarding asks for an exact age (`age` step). The policy's analytics list doesn't mention age. | steps.tsx `age`; privacy.html §4 | Keep age on the device. If it goes to PostHog, send a bracket (13–17 / 18+) and name it in the policy. An exact age of a 13-year-old in analytics is avoidable risk under COPPA and the state laws. **Done 2026-10-03:** `age_bracket` only, nothing after "under 13", and privacy.html names it. |
| 4 | **PostHog location.** The policy says PostHog derives country or region from the IP, and has a TODO about turning IP capture off. | privacy.html §4 | **Decided 2026-10-03: keep GeoIP** (country splits for TikTok traffic), declare Coarse Location, and turn on PostHog's project setting **"Discard client IP data"**, which the policy now promises. Otherwise: pick one before submitting. Either disable GeoIP and IP capture, so there's no Coarse Location and the sentence comes out of the policy, or keep it and declare Coarse Location. |
| 5 | **Heartbeat upload.** LAUNCH_PLAN §4.3 says the app "reads it and uploads it". The policy says the diagnostics report only leaves through the share sheet. | LAUNCH_PLAN vs privacy.html §2 | If heartbeat entries go to PostHog, they are Other Diagnostic Data (already in table B) and the policy should say "technical events about whether blocks started", which §4 mostly does. Never upload the selection tokens or activity names that contain list IDs. |
| 6 | **The motion permission string says** "That's all it uses motion for", but the accelerometer also turns the nap clock (`use-sideways.ts`). | app.json `motionPermission` | The accelerometer needs no permission, so this isn't a review issue. To be exact, reword it as: "Locturne checks your steps and stairs each morning to wake your apps." |
| 7 | ~~**Privacy manifest** missing (section C).~~ Added 2026-10-03. | app.json, targets/ | Check the privacy report on the first upload. |
| 8 | **Placeholders** in the policy: legal name, PostHog region and retention, postal address. | privacy.html | Fill them before the URL goes into ASC. A policy with `[TODO]` in it is a 2.1 and 5.1.1(i) risk. |
| 9 | **The share card (planned) will be an image.** The iOS share sheet's "Save Image" needs `NSPhotoLibraryAddUsageDescription`, or the app crashes. Today's shares are a PDF and text, so they don't need it. | future share card | Add the usage string in the same change that adds the card. |

Everything else in the policy matches the code:
- No HealthKit.
- No precise location.
- Local notifications only, no push token.
- Camera reads codes only, and nothing is recorded.
- Tokens are never resolved to names.
- The extensions make no network calls.
- No ads and no IDFA.

---

## Sources

- App privacy details, definitions of collect, linked, tracking, data types and IP handling: <https://developer.apple.com/app-store/app-privacy-details/>
- RevenueCat's App Privacy guidance: <https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy>
- Guideline 5.1.1(i), privacy policy contents: <https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage>
- Privacy manifests and required-reason APIs: <https://developer.apple.com/documentation/bundleresources/privacy-manifest-files>, <https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api>
- Expo privacy manifests: <https://docs.expo.dev/guides/apple-privacy/>
