# App Review notes and pre-submit checklist

Written October 3, 2026 from the code at commit 5138092. Section 1 is the text for ASC →
version → **App Review Information → Notes** (limit 4,000 characters; this is about
3,300). Section 2 says which test paths the code actually supports. Section 3 lists the
usual rejections, and section 4 checks this app against each of them.

---

## 1. Notes for review (paste)

Replace the bracketed parts before pasting.

```
WHAT LOCTURNE DOES
Locturne is a self-control app for people who lose sleep to their phone. The user picks some of their own apps. At bedtime those apps are shielded. In the morning they stay shielded until the user proves they are out of bed: a trip downstairs (barometer, CMAltimeter), 200 steps (CMPedometer), or scanning a code they keep in another room (camera). Then the apps unshield until the next bedtime. There are also daytime controls: always-blocked apps, "Block now" for 15 min to 4 h, and daily limits.

HOW WE USE FAMILY CONTROLS
- AuthorizationCenter.requestAuthorization(for: .individual). The user restricts only their own iPhone. No parental or organizational use.
- FamilyActivityPicker returns opaque tokens. They stay in the App Group on the device. We can't see app names, and no Screen Time data leaves the device.
- ManagedSettings shields (shield.applications / applicationCategories), applied by a DeviceActivityMonitor extension on schedule, so blocking works with the app closed.
- ShieldConfiguration customizes the shield text. ShieldAction handles the shield buttons.
- Family Controls (Distribution) is enabled on all four bundle IDs: com.lukelyons.locturne, .DeviceActivityMonitor, .ShieldConfiguration, .ShieldAction.

NO SIGN-IN
There are no accounts. Use any device. Please use a real iPhone: Screen Time shields and the motion sensors don't work in the Simulator. On iPad, step counting isn't available, and the app offers stairs or scan instead.

SUBSCRIPTION
The lock is set up after the paywall at the end of onboarding. Products: Locturne Annual $59.99/yr with a 7-day free trial (default), Locturne Monthly $9.99/mo. If you close the paywall, a one-time offer may appear: [14 days free on Annual / Annual at $29.99]. Restore is on the paywall and in You > Subscription. Your sandbox account is charged nothing.

QUICK TEST: SEE A SHIELD IN ABOUT 1 MINUTE
1. Go through onboarding. At "Which apps keep you up?", pick one app you can open, for example a category or one installed app.
2. Start the free trial with your sandbox account. "Armed" appears.
3. Open the Nap tab, choose 15 min and tap "Tuck him in". Open the picked app: Locturne's shield appears.
4. To end it early: "Wake him early" on the Nap tab, then confirm.

FULL TEST: NIGHT AND MORNING IN ABOUT 20 MINUTES
1. During onboarding, set "When do you get into bed?" to 5 minutes BEFORE the current time, and "When does your alarm go off?" to about 12 minutes AFTER it. A night must be at least 15 minutes, because iOS won't schedule a shorter one.
2. After the purchase, the app says "Armed. Starting now." The picked apps are shielded immediately.
3. At the alarm time the morning begins. The apps stay shielded. On Locturne's Home tab, use any of these to unlock:
   a) "Go downstairs", then Start, then one flight of stairs (up or down) or an elevator ride of one floor. A change of about 2.5 m counts.
   b) "Walk 200 steps instead": about 2 minutes of walking.
   c) No walking: "Use a pass" on Home. This is the sick-day path.
4. The apps unshield. They will shield again at tomorrow's bedtime.
Settings changes made later (Routine tab) apply from the next bedtime, by design. Please set the short schedule during onboarding.

A screen recording of the full flow on a real device, including real stairs, is attached.

PERMISSIONS
Screen Time (to shield apps), Motion & Fitness (asked after purchase, for steps and stairs), Camera (only for the scan method; nothing is recorded), Notifications (asked after the first night, never required).

Contact: [name], [phone], hello@locturne.com
```

