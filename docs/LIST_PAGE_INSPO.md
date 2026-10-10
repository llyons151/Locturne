# List page ("Sleep at bedtime") — Mobbin inspiration

2026-10-10. The list detail page (`src/features/apps/list-page.tsx`) reads as sloppy. Research only, nothing built.

## Why it feels sloppy

1. **Mixed alignment.** Header title is left-aligned next to the back arrow; everything under it is centered.
2. **Four type styles in four lines.** Large header, mid-size grey paragraph, small icon+status line, spaced-caps eyebrow
   ("APPS · 13"). None share a left edge or a rhythm.
3. **The paragraph wraps badly.** "done." orphans onto its own line.
4. **Facts are prose.** "Awake now. Asleep at 11:00 PM." and "bedtime until wake-up" are data written as sentences, so
   nothing scans.
5. **Hairline under the header** cuts the page in two for no reason.

## References

- **Opal — Easy Evening rule** ([Mobbin](https://mobbin.com/screens/54f175d5-f90e-4376-9d8a-b5a7fe26f3e8)): centered title
  in the nav bar, then small icon+label section headers ("During this time", "Apps are blocked") each over one grouped card.
  Footnote line under the last card explains the rule. Closest structural match.
- **Opal — Weekend Zen summary** ([Mobbin](https://mobbin.com/screens/20ad6235-3f7b-4ade-bd5b-f52a160fbf60)): small status
  line ("Schedule, Starts in 95h") above a big centered name, then one card of label/value rows (During this time, Block → 3
  Apps). Best model for the top of our page.
- **Jomo — Work Hours rule** ([Mobbin](https://mobbin.com/screens/7b449ed2-2e8d-4d75-8f0a-b8ef1540c08e)): centered emoji +
  title + one-line status ("Rule not active. Apps are accessible.") then stacked row cards (Block / Active / Unlocks) with
  values right-aligned.
- **stoic. — morning limit** ([Mobbin](https://mobbin.com/screens/19fe35f3-2498-42d7-b283-9dc9e4666c78)): "Apps Blocked → 1
  item" as a single row, spaced-caps section header that is actually centered over its card.
- **bunq — Scheduling** ([Mobbin](https://mobbin.com/screens/3323728d-1c6e-4d30-aadf-c31d76786215)): plain iOS inset-grouped
  dark list with caps section headers and a footnote; the native baseline.

## Pattern they share

Centered nav title → (optional) short status line + big name → **label/value rows in one card** ("Active · Bedtime → wake-up",
"Status · Asleep at 11:00 PM", "Apps · 13 ›") → footnote. Sentences become rows; one alignment axis.
