/**
 * What Loc says in his speech bubble on Home (user, October 10, 2026: "build it like duolingo";
 * docs/LOC_LINES_INSPO.md; the lines were drafted in docs/LOC_LINES_DRAFT.md). He only talks
 * when something happens: a poke, popping back up from under the covers, coming back to Home,
 * or a moment Home tells him about.
 *
 * Unhinged (user, October 10, 2026: "stuff like I am doom, or I will eat ur dad", "I will steal
 * ur parakeets eggs", "theres a reason im not allowed at airports"): absurd, chaotic raccoon
 * menace, far louder than docs/VOICE.md's deadpan. Still short, no emoji. The menace is always cartoon nonsense (dads, parakeet
 * eggs, the moon, possum armies, airports), never anything real.
 */
import type { LocMood } from './loc-rig';

/** What just happened, as the rig reports it (`LocRig.onCue`). */
export type LocCue = 'poke' | 'angry' | 'hello' | 'hide';

type Pool = readonly string[];

/**
 * His friend. Never explained, never seen, never given any context: he just brings them up now
 * and then (user, October 10, 2026: "constantly talk about someone as his friend but theres
 * never going to be any context for it"). A small share of lines, so it stays a gag. Unlike
 * Gerald, who at least is a possum lawyer, we never learn who this is.
 */
const FRIEND = 'Dennis';

const POKE: Partial<Record<LocMood, Pool>> = {
  awake: [
    'I will eat your dad',
    'I am doom. Fuzzy doom.',
    'I will steal your parakeet’s eggs',
    'There’s a reason I’m not allowed at airports',
    'No thoughts. Only hunger.',
    'I am the trash king. Kneel.',
    'Touch me again. I bite the moon.',
    'We are going to steal the moooooon',
    'Gerald will hear about this',
    'Peace was never an option',
    'I have opened bins stronger than you',
    'You know what happens now',
    'I’m adding you to the list',
    'I’m going to lick your charger',
    `${FRIEND} would never do this`,
    `Don’t tell ${FRIEND}`,
    'I could fit in your walls',
    'Do I look like a button',
    'That’s assault in raccoon court',
  ],
  groggy: [
    `${FRIEND} owes me a sock`,
    'I will fight the sun. And win.',
    'Coffee or I eat your dad',
    'Morning is a cult. I’m leaving.',
    'I woke up and chose violence',
    'I have the energy of wet bread',
    'The sun owes me forty dollars',
    'Who let the morning in. I want names.',
    'Poke the alarm. Not me.',
    'The pigeons are up. I hate them.',
  ],
  asleep: [
    `Shh. ${FRIEND} is sleeping.`,
    'Go to bed or I eat your dad',
    'I sleep. The void watches.',
    'It’s bedtime. I have teeth.',
    'Your apps are asleep. You’re next.',
    'I was dreaming of a bin with no lid',
    'The moon says go to bed. I agree.',
  ],
};

const ANGRY: Pool = [
  `I’m calling ${FRIEND}`,
  'Oh, I’ll put you to sleep',
  'I am doom',
  'I will eat your dad',
  'You have awakened the trash beast',
  'I’m stealing your parakeet’s eggs. All of them.',
  'I’m going to scream in Latin',
  'Gerald. Sue them.',
  'Peace was never an option',
  'That’s it. I’m joining the pigeons.',
  'You’re on the list. In pen.',
  'I was comfortable. Past tense.',
];

const HELLO: Partial<Record<LocMood, Pool>> = {
  awake: [
    `Have you seen ${FRIEND}`,
    'You again. I hunger for dads.',
    'I am doom. Hello.',
    'Your parakeet looks nervous',
    'I’m banned from three airports. Ask why.',
    'The moon blinked at me. I blinked back.',
    'I was not in your trash. Probably.',
    'Gerald says hi. He’s a possum.',
  ],
  groggy: [
    'Good morning. The sun must die.',
    'I fought a pigeon. I won. Barely.',
    'Morning. I want your dad’s coffee.',
    'The sun is back. I filed a complaint.',
  ],
};

