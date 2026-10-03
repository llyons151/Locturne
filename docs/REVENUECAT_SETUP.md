# RevenueCat and App Store Connect setup

Written October 3, 2026, alongside the RevenueCat code (`src/lib/revenuecat.ts`,
`src/lib/purchases.ts`, `src/lib/purchases-start.ts`). Do the steps in order. Every ID
below is in the code exactly as written here: change one and the paywall can't find it.
Apple renames portal labels from time to time, so match by meaning if a label differs.

Until step 4.7 is done the app runs the dev stub ("Preview: nothing is charged" on the
paywall), so nothing breaks in the meantime.

## The IDs at a glance

| What | ID | Price | Intro offer |
|---|---|---|---|
| Subscription group | `Locturne` (reference name) | | |
| Annual (paywall default) | `locturne.annual` | $59.99 / 1 year | Free, 1 week (7 days) |
| Monthly | `locturne.monthly` | $9.99 / 1 month | None |
| Exit offer, `half-price` arm | `locturne.annual.halfprice` | $29.99 / 1 year | Free, 1 week (7 days) |
| Exit offer, `longer-trial` arm | `locturne.annual.longtrial` | $59.99 / 1 year | Free, 2 weeks (14 days) |
| RevenueCat entitlement | `pro` | | |
| Offering (current) | `default`: packages Annual → `locturne.annual`, Monthly → `locturne.monthly` | | |
| Offering | `exit-half-price`: package Annual → `locturne.annual.halfprice` | | |
| Offering | `exit-longer-trial`: package Annual → `locturne.annual.longtrial` | | |
| Customer attributes the app sets | `found`, `exit_arm`, `exit_offer_shown` | | |

Why the 14-day arm is its own product: Apple allows one introductory offer per product
per country at a time, and `locturne.annual` already has the 7-day one. Promotional
offers and offer codes don't fit either. Promotional offers need a server-signed
signature and in practice target existing or lapsed subscribers. Offer codes have to be
redeemed through a code. A second $59.99 product with a 2-week intro is the simplest
working option, and it shows up as its own row in RevenueCat's charts.

Intro-offer eligibility is per **subscription group**, so anyone who already used one
trial in the group gets no trial on any product. The code handles this: the trial
strings disappear, and the `longer-trial` arm offers nothing to that person.

Product IDs can never be reused, even after deletion. Type them carefully.

## 1. App Store Connect: money paperwork (Account Holder)

1. Sign in to https://appstoreconnect.apple.com as the Account Holder.
2. Open **Business** (older name: Agreements, Tax, and Banking).
3. **Paid Apps Agreement:** click **View and Agree to Terms** and accept. Until its
   status reads **Active**, subscriptions can't load. That includes sandbox testing.
4. **Bank account:** add the account the money goes to.
5. **Tax forms:** fill in the US tax form (W-9 if you're a US person; otherwise W-8BEN,
   which claims any treaty rate). Add any other countries' forms it asks for.
6. Wait for the agreement to show **Active**. This can take up to a day after banking
   and tax are in.
