# Code architecture

How `src/` is laid out and why. Last reorganized 2026-09-30.

## The one rule

Each folder has one job, and imports only flow **down** this list:

| Folder | Holds | May import from |
| --- | --- | --- |
| `src/app/` | Routes only. Each file is a few lines that renders a feature. | everything below |
| `src/features/<name>/` | Code used by **one** feature. | `components`, `hooks`, `lib`, `theme` |
| `src/components/` | UI used by **two or more** features. | `hooks`, `lib`, `theme` |
| `src/hooks/` | Shared React hooks. | `lib`, `theme` |
| `src/lib/` | Plain functions, no UI. | nothing |
| `src/theme/` | Colours, fonts, spacing, type sizes. No components. | nothing |

Features never import from each other. If two features need the same thing, it moves
down into `components/`, `lib/` or `theme/`.

**Where does a new file go?** Ask: *if I deleted this feature, should this file go with it?*
Yes → inside the feature. No → `components/` (UI) or `lib/` (logic).

**Imports:** use `@/` for anything outside your own feature (`@/theme`, `@/components/buttons`)
and `./` inside it (`./content`, `../ui`). The theme is one import: `import { Nocturne, Space } from '@/theme'`.

## Map

```
src/
  app/                          routes (expo-router: the file path is the URL)
    _layout.tsx                 root stack: tabs + full-screen onboarding modal
    onboarding.tsx              /onboarding  (?step=<id> jumps to a step, ?exit=<arm> picks the exit offer)
    (tabs)/                     the tab bar; "(tabs)" is a group, so it isn't in the URL
      _layout.tsx               sky background + custom tab bar
      index.tsx  apps.tsx  nap.tsx  routine.tsx  profile.tsx
    (dev)/                      design tools, not part of the product
      preset-lab.tsx            /preset-lab
      text-lab.tsx              /text-lab
      screen-time-lab.tsx       /screen-time-lab  (device spike; linked from the You tab in dev builds)

  theme/
    colors.ts                   palettes; `Nocturne` is the active one (?palette= on web)
    fonts.ts                    system fonts, DisplayFont (Loc's italic serif), NUMBER_FONT
    tokens.ts                   Space, Gap, Radius, Type, VoiceSize, CTA_HEIGHT
    index.ts                    re-exports all three

  lib/
    haptics.ts                  tap / tick / thud / done (no-ops on web)
    text.ts                     noOrphan: keeps the last word off its own line
    lock-state.ts               the lock's rules: phase (night/morning/day/off) and which apps sleep, including Block now and used-up limits. Pure; tests in lock-state.test.ts (`npm test`)
    daily-limits.ts             daily time limits: slots, stricter-now / looser-at-bedtime edits. Pure; tests in daily-limits.test.ts
    night-plan.ts               splits a night into the <45-minute windows iOS monitors. Pure; tests in night-plan.test.ts
    screen-time.ts              the only file that calls react-native-device-activity (access, shield, arm/disarm the night, naps, limits, re-applying standing blocks)

  hooks/
    use-compact.ts              true on short phones (iPhone SE), so layouts tighten
    use-standing-blocks.ts      on every app open: settles looser limits whose bedtime passed, re-shields every rule in force

  components/                   shared UI
    app-background.tsx          the night sky behind every tab
    app-tabs.tsx                the floating glass tab bar + useTabBarInset
    night-sky.tsx               sky and moon, and the moon's position on each screen
    motion.tsx                  Reveal / WordsIn text entrances
    buttons.tsx                 PrimaryButton, TextButton
    glass-card.tsx              frosted card used on Home
    app-icons.tsx, ios-glyphs.tsx  drawn app icons (TikTok, Instagram, Safari…)
    app-picker.tsx              stand-in for Apple's app picker (sheet + card)
    grouped-list.tsx            Settings-style Section, ValueRow, ControlRow, ChoiceRow, and EditSheet (web preview only)
    placeholder-screen.tsx      unbuilt tabs (You)
    screen-time-picker.tsx      Apple's real app picker (the UI half of lib/screen-time.ts)

  features/
    home/       home-screen.tsx, moon-lock.tsx
    apps/       apps-list.tsx (bedtime, always and daily-limit groups), catalog.ts
                limit-menu.ios.tsx = a limit's time as a system pull-down menu; limit-menu.tsx = web stand-in
    routine/    routine-screen.tsx (preview: local state; edits show when they start, from the next bedtime)
                controls.ios.tsx = Apple's controls via @expo/ui (compact time picker, menus, system sheet);
                controls.tsx = the web preview's stand-ins; control-types.ts is shared by both
    nap/        nap-screen.tsx (GAME_PLAN's Block now: the bedtime apps or its own picks, 15 min to 4 hr; iOS wakes them at the end)
                segmented.ios.tsx = system segmented control; segmented.tsx = web stand-in
    dev/        preset-lab/, text-lab/, screen-time-lab/
    onboarding/ (below)
```

## Native iOS (Screen Time)

