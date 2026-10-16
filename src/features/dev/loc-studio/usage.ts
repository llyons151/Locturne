import { LOC_EXPLORE, LOC_HABITS, LOC_IDLE, LOC_IDLE_GAP, LOC_POKE_ODDS, type Bit, type LocMood } from '@/features/home/loc-rig';
import { NAV_KNOCK } from '@/features/home/nav-knock-tune';

import { ACTIONS, MOODS } from './takes';

/**
 * The Loc studio's "In the app" page: where Loc is on screen, which mood he's in there and why,
 * and what makes each move play. The odds come from the rig's own tables (LOC_IDLE, LOC_POKE_ODDS,
 * NAV_KNOCK), so they stay true when those change; the rest is written from the screens that use
 * him (home-screen.tsx, loc.tsx, loc-profile.tsx, payoff-screen.tsx, pushups-view.tsx).
 */
export type Surface = {
  id: string;
  name: string;
  where: string;
  /** Size, as a share of the screen's width (or his canvas's). */
  size: string;
  moods: { mood: LocMood; when: string }[];
  triggers: { what: string; plays: string[]; odds?: string }[];
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const POKE_PLAIN = 1 - LOC_POKE_ODDS.unhinged - LOC_POKE_ODDS.clutch;

const ENTRANCE = { what: 'He comes on screen (always starts hidden)', plays: ['arrive', 'arrive-asleep'], odds: 'Rises asleep if he’s asleep, otherwise pops up' };
const TAPS = [
  {
    what: 'One tap on him',
    plays: ['poke', 'x:clutch', 'x:unhinged'],
    odds: `Poke ${pct(POKE_PLAIN)}, clutches the ledge ${pct(LOC_POKE_ODDS.clutch)}, unhinged pop ${pct(LOC_POKE_ODDS.unhinged)}`,
  },
  { what: 'A second tap within 2.5 s', plays: ['burrow'], odds: 'Every time; a new random route under the covers' },
  {
    what: `${NAV_KNOCK.zoomAfter} burrows inside ${NAV_KNOCK.zoomWindow} s`,
    plays: ['burrow'],
    odds: 'The zoomies: a long fast run under the covers (try “Go live” in Animate and burrow him three times)',
  },
];

export const SURFACES: Surface[] = [
  {
    id: 'home',
    name: 'Home',
    where: 'On the panel’s bottom edge, in front of the moon. He lives under the covers (the nav strip).',
    size: '27% of the screen’s width',
    moods: [
      { mood: 'asleep', when: 'At night while the apps are asleep, and during a nap' },
      { mood: 'groggy', when: 'In the morning, before you’ve proved you’re up' },
      { mood: 'awake', when: 'In the day' },
      { mood: 'smug', when: 'In the day, when he respects you (lib/loc-mind.ts: you’ve been getting up)' },
    ],
    triggers: [
      { what: 'You pick the Home tab', plays: ['arrive', 'arrive-asleep'], odds: 'The lump runs in and he bursts out; asleep, he hauls himself up and goes back to sleep' },
      { what: 'You leave Home', plays: ['leave'], odds: 'Every time' },
      ...TAPS,
      { what: 'Mood changes (night falls, morning comes, you get up)', plays: ['asleep', 'groggy', 'awake', 'smug'].map((m) => `mood:${m}`), odds: 'Parts move in order; going to sleep, eyes close first, then he sinks' },
      {
        what: 'You’ve been slipping out (he’s wary of you)',
        plays: ['x:comment-lid'],
        odds: 'Eyes narrow a little all the time; when wariness is over 0.3, up to 35% of idle moves become the comment lid',
      },
    ],
  },
  {
    id: 'you',
    name: 'You tab',
    where: 'His profile card at the top of the You tab.',
    size: '90% of his card',
    moods: [{ mood: 'awake', when: 'Always awake here' }],
    triggers: [ENTRANCE, ...TAPS.slice(0, 2)],
  },
  {
    id: 'payoff',
    name: 'Morning payoff',
    where: 'The “Up at 6:42” screen after a wake-up (/morning-won).',
    size: '90% of his canvas',
    moods: [{ mood: 'smug', when: 'Always smug here' }],
    triggers: [ENTRANCE],
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    where: 'On the black strip at the bottom of the push-up camera, drawn in gray instead of black.',
    size: 'Fits the strip',
    moods: [
      { mood: 'groggy', when: 'While the camera is finding you' },
      { mood: 'awake', when: 'Counting' },
      { mood: 'betrayed', when: 'You missed one (a bad rep)' },
      { mood: 'smug', when: 'You hit the target' },
    ],
    triggers: [ENTRANCE, { what: 'Your set changes his mood', plays: ['mood:groggy', 'mood:awake', 'mood:betrayed', 'mood:smug'] }],
  },
];

/** Every surface each mood is seen on. */
export function moodSurfaces(mood: LocMood) {
  return SURFACES.filter((s) => s.moods.some((m) => m.mood === mood)).map((s) => s.name);
}

/** The action id for a bit in the idle tables, by identity. */
function actionFor(bit: Bit): string | null {
  for (const [id, b] of Object.entries(LOC_EXPLORE)) if (b === bit) return `x:${id}`;
  for (const [mood, b] of Object.entries(LOC_HABITS)) if (b === bit) return `habit:${mood}`;
  return null;
}

export type IdleRow = { mood: LocMood; gap: [number, number]; moves: { id: string; share: number }[] };

/** What he does with himself in each mood when nothing's happening, and how often. */
export function idleTable(): IdleRow[] {
  return MOODS.map((mood) => {
    const pool = LOC_IDLE[mood] ?? (LOC_HABITS[mood] ? [[LOC_HABITS[mood]!, 1] as [Bit, number]] : []);
    const total = pool.reduce((sum, [, w]) => sum + w, 0);
    const moves = pool.map(([bit, w]) => ({ id: actionFor(bit) ?? '?', share: w / total }));
    return { mood, gap: LOC_IDLE_GAP[mood], moves };
  });
}

/** Where a move is seen in the app, in a line, or null if it never is. */
export function usedIn(id: string): string | null {
  const places: string[] = [];
  for (const s of SURFACES) {
    for (const t of s.triggers) if (t.plays.includes(id)) places.push(`${s.name}: ${t.what.toLowerCase()}`);
  }
  for (const row of idleTable()) {
    const m = row.moves.find((x) => x.id === id);
    if (m) places.push(`idle while ${row.mood} (${pct(m.share)} of idle moves) on ${moodSurfaces(row.mood).join(', ')}`);
  }
  if (id === 'idle' || id === 'blink' || id.startsWith('flick') || id === 'kick' || id === 'pop' || id === 'squash') places.push('all the time, inside other moves and idle life');
  return places.length ? [...new Set(places)].join(' · ') : null;
}

/** Moves the rig can do that never play in the app. */
export const unused = () => ACTIONS.filter((a) => !usedIn(a.id));
