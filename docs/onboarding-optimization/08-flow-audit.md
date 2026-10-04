# T8: Heuristic and quantitative audit of the onboarding as built (2026-10-03)

Scope: `src/features/onboarding/` as it is on disk today (content.ts, steps.tsx, onboarding-flow.tsx,
ui.tsx, screens/*, estimate.ts, setup.ts, arm.ts), plus the entry and re-entry points (`src/app/onboarding.tsx`,
`src/hooks/use-app-start.ts`, home, You and Apps "See plans").

Evidence grade for this whole track: **expert heuristic review plus instrumented timing of the web
preview**. That is opinion-grade evidence on what converts. The timings are measured. The conversion
effects in section 6 are directional predictions, not data. PostHog step events
(`onboarding_step_viewed.ms_on_previous`) will replace these estimates within days of TestFlight.

---

## 0. How this was run

- Ran `npx expo export -p web` to the scratchpad, served it with a tiny clean-URL node server and drove it
  with Playwright 1.62 using the cached Chromium 1243. WebKit wasn't tried, as the bug-sweep notes advise.
  No page errors apart from the known React #418.
- **Gotcha:** Playwright's `devices['iPhone 15']` viewport is 393×**659**, which is below `useCompact()`'s
  760 cutoff. So that preset renders the **compact (iPhone SE) layout**. For example, the offer timeline loses
  its Morning row. The full click-through was re-run at a true 393×852.
- Screenshots:
  - `scratchpad/shots/iphone15-NN-<step>.png`: every step via `?step=`, at 659 high, so effectively compact.
  - `scratchpad/shots/se-NN-<step>.png`: SE at 375×667, for the 15 layout-sensitive steps.
  - `docs/onboarding-optimization/flow-shots/ (JPEG copies of) NN-<step>.png`: **the real flow from `hello`, clicked through** at 393×852, with the
    first options, a downstairs user, the walk taken and 3 apps picked.
  - Rendered text dumps are in `shots/*.txt`.
- `docs/onboarding-optimization/flow-shots/ (JPEG copies of) log.json` records, per screen, **how long after arriving the CTA became clickable**. That
  is the machine floor: no reading, tapping the instant it's possible.
- The hold-to-agree on `commit` could not be automated on web: neither mouse nor CDP touch holds kept
  the Pressable pressed. So the flow resumed at `?step=offer` from there. This is probably a react-native-web
  responder quirk, not an iOS bug. Still worth one manual check in the web preview, since the preview is
  what gets shown around.

---

## 1. The numbers

### 1a. Measured machine floor (time until the CTA is usable)

| Step | CTA usable after | What causes it |
|---|---|---|
| hello | 0.9 s | Voice delay 800 ms, FooterEnter 450 ms |
| deal | 2.7 s | moon flight `FLIGHT_MS` 1400 ms, then the moonrise text |
| nights | 1.3 s | `QUIZ_RISE_MS` 900 ms |
| quiz list questions | ~0.03–0.6 s | `ADVANCE_AFTER_CHOICE_MS` 280 ms after the tap |
| stat / age / tried-echo | 1.2 s | |
| math (auto) | 4.3 s | 500 + 3×650 + 300 ms script, plus the moon sinking 900 ms |
| **reveal** | **0.9 s**, but the payoff takes **~7.5 s** | roll 1400 + fill 1800 + pause 400 + light 1600 + 350 + 420 fade |
| bedtime / wake / method | 0.9 s each | |
| walk | 0.9 s, plus ~9 s for the faked 20 steps | real phone: Motion prompt, then about 12–20 s of walking |
| **tomorrow** | **0.9 s**, but the demo takes **~7.0 s** | TAP 1500 → walk 2500 → 200 at 6200 → lift ~7000 ms |
| screen-time / apps | 0.9 s each | plus Apple's alert, Face ID or passcode, and Apple's picker |
| ready | 2.7 s | |
| commit | ~2.3 s minimum | 1600 ms hold plus a 700 ms done beat |
| offer / plans | ~0.9 s | |

The sum of pure forced waits from `hello` to `commit` is about **38 s**, before anyone reads anything.

### 1b. Per-screen load and estimated time-to-paywall

Assumptions:
- Words are the readable copy on screen. Wheel digits don't count; options do, because people read them.
- Reading speed: fast 300 wpm (skimmers, a large share of a TikTok audience), median 220 wpm.
- Each screen takes **max(forced floor, reading time) + decision time + 0.28 s advance**.
- Decision times are estimates. On a real phone, the `apps` picker and the `walk` dominate.

| # | id | Purpose | Words | Taps | Decisions | Permission prompts | Fast (s) | Median (s) |
|---|---|---|---|---|---|---|---|---|
| 1 | hello | promise + mascot | 17 | 1 | 0 | – | 4 | 6 |
| 2 | deal | how it works + "two minutes" | **58** | 1 | 0 | – | 12 | **17** |
| 3 | nights | the number (echo on math) | 22 | 1 | 1 | – | 6 | 9 |
| 4 | night-minutes | the number | 26 | 1 | 1 | – | 7 | 10 |
| 5 | nights-per-week | the number | 16 | ~5 | 1 | – | 7 | 11 |
| 6 | morning-minutes | the number | 29 | 1 | 1 | – | 8 | 11 |
| 7 | stat | normalising statistic | 20 | 1 | 0 | – | 5 | 7 |
| 8 | found | attribution only | 16 | 1 | 1 | – | 5 | 7 |
| 9 | age | lifetime grid + 13+ gate | 7 | 2 | 1 | – | 3 | 5 |
| 10 | alarm | one sub-line on `offer` | 16 | 1 | 1 | – | 5 | 7 |
| 11 | tried | objection | 20 | 1 | 1 | – | 6 | 9 |
| 12 | tried-echo | objection handling | 32 | 1 | 0 | – | 7 | 10 |
| 13 | time-back | offer headline | 21 | 1 | 1 | – | 6 | 9 |
| 14 | math | labour illusion | 15 | 0 | 0 | – | 5 | 5 |
| 15 | reveal | the number | 30 | 1 | 0 | – | 9 | 12 |
| 16 | bedtime | setting | 20 | ~2 | 1 | – | 7 | 14 |
| 17 | wake | setting | 18 | ~2 | 1 | – | 6 | 11 |
| 18 | method | setting | 24 | 2 | 1 | – | 7 | 10 |
| 19 | walk | "taste" of the morning | 45 | 3 | 1 | **Motion** | 21 | **35** |
| 20 | tomorrow | aha demo | 25 | 1 | 0 | – | 8 | 8 |
| 21 | screen-time | permission | 45 | 3 | 1 | **Screen Time + Face ID/passcode** | 13 | 21 |
| 22 | apps | setting (Apple picker) | 18 | ~8 | 2 | – | 19 | **45** |
| 23 | ready | summary | 30 | 1 | 0 | – | 7 | 11 |
| 24 | commit | commitment | 25 | 1 hold | 1 | – | 8 | 11 |
| 25 | offer | trial timeline | 55 | 1 | 0 | – | 12 | 17 |
| 26 | plans | paywall | 80 | 1–2 | 1 | – | 18 | 28 |
| | **Total to the paywall CTA** | | **~730** | **~44** | **18** | **2 system prompts, 3 dialogs** | **~3.6 min** | **~5.7 min** |

Two more system prompts follow straight after purchase (section 4f). Then `armed` and `first-morning`
add about 1 more minute.

### 1c. The "About two minutes" promise on `deal`

- `deal` says: "First, a few questions. Then I do math on your nights. About two minutes."
- The questions through the reveal (`nights` → `reveal`) take **~76 s fast and ~110 s median**. So the
  promise is **honest for the quiz**.
- But it reads as the whole thing. Ten more screens follow the reveal, with 2 system permission prompts,
  Face ID or a passcode, Apple's picker, a walk and a hold. The real install-to-paywall time is
  **3.6–5.7 min**, about 2–3× what was promised.
- The cost isn't the length itself. Opal-style flows run that long and convert. The cost is the expectation
  gap: around screen 19 (the walk), the user is past "two minutes" with no end in sight. That is the
  classic place people quit. The progress bar is also nearly full by then (`PROGRESS_EASE` 1.3), which
  makes it worse: the bar says "almost done" while the screens keep coming.
- **Fix:** scope the promise ("Two minutes to your number. Then we set up tonight."), and cut the
  post-reveal stretch (section 5).

---

## 2. Screen-by-screen heuristic evaluation

Frameworks used:
- **Nielsen's heuristics** (H1 visibility of status, H2 match with the real world, H4 consistency,
  H5 error prevention, H6 recognition, H8 minimalism, H9 error recovery).
- **Cognitive load**: words, decisions and prompts.
- **Fogg B=MAP**: Motivation, Ability, Prompt.
- **Persuasion order**: problem → personal stakes → mechanism → proof/demo → objection → commitment → offer.

"Earns its place" means the screen feeds the number, a setting, an objection or commitment, or attribution.

### hello
- **Earns:** yes (the promise).
- Strong, specific headline (B=MAP: high-motivation hook that matches the video that sent them).
- **Issues:**
  1. A visible **"Exit"** sits on the very first screen of a first-launch fullScreenModal. Its accessibility
     label is "Exit preview" (ui.tsx `Shell`), which is wrong in production (H2, VoiceOver).
  2. Exit before `commit` saves nothing. The next cold launch restarts at `hello`, and in-session the user
     lands on Home with no routine (verify what Home shows then).
  3. VOICE.md's line bank lists time-of-day openers ("It's 12:47." / "Why are we awake.") as **"In app"**,
     but steps.tsx says "Same line at every hour". One of the two is stale. The late-night line is the
     better hook for night installs from TikTok.

### deal
- **Earns:** partly.
- **58 words**, the densest pre-quiz screen, at screen 2, where motivation should be spent on tapping,
  not reading.
- The three beats restate hello. "Up means up" pre-empts `method`.
- The time promise is the issue covered in 1c.
- The moonrise motion plus `FLIGHT_MS` makes this the slowest early screen: 2.7 s before the CTA is live.

### nights / night-minutes / nights-per-week / morning-minutes
- **Earn:** yes, all feed `estimate()`.
- Good: centred thumb-zone pills, auto-advance at 280 ms, endowed progress.
- `nights-per-week` is a multi-tap picker with no default. That's fine: it's the most honest input to the
  number, and the button reads "Tap at least one" (H5).
- `morning-minutes` sub "Counting from the first alarm." mentions "first alarm" before any alarm question.
  Then `alarm` asks how the alarm feels, and `wake` says "The first one." That's three alarm references in
  different senses (H4). Not fatal, but it's noise.

### stat (85%)
- **Earns:** weakly.
- It normalises ("not just you"), which lowers shame but also lowers urgency, and it interrupts the build
  from three self-report questions to the personal number.
- The number has no visible source (H2, trust). If it's the Reviews.org/Asurion-style survey stat, it's a
  marketing poll. Unverified here; other tracks may grade it.
- The echo line ("You said twenty minutes. I said nothing.") is the best part, and it can live elsewhere.
- **Candidate to cut**, or A/B it.

### found
- **Earns:** yes, but as business data, not user value.
- Placed after `stat`, it reads as a natural break. It's a cheap 1-tap question.
- **Keep where it is.** Moving it post-purchase would measure only payers, and payers per 1K views needs
  install-level attribution. Disagreement with the brief's framing: it isn't what breaks momentum here.
  `stat` before it is.

### age
- **Earns:** yes (the lifetime grid, the 13+ gate).
- The sub-line **"Sleep needs change with age." is misleading**. `sleepNeed` / `showSleepRoom` are
  computed in `estimate.ts` but rendered nowhere (grep: no use in any .tsx). Age only drives "years of
  your life".
- It's a small honesty issue (H2), and it creates an expectation of sleep advice that never comes.

### alarm
- **Earns:** barely.
- Its only output is one grey sub-line on `offer` ("Groggy, you said. So am I. We walk anyway."), which
  also says "walk" to a downstairs user.
- A full screen and a decision buys one 9-word echo. **Candidate to cut.**

### tried → tried-echo
- **Earns:** yes. This is the objection screen, and it's well placed before the reveal.
- `TRIED_ECHO` is flagged "Temporary copy" in content.ts. The bodies are method-neutral and clear.
- The `other-room` line ("And the alarm's in there with it.") is the best of the set.

### time-back
- **Earns:** yes (the offer headline).
- The question is 13 words. It could be 7.

### math
- **Earns:** yes. Labour illusion: Buell & Norton 2011 found operational transparency raises perceived
  value. The 4.3 s is fine.
- Back correctly skips it (`AUTO_ADVANCE`).

### reveal
- **Earns:** yes. It's the emotional peak.
- **Issue (H1 / persuasion):** "Let's fix this" is live at **0.9 s**, but the life grid fills and "That's
  over N years of your life." only appears at **~7.5 s**. In the measured click-through, the CTA was tapped
  before the grid had even started. Fast tappers skip the single most persuasive element in the flow.
- Gate the CTA on `filled`, or at least on `landed` plus about 2 s. Reduced motion already short-circuits
  the animation.
- "Share this" is a good free-distribution hook. The share text "My raccoon is disappointed." is on-voice.
- Light-user branch: copy is fine.

### bedtime / wake
- **Earn:** yes.
- Good: the "Getting in. Not falling asleep." clarifier, AM/PM sanity warning and "I work nights" chip.

### method
- **Earns:** yes.
- No auto-advance, so his echo shows. Two taps, which is fine.

### walk
- **Earns:** questionable before the paywall.
- **Issues:**
  1. A **system permission prompt before the paywall** (Motion & Fitness). It's the first of the flow,
     arriving in the long post-reveal stretch.
  2. It asks someone who is very likely **in bed at night** (night installs from short-form video) to get up
     and walk 20 steps. Not now is offered, but as a secondary link.
  3. It comes **before** `tomorrow`: the user does the morning ritual before seeing what it's for.
     "Tomorrow it's a trip downstairs. Tonight, 20 steps anywhere will do." asks for effort ahead of the
     aha demo, which reverses show → do.
  4. It's 35 s median on a real phone, the second most expensive screen.
  5. If Motion is denied, they get a "No motion, no counting." screen pre-paywall: a negative beat right
     before the sell.
- Its benefit (activation, endowment) is real, but it is just as real **after** purchase, where Motion is
  asked anyway (`armed`).

### tomorrow
- **Earns:** yes. This is the aha demo.
- **Issue (H4, a contradiction):** the demo is **steps-only, whatever method was picked**. The shield text is
  "Shh. I'm sleeping. So is Instagram. Walk 200 steps and it wakes up.", and the counter is "200 / 200 steps".
- Downstairs is the hero method and the default for anyone with stairs, so most users just answered
  "Yes, there are stairs" and are shown a walk.
- CTA live at 0.9 s against a 7 s demo, the same issue as reveal.
- "Set it up" is a good CTA.

### screen-time
- **Earns:** yes (required).
- The mock of Apple's alert with a pointing hand is good priming.
- On compact phones the aside "Apple's box is boring. So am I." is dropped, which is fine.
- The refused state is clear (H9) and mentions parents. But it is a **dead end that saves nothing**:
  `SETUP_DONE` starts at `commit`, so leaving here loses every answer.

### apps
- **Earns:** yes. The most expensive real-device screen (Apple's picker).
- The zero-apps state ("Add apps") is handled.
- The sub copy "Phone calls always get through" is reassuring.

### ready
- **Earns:** partly. It duplicates `commit`.
- "Tonight's lock is ready." followed by "**It isn't on yet.**" contradicts itself without saying why. The
  why is "it starts with the trial", which is exactly the bridge to the paywall that should be said
  plainly.
- The editable schedule card is valuable (control, endowment). Keep the card and lose the screen.

### commit
- **Earns:** yes (commitment / consistency).
- The hold has a VoiceOver fallback ("I agree") and a quick-tap hint. Good.
- But it is screen 24, and its title repeats what `ready` just showed.

### offer
- **Earns:** yes. A dated trial timeline, "$0 today", reminder day.
- **Issues:**
  1. On **compact** phones the "Morning" row is dropped. That row is the only place the timeline says what
     the product does tomorrow.
  2. The sub-line is the `alarm` echo ("We walk anyway"), which is wrong for downstairs users.
  3. "Day 5 — I remind you." is a promise that depends on notifications, which haven't been asked for yet
     (section 4f).

### plans
- **Earns:** yes. Annual is the default, billed price is largest, per-month sits under it.
- The "Free until Oct 10, then $59.99/year." summary and the two-line CTA are good.
- On compact phones Loc's line ("Seven nights free. I'll sleep through most of them.") is dropped. It's
  the only warmth on the page; dropping the third check would cost less than dropping him.
- "Awake again after one trip downstairs" has no subject (who is awake?). Say "Apps wake after one trip
  downstairs".
- The SAVE 49% badge is accurate (59.99 vs 119.88).

### declined
- Clear, no timer, honest "once".
- "Or leave. Your setup is saved, and nothing locks unless you start." This is good (no guilt).

### armed / first-morning
- `armed` copy says "**Next, iOS asks about Motion & Fitness**" even when Motion was already granted on
  the walk. In that case no prompt appears. It's a false promise (H4).
- `first-morning` is excellent. It ends on tomorrow morning, which is the right last frame.

### Accessibility summary
- **VoiceOver: good.**
  - `WordsIn` groups the per-word spans into one accessible label.
  - The reveal grid is hidden with a spoken summary.
  - The demo announces its end.
  - The hold falls back to "I agree".
  - **Bug:** the Exit label says "Exit preview".
- **Reduced motion: good.** Moon moves are skipped, entrances are disabled, the roll and grid jump to the
  end and the demo has a two-state version.
- **Dynamic Type: at risk.**
  - Pages "never scroll" (ui.tsx), but `Title`, `Body` and `Options` have no `maxFontSizeMultiplier`. Only
    display numbers and Voice are capped (1.2–1.3).
  - At accessibility sizes (AX1–AX5), a quiz question with 5 pills, a 2-line title and a sub-line, or the
    55-word `offer`, cannot fit a non-scrolling page. Content will clip under the footer.
  - **Fix:** wrap the body in a ScrollView when `PixelRatio.getFontScale() > 1.3`, or cap body text
    at about 1.5.
- **Compact (SE, <760 pt):**
  - the offer drops "Morning";
  - plans drop Loc;
  - screen-time drops the aside;
  - the apps card shows 4 rows;
  - reveal shrinks.
  - The checked SE screenshots fit without clipping, but the two drops above are the wrong things to drop.

---

## 3. Contradictions and inconsistencies

1. **The `tomorrow` demo is steps-only for a downstairs user.** It is the hero method, shown wrong in the
   aha moment. This is the biggest copy/logic contradiction in the flow.
2. **The walk comes before the demo.** The user does before seeing.
3. **The `offer` sub-line says "We walk anyway"** to downstairs users (`ALARM_ECHO`). `WALK_COPY` and
   `METHOD_COPY` are method-aware; `ALARM_ECHO` is not.
4. **`ready` says "Tonight's lock is ready… It isn't on yet."** without saying the trial turns it on.
5. **The `age` sub-line claims sleep needs**, but no sleep-need output exists.
6. **`armed` promises a Motion prompt** that won't appear if the walk already got an answer.
7. **The brief and GAME_PLAN say "Notifications permission is NOT asked in onboarding"**, but the code
   does ask it.
   - `finishSetup` → `saveTrialReminder(true)` → `scheduleTrialReminder` → `askForNotifications()` when
     the status is undetermined (notifications.ts:271).
   - "Remind me" is on by default, so **every trial purchaser gets an unprimed notification prompt** the
     instant the purchase completes, over the "Setting tonight." screen.
   - Then `armed`'s Continue may fire Motion. That is two system prompts in about 3 seconds after paying.
8. **The progress bar fills by `ready`** while `commit`, `offer` and `plans` remain. That part is fine,
   since paywall pages hide the bar. But the bar is about 85% full at `walk`, with 6 heavy screens still
   ahead.
9. **"First alarm" appears three times** in different senses: morning-minutes, alarm and wake.
10. **The VOICE.md line bank says the time-of-day openers are "In app"**, but the code uses one line at
    every hour.

---

## 4. Flow-logic edge cases that lose conversions

**a. Offers fail to load.**
- `getOffers()` runs once at mount, on `hello`. If it failed 4 minutes earlier on flaky Wi-Fi,
  `offersFailed` stays true, and the user arrives at `offer` to "The App Store isn't answering." with a
  manual Try again.
- `exitArm` resolves to `none` when `offers` is null, so Exit from that page exits outright. There is no
  exit offer.
- **Fix:** refetch automatically when entering `offer` if `offers` is null (and on AppState `active`).
  Keep the manual button as the fallback.

**b. Back navigation.**
- Sound overall:
  - `AUTO_ADVANCE` skips `math`;
  - edits restore `beforeEdit`;
  - `under-13` can't go back;
  - after purchase the history resets to `['armed']`.
- Two gaps:
  - Back from `plans` to `offer` and then Exit shows `declined`. That's fine, it's still only once.
  - Back from `walk` once counting has started keeps the walk state. That's harmless.

**c. Late night (`lateNight`).**
- When onboarding falls inside the bedtime window, `ready` says "I start the second you're in", and after
  purchase the apps sleep **immediately**.
- That is a strong, honest hook ("tonight, now"). But:
  - (i) the `walk` asks a person in bed at 1 AM to walk;
  - (ii) `hello` doesn't use the night opener;
  - (iii) `tomorrow`'s eyebrow correctly becomes "This morning, 7:00 AM".
- Recommend skipping the walk entirely when `lateNight` (or moving it post-purchase; see the fixes), and
  using the night opener.

**d. Light users** (`weeklyMinutes < 60`).
- The reveal and offer copy branch correctly.
- **Bug in the resume path:** `resumeAtPaywall` rebuilds answers from the routine only, so
  `nightMinutes` = 0 and `morningMinutes` = 0. That makes `numbers.lightUser` = **true for every
  resumed user**.
- So everyone coming back via "See plans" gets "Mornings, then. Mine too." plus the fallback sub-line,
  even heavy users.
- **Fix:** persist `nightMinutes`, `morningMinutes`, `nightsPerWeek`, `timeBack` and `alarm` in
  `saveSetup`, or use a dedicated resume headline.

**e. Under 13.**
- The gate is clean, and analytics stop (`stopForChild`).
- **Teen reality:** many 13–17s are in Family Sharing child accounts. There, Screen Time authorization and
  purchase (Ask to Buy) both need a parent, and both are handled (refused copy, pending path).
- That's fine. Just expect a measurable `pending` share in a Gen Z audience. Track it.

**f. Permission prompts in total.**
- Pre-paywall: Motion (walk), then Screen Time plus Face ID/passcode.
- Post-purchase: Notifications (unprimed, automatic) and maybe Motion again.
- **If notifications are denied, the "Day 5: I remind you" promise silently breaks.** The offer and paywall
  both promised it, and the toggle was on. That is a trust and refund risk.
- **Fix:** prime notifications on `armed` ("So I can remind you before day 7"). If denied, say what will
  and won't happen.

**g. Shift workers.**
- The chip swaps presets and the bedtime/wake defaults, and the voice line adapts.
- The quiz still says "nights" and "Which nights", which is acceptable.
- Check `isInsideBedtime` for day-sleep windows: the logic handles both orders.
- `wakeDay` gives "Later today" for afternoon wakes. Fine.

**h. Restore path.**
- From `hello`: on found → alert → `go('bedtime')` skips the quiz → `commit` with `entitled` →
  `finishSetup`. Correct.
- The restore link on `hello` costs a little attention at the highest-traffic screen. That's acceptable,
  since it's a secondary link.
- From the paywall: works, and it's in the fine print.

**i. Exit offer arm `none`.**
- Exit from the paywall exits immediately and saves the setup.
- Nothing else re-presents an offer that session. That is correct for a clean A/B.

**j. Re-entry after exit.**
- **Before `commit`:** nothing is saved, and nothing is resumable. A cold launch restarts at `hello`
  (`useAppStart` pushes `/onboarding` when `!hasRoutine()`), so the user redoes ~20 screens.
  - **Fix:** persist answers plus the last step, and resume there ("Where were we." as his line).
- **After the paywall:**
  - Home shows "No subscription, so nothing sleeps" with a **text link** "See plans", and You and Apps
    have the same.
  - There is **no automatic re-presentation of the paywall on the next app open**, and no
    notification-based win-back (notifications aren't granted yet for non-payers).
  - The most common re-entry in hard-paywall apps is the paywall shown again at launch.
  - **Fix:** if routine exists, not entitled, and not already shown this launch, present
    `/onboarding?resume=paywall` on the next 2–3 cold launches.
  - Consider promoting Home's "See plans" from a text link to the primary button in the unsubscribed state.

**k. Screen Time refused.**
- It is handled clearly, but it is a hard stop that also loses all answers (see j).
- Don't let them past: selling a lock that can't lock creates refunds.
- Do save progress so a later launch resumes at `screen-time`.

**l. Picker with zero apps.**
- Can't proceed. The CTA re-opens the picker.
- If they cancel the picker repeatedly, they're stuck with no explanation.
- Add a one-line Loc aside after an empty close: "Pick one. Any one. I'm not fussy."

---

## 5. Prioritised fixes

The effect lines are directional (expert judgment). Validate each with the PostHog funnel.

### P0: fix before TestFlight (correctness, honesty, broken promises)

1. **`tomorrow`: make the demo method-aware.**
   - For `downstairs`:
     - shield sub-line: "Go downstairs and it wakes up.";
     - replace the step counter with a floor indicator ("Upstairs → Downstairs");
     - the beat lands on "I hate stairs. That's the point."
   - `scan` can reuse the steps version with "Scan your code" on the shield.
   - *Effect:* the aha moment matches the choice the user just made. This removes the flow's biggest
     contradiction. High confidence it's right, medium on how much it lifts.
2. **Notifications.**
   - Stop the unprimed prompt at purchase. Prime it on `armed` and ask from that button.
   - Proposed `armed` body:
     - "iOS has your schedule. Your apps sleep at 11:30 PM."
     - "Next, iOS asks about notifications, so I can remind you before day 7. Then Motion, so I can feel
       the stairs."
   - Show only the parts that will actually be asked: fixes `MOTION_WHY`'s false promise (contradiction
     6).
   - If notifications are denied, add a `first-morning` row: when "Day 5", what "Notifications are off,
     so I can't remind you. Ends Oct 10. Cancel in Settings before then."
   - *Effect:* higher opt-in (primed vs cold), the trial promise kept, fewer angry refunds.
3. **Resume path headline bug.**
   - Persist the quiz numbers and `timeBack` in `saveSetup`, so resumed users aren't treated as light users.
   - Or use a resume-only headline: "You came back. I'd stopped watching the door." Deadpan, no guilt.
4. **Offers refetch on entering `offer`** when null, and on app foreground. *Effect:* recovers users lost to
   a stale failure flag.
5. **Exit button.** Change the accessibility label "Exit preview" → "Close". Consider hiding Exit on `hello`
   for the first-launch modal: swiping the app away is the real exit. *Effect:* small. VoiceOver honesty.

### P1: structure (the biggest time and drop-off savings)

6. **Move `walk` after purchase.** Put it between `armed` and `first-morning`, as the first wake-up
   rehearsal, and ask for Motion there.
   - *Why:*
     - it removes a pre-paywall system prompt and ~20–35 s;
     - it fixes "doing before seeing";
     - it avoids the in-bed-at-night ask;
     - the activation value is the same or higher after paying, as the first "wake" with the product they
       now own.
   - Skip it entirely when `lateNight`, with the line "Tomorrow, then. I'm not walking now either."
   - *Effect:* likely the single biggest completion gain before the paywall. Medium–high confidence.
7. **Merge `ready` into `commit`.**
   - One screen: eyebrow "The deal", title "Phone down at 11:30 PM. Downstairs to wake them.", the
     editable schedule card underneath, then one honest line, then the hold.
   - Line: "It starts when your free week does."
   - Loc aside: "I'm ready. Emotionally, less so."
   - The CTA stays Hold to agree.
   - *Effect:* one screen and ~10 s fewer. It fixes the "isn't on yet" contradiction and makes the paywall
     the natural next step.
8. **Cut `alarm`.**
   - Replace the `offer` sub-line with a method-aware echo (new `METHOD_COPY.offer`):
     - downstairs: "One trip downstairs. I'll complain the whole way."
     - steps: "Two hundred steps. I'll complain the whole way."
     - scan: "One walk to your code. I'll complain the whole way."
   - *Effect:* one decision and ~7 s fewer. It fixes the "we walk anyway" mismatch.
9. **Cut `stat`, or A/B it.**
   - Move its echo ("You said twenty minutes. I said nothing.") to just before the number: show it as
     `math`'s headline when `morningMinutes` ≥ 10, otherwise keep `NIGHTS_ECHO`.
   - If the stat is kept, show its source under it in `text2`.
   - *Effect:* keeps the build-up from the questions to the number unbroken. Low–medium confidence;
     it's a cheap test.
10. **Gate the CTAs on `reveal` and `tomorrow`** until the payoff has played. On reveal, gate on `filled`.
    On tomorrow, gate at about 6.5 s, or on `phase === 'awake'`. Reduced motion is unaffected, since it
    jumps to the end.
    - *Effect:* every user sees the two most persuasive frames. This is the cheapest high-value change in
      the list.
11. **Persist partial progress** (answers plus last step) and resume there on relaunch. His line on resume:
    "Where were we." (no question mark: he can't be bothered).
    - *Effect:* recovers interrupted sessions. Night installs get interrupted a lot.
12. **Re-present the paywall on the next 2–3 cold launches** for saved-but-unsubscribed users, and make
    "See plans" Home's primary button in that state.
    - *Effect:* the standard hard-paywall recovery loop. Currently missing.

### P2: copy and polish

13. **`deal`: trim from 58 words to ~30, and scope the promise.**
    - Bedtime: "Your apps go to sleep. So do I."
    - Morning: "They wake when you're up. Downstairs or a short walk."
    - Body: "Two minutes of questions, then your number. Then we set up tonight. Answers stay on your phone."
14. **`age` sub-line:** "It goes into the math. Nowhere else." This replaces the unsupported sleep-needs
    claim.
15. **`morning-minutes` sub-line:** "From your alarm to your feet on the floor." This drops the first
    "first alarm".
16. **`time-back`:** "Those minutes back. What would you do?" (7 words instead of 13).
17. **`plans` check:** "Apps wake after one trip downstairs" (also "…after 200 morning steps" and
    "…once you scan your code").
18. **Compact paywall.** On SE, keep Loc's line and drop the "Passes for sick days and travel" check
    instead. On `offer`, keep "Morning" and merge "Day 5" into "Day 7": "Oct 10: $59.99 for the year. I
    remind you two days before."
19. **`apps` empty close:** aside "Pick one. Any one. I'm not fussy."
20. **`hello` night opener** when `lateNight`, per VOICE.md's line bank: "It's 12:47." / "Why are we
    awake." Then reconcile VOICE.md with the code.
21. **Dynamic Type:** let the body scroll above a font scale of 1.3, or cap `Title`/`Body`/`Options` at
    1.5.

---

## 6. Proposed tightened order

```
hello → deal (trimmed) → nights → night-minutes → nights-per-week → morning-minutes
→ found → age → tried → tried-echo → time-back → math (morning echo) → reveal (CTA gated)
→ bedtime → wake → method → tomorrow (method-aware, CTA gated)
→ screen-time → apps → commit (with schedule card; replaces ready)
→ offer → plans → [declined]
→ armed (primes notifications + Motion) → walk (skipped if lateNight) → first-morning
```

| | Current | Proposed |
|---|---|---|
| Screens to the paywall CTA | 26 | 22 (−stat, −alarm, −ready, walk moved) |
| System permission prompts before the paywall | 2 (Motion, Screen Time) | 1 (Screen Time) |
| Decisions before the paywall | 18 | 15 |
| Estimated time to the paywall, fast | ~3.6 min | ~2.9 min |
| Estimated time to the paywall, median | ~5.7 min | ~4.6 min |
| The "two minutes" promise | quiz only, reads as the whole flow | scoped to "your number"; true |

The added gating on reveal and tomorrow costs about 6–10 s for fast tappers. That is deliberate: those
seconds go to the two moments that do the persuading.

What stays, deliberately:
- `found` mid-quiz, for install-level attribution.
- `tried-echo`, the only objection screen.
- `math`, the labour illusion.
- The two-page paywall (timeline, then plans).
- The single exit offer.

All are evidence-backed in docs/sub-club, and nothing here contradicts them.

---

## 7. What to instrument to confirm the audit (already mostly possible)

- **Per-step drop-off and `ms_on_previous`.** These exist already. Watch `deal`, `walk`, `screen-time` and
  `apps` first.
- **Taps on the reveal and tomorrow CTAs before the payoff.** Add `payoff_seen: boolean` to the
  `onboarding_step_viewed` event of the next step.
- **`walk_finished` result split** and walk start rate by hour of day (lateNight).
- **`offers_failed` rate** and recovery after an automatic refetch.
- **Notification opt-in after priming, and the share of trials whose reminder is undeliverable.**
- **Resume-paywall conversion** by entry point: Home, You, Apps, and the proposed launch re-presentation.
