# Group C — the quiz-to-paywall converters

Apps: Cal AI, QUITTR, Noom, Umax, BetterMe, Lose It!, RIZZ, I Am Sober.
Source: each app's `FLOW.md`, `001–008.jpg` and `showcase-N.jpg` in this library (screensdesign.com, fetched 2026-10-05).
Compared against the current Locturne onboarding (`_locturne-before/grid0–6.jpg`).
"Row N" means row N in that app's FLOW.md. "001" or "showcase-3" means the image file.

## Where Locturne stands before reading this

Locturne reaches the paywall in about 21 screens. In this group that is short to normal: RIZZ takes 16, I Am Sober 17, Umax 22, Cal AI about 40, BetterMe about 39, QUITTR about 49, Lose It about 84 and Noom about 105. **Length is not the problem.** Most Locturne quiz screens look the same: the same headline, a stack of black pills and a white Continue. Answers mostly disappear until the reveal. The best apps here make each answer *do something you can see*: a line under the answer reacts, a number moves, a plan card fills in, or a dated graph bends. Locturne already does some of this well: the tried-echo, "You said twenty minutes. I said nothing.", the dated trial timeline and the hold-to-agree. The job is to spread that across every step.

---

## 1. Per app

### Cal AI — $1.8M/mo — about 40 screens to the paywall (first paywall at row 41)
- **Arc:** product hero → about 12 profile questions → a graph after almost every answer → goal pace slider → Health and notifications permissions → rating prompt → "All done" → a loader with a 97% checklist → a custom plan with numbers → account → dashboard → paywall.
- **Personalization devices**
  - The subtitle on every input says "This will be used to calibrate your custom plan" (003, 004, 008).
  - The goal slider gives a live result as you drag: sloth, rabbit and cheetah markers, plus "You will reach your goal in **2 months** · Daily calorie goal" (showcase-2, row 14).
  - The goal weight is echoed back as a "realistic target" message (row 13).
  - Comparison graphs ("Your weight", Cal AI vs a traditional diet; 007, rows 15 and 19).
  - A loader that ticks off a checklist of *their* metrics (row 32, showcase-4 "25%").
  - The plan screen shows their calories, macros and a health score (row 33).
- **Branding devices:** almost none. It is plain black and white Apple-style. The brand is the speed and the camera shot (002). That shows a top earner can be visually plain if every screen gives the user something back.
- **Best screens:** showcase-2 (a slider with a live result), 007 (a graph of your future vs the default), showcase-5 (a 3-day trial timeline with "In 2 Days – Reminder" and "No Payment Due Now").
- **Apple risk:** an in-onboarding rating prompt and a "write a review" screen (rows 25–26). Its "80% of users maintain…" claim has no source.

### QUITTR — $25k/mo (the lowest earner in this group, so treat its tricks as unproven) — about 49 screens (row 50)
- **Arc:** a calm splash with stars → sign-in wall (003–006) → a "tracked profile card, 0 days" (007) → "Question #1…" quiz → "Calculating" → a dependence score vs average → symptom picker → 11 education and fear slides → testimonials → rating prompt → **signature commitment** (showcase-4) → a personalized greeting → a recovery plan card → a run of discount paywalls.
- **Personalization devices**
  - The profile card shows their name and "Free since 10/08" before any question, with "Now, let's build the app around you." (007).
  - A score chart that compares them to the average (row 20).
  - Picking symptoms (rows 21–22).
  - A "target date" on the paywall (row 53).
