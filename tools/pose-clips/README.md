# Pose clips: checking the camera counters on real videos

Joints from real YouTube clips (MediaPipe, 15 fps), in the fixtures' format
(`src/lib/wake/fixtures/*.json`). The full sets (44 pull-up clips; 31 squat clips from before squats were removed) are kept outside
the repo; the passing subset is in the fixtures and runs in `npm test`.

    # every clip, want vs got:
    node --experimental-strip-types tools/pose-clips/evalclips.ts <clips.json> pullups|bench
    # one clip, frame by frame (state, depth, the reader's numbers):
    node --experimental-strip-types tools/pose-clips/trace.ts <clips.json> pullups <clip id> [fromMs] [toMs]
    # rebuild a fixture from the clips that pass as shot, at half the frame rate and mirrored:
    PRIO=<ids to keep first> node --experimental-strip-types tools/pose-clips/pick.ts <clips.json> pullups <out.json> <max KB> [id=reps relabels]

How the clips were made is in docs/PUSHUP_TESTS.md ("Rerun"). Notes: docs/PULLUP_TESTS.md.
