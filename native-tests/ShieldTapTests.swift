// "I'm up" on the morning shield, end to end with Locturne closed: a night through the monitor
// extension, then the tap through the ShieldAction extension's real `handleAction` and
// `locturneMorningCheck` (LocturneMorningCheck.swift), with a scripted pedometer, and the words
// and button the ShieldConfiguration extension really draws. The App Group is written in the
// shapes screen-time.ts writes (`shieldConfig`, `shieldActions`), not the shorthand Tests.swift uses.
import Foundation

// MARK: - What the app writes (screen-time.ts)

/// `shieldConfig` in screen-time.ts, without the colours.
func appConfig(_ title: String, _ subtitle: String, _ button: String) -> [String: Any] {
  ["title": title, "subtitle": subtitle, "primaryButtonLabel": button]
}

/// `shieldTap('morning')` in shield-copy.ts.
let morningTap: [String: Any] = [
  "title": "Up already?", "body": "Tap here and prove it. Then they wake.",
  "identifier": "locturne.shieldTap", "userInfo": ["url": "locturne://wake"],
]

/// `shieldActions` in screen-time.ts: the morning check with its notification, or close.
func appActions(tap: [String: Any]?) -> [String: Any] {
  guard let tap else { return ["primary": ["behavior": "close"]] }
  return ["primary": ["behavior": "defer", "type": LOCTURNE_MORNING_CHECK, "actions": [["type": "sendNotification", "payload": tap]]]]
}

/// `PROOF` in shield-copy.ts, the morning subtitle per method.
let proofLine = [
  "steps": "Walk 200 steps and I’ll wake them.", "downstairs": "Go down a floor and I’ll wake them.",
  "scan": "Scan your code and I’ll wake them.", "place": "Get to your place and I’ll wake them.",
  "pushups": "Do your push-ups and I’ll wake them.",
]

/// What `applyShieldText` leaves at the evening's last sync, the app then closed till morning:
/// the day's words on the fallback and the bedtime list, the named shields for the extension.
func appClosesInTheEvening(method: String) {
  for (id, config, tap) in [
    ("locturne-night", appConfig("Shh. I’m sleeping. So are they.", "They wake up after 7 AM, once you’re out of bed.", "Fine"), nil),
    ("locturne-morning", appConfig("No.", proofLine[method] ?? "", "I’m up"), morningTap),
    ("locturne-always", appConfig("Shh. It’s asleep.", "You put this one to sleep. It stays that way for now.", "Fine"), nil),
    ("locturne-limit", appConfig("That’s today’s lot.", "Your daily limit is used up. It wakes at midnight.", "Fine"), nil),
  ] as [(String, [String: Any], [String: Any]?)] {
    set("shieldConfiguration_\(id)", config)
    set("shieldActions_\(id)", appActions(tap: tap))
  }
  let day = appConfig("Shh. It’s asleep.", "You put this one to sleep. It stays that way for now.", "Fine")
  for k in [FALLBACK_SHIELD_CONFIGURATION_KEY, "\(SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX)_night"] { set(k, day) }
  for k in [SHIELD_ACTIONS_KEY, "\(SHIELD_ACTIONS_FOR_SELECTION_PREFIX)_night"] { set(k, appActions(tap: nil)) }
}

/// Monday 23:00 to Tuesday 07:00 with Locturne closed: tiktok and instagram on the bedtime
/// list, reddit always asleep. The routine's method is `method`.
func closedNight(method: String, stepGoal: Int = 200) {
  pick("night", ["tiktok", "instagram"]); pick("always", ["reddit"])
  var r = routine(); r["method"] = method; r["stepGoal"] = stepGoal
  saveRoutine(r); armNight(); appClosesInTheEvening(method: method)
  appShields("always")
  at("2026-10-05 23:00"); start("night-0")
  at("2026-10-06 01:40"); end("night-0"); start("night-1")
  at("2026-10-06 04:20"); end("night-1"); start("night-2")
  at("2026-10-06 07:00"); end("night-2")
}

// MARK: - What iOS does

/// What the ShieldConfiguration extension draws on `app`.
func drawn(_ app: String) -> (title: String?, subtitle: String?, button: String?) {
  let c = ShieldConfigurationExtension().configuration(shielding: Application(token: Token(app)))
  return (c.title?.text, c.subtitle?.text, c.primaryButtonLabel?.text)
}

