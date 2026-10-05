# Group D: screen-time blockers, onboarding teardown for Locturne

Written 2026-10-05. Sources: `FLOW.md` plus every free image (001–008, showcase-1…7) in
each app folder of `docs/design-references/onboarding-library/`, compared with
Locturne's current flow in `_locturne-before/grid0–6.jpg`. Revenue figures are
screensdesign's estimates from each FLOW.md title. "Row N" means row N of that app's
FLOW.md. Most rows are text descriptions only; images are cited where they exist.

## The pattern across all seven, in one paragraph

Every app that earns real money has at least one moment where **your answer comes
back at you changed**: Opal turns hours into "31 years" (showcase-2); Brainrot's
brain visibly rots as you drag a slider (007/008) and then names you a "Nighttime
Scroller" (row 22); Unrot's brain mascot texts you by name and you reply in chips
(006–008); Prayer Lock writes your name and a date onto a "90 day prayer journey"
card while you type (007). The two weakest earners, ClearSpace ($7k) and Bible Mode
($15k), ask plain questions and never react to them. ClearSpace even charges the
same $59.99/yr with the same 7-day trial and dated timeline as Locturne
(showcase-4), so price and paywall layout are not what separates the winners.
Locturne's quiz is currently closer to ClearSpace: nine screens in a row with the
same layout (headline, subline, five black pills), and the voice only shows up on
separate screens (`tried-echo`, `math`).

---

## 1. Per app

### Opal: Screen Time Control ($600k/mo)

- **Screens to paywall:** 27 recorded rows (paywall is row 28). Rows 3–8 are one
  auto-advancing welcome carousel and rows 21–25 are Apple's own permission sheets,
  so about 15 designed screens.
- **Arc:** product-mockup carousel + press logos → 4 quick questions (daily screen
  time, habit, age, job) → "Calculating / Preparing report" → "Some not-so-good
  news, and some great news" → your years on your phone → (rating prompt) → years
  you could reclaim → Screen Time explainer + permission → personalized goals →
  before/after paywall with a dated trial timeline.
