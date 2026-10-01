import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Nocturne } from "@/constants/nocturne";
import { Spacing } from "@/constants/theme";
import { tap } from "@/features/onboarding/haptics";

type SymbolName = SymbolViewProps["name"];

// Filled glyphs throughout, as in the iOS 26 tab bar. `size` evens out optical weight:
// the grid and alarm read larger than the house at the same point size.
const TABS: Record<string, { label: string; icon: SymbolName; size: number }> = {
  index: {
    label: "Home",
    icon: { ios: "house.fill", android: "home", web: "home" },
    size: 22,
  },
  apps: {
    label: "Apps",
    icon: { ios: "square.grid.2x2.fill", android: "apps", web: "apps" },
    size: 20,
  },
  nap: {
    label: "Nap",
    icon: { ios: "moon.zzz.fill", android: "bedtime", web: "bedtime" },
    size: 21,
  },
  routine: {
    label: "Routine",
    icon: { ios: "alarm.fill", android: "alarm", web: "alarm" },
    size: 21,
  },
  profile: {
    label: "You",
    icon: { ios: "person.fill", android: "person", web: "person" },
    size: 21,
  },
};

const BAR_HEIGHT = 62;
const BAR_PADDING = 4;
// How far the bar dips into the bottom safe area, toward the home indicator.
const BAR_DROP = 14;

// Quick and settled: premium motion is fast, with no wobble at rest.
const SLIDE = { damping: 24, stiffness: 320, mass: 0.8 };
const PRESS = { damping: 18, stiffness: 420 };
const FADE = { duration: 180 };

/** Space a scrolling tab screen should leave at the bottom so content clears the bar. */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return barBottom(insets.bottom) + BAR_HEIGHT + Spacing.three;
}

const barBottom = (safeBottom: number) => Math.max(safeBottom - BAR_DROP, Spacing.three);

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={({ navigation }) => ({
        headerShown: false,
        animation: "fade",
        transitionSpec: { animation: "timing", config: FADE },
        sceneStyle: {
          backgroundColor: "transparent",
          // Web keeps visited tabs mounted; hide their content behind the shared backdrop.
          display: navigation.isFocused() ? "flex" : "none",
        },
      })}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="apps" />
      <Tabs.Screen name="nap" />
      <Tabs.Screen name="routine" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);

  const tabWidth = rowWidth / state.routes.length;
  const capsuleX = useSharedValue(0);
  const stretch = useSharedValue(1);
  const placed = useRef(false);

  // The capsule glides to the new tab and stretches a little on the way, like a drop
  // of liquid. The first placement is instant so it doesn't fly in on launch.
  useEffect(() => {
    if (!tabWidth) return;
    const x = state.index * tabWidth;
    if (!placed.current || reduced) {
      placed.current = true;
      capsuleX.set(x);
      return;
    }
    capsuleX.set(withSpring(x, SLIDE));
    stretch.set(withSequence(
      withTiming(1.12, { duration: 110 }),
      withSpring(1, SLIDE),
    ));
  }, [state.index, tabWidth, reduced, capsuleX, stretch]);

  const capsuleStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: capsuleX.value }, { scaleX: stretch.value }],
  }));

  const onRowLayout = (event: LayoutChangeEvent) =>
    setRowWidth(event.nativeEvent.layout.width);

  // Floats over the scene like the iOS 26 tab bar: it sits just above the home
  // indicator, and its corners follow the device's.
  return (
    <View style={[styles.dock, { bottom: barBottom(insets.bottom) }]}>
      <View style={styles.barShape}>
        <Glass style={styles.barShape}>
          <View style={styles.row} onLayout={onRowLayout}>
            {rowWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[styles.capsule, capsuleStyle]}
              />
            )}
            {state.routes.map((route, index) => {
              const tab = TABS[route.name];
              if (!tab) return null;

              const focused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
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
          </View>
        </Glass>
      </View>
    </View>
  );
}

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

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(active.value, [0, 1], [0.62, 1]),
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
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: focused }}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabContent, contentStyle]}>
        <Animated.View style={[styles.icon, iconStyle]}>
          <SymbolView
            name={tab.icon}
            size={tab.size}
            weight="semibold"
            tintColor={Nocturne.text}
          />
        </Animated.View>
        <Animated.Text numberOfLines={1} style={styles.label}>
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** Real liquid glass on iOS 26; a frosted translucent fill everywhere else. */
function Glass({ style, children }: { style: ViewStyle; children: ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive
        style={[style, styles.fill]}
      >
        {children}
      </GlassView>
    );
  }
  return <View style={[style, styles.fill, styles.frost]}>{children}</View>;
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  barShape: {
    width: "100%",
    maxWidth: 520,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    padding: BAR_PADDING,
  },
  // The top edge is a touch brighter, like light catching the rim of the glass.
  // Neutral white only; never a tinted glow.
  frost: {
    backgroundColor: "rgba(40, 44, 58, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderTopColor: "rgba(255, 255, 255, 0.24)",
    ...Platform.select({
      web: { backdropFilter: "blur(24px) saturate(160%)" } as ViewStyle,
    }),
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  capsule: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: "rgba(255, 255, 255, 0.13)",
  },
  tab: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  icon: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: Nocturne.text,
    fontSize: 10,
    fontWeight: "600",
  },
});
