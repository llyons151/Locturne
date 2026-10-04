# Device test script (v1, one iPhone)

Written October 3, 2026 from the code as it stands, not from the per-feature docs. It
replaces the scattered checklists in [INTEGRATION.md](INTEGRATION.md),
[morning-engine.md](morning-engine.md), [exits-and-scan.md](exits-and-scan.md),
[status-and-notifications.md](status-and-notifications.md), [onboarding.md](onboarding.md),
[v1-screens.md](v1-screens.md) and the test steps in [../DEVICE_SPIKE.md](../DEVICE_SPIKE.md).
Where those docs and the code disagree, this script follows the code; the differences are
listed at the end.

**Cost: one day session (about 5 hours; it can be split over two afternoons), then 3 nights,
then a 5-minute check at bedtime on day 4.** Do the day session first: it finds most bugs
without spending a night.

Log results under "Results on the iPhone" in [../DEVICE_SPIKE.md](../DEVICE_SPIKE.md), one
line per step ID (pass/fail, the time, and what you captured).

---

## 0. Prerequisites

### 0.1 Builds

The installed build (`c26d2c10`) is too old: the Swift extensions changed (heartbeat,
off-night skip) and camera, print, notifications and store-review are new native modules.
Build both from the **same commit** and write the commit hash and both EAS build IDs at
the top of your results.

- [ ] `eas build --profile development --platform ios` is for the day session. Run
  `npx expo start` on the laptop and open the project in the dev build (same Wi-Fi). The
  dev build gives you red-box errors, Metro logs and the **Screen Time lab** link.
- [ ] `eas build --profile preview --platform ios` is for the nights. The JS is embedded, so
  the app opens in the morning with the laptop off. A dev build can't load in the morning
  unless Metro is still running and reachable.
- [ ] If either build fails at provisioning on `aps-environment`, the cause is the
  `expo-notifications` plugin (status-and-notifications.md). Report it. Don't edit the code
  during the test run.
- Install from the build's page on expo.dev (Install button or QR code).

### 0.2 Phone setup

- [ ] Developer Mode on. You're signed in to iCloud. Set Date & Time to Set Automatically,
  and don't travel or change the time zone during the test.
- [ ] Pick the test apps. Built-in Apple apps are easiest (Podcasts, Books, Stocks, Tips,
  News, Weather, Maps):
  - **BED1, BED2**: go in "Sleep at bedtime".
  - **ALW**: goes in "Always asleep".
  - **NAP**: only for Block now picks.
  - **LIM**: daily limit. In the day session, use an app you've already used for 15+ minutes
    today (Settings → Screen Time shows usage).
- [ ] Laptop logs (Linux): install libimobiledevice (`pacman -S libimobiledevice`) and run
  `idevicepair pair`.

### 0.3 Capture kit (the "CAPTURE" in each fail line means all of this)

1. **Screenshot** of what you saw (side + volume up).
2. **Diagnostics report:** You tab → Help → **Beta diagnostics**, or open
   `locturne://diagnostics` in Safari. Tap **Share report**, then Copy, and paste it into a
   note named after the step ID.
3. **System log** around the event, from the laptop:
   `idevicesyslog | grep -Ei 'ActivityMonitor|Shield|DeviceActivity|ManagedSettings|locturne|react-native-device-activity'`
   The monitor extension logs `intervalDidStart`, `intervalDidEnd` and
   `eventDidReachThreshold` under subsystem `com.lukelyons.locturne.DeviceActivityMonitor`. On a
   Mac, Console.app can filter on that subsystem.
4. **Crash and memory kills:** `idevicecrashreport -e -k ./crashes`, or on the phone Settings →
   Privacy & Security → Analytics & Improvements → Analytics Data. Look for `JetsamEvent-*` and
   `ActivityMonitorExtension*` files.
5. **JS errors** (dev build only): the Metro terminal output and the red box.

### 0.4 Resets

- **Full reset:** delete Locturne (long-press → Remove App → Delete App), then reinstall from
  the same EAS link. This clears the App Group (routine, proofs, passes, firsts, scan code,
  heartbeat) and Screen Time access. Expected: iOS also drops Locturne's shields and
  schedules. **After the first reinstall, open BED1 and ALW: they must open normally.** If
  either is still shielded, CAPTURE and note it; that's a platform finding.
- **One morning per calendar date per install.** A proof is keyed by the morning's date, and
  `recordProof` refuses a second one for the same date
  ([src/lib/morning-proof.ts](../../src/lib/morning-proof.ts)). To test another unlock on the
  same day, do a full reset.
- **Schedule-only reset (keeps the install):** open the **Screen Time lab** (dev build: You →
  Developer → Screen Time lab. preview build: `locturne://screen-time-lab` in Safari, which works in
  development and EAS preview builds only (`EXPO_PUBLIC_DEV_LABS`; see
  [APP_REVIEW_AUDIT.md](../APP_REVIEW_AUDIT.md))) and tap
  **Disarm schedule**. The next single Routine-tab change then applies at once and re-arms.
  Every later change waits for bedtime again, so disarm before each one. The time pickers
  count each wheel turn as one change, so turn only one wheel per disarm.
