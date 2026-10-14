import { useNavigation } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Easing, useReducedMotion, withTiming } from 'react-native-reanimated';

import { appsMoonRoom, MOON_GONE, MOON_RAISED, MOON_SHOWS_FROM, moonSink } from '@/components/night-sky';

/** The tab picked in the tab bar, by route name. A sheet opened over it doesn't change it. */
function useSelectedTab() {
  const navigation = useNavigation();
  const read = () => {
    const state = navigation.getState();
    return state ? state.routes[state.index]?.name : undefined;
  };
  const [name, setName] = useState(read);
  // Subscribed once per navigator, not again on every render.
  useEffect(() => {
    const update = () => {
      const state = navigation.getState();
      setName(state ? state.routes[state.index]?.name : undefined);
    };
    update();
    return navigation.addListener('state', update);
  }, [navigation]);
  return name;
}

/**
 * Home is the tab the moon rests on. Apps raises it into the sky its few tiles leave empty,
 * while they leave room (user, 2026-10-10); Routine and You sink it out of sight (user, 2026-10-13 and
 * 2026-10-14); any other tab sinks it, so their cards sit on calm, dark sky. Run
 * from Home, which stays mounted under the others, so one place decides.
 */
export function useMoonSink() {
  const reduced = useReducedMotion();
  const tab = useSelectedTab();
  const appsRoom = useSyncExternalStore(appsMoonRoom.subscribe, appsMoonRoom.get);
  useEffect(() => {
    const to = tab === 'index' ? 0 : tab === 'apps' && appsRoom ? MOON_RAISED : tab === 'routine' || tab === 'profile' ? MOON_GONE : 1;
    // Back from out of sight: start at the edge, so it's seen moving from the first frame.
    if (!reduced && to < MOON_SHOWS_FROM && moonSink.get() > MOON_SHOWS_FROM) moonSink.set(MOON_SHOWS_FROM);
    moonSink.set(reduced ? to : withTiming(to, { duration: 1600, easing: Easing.bezier(0.45, 0, 0.25, 1) }));
  }, [tab, appsRoom, reduced]);
  useEffect(() => () => moonSink.set(0), []);
}
