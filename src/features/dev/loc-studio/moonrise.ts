import { LOC_HEIGHT } from '@/features/home/loc-path';
import { LOC_TUNE, LOC_VIEW, type LocMood, type LocRig, type LocSnapshot } from '@/features/home/loc-rig';
import {
  CHAMPION, goalAt, lookUp, notice, PartsSim, paintParts, POSES, Score, settle, springUp, windUp, yell,
  type MouthStyle, type PartsFrame,
} from '@/features/home/loc-yell';

import { DT, withSeed } from './takes';

/**
 * The Loc studio's Moonrise section (user, October 27, 2026): 20 takes of him raising his head,
 * looking up, throwing his arms up to the sky and yelling the moon up. Studio only.
 *
 * How it's made:
 * - His head, eyes, ears, lean and shake are the real rig (loc-rig.ts), driven by a Bit, so they
 *   move with the rig's own springs and physics, exactly as he does in the app.
 * - The rig has no arms or mouth, so this file draws them on top, in his ink, riding his bones:
 *   two short, fluffy raccoon arms on two-bone IK (the paws traced into his outline lift off the
 *   ledge and become the hands), and a mouth on the head. Hands and mouth have their own springs,
 *   so they drag, overshoot and settle. Nothing here touches the rig or the app.
 * - Every take is written with the same few phases (notice, look up, wind up, arms up, yell,
 *   settle) at different timings, so the 20 differ in acting, not in drawing.
 */

type Vec = [number, number];
type Mat = [number, number, number, number, number, number];
const E = { out3: (t: number) => 1 - Math.pow(1 - t, 3) };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type { MouthStyle };

// ---- The 20 takes ----

export type MoonMove = {
  id: string;
  label: string;
  note: string;
  /** Always starts in this mood. */
  mood?: LocMood;
  score: Score;
};

function move(id: string, label: string, note: string, write: (s: Score) => void, mood?: LocMood): MoonMove {
  const s = new Score();
  write(s);
  return { id: `moon:${id}`, label, note, mood, score: s };
}

