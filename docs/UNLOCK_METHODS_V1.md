# Unlock methods for v1: what to add, and what to film

Written October 3, 2026. The question: beyond Go downstairs, Walk it off and Scan
your code, which wake-up methods should Locturne add, and which of them are
**marketing engines** (the push-up apps' kind of viral) and not just practical?
Inputs: [WAKE_METHODS_100.md](WAKE_METHODS_100.md) (the pool and shortlists),
[GAME_PLAN.md](../GAME_PLAN.md), [LAUNCH_PLAN.md](LAUNCH_PLAN.md) §2 and D2,
[DESIRE_VALIDATION.md](DESIRE_VALIDATION.md), [VOICE.md](VOICE.md) and the v1 build
notes. GAME_PLAN is not edited here; the rule changes it would need are in §7.

Tags: **[SOURCE]** cited below, **[UNVERIFIED]** a claim from one weak source or a
search snippet, **[OPINION]** my call.

## 1. The answer in short

- **January v1: add no new sensor.** Add two marketing layers on what's already built:
  1. **Bed-to-bottom time** (a timed receipt for every morning, starring downstairs).
     About 1.5 founder-days.
  2. **Code spots** (Scan, but Loc tells you where to stick the code: freezer, outside
     bin, coffee bag, "partner hides it"). About 1.5 founder-days.
- **v1.1 (February): push-ups, counted on the phone by Apple's body-pose model,** with
  squats from the same code. It's the most proven viral format in the category, but
  it's 8–12 founder-days of native camera work that can only be tested through EAS
  builds, it fails in a dark bedroom, and it doesn't prove "out of bed" as cleanly
  as stairs. Putting it in January would risk the launch.
- **Stay out:** make-your-bed and sky/grass photos (they need AI to judge photos),
  sound methods (a recording beats them), proximity-sensor push-ups (a hand in bed
  beats them), accelerometer squats and jumping jacks (the phone can be waved in bed),
  and sunlight (iOS doesn't let apps read the light sensor, and January mornings are
  dark).
- **Rule change needed:** allow on-device pose *counting* (push-ups, squats) as
  different from photo *judging*, which stays banned. Details in §7.

## 2. What the viral cases actually show

### Push-up apps

| App | What it does | Numbers | Format that did the views | How reps are checked |
|---|---|---|---|---|
| **Pushscroll** | Push-ups buy minutes of social media | Highest video close to 16M views; one ~8M-view creator video brought ~200K installs; $1M+ in its first year, ~$100K MRR by July 2026 ([Braavo](https://www.getbraavo.com/blog/from-0-to-1m-the-organic-growth-playbook-behind-pushscroll/)); $30K/month profit, ~70% paywall conversion, weekly beat monthly ([Superwall](https://superwall.com/blog/our-app-makes-usd30k-month-profit-using-this-simple-strategy-copy-us)). Started with a fake demo video (80K views, 500 comments) before any code [UNVERIFIED] ([sliplane summary](https://onepage-research.sliplane.app/articles/youtube.com/yt-ST2ROU-0932ccd0)) | Over-the-shoulder push-ups in odd places (2am, in the rain), then a quick demo; best videos skip under ~18% | **MediaPipe pose on the camera.** They switched from a side view to a **front view because it looked better on camera** for creators |
| **Erly** | Push-ups to turn off the alarm | 200K+ downloads, $50K+/month by month four, 4.8★ from ~16K reviews; $9.99/mo or $29.99/yr ([superframeworks](https://superframeworks.com/case-study/erly)) | Paid day-in-the-life creators (college students): alarm, drop and do push-ups, "alarm turned off" flashes. $2–3 CPM, 2–4 posts per creator | Front camera video, **checked with OpenAI's API** (cloud AI judging, the thing GAME_PLAN bans) |
| **Wayk** | Mission alarm: 15 push-ups, sky photo, object hunt, pet, grass | 25M TikTok views, 100K+ downloads, #15 on the App Store in 30 days ([First 1000](https://read.first1000.co/p/how-an-alarm-app-got-25-million-views)) | Copied Pushscroll's pattern: "POV caption + real reaction + app in action + short and raw". "My alarm won't turn off until I do 15 pushups." Only TikTok worked; Reddit and X did nothing | Camera missions [UNVERIFIED how] |
| **Clearspace** | Push-ups earn screen time | YC-backed; reviews call the tracking inaccurate ([VALIDATION_RESEARCH](VALIDATION_RESEARCH.md)) | n/a | Apple Vision on video ([Soren's newsletter](https://sorens.beehiiv.com/p/pushups-screentime)) |
| **PushUpLock** and others | Push-ups to unblock | Small | n/a | Reviewers: "misses a lot of reps even in well-lit rooms" [UNVERIFIED snippet] ([AppsHunter](https://appshunter.io/ios/app/pushuplock-push-up-blocker/id6753698904)) |

**What kept people paying (or not).** There is no public retention data for any of
them. The complaints that do show up are about **reliability and price**, not
detection: Erly's negative reviews are "the alarm didn't ring at all", settings
resetting and "why does it cost money" ([JustUseApp](https://justuseapp.com/en/app/6751428380/erly-wake-up-early/reviews)).
Detection complaints show up in the smaller copycats, where tracking was bad. Pose
counting is known to fail without good light, framing and a steady phone; guides
tell users to put the phone at floor level 1.5–2.5 m away, front camera, in a
well-lit room [UNVERIFIED snippet].

**Cheating.** I found no documented cheat stories or cheat-rate numbers for any of
these apps. People will try half-reps, knee push-ups, bobbing their head and getting
the dog in frame [OPINION]. Pushscroll and Erly market the camera as the thing that
makes cheating hard.

### Other "earn your phone" and morning apps

| App | Viral because | Kept paying because / weakness |
|---|---|---|
| **Touch Grass** (photo of real grass) | A meme made literal. Hacker News #1, a demo tweet with 1.2M views, a 4M-view YouTube Short, ~50K downloads in a week (March 2025) ([Substack](https://rhyskentish.substack.com/p/touch-grass-my-app-that-stops-me), [TechCrunch](https://techcrunch.com/2025/03/17/this-app-limits-your-screen-time-by-making-you-literally-touch-grass/)) | **AI vision judges the photo** (rejects houseplants and bushes); 1 free skip a month, extra skips sold; no outdoor task after sunset. No retention data. |
| **Alarmy** (missions) | Its viral videos were a boyfriend filming his girlfriend doing math, and a "photo of my beard" mission ([Alarmy blog](https://alar.my/en/blog/alarmy-global-viral-videos-2)). 82M downloads (GAME_PLAN) | "I hate it, which is why it works" reviews. But its most-used missions can be done in bed. Squats are counted by motion sensor or camera [UNVERIFIED]. |
| **Brick** ($59 tap-to-unlock key) | Became an object and a status symbol; "a very big jump" into 2026; no sales figures ([SSENSE](https://www.ssense.com/en-ca/editorial/technology/how-brick-became-a-status-symbol-for-the-aspirationally-offline)) | A physical object to film. Locturne's QR code is the free version of this. |
| **Opal, one sec** | A viral user video reused as the best ad; one sec grew from one screen recording ([VALIDATION_RESEARCH](VALIDATION_RESEARCH.md)) | Research credibility, polish. |
| **BedLock** (photo of a made bed) | Didn't go viral: 1 upvote on Product Hunt ([Product Hunt](https://www.producthunt.com/p/bedlock/bedlock-2)) | **AI judges the bed photo.** |
| **Groggy** (photo of each morning task), WakeZen, wakn up | No traction found ([STRATEGY_DEEP_DIVE](STRATEGY_DEEP_DIVE.md)) | Photo or brain-puzzle missions; wakn up's are all doable in bed. |
| **Unbed, Anchor, Flow** | Scan a tag/dock/barcode | "The key is somewhere else." Same mechanic as Scan. |

### Four lessons

1. **The views come from one body doing one physical thing while the phone refuses
   them,** filmed raw in under 10 seconds. Push-ups won because they are the most
   readable physical act on a phone screen: you see the body and the counter at once.
2. **Every viral app had one hero action that named it** (push-ups, grass). Menus of
   missions didn't go viral; the one action did. Locturne's hero is stairs, and no
   competitor has it.
3. **Several winners verify with AI judging** (Erly's OpenAI check, Touch Grass,
   BedLock). Locturne can't copy those without breaking its own rule, and it doesn't
   need to: counting body joints on the phone is a different thing (§7).
4. **Paying users complain about reliability and price, not about the task.** That
   backs GAME_PLAN's reliability-first order: a method that fails at 7am costs more
   than a missing method.

## 3. Scores

Scale 1–5, higher is better. **Proves up** = can't be done in bed. **Feasible** =
how cleanly it builds on Expo SDK 57 from Linux and passes App Review. **Effort** in
founder-days. [OPINION] throughout, based on §2 and §4.

| Method | Virality | Proves up | Cheat-resistant | Feasible | Effort | Verdict |
|---|---|---|---|---|---|---|
| **Bed-to-bottom time** (receipt, all methods) | 4 | 5 (uses the method's proof) | 5 | 5 | 1.5 | **v1** |
| **Code spots** (freezer, bin, coffee bag, partner hides it) | 4 | 5 | 3 (photo of the code) | 5 | 1.5 | **v1** |
| **Push-ups, camera pose** | 5 | 3 | 4 | 2 | 8–12 | **v1.1 headline** |
| **Squats / jumping jacks, camera pose** | 3 | 4 (full body must be in frame, standing) | 4 | 2 (same module) | +1–2 | v1.1, with push-ups |
| Stair reps / climb the building | 3 | 5 | 5 | 5 | 1 | v1.1 "harder mode" |
| Downstairs speedrun (stair speed) | 4 | 5 | 5 | 5 | 1 | **No** (rewards running down stairs half-asleep) |
| Loc's pick (random from your enabled methods) | 3 | 5 | 5 | 4 | 1.5 | v1.1 |
| Build your own morning (chains) | 3 | 5 | 5 | 3 | 4–6 | v1.1–v1.2 |
| Daily tear-off codes | 2 | 5 | 5 | 5 | 2 | v1.1, if the photo cheat shows up |
| Housemate code (rotating, shared secret, no server) | 3 | 5 | 4 | 4 | 2–3 | v1.1 |
| Walk the dog (steps + leave home Wi-Fi) | 4 | 5 | 3 | 3 (Wi-Fi info needs location + entitlement) | 3 | Later; for now just a 500-step target with dog lines |
| Touch grass / leave the house (geofence, park) | 4 | 5 | 4 | 3 (location permission) | 4–6 | Later (cold, dark January; Touch Grass owns the meme) |
| Proximity push-ups (phone face-up on floor) | 4 | **1** | 1 | 3 (no Expo API; screen blanks each rep) | 2–3 | **No**: a hand over the sensor in bed does it |
| Accelerometer squats / jacks | 3 | 1 | 1 | 4 | 2 | No |
| Make your bed (photo) | 4 | 1 without AI | 1 | needs banned AI | n/a | **No** |
| Sky / sunlight / outside photo | 3 | 2 | 2 | 1 (no light-sensor API; dark before ~7:30 in January) | 3 | No |
| Brush teeth / kettle / flush / shower (sound) | 4 (flush) | 1 (play a recording) | 1 | 2 (microphone; labels unverified) | 3 | No |
| Drink water / cold shower | 2 | 1 | 1 | none | n/a | No (water as a code on the bottle = Code spots) |
| Friend/partner check-in, First one down | 4 | 5 | 4 | 2 (needs a server) | 5+ | Later |

## 4. The strong candidates, one by one

### Bed-to-bottom time (v1)

- **What:** every unlock prints a time: from the morning start (or the first tap on
  the shield, whichever is later) to the proof. "Bed to bottom: 3 min 12 s." Loc
  keeps your best and your worst, and the share card becomes the receipt
  DESIRE_VALIDATION §5 already ranks fourth.
- **Why not a stair-speed timer:** timing the stairs rewards running down them at 7am
  half-asleep. Timing *getting up* rewards the thing the product sells, and it's still
  a speedrun.
- **Virality:** a number that drops over 30 days is a daily series ("Day 1: 52 min.
  Day 30: 2 min."). Two housemates comparing times is a duet format. It works for
  steps and scan too, so every user's card advertises.
- **Proves up / cheats:** it inherits the method's proof. Nothing new to cheat.
- **iOS:** pure TypeScript. No new permission.
- **Excludes:** nobody. The time is shown, never scolded.

### Code spots (v1)

- **What:** Scan already exists. Code spots is the setup step that suggests *where*
  the code goes, each with its own lines: the freezer, the outside bin ("raccoon bin
  run", on brand), the coffee bag barcode, the bathroom mirror, and "partner hides it"
  (someone re-hides the printed QR each night). The user picks one; Loc talks about
  that spot every morning.
- **Virality:** WAKE_METHODS_100's video shortlist already names bin run, freezer
  and partner hides it. They cost nothing to film and can be filmed with the real app
  in November. "My girlfriend hides my unlock code every night" is the couple format
  that got 4M views ([DESIRE_VALIDATION](DESIRE_VALIDATION.md)).
- **Proves up:** yes; the code is in another room. The known hole is a photo of the
  QR on another phone ([exits-and-scan.md](v1-build/exits-and-scan.md)); product
  barcodes and "partner hides it" make that harder, and the daily tear-off sheet
  fixes it if it matters. Filming someone *trying* the photo cheat on a barcode that
  only exists in the freezer is itself content.
- **iOS:** done (`expo-camera`). Only setup copy, a stored `spot` label and lines.
- **Excludes:** nobody who can reach one spot; it stays the accessible option.

### Push-ups (v1.1)

- **Virality: the best evidence in the category.** Pushscroll, Erly and Wayk all led
  with push-ups and got 8–25M views. It creates the "what app is this?" moment and
  spawns cheat attempts and challenges.
- **Saturation:** by February, Locturne would be at least the sixth push-up lock.
  Push-ups alone answer "what app is this?" with "one of the push-up ones". The
  Locturne version has to be *"downstairs, then 10 push-ups at the bottom"* or *Loc
  counting*, not a plain push-up counter [OPINION].
- **Proves up: weaker than stairs.** A push-up on a mattress is awkward but possible
  with the phone propped on a nightstand. You are out from under the covers and
  awake, but not out of the room. Squats are better here: full-body framing and
  standing need the floor.
- **Cheats:** half-reps, knee push-ups and head bobs, all catchable by elbow angle and
  shoulder height relative to the wrists (a rep must go down and back up past set
  angles). The roastable moments ("That was a nod.") are the content.
- **iOS feasibility (the real cost):**
  - Apple's `VNDetectHumanBodyPoseRequest` (Vision, iOS 14+) finds 19 joints per
    frame, on the device, free ([Apple](https://developer.apple.com/tutorials/data/documentation/vision/detecting-human-body-poses-in-images.md)).
    No frame needs to leave the phone.
  - **Expo has no frame access.** `expo-camera` scans codes but doesn't hand you video
    frames. Two routes:
    - **A. Our own Expo module (recommended):** a Swift `AVCaptureSession` on the
      front camera, Vision pose at ~15 fps, sending only joint positions (not images)
      to JS, plus a preview view. About 300–500 lines of Swift. The rep counter lives
      in `src/lib/wake/pushups.ts` as a pure module, tested on Linux against joint
      recordings logged on the phone, like `downstairs.ts`.
    - **B. VisionCamera + a pose plugin:** `react-native-vision-camera` (v5 is a Nitro
      rewrite) with an ML Kit or MediaPipe plugin such as `expo-pose-landmarks`
      ([margelo](https://margelo.com/blog/whats-new-in-visioncamera-v5),
      [yarn](https://classic.yarnpkg.com/en/package/expo-pose-landmarks)).
      Faster to start, but these are small community plugins of unknown SDK 57 /
      new-architecture support [UNVERIFIED], plus Google's model in the binary.
  - **From Linux,** every Swift change is a new EAS dev build (tens of minutes), and
    the simulator has no camera anyway. All tuning happens on the phone.
  - **Light:** pose detection needs a lit room. On a January morning the user has to
    turn the light on first (which is fine for the product, but it must be said on
    screen).
  - **App Review:** low risk. A camera usage string; nothing collected, so the privacy
    label doesn't change.
- **Excludes:** a lot of people: injuries, pregnancy, older users, anyone who can't
  get to the floor. It must never be a default, and "walk 200 steps instead" stays
  on screen, as with downstairs.
- **Effort:** module 2–3 days, counter and recordings 2 days, screen and lines 1–2,
  tuning across rooms, light and bodies 2–4, plus beta fixes. **8–12 founder-days.**

### The rest, briefly

- **Proximity push-ups** (WAKE_METHODS_100 #57, on the practical shortlist): drop it.
  Covering the sensor with a hand ten times works lying down, and iOS turns the
  screen off each time the sensor is covered ([Apple UIDevice](https://developer.apple.com/documentation/uikit/uidevice.md)).
- **Sunlight:** iOS has no public ambient-light API; only SensorKit, which is
  research-only ([Apple forums](https://developer.apple.com/forums/thread/81806)).
  Camera exposure could stand in, but a lamp beats it and January mornings are dark.
- **Sound methods:** Apple's built-in classifier knows ~300 sounds, but the full label
  list isn't documented (no cat hiss, for one), so "toothbrush" or "kettle" may not
  exist ([DEV](https://dev.to/kruhlova/sound-analysis-has-no-cathiss-label-974)).
  Any of them can be beaten by playing a YouTube clip in bed.
- **Make your bed:** the only honest checks are AI judging (banned) or an honour
  photo, and a photo of your bed is the one photo you can take from inside it.
  BedLock also shows the idea alone doesn't go viral.
- **Touch grass / leave the house:** strong proof, good meme, but Touch Grass owns
  the meme and it asks people to go outside before 8am in January. Revisit as "Leave
  the house" for spring.
- **Loc's pick and build-your-own chains:** good v1.1 work once there are enough
  methods to pick from. Chains are also how "downstairs, then push-ups" ships.

## 5. Video formats and hooks

All real footage of the real app, hook in the first second and on screen as text,
the shield shown within 3–7 seconds (DESIRE_VALIDATION §3).

**Bed-to-bottom time (v1)**
- "I'm speedrunning getting out of bed. My phone won't work until I do."
- "Day 1: 52 minutes in bed before Instagram. Day 30:"
- "My roommate and I compare how long it takes us to get out of bed. A raccoon keeps score."
- "This app sends me a receipt for how long I lay in bed."
- "POV: 7:00am. 3 minutes 12 seconds to TikTok."

**Code spots (v1)**
- "My phone won't work until I scan the bin outside. In January."
- "I put my unlock code in the freezer so I can't cheat from bed."
- "My girlfriend hides my unlock code every night."
- "My coffee bag is the password to my phone."
- "Trying to cheat my phone lock with a photo of the code." (film only if it really fails)

**Push-ups (v1.1)**
- "My apps don't wake up until I go downstairs and do 10 push-ups."
- "Trying to cheat my push-up lock. The raccoon caught me."
- "Push-ups before Instagram. Day 1 vs day 30."
- "My boyfriend has to do push-ups at the bottom of the stairs before TikTok works."

## 6. Loc's lines (drafts for the VOICE.md line bank)

Under eight words, periods, the joke on him or the situation, never on the user.

| Method | Moment | Line |
|---|---|---|
| Bed-to-bottom | Unlock | "Three minutes. I was still asleep for two." |
| Bed-to-bottom | New best | "New best. I hate that I noticed." |
| Bed-to-bottom | Slow morning | "Forty minutes. Same, honestly." |
| Code spots | Freezer | "It's in the freezer. Bring a sleeve." |
| Code spots | Bin run | "The bins. My people." |
| Code spots | Coffee bag | "Scan the coffee. Then make the coffee." |
| Code spots | Partner hides it | "They hid it. I'm not helping." |
| Push-ups | Start | "Ten. I'll count. Slowly." |
| Push-ups | Half rep | "That was a nod. Didn't count it." |
| Push-ups | Done | "Ten. I felt that. I did nothing." |
| Push-ups | Too dark | "Can't see you. Lights on. Sorry." |

The last one is the "clear when it matters" case: say what's wrong first.

## 7. Build plans and risk to January

### Bed-to-bottom time: ~1.5 days, no launch risk

- `src/lib/wake/receipt.ts` (pure): start = max(morning start, first shield tap or
  app open in the morning), end = proof time from `recordProof`. Best and worst kept
  per method. Tests with the existing timezone sweeps.
- Show it on the success fade in the upright serif number; feed the share card
  ("Bed 11:41. Downstairs 7:02. Bed to bottom 3:12.").
- Lines in `wake/lines.ts`. No native code, no permission.
- Risk: none to the lock. It never touches `lock-state.ts`.

### Code spots: ~1.5 days, no launch risk

- Add a `spot` field next to the registered code in `src/lib/scan.ts`; a spot picker
  in Scan setup (an @expo/ui `List`/`Picker`, per the native-controls rule); per-spot
  lines for the morning scan screen and the shield text.
- "Partner hides it" is copy only: the code can move; it's still the same code.
- Risk: none. If time runs short, GAME_PLAN already says cut Scan before reliability
  work, and Code spots goes with it.

### Push-ups: 8–12 days, v1.1

- Route A in §4 (own Expo module, Apple Vision). Pure counter in
  `src/lib/wake/pushups.ts`; the screen calls `proveMorning('pushups')` like every
  other method, so the lock rules don't change (`morning-engine.md`).
- **Why not January:** the November–December plan is already full (UI Nov 10–Dec 10,
  App Review by Dec 18). Native camera work is the slowest kind to iterate from Linux,
  needs tuning on many bodies in bad light, and is the kind of thing that fails at
  7am. Paying users punish reliability failures, not missing methods (§2).
- **Optional spike, only with the founder's yes:** if Step 1's device gates pass and
  Step 2 is on schedule, spend at most 3 days in late October building the Swift
  module and logging joints. Go/no-go on November 10: ship in v1 only if it counts 10
  honest push-ups correctly 9 times out of 10 in a normally lit room on the founder's
  phone. Otherwise February. The cost of waiting: push-ups miss the New Year fitness
  wave, and there's no push-up footage for the launch videos.

## 8. GAME_PLAN rules that would need to change

Not applied; each needs the founder's yes.

1. **"Push-ups and photo methods wait for launch data and a decision"** →
   *"On-device body-pose counting (push-ups, squats) is allowed: the phone counts
   joints, no image is stored or sent, nothing judges what a photo shows. It ships in
   v1.1. Photo judging stays banned."* This splits LAUNCH_PLAN D2: yes to pose
   counting, no to photo methods.
2. **"Not part of the plan: AI/photo verification of goals"** → add one clause:
   *"On-device rep counting isn't photo verification."* Otherwise rule 1 contradicts it.
3. **The "can't be done in bed" test** needs one nuance if push-ups go in: push-ups
   prove you're up and out from under the covers, not out of the room. Either accept
   that for an opt-in, never-default method, or only offer push-ups chained after
   downstairs or a scan.
4. **v1 scope:** add "bed-to-bottom time on every unlock" and "code spots in Scan
   setup" to the wake-up methods section (marketing layers, not new proofs).
5. **Step 6 "the next wake-up method, chosen by which video series converted best"**
   → name push-ups (and squats) as the planned v1.1 method, unless the November–January
   video data clearly says otherwise.
6. **Stays as it is:** no photo judging (bed, sky, grass), no microphone methods, no
   NFC, no timed earned unlocks. Proximity push-ups should come off WAKE_METHODS_100's
   practical shortlist.

## Sources

- Pushscroll: [Braavo, July 2026](https://www.getbraavo.com/blog/from-0-to-1m-the-organic-growth-playbook-behind-pushscroll/), [Superwall](https://superwall.com/blog/our-app-makes-usd30k-month-profit-using-this-simple-strategy-copy-us), [sliplane summary of a founder interview](https://onepage-research.sliplane.app/articles/youtube.com/yt-ST2ROU-0932ccd0) [UNVERIFIED], [App Store](https://apps.apple.com/us/app/pushscroll-exercise-to-scroll/id6741765734)
- Erly: [superframeworks](https://superframeworks.com/case-study/erly), [JustUseApp reviews](https://justuseapp.com/en/app/6751428380/erly-wake-up-early/reviews), [App Store](https://apps.apple.com/us/app/-/id6751428380)
- Wayk: [First 1000](https://read.first1000.co/p/how-an-alarm-app-got-25-million-views), [App Store](https://apps.apple.com/app/id6758021281)
- Clearspace: [Soren's newsletter](https://sorens.beehiiv.com/p/pushups-screentime); PushUpLock: [AppsHunter](https://appshunter.io/ios/app/pushuplock-push-up-blocker/id6753698904)
- Touch Grass: [Rhys Kentish](https://rhyskentish.substack.com/p/touch-grass-my-app-that-stops-me), [TechCrunch, March 2025](https://techcrunch.com/2025/03/17/this-app-limits-your-screen-time-by-making-you-literally-touch-grass/)
- Alarmy: [viral videos](https://alar.my/en/blog/alarmy-global-viral-videos-2), [missions](https://alar.my/en/blog/how-to-choose-alarmy-mission)
- Brick: [SSENSE](https://www.ssense.com/en-ca/editorial/technology/how-brick-became-a-status-symbol-for-the-aspirationally-offline)
- BedLock: [Product Hunt](https://www.producthunt.com/p/bedlock/bedlock-2), [hunted.space](https://www.hunted.space/product/bedlock)
- Apple Vision body pose: [Apple](https://developer.apple.com/tutorials/data/documentation/vision/detecting-human-body-poses-in-images.md)
- VisionCamera v5 and pose plugins: [Margelo](https://margelo.com/blog/whats-new-in-visioncamera-v5), [expo-pose-landmarks](https://classic.yarnpkg.com/en/package/expo-pose-landmarks), [react-native-mlkit-pose-detection](https://github.com/swittk/react-native-mlkit-pose-detection/blob/master/README.md)
- Proximity sensor: [Apple UIDevice](https://developer.apple.com/documentation/uikit/uidevice.md), [Apple forums](https://developer.apple.com/forums/thread/713162)
- No ambient-light API: [Apple forums](https://developer.apple.com/forums/thread/81806)
- Sound classifier labels: [Apple](https://developer.apple.com/documentation/soundanalysis/snclassifieridentifier.md), [DEV](https://dev.to/kruhlova/sound-analysis-has-no-cathiss-label-974)
- Internal: [DESIRE_VALIDATION.md](DESIRE_VALIDATION.md) (video table, couple format), [VALIDATION_RESEARCH.md](VALIDATION_RESEARCH.md) (Clearspace, Opal, one sec), [STRATEGY_DEEP_DIVE.md](STRATEGY_DEEP_DIVE.md) (Groggy, BedLock), [exits-and-scan.md](v1-build/exits-and-scan.md) (photo-of-QR hole)
