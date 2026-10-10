'use no memo';
// Reads the App Group stores during render (the place, the lock), which change outside React.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Text, TextInput } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { getMorningPlace, getPlaceEditRefusal, PLACE_RADIUS_M, saveMorningPlace } from '@/lib/place';
import { Gap, Radius, Space, Type } from '@/theme';

import { applyRoutineEdit, getSetRoutine } from '../routine/apply-edit';
import { here, mapPicture, search, type Candidate } from './locate';
import { formatDistance } from './place-stage';
import { usesMiles } from './units';

/**
 * Picking the morning place (Leave the house), as a sheet over Routine. The layout follows
 * the search sheets in Citizen, Alta and Zomato on Mobbin (2026-10-09): the field at the top
 * with the keyboard up, "use where I am" first, results under it as you type, each a pin,
 * the name and the address. Picking one shows it on a map with the check-in radius, like
 * Rivian's location confirm, with a name to save it under.
 *
 * `select`: opened by tapping "Get to a place" with no place yet. Saving also makes it the
 * routine's method; closing without saving leaves the routine as it was.
 *
 * Pure black, iOS's neutral greys on it (user's ask, 2026-10-09).
 */

const C = {
  bg: '#000000',
  field: '#1C1C1E',
  icon: '#2C2C2E',
  line: 'rgba(255,255,255,0.1)',
  text: '#FFFFFF',
  text2: '#8E8E93',
  text3: '#636366',
};

/** Typing pauses this long before a search goes out. */
const DEBOUNCE_MS = 300;

type Picked = { candidate: Candidate; source: 'here' | 'search' };

export function PlacePick({ select }: { select: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hereFailed, setHereFailed] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);

  // Search as you type. Only the latest query's answer is shown.
  const asked = useRef(0);
  const type = (text: string) => {
    setQuery(text);
    const short = text.trim().length < 2;
    setSearching(!short);
    if (short) setResults(null);
  };
  useEffect(() => {
    const ask = ++asked.current;
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const found = await search(query);
      if (ask !== asked.current) return;
      setResults(found);
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const onHere = async () => {
    haptic.tap();
    setLocating(true);
    setHereFailed(null);
    const found = await here();
    setLocating(false);
    if (!found.ok) {
      haptic.thud();
      setHereFailed(
        found.why === 'denied'
          ? 'Location is off for Locturne. Turn on While Using the App in Settings, or search instead.'
          : found.why === 'off'
            ? 'Location Services are off on this phone. Search instead, or turn them on in Settings.'
            : 'Your phone didn’t find you in time. Try again, or search instead.',
      );
      return;
    }
    setPicked({ candidate: found.candidate, source: 'here' });
  };

  const refused = getPlaceEditRefusal() !== null;
  const pad = { paddingBottom: insets.bottom + Space.l };

  if (refused) {
    return (
      <View style={[styles.screen, styles.content, pad]}>
        <Header title="Not from bed." onClose={close} />
        <Text style={styles.sub}>You can pick or change your place in the day, once you’re up. Otherwise I’d let you pick your pillow.</Text>
        <View style={styles.flex} />
        <PrimaryButton label="Okay" onPress={close} />
      </View>
    );
  }

  if (picked) {
    return (
      <Confirm
        picked={picked}
        width={width - Gap.gutter * 2}
        onBack={() => setPicked(null)}
        onClose={close}
        onSaved={() => {
          if (select) applyRoutineEdit({ ...getSetRoutine(), method: 'place' });
          close();
        }}
        pad={pad}
      />
    );
  }

  const current = getMorningPlace();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, pad]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Header title={current ? 'Change your place' : 'Where are we going?'} onClose={close} />
      <Text style={styles.sub}>Somewhere that isn’t home: the gym, campus, the café.</Text>

      <View style={styles.field}>
        <SymbolView name={sym('magnifyingglass', 'search')} size={17} tintColor={C.text2} />
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
            <SymbolView name={sym('xmark.circle.fill', 'cancel')} size={17} tintColor={C.text3} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.list}>
        {!results ? (
          <Row
            icon={sym('location.fill', 'my_location')}
            title={locating ? 'Finding you…' : 'Use where I am now'}
            detail="Only if you’re at your place, not at home"
            onPress={onHere}
            busy={locating}
            last
          />
        ) : null}
        {results?.map((r, i) => (
          <Row
            key={`${r.latitude},${r.longitude},${i}`}
            icon={sym('mappin', 'location_on')}
            title={r.name}
            detail={r.address}
            onPress={() => {
              haptic.tap();
              setPicked({ candidate: r, source: 'search' });
            }}
            last={i === results.length - 1}
          />
        ))}
      </View>

      {results && results.length === 0 ? (
        <Text style={styles.note}>Nothing found. Try the street address, or go there and use where you are.</Text>
      ) : null}
      {hereFailed ? <Text style={styles.note}>{hereFailed}</Text> : null}
    </ScrollView>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
        <SymbolView name={sym('xmark', 'close')} size={14} weight="semibold" tintColor={C.text2} />
      </Pressable>
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

