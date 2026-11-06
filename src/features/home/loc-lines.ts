/**
 * What Loc says in his speech bubble on Home (user, October 10, 2026: "build it like duolingo").
 * He only talks when something happens: a poke, popping back up from under the covers, coming
 * back to Home, or a moment Home tells him about.
 *
 * Rebuilt from his lore (user, November 2, 2026; docs/locs-lore, CANON only): he reports on his
 * own life instead of chasing jokes. Hint, never explain; the joke is always on him; cartoon
 * stakes only, never anything real about you. Short, no emoji. Running bits come back and move on
 * a little: Gerald, the fork, the letters, and every morning you get up counting for him.
 */
import type { LocMood } from './loc-rig';

/** What just happened, as the rig reports it (`LocRig.onCue`). */
export type LocCue = 'poke' | 'angry' | 'hello' | 'hide';

type Pool = readonly string[];

const POKE: Partial<Record<LocMood, Pool>> = {
  awake: [
    'Do I look like a raccoon to you',
    'Don’t poke a bear',
    'I’m not small. I’m early.',
    'I will end you. Sorry. Sorry.',
    'Careful. I’m wearing an ankle monitor.',
    'I’ve climbed three fences for less',
    'Touch me again. You go in my letter.',
    'I lived in a ceiling once. I could live in yours.',
    'I’ve been to court. You don’t scare me.',
    'That’s assault. Gerald would lose it for me.',
    'Hands off. I’m foraging.',
    'Toronto raccoons poke things. I’m above it.',
    'There’s a reason I’m not allowed at airports',
    'Don’t touch me. Don’t touch my fork.',
    'I am doom. Bear-shaped doom.',
  ],
  groggy: [
    'Bears don’t do mornings',
    'Wake me in spring',
    'I slept through every final. I can sleep through you.',
    'Get up. My sentence depends on it.',
    'Up. I need the good behaviour.',
    'Bears get first pick of the morning. Go.',
    'Morning. Gerald’s still playing dead.',
    'The pigeons are up. I hate the pigeons.',
    'Poke the alarm. Not the bear.',
  ],
  asleep: [
    'Lights out. I’d know. It’s court-ordered.',
    'I got bedtime for life. Now so do you.',
    'Shh. I’m hibernating.',
    'Your apps are asleep. You’re next.',
    'I was dreaming of six hundred puddings',
    'Mask on. Eyes shut. Like a bear.',
    'Bears don’t scroll',
  ],
};

const ANGRY: Pool = [
  'Gerald. GERALD. Sue them.',
  'This is a bear warning',
  'I will hibernate on you',
  'Sorry. I’m going to bite you. Sorry.',
  'You’re in my letter to the grizzly now',
  'I climbed three fences. I can climb you.',
  'This is going in my appeal',
  'My ankle monitor is beeping because of you',
  'I am doom',
  'Bin junkie behaviour. From you.',
];

const HELLO: Partial<Record<LocMood, Pool>> = {
  awake: [
    'Wrote to my brother again. He’s busy.',
    'No letter today. The mail is slow in bear prison.',
    'Gerald says hi. He’s a possum.',
    'Gerald says he’s appealing. Gerald is not appealing.',
    'Gerald’s working on my appeal. Gerald is asleep.',
    'I was not in your bin. I was foraging.',
    'My fork is perfectly balanced. My life is not.',
    'Paid rent. In syrup. Gerald took it.',
    'Measured myself today. Still early.',
    'Still no bears on Wall Street. Just a bull.',
    'There’s a reason I’m not allowed at airports',
  ],
  groggy: [
    'Morning. Bears don’t do these.',
    'I hibernated through finals. Mornings are worse.',
    'Gerald’s playing dead. Or asleep. Hard to tell.',
    'Get up. Each morning is a day off for me.',
    'I’m up. Under protest. And house arrest.',
  ],
};

/** Opening Home in the small hours (1 to 4 a.m.): he's on a curfew, so why are you up. */
const LATE: Pool = [
  'It’s 3 a.m. My ankle would be beeping.',
  'Even Gerald’s asleep. Gerald is always asleep.',
  'This is when the bin junkies come out',
  'The bears are asleep. Be like the bears.',
];

/** Something Home tells him about, said once per `key` (a night or a morning). */
export type LocMoment = { kind: MomentKind; key: string };
/**
 * The first three come from Home's clock; the rest from what Loc remembers about you
 * (lib/loc-mind.ts, docs/LOC_PERSONALITY.md), each said once.
 */
