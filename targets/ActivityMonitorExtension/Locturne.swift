//
//  Locturne.swift
//
//  Locturne's own lock helpers, shared by the monitor extension and the ShieldAction
//  extension (its "I'm up" check). The same file sits in both targets, like the library's
//  Shared.swift: edit one, copy it to the other (native-tests/run.sh checks they match).
//

import FamilyControls
import Foundation
import ManagedSettings

// MARK: - Locturne

// iOS keeps one blocklist for the whole app, so an action that unshields one list (a nap
// ending, a limit resetting at midnight) also unshields any of its apps another rule still
// holds. After every event, put back each rule still in force. Keep this in step with
// `reapplyStandingBlocks` in src/lib/screen-time.ts, which does the same from the app.

let LOCTURNE_NIGHT_PREFIX = "night-"
let LOCTURNE_LIMIT_PREFIX = "limit-"
let LOCTURNE_NAP_ACTIVITY = "locturne-nap"
let LOCTURNE_NAP_KEY = "locturne.nap"
let LOCTURNE_NIGHT_HELD_KEY = "locturne.nightHeld"
let LOCTURNE_LIMITS_KEY = "locturne.limits"
let LOCTURNE_LIMIT_REACHED_PREFIX = "locturne.limitReached."
let LOCTURNE_LIMIT_REACHED_AT_PREFIX = "locturne.limitReachedAt."

/// Was the limit used up today? By the moment it happened, against local midnight now: right
/// across a flight either way, and still today's with the clock set back. A mark without the
/// moment (an older build) goes by the day. Keep in step with `usedUpToday` in screen-time.ts.
func locturneLimitUsedUpToday(_ id: String, now: Date = Date()) -> Bool {
  if let at = (userDefaults?.object(forKey: "\(LOCTURNE_LIMIT_REACHED_AT_PREFIX)\(id)") as? NSNumber)?.doubleValue {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = .current
    // At least the limit's minutes after midnight (the stale-threshold bound): only then can
    // the whole allowance have been used today. A flight west can put it just after midnight.
    let limits = userDefaults?.array(forKey: LOCTURNE_LIMITS_KEY) as? [[String: Any]]
    let minutes = (limits?.first(where: { $0["id"] as? String == id })?["minutes"] as? NSNumber)?.doubleValue ?? 0
    // And not more than a day ahead: a mark from a clock set forward (then put back) would
    // otherwise hold the apps for every real day until that moment comes round.
    return at / 1000 >= calendar.startOfDay(for: now).timeIntervalSince1970 + minutes * 60
      && at / 1000 < now.timeIntervalSince1970 + 26 * 60 * 60
  }
  return userDefaults?.string(forKey: "\(LOCTURNE_LIMIT_REACHED_PREFIX)\(id)") == locturneDayKey(now)
}
let LOCTURNE_PENDING_LISTS_KEY = "locturne.pendingLists"
let LOCTURNE_HEARTBEAT_KEY = "locturne.heartbeat"
let LOCTURNE_ROUTINE_KEY = "locturne.routine"
let LOCTURNE_STOOD_DOWN_KEY = "locturne.stoodDown"
let LOCTURNE_ARMED_KEY = "locturne.armedNight"
let LOCTURNE_SUBSCRIPTION_ENDED_KEY = "locturne.subscriptionEnded"
let LOCTURNE_ENDED_MORNING_KEY = "locturne.subscriptionEndedMorning"
/// The morning words and their tap, kept fresh by the app (`MORNING_SHIELD` in screen-time.ts).
let LOCTURNE_MORNING_SHIELD = "locturne-morning"
/// The always list's words, for the fallback shield (`ALWAYS_SHIELD` in screen-time.ts).
let LOCTURNE_ALWAYS_SHIELD = "locturne-always"
/// A used-up limit's words, restored to the fallback while one is used up today
/// (`LIMIT_SHIELD` in screen-time.ts).
let LOCTURNE_LIMIT_SHIELD = "locturne-limit"
let LOCTURNE_HEARTBEAT_KEEP = 100

/// Has less real time passed since midnight than the limit allows? Then its threshold can't be
/// today's (usage since midnight is at most the time since midnight). Real seconds, not wall
/// minutes, so the autumn clock change can't drop a genuine one.
func locturneLimitThresholdIsStale(_ id: String, now: Date = Date()) -> Bool {
  guard let limits = userDefaults?.array(forKey: LOCTURNE_LIMITS_KEY) as? [[String: Any]],
    let limit = limits.first(where: { $0["id"] as? String == id }),
    let minutes = (limit["minutes"] as? NSNumber)?.doubleValue
  else { return false }
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = .current
  return now.timeIntervalSince(calendar.startOfDay(for: now)) < minutes * 60
}

/// Today as YYYY-MM-DD in local time, like `dateKey` in src/lib/lock-state.ts. Always the
/// Gregorian calendar: with the phone set to Japanese, Buddhist or Hebrew dates,
/// `Calendar.current` would write years JS never matches, and used-up limits would read as
/// not used up.
func locturneDayKey(_ date: Date = Date()) -> String {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = .current
  let day = calendar.dateComponents([.year, .month, .day], from: date)
  return String(format: "%04d-%02d-%02d", day.year ?? 0, day.month ?? 0, day.day ?? 0)
}

