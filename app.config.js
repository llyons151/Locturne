// app.json holds the config; this only refuses to make a store build that would give the
// app away. Without a real RevenueCat key the app runs the dev purchase stub, which unlocks
// everything for free (src/lib/purchases-start.ts), and a `test_` key is RevenueCat's Test
// Store, which Apple rejects. Development and preview builds may use either.
module.exports = ({ config }) => {
  const key = config.extra?.revenueCat?.appleApiKey;
  if (process.env.EAS_BUILD_PROFILE === 'production' && !/^appl_[A-Za-z0-9]+$/.test(String(key ?? '').trim())) {
    throw new Error(
      'Production build without a RevenueCat Apple key: set expo.extra.revenueCat.appleApiKey ' +
        'in app.json to the appl_ key (docs/REVENUECAT_SETUP.md).',
    );
  }
  // The dev labs include "Disarm schedule", and a keyless preview build sells for free.
  if (process.env.EAS_BUILD_PROFILE === 'production' && process.env.EXPO_PUBLIC_DEV_LABS) {
    throw new Error('Production build with EXPO_PUBLIC_DEV_LABS set: unset it (it belongs to the preview profile).');
  }
  // Free testing makes everyone subscribed (src/lib/purchases-start.ts).
  if (process.env.EAS_BUILD_PROFILE === 'production' && process.env.EXPO_PUBLIC_FREE_TESTING) {
    throw new Error('Production build with EXPO_PUBLIC_FREE_TESTING set: unset it (it is for testing builds only).');
  }
  return config;
};
