import { Pressable, StyleSheet, View } from 'react-native';

import * as haptic from '@/lib/haptics';
import { TONE_LABEL, TONES } from '@/lib/tone';
import { Nocturne } from '@/theme';

import type { ToneSliderProps } from './tone-slider-types';

const THUMB = 28;

/**
 * The web preview's stand-in for the system slider (`tone-slider.ios.tsx`): a track with three
 * stops. Tap a stop to move the thumb there.
 */
export function ToneSlider({ value, onChange }: ToneSliderProps) {
  const at = TONES.indexOf(value) / (TONES.length - 1);
  return (
    <View style={styles.wrap} accessibilityRole="adjustable" accessibilityLabel="How grumpy Loc is" accessibilityValue={{ text: TONE_LABEL[value] }}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${at * 100}%` }]} />
      </View>
      <View style={[styles.thumb, { left: `${at * 100}%` }]} />
      <View style={styles.stops}>
        {TONES.map((tone) => (
          <Pressable
            key={tone}
            style={styles.stop}
            onPress={() => {
              if (tone === value) return;
              haptic.tap();
              onChange(tone);
            }}
            accessibilityRole="button"
            accessibilityLabel={TONE_LABEL[tone]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 44, justifyContent: 'center', marginHorizontal: THUMB / 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(120,120,128,0.36)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Nocturne.text },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    // Neutral elevation, as the system thumb has. Not a glow.
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  stops: { ...StyleSheet.absoluteFill, flexDirection: 'row', marginHorizontal: -THUMB / 2 },
  stop: { flex: 1 },
});
