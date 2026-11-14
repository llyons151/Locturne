import { requireOptionalNativeModule } from 'expo';

type Native = {
  readCloud?(): string | null;
  readKeychain?(): string | null;
  write?(json: string): boolean;
  hasCloudAccount?(): boolean;
  addListener?(event: 'onCloudChange', listener: () => void): { remove(): void };
};

// Optional: web, the tests and builds from before the module was added have none, and do nothing.
const ProgressBackup = requireOptionalNativeModule<Native>('ProgressBackup');

export const backupAvailable = (): boolean => !!ProgressBackup?.readKeychain;

/** The iCloud copy and the Keychain copy, each null when there is none. */
export function readBackup(): { cloud: string | null; keychain: string | null } {
  return { cloud: ProgressBackup?.readCloud?.() ?? null, keychain: ProgressBackup?.readKeychain?.() ?? null };
}

/** Saves to both copies. False when the Keychain refused it or there's no module. */
export function writeBackup(json: string): boolean {
  return ProgressBackup?.write?.(json) ?? false;
}

export function hasCloudAccount(): boolean {
  return ProgressBackup?.hasCloudAccount?.() ?? false;
}

/** iCloud handed over a newer copy (a fresh install's, a while after launch, or another phone's). */
export function onCloudChange(listener: () => void): () => void {
  const sub = ProgressBackup?.addListener?.('onCloudChange', listener);
  return () => sub?.remove();
}
