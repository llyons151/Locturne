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

    // The night windows repeat every day; a night that's switched off skips its shield.
    if activity.rawValue.hasPrefix(LOCTURNE_NIGHT_PREFIX) && !locturneNightIsOn() {
      skipLocturneNight(activity: activity.rawValue)
      return
    }

    if activity.rawValue.hasPrefix(LOCTURNE_NIGHT_PREFIX) {
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

    // A daily limit is used up: remember the day, so it stays shielded until midnight.
    if activity.rawValue.hasPrefix(LOCTURNE_LIMIT_PREFIX) {
      userDefaults?.set(
        locturneDayKey(), forKey: "\(LOCTURNE_LIMIT_REACHED_PREFIX)\(activity.rawValue)")
    }

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "eventDidReachThreshold",
      eventName: event.rawValue
    )

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
let LOCTURNE_HEARTBEAT_KEEP = 100

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

/// Is the night this bedtime window belongs to switched on? Mirrors `getLockState` in
/// src/lib/lock-state.ts: a night belongs to the evening before its morning, so a window
/// after midnight (before morning start) belongs to yesterday evening. Reads the routine the
/// app saved (`locturne.routine` in src/lib/routine.ts), using an edit waiting for this
/// bedtime once it's due. If anything can't be read the answer is yes: a missing or
/// unreadable routine must never skip a lock.
func locturneNightIsOn(_ now: Date = Date()) -> Bool {
  guard let stored = userDefaults?.dictionary(forKey: LOCTURNE_ROUTINE_KEY),
    var routine = stored["active"] as? [String: Any]
  else { return true }

  // iOS can start a window a little early, so allow two minutes for an edit due at bedtime.
  if let pending = stored["pending"] as? [String: Any],
    let from = (pending["from"] as? NSNumber)?.doubleValue,
    from <= now.timeIntervalSince1970 * 1000 + 120_000,
    let next = pending["routine"] as? [String: Any]
  {
    routine = next
  }

  guard let morningStart = (routine["morningStart"] as? NSNumber)?.intValue,
    let nights = routine["activeNights"] as? [NSNumber]
  else { return true }

  let calendar = Calendar.current
  let time = calendar.dateComponents([.hour, .minute], from: now)
  let minute = (time.hour ?? 0) * 60 + (time.minute ?? 0)
  let evening = minute < morningStart ? calendar.date(byAdding: .day, value: -1, to: now) ?? now : now
  // Calendar weekdays run 1 (Sunday) to 7; `Date.getDay()` runs 0 (Sunday) to 6.
  let weekday = calendar.component(.weekday, from: evening) - 1
  return nights.contains { $0.intValue == weekday }
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

    if let old = getFamilyActivitySelectionById(id: list) {
      unblockSelection(removeSelection: old, triggeredBy: triggeredBy)
    }
    if let next = getFamilyActivitySelectionById(id: "\(list)-next") {
      setFamilyActivitySelectionById(id: list, activitySelection: next)
    } else {
      removeFamilyActivitySelectionById(id: list)
    }
    removeFamilyActivitySelectionById(id: "\(list)-next")
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
  let entry: [String: Any] = [
    "activity": activity,
    "callback": callback,
    "at": (Date().timeIntervalSince1970 * 1000).rounded(),
    "shielded": isShieldActive(),
  ]
  var log: [Any] = [entry]
  if let earlier = userDefaults?.array(forKey: LOCTURNE_HEARTBEAT_KEY) {
    log.append(contentsOf: earlier.prefix(LOCTURNE_HEARTBEAT_KEEP - 1))
  }
  userDefaults?.set(log, forKey: LOCTURNE_HEARTBEAT_KEY)
}
