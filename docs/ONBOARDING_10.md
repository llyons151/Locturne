# Onboarding: the 10/10 plan

October 5, 2026. Goal: make the onboarding feel personal and unmistakably Locturne, keeping
the moon and its transitions. Built from a teardown of 35 top apps
([design-references/onboarding-library/](design-references/onboarding-library/README.md)): the
full recorded flow of each (about 5,000 screens described in order), their free screenshots, and
five group analyses in [`_analysis/`](design-references/onboarding-library/_analysis/):

| Group | Apps | Notes |
|---|---|---|
| A. Brand-led | Duolingo, Finch, Headspace, Calm Sleep, CARROT Weather, Focus Friend, How We Feel | [group-a-brand.md](design-references/onboarding-library/_analysis/group-a-brand.md) |
| B. Planners | The Pattern, Gentler Streak, Structured, Tiimo, Imprint, Headway, Liven | [group-b-planners.md](design-references/onboarding-library/_analysis/group-b-planners.md) |
| C. Top converters | Cal AI, Noom, BetterMe, Lose It, QUITTR, Umax, RIZZ, I Am Sober | [group-c-converters.md](design-references/onboarding-library/_analysis/group-c-converters.md) |
| D. Blockers | Opal, Brainrot, one sec, ClearSpace, Unrot, Prayer Lock, Bible Mode | [group-d-blockers.md](design-references/onboarding-library/_analysis/group-d-blockers.md) |
| E. Sleep and alarm | Alarmy, Wayk, RISE, Sleep Cycle, ShutEye, Loóna | [group-e-sleep.md](design-references/onboarding-library/_analysis/group-e-sleep.md) |

It builds on [ONBOARDING_VARIETY.md](ONBOARDING_VARIETY.md) (Sept 25) and
[ONBOARDING_OPTIMIZATION.md](ONBOARDING_OPTIMIZATION.md) (Oct 3) and doesn't replace their
decisions. **Built on 2026-10-05**; see "What was built" at the end. The pre-redesign screens, 4 per image in step order, are in
[`_locturne-before/`](design-references/onboarding-library/_locturne-before/).

## The diagnosis

All five groups found the same thing independently.

**Locturne's screens sit still while you answer.** You tap a pill, it turns white and nothing
else happens until `reveal`. In every app earning $500K+ a month, each answer visibly changes
something straight away: the mascot replies (Duolingo `showcase-2`), a number recalculates
(Cal AI `showcase-2`), the plan card fills a slot (Lose It `004` → `showcase-5`) or the sky
changes (Structured `007`).

Length, price and paywall are **not** the problem:
- Locturne reaches the paywall in about 21 screens, versus RIZZ 16, Cal AI ~40 and Noom ~105.
- ClearSpace ($7K/mo) sells the same $59.99/yr with a 7-day trial and a dated timeline. It
  never reacts to an answer. Brainrot ($150K/mo), Opal ($600K/mo) and Unrot all do.
- Calm Sleep looks almost exactly like Locturne (night blue, white pills), has no voice, and is
  the weakest of the brand-led group. **The look isn't the brand. Loc's voice is**, and right now
  he's silent during the 12-screen quiz.

The second finding (group E): **the winners ask for the times first, then talk in them.**
Alarmy's first question is the alarm time (row 5). Sleep Cycle opens on the alarm picker (`002`).
Locturne asks bedtime and alarm at steps 14–15, so the first 13 screens can't say "11:30" or
"7:00", and that's why they read as a generic quiz.

## Four rules for every screen

1. **Every input gets a visible reaction on the same screen.** It's a Loc line, a number, a
   filled slot or the haze. Never just a white pill.
2. **Speak in their numbers.** Their bedtime, their alarm, their minutes. Never "your bedtime".
3. **Loc talks during the quiz, not only between it.** Italic serif still means only he's
   talking. The questions stay in sans, and his reply is the serif line underneath.
4. **Buttons are the user's reply to Loc**, not "Continue". Examples: "Fair.", "Go on, then.",
   "Fine. Apple.", "Goodnight, Loc." (Gentler Streak `002/004/008`, Focus Friend, Duolingo
   "I'm committed").

## The new flow, screen by screen

Key: **Keep** · **Change** · **New** · **Cut** or **Move**.

### Chapter 1: Your night

