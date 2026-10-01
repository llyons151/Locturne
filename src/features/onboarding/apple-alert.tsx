import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Reveal } from '@/components/motion';
import { Gap, Nocturne, Space, Type } from '@/theme';

/**
 * A picture of the alert iOS shows next, with a finger on the button to press. Laid out
 * like Apple's Screen Time prompt (title, message, two buttons, the right one bold).
 * It's an illustration, not a control: scaled down, dimmed, captioned, and not
 * pressable, so it can't be mistaken for the real alert (App Review 5.1.1).
 */
export function AppleAlertPicture({
  title,
  message,
  buttons,
  point,
}: {
  title: string;
  message: string;
  /** Left, then right. The right one is bold, as iOS draws it. */
  buttons: [string, string];
  /** Which button the finger points at. */
  point: 0 | 1;
}) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [reduced, bob]);
  const fingerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <Reveal
      style={styles.wrap}
      delay={250}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Picture of Apple's next prompt: ${title} Tap ${buttons[point]}.`}
        style={styles.picture}
      >
        <Text style={styles.caption}>APPLE ASKS NEXT</Text>
        <View style={styles.alert}>
          <View style={styles.alertText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.buttons}>
            {buttons.map((label, i) => (
              <View key={label} style={[styles.button, i === 0 && styles.buttonDivider]}>
                <Text style={[styles.buttonLabel, i === 1 && styles.buttonBold]}>{label}</Text>
                {i === point ? (
                  <Animated.View style={[styles.finger, fingerStyle]}>
                    <SymbolView
                      name={{ ios: 'hand.point.up.left.fill', android: 'touch_app', web: 'touch_app' }}
                      size={30}
                      tintColor={Nocturne.text}
                    />
                  </Animated.View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Reveal>
  );
}

// Apple's alert blue, only inside the picture: it's their UI, not a Locturne accent.
const ALERT_BLUE = '#0A84FF';

const styles = StyleSheet.create({
  wrap: { marginTop: Gap.block, marginBottom: Gap.block, alignItems: 'center' },
  picture: { alignItems: 'center', gap: Space.s, opacity: 0.92 },
  caption: Type.label,
  // iOS's dark alert material, flattened. 270pt wide like the real one, shown at 0.9.
  alert: {
    width: 270,
    borderRadius: 14,
    backgroundColor: 'rgba(44,44,46,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nocturne.edge,
    transform: [{ scale: 0.9 }],
  },
  alertText: { paddingHorizontal: 16, paddingTop: 19, paddingBottom: 17, gap: 4 },
  title: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  message: { color: '#FFFFFF', fontSize: 13, lineHeight: 17, textAlign: 'center' },
  buttons: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  button: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  buttonDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.22)' },
  buttonLabel: { color: ALERT_BLUE, fontSize: 17 },
  buttonBold: { fontWeight: '600' },
  finger: { position: 'absolute', top: 34, right: 6 },
});
