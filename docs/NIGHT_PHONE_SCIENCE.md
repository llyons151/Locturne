# Night-time phone use: harms, mechanisms, prevention, and what Locturne should do about it

September 27, 2026. A synthesis of three literature reviews run the same day. The
reviews themselves, with every citation, DOI, sample size and verification flag,
are in [docs/night-phone-research/](night-phone-research/):

- [A_HARMS.md](night-phone-research/A_HARMS.md): 68 studies on what night-time
  phone use does to people.
- [B_MECHANISMS.md](night-phone-research/B_MECHANISMS.md): *why* it does it,
  mechanism by mechanism, with the counter-evidence.
- [C_INTERVENTIONS.md](night-phone-research/C_INTERVENTIONS.md): what actually
  reduces it, ranked by evidence and fit for Locturne.

This document is the argument built on top of them. It is written like a thesis:
the problem, the causal model, the evidence for each link, and then a design that
follows from the evidence rather than from intuition. Where the evidence is weak,
it says so. Where Locturne's current plan disagrees with the evidence, it says that
too.

**Evidence labels used below.**
- **[Strong]**: meta-analyses, clinical guidelines, or several good RCTs agree.
- **[Moderate]**: large cohorts or one or two good RCTs.
- **[Weak]**: small pilots, cross-sectional data, or lab studies that may not
  transfer to real life.
- **[Contested]**: good studies disagree.
- **[Inference]**: our reasoning, not a study.

---

## Abstract

Phone use in bed is common and people know it hurts them: half of US adults use a
screen in bed every day, and most who try to cut back fail. The literature supports
a narrower and more useful claim than the popular one. The harm is not mainly blue
light, and it is not a direct path to depression. The harm is **time**. Engaging
apps push bedtime later and delay the moment someone actually tries to sleep
(displacement), and a phone within reach wakes people and invites checking at night
(interruption). Both are driven by habit and a real, measurable self-control gap:
about 31% of social media use is use people would not choose in advance (Allcott,
Gentzkow & Song 2022). The downstream costs of the resulting sleep loss (tiredness,
worse mood, worse immune and metabolic function) are well established
experimentally.

The interventions with the best evidence line up with this mechanism: a
**self-chosen commitment that is hard to override in the moment**, applied to the
specific apps and the specific window that cause the harm, plus **stimulus control**
from CBT for insomnia (the bed is for sleep; get up at the same time every day).
Locturne's core loop is, almost exactly, a software implementation of those two
things. Its morning gate is the less-proven half: the closest direct evidence is a
36-person pilot, although the surrounding evidence (fixed wake time, morning light,
morning activity) is good.

The realistic benefit to promise is **about 15–25 more minutes of sleep a night and
an earlier, more regular schedule**, not transformed mental health. That is still
roughly 90–150 hours of sleep a year [Inference], and regularity may matter as much
as duration. The largest risks to the product are the ones the evidence also
predicts: users drifting toward weaker settings, quitting after a lapse, and
feeling trapped by rules that are too rigid.

---

## 1. The problem, stated precisely

### 1.1 How common it is

- 50% of US adults use a screen in bed every day. Another 33% do on most days (AASM
  2025, n=2,007).
- 93% of Gen Z say they have stayed up past bedtime because of social media (AASM
  2022).
- 62% of 18–29s say their phone hurts their sleep, and only 25% of people who tried
  to cut back say it went very well (Pew, September 2026). These are the figures
  already in GAME_PLAN.
- Logged data, not surveys: in 815 Danish young adults, 12% used their phone 3–5
  hours *after* going to bed, and 41% had phone-interrupted sleep at least once a
  week (Rod et al. 2018).

### 1.2 The harm is about *when*, not *how much*

This is the most important finding in the whole review, and it shapes the product.

Studies that measure total daily screen time find small effects: **3–8 minutes less
sleep per hour of screen time** (Przybylski 2019, n=50,212; He et al. 2025
meta-analysis, n=548,338). Orben & Przybylski's specification-curve work found that
digital technology explains under 0.4% of the variance in adolescent well-being.
If you stopped reading there, you would conclude the whole problem is overhyped.

But studies that separate *when* the phone is used tell a different story:

- **In bed, after lights-out:** each extra hour of screen use *after going to bed*
  was associated with **24 minutes less sleep** and 59% higher odds of insomnia
  symptoms (Hjetland et al. 2025, n=45,202 Norwegian students aged 18–28). This is
  Locturne's demographic. [Moderate: huge sample, cross-sectional]
- **Daytime use doesn't matter much:** in adolescents tracked for 14 days with
  Fitbits, nights with more *night-time* screen use than usual meant later sleep
  and worse quality. Daytime use was unrelated (Burnell et al. 2024).
- **Post-bedtime use is the problem, pre-bedtime less so:** 745,706 logged app
  events in 155 adolescents found no effect of daytime or pre-bedtime use, and a
  small effect of post-bedtime use (Siebers et al. 2024).
- **In bed versus out of bed:** phone use in bed was linked to longer sleep latency
  and more time awake; the same use outside bed was not (Kheirinejad et al. 2023,
  n=75 with sleep rings).
- **The last hour:** a preprint of 350,600 nights from ring wearers found 45+ minutes
  of screen use in the last hour before bed was linked to the worst sleep scores; the
  same amount 4–5 hours earlier showed no cost. [Weak: not peer-reviewed]

**Implication [Inference]:** a general screen-time app is aimed at the wrong
target. The harm is concentrated in a window that runs from roughly an hour before
sleep through the night. That window is exactly what Locturne locks.

### 1.3 What the harms actually are, ranked by evidence