`targets/` at the repo root holds the three Swift extensions (monitor, shield look, shield
buttons). They're copied from `react-native-device-activity` and are ours to edit: the plugin's
automatic copy is off (`copyToTargetFolder: false` in `app.json`) so each target keeps the
bundle ID registered with Apple. When upgrading the library, diff its `targets/` and
`ios/Shared.swift` against ours by hand. How it all fits: [DEVICE_SPIKE.md](DEVICE_SPIKE.md).

`modules/blocked-apps/` is a local Expo module (autolinked, imported as `blocked-apps`) for
the Apps tab. iOS never tells an app which apps were picked: the picker returns opaque
tokens, and only SwiftUI's `Label(token)` can draw one as an icon and name. `BlockedAppsView`
reads a selection the library saved in the App Group (`familyActivitySelectionIds[id]`,
base64 JSON) and draws one row per app, category and site. React sets its height from
`selectionSize(id)` × the row height, and bumps `revision` after the picker closes so the
rows re-read. Rows are only made once the view is in a window, and a re-read changes just
the rows that were added or removed (they fade while React animates the group's height),
because every rebuilt `Label(token)` waits on iOS for its icon again. It reads the library's storage format directly, so recheck it on upgrades.
Changing anything in `modules/` needs a new development build.

### Overlapping rules (always, night, Block now, daily limits)

iOS keeps **one** blocklist per app, and unshielding a list removes its apps from it, even
apps another rule still holds. So nothing relies on unshielding being precise. After any
unshield, the standing rules are put back:

- `reapplyStandingBlocks()` in `lib/screen-time.ts` (from the app, and on every app open via
  `useStandingBlocks`), and
- `reapplyLocturneBlocks()` at the bottom of `targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift`
  (after every Screen Time event, with the app closed).

Both read the same App Group keys and **must stay in step**: `locturne.nightHeld` (set by a
night window's start, cleared by the morning wake), `locturne.nap`, `locturne.limits` and
`locturne.limitReached.<id>` (the day a limit was used up, written by the extension).

Monitored activities, against iOS's cap of about 20: up to 16 `night-*` windows, one
`locturne-nap`, and up to three `limit-*` (each a midnight-to-23:59 daily window with a usage
threshold event). Each list is its own selection id: `night`, `always`, `block`, `limit-0..2`.

## How onboarding fits together

Onboarding is the biggest feature, so it has its own layers:

| File | Job |
| --- | --- |
| `content.ts` | **Data.** The step order (`STEPS`), every question's choices and copy, prices. Change wording here. |
| `estimate.ts` | **Math.** Turns answers into hours, days and lifetime numbers, plus formatting. No UI. |
| `onboarding-flow.tsx` | **Navigation.** Which step you're on, Next/Back, editing from the summary and returning, the paywall exit, the moon moving between steps. |
| `steps.tsx` | **What each step shows.** `renderStep` is one `case` per step returning `{ body, footer, secondary }`. |
| `screens/` | Steps big enough for their own file: `paywall.tsx` (plans + exit offer), `reveal-screen.tsx`, `math-screen.tsx`, `tomorrow-demo.tsx`, `walk-meter.tsx` (the `walk` page's live count). |
| `ui.tsx` | Onboarding's page kit: `Shell` (top bar, progress, footer), `Title`, `Body`, `Voice`, `Options`, `HoldButton`, and `page` (shared spacing). |
| the rest | Single widgets: `time-wheel`, `day-picker`, `schedule-card`, `apple-alert`, `reveal-grid`, `rolling-number`, `sleep-drop` (+ `useSleepDrop`), `simulated-prompt`. |

To **add a step**: add its id to `STEPS` in `content.ts`, add a `case` in `steps.tsx`, and
TypeScript will flag anything else that needs it.

To **change how a step looks**: find its `case` in `steps.tsx` (or its file in `screens/`).

To **change navigation rules** (what Back skips, which steps are editable): the constants
at the top of `onboarding-flow.tsx`.

## What the 2026-09-30 reorganization changed

- Shared code moved out of `features/onboarding/`. Home, Apps and the tab bar used to
  import haptics, tokens, buttons, the night sky and app icons from inside onboarding.
- Two theme systems became one (`theme/`). The Expo template's light/dark `Colors` and `Spacing`
  are gone; Locturne is dark-only.
- Expo template leftovers deleted: themed components, the Expo-logo splash animation,
  the reset script, sample images, and the unused `@expo/ui`, `expo-device`, `expo-web-browser`.
- `onboarding-flow.tsx` went from 1,467 lines to 290, split into `steps.tsx`, `screens/`,
  `simulated-prompt.tsx` and `useSleepDrop`. Copy-pasted pieces (fine-print links, the
  AM/PM warning) became one component each.
- Unused `step-test.tsx` removed (it's in git history).
- Checked by rendering all 35 pages (every onboarding step and tab) on web before and
  after: the text on every page is identical.

## Known leftovers

- `app.json` still uses the template splash (Expo blue `#208AEF` + template icon) and a light
  blue Android icon background. These need real Locturne artwork.
- `?palette=` keeps five palettes; only `moonrise` ships. Cut to one once it's final.
- On the static web build, opening `/onboarding?step=<id>` logs React error #418 (the
  server HTML is the first step, the browser renders another). This predates the
  reorganization and only affects the preview links.
