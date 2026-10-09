# Apps tab redesign (2026-10-08)

The ask: make the Apps tab read like a premium native iOS page that fits Locturne. Research was
done on Mobbin (about 50 iOS screens: app blockers, Screen Time-style lists, dark summary cards).
It builds on the diagnosis in [UI_INSPIRATION.md](UI_INSPIRATION.md).

## What the references showed

| Pattern | Seen in | Taken? |
|---|---|---|
| State first, list second: one summary card above the rows | [Remote time off](https://mobbin.com/screens/3efe76ff-17a9-4485-8d9e-95c586d906ed), [Satispay points](https://mobbin.com/screens/daf0478d-2907-4342-a56a-7619b312d1e5) | Yes: the schedule card |
| Schedule as From/To times plus day circles | [Forest Time Guard](https://mobbin.com/screens/69ba2402-c594-4bad-b748-63a22786f084), [stoic.](https://mobbin.com/screens/d0deb0ec-298d-4d15-a0fe-6bc1b9121b4c) | Yes, read-only, tapping through to Routine |
| Section titles in white with a quiet count, not grey caps labels | [GitHub Copilot](https://mobbin.com/screens/1bbb638a-0ea1-4ad9-9fb2-e7c6b5640983), [Mercury](https://mobbin.com/screens/f0b6e372-61a1-4a8f-83da-cdf8c1d5c30f) | Yes |
| Groups as tiles with icon stacks ("Blocks 4 apps") | [Opal Apps](https://mobbin.com/screens/2cccc546-f51f-413e-bbb9-e421e0c9edc5), [Brick modes](https://mobbin.com/screens/33a57b4d-198f-477b-b750-9978feba2b00) | No: too close to Opal, and the rows must stay swipe-to-delete |
| Rules carousels, gradient CTA bars | [Jomo rules](https://mobbin.com/screens/dd1cc854-dcec-4abe-ac7e-6571b745a712) | No: busy, and a glow-adjacent look |

## What changed

1. **Schedule card on the Bedtime tab.** "Apps sleep 11 PM", a small moon, then "Wake-up from 7 AM".
   Large tabular digits with a smaller AM/PM, as Clock and Health show times. Under that are
   Monday-first night circles (filled on active nights) and an "Every night · Edit schedule ›"
   footer that opens Routine. A routine edit that is still waiting shows here, because it's
   what the list will follow.
2. **Rows are just icon + name** (56 pt rows, 36 pt icons). The repeated "11:30 pm / bedtime"
   and "30 min / a day" on every row, and the "App" line under every name, were noise. The
   time now appears once (the card, or the limit's header). Categories and websites still say
   "Category" / "Website" under the name (native change in `BlockedAppsModule.swift`).
3. **Section headers**: "Sleep at bedtime 13" / "Always asleep 3" at 20 pt semibold, each with
   one line saying what the list does.
4. Continuous (squircle) corners on the cards.

Unchanged: the round icons (the user's October 8 reference), + / Edit buttons, the native
segmented control, swipe to delete, the removal notes, and the Daily limit cards apart from the
rows. No glow anywhere.

## Needs a device check

The kind line change is in Swift, so it needs a new dev build. Until then, device rows keep the
"App" line.

## Round 2 (same day): user feedback

> "the add or remove apps should always be more accessible, also i dont like the colors its too grey"

- **"Add or remove apps" is now the first row of every list** (Sleep at bedtime, Always asleep,
  and each limit, right under "Time per day"). It used to come after all the rows or, for
  the bedtime list, only exist as the header +. An empty bedtime list now shows its card with
  "Add apps" instead of disappearing.
- **The cards now use the Sleep sheet's glass instead of the neutral grey surface.** That
  means Liquid Glass on iOS 26, and the same navy frost (`rgba(22, 28, 44, 0.66)`, hairline
  white edge) elsewhere. The header buttons use the same navy. This isn't a new palette: it
  reuses the sheet the user already approved.
- No separator under the last row of a card (web preview and native rows).

## Round 3 (same day): "I don't love the blue, do better" + the switcher

Grey and navy were both rejected, so no new tint. The page now uses the language Home and the
tab bar already have:
- **Cards are pure black** (`#000`), like Home's bedtime-apps and screen-time cards and the tab
  strip, sitting on the sky. Header buttons use the tab bar's `#1E1F23`.
- **Schedule:** thin 40 pt numerals (weight 300, like Home's "Bedtime in…" headline). Nights
  are Home's week rings, white when on and a faint ring when off.
- **Switcher (web stand-in, `segmented.tsx`):** dark `#1E1F23` track with the chosen side in
  solid white and dark text. That matches the selected tab button and the screen-time chart's
  range switch. On iPhone it's still Apple's segmented control (native-controls rule).
- Icons get a faint hairline ring so black icons (Netflix, X, Threads) don't vanish into the card.

## Round 4 (same day): "this should all be liquid glass"

Everything on the page is now glass, using the existing `GlassCard` (src/components/glass-card.tsx,
from docs/design-references/glassmorphism-cards.png):
- The schedule card, every list card, and the round + / ⋯ buttons.
- The switcher's web stand-in: a glass track with the chosen side a brighter pane. On iPhone it's
  Apple's segmented control, which is already glass on iOS 26.

On iOS 26 it's real Liquid Glass (`GlassView`, dark, faint white tint). On web it's a clear pane
with a backdrop blur, a light top-left rim and a soft white sheen. There's no colour tint: any
blue you see is the sky through the glass, which is why the lower cards look bluer than the top
one.
