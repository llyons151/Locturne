# App Store listing: Locturne 1.0

Written October 3, 2026. Paste-ready text for App Store Connect (ASC). The character
counts were checked with a script. Facts come from the code at commit 5138092 and from
GAME_PLAN "Money". Competitor data was pulled from the US store on October 3, 2026
(sources at the end). **[OPINION]** marks judgement calls.

Before pasting, check:
- Prices match the subscription products in ASC.
- Nothing promises a feature that isn't in the submitted build (background unlock, share
  card, alarm).

---

## 1. Name (30) and subtitle (30)

Apple indexes the words in the name, the subtitle and the keyword field, and combines
them across fields. Don't repeat a word in more than one of them.

### Name options

| Option | Chars | For | Against |
|---|---|---|---|
| **Locturne: Morning App Blocker** | 29 | "Morning app blocker" is only used by apps with no ratings. Puts the morning first, the way GAME_PLAN says to sell it. | "App blocker" on its own is contested by Opal and ScreenZen. |
| Locturne: Bedtime App Blocker | 29 | Bedtime is where people start looking. | Bedtime locking is table stakes (GAME_PLAN). Leads with the commodity half. |
| Locturne: Get Out of Bed | 24 | The exact promise. | Doesn't say it blocks apps. Lower-intent searches. |
| Locturne | 8 | Clean. | Wastes 22 characters of the strongest ranking field. Brick can afford this; a new app can't. |

### Subtitle options

| Option | Chars | Notes |
|---|---|---|
| **Stop scrolling in bed. Get up.** | 30 | Indexes "stop scrolling in bed" (only no-rating apps use it) and "get up". Morning-first. |
| Phone sleeps until you get up | 29 | Closest to the product line, but "phone" and "sleeps" are better spent in keywords. |
| Bedtime lock. Morning walk. | 27 | Too literal, and the walk isn't the hero; downstairs is. |

### Recommendation [OPINION]

- **Name:** `Locturne: Morning App Blocker`
- **Subtitle:** `Stop scrolling in bed. Get up.`

The product line "Your apps sleep until you get out of bed" is the strongest hook, but its
words have weak search value. Use it as screenshot 1 and in the promotional text instead.

Indexed words after this choice: locturne, morning, app, blocker, stop, scrolling, in,
bed, get, up. The keyword field below repeats none of them.

---

## 2. Promotional text (170)

This field can be changed at any time without a new review. Use it for launch news later
(for example the New Year challenge).

```
Your apps go to sleep at bedtime and stay asleep until you get out of bed. Go downstairs, walk 200 steps or scan a code. Loc, a tired raccoon, isn't negotiating.
```

161 characters.

---

## 3. Description (4000)

The description isn't indexed for search. Its job is to convert, and to carry the 3.1.2
subscription disclosures and the Terms (EULA) link. Never put competitor or app brand
names in it (TikTok, Instagram, Opal): guideline 2.3.7. It is about 2,900 characters.

```
Your apps go to sleep at bedtime. They don't wake up until you get out of bed.

Locturne is for people who scroll in bed at both ends of the night. At bedtime, the apps you pick go to sleep. In the morning they stay asleep until you prove you're up. Not when the alarm rings. When you're actually out of bed.

Loc runs it. He's a raccoon. He's tired. Your phone keeps him up.

"Shh. I'm sleeping. So are they."

HOW YOU PROVE YOU'RE UP
• Go downstairs. Start the check, take the stairs, and your iPhone's barometer feels the floor change. One trip and they wake up.
• Walk it off. 200 steps, counted from your morning time, including steps you took before opening the app.
• Scan your code. Print your own code, or pick a barcode that lives in another room. The coffee machine works.
Every morning you can walk instead, so a missing staircase never leaves you stuck.

AT NIGHT
• Pick the apps, your bedtime and your alarm time. Tonight's lock is set before setup ends.
• Changes made at night wait until the next bedtime. 2 a.m. you doesn't get a vote.
• Switch any night of the week off.

DURING THE DAY
• Always-blocked apps stay asleep all day and all night.
• Block now: put apps to sleep for 15 minutes to 4 hours.
• Daily limits: when an app hits its limit, it sleeps until tomorrow.

STRICT, NOT CRUEL
• Passes for sick days, travel or a baby asleep in the room.
• An emergency unlock that's always there. It makes you wait ten seconds, on purpose.
• Phone calls always get through.
• No streaks to break and no guilt. He complains about himself, not you.

HONEST ABOUT WHAT IT CAN DO
Locturne uses Apple's Screen Time. If Screen Time access is turned off, or a block didn't start, Loc tells you plainly. He doesn't pretend to be working when he isn't.

PRIVATE BY DESIGN
• Apple gives Locturne sealed tokens, not app names. We never see which apps you pick.
• Steps, stairs and scans are checked on your iPhone.
• No account. No ads.

SUBSCRIPTION
You need a subscription to set up your lock.
• Locturne Annual: $59.99 a year, with a 7-day free trial for eligible new subscribers.
• Locturne Monthly: $9.99 a month.
Prices are in US dollars and vary by country. Payment is charged to your Apple Account when you confirm the purchase, or when the free trial ends. Your subscription renews automatically unless you cancel at least 24 hours before the end of the current period, and your account is charged for the renewal within 24 hours before the period ends. Manage or cancel any time in Settings > [your name] > Subscriptions. Any unused part of a free trial ends when you buy a subscription.

Terms of Use: https://locturne.com/terms
Apple's Standard EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://locturne.com/privacy

Locturne isn't medical advice. Use a wake-up method that's safe for you.
```

