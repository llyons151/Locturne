# Track 4: iOS platform mechanics and App Review risk in Locturne's onboarding

Researched 2026-10-03. Scope: the system mechanics that decide whether a person who
*wants* to finish onboarding can finish it (FamilyControls authorization, Apple's picker,
the purchase sheet, Motion and notification prompts), what DeviceActivityReport can and
can't do for a "real data" reveal, Custom Product Pages and pre-orders, and App Review
risk screen by screen.

Evidence grades used: **[APPLE]** Apple docs, guideline text, WWDC or Apple staff;
**[REPORT]** a developer or press report (single app or anecdote); **[BENCH]** a vendor
benchmark; **[CODE]** read in this repo; **[UNVERIFIED]** couldn't confirm. No A/B tests
with numbers exist in public for most of these platform questions. Where I say so, the
evidence is thin.

Note: the shared web-search budget ran out partway through this track. Cold-start and
app-size data come from Apple's WWDC guidance and my general knowledge, and are marked as such.

Repo docs already cover some of this: `docs/TEEN_ACCOUNTS.md` (teen authorization, Ask to
Buy, state laws), `docs/APP_PICKER_RESEARCH.md` (the picker) and `docs/ONBOARDING_CONVERSION.md`
(it notes the DeviceActivityReport idea as unverified). I build on those and don't repeat
them. **Where I disagree with them, I say so.**

---

## 0. Ranked changes (summary)

