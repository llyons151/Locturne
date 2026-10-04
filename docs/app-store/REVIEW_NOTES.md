# App Review notes and pre-submit checklist

Written October 3, 2026 from the code at commit 5138092. Section 1 is the text for ASC →
version → **App Review Information → Notes** (limit 4,000 characters; this is about
3,600). Section 1 was rewritten October 4, 2026 for [APP_REVIEW_AUDIT.md](../APP_REVIEW_AUDIT.md):
it now covers the emergency unlock, the always-blocked list, a declined Screen Time prompt,
when each permission is really asked, and the hidden diagnostics screen (2.3.1(a)). Section 2 says which test paths the code actually supports. Section 3 lists the
usual rejections, and section 4 checks this app against each of them.

---

## 1. Notes for review (paste)

Replace the bracketed parts before pasting.

```
WHAT LOCTURNE DOES
A self-control app for people who lose sleep to their phone. The user picks some of their own apps. At bedtime they're shielded. In the morning they stay shielded until the user proves they're out of bed: a trip downstairs (CMAltimeter), 200 steps (CMPedometer) or scanning a code kept in another room (camera). Daytime controls: always-blocked apps, "Block now" (15 min to 4 h) and daily limits.

FAMILY CONTROLS
- requestAuthorization(for: .individual): the user restricts only their own iPhone. No parental or organizational use.
- FamilyActivityPicker tokens stay in the App Group on the device. We can't see app names; no Screen Time data leaves the device.
- ManagedSettings shields, applied on schedule by a DeviceActivityMonitor extension. ShieldConfiguration sets the shield text; ShieldAction handles its buttons.
- Family Controls (Distribution) is on all four bundle IDs: com.lukelyons.locturne, .DeviceActivityMonitor, .ShieldConfiguration, .ShieldAction.

NO SIGN-IN
No accounts. Please use a real iPhone: shields and motion sensors don't work in the Simulator.

SUBSCRIPTION
The paywall is at the end of onboarding; nothing is shielded before a purchase. Locturne Annual $59.99/yr with a 7-day free trial (default), Locturne Monthly $9.99/mo. Closing the paywall exits; there's no follow-up offer. Restore: first onboarding screen, the paywall, and You > Subscription. If your sandbox account already has Locturne, tap Restore.

QUICK TEST (1 MIN)
1. In onboarding, at "Which apps keep you up?", pick one app you can open.
2. Start the free trial with your sandbox account. "Armed" appears.
3. Nap tab: 15 min, "Tuck him in". Open the picked app: the shield appears.
4. To end it: "Wake him early" on the Nap tab.

FULL TEST: NIGHT AND MORNING (ABOUT 20 MIN)
1. In onboarding set "When do you get into bed?" to 5 minutes BEFORE now and "When does your alarm go off?" about 12 minutes AFTER now (iOS needs a night of at least 15 min).
2. After purchase: "Armed. Starting now." The apps are shielded.
3. At the alarm time the morning begins. On Home, unlock with any of: "Go downstairs" > Start > one flight of stairs or a one-floor elevator ride (about 2.5 m); "Walk 200 steps instead" (about 2 min); or "Use a pass" (no walking).
4. The apps unshield until tomorrow's bedtime.
Settings changes (Routine tab) apply from the next bedtime by design, so set the short schedule during onboarding. A screen recording on a real device, with real stairs, is attached.

GETTING OUT OF A BLOCK
- You > Emergency unlock (also on Home while apps are asleep): a 10-second wait, then a confirmation. Always available: it wakes the bedtime apps (night or morning) and ends Block now.
- It never lifts the Apps tab's "Always asleep" list or a used-up daily limit, by design. Please don't add apps to it unless you're testing it.
- Turning off Locturne's Screen Time access in Settings, or deleting the app, removes all shields.

PERMISSIONS
- Screen Time: asked in onboarding before the picker. If declined, the app says nothing can be shielded without it and offers Try again and Open Settings.
- Motion & Fitness: on "Start walking" in the optional onboarding demo ("Not now" skips it), otherwise on "Armed" after purchase. If declined, scan, passes and the emergency unlock still work.
- Notifications: on "Armed" after purchase. Never required.
- Camera: only for the scan method. Nothing is recorded.

DIAGNOSTICS
A long press on the version line (bottom of the You tab) opens a read-only diagnostics screen for support. It changes nothing.

Contact: [name], [phone], hello@locturne.com
```

