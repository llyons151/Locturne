import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTabSelected } from '@/hooks/use-tab-selected';

import { LOC_VIEW, type LocMood } from './loc-rig';
import LocStage from './loc-stage';

/** His width as a share of the screen (the old static peek was 0.23). */
const SHARE = 0.27;

/**
 * Loc peeking over the panel's bottom edge, in front of the moon (user request, October 10,
 * 2026). He acts his own exits and entrances: he ducks out of sight when you leave Home and
 * peeks back up when you return, as the moon rises. The rig is in loc-rig.ts
 * (docs/LOC_SILHOUETTE.md).
 */
export function Loc({ mood }: { mood: LocMood }) {
  const { width } = useWindowDimensions();
  // The canvas runs the panel's full width, so the blanket lump can travel along the edge; he
  // sits in the middle, SHARE of it.
  const h = Math.round((width * SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  const present = useTabSelected();
  return (
    <View
      style={[styles.wrap, { width, height: h }]}
      accessible
      accessibilityLabel="Loc, the raccoon"
      accessibilityHint="Tap to poke him. Poke him again and he hides under the covers"
    >
      <LocStage
        mood={mood}
        share={SHARE}
        present={present}
        dom={{
          style: { width, height: h, backgroundColor: 'transparent' },
          scrollEnabled: false,
          bounces: false,
          contentInsetAdjustmentBehavior: 'never',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // One point past the edge so no hairline of sky shows between him and the panel's edge.
  wrap: { position: 'absolute', left: 0, bottom: -1 },
});