| # | Change | Screen | Why | Impact | Confidence |
|---|---|---|---|---|---|
| 1 | **Fix "your answers stay on your phone."** It's false: every quiz answer goes to PostHog as events and person properties (`docs/ANALYTICS.md`, "All quiz answers are also set on the person"). Either stop sending the answers, or change the copy to "Your answers help me set things up. No names, no contacts." Also fill in the App Privacy label and `NSPrivacyCollectedDataTypes`, which is currently empty in `app.json`. | `deal` | Guideline 5.1.1(i)/(ii) and 5.1.2. A statement in the UI that contradicts the privacy label is a rejection or FTC risk. | Avoids rejection or removal | High |
| 2 | **Remove the finger, or the whole mock alert.** HIG: "Don't show an image of the standard alert and modify it in any way. Don't add a visual cue that draws people's attention to the system alert's Allow buttons." `AppleAlertPicture` is a scaled, dimmed copy with a bobbing finger on "Continue". Keep the one "Continue" button, which is already right. | `screen-time` | HIG text plus a live 5.1.1(iv) rejection wave in 2026 | Avoids rejection. Little conversion cost (see §1.4) | Medium-high on risk. Medium on the conversion effect |
| 3 | **Make the trial reminder real.** The paywall promises "Remind me 2 days before it ends" (on by default), but notifications are only requested after the first successful night. If that night never comes, or the person says no, the reminder never fires. At purchase, request **provisional** authorization (no prompt; quiet delivery to Notification Center). Then count provisional as "not yet asked" so the full prompt still shows after the first night. | `plans` → `armed` | It's a promise made next to the price. A missed reminder means chargebacks, 1-star reviews and 3.1.2 trust problems | Fewer refunds, lower review risk | High |
| 4 | **Turn on Billing Grace Period (16 days, All Renewals, including trial conversions)** in App Store Connect. | none (App Store Connect) | Gen Z and teens often pay with Apple Balance or gift cards, so the day-7 charge fails more often. Grace period keeps access while Apple retries. | Recovers some trial→paid conversions | High that it helps. Size unknown |
| 5 | **Map FamilyControls errors to separate screens, and log the error code.** Today every error collapses into "refused" (`onboarding-flow.tsx` catch → `getAccess()`). Add `screen_time_access {result, error}` so we learn the real teen, MDM and passcode failure rate. | `screen-time` | Can't size the teen risk without it. "Don't Allow" leaves status `.notDetermined` and re-asking shows the prompt again, so a "Try again" works | Saves recoverable users. Gives data | High |
| 6 | **Keep Screen Time and the picker before the paywall** (current order). Don't move it after purchase. | order | Failures (teen, MDM, no passcode) show up *before* money is taken. The setup builds investment. Opal does the same | Avoids refunds | Medium-high |
| 7 | **Spike a DeviceActivityReport "receipts" card** (§3). It's view-only, and history from before authorization is unverified. If the spike shows ≥3 days of history, add a native card after `screen-time` ("Last night you were on your phone until 1:12 AM. First pickup: 6:48."). If it shows none, use it for the day-5 trial recap instead. | after `screen-time`, or trial day 5 | Could be the strongest "aha" in the category, but feasibility is unproven | Potentially large | Low until the spike |
| 8 | **Make the billed price the most prominent price on the exit-offer screen**, and tone down "free" in headings. The `declined` headline "Fair. Two free weeks, then." is the biggest text, and $59.99 sits in body copy. On `plans`, "Try Locturne free" (title size) is bigger than "$59.99/year" (17 pt). | `plans`, `declined` | Apple's 2026 3.1.2 rejections: the trial must not be "more clear and conspicuous than the billed amount" | Avoids rejection | Medium |
| 9 | **Consider a static line instead of the "Remind me" toggle** ("I'll remind you on [date]. Two days before it charges."). | `plans` | Since January 2026 reviewers reject trial *toggles*. A reminder toggle isn't one, but it's the same visual pattern. Static text removes the question and keeps the promise | Low risk reduction | Low-medium |
| 10 | **Add a Declared Age Range check (expo-age-range)** only where `isEligibleForAgeFeaturesAsync()` is true (Texas and later Utah, Louisiana and California). Keep the age wheel for personalization, but send only the bracket to analytics (already the case). **Don't** replace the wheel with Apple's prompt for everyone. | launch, `age` | It's legal compliance, and Expo ships the module. A system sheet in the quiz is friction | Compliance | Medium-high |
| 11 | **Message match through Custom Product Pages with deep links** (iOS 18+): one CPP per video angle, deep link `locturne://onboarding?angle=downstairs` to swap the `hello` line, preselect `method`, and set a PostHog super property. | `hello`, `method` | Apple reports +2.5 pts conversion on average for CPPs. The deep link only fires when the person taps **Open** in the App Store | Medium, on store conversion | Medium |
| 12 | **Pre-order installs:** detect `AppTransaction.preorderDate` and have Loc acknowledge it ("You pre-ordered a raccoon. Bold."). Expect weaker intent, because the app downloads itself on release day. | `hello` | Context-free opens | Small | Low-medium |
| 13 | **Picker resilience:** if the picker closes with 0 picks, show a one-line hint ("Apple's list can freeze when you search. Scroll instead."). Test the iOS 18.4+ bug where dismissing the picker also dismisses the sheet that presented it. | `apps` | Known picker crashes and freezes before iOS 26 | Small–medium | Medium |
| 14 | **Measure cold start** to the first frame of `hello` (Apple's target: first frame within 400 ms). Don't block on RevenueCat, PostHog or offer fetches (they're already non-blocking). Check that loading the serif font doesn't hold the splash. | `hello` | Every exit on screen 1 is pure loss | Small unless slow | Medium |

---

## 1. FamilyControls authorization (`screen-time`, step 21)

### 1.1 Exact UX

1. Our pre-screen ("I need Screen Time access.") with **Continue**. **[CODE]**
2. iOS alert: "'Locturne' Would Like to Access Screen Time", with the message about activity
   data, restricting content and limiting apps, and the buttons **Continue** and **Don't Allow**. **[APPLE]**
3. After Continue, a second system step asks for Face ID, Touch ID or the device passcode.
   That step also has a way to back out ("Continue → Don't Allow" is described as a
   two-screen flow). **[REPORT]** [forum 747915](https://developer.apple.com/forums/thread/747915)
4. If no device passcode is set, the request fails with `authenticationMethodUnavailable`. **[APPLE]**
   [FamilyControlsError](https://developer.apple.com/documentation/familycontrols/familycontrolserror)

So the person goes through two system decisions plus biometrics. That's heavier than any
other permission in the flow.

### 1.2 Known API behaviour that matters for the funnel

- **"Don't Allow" leaves `authorizationStatus` at `.notDetermined`, not `.denied`.**
  Calling `requestAuthorization()` again shows the dialog again (reported on iOS 17.4–18.3.1;
  Apple hasn't replied). **[REPORT]** [forum 747915](https://developer.apple.com/forums/thread/747915)
  → A refusal on this screen is **recoverable in-app**. The `refused` state should offer a
  real "Try again" that calls the prompt again, not a trip to Settings. In Loc's voice: *"You
  said no. Bold. Tap Continue and say yes this time."* Plain version: "Locturne can't put apps
  to sleep without it."
- Revoking access in Settings doesn't update the status while the app is running.
  `src/lib/screen-time.ts` already re-checks on foreground. **[REPORT/CODE]**
- `.individual` doesn't work on the Simulator (error code 3, `invalidArgument`). **[REPORT]**

### 1.3 Failure modes and how big they are

| Mode | What happens | How common | Source |
|---|---|---|---|
| Teen on a Family Sharing child account, parent hasn't restricted Screen Time | `.individual` probably works. Apple says it's "available for all users", but **no device test confirms it** | See §1.5 | [APPLE] [forum 716531](https://developer.apple.com/forums/thread/716531); TEEN_ACCOUNTS.md |
| Teen with parental Screen Time restrictions and a Screen Time passcode | Might return `restricted`, might ask for the parent's passcode. **[UNVERIFIED]** | Pew: 47% of parents of 13–17s limit their teen's phone time (62% at 13–14, 37% at 15–17). Not all of that uses Apple Screen Time | [Pew 2024](https://www.pewresearch.org/internet/2024/03/11/how-teens-and-parents-approach-screen-time/) |
| No device passcode | `authenticationMethodUnavailable` | Rare. Unknown % | [APPLE] |
| MDM-supervised work or school phone | `.child` is explicitly blocked under MDM. For `.individual`, MDM restrictions can block it as `restricted` **[UNVERIFIED]** | Low among Gen Z personal phones | [forum 724627](https://developer.apple.com/forums/thread/724627) |
| Another app holds `.child` authorization (`authorizationConflict`) | Applies to `.child`. Doesn't block `.individual` (any number of apps can hold it) | n/a | [WWDC22](https://developer.apple.com/videos/play/wwdc2022/110336/) |
| No network | `networkError` | Rare | [APPLE] |
| "Screen Time permission stuck forever" | Fixed in iOS 17.6+ according to one sec's help pages | Old iOS only | [one sec help](https://tutorials.one-sec.app/en/articles/3036354) |

**No developer has published a denial rate for the authorization prompt itself.** The only
published funnel number nearby is Habit Doom's: **about 35% of installs granted Screen Time
permission and then never selected a single app.** [REPORT] [habitdoom](https://habitdoom.com/blog/shipping-familycontrols-ios)
That makes *picking* the leakiest part, not authorizing. Locturne already makes "Add apps"
the primary action when nothing is picked. Keep it that way.

### 1.4 The mock of Apple's alert (`apple-alert.tsx`). I disagree with the current design

Apple's HIG, Privacy → "Requesting permission", verbatim **[APPLE]**
([HIG privacy](https://developer.apple.com/design/human-interface-guidelines/privacy), read via the JSON source):

> "Include only one button and make it clear that it opens the system alert… Use a term like
> 'Continue' or 'Next'…"
> "Don't include an option to cancel. Don't include an option to close the view."
> "Don't show an image of the standard alert and modify it in any way."
> "Don't add a visual cue that draws people's attention to the system alert's Allow buttons."

The last two bullets sit under the tracking (ATT) heading. App Review applies the same idea
to every permission under 5.1.1(iv) ("must not attempt to manipulate, trick, or force
people to consent"). A real rejection dated 2026-10-01 cited 5.1.1(iv) for a custom primer
whose button said "Allow". **[REPORT]** [athanor #908](https://github.com/anecoicastudio/athanor/issues/908)

The code comment says the picture is "scaled down, dimmed, captioned, and not pressable,
so it can't be mistaken for the real alert (App Review 5.1.1)". By the HIG's wording, though,
scaling and dimming is *modifying an image of the standard alert*, and the bobbing finger is a
*visual cue toward the Allow button*. Many blockers ship this pattern and pass review (single-app
observations, so a matter of reviewer luck). It's still the most quotable violation in the flow.

**Recommendation:** drop the picture and keep the text plus Loc. Example copy for `screen-time`:
- Headline (Voice): *"I need Screen Time access."*
- Body: "It's how I put apps to sleep. Apple will ask twice, then want your Face ID. What you use stays on your phone. I never see it."
- Aside: *"Apple's paperwork. Not mine."*
- One button: **Continue**.

That keeps the useful priming (warning about the second step and Face ID cuts surprise drop-off)
without the image. Conversion cost: probably small, but unmeasured. If you want to keep a
picture, describe the step in words ("Tap Continue, then use Face ID") and don't draw the alert.

### 1.5 How many TikTok teens can't authorize, or can't pay?

- US TikTok users aged 13–17: about **15%** (vendor estimate; another cut gives 25% for 10–19).
  **[BENCH, weak]** [SocialPilot](https://www.socialpilot.co/blog/tiktok-statistics). The founder's
  audience leans younger than TikTok's average.
- Under `.individual`, **authorization most likely isn't the blocker** for teens (Apple: "available
  for all users"). The blocker is **Ask to Buy**: on a child account under 18 it's on by default
  and can't be turned off in many regions, so the trial purchase comes back `.pending` until a
  parent approves within 24 h. **[APPLE]** [support 105055](https://support.apple.com/en-us/105055)
- Rough sizing **[my estimate, not data]**: teens 15–25% of installs × 40–60% on child accounts
  ≈ **6–15% of installs could hit a pending purchase**, and a smaller share (those with parental
  Screen Time restrictions) might hit `restricted` at authorization. The `screen_time_access` error
  logging in change 5, plus `purchase_result: pending`, will replace this guess within a week of launch.
- The code already handles `pending` (`markPurchasePending`, `onEntitled`). **[CODE]** Make sure the
  pending copy doesn't promise tonight. In Loc's voice: *"Waiting on a grown-up. I'll set up the
  moment they say yes."*

### 1.6 Ordering: Screen Time before or after the paywall?

**Keep it before the paywall (current order: `screen-time` → `apps` → `ready` → `commit` → `offer` → `plans`).**
Reasons:
1. **Failures show up before money is taken.** A teen whose phone is restricted, or someone on a
   supervised phone, learns it before paying, not after. That avoids refunds, "doesn't work"
   1-star reviews, and Ask to Buy requests for an app that can't work.
2. **Investment.** Choosing the real apps and seeing "Tonight's lock is ready" makes the paywall a
   question of keeping something already set up. Opal asks before its hard paywall
   (OPAL_ONBOARDING_RESEARCH.md; Opal's hard-paywall move from 7% to 17% is in sub-club notes).
3. It's also the **only** order that allows a real-data screen (§3).

Cost: two system decisions plus Face ID come before the paywall, so some people drop there who
would have paid. No public data sizes this. **Measure it**: `screen_time_access` granted ÷ `screen-time`
viewed. If that falls under ~80%, test moving the picker after the paywall (keep authorization before).

---

## 2. FamilyActivityPicker (`apps`, step 22)

What's known **[REPORT unless marked]**:
- **Crashes or freezes when expanding categories (especially "Other"), searching, or scrolling
  with categories open**: "Connection to plugin invalidated while in use". Seen across iOS 17 and 18.
  Apple-forum user Quappi (Aug 2025): fixed in **iOS 26 beta 6+**. [forum 743770](https://developer.apple.com/forums/thread/743770), [forum 750847](https://developer.apple.com/forums/thread/750847)
- one sec's user-facing workaround for the search crash: **dictate or paste** the search instead
  of typing. Fixed in iOS 26. [one sec](https://tutorials.one-sec.app/en/articles/3036354)
- **iOS 18.4+ bug:** tapping Done or Cancel in the picker also dismisses the **sheet that presented
  it**. [forum 790120](https://developer.apple.com/forums/thread/790120). If onboarding or a
  list editor is ever shown as a modal sheet, test this.
- **iOS 26:** one report says the picker never opens after updating, until Screen Time access is
  granted again. **[REPORT, weak]** (forum search summary)
- The picker's look can't be changed. Picks come back as tokens only. `includeEntireCategory: false`
  is set, which is correct for keeping saved picks. **[CODE]**

Best practices for Locturne:
1. **Name examples, don't preselect** (already done). Suggest categories in the header text:
   "Social and Entertainment cover most of it." Picking one category is the fastest way to finish
   (2 taps, no search). Use the picker's `headerText` to steer: *"Tap a category to put the whole
   lot to sleep."* (iOS 17–18 crash note: opening the disclosure arrow is the risky part; tapping the
   category's circle isn't.)
2. **Zero-pick recovery:** if the sheet closes with 0 picks, show one line under the card: *"Apple's
   list sulks sometimes. Scroll, don't search."* and keep "Add apps" as the main button.
3. Log `apps_picked {count, categories, apps}` (it already logs `count`) plus `picker_reopened` to
   spot crashes. You can't detect a crash directly, but a re-open within 10 s is a decent proxy.

---

## 3. DeviceActivityReport: can onboarding show REAL Screen Time?

### 3.1 What the API gives

- `DeviceActivityReport` is a SwiftUI view, drawn by a **report extension**
  (`com.apple.deviceactivityui.report-extension`). "To protect the user's privacy, your extension runs
  in a sandbox. This sandbox prevents your extension from making network requests or moving sensitive
  content outside the extension's address space." Data comes only after Family Controls authorization.
  **[APPLE]** [DeviceActivityReport](https://developer.apple.com/documentation/deviceactivity/deviceactivityreport)
- Data available inside the extension **[APPLE]** ([ActivitySegment](https://developer.apple.com/documentation/deviceactivity/deviceactivitydata/activitysegment),
  [ApplicationActivity](https://developer.apple.com/documentation/deviceactivity/deviceactivitydata/applicationactivity)):
  - per segment (`.hourly`, `.daily` or `.weekly` over a `DateInterval`): `totalActivityDuration`,
    **`firstPickup`** (first time the phone was picked up in the segment), `longestActivity`,
    `totalPickupsWithoutApplicationActivity`, and categories.
  - per app: `totalActivityDuration`, `numberOfPickups`, `numberOfNotifications`, drawn as a token
    (icon and name through `Label`).
  - filters for apps, categories and web domains, so it can be limited to **the apps they just picked**.
- **Exporting the data:** the main app (JS) **can't read the numbers**. A new iOS 26.4 API,
  `DeviceActivityData.activityData(filteredBy:using:)` with `.approvedWithDataAccess`, does export
  them, but "customer installations… can only use the method on devices located in the EU that are
  signed in with an Apple Account with an EU country or region". **[APPLE]**
  [activityData](https://developer.apple.com/documentation/deviceactivity/deviceactivitydata/activitydata(filteredby:using:)),
  [approvedWithDataAccess](https://developer.apple.com/documentation/familycontrols/authorizationstatus/approvedwithdataaccess).
  That rules it out for a US launch.

### 3.2 Is there history from before authorization? Contested, so it needs a spike

- An Apple engineer, asked about past week or month: "Once your app has successfully received
  authorization using FamilyControls, your DeviceActivityReportExtension will have access to up to a
  month of device activity data **from that date onward**." **[APPLE]** [forum 718683](https://developer.apple.com/forums/thread/718683).
  "From that date onward" most naturally reads as **no data from before authorization**.
- Jomo's help centre: data "will appear gradually over time" for new users; Jomo starts "from
  scratch". **[REPORT]** [Jomo help](https://help.jomo.so/en/article/my-jomo-screen-time-does-not-appear-jmz6ha/)
- Opal shows the "years of your life" projection from **self-declared** screen time in onboarding,
  then measures real usage from install. Its Focus Report needs at least a week of use. **[REPORT]**
  [Opal help](https://opalapp.com/help/how-when-and-where-does-opal-report-your-screen-time).
  If the market leader with the most engineering resources uses self-report at this moment, that
  strongly suggests real history isn't available at onboarding.
- **Verdict:** a real "last week" reveal during onboarding is **unlikely to work** (my estimate:
  70–80% chance there's no meaningful pre-authorization history). ONBOARDING_CONVERSION.md lists
  it as "may be able to". I'd downgrade that to "probably can't". A 1-hour device spike settles it:
  a fresh install, authorize, then render `.daily(during: last7days)` and `.hourly(during: lastNight)`.

### 3.3 Other constraints, even if history exists

- **Reliability:** reports showing 0 minutes, blank views, a flash of zeros before the real data loads,
  "a delay of a few seconds", and slow sync of the aggregate total. **[REPORT]** [forum 743069](https://developer.apple.com/forums/thread/743069),
  [forum 726474](https://developer.apple.com/forums/thread/726474), RNDA docs. The host app
  **can't tell** when the report has failed, so you can't fall back cleanly.
- Needs **Screen Time → App & Website Activity** turned on. **[REPORT]** (Jomo troubleshooting)
- **Build cost:** `react-native-device-activity` 0.6.1 ships Monitor, ShieldAction and ShieldConfiguration
  targets but **no report extension**. **[CODE]** We'd need a new Swift target (EAS `appExtensions`
  plus a config plugin), a native view bridge, and the Family Controls entitlement for the new
  bundle ID, which is a **separate Apple entitlement approval** per extension bundle ID (see
  VALIDATION_RESEARCH: "Until every ID is approved, builds are blocked"). Realistically 2–4 days
  plus Apple's approval wait.
- The `reveal` number, the life grid and the share image can't use it (JS can't read it).

### 3.4 Where it *does* work: the day-5 trial recap

By trial day 5 there are 4–5 nights of data *after* authorization. That's within the documented
behaviour ("from that date onward", up to a month). A native card on Home or in the reminder
destination: *"Since Tuesday: first pickup moved from 6:41 to 7:58 (that's you, out of bed).
Instagram after midnight: 0 min."* ONBOARDING_CONVERSION item 2 calls day 5 the biggest lever left.
**This is the better use of the report extension.** Recommendation: build it post-launch for the
day-5 screen, not for onboarding. Confidence: medium.

If the spike *does* show history, add a screen `receipts` between `apps` and `ready`, filtered to the
apps just picked, rendered natively: *"Your picks, last night: 1 h 12 m after midnight. I've seen worse.
Not much worse."* Then A/B it against no screen. Don't remove the self-report `reveal`. It comes
earlier, works for everyone and is shareable.

---

## 4. Motion & Fitness, and notifications

### 4.1 Motion & Fitness (`walk` step 19, `armed` step 27)

- iOS shows the system prompt **once**. A second `requestPermissionsAsync()` returns the stored answer
  with no prompt. The code knows this ("Already answered on the walk, this returns at once"). **[CODE]**
  So **asking twice isn't a UX problem.** The second call is a no-op. The real issue is **denial before
  the paywall**: if someone denies on `walk`, then pays, both steps and downstairs (the barometer is
  behind the same permission) are dead, and only "scan a code" is left. Make sure `armed` handles
  `motion === 'denied'` by switching the method to scan, or by offering Settings with plain copy:
  *"Motion is off, so I can't count your steps. Turn it on in Settings, or use the scan."*
  5.1.1(iv) asks for an alternative when consent is refused. Scan is that alternative, so we comply.
- HIG's pre-alert rules ("only one button… don't include an option to close") are written for camera,
  mic, location and so on. The `walk` screen's Skip isn't a clear violation, because the prompt shows
  again (as a no-op or real ask) at `armed`. Low risk.
- No public opt-in benchmark for Motion & Fitness was found. **[UNVERIFIED]** I'd expect it to be high
  here because the prompt arrives exactly when the person taps "Start walking" (contextual).

### 4.2 Notifications

- Benchmarks: iOS opt-in about 54–56% overall [BENCH] ([Pushwoosh via search](https://www.pushwoosh.com/blog/ios-push-notifications/));
  vendor claims that priming lifts the cold-ask 35–45% to 60–75% [BENCH, weak, vendor marketing]
  ([PushEngage](https://www.pushengage.com/ios-push-notification-permission/)). Apple prompts once.
- Provisional authorization (iOS 12+): no prompt, quiet delivery to Notification Center, then a
  Keep/Turn Off choice. Phiture's interviews found it **did no harm** to opt-in or retention, but no
  lift either. [BENCH] [Phiture](https://phiture.com/blog/provisional-push-what-is-it-and-how-will-it-impact-your-addressable-audience/)
- **Current plan (ask after the first successful night) is right for the full prompt.** But see change 3:
  the paywall's trial reminder depends on notifications that may never be granted. Fix:
  1. At `armed`, if `remindTrial` is on, call `requestPermissionsAsync({ ios: { allowProvisional: true } })`.
     No prompt is shown, and the day-5 reminder can be delivered quietly.
  2. In `src/lib/notifications.ts`, `getNotificationPermission()` counts provisional as `granted`, so
     `shouldAskForNotifications()` would **never** show the full prompt later. Report `provisional`
     separately and still show the full prompt after the first night.
     **[CODE, line ~229]**
- No verified iOS 26 changes to the notification permission prompt were found. **[UNVERIFIED]**

---

## 5. StoreKit and RevenueCat purchase sheet (`plans`, `declined`)

- **No public data on purchase-sheet cancel rates** was found (searched RevenueCat, Superwall and
  Adapty). **[UNVERIFIED]** Measure it yourself: `purchase_started` → `purchase_result{status}`.
- **Eligibility:** the code shows a trial only when StoreKit says this Apple ID is eligible, and shows
  none when that's unknown. **[CODE]** Good. Check that the `offer` timeline screen ("Tonight $0 …
  Day 7") also switches when `trialDays === null` (someone reinstalling who already used the trial).
  It must never show $0 to an ineligible person (3.1.2 "bait-and-switch").
- **Ask to Buy:** `.pending` is handled (§1.5).
- **No payment method:** starting a trial needs a payment method on file. Apple Balance (gift cards)
  counts in many countries. **[REPORT]** [RevenueCat community](https://community.revenuecat.com/general-questions-7/offer-free-trial-without-requiring-credit-card-or-other-payment-option-240).
  The sheet sends the person to add one, which can background the app. The purchase may come back
  `cancelled` and later arrive through the transaction listener (`onEntitled` exists). **[CODE]**
  Make sure an entitlement that arrives late on `plans` or `declined` moves the person to `armed`.
- **Day-7 failures for gift-card payers:** turn on **Billing Grace Period**, 16 days, "All Renewals",
  which "includes free introductory offers… transitioning to paid". **[APPLE]**
  [ASC help](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions/)
- **Price display:** all prices come from StoreKit `priceString`. The per-month line uses `perMonth`
  with the offer's currency. **[CODE]** Fine. Keep "Save X%" from rounding up into an overclaim
  (it uses `Math.floor`, so fine).
- **Reduce abandonment on the sheet:** make the CTA match what Apple's sheet will say. Apple's sheet
  shows the trial, then the price per year. "Start 7-day free trial / No payment due now · cancel
  anytime" is consistent. Have a summary line right above the CTA, "Free until Oct 10, then
  $59.99/year." (already there). **Medium confidence** that matching copy reduces surprise cancels.
  No data.

---

## 6. Custom Product Pages, in-app events, pre-orders

- **CPPs:** up to **70** per app. Keywords can be assigned so CPPs appear in organic search.
  Apple reports an average **+2.5 pts conversion (1.6% → 4.1%)**. **Deep links on iOS 18+**, set in
  App Store Connect without a new build. **[APPLE]** [CPP page](https://developer.apple.com/app-store/custom-product-pages)
  **Caveat:** the deep link only changes the **Open** button in the App Store. If the person installs,
  leaves and later opens from the home screen, the link is lost. **[REPORT]** [forum 757367](https://developer.apple.com/forums/thread/757367)
  From TikTok bio → App Store → Get → Open is the common path, so it should fire often enough to be worth it.
- **Message match in Locturne:** route `locturne://onboarding?angle=<id>` (Expo Router) to:
  - swap the `hello` line per angle (e.g. downstairs angle: *"No apps until you're downstairs."* /
    *"I'm Loc. I take stairs personally."*),
  - preselect the `method` answer (downstairs or steps) but still ask the question,
  - set PostHog super property `cpp_angle`. Keep the `found` question for unbiased attribution;
    CPP analytics in App Store Connect measure the store side.
  Only 3–4 angles to start (DOWNSTAIRS_METHOD.md already wants one for downstairs).
- **In-app events:** up to 10 published at a time, promoted up to 14 days before start, lasting up to
  31 days, with a "Notify me" opt-in. Badge **Challenge** fits: "New Year: 31 mornings out of bed"
  (Jan 1–31), with its deep link into onboarding. **[APPLE]** [in-app events](https://developer.apple.com/app-store/in-app-events/)
  Whether events can run while an app is still on pre-order is undocumented. **[UNVERIFIED]**
- **Pre-orders:** 2–180 days for a new app, which must be reviewed first. On release day it
  **auto-downloads** and the person gets a notification. Apple doesn't tell people about date changes.
  `preorder_date` is in the receipt (StoreKit 2: `AppTransaction.preorderDate`). **[APPLE]**
  [pre-orders](https://developer.apple.com/app-store/pre-orders/). One developer report: about 80% of
  pre-orders became downloads. [REPORT] [apptamin](https://www.apptamin.com/blog/apple-pre-order-app/)
  Onboarding impact: pre-order openers arrive **days or weeks after the video**, with no context and
  maybe at a random time of day. The `hello` screen must work cold (it does). An optional pre-order
  line from Loc: *"You pre-ordered a raccoon. Bold. Let's see if it was worth it."* Note that
  `docs/1K_MRR_PLAN.md` moves launch to **Nov 10, 2026 via pre-order**, while the brief says Jan 2–5.
  Resolve which plan is live.

---

## 7. App Review risk, screen by screen

| Screen | Risk | Guideline | Level | Fix |
|---|---|---|---|---|
| `deal` | "your answers stay on your phone" vs PostHog sending all answers | 5.1.1(i)/(ii), 5.1.2, privacy label accuracy | **High** | Change copy or stop sending. Fill in the privacy label (Product Interaction, Identifiers, Purchases, Other User Content/answers, Coarse Location if `disableGeoip:false` stays) |
| `screen-time` | Image of Apple's alert, modified, with a finger on Continue | HIG privacy, 5.1.1(iv) | **Med-High** | Remove the picture (see §1.4) |
| `plans` | "Try Locturne free" title bigger than the billed amount | 3.1.2(c), 2026 billed-amount rejections | Med | Title "Seven nights on me", or make "$59.99/year" the biggest price text. Keep "$5.00/month" subordinate (it is) |
| `declined` | Headline "Two free weeks" plus "This only shows up here, once." | 3.1.2 prominence; urgency claim must be true (it is, per install) | Med | Show "$59.99/year after 14 days" as a large price line |
| `plans` | Reminder toggle | Jan 2026 trial-toggle rejections (different pattern) | Low-Med | Static line, or keep the toggle away from the plan cards |
| `offer` | "Tonight $0" shown to trial-ineligible users | 3.1.2(a) bait-and-switch | Med if the bug exists | Branch on `trialDays` |
| `age` | Age asked "because sleep needs change with age" | 5.1.4: birthdate only for legal compliance; COPPA "actual knowledge" | Low-Med | It asks an age, not a birthdate, and the under-13 gate helps compliance. Keep the bracket-only analytics. TEEN_ACCOUNTS.md said "don't ask age" and the flow now does. Either is defensible; if kept, the copy should *use* the age later (sleep-need line on `bedtime`) so it isn't data for its own sake |
| `stat`, `reveal` | "85% check within 10 minutes" and "N years of your life" | 2.3.1 misleading; 1.4.1 only covers health *measurements* | Low | Show the source in small type ("Reviews.org, 2025"). Keep "about" and "based on your answers". Don't put the years claim in store screenshots as a fact |
| `commit` | Hold to agree | No guideline issue if it's not purchase consent | Low | Make sure it doesn't read as agreeing to terms or payment |
| `found` | Attribution question | 5.1.1 fine (optional, relevant) | Low | Add a "Skip" or "Somewhere else" (exists) |
| Whole app | Screen Time use justification | 2.3.1(a) notes; 2.5.4; entitlement scope | Med (process) | Review notes plus a demo video of a night and morning cycle. Explain that nothing blocks before purchase. One dev was rejected 13+ times after adding DeviceActivity extensions (VALIDATION_RESEARCH) |
| Whole app | Age compliance (Texas live; CA Jan 1 2027; Utah May 6 2027; LA Jul 1 2027) | Developer obligations | Med (legal) | `expo-age-range`: `isEligibleForAgeFeaturesAsync()` (iOS 26.2+) → if true, `requestAgeRangeAsync` with gates 13/16/18; under 13 → polite stop, never kill the app. Note the forum report that `isEligibleForAgeFeatures` was unreliable. [Expo docs](https://docs.expo.dev/versions/latest/sdk/age-range/), [forum 810754](https://developer.apple.com/forums/thread/810754) |

**Declared Age Range as a replacement for the age wheel?** No, for three reasons. It's a system sheet
(another permission-style decision in the middle of the quiz). It needs iOS 26+. It returns
ranges at the gates you choose, not an age, so the "sleep needs" line gets coarser. Use it only for the
legal check where `isEligibleForAgeFeatures` is true. For teens in an iCloud family the declaration is
`guardianDeclared`; otherwise it's `selfDeclared`. [swiftorbit](https://swiftorbit.io/age-verification-in-ios-26-how-to-protect-kids-with-the-declaredagerange-api/)

---

## 8. Cold start and app size

- Apple's target: "render our first frame within 400 milliseconds" so pixels are up during the launch
  animation. **[APPLE]** [WWDC19 423](https://developer.apple.com/videos/play/wwdc2019/423/)
- I couldn't fetch drop-off-per-second data for apps (search budget ran out). The commonly quoted
  Google Play finding that each extra 6 MB cuts install conversion by about 1% is
  **[UNVERIFIED here, from memory]** and comes from Android in emerging markets, so it's weak for US iOS.
  An Expo app is well under Apple's cellular download prompt threshold **[from memory]**. App size isn't a lever.
- Practical: offers and entitlement fetches already start without blocking the UI. **[CODE]**
  Check that (a) splash hiding doesn't wait on the custom serif font and the PostHog init, (b) the
  `hello` text animation starts within about 1 s of tapping the icon on an iPhone 11-class device.
  Track `app_start_ms` (process start → `hello` mounted) as a PostHog property on `onboarding_step_viewed{hello}`.
  Low impact unless it's measured as slow.

---

## 9. Where I disagree with earlier repo docs

1. **ONBOARDING_CONVERSION.md**, "DeviceActivityReport may be able to show real logged phone use":
   probably not at onboarding. Apple's own wording ("from that date onward"), Jomo ("from scratch")
   and Opal's self-report reveal all point the same way. Reuse the idea for the day-5 recap.
2. **apple-alert.tsx's premise** that a dimmed, captioned picture is safe under 5.1.1: the HIG text
   forbids exactly an image of the standard alert, modified, with a cue on the allow button.
3. **TEEN_ACCOUNTS.md** "Don't ask for age in onboarding": the current flow asks. That's defensible
   (it's used for personalization, gated at 13, and only the bracket goes to analytics), but then the
   age must visibly *do* something later in the flow, or it reads as data collection for its own sake.
4. The "notifications after the first night" plan is right for the *full* prompt, but it breaks
   the paywall's reminder promise unless provisional authorization fills the gap.

---

## Sources (main)

- Apple HIG Privacy (JSON source of https://developer.apple.com/design/human-interface-guidelines/privacy)
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- FamilyControls errors: https://developer.apple.com/documentation/familycontrols/familycontrolserror
- Forum 747915 (authorization status bugs): https://developer.apple.com/forums/thread/747915
- Forum 718683 (report history): https://developer.apple.com/forums/thread/718683
- Forum 797162 (no total Screen Time API): https://developer.apple.com/forums/thread/797162
- Forum 743069 (report reliability): https://developer.apple.com/forums/thread/743069
- DeviceActivityReport / ActivitySegment / activityData (EU-only): developer.apple.com/documentation/deviceactivity/…
- approvedWithDataAccess: https://developer.apple.com/documentation/familycontrols/authorizationstatus/approvedwithdataaccess
- Picker crashes: https://developer.apple.com/forums/thread/743770, https://developer.apple.com/forums/thread/790120, https://tutorials.one-sec.app/en/articles/3036354
- Habit Doom 35%: https://habitdoom.com/blog/shipping-familycontrols-ios
- Jomo help: https://help.jomo.so/en/article/my-jomo-screen-time-does-not-appear-jmz6ha/
- Opal help: https://opalapp.com/help/how-when-and-where-does-opal-report-your-screen-time
- 5.1.1(iv) rejection 2026-10-01: https://github.com/anecoicastudio/athanor/issues/908
- Toggle paywall rejections: https://www.revenuecat.com/blog/growth/rip-toggle-paywall
- 3.1.2(c) guide: https://getresubmit.com/guides/app-store-guideline-3-1-2-c-subscription-information
- Billing grace period: https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions/
- Ask to Buy: https://support.apple.com/en-us/105055
- CPPs: https://developer.apple.com/app-store/custom-product-pages ; deep-link caveat https://developer.apple.com/forums/thread/757367
- In-app events: https://developer.apple.com/app-store/in-app-events/
- Pre-orders: https://developer.apple.com/app-store/pre-orders/
- expo-age-range: https://docs.expo.dev/versions/latest/sdk/age-range/ ; forum 810754
- Pew 2024 teens and screens: https://www.pewresearch.org/internet/2024/03/11/how-teens-and-parents-approach-screen-time/
- WWDC19 423 launch: https://developer.apple.com/videos/play/wwdc2019/423/
- Phiture provisional: https://phiture.com/blog/provisional-push-what-is-it-and-how-will-it-impact-your-addressable-audience/
