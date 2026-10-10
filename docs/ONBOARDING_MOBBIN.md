# Onboarding vs the best flows on Mobbin (October 10, 2026)

A fourth look at the onboarding. Earlier rounds:

- [ONBOARDING_CONVERSION.md](ONBOARDING_CONVERSION.md) (Sept 24–26)
- [ONBOARDING_OPTIMIZATION.md](ONBOARDING_OPTIMIZATION.md) (Oct 3), which has the money model
- [ONBOARDING_10.md](ONBOARDING_10.md) (Oct 5), a 35-app teardown that was then built

This round compares **today's flow** with flows Mobbin has recorded, mostly apps missing from
the library or newer versions of them:

- Opal's current onboarding (two recordings)
- Jomo, stoic. and Bevel
- Pillow's onboarding and paywall
- About a dozen paywalls that lead with the user's own result (Hatch, Breathwrk, BitePal, Orbit,
  LinkedIn, Runna, Alma, MyFitnessPal and others)

Screens of today's flow, in step order, are in
[`design-references/onboarding-library/_locturne-2026-10-10/`](design-references/onboarding-library/_locturne-2026-10-10/)
(sheet1: `hello` to `night-minutes`, sheet2: `nights-per-week` to `tomorrow`, sheet3: `walk`
to `declined`). They come from the web build, so the permission prompts and the App Store
sheet are stand-ins.

This is research, not a build.

## Verdict

**The flow is as good as the top blockers' flows, and better in places. One screen is behind:
the paywall.**

Where Locturne already matches or beats them:

| Pattern | Best example on Mobbin | Locturne |
|---|---|---|
| Quiz, then a personal number | Opal "help you get back 8 years"; Jomo "Let's do the math" | `reveal`: "9 hours a week, 485 hours a year", built from their own clock times |
| Before and after, side by side | Opal paywall "Before Opal 6h 32m / After 1h 49m" | `your-night`: their usual night next to the night with Loc |
| Setup before the paywall | Opal: Screen Time and 3 apps first; Jomo: builds the first block ("Work Hours") | `screen-time`, `apps`, `commit`; tonight is already scheduled |
| Trial reminder people can trust | Opal "When should we remind you? 2 days before, March 7" | Dated `offer` timeline and the "Remind me" switch |
| A personality | Jomo's phone mascot, Opal's gems | Loc replies to every answer, plus the grumpiness slider |
| No account wall | Opal and Jomo both ask you to sign up | **None. An advantage.** |
| Length | Opal 23 screens, Jomo 15, Bevel 48 | 21 to the paywall |

Nothing in the structure needs rebuilding. That agrees with every earlier round.

## How well will it convert?

Mobbin has no conversion numbers, so this is judgment against the benchmarks in
ONBOARDING_OPTIMIZATION §9:

- **Install → trial: about 8–12%** (the H&F median is 6.9–11.2%). The voice, the personal
  number and "starts tonight" should keep you at or above the median. TikTok traffic and a
  young audience pull it down.
- **Trial → paid: about 30–40%.** This depends far less on onboarding than on whether the
  lock works the first night and the first morning (Family Controls approval and the device
  spike are still open).

Polishing onboarding further is now worth a point or two at most. Real TestFlight funnel data
is worth more than another rating round.

## What's new from this round

### 1. The paywall drops the user's number (biggest fix, cheap)

**Now** (`plans`): "Right. The boring bit. Try me for a week. I'll sleep through most of it."
Then a general checklist, then the plans. The 9 hours and their bedtime were the most
persuasive things in the flow, and they aren't on the screen where people decide.

**What the best paywalls do:** the headline is the user's own result.

