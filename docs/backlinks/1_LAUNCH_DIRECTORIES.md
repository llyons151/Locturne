# Locturne backlinks: startup and product launch directories

Researched 2026-10-12. Nothing was submitted and no accounts were made.

**Main source:** the `mmmmingos/where-to-submit-your-startup` GitHub list (submitmystartup.com). Someone actually submits to each site and logs what happens, and most rows were re-checked between 2026-09-24 and 2026-10-08. Queue lengths, prices and follow status below come from that log unless marked otherwise. DR numbers come from two compiled lists, `whatsuppiyush/backlink-claude-skill` data/directories.md and the piccmaq.com "83+ directories 2025" post. They often disagree, so I give a range, and they are only rough. Liveness was spot-checked with curl on 2026-10-12. A 403 there is just a Cloudflare bot wall, not a dead site.

## Read this first: what changes things for Locturne

1. **locturne.com is probably DR 0 today.** Fazier, Startup Fame, List My SaaS (DR 10+) and Toolfio (DR 20+) won't take a free listing until your DR is above their bar. Start with the sites that have no DR gate. A handful of real links (Product Hunt, Crunchbase, SaaSHub, Indie Hackers) should lift you above 0 within a few weeks. After that, do the DR-gated ones.
2. **About half of these want a badge on your site in return.** The free path often requires a "Featured on X" dofollow badge in your homepage or footer, and if you remove it the listing goes nofollow or disappears. That makes it a reciprocal link, which Google discounts, and 20 badges would make the landing page look cheap. Pick 3 to 5 at most, or put them all on one `/press` or `/featured` page if the site's checker accepts that. The checker usually looks at the homepage or footer only, so test first.
3. **Locturne is a consumer iOS app, and many of these sites are built for SaaS or web tools.** BetaList wants your own domain, not an App Store link, which is fine because locturne.com works. StartupBase turns down "single-purpose utilities" on its free path. G2, Capterra, GetApp, SpotSaaS and SaaSworthy are B2B only and will reject a consumer app, so I left them out. PayOnceApps rejects mobile apps. DevHunt only takes developer tools. Wherever a form asks for a "Website", always give locturne.com, not the App Store URL. The backlink is what you're after.
4. **Launch day only matters on a few sites:** Product Hunt, Show HN, Uneed, Peerlist, Fazier, Tiny Launch and MicroLaunch. On these the rank you get depends on rallying upvotes within 24 hours to a week. The rest are just a listing you submit and forget.
5. **Free queues are long.** Uneed is about 100 days, Open Launch is full into 2027, OpenHunts about 60 weeks, Firsto about 180 days, App Launcher about 16 weeks and Launching Next about 4 months. Get in the queues **now** so the listings go live around the mid-November video push.
6. **Treat link-follow status as approximate.** Several sites switch you between nofollow and dofollow depending on the badge, a top-3 finish or a paid plan.

Key: **DF** = dofollow, **NF** = nofollow, **cond.** = dofollow only with their badge, a top-3 finish or a paid plan. DR shows the range from the compiled lists. Where no list gave a number, I estimated High (60+), Med (30–60) or Low (<30).

---

## Tier 1: must-do (18)

These are high-authority, a real audience, or both. Most are free.

