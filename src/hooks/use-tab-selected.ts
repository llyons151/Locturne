import { useNavigation, useRoute } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

/**
 * Whether this tab is the one picked in the tab bar. Unlike focus, a sheet opened over the
 * tab (Sleep, Push-ups) doesn't change it, so a page doesn't scroll to its top or replay its
 * entrance just because a popup came and went.
 */
export function useTabSelected() {
  const navigation = useNavigation();
  const route = useRoute();
  const read = () => {
    const state = navigation.getState();
    return state ? state.routes[state.index]?.key === route.key : true;
  };
  const [selected, setSelected] = useState(read);
  const key = route.key;
  // Subscribed once per navigator and route, not again on every render.
  useEffect(() => {
    const update = () => {
      const state = navigation.getState();
      setSelected(state ? state.routes[state.index]?.key === key : true);
    };
    update();
    return navigation.addListener('state', update);
  }, [navigation, key]);
  return selected;
}

/**
 * Is the route `key` in view, as far as tabs go? Only a tab navigator hides it, behind another
 * tab: a page in a stack (a list's own page) counts as shown under a sheet route, and so does a
 * route with no state yet.
 */
export function routeShown(
  state: { type?: string; index: number; routes: readonly { key: string }[] } | undefined,
  key: string,
): boolean {
  if (state?.type !== 'tab') return true;
  return state.routes[state.index]?.key === key;
}

/**
 * The same question as `useTabSelected`, asked when called instead of kept in state, so a tab
 * switch re-renders nothing. For listeners (a lock sync, a return to the front) that a tab out
 * of sight can skip: its `useFocusEffect` reloads it on the way back. A sheet over the tab
 * leaves it shown, so the page behind a sheet keeps updating.
 */
export function useTabShown(): () => boolean {
  const navigation = useNavigation();
  const { key } = useRoute();
  return useCallback(() => routeShown(navigation.getState(), key), [navigation, key]);
}
