# LLC game plan (2026-10-12, Texas pass verified 2026-10-13)

One holding LLC for every app, set up before Locturne launches (~mid-Nov 2026).
Not legal or tax advice. Fees and rules below were checked against official pages on 2026-10-13
where marked; re-check the SOS and Comptroller sites when you file, and ask a CPA about taxes.

## Shape

- **One LLC, many apps.** It's a "studio" (e.g. "Nightjar Labs LLC"), not named after an app.
  Every app ships under it. Split an app into its own LLC only if it gets big, gets sold,
  or carries unusual risk (health data, payments, kids).
- **Form it in Texas, where you live.** Wyoming/Delaware/New Mexico would still force you to
  register in Texas as a "foreign LLC" and pay both states.
- **Single-member LLC = disregarded entity.** No separate federal return. Profit goes on your
  Schedule C. Consider an S-corp election once net profit is steadily ~$50K+/yr; ask a CPA then.

## Why it matters for apps specifically

1. **Your home address stays off the store.** EU DSA rules make Apple publish the trader's address,
   phone and email on EU product pages. For an organization, Apple uses the **address tied to the
   D-U-N-S number**. So the D-U-N-S address must be a business address, not your home (see Address plan).
2. **Store listing says the company name** as the seller, not "Luke Lyons". Looks like a studio.
3. **Google Play organization accounts skip the 12-testers-for-14-days rule** that new personal
   accounts must pass before production.
4. **Liability shield**, as long as money stays separate (see Rules).

## Address plan (do this first, it decides everything else)

Every address you put on the Texas Certificate of Formation is public: registered agent,
governing person (you, as member) and organizer. The D-U-N-S address then becomes Apple's public
EU trader address. To keep your home off all of it:

- **Hire a commercial registered agent** (~$50–$150/yr). Their Texas street address is the
  registered office. You can't use a PO box or a plain mailbox service as the registered office.
- **Use the agent's address (most offer it) or a virtual mailbox** as the address for yourself as
  governing person and organizer on Form 205.
- Use that same business address for the **D-U-N-S profile**, EIN mailing address and bank.
- Being your own agent is free but puts your home address on the public record permanently
  (changing agents later is Form 401, $15, but old filings stay public).

## Texas, step by step

