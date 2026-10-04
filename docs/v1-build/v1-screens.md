# v1 screens: Home, Routine, shield text, firsts, rating prompt

Written October 3, 2026, for GAME_PLAN "Build order" Step 4. Built on the shared
foundation (`routine.ts`, `lock-controller.ts`, `morning-proof.ts`, `lock-state.ts`)
while four other pieces (useLock, wake, exits, health/arming) were built in parallel.
Nothing here has run on an iPhone yet; the checklist at the end is for that.

## What was built

### Home on real state (`src/features/home/`)

- `use-home-state.ts`: reads `readLock()`, the routine and this morning's proof.
  Refreshes on every visit, on return to the foreground, on `onProofChange` (the wake-up
  screen records a proof, then comes back), and when `nextChange` passes while Home is
  open. Each refresh calls `applyShieldText`.
- `home-screen.tsx`: one look per phase, plus "not protected".

| | Night | Morning | Day | Night off | Not protected |
|---|---|---|---|---|---|
| Loc | "Shh. I'm sleeping. So are they." | "No." | "I'm awake. Technically." | "Night off. I'm sleeping anyway." | "Screen Time access is off." / "…isn't on yet." |
| Status | Apps asleep until you're up, after 7 am | What's left, by method ("Go down one floor and your apps wake up.") | Apps awake until 11 pm (or "Tonight is off.") | No lock tonight. Always-asleep apps still sleep. | The plain fix |
| Action | none | Go downstairs / Start walking / Scan my code → `/wake` | none | none | Open Settings, or Set up Screen Time → Apps |
| Links | Use a pass · Emergency unlock → `/exits` | same | none | none | none |

  The Apps row now shows the real count of night apps (Apple hides the names, so the fake
  icon tiles are gone). The Schedule row shows the routine in force. In development builds
  the state label still cycles the looks for review; in release builds it's plain text.
- `review-prompt.ts`: Apple's rating sheet (`expo-store-review`, installed with
  `npx expo install`), 2.5 s after Home shows a day unlocked by a real wake-up proof
  (never a pass or the emergency unlock), at most once per app version. Only Home calls
  it, so it can't appear in onboarding.

### Routine tab on the real store (`src/features/routine/`)

- Loads `getRoutine` and `getPendingRoutine` on every visit and edits what the person has
  set (the pending edit if there is one). Each change goes through `commit`, which calls
  `saveRoutine`, so nothing needs a Save button.
- The note says when it applies: "Your changes apply from tonight's bedtime, 11 pm",
  "from tomorrow night at 11 pm", "from Friday at 11 pm", or with the date past a week.
  Undo saves the active routine back; a pending copy equal to the active one counts as
  nothing waiting.
- `nights.ts` maps the screen's Monday-first nights (0 = Monday night) to `Date.getDay()`
  (0 = Sunday): `(night + 1) % 7` and back with `(day + 6) % 7`. `nights.test.ts` checks
  every night against a real calendar week and that a Sunday-only routine locks Sunday
  evening and Monday morning but leaves Tuesday morning free.
- The "Preview, not saved" footnote is gone on iPhone; off iPhone it now says blocking needs
  Screen Time.

### Shield text (`src/lib/shield-copy.ts`, tests alongside)

`shieldRule` picks one rule (iOS keeps one shield text for the whole app): night (with the
"Why are we awake." line from midnight to 5 am), morning, Block now, a used-up daily limit,
then always-asleep. `shieldCopy` gives each its words; `applyShieldText(state)` writes them
through `setShieldText`, reading the running nap and used-up limits itself because
`readLock` doesn't pass the daytime facts yet.

| Rule | Title | Subtitle | Button |
|---|---|---|---|
| night | Shh. I'm sleeping. So are they. | They wake up after 7 am, once you're out of bed. | Fine |
| lateNight | Why are we awake. | Your apps are asleep until you're up after 7 am. | Back to bed |
| morning | No. | Go downstairs, then open Locturne. That wakes them. (per method) | Fine |
| blockNow | Tucked in. Do not perceive me. | Napping until 3:30 pm. | Fine |
| limit | That's today's lot. | Your daily limit is used up. It wakes at midnight. | Fine |
| always | Shh. It's asleep. | You put this one to sleep. It stays that way for now. | Fine |

