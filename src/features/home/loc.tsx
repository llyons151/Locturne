import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PANEL_RADIUS, tabStripHeight } from '@/components/app-tabs';
import { runRim, stopRim } from '@/components/loc-rim';
import { knockNav, stopKnock } from '@/components/nav-knock';
import { useKnockLab } from '@/features/dev/knock-lab/store';
import { useTabSelected } from '@/hooks/use-tab-selected';
import { thud, tick } from '@/lib/haptics';
import { sharedGet, sharedSet } from '@/lib/screen-time';
import { getTone } from '@/lib/tone';

import { LocBubble } from './loc-bubble';
import { HELLO_CHANCE, isLocBirthday, locLine, locSpecial, type LocCue as Cue, type LocMoment } from './loc-lines';
import { LOC_VIEW, type LocMood } from './loc-rig';
import LocStage from './loc-stage';
import { seeded, ultraRun } from './loc-ultra';
import type { BurrowPath } from './nav-knock-tune';
import { RIM_TOP_CORNER, type Rim } from './rim';

/** His width as a share of the screen (the old static peek was 0.23). */
const SHARE = 0.27;

/** Where his speech bubble's tail points, as a share of the canvas's height up from its bottom: just over his head. */
const BUBBLE_AT = 0.78;

/** How long a line stays up before it fades. */
const LINE_MS = 3200;

/** This many pokes inside `STREAK_MS` and he says something about it instead. */
const STREAK = 5;
const STREAK_MS = 30_000;

// A tap always gets his face; a line only now and then, so it stays his choice (user request,
// October 15, 2026). Never on two taps in a row, nor soon after he last spoke.
const POKE_LINE_CHANCE = 1 / 3;
const POKE_QUIET_MS = 20_000;
/**
 * A hidden one (user, October 16, 2026): every fourth touch inside `STREAK_MS`, one time in
 * three, he says "Pineapple". Taps that send him under count too; then he says it coming out.
 */
const PINEAPPLE_AT = 4;
const PINEAPPLE_CHANCE = 1 / 3;
/** Burrowing is the joke on its own; he grumbles about it only once in a while. */
const ANGRY_LINE_CHANCE = 1 / 4;

// What he's already said once: each moment's key (per night or morning), and his birthday's
// date. Saved, so a relaunch doesn't make him say it again; only the newest few are kept.
const SAID_KEY = 'locturne.loc.said';
const SAID_KEPT = 30;
/** The app states lab's made-up moments: kept for the session only, so they don't push the real ones out. */
const mockSaid = new Set<string>();
const saidOnce = {
  has: (key: string) => mockSaid.has(key) || (sharedGet<string[]>(SAID_KEY) ?? []).includes(key),
  add(key: string) {
    if (key.startsWith('mock:')) return void mockSaid.add(key);
    const kept = (sharedGet<string[]>(SAID_KEY) ?? []).filter((k) => k !== key);
    sharedSet(SAID_KEY, [...kept, key].slice(-SAID_KEPT));
  },
};

/** Counts `key` as said, so Home doesn't say it again (the payoff already said the wake-up's line). */
export const markLocSaid = (key: string) => saidOnce.add(key);

