# Push-up counting: how it was tested (2026-10-10)

Camera push-ups (`src/lib/wake/pushups.ts`, `modules/pose-camera`) were tested before any
iPhone build, because builds are scarce. Nothing here has run on Apple Vision yet; the rules
were tested on Google's MediaPipe pose model, which reports the same joints. Vision is usually
as good or better, but the first device build still needs the checks at the bottom.

## Real clips

19 YouTube clips, framed side-on like the app asks, run frame by frame (15 fps) through
MediaPipe's pose model in headless Chromium. Counts were checked by eye from contact sheets.

- **Real push-ups (9 clips):** normal, deep, quick, wide, slow, kneeling into position first,
  a portrait-shot clip.
- **Cheats and look-alikes (9 clips):** standing curls (3), seated curls (2), bodyweight squats,
  a dumbbell floor press lying on the back (the from-bed cheat), a plank hold, scapular
  push-ups (arms straight the whole time).
- **Facing the camera (1 clip):** not counted, by design. Loc asks for side-on.

Each clip was run five ways: as shot, darkened to 25%, darkened to 12% (near black), small in
a tall portrait frame (as the phone sees you from two steps away), and portrait plus dark.

**Result: 91 of 95 runs right, and no fake reps from any cheat clip in any light.**

| Miss | What happens | Why it's acceptable |
| --- | --- | --- |
| 2 clips at 12% light count 0 | The model can't find the body; Loc says "Lights on. Two steps back…" | Fails safe: no false count, and the fix is on screen |
| 1 clip shrunk to a tiny figure counts 2 of 3 (normal and dark) | Joints too coarse at ~120 px wide | Further away than the app's framing |

Stress versions of the as-shot and 25%-dark runs (38 runs each): 10 and 7.5 and 5 fps,
joint jitter of 2% and 4% of the torso, 20% and 40% of frames dropped, mirrored (facing the
other way), sped up 1.5×, and low confidence. **378 of 380 right.** The two misses are one clip
(a dark one-arm plank hold, tiny in frame) giving one extra rep at 7.5 fps and at 1.5× speed.
That person is genuinely on the floor in a plank, so it isn't a way to cheat from bed.

## What the testing changed

The first version passed the made-up tests and failed on real people:

- **Deep reps rejected.** Some people's elbows read only 100–112° at the bottom of a full rep
  (camera angle, hand position). The bottom was 100°; it's now 115°. Straight is 140°, not
  150°, for people who never quite lock out.
- **Phantom reps in the dark.** In dim light the model's elbow jumps (13° one frame, 179° the
  next) while the body is still. A rep now also needs the shoulders to drop at least 0.4 of
  the torso's length below the top. Real reps drop 0.51 or more; dark-room jitter at most
  0.31.
- **Folded arms in the dark.** The model sometimes shrinks the arm to a tenth of its length.
  The drop is measured against the torso, which stays steady, and frames with an impossible
  arm-to-torso ratio (under 0.4 or over 3) are skipped.
- **One-frame spikes.** A rep needs two frames at the bottom. The shoulder baseline only
  resets after a counted rep, and is forgotten after 2 s, so neither a spike nor an old reading
  can stand in for the top.
- **Smoothing removed.** Smoothing and a median of three both lagged behind quick reps and lost
  more real reps than they saved.

Ten of the clips (joints only, no video) are regression tests in
`src/lib/wake/fixtures/pushup-clips.json`, each run as shot, at half the frame rate and
mirrored (`npm test`).

## The app, end to end, in the browser

The web preview runs the same rules on MediaPipe. With a push-up video fed to Chromium as a
fake webcam, the real screen (camera → model → rules → count, Loc's lines, the finish) reached
10 of 10 and "Test passed" in about 11 s. A seated-curl video as the webcam never counted, and
Loc said "On the floor. I don't count standing." Also checked there: camera denied (the setup
page says so and offers Settings and steps), Stop, Start again, Count quietly, the ten-minute
timeout and Start again after it, and Walk instead.

## Previewing every screen (no camera needed)

You → Developer → **Push-up preview** (dev builds and the web preview only) forces each state,
then **Open push-ups** runs it in the wake lab. Nothing reaches the real morning: only the wake
lab passes the preview to the screen.

- **Camera:** the real camera, or a fake body (`scenePose` in `src/lib/wake/pose-demo.ts`): a
  tour of everything, good reps, half reps, too quick, plank hold, standing curls, nobody.
- **Phone:** the real sensor, or pretend flat / on its side / upside down.
- **Setup:** asks first, access off, old build (no camera module), camera fails, model fails.
- **Push-ups:** the routine's, 3, 10 or 25. **Time out in 15 s**, and the tuning numbers.
- **Time of day:** *Fake morning* makes every screen that reads the lock (`useLock`) see a
  morning still to prove, so Home shows "Start push-ups" and the real morning screen runs, with
  the fake bodies above. Finishing shows the real "I'm up" page but records no proof and moves
  no shields, then it reads *Fake morning, done* (day). **Open the morning** does this in one tap.
  For Home's button to say "Start push-ups", the routine's method must be push-ups (Routine tab).

The fake scenes are pinned by tests (each must show the state it claims). In the browser:
`npx expo start`, press w, Exit onboarding, You, scroll to the bottom.

## Bugs fixed along the way

- Going to the background mid-set left the camera open with nothing counting. The session
  now carries on and resumes when the camera comes back.
- If bedtime arrived during the last-rep beat, the finished camera screen stayed up. It now
  closes either way.
- The beat before the apps wake restarted whenever the parent re-rendered.
- Nothing warned that the phone was lying flat or on its side (sideways turns the picture and
  breaks detection). Loc now says "Stand me up" first.
- On browsers without WebGL for MediaPipe, the web preview failed to load the model. It now
  falls back to CPU.
- From a second code review: tapping X during the finish beat threw away a finished set (it
  now counts it); a frame-rate cap in Swift could crash on some camera formats (removed); the
  audio handback could leave music ducked (now retries until it lets go); a camera runtime
  error froze the preview (now restarts once, then offers Try again); the last spoken line got
  cut off; VoiceOver users heard Loc talk over the announcements (he's quiet while VoiceOver is
  on); frames now use the JS clock; a corrupt goal (NaN) falls back to 10.

## Check on the first iPhone build

The wake lab (You → Test push-ups) shows a tuning readout over the camera: the state, the
live elbow angle and the shoulder drop against the thresholds. The thresholds are JS
(`PUSHUPS` in `src/lib/wake/pushups.ts`), so retuning them for Apple Vision needs an update,
not a build.

1. **Orientation:** in Test push-ups, raise one arm; the white dot must follow it. If the
   overlay is rotated or upside down, the camera orientation in `PoseCameraModule.swift`
   (`.leftMirrored`, width/height swap) is wrong.
2. Do 10 real push-ups side-on at two steps, lights on, then lights low.
3. Try the cheats: curls sitting on the bed, arm pumps lying down, waving at the camera.
4. Lay the phone flat, then on its side: Loc should say so.
5. Lock the phone mid-set and come back: the count should be kept.

## Rerun

The scripts live outside the repo. To redo it: download clips with
`yt-dlp --extractor-args "youtube:player_client=android_vr" -f "bv[height<=480][ext=mp4]"`,
extract frames with `ffmpeg -vf fps=15`, run MediaPipe tasks-vision 0.10.21
(`pose_landmarker_lite`, VIDEO mode, CPU) over the frames in a page, and feed the joints to
`addPose`/`tick`. Headless Chrome doesn't redraw frames after a video seek, so use extracted
JPEGs, not `<video>` seeking.
