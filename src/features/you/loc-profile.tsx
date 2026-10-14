import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { LocBubble } from '@/features/home/loc-bubble';
import LocStage from '@/features/home/loc-stage';
import { morningsLabel } from '@/features/home/week';

/** The circle's width. His canvas is wider and centred on it, so he fills it; the ring clips him. */
const SIZE = 148;
const CANVAS = Math.round(SIZE * 1.2);
/** The circle's inside height: his ears get the room above him. */
const LOC_H = SIZE - 8;

/** Where his bubble's tail lands, up from the circle's bottom: just over his ears. */
const BUBBLE_AT = Math.round(SIZE * 0.68);

/** Home's mornings pill's height. */
const PILL = 36;

/** How long a line stays up, as on Home. */
const LINE_MS = 3200;

/**
 * The top of the You tab, like CapWords' profile (user reference, 2026-10-14): Loc as the
 * profile picture, the real Loc from Home (loc-stage.tsx) peeking up from the circle's bottom,
 * and your mornings in Home's pill under him. He says `line` when the tab opens, when `say`
 * changes (a new tone) and when he's poked; it fades like his lines on Home. A long press on the
 * pill opens beta diagnostics.
 */
export function LocProfile({ line, say, mornings, onLongPress }: { line: string; say: number; mornings: number; onLongPress: () => void }) {
  const [said, setSaid] = useState<number | null>(0);
  // A new `say` (a new tone) says the line again, set during render rather than in an effect.
  const [heard, setHeard] = useState(say);
  if (say !== heard) {
    setHeard(say);
    setSaid(say);
  }
  useEffect(() => {
    if (said === null) return;
    const t = setTimeout(() => setSaid(null), LINE_MS);
    return () => clearTimeout(t);
  }, [said]);
  const again = () => setSaid((n) => (n ?? 0) + 1000);
  // A poke on him (handled in his webview) says it again; hiding doesn't.
  const onCue = useCallback((cue: 'poke' | 'angry' | 'hello' | 'hide') => {
    if (cue === 'poke' || cue === 'angry') setSaid((n) => (n ?? 0) + 1000);
  }, []);
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
        onPress={() => {
          haptic.tap();
          again();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Loc says: ${line}`}
        accessibilityHint="Says it again"
        style={styles.avatar}
      >
        <View style={[styles.loc, { width: CANVAS, height: LOC_H }]}>
          <LocStage mood="awake" share={0.9} present onCue={onCue} dom={dom} />
        </View>
      </Pressable>
      {/* Floats over the circle's empty top and the space above it, so it never moves the page. */}
      <View style={styles.speech} pointerEvents="box-none">
        {said !== null ? <LocBubble key={said} line={line} onDismiss={() => setSaid(null)} /> : null}
      </View>
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
  // A little room up top, so a two-line bubble clears the status bar.
  wrap: { alignItems: 'center', paddingTop: Space.l },
  // Its tail's tip is the bottom edge, placed just over his head.
  speech: { position: 'absolute', left: 0, right: 0, bottom: PILL + Space.l + BUBBLE_AT, alignItems: 'center' },
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