Fill in the exit-offer line with the arm that's live in the reviewed build (`DEFAULT_EXIT_ARM`
is `longer-trial` today), or delete the sentence if remote config sets `none` for review.

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
| **2.5.1 Public APIs** | Using `ManagedSettings` `application.blockedApplications` to hide apps, or Screen Time use without the entitlement on every target. Apple's 2026 automated check falsely flags apps whose entitlement *is* set. | Apple Forums threads 776058, 838802, 822078. |
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
| Real purchases (no stub) | ❌ | `src/app/_layout.tsx` sets `createDevPurchases`. The paywall then shows "Preview: nothing is charged." Ship only with the RevenueCat provider (in progress in another worktree). |
| You → Restore purchases works | ❌ | `you-screen.tsx` calls `notLive('Restore purchases')`, which shows "This isn't live yet." Wire it to `restore()`. |
| You → Help, Send feedback, Rate | ❌ | All three are `notLive` alerts. Point Help at `locturne.com/support`, Feedback at a `mailto:hello@locturne.com`, and Rate at `StoreReview.requestReview()` or the write-review URL. Otherwise remove the rows. |
| You footer "Preview. The plan is a placeholder." | ❌ | Remove it. Show the real plan from the entitlement; "Manage subscription" hardcodes `value="Annual"`. |
| Notification toggles do something | ❌ | `alerts` is local `useState`. Wire the toggles to the scheduler, or hide them for 1.0. |
| "Beta diagnostics" row in the release build | ⚠️ | Rename it "Diagnostics" (2.2), or show it only in TestFlight builds. |
| App icon and splash | ❌ | `assets/expo.icon` is still the Expo template (the expo-symbol layer), and the splash is `#208AEF`. A template icon is an easy 2.1/4.0 rejection. |
| Dev screens unreachable | ✅ | The Screen Time lab and the home preview toggles are behind `__DEV__`. |
| "Calls and texts aren't touched" is accurate | ⚠️ | Only true if the user doesn't pick Messages. Reword it. |
| iPad in compatibility mode | ⚠️ | `supportsTablet` isn't set, so it runs as an iPhone app on iPad, and reviewers sometimes test there. iPads have no pedometer, so check that the steps screen and the onboarding motion prompt degrade cleanly there. Untick Mac (Apple silicon) and Vision Pro availability in ASC. |
| No crash on first launch, permission denials and offline paywall | ⚠️ | `storeStep` handles offers that fail to load. Test airplane mode on the paywall. |
| Privacy manifests | ❌ | See PRIVACY_LABELS.md §C. |

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
| Pending (Ask to Buy) shows "waiting", never "armed" | ⚠️ | `PurchaseResult` has `pending`. Check the UI with a sandbox Ask to Buy. |
| IAP products submitted with the version | ⚠️ | ASC: attach both subscriptions (and the exit-offer product) to version 1.0 under "In-App Purchases and Subscriptions". |
| Exit offer can actually be built in ASC | ⚠️ | A 14-day free trial on `locturne.annual` **can't coexist** with its 7-day introductory offer: one intro offer per product per territory. Use a separate product, a promotional offer through RevenueCat, or an offer code. **[UNVERIFIED for the best option; settle it in REVENUECAT_SETUP.md]** |
| Lock arms only after purchase | ✅ | `armTonight` runs after the paywall; `commit` skips the paywall only for people already entitled. |

### Screen Time (2.5.1) and permissions (5.1.1)

| Check | Status | Where |
|---|---|---|
| Family Controls (Distribution) on all four App IDs | ✅ | Done 2026-10-01 (ENTITLEMENT_SETUP.md). |
| Shields, not `blockedApplications` | ✅ ⚠️ | `blockSelection` from react-native-device-activity. Grep the library's Swift before submitting to confirm it writes `shield.applications`, not `application.blockedApplications`. |
| `.individual` authorization | ✅ | Per WEBSITE.md facts and TEEN_ACCOUNTS. |
| Camera purpose string | ✅ | app.json: "...scan your wake-up code... Nothing is recorded or saved." |
| Motion purpose string (`NSMotionUsageDescription`) | ✅ | app.json. It covers both the pedometer and the barometer (`CMAltimeter`). |
| Microphone | ✅ | Disabled in the expo-camera plugin. |
| Photo library add string | ⚠️ | Needed only when the image share card ships. |
| Permissions asked in context | ✅ | Screen Time at setup. Motion after purchase. Camera only for Scan. Notifications after the first good night. |
| Pre-permission screen | ⚠️ | The `screen-time` step shows a picture of Apple's alert pointing at "Continue". Our button is a neutral "Continue" that leads straight to the real prompt, which is the pattern Apple accepts. Low risk. If 5.1.1(iv) is cited, remove the pointer. |
| Nothing paid depends on optional data | ✅ | Notifications and Motion are optional. Steps fall back to passes. |

### Metadata (2.3) and legal

| Check | Status |
|---|---|
| No competitor or brand names in keywords or description | ✅ (LISTING.md) |
| No "unbreakable", "guaranteed" or "can't cheat" | ✅ (LISTING.md). Keep it out of screenshot captions too. |
| Screenshots show the real app; no third-party app logos | ⚠️ Pick **categories** (Social, Entertainment) in the picker for screenshots, so no TikTok or Instagram icons appear (SCREENSHOTS.md). |
| Privacy policy and Terms live, with no `[TODO]` | ❌ Fill in the legal name, US state, PostHog region and retention. Deploy the site. |
| Support URL live | ❌ `/support` doesn't exist yet. |
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
