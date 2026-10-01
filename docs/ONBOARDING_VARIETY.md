# Onboarding: breaking up the look-alike screens

September 25, 2026. Feedback on the onboarding was that most pages look the same.
This is the audit of why, and which screens to change.

## Why it reads as one screen repeated

Every page shares the night sky, the same drift entrance, and one of three layouts:

| Layout | Screens |
| --- | --- |
| **A. Serif line + gray paragraph, centered** | intro, stat, tried-echo, math, screen-time, motion, armed, done (plus declined, under-13) |
| **B. Title + stacked pill options** | nights, night-minutes, nights-per-week, morning-minutes, alarm, tried, time-back |
| **C. Title + label/text rows** | deal, ready, offer, first-morning |

Already distinct: hello (moon), bedtime / wake / age (wheels), reveal (rolling number
and grid), tomorrow (iPhone demo), commit (hold button), plans (paywall).

The long runs are the problem: intro → time-back is 13 screens with only the wheels
breaking it up, and screen-time → done is mostly A and C back to back.

**Rule going forward:** about every third or fourth screen, the main thing on screen
should be an object or an interaction, not text. Get variety from form (inputs,
mock UI, live data, motion), not color: Nocturne stays monochrome, no glow, and
italic serif still means only Loc is talking.

## Changes, in priority order

1. **motion → live step test.** "Stand up. Ten steps." A big numeral counts real
   steps (Pedometer / CMPedometer) from 0 to 10, then the button unlocks. "I'm in
   bed" skips it. Most memorable screen in the flow, and it proves the core
   mechanic works before they pay.
2. **screen-time → picture of Apple's dialog.** A dimmed, non-interactive drawing of
   the Screen Time sheet with a pointer at Continue, replacing the "Next, from
   Apple" text box. Blockers like Opal do this. Keep it clearly an illustration
   so it can't be mistaken for the real alert.
3. **nights-per-week → seven day circles** (M T W T F S S). Tap the nights; the
   count is the answer. A different input type in the middle of the quiz.
4. **ready → one schedule card.** Bedtime big on the left, wake time on the right,
   a moon-to-footsteps line between, and the picked apps' icons (`BrandIcon`)
   underneath. Keep the Change links. This is the setup payoff and should look
   like an object, not rows of text.
5. **tried-echo → shield comparison.** Screen Time's limit shield with its "Ignore
   Limit" button next to Locturne's shield showing "200 steps to go". For answers
   other than Screen Time, show only Locturne's shield. The real block screen
   needs this design anyway.
6. **armed → live countdown to bedtime.** Big ticking numerals ("Lock in
   3:12:40"), or "Starting now" late at night.
7. **time-back and alarm → icon tiles** in a 2-column grid (SF Symbols) instead of
   stacked pills.
8. **Cut intro.** It's a text screen promising questions. Move "your answers stay
   on your phone" into the first question's subtitle. One fewer look-alike screen.
9. **math → progress ring** counting to 100% with the three lines ticking under it.

## Built (September 25, 2026)

- **1, motion:** now a live step test (`step-test.tsx`). It sits where the Motion &
  Fitness screen was, between apps and ready. The permission is asked at the moment
  it's used, and the walk proves the mechanic just before the schedule card and the
  pledge. Uses `expo-sensors` Pedometer. Web and simulators simulate the steps and
  say so. If access is denied, a screen links to Settings. "I'm in bed" skips the test.
- **2, screen-time:** `apple-alert.tsx` draws Apple's Screen Time alert as a
  captioned, non-pressable picture, with a bobbing finger on Continue. Wording and
  layout match a real screenshot (Continue on the left, bold Don't Allow on the right).
- **3, nights-per-week:** `day-picker.tsx` shows seven day circles, a big count
  and an "Every night, honestly" shortcut. Stored as `scrollDays`, and the count
  feeds `nightsPerWeek`.
- **4, ready:** `schedule-card.tsx` shows lights-out and alarm times, the 200-step
  line, the app icons and the Change links.

## Leave alone

The other list questions (a consistent quiz is fast, and that's fine), hello, the
wheels, stat, reveal, tomorrow, commit, offer and plans. The paywall pages copy
proven layouts on purpose.
