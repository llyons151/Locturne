# Home screen spec

Written September 28, 2026. Built in `src/features/home/home-screen.tsx`.

Home is a **status screen, not a dashboard.** GAME_PLAN says Locturne competes on "the
morning hook, the voice, and never failing silently. Not: blocking features, stats, or
sleep tracking." So there are no charts or stat rows here.

History: a first version copied Opal's home tab (hero, big number, three stat columns,
bar chart, pinned action). The user said it looked "way too much like Opal's". Opal's
home is built around stats; ours is built around one sentence of status and Loc's voice.
See `docs/design-references/opal-home.png` for what to take from Opal (one sharp hero,
native parts) and what not to (its layout).

## What matters, in order

1. **Honest status.** Are my apps asleep, and until when? If protection isn't working
   (Screen Time access revoked), that replaces everything else, stated plainly
   (VOICE.md, "Clear when it matters").
2. **The one thing to do next**, which depends on the time of day. Night: nothing (go to
   sleep; no button). Morning: walk, with the live count. Day: when bedtime is.
3. **Loc's line**, big, in the serif. The voice is the mascot.
4. **Which apps sleep, and the schedule**, one tap from editing (the user is always in
   control).
5. **Ways out** (passes, emergency unlock): findable, never prominent.

Not on Home: stats, charts or streaks. History belongs in the You tab or the morning share
card.

**Update, October 6, 2026.** The user sent `docs/design-references/rounded-panel-nav.png`
and asked for Home to look like it, in Locturne's style. So Home now has one big time
(tonight's bedtime in the day, the morning start at night) with a two-line label, a
monochrome stripe meter for how far through the day or night it is, and "Bedtime in 1h 22m"
under it (`night-meter.tsx`). That is still status: one time, not a stats row. The meter
hides whenever it would imply protection that isn't there (access off, nothing armed, a
lapse, or a clock night that isn't held). The tabs became round buttons on a black strip
under a panel with rounded bottom corners (`app-tabs.tsx`, `app-background.tsx`), and the
Sleep button is a moonlight gradient disc. Later the same day the user moved the Home moon to
the bottom: it pokes up out of the panel's edge, and a blue light (`MoonLight`) rises from it
into the black. The text starts at the top. The resting moon now rises out of the panel's edge (`NightSky floor`), so its light shows the rounded corners.

## States

| | Night | Morning (blocked) | Day | Protection off |
|---|---|---|---|---|
| Loc | "Shh. I'm sleeping. So are they." | "I can hear you walking. I'm ignoring it." | "I'm awake. Technically." | "Screen Time access is off." |
| Status | 🔒 Apps asleep until 7:00 AM | 84 of 200 steps, progress bar | Apps awake until 11:00 PM | So I can't block anything… |
| Action | none | Start walking | none | Open Settings |
| Rows | Apps (dimmed) · Schedule | same | Apps · Schedule | same |
| Link | Use a pass | Use a pass | none | none |

Lines come from the VOICE.md line bank. The moon rises to the top of the screen on every
state; the lock in the status line closes with a haptic click once it settles.

## Look

- The onboarding sky stays on Home: black at the top where the moon sits, the blue
  flowing light at the bottom (user request, September 28).
- The Apps and Schedule rows sit on a glass card (`GlassCard`) so the blue light shows
  through, blurred. Reference: `docs/design-references/glassmorphism-cards.png`.

## Design preview

Until real schedules exist, Home shows placeholder data and starts in the night state.
Tapping the "Tonight ⌄" label cycles the states for review.
