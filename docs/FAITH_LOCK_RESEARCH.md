# Faith lock ("scripture before scroll"): research

Written October 3, 2026. This is a follow-up to [APP_OPPORTUNITIES.md](APP_OPPORTUNITIES.md),
where this idea ranked #3. The idea is that social apps stay locked until you read or
pray, either inside our app or by spending N minutes in a prayer app you already use
(Hallow, YouVersion and others). There are three research passes with sources and
evidence grades in [faith-lock/](faith-lock/):

- [Competitors](faith-lock/1_COMPETITORS.md): App Store data pulled from Apple's own API on October 3, 2026
- [Technical feasibility](faith-lock/2_TECHNICAL.md): iOS DeviceActivity, Bible licensing, Android
- [Market and UGC](faith-lock/3_MARKET_AND_UGC.md)

Judgments are **[OPINION]**.

## 1. Verdict

**The demand is real, but the plain idea is already one of the most crowded corners of
the App Store.** The ranking in APP_OPPORTUNITIES.md was too optimistic and has been
corrected. As a standalone "pray to unlock" app it is now a clone-war category. The
one opening that stands out is **the morning**: get out of bed, then a devotional,
then your apps wake up. No competitor does that, and it's exactly what Locturne already
does.

## 2. How crowded it is

- **Count:** about 300 live US iOS apps pair a faith practice with Screen Time
  blocking.
  - About 155 are Christian, about 100 Muslim (they lock at the five prayer times),
    about 8 Catholic and about 6 Jewish.
  - Launches peaked at about 40 a month from March to June 2026 and are still around
    15 a month.
