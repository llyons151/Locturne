import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import * as haptic from '@/lib/haptics';
import { Nocturne, NUMBER_FONT } from '@/theme';

/** The bedtime presets from onboarding-flow.tsx, in minutes after midnight. */
const PRESETS = [22 * 60, 23 * 60, 23 * 60 + 30, 0];
const THUMB_SPRING = { damping: 22, stiffness: 260, mass: 0.7 };

/** 1410 → { time: "11:30", period: "pm" }. */
function split(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { time: m ? `${hour}:${m.toString().padStart(2, '0')}` : `${hour}`, period: h < 12 ? 'am' : 'pm' };
}

const label = (minutes: number) => {
  const { time, period } = split(minutes);
  return `${time} ${period}`;
};

type StyleProps = {
  value: number;
  onChange: (minutes: number) => void;
  nights: boolean;
  onNights: () => void;
};

type Variant = { id: string; name: string; note: string; render: (props: StyleProps) => ReactNode };

function Tap({ onPress, selected, style, children }: {
  onPress: () => void;
  selected: boolean;
  style: (pressed: boolean) => object | object[];
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => style(pressed)}
    >
      {children}
    </Pressable>
  );
}

/** "I work nights" as a quiet text toggle, shared by the styles that don't need their own. */
function NightsLink({ nights, onNights }: Pick<StyleProps, 'nights' | 'onNights'>) {
  return (
    <Pressable onPress={onNights} accessibilityRole="checkbox" accessibilityState={{ checked: nights }} style={s.link}>
      <View style={[s.check, nights && s.checkOn]}>{nights ? <Text style={s.checkMark}>✓</Text> : null}</View>
      <Text style={s.linkLabel}>I work nights</Text>
    </Pressable>
  );
}

