import { requireOptionalNativeModule } from 'expo';

export type ProximityChange = { near: boolean; at: number };

type Subscription = { remove: () => void };

/**
 * The proximity sensor and the spoken count, for push-ups (ios/ProximityModule.swift). Null
 * off iOS, or on a build from before the module was added.
 */
export type ProximitySensor = {
  isAvailableAsync: () => Promise<boolean>;
  /** False when the sensor wouldn't turn on. */
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  say: (text: string) => Promise<void>;
  addListener: (event: 'onChange', listener: (change: ProximityChange) => void) => Subscription;
};

export const Proximity = requireOptionalNativeModule<ProximitySensor>('Proximity');
