# App Privacy answers (privacy "nutrition label")

Written October 3, 2026 from the code at commit 5138092,
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

## A. Today's code: no RevenueCat, no PostHog

Checked October 3, 2026:
- The app makes no network calls of its own. The only URLs it opens are Apple's
  subscriptions page and the legal pages, in Safari.
- `src/lib/purchases.ts` is a stub.
- Notifications are local.
- The extensions never configure the library's webhook, so they send nothing.
- Sharing (the scan-code PDF, the diagnostics text, the reveal message) goes through the iOS
  share sheet, by the user's choice.

**Answer:** "Do you or your third-party partners collect data from this app?" → **No, we do
not collect data from this app.** The label then reads **Data Not Collected**.

This is only right for a build with no SDKs. **A build sent to review must have a real
store**: the stub unlocks everything without a purchase, which breaks 3.1.1. In practice,
then, the first reviewed build will include RevenueCat and needs section B's answers.

---

## B. With RevenueCat and PostHog (the released app)

Answer **Yes, we collect data from this app**, then select these data types.

| Category → data type | Collected by | Purposes | Linked to user | Tracking |
|---|---|---|---|---|
| **Purchases → Purchase History** | RevenueCat (product, dates, price, trial status, App Store transaction IDs) | App Functionality, Analytics | **Yes** | No |
| **Identifiers → User ID** | RevenueCat's anonymous app user ID; PostHog's install `distinct_id` | App Functionality, Analytics | **Yes** | No |
| **Usage Data → Product Interaction** | PostHog events (screens seen, permission granted or denied, method chosen, trial started, unlocks, passes, emergency unlocks) | Analytics | **Yes** | No |
| **Diagnostics → Crash Data** | PostHog error tracking, only if exception capture is turned on | App Functionality, Analytics | **Yes** | No |
| **Diagnostics → Other Diagnostic Data** | Events like `lock_applied` and "did last night's block start", device model, iOS and app version | App Functionality, Analytics | **Yes** | No |
| **Other Data → Other Data Types** | Setup answers sent to PostHog ("how did you hear about Locturne", nights per week, minutes in bed) | Analytics | **Yes** | No |
| **Location → Coarse Location** | **Only if PostHog GeoIP stays on.** The policy currently says PostHog derives country or region from the IP address. | Analytics | Yes | No |

**Not declared:**

| Data | Why not |
|---|---|
| Fitness (steps, altitude) | Read on the device and never sent, **as long as** analytics events carry the method used ("unlocked by steps") and never the counts. See mismatch 2. |
| Screen Time selections and usage | Opaque tokens that stay in the App Group. Apple's Family Controls terms forbid sending this data anyway. |
| Camera, scan code text | On the device only. |
| Precise location, contacts, photos, health, contact info | Not used. |
| Emails sent to hello@locturne.com from a future "Send feedback" | Not declared, if it opens Mail with an empty draft the user sends themselves. That meets Apple's optional-disclosure criteria: the user provides it, it's infrequent and optional, and they choose to send it each time. |
| Device ID | No IDFA and no IDFV. Re-check that PostHog's React Native SDK doesn't read `identifierForVendor`; if it does, add **Identifiers → Device ID**. |

### Why "Linked to user: Yes" when there's no account

Apple counts data as linked if it's tied to a device-level or user-level ID, and both SDKs
key everything to a persistent install ID. RevenueCat's guidance says "No" is fine for
purely anonymous IDs. But PostHog events carry the same `distinct_id` across a whole
install, and we'd call `identify` with the RevenueCat ID to join funnels to purchases.
Answering "Linked" is the conservative, defensible choice, and the label text ("Data
Linked to You: Purchases, Identifiers, Usage Data, Diagnostics, Other") is normal for a
subscription app. **[OPINION]**

If you'd rather show "Not Linked to You", all of these must be true:
- No `identify` call.
- PostHog person profiles turned off (`personProfiles: 'never'`).
- RevenueCat kept on anonymous IDs.
- No attempt to join the two datasets.

Then answer "No" for Product Interaction, Diagnostics and Other Data. That gives up
per-user funnels.

### What changes when the SDKs ship

| Answer | Today (A) | RevenueCat only | RevenueCat + PostHog |
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
- **Set `NSPrivacyTracking` to `false`.** Once the SDKs ship, list the same collected data
  types as the label in `NSPrivacyCollectedDataTypes`. RevenueCat and PostHog ship their own
  manifests; check they're in the build's privacy report (Xcode → Archive → Generate Privacy
  Report, or ask EAS for the archive).


---

## D. Mismatches between the policy, the code and the plans

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | The policy's short version says the app "sends us two things" (RevenueCat, PostHog) as if they were already live. Today it sends nothing. Section 4 does say early builds may not include them. | privacy.html, "The short version" | Fine for the released app. Don't submit a label that claims collection the build doesn't do, or the reverse. Match the label to the build (table in B). |
| 2 | **Steps.** The policy says steps, stairs and scans "are never sent to us". LAUNCH_PLAN §5's event list includes "steps/scan progress" and `unlock_completed` with minutes from the morning start. | LAUNCH_PLAN §5 vs privacy.html §2 | Send only the method and the outcome ("unlocked by steps"), never step counts or altitude. If counts are ever sent, declare **Health & Fitness → Fitness** and rewrite the policy first. |
| 3 | **Age.** Onboarding asks for an exact age (`age` step). The policy's analytics list doesn't mention age. | steps.tsx `age`; privacy.html §4 | Keep age on the device. If it goes to PostHog, send a bracket (13–17 / 18+) and name it in the policy. An exact age of a 13-year-old in analytics is avoidable risk under COPPA and the state laws. |
| 4 | **PostHog location.** The policy says PostHog derives country or region from the IP, and has a TODO about turning IP capture off. | privacy.html §4 TODO | Pick one before submitting. Either disable GeoIP and IP capture, so there's no Coarse Location and the sentence comes out of the policy, or keep it and declare Coarse Location. |
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