| # | Site | Submit URL | Cost | Link | DR | Note |
|---|---|---|---|---|---|---|
| 1 | Product Hunt | https://www.producthunt.com/posts/new | Free | Redirect link (counts as NF), but the PH page ranks on Google | 91 | The single biggest launch day. Do it once the app is live and you have a video, around mid-Nov, on a Tue–Thu. Prepare a hunter and a gallery, and rally support on the day. |
| 2 | Hacker News (Show HN) | https://news.ycombinator.com/submit | Free | NF | 90–91 | Use "Show HN: Locturne – your apps stay asleep until you walk 200 steps". You need something people can try. A traffic spike, not a link. |
| 3 | Indie Hackers (product page) | https://www.indiehackers.com/products | Free | NF per one list, DF per another | 79–80 | The product page goes live as soon as you create it, and filling in every field gets it into the directory. Build-in-public posts there bring real visits. |
| 4 | Crunchbase | https://www.crunchbase.com/add-new | Free | NF | 91 | A free company profile, often live the same day. Gives you a canonical entity page, which helps Google and AI answers. |
| 5 | Wellfound (AngelList) | https://wellfound.com/company/new | Free | NF | 90 | A company profile you start from a personal account. Trust signal. |
| 6 | F6S | https://www.f6s.com/company/signup | Free | NF | 81 | Free company profile. Also lists student and founder programs, which could be useful to you. |
| 7 | AlternativeTo | https://alternativeto.net/manage-item/ | Free; $5 priority review | NF | 80–89 | List it as an alternative to Opal, Alarmy and one sec. People search "Alarmy alternative", so this brings buyers. The free queue holds thousands, so $5 priority is worth it. Your URL must not carry UTM tags. |
| 8 | SaaSHub | https://www.saashub.com/services/submit | Free; $75 priority | DF | 72–73 | Released software on its own site only, so no waitlist page. Queue up to 32 days. Name competitors (Opal, Alarmy) and verify with an @locturne.com email to move up. |
| 9 | Uneed | https://www.uneed.best/submit-a-tool | Free queue (~100 days); $14.99 fast-track; $29.99 pick your date | DF | 62–67 | Launch day matters: you need an upvote score of 10 or the product gets pulled. Pay the $29.99 and set the date to your PH week, or join the free queue today. |
| 10 | Peerlist Launchpad | https://peerlist.io/launchpad | Free | **No crawlable link** (the Visit button is a script) | 71 | Weekly launch. Free verification needs a work email on your domain, so set up an @locturne.com address through Cloudflare Email Routing. Good for the audience, not the link. |
| 11 | Launching Next | https://www.launchingnext.com/submit/ | Free (~4-month wait); $99 fast-track | DF | 50–56 | Submit now and forget it. Long-lived dofollow listing. |
| 12 | Tiny Launch | https://www.tinylaunch.com/ | Free (queue about 4 weeks); $39 premium | DF only for the weekly top 3 (or premium) | 44–59 | Weekly board. The free backlink is not guaranteed. |
| 13 | Fazier | https://fazier.com/launch | Free; $29/$49/$99 | DF | 55–73 | Free path needs DR > 0, 3 real comments on other products, and their badge. **Do this after your DR moves.** |
| 14 | Startup Fame | https://startupfa.me/ | Free (needs badge and DR > 0); $19 highlight | DF | 50–77 | Same DR gate as Fazier. Published within 7 days. |
| 15 | Side Projectors | https://www.sideprojectors.com/submit/type | Free; $20 fast | DF (per piccmaq) | 71 | Reviewed in 2 to 3 days. **Untick "open to discussing a sale"**, which is on by default. |
| 16 | Invent List | https://inventlist.com/submit | Free | Unknown | Low–Med | Explicitly takes **mobile apps** and indie products in progress. Permanent page. The badge is optional. |
| 17 | StartupBase | https://startupbase.io/launch | Free (badge, 3 upvotes and a comment, queue 4–5 weeks); $39 skips the badge | DF (per piccmaq) | 52 | Free launches get an editorial check that excludes "single-purpose utilities", so pitch it as a product, not a utility. |
| 18 | Twelve Tools | https://twelve.tools/submit-your-tool | Free with a backlink to them; $36 pro | DF (per piccmaq) | 73 | Went live immediately when tested. Free only if you link back. |

## Tier 2: worth it (42)

Decent authority or the right audience, and cheap or free. Do these in batches over the first month.