| # | Step | Where | Cost | Time |
|---|------|-------|------|------|
| 1 | Pick the studio name. Must end in "LLC" / "L.L.C." / "Limited Liability Company". Check it's free in the SOS name search, USPTO (TESS), the App Store and as a `.com` | SOSDirect / sos.state.tx.us, uspto.gov | $0 | 1 day |
| 2 | Buy the studio domain on Cloudflare; set up `you@studio.com` email; put up a **real one-page studio site** listing Locturne (Apple rejects parked or near-empty sites) | Cloudflare | ~$10/yr | 1–2 hr |
| 3 | Sign up with a registered agent service (see Address plan) | any agent | ~$50–$150/yr | 15 min |
| 4 | File the **Certificate of Formation, Form 205**. Choose "member-managed", list yourself as the governing person, the agent as registered agent | **SOSDirect** (still the business-filing system; SOS is moving to "SOS Portal", check which one the site points you to) | **$300** + ~2.7% card fee (~$308) | usually a few business days; non-refundable |
| 5 | Write a **company agreement** (Texas's name for an operating agreement). Single-member template is fine; not filed, keep a PDF | — | $0 | 1 hr |
| 6 | Get an **EIN** at irs.gov ("Apply for an EIN online"). Free. Ignore paid "EIN services". Save the confirmation letter (CP 575) | irs.gov | $0 | 15 min, same day |
| 7 | Open a **business checking account** with the formation certificate, company agreement and EIN letter | Mercury, Relay or a local credit union | $0 | 1–5 days |
| 8 | Request a free **D-U-N-S number** through Apple's D-U-N-S lookup page (it routes to D&B's free Apple request). Use the business address. Never pay D&B for "expedite" | developer.apple.com/enroll/duns-lookup | $0 | ~5 business days, can be longer |
| 9 | **Convert the Apple account** (individual → organization). Developer account → Membership details → "Update your information" → switch to organization, or Contact Us → Membership and Account. Give the legal name, D-U-N-S, address. Your Apple Account must use your legal name and ideally the studio email. Apps, reviews and subscribers stay | Apple Developer | $0 (same $99/yr) | Apple says up to ~3 weeks of verification |
| 10 | In App Store Connect: replace the **tax form (W-9 with the EIN) and bank account**; re-confirm **DSA trader status** (EU reviews have been taking weeks in 2026, so don't do this the week of launch) | App Store Connect | $0 | — |
| 11 | Confirm the **App Store Small Business Program** (15% cut) still applies after the conversion; nothing official says it carries over, so ask Apple support in the conversion ticket | App Store Connect | $0 | — |
| 12 | Google Play: organization account with the D-U-N-S | Play Console | $25 one-time | days |
| 13 | Move every app subscription (Apple $99, Expo/EAS, Cloudflare, RevenueCat, domains, AI tools) to the business card | — | — | 1 hr |

**Total to start: ~$310 to the state + $50–$150/yr agent + ~$10/yr domain.**

### Timing against the mid-Nov launch

Today is 2026-10-13. Fastest realistic path: name + site + agent this week, Form 205 approved
~Oct 20, EIN the same day, D-U-N-S ~Oct 27, Apple conversion lands ~early-to-mid Nov.
That's tight. If it slips, **launch on the individual account and convert after**: the conversion
keeps the app, its ratings and its subscribers. The only cost is the seller name showing
"Luke Lyons" for a few weeks, plus your individual DSA trader address (use a PO box there; individuals may).

## Name check: "Godo Labs LLC" (2026-10-13)

Front-runner name. Godo is the blacksmith who forged Guts' Dragonslayer in Berserk.

- **Domains:** `godolabs.dev` and `godolabs.app` free. `godolabs.com` registered since 2011, renewed
  Sep 2026, no live site (parked). `godo.dev` / `godo.app` taken.
- **Handles:** GitHub, X, YouTube `godolabs` free. Instagram/TikTok couldn't be confirmed (login wall).
- **App Store:** no seller named Godo Labs. Godo-named sellers exist (Grupo Godó, a Spanish media
  group; GoDocent; several Japanese "Godo Kaisha" companies), none in sleep or games.
- **USPTO:** no "GODO LABS" mark found. Nearby: a GODO word mark (reg. 5153337, 2017, owner
  Upsilon) for food-ordering software, and a pending GODO GODOCENT design mark for QR-code apps.
  Different markets, and the studio name isn't sold as a product, so low risk. Couldn't open the
  USPTO search directly (it needs a browser); check tmsearch.uspto.gov for "godo" once yourself.
- **Texas SOS:** existing Texas entities include **GoDo INC** (file 0806189634, status unknown),
  Godo Properties LLC, Godo Ranch LLC and Godo Residential LLC. "Godo Labs LLC" adds a word,
  which normally makes it distinguishable, but **confirm free with the SOS** before paying $300:
  corpinfo@sos.texas.gov or 512-463-5555.
- **Other meanings:** in Japanese, *gōdō* (合同) = "joint". A *godo kaisha* is literally Japan's LLC
  form, so Japanese readers see "Godo Labs LLC" as a slightly funny double. In Spanish, *godo* =
  "Goth", and in the Canary Islands it's a slur for mainland Spaniards. Neither touches a US
  English-language app. Many people will read it as "Godot" (the game engine) at first glance.
- **Berserk:** "Godo" is a minor character's plain name, so there's no trademark risk from the series.

## Every year in Texas

- **State income tax: none.**
- **Franchise tax: $0** while yearly revenue stays at or under the **no-tax-due threshold,
  $2.65M for 2026 and 2027 reports** (Comptroller, verified 2026-10-13).
- **You still must file a Public Information Report (PIR) every May 15** through the Comptroller's
  Webfile. The No Tax Due Report no longer exists (since 2024 reports), but the PIR does.
  First one is due **May 15 of the year after formation** (form it in 2026 → first PIR
  May 2027). The Comptroller mails a franchise tax questionnaire/taxpayer number after
  formation; answer it. Late = $50 penalty per report; long-term non-filing ends with the
  state forfeiting the LLC's right to do business, which can expose you personally.
- **Keep the registered agent paid.** If it lapses, the SOS can't serve you and you can be
  involuntarily ended.
- **Federal BOI (Corporate Transparency Act) report: not required.** FinCEN's final rule
  (Aug 2026) exempts all U.S.-formed companies. Ignore scam letters demanding a BOI filing.

## Optional Texas filings

- **Assumed Name Certificate, Form 503** ($25, filed with the SOS only, not the county, good for
  up to 10 years). Lets the LLC do business as "Locturne". Not needed for the App Store (Apple
  rejects DBAs as the seller anyway, the LLC name is the seller). Useful if a bank or payment
  processor wants the app name on the account.
- **Sales tax permit: not needed** while you only sell through Apple/Google. They're marketplace
  providers and collect Texas sales tax themselves. Selling on your own website (Stripe) would
  change that; use a merchant of record (Paddle / Lemon Squeezy) if you ever go there.

## Rules that keep the shield real

- All app income lands in the business account; all app costs come out of it.
- Pay yourself with "owner's draws" (transfer to personal); never pay personal bills from it.
- Sign contracts as "Luke Lyons, Member, Studio LLC".
- File the PIR every May. Keep the agent paid.
- Keep receipts. A spreadsheet or Mercury/Relay categories is enough at this size.

## Taxes (single-member)

- Self-employment tax ~15.3% on net profit over $400, plus federal income tax.
- Pay **quarterly estimated taxes** once profit is real (Apr 15, Jun 15, Sep 15, Jan 15).
  Rule of thumb: move 25–30% of every payout into a separate savings account.
- Apple and Google collect and remit sales tax/VAT on store sales.
- Business expenses (dev accounts, agent fee, the $300 filing fee, hardware share, tools, test
  devices) reduce profit. Formation costs can be deducted (up to $5K start-up/organizational costs).

## Later, not now

- **Trademark** each app name that earns money (USPTO, ~$350/class). The LLC does not protect names.
- **S-corp election** at ~$50K+ steady profit.
- **Business insurance** (general liability / E&O) if an app touches health, money or minors at scale.
- **Separate LLC per app** only for a sale or a risky app.

## Sources (checked 2026-10-13)

- Texas Comptroller, franchise tax: https://comptroller.texas.gov/taxes/franchise/ ($2.65M threshold, PIR, $50 late penalty)
- Texas SOS modernization (SOSDirect → SOS Portal): https://www.sos.texas.gov/modernization.shtml
- Texas SOS Form 503 instructions: https://www.sos.texas.gov/corp/instructions/503.shtml
- Apple organization enrollment requirements: https://developer.apple.com/programs/enroll/
- Apple DSA trader info: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-compliance-information
- FinCEN BOI final rule summary: https://www.steptoe.com/en/news-publications/international-compliance-blog/fincen-issues-final-rule-eliminating-beneficial-ownership-reporting-for-us-companies-and-us-persons.html
- Form 205 $300 fee: third-party guides only (e.g. https://legalglass.org/texas-certificate-of-formation/); confirm on SOSDirect's fee screen.