/// The night's times the windows were laid out from: the armed record (`armNight` in
/// src/lib/screen-time.ts), else the saved routine. The armed times, not the routine's, say
/// where a window sits: after a routine edit the old windows run until the app re-arms them.
func locturneNightTimes() -> (bedtime: Int, morningStart: Int)? {
  let routine = userDefaults?.dictionary(forKey: LOCTURNE_ROUTINE_KEY)?["active"] as? [String: Any]
  return locturneTimes(userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY)) ?? locturneTimes(routine)
}

func locturneTimes(_ dict: [String: Any]?) -> (bedtime: Int, morningStart: Int)? {
  guard let bedtime = locturneMinuteOfDay(dict?["bedtime"]),
    let morningStart = locturneMinuteOfDay(dict?["morningStart"])
  else { return nil }
  return (bedtime, morningStart)
}

/// A stored time as a minute of the day, 0–1439, or nil when it isn't a finite number. Taken
/// round the day as a Double first: converting a huge or infinite value to Int would trap, and
/// a trap kills the extension, and every lock with it.
func locturneMinuteOfDay(_ value: Any?) -> Int? {
  guard let number = (value as? NSNumber)?.doubleValue, number.isFinite else { return nil }
  let minute = number.rounded(.down).truncatingRemainder(dividingBy: 1440)
  return Int(minute < 0 ? minute + 1440 : minute) % 1440
}

/// The saved routine in force now: an edit waiting for bedtime once it's due (two minutes
/// early, since iOS can start a window a little early), else the active one.
func locturneRoutineInForce(_ now: Date = Date()) -> [String: Any]? {
  guard let stored = userDefaults?.dictionary(forKey: LOCTURNE_ROUTINE_KEY) else { return nil }
  if let pending = stored["pending"] as? [String: Any],
    let from = (pending["from"] as? NSNumber)?.doubleValue,
    from <= now.timeIntervalSince1970 * 1000 + 120_000,
    let next = pending["routine"] as? [String: Any]
  {
    return next
  }
  return stored["active"] as? [String: Any]
}

func locturneMinute(_ date: Date) -> Int {
  let time = Calendar.current.dateComponents([.hour, .minute], from: date)
  return (time.hour ?? 0) * 60 + (time.minute ?? 0)
}

/// Is `minute` inside the night from `bedtime` to `morningStart`? Up to 2 minutes before
/// bedtime counts, since iOS can start a window a little early (as for a pending edit).
func locturneInside(_ minute: Int, bedtime: Int, morningStart: Int) -> Bool {
  let length = (morningStart - bedtime + 1440) % 1440
  let sinceBedtime = (minute - bedtime + 1440) % 1440
  return sinceBedtime < length || sinceBedtime >= 1440 - 2
}

/// Is now inside the night of the routine in force? Yes when it can't be read.
func locturneInsideNightInForce(_ now: Date = Date()) -> Bool {
  guard let times = locturneTimes(locturneRoutineInForce(now)) else { return true }
  return locturneInside(locturneMinute(now), bedtime: times.bedtime, morningStart: times.morningStart)
}

/// Where a bedtime window starting `now` sits, by the armed times. `evening`: the evening its
/// night belongs to. A night belongs to the evening before its morning, so a window after
/// midnight belongs to yesterday evening, as in `getLockState` (src/lib/lock-state.ts).
/// `outside`: it started outside its night, which only a clock change does. When the spring
/// change skips a window's start (02:15 when 02:00 jumps to 03:00), iOS starts it later, at or
/// after morning start; it belongs to the night that just ended. `bedtime`: when that night
/// started, give or take the clock change.
func locturneWindowNight(_ now: Date = Date()) -> (evening: Date, outside: Bool, bedtime: Date) {
  let calendar = Calendar.current
  let minute = locturneMinute(now)
  let day = { (offset: Int) in calendar.date(byAdding: .day, value: offset, to: now) ?? now }
  guard let (bedtime, morningStart) = locturneNightTimes() else { return (now, false, now) }

  let length = (morningStart - bedtime + 1440) % 1440
  let sinceBedtime = (minute - bedtime + 1440) % 1440
  let early = sinceBedtime >= 1440 - 2
  if sinceBedtime < length || early {
    // An early callback after midnight still belongs to the preceding evening. Only
    // an early callback before midnight (e.g. 23:59 for a 00:00 bedtime) uses today.
    let afterMidnight = minute < morningStart
    let started = now.addingTimeInterval(early ? 0 : -Double(sinceBedtime) * 60)
    return (afterMidnight ? day(-1) : now, false, started)
  }
  // Outside: the night whose morning start was the last one before now.
  let sinceMorning = (minute - morningStart + 1440) % 1440
  let evening = minute >= morningStart ? day(-1) : day(-2)
  // An hour more, for the clock change itself.
  let started = now.addingTimeInterval(-Double(sinceMorning + length + 60) * 60)
  return (evening, true, started)
}

/// Did any night window start since `since`? From the heartbeat log.
func locturneNightWindowRan(since: Date) -> Bool {
  let after = since.timeIntervalSince1970 * 1000
  let log = userDefaults?.array(forKey: LOCTURNE_HEARTBEAT_KEY) ?? []
  return log.contains { entry in
    guard let entry = entry as? [String: Any],
      let activity = entry["activity"] as? String,
      let at = (entry["at"] as? NSNumber)?.doubleValue
    else { return false }
    let callback = entry["callback"] as? String
    // A committed handoff already decided whether this morning was held. A start
    // skipped forward by DST must not replace that verdict with a phantom lock.
    return activity.hasPrefix(LOCTURNE_NIGHT_PREFIX) && (callback == "intervalDidStart" || callback == "scheduleHandoff")
      && at >= after
  }
}