| # | Step | What changes |
|---|---|---|
| 1 | `hello` | **Keep.** The moon, "No apps until you're out of bed." It's already the best opener in the set. |
| 2 | `deal` | **Change** into a three-beat demo of the night (Sleep Cycle `002→004`, the top sleep earner): **11:30 PM**, the icons dim to asleep → **7:00 AM**, tapping TikTok shows "No." → **downstairs**, the 2.5 m meter fills. One Loc caption per beat, moving with the existing moon transitions. Button: "Go on, then." |
| 3 | `voice` | **New. "How grumpy should I be?"** A native 3-stop Slider (Mild / Grumpy / Unbearable), with Loc's line rewriting itself as it moves (CARROT `002`, the best screen in group A, from a voice-only mascot like Loc). It sets the tone of the shield, notifications and morning lines. *Mild:* "I'll be nice. Mostly." *Unbearable:* "You asked for this." It's the strongest brand screen we could add, and the choice is a product setting, not decoration. |
| 4 | `bedtime` | **Move up** from step 14. Same picker and presets. Under the picker, a live preview of the notification he'll send updates as they scroll: "Locturne · 11:15 PM. Fifteen minutes. Start yawning." (Headway row 23.) Loc reacts to the hour: 1 am → *"1 am? I'll be asleep. You'll be in the comments."* |
| 5 | `wake` | **Move up.** The live line "11:30 PM → 7:00 AM · 7½ hours in bed" plus a preview of the shield they'll hit at 7:00: "No. Downstairs first." |
| 6 | `nights` | **Change** the question to their time: "It's 11:30. You're in bed. Then what?" Same answers. **Loc replies under the tapped pill** (all quiz lines are in group A §2 and group E §2), for example "I can't sleep, so I scroll." → *"Scrolling isn't sleeping. I checked."* |
| 7 | `night-minutes` | **Change** to clock times: "Lights out at 11:30. When does the phone actually go down?" Options: 11:40 · Midnight · 12:30 · 1 AM · Later. Don't ask. A thin line extends from 11:30 to the chosen time (Wayk rows 20–22). The maths is unchanged, it's just a subtraction. Loc: 1 AM → *"Raccoon hours. I know them well."* |
| 8 | `nights-per-week` | **Change.** Keep the M–T–W day circles, and add a **running total** under them that recalculates as days are tapped: "45 min × 5 nights = 3¾ hours a week." (Imprint `showcase-3`, Cal AI `showcase-2`.) The total keeps growing on the next screen, so `reveal` lands on a number they watched build. |

### Chapter 2: Your mornings

