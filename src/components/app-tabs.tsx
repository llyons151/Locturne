'use no memo';
// Reads the navigation state during render (`navigation.getState()`), which changes outside its
// props. The React Compiler could cache that read, so it stays out here, like the screens (#130).

import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps, type BottomTabNavigationOptions } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Easing, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoonOrbView, isMoonOrbViewAvailable } from 'moon-orb';

import { MoonWater } from '@/components/moon-water';
import { tap } from '@/lib/haptics';
import { Nocturne, Space } from '@/theme';

type SymbolName = SymbolViewProps['name'];

// Filled glyphs throughout, as in the iOS 26 tab bar. `size` evens out optical weight:
// the grid and alarm read larger than the house at the same point size.
const TABS: Record<string, { label: string; icon: SymbolName; size: number }> = {
  index: {
    label: 'Home',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
    size: 22,
  },
  routine: {
    label: 'Routine',
    icon: { ios: 'alarm.fill', android: 'alarm', web: 'alarm' },
    size: 21,
  },
  apps: {
    label: 'Apps',
    icon: { ios: 'square.grid.2x2.fill', android: 'apps', web: 'apps' },
    size: 20,
  },
  profile: {
    label: 'You',
    icon: { ios: 'person.fill', android: 'person', web: 'person' },
    size: 21,
  },
};

/**
 * The nav from the user's reference (docs/design-references/rounded-panel-nav.png): the
 * screens sit on a panel with rounded bottom corners, and under it a black strip holds one
 * round button per tab, the current one filled white, with the Sleep button (the moon)
 * apart at the right.
 */
const BUTTON = 52;
const STRIP_TOP = 14;
/** The panel's bottom corners, close to the phone's own. */
export const PANEL_RADIUS = 44;

// Quick and settled: premium motion is fast, with no wobble at rest.
const PRESS = { damping: 18, stiffness: 420 };
/** The selected button's fill. */
const FADE = { duration: 180 };

/**
 * Switching tabs: a quiet "fade through" (docs/PAGE_TRANSITIONS.md). The sky, the moon and
 * the strip never move; only the page on the panel changes. The old page is gone within the
 * first ~40 ms, then the new one fades in and settles from 98% to full size on a long, soft
 * ease-out. Short, because tabs are switched often (HIG: no lingering motion on frequent
 * interactions), and a tap mid-transition simply retargets it.
 */
const SWITCH: BottomTabNavigationOptions['transitionSpec'] = {
  animation: 'timing',
  config: { duration: 260, easing: Easing.out(Easing.cubic) },
};

/**
 * A hidden page's opacity. Not 0: at opacity 0 iOS stops drawing liquid glass in the page
 * (expo-glass-effect's known issue), and it stays flat after the page fades back in, which is
 * what left the Apps list's glass cards plain on device. 1% is invisible.
 */
const HIDDEN = 0.01;

/**
 * Once a page is fully hidden it moves far off the panel. 1% opacity alone left every hidden
 * page faintly burned into the sky behind the shown one, glass cards most of all; off the
 * panel nothing of it is drawn, and its glass stays alive for when it fades back in.
 */
const parked = (progress: Parameters<NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']>>[0]['current']['progress']) =>
  progress.interpolate({ inputRange: [-1, -0.999, 0.999, 1], outputRange: [100000, 0, 0, 100000] });

/** `progress` is 0 for the shown tab and ±1 for the others (React Navigation). */
const fadeThrough: BottomTabNavigationOptions['sceneStyleInterpolator'] = ({ current }) => ({
  sceneStyle: {
    // Out by 40% of the way, so the two pages barely overlap: no double image on the sky.
    opacity: current.progress.interpolate({ inputRange: [-1, -0.4, 0, 0.4, 1], outputRange: [HIDDEN, HIDDEN, 1, HIDDEN, HIDDEN] }),
    transform: [
      { translateX: parked(current.progress) },
      { scale: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 0.98] }) },
    ],
  },
});

/** Reduce Motion: the same timing as a plain fade, nothing scales. */
const fadeOnly: BottomTabNavigationOptions['sceneStyleInterpolator'] = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({ inputRange: [-1, -0.4, 0, 0.4, 1], outputRange: [HIDDEN, HIDDEN, 1, HIDDEN, HIDDEN] }),
    transform: [{ translateX: parked(current.progress) }],
  },
});

/** The strip's height under the panel: the buttons, with the home indicator below them. */
export function tabStripHeight(safeBottom: number) {
  return STRIP_TOP + BUTTON + Math.max(safeBottom, Space.l);
}

/**
 * Space a scrolling tab screen should leave at the bottom. The bar no longer floats over
 * the screen, so this is only breathing room above the panel's rounded edge.
 */
