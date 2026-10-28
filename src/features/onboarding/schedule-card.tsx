import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/text';

import { AppTile } from '@/components/app-icons';
import { countPicks } from '@/components/app-picker';
import { GlassCard } from '@/components/glass-card';
import { useEntranceDelay } from '@/components/motion';
import type { WakeMethod } from '@/lib/routine';
import { Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { methodCopy } from './content';
import { formatClock } from './estimate';

const MAX_ICONS = 5;
/** Under this width the two clocks drop to `clockNarrow`. */
const NARROW_WIDTH = 360;

/*
 * The card building itself (user 2026-10-27: "do something cool for the card"), in ms from its
 * start: the pane rises, the two times come in left then right, then the footprints walk across
 * from the moon to the wake-up, one dot at a time, and the method lands at the end of them. Last,
 * the apps that sleep. Opacity and transform only, so it stays on iOS's fast path.
 */
const PANE_MS = 700;
const TIMES_AT = [220, 340];
const STEPS_AT = 560;
const STEP_MS = 22;
const PIECE_MS = 600;
/** Until the dashes are measured, the walk is timed for about this many dots a side. */
const GUESS_DOTS = 18;
/** Dot plus gap, as in `styles.dash` and `styles.dashes`. */
const DOT_PITCH = 7;
/** How long the card takes to finish building, for whatever comes in under it. */
export const DEAL_CARD_BUILD_MS = STEPS_AT + (GUESS_DOTS * 2 + 2) * STEP_MS + 450;

const settle = cubicBezier(0.22, 1, 0.36, 1);

/**
 * Hidden in its own style too, filled both ways, like motion.tsx's entrances: Reanimated attaches
 * the animation after the view mounts, so with only a backwards fill iOS drew the whole card for a
 * frame first, a flicker coming in from `apps` (user 2026-10-28).
 */
function enter(from: object, delay: number, duration = PIECE_MS): ViewStyle {
  return {
    opacity: 0,
    animationName: { from, to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] } },
    animationDuration: `${duration}ms`,
    animationDelay: `${Math.round(delay)}ms`,
    animationTimingFunction: settle,
    animationFillMode: 'both',
  } as unknown as ViewStyle;
}
const fade = (delay: number, duration = 260) => enter({ opacity: 0 }, delay, duration);
const rise = (delay: number, by = 8) => enter({ opacity: 0, transform: [{ translateY: by }, { scale: 1 }] }, delay);
const pop = (delay: number) => enter({ opacity: 0, transform: [{ translateY: 0 }, { scale: 0.5 }] }, delay, 500);

const METHOD_GLYPH: Record<WakeMethod, SymbolViewProps['name']> = {
  downstairs: { ios: 'figure.stairs', android: 'stairs', web: 'stairs' },
  steps: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  scan: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
  place: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  pushups: { ios: 'figure.strengthtraining.functional', android: 'fitness_center', web: 'fitness_center' },
};

/**
 * Tonight's lock as one finished object: lights out on the left, the alarm on the
 * right, the wake-up method between them, and the apps that sleep underneath.
 *
 * On an iPhone the picks are opaque tokens, so pass `liveCount` and the card says how many
 * instead of drawing icons. Off iOS, `apps` are the preview's stand-in names.
 */
