import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Reveal } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { Gap, Nocturne, Space, Type, VoiceSize } from '@/theme';

import { page, Voice } from '../ui';

// Only what the number is made of: bedtime and wake come after it, in setup.
const LINES = ['Nights in bed with your phone', 'Mornings before you get up', 'Nights a week'];

/** "Doing the math": ticks off what the estimate is made of, then moves on by itself. */
export function MathScreen({ line, onDone }: { line: string; onDone: () => void }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = LINES.map((_, i) =>
      setTimeout(() => {
        haptic.tick();
        setShown(i + 1);
      }, 500 + i * 650),
    );
    timers.push(setTimeout(onDone, 500 + LINES.length * 650 + 300));
    return () => timers.forEach(clearTimeout);
    // Runs once per visit to this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={page.top}>
      <Voice text={line} size={VoiceSize.headline} header />
      <View style={styles.mathList}>
        {LINES.map((item, i) => (
          <Reveal key={item} style={[styles.mathRow, i >= shown && styles.faded]}>
            <View style={[styles.mathDot, i < shown && styles.mathDotDone]} />
            <Text style={styles.mathLabel}>{item}</Text>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mathList: { marginTop: Gap.block, gap: Space.l },
  mathRow: { flexDirection: 'row', alignItems: 'center', gap: Space.m },
  faded: { opacity: 0.35 },
  mathDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: Nocturne.text2 },
  mathDotDone: { backgroundColor: Nocturne.text, borderColor: Nocturne.text },
  mathLabel: { color: Nocturne.text, ...Type.body },
});
