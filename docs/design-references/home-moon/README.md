# Home with the moon: references (2026-10-08)

Pulled from Mobbin. The Home screen has a big moon rising from the bottom edge, with
the blue haze reaching to about the middle of the screen. So the bottom third is taken.
Content has to live in the dark top half and not compete with the moon.

## The pattern that works

Every good example below treats the image as the **floor** of the screen, never as a
background that sits behind cards. Content goes in the empty sky above it, in three bands
at most:

1. A small top bar: date or status on the left, one icon on the right.
2. One hero: a big number or a headline, centred, with a single line under it.
3. One action or one pill sitting just above the horizon. Nothing sits on the moon.

Cards stacked over the image (Opal, Moonly, Hatch) are what make it feel busy.

## Picks

| File | App | What to take |
| --- | --- | --- |
| 01-oura-bedtime | Oura | Closest match. Night photo, serif headline "Bedtime's approaching", one line of body, one ghost button. Stat circles go in a row at the top, not in cards. |
| 02-stardust-planet-horizon | Stardust | Almost the same composition as ours: a planet arc at the bottom, a title in the sky. Proof that the moon can be the floor. |
| 03-lumy-horizon-moon | Lumy | Moon on a horizon line, a date pill at the top, a bar of ticks. Info in pills, not cards. |
| 04-calm-sleep-landscape | Calm Sleep | Landscape bottom, one centred line of text. The most restrained option. |
| 05-jomo-big-number | Jomo | Night sky, big "49min", a pill under it. Screen-blocker app, so the closest in purpose. |
| 06-tide-bottom-text | TIDE | Large thin "07" plus a date, left-aligned. Good type for a time or count. |
| 07-breathwrk-line-and-button | Breathwrk | Week dots at the top, a sentence in the middle, one big round button. |
| 08-calm-home-ring | Calm | Week check circles with a ring count. A model for the never-reset morning count. |

Mobbin links:
[Oura](https://mobbin.com/screens/f861b807-74b7-4bcb-a194-853f10408071) ·
[Stardust](https://mobbin.com/screens/4b867185-839e-4229-9a17-f73e08890522) ·
[Lumy](https://mobbin.com/screens/14d8bf9f-bc95-47c7-854a-ea2653871cb8) ·
[Calm Sleep](https://mobbin.com/screens/6f7e7e51-41d1-4694-bc72-0202e7aac5c1) ·
[Jomo](https://mobbin.com/screens/8c86b1cf-61de-4525-b194-d7bea5f893b9) ·
[TIDE](https://mobbin.com/screens/fd958674-4634-4456-94d9-81241e79b5c7) ·
[Breathwrk](https://mobbin.com/screens/b24f87fe-3a51-4063-ba53-cf96e9198b5b) ·
[Calm](https://mobbin.com/screens/5236d3fc-154c-4a08-8eb1-8da87069582b)

## The top section: what goes above the headline (2026-10-08)

Question: keep the four circles (Mornings, Apps, Bedtime, Wake), or swap Mornings for
screen time? Mockup: `mockup-oura-style.png`.

### Constraints first

- **Screen time can't be a number in our UI.** iOS only lets Apple's report extension
  (`DeviceActivityReport`) see usage. The JS app never gets the minutes (HOME_10.md #9). So a
  "2h 18m" circle can only be drawn *inside* the report extension, in SwiftUI, as its own
  little view. It's doable but it's native work, it can't show in the web preview, and it
  can't feed any of our own copy ("down 20%").
- **Evidence (HOME_10.md):** a usage number doesn't change behaviour (one sec, PNAS 2023;
  no RCT for Screen Time dashboards). The never-reset morning count is the proof of value
  that predicts renewal (RevenueCat). So Mornings is the circle to keep, not to cut.
- **Bedtime is shown twice** in the mockup: in its circle and in the headline. That circle is
  the weakest one.

### Options (Mobbin)

| | Top section | Reference | For | Against |
| --- | --- | --- | --- | --- |
| A | **Week strip**: 7 small circles, M–S, each filled when that morning was won; today ringed | Apple Fitness (`top-a`), Calm (`top-b`), Strava (`top-c`) | Shows the habit at a glance; dark-native in Apple Fitness; a miss is just an empty dot, not a broken streak | Week view resets each Monday unless a count sits next to it |
| B | **Week strip + count pill**: "23 mornings" pill top-left, week dots under it | Sweatcoin (`top-g`) pill + Strava dots | Never-reset count *and* the week; two lines, still light | Slightly busier than A |
| C | **Two numbers, no circles**: "Asleep 11 pm · Up 7 am" side by side, like a schedule summary | Apple Health Your Schedule (`top-f`), Eight Sleep | Calm, readable, sleep-app native | Duplicates the headline; no proof of value |
| D | **Screen time row**: today's screen time, pickups, time protected | Jomo (`top-d`), Forest (`top-e`) | Competitors do it; users expect it | Needs a native report view; numbers don't change behaviour; makes Home about usage, not mornings |
| E | **Keep 4 circles, swap Bedtime for "Time protected"** (hours the apps were asleep last night, which we *can* compute from the schedule) | Opal score circles (`top-h`), Oura | Keeps the Oura look; a number we own, that grows | "Protected" counts scheduled hours, not real non-use, so it must be worded honestly |

### Recommendation

**B.** A count pill ("23 mornings") plus a seven-day dot strip, and drop the circles. It
keeps the one number that proves the app works, shows the week without a streak that can
break, and frees the Bedtime and Wake values that the headline already says. Screen time
belongs further down or on its own screen (the existing `ScreenTimeChart`), not in the hero.
