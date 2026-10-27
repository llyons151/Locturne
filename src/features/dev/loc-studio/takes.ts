import type { LocChannel, LocMood, LocRig, LocSnapshot } from '@/features/home/loc-rig';

/**
 * The Loc studio's takes: every move the rig can make, recorded one frame at a time so it can be
 * scrubbed, stepped and drawn again exactly. Randomness (blink timing, burrow routes) comes from
 * a seed, so the same take always plays the same way.
 */
export const FPS = 60;
export const DT = 1 / FPS;
export const MOODS: LocMood[] = ['asleep', 'groggy', 'awake', 'smug', 'betrayed'];

export type ActionGroup =
  | 'Your expressions' | 'New: expressions' | 'New: explorations' | 'Comes and goes' | 'Reactions' | 'Habits' | 'Little moves' | 'Mood changes' | 'Idle';
export const GROUPS: ActionGroup[] = [
  'Your expressions', 'New: expressions', 'New: explorations', 'Comes and goes', 'Reactions', 'Habits', 'Little moves', 'Mood changes', 'Idle',
];

export type LocAction = {
  id: string;
  label: string;
  group: ActionGroup;
  /** Where it's seen in the app, and what happens. */
  note: string;
  /** Starts out of sight (an entrance) instead of up on the edge. */
  hidden?: boolean;
  /** Always starts in this mood; otherwise the studio's mood. */
  mood?: LocMood;
  /** Records at least this long, ms. */
  min?: number;
  /** Keeps recording this long after he settles, ms. */
  tail?: number;
  /** Blinks, glances and habits on, whatever the studio says. */
  life?: boolean;
  run: (rig: LocRig) => void;
};

const habit = (mood: LocMood, label: string, note: string): LocAction => ({
  id: `habit:${mood}`, label, group: 'Habits', mood, note, run: (r) => r.playHabit(),
});

const explore = (id: string, label: string, note: string, mood?: LocMood): LocAction => ({
  id: `x:${id}`, label, group: 'New: explorations', mood, note, run: (r) => r.playExplore(id),
});

