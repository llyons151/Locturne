# Group B: planners, learning and self-discovery apps

Analysed 2026-10-05 for the Locturne onboarding rework ("the quiz screens all feel
the same"; the goal is more personal and more branded).

Apps: The Pattern, Gentler Streak, Structured, Tiimo, Imprint, Headway, Liven.
Sources: each app's `FLOW.md` (row numbers below) and its free images (`001–008.jpg`,
`showcase-N.jpg`). Most FLOW rows are locked text descriptions, so anything not in an
image is inferred from the row text. Gentler Streak rows 9+ have no descriptions at all.

Locturne baseline looked at: `_locturne-before/grid0–6.jpg`. What already works:
the Loc voice lines (grid2 "Screen Time has an Ignore button. I don't.", grid3
"I hate stairs. That's the point."), the math screen quoting the user's own answer back
(grid2 "'One more video.' Counting all of them."), the dated trial timeline (grid5).
What makes it feel samey: about 9 of the first 12 screens use the same layout (a
sans-serif question, a grey subtitle, then 4–5 black pills), and most buttons just say
"Continue".

---

## 1. Per app

### The Pattern (astrology / self-knowledge): ~$350k/mo
- **Screens to paywall:** about 10 setup screens, then the app opens. The first
  paywall is a soft one inside the content (row 16, `showcase-4.jpg`, "Continue
  reading this insight & more!").
- **Arc:** sign up, then one form (name, birthdate, birth time, pronouns), then a birth
  place on a map, then a review of the details, then "View My Pattern". After that you
  are straight into readings about you.
- **Personalization devices:** the whole product is built from your input. The form
  heading is "Hi, it's very nice to meet you. Fill out this information to view
  your Pattern" (`006–008.jpg`). The birth time has an "Unknown" option and the
  promise "you can update this later for a complete Pattern" (`007.jpg`). The review
  screen reads your details back to you before the payoff (row 10).
- **Brand devices:** strict black-and-white throughout, with an ink-brush swirl logo
  at the top of every screen (`001–008.jpg`). The app has no illustrations and no
  colour at all, and it still feels premium. The pickers are the native iOS date and
  time wheels and the map is native MapKit (`showcase-2.jpg`).
- **Best screens:** `008.jpg` (calm single form with a privacy line), row 10 (review
  your details before the reveal), `showcase-4.jpg` (paywall tied to the exact thing
  you were reading).
- **Apple risk:** the paywall shows "SAVE 114%" (`showcase-4.jpg`), which is false
  maths and a misleading-pricing risk. It also forces account creation and email
  verification before any value (`003–005.jpg`), which is allowed but costly.

### Gentler Streak (fitness, Apple Design Award): ~$30k/mo
- **Screens to paywall:** about 13 (the paywall is row 14).
- **Arc:** the mascot introduces himself, asks your name, greets you by name, shows 3
  feature cards, says "But enough about me. This is about you!", asks for Health
  access, then says "You're almost in", then the paywall.
- **Personalization devices:** the mascot asks "…and who are you?" with a big inline
  name field (`003.jpg`). The very next screen uses the name: "Let's get to know each
  other, Nicole!" (`004.jpg`). The button labels are your replies to the mascot:
  "Hi, Yorhart", "Go for it", "OK", "Let's go" (`002/004/008.jpg`,
  `showcase-4.jpg`).
- **Brand devices:** one mascot (Yorhart) stands in the same spot on every screen and
  only his face and arm change (`001–004.jpg`). Hand-drawn labels sit on the charts
  ("you today", "too low / too high", `005–006.jpg`). The heart-shaped thumb on the
  slider is reused on every slider in the app (`showcase-5.jpg`).
- **Best screens:** `008.jpg` (the "But enough about me" chapter break),
  `004.jpg` (your name used straight away), `006.jpg` (one hand-labelled diagram
  explains the whole idea).
- **Apple risk:** none seen.

### Structured (day planner): ~$300k/mo
- **Screens to paywall:** 15 (the paywall is rows 16–17).
- **Arc:** a 3-card intro, then "Let's get started by planning today", then wake time,
  then bed time, then your first task, its start time, length and colour, then a
  question about using that colour as the app theme, then your finished timeline,
  then notifications, then the paywall.
- **Personalization devices:** the onboarding builds your real first day. The
  timeline you see at row 13 contains your own wake time, bed time and the task you
  just made (`showcase-5.jpg` shows "Rise and Shine 5:00 AM" and "Go for a walk").
  The colour you pick for your task can become the whole app's theme (row 12,
  `showcase-3.jpg`). "Plan for tomorrow instead" offers a different path
  (`005.jpg`).