The full table is in [A_HARMS.md](night-phone-research/A_HARMS.md#evidence-strength-summary).
In short:

| Harm | Evidence | Honest size |
|---|---|---|
| Later bedtime, later sleep onset | **[Strong]** in adolescents, **[Moderate]** in adults | ~13 min later per hour of screens (meta); up to 75–90 min in gaming experiments |
| Shorter sleep | **[Moderate]** | Minutes per hour of use; ~24 min per hour *in bed* |
| Being woken by the phone | **[Moderate–Strong]**, prospective | OR 5.1 for being "very tired" a year later (Van den Bulck 2007); OR 5.66 for new restless sleep (Foerster 2019) |
| Next-day tiredness, lower alertness | **[Moderate–Strong]** | Found in both lab and cohort studies |
| Worse mood, depression, anxiety | **[Weak / Contested]** | Mostly *through* lost sleep (Lemola 2015; Vernon 2018). Did not replicate with objective logs (Dissing 2022) |
| Suicidality | **[Weak]** for bedtime use | The strong finding (Xiao 2025, JAMA) is about *addictive use patterns*; baseline screen time was null |
| Memory, grades | **[Weak]** | Direct memory tests are null (Höhn 2024; Sennock 2024). Grade links run through sleep |
| Obesity, heart, eyes | **[Weak]** | Confounded, tiny samples, or temporary |
| Relationships | **[Contested]** | Couples watching something *together* in bed report *higher* bedtime satisfaction (Drouin & McDaniel 2021) |

**The structural caveats** apply to nearly everything above:
- Most studies are cross-sectional. All 20 studies in the best-known meta-analysis
  (Carter et al. 2016) were.
- Causation runs both ways. People who can't sleep pick up their phones; in one
  three-year study, sleep problems predicted later media use rather than the reverse
  (Tavernier & Willoughby 2014).
- Self-reported screen time is inaccurate (Parry et al. 2021 meta-analysis, 106
  effect sizes).
- Adults are under-studied. The National Sleep Foundation's 2024 expert consensus
  reached agreement only for children and adolescents (Hartstein et al. 2024).

---

## 2. Why it happens: a causal model

### 2.1 The mechanisms, ranked

The best current synthesis is Bauducco, Pillion, Bartel, Reynolds, Kahn & Gradisar
(2024, *Sleep Medicine Reviews*). It tested the four classic explanations against
the experimental evidence. The ranking below combines it with the other reviews
(full detail in [B_MECHANISMS.md](night-phone-research/B_MECHANISMS.md)).

| Rank | Mechanism | Typical size | Evidence |
|---|---|---|---|
| 1 | **Displacement / bedtime procrastination.** Phone time replaces sleep time. Bedtime slips, then the gap between getting into bed and trying to sleep grows. | 39-minute average bed-to-shut-eye gap; >1 h gap = 9.3× odds of poor sleep (Exelmans & Van den Bulck 2017). Up to 75–90 min later bedtimes in gaming studies. | **[Moderate–Strong]** |
| 2 | **Night-time interruption.** Notifications wake people; waking up leads to checking. | 48 min less sleep in frequent interrupters (Rod 2018, logged data). ORs of 3–5 for later tiredness. | **[Moderate]**, but no RCTs |
| 3 | **Habit and self-control failure.** The engine behind #1 and #2. | 31% of social media use is self-control failure (Allcott 2022, RCT). | **[Strong]** for the behaviour; the "dopamine" story is speculation |
| 4 | **Arousal from content.** Exciting or emotional content keeps people awake. | −5 to +8.5 min to fall asleep in lab studies. Heart rate is often *lower* during screen use (Meredith-Jones 2026). | **[Weak]** as a direct effect |
| 5 | **Light and melatonin.** | Melatonin is clearly suppressed and the body clock shifts 30–90 min later, but falling asleep changes by only −4 to +10 min. Night Shift made no difference in an RCT (Duraccio 2021). | **[Contested]**: real biology, small effect on sleep |
| 6 | **Circadian misalignment / social jetlag.** | ~34 min later clock in new smartphone users (Trebucq 2026, natural experiment) | **[Moderate]** for the shift, **[Weak]** for health links |
| 7 | **Morning phone use.** | No direct data | **[Weak]**: no good study isolates it |

Bauducco et al.'s summary: well-designed lab studies find light and arousal each
delay sleep by **less than 10 minutes**, while displacement and night-time
interruption "may each reduce the sleep opportunity by an hour or more."

A conflict-of-interest note: Gradisar, a co-author on several of these papers, has
affiliations with commercial sleep-app companies. Independent labs in Switzerland,
Austria and the US reach the same conclusions, so the ranking holds.

### 2.2 The model

Putting it together [Inference, built from the ranked evidence]:

```
 cue (in bed, phone in hand, tired)
          │
          ▼
 habitual open of a feed ──► variable reward (new post, video)
          │                          │
          │        self-control gap: "one more" (Allcott: 31% of use)
          ▼                          │
 bedtime slips / shut-eye delayed ◄──┘     (DISPLACEMENT, rank 1)
          │
 phone stays within reach overnight ──► notifications, night checking
          │                                   (INTERRUPTION, rank 2)
          ▼
 less sleep + later, irregular timing  (+ small light/arousal effects)
          │
 morning: alarm on the phone ──► scroll in bed ──► later rise, no daylight
          │                                      (weak evidence, plausible)
          ▼
 next-day tiredness, worse mood regulation, later clock
          │
          └──► tired people have less capacity to resist tonight ──► loop
```

The loop at the bottom needs a caveat: "ego depletion," the idea that willpower
runs out like a battery, **failed to replicate** in two large multi-lab studies
(Hagger 2016, n=2,141, d=0.04; Vohs 2021, n=3,531, d=0.06). The loop is better
explained by habit: the same cue (bed, phone, tiredness) triggers the same response
without a decision being made (Wood & Neal 2007). That matters for design. **You
don't beat a habit by strengthening willpower; you beat it by removing the cue or
the response option.** A block does exactly that.

### 2.3 Why "just use less" fails

- **Habits are cue-driven, not goal-driven.** Once formed, they run with little
  intention (Wood & Neal 2007). Deciding to stop doesn't touch the cue.
- **People mispredict their future selves.** Allcott et al. found people
  underestimate their own future use (projection bias). At 3 p.m. a person
  genuinely believes they'll stop at 11.
- **Infinite feeds have no natural stopping point.** People mostly break a scroll
  loop because something *external* interrupts it (Rixen et al. 2023). Nothing
  external happens at midnight in bed.
- **Stock tools are too easy to dismiss.** Users describe digital-wellbeing apps as
  "not restrictive enough" (Monge Roffarello & De Russis 2019). In one study, 92% of
  participants frequently ignored warning-only limits (Kim et al. 2019, GoalKeeper).

### 2.4 What losing the sleep actually costs

This is the "why stop" that is best supported experimentally:

- **Cognition.** Six hours a night for two weeks produced deficits equivalent to
  up to two nights of total sleep deprivation, and **people didn't notice**: their
  sleepiness ratings plateaued while performance kept falling (Van Dongen et al.
  2003). [Strong]
- **Emotion.** Sleep loss reduces positive mood and increases anxiety (Palmer et al.
  2024 meta-analysis, 154 studies). One night without sleep raised amygdala
  reactivity to negative images by 60% (Yoo et al. 2007, small n). [Strong]
- **Immune.** Sleeping under 5 hours meant about 4.5× the odds of catching a cold
  after virus exposure (Prather et al. 2015; wide confidence interval). [Moderate]
- **Metabolism.** Six nights of 4 hours impaired glucose tolerance (Spiegel et al.
  1999). In an RCT, extending sleep by ~1.2 hours cut food intake by 270 kcal a day
  (Tasali et al. 2022). [Moderate–Strong]
- **Regularity.** In ~60,000 UK Biobank participants, the most regular sleepers had
  about 30% lower mortality than the least regular. Regularity predicted mortality
  better than duration (Windred et al. 2024). [Moderate: observational]

Two things *not* to cite: Matthew Walker's *Why We Sleep* (documented factual
errors; cite the primary studies instead) and claims that short sleep straightforwardly
shortens life (the mortality curve is U-shaped and confounded; Cappuccio 2010).

