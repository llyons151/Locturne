# Life-task unlocks: apps wake up when you've done your real thing

Written October 4, 2026. The question (from the founder): could Locturne lock apps
until the user has done the things that matter in *their* life, not just got out of
bed? Examples: schoolwork submitted, a workout, a coding session pushed. The aim is
both a really good app and features with viral potential.

This doc does not change [GAME_PLAN.md](../GAME_PLAN.md). It builds on
[WAKE_METHODS_100.md](WAKE_METHODS_100.md) and [UNLOCK_METHODS_V1.md](UNLOCK_METHODS_V1.md),
which covered *proving you're up*. This one covers *proving you did the task*.

Three research passes ran in parallel. Their sources are listed at the end.

Tags: **[UNVERIFIED]** means one weak source or a search snippet. **[OPINION]** means
it's my call.

## 1. The answer in short

- **The blocking side is already solved.** Locturne's shield lifts whenever its own
  logic says so. All the new work is *verification*.
- **Apple Health is the big unlock, and it's free.**
  - Strava, Garmin, Whoop, Oura, Peloton and Apple Fitness all write workouts to
    HealthKit.
  - Headspace and Calm write mindful minutes there too.
  - One on-device query covers all of them. It needs no server and no approval from
    any company, and it can reject workouts typed in by hand.
  - Calling those services directly is a dead end:
    - **Strava:** new apps are capped at 10 athletes, and the developer needs a
      $11.99/mo subscription.
    - **Garmin:** sign-ups have been frozen since spring 2026.
    - **Whoop:** approval is gated and slow.
- **School integrations are dead ends.**
  - **Canvas:** asking students for personal tokens breaks Instructure's API policy
    and gets apps blocked. The proper route needs a developer key from every school.
  - **Google Classroom:** needs approval from the school's Workspace admin.
  - **Anki, Quizlet, Khan Academy, Kindle and Goodreads:** no usable API.
  - The homework idea has to work through *places, time in a study app, or codes*
    instead.
- **The unlock condition is rarely the thing that goes viral.** The apps with real
  money paired a specific *audience* with content made for that audience:
  - PrayScreen: about $50K MRR in 90 days.
  - Unrot ("brainrot" branding): about $40–45K/mo.
  - ClearSpace (a menu of unlock methods): about $55K/mo.

  Novel conditions like "touch grass" or "make your bed" got press, but there's no
  proof they made money.
- **Recommendation [OPINION]:** after the January launch, add a **"then do your
  thing" step** to the morning, built on four verifiers:
  1. **Get outside / reach a place** (location)
  2. **Log a workout** (Apple Health)
  3. **Time in a good app** (Screen Time thresholds, e.g. 20 min in Kindle, Anki or a
     study app)
  4. **Push code** (GitHub)

  Add **Tomorrow's one thing** at bedtime so self-reported tasks still mean something
  (§4).

## 2. What iOS can actually verify, on-device

| Verifier | How | Trust | Notes |
|---|---|---|---|
| **Workout (any app)** | HealthKit `HKWorkout`. Filter by source (Watch, known apps), reject `HKMetadataKeyWasUserEntered`, set a minimum duration and energy | High | Background delivery can wake the app to lift the shield. HealthKit can't be read about 10 min after the phone locks, and shouldn't be counted on inside the Screen Time extensions [UNVERIFIED] |
| **Steps / distance / flights** | `CMPedometer` (already shipped) | High | |
| **Place: gym, library, school, office** | `CLMonitor` geofence plus a dwell timer; GPS spoofing is flagged | High for "showed up" | Needs "Always" location to wake in the background, so justify it clearly to App Review |
| **Get outside** | Leave a radius around home (e.g. 150 m) | High | The "touch grass, literally" premise without photo AI |
| **Code at the task spot** | Existing barcode scan, with the code stuck on the desk, gym bag or bookshelf | Medium (a photo of the code works) | Already built; it's a copy and placement change |
| **Time in a good app** | DeviceActivity event: N minutes in apps the user picks → `eventDidReachThreshold` lifts the shield, with no API needed for that app | Medium (an idle app left open counts) | **Known iOS 26/27 bug:** the threshold fires early, sometimes within seconds. Apple has acknowledged it and it's unfixed (FB18061981, FB20817853). Workaround: treat the callback as a wake-up, check against our own timestamps and re-arm. **Needs a device spike before promising it.** |
| **Mindful minutes** | HealthKit `mindfulSession` | Medium | Filter by source |
| **Reminders list done** | EventKit `EKReminder.completionDate` plus the list | Honor system | Can't be woken by changes; check when the app opens |
| **Shortcuts / App Intent "task done"** | An `AppIntent` that other automations call | Honor system | Useful for power users; never the default |

