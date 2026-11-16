// Writes the iOS translation files from src/lib/i18n/locales (src/lib/i18n/catalogs.ts):
// each extension's Localizable.xcstrings and locales/ios/<code>.json. Run after changing a
// locale file: npm run i18n:catalogs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogFiles } from '../../src/lib/i18n/catalogs.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
for (const [path, content] of Object.entries(catalogFiles())) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
  console.log(`wrote ${path}`);
}
