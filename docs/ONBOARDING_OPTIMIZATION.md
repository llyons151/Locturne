# Onboarding conversion: the deep study (October 2026)

October 3, 2026. Eight parallel research tracks, combined and checked against the code. The full
track reports, with every source and evidence grade, are in
[onboarding-optimization/](onboarding-optimization/):

| # | Track | File |
|---|---|---|
| 1 | Behavioral science (commitment, framing, survey method, trials) | [01-behavioral-science.md](onboarding-optimization/01-behavioral-science.md) |
| 2 | Competitor teardowns (Opal, Brainrot, Unrot, Wayk, Quittr, Rise, Cal AI…) | [02-competitors.md](onboarding-optimization/02-competitors.md) |
| 3 | Paywall, pricing and trial data (RevenueCat/Adapty 2026, exit offers, cash model) | [03-paywall-pricing.md](onboarding-optimization/03-paywall-pricing.md) |
| 4 | iOS mechanics and App Review risk | [04-ios-platform-review.md](onboarding-optimization/04-ios-platform-review.md) |
| 5 | Audience: 6,860 competitor App Store reviews, ~1,500 Reddit posts | [05-audience-reviews.md](onboarding-optimization/05-audience-reviews.md) |
| 6 | Measurement and testing at low, spiky traffic | [06-measurement-testing.md](onboarding-optimization/06-measurement-testing.md) |
| 7 | Trial → paid, refunds, first night and first morning | [07-trial-to-paid.md](onboarding-optimization/07-trial-to-paid.md) |
| 8 | Hands-on audit: web preview clicked through and timed, every screen | [08-flow-audit.md](onboarding-optimization/08-flow-audit.md), screenshots in [flow-shots/](onboarding-optimization/flow-shots/) |

GAME_PLAN.md stays the source of truth. Where this study recommends changing it, the item is in
"Decisions for the founder" below and has **not** been applied.

**Limits.** The shared web-search budget ran out partway through several tracks. Claims that
couldn't be checked against a primary source are marked "unverified" in the track files. Nothing
here is a Locturne A/B result: every conversion prediction is transferred from other apps or from
research, and the first real cohort will overrule it.

---

## 1. The bottom line

1. **The structure is right. Don't rebuild it.** Quiz → personal number → demo → setup that
   starts tonight → commitment → dated trial timeline → two plans → one exit offer. This is the
   same arc Opal, Brainrot, Unrot, Quittr and Wayk run. The paywall sits at 0.93 of the flow
   (corpus median 0.89). The remaining gains are in fixing broken details, cutting the slow
   middle, and the week after purchase.
2. **Several things are broken, and they matter more than any optimization.** These include
   the wrong method in the aha demo, a downstairs morning that fails if users follow the shield,
   a trial-reminder promise that can silently fail, and a false privacy line (already fixed).
   See section 2.
3. **The flow is long in the wrong place.** The quiz-to-number part (~2 min) is fine. The ten
   screens after the number take another 2–4 min. They include two system prompts, a walk and a
   duplicate summary, and the progress bar is already ~85% full by then. Cutting 4 screens and
   moving the walk after purchase saves about a minute at median (section 3).
4. **The biggest reputational risk is "it asked me questions, then made me pay".** It's about
   80% of the 1–2★ reviews for Wayk and Erly, the two closest analogs (TikTok traffic, quiz, hard
   paywall). It's a review-text problem more than a conversion problem, but review text is what
   January search visitors read (section 5).
5. **Trial → paid is decided by the first morning and by trust in the charge.** 64% of 7-day
   trial cancellations happen on day 0–1, before the product has done anything. Those cancels come
   from fear of the charge, not from the product, so a reliable reminder and a visible date fix
   them (section 6).
6. **Realistic money.** About $1.40 net cash per install in the base case ($0.65 pessimistic,
   $2.80 optimistic). $1.5–2K a month needs roughly 1,100–1,450 installs **every month**, because
   annual cash doesn't recur. Cash from a Jan 2 launch arrives around early March 2027
   (section 9).
7. **A/B testing is mostly out of reach at launch traffic.** A revenue-powered test needs about
   8,000 installs per arm, not the 4,000 the earlier doc says. Ship the evidence-backed changes on
   judgment. Run one structural test at a time, decided on a fast proxy (section 8).

---

## 2. Fix before TestFlight (verified in the code)

Each of these was found by a track and then checked against the source by hand.