export function ScheduleCard({
  bedtime,
  wake,
  method,
  apps,
  liveCount,
  compact,
  onChange,
  enterAt = 0,
}: {
  bedtime: number;
  wake: number;
  method: WakeMethod;
  apps: string[];
  liveCount?: number;
  compact: boolean;
  onChange: (what: 'bedtime' | 'wake' | 'apps') => void;
  /** The earliest it starts building, in ms from the page's start (it also waits its turn). */
  enterAt?: number;
}) {
  const reduced = useReducedMotion();
  const start = useEntranceDelay(enterAt);
  // Dots a side, once the dashes have a width: as many as fit, so the walk times to what shows.
  const [dots, setDots] = useState(0);
  const side = dots || GUESS_DOTS;
  const at = (ms: number) => start + ms;
  const play = (style: ViewStyle) => (reduced ? null : style);
  const stepAt = (i: number) => at(STEPS_AT + i * STEP_MS);
  const landAt = stepAt(side * 2 + 2);
  const shown = apps.slice(0, MAX_ICONS);
  const extra = apps.length - shown.length;
  const iconSize = compact ? 34 : 40;
  const proof = methodCopy(method).short;
  const count = liveCount ?? apps.length;

  return (
    <Animated.View style={[styles.card, compact && styles.cardCompact, play(enter({ opacity: 0, transform: [{ translateY: 14 }, { scale: 0.98 }] }, start, PANE_MS))]}>
      <GlassCard dark style={[styles.pane, compact && styles.paneCompact]}>
        <View style={styles.times}>
          <Time
            style={play(rise(at(TIMES_AT[0])))}
            label="Lights out"
            icon={{ ios: 'moon.fill', android: 'bedtime', web: 'bedtime' }}
            minutes={bedtime}
            compact={compact}
            onChange={() => onChange('bedtime')}
          />
          <Time
            style={play(rise(at(TIMES_AT[1])))}
            label="Alarm"
            icon={{ ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' }}
            minutes={wake}
            compact={compact}
            onChange={() => onChange('wake')}
            alignEnd
          />
        </View>

        <View style={styles.walk} accessible accessibilityLabel={`Then ${proof.toLowerCase()} wakes your apps`}>
          <Animated.View style={play(pop(stepAt(0)))}>
            <WalkGlyph name={{ ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' }} />
          </Animated.View>
          <View
            style={styles.dashes}
            onLayout={(e) => {
              const n = Math.max(1, Math.floor((e.nativeEvent.layout.width + 4) / DOT_PITCH));
              if (n !== dots) setDots(n);
            }}
          >
            {Array.from({ length: dots }, (_, i) => (
              <Animated.View key={i} style={[styles.dash, play(fade(stepAt(1 + i)))]} />
            ))}
          </View>
          <Animated.View style={play(fade(stepAt(side + 1), 400))}>
            <Text style={styles.walkLabel}>{proof}</Text>
          </Animated.View>
          <View style={styles.dashes}>
            {Array.from({ length: dots }, (_, i) => (
              <Animated.View key={i} style={[styles.dash, play(fade(stepAt(side + 2 + i)))]} />
            ))}
          </View>
          <Animated.View style={play(pop(landAt))}>
            <WalkGlyph name={METHOD_GLYPH[method]} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.divider, play(fade(landAt, 400))]} />

        <Animated.View style={[styles.appsRow, play(rise(landAt + 120, 6))]}>
          {liveCount !== undefined ? (
            <View style={styles.liveApps}>
              <WalkGlyph name={{ ios: 'apps.iphone', android: 'apps', web: 'apps' }} />
              <Text style={styles.liveLabel}>Your apps</Text>
            </View>
          ) : (
            <View style={styles.icons} accessible accessibilityLabel={`Asleep: ${apps.join(', ')}`}>
              {shown.map((app) => (
                <AppTile key={app} name={app} size={iconSize} />
              ))}
              {extra > 0 ? (
                <View style={[styles.more, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.225 }]}>
                  <Text style={styles.moreLabel}>+{extra}</Text>
                </View>
              ) : null}
            </View>
          )}
          <ChangeLink label="Change apps" onPress={() => onChange('apps')} />
        </Animated.View>
        <Animated.View style={play(fade(landAt + 240, 400))}>
          <Text style={styles.appsCaption}>
            {liveCount !== undefined
              ? `${countPicks(count)} asleep at bedtime.`
              : count === 1
                ? '1 app sleeps.'
                : `${count} apps sleep.`}
          </Text>
        </Animated.View>
      </GlassCard>
    </Animated.View>
  );
}


function Time({
  style,
  label,
  minutes,
  compact,
  onChange,
  alignEnd,
  icon,
}: {
  style?: ViewStyle | null;
  label: string;
  icon: SymbolViewProps['name'];
  minutes: number;
  compact: boolean;
  onChange: () => void;
  alignEnd?: boolean;
}) {
  const [clock, suffix] = formatClock(minutes).split(' ');
  const narrow = useWindowDimensions().width < NARROW_WIDTH;
  return (
    <Animated.View style={[styles.time, alignEnd && styles.timeEnd, style]}>
      <View style={[styles.labelRow, alignEnd && styles.labelRowEnd]}>
        <SymbolView name={icon} size={12} tintColor={Nocturne.text2} />
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
      <Text
        // Narrow phones (SE and mini with Display Zoom, 320 pt): two 40 pt clocks collide there.
        style={[styles.clock, compact && styles.clockCompact, narrow && styles.clockNarrow]}
        maxFontSizeMultiplier={1.2}
        accessibilityLabel={`${label}, ${clock} ${suffix}`}
      >
        {clock}
        <Text style={styles.suffix}> {suffix}</Text>
      </Text>
      <ChangeLink label={`Change ${label.toLowerCase()}`} text="Change" onPress={onChange} />
    </Animated.View>
  );
}

function ChangeLink({ label, text = 'Change', onPress }: { label: string; text?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10}>
      <Text style={styles.change}>{text}</Text>
    </Pressable>
  );
}

function WalkGlyph({ name }: { name: SymbolViewProps['name'] }) {
  return <SymbolView name={name} size={18} tintColor={Nocturne.accent ?? Nocturne.text} />;
}

const styles = StyleSheet.create({
  card: { marginTop: Gap.block, marginBottom: Gap.block },
  cardCompact: { marginTop: Space.l, marginBottom: Space.l },
  // The smoked card the Routine tab uses, so the deal looks like the schedule it becomes.
  pane: { padding: 20 },
  paneCompact: { padding: Space.l },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { gap: 4 },
  timeEnd: { alignItems: 'flex-end' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelRowEnd: { flexDirection: 'row-reverse' },
  label: Type.label,
  clock: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] },
  clockCompact: { fontSize: 34, lineHeight: 40 },
  clockNarrow: { fontSize: 28, lineHeight: 34 },
  suffix: { color: Nocturne.text2, fontSize: 16, fontWeight: '600' },
  change: { color: Nocturne.text2, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  walk: { flexDirection: 'row', alignItems: 'center', gap: Space.s, marginTop: Space.l },
  // Evenly spaced dashes, clipped to whatever width the row leaves.
  dashes: { flex: 1, flexDirection: 'row', gap: 4, overflow: 'hidden' },
  // Round dots, like footprints across the night.
  dash: { width: 3, flexShrink: 0, height: 3, borderRadius: 1.5, backgroundColor: Nocturne.text3 },
  walkLabel: { color: Nocturne.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Nocturne.edge, marginVertical: Space.l },
  appsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  icons: { flexDirection: 'row', gap: 8, flexShrink: 1 },
  liveApps: { flexDirection: 'row', alignItems: 'center', gap: Space.s, flexShrink: 1 },
  liveLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  more: { backgroundColor: Nocturne.frost, borderWidth: 1, borderColor: Nocturne.edge, alignItems: 'center', justifyContent: 'center' },
  moreLabel: { color: Nocturne.text, fontSize: 14, fontWeight: '700' },
  appsCaption: { color: Nocturne.text2, ...Type.secondary, marginTop: Space.m },
});