- **Personalization:** projection of your own answer into a giant number ("159
  days… 31 years", showcase-2, row 16); a two-beat "bad news / good news" reveal
  (rows 15, 16, 19 "9 years+ reclaimed"); goals checklist built from answers (row 26);
  before/after chart on the paywall (showcase-3).
- **Brand:** black UI, white pill buttons, one gradient accent for the big number;
  the welcome carousel shows the *block screen itself* in several personalities
  ("TikTok Under a Wizard's Spell", "The Gift We Hold" haiku, 005/006); gem
  rewards after purchase (rows 31–37).
- **Screen Time + app picking:** an explainer screen (row 20), then Apple's sheet,
  a "Connecting to Screen Time" spinner (row 22), Face ID, "approved" (row 25), all
  **before** the paywall. The app picker comes **after** the paywall (row 54:
  "select up to 3 distracting apps" over a cluster of app icons, then Apple's picker
  row 55). Notification ask uses an arrow pointing at Allow (row 56).
  Attribution ("How did you hear") is asked after purchase (row 58).
- **Best screens:** showcase-2 (one huge personal number, nothing else);
  showcase-3 (before/after + dated timeline paywall); row 15 (the two-beat
  "not-so-good news, and some great news" turn).
- **Apple would now reject:** the rating prompt inside onboarding (rows 17–18).
  The arrow pointing at the system Allow button (row 56) is the kind of nudge
  App Review has flagged under 5.1.1.

### Brainrot: Screen Time Control ($150k/mo)

- **Screens to paywall:** 48 (paywall row 49). Long, but fast: most are one tap.
- **Arc:** cute brain mascot → "Meet your brain: the more you brainrot, the more your
  brain rots" → **interactive slider: drag from Healthy to Full rot and the brain
  rots live** (007 → 008) → education → goal / effects / persona / when you lose
  control / what you tried → age → daily screen time slider where the mascot and a
  feedback line react to the value (rows 18–20) → three-bar "analyzing" loader
  (showcase-4) → **"Nighttime Scroller" attention profile** (row 22) → "OOF" → 106
  days → 21 years → life dot grid (showcase-5) → reclaim → research logos → (rating)
  → reviews → Screen Time permission with mascot → "tap 5x to break the chain"
  (rows 46–47, showcase-6) → paywall with before/after (showcase-7) → 50% off.
- **Personalization:** live reaction to slider values (rows 18–20, 007/008); a named
  persona result built from answers (row 22); persona cards ("Builder / Creator",
  row 13).
- **Brand:** one illustrated mascot on nearly every screen, cream background, one
  coral button; the block screen in the hero mockup is the mascot saying "bruh
  enough TikTok" (002).
- **Screen Time + app picking:** a mascot screen explains it, then Apple's sheet
  stays on top of the mascot (rows 38–42). No picker before the paywall.
- **Best screens:** 007/008 (input changes the mascot live); row 22 (persona name);
  rows 46–47 (a physical commit ritual).
- **Apple would now reject:** rating prompt in onboarding (rows 35–36). The
  "Nearly dead" brain and "life remaining" grid are shame mechanics Locturne bans.

### one sec ($80k/mo)

- **Screens to paywall:** 4 (paywall row 5). Soft paywall with "Skip for now".
- **Arc:** one stat screen with "Set up now (takes 5 mins)" and **"Remind me
  tonight"** (001) → **five survey questions on one scrolling screen** marked "Data
  not shared" (002/003) → **"Based on your answers, we think Delayed mode suits you"**
  (004) → Free vs Pro paywall with swipeable feature cards that each have a "Try"
  demo button (005–008) → setup.
- **Personalization:** one recommendation from the answers (004). That's all, and
  it's enough to make the survey feel like it did something.
- **Brand:** flower illustrations, an indie-developer manifesto on the paywall
  (row 16), student discount.
- **Screen Time + app picking:** after the paywall. Before the picker, it asks
  *when* the intervention should happen and shows a **3-step preview strip**
  ("Open app → Use for 1 min → Intervention", showcase-5). After picking, it says
  the rule back in plain English: "Great, Apple Music is now set up… you can use
  it 3 min every hour, then…" (showcase-6). Because picker tokens are opaque, it
  has to ask "Is Facebook the TikTok app?" (row 34).
- **Note:** one sec has a **"Phone-Free Morning"** feature buried in settings
  (rows 103–104). Direct overlap with Locturne's promise, but nobody would find it.
- **Best screens:** 004 (recommendation); showcase-5 (preview strip); showcase-6
  (plain-English rule after setup).
- **Apple would now reject:** rating prompt (rows 52–53), though it comes after the
  paywall during setup.

### ClearSpace: Reduce Screen Time ($7k/mo)

- **Screens to paywall:** 15 (paywall row 16), three of them a sign-in wall.
- **Arc:** sign-in wall (002–004) → goal → "why do you want to **find calm**?" →
  age → job → permissions checklist (Screen Time, notifications, ATT; rows 9–14) →
  attribution → paywall.
- **Personalization:** only one device: the previous answer is echoed, highlighted,
  in the next headline ("why do you want to *find calm*?", 006). Nothing reacts.
- **Brand:** navy, a soft glowing orb splash (001), lowercase type. Generic.
- **Screen Time + app picking:** Screen Time before paywall; picker after, then a
  per-app "how many times a day" budget and a big "setup complete" with the chosen
  icons (showcase-6).
- **Best screens:** 006 (answer echo in headline); showcase-4 (same $59.99/7-day
  timeline paywall as Locturne: proof the paywall alone doesn't carry it);
  showcase-6 (chosen icons shown big after setup).
- **Apple:** nothing obviously rejectable. "97% of users feel more present within
  7 days" (showcase-4) is an unsupported claim.

### Unrot: Screen Time Battery ($40k/mo)

- **Screens to paywall:** 47 (paywall row 48).
- **Arc:** social proof → **"Hey! I'm your brain. (The one you kept ignoring at
  2am)"** (003) → name (004) → attribution → **a fake notification "Brain: Hey Julia,
  we need to talk", tap it** (006) → **a chat where the mascot texts you and you
  answer with reply chips** ("yea am i cooked?", "stop calling me out"; 007/008,
  rows 9–13) → mechanics (apps go to jail, coins) → habits → screen time → year
  dot grid → feelings → encouragement by name → (rating) → reviews → ATT +
  notifications → fingerprint "commit" button (rows 39–40) → loader → **dated plan:
  "You will unrot by May 18, 2026" with Week 1/2/3** (showcase-6) → paywalls.
- **Personalization:** name everywhere; chat that reads your answers back; a
  finish date.
- **Brand:** the mascot *is* the interviewer. The chat makes the quiz feel like a
  conversation instead of a form, which is exactly Locturne's problem.
- **Screen Time + app picking:** not before the paywall (only ATT and notifications,
  rows 35–38).
- **Best screens:** 007/008 (chat quiz with reply chips); 003 (the parenthetical
  joke under the hello); showcase-6 (dated plan).
- **Apple would now reject:** rating prompt (rows 32–33) and the countdown-timer
  "special offer" paywall (row 49).

### prayer lock: christian focus ($75k/mo)

- **Screens to paywall:** 21 (paywall row 22).
- **Arc:** ATT at launch → 2 story pages → **"it's simple. once a day, we block your
  apps" (icons shown locked, 005) → "once you pray, your apps unlock" (same icons
  unlocked, 006)** → **name typed onto a "90 day prayer journey" card that already
  shows your name and a date** (007) → age → phone-hours slider with a big number
  (showcase-2) → personal stat → "16 years back to God" (showcase-3) → (rating) →
  testimonials → denomination → **notification ask with a preview card of the
  notification you'll get** (row 17) → attribution → mechanics → video testimonials
  → paywall.
