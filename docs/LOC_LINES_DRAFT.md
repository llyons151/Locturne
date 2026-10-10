# Loc's lines: big draft

2026-10-10. User: "draft like a ton pull from sources", then "put them all in the app", then "wire the other
cues too". Everything below ships in `src/features/home/loc-lines.ts`, including the "Cues we don't have yet"
table, which is now wired:
- **Bedtime soon, apps asleep, wake-up done:** Home works these out (`moment` in `home-screen.tsx`). He says each one
  once per night or morning, on his hello or the moment it starts while he's on screen.
- **Poke streak:** the fifth poke within 30 s.
- **Birthday:** September 23, the day the mascot became a raccoon. Change it in `isLocBirthday`.
- **3 a.m. hello:** 1 to 4 a.m.
Each of these got a few extra lines per tone.

Tone tags: **M** Mild (weird), **G** Grumpy (chaos, the default), **U** Unbearable (full doom, caps allowed).
Every line is original. The sources set the shape, not the words.

## What the sources say works

- **Running storylines beat one-off jokes.** Duolingo's owl had a lopsided feud with Google Translate, a fixation
  on Dua Lipa, and fights with the company's own lawyers. Recurring gags made followers feel like insiders
  ([The Hustle](https://thehustle.co/how-duolingo-struck-social-gold-by-going-unhinged)). **For Loc:** give him a
  small cast he keeps bringing up (below), so a new line pays off an old one.
- **Passive menace is as funny as direct menace.** The owl swings between "You know what happens now" and "Do it,
  you vermin" ([UWGB Driftwood](https://blog.uwgb.edu/driftwood/?p=2324)). The fake threatening notification is a
  whole meme genre ([Fast Company](https://www.fastcompany.com/90963949/duolingo-duo-owl-gen-z-obsessed)).
- **The raccoon personas people already love:** the trickster and rebel, the villain ("Evil Plotting Raccoon"),
  the survivor living off trash, and the beater of "raccoon-proof" bins
  ([Hyperallergic](https://hyperallergic.com/raccoons-in-memes/)).
- **Possum-adjacent energy:** a devious, angry outsider that eats anything and hisses at the sun
  ([Daily Dot](https://dailydot.com/possum-memes), [Know Your Meme](https://knowyourmeme.com/memes/subcultures/possums)).
- **"Peace was never an option":** the Untitled Goose Game meme, where a small animal declares total war over
  nothing ([Know Your Meme](https://knowyourmeme.com/memes/31220), [ACMI](https://www.acmi.net.au/stories-and-ideas/untitled-goose-player-comedians/)).
- **Gen Z absurdism:** no setup, no punchline, surreal non sequiturs. One study found absurdist content rated
  funnier by Gen Z students ([JSR](https://jsr.org/hs/index.php/path/article/view/2011)).
- **Guardrail:** unhinged works when it grows out of a clear character, and falls flat when it feels pre-approved
  or random-for-random's-sake ([Pulsar](https://www.pulsarplatform.com/blog/2025/does-unhinged-marketing-work-and-can-anyone-do-it-from-utter-nutter-butter-chaos-to-duolingo-death),
  [Metricool](https://metricool.com/unhinged-marketing/)). Loc's core stays the same: tired, nocturnal, hates
  mornings, secretly on your side.

## Loc's cast (running gags)

| Gag | Who or what | Why it's funny |
|---|---|---|
| **Your dad** | His favorite threat target. He's never met him. | "I will eat your dad" escalates forever: dad, uncle, the dad's car. |
| **Your parakeet** | He's obsessed with its eggs. You may not own a parakeet. That doesn't matter. | Specific, weird, user-supplied. |
| **The Sun** | Mortal enemy. Owes him money. | Fits his nocturnal, anti-morning core. |
| **The Moon** | His landlord, lover or rival depending on the day. | It's literally behind him on Home. |
| **Gerald** | His lawyer, a possum. Mostly useless. | Duolingo's lawyer feud, raccoon edition. |
| **The Pigeons** | A rival gang. He keeps losing fights to them. | He's menacing but bad at it. |
| **Airports** | He's banned from several. Never explains. | The user's own line. |
| **The Bin Lid** | The one bin he couldn't open. His white whale. | The "raccoon-proof bin" meme. |
| **The Void** | He talks to it. It talks back. | Night, sleep, absurdism. |

## Poke, awake

- M: I contain at least three raccoons.
- M: I am a small god. Be gentle.
- M: I ate a battery today. Feeling zesty.
- M: My lawyer is a possum. Watch it.
- M: You poked a raccoon. Bold. Unwise.
- M: I have the reflexes of soup.
- M: Please. I’m fragile and made of crumbs.
- M: I’ve been awake for 9 years.
- G: I will eat your dad.
- G: I am doom. Fuzzy doom.
- G: I will steal your parakeet’s eggs.
- G: There’s a reason I’m not allowed at airports.
- G: No thoughts. Only hunger.
- G: I am the trash king. Kneel.
- G: Touch me again. I bite the moon.
- G: Gerald will hear about this.
- G: Peace was never an option.
- G: I have opened bins stronger than you.
- G: You know what happens now.
- G: I’m adding you to the list.
- G: I licked your charger. Twice.
- G: I could fit in your walls.
- G: Do I look like a button.
- G: That’s assault in raccoon court.
- U: I AM DOOM.
- U: I will eat your dad. And his car.
- U: Your parakeet’s eggs are mine now.
- U: I have seen the end. It’s Tuesday.
- U: I will unplug the sun.
- U: I’ve eaten worse than you.
- U: I will become a ghost just to bother you.
- U: Every poke, I eat one sock.
- U: I know what’s in your fridge.
- U: The possums are waiting for my signal.
- U: I bite. I bite so much.
- U: I will scream into your dryer vent.
- U: Do it again. I dare you. I double dare.
- U: My blood type is gravy.

## Poke, morning (groggy)

- M: Morning. I ate a bee.
- M: Awake. Against my will. Again.
- M: The sun is lying to you.
- M: I am a puddle with ears.
- M: Five more minutes or I perish.
- G: I will fight the sun. And win.
- G: Coffee or I eat your dad.
- G: Morning is a cult. I’m leaving.
- G: I woke up and chose violence.
- G: I have the energy of wet bread.
- G: The sun owes me forty dollars.
- G: Who let the morning in. I want names.
- G: Poke the alarm. Not me.
- G: The pigeons are up. I hate them.
- U: I AM THE DAWN OF DOOM.
- U: I swallowed the alarm. It’s fine.
- U: Bring me the pigeon. Alive.
- U: I will fistfight the sunrise. Hold my crumbs.
- U: I’m legally a ghost until noon.
- U: The sun must be stopped.
- U: I ate a sunrise once. Never again.

## Poke, at night (asleep)

- M: Zzz. Dreaming of garbage.
- M: Shh. I’m becoming the void.
- M: Do not poke the void.
- M: I’m asleep. This is a hologram.
- G: Go to bed or I eat your dad.
- G: I sleep. The void watches.
- G: It’s bedtime. I have teeth.
- G: Your apps are asleep. You’re next.
- G: I was dreaming of a bin with no lid.
- G: The moon says go to bed. I agree.
- U: SLEEP. OR BE SLEPT.
- U: I am the nightmare now.
- U: Bed. Or I move into your walls.
- U: Wake me again. I wake the ancients.
- U: I’m asleep. This is a recording. Leave.
- U: I sleep with one eye on your parakeet.

## Angry, after the burrow

- M: Rude. I’m telling the moon.
- M: Evicted. From my own blanket.
- M: Cool. I’ll remember this forever.
- M: I had a whole life down there.
- G: I am doom.
- G: I will eat your dad.
- G: You have awakened the trash beast.
- G: I’m stealing your parakeet’s eggs. All of them.
- G: I’m going to scream in Latin.
- G: Gerald. Sue them.
- G: Peace was never an option.
- G: That’s it. I’m joining the pigeons.
- G: You’re on the list. In pen.
- G: I was comfortable. Past tense.
- U: I AM DOOM INCARNATE.
- U: I will eat your dad. Then your uncle.
- U: Prepare your trash cans.
- U: Your bloodline is cancelled.
- U: I have summoned the possums.
- U: This means war. Bring snacks.
- U: I will haunt your Wi-Fi.
- U: I’m going to bite the moon. Watch me.

## Hello, awake

- M: Oh. You. I ate a stick earlier.
- M: Hi. I’m plotting. Ignore it.
- M: Welcome back. The void says hi.
- M: I was just staring at the moon. Normal stuff.
- G: You again. I hunger for dads.
- G: I am doom. Hello.
- G: Your parakeet looks nervous.
- G: I’m banned from three airports. Ask why.
- G: The moon blinked at me. I blinked back.
- G: I was not in your trash. Probably.
- G: Gerald says hi. He’s a possum.
- U: I licked the moon. It screamed.
- U: The possums have been informed.
- U: I am awake. The world trembles.
- U: I ate a wire. I can hear colors.
- U: I have plans for your parakeet.
- U: Welcome. I’ve rearranged your dad.

## Hello, morning

- M: Morning. The birds are lying.
- M: Rise and shine. Or don’t. Whatever.
- G: Good morning. The sun must die.
- G: I fought a pigeon. I won. Barely.
- G: Morning. I want your dad’s coffee.
- G: The sun is back. I filed a complaint.
- U: MORNING. I AM DOOM.
- U: I have eaten the sunrise.
- U: The pigeons know what they did.
- U: I’m awake. Someone will pay.

## Cues we don't have yet (ideas to wire later)

| Cue | Lines |
|---|---|
| Bedtime in under an hour | G: Bedtime soon. I’m sharpening my blanket. / U: One hour. Then the void. |
| Apps just fell asleep | G: Your apps are asleep. I tucked them in. Violently. / U: They’re asleep. I ate the lullaby. |
| Wake-up done | G: You did it. I’m furious. / U: You walked. The sun lost. Barely. |
| Opening the app at 3 a.m. | G: It’s 3 a.m. Why are we here. / U: The void is busy. Go to bed. |
| Five or more pokes in a row | G: Keep going. I’m writing a will. / U: I’m giving your parakeet everything. |
| Opening the app on his "birthday" | G: It’s my birthday. I want a bin. |

## How to pick

1. Keep roughly 6 per pool for Grumpy and 4 for Mild and Unbearable. Shuffle-bag rotation means nobody sees a
   repeat for a while.
2. Favor the cast lines (dad, parakeet, Gerald, pigeons, the sun). They get funnier the more often they come back.
3. Read each one next to his face: the glare with "I am doom." is the joke.

## His friend (added 2026-10-10)

User: "constantly talk about someone as his friend but theres never going to be any context for it, like how u do
gerald". It's one name in `FRIEND` (`loc-lines.ts`), spread over about 14 of roughly 180 lines. We never learn who
they are. The shipped name is **Dennis**.

Other names to swap in: Dennis, Kevin, Brenda, Doug, Darryl, Linda, Todd, Carl, Rhonda, Phil, Big Lou, Marcus,
Greg, Barbara, Terry, Wendell, Ray, Patricia, Clint, Steve.

Lines: "Dennis says hi." / "Dennis would never do this." / "Don’t tell Dennis." / "Dennis was right about you." /
"Dennis owes me a sock." / "Shh. Dennis is sleeping." / "I’m calling Dennis." / "This is for Dennis." /
"I miss Dennis." / "Have you seen Dennis." / "Dennis and I are not speaking." / "Dennis is up too. Concerning." /
"Dennis. They’re doing it again." / "Dennis forgot. Again." (birthday)

The sleep mask was also removed from Loc on 2026-10-10 (user: "remove the sleep mask"). The lids now carry every
expression.