| # | Site | Submit URL | Cost | Link | DR | Note |
|---|---|---|---|---|---|---|
| 19 | MicroLaunch | https://microlaunch.net/ | **$49** (the free tier is advertised but blocked) | DF | 48–51 | A month-long launch window. Paid only in practice as of 2026-10-04. |
| 20 | BetaList | https://betalist.com/submit | **$39** Lite / $99 / $299 (no free path now) | DF | 74–78 | High DR and an early-adopter audience. Needs your own domain, no App Store link. Refunded if not selected. Best before launch, while you're collecting a TestFlight or waitlist. |
| 21 | Startup Stash | https://startupstash.com/add-listing/ | Free | Unknown | 67–76 | Needs a work or business email, and Gmail is refused, so use @locturne.com. |
| 22 | Pitchwall (formerly Betapage) | https://pitchwall.co/submit | Free (review 30+ days); $49/$99 | Free = no DF; paid = DF | 64 | betapage.co now redirects here. |
| 23 | PeerPush | https://peerpush.com/submit | Free (about 2-month queue); $39 now | DF (per piccmaq) | 64 | While queued, the listing is invisible to crawlers. |
| 24 | Open Launch | https://open-launch.com/projects/submit | Free slots are full into 2027; $12 premium | DF (per piccmaq) | 40 | $12 is cheap for a DF listing that goes live next day. |
| 25 | Firsto | https://firsto.co/projects/submit | Free (~180 days, ~30 with badge); $19.90 | Unknown | 52 | Queue it now. |
| 26 | LaunchIgniter | https://launchigniter.com/submit | Free with homepage badge; $12/$15 | Unknown | 34 | Cheap paid tier with no badge. |
| 27 | Launch List | https://www.launch-list.org/submit/product | Free (badge for DF, upvote 3 others); $9–$19 in an Oct sale | cond. | Med | Weekly. |
| 28 | Smol Launch | https://smollaunch.com/ | Free basic (NF, no badge); free verified (DF with badge) | NF / cond. | Low–Med | A no-badge free option exists. |
| 29 | Next Big Product | https://nextbigproduct.com/list-fast | Free (NF, no badge); $19+ DF | NF / paid DF | Med | Up to 5 launches a day. |
| 30 | Super Launch | https://www.superlaun.ch/ | Free (NF, queue); $19 for 2 DF links | NF / paid DF | 26 | |
| 31 | Today Launches | https://todaylaunches.com/pricing | Free (no account, 2–3 month queue, NF); $35 DF | NF / paid DF | Low | No sign-up needed. |
| 32 | Pro Launch | https://prolaunch.net/projects/submit | Free (NF; DF with badge); $7.99 DF | cond. | Low | 25 free slots a week. |
| 33 | Built By Me | https://builtbyme.io/submit | Free (NF); $9 launch with DF and a blog post | NF / paid DF | Low | |
| 34 | BuiltByIndies | https://builtbyindies.com/submit | Free (5 upvotes first); $9 | DF top 3 only | Low | Indie-maker crowd. |
| 35 | Launch Vault | https://www.launchvault.dev/projects/submit | Free (badge); $9.99+ | cond. | Low | Weekly. |
| 36 | Better Launch | https://www.betterlaunch.co/submit | Free (Mondays, NF for 7 days); $19 DF | NF / paid DF | Low | |
| 37 | App Launcher | https://www.applauncher.io/launch/create | Free (full until about Jan 25, 2027); $19 jump with DF | paid DF | Low | Queue it now. |
| 38 | OpenHunts | https://openhunts.com/projects/submit | Free (~60 weeks); $9.90 | Unknown | 31 | The free queue is useless, so pay $9.90 or skip. |
| 39 | Startup Ranking | https://www.startupranking.com/ | Free profile (80+ day approval); $49/$99 | Unknown | High (old domain) | Queue it now. |
| 40 | Startup Tracker | https://startuptracker.io/crowdsourcing/ | Free | Unknown | Med | No account, but the form wants an official Twitter/X handle. |
| 41 | Tracxn | https://tracxn.com/listyourstartup | Free request | Unknown | High | Investor database, so a trust or entity signal more than traffic. |
| 42 | Gust | https://gust.com/ | Free | Unknown | High | The profile stays unpublished until Gust finishes its check. Low effort. |
| 43 | Startup Buffer | https://startupbuffer.com/site/submit | Free (review queue); $19.95+ | Unknown | Med | No account. |
| 44 | Startup Inspire | https://www.startupinspire.com/ | Free (1 startup per account, curated) | Unknown | Med | Needs a logo and a screenshot. |
| 45 | Startups Gallery | https://startups.gallery/ | Free (hand review) | Unknown | Med | Curated, so not guaranteed. |
| 46 | Make.rs | https://make.rs/ | Free | NF | Low–Med | Maker community. Project page plus updates. |
| 47 | Open Makers | https://openmakers.io/add-product | Free | DF (no nofollow) | Low | Build-in-public milestones. Fits a student dev story. |
| 48 | Votekicker | https://votekicker.com/ | Free (live immediately, no review) | Unknown | Low | |
| 49 | Clapstorm | https://www.clapstorm.com/submit | Free | DF (no nofollow) | Low | Weekly rounds ranked by claps. |
| 50 | Lifto | https://liftoapp.com/submit | Free (queue) ; $29/$79 | DF | Low | Stays free and DF even without a badge. |
| 51 | Startup.sx | https://www.startup.sx/submit | Free (24–48h manual review); $9.99 DF | Free link status unclear | Low | |
| 52 | GreenRocket | https://greenrocket.app/create | Free | Unknown | Low | Email sign-up only. |
| 53 | BuildHop | https://buildhop.io/app/create | Free; $15 | Unknown | Low | |
| 54 | Index by Dodo Payments | https://index.dodopayments.com/submit | Free | Unknown | Med | |
| 55 | Kick Product | https://www.kickproduct.com/ | Free* | Unknown | Low | Takes products of any kind. |
| 56 | Owwly | https://owwly.com/ | Free*; $17/$35 | Unknown | Low–Med | |
| 57 | Mergeek | https://mergeek.com/zh/publish_project | Free | Unknown | Med | Chinese community **for iOS and Mac apps**. Accepts an App Store link, editors reply within a day, and promo codes are optional. One of the few that really fits Locturne. |
| 58 | App Rater | https://apprater.net/add | Free; $35 quarterly promo | Unknown | Low–Med | App directory. Free public form, no account. |
| 59 | Alpha Digits | https://alphadigits.com/submit-app-for-review/ | Free request (not guaranteed) | Unknown | Low–Med | App review blog that covers **iOS apps**. Needs a store link. |
| 60 | Tapscape | https://www.tapscape.com/submit-app-review/ | Free email pitch; $99 expedited | Unknown | Med | **iPhone apps only.** Free pitch with no promise of a review. |

