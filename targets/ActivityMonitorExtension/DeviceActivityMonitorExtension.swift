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

    if locturneObsoleteNightCallback(activity.rawValue) { return }

    // First, so a bedtime window shields the edited list, not the old one.
    settleLocturneLists(triggeredBy: "locturne_\(activity.rawValue)_settleLists")
    settleLocturneSites()

    // A deferred change between disjoint sleep periods needs a new schedule even when
    // the app stays closed. The callback that handed it over belongs to the old schedule.
    if activity.rawValue.hasPrefix(LOCTURNE_NIGHT_PREFIX), locturneHandoffNight() {
      reapplyLocturneBlocks(triggeredBy: "locturne_nativeHandoff")
      recordLocturneHeartbeat(activity: activity.rawValue, callback: "scheduleHandoff")
      notifyAppWithName(name: "intervalDidStart")
      return
    }

    // A limit's day starting, maybe a few seconds before midnight (iOS can be early, as with
    // the night windows): yesterday's mark goes now, or the re-apply below would read it as
    // today's and put the apps back to sleep for the whole new day. An arm in the middle of
    // the day keeps its mark: two minutes on is still the same day.
    if activity.rawValue.hasPrefix(LOCTURNE_LIMIT_PREFIX),
      !locturneLimitUsedUpToday(activity.rawValue, now: Date().addingTimeInterval(120))
    {
      userDefaults?.removeObject(forKey: "\(LOCTURNE_LIMIT_REACHED_PREFIX)\(activity.rawValue)")
      userDefaults?.removeObject(forKey: "\(LOCTURNE_LIMIT_REACHED_AT_PREFIX)\(activity.rawValue)")
    }

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
      // Held only with something to hold. An empty list (an emergency pause, or every pick
      // removed) holding the night would stop `restoreLocturneFallbackShield` taking a nap's
      // or a used-up limit's words off the always list until morning start. The lists were
      // settled above, so picks an emergency parked until this bedtime count. Typed-in websites
      // alone count too: the web filter holds them (`locturneNightHasPicks`).
      userDefaults?.set(locturneNightHasPicks(), forKey: LOCTURNE_NIGHT_HELD_KEY)
    }

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "intervalDidStart",
      eventName: nil
    )

    // A limit's day starts: yesterday's "daily limit is used up" words go with it.
    if activity.rawValue.hasPrefix(LOCTURNE_LIMIT_PREFIX) {
      restoreLocturneFallbackShield(triggeredBy: "locturne_\(activity.rawValue)_newDay")
    }

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
    // An unproven morning's words ("prove it") would stay on the always list all night off.
    restoreLocturneFallbackShield(triggeredBy: triggeredBy)

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

    if locturneObsoleteNightCallback(activity.rawValue) { return }

    // iOS can deliver the previous session's end after the app has installed a
    // replacement under the same activity name. Only end the current nap near
    // its own deadline, allowing the same two-minute delivery slack as nights.
    if activity.rawValue == LOCTURNE_NAP_ACTIVITY,
      let nap = userDefaults?.dictionary(forKey: LOCTURNE_NAP_KEY),
      let end = (nap["end"] as? NSNumber)?.doubleValue,
      end > Date().timeIntervalSince1970 * 1000 + 120_000
    { return }

    // The nap is over: forget it first, so the re-apply below doesn't shield it again if
    // iOS calls this a few seconds early.
    if activity.rawValue == LOCTURNE_NAP_ACTIVITY {
      userDefaults?.removeObject(forKey: LOCTURNE_NAP_KEY)
    }

    // An app schedule's block ends (src/lib/schedules.ts): picks and edits waiting for it land,
    // and its apps wake unless the schedule still holds them (a block running straight on into
    // the next day's), maybe a little early as with the night windows. The re-apply below puts
    // back whatever another rule holds.
    if activity.rawValue.hasPrefix(LOCTURNE_SCHEDULE_PREFIX) {
      settleLocturneLists(triggeredBy: "locturne_\(activity.rawValue)_settleLists")
      let soon = Date().addingTimeInterval(120)
      let schedule = locturneSchedules(now: soon).first { ($0["id"] as? String) == activity.rawValue }
      if !(schedule.map { locturneScheduleBlocking($0, at: soon) } ?? false),
        let picked = getFamilyActivitySelectionById(id: activity.rawValue)
      {
        unblockSelection(removeSelection: picked, triggeredBy: "locturne_\(activity.rawValue)_ended")
      }
    }

    self.executeActionsForEvent(
      activityName: activity.rawValue,
      callbackName: "intervalDidEnd",
      eventName: nil
    )

    showLocturneMorningShield(activity: activity.rawValue)

    // The nap is over: its "Napping until 3 pm" words go too.
    if activity.rawValue == LOCTURNE_NAP_ACTIVITY {
      restoreLocturneFallbackShield(triggeredBy: "locturne_napEnded")
    }

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

    // stopMonitoring doesn't retract callbacks already queued by iOS. A threshold
    // from before stand-down must not recreate usage marks that a renewal inherits.
    if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true { return }

    // A daily limit is used up: remember the day, so it stays shielded until midnight. Unless
    // it's yesterday's, delivered late: N minutes can't be used in less than N minutes of today,
    // and taking it as today's would hold the apps asleep all day with nothing used.
    let isLimit = activity.rawValue.hasPrefix(LOCTURNE_LIMIT_PREFIX)
    if isLimit {
      let limits = userDefaults?.array(forKey: LOCTURNE_LIMITS_KEY) as? [[String: Any]] ?? []
      // A removed slot can be reused later for different apps and a different allowance.
      guard limits.contains(where: { $0["id"] as? String == activity.rawValue }) else { return }
    }
    let stale = isLimit && locturneLimitThresholdIsStale(activity.rawValue)
    if isLimit && !stale {
      userDefaults?.set(
        locturneDayKey(), forKey: "\(LOCTURNE_LIMIT_REACHED_PREFIX)\(activity.rawValue)")
      // And the moment, which says "today" across a flight (`locturneLimitUsedUpToday`).
      userDefaults?.set(
        (Date().timeIntervalSince1970 * 1000).rounded(),
        forKey: "\(LOCTURNE_LIMIT_REACHED_AT_PREFIX)\(activity.rawValue)")
      // Its words aren't put on its own list's config: iOS would rank that above the bedtime
      // and nap words on apps in both lists. With the app closed it shows the fallback's (true,
      // if less specific) until the app or a restore writes the limit's.
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

// The Locturne lock helpers (the rules, the shields they put back, the heartbeat) live in
// Locturne.swift, shared with the ShieldAction extension.

// MARK: - Deferred changes between disjoint sleep periods

private let LOCTURNE_NATIVE_ARMING_KEY = "locturne.nativeNightArmingAt"
private let LOCTURNE_APP_ARMING_KEY = "locturne.nightArmingAt"
private let LOCTURNE_NATIVE_WINDOW_PREFIX = "night-native-"

/// Registration can immediately deliver a callback. During a native transaction neither
/// generation may act; afterwards only its committed generation may act. App registrations
/// deliberately use the original night-N names and replace the record when they finish.
func locturneObsoleteNightCallback(_ activity: String) -> Bool {
  guard activity.hasPrefix(LOCTURNE_NIGHT_PREFIX) else { return false }
  if locturneArmingRecently(LOCTURNE_NATIVE_ARMING_KEY) { return true }
  if locturneArmingRecently(LOCTURNE_APP_ARMING_KEY) {
    return activity.hasPrefix(LOCTURNE_NATIVE_WINDOW_PREFIX)
  }
  let prefix = userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY)?["nativeWindowPrefix"] as? String
  if let prefix { return !activity.hasPrefix(prefix) }
  return activity.hasPrefix(LOCTURNE_NATIVE_WINDOW_PREFIX)
}

