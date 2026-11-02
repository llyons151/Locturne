import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import LocStage from '@/features/home/loc-stage';
import { morningsLabel } from '@/features/home/week';

/** The circle's width. His canvas is wider and centred on it, so he fills it; the ring clips him. */
const SIZE = 148;
const CANVAS = Math.round(SIZE * 1.2);
/** The circle's inside height: his ears get the room above him. */
const LOC_H = SIZE - 8;

/** Home's mornings pill's height. */
const PILL = 36;

/**
 * The top of the You tab, like CapWords' profile (user reference, 2026-10-14): Loc as the
 * profile picture, the real Loc from Home (loc-stage.tsx) peeking up from the circle's bottom,
 * and your mornings in Home's pill under him. He doesn't talk here: no lines in Settings (user,
 * 2026-11-02). A poke still gets his own reaction. A long press on the pill opens beta diagnostics.
 */
export function LocProfile({ mornings, onLongPress }: { mornings: number; onLongPress: () => void }) {
  const dom = useMemo(
    () => ({
      style: { width: CANVAS, height: LOC_H, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [],
  );
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => haptic.tap()}
        accessibilityRole="image"
        accessibilityLabel="Loc"
        style={styles.avatar}
      >
        <View style={[styles.loc, { width: CANVAS, height: LOC_H }]}>
          <LocStage mood="awake" share={0.9} present dom={dom} />
        </View>
      </Pressable>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={800}
        style={styles.pill}
        accessible
        accessibilityLabel={`${mornings} ${morningsLabel(mornings)} out of bed`}
      >
        <SymbolView name={sym('sunrise.fill', 'wb_twilight')} size={15} tintColor={Nocturne.text} />
        <Text style={styles.pillValue}>{mornings}</Text>
        <Text style={styles.pillLabel}>{morningsLabel(mornings)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: Space.l },
  // A light ring round a frosted circle, like the photo's white border. No shadow, no glow.
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  // His canvas sits on the circle's bottom, inside the ring.
  loc: { marginBottom: -1, marginHorizontal: (SIZE - CANVAS) / 2 },
  // Home's mornings pill.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: PILL,
    marginTop: Space.l,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillValue: { ...NUMBER_FONT, fontSize: 16, color: Nocturne.text },
  pillLabel: { ...Type.secondary, color: Nocturne.text2 },
});