---

## 3. What works: the prevention evidence

Full detail and a ranked table are in
[C_INTERVENTIONS.md](night-phone-research/C_INTERVENTIONS.md). The findings that
matter most for Locturne:

### 3.1 Restricting phones before bed improves sleep, modestly

- **One hour before bed, one week:** phones stopped 80 min earlier, lights out 17
  min earlier, **+21 min of sleep** (Bartel, Scheeren & Gradisar 2019, n=63).
  But only 26% of teenagers approached agreed to take part.
- **30 minutes before bed, four weeks:** faster sleep onset, ~18 min more sleep,
  less pre-sleep arousal, better mood and working memory (He et al. 2020, RCT pilot,
  n=38 students).
- **Blocking all mobile internet for two weeks:** better sustained attention
  (dz 0.24), mental-health symptoms (dz 0.57) and well-being (dz 0.46), and **+17
  min of sleep** (Castelo et al. 2025, RCT, n=467). **Only 25.5% complied fully.**
- **Blue-light fixes don't help.** Night Shift on, off, and no phone showed no
  difference in an RCT (Duraccio 2021). A Cochrane review found no demonstrated
  sleep benefit from blue-blocking glasses.

The honest range of benefit is **15–25 minutes of sleep a night**, with larger
effects on use and well-being than on sleep itself.

### 3.2 Commitment devices work when they are self-chosen and hard to override

- **Allcott, Gentzkow & Song 2022** (RCT, n=2,126): letting people set limits in
  advance that couldn't be immediately overridden cut use by 22 min a day (16%),
  still 19 min a day at 12 weeks. **78% chose to set binding limits without being
  paid to.** This is the single most relevant study for Locturne.
- **Strength versus stress** (GoalKeeper, Kim et al. 2019, n=36):

  | Lockout | Use cut | Cost |
  |---|---|---|
  | Warning only | 32 min/day (n.s.) | 92% ignored it |
  | Weak (escalating 1–60 min locks) | 50 min/day (d 0.35) | Preferred by 53% |
  | Strong (locked until midnight) | 74 min/day (d 0.54) | Most stress; 20 of 36 loosened their goals |

- **People drift toward weaker settings** when allowed, while believing they'll go
  back to strict ones soon (Kovacs, Wu & Bernstein 2021, 8,000+ users).
- **Partial beats total.** Cutting an hour of use a day beat a week of full
  abstinence, and the effects lasted longer (Brailovskaia et al. 2023, n=619).

### 3.3 Friction plus a way back works better than a message

one sec (Grüning et al. 2023, PNAS): a short delay plus a "never mind" button made
people abandon 36% of app-open attempts and cut attempts by 37% over six weeks. **In
the controlled experiment, the dismiss option did the work; the reflective message
alone did nothing.** The effect persisted over about 13 weeks (Haliburton et al.
2024, n=1,039).

### 3.4 The CBT-I components that matter are the ones a lock enforces

The best treatment for insomnia is CBT-I. A network meta-analysis of 241 trials
(Furukawa et al. 2024, JAMA Psychiatry, n=31,452) separated which parts work:

