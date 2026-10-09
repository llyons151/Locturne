import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A counter for Home's "today" screen-time pill: bumped each time Home opens, each time the
 * app comes back to the foreground (Home may never lose focus while suspended), and when the
 * calendar day rolls over, so the report's day is requeried instead of showing yesterday.
 */
export function useVisit(day: string): number {
  const [visit, setVisit] = useState(0);
  const bump = useCallback(() => setVisit((v) => v + 1), []);
  useFocusEffect(bump);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') bump(); });
    return () => subscription.remove();
  }, [bump]);
  const shown = useRef(day);
  useEffect(() => {
    if (shown.current === day) return;
    shown.current = day;
    bump();
  }, [day, bump]);
  return visit;
}
