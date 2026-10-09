import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Reveal } from '@/components/motion';
import { useCompact } from '@/hooks/use-compact';
import * as haptic from '@/lib/haptics';
import { Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import { TIME_BACK_PHRASE } from '../content';
import { formatHalves, weeklyAmount, yearAmount, type Estimate } from '../estimate';
import { RollingNumber } from '../rolling-number';
import { Body, page, Voice } from '../ui';

/** After the number lands, the beat before the good news. */
const SECOND_BEAT_MS = 1100;

/**
 * The big number in two beats (Opal's bad news then good news, Noom's reveal in beats): the
 * hours a week on the phone in bed rolls up with the year it adds up to, then his line turns
 * the same hours into what they said they'd do with them.
 */
export function RevealScreen({
  numbers,
  timeBack,
  onPayoff,
}: {
  numbers: Estimate;
  timeBack?: string;
  onPayoff?: () => void;
}) {
  const [landed, setLanded] = useState(false);
  const [secondBeat, setSecondBeat] = useState(false);
  const compact = useCompact();
  useEffect(() => {
    if (!landed) return;
    haptic.thud();
    const timer = setTimeout(() => setSecondBeat(true), SECOND_BEAT_MS);
    return () => clearTimeout(timer);
  }, [landed]);
  // A light user's page has nothing to wait for.
  const payoffShown = secondBeat || numbers.lightUser;
  useEffect(() => {
    if (payoffShown) onPayoff?.();
  }, [payoffShown, onPayoff]);

  if (numbers.lightUser) {
    return (
      <View style={page.top}>
        <Voice text="You’re barely on it." size={VoiceSize.headline} header />
        <View style={page.gapHeadline} />
        <Body>
          About {weeklyAmount(numbers.weeklyMinutes)} a week on your phone in bed. So I’ll mostly handle mornings.
          Apps stay asleep until you’re up.
        </Body>
        <View style={page.gapAside} />
        <Voice text="You’re already ahead. I’ll keep it that way." size={VoiceSize.aside} delay={700} sub />
      </View>
    );
  }

  const amount = weeklyAmount(numbers.weeklyMinutes);
  const phrase = TIME_BACK_PHRASE[timeBack ?? 'else'] ?? TIME_BACK_PHRASE.else;
  return (
    <View style={styles.wrap}>
      <Reveal>
        <Body style={styles.lead}>Based on your answers, you spend about…</Body>
      </Reveal>
      <View accessible accessibilityRole="header" accessibilityLabel={`About ${amount} a week on your phone in bed`}>
        <RollingNumber
          value={numbers.weeklyHours}
          format={(v) => `${formatHalves(v)} ${v === 1 ? 'hour' : 'hours'}`}
          onLanded={setLanded}
          rowHeight={compact ? 52 : 72}
          fontSize={compact ? 48 : 64}
        />
      </View>
      <Body style={styles.sub}>…a week on your phone in bed.</Body>
      {landed ? (
        <Reveal delay={200}>
          <Text style={styles.year}>{`That’s ${yearAmount(numbers.yearlyHours, 'hour')}`}</Text>
        </Reveal>
      ) : null}
      <View style={styles.beat}>
        {secondBeat ? <Voice text={`Or ${amount} of ${phrase}. Your pick.`} size={VoiceSize.headline} center /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: Gap.section },
  lead: { textAlign: 'center', color: Nocturne.text, ...Type.body, marginBottom: Space.s },
  sub: { marginTop: Space.s, textAlign: 'center' },
  year: { ...NUMBER_FONT, color: Nocturne.text2, fontSize: 20, lineHeight: 26, textAlign: 'center', marginTop: Space.l },
  beat: { flex: 1, justifyContent: 'center' },
});
