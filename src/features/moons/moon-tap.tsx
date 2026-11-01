import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';

import * as haptic from '@/lib/haptics';

import { LOC_VIEW } from '../home/loc-rig';
import { openMoons } from './moon-collection';

/** Loc's width as a share of the screen, as on Home (loc.tsx). */
const LOC_SHARE = 0.27;
/** A little room over the moon's top, so a tap just above it still counts. `floor`: the panel's edge, from the bottom of the page. */
const OVER = 16;

/**
 * Home's moon opens the collection (user, 2026-11-01: "I like the idea of clicking on the moon
 * to change it"). Over the part of the moon above Loc: his canvas runs the panel's full width
 * along its edge and takes its own taps (poke him, he burrows). Invisible: the moon is the button.
 */
export function MoonTap({ floor, arc }: { floor: number; arc: number }) {
  const { width } = useWindowDimensions();
  const loc = Math.round((width * LOC_SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  const height = Math.max(0, arc - loc) + OVER;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        openMoons();
      }}
      accessibilityRole="button"
      accessibilityLabel="Your moons"
      style={[styles.tap, { bottom: floor + loc, height, left: width * 0.2, right: width * 0.2 }]}
    />
  );
}

const styles = StyleSheet.create({
  tap: { position: 'absolute' },
});