- **Escape hatch** if a test leaves you stuck in a locked morning: lab → **Disarm schedule**,
  then switch to another app and back. With nothing armed the morning reads unlocked and the
  bedtime apps wake.
- **Don't use** the lab's "Arm bedtime schedule", "Arm test night", "Morning check", "Put
  them to sleep" or the 15-minute steppers. They bypass the saved routine, and the next time
  Locturne comes to the foreground `syncLock` re-arms the routine's windows and wakes the
  bedtime list outside the routine's night. The only lab buttons used here are **Disarm
  schedule** and **4. Wake them** (in A9). Also leave Home's gear icon alone (it reruns
  onboarding) and the dev-only state label (it only previews looks).

### 0.5 How short test nights work

- Onboarding's time wheels take any minute. The first save on a fresh install applies at
  once, so a bedtime 10–15 minutes away works.
- A night shorter than 15 minutes is refused ("Tonight isn't set"). iOS refuses windows under
  15 minutes.
- Windows: a 50-minute night gets 2 windows of 25 minutes (`night-0`, `night-1`); a 30-minute
  night gets 1.
- A night whose bedtime and morning fall on the same afternoon belongs to **yesterday
  evening** in the rules (a night belongs to the evening before its morning). That matters
  for the off-night run.
- Test schedules repeat daily at the same clock time until the next full reset.

---

## 1. Day session

Run A uses the dev build. Runs B–D each start with a full reset. If you split the session,
end the first afternoon after Run A.

### Run A: fresh install, real night windows, downstairs (about 2 hours)

**Setup**

- [ ] **A1. Install and open.** Full reset, then open the app.
  *Expect:* onboarding opens by itself (`hello`).
  *Fail →* CAPTURE. Culprit: `src/hooks/use-app-start.ts`.