- **Distribution of ratings:** only about 10 have 1,000+ ratings; about 240 have under 20.
- **Leaders:**

  | App | Ratings | Price | How it unlocks |
  |---|---|---|---|
  | Bible Mode | 12.4K, 4.92★ | $39.99–59.99/yr | Scan a page of your physical Bible, or an in-app reflection (claims 200K users) |
  | Pray Screen (first mover, Nov 2024) | 9.7K | about $50/yr | In-app prayer. Stale, ads before prayer, bugs |
  | **BibleScroll** (by BePresent's makers) | 5.8K | $59.99/yr | **Time spent reading in YouVersion**, which is your "use the app you already have" idea |
  | Sanctify | 3.4K | $49.99/yr | In-app |
  | Bible Chat Lock (from Bible Chat's ~$15M/yr studio) | new | — | Launched **October 2, 2026** |
  | Damascus / Little Way (Catholic) | 607 / 262 | up to $119.99/yr family | Prayer before the app opens |

- **Taken name:** "Scripture Before Scroll" is already an app name (May 2026).
- **Copy speed:** matching today's features takes 1–2 weeks with existing Screen Time
  code, so any new feature is copyable in 2–4 weeks.

## 3. Your two ideas, checked

### "Detect other prayer apps and wait for N minutes"

- **It works on iOS.** A `DeviceActivityEvent` on the prayer app's token with a time
  threshold triggers the monitor extension, which removes the shields. Apple's own
  sample code does this. It's Locturne's `armLimit()` pattern in reverse.
- **It can't be the only way to unlock:**
  - The threshold has fired early or not at all on iOS 26. Apple called it a known
    issue, said it was fixed in 26.5, and it was reported again in July and August 2026.
  - An early fire means a free unlock. A missed fire leaves someone locked out after
    praying, which earns a 1-star review.
  - **Only on-screen time counts.** Hallow is mostly audio you listen to with the
    screen locked, so a normal Hallow session would barely register. YouVersion
    (reading) works better.
  - Apps are opaque tokens: the user has to pick Hallow themselves in Apple's picker,
    and could just as easily pick a game.
  - It measures time, not prayer, so leaving the app open on the desk counts.
- **It's already partly taken:** BibleScroll does it for YouVersion. Multi-app and
  Hallow support are the remaining gap, and Hallow's audio problem is why that gap is
  hard.
- **What that means:** ship reading or praying inside the app as the main path, with
  "or spend 10 minutes in YouVersion/Glorify" as an extra.

### "Use our own content"

- **Free for paid apps:** the Berean Standard Bible (public domain since 2023), the
  World English Bible and the KJV.
- **The YouVersion Platform** has a free key and an official Expo SDK, with a reader
  and a verse of the day. The commercial terms for NIV and similar translations sit
  behind a login and still need checking.
- **Ruled out:** the ESV API is non-commercial only, and Catholic daily readings
  (USCCB) need a paid license.
- **Lesson from reviews:** people pay for depth, not for a thin lock around a
  one-line prayer. Typical complaints:
  - "$50 for the year for an app that shows me an extremely short prayer"
  - "I have to pay to pray?"
  - ads before prayer

## 4. Market and UGC

- **Demand is real:**
  - Hallow made about $40M net in 2025, and Bible Chat about $15M a year.
  - Barna 2025: weekly Bible reading among Gen Z rose from 30% to 49%, and young men
    now lead women.
  - US Bible sales were at a 21-year high.
  - Counterpoint: Pew and Christianity Today find no institutional revival. The UK
    "Quiet Revival" report was withdrawn in March 2026 over bad data, so don't cite it.
- **UGC works in this niche:**
  - Bible BFF made 13.1M views from 49 owned TikTok accounts. Its best hook got 5.6M
    views with a female-led "spilling tea" POV filmed in a car.
  - Reviews credit TikTok creators directly ("saw it on TikTok", "BiblewithDaniel").
- **Authenticity is the gate.**
  - Competitors sell themselves as "made by Christians."
  - Faith audiences police who represents them: Hallow got backlash over Liam Neeson.
  - The "prayer as a toll" critique fits this mechanic exactly.
  - So frame it as "put God first," never "pay to pray," and put no ads near prayer.
- **Pricing:**
  - The category sells at $29.99–59.99/yr behind a hard paywall.
  - In Lifestyle, a free trial *lowers* lifetime value by 21%, and lifetime purchases
    are 26% of revenue (RevenueCat), so offer a lifetime option.
- **Timing:**
  - Ash Wednesday is **February 10, 2027**. Lent is the most predictable spike on the
    App Store: Hallow's Lent challenge had about 1.4–2M participants.
  - New Year plus Lent lines up with Locturne's January launch.
- **Church and youth-group sales:** a slow sales cycle, and youth groups are mostly
  minors, which complicates Screen Time. Not a cash path.

## 5. Where you could win (ranked)

1. **A faith morning inside Locturne, not a separate app.**
   - The idea: alarm, get out of bed, today's reading, then your apps wake up.
   - **No competitor pairs a physical wake-up with devotion,** and it reuses nearly
     everything you've built.
   - **Doing it as a mode avoids the risks of a separate app:**
     - Apple's 4.3(b) rule against near-identical apps.
     - A new Family Controls entitlement request.
     - Splitting your video effort across two apps.
   - **It also gives you two video audiences:** "my alarm won't give me TikTok until
     I'm out of bed" and "…until I've read my Bible."
   - **Open question:** Loc's sassy raccoon voice and devotional content may clash.
     The faith mode might need a gentler voice.
2. **A standalone app that gets the craft right**, if a faith-first test proves itself:
   - real daily depth, the BSB text or a YouVersion integration
   - multi-app unlock beyond YouVersion
   - a lock that doesn't misfire, from Locturne's reliability work
   - fair pricing with a lifetime option

   Possibly Catholic-first: about 8 apps against Hallow's audience, though the content
   is costly. The 4–8 week build has to be justified by test videos first.
3. **Couples and family accountability** (one partner sees the other's streak). Almost
   nobody does it, but it's slower to grow.

## 6. Test before building (2–3 weeks, about $0)

- **Videos:**
  - Post 10–15 videos on the hook "my phone won't let me open TikTok until I…".
  - Run half as "get out of bed" and half as "read my Bible", with the Locturne
    prototype or a mock-up.
  - Compare saves, shares, and comments asking "what app is this".
- **Device check:** test on a real iPhone whether listening to Hallow with the screen
  locked counts, how late or early a 10-minute threshold fires, and whether exempting
  the Reference category works.
- **Rule:** if the faith videos clearly win, build faith mode into Locturne by Lent.
  If they don't, drop it.
