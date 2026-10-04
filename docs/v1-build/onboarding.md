# v1 build: onboarding made real

October 3, 2026. The onboarding in `src/features/onboarding/` was a preview with simulated
prompts and fake app chips. This pass wires it to the real APIs, adds the wake-up method
question, and puts a purchases interface in front of the paywall. GAME_PLAN stays the
source of truth; this file records what changed, what's still a stub, and what needs a
decision.

## What changed

| Area | Before | Now |
|---|---|---|
| Screen Time | A "Preview" card stood in for Apple's prompt | `requestAccess()` on iOS. If someone taps Don't Allow or cancels the passcode, a plain screen says nothing can sleep without it, mentions a parent-managed iPhone, and offers Try again and Open Settings. Onboarding can't continue past it without access, so nobody pays for a lock that can't work. |
| App picker | Stand-in sheet with named chips | Apple's `FamilyActivityPicker` (`ScreenTimePicker`) writing the `night` list, with header and footer text. The picks are drawn natively by `BlockedAppsView` (`Label(token)`) inside the same card. If a night is already armed (onboarding run again), the picker edits a draft, so removals wait for bedtime (`beginListEdit`/`finishListEdit`). The stand-in sheet remains for the web preview only. |
| App names in copy | `commit`, the `offer` timeline and the paywall checklist named apps ("TikTok and 2 more") | "Your apps" everywhere. The schedule card shows "Your apps" and "N picks asleep at bedtime" on iOS. The "Put N to sleep" drop animation runs in the web preview only, because native rows can't fly into the moon. On iOS the page just moves on. |
| Wake-up method | None, everything said 200 steps | New step `method` after `wake`: "Are there stairs between your bed and your coffee?" Yes picks downstairs, no picks steps, and "Other ways to wake them" shows Scan. Loc gives a one-line reaction, then Continue. Everything after it is method-aware (`METHOD_COPY` in `content.ts`): the schedule card, `commit`, the paywall checklist, the `offer` timeline and `first-morning`. |
| Saving | Nothing was saved | `saveSetup` → `saveRoutine` (bedtime, wake as morning start, method, every night on, 200 steps). It's called once, when the setup is final: on purchase, or when leaving from `commit` onward (the declined path). Also saves the "How'd you find me?" answer (`locturne.attribution`) and the trial-reminder toggle (`locturne.trialReminder`) for the analytics and notifications work. |
| Purchases | `PRICES` constants, "Preview: nothing is charged" | `src/lib/purchases.ts` (see "Stubs"). Every price and trial string on `offer`, `plans` and `declined` comes from `getOffers()`: localized `priceString`, `trialDays` only when eligible, per-month and "Save N%" computed from the offer, and the reminder day as the trial length minus 2. If prices haven't loaded or can't, the page says so with Try again, and never shows a made-up price. |
| Exit offer | `?exit=` arm, shown once per session | The arm comes from the offers (remote config later), and `?exit=` still overrides it for review. It's marked shown in the App Group (`locturne.exitOfferShown`) the first time it appears, so running onboarding again can't farm it. |
| Restore | Simulated | Real `restore()`, on the first screen and in the paywall fine print. From the paywall it arms at once. From the first screen it goes to setup (bedtime onward), and `commit` then skips the paywall and arms. |
| Arming | "Armed" always showed | `armTonight()` in `src/features/onboarding/arm.ts`. It runs only after a purchase or restore. While iOS is answering the screen reads "Setting tonight.", and "Armed" appears only once iOS reports every night window as monitored. If onboarding ends after bedtime, the night apps go to sleep straight away. Failures are named plainly, each with one fix: no access, no apps, a night under 15 minutes, or iOS refused. |
| Motion & Fitness | Not asked (the pre-paywall test was removed) | Asked on `armed`, after purchase, with a method-specific reason (stairs and steps both use it). If it's denied, `first-morning` says so and offers Open Settings. |
| Notifications | Simulated on `armed` | Not asked in onboarding (the first-night work owns it). `armed` no longer promises a reminder. |
| Last screen | "Tomorrow, 7:00 AM." plus steps rows, then "Finish preview" | "Tomorrow 7:00. Your apps stay asleep until you're up." (TODO §4), the method's own rows, the pass row and a Done button. |
| Smaller copy | | `wake`'s subtitle no longer says "Steps start counting". The picker header says "wake once you're up" rather than "after your walk". The trial timeline gains a "Morning" row on normal-height phones (TODO §4, morning-first timeline); short phones keep three rows so nothing scrolls. |
| Terms / Privacy | Simulated | Open `LEGAL_URLS` in `src/lib/links.ts`. **These are placeholders** (`https://locturne.app/terms`, `/privacy`) and need live pages before review. |