- **Brand devices:** **the background matches the question.** The wake-up picker sits
  on a pink dawn with a sun, and the bedtime picker sits on a speckled night-blue sky
  with a crescent moon and stars (`006.jpg`, `007.jpg`). The coloured word in each
  title also matches ("wake up" in pink, "go to bed" in blue). The intro uses a
  photographed desk scene (`002.jpg`).
- **Best screens:** `007.jpg` (the bedtime picker on a night sky with a moon; this
  is the closest thing in the whole library to Locturne's brand), `006.jpg`, row 13
  (your built timeline).
- **Apple risk:** row 36 asks for a rating just after the first task is made. That is
  in-app, not in onboarding, and looks like the native prompt, so it is OK. The
  "Can't afford it?" link on the paywall (`showcase-3.jpg`) is fine.

### Tiimo (ADHD planner, App of the Year 2025): ~$250k/mo
- **Screens to paywall:** 8 (the paywall is rows 9–11). Very short. Most of the setup
  happens after the paywall.
- **Arc:** sign up, then a custom opt-in for updates, then "What's your biggest need?",
  then "Are you neurodivergent?", then "You're part of 500,000 users", then the paywall,
  then notifications, calendar import and routine chips (morning, afternoon,
  evening), then a rating prompt, then a tap-to-complete demo, then "Start my streak".
- **Personalization devices:** routines are chosen by time of day (rows 20–22). A
  practice screen won't let you continue until you have done the action ("Complete
  all tasks to continue", `showcase-5.jpg`, rows 26–27). The calendar import shows a
  sample of your real events.
- **Brand devices:** a serif headline type, and line-art illustrations with a lavender
  fade at the bottom of each screen (`005.jpg`, `008.jpg`, `showcase-4.jpg`). The
  splash (`001.jpg`) has an eyes-and-hand blob mascot.
- **Best screens:** `showcase-5.jpg` ("Celebrate yourself when you finish a task. Tap
  a task to check it off, then watch what happens"), `showcase-2.jpg` (calm paywall
  with a moon motif), `007.jpg` (an identity question with a "think I am" middle
  answer).
- **Apple risk:** **rows 23–25 put a rating prompt inside onboarding**, with a
  custom "Enjoying Tiimo?" star modal before the real one. Apple now rejects this. The
  custom pre-ATT screen at `showcase-6.jpg` is OK.

### Imprint (visual learning): ~$250k/mo
- **Screens to paywall:** 26 (the paywall is rows 27–30).
- **Arc:** ATT prompt, then "a new way to learn", then 3 benefit cards, then "answer
  a few questions", then source, gender, age, interests (with sub-topic follow-ups for
  each one picked), then path, then a goal, then notifications, then a refer-a-friend
  pass, then learning time, then "personalized", then a testimonial, then the paywall,
  then account creation, then the first lesson.
- **Personalization devices:** **a live result line under the choice.** Picking
  "Quick – 2 min/day" shows "That's 30 bite-sized lessons in a month!"
  (`showcase-3.jpg`, row 17). Follow-up questions branch from earlier answers (rows
  11–13 ask about History, Psychology and Health only because you picked them).