- [Opal](https://mobbin.com/flows/7b6dc8e9-56e3-4db3-a898-cfdddc9b1e8a): a before/after chart,
  then "Start your free week and gain **2+ hours** back".
- [LinkedIn](https://mobbin.com/screens/213bdb7f-ce90-4690-8749-58e6bf98a326): "Alex, Premium
  members are 2.7x more likely to get hired".
- [Orbit](https://mobbin.com/screens/fb696d7b-1e16-4b8f-9494-78be7e7aad5c): "save $300 a year".
- [Runna](https://mobbin.com/screens/3fa764cd-6481-433f-bfc3-63c15c5f09da): "Alex, get started
  with a free trial" for "your personalized training plan".

**Locturne version:** make the headline their number and their night: "**9 hours a week back.
Starting 11:30 tonight.**" Keep Loc's "Right. The boring bit." as the small line under it.
Optionally, show the two-column "your usual / with me" timeline from `your-night` as a
3-line strip above the plans.

This doesn't break the earlier "don't add explanation to `plans`" rule (Built With Science).
It replaces a line instead of adding one, and it's the user's own answer, not an explanation.

### 2. No social proof anywhere, and there's a slot for it

Every top flow has some:

- [Jomo](https://mobbin.com/flows/743bc988-c7c6-427e-b122-518a1ee69f7c) opens with "300,000+
  happy users · 12 hours gained every week" and a quote.
- Opal's paywall: "100,000+ Reviews · Join 8 Million+ people".
- [Breathwrk](https://mobbin.com/screens/3b7ad501-545e-439e-a1a0-4feeb6d3a4c5): "App of the
  Day" and "20,128 started Premium this month".
- [BitePal](https://mobbin.com/screens/46d4e6fa-cc2c-4d8d-82df-1e6a0a55f660): one story, a
  4.7 rating and the user count.

Locturne can't have any before launch, and fake proof is out (FTC 2024 rule). **Plan for it:**
keep one line under the plans ready for the first real fact, such as the App Store rating once
there are about 20 ratings, or "X mornings got up with Loc this week". Turn it on by remote
config. Don't add it to `hello`; the promise there is stronger than a number.

### 3. Smaller notes from the screenshots

- **`hello` is strong.** "No apps until you're out of bed" is a clearer promise than Jomo's
  "The app that ends bad screen time" or Opal's logo splash.
- **The `found` reply is good.** "TikTok sent you here to quit TikTok. Poetic." is the kind of
  line that gets screenshotted.
- **`deal` names only two methods** ("Downstairs or a short walk"), but v1 has five. That's
  fine for clarity, since `method` shows the rest. Just make sure the scan, place and push-up
  people don't feel the deal was about someone else.
- **`walk` asks for Motion & Fitness before the paywall.** Opal asks for Screen Time before
  the paywall too, and it worked. But this is a second system prompt before money changes
  hands. Watch the drop at `walk` in the funnel. It's already skipped late at night.

## Don't copy

- **Account sign-up before the paywall** (Opal, Jomo). It costs conversion and isn't needed.
- **Age and gender questions** (Opal, Pillow). Age was cut on Oct 5 for good reason.
- **Fake "Preparing report..." loaders** (Opal, Jomo "100%"). `your-night` already does this
  job honestly.
- **A trial on/off switch** ([Lovi](https://mobbin.com/screens/b19ae89c-7af8-4485-b23a-2188aaf0522d)).
  These get rejected under guideline 3.1.2.

## Open decisions

1. **Paywall headline:** use their number and bedtime ("9 hours a week back. Starting 11:30
   tonight.") with Loc's line under it? (Recommended.)
2. **Before/after strip on `plans`:** add the 3-line "usual vs with me" strip, or keep the
   paywall to just the headline and plans?
3. **Social proof slot:** build the remote-config line now, so it can be switched on the day
   the first real rating exists?

## Checked against the classic 5-step arc

The arc: name the problem, show why it's bad, show the fix, show life after the fix, then put
the paywall at the emotional peak.

| Step | Locturne screens | How well |
|---|---|---|
| 1. Name the problem | `hello` through `tried` | Strong. It's their own times and habits |
| 2. Why it's bad | `reveal` (9 h a week, 485 h a year); `tried` (why Screen Time fails) | Partly. It's a number with no cost attached |
| 3. The fix | `method`, `your-night`, `tomorrow`, `walk` | Strong. They try it before paying, which is rare |
| 4. Life after the fix | `time-back` ("Slow mornings") | Weak. It's asked **before** the number, then only echoed in one line on `offer` |
| 5. Paywall at the peak | `plans`, about 10 screens after the dream | Weak. The peak has cooled, and the headline is "The boring bit" |

Two cheap fixes:
- Swap `time-back` to come **after** `reveal` ("9 hours a week. What would you do with them?").
- Bring their answer to the paywall headline ("9 hours of slow mornings a week. Starting tonight.").

Keep step 2 about the phone and the apps, never about the user (VOICE: no guilt).

## Measure first

When TestFlight and PostHog are live, the three places to watch are:

- `reveal` → `method` (does the number land?)
- `walk` and `screen-time` (the system prompts)
- `plans` → purchase (the paywall)

If `plans` loses more than about 60% of the people who see it, decision 1 is the first test.

## Built (October 10, 2026)

- **New order:** `tried` → `reveal` → `time-back` → `method` (navigation.ts, `CHAPTERS`). The
  quiz moon now ends at `tried`, so `time-back` sits on the sunk moon with its question at the
  top (`moonQuestion(..., risen = false)`).
- **`reveal` second beat:** "Your apps had a great week. Your mornings didn't."
  (`REVEAL_SECOND_BEAT`). It replaces "Or 9 hours of {their pick}. Your pick.", which needed
  `time-back` to have been answered first.
- **`time-back` question:** "9 hours a week back. What would you do with them?"
  (`timeBackQuestion`). Light users keep the old wording.
- **Paywall headline:** "9 hours a week for slow mornings." (`plansHeadline`), with "Starts
  today at 11:30 PM. Right. The boring bit." under it. That line is hidden on short phones, as
  before. Light users keep "Right. The boring bit."; `trialVoice` is no longer used on `plans`.
- Checked in the web preview at 390×844 and 375×667.

## Built, round 2 (October 10, 2026)

From the 8/10 rating (gaps 2–4):

- **Before/after on the paywall:** `NightCompare` (screens/night-compare.tsx) puts their
  "usual" and "with me" times side by side above the plans: when the phone goes down and when
  they're out of bed. It's built from their answers, and a row only shows when the two times
  differ. Short phones show the comparison instead of the checklist. Light users see neither
  change.
- **`your-night` removed as a step.** Its comparison now lives on the paywall, and `tomorrow`
  is the one "what tomorrow looks like" screen. That's one screen fewer between the reveal and
  the paywall (21 → 20).
- **`deal` trimmed:** beat 3 is now "A trip downstairs or a short walk. Then we all wake up.",
  and the paragraph is now "Two minutes of questions first. No name, no email." The picked
  apps staying on the phone is still said on `screen-time`.
- Checked at 390×844 and 375×667.