/// Is the night of `evening` switched on? Reads the routine in force (`locturne.routine` in
/// src/lib/routine.ts). If anything can't be read the answer is yes: a missing or unreadable
/// routine must never skip a lock.
func locturneNightIsOn(evening: Date, now: Date = Date()) -> Bool {
  guard let nights = locturneRoutineInForce(now)?["activeNights"] as? [NSNumber] else { return true }
  // Calendar weekdays run 1 (Sunday) to 7; `Date.getDay()` runs 0 (Sunday) to 6.
  let weekday = Calendar.current.component(.weekday, from: evening) - 1
  return nights.contains { $0.intValue == weekday }
}

/// Did the subscription end before the night of `evening`? The app records the morning under
/// way when it found no subscription (`settleSubscription` in src/lib/lock-controller.ts); that
/// morning, and the night leading into it, finish. Every later night must not lock, even if
/// Locturne stays closed until then. Without the morning recorded, nothing is skipped.
func locturneSubscriptionLapsed(before evening: Date) -> Bool {
  guard userDefaults?.object(forKey: LOCTURNE_SUBSCRIPTION_ENDED_KEY) != nil,
    let ended = userDefaults?.string(forKey: LOCTURNE_ENDED_MORNING_KEY),
    let morning = Calendar.current.date(byAdding: .day, value: 1, to: evening)
  else { return false }
  // Both are YYYY-MM-DD, so they compare as dates.
  return locturneDayKey(morning) > ended
}

/// Whether a selection holds no apps, categories or sites.
func locturneIsEmpty(_ selection: FamilyActivitySelection) -> Bool {
  selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty
    && selection.webDomainTokens.isEmpty
}

/// Whether a saved list has any picks. A saved but empty selection counts as none.
func locturneHasPicks(_ id: String) -> Bool {
  guard let selection = getFamilyActivitySelectionById(id: id) else { return false }
  return !locturneIsEmpty(selection)
}

/// Whether the bedtime list holds anything for a night: its picks, or websites typed in by hand,
/// which the web filter blocks while the night is held (`reapplyLocturneWebsites`). Not the
/// sites while the list still waits in the pending lists once they're settled: that's an
/// emergency unlock's parked picks (`pauseNightUntil`), and the sites stay awake with them.
/// Keep in step with `nightPickCount` in src/lib/screen-time.ts.
func locturneNightHasPicks() -> Bool {
  if locturneHasPicks("night") { return true }
  let pending = userDefaults?.dictionary(forKey: LOCTURNE_PENDING_LISTS_KEY) ?? [:]
  if pending["night"] != nil { return false }
  let sites = userDefaults?.dictionary(forKey: LOCTURNE_SITES_KEY) as? [String: [String]] ?? [:]
  return !(sites["night"] ?? []).isEmpty
}

/// The last night window ends at morning start. With the night still held, the bedtime apps
/// now show the morning's words, whose button sends the notification that opens the wake-up
/// screen, even if Locturne stayed closed all night. Nothing is shielded here: a night that
/// was off is untouched, and one with no bedtime picks left (an emergency pause, or a list
/// emptied at bedtime) has its hold let go and the day's words put back.
@available(iOS 15.0, *)
func showLocturneMorningShield(activity: String, now: Date = Date()) {
  guard activity.hasPrefix(LOCTURNE_NIGHT_PREFIX),
    let times = locturneTimes(userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY))
  else { return }
  let minute = locturneMinute(now)
  // iOS may call up to 5 minutes early, or late: any time past the morning start counts (a
  // phone off at 7:00 gets its end call later, or never: `locturneMorningShieldIfDue`). An
  // earlier window's end falls inside the night, at least 15 minutes before.
  let sinceMorning = (minute - times.morningStart + 1440) % 1440
  guard sinceMorning >= 1440 - 5 || !locturneInside(minute, bedtime: times.bedtime, morningStart: times.morningStart)
  else { return }
  if !locturneNightHasPicks() {
    // No bedtime picks (an emergency pause, or a list emptied at bedtime): nothing to prove.
    // Let go of any hold the windows set on the empty list and put the day's words back, or
    // the night's would stay all day. Held or not: an emergency after the last window starts
    // leaves no hold, but the night words the app wrote then are still up.
    userDefaults?.set(false, forKey: LOCTURNE_NIGHT_HELD_KEY)
    restoreLocturneFallbackShield(triggeredBy: "locturne_\(activity)_pausedMorning")
    return
  }
  guard userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true else { return }
  updateShield(
    shieldId: LOCTURNE_MORNING_SHIELD,
    triggeredBy: "locturne_\(activity)_morning",
    activitySelectionId: "night"
  )
}