private func locturneArmingRecently(_ key: String, now: Date = Date()) -> Bool {
  guard let at = (userDefaults?.object(forKey: key) as? NSNumber)?.doubleValue else { return false }
  let age = now.timeIntervalSince1970 * 1000 - at
  // A killed app/extension must not leave a permanent transaction guard.
  return age >= 0 && age < 120_000
}

private func locturneDisjoint(_ a: (bedtime: Int, morningStart: Int), _ b: (bedtime: Int, morningStart: Int)) -> Bool {
  let start: ((bedtime: Int, morningStart: Int)) -> Int = {
    $0.bedtime < $0.morningStart ? $0.bedtime : $0.bedtime - 1440
  }
  return max(start(a), start(b)) >= min(a.morningStart, b.morningStart)
}

/// The same partition as src/lib/night-plan.ts: short windows in the two hours after bedtime and
/// the hour before the morning, one long one between, each at least 15 minutes. Seven at most.
func locturneNightEdges(bedtime: Int, morningStart: Int) -> [(start: Int, end: Int)] {
  let length = (morningStart - bedtime + 1440) % 1440
  guard length >= 15 else { return [] }
  let wanted = ([15, 30, 60, 120] + [60, 30].map { length - $0 }).sorted()
  var edges = [0]
  for cut in wanted {
    if cut - edges[edges.count - 1] >= 15 && length - cut >= 15 { edges.append(cut) }
  }
  edges.append(length)
  return (0..<(edges.count - 1)).map { ((bedtime + edges[$0]) % 1440, (bedtime + edges[$0 + 1]) % 1440) }
}

