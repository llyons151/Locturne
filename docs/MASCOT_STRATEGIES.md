# Mascot strategies

Research of October 12, 2026. It starts from an Instagram reel the user sent
(@thisguyvibecodes, "how to create animated mascots"). The question is what other mascot
strategies are worth stealing for Loc. Research only: nothing is built.

Loc's current state is in [LOC_SILHOUETTE.md](LOC_SILHOUETTE.md): a black silhouette with eye
slits and a sleep mask, done in SVG + Reanimated first and Rive later. The browser rig already
has five states and seven dramatic bits.

## The reel

- **Link:** https://www.instagram.com/reel/DeYKOA-hx5z/
- **Stats:** 78 s, posted 2026-10-12, 2.4K likes and **1,651 comments**.
- **Creator:** Branden Chong, "52 apps in 52 weeks". His app "Extras" is an AI UGC ad studio.
  His mascot is a white blob ghost with two dot eyes, on black.

**His workflow:**

1. **Exploration.** Gather references on Pinterest, Mobbin and "Purist". (Purist couldn't be
   found. It's probably misheard.)
2. **One generation of many poses.** Ask GPT Image 2.5 Sunburst for a whole sheet of poses at
   once, so the mascot "feels alive, not static".
3. **Consistency.** Generate more poses from that sheet: megaphone, sleepy, holding a laptop,
   pointing.
4. **Motion.** Animate the poses you like with Wan 2.7 (image-to-video). His example is a
   wave, used as the app's loading screen.

**Why it got 1.6K comments:** that number comes from the CTA ("comment MASCOT and I'll send
the workflow"), not the mascot. Comment-to-DM gating is a reach trick: comments feed the
algorithm. It only fits Locturne if the content is aimed at the app's buyers. Developers who
want a mascot workflow aren't people who scroll at 2am.

## What checks out

| Claim | Reality |
|---|---|
| "ChatGPT 2.5 Sunburst" | Real: **GPT Image 2.5 Sunburst**, OpenAI, September 2026. Takes up to 16 reference images and can output a transparent PNG. Costs about $0.01–0.05 an image through the API, or is included in ChatGPT Plus. |
| Wan 2.7 | Real: Alibaba, April 2026, image-to-video. Costs about $0.10/s at 720p (≈$0.50 per 5 s clip). **No transparency output.** First- and last-frame control could make a loop, but that's untested. Only the separate Wan-Alpha model (built on 2.1, text-to-video only) does alpha. |
| "Brands with a mascot are 27% more likely to gain customers" | **A misquote.** System1 (2019, IPA award entries): campaigns using a recurring character were 27% more likely to *report* customer gains, 30% profit gains and 37% share gains. These are award entries (selected for success), with no published method, from a company selling ad testing. It points the right way, but it proves nothing for an app. |
| Mascot lifts paywall/onboarding conversion | **No public A/B test isolates it.** If Loc goes on the paywall, that's an experiment, not a known win. |

## How much of the workflow fits Loc

- **Use step 2 (one pose sheet) for exploration only.** One Sunburst run with the peek
  silhouette as reference gives 16–20 poses (asleep curled, dragged by the tail, guarding
  apps, fainting, smug). It's the cheapest way to answer the open question in LOC_SILHOUETTE:
  "asleep-curled and sitting-up are needed".
- **Don't ship the AI output. Trace the poses you pick to SVG by hand.** There are three
  reasons:
  - **Copyright.** The US Copyright Office's January 2025 report says prompts alone don't make
    copyrightable work, but human edits can. *Thaler* stands after cert was denied in March
    2026. A hand-traced silhouette with dated working files is yours. The name and logo are
    protectable by trademark either way.
  - **"AI slop" backlash is real.** Examples: Sony India's "Alphy" mascot (March 2026) and the
    Coca-Cola/McDonald's ads. Locturne's marketing plan is real footage, and an obviously AI
    mascot undercuts it.
  - **It fits the rig.** The SVG parts plug straight into the existing ears/eyes/mask rig and,
    later, into Rive.
- **Skip step 4 (Wan video) in the app.** Raster video with no alpha can't change state, can't
  react, and won't match a vector rig. The reel's "wave as a loading screen" is exactly what
  the Reanimated rig already does better.
- **The one place AI video could earn a place is social B-roll.** Even there, the rig recorded
  via the web build is cleaner and is clearly "made by me". If you ever need a transparent clip:
  generate on flat white and luma-key it with ffmpeg. A black silhouette is the easiest case
  there is.

## Strategies worth more than the workflow

What works across the evidence is **behaviour and voice, not detail**: Duo, Finch, the ghost
blob in the reel. Recognition research (Ehrenberg-Bass) scores an asset on fame × uniqueness.
A raccoon silhouette alone has low uniqueness ("trash panda" art is everywhere). **The ownable
bundle is the sleep mask + eye slits + the moon + the unhinged voice.** Keep those four together
everywhere he appears.

Ranked for Locturne's situation (a solo developer, little money, videos from mid-November):

1. **Loc narrates the real-footage videos.** The account is run *as* Loc: his lines as captions
   or voice over real screen recordings and real mornings. Duo's TikTok grew on this idea: the
   For You feed treats a character as a personality, not an ad. It costs nothing extra, because
   the seven dramatic bits in the rig are already video beats.
2. **A widget/StandBy Loc whose state follows yours.** Duolingo's widget changes Duo's face by
   streak state and reports "far better retention" (no number; the 60% figure is a myth, see
   [WIDGETS.md](WIDGETS.md)). For Loc:
   - smug before bedtime
   - asleep on top of the apps overnight
   - one eye open while the morning steps are unfinished
   - limp once you're up
3. **Loc's lines on the shield screen.** Apple allows no animation there, only an icon, a title,
   a subtitle and buttons. So use a static Loc icon plus a rotating line from the
   ShieldConfiguration extension, escalating with how many times you've tried tonight ("Instagram
   is asleep. I ate it."). This is the most screenshotted surface (MASCOT_DIRECTION).
4. **Notifications in his voice:** a bedtime warning and a morning nag, as absurd doom rather
   than guilt. Duolingo says character pushes "work", with no number published.
5. **Later: a community-goal stunt.** Dead Duo (February 2025) brought 1.7B organic impressions
   and a "meaningful lift" in new and returning users (Duolingo Q1 2025 letter). The smart part
   was that bringing him back required in-app action (50B XP). The Loc version: "Loc hibernates
   until the community walks N million morning steps". It only works with a user base, so keep
   it for after launch.
6. **Cheap extras:** an iMessage sticker pack made from the same SVG poses. It's almost free,
   but there's no evidence it drives installs.
7. **A Live Activity during the morning walk,** with Loc being dragged down the stairs and
   clinging to the bed as the steps climb. Check this against
   [LIVE_ACTIVITY_IDEA.md](LIVE_ACTIVITY_IDEA.md).

**Optional side-content angle:** the reel's own format. A build-in-public "how I animated my
raccoon in code" with a comment-keyword CTA is cheap reach and helps the developer audience.
It won't sell Locturne directly, so it can't replace the buyer-facing videos.

## Open decisions

1. **Pose sheet:** run one GPT Image 2.5 Sunburst sheet from the peek silhouette for pose
   exploration? (Under $1, or free in ChatGPT.)
2. **Video account:** run it as Loc (faceless, his voice), or as you with Loc as a sidekick?
3. **Order of surfaces after onboarding:** widget, shield lines or notifications first?
4. **Purist:** if you can read the name on screen in the reel, send it. The research couldn't
   find it.

## Sources

- GPT Image 2.5 Sunburst: https://openrouter.ai/openai/gpt-image-2.5-sunburst
- Sunburst/Flare overview: https://www.orcarouter.ai/blog/gpt-image-2-5-flare-sunburst
- Wan 2.7 launch: https://www.alibabacloud.com/blog/alibaba-unveils-wan2-7-video-to-elevate-creators-from-executors-to-directors_603009
- Wan 2.7 i2v pricing: https://opper.ai/alibaba/wan2-7-i2v
- Wan-Alpha: https://huggingface.co/htdong/Wan-Alpha/blob/main/README.md
- System1 characters study: https://system1group.com/blog/creating-memorable-characters-in-advertising
- System1 numbers: https://martechseries.com/analytics/behavioral-marketing/memorable-characters-ads-boost-chances-profit-30-just-4-us-brands-using-says-system1/
- Duolingo Q1 2025 letter: https://www.sec.gov/Archives/edgar/data/1562088/000156208825000098/q1fy25duolingo3-31x25share.htm
- Dead Duo: https://npr.org/2025/02/26/nx-s1-5309785/duolingo-owl-mascot-lives
- Duolingo widget: https://blog.duolingo.com/widget-feature
- Duolingo pushes: https://www.growthtalent.org/insights/cem-kansu-on-how-duolingo-built-a-500m-business-being-unhinged
- Distinctive assets (Romaniuk): https://contagious.com/io/article/jenni-romaniuk-on-distinctive-assets
- Copyright Office AI report: https://copyright.gov/newsnet/2025/1060.html
- Thaler cert denied: https://www.bakerbotts.com/thought-leadership/publications/2026/march/supreme-court-denies-petition-on-copyright-authorship-by-ai
- Alphy backlash: https://petapixel.com/2026/03/12/i-hate-alphy-sony-alpha-indias-ai-generated-photographer-rodent
- Shield customization limits: https://developer.apple.com/forums/thread/803432
- HEVC with alpha (WWDC19): https://developer.apple.com/videos/play/wwdc2019/506/

Many 2026 tool prices come from aggregator blogs. Check the official pages before spending.
