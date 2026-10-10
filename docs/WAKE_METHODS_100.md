# 100 ways to prove you're up

Logged October 1, 2026. A brainstorm of wake-up methods: ways for the user to
prove they've **left bed** before their apps wake up. Nothing here changes
[GAME_PLAN.md](../GAME_PLAN.md); v1 ships Go downstairs (hero), Walk it off,
Scan your code, and since 2026-10-09 Leave the house (#25) and Proximity push-ups
(#57). This is the pool to pull from for v1.x and for video ideas.

## The test every method had to pass

1. **It can't be done lying in bed.** That rules out math, memory, typing,
   shaking and saying a phrase (GAME_PLAN bans them as gates).
2. **iOS can check it.** Each row names the sensor or API that proves it.
3. **It doesn't judge photos** (banned) **or use NFC** (banned, decision D3 in
   [LAUNCH_PLAN.md](LAUNCH_PLAN.md)).
4. **No punishment, money stakes or timed earned unlocks.**

## Key

- **Type:** **P** = practical (good to use every day), **M** = marketing (a strong
  video hook, probably not what most people pick daily), **P+M** = both.
- **Fit:** **OK** = fits the current rules. **Hardware** = needs something the
  user buys. **Decision** = touches an open decision (camera methods = D2,
  microphone is new). **Weak** = works, but is easy to cheat or unreliable; keep
  it as a video idea only.

---

## A. Height (barometer, `CMAltimeter`)

The strongest family: a floor of height can't be faked from bed.

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 1 | **Go downstairs** | ≥ 2.5 m height change held ~5 s | P+M | OK (v1 hero) |
| 2 | **Go upstairs** (ground-floor bedrooms) | Same check, upwards | P | OK |
| 3 | **Stair reps**: down, up, down again | Three ≥ 2.5 m swings in one session | M | OK |
| 4 | **Lobby run** (apartments) | ≥ 8 m drop, stairs or lift, to the ground floor | P+M | OK |
| 5 | **Climb the building** | ≥ 3 floors up with stair-climbing cadence (rules out the lift) | M | OK |
| 6 | **Downstairs speedrun** | Same check, timed; Loc reads out your personal best | M | OK |
| 7 | **Basement / laundry run** | Two floors down | P | OK |
| 8 | **Downstairs and stay there** | Height stays ≥ 2.5 m lower for 3 minutes (stops back-to-bed) | P | OK |

## B. Walking and movement (`CMPedometer`, `CMMotionActivity`, GPS)

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 9 | **Walk it off** (200 steps) | Steps since morning start | P | OK (v1) |
| 10 | **Pick your number** (500 / 1,000 steps) | Same, higher target | P | OK |
| 11 | **Brisk minute** | Cadence above ~100 steps/min for 60 s; shaking can't hold a steady cadence | P | OK |
| 12 | **Two-part wake** | 100 steps now, 100 more about 10 min later (LAUNCH_PLAN D4) | P | OK |
| 13 | **Morning jog** | Motion activity reads "running" for 3 min | P+M | OK |
| 14 | **Walk the dog** | 500 steps and the phone leaves home Wi-Fi | P+M | OK |
| 15 | **End of the street** | GPS ≥ 150 m from home | P | OK |
| 16 | **Out and back** | Leave a 100 m radius and come home | P | OK |
| 17 | **Sunrise walk** | Outside (GPS) within 30 min of local sunrise | M | OK |
| 18 | **Bike ride** | Motion activity reads "cycling" for 5 min | P | OK |
| 19 | **Commute unlock** | Motion activity reads "automotive" (car, bus, train) | P | OK |
| 20 | **Run a kilometre** | GPS distance ≥ 1 km | P+M | OK |
| 21 | **Apple Watch steps** (phone stays on the nightstand) | Watch pedometer, synced to the phone | P | Hardware |
| 22 | **Wheelchair pushes** | Apple Watch wheelchair mode counts pushes | P | Hardware; a real accessibility option |
| 23 | **Walk with Loc** | Loc's morning audio only plays while steps are coming in; finish the track to wake the apps | M | OK |
| 24 | **Steps, phone held upright** | Steps plus phone orientation; a cheaper anti-shake mode | P | OK |

## C. Places (geofences, Wi-Fi, map points)

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 25 | **Leave the house** | Exit the home geofence | P | **v1** (2026-10-09; in-app location check, optional daylight exposure check) |
| 26 | **Coffee shop unlock** | Arrive at any café (MapKit point of interest) | M | OK |
| 27 | **Gym check-in** | Arrive at your gym | P+M | OK |
| 28 | **Campus arrival** | Arrive at your school or uni | P | OK |
| 29 | **Office arrival** | Arrive at work | P | OK |
| 30 | **Touch grass** | Arrive at any park | M | OK |
| 31 | **Station or bus stop** | Arrive at any transit stop | P | OK |
| 32 | **Your landmark** | A pin you drop at least 300 m away | P | OK |
| 33 | **Loc's pick** | Loc picks a different nearby spot each week | M | OK |
| 34 | **Friend's door** | Arrive at a friend's address (morning walks together) | P+M | OK |
| 35 | **Out of Wi-Fi range** | Phone drops the home network (end of the drive, the garden) | P | Weak (range varies) |
| 36 | **Kitchen Wi-Fi node** | Phone joins the mesh access point in the kitchen (BSSID) | P | Weak (mesh roaming is fickle) |
| 37 | **Bakery run** | Arrive at any bakery | M | OK |

## D. Codes (camera barcode scan, the v1 "Scan your code" family)

Where the code lives *is* the method. Each is a setup suggestion plus its own
Loc lines and its own video.

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 38 | **Scan your code** | Per-user QR in another room | P | OK (v1) |
| 39 | **Coffee bag barcode** | A registered product barcode | P | OK |
| 40 | **Daily tear-off codes** | A printed sheet of 31 codes, one valid per day; beats the "photo of the code" cheat | P | OK |
| 41 | **Scavenger chain** | Three codes in three rooms, in order | M | OK |
| 42 | **Random room** | Loc picks which of your three codes counts today | P+M | OK |
| 43 | **Partner hides it** | Someone re-hides your code each night | M | OK |
| 44 | **Code in the shower** | Waterproof sticker on the tile | M | OK |
| 45 | **Bathroom mirror** | Code on the mirror | P | OK |
| 46 | **Inside the fridge** | Code on the milk shelf | P+M | OK |
| 47 | **In the freezer** | Code in the freezer (cold air wakes you) | M | OK |
| 48 | **Feed the pet** | Barcode on the pet food tin | P+M | OK |
| 49 | **Raccoon bin run** | Code on the outdoor bin; on brand for a raccoon | M | OK |
| 50 | **Front door, outside** | Code on the outside of the door | P | OK |
| 51 | **In the car** | Code on the dashboard | P | OK |
| 52 | **The kettle** | Code on the kettle | P | OK |
| 53 | **Toothpaste barcode** | Registered toothpaste tube | P | OK |
| 54 | **Water the plant** | Code on a plant pot | M | OK |
| 55 | **Cereal box** | Live Text matches words on a registered box | M | OK |
| 56 | **Medication reminder** | Barcode on your morning vitamins or pills | P | OK |

## E. Body (sensors, no camera)

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 57 | **Proximity push-ups** | Phone face-up on the floor; your chest covers the proximity sensor, 10 reps | P+M | **v1** (2026-10-09; no camera so D2 doesn't apply; hand-wave cheat to solve) |
| 58 | **Jumping jacks** | 20 reps by accelerometer pattern, phone in hand | P+M | Weak (pattern can be faked) |
| 59 | **Squats** | Accelerometer reps with the phone at your chest | P | Weak |
| 60 | **Jump rope** | Accelerometer jump rhythm, phone in pocket | M | Weak |
| 61 | **Dance break** | One song: steps plus motion energy | M | Weak |
| 62 | **Heart rate up** | Watch workout session reads live heart rate (not HealthKit history) | P | Hardware |
| 63 | **Boss mode** | Two methods back to back (downstairs and 100 steps) | P | OK |

## F. Camera with on-device vision

All touch D2 (camera methods) and must not drift into photo judging.

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 64 | **Push-ups on camera** | Vision body pose counts reps | M | Decision |
| 65 | **Sun salutation** | Body pose matches a short yoga sequence | M | Decision |
| 66 | **AR kitchen** | ARKit recognises your saved kitchen map; works only in that room | P+M | Decision; high build cost |
| 67 | **Find Loc in AR** | Loc is hidden somewhere in your saved room; find him | M | **Leading v1.1 candidate** (logged 2026-10-09); room relocalization in morning light is the risk |
| 68 | **LiDAR room match** | RoomPlan matches the kitchen's shape | P | Decision; Pro phones only |
| 69 | **Daylight at the window** | Camera exposure reads outdoor light levels | P | Decision; Weak |
| 70 | **Sky check** | Vision classifier sees sky (step outside) | M | Decision |
| 71 | **Say hi to the pet** | Vision animal detector sees your cat or dog | M | Decision |

## G. Sounds (on-device `SoundAnalysis`)

Apple's built-in classifier knows about 300 sounds, offline. All need a decision
on the microphone, and all can be cheated by playing a recording. Check each label
exists before promising it.

| # | Method | Sound | Type | Fit |
|---|---|---|---|---|
| 72 | **Flush to unlock** | Toilet flush | M | Decision; Weak |
| 73 | **Kettle on** | Kettle or boiling water | P+M | Decision; Weak |
| 74 | **Coffee grinder** | Grinder or espresso machine | P+M | Decision; Weak |
| 75 | **Wash your face** | Running tap, 20 s | P | Decision; Weak |
| 76 | **Shower on** | Shower running for 60 s | M | Decision; Weak |
| 77 | **Cook breakfast** | Frying food | M | Decision; Weak |
| 78 | **Birdsong** | Birds (you're outside or at an open window) | M | Decision; Weak |
| 79 | **Smoothie** | Blender | M | Decision; Weak |
| 80 | **Brush your teeth** | Electric toothbrush, 2 min | P | Decision; Weak |

## H. Smart home and devices

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 81 | **Open the fridge** | HomeKit contact sensor on the fridge door | P+M | Hardware |
| 82 | **Kitchen motion** | HomeKit motion sensor in the kitchen trips | P | Hardware |
| 83 | **Hit the light switch** | HomeKit button/dimmer press event in the kitchen | P | Hardware |
| 84 | **Kettle drawing power** | Smart outlet reports "in use" | P | Hardware |
| 85 | **Kitchen speaker** | Phone connects to the kitchen Bluetooth speaker | P | Weak (range) |
| 86 | **Kitchen beacon** | A ~$10 Bluetooth beacon; iOS region monitoring | P | Hardware |
| 87 | **Step on the scale** | Bluetooth smart scale reading | P | Hardware |
| 88 | **Phone sleeps in the kitchen** | Scan the kitchen code at bedtime; if motion history shows the phone stayed still all night, unplugging it in the morning is the proof | P+M | OK; a big existing trend |
| 89 | **AirPods upright** | Headphone motion shows a standing head while steps come in | P | Weak |

## I. People

| # | Method | How it's proven | Type | Fit |
|---|---|---|---|---|
| 90 | **Housemate code** | Scan a code that rotates on a housemate's Locturne | P+M | OK |
| 91 | **Wake-up buddy** | Both of you prove you're up; Loc tells each of you when the other is | M | OK |
| 92 | **Family mode** | A teen's apps wake after they go downstairs; the parent gets a note | P | OK; a later product |
| 93 | **First one down** | Friends race downstairs; Loc announces the winner, no losers named | M | OK |
| 94 | **Walk together** | Two phones close together (Bluetooth) while both are walking | M | OK |

## J. Ways to mix methods

Not new proofs, but they change how the proofs feel.

| # | Method | How it works | Type | Fit |
|---|---|---|---|---|
| 95 | **Roll the dice** | Loc picks one of your enabled methods each morning | M | OK |
| 96 | **Weekday / weekend** | Gym on weekdays, downstairs on weekends | P | OK |
| 97 | **Travel mode** | Hotel: lobby run or steps, offered automatically away from home | P | OK |
| 98 | **Seasons** | Sunrise walk in summer, stairs in winter | P | OK |
| 99 | **Loc's choice of room** | Downstairs on its own isn't enough; the kitchen code must follow | P | OK |
| 100 | **Accessible pick** | Wheelchair pushes, a code in one reachable spot, or a caregiver's housemate code | P | OK; needs real user testing |

---

## Let people build their own morning

Added at the user's request: everyone's morning is different, so the user should
control how theirs runs. The methods above are building blocks rather than a fixed
menu.

**What the user controls**
- **Which method, or which chain.** One method, or a sequence they choose
  (e.g. downstairs → kettle code → 100 steps).
- **The size of it.** Step count, floors, distance, number of codes.
- **Where things live.** They choose the rooms, places and objects for codes,
  geofences and beacons.
- **Per day.** Different mornings for weekdays, weekends, gym days and travel
  (rows 96–98).
- **How Loc sounds.** How sassy he is and how much he talks (a voice setting,
  not a different method).
- **Their own exits.** How passes get used stays theirs. The emergency unlock is
  always there.

**What stays fixed, so control can't become a loophole**
- Every method has to prove the user is out of bed. A custom morning can be
  shorter or different, but it can't be done lying down.
- Changes take effect from the next bedtime (GAME_PLAN). People design their
  morning the evening before, not from bed at 7am.
- "Walk 200 steps instead" is always offered, so a custom setup can never leave
  anyone stuck.

**How this fits the choice-overload research
([DOWNSTAIRS_METHOD.md](DOWNSTAIRS_METHOD.md) §3):** onboarding still asks one
question and picks a good default (downstairs or steps), so a new user gets a
working morning in one tap. Customising comes afterwards in a "Your morning"
screen, once they know what works for them. Users get full control without having
to make every choice on day one.

**Marketing angle:** "build your morning" gives creators a format of their own:
"my Locturne morning is stairs, then the code in the freezer, then the dog." Every
user's setup is shareable content.

## Shortlists

**Most practical next (after v1):** 8 Downstairs and stay there, 11 Brisk minute,
12 Two-part wake, 40 Daily tear-off codes, 25 Leave the house, 27 Gym check-in,
28 Campus arrival, 88 Phone sleeps in the kitchen, 57 Proximity push-ups,
22 Wheelchair pushes. All cheap to build on sensors the app already uses or
nearly uses.

**Best video hooks:** 49 Raccoon bin run, 43 Partner hides it, 47 In the freezer,
6 Downstairs speedrun, 26 Coffee shop unlock, 30 Touch grass, 72 Flush to unlock,
93 First one down, 4 Lobby run, 67 Find Loc in AR. Several cost nothing to build:
they are just a place to stick the v1 code (D. Codes), so they can be filmed
before launch.

**Biggest question they raise:** the microphone (section G) and camera vision
(section F). Both give great videos but are cheatable or close to photo judging.
Decide them together with D2.
