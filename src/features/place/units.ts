import { getLocales } from 'expo-localization';

/** Miles where people think in miles. */
export function usesMiles(): boolean {
  const system = getLocales()[0]?.measurementSystem;
  return system === 'us' || system === 'uk';
}
