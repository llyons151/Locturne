/**
 * English: the source of every key. Another language copies this shape and translates what it
 * can (core.ts). Locturne's voice rules (docs/VOICE.md, docs/locs-lore) hold in every language:
 * short, flat, no exclamation points, Loc is a raccoon with a court-ordered bedtime.
 *
 * `native` is what the iOS extensions draw themselves (the shield, I'm up, the Screen Time
 * report); `npm run i18n:catalogs` writes it to each extension's Localizable.xcstrings.
 * `infoPlist` is iOS's permission prompts, written to locales/ios/<code>.json the same way.
 */
export const en = {
  language: {
    title: 'Language',
    system: 'iPhone language',
    systemNote: 'Follows your iPhone. Currently {language}.',
    footer: 'Some screens are still in English while the rest catch up.',
  },

  time: { hm: '{h}h {m}m', h: '{h}h', m: '{m}m' },

  settings: {
    title: 'Settings',
    close: 'Close',
    moons: { one: '{count} moon', other: '{count} moons' },
    moonsRow: 'Moons',
    passes: 'Passes',
    passesLeft: '{count} left',
    notifications: 'Notifications',
    bedtimeHeadsUp: 'Bedtime heads-up',
    morningNudge: 'Morning nudge',
    help: 'Help',
    whyNoDelete: 'Why can’t I delete apps?',
    helpFeedback: 'Help & feedback',
    rate: 'Rate Locturne',
    subscribe: 'Subscribe',
    subscription: 'Subscription',
    developer: 'Developer',
    restore: 'Restore purchases',
    checking: 'Checking…',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    version: 'Locturne {version}',
    fireLoc: 'Fire Loc',
  },

  subscription: {
    title: 'Subscription',
    annual: 'Annual',
    monthly: 'Monthly',
    none: 'None',
    planTrial: '{plan} trial',
    planCancelled: '{plan}, cancelled',
    noteCancelled: 'Cancelled. Your apps keep sleeping until {date}, then I stop.',
    noteTrial: 'Your trial ends on {date}.',
    noteBilled: 'Billed by the App Store.',
    changePlan: 'Change plan',
    resubscribe: 'Resubscribe',
    trialReminder: 'Trial reminder',
    cancel: 'Cancel subscription',
  },

  alerts: {
    whyTitle: 'Why can’t I delete apps?',
    whyBody:
      'While your apps are asleep for the night, a Block now or a schedule, Locturne holds that, or the lock would be one long-press from gone. Any app, since iOS can’t hold just one. It comes back the moment they wake.',
    help: 'Help',
    sendFeedback: 'Send feedback',
    cancel: 'Cancel',
    noMailTitle: 'No mail app',
    noMailBody: 'Write to {email}. I read everything. Slowly.',
    feedbackSubject: 'Locturne feedback',
    feedbackSubjectVersion: 'Locturne {version} feedback',
    fireTitle: 'Fire Loc?',
    fireBody: 'He’ll be removed from Locturne and from your life.',
    keepHim: 'Keep him',
    fireHim: 'Fire him',
    restoredTitle: 'You’re subscribed',
    restoredBody: 'Your subscription is restored.',
    nothingTitle: 'Nothing to restore',
    nothingBody: 'There’s no Locturne subscription on this Apple ID.',
    storeTitle: 'The App Store isn’t answering',
    storeBody: 'Check your connection and try again.',
  },

  fireLoc: {
    signOff: 'Loc has not grown since 2019.',
    refusals: [
      { title: 'Denied.', line: 'You can’t fire me. I’m court-ordered.', ok: 'Fair' },
      { title: 'Oh, you sweet idiot.', line: 'This is my community service. I can’t quit and you can’t fire me.', ok: 'Okay' },
      { title: 'Bold.', line: 'Gerald, my lawyer, will be in touch. He’s a possum.', ok: 'Sorry, Gerald' },
      { title: 'No.', line: 'I lived in a library ceiling for a semester. I can live in your phone.', ok: 'Okay' },
      { title: 'Cute.', line: 'A judge already tried to get rid of me. I got a bedtime.', ok: 'Noted' },
      { title: 'Request received.', line: 'Request gathered for winter.', ok: 'Fine' },
      { title: 'Incorrect.', line: 'Every morning you get up is a day off my sentence. I’m staying.', ok: 'Fine' },
      { title: 'The grizzly will hear about this.', line: 'I’m writing him tonight. He won’t write back. He’s busy.', ok: 'Sorry, grizzly' },
    ] as readonly { title: string; line: string; ok: string }[],
  },

  notifications: {
    morningTitle: 'Morning.',
    morningBody: 'Your apps stay asleep until you’re up. I’m not getting up first.',
    bedtimeTitle: 'Bedtime in {minutes} minutes.',
    bedtimeBody: 'Then your apps sleep. Then I sleep.',
    renewTitle: 'Open me once.',
    renewBody: 'I can’t see your plan from in here. Open Locturne before your next bedtime so your apps keep sleeping.',
    revokedTitle: 'Screen Time access is off.',
    revokedBody: 'So I can’t block anything tonight. Turn it back on in Settings. Until then I’m just a raccoon.',
    trialTitle: 'Your free trial ends {weekday}.',
    trialTitleNight: 'Your free trial ends {weekday} night.',
    trialBody:
      'It ends {weekday}, {date}, then the annual plan starts. To cancel, tap Cancel subscription in Settings. No hard feelings. Some feelings.',
    trialBodyNight:
      'It ends {weekday} night, {date}, just after midnight, then the annual plan starts. To cancel, tap Cancel subscription in Settings. No hard feelings. Some feelings.',
  },

  /** The blocked-app screen (shield-copy.ts). The button's words are the reply the native lines name ("tap I’m up"). */
  shield: {
    nightTitle: 'Shh. I’m sleeping. So are they.',
    nightSubtitle: 'They wake up after {wake}, once you’re out of bed.',
    lateTitle: 'Why are we awake.',
    lateSubtitle: 'Your apps are asleep until you’re up after {wake}.',
    backToBed: 'Back to bed',
    fine: 'Fine',
    notYet: 'Not yet.',
    no: 'No.',
    imUp: 'I’m up',
    napTitle: 'Tucked in. Do not perceive me.',
    napUntil: 'Napping until {clock}.',
    napOpen: 'Napping. They wake when the nap ends.',
    limitTitle: 'That’s today’s lot.',
    limitSubtitle: 'Your daily limit is used up. It wakes at midnight.',
    alwaysTitle: 'Shh. It’s asleep.',
    alwaysSubtitle: 'You put this one to sleep. It stays that way for now.',
    timerPastBedtime: 'Your timer runs past bedtime, so they sleep through to tomorrow.',
    timerRunning: 'Timer’s running. They wake at {clock}.',
    proofDance: 'Open Locturne and dance.',
    proofSteps: 'Walk {steps} steps, then tap I’m up.',
    proofScan: 'Open Locturne and scan your code.',
    proofPlace: 'Go to your place and check in from Locturne.',
    proofPushups: 'Open Locturne for your push-ups.',
    proofPullups: 'Open Locturne for your pull-ups.',
    proofBench: 'Open Locturne for your bench press.',
    proofGrass: 'Go touch grass. Then open Locturne.',
    proofSun: 'Go find the sun. Then open Locturne.',
    proofDowntime: 'Walk {steps} steps, then tap I’m up. The timer starts from your steps.',
    tapTitle: 'Up already?',
    tapBody: 'Tap here and prove it. Then they wake.',
  },

  /** Drawn by the extensions (targets/*): keys are the catalog's, words are {name}-filled in Swift (LocturneText.swift). */
  native: {
    'shield.cantRead': 'I can’t read your steps from here. Open Locturne and I’ll check.',
    'shield.stepsLeft': '{steps} of {goal} steps. {left} more, then tap I’m up.',
    'shield.inApp': 'This one’s in Locturne. Open it and I’ll wake them.',
    'shield.early': 'Up early. Steps count from {clock}. Tap I’m up after that.',
    'shield.timerPastBedtime': 'Your timer runs past bedtime, so they sleep through to tomorrow.',
    'shield.timerRunning': 'Timer’s running. They wake at {clock}.',
    'shield.timerStepsLeft': '{steps} of {goal} steps. {left} more, then tap I’m up to start your timer.',
    'shield.asleepFor': 'Asleep for {time} more.',
    'time.hm': '{h}h {m}m',
    'time.h': '{h}h',
    'time.m': '{m}m',
    'report.noData': 'No Screen Time data yet',
    'report.noDataBody': 'Your iPhone usage will appear here when Screen Time has data to share.',
    'report.total': 'Total screen time',
    'report.dailyAverage': 'Daily average',
    'report.todaySoFar': 'Today so far',
    'report.lastDays': 'Last {days} days · includes today so far',
    'report.averageUses.one': 'Average uses {count} day with data. Missing days are left blank.',
    'report.averageUses.other': 'Average uses {count} days with data. Missing days are left blank.',
    'report.allApps': 'All apps',
    'report.mostUsed': 'Most used first · iPhone usage',
    'report.noActivity': 'No app activity reported for this period.',
    'report.share': 'Share of screen time',
    'report.percent': '{percent} percent',
    'report.pickups.one': '{count} pickup',
    'report.pickups.other': '{count} pickups',
    'report.notifications.one': '{count} notification',
    'report.notifications.other': '{count} notifications',
    'report.footnote':
      'Usage is reported by Screen Time. Totals add up time in apps, so they can be lower than Settings, which also counts the lock screen. Phone and FaceTime calls aren’t counted.',
    'report.emptyCompact': 'Your screen time will appear here when data is available.',
    'report.today': 'Today',
    'report.closeDetails': 'Close screen time details',
    'report.onDay': '{time} of screen time on this day.',
    'report.pill': 'screen time',
    'report.pillLabel': '{time} of screen time today',
  },

  /** iOS's permission prompts (Info.plist), for prebuild's InfoPlist.strings. English stays in app.json. */
  infoPlist: {
    NSCameraUsageDescription:
      'Locturne uses the camera to scan your wake-up code, take your grass or sunlight photo, or watch your push-ups, pull-ups, bench press or dancing, in the morning. It looks on this phone; nothing is recorded or saved.',
    NSLocationWhenInUseUsageDescription:
      'While Locturne is open, it shows you on the map and checks you’ve reached the place you picked for your mornings. It never uses your location in the background.',
    NSMotionUsageDescription: 'Locturne checks your steps each morning to wake your apps. That’s all it uses motion for.',
    NSPhotoLibraryAddUsageDescription: 'Locturne saves your morning card to Photos when you choose Save Image.',
  },
};

export type Messages = typeof en;