## Tier 3: bulk, low value (64)

Low DR, a badge requirement, paid-only, or general web directories. Batch these in one sitting only after Tiers 1 and 2, or skip them. Most free paths need their badge on your homepage. If you take the badge, put several on one page.

| # | Site | Submit URL | Cost | Link | DR | Note |
|---|---|---|---|---|---|---|
| 61 | Huzzler | https://huzzler.so/products/create | Free with homepage badge; $29 | Unknown | 31 | |
| 62 | Findly.tools | https://findly.tools/ | Free with footer badge; $29/$59 | DF (piccmaq) | 40 | |
| 63 | Daily Pings | https://dailypings.com/submit | Free with badge; $19 | cond. | 20 | |
| 64 | Find Your SaaS | https://findyoursaas.com/pricing | Free standard (limited time) | DF (piccmaq) | 17 | |
| 65 | PromoteProject | https://www.promoteproject.com/submit-startup | Free (needs 5 credits) | DF (piccmaq) | 48 | |
| 66 | ProductBurst | https://productburst.com/ | Free (upvote 10 others); $9.99 | Free = no DF | 48 | |
| 67 | Idea Kiln | https://ideakiln.com/dashboard/submit-idea | Free; $5–$29 | DF only with badge and DR > 10 | 47 | |
| 68 | Resource.fyi | https://resource.fyi/ | Free (7+ days out) | NF | 37 | |
| 69 | Awesome Indie | https://awesomeindie.com/submit | Free (2,766 in queue); $9.99+ | Unknown | 22 | |
| 70 | Turbo0 | https://turbo0.com/ | Free with badge; $29.90 | DF (piccmaq) | 66 | Says it is for content-creation products, so it may not fit. |
| 71 | Dofollow.Tools | https://dofollow.tools/submit | Free with badge; $19 | cond. | Low | |
| 72 | FirstLook.tools | https://firstlook.tools/submit | Free with badge; $15.99 | cond. | Low | Same owner as Dofollow.Tools. |
| 73 | Starter Best | https://starterbest.com/submit | Free with badge; $9.9 | cond. | Low | |
| 74 | Days Launch | https://dayslaunch.com/submit | Free with badge; $9.9 | cond. | Low | Same template as Starter Best. |
| 75 | NewTool | https://newtool.site/submit | Free with badge; $9.9 | cond. | Low | |
| 76 | NavFolders | https://navfolders.com/submit | Free with badge; $9.9 | cond. | Low | |
| 77 | Gets.Tools | https://gets.tools/submit | Free with badge | cond. | Low | |
| 78 | ToolDirs | https://tooldirs.com/submit | Free with footer badge; $9.99 | cond. | Low | |
| 79 | ProductFame | https://productfame.com/products/submit | Free with badge (2–4k char description) | NF unless top 3 | Low | |
| 80 | SaaSCity | https://saascity.io/saascity?submit=1 | Free with badge; $19.99 | DF | Low | Live in 30 minutes when tested. |
| 81 | ScrollLaunch | https://www.scrolllaunch.com/ | Free with badge (queue to mid-Nov) | cond. | Low | |
| 82 | ShipBoost | https://shipboost.io/submit | Free with badge; $19 | cond. | Low | |
| 83 | SubmitMySaas | https://submitmysaas.com/projects/submit | Free with badge; $19 | DF top 3 only | Low | |
| 84 | SuperLaunchList | https://superlaunchlist.com/submit | Free with badge; $15+ | cond. | Low | |
| 85 | TheSaaSDir | https://thesaasdir.com/submit/ | Free with badge, no account | DF | Low | Live straight away. |
| 86 | SaaS Bison | https://saasbison.com/submit | Free with a permanent badge; $9.99 | DF | Low | |
| 87 | StartFast | https://startfa.st/submit | Free (no DF); $5 | NF / paid DF | Low | |
| 88 | Startup Fast | https://www.startupfa.st/submit | Free with badge; $19 | Unknown | 27 | Different site from StartFast. |
| 89 | StartupTrusted | https://startuptrusted.com/submit | Free with badge; $11 | Unknown | Low | |
| 90 | ufind.best | https://ufind.best/pricing | Free with badge; $19 | NF unless top 3 | Low | |
| 91 | Launchpadly | https://launchpadly.co/submit | Free with badge; $9+ | Unknown | Low | |
| 92 | Nick Launches | https://nicklaunches.com/submit | Free with badge; $19+ | Unknown | Low | |
| 93 | DanielLaunches | https://daniellaunches.com/submit | Free with badge; $9.99 | DF (no nofollow) | Low | |
| 94 | EarlyHunt | https://earlyhunt.com/submit | Free with link back | NF unless top 3 | Low | |
| 95 | IndieHunt | https://indiehunt.io/submit | Free with link back | NF unless top 3 | Low | |
| 96 | Noon Launch | https://noonlaunch.com/submit | Free with badge; $11 | cond. | Low | |
| 97 | DeepLaunch.io | https://deeplaunch.io/submit | Free with badge (500–3,000 char description) | cond. | Low | |
| 98 | Stellar Launch | https://www.stellarlaunch.org/projects/submit | Free; $6.49 DF | DF top 3 only | Low | |
| 99 | FastLaunch | https://fastlaunch.io/projects/submit | Free (5 slots a day) | cond. | Low | |
| 100 | WeekHack | https://weekhack.com/ | Free (review); $19 | DF top 3 only | Low | |
| 101 | SaaS Page | https://www.saaspa.ge/submit | Free weekly launch | NF (DF with badge, paid or top 3) | 12 | |
| 102 | Neeed Directory | https://neeed.directory/submit | Free with badge; $19 | cond. | Low | |
| 103 | Navs.site | https://navs.site/submit | Free (7-step form) | NF | Low | |
| 104 | Aura (Aura++) | https://auraplusplus.com/projects/submit | Free with badge | NF | Low | |
| 105 | Bowora | https://bowora.com/ | Free with badge | NF | Low | |
| 106 | ProofStories | https://proofstories.io/submit/ | Free; $9.99 | NF (DF with badge) | Low | |
| 107 | Foundrlist | https://www.foundrlist.com/submit | Free queue (428 ahead); $9+ | Unknown | Low | |
| 108 | WhatLaunched.Today | https://whatlaunched.today/ | Free (~2 months out); $29 | Unknown | Low | |
| 109 | Product Watch | https://productwatch.io/ | Free (30-day queue); $20 | Unknown | Low | |
| 110 | Startup Ranked | https://startupranked.com/ | Free (Monday batches of 20); $29 | Unknown | Low | |
| 111 | The Hack Stack | https://thehackstack.com/add-product | Free | DF (no nofollow) | Low | Takes any kind of product. |
| 112 | Tools.so | https://tools.so/submit | Free* | Unknown | Low | |
| 113 | Indie-Builds | https://indie-builds.com/submit | Free | Unknown | Low | Takes apps and games too. |
| 114 | StarTap | https://startap.cc/play | Free | NF | Low | A clicker game that doubles as a directory. A novelty. |
| 115 | Startup Europe | https://startupeurope.net/ | Free | DF (no nofollow) | Low | Takes non-EU startups despite the name. |
| 116 | Startup 88 | https://startup88.com/ | Free pitch (queue) | Unknown | Low–Med | |
| 117 | SnapMunk | https://www.snapmunk.com/submit-your-startup/ | Free editorial pitch | Unknown | Med | Not guaranteed. |
| 118 | Techendo | https://techendo.com/beta/add | Free | Unknown | Low–Med | Old betas section. |
| 119 | Tech Pluto | https://www.techpluto.com/ | Free Google Form (description over 100 words) | Unknown | Med | Follow-up emails upsell $79–$149 coverage. Ignore them. |
| 120 | Startups.fm | https://startups.fm/submit | **$49** | DF | 33 | Paid only. |
| 121 | Tiny Startups | https://www.tinystartups.com/submit | **$69** | DF | 49 | Paid only. Has a newsletter audience. |
| 122 | Startup Spotlight | https://www.startupspotlight.co/submit | **$29** | DF | Low | Paid only. |
| 123 | JustLaunched | https://justlaunched.fyi/submit | **$9** ($29 for DF) | paid DF | Low | |
| 124 | Next Big What | https://submit.nextbigwhat.com/ | Paid packages | Unknown | Med–High | Paid only. India tech media. |

