# Code architecture

How `src/` is laid out, what's wrong with it today, and the target layout. Reviewed
2026-09-30 (about 9,700 lines of TypeScript; `tsc` passes, lint has 1 error in template code).

## The rule the layout should follow

| Folder | Holds | May import from |
| --- | --- | --- |
| `src/app/` | Routes only. Each file is a few lines that renders a feature. | everything |
| `src/features/<name>/` | Code used by **one** feature (onboarding, home, apps). | `theme`, `components`, `lib`, `hooks` |
| `src/components/` | UI used by **two or more** features. | `theme`, `lib`, `hooks` |
| `src/theme/` | Colours, fonts, spacing, type scale. No components. | nothing |
| `src/lib/` | Plain functions with no UI (haptics, text helpers). | nothing |
| `src/hooks/` | Shared React hooks. | `theme`, `lib` |

The test for any file: *if I deleted this feature, should this file go with it?* If not,
it doesn't belong in that feature's folder.

## What's wrong today

### 1. `features/onboarding/` is secretly the app's design system
Home, Apps, the tab bar, the background and the dev labs all import from inside
onboarding:

- `haptics.ts`: imported by 15 files across every feature
- `tokens.ts` (Space, Gap, Radius, Type): home, apps
- `ui.tsx` (`PrimaryButton`, `TextButton`, `DISPLAY_MAX_SCALE`): home, apps
- `night-sky.tsx`: `components/app-background.tsx`, home
- `app-icons.tsx`, `app-picker.tsx`: home, apps
- `rolling-number.tsx` (`NUMBER_FONT`): preset lab, schedule card, tomorrow demo

So `components/` depends on `features/onboarding`, which is backwards: shared code
reaches into a feature. Deleting or reworking onboarding would break the home screen.

### 2. Two competing theme systems
- `constants/theme.ts` is the Expo template's light/dark `Colors`, `Spacing`, `BackgroundColors`.
  Locturne is dark-only, so the light colours never show.
- `constants/nocturne.ts` + `features/onboarding/tokens.ts` are the real system.

The tab bar uses `Spacing.three` (16) while everything else uses `Space.l` (16): the same
number under two names.

### 3. Leftover Expo template code (dead or nearly dead)
Never imported: `external-link.tsx`, `hint-row.tsx`, `ui/collapsible.tsx`, `web-badge.tsx`,
`AnimatedIcon`. Only used by other template files: `themed-text.tsx`, `themed-view.tsx`,
`hooks/use-theme.ts`, `hooks/use-color-scheme*.ts` (the lint error lives here).

Still running: `AnimatedSplashOverlay` in `app/_layout.tsx` animates the **Expo logo on
Expo blue** at every launch, and `app.json`'s splash is the same template blue + icon.

Also: `scripts/reset-project.js`, the template images (`react-logo*`, `expo-badge*`,
`tutorial-web.png`, `tabIcons/`), and `r.json` (a stray domain lookup for trundle.app) in the repo root.

### 4. Unused feature code
`features/onboarding/step-test.tsx` (205 lines) isn't imported anywhere. It's in git
history if it's ever needed again.

### 5. `onboarding-flow.tsx` is 1,467 lines doing five jobs
1. The step machine: history, Back, edit-and-return, auto-advance timer (~150 lines)
2. The "apps fall asleep into the moon" measuring (~40 lines)
3. `renderStep`, the 400-line switch that says what each screen shows
4. Whole screens: the paywall + exit offer (~230), reveal (~110), math (~30)
5. 130 lines of styles shared by all of the above

Duplication inside it: the `link()` helper is written twice (plans and declined), the
"That's N hours in bed" warning twice, and there are two different app-summary helpers
(`appSummary` and an inline one in `plansStep`).

### 6. Small inconsistencies
- `app-tabs.tsx` uses double quotes; every other file uses single.
- `night-sky.tsx` and `tomorrow-demo.tsx` use `require('../../../assets/...')`; elsewhere uses `@/assets/...`.
- `ui.tsx` exports its `styles` object, which nothing imports.
- Dev tools (`/preset-lab`, `/text-lab`) sit next to real routes in `app/`.
- Dependencies never imported: `@expo/ui`, `expo-device`, `expo-font`, `expo-web-browser`.

## Target layout

```
src/
  app/                         routes only
    _layout.tsx
    onboarding.tsx
    (tabs)/  _layout, index, apps, nap, routine, profile
    (dev)/   preset-lab, text-lab          ← group folder: URLs stay the same
  theme/
    colors.ts                  ← constants/nocturne.ts (palettes, Nocturne)
    fonts.ts                   ← Fonts, DisplayFont, NUMBER_FONT, italicOverhang, DISPLAY_MAX_SCALE
    tokens.ts                  ← onboarding/tokens.ts (Space, Gap, Radius, Type, VoiceSize)
    index.ts                   ← one import: `import { Nocturne, Space } from '@/theme'`
  lib/
    haptics.ts                 ← onboarding/haptics.ts
    text.ts                    ← noOrphan
  hooks/
    use-compact.ts             ← onboarding/layout.ts
  components/                  shared by 2+ features
    app-background.tsx, app-tabs.tsx, placeholder-screen.tsx, glass-card.tsx
    night-sky.tsx              ← onboarding
    motion.tsx                 ← onboarding (Reveal, WordsIn)
    buttons.tsx                ← PrimaryButton, TextButton out of onboarding/ui.tsx
    app-icons/                 ← app-icons.tsx, ios-glyphs.tsx, app-picker.tsx
  features/
    onboarding/
      onboarding-flow.tsx      the step machine + page frame (~350 lines)
      steps.tsx                renderStep: what each step shows
      content.ts               copy, choices, step order, prices
      estimate.ts              the math and number formatting
      ui.tsx                   onboarding's page kit (Shell, Title, Voice, Options, HoldButton)
      screens/                 paywall.tsx, reveal-screen.tsx, math-screen.tsx, tomorrow-demo.tsx
      day-picker, time-wheel, schedule-card, apple-alert, reveal-grid,
      rolling-number, sleep-drop, simulated-prompt
    home/   home-screen.tsx, moon-lock.tsx
    apps/   apps-list.tsx, catalog.ts
    dev/    preset-lab/, text-lab/
```

`constants/` and the template components go away entirely.

## Deliberately left alone
- **The five palettes** in `colors.ts`: only `moonrise` ships, but `?palette=` is a live
  comparison tool. Cut it down to one once the palette is final.
- **The app's behaviour.** The refactor moves and splits code; screens should look and act the
  same. The one exception is removing the Expo-logo splash animation.
