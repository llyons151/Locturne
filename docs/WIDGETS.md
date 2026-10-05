# Widgets and retention

Researched October 5, 2026, after the user asked whether widgets help retention. One
research pass, primary sources wherever they exist. Nothing here is adopted until it's
copied into [GAME_PLAN.md](../GAME_PLAN.md), which has a streak widget in v1.1.

Grades: **V** verified (primary source, numbers stated), **S** secondhand (repeated,
original not found), **U** unverified or not findable.

## 1. Short version

- **Widgets probably help, but nobody has published a trustworthy size.** Every
  industry number compares people who added a widget with people who didn't, and the
  people who add one were already more engaged.
- **Duolingo's "widget +60%" is a myth.** Duolingo's own post gives no percentage
  (§2). Never quote it.
- **The surface that fits Locturne best is StandBy.** A phone charging on the
  nightstand in landscape is exactly our user at bedtime, and StandBy refreshes don't
  count against the widget budget.
- **Widgets can't show Screen Time usage numbers** (Apple blocks it), but they can
  show Locturne's own state from the App Group: asleep, steps to wake, bedtime.

## 2. The evidence

| Claim | Grade | Source |
|---|---|---|
| Duolingo: widget users "had far better retention… even when controlling for" prior commitment; half of widget users have a 6-month+ streak. **No percentage.** | V | [Duolingo blog, Aug 2023](https://blog.duolingo.com/widget-feature/) |
| Duolingo "60%" | U, likely invented | Earliest found: an agency blog (Orizon, Feb 2025) with no source |
| Duolingo: a post-lesson widget promo with an animated how-to made installs "skyrocket"; they now run widget promos as a standing workstream | V | Same Duolingo post |
| Gratitude (Android): widget users retained 25% better; 10% of DAU adopted widgets. Observational, not an A/B test | V | [Android Developers Blog, May 2026](https://android-developers.googleblog.com/2026/05/how-gratitude-widgets-boosted-user-retention-25-percent.html) |
| UbiFit Garden: a randomized 3-month field trial (n=28). People with a glanceable activity display on their wallpaper kept exercising through the holidays; the control group slid. **The only causal evidence found.** | V | [Consolvo et al., CHI 2008](https://makeabilitylab.cs.washington.edu/media/publications/Consolvo_ActivitySensingInTheWildAFieldTrialOfUbifitGarden_CHI2008.pdf) |
| Locket, a widget-first app: ~5M sign-ups in 3 weeks (2022); 80M+ downloads, 9M+ DAU, profitable 2024 | V | [TechCrunch 2022](https://techcrunch.com/2022/08/02/locket-app-that-lets-yor-post-photos-to-your-loved-ones-homescreens-raises-12-5m), [2025](https://techcrunch.com/2025/08/06/photo-sharing-app-locket-is-banking-on-a-new-celebrity-focused-feature-to-fuel-its-growth) |
| Live Activities "correlate with higher 30-day retention" (no number); "23.7%" and "600% more sessions" | V / S | [OneSignal](https://onesignal.com/blog/unlocking-the-power-of-customer-engagement-insights-from-our-annual-report/); the figures are secondhand |
| Finch D1 54% / D7 37% (nothing isolates the widget) | U for widgets | [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl) |

Nothing was published on widgets for Headspace, Calm, Opal, one sec, Brick, ScreenZen,
BeReal, Structured or Streaks.

**Reading it honestly:** there's a plausible effect (UbiFit, plus Duolingo saying it
controlled for commitment), but its size is unknown. For copy, say "Duolingo reports far
better retention among widget users", not a number.

## 3. How many people add widgets

- Most people don't. Gratitude's **10% of daily users** is the best benchmark (V).
  A TidBITS reader survey found 14% heavy widget use on iPhone; "don't use" was the most
  common answer ([TidBITS 2024](https://tidbits.com/2024/01/15/do-you-use-it-widgets-see-middling-adoption/), small, non-representative).
- **iOS has no API to add a widget for the user**, still true at WWDC26 and iOS 27
  (Android has `requestPinAppWidget`). The user has to do it from instructions.
- What works: an animated how-to shown at a **success moment** (Duolingo, after a
  lesson). Widget prompts are spreading: 8.5% of 809 apps have one, mostly in
  onboarding ([Lazyweb](https://www.lazyweb.com/research/what-percent-of-apps-have-a-widget-surface.md)).

## 4. Surfaces

| Surface | Fit for Locturne | Notes |
|---|---|---|
| **StandBy** (charging, landscape, iOS 17+) | Best: the nightstand at bedtime | Two small widgets, scaled up, no background. In low light the system tints them monochrome red, so design without background colour. Refreshes are free. |
| **Lock Screen** (accessory circular / rectangular / inline) | Strong: the first thing seen on waking | "Apps asleep · 200 steps", a steps gauge. Monochrome. |
| **Home Screen** (small / medium) | Good: Loc's presence through the day | Finch-style: the character "living its life", tonight's bedtime. |
| **Live Activity** (Lock Screen + Dynamic Island) | Good for the morning walk | Already in v1.1 ([LIVE_ACTIVITY_IDEA.md](LIVE_ACTIVITY_IDEA.md)). 8-hour cap, so morning only. |
| **Control Center / Lock Screen control** (iOS 18) | Weak | Something like "Block now" at most. **Never an unlock button** (guardrails). |

No engagement data exists for any surface on its own.

## 5. Competitors

- **Opal:** its widget is only a "start session" shortcut. Staff said Apple won't let
  them show screen time or focus-score data in a widget, and users keep asking for more
  ([Opal community](https://community.opalapp.com/t/ios-widgets-that-show-focus-score/659)).
- **Jomo:** Lock Screen widgets for limits and screen time, some for paying users only.
- **Rise Science:** energy schedule, sleep debt, melatonin window, Smart Alarm control
  ([Rise](https://www.risescience.com/insights/iphone-widgets)).
- **Sleep Cycle:** an iOS 18 control, Lock Screen shortcut and Action button to start a
  night ([Sleep Cycle](https://sleepcycle.com/sleep-talk/ios18-update)).
- **Finch:** the pet in the widget with a daily progress bar.
- Nothing verifiable for Alarmy, Brick, ScreenZen, Bevel, Erly or Wayk. No review themes
  about anyone's widgets were found.

## 6. Feasibility

- **Build it as a fourth Swift target in `targets/`**, next to the three Screen Time
  extensions. It reads the same App Group state they already write. The other option,
  `expo-widgets` ([v57 docs](https://docs.expo.dev/versions/v57.0.0/sdk/widgets.md)), runs
  widgets in an isolated runtime limited to `@expo/ui` SwiftUI components and doesn't
  document StandBy or controls. It was alpha in SDK 55; check its v57 status before
  choosing it.
- **One more App ID** (e.g. `com.lukelyons.locturne.Widget`) in the App Group
  ([ENTITLEMENT_SETUP.md](ENTITLEMENT_SETUP.md)).
- **Refresh budget:** about 40–70 reloads a day. Locturne's states change at known
  times (bedtime, morning start), so a timeline can schedule those flips in advance
  without spending reloads. The app reloads the timeline on a proof, a settings save or
  a pass.
- **No Screen Time data:** `DeviceActivityReport` doesn't work in widgets
  ([Apple forums](https://developer.apple.com/forums/thread/792604)). Whether a widget
  could call `ManagedSettingsStore` is unconfirmed, and we don't want it to.

## 7. Accessibility

Use real text (VoiceOver reads it), support Dynamic Type up to AX5, give Loc's art an
`accessibilityLabel`, design for tinted and Always-On rendering, and keep one tap target
on inline accessories (Apple HIG). Nothing measures widgets reducing friction for
disabled users; that would be reasoning, not evidence.

## 8. Ideas for Locturne, ranked by evidence and effort

1. **StandBy / small "Loc status" widget.** States: day ("Bedtime 11:30"), night
   ("Apps asleep. So should you be."), morning ("200 steps to wake them"), awake. A big
   line of text and a monochrome raccoon silhouette, no background. Driven by a timeline
   from the App Group. Low effort, the most on-theme surface. Lines come from
   [VOICE.md](VOICE.md).
2. **Lock Screen accessories.** Rectangular: state plus steps or floors to go. Circular:
   a steps gauge. Low effort, reuses the same state.
3. **An install prompt after the first successful morning**, with a short animated
   how-to (Duolingo's pattern), plus at most a one-line mention in onboarding. Measure
   adoption against the ~10% benchmark.
4. **A forgiving count** if the widget shows progress: "nights kept this month", not a
   streak that resets ([NIGHT_PHONE_SCIENCE.md](NIGHT_PHONE_SCIENCE.md)).
5. **The morning Live Activity** stays as planned for v1.1.
6. **Skip:** Screen Time numbers (Apple blocks them), any unlock control, and a Control
   Center control unless there's spare time.

**Open decision for the user:** keep widgets in v1.1 as GAME_PLAN says, or pull the
StandBy/Lock Screen status widget (ideas 1–2) into v1. It's small, but it's another
target, App ID and device test during the busiest weeks before launch, and the evidence
says "probably helps", not "proven".