The exit offer is off in code for 1.0 (`EXIT_OFFER_LIVE` in `src/lib/purchases.ts`), so the
notes say closing the paywall exits. If a later version turns it on, describe it here in the
same submission; never switch it on from the dashboard after approval.

---

## 2. Does the code support a reviewer test path?

| Path | Supported today? | Evidence | Risk |
|---|---|---|---|
| **Block now → shield** | Yes | `nap-screen.tsx`: lengths start at 15 min, and the session starts immediately. | Lowest. Make this the primary path. |
| **Short night set in onboarding** | Yes, in code | Minute-precision `TimeWheel`. `planNightWindows` allows any night of 15 min or more. `armTonight` arms mid-night and returns `now: true`. | **Unproven on a device.** PRE_DEVICE_REVIEW lists "whether iOS fires `intervalDidStart` immediately when a window is registered while it's already running" as untested. Run exactly this script on a device before submitting. |
| **Morning unlock without stairs** | Yes | Every downstairs screen offers "Walk N steps instead" (`downstairs-view.tsx`). Passes and the emergency unlock work in the morning (`emergency.ts`, `/exits`). | 200 steps is fine for a reviewer. Passes are the guaranteed path. |
| **Scan in the morning** | Partial | A code can only be registered **while the apps are awake** (`scan-screen.tsx`, `registerScanCode`). A reviewer who picks Scan in onboarding and arms a night straight away has no code at the morning, so they get the `noCode` stage. | Don't tell reviewers to use Scan. Check the `noCode` stage offers steps or a pass and never strands anyone. |
| **Changing times after onboarding** | Not for tonight | The next-bedtime rule (GAME_PLAN). | Notes say so. Without that note, a reviewer will think the app is broken. |
| **Demo mode** | No | none | Not needed. Guideline 2.1 allows a built-in demo mode only with Apple's prior approval, and the paths above are real. |

**Recommendation:** no new code is required if the short-night script works on a device.
If arming mid-window doesn't shield at once, there are two options:
- **(a)** Make the notes lead with Block now and tell reviewers to set bedtime 2–3 minutes
  *ahead*, with the alarm 15 minutes after that.
- **(b)** Fix `armRoutine` to apply the night shield directly when it arms after bedtime.
  Its comment already says that's the intent.

Either way, **attach a screen recording** (App Review Information → Attachment). App Review
asks for one for features they can't easily exercise, and stairs at bedtime qualify.

---

## 3. Common rejections for Screen Time and subscription apps

