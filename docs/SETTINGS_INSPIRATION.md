# Settings (You tab) inspiration — Mobbin, 2026-10-09

Current You tab: Screen Time status, Ways out, Steps, How grumpy Loc is,
Notifications, Subscription, Help. Problem it shares with the old Apps tab:
every card looks the same, so nothing comes first.

## Top picks

| App | Link | Steal |
|-----|------|-------|
| Jomo | https://mobbin.com/screens/ecb928b5-6d8c-4677-9604-9ea5242a3525 | Closest category match (screen-time blocker). "Current plan · Annual (Trial) · Trial ends on…" card with Manage, then grouped General rows |
| Orbit | https://mobbin.com/screens/8e57188c-e629-4b34-9aa8-2e7e9ae94622 | Large "Settings" title, one compact plan card, small grouped cards, value on the right (`Off >`). Native, dark, calm |
| Halide Mark III | https://mobbin.com/screens/5ea10830-e17f-4a58-aa6e-2b57c9d2ed2d | Two-line rows (title + one-line description) under a few top-level groups. Premium without decoration |
| FocusFlight | https://mobbin.com/screens/d5ecc88c-7f9b-4dac-91fe-911404106399 | "You're All Set! · Renews on…" status card instead of a plain subscription row |
| (Not Boring) Camera | https://mobbin.com/screens/c814e364-7515-4032-9000-7b414b55f746 | A **Stats** group inside settings (First photo, current/max streak). Locturne version: first night, mornings out of bed, best run |
| Bevel — Tone | https://mobbin.com/screens/140245a4-1b15-4a8f-aed7-dfd0d9ecafd0 | Gentle↔Direct slider that previews sample messages live. Direct model for "How grumpy Loc is" |
| Wispr Flow — Default Sound | https://mobbin.com/screens/83cbf71d-2207-472b-9683-d96d8632d774 | Each tone option shows an example message. Alternative to the slider |
| Oura — Notifications | https://mobbin.com/screens/109f39c7-8a8f-4d04-b2fe-1e6c53efd126 | Each toggle explains itself ("Get notified an hour prior to your bedtime window") |
| Brick — Emergency Unbrick | https://mobbin.com/screens/c4117451-2d10-4feb-b6d8-b59d85aa5b8b | "4 remaining" pill + one button. Model for Passes / Emergency unlock |
| Opal — Settings | https://mobbin.com/screens/b0b5d9a8-23c8-4c23-ae63-334bdaba7099 | Permission row with an inline "Connect" action (Apple Health / Screen Time). Take the row, not the whole layout |

## Also seen (lower fit)

- Hatch Sleep display settings (night-navy, sliders): https://mobbin.com/screens/4efea615-e77f-4860-9d4d-9c17d59d7a3e
- Todoist Pro Plan card + Personalization group: https://mobbin.com/screens/8a5c21a8-e0a1-49c7-a629-edb027c001cd
- Forest profile with stat strip: https://mobbin.com/screens/86386b5e-8520-4911-8fd7-51ed54a0babc
- Headspace bedtime reminders: https://mobbin.com/screens/c14849c2-7002-45e3-9d45-711cb4c48385

## Pattern that fits Locturne

1. Status card first (plan / trial ends / Screen Time on), like Jomo / FocusFlight.
2. A small Stats group (Not Boring Camera) — the never-reset count lives well here.
3. "Loc's tone" with sample lines (Bevel / Wispr), via a native picker or sheet.
4. Remaining groups as plain native grouped rows with descriptions (Halide, Oura).

## Round 2 — 2026-10-10: the page works, it just has no point of view

The 10-09 pattern is already built (plan card, grouped rows, tone menu), so it reads
like every settings screen. What's missing is the *you* in "You", and Loc.

Diagnosis of the current screen:
- The loudest thing on the page is the light-blue Help & Feedback banner. Help should be quiet.
- Two long grey footers (Ways out, General) read as legal text. Cut each to one short line.
- Nothing on the page is about the person or their record. It's controls only.

Ideas, best first:

1. **One big number at the top** — Brink "You've listened for 25 min"
   (https://mobbin.com/screens/cd9a656d-8142-48df-90ed-f38bc7f36c53), Abode stat strip
   (https://mobbin.com/screens/9822c6c1-3fa7-4815-9cc0-da057fba14b2). Locturne: "14 mornings out of bed"
   (never-reset count) + "since Sep 30", tap for a small stats sheet (best run, nights slept, passes used).
   Plan card moves under it.
2. **Give Loc his own page** — CARROT Weather has a whole personality screen: a slider from
   briefcase to bomb with a live description (https://mobbin.com/screens/068a5a5c-dcc3-4319-9f9e-ce455bf3169c)
   and a CARROT tab with achievements (https://mobbin.com/screens/af6d9695-1f27-48ef-9362-3b387f3fad7e).
   Locturne: "Loc" row → page with the silhouette saying a sample line at the chosen grumpiness, then
   the level picker. "How grumpy Loc is" stops being a dropdown nobody understands.
3. **Easter-egg rows** — CARROT's "Self-Destruct" answers with "Oh Meatbag, did you really think you
   could get rid of me that easily?" (https://mobbin.com/screens/01673da2-49b3-4eb6-b69d-c09dbb62da90).
   Locturne: a "Fire Loc" row whose alert is an unhinged Loc line, and a footer like
   "Locturne 1.0 · Loc has not slept since 2019". Free, on-brand, screenshot-able for videos.
4. **App icons** — Bevel special icons (https://mobbin.com/screens/22feee3e-2ecb-4b8c-b7c0-62d6fc9f3b88),
   Me+ mascot icons (https://mobbin.com/screens/66d03e78-5d84-4ef2-bf16-517f100335c1). Loc asleep /
   Loc awake / plain moon; optionally earned at mornings 7, 30, 100 (rewards, not punishments).
5. **"Put Loc on your phone" tiles** — Vocabulary's illustrated 2×2 "Customize the app" grid
   (https://mobbin.com/screens/7ead708d-8087-4e0c-855a-f651612b197b): Widgets, Lock Screen, StandBy,
   App icon. Lands once WIDGETS.md ships; until then just App icon.

Suggested order on the page: big number → plan → Loc → Ways out → Wake-up (steps) → Notifications →
quiet Help/legal group → joke footer.

**Built 2026-10-10:** ideas 1–3. The record number + "since" date (new `getFirstMorning` in
morning-proof.ts), the Loc card (src/features/you/loc-card.tsx: his line in a bubble, native
segmented tone control), Help as a plain row, shorter footers, "Fire Loc" + sign-off
(src/features/you/fire-loc.ts). Not built: app icons (needs icon art + a native alternate-icons
module) and the widget tiles (wait for widgets).