const VARIANTS: Variant[] = [
  {
    id: 'A',
    name: 'Current',
    note: 'Square-ish boxes, outline when picked. For comparison.',
    render: ({ value, onChange, nights, onNights }) => (
      <>
        <Text style={s.caption}>Presets</Text>
        <View style={s.row}>
          {PRESETS.map((p) => (
            <Tap key={p} selected={p === value} onPress={() => onChange(p)}
              style={(pressed) => [s.aBox, p === value && s.aBoxOn, pressed && s.pressed]}>
              <Text style={s.aLabel}>{label(p)}</Text>
            </Tap>
          ))}
        </View>
        <Tap selected={nights} onPress={onNights} style={(pressed) => [s.aBox, s.aNights, nights && s.aBoxOn, pressed && s.pressed]}>
          <Text style={s.aLabel}>I work nights</Text>
        </Tap>
      </>
    ),
  },
  {
    id: 'B',
    name: 'White pill',
    note: 'Round pills. The picked one turns solid white, like the main button.',
    render: ({ value, onChange, nights, onNights }) => (
      <>
        <View style={s.row}>
          {PRESETS.map((p) => {
            const on = p === value;
            return (
              <Tap key={p} selected={on} onPress={() => onChange(p)} style={(pressed) => [s.bPill, on && s.bPillOn, pressed && s.pressed]}>
                <Text style={[s.bLabel, on && s.bLabelOn]}>{label(p)}</Text>
              </Tap>
            );
          })}
        </View>
        <NightsLink nights={nights} onNights={onNights} />
      </>
    ),
  },
  {
    id: 'C',
    name: 'Segmented',
    note: 'One frosted track with a white thumb that slides to your pick. iOS-native.',
    render: (props) => <Segmented {...props} />,
  },
  {
    id: 'D',
    name: 'Frosted glass',
    note: 'Soft glass chips, no borders. The pick gets brighter glass and full-white text.',
    render: ({ value, onChange, nights, onNights }) => (
      <>
        <View style={s.row}>
          {PRESETS.map((p) => {
            const on = p === value;
            return (
              <Tap key={p} selected={on} onPress={() => onChange(p)} style={(pressed) => [s.dChip, on && s.dChipOn, pressed && s.pressed]}>
                <Text style={[s.dLabel, on && s.dLabelOn]}>{label(p)}</Text>
              </Tap>
            );
          })}
        </View>
        <NightsLink nights={nights} onNights={onNights} />
      </>
    ),
  },
  {
    id: 'E',
    name: 'Big numbers',
    note: 'Serif numerals with small am/pm under them. A dot marks the pick.',
    render: ({ value, onChange, nights, onNights }) => (
      <>
        <View style={s.row}>
          {PRESETS.map((p) => {
            const on = p === value;
            const { time, period } = split(p);
            return (
              <Tap key={p} selected={on} onPress={() => onChange(p)} style={(pressed) => [s.eCell, pressed && s.pressed]}>
                <Text style={[s.eTime, on && s.eOn]} numberOfLines={1} adjustsFontSizeToFit>{time}</Text>
                <Text style={[s.ePeriod, on && s.eOn]}>{period}</Text>
                <View style={[s.eDot, on && s.eDotOn]} />
              </Tap>
            );
          })}
        </View>
        <NightsLink nights={nights} onNights={onNights} />
      </>
    ),
  },
  {
    id: 'F',
    name: 'Text only',
    note: 'No boxes at all. Dim times, the pick goes full white with an underline.',
    render: ({ value, onChange, nights, onNights }) => (
      <>
        <View style={[s.row, s.fRow]}>
          {PRESETS.map((p) => {
            const on = p === value;
            return (
              <Tap key={p} selected={on} onPress={() => onChange(p)} style={(pressed) => [s.fCell, pressed && s.pressed]}>
                <Text style={[s.fLabel, on && s.fLabelOn]}>{label(p)}</Text>
                <View style={[s.fLine, on && s.fLineOn]} />
              </Tap>
            );
          })}
        </View>
        <NightsLink nights={nights} onNights={onNights} />
      </>
    ),
  },
  {
    id: 'G',
    name: 'Hairline outline',
    note: 'Thin outlined pills on nothing. The pick fills white.',
    render: ({ value, onChange, nights, onNights }) => (
      <>
        <View style={s.row}>
          {PRESETS.map((p) => {
            const on = p === value;
            return (
              <Tap key={p} selected={on} onPress={() => onChange(p)} style={(pressed) => [s.gPill, on && s.gPillOn, pressed && s.pressed]}>
                <Text style={[s.gLabel, on && s.gLabelOn]}>{label(p)}</Text>
              </Tap>
            );
          })}
        </View>
        <Tap selected={nights} onPress={onNights} style={(pressed) => [s.gPill, s.gNights, nights && s.gPillOn, pressed && s.pressed]}>
          <Text style={[s.gLabel, nights && s.gLabelOn]}>I work nights</Text>
        </Tap>
      </>
    ),
  },
];

function Segmented({ value, onChange, nights, onNights }: StyleProps) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, PRESETS.indexOf(value));
  const x = useSharedValue(0);
  const cell = width / PRESETS.length;
  useEffect(() => {
    x.value = withSpring(index * cell, THUMB_SPRING);
  }, [index, cell, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <>
      <View style={s.cTrack} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 8)}>
        {width > 0 ? <Animated.View style={[s.cThumb, { width: cell }, thumb]} /> : null}
        {PRESETS.map((p) => {
          const on = p === value;
          return (
            <Tap key={p} selected={on} onPress={() => onChange(p)} style={(pressed) => [s.cCell, pressed && s.pressed]}>
              <Text style={[s.cLabel, on && s.cLabelOn]}>{label(p)}</Text>
            </Tap>
          );
        })}
      </View>
      <NightsLink nights={nights} onNights={onNights} />
    </>
  );
}

function Card({ variant }: { variant: Variant }) {
  const [value, setValue] = useState(PRESETS[2]);
  const [nights, setNights] = useState(false);
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardId}>{variant.id}</Text>
        <View style={s.cardText}>
          <Text style={s.cardName}>{variant.name}</Text>
          <Text style={s.cardNote}>{variant.note}</Text>
        </View>
      </View>
      <View style={s.stage}>{variant.render({ value, onChange: setValue, nights, onNights: () => setNights((n) => !n) })}</View>
    </View>
  );
}