// Home decides his mood and whether he's out; he's drawn by the tabs layout, which stays on
// screen across tabs, so his exit is seen instead of fading away with Home's page. `seen`: Home
// is also on top, with no screen over it (the morning wake-up, a scan, onboarding, a sheet), so
// what he says can be read; until then his news waits.
// `floor`: how high Home keeps its content off the panel's bottom edge, in points; his bubble
// stays under it, clear of Home's button.
type State = { mood: LocMood; wary: number; present: boolean; seen: boolean; moment: LocMoment | null; floor: number };
let state: State = { mood: 'awake', wary: 0, present: false, seen: false, moment: null, floor: 0 };
const listeners = new Set<() => void>();
const publish = (next: State) => {
  const same =
    next.mood === state.mood &&
    next.wary === state.wary &&
    next.present === state.present &&
    next.seen === state.seen &&
    next.floor === state.floor &&
    next.moment?.key === state.moment?.key;
  if (same) return;
  state = next;
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const snapshot = () => state;

/**
 * Home's say over Loc: his mood, that he's out while Home is the picked tab, and what he has
 * to say something about (`moment`). Draws nothing.
 */
export function LocCue({ mood, wary = 0, moment = null, floor }: { mood: LocMood; wary?: number; moment?: LocMoment | null; floor: number }) {
  const present = useTabSelected();
  const seen = useIsFocused() && present;
  const key = moment?.key;
  const kind = moment?.kind;
  useEffect(
    () => publish({ mood, wary, present, seen, floor, moment: key && kind ? { key, kind } : null }),
    [mood, wary, present, seen, floor, key, kind],
  );
  useEffect(() => () => publish({ ...state, present: false, seen: false }), []);
  return null;
}

/**
 * Loc on the panel's bottom edge, in front of the moon (user request, October 10, 2026). He
 * lives under the covers (the nav strip): leaving Home he dives under and the lump scurries off
 * along the edge; coming back it scurries in and he bursts out. The rig is in loc-rig.ts
 * (docs/LOC_SILHOUETTE.md, round 6).
 */
export function Loc() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { mood, wary, present, seen, moment, floor } = useSyncExternalStore(subscribe, snapshot);
  // The knock lab's Burrow button and live tuning (dev only; at rest it never changes).
  const lab = useKnockLab();
  // The canvas runs the panel's full width, so the blanket lump can travel along the edge; he
  // sits in the middle, SHARE of it.
  const h = Math.round((width * SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  const bottom = tabStripHeight(insets.bottom) - 1;
  const tail = Math.round(h * BUBBLE_AT);
  // The bubble's height, up to just under Home's content, with a gap kept.
  const room = floor > 0 ? Math.max(0, floor - tail - 8) : undefined;
  // The panel's outline, for the ultra zoomies' run round it (rim.ts).
  const rim: Rim = { W: width, H: height - tabStripHeight(insets.bottom), Rb: PANEL_RADIUS, Rt: RIM_TOP_CORNER };
  const rimRef = useRef(rim);
  useEffect(() => {
    rimRef.current = rim;
  });

  // His line: what he says when something happens to him (loc-lines.ts).
  const [said, setSaid] = useState<{ line: string; id: number } | null>(null);
  const moodRef = useRef(mood);
  const momentRef = useRef(moment);
  const seenRef = useRef(seen);
  const greeted = useRef(false);
  // He came up while a screen was over Home: the hello waits until it's gone.
  const helloDue = useRef(false);
  const pokes = useRef<number[]>([]);
  const touches = useRef<number[]>([]);
  const pineappleDue = useRef(false);
  const lastSpoke = useRef(0);
  const pokeSpoke = useRef(false);
  useEffect(() => {
    moodRef.current = mood;
    momentRef.current = moment;
    seenRef.current = seen;
  }, [mood, moment, seen]);
  const speak = useCallback((line: string | null) => {
    if (!line) return;
    lastSpoke.current = Date.now();
    setSaid((prev) => ({ line, id: (prev?.id ?? 0) + 1 }));
    AccessibilityInfo.announceForAccessibility(`Loc: ${line}`);
  }, []);
  /** A moment Home told him about, or his birthday, that he hasn't mentioned yet. */
  const news = useCallback(() => {
    const m = momentRef.current;
    if (m && !saidOnce.has(m.key)) {
      saidOnce.add(m.key);
      return locSpecial(m.kind, getTone());
    }
    const today = new Date();
    const birthday = `birthday:${today.toDateString()}`;
    if (isLocBirthday(today) && !saidOnce.has(birthday)) {
      saidOnce.add(birthday);
      return locSpecial('birthday', getTone());
    }
    return null;
  }, []);
  /** News always gets said; a plain hello only now and then. */
  const hello = useCallback(() => {
    greeted.current = true;
    const line = news();
    if (line) return speak(line);
    if (Math.random() < HELLO_CHANCE) speak(locLine('hello', moodRef.current, getTone(), new Date().getHours()));
  }, [news, speak]);
  useEffect(() => {
    // A hello is once per visit to Home.
    if (!present) {
      greeted.current = false;
      helloDue.current = false;
    } else if (seen && helloDue.current) {
      helloDue.current = false;
      if (!greeted.current) hello();
    }
  }, [present, seen, hello]);
  const onCue = useCallback(
    (cue: Cue | 'ultra') => {
      if (cue === 'hide') return setSaid(null);
      // A fourth touch that drew the pineapple: whatever he'd have said, it's this.
      if (pineappleDue.current && (cue === 'poke' || cue === 'angry' || cue === 'ultra')) {
        pineappleDue.current = false;
        return speak('Pineapple');
      }
      // Back from round the whole screen: always worth a word.
      if (cue === 'ultra') return speak(locSpecial('ultra', getTone()));
      if (cue === 'hello') {
        if (greeted.current) return;
        if (!seenRef.current) {
          helloDue.current = true;
          return;
        }
        return hello();
      }
      if (cue === 'poke') {
        // Tapped before he got to say hello: his news (bedtime, the apps asleep) still gets said.
        if (!greeted.current) {
          greeted.current = true;
          const line = news();
          if (line) return speak(line);
        }
        const now = Date.now();
        pokes.current = [...pokes.current.filter((t) => now - t < STREAK_MS), now];
        if (pokes.current.length >= STREAK) {
          pokes.current = [];
          pokeSpoke.current = true;
          return speak(locSpecial('streak', getTone()));
        }
        const quiet = pokeSpoke.current || now - lastSpoke.current < POKE_QUIET_MS || Math.random() >= POKE_LINE_CHANCE;
        pokeSpoke.current = !quiet;
        if (quiet) return;
      }
      if (cue === 'angry' && Math.random() >= ANGRY_LINE_CHANCE) return;
      speak(locLine(cue, moodRef.current, getTone(), new Date().getHours()));
    },
    [hello, news, speak],
  );
  const onTap = useCallback((kind: 'poke' | 'burrow') => {
    if (kind === 'burrow') thud();
    else tick();
    const now = Date.now();
    touches.current = [...touches.current.filter((t) => now - t < STREAK_MS), now];
    if (touches.current.length >= PINEAPPLE_AT) {
      touches.current = [];
      pineappleDue.current = Math.random() < PINEAPPLE_CHANCE;
    }
  }, []);
  const onBurrow = useCallback((path: BurrowPath) => {
    // The nav strip only needs the bottom edge; the run round the screen goes to its own layer.
    const { ultra, at, ...strip } = path;
    knockNav(strip);
    // The same run his canvas planned, from its seed and the same screen edge.
    if (ultra !== undefined && rimRef.current) runRim(ultraRun(rimRef.current, seeded(ultra)).run, at);
  }, []);
  // Off Home mid-run, the lump going round the screen fades instead of finishing without him,
  // the nav buttons ring down, and a pineapple rolled for the next poke is dropped.
  useEffect(() => {
    if (present) return;
    stopRim();
    stopKnock();
    pineappleDue.current = false;
  }, [present]);
  // A moment that starts while he's already out (bedtime comes up, the apps fall asleep) gets
  // said right away, or once the screen over Home is gone (the wake-up's done line, after the
  // wake-up screen closes); otherwise it waits for his hello.
  const momentKey = moment?.key;
  useEffect(() => {
    if (present && seen && greeted.current && momentKey) speak(news());
  }, [present, seen, momentKey, news, speak]);
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), LINE_MS);
    return () => clearTimeout(t);
  }, [said]);

  return (
    <>
      <View
        // One point past the edge so no hairline of sky shows between him and the panel's edge.
        style={[styles.wrap, { width, height: h, bottom }]}
        pointerEvents={present ? 'auto' : 'none'}
        accessible={present}
        accessibilityLabel="Loc, the raccoon"
        accessibilityHint="Tap to poke him. Poke him again and he hides under the covers"
      >
        <LocStage
          mood={mood}
          wary={wary}
          share={SHARE}
          present={present}
          onCue={onCue}
          onTap={onTap}
          onBurrow={onBurrow}
          burrowNonce={lab.nonce}
          zoomNonce={lab.zoomNonce}
          ultraNonce={lab.ultraNonce}
          rim={rim}
          knock={lab.tune}
          dom={{
            style: { width, height: h, backgroundColor: 'transparent' },
            scrollEnabled: false,
            bounces: false,
            contentInsetAdjustmentBehavior: 'never',
          }}
        />
      </View>
      {present && said ? (
        <View style={[styles.speech, { bottom: bottom + tail }]} pointerEvents="box-none">
          <LocBubble key={said.id} line={said.line} room={room} wide={Math.min(width - 32, 320)} onDismiss={() => setSaid(null)} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0 },
  speech: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
});
