/**
 * expo-notifications always adds the push entitlement (`aps-environment`), and its plugin
 * has no switch for it. Locturne only schedules local notifications and never asks for a
 * push token, so the entitlement isn't needed, and with it the build fails: the App ID
 * doesn't have the Push Notifications capability. Remove this plugin if push ever arrives
 * (the v1.1 push-started Live Activity idea), and enable Push on the App ID then.
 *
 * It must sit before expo-notifications in app.json's plugins: entitlement mods run in
 * reverse order, so listing it first makes it run last. Check with
 * `npx expo config --type introspect`.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