/// The always list's words back on the app-wide fallback shield, which every app without a
/// list's own config shows (the always list, a used-up limit). Only the app rewrites it
/// otherwise, so a rule ending with Locturne closed would leave its words behind. The app
/// keeps them fresh under `LOCTURNE_ALWAYS_SHIELD` (`setAlwaysShieldText` in screen-time.ts);
/// before it has, there's nothing to restore and nothing changes.
func restoreLocturneFallbackShield(triggeredBy: String) {
  // A held night's words are on the fallback too (a window's `blockSelection` names its
  // shield): a limit's midnight mid-night mustn't swap them out. A night off clears the hold first.
  if userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true { return }
  // A running nap's words live only on the fallback (its list has no config of its own):
  // a limit's midnight or a night off mid-nap mustn't take them away.
  if let nap = userDefaults?.dictionary(forKey: LOCTURNE_NAP_KEY),
    let end = nap["end"] as? Double,
    Date().timeIntervalSince1970 * 1000 < end
  {
    return
  }
  // A limit used up today ranks next (`shieldRule` in shield-copy.ts): its words, not the
  // always list's. A limit's start isn't only midnight (arming one mid-day starts it too); at
  // a real midnight every used-up mark is yesterday's, so the always words come back then.
  let limitUsedUp =
    (userDefaults?.array(forKey: LOCTURNE_LIMITS_KEY) as? [[String: Any]])?.contains(where: { limit in
      guard let id = limit["id"] as? String else { return false }
      return locturneLimitUsedUpToday(id)
    }) ?? false
  // The bedtime list's own config too: an app on it that's also asleep for another rule
  // reads that first, and it still holds the last words the app or a window put there. Safe:
  // this never runs while the night is held, and the next bedtime window rewrites it.
  updateShield(
    shieldId: limitUsedUp ? LOCTURNE_LIMIT_SHIELD : LOCTURNE_ALWAYS_SHIELD,
    triggeredBy: triggeredBy,
    activitySelectionId: "night"
  )
}

// MARK: - App schedules

let LOCTURNE_SCHEDULES_KEY = "locturne.schedules"
let LOCTURNE_SCHEDULE_PREFIX = "sched-"

/// The app schedules saved (src/lib/schedules.ts), with any edit waiting for its block's end
/// that's due by `now` put in force, and saved back if one was. Keep in step with
/// `settleSchedules` there.
func locturneSchedules(now: Date) -> [[String: Any]] {
  guard let stored = userDefaults?.array(forKey: LOCTURNE_SCHEDULES_KEY) as? [[String: Any]] else { return [] }
  var settled: [[String: Any]] = []
  var changed = false
  for schedule in stored {
    guard let pending = schedule["pending"] as? [String: Any],
      let from = (pending["from"] as? NSNumber)?.doubleValue,
      from <= now.timeIntervalSince1970 * 1000
    else {
      settled.append(schedule)
      continue
    }
    changed = true
    if var next = pending["schedule"] as? [String: Any] {
      next["id"] = schedule["id"]
      settled.append(next)
    }
  }
  if changed { userDefaults?.set(settled, forKey: LOCTURNE_SCHEDULES_KEY) }
  return settled
}

/// Is an app schedule blocking at `now`? A block starts at `start` (minutes on the wall clock)
/// on each of `days` (0 is Sunday) and runs to `end`, past midnight if need be; all day runs
/// midnight to midnight. A block past midnight belongs to the day it started. The same rule as
/// `blockAt` in src/lib/schedules.ts.
func locturneScheduleBlocking(_ schedule: [String: Any], at now: Date) -> Bool {
  guard let days = schedule["days"] as? [NSNumber] else { return false }
  let allDay = (schedule["allDay"] as? Bool) == true
  let start = allDay ? 0 : ((schedule["start"] as? NSNumber)?.intValue ?? 0)
  let end = allDay ? 0 : ((schedule["end"] as? NSNumber)?.intValue ?? 0)
  var length = ((end - start) % 1440 + 1440) % 1440
  if allDay || length == 0 { length = 1440 }
  let calendar = Calendar.current
  for offset in [0, -1] {
    guard let day = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now)),
      days.contains(where: { $0.intValue == calendar.component(.weekday, from: day) - 1 }),
      let from = calendar.date(bySettingHour: start / 60, minute: start % 60, second: 0, of: day),
      let endDay = calendar.date(byAdding: .day, value: (start + length) / 1440, to: day),
      let to = calendar.date(bySettingHour: (start + length) % 1440 / 60, minute: (start + length) % 60, second: 0, of: endDay)
    else { continue }
    if now >= from && now < to { return true }
  }
  return false
}

/// Shields always-blocked, the night lock, a running nap and limits used up today. Only adds.
/// Nothing at all without a subscription (`standDown` in src/lib/screen-time.ts).
@available(iOS 15.0, *)
func reapplyLocturneBlocks(triggeredBy: String) {
  // First: the filter is set whole, so it also lifts websites nothing holds (or all, stood down).
  reapplyLocturneWebsites(triggeredBy: triggeredBy)
  if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true { return }
  var held = ["always"]

  if userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true {
    held.append("night")
  }

  if let nap = userDefaults?.dictionary(forKey: LOCTURNE_NAP_KEY),
    let end = nap["end"] as? Double,
    let list = nap["list"] as? String,
    Date().timeIntervalSince1970 * 1000 < end
  {
    held.append(list)
  }

  if let limits = userDefaults?.array(forKey: LOCTURNE_LIMITS_KEY) as? [[String: Any]] {
    for limit in limits {
      if let id = limit["id"] as? String,
        locturneLimitUsedUpToday(id)
      {
        held.append(id)
      }
    }
  }

  // Two minutes on, as iOS can deliver a block's start or end a little early (as with the night
  // windows): an early start still shields, and an early end isn't undone right after.
  let soon = Date().addingTimeInterval(120)
  for schedule in locturneSchedules(now: soon) where locturneScheduleBlocking(schedule, at: soon) {
    if let id = schedule["id"] as? String { held.append(id) }
  }

  var selection = FamilyActivitySelection()
  for id in held {
    if let picked = getFamilyActivitySelectionById(id: id) {
      selection = union(selection, picked)
    }
  }
  blockSelectedApps(blockSelection: selection, triggeredBy: triggeredBy)
  locturneMorningShieldIfDue()
}

