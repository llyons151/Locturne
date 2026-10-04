# Website: locturne.com

**Superseded (2026-10-04):** the live site is the separate `locturne_landing` Astro repo
(`~/Documents/Projects/locturne_landing`), deployed on Cloudflare. Edit Terms, Privacy and
Support there. The plain-HTML `web/` folder below is the October 3 first draft and is not
deployed; the "Facts the Privacy Policy rests on" list still applies to the live policy.
The input TODOs below are resolved: seller Luke Lyons (sole proprietor), Texas law,
hello@locturne.com via Namecheap forwarding, PostHog US with 12-month retention.

Built October 3, 2026. Code and deploy steps: [web/README.md](../web/README.md).

## What it is

- **`/`**: a short waitlist page for TikTok traffic (bios can't link the App Store). The
  hook is the GAME_PLAN line, "Your apps sleep until you get out of bed", then three beats
  reused from onboarding's deal screen, Loc's approved opener ("I'm Loc. Raccoon. I'd like
  to sleep.") and an email field. Success says "You're on the list. Go to sleep."
- **`/privacy`** and **`/terms`**: the documents the paywall's `LEGAL_URLS` already point to.
- **`/support`**: contact and FAQs (added 2026-10-03). The App Store Support URL and the
  app's You → Help row. Its answers restate app behaviour (passes, emergency unlock, the
  next-bedtime rule, methods), so update it when those change.
- **`/api/waitlist`**: a Cloudflare Pages Function writing to D1.

## Decisions

- **D1, not KV.** Dedupe needs an atomic unique check (`UNIQUE` + `ON CONFLICT DO NOTHING`),
  and the number that matters, sign-ups per video, is a `GROUP BY src`. KV is eventually
  consistent and can't query. D1's free tier covers this volume many times over.
- **Attribution:** `?src=` plus standard `utm_*` tags, first touch kept per email, plus the
  referring site's hostname and Cloudflare's country. No IP address is stored.
- **Spam:** honeypot field, 1.5 s time trap, same-origin check, size limits. Bots get a fake
  success. A rate-limiting rule or Turnstile only if spam actually shows up.
- **Same answer for new and repeat emails,** so the form can't reveal who signed up.
- **Look:** the landing page uses the app's Moonrise colours (`src/theme/colors.ts`: navy
  `#16254F` to `#050A17`, moon-white text, white pill, heavy italic serif for Loc), and the
  NASA moon photo the app uses, crisp, with no halo. Reason: viewers arrive from videos of
  the real app, so the page should look like it. The legal pages are light lavender
  documents with frosted white panes (the lavender glass reference), switching to the night
  colours in dark mode. No glow, no particles, no web fonts (New York via `ui-serif` on
  Apple devices, Georgia elsewhere). No raccoon art: v1 has none (GAME_PLAN).
- **No cookies, analytics or third-party scripts,** enforced by a strict CSP in `_headers`.

## Facts the Privacy Policy rests on

Checked in the code on October 3, 2026 (commit 387fbdd). If any of these change, update
`src/pages/privacy.astro` in `locturne_landing` first.

1. **Screen Time:** selections are Apple's opaque `FamilyActivitySelection` tokens, stored
   by react-native-device-activity in the App Group `group.com.lukelyons.locturne`
   (`src/lib/screen-time.ts`, `modules/blocked-apps`). The app can't resolve them to names;
   only `Label(token)` draws them. Daily limits use usage-threshold events; no usage
   history is read.
2. **The extensions make no network requests.** The library's Swift code contains a
   webhook action (`URLSession` in `targets/*/Shared.swift`), but Locturne never configures
   it. Never use it, or the policy becomes false.
3. **No server and no network calls in the app today.** The only URL opened is Apple's
   subscriptions page. No HealthKit, location, contacts, photos or IDFA.
4. **On-device records** (App Group via `sharedSet`/`userDefaultsSet`): routine, armed state,
   morning proofs, passes, emergency unlocks, first-run flags, the registered scan code's
   text, and a heartbeat log of about four nights.
5. **Sensors:** `CMPedometer` steps from the morning start; barometer `relativeAltitude` in a
   live session of up to about 5 minutes; the accelerometer for the sideways nap clock.
6. **Camera** (`expo-camera`) reads the scan code only; nothing is recorded (the
   permission string says so).
7. **Notifications** are local (`expo-notifications`); no push token is requested.
8. **Sharing** goes through the iOS share sheet only (reveal, morning card, diagnostics report).
9. **PostHog is in the code (2026-10-03, [ANALYTICS.md](ANALYTICS.md))** but sends nothing until a key is set in app.json. **Planned, described as such in the policy:** RevenueCat (`src/lib/purchases.ts` is still
   a stub) and PostHog (in the app only, never in extensions; app counts, never which apps).
10. **Age:** Terms minimum age 13, under-18s need a parent or guardian's permission, as
    recommended in [TEEN_ACCOUNTS.md](TEEN_ACCOUNTS.md).

The Terms' prices and trial come from GAME_PLAN "Money": Annual $59.99 with a 7-day trial
(the default), Monthly $9.99 with no trial, and a possible exit offer described generally.

## Also changed

- The You tab's Privacy Policy and Terms of Use rows now open `LEGAL_URLS` instead of the
  "not live yet" alert. (The paywall links were already pointed at locturne.com in ee3d5f5.)
- `web/` is excluded from the app's `tsconfig.json` and ESLint.

## TODOs needing your input

1. **Contact email:** `hello@locturne.com` is used throughout. Set up Cloudflare Email Routing
   for it (README step 6), or tell me another address. Never your personal one.
2. **Legal name** of whoever publishes the app (your name as a sole proprietor, or an LLC
   if you form one). It must match the seller name in App Store Connect.
3. **US state** for the Terms' governing-law clause.
4. **Postal address:** optional; some EU/UK requests expect one. A PO box or registered-agent
   address works.
5. **PostHog:** region (US or EU cloud), whether IP capture is turned off, and the retention
   period (the policy has a placeholder of months).
6. **Waitlist email service:** if you'll send the beta/launch emails through a service
   (Resend, Buttondown, etc.), name it in privacy section 5.
7. **Lawyer review:** do you want one before launch? Both documents are written from the
   real code and common App Store practice, but they're not legal advice. A one-off review
   costs a few hundred dollars; the subscription section and the Apple clause matter most.
8. **Launch timing on the page:** it says "iPhone · early 2027". Change it once D7 (the launch
   date) is decided.
9. **Deploy:** follow web/README.md, then check `/privacy` and `/terms` load on the real
   domain before submitting to App Review.
