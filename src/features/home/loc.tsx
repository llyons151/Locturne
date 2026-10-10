import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabStripHeight } from '@/components/app-tabs';
import { useTabSelected } from '@/hooks/use-tab-selected';
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

// What he's already said once: each moment's key, and his birthday's date.
const saidOnce = new Set<string>();

// Home decides his mood and whether he's out; he's drawn by the tabs layout, which stays on
// screen across tabs, so his exit is seen instead of fading away with Home's page.
let state: { mood: LocMood; present: boolean; moment: LocMoment | null } = { mood: 'awake', present: false, moment: null };
const listeners = new Set<() => void>();
const publish = (next: typeof state) => {
  if (next.mood === state.mood && next.present === state.present && next.moment?.key === state.moment?.key) return;
  state = next;
  listeners.forEach((l) => l());
};

/**
 * Home's say over Loc: his mood, that he's out while Home is the picked tab, and what he has
 * to say something about (`moment`). Draws nothing.
 */
export function LocCue({ mood, moment = null }: { mood: LocMood; moment?: LocMoment | null }) {
  const present = useTabSelected();
  const key = moment?.key;
  const kind = moment?.kind;
  useEffect(() => publish({ mood, present, moment: key && kind ? { key, kind } : null }), [mood, present, key, kind]);
  useEffect(() => () => publish({ ...state, present: false }), []);
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
  const { mood, present, moment } = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
  // The canvas runs the panel's full width, so the blanket lump can travel along the edge; he
  // sits in the middle, SHARE of it.
  const h = Math.round((width * SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  const bottom = tabStripHeight(insets.bottom) - 1;

  // His line: what he says when something happens to him (loc-lines.ts).
  const [said, setSaid] = useState<{ line: string; id: number } | null>(null);
  const moodRef = useRef(mood);
  const momentRef = useRef(moment);
  const greeted = useRef(false);
  const pokes = useRef<number[]>([]);
  useEffect(() => {
    moodRef.current = mood;
    momentRef.current = moment;
  }, [mood, moment]);
  useEffect(() => {
    // A hello is once per visit to Home.
    if (!present) greeted.current = false;
  }, [present]);
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
  const onCue = useCallback(
    (cue: Cue) => {
      if (cue === 'hide') return setSaid(null);
      if (cue === 'hello') {
        if (greeted.current) return;
        greeted.current = true;
        // News always gets said; a plain hello only now and then.
        const line = news();
        if (line) return speak(line);
        if (Math.random() >= HELLO_CHANCE) return;
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
    [news, speak],
  );
  // A moment that starts while he's already out (bedtime comes up, the apps fall asleep) gets
  // said right away; otherwise it waits for his hello.
  const momentKey = moment?.key;
  useEffect(() => {
    if (present && greeted.current && momentKey) speak(news());
  }, [present, momentKey, news, speak]);
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
        <View style={[styles.speech, { bottom: bottom + Math.round(h * BUBBLE_AT) }]} pointerEvents="box-none">
          <LocBubble key={said.id} line={said.line} onDismiss={() => setSaid(null)} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0 },
  speech: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
});