/// Is the bedtime list showing the morning's shield, whose button runs "I'm up"?
func locturneMorningShieldUp() -> Bool {
  let actions = userDefaults?.dictionary(forKey: "\(SHIELD_ACTIONS_FOR_SELECTION_PREFIX)_night")
  return (actions?["primary"] as? [String: Any])?["type"] as? String == LOCTURNE_MORNING_CHECK
}

/// The morning's shield, if the last window's end never put it up: iOS can deliver that call
/// late (the phone was off at the morning start) or drop it, and the night's words only close,
/// so the morning could be proved only by opening Locturne. Any later callback fixes it. Once
/// it's up, it's left alone, so a tap's "120 of 200 steps" isn't written over.
@available(iOS 15.0, *)
func locturneMorningShieldIfDue(now: Date = Date()) {
  guard userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true, !locturneMorningShieldUp(),
    let times = locturneTimes(userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY)),
    !locturneInside(locturneMinute(now), bedtime: times.bedtime, morningStart: times.morningStart)
  else { return }
  showLocturneMorningShield(activity: "\(LOCTURNE_NIGHT_PREFIX)late", now: now)
}

let LOCTURNE_SITES_KEY = "locturne.sites"
let LOCTURNE_SITES_PENDING_KEY = "locturne.sitesPending"

/// Sets iOS's web content filter to every typed-in website a rule holds: the always list's, and
/// the bedtime list's while the night holds it or a nap of it runs. None without a subscription.
/// Keep in step with `applyWebsiteFilter` in src/lib/screen-time.ts.
@available(iOS 15.0, *)
func reapplyLocturneWebsites(triggeredBy: String) {
  var held = Set<String>()
  if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) != true {
    let sites = userDefaults?.dictionary(forKey: LOCTURNE_SITES_KEY) as? [String: [String]] ?? [:]
    var lists = ["always"]
    var napsNight = false
    if let nap = userDefaults?.dictionary(forKey: LOCTURNE_NAP_KEY),
      let end = (nap["end"] as? NSNumber)?.doubleValue,
      nap["list"] as? String == "night",
      Date().timeIntervalSince1970 * 1000 < end
    {
      napsNight = true
    }
    if userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true || napsNight {
      lists.append("night")
    }
    for list in lists {
      held.formUnion(sites[list] ?? [])
    }
  }
  if held.isEmpty {
    clearWebContentFilterPolicy(triggeredBy: triggeredBy)
    return
  }
  do {
    try setWebContentFilterPolicy(
      policyInput: ["type": "specific", "domains": Array(held)],
      triggeredBy: triggeredBy
    )
  } catch {
    setWebContentFilterPolicyErrorMetadata(triggeredBy: triggeredBy, error: error)
  }
}

/// Swaps in each list's removed websites whose bedtime has come, with the same two minutes'
/// slack as `settleLocturneLists`. The re-apply after each event lifts them. Keep in step with
/// `settleSites` in src/lib/websites.ts.
@available(iOS 15.0, *)
func settleLocturneSites() {
  guard var pending = userDefaults?.dictionary(forKey: LOCTURNE_SITES_PENDING_KEY) else { return }
  var sites = userDefaults?.dictionary(forKey: LOCTURNE_SITES_KEY) ?? [:]
  let now = Date().timeIntervalSince1970 * 1000 + 120_000
  var changed = false
  for (list, value) in pending {
    guard let entry = value as? [String: Any],
      let from = (entry["from"] as? NSNumber)?.doubleValue,
      from <= now
    else { continue }
    sites[list] = entry["sites"] as? [String] ?? []
    pending.removeValue(forKey: list)
    changed = true
  }
  if changed {
    userDefaults?.set(sites, forKey: LOCTURNE_SITES_KEY)
    userDefaults?.set(pending, forKey: LOCTURNE_SITES_PENDING_KEY)
  }
}