| Guideline | What gets rejected | Seen in this category |
|---|---|---|
| **2.1 App Completeness** | Placeholder text, "coming soon", buttons that do nothing, crashes, IAP products not submitted with the build, a broken privacy or support URL. | The most common rejection overall. |
| **2.1 Information Needed** | Reviewer can't reach the feature (here: can't see a shield or the morning lock). | Screen Time apps without a test path get bounced for "unable to locate the feature". |
| **2.2 Beta testing** | Words like "beta", "preview" or "test" in the release build. | |
| **2.3.1 Accurate metadata** | Claims the app can't back ("impossible to bypass", "guaranteed"). Hidden features not described in the notes. | LAUNCH_PLAN already bans "unbreakable" claims. |
| **2.3.3 / 2.3.4 Screenshots and previews** | Screenshots that don't show the app in use. Device frames other than Apple's. Previews with footage from outside the app. | |
| **2.3.7 Keywords and names** | Competitor or trademarked names (TikTok, Instagram, Opal) in keywords, name or subtitle. Prices in the name. | |
| **2.5.1 Public APIs** | Using `ManagedSettings` `application.blockedApplications` to hide apps, or Screen Time use without the entitlement on every target. Apple's 2026 automated check falsely flags apps whose entitlement *is* set (838802, July–August 2026, unresolved). An app that keeps the Screen Time API after dropping its Screen Time features is flagged too (822078). | Apple Forums threads 776058, 838802, 822078. |
| **3.1.1 In-App Purchase** | Unlocking paid features without IAP, or no restore mechanism. | |
| **3.1.2 Subscriptions** | The paywall doesn't clearly show the title, length and price of each subscription. The trial terms are unclear. A per-month price is bigger than the billed price. Missing functional links to the Terms (EULA) and Privacy Policy **in the app and in the metadata**. Toggle paywalls (rejected since January 2026). | Very common. Repeated rejections when the EULA link is missing from one localization. |
| **3.1.2(a)** | A subscription with no ongoing value. | Blockers pass: blocking is an ongoing service. |
| **4.0 Design / 4.2** | Template icons, iPad layouts that are broken in compatibility mode, unfinished UI. | |
| **5.1.1(i) Privacy policy** | Policy missing, unreachable, or not covering the SDKs used. | |
| **5.1.1(ii)/(iv) Permissions** | Vague purpose strings. Asking at launch for permissions that aren't needed yet. Pre-permission screens that steer the user ("tap Allow"). | |
| **5.1.2(i)** | Requiring notifications or tracking to use the app. | |
| **5.1.1(v)** | No in-app account deletion (only when accounts exist). | n/a |
| **2.3.6 Age rating** | A rating that doesn't match the content or the EULA's minimum age. | |

---

## 4. Pre-submit checklist for Locturne

Status: ✅ done in code, ❌ gap, ⚠️ verify or decide. Most gaps are in the You tab and are
small.

### Completeness and placeholders (2.1, 2.2, 4.0)

| Check | Status | Where / fix |
|---|---|---|
| Real purchases (no stub) | ⚠️ | Updated 2026-10-04: `src/lib/purchases-start.ts` uses RevenueCat when `expo.extra.revenueCat.appleApiKey` is a real key, and `app.config.js` refuses a production EAS build without an `appl_` key. The key in `app.json` is still the placeholder, so set it before the production build. |
| You → Restore purchases works | ✅ | Calls `restore()` (2026-10-03). |
| You → Help, Send feedback, Rate | ✅ | Help opens `locturne.com/support` (`web/public/support.html`), Feedback a `mailto:hello@locturne.com`, Rate the write-review URL once `ios.appStoreUrl` is in `app.json`, Apple's prompt until then (2026-10-03). The site and the mailbox must be live before review. |
| You footer "Preview. The plan is a placeholder." | ✅ | Removed; the footer is just the version. Manage subscription shows the real plan (2026-10-03). |
| Notification toggles do something | ✅ | Saved in the App Group and fed to `planNotifications` (2026-10-03). The revoked-access warning has no switch. Trial reminder only shows during a trial. |
| "Beta diagnostics" row in the release build | ✅ | The row is gone. Testers open diagnostics by long-pressing the version line on the You tab (2026-10-03). Tell TestFlight testers. |
| App icon and splash | ❌ | `assets/expo.icon` is still the Expo template (the expo-symbol layer), and the splash is `#208AEF`. A template icon is an easy 2.1/4.0 rejection. |
| Dev screens unreachable | ✅ | The Screen Time lab and the home preview toggles are behind `__DEV__`. |
| "Calls and texts aren't touched" is accurate | ✅ | Reworded everywhere (onboarding, the picker footer, the schedule card, Nap) to "Phone calls always get through", matching the listing (2026-10-03). |
| iPad in compatibility mode | ✅ ⚠️ | `supportsTablet` isn't set, so it runs as an iPhone app on iPad. Fixed 2026-10-03: when steps can't be counted (no pedometer, or Motion & Fitness denied) the morning screen offers "Other ways to wake them" (passes, scan, emergency), so nobody is stuck; the downstairs denied state no longer loops to steps and back; onboarding's last page warns a steps user on a device with no step counter. iPads have a barometer, so stairs still work. Still to do: untick Mac (Apple silicon) and Vision Pro in ASC, and try one run on an iPad if you can borrow one. |
| No crash on first launch, permission denials and offline paywall | ✅ ⚠️ | Checked in code 2026-10-03: offers that fail to load show "The App Store isn't answering" with Try again; a failed purchase or restore says so; Screen Time refused offers Try again and Settings; camera denied offers Continue (re-ask) or Settings; motion denied shows Settings plus a way out. Still test airplane mode on the paywall on the device. |
| Privacy manifests | ✅ | Added 2026-10-03 and confirmed inside the built IPA (app and all three extensions). PRIVACY_LABELS.md §C. |