Files: `onboarding-flow.tsx` (all calls to iOS and the store), `steps.tsx`, `content.ts`,
`schedule-card.tsx`, `screens/paywall.tsx`, new `arm.ts`, `setup.ts` and `motion.ts`, plus
`src/components/app-picker.tsx` (a `live` mode for `AppsCard`), `screen-time-picker.tsx`
(header and footer), and `src/lib/purchases.ts` with tests.

The web preview still works. Off iOS, Screen Time and Motion keep their "Preview" stand-ins,
arming reports `preview`, and the store is the dev stub. The preview was driven headless at
390×844 and 375×667: method, ready, commit, offer, plans → buy → armed → first morning,
both exit-offer arms and Restore all render.

## Stubs

- *Replaced 2026-10-03: RevenueCat is in ([purchases.md](purchases.md)); the stub below now
  runs only without a key, in Expo Go and on the web. Product IDs changed to
  `locturne.annual`, `locturne.monthly`, `locturne.annual.halfprice`, `locturne.annual.longtrial`.*
  **`src/lib/purchases.ts` uses `createDevPurchases()`, which charges nothing.** Purchases
  always succeed, are remembered in memory and found by Restore. `isStubbed()` adds
  "Preview: nothing is charged." to the fine print. Its catalog (`DEV_CATALOG`) holds the
  decided prices. To go live, write a RevenueCat `PurchasesProvider` (offerings → `Offers`,
  intro-offer eligibility → `trialDays`, offering metadata or an experiment → `exitArm`,
  `customerInfo.entitlements` → `isEntitled`) and call `setPurchasesProvider` at startup.
  Product ids in the stub: `locturne.annual`, `locturne.monthly`, `locturne.annual.offer`;
  `longer-trial` is the annual product with a 14-day offer.
- **`arm.ts` calls `planNightWindows` + `armNight` directly.** TODO in the file: switch to
  lock-controller's `armRoutine()` once that branch merges.
- **`LEGAL_URLS`**: placeholder URLs.
- **Analytics:** the `found` answer is stored locally, not sent anywhere (no analytics SDK yet).

## Needed outside this folder (not edited here)

1. **`routine.ts`: a way to replace an unarmed setup.** `saveRoutine` treats every save
   after the first as an edit that waits for bedtime. Someone who declined (setup saved,
   nothing armed) and comes back to change their times and buy gets the old times until
   the next bedtime. Suggest `saveRoutine` apply immediately while nothing is armed
   (`getArmedNight() === null`), since the next-bedtime rule only protects a running lock.
2. **The day onboarding finishes reads as `morning` in `lock-state.ts`** (past morning
   start, no proof) until bedtime. Nothing is shielded because the night isn't held, but
   home or the shield could say "walk to wake them" on day 0. Suggest lock-controller
   treat mornings before the first armed night as `day`.
3. **`app.json` motion permission string** says it's only for steps. Downstairs reads the
   barometer behind the same permission, so the purpose string should say "count your
   steps and notice stairs" (needs a rebuild).
4. **`modules/blocked-apps`: an icon-only style** (`labelStyle(.iconOnly)`), so the
   schedule card and paywall can show the real icons in a row instead of a count.
5. **Startup check for pending purchases:** after an Ask to Buy approval, the app should
   see `isEntitled()` and arm. Today that only happens through Restore or onboarding.
   *Done: `useAppStart` arms at launch, and `onEntitled` arms when an approval lands while
   the app runs ([purchases.md](purchases.md)).*
6. **Entry routing:** whoever owns `_layout`/home should open onboarding when
   `hasRoutine()` is false, and offer the paywall again (no exit offer) to someone with a
   saved routine and no entitlement.

## Audit against GAME_PLAN, TODO §4, ONBOARDING_CONVERSION and ONBOARDING_QA

### Built (decided, low risk)

- Real FamilyControls prompt, Apple's picker, honest deny handling (TODO §4).
- Copy that names picked apps rewritten (TODO §4, Sept 26 review item 3).
- "Armed" only once iOS confirms; plain failure otherwise (TODO §4, GAME_PLAN Step 4).
- Store prices and eligibility drive every trial string; Restore; exit offer remembered (TODO §4).
- Declined path: setup saved, nothing armed, one follow-up offer at most (TODO §4).
- Motion & Fitness after purchase (TODO §4; APPLIED A4).
- The `method` question with downstairs as the hero (GAME_PLAN, "Wake-up methods").
- End on tomorrow morning (TODO §4).
- Morning row in the trial timeline (TODO §4 "Morning-first paywall timeline", the timeline half).
- No notification prompt in onboarding (now asked after the first night).

### Recommended, not built (ideas or design work)

