import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/text';

import { Reveal } from '@/components/motion';
import LocStage from '@/features/home/loc-stage';
import { useCompact } from '@/hooks/use-compact';
import * as haptic from '@/lib/haptics';
import { DISPLAY_MAX_SCALE, DisplayFont, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import type { Answers } from '../content';
import { LEAD_WHERE, leadFor, weeklyAmount, type Estimate } from '../estimate';
import { Body, page, Voice } from '../ui';

/** When the number starts counting: once Loc and the two lines above it are in. */
const ROLL_AT_MS = 900;
/** The count from 0 to theirs, slowing as it gets there. */
const COUNT_MS = 1300;
/** After the number lands, the line under it and the footnote come in, then the button. */
const PAYOFF_AFTER_MS = 800;

/**
 * The big number, the way Jomo shows it (user, 2026-10-26; docs/REVEAL_SCREEN_INSPO.md): Loc on
 * top, "At this rate / You're going to spend / 39 days / a year on your phone after bedtime", and
 * nothing else but where it came from. Days a year, not years of a life: there's no age question,
 * so a lifetime would be made up. The number is their branch's end of the night (`leadFor`).
 * What they'd do with the time is the next step (`time-back`).
 */
export function RevealScreen({
  numbers,
  answers,
  onPayoff,
}: {
  numbers: Estimate;
  /** The branch picks which end of the night the number counts. */
  answers: Pick<Answers, 'pain'>;
  onPayoff?: () => void;
}) {
  const reduced = useReducedMotion();
  const compact = useCompact();
  const [rolling, setRolling] = useState(reduced);
  const [landed, setLanded] = useState(false);
  const [payoff, setPayoff] = useState(false);
  useEffect(() => {
    if (rolling) return;
    const timer = setTimeout(() => setRolling(true), ROLL_AT_MS);
    return () => clearTimeout(timer);
  }, [rolling]);
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setPayoff(true), reduced ? 0 : PAYOFF_AFTER_MS);
    return () => clearTimeout(timer);
  }, [landed, reduced]);
  // A light user's page has nothing to wait for.
  const payoffShown = payoff || numbers.lightUser;
  useEffect(() => {
    if (payoffShown) onPayoff?.();
  }, [payoffShown, onPayoff]);

  const size = compact ? 112 : 148;
  const dom = useMemo(
    () => ({
      style: { width: Math.round(size * 1.2), height: size - 8, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [size],
  );

  if (numbers.lightUser) {
    return (
      <View style={page.top}>
        <Voice text="You’re barely on it." size={VoiceSize.headline} header />
        <View style={page.gapHeadline} />
        <Body>Only {weeklyAmount(numbers.weeklyMinutes)} a week. I’ll mostly handle mornings.</Body>
      </View>
    );
  }

  const lead = leadFor(numbers, answers.pain);
  const days = Math.max(1, Math.floor(lead.yearlyHours / 24));
  const unit = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;
  const numberSize = compact ? 54 : 68;
  return (
    <View style={styles.wrap}>
      <View style={styles.middle}>
        <Reveal style={styles.locWrap}>
          <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
            <View style={{ marginHorizontal: (size - dom.style.width) / 2, marginBottom: -1 }}>
              <LocStage mood="smug" share={0.9} present dom={dom} />
            </View>
          </View>
        </Reveal>

        <View accessible accessibilityRole="header" accessibilityLabel={`At this rate, you’re going to spend ${unit(days)} a year ${LEAD_WHERE[lead.scope]}.`}>
          <Reveal delay={250}>
            <Text style={styles.kicker}>At this rate</Text>
          </Reveal>
          <Reveal delay={450}>
            <Text style={[styles.line, compact && styles.lineCompact]} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
              You’re going to spend
            </Text>
          </Reveal>
          <View style={[styles.number, { height: Math.round(numberSize * 1.18) }]}>
            {rolling ? <CountUp value={days} format={unit} size={numberSize} onLanded={() => setLanded(true)} /> : null}
          </View>
          <View style={styles.tail}>
            {landed ? (
              <Reveal delay={150}>
                <Text style={[styles.line, compact && styles.lineCompact]} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                  {`a year ${LEAD_WHERE[lead.scope]}`}
                </Text>
              </Reveal>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.footnote}>
        {landed ? (
          <Reveal delay={500}>
            <Text style={styles.note}>{`${weeklyAmount(lead.minutes)} a week, from your answers.`}</Text>
          </Reveal>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The number counting up in place from 0, one piece that grows in as it starts: no reel, nothing
 * above or below it moving (user wants it simple, 2026-10-26). A tick as it slows, a thud on landing.
 */
function CountUp({ value, format, size, onLanded }: { value: number; format: (n: number) => string; size: number; onLanded: () => void }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      onLanded();
      return;
    }
    const start = Date.now();
    const ease = Easing.out(Easing.cubic);
    const tickEvery = Math.max(1, Math.ceil(value / 14));
    let last = 0;
    let frame = requestAnimationFrame(function step() {
      const t = Math.min(1, (Date.now() - start) / COUNT_MS);
      const n = Math.round(ease(t) * value);
      if (n !== last) {
        last = n;
        setShown(n);
        if (n < value && n % tickEvery === 0) haptic.tick();
      }
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        haptic.thud();
        onLanded();
      }
    });
    return () => cancelAnimationFrame(frame);
    // Runs once: the count starts when this mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={reduced ? null : GROW_IN}>
      <Text style={[styles.count, { fontSize: size, lineHeight: Math.round(size * 1.18) }]} maxFontSizeMultiplier={1.2}>
        {format(shown)}
      </Text>
    </Animated.View>
  );
}

/** The number's way in: from a little small and see-through, settling quickly. */
const GROW_IN = {
  animationName: { from: { opacity: 0, transform: [{ scale: 0.9 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } },
  animationDuration: '450ms',
  animationTimingFunction: 'ease-out',
} as const;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  locWrap: { alignItems: 'center', marginBottom: Space.xl },
  // The You tab's circle: Loc in front of frosted glass, a light ring, no shadow.
  avatar: {
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  kicker: { ...Type.body, fontWeight: '600', color: Nocturne.text2, textAlign: 'center', marginBottom: Space.xs },
  line: { ...DisplayFont, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: Nocturne.text, textAlign: 'center' },
  lineCompact: { fontSize: 22, lineHeight: 27 },
  number: { alignSelf: 'stretch', marginVertical: Space.m },
  count: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, textAlign: 'center', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  // Room for two lines from the start, so nothing above moves when they come in.
  tail: { minHeight: 64, maxWidth: 300, alignSelf: 'center' },
  footnote: { minHeight: 24, alignItems: 'center', paddingBottom: Space.s },
  note: { ...Type.secondary, color: Nocturne.text3, textAlign: 'center' },
});