private func locturneStopNightGeneration(_ prefix: String) {
  let names = center.activities.filter { $0.rawValue.hasPrefix(prefix) }
  if !names.isEmpty { center.stopMonitoring(names) }
  // The last registration may have failed after its action was written. Sixteen: nights armed
  // before 2026-10-14 took up to that many.
  let configured = Set(names.map(\.rawValue) + (0..<16).map { "\(prefix)\($0)" })
  for name in configured {
    for callback in ["intervalDidStart", "intervalDidEnd", "intervalWillStartWarning", "intervalWillEndWarning"] {
      userDefaults?.removeObject(forKey: "actions_for_\(name)_\(callback)")
      userDefaults?.removeObject(forKey: "events_\(name)_\(callback)")
    }
  }
}

private enum LocturneHandoffError: Error { case noRoom, cancelled }

private func locturneHandoffStillOwned(_ before: [String: Any]) -> Bool {
  guard let current = userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY) else { return false }
  return NSDictionary(dictionary: current).isEqual(to: before)
}

private func locturneInstallNight(
  times: (bedtime: Int, morningStart: Int), prefix: String, before: [String: Any], now: Date
) throws {
  let windows = locturneNightEdges(bedtime: times.bedtime, morningStart: times.morningStart)
  if center.activities.count + windows.count > 20,
    center.activities.contains(DeviceActivityName("locturne-settle"))
  {
    center.stopMonitoring([DeviceActivityName("locturne-settle")])
    userDefaults?.removeObject(forKey: "locturne.settleAt")
  }
  guard center.activities.count + windows.count <= 20 else { throw LocturneHandoffError.noRoom }
  for (index, window) in windows.enumerated() {
    if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true || locturneArmingRecently(LOCTURNE_APP_ARMING_KEY) || !locturneHandoffStillOwned(before) {
      throw LocturneHandoffError.cancelled
    }
    let name = "\(prefix)\(index)"
    userDefaults?.set([
      ["type": "blockSelection", "familyActivitySelectionId": "night", "shieldId": "locturne-night"]
    ], forKey: "actions_for_\(name)_intervalDidStart")
    try center.startMonitoring(
      DeviceActivityName(name),
      during: DeviceActivitySchedule(
        intervalStart: DateComponents(hour: window.start / 60, minute: window.start % 60),
        intervalEnd: DateComponents(hour: window.end / 60, minute: window.end % 60), repeats: true
      ), events: [:]
    )
  }
  if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true || locturneArmingRecently(LOCTURNE_APP_ARMING_KEY) || !locturneHandoffStillOwned(before) {
    throw LocturneHandoffError.cancelled
  }
  var record = before
  record["bedtime"] = times.bedtime
  record["morningStart"] = times.morningStart
  record["windows"] = windows.count
  record["since"] = before["since"] ?? before["armedAt"] ?? now.ISO8601Format()
  let changed = locturneTimes(before)?.bedtime != times.bedtime || locturneTimes(before)?.morningStart != times.morningStart
  record["armedAt"] = changed ? now.ISO8601Format() : (before["armedAt"] ?? now.ISO8601Format())
  if changed {
    record["timesSince"] = now.ISO8601Format()
  }
  record["nativeWindowPrefix"] = prefix
  userDefaults?.set(record, forKey: LOCTURNE_ARMED_KEY)
}

