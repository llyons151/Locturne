// Copied from react-native-device-activity so the bundle ID matches the App ID registered
// with Apple (docs/ENTITLEMENT_SETUP.md). The plugin's copyToTargetFolder is off in app.json,
// so this folder is ours: update it by hand when upgrading the library.
const {
  createConfig,
} = require('react-native-device-activity/config-plugin/createExpoTargetConfig');

/** @type {import('@kingstinct/expo-apple-targets/build/config-plugin').ConfigFunction} */
module.exports = (config) => ({
  ...createConfig('shield-configuration')(config),
  bundleIdentifier: '.ShieldConfiguration',
  deploymentTarget: '16.4',
});
