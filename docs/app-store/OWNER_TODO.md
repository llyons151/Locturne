# Owner to-do: App Store Connect

Written October 3, 2026. These are the steps only the account holder can do in App Store
Connect (ASC) for the early review submission and the January launch. RevenueCat's side
(API keys, offerings, the server notification URL) is in `docs/REVENUECAT_SETUP.md`, which
another agent is writing.

**S = the early submission, Monday November 16, 2026.** Dates are relative to it. The later
milestones come from LAUNCH_PLAN:
- Internal TestFlight about Nov 20.
- External beta Dec 1.
- 1.0 approved on manual release by Dec 18.
- Review slows Dec 23–27.
- Launch Jan 2–5, 2027.

---

## Now (S − 6 weeks: Oct 5–11)

1. **Decide the seller identity.** As a sole proprietor, the seller name shown on the store is
   your legal name. An LLC needs a D-U-N-S number and takes weeks. The same name goes in the
   Terms, the Privacy Policy and the copyright line.
2. **Agreements, Tax, and Banking** (ASC → Business). Accept the **Paid Applications
   Agreement**, add a bank account, and fill in the US tax form (W-9). Sandbox subscriptions
   and real purchases don't work until this is "Active".
3. **EU Digital Services Act trader status** (ASC → Business, or App Information). Decide:
   - **Trader:** your address, phone and email are shown publicly on EU product pages. A PO
     box or a virtual address and a separate phone number are fine.
   - **Or** leave the EU out of availability at launch.
   **[OPINION]** Use a PO box and stay in the EU.
4. **Create the app record** (Apps → + → New App):
   - Platform iOS. Name `Locturne: Morning App Blocker`.
   - Primary language English (U.S.). Bundle ID `com.lukelyons.locturne`. SKU `locturne-ios`.
   - Do it now: creating the record reserves the name while competitors launch weekly.
5. **Sandbox testers** (Users and Access → Sandbox). Make 2 accounts: one adult, and one set
   up as a child for the Ask to Buy test (TEEN_ACCOUNTS).
6. **PostHog project settings** (once the project exists): turn on **"Discard client IP
   data"**. The Privacy Policy promises the IP is used for the approximate location and then
   discarded, and keep event retention at 12 months or less (the policy says "up to 12").
7. **App Store Connect API key** (Users and Access → Integrations → Team Keys, App Manager
   role) for `eas submit`. Add `ascAppId` to `eas.json` → `submit.production` after step 4.

## S − 5 weeks (Oct 12–18)

7. **Subscriptions** (app → Monetization → Subscriptions):
   - Group: "Locturne".
   - `locturne.annual`: $59.99, 1 year, **introductory offer: 7-day free trial**, all
     territories, new subscribers.
   - `locturne.monthly`: $9.99, 1 month, no offer.
   - The exit-offer product(s): `locturne.annual.offer` at $29.99 with a 7-day trial. The
     14-day arm can't be a second intro offer on `locturne.annual` (one per product per
     territory). Settle that with REVENUECAT_SETUP.md.
   - For each product: display name ("Locturne Annual", "Locturne Monthly"), a description
     (for example "Your apps sleep until you're up"), and a **review screenshot of the
     paywall**. Add it once the paywall shows real StoreKit prices.
   - Product IDs must match `src/lib/purchases.ts` and RevenueCat exactly.
   - Group localization: display name "Locturne".
8. **Turn off unwanted platforms** (Pricing and Availability):
   - Untick "iPhone and iPad Apps on Apple Silicon Macs" and Apple Vision Pro. Screen Time
     and motion don't work there.
   - Price: Free (the subscriptions carry the price). Availability: all territories, or all
     minus the EU (step 3).

## S − 4 weeks (Oct 19–25)

9. **Website live on Cloudflare** (web/README.md), with the `[TODO]`s filled. The real legal
   name, state, PostHog region and retention go in **before** their URLs go into ASC:
   - `locturne.com/privacy`
   - `locturne.com/terms`
   - a new `locturne.com/support`, with the contact email and FAQs.
10. **Set up hello@locturne.com** with Cloudflare Email Routing (WEBSITE.md TODO 1). The
    support URL, the review contact and the policy all use it.

## S − 3 weeks (Oct 26 – Nov 1)

11. **App Information** (from LISTING.md):
    - subtitle;
    - Primary category Health & Fitness, Secondary Productivity;
    - Content Rights: No third-party content;
    - Privacy Policy URL;
    - License Agreement: Apple's standard.
12. **Age rating** (LISTING.md §6): answer the questionnaire, then **Override → 13+**.
13. **First TestFlight upload** (`eas build -p ios --profile production` then `eas submit`).
    - Check email for **ITMS-91053** (privacy manifest) and other upload warnings.
    - Confirm the build shows Family Controls on all four targets.
    - Internal testing needs no review: add yourself and run the device test script.

## S − 2 weeks (Nov 2–8)