| Item | Recommendation |
|---|---|
| Pre-question copy still says 200 steps: `deal` ("200 steps… They wake up") and every `TRIED_ECHO` body ("Mine end after 200 steps") | Rewrite these method-neutral ("until you're up") or lead with downstairs, since it's now the hero. It's Loc's voice in the hook, so it's your call; suggested: deal beat label "Up" / "They stay asleep until you're out of bed. Stairs, steps, your call." |
| `tomorrow` demo animates 200 steps | Make a downstairs version (a stairs height meter replacing the step count) once the real downstairs screen exists, so the demo matches the hero. Design work, not copy. |
| "Put N to sleep" drop animation on iOS | Needs native icons from tokens (item 4 above) before it can run on real picks. |
| Morning-first paywall headline (TODO §4) | Copy decision. The timeline already leads into the morning. |
| Always-blocked list in onboarding | Leave it out (APPLIED O4: added choice failed in every Opal test). Offer it in week 1. |
| Live 20-step walk before the paywall (TODO §4) | It was removed once as friction (Sept 25). Downstairs makes a pre-paywall demo even harder from bed. Keep it out unless funnel data says the aha is missing. |
| "What do you need before you're up?" step, if-then plan screen (TODO §4 *ideas*) | Not built; ideas. |
| Social proof near the paywall | Only once real TestFlight quotes exist (APPLIED O3). |
| Reminder-day picker on `plans` (APPLIED T3) | Low priority test; the toggle text now follows the trial length. |

### Needs your decision

1. **Terms and Privacy pages:** where they live (Cloudflare Pages per your hosting
   default) and whether Terms is Apple's standard EULA. Placeholders are in `LEGAL_URLS`.
2. **Teens:** under-18s on a parent-managed iPhone can't authorize Screen Time themselves.
   The refusal screen mentions it; a real parent path (`child` authorization) or an 18+
   stance is open (APPLIED open question 7).
3. **Scan in onboarding:** picking Scan leaves no code set up on night one, so the first
   morning falls back to 200 steps (the copy says so). Keep Scan behind the link, or hide it
   until the Scan setup screen exists?
4. **Should the stairs question pre-select downstairs?** It doesn't today (it's a question,
   per GAME_PLAN). Pre-selecting would nudge more people to the hero method.
5. **The exit-offer arm source:** RevenueCat offering metadata vs a separate remote-config
   SDK (APPLIED P6). The interface takes either. *Settled 2026-10-03: a random arm per
   install, sent as the `exit_arm` attribute, with offering metadata as an override
   ([purchases.md](purchases.md)).*

## On-device test checklist

Run on a dev build with Family Controls (Development) and a sandbox Apple ID.

- [ ] Fresh install: `hello` → … → `wake` → stairs question. Yes, No and "Other ways" all
  select, Loc's line changes, Continue is disabled until one is picked.
- [ ] `screen-time` → Continue shows Apple's prompt, then Face ID or the passcode. Approve → `apps`.
- [ ] Deny (or cancel the passcode): the refusal screen appears. Try again re-prompts. Open Settings opens Locturne's settings.
- [ ] `apps` → Add apps opens Apple's picker with the header and footer text. Pick 3 apps
  and a category, Done: the card shows "4 PICKS" and native rows with icons and names.
  More than 6 picks (4 on an SE) fold into "+N more".
- [ ] Cancel the picker without changes: the card is unchanged. Reopen works after a picker crash.
- [ ] `ready` shows the method's label and glyph, "Your apps" and the pick count. Change apps works and returns.
- [ ] No screen names an app anywhere (commit, offer, plans).
- [ ] `offer` and `plans` show StoreKit prices (once RevenueCat is in) and the right trial
  length. A sandbox Apple ID that already used the trial sees no trial strings and gets no
  `longer-trial` exit offer.
- [ ] Close the paywall: one exit offer, once. Close again: exits. Reopen onboarding: no exit offer.
- [ ] After exiting unpaid: nothing is shielded at bedtime (Screen Time lab shows no night
  windows), and the routine is saved.
- [ ] Buy (sandbox): "Setting tonight." then "Armed. See you at …". The Screen Time lab shows the night windows.
- [ ] Buy after bedtime: "Armed. Starting now." and the night apps are shielded at once.
- [ ] Turn off Screen Time access, then buy: "Tonight isn't set" with "Allow and try again".
- [ ] `armed` → Continue shows the Motion & Fitness prompt. Deny: `first-morning` shows the
  Motion row and Open Settings.
- [ ] `first-morning` reads "Tomorrow 7:00. Your apps stay asleep until you're up." with the method's rows. Done closes onboarding.
- [ ] Restore on `hello` with a sandbox subscriber: "You're subscribed" → setup → `commit` arms without a paywall.
- [ ] Restore with no subscription: "Nothing to restore".
- [ ] Ask to Buy (sandbox): "Waiting for approval", nothing armed.
- [ ] Terms and Privacy open (once the pages exist).
- [ ] Run onboarding again with a night armed: removing apps in the picker waits for bedtime (Apps tab shows the pending note).
- [ ] VoiceOver: the method options read as radio buttons, the picked rows are read, the busy purchase button reads as busy.
