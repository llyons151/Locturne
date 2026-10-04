# Red team C: niche utilities (blood-trail camera, pilot AI prep, aligner timer, snore recorder)

Date: 2026-10-04. Bar: `redteam_gamer_irl.md`. Grades: A = read directly from App Store / Wayback / developer
site; B = inferred from A; C = rank-proxy or memory estimate.
Tools: `scans_fsg/ws.py` (apps.apple.com search + lookup), `rtc/revs.py` (review scrape), `rtc/ids.py`,
Wayback CDX. Raw output in `market/rtc/`. WebSearch budget was exhausted (0 searches available), so
TikTok scale, patent text and FAA stats could not be checked live. Those items are marked C.

**Summary: all four are KILLED.** None survives even with changes for this founder.

---

## A. Blood-trail tracking camera for deer hunters: **KILLED**

### 1. Competitor list (A)
Scan: `ws.py --must 'blood|deer|hunt|game recovery|wound' --exclude 'pressure|sugar|glucose|donor|oxygen|heart'
"blood tracking" "blood trail" "deer blood" "blood tracker hunting" "luminol" "game recovery" "deer recovery"
"shot placement" "blood tracking light"` returned 40 matches. After removing blood-test, BP and game noise,
plus `rtc/huntmega.txt` (hunting tracker / hunting app / hunting gps / whitetail), the true competitors are:

| App | Released | Ratings | What it is |
|---|---|---|---|
| Track N Trail | 2025-06-05 | 2,441 (4.76) | Camera blood detection ("patent-pending machine vision"), parcel maps, weather. Navigation #11 grossing |
| Track Trail Hunting & Calls (Nikhil Kumar) | 2025-09-02 | 22 | Hard-paywall suite with "AI Blood Trail Detection" and a name that copies the leader |
| Blood Trail Detector (Sergii Nesterenko) | 2026-06-03 | 1 | Exactly the proposed wedge: live camera red highlight, GPS-marked spots, photos, map |
| Aftershot: Deer Recovery | 2026-08-06 | 0 | Post-shot workflow: log the shot, read the blood, trail, markers, share pins |
| Trophy Track | 2025-12-09 | 0 | GPS breadcrumbs plus hit, blood and recovery markers (the proposed breadcrumb and "last blood" features) |
| Knight&Day Recovery | 2026-08-04 | 0 | Dispatch a tracker plus recovery tools |
| TRAKR | 2023-09 | 39 | Tracking-dog and thermal-drone dispatch (official app of United Blood Trackers) |
| FastRak Blood Trackers | 2023-09 | 44 | Tracking-dog dispatch |

- **Camera-detection clones:** 2, both launched after the leader, and both stuck at 22 ratings or fewer.
- **Every feature in the wedge is already shipped:** the camera filter, the breadcrumbs and the
  last-blood marker. The same pattern killed Gamer IRL.