A chapter card in Loc's voice opens the section: *"Enough about your nights. Mornings are worse."*
(Gentler Streak `008`, Headway's split progress bar `005–007`.) The progress bar becomes three
segments: Night / Morning / Apps.

| # | Step | What changes |
|---|---|---|
| 9 | `morning-minutes` | **Change**: "Alarm at 7:00. When do your feet hit the floor?" Options: 7:05 · 7:15 · 7:30 · 8-ish. The running total keeps adding. Loc: 8-ish → *"Your phone gets up before you do."* |
| 10 | `tried` | **Keep** the question, and add Loc's reply under the pill. Willpower → *"Willpower's lovely. It goes to bed before you do."* Phone in another room → *"And then you went and got it."* |
| — | `tried-echo` | **Cut.** Loc's reply on `tried` does its job ("Screen Time has an Ignore button. I don't." moves into the reply when they pick Screen Time limits). |
| 11 | `time-back` | **Keep**, and add replies. Read → *"Paper. Doesn't buzz."* Work out → *"Ugh. Fine."* Their answer gets reused later (see 13 and 22). |
| 12 | `age` | **Cut or make it pay off.** The current reason ("Sleep needs change with age") changes nothing visible. Either cut it, or use it once on `reveal` ("Under-25s average… ") only if there's a sourced number. Recommended: cut. |
| 13 | `reveal` | **Change** into two beats with the moon transitions (Opal rows 15→19, Noom rows 98–103). Beat 1: the big serif number "7½ hours a week". Replace the dot grid, which reads as nothing. Beat 2, the good news built from `time-back`: *"Or 7½ hours of slow mornings. Your pick."* Fix the "Let's fix this" button, which is dark grey and looks disabled. |
| 14 | `math` → **`your-night`** | **Change** into "Your night, drawn": a monochrome two-column timeline built only from their answers (Wayk `showcase-3`, RISE row 40). **Your usual:** 11:30 in bed · 12:15 still scrolling · 7:00 alarm · 7:20 feet on floor. **With me:** 11:30 apps asleep · 7:00 still asleep · 7:03 bottom of the stairs, everyone's up. Footer: "65 minutes back. Tonight." The "With me" line is white and "Your usual" is dim grey, with no green badges and no glow. This becomes the most personal screen in the flow. |
| 15 | `method` | **Change** to a recommendation: a big "Recommended for you: Downstairs" card, with Walk and Scan as smaller cards beside it (Lose It rows 28–31). The stairs question stays as the way in. "I hate stairs. That's the point." stays. |
| 16 | `tomorrow` | **Keep the idea, fix the execution.** The phone mock is too small to read the joke. Make it larger, or zoom into the shield when "No." appears. Fix the dark grey "Try it" button. |
| 17 | `walk` | **Keep** (group D: no competitor lets you try the real thing before paying). **Add** a result card when the 20 steps are done (Duolingo `showcase-5`): "20 steps · 0:14 · Proven: you can stand." |

### Chapter 3: Your apps

| # | Step | What changes |
|---|---|---|
| 18 | `screen-time` | **Keep.** "Apple's paperwork. Not mine." is better than every competitor's version (group D). The button becomes "Fine. Apple." |
| 19 | `apps` | **Keep**, and add a beat after Apple's picker: their picked icons visibly fall asleep, one by one, with Loc's line. iOS doesn't tell the app their names, only their icons, so Loc speaks about the count: *"Three. I'll take them."* |
| 20 | `commit` | **Change**: tonight's card appears empty early (after `bedtime`) as a small strip, and each answer drops into its slot as they go (Lose It `004` → `showcase-5`). By `commit` it's complete and familiar. Keep "Hold to agree". |
| 21 | `offer` | **Keep**, and add a factual line from their own numbers: "Week one: about 5 hours back." |
| 22 | `plans` | **Keep** the layout. **Change** "Pick a plan" to his voice, for example *"Right. The boring bit."*, and reuse their `time-back` answer in the benefit list: "Slow mornings start tomorrow." |
| 23 | `armed` | **Change**: before Apple's notification prompt, show a preview of the real notification with their bedtime: "11:15 PM — Fifteen minutes. Then they sleep. Then I do." After they allow, send a real one about 5 seconds later (Prayer Lock row 17, Unrot `006`). |
| 24 | `first-morning` | **Keep**, and echo their answers: "Tomorrow, 7:00. You said 8-ish. We'll see." (I Am Sober reuses answers after the paywall, rows 73, 84, 89.) |
| — | `found` | **Move** to after purchase, or fold into one line on `armed`. Mid-quiz it interrupts the build-up and gives the user nothing. Loc's reply if kept: TikTok → *"TikTok sent you here to quit TikTok. Poetic."* |

Net: about the same number of screens (one new `voice` screen, `tried-echo` and probably `age`
cut, `found` moved), but every one of them now reacts.

## Decisions for you

**Decided 2026-10-05:** (1) no, the haze stays the same on every screen; (2) yes, the `voice`
slider ships in v1; (3) yes, cut `age`. 4 and 5 stand as suggested (moon untouched, no name).

1. **Can the haze follow the clock?** Group B and E suggest darker haze for later bedtimes and a
   cooler pre-dawn grey on morning screens. **The moon itself would not change.** Your earlier
   note was "moon untouched", so this only touches the background. Yes or no?
2. **The `voice` slider** (Mild / Grumpy / Unbearable). It adds a screen and means writing three
   versions of the shield, notification and morning lines. It's the strongest brand idea in the
   research. Do you want it in v1?
3. **Cut `age`?** Recommended yes.
4. **Moon setting during "Hold to agree"** (group C). This moves the moon, so it's your call. My
   suggestion is no, keep it untouched.
5. **No name.** Several apps ask for a name. `deal` promises "No name", so we keep not asking.

## Don't copy

From the teardown. These either get rejected by Apple now, break a project rule or did nothing
for the apps that used them:
- **Rating prompts inside onboarding.** Five of the seven blockers, Cal AI, QUITTR, Umax, RIZZ,
  Tiimo, Calm Sleep and Wayk all do it. Apple now rejects it.
- **Countdowns and fake scarcity.** QUITTR's 5:00 timer, Noom's 14:54, RIZZ's "8 spots
  remaining", ShutEye's 50%-off countdown.
- **Struck-through prices, discount ladders and "SAVE 114%"** (Alarmy, QUITTR, The Pattern).
- **Upsells after purchase** (BetterMe, Headway).
- **Free-trial toggles and preselected weekly plans** (Bible Mode, Liven).
- **Shame:** "life remaining" grids, QUITTR's panic button, Focus Friend's "Bean will be sad".
- **Arrows pointing at Apple's Allow button.**
- **Every glow**: Umax's neon, glowing orbs and buttons across the category.
- **Fake loaders** with made-up percentages. Our maths is real, so show the real sums instead.
- **Surface-only personalization.** Loóna asks your name, colours and story style, and earns
  about 2% of what Sleep Cycle does.

## Build order (most impact for least work first)

1. **Loc's replies on every quiz screen**, and buttons as replies. Copy plus one fade-in
   component. This is the biggest fix for the sameness.
2. **Move `bedtime` and `wake` up**, and rewrite the quiz in their times. Mostly copy and
   reordering `STEPS`. The maths becomes subtraction.
3. **The running total** through the quiz, and the two-beat `reveal` (and fix the grey buttons).
4. **"Your night, drawn"** replacing `math`.
5. **Tonight's card filling in**, the `method` recommendation and the walk result card.
6. **The `armed` notification preview** and the echoes on `first-morning` and `plans`.
7. **`voice`** (approved 2026-10-05), with Mild / Grumpy / Unbearable versions of the shield,
   notification and morning lines. The haze stays as it is.

The line bank for every quiz answer is in group A §2 and group E §2. Run all new lines past
[VOICE.md](VOICE.md) before shipping. Jokes land on Loc, the apps or the phone, never on the
user.

## What was built (2026-10-05)

New order: hello, deal, **voice**, **found**, **bedtime**, **wake**, nights, night-minutes,
nights-per-week, morning-minutes, tried, time-back, reveal, method, **your-night**, tomorrow,
walk, screen-time, apps, commit, offer, plans, armed, first-morning. Cut: `age` (and the
under-13 screen), `tried-echo`, `math`.

- **Loc replies under every quiz answer** (`Reply` in ui.tsx; the line banks are `NIGHTS_REPLY`,
  `NIGHT_MINUTES_REPLY`, `MORNING_MINUTES_REPLY`, `TRIED_REPLY`, `TIME_BACK_REPLY` and
  `FOUND_REPLY` in content.ts). Quiz answers no longer auto-advance: the reply plays, then the
  reply button (`REPLY_BUTTON`) fades in. It's invisible until then, never a grey pill (`Ready`).
- **Times first, quiz in their times:** "It's 11:30 PM. You're in bed. Then what?", and the
  minutes questions are answered as clock times (`nightMinuteChoices`, `morningMinuteChoices`).
- **Running total** on nights-per-week and morning-minutes, then the **two-beat reveal**: the
  number and the year, then "Or 9 hours of slow mornings. Your pick." The dot grid is gone.
- **Your night, drawn** (`screens/your-night.tsx`) replaces the math loader.
- **Grumpiness** (`voice`, `lib/tone.ts`): a native SwiftUI slider (web stand-in in
  `tone/tone-slider.tsx`), shown live as the real morning shield. It sets the shield's title
  and button (`TONE_LINES` in shield-copy.ts), the bedtime and morning notifications
  (`TONE_COPY` in notifications.ts) and the tomorrow demo, applies at once (it's words, not a
  rule), and can be changed in You → Loc → How grumpy. It's sent to analytics as `tone`.
- **Tonight strip** filling in on wake, method and apps; a **notification preview** under the
  bedtime wheel and on `armed`; a **real first notification** about 4 s after they allow
  notifications (`sendFirstNote`); a **walk result card**; the **three-chapter progress bar**;
  buttons as replies throughout; "Right. The boring bit." on the paywall; the `offer` week-one
  line; and `first-morning` echoing their feet-down time.

**Kept differently from the plan, on purpose:**
- `found` stays before the paywall (moved to the start, with a reply) instead of after purchase:
  conversion by channel needs the answer from people who don't buy.
- No "recommended method" card: GAME_PLAN keeps the stairs question as one question, not a menu.
- `deal` keeps its three text beats; the full loop is already shown on `tomorrow`.
- The Wake screen and Home don't read the tone yet. Only the shield, notifications and onboarding do.

Checked at 375×667 (iPhone SE, the smallest supported) and 393×790 in the web preview. The
native slider, Apple's picker, real notifications and haptics still need a run on the iPhone.