/// Swaps in each edited list whose bedtime has come. The app keeps removals in a draft
/// (`<list>-next`) until then; this makes them start at bedtime even if Locturne stays
/// closed. The old picks are unshielded first so removed apps really wake; the re-apply
/// after each event shields whatever is still held. Keep in step with `settleListChanges`
/// in src/lib/screen-time.ts.
@available(iOS 15.0, *)
func settleLocturneLists(triggeredBy: String) {
  guard var pending = userDefaults?.dictionary(forKey: LOCTURNE_PENDING_LISTS_KEY) else {
    return
  }
  // The same two minutes' slack as `locturneNightIsOn`: an edit (or an emergency unlock's
  // parked bedtime list) is due at bedtime, and iOS can run the bedtime window a little
  // early. Without it, that window would shield the still-empty list after an emergency
  // unlock, and nothing would sleep until the next window, 15 minutes later at bedtime.
  let now = Date().timeIntervalSince1970 * 1000 + 120_000
  var changed = false

  for (list, value) in pending {
    // A daily limit's picks wait for the app (`settleLimitChanges`), which swaps them and
    // re-arms iOS's count in one go. Swapped here, the list and what iOS counts would part:
    // its threshold would measure apps the limit no longer holds, or be ignored.
    if list.hasPrefix(LOCTURNE_LIMIT_PREFIX) { continue }
    guard let entry = value as? [String: Any],
      let from = (entry["from"] as? NSNumber)?.doubleValue,
      from <= now
    else { continue }

    // Only an explicit `empty` empties the list. A missing draft alone means the app settled
    // it a moment ago, and the list is already right (`settleListChanges` in screen-time.ts).
    // An emptied draft (an older build saved one when the last pick was swiped away) is no
    // picks: the list is removed, not set to nothing, so it reads as empty everywhere.
    let next = getFamilyActivitySelectionById(id: "\(list)-next").flatMap { locturneIsEmpty($0) ? nil : $0 }
    if next != nil || (entry["empty"] as? Bool) == true {
      if let old = getFamilyActivitySelectionById(id: list) {
        unblockSelection(removeSelection: old, triggeredBy: triggeredBy)
      }
      if let next = next {
        setFamilyActivitySelectionById(id: list, activitySelection: next)
      } else {
        removeFamilyActivitySelectionById(id: list)
      }
      removeFamilyActivitySelectionById(id: "\(list)-next")
    }
    pending.removeValue(forKey: list)
    changed = true
  }

  if changed {
    userDefaults?.set(pending, forKey: LOCTURNE_PENDING_LISTS_KEY)
  }
}

/// Notes that iOS ran this callback, newest first, keeping the last `LOCTURNE_HEARTBEAT_KEEP`.
/// The app's nightly self-check reads it to tell whether bedtime really shielded the apps
/// while Locturne was closed. Runs last, so `shielded` says whether any shield is up once the
/// callback has done its work. Kept tiny for the extension's ~6 MB memory limit. Keep in step
/// with src/lib/heartbeat.ts.
@available(iOS 15.0, *)
func recordLocturneHeartbeat(activity: String, callback: String) {
  // Whether the bedtime list has anything to put to sleep. `shielded` alone can't tell: the
  // always list keeps a shield up even when the bedtime list is empty.
  let night = getFamilyActivitySelectionById(id: "night")
  let nightPicks =
    (night?.applicationTokens.count ?? 0) + (night?.categoryTokens.count ?? 0)
    + (night?.webDomainTokens.count ?? 0)
  let entry: [String: Any] = [
    "activity": activity,
    "callback": callback,
    "at": (Date().timeIntervalSince1970 * 1000).rounded(),
    "shielded": isShieldActive(),
    "nightPicked": nightPicks > 0,
  ]
  var log: [Any] = [entry]
  if let earlier = userDefaults?.array(forKey: LOCTURNE_HEARTBEAT_KEY) {
    log.append(contentsOf: earlier.prefix(LOCTURNE_HEARTBEAT_KEEP - 1))
  }
  userDefaults?.set(log, forKey: LOCTURNE_HEARTBEAT_KEY)
}

// MARK: - The morning check ("I'm up" on the shield)

// The motion chip keeps a week of steps and floors, counted while Locturne was closed
// (docs/BACKGROUND_UNLOCK.md §1). So the morning shield's button can read them from the
// ShieldAction extension and wake the bedtime apps right there, without opening the app. The
// motion query itself is in the ShieldAction target (LocturneMorningCheck.swift); the rules,
// the proof and the wake are here, where the native tests reach them.

let LOCTURNE_PROOFS_KEY = "locturne.morningProofs"
let LOCTURNE_WON_KEY = "locturne.morningsWon"
let LOCTURNE_FIRST_KEY = "locturne.firstMorning"
/// As `KEEP` in src/lib/morning-proof.ts.
let LOCTURNE_PROOFS_KEEP = 30
/// The button type the app puts on the morning shield (`shieldActions` in screen-time.ts).
let LOCTURNE_MORNING_CHECK = "locturneMorningCheck"
/// A floor changed counts for "go downstairs" with at least this many steps around it: the
/// chip only counts floors while walking, and a few steps rule out a lift.
let LOCTURNE_FLOOR_STEPS = 20
/// What each check found, newest first, for the Screen Time lab (device testing).
let LOCTURNE_MORNING_CHECKS_KEY = "locturne.morningChecks"
let LOCTURNE_MORNING_CHECKS_KEEP = 20

/// The morning under way that the night lock still holds.
struct LocturneMorning {
  /// `LockState.morningKey`: the morning start's date, YYYY-MM-DD.
  let key: String
  let start: Date
  let method: String
  let stepGoal: Int
  /// The routine's times the proof is judged under (`recordProof` saves them).
  let bedtime: Int
  let morningStart: Int
}

/// The morning the night lock still holds, or nil: no hold (proven, paused, never locked),
/// stood down, or still inside the night. Its start is the last morning start before now, by
/// the armed times, which are when the windows really ended.
func locturneHeldMorning(now: Date = Date()) -> LocturneMorning? {
  guard userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true,
    userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) != true,
    let times = locturneNightTimes(),
    !locturneInside(locturneMinute(now), bedtime: times.bedtime, morningStart: times.morningStart)
  else { return nil }
  let calendar = Calendar.current
  guard var start = calendar.date(bySettingHour: times.morningStart / 60, minute: times.morningStart % 60, second: 0, of: now)
  else { return nil }
  if start > now, let before = calendar.date(byAdding: .day, value: -1, to: start) { start = before }
  let routine = locturneRoutineInForce(now) ?? [:]
  let judged = locturneTimes(routine) ?? times
  return LocturneMorning(
    key: locturneDayKey(start),
    start: start,
    method: locturneMethodInUse(routine["method"] as? String ?? "steps"),
    stepGoal: (routine["stepGoal"] as? NSNumber)?.intValue ?? 200,
    bedtime: judged.bedtime,
    morningStart: judged.morningStart
  )
}

