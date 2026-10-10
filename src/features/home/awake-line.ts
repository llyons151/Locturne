/**
 * The day's status line, "Apps awake until 11 pm", shared by Home and the wake screen.
 *
 * The day comes from the clock, so it would name tonight's bedtime even with no night lock
 * (stood down, never bought, Ask to Buy waiting, or arming failed), right above "No
 * subscription, so nothing sleeps". Nothing is scheduled then, so say that instead. The
 * always list is stood down with the rest, and may have no apps in it, so it's only
 * mentioned while it still sleeps.
 *
 * Pure, so it's tested (`awake-line.test.ts`).
 */
export function awakeLine({
  armed,
  stoodDown,
  tonightAt,
  alwaysSleeps,
  noBedtimeApps = false,
}: {
  /** `nightLockArmed()`: a night lock is scheduled (or holding). */
  armed: boolean;
  /** `isStoodDown()`: no subscription, so nothing at all sleeps. */
  stoodDown: boolean;
  /** Tonight's bedtime as a clock label, or null when tonight is off (`nightAt`). */
  tonightAt: string | null;
  /** The always-asleep list has apps in it (`selectionSize('always') > 0`), so they sleep now. */
  alwaysSleeps: boolean;
  /** The bedtime list is empty at the next bedtime, so nothing on it sleeps then. */
  noBedtimeApps?: boolean;
}): string {
  if (stoodDown) return 'Apps awake. Nothing is scheduled to sleep.';
  if (!tonightAt) return alwaysSleeps ? 'Bedtime apps awake. Tonight is off. Always-asleep apps still sleep.' : 'Apps awake. Tonight is off.';
  if (!armed) {
    return alwaysSleeps
      ? 'Bedtime apps awake. Nothing is scheduled to sleep. Always-asleep apps still sleep.'
      : 'Apps awake. Nothing is scheduled to sleep.';
  }
  if (noBedtimeApps) {
    return alwaysSleeps
      ? 'No bedtime apps picked, so nothing sleeps at bedtime. Always-asleep apps still sleep.'
      : 'No bedtime apps picked, so nothing sleeps at bedtime.';
  }
  return `Apps awake until ${tonightAt}`;
}

/**
 * Home's line for a night or morning the clock names but nothing holds (`heldPhase` reads it
 * as day: no lock armed, or after a lapse's last paid morning). "Tonight" is wrong at 07:30,
 * so it names the part of the day. The always list is only promised while it's paid for:
 * without a subscription, but before the store's answer stands it down (opened offline), it
 * may still be shielded, so it isn't mentioned either way.
 */
export function unheldLine({
  phase,
  alwaysSleeps,
  unpaid,
}: {
  phase: 'night' | 'morning';
  /** The always list has apps in it and isn't stood down. */
  alwaysSleeps: boolean;
  /** No subscription past the night or morning a lapse still covers. */
  unpaid: boolean;
}): string {
  const when = phase === 'morning' ? 'this morning' : 'tonight';
  if (!alwaysSleeps) return `Apps awake. Nothing is asleep ${when}.`;
  return unpaid ? `Bedtime apps awake ${when}.` : `Bedtime apps awake ${when}. Always-asleep apps still sleep.`;
}

/**
 * Home's hero by day, including a night or morning nothing holds (`heldPhase` reads it as
 * day). Never names a bedtime that won't lock (GAME_PLAN): when the status needs attention
 * (no subscription, Ask to Buy waiting, arming failed, a lapse) its own words lead, and with
 * no night lock scheduled the line says nothing is scheduled instead of "Bedtime in".
 */
