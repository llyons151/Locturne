import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components/text';
import { PLACE_RADIUS_M, type Fix } from '@/lib/place';
import { Nocturne, Radius, Space, Type } from '@/theme';

import { PlaceSearch } from '../../../modules/place-search';

type Spot = { latitude: number; longitude: number };
/** What the map shows: `span` metres top to bottom around the middle. */
type Region = { latitude: number; longitude: number; span: number };

const M_PER_DEG = 111_320;
/** Closest in: the place's circle and a street or two round it, as on the setup sheet. */
const MIN_SPAN = PLACE_RADIUS_M * 5;
/** Spans come in steps, so a few metres' walk doesn't redraw the map. */
const STEP = 1.6;

const east = (from: Spot, to: Spot) => (to.longitude - from.longitude) * M_PER_DEG * Math.cos((from.latitude * Math.PI) / 180);
const north = (from: Spot, to: Spot) => (to.latitude - from.latitude) * M_PER_DEG;

/** Where `p` lands in a `w` × `h` picture of `region`. */
function project(region: Region, p: Spot, w: number, h: number) {
  const k = h / region.span;
  return { x: w / 2 + east(region, p) * k, y: h / 2 - north(region, p) * k };
}

/** Both points well inside, not hard against an edge. */
function fits(region: Region, points: Spot[], w: number, h: number) {
  return points.every((p) => {
    const { x, y } = project(region, p, w, h);
    return x > w * 0.1 && x < w * 0.9 && y > h * 0.12 && y < h * 0.88;
  });
}

/** The place alone, or the place and you, midway, zoomed out in steps until both fit. */
function regionFor(place: Spot, you: Spot | null, w: number, h: number): Region {
  if (!you) return { ...place, span: MIN_SPAN };
  const middle = { latitude: (place.latitude + you.latitude) / 2, longitude: (place.longitude + you.longitude) / 2 };
  // Near the place, it stays in the middle, so the circle doesn't drift as you arrive.
  if (fits({ ...place, span: MIN_SPAN }, [place, you], w, h)) return { ...place, span: MIN_SPAN };
  let span = MIN_SPAN * STEP;
  while (!fits({ ...middle, span }, [place, you], w, h) && span < 200_000) span *= STEP;
  return { ...middle, span };
}

/** A street-ish grid step for the span: 50 m, 100 m, 200 m, 500 m, 1 km… */
function gridStep(span: number) {
  const target = span / 5;
  const base = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].map((m) => m * base).find((s) => s >= target) ?? base * 10;
}

/**
 * The morning's live view (Leave the house): the place and its check-in circle, and you on the
 * way, moving as you walk. Apple Maps' dark map under it where the build has MapKit's plain
 * picture (`PlaceSearch.area`); otherwise (the web preview, older builds) a dark grid on the same
 * scale. Plain white marks, no glow.
 */
export function LiveMap({ place, you, width, height }: { place: Spot & { name: string }; you: Fix | null; width: number; height: number }) {
  const [region, setRegion] = useState<Region>(() => regionFor(place, you, width, height));
  const [map, setMap] = useState<{ uri: string; key: string } | null>(null);

  // Re-framed only when you leave the picture, or come close enough that it should zoom in.
  const wanted = regionFor(place, you, width, height);
  const stale = !fits(region, you ? [place, you] : [place], width, height) || wanted.span !== region.span;
  if (stale) setRegion(wanted);

  const key = `${region.latitude.toFixed(5)},${region.longitude.toFixed(5)},${Math.round(region.span)}`;
  useEffect(() => {
    let live = true;
    PlaceSearch?.area?.(region.latitude, region.longitude, region.span, width, height)
      .then((uri) => live && uri && setMap({ uri, key }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key, region, width, height]);

  const k = height / region.span;
  const pin = project(region, place, width, height);
  const dot = you ? project(region, you, width, height) : null;
  const ring = PLACE_RADIUS_M * k;
  const vague = you?.accuracy && you.accuracy > 40 ? you.accuracy * k : 0;
  const step = gridStep(region.span) * k;
  const lines = (size: number, from: number) => {
    const out: number[] = [];
    for (let v = from % step; v < size; v += step) out.push(v);
    return out;
  };

  return (
    <View style={[styles.card, { width, height }]} accessible accessibilityLabel={`Map of ${place.name}${you ? ' and where you are' : ''}.`}>
      {map?.key === key ? (
        <Image source={{ uri: map.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      ) : null}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {map?.key === key
          ? null
          : [
              ...lines(width, pin.x).map((x) => <Line key={`x${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#FFFFFF" strokeOpacity={0.06} />),
              ...lines(height, pin.y).map((y) => <Line key={`y${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#FFFFFF" strokeOpacity={0.06} />),
            ]}
        <Circle cx={pin.x} cy={pin.y} r={ring} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.5} />
        {dot ? (
          <Line x1={dot.x} y1={dot.y} x2={pin.x} y2={pin.y} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 5" />
        ) : null}
        <Circle cx={pin.x} cy={pin.y} r={5} fill="#FFFFFF" />
        {dot && vague ? (
          <Circle cx={dot.x} cy={dot.y} r={vague} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 4" />
        ) : null}
        {dot ? <Circle cx={dot.x} cy={dot.y} r={8} fill="#FFFFFF" stroke="#000000" strokeWidth={3} /> : null}
      </Svg>
      <Text style={[styles.name, { top: Math.min(height - 28, pin.y + ring + 4), left: Math.max(Space.s, Math.min(width - 140, pin.x - 70)) }]} numberOfLines={1}>
        {place.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, overflow: 'hidden', backgroundColor: Nocturne.surface, alignSelf: 'center' },
  name: { ...Type.caption, position: 'absolute', width: 140, textAlign: 'center', color: Nocturne.text, fontWeight: '600' },
});
