import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Reveal } from '@/components/motion';
import { useCompact } from '@/hooks/use-compact';
import { Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import {
  formatHalves,
  lifetimeSentence,
  weeklyAmount,
  yearAmount,
  yearSentence,
  type Estimate,
} from '../estimate';
import { fitSquares, RevealGrid } from '../reveal-grid';
import { RollingNumber } from '../rolling-number';
import { Body, page, Voice } from '../ui';

/** Above this many hour-squares the grid switches to one square per day. */
const MAX_HOUR_SQUARES = 1000;
const CAPTION_SPACE = 34;
const DAYS_PER_MONTH = 30.44;

/**
 * The big number: hours a week on the phone in bed, rolled up, then a grid of the rest of
 * their life (or one year) with that time lit.
 */
export function RevealScreen({ numbers }: { numbers: Estimate }) {
  const [landed, setLanded] = useState(false);
  const [filled, setFilled] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const compact = useCompact();

  // The rest of their life, one box per month, with the months on the phone in bed lit.
  // Without an age there's no lifetime, so fall back to one year of hours or days.
  // The caption sits right under the squares, so leave room for it.
  const gridHeight = area.height - CAPTION_SPACE;
  const lifeMonths = numbers.yearsLeft * 12;
  const litMonths = Math.max(1, Math.round(numbers.lifetimeDays / DAYS_PER_MONTH));
  const lifeFit = lifeMonths > 0 && numbers.lifetimeDays > 0 ? fitSquares(lifeMonths, area.width, gridHeight) : null;
  const hourFit =
    !lifeFit && numbers.yearlyHours <= MAX_HOUR_SQUARES ? fitSquares(numbers.yearlyHours, area.width, gridHeight) : null;
  const unit: 'hour' | 'day' = hourFit ? 'hour' : 'day';
  const squares = lifeFit ? lifeMonths : hourFit ? numbers.yearlyHours : Math.max(1, numbers.yearlyDays);
  const yearSquares = hourFit ? numbers.yearlyHours : Math.max(1, numbers.yearlyDays);
  const fit = lifeFit ?? hourFit ?? fitSquares(squares, area.width, gridHeight);
  const lifetime = lifetimeSentence(numbers.lifetimeDays);

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

  const onArea = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.revealWrap}>
      <Reveal>
        <Body style={styles.revealLead}>Based on your answers, you spend about…</Body>
      </Reveal>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`About ${weeklyAmount(numbers.weeklyMinutes)} a week on your phone in bed`}
      >
        <RollingNumber
          value={numbers.weeklyHours}
          format={(v) => `${formatHalves(v)} ${v === 1 ? 'hour' : 'hours'}`}
          onLanded={setLanded}
          rowHeight={compact ? 44 : 60}
          fontSize={compact ? 40 : 54}
        />
      </View>
      <Body style={styles.revealSub}>…a week on your phone in bed.</Body>

      <View style={styles.gridArea} onLayout={onArea}>
        {landed && fit ? (
          <>
            {/* The payoff carries the meaning for VoiceOver; the squares are decoration. */}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <RevealGrid squares={squares} lit={lifeFit ? litMonths : squares} fit={fit} onFilled={() => setFilled(true)} />
            </View>
            <FadeWhen visible={filled}>
              <Text style={styles.gridCaption}>
                {lifeFit ? 'The rest of your life. Each box is 1 month.' : `One year. Each box is 1 ${unit}.`}
              </Text>
            </FadeWhen>
          </>
        ) : null}
      </View>

      <FadeWhen visible={filled}>
        {/* With the life grid, the lifetime line leads and the year line backs it up. */}
        {lifeFit && lifetime ? (
          <>
            <Text style={styles.payoff}>{lifetime}</Text>
            <Text style={styles.payoffLifetime}>{yearAmount(numbers.yearlyDays, 'day')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.payoff}>{yearSentence(yearSquares, unit)}</Text>
            {lifetime ? <Text style={styles.payoffLifetime}>{lifetime}</Text> : null}
          </>
        )}
      </FadeWhen>
    </View>
  );
}

function FadeWhen({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (!visible) return <View style={styles.hiddenBlock}>{children}</View>;
  if (reduced) return <View>{children}</View>;
  return (
    <Animated.View
      style={{
        animationName: { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
        animationDuration: '420ms',
        animationTimingFunction: 'ease-out',
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  revealWrap: { flex: 1, paddingTop: Gap.pageTop },
  revealLead: { textAlign: 'center', color: Nocturne.text, ...Type.body, marginBottom: Space.s },
  revealSub: { marginTop: Space.s, textAlign: 'center' },
  gridArea: { flex: 1, justifyContent: 'center', marginVertical: Space.l, minHeight: 80 },
  gridCaption: { color: Nocturne.text2, ...Type.secondary, marginTop: Space.m, textAlign: 'center' },
  hiddenBlock: { opacity: 0 },
  payoff: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, fontSize: 26, lineHeight: 32, letterSpacing: 0.2, textAlign: 'center' },
  payoffLifetime: { color: Nocturne.text2, ...Type.body, marginTop: Space.s, textAlign: 'center' },
});
