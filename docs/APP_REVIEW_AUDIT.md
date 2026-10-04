# App Review audit, 2026-10-04

An audit of what could get the November 16 early submission rejected, checked against the
live App Review Guidelines and the code as it stands today, uncommitted work included. Safe
copy fixes were applied. Everything that changes the product or the flow is left for you
(section 3).

## Bottom line

As things stand, the build would be rejected for two reasons that need no judgement call:
- **The legal links are broken.** `locturne.com/terms` and `locturne.com/support` return 404,
  and the live `/privacy` page covers only the waitlist.
- **The app icon is still Expo's template.**

Both are owner jobs that only need doing. After that, the biggest real risk is the
**exit offer**. Apple has rejected this exact pattern under 5.6 at least twice, with the
same wording, and the second was published in March 2026 (RevenueCat's post is dated
March 6, 2026; it doesn't date the rejection itself). That one is your decision.

Two things only a device can prove: that the short-night test arms at once, and that the
production build carries Family Controls (Distribution) on all four targets. Everything else
is low risk.

**Added by the verification pass:** Apple's automated check has been wrongly flagging apps
for a missing Family Controls entitlement and stalling review for about two weeks (Forums
838802, July–August 2026, unresolved). There's no code fix. Before submitting, run `codesign`
on all four executables, keep the output to paste into a reply, and leave two or more weeks
of slack before November 16. Its ranking sits between R2 and R3; details are in "New risks
the audit missed" at the end. Also: if the exit offer ships off, don't attach the half-price
and long-trial products to 1.0, or explain them in the notes (2.1(b)).

**How this was checked:**
- **Guidelines:** the guideline text was fetched from
  <https://developer.apple.com/app-store/review/guidelines/> on 2026-10-04 at 16:27 UTC. The
  page says "Last Updated: June 8, 2026".
- **Other Apple pages:** Schedule 2, the Subscriptions page, the HIG Privacy page and the
  Family Controls entitlement page were fetched the same day.
- **Code:** every file:line was re-read just before it was written down.
- **Live site:** checked with `curl` the same day.

Confidence tags:
- **Verified:** a primary Apple source, and the problem confirmed in the code or on the live site.
- **Likely:** backed by credible secondhand rejection reports, linked.
- **Speculative:** my own inference. No report found.

---

## 1. Risks, most likely to cause a rejection first

### R1. Terms and Support links 404; the live Privacy Policy is the waitlist's

**Status: needs owner. Confidence: Verified.**

- **Guidelines:**
  - 2.1(a): "Submissions to App Review … should be final versions with all necessary
    metadata and fully functional URLs included; placeholder text, empty websites, and
    other temporary content should be scrubbed before submission."
  - 5.1.1(i): "All apps must include a link to their privacy policy in the App Store
    Connect metadata field and within the app in an easily accessible manner. The privacy
    policy must clearly and explicitly: Identify what data, if any, the app/service
    collects…"
  - Schedule 2 §3.8(b): "Links to Your Privacy Policy and Terms of Use must be accessible
    within Your Licensed Application."
- **Evidence:**
  - `src/lib/links.ts:7-9` points Terms, Privacy and Support at `locturne.com`.
  - `curl` on 2026-10-04: `/terms` **404**, `/support` **404**, `/privacy` 200. The live
    `/privacy` says "This covers the Locturne waitlist website. The app will have its own
    policy when it launches." It doesn't cover the app, RevenueCat or PostHog.
  - The pages that would fix this are in `web/public/` (`terms.html`, `privacy.html`,
    `support.html`), but they still hold `[TODO]` spans: `privacy.html:77,244,308` and
    `terms.html:51,197,216`.
  - The live site is also built differently from `web/public` (it serves `/_astro/` assets),
    so check which project actually deploys to the domain.
- **Fix:** fill the TODOs, deploy all three pages, then load each URL from the phone.
  Apple's standard EULA link (in LISTING.md) is acceptable for Terms, but the in-app link has
  to work too.

### R2. The exit offer on closing the paywall

**Status: needs owner (decision D1). Confidence: Likely.**

- **Guideline 5.6:** "Apps should never prey on users or attempt to rip off customers,
  trick them into making unwanted purchases … or engage in any other manipulative practices
  within or outside of the app."
- **Rejections with the same wording (secondhand):**
  - [Forums 768912](https://developer.apple.com/forums/thread/768912), November 2024,
    Guideline 5.6: "The app attempts to manipulate customers into making unwanted in-app
    purchases. Specifically, the app shows a one time offer for subscription when the user
    closes the initial subscription page launched upon opening the app." The developer says
    earlier versions with the same pattern had passed.
  - [RevenueCat, March 6, 2026](https://www.revenuecat.com/blog/engineering/exit-offers-in-revenuecat-paywalls)
    quotes a 5.6 rejection: "your app still displayed an additional discount offer when we
    attempted to exit the subscription page". It tells iOS developers to use exit offers
    "at their own risk". It also warns never to switch the feature on remotely after
    approval, because that breaks the developer agreement.
- **Evidence in the code:**
  - Exit on `offer`/`plans` goes to `declined` (`onboarding-flow.tsx:329`).
  - So does cancelling Apple's purchase sheet (`onboarding-flow.tsx:484-488`; the condition
    is at `:487`).
  - `DEFAULT_EXIT_ARM` is `'longer-trial'` (`purchases.ts:221`).
  - The "once per install, no timer" design doesn't change the pattern Apple named.
- **A second problem with the same screen (Speculative):**
  - The half-price arm says "This price only shows up here, once." (`paywall.tsx:186`).
  - GAME_PLAN.md:198 says the half-price product "also appears as a downgrade in iOS
    Settings".
  - So the "only here" claim isn't strictly true. 3.1.2(a) names "bait-and-switch", and
    2.3.1(a) names "promoting a false price".
- **What not to do:** submit with the arm set to `none` and then turn it on through remote
  config. That's the circumvention RevenueCat warns about, and a hidden feature under
  2.3.1(a).

### R3. The template app icon

**Status: needs owner. Confidence: Verified.**

- **Guidelines:**
  - 2.1(a): "placeholder text, empty websites, and other temporary content should be
    scrubbed before submission."
  - 5.2.1: "Don't use protected third-party material such as trademarks … in your app
    without permission."
- **Evidence:**
  - `app.json:12` uses `./assets/expo.icon`. Its `icon.json` layers are `expo-symbol 2.svg`
    and `grid.png` on Expo's default blue.
  - The splash is Expo blue too (`app.json:111`, `#208AEF`). It doesn't break a rule, but it
    looks unfinished.

### R4. The reviewer can't reach the morning, or the short night doesn't arm at once

**Status: needs device. Confidence: Likely.**

- **Guidelines:**
  - 2.1(b): in-app purchases must be "visible to the reviewer and functional".
  - 2.3.1(a): features "must be described with specificity in the Notes for Review … and
    accessible for review."
- **Evidence:**
  - Locking is time-based.
  - The test path in REVIEW_NOTES §1 depends on `armTonight` shielding at once when it arms
    mid-window. REVIEW_NOTES §2 records that this hasn't been proven on a device.
  - Block now (`nap-screen.tsx`, 15-minute minimum) is the reliable quick path, and the
    notes lead with it.
- **Secondhand:** a [RevenueCat community thread](https://community.revenuecat.com/general-questions-7/ios-app-store-rejection-reviewers-unable-to-pass-paywall-6486)
  (June 2025) reports a rejection because reviewers couldn't get past a paywall.
- **Fix:** run REVIEW_NOTES §1 word for word on a clean install, and attach the screen
  recording.

### R5. Permission buttons said "Allow", and one screen told people which alert button to tap

**Status: fixed. Confidence: Verified against the HIG.** Whether App Review would have cited
5.1.1(iv) for it is Speculative; I found no report.

- **Guideline 5.1.1(iv):** "Apps must respect the user's permission settings and not attempt
  to manipulate, trick, or force people to consent to unnecessary data access."
- **HIG, Privacy** (fetched 2026-10-04; section attribution corrected in the verification
  pass):
  - Under "Pre-alert screens, windows, or views", which covers camera, location and the
    other protected resources: "Another type of manipulation is using a term like 'Allow' to
    title the custom screen's button." and "Use a term like 'Continue' or 'Next' to title
    the single button in your custom screen or window, clarifying that its action is to open
    the system alert."
  - Under "Tracking requests" (App Tracking Transparency only), in a list of designs that
    "will cause rejection": "don't create a button title that uses 'Allow' or similar terms,
    because people don't allow anything in a pre-alert screen." and "Don't add a visual cue
    that draws people's attention to the system alert's Allow buttons." Locturne doesn't
    ask for tracking, so these two apply by analogy, not directly.
- **What was there:**
  - `scanner.tsx` "Allow the camera", which called `requestPermission()`.
  - `apps-list.tsx` "Allow Screen Time access", which called `requestAccess()`.
  - `steps.tsx` `ARM_FAILURES['no-access']` "Allow and try again", which called
    `requestAccess()`.
  - Home "Allow Screen Time".
  - The refused Screen Time screen said "Tap Try again and choose Continue." (Continue is the
    grant button on Apple's Screen Time alert.)
- **Changes:** listed in section 2.

### R6. Hidden features: the diagnostics long press, and the dev labs by deep link

**Status: fixed. Confidence: Verified.**

- **Guideline 2.3.1(a):** "Don't include any hidden, dormant, or undocumented features in
  your app; your app's functionality should be clear to end users and App Review."
- **Evidence:**
  - `you-screen.tsx:262` opens `/diagnostics` on a long press.
  - `src/app/(dev)/screen-time-lab.tsx`, `preset-lab.tsx` and `text-lab.tsx` had no release
    guard. `locturne://screen-time-lab` opened a bench that can disarm the schedule and
    unshield apps.
- **Fixes:**
  - The diagnostics screen is now described in the review notes.
  - The three labs redirect home unless `__DEV__` (`src/app/(dev)/*.tsx:7` or `:11`).
- **Side effect you need to know about:** DEVICE_TEST_SCRIPT.md used
  `locturne://screen-time-lab` in **preview** builds as the "Disarm schedule" escape hatch.
  That no longer works in a preview build. If you need it, gate the labs on the EAS
  profile instead of `__DEV__`: for example, `app.config.js` sets
  `extra.devTools = EAS_BUILD_PROFILE !== 'production'` and the routes check that. My attempt
  to loosen the guard (keeping the labs on the web preview) and then to undo the gate
  were both blocked by the session's permission rules. The decision is yours: D5.

### R7. The billed price must be the most prominent pricing element

**Status: needs owner (D2). Confidence: Speculative for the plan cards, Likely as a
category.**

- **Apple's Subscriptions page** (<https://developer.apple.com/app-store/subscriptions/>):
  - "In the purchase flow, the amount that will be billed must be the most prominent
    pricing element in the layout."
  - "In the purchase flow for a free trial, clearly indicate how long the free trial lasts
    and the price billed once the free trial is over."
- **3.1.2(c):** "Ensure you clearly communicate the requirements described in Schedule 2."
- **What complies:**
  - The plan cards: the billed price is 19 pt (`paywall.tsx:359`) and the per-month line
    14 pt (`:360`).
  - The summary line, "Free until <date>, then $59.99/year."
  - The terms line.
- **What's weaker:**
  - The CTA is a full-width pill reading "Start 7-day free trial / No payment due now ·
    cancel anytime" (`paywall.tsx:66`, title 18 pt at `:378`). The exit-offer CTA already
    carries the price in its subline ("Then $59.99/year · cancel anytime"); the main one
    doesn't.
  - The `offer` page before the plans has "$0 today." (`steps.tsx:637`) at the same size as
    the "$59.99 for the year" row.
- **Secondhand:** [Forums 818023](https://developer.apple.com/forums/thread/818023)
  (March 2026, 5.6): a paywall that pushed a "3-day free trial" while the default plan had
  none, and the auto-renew fine print was missing. Locturne doesn't have that mismatch, so
  this is only adjacent.

### R8. Screen Time is required before the paywall; a decline is a dead end

**Status: needs owner (D3). Confidence: Speculative.**

- **Guidelines:**
  - 5.1.1(iv): "Where possible, provide alternative solutions for users who don't grant
    consent."
  - 2.1(b): IAPs must be "visible to the reviewer".
- **Evidence:**
  - The `screen-time` step comes before `apps` and the paywall (`navigation.ts` STEPS).
  - The refused state offers only Try again and Open Settings (`steps.tsx:516-531`).
  - A reviewer who taps Don't Allow never sees the paywall.
- **Why it's probably fine:** blocking is the core function, so Screen Time is necessary
  data, and the review notes now say what happens on a decline. I found no rejection of a
  blocker for requiring the authorization.

### R9. The dev purchase stub would ship "Preview: nothing is charged"

**Status: guarded; needs owner (set the key). Confidence: Verified.**

- **Guidelines:**
  - 3.1.1: "If you want to unlock features or functionality within your app … you must use
    in-app purchase."
  - 2.2: "Demos, betas, and trial versions of your app don't belong on the App Store – use
    TestFlight instead."
- **Evidence:**
  - `app.json:148` still has `REPLACE_WITH_REVENUECAT_PUBLIC_APPLE_KEY`.
  - `purchases-start.ts:24-28` falls back to the stub without a key.
  - `paywall.tsx:151,203` show the "Preview" line when stubbed.
  - `app.config.js` refuses a production EAS build without an `appl_` key, so this can't
    ship by accident.

### R10. Family Controls (Distribution) must cover every extension

**Status: needs build check. Confidence: Verified as a rule; done per ENTITLEMENT_SETUP.**

- **Apple** ([Requesting the Family Controls entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)):
  "If your app includes a Screen Time API app extension such as Device Activity Monitor,
  Device Activity Report, Shield Action, or Shield Configuration, submit the same request
  for the extension."
- **Evidence:**
  - ENTITLEMENT_SETUP.md says Distribution was ticked on all four App IDs on 2026-10-01.
  - `app.json` gives each extension `com.apple.developer.family-controls`.
  - `expo config --type introspect` confirms the main app's entitlements.
- **Secondhand:** [Forums 819080](https://developer.apple.com/forums/thread/819080) (extensions
  stuck after the app was approved) and [822078](https://developer.apple.com/forums/thread/822078)
  (a 2.5.1 rejection, April 2026, of an app that had removed its Screen Time features but
  still carried the Screen Time API and capability). For the opposite case, an automated
  2.5.1 flag on an app whose entitlement *is* set, see V-N1 in the verification pass.
- **Fix:** confirm in the first production build's profiles (OWNER_TODO step 13).

### R11. 4.10: monetizing the Screen Time APIs

**Status: needs owner awareness. Confidence: Speculative.**

- **4.10:** "You may not monetize built-in capabilities provided by the hardware or
  operating system … or Apple services and technologies, such as Apple Music access, iCloud
  storage, or Screen Time APIs."
- **Why it's low:** the subscription pays for the scheduling engine, the morning proof (stairs,
  steps, scan), passes and Loc, not for raw access to the API. Opal, one sec and Brick ship
  paid blockers. I found no 4.10 rejection of a blocker.
- **Keep:** the review notes and the description should describe what the subscription
  adds, never "pay to block apps".

### R12. Low-risk items, each Speculative

No reports found for any of these. Listed so they can be ruled out, not because they're
expected.

- **1.4.5, physical harm.** "Apps should not urge customers to … use their devices in a way
  that risks physical harm."
  - The downstairs screen shows a live height meter while the user walks down stairs
    (`downstairs-view.tsx`).
  - The listing ends "Use a wake-up method that's safe for you." The app has no such line.
  - Optional: one line from Loc on that screen (D6).
- **The HIG's one-button rule for pre-alert screens.**
  - The walk step explains the Motion prompt, then offers "Start walking" and "Not now"
    (`steps.tsx:478`). The HIG says "don't provide a way for people to leave the screen…
    without viewing the system alert".
  - Removing "Not now" would force a permission, which is worse under 5.1.1(iv). Leave it.
- **5.1.1(ii), consent for analytics.** "Apps that collect user or usage data must secure
  user consent for the collection." PostHog runs without an in-app consent step; the privacy
  label and policy disclose it. This is common practice, and I found no rejections.
- **The "85%" statistic** (`steps.tsx:334`) has no source in the app.
  ONBOARDING_OPTIMIZATION.md already recommends cutting the `stat` screen.
- **`NSLocalNetworkUsageDescription`** ("Expo Dev Launcher uses the local network…")
  appears in the resolved Info.plist from `expo-dev-client`. Check whether it's in the
  production IPA's Info.plist. If it is, it's an unused permission string that names a dev
  tool.
- **Hold to agree** (`steps.tsx:617`). No rejection found for hold-to-commit; it agrees to a
  routine, not a purchase, and the price comes two screens later. It isn't a pressure tactic
  on the purchase as long as it stays before the price.

### Checked and not a risk

| Check | Finding |
|---|---|
| Health claims | The app has no "sleep better" or medical claims. The listing ends "Locturne isn't medical advice." 1.4.1 targets health measurement, which Locturne doesn't do. |
| Hard paywall | RevenueCat documents it as a supported pattern; no rejection found for a hard paywall alone. The paywall has Exit on every page (`ui.tsx:68`). |
| Schedule 2 §3.8(b) fields | Plan name, length, price and per-month price on each card; Restore, Terms and Privacy in the fine print (`paywall.tsx:152`). |
| Trial toggle | The switch is a reminder, not a trial toggle. |
| Purpose strings | Camera and Motion are specific (`app.json` plugins); no background modes. |
| Emergency exit | Always reachable from You (and Home while apps sleep), with a 10-second wait (`emergency.ts:24`). It never lifts the always-blocked list, by design. The review notes now say so, and give Settings or deleting the app as the full escape. |
| Under 13 | The age gate exits (`steps.tsx:361`). |
| "Preview" text in release | Only off iOS or when stubbed (R9). |

---

## 2. What I changed

| File | Change | Why |
|---|---|---|
| `src/features/scan/scanner.tsx:34-35` | "Allow the camera" → "Continue" | HIG pre-alert rule (R5) |
| `src/features/apps/apps-list.tsx:230` | "Allow Screen Time access" → "Set up Screen Time access" | R5 |
| `src/features/home/home-screen.tsx:229` | "Allow Screen Time" → "Set up Screen Time" (it opens the Apps tab) | R5, consistency |
| `src/features/you/you-screen.tsx:57` | "Allow it from the Apps tab." → "Set it up from the Apps tab." | R5, consistency |
| `src/features/onboarding/steps.tsx:524` | "Tap Try again and choose Continue." → "Try again whenever you're ready." | R5: no pointing at the alert's grant button |
| `src/features/onboarding/steps.tsx:862-866` | Arm failure "Allow and try again" → "Try again"; body now "Try again, or turn it on in Settings." | R5 |
| `src/app/(dev)/screen-time-lab.tsx`, `preset-lab.tsx`, `text-lab.tsx` | Redirect home unless `__DEV__` | R6. Read the side effect in R6 |
| `docs/app-store/REVIEW_NOTES.md` | §1 rewritten to 3,569 characters (limit 4,000), plus two §4 rows | See below |
| `docs/v1-build/DEVICE_TEST_SCRIPT.md`, `v1-screens.md`, `onboarding.md` | New button labels; the lab note | Keep the test docs true |
| `docs/TODO.md` §0 | Pointer to this doc | |

**What the review notes §1 now cover:**
- the emergency unlock and where it is;
- that the always-blocked list is never lifted, and how to clear every shield (Screen Time
  access off in Settings, or delete the app);
- what a declined Screen Time prompt does;
- when Motion and Notifications are really asked. They said "after the first night"; the
  code asks on `armed`, right after purchase;
- the diagnostics long press;
- the exit offer on a cancelled purchase sheet.

**What the §4 rows now say:** the stub row is updated to the `purchases-start` and
`app.config.js` guard, and the pre-permission row to the current code.

**Tests after the changes:**
- `npm test`: 426 tests, 424 pass, 0 fail, 2 skipped (the known New York-only DST cases).
  On the final rerun it was 427 tests, 425 pass, 0 fail, 2 skipped; the extra test came from
  another session's work.
- `npx tsc --noEmit`: exit 0.
- `npx expo lint`: exit 0, no problems.

**Note:** other files changed in the working tree while I worked (for example
`onboarding-flow.tsx` line numbers moved). I didn't touch them; the runs above include them.

---

## 3. Owner actions before submission

**Decisions**

1. **D1, the exit offer (R2).** Choose one:
   - **(a)** Submit with the exit arm `none` and keep it off. Test the offer on the web or
     Android first.
   - **(b)** Submit with it on, say so plainly in the notes, and accept a real chance of a
     5.6 rejection on the first round. Budget a resubmission.

   Don't do (c), submitting with it off and switching it on remotely later. Separately,
   reword "This price only shows up here, once." (`paywall.tsx:186`) if you keep the
   half-price arm, because the plan also shows in iOS Settings. **[OPINION]** (a), because the
   early submission exists to flush out Screen Time problems, not to fight over the offer.
2. **D2, CTA price (R7).** Put the price in the main CTA's subline, as the exit offer
   already does, for example "Then $59.99/year · cancel anytime". Optionally show the
   charge on the `offer` page more prominently than "$0 today".
3. **D3, declined Screen Time (R8).** Keep the dead end (the notes now explain it), or let a
   declined user still see the plans with a clear "Screen Time is needed to use this" line.
4. **D4, the hold-to-agree.** Keep it. No evidence it's a review risk; listed only because
   you asked.
5. **D5, the dev labs (R6).** Keep them `__DEV__`-only, or gate them by EAS profile so
   preview builds keep the escape hatch.
6. **D6, stairs safety (R12).** Optional: one line from Loc on the downstairs screen.

**Jobs**

1. Deploy `/terms`, `/privacy` and `/support` with the `[TODO]`s filled. Load each URL on
   the phone. (R1)
2. A real app icon, and a splash that isn't Expo blue. (R3)
3. The RevenueCat `appl_` key in `app.json`. (R9)
4. Run REVIEW_NOTES §1 on a clean install on a real iPhone, including the short night, and
   record the video. (R4)
5. Check that the production build's provisioning profiles show Family Controls on all four
   targets. (R10)
6. Check the production IPA's Info.plist for `NSLocalNetworkUsageDescription`. (R12)
7. Fill the exit-offer placeholder in REVIEW_NOTES §1 to match D1, and keep the App
   Privacy answers matching what the build sends (PRIVACY_LABELS.md).

---

## 4. Sources

All fetched 2026-10-04.

**Primary (Apple):**
- App Review Guidelines, "Last Updated: June 8, 2026":
  <https://developer.apple.com/app-store/review/guidelines/>. Quoted: 1.4.5, 2.1(a)(b),
  2.2, 2.3.1(a), 3.1.1, 3.1.2(a)(c), 4.10, 5.1.1(i)(ii)(iv), 5.2.1, 5.6.
- Apple Developer Program License Agreement, Schedule 2 §3.8(b):
  <https://developer.apple.com/support/terms/apple-developer-program-license-agreement/>
- Auto-renewable subscriptions (billing amount, free trials, sign-up screen):
  <https://developer.apple.com/app-store/subscriptions/>
- HIG, Privacy (pre-alert screens):
  <https://developer.apple.com/design/human-interface-guidelines/privacy>, read through its
  documentation JSON.
- Requesting the Family Controls entitlement:
  <https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement>

**Secondhand:**
- Exit offer, 5.6: <https://developer.apple.com/forums/thread/768912>
- RevenueCat on exit offers and the 5.6 rejection quote:
  <https://www.revenuecat.com/blog/engineering/exit-offers-in-revenuecat-paywalls>
- Paywall trial-wording rejection, 5.6: <https://developer.apple.com/forums/thread/818023>
- Reviewers unable to pass a paywall:
  <https://community.revenuecat.com/general-questions-7/ios-app-store-rejection-reviewers-unable-to-pass-paywall-6486>
- Missing EULA or privacy links, 3.1.2: <https://developer.apple.com/forums/thread/813493>,
  <https://developer.apple.com/forums/thread/812231>
- Family Controls extensions and 2.5.1: <https://developer.apple.com/forums/thread/819080>,
  <https://developer.apple.com/forums/thread/822078>
- `blockedApplications` rejected, 2.5.1: <https://developer.apple.com/forums/thread/776058>
- Revoking authorization clears ManagedSettings (a developer's observation, March 2026):
  <https://developer.apple.com/forums/thread/820796>

I opened and quoted 768912, 818023, 820796 and the RevenueCat post myself. A research pass
reported the other threads (813493, 812231, 819080, 822078, 776058) and the RevenueCat
community thread; I didn't re-open them, so treat their details as secondhand.

---

## How confident is this

**What I could not verify:**
- **Rejection reports for the named apps.** I found none for Opal, one sec, Brick, Jomo,
  ScreenZen or Alarmy, so R8, R11 and R12 rest on inference.
- **The exit-offer threads (R2).** I read them and quoted them, but App Review is
  inconsistent. The 2024 developer said earlier versions with the same flow had passed.
- **The short-night arming (R4) and the profiles (R10).** Only a device or a production
  build shows them.
- **"Turning off Screen Time access, or deleting the app, removes all shields."** It's
  stated in the review notes. The source is a developer's observation in Forums 820796 ("All
  ManagedSettingsStore restrictions are lifted immediately by the system"), not Apple
  documentation or a device test. Check it on the phone before pasting the notes.
- **Whether App Review cites 5.1.1(iv) for "Allow" buttons.** The HIG rule is primary; the
  rejection link is my inference. The fix costs nothing either way.
- **The live site.** It's served from a different build than `web/public`. I didn't look
  into which Cloudflare project serves it.

**What the adversarial pass removed or downgraded:**
- **Health claims:** none found in the app. Downgraded to "not a risk".
- **"Hard paywall itself":** no evidence. Moved to "not a risk".
- **The "Not now" button on the walk:** kept as Speculative, and recommended to stay.
  Removing it would be worse under 5.1.1(iv).
- **The dev-lab gate:** kept as a fix, but it breaks the preview-build escape hatch in
  DEVICE_TEST_SCRIPT. That's flagged as D5 rather than called clean.

---

## Verification pass (2026-10-04)

An independent re-check of this document by a second reviewer who hadn't seen the first
pass's reasoning. Every guideline quote was compared word for word against the live
guidelines page ("Last Updated: June 8, 2026"). The HIG Privacy page, the Subscriptions
page, the Program License Agreement (Schedule 2 §3.8) and the Family Controls entitlement
page were fetched again. Every cited forum thread and RevenueCat page was re-opened. Every
file:line was re-read in today's tree.

**Tally:** about 95 claims checked; 88 confirmed as written; 7 corrected (5 here, 2 groups
in REVIEW_NOTES).

### Confirmed

- **Guideline quotes, all word for word and under the right numbers:**
  - 1.4.5, 2.1(a), 2.1(b), 2.2 (now quoted, not paraphrased), 2.3.1(a) (hidden features,
    "described with specificity", "promoting a false price"), 3.1.1, 3.1.2(a)
    ("bait-and-switch" is in 3.1.2(a)), 3.1.2(c), 4.10 (Screen Time APIs are named), 5.1.1(i),
    5.1.1(ii), 5.1.1(iv) (both sentences), 5.2.1, 5.6.
  - Schedule 2 §3.8(b), verbatim.
  - Subscriptions page: both quotes, verbatim, under "Billing amount" and "Free trials".
  - Family Controls entitlement page: verbatim.
- **Sources, all live and saying what's claimed:**
  - 768912 (November 2024, 5.6). The rejection text is exact, and the developer did say
    "We've had this in the last few versions of the app, but not been flagged for it."
  - RevenueCat exit-offers post (March 6, 2026). The 5.6 quote, "at their own risk", and the
    warning about enabling the feature remotely are all verbatim.
  - 818023 (March 2026, 5.6): the default plan had no trial, and the auto-renew fine print
    was missing.
  - RevenueCat community 6486 (June 6, 2025): reviewers couldn't pass the paywall. The cause
    turned out to be that the reviewer's sandbox account was already subscribed (see V-N4).
  - 813493 and 812231 (January 2026, 3.1.2, missing EULA or privacy links); 819080 (March
    2026, extensions stuck in "Submitted"); 776058 (March 2025, 2.5.1, `blockedApplications`);
    820796 (March 2026).
  - 820796's "All ManagedSettingsStore restrictions are lifted immediately by the system" is
    the original poster's own observation, not Apple's. This doc already flags that.
  - REVIEW_NOTES sources 809635, 786790, 838802, the toggle-paywall post (rejections from
    mid-January 2026) and the introductory-offer page ("one current and one future
    introductory offer per storefront"; one redemption per subscription group) also check
    out.
- **Code:** every file:line except the two below matches. Other checks:
  - `/terms` and `/support` still return 404.
  - `/privacy` now answers 307 and lands on the waitlist-only policy.
  - The `[TODO]` lines in `web/public` are where stated.
- **The audit's code edits are correct:**
  - No label that opens a system prompt says "Allow" any more. A grep of `src` finds
    "Allow" only in comments, the dev lab and the web-preview simulator text.
  - The `no-access` arm failure still has its Open Settings secondary (`steps.tsx:701`), so
    its new body "Try again, or turn it on in Settings." is true.
  - The refused screen keeps Try again and Open Settings.
- **The dev gate blocks only the three labs.**
  - `/diagnostics` (the documented long press) is not gated. It only reads, plus Share and
    Refresh.
  - The You tab's "Screen Time lab" row was already `__DEV__`-only.
  - The redirecting route components have no hooks, so the early return is safe.
  - The web preview and simulator only lose the labs in a production export.
- **REVIEW_NOTES §1 behaviour statements:**
  - The quick and full test steps, the screen titles and tab names ("Which apps keep you
    up?", "When do you get into bed?", "Tuck him in", "Wake him early", Go downstairs, "Walk
    200 steps instead", Use a pass, "Always asleep") all exist in the code.
  - Restore is in all three places stated.
  - Motion: asked on "Start walking"; "Not now" skips it; otherwise asked on Armed's
    Continue.
  - Notifications: asked on Armed's Continue. The code also has a fallback after the first
    proven morning (`use-app-start.ts`, `wake-screen.tsx`).
  - Declined Screen Time: Try again plus Open Settings, and no way forward.
  - Exit offer: shown after Exit on `offer`/`plans`, or after a cancelled sheet. It shows
    once per install (`EXIT_OFFER_SHOWN_KEY`), and only when offers loaded.
  - Diagnostics: long press, 800 ms, on the version line.
  - The emergency unlock waits 10 seconds, then asks for confirmation (`exits-screen.tsx`).
  - Length: §1 is **3,633 characters** after this pass's edits, with the placeholders still
    in. That's under the 4,000 limit, with about 350 to spare for the name, phone number and
    exit-offer line.
- **Tests, rerun in this pass:**
  - `npm test`: 427 tests, 425 pass, 0 fail, 2 skipped.
  - `npx tsc --noEmit`: exit 0.
  - `npx expo lint`: exit 0.

### Corrected

1. **R5, HIG attribution.** Two of the three quotes ("don't create a button title that uses
   'Allow'…" and "Don't add a visual cue…") come from the HIG's **Tracking requests** (ATT)
   section, not the general pre-alert section. The general section says the same thing in
   other words ("Another type of manipulation is using a term like 'Allow'…", "Use a term
   like 'Continue' or 'Next'… the single button"). The fix stands; R5 now quotes both
   sections and says which applies directly.
2. `purchases-start.ts:37-41` → `:24-28`, where the stub fallback actually is.
3. `onboarding-flow.tsx:484-485` → `:484-488`, with the condition at `:487`.
4. **R2:** "the second case is from March 2026" → the RevenueCat post is dated March 6, 2026;
   the rejection itself is undated.
5. **R10:** 822078 is about an app that dropped its Screen Time features but kept the API.
   It isn't a generic entitlement rejection.
6. **REVIEW_NOTES §1, emergency unlock.** It said "Works at any hour". It's always
   available, but it only wakes the bedtime apps and ends Block now (`planEmergency`). It
   never lifts the always-asleep list **or a used-up daily limit**. The notes now say so.
7. **REVIEW_NOTES §3 and §4, stale rows:**
   - The checklist still said Notifications are asked "after the first good night". It now
     says they're asked on `armed`, with the morning fallback.
   - The checklist said camera-denied "offers Allow". It's now Continue.
   - The 2.5.1 row cited 822078 as a false flag. That row is reworded.

### New risks the audit missed

**V-N1. Automated 2.5.1 "Family Controls entitlement" false positive stalls review.
Likely.**
- [Forums 838802](https://developer.apple.com/forums/thread/838802), July to August 2026,
  four developers:
  - Apple's automated analysis said "the app uses one or more Screen Time APIs but the app
    has not been submitted with the Family Controls entitlement".
  - In fact, codesign and App Store Connect both showed `com.apple.developer.family-controls`
    on all four executables.
  - One build sat in Waiting for Review for about two weeks. Expedite requests and two
    Developer Support cases got no answer.
  - The same configuration had passed in March 2026.
  - It was unresolved at the last post (August 2026).
- Locturne's setup is the same: four targets with the entitlement.
- **Nothing in the code to fix.** It's a schedule risk for November 16:
  - Run `codesign -d --entitlements :-` on all four executables in the production IPA
    before submitting.
  - Keep that output to paste into a reply.
  - Allow two or more weeks of slack.
- **Rank:** just below R2. It doesn't need a decision, but it's the likeliest thing to cost
  calendar time after the owner jobs.

**V-N2. Exit-offer products attached to the version but unreachable in the build. Verified
(the rule), conditional on D1.**
- 2.1(b): "If any configured in-app purchase items cannot be found or reviewed in your app,
  explain the reason in your review notes."
- REVENUECAT_SETUP §3.5 says to attach all four products to the first version.
- If D1(a) ships with the exit arm `none`, the reviewer can't reach `locturne.annual.halfprice`
  or `locturne.annual.longtrial`.
- **Fix:** either don't attach them to 1.0, or say in the notes why they can't be reached.
  Attaching them silently and then switching them on remotely is the R2 "don't".

**V-N3. The exit-offer screen has no Restore. Speculative.**
- The Subscriptions page says the sign-up screen must include "A way for current
  subscribers to sign in or restore purchases".
- `declinedStep` has Terms and Privacy but no Restore (`paywall.tsx`, footer of
  `declinedStep`). The `plans` page does have it.
- The fix is a one-line code change: add `<FineLink label="Restore" …>`. No report found.

**V-N4. The reviewer's sandbox account is already subscribed. Likely, low impact.**
- RevenueCat community 6486's rejection came from exactly this: the reviewer saw "You're
  currently subscribed".
- Locturne's paywall does have Restore, and Restore on `plans` calls `finishSetup`.
- Suggestion for the owner (not added to the notes, because it's advice rather than a
  correction): one line in §1, "If your sandbox account already has Locturne, tap Restore on
  the paywall."

**Checked and not a risk:**
- **4.2 minimum functionality.** A native scheduling engine, three extensions, sensors and a
  camera. Not a wrapper or a list of links.
- **Export compliance.** `ITSAppUsesNonExemptEncryption: false` is at `app.json:15`. The app
  only uses HTTPS through SDKs, which is exempt.
- **A minimum age for Screen Time apps.** None found:
  - The guidelines only name Screen Time in 4.10.
  - The FamilyControls docs set no age for `.individual` authorization.
  - The 13+ rating is the owner's choice, and it matches the in-app under-13 exit
    (2.3.6 only asks for honest answers).
- **Subscription group and levels.** REVENUECAT_SETUP §3.4:
  - All four products are in one group.
  - Annual and longtrial are level 1, monthly is level 2, half price is level 3.
  - Schedule 2 §3.8(a) explicitly allows this ranking.
  - The only consequence is the one R2 already names: half price is listed in Settings.
- **3.1.2 disclosures on `plans`.**
  - Each card shows its plan title, length and billed price.
  - The trial length and the price after it are shown.
  - The renewal sentence is there.
  - Restore, Terms and Privacy are there.
  - Annual is preselected *with* its trial, so it doesn't have 818023's mismatch.
  - "Annual"/"Monthly" as titles is allowed: §3.8(b) says the title "may be the same as the
    in-app product name". Keep the ASC display names matching.
- **4.5.4.** Notifications aren't required.

### Disagreements with the ranking

- **V-N1 belongs in section 1**, between R2 and R3. It's the one 2026 pattern specific to
  Screen Time apps, it's recent, and it's unresolved.
- **R5 confidence.** "Verified against the HIG" holds only through the general pre-alert
  section. The strongest wording ("will cause rejection") is ATT-only. The rejection risk
  from the old labels was low. The fix is still right.
- Otherwise the order (R1 and R3 certain owner jobs, R2 the main judgement call, R4 needing a
  device) holds.

## Decisions applied (2026-10-04, after the owner said "fix these")

- **D1, exit offer: off for 1.0.** `EXIT_OFFER_LIVE = false` in `src/lib/purchases.ts`.
  `onboarding-flow.tsx` ignores the store's arm unless it's true, so RevenueCat metadata
  can't switch the offer on after approval. The review tools' `?exit=` still previews it.
  REVIEW_NOTES now says closing the paywall exits, and to attach only `locturne.annual` and
  `locturne.monthly` to 1.0. The exit screen's "only shows up here, once" lines now say
  "This screen only shows once", which stays true while the plan is also listed in iOS
  Settings.
- **D2, price on the button:** the annual trial button's subline is now
  "Then $59.99/year · cancel anytime" (the store's price string), matching the exit offer's button.
- **D3, declined Screen Time: kept as is.** Without the authorization nothing can be
  shielded, so a path to the paywall would sell an app that can't work. That's a worse 2.1 and
  refund risk than R8's Speculative 5.1.1(iv) point. The review notes already explain a decline.
- **D5, dev labs:** `/screen-time-lab` opens in development builds and in EAS **preview**
  builds (`EXPO_PUBLIC_DEV_LABS=1` in eas.json's preview profile), so the device test's
  "Disarm schedule" escape hatch is back. Production builds still redirect home. The text
  and preset labs stay development-only.
- **Restore on the exit screen:** added next to Terms and Privacy.
- **Sandbox line:** the review notes now say "If your sandbox account already has Locturne,
  tap Restore." Section 1 is about 3,620 characters.

Checks after these edits: `npm test` 432 tests, 430 pass, 0 fail, 2 skipped (the
New York-only DST cases; the count grew from other work in the tree). `npx tsc --noEmit` and
`npx expo lint` are clean.

**R1 fixed (2026-10-04):** `/terms`, `/privacy` and `/support` are live on locturne.com from
the `locturne_landing` Astro project (Worker version `aa16c1dc`), all dated October 4, 2026,
with no TODOs. The privacy policy was checked against the analytics and RevenueCat code. The
`web/public` copies in this repo are now stale; the Astro pages are the source of truth.
