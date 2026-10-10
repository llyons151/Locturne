# Daily limits tab: layout options (2026-10-10)

The user said the Daily limit tab (`src/features/apps/apps-list.tsx`, `tab === 'limit'`) "feels very
crammed". Mockups: https://claude.ai/artifact/UMpbYTGuwwSzbPkQGhSdvH (private canvas).

## Why it feels crammed

1. **Said three times.** "Daily limits" + subtitle, then the "Daily limit / Each day" segment, then
   "Time per day". Three labels for one idea, stacked within ~150pt.
2. **Heavy switcher.** Each segment has an icon disc, a title and a subtitle. It's as tall and loud as a
   card, so it reads as content rather than a control.
3. **Three kinds of icon in one card.** Orange hourglass disc, white "+" disc, an app icon. Every row
   shouts equally; nothing leads.
4. **The action sits between the setting and its apps.** "Add or remove apps" splits "30 min" from
   the app it applies to.
5. **Tight spacing.** Heading → switcher → card each about 12pt apart; no section breathing room.

## Options

- **A · Plain Settings.** Small single-line segmented control, title only, two inset groups
  ("Time per day 30 min ⌃⌄" with a footer explaining it; "1 APP" with the apps then a text "Edit apps"
  row). No icon discs. Closest to native iOS; least risk.
- **B · Big number.** Centered huge "30 min" as the menu button, a usage meter ("18 min left today"),
  the app icon(s) under it and a capsule "Edit apps". Most premium-feeling; a second limit needs a
  pager or stacking.
- **C · One tile per limit.** Each limit is a tappable card: app icon(s), "Instagram · 30 min a day ·
  18 left", a thin meter. Editing happens in a native sheet. Scales best to several limits.
- **D · Sentence.** "Instagram falls asleep after 30 min a day." with the app and time as tappable
  tokens. Most distinctive and calm; weakest for many apps.

Shared across all: replace the two-line icon switcher with a plain segmented control; show today's
remaining time (status first, per docs/UI_INSPIRATION.md); drop the "+" disc.

## Decision (2026-10-10): C, one tile per limit

Built in `src/features/apps/apps-list.tsx` (`LimitTile`), with a plain segmented control at the top of both
tabs. A tile opens the limit's floating sheet (`limit-sheet.tsx`: hour and minute wheels, Apps row, Done,
Remove limit). On iPhone the tile can't match the mock exactly: Screen Time only tells the app when a limit
is used up (no minutes so far), and app names are opaque tokens. So the live tile shows the picks' icons
natively (`BlockedAppsView iconsOnly`), "30 min a day" as its title, "N picks" plus status as its detail, and
the meter only once the limit is used up. An "18 left" meter would need intermediate DeviceActivity
thresholds (e.g. every 25%) reported by the monitor extension.

# Bedtime tab: layout options (2026-10-10)

Second row of the same canvas. All use the new segmented control.

- **E · Two tiles.** "Sleep at bedtime" and "Always asleep" as tiles like the limit tiles: overlapping icons,
  "4 apps · 11 pm until your walk", and a state line ("Awake now. Asleep in 3 hr 12 min." / "Asleep now.").
  Most consistent with the Daily limit tab; a tap opens the list.
- **F · Tonight first.** "TONIGHT AT 11:00 PM / 4 apps fall asleep / They wake after your walk", the icons
  big in a row, an "Edit apps" capsule; Always asleep as one compact row at the bottom. State first.
- **G · Icon grid.** Each list a card with a 4-wide grid of named icons, a dashed "+" tile and an "Edit"
  link. Most visual; shows what's asleep at a glance.
- **H · Plain Settings.** Inset groups with caption headers ("4 APPS SLEEP AT BEDTIME"), app rows, an "Edit
  apps" text row and a footer for when. Closest to native iOS.

## Built (2026-10-10): E on the Bedtime tab, and a page per list

The user picked E ("Two tiles") but asked how you see every app once they're tucked into a tile.
Answer: each bedtime tile pushes a plain page with the system back button, like a limit's page in
Screen Time (`app/list.tsx` → `features/apps/list-page.tsx`, `?id=night|always|limit-N`). A daily
limit's tile instead opens the floating Edit limit popup (`/limit`, `limit-sheet.tsx`), laid out like
Brick's Edit mode sheet (user's pick, 2026-10-10): round close button, the name (preview only; iOS
won't name picks), one card with Time per day and the wheels over Apps with up to six icons, a white
Save limit and a quiet Delete limit that asks first. Its Apps row opens the limit's page.

- **Tiles** (`ListTile` in `apps-list.tsx`): at most two icons (three pushed the title to "Sleep at be…"
  at 320pt), the list's name, "13 picks · bedtime to wake-up", and a status line ("Awake now. Asleep at
  11:00 PM." / "Asleep now.", from `listStatus`). Limits keep their meter.
- **Page**: what the list does and its status, then for a limit a "Time per day" row (opens the
  same `/limit` popup with just the time: no apps row, no delete), then "APPS · N" with Add or remove
  apps and every app as a native row (swipe to remove; removals still wait for bedtime), and for a
  limit a red Remove limit.
- The list-changing logic moved out of the tab into `list-actions.tsx` (`useListActions`) so both
  screens share it; its tests are `list-actions.test.ts`. The web preview's lists live in
  `preview-lists.ts` for the same reason.