export const MOON_MOVES: MoonMove[] = [
  move('classic', 'The summons', 'The one to beat. A beat, eyes up, head up, a short wind-up, then both arms straight up and a full yell, eyes slammed shut. The moon starts up on the yell.', (s) => {
    notice(s, 200);
    lookUp(s, 380, 420);
    windUp(s, 1150, 190);
    springUp(s, 1340, 150);
    s.arms(1340, 1490, 'up', 1, 'out');
    s.rise = 1400;
    s.peak = 1700;
    yell(s, 1400, 2650);
    settle(s, 2900, 760);
  }),
  move('dawning', 'Slow dawning', 'Wonder first. His head comes up slowly, the eyes go huge, and his arms float up open-handed as if lifting it. Only at the top does it boil over into a yell.', (s) => {
    s.to('gy', 150, 450, -10, 'io');
    lookUp(s, 500, 1100, { y: -22, stretch: 0.08, open: 1.18, swell: 1.55, ear: 10 });
    s.arms(1100, 2300, 'reach', 0, 'io');
    s.to('lw', 1100, 2300, -10).to('rw', 1100, 2300, 10);
    s.pose(1700, 2300, { sink: -30, stretch: 0.12 }, 'io');
    s.rise = 1300;
    s.peak = 2650;
    yell(s, 2400, 3500, { open: 1.1, wide: 0.7, shake: 0.8 });
    s.arms(2400, 2520, 'v', 0.3, 'out');
    settle(s, 3750, 900);
  }),
  move('double-take', 'Double take', 'He glances up, back at you as if nothing happened, then snaps back up wide-eyed. The arms shoot up before the head has finished turning.', (s) => {
    s.to('gy', 200, 290, -24, 'out').to('gy', 520, 600, 4, 'out');
    s.at(560, (r) => r.blinkNow());
    s.at(980, (r) => r.pop(0.7));
    lookUp(s, 980, 220, { y: -22, gy: -30, open: 1.2, swell: 1.5, ear: 12 });
    springUp(s, 1240, 130);
    s.arms(1200, 1360, 'up', 1, 'out');
    s.rise = 1300;
    s.peak = 1600;
    yell(s, 1290, 2500);
    settle(s, 2700, 760);
  }),
  { id: 'moon:champion', label: 'Champion', note: 'Boxer at the bell. Up, then fists pumping overhead, left and right in turn, on every pump a yell. Big, proud, a bit much. In the app: his yell on the morning payoff (loc-yell.ts).', score: CHAMPION.score },
  move('howl', 'Howl', 'A wolf at the moon. Head right back, mouth a round O, arms out low and wide, eyes shut, one long howl that rises and fades. Ears go back slowly.', (s) => {
    lookUp(s, 250, 600, { y: -26, stretch: 0.1, gy: -30, ear: 4 });
    s.pose(800, 1100, { open: 0.5, openR: 0.5 }, 'io');
    s.arms(900, 1300, 'wide', 0.4, 'io');
    s.rise = 1150;
    s.peak = 2000;
    s.to('mo', 1100, 1500, 0.75, 'out').to('mw', 1100, 1300, 0, 'out').to('shout', 1100, 1700, 0.35, 'io');
    s.at(1100, (r) => { r.squeezing = true; });
    s.pose(1100, 2000, { earL: -20, earR: 20 }, 'io');
    s.pose(1300, 2400, { sink: -40, stretch: 0.16, y: -32 }, 'io');
    s.to('mo', 1500, 2700, 1, 'io').to('mo', 2700, 3300, 0.2, 'io');
    s.to('shout', 2700, 3200, 0, 'io');
    s.at(3200, (r) => { r.squeezing = false; r.pop(0.3); });
    settle(s, 3350, 900);
  }),
  move('lift', 'Lifts it up', 'The summoner. Palms open, he lifts slowly with real effort (shaking under the weight), the moon coming up with his hands. At the top he lets out the yell.', (s) => {
    lookUp(s, 200, 400, { ear: 4 });
    windUp(s, 700, 260, 18);
    s.to('lf', 700, 900, 0).to('rf', 700, 900, 0);
    s.to('lw', 700, 900, 20).to('rw', 700, 900, -20);
    s.arms(960, 2300, 'reach', 0, 'in');
    s.pose(960, 2300, { y: -20, stretch: 0.12, sink: -26 }, 'io');
    s.pose(960, 1200, { open: 0.45, openR: 0.4, squint: 0.4, slope: 10 }, 'io');
    s.shake(1000, 2300, 0.45, 70);
    s.rise = 1000;
    s.peak = 2600;
    yell(s, 2350, 3400, { wide: 0.95 });
    s.to('lw', 2350, 2450, 0).to('rw', 2350, 2450, 0);
    s.arms(2350, 2480, 'v', 0, 'out');
    settle(s, 3650, 800);
  }),
  move('rally', 'Rally from groggy', 'Starts half asleep. A heavy look up, a slow blink, it dawns on him, a full-body jolt awake, then the arms and the yell all at once.', (s) => {
    s.to('gy', 300, 900, -14, 'io');
    s.pose(300, 900, { y: 8, tilt: 4 }, 'io');
    s.at(1000, (r) => r.blinkNow());
    s.at(1500, (r) => { r.pop(0.9); r.flick('L', 18); r.flick('R', -18); });
    lookUp(s, 1500, 160, { y: -24, open: 1.25, swell: 1.6, ear: 14, tilt: 0 });
    springUp(s, 1700, 120);
    s.arms(1680, 1820, 'v', 1, 'out');
    s.rise = 1750;
    s.peak = 2000;
    yell(s, 1750, 2900);
    settle(s, 3100, 800);
  }, 'groggy'),
  move('pop', 'Pop up', 'Startled into it. A quick hop up off the ledge, arms flung up in a flail before they lock into a V, a yell mid-air, and a squashed landing.', (s) => {
    notice(s, 200);
    s.pose(380, 470, { y: 18, stretch: -0.14 }, 'io');
    lookUp(s, 470, 170, { y: -26, stretch: 0.22, open: 1.2, ear: 14 });
    s.pose(470, 640, { sink: -80 }, 'out');
    s.arms(470, 600, { L: [-20, 230], R: [880, 250] }, 0, 'out');
    s.arms(600, 760, 'v', 0.2, 'out');
    s.rise = 600;
    s.peak = 820;
    yell(s, 600, 1350, { open: 1.1, shake: 0.5 });
    s.pose(1350, 1520, { sink: 0, y: 22, stretch: -0.16 }, 'in');
    s.at(1520, (r) => r.pop(-0.6));
    s.arms(1350, 1520, 'half', 0.6, 'in');
    settle(s, 1600, 800);
  }),
  move('conductor', 'The conductor', 'Calm, deliberate. Arms rise in a big arc from the sides, hands open, held for a beat at the top, then the fists close and the yell comes on the downbeat.', (s) => {
    lookUp(s, 200, 500, { ear: 6, open: 1 });
    s.arms(500, 1000, 'wide', 0, 'io');
    s.arms(1000, 1600, 'v', 0, 'io');
    s.pose(1000, 1600, { y: -24, stretch: 0.1 }, 'io');
    s.to('lw', 1000, 1600, -12).to('rw', 1000, 1600, 12);
    s.pose(1100, 1600, { open: 0.5, openR: 0.5, smile: 0.4 }, 'io');
    s.to('lf', 1900, 1990, 1, 'out').to('rf', 1900, 1990, 1, 'out');
    s.to('lw', 1900, 1990, 0).to('rw', 1900, 1990, 0);
    s.pose(1900, 2000, { y: -6, stretch: 0.04 }, 'in');
    s.arms(1990, 2090, 'up', 1, 'out');
    s.rise = 2000;
    s.peak = 2250;
    yell(s, 2000, 3100, { shake: 0.8 });
    settle(s, 3300, 800);
  }),
  move('yawn', 'Yawn into a yell', 'Fits the morning. A huge stretching yawn, arms up and mouth open, that halfway through turns into a yell when he notices what he is doing.', (s) => {
    s.pose(200, 1000, { y: -10, stretch: 0.1 }, 'io');
    s.pose(200, 700, { open: 0.15, openR: 0.15, squint: 0.4 }, 'io');
    s.arms(300, 1200, 'v', 0.2, 'io');
    s.to('mo', 300, 1000, 0.65, 'io').to('mw', 300, 600, 0.15, 'io');
    s.to('gy', 300, 1000, -18, 'io');
    s.pose(300, 1000, { earL: -12, earR: 12 }, 'io');
    s.at(1300, (r) => r.pop(0.8));
    s.pose(1300, 1420, { open: 1.2, openR: 1.2, swell: 1.4, squint: 0.12 }, 'back');
    s.to('gy', 1300, 1380, -28, 'out');
    s.to('mo', 1300, 1380, 0.3, 'out');
    springUp(s, 1500, 140);
    s.arms(1500, 1620, 'up', 1, 'out');
    s.rise = 1550;
    s.peak = 1900;
    yell(s, 1550, 2700);
    settle(s, 2900, 800);
  }),
  move('hype', 'Hype bounces', 'Building it up. Three bounces on the ledge, each bigger, arms coming up a little more each time, and on the fourth he goes all the way and yells.', (s) => {
    lookUp(s, 150, 300, { ear: 6 });
    const heights: [number, Vec, Vec][] = [[10, [30, 420], [830, 430]], [16, [-10, 330], [870, 342]], [22, [-20, 250], [880, 262]]];
    heights.forEach(([d, L, R], i) => {
      const t = 500 + i * 300;
      s.pose(t, t + 120, { y: d, stretch: -0.08 }, 'in');
      s.pose(t + 120, t + 280, { y: -10 - i * 4, stretch: 0.06 }, 'out');
      s.arms(t, t + 150, { L, R }, 1, 'io');
    });
    windUp(s, 1400, 150, 28);
    springUp(s, 1550, 130, { sink: -46 });
    s.arms(1550, 1690, 'up', 1, 'out');
    s.rise = 1600;
    s.peak = 1900;
    yell(s, 1600, 2800);
    settle(s, 3000, 800);
  }),
  move('one-two', 'One, two', 'Arm by arm. Left goes up and stays, he checks it, the right follows, then a beat of both up before the yell. Methodical, a little smug.', (s) => {
    lookUp(s, 200, 360, { ear: 6, open: 0.9 });
    s.arms(700, 880, 'up', 1, 'out', 'L');
    s.to('gx', 950, 1050, -20, 'out').to('gx', 1300, 1380, 0, 'io');
    s.arms(1400, 1580, 'up', 1, 'out', 'R');
    s.to('gx', 1450, 1550, 20, 'out').to('gx', 1800, 1880, 0, 'io');
    s.pose(1650, 1900, { open: 0.45, openR: 0.55, smile: 0.5, slope: -6 }, 'io');
    springUp(s, 2050, 130);
    s.rise = 2050;
    s.peak = 2350;
    yell(s, 2050, 3100);
    settle(s, 3300, 800);
  }, 'smug'),
  move('defiant', 'Shakes his fist', 'Not asking. A glare up at the sky, one fist up and shaking at it, the other paw keeps its grip. Yells like he is telling it off.', (s) => {
    s.to('gy', 200, 320, -24, 'out');
    s.pose(200, 500, { y: -12, open: 0.6, openR: 0.6, slope: 12, squint: 0.3, swell: 0.7 }, 'io');
    s.pose(200, 500, { earL: -14, earR: 14 }, 'io');
    s.arms(600, 760, { L: POSES.rest.L, R: [830, 150] }, 1, 'out', 'R');
    s.rise = 800;
    s.peak = 1250;
    s.to('mo', 800, 880, 0.95, 'out').to('mw', 800, 880, 1, 'out').to('shout', 800, 900, 1, 'out');
    for (let i = 0; i < 6; i++) {
      const t = 820 + i * 160;
      s.to('ry', t, t + 80, 110, 'out').to('ry', t + 80, t + 160, 170, 'in');
    }
    s.shake(820, 1800, 0.6);
    s.to('mo', 1780, 1900, 0.2).to('shout', 1700, 1800, 0);
    settle(s, 2000, 800);
  }),
  move('deadpan', 'Deadpan V', 'Rationed silliness. He snaps into a perfect V and yells, but the face never changes: flat lids, small pupils, dead still. Then down as if it never happened.', (s) => {
    s.pose(300, 360, { y: -20, stretch: 0.08 }, 'out');
    s.arms(300, 360, 'v', 1, 'out');
    s.pose(300, 360, { open: 0.5, openR: 0.5, swell: 0.6, swellR: 0.6, slope: 2 }, 'out');
    s.rise = 360;
    s.peak = 1000;
    s.to('mo', 600, 640, 0.9, 'out').to('mw', 600, 640, 1, 'out');
    s.to('mo', 2000, 2040, 0, 'out');
    s.at(2300, (r) => r.blinkNow());
    s.arms(2500, 2560, 'rest', 1, 'in');
    s.pose(2500, 2560, { y: 'T', stretch: 0 }, 'in');
    settle(s, 2600, 500);
  }),
  move('launch', 'Big wind-up', 'Pure squash and stretch. He sinks right down until only his eyes clear the ledge, holds, then launches up taller than ever, arms straight up, and yells.', (s) => {
    lookUp(s, 200, 300, { ear: 6 });
    s.pose(600, 1100, { sink: 220, y: 20, stretch: -0.1 }, 'io');
    s.arms(600, 900, { L: [67, 600], R: [748, 600] }, 1, 'io');
    s.pose(600, 1000, { open: 1, openR: 1, swell: 1.3 }, 'io');
    s.pose(1250, 1420, { sink: -60, y: -34, stretch: 0.24 }, 'out');
    s.arms(1250, 1400, 'up', 1, 'out');
    s.rise = 1350;
    s.peak = 1650;
    yell(s, 1350, 2600);
    settle(s, 2800, 800);
  }),
  move('tiny', 'Tiny yell', 'Small and cute. Little arms only halfway up, a small round mouth, a short squeak of a yell, then a proud little settle with a smile.', (s) => {
    lookUp(s, 200, 340, { y: -10, ear: 10, swell: 1.5 });
    s.arms(700, 820, { L: [10, 300], R: [850, 312] }, 0.3, 'out');
    s.pose(700, 820, { y: -18, stretch: 0.06 }, 'out');
    s.rise = 760;
    s.peak = 1000;
    yell(s, 760, 1300, { open: 0.55, wide: 0.15, shake: 0.35, ears: 10 });
    s.pose(1400, 1700, { smile: 0.7, open: 0.4, openR: 0.4 }, 'io');
    settle(s, 1900, 700);
  }),
  move('breath', 'Deep breath', 'A big breath in (he swells, rises, arms lift slowly), a held beat at the top, then he lets it all out in one long yell.', (s) => {
    lookUp(s, 200, 400, { ear: 6 });
    s.pose(700, 1500, { stretch: 0.14, y: -18, sink: -20, lean: 0.12 }, 'io');
    s.arms(700, 1500, 'half', 1, 'io');
    s.pose(700, 1500, { open: 0.55, openR: 0.55 }, 'io');
    s.pose(700, 1500, { earL: 12, earR: -12 }, 'io');
    s.pose(1700, 1790, { lean: 0, stretch: 0.2 }, 'out');
    s.arms(1700, 1820, 'up', 1, 'out');
    s.rise = 1700;
    s.peak = 2100;
    yell(s, 1700, 3200, { open: 1.15 });
    settle(s, 3400, 800);
  }),
  move('echo', 'Echo', 'Three yells, each smaller, like an echo coming back off the sky: arms high, then lower, then barely up. He listens to the last one.', (s) => {
    lookUp(s, 200, 360, { ear: 6 });
    springUp(s, 700, 130);
    s.arms(680, 820, 'up', 1, 'out');
    s.rise = 760;
    s.peak = 1000;
    yell(s, 760, 1500);
    s.arms(1550, 1700, 'half', 1, 'io');
    s.pose(1550, 1700, { y: -16, stretch: 0.06, sink: -12 }, 'io');
    yell(s, 1700, 2250, { open: 0.7, shake: 0.55, ears: 16 });
    s.arms(2300, 2450, 'wide', 0.6, 'io');
    s.pose(2300, 2450, { y: -6, stretch: 0.02, sink: 0 }, 'io');
    yell(s, 2450, 2800, { open: 0.4, wide: 0.3, shake: 0.25, ears: 8 });
    s.pose(2900, 3100, { earL: 14, earR: -14 }, 'out');
    s.to('gx', 2900, 3000, 18, 'out');
    settle(s, 3700, 800);
  }),
  move('reach', 'Reaches for it', 'Up on tiptoe, straining for the moon: arms at full stretch, fingers wiggling, eyes huge. It rises toward him and he yells with delight.', (s) => {
    lookUp(s, 200, 420, { y: -20, ear: 10, swell: 1.5, open: 1.15 });
    s.arms(600, 1100, 'reach', 0, 'io');
    s.pose(600, 1300, { sink: -56, stretch: 0.16, y: -26 }, 'io');
    for (let i = 0; i < 6; i++) {
      const t = 1100 + i * 110;
      s.to('lf', t, t + 55, 0.35).to('lf', t + 55, t + 110, 0);
      s.to('rf', t + 30, t + 85, 0.35).to('rf', t + 85, t + 140, 0);
    }
    s.shake(1100, 1800, 0.3, 80);
    s.rise = 900;
    s.peak = 2100;
    yell(s, 1900, 3000, { squeeze: false, wide: 0.6, shake: 0.6 });
    s.pose(2950, 3150, { smile: 0.6 }, 'io');
    settle(s, 3200, 900);
  }),
  move('unhinged', 'Unhinged', 'Rationed crazy. A cut to mismatched pupils and a lean in at you, then the head snaps up, arms rigid, and a long shaking scream with the eyes wide open. Then a blink, and nothing happened.', (s) => {
    s.pose(200, 230, { lean: 0.25, swellR: 0.45, swell: 1.4, open: 1.15, openR: 1, slope: 0 }, 'out');
    s.at(900, (r) => r.flick('R', 20));
    s.pose(1000, 1060, { lean: 0 }, 'out');
    lookUp(s, 1000, 90, { y: -28, stretch: 0.14, gy: -30, open: 1.25, ear: 2 });
    s.arms(1000, 1080, 'up', 0, 'out');
    s.to('lw', 1000, 1080, -18).to('rw', 1000, 1080, 18);
    s.rise = 1080;
    s.peak = 1500;
    yell(s, 1080, 2600, { squeeze: false, open: 1.2, wide: 1, shake: 1.4, ears: 34 });
    s.at(2700, (r) => r.blinkNow());
    s.arms(2700, 2760, 'rest', 1, 'in');
    s.pose(2700, 2760, { swellR: 1, swell: 1 }, 'in');
    settle(s, 2780, 500);
  }),
];

