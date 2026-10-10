# Website blocking (2026-10-10)

User request: "implement website blocking as well so users can add websites they don't want
to go to."

## Why typed domains, not Apple's picker

Apple's `FamilyActivityPicker` can already hold websites, but it only lists sites from the
phone's Safari history, so people can't type one in. Typed domains can't become `WebDomainToken`s,
so they can't go on the app shield (`shield.webDomains`). The only API that takes a plain domain is
the web content filter: `ManagedSettingsStore.webContent.blockedByFilter = .specific(Set<WebDomain>)`.
react-native-device-activity already wraps it (`setWebContentFilterPolicy`).

What that means for users:
- It blocks the domain and its subdomains in Safari and in any app's WebKit views. Chrome and
  other iOS browsers use WebKit too.
- iOS shows its own "restricted" page. There are no Locturne shield words or button, because the
  filter has no shield.
- There's a 50-domain cap across everything (`MAX_SITES`), checked when a site is added.

## How it behaves

- Websites belong to the **bedtime** or the **always** list (`src/lib/websites.ts`). Daily limits
  and Block now picks don't take websites: a limit needs usage counting, which only works with
  tokens.
- A site sleeps whenever its list does. Always-list sites sleep all the time. Bedtime-list sites
  sleep while the night holds the list (bedtime until the morning proof), or during a Block now
  that runs on the bedtime apps. Nothing sleeps without a subscription.
- An added site sleeps at once. A removed site keeps sleeping until `looserEditsStartAt`, the
  same next-bedtime rule as the apps. A second removal never pulls a waiting one forward.
- Known gap: a bedtime list with websites but no apps doesn't hold the night. Arming and the
  morning logic still count only apps, so the card says to pick at least one app.

## Where the code is

| Piece | File |
|---|---|
| Storage, normalising, add/remove/settle | `src/lib/websites.ts` (keys `locturne.sites`, `locturne.sitesPending`) |
| Filter = sites of every held list, set whole | `applyWebsiteFilter` in `src/lib/screen-time.ts`, called from `reapplyStandingBlocks`, `sleepApps` and `startNap` |
| Removals land on open | `settleSites` in `syncLock` (`src/lib/lock-controller.ts`) |
| Same with the app closed | `reapplyLocturneWebsites` + `settleLocturneSites` in `targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift` |
| UI | `src/features/websites/websites-card.tsx`: Add website row (iOS `Alert.prompt`), one row per site with a remove button, a note when removals wait |
| Tests | `src/lib/screen-time.test.ts` (website tests at the end), `native-tests/Tests.swift` ("typed websites sleep with their list…") |

Unlike the app lists, waiting site removals aren't re-dated when the routine changes later
(`redateLooserEdits`). They land at the `from` worked out when they were saved.
