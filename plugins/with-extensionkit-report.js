// The ScreenTimeReport target is an ExtensionKit extension (targets/ScreenTimeReport/expo-target.config.js).
// @kingstinct/expo-apple-targets names an ExtensionKit product `<name>.app`, but Xcode builds it as
// `<name>.appex`, so the Embed ExtensionKit Extensions phase would point at a file that doesn't exist.
// Run last (a finalized mod), on the written project file.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('expo/config-plugins');

module.exports = function withExtensionKitReport(config) {
  return withFinalizedMod(config, [
    'ios',
    async (config) => {
      const root = config.modRequest.platformProjectRoot;
      const proj = fs.readdirSync(root).find((f) => f.endsWith('.xcodeproj'));
      const file = path.join(root, proj, 'project.pbxproj');
      const text = fs.readFileSync(file, 'utf8');
      const fixed = text.replace(
        /(explicitFileType = "?wrapper\.extensionkit-extension"?;[^}]*?path = "?)ScreenTimeReport\.app("?;)/g,
        '$1ScreenTimeReport.appex$2',
      );
      if (fixed !== text) fs.writeFileSync(file, fixed);
      return config;
    },
  ]);
};
