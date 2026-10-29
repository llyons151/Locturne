//
//  LocturneMorningCheck.swift
//  ShieldAction
//
//  "I'm up" on the morning shield (docs/BACKGROUND_UNLOCK.md): steps and floors since the
//  morning start, from the motion chip's history, judged by `locturneJudgeMorning`
//  (Locturne.swift). Enough wakes the bedtime apps here, with Locturne closed. Otherwise the
//  shield says how far they've got.
//

import CoreMotion
import Foundation
import ManagedSettings

/// How long to wait for the pedometer before answering without it.
private let LOCTURNE_MOTION_TIMEOUT: TimeInterval = 4

/// Runs the check, then answers the shield. Always `.defer`: iOS draws the shield again, with
/// the new words, or not at all once the apps are awake. `config` is the button's action
/// config: its notification (the tap that opens Locturne) is sent when the morning needs the
/// app (scan, place, push-ups) or the steps couldn't be read.
@available(iOS 15.0, *)
func locturneMorningCheck(config: [String: Any], completion: @escaping (ShieldActionResponse) -> Void) {
  CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
  guard let morning = locturneHeldMorning() else {
    // Still the night by the clock (a tap in the minutes before the morning start): say so,
    // or the button would look broken.
    if userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true,
      userDefaults?.bool(forKey: LOCTURNE_STOOD_DOWN_KEY) != true,
      let times = locturneNightTimes()
    {
      locturneShowMorningProgress(locturneEarlyTapLine(morningStart: times.morningStart))
    }
    completion(.defer)
    return
  }

  var answered = false
  let pedometer = CMPedometer()
  let finish = { (steps: Int?, floors: Int) in
    DispatchQueue.main.async {
      if answered { return }
      answered = true
      let woke = locturneJudgeMorning(steps: steps, floors: floors)
      // Not when there's nothing left to prove (another tap or the app just won the morning).
      if !woke && locturneHeldMorning() != nil && (steps == nil || !["steps", "downstairs"].contains(morning.method)) {
        for action in config["actions"] as? [[String: Any]] ?? [] where action["type"] as? String == "sendNotification" {
          if let payload = action["payload"] as? [String: Any] { sendNotification(contents: payload, placeholders: [:]) }
        }
      }
      CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
      completion(.defer)
      _ = pedometer
    }
  }

  guard CMPedometer.isStepCountingAvailable() else {
    finish(nil, 0)
    return
  }
  pedometer.queryPedometerData(from: morning.start, to: Date()) { data, error in
    if let error { logger.log("morning check: pedometer \(error.localizedDescription, privacy: .public)") }
    let floors = (data?.floorsDescended?.intValue ?? 0) + (data?.floorsAscended?.intValue ?? 0)
    finish(data?.numberOfSteps.intValue, floors)
  }
  DispatchQueue.main.asyncAfter(deadline: .now() + LOCTURNE_MOTION_TIMEOUT) { finish(nil, 0) }
}

/// "I'm up" on a rehearsal's morning shield (Locturne.swift's rehearsal section): the same reading
/// and judging as `locturneMorningCheck`, from the rehearsal's own morning start, method and goal,
/// and only its copy of the bedtime apps wakes. What each tap found is noted in its record.
@available(iOS 15.0, *)
func locturneRehearsalCheck(config: [String: Any], completion: @escaping (ShieldActionResponse) -> Void) {
  CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
  guard locturneRehearsalLive(), let rehearsal = locturneRehearsal(), let start = locturneRehearsalTime("end") else {
    completion(.defer)
    return
  }
  if Date() < start {
    locturneShowRehearsalProgress(locturneEarlyTapLine(morningStart: locturneMinute(start)))
    locturneNoteRehearsal(["lastCheck": "early"])
    completion(.defer)
    return
  }
  let method = locturneMethodInUse(rehearsal["method"] as? String ?? "steps")
  let stepGoal = (rehearsal["stepGoal"] as? NSNumber)?.intValue ?? 200

  var answered = false
  let pedometer = CMPedometer()
  let finish = { (steps: Int?, floors: Int) in
    DispatchQueue.main.async {
      if answered { return }
      answered = true
      if !locturneRehearsalLive() {
        // Won in Locturne meanwhile: nothing left to do.
      } else if let steps, let kind = locturneMotionProof(method: method, stepGoal: stepGoal, steps: steps, floors: floors) {
        locturneNoteRehearsal(["lastCheck": kind])
        locturneWakeRehearsal(steps: steps, floors: floors)
      } else {
        locturneShowRehearsalProgress(locturneMorningProgress(method: method, stepGoal: stepGoal, steps: steps))
        locturneNoteRehearsal(["lastCheck": steps == nil ? "noHistory" : "short", "steps": steps ?? -1, "floors": floors])
        if steps == nil || !["steps", "downstairs"].contains(method) {
          for action in config["actions"] as? [[String: Any]] ?? [] where action["type"] as? String == "sendNotification" {
            if let payload = action["payload"] as? [String: Any] { sendNotification(contents: payload, placeholders: [:]) }
          }
        }
      }
      CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication)
      completion(.defer)
      _ = pedometer
    }
  }

  guard CMPedometer.isStepCountingAvailable() else {
    finish(nil, 0)
    return
  }
  pedometer.queryPedometerData(from: start, to: Date()) { data, error in
    if let error { logger.log("rehearsal check: pedometer \(error.localizedDescription, privacy: .public)") }
    let floors = (data?.floorsDescended?.intValue ?? 0) + (data?.floorsAscended?.intValue ?? 0)
    finish(data?.numberOfSteps.intValue, floors)
  }
  DispatchQueue.main.asyncAfter(deadline: .now() + LOCTURNE_MOTION_TIMEOUT) { finish(nil, 0) }
}
