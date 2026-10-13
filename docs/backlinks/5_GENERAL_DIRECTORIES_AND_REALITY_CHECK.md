# Locturne backlinks: general directories + reality check

Researched 2026-10-12 for locturne.com (new domain, Cloudflare Pages, iOS-only consumer app).
Nothing was submitted anywhere.

---

## Part 2: Reality check (read this first)

### What Google says about directory/bulk links
- Google's spam policy explicitly lists **"low-quality directory or bookmark site links"** as a link-spam example, next to
  widget links, sitewide footer links and keyword-anchored forum comments. It also lists **"links with optimized anchor text in
  articles or press releases distributed on other sites"** and excessive link exchanges.
  Source: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies).
- Since the **December 2022 link spam update**, SpamBrain detects both sites that buy links and sites that exist to pass
  outgoing links, and the effect is mostly that those links are **neutralized**: "any credit passed by these unnatural
  links is lost". Usually you don't get a penalty. The link is just ignored.
  Source: [Google Search Central blog, Dec 2022](https://developers.google.com/search/blog/2022/12/december-22-link-spam-update).
- **nofollow / ugc / sponsored have been hints, not directives, since 2019.** Google may or may not use them. Treat a
  nofollow link as roughly zero ranking value with some discovery/crawl value. It isn't negative.
  Source: [Evolving nofollow, Sept 2019](https://developers.google.com/search/blog/2019/09/evolving-nofollow-new-ways-to-identify).
- Google has said links matter less than people think. Gary Illyes (2023): links are "not top 3", "it is possible to rank
  without links". In April 2024 he said "we need very few links to rank pages". In March 2024 Google removed the word
  "important" next to links in its spam docs.
  Sources: [Search Engine Land](https://searchengineland.com/links-google-search-ranking-factor-gary-illyes-432422),
  [Search Engine Journal](https://searchenginejournal.com/google-needs-very-few-links/514494).
- Press releases: Google's guidance (via John Mueller) is to nofollow links in distributed releases. Editorial pickups of
  the story by real journalists are what count.
  Source: [Search Engine Land on press-release links](https://searchengineland.com/google-links-in-a-press-release-should-be-nofollowed-like-advertisements-168339).

**Bottom line:** Bulk directory and bookmark submissions in 2026 are mostly **neutral**. Google ignores them, and the
few dofollow ones carry little weight. They only **hurt** at scale with keyword anchors, or when they come from paid
link farms or PBNs. A dozen relevant, real listings are fine and help Google discover the domain and recognise the
brand ("Locturne" as a known thing). Listings 13 through 100 are mostly wasted hours.

### What actually moves rankings for a site like this
1. **Editorial links from relevant pages.** For example, "best alarm apps that make you get out of bed" listicles,
   app-review blogs, sleep and productivity writers, Mac/iOS news sites, and student or university press.
2. **Content that earns links on its own.** Original data from your own users, a "why snoozing ruins your morning"
   explainer with sources, a free tool such as a "wake-up method quiz". These pick up links when the short-form videos
   go viral.
3. **Brand signals.** People searching "Locturne", consistent `sameAs` social profiles, a Wikidata entry once you have
   press. These also feed AI answers (ChatGPT, Perplexity, Google AI Overviews), which increasingly cite listicles and
   Reddit.
4. **Technical basics.** Search Console, Bing Webmaster Tools, a sitemap, fast static pages, one page per real query
   (for example "/alarm-that-blocks-apps", "/alarmy-alternative").

### Does locturne.com SEO even matter vs ASO?
- Apple says **almost 65% of App Store downloads happen directly after a search** inside the App Store.
  Source: [Apple Search Ads](https://searchads.apple.com/advanced). For an iOS-only app, **ASO is the main search channel**.
  That covers the title/subtitle/keyword field, screenshots, ratings, and in-app events.
- The website matters for four things:
  1. Ranking for the brand name when TikTok viewers google "Locturne". You want the site first, not a lookalike.
  2. Long-tail web queries ("alarm app that makes you walk", "app blocker until morning").
  3. Getting into the listicles and AI answers that people read before they open the App Store.
  4. Credibility for press, Apple featuring nominations and the paywall.
- Effort split for a solo, low-budget student: about **80% ASO plus short-form video, 20% website**. Within the website
  20%, outreach to listicle writers beats directories by a wide margin.

### Do these first: top 15 for Locturne
| # | Action | Why |
|---|---|---|
| 1 | Google Search Console + Bing Webmaster Tools, submit sitemap | Indexing, and Bing also feeds ChatGPT search / Copilot. Not a backlink, but step zero |
| 2 | App Store listing: set Marketing URL + Support URL + Privacy URL to locturne.com | apps.apple.com is the strongest page you'll have about the app. It ties the entity together |
| 3 | Social profiles (TikTok, Instagram, YouTube, X, Threads, Bluesky, LinkedIn) all linking to locturne.com, plus `sameAs` in Organization/MobileApplication JSON-LD on the site | Brand entity, ranking for the brand name |
| 4 | Outreach to the 10–20 existing "best alarm apps to get out of bed" / "Alarmy alternatives" / "app blockers" listicles asking to be added | The only links here that move rankings. Free, just emails |
| 5 | AlternativeTo: list as an alternative to Alarmy, Opal, one sec, Sleep Cycle | Consumer-app friendly, ranks for "X alternatives" queries, sends real visitors |
| 6 | Product Hunt launch (a planned day, not a drive-by) | Nofollow, but brand searches, press discovery and a DR-90 profile that ranks for "Locturne" |
| 7 | Apple featuring nomination via App Store Connect (see docs/EDGE_10K.md) | Not a link, but bigger than every directory combined |
| 8 | Reddit/Indie Hackers build-in-public posts (r/iosapps, r/getdisciplined, r/sleep with rules respected, r/SideProject) | Nofollow, but real traffic, and Reddit is heavily cited by AI answers |
| 9 | Pitch app-review and iOS sites (MacStories, 9to5Mac, iDownloadBlog, AppleWorld.Today, Lifehacker, sleep/productivity newsletters; AppAdvice and iMore are dead) once real footage exists | Editorial dofollow links + credibility |
| 10 | Student/university angle: student newspaper, university entrepreneurship/news pages, alumni newsletters | .edu editorial links are realistic for a student founder |
| 11 | Crunchbase company profile | Brand entity source, used by AI and journalists |
| 12 | SaaSHub + 3–4 indie launch boards (Uneed, Fazier, Microlaunch, TinyLaunch) | Cheap, a few are dofollow, small real traffic |
| 13 | One "building Locturne" technical post (Expo, SwiftUI, Vision push-ups) on dev.to/Hashnode/Medium, canonical to your own blog | Tech readers link to technical write-ups |
| 14 | One linkable asset on locturne.com (snooze statistics page, wake-method quiz, morning-routine research summary) | Gives listicle writers and journalists something to cite |
| 15 | Wikidata item **only after** 2+ independent press articles exist | Feeds the knowledge graph. Too early and it gets deleted as non-notable |

**Wikipedia:** don't create a page. An article needs "significant coverage in reliable sources that are independent
of the subject", usually several secondary sources, and a single independent source is "almost never sufficient".
Self-written pages about new apps get deleted, and a COI article can backfire.
Source: [WP:Notability](https://en.wikipedia.org/wiki/Wikipedia:Notability).

### Red flags to avoid
- **Fiverr/"500 backlinks for $5" gigs, "1000 directory submissions", GSA/XRumer blasts.** These are spam-policy link
  schemes. At best they're neutralized and wasted. At worst a new domain's first link profile is 95% junk, which can
  delay trust or trigger a manual action.
- **PBNs (private blog networks) and "guest posts on DR 70 sites" sellers.** Paying for followed links breaks Google's
  policy, and SpamBrain now targets both the sellers and the buyers.
- **Link exchanges / "link to me and I'll link to you" rings, three-way swaps.** "Excessive link exchanges" is listed by
  name.
- **Paid "SEO press release" packages promising Google News + 300 sites.** Syndicated copies are nofollow or duplicate
  content. Pay for a wire only if you want a journalist's attention, never for links.
- **Directories that want a reciprocal link or charge for a "dofollow" upgrade.** That's a paid link by definition.
- **Keyword-stuffed anchors** ("best alarm app iPhone") repeated across many sites. Use "Locturne" or the URL.
- **"AI tools" directories with no relevance.** Locturne isn't an AI tool, and listing it as one is misleading as well
  as low value.
- **Mass-created web 2.0 blogs (Blogger/Tumblr/WordPress.com) made only to link to you.** This is a classic thin
  link-scheme pattern. Only use a platform if you'd actually post there.

---

## Part 1: General bulk directories and platforms

Legend.
- **Link:** DF = dofollow, NF = nofollow, UGC = rel=ugc, R = redirect/tracking link (no direct equity). "?" means not
  verified; directory link attributes change often.
- **Alive:** the result of an HTTP check on 2026-10-12.
  - "200" means the page loaded.
  - "403" means a bot wall (Cloudflare), so the site is up but blocked curl.
  - Anything else is noted.
- **Fit:** how well the site suits a consumer iOS app.
  - High: relevant audience.
  - Med: brand/citation only.
  - Low: technically possible, little value.
  - Skip: don't bother.

Verified samples: SaaSHub outbound links are `rel="nofollow"`. Product Hunt routes the website link through a redirect.
Startup Stash links carry no nofollow. Wikimedia sites nofollow all external links.

### A. Product, launch and "alternatives" sites (most relevant)
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| Product Hunt | producthunt.com | Free | NF/R | High | 200 | Plan the launch day. Profile ranks for brand name |
| AlternativeTo | alternativeto.net | Free | NF? | High | 403 (up) | Add as alternative to Alarmy, Opal, one sec, Sleep Cycle. Consumer apps welcome |
| SaaSHub | saashub.com | Free (paid boost optional) | NF (verified) | Med | 200 | Accepts apps. "Alternatives" pages rank well |
| Slant | slant.co | Free | NF? | Med | 403 (up) | "What's the best alarm app for heavy sleepers" style questions. Add as an option |
| BetaList | betalist.com | Paid now (reports say free route ended); expedite fee | DF? | Low | 200 | Aimed at pre-launch startups. Only if you want early signups |
| Uneed | uneed.best | Free queue reportedly closed; paid skip | DF on paid? | Med | 200 | Daily launch board, indie audience |
| Fazier | fazier.com | Free + paid | DF on some tiers? | Med | 200 | Daily launch board |
| Microlaunch | microlaunch.net | Free + paid | ? | Med | 200 | Month-long launch format |
| TinyLaunch | tinylaunch.com | Free + paid | ? | Low | 200 | Weekly launches |
| OpenHunts | openhunts.com | Free + paid | ? | Low | 200 | Product Hunt clone |
| DevHunt | devhunt.org | Free | ? | Skip | 200 | Developer tools only. Locturne doesn't fit |
| Launching Next | launchingnext.com | Free + paid feature | ? | Low | 200 | Startup listing |
| StartupBase | startupbase.io | Free | ? | Low | 200 | Startup listing |
| Startup Stash | startupstash.com | Paid listing | DF (sample) | Low | 200 | Mostly B2B tools. Weak fit |
| SideProjectors | sideprojectors.com | Free | ? | Low | 200 | Marketplace for side projects. Listing as "showcase" |
| Startup Inspire | startupinspire.com | Free + paid | ? | Low | 200 | Small |
| KillerStartups | killerstartups.com | Paid | ? | Low | 200 | Mostly paid placements now |
| Indie Hackers | indiehackers.com | Free | NF/UGC | High | 403 (up) | Product page + build-in-public posts. Real community |
| Peerlist | peerlist.io | Free | NF? | Med | 403 (up) | Weekly "Launchpad" + maker profile |
| Hacker News (Show HN) | news.ycombinator.com | Free | NF | Low-Med | 200 | Only with a technical angle (e.g. Vision push-up counting). Strict rules |
| Crunchbase | crunchbase.com | Free basic | NF | High | 200 | Company entity source for AI + journalists |
| Wellfound (AngelList) | wellfound.com | Free | NF? | Low | 403 (up) | Startup profile. Only useful if hiring/fundraising |
| F6S | f6s.com | Free | ? | Low | 405 (up, blocks HEAD) | Startup profile |

### B. Software review directories (check eligibility)
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| Capterra | capterra.com | Free basic, PPC paid | NF/R | Skip | 403 (up) | Guidelines exclude "personal productivity tools" and "personal apps"; regional text calls listings packaged B2B products. Locturne likely rejected. [Guidelines](https://capterra.com/legal/listing-guidelines/) |
| GetApp | getapp.com | Free basic | NF/R | Skip | 403 (up) | Same Gartner policy. Excludes personal apps. [Guidelines](https://www.getapp.com/listing_guidelines) |
| Software Advice | softwareadvice.com | Free basic | NF/R | Skip | 403 (up) | Same Gartner network, B2B |
| G2 | g2.com | Free basic | NF | Skip | 403 (up) | B2B software reviews |
| SourceForge | sourceforge.net | Free | NF? | Skip | 403 (up) | Allows non-open-source listings, but irrelevant for an iOS consumer app |
| Softpedia | softpedia.com | Free (editor review) | ? | Low | 403 (up) | Has an iOS section; editor discretion |
| Uptodown | uptodown.com | Free | ? | Skip | 200 | Mostly Android APKs |
| MacUpdate | macupdate.com | Free | ? | Skip | 200 | Mac software only |
| AppAgg | appagg.com | Free | ? | Low | 200 | App aggregator, auto-indexes App Store |
| AppRaven (ex-AppSliced) | appraven.net | Free | ? | Low | 200 | Tracks App Store price drops/apps; dev can claim |
| AppPicker | apppicker.com | Free | ? | Low | 200 | iOS app reviews/listings; activity unclear |
| 148Apps | 148apps.com | Free review requests | ? | Low | 200 | Old iOS review site, limited activity |
| alternative.me | alternative.me | Free | ? | Low | 200 | Alternatives directory |
| SimilarSites | similarsites.com | Auto | n/a | Skip | 200 | Auto-generated, no submission |

### C. "AI tools" directories that sometimes take non-AI apps
Locturne isn't an AI product. Listing it as one is low value and arguably misleading. Only list it on a directory that
has a non-AI/productivity category.
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| There's An AI For That | theresanaiforthat.com | Paid | ? | Skip | 403 (up) | AI only |
| Futurepedia | futurepedia.io | Paid | ? | Skip | 200 | AI only |
| Toolify | toolify.ai | Paid | ? | Skip | 403 (up) | AI only |
| AI Tools Directory | aitoolsdirectory.com | Paid | ? | Skip | 200 | AI only |
| Insidr | insidr.ai | Paid | ? | Skip | 200 | AI only |
| TopApps.ai | topapps.ai | Free/paid | ? | Low | 200 | Has general app categories |
| NoCodeList | nocodelist.co | Free | ? | Skip | 200 | No-code tools only |
| ListingBott (service) | listingbott.com | Paid | n/a | Avoid | 200 | Pays to bulk-submit to 100+ directories. This is the bulk pattern to avoid |

### D. General web directories and business citations
These are useful mainly for brand consistency: the same name, URL and description everywhere. Most of the location-based
ones need a physical address, which is a poor fit for an online-only app. **Never publish your home address.**
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| Apple Business Connect | businessconnect.apple.com | Free | n/a | Med | 200 | Apple says online-only businesses can register a brand. Useful for Apple ecosystem branding, not links. [Apple guide](https://support.apple.com/guide/apple-business-connect/intro-abcb205640e7/web) |
| Bing Places | bingplaces.com | Free | n/a | Low | 200 | Location-oriented. Use Bing Webmaster Tools instead |
| Google Business Profile | business.google.com | Free | n/a | Skip | - | Requires a physical location or service area. Online-only businesses aren't eligible |
| Brownbook | brownbook.net | Free | ? | Low | 200 | Global business directory |
| Hotfrog | hotfrog.com | Free | NF? | Low | 403 (up) | Business directory, address expected |
| Cylex | cylex.us.com | Free | ? | Low | 403 (up) | Address expected |
| EZlocal | ezlocal.com | Free | ? | Skip | 200 | Local-only |
| Manta | manta.com | Free basic | NF? | Low | 403 (up) | Small-business directory |
| Spoke | spoke.com | Free | ? | Low | 200 | Company profiles |
| Tupalo | tupalo.com | Free | ? | Skip | 200 | Local |
| n49 | n49.com | Free | ? | Skip | 200 | Canada local |
| Yelp | yelp.com | Free | NF/R | Skip | 403 (up) | Local businesses only |
| Foursquare | foursquare.com | Free | n/a | Skip | 200 | Venues only |
| Yellow Pages | yellowpages.com | Free basic | NF | Skip | 403 (up) | Local |
| Jasmine Directory | jasminedirectory.com | Paid (reviewed) | DF | Low | 200 | Curated paid web directory. Arguably a paid link; low value |
| Best of the Web (BOTW) | botw.org | Paid | DF? | Avoid | 403 (up) | Paid directory link = paid link. Skip |
| Curlie (ex-DMOZ) | curlie.org | Free | DF | Skip | 504 timeout | Volunteer editors largely inactive; submissions rarely reviewed |
| AboutUs | aboutus.com | Free | ? | Skip | 429 | Thin auto-pages |
| Webwiki | webwiki.com | Free | ? | Skip | 403 (up) | Auto-generated site reviews |
| SitePrice / site-worth sites | siteprice.org | Auto | n/a | Skip | 200 | Auto-generated junk links. Ignore if they appear |
| Trustpilot | trustpilot.com | Free basic | NF | Low | 403 (up) | Reviews belong in the App Store instead. Skip until there's a web purchase flow |
| Sitejabber (now SmartCustomer) | sitejabber.com | Free | NF | Skip | 200 (redirects to smartcustomer.com) | Rebranded; e-commerce focus |

### E. Social bookmarking and curation (still alive)
All of these give nofollow links or links in user-generated content, so the value is discovery and traffic, not
rankings.
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| Pinterest | pinterest.com | Free | NF | Med | 200 | Morning-routine/sleep content does well on Pinterest. Pins link to site. Real traffic potential |
| Flipboard | flipboard.com | Free | NF | Low | 200 | Make a magazine of your blog posts |
| Scoop.it | scoop.it | Free tier | NF? | Low | 200 | Repositioned as business content curation |
| Pearltrees | pearltrees.com | Free | NF? | Low | 200 | Curation, small audience |
| Diigo | diigo.com | Free | NF? | Low | 403 (up) | Research bookmarking. Low value |
| Mix | mix.com | Free | NF? | Skip | 200 (page loads) | StumbleUpon successor (2018). Activity in 2025-26 unclear |
| Wakelet | wakelet.com | Free | NF? | Low | 200 | Collections; education-heavy audience |
| Raindrop.io | raindrop.io | Free | NF | Skip | 200 | Mostly private bookmarking |
| Instapaper | instapaper.com | Free | n/a | Skip | 200 | Private read-later |
| Pocket | getpocket.com | n/a | n/a | Dead | 200 (shell) | Mozilla shut Pocket down in July 2025 |
| Folkd | folkd.com | Free | ? | Skip | 403 | Old bookmarking site, spam-heavy |
| Reddit | reddit.com | Free | NF/UGC | High | 403 (up) | Real communities; heavily cited by AI answers. Follow each sub's self-promo rules |
| Quora | quora.com | Free | NF | Med | 403 (up) | Answer "how to stop snoozing" questions honestly, with disclosure |
| Tildes / Lobsters | tildes.net / lobste.rs | Invite-only | NF | Skip | 200 | Invite-only; Lobsters is tech-only |

### F. Web 2.0, publishing and profile sites
Use these where you'd actually publish. Profile links are nofollow on most of them, but they help the brand name rank and
build `sameAs` entity signals.
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| Medium | medium.com | Free | NF | Med | 403 (up) | Republish blog posts with canonical tag |
| Substack | substack.com | Free | DF in posts? | Med | 200 | A "morning notes" newsletter could double as a blog |
| dev.to | dev.to | Free | NF/UGC? | Med | 200 | Technical build posts (Expo, SwiftUI, Vision) |
| Hashnode | hashnode.com | Free | ? | Med | 200 | Can host a blog on your own subdomain (blog.locturne.com) |
| WordPress.com | wordpress.com | Free | ? | Low | 200 | Only if you'd really blog there; your own site is better |
| Blogger | blogger.com | Free | DF | Avoid | 200 | Spam-network association. Skip |
| Tumblr | tumblr.com | Free | ? | Low | 200 | Aesthetic/mood posts could fit Loc's voice |
| Vocal Media | vocal.media | Free + paid | NF? | Low | 200 | Story platform |
| HubPages | hubpages.com | Free | NF? | Low | 403 (up) | Editorial standards; low ROI |
| GitHub | github.com | Free | NF in READMEs | Med | 200 | Org/profile + any open-source bits (e.g. Expo modules) linking to site |
| GitLab | gitlab.com | Free | NF | Skip | 200 | Duplicate of GitHub |
| LinkedIn | linkedin.com | Free | NF | Med | 200 | Company page + founder posts |
| X / Threads / Bluesky / Mastodon | x.com, threads.net, bsky.app, mastodon.social | Free | NF | Med | 200 | Brand profiles; claim the handle everywhere |
| TikTok / Instagram / YouTube | - | Free | NF | High | - | The primary channel anyway; bio links + YouTube descriptions |
| Behance / Dribbble | behance.net / dribbble.com | Free | NF? | Low-Med | 403/202 (up) | Post the Moonwell orb / UI shots; design audience, occasional press pickup |
| SlideShare | slideshare.net | Free | NF | Skip | 200 | No natural use |
| Issuu | issuu.com | Free tier | NF? | Skip | 200 | Press-kit PDF only |
| Flickr | flickr.com | Free | NF | Skip | 200 | Low value |
| Vimeo / Dailymotion | vimeo.com / dailymotion.com | Free | NF | Low | 200 | Mirror the app preview video |
| SoundCloud | soundcloud.com | Free | NF | Skip | 200 | Only if Loc's voice clips become a thing |
| About.me / Linktree / Gravatar | about.me / linktr.ee / gravatar.com | Free | NF | Low | 200 | Founder profile pages; minor entity signal |

### G. Press-release distribution
Release links are nofollow, or should be treated as if they were. Only pay for a release if a real announcement
(launch, milestone) could get journalists to write their own stories.
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| PRLog | prlog.org | Free; paid upgrades | Mostly NF (old reports: 1 followed link on free) | Low | 200 | Most-used free option |
| OpenPR | openpr.com | Free | NF? | Low | 403 (up) | Free, German-run |
| PR.com | pr.com | Free company profile; releases paid | NF? | Low | 200 | Company directory + paid releases |
| PRFree.org | prfree.org | Free + paid | ? | Low | 200 | Small |
| 1888 Press Release | 1888pressrelease.com | Free basic + paid | NF? | Low | 200 | Small |
| EIN Presswire | einpresswire.com | ~$99.95–$149/release (third-party reports, verify) | NF | Low | 200 | Cheapest "real wire"; syndication copies carry no SEO value |
| Newswire | newswire.com | Paid (hundreds $) | NF | Skip | 200 | Too expensive for this budget |
| PR Newswire / Business Wire | - | $400–$1,000+ | NF | Skip | - | Overkill |
| Pressbox (UK) | pressbox.co.uk | - | - | Dead? | No response | Didn't respond |
| Better: pitch directly | email | Free | DF editorial | High | - | A personalized pitch + press kit page on locturne.com beats every wire |

### H. Wiki / knowledge sites
| Site | URL | Cost | Link | Fit | Alive | Notes |
|---|---|---|---|---|---|---|
| Wikidata | wikidata.org | Free | NF | Med (later) | 200 | Needs "serious and publicly available references". Create after real press exists, or it's likely deleted |
| Wikipedia | en.wikipedia.org | Free | NF | Skip for now | - | Fails notability until there's multiple independent in-depth coverage. COI editing discouraged |
| Fandom / niche wikis | - | Free | NF | Skip | - | No relevant wiki |

### I. Where the real (editorial) links are (not directories, but where the value is)
| Target | How | Cost | Link | Fit |
|---|---|---|---|---|
| "Best alarm apps for heavy sleepers" listicles (Google these + "Alarmy alternatives", "apps to stop snoozing", "app blocker iPhone") | Email the author with a short pitch + promo code | Free | DF editorial | Highest |
| iOS/app blogs and newsletters (MacStories, 9to5Mac, AppAdvice, iPhone-focused YouTubers) | Pitch with real footage after the Nov videos | Free | DF editorial | High |
| Sleep/productivity/student-life writers and podcasts | Founder story: student builds app that keeps apps asleep until you get out of bed | Free | DF editorial | High |
| University newspaper, entrepreneurship centre, department news | Student founder angle | Free | DF .edu | High |
| Expo / React Native community (Expo blog showcase, "Made with Expo") | Submit as a showcase app | Free | DF? | Med |
| HARO-style journalist request services (Qwoted, Featured.com, Help a B2B Writer) | Answer sleep/productivity queries as a founder | Free tiers | DF editorial (sometimes) | Med |

Sources: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies) ·
[Dec 2022 link spam update](https://developers.google.com/search/blog/2022/12/december-22-link-spam-update) ·
[Evolving nofollow](https://developers.google.com/search/blog/2019/09/evolving-nofollow-new-ways-to-identify) ·
[Illyes: links not top 3](https://searchengineland.com/links-google-search-ranking-factor-gary-illyes-432422) ·
[Illyes: very few links](https://searchenginejournal.com/google-needs-very-few-links/514494) ·
[Press-release links nofollow](https://searchengineland.com/google-links-in-a-press-release-should-be-nofollowed-like-advertisements-168339) ·
[Apple: ~65% of downloads after search](https://searchads.apple.com/advanced) ·
[Capterra listing guidelines](https://capterra.com/legal/listing-guidelines/) ·
[GetApp listing guidelines](https://www.getapp.com/listing_guidelines) ·
[Apple Business Connect](https://support.apple.com/guide/apple-business-connect/intro-abcb205640e7/web) ·
[BetaList support](https://betalist.com/support) ·
[Wikipedia notability](https://en.wikipedia.org/wiki/Wikipedia:Notability)
