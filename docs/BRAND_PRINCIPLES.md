# Brand principles: what AI can't generate

Written September 24, 2026, in response to Opal's founder saying "you can't
vibecode a brand." This doc turns that line into rules for Locturne. It works
alongside [GAME_PLAN.md](../GAME_PLAN.md) (look and voice),
[MASCOT_DIRECTION.md](MASCOT_DIRECTION.md) and [COLOR_RESEARCH.md](COLOR_RESEARCH.md).

## What the line means

A generator gives you the average of everything it has seen. A brand is the set
of specific choices the average would never make, repeated so consistently that
people recognise you without the logo. Features can be copied in a weekend (Groggy
and BedLock already have the same idea). The accumulated specific choices can't be.

So the question isn't "should I use AI". It's **"who made this decision?"**
AI can type the code and draft options. You make the call, and you make it from a
reference, a real experience or a test, never from the first thing a prompt returns.

**The test:** if a single prompt like "sleep app, dark mode, cute mascot" would
produce it on the first try, it isn't brand. It's the default.

## Where Locturne's brand actually lives

Ranked by leverage for v1, where there's no illustrated art.

### 1. The voice (the biggest lever)

v1's mascot *is* the writing, so the writing is the brand. This is the part that
is hardest to fake, because good lines come from real mornings, not prompts.

- Write a **voice bible**: who he is, what he'd never say, words he uses, words he
  doesn't (no "Great job!", no emoji, no exclamation points, no guilt).
- Write **100+ lines yourself**, keep the best 20. Use AI to find patterns in what
  lands, not to write the lines. Generated "sassy" copy all sounds the same.
- **Let the audience pick.** Concept videos are voice tests. Lines that get quoted
  in comments stay; lines nobody repeats go.
- Every surface gets his voice: shield, notifications, errors, paywall, App Store
  listing, settings footers, the "Screen Time access revoked" warning.

### 2. Three signature moments, overbuilt

Don't polish everything evenly. Pick the moments people screenshot and film, and
spend disproportionate time on them. Everything else stays plain and quiet.

1. **The shield** ("Shh. I'm sleeping. So are they."): the most-seen, most-shared
   surface. Title copy, icon, and the order of lines across nights.
2. **Steps 190–200**: the payoff. Count feel, haptics on every step near the end,
   his last line, the sound (if any). This is the TikTok shot.
3. **The morning share card**: "Bed 11:41. Up 7:02. 213 steps. Still
   disappointed." Designed like a poster, not a stats card.

### 3. Honesty as a brand trait

"Never fails silently" is a brand promise, not just engineering. Most blockers
quietly break and users find out at 1am. Loc says it plainly, in his voice,
when protection is off. Reliability plus candour becomes the reputation.

### 4. You

Competitors can clone features, not a founder who shows up on video daily. The
founder's face, building in public, and real mornings on camera are brand assets
that nobody else in the category has.

### 5. Real-world craft

- A **human illustrator** when art arrives (already the rule in MASCOT_DIRECTION).
- A **photographed plush raccoon** is physical and impossible to prompt.
- A **licensed typeface** chosen from references and used with fixed rules,
  not the first italic serif on Google Fonts.

## The anti-vibecode process

1. **Reference first.** Collect screenshots, film stills, print, and apps you
   admire before designing any screen. The user's own references are the spec.
2. **Decide on paper, then build.** Sketch or mock the three signature moments
   by hand (or in Figma) before code.
3. **AI executes, you decide.** AI can scaffold, type code, and produce many
   options fast. You choose, cut, and adjust.
4. **Write rules down.** Voice bible, type scale, spacing, what's banned. A brand
   is consistency, and consistency needs a written rule, not memory.
5. **Test with real people.** Videos and TestFlight tell you what's actually
   distinctive. Taste proposes, the audience confirms.

## Default-look kill list

These read as generated. Don't ship them without a specific reason.

- Near-black background plus one saturated accent (already rejected).
- Rounded cards with gradients, glassmorphism everywhere, glow of any kind.
- Icons in coloured circles, stats tiles, progress rings as decoration.
- "Welcome to Locturne! 👋" onboarding, confetti on success, "Great job!"
- Stock Lottie animations and raw AI mascot art.
- Copy that could belong to any wellness app ("Build healthier habits").

## Next brand actions

1. ~~Decide the name.~~ Locturne, decided September 27, 2026 (replacing Trundle).
   See [NAME_RESEARCH.md](NAME_RESEARCH.md).
2. Write the first 100 lines. The voice rules are in [VOICE.md](VOICE.md).
3. Film the first 5 concept videos to test voice before building UI.
4. Mock the shield, the 190–200 step moment, and the share card from references.
5. Choose and license the display typeface; write the type rules.