Notes:
- **Phone calls, not texts.** "Phone calls always get through" is safe because iOS never lets
  a Screen Time app shield the Phone app. The onboarding line "Calls and texts aren't
  touched" (`steps.tsx`, `apps` step) is only true if the user doesn't pick Messages. Reword
  it in the app to "Phone calls always get through", or keep Messages out of the picker.
- **Drop a line if its feature isn't in the submitted build.** Scan is the first cut if
  time runs short (GAME_PLAN), so remove the Scan bullet if it doesn't ship.
- **Keep the subscription block** in every localization you add. A forum report found
  repeated 3.1.2 rejections caused by the EULA link missing from a second language.

---

## 4. Keywords (100)

```
bedtime,sleep,screen,time,doomscroll,phone,lock,wake,walk,steps,stairs,night,social,media,out,early
```

99 characters: commas only, no spaces, and no word that's already in the name or subtitle.

### Rationale

| Keyword | Why | Combines with (title/subtitle) into |
|---|---|---|
| bedtime | The bedtime-blocker searches. Only no-rating apps use it in titles (SleepLock, Bed Lock). | "bedtime app blocker", "bedtime lock" |
| sleep | High volume. GAME_PLAN sells it as a sleep app that also blocks. | "sleep app blocker" |
| screen, time | The biggest search in the category ("screen time"). Opal, ScreenZen and one sec own the top results, but we can rank in the long tail. Apple indexes single words, so "screen" and "time" cover the phrase. | "screen time app blocker", "morning screen time" |
| doomscroll | Unclaimed in any title. A TikTok-native word. "scrolling" is already in the subtitle. | "stop doomscroll" |
| phone | "phone in bed", "phone lock", "phone addiction" style searches. | "phone in bed", "stop phone in bed" |
| lock | Bed Lock, BedLock and SleepLock show people search "lock". | "app lock", "morning lock", "bed lock" |
| wake | Erly and Wayk's territory, so there's volume. | "wake up", "wake up app blocker" |
| walk, steps, stairs | The method searches. "walk to unlock" has weak competition (LAUNCH_PLAN §7). | "walk app", "steps to unlock" |
| night | "night mode blocker", "night phone". | "night app blocker" |
| social, media | "social media blocker" is a big generic search. | "social media blocker", "stop scrolling social media" |
| out | Completes "get out of bed" with "get" and "bed" from the subtitle. | "get out of bed" |
| early | "get up early", "wake up early". | "get up early" |

Left out on purpose:
- **Trademarks and competitors** (tiktok, instagram, opal, alarmy): banned by 2.3.7.
- **alarm, snooze:** Locturne has no alarm in v1. Ranking for "alarm clock" would bring
  installs that churn and could be called misleading. Add these when the AlarmKit alarm ships
  (v1.1).
- **focus:** heavily contested, and off-message for a sleep app.
- **Plurals:** Apple already matches simple plurals.
- **detox, limit, downstairs:** next in line. Swap one in for a weak performer after launch.

### How to iterate

1. Check volumes in Apple Ads keyword planning (popularity 5–100) or Astro before
   submitting, and replace any word scoring under about 20.
2. Change keywords only with a new version; each update is a chance to test.
3. Custom Product Pages can now rank for keywords of their own (since July 2025), so
   method-specific terms (stairs, steps) can move to their CPPs later. See SCREENSHOTS.md.

### Competitor keyword research (US store, October 3, 2026)