- **Branding devices:** a night sky with a moon (002, almost Locturne's world), a heavy custom logotype, a toucan mascot (003), and a full-red fear slide (showcase-3).
- **Best screens:** 007 (an identity card made before the quiz), showcase-4 (signing a commitment), 002 (a moonlit welcome).
- **Apple risk and dark patterns**
  - Rating prompt (rows 39–41).
  - "ONE TIME OFFER… expires in 5:00" countdown with 80% off (showcase-5, rows 55–62).
  - Lifetime "80% off" scarcity banner (row 75) and "100% off" (row 97).
  - A shaming panic button: "YOU'RE GOING TO REGRET IT LIKE YOU ALWAYS DO" (showcase-7).

### Noom — $500k/mo — about 105 screens (plan with countdown at row 105, paywall at row 106)
- **Arc:** lifestyle photo carousel → account → name → "Hi Julia" with a character (row 12) → body stats → goals → an **upcoming event and its date** (rows 29–31) → a pace graph → a 10-step "Behavioral Profile Quiz" with agree sliders (showcase-4) → a type result, "Proof Seeker" (row 50) → more yes/no → a "Building plan" loader that teaches while it loads (rows 61–67) → a checklist loader with questions popping up inside it (rows 90–94, showcase-5) → **a one-line-per-screen reveal** (rows 98–103) → a dated plan graph → paywall.
- **Personalization devices**
  - The user's name is used throughout.
  - The projection graph is redrawn three times as answers come in (rows 37, 55, 72).
  - **The user's own event appears as a labelled point on their graph**: "VACATION (133 LB)" on the way to "GOAL 120 LB" (showcase-6).
  - A personality type result (row 50).
  - The reveal sequence: "Based on your answers" / "we've created a personalized plan" / "120 pounds by December 31" (rows 99–102).
- **Branding devices:** a serif headline with an italic word ("Unlock your *motivation*", "Make your health *a habit*", 002–008). That is the same idea as Loc's italic serif. Also a red star mark and a red/teal palette.
- **Best screens:** showcase-6 (a dated graph with their own event on it), rows 98–103 (a typographic reveal, one line per beat), showcase-4 (agree-slider questions that break up the pill lists).
- **Apple risk and dark patterns:** "Personalized plan saved: 14:54" countdown (showcase-6 footer, rows 105–106). The tracking prompt appears on the very first screen (002). "Lose twice as much weight" is a claim (showcase-3).

### Umax — $65k/mo — about 22 screens (paywall rows 23–26)
- **Arc:** tracking prompt → gender → **"Enjoying Umax?" rating prompt on screen 4** → referral code → notifications → face and side selfie → scan → "Reveal your results": the user's own scores blurred until they pay or invite 3 friends (showcase-7).
- **Personalization devices:** the user's own face is the input (showcase-5). The result is about *them*: "Overall" vs "Potential" scores, "You as a 10" (showcase-4). Hiding the result is the paywall's whole pitch.
- **Branding devices:** a neon gradient U, purple gradient pills and 5 stars. **All of it is glow, so it is banned for Locturne.**
- **Best screen:** showcase-7 shows the user's result is ready. As a structure, "you are owed something about yourself" is the lesson. The blur and invite-to-unlock are not.
- **Apple risk:** the rating prompt at screen 4 (004). Gating results behind inviting friends.

### BetterMe — $1M/mo — about 39 screens (row 40)
- **Arc:** "150+ million users" login → account → health-data consent → sex → birthday → **"Over 7 million women in their 30s already tried BetterMe"** (007) → goal → body-area map (showcase-2) → body type → dream body → routine, energy, sleep, diet → height and weight with a BMI card that reacts → name → summary → pace → event → a dated goal graph (showcase-4) → a loader checklist → plan → trial-timeline paywall → **4 upsell paywalls after purchase** (rows 43–50).
- **Personalization devices**
  - A "why we ask" card under the input (006: "Creating your personal plan — Older people may have more body fat…").
  - A card that reacts to the value entered (showcase-3: "Your current BMI is 25 which is overweight…").
  - A cohort echo right after age: "women in their 30s" (007).
  - A dated projection: "50 kg by Jul 5, 2025" (showcase-4).
- **Branding devices:** consistent 3D women avatars and red pills. They are recognizable but generic.
- **Best screens:** 007 (age turned into belonging right away), showcase-3 (an inline reaction to an answer), showcase-5 ("How does trial work?" Today / Day 5 / Day 7, with an "Unlock trial and reminder" toggle).
- **Dark patterns:** a stack of post-purchase upsells with "50% discount" (rows 43–50). The account wall comes first (002–003).

### Lose It! — $1M/mo — about 84 screens (account at row 84, paywall at row 85)
- **Arc:** features → tracking prompt → **an empty "PROGRAM" card listing 5 parts** (004) → goal, obstacle, confidence → "Thanks for sharing your thoughts" (008) → weight → the program card again with parts filled → calorie maths → **a recommended plan and "Not recommended" alternatives** (rows 28–31, showcase-4) → schedule, nutrition and fasting setups, each followed by the updated program card (rows 36, 41, 42, 61, 70) → a "drum roll, see my recommended strategy" beat (row 58) → loaders with social proof (rows 79–81) → **"Your program is complete! You'll reach 50 kg on February 1, 2026"** (showcase-5) → account → paywall → a first-meal tutorial right away (rows 95–102).
- **Personalization devices**
  - **The plan is a visible object that fills in, line by line, across the whole quiz** (004 → showcase-5).
  - Every line ends up holding the user's own numbers: "Lose 6.6 kgs", "1,239 average daily calories", "Flexible Weekender Schedule: eat more on Sat, Sun", "12h – Wed and Thu".
  - The recommended plan shows its trade-offs (showcase-4: "Eat 1,514 calories per day · Lose ¼ kg per week · About 26–28 weeks to reach goal").
- **Branding devices:** navy and orange. Plain, but the program card is the recurring brand object.
- **Best screens:** 004 + showcase-5 (the same card, empty then full), showcase-4 (one recommended option plus alternatives), 008 (thanks for sharing).
- **Apple risk:** none of note. The tracking prompt comes early (003).

### RIZZ — $150k/mo — 16 screens (row 17)
- **Arc:** "#1 Dating assistant" → press logos → **the product's output shown before any question** (003–004: a bio, then 5 replies that quote it: "Alisa", "29", "cop") → logo → 2 feature slides → rating prompt → notifications → **one "Final Step" screen with sex, age and intention as chips** (showcase-4) → paywall.
- **Personalization devices:** few before the paywall. The demo is personalized to a *sample* person, and that is enough to show the trick.
- **Branding devices:** a bold italic wordmark (006), "DATES" type flashes (005) and a purple haze.
- **Best screens:** 004 (output that echoes its input), showcase-4 (three trivial questions folded into one screen).
- **Apple risk and dark patterns:** rating prompt (rows 10–13). "**8 spots remaining**" fake scarcity on the paywall (showcase-5). $9.99/week shown as "$1.43 per day".

### I Am Sober — $200k/mo — 17 screens (row 18)
- **Arc:** "First of all, congrats! You've just taken a big step" (001) → what you're quitting → start date → days a week (a 7-box strip of X marks, 004) → drinks a day (a stepper with icons, 005) → improve up to 3 → how important → **"I see myself as someone who is…"** (008) → who to involve → **pick your first milestone** ("Weekend conquered", row 11) → **typed goal and typed "why"** (rows 12–13) → pledge reminder times → notifications → privacy → testimonial paywall, "Try For $0.00" (showcase-3).
- **Personalization devices**
  - Identity wording (008).
  - The user's own typed reason is **reused inside the app after the paywall**: "I am doing this for myself" shows up as a motivation card and post text (rows 73, 84, 89–90).
  - A milestone they picked themselves.
  - A reminder set at their own time.
- **Branding devices:** painted landscape illustrations (001, showcase-6) and a big milestone counter (showcase-5).
- **Best screens:** 001 (praises the user for starting), 008 (an identity choice), 004 (a week strip input that isn't a pill list).
- **Apple risk:** none seen before the paywall.

---

## 2. Steal list for Locturne (ranked)

All of these use what Locturne already has: the moon and haze, white and black pills, Loc's italic serif voice and native SwiftUI controls. None needs a glow, a fake timer, a struck-through price or a rating prompt.

### 1. Loc answers every pick on the same screen (steps: nights, night-minutes, nights-per-week, morning-minutes, found, age, tried, time-back)
**Evidence:** BetterMe puts a reaction card under the input that changes with the answer (006, showcase-3). Cal AI echoes the goal back at once (row 13). Lose It says "Thanks for sharing your thoughts" (008). Locturne already does this once, on method ("I hate stairs. That's the point.").

**What it shows:** the pill list stays. When a pill is tapped, Loc's italic serif line fades in under the list, a different line for each answer. Continue follows half a second later. Examples:
- night-minutes "1–2 hours" → *"That's a movie. Every night. I've seen it. It's bad."*
- night-minutes "Under 10 minutes" → *"Sure. I'll pretend I believe you."*
- nights "I can't sleep, so I scroll." → *"The phone isn't helping with that. Ask me how I know."*
- found "TikTok" → *"Ironic. I'll allow it."*
- tried "Willpower" → *"Bold. How'd that go?"*
- time-back "Read" → *"Paper books. Very retro. I'm in."*

**Why:** this is the cheapest fix for "every quiz screen feels the same". The headline stays neutral, but every *answer* gets its own reply, so the user sees something new each time. It is also the only branding device that works without art: Loc's voice. No other app in this group has a mascot voice, so this is where Locturne can beat all of them.

### 2. A minutes slider with a live weekly total (steps: night-minutes, morning-minutes; optionally fold nights-per-week in)
**Evidence:** Cal AI's goal slider with sloth, rabbit and cheetah markers and a live "You will reach your goal in 2 months" readout (showcase-2). Noom redraws the projection as answers arrive (rows 37, 55, 72). I Am Sober uses a stepper and a week strip instead of pills (004, 005).

**What it shows:** a native SwiftUI Slider (5 to 120 minutes) replaces the 5 pills. Above it, a big serif number updates as you drag: "**45 minutes** a night". Under that, in small plain text, the week strip from nights-per-week: "× 5 nights = **3¾ hours a week**". Loc's line changes at thresholds: under 15 *"Light work."*; 30–60 *"Okay, a TV episode."*; over 90 *"Stop dragging. I get it."*.

**Why:** it changes the input type, so two of the most identical-looking screens become distinct. The user also watches their own cost add up, so the 7½-hour reveal feels earned rather than handed over.

### 3. A dated "hours back" projection with their own reason marked on it (new step after reveal, or replace math)
**Evidence:** 5 of 8 apps here end the quiz with the user's future on a dated graph:
- Noom showcase-6 marks "VACATION (133 LB)" on the line.
- BetterMe showcase-4: "50 kg by Jul 5, 2025".
- Lose It showcase-5: "You'll reach 50 kg on February 1, 2026".
- Cal AI 007 and row 19.

**What it shows:** a thin monochrome line rising across 30 days on the night-blue haze, with today's date on the left and a real date (today + 30) on the right. One labelled point uses their time-back answer: "**SLOW MORNINGS · 30 of them**". Headline in plain sans: "**By Nov 4: 32 hours back.**" Loc's line: *"That's not a projection. That's arithmetic. I'm good at arithmetic."* Small caveat: "If you keep your apps asleep. Your numbers."

**Why:** it turns the reveal from a loss (7½ hours gone) into a gain with a date, which is the frame every top converter here uses just before the paywall. It is honest, because it uses only the user's own answers and no invented outcome data.

### 4. Tonight's card fills itself in as you answer (steps: bedtime → wake → method → apps → commit)
**Evidence:** Lose It shows an empty "PROGRAM" card (004). It returns after each section with the new line filled (rows 13, 36, 41, 61, 70) and ends as "Your program is complete!" with every line holding the user's numbers (showcase-5).

**What it shows:** after the reveal, the commit card (LIGHTS OUT / ALARM / UP MEANS / APPS) appears at the top of bedtime, small, with empty dashes. Picking 11:30 PM drops "11:30 PM" into its slot with a short settle. Wake fills ALARM, method fills "Downstairs" and apps fills the icons. At commit, the card grows to full size, and the headline becomes *"Your night. Done. I didn't help."*

**Why:** four picker screens that look alike become one object being built. Each answer has a visible result, and the commit card is already Locturne's best-branded screen. Lose It, one of the two $1M apps here, uses exactly this structure.

### 5. Recommended morning, with the other options shown (step: method)
**Evidence:** Lose It shows a "RECOMMENDED FOR YOU" plan card with its trade-offs and swipeable "Not recommended" alternatives (rows 28–31, showcase-4).

**What it shows:** after "Yes, there are stairs", a big card appears:
- "**RECOMMENDED FOR YOU — Downstairs.** One trip down. About 30 seconds. Works half-asleep."
- Two smaller black cards sit beside it: "200 steps · about 2 minutes · works anywhere" and "Scan a code · put it in the kitchen".
- Loc: *"Stairs. I hate them. That's why they work."*

With "No, it's all one floor", Walk becomes the recommended card.

**Why:** it pushes downstairs as the hero method and shows the user they built their own morning. That fits the "building blocks the user combines" direction. A recommendation feels personal in a way a plain question doesn't.

### 6. A reveal in beats, not a loader (step: reveal; and a new short step between commit and offer)
**Evidence:** Noom's one-line-per-screen sequence (rows 98–103). Loaders that tick off the user's items: Cal AI row 32, BetterMe row 37, Lose It rows 79–81.

**What it shows:** 3–4 full-screen italic serif lines, each brought in by a moon transition, tap to advance:
1. *"Okay. I did the math on your nights."*
2. *"Thirty-five minutes in bed. Twenty more before you get up. Five nights a week."*
3. *"7½ hours."* (the existing number screen)

Before the offer, the same move closes the loop:
1. *"Tonight at 11:30, your apps go to sleep."*
2. *"Tomorrow at 7:00, they wait for you downstairs."*
3. *"Slow mornings start Tuesday."*

There is no fake progress bar.

**Why:** the moon transitions, which the user loves, become the reveal itself. Loc talking in big serif is the brand. Echoing three of their own answers in one line makes the result feel personal.

### 7. Their answers stay alive after the paywall (steps: armed, first-morning, and the in-app morning screen)
**Evidence:** I Am Sober reuses the user's typed "I am doing this for myself" as motivation cards and post text inside the app (rows 12–13 → 73, 84, 89–90). QUITTR builds a profile card early and shows it again on the dashboard (007, rows 46–48). Locturne already reuses "Slow mornings" once, on offer.

**What it shows:**
- armed: *"Armed. Tonight at 11:30. Slow mornings start tomorrow."*
- The morning unlock screen after the stairs: *"Up. Your apps are awake. You said slow mornings. Go have one."*
- After the third morning: *"Three mornings. Screen Time had an Ignore button. I don't."* (calls back the tried answer)

**Why:** personalization that stops at the paywall feels like a sales trick. When it carries on into the first morning, the quiz feels like it was worth answering. That drives trial-to-paid, which is where Locturne's money actually comes from.

### 8. Make age pay off, or cut it (step: age)
**Evidence:** BetterMe uses age twice right away: a "why we ask" card on the picker (006) and a cohort line on the next screen (007). Cal AI and Noom feed age into a visible plan number.

**What it shows:** after the wheel settles on 22, an inline line appears: "At 22 you need about 7–9 hours." Later, on the projection or commit card, a "SLEEP WINDOW 7½ h" line shows next to bedtime and alarm. Loc on the age screen: *"Twenty-two. You'll be fine. Probably."* Locturne has no real user counts, so don't make up a cohort figure like "1 million 22-year-olds". If age isn't used anywhere visible, drop the step. Its subtitle currently promises "Sleep needs change with age" and never delivers.

**Why:** a question that is never used makes the user feel processed rather than understood.

### 9. Hold-to-agree sets the moon (step: commit)
**Evidence:** QUITTR's signature pad, "Sign your commitment" (showcase-4). Locturne's hold-to-agree is already the right idea. This makes it feel like Locturne.

**What it shows:** while the user holds the white pill, the blurred moon behind the card slowly sinks, the haze darkens toward night, and haptics tick. On release at full, the moon is gone and Loc says *"Lights out. See you downstairs."*

**Why:** the user loves the moon transitions, and this ties the commitment to the brand's one visual idea. The rule against changing the moon in the app-sleep animation doesn't apply here, because this is a scene transition and the moon itself is untouched. Check with the user before building it.

### 10. Fold or move the throwaway questions (steps: found, plus age if kept)
**Evidence:** RIZZ puts sex, age and intention on one "Final Step" chip screen (showcase-4). Noom asks "where did you hear about us" at row 88, near the end. Cal AI asks it at row 5.

**What it shows:** either move found to after armed (*"One last thing. How'd you find me? For my ego."*), or put found and age together on one screen using chips plus the wheel.

**Why:** fewer "plain question" screens between the emotional ones (nights → reveal) make the sequence feel faster and less generic.

---

## 3. Don't copy

- **Rating prompts inside onboarding:** Cal AI rows 25–26, QUITTR rows 39–41, Umax 004 (screen 4!), RIZZ rows 10–13. Apple now rejects this. Ask for ratings after a real successful morning instead.
- **Countdown timers and "one time offer" pressure:** QUITTR showcase-5 ("expires in 5:00 … You will never see this again"), Noom rows 105–106 ("plan saved 14:54"). Apple rejection risk, and it lies to the user.
- **Fake scarcity:** RIZZ showcase-5 ("8 spots remaining"), QUITTR row 75. A software subscription has no spots.
- **Discount ladders and exit offers:** QUITTR's 80% → lifetime 80% → 100% off (rows 55–62, 75, 97). They train users to wait for a discount and undercut the $59.99 anchor.
- **Upsell stacks after purchase:** BetterMe rows 43–50. The moment after paying should be "armed", not more sales.
- **Shame and fear:** QUITTR's "YOU'RE GOING TO REGRET IT LIKE YOU ALWAYS DO" (showcase-7), the full-red "destroys relationships" slides (showcase-3), and a "dependence score" that ranks the user worse than average (row 20). Loc is sassy *with* the user, never contemptuous *of* them. The 7½-hour reveal must stay a fact, not a verdict.
- **Results held hostage:** Umax blurs the user's own scores until they pay or invite 3 friends (showcase-7). Locturne already shows its number, which is the right call.
- **Account walls before value:** QUITTR 003–006, BetterMe 002–003, Noom row 9. Locturne promises "No name, no email". Keep that promise. It is a selling point.
- **A tracking prompt on launch:** Noom 002, Lose It 003, Umax 002. Locturne doesn't need it, and asking scares off privacy-minded users.
- **Invented outcome stats:** Cal AI's "80% of Cal AI users maintain…" (007), Noom's "Lose twice as much" (showcase-3), Lose It's member counts. Pre-launch Locturne has no such data. Use only the user's own arithmetic (steal #3) and real, sourced sleep facts.
- **Glow and neon branding:** Umax's neon U and gradient pills (005, showcase-1), QUITTR's glowing discount card (showcase-5), RIZZ's light-ray hazes (showcase-3, 007). All break the no-glow rule.
- **Stock photos and 3D avatars:** Noom 002–008, BetterMe 007 and showcase-2. Off-brand next to the moon. Loc has no art in v1 on purpose.
- **Long education carousels:** QUITTR rows 23–33, Noom rows 61–68. Too long for a 2-minute promise. One line from Loc does the same job.
- **Per-day price framing on weekly plans:** RIZZ showcase-5 ("$1.43 per day", billed $9.99 a week). Locturne's "$5.00/month" annual breakdown is enough.

## Single most important insight

Every app in this group that earns $500k+ a month (Cal AI, Noom, BetterMe, Lose It) makes **each answer visibly change something on screen right away**: a reaction line, a number, a filled slot or a dated graph. Locturne asks good questions, but its answers mostly vanish until the reveal. Give every tap a visible result in Loc's voice and on Locturne's own objects (the minutes total, tonight's card, the moon). That fixes "the quiz screens all feel the same" and makes it more personalized and more branded at once.