### Subscriptions (3.1.1, 3.1.2)

| Check | Status | Where |
|---|---|---|
| Billed price is the largest price on each plan | ✅ | `PlanCard`: price 19pt, per-month 14pt. |
| Length, price and trial length, plus the price after the trial, shown before purchase | ✅ | `plansStep` `terms` and `summary` ("Free until <date>, then $59.99/year"). |
| Auto-renew sentence | ✅ | `RENEWAL` constant. Consider the full Schedule 2 wording (charged to Apple Account at confirmation; renewal charged within 24 h before the end; manage in Settings). It's in the Terms and the description. **[OPINION]** It's enough as is. |
| Restore on the paywall | ✅ | `FineLink "Restore"` on the plans step. Also on onboarding's first screen. |
| Terms and Privacy links on the paywall | ✅ | Plans and exit-offer steps → `LEGAL_URLS`. |
| Terms (EULA) and Privacy links in the metadata | ✅ | LISTING.md description, plus the ASC Privacy Policy URL. |
| No trial toggle | ✅ | The "Remind me" switch is a reminder, not a trial toggle. But a switch next to plans can be misread as one: keep its label explicit about the reminder. |
| Pending (Ask to Buy) shows "waiting", never "armed" | ✅ ⚠️ | RevenueCat's payment-pending error maps to `pending`; the paywall says "Waiting for approval" and arms nothing; Home now says "Waiting for approval" too (`src/lib/pending-purchase.ts`, 48 hours) instead of a bare "Bedtime isn't scheduled"; approval arms tonight via `onEntitled`/`armIfPaid`. Still test with a sandbox Ask to Buy. |
| IAP products submitted with the version | ⚠️ | ASC: attach `locturne.annual` and `locturne.monthly` to version 1.0 under "In-App Purchases and Subscriptions". Don't attach the two exit-offer products: the offer is off in 1.0 (`EXIT_OFFER_LIVE`), and a product the reviewer can't reach has to be explained (2.1(b)). |
| Exit offer can actually be built in ASC | ⚠️ | A 14-day free trial on `locturne.annual` **can't coexist** with its 7-day introductory offer: one intro offer per product per territory. Use a separate product, a promotional offer through RevenueCat, or an offer code. **[UNVERIFIED for the best option; settle it in REVENUECAT_SETUP.md]** |
| Lock arms only after purchase | ✅ | `armTonight` runs after the paywall; `commit` skips the paywall only for people already entitled. |

### Screen Time (2.5.1) and permissions (5.1.1)

