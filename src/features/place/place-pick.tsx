'use no memo';
// Reads the App Group stores during render (the place, the lock), which change outside React.

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  type TextInput as RNTextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Text, TextInput } from '@/components/text';
import { useLock } from '@/hooks/use-lock';
import * as haptic from '@/lib/haptics';
import { distanceMeters, getMorningPlace, getPlaceEditRefusal, PLACE_RADIUS_M, saveMorningPlace } from '@/lib/place';
import { Gap, Radius, Space, Type } from '@/theme';

import { isPlaceMapAvailable, PlaceMap, type MapTarget } from '../../../modules/place-search';
import { applyRoutineEdit, getSetRoutine } from '../routine/apply-edit';
import { describe, here, near, placeOf, suggest, type Candidate, type NoFix, type Suggested } from './locate';
import { formatDistance, hereFailedWords, settingsCanFix } from './place-stage';
import { usesMiles } from './units';

/**
 * Picking the morning place (Leave the house), redone like Google Maps so it's familiar (user,
 * 2026-10-13: the old sheet showed one result and a still picture; 2026-10-14: the map should stay
 * on screen with the search bar on top and a dropdown).
 *
 * The whole screen is a live map with a pin fixed in the middle and the check-in circle round it
 * (modules/place-search, PlaceMapView.swift). Drag it under the pin, as in Google Maps' "choose on
 * map", or tap a business on it. The search bar floats on top; typing drops Apple's suggestions
 * down under it, over the map, and tapping one flies the map there. A card at the bottom names the
 * spot and saves it.
 *
 * A full-screen modal rather than a sheet, so dragging the map never drags the sheet away.
 * `select`: opened by tapping "Get to a place" with no place yet. Saving also makes it the
 * routine's method; closing without saving leaves the routine as it was.
 */

/** iOS's dark system colours, so the screen reads like Apple Maps over its map. */
const C = {
  bg: '#000000',
  surface: '#1C1C1E',
  field: 'rgba(118,118,128,0.24)',
  line: 'rgba(84,84,88,0.6)',
  text: '#FFFFFF',
  text2: 'rgba(235,235,245,0.6)',
  text3: 'rgba(235,235,245,0.3)',
  blue: '#0A84FF',
  red: '#FF453A',
  gray: '#636366',
};

/** Typing pauses this long before suggestions are asked for. */
const DEBOUNCE_MS = 200;
/** How much map shows around a place flown to: the circle reads clearly, the street around it too. */
const PLACE_SPAN_M = 700;
/** Before anything's known: the whole of the US, until where they are comes in. */
const WIDE: MapTarget = { latitude: 39.5, longitude: -98.35, span: 4_500_000, key: 'wide' };

type Spot = { latitude: number; longitude: number };
/** What the pin is on: a place picked by name, or a spot dragged to (named by the geocoder). */
type Label = { name: string; address: string };

