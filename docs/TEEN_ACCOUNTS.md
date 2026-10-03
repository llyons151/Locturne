# Teen accounts: do we support parent-managed iPhones in v1?

Researched 2026-10-03. Question: should v1 support teens whose iPhone is a child
account in Family Sharing, or are we effectively 18+? Covers how Apple's Screen Time
authorization behaves on teen accounts, what Ask to Buy does to the paywall, the 2026
state age laws, what competitors do, and what a teen path would cost to build.

Labels: **[APPLE]** is Apple docs, WWDC or Apple staff. **[REPORT]** is a developer
or press report. **[UNVERIFIED]** means I couldn't confirm it; treat it as a guess
until tested on a device. This is not legal advice.

---

## TL;DR

- Our `.individual` authorization is Apple's "self-control" mode. Apple describes it
  as available to **all users**. It doesn't list child accounts as excluded, and it has
  no age check. **[APPLE]** No source confirms what actually happens when a teen on a
  Family Sharing child account taps Allow. **[UNVERIFIED, test before launch]**
- `.child` authorization is the parental-control mode. A parent approves it with
  their Apple Account on the teen's phone. After that the teen **can't delete the app or
  sign out of iCloud**, and only one parental-control app per device can hold it. That
  makes it a parent product, not ours. **[APPLE]**
- Teens on a child account have Ask to Buy, so our trial or purchase comes back as
  **pending** until a parent approves within 24 hours. **[APPLE]**
- From 4 June 2026, **Texas** law requires parental consent for minors' downloads
  and in-app purchases on new Texas accounts. Apple runs the consent flow. Developers
  must use Apple's age signals (Declared Age Range API) and act on revoked consent, with
  fines of up to $10,000 per violation. Utah's operational duties slid to 6 May 2027,
  Louisiana's to 1 July 2027, and California's AB 1043 starts 1 January 2027. **[APPLE] [REPORT]**
- Opal, one sec, Brick, Jomo, ScreenZen and Alarmy are all rated **4+** on the US
  App Store. Erly is 12+ (the old scale). None blocks teens. Opal and Brick publish
  parent guides. **[REPORT, App Store lookup 2026-10-03]**
- **Recommendation:** v1 is a general-audience 13+ app. Don't build a teen or parent
  path. Don't ask for age in onboarding. Teen-proof the two failure points (Screen Time
  errors and pending purchases), add a minimal Declared Age Range check for the state
  laws, and set Terms minimum age 13 and the App Store rating to 13+. Details at the end.

---

## 1. What `.individual` and `.child` authorization do on a teen's phone

### The two modes (Apple docs)

