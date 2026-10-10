/**
 * What Loc says in his speech bubble on Home (user, October 10, 2026: "build it like duolingo";
 * docs/LOC_LINES_INSPO.md; the lines were drafted in docs/LOC_LINES_DRAFT.md). He only talks
 * when something happens: a poke, popping back up from under the covers, coming back to Home,
 * or a moment Home tells him about.
 *
 * Unhinged (user, October 10, 2026: "stuff like I am doom, or I will eat ur dad", "I will steal
 * ur parakeets eggs", "theres a reason im not allowed at airports"): absurd, chaotic raccoon
 * menace, far louder than docs/VOICE.md's deadpan. Mild is weird, Grumpy is chaos, Unbearable
 * is full doom. Still short, no emoji. The menace is always cartoon nonsense (dads, parakeet
 * eggs, the moon, possum armies, airports), never anything real.
 */
import type { Tone } from '@/lib/tone';

import type { LocMood } from './loc-rig';

/** What just happened, as the rig reports it (`LocRig.onCue`). */
export type LocCue = 'poke' | 'angry' | 'hello' | 'hide';

type Pool = Record<Tone, readonly string[]>;

/**
 * His friend. Never explained, never seen, never given any context: he just brings them up now
 * and then (user, October 10, 2026: "constantly talk about someone as his friend but theres
 * never going to be any context for it"). A small share of lines, so it stays a gag. Unlike
 * Gerald, who at least is a possum lawyer, we never learn who this is.
 */
const FRIEND = 'Dennis';

const POKE: Partial<Record<LocMood, Pool>> = {
  awake: {
    mild: [
      `${FRIEND} says hi.`,
      'I contain at least three raccoons.',
      'I am a small god. Be gentle.',
      'I ate a battery today. Feeling zesty.',
      'My lawyer is a possum. Watch it.',
      'You poked a raccoon. Bold. Unwise.',
      'I have the reflexes of soup.',
      'Please. I’m fragile and made of crumbs.',
      'I’ve been awake for 9 years.',
    ],
    grumpy: [
      'I will eat your dad.',
      'I am doom. Fuzzy doom.',
      'I will steal your parakeet’s eggs.',
      'There’s a reason I’m not allowed at airports.',
      'No thoughts. Only hunger.',
      'I am the trash king. Kneel.',
      'Touch me again. I bite the moon.',
      'Gerald will hear about this.',
      'Peace was never an option.',
      'I have opened bins stronger than you.',
      'You know what happens now.',
      'I’m adding you to the list.',
      'I’m going to lick your charger.',
      `${FRIEND} would never do this.`,
      `Don’t tell ${FRIEND}.`,
      'I could fit in your walls.',
      'Do I look like a button.',
      'That’s assault in raccoon court.',
    ],
    unbearable: [
      `${FRIEND} was right about you.`,
      'I AM DOOM.',
      'I will eat your dad. And his car.',
      'Your parakeet’s eggs are mine now.',
      'I have seen the end. It’s Tuesday.',
      'I will unplug the sun.',
      'I’ve eaten worse than you.',
      'I will become a ghost just to bother you.',
      'Every poke, I eat one sock.',
      'I know what’s in your fridge.',
      'The possums are waiting for my signal.',
      'I bite. I bite so much.',
      'I will scream into your dryer vent.',
      'Do it again. I dare you. I double dare.',
      'My blood type is gravy.',
    ],
  },
  groggy: {
    mild: [
      'Morning. I ate a bee.',
      'Awake. Against my will. Again.',
      'The sun is lying to you.',
      'I am a puddle with ears.',
      'Five more minutes or I perish.',
    ],
    grumpy: [
      `${FRIEND} owes me a sock.`,
      'I will fight the sun. And win.',
      'Coffee or I eat your dad.',
      'Morning is a cult. I’m leaving.',
      'I woke up and chose violence.',
      'I have the energy of wet bread.',
      'The sun owes me forty dollars.',
      'Who let the morning in. I want names.',
      'Poke the alarm. Not me.',
      'The pigeons are up. I hate them.',
    ],
    unbearable: [
      'I AM THE DAWN OF DOOM.',
      'I swallowed the alarm. It’s fine.',
      'Bring me the pigeon. Alive.',
      'I will fistfight the sunrise. Hold my crumbs.',
      'I’m legally a ghost until noon.',
      'The sun must be stopped.',
      'I ate a sunrise once. Never again.',
    ],
  },
  asleep: {
    mild: [
      'Zzz. Dreaming of garbage.',
      'Shh. I’m becoming the void.',
      'Do not poke the void.',
      'I’m asleep. This is a hologram.',
    ],
    grumpy: [
      `Shh. ${FRIEND} is sleeping.`,
      'Go to bed or I eat your dad.',
      'I sleep. The void watches.',
      'It’s bedtime. I have teeth.',
      'Your apps are asleep. You’re next.',
      'I was dreaming of a bin with no lid.',
      'The moon says go to bed. I agree.',
    ],
    unbearable: [
      'SLEEP. OR BE SLEPT.',
      'I am the nightmare now.',
      'Bed. Or I move into your walls.',
      'Wake me again. I wake the ancients.',
      'I’m asleep. This is a recording. Leave.',
      'I sleep with one eye on your parakeet.',
    ],
  },
};

