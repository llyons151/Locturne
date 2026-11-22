/**
 * Dev, in a browser: `?awake=1` opens the app awake, to look at the UI late at night (user,
 * 2026-11-21: past bedtime, every reload ran onboarding again, set tonight's bedtime, and put the
 * app to sleep at once, with no phone to wake it and nothing really asleep for a pass to wake).
 *
 * Two parts. Here, before any of the app runs: between 8 pm and 10 am the clock is moved to 2 pm
 * the same day, still ticking, so every screen sees an ordinary afternoon. And `useAppStart`
 * skips onboarding with the default routine (bed 11 pm, up 7 am).
 * Kept for the tab (sessionStorage), so a reload or a page opened from the app stays awake.
 * `?awake=0` ends it. Never in a release build.
 */
const KEY = 'locturne.devAwake';
const labs = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';

function wanted(): boolean {
  if (!labs || typeof window === 'undefined') return false;
  try {
    const asked = new URLSearchParams(window.location.search).get('awake');
    if (asked === '1') window.sessionStorage.setItem(KEY, '1');
    if (asked === '0') window.sessionStorage.removeItem(KEY);
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const devAwake = wanted();

if (devAwake) {
  const Real = Date;
  const now = new Real();
  const hour = now.getHours();
  if (hour >= 20 || hour < 10) {
    const afternoon = new Real(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0).getTime();
    const shift = afternoon - now.getTime();
    // `new Date()` and `Date.now()` read the moved clock; dates made from a value are untouched.
    class Afternoon extends Real {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(Real.now() + shift);
        else super(...(args as [number]));
      }
      static now() {
        return Real.now() + shift;
      }
    }
    globalThis.Date = Afternoon as DateConstructor;
    console.log(`[dev] ?awake=1: the clock reads ${new Date().toLocaleTimeString()} (moved ${Math.round(shift / 60000)} min)`);
  }
}
