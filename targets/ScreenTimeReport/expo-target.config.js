// Register the report extension point with the installed target plugin. A monitor preset
// would match and overwrite ActivityMonitorExtension during a subsequent prebuild.
const { KNOWN_EXTENSION_POINT_IDENTIFIERS } = require('@kingstinct/expo-apple-targets/build/target');
KNOWN_EXTENSION_POINT_IDENTIFIERS['com.apple.deviceactivityui.report-extension'] = 'device-activity-report';
module.exports = {
  type: 'device-activity-report',
  bundleIdentifier: '.ScreenTimeReport',
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'Charts', 'DeviceActivity'],
  entitlements: { 'com.apple.developer.family-controls': true },
};