const ANGRY: Pool = {
  mild: [
    'Rude. I’m telling the moon.',
    'Evicted. From my own blanket.',
    'Cool. I’ll remember this forever.',
    'I had a whole life down there.',
  ],
  grumpy: [
    `I’m calling ${FRIEND}.`,
    'Oh, I’ll put you to sleep.',
    'I am doom.',
    'I will eat your dad.',
    'You have awakened the trash beast.',
    'I’m stealing your parakeet’s eggs. All of them.',
    'I’m going to scream in Latin.',
    'Gerald. Sue them.',
    'Peace was never an option.',
    'That’s it. I’m joining the pigeons.',
    'You’re on the list. In pen.',
    'I was comfortable. Past tense.',
  ],
  unbearable: [
    `This is for ${FRIEND}.`,
    'I AM DOOM INCARNATE.',
    'I will eat your dad. Then your uncle.',
    'Prepare your trash cans.',
    'Your bloodline is cancelled.',
    'I have summoned the possums.',
    'This means war. Bring snacks.',
    'I will haunt your Wi-Fi.',
    'I’m going to bite the moon. Watch me.',
  ],
};

const HELLO: Partial<Record<LocMood, Pool>> = {
  awake: {
    mild: [
      `I miss ${FRIEND}.`,
      'Oh. You. I ate a stick earlier.',
      'Hi. I’m plotting. Ignore it.',
      'Welcome back. The void says hi.',
      'I was just staring at the moon. Normal stuff.',
    ],
    grumpy: [
      `Have you seen ${FRIEND}.`,
      'You again. I hunger for dads.',
      'I am doom. Hello.',
      'Your parakeet looks nervous.',
      'I’m banned from three airports. Ask why.',
      'The moon blinked at me. I blinked back.',
      'I was not in your trash. Probably.',
      'Gerald says hi. He’s a possum.',
    ],
    unbearable: [
      `${FRIEND} and I are not speaking.`,
      'I licked the moon. It screamed.',
      'The possums have been informed.',
      'I am awake. The world trembles.',
      'I ate a wire. I can hear colors.',
      'I have plans for your parakeet.',
      'Welcome. I’ve rearranged your dad.',
    ],
  },
  groggy: {
    mild: [
      'Morning. The birds are lying.',
      'Rise and shine. Or don’t. Whatever.',
    ],
    grumpy: [
      'Good morning. The sun must die.',
      'I fought a pigeon. I won. Barely.',
      'Morning. I want your dad’s coffee.',
      'The sun is back. I filed a complaint.',
    ],
    unbearable: [
      'MORNING. I AM DOOM.',
      'I have eaten the sunrise.',
      'The pigeons know what they did.',
      'I’m awake. Someone will pay.',
    ],
  },
};

/** Opening Home in the small hours (1 to 4 a.m.): he has opinions. */
const LATE: Pool = {
  mild: ['It’s 3 a.m. The void and I were talking.', 'Oh. You’re up. The moon noticed.'],
  grumpy: [
    `${FRIEND} is up too. Concerning.`,
    'It’s 3 a.m. Why are we here.',
    'Go to bed or I eat your dad.',
    'The pigeons are asleep. Be like the pigeons.',
  ],
  unbearable: ['The void is busy. Go to bed.', 'IT IS THE HOUR OF DOOM.', 'I can see you. The moon can see you.'],
};

