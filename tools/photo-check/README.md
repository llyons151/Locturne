# Photo check

The photo wake-ups are judged by Apple's Vision, and Vision only runs on Apple hardware, so their rules are
tuned on a Mac against real photos:

- **Pet your pet** (`src/lib/wake/pet.ts`): `pet-photos.txt` lists photos (Wikimedia Commons) and what each
  should be (`pass`, `fail`, `any`), each looked at by eye.
- **Make your bed** (`src/lib/wake/bed.ts`): `bed-photos.txt` lists made and unmade beds; `bed-pairs.txt` pairs a
  setup photo (the made bed) with a morning photo and says what it should be. `retake.py` makes `<name>-retake`,
  the setup photo as if shot again the next morning (turned, moved, darker).

1. The **Photo check** workflow (`.github/workflows/photo-check.yml`) downloads them, compiles the app's own
   `modules/photo-check/ios/PhotoMeasure.swift`, `PetReading.swift` and `BedReading.swift` with `main.swift`,
   and saves what Vision saw as the `photo-readings` artifact. Run it from the Actions tab, or push to the
   `pet-check` branch.
2. `gh run download <run id> -n photo-readings -D /tmp/photos`, then
   `node tools/photo-check/judge.ts pet /tmp/photos/pet-readings.json` (or `bed …/bed-readings.json`) prints each
   verdict next to what it should be, with the numbers behind it. Tune `PET_RULES` / `BED_RULES` until it's right.
3. Copy the readings into `src/lib/wake/fixtures/{pet,bed}-readings.json`: `src/lib/wake/photo-readings.test.ts`
   replays them, so a rule change is checked against the real photos (2026-11-23: pet 39/47, bed 30/30;
   the pet misses are named in the test).

Your own photos are the best test (your bed made, unmade, you in it). Drop them in a folder and run on a Mac:
`swiftc -O modules/photo-check/ios/{PhotoMeasure,PetReading,BedReading}.swift tools/photo-check/main.swift -o /tmp/photo-check`,
then `/tmp/photo-check bed <folder> <pairs file> > bed.json`. On the phone, a pretend morning (Wake preview) logs
each miss's numbers to the console.
