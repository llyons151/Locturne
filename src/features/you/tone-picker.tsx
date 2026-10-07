import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { sym } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import { shieldCopy } from '@/lib/shield-copy';
import { TONE_LABEL, TONES, type Tone } from '@/lib/tone';
import { Nocturne, Radius, Space } from '@/theme';

// Only his words differ by tone, so the routine behind the preview doesn't matter.
const PREVIEW_ROUTINE = { morningStart: 7 * 60, method: 'downstairs', stepGoal: 200 } as const;

/**
 * How grumpy Loc is, picked the way iOS's Display & Brightness picks Light, Dark or Auto:
 * three small screens side by side, each the block screen in that tone, with a label and a
 * round check under it. Each tap applies straight away (tone.ts: words only, never a rule).
 */
export function TonePicker({ value, onChange }: { value: Tone; onChange: (tone: Tone) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {TONES.map((t) => {
        const selected = t === value;
        const shield = shieldCopy('night', PREVIEW_ROUTINE, null, t);
        return (
          <Pressable
            key={t}
            onPress={() => {
              if (selected) return;
              haptic.tap();
              onChange(t);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${TONE_LABEL[t]}. ${shield.title}`}
            style={styles.option}
          >
            <View style={styles.screen}>
              <SymbolView name={sym('moon.fill', 'bedtime')} size={12} tintColor={Nocturne.text2} />
              <View style={styles.middle}>
                <Text style={styles.line} numberOfLines={4} maxFontSizeMultiplier={1.2}>
                  {shield.title}
                </Text>
              </View>
              <View style={styles.button}>
                <Text style={styles.buttonText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {shield.button}
                </Text>
              </View>
            </View>
            <Text style={styles.label} maxFontSizeMultiplier={1.3}>
              {TONE_LABEL[t]}
            </Text>
            {selected ? (
              <View style={[styles.radio, styles.radioOn]}>
                <SymbolView name={sym('checkmark', 'check')} size={11} weight="bold" tintColor={Nocturne.onCta} />
              </View>
            ) : (
              <View style={styles.radio} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Space.s, paddingTop: Space.m, paddingBottom: Space.l },
  option: { alignItems: 'center', gap: Space.s, width: '30%' },
  // A tiny block screen: his line, then the button, as the shield lays them out.
  screen: {
    width: '100%',
    aspectRatio: 0.6,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.bg,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    padding: Space.s,
    paddingTop: Space.m,
    alignItems: 'center',
    gap: Space.s,
  },
  middle: { flex: 1, justifyContent: 'center' },
  line: { color: Nocturne.text, fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.cta,
    alignItems: 'center',
  },
  buttonText: { color: Nocturne.onCta, fontSize: 10, fontWeight: '600' },
  label: { color: Nocturne.text, fontSize: 15, marginTop: Space.xs },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Nocturne.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderWidth: 0, backgroundColor: Nocturne.text },
});
