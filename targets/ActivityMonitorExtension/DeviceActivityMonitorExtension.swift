//
//  DeviceActivityMonitorExtension.swift
//  ActivityMonitorExtension
//
//  Created by Robert Herber on 2023-07-05.
//

import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import NotificationCenter
import os

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    logger.log("intervalDidStart")

    // First, so a bedtime window shields the edited list, not the old one.
    settleLocturneLists(triggeredBy: "locturne_\(activity.rawValue)_settleLists")

    if activity.rawValue.hasPrefix(LOCTURNE_NIGHT_PREFIX) {
      // No subscription: nothing locks (`standDown` in src/lib/screen-time.ts stops the windows;
      // this covers a callback iOS was already making), and nothing is held for `standUp`.
      if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true {
        ignoreLocturneWindow(activity: activity.rawValue)
        return
      }
      let window = locturneWindowNight()
      // A window the spring clock change pushed past morning start, in a night whose other
      // windows already ran: it changes nothing, so it can't shield a free morning or
      // re-shield after a proof.
      if window.outside && locturneNightWindowRan(since: window.bedtime) {
        ignoreLocturneWindow(activity: activity.rawValue)
        return
      }
      // The night windows repeat every day; a night that's switched off skips its shield,
      // and so does every night after the one under way when the subscription ended. A
      // skip releases the night only once the routine in force says the morning under way
      // is over: windows still armed for an older routine run at the old times.
      if !locturneNightIsOn(evening: window.evening) || locturneSubscriptionLapsed(before: window.evening) {
        if locturneInsideNightInForce() {
          skipLocturneNight(activity: activity.rawValue)
        } else {
          ignoreLocturneWindow(activity: activity.rawValue)
        }
        return
      }
      userDefaults?.set(true, forKey: LOCTURNE_NIGHT_HELD_KEY)
    }

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "intervalDidStart",
      eventName: nil
    )

    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "intervalDidStart"
    )

    reapplyLocturneBlocks(triggeredBy: "locturne_\(activity.rawValue)_intervalDidStart")

    recordLocturneHeartbeat(activity: activity.rawValue, callback: "intervalDidStart")

    notifyAppWithName(name: "intervalDidStart")
  }

  /// A night window started on a night that's switched off: nothing extra sleeps (the `off`
  /// phase in src/lib/lock-state.ts), so its `blockSelection` action doesn't run, and a hold
  /// left from a morning that was never proven ends, as `syncLock` does in the app.
  func skipLocturneNight(activity: String) {
    let triggeredBy = "locturne_\(activity)_nightOff"
    userDefaults?.set(false, forKey: LOCTURNE_NIGHT_HELD_KEY)
    if let night = getFamilyActivitySelectionById(id: "night") {
      unblockSelection(removeSelection: night, triggeredBy: triggeredBy)
    }

    persistToUserDefaults(
      activityName: activity,
      callbackName: "intervalDidStart"
    )

    reapplyLocturneBlocks(triggeredBy: triggeredBy)

    recordLocturneHeartbeat(activity: activity, callback: "intervalDidStart")

    notifyAppWithName(name: "intervalDidStart")
  }

  /// A window that changes nothing (see `intervalDidStart`): no actions, no change to the
  /// hold. Still noted, so the self-check sees iOS ran it.
  func ignoreLocturneWindow(activity: String) {
    persistToUserDefaults(
      activityName: activity,
      callbackName: "intervalDidStart"
    )

    reapplyLocturneBlocks(triggeredBy: "locturne_\(activity)_outsideNight")

    recordLocturneHeartbeat(activity: activity, callback: "intervalDidStart")

    notifyAppWithName(name: "intervalDidStart")
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    logger.log("intervalDidEnd")

    // The nap is over: forget it first, so the re-apply below doesn't shield it again if
    // iOS calls this a few seconds early.
    if activity.rawValue == LOCTURNE_NAP_ACTIVITY {
      userDefaults?.removeObject(forKey: LOCTURNE_NAP_KEY)
    }

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "intervalDidEnd",
      eventName: nil
    )

    showLocturneMorningShield(activity: activity.rawValue)

    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "intervalDidEnd"
    )

    reapplyLocturneBlocks(triggeredBy: "locturne_\(activity.rawValue)_intervalDidEnd")

    recordLocturneHeartbeat(activity: activity.rawValue, callback: "intervalDidEnd")

    notifyAppWithName(name: "intervalDidEnd")
  }

  func executeActionsForEvent(
    activityName: String,
    callbackName: String,
    eventName: String?
  ) {
    let triggeredBy =
      eventName != nil
      ? "actions_for_\(activityName)_\(callbackName)_\(eventName!)"
      : "actions_for_\(activityName)_\(callbackName)"

    let placeholders = [
      "activityName": activityName,
      "callbackName": callbackName,
      "eventName": eventName
    ]

    let originalWhitelist = getCurrentWhitelist()
    let originalBlocklist = getCurrentBlocklist()

    CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)

    if let actions = userDefaults?.array(forKey: triggeredBy) {
      actions.forEach { actionRaw in
        if let action = actionRaw as? [String: Any] {
          let skipIfAlreadyTriggeredAfter = action["skipIfAlreadyTriggeredAfter"] as? Double
          let skipIfLargerEventRecordedAfter = action["skipIfLargerEventRecordedAfter"] as? Double
          let skipIfAlreadyTriggeredWithinMS = action["skipIfAlreadyTriggeredWithinMS"] as? Double
          let skipIfLargerEventRecordedWithinMS =
            action["skipIfLargerEventRecordedWithinMS"] as? Double
          let skipIfLargerEventRecordedSinceIntervalStarted =
            action["skipIfLargerEventRecordedSinceIntervalStarted"] as? Bool
          let neverTriggerBefore = action["neverTriggerBefore"] as? Double
          let skipIfAlreadyTriggeredBefore = action["skipIfAlreadyTriggeredBefore"] as? Double

          let skipIfAlreadyTriggeredBetweenFromDate =
            action["skipIfAlreadyTriggeredBetweenFromDate"] as? Double
          let skipIfAlreadyTriggeredBetweenToDate =
            action["skipIfAlreadyTriggeredBetweenToDate"] as? Double

          let skipIfWhitelistOrBlacklistIsUnchanged =
            action["skipIfWhitelistOrBlacklistIsUnchanged"] as? Bool

          if shouldExecuteAction(
            skipIfAlreadyTriggeredAfter: skipIfAlreadyTriggeredAfter,
            skipIfLargerEventRecordedAfter: skipIfLargerEventRecordedAfter,
            skipIfAlreadyTriggeredWithinMS: skipIfAlreadyTriggeredWithinMS,
            skipIfLargerEventRecordedWithinMS: skipIfLargerEventRecordedWithinMS,
            neverTriggerBefore: neverTriggerBefore,
            skipIfLargerEventRecordedSinceIntervalStarted:
              skipIfLargerEventRecordedSinceIntervalStarted,
            skipIfAlreadyTriggeredBefore: skipIfAlreadyTriggeredBefore,
            skipIfAlreadyTriggeredBetweenFromDate: skipIfAlreadyTriggeredBetweenFromDate,
            skipIfAlreadyTriggeredBetweenToDate: skipIfAlreadyTriggeredBetweenToDate,
            skipIfWhitelistOrBlacklistIsUnchanged: skipIfWhitelistOrBlacklistIsUnchanged,
            originalWhitelist: originalWhitelist,
            originalBlocklist: originalBlocklist,
            activityName: activityName,
            callbackName: callbackName,
            eventName: eventName
          ) {
            executeGenericAction(
              action: action,
              placeholders: placeholders,
              triggeredBy: triggeredBy
            )
          }
        }
      }
    }
  }

  override func eventDidReachThreshold(
    _ event: DeviceActivityEvent.Name, activity: DeviceActivityName
  ) {
    super.eventDidReachThreshold(event, activity: activity)
    logger.log("eventDidReachThreshold: \(event.rawValue, privacy: .public)")

    // A daily limit is used up: remember the day, so it stays shielded until midnight. Unless
    // it's yesterday's, delivered late: N minutes can't be used in less than N minutes of today,
    // and taking it as today's would hold the apps asleep all day with nothing used.
    let isLimit = activity.rawValue.hasPrefix(LOCTURNE_LIMIT_PREFIX)
    let stale = isLimit && locturneLimitThresholdIsStale(activity.rawValue)
    if isLimit && !stale {
      userDefaults?.set(
        locturneDayKey(), forKey: "\(LOCTURNE_LIMIT_REACHED_PREFIX)\(activity.rawValue)")
    }

    if !stale {
      self.executeActionsForEvent(
        activityName: activity.rawValue,
        callbackName: "eventDidReachThreshold",
        eventName: event.rawValue
      )
    }

    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "eventDidReachThreshold",
      eventName: event.rawValue
    )

    reapplyLocturneBlocks(triggeredBy: "locturne_\(activity.rawValue)_eventDidReachThreshold")

    recordLocturneHeartbeat(activity: activity.rawValue, callback: "eventDidReachThreshold")

    notifyAppWithName(name: "eventDidReachThreshold")
  }

  override func intervalWillStartWarning(for activity: DeviceActivityName) {
    super.intervalWillStartWarning(for: activity)
    logger.log("intervalWillStartWarning")

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "intervalWillStartWarning",
      eventName: nil
    )

    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "intervalWillStartWarning"
    )

    recordLocturneHeartbeat(activity: activity.rawValue, callback: "intervalWillStartWarning")

    notifyAppWithName(name: "intervalWillStartWarning")
  }

  override func intervalWillEndWarning(for activity: DeviceActivityName) {
    super.intervalWillEndWarning(for: activity)
    logger.log("intervalWillEndWarning")

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "intervalWillEndWarning",
      eventName: nil
    )

    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "intervalWillEndWarning"
    )

    recordLocturneHeartbeat(activity: activity.rawValue, callback: "intervalWillEndWarning")

    notifyAppWithName(name: "intervalWillEndWarning")
  }

  override func eventWillReachThresholdWarning(
    _ event: DeviceActivityEvent.Name, activity: DeviceActivityName
  ) {
    super.eventWillReachThresholdWarning(event, activity: activity)
    logger.log("eventWillReachThresholdWarning: \(event.rawValue, privacy: .public)")

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "eventWillReachThresholdWarning",
      eventName: event.rawValue
    )

    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "eventWillReachThresholdWarning",
      eventName: event.rawValue
    )

    recordLocturneHeartbeat(activity: activity.rawValue, callback: "eventWillReachThresholdWarning")

    notifyAppWithName(name: "eventWillReachThresholdWarning")
  }

}

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
let LOCTURNE_PENDING_LISTS_KEY = "locturne.pendingLists"
let LOCTURNE_HEARTBEAT_KEY = "locturne.heartbeat"
let LOCTURNE_ROUTINE_KEY = "locturne.routine"
let LOCTURNE_STOOD_DOWN_KEY = "locturne.stoodDown"
let LOCTURNE_ARMED_KEY = "locturne.armedNight"
let LOCTURNE_SUBSCRIPTION_ENDED_KEY = "locturne.subscriptionEnded"
let LOCTURNE_ENDED_MORNING_KEY = "locturne.subscriptionEndedMorning"
/// The morning words and their tap, kept fresh by the app (`MORNING_SHIELD` in screen-time.ts).
let LOCTURNE_MORNING_SHIELD = "locturne-morning"
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
  guard let bedtime = (dict?["bedtime"] as? NSNumber)?.intValue,
    let morningStart = (dict?["morningStart"] as? NSNumber)?.intValue
  else { return nil }
  return (bedtime, morningStart)
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
    let afterMidnight = minute < morningStart && !early
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
    return activity.hasPrefix(LOCTURNE_NIGHT_PREFIX) && entry["callback"] as? String == "intervalDidStart"
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

