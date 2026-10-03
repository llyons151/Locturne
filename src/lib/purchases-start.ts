/**
 * Picks the store once, at startup (the root layout calls this before anything renders).
 *
 * RevenueCat runs in a development or release build on iOS with a real key in app.json
 * (`expo.extra.revenueCat.appleApiKey`, docs/REVENUECAT_SETUP.md). With the placeholder key,
 * in Expo Go or on the web, the dev stub runs instead: nothing is charged and the paywall
 * says so. Both keep what they must remember in the App Group, so a paid user's lost night
 * is re-armed at launch even with no network (`useAppStart`).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { createDevPurchases, setPurchasesProvider } from './purchases';
import { createRevenueCatPurchases, revenueCatKey } from './revenuecat';
import { sharedGet, sharedSet } from './screen-time';

const appGroup = { get: sharedGet, set: sharedSet };

export function startPurchases(): void {
  const extra = Constants.expoConfig?.extra as
    | { revenueCat?: { appleApiKey?: unknown; simulateAskToBuy?: unknown } }
    | undefined;
  const apiKey = revenueCatKey(extra?.revenueCat?.appleApiKey);
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (!apiKey || Platform.OS !== 'ios' || expoGo) {
    setPurchasesProvider(createDevPurchases({ latencyMs: 400, store: appGroup }));
    return;
  }
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG).catch(() => {});
  Purchases.configure({ apiKey });
  // Sandbox only, dev builds only: every purchase comes back pending, like a teen's Ask to Buy.
  if (__DEV__ && extra?.revenueCat?.simulateAskToBuy === true) {
    Purchases.setSimulatesAskToBuyInSandbox(true).catch(() => {});
  }
  setPurchasesProvider(createRevenueCatPurchases(Purchases, { store: appGroup }));
}