// ---- Recording ----

export type MoonTake = {
  move: MoonMove;
  frames: LocSnapshot[];
  parts: PartsFrame[];
  preroll: number;
};

const WARM = 30;
const PREROLL = 12;
const MAX = 12 * 60;

/** Plays a move from a fresh start and keeps every frame: the rig's snapshot and the parts. */
export function recordMoon(rig: LocRig, base: LocSnapshot, m: MoonMove, mood: LocMood, upTo = Infinity): MoonTake {
  return withSeed(7, () => {
    rig.restore(base);
    rig.quiet = true;
    rig.place(true, m.mood ?? mood);
    for (let i = 0; i < WARM; i++) rig.simulate(DT);
    const sim = new PartsSim();
    const frames: LocSnapshot[] = [], parts: PartsFrame[] = [];
    const grab = (ms: number | null) => {
      rig.simulate(DT);
      sim.step(DT, ms === null ? {} : goalAt(m.score, ms));
      frames.push(rig.snapshot());
      parts.push(sim.frame());
    };
    for (let i = 0; i < PREROLL; i++) grab(null);
    rig.playBit(m.score.bit());
    let ms = 0, calm = 0;
    while (frames.length < MAX && ms <= upTo) {
      ms += DT * 1000;
      grab(ms);
      calm = !rig.busy && sim.settled && ms > m.score.end ? calm + 1 : 0;
      if (calm >= 24) break;
    }
    return { move: m, frames, parts, preroll: PREROLL };
  });
}

