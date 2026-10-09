import type { Ref } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

import { APP_FONT } from '@/theme';

/**
 * React Native's Text and TextInput in the app font (`APP_FONT`). RN has no global default
 * font, so every screen imports these instead. A style's own fontFamily still wins.
 */
export function Text({ style, ref, ...props }: TextProps & { ref?: Ref<RNText> }) {
  return <RNText ref={ref} {...props} style={[APP_FONT, style]} />;
}

export function TextInput({ style, ref, ...props }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  return <RNTextInput ref={ref} {...props} style={[APP_FONT, style]} />;
}
