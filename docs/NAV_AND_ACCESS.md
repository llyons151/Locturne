# List page buttons and asking for Screen Time again (2026-10-13)

Built 2026-10-13: the list page has only Back, and every action that needs access asks again in
place through `askAccessAgain` (`src/lib/ask-access.ts`). That covers Add website, Sleep now's hold
button and its Pick apps, a running nap with access off, Usage, and Home's status button. Once access
is back, `restoreBlocks` puts the shields back up and, for a paid user, re-arms tonight's windows,
which iOS stops on a revoke. The Apps tab's repair row uses it too. Refused again: one alert with Open
Settings.

## 1. The list page has a Back and a Close that do the same thing

**What happens now.** Tapping a bedtime list, the always list or a daily limit on the Apps tab *pushes*
`app/list.tsx` (`openList` in `src/features/apps/apps-list.tsx`). The page draws a round chevron.left and
a round xmark (`Page` in `src/features/apps/list-page.tsx`). Back calls `router.back()`. Close calls
`router.dismissTo('/apps')`. The page is only one step deep, so both go to the same place. The pair was
copied from stoic.'s header on 2026-10-10.

**What Apple says** (HIG, Toolbars):

> Use the standard Back and Close buttons. People know that the standard Back button lets them retrace
> their steps through a hierarchy of information, and the standard Close button closes a modal view.

HIG, Modality: if a modal holds a hierarchy of views, "provide a single path through the hierarchy and
avoid including buttons that people might mistake for the button that dismisses the modal view."

So each button has its own job:

| How the page arrived | Button | Where |
| --- | --- | --- |
| Pushed (it slid in from the right) | Back chevron only, plus edge-swipe back | leading |
| Modal (it slid up) | Close (xmark), or Cancel / Done when there are edits to keep or throw away | trailing |
| Modal with pages pushed inside it | Back on the inner pages **and** Close to leave the whole modal | leading + trailing |

The last row is the only case where both appear together, and there they do different things. That is
almost certainly why stoic. has both. Our list page is the first row, so it should have only Back.

**Recommendation.** Keep the page pushed and remove the xmark. Leave the round glass chevron at the
leading edge. Swipe-back already works because it's a native stack push. Nothing else on the page
changes. It saves edits as they happen, so it needs no Cancel/Done.

**Alternative (not recommended).** Make the page a sheet and keep only the xmark. A list's page is
drill-down content (every app in the list, its time), not a separate task, so a push fits it better.

## 2. When Screen Time access is off, ask again instead of explaining

**What happens now.** Several places explain the problem instead of asking for access:

- `src/features/websites/websites-card.tsx:29`: refuses to add a website ("Turn it back on from the
  Apps tab, then add them").
- `src/features/nap/nap-screen.tsx:276`: Sleep now says "Turn Screen Time access back on from the Apps
  tab."
- `src/features/usage/usage-screen.tsx:41`: "Open Settings from the You tab to restore it."
- The Apps tab already does it right: "Turn Screen Time access back on" calls `askAccess`
  (`src/features/apps/list-actions.tsx:189`), which asks again and puts the blocks back.

**Can iOS ask again?** Yes, for `.individual`. Unlike camera or location, FamilyControls isn't a one-time
prompt. Developers report that `requestAuthorization(for: .individual)` shows the sheet again after
"Don't Allow" and after a revoke in Settings ([Apple forums 747915](https://developer.apple.com/forums/thread/747915)).
That thread also reports that `authorizationStatus` can be stale (it can still say `.approved` after a
revoke, or stay `.notDetermined` after "Don't Allow"). The safest check is to ask, rather than read the
status and guess.

**Recommendation.** Any action that needs Screen Time (adding apps, adding a website, Sleep now, adding a
limit, Usage) calls the same `askAccess` first. If access comes back, the action continues: the picker
opens, or the block starts. Only if the request fails (the person taps Don't Allow again, or iOS throws,
for example error 7 when there's no passcode) does it show one line with an Open Settings button.
Nobody gets sent to a different tab.

To check on device: deny on first launch, then revoke in Settings › Screen Time › Apps with Screen Time
Access. In both cases, tap each gated action and confirm the sheet appears and the action continues.
