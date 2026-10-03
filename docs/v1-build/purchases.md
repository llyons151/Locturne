# Purchases: RevenueCat behind `src/lib/purchases.ts`

Built October 3, 2026. GAME_PLAN Step 3 ("money and data"), the RevenueCat half. Nothing
here has run against the real App Store yet: it needs the setup in
[../REVENUECAT_SETUP.md](../REVENUECAT_SETUP.md) and a new development build.

## What changed

| Piece | Before | Now |
|---|---|---|
| Store | `createDevPurchases()` everywhere | `startPurchases()` (`src/lib/purchases-start.ts`, called by the root layout) configures `react-native-purchases` 10.11 and sets `createRevenueCatPurchases` (`src/lib/revenuecat.ts`). The dev stub runs only with the placeholder key, in Expo Go and on the web. |
| Key | None | `expo.extra.revenueCat.appleApiKey` in `app.json`, read through `expo-constants`. It's a public key, so it's committed. EAS builds then need no env setup, which an `EXPO_PUBLIC_` variable in a git-ignored `.env` would. |
| Prices and trials | Stub catalog | Offerings from App Store Connect, localized `priceString`. `trialDays` comes from the product's free intro offer, and only when `checkTrialOrIntroductoryPriceEligibility` says ELIGIBLE. Unknown counts as not eligible, so the paywall never promises a trial that may not come. |
| Products | 3 IDs, `longer-trial` was the annual product | 4 IDs (`PRODUCT_IDS`). The 14-day arm is its own $59.99 product, because a product has one intro offer per country at a time. |
| Exit-offer arm | Stub default (`longer-trial`) | Random thirds per install (`pickExitArm`), kept in the App Group (`locturne.exitArm`) and sent as the `exit_arm` attribute at startup. `exit_arm` in the current offering's metadata overrides it for everyone, to end the test without an update. An arm whose offering is missing offers nothing. |
| Entitlement | Stub record | `pro` active (a trial counts). Every answer is cached in the App Group (`locturne.entitlement`). With no network, the cache decides, believed up to 3 days past its end date (`OFFLINE_GRACE_MS`), so a paid user offline over a renewal keeps their lock. |
| Launch re-arm | The root layout gave the stub the App Group as its store (PRE_DEVICE_REVIEW bug 7 stopgap) | `useAppStart` → `armIfPaid()` on the real or cached entitlement. The stub still keeps its fake purchase in the App Group in dev mode. |
| Ask to Buy | Pending said "Waiting for approval"; arming waited for a relaunch | Same message. An approval that lands while the app runs fires `onEntitled` → `armIfPaid()`. The listener stays quiet while `purchase` or `restore` is in flight (their callers arm, after saving the new setup), so it can't arm the old routine first. |
| Errors | Stub outcomes | Cancelled is silent; `PAYMENT_PENDING` is `pending`; network/offline, "purchases turned off" (Screen Time restrictions, common for teens) and anything else are plain failures. |
| Attributes | `found` kept locally only | `found` (on `saveSetup`), `exit_arm` (at startup) and `exit_offer_shown` (when the exit offer shows) are sent as RevenueCat attributes. The local `locturne.attribution` copy stays for PostHog. |
| You tab | "Annual" hard-coded, Restore "not live" | Plan name from the entitlement. Restore is real and arms a saved, unarmed routine. Manage subscription opens Apple's sheet (`showManageSubscriptions`), or Apple's web page under the stub. |
| Paywall | | Unchanged apart from tolerating a missing exit offering. |

`src/lib/purchases.ts` keeps its interface. New on `PurchasesProvider`: `currentPlan`,
`manageSubscriptions`, `setAttributes`, `onEntitled`. New constants: `PRODUCT_IDS`,
`OFFERING_IDS`, `ENTITLEMENT_ID`, `ATTRIBUTES`. `Offers.exitOffers` is now `Partial`.
No RevenueCat or network code is in `targets/`.

No config plugin: `react-native-purchases` needs none, and In-App Purchase is on by
default for every App ID.

## Tests

`src/lib/revenuecat.test.ts` runs the provider against a fake SDK. It covers the key
check, intro offer → trial days, eligibility → trial strings (eligible, ineligible,
unknown, failed), localized prices, a missing offering, arm assignment and persistence,
the metadata override, each target buying its own product, cancel, pending and errors,
restore, the offline cache and its grace, plist-safe records, and `onEntitled` firing
for a later approval but not for an in-flight purchase. `purchases.test.ts` adds
`pickExitArm`, `planOf` and the missing-offer case. `npm test`: 270 passing;
`npm run test:tz`, `npx tsc --noEmit` and `npx expo lint` clean.

## Open questions

1. **A lapsed subscription doesn't disarm anything.** Entitlement gates arming only, as
   GAME_PLAN says. Someone who cancels keeps last-armed nights (the windows repeat)
   until they change the routine. Decide whether expiry should disarm. If so, do it at
   bedtime, never mid-morning.
2. **A declined user's re-entry to the paywall** (onboarding.md, "Needed outside this
   folder", item 6) is still not built. Restore and Ask to Buy approval are the only ways
   to arm after declining.
3. **`found` is sent only when the setup is saved** (purchase, or leaving from `commit`
   onward). People who quit earlier are missing from RevenueCat. They have no RevenueCat
   purchases anyway; PostHog should log the answer at the moment it's chosen.
4. **Sandbox can't approve a simulated Ask to Buy.** The approval path is unit-tested
   only until a TestFlight run with a real child account.
