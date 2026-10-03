# Humane exits and Scan your code

Built October 3, 2026 for GAME_PLAN's "Humane exits" and the third wake-up method.
Nothing here has run on an iPhone yet; the checklist at the end is what to try first.

## What was built

| Piece | Where | What it does |
|---|---|---|
| Passes | `src/lib/passes.ts` (+ tests) | 3 a month. A pass unlocks this morning without the wake-up method and ends a running Block now. Mornings only. |
| Emergency unlock | `src/lib/emergency.ts` (+ tests), `pauseNightUntil` in `src/lib/screen-time.ts` | Always available. Lifts the night or morning lock and a Block now session. Never the always-blocked list or a used-up limit. Every use is logged. |
| Scan your code | `src/lib/scan.ts` (+ tests), `src/features/scan/`, route `/scan` | Setup: a per-user QR (print or share it as a PDF) or a product barcode. Morning: scan it to unlock. Only the registered code counts. |
| Exits screen | `src/features/exits/`, route `/exits` (form sheet) | Pass, "I can't walk this morning" (goes to Scan) and emergency, behind a 10-second wait with "Go back to sleep" as the big button, then the system confirmation dialog. |

All three exits end the same way as the wake-up methods: `recordProof(...)` for the
morning, then `syncLock()`. Proof kinds: `pass`, `emergency`, `scan`.

### For other screens

- Routes: `/exits`; `/scan` (picks setup or morning itself), `/scan?mode=setup`,
  `/scan?mode=morning`.
- `getPassesLeft(now?)`, `getPassRefusal(now?)`, `spendPass(now?)`, `PASSES_PER_MONTH`.
- `previewEmergency(now?)`, `emergencyUnlock(now?)`, `getEmergencyLog()`,
  `getNightPause(now?)` (when tonight's paused lock comes back, or null; the home screen
  should say "Paused until 23:00" while it's set, because `readLock` still reports `night`).
- `getScanCode()`, `registerScanCode(...)`, `submitScan(data, now?)`.

## Decisions taken

1. **Passes: 3 a month, each lasts the rest of that morning** (until the next bedtime).
   Placeholder for open decision #4. One constant: `PASSES_PER_MONTH`. The allowance
   belongs to the month of the *morning* a pass unlocks, so with a 01:00 bedtime, 00:30
   on November 1 still spends October. No reset job: old months simply stop counting.
2. **Passes only in the `morning` phase.** Night: bedtime wins. Day and off: nothing to
   wake. One pass per morning.
3. **The emergency unlock pauses tonight only.** At night it wakes the bedtime apps for
   the rest of the night and counts the coming morning as unlocked; the next bedtime
   locks as usual. It never stops later nights.
   - *How it re-arms with nobody opening the app:* the night windows re-shield every 45
     minutes and the monitor extension marks the night held at each start, so a plain
     unshield would last until the next window. Disarming the windows would need the app
     to re-arm them. Instead `pauseNightUntil` parks the bedtime picks in the list's draft
     (`night-next`), the same path a list edit that removes apps uses, with `from` set to
     the next bedtime. Tonight's windows shield an empty list; at the next bedtime the
     extension's existing `settleLocturneLists` (or `settleListChanges` if the app opens
     first) swaps the picks back before shielding. No Swift changes were needed.
   - If a routine edit moves the next bedtime earlier, the earlier time is used.
   - In the morning it records the proof; in the day it only ends Block now. With nothing
     to lift it does nothing and logs nothing.
4. **The wait is 10 seconds** (`EMERGENCY_WAIT_SECONDS`), for passes too. Principle 10
   asks for a short delay and a dismiss button in front of every exit.
5. **Scan setup is only saved after a test scan.** A printed QR must be scanned from the
   printout; a barcode is whatever gets scanned. So nobody registers a code they can't
   scan at 7am.
6. **The code can only be set or changed while the apps are awake** (`day` or `off`).
   Otherwise you could register the cereal box next to the bed at 7am. Any change made in
   the day is in place before the next morning, so this is the next-bedtime rule.
7. **A scan unlocks whatever the routine's method is.** "I can't walk this morning" needs
   that. It proves the person walked to one spot, which is the accessible option.
8. **Barcodes match across UPC-A/EAN-13** (iOS reports a 12-digit UPC-A with a leading 0).
   URLs aren't accepted as codes: posters and menus change.
9. **Share and print are one control:** the system share sheet with a one-page PDF
   (`expo-print`), which already offers Print, Save to Files and AirDrop.

## Still the user's call

- **Open decision #4:** how many passes and how long each lasts.
- **Open decision #5:** confirm Scan as the accessible option.
- Whether the 10-second wait is right, and whether passes should wait at all.
- Whether frequent emergency use should get a gentle note (Principle 4 suggests pointing
  to real help when the can't-sleep path is used often; that path isn't built here).
- All of Loc's lines here are drafts for VOICE.md's line bank.

## Known gaps and risks

- **During a night pause the bedtime list looks empty** to the Apps tab
  (`selectionSize('night')` is 0) until the next bedtime. Its picker still opens on the
  real list (`beginListEdit` uses the draft while an edit is waiting). The Apps tab could
  show `getNightPause()`.
- **A photo of the QR on another phone** passes the scan. The daily tear-off sheet idea
  (WAKE_METHODS_100.md #40) is the fix if it turns out to matter.
- **New native modules:** `expo-camera` and `expo-print` need a fresh dev build. `qrcode`
  is plain JS. The camera plugin turns the microphone permission off.
- The extension reads `locturne.pendingLists` once per window start; the pause relies on
  that, so `settleLocturneLists` and `settleListChanges` must stay in step.

## On-device checklist

1. New dev build installs; the camera prompt shows the usage string, and no microphone
   prompt appears.
2. `/scan?mode=setup` during the day: the QR renders; "Print or share it" opens the share
   sheet with a PDF; Print shows the page.
3. Scanning the printout saves it. Scanning a different QR shows "Not that one."
4. Barcode setup: a coffee bag registers. A URL QR is refused.
5. At 03:00 (or with times moved), `/scan?mode=setup` says "Not from bed."
6. Morning: the registered code unlocks and the night apps wake; another barcode doesn't.
7. Passes: in the morning, a pass wakes the apps; the count drops; a second one the same
   morning is refused; at night the row says "Mornings" and refuses.
8. Emergency at night: apps wake within a second; the always-blocked apps stay shielded;
   they stay awake past the next 45-minute window; the next morning needs no proof; at the
   next bedtime the bedtime apps sleep again **with the app closed the whole day**.
9. Emergency in the morning wakes the apps; emergency during Block now ends the session.
10. "Go back to sleep" on the wait and on the dialog closes the sheet without changing
    anything.
11. `getEmergencyLog()` shows each use (diagnostics screen, once it exists).
