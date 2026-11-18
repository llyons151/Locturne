"""Slideshows 10+ for the studio. Each copies the structure of a studied viral post (see
docs/reports/Why slideshows go viral 2026-11-12.md) with Locturne's own words. Run: python3 gen/decks_more.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'decks')
R, A, P, L = '/photos/renders/', '/photos/art/', '/photos/', '/photos/loc/'
TALL, NOTE = [1080, 1920], [1080, 1350]

def cap(text, y=55, size=54, style='classic', w=78, color=None, align=None, igY=None):
    c = {'text': text, 'y': y, 'size': size, 'style': style, 'w': w}
    if color: c['color'] = color
    if align: c['align'] = align
    if igY is not None: c['igY'] = igY  # caption y for the Instagram 4:5 re-render
    return c
def pic(img, *caps): return {'layout': 'pic', 'image': img, 'caps': list(caps)}
def box(img, *caps): return {'layout': 'letterbox', 'image': img, 'caps': list(caps)}
def full(img, *caps): return {'layout': 'full', 'image': img, 'caps': list(caps)}
def paper(t): return {'layout': 'paper', 'text': t}
def split(ti, tc, bi, bc, y=50, size=54, style='classic'):
    return {'layout': 'split', 'top': {'image': ti, 'caps': [cap(tc, y, size, style)]}, 'bottom': {'image': bi, 'caps': [cap(bc, y, size, style)]}}
CREAM = '#f7eba8'
AI = "AI-made photo: turn on TikTok's AI-generated label, or swap in your own"
LOCBOX = cap('link in bio 🌙', 94, 59, 'box')
LOCBOX_R = cap('link in bio 🌙', 94, 59, 'box', igY=10)   # on renders: IG shrinks the phone, so the box sits above it

D = {}
def deck(name, **k): D[name] = k

# ---------- share: one-slide relatable (zararose 412K / peyt 3.9M) ----------
REL = dict(format='One-slide relatable on a dim photo', job='share', account='face / Day-N account', size=TALL)
deck('10-relatable-alarm-tiktok', **REL, compare='zararose-phone-in-bed', title='opening tiktok "just to wake up"',
  why='Names a habit everyone does and nobody admits; lowercase, cream TikTok Classic at 54px like the original.',
  caption='every single morning. which app is first? #relatable #morning #phoneaddiction', sound='trending sad sound', check=[],
  slides=[pic(P+'pillow-over-head.jpg', cap('when the alarm goes off and i open tiktok "just to wake up"', 56, 54, color='#222'))])
deck('11-relatable-sleep-math', **REL, compare='peyt-phone-in-bed-room', title='sleep math at 1:27am',
  why='The 1am sleep-maths panic is universal; a real clock photo does the work, no face needed.',
  caption="if i fall asleep right now i get 5 hours and 12 minutes. what's your number tonight? #sleep #relatable", sound='trending sad sound', check=[],
  slides=[pic(P+'clock-127.jpg', cap('me at 1:27am calculating how much sleep i get if i fall asleep right now', 16, 58, color='#222'))])
deck('12-relatable-one-more', **REL, compare='zararose-phone-in-bed', title='"one more video" 47 videos ago',
  why='Self-roast with a number; the dim half-hidden face reads as a real snapshot.',
  caption="i was being honest at the time. what's your number? #relatable #doomscrolling #sleep", sound='trending sad sound', check=[],
  slides=[pic(P+'pov-bed-phone.jpg', cap('"one more video" — me, 47 videos ago', 64, 54, 'outline'))])
deck('13-relatable-room-2am', **REL, compare='peyt-phone-in-bed-room', title='the room at 2am',
  why="Peyt's empty-room trick: no person, just the scene, so every viewer puts themselves in it.",
  caption='i said 11. what time did you say? #relatable #bedtime #sleepschedule', sound='trending sad sound', check=[],
  slides=[pic(P+'bedroom-night-purple.jpg', cap("my room at 2am when i told everyone i'd be asleep by 11", 68, 62))])
deck('14-relatable-unmade', **REL, compare='peyt-phone-in-bed-room', title='"just checking something quick"',
  why='A real photo of a wrecked bed plus a phrase people say every night.',
  caption='it was not quick. tiktok or youtube? #relatable #phoneinbed', sound='trending sad sound', check=[],
  slides=[pic(P+'unmade-bed.jpg', cap('the bed after one night of "just checking something quick"', 60, 62, color='#222'))])

# ---------- share: reaction picture letterboxed on black (egg 4.6M, 845K shares) ----------
EGG = dict(format='"Me in bed every morning…" reaction picture on black', job='share', compare='egg-me-in-bed',
           account='@loc (Loc account)', size=TALL, sound='morning flower alarm (the original\'s sound)')
deck('15-egg-loc-crossed', **EGG, title='me in bed every morning',
  why='The egg works because it is a blank, unimpressed face in bed; Loc arms-crossed in a real bed is the same energy, and he is our own art.',
  caption='every. single. morning. what time did you actually get up? #relatable #morning #school', check=['Loc is pasted onto a real CC photo; that is the joke, fine as is'],
  slides=[box(L+'loc-bed-crossed.jpg', cap('me in bed every morning after 6 hours of screen time wondering why i\'m tired', 66, 54, 'outline', 74))])
deck('16-egg-loc-point', **EGG, title='me pointing at the alarm',
  why='Same reaction-picture shape; the point is the punchline.',
  caption='not today. how many snoozes? #relatable #snooze', check=[],
  slides=[box(L+'loc-bed-point.jpg', cap('me at 7am telling the alarm i\'ll get up at the next one', 66, 54, 'outline', 74))])
deck('17-egg-flaming-june', **EGG, title='after the 4th snooze',
  why='A sleeping woman in a 1895 masterpiece, captioned like a meme: incongruity stops the scroll.',
  caption='she has a 9am. what time is yours? #snooze #relatable #art', check=[],
  slides=[box(A+'flaming-june.jpg', cap('me after my alarm told me to wake up 4 times', 72, 54, 'outline', 80))])

# ---------- share: old painting + modern caption (3.7M) ----------
ART = dict(format='Old painting + modern caption', job='share', compare='lvnarjules-painting-meme', account='@loc or @locturne',
           size=TALL, sound='trending sound')
deck('18-art-nightmare', **ART, title='my phone on my chest at 2am',
  why="Fuseli's Nightmare literally has a demon sitting on a sleeper's chest; the modern caption makes the demon your phone.",
  caption='he lives here now. which app is yours? #art #phoneaddiction #sleep', check=[],
  slides=[box(A+'nightmare2.jpg', cap('my phone sitting on my chest at 2am asking if i want to see 40 more videos', 64, 46, 'outline', 80))])
deck('19-art-desperate', **ART, title='3am realisation',
  why="Courbet's wide-eyed self-portrait is a perfect 3am face.",
  caption="i don't even like cooking. what's your 3am video? #3am #doomscrolling #art", check=[],
  slides=[box(A+'desperate-man.jpg', cap('me at 3am realising i just watched 2 hours of strangers cooking', 66, 46, 'outline', 80))])
deck('20-art-cockaigne', **ART, title='everyone in my house at 9am',
  why="Bruegel's Land of Cockaigne is people collapsed everywhere; caption it as the morning after.",
  caption='the wifi was too good. what time did you put it down? #art #relatable', check=[],
  slides=[box(A+'cockaigne.jpg', cap('everyone in my house at 9am after "one more episode" at 2', 64, 46, 'outline', 80))])
deck('21-art-gypsy', **ART, title='the alarm in 2 hours',
  why="Rousseau's sleeping woman with a lion standing over her: the lion is the alarm.",
  caption='he arrives at 6. what time is your alarm? #art #sleep #relatable', check=[],
  slides=[box(A+'sleeping-gypsy.jpg', cap('me asleep at 4am with my phone still playing, and the alarm in 2 hours:', 66, 46, 'outline', 80))])
deck('22-art-noonday', **ART, title='me and my 5 alarms',
  why='Millet\'s two farm workers passed out in hay: "me and the snooze button".',
  caption='we have an understanding. snooze or no snooze? #snooze #art', check=[],
  slides=[box(A+'noonday-rest.jpg', cap('me and the snooze button, 7:45am, ignoring 5 alarms together', 66, 46, 'outline', 80))])

# ---------- save: dark painting cover + paper text slides (4.4M) ----------
DARK = dict(format='Dark painting cover + one line per paper slide', job='save', compare='sumimxojpd0-dark-art-list',
            account='@locturne', size=TALL, sound='slow dark ambient', check=[])
deck('23-dark-list-sleep', **DARK, title='7 habits that quietly wreck your sleep',
  why="One arresting image, a numbered promise, then one bold idea per slide: easy to read, easy to save. Goya's 'sleep of reason' fits the topic exactly.",
  caption='which one is you? #sleep #habits #selfimprovement',
  slides=[pic(A+'sleep-of-reason.jpg', cap('7 HABITS THAT QUIETLY WRECK YOUR SLEEP..', 52, 58, 'outline', 90)),
    paper('Scrolling **in the dark** until your eyes sting.'), paper('Checking your phone **the second** you wake up.'),
    paper('Charging it **next to your pillow**.'), paper('A **different bedtime** every night.'),
    paper('"One more" when you are **already tired**.'), paper('Snoozing **five times**, then rushing.'),
    paper('Treating midnight as **the only time that is yours**.')])
deck('24-dark-list-eating', **DARK, title='6 things your phone eats every day',
  why="Goya's Saturn devouring his son as 'your phone' is grotesque enough to stop anyone.",
  caption='number 1 is the worst. which one is yours? #phoneaddiction #screentime',
  slides=[pic(A+'saturn.jpg', cap('6 THINGS YOUR PHONE EATS EVERY DAY..', 54, 58, 'classic', 90)),
    paper('Your **first hour** of the morning.'), paper('Your **sleep**, twenty minutes at a time.'), paper('Your **attention span**.'),
    paper('Your **boredom**, which is where ideas come from.'), paper('Your **evenings**.'),
    paper('Your **memory** of what you actually did today.')])
deck('25-dark-list-signs', **DARK, title='5 signs your phone runs your nights',
  why='The Scream as the cover for a self-diagnosis list: viewers count how many they tick.',
  caption='i got 5/5. what did you get? #screentime #phoneaddiction',
  slides=[pic(A+'the-scream.jpg', cap('5 SIGNS YOUR PHONE RUNS YOUR NIGHTS..', 56, 58, 'classic', 90)),
    paper('You plan to sleep at 11 and **check the time at 1:40**.'), paper('You open an app, close it, and **open it again** without thinking.'),
    paper('You **cannot fall asleep** without something playing.'), paper('Your phone is **the first thing you touch** every morning.'),
    paper('You **feel robbed** of the night, so you stay up to take it back.')])

# ---------- promo: creator intro (jwhorner 7.1M) ----------
JOE = dict(format='Creator intro ("You\'ve doomscrolled your way to my ___")', job='promo', compare='jwhorner-doomscrolled-intro', size=TALL)
deck('26-intro-luke-silent', **JOE, title="hi i'm luke! it's 11pm, go to sleep", account='@locturne (founder face)',
  why="Joe's version: one friendly line on a selfie, then the work with no words at all. Ours shows the app the same way.",
  caption='i made an app that puts your apps to sleep. what time should yours sleep? #indiedev #buildinpublic #sleep', sound='upbeat, happy',
  check=['slide 1 must be your real selfie, never the stand-in', 'renders show 200 steps; retake if your walk is 500'],
  slides=[pic(P+'founder-selfie.jpg', cap("hi i'm luke! you've doomscrolled your way to my app. go to sleep 😴", 18, 54)),
    full(R+'01-shield.png'), full(R+'13-shield-night.png'), full(R+'02-steps-clean.png'), full(R+'03-payoff.png'), full(R+'09-moons.png')])
deck('27-intro-loc', **JOE, title="hi i'm loc! you've doomscrolled your way to my bedtime", account='@loc (Loc account)',
  why='Same opener from the mascot; the "work" is his app, no words.',
  caption='lights out. court-ordered. what time is your lights out? #raccoon #sleep #fyp', sound='upbeat, happy',
  check=['Loc is the mascot speaking: post only from the Loc account, with the "Your brand" disclosure on'],
  slides=[box(L+'loc-bed-point.jpg', cap("hi i'm loc! you've doomscrolled your way to my bedtime. lights out 🌙", 21, 54, igY=11)),
    full(R+'13-shield-night.png'), full(R+'01-asleep-clean.png'), full(R+'03-payoff.png')])

# ---------- promo: empathy -> "so i made it" -> product (charlotte 2.0M, 20% saves) ----------
EMP = dict(format='Empathy → "so i made X for people like me" → product', job='promo', compare='charlotte-cant-sleep-playlist',
           account='@locturne (founder)', size=TALL, sound='soft ambient')
deck('28-made-it-tired', **EMP, title='exhausted but still scrolling',
  why='Slide 1 names the feeling, slide 2 confesses you built the fix, slide 3 is the product with a white-box CTA: reads as a person helping, not an ad.',
  caption="for anyone who can't put it down. what time did you sleep last night? #screentime #sleep #indiedev",
  check=['slide 2: "it actually worked" must be true for you'],
  slides=[pic(P+'rain-bokeh-night.jpg', cap("i know that feeling when you're exhausted but can't put your phone down", 24, 54, igY=22)),
    pic(P+'water.jpg', cap('so i built an app for people like me and it actually worked 🥲', 50, 54)),
    full(R+'01-asleep-clean.png', LOCBOX_R)])
deck('29-made-it-2am', **EMP, title="2am videos you don't even like",
  why='Same three-beat shape, a different feeling to test which pain lands.',
  caption='made this for myself first. what were you watching at 2am? #doomscrolling #sleep', check=['slide 2 claim must be true'],
  slides=[pic(P+'bed-dark-streak.jpg', cap("i know that feeling when it's 2am and the videos aren't even good", 30, 54)),
    pic(P+'dark-room-window.jpg', cap('so i made my phone go to sleep at 11 for people like me', 50, 54, 'outline')),
    full(R+'13-shield-night.png', cap("it's called locturne. link in bio", 94, 59, 'box', igY=10))])
deck('30-made-it-morning', **EMP, title='losing the first hour',
  why='The morning version of the empathy promo; the product slide is the walk screen.',
  caption='the first hour is yours again. what do you do first? #morningroutine #screentime', check=['walk count in render is 200; say what yours is', 'slide 2 claim must be true'],
  slides=[pic(P+'blinds-sunrise.jpg', cap('i know that feeling when your phone eats the first hour of your day', 64, 54)),
    pic(P+'bed-white-rumpled.jpg', cap("so i made an app that keeps my apps asleep until i've walked", 43, 54, 'outline')),
    full(R+'02-steps-clean.png', LOCBOX_R)])

# ---------- share: "I wondered why…" -> UI screenshot punchline (2.3M, 11% shares) ----------
WOND = dict(format='"I wondered why…" → a screenshot as the punchline', job='share', compare='everybodylovesg-wondered-why',
            account='@locturne', size=TALL, sound='subwoofer lullaby (the original\'s sound)')
deck('31-wondered-phone', **WOND, title='why my phone ignored me after 11',
  why='Huge outlined text sets up a mystery; the screenshot is the answer. Our shield literally says "Shh. I\'m sleeping."',
  caption='i did this to myself. what time should your apps go to sleep? #sleep #screentime', check=[],
  slides=[pic(P+'phone-blue-dark.jpg', cap("I wondered why my phone stopped talking to me after 11pm...", 50, 125, 'strong', 86)),
    full(R+'shield.png'), pic(P+'morning-bed-dim.jpg', cap('turns out i set that up myself', 56, 54, 'outline'))])
deck('32-wondered-roommate', **WOND, title='why my roommate went to bed at 11',
  why='The same reveal told about someone else, so it reads as gossip.',
  caption="she won't tell me how to turn it off. would you let your phone do this? #roommate #sleep", check=['roommate story must be true, or post it as a joke from Loc'],
  slides=[pic(P+'hands-lit-bed.jpg', cap("I wondered why my roommate was always in bed by 11...", 50, 125, 'strong', 86)),
    full(R+'13-shield-night.png'), pic(P+'pillow-over-head.jpg', cap('her phone makes her', 56, 54, color='#222'))])

# ---------- save: split panels (grindai.app 3.2M, startnowdaily 1.9M) ----------
deck('33-split-reframes', format='Split panels: the spiral on top, the fix below', job='save', compare='grindai-split-panels',
  account='@locturne', size=TALL, sound='calm piano', check=[],
  title='one more video / already asleep',
  why='An app account grew on this: the same moment, two outcomes. We use real photos and renders instead of illustrations.',
  caption='the second one is a setting. which side are you on tonight? #discipline #sleep #selfimprovement',
  slides=[split(P+'hand-phone-blanket.jpg', 'just one more video', P+'light-on-bed.jpg', 'already asleep', style='outline'),
    split(P+'pillow-over-head.jpg', 'snooze #4', P+'blinds-sunrise.jpg', 'up before the alarm', style='outline'),
    {'layout': 'split', 'top': {'image': P+'clock-127.jpg', 'caps': [cap('1:27am, still scrolling', 30, 54, 'outline')]}, 'bottom': {'image': P+'light-on-bed.jpg', 'caps': [cap('11:30pm, apps asleep, me too', 50, 54, 'outline')]}},
    split(P+'stars-forest.jpg', 'the moment your phone goes to sleep first...', P+'blinds-sunrise.jpg', 'is the moment you get your mornings back.', style='outline')])
deck('34-why-bro', format='"Why does bro…" cause and effect pairs', job='save', compare='startnowdaily-why-bro',
  account='@locturne', size=TALL, sound='motivational', check=['render shows 200 steps; match your setting'],
  title="why does bro's phone go to sleep at 11?",
  why='Question on top, payoff below: the habit explains the result. Viewers save the habit.',
  caption='bro is onto something #discipline #selfimprovement',
  slides=[split(R+'13-shield-night.png', "why does bro's phone go to sleep at 11?", P+'blinds-sunrise.jpg', 'why is bro up before his alarm?', 84, 52),
    split(R+'02-steps-clean.png', 'why does bro walk before opening instagram?', P+'coffee.jpg', 'why is bro never late?', 84, 52),
    split(R+'09-moons.png', 'why does bro collect moons?', P+'light-on-bed.jpg', 'why does bro actually like mornings?', 84, 52, 'outline')])

# ---------- save + comments: same selfie, one tip per slide in white boxes (helen 2.5M, 39% saves) ----------
HEL = dict(format='Same selfie on every slide, one tip per slide in white boxes', job='save', compare='helen-psychiatrist-hacks',
           account='face account', size=TALL, sound='soft upbeat')
def hel(img, lines): return [pic(img, cap(t, 66, 59, 'box', 86)) for t in lines]
deck('35-tips-sleep', **HEL, title='boring things that fixed my sleep', check=['every tip must be something you really do', AI],
  why="One photo, trust, a tip per slide, and a last slide that asks for comments. We claim no doctor; the authority is that it's boring and real.",
  caption='number 4 changed everything #sleep #insomnia #sleeptips',
  slides=hel(P+'day-selfie-girl.jpg', ['some boring things that actually fixed my sleep (no melatonin)\n😴🛏️',
    'my phone charges in the kitchen\n\nmy bed stopped being a cinema', 'same bedtime every night, even fridays\n\nyour body loves boring',
    'lamps only after 10\n\nceiling lights tell your brain it\'s noon', 'my apps go to sleep at 11 (i use locturne)\n\nno willpower needed at 1am',
    "what's the weirdest thing that helps you sleep?\n\ndrop it below so we all steal it 👇"]))
deck('36-tips-snooze', **HEL, title='how a 5-alarm guy stopped snoozing', check=['every tip must be true for you', AI],
  why='The same shape aimed at mornings; the credibility is the confession.',
  caption='from a chronic snoozer #morningroutine #snooze', 
  slides=hel(P+'day-selfie-guy.jpg', ['things that made me stop snoozing (from a 5-alarm guy)\n⏰😵',
    'alarm across the room\n\nyou can\'t snooze lying down', 'curtains open before anything\n\nlight beats coffee',
    'phone stays locked until i\'ve walked\n\nthe app wakes up when i do', 'water by the bed, drink it first\n\nit\'s a 10 second win',
    'what gets you out of bed?\n\nworst answers only 👇']))
deck('37-tips-phone-rules', **HEL, title='my weird rules for my phone at night', check=['every rule must be yours', AI],
  why='Rules are more saveable than tips: they sound like a system.',
  caption='rule 3 is non negotiable #screentime #digitaldetox',
  slides=hel(P+'day-selfie-girl2.jpg', ['my weird rules for my phone at night (screen time went way down)\n📵🌙',
    'no phone in bed. bed is for sleeping and crying', 'apps go to sleep at 11. not me deciding. the phone deciding',
    "if i can't sleep, i read the most boring book i own", "phone stays asleep until i'm up and walking",
    "what's your rule? i need more 👇"]))

# ---------- comments: "is it just me or…" (2.1M, 11.5K comments) / identity "i'm a type ___" (3.2M) ----------
deck('38-just-me-2am', format='"Is it just me or…" text block on a selfie', job='comments', compare='zainfinityy-is-it-just-me',
  account='face account', size=TALL, sound='sad trending', check=[], title='is it just me or…',
  why='A long, rambling admission invites "same" in the comments, which pushes reach.',
  caption='please tell me it\'s not just me #relatable #sleep',
  slides=[pic(P+'hand-phone-blanket.jpg', cap("is it just me or does anyone get into bed at 11 and somehow it's 2am and i'm watching a man restore a rusty knife and i'm not even tired", 64, 42, 'classic', 70))])
deck('39-just-me-midnight', format='"Is it just me or…" text block on a selfie', job='comments', compare='zainfinityy-is-it-just-me',
  account='face account', size=TALL, sound='sad trending', check=[], title='the day only feels mine at midnight',
  why='Revenge bedtime procrastination said in plain words; people comment their own version.',
  caption='revenge bedtime procrastination is real #sleep #relatable',
  slides=[pic(P+'hands-lit-bed.jpg', cap('is it just me or does the day only start feeling like mine at midnight, so i stay up to enjoy it, and then i hate myself at 7am', 44, 42, 'classic', 70))])
deck('40-type-3am-girl', format='"i\'m a type ___ girl" identity text', job='identity', compare='blondequeen-type-c',
  account='face account', size=TALL, sound='trending', check=[AI], title="i'm a type 3am guy", # rewritten for Luke; the placeholder face is swapped after the photo session
  why='Readers either see themselves (share, tag) or argue (comment). The contradictions are the joke.',
  caption="type 3am, unite. what's your type? #relatable #sleep",
  slides=[pic(P+'red-selfie-guy.jpg', cap("i'm a type 3am guy\ni can be asleep by 11, i can be watching chess openings at 3. i set 6 alarms and hear none of them", 57, 48, 'classic', 72))])
deck('41-type-one-more-guy', format='"i\'m a type ___ girl" identity text', job='identity', compare='blondequeen-type-c',
  account='face account', size=TALL, sound='trending', check=[AI], title="i'm a type 'one more video' guy",
  why='The same identity line from a guy, to test who shares more.',
  caption="this is a cry for help. what's your type? #relatable",
  slides=[pic(P+'red-selfie-guy.jpg', cap("i'm a type 'one more video' guy\ni can be at the gym by 6, i can watch 3 hours of car repairs at 2am. always tired, never sleepy", 57, 48, 'classic', 72))])

# ---------- share: "past me was not real" + a Notes routine (1.5M) ----------
deck('42-past-me-routine', format='"___ me was not real" + an old routine in Notes', job='share', compare='heyitsliiv-past-me',
  account='face account', size=TALL, sound='trending', check=['the routine must be one you really wrote (or make it clearly a joke)'],
  title='january me was not real', why='Self-roast plus a screenshot of an absurdly ambitious plan; the gap between plan and reality is the joke.',
  caption='she lasted 4 days. how long did yours last? #routine #newyear #relatable',
  slides=[{'layout': 'solid', 'emoji': '⏳', 'text': '**january me**\nwas not real😭😭🙏'},
    {'layout': 'notes', 'title': 'Night routine 🌙', 'sub': 'every night - no exceptions 🤍',
     'rows': [['phone in kitchen', '_9:00pm_'], ['journal', '_9:00-9:20pm_ 20min'], ['stretch', '_9:20-9:35pm_'], ['read', '_9:35-10:15pm_ 40min'],
              ['skincare', '_10:15-10:30pm_'], ['meditate', '_10:30-10:45pm_'], ['lights out', '_10:45pm_'], ['wake up', '_5:00am_'],
              ['cold shower', '_5:05am_'], ['run', '_5:15-6:00am_']]}])

# ---------- comments: the sound is the content (mystery_record 3.0M, 41K comments) ----------
deck('43-alarm-trauma', format='"trauma" + an alarm sound', job='comments', compare=None, account='@loc (Loc account)', size=TALL,
  sound='the default iPhone "Radar" alarm (this IS the post)', check=[], title='trauma',
  why='The slides only frame a sound everyone has a reaction to; comments fill with shared pain.',
  caption='you heard it in your head. which alarm is worse? #alarm #trauma #iphone',
  slides=[box(A+'insomnia-woman.jpg', cap('trauma', 50, 54, 'outline')), box(A+'the-scream.jpg', cap('(sound on)', 50, 54))])

# ---------- save: "this man changed my mindset" (Denzel 2.2M, 26% saves) ----------
deck('44-franklin', format='"This man changed my mindset" + quote', job='save', compare='denzel-changed-my-mindset',
  account='@locturne', size=TALL, sound='a calm speech or quote audio', check=[], title='this man changed my sleep schedule',
  why="Denzel's post is bait for the audio. We use a public-domain face with a famous sleep line, then the twist.",
  caption='he would have hated tiktok. early bird or night owl? #benjaminfranklin #discipline #sleep',
  slides=[pic(A+'franklin.jpg', cap('this man changed my sleep schedule', 50, 54, 'outline')),
    box(A+'franklin.jpg', cap('"early to bed and early to rise makes a man healthy, wealthy and wise."\n— 1735', 50, 54, 'outline')),
    full(R+'13-shield-night.png', cap("he didn't have tiktok though. so i gave my phone a bedtime", 12, 54))])

# ---------- share: dark meme, text above and below (wolf 2.5M) ----------
deck('45-meme-wanderer', format='Dark meme, text above and below', job='share', compare='gigglechicken-wolf-meme',
  account='@loc (Loc account)', size=TALL, sound='dramatic / phonk', check=[], title='welcome back',
  why='Tough-love tone over a lone figure; a real Friedrich painting instead of an AI animal.',
  caption='the algorithm missed you. how long were you gone? #relatable #meme',
  slides=[{'layout': 'meme', 'top': 'welcome back to everyone who said\n"i\'ll sleep early tonight"', 'image': A+'wanderer.jpg',
           'bottom': 'you were gone for 4 hours.\nthe algorithm missed you.'}])

# ---------- reach + one product beat: night quotes (1.4M) ----------
NQ = dict(format='Moody night quotes, one line per slide', job='share', compare='nadiaaddesi-night-quotes', account='@locturne', size=TALL,
          sound='slow sad piano')
deck('46-quotes-mornings', **NQ, title="you don't hate mornings", check=[AI],
  why='Validation first ("it is not your fault"), one product beat near the end, a soft line to close.',
  caption='it was never the morning. what time did you sleep? #sleep #mentalhealth',
  slides=[pic(P+'rain-car-window.jpg', cap("you don't hate mornings...", 70, 54)),
    pic(P+'moon-cloud-trees.jpg', cap('you hate how little sleep you gave yourself.', 42, 54)),
    pic(P+'rain-bokeh-night.jpg', cap('you hate waking up already behind.', 22, 54)),
    pic(P+'clock-127.jpg', cap('you hate that the night felt like the only time that was yours.', 17, 54, color='#222')),
    full(R+'01-asleep-clean.png', cap('so give the night a bedtime, not yourself.', 10, 54)),
    pic(P+'blinds-sunrise.jpg', cap('mornings feel different when you meet them rested.', 58, 54))])
deck('47-quotes-art', **NQ, title='the night is not the enemy', check=["slide 5: 'my apps go to sleep at 11 now. i finally do too.' Only if true for you"],
  why='The same quote rhythm on public-domain night paintings: no faces, no AI.',
  caption='the night was never the enemy. what keeps you up? #nightthoughts #sleep',
  slides=[box(A+'two-men-moon.jpg', cap("the night isn't the enemy.", 50, 54, 'outline')),
    box(A+'starry-night.jpg', cap('the phone just makes it last until 3.', 50, 54)),
    box(A+'melancholia.jpg', cap("you're not lazy. you're tired from yesterday.", 50, 54, 'outline')),
    box(A+'bedroom-arles.jpg', cap("let the room be boring. that's how sleep finds you.", 50, 54, 'outline')),
    full(R+'13-shield-night.png', cap('my apps go to sleep at 11 now. i finally do too.', 10, 54))])

# ---------- promo: photo dump with tweet covers ----------
DUMP = dict(format='Photo dump with a tweet cover', job='promo', compare='coke3xb-tweet-dump', account='@loc (Loc account)', size=TALL,
            sound='trending soft song', check=["tweets are Loc's real in-app lines; no fake counts"])
def tw(t, when): return {'layout': 'tweet', 'avatar': '/demo/icon.png', 'name': 'loc', 'handle': '@locturne', 'text': t, 'when': when}
deck('48-dump-pigeons', **DUMP, title='the pigeons are up', why='Raw dump energy; the app hides in plain sight among real night photos.',
  caption='morning dump ☀️ team pigeon or team loc? #raccoon',
  slides=[tw('good morning to everyone except the pigeons', '6:58 AM'), full(P+'blinds-sunrise.jpg'), full(R+'02-steps-clean.png'), full(P+'coffee.jpg'),
          tw('get up. my sentence depends on it.', '7:01 AM'), full(R+'03-payoff.png'), full(P+'unmade-bed.jpg')])
deck('49-dump-gerald', **DUMP, title='gerald says hi', why='Loc lore as tweets between night photos; builds the character.',
  caption='night dump 🌙 gerald or the pigeon? #raccoon #nightdump',
  slides=[tw("gerald says he's appealing.\n\ngerald is not appealing.", '11:04 PM'), full(P+'city-night.jpg'), full(R+'01-shield.png'),
          full(P+'tea.jpg'), tw("even gerald's asleep. gerald is always asleep.", '12:12 AM'), full(R+'09-moons.png'), full(P+'reading-dark.jpg')])

# ---------- save + promo: notes listicle & checklist (amayareading, growing.diaries) ----------
NL = dict(format='Notes listicle, app on one point', job='save', compare='amayareading-10-things', account='@locturne', size=NOTE)
def pt(h, top, text, img=None, phone=None, side=None, bottom=''):
    s = {'layout': 'point', 'heading': h, 'top': top, 'text': text, 'bottom': bottom}
    if phone: s['phone'] = phone
    else: s['image'] = img
    if side: s['imageSide'] = side
    return s
deck('50-notes-2am', **NL, title='7 things that fixed my 2am scrolling', check=['every point must be true for you'],
  why='Real fixes earn the one confession slide; the app is the "what actually worked".',
  caption='number 4 is cheating but it works. which one would you try? #screentimehacks #sleep', sound='moody, low volume',
  slides=[{'layout': 'hook', 'title': '7 things that fixed my 2am scrolling', 'image': P+'phone-glow-room.jpg', 'narrow': True, 'aside': '(niche edition)', 'asideRight': True},
    pt('_boring_ beats blocked', 'i stopped trying to fight the urge and started making bed _boring_', 'a paper book on the pillow\n\nnothing to scroll, so the brain gives up', P+'book-on-bed.jpg'),
    pt('the charger _moved rooms_', 'if it charges by the bed, it _ends up in the bed_', 'kitchen counter, every night\n\nthe walk back is long enough to change my mind', P+'unmade-bed.jpg', side='left'),
    pt('my apps _go to sleep_', 'this is the one that actually stuck', "at 11 my apps sleep and _don't wake up until i've walked_ in the morning\n\nwillpower at 1am is not a plan", phone=R+'13-shield-night.png'),
    pt('lights _down at 10_', 'ceiling lights off, one lamp on', 'my brain stopped thinking it was noon\n\ni got sleepy before midnight for the first time in years', P+'light-on-bed.jpg', side='left')])
deck('51-checklist-first-hour', format='Checklist + "how i actually do it"', job='save', compare='growing-diaries-50-things', account='@locturne', size=NOTE,
  title='30 things to do in the first hour instead of your phone', check=['closer line must be true'],
  why='A long checklist is pure save bait; the app is the method slide, and the closer asks a question.',
  caption='save this for tomorrow morning. which one are you starting with? #morningroutine #screentime', sound='soft, morning',
  slides=[{'layout': 'hook', 'title': '30 things to do in the first hour\ninstead of your phone', 'image': P+'coffee.jpg', 'narrow': True, 'aside': '(save this for the next time you reach for it at 7am)'},
    {'layout': 'checklist', 'heading': 'get up', 'start': 1, 'images': [P+'blinds-sunrise.jpg', P+'water.jpg'],
     'items': ['feet on the floor first', 'open the curtains', 'drink a full glass of water', 'make the bed', 'walk to the kitchen and back',
               'step outside for 2 minutes', 'stretch for 5 minutes', 'brush your teeth slowly', 'put a playlist on', 'wash your face cold']},
    {'layout': 'checklist', 'heading': 'wake your brain', 'start': 11, 'images': [P+'journal.jpg', P+'coffee.jpg'],
     'items': ['write 3 lines about yesterday', 'read 5 pages', 'make coffee by hand', 'plan the day on paper', 'do the hardest small task',
               'text someone good morning', 'tidy one surface', 'eat something real', '10 push-ups', 'look out the window for a minute']},
    {'layout': 'checklist', 'heading': 'protect the hour', 'start': 21, 'images': [P+'tea.jpg', P+'book-on-bed.jpg'],
     'items': ['charge the phone in another room', 'use a real alarm clock', 'keep apps asleep until you walk', 'no news before 9',
               'no email in bed', 'shower before screens', 'lay out clothes the night before', 'same wake time on weekends',
               'one podcast, not twenty videos', 'decide tonight what 7am looks like']},
    {'layout': 'demo', 'heading': 'how i actually do it', 'phone': R+'02-steps-clean.png',
     'text': "my apps stay _asleep_ until i've _walked_ in the morning\n\nby the time instagram wakes up, i'm already up\n\n*(the list fills the gap)*",
     'card': {'icon': '/demo/icon.png', 'name': 'Locturne', 'subtitle': 'Bedtime lock. Walk to unlock.'}},
    {'layout': 'closer', 'avatar': P+'blinds-sunrise.jpg', 'question': 'which one are you trying tomorrow? 👇',
     'lines': ["i'm on #3. a full glass before anything", 'locturne is in my bio']}])
deck('52-notes-signs', **NL, title='5 signs your phone is running your nights',
  check=["closer: 'i had all 5'. Only if true for you"],
  why='Self-diagnosis listicle (amayareading shape): readers count how many apply, save it, and comment their score. The app is the fix on the last sign.',
  caption='be honest in the comments #screentime #phoneaddiction #sleep', sound='moody, low volume',
  slides=[{'layout': 'hook', 'title': '5 signs your phone is the one running your nights', 'image': P+'man-in-bed.jpg', 'narrow': True, 'aside': '(be honest)', 'asideRight': True},
    pt('you check the time at _1:27_', 'you planned to sleep at 11. you _always_ plan to sleep at 11', "the hours don't feel like hours on a feed\n\nthey feel like _one more_", P+'clock-127.jpg'),
    pt('you need _something playing_', 'silence feels _loud_ now', "a video to fall asleep to, a podcast to wake up to\n\nyour brain forgot how to be _bored_", P+'sheets.jpg', side='left'),
    pt('you unlock it and _forget why_', 'you stare at the home screen for a second, then open instagram _anyway_', "your thumb knows the way before you decide anything\n\nthat's not a choice. it's a _reflex_", P+'book-on-bed.jpg'),
    pt('_tired all day_, wide awake at midnight', 'the 3pm crash, then the 11pm _second wind_', "the second wind isn't energy\n\nit's the feed _keeping you up_", P+'city-night.jpg', side='left'),
    pt('mornings start _horizontal_', 'the phone is the first thing you touch, _before your feet hit the floor_', "and the day starts with everyone else's lives\n\ni fixed this one by making my apps _wait until i'm walking_", phone=R+'02-steps-clean.png'),
    {'layout': 'closer', 'avatar': P+'blinds-sunrise.jpg', 'question': 'how many did you get? be honest 👇', 'lines': ['i had all 5', 'the app is locturne, link in bio']}])

# ---------- promo: other person + conflict → "so i…" (Larry's best operator result, home decor: 147–234K views vs
# 0.9–2.7K for feature/self hooks; grade S, no saved reference). Experiment: test against the empathy decks 28–30. ----------
OPC = dict(format='Other person + conflict → "so i…"', job='promo', app='method', size=TALL)
deck('53-conflict-loc-judge', **OPC, title='the judge said lights out at 11', account='@loc (Loc account)',
  why='Larry shape with canon stakes: the court gave Loc lights out at 11, so everyone\'s phone gets it too. The hook is a conflict with someone else, never the feature.',
  caption='gerald is appealing. guilty or not guilty? #raccoon #screentime #sleep', sound='dramatic courtroom / dun dun dun',
  check=['Loc is the mascot speaking: post only from the Loc account, with the "Your brand" disclosure on'],
  slides=[box(L+'loc-bed-point.jpg', cap("judge said lights out at 11. so i'm taking your phone with me", 66, 54, 'outline', 74)),
    full(R+'13-shield-night.png', cap('your apps sleep when i sleep', 12, 54)),
    full(R+'02-steps-clean.png', cap("they wake up when you walk. court's orders", 12, 54)),
    box(L+'loc-bed-watch.jpg', cap('gerald says this is "not legally binding" 🙄', 66, 54, 'outline', 74), LOCBOX)])
deck('54-conflict-roommate', **OPC, title="my roommate said i'd never sleep before 2am", account='@locturne (founder face)',
  why='Larry shape for the founder: someone else\'s doubt is the hook, the app is how you proved them wrong. Template: use whoever really said it.',
  caption="he owes me a coffee. who'd bet against you? #screentime #sleep #buildinpublic", sound='trending smug / victory sound',
  check=["slide 1: someone must have really said this. Swap 'my roommate' for who did (mum, girlfriend, coach)",
    "slide 4: the bet and the result must be real, or cut that slide"],
  slides=[pic(P+'dark-room-window.jpg', cap("my roommate said i'd never sleep before 2am. so i built this", 40, 54, 'outline')),
    full(R+'13-shield-night.png', cap('my apps go to sleep at 11 now', 12, 54)),
    full(R+'02-steps-clean.png', cap("and they don't wake up until i've walked", 12, 54)),
    pic(P+'blinds-sunrise.jpg', cap('day 12. he owes me a coffee', 64, 54, 'outline'), LOCBOX)])

deck('55-conflict-girlfriend', **OPC, title="she said i'd pick my phone over her", account='@locturne (founder face)',
  why='Conflict hook #2 for the 3-vs-3 test against the empathy decks: the doubt comes from someone close, the app is the proof.',
  caption='she reads the comments so be nice. would yours say the same? #screentime #relationships #sleep', sound='trending soft / romantic',
  check=["slide 1: someone must have really said this. Swap 'she' for who did", "slide 4: only if it's true"],
  slides=[pic(P+'scrolling-overhead.jpg', cap("she said i'd pick my phone over her. so i built this", 64, 54, igY=67)),
    full(R+'13-shield-night.png', cap('my phone goes to sleep at 11 now', 12, 54)),
    full(R+'02-steps-clean.png', cap("and it stays asleep until i've walked in the morning", 12, 54)),
    pic(P+'tea.jpg', cap('she gets the first hour now, not tiktok', 40, 54, 'outline'), LOCBOX)])
deck('56-conflict-coach', **OPC, title="my coach said i'd never make 7am training", account='@locturne (founder face)',
  why='Conflict hook #3: a morning-side doubt, so the payoff is the walk unlock, not the bedtime shield.',
  caption='coach if you see this, i was on time. who doubted you? #morningroutine #discipline #screentime', sound='trending hype / gym',
  check=["slide 1: someone must have really said this. Swap 'coach' for who did", "slide 3: the time must match your real payoff screen"],
  slides=[pic(P+'moon-crescent-trees.jpg', cap("my coach said i'd never make 7am training. so i built this", 28, 54)),
    full(R+'02-steps-clean.png', cap("my apps stay asleep until i've walked 200 steps", 12, 54)),
    full(R+'03-payoff.png', cap('no snooze spiral when there is nothing to scroll', 12, 54)),
    pic(P+'dawn-street.jpg', cap('first one there all week', 40, 54, 'outline'), LOCBOX)])

# ---------- W variants (30-day plan): same structure as a likely winner, new hook + new images. Never reposts. ----------
deck('53a-conflict-loc-screens', **OPC, variantOf='53-conflict-loc-judge', title='judge said no screens after 11', account='@loc (Loc account)',
  why='Variant of 53: same conflict → shield → wake → Gerald beat, a different ruling, different Loc pose and renders.',
  caption='this is not legal advice. guilty or not guilty? #raccoon #screentime #sleep', sound='dramatic courtroom / dun dun dun',
  check=['Loc is the mascot speaking: post only from the Loc account, with the "Your brand" disclosure on'],
  slides=[box(L+'loc-bed-crossed.jpg', cap("judge said no screens after 11. so i'm enforcing it on everyone", 66, 54, 'outline', 74)),
    full(R+'01-shield.png', cap('your apps go down with me', 12, 54)),
    full(R+'02-steps-clean.png', cap('they only wake up when you get up', 12, 54)),
    box(L+'loc-bed-watch.jpg', cap('gerald is playing dead again', 66, 54, 'outline', 74), LOCBOX)])
deck('53b-conflict-loc-appeal', **OPC, variantOf='53-conflict-loc-judge', title="gerald said i can't appeal lights out", account='@loc (Loc account)',
  why='Variant of 53: the lawyer is the other person this time; payoff is the push-up wake method.',
  caption='gerald has been disbarred in 3 forests #raccoon #sleep #fyp', sound='dramatic courtroom / dun dun dun',
  check=['Loc is the mascot speaking: post only from the Loc account, with the "Your brand" disclosure on'],
  slides=[box(L+'loc-bed-watch.jpg', cap("gerald said i can't appeal lights out. so i'm taking your phone down too", 66, 54, 'outline', 74)),
    full(R+'10-block-now-clean.png', cap('lights out means everyone', 12, 54)),
    full(R+'06-pushups.png', cap("want them back? push-ups. court's orders", 12, 54)),
    box(L+'loc-bed-point.jpg', cap('case closed', 66, 54, 'outline', 74), LOCBOX)])
deck('52a-notes-signs-mornings', **NL, app='punchline', variantOf='52-notes-signs', title='5 signs your mornings belong to your phone',
  check=["closer: 'i had 4 of 5'. Only if true for you"],
  why='Variant of 52: same self-diagnosis listicle, flipped to the morning side; app is the fix on the last sign.',
  caption='be honest in the comments #morningroutine #screentime', sound='moody, low volume',
  slides=[{'layout': 'hook', 'title': '5 signs your mornings belong to your phone', 'image': P+'dawn-path.jpg', 'narrow': True, 'aside': '(count them)', 'asideRight': True},
    pt('you read notifications _before your eyes are open_', 'one eye, one thumb, 14 notifications', "you haven't said a word yet and you're already _behind_", P+'woman-in-bed.jpg'),
    pt('the snooze button _leads to tiktok_', 'snooze, scroll, snooze, scroll', "the alarm isn't waking you up anymore\n\nthe _feed_ is", P+'man-in-bed.jpg', side='left'),
    pt("you're late but you've _seen 40 stories_", 'everyone else\'s morning, _none of yours_', "and somehow you still don't know what anyone's doing", P+'coffee.jpg'),
    pt('you feel _behind by 9am_', 'nothing has gone wrong yet', "but your head is already full of _other people_", P+'journal.jpg', side='left'),
    pt('the first hour is _gone_', "and you can't say where it went", "i fixed this one: my apps stay _asleep_ until i've walked", phone=R+'02-steps-clean.png'),
    {'layout': 'closer', 'avatar': P+'water.jpg', 'question': 'how many did you get? 👇', 'lines': ['i had 4 of 5', 'the app is locturne, link in bio']}])
deck('52b-notes-revenge-scrolling', **NL, app='punchline', variantOf='52-notes-signs', title="6 signs you're revenge scrolling",
  check=["closer: 'i was all 6'. Only if true for you"],
  why='Variant of 52 on a named concept (revenge bedtime procrastination): naming the habit gives the hook a word people search and repeat.',
  caption='the day was not yours so the night has to be #revengebedtimeprocrastination #sleep', sound='moody, low volume',
  slides=[{'layout': 'hook', 'title': "6 signs you're revenge scrolling", 'image': P+'city-night.jpg', 'narrow': True, 'aside': '(not lazy, just robbed)', 'asideRight': True},
    pt("you stay up because _the day wasn't yours_", 'work, class, everyone else\'s plans', "so midnight feels like the _only time you own_", P+'reading-dark.jpg'),
    pt("you know you're tired and _keep going_", 'eyes stinging, still scrolling', "tiredness isn't the signal anymore\n\n_the feed ending_ is, and it never ends", P+'sheets.jpg', side='left'),
    pt("you're _not even enjoying it_", 'same 6 videos, different order', "it's not fun. it's just _not over yet_", P+'unmade-bed.jpg'),
    pt('"just checking one thing"', 'one thing, then _forty_', "the check is never the problem\n\nthe _next swipe_ is", P+'book-on-bed.jpg', side='left'),
    pt('you feel _worse_ after', 'not rested, not entertained', "just later, and _more tired_", P+'clock-127.jpg'),
    pt('the night only ends when _your phone does_', 'so i made mine end first', "my apps go _to sleep at 11_ now\n\nthe night is still mine. i just spend it _asleep_", phone=R+'13-shield-night.png'),
    {'layout': 'closer', 'avatar': P+'light-on-bed.jpg', 'question': 'how many are you? 👇', 'lines': ['i was all 6', 'the app is locturne, link in bio']}])

deck('01a-notes-wrecking-sleep', **NL, app='confession', variantOf='01-mornings-10-things', title='10/10 things quietly ruining your sleep',
  check=["slide 4: 'lasted a week'. Only if true for you"],
  why='Variant of 01 (amayareading shape, 182K / 58K saves): same notes listicle and slide-4 confession, moved to the night side with fresh points and photos.',
  caption='number 2 hurt. which number got you? #sleep #screentime #sleeptips', sound='something moody at low volume',
  slides=[{'layout': 'hook', 'title': '10/10 things quietly ruining your sleep', 'image': P+'sheets.jpg', 'narrow': True, 'aside': '(niche edition)', 'asideRight': True},
    pt('falling asleep _to a video_', "autoplay doesn't know you're asleep", "your brain keeps half-listening\n\nthe background noise is still _input_", P+'light-on-bed.jpg'),
    pt('coffee _after 2pm_', 'the buzz is gone by bedtime, the caffeine _isn\'t_', "it hangs around for hours after you stop feeling it\n\nmove the last cup _earlier_", P+'coffee.jpg', side='left'),
    pt('the _one last check_', 'you put the phone down, then pick it up _one more time_', "i tried willpower. _lasted a week_\n\nnow my apps _go to sleep at 11_ and there's nothing left to check", phone=R+'13-shield-night.png'),
    pt('a _warm_ bedroom', 'duvet, heating, laptop on the bed', "cooler rooms make falling asleep easier\n\nopen the window for _ten minutes_ before bed", P+'unmade-bed.jpg', side='left'),
    pt('lying there _trying_ to sleep', '20 minutes, 40 minutes, checking the time', "if you're wide awake, get up and do something _boring_ in dim light\n\nthen try again", P+'clock-127.jpg')])
deck('01b-notes-wrecking-focus', **NL, app='confession', variantOf='01-mornings-10-things', title='10/10 things quietly wrecking your focus',
  check=["slide 4: 'my mornings start scrolling'. Only if true for you"],
  why='Variant of 01 on the reference post\'s own topic (attention span) with Locturne\'s points; the morning lock is the confession.',
  caption='the third one is the whole problem. which one is you? #focus #screentime #productivity', sound='something moody at low volume',
  slides=[{'layout': 'hook', 'title': '10/10 things quietly wrecking your focus', 'image': P+'journal.jpg', 'narrow': True, 'aside': '(niche edition)', 'asideRight': True},
    pt('your phone _face up_ on the desk', "you're not using it. it's still _using you_", "every light-up is a tiny decision\n\nput it _face down_, or in a drawer", P+'water.jpg'),
    pt('notifications on _for everything_', 'group chats, sales, an app you opened once', "each one costs more than the second it takes\n\nturn off everything that _isn't a person_", P+'tea.jpg', side='left'),
    pt('your day starts _scrolling_', 'the first hour sets the pace for the rest', "my mornings used to start in bed on tiktok\n\nnow my apps stay _asleep_ until i've _walked_, so the day starts with me", phone=R+'02-steps-clean.png'),
    pt('you never let yourself be _bored_', 'queue, kettle, lift: phone out every time', "boredom is where your brain _tidies up_\n\nlet a few minutes stay _empty_", P+'book-on-bed.jpg', side='left'),
    pt("checking it _for the time_", 'and leaving 15 minutes later', "a watch or a clock across the room\n\nremoves the _excuse_", P+'clock-127.jpg')])

deck('11a-relatable-round-number', **REL, variantOf='11-relatable-sleep-math', compare='peyt-phone-in-bed-room', title='putting the phone down at a round number',
  why='Variant of 11: the same "me at [time]" self-roast, a different lie we all tell ourselves; real clock at ~11:58.',
  caption="12:15 is also a round number. what's your round number? #relatable #sleep #bedtime", sound='trending sad sound', check=[],
  slides=[pic(P+'clock-midnight-black.jpg', cap("me at 11:58 deciding i'll put my phone down at a nice round number", 20, 58))])
deck('11b-relatable-four-minutes', **REL, variantOf='11-relatable-sleep-math', compare='peyt-phone-in-bed-room', title='if i fall asleep in the next 4 minutes', # the photo's clock reads ~12:15, so the line says 12:15
  why='Variant of 11: the sleep-maths panic made more specific (4 minutes, 5 hours), which is the bit people quote in comments.',
  caption='the math was not mathing. how many hours did you get? #sleep #relatable #insomnia', sound='trending sad sound', check=[],
  slides=[pic(P+'clock-dark-room.jpg', cap("me at 12:15: if i fall asleep in the next 4 minutes i still get 6 and a half hours", 20, 58))])

deck('14a-relatable-last-video', **REL, variantOf='14-relatable-unmade', compare='peyt-phone-in-bed-room', title="my bed after 'okay last video' 9 times",
  why='Variant of 14: same wrecked-bed + the phrase we lie with, now with a count; dark real photo, so it reads as 3am.',
  caption='the 9th one was the real last one. what number are you on? #relatable #phoneinbed #sleep', sound='trending sad sound', check=[],
  slides=[pic(P+'bed-dark-streak.jpg', cap("my bed at 3am after i said 'okay last video' 9 times", 22, 58))])
deck('14b-relatable-pretending', **REL, variantOf='14-relatable-unmade', compare='peyt-phone-in-bed-room', title="just lying down for 5 minutes", # daylight photo, so the line is a 4pm one
  why='Variant of 14: the bed as the scene, the afternoon \'5 minutes\' that turns into 2 hours; one leg out of the sheets is the joke.',
  caption='it has been 2 hours. how long was yours? #relatable #phoneaddiction #nap', sound='trending sad sound', check=[],
  slides=[pic(P+'leg-out-sheets.jpg', cap("me in bed at 4pm after 'just lying down for 5 minutes' with my phone", 20, 58, color='#222'))])

deck('31a-wondered-quiet', **WOND, variantOf='31-wondered-phone', app='punchline', title='why my apps went quiet at 11',
  why='Variant of 31: same mystery → screenshot answer → self-roast; new hook and new real photos (hand-lit-black, pov-couch-scroll).',
  caption='past me is a genius and a menace. what time should your apps sleep? #sleep #screentime', check=[],
  slides=[pic(P+'hand-lit-black.jpg', cap("I wondered why my apps went quiet every night at 11...", 50, 125, 'strong', 86)),
    full(R+'13-shield-night.png'), pic(P+'pov-couch-scroll.jpg', cap('it was me. i did this. on purpose.', 30, 54, 'outline'))])
deck('31b-wondered-shh', **WOND, variantOf='31-wondered-phone', app='punchline', title="why tiktok kept saying 'shh'",
  why='Variant of 31: the shield literally says "Shh. I\'m sleeping." so the hook quotes it; the reveal is the walk unlock.',
  caption='it does not care that i am awake. what time would you pick? #sleep #phoneaddiction', check=["slide 3: 'i built this' is true for Luke; keep it on Luke's accounts only"],
  slides=[pic(P+'pov-couch-scroll.jpg', cap("I wondered why my phone kept telling me 'shh' at 11pm...", 50, 125, 'strong', 86)),
    full(R+'shield.png'), full(R+'02-steps-clean.png', cap("and it won't wake up till i walk. i built this.", 12, 54))])

deck('15a-egg-loc-tap', **EGG, variantOf='15-egg-loc-crossed', title='technically enough sleep',
  why='Variant of 15: same reaction-picture format, a new Loc pose on a new real bed (loc_compose.py), a new self-roast.',
  caption='bears need 4 hours. i checked. how many did you get? #raccoon #sleep #relatable', check=[],
  slides=[box(L+'loc-bed-tap.jpg', cap('me in bed every morning deciding whether 4 hours of sleep is technically enough', 66, 54, 'outline', 74))])
deck('15b-egg-loc-walk', **EGG, variantOf='15-egg-loc-crossed', title='200 steps so instagram talks to me',
  why='Variant of 15 that winks at the product without naming it: the walk-to-unlock mechanic as a reaction picture.',
  caption="step 147 of 200. what's the first app you open? #raccoon #morningroutine #fyp", check=[],
  slides=[box(L+'loc-path-walk.jpg', cap('me at 7am walking 200 steps so instagram will talk to me again', 66, 54, 'outline', 74))])

# ---------- T decks (30-day plan, days 15-30): new formats on an account, to keep exploring ----------
deck('T1-loc-just-me', format='"Is it just me or…" text block (Loc)', job='comments', app='none', compare='zainfinityy-is-it-just-me',
  account='@loc (Loc account)', size=TALL, sound='trending sad sound', title='is it just me (Loc)',
  why='Test: the 2.1M / 11.5K-comment "is it just me" shape in Loc\'s voice, built on canon (court-ordered bedtime, Gerald) so the comments can play along.',
  caption='gerald says this is normal #raccoon #relatable #sleep',
  check=['Loc is the mascot speaking: post only from the Loc account'],
  slides=[box(L+'loc-bed-crossed2.jpg', cap("is it just me or does anyone else have a court-ordered bedtime and a lawyer who keeps playing dead", 79, 50, 'outline', 74))])
deck('T3-face-conflict', format='Other person + conflict → "so i…"', job='promo', app='method', account='face / Day-N account', size=TALL,
  sound='trending smug / victory sound', title="my sister bet i couldn't last a week",
  why='Test: the conflict hook on the face account, with real faceless photos, to see whether it carries without the founder framing.',
  caption="she owes me dinner. who'd bet against you? #screentime #sleep #challenge",
  check=["slide 1: someone must have really said this. Swap 'my sister' for who did", "slide 4: only if the bet and the result are real"],
  slides=[pic(P+'hand-lit-black.jpg', cap("my sister bet i'd crack in a week. so i built this", 26, 54)),
    full(R+'shield.png', cap('11pm: everything goes to sleep', 12, 54)),
    full(R+'02-steps-clean.png', cap("7am: nothing wakes up till i've walked", 12, 54)),
    pic(P+'dawn-street.jpg', cap('day 7. she owes me dinner', 30, 54, 'outline'), LOCBOX)])

deck('10a-relatable-one-notification', **REL, variantOf='10-relatable-alarm-tiktok', compare='zararose-phone-in-bed', title="'just one notification' at 7am",
  why='Variant of 10: the same morning-scroll admission with a specific time cost (7am to 7:48), on a real faceless morning photo.',
  caption="where did the 48 minutes go? #relatable #morning #phoneaddiction", sound='trending sad sound', check=[],
  slides=[pic(P+'bed-blind-shadows.jpg', cap("me at 7am checking 'just one notification' and resurfacing at 7:48", 30, 58, 'outline'))])
deck('10b-relatable-before-alarm', **REL, variantOf='10-relatable-alarm-tiktok', compare='zararose-phone-in-bed', title='3 videos deep before the alarm',
  why='Variant of 10: the twist that you woke up before the alarm and still lost the morning to the feed.',
  caption="was it worth it? yes. no. #relatable #morning #phoneaddiction", sound='trending sad sound', check=[],
  slides=[pic(P+'phone-on-duvet.jpg', cap("when you wake up 2 minutes before your alarm and you're already 3 videos deep when it goes off", 24, 54, 'outline'))])
deck('13a-relatable-resting-eyes', **REL, variantOf='13-relatable-room-2am', compare='peyt-phone-in-bed-room', title="my room at 1am, 'just resting my eyes'",
  why="Variant of 13: Peyt's empty-room trick with a new lie we all tell; a phone glowing in a dark room, no person, every viewer puts themselves in it.",
  caption="how long were your eyes resting? #relatable #bedtime #sleepschedule", sound='trending sad sound', check=[],
  slides=[pic(P+'phone-blue-dark.jpg', cap("my room at 1am when i said i was 'just resting my eyes' at 10", 24, 58, 'outline'))])

for name, d in D.items():
    ordered = {k: d[k] for k in ('title', 'format', 'job', 'app', 'variantOf', 'why', 'compare', 'account', 'caption', 'sound', 'size', 'check') if k in d}
    ordered['slides'] = d['slides']
    # Keep what the studio and the loop add by hand (app role, rubric score) across regenerations.
    path = os.path.join(OUT, name + '.json')
    if os.path.exists(path):
        old = json.load(open(path))
        for k in ('app', 'score'):
            if k in old and k not in d: ordered[k] = old[k]
    open(path, 'w').write(json.dumps(ordered, indent=2, ensure_ascii=False) + '\n')
print(len(D), 'decks written')
