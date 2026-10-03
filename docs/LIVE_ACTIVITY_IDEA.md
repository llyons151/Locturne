# Idea: Loc's moon in the Dynamic Island (v1.1)

Logged October 3, 2026. **v1.1, not launch.** The founder likes it; it waits until the
lock has proven reliable on real phones. Nothing here is built.

## The idea

While your apps are asleep, a small moon sits in the Dynamic Island (the black pill
at the top of the iPhone) and on the lock screen. It appears at bedtime and doesn't
go away until you've proved you're up. You can see the lock without opening anything.

It's also a shot for the videos: "the moon shows up at 11pm and won't leave until I'm
downstairs."

## What it's built on

Apps can't put icons in the status bar (time, battery). The only way to put something
there is a **Live Activity** (Apple's ActivityKit), the thing Uber, food delivery and
sports scores use. It shows:

- **Dynamic Island, compact:** a moon on the left and one short fact on the right
  ("7:00" at night, "Asleep" in the morning).
- **Dynamic Island, expanded (long-press):** his line, "Apps wake when you're up", and
  a button that opens `/wake`.
- **Lock screen banner:** the same, larger. iPhones without a Dynamic Island (SE,
  iPhone 13 and older) only get this.

Visual rules carry over: monochrome, the moon as it is in the app, **no glow** (CLAUDE.md).

## Two limits that shape the design

1. **It has to be started while the app is open, or by a push from a server.** Bedtime
   usually happens with Locturne closed, and the Screen Time extensions can't start a
   Live Activity. Starting it only when the app happens to be open in the evening would
   show the moon on some nights and not others, which breaks "never fail silently".
   **So: push-to-start** (iOS 17.2+), sent by a small server at the user's bedtime.
2. **A Live Activity runs about 8 hours at most** (then it can linger on the lock screen
   for a few more, but leaves the Dynamic Island). An 11pm–7am night just fits; the
   morning until you're up doesn't. **So: two activities.** A night one, pushed at
   bedtime, and a morning one, pushed at morning start, which the app ends the moment a
   proof is recorded (`proveMorning`). This also matches LAUNCH_PLAN §9, which found an
   overnight-only one wouldn't work.

| Phase | Compact | Ends |
|---|---|---|
| Night | moon · morning start time ("7:00") | at morning start (swapped for the morning one) |
| Morning | moon · "Asleep" (or steps, e.g. "137/200") | when a proof is recorded, or by the app on open |
| Day / night off | nothing | — |

## What it takes

- **A widget extension target** in `targets/`, set up like the three Screen Time
  extensions (Swift, compiled by EAS). Check the Expo Live Activity libraries before
  writing it by hand.
- **A push server.** A Cloudflare Worker (the founder's default host) with a scheduled
  job per user: it stores the push-to-start token and the bedtime and morning times,
  and sends to APNs at those times. Needs an APNs key in the Apple Developer account,
  and a routine edit must update the server (next-bedtime rule still applies).
- **Privacy:** this is the first time anything leaves the phone on a schedule (a push
  token and two times of day, no apps). Update the privacy page before it ships.
- **Honesty:** if the push doesn't arrive, nothing shows. The moon is a convenience,
  never the proof that protection is on; `/diagnostics` and Home stay the truth.
- **Effort:** about 4–6 founder-days including the server, plus device testing over
  several nights.

## Open questions to check when it's picked up

- Whether a Shield Action or Monitor extension can start or update an activity on
  current iOS (believed no; confirm in Apple's docs and on a device).
- Exact current time limits for Live Activities and push-to-start rate limits.
- Whether AlarmKit (also v1.1) gives a morning countdown presentation in the Dynamic
  Island for free, which could replace the morning activity.

## Order

After launch, alongside AlarmKit and the streak widget (GAME_PLAN Step 6). Before
starting: the overnight lock has passed the TestFlight gates (fewer than 1 in 50
nights missed).