| Component | Effect on remission | Locturne equivalent |
|---|---|---|
| Stimulus control ("bed is for sleep; get up at the same time") | iOR 1.43, works | **The whole loop** |
| Sleep restriction (limit time in bed) | iOR 1.49, works | The morning gate shortens lingering in bed |
| Cognitive restructuring | iOR 1.68, works | Not in scope |
| **Sleep hygiene education** | **iOR 1.01, does nothing** | Don't build tips content |
| Relaxation | iOR 0.81, possibly counterproductive | Don't build soundscapes (already excluded) |

Bootzin's stimulus-control rules (1972) include "use the bed only for sleep" **and**
"get up at the same time every morning." Locturne's two halves map onto those two
rules. This is the strongest scientific frame for the product [Inference, but a
direct one].

### 3.5 Behaviour-change techniques with good evidence

- **If-then plans** (implementation intentions): d = 0.65 across 94 tests
  (Gollwitzer & Sheeran 2006). **For bedtime procrastination specifically**, two
  RCTs (n=383, n=221) found mental contrasting with if-then plans reduced it at one
  and three weeks (Valshtein, Oettingen & Gollwitzer 2020).
- **Self-monitoring** of goal progress: d ≈ 0.40 across 138 studies. The effect is
  larger when progress is **recorded physically or reported to others** (Harkin et
  al. 2016).
- **Habits take about two months** (median 66 days, range 18–254; Lally et al.
  2010; median 59 days in Keller et al. 2021). **Missing one day didn't hurt habit
  formation.**
- **Broken streaks hurt**, especially when people blame themselves, **unless the
  streak can be repaired** (Silverman & Barasch 2023). In a 54-arm megastudy, the
  best intervention rewarded **coming back after a miss** (Milkman et al. 2021).
- **Fresh starts** (new week, month, birthday) raise motivation to restart (Dai,
  Milkman & Riis 2014).
- **Temptation bundling** works but modestly at scale: +51% gym visits in the
  original study, 10–14% in a 6,792-person replication (Milkman 2014; Kirgios 2020).

**Do not cite:** Ariely & Wertenbroch 2002 on self-imposed deadlines. It was
retracted in September 2026.

### 3.6 The morning: good surrounding evidence, thin direct evidence

- **A task to dismiss the alarm raises follow-through.** A photo task raised success
  at a target morning behaviour to 94.2% versus 75.8% for a plain button, and people
  started 84 seconds after the alarm instead of 334 (Oh et al. 2022, n=36 pilot).
  This is the closest direct evidence for the 200-step gate. [Weak]
- **Morning light plus morning activity** improved sleep timing and daytime
  functioning in young people with delayed sleep phase, maintained at three months
  (Richardson et al. 2018, RCT). [Moderate]
- **Morning light reduces grogginess** (Didikoglu et al. 2023) and a week of natural
  light shifted people's clocks earlier, most of all night owls' (Wright et al.
  2013). [Moderate]
- **Regular wake times** are associated with better grades (Phillips et al. 2017)
  and lower mortality (Windred 2024). [Moderate, observational]
- **Snoozing is not clearly harmful.** Thirty minutes of snoozing cost ~6 minutes of
  sleep and did not hurt cognition (Sundelin et al. 2024). Don't moralise it.
- **Morning scrolling itself** has no good causal evidence of harm. Claims about
  "cortisol spikes" or "dopamine hijacking" are unsupported.
- **"Put the alarm across the room"** has no peer-reviewed trial behind it.

### 3.7 The risks the evidence predicts

- **Orthosomnia:** chasing sleep-tracker scores made some patients' insomnia worse
  (Baron et al. 2017, case series). GAME_PLAN already excludes sleep scores. Keep it
  that way.
- **Abstinence-violation ("what the hell") effect:** a single lapse framed as
  failure triggers full relapse.
- **Reactance and quitting:** strict rules that feel imposed get circumvented or
  uninstalled. Castelo's 25.5% compliance is the warning.
- **Attrition is the norm:** median 30-day retention for mental-health apps is 3.3%
  (Baumel et al. 2019). A blocker that works without being opened is structurally
  better placed than most apps.

---

## 4. Applying it to Locturne

This is the core of the document. Each principle states the evidence, what Locturne
already does, and what should change.

### Principle 1: Target the window, not the phone

**Evidence:** harm is concentrated in bed and after lights-out (§1.2). Partial
restriction outperforms total abstinence (Brailovskaia 2023). Total blocks get
abandoned (Castelo 2025).