private func locturneArmedDate(_ text: String) -> Date? {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let date = formatter.date(from: text) { return date }
  formatter.formatOptions = [.withInternetDateTime]
  return formatter.date(from: text)
}

/// iOS is allowed to deliver an ongoing interval's start during registration. Those
/// callbacks were suppressed until commit, so apply an ongoing interval ourselves now.
private func locturneApplyHandoffNight(now: Date) {
  guard let times = locturneNightTimes(),
    locturneInside(locturneMinute(now), bedtime: times.bedtime, morningStart: times.morningStart)
  else { return }
  let window = locturneWindowNight(now)
  if locturneNightIsOn(evening: window.evening, now: now) && !locturneSubscriptionLapsed(before: window.evening) {
    userDefaults?.set(true, forKey: LOCTURNE_NIGHT_HELD_KEY)
    updateShield(shieldId: "locturne-night", triggeredBy: "locturne_nativeHandoff", activitySelectionId: "night")
  } else {
    userDefaults?.set(false, forKey: LOCTURNE_NIGHT_HELD_KEY)
    if let night = getFamilyActivitySelectionById(id: "night") {
      unblockSelection(removeSelection: night, triggeredBy: "locturne_nativeHandoff")
    }
    restoreLocturneFallbackShield(triggeredBy: "locturne_nativeHandoff")
  }
}

/// The morning the replacement routine names may never have been locked under either
/// routine (08–16 changing to 23–07 at 08). Release only that unrun morning. Otherwise keep
/// an existing hold/proof exactly as it was. Mirrors routine.ts's nightRanUnder.
private func locturneReleaseUnrunMorning(
  target: (bedtime: Int, morningStart: Int), prior: [String: Any]?, from: Double, now: Date
) {
  let calendar = Calendar.current
  let minute = locturneMinute(now)
  let offset = target.bedtime < target.morningStart ? (minute >= target.bedtime ? 0 : -1) : (minute >= target.bedtime ? 1 : 0)
  guard let day = calendar.date(byAdding: .day, value: offset, to: now),
    let morning = calendar.date(bySettingHour: target.morningStart / 60, minute: target.morningStart % 60, second: 0, of: day),
    morning.timeIntervalSince1970 * 1000 <= from
  else { return }
  if let old = locturneTimes(prior),
    let evening = calendar.date(byAdding: .day, value: -1, to: day),
    let nights = prior?["activeNights"] as? [NSNumber],
    nights.contains(where: { $0.intValue == calendar.component(.weekday, from: evening) - 1 }),
    let startDay = calendar.date(byAdding: .day, value: old.bedtime < old.morningStart ? 0 : -1, to: day),
    let start = calendar.date(bySettingHour: old.bedtime / 60, minute: old.bedtime % 60, second: 0, of: startDay),
    start.timeIntervalSince1970 * 1000 < from
  { return }
  userDefaults?.set(false, forKey: LOCTURNE_NIGHT_HELD_KEY)
  if let night = getFamilyActivitySelectionById(id: "night") {
    unblockSelection(removeSelection: night, triggeredBy: "locturne_unrunMorning")
  }
  restoreLocturneFallbackShield(triggeredBy: "locturne_unrunMorning")
}