- **Personalization:** your name rendered onto a branded object (007); denomination
  changes prayer content (row 16).
- **Brand:** watercolor Jesus-and-lamb art, orange, lowercase, one strong idea
  (lock → pray → unlock) shown with icons, not words.
- **Screen Time + app picking:** very late, after the paywall and after the app
  tour (rows 51–54).
- **Best screens:** 005 → 006 (same icons locked then unlocked: the whole product in
  two frames); 007 (personal artifact); row 17 (notification preview).
- **Apple would now reject:** rating prompt (rows 13–14).

### Bible Mode: Reduce Screen Time ($15k/mo)

- **Screens to paywall:** 26 (paywall row 27).
- **Arc:** **four editorial serif statements with small-caps eyebrows** ("WHO IS THIS
  FOR?", "WHAT DOES IT DO?", "WHY IT MATTERS", 001–004) → reviews → "select your
  apps" (static icon grid, 006) → "snap a pic of your Bible to unlock" demo with
  **"Tap below then tap notification"**, i.e. a real notification fired during
  onboarding (007/008) → you complete one real verse flow (rows 10–14) → confetti →
  (rating) → 3 quiz questions → stats → loader → graph → paywall.
- **Personalization:** almost none; the demo carries it.
- **Brand:** warm serif, cream gradient, red accent words. Calm and premium.
- **Screen Time + app picking:** after the paywall (rows 31–34).
- **Best screens:** 003 (editorial explainer, very close to Locturne's `deal`);
  007 (real notification as part of the demo); rows 10–14 (doing the core loop
  before paying).
- **Apple would now reject:** rating prompt (rows 17–18); the "Enable Free Trial"
  toggle paywall (showcase-5) is a pattern App Review has been rejecting under 3.1.2.

---

## 2. Steal list for Locturne (ranked)

Rules applied to every item: Loc has no art, so "the mascot reacts" means **his
italic serif line changes**; the moon and moon transitions stay as they are; native
SwiftUI controls (via `@expo/ui`); no glow; no name or email (the `deal` screen
promises "No name, no email"); no shame.

### 1. Loc answers every answer, on the same screen
**Steps:** `nights`, `night-minutes`, `morning-minutes`, `tried`, `time-back`, `age`
(folds `tried-echo` into `tried`).
**Evidence:** Brainrot rows 18–20 (feedback line changes with the value), Brainrot
007/008 (mascot changes live), Unrot 007/008 (mascot replies to each chip).
**What it shows:** tap a pill → the other pills fade to 30%, the chosen one stays
white, and one italic serif line from Loc fades in under it. Hold ~1.2 s, then
advance (or Continue appears). One line per option, under eight words. Examples:
- `nights` → "One more video. Then twelve more." → *"I've seen the twelve. They're
  not worth it."* / "I can't sleep, so I scroll." → *"Neither can I. Your phone is
  why."* / "Honestly, all of it." → *"Respect. Terrible, but respect."*
- `night-minutes` → "2+ hours" → *"That's not a habit. That's a night shift."*
  / "Under 10 minutes" → *"Sure."*
- `morning-minutes` → "1+ hour" → *"So the bed wins. Every morning."*
- `tried` → "Willpower" → *"Bold. How'd that go."* / "Another blocker app" →
  *"It had an Ignore button. I don't."*
- `age` → *"Old enough to know better. Same."* (one line for all)
**Why:** this is the single fix for "the quiz screens all feel the same". The
screens stay simple, but every one now has a moment that only Locturne would say,
and the user sees their exact choice acknowledged. It also removes the separate
`tried-echo` screen (one fewer screen).

### 2. Turn the two "how long" questions into native sliders with a big live number
**Steps:** `night-minutes`, `morning-minutes`.
**Evidence:** Prayer Lock showcase-2 (big "8 hours/day" over a slider), Brainrot
rows 18–20 (slider + reacting line).
**What it shows:** a SwiftUI `Slider` (from `@expo/ui`), above it the value in the
big serif ("45 min"), below it Loc's line, which swaps at thresholds ("*Ten minutes.
Sure.*" → "*An hour. I was awake for all of it.*" → "*Two hours. I need a nap.*").
Light haptic tick at each threshold. Keep "A rough guess is fine."
**Why:** breaks the run of identical pill lists with a different, physical input,
and gives a continuous value for `math` instead of a bucket midpoint. Native
control, so it fits the HIG rule.

### 3. Carry the user's own words into the next headline
**Steps:** `night-minutes`, `nights-per-week`, `morning-minutes`, `time-back`.
**Evidence:** ClearSpace 006 ("why do you want to *find calm*?" echoes the
previous answer).
**What it shows (examples):**
- `night-minutes`: "After *one more video*, how long are you up?"
- `nights-per-week`: "Which nights is it *one more video*?"
- `morning-minutes`: "And in the morning, before you get up?" with the sub-line
  "Counting from your 7:00 alarm." once `wake` is known (or "the first alarm" until then).
- `time-back`: "Say you got those 45 minutes back."
Echoed words in italic serif (Loc quoting you), the rest in the sans.
**Why:** cheap, and it makes the quiz feel like one conversation that is listening,
not six unrelated forms. ClearSpace does it once; Locturne can do it on every step.

### 4. A real Loc notification during `armed`, in their bedtime
**Step:** `armed` (notification permission is already asked here).
**Evidence:** Prayer Lock row 17 (notification preview card before the ask),
Unrot 006 (mascot "sends" a message), Bible Mode 007 (real notification fired
during onboarding as part of the demo).
**What it shows:** before the iOS sheet, a frosted lock-screen notification card
(monochrome, no glow): **"LOCTURNE · 11:15 PM — Fifteen minutes. Then they sleep.
Then I do."** using their real bedtime minus 15. Line under it in Loc's voice:
*"Two of these a day. That's my limit."* After they tap Allow, schedule one real
notification ~5 seconds later: **"It's me. Testing. Don't get used to it."**
**Why:** shows exactly what they're agreeing to with their own time in it (more
honest and more personal than a bell icon), and the first real notification is
Loc talking, which makes him feel present outside the app. Do not draw an arrow at
the Allow button (Opal row 56), and don't style the card as a fake iOS banner over
the system sheet.

### 5. Two-beat reveal: the number, then what their own answer buys back
**Step:** `reveal` (and optionally `math`).
**Evidence:** Opal rows 15 → 16 → 19 ("not-so-good news, and some great news",
then "9 years+ reclaimed"); Brainrot rows 23–29 (OOF, then "Let's do this").
**What it shows:** keep "7½ hours … a week on your phone in bed" exactly as is.
After a beat, a second line fades in below the dot grid, built from `time-back`:
*"Or 7½ hours of slow mornings. Your pick."* / *"Or seven and a half hours of
sleep. I know which one I'd take."* / *"Or a book. A whole book. Every week."*
**Why:** the reveal currently ends on the bad number; the winners always turn it
into the payoff in the same moment. Using the user's own `time-back` answer makes
the good news theirs, not a stat. Stay in hours per week; don't escalate to "years
of your life" (Opal showcase-2, Brainrot 25), which tips into shame.

### 6. Their chosen icons go to sleep right after picking
**Step:** `apps` (right after Apple's picker closes).
**Evidence:** Prayer Lock 005 → 006 (same icons shown locked, then unlocked);
ClearSpace showcase-6 (chosen icons big on "setup complete"); one sec showcase-6
(rule said back in plain English).
**What it shows:** the selected apps render via the picker's `Label(token)` (the app
can't read the names as text), then play the existing restrained app-sleep
transition on them (no particles, moon unchanged). Loc: *"Three. They'll sleep at
11:30. So will I."* The button stays "Put 3 to sleep".
**Why:** the moment of choosing becomes the first time the user sees the product
work on *their* apps. Note: because tokens are opaque, Loc's line can say the count
and the time but not "Night, TikTok" (one sec row 34 shows the same limit).

### 7. Give the user a "type" on `reveal`, named by Loc
**Step:** `reveal` (header above the number), reused on the share card.
**Evidence:** Brainrot row 22 ("Nighttime Scroller" profile right after the loader).
**What it shows:** a small-caps eyebrow from the `nights` + `night-minutes`
answers: "ONE MORE VIDEO TYPE" / "CAN'T-SLEEP SCROLLER" / "LOST TRACK OF TIME" /
"ALL OF THE ABOVE". Loc line: *"I've met your type. Usually at 2 AM."*
**Why:** gives the share button something to share that isn't a bare number, and
proves the quiz was used. Keep it as a label, not a personality-test page.
Lower priority than 1–6.

### 8. A factual before/after on `offer` using their numbers
**Step:** `offer` (above the dated timeline).
**Evidence:** Opal showcase-3, Brainrot showcase-7, ClearSpace showcase-4 (all three
put a before/after at the top of the paywall).
**What it shows:** two plain rows, no chart and no promised outcome:
"**Now** · about 7½ h a week on your phone in bed" /
"**From tonight** · apps asleep 11:30 PM until you're downstairs."
**Why:** the winners anchor the price against the user's own problem. Locturne's
version stays honest because the "after" is the schedule they set, not a claim
about results (avoid ClearSpace's "97% feel more present").

### 9. Recommend the method as Loc's pick, using their answers
**Step:** `method`.
**Evidence:** one sec 004 ("Based on your answers, we think Delayed suits you").
**What it shows:** after "Yes, there are stairs": *"Downstairs, then. Coffee's down
there anyway. I hate stairs. That's the point."* After "No, all one floor": *"Fine.
200 steps. Kitchen and back counts."* (It already half does this; make the
recommendation explicit and tied to their answer.)
**Why:** one sec's whole survey pays off in one recommendation; Locturne's stairs
question already is that recommendation, so say it like one.

### 10. Move `found` to after purchase
**Step:** `found` → after `armed` (or into `first-morning`).
**Evidence:** Opal asks attribution after purchase (row 58); its pre-paywall quiz is
only four questions.
**Why:** it's the one question that is for Locturne, not for the user, and it sits in
the middle of the personal questions. Paying users still answer it afterward. One
fewer pre-paywall screen. (If `age` doesn't change anything the user sees, the same
logic applies to it.)

### 11. Optional: one quiz step as a short exchange with Loc
**Step:** `tried` + its echo, or `hello` → `deal`.
**Evidence:** Unrot 006–008 and rows 9–13 (mascot asks, user taps a reply chip,
mascot answers).
**What it shows:** Loc's line big in serif, two or three reply pills in the user's
voice ("Screen Time limits", "Willpower, mostly", "Nothing yet"), his reaction
appears under the chosen pill. Not an iMessage clone: no bubbles, no fake
notification banner, no typing dots.
**Why:** it's the strongest "the mascot is talking to *me*" device in the set. Use it
on one step for variety rather than turning the whole quiz into chat (item 1 gives
most of the benefit already).

---

## 3. Where Locturne already beats them

- **The demo is real.** `tomorrow` + `walk` (20 real steps) let the user feel the
  morning before paying. Only Bible Mode does anything similar (rows 10–14), and
  theirs is a content flow, not the product's actual unlock.
- **Screen Time framing.** "I need Screen Time access… Apple's paperwork. Not mine."
  is clearer and funnier than every competitor's generic explainer (Opal row 20,
  Brainrot 38, one sec 28). Keep it.
- **Commit ritual.** "Hold to agree" on a card showing their bedtime, alarm, method
  and app icons beats Brainrot's "tap 5x to break the chain" (rows 46–47) and Unrot's
  fingerprint (rows 39–40): it's the same ritual, but the user is agreeing to
  something concrete.
- **The voice is the mascot.** Brainrot/Unrot/Prayer Lock need illustrators for every
  screen; Locturne's lines do the same job and are already sharper (`hello`: "I'm Loc.
  Raccoon. I don't do mornings well either."; `math`: "You said twenty minutes. I
  said nothing.").
- **Honest paywall.** Dated trial timeline with grudging Loc copy ("Day 5: I remind
  you. Grudgingly."), reminder toggle, no countdown, no trial toggle, no rating prompt,
  no ATT prompt. Five of the seven apps here include something App Review now rejects.
- **No account, no name, no email.** ClearSpace opens with a sign-in wall (002–004);
  Unrot and Prayer Lock ask for a name first. Locturne's promise on `deal` is a
  feature; personalize with their times and words instead.
- **Apps picked before the paywall.** Opal, one sec, Prayer Lock and Bible Mode all
  pick apps after paying, so their paywall can't show your apps. Locturne's `commit`
  card and `plans` checklist ("Your apps sleep today at 11:30 PM") already do.

## 4. Don't copy

- **Rating prompts in onboarding:** Opal 17–18, Brainrot 35–36, Unrot 32–33, Prayer
  Lock 13–14, Bible Mode 17–18, one sec 52–53.
- **Countdown "special offer"** (Unrot row 49) and **free-trial toggle paywall**
  (Bible Mode showcase-5).
- **Shame visuals:** the rotting "Nearly dead" brain (Brainrot 008), "life remaining"
  dot grids (Brainrot 27–28, Unrot 25), "31 years of your life" (Opal showcase-2).
  Locturne's weekly-hours number is the right size; don't escalate it.
- **Name capture / sign-in walls** (Unrot 004, Prayer Lock 007, ClearSpace 002–004):
  breaks the "No name, no email" promise.
- **ATT prompt at launch** (Opal 002, Prayer Lock 001–002) and **arrows pointing at
  the system Allow button** (Opal 56).
- **Fake system UI:** Unrot's fake push banner (006) works for them but is the kind
  of thing that reads as a trick; Locturne's notification preview should be clearly
  a preview card, then a real notification.
- **Gamification and social** after purchase (Opal gems and contacts rows 31–49,
  Prayer Lock kingdom/sheep rows 60–69, Bible Mode Faith Points): off-brand for a
  tired raccoon and outside the GAME_PLAN.
- **Glow:** ClearSpace's glowing orb splash (001), Opal's glowing gradient buttons
  (004 "Save", showcase-7 "Relock Apps"), Opal's glowing gem (row 37).
- **Unverified claims:** "97% feel more present" (ClearSpace showcase-4), university
  logos (Brainrot 34), "Backed by science" badge (one sec 001).
- **Opal's whole layout** (dark mockup carousel + press logos + before/after paywall):
  borrow single devices from it (two-beat reveal, before/after rows), not the screen
  sequence.
- **Burying the morning feature** (one sec's "Phone-Free Morning", rows 103–104):
  a reminder that the morning lock is Locturne's whole pitch and should stay up front.
