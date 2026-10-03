# Screenshots, App Preview and Custom Product Pages

Written October 3, 2026. The plan is to capture the real app, with no mockups. The
first three screenshots decide most installs, because they're what shows in search results
(LAUNCH_PLAN §7). Every caption is morning-first and in Loc's flat voice, with no
exclamation points.

---

## 1. Required sizes (ASC, October 2026)

| Display | Pixels (portrait) | Needed? |
|---|---|---|
| **6.9"** (iPhone 14/15/16 Pro Max and Plus, 17/18 Pro Max, Air) | **1320 × 2868** (also accepts 1290 × 2796 or 1260 × 2736) | **Required** unless 6.5" is supplied. Supply this one. |
| 6.5" (iPhone 11 to 14 Plus) | 1284 × 2778 or 1242 × 2688 | Required only if 6.9" is missing. Smaller sizes scale down from these. |
| 6.3", 6.1", 5.5" and smaller | — | Optional; Apple scales them down. |
| iPad 13" | 2064 × 2752 | Only needed if the app supports iPad. `supportsTablet` is off, so it isn't. |

- 1 to 10 screenshots per size. PNG or JPEG, with **no transparency (alpha)**.
- Capture on a 6.9" iPhone if you have one (a 17 Pro Max gives 1320 × 2868 directly).
  Otherwise use an EAS cloud simulator at that size **for screens that don't need Screen
  Time**, and a real device for the shield.
- Status bar: 9:41 and full battery is the convention. The night screens should show a real
  late time (for example 11:47 PM) because the time is part of the story. Keep it
  consistent across the set.

---

## 2. The screenshot plan (8 screenshots)

Order: promise, then the morning, then night, then how it's fair. Captions are 3–7 words
on a plain band above the real screen. Use the app's own Nocturne look: the serif for Loc's
lines, white on the night colours, **no glow and no device-frame shadows in an accent
colour** (CLAUDE.md).

| # | Caption | Real screen to capture | State to set up |
|---|---|---|---|
| 1 | **Your apps sleep until you're up.** | Home, **morning** state, apps still asleep, "Go downstairs" button. Loc's line on top. | Short schedule (REVIEW_NOTES §1 "full test"), captured just after the morning starts. |
| 2 | **Go downstairs. They wake up.** | The downstairs screen mid-trip: live height meter partly filled. | Real stairs, with screen recording on. Take a still from the recording. |
| 3 | **Shh. I'm sleeping. So are they.** | The **shield** over a blocked app. | Pick a category (Social) so the shield shows a category, not a trademarked app icon. Real device only. |
| 4 | **Or walk 200 steps. Same deal.** | The steps view near the end (around 180–190 / 200). | Walk it; capture near the end. |
| 5 | **Phone down at 11:30. Not a request.** | Routine tab: bedtime, morning time, wake-up method and the next-bedtime note. | Bedtime 11:30 PM. |
| 6 | **2 a.m. you doesn't get a vote.** | Routine, showing the next-bedtime note after an edit. | Edit the bedtime during a night. |
| 7 | **Bad day. Use a pass.** | The exits sheet: passes left and the emergency unlock. | Passes 3 left. |
| 8 | **Daytime too. Block now.** | Nap tab with a 30-minute Block now running (sideways moon clock or the countdown). | Start a session. |

Optional 9–10, if they test well:
- **9. "Scan the coffee machine."** The scan screen in morning mode, with the code on a real
  mug or machine. Drop it if Scan is cut.
- **10. "Never fails quietly."** The You tab status line "Screen Time access is off, so I
  can't block anything…". It shows honesty, the brand's third pillar. **[OPINION]** Test it
  later as a CPP screenshot rather than on the default page.

Rules:
- **No third-party app icons or names** (TikTok, Instagram) in any screenshot or caption
  (2.3.7, 5.2.1). Use the picker's **categories**, or Apple apps already on the phone only
  if they're unavoidable.
- **No onboarding quiz screens and no paywall.** They don't sell the product, and paywall
  prices in screenshots go stale.
- **The captions must be true for the submitted build** (2.3.1). The share card and the
  background unlock aren't in 1.0 yet, so don't show them.
- **No art.** The raccoon has no illustration in v1 (GAME_PLAN). His lines carry it.
- Captions are localizable; only English for 1.0.

---

## 3. App Preview video

| Spec | Value |
|---|---|
| Resolution (6.9" and 6.5") | **886 × 1920** portrait |
| Length | 15–30 s |
| Count | Up to 3 per size; the first autoplays muted in search results |
| Format | H.264 at 10–12 Mbps (.mov, .mp4) or ProRes 422 HQ; 30 fps; 256 kbps AAC stereo |
| Poster frame | Defaults to 5 s; set it to the shield frame |