| App | Title + subtitle | Category | Age | Ratings |
|---|---|---|---|---|
| Opal | Opal: Screen Time Control / Focus, App Blocker & Timer | Productivity / Health & Fitness | 9+ | 4.72 (89K) |
| one sec | one sec \| screen time + focus / App & Website Limit, Blocker | Productivity / Health & Fitness | 9+ | 4.83 (24K) |
| Brick | Brick - Ditch Distractions / Make your phone a tool again | Productivity / Lifestyle | 4+ | 4.94 (56K) |
| ScreenZen | ScreenZen- Screen Time Control / App blocker, limit screen time | Productivity / Health & Fitness | 4+ | 4.86 (51K) |
| Erly | Erly: Wake Up Early / Loud Alarm Clock for Sleepers | Health & Fitness / Lifestyle | 13+ | 4.79 (16K) |
| Wayk | Wayk: Alarm Clock to Wake Up / Heavy sleepers, Stop snoozing | Health & Fitness / Lifestyle | 4+ | 4.73 (20K) |
| Alarmy | Alarmy - Loud alarm clock / Heavy sleepers, Sleep tracker | Lifestyle / Utilities | 4+ | 4.76 (248K) |
| Groggy | Groggy: Stop Scrolling in Bed / Tasks done, apps unlock | Productivity / Health & Fitness | 4+ | none |
| Bed Lock | Bed Lock: Morning App Blocker / Habit Tracker & Screen Time | Productivity / Utilities | 4+ | none |
| BedLock | BedLock: morning focus / AI-verified morning app locker | Productivity / Lifestyle | 13+ | none |
| Anchor | Anchor Morning / Full featured Alarm/AppBlocker | Productivity / Utilities | 4+ | none |
| Clockblock | Clockblock: Alarm & Blocker / Focus sessions & screen time | Productivity / Utilities | 4+ | none |
| SleepLock | SleepLock: Sleep App Blocker / Screen Time Control for Sleep | Health & Fitness / Productivity | 4+ | none |

What this shows:
- **Heavily contested** by apps with 16K–250K ratings: screen time, app blocker, focus,
  alarm clock, wake up (early), heavy sleepers.
- **Less contested** (only no-rating indies, mostly launched April–September 2026): morning
  app blocker, stop scrolling in bed, bedtime/sleep app blocker, get out of bed, app locker.
- **Unclaimed in any title or subtitle:** phone in bed, out of bed, stairs, downstairs, walk
  to unlock.
- **Direct overlap:** "Bed Lock: Morning App Blocker" uses our recommended phrase. It has
  no ratings, and Locturne's brand word comes first, so it isn't a conflict. Search ranking is
  decided by downloads and conversion, not by who used the words first.
- **Groggy owns "Stop Scrolling in Bed" in its title** (title outranks subtitle). Our subtitle
  still indexes the same words. Watch its rank after launch.
- **Nobody says "Family Controls" in a listing.** They say "Apple's Screen Time", usually as
  a privacy point. Our description does the same.

---

## 5. Category

- **Primary: Health & Fitness.** Erly, Wayk and SleepLock sit there, it gets the New Year
  lift, and the top chart is easier to climb than Productivity's (GAME_PLAN open decision 2,
  LAUNCH_PLAN D6).
- **Secondary: Productivity.** That's where every blocker ranks (Opal, one sec, ScreenZen,
  Brick).
- Lifestyle is the other choice for the secondary. It's less relevant.

Health & Fitness carries no extra review rules unless the app makes medical claims. Keep
the "not medical advice" line, and keep sleep statistics out of the listing.

---

## 6. Age rating questionnaire

Apple's 2025 questionnaire (ratings 4+, 9+, 13+, 16+, 18+). Answer honestly, then
override to **13+** so the rating matches the Terms (minimum age 13; see
[TEEN_ACCOUNTS.md](../TEEN_ACCOUNTS.md)).

| Section | Question | Answer | Why |
|---|---|---|---|
| In-app controls | Parental Controls | **No** | `.individual` authorization only: people restrict their own phone. A parent can't use Locturne to manage a child's phone. |
| In-app controls | Age Assurance | **No** today. **Yes** if the Declared Age Range check (TEEN_ACCOUNTS Option A step 3) ships. | Today it's a self-declared age wheel with an under-13 stop (`age` / `under-13` steps). Apple's examples are the Declared Age Range API, age estimation or ID checks. |
| Capabilities | Unrestricted Web Access | No | Links open in the system browser (Safari). There's no in-app browser. |
| Capabilities | User-Generated Content | No | |
| Capabilities | Social Media | No | Sharing through the iOS share sheet isn't a social feature. |
| Capabilities | Messaging and Chat | No | |
| Capabilities | Advertising | No | |
| Mature themes | Profanity or Crude Humor | None | Loc is dry, not crude. Re-check the line bank before submitting. |
| Mature themes | Horror/Fear | None | |
| Mature themes | Alcohol, Tobacco, Drugs | None | |
| Medical or wellness | Medical or Treatment Information | None | No diagnosis or treatment. The Terms say "not medical advice". |
| Medical or wellness | Health or Wellness Topics | **Yes** | Apple's definition is "self-care or lifestyle recommendations". A bedtime and get-out-of-bed app in Health & Fitness fits it. Answering No risks a 2.3.6 note. It may raise the computed rating, but we override to 13+ anyway. |
| Sexuality or nudity | All three | None | |
| Violence | All four | None | |
| Chance-based | Gambling, Simulated Gambling, Contests, Loot Boxes | No / None / None / No | |