- `FamilyControlsMember.individual`: "Family Controls is managing an individual
  account, so that the user can enter their authorization credentials." The person
  approves with Face ID, Touch ID or passcode. **[APPLE]**
  ([docs](https://developer.apple.com/documentation/familycontrols/familycontrolsmember/individual))
- `FamilyControlsMember.child`: "a parent or guardian must enter their authorization
  credentials." **[APPLE]**
  ([docs](https://developer.apple.com/documentation/familycontrols/familycontrolsmember/child))
- `requestAuthorization(for:)`: "A parent or guardian must authenticate a child's
  account, while individuals can authenticate their own account." For `.individual`,
  "the system removes any restrictions that prevent the user from bypassing parental
  controls so the user can delete an authorized app or sign out of iCloud." **[APPLE]**
  ([docs](https://developer.apple.com/documentation/familycontrols/authorizationcenter/requestauthorization(for:)))
- WWDC22, "What's new in Screen Time API": iOS 16 added individual authorization so
  the API can be used for "more than just parental controls apps". Any number of apps
  on a device can hold it. The implicit limits on deleting the app and signing out of
  iCloud don't apply. **[APPLE]**
  ([WWDC22 110336](https://developer.apple.com/videos/play/wwdc2022/110336/))
- Apple Frameworks Engineer on the forums: `.child` needs a child account approved
  by a guardian in the family. Individual authorization is "available for all users".
  **[APPLE]** ([forum 716531](https://developer.apple.com/forums/thread/716531))

### Does `.individual` work on an under-18 child account?

**Probably yes, but [UNVERIFIED].** Here's the evidence:

- None of Apple's docs, WWDC sessions or forum answers says `.individual` is blocked
  on child accounts. Apple describes it as available to all users.
- The age-related error, `invalidAccountType` ("To request or revoke authorization, the
  user must sign into iCloud from a child account that's part of a Family Sharing
  group"), is the `.child` error: you get it when an adult account asks for `.child`.
  **[APPLE]** ([docs](https://developer.apple.com/documentation/familycontrols/familycontrolserror/invalidaccounttype))
- A developer whose `.child` prompt wouldn't appear on iOS 16.3 found that
  `.individual` showed the sheet. **[REPORT]** ([forum 724627](https://developer.apple.com/forums/thread/724627))
- Opal's parent guide says to "install the iOS app on your child's iPhone" and set it
  up there, which means Opal's normal self-authorization runs on kids' phones. Brick
  says the same: an "opt-in tool to help adults and kids". **[REPORT]**
  ([Opal](https://opalapp.com/help/how-to-set-up-parental-controls-with-opal),
  [Brick](https://support.getbrick.com/en/articles/6055553))
- No source covers what happens when the parent's own Screen Time restrictions or
  Screen Time passcode are on the teen's phone. Approval might still go through, or the
  prompt might ask for the passcode, or it might throw `restricted` ("A restriction
  prevents your app from using Family Controls on this device"). **[UNVERIFIED]**

Errors that can come back (all from [FamilyControlsError](https://developer.apple.com/documentation/familycontrols/familycontrolserror)):
`restricted`, `invalidAccountType`, `invalidArgument` (code 3, usually the Simulator
or an entitlement problem), `authorizationConflict` ("another authorized app already
provides parental controls", which applies to `.child`), `authenticationMethodUnavailable`
(no passcode set), `networkError`, `unavailable` (region) and `authorizationCanceled`.
`src/lib/screen-time.ts` `requestAccess()` passes these through unhandled, and the
library rethrows them
(`node_modules/react-native-device-activity/ios/ReactNativeDeviceActivityModule.swift:566`).

**Action:** before launch, run onboarding on a phone signed into a real 13–17 child
account in a Family Sharing group, once with parental Screen Time restrictions off and
once with them on and a Screen Time passcode set. Note what the prompt shows and any
error code.

### What `.child` would mean for us

- It works only on a child account in a Family Sharing group, on a device not
  enrolled in MDM. **[APPLE]** ([forum 724627](https://developer.apple.com/forums/thread/724627))
- The parent has to authenticate on the teen's phone with their Apple Account.
  **[APPLE]**
- After that the teen **can't delete Locturne or sign out of iCloud**, and usage data
  is visible to the guardian. **[APPLE]** ([forum 716531](https://developer.apple.com/forums/thread/716531))
- Only one parental-control app per device (`authorizationConflict`), so it would
  collide with any other parental-control app the parent already uses. **[APPLE]**
- Testing it means a real child Apple Account, because Apple offers no test-only
  option. Another developer's forum question about this is still unanswered. **[REPORT]**
  ([forum 848981](https://developer.apple.com/forums/tags/family-controls))

This turns Locturne into parental control. It goes against the product, which is
about the user being in charge of their own morning, and it would need different copy,
support and probably a different entitlement justification. Our entitlement text
says "Authorization is requested for the individual user" (see
[ENTITLEMENT_SETUP.md](ENTITLEMENT_SETUP.md)).

### iOS 16 to 26 changes that matter

- iOS 15 supported `.child` only. Adults couldn't self-authorize. **[APPLE]**
  ([forum 681780](https://developer.apple.com/forums/thread/681780))
- iOS 16 added `.individual`. **[APPLE]**
- iOS 26 gives 13–17s age-appropriate defaults even on ordinary accounts and makes
  child accounts easier to set up. It added the Declared Age Range API. **[APPLE]**
  ([newsroom, June 2025](https://www.apple.com/newsroom/2025/06/apple-expands-tools-to-help-parents-protect-kids-and-teens-online/))
- iOS 26.4: a Screen Time passcode can lock the "Screen Time access" switch for an
  app. Opal uses this to make blocking stick on kids' phones. **[REPORT]**
  ([Opal](https://www.opal.so/help/what-is-screen-time-passcode))

## 2. Teens not in Family Sharing (for example a 16–17 with their own Apple Account)

`.individual` has no age check and is "available for all users", so it should work
the same as for an adult. **[APPLE]**, but **[UNVERIFIED]** by a device test. The
blockers are elsewhere:

- In the US, under-13s need a child account in a Family Sharing group. Depending on
  region, a child account may stay attached to the family until the user is 18.
  **[APPLE]** ([Family Sharing](https://support.apple.com/en-us/105062))
- iOS 26 applies teen defaults (web filters, communication safety) to 13–17
  accounts, but these don't touch Family Controls as far as I found. **[UNVERIFIED]**
- New Texas accounts created since 4 June 2026 must be age-verified, and minors must
  be linked to a parent for consent. So "a teen not in Family Sharing" will get rarer
  in states with these laws. **[APPLE]** ([Texas update](https://developer.apple.com/news/?id=sg176nne))

## 3. Payments: Ask to Buy, trials and refunds

- **Ask to Buy** turns a child's purchase or free download into a request to the
  family organizer or a parent. "Depending on the child's state, country, or region,
  Ask to Buy is turned on by default and can't be turned off if the child is under 18."
  A request that isn't approved within 24 hours expires and the child has to ask again.
  **[APPLE]** ([support 105055](https://support.apple.com/en-us/105055))
- **StoreKit**: the purchase returns `.pending`. If the parent approves, the
  transaction arrives later through `Transaction.updates`, possibly while the app is
  closed. **[APPLE]** ([Product.PurchaseResult.pending](https://developer.apple.com/documentation/storekit/product/purchaseresult/pending))
  RevenueCat reports this as a payment-pending state and pushes the entitlement through
  a `CustomerInfo` update once it's approved. Apple's advice is to show "waiting for
  approval", not an error. **[REPORT]** ([RevenueCat community](https://community.revenuecat.com/general-questions-7/ask-to-buy-on-ios-7564))
- **Trials**: starting a free trial is a subscription purchase, so it goes through
  Ask to Buy like any other purchase. **[UNVERIFIED]** Apple's page doesn't spell out
  trials, so confirm in sandbox. Auto-renewals don't need fresh approval. **[UNVERIFIED]**
- **What this does to the funnel**: a teen finishes onboarding at night, taps Start
  trial, and gets "Ask permission". The parent is often asleep, and the request dies
  after 24 hours. Tonight's lock doesn't arm, which breaks our "Tonight $0" promise.
  [v1-build/onboarding.md](v1-build/onboarding.md) already plans "Waiting for approval,
  nothing armed" plus a startup check for approved purchases (item 5). Both have to
  ship.
- **Refunds**: parents (or anyone) can ask Apple for a refund at
  reportaproblem.apple.com. Apple decides, not us. Refunds of a child's purchases are a
  common reason people give. **[REPORT]** ([FlashGet guide](https://parental-control.flashget.com/apple-subscription-refund-ask-to-buy-purchases))
  Expect higher refund rates from teen buyers. GAME_PLAN already says to judge net
  revenue after refunds.
- **Family Sharing of the subscription** is a lever for later. If we switch on
  Family Sharing for the annual product, a parent who buys it covers the teen's phone,
  with no Ask to Buy on the teen side. Apple doesn't let you turn this off once it's on,
  so don't do it on a whim. **[APPLE, from memory of App Store Connect help; re-check]**

## 4. Policy and law

### App Store age rating

- Apple's ratings are now **4+, 9+, 13+, 16+, 18+** (12+ and 17+ were removed in
  July 2025). The new questionnaire had to be answered by 31 January 2026. **[APPLE via
  press]** ([TechCrunch](https://techcrunch.com/2025/07/25/apple-broadens-app-stores-age-rating-system))
- Honestly answered, Locturne's questionnaire gives a low rating (no mature content,
  no UGC, no chat). That's how the competitors end up at 4+.
- **The Terms and the rating have to match**: "If your app has a EULA with minimum
  age requirements that exceed the rating that Apple calculated, you must override to a
  rating that adheres to the requirements." This uses *Override to Higher Age Rating*.
  **[APPLE via press]** ([App Store Connect help](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating),
  quoted by [ppc.land](https://ppc.land/apple-updates-app-store-age-ratings-system-with-granular-controls/))
  So Terms that say 18+ mean the store rating must be 18+. That hides the app from every
  teen whose parent caps app ratings, and from minors under the state laws.
- Guideline 2.3.6: answer the age questions honestly. Guideline 2.3.8: words like
  "for kids" in metadata are reserved for the Kids Category. **[APPLE]**
  ([guidelines](https://developer.apple.com/app-store/review/guidelines/))

### Kids Category and Guideline 5.1.4

- We aren't in the Kids Category and shouldn't be, because it bans purchase flows
  outside a parental gate (1.3). **[APPLE]**
- 5.1.4 still applies to any app that collects personal data from a minor: have a
  privacy policy and follow children's privacy laws. It also allows asking for a
  birthdate only to comply with those laws. **[APPLE]**

### COPPA (under-13s)

- COPPA covers sites and apps that are directed to children or that have **actual
  knowledge** they collect personal information from under-13s. The amended rule took
  effect 23 June 2025, with compliance required by 22 April 2026. **[REPORT]**
  ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule),
  [BBB](https://bbbprograms.org/media/insights/blog/coppa-amended))
- Our plan sends analytics (PostHog) and purchase data (RevenueCat) tied to persistent
  IDs. If we knowingly had under-13 users, that would need verifiable parental consent.
- The amended rule lists marketing and promotional materials among the factors for
  deciding whether a service is child-directed. **[UNVERIFIED wording]** TikTok content
  framed around middle-school life could count as evidence. Content about 18–29 bedtime
  scrolling, or high-school/college life, is fine.
- Opal's approach: "we do not knowingly collect Personal Data from children under the
  age of 13", plus a contact route to delete data. **[REPORT]** ([Opal terms](https://www.opal.so/terms))

### US state app-store laws (who must do what, and when)

| Law | Status (2026-10-03) | Lands on us |
|---|---|---|
| **Texas SB 2420** | Live for **new Texas Apple Accounts since 4 June 2026**. The Fifth Circuit stayed the injunction, SCOTUS refused to block it on 6 July 2026, and the merits appeal is ongoing. **[APPLE] [REPORT]** ([Apple](https://developer.apple.com/news/?id=sg176nne), [9to5Mac](https://9to5mac.com/2026/06/03/apple-says-texas-app-store-age-assurance-rules-start-tomorrow-after-court-ruling/), [Zyphe](https://www.zyphe.com/resources/news/texas-app-store-age-verification-scotus-july-2026)) | Use Apple's age category and consent status (Declared Age Range API). Notify Apple of "significant changes" through the PermissionKit Significant Change API. Listen for the App Store Server Notification that says a parent revoked consent. Delete verification data. Up to **$10,000 per violation**. **[REPORT]** ([Reed Smith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102kddh/texas-law-requires-age-verification-for-app-stores-and-developers/)) |
| **Utah SB 142** | A 2026 amendment moved operational duties to **6 May 2027** and removed AG enforcement. Parents can still sue: the greater of damages or $1,000 per violation. **[REPORT]** ([Wiley](https://www.wileyconnect.com/utah-amends-app-store-accountability-act-asaa-key-obligations-delayed-until-may-6-2027)) | Same kind of duties. The 2026 amendment narrowed "significant change" to adding IAP or ads. |
| **Louisiana HB 570** | Delayed to **1 July 2027** by HB 977 (signed 15 May 2026). **[REPORT]** ([reclaimthenet](https://reclaimthenet.org/bill/louisiana-app-store-accountability-act)) | Same kind of duties. Also: no binding minors to terms without parental approval. |
| **California AB 1043** | Effective **1 January 2027**. The OS sends an age bracket (<13, 13–15, 16–17, 18+). **[REPORT]** ([Wikipedia](https://en.wikipedia.org/wiki/California_Digital_Age_Assurance_Act), [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/california-introduces-new-age-verification-requirements-for-software-applications)) | Request the signal and treat it as the user's age, so we can't ignore known kids. Fines are $2,500 (negligent) or $7,500 (intentional) per affected child. AG enforcement only. |

Apple's tools: the Declared Age Range API (iOS 26+;
`AgeRangeService.isEligibleForAgeFeatures` says whether a user is covered), the
PermissionKit Significant Change API, StoreKit `AppStore.ageRatingCode`, and App Store
Server Notifications for revoked consent. Apple: "You are solely responsible for
ensuring compliance." **[APPLE]** ([Declared Age Range](https://developer.apple.com/documentation/declaredagerange/),
[Utah/Louisiana notice](https://developer.apple.com/news/?id=f5zj08ey))

What this means for us: Apple runs the parental consent for the download and the
purchase, so Ask to Buy already covers it. Our part is to read the signal, respect
revocation, and not change pricing or add ads without the significant-change step.
We're a paid-at-download-time (trial) app with no ads and no UGC, so the
significant-change risk is low.

### Does marketing on TikTok to teens create obligations?

- Not directly. No law makes organic TikTok videos create a duty in themselves. **[my
  reading; not legal advice]**
- Indirectly, yes: (a) COPPA's "directed to children" test looks at marketing and
  audience, so don't make content that reads as aimed at under-13s. (b) If we know
  many users are 13–17, the state laws above still apply through Apple's signals.
  (c) Guideline 2.3.8 bans "for kids"-style metadata. (d) TikTok's own ad rules limit
  paid ads aimed at minors. That only matters if we pay for ads. **[UNVERIFIED for
  current TikTok policy]**

## 5. What comparable apps do

| App | US rating (lookup 2026-10-03) | Teens / child accounts |
|---|---|---|
| Opal | 4+ | Parent guide: install on the child's phone, then lock it down with a Screen Time passcode (iOS 26.4+) and PIN. Terms: doesn't knowingly collect data from under-13s. ([guide](https://opalapp.com/help/how-to-set-up-parental-controls-with-opal)) |
| one sec | 4+ | Nothing about age found. **[UNVERIFIED]** |
| Brick | 4+ | Parent article: "opt-in tool to help adults and kids". Strict Mode stops the app being deleted while it's Bricked. ([support](https://support.getbrick.com/en/articles/6055553)) |
| Jomo | 4+ | "Not a parental control app", but can be used by any age. ([help](https://help.jomo.so/en/article/how-to-set-up-jomo-for-kids-1mtw6o7/)) |
| ScreenZen | 4+ | General audience. Nothing teen-specific found. **[UNVERIFIED]** |
| Alarmy | 4+ | General audience. |
| Erly (closest morning competitor) | 12+ (old scale; the lookup API may lag the new labels) | Nothing about age found. |

The pattern: everyone is general audience with a low rating. Nobody blocks teens, and
nobody builds a `.child` flow for self-blocking. Where there's a parent story, it's
"install on the kid's phone and lock it with Screen Time", not Family Controls
`.child`. The App Store lookup API may still show legacy labels; check the live
listings. **[REPORT]**

## 6. What a teen path would cost

**Option A: teen-tolerant (recommended for v1).** About 1–3 days.
1. Catch `FamilyControlsError` in `requestAccess()` and map it to plain screens.
   `restricted` and `invalidAccountType` get "Your iPhone's Screen Time is managed by a
   parent. Ask them to allow Locturne, then try again." `authenticationMethodUnavailable`
   gets "Set a passcode first." `networkError` gets "Connect to the internet." Send
   anything else to the existing declined path. (~0.5 day)
2. Ship the planned `.pending` purchase state ("Waiting for a parent to approve. We'll
   set up tonight's lock as soon as they do.") and a startup and foreground entitlement
   re-check that arms tonight on approval. (~0.5–1 day, mostly already planned)
3. Declared Age Range: iOS 26+ only, so gate it with `#available`. Check
   `isEligibleForAgeFeatures`. If true, call `requestAgeRange(ageGates: 13, 16, 18)`.
   If the user is under 13, show a polite "Locturne is for 13 and up" stop. Otherwise
   continue and keep only the bracket, never a birthdate. Needs a small native module,
   like our `modules/blocked-apps`. (~1 day) **[UNVERIFIED that an Expo module exists]**
4. Revoked-consent notifications: RevenueCat may not forward this notification type,
   in which case we'd need a tiny Cloudflare Worker endpoint. On revocation, disarm and
   show a note. (~0.5 day, can follow launch if we watch Texas installs) **[UNVERIFIED]**

Support load: low. It's an FAQ entry ("I'm under 18 and it says ask a parent") and
"my trial is pending" emails.

**Option B: a full parent-approved `.child` path.** About 1–2 weeks plus ongoing
support. It needs a second authorization mode, a parent-facing explanation, real child
test accounts (Apple has no test option), handling for `authorizationConflict` with
other parental-control apps, a deletion lock the teen didn't choose, guardian data
visibility, and probably a reworded entitlement justification. It also flips the story
from "you choose" to "your parent chose", which is wrong for the brand and for the
18–29 core. Not worth it for v1.

**Option C: hard 18+.** Cheap to build but expensive in reach. It needs an 18+ rating
override, which hides the app from teens with rating restrictions. It cuts off the
16–17s who'll arrive from TikTok, and it doesn't remove the state-law duties for any
minors who still get through. No competitor does this.

---

## Recommendation for v1

**Effectively 13+, general audience, teen-tolerant. No teen or parent product.**

**Onboarding**
- Don't add an age or birthday question. It adds friction and creates "actual
  knowledge" of under-13s.
- Keep `.individual` for everyone. Don't add `.child`.
- Add the Screen Time error screens from Option A step 1, with one "ask a parent"
  screen for `restricted` and `invalidAccountType`.
- Add the paywall's **pending** state and the arm-on-approval re-check (Option A
  step 2). The copy must not promise "tonight" when the purchase is pending.
- Add the Declared Age Range check before the paywall on iOS 26+ (Option A step 3):
  an under-13 stop, and keep only the bracket. Do this before launch, because Texas is
  live. If time is short, it's the one legal item that shouldn't slip past launch week.

**App Store age rating**
- Answer the questionnaire honestly, then **Override to Higher Age Rating: 13+** so it
  matches the Terms. Don't pick Kids Category, and keep "kids/children" wording out of
  metadata.

**Terms and Privacy "minimum age" line** (suggested wording)
> You must be at least 13 years old to use Locturne. If you are under 18, you may use
> Locturne only with the permission of a parent or guardian, who agrees to these Terms
> on your behalf. We do not knowingly collect personal information from children under
> 13; if you believe a child under 13 has used Locturne, contact us and we will delete
> their data.

**Before launch: device test (blocks the TL;DR "probably yes")**
- On a real 13–17 child account in Family Sharing: `.individual` with parental
  restrictions off, then on with a Screen Time passcode, and the sandbox Ask to Buy flow
  for the 7-day trial. Write the results back into this doc.

## Revisit after launch

- **Analytics**: how many installs hit the "ask a parent" screen or a pending
  purchase, and what share of those convert after approval. If it's material (say over
  10% of trial starts), consider the next two items.
- **Family Sharing on the annual subscription**, so a parent pays and the teen's
  phone is covered. You can't turn it off once it's on, so decide deliberately.
- **A "for parents" page** (web, not in-app) in Opal's style: install on the teen's
  phone and lock it with a Screen Time passcode (iOS 26.4+). Still no `.child`.
- **Legal calendar**: California AB 1043 (1 January 2027), Utah (6 May 2027),
  Louisiana (1 July 2027), and the Texas Fifth Circuit merits ruling. Re-read Apple's
  developer news before each date.
- **Significant Change API**: wire it up before any change that adds IAP types or
  ads, or changes the rating.
- **Revisit `.child`** only if parents become a real buying segment and we decide to
  sell a separate parent product.
