import type { WakeMethod } from './routine.ts';
import { getMorningPlace } from './place-spot.ts';
import { sharedGet } from './screen-time.ts';

/**
 * The saved scan code, apart from scan.ts so the lock controller can read it (scan.ts
 * imports the lock controller).
 */
export type ScanCode = {
  /** `qr`: one Locturne generated. `barcode`: a product's own code. */
  kind: 'qr' | 'barcode';
  /** The scanned text, as the camera reported it. */
  data: string;
  /** The camera's barcode type (`ean13`, `qr`...), for diagnostics. */
  type: string;
  registeredAt: number;
};

export const SCAN_CODE_KEY = 'locturne.scanCode';

export function getScanCode(): ScanCode | null {
  return sharedGet<ScanCode>(SCAN_CODE_KEY) ?? null;
}

/**
 * The method the morning really asks for: a scan morning with no code set up yet, or a place
 * morning with no place picked yet, falls back to steps.
 */
export function methodInUse(method: WakeMethod): WakeMethod {
  if (method === 'scan' && !getScanCode()) return 'steps';
  if (method === 'place' && !getMorningPlace()) return 'steps';
  return method;
}