/// Pure: the proof the motion history gives, or nil. Steps prove only a steps morning (user
/// 2026-10-28: 200 steps no longer beat the other methods by themselves; walking instead is
/// chosen in Locturne); a floor changed with a few steps proves "go downstairs".
func locturneMotionProof(method: String, stepGoal: Int, steps: Int, floors: Int) -> String? {
  if method == "downstairs" && floors >= 1 && steps >= LOCTURNE_FLOOR_STEPS { return "downstairs" }
  // A goal of 0 or less (never saved by the app) mustn't wake on no steps at all.
  // A method this extension doesn't know (a newer app's) still takes a walk, so nobody is stuck.
  let walks = !["downstairs", "scan", "place", "pushups"].contains(method)
  if walks && steps >= max(stepGoal, 1) { return "steps" }
  return nil
}

/// The method the morning really asks for, as `methodInUse` in src/lib/scan-code.ts: a scan
/// morning with no code set up yet, or a place morning with no place picked, is a walk.
func locturneMethodInUse(_ method: String) -> String {
  if method == "scan" && userDefaults?.object(forKey: "locturne.scanCode") == nil { return "steps" }
  if method == "place" && userDefaults?.object(forKey: "locturne.morningPlace") == nil { return "steps" }
  return method
}

/// Pure: the morning shield's line while the morning isn't proven yet: how far they've got.
/// Nil steps: the history couldn't be read here.
func locturneMorningProgress(method: String, stepGoal: Int, steps: Int?) -> String {
  guard let steps else { return "I can’t read your steps from here. Open Locturne and I’ll check." }
  let left = max(0, stepGoal - steps)
  switch method {
  case "downstairs":
    return "No stairs yet. Go down a floor, then tap I’m up."
  case "steps":
    return "\(steps) of \(stepGoal) steps. \(left) more, then tap I’m up."
  default:
    // The camera and the check-in live in Locturne, and so does walking instead.
    return "This one’s in Locturne. Open it and I’ll wake them."
  }
}

/// Pure: the morning shield's line for a tap before the morning start. iOS can end the last
/// window up to 5 minutes early, so "I'm up" shows a little before it, but steps only count
/// from then. In the app's clock style (`clockLabel` in src/lib/shield-copy.ts): "7 am".
func locturneEarlyTapLine(morningStart: Int) -> String {
  let m = ((morningStart % 1440) + 1440) % 1440
  let hour = m / 60 % 12 == 0 ? 12 : m / 60 % 12
  let clock = m % 60 == 0 ? "\(hour)" : "\(hour):\(String(format: "%02d", m % 60))"
  return "Up early. Steps count from \(clock) \(m < 720 ? "am" : "pm"). Tap I’m up after that."
}

private func locturneProofs() -> [[String: Any]] {
  // Entry by entry: one bad entry mustn't hide the rest (and saving a new proof would drop them).
  (userDefaults?.array(forKey: LOCTURNE_PROOFS_KEY) ?? []).compactMap { $0 as? [String: Any] }
}

private func locturneIsWin(_ proof: [String: Any]) -> Bool {
  let kind = proof["kind"] as? String
  return kind != "pass" && kind != "emergency"
}

/// Is a proof for this morning already saved? One for its key from within the last day: an
/// older one is the date replayed after a flight, which needs its own wake-up (`proofUnlocks`).
func locturneMorningProven(_ morning: LocturneMorning) -> Bool {
  let since = (morning.start.timeIntervalSince1970 - 24 * 60 * 60) * 1000
  return locturneProofs().contains { proof in
    proof["morningKey"] as? String == morning.key && ((proof["at"] as? NSNumber)?.doubleValue ?? 0) >= since
  }
}

/// Did a wake-up method prove the morning the night of this bedtime window leads into, after
/// that night began and not after now? Recorded only once a morning has started, so one exists
/// only when the morning start moved later after the walk. A proof stamped after now came from
/// a clock set forward, and one made before its own morning start in this zone (the morning
/// start it was judged under) from a zone set ahead: neither frees a night. Passes and
/// emergencies don't count here. As `proven` in src/lib/lock-state.ts and `windowMorningProven`
/// in src/lib/sim-device.ts.
func locturneWindowMorningProven(_ window: (evening: Date, outside: Bool, bedtime: Date), now: Date = Date()) -> Bool {
  let calendar = Calendar.current
  guard let morning = calendar.date(byAdding: .day, value: 1, to: window.evening) else { return false }
  let key = locturneDayKey(morning)
  // The night's start on the minute, as the app's nights start. Measured back in wall-clock
  // minutes, it is an hour late after the clocks go back and an hour early after they go
  // forward: the change in offset since puts it right.
  let guess = window.bedtime.addingTimeInterval(-Double(calendar.component(.second, from: window.bedtime)))
  let shift = Double(calendar.timeZone.secondsFromGMT(for: guess) - calendar.timeZone.secondsFromGMT(for: now))
  var start = window.outside ? guess : guess.addingTimeInterval(-shift)
  // A bedtime in the hour the clocks repeat began at its first pass, as `wallClock` places it.
  let hourEarlier = start.addingTimeInterval(-3600)
  let parts: Set<Calendar.Component> = [.day, .hour, .minute]
  if calendar.dateComponents(parts, from: hourEarlier) == calendar.dateComponents(parts, from: start) { start = hourEarlier }
  let from = start.timeIntervalSince1970 * 1000
  let until = now.timeIntervalSince1970 * 1000
  return locturneProofs().contains { proof in
    guard locturneIsWin(proof), proof["morningKey"] as? String == key,
      let at = (proof["at"] as? NSNumber)?.doubleValue,
      let start = locturneMinuteOfDay(proof["morningStart"]),
      let started = calendar.date(bySettingHour: start / 60, minute: start % 60, second: 0, of: morning)
    else { return false }
    return at >= from && at <= until && at >= started.timeIntervalSince1970 * 1000
  }
}