export function useTabBarInset() {
  return Space.xxl;
}

export default function AppTabs() {
  const reduced = useReducedMotion();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // `animation` turns on the navigator's transition handling; the interpolator draws it.
        animation: 'fade',
        transitionSpec: SWITCH,
        sceneStyleInterpolator: reduced ? fadeOnly : fadeThrough,
        sceneStyle: {
          backgroundColor: 'transparent',
          // The panel: content scrolls under its rounded bottom edge, not under the strip.
          borderBottomLeftRadius: PANEL_RADIUS,
          borderBottomRightRadius: PANEL_RADIUS,
          overflow: 'hidden',
          // No `display: none` for hidden tabs on web any more: the navigator already fades
          // them to nothing and detaches them, and toggling `display` cut the fade off and
          // replayed Reanimated entrances out of place (October 8, 2026).
        },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name='index' />
      <Tabs.Screen name='routine' />
      <Tabs.Screen name='apps' />
      <Tabs.Screen name='profile' />
    </Tabs>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <View style={[styles.strip, { height: tabStripHeight(insets.bottom) }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;

          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              tap();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabButton
              key={route.key}
              tab={tab}
              focused={focused}
              reduced={reduced}
              onPress={onPress}
            />
          );
        })}
        <View style={styles.spacer} />
        <SleepButton reduced={reduced} />
      </View>
    </View>
  );
}

/**
 * Sleep sits apart from the tabs, like the separate search button in iOS 26's tab bar,
 * because it's an action rather than a place: it opens the Sleep sheet to put the apps
 * to sleep now. Where the reference has its colourful logo button, this is the "Moonwell"
 * orb the user picked (2026-10-06), drawn natively with Metal (`moon-orb`). Builds without
 * that module, and web, fall back to the SVG `MoonWater`.
 */
function SleepButton({ reduced }: { reduced: boolean }) {
  const press = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/sleep');
      }}
      onPressIn={() => {
        setPressed(true);
        if (!reduced) press.set(withSpring(0.9, PRESS));
      }}
      onPressOut={() => {
        setPressed(false);
        press.set(withSpring(1, PRESS));
      }}
      accessibilityRole='button'
      accessibilityLabel='Sleep'
      accessibilityHint='Puts your apps to sleep now'
    >
      <Animated.View style={[styles.sleep, style]}>
        {isMoonOrbViewAvailable ? (
          <MoonOrbView style={StyleSheet.absoluteFill} pressed={pressed} paused={reduced} />
        ) : (
          <MoonWater size={BUTTON} reduced={reduced} />
        )}
        <SymbolView
          name={{ ios: 'moon.fill', android: 'bedtime', web: 'bedtime' }}
          size={22}
          weight='semibold'
          tintColor='#FFFFFF'
        />
      </Animated.View>
    </Pressable>
  );
}

/** One round button: dark grey, or filled white with a dark icon when it's the current tab. */
function TabButton({
  tab,
  focused,
  reduced,
  onPress,
}: {
  tab: (typeof TABS)[string];
  focused: boolean;
  reduced: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const bounce = useSharedValue(1);
  const active = useSharedValue(focused ? 1 : 0);
  const mounted = useRef(false);

  useEffect(() => {
    active.set(reduced ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, FADE));
    // The icon gives a small hop when its tab is picked; not on first render.
    if (focused && mounted.current && !reduced) {
      bounce.set(withSequence(
        withTiming(0.82, { duration: 90 }),
        withSpring(1, { damping: 9, stiffness: 380 }),
      ));
    }
    mounted.current = true;
  }, [focused, reduced, active, bounce]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(active.value, [0, 1], [IDLE, Nocturne.cta]),
    transform: [{ scale: press.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) press.set(withSpring(0.9, PRESS));
      }}
      onPressOut={() => {
        press.set(withSpring(1, PRESS));
      }}
      accessibilityRole='tab'
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: focused }}
      hitSlop={4}
    >
      <Animated.View style={[styles.circle, circleStyle]}>
        <Animated.View style={iconStyle}>
          <SymbolView
            name={tab.icon}
            size={tab.size - 2}
            weight='semibold'
            tintColor={focused ? Nocturne.onCta : Nocturne.text}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** The resting buttons: a neutral dark grey on the black strip. */
const IDLE = '#1E1F23';

const styles = StyleSheet.create({
  // Black under the panel, as in the reference; the sky stops at the panel's edge.
  strip: {
    backgroundColor: '#000000',
    paddingTop: STRIP_TOP,
    paddingHorizontal: 20,
  },
  row: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
  },
  spacer: { flex: 1 },
  circle: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleep: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
