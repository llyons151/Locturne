import '@/global.css';

import { denyAppRemoval, readDeviceClock } from 'blocked-apps';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pedometer } from 'expo-sensors';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useStandingBlocks } from '@/hooks/use-standing-blocks';
import { startAnalytics, useScreenViews } from '@/lib/analytics-start';
import { setClockReader } from '@/lib/clock-guard';
import { holdSplash } from '@/lib/launch-splash';
import { startPurchases } from '@/lib/purchases-start';
import { setAppRemovalWriter } from '@/lib/screen-time';
import { checkStepCounter } from '@/lib/step-counter';
import { MOONS_BG } from '@/features/moons/moon-collection';
import { useShieldMoon } from '@/features/moons/shield-moon';
import { payoffTuning } from '@/features/wake/payoff-tuning';
import { Nocturne } from '@/theme';

// The launch screen stays until the right first screen has drawn (launch-splash.ts).
holdSplash();
// RevenueCat, or the dev stub without a key. Before any screen asks about the subscription.
startPurchases();
// PostHog, or nothing without a key. After purchases: it links the two (analytics-start.ts).
startAnalytics();
// Before the first sync: the lock reads the phone's boot clock to catch a wound-back clock.
setClockReader(readDeviceClock);
setAppRemovalWriter(denyAppRemoval);
// A device with no step counter (an iPad) gets Step away's timer for a walk (step-counter.ts).
checkStepCounter({ isIOS: Platform.OS === 'ios', isAvailable: () => Pedometer.isAvailableAsync() });

/**
 * The tabs always sit under a deep-linked screen (`locturne://wake` from a Shortcut, say):
 * they run `useAppStart`, which settles the subscription. Without them a lapsed subscriber
 * opening only that way would never be stood down.
 */
export const unstable_settings = { initialRouteName: '(tabs)' };

// Locturne is dark in both system appearances: the night sky never turns light.
export default function RootLayout() {
  useStandingBlocks();
  useShieldMoon();
  useScreenViews();
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="usage" options={{ headerShown: true, title: 'Usage', headerBackTitle: 'Home' }} />
          {/* A list's page, pushed from its tile on the Apps tab: every app in it (features/apps/list-page.tsx). */}
          <Stack.Screen name="list" />
          <Stack.Screen
            name="onboarding"
            // `?launch=1`: a first launch opening it under the launch screen, so no slide up over Home.
            options={({ route }) => ({
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              ...((route.params as { launch?: string } | undefined)?.launch ? { animation: 'none' as const } : null),
            })}
          />
          {/* Passes, in the Sleep sheet's floating card (features/nap/sleep-sheet.tsx, user 2026-11-02). */}
          <Stack.Screen
            name="exits"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* The moon collection (features/moons): a sheet that slides up and scrolls, or its own page; You → Developer switches. */}
          <Stack.Screen
            name="moon-sheet"
            options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, contentStyle: { backgroundColor: MOONS_BG } }}
          />
          {/* The tabs fade and the black strip slides up into it (features/moons/moons-page.tsx, user 2026-11-01). */}
          <Stack.Screen
            name="moon-page"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* Settings, from the You button, grows out of the strip the same way (components/strip-page.tsx, user 2026-11-02). */}
          <Stack.Screen
            name="settings"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* Short, like a system action sheet: it floats above the tabs at the height of its contents. */}
          <Stack.Screen
            name="sleep"
            // The sheet draws its own floating card and slide (features/nap/sleep-sheet.tsx).
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* The push-up count, in the same floating card. */}
          <Stack.Screen
            name="pushups"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* Dance's seconds, the same way. */}
          <Stack.Screen
            name="dance"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* Step away's timer and steps, the same way. */}
          <Stack.Screen
            name="downtime"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* How you get up, a grid of cards, in the same floating card. */}
          <Stack.Screen
            name="wake-method"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="steps"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* Setting up the wake-up code, in the same floating card; its camera opens over it. */}
          <Stack.Screen
            name="code"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* An app schedule's times, in the same floating card. */}
          <Stack.Screen
            name="schedule"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* A daily limit's time, in the same floating card. */}
          <Stack.Screen
            name="limit"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
          {/* Picking the morning place: a full-screen map, like Google Maps (a sheet would drag
              away under the map's own drags). */}
          <Stack.Screen
            name="place-pick"
            options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: '#000000' } }}
          />
          <Stack.Screen name="wake" options={{ presentation: 'fullScreenModal' }} />
          {/* The morning payoff: fades in over Home the moment the apps wake. See-through as a
              screen, so Home stays drawn under it and Done can dissolve it away over Home. */}
          <Stack.Screen
            name="morning-won"
            // `?cut=1`: taking a camera's place, which already covers Home, so no fade in.
            options={({ route }) => ({
              presentation: 'transparentModal',
              animation: (route.params as { cut?: string } | undefined)?.cut ? 'none' : 'fade',
              animationDuration: payoffTuning.screenFadeMs,
              contentStyle: { backgroundColor: 'transparent' },
            })}
          />
          {/* Cancelling: full-screen, no swipe away mid-step; every step has its own way out. */}
          <Stack.Screen name="cancel" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="(dev)/wake-lab" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="(dev)/wake-preview" options={{ presentation: 'fullScreenModal' }} />
          {/* A sheet over Home: swipe up on a made-up state to open it, down to close. */}
          <Stack.Screen
            name="(dev)/app-states"
            options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true, contentStyle: { backgroundColor: Nocturne.bg } }}
          />
          <Stack.Screen name="(dev)/loc-studio" options={{ presentation: 'fullScreenModal' }} />
          {/* Every moon to wear (features/moons), on a wheel in the floating card, like the step target. */}
          <Stack.Screen
            name="(dev)/moons"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
