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

## Round 6: liquid glass Sleep sheet, moon photo removed (same day)

- "the popup should have that apple liquid glass popup feel": the card is Apple's liquid glass
  (`GlassView`) on iOS 26, and a frosted pane that blurs the page elsewhere. One even hairline
  edge (the brighter top rim "looks weird"). Cancel is a glass pill.
- "the whole popup should have a liquid feel this extends to the animations": it rises from
  the bottom on a soft spring, slightly tall like a drop on the way up, squashing a touch as
  it settles; a pull down stretches it. A version that grew out of the Sleep orb was rejected:
  "it should still appear from the bottom not corner".
- "remove the moon image thing you keep using it looks like shit": the moon photo is gone from
  the Apps and Routine status cards and the Sleep sheet picture. Don't use `moon.webp` as a
  decoration again.

## Round 7: copy the references, smooth swipe-close (same day)

"when you swipe off of it the animation to close is kinda janky, make everything buttery
smooth, also the ui for it looks like shit... literly just copy this" (`sleep-sheet.png` and
`option-cards-sheet.png`, a wallet app's "Where would you send the money?" sheet).

- **Look:** a white sheet, dark type and one blue (#2F6FD6, the app's blue rather than the
  references' indigo). Title, Loc's line small in grey serif, the − 30 min + stepper, the
  white shadowed pill, the apps choice as the wallet sheet's option cards (icon, title, grey
  line, blue edge and check on the chosen one; tapping "Pick apps" again opens Apple's
  picker), and a filled blue "Tuck him in" beside an outlined blue "Cancel". The liquid glass
  and the sky picture are gone.
- **Motion:** one value, the card's offset. Open is a soft spring with no wobble; the drag
  follows the finger 1:1 (up resists); letting go hands the finger's speed to a clamped spring,
  so a flick carries on off the screen with no stall. The old close restarted from rest on an
  ease-in curve, which is what stuttered. The drop-stretch effects are gone.

## Round 8: the reference layout on liquid glass, in the app's colours (same day)

"it should still be liquid glass and have the color scheme of my app". Kept round 7's layout
and motion; the card is liquid glass again (frosted pane off iOS 26) with one hairline edge.
Content uses the moonrise palette: moon-white type, grey-blue secondary text, glass panes for
the pill, stepper and option cards, the moon-white accent edge and check on the chosen option,
and the app's white main button beside a glass Cancel pill. No blue or white-sheet colours.