| Check | Status | Where |
|---|---|---|
| Family Controls (Distribution) on all four App IDs | ✅ | Done 2026-10-01 (ENTITLEMENT_SETUP.md). |
| Shields, not `blockedApplications` | ✅ | Checked 2026-10-03: the library and the three extensions only write `store.shield.applications` / `applicationCategories` / `webDomains`. Nothing uses `blockedApplications`, `denyAppRemoval` or `denyAppInstallation`. Re-check after upgrading the library. |
| `.individual` authorization | ✅ | Per WEBSITE.md facts and TEEN_ACCOUNTS. |
| Camera purpose string | ✅ | app.json: "...scan your wake-up code... Nothing is recorded or saved." |
| Motion purpose string (`NSMotionUsageDescription`) | ✅ | app.json. It covers both the pedometer and the barometer (`CMAltimeter`). |
| Microphone | ✅ | Disabled in the expo-camera plugin. |
| Photo library add string | ⚠️ | Needed only when the image share card ships. |
| Permissions asked in context | ✅ | Screen Time at setup. Motion on the optional walk, otherwise on `armed` after purchase. Camera only for Scan. Notifications on `armed` after purchase, with the first proven morning as a fallback if still unasked (corrected 2026-10-04). |
| Pre-permission screen | ✅ | Updated 2026-10-04: the picture of Apple's alert is gone (`apple-alert.tsx` deleted); the `screen-time` step uses words and a single "Continue". Buttons that open a system prompt no longer say "Allow" (HIG, Privacy), and the refused screen no longer tells people which alert button to pick. See [APP_REVIEW_AUDIT.md](../APP_REVIEW_AUDIT.md). |
| Nothing paid depends on optional data | ✅ | Notifications and Motion are optional. Steps fall back to passes. |

### Metadata (2.3) and legal

| Check | Status |
|---|---|
| No competitor or brand names in keywords or description | ✅ (LISTING.md) |
| No "unbreakable", "guaranteed" or "can't cheat" | ✅ (LISTING.md). Keep it out of screenshot captions too. |
| Screenshots show the real app; no third-party app logos | ⚠️ Pick **categories** (Social, Entertainment) in the picker for screenshots, so no TikTok or Instagram icons appear (SCREENSHOTS.md). |
| Privacy policy and Terms live, with no `[TODO]` | ❌ Fill in the legal name, US state, PostHog region and retention. Deploy the site. |
| Support URL live | ⚠️ Built 2026-10-03 (`web/public/support.html`); live once the site is deployed. |
| Age rating 13+ override matches the Terms | ⚠️ Owner, in ASC (LISTING.md §6). |
| Texas age signals (Declared Age Range) | ⚠️ TEEN_ACCOUNTS says it ships before launch. It isn't needed for approval, but it's a legal exposure. |
| Built with the iOS 26 SDK (required since April 28, 2026) | ✅ Expo SDK 57 on EAS uses Xcode 26. Check the build log. |
| `ITSAppUsesNonExemptEncryption: false` | ✅ app.json. |

---

## Sources

- App Review Guidelines (2.1, 2.3.x, 3.1.1, 3.1.2, 4.2, 5.1.1, 5.1.2): <https://developer.apple.com/app-store/review/guidelines/>
- Schedule 2 subscription disclosure requirements: <https://developer.apple.com/support/terms/apple-developer-program-license-agreement/#S2>
- 3.1.2 EULA and privacy link rejections: <https://developer.apple.com/forums/thread/809635>, <https://developer.apple.com/forums/thread/813493>, <https://developer.apple.com/forums/thread/786790>
- `blockedApplications` rejected under 2.5.1: <https://developer.apple.com/forums/thread/776058>
- Automated Family Controls entitlement flags (2026): <https://developer.apple.com/forums/thread/838802>, <https://developer.apple.com/forums/thread/822078>
- Toggle paywalls rejected: <https://www.revenuecat.com/blog/growth/r-i-p-toggle-paywall-we-hardly-knew-ye/>
- SDK minimums from April 28, 2026: <https://developer.apple.com/news/upcoming-requirements/>, <https://expo.dev/blog/app-store-connect-minimum-sdk-26>
- Introductory offers (one per product per territory): <https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions>
