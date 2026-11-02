import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { syncLock } from '@/lib/lock-controller';
import { isScreenTimeAvailable, sharedGet, sharedSet, SHIELD_MOON_KEY } from '@/lib/screen-time';

import { MOON_ICONS } from './moon-icons';
import { useWornMoon } from './moon-theme';

/**
 * The block screen's icon is the flat icon of the moon you wear (user, 2026-11-02: the frosted
 * shield, "just the moon icon"). The shield extension can only load an image from the app
 * group's folder, so the worn moon's icon is copied there and its name saved under
 * `SHIELD_MOON_KEY`; `shieldConfig` (screen-time.ts) names it. Until a copy lands, or for a
 * moon with no icon, the shield keeps the moon symbol.
 */
const APP_GROUP = 'group.com.lukelyons.locturne';
const PREFIX = 'shield-moon-';

async function copyShieldMoon(id: string): Promise<void> {
  // A bundled image is a module number (`require`).
  const module = MOON_ICONS[id];
  const root = Paths.appleSharedContainers?.[APP_GROUP];
  if (typeof module !== 'number' || !root) return;
  const name = `${PREFIX}${id}.webp`;
  const dest = new File(root, name);
  if (!dest.exists) {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (!asset.localUri) return;
    new File(asset.localUri).copy(dest);
  }
  // Last moon's copies go: only the worn one is ever named.
  for (const entry of new Directory(root).list()) {
    if (entry instanceof File && entry.name.startsWith(PREFIX) && entry.name !== name) entry.delete();
  }
  if (sharedGet<string>(SHIELD_MOON_KEY) === name) return;
  sharedSet(SHIELD_MOON_KEY, name);
  // Rewrites every shield's words and look with the new icon.
  syncLock();
}

/** At launch and on each moon change, puts the worn moon's icon on the block screen. */
export function useShieldMoon(): void {
  const { id } = useWornMoon();
  useEffect(() => {
    if (Platform.OS !== 'ios' || !isScreenTimeAvailable()) return;
    copyShieldMoon(id).catch(() => {
      // The copy failed: the shield keeps the last icon it had, or the moon symbol.
    });
  }, [id]);
}
