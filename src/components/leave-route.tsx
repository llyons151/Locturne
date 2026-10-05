import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Leaves a route that isn't for this build (the dev labs in a release build), back to the
 * tabs a deep link opened it over. By the navigator's own state, not history: on a cold web
 * load the tabs underneath aren't in the browser's history, so `back()` goes nowhere. And not
 * a `<Redirect href="/">`, which would put a second copy of the tabs on top.
 */
export function LeaveRoute() {
  useEffect(() => {
    router.dismissTo('/');
  }, []);
  return null;
}