export type MomentKind =
  | 'bedtimeSoon'
  | 'appsAsleep'
  | 'wakeDone'
  | 'firstMorning'
  | 'roommate'
  | 'accomplice'
  | 'rideOrDie'
  | 'welcomeBack'
  | 'smallHours'
  | 'exitAfter'
  | 'wakeProud'
  | 'moonHint';

/**
 * A won morning is a day off his sentence (Gerald's advice: good behaviour gets you out early).
 * It isn't true, and he never finds out; a missed morning just doesn't count, it's never a debt.
 */
const MOMENTS: Record<MomentKind, Pool> = {
  bedtimeSoon: [
    'Lights out soon. Court’s orders. Mine, then yours.',
    'One hour. I’m getting my mask on.',
    'Bedtime soon. Gerald’s already out. Passed out.',
    'One hour. I’ll be checking. I can’t leave anyway.',
  ],
  appsAsleep: [
    'Your apps are on house arrest. Welcome.',
    'Apps asleep. Same curfew as me now.',
    'Your apps are hibernating. Correctly. Like bears.',
  ],
  wakeDone: [
    'You’re up. That’s a day off my sentence.',
    'Another day off. Gerald says. Gerald is asleep.',
    'Good behaviour. I’m counting.',
  ],
  firstMorning: ['First morning. First day off my sentence. Probably.', 'You got up. Gerald says that counts for me.'],
  roommate: ['Seven days off. I’m practically free.', 'A week. You’re a better roommate than Gerald.'],
  accomplice: ['Thirty days off. I wrote my brother about you.', 'Thirty. I told the grizzly. He’s busy, but he knows.'],
  // The grizzly's one and only reply (docs/locs-lore: once, tiny, confusing). Never anywhere else.
  rideOrDie: ['One hundred. The grizzly wrote back. It just says “who”.'],
  welcomeBack: ['You’re back. I told Gerald you got out early.', 'Oh. You’re alive. Gerald was drafting your will. Badly.'],
  smallHours: ['It’s 3 a.m. My monitor would beep. Why doesn’t yours.', 'These are hibernation hours. Leave.'],
  exitAfter: ['We don’t talk about this morning. Gerald’s orders.', 'I saw that. I’m not mad. It’s going in my letter.'],
  wakeProud: ['Again. At this rate I’m out by spring.', 'You keep getting up. Unsettling. Thank you.', 'Are YOU getting out early'],
  // Until you've tapped the moon once (Home): it opens your moons, where you change it.
  // Plain and informative (user, 2026-11-05): no jokes here.
  moonHint: ['Tap the moon to change it.', 'Tap the moon to pick a new one.'],
};

/** Five or more pokes in a short while. */
const STREAK: Pool = ['Gerald. Gerald, wake up. They won’t stop.', 'I’m documenting this for my appeal', 'I’ve been through a trial. This is worse.'];

/**
 * Back from the ultra zoomies, round the whole screen (loc-ultra.ts), tucked down terrified (user,
 * 2026-11-05): he's under house arrest, and he just left the house. The ankle monitor saw everything.
 */
const ULTRA: Pool = [
  'I left the house. I LEFT THE HOUSE.',
  'My monitor beeped. They’re coming.',
  'Nobody saw that. Tell Gerald nothing.',
  'That was over the fence. That’s a felony.',
];

/** His birthday: the day the mascot became a raccoon (September 23, 2026). He'd call it a bear's birthday. */
const BIRTHDAY: Pool = [
  'Birthday. Measured myself. Same as 2019.',
  'My birthday. The grizzly didn’t write. He’s busy.',
  'Gerald got me a fork. It’s heavy at the handle.',
  'Another year older. Still early.',
];
export const isLocBirthday = (now: Date) => now.getMonth() === 8 && now.getDate() === 23;

/** His line for a moment Home told him about, a poke streak, the ultra zoomies, or his birthday. */
export function locSpecial(kind: MomentKind | 'streak' | 'birthday' | 'ultra', random: () => number = Math.random): string {
  const pool = kind === 'streak' ? STREAK : kind === 'birthday' ? BIRTHDAY : kind === 'ultra' ? ULTRA : MOMENTS[kind];
  return draw(pool, random);
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
 * His line for `cue` in this mood, or null when he has nothing to say. `hour` is the
 * local hour: a hello between 1 and 4 a.m. comes from the small-hours lines.
 */
export function locLine(cue: LocCue, mood: LocMood, hour = 12, random: () => number = Math.random): string | null {
  const late = cue === 'hello' && hour >= 1 && hour < 5;
  const pool = cue === 'poke' ? POKE[mood] : cue === 'angry' ? ANGRY : late ? LATE : cue === 'hello' ? HELLO[mood] : undefined;
  return pool ? draw(pool, random) : null;
}