/** Something Home tells him about, said once per `key` (a night or a morning). */
export type LocMoment = { kind: 'bedtimeSoon' | 'appsAsleep' | 'wakeDone'; key: string };

const MOMENTS: Record<LocMoment['kind'], Pool> = {
  bedtimeSoon: {
    mild: ['Bedtime soon. I’m fluffing the void.', 'An hour till bed. The moon is stretching.'],
    grumpy: ['Bedtime soon. I’m sharpening my blanket.', 'One hour. Then I eat the apps.', 'Bedtime soon. Gerald is warming up.'],
    unbearable: ['One hour. Then the void.', 'BEDTIME APPROACHES. HIDE YOUR DAD.', 'The night is coming. So am I.'],
  },
  appsAsleep: {
    mild: ['Your apps are asleep. I read them a story.', 'Shh. The apps are sleeping.'],
    grumpy: [
      'Your apps are asleep. I tucked them in. Violently.',
      'The apps are asleep. Gerald is on guard.',
      'Apps asleep. Your parakeet is next.',
    ],
    unbearable: ['They’re asleep. I ate the lullaby.', 'The apps sleep. The void is fed.', 'ALL APPS HAVE BEEN SLEPT.'],
  },
  wakeDone: {
    mild: ['You did it. I’m mildly proud. Gross.', 'Morning done. I’m going back to bed.'],
    grumpy: ['You did it. I’m furious.', 'You got up. The pigeons are shook.', 'Morning beaten. The sun is crying.'],
    unbearable: [
      'You walked. The sun lost. Barely.',
      'YOU HAVE DEFEATED THE MORNING. I HATE IT.',
      'Victory. I will eat a celebratory dad.',
    ],
  },
};

/** Five or more pokes in a short while. */
const STREAK: Pool = {
  mild: ['Okay. That’s a lot of pokes.', 'I’m going to need a lawyer.'],
  grumpy: ['Keep going. I’m writing a will.', 'Gerald. Call the raccoon police.', 'I’ve lost count. And dignity.'],
  unbearable: [
    `${FRIEND}. They’re doing it again.`,
    'I’m giving your parakeet everything.',
    'FIVE POKES. I AM NOW A GHOST.',
    'This is how villains are made.',
  ],
};

/** His birthday: the day the mascot became a raccoon (September 23, 2026). */
const BIRTHDAY: Pool = {
  mild: ['It’s my birthday. I’d like a bin.', 'Birthday. I ate my own cake.'],
  grumpy: [
    `${FRIEND} forgot. Again.`,
    'It’s my birthday. I want a bin.',
    'Birthday. Gift me your dad.',
    'I’m a year older. Still feral.',
  ],
  unbearable: ['IT IS MY BIRTHDAY. BRING TRIBUTE.', 'Birthday. I demand parakeet eggs.', 'Another year of doom. Cake me.'],
};
export const isLocBirthday = (now: Date) => now.getMonth() === 8 && now.getDate() === 23;

/** His line for a moment Home told him about, a poke streak, or his birthday. */
export function locSpecial(kind: LocMoment['kind'] | 'streak' | 'birthday', tone: Tone, random: () => number = Math.random): string {
  const pool = kind === 'streak' ? STREAK : kind === 'birthday' ? BIRTHDAY : MOMENTS[kind];
  return draw(pool[tone], random);
}

/** How often he says hello when you come back to Home: rarely enough to stay a surprise. */
export const HELLO_CHANCE = 1 / 3;

// Shuffled bags, so a line doesn't come back until the rest of its pool has been said.
const bags = new Map<readonly string[], string[]>();
function draw(pool: readonly string[], random: () => number): string {
  let bag = bags.get(pool);
  if (!bag?.length) {
    bag = [...pool];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    bags.set(pool, bag);
  }
  return bag.pop()!;
}

/**
 * His line for `cue` in this mood and tone, or null when he has nothing to say. `hour` is the
 * local hour: a hello between 1 and 4 a.m. comes from the small-hours lines.
 */
export function locLine(cue: LocCue, mood: LocMood, tone: Tone, hour = 12, random: () => number = Math.random): string | null {
  const late = cue === 'hello' && hour >= 1 && hour < 5;
  const pool = cue === 'poke' ? POKE[mood] : cue === 'angry' ? ANGRY : late ? LATE : cue === 'hello' ? HELLO[mood] : undefined;
  return pool ? draw(pool[tone], random) : null;
}
