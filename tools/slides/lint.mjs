// Automatic checks on a deck, shared by the studio (browser) and audit.mjs (node). They catch the mechanical rules from
// docs/SLIDESHOW_LOOP.md; the judgement calls stay in the hand-scored rubric (rubric.json).
// Each finding: { level: 'fail' | 'warn' | 'ok', rule, text }.

const REACH = ['share', 'identity', 'comments'];
const APP_WORDS = /\blocturne\b|\bmy app\b|\bthis app\b|\bthe app\b|\bapps? (go|going|went) to sleep\b|\bapps? (are|stay) asleep\b|\bloc\b/i;
const CTA_WORDS = /link in bio|download|app store|it'?s called/i;

// Every piece of on-slide text, flattened (caps, split halves, lists).
export function slideText(s) {
  const out = [];
  const add = (v) => {
    if (v == null) return;
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(add);
    else if (typeof v === 'object') { add(v.text); add(v.caps); add(v.line); add(v.title); add(v.heading); }
  };
  for (const k of ['title', 'aside', 'heading', 'top', 'text', 'bottom', 'line', 'question', 'lines', 'items', 'caps', 'sub', 'rows']) {
    const v = s[k];
    if (s.layout === 'split' && (k === 'top' || k === 'bottom')) { add(v?.caps); continue; }
    if (s.layout === 'meme' && (k === 'top' || k === 'bottom')) { add(v); continue; }
    add(v);
  }
  return out.join(' ').replace(/[_*]/g, '').replace(/\s+/g, ' ').trim();
}
const words = (t) => (t.match(/[\p{L}\p{N}'’]+/gu) ?? []).length;
const showsApp = (s) => !!s.phone || (typeof s.image === 'string' && s.image.includes('/renders/')) || APP_WORDS.test(slideText(s));
const images = (s) => [s.image, s.bg, s.avatar, s.phone, ...(s.images ?? []), s.top?.image, s.bottom?.image].filter((x) => typeof x === 'string');

// credits: photos/credits.json; anything in /photos/ root that isn't credited (and isn't the founder's own) may be AI.
export function lint(deck, credits = {}, hooks = null, refs = {}) {
  const f = [], push = (level, rule, text) => f.push({ level, rule, text });
  const slides = deck.slides ?? [];
  const reach = REACH.includes(deck.job);
  const check = (deck.check ?? []).join(' ').toLowerCase();

  if (!deck.job) push('fail', 'job', 'No job set (share, save, comments, identity or promo).');

  // One-slide posts are all text by design ("type c girl", "is it just me"), so they get a longer limit.
  // The glance test is the headline: a hook slide's small grey aside ("(be honest)", "(save this…)") doesn't count.
  // Two-caption layouts (meme top/bottom, split halves) read top first; the glance test is the top caption.
  const first = slides[0], hookSlide = !first ? null : first.layout === 'hook' ? { ...first, aside: null }
    : first.layout === 'meme' ? { layout: 'meme', top: first.top } : first.layout === 'split' ? { layout: 'split', top: first.top } : first;
  const hook = hookSlide ? slideText(hookSlide) : '';
  const hw = words(hook), [soft, hard] = slides.length === 1 ? [30, 45] : [14, 22];
  if (!hook) push('warn', 'hook', 'Slide 1 has no text; only fine if the image is the whole joke.');
  else if (hw > hard) push('fail', 'hook', `Slide 1 has ${hw} words; aim for ${soft} or fewer.`);
  else if (hw > soft) push('warn', 'hook', `Slide 1 has ${hw} words; aim for ${soft} or fewer.`);
  else push('ok', 'hook', `Slide 1: ${hw} words.`);

  // The app's role is declared per deck (deck.app), defaulting to none for reach jobs. Roles: none, confession
  // (inside a tip, mid-deck), method ("how i actually do it", late), punchline (the reveal, last two slides),
  // intro (the doomscrolled-intro format, where the reference itself opens on the work).
  const role = deck.app ?? (reach ? 'none' : null);
  const appAt = slides.map((s, i) => (showsApp(s) ? i + 1 : 0)).filter(Boolean), n = slides.length;
  if (!role) push('warn', 'app', 'No app role set (deck.app: none, confession, method, punchline or intro).');
  if (role === 'none' && appAt.length) push('fail', 'app', `App role is none but the app shows on slide ${appAt.join(', ')}.`);
  if (role && role !== 'none' && !appAt.length) push('warn', 'app', `App role is ${role} but no slide shows the app.`);
  if (role !== 'intro' && appAt[0] === 1) push('fail', 'app', 'The app is on slide 1. It must never be the hook.');
  if (role === 'punchline' && appAt.some((i) => i < n - 1)) push('warn', 'app', `Punchline app should sit in the last two slides, not ${appAt.join(', ')}.`);
  if (role === 'confession' && appAt.some((i) => i < 3)) push('warn', 'app', 'A confession lands after two or more real points (slide 3+).');
  if (role && role !== 'none' && appAt.length) push('ok', 'app', `App (${role}) on slide ${appAt.join(', ')} of ${n}.`);

  // A closing question/CTA only where the reference post has one (refs.json closer: true, checked 2026-11-13):
  // growing.diaries and charlotte do; notes listicles, dark lists, dumps and intros end on content.
  if (slides.length > 1 && refs[deck.compare]?.closer) {
    const last = slideText(slides[slides.length - 1]);
    if (!last.includes('?') && !CTA_WORDS.test(last)) push('warn', 'comment', 'The reference ends on a question or CTA; this deck does not.');
  }
  // The post caption is the cheapest comment pull: a question with a one-word answer (iteration 36).
  const asks = (t) => t.includes('?') || /^is it just me|anyone else|which one|how many/i.test(t);
  if (deck.caption && !asks(deck.caption) && !slides.some((s) => asks(slideText(s)))) push('warn', 'comment', 'No question in the slides or the caption; end the caption with one people can answer in a word.');
  if (deck.job === 'comments' && !/trauma|sound/i.test(deck.format ?? '') && !slides.some((s) => slideText(s).includes('?') || /just me|same|anyone else/i.test(slideText(s)))) {
    push('warn', 'comment', 'Comment deck has no question or "same" bait on any slide.');
  }

  const firstPerson = slides.some((s) => /\b(i|i'm|i've|my|me)\b/i.test(slideText(s)) && APP_WORDS.test(slideText(s)));
  if (firstPerson && !(deck.check ?? []).length) push('warn', 'truth', 'First-person app claims but an empty check list.');

  // credits.json marks AI-made photos with creator 'AI'; uncredited root photos count as unknown.
  const isAI = (p) => { const c = credits[p.slice(8)]; return !c || c.creator === 'AI'; };
  // Only full-bleed photos read as "me". Small inline photos in notes layouts (hook/point/checklist/closer) illustrate
  // a point, like the stock-style photos in the viral notes listicles, so they're not counted (iteration 39).
  const FULL = new Set(['pic', 'full', 'photo', 'letterbox', 'split', 'screen', 'meme']);
  const fullImages = (s) => (FULL.has(s.layout) ? images(s) : []);
  const ai = [...new Set(slides.flatMap(images))].filter((p) => /^\/photos\/[^/]+$/.test(p) && !p.includes('founder') && isAI(p));
  if (ai.length && !check.includes('ai')) push('fail', 'images', `AI-made or uncredited photo(s) ${ai.join(', ')} with no AI-label note in the check list.`);
  // A founder-voice deck ("i built this") must never put an AI person on screen: it would pass them off as the founder.
  const fullSet = new Set(slides.flatMap(fullImages));
  const aiFace = ai.filter((p) => fullSet.has(p) && /selfie|girl|guy|closeup|bed-[abc]/.test(p));
  // Same for the face / Day-N account: it's Luke's own face account, so a "me" over an AI person would be him impersonated.
  // Real photos with a visible stranger's face (credits.json face: true) are the same problem under "me" (iteration 34).
  const realFace = [...new Set(slides.flatMap(fullImages))].filter((p) => /^\/photos\/[^/]+$/.test(p) && credits[p.slice(8)]?.face);
  if (/founder|face|@locturne/i.test(deck.account ?? '') && realFace.length) push('fail', 'images', `Luke's account, but ${realFace.join(', ')} shows a real stranger's face. Use a faceless photo.`);
  if (/founder|face|@locturne/i.test(deck.account ?? '') && aiFace.length) push('fail', 'images', `This is one of Luke's accounts, but a full-bleed photo shows an AI person (${aiFace.join(', ')}). Use Luke's real photo or a faceless one.`);
  const dayFace = ai.filter((p) => /day-selfie/.test(p));
  if (dayFace.length) push('warn', 'images', `Daylight AI face ${dayFace.join(', ')}: the rules allow AI only for dim scenes. Swap for a real photo.`);
  if ([...new Set(slides.flatMap(images))].some((p) => p.includes('founder-selfie'))) push('warn', 'images', 'Uses the placeholder founder selfie; swap in the real one.');

  // Renders that show features the app no longer has (e.g. "Go downstairs", removed 2026-11-07).
  const RETIRED = ['/photos/renders/12-wake-methods-clean.png'];
  const stale = [...new Set(slides.flatMap(images))].filter((p) => RETIRED.includes(p));
  if (stale.length) push('fail', 'truth', `Stale render ${stale.join(', ')} shows a removed feature. Re-render it from the current app.`);
  if (!deck.compare) push('warn', 'proven', 'No reference post (compare) set.');
  // Hook formulas from hooks.json: say which proven formula slide 1 uses, or flag that it uses none.
  // Formats the image, layout or sound carries (painting, reaction pic, split panels…) don't need a text formula.
  const carried = /painting|reaction|quote|meme|trauma|mindset|dump|split|bro/i.test(deck.format ?? '');
  if (hooks && hook) {
    const hit = hooks.formulas.find((h) => new RegExp(h.match, 'i').test(hook));
    if (hit) push('ok', 'proven', `Hook formula: ${hit.key} (${hit.evidence}).`);
    else if (!carried) push('warn', 'proven', 'Slide 1 matches no proven hook formula (hooks.json).');
    if (hit && deck.job && hit.job !== deck.job && !(hit.job === 'promo' || deck.job === 'promo'))
      push('warn', 'job', `Hook formula ${hit.key} usually does the ${hit.job} job, but the deck is ${deck.job}.`);
  }
  // Save hooks need a number OR a proven save formula: helen's numberless "weird hacks my psychiatrist gave me" got 974K saves.
  const saveHit = hooks?.formulas.some((h) => h.job === 'save' && new RegExp(h.match, 'i').test(hook));
  if (deck.job === 'save' && hook && slides.length > 1 && !/\d/.test(hook) && !saveHit && !carried) push('warn', 'hook', 'Save deck hook has no number and no proven save formula.');
  if (!deck.caption) push('warn', 'caption', 'No caption.');
  if (!deck.sound) push('warn', 'sound', 'No sound picked.');
  return f;
}

export function scoreTotal(deck) {
  const s = deck.score ?? {};
  const vals = Object.entries(s).filter(([k, v]) => typeof v === 'number' && k !== 'total');
  return vals.length ? vals.reduce((a, [, v]) => a + v, 0) : null;
}
