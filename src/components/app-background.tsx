import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Nocturne } from '@/theme';

import { PANEL_RADIUS, tabStripHeight } from './app-tabs';
import { NightSky } from './night-sky';

/**
 * The app sits under the same sky and moon as onboarding, with the moon settled at the
 * bottom.
 *
 * With `panel` (the tabs), the sky ends in rounded bottom corners above the black strip
 * that holds the tab buttons, as in the user's nav reference.
 */
export function AppBackground({ children, panel }: PropsWithChildren<{ panel?: boolean }>) {
  const insets = useSafeAreaInsets();
  const floor = panel ? tabStripHeight(insets.bottom) : 0;
  return (
    <View style={[styles.container, panel && styles.black]}>
      <View style={[styles.sky, panel && { bottom: floor }, panel && styles.panel]}>
        {/* The moon stays at the panel's bottom edge on every tab, Home included: the user
            asked for it there, poking up, its light rising into the black. */}
        <NightSky floor={floor} />
      </View>
      {children}
      {panel ? <PanelCorners bottom={floor} /> : null}
    </View>
  );
}

/**
 * The panel's rounded bottom corners, drawn as two black pieces on top of everything. A
 * rounded clip alone isn't enough: Chrome doesn't clip moving layers (the rising moon, a
 * scrolling list) to rounded corners, so the edge showed square there.
 */
function PanelCorners({ bottom }: { bottom: number }) {
  const r = PANEL_RADIUS;
  // Black outside a quarter circle centred on the corner's inner side.
  const d = `M0,0 L0,${r} L${r},${r} A${r},${r} 0 0 1 0,0 Z`;
  return (
    <View pointerEvents="none" style={[styles.corners, { bottom, height: r }]}>
      <Svg width={r} height={r}>
        <Path d={d} fill="#000000" />
      </Svg>
      <Svg width={r} height={r} style={styles.mirrored}>
        <Path d={d} fill="#000000" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Nocturne.bg },
  black: { backgroundColor: '#000000' },
  sky: { ...StyleSheet.absoluteFill, backgroundColor: Nocturne.bg },
  corners: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  mirrored: { transform: [{ scaleX: -1 }] },
  panel: { borderBottomLeftRadius: PANEL_RADIUS, borderBottomRightRadius: PANEL_RADIUS, overflow: 'hidden' },
});
