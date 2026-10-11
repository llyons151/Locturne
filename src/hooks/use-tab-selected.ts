import { useNavigation, useRoute } from 'expo-router';
import { useEffect, useState } from 'react';

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
