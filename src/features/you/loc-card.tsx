import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { TONE_LABEL, TONES, type Tone } from '@/lib/tone';
import { Nocturne, Space, Type } from '@/theme';

import { LocBubble } from '@/features/home/loc-bubble';
import { locLine } from '@/features/home/loc-lines';
import { LocSilhouette } from '@/features/home/loc-peek';

const OPTIONS = TONES.map((t) => ({ value: t, label: TONE_LABEL[t] }));

/** His width in the card. */
const LOC_WIDTH = 132;

const say = (tone: Tone) => locLine('poke', 'awake', tone) ?? '';

/**
 * How grumpy Loc is, set by hearing him (CARROT Weather's personality slider, which says what
 * each level sounds like; docs/SETTINGS_INSPIRATION.md, round 2). He peeks over the card's
 * lower edge with a line in the chosen tone; picking another tone, or tapping him, gets a new
 * one. The pick applies at once (tone.ts: words only, never a rule).
 */
export function LocCard({ tone, onChange }: { tone: Tone; onChange: (tone: Tone) => void }) {
  const [said, setSaid] = useState(() => ({ line: say(tone), id: 0 }));
  const speak = (t: Tone) => setSaid((prev) => ({ line: say(t), id: prev.id + 1 }));
  const another = () => {
    haptic.tap();
    speak(tone);
  };
  return (
    <Card>
      <Pressable onPress={another} accessibilityRole="button" accessibilityLabel={`Loc says: ${said.line}`} accessibilityHint="Another line" style={styles.stage}>
        <View style={styles.speech}>
          <LocBubble key={said.id} line={said.line} onDismiss={another} />
        </View>
        <View style={styles.loc} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <LocSilhouette width={LOC_WIDTH} color={Nocturne.text3} />
        </View>
      </Pressable>
      <View style={styles.controls}>
        <Segmented
          value={tone}
          options={OPTIONS}
          label="How grumpy Loc is"
          onChange={(next) => {
            if (next === tone) return;
            onChange(next);
            speak(next);
          }}
        />
        <Text style={styles.note}>How Loc talks</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // The bubble up top, Loc standing on the hairline under him, like he stands on Home's strip.
  stage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 190,
    paddingTop: Space.l,
    paddingHorizontal: Space.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nocturne.edge,
    overflow: 'hidden',
  },
  speech: { flex: 1, justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center', paddingBottom: Space.s },
  loc: { marginBottom: -1 },
  controls: { gap: Space.s, padding: Space.l },
  note: { color: Nocturne.text2, ...Type.caption, textAlign: 'center' },
});
