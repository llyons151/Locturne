# Page transitions (2026-10-08)

The ask: research how to move between pages cleanly, then build it. This covers the four tabs
(Home, Apps, Routine, You). Pushed screens and sheets keep their native iOS transitions.

## What the sources say

| Source | Finding |
|---|---|
| Apple HIG, [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | "Don't add motion for the sake of adding motion." "In apps, generally avoid adding motion to UI interactions that occur frequently." Keep feedback motion brief and precise, never make people wait for it, and keep a stationary frame of reference. |
| Apple HIG, [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Tabs switch sections "while preserving the current navigation state within each section", with the tab bar always visible. UIKit's own tab switch is instant. |
| Material, fade through ([spec](https://m3.material.io/styles/motion/transitions/transition-patterns), [walkthrough](https://blog.stylingandroid.com/material-motion-fade-through/)) | The pattern for top-level destinations that aren't spatially related, like bottom-nav tabs. The outgoing page fades out completely first (about 100 ms), then the incoming page fades in and scales from 92% to 100% (about 200 ms). There's no slide, because tabs have no left/right relationship. |
| Emil Kowalski's animation guidance (secondhand summaries, e.g. [skills.sh](https://skills.sh/mrmps/smry/emilkowal-animations)) | Interaction frequency decides whether something animates at all. Product UI motion mostly stays under about 300 ms. Ease-out, never ease-in. |
| [React Navigation bottom tabs](https://reactnavigation.org/docs/bottom-tab-navigator/) | Supports `animation`, `transitionSpec` and a custom `sceneStyleInterpolator`. `progress` is 0 for the shown tab and ±1 for the others. |
| Mobbin | Only has still screens and flows, so it can't show motion. Tab flows (Linear, Garmin) only confirm that apps keep the tab bar fixed while the page above it changes. |
| Project memory | The app-sleep animation study picked a restrained transition, with no splashes and the moon untouched. |

## Decision: a quiet fade through

Built in `src/components/app-tabs.tsx`:
- **The sky, the moon and the tab strip never move.** Only the page on the panel changes. That's
  the stationary frame Apple asks for, and it's what makes the switch feel calm.
- **The old page is gone within about 40 ms, then the new one fades in.** It settles from 98% to
  100% size over 260 ms total (`Easing.out(Easing.cubic)`). The two pages barely overlap, so
  the sky never shows a double image.
- **The scale is 98%, not Material's 92%.** It's just enough to feel like the page settles,
  following the "restrained" lesson above.
- **No slide.** Tabs aren't spatially ordered.
- **Reduce Motion** keeps the same fade and drops the scale.

Measured in the web preview (Home → Apps): Home 1.00 → 0.16 at 65 ms → 0 at about 100 ms. Apps
0 → 0.21 at 115 ms → 0.94 at 215 ms → 1.00 at about 265 ms.

## Bug fixed on the way

On web, inactive tabs used to get `display: none` (added October 1). That cut the old page off
instantly, so the fade never played on web. It also made Reanimated replay Home's entrance with
`position: absolute`, which threw the top of Home out of place after a tab switch. The navigator
already fades hidden tabs to zero and detaches them, so the override is gone. Every tab was
checked after switching: nothing shows through.

## Not checked yet

On iPhone the same transition runs on the native driver. It still needs a look on a device.