- **Mega-apps:** onX Hunt (Nav #1, 274K), HuntWise (#4), HuntStand (Sports #10), Spartan Forge (#14),
  BaseMap (#24) and GOHUNT (#29). I couldn't confirm whether they have blood-cam features: the
  apps.apple.com pages returned empty when fetched in a batch.
- **Track N Trail already competes with them:** it bundles parcel and landowner data across all 50
  states, the paid core of onX. A bare blood cam would sell against an incumbent that offers more for
  the same $30.

### 2. Does the camera filter work? (A reviews + physics)
Leader reviews (all 10 visible):
- 1★: "Way too many false blood detections (wet leaves, berries, mud), you've gotta be right on top of
  blood", and the map pins are inaccurate.
- 2★: "it also picked up the red on the leaves. And anywhere else."
- 4★ and 5★ reviews have the same caveat: "bright leaves also glow some", "Anything with red hues it
  could cause a problem."

Physics:
- A phone camera sees only RGB. The detector is essentially a hue/saturation threshold.
- Deer season coincides with red maple, sumac and dogwood leaves and berries, which overlap blood's hue.
- Dried blood darkens toward brown/black and drops out of a red threshold.
- At night (common for recoveries) sensor noise destroys chroma. The leader is preparing a **$49.99
  companion white-LED light rig** ("coming soon", trackntrailapp.com), which admits that the camera
  alone isn't enough.

Hardware already serves this job (C, from memory): Primos Bloodhunter, Wicked Lights blood lights and
Gerber/Streamlight blood-tracking lights at $30–80, with no subscription.

Where it genuinely helps: colour-blind hunters (about 8% of men), as a 2★ reviewer notes. That's a
segment, not a moat.

### 3. Durability and seasonality (A, Wayback snapshots of the App Store page)

| Snapshot | Ratings |
|---|---|
| 2025-06-19 | 6 |
| 2025-08-21 | 22 |
| 2025-11-27 | **1.4K** |
| 2026-02-22 | 2.0K |
| 2026-08-18 | 2.2K (Navigation #7 free chart) |
| 2026-10-04 | 2.4K (#56 free) |

- **About 1.4K of the 2.4K ratings came in one 3-month window (Sep–Nov 2025).** Only about 200 came
  in Feb–Aug 2026.
- Reviews say outright: "You can even wait to buy it until you have a time to use it". It's an
  emergency purchase that churns after the season.
- The October Navigation #11 grossing slot is largely renewals of last autumn's annual cohort plus the
  rut spike. Expect near-zero revenue from about February to August.
- Price rose $29.99 → $49.99/yr and "patent-pending" is in the listing (A). If the patent is granted, a
  clone takes on legal risk.

### 4. Founder fit
- The founder is a non-hunter. Building it means filming real blood trails in a 10–12 week window
  each year.
- The leader spreads by hunting word of mouth ("I've shared this app at least 100x"), Facebook groups
  and hunting pods.
- Not verified this session (C): TikTok/IG age-restrict or remove graphic animal-blood content, so the
  "app finds blood" clip is exactly the kind they suppress.
- **Kill reasons:** single winner, two failed followers, the wedge is already shipped, revenue is
  about 3 months a year, and founder fit is poor.

---

## B. Pilot knowledge-test / AI mock-checkride prep: **KILLED**

### 1. Competitor list (A)
Scans:
- `rtc/pilot.txt` (checkride, oral exam prep, pilot acs, pilot written test, ai flight instructor,
  private pilot, instrument rating, cfi, faa knowledge test): 69 matches, **2026: 25**, 2025: 6.
- Earlier `scans_edu/pilot.txt` (iTunes): 121 matches, 2026: 21.

Incumbents:
- Sporty's 11.0K (4.89, updated 2026-10)
- King Ground School 10.5K and King Test Prep 2.3K
- Aeroapps 1.5K
- Boldmethod 978
- Prepware (3.89 and 2.58★)
- Dauntless ($69.99, stale since 2018–21)
- Pilot Institute App (2025, 21)
- Sheppard Air (the de-facto web standard; FlyCowboys' reviewers call FlyCowboys a "Sheppard Air
  knock-off")

**AI and new entrants since 2025 (≥11):** Comms: AI Pilot Training 281, ATC One AI radio 49, AI CFI
31, PocketDPE checkride oral 12, Private Pilot Handbook 12, FlightSense 8, FlytWERX 8, Checkride
Compass 7, ACE AI Flight Training 5, WingJockey 5, Aviation Test Prep 4.
- **None is on a chart except FlyCowboys.** The AI-examiner wedge is already being cloned and isn't
  working for followers.

### 2. The leader's own reviews show the liability (A)
FlyCowboys' 10 visible reviews: 3×1★, 2×2★.
- "Blatantly wrong answers" (a PAPI question with the wrong answer, the glideslope called the
  "horizontal needle").
- "the longest answer is … 80% the right answer"
- "$30/month … not worth it"
- "Sheppard Air knock-off that is much more expensive"

A burst of five reviews on Sep 24–30 suggests a review push. Its chart slot (Education #94 with 101
ratings) points to paid acquisition at high ARPU, not organic pull (B).

A non-pilot generating questions with an LLM reproduces exactly the failure that earns 1★. Wrong
aviation answers are a safety and reputation problem in a small, tight-knit community of CFIs.

### 3. Market size (C, memory; FAA page 403)
- About 60–80K student pilot certificates and about 25–35K new private certificates a year in the US.
- 164K PPL holders in 2022 (Wikipedia, A).
- Only a fraction take the private knowledge test each year, so the total paying pool is small and
  already served by Sporty's, King, Sheppard and Gleim through flight schools.
- The audience is ASO- and school-driven. It's not a short-form video audience for a Gen Z gamer.

---

## C. Clear-aligner wear timer: **KILLED (clone flood)**

Scan `rtc/aligner.txt` (invisalign, aligner timer, clear aligner, retainer tracker, aligner tracker,
invisalign timer, aligner, retainer): 43 matches. **2026: 24 launches, 2025: 7.** That is over the
rubric's ~25 flood line for this keyword set alone.

2026 entrants include Smilo ×2, OutTime, BraceTime, 22 Hours, Aligner Timer: Tray Tracker, Teether,
Simple Aligner Timer, TraySwitch, TrayZen, Align, SmileDiary, SmileTrack, TrayHabit, Retainly, Aliner,
Alignly, Aligner Wear Timer, Tray With Me, TooToo, TrayJourney and others. All have 43 ratings or fewer.

Incumbents:
- Free first-party apps from the aligner companies: **My Invisalign 63.8K (4.77)**, SmileSet 21.2K,
  Candid ProMonitoring 3.7K.
- TrayMinder 5.2K (4.75), still updated and recently praised ("better than the official Invisalign
  tracker").

Revenue reality:
- Medical #100 grossing is the bottom of a small category, about $3–10K/mo (C).
- TrayMinder's model is mostly $1.99-style IAP plus ads and a recent move to subscription (A, reviews
  and page).

The 1–2★ ad complaints are real but don't open a business. Twenty clones are already pitching "no
ads".

---

## D. Snoring / teeth-grinding recorder: **KILLED (clone flood + strong incumbent)**

Scan `rtc/snore.txt` (snore, snoring, snore recorder, teeth grinding, bruxism, sleep talk recorder,
sleep recorder, snoring app): 50 matches, **2026: 25**. Snore-only names via `ids.py`:
- Snore Watch, Snore Track Pro, SnoreLog, Snorelytics, Snore IQ, Snorah, Snoria, SnoreLens, Snory,
  SnoreScout, Snorely, Snore Recorder Pro, SnoreCheck and others: about 18 in 2026, all ≤45 ratings.
- Bruxism apps (Bruxa, myBrux, JawSense, JawBuddy, Masseter, Tolpie, VibeBrux): about 7 in
  2025–26, all ≤10 ratings.
- Sleep-talk apps: 6 in 2026.

Incumbents:
- **SnoreLab is Medical #4, with 57K ratings at 4.71 since 2012.** Its 10 visible reviews are 8×5★ and
  2×4★, so it is loved, not hated. The "$10/mo" complaint is marginal.
- The free sleep-tracker giants record snoring too: ShutEye 350K, SleepWatch 328K, Sleep Cycle, Pillow.

AutoSnore is no newcomer signal: it's from Tantsissa (AutoSleep, 62K) and sold to an existing fan base
("I will basically buy any app this team releases day one"). Even it gets 1★ reviews for reliability:
- "Says it's recording … when you open the app it says it's not recording"
- It mislabels speech as snoring.

Tech:
- Overnight recording works on iOS with the audio background mode and an active AVAudioSession
  record. The user must start it.
- Calls, Siri, alarms and other audio apps interrupt it, and resume handling is fiddly.
- Accurate snore vs. speech vs. noise classification needs an on-device sound classifier. That's
  doable (SoundAnalysis), but it's where the incumbents already fail.
- Medical-claim risk: an "apnea" mention triggers medical-device scrutiny. SnoreLab avoids it carefully.

---

## Month-3 / month-12 revenue estimates
No survivors, so no projections. For reference only, if built anyway (C):
- **A (blood cam):** month 3 about $0.3–2K if launched in season, month 12 about $0–500 (off-season).
- **B (pilot):** month 3 about $0–1K organic, month 12 about $0.5–3K. Paid ads at $30/mo could move it,
  but content-accuracy liability remains.
- **C (aligner):** under $300/mo.
- **D (snore):** under $500/mo.

## Rejected-angle notes
- **Colour-blind hunter blood cam:** a real segment, but the same seasonality and the same clones.
  Not enough on its own.
- **Bruxism-specific recorder:** 7 tiny entrants and no app with grossing proof.