Then use **Override to Higher Age Rating → 13+**. Don't choose Kids Category, and keep
"for kids" wording out of the metadata (2.3.8).

---

## 7. URLs and other fields

| Field | Value | Status |
|---|---|---|
| Support URL (required) | `https://locturne.com/support` | **Doesn't exist yet.** The site has only `/`, `/privacy` and `/terms`. Add a short `/support` page with the contact email and 5–6 FAQs (passes, emergency unlock, "it didn't block last night", cancelling, restoring, "ask a parent"). If it isn't ready in time, `https://locturne.com/` with a visible contact email also passes, but a real page is better. |
| Marketing URL (optional) | `https://locturne.com` | Live once the site is deployed (WEBSITE.md). |
| Privacy Policy URL (required) | `https://locturne.com/privacy` | Fill the `[TODO]`s first (legal name, PostHog region and retention). |
| Terms / EULA | Apple's Standard EULA plus our Terms linked in the description. Leave ASC's License Agreement field as **Apple's standard**. | Our Terms already say they supplement the Standard EULA. |
| Copyright | `2026 <legal name>` (for example `2026 Luke Lyons`). ASC adds the ©. | Use the same legal name as the seller name and the Terms. |
| Primary language | English (U.S.) | |
| Content rights | "Does your app contain, show, or access third-party content?" **No** | App names and icons in the picker are drawn by iOS, not shipped by us. |
| Routing app coverage file | None | |
| Sign-in required | No | |

---

## 8. What's New (1.0)

ASC doesn't show the What's New field for an app's first version, so there's nothing to
paste for 1.0. Keep this for 1.0.1, in Loc's voice:

```
Fixes and small improvements. Loc slept through most of it.
```

When something real ships, say what changed in plain words first, then the joke:

```
Your morning can now start with a real alarm. Loc still hates it.
```

---

## Sources

- App Store listings (US, October 3, 2026): Opal <https://apps.apple.com/us/app/opal-screen-time-control/id1497465230>,
  one sec <https://apps.apple.com/us/app/one-sec-screen-time-focus/id1532875441>,
  Brick <https://apps.apple.com/us/app/brick-ditch-distractions/id6448794069>,
  Erly <https://apps.apple.com/us/app/erly-wake-up-early/id6751428380>,
  Wayk <https://apps.apple.com/us/app/wayk-alarm-clock-to-wake-up/id6758021281>,
  Alarmy <https://apps.apple.com/us/app/alarmy-loud-alarm-clock/id1163786766>,
  ScreenZen <https://apps.apple.com/us/app/screenzen-screen-time-control/id1541027222>,
  Groggy <https://apps.apple.com/us/app/groggy-stop-scrolling-in-bed/id6802700389>,
  Bed Lock <https://apps.apple.com/us/app/bed-lock-morning-app-blocker/id6763492881>,
  BedLock <https://apps.apple.com/us/app/bedlock-morning-focus/id6760336720>,
  Anchor <https://apps.apple.com/us/app/anchor-morning/id6766728511>,
  Clockblock <https://apps.apple.com/us/app/clockblock-alarm-blocker/id6760527313>,
  SleepLock <https://apps.apple.com/us/app/sleeplock-sleep-app-blocker/id6770869892>.
  Lookup API: `https://itunes.apple.com/lookup?id=<id>&country=us`.
- App Review Guidelines (2.3.6, 2.3.7, 2.3.8, 3.1.2): <https://developer.apple.com/app-store/review/guidelines/>
- Age rating values and definitions: <https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions>
- 3.1.2 rejections over missing EULA links, including a second-language case: <https://developer.apple.com/forums/thread/809635>, <https://developer.apple.com/forums/thread/813493>
- Custom product pages and keywords: <https://developer.apple.com/app-store/custom-product-pages>, <https://adapty.io/blog/custom-product-pages-app-store/>