**Locturne already:** blocks chosen apps, at night only. This is the right design,
and the evidence says it is *better* than all-day blockers, not a lesser version of
them.

**Change:**
1. **Offer a wind-down start, 30–60 minutes before bedtime.** The two best
   restriction studies used 30 min (He 2020) and 60 min (Bartel 2019). Let the user
   choose "lock at bedtime" or "lock 30 minutes before bed," and default to the
   latter in copy framed as "he gets sleepy before you do." Test it as an A/B on
   bedtime adherence.
2. **Default the app list to feeds and games, not everything.** Content, not light,
   is the problem (Hartstein 2024). Audiobooks, podcasts, music, alarm, Messages
   from favourites and calm reading apps are fine. Shared use like watching a show
   together in bed isn't harmful (Drouin 2021). A tight, well-chosen list is also
   less likely to be abandoned.
3. **Never message about blue light.** It's the weakest mechanism, and Night Shift
   already failed an RCT. The existing line, "It's not the light, it's the feed," is
   correct.

### Principle 2: Make the commitment in the daytime, enforce it at night

**Evidence:** self-set limits that can't be overridden in the moment reduced use
durably, and 78% of people chose them voluntarily (Allcott 2022). Users drift toward
weaker settings whenever they can (Kovacs 2021).

**Locturne already:** sets the schedule during onboarding and arms tonight's lock.

**Change:**
1. **Settings changes that weaken the lock take effect tomorrow, not tonight.**
   Adding apps to the block list or making bedtime earlier can apply instantly;
   removing apps, moving bedtime later, or lowering the step target applies from the
   next night. Phone Dashboard in the Allcott study used the same rule. This is the
   single highest-value change in this document, because Kovacs 2021 shows the drift
   happens otherwise.
2. **Show the "you from this afternoon" framing.** Loc can say, in voice, that the
   rule was set by the user when they were awake and sensible. That is literally the
   psychology (projection bias), and it reduces reactance by making the rule the
   user's own.

### Principle 3: Keep the bed for sleep at both ends (stimulus control)

**Evidence:** stimulus control and a fixed rise time are core CBT-I components with
remission benefits (Furukawa 2024). Sleep hygiene tips alone do nothing.

**Locturne already:** the loop is stimulus control. The morning gate means the bed
stops being a place to lie and scroll.

**Change:**
1. **Use this as the scientific frame in the app and in marketing.** "Locturne is
   built on stimulus control, the part of insomnia therapy that works: the bed is for
   sleep, and you get up at the same time." This is honest and specific, and no
   competitor says it.
2. **Encourage a consistent morning start time, including weekends.** Regularity
   may matter as much as duration (Windred 2024; Phillips 2017). Let weekends be
   later, but show the user their spread and have Loc comment on wild swings.
3. **Don't build sleep-hygiene content.** No tip carousels, no articles. The
   evidence says they don't work, and GAME_PLAN already excludes them.

### Principle 4: Handle the people who can't sleep, not just those who won't

**Evidence:** causation runs both ways. Some people use their phones *because*
they can't sleep (Tavernier & Willoughby 2014; Bauducco 2024 calls it a "time
filler"). CBT-I's own rule for this is: if you can't sleep after about 20 minutes,
get up, go somewhere else, do something quiet, and come back when sleepy.

**Risk if ignored [Inference]:** a user with insomnia lies in the dark with nothing
to do, gets anxious about not sleeping, and blames the app. That is the user most
likely to leave angry reviews, and the one Locturne could hurt.

**Change:**
1. **Add a "can't sleep" path** (on the shield or in the app) that does *not*
   unlock feeds. Loc tells them the CBT-I rule in his voice: get up, go to another
   room, read something boring, come back when sleepy. It can point to allowed apps
   like an audiobook.