14. **App Privacy** questionnaire (PRIVACY_LABELS.md §B), matching exactly what's in the
    build you'll submit: RevenueCat only, or RevenueCat + PostHog.
15. **Version 1.0 page:**
    - promotional text, description, keywords (LISTING.md);
    - support URL and marketing URL;
    - copyright `2026 <legal name>`.
16. **Screenshots** at 6.9", 1320 × 2868 (SCREENSHOTS.md §2). Real device for the shield and
    the stairs.
17. **Featuring nomination** (ASC → Featuring → Nominations → New Nomination, type "App
    Launch"). Apple suggests up to 3 months ahead, so do it now:
    - Target date Jan 2.
    - Say what's distinctive: the morning-proof mechanic, Loc's voice, the downstairs
      barometer method, honest status.
    - Add a TestFlight link if possible.

## S − 1 week (Nov 9–15)

18. **Record the review video** on a real device: onboarding with a short night, the shield, the
    morning, the downstairs trip on real stairs, a pass, and the unlock. Under 3 minutes.
19. **Dry-run REVIEW_NOTES.md §1** yourself, on a clean install, exactly as written. If the
    short-night path doesn't shield straight away, rewrite the notes to lead with Block now
    (REVIEW_NOTES §2).
20. **Check the REVIEW_NOTES §4 ❌ items are fixed in the build:**
    - real purchases;
    - You-tab Restore, Help, Feedback and Rate;
    - no "Preview" or "placeholder" text;
    - a real icon;
    - privacy manifests.

## S: submit (Mon Nov 16)

21. **App Review Information:**
    - Sign-in required: **off**.
    - Contact: name, phone and hello@locturne.com.
    - **Notes:** paste REVIEW_NOTES §1.
    - **Attachment:** the video.
22. **In-App Purchases and Subscriptions** on the version page: **add all subscription
    products**. A first subscription can only be reviewed together with a version.
23. **Version Release: "Manually release this version".** It must never go live by accident in
    November.
24. **Submit for Review.** Expect 24–48 hours. A Screen Time app may take longer, or get the
    automated 2.5.1 entitlement message (Forums 838802). If so, reply in Resolution Center
    with the four bundle IDs and the approval date.

## After S

25. **If rejected:** fix it, reply in Resolution Center, and resubmit. Budget two rounds
    before Dec 18.
26. **If approved early (Pending Developer Release):** keep it unreleased. When the final
    1.0 build is ready, use "Cancel this release" / reject the binary, attach the new build
    and resubmit. Same version number, so a new build number is enough. Each resubmission is
    a new review.
27. **External TestFlight (by Dec 1).** Beta App Review needs:
    - a beta description;
    - a feedback email;
    - "what to test";
    - the same test notes.
    Create a public link for 100–300 waitlist users. Compare shield behaviour with internal
    testers (a known bug).
28. **Final 1.0 approved by Dec 18**, still on manual release.
29. **Pre-orders** (Pricing and Availability → Pre-Orders). Turn them on for the approved 1.0
    with release date **Jan 2, 2027** (pre-orders allow 2–180 days). Don't leave the release
    on manual if pre-orders set the date: pick one.
30. **Custom Product Pages** (SCREENSHOTS.md §4): create `downstairs`, `steps`,
    `scroll-in-bed` and `bedtime` after approval, and submit them before Dec 18.
31. **In-app event, "New Year 30-Morning Challenge"** (app → In-App Events):
    - Event card image and media.
    - Starts Jan 2; events can run up to 31 days.
    - It can be promoted up to 14 days before it starts.
    - Submit by about Dec 10 so it clears review before the holiday slowdown.
32. **Dec 23–27:** no submissions planned. Review is slow and ASC may pause.
33. **Launch day (Jan 2–5):**
    - Confirm the app is live in key territories.
    - Change the promotional text to the launch line (no review needed).
    - Watch ASC → Analytics → Sources by CPP.

## Also before launch (not ASC, but owner-only)

- USPTO class 9 search for "Locturne", and social handles (GAME_PLAN Step 5).
- A device test of a teen child account with Ask to Buy (TEEN_ACCOUNTS).
- An optional lawyer review of the Terms and Privacy Policy (WEBSITE.md TODO 7).

---

## Sources

- App record, agreements, availability: <https://developer.apple.com/help/app-store-connect/>
- DSA trader requirements: <https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements>
- Subscriptions and intro offers: <https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions>
- Pre-orders: <https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/offer-apps-for-pre-order>
- In-app events: <https://developer.apple.com/help/app-store-connect/offer-in-app-events/overview-of-in-app-events>
- Featuring nominations: <https://developer.apple.com/app-store/getting-featured/>
- Holiday review schedule: <https://www.goodbarber.com/blog/app-store-connect-holiday-dec-23-27-a926>
- SDK minimums (Xcode 26 from April 28, 2026): <https://developer.apple.com/news/upcoming-requirements/>
