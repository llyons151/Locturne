import type { WakeMethod } from './routine.ts';
import { getMorningPlace } from './place-spot.ts';
import { sharedGet } from './screen-time.ts';
import { noStepCounter } from './step-counter.ts';

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

const codeListeners = new Set<() => void>();

/**
 * Hears a code saved (`registerScanCode`). The code sheet listens, so it shows the tick even
 * when iOS doesn't tell it it's back on top after the camera (a full-screen modal closing over
 * a transparent one). Returns the unsubscribe.
 */
export function onScanCodeChange(listener: () => void): () => void {
  codeListeners.add(listener);
  return () => void codeListeners.delete(listener);
}

/** Tells `onScanCodeChange` listeners a code was saved. */
export function scanCodeChanged(): void {
  for (const listener of codeListeners) listener();
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

/**
 * The method a morning really runs on: `methodInUse`, and on a device with no step counter
 * (step-counter.ts) a walk morning is Step away, its timer from the morning
 * start. Setup screens keep `methodInUse` (their "not set up yet" notes are about scan and place).
 */
export function morningMethod(method: WakeMethod): WakeMethod {
  const used = methodInUse(method);
  if (used === 'steps' && noStepCounter()) return 'downtime';
  return used;
}