/** The place picked: on a map with the radius that counts, a name, and Save. */
function Confirm({
  picked: { candidate, source },
  width,
  onBack,
  onClose,
  onSaved,
  pad,
}: {
  picked: Picked;
  width: number;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
  pad: { paddingBottom: number };
}) {
  const height = Math.round(width * 0.62);
  const [map, setMap] = useState<string | null>(null);
  const [name, setName] = useState(candidate.name);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    mapPicture(candidate, width, height).then((uri) => live && setMap(uri));
    return () => {
      live = false;
    };
  }, [candidate, width, height]);

  const radius = formatDistance(PLACE_RADIUS_M, usesMiles());
  const onSave = () => {
    const result = saveMorningPlace({ ...candidate, name: name.trim() || candidate.name || candidate.address || 'My place' });
    if (result === null) {
      haptic.done();
      onSaved();
    } else {
      haptic.thud();
      setFailed(true);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, pad]} keyboardShouldPersistTaps="handled">
      <Header title={source === 'here' ? 'Here? Fine.' : 'That one?'} onClose={onClose} />

      <Animated.View entering={FadeIn.duration(250)} style={[styles.map, { height }]}>
        {map ? (
          <Image source={{ uri: map }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
        ) : (
          <SymbolView name={sym('mappin.and.ellipse', 'location_on')} size={28} tintColor={C.text3} />
        )}
      </Animated.View>

      <View style={styles.place}>
        <Text style={styles.placeTitle}>{candidate.name || 'Your place'}</Text>
        {candidate.address ? <Text style={[styles.rowDetail, styles.centred]}>{candidate.address}</Text> : null}
        <Text style={styles.sub}>Anywhere within about {radius} counts as there.</Text>
      </View>

      <View style={styles.nameBlock}>
        <Text style={styles.label}>Call it</Text>
        <View style={styles.field}>
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
      </View>

      {failed ? <Text style={styles.note}>That spot didn’t save. Pick it again, or try another.</Text> : null}

      <View style={styles.flex} />
      <View style={styles.bottom}>
        <PrimaryButton label="Save this place" onPress={onSave} />
        <TextButton label="Back" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, paddingHorizontal: Gap.gutter, paddingTop: Space.xl, gap: Space.l },
  // Centred, with the close button pinned right (the user likes headings centred).
  header: { alignItems: 'center', justifyContent: 'center', minHeight: 30, paddingHorizontal: 40 },
  title: { ...Type.title, fontSize: 22, lineHeight: 27, color: C.text, textAlign: 'center' },
  closeButton: {
    position: 'absolute',
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { ...Type.secondary, color: C.text2, marginTop: -Space.s, textAlign: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    backgroundColor: C.field,
    borderRadius: Radius.control,
    paddingHorizontal: Space.m,
    minHeight: 44,
  },
  input: { ...Type.body, color: C.text, flex: 1, paddingVertical: Space.s },
  list: { marginTop: -Space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.m, minHeight: 60 },
  pressed: { opacity: 0.6 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.icon, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, paddingVertical: Space.m, gap: 2 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { ...Type.body, color: C.text, fontWeight: '600' },
  rowDetail: { ...Type.secondary, color: C.text2 },
  note: { ...Type.secondary, color: C.text2 },
  map: {
    borderRadius: Radius.control * 1.5,
    overflow: 'hidden',
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  place: { gap: Space.xs, alignItems: 'center' },
  placeTitle: { ...Type.body, color: C.text, fontWeight: '600', fontSize: 20, textAlign: 'center' },
  centred: { textAlign: 'center' },
  nameBlock: { gap: Space.s },
  label: { ...Type.label, color: C.text2 },
  flex: { flex: 1, minHeight: Space.l },
  bottom: { gap: Space.l },
});