export function PlacePick({ select }: { select: boolean }) {
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const insets = useSafeAreaInsets();
  const radius = formatDistance(PLACE_RADIUS_M, usesMiles());
  // Re-renders at bedtime, so a screen left open turns into "Not from bed".
  useLock();

  const [saved] = useState(getMorningPlace);
  const [target, setTarget] = useState<MapTarget>(
    saved ? { latitude: saved.latitude, longitude: saved.longitude, span: PLACE_SPAN_M, key: 'saved' } : WIDE,
  );
  /** Where the pin is, once the map has stopped there. */
  const [spot, setSpot] = useState<Spot | null>(null);
  const [label, setLabel] = useState<Label | null>(saved ? { name: saved.name, address: '' } : null);
  /** Dragging, or naming where the drag stopped. */
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(saved?.name ?? '');
  const [hereFailed, setHereFailed] = useState<NoFix | null>(null);
  const [locating, setLocating] = useState(false);
  /** Save found the apps asleep (bedtime came while the screen was open). */
  const [refusedAtSave, setRefusedAtSave] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The search bar has the keyboard: the dropdown shows and the bottom card steps aside. */
  const [searching, setSearching] = useState(!saved);
  const [query, setQuery] = useState(saved?.name ?? '');
  const field = useRef<RNTextInput>(null);
  /** Moved by hand or flown somewhere: where they are no longer replaces the view. */
  const placed = useRef(saved !== null);

  // With nothing saved, start over where they roughly are once that's known (never asks).
  useEffect(() => {
    if (saved) return;
    near().then((at) => {
      if (at && !placed.current) setTarget({ ...at, span: 3_000, key: 'near' });
    });
  }, [saved]);

  // A drag names where it stopped. Only the latest naming is kept: a pick or a newer drag wins.
  const asked = useRef(0);

  const endSearch = () => {
    field.current?.blur();
    Keyboard.dismiss();
    setSearching(false);
  };

  /** Fly to a place and name the pin after it. */
  const flyTo = (place: Candidate, span = PLACE_SPAN_M) => {
    placed.current = true;
    asked.current++;
    setTarget({ latitude: place.latitude, longitude: place.longitude, span, key: `${place.latitude},${place.longitude},${Date.now()}` });
    // Saved where it's flying to, not where the map was when Save beat the landing.
    setSpot(null);
    setLabel({ name: place.name, address: place.address });
    setName(place.name || place.address);
    setQuery(place.name || place.address);
    setNaming(false);
    setFailed(false);
    endSearch();
  };

  const onSettle = ({ latitude, longitude, byUser }: Spot & { byUser: boolean }) => {
    setSpot({ latitude, longitude });
    if (!byUser) return;
    placed.current = true;
    const ask = ++asked.current;
    describe({ latitude, longitude }).then((found) => {
      if (ask !== asked.current) return;
      setLabel(found);
      setName(found.name || found.address);
      setNaming(false);
    });
  };
  const onMoveStart = () => {
    endSearch();
    setQuery('');
    setNaming(true);
    setFailed(false);
    setHereFailed(null);
  };

  const onHere = async () => {
    haptic.tap();
    setLocating(true);
    setHereFailed(null);
    const found = await here();
    setLocating(false);
    if (!found.ok) {
      haptic.thud();
      setHereFailed(found.why);
      return;
    }
    flyTo(found.candidate, 400);
  };

  const refused = refusedAtSave || getPlaceEditRefusal() !== null;
  if (refused) return <NotFromBed onClose={close} />;

  const where = spot ?? { latitude: target.latitude, longitude: target.longitude };
  const onSave = () => {
    if (!label) return;
    const result = saveMorningPlace({ ...where, name: name.trim() || label.name || label.address || 'My place' });
    if (result === null) {
      haptic.done();
      if (select) applyRoutineEdit({ ...getSetRoutine(), method: 'place' });
      close();
    } else if (result === 'asleep') {
      haptic.thud();
      setRefusedAtSave(true);
    } else {
      haptic.thud();
      setFailed(true);
    }
  };

  const title = naming ? 'Finding the name…' : label ? label.name || label.address || 'Dropped pin' : 'Move the map to your place';

  return (
    <View style={styles.screen}>
      {isPlaceMapAvailable ? (
        <PlaceMap
          style={StyleSheet.absoluteFill}
          radius={PLACE_RADIUS_M}
          target={target}
          onSettle={onSettle}
          onMoveStart={onMoveStart}
          onPoiPress={(place) => {
            placed.current = true;
            asked.current++;
            setSpot({ latitude: place.latitude, longitude: place.longitude });
            setLabel({ name: place.name, address: place.address });
            setName(place.name || place.address);
            setQuery(place.name || place.address);
            setNaming(false);
            endSearch();
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noMap]}>
          <Text style={styles.hint}>The map comes with the next app update. Search for your place for now.</Text>
        </View>
      )}

      {/* Tapping the map round the dropdown puts the keyboard away, as in Maps. */}
      {searching ? <Pressable style={StyleSheet.absoluteFill} onPress={endSearch} accessible={false} /> : null}

      {!searching ? (
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <View style={styles.flex} pointerEvents="none" />
          <View style={styles.floatRow} pointerEvents="box-none">
            <Pressable onPress={onHere} disabled={locating} accessibilityRole="button" accessibilityLabel="Go to where I am">
              <Glass style={styles.roundButton}>
                {locating ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <SymbolView name={sym('location.fill', 'my_location')} size={18} tintColor={C.blue} />
                )}
              </Glass>
            </Pressable>
          </View>
          <Glass style={[styles.card, { marginBottom: Math.max(insets.bottom, Space.s) }]}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {title}
              </Text>
              {!naming && label?.address && label.address !== label.name ? (
                <Text style={styles.cardDetail} numberOfLines={1}>
                  {label.address}
                </Text>
              ) : null}
              <Text style={styles.cardDetail}>Anywhere in the circle counts as there, about {radius} around the pin.</Text>
            </View>
            {label ? (
              <View style={styles.nameField}>
                <Text style={styles.nameLabel}>Call it</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="The gym"
                  placeholderTextColor={C.text3}
                  maxLength={60}
                  returnKeyType="done"
                  accessibilityLabel="Name for this place"
                />
              </View>
            ) : null}
            {hereFailed ? <Text style={styles.cardDetail}>{hereFailedWords(hereFailed)}</Text> : null}
            {hereFailed && settingsCanFix(hereFailed) ? <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} /> : null}
            {failed ? <Text style={styles.cardDetail}>That spot didn’t save. Move the pin a little, or search for it.</Text> : null}
            <PrimaryButton label="Save this place" onPress={onSave} disabled={!label || naming} />
          </Glass>
        </KeyboardAvoidingView>
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + Space.s }]} pointerEvents="box-none">
        <View style={styles.topBar}>
          {!searching ? (
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close">
              <Glass style={styles.roundButton}>
                <SymbolView name={sym('xmark', 'close')} size={17} weight="semibold" tintColor={C.text} />
              </Glass>
            </Pressable>
          ) : null}
          <Glass style={[styles.searchField, styles.flex]}>
            <SymbolView name={sym('magnifyingglass', 'search')} size={17} weight="medium" tintColor={C.text2} />
            <TextInput
              ref={field}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearching(true)}
              placeholder="Search for a place or address"
              placeholderTextColor={C.text2}
              returnKeyType="search"
              autoCorrect={false}
              autoFocus={!saved}
              selectTextOnFocus
              keyboardAppearance="dark"
              accessibilityLabel="Search for a place or address"
            />
            {query && searching ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
                <SymbolView name={sym('xmark.circle.fill', 'cancel')} size={17} tintColor={C.text2} />
              </Pressable>
            ) : null}
          </Glass>
          {/* As in Maps and every iOS search field: Cancel puts the keyboard away and drops what was typed. */}
          {searching ? (
            <Pressable
              onPress={() => {
                endSearch();
                setQuery(label?.name ?? '');
              }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
        {searching ? (
          <Dropdown
            query={query}
            onPick={(place) => {
              haptic.tap();
              flyTo(place);
            }}
            onHere={onHere}
            onChooseOnMap={endSearch}
            locating={locating}
            hereFailed={hereFailed}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Under the search bar, over the map: "Use where I am now", then Apple's suggestions as you type. */
function Dropdown({
  query,
  onPick,
  onHere,
  onChooseOnMap,
  locating,
  hereFailed,
}: {
  query: string;
  onPick: (place: Candidate) => void;
  onHere: () => void;
  onChooseOnMap: () => void;
  locating: boolean;
  hereFailed: NoFix | null;
}) {
  const imperial = usesMiles();
  /** The latest answer and the query it was for; kept while a newer one loads, as Maps does. */
  const [answer, setAnswer] = useState<{ query: string; items: Suggested[]; offline: boolean } | null>(null);
  const [from, setFrom] = useState<Spot | null>(null);
  /** The suggestion being looked up after a tap. */
  const [opening, setOpening] = useState<string | null>(null);
  /** The query whose tapped suggestion couldn't be found. */
  const [lostFor, setLostFor] = useState<string | null>(null);

  const short = query.trim().length < 2;
  const items = short ? null : (answer?.items ?? null);
  const offline = !short && answer?.offline === true;
  const loading = !short && answer?.query !== query;
  const lost = lostFor === query;

  // Suggestions as you type. Only the latest query's answer is shown.
  const asked = useRef(0);
  useEffect(() => {
    const ask = ++asked.current;
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const found = await suggest(query);
      if (ask !== asked.current || found.trouble === 'stale') return;
      setAnswer({ query, items: found.items, offline: found.trouble === 'offline' });
      if (found.from) setFrom(found.from);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const open = async (item: Suggested) => {
    haptic.tap();
    setOpening(item.id);
    setLostFor(null);
    const place = await placeOf(item);
    setOpening(null);
    if (!place) {
      haptic.thud();
      setLostFor(query);
      return;
    }
    onPick({ ...place, name: place.name || item.title });
  };

  return (
    <Glass style={styles.dropdown}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" bounces={false}>
        {short ? (
          <>
            <Row
              icon={sym('location.fill', 'my_location')}
              tint={C.blue}
              title={locating ? 'Finding you…' : 'Use where I am now'}
              detail="If you’re at your place now, not at home"
              onPress={onHere}
              busy={locating}
            />
            <Row
              icon={sym('map.fill', 'map')}
              tint={C.gray}
              title="Choose on map"
              detail="Move the map until the pin is on it"
              onPress={onChooseOnMap}
              last
            />
          </>
        ) : null}
        {loading && !items ? <ActivityIndicator style={styles.loading} size="small" color={C.text2} /> : null}
        {items?.map((item, i) => (
          <Row
            key={item.id}
            icon={sym('mappin', 'location_on')}
            tint={C.red}
            title={item.title}
            detail={[item.place && from ? formatDistance(distanceMeters(from, item.place), imperial) : '', item.subtitle]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => open(item)}
            busy={opening === item.id}
            last={i === items.length - 1}
          />
        ))}
        {items && items.length === 0 && !loading ? (
          <Text style={styles.hint}>
            {offline
              ? 'Can’t search without a connection. Check your signal, or choose it on the map.'
              : 'Nothing found. Try the street address, or choose it on the map.'}
          </Text>
        ) : null}
        {lost ? <Text style={styles.hint}>Couldn’t find where that one is. Try another, or choose it on the map.</Text> : null}
        {hereFailed ? <Text style={styles.hint}>{hereFailedWords(hereFailed)}</Text> : null}
        {hereFailed && settingsCanFix(hereFailed) ? <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} /> : null}
      </ScrollView>
    </Glass>
  );
}

/** Liquid Glass on iOS 26, as Maps floats its controls; a dark frosted pane before that and on web. */
function Glass({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={[styles.glass, style]}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.glass, styles.pane, style]}>{children}</View>;
}

function NotFromBed({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, styles.refused, { paddingTop: insets.top + Space.xl, paddingBottom: insets.bottom + Space.l }]}>
      <Text style={styles.refusedTitle} accessibilityRole="header">
        Not from bed.
      </Text>
      <Text style={styles.refusedBody}>
        You can pick or change your place in the day, once you’re up. Otherwise I’d let you pick your pillow.
      </Text>
      <View style={styles.flex} />
      <PrimaryButton label="Okay" onPress={onClose} />
    </View>
  );
}

function Row({
  icon,
  tint,
  title,
  detail,
  onPress,
  busy,
  last,
}: {
  icon: ReturnType<typeof sym>;
  /** The icon's disc, Maps-style: blue for where you are, red for a place, gray for the rest. */
  tint: string;
  title: string;
  detail?: string;
  onPress: () => void;
  busy?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        {busy ? <ActivityIndicator size="small" color={C.text} /> : <SymbolView name={icon} size={15} weight="semibold" tintColor={C.text} />}
      </View>
      <View style={[styles.rowText, !last && styles.rowLine]}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  // A glass capsule like Maps' search field on iOS 26: icon, field, clear.
  searchField: { flexDirection: 'row', alignItems: 'center', gap: Space.s, borderRadius: 22, paddingHorizontal: 14, height: 44 },
  cancel: { ...Type.body, color: C.blue },
  input: {
    ...Type.body,
    color: C.text,
    flex: 1,
    paddingVertical: Space.s,
    ...Platform.select({ web: { outlineStyle: 'none' } as unknown as TextStyle }),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.m, minHeight: 56 },
  pressed: { opacity: 0.6 },
  rowIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  // The separator starts at the text, as in an iOS list.
  rowText: { flex: 1, paddingVertical: 10, gap: 1 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { ...Type.body, color: C.text },
  rowDetail: { ...Type.secondary, color: C.text2 },
  hint: { ...Type.secondary, color: C.text2, textAlign: 'center', paddingHorizontal: Space.l, paddingTop: Space.l },
  noMap: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', padding: Gap.gutter },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Space.l, gap: Space.s },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  glass: { overflow: 'hidden' },
  pane: {
    backgroundColor: 'rgba(30,30,32,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    ...Platform.select({ web: { backdropFilter: 'blur(24px) saturate(180%)' } as ViewStyle }),
  },
  // Hangs under the search bar like Maps' suggestions; short enough to leave the map showing.
  dropdown: { borderRadius: 24, paddingLeft: Space.l, paddingRight: Space.m, paddingVertical: Space.xs, maxHeight: 360 },
  loading: { paddingVertical: Space.l },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  floatRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Space.l, paddingBottom: Space.s },
  // A floating glass panel, inset from the edges with the screen's corner radius, as iOS 26 sheets sit.
  card: { marginHorizontal: Space.s, borderRadius: 34, paddingHorizontal: Space.xl, paddingTop: Space.xl, paddingBottom: Space.l, gap: Space.l },
  cardHead: { gap: Space.xs },
  cardTitle: { ...Type.body, color: C.text, fontWeight: '700', fontSize: 22, lineHeight: 28 },
  cardDetail: { ...Type.secondary, color: C.text2 },
  nameField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    backgroundColor: C.field,
    borderRadius: Radius.control,
    paddingHorizontal: Space.l,
    minHeight: 48,
  },
  nameLabel: { ...Type.secondary, color: C.text2, flexShrink: 0 },
  refused: { paddingHorizontal: Gap.gutter, gap: Space.l },
  refusedTitle: { ...Type.title, fontSize: 22, lineHeight: 27, color: C.text, textAlign: 'center' },
  refusedBody: { ...Type.secondary, color: C.text2, textAlign: 'center' },
});