/// The last night window ends at morning start. With the night still held, the bedtime apps
/// now show the morning's words, whose button sends the notification that opens the wake-up
/// screen, even if Locturne stayed closed all night. Only the words change: nothing is
/// shielded here, so a night that was off or already unlocked is untouched.
@available(iOS 15.0, *)
func showLocturneMorningShield(activity: String, now: Date = Date()) {
  guard activity.hasPrefix(LOCTURNE_NIGHT_PREFIX),
    userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true,
    let armed = userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY),
    let morningStart = (armed["morningStart"] as? NSNumber)?.intValue
  else { return }
  let time = Calendar.current.dateComponents([.hour, .minute], from: now)
  let minute = (time.hour ?? 0) * 60 + (time.minute ?? 0)
  // iOS may call a little early or late; earlier windows end at least 15 minutes before.
  let sinceMorning = (minute - morningStart + 1440) % 1440
  guard sinceMorning <= 30 || sinceMorning >= 1440 - 5 else { return }
  updateShield(
    shieldId: LOCTURNE_MORNING_SHIELD,
    triggeredBy: "locturne_\(activity)_morning",
    activitySelectionId: "night"
  )
}

/// Shields always-blocked, the night lock, a running nap and limits used up today. Only adds.
/// Nothing at all without a subscription (`standDown` in src/lib/screen-time.ts).
@available(iOS 15.0, *)
func reapplyLocturneBlocks(triggeredBy: String) {
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

  let today = locturneDayKey()
  if let limits = userDefaults?.array(forKey: LOCTURNE_LIMITS_KEY) as? [[String: Any]] {
    for limit in limits {
      if let id = limit["id"] as? String,
        userDefaults?.string(forKey: "\(LOCTURNE_LIMIT_REACHED_PREFIX)\(id)") == today
      {
        held.append(id)
      }
    }
  }

  var selection = FamilyActivitySelection()
  for id in held {
    if let picked = getFamilyActivitySelectionById(id: id) {
      selection = union(selection, picked)
    }
  }
  blockSelectedApps(blockSelection: selection, triggeredBy: triggeredBy)
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
  // unlock, and nothing would sleep until the next window, up to 45 minutes later.
  let now = Date().timeIntervalSince1970 * 1000 + 120_000
  var changed = false

  for (list, value) in pending {
    guard let entry = value as? [String: Any],
      let from = (entry["from"] as? NSNumber)?.doubleValue,
      from <= now
    else { continue }

    // Only an explicit `empty` empties the list. A missing draft alone means the app settled
    // it a moment ago, and the list is already right (`settleListChanges` in screen-time.ts).
    let next = getFamilyActivitySelectionById(id: "\(list)-next")
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