7. Recommended: enrol in the **App Store Small Business Program**
   (https://developer.apple.com/app-store/small-business-program/). Apple's cut drops
   from 30% to 15% while you earn under $1M a year. Do it before launch, because it
   only applies from enrolment onward.

## 2. App Store Connect: the app record

If the app record doesn't exist yet (the App Store submission docs may cover this):

1. **Apps → + → New App.** Platform iOS, name `Locturne`, primary language English (US),
   bundle ID `com.lukelyons.locturne`, SKU `locturne`.

## 3. App Store Connect: the subscriptions

### 3.1 The group

1. Open the app, then **Monetization → Subscriptions**.
2. Under **Subscription Groups**, click **+** (or **Create**). Reference name: `Locturne`.
3. In the group, under **Localization**, add English (U.S.): display name `Locturne`.
   An app name is optional; leave it empty to use the app's name.

### 3.2 The four products

Repeat these steps for each row of the table above. All four go in the `Locturne` group.

1. In the group, click **+** (Create subscription).
2. **Reference name** (only you see it): `Annual`, `Monthly`, `Annual half price`,
   `Annual 14-day trial`.
3. **Product ID**: exactly as in the table.
4. **Subscription Duration**: 1 Year for the three annual products, 1 Month for monthly.
5. **Availability**: all countries (the default).
6. **Subscription Prices → Add Subscription Price**: country United States, price as in
   the table. Accept Apple's automatic prices for every other country. The app shows
   whatever StoreKit returns, localized, so other currencies need no code.
7. **Localization → English (U.S.)**: display name and description. These show in
   Apple's purchase sheet and in Settings. Suggested (keep them plain, no health claims):
   - Annual: `Locturne Annual` / `Your apps sleep at bedtime and wake when you're up.`
   - Monthly: `Locturne Monthly` / same description.
   - Half price: `Locturne Annual` / same description. People who see it think of it
     as "the annual plan".
   - 14-day trial: `Locturne Annual` / same description.
8. **Review Information**: a screenshot of the paywall showing this product (any
   iPhone size; the web preview at `?step=plans` or `?step=declined&exit=half-price` is
   fine until device screenshots exist), and a review note such as:
   `Shown on the onboarding paywall (Annual/Monthly) or once as an exit offer after closing it.`
   The two exit products are only shown after the paywall is closed. Say so in the note,
   or the reviewer may not find them.
9. **Family Sharing**: leave **off** for now. Once turned on it can never be turned
   off (docs/TEEN_ACCOUNTS.md §3).
10. Save. The status reads **Ready to Submit** once price, localization and screenshot
   are in.

### 3.3 The intro offers (free trials)

For `locturne.annual`, `locturne.annual.halfprice` and `locturne.annual.longtrial` only.
Monthly has no intro offer.

1. Open the product → **Subscription Prices** → **+** → **Create Introductory Offer**.
2. Countries: all. Start date: today. End date: **No end date**.
3. Type: **Free**.
4. Duration: **1 Week** for `locturne.annual` and `locturne.annual.halfprice`;
   **2 Weeks** for `locturne.annual.longtrial`.
5. Confirm. The app reads the length from StoreKit, so the paywall says "7-day free trial"
   or "14 days free" without any code change.

### 3.4 Subscription levels (upgrades and downgrades in Settings)

In the group, drag the products into levels (level 1 is the highest):

| Level | Products |
|---|---|
| 1 | `locturne.annual`, `locturne.annual.longtrial` |
| 2 | `locturne.monthly` |
| 3 | `locturne.annual.halfprice` |

This makes Monthly → Annual an upgrade, which takes effect at once. Moving down to half
price takes effect only at the next renewal, so a full-price subscriber can't switch to
$29.99 mid-year for a prorated refund. iOS Settings will still list the half-price plan
to subscribers (GAME_PLAN accepts this).

### 3.5 First submission

Apple reviews the first subscriptions together with an app version. When the first
build goes to review, on the version page under **In-App Purchases and Subscriptions**,
click **+** and add all four products. Later price or offer changes don't need a new
app version.

## 4. RevenueCat

### 4.1 The In-App Purchase key (App Store Connect)

RevenueCat needs this to record StoreKit 2 purchases. Without it, purchases fail to record.

1. App Store Connect → **Users and Access → Integrations → In-App Purchase**.
2. **Generate In-App Purchase Key** (name: `RevenueCat`). Download the `.p8` file. You
   can only download it once. Store it outside the repo (`*.p8` is git-ignored anyway).
3. Note the **Key ID** and the **Issuer ID** shown on that page.

The legacy app-specific shared secret isn't needed by this SDK (v10, StoreKit 2). Add it
under the app in RevenueCat only if the dashboard asks for it.

### 4.2 Project and app

1. Sign up at https://app.revenuecat.com (the free tier covers launch).
2. **Create project**: `Locturne`.
3. **Apps & providers → + App Store app**: name `Locturne`, bundle ID
   `com.lukelyons.locturne`.
4. In that app, upload the `.p8` from 4.1 and enter the Issuer ID (and Key ID if asked).
5. Optional but useful: also add an **App Store Connect API key** (Users and Access →
   Integrations → App Store Connect API, role App Manager) so RevenueCat can import the
   products in 4.3 for you.
6. **Apple Server to Server notifications**: in the same app page, click **Apply in App
   Store Connect**. If you'd rather do it by hand: copy the URL, then in App Store
   Connect go to the app → **App Information → App Store Server Notifications**, paste it
   into both Production and Sandbox, and choose **Version 2**. This is how refunds and
   cancellations reach RevenueCat quickly. The exit-offer test is judged on revenue
   after refunds.

### 4.3 Products

**Product catalog → Products → + New** (or **Import**): add all four product IDs from
the table, App Store app.

### 4.4 The entitlement

**Product catalog → Entitlements → + New**: identifier `pro` (lowercase), description
`Locturne`. Open it, **Attach**, and attach **all four** products. The lock arms only
while `pro` is active, so a product left unattached would charge without unlocking.

### 4.5 Offerings

**Product catalog → Offerings → + New** three times:

1. Identifier `default`, description `Paywall`.
   - Package **Annual** (`$rc_annual`) → `locturne.annual`.
   - Package **Monthly** (`$rc_monthly`) → `locturne.monthly`.
   - Make it the **current** offering ("Make current" / the default offering).
2. Identifier `exit-half-price`, description `Exit offer: half price`.
   - Package **Annual** (`$rc_annual`) → `locturne.annual.halfprice`.
3. Identifier `exit-longer-trial`, description `Exit offer: 14 days free`.
   - Package **Annual** (`$rc_annual`) → `locturne.annual.longtrial`.

Use the Annual and Monthly package types, not custom ones. The code reads
`offering.annual` and `offering.monthly`. For the exit offerings it falls back to the
first package.

### 4.6 The exit-offer test

Nothing to set up: each install draws its arm (none / half-price / longer-trial, a third
each) the first time it runs, keeps it, and sends it as the `exit_arm` attribute.

- **Why not RevenueCat Experiments or Targeting:** they need a paid RevenueCat plan, and
  they choose the *whole* current offering. The arm only matters after the paywall
  closes, and a local draw works offline and on the free tier.
- **Stopping the test without an app update:** open the `default` offering → **Metadata**
  and set `{"exit_arm": "longer-trial"}` (or `"none"` / `"half-price"`). Everyone then
  gets that arm. Remove the key to go back to the random split.
- **Reading the results:** RevenueCat's charts can't filter by custom attributes. Two
  ways to compare:
  - Charts filtered by **product** show revenue, refunds and trial conversion for
    `locturne.annual.halfprice` and `locturne.annual.longtrial` directly.
  - For revenue per install in each arm, including the `none` arm: **Customers** (or
    **Audiences**) filtered by the `exit_arm` attribute, then export.

  Judge at day 35 on net revenue after refunds per install (GAME_PLAN). PostHog will
  make this easier once it's in.

### 4.7 The API key into the repo

1. **Project settings → API keys**: copy the **App Store** public app-specific key. It
   starts with `appl_`. It's public by design and safe to commit. Never use a secret key
   (`sk_…`) in the app.
2. In `app.json`, replace `REPLACE_WITH_REVENUECAT_PUBLIC_APPLE_KEY` under
   `expo.extra.revenueCat.appleApiKey` with it.
3. Build a new development build (`eas build --profile development --platform ios`).
   `react-native-purchases` is native code, so an update alone won't do it. The paywall's
   "Preview: nothing is charged" line disappears once RevenueCat is live.

The app falls back to the dev stub when the key is still the placeholder, in Expo Go, and
on the web. A `test_` key (RevenueCat's Test Store) is also accepted for trying flows
without App Store Connect.

## 5. Sandbox testers

1. App Store Connect → **Users and Access → Sandbox → Test Accounts → +**. Use an email
   that is not an Apple Account already (a `+sandbox1` alias of your Gmail works). Make
   two or three, so a fresh trial-eligible tester is always at hand.
2. On the iPhone (Developer Mode on): **Settings → Developer → Sandbox Apple Account**,
   and sign in with the tester. Your real Apple Account stays signed in for everything
   else.
3. Sandbox time runs fast: renewals and trials take minutes, not days (Apple's table:
   https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox).
   To make a tester trial-eligible again, use **Clear Purchase History** on the tester
   in App Store Connect, or switch to another tester.

## 6. Device test checklist (dev build, sandbox tester)

- [ ] **Prices:** `plans` shows $59.99/year with "$5.00/month · 7 days free", Monthly
  $9.99 with "No free trial", and "Save 49%". No "Preview" line in the fine print.
- [ ] **Buy the annual trial:** Apple's sheet says 1 week free → `armed`. RevenueCat →
  Customers shows the purchase, `pro` active, attributes `exit_arm` and `found` set.
- [ ] **Trial eligibility:** with that same tester, delete the app, reinstall and run
  onboarding. The paywall now says "Pick a plan", "Subscribe for $59.99/year" and no free
  days. The `longer-trial` arm offers nothing.
- [ ] **Restore:** reinstall, tap Restore on the first screen → "You're subscribed" → set
  up → `commit` arms without a paywall. You tab → Restore purchases → "You're subscribed".
- [ ] **You tab:** Manage subscription shows Annual or Monthly and opens Apple's sheet.
- [ ] **Cancel:** close Apple's purchase sheet. Nothing is said, nothing arms, and the
  buttons work again.
- [ ] **Ask to Buy:** set `"simulateAskToBuy": true` under `expo.extra.revenueCat` in
  `app.json`, rebuild, buy → "Waiting for approval", nothing armed, the setup saved.
  Set it back to `false` after. Sandbox can't approve a simulated request, so the
  approval half (tonight arms by itself once a parent approves, app open or not) is
  covered by `revenuecat.test.ts` and needs a real check in TestFlight with a Family
  Sharing child account (docs/TEEN_ACCOUNTS.md).
- [ ] **Exit offer, each arm:** set the `default` offering's metadata to
  `{"exit_arm": "half-price"}`, fresh install, close the paywall: "Fair. Half price,
  then." with $29.99 from the store; buy it and check RevenueCat shows
  `locturne.annual.halfprice`. Repeat with `"longer-trial"` (14 days free, buys
  `locturne.annual.longtrial`) and `"none"` (closing exits). Remove the metadata after.
- [ ] **Offline launch:** subscribed. Turn on airplane mode, force-quit and reopen. The
  You tab still shows the plan (from the cached entitlement in the App Group), and a
  night that was lost (nothing armed) re-arms at launch without a network.
- [ ] **Store not set up:** with no network on a fresh install, the paywall says "The
  App Store isn't answering" with Try again, never a made-up price.