- [ ] **A2. Onboarding to Screen Time.** Go through the quiz. On `bedtime`, set **now + 15
  min**. On `wake`, set **bedtime + 50 min**. On the stairs question ("Are there stairs
  between your bed and your coffee?"), tap the Yes choice; Loc's reaction appears, then
  **Continue**. On `screen-time`, tap **Continue**.
  *Expect:* Apple's Screen Time prompt, then Face ID or the passcode.
  *Optional:* tap Don't Allow first. Expect "No access, no sleeping apps.", **Try again**
  (prompts again) and **Open Settings**.
  *Fail →* CAPTURE. Culprit: `src/features/onboarding/onboarding-flow.tsx`,
  `requestAccess` in `src/lib/screen-time.ts`.
- [ ] **A3. Apps.** **Add apps** → Apple's picker with header and footer text → pick BED1 and
  BED2 → Done.
  *Expect:* the card shows "2 PICKS" with native icons and names. The button reads **Put them
  to sleep**. On `ready`, no screen names an app ("Your apps").
  *Fail →* CAPTURE. Culprit: `src/components/screen-time-picker.tsx`,
  `modules/blocked-apps/`.
- [ ] **A4. Pay and arm.** `commit`: hold **Hold to agree** → `offer` → `plans` (the fine print
  says "Preview: nothing is charged.") → buy annual.
  *Expect:* "Setting tonight.", then "Armed. See you at {bedtime}.". **Continue** shows the
  Motion & Fitness prompt; allow it. `first-morning` reads "... Your apps stay asleep until
  you're up." Tap **Done**.
  *Diagnostics:* Armed night shows your times, **Windows armed 2**, **Windows iOS monitors
  2**, Night held no. Self-check says "none to check yet". Routine shows your times and
  Wake-up `downstairs`.
  *Fail →* if you see "Tonight isn't set.", note the reason line, then CAPTURE plus syslog.
  Culprit: `src/features/onboarding/arm.ts`, `armRoutine` in `src/lib/lock-controller.ts`,
  `armNight` in `src/lib/screen-time.ts`, `src/lib/wake/arming.ts`.
- [ ] **A5. Install-day Home.** *Expect:* "Today" with "I'm awake. Technically." and "Apps
  awake until {bedtime}". Not "This morning" or "Go downstairs".
  *Fail →* CAPTURE. Culprit: `armedInTime` in `src/lib/lock-state.ts`, `readLock`.
- [ ] **A6. Always asleep.** Apps tab → Always asleep → **Add apps** → ALW → Done.
  *Expect:* ALW is shielded at once. Its shield reads **"Shh. It's asleep."** / "You put this
  one to sleep. It stays that way for now." / **Fine**. Fine closes it to the Home Screen.
  *Fail →* CAPTURE. Culprit: `finishListEdit`/`reapplyStandingBlocks` in
  `src/lib/screen-time.ts`, `src/lib/shield-copy.ts`.

**Bedtime with Locturne closed (gate 1, short form)**

- [ ] **A7. Close Locturne** (swipe it away in the app switcher) at least 2 minutes before
  bedtime. Don't open it again until A9.
- [ ] **A8. Bedtime + 1 min:** open BED1.
  *Expect:* the shield shows **"Shh. I'm sleeping. So are they."** / "They wake up after
  {morning start}, once you're out of bed." / **Fine**. Tapping Fine closes the shield; it
  never opens Locturne (platform limit). At **bedtime + 26 min** (after `night-1` starts),
  BED2 is still shielded.
  *Fail →* if BED1 opens, wait for `night-1` at +25 min and check again. Then CAPTURE with the
  syslog (did `intervalDidStart` run?). Culprit: `intervalDidStart` and `locturneNightIsOn`
  in `targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift`, the
  `blockSelection` action in `armNight`. Wrong words: `setNightShieldText` in
  `src/lib/screen-time.ts`, `targets/ShieldConfiguration/`.
- [ ] **A9. Open Locturne (about bedtime + 27).**
  *Expect on Home:* "Tonight", **"First night. Phone down. I'm not asking."** with its note,
  "Apps asleep until you're up, after {morning}", and the links **Use a pass** · **Emergency
  unlock**.
  *Diagnostics:* the heartbeats show `night-0 intervalDidStart · shield up` at bedtime and
  `night-1 intervalDidStart · shield up` 25 minutes later (`intervalDidEnd` rows may appear
  too). Self-check shows today's date as `onTime, first window …`. Status reads Level `ok`,
  "Bedtime is set.". Night held yes, Any shield up yes.
  *Fail →* CAPTURE. Culprit: `recordLocturneHeartbeat` (Swift), `src/lib/heartbeat.ts`,
  `checkNights` in `src/lib/health.ts`, `src/features/dev/diagnostics/report.ts`.

**Night-phase checks (the app may be open now)**

- [ ] **A10. Missed-window recovery.** Lab → **4. Wake them** → open BED1 (it opens) → switch
  back to Locturne → open BED1 again.
  *Expect:* shielded again. Diagnostics shows Night held yes.
  *Fail →* CAPTURE. Culprit: the `asleep && !isNightHeld()` branch of `syncLock`,
  `src/hooks/use-standing-blocks.ts`.
- [ ] **A11. Block now ending mid-night.** Nap tab → **Bedtime apps** → **Tuck him in**.
  *Expect:* "Your bedtime apps are already asleep."
  Then **Pick apps** → Apple's picker → BED1 + NAP → 15 min → **Tuck him in**.
  *Expect:* NAP is shielded and the Nap tab says "Tucked in. Do not perceive me." / "Apps
  asleep until …". Close Locturne. After the nap ends (+1 min): NAP opens and **BED1 stays
  shielded**. Diagnostics shows `locturne-nap intervalDidEnd · shield up`.
  *Fail →* CAPTURE. Culprit: `startNap`/`endNap` in `src/lib/screen-time.ts`,
  `intervalDidEnd` and `reapplyLocturneBlocks` in the Swift monitor.
- [ ] **A12. Night refusals** (do these while the nap runs):
  - `locturne://wake` in Safari shows **"Shh. Not yet."** / "Bedtime wins. Stairs and steps
    start counting at {morning}." / Close.
  - Home → **Use a pass** opens the exits sheet: "Why are we awake.". The **Use a pass** row
    shows **Mornings**; tapping it shows "Passes work in the morning, while your apps wait for
    you to get up." Emergency unlock shows "Always here" (don't use it). **Go back to sleep**
    closes the sheet.
  - You → **Can't walk or use stairs** shows **"Not from bed."** + Okay.
  - Routine → Step target → 300. *Expect:* "Your changes apply from tomorrow night at
    {bedtime}. Until then, the old routine stays." + **Undo**. Tap Undo: the note goes away.
  *Fail →* CAPTURE. Culprit: `src/features/wake/wake-screen.tsx`, `src/lib/passes.ts`,
  `src/lib/scan.ts`, `src/lib/routine.ts`/`src/features/routine/routine-screen.tsx`.

**Morning (gate 2: downstairs on real stairs)**

- [ ] **A13. Leave Home open across morning start.**
  *Expect:* without touching anything, Home switches to "This morning": **"So this is a
  morning. I hate it."** with "No stairs where you are? Walk 200 steps instead.", "Go down
  one floor and your apps wake up. About 20 seconds." and a **Go downstairs** button. BED1's
  shield now reads **"No."** / "Go downstairs, then open Locturne. That wakes them." / Fine.
  Tapping Fine closes it. No notification arrives (see discrepancy 1). Diagnostics →
  Notifications shows Permission `undetermined`.
  *Fail →* CAPTURE. Culprit: the boundary timer in `src/hooks/use-lock.ts`,
  `applyShieldText`/`shieldTextFor`.
- [ ] **A14. An edit doesn't unlock.** Routine → Step target 300 → back to Home.
  *Expect:* still "This morning". Undo the edit.
  *Fail →* CAPTURE. Culprit: `src/lib/routine.ts`, `src/lib/wake/arming.ts` (defer).
- [ ] **A15. Downstairs rules, before the real unlock.** Home → **Go downstairs**. In bed:
  1. **Start**, then lie still for 5 minutes. *Expect:* the meter stays under ~0.3 m, never
     "Hold", then "Five minutes and no stairs. Start again." with **Start again**.
  2. **Start again**, press the side button to lock, unlock. *Expect:* back to **Start**.
  3. **Walk 200 steps instead** shows the steps view (don't reach 200), then **Go downstairs
     instead**.
  4. **Start**, walk down a few steps and straight back up. *Expect:* no unlock.
  *Fail →* CAPTURE plus the metres shown. Culprit: `src/lib/wake/downstairs.ts`,
  `src/features/wake/use-downstairs.ts`.
- [ ] **A16. Unlock.** **Start**, carry the phone down one floor, stay there.
  *Expect:* the meter climbs, then "Hold 5 s" counts down, then "Floor reached." and **"I'm
  up. Don't talk to me yet."** with "Apps awake until {bedtime}" and **Done**. Write down the
  peak metres. BED1 and BED2 open; **ALW stays shielded**. Home shows **"You did okay. Don't
  make it weird."**; the rating sheet may appear about 2.5 s later (iOS decides).
  Diagnostics → Morning proofs shows today `downstairs at …`, Night held no.
  *Fail →* CAPTURE. Culprit: `proveMorning`/`syncLock` in `src/lib/lock-controller.ts`,
  `src/lib/morning-proof.ts`, `wakeApps` in `src/lib/screen-time.ts`.

**Afternoon controls (same install, day phase)**

- [ ] **A17. Day shield words.** Open ALW. *Expect:* "Shh. It's asleep." / "You put this one
  to sleep. It stays that way for now."
- [ ] **A18. Daily limit.** Apps → **Add a daily limit** → LIM → Done.
  *Expect:* a "Daily limit" row at 30 min. Change it to **15 min** in its menu (tighter,
  applies now). Because LIM's earlier use today counts, LIM is shielded within a minute, and
  the row says "Used up today. Back at midnight." Open Locturne, then LIM: **"That's today's
  lot."** / "Your daily limit is used up. It wakes at midnight." Change it to **30 min**.
  *Expect:* "Goes up to 30 min at bedtime." and LIM stays shielded.
  *Fail →* CAPTURE (look for `limit-0 eventDidReachThreshold` in heartbeats). Culprit:
  `armLimit` in `src/lib/screen-time.ts`, `src/lib/daily-limits.ts`,
  `eventDidReachThreshold` in the Swift monitor, `src/features/apps/apps-list.tsx`.
- [ ] **A19. Block now by day.** Nap → **Pick apps** (BED1 + NAP) → 15 min → **Tuck him in**.
  *Expect:* NAP's shield reads "Tucked in. Do not perceive me." / "Napping until {time}."
  **Wake him early** shows the alert "Wake him early?"; **Keep napping** changes nothing; **Wake
  him** wakes NAP and BED1. ALW and LIM stay shielded.
- [ ] **A20. Emergency ends Block now.** Start another 15-minute nap. Home → **Emergency
  unlock** → wait screen "Is it an emergency." with the body "Your Block now session ends. The
  always-blocked list stays asleep." and a 0:10 countdown. **Go back to sleep** closes with no
  change. Open it again, wait, tap **Unlock anyway** → dialog "Unlock now?" → **Unlock**.
  *Expect:* "I'll allow it. This once. Maybe."; NAP wakes; ALW and LIM stay shielded. Open the
  exits again with nothing napping: Emergency shows "Nothing asleep", and tapping it shows
  "Nothing is asleep that an emergency unlock can wake. …"
  *Fail →* CAPTURE. Culprit: `src/lib/emergency.ts`, `src/features/exits/exits-screen.tsx`.
- [ ] **A21. (Optional) Shake test.** On a fresh morning only (Run B, before walking): open
  the steps view and shake hard for 20 s. Note how many steps it credits. That sets whether
  the 4 steps/s cap in `src/lib/wake/steps.ts` needs tightening.

### Run B: steps, buy after bedtime, Block now survives the proof (about 35 minutes)

- [ ] **B1. Setup.** Full reset. In onboarding, set bedtime to **5 minutes in the past** and
  wake to **now + 20 min**. On the stairs question choose No (steps). Pick BED1 and BED2,
  then buy.
  *Expect:* **"Armed. Starting now. Put it down."**; BED1 is shielded right away; the last
  screen's button reads **Good night**. Diagnostics shows Night held yes; Self-check doesn't
  list tonight (it started before the arm, which is expected).
  *Fail →* CAPTURE. Culprit: the `phase === 'night'` branch of `arm()` in
  `src/lib/lock-controller.ts`.
- [ ] **B2. Night steps don't count.** Walk about 30 steps now.
- [ ] **B3. Block now across the proof.** Nap → **Pick apps** (NAP only) → **1 hr** → **Tuck
  him in**.
- [ ] **B4. Steps with the app closed.** Close Locturne. After morning start, walk about 50
  steps, then open Locturne.
  *Expect:* Home shows "Walk 200 steps and your apps wake up. Steps since {morning} count."
  and a **Start walking** button. The steps view starts at about **50, not 80**, within about
  10 s.
  *Fail →* CAPTURE. Culprit: `src/features/wake/use-step-count.ts`, `src/lib/wake/steps.ts`.
- [ ] **B5. Live count.** Walk with the screen on.
  *Expect:* the number climbs every 2–3 s. The line changes at 80 steps ("I can hear you
  walking. I'm ignoring it.") and at 160 ("Fine. Fine."). Halfway, switch to another app,
  walk 30 steps and come back: they're included within about 10 s.
  *Optional:* turn off Settings → Privacy & Security → Motion & Fitness for Locturne. Expect
  "I can't hear you walking." with an Open Settings option. Turn it back on.
- [ ] **B6. Unlock at 200.** *Expect:* "I'm up. Don't talk to me yet.", a haptic, and "Apps
  awake until {bedtime}". BED1 and BED2 open; **NAP stays shielded** (a proof never lifts
  Block now). Diagnostics → Morning proofs shows `steps`.
  *Fail →* CAPTURE. Culprit: `proveMorning`, `reapplyStandingBlocks`/`heldLists`.
- [ ] **B7.** Nap → **Wake him early** → **Wake him**.

### Run C: Scan your code (about 50 minutes)

You'll need a printer, or a laptop screen to show the QR on. You also need any website QR and
a product barcode.

- [ ] **C1. Setup.** Full reset. In onboarding, set bedtime to now + 15 and wake to bedtime +
  30. On the stairs question, tap **Other ways to wake them** → Scan your code. Pick BED1 and
  buy.
- [ ] **C2. Register a barcode, then the QR (day, before bedtime).** You → **Can't walk or
  use stairs**.
  *Expect:* the camera prompt shows its usage string and no microphone prompt appears.
  1. **A barcode** → **Scan a barcode** → scan a website QR. *Expect:* "That won't work."
     Scan a product barcode. *Expect:* "Fine. That's the one."
  2. Open the screen again → **My own code**. *Expect:* "This one is yours." and a QR. **Print
     or share it** opens the share sheet with a one-page PDF (Print shows the page). Print it
     or AirDrop it to the laptop. Tap **I've put it out. Scan it**, then scan any other QR.
     *Expect:* "Not that one." Scan your printout. *Expect:* "Fine. That's the one." The QR
     now replaces the barcode.
  *Fail →* CAPTURE. Culprit: `src/lib/scan.ts`, `src/features/scan/`.
- [ ] **C3. Night.** Once bedtime has passed, the same row shows "Not from bed."
- [ ] **C4. Morning.** Home shows **Scan my code**. Before using it, open Home → Use a pass →
  **I can't walk this morning** and check that it opens the scanner ("Go find your code."). Scan
  the product barcode. *Expect:* "Not that one." Scan the QR. *Expect:* "I'm up. Don't talk
  to me yet." / "Your apps are awake until bedtime."; BED1 opens.
  *Fail →* CAPTURE. Culprit: `submitScan` in `src/lib/scan.ts`, `src/app/wake.tsx` redirect.

### Run D: off night, then revocation (about 45 minutes)

- [ ] **D1. Setup.** Full reset. In onboarding, set bedtime to now + 15 and wake to bedtime +
  30, with any method. Pick BED1, buy, then add ALW to Always asleep.
- [ ] **D2. Switch off this test night.** Lab → **Disarm schedule** (Armed: no). Routine →
  Nights → untick **yesterday's** weekday (testing on a Saturday? untick "Friday night").
  *Expect:* no "Your changes apply…" note (it applied at once). Diagnostics shows Armed at =
  now and Windows iOS monitors 1. Home reads "Apps awake. Tonight is off.", and the
  Diagnostics status detail starts "Tonight is off."
  *Fail →* if a pending note appears, you weren't disarmed. Disarm, Undo, and repeat.
- [ ] **D3. Bedtime with the app closed.** Close Locturne. At bedtime + 1 min, BED1 **opens**
  and ALW stays shielded.
  *Fail →* CAPTURE plus syslog. Culprit: `locturneNightIsOn`/`skipLocturneNight` in the Swift
  monitor (the weekday rule must match `getLockState` in `src/lib/lock-state.ts`).
- [ ] **D4. Open Locturne.** *Expect:* "Night off. I'm sleeping anyway." / "No lock tonight.
  Always-asleep apps still sleep." `locturne://wake` shows "Night off. Nothing to prove."
  Diagnostics shows a `night-0 intervalDidStart` heartbeat at bedtime (the "shield up" comes
  from ALW), Night held no, and Self-check doesn't list tonight. After morning start, Home
  shows the day with nothing to prove.

**Revocation (gate 3), on the same install, by day**

- [ ] **R1. Revoke while running.** Settings → Screen Time → Locturne (under apps with
  Screen Time access) → turn it off. Switch back to Locturne **without force-quitting**.
  *Expect:* ALW opens (iOS lifted the shields).
  - Home: label "Not protected" in orange, **"Screen Time access looks off."** with "iOS
    dropped your blocks, … Until then I'm just a raccoon." and **Open Settings**.
  - You: "Screen Time access is off, so I can't block anything. Turn it back on in Settings.
    Until then I'm just a raccoon."
  - Apps: "Screen Time access is off, so nothing is asleep. …" with **Turn Screen Time access
    back on**.
  - Diagnostics: Protection `off`, Access `approved` (stale until restart), Windows iOS
    monitors 0 (or Armed: no; see discrepancy 7).
  *Fail →* if anything still claims protection, CAPTURE. Culprit: `getProtection` in
  `src/lib/screen-time.ts`, `src/hooks/use-protection.ts`, `rollUpHealth` in
  `src/lib/health.ts`.
- [ ] **R2. After a restart.** Force-quit and reopen.
  *Expect:* "Screen Time access is off." (Access `denied`). If Access reads `notDetermined`,
  Home shows "Screen Time access isn't on yet." with **Set up Screen Time**. Record which one
  appears.
- [ ] **R3. Restore.** Apps → **Turn Screen Time access back on** (if no prompt appears, turn
  it on in Settings).
  *Expect:* ALW is shielded again. Diagnostics then shows either the windows back (Windows iOS
  monitors 1), or Armed: no with Home's warning "Bedtime isn't scheduled.". Record which one.
  If it isn't re-armed, lab → Disarm, then make any Routine edit to re-arm.
- [ ] **R4. (Optional) Revoke before a night starts and restore after it ends.** Status
  checklist #3 expects that night to read `missed`. Per the code it won't be listed (see
  discrepancy 7). Record what Self-check shows.

### Run E (optional): emergency in the morning, or an upstairs unlock

These use the same proof path as Run A and the passes, so they're low priority. Do a full
reset and a "bedtime 5 min ago" setup as in B1. In the morning, either use **Emergency unlock**
(expect "Your apps wake until bedtime." and the apps wake), or use downstairs starting on the
ground floor and walk **up** (expect it to unlock too).

---

## 2. Nights

Use the **preview** build. Don't open Locturne between setup and the morning check unless a
step says so.

### N0. Setup (evening, at least an hour before bedtime)

- [ ] Delete the dev build and install the preview build (that's the full reset). Run
  onboarding with your **real** times (example: 23:00 / 07:00), stairs **Yes**, BED1 + BED2,
  then buy and allow Motion.
- [ ] Apps tab: add ALW to Always asleep. Add a daily limit on **BED2** (30 min). This checks
  that the limit's midnight unshield doesn't wake a bedtime app.
- [ ] Diagnostics: Armed night shows your times, and Windows armed = Windows iOS monitors (11
  for 23:00–07:00). Status: "Bedtime is set." / "Your apps sleep at 23:00." Save the report as
  N0.
- [ ] Work out the **last window's start** (for N3): morning start − (night length ÷ windows).
  For 23:00–07:00 that's 06:16. Set an alarm for 15 minutes before it (06:00).
- [ ] Close Locturne. Charge the phone as usual and note whether Low Power Mode is on.
- [ ] (Optional, bedtime + 2 min) Open BED1 and expect the "Shh. I'm sleeping. So are they."
  shield. Don't open Locturne.

### N1 → morning 1: bedtime hold and the downstairs unlock

- [ ] **N1-1. Before opening Locturne,** open BED1 and BED2.
  *Expect:* shielded, still showing the **night words**: with the app closed the words don't
  switch at morning start (known limit). **Fine** closes the shield and no notification
  arrives.
  *Fail →* if either opens, **this is a gate-1 failure**. CAPTURE everything, including the
  crash and jetsam reports, before opening Locturne if you can, then open it for Diagnostics.
- [ ] **N1-2. Open Locturne → Diagnostics.**
  *Expect:* Self-check shows today `onTime`. Heartbeats show `night-0` … `night-10`
  `intervalDidStart · shield up` at the planned times, **including the window that crosses
  midnight** (about 23:44), and `limit-0 intervalDidStart` at 00:00. Night held yes. No
  Locturne jetsam or crash reports. Save the report as N1.
  *Fail →* a `late` verdict means the first window was missed but a later one caught it; note
  which. `noShield` or `missed` is a gate-1 failure. Culprit: Swift monitor, `armNight`.
- [ ] **N1-3. Home:** "So this is a morning. I hate it." and **Go downstairs**. Open BED1: the
  shield now reads "No." / "Go downstairs, then open Locturne. That wakes them."
- [ ] **N1-4. Downstairs on your real stairs, half-asleep.** *Expect:* it unlocks with the
  same screens as A16. BED1 and BED2 open; ALW stays shielded. Write down the peak metres and
  the time it took.
- [ ] **N1-5.** Apps tab: the BED2 limit has no warning (it reset at midnight).

### N2 → morning 2: a second hold, and the pass

- [ ] **N2-1.** Same as N1-1, before opening Locturne.
- [ ] **N2-2.** Diagnostics: two nights `onTime`. Save the report as N2.
- [ ] **N2-3. The pass, with its dismiss paths.** Home → **Use a pass**. The "Use a pass" row
  shows "3 left".
  1. Tap it. *Expect:* "A pass. Sure." / "It wakes your apps until bedtime, no walking. You
     have 3 passes this month." and 0:10. Tap **Go back to sleep**: the sheet closes and
     nothing changes.
  2. Again, wait for **Use the pass** → dialog "Use a pass?" → **Go back to sleep**: the sheet
     closes and nothing changes.
  3. Again → **Use the pass** → **Use the pass**. *Expect:* "Fine. Fine." / "Your apps are
     awake until bedtime. 2 passes left this month." BED1 opens; ALW stays shielded.
  4. Open the exits again → Use a pass. *Expect:* "This morning is already covered." You tab
     → Passes shows "2 left". Home doesn't show "You did okay" (a pass isn't a wake-up).
  *Fail →* CAPTURE. Culprit: `src/lib/passes.ts`, `src/features/exits/exits-screen.tsx`.
- [ ] **N2-4. (Optional, only if you're awake before 05:00 anyway.)** Open Locturne, then
  BED1. *Expect:* **"Why are we awake."** / "Your apps are asleep until you're up after
  {morning}." / **Back to bed**. Note in the results that the app was opened that night.

### N3 → morning 3: a third hold, then the emergency unlock at night

- [ ] **N3-1. At the alarm (before the last window starts),** open BED1 before opening
  Locturne. *Expect:* shielded. That's the third hold.
- [ ] **N3-2.** Diagnostics: tonight's windows so far, with `shield up`. Save as N3.
- [ ] **N3-3. Emergency.** Home → **Emergency unlock** → "Is it an emergency." / "Your
  bedtime apps wake for the rest of tonight and tomorrow morning. They go back to sleep at
  {bedtime} on their own. The always-blocked list stays asleep." → wait → **Unlock anyway**
  → **Unlock**.
  *Expect:* "I'll allow it. This once. Maybe." BED1 opens within a second; ALW stays shielded.
  Home shows "I'll allow it. This once. Maybe." / "Emergency unlock: your bedtime apps are
  awake tonight and tomorrow morning. They sleep again at {bedtime}." The Apps tab still lists
  BED1 and BED2 with "Awake tonight after an emergency unlock. They sleep again at …".
  *Fail →* CAPTURE. Culprit: `pauseNightUntil` in `src/lib/screen-time.ts`,
  `src/lib/emergency.ts`.
- [ ] **N3-4.** Close Locturne. After the last window starts (+1 min), BED1 **still opens**.
  *Fail →* CAPTURE. Culprit: the extension re-shielded a list that should be parked empty:
  `settleLocturneLists` and `locturne.pendingLists`.
- [ ] **N3-5. After morning start, open Locturne once.** *Expect:* the day on Home, with no
  proof needed. Diagnostics → Morning proofs shows `emergency`. Save as N3b. **Then don't open
  Locturne again until after bedtime.**

### Day 4 evening: re-lock with the app closed all day

- [ ] **D4E-1. Bedtime + 2 min:** open BED1. *Expect:* shielded with "Shh. I'm sleeping. So
  are they.", with Locturne unopened since the morning.
  *Fail →* first wait for the second window (about 44 minutes later) and check again. If it
  sleeps then, it's the early-window race (discrepancy 9). If it never sleeps, CAPTURE.
  Culprit: `settleLocturneLists` (Swift), `pauseNightUntil`.
- [ ] **D4E-2.** Open Locturne. The Apps tab shows no pause note, and Diagnostics shows
  `night-0 … · shield up`. Night 4 can run on as a bonus hold.

---

## 3. Pass/fail summary (GAME_PLAN Step 1 gates)

| Gate | Steps | Pass when | Result |
|---|---|---|---|
| 1. Blocks apply at bedtime with the app closed | A8, A9, N1-1/2, N2-1/2, N3-1/2 | Shield up at every check; self-check `onTime` (or `late` once, caught by a later window) | |
| 1. Hold 3+ nights | N1, N2, N3 (to the alarm) | All three hold; no `missed` or `noShield`; no extension jetsam | |
| 1. Off night skipped | D2–D4 | BED1 opens on the off night; ALW stays shielded | |
| 1. Self-check confirms shields | A9, N1-2, N2-2 | Diagnostics verdicts match what you saw | |
| 2. 200-step unlock from the app | B4–B6 | Unlocks at 200; closed-app steps count; night steps don't | |
| 2. Downstairs on real stairs, from the app | A15–A16, N1-4 | Unlocks on one floor; still or up-and-back doesn't | |
| 2. Unlock from a shield tap | A13 | **Blocked by code** (discrepancy 1): the shield can't open the app, and the notification it sends is never permitted. Not a gate failure; GAME_PLAN only asks for it if the background unlock works | |
| 3. Revocation detected | R1–R3 | Home, You and Apps say it plainly while running and after a restart | |
| Exits | A20, N2-3, N3-3–5, D4E | As written; ALW never wakes | |
| Daytime controls | A6, A11, A18–A19, B6, N1-5 | As written | |

**Stop and redesign** (GAME_PLAN Step 1; the October 26 checkpoint) if a core gate fails for
a platform reason, not a bug:
- iOS doesn't run `intervalDidStart` with the app closed, or shields vanish overnight with
  access still on, on 2 of the 3 nights.
- The monitor extension is killed (jetsam) at bedtime.
- CMPedometer can't read history from before the app opened, or the barometer can't
  reliably show 2.5 m on one real floor.
- Revocation can't be seen even after a restart.

A wrong string, a missed re-shield in JS or a wrong verdict is a bug: fix it and rerun that
step only. A Swift fix needs a new build; then rerun the day-session steps that touch it and
restart the night count.

---

## 4. Platform limits (not bugs)

- **A shield button can't open the app.** It only closes the shield. The code's workaround is
  a notification from the shield, which needs notification permission.
- **Re-registering a monitored activity fires `intervalDidEnd`,** and iOS may run
  `intervalDidStart` when a window is registered inside its own interval. After any arm or
  routine edit, expect extra heartbeat rows at that time. Night windows have no
  `intervalDidEnd` action, so nothing unshields.
- **The monitor extension has about 6 MB of memory.** A jetsam kill shows as missing
  heartbeats plus a `JetsamEvent` report.
- **The shield's words don't change with the app closed.** At morning start the bedtime
  shield keeps "Shh. I'm sleeping…" until Locturne opens. A limit or Block now that starts
  with the app closed shows whatever words the app last wrote. iOS shows one set of words for
  every shielded app (plus the bedtime list's own set), so ALW shows night or morning words
  at night and in the morning.
- **Screen Time access reads "approved" after a revoke until the app restarts.** That's why
  R1 says "looks off". A revoke made while the app is closed can't be seen until it opens.
- **iOS dims shielded icons on the Home Screen.** Apps can't change that.
- **Picks are opaque tokens.** No screen can name your apps; only the native rows can.
- **Sensors.** Pedometer counts arrive in batches every few seconds. The altimeter pauses
  when the app leaves the screen (hence A15.2). iOS can fire a window a few seconds or minutes
  late; the self-check allows 5 minutes.
- **The minimum interval is 15 minutes,** for test nights and naps alike.

---

## 5. Where the docs and the code disagree

1. **Notification permission is never requested.** `askForNotifications()` in
   `src/lib/notifications.ts` has no caller. With permission `undetermined`, nothing is
   scheduled or shown: no bedtime warning, no morning note, no revoked-access warning, and no
   "Up already?" from the morning shield's button. status-and-notifications.md says it's asked
   after the first good night, and INTEGRATION.md #3 expects the shield tap to deliver a
   notification. Those checks are blocked until something calls it. Once permission is
   granted, the notifications checklist in status-and-notifications.md applies.
2. **`scheduleTrialReminder` has no caller.** The purchases stub never calls it, so
   Diagnostics shows "Trial start: none" and the day-5 reminder is never planned (TODO §4
   says scheduling is built).
3. **The Screen Time lab's arm buttons are obsolete.** DEVICE_SPIKE.md's test-night steps
   ("Arm test night", "Arm bedtime schedule", "Morning check") arm times that differ from the
   saved routine. The next time Locturne comes to the foreground, `syncLock` re-arms the
   routine and wakes the bedtime list outside the routine's night. Use onboarding, the
   Routine tab and **Disarm schedule** instead.
4. **The closed-app bedtime shield now uses the night words.** v1-screens.md's shield
   checklist expects the always-asleep words "until hand-off 8". The named `locturne-night`
   shield from INTEGRATION.md replaced that, so the code shows "Shh. I'm sleeping. So are
   they."
5. **Off nights are now skipped.** morning-engine.md #21 expects an off night to still be
   shielded (the old gap). The Swift skip in INTEGRATION.md fixed it; D3 expects BED1 to open.
6. **Downstairs holds for 5 s.** morning-engine.md says "Hold 3 s" once; `DOWNSTAIRS.holdMs`
   is 5,000.
7. **The self-check can't produce `missed` from a revoke and restore.** Restoring access
   re-arms the windows, which resets `armedAt`, and `checkNights` skips nights that started
   before the latest arm (status-and-notifications.md #3 expects `missed`). If the re-arm
   happens while access is still off and iOS refuses it, `armNight`'s failure path deletes the
   armed record. After access comes back, nothing re-arms on its own: `useAppStart` only arms
   when `isEntitled()` is true, and the dev stub keeps its entitlement in memory, so it's lost
   on restart. R3 records which of these happens.
8. **Only one proof per calendar date.** `recordProof` refuses any second proof whose
   `morningKey` (the date) already has one, even from an earlier "morning" that day. It only
   matters for same-day test nights or a morning moved by a routine change, but it's why every
   day-session run starts with a reinstall.
9. **Possible early-window race at the post-emergency bedtime.** `settleLocturneLists` (Swift)
   only swaps the parked bedtime picks back once `from` has passed, with no slack.
   `locturneNightIsOn` allows 2 minutes. If iOS starts the bedtime window a few seconds early,
   that window shields an empty list, and the apps sleep at the next window instead. D4E-1
   watches for it.
10. **"Removed apps wait for bedtime" is untested here.** DEVICE_SPIKE.md's list-edit test
    (removing an Always asleep app) and onboarding.md's Ask to Buy, Restore, StoreKit prices
    and Terms checks aren't in this script. They need RevenueCat or aren't Step 1 gates.