/// Hands over only a due, disjoint routine change. Normal overlapping edits retain their
/// existing rules. Every attempt and rollback uses a fresh name: registering the activity
/// whose callback is executing can deadlock on affected iOS versions. Old names are stopped
/// before new names are installed so the total never exceeds the app's 20-activity budget.
func locturneHandoffNight(now: Date = Date()) -> Bool {
  guard userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) != true,
    !locturneArmingRecently(LOCTURNE_APP_ARMING_KEY, now: now),
    !locturneArmingRecently(LOCTURNE_NATIVE_ARMING_KEY, now: now),
    let before = userDefaults?.dictionary(forKey: LOCTURNE_ARMED_KEY),
    let old = locturneTimes(before),
    let stored = userDefaults?.dictionary(forKey: LOCTURNE_ROUTINE_KEY)
  else { return false }
  let target: [String: Any]?
  let prior: [String: Any]?
  let from: Double
  if let pending = stored["pending"] as? [String: Any] {
    guard let due = (pending["from"] as? NSNumber)?.doubleValue,
      due <= now.timeIntervalSince1970 * 1000 + 120_000
    else { return false }
    target = pending["routine"] as? [String: Any]
    prior = stored["active"] as? [String: Any]
    from = due
  } else {
    guard let since = (stored["since"] as? NSNumber)?.doubleValue,
      let armedAt = before["armedAt"] as? String,
      let armedDate = locturneArmedDate(armedAt),
      armedDate.timeIntervalSince1970 * 1000 < since
    else { return false }
    target = stored["active"] as? [String: Any]
    prior = stored["prior"] as? [String: Any]
    from = since
  }
  guard let times = locturneTimes(target),
    (0..<1440).contains(times.bedtime), (0..<1440).contains(times.morningStart),
    locturneDisjoint(old, times),
    !locturneNightEdges(bedtime: times.bedtime, morningStart: times.morningStart).isEmpty,
    target?["activeNights"] as? [NSNumber] != nil
  else { return false }

  userDefaults?.set(now.timeIntervalSince1970 * 1000, forKey: LOCTURNE_NATIVE_ARMING_KEY)
  defer { userDefaults?.removeObject(forKey: LOCTURNE_NATIVE_ARMING_KEY) }
  locturneStopNightGeneration(LOCTURNE_NIGHT_PREFIX)
  let prefix = "\(LOCTURNE_NATIVE_WINDOW_PREFIX)\(UUID().uuidString)-"
  do {
    try locturneInstallNight(times: times, prefix: prefix, before: before, now: now)
    userDefaults?.removeObject(forKey: "locturne.nativeNightArmingError")
    locturneReleaseUnrunMorning(target: times, prior: prior, from: from, now: now)
    locturneApplyHandoffNight(now: now)
  } catch {
    locturneStopNightGeneration(prefix)
    if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true || locturneArmingRecently(LOCTURNE_APP_ARMING_KEY) || !locturneHandoffStillOwned(before) { return true }
    let rollbackPrefix = "\(LOCTURNE_NATIVE_WINDOW_PREFIX)\(UUID().uuidString)-"
    do {
      try locturneInstallNight(times: old, prefix: rollbackPrefix, before: before, now: now)
      locturneApplyHandoffNight(now: now)
    } catch {
      locturneStopNightGeneration(rollbackPrefix)
      if userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) == true || locturneArmingRecently(LOCTURNE_APP_ARMING_KEY) || !locturneHandoffStillOwned(before) { return true }
      // Retain the old record/hold: the app detects missing windows and retries.
      userDefaults?.set(before, forKey: LOCTURNE_ARMED_KEY)
      locturneApplyHandoffNight(now: now)
    }
    userDefaults?.set(now.timeIntervalSince1970 * 1000, forKey: "locturne.nativeNightArmingError")
  }
  return true
}
