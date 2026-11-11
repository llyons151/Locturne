// Register the report extension point with the installed target plugin. A monitor preset
// would match and overwrite ActivityMonitorExtension during a subsequent prebuild.
const target = require('@kingstinct/expo-apple-targets/build/target');
target.KNOWN_EXTENSION_POINT_IDENTIFIERS['com.apple.deviceactivityui.report-extension'] = 'device-activity-report';
// A Device Activity report must be an ExtensionKit extension, embedded in the app's Extensions folder
// (App Store processing refused it as a PlugIns NSExtension: ITMS 91179, 2026-11-10). The plugin only
// knows that for app intents, so it's told here; plugins/with-extensionkit-report.js fixes the product's
// file name (the plugin names ExtensionKit products `.app`; they're `.appex`).
if (!target.productTypeForType.__report) {
  const base = target.productTypeForType;
  target.productTypeForType = (type) =>
    type === 'device-activity-report' ? 'com.apple.product-type.extensionkit-extension' : base(type);
  target.productTypeForType.__report = true;
}
module.exports = {
  type: 'device-activity-report',
  bundleIdentifier: '.ScreenTimeReport',
  deploymentTarget: '17.4',
  frameworks: ['SwiftUI', 'Charts', 'DeviceActivity'],
  entitlements: { 'com.apple.developer.family-controls': true },
};