/// Saves the proof as `recordProof` does in src/lib/morning-proof.ts: with the times it was
/// judged under, the count of mornings won up by one the first time this morning is won, and
/// the first morning noted. Keep the two in step.
func locturneRecordProof(_ morning: LocturneMorning, kind: String, now: Date = Date()) {
  let proofs = locturneProofs()
  if locturneMorningProven(morning) { return }
  let saved: [String: Any] = [
    "morningKey": morning.key,
    "kind": kind,
    "at": (now.timeIntervalSince1970 * 1000).rounded(),
    "bedtime": morning.bedtime,
    "morningStart": morning.morningStart,
  ]
  let wins = Set(proofs.filter(locturneIsWin).compactMap { $0["morningKey"] as? String })
  if locturneIsWin(saved) && !wins.contains(morning.key) {
    if userDefaults?.string(forKey: LOCTURNE_FIRST_KEY) == nil {
      userDefaults?.set((wins.union([morning.key])).sorted().first ?? morning.key, forKey: LOCTURNE_FIRST_KEY)
    }
    let won = (userDefaults?.object(forKey: LOCTURNE_WON_KEY) as? NSNumber)?.doubleValue ?? 0
    userDefaults?.set(won + 1, forKey: LOCTURNE_WON_KEY)
  }
  userDefaults?.set(Array(([saved] + proofs).prefix(LOCTURNE_PROOFS_KEEP)), forKey: LOCTURNE_PROOFS_KEY)
}

/// Wakes the bedtime apps, as `wakeApps('night')` does in the app: the night's hold let go,
/// its picks unshielded, the day's words back, and every other rule's apps shielded again.
@available(iOS 15.0, *)
func locturneWakeMorning(triggeredBy: String) {
  userDefaults?.set(false, forKey: LOCTURNE_NIGHT_HELD_KEY)
  if let night = getFamilyActivitySelectionById(id: "night") {
    unblockSelection(removeSelection: night, triggeredBy: triggeredBy)
  }
  restoreLocturneFallbackShield(triggeredBy: triggeredBy)
  reapplyLocturneBlocks(triggeredBy: triggeredBy)
}

/// Puts how far they've got on the morning shield (the bedtime list's words, and the app-wide
/// ones the app also sets in the morning). The app rewrites both at its next sync, and the next
/// morning's start copies fresh ones in.
func locturneShowMorningProgress(_ subtitle: String) {
  for key in ["\(SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX)_night", FALLBACK_SHIELD_CONFIGURATION_KEY] {
    guard var config = userDefaults?.dictionary(forKey: key) else { continue }
    config["subtitle"] = subtitle
    userDefaults?.set(config, forKey: key)
  }
}

/// What the motion history said, and what the check did, at `now`. Nil steps: no history.
/// Returns whether the apps woke. The ShieldAction extension calls it with the pedometer's answer.
@available(iOS 15.0, *)
@discardableResult
func locturneJudgeMorning(steps: Int?, floors: Int, now: Date = Date()) -> Bool {
  guard let morning = locturneHeldMorning(now: now) else {
    locturneLogMorningCheck(["verdict": "notHeld"], now: now)
    return false
  }
  // Proven already (in the app, a moment ago): only the wake is missing.
  if locturneMorningProven(morning) {
    locturneWakeMorning(triggeredBy: "locturne_imUp")
    locturneLogMorningCheck(["verdict": "alreadyProven"], now: now)
    return true
  }
  if let steps, let kind = locturneMotionProof(method: morning.method, stepGoal: morning.stepGoal, steps: steps, floors: floors) {
    locturneRecordProof(morning, kind: kind, now: now)
    locturneWakeMorning(triggeredBy: "locturne_imUp")
    locturneLogMorningCheck(["verdict": kind, "steps": steps, "floors": floors], now: now)
    return true
  }
  locturneShowMorningProgress(locturneMorningProgress(method: morning.method, stepGoal: morning.stepGoal, steps: steps))
  locturneLogMorningCheck(["verdict": steps == nil ? "noHistory" : "short", "steps": steps ?? -1, "floors": floors], now: now)
  return false
}

private func locturneLogMorningCheck(_ entry: [String: Any], now: Date) {
  var entry = entry
  entry["at"] = (now.timeIntervalSince1970 * 1000).rounded()
  let earlier = userDefaults?.array(forKey: LOCTURNE_MORNING_CHECKS_KEY) ?? []
  userDefaults?.set([entry] + earlier.prefix(LOCTURNE_MORNING_CHECKS_KEEP - 1), forKey: LOCTURNE_MORNING_CHECKS_KEY)
}
