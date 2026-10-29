// A rehearsal night (dev and preview builds: You → Rehearse a night) through the real monitor and
// ShieldAction code with Locturne closed: its one-off window shields only a copy of the bedtime
// apps, its end puts up its own morning shield, and I'm up reads the pedometer from its morning
// start. The real lock, its proofs and the count stay untouched. App Group shapes as
// `startRehearsal` in screen-time.ts writes them.
import Foundation

/// The day before a rehearsal: the evening's sync left the real shields' words, the real night
/// is armed for 23:00, reddit is always asleep. Then the app hands iOS a rehearsal for `method`,
/// 15:02 to 15:17, on a copy of the bedtime picks.
func rehearsalArmed(method: String = "steps", stepGoal: Int = 200) {
  pick("night", ["tiktok", "instagram"]); pick("always", ["reddit"])
  var r = routine(); r["method"] = "steps"
  saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
  appShields("always")
  at("2026-10-05 15:00")
  pick(LOCTURNE_REHEARSAL_LIST, ["tiktok", "instagram"])
  set("shieldConfiguration_locturne-rehearsal-night", appConfig("Shh. I’m sleeping. So are they.", "They wake up after 3:17 pm, once you’re out of bed.", "Fine"))
  set("shieldActions_locturne-rehearsal-night", appActions(tap: nil))
  set("shieldConfiguration_\(LOCTURNE_REHEARSAL_MORNING_SHIELD)", appConfig("No.", proofLine[method] ?? "", "I’m up"))
  set("shieldActions_\(LOCTURNE_REHEARSAL_MORNING_SHIELD)", [
    "primary": ["behavior": "defer", "type": LOCTURNE_REHEARSAL_CHECK, "actions": [["type": "sendNotification", "payload": morningTap]]]
  ])
  set(LOCTURNE_REHEARSAL_KEY, [
    "method": method, "stepGoal": stepGoal, "armedAt": ms(local("2026-10-05 15:00")),
    "start": ms(local("2026-10-05 15:02")), "end": ms(local("2026-10-05 15:17")),
  ])
  configureActions(LOCTURNE_REHEARSAL_ACTIVITY, "intervalDidStart", [
    ["type": "blockSelection", "familyActivitySelectionId": LOCTURNE_REHEARSAL_LIST, "shieldId": "locturne-rehearsal-night"]
  ])
  DeviceActivityCenter.monitored.append(DeviceActivityName(LOCTURNE_REHEARSAL_ACTIVITY))
}

/// iOS runs the window: its start at 15:02, its end at 15:17, then forgets the one-off activity.
func rehearsalNightRuns() {
  at("2026-10-05 15:02"); start(LOCTURNE_REHEARSAL_ACTIVITY)
  at("2026-10-05 15:17"); end(LOCTURNE_REHEARSAL_ACTIVITY)
  DeviceActivityCenter.monitored.removeAll { $0.rawValue == LOCTURNE_REHEARSAL_ACTIVITY }
}

func rehearsalNote(_ key: String) -> Any? { (get(LOCTURNE_REHEARSAL_KEY) as? [String: Any])?[key] }

func expectRealLockUntouched(line: UInt = #line) {
  expect(!nightHeld(), "the real night isn't held", line: line)
  expect(morningProofs().isEmpty, "no proof recorded", line: line)
  expectEqual(won(), 0, "no morning counted", line: line)
}