The always-asleep words are written to also be true of the night apps, because today the
night windows shield the apps at bedtime without changing the text (see the hand-offs).

### First night, first morning, first time up (`src/lib/first-run.ts`, tests alongside)

Shown on Home in place of his usual line, with one plain note underneath that the status
line doesn't already say:

| First | Line | Note |
|---|---|---|
| Night | First night. Phone down. I'm not asking. | In the morning they stay asleep until you get downstairs. Snoozing doesn't count. |
| Morning | So this is a morning. I hate it. | No stairs where you are? Walk 200 steps instead. (per method) |
| Up (real proof only) | You did okay. Don't make it weird. | That's the whole routine. Bedtime, then this again. |

Each first is stored (`locturne.firstRun` via `sharedSet`) with the morning key it was
first shown on, so it stays up for that whole night or morning and never returns. The
rating prompt's version is `locturne.reviewAskedVersion`.

## Hand-offs after merge

1. **useLock** (`use-home-state.ts`, `TODO(useLock)`): swap the local hook for `useLock()`
   and move the `applyShieldText` call into `syncLock` (`applyShieldText(syncLock())`
   works: `now` and the routine default).
2. **useHealth** (`home-screen.tsx`, `HEALTH SLOT` / `TODO(useHealth)`): replace
   `useProtection()` with the health status. The view already switches to "not
   protected" and replaces Loc's line, status and action.
3. **armRoutine** (`routine-screen.tsx`, `commit`, `TODO(armRoutine)`): the single call
   site to re-arm the night windows after an edit.
4. **`/wake` and `/exits`** are pushed as `'/wake' as Href` and `'/exits' as Href` so the
   typed routes compile before those routes exist. Drop the casts after merge. Exits gets
   no params; add `?kind=pass` if that screen wants to open on a tab.
5. **Lock controller** (not edited): `readLock` passes no daytime facts, so
   `LockState.blockNowUntil` is always null. `applyShieldText` covers for it.
6. **Routine store** (not edited): a `clearPendingRoutine()` would make Undo cleaner than
   saving a pending copy of the active routine.
7. **Install day** (not edited, worth deciding): onboarding's first `saveRoutine` applies at
   once, so a 3 pm install on an active-night day reads as `morning` until a proof. Home
   then shows the first-morning script and "Go downstairs" though nothing is shielded.
   Suggest treating mornings before the first saved night as unlocked in `readLock`.
8. **Shield text with the app closed, without Swift changes:** the library can store named
   shields (`updateShieldWithId(config, actions, shieldId)`), and a `blockSelection`
   action accepts a `shieldId`, which the monitor extension copies into the live shield when
   it fires. So: register `locturne-night`, `locturne-limit` and `locturne-block` once from
   `shield-copy.ts` (needs a small `setNamedShieldText` in `screen-time.ts`), then add
   `shieldId: 'locturne-night'` to the night windows' `blockSelection` action in `armNight`,
   `'locturne-limit'` to `armLimit`'s threshold action, and `'locturne-block'` to the nap.
   The morning needs an action at the last window's `intervalDidEnd` carrying the morning
   shield. Then the always-asleep words can be specific again.

## What the Swift ShieldConfiguration extension would need

To pick words per app and per rule with the app closed (not built; no Swift was edited):

- **Which rule holds this app.** The extension gets an app token. The library's
  `getPossibleFamilyActivitySelectionIds` can list the selection ids that contain it
  (`night`, `always`, `block`, `limit-0`…), but by default only for selections tied to a
  monitored activity name, which `always` isn't. Call it with
  `onlyFamilySelectionIdsContainingMonitoredActivityNames: false`, then order the matches
  by precedence: always, night/morning, block, limit.