export const ACTIONS: LocAction[] = [
  explore('yell', 'Yells at the sky', 'The morning payoff: looks up, crouches, throws his right fist up with his eyes slammed shut and shakes, fist pumping. The phone buzzes and the moon rises at the throw.', 'smug'),
  explore('scoot', 'Hands: shuffles over', 'Eyes lead left, then he shuffles hand over hand along the ledge after them, takes a look, and shuffles home.'),
  explore('clutch', 'Hands: clutches the ledge', 'Startled: eyes huge first, then his hands clench the edge and he shrinks. It passes; a heavy-lidded side-eye at you.'),
  explore('pull-up', 'Hands: pulls up to look', 'Presses down on the ledge and rises tall, scanning left and right. Nothing. Lowers back, not impressed.'),
  explore('hide', 'Hands: ducks and hides', 'Ducks behind the ledge, ears and clutching hands showing; peeks over, looks left and right, ducks again.'),
  explore('slip', 'Hands: slips', 'One hand slides off and drops out of sight; he lurches, it scrabbles back and hooks on. A long relieved exhale.'),
  explore('knuckle-tap', 'Hands: taps the ledge', 'Impatient: one hand lifts a little and taps, three quick and one slow, lids heavy, eyes on you.'),
  explore('claw-drum', 'Hands: drums his claws', 'Bored: rolls of the claws from the grip, with dead eyes and one slow blink.'),
  explore('unhinged', 'Unhinged pop', 'The crazy look. A one-frame cut to mismatched pupils, flat lids and a lean in; dead still while one lid twitches; then a double blink and a glance away, as if nothing happened.'),
  explore('unhinged-twos', 'Unhinged pop, on twos', 'The same, with the face holding each pose for two frames, like drawn animation. Compare the texture.'),
  explore('dead-stare', 'Dead stare', 'For a deadpan doom line. Pupils small and centred, lids flat, and no blink for three and a half seconds. The missing blink is the joke. One long slow blink to end.'),
  explore('comment-lid', 'Comment lid', 'Subtle. He looks right at you, holds a beat, then one lid drops and sags. A silent “really.”'),
  explore('bored', 'Bored of you', 'Subtle. He stares at you, pupils big, then loses interest: his gaze drifts up to the moon and his ears go slack.'),
  explore('slow-blink', 'Slow blink', 'Warm. What a cat does when it trusts you: soft curved lids, a smiling squint, a long hold. For the morning you got up.'),
  explore('sink', 'Sinks (betrayed)', 'The peek height is the emotion: he sinks until only his eyes are over the edge, ears flat. Reads from the outline at any size.'),
  explore('poke-twos', 'Poke, on twos', 'Today’s poke with the face held on twos. Compare it with Poke below.'),
  { id: 'arrive', label: 'Pops up', group: 'Comes and goes', mood: 'awake', hidden: true, run: (r) => r.setPresent(true),
    note: 'Home is picked: the lump runs in from the right, the covers strain, he launches out, lands and checks the room.' },
  { id: 'arrive-asleep', label: 'Rises asleep', group: 'Comes and goes', mood: 'asleep', hidden: true, run: (r) => r.setPresent(true),
    note: 'Home is picked at night: a slow push, he hauls himself through, looks round sadly and goes back to sleep.' },
  { id: 'leave', label: 'Ducks down', group: 'Comes and goes', run: (r) => r.setPresent(false),
    note: 'Leaving Home: he slides out of sight, ears folding, and the lump runs off to the right.' },
  { id: 'poke', label: 'Poke', group: 'Reactions', run: (r) => r.poke(),
    note: 'One tap: a flinch with his eyes squeezed shut, a double take, then a glare.' },
  { id: 'burrow', label: 'Burrow', group: 'Reactions', run: (r) => r.burrow(),
    note: 'Two taps: he dives under the covers, the lump takes a random route, and he bursts out furious. A new seed is a new route.' },
  habit('groggy', 'Nods off', 'Groggy, now and then: his head sinks, then he jolts awake.'),
  habit('asleep', 'Dream twitch', 'Asleep, now and then: a twitch and an ear flick.'),
  habit('smug', 'Smug blink', 'Smug, now and then: a slow satisfied blink and a head lift.'),
  habit('awake', 'Looks around', 'Awake, now and then: a look left, then right, with a double take.'),
  { id: 'blink', label: 'Blink', group: 'Little moves', run: (r) => r.blinkNow(), note: 'The eyes squash flat and bounce back open.' },
  { id: 'flick-l', label: 'Ear flick, left', group: 'Little moves', run: (r) => r.flick('L', -16), note: 'An idle ear flick.' },
  { id: 'flick-r', label: 'Ear flick, right', group: 'Little moves', run: (r) => r.flick('R', 16), note: 'An idle ear flick.' },
  { id: 'pop', label: 'Jelly pop', group: 'Little moves', run: (r) => r.pop(0.6), note: 'The eyeballs spring tall and wobble.' },
  { id: 'squash', label: 'Jelly squash', group: 'Little moves', run: (r) => r.pop(-0.5), note: 'The eyeballs squash wide and wobble.' },
  { id: 'kick', label: 'Body kick', group: 'Little moves', run: (r) => r.kick(-0.08), note: 'A jolt through the body; the head and ears follow through.' },
  ...MOODS.map((m): LocAction => ({
    id: `mood:${m}`, label: `To ${m}`, group: 'Mood changes', tail: 1200, run: (r) => r.setMood(m),
    note: `From the studio's mood to ${m}. Parts move in order: going to sleep the eyes close first, then he sinks.`,
  })),
  { id: 'idle', label: 'Idle', group: 'Idle', min: 10000, life: true, run: () => {},
    note: 'Ten seconds of nothing asked for: breathing, the weight shift, blinks, glances and the mood’s habit.' },
];

