// The Block now countdown: a Live Activity in the Dynamic Island and on the Lock Screen
// (NapActivityWidget.swift). The app starts and ends it (modules/blocked-apps, nap-activity.ts).
/** @type {import('@kingstinct/expo-apple-targets/build/config-plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  bundleIdentifier: '.NapActivity',
  deploymentTarget: '16.4',
  // Reads the worn moon's icon from the app group.
  entitlements: { 'com.apple.security.application-groups': ['group.com.lukelyons.locturne'] },
});
