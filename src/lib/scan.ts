/**
 * Scan your code (GAME_PLAN, "Wake-up methods"): the person keeps a code in another room,
 * either a QR Locturne makes for them or a product barcode they register (the coffee bag,
 * the toothpaste). In the morning, scanning that one code proves they got there. It's the
 * leading candidate for the accessible option: a short walk to one spot, no stairs, no 200
 * steps.
 *
 * Rules:
 * - Only the registered code counts. Any other QR or barcode is refused.
 * - The code can only be set or changed while the apps are awake (`day` or `off`). Otherwise
 *   someone could register the cereal box next to the bed at 7am. Since any change made in
 *   the day is in place before the next morning, this is the next-bedtime rule.
 * - A scan only unlocks in `morning`: bedtime wins.
 *
 * Matching and code generation are pure; the bottom of the file applies them.
 */
import { readLock, syncLock } from './lock-controller.ts';
import { recordProof } from './morning-proof.ts';
import { sharedGet, sharedSet } from './screen-time.ts';

export type ScanCode = {
  /** `qr`: one Locturne generated. `barcode`: a product's own code. */
  kind: 'qr' | 'barcode';
  /** The scanned text, as the camera reported it. */
  data: string;
  /** The camera's barcode type (`ean13`, `qr`...), for diagnostics. */
  type: string;
  registeredAt: number;
};

/** Every generated QR starts with this, so a stray QR elsewhere can't be confused for one. */
export const QR_PREFIX = 'LOCTURNE-';

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

/**
 * A fresh per-user QR payload. `random` returns a number in [0, 1) and is only a parameter
 * for the tests. Not a secret: it only has to differ from everyone else's printout.
 */
export function generateQrData(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 12; i++) id += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `${QR_PREFIX}${id}`;
}

/**
 * The comparable form of a scan. Product barcodes come back in more than one shape: iOS
 * reports a UPC-A (12 digits) as an EAN-13 with a leading 0, so all-digit codes lose their
 * leading zeros. Everything else is compared exactly, trimmed.
 */
export function normalize(data: string): string {
  const trimmed = data.trim();
  return /^\d+$/.test(trimmed) ? trimmed.replace(/^0+(?=\d)/, '') : trimmed;
}

/** Pure: does a scan match the registered code? */
export function matches(code: ScanCode | null | undefined, scanned: string): boolean {
  if (!code) return false;
  return normalize(code.data) === normalize(scanned);
}

/** Pure: is this scan a code that can be registered? Empty scans and URLs are refused. */
export function registrable(data: string): boolean {
  const trimmed = data.trim();
  // A URL is usually a poster, menu or another app's code: it can change or be anywhere.
  return trimmed.length >= 4 && !/^[a-z]+:\/\//i.test(trimmed);
}

/** Why the code can't be set now, or null. Phases come from `lock-state.ts`. */
export function editRefusal(phase: string): 'asleep' | null {
  return phase === 'night' || phase === 'morning' ? 'asleep' : null;
}

/* Applying it. */

const KEY = 'locturne.scanCode';

export function getScanCode(): ScanCode | null {
  return sharedGet<ScanCode>(KEY) ?? null;
}

/** Can the code be set or changed right now? */
export function getScanEditRefusal(now = new Date()): 'asleep' | null {
  return editRefusal(readLock(now).phase);
}

/** Saves the code, unless the apps are asleep. Returns the refusal, or null once saved. */
export function registerScanCode(
  code: Omit<ScanCode, 'registeredAt'>,
  now = new Date(),
): 'asleep' | 'unusable' | null {
  const refusal = getScanEditRefusal(now);
  if (refusal) return refusal;
  if (!registrable(code.data)) return 'unusable';
  sharedSet(KEY, { ...code, data: code.data.trim(), registeredAt: now.getTime() });
  return null;
}

export type ScanResult = 'unlocked' | 'wrongCode' | 'noCode' | 'notMorning';

/**
 * A morning scan. The registered code records this morning's proof and wakes the apps;
 * anything else changes nothing.
 */
export function submitScan(data: string, now = new Date()): ScanResult {
  const code = getScanCode();
  if (!code) return 'noCode';
  if (!matches(code, data)) return 'wrongCode';
  const state = readLock(now);
  if (state.phase !== 'morning') return 'notMorning';
  recordProof({ morningKey: state.morningKey, kind: 'scan', at: now.getTime() });
  syncLock(now);
  return 'unlocked';
}