export type Take = {
  action: LocAction;
  mood: LocMood;
  seed: number;
  /** One snapshot per frame, taken before it's drawn. */
  frames: LocSnapshot[];
  channels: Record<LocChannel, number>[];
  /** What he said and when (his speech bubble's cues). */
  cues: { frame: number; cue: string }[];
  /** Frames before the action starts. */
  preroll: number;
};

const WARM = 30;
const PREROLL = 12;
const MAX = 15 * FPS;

/** Runs `fn` with Math.random replaced by a seeded generator (mulberry32). */
export function withSeed<T>(seed: number, fn: () => T): T {
  const real = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

/** Plays `action` on `rig` from a fresh start (`base`) and keeps every frame. */
export function record(rig: LocRig, base: LocSnapshot, action: LocAction, mood: LocMood, seed: number, life: boolean): Take {
  return withSeed(seed, () => {
    rig.restore(base);
    rig.quiet = !(life || action.life);
    const start = action.mood ?? mood;
    rig.place(!action.hidden, start);
    for (let i = 0; i < WARM; i++) rig.step(DT);
    const frames: LocSnapshot[] = [];
    const channels: Record<LocChannel, number>[] = [];
    const cues: Take['cues'] = [];
    const before = rig.onCue;
    rig.onCue = (cue) => cues.push({ frame: frames.length, cue });
    const grab = () => {
      rig.simulate(DT);
      frames.push(rig.snapshot());
      channels.push(rig.channels);
      rig.render(DT);
    };
    for (let i = 0; i < PREROLL; i++) grab();
    action.run(rig);
    const min = ((action.min ?? 0) / 1000) * FPS;
    const tail = ((action.tail ?? 500) / 1000) * FPS;
    let calm = 0;
    while (frames.length < MAX) {
      grab();
      calm = rig.busy ? 0 : calm + 1;
      if (calm >= tail && frames.length - PREROLL >= min) break;
    }
    rig.onCue = before;
    return { action, mood: start, seed, frames, channels, cues, preroll: PREROLL };
  });
}

/** Him at rest in `mood`, settled, with nothing playing. */
export function rest(rig: LocRig, base: LocSnapshot, mood: LocMood): LocSnapshot {
  return withSeed(1, () => {
    rig.restore(base);
    rig.quiet = true;
    rig.place(true, mood);
    for (let i = 0; i < 90; i++) rig.simulate(DT);
    return rig.snapshot();
  });
}

/** Key moments of the bits, for the model sheet. `ms` is after the action starts; `cue` counts from what he says. */
export const STILLS: { label: string; action: string; ms: number; cue?: string }[] = [
  { label: 'Poke: flinch', action: 'poke', ms: 70 },
  { label: 'Poke: double take', action: 'poke', ms: 450 },
  { label: 'Poke: glare', action: 'poke', ms: 1100 },
  { label: 'Pops up: straining', action: 'arrive', ms: 950 },
  { label: 'Pops up: launch', action: 'arrive', ms: 1095 },
  { label: 'Pops up: lands', action: 'arrive', ms: 1250 },
  { label: 'Pops up: checks the room', action: 'arrive', ms: 1600 },
  { label: 'Burrow: furious', action: 'burrow', ms: 300, cue: 'angry' },
  { label: 'Nods off', action: 'habit:groggy', ms: 1450 },
  { label: 'Jolts awake', action: 'habit:groggy', ms: 1700 },
  { label: 'Smug blink', action: 'habit:smug', ms: 600 },
  { label: 'Rises asleep: sad look', action: 'arrive-asleep', ms: 2250 },
  { label: 'Betrayed', action: 'mood:betrayed', ms: 450 },
];

/** The frame for a still in its take. */
export function stillFrame(take: Take, still: (typeof STILLS)[number]): number {
  const from = still.cue ? (take.cues.find((c) => c.cue === still.cue)?.frame ?? take.preroll) : take.preroll;
  return Math.min(take.frames.length - 1, from + Math.round((still.ms / 1000) * FPS));
}