- **The phase.** Read `locturne.routine` (and its pending edit) and
  `locturne.morningProofs` from the App Group and port `currentMorning` and
  `getLockState`'s phase rule to Swift, or have the app and monitor extension write a small
  `locturne.phase` record (`{ phase, until }`) at each boundary for the shield to trust.
  The memory limit is small, so prefer the record.
- **The words.** A dictionary of rule → `{ title, subtitle, button }` written by
  `shield-copy.ts` into the App Group (method and times already filled in), so the copy
  stays in one place in TypeScript. The extension only chooses a key. The library already
  reads per-selection configs from `shieldConfigurationForSelection_<selectionId>`, which
  covers the per-list part without new Swift; only the night/morning split needs the phase.
- **The 2 am line** needs the current hour at render time, which only the extension has.

## Icon and splash assets needed

The template ones are still in `app.json` (an Expo symbol on blue). No mascot art. The
person makes these; then `app.json` needs the paths and the splash colour (not edited here).

| Asset | Size and format | Notes |
|---|---|---|
| iOS app icon (Icon Composer) | `assets/locturne.icon` bundle; layers as SVG or 1024×1024 PNG | Replaces `assets/expo.icon`. Light, dark and tinted (mono) appearances. No glow in the layers. |
| Fallback icon | `assets/images/icon.png`, 1024×1024 PNG, opaque, square corners | Used by `expo.icon` and older iOS. Same mark as above. |
| Splash mark | `assets/images/splash-icon.png`, 1024×1024 PNG with transparency, mark centred with padding | Shown at `imageWidth` about 120–200. |
| Splash background | colour, not a file | Nocturne near-black `#0B0B0C` (matches the shield's background) instead of `#208AEF`. |
| Shield icon (optional) | 180×180 PNG with transparency, white | Default is SF Symbol `moon.zzz.fill`. A custom file goes in the App Group via `iconAppGroupRelativePath`. |
| Web favicon | 48×48 PNG | Web preview only. |
| Android adaptive icon | foreground and background 1024×1024, monochrome 432×432 | Android isn't shipping; can stay as is. |

App Store screenshots and the marketing icon come from the Icon Composer file and the real
app, not separate art.

## On-device test checklist

Home
- [ ] Night (after bedtime): "Shh…" line, lock closes with one click, "Apps asleep until
      you're up, after 7 am", pass and emergency links open `/exits`.
- [ ] Morning: "No.", the method's task line, the button names the method and opens
      `/wake`. After a proof, Home switches to day without reopening (onProofChange).
- [ ] Day: "Apps awake until 11 pm"; with tomorrow's night off, "Tonight is off."
- [ ] Leave Home open across morning start or bedtime: it changes on its own.
- [ ] Revoke Screen Time in Settings, come back: "Screen Time access is off." replaces all.
- [ ] Release build: the state label isn't tappable.
- [ ] VoiceOver: Loc's line reads as a header, the status reads once, the Apps and Schedule
      rows read their full labels, links read as buttons. Largest text size doesn't clip.

Firsts and rating
- [ ] Fresh install: first night line all night, gone the next night.
- [ ] First morning line until unlocked; "You did okay" after a real wake-up, not after a
      pass or emergency.
- [ ] Rating sheet appears about 2.5 s after the first real unlock (TestFlight shows no
      sheet; check with a development build), and not again on the same version.

Routine
- [ ] Edit bedtime at 3 pm: note says "from tonight's bedtime, 11 pm". At 1 am: "from
      tomorrow night…". Undo removes the note.
- [ ] Turn Sunday night off: Monday morning has no lock; the lock screen agrees.
- [ ] Kill and reopen the app: edits are still there; after bedtime the note is gone and
      the new routine is in force.

Shield
- [ ] Open a night app at 11:30 pm and at 2 am (after opening Locturne): "Shh…" then
      "Why are we awake."
- [ ] Morning before the proof: "No." with the method's instruction.
- [ ] During a nap, after a limit is used up, and an always-asleep app at noon.
- [ ] Close the app all day, then open a night app after bedtime: today it shows the
      always-asleep words (expected until hand-off 8).