/// The type of the action the button on `app` runs ("locturneMorningCheck", or nil for close).
func buttonType(_ app: String) -> String? {
  let actions = getActivitySelectionPrefixedConfigFromUserDefaults(
    keyPrefix: SHIELD_ACTIONS_FOR_SELECTION_PREFIX, fallbackKey: SHIELD_ACTIONS_KEY, applicationToken: Token(app))
  return (actions?["primary"] as? [String: Any])?["type"] as? String
}

/// Taps the shield's button on `app` (iOS calls the ShieldAction extension, whose class only
/// forwards to `handleAction`), then lets `seconds` pass. Every response iOS got, in order.
@discardableResult
func tap(_ app: String, _ answer: PedometerAnswer, after delay: Double = 0.3, waiting seconds: Double = 10) -> [ShieldActionResponse] {
  PedometerScript.answer = answer
  PedometerScript.delay = delay
  var responses: [ShieldActionResponse] = []
  handleAction(
    action: .primaryButtonPressed, completionHandler: { responses.append($0) },
    applicationToken: Token(app), webdomainToken: nil, categoryToken: nil)
  drainMain(seconds: seconds)
  return responses
}

func sentTaps() -> [UNNotificationRequest] { UNUserNotificationCenter.sent.filter { $0.identifier == "locturne.shieldTap" } }
func morningProofs() -> [[String: Any]] { (get(LOCTURNE_PROOFS_KEY) as? [Any])?.compactMap { $0 as? [String: Any] } ?? [] }
func won() -> Int { (get(LOCTURNE_WON_KEY) as? NSNumber)?.intValue ?? 0 }

/// The apps woke from the shield: night let go, only reddit asleep, the proof and the count.
func expectWoke(_ kind: String, line: UInt = #line) {
  expect(!nightHeld(), "the night's hold is let go", line: line)
  expectEqual(shielded(), ["reddit"], "only the always app stays asleep", line: line)
  expectEqual(morningProofs().first?["morningKey"] as? String, "2026-10-06", "this morning's proof", line: line)
  expectEqual(morningProofs().first?["kind"] as? String, kind, "proved by", line: line)
  expectEqual(won(), 1, "one morning won", line: line)
}

func expectStillAsleep(line: UInt = #line) {
  expect(nightHeld(), "still held", line: line)
  expectEqual(shielded(), ["instagram", "reddit", "tiktok"], "everything still asleep", line: line)
  expect(morningProofs().isEmpty, "nothing recorded", line: line)
}

