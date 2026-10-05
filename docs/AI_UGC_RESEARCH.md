# AI UGC marketing: how to generate clips (research, 2026-10-04)

The question: can we generate TikTok/Reels clips for Locturne with AI instead of
filming everything ourselves, and how?

**Short answer:** yes, but only one AI format is cheap, proven for indie apps, and
safe: **AI-image slideshows**. AI talking-head "UGC actors" work for *paid ads*,
cost ~$2–11 per clip, and carry real legal and reach risks for organic posting.
The best fit for Locturne is a hybrid: AI makes the hook and the volume, and
**real screen recordings of the app** do the selling. That keeps the existing
plan (real-footage videos from ~mid-Nov) and adds AI on top of it.

---

## 1. The three ways people generate "UGC" clips

| Format | What it is | Tools | Cost per clip | Best for |
|---|---|---|---|---|
| **A. AI slideshow** | 6 AI-generated images with text overlays, posted as a TikTok photo carousel, trending sound added by hand | gpt-image-1.5 / any image model + text overlay script; ReelFarm, Larry (OpenClaw skill) | cents | Organic TikTok volume |
| **B. Hook + demo** | 3–5 s AI avatar (or real person) saying a hook, then a screen recording of the app | ReelFarm, ClipUGC, Creatify, MakeUGC; or CapCut by hand | ~$1–10 | Organic + paid |
| **C. Full AI actor ad** | AI person talks to camera for 15–30 s like a creator review | Arcads, MakeUGC, HeyGen, Creatify; raw models Veo 3.1 / Sora 2 / Kling 3 / Seedance 2 | ~$2–11 (tools), ~$1–4 per 8 s (raw models) | Paid ads A/B testing |

### Rough tool prices (late 2026, from review sites, check before buying)
- **Creatify:** free 10 credits; $39/mo (100 credits); 15 s ad ≈ $1.65–1.95.
- **MakeUGC:** ~$49–149/mo; ≈ $6–10 per video.
- **Arcads:** ~$110/mo for 10 videos (≈ $11 each); no free trial. Most realistic actors.
- **HeyGen:** free (3 watermarked/mo), $29 Creator, $49 Pro.
- **Raw video models** (via their own apps or API resellers): 8 s clip ≈ Kling $1.20,
  Veo 3 $2.50, Sora 2 $4.00. Seedance 2 is called best for lip-sync spokesperson clips.

### The "AI creator" model (B done with a persistent persona)
This is the version of Format B that indie app marketers mean by "AI UGC": a
**fictional creator** with a fixed face, voice and backstory gets their own
TikTok account. Every post is a 3–5 s AI clip of that person saying a hook
(in bed, holding a phone, looking tired), then a cut to a **real screen recording**
of the app.