| # | Problem | Where | Fix |
|---|---|---|---|
| B1 | **The "your answers stay on your phone" line was false.** Quiz answers go to PostHog. | `deal` | **Done** (2026-10-03): now "No name, no email, and the apps you pick never leave your phone." Still to do: declare the answers in the App Privacy label and fill `NSPrivacyCollectedDataTypes` (empty in app.json). |
| B2 | **The `tomorrow` demo is steps-only.** A user who just said "Yes, there are stairs" watches "Walk 200 steps" and a 200/200 counter at the aha moment. | `screens/tomorrow-demo.tsx` takes no `method` | **Done** (2026-10-03): `TomorrowDemo` takes `method`. Downstairs: "Go downstairs and it wakes up", an "I'm downstairs" button and the wake screen's metres meter (0.0 / 2.5 m down). Scan: "Scan your code" and steps to the code, ending "Scanned". |
| B3 | **The downstairs morning fails if the user obeys the shield.** The shield says "Go downstairs, then open Locturne". The barometer only listens after Start, with the app open. `first-morning` says the right thing ("Open me and tap Start. Then go downstairs."). | `src/lib/shield-copy.ts` | **Done** (2026-10-03): downstairs reads "Open Locturne and tap Start. Then the stairs." Scan had the same order problem (the camera is in the app) and now reads "Open Locturne and scan your code." Steps keep walk-first, since history counts. Tested in `shield-copy.test.ts`. |
| B4 | **The trial-reminder promise can silently fail.** "Remind me" is on by default, and `scheduleTrialReminder` asks for notifications *cold*, right as the purchase completes, over "Setting tonight." If the user taps Don't Allow, nothing fires and nothing says so. ("You said you'd remind me" is the second-biggest 1★ theme in competitor reviews.) | `src/lib/notifications.ts:271`, `armed` | **Done** (2026-10-03): `armed` primes the ask and says when it was refused; `first-morning` names the date. New: a Home notice in the trial's last two days, with a Manage subscription button, whether or not notifications are on (`src/lib/trial-notice.ts`, tested). `armed` says "free trial", not "free week", so the 14-day offer reads right. |
| B5 | **Everyone who comes back through "See plans" is treated as a light user.** `resumeAtPaywall` rebuilds answers from the routine only, so the minutes are 0 → `lightUser` → "Mornings, then. Mine too." | `onboarding-flow.tsx` initial answers | **Done** (2026-10-03): `saveSetup` keeps the quiz answers the paywall's words use (on the phone only, `locturne.quizAnswers`), and `resumeAtPaywall` restores them. |
| B6 | **The two persuasive payoffs can be skipped before they play.** "Let's fix this" is tappable at 0.9 s; "over N years of your life" appears at ~7.5 s. Same on `tomorrow` (button at 0.9 s, demo ~7 s). In the timed run the button was tapped before the grid started. | `reveal`, `tomorrow` footers | **Done** (2026-10-03): both buttons stay disabled until the payoff reports (grid filled; shield lifted), with a 9 s backstop so a missed callback can't strand anyone. Light users and reduced motion are covered. Checked in the web preview. |
| B7 | **`armed` promises a Motion prompt that won't appear** if the walk already asked. | `MOTION_WHY` in steps.tsx | **Done** (already in the 2026-10-03 working tree): `armed` mentions Motion only while `motion === null`. |
| B8 | **"We walk anyway"** is shown to downstairs users on `offer` (from `ALARM_ECHO`). | `content.ts` | **Done** (2026-10-03): "We get up anyway" for every method, and "You do the getting up" as the fallback. |
| B9 | **The `age` subtitle "Sleep needs change with age." describes nothing.** `sleepNeed` is computed but never rendered; age only feeds the lifetime line. | `age` | Honest subtitle ("It goes into the math. Nowhere else.") or cut the question with the lifetime line (§4). |
| B10 | **Prices that failed at `hello` stay failed.** `getOffers` runs once at mount; a flaky network 4 minutes earlier means "The App Store isn't answering" at the paywall, and no exit offer. | `fetchOffers` | **Done** (2026-10-03): failed prices are fetched again on reaching `offer`, `plans` or `declined`, and on every return to the app. The failure stays on screen until prices arrive, so nothing flickers. |
| B11 | **The picture of Apple's alert is a review risk.** HIG, verbatim: "Don't show an image of the standard alert and modify it in any way. Don't add a visual cue that draws people's attention to the system alert's Allow buttons." The mock is scaled, dimmed and has a bobbing finger. A 5.1.1(iv) rejection for a primer was reported on 2026-10-01. | `apple-alert.tsx` on `screen-time` | **Done** (2026-10-03): the picture is deleted. The body warns in words: "Apple will ask next, then want your Face ID or passcode." (iOS asks once, then Face ID, so not "twice"). |
| B12 | **The exit button's VoiceOver label says "Exit preview".** | `ui.tsx` `Shell` | **Done** (2026-10-03): the label is "Exit", matching the visible text, so Voice Control's "tap Exit" works (not "Close"). |
| B13 | **Dynamic Type can clip text.** Pages never scroll, and `Title`/`Body`/`Options` have no `maxFontSizeMultiplier`. At accessibility sizes a 5-option question or the 55-word `offer` won't fit. | `ui.tsx` | **Done** (2026-10-03): above a text scale of 1.3 the page body becomes a ScrollView (`Shell` in `ui.tsx`); standard sizes are unchanged. Checked with scrolling forced on in the web preview: every page keeps its layout, except the reveal's grid, which gets short and falls back to the one-year grid (the sentence still carries the number). Needs a VoiceOver/Dynamic Type pass on a device. |
| B14 | **The paywall's biggest text is "Try Locturne free", not the price.** Apple's 2026 3.1.2 rejections say the trial must not be "more clear and conspicuous than the billed amount". The same applies to `declined` ("Fair. Two free weeks, then." is the largest text; $59.99 is in body copy). | `plans`, `declined` | **Done** (2026-10-03): `plans` is titled "Pick a plan", and his line says "Try me for a week" instead of "nights free" (it's 22pt, bigger than the 19pt plan prices). `declined` shows the billed price at 28pt under a headline with no trial wording ("Fair. Take longer to decide." / "Fair. Half price, then."). |

Also before launch (App Store Connect / RevenueCat config, about an hour total):
- **Billing Grace Period: on, "All renewals", 16 days.** "All renewals" covers the trial's first
  charge. Gift-card payers fail that charge more often.
- **RevenueCat refund handling: "Submit consumption data and let Apple decide"**, plus a consent line
  in the Terms. Two vendor cases cut refunds 36–43% (Dipsea 3% → 1.9%, Fotorama 4% → 2.3%).
  January refunds peak in week 3, right after a launch cohort's first charge.
- **App Review notes:** the reminder switch only schedules a local notification and doesn't change
  the product or trial. The exit-offer arm must be **on** during review.
- **Small Business Program** enrollment (15%), if it isn't done yet.

---

## 3. The proposed flow

Current: 26 screens to the paywall, 2 system prompts before it, ~730 words, ~44 taps, 18
decisions. Measured on the web preview at iPhone 15 size: about **3.6 min (fast reader) / 5.7
min (median)**. About 38 s of that is forced animation waits. "About two minutes" on `deal` is
true for the quiz (76–110 s) but reads as the whole flow.

Proposed (track 8, adjusted with tracks 1, 4 and 5):

```
hello → deal (trimmed, price-honest) → nights → night-minutes → nights-per-week → morning-minutes
→ found → age* → tried → tried-echo → time-back → math (shows the arithmetic) → reveal (gated, + the good number)
→ bedtime → wake → method → tomorrow (method-aware, gated)
→ screen-time (no alert picture) → apps → commit (absorbs ready)
→ offer → plans → [declined, once: on close or on a cancelled Apple sheet]
→ armed (primes notifications, then Motion) → walk (skipped late at night) → first-morning
```
\* `age` stays only while the lifetime line does (§4, test T-A).

| | Now | Proposed |
|---|---|---|
| Screens to the paywall | 26 | 22 (−`stat`, −`alarm`, −`ready`, `walk` moved after purchase) |
| System prompts before the paywall | 2 (Motion, Screen Time + Face ID) | 1 (Screen Time + Face ID) |
| Median time to the paywall | ~5.7 min | ~4.6 min |

### Screen-by-screen changes, with the reason

**`hello`.** Keep. Make the headline sentence identical to the video hook and App Store screenshot
1 (pick one wording, use it everywhere). Optional: VOICE.md's late-night opener when `lateNight`
("It's 12:47." / "Why are we awake."). VOICE.md lists it as "In app", but the code uses one line
at every hour; reconcile the two.

**`deal`.** Trim from 58 words to about 30, and scope the time promise. Draft:
- Bedtime: "Your apps go to sleep. So do I."
- Morning: "They wake when you're up. Downstairs or a short walk."
- Body: "Two minutes of questions, then your number. Then we set up tonight. It's a paid app, and the
  first week's free." (The price line is decision D1.)

**`nights`.** Add the revenge-bedtime answer. It is the strongest objection to a bedtime lock ("it's
the only time nobody needs anything from me", r/sleep), and right now nothing in the flow answers
it. Rewrite options so things happen *to* the user, which is how the reviews and Reddit describe it:
- "One more video. Then twelve more." (keep)
- "I look up and it's 2 AM." (replaces "I lose track of time")
- "It's the only time that's mine." (new) → math echo: "Your time, you said. Keep it. Just not in bed."
- "I can't sleep, so I scroll." (keep)
- "Honestly, all of it." (keep)

**`night-minutes`, `nights-per-week`, `morning-minutes`.** Keep the buckets exactly. Their middle
option (30–60 min) brackets the peer-reviewed norm of ~42 min a night (Hjetland 2025, n = 45,202),
and the values sit at or below each bucket's midpoint. **Never test wider or higher buckets.**
Scale ranges change what people report (Schwarz 1985), so that would be manipulating the number.
One tweak: `morning-minutes` subtitle "From your alarm to your feet on the floor." (it's one of
three different uses of "first alarm").

**`stat` → cut.** It interrupts the build from the questions to the number, and the 85% comes from
a Reviews.org opt-in Pollfish poll (84.6%, Q4 2025). Keep its echo line by moving "You said twenty
minutes. I said nothing." onto `math` when `morningMinutes` ≥ 10. If you want a stat somewhere,
use a peer-reviewed one as sourced body text (not in Loc's voice) on `tried-echo` for the Screen
Time / blocker answers. In Allcott, Gentzkow & Song (2022, *AER*), **78% of people given app limits
they couldn't skip kept them on for 12 weeks**. That answers "I'll just turn it off".

**`found`.** Keep it mid-quiz. Moving it after purchase (Opal does) would only measure payers, and
payers per 1K views needs install-level data. Revisit after 2 weeks: if over 80% answer TikTok,
cut it and use App Store campaign links (`ct=`) instead.

**`age`.** See test T-A. If it stays, fix the subtitle (B9). Check in PostHog what share of
answers are exactly the default 22. Each untouched wheel inflates the lifetime number.

**`alarm` → cut.** One screen and one decision buys a 9-word grey line on `offer` that says "walk" to
downstairs users. Replace it with a method-aware line ("One trip downstairs. I'll complain the
whole way."). If you'd rather keep a morning question, track 5's behavior-based rewrite is better
than the feelings one: "Alarm goes off. Then what?" / "Snooze. Snooze. Snooze." / "Phone. Then
somehow it's 7:40." / "I'm awake. I just don't get up." / "I turn it off in my sleep."

**`tried` / `tried-echo`.** Keep. It's the only objection screen and the best-supported interlude.
Add "Deleting the apps" (top Reddit and Brick-review phrasing), and rename "Phone in another room"
to "Phone across the room". New echo for delete: "You'll reinstall them by Thursday." / "You don't
have to delete anything. The apps you pick just sleep at night and wake when you're out of bed."

**`time-back`.** Shorten to "Those minutes back. What would you do?" Consider adding "Actually be on
time" (the Wayk and Erly users' own outcome).

**`math`.** Show the real arithmetic instead of a generic count. The labor-illusion effect comes from
*seeing the work* (Buell & Norton 2011), and it makes the number auditable: "45 min × 6 nights +
20 min × 6 mornings = about 6½ hours a week." Keep it to ≤3 s.

**`reveal`.**
- Gate the button (B6).
- Add the good-number beat that Opal and Brainrot both use: "With me, that's ~6 hours a week back."
  Frame it as **phone time in bed**, never sleep gained.
- Carry that number into the `plans` headline ("Take back your 6 hours a week.").
- The lifetime line is test T-A.
- Share text: "About 7½ hours a week on my phone in bed. A raccoon is now in charge." (less
  judgment than "disappointed").

**`bedtime`.** Test (T-F, adherence only) asking "What time do you *wish* you put the phone down?"
and defaulting the wheel to that answer. Allcott's limits worked because they matched each
person's own stated ideal. An 11:30 default for someone who sleeps at 1:30 makes a lock they'll
loosen or quit (Valshtein 2020).

**`walk` → move after purchase.** Before the paywall it adds a Motion prompt and 20–35 s. It asks
someone in bed at night to stand up, and it comes *before* the demo, so users do the ritual before
seeing what it's for. After `armed` it is the first rehearsal with the product they now own, and
Motion is asked there anyway. Skip it when `lateNight` ("Tomorrow, then. I'm not walking now
either.").

**`tomorrow`.** Make it method-aware (B2) and gate the button (B6). This is the strongest screen in
the flow once it shows the right method.

**`screen-time`.** Remove the alert picture (B11). Keep the single Continue. Add one honest line
that answers the "I'll just bypass it" objection: "You can switch me off in Settings. It's annoying
on purpose." A refusal leaves status `.notDetermined`, so a real "Try again" works (the screen
already has one). Log the error code (`screen_time_access {result, error}`) to measure teen and
MDM failures.

**`apps`.** This is the likeliest stall before the paywall: hundreds of choices, a tired user, and
an effort-minimizing goal are exactly the conditions for choice overload. Habit Doom reports ~35%
of installs granted Screen Time and then never picked an app. Steer to categories in the picker
header ("Tap Social and Entertainment. Add the rest later."). After an empty close, add an aside:
"Pick one. Any one. I'm not fussy."

**`ready` → merge into `commit`.** "Tonight's lock is ready… It isn't on yet." contradicts itself
without saying why. Put the editable schedule card on `commit`, with one honest line: "It starts
when your free week does." Optionally write the title as an if-then plan. Implementation intentions
work best in if-then form (d ≈ 0.36 in the 2025 meta-analysis of 642 tests, about half the
often-quoted 0.65): "When it's 11:30, your apps go to sleep. When the alarm goes, you go downstairs.
Then they wake up."

**`offer`.**
- Keep the dated timeline (Blinkist +23% trial starts, −55% complaints; unbeaten at Opal).
- Show the **picked apps asleep** in the "Tonight" row, as native `Label(token)` icons, dimmed.
  Opal asks for apps *after* the paywall; asking before only pays off if the paywall uses them.
- Use a real date in the reminder row ("I'll remind you Jan 7").
- On compact phones keep the Morning row and merge Day 5 into Day 7 instead.
- Rename the button from "See the free week" to "See plans" or similar. "Free week" is the exact
  phrase a one sec 1★ review calls misleading.

**`plans`.**
- Fix the price prominence (B14).
- Write the checklist as outcomes in users' words: "Phone down when you said." / "Apps wake when
  you're up. Not before." / "No Ignore button."
- Fix the "Awake again after…" rows, which have no subject ("Apps wake after one trip downstairs").
- On compact phones, drop the third check rather than Loc's line.
- Add a remote-config slot for real social proof, switched on at ≥4.6★ with ≥100 ratings.

**`declined`.** See §5.

---

## 4. The reveal, the number and the age question

This is the most contested part of the flow, so it gets its own section.

- **What works:** a personal number inside onboarding is in every winning flow in the category
  (Opal, Brainrot, Rise, Quittr). Keep "Based on your answers you spend about…". Self-reported
  phone time correlates only r = .38 with logs (Parry 2021), so the hedge is accurate. Rounding
  down is methodologically right, not just polite.
- **The risk:** "That's over N years of your life" is a loss frame, and it's built on a 57-year
  extrapolation of a rough guess, from a default age of 22. Loss framing has no advantage for
  prevention behavior (O'Keefe & Jensen, 93 studies, r = .03 in favor of *gain*). It's also a
  TikTok cliché that Gen Z discounts, and it drifts toward the shame VOICE.md forbids.
- **Test T-A (first onboarding test once traffic allows):**
  - A: current lifetime line.
  - B: year only, plus a gain: "That's 394 hours a year. You could have them back." This variant
    drops the `age` question.
  - If B ties, ship B: it removes a screen, a privacy question and an ethical liability.
- **Real Screen Time data instead of self-report: probably not possible in onboarding.**
  DeviceActivityReport data is view-only (JS can't read it), and Apple's engineer says history
  starts "from that date onward" (the day access is granted). Opal, with far more engineering,
  still uses self-report. A one-hour device spike settles it. Either way, the better use is the
  **day-5 trial recap**: by day 5 there are 4–5 nights of real data.

---

## 5. Paywall, price and the exit offer

**Keep:** $59.99 annual with 7-day trial (in the band with Rise $69.99, Alarmy/Loóna/Anchor $59.99,
below Opal $99.99), annual preselected, per-month as the subordinate line, two pages, reminder
toggle on, no weekly, no lifetime, no Family Sharing (irreversible per product, no evidence it
helps), no countdowns, no spin wheels, no rating prompt in onboarding (Apple started rejecting that
under 5.6.3 in June 2026).

**Change:**
1. **Fire the exit offer on a cancelled Apple purchase sheet too**, not only when the paywall is
   closed. Today `buy()` ignores `cancelled` ("say nothing"). People who tapped the button and then
   backed out are the highest-intent decliners. Superwall sees 5–22% of them convert, and Apple has
   said informally that one offer after a cancelled transaction is allowed. Keep it once per install.
2. **Two arms, not three:** `longer-trial` (14 days) vs `none`, 50/50. Three arms can't be read at
   launch traffic. Analyze by **assigned** arm, among people who closed the paywall (§8).
3. **Rebuild half-price before it's ever turned on.** Today it's a product that renews at $29.99
   forever, and it shows up as a cheaper plan in iOS Settings. A TikTok audience will spread "close
   the paywall for half price". The better version is a $59.99 product with a pay-up-front intro
   offer of "$29.99 for your first year". The cash arrives on day 0, and renewal is at full price.
   Hold it as arm 3 for when traffic allows.
4. **After `declined`, a calm door, not a loop:** "Fair. I'll be here. Asleep, mostly." Wayk's "no
   X / it pops right back up" is 18 of its 245 low reviews.
5. **Re-present the paywall on the next 2–3 cold launches** for people with a saved setup and no
   subscription, and make "See plans" the primary button on Home in that state. Today the only way
   back is a text link. Also save partial progress before `commit`: an interrupted night install
   currently restarts at `hello`. Resume line: "Where were we."
6. **Later price tests, in order:** annual-only card with monthly behind "Other plans" (Mojo +15–20
   pp annual share); CTA "Try 7 nights for $0.00" (Duolingo's $0.00 result); monthly at $12.99
   (annual is 6× monthly now vs a category median of 4×, which makes the badge weak); and only at
   ~6–7K installs per arm, annual $39.99 vs $59.99. Note that H&F annual plans renew only ~25%
   (23% for high-priced), so this is a year-one cash business. That favors $59.99 for your
   situation.
7. **Teens (13–17).** Many can't pay at all: no card, Ask to Buy. In Wayk's reviews they're a big
   share of the anger ("my dad doesn't want to give me his credit card"). For 13–17 (the age wheel
   knows), add under the CTA: "Under 18? A parent may need to approve this." Add a "Send to a
   parent" share with one plain sentence about what the app does. Make sure the `pending` copy
   doesn't promise tonight.

---

## 6. After purchase: the 7-day trial

Trial → paid median for 5–9-day trials is ~33–37%. GAME_PLAN's 30% gate is reasonable but not
ambitious.

**`armed`, proposed sequence:**
1. Success state as now ("Armed. See you at 11:30 PM.").
2. **Notifications, primed** (replaces the cold prompt at purchase):
   > **Last thing. Can I text you?**
   > Three kinds, and that's it: ten minutes before bedtime, when the morning starts, and two
   > days before you're charged. I'm not chatty. I'm a raccoon.
   > [Allow notifications] · "Not now"

   "Not now" is a text button, so the existing after-the-first-morning ask stays as a second
   chance. Blinkist's version of this framing took opt-in from 6% to 74%. Without permission, night
   1 also has no bedtime heads-up and no shield-tap bridge in the morning.
3. **Motion**, only if it wasn't asked on the walk.
4. **The money, once, plainly:** "Free until Mon, Jan 12. I'll remind you Sat, Jan 10. Cancel any
   time in Settings, and you keep the whole free week." Check in sandbox that the entitlement
   really survives cancellation before shipping the last clause. It defuses the defensive day-0
   cancel.
5. If they bought inside their bedtime window ("Starting now"), name the exits once: "Asleep now. If
   something real comes up, there's an emergency unlock. It's slow on purpose."

**`first-morning`:** add a "Free week" row with the date; add a notifications-off row if denied
("The reminder will be on my Home screen instead"); keep ending on bed. No share, no rating here.

**During the trial:**
- Fix the downstairs shield (B3) before anything else in this section.
- Detect cancellation with RevenueCat `willRenew === false` and log `trial_cancelled`. On the next
  calm open, show one honest line: "You turned me off. Fair. You still have me until Monday." Hold
  any discount save until the exit-offer test has read.
- **The Day-5 reminder becomes a receipt.** Reschedule it on every open with live counts: "Five
  nights. 3 mornings up. Your apps slept 31 hours. Free until Monday, then $59.99 for the year."
  If no morning was proven, say so honestly. A user who never activated is the likeliest refund.
- Build the in-app Day-5 card for anyone without notifications.
- Rating prompt: keep it on the first proven morning, on Home, never in the same session as
  another system prompt.
- **Retention Messaging** (Apple's message on the cancel screen): the tracks disagree on whether
  it's open to all developers yet (track 3: an App Store Connect path since WWDC26; track 7: a
  pre-release program). Check App Store Connect. If it's available, start with text only: "Your
  free week continues until {date}. Cancelling now just means I won't charge you."

Track 7's honest estimate: B3 + B4 + the `armed` changes move trial → paid from the low 30s to the
mid-to-high 30s, mostly by not losing people to a broken first morning or a broken promise.

---

## 7. Decisions for the founder

These conflict with GAME_PLAN or earlier docs, or are judgment calls with real trade-offs.
Nothing here has been changed.

**Founder's calls, October 3, 2026:**
- D1 (say it's paid on `deal`): **no.**
- D2 (primed notifications on `armed`): **yes. Built.** The cold prompt at purchase is gone;
  `armed` says what each prompt is for (notifications, then Motion, only the ones iOS will
  really show), and one Continue opens them. If notifications end up off, `armed` and
  `first-morning` show the trial's end date instead of the promised reminder.
- D3 (walk): **the middle option. Built.** The walk stays before the paywall but moves after
  the `tomorrow` demo (see it, then try it), and it's skipped when onboarding happens inside
  the bedtime window.
- D6, transaction-abandon trigger: **yes. Built.** Cancelling Apple's purchase sheet on
  `offer`/`plans` shows the one exit offer, under the same once-per-install rule.

**October 4, 2026:**
- D4: **yes. Built.** `stat` and `alarm` are gone. The morning echo ("You said twenty
  minutes. I said nothing.") is an aside on `math` as its mornings line ticks, at 10+ minutes
  only. `offer`'s grey line is method-aware (`METHOD_COPY[m].offer`, e.g. "One trip
  downstairs. I'll complain the whole way."); Loc's lines are placeholders for the founder's
  voice pass. `commit` carries the editable schedule card, and "It isn't on yet" is gone. Short
  phones drop the eyebrow, the passes line and the card's "Phone calls always get through" so
  nothing hides behind the hold button. `ONBOARDING_VERSION` is now `2026-10-04`.
- D8: **yes. Built** as `isNewYearWeek` (January 1–9, every year; preview with `?newyear=1`):
  `hello` "New year. Same bed.", `deal` ends "Starts tonight. Not Monday.", `commit`'s eyebrow
  "The deal for 2027", `plans` "No sale. I'm too tired for a sale." and `armed` "Armed. First
  night of the year. Don't make it weird." The `reveal` annualised line was left out: the reveal
  already shows a year.
- The rest are still open. The goal is people paying, so any cut has to remove friction without
  removing investment (see "Length and investment" below).

| # | Decision | Recommendation | Why it's yours |
|---|---|---|---|
| D1 | **Say it's paid on `deal`** ("It's a paid app, and the first week's free."). | Ship it as the default. A/B it if traffic allows. | It's the #1 complaint at the closest analogs (Wayk 82% of low reviews are about paying; "questions, then pay" alone is 31). It may cost some trial starts from people who'd never pay, and it protects the review page. No competitor A/B exists either way. It also makes `commit`'s hold-to-agree read as fair rather than manipulative. |
| D2 | **Notifications primed on `armed`** instead of "after the first successful night". | Yes. GAME_PLAN is already out of date: the code asks cold at purchase. | GAME_PLAN rule. |
| D3 | **Move `walk` after purchase.** | Yes. | Changes the flow order in GAME_PLAN's onboarding shape. |
| D4 | **Cut `stat` and `alarm`, merge `ready` into `commit`.** | Yes. | Copy you wrote. |
| D5 | **The lifetime line and `age`.** | Test T-A, and ship the year-only gain version if it ties. | Brand and voice call. |
| D6 | **Exit offer: two arms + transaction-abandon trigger; rebuild half-price as a first-year intro offer.** | Yes. | GAME_PLAN names three arms. |
| D7 | **Teen copy and "Send to a parent".** | Yes, once you've checked the age split in your past TikTok analytics. If it's over ~30% under 18, it's top priority. Also code video setups 18+ (dorm, first job), and have creators say "free week", never "free app". | Audience strategy. |
| D8 | **Launch-week variant** (date-gated copy only, no discount): "New year. Same bed." / `ready` → "Night one." / plans: "No sale. I'm too tired for a sale." | Yes. The stickK commitment contracts jump 145% at New Year (Dai, Milkman & Riis 2014). January cohorts also refund more and convert worse later, so don't discount. | `1K_MRR_PLAN` says to save discounts for January. |
| D9 | **Launch date.** `1K_MRR_PLAN.md` describes a Nov 10 pre-order launch; GAME_PLAN says Jan 2–5. | Resolve which is live. Pre-order installs arrive days later with no context; `hello` has to work cold. | Planning conflict. |

### Length and investment

The founder's question: aren't long onboardings good, because invested people pay?

**Yes, and that's what the evidence says. The nuance is which screens do the investing.**
- Long flows have won when each step builds belief or produces a visible personal result. Lose It!
  saw a double-digit trial lift (with diminishing returns), Coconote +16% from ~15 screens, and
  Zumba "a lot". Removing Burner's investment screen lost. Cal AI found investment questions raised
  conversion even when the answers weren't used.
- Opal's 7% → 17% came from moving to a hard paywall inside onboarding, not from length alone.
- "Time in onboarding correlates with conversion" (Quittr) is mostly selection: motivated people
  stay longer.
- The cost side: survey break-off rises with actual length (Galesic & Bosnjak 2009). Each screen
  loses a few percent. The worst case is a stretch that runs past what was promised while the
  progress bar already says "almost done".

The rule this report applies: **keep or add screens that create investment (personal answers, the
number, choosing settings, picking apps, committing). Cut screens that are passive or duplicate.**
- `stat` is passive.
- `alarm` feeds one grey line.
- `ready` repeats `commit`.

Cutting those is not cutting investment.

**The walk is the exception, and the one real trade-off.** It is effort, rehearsal and
IKEA-effect investment. Track 1 argued for keeping it *before* the paywall, while track 8 argued
for moving it after. Against keeping it:
- It asks for a system permission before the paywall.
- It asks people in bed at night to stand up.
- It comes before the demo that explains it.
- The IKEA effect only holds when the effort succeeds, and a Motion denial produces a "No motion,
  no counting" screen right before the sell.

A middle option that keeps the investment:
- Keep the walk before the paywall, but put it after `tomorrow` (see, then do).
- Skip it automatically when `lateNight`.

If traffic allows, this is the quiz-length test track 6 lists: run the walk before vs after
purchase, judged on trials with auto-renew on at 72 h.

---

## 8. Measuring it

**Decision rule** for a solo founder: Bayesian, ship when P(beat) ≥ 80% and expected loss < 2%,
with a minimum two-week run. For price, require 95%. In simulation at 1,000 installs/arm this ships
a true −10% variant only 3% of the time and catches a true +20% one 85% of the time.

**Fast proxy:** "trial started with auto-renew still on at 72 h", per install. Decide on that, ship
with a 10% holdback, and confirm on D35 net revenue per install. Validate the proxy on your first
~300 trials.

**Sample sizes** (two-arm, 80% power): install → trial +30% at a 15% base ≈ 1,100/arm;
+20% ≈ 2,400/arm. Revenue +20% ≈ 8,000/arm. So below ~10k installs a month, only structural,
high-variance changes are worth testing. Bandits are wrong for the paywall (the reward is 7–35 days
late and the traffic mix keeps shifting). CUPED doesn't help: new installs have no history.
**Before/after comparisons are useless** with viral traffic: a mix shift from search to TikTok can
"drop" conversion 40% with no product change.

**Fix the exit-offer analysis now:**
- `paywall_viewed.exit_arm` is the *shown* arm, which falls back to `none` for slow networks and
  repeat trialers. Register `exit_arm_assigned` as a super property at startup.
- Fire `paywall_closed` in every arm (including `none`) before branching.

**Missing events, in priority order:**
1. back taps
2. backgrounding (and `ms_on_previous` currently includes background time)
3. time to first screen
4. prices-load latency
5. plan toggles
6. reminder toggle state at purchase
7. hold-to-agree attempts
8. demo watched
9. payoff seen on `reveal`
10. purchase latency
11. RevenueCat `trackCustomPaywallImpression`
12. an `experiments` registry
13. `trial_cancelled`, `first_morning_result`, `notifications_prompt`

**Tools:** local assignment + a PostHog super property for onboarding tests (PostHog flags aren't
loaded on first launch). RevenueCat Experiments for price, trial and copy (copy through offering
metadata; copy identical `exit_arm` metadata into every variant). RevenueCat Customer Center for the
cancel survey. Skip Superwall.

**Qualitative, now through December** (the best return before launch):
- three rounds of five people on the web preview and TestFlight, recruited from your own audience;
- 5-second tests of `offer` and `plans` (Lyssna free tier). Targets: ≥80% say they pay $0 today,
  ≥70% name $59.99/year after 7 days.
- After launch, add a one-tap exit reason on the paywall close: "Too expensive / Not sure it'd work
  on me / Don't want to give Screen Time access / I'll start later / Something else". That ranks
  what to fix next.

**Calendar:**
- Pre-launch: events, the dashboard, and qualitative rounds.
- Launch month: one test only. Two-arm exit offer, read among people who closed the paywall.
- Months 2–3: paywall position, then price at Mid traffic.
- Months 4–6: trial vs no trial, CTA copy, the reveal line.

The full calendar, dashboard spec and alarm thresholds are in track 6.

---

## 9. What to expect in money

| | Pessimistic | Base | Optimistic |
|---|---|---|---|
| Install → trial | 6% | 10% | 15% |
| Trial → paid (annual, 7-day) | 25% | 33% | 42% |
| Year-one net cash per install | ~$0.65 | ~$1.40 | ~$2.80 |
| Installs/month for $1.5–2K/month | ~2,300–3,100 | ~1,100–1,450 | ~550–720 |

Sources: RevenueCat SOSA 2026 (H&F install → trial median 6.9%, trial → paid 37.7%, annual 5–9-day
33%) and Adapty SOIS 2026 (H&F 11.2% / 42.2%). The young audience pulls toward the low end.
Refunds: budget ~5% (hard paywalls 5.8%, H&F 4.7%).

- **It's a treadmill.** Annual cash doesn't recur monthly. Holding $1.5–2K/month means hitting that
  install rate every month. ~25% of annual payers renew, adding ~$0.35 per install, and only from
  January 2028.
- **Timing:** a Jan 2–5 trial charges Jan 9–12, inside Apple's January fiscal month. That's paid
  around **early March 2027**. The 14-day exit arm pushes a slice a month later. The pay-up-front
  first-year offer is the only paywall element that pulls cash forward.

---

## 10. Don't

- Rating prompts, ATT, countdowns, "gone forever" or spin wheels in onboarding (Apple 5.6/5.6.3
  rejections, FTC exposure).
- Trial on/off toggles (3.1.2 rejections since January 2026).
- Higher bucket ranges, an age default chosen to inflate the number, fake progress, or fake social
  proof (FTC 2024 rule). Real proof only, once it exists.
- A money-back badge (refunds go through Apple), sign-in before the paywall, a name question, a
  student weekly, a first-week "soft mode", or a "rot vs unrot" binary frame.
- A public New Year discount.
- More explanation on `plans` (added pricing context lowered conversion at Built With Science).
- Many small A/B tests. One at a time, structural only, until ~10k installs a month.

---

## 11. Corrections to earlier docs, and where the tracks disagreed

**Earlier repo docs:**
- `sub-club/APPLIED_TO_LOCTURNE.md`: "~4k installs per arm" for a revenue read detects only ~30%
  lifts. A 20% lift needs ~8k. Its "Test 1: 3 cards vs annual" is stale (the paywall already has
  two plans). The 85% stat: weak, and better cut than kept.
- `NIGHT_PHONE_SCIENCE.md`: implementation intentions d = 0.65 is the 2006 figure; 2025's 642-test
  update is ~0.36.
- `ONBOARDING_CONVERSION.md`: "Buckets beat sliders for self-report (Ellis 2019; Schwarz 1985)"
  misreads both papers. Buckets are the right UI, but as a UX choice, not for accuracy. Its hope for
  a real-data reveal in onboarding is probably not feasible (§4).
- `PRICING_RESEARCH.md`: "annual about 28% renew" should be 23–25% for H&F at this price.
- GAME_PLAN "notifications after the first successful night": the code already asks (cold) at
  purchase when "Remind me" is on (D2).
- `TEEN_ACCOUNTS.md` said don't ask age. The flow does, which is defensible only if the age visibly
  does something (§4).
- Ariely-coauthored papers (zero-price, IKEA effect): NIGHT_PHONE_SCIENCE says one was retracted in
  Sept 2026. Unverified here. The IKEA effect has independent replications; the zero-price effect is
  mixed in the field.

**Track claims corrected during this synthesis:**
- Tracks 5 and 7 said notifications are never asked in onboarding. Wrong: `scheduleTrialReminder`
  asks right after purchase when "Remind me" is on. The real gaps are that the ask is unprimed and
  that a denial has no fallback (B4).
- Track 6 said there's no Share button on `reveal`. There is ("Share this", steps.tsx).
- Track 4 worried the `offer` timeline might show $0 to trial-ineligible users. It doesn't: it
  branches on `trialDays`.
- Track 8 proposed "Answers stay on your phone" in its `deal` rewrite. That's the false line from B1;
  don't use it.

**Where tracks disagreed, and the call made here:**
- **Apple-alert picture:** track 8 rated it good priming; track 4 quoted the HIG against it. Went
  with removing the picture, because a rejection costs more than the priming gains, and the words
  keep most of the priming.
- **Hold-to-agree:** keep it (tracks 2, 8). Track 5 found Wayk's signature screen called
  manipulative when the price was hidden. D1 addresses that.
- **`found` placement:** keep it mid-quiz (tracks 2, 8). Track 1's "move it first" was low
  confidence.
- **Reminder toggle vs a static line:** keep the toggle, with an App Review note. Track 4's static
  line is the fallback if review objects.
- **Retention Messaging availability:** unresolved; check App Store Connect.