export function dayHero({
  attention,
  scheduled,
  line,
  until,
  sleepsAt,
  offTonight = null,
  alwaysSleeps = false,
  apps = null,
  quip = null,
}: {
  /** `rollUpHealth` said `attention`: its title and detail, or null. */
  attention: { title: string; detail: string } | null;
  /** A night lock is armed and nothing is stood down, so the next bedtime will sleep. */
  scheduled: boolean;
  /** `awakeLine` for now, used when nothing is scheduled. */
  line: string;
  /** How long until the next bedtime (`duration`), or null. */
  until: string | null;
  /** The next bedtime as a clock label, or null when every night is off. */
  sleepsAt: string | null;
  /**
   * Tonight is switched off: the weekday of the next night that's on (`sleepsAt`), which
   * isn't tonight, so the countdown would read as tonight's bedtime. Null when tonight is on.
   */
  offTonight?: string | null;
  /**
   * The always list has apps in it and isn't stood down, so it sleeps even with every night
   * off (as `offHero`).
   */
  alwaysSleeps?: boolean;
  /** Apps on the bedtime list (`bedtimeAppCount`), or null when it also holds categories or sites. */
  apps?: number | null;
  /** Loc's line for tonight (`bedtimeQuip`), in place of the plain "wind down" nudge. */
  quip?: string | null;
}): { title: string; body: string; aside?: string } {
  if (attention) return { title: attention.title, body: attention.detail };
  if (!sleepsAt || !until) {
    return {
      title: 'No bedtime scheduled',
      body: alwaysSleeps ? 'Every night is switched off. Always-asleep apps still sleep.' : 'Every night is switched off, so nothing sleeps.',
    };
  }
  if (!scheduled) return { title: 'No bedtime scheduled', body: line };
  if (offTonight) return { title: 'Tonight is off', body: `Your next bedtime is ${sleepsAt} on ${offTonight}.` };
  const who = apps ? `${apps} ${apps === 1 ? 'app goes' : 'apps go'}` : 'Your apps go';
  const body = `${who} to sleep at ${sleepsAt}.`;
  // Loc's line stands apart from the fact, so it reads as him, not the app being snarky.
  return quip ? { title: `Bedtime in ${until}`, body, aside: quip } : { title: `Bedtime in ${until}`, body: `${body} Start winding down before then.` };
}

/** Loc's evening lines (docs/MASCOT_DIRECTION.md: tired, a bit sassy, never mean). */
const QUIPS = [
  'The feed will still be there tomorrow. Sadly.',
  'Nothing good gets posted after bedtime. I’ve checked.',
  'Finish the episode, not the season.',
  'I’ll guard the apps. You guard the pillow.',
  'One more scroll is how they get you.',
  'Phone on the charger, not on your face.',
  'Tomorrow-you already says thanks.',
];

/** One of Loc's lines, fixed for the day (`dateKey`) so it doesn't change each time Home opens. */
export function bedtimeQuip(day: string): string {
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return QUIPS[hash % QUIPS.length];
}

/**
 * Home's hero while a Block now runs by day: what's asleep, and until when, leads over the
 * countdown to bedtime (the night and morning heroes already say the apps are asleep).
 */
export function napHero(until: string): { title: string; body: string } {
  return { title: 'Your apps are asleep', body: `Block now: apps asleep until ${until}.` };
}

/**
 * The trial's last days (B4, `trialNotice`): the paywall promises a reminder before the
 * charge, and a notification can't keep it for someone with notifications off, so Home says
 * it too. Leads over the day's hero; the caller keeps it behind anything that needs fixing.
 */
export function trialHero(trial: { title: string; detail: string }): { title: string; body: string } {
  return { title: trial.title, body: trial.detail };
}

/**
 * Home's hero on a night that's switched off (phase 'off'). The bedtime apps stay awake, but
 * the always list still sleeps unless it's empty or stood down (round 7 #46), so "nothing
 * sleeps" is only said when that's true. A Block now running leads over this (`napHero`).
 */
export function offHero(alwaysSleeps: boolean): { title: string; body: string } {
  return alwaysSleeps
    ? { title: 'Night off', body: 'Bedtime apps awake tonight. Always-asleep apps still sleep.' }
    : { title: 'Night off', body: "Nothing sleeps tonight. I'm sleeping anyway." };
}