/** Dev tool: compare styles for the time-picker presets at /preset-lab. */
export function PresetLab() {
  const insets = useSafeAreaInsets();
  return (
    <AppBackground>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 48 }]}>
        <Text style={s.title}>Preset styles</Text>
        <Text style={s.intro}>Tap around. Each style works on its own. Tell Claude the letter you like.</Text>
        {VARIANTS.map((v) => (
          <Card key={v.id} variant={v} />
        ))}
      </ScrollView>
    </AppBackground>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 28, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { color: Nocturne.text, fontSize: 28, fontWeight: '700' },
  intro: { color: Nocturne.text2, fontSize: 15, marginTop: -16 },
  card: { gap: 14 },
  cardHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardId: { color: Nocturne.onCta, backgroundColor: Nocturne.cta, fontWeight: '800', fontSize: 13, width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  cardText: { flex: 1, gap: 2 },
  cardName: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  cardNote: { color: Nocturne.text2, fontSize: 13 },
  stage: { gap: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', gap: 8 },
  caption: { color: Nocturne.text2, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.75 },

  link: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', minHeight: 44, paddingHorizontal: 8 },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: Nocturne.text3, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Nocturne.cta, borderColor: Nocturne.cta },
  checkMark: { color: Nocturne.onCta, fontSize: 13, fontWeight: '800', marginTop: -1 },
  linkLabel: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },

  // A: current
  aBox: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: Nocturne.edge, backgroundColor: Nocturne.surface, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  aBoxOn: { borderColor: Nocturne.cta, borderWidth: 2 },
  aNights: { flex: 0, alignSelf: 'center', paddingHorizontal: 32 },
  aLabel: { color: Nocturne.text, fontSize: 15, fontWeight: '600' },

  // B: white pill
  bPill: { flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: Nocturne.frost, alignItems: 'center', justifyContent: 'center' },
  bPillOn: { backgroundColor: Nocturne.cta },
  bLabel: { color: Nocturne.text, fontSize: 15, fontWeight: '600' },
  bLabelOn: { color: Nocturne.onCta },

  // C: segmented
  cTrack: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: Nocturne.frost },
  cThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12, backgroundColor: Nocturne.cta },
  cCell: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  cLabel: { color: Nocturne.text2, fontSize: 15, fontWeight: '600' },
  cLabelOn: { color: Nocturne.onCta },

  // D: frosted glass
  dChip: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  dChipOn: { backgroundColor: 'rgba(255,255,255,0.18)' },
  dLabel: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
  dLabelOn: { color: Nocturne.text, fontWeight: '700' },

  // E: big numbers
  eCell: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 2 },
  eTime: { ...NUMBER_FONT, color: Nocturne.text3, fontSize: 30 },
  ePeriod: { color: Nocturne.text3, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  eOn: { color: Nocturne.text },
  eDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6, backgroundColor: 'transparent' },
  eDotOn: { backgroundColor: Nocturne.text },

  // F: text only
  fRow: { justifyContent: 'space-between', paddingHorizontal: 4 },
  fCell: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  fLabel: { color: Nocturne.text3, fontSize: 17, fontWeight: '500' },
  fLabelOn: { color: Nocturne.text, fontWeight: '700' },
  fLine: { height: 2, alignSelf: 'stretch', borderRadius: 1, backgroundColor: 'transparent' },
  fLineOn: { backgroundColor: Nocturne.text },

  // G: hairline outline
  gPill: { flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: Nocturne.edge, alignItems: 'center', justifyContent: 'center' },
  gPillOn: { backgroundColor: Nocturne.cta, borderColor: Nocturne.cta },
  gNights: { flex: 0, alignSelf: 'center', paddingHorizontal: 28 },
  gLabel: { color: Nocturne.text, fontSize: 15, fontWeight: '500' },
  gLabelOn: { color: Nocturne.onCta, fontWeight: '700' },
});
