/**
 * Picks the store once, at startup (the root layout calls this before anything renders).
 *
 * RevenueCat runs in a development or release build on iOS with a real key in app.json
 * (`expo.extra.revenueCat.appleApiKey`, docs/REVENUECAT_SETUP.md). With the placeholder key,
 * in Expo Go or on the web, the dev stub runs instead: nothing is charged and the paywall
 * says so. A production EAS build refuses to start without a real key (app.config.js), and
 * any other release build on iOS without one (an Xcode archive, say) sells nothing and
 * unlocks nothing, except a preview build (`EXPO_PUBLIC_DEV_LABS`). Both keep what they must
 * remember in the App Group, so a paid user's lost night is re-armed at launch even with no
 * network (`useAppStart`).
 *
 * Free testing: with `EXPO_PUBLIC_FREE_TESTING=1` (eas.json's development and preview
 * profiles, and .env for `expo start`) the stub starts already subscribed, whatever the key,
 * so onboarding skips the paywall and nothing asks to be paid for. app.config.js refuses a
 * production build with it set. Remove it from those three places to test the paywall.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { createClosedPurchases, createDevPurchases, setPurchasesProvider } from './purchases';
import { createRevenueCatPurchases, revenueCatKey } from './revenuecat';
import { sharedGet, sharedSet } from './screen-time';

const appGroup = { get: sharedGet, set: sharedSet };

export function startPurchases(): void {
  const extra = Constants.expoConfig?.extra as
    | { revenueCat?: { appleApiKey?: unknown; simulateAskToBuy?: unknown } }
    | undefined;
  const apiKey = revenueCatKey(extra?.revenueCat?.appleApiKey, { allowTestStore: __DEV__ });
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (process.env.EXPO_PUBLIC_FREE_TESTING === '1') {
    setPurchasesProvider(createDevPurchases({ latencyMs: 400, store: appGroup, entitled: true }));
    return;
  }
  if (!apiKey && Platform.OS === 'ios' && !expoGo && !__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') {
    setPurchasesProvider(createClosedPurchases());
    return;
  }
  if (!apiKey || Platform.OS !== 'ios' || expoGo) {
    setPurchasesProvider(createDevPurchases({ latencyMs: 400, store: appGroup }));
    return;
  }
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => {});
  // Trusted Entitlements: a proxy rewriting RevenueCat's answers is caught (revenuecat.ts).
  Purchases.configure({
    apiKey,
    entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
  });
  // Sandbox only, dev builds only: every purchase comes back pending, like a teen's Ask to Buy.
  if (__DEV__ && extra?.revenueCat?.simulateAskToBuy === true) {
    Purchases.setSimulatesAskToBuyInSandbox(true).catch(() => {});
  }
  setPurchasesProvider(createRevenueCatPurchases(Purchases, { store: appGroup }));
}
