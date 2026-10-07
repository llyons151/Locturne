# Tab redesign, round 1 (2026-10-06)

The user said the tab screens looked "cheap, like filler" and asked for the best reference
screenshots and a redesign. References: App Store screenshots of 9 apps, saved in
`docs/design-references/tab-redesign/` (`*-appstore.jpg`). Before and after:
`before-2026-10-06.png` and `after-2026-10-06.png`. Link list: `UI_INSPIRATION.md`.

## What was taken from where

| Pattern | Source | Used on |
|---|---|---|
| Status card: small caps line, bold title, one plain line, the real moon cut off by the card's right edge, navy-to-charcoal fill | Sky Guide "Calendar" and "Tonight" | Apps, Routine (`src/components/night-cards.tsx`) |
| Settings cards with the heading and icon inside, no icons on the rows, footer inside | iOS Display & Brightness (the user picked this for You) | Apps, Routine, You |
| One clear status at the top instead of a grey summary sentence | Oura Today, Flighty | Apps, Routine |

## Left alone, and why

- **Home:** HOME_SPEC says no stat rows or big numbers, and the user once rejected an
  Opal-style stats Home. Oura-style stat tiles were tried and taken out. Needs the user's call.
- **Nap:** now the Sleep sheet (another session, same day).
- **You:** redesigned by the user's request the same day; its card style was adopted here.

## Rejected in this round

- Three big counts (bedtime picks / always / limits) at the top of Apps: too close to the
  Opal stat row the user rejected. Replaced with the status card.

## Round 2: Home and the nav (same day)

The user sent a reference (`design-references/rounded-panel-nav.png`, three dark purple app
screens) and said: "reshape the home dashboard to look like this but work it in with my
style, im really liking the way they have the weird rounded nav".

- **Nav:** the screens sit on a panel with 44 pt rounded bottom corners. Under it, a black
  strip holds a round button per tab (current one filled white, the rest dark grey, no labels),
  and the Sleep button sits apart at the right: a moonlight gradient disc (moon white into
  night blue) with a dark crescent. The photo moon was tried first; the user said it "looks cheap".
- **Home:** the "79%" screen's layout, with Loc's serif instead of the reference's mono and
  sans: the voice line and status, then the big time with a two-line label, the stripe
  meter in moon white, and "Up since 7 am / Bedtime in 1h 22m" under it. The glass Apps and
  Schedule rows stay below.
- Not taken: the purple and rainbow colour, the floating avatar bubbles, and the mono font.
- Screenshot: `design-references/tab-redesign/after-nav-2026-10-06.png`.

## Round 3: the Sleep sheet (same day)

The user sent `design-references/sleep-sheet.png` (a "Set Location" sheet: floating inset card,
grabber, centred title, a map with an address pill on it, a filled and an outlined button
side by side) and asked for the Sleep popup to look like it, with smooth animations.

- **Frame** (`src/features/nap/sleep-sheet.tsx`): a card floating 8 pt inside the screen's
  edges with 44 pt corners, a grabber, and a dimmed page behind it. It slides up on a slow,
  settling curve (460 ms, no bounce), follows a downward swipe, and closes on a swipe, a tap
  outside, the buttons, or VoiceOver's escape. Height changes ease too.
- **Why not the native form sheet:** on web it showed as a plain full page, so the preview
  never looked like a sheet. The route is now a transparent modal and draws its own card.
- **Content** (`nap-screen.tsx`): title "Sleep"; the map becomes the night sky with the moon
  in the corner, Loc's line, the length stepper (the countdown during a nap) and a pill
  ("Apps asleep until 10:18 pm"); then the apps choice; then "Tuck him in" (filled, with a
  moon) beside "Cancel" (outlined). During a nap: "Done" beside "Wake him early".

## Round 4: the Home moon at the bottom (same day)

The user asked for the Home moon to move "to the bottom to where its poking out it should go up
into black", with the reference's premium colour feel "but we do the moon". The moon no
longer rises to the top on Home: it rests at the panel's bottom edge on every tab, and Home's
content leaves room for its arc. A blue light (`MoonLight` in home-screen.tsx) rises from it
and fades to black by three quarters of the way up. The user asked for this light on Home;
it isn't used anywhere else.

## Round 5: the Sleep button's moving glow (same day)

The user asked for "that premium moving glow effect behind it that looks like glowing water
almost but it shouldnt go outside the button", then sent an orb reference
(`design-references/glow-orb.png`), then said "it shouldnt be purple it should be the blues we
are using... think blues with white". Built as `src/components/moon-water.tsx`: four soft
pools of white, moon white and sky blue drifting on one slow 14 s clock over a sky-blue base
(made bluer after the user said it "still feels like indigo"),
with a fixed gloss highlight and a darker rim so it reads as a sphere. It's clipped by an SVG
circle (Chrome won't clip moving layers to rounded views) and holds still with Reduce Motion.
