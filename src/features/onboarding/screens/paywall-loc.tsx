import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { LOC_EDGE } from '@/components/loc-rim';
import LocStage from '@/features/home/loc-stage';
import { LOC_VIEW } from '@/features/home/loc-rig';
import { Gap } from '@/theme';

/** His width, pt. The canvas spans the card, so he has its whole top edge to dash along. */
const LOC_WIDTH = 104;
const HEIGHT = Math.round((LOC_WIDTH * LOC_VIEW.height) / LOC_VIEW.width);
/** How much of the edge he roams: short of the card's rounded corners. */
const ROAM = 0.8;
/**
 * His eyes rest down on the price below him; glances still move them round it. Awake, wide open:
 * smug's heavy lids looking down read as sad (user 2026-10-27).
 */
const LOOK_AT_PRICE: [number, number] = [0, 9];
/** How far the card's top edge covers his base, so his paws sit on it with no gap. */
const ON_LEDGE = 3;

/**
 * Loc guarding the plans (user 2026-10-27): he lives on the Annual card's top edge, as he peeks
 * over the nav strip on Home, and dashes about along it, eyes back on the price. Pick Monthly and
 * he dashes to the end, horrified, then side-eyes you; back to Annual and he comes home plotting
 * (`LocRig.guard`). His own black, with the thin edge he has running round the screen, so he
 * shows on the dark sky. He pops straight up to arrive, and taps only poke him, never burrow.
 */
export function PaywallLoc({ plan }: { plan: 'annual' | 'monthly' }) {
  const { width: screen } = useWindowDimensions();
  const width = screen - 2 * Gap.gutter;
  const dom = useMemo(
    () => ({
      style: { width, height: HEIGHT, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [width]
  );
  return (
    <View style={[styles.loc, { width, height: HEIGHT }]} accessible accessibilityLabel="Loc, guarding the plans">
      <LocStage
        mood="awake"
        share={LOC_WIDTH / width}
        present
        pokeOnly
        rise
        sharp
        roam={ROAM}
        pick={plan === 'monthly' ? 'bad' : 'good'}
        look={LOOK_AT_PRICE}
        edge={LOC_EDGE}
        dom={dom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loc: { alignSelf: 'center', marginBottom: -ON_LEDGE },
});