Apple's rule (2.3.4): previews may only use **screen captures of the app**, with optional
captions and voice-over. No camera footage of a person on the stairs. The real-stairs
footage belongs in TikTok videos and the review attachment, not here.

**Preview 1 (default, 25 s):** "The morning."
1. 0–3 s: the shield at night, with the caption "11:47 PM. Apps asleep."
2. 3–8 s: the Home morning state, 7:02, "Your apps sleep until you're up."
3. 8–18 s: the downstairs screen, Start, the height meter climbing, then unlock.
4. 18–23 s: Home in the day state, apps awake, with Loc's line "I'm up. Don't talk to me yet."
5. 23–25 s: hold on the name and subtitle.
- Sound off by default; captions carry it. If you record Loc's audio later, it can play here.

**Preview 2 (later, after launch data):** the steps version, for the steps CPP.

Record with iOS screen recording on a real device. Crop or scale to 886 × 1920 (iOS
records at the device resolution). Use `ffmpeg` for scaling and H.264, then check the length.

---

## 4. Custom Product Pages (CPPs), one per video angle

Up to 70 per app. Each gets its own screenshots, previews, promotional text and (since
July 2025) **its own keywords**, plus an optional deep link (iOS 18+). Each needs a review,
but it doesn't need a new app version. Link TikTok and creator traffic to its CPP URL (the
waitlist page today, `?ppid=` App Store links at launch). Keep the waitlist's `?src=` tag
matching the CPP name so sign-ups and installs line up.

| CPP | Video angle (GAME_PLAN, LAUNCH_PLAN §7) | Screenshot 1 caption | Promotional text idea | Extra keywords to try |
|---|---|---|---|---|
| `downstairs` | "I have to go downstairs before Instagram works" | Go downstairs. They wake up. | One trip down the stairs and your apps wake up. Not before. | stairs, downstairs, floor |
| `steps` | "I have to walk 200 steps before TikTok works" | 200 steps. Then your apps. | Your apps stay asleep until you've walked 200 steps. | walk, steps, pedometer |
| `scroll-in-bed` | "My phone won't work until I get out of bed" | Your apps sleep until you're up. | For people who wake at 7 and are still scrolling at 7:50. | doomscroll, scrolling, bed |
| `bedtime` | Night-side videos, revenge bedtime procrastination | Phone down at 11:30. Not a request. | Your apps go to sleep at bedtime. 2 a.m. you can't change that. | bedtime, curfew, night |
| `scan` | "The code lives on my coffee machine" | Scan the coffee machine. | Your apps wake when you scan the code in your kitchen. | scan, qr, barcode |
| `students` | 8 a.m. class content (STAND_OUT_ANGLES §5) | Up for your 8 a.m. | Your apps sleep until you're out of bed. Even for 8 a.m. class. | class, college, student |
| `new-year` | January, with the in-app event | 30 mornings. Out of bed first. | Start the year out of bed. | resolution, new year |

Notes:
- **Captions must still avoid trademarks.** "Before Instagram works" is fine in a TikTok
  video, but not in a CPP caption or keyword. Use "your apps".
- **Deep links:** none are needed in 1.0. Later, `locturne://` could open onboarding with
  the method preselected (for example `downstairs`), but onboarding already asks.
- **CPP keywords:** Apple's page says they're assigned per page, and each keyword
  combination can belong to only one page. Some guides say they must come from the app's
  keyword list. **[UNVERIFIED]** Check in ASC when you create the first one.
- **When:** CPPs can be created once 1.0 is approved (December). Have the 4 main ones
  (`downstairs`, `steps`, `scroll-in-bed`, `bedtime`) ready before December 18.
- **Measure:** ASC → App Analytics per product page: impressions, conversion rate, and
  proceeds per page. Kill angles under the default page's conversion after about 2 weeks of
  traffic.

---

## Sources

- Screenshot specifications: <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications>
- App preview specifications: <https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications>
- Guideline 2.3.3/2.3.4 (screenshots and previews): <https://developer.apple.com/app-store/review/guidelines/#accurate-metadata>
- Custom product pages: <https://developer.apple.com/app-store/custom-product-pages>, <https://adapty.io/blog/custom-product-pages-app-store/>
- Competitor caption patterns (first 3 screenshots of Opal, one sec, ScreenZen, Erly, Wayk, Alarmy, Groggy and others): LISTING.md §4 sources.
