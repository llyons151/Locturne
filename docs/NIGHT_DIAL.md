# Night dial (Routine tab)

2026-10-08. The first two versions (96 quarter-hour ticks, then a fat navy band on a navy
track) read as messy. Researched circular sleep/schedule dials on Mobbin:

- [Calm](https://mobbin.com/screens/9b587268-2c91-4e40-bc99-0a62928c32da), dark: purple band on a dark track, icons in the band ends, 2-hourly numbers inside.
- [Calm Sleep](https://mobbin.com/screens/29b16116-6164-45aa-9d24-077805f32feb): white band on grey track, same structure.
- [Apple Health](https://mobbin.com/screens/28866374-9954-47c7-a81f-a74a07628978): band ends carry the bed/alarm icons; clock face numbers inside.
- [Polestar](https://mobbin.com/screens/13a0c3e2-30bf-4154-9a65-558909d65173): one bright band, white end handles, plain-weight duration in the centre.
- [Bevel](https://mobbin.com/screens/623a0ad4-5b2d-4c22-863c-2b62fe74d151), [Starlink](https://mobbin.com/screens/e684f44d-281e-49ce-91a2-644fd3aeeb10): busier variants (ticks, inner rings), less clean.

## What the clean ones share

1. **Contrast between band and track.** Bright band, dim track. Our v2 used two navies, so it looked muddy.
2. **Handles are the band's ends.** Same width as the band, icon inside. Small knobs on a fat band look stuck on.
3. **Numbers, not ticks.** Sans-serif hour numbers every two hours, am/pm only at the quarters. No tick marks.
4. **Quiet centre.** Duration in an upright number font, small caption under it.

## What we built

Moon-white (`accent`) band on a `frost` track, 34pt wide; handles are 34pt discs in the band
colour with dark icons; 12/2/4/6am… inside in `text3`, quarters in `text2`; centre uses
`NUMBER_FONT`. Labels are RN `Text`, not SVG text (SVG text fell back to a serif font on iOS).

## v4: Swift (2026-10-08)

User picked the [Calm Sleep](https://mobbin.com/screens/29b16116-6164-45aa-9d24-077805f32feb)
dial and asked for it "swift ios native super smooth and clean". `modules/night-dial` draws the
whole thing (ring, handles, numbers, centre, and the Bedtime / Morning start columns with icons)
in Core Animation:

- The band follows the finger with no stepping; the times snap to 15 min with a selection tick,
  and on release the band eases onto the snapped time (display link, up to 120 Hz).
- Handles are band-coloured discs with a neutral drop shadow (no glow), lifting to 1.14x while held.
- A drag only starts on a handle or the band; scroll views around it wait, then pause for the drag.
- JS gets `onChange` once per drag, on release. VoiceOver: each handle is adjustable by 15 min.
- `night-dial.tsx` keeps the SVG version for web, Android and dev builds without the module.
  The native view needs a new `eas build` before it shows up.