/** The frame `ms` into the move. */
export const frameAt = (take: MoonTake, ms: number) => Math.min(take.frames.length - 1, take.preroll + Math.round((ms / 1000) * 60));

/** How far up the moon is in this frame, 0 (out of sight) to 1. */
export function moonUp(take: MoonTake, frame: number, mode: MoonMode) {
  if (mode === 'none') return -1;
  if (mode === 'up') return 1;
  const ms = ((frame - take.preroll) / 60) * 1000 - take.move.score.rise;
  return E.out3(clamp(ms / RISE_MS, 0, 1));
}
export type MoonMode = 'rises' | 'up' | 'none';
/** How long the moon takes to come up. */
const RISE_MS = 1700;

// ---- Drawing ----

/** The rig's view (its private `view()`, copied): rig units to canvas pixels. */
export function viewOf(cw: number, ch: number, share: number): Mat {
  const s = (cw * share) / LOC_VIEW.width;
  return [s, 0, 0, s, (cw - cw * share) / 2 - LOC_VIEW.x * s, ch - LOC_HEIGHT * s];
}

/** The insides the drawing needs (studio only): where his bones are this frame, and his ink. */
type Insides = { bones: Mat[]; head: Mat; inkHex: string };

/** Draws the arms and mouth for `parts` over the rig's frame, which must already be rendered on `canvas`. */
export function drawParts(rig: LocRig, canvas: HTMLCanvasElement, share: number, parts: PartsFrame, style: MouthStyle) {
  const { bones, head, inkHex } = rig as unknown as Insides;
  if (!bones?.length) return;
  const view = viewOf(canvas.width, canvas.height, share);
  const ledgePx = Math.min(canvas.height, Math.round(view[5] + LOC_HEIGHT * view[0]));
  paintParts(canvas.getContext('2d')!, view, ledgePx, bones, head, inkHex, LOC_TUNE.eyeWhite, parts, style, true);
}

// ---- The backdrop: night sky, the moon coming up behind him, the strip ----

const SKY = '#11131C';
const MOON = '#D8D5E2';
const STRIP = '#000000';

/** `up` 0..1 is the moon's rise (-1: no moon). `ledge` is his canvas's bottom; `size` his width. */
export function paintSky(ctx: CanvasRenderingContext2D, w: number, h: number, ledge: number, size: number, strip: number, up: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, w, h);
  if (up >= 0) {
    const r = size * 0.62, top = ledge - size * 0.32, bottom = ledge + r + 2;
    ctx.fillStyle = MOON;
    ctx.beginPath();
    ctx.arc(w / 2, bottom + (top - bottom) * up, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (strip > 0) {
    ctx.fillStyle = STRIP;
    ctx.fillRect(0, ledge, w, Math.max(strip, h - ledge));
  }
}