func registerShieldTapTests() {
  // MARK: The shield the morning shows

  test("shield tap: at 7:00 the bedtime apps show No. / I'm up, whose button checks the walk") {
    closedNight(method: "steps")
    let words = drawn("tiktok")
    expectEqual(words.title, "No.")
    expectEqual(words.subtitle, "Walk 200 steps and I’ll wake them.")
    expectEqual(words.button, "I’m up")
    expectEqual(buttonType("tiktok"), LOCTURNE_MORNING_CHECK)
    expectEqual(buttonType("instagram"), LOCTURNE_MORNING_CHECK, "every bedtime app")
  }

  test("shield tap: at 3 am the bedtime words, and the button only closes") {
    pick("night", ["tiktok"]); saveRoutine(routine()); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 03:00")
    expectEqual(drawn("tiktok").title, "Shh. I’m sleeping. So are they.")
    expectEqual(buttonType("tiktok"), nil)
    expectEqual(tap("tiktok", .data(steps: 900)), [.close], "closes")
    expect(PedometerScript.queries.isEmpty, "never asks the pedometer")
    expect(nightHeld() && shielded().contains("tiktok"), "still asleep")
  }

  // MARK: Steps

  test("shield tap, steps: at the goal the apps wake with Locturne closed, no notification") {
    closedNight(method: "steps")
    at("2026-10-06 07:40")
    expectEqual(tap("tiktok", .data(steps: 230)), [.defer], "one answer: iOS redraws or drops the shield")
    expectWoke("steps")
    expectEqual(PedometerScript.queries.first?.from, local("2026-10-06 07:00"), "steps counted from the morning start")
    expect(sentTaps().isEmpty, "no open-Locturne notification")
    expectEqual(drawn("reddit").title, "Shh. It’s asleep.", "the always app shows the day's words again")
    expectEqual(buttonType("reddit"), nil, "and its button only closes")
  }

  test("shield tap, steps: exactly the goal is enough; one short isn't") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 199))
    expectStillAsleep()
    tap("tiktok", .data(steps: 200))
    expectWoke("steps")
  }

  test("shield tap, steps: short of the goal keeps them asleep and says how far") {
    closedNight(method: "steps")
    at("2026-10-06 07:20")
    expectEqual(tap("tiktok", .data(steps: 120)), [.defer])
    expectStillAsleep()
    expectEqual(drawn("tiktok").subtitle, "120 of 200 steps. 80 more, then tap I’m up.")
    expectEqual(drawn("tiktok").button, "I’m up", "the button stays")
    expect(sentTaps().isEmpty, "a short walk is said on the shield, not in a notification")
  }

  test("shield tap, steps: a custom goal (500) is the routine's, not 200") {
    closedNight(method: "steps", stepGoal: 500)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 300))
    expectStillAsleep()
    expectEqual(drawn("tiktok").subtitle, "300 of 500 steps. 200 more, then tap I’m up.")
    tap("tiktok", .data(steps: 520))
    expectWoke("steps")
  }

  test("shield tap, steps: a pedometer error opens Locturne instead, nothing woken") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    expectEqual(tap("tiktok", .error), [.defer])
    expectStillAsleep()
    expectEqual(sentTaps().count, 1, "the open-Locturne notification")
    expectEqual(sentTaps().first?.content.userInfo["url"] as? String, "locturne://wake")
    expectEqual(drawn("tiktok").subtitle, "I can’t read your steps from here. Open Locturne and I’ll check.")
  }

  test("shield tap, steps: no step counter on the phone opens Locturne") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    PedometerScript.available = false
    expectEqual(tap("tiktok", .data(steps: 900)), [.defer])
    expect(PedometerScript.queries.isEmpty, "never queried")
    expectStillAsleep()
    expectEqual(sentTaps().count, 1)
  }

  test("shield tap, steps: a pedometer that never answers times out at 4 s, once") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    PedometerScript.answer = .never
    var responses: [ShieldActionResponse] = []
    handleAction(action: .primaryButtonPressed, completionHandler: { responses.append($0) }, applicationToken: Token("tiktok"), webdomainToken: nil, categoryToken: nil)
    drainMain(seconds: 3.9)
    expect(responses.isEmpty, "still waiting at 3.9 s")
    drainMain(seconds: 0.2)
    expectEqual(responses, [.defer], "answered by the timeout")
    expectStillAsleep()
    expectEqual(sentTaps().count, 1, "opens Locturne")
  }

  test("shield tap, steps: an answer at 3.9 s wins; one at 4.5 s is ignored after the timeout") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    expectEqual(tap("tiktok", .data(steps: 250), after: 3.9), [.defer])
    expectWoke("steps")
    resetWorld(); closedNight(method: "steps"); at("2026-10-06 07:30")
    expectEqual(tap("tiktok", .data(steps: 250), after: 4.5), [.defer], "one answer, not two")
    expectStillAsleep()
    expectEqual(sentTaps().count, 1, "the timeout opened Locturne; the late walk counts at the next tap")
    tap("tiktok", .data(steps: 250))
    expectWoke("steps")
  }

  test("shield tap, steps: two quick taps record one morning") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    PedometerScript.answer = .data(steps: 250)
    var responses: [ShieldActionResponse] = []
    for _ in 0..<2 {
      handleAction(action: .primaryButtonPressed, completionHandler: { responses.append($0) }, applicationToken: Token("tiktok"), webdomainToken: nil, categoryToken: nil)
    }
    drainMain(seconds: 10)
    expectEqual(responses, [.defer, .defer], "each tap answered once")
    expectWoke("steps")
    expectEqual(morningProofs().count, 1, "one proof")
    expect(sentTaps().isEmpty, "no notification from the second tap")
  }

  test("shield tap, steps: a tap seconds after 7:00 works, counting from 7:00") {
    closedNight(method: "steps")
    at("2026-10-06 07:00")
    // A tap seconds after the morning start: the pedometer is asked from 07:00, so only steps
    // after it count. iOS answers for that range; the harness just checks the range asked.
    harnessClock = harnessClock.addingTimeInterval(5)
    tap("tiktok", .data(steps: 210))
    expectWoke("steps")
    expectEqual(PedometerScript.queries.first?.from, local("2026-10-06 07:00"))
  }

  test("shield tap, steps: a tap after the night was won does nothing more") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    PedometerScript.queries = []
    expectEqual(tap("reddit", .data(steps: 900)), [.close], "the always app's button only closes")
    expectEqual(won(), 1, "not counted twice")
  }

  // MARK: Go downstairs

  test("shield tap, downstairs: a floor down with a few steps wakes them") {
    closedNight(method: "downstairs")
    expectEqual(drawn("tiktok").subtitle, "Go down a floor and I’ll wake them.")
    at("2026-10-06 07:10")
    tap("tiktok", .data(steps: 30, ascended: 0, descended: 1))
    expectWoke("downstairs")
    expect(sentTaps().isEmpty, "no notification")
  }

  test("shield tap, downstairs: a floor up counts too (stairs either way)") {
    closedNight(method: "downstairs")
    at("2026-10-06 07:10")
    tap("tiktok", .data(steps: 25, ascended: 1, descended: 0))
    expectWoke("downstairs")
  }

  test("shield tap, downstairs: floors with under 20 steps is a lift or noise") {
    closedNight(method: "downstairs")
    at("2026-10-06 07:10")
    expectEqual(tap("tiktok", .data(steps: 19, ascended: 0, descended: 2)), [.defer])
    expectStillAsleep()
    expectEqual(drawn("tiktok").subtitle, "No stairs yet. Go down a floor, then tap I’m up. Or walk 181 more steps.")
    expect(sentTaps().isEmpty, "said on the shield")
  }

  test("shield tap, downstairs: no barometer, or no floors, and 200 steps still wakes them") {
    closedNight(method: "downstairs")
    at("2026-10-06 07:10")
    tap("tiktok", .data(steps: 200, ascended: nil, descended: nil))
    expectWoke("steps")
  }

  test("shield tap, downstairs: a pedometer error opens Locturne, whose stairs listen live") {
    closedNight(method: "downstairs")
    at("2026-10-06 07:10")
    tap("tiktok", .error)
    expectStillAsleep()
    expectEqual(sentTaps().count, 1)
  }

  // MARK: Scan, place, push-ups: the shield can't do them, so the tap opens Locturne

  for method in ["scan", "place", "pushups"] {
    test("shield tap, \(method): short of the steps, the tap opens Locturne and wakes nothing") {
      closedNight(method: method)
      expectEqual(drawn("tiktok").subtitle, proofLine[method])
      at("2026-10-06 07:15")
      expectEqual(tap("tiktok", .data(steps: 50, ascended: 0, descended: 3)), [.defer])
      expectStillAsleep()
      expectEqual(sentTaps().count, 1, "the open-Locturne notification")
      expectEqual(sentTaps().first?.content.userInfo["url"] as? String, "locturne://wake")
      expectEqual(drawn("tiktok").subtitle, "50 of 200 steps. Walk 150 more and tap I’m up, or open Locturne.")
    }

    test("shield tap, \(method): 200 steps wakes them anyway, Locturne closed") {
      closedNight(method: method)
      at("2026-10-06 07:15")
      tap("tiktok", .data(steps: 240))
      expectWoke("steps")
      expect(sentTaps().isEmpty, "no notification once they're awake")
    }

    test("shield tap, \(method): floors never prove it (only downstairs uses them)") {
      closedNight(method: method)
      at("2026-10-06 07:15")
      tap("tiktok", .data(steps: 40, ascended: 2, descended: 2))
      expectStillAsleep()
    }

    test("shield tap, \(method): proved in Locturne a moment ago, the tap only wakes them") {
      closedNight(method: method)
      at("2026-10-06 07:20")
      set(LOCTURNE_PROOFS_KEY, [["morningKey": "2026-10-06", "kind": method, "at": ms(local("2026-10-06 07:19"))]])
      set(LOCTURNE_WON_KEY, 1)
      tap("tiktok", .data(steps: 0))
      expect(!nightHeld(), "released")
      expectEqual(shielded(), ["reddit"])
      expectEqual(won(), 1, "not counted twice")
      expect(sentTaps().isEmpty, "no notification")
    }
  }

  // MARK: Nights the shield must not undo

  test("shield tap: a night a pass paused holds nothing; reddit's button only closes") {
    // The pass at 01:00 (emergency.ts): hold let go, bedtime apps woken, the day's words back.
    pick("night", ["tiktok", "instagram"]); pick("always", ["reddit"])
    var r = routine(); r["method"] = "steps"; saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
    appShields("always")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 01:00"); set(LOCTURNE_NIGHT_HELD_KEY, false); appUnshields("night"); appShields("always")
    at("2026-10-06 07:00"); end("night-2")
    expectEqual(shielded(), ["reddit"])
    expectEqual(buttonType("reddit"), nil, "no I'm up on the always app")
    expectEqual(tap("reddit", .data(steps: 900)), [.close])
    expect(morningProofs().isEmpty, "a pass's morning isn't a win")
  }

  test("shield tap: stood down (subscription over), the check wakes nothing and records nothing") {
    closedNight(method: "steps")
    set(LOCTURNE_STOOD_DOWN_KEY, true)
    at("2026-10-06 07:30")
    expectEqual(tap("tiktok", .data(steps: 900)), [.defer])
    expect(morningProofs().isEmpty, "nothing recorded")
  }

  test("shield tap: the next bedtime after a shield-won morning locks again, and the next morning works") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expectWoke("steps")
    at("2026-10-06 23:00"); start("night-0")
    expect(nightHeld(), "held again")
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"], "asleep again")
    expectEqual(drawn("tiktok").title, "Shh. I’m sleeping. So are they.", "the bedtime words, not this morning's progress")
    at("2026-10-07 01:40"); end("night-0"); start("night-1")
    at("2026-10-07 04:20"); end("night-1"); start("night-2")
    at("2026-10-07 07:00"); end("night-2")
    expectEqual(drawn("tiktok").subtitle, "Walk 200 steps and I’ll wake them.", "a fresh morning's words, not yesterday's count")
    at("2026-10-07 07:35")
    tap("tiktok", .data(steps: 120))
    expect(nightHeld(), "today needs today's walk")
    tap("tiktok", .data(steps: 260))
    expect(!nightHeld(), "woke")
    expectEqual(won(), 2, "two mornings")
    expectEqual(get(LOCTURNE_FIRST_KEY) as? String, "2026-10-06", "the first stays the first")
  }

  // MARK: Bedtime list and a schedule (locturneNightFirst in Shared.swift)

  /// A Work schedule 09:00–17:00 on weekdays holding tiktok too, with its own words.
  func workTooHoldsTiktok() {
    pick("sched-0", ["tiktok"])
    set(LOCTURNE_SCHEDULES_KEY, [["id": "sched-0", "name": "Work", "start": 9 * 60, "end": 17 * 60, "days": [1, 2, 3, 4, 5]]])
    set("\(SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX)_sched-0", appConfig("Asleep until 5 PM.", "Your Work schedule.", "Okay"))
    set("\(SHIELD_ACTIONS_FOR_SELECTION_PREFIX)_sched-0", appActions(tap: nil))
    DeviceActivityCenter.monitored.append(DeviceActivityName("sched-0"))
  }

  test("shield tap, schedule too: the morning shows I'm up on tiktok, and the tap wakes it") {
    workTooHoldsTiktok()
    closedNight(method: "steps")
    expectEqual(drawn("tiktok").title, "No.", "the bedtime list's words, not the Work schedule's")
    expectEqual(buttonType("tiktok"), LOCTURNE_MORNING_CHECK)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expect(!nightHeld(), "woke")
    expect(!shielded().contains("tiktok"), "tiktok awake until Work starts")
  }

  test("shield tap, schedule too: at night tiktok shows the bedtime words, by day Work's") {
    workTooHoldsTiktok()
    // The bedtime list larger than Work's (two apps to one): iOS's order is then Work first by
    // day, whatever the dictionary order. The smaller-bedtime-list case is the test below.
    pick("night", ["tiktok", "instagram"]); saveRoutine(routine()); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    expectEqual(drawn("tiktok").title, "Shh. I’m sleeping. So are they.")
    // Won in the morning; Work starts at 9.
    at("2026-10-06 07:00"); end("night-2")
    at("2026-10-06 07:30"); tap("tiktok", .data(steps: 250))
    at("2026-10-06 09:00"); start("sched-0")
    expect(shielded().contains("tiktok"), "Work holds tiktok")
    expectEqual(drawn("tiktok").title, "Asleep until 5 PM.", "Work's words by day")
    expectEqual(buttonType("tiktok"), nil, "and Work's button only closes")
  }

  test("shield tap: an app on the bedtime and always lists shows I'm up, then the always words once won") {
    pick("night", ["tiktok", "instagram", "reddit"])
    closedNight(method: "steps")
    pick("night", ["tiktok", "instagram", "reddit"])
    // The always list has no activity of its own, so the bedtime list's words win at morning.
    expectEqual(drawn("reddit").button, "I’m up")
    at("2026-10-06 07:30")
    tap("reddit", .data(steps: 250))
    expect(!nightHeld(), "woke")
    expectEqual(shielded(), ["reddit"], "reddit stays asleep for the always list")
    expectEqual(drawn("reddit").title, "Shh. It’s asleep.", "and now says so")
    expectEqual(buttonType("reddit"), nil, "with a button that only closes")
  }

  // MARK: Categories and the minutes around 7:00

  test("shield tap: bedtime apps picked as a whole category show I'm up and wake from the category's shield") {
    var social = FamilyActivitySelection()
    social.categoryTokens = [Token("social")]
    social.applicationTokens = [Token("tiktok")]
    setFamilyActivitySelectionById(id: "night", activitySelection: social)
    pick("always", ["reddit"])
    var r = routine(); r["method"] = "steps"
    saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 07:00"); end("night-2")
    // An app shielded only through its category: iOS asks with the category's token.
    let c = ShieldConfigurationExtension().configuration(
      shielding: Application(token: Token("snapchat")), in: ActivityCategory(token: Token("social")))
    expectEqual(c.title?.text, "No.", "the morning's words through the category")
    expectEqual(c.primaryButtonLabel?.text, "I’m up")
    PedometerScript.answer = .data(steps: 250)
    var responses: [ShieldActionResponse] = []
    handleAction(action: .primaryButtonPressed, completionHandler: { responses.append($0) }, applicationToken: nil, webdomainToken: nil, categoryToken: Token("social"))
    drainMain(seconds: 10)
    expectEqual(responses, [.defer])
    expect(!nightHeld(), "woke")
    expectEqual(morningProofs().first?["kind"] as? String, "steps")
  }

  test("iOS ends the last window at 6:57: a tap on I'm up before 7:00 says steps count from 7") {
    pick("night", ["tiktok"])
    var r = routine(); r["method"] = "steps"
    saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 06:57"); end("night-2")
    expectEqual(drawn("tiktok").button, "I’m up", "the morning shield is up from 6:57 (5 minutes' slack)")
    tap("tiktok", .data(steps: 0))
    // Steps before 7:00 can't count, so nothing can wake, but the button mustn't look broken.
    expectEqual(drawn("tiktok").subtitle, "Up early. Steps count from 7 am. Tap I’m up after that.")
    expect(nightHeld(), "still asleep")
  }

  test("shield tap: an app only on the always list shows the morning's I'm up too (the fallback), and a tap wakes the bedtime apps") {
    closedNight(method: "steps")
    // The extension copies the morning shield onto the app-wide fallback as well, which the
    // always list reads. Documented here as it is: tapping it wakes the bedtime apps, and reddit
    // itself stays asleep with the day's words.
    expectEqual(drawn("reddit").button, "I’m up")
    at("2026-10-06 07:30")
    tap("reddit", .data(steps: 250))
    expectWoke("steps")
    expectEqual(drawn("reddit").title, "Shh. It’s asleep.")
  }

  test("by day, an app on a bedtime list no bigger than a schedule's shows the schedule's words") {
    // Work holds tiktok and youtube; the bedtime list only tiktok. Won at 7:30, Work from 9.
    workTooHoldsTiktok(); pick("sched-0", ["tiktok", "youtube"])
    pick("night", ["tiktok"]); saveRoutine(routine()); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 07:00"); end("night-2")
    at("2026-10-06 07:30"); tap("tiktok", .data(steps: 250))
    at("2026-10-06 09:00"); start("sched-0")
    expect(shielded().contains("tiktok"), "Work holds tiktok")
    expectEqual(drawn("youtube").title, "Asleep until 5 PM.", "youtube, only on Work, says Work")
    // The bedtime list's config is the smaller list's, and the wake put the always words on it.
    expectEqual(drawn("tiktok").title, "Asleep until 5 PM.", "tiktok should say Work too")
  }
}
