import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/grouped-list';
import { Split, SplitHalf } from '@/components/split-choice';
import { Text } from '@/components/text';
import { TONE_LABEL, TONES, type Tone } from '@/lib/tone';
import { Nocturne, Space, Type } from '@/theme';

const OPTIONS = TONES.map((t) => ({ value: t, label: TONE_LABEL[t] }));

/**
 * One set line per tone, the best of each from Home's poke lines (loc-lines.ts), so he always
 * says the same thing for a tone (user, October 10, 2026).
 */
export const DEMO_LINE: Record<Tone, string> = {
  mild: 'I contain at least three raccoons.',
  grumpy: 'There’s a reason I’m not allowed at airports.',
  unbearable: 'I have seen the end. It’s Tuesday.',
};

/**
 * How grumpy Loc is, set by hearing him (CARROT Weather's personality slider, which says what
 * each level sounds like; docs/SETTINGS_INSPIRATION.md, round 2). Loc himself is the profile
 * picture at the top of the tab (loc-profile.tsx), and picking a tone makes him say its line
 * there. The pick applies at once (tone.ts: words only, never a rule).
 */
export function LocCard({ tone, onChange }: { tone: Tone; onChange: (tone: Tone) => void }) {
  return (
    <Card>
      <View style={styles.controls}>
        {/* The nap sheet's split row (user's ask, 2026-10-14): squarer than the system control's pill. */}
        <Split label="How grumpy Loc is" compact>
          {OPTIONS.map((o) => (
            <SplitHalf
              key={o.value}
              title={o.label}
              selected={o.value === tone}
              onPress={() => {
                if (o.value !== tone) onChange(o.value);
              }}
            />
          ))}
        </Split>
        <Text style={styles.note}>How Loc talks</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  controls: { gap: Space.s, padding: Space.l },
  note: { color: Nocturne.text2, ...Type.caption, textAlign: 'center' },
});
