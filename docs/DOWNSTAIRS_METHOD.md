# "Go downstairs": the hero wake-up method

Logged October 1, 2026. **The user picked this as their favourite wake-up method
and wants it emphasized.** It moves from "v1 if there's time" to a v1 feature
in [LAUNCH_PLAN.md](LAUNCH_PLAN.md) (section 2). The question here is how it works
and where in the app the choice of method should be made.

## 1. Why it's a strong method

- **It proves the thing the product promises.** Going down a floor means you left
  the bed *and* the bedroom. Steps can be faked by shaking the phone or pacing beside
  the bed; a 3 m height change can't be faked from bed.
- **It's fast.** About 20 seconds of stairs against roughly 2–3 minutes for 200
  steps. Quick enough to feel fair every morning.
- **It sends you where the day starts:** the kitchen, the coffee, daylight. That's
  also the best defense against getting back into bed.
- **It's a clean video hook** with no competitor on it: "I have to go downstairs
  before Instagram works." No other app in the research uses the barometer.
- **Nothing to buy or set up.** Every iPhone since the 6 has a barometer, and it uses
  the same Motion & Fitness permission as steps.

## 2. How it works (and the one constraint that shapes the design)

> **Update, Oct 1 (later): the app doesn't have to be open.** See
> [BACKGROUND_UNLOCK.md](BACKGROUND_UNLOCK.md): floors are kept in the motion chip's
> history, and a two-tap barometer check (tap "I'm up" on the shield in bed, then
> again downstairs) avoids both the live session and weather drift. The live
> in-app session below stays as the fallback and as the "show" for people who open
> the app.

**The sensor.** iOS `CMAltimeter` reports `relativeAltitude`: the change in height
since the measurement started. Expo exposes it on iOS through `Barometer`
(`relativeAltitude` in metres, pressure in hPa). It's accurate to about 0.3–1 m,
and a floor is about 3 m.

**The constraint: it has to be a short, live session with the app open.**
- Updates stop while the app is suspended, so unlike steps there's no history to
  read later.
- Weather moves air pressure. 1 hPa is about 8 m of "fake" height, and normal
  weather drifts up to about 2 hPa over 3 hours. So comparing last night's pressure
  with this morning's would be wrong by tens of metres.
- Over a 2-minute session the drift is about 0.2 m in normal weather and about 0.5 m
  in a storm, far below a floor.

**So the flow is:**
1. In the morning, the user opens Locturne in bed (from the shield-tap
   notification or the home screen) and taps **Start**. Loc: "Fine. Carry me down."
2. They walk downstairs with the phone in hand and the screen on. A live height
   meter fills.
3. At a sustained change of **≥ 2.5 m held for about 5 seconds**, the apps wake up.

**Rules to tune on a device:**
- **The threshold.** Start at 2.5 m. Stairs are usually 2.6–3.3 m per floor.
  Split-level half-floors (about 1.5 m) won't count, which is fine.
- **Accept up or down.** Someone who sleeps on the ground floor and walks upstairs
  has also left bed. The name stays "Go downstairs" because that's the common case
  and the better hook.
- **Session timeout** of about 5 minutes, then restart from zero. This also bounds
  weather drift.
- **Ignore spikes.** Door slams and HVAC cause short pressure blips; the
  hold-for-5-seconds rule handles them.
- **If the barometer is unavailable or reads flat,** say so plainly and offer steps
  for today. Never leave someone stuck (the "never fail silently" rule).

**Cheating:** standing on the bed is about 1 m. Lifts and elevators count, but
you still left the bed. A 3 m change from bed isn't realistically possible.

## 3. Where the choice is made

Research behind the placement:
- **Choices made just before the paywall raise conversion** when they build the
  user's own plan. Goal picks and short setup steps add investment, and echoing an
  answer back on the paywall outperforms most layout tests. Tiimo uses one
  onboarding answer as its paywall headline.
- **Choice overload is real for new users** who don't yet know what will work
  (Chernev 2015). So the screen shouldn't be a menu of five methods.
- **The current flow already has a setup section** (bedtime → wake → tomorrow
  demo → Screen Time → apps → ready → commit → paywall). The method belongs there.

### 3.1 Onboarding: one yes/no question, with downstairs as the hero

Add a step **`method`** right after `wake` (the morning start time) and before
`tomorrow`:

```
bedtime → wake → method → tomorrow → screen-time → apps → ready → commit → offer → plans
```

The screen is a question, not a menu:

> **"Are there stairs between your bed and your coffee?"**
> [ Yes, I'm upstairs ] → **Go downstairs** (selected, shown big)
> [ No, one floor ] → **Walk it off**, 200 steps
> *Other ways to wake me* → the full list, including Scan your code

- The emphasis comes from asking about stairs first. Anyone who can use downstairs
  gets it as *their* method without seeing a menu.
- **Downstairs is the default for anyone with stairs.** It's the stronger proof,
  and it's faster.
- **His line on the confirm card:** "Downstairs. Every morning. I'll be at the
  bottom, judging."
- **Everything after it uses the answer:**
  - The `tomorrow` demo shows the height meter instead of the step count.
  - `ready`: "11:30 PM · 4 apps · tomorrow: downstairs."
  - The `commit` hold: "No scrolling until I'm downstairs."
  - The paywall recap and timeline: "Tomorrow 7:00: first trip downstairs."
- The Motion & Fitness prompt stays after purchase. Steps and downstairs share it,
  so there's still only one permission.

Store the answer as `method: 'downstairs' | 'steps' | 'scan'` in onboarding
`Answers`, next to `wake`.

### 3.2 The morning: the method is the screen

- **The morning home state is built around the chosen method:** a big **Start**
  button and the height meter, with his line as the title.
- **A small "Walk 200 steps instead" link.** Steps prove the same thing, so
  switching for one morning isn't loosening the lock. It also covers a dead
  barometer, a guest bedroom, or travel. Scan doesn't need to be here.
- **Shield text** names the method: "Shh. Downstairs first."
- **Notification at the morning start:** "Apps are asleep. Go downstairs."
- **Share card:** "Bed 11:41. Downstairs 7:02. Still disappointed."

### 3.3 Settings: the Routine tab

- A **Wake-up method** row in Routine (currently a placeholder: "Bedtime, morning
  start, daily naps, and the step target").
- Changes apply from the next bedtime, like every other setting.
- When travelling, the method can be changed for the next night. For this
  morning, the "steps instead" link covers it.

### 3.4 Marketing

- Its own video series: "I have to go downstairs before Instagram works", stairs
  POVs, roommates watching someone trudge down at 7 a.m.
- Its own Custom Product Page, so its conversion can be compared with steps.
- Consider leading with it in the first concept videos alongside the two current
  hooks. It's the most visual of the v1 methods.

## 4. Build tasks

1. **Engine:** a `downstairs` proof type in the method-agnostic unlock engine
   (LAUNCH_PLAN §4.2): a session with a start time, a baseline, the peak sustained
   change, a timeout and the threshold.
2. **Spike on the device:** log `relativeAltitude` going down your own stairs 10
   times, plus 10 minutes lying in bed, to set the threshold and noise floor. Add it
   to the Screen Time lab screen.
3. **Onboarding:** the `method` step and the copy changes listed in 3.1.
4. **Morning screen:** Start, the meter, the steps fallback link.
5. **Routine tab:** the method row.
6. **Lines for Loc** per state: start, halfway, made it, sensor problem.

## Sources

- Expo Barometer (SDK 57), `relativeAltitude` on iOS: <https://docs.expo.dev/versions/v57.0.0/sdk/barometer/>
- Relative altitude good to about 0.3–1 m; 10 Pa ≈ 1 m: <https://newly.app/sensors/barometer-mobile-apps>, <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6720727/>
- Weather drift as the main error source for barometric floor detection: <https://arxiv.org/pdf/2601.02184>, <https://arxiv.org/pdf/1710.11122>
- Normal pressure change under 2 hPa per 3 hours, storms 4+ hPa: <https://www.suunto.com/Support/Product-support/suunto_traverse/suunto_traverse/features/weather-indicators/>, <https://support.acurite.com/hc/en-us/articles/360009475694-Barometric-Pressure>
- Altimeter updates pause while the app is suspended: <https://github.com/jameslegue/cordova-plugin-altimeter>, <https://developer.apple.com/forums/thread/89691>
- `floorsAscended` unreliable, so read `relativeAltitude` directly: <https://developer.apple.com/forums/thread/748101>
- Pre-paywall micro-commitments and echoing answers: <https://www.airbridge.io/en/blog/5-steps-app-onboarding-before-the-paywall>, <https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/>, <https://dev.to/paywallpro/subscription-onboarding-15-patterns-you-must-know-4n4f>
- Choice overload (Chernev et al. 2015): <https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual>
