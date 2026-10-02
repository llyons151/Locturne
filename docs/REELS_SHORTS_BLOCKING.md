# Blocking Instagram Reels and YouTube Shorts on iOS

Research, 2026-10-01. Question: how do other iOS apps block Reels/Shorts without
blocking the whole app, and could Locturne do the same?

## Short answer

Apple gives no API for seeing or controlling what's on screen inside another
app. Screen Time (`FamilyControls`/`ManagedSettings`) only blocks whole apps,
categories or web domains. Every app that claims to "block Reels" uses one of
the workarounds below. Only one shipping app (WallHabit) claims to do it inside
the native Instagram/YouTube apps, and it doesn't say how.

## How shipping apps do it

| App | What it does | Mechanism | Native app? |
| --- | --- | --- | --- |
| [ScrollGuard](https://scrollguard.app/blog/how-to-block-instagram-reels-iphone) | Blocks Reels/Explore, "DMs only" mode | A Shortcuts "When Instagram is opened" automation redirects to ScrollGuard's filtered web app. The native app stays installed only for notifications. | No, redirects to web |
| [UNDOOMED](https://apps.apple.com/uy/app/undoomed-reels-feed-blocker/id6751837079) | Blocks Reels, Stories, Explore, suggested posts | Opens each network's mobile website inside its own browser (WKWebView) and hides elements. "No VPN, no app modification." | No, own browser |
| [ShortVidsBlocker](https://apps.apple.com/us/app/-/id6758012824) | Blocks YT Shorts and IG Reels | 715 KB app, no setup. Almost certainly a Safari content blocker. | No, Safari only |
| [instagram-dm-only (GitHub)](https://github.com/twohertz/instagram-dm-only-for-ios-anti-doom-scrolling) | Shows only Instagram DMs | Open-source SwiftUI + WKWebView wrapper that blocks every route except DMs | No, own browser |
| [WallHabit](https://wallhabit.com/blog/disable-instagram-reels-on-ios/) (v1.1.4, July 2026) | "The moment you open Reels, WallHabit detects it and takes you straight back out" | **Not disclosed.** "Runs locally on device", passed App Review, took "a full month", iOS 18+. 3.5★ from 33 ratings. | **Yes, claimed** |

## Possible ways WallHabit does it (unconfirmed)

None of this is confirmed. These are the only iOS building blocks that could
produce "detect Reels and back the user out":

1. **On-device packet tunnel (local VPN) + Screen Time shield.** A
   `NEPacketTunnelProvider` watches traffic from Instagram. Opening Reels causes
   a recognisable burst of video-segment requests (by hostname/SNI, size and
   timing; encrypted traffic can't be read). When that pattern shows up, the app
   applies a `ManagedSettings` shield to Instagram for a moment, which kicks the
   user to the shield screen ("backs you out"), then lifts it. A developer
   described building exactly this kind of packet-statistics Reels detector on
   the [Apple Developer Forums](https://developer.apple.com/forums/thread/778999).
   Apple DTS said packet tunnels as content filters are unsupported ("you're on
   your own"), but it isn't banned.
2. **`NEFilterDataProvider` content filter.** On unmanaged devices this needs
   Screen Time (FamilyControls) authorisation. It also sees only flow metadata,
   so detection would work the same way as option 1.
3. **Screen broadcast extension + on-device vision.** ReplayKit can capture the
   screen while a broadcast is running, but the user has to start it by hand and
   iOS shows a red recording indicator. That doesn't fit "flip one switch", so
   it's unlikely.

**How to check:** install WallHabit, turn on Reels blocking, then look at
Settings → General → VPN & Device Management. A WallHabit VPN or content-filter
profile there confirms option 1 or 2.

## Options for Locturne, ranked

1. **Safari content blocker** (cheap, reliable): block `youtube.com/shorts` and
   `instagram.com/reels?/` in Safari. Pair it with shielding the native apps.
2. **Shortcuts redirect to a filtered web view** (ScrollGuard/UNDOOMED model):
   lots of work, and the web view breaks whenever Instagram changes its site.
3. **Network-pattern detection + brief shield** (WallHabit's likely model): the
   only route to "inside the native app". Fragile (Meta/Google can change their
   CDNs at any time), uses battery, takes over the device's VPN slot (clashing
   with real VPNs), and Apple calls it unsupported. A real R&D project.

GAME_PLAN.md doesn't mention this feature. If pursued, start with option 1 and
prototype option 3 separately.
