import '@/global.css';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useStandingBlocks } from '@/hooks/use-standing-blocks';
import { startAnalytics, useScreenViews } from '@/lib/analytics-start';
import { startPurchases } from '@/lib/purchases-start';

// RevenueCat, or the dev stub without a key. Before any screen asks about the subscription.
startPurchases();
// PostHog, or nothing without a key. After purchases: it links the two (analytics-start.ts).
startAnalytics();

/**
 * The tabs always sit under a deep-linked screen (`locturne://wake` from a Shortcut, say):
 * they run `useAppStart`, which settles the subscription. Without them a lapsed subscriber
 * opening only that way would never be stood down.
 */
export const unstable_settings = { initialRouteName: '(tabs)' };

// Locturne is dark in both system appearances: the night sky never turns light.
export default function RootLayout() {
  useStandingBlocks();
  useScreenViews();
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="usage" options={{ headerShown: true, title: 'Usage', headerBackTitle: 'Home' }} />
          {/* A list's page, pushed from its tile on the Apps tab: every app in it (features/apps/list-page.tsx). */}
          <Stack.Screen name="list" options={{ headerShown: true, headerBackTitle: 'Apps' }} />
          <Stack.Screen
            name="onboarding"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="exits" options={{ presentation: 'formSheet', sheetAllowedDetents: [1], sheetGrabberVisible: true }} />
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
          <Stack.Screen name="place" options={{ presentation: 'fullScreenModal' }} />
          {/* Picking the morning place: a tall sheet over Routine, like Maps' search. */}
          <Stack.Screen
            name="place-pick"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: '#000000' },
            }}
          />
          <Stack.Screen name="wake" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