func registerRehearsalTests() {
  test("rehearsal: its start shields only the copy, with the night's words, the real lock untouched") {
    rehearsalArmed()
    expectEqual(shielded(), ["reddit"], "nothing more before its bedtime")
    at("2026-10-05 15:02"); start(LOCTURNE_REHEARSAL_ACTIVITY)
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"])
    expectEqual(rehearsalNote("heldAt") as? Double, ms(local("2026-10-05 15:02")), "noted when iOS ran it")
    expectEqual(drawn("tiktok").title, "Shh. I’m sleeping. So are they.")
    expectEqual(drawn("tiktok").subtitle, "They wake up after 3:17 pm, once you’re out of bed.")
    expectEqual(buttonType("tiktok"), nil, "the button only closes")
    expectEqual(drawn("reddit").title, "Shh. I’m sleeping. So are they.", "the fallback has the night's words, as a real window's start leaves it")
    expectRealLockUntouched()
  }

  test("rehearsal: a re-apply mid-night keeps the copy asleep") {
    rehearsalArmed()
    at("2026-10-05 15:02"); start(LOCTURNE_REHEARSAL_ACTIVITY)
    appUnshields("night")
    expectEqual(shielded(), ["reddit"], "unshielding the bedtime list takes the same apps")
    reapplyLocturneBlocks(triggeredBy: "test")
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"], "the copy is a held rule")
  }

  test("rehearsal: its end puts up its morning, found after iOS forgets the window") {
    rehearsalArmed()
    rehearsalNightRuns()
    expectEqual(drawn("tiktok").title, "No.")
    expectEqual(drawn("tiktok").subtitle, "Walk 200 steps and I’ll wake them.")
    expectEqual(drawn("tiktok").button, "I’m up")
    expectEqual(buttonType("tiktok"), LOCTURNE_REHEARSAL_CHECK)
    expectEqual(rehearsalNote("morningBy") as? String, "iOS")
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"], "still asleep")
  }

  test("rehearsal, steps: I'm up at the goal wakes the copy only, nothing recorded") {
    rehearsalArmed()
    rehearsalNightRuns()
    at("2026-10-05 15:25")
    expectEqual(tap("tiktok", .data(steps: 230)), [.defer])
    expectEqual(shielded(), ["reddit"], "only the always app stays asleep")
    expectEqual(PedometerScript.queries.first?.from, local("2026-10-05 15:17"), "steps from its morning start")
    expectEqual(rehearsalNote("wonBy") as? String, "shield")
    expectEqual(rehearsalNote("steps") as? Int, 230)
    expect(sentTaps().isEmpty, "no open-Locturne notification")
    expectEqual(drawn("reddit").title, "Shh. It’s asleep.", "the day's words back")
    expectRealLockUntouched()
    reapplyLocturneBlocks(triggeredBy: "test")
    expectEqual(shielded(), ["reddit"], "won stays won")
  }

  test("rehearsal, steps: short keeps them asleep and says how far") {
    rehearsalArmed()
    rehearsalNightRuns()
    at("2026-10-05 15:22")
    tap("tiktok", .data(steps: 120))
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"])
    expectEqual(drawn("tiktok").subtitle, "120 of 200 steps. 80 more, then tap I’m up.")
    expectEqual(rehearsalNote("lastCheck") as? String, "short")
    tap("tiktok", .data(steps: 210))
    expectEqual(shielded(), ["reddit"])
  }

  test("rehearsal, downstairs: a floor with a few steps wakes them") {
    rehearsalArmed(method: "downstairs")
    rehearsalNightRuns()
    at("2026-10-05 15:20")
    tap("tiktok", .data(steps: 300))
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"], "steps alone don't prove stairs")
    tap("tiktok", .data(steps: 30, ascended: 0, descended: 1))
    expectEqual(shielded(), ["reddit"])
    expectEqual(rehearsalNote("lastCheck") as? String, "downstairs")
  }

  test("rehearsal, push-ups: I'm up opens Locturne, nothing wakes") {
    rehearsalArmed(method: "pushups")
    rehearsalNightRuns()
    at("2026-10-05 15:20")
    tap("tiktok", .data(steps: 900))
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"])
    expectEqual(sentTaps().count, 1, "the notification that opens Locturne")
    expectEqual(drawn("tiktok").subtitle, "This one’s in Locturne. Open it and I’ll wake them.")
  }

  test("rehearsal: no end call from iOS, the first tap after puts the morning up and checks") {
    rehearsalArmed()
    at("2026-10-05 15:02"); start(LOCTURNE_REHEARSAL_ACTIVITY)
    at("2026-10-05 15:30")
    tap("tiktok", .data(steps: 250))
    expectEqual(rehearsalNote("morningBy") as? String, "late")
    expectEqual(shielded(), ["reddit"])
  }

  test("rehearsal: a start after its morning, or with none under way, shields nothing") {
    rehearsalArmed()
    at("2026-10-05 15:40"); start(LOCTURNE_REHEARSAL_ACTIVITY)
    expectEqual(shielded(), ["reddit"])
    expect(rehearsalNote("heldAt") == nil, "nothing noted")
    set(LOCTURNE_REHEARSAL_KEY, nil)
    at("2026-10-05 15:02"); start(LOCTURNE_REHEARSAL_ACTIVITY)
    expectEqual(shielded(), ["reddit"])
  }

  test("rehearsal: won in Locturne, a later tap does nothing") {
    rehearsalArmed()
    rehearsalNightRuns()
    // `winRehearsal`, then `finishRehearsal` after it: the record goes, the copy wakes.
    set(LOCTURNE_REHEARSAL_KEY, nil)
    appUnshields(LOCTURNE_REHEARSAL_LIST)
    at("2026-10-05 15:25")
    expectEqual(tap("tiktok", .data(steps: 900)), [.close], "the day's words only close")
    expectEqual(shielded(), ["reddit"])
  }
}
