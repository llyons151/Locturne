'use no memo';
// Reads the App Group stores during render (the place, the lock), which change outside React.

import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
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
 * 2026-10-13: the old sheet showed one result and a still picture). Two modes:
 *
 * - **Search:** a field with Apple's suggestions as you type, many of them, as the Maps app
 *   lists them, and "Use where I am now" before anything's typed. Tapping one flies the map there.
 * - **Map:** the whole screen is a live map with a pin fixed in the middle and the check-in
 *   circle round it (modules/place-search, PlaceMapView.swift). Drag it under the pin, as in
 *   Google Maps' "choose on map", or tap a business on it. A card at the bottom names the spot
 *   and saves it; the search bar on top goes back to searching.
 *
 * A full-screen modal rather than a sheet, so dragging the map never drags the sheet away.
 * `select`: opened by tapping "Get to a place" with no place yet. Saving also makes it the
 * routine's method; closing without saving leaves the routine as it was.
 */

const C = {
  bg: '#000000',
  surface: '#1C1C1E',
  field: '#2C2C2E',
  line: 'rgba(255,255,255,0.1)',
  text: '#FFFFFF',
  text2: '#8E8E93',
  text3: '#636366',
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
  // Re-renders at bedtime, so a screen left open turns into "Not from bed".
  useLock();

  const [saved] = useState(getMorningPlace);
  const [mode, setMode] = useState<'search' | 'map'>(saved ? 'map' : 'search');
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

  /** Fly to a place and name the pin after it. */
  const flyTo = (place: Candidate, span = PLACE_SPAN_M) => {
    placed.current = true;
    asked.current++;
    setTarget({ latitude: place.latitude, longitude: place.longitude, span, key: `${place.latitude},${place.longitude},${Date.now()}` });
    setLabel({ name: place.name, address: place.address });
    setName(place.name || place.address);
    setNaming(false);
    setFailed(false);
    setMode('map');
    Keyboard.dismiss();
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

  if (mode === 'search') {
    return (
      <SearchMode
        onPick={(place) => {
          haptic.tap();
          flyTo(place);
        }}
        onBack={() => setMode('map')}
        onHere={onHere}
        locating={locating}
        hereFailed={hereFailed}
      />
    );
  }

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

  return (
    <MapMode
      target={target}
      label={label}
      naming={naming}
      name={name}
      onName={setName}
      onSettle={onSettle}
      onMoveStart={onMoveStart}
      onPoiPress={(place) => {
        placed.current = true;
        asked.current++;
        setLabel({ name: place.name, address: place.address });
        setName(place.name || place.address);
        setNaming(false);
      }}
      onSearch={() => setMode('search')}
      onHere={onHere}
      locating={locating}
      hereFailed={hereFailed}
      failed={failed}
      onSave={onSave}
      onClose={close}
    />
  );
}

/** The search screen: the field, "Use where I am now", and Apple's suggestions as you type. */
function SearchMode({
  onPick,
  onBack,
  onHere,
  locating,
  hereFailed,
}: {
  onPick: (place: Candidate) => void;
  onBack: () => void;
  onHere: () => void;
  locating: boolean;
  hereFailed: NoFix | null;
}) {
  const insets = useSafeAreaInsets();
  const imperial = usesMiles();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Suggested[] | null>(null);
  const [from, setFrom] = useState<Spot | null>(null);
  const [offline, setOffline] = useState(false);
  const [searching, setSearching] = useState(false);
  /** The suggestion being looked up after a tap. */
  const [opening, setOpening] = useState<string | null>(null);
  const [lost, setLost] = useState(false);

  // Suggestions as you type. Only the latest query's answer is shown.
  const asked = useRef(0);
  const type = (text: string) => {
    setQuery(text);
    setLost(false);
    const short = text.trim().length < 2;
    setSearching(!short);
    if (short) {
      setItems(null);
      setOffline(false);
    }
  };
  useEffect(() => {
    const ask = ++asked.current;
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const found = await suggest(query);
      if (ask !== asked.current || found.trouble === 'stale') return;
      setItems(found.items);
      if (found.from) setFrom(found.from);
      setOffline(found.trouble === 'offline');
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const open = async (item: Suggested) => {
    haptic.tap();
    setOpening(item.id);
    setLost(false);
    const place = await placeOf(item);
    setOpening(null);
    if (!place) {
      haptic.thud();
      setLost(true);
      return;
    }
    onPick({ ...place, name: place.name || item.title });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.s }]}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to the map">
            <SymbolView name={sym('chevron.left', 'arrow_back')} size={18} weight="semibold" tintColor={C.text} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={type}
            placeholder="Search for a place or address"
            placeholderTextColor={C.text3}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
            accessibilityLabel="Search for a place or address"
          />
          {searching ? <ActivityIndicator size="small" color={C.text2} /> : null}
          {query && !searching ? (
            <Pressable onPress={() => type('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
              <SymbolView name={sym('xmark.circle.fill', 'cancel')} size={18} tintColor={C.text3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.results, { paddingBottom: insets.bottom + Space.l }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!items ? (
          <>
            <Row
              icon={sym('location.fill', 'my_location')}
              title={locating ? 'Finding you…' : 'Use where I am now'}
              detail="If you’re at your place now, not at home"
              onPress={onHere}
              busy={locating}
            />
            <Row
              icon={sym('map', 'map')}
              title="Choose on map"
              detail="Move the map until the pin is on it"
              onPress={onBack}
              last
            />
            <Text style={styles.hint}>Somewhere that isn’t home: the gym, campus, the café.</Text>
          </>
        ) : null}
        {items?.map((item, i) => (
          <Row
            key={item.id}
            icon={sym('mappin', 'location_on')}
            title={item.title}
            detail={[item.place && from ? formatDistance(distanceMeters(from, item.place), imperial) : '', item.subtitle]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => open(item)}
            busy={opening === item.id}
            last={i === items.length - 1}
          />
        ))}
        {items && items.length === 0 ? (
          <Text style={styles.hint}>
            {offline
              ? 'Can’t search without a connection. Check your signal, or choose it on the map.'
              : 'Nothing found. Try the street address, or choose it on the map.'}
          </Text>
        ) : null}
        {lost ? <Text style={styles.hint}>Couldn’t find where that one is. Try another, or choose it on the map.</Text> : null}
        {hereFailed ? <Text style={styles.hint}>{hereFailedWords(hereFailed)}</Text> : null}
        {hereFailed && settingsCanFix(hereFailed) ? <TextButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}
      </ScrollView>
    </View>
  );
}

/** The map with the pin, the search bar over it, and the card that names and saves the spot. */
function MapMode({
  target,
  label,
  naming,
  name,
  onName,
  onSettle,
  onMoveStart,
  onPoiPress,
  onSearch,
  onHere,
  locating,
  hereFailed,
  failed,
  onSave,
  onClose,
}: {
  target: MapTarget;
  label: Label | null;
  naming: boolean;
  name: string;
  onName: (name: string) => void;
  onSettle: (spot: Spot & { byUser: boolean }) => void;
  onMoveStart: () => void;
  onPoiPress: (place: Candidate) => void;
  onSearch: () => void;
  onHere: () => void;
  locating: boolean;
  hereFailed: NoFix | null;
  failed: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const radius = formatDistance(PLACE_RADIUS_M, usesMiles());
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
          onPoiPress={onPoiPress}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noMap]}>
          <Text style={styles.hint}>The map comes with the next app update. Search for your place for now.</Text>
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + Space.s }]} pointerEvents="box-none">
        <Pressable onPress={onClose} style={styles.roundButton} accessibilityRole="button" accessibilityLabel="Close">
          <SymbolView name={sym('xmark', 'close')} size={16} weight="semibold" tintColor={C.text} />
        </Pressable>
        <Pressable onPress={onSearch} style={[styles.searchField, styles.flex]} accessibilityRole="search" accessibilityLabel="Search for a place">
          <SymbolView name={sym('magnifyingglass', 'search')} size={17} tintColor={C.text2} />
          <Text style={[styles.input, !label && styles.placeholder]} numberOfLines={1}>
            {label?.name || 'Search for a place or address'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={styles.flex} pointerEvents="none" />
        <View style={styles.floatRow} pointerEvents="box-none">
          <Pressable
            onPress={onHere}
            disabled={locating}
            style={styles.roundButton}
            accessibilityRole="button"
            accessibilityLabel="Go to where I am"
          >
            {locating ? (
              <ActivityIndicator size="small" color={C.text} />
            ) : (
              <SymbolView name={sym('location.fill', 'my_location')} size={17} tintColor={C.text} />
            )}
          </Pressable>
        </View>
        <View style={[styles.card, { paddingBottom: insets.bottom + Space.l }]}>
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
                onChangeText={onName}
                placeholder="The gym"
                placeholderTextColor={C.text3}
                maxLength={60}
                returnKeyType="done"
                accessibilityLabel="Name for this place"
              />
            </View>
          ) : null}
          {hereFailed ? <Text style={styles.cardDetail}>{hereFailedWords(hereFailed)}</Text> : null}
          {hereFailed && settingsCanFix(hereFailed) ? <TextButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}
          {failed ? <Text style={styles.cardDetail}>That spot didn’t save. Move the pin a little, or search for it.</Text> : null}
          <PrimaryButton label="Save this place" onPress={onSave} disabled={!label || naming} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
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
  title,
  detail,
  onPress,
  busy,
  last,
}: {
  icon: ReturnType<typeof sym>;
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
      <View style={styles.rowIcon}>
        {busy ? <ActivityIndicator size="small" color={C.text} /> : <SymbolView name={icon} size={15} tintColor={C.text} />}
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
  searchRow: { paddingHorizontal: Space.l, paddingBottom: Space.s },
  // Google Maps' search pill: one rounded field, the way back at its start.
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    backgroundColor: C.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.l,
    minHeight: 48,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  input: { ...Type.body, color: C.text, flex: 1, paddingVertical: Space.s },
  placeholder: { color: C.text2 },
  results: { paddingHorizontal: Space.l, paddingTop: Space.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.m, minHeight: 60 },
  pressed: { opacity: 0.6 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, paddingVertical: Space.m, gap: 2 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { ...Type.body, color: C.text, fontWeight: '600' },
  rowDetail: { ...Type.secondary, color: C.text2 },
  hint: { ...Type.secondary, color: C.text2, textAlign: 'center', paddingHorizontal: Space.l, paddingTop: Space.l },
  noMap: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', padding: Gap.gutter },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: Space.s, paddingHorizontal: Space.l },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  floatRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Space.l, paddingBottom: Space.m },
  card: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Radius.card + 4,
    borderTopRightRadius: Radius.card + 4,
    paddingHorizontal: Gap.gutter,
    paddingTop: Space.xl,
    gap: Space.l,
  },
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
