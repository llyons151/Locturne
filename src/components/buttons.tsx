import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressScale } from '@/components/press-scale';
import { Text } from '@/components/text';
import { SearchingOrb } from '@/components/thinking-orb';

import { tap } from '@/lib/haptics';
import { CTA_HEIGHT, Nocturne, Radius, Space } from '@/theme';

/** Inside onboarding's footer, over the sky that pales toward dawn: darker not-ready pills and a stronger text link. */
export const OnSky = createContext(false);

/**
 * `busy`'s words while iOS gets its permission sheet up. Apple's Screen Time sheet takes about
 * a second to appear (user, 2026-11-08: the tap looked like it hadn't registered).
 */
export const ASKING_APPLE = 'Asking Apple…';

/** The main white pill. Every screen's bottom action uses it, at the same height. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  flex,
  slim,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * Words for a wait the tap started (`ASKING_APPLE`): the orb and these, faded, take the label's
   * place and the pill stays white, so the tap reads as taken. Can't be pressed again meanwhile.
   */
  busy?: string;
  /** A glyph before the label, as in the Sleep sheet's buttons. */
  icon?: SymbolViewProps['name'];
  /** Shares a row with another button. */
  flex?: boolean;
  /** Shorter, with a smaller label: the opener's pair, sized like Public's Create account / Log in. */
  slim?: boolean;
}) {
  const sky = useContext(OnSky);
  return (
    <PressScale
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled || !!busy}
      accessibilityRole="button"
      accessibilityLabel={busy ?? undefined}
      accessibilityState={{ busy: !!busy, disabled: disabled || !!busy }}
      style={[styles.cta, slim && styles.ctaSlim, flex && styles.flex, disabled && !busy && (sky ? styles.ctaDisabledSky : styles.ctaDisabled)]}
    >
      {busy ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.busy}>
          <SearchingOrb color={Nocturne.onCta} onLight />
          <Text style={[styles.ctaLabel, slim && styles.ctaLabelSlim, styles.busyLabel]} numberOfLines={1}>
            {busy}
          </Text>
        </Animated.View>
      ) : (
        <>
          {icon ? <SymbolView name={icon} size={17} weight="semibold" tintColor={disabled ? (sky ? DISABLED_LABEL_SKY : DISABLED_LABEL) : Nocturne.onCta} /> : null}
          <Text style={[styles.ctaLabel, slim && styles.ctaLabelSlim, disabled && (sky ? styles.ctaLabelDisabledSky : styles.ctaLabelDisabled)]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </PressScale>
  );
}

/**
 * The main pill as a progress bar, for a button that waits on something playing (the
 * onboarding's demo): it fills with white over `ms`, then wakes once `ready`. The label reads
 * dark on the fill and light past it, so it's legible at every point of the way.
 */
export function ProgressButton({ label, onPress, ms, ready }: { label: string; onPress: () => void; ms: number; ready: boolean }) {
  const sky = useContext(OnSky);
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(ready ? 1 : 0);
  useEffect(() => {
    // A progress bar, not decoration: it moves with Reduce Motion on too. It stops a hair short
    // of full until `ready`, so it never looks tappable before it is.
    fill.set(
      ready
        ? withTiming(1, { duration: 180, reduceMotion: ReduceMotion.Never })
        : withTiming(0.97, { duration: ms, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
    );
  }, [ready, ms, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <PressScale
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={!ready}
      accessibilityRole="button"
      accessibilityState={{ disabled: !ready }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.cta, styles.progress, !ready && (sky ? styles.ctaDisabledSky : styles.ctaDisabled)]}
    >
      <Text style={[styles.ctaLabel, sky ? styles.ctaLabelDisabledSky : styles.ctaLabelDisabled]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View style={[styles.progressFill, fillStyle]} pointerEvents="none">
        <View style={[styles.progressLabel, { width }]}>
          <Text style={styles.ctaLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </PressScale>
  );
}

/** The glass pill that sits beside a `PrimaryButton`: the other, quieter choice. */
export function OutlineButton({ label, onPress, flex }: { label: string; onPress: () => void; flex?: boolean }) {
  return (
    <PressScale
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      style={[styles.cta, styles.outline, flex && styles.flex]}
    >
      <Text style={styles.outlineLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressScale>
  );
}

/**
 * A quiet grey text link for secondary actions. `lead`: a quiet question before the action, as in "Already have an account? Sign in"
 * (Suno, FotMob, LARQ): the question in grey, the action in white.
 */
export function TextButton({ label, onPress, lead, busy }: { label: string; onPress: () => void; lead?: string; busy?: string }) {
  const sky = useContext(OnSky);
  if (busy) {
    // Waiting on Apple's sheet: a small orb and the words, faded, where the link was.
    return (
      <View style={[styles.textButton, styles.textButtonBusy, lead && styles.textButtonLed]} accessibilityRole="button" accessibilityLabel={busy} accessibilityState={{ busy: true }}>
        <SearchingOrb color={sky ? '#FFFFFF' : Nocturne.text2} />
        <Text style={[styles.textButtonLabel, sky && styles.textButtonSky, styles.busyLabel]}>{busy}</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={lead ? `${lead} ${label}` : undefined} hitSlop={8} style={[styles.textButton, lead && styles.textButtonLed]}>
      <Text style={[styles.textButtonLabel, sky && styles.textButtonSky, lead && styles.textButtonAction]}>
        {lead ? <Text style={styles.textButtonLead}>{`${lead} `}</Text> : null}
        {label}
      </Text>
    </Pressable>
  );
}

const DISABLED_LABEL = 'rgba(255, 255, 255, 0.6)';
const DISABLED_LABEL_SKY = 'rgba(255, 255, 255, 0.5)';

const styles = StyleSheet.create({
  cta: {
    minHeight: CTA_HEIGHT,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.cta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
  },
  ctaSlim: { minHeight: 50, paddingVertical: Space.m },
  progress: { overflow: 'hidden' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', backgroundColor: Nocturne.cta },
  progressLabel: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  // A pill of glass: a faint fill with light catching its top edge, like iOS 26's glass buttons.
  outline: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  outlineLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  // The white CTA faded, not a dark pill: it reads as the same button, not ready yet, and stays light on the pale sky.
  ctaDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  ctaLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  ctaLabelSlim: { fontSize: 16 },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.s },
  busyLabel: { opacity: 0.55 },
  ctaLabelDisabled: { color: DISABLED_LABEL },
  // On the onboarding sky the faded white turned to fog on the pale dawn (2026-10-26): a dark see-through pill keeps its shape,
  // and turning solid white when ready is the bigger change.
  ctaDisabledSky: { backgroundColor: 'rgba(12, 16, 40, 0.28)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  ctaLabelDisabledSky: { color: DISABLED_LABEL_SKY },
  textButton: { alignSelf: 'center', paddingVertical: Space.xs },
  textButtonLabel: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
  textButtonBusy: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  // With the footer's 8 above, about 22pt from the button to the text, as in Suno and Jobber.
  textButtonLed: { paddingVertical: Space.m },
  // Near-white and semibold so the link holds on the pale dawn; no text shadow (it read as a smudge, 2026-10-26).
  textButtonSky: { color: 'rgba(255, 255, 255, 0.92)', fontWeight: '600' },
  textButtonAction: { color: Nocturne.text, fontWeight: '600' },
  textButtonLead: { color: Nocturne.text2, fontWeight: '400' },
});
