import { router } from 'expo-router';
import { useEffect } from 'react';

import { hasRoutine } from '@/lib/routine';

/**
 * Leaves a route that isn't for this build (the dev labs in a release build), back to the
 * tabs a deep link opened it over. By the navigator's own state, not history: on a cold web
 * load the tabs underneath aren't in the browser's history, so `back()` goes nowhere. And not
 * a `<Redirect href="/">`, which would put a second copy of the tabs on top.
 *
 * With no routine yet (a first launch opened by a deep link) there are no tabs worth landing on:
 * it becomes onboarding instead (`useAppStart` leaves that to the route, so it isn't pushed twice).
 */
export function leaveLab() {
  if (hasRoutine()) router.dismissTo('/');
  else router.replace('/onboarding');
}

export function LeaveRoute() {
  useEffect(() => {
    leaveLab();
  }, []);
  return null;
}