- **Brand devices:** every topic tile is a richly illustrated card (`002.jpg`), and
  the first lesson teaches with a side-by-side picture (`showcase-6.jpg`).
- **Best screens:** `showcase-3.jpg` (goal plus live result line), rows 11–13
  (branching follow-ups), row 28 (a trial reminder screen before the price).
- **Apple risk:** ATT on the first screen (`003.jpg`) is allowed but a weak start.
  "Tap to start your streak!" (`showcase-7.jpg`) is fine.

### Headway (book summaries): ~$850k/mo, the biggest earner in this group
- **Screens to paywall:** 41 (the paywall is row 42).
- **Arc:** ATT, then celebrity faces ("They read. A lot."), then 3 swipe cards, then
  sign-up, then about 25 quiz screens (goal, focus, how many summaries, streak
  target, reminder time, "Do you relate?" statement cards, pick 3+ books), then
  "Experience crafted", then a **fingerprint commitment pact**, then the trial
  timeline, then a "We'll remind you 2 days before" screen, then the plans.
- **Personalization devices:** "Choose 3+ titles" with real covers (`showcase-3.jpg`),
  then "saved to your Library" (row 32). The home screen after purchase is labelled
  "BASED ON YOUR ANSWERS" (`showcase-6.jpg`). The reminder-time picker shows the
  reminder message you will get (row 23). The commitment pact is a goal statement you
  confirm by touching a fingerprint, then "Sealing your commitment", then success
  (rows 38–40).
- **Brand devices:** the pink brain mascot comes back in different poses (walking with
  headphones, meditating, holding a gift: `006–008.jpg`, `showcase-4/5.jpg`). The
  progress bar is split into chapters (`005–007.jpg`). The "Do you relate?" cards
  break up the pill lists (rows 26–28, 33–35).
- **Best screens:** rows 38–40 (fingerprint pact), `showcase-5.jpg` (reminder with a
  date badge, "April 21"), `showcase-3.jpg` (the visual pick grid).