**Total: 124 sites** (18 Tier 1, 42 Tier 2, 64 Tier 3).

---

## Checked and dropped (don't bother)

- **Dead or broken as of Sept–Oct 2026:** Launched (launched.io doesn't resolve), Killer Startups (form doesn't render), Slant (SSL 526 errors), Launched by Lovable (404), MakerThrive (now sells sponsorships only), New Startups (down), Solo Push (backend gone), Startup Button, Startup Lift, Starticorn, Startup Galaxy, Startup Founders, Startup John, Startup Pitch, Startup Roulette, Finding Startups, Index.co, MicroStartups and Marketing Tools List (now poker spam), Side Project Stack (casino), It's Launched, Indie Hunting, Indiebuilds.co, Indie Tools, IndieStack, EarlyLaunch, Launch.cab (paused), Product Bump, Prefundia, Makerlog, Remote Tools, Cool Startups, Demos.co, Beta Founder, Builders.to, Getworm, Discover Cloud (verification emails never arrive), Ready SaaS Go, SaaS Directory, Startup Resources (form closed), Startup Collections, Netted, Oye Startups, Appvita, Collaborizm, PreApps, Crazy About Startups (being rebuilt).
- **Wrong fit for a consumer iOS app:** G2, Capterra, GetApp, Software Advice, TrustRadius, SaaSworthy, SpotSaaS, Crozdesk, GoodFirms and SoftwareSuggest are B2B only, and some need a phone number or company email. DevHunt and DevPages are dev tools only. PayOnceApps excludes mobile. OpenAlternative and osalt are open source only. TrustMRR and Trust Revenue need verified revenue, so revisit after launch. Also out: about 200 AI-only directories (There's An AI For That, Futurepedia, Toolify, Dang.ai and so on), MCP and agent directories, and regional-only lists (EU-Startups, Inc42, GeekWire, YourStory, e27 is SE Asia).
- **Paid-only and poor value:** 1000.tools ($5.99/mo), All Top Startups ($29–$79), Toolfolio ($99+), Tekpon ($249), Superb Crew ($3.8K), Startup Guys, Postmake ($79+), and the app-review mills (Apps 400, Apps Mirror, Appiod, AppsThunder, Web App Rater, which charge $29–$349 for reviews).

## Sources

- https://github.com/mmmmingos/where-to-submit-your-startup: 520+ sites, each with an observed submission result, re-checked Sept–Oct 2026. This was the main source.
- https://github.com/whatsuppiyush/backlink-claude-skill/blob/main/data/directories.md: DR, follow status and submit URLs for 48 curated sites plus a long tail.
- https://piccmaq.com/?p=1454: "83+ Startup Directories 2025", the source for DR and dofollow labels.
- https://peerpush.com/blog/best-product-hunt-alternatives, https://bigideasdb.com/best-product-hunt-alternatives-2026 and https://pinggy.io/blog/best_producthunt_alternatives/: 2026 Product Hunt alternative roundups.
- https://github.com/awesome-directories/awesome-directories: 300+ directories with DR (the app has the data; the README doesn't).