/** Opening Home in the small hours (1 to 4 a.m.): he has opinions. */
const LATE: Pool = [
  `${FRIEND} is up too. Concerning.`,
  'It’s 3 a.m. Why are we here.',
  'Go to bed or I eat your dad',
  'The pigeons are asleep. Be like the pigeons.',
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
  | 'wakeProud';

const MOMENTS: Record<MomentKind, Pool> = {
  bedtimeSoon: [
    'Bedtime soon. I’m sharpening my blanket.',
    'One hour. Then I eat the apps.',
    'Bedtime soon. Gerald is warming up.',
    'One hour. Then we steal the moooooon.',
  ],
  appsAsleep: [
    'Your apps are asleep. I tucked them in. Violently.',
    'The apps are asleep. Gerald is on guard.',
    'Apps asleep. Your parakeet is next.',
  ],
  wakeDone: ['You did it. I’m furious.', 'You got up. The pigeons are shook.', 'Morning beaten. The sun is crying.'],
  // What he remembers (lib/loc-mind.ts). Never a dig at you: the doom is aimed at the world.
  firstMorning: ['First morning. I’m telling everyone. Nobody listens to me.', 'You did a morning. I’ve updated my files.'],
  roommate: ['Seven mornings. Fine. We’re roommates. My half is all of it.', 'A week. I’ve stopped plotting against you. Mostly.'],
  accomplice: ['Thirty mornings. We’re accomplices. Crimes TBD.', 'Thirty. The pigeons are scared of you now.'],
  rideOrDie: ['A hundred mornings. Ride or die. Mostly ride.', 'One hundred. I fear you now.'],
  welcomeBack: ['Oh. You’re alive. I already sold your bed.', 'You’re back. I told Gerald you died. Awkward.'],
  smallHours: ['It is 3am. I am doom. Go to bed.', 'This is my hour. Leave.', 'The small hours. Nobody good is up.'],
  exitAfter: ['We don’t talk about this morning', 'I saw what happened. I’m not mad. I’m writing it down.'],
  wakeProud: ['Who ARE you', 'Again. I fear you now.', 'You keep getting up. It’s unsettling.'],
};

/** Five or more pokes in a short while. */
const STREAK: Pool = ['Keep going. I’m writing a will.', 'Gerald. Call the raccoon police.', 'I’ve lost count. And dignity.'];

/** Back from the ultra zoomies, round the whole screen (loc-ultra.ts): dazed, changed. */
const ULTRA: Pool = ['I touched the ceiling. I am changed.', 'I lapped your phone. Get me a medal.', 'Five. You did five. I saw God.'];

/** His birthday: the day the mascot became a raccoon (September 23, 2026). */
const BIRTHDAY: Pool = [
  `${FRIEND} forgot. Again.`,
  'It’s my birthday. I want a bin.',
  'Birthday. Gift me your dad.',
  'I’m a year older. Still feral.',
];
export const isLocBirthday = (now: Date) => now.getMonth() === 8 && now.getDate() === 23;

/**
 * Movie and TV lines, bent to fit a raccoon (user, October 10, 2026: "really funny movie and tv
 * show quotes"). Said only now and then (`QUOTE_CHANCE`) so they land as a surprise. A few words, never a scene.
 */
const QUOTE_CHANCE = 1 / 5;

const QUOTES = {
  poke: {
    awake: [
      'Say hello to my little paw', // Scarface
      'You talkin’ to me?', // Taxi Driver
      'I’m in danger', // The Simpsons
      'Why are you the way that you are?', // The Office
      'SQUIRREL!', // Up
      'Is mayonnaise an instrument?', // SpongeBob
      'Nobody puts Loc in a corner', // Dirty Dancing
      'My name is Loc. You poked my father. Prepare to die.', // The Princess Bride
      'I have a very particular set of skills. Mostly bins.', // Taken
      'I am inevitable', // Avengers: Endgame
      'Cool cool cool cool cool. No doubt no doubt.', // Brooklyn Nine-Nine
      'No soup for you', // Seinfeld
      'You are a sad, strange little man', // Toy Story
      'Nobody expects the raccoon inquisition', // Monty Python
      'Raccoons are like onions. We make you cry.', // Shrek
      'I am speed. I am soup.', // Cars
    ],
    groggy: [
      'Stop trying to make mornings happen', // Mean Girls
      'I’m not even supposed to be here today', // Clerks
      'I’m ready! I’m ready! I’m not ready.', // SpongeBob
      'Wake up, Neo. Actually, don’t.', // The Matrix
    ],
    asleep: [
      'You shall not scroll', // The Lord of the Rings
      'Go sleep with the fishes', // The Godfather
      'Bedtime is coming', // Game of Thrones
    ],
  },
  angry: [
    'WHAT ARE YOU DOING IN MY SWAMP', // Shrek
    'MY CABBAGES!', // Avatar: The Last Airbender
    'WE WERE ON A BREAK', // Friends
    'Your mother was a hamster', // Monty Python and the Holy Grail
    'No, God! Please, no! NOOOOO!', // The Office
    'I drink your milkshake', // There Will Be Blood
    'You’ve made a huge mistake', // Arrested Development
    'Some of you may die. A sacrifice I’m willing to make.', // Shrek
    'I’ll be back', // The Terminator
  ],
  hello: {
    awake: [
      'Hello there', // Star Wars
      'How you doin’?', // Friends
      'Hi Barbie', // Barbie
      'Hello, Clarice', // The Silence of the Lambs
      'Look at me. I’m the captain now.', // Captain Phillips
      'Everything the moon touches is my trash', // The Lion King
    ],
    groggy: [
      'Good morning! And in case I don’t see ya, good night.', // The Truman Show
      'Bueller? Bueller?', // Ferris Bueller's Day Off
      'It’s Groundhog Day. Again.', // Groundhog Day
    ],
  },
  late: [
    'We all scroll down here', // It
    'They’re heeere', // Poltergeist
    'Heeere’s Loccy!', // The Shining
  ],
  bedtimeSoon: [
    'One does not simply put down the phone', // The Lord of the Rings
    'Brace yourself. Bedtime is coming.', // Game of Thrones
  ],
  appsAsleep: [
    'I see dead apps', // The Sixth Sense
    'These aren’t the apps you’re looking for', // Star Wars
    'Leave the phone. Take the cannoli.', // The Godfather
  ],
  wakeDone: [
    'Ka-chow', // Cars
    'Houston, we have a morning', // Apollo 13
    'Yes, chef', // The Bear
  ],
  streak: [
    'SERENITY NOW!', // Seinfeld
    'I DECLARE BANKRUPTCY', // The Office
    'NOT THE BEES!', // The Wicker Man
    'Somebody stop me!', // The Mask
  ],
  birthday: ['It’s my birthday. Treat yo self.'], // Parks and Recreation
  ultra: [
    'I’m the king of the world!', // Titanic
    'I feel the need. The need for speed.', // Top Gun
  ],
} satisfies Record<string, readonly string[] | Partial<Record<LocMood, readonly string[]>>>;

/** One of his lines from `pool`, or now and then a movie or TV line from `quotes`. */
function say(pool: readonly string[], quotes: readonly string[] | undefined, random: () => number): string {
  return quotes?.length && random() < QUOTE_CHANCE ? draw(quotes, random) : draw(pool, random);
}

/** His line for a moment Home told him about, a poke streak, the ultra zoomies, or his birthday. */
export function locSpecial(kind: MomentKind | 'streak' | 'birthday' | 'ultra', random: () => number = Math.random): string {
  const pool = kind === 'streak' ? STREAK : kind === 'birthday' ? BIRTHDAY : kind === 'ultra' ? ULTRA : MOMENTS[kind];
  return say(pool, (QUOTES as unknown as Partial<Record<string, readonly string[]>>)[kind], random);
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
  if (!pool) return null;
  const quotes =
    cue === 'poke'
      ? (QUOTES.poke as Partial<Record<LocMood, readonly string[]>>)[mood]
      : cue === 'angry'
        ? QUOTES.angry
        : late
          ? QUOTES.late
          : (QUOTES.hello as Partial<Record<LocMood, readonly string[]>>)[mood];
  return say(pool, quotes, random);
}