- **Apple risk:** after purchase, rows 53–58 show a run of discount upsells ("44%
  discount", "one-time deal $24.99"). That is the sort of extra offer and crossed-out
  pricing Apple now flags. The 41-screen length is also extreme.

### Liven (self-discovery / CBT coach): ~$350k/mo
- **Screens to paywall:** 37 (the paywall is row 38).
- **Arc:** ATT, then social proof, then "Let's personalize Liven for you!", then your
  name, then gender, then about 20 self-report questions (frequency pills and 0–10
  sliders), then credibility claims (Harvard/Oxford), then a goal, then "70%
  Personalizing…", then a before/after card, then a **signed contract**, then
  confetti, then the paywall.
- **Personalization devices:** your name is at the top of the contract: "Julia, let's
  make a contract" (`showcase-4.jpg`). Some questions are written in the first person
  with a 0–10 slider ("I often feel stressed or anxious", `showcase-2.jpg`). Each
  frequency option has a small battery icon from empty to full (`008.jpg`).
- **Brand devices:** soft gradients and nature illustrations (`002.jpg`, `004.jpg`,
  `showcase-6.jpg`). Not much else; it feels generic.
- **Best screens:** `showcase-4.jpg` (sign with your finger, "Your signature will
  not be recorded"), `showcase-2.jpg` (a first-person statement plus a slider),
  `008.jpg` (icons on the options).
- **Apple risk:** the paywall preselects a **weekly plan with a "free trial" toggle**
  (`showcase-5.jpg`). Apple has rejected trial-toggle paywalls. Rows 69–70 ask
  outright for a **5-star** App Store review, which breaks the rule against asking
  for a specific rating. "70% Personalizing" (`showcase-3.jpg`) is a fake loading
  screen. Rows 42–43 push extra workbook upsells.

---

## 2. Steal list for Locturne (ranked)

All of these keep the current brand: the moon on a night-blue haze, white pill
buttons, big italic serif only when Loc is talking, native SwiftUI pickers, and no
glow of any kind.

### 1. The sky follows the picker (`bedtime`, `wake`)
*From Structured `006.jpg` / `007.jpg`.*
- **What it does:** as the user scrolls the native time wheel, the haze changes with
  the hour. Later bedtimes make it darker and push the moon a little higher.
  On `wake`, the haze lightens toward a cold pre-dawn grey-blue and the moon sits
  lower, near the horizon. This only changes colour and position. It adds no glow, no
  halo and no new moon artwork, and it reuses the moon transitions the user already
  likes.
- **Loc caption:** a one-line italic serif caption under the wheel changes with the
  value:
  - 10 pm: *"Early. Suspicious, but fine."*
  - 11:30 pm: *"Reasonable. I'll be yawning by then."*
  - 1 am: *"I'll be asleep. You'll be in the comments."*
  - wake 6 am: *"Bold. I'm not getting up with you."*
  - wake 8 am: *"Now that's my kind of morning."*
- **Why:** this turns the two most "form-like" screens into the most on-brand ones.
  The user sees their own night on screen. It is the single strongest
  brand-plus-personal device in this group.
- **Check with the user:** the memory note "moon untouched" was about the app-sleep
  animation. Moving the moon here should still be okayed first.

### 2. A tally that grows across the quiz, so the number at `reveal` is earned (`night-minutes`, `nights-per-week`, `morning-minutes`, then `reveal`)
*From Imprint `showcase-3.jpg` ("That's 30 bite-sized lessons in a month!").*
- **What it does:** a small line under each answer, in Loc's italic, shows the running
  total:
  - after `night-minutes` (30–60 min): *"Forty-five minutes. A whole episode of nothing."*
  - after `nights-per-week` (5 nights): *"Five nights. That's about four hours a week so far."*
  - after `morning-minutes`: *"Plus mornings. I'm still counting."*
- `reveal` then lands as the end of numbers the user watched build up, not a number
  out of nowhere. The existing dot grid on `reveal` (grid3) can fill dot by dot.
- **Why:** it puts the user's own maths on screen while they answer. It also gives
  the black-pill screens a second, changing element, so they stop looking identical.

### 3. A live preview of what Loc will actually send them (`bedtime`, `wake`, `screen-time`)
*From Headway row 23 (the time picker shows the reminder text).*
- **What it does:** under the bedtime wheel, show a native-looking lock-screen
  notification that updates as they scroll: **"Locturne · 11:15 PM. Fifteen minutes.
  Start yawning."** (15 minutes before the chosen time). On `wake`, show the
  shield they will hit: **"7:00 AM. No. Downstairs first."**
- **Why:** it shows the real product with their own times, written in Loc's voice,
  before they pay. It is also honest, because these are the real notifications.

### 4. Every button is the user's reply to Loc (all steps that still say "Continue")
*From Gentler Streak `002.jpg` "Hi, Yorhart", `004.jpg` "Go for it", `008.jpg` "OK".*
- Locturne already does this on `hello` ("Go on"), `deal` ("Ask away") and `reveal`
  ("Let's fix this"). Do it everywhere:
  - `nights-per-week`: "That's the week"
  - `age`: "That's me"
  - `tried-echo`: "Fair point"
  - `bedtime`: "Usually, yeah"
  - `wake`: "Sadly, yes"
  - `method`: "Stairs it is" / "One floor"
  - `screen-time`: "Fine, Apple"
  - `armed`: "Goodnight, Loc"
- **Why:** the whole flow reads as a conversation with the mascot. It costs nothing to
  build and is the cheapest brand win on this list.

### 5. Chapter breaks in Loc's voice, with a 3-part progress bar (new steps between sections)
*From Gentler Streak `008.jpg` "But enough about me. This is about you!" and Headway
`005–007.jpg` (progress bar split into chapters).*
- **What it does:** split the flow into three chapters, **Your nights / Your mornings /
  Your apps**. Each chapter opens on a full moon-and-haze card with one big italic line:
  - before `nights`: *"Enough about me. Let's talk about your nights."*
  - after `reveal`, before `bedtime`: *"Right. Now the morning. My least favourite part."*
  - before `screen-time`: *"Last bit. Which apps are we putting down?"*
- The single thin progress bar becomes three short segments.
- **Why:** it breaks up the run of 12 pill screens. It gives the moon transitions
  natural places to play, and each chapter feels short.

### 6. A "your night" card that builds up as they answer (`bedtime`, `wake`, `method`, `apps`, finishing at `commit`)
*From Structured row 13 / `showcase-5.jpg` (the timeline is made from what you
entered) and Headway row 36 "Experience crafted".*
- **What it does:** from `bedtime` on, a small card stays near the top edge and adds
  one line per answer:
  - "Lights out 11:30 PM"
  - "Alarm 7:00 AM"
  - "Downstairs to wake them"
  - the 3 app icons
- At `commit` it grows into today's full summary card (grid5). This should be the real
  card with real data, not a fake "Personalizing…" loading bar.
- **Why:** the user watches their plan being built. The `commit` screen then feels
  like signing something they made, not reading a summary.

### 7. Make `tomorrow` use their own apps and their own alarm time (reorder `apps` before `tomorrow`)
*From Tiimo `showcase-5.jpg` ("Tap a task… then watch what happens"; you can't
continue until you've done it).*
- **What it does:** today, `tomorrow` shows a generic phone. Move the app picker
  (`screen-time` + `apps`) earlier, so `tomorrow` can show "TOMORROW, 7:00 AM" (their
  `wake` answer) with **their** chosen icons dimmed and asleep. The user must tap one
  of their own icons to get Loc's *"No. Tap Fine."*, and only then can they continue.
- **Why:** it is the strongest "this is my morning" moment, and it shows the actual
  product. The FamilyActivityPicker tokens can render the real icons in SwiftUI, as
  the current `apps` screen already does.
- **Trade-off:** asking for Screen Time permission earlier may lose a few users. A/B
  test it.

### 8. A first-person statement card instead of one pill list (`nights` or a new step after `nights-per-week`)
*From Headway rows 26–28 / 33–35 ("Do you relate to…?" Yes/No) and Liven
`showcase-2.jpg` (a first-person statement plus a slider).*
- **What it does:** a big italic quote in the middle of the moon screen:
  *"'Just checking one thing.' — you, around midnight."* Below it, two pills:
  **"Guilty"** / **"Not me"**. Loc's reply to "Guilty": *"Thought so. Me too, honestly."*
- **Why:** it is a different layout and a different input, and it feels like Loc
  reading their mind. Use it once; it would get stale if used several times.

### 9. A native slider with a live caption on `night-minutes` and `morning-minutes`
*From Liven `showcase-2.jpg` (0–10 slider) and Gentler Streak `showcase-5.jpg` (a
branded slider thumb).*
- **What it does:** swap the 5 range pills for a native SwiftUI `Slider` (0 to 2h+).
  The caption above it updates live: "about 40 minutes", and at the far end
  *"Two hours? That's a film. Every night."*
- **Why:** the two "how long" screens currently look exactly like `nights` and `found`.
  A different control is the fastest fix for the sameness.

### 10. A one-line Loc reply to every answer, not just some (`nights`, `found`, `age`, `time-back`)
*From Gentler Streak's mascot greeting you by name right away (`004.jpg`) and
Locturne's own `method` screen.*
- **What it does:** after a tap, the chosen pill stays highlighted for about 0.8 s and
  one italic line appears below before moving on:
  - `found` = TikTok: *"Of course it was TikTok."*
  - `age` = 22: *"Twenty-two. You'll bounce back faster than I do."*
  - `time-back` = Read: *"Books. Paper ones. Wild."*
- Keep every reply teasing and warm, never shaming.
- **Why:** this is the "it heard me" feeling. Locturne asks for no name, so these
  replies take the place of saying the user's name.

### 11. Trial reminder screen with a date badge (`offer`)
*From Headway `showcase-5.jpg` ("We'll send a reminder 2 days before…" plus an
"April 21" badge) and Imprint row 28.*
- **What it does:** Locturne's `offer` already shows a dated timeline (grid5). Add a
  small pill badge showing the date of the Day-5 reminder ("Oct 10"). Rewrite the
  line as *"Oct 10: I remind you. Grudgingly."*, which is already close to the
  current copy.
- **Why:** this is a small trust boost on the screen just before the price.

---

## 3. Don't copy

- **Asking for a name** (Gentler Streak `003.jpg`, Liven `005.jpg`, The Pattern
  `006.jpg`). Locturne's `deal` screen promises "No name, no email". Breaking that
  costs more trust than the name gains. Echo their answers instead (steal items
  2 and 10).
- **Rating prompts in onboarding** (Tiimo rows 23–25). Apple now rejects these. Also
  never ask for a "5-star" rating (Liven rows 69–70).
- **Trial toggles and weekly plans preselected** (Liven `showcase-5.jpg`), **"SAVE
  114%" maths** (The Pattern `showcase-4.jpg`), and **runs of discount upsells after
  purchase** (Headway rows 53–58, Liven 42–43). These are rejection risks, and they
  are off-brand for a calm night app.
- **Fake "Personalizing… 70%" loaders** (Liven `showcase-3.jpg`, Headway row 39
  "Sealing your commitment"). Building the plan on screen with real data (steal item
  6) gets the same effect honestly.
- **Social-proof wallpaper**: celebrity faces (Headway `003.jpg`), "1,040,000 women"
  (Liven `007.jpg`), Harvard/Oxford logos (Liven row 27), laurel stats (Liven
  `003.jpg`). Locturne has no numbers to show yet, and invented ones would break
  trust. Loc's dry voice is the brand, and laurels clash with it.
- **ATT on the first screen** (Imprint `003.jpg`, Headway `002.jpg`, Liven `001.jpg`).
  Locturne doesn't need ATT at all; keep it that way.
- **Account or email sign-up before any value** (The Pattern `003–005.jpg`, Tiimo
  `002–004.jpg`). It goes against the "no email" promise.
- **40-screen quizzes** (Headway 41, Liven 37). Locturne is at about 21 screens before
  the paywall. The steal items make existing screens richer rather than adding more.
  The only additions are the 2–3 chapter cards and maybe one statement card.
- **Pastel illustration mascots in many poses** (Headway brain, Yorhart, Tiimo).
  Loc has no art in v1, and his voice is the mascot. Don't fill the gap with stock
  illustrations; The Pattern (monochrome, logo only) shows that the restrained route
  can work too.
- **Streaks and "don't break the chain" pressure** (Tiimo rows 28–29, Imprint
  `showcase-7.jpg`, Liven rows 66–68). These lean toward the punishment mechanics
  GAME_PLAN rules out. If anything is shown, it should be a quiet count of mornings,
  not a streak to protect.
- **The colour-theme picker** (Structured row 12). Locturne's brand is one fixed
  nocturne palette, so letting users theme it would dilute it.

## The single most important insight

The best apps here make **the screen itself react to the answer**: the sky behind the
time picker (Structured), a result line that recalculates under the choice (Imprint),
a mascot that replies to you (Gentler Streak), and a plan built from your inputs
(Structured, Headway). Locturne's sameness problem is not too many questions. The
screen just sits still while the user answers. Give every input one live reaction (the
haze, a Loc line, a running tally, or the night card filling in), and the same 21
screens will feel personal and branded.
