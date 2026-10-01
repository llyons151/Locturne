# Navigation: center Nap button

Researched September 24, 2026. Question: should Locturne use a bottom nav with a
prominent center button (like the dark "+" pill in a reference screenshot) that
starts an immediate nap?

## Verdict

Make Nap the center of the nav, but as a real tab (a screen), not a button that
fires an action. Keep native tabs.

## Why the idea is right

- GAME_PLAN already includes "Tuck him in for a nap" (15/30/60 min). It is the only
  thing a user does on demand; bedtime and morning happen automatically. The
  on-demand action should be the easiest thing to reach.
- The center slot is also the best spot for short-video demos: one tap, Loc
  curls up, apps are blocked.

## Constraints found

- **HIG:** Apple says tab bars are for navigation, not actions; actions go in a
  toolbar. A center "+" that opens a sheet is an Android/Instagram-era pattern.
- **Expo SDK 57 `NativeTabs`** (already used in `src/components/app-tabs.tsx`):
  every `NativeTabs.Trigger` navigates to a route. There is no custom center view.
  `tabPress` listeners exist, but the docs don't say `preventDefault()` stops
  navigation. It does offer `NativeTabs.BottomAccessory` (iOS 26 mini-player slot,
  with `regular`/`inline` placement) and `minimizeBehavior`.
- **The exact dark-pill look** requires a custom JS tab bar (`expo-router` `Tabs`
  with a `tabBar` render). That gives up Liquid Glass, native minimize, and
  platform accessibility behavior. The earlier HIG audit already flagged the custom
  bar as something to replace.
- **Wording:** Locturne blocks the user's selected apps, not the whole phone. Avoid
  "brick your phone"; Brick is also a competitor's name.
- **Enforcement risk:** Non-repeating DeviceActivity schedules have lost
  callbacks on iOS 26.3.1 (see VALIDATION_RESEARCH.md). An immediate nap can apply
  shields from the app itself. The fragile part is lifting them when the nap ends
  while the app is closed.

## Recommended structure

`Home` · `Nap` (center) · `Settings`, with room for one more later (e.g. `Apps`).
Three or four tabs is enough; history and stats are secondary in the plan.

- **Nap tab:** Loc yawning, 15/30/60 chips, one big "Tuck him in" button.
  While a nap runs, it shows the countdown and sleeping Loc.
- **BottomAccessory while napping:** a small "Napping · 23 min left" pill above the
  tabs, visible from any tab. This is where iOS 26 expects live status.
- **State rules:**
  - Night: Nap tab says Loc is already asleep and offers no start button.
  - Morning (waking, under 200 steps): decide before shipping. Suggested: nap is
    allowed, and ending it returns to the waking state. It never unlocks
    scheduled apps.
  - Day: normal.

## Open decisions (from GAME_PLAN)

- Can an immediate nap be ended early, and how? Options: freely; hold to confirm;
  or count toward the emergency bypass.
- If a nap would run into bedtime, cap it at bedtime or block starting it.
