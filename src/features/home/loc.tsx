import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabStripHeight } from '@/components/app-tabs';
import { useTabSelected } from '@/hooks/use-tab-selected';
import { sharedGet, sharedSet } from '@/lib/screen-time';
import { getTone } from '@/lib/tone';

import { LocBubble } from './loc-bubble';
import { HELLO_CHANCE, isLocBirthday, locLine, locSpecial, type LocCue as Cue, type LocMoment } from './loc-lines';
import { LOC_VIEW, type LocMood } from './loc-rig';
import LocStage from './loc-stage';

/** His width as a share of the screen (the old static peek was 0.23). */
const SHARE = 0.27;

/** Where his speech bubble's tail points, as a share of the canvas's height up from its bottom: just over his head. */
const BUBBLE_AT = 0.78;

/** How long a line stays up before it fades. */
const LINE_MS = 3200;

/** This many pokes inside `STREAK_MS` and he says something about it instead. */
const STREAK = 5;
const STREAK_MS = 30_000;

// What he's already said once: each moment's key (per night or morning), and his birthday's
// date. Saved, so a relaunch doesn't make him say it again; only the newest few are kept.
const SAID_KEY = 'locturne.loc.said';
const SAID_KEPT = 30;
const saidOnce = {
  has: (key: string) => (sharedGet<string[]>(SAID_KEY) ?? []).includes(key),
  add(key: string) {
    const kept = (sharedGet<string[]>(SAID_KEY) ?? []).filter((k) => k !== key);
    sharedSet(SAID_KEY, [...kept, key].slice(-SAID_KEPT));
  },
};

// Home decides his mood and whether he's out; he's drawn by the tabs layout, which stays on
// screen across tabs, so his exit is seen instead of fading away with Home's page. `seen`: Home
// is also on top, with no screen over it (the morning wake-up, a scan, onboarding, a sheet), so
// what he says can be read; until then his news waits.
// `floor`: how high Home keeps its content off the panel's bottom edge, in points; his bubble
// stays under it, clear of Home's button.
type State = { mood: LocMood; present: boolean; seen: boolean; moment: LocMoment | null; floor: number };
let state: State = { mood: 'awake', present: false, seen: false, moment: null, floor: 0 };
const listeners = new Set<() => void>();
const publish = (next: State) => {
  const same =
    next.mood === state.mood &&
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
export function LocCue({ mood, moment = null, floor }: { mood: LocMood; moment?: LocMoment | null; floor: number }) {
  const present = useTabSelected();
  const seen = useIsFocused() && present;
  const key = moment?.key;
  const kind = moment?.kind;
  useEffect(
    () => publish({ mood, present, seen, floor, moment: key && kind ? { key, kind } : null }),
    [mood, present, seen, floor, key, kind],
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { mood, present, seen, moment, floor } = useSyncExternalStore(subscribe, snapshot);
  // The canvas runs the panel's full width, so the blanket lump can travel along the edge; he
  // sits in the middle, SHARE of it.
  const h = Math.round((width * SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  const bottom = tabStripHeight(insets.bottom) - 1;
  const tail = Math.round(h * BUBBLE_AT);
  // The bubble's height, up to just under Home's content, with a gap kept.
  const room = floor > 0 ? Math.max(0, floor - tail - 8) : undefined;

  // His line: what he says when something happens to him (loc-lines.ts).
  const [said, setSaid] = useState<{ line: string; id: number } | null>(null);
  const moodRef = useRef(mood);
  const momentRef = useRef(moment);
  const seenRef = useRef(seen);
  const greeted = useRef(false);
  // He came up while a screen was over Home: the hello waits until it's gone.
  const helloDue = useRef(false);
  const pokes = useRef<number[]>([]);
  useEffect(() => {
    moodRef.current = mood;
    momentRef.current = moment;
    seenRef.current = seen;
  }, [mood, moment, seen]);
  const speak = useCallback((line: string | null) => {
    if (!line) return;
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
    (cue: Cue) => {
      if (cue === 'hide') return setSaid(null);
      if (cue === 'hello') {
        if (greeted.current) return;
        if (!seenRef.current) {
          helloDue.current = true;
          return;
        }
        return hello();
      }
      if (cue === 'poke') {
        const now = Date.now();
        pokes.current = [...pokes.current.filter((t) => now - t < STREAK_MS), now];
        if (pokes.current.length >= STREAK) {
          pokes.current = [];
          return speak(locSpecial('streak', getTone()));
        }
      }
      speak(locLine(cue, moodRef.current, getTone(), new Date().getHours()));
    },
    [hello, speak],
  );
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
          share={SHARE}
          present={present}
          onCue={onCue}
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
