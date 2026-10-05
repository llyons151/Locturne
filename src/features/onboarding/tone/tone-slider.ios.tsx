import { Host, Slider } from '@expo/ui/swift-ui';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';

import * as haptic from '@/lib/haptics';
import { TONES } from '@/lib/tone';

import type { ToneSliderProps } from './tone-slider-types';

/** The system slider, in three steps: Mild, Grumpy, Unbearable (CARROT's personality slider). */
export function ToneSlider({ value, onChange }: ToneSliderProps) {
  return (
    <Host style={{ alignSelf: 'stretch', height: 44 }} colorScheme="dark">
      <Slider
        value={TONES.indexOf(value)}
        min={0}
        max={TONES.length - 1}
        step={1}
        onValueChange={(position) => {
          const tone = TONES[Math.round(position)];
          if (tone && tone !== value) {
            haptic.tap();
            onChange(tone);
          }
        }}
        modifiers={[accessibilityLabel('How grumpy Loc is')]}
      />
    </Host>
  );
}