2. **If someone uses it often, say so gently and point to real help.** Frequent
   sleeplessness is insomnia, which is treatable. Suggest a doctor or an established
   free CBT-I programme (the US VA's CBT-i Coach app is free). This is also good App
   Store positioning: an app that knows its limits.
3. **Keep this separate from passes.** It's not a way out; it's a way to spend the
   night better.

### Principle 5: Deal with night-time interruption, the under-tested big one

**Evidence:** phone-caused night awakenings are among the most consistent
prospective findings, possibly as large as displacement (§2.1). Even having the
phone in the room was linked to worse sleep (Carter 2016, OR 1.79).

**Locturne already:** shields the chosen apps overnight.

**Open technical question, to verify in the device spike:** whether a shielded app's
**notifications** are still delivered on the lock screen. If they are, Locturne
blocks the scroll but not the interruption.

**Change:**
1. **Recommend a Sleep Focus during onboarding** so notifications are silenced
   overnight, with Loc explaining why. If Apple allows a Shortcut automation that
   pairs Locturne's bedtime with a Focus, offer it.
2. **Suggest charging the phone across the room**, framed as the user's own if-then
   plan (Principle 7), not a rule. Honest caveat: there's no trial of this specific
   move, but it removes the cue and is consistent with stimulus control.
3. **Never let Locturne itself wake anyone.** No notifications between bedtime and
   the morning start time, however charming.

### Principle 6: Make the morning a daylight habit, not just a step count

**Evidence:** morning light and morning activity improve sleep timing (Richardson
2018; Wright 2013). A physical wake task raises follow-through (Oh 2022). 200 steps
is about two minutes of walking and has no health value by itself.

**Locturne already:** 200 steps from the morning start time.

**Change:**
1. **Loc's morning lines should point toward light**: open the curtains, walk to the
   kitchen, step outside. The steps are the gate; the light is the benefit. Don't
   claim the steps themselves are exercise.
2. **Keep the task physical and simple.** Sleep inertia means people are impaired
   for the first 15–30 minutes. Walking fits. Don't add puzzles or math.
3. **Allow snoozing before the gate.** The evidence doesn't support banning it.
   Locturne's gate is about getting up, not waking at an exact second.
4. **The back-to-bed risk from GAME_PLAN is real and worth measuring.** The two-part
   walk idea (100 steps, then 100 more after ~10 minutes) has a scientific reason
   behind it: ten minutes up and in light is where the alertness benefit is, and it
   outlasts the worst of sleep inertia.

### Principle 7: Use if-then planning in onboarding

**Evidence:** if-then plans have a large average effect (d = 0.65), and two RCTs
found they reduce bedtime procrastination specifically (Valshtein 2020).

**Locturne already:** a 7-question quiz that builds commitment.

**Change:** add one screen, roughly two taps, where the user picks their own
obstacle and plan:

> "When I'm in bed and reach for my phone, I'll ___."
> (put it on the charger across the room / open my audiobook / turn the light off)

Loc repeats it back at bedtime a few times in the first week. It's cheap, fits the
voice, and is one of the few techniques with trial evidence against bedtime
procrastination specifically.

### Principle 8: Track behaviour, never sleep

**Evidence:** self-monitoring works (d ≈ 0.40), especially when recorded or shared
(Harkin 2016). Sleep-score chasing can backfire (orthosomnia).

**Locturne already:** excludes sleep tracking and sleep scores; has a morning share
card.

**Change:**
1. **Show nights kept and mornings walked**, not hours slept or sleep quality.
2. **The share card is the "reported to others" part of the self-monitoring
   effect.** That makes it a behaviour-change feature as well as a viral one.

### Principle 9: Design for the lapse

**Evidence:** one missed day doesn't harm habit formation (Lally 2010). Broken
streaks reduce engagement unless repairable (Silverman & Barasch 2023). Rewarding a
return after a miss was the top intervention of 54 (Milkman 2021).

**Locturne already:** no streak shaming, humane passes.

**Change:**
1. **When the streak widget arrives (v1.1), make it forgiving:** "nights kept this
   month" or a streak with a repair, not a consecutive count that zeroes out.
2. **A "welcome back" moment** from Loc after a missed night or a pass. Never a guilt
   line.
3. **Fresh starts:** use Mondays and the 1st of the month for re-engagement
   messages to lapsed users.
4. **Tell users it takes about two months**, not 21 days. Use it in the voice: "Two
   months. That's how long habits take. I checked."

### Principle 10: Make exits deliberate, not free

**Evidence:** friction plus a dismiss option cut app opens without the stress of a
hard lock (one sec; GoalKeeper). The strongest lock reduced use most but caused
the most stress and goal-loosening.

**Locturne already:** scarce passes, emergency unlock, accessible alternative.

**Change:**
1. **Put a short delay and a "go back to sleep" button in front of every exit**,
   one sec style. The dismiss button is what worked.
2. **Default to middle strictness.** Most people preferred the weak lock in
   GoalKeeper (53%). Offer a stricter mode for the third who want it, which also
   works as marketing ("hard mode").

---

## 5. What Locturne can honestly claim

### Safe claims

- "Phone use in bed pushes your sleep later and cuts it short." [Moderate]
- "It's not the light, it's the feed." [Moderate: NSF consensus, Duraccio RCT]
- "Built on stimulus control, the part of insomnia therapy that actually works."
  [Strong, but describe it as *built on*, not *equivalent to* CBT-I]
- "In studies, cutting phone use before bed added around 15–20 minutes of sleep."
  [Moderate]
- "In one study, students lost about 24 minutes of sleep for every hour on their
  phone in bed." [Moderate, cross-sectional: say "linked to," not "caused"]
- "31% of social media use is use people wouldn't choose in advance." [Strong]
- "Habits take about two months." [Moderate]

### Claims to avoid

- Blue light as the reason.
- Phones in bed cause depression, anxiety or suicide.
- "Hours" of lost sleep for the average user.
- Any health benefit from 200 steps.
- Morning scrolling "spikes cortisol" or "hijacks dopamine."
- Willpower "runs out" by night (ego depletion failed to replicate).
- Anything from *Why We Sleep*, or Ariely & Wertenbroch 2002.
- That Locturne reproduces the results of any study. It is inspired by them.

---

## 6. How Locturne can produce its own evidence

The field's biggest gaps are exactly where Locturne operates:
- adults rather than teenagers;
- objective data rather than self-report;
- night-time commitment devices;
- morning gates.

A small app with real users can say something new [Inference].

**Metrics to log (no sleep data needed):**
- Lock adherence: the share of scheduled nights the lock held without a pass or
  emergency unlock.
- Exit attempts per night, and the share dismissed at the friction screen.
- Morning: minutes from the morning start time to 200 steps, and completion rate.
- Weakening edits: how often users move bedtime later or remove apps, and when.
- Retention of the lock (D7, D30) against the GAME_PLAN gate of 20% at D30.
- An optional one-tap morning question, "Roughly when did you fall asleep?", for an
  opt-in subset only. It's self-report, so treat it as a trend, not a measure.

**Experiments worth running, in order:**
1. Wind-down start (at bedtime versus 30 min before) → adherence and D30.
2. Weakening edits apply tomorrow versus immediately → adherence, edits and churn.
3. If-then screen versus none → adherence in the first two weeks.
4. Two-part morning walk versus 200 at once → back-to-bed rate (if it can be
   inferred from pickups after the unlock).

The opt-in "went to bed earlier" dataset in GAME_PLAN v1.1 could become a real
publication if it's pre-registered, with a partner at a university sleep lab. That
would be the most credible marketing asset available, and it fits the founder's
content strategy.

---

## 7. Limitations of this review

- It was compiled by AI research agents in one day, from abstracts and some full
  texts. Several numbers are marked unverified in the appendices. Check anything
  before putting it in marketing.
- Most of the evidence is on adolescents. Locturne's users are mostly young adults,
  where the evidence is thinner and more mixed.
- Effect sizes in the best trials are modest, and most trials are short, small, and
  run on students.
- The morning half of Locturne rests on indirect evidence. It's plausible, not
  proven.

---

## 8. Suggested changes to GAME_PLAN (not yet applied)

In priority order:

1. **Weakening edits apply from the next night.** (Principle 2)
2. **"Can't sleep" path** with the CBT-I get-up rule, separate from passes, plus a
   gentle pointer to insomnia help for frequent use. (Principle 4)
3. **Optional wind-down start** 30 min before bedtime, as an A/B test. (Principle 1)
4. **One if-then planning screen** in onboarding. (Principle 7)
5. **Friction plus a dismiss button** in front of passes and the emergency unlock.
   (Principle 10)
6. **Morning lines point toward daylight**; allow a pre-gate snooze. (Principle 6)
7. **Device-spike check:** do shielded apps' notifications still arrive overnight?
   Recommend a Sleep Focus in onboarding either way. (Principle 5)
8. **Forgiving streak design** for v1.1: monthly count or repairable streak, plus a
   welcome-back moment. (Principle 9)
9. **Positioning line:** "built on stimulus control." (Principle 3)
