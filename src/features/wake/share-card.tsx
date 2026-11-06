import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

import { PANEL_RADIUS } from '@/components/app-tabs';
import { MOON_PADS, MoonFace, MoonHalo, SkyPicture } from '@/components/night-sky';
import { Text } from '@/components/text';
import { DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import type { MoonDef } from '../moons/moon-types';
import { LOC_VIEW } from '../home/loc-rig';
import type { WeekDay } from '../home/week';
import { WeekStrip } from '../home/week-strip';

/** What the card shows: the payoff's own pieces, already worked out there. */
export type CardFacts = {
  /** The moon the payoff rose: this morning's new one, or the one worn. */
  moon: MoonDef;
  /** "7:06" and "am". */
  value: string;
  unit: string;
  /** "Morning 12", or a milestone's name. */
  kicker: string;
  days: WeekDay[];
};

/**
 * A phone story, 9:16, laid out in points the size of a phone and captured at 1080 x 1920, so it
 * reads as the payoff's screen rather than a blown-up copy of it.
 */
const CARD_W = 360;
const CARD_H = 640;
const OUT = { width: 1080, height: 1920 };
/** The black strip under the panel, with the name in it. */
const STRIP = 84;
/** The risen moon, as the payoff's (`MOON_SHARE`, payoff-screen.tsx), and the room over it. */
const MOON = Math.round(CARD_W * 0.46);
const MOON_TOP = 44;
/** Loc's width as a share of the card: the payoff's (0.27), a touch bigger here, he's the star. */
const LOC_SHARE = 0.3;
/** Room for the pictures to decode before the snapshot. */
const SETTLE_MS = 450;
/** The longest the snapshot waits on Loc's picture. */
const LOC_WAIT_MS = 1500;

/**
 * The morning payoff's share card (user 2026-11-05: "isn't updated to the way the payoff looks…
 * it's all JavaScript rendering"): the payoff's own screen as a picture to post, drawn with the same
 * native views (the baked sky, `MoonFace` with its drag, the time, Home's week dots, Loc at the top of
 * his yell on the panel's edge) and captured by iOS (react-native-view-shot). Laid out off screen
 * while `nonce` asks for one; hands the PNG's file (a data URL on the web) to `onCard`.
 */
export function ShareCard({
  facts,
  loc,
  nonce,
  onCard,
}: {
  facts: CardFacts;
  /** Loc's canvas as a PNG data URL (LocStage `onSnap`), or null to leave him out. */
  loc: string | null;
  nonce: number;
  onCard: (uri: string) => Promise<void> | void;
}) {
  const card = useRef<View>(null);
  // The drag all the way out, as the payoff has it once the moon is up.
  const drag = useSharedValue(1);
  const [locReady, setLocReady] = useState(!loc);
  const latest = useRef(onCard);
  useEffect(() => {
    latest.current = onCard;
  });

  // His picture can be slow to say it's loaded (or never, on the web off screen): not waited on for long.
  useEffect(() => {
    if (!nonce || locReady) return;
    const t = setTimeout(() => setLocReady(true), LOC_WAIT_MS);
    return () => clearTimeout(t);
  }, [nonce, locReady]);

  useEffect(() => {
    if (!nonce || !locReady) return;
    let live = true;
    const t = setTimeout(() => {
      captureRef(card, { format: 'png', ...OUT, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' })
        .then((uri) => live && latest.current(uri))
        .catch((error) => {
          if (__DEV__) console.warn('share card', error);
        });
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [nonce, locReady]);

  const { moon } = facts;
  const frost = MOON * MOON_PADS.frost * moon.scale;
  const halo = MOON * MOON_PADS.glow * moon.scale;
  const cx = CARD_W / 2 + (moon.cx - 0.5) * CARD_W;
  const cy = MOON_TOP + MOON / 2;
  const panel = CARD_H - STRIP;
  // His canvas runs the payoff's full width with him LOC_SHARE of it (loc-stage), standing on its foot.
  const locW = CARD_W * (LOC_SHARE / 0.27);
  const locH = (locW * 0.27 * LOC_VIEW.height) / LOC_VIEW.width;

  return (
    <View style={styles.offstage} pointerEvents="none">
      <View ref={card} collapsable={false} style={styles.card}>
        <View style={[styles.panel, { height: panel }]}>
          <SkyPicture moon={moon} />
          <View style={[styles.layer, { left: cx - halo / 2, top: cy - halo / 2 }]}>
            <MoonHalo moon={moon} size={halo} />
          </View>
          <View style={[styles.layer, { left: cx - frost / 2, top: cy - frost / 2, width: frost, height: frost }]}>
            <MoonFace moon={moon} box={frost} drag={drag} still />
          </View>
          {/* Between the moon and Loc, as on the payoff: the time in the headline's place, then this week. */}
          <View style={[styles.below, { top: MOON_TOP + MOON + Space.l, bottom: locH * 0.8 }]}>
            <View style={styles.timeRow}>
              <Text style={styles.timeValue} maxFontSizeMultiplier={1}>
                {facts.value}
              </Text>
              <Text style={styles.timeUnit} maxFontSizeMultiplier={1}>
                {facts.unit}
              </Text>
            </View>
            <Text style={styles.kicker} maxFontSizeMultiplier={1}>
              {facts.kicker}
            </Text>
            <View style={styles.week}>
              <Text style={styles.weekLabel} maxFontSizeMultiplier={1}>
                This week
              </Text>
              <WeekStrip days={facts.days} reduced />
            </View>
          </View>
          {loc ? (
            <Image
              source={{ uri: loc }}
              style={[styles.loc, { width: locW, height: locH, left: (CARD_W - locW) / 2, top: panel - locH + 1 }]}
              contentFit="contain"
              priority="high"
              onLoad={() => setLocReady(true)}
              onError={() => setLocReady(true)}
            />
          ) : null}
        </View>
        <View style={styles.strip}>
          <Text style={styles.name} maxFontSizeMultiplier={1}>
            Locturne
          </Text>
          <Text style={styles.url} maxFontSizeMultiplier={1}>
            locturne.com
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Laid out past the screen's right edge: drawn for the snapshot, never seen.
  offstage: { position: 'absolute', top: 0, left: 10_000, width: CARD_W, height: CARD_H },
  card: { width: CARD_W, height: CARD_H, backgroundColor: '#000000' },
  panel: {
    width: CARD_W,
    overflow: 'hidden',
    backgroundColor: Nocturne.bg,
    borderBottomLeftRadius: PANEL_RADIUS,
    borderBottomRightRadius: PANEL_RADIUS,
  },
  layer: { position: 'absolute' },
  below: { position: 'absolute', left: Gap.gutter, right: Gap.gutter, alignItems: 'center', justifyContent: 'center' },
  // The payoff's time and kicker (payoff-screen.tsx styles), at the card's size.
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  timeValue: { ...NUMBER_FONT, fontSize: 60, lineHeight: 66, letterSpacing: -1.5, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  timeUnit: { ...DisplayFont, fontSize: 22, color: 'rgba(255,255,255,0.86)' },
  kicker: { ...Type.label, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.86)', textAlign: 'center', marginTop: Space.xs },
  week: { alignSelf: 'stretch', marginTop: Space.xxl, gap: Space.m },
  weekLabel: { ...Type.label, textAlign: 'center' },
  loc: { position: 'absolute' },
  strip: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  name: { ...DisplayFont, fontSize: 17, color: Nocturne.text, letterSpacing: 0.2 },
  url: { ...Type.secondary, fontSize: 11, color: 'rgba(255,255,255,0.45)' },
});
