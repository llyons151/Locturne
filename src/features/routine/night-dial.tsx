import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { NativeNightDial, NIGHT_DIAL_ROW, isNightDialAvailable } from '../../../modules/night-dial';
import { Text } from '@/components/text';
import { sym } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import { MIN_WINDOW } from '@/lib/night-plan';
import { formatPreset } from '@/lib/text';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

/**
 * The night as a 24-hour dial at the top of the Routine tab: midnight at the top, the day
 * running clockwise. Built like the clean sleep dials (Calm, Apple Health, Polestar): one
 * bright band on a dim track, the moon (bedtime) and sun (morning start) drawn in the
 * band's own rounded ends, and plain hour numbers inside with no tick marks. Drag either
 * end to change it, or drag the band to move the whole night. See docs/NIGHT_DIAL.md.
 *
 * Times snap to quarter hours with a light tick for each one. The dial holds its own copy
 * while a finger is down and only hands the result back on release, because every save
 * re-arms the lock (`RoutineScreen.commit`).
 */

const DAY = 1440;
const SNAP = 15;
/** The width of the track and the night band. */
const BAND = 34;
/** The handles are the band's rounded ends: the same width, so they read as one shape. */
const KNOB = BAND;
/** How far from a handle's centre a touch still grabs it. */
const GRAB = 30;
/** How far either side of the ring a touch still grabs the night. */
const RING_GRAB = BAND / 2 + 8;
/** Every two hours; the four quarters carry am/pm. */
const LABELS = Array.from({ length: 12 }, (_, i) => {
  const h = i * 2;
  const text = h % 6 ? String(h % 12 || 12) : `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
  return { m: h * 60, text, quarter: h % 6 === 0 };
});
const LABEL_W = 44;

type Part = 'bed' | 'wake' | 'night';
type Drag = {
  part: Part;
  startBed: number;
  startWake: number;
  /** The minute under the finger last update, and how far it has turned since the start. */
  at: number;
  moved: number;
  /** The times last shown, snapped. */
  bed: number;
  wake: number;
};

const wrap = (m: number) => ((m % DAY) + DAY) % DAY;
const snap = (m: number) => Math.round(m / SNAP) * SNAP;
/** Minutes from bedtime to morning start, going forward. */
const span = (bed: number, wake: number) => wrap(wake - bed);
/** The shortest signed way round from `a` to `b`, in minutes. */
const turn = (a: number, b: number) => ((b - a + DAY * 1.5) % DAY) - DAY / 2;

function point(m: number, r: number, c: number) {
  const a = (m / DAY) * Math.PI * 2;
  return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
}

/** "8 hrs", "7½ hrs", "45 min". */
function length(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const whole = Math.floor(minutes / 60);
  const half = minutes % 60 >= 30 ? '½' : '';
  return `${whole}${half} ${whole === 1 && !half ? 'hr' : 'hrs'}`;
}

type Props = {
  bedtime: number;
  morningStart: number;
  /** "Every night", "Weeknights": under the length in the middle. */
  nightsLabel: string;
  /** Every night is off: the night is drawn dim. */
  off?: boolean;
  onChange: (next: { bedtime: number; morningStart: number }) => void;
  /** The screen's (gesture handler) scroll view, held still while the dial is dragged. */
  scrollRef?: Parameters<ReturnType<typeof Gesture.Pan>['blocksExternalGesture']>[0];
};

/** On iOS the dial is Swift (modules/night-dial): Core Animation under the finger, no bridge. */
export function NightDial(props: Props) {
  return isNightDialAvailable ? <SwiftNightDial {...props} /> : <JsNightDial {...props} />;
}

function SwiftNightDial({ bedtime, morningStart, nightsLabel, off, onChange }: Props) {
  const [size, setSize] = useState(300);
  return (
    <View style={styles.wrap} onLayout={(e) => setSize(Math.min(300, Math.round(e.nativeEvent.layout.width)) || 300)}>
      <NativeNightDial
        bedtime={bedtime}
        morningStart={morningStart}
        nightsLabel={nightsLabel}
        off={off}
        minWindow={MIN_WINDOW}
        bandColor={off ? Nocturne.progressTrack : (Nocturne.accent ?? Nocturne.text)}
        trackColor={Nocturne.frost}
        iconColor={Nocturne.onCta}
        textColor={Nocturne.text}
        text2Color={Nocturne.text2}
        text3Color={Nocturne.text3}
        onChange={onChange}
        style={{ alignSelf: 'stretch', height: size + NIGHT_DIAL_ROW }}
      />
      <Text style={styles.hint}>Drag the moon or sun to change a time, or the night to move both.</Text>
    </View>
  );
}

/** Web, Android, and dev builds made before the Swift dial: the same dial in SVG. */
function JsNightDial({ bedtime, morningStart, nightsLabel, off, onChange, scrollRef }: Props) {
  // As wide as the column allows, up to 300 (measured: the window can read 0 on web's first render).
  const [size, setSize] = useState(300);
  const c = size / 2;
  const r = c - BAND / 2;

  // The dial's own copy while dragging; the saved times otherwise.
  const [draft, setDraft] = useState<{ bed: number; wake: number } | null>(null);
  const bed = draft?.bed ?? bedtime;
  const wake = draft?.wake ?? morningStart;

  const [held, setHeld] = useState<Part | null>(null);
  // The drag in progress, read and written only by the gesture's callbacks (never in render).
  const drag = useSharedValue<Drag | null>(null);

  /** The minute of day under a touch, or null at the very centre. */
  const minuteAt = (x: number, y: number) => {
    const dx = x - c;
    const dy = y - c;
    if (Math.hypot(dx, dy) < 12) return null;
    return wrap(((Math.atan2(dx, -dy) / (Math.PI * 2)) * DAY));
  };

  const grab = (x: number, y: number): Part | null => {
    const b = point(bed, r, c);
    const w = point(wake, r, c);
    const db = Math.hypot(x - b.x, y - b.y);
    const dw = Math.hypot(x - w.x, y - w.y);
    if (Math.min(db, dw) <= GRAB) return db <= dw ? 'bed' : 'wake';
    const m = minuteAt(x, y);
    if (m === null || Math.abs(Math.hypot(x - c, y - c) - r) > RING_GRAB) return null;
    return span(bed, m) < span(bed, wake) ? 'night' : null;
  };

  const move = (x: number, y: number) => {
    const d = drag.get();
    const m = minuteAt(x, y);
    if (!d || m === null) return;
    const moved = d.moved + turn(d.at, m);
    const shift = snap(moved);
    const startSpan = span(d.startBed, d.startWake);
    // A handle can't pass the other one: the night stays between MIN_WINDOW and a day.
    const clamp = (s: number) => Math.min(DAY - SNAP, Math.max(MIN_WINDOW, s));
    let next;
    if (d.part === 'bed') next = { bed: wrap(d.startWake - clamp(startSpan - shift)), wake: d.startWake };
    else if (d.part === 'wake') next = { bed: d.startBed, wake: wrap(d.startBed + clamp(startSpan + shift)) };
    else next = { bed: wrap(d.startBed + shift), wake: wrap(d.startWake + shift) };
    drag.set({ ...d, ...next, at: m, moved });
    if (next.bed !== d.bed || next.wake !== d.wake) {
      haptic.tick();
      setDraft(next);
    }
  };

  const finish = () => {
    const d = drag.get();
    drag.set(null);
    setHeld(null);
    setDraft(null);
    if (d && (d.bed !== d.startBed || d.wake !== d.startWake)) onChange({ bedtime: d.bed, morningStart: d.wake });
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .manualActivation(true)
    .onTouchesDown((e, state) => {
      const t = e.changedTouches[0];
      const part = t ? grab(t.x, t.y) : null;
      const m = t ? minuteAt(t.x, t.y) : null;
      if (!part || m === null) return state.fail();
      drag.set({ part, startBed: bed, startWake: wake, at: m, moved: 0, bed, wake });
      setHeld(part);
      haptic.tap();
      state.activate();
    })
    .onUpdate((e) => move(e.x, e.y))
    .onFinalize(finish);
  if (scrollRef) pan.blocksExternalGesture(scrollRef);

  const nudge = (part: 'bed' | 'wake', by: number) => {
    const s = span(bedtime, morningStart) + (part === 'bed' ? -by : by);
    if (s < MIN_WINDOW || s > DAY - SNAP) return;
    haptic.tick();
    onChange(
      part === 'bed'
        ? { bedtime: wrap(bedtime + by), morningStart }
        : { bedtime, morningStart: wrap(morningStart + by) },
    );
  };

  const night = span(bed, wake);
  // The band runs clockwise from bedtime to morning start.
  const from = point(bed, r, c);
  const to = point(wake, r, c);
  const band = `M ${from.x} ${from.y} A ${r} ${r} 0 ${night > DAY / 2 ? 1 : 0} 1 ${to.x} ${to.y}`;

  const numbers = r - BAND / 2 - 18;

  const knob = (part: 'bed' | 'wake') => {
    const m = part === 'bed' ? bed : wake;
    const p = point(m, r, c);
    const title = part === 'bed' ? 'Bedtime' : 'Morning start';
    return (
      <View
        key={part}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={title}
        accessibilityValue={{ text: formatPreset(m) }}
        accessibilityHint="Swipe up or down to move it by 15 minutes."
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(part, e.nativeEvent.actionName === 'increment' ? SNAP : -SNAP)}
        pointerEvents="none"
        style={[
          styles.knob,
          { left: p.x - KNOB / 2, top: p.y - KNOB / 2, backgroundColor: off ? Nocturne.progressTrack : (Nocturne.accent ?? Nocturne.text) },
          held === part || held === 'night' ? styles.knobHeld : null,
        ]}
      >
        <SymbolView
          name={part === 'bed' ? sym('moon.fill', 'bedtime') : sym('sunrise.fill', 'wb_twilight')}
          size={15}
          tintColor={Nocturne.onCta}
        />
      </View>
    );
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setSize(Math.min(300, Math.round(e.nativeEvent.layout.width)) || 300)}>
      <GestureDetector gesture={pan}>
        <View style={{ width: size, height: size }} collapsable={false}>
          <Svg width={size} height={size} pointerEvents="none">
            <Circle cx={c} cy={c} r={r} stroke={Nocturne.frost} strokeWidth={BAND} fill="none" />
            <Path
              d={band}
              stroke={off ? Nocturne.progressTrack : (Nocturne.accent ?? Nocturne.text)}
              strokeWidth={BAND}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
          {LABELS.map(({ m, text, quarter }) => {
            const p = point(m, numbers, c);
            return (
              <Text
                key={m}
                pointerEvents="none"
                maxFontSizeMultiplier={1}
                style={[styles.number, quarter && styles.quarter, { left: p.x - LABEL_W / 2, top: p.y - 8 }]}
              >
                {text}
              </Text>
            );
          })}
          <View style={styles.centre} pointerEvents="none">
            <Text style={styles.length} maxFontSizeMultiplier={1.2}>
              {off ? 'Off' : length(night)}
            </Text>
            <Text style={styles.nights} maxFontSizeMultiplier={1.2}>
              {nightsLabel}
            </Text>
          </View>
          {knob('bed')}
          {knob('wake')}
        </View>
      </GestureDetector>

      <View style={styles.times}>
        <View style={styles.time}>
          <Text style={styles.timeLabel}>Bedtime</Text>
          <Text style={styles.timeValue} maxFontSizeMultiplier={1.3}>
            {formatPreset(bed)}
          </Text>
        </View>
        <View style={[styles.time, styles.timeEnd]}>
          <Text style={styles.timeLabel}>Morning start</Text>
          <Text style={styles.timeValue} maxFontSizeMultiplier={1.3}>
            {formatPreset(wake)}
          </Text>
        </View>
      </View>
      <Text style={styles.hint}>Drag the moon or sun to change a time, or the night to move both.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  centre: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  length: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 34, lineHeight: 40, fontVariant: ['tabular-nums'] },
  number: {
    position: 'absolute',
    width: LABEL_W,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: Nocturne.text3,
    fontVariant: ['tabular-nums'],
  },
  quarter: { color: Nocturne.text2, fontWeight: '600' },
  nights: { ...Type.label, fontSize: 11, color: Nocturne.text2, marginTop: 2 },

  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobHeld: { transform: [{ scale: 1.1 }] },

  times: { flexDirection: 'row', alignSelf: 'stretch', marginTop: Space.l },
  time: { flex: 1, gap: 2 },
  timeEnd: { alignItems: 'flex-end' },
  timeLabel: { ...Type.label, fontSize: 11 },
  timeValue: { color: Nocturne.text, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  hint: { ...Type.caption, color: Nocturne.text3, alignSelf: 'stretch', marginTop: Space.s },
});
