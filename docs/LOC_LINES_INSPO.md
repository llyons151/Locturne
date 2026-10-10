# Loc's lines on Home: Mobbin references

2026-10-10. Research only. Question: should Loc say funny lines on Home, and where should they appear?
Recommendation (from chat): yes, in a short-lived speech bubble just above his head that reacts to things
(a poke, the angry pop-up, arriving, a state change). Never a constant ticker. The lines follow docs/VOICE.md.

## Bubble attached to the character (the model)

- **Duolingo, first lesson** ([Mobbin](https://mobbin.com/screens/b8a54efb-c06d-4818-b56e-968b2309c88b)): a small
  rounded bubble right above the owl, with its tail pointing down at him. One short line. The closest match.
- **Yazio** ([Mobbin](https://mobbin.com/screens/528d7ee1-600a-4132-a9a4-ee364eb20b76)): a big bold line in a grey
  bubble above the mascot, with the tail off to one side, timed with an arms-up pose. Line and pose land together.
- **Deepstash** ([Mobbin](https://mobbin.com/screens/6ed825a4-4da3-4d0f-883c-26baf77cd929)): a wide bubble over the
  character with a centred tail. Works for longer lines, but too wordy for Loc.
- **Me+ streak** ([Mobbin](https://mobbin.com/screens/59717fd3-8d48-4592-b977-8ae0f18cbe69)): a bubble above a pet
  standing in a scene, with the screen's real content below. The same layering as Home: moon scene, Loc, then the
  cards.
- **Shopee** ([Mobbin](https://mobbin.com/screens/2fefb9e6-f357-418c-a01b-4e85d79a0ef9)): a bubble *under* the
  mascot, with the tail pointing up. The fallback if a bubble above him would cover the moon panel's content.

## Mascot living on the home screen

- **Finch home** ([Mobbin](https://mobbin.com/screens/b5d29fad-9c88-43e0-9aa0-05b7602ab48d)): the pet lives in a
  scene above the task cards. Its "voice" shows up as a small reply row inside a card ("Almost there, Alex!") and as
  status toasts at the bottom ("Lee is too sleepy to go outside",
  [Mobbin](https://mobbin.com/screens/13fb91ce-f788-46da-acf9-4974218dee0b)). Little floating icons above its head
  (a "?", hearts) act as wordless reactions
  ([Mobbin](https://mobbin.com/screens/04a24fa6-1ca2-46dc-b772-69dc16190191)).
- **Me+ Today** ([Mobbin](https://mobbin.com/screens/41b9d871-bc97-4bb6-a9d4-0efdbb3efcb3)): the mascot peeks over
  the top edge of a card. Loc already peeks over the moon panel's edge.
- **Tolan** ([Mobbin](https://mobbin.com/screens/fef8f596-cf97-475f-bb17-d3ca5fb435f7)): blob-shaped bubbles near
  the character's feet with little tails. Playful shapes, but conversational. A chat UI is the wrong model for Loc.

## Takeaways for Loc

1. A bubble directly above him, with a short tail pointing at his head (Duolingo, Yazio). One line, under 8 words.
2. Pair each line with a pose or expression from the rig: the glare with "Rude." is the joke (Yazio's pose plus line).
3. Finch's wordless "?" and hearts are worth stealing: a tiny "z" or "?" over Loc between lines keeps him alive
   without words.
4. Status-type messages ("apps asleep at 11") stay in the hero card, as Finch keeps its toasts separate from the pet.
5. Dark Home: a white bubble with black text matches his white eyes and the white pill buttons. No tint, no glow.

## Built (2026-10-10, "build it like duolingo")

- `src/features/home/loc-bubble.tsx`: a white rounded bubble with black text and a tail pointing
  down at his head. It pops up from the tail with a slight overshoot (260 ms). A tap dismisses it,
  and it fades after 3.2 s.
- `src/features/home/loc-lines.ts`: line pools by cue, mood and tone (Mild / Grumpy / Unbearable).
  Each pool is a shuffled bag, so no line repeats until the whole pool has been said.
- Cues come from the rig (`LocRig.onCue`, through `loc-stage.tsx`):
  - `poke`: at the double take.
  - `angry`: when he pops back up from the burrow.
  - `hello`: after he arrives on Home, at most once per visit and 1 time in 3.
  - `hide`: when he dives under or leaves; this clears the bubble.
- VoiceOver announces each line.
- Not checked yet: the native action from the DOM webview on a real iPhone. It's only been
  verified on web.
