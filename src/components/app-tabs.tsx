'use no memo';
// Reads the navigation state during render (`navigation.getState()`), which changes outside its
// props. The React Compiler could cache that read, so it stays out here, like the screens (#130).

import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
  apps: {
    label: 'Apps',
    icon: { ios: 'square.grid.2x2.fill', android: 'apps', web: 'apps' },
    size: 20,
  },
  routine: {
    label: 'Routine',
    icon: { ios: 'alarm.fill', android: 'alarm', web: 'alarm' },
    size: 21,
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
const FADE = { duration: 180 };

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

const isCurrentTab = (state: { index: number; routes: { key: string }[] } | undefined, key: string) =>
  !state || state.routes[state.index]?.key === key;

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={({ navigation, route }) => ({
        headerShown: false,
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: FADE },
        sceneStyle: {
          backgroundColor: 'transparent',
          // The panel: content scrolls under its rounded bottom edge, not under the strip.
          borderBottomLeftRadius: PANEL_RADIUS,
          borderBottomRightRadius: PANEL_RADIUS,
          overflow: 'hidden',
          // Web keeps visited tabs mounted; hide their content behind the shared backdrop.
          // Native detaches inactive tabs by itself. Compare against this navigator's own
          // state, not `isFocused()`: that is also false while a screen sits on top of the
          // tabs, and those stale options left a tab blank when you came back to it.
          ...(Platform.OS === 'web' && {
            display: isCurrentTab(navigation.getState(), route.key) ? 'flex' : 'none',
          }),
        },
      })}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name='index' />
      <Tabs.Screen name='apps' />
      <Tabs.Screen name='routine' />
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
 * to sleep now. Where the reference has its colourful logo button, this is moonlight moving
 * like light on water (`MoonWater`, which the user asked for), kept inside the circle.
 */
function SleepButton({ reduced }: { reduced: boolean }) {
  const press = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/sleep');
      }}
      onPressIn={() => {
        if (!reduced) press.set(withSpring(0.9, PRESS));
      }}
      onPressOut={() => {
        press.set(withSpring(1, PRESS));
      }}
      accessibilityRole='button'
      accessibilityLabel='Sleep'
      accessibilityHint='Puts your apps to sleep now'
    >
      <Animated.View style={[styles.sleep, style]}>
        <MoonWater size={BUTTON} reduced={reduced} />
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