**Not worth it:** MusicKit (no timestamps), Apple Books and Audible (no API), Journaling
Suggestions (the user picks one item, and it's meant for journaling apps), Focus
status (needs a messaging capability, so App Review risk), SensorKit (research-only).

## 3. Outside services that work from the phone alone

| Service | Client-only? | Proof | Verdict |
|---|---|---|---|
| **GitHub** | Yes: device flow needs no secret | Push or contribution since the morning start | **Build.** Official, stable, free; the only iOS competitor (GitFocus) is tiny. Easy to cheat with an empty commit, so require lines changed |
| **LeetCode** | Yes, by username (unofficial GraphQL) | An accepted solve today | **Beta only.** No iOS app does this, and there's a big job-seeker and student audience, but the API can break without notice |
| **Todoist** | Yes: public client with PKCE | Completed tasks since T | Only meaningful for a task that existed **before bedtime** (§4) |
| **Google Tasks / Microsoft To Do** | Yes (PKCE); Google needs free verification of a sensitive scope | Completed since T | Same caveat as Todoist; pick one later if users ask |
| **Duolingo** | Unofficial, by username | Streak extended today | **Skip.** It's against Duolingo's terms, and Duolingo is testing its own Focus Mode that locks apps until lessons are done. "Time in a good app" covers Duolingo anyway |
| Notion, TickTick | Need a tiny token proxy (a free Cloudflare Worker would do) | Checkbox or completion | Later, only if asked |
| Canvas, Classroom, Strava, Garmin, Whoop, Spotify, Anki, Kindle, Drive | No | n/a | **Avoid** |

## 4. Making self-reported tasks honest: "Tomorrow's one thing"

Self-report is the most common complaint in this category. Habit Doom's users ticked
"Workout" while lying in bed until verification became the top request. It can still
sell: Unrot doesn't verify anything and makes money.

The fix [OPINION] fits Locturne's bedtime flow:

1. At bedtime, Loc asks: **"What's the one thing tomorrow?"**
2. The user names it and picks how it gets proven. The app suggests the strongest
   proof for the task:

   | Task | Proof the app suggests |
   |---|---|
   | Gym | Workout in Health, or the gym geofence |
   | Study | 20 min in the study app, or the library geofence |
   | Code | A GitHub push |
   | Homework | Code scan at the desk, plus time in the study app |
   | Anything else | A Reminders item or Todoist task named *tonight*, ticked tomorrow |

3. In the morning, getting up comes first (downstairs or steps, unchanged). **Then**
   the one thing. Only then do the apps wake up.

Why this works:

- Naming it the night before turns a checkbox into a commitment. It's harder to
  invent a fake task at 7am to escape.
- It fits [user controls their morning](../GAME_PLAN.md): methods are building blocks
  the user combines, and the guardrails stay.
- Loc's voice can roast it: *"You said 'gym.' Health says 'couch.'"*

**Guardrails it needs:**

- **Time cap.** If the one thing isn't done by a time the user sets (e.g. 11:00),
  the apps wake anyway. Being stuck on a bug or the gym being closed shouldn't
  mean losing the phone all day.
- **No double-dipping.** Passes and the emergency unlock still work as now.
- **Off by default.** The core promise stays "your apps don't wake up until you get
  up". The one thing is opt-in.

This is **not** a timed earned unlock. Doing the task unlocks the morning; it doesn't
buy 15 minutes. So it doesn't break GAME_PLAN's "Not part of the plan" list. It
*is* new scope, so GAME_PLAN would need a line if it's approved.

## 5. Viral potential

What the evidence says:

- **The condition alone rarely goes viral.** Formats that got views:
  - **Silent guilt POV:** doomscrolling over open study notes, then the app snaps
    shut. One video got 7.6M views at 527× the account's median.
  - **Phone-free morning routine:** #lowdopaminemorning, 5.6M views on the tag.
  - **Physical challenge shot:** push-ups, Pushscroll's ~16M.
  - **Content made for the identity:** faith content for PrayScreen, "brainrot"
    branding for Unrot.

How each new verifier rates for video [OPINION]:

| Verifier | Video hook | Daily usefulness | Notes |
|---|---|---|---|
| **Get outside** | Strong: front door, daylight. *"My apps won't open until I literally touch grass."* | High | Best mix; cheap |
| **Workout logged** | Strong: gym mirror, sweat. *"Instagram stays asleep until Health says I lifted."* | High | Crowded as a standalone app, but strong inside a morning flow |
| **Time in a good app** | Medium-strong: *"TikTok won't open until I've read 20 minutes."* Kindle open on the nightstand | High | The broadest one: works for any app, no API needed. Blocked on the iOS bug spike |
| **Push code** | Strong *for developer Twitter/X*: *"My phone is locked until I push to main."* | Niche | A cheap side channel for developer audiences; may get organic tweets |
| **Tomorrow's one thing** | Medium: the night-before promise, then the morning payoff and roast | High | Glues the system together; Loc's best material |
| **Study (library geofence + study app)** | Strong for students: the silent guilt-POV format | High for students | Fits the New Year / semester-start window |

**Faith** stays its own question; see [FAITH_LOCK_RESEARCH.md](FAITH_LOCK_RESEARCH.md).
It's the one "X to unlock" niche with documented $15–50K/mo results, and "Bible app
time" is simply *time in a good app* with a faith audience. One verifier would serve
both.

## 6. Suggested order [OPINION]

Nothing here is for the January launch. The launch stays as planned.

1. **v1.1:**
   - **Get outside** (geofence; reuses the morning gate)
   - **Workout in Health**

   Both are on-device, have strong hooks and pose low risk.
2. **Spike first:** **Time in a good app.** Test the DeviceActivity threshold on a
   real iPhone with iOS 26 before committing. If the early-fire workaround holds,
   this becomes the headline feature: *any app can be your good app*.
3. **v1.2:**
   - **Tomorrow's one thing**
   - **Places** (gym, library)
   - **Reminders / Todoist** as the honor-system fallback
4. **Side channel:** **GitHub push** (about a day of work with device flow). Market it
   on X/Hacker News, not TikTok. Optionally LeetCode beta.
5. **Don't build:** Canvas, Classroom, Strava/Garmin direct, Duolingo API, photo-AI
   tasks, music/books.

## 7. Open decisions for the founder

- **D-LT1:** Should the "then do your thing" step exist at all, or does it blur
  the one-line pitch? Its strength: it makes Locturne the app that runs your
  morning. Its risk: Locturne becomes a productivity app in a crowded category.
- **D-LT2:** Time-cap default (11:00? two hours after the wake proof?). This also
  answers the founder's "no phone for the first two hours" idea: a cap of "two hours
  after you got up" *is* that hack.
- **D-LT3:** Do honor-system tasks (Reminders, Todoist) count on their own, or only
  as the night-before "one thing"?
- **D-LT4:** Whether to give faith its own onboarding branch, using the same
  good-app-time verifier.

## Sources

**iOS verification**
- [DeviceActivityEvent](https://developer.apple.com/documentation/deviceactivity/deviceactivityevent)
- Forum threads on the threshold regression and early firing:
  [808470](https://developer.apple.com/forums/thread/808470),
  [840907](https://developer.apple.com/forums/thread/840907)
- [6 MB extension memory limit](https://developer.apple.com/forums/thread/823431)
- [HealthKit background delivery](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:))
- [Health data protection](https://support.apple.com/guide/security/sec88be9900f/web)
- [EKReminder.completionDate](https://developer.apple.com/documentation/eventkit/ekreminder/completiondate)
- [Shortcuts automations](https://support.apple.com/guide/shortcuts/apd602971e63/ios)
- [JournalingSuggestions](https://developer.apple.com/documentation/journalingsuggestions)
- [MusicRecentlyPlayedRequest](https://developer.apple.com/documentation/musickit/musicrecentlyplayedrequest)

**Outside services**
- [GitHub PKCE changelog](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/)
- [GitLab OAuth](https://docs.gitlab.com/api/oauth2)
- [LeetCode-Query](https://github.com/JacobLinCool/LeetCode-Query)
- Canvas: [API access question](https://community.canvaslms.com/t5/Developers-Group/Canvas-API-Access-Question-Higher-Education/td-p/572723),
  [OAuth docs](https://developerdocs.instructure.com/services/canvas/oauth)
- [Google Classroom student app access](https://workspaceupdates.googleblog.com/2024/11/request-access-to-third-party-apps-on-behalf-of-students.html)
- [Anki / FareGate](https://forums.ankiweb.net/t/faregate-bridge-sync-your-reviews-back-from-an-iphone-app-that-gates-distracting-apps-behind-your-due-cards-agpl/70645)
- Strava: [2026 changes](https://tryterra.co/blog/strava-api-changes-2026),
  [DC Rainmaker](https://dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html)
- [Garmin pause](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/)
- [Whoop](https://tryterra.co/blog/whoop-api-data-access-permissions-limitations-2026)
- [Todoist API v1](https://developer.todoist.com/api/v1/)
- [Google sensitive-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Spotify extended access](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access)
- Duolingo Focus Mode: [Tubefilter](https://www.tubefilter.com/2026/05/20/duolingo-focus-mode-screen-time-cap-limit/),
  [PocketGamer.biz](https://www.pocketgamer.biz/duolingo-experiments-with-tool-to-lock-other-apps-until-daily-lessons-are-complete)
- [GitFocus](https://apps.apple.com/app/gitfocus/id6756835707)
- [Commit Lock](https://chromewebstore.google.com/detail/bpmolnbejdfclocenjpidoacjejfeanb)

**Traction and formats**
- [PrayScreen](https://startupspells.com/p/prayscreen-christian-app-50k-mrr-tiktok-growth)
- [Bible Mode](https://screensdesign.com/apps/bible-mode-reduce-screen-time/)
- [Unrot](https://screensdesign.com/showcase/unrot-earn-your-screentime)
- [ClearSpace](https://screensdesign.com/showcase/clearspace-reduce-screen-time)
- [one sec](https://fortune.com/well/2023/03/06/one-sec-app-can-help-cut-your-social-media-use)
- [Steppin](https://techcrunch.com/2025/01/14/kayak-founder-returns-with-steppin-an-app-that-locks-you-out-of-social-media-until-you-go-for-a-walk)
- [Touch Grass](https://techcrunch.com/2025/03/17/this-app-limits-your-screen-time-by-making-you-literally-touch-grass/)
- [Habit Doom on cheating](https://habitdoom.com/blog/habit-tracker-you-cant-cheat)
- [Silent guilt-POV outlier](https://gethandler.ai/outliers/screen-time-blocker-tiktok-silent-ugc-527x/)
- [Low-dopamine mornings](https://money.yahoo.com/tiktok-obsessed-low-dopamine-mornings-103600263.html)
- [Forest](https://appgoblin.info/apps/866450515)

All app revenue figures are third-party estimates and are rough.
