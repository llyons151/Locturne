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
    lock-state.ts               the lock's rules: phase (night/morning/day/off) and which apps sleep. Pure; tests in lock-state.test.ts (`npm test`)
    screen-time.ts              the only file that calls react-native-device-activity (access, shield, unshield)

  hooks/
    use-compact.ts              true on short phones (iPhone SE), so layouts tighten

  components/                   shared UI
    app-background.tsx          the night sky behind every tab
    app-tabs.tsx                the floating glass tab bar + useTabBarInset
    night-sky.tsx               sky and moon, and the moon's position on each screen
    motion.tsx                  Reveal / WordsIn text entrances
    buttons.tsx                 PrimaryButton, TextButton
    glass-card.tsx              frosted card used on Home
    app-icons.tsx, ios-glyphs.tsx  drawn app icons (TikTok, Instagram, Safari…)
    app-picker.tsx              stand-in for Apple's app picker (sheet + card)
    placeholder-screen.tsx      unbuilt tabs
    screen-time-picker.tsx      Apple's real app picker (the UI half of lib/screen-time.ts)

  features/
    home/       home-screen.tsx, moon-lock.tsx
    apps/       apps-list.tsx, catalog.ts
    dev/        preset-lab/, text-lab/, screen-time-lab/
    onboarding/ (below)
```

## Native iOS (Screen Time)

`targets/` at the repo root holds the three Swift extensions (monitor, shield look, shield
buttons). They're copied from `react-native-device-activity` and are ours to edit: the plugin's
automatic copy is off (`copyToTargetFolder: false` in `app.json`) so each target keeps the
bundle ID registered with Apple. When upgrading the library, diff its `targets/` and
`ios/Shared.swift` against ours by hand. How it all fits: [DEVICE_SPIKE.md](DEVICE_SPIKE.md).

## How onboarding fits together

Onboarding is the biggest feature, so it has its own layers:

| File | Job |
| --- | --- |
| `content.ts` | **Data.** The step order (`STEPS`), every question's choices and copy, prices. Change wording here. |
| `estimate.ts` | **Math.** Turns answers into hours, days and lifetime numbers, plus formatting. No UI. |
| `onboarding-flow.tsx` | **Navigation.** Which step you're on, Next/Back, editing from the summary and returning, the paywall exit, the moon moving between steps. |
| `steps.tsx` | **What each step shows.** `renderStep` is one `case` per step returning `{ body, footer, secondary }`. |
| `screens/` | Steps big enough for their own file: `paywall.tsx` (plans + exit offer), `reveal-screen.tsx`, `math-screen.tsx`, `tomorrow-demo.tsx`. |
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
