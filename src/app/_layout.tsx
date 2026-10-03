import '@/global.css';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useStandingBlocks } from '@/hooks/use-standing-blocks';
import { createDevPurchases, setPurchasesProvider } from '@/lib/purchases';
import { sharedGet, sharedSet } from '@/lib/screen-time';

// The dev purchases stub keeps its fake entitlement in the App Group, not memory: one that
// forgot the purchase on restart would stop `useAppStart` re-arming a night that was lost.
// Replace with the RevenueCat provider before TestFlight.
setPurchasesProvider(createDevPurchases({ latencyMs: 400, store: { get: sharedGet, set: sharedSet } }));

// Locturne is dark in both system appearances: the night sky never turns light.
export default function RootLayout() {
  useStandingBlocks();
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="onboarding"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="exits" options={{ presentation: 'formSheet', sheetAllowedDetents: [1], sheetGrabberVisible: true }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="wake" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