How it's built:
1. **Persona:** a specific person with a real reason to need the app
   ("night-shift nurse who can't stop scrolling at 3 am", "college sophomore with
   an 8 am who snoozes 7 alarms"). One persona per account, and different personas
   pull different audiences.
2. **Face, made once:** generate reference stills (gpt-image / Nano Banana), then lock
   the identity (Higgsfield Soul ID / "Elements", or keep reusing the same reference
   image).
3. **Hook clip:** image-to-video with lip-sync. Seedance 2 (via Higgsfield) is the
   current pick for talking heads, and Kling 3 / Veo 3.1 also work. Voice is the
   model's native audio or ElevenLabs. Roughly $0.50–3 per 5 s hook.
4. **Demo:** the same bank of real app screen recordings, cut in CapCut with
   captions.
5. **Post** 1–3 a day per account after a 7–14 day warm-up, and label it as AI.

Evidence: commonly cited, but mostly anecdotal. The famous example, **Cal AI**, grew
with ~150 *real* paid creators, not AI ones. Claims like "an AI calorie app makes
$30–70K/mo from AI influencers" are unverified. The model is plausible and cheap,
but nobody has published hard numbers.

Locturne-specific risk: the persona *implies* they use the app. Keep hooks as
situations, questions or descriptions ("POV: your phone won't open TikTok until
you walk downstairs"), not results ("this fixed my sleep"), and label as AI.

## 2. What actually has evidence

Most "AI UGC gets 350% more engagement" stats come from **vendor blogs with no
methodology** (Superscale etc.). Ignore them. The credible signals:

- **Larry / Oliver Henry (OpenClaw agent), early 2026:** an agent making 6-slide
  AI-image TikTok slideshows for two iOS apps got ~500K views in 5 days and pushed
  MRR to ~$670–714. That is the clearest indie-app result. It is modest money; the
  big number is the views.
- **An independent test of OpenClaw automation** found automated posts performed
  about the same as manual ones (+7% views). The win was **posting 3× more often**,
  which finds winning hooks faster. AI doesn't make a post better. It makes more of them.
- **Views ≠ installs:** videos with engaged comment sections convert far better
  than bigger videos with passive comments. Hooks that start an argument
  ("is this too extreme?") beat pure spectacle.

### Larry's slideshow recipe (copyable)
1. Hook slide: a person + conflict ("My roommate said I'd never get up before 9 so I…")
2. Problem slide
3. Reveal / before-after
4. Reaction / payoff
5. CTA slide (specific: "it's called Locturne")
6. Follow slide

Process: generate images with gpt-image-1.5 → upload as **drafts** → add a trending
sound by hand in the TikTok app (the API can't, and sound is a big reach multiplier)
→ post. Warm a new account up for 7–14 days of normal use before posting.

## 3. Rules and risks (important)

- **TikTok AIGC label:** required on realistic AI people or scenes. Since
  **21 Jul 2026** it's mandatory on AI content in **ads** too. Unlabeled AI that
  TikTok detects (incl. C2PA metadata) gets demoted, and repeat offenders get removed.
  Labeled AI people still get lower For You priority.
- **Unoriginal / mass-produced content:** the #1 cause of For You suppression
  in 2026. Same slideshow on many accounts, template farms, and recycled images
  all get flagged. Every post needs its own images and text.
- **FTC (US):** AI actors are legal, but an **AI person saying "I used this app and it
  changed my mornings" is a fake testimonial** (16 CFR 465.2). Penalty up to
  ~$53K per violation. Fine: AI actor reading a *hook* or describing the product
  ("this app locks your apps until you walk downstairs"). Not fine: invented
  personal results.
- **Trust gap:** surveys put trust in human UGC around 81% vs 63% for AI UGC.

## 4. Recommendation for Locturne

Locturne has a big advantage: the product is **visual and physical** (phone
locked → walk downstairs → barometer unlocks apps). AI can't fake that UI
convincingly, and it is the part that sells. So:

1. **Keep real footage as the core** (already the plan for ~mid-Nov). Record a
   bank of screen recordings once: lock screen, Loc the raccoon, the downstairs
   unlock, the 200-step walk. These get reused in every clip.
2. **Format A first (cheapest, proven):** AI-image slideshows about the *problem*
   (doomscrolling in bed, snoozing 6 alarms), with the last slides showing real
   app screenshots. Near-zero cost. Generate a few by hand before automating anything.
3. **Format B / AI creator accounts:** run 1–2 AI personas next to your own
   face-on account, each doing hook + real demo. A persona costs ~$20–40/mo
   (Higgsfield or Creatify) and lets you test far more hooks than you could film.
   Compare its view → install numbers against your own videos after ~30 posts.
   Skip Arcads ($110+).
4. **Skip Format C** for organic posting. Revisit only if you run paid ads, and
   then never give an AI actor personal-experience claims.
5. **Always label AI** content in TikTok post settings. One account per format,
   no duplicate posts.

**Budget:** $0–40/month is enough.

### Hook ideas that fit the format
- "My phone won't let me open TikTok until I walk downstairs."
- "I made my apps sleep until I get out of bed. Day 1:"
- "POV: you have to walk 200 steps before Instagram opens."
- "Is this too extreme for someone who snoozes 7 alarms?"

## Sources
- [Larry skill deep dive (stack-junkie)](https://www.stack-junkie.com/blog/how-to-automate-tiktok-marketing-with-openclaw-larry-skill-deep-dive)
- [Postiz: AI agent millions of TikTok views](https://postiz.com/blog/ai-agent-tiktok-views-postiz-api)
- [OpenClaw automation hard truths](https://growwstacks.com/blog/openclaw-social-media-automation-hard-truths)
- [ReelFarm](https://reel.farm/)
- [Higgsfield: consistent AI characters](https://higgsfield.ai/blog/tools-for-consistent-ai-characters)
- [Seedance 2.0 on Higgsfield](https://higgsfield.ai/seedance/2.0)
- [AI influencers on TikTok (Wayin)](https://wayin.ai/blog/ai-influencers-on-tiktok/)
- [Cal AI marketing: real creators (Shortimize)](https://www.shortimize.com/blog/cal-ais-marketing-strategies-lessons-from-a-400k-mrr-success-story)
- [TikTok AI content policy 2026 (Cinerads)](https://www.cinerads.com/blog/tiktok-ai-content-policy)
- [AI ad disclosure requirements 2026](https://www.cinerads.com/blog/ai-ad-disclosure-requirements)
- [TikTok slideshow unoriginal-content flag (OpenClip)](https://openclip.app/guides/tiktok-slideshow-unoriginal-content-flag)
- [FTC rules for AI testimonials](https://ugcvids.ai/blog/ftc-rules-for-ai-testimonials-in-ugc-ads-2026)
- [Arcads pricing (eesel)](https://www.eesel.ai/blog/arcads-ai-pricing)
- [Creatify pricing (wireflow)](https://www.wireflow.ai/blog/creatify-pricing)
- [MakeUGC pricing (superscale)](https://superscale.ai/alternatives/makeugc/pricing)
- [HeyGen pricing (arcade)](https://www.arcade.software/post/heygen-pricing)
- [Veo vs Sora vs Kling costs (lensgo)](https://lensgo.ai/blog/veo-3-vs-sora-2-vs-kling-2-best-ai-video-model-2026)
- [AI vs human UGC "study" (vendor; numbers unsourced)](https://superscale.ai/learn/ai-vs-traditional-ugc-complete-comparison/)
- [Views vs comments (Playkit)](https://playkit.substack.com/p/views-vs-comments-the-hidden-conversion-engine-68f1)
