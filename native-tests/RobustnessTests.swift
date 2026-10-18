// The extensions under stress: callbacks racing a shield tap, App Group data the app never
// meant to write (missing, the wrong type, an older shape), iOS delivering callbacks early,
// late, twice or not at all over a week (seeded, so a failure replays), and clock edges.
// Uses the shield-tap world (ShieldTapTests.swift). A `knownBug` reports without failing.
import Foundation

// MARK: - Helpers

func expect(_ condition: @autoclosure () -> Bool, line: UInt = #line) { expect(condition(), "", line: line) }

/// Starts a shield tap without letting time pass: its pedometer answer is still on the way.
/// The responses land in the box once `drainMain` runs it.
final class Responses { var all: [ShieldActionResponse] = [] }

func startTap(_ app: String, _ answer: PedometerAnswer, after delay: Double = 0.3) -> Responses {
  PedometerScript.answer = answer
  PedometerScript.delay = delay
  let box = Responses()
  handleAction(
    action: .primaryButtonPressed, completionHandler: { box.all.append($0) },
    applicationToken: Token(app), webdomainToken: nil, categoryToken: nil)
  return box
}

/// What the app does when a walk on Home proves the morning (`proveMorning` → `recordProof`,
/// then `wakeApps('night')` and the day's words): the same writes, made from the app's side.
func appProvesMorning(kind: String = "steps") {
  if let morning = locturneHeldMorning() { locturneRecordProof(morning, kind: kind) }
  appUnshields("night")
  set(LOCTURNE_NIGHT_HELD_KEY, false)
  appShields("always")
  appSetShieldText("Shh. It’s asleep.")
}

/// A tiny seeded generator (SplitMix64), so a fuzz failure replays exactly.
struct Seeded {
  var state: UInt64
  mutating func next() -> UInt64 {
    state &+= 0x9E37_79B9_7F4A_7C15
    var z = state
    z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
    z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
    return z ^ (z >> 31)
  }
  mutating func unit() -> Double { Double(next() >> 11) / Double(1 << 53) }
  mutating func chance(_ p: Double) -> Bool { unit() < p }
  mutating func between(_ a: Double, _ b: Double) -> Double { a + (b - a) * unit() }
}

func proofsFor(_ key: String) -> Int { morningProofs().filter { $0["morningKey"] as? String == key }.count }

func dayKey(_ text: String) -> String { locturneDayKey(local(text)) }

func registerRobustnessTests() {
  // MARK: 1. Races

  test("race: the last window's end arrives while a tap's pedometer answer is on the way") {
    // iOS ended the last window 4 minutes early; the tap goes in at 6:58 with the answer slow.
    pick("night", ["tiktok", "instagram"]); pick("always", ["reddit"])
    var r = routine(); r["method"] = "steps"
    saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps"); appShields("always")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 06:56"); end("night-2")
    at("2026-10-06 07:00")
    let box = startTap("tiktok", .data(steps: 300), after: 2)
    end("night-2")  // iOS says it again, mid-check
    drainMain(seconds: 10)
    expectEqual(box.all, [.defer], "one answer")
    expectWoke("steps")
    expectEqual(proofsFor("2026-10-06"), 1)
  }

  test("race: the app proves the morning on Home while the shield's check is mid-flight") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    let box = startTap("tiktok", .data(steps: 260), after: 2)
    drainMain(seconds: 1)
    appProvesMorning()
    drainMain(seconds: 10)
    expectEqual(box.all, [.defer])
    expectEqual(proofsFor("2026-10-06"), 1, "one proof, not two")
    expectEqual(won(), 1, "counted once")
    expectEqual(shielded(), ["reddit"], "nothing put back to sleep")
    expect(sentTaps().isEmpty, "no open-Locturne notification once the walk won")
  }

  test("race: two taps on two apps, both answering, win one morning and wake once") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    let a = startTap("tiktok", .data(steps: 250), after: 1)
    let b = startTap("instagram", .data(steps: 250), after: 1.5)
    drainMain(seconds: 10)
    expectEqual(a.all, [.defer]); expectEqual(b.all, [.defer])
    expectWoke("steps")
    expect(sentTaps().isEmpty, "no notification")
  }

  test("two quick taps on a scan morning: the walk wins on the first, the second sends nothing") {
    closedNight(method: "scan")
    at("2026-10-06 07:30")
    let a = startTap("tiktok", .data(steps: 250), after: 1)
    let b = startTap("tiktok", .data(steps: 250), after: 1.5)
    drainMain(seconds: 10)
    expectEqual(a.all, [.defer]); expectEqual(b.all, [.defer])
    expectWoke("steps")
    expect(sentTaps().isEmpty, "the apps are awake: nothing should ask them to prove it (sent \(sentTaps().count))")
  }

  test("race: the next bedtime's first window right after a shield wake locks again") {
    closedNight(method: "steps")
    at("2026-10-06 22:59")
    tap("tiktok", .data(steps: 400))
    // Too late for the morning? It's the same evening's day: the morning was won at 22:59.
    at("2026-10-06 23:00"); start("night-0")
    expect(nightHeld(), "the new night holds")
    expectEqual(shielded(), ["instagram", "reddit", "tiktok"])
    at("2026-10-07 03:00")
    expectEqual(tap("tiktok", .data(steps: 900)), [.close], "the bedtime button only closes")
    expect(nightHeld())
  }

  test("race: a tap whose answer lands after the next night has started wakes nothing of the new night") {
    closedNight(method: "steps")
    at("2026-10-06 22:59")
    let box = startTap("tiktok", .data(steps: 400), after: 3.5)
    drainMain(seconds: 1)
    start("night-0")
    drainMain(seconds: 10)
    expectEqual(box.all, [.defer])
    expect(nightHeld(), "the new night still holds")
    expect(shielded().isSuperset(of: ["tiktok", "instagram"]), "its apps still asleep")
  }

  test("race: the app syncs the morning words while the tap is mid-flight; a short walk still says how far") {
    closedNight(method: "steps")
    at("2026-10-06 07:20")
    let box = startTap("tiktok", .data(steps: 90), after: 2)
    drainMain(seconds: 1)
    // The app opens and re-writes the locked morning's words (applyShieldText).
    for k in [FALLBACK_SHIELD_CONFIGURATION_KEY, "\(SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX)_night"] {
      set(k, appConfig("No.", proofLine["steps"]!, "I’m up"))
    }
    for k in [SHIELD_ACTIONS_KEY, "\(SHIELD_ACTIONS_FOR_SELECTION_PREFIX)_night"] { set(k, appActions(tap: morningTap)) }
    drainMain(seconds: 10)
    expectEqual(box.all, [.defer])
    expectStillAsleep()
    expectEqual(drawn("tiktok").subtitle, "90 of 200 steps. 110 more, then tap I’m up.")
    expectEqual(drawn("tiktok").button, "I’m up")
  }

  // MARK: 2. App Group data the app never meant to write

  test("data: no routine saved; the armed night still locks, and the tap judges 200 steps") {
    closedNight(method: "steps")
    set(LOCTURNE_ROUTINE_KEY, nil)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 150))
    expectStillAsleep()
    tap("tiktok", .data(steps: 210))
    expectWoke("steps")
  }

  test("data: a method the extension doesn't know; walking still works, a short tap opens Locturne") {
    closedNight(method: "steps")
    var r = routine(); r["method"] = "teleport"; saveRoutine(r)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 50))
    expectStillAsleep()
    expectEqual(sentTaps().count, 1, "it can't judge this method: Locturne opens")
    tap("tiktok", .data(steps: 220))
    expectWoke("steps")
  }

  for (label, goal) in [("a string", "200" as Any), ("missing", NSNull() as Any)] {
    test("data: stepGoal \(label) falls back to 200") {
      closedNight(method: "steps")
      var r = routine(); r["method"] = "steps"
      if goal is NSNull { r.removeValue(forKey: "stepGoal") } else { r["stepGoal"] = goal }
      saveRoutine(r)
      at("2026-10-06 07:30")
      tap("tiktok", .data(steps: 150))
      expectStillAsleep()
      tap("tiktok", .data(steps: 200))
      expectWoke("steps")
    }
  }

  test("data: a stepGoal of 0 or less never wakes on no steps") {
    for goal in [0, -5] {
      resetWorld()
      closedNight(method: "steps", stepGoal: goal)
      at("2026-10-06 07:30")
      tap("tiktok", .data(steps: 0))
      expect(nightHeld(), "goal \(goal): no steps, still asleep")
    }
  }

  test("data: the armed record missing at the morning; the routine's times judge the tap instead") {
    closedNight(method: "steps")
    set(LOCTURNE_ARMED_KEY, nil)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 120))
    expectStillAsleep()
    tap("tiktok", .data(steps: 400))
    expectWoke("steps")
  }

  test("data: armed times of the wrong type (strings) fall back to the routine's") {
    closedNight(method: "steps")
    set(LOCTURNE_ARMED_KEY, ["bedtime": "23:00", "morningStart": "07:00", "windows": 3])
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 120))
    expectStillAsleep()
    tap("tiktok", .data(steps: 400))
    expectWoke("steps")
    at("2026-10-06 23:00"); start("night-0")
    expect(shielded().contains("tiktok"), "the next window still shields")
  }

  test("data: no armed record and no routine; the tap wakes nothing (fail safe), nothing crashes") {
    closedNight(method: "steps")
    set(LOCTURNE_ARMED_KEY, nil); set(LOCTURNE_ROUTINE_KEY, nil)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 400))
    expect(nightHeld(), "still held: only the app can judge this morning now")
    expect(shielded().contains("tiktok"))
  }

  test("data: armed times far out of range (1e9 minutes) don't crash a callback or a tap") {
    closedNight(method: "steps")
    set(LOCTURNE_ARMED_KEY, ["bedtime": 1e9, "morningStart": -1e9, "windows": 3, "armedAt": "x", "since": "x"])
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 400))
    at("2026-10-06 23:00"); start("night-0")
    end("night-0")
    expect(shielded().contains("reddit"), "the always list untouched")
  }

  test("data: one junk entry in the proofs list doesn't drop the earlier proofs") {
    closedNight(method: "steps")
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expectWoke("steps")
    var proofs: [Any] = get(LOCTURNE_PROOFS_KEY) as? [Any] ?? []
    proofs.append("junk"); proofs.append(42); proofs.append(["morningKey": 5])
    set(LOCTURNE_PROOFS_KEY, proofs)
    // A second night, then a second tap on the same morning key replayed: still one win per morning.
    at("2026-10-06 23:00"); start("night-0")
    at("2026-10-07 07:00"); end("night-2")
    at("2026-10-07 07:30")
    tap("tiktok", .data(steps: 250))
    expectEqual(proofsFor("2026-10-07"), 1)
    expectEqual(proofsFor("2026-10-06"), 1, "yesterday's proof kept")
    expectEqual(won(), 2)
  }

  test("data: morningsWon saved as a string is restarted, never a crash") {
    closedNight(method: "steps")
    set(LOCTURNE_WON_KEY, "3")
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expect(!nightHeld(), "woke")
    expect(get(LOCTURNE_WON_KEY) is NSNumber, "a number again")
  }

  test("data: an old proof with no time or kind for today doesn't stop this morning's walk") {
    closedNight(method: "steps")
    set(LOCTURNE_PROOFS_KEY, [["morningKey": "2026-10-06"]])
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expect(!nightHeld(), "woke")
    expect(!shielded().contains("tiktok"))
  }

  test("data: another list's picks undecodable; the bedtime list still locks and wakes") {
    pick("night", ["tiktok"])
    var ids = get("familyActivitySelectionIds") as? [String: Any] ?? [:]
    ids["always"] = "%%% not base64 %%%"; ids["sched-0"] = 17
    set("familyActivitySelectionIds", ids)
    var r = routine(); r["method"] = "steps"
    saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    expect(nightHeld()); expect(shielded().contains("tiktok"))
    at("2026-10-06 07:00"); end("night-2")
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expect(!nightHeld()); expect(!shielded().contains("tiktok"))
  }

  for (label, value) in [
    ("a string", "nope" as Any), ("ids that aren't strings", [["id": 5, "start": "9", "end": nil as Any? as Any]] as Any),
    ("times as strings", [["id": "sched-0", "name": "Work", "start": "540", "end": "1020", "days": ["1"]]] as Any),
  ] {
    test("data: schedules saved as \(label) don't stop the night") {
      pick("night", ["tiktok"]); pick("sched-0", ["youtube"])
      set(LOCTURNE_SCHEDULES_KEY, value)
      var r = routine(); r["method"] = "steps"
      saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
      DeviceActivityCenter.monitored.append(DeviceActivityName("sched-0"))
      at("2026-10-05 23:00"); start("night-0")
      start("sched-0"); end("sched-0")
      expect(shielded().contains("tiktok"), "the night holds")
      at("2026-10-06 07:00"); end("night-2")
      at("2026-10-06 07:30")
      tap("tiktok", .data(steps: 250))
      expect(!shielded().contains("tiktok"), "and wakes")
    }
  }

  test("data: a nap record of the wrong types neither crashes nor keeps the bedtime apps asleep") {
    closedNight(method: "steps")
    set(LOCTURNE_NAP_KEY, ["start": "a", "end": "b", "list": 3])
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 250))
    expectWoke("steps")
  }

  test("data: a routine edit waiting with a garbage time keeps the routine in force") {
    closedNight(method: "steps")
    var stored = get(LOCTURNE_ROUTINE_KEY) as? [String: Any] ?? [:]
    stored["pending"] = ["routine": "x", "from": "soon"]
    set(LOCTURNE_ROUTINE_KEY, stored)
    at("2026-10-06 07:30")
    tap("tiktok", .data(steps: 150))
    expectStillAsleep()
    tap("tiktok", .data(steps: 250))
    expectWoke("steps")
  }

  // MARK: 3. A week of iOS delivering callbacks early, late, twice or not at all

  for seed in UInt64(1)...UInt64(40) {
    test("fuzz week, seed \(seed): held nights shield, mornings stay locked till a walk, one proof each, days free") {
      var rng = Seeded(state: seed)
      pick("night", ["tiktok", "instagram"]); pick("always", ["reddit"])
      var r = routine(); r["method"] = "steps"
      saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps"); appShields("always")

      // Every callback of the week, each maybe early, late, dropped or delivered twice.
      struct Call { let at: Date; let start: Bool; let name: String }
      var calls: [Call] = []
      let edges: [(String, Bool, Int, Int)] = [  // name, start?, day offset, minute of day
        ("night-0", true, 0, 23 * 60), ("night-0", false, 1, 100), ("night-1", true, 1, 100),
        ("night-1", false, 1, 260), ("night-2", true, 1, 260), ("night-2", false, 1, 7 * 60),
      ]
      for day in 0..<7 {
        let evening = Calendar.current.date(byAdding: .day, value: day, to: local("2026-10-05 00:00"))!
        for (name, isStart, offset, minute) in edges {
          let base = Calendar.current.date(byAdding: .minute, value: offset * 1440 + minute, to: evening)!
          // The last window's end: never more than 2 minutes early (the morning shield's slack is
          // 5), and dropped less often, as its own case has a test.
          let last = name == "night-2" && !isStart
          if rng.chance(last ? 0.05 : 0.15) { continue }
          let jitter = isStart ? rng.between(-90, 240) : rng.between(last ? -110 : -240, last ? 600 : 900)
          calls.append(Call(at: base.addingTimeInterval(jitter), start: isStart, name: name))
          if rng.chance(0.15) {
            calls.append(Call(at: base.addingTimeInterval(jitter + rng.between(30, 3 * 3600)), start: isStart, name: name))
          }
        }
      }
      calls.sort { $0.at < $1.at }

      var nextCall = 0
      func runUntil(_ date: Date) {
        while nextCall < calls.count, calls[nextCall].at <= date {
          harnessClock = calls[nextCall].at
          if calls[nextCall].start { start(calls[nextCall].name) } else { end(calls[nextCall].name) }
          nextCall += 1
        }
        harnessClock = date
      }
      var wins = 0
      for day in 0..<7 {
        let morningDay = Calendar.current.date(byAdding: .day, value: day + 1, to: local("2026-10-05 00:00"))!
        let key = locturneDayKey(morningDay)
        func time(_ h: Int, _ m: Int) -> Date { Calendar.current.date(bySettingHour: h, minute: m, second: 0, of: morningDay)! }
        // 3 am: any night window that has started holds the bedtime apps.
        let anyStarted = calls.contains { $0.start && $0.at <= time(3, 0) && $0.at >= time(3, 0).addingTimeInterval(-5 * 3600) }
        runUntil(time(3, 0))
        if anyStarted {
          expect(nightHeld(), "seed \(seed) \(key): held at 3 am")
          expect(shielded().isSuperset(of: ["tiktok", "instagram"]), "seed \(seed) \(key): asleep at 3 am, shielded \(shielded())")
        }
        // 7:20: still locked, a short walk changes nothing.
        runUntil(time(7, 20))
        if nightHeld() {
          expect(shielded().isSuperset(of: ["tiktok", "instagram"]), "seed \(seed) \(key): locked morning shields")
          tap("tiktok", .data(steps: 40))
          expect(nightHeld(), "seed \(seed) \(key): 40 steps wakes nothing")
        }
        // 7:40: the walk. From the shield when it shows I'm up, else on Home (the app opened).
        runUntil(time(7, 40))
        if nightHeld() {
          if buttonType("tiktok") == LOCTURNE_MORNING_CHECK { tap("tiktok", .data(steps: 260)) } else { appProvesMorning() }
          wins += 1
        }
        expect(!nightHeld(), "seed \(seed) \(key): awake after the walk")
        expectEqual(proofsFor(key) <= 1, true, "seed \(seed) \(key): at most one proof")
        // Noon and 9 pm: late or doubled callbacks put nothing bedtime-only back to sleep.
        for (h, m) in [(12, 0), (21, 0)] {
          runUntil(time(h, m))
          expect(!shielded().contains("tiktok") && !shielded().contains("instagram"),
            "seed \(seed) \(key) \(h):\(m): bedtime apps awake by day, shielded \(shielded())")
          expect(shielded().contains("reddit"), "seed \(seed) \(key): the always app stays asleep")
        }
      }
      expectEqual(won(), wins, "seed \(seed): one morning won per walk")
    }
  }

  // MARK: 4. Clock edges

  test("clock: bedtime 00:00, morning 00:15 (one short window); the tap at 00:20 wakes") {
    pick("night", ["tiktok"])
    var r = routine(bedtime: 0, morningStart: 15); r["method"] = "steps"
    saveRoutine(r); armNight(windows: 1, bedtime: 0, morningStart: 15); appClosesInTheEvening(method: "steps")
    at("2026-10-06 00:00"); start("night-0")
    expect(nightHeld()); expect(shielded().contains("tiktok"))
    at("2026-10-06 00:15"); end("night-0")
    expectEqual(drawn("tiktok").button, "I’m up")
    at("2026-10-06 00:20")
    tap("tiktok", .data(steps: 220))
    expect(!nightHeld()); expect(!shielded().contains("tiktok"))
    expectEqual(morningProofs().first?["morningKey"] as? String, "2026-10-06")
  }

  test("clock: a long night 18:00 to 12:00 holds through the morning hours and wakes after noon") {
    pick("night", ["tiktok"])
    var r = routine(bedtime: 18 * 60, morningStart: 12 * 60); r["method"] = "steps"
    saveRoutine(r); armNight(bedtime: 18 * 60, morningStart: 12 * 60); appClosesInTheEvening(method: "steps")
    at("2026-10-05 18:00"); start("night-0")
    at("2026-10-06 00:00"); end("night-0"); start("night-1")
    at("2026-10-06 06:00"); end("night-1"); start("night-2")
    at("2026-10-06 09:00")
    expect(nightHeld()); expect(shielded().contains("tiktok"))
    expectEqual(tap("tiktok", .data(steps: 900)), [.close], "9 am is still night here")
    at("2026-10-06 12:00"); end("night-2")
    at("2026-10-06 12:10")
    tap("tiktok", .data(steps: 250))
    expect(!nightHeld())
    expectEqual(PedometerScript.queries.last?.from, local("2026-10-06 12:00"), "steps counted from noon")
  }

  // The 2026 clock changes of the zones the tz loop runs (in other zones, an ordinary night).
  for (evening, label) in [
    ("2026-10-24", "London falls back"), ("2026-10-31", "New York falls back"),
    ("2026-03-28", "London springs forward"), ("2026-03-07", "New York springs forward"),
    ("2026-04-04", "Chatham and Santiago fall back"), ("2026-09-26", "Chatham springs forward"),
    ("2026-09-05", "Santiago springs forward"),
  ] {
    test("clock: the night of \(evening) (\(label)) locks, and the morning wakes on a walk") {
      pick("night", ["tiktok"])
      var r = routine(); r["method"] = "steps"
      saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
      let eve = local("\(evening) 00:00")
      let morning = Calendar.current.date(byAdding: .day, value: 1, to: eve)!
      func on(_ day: Date, _ h: Int, _ m: Int) -> Date { Calendar.current.date(bySettingHour: h, minute: m, second: 0, of: day)! }
      harnessClock = on(eve, 23, 0); start("night-0")
      harnessClock = on(morning, 1, 40); end("night-0"); start("night-1")
      harnessClock = on(morning, 4, 20); end("night-1"); start("night-2")
      harnessClock = on(morning, 5, 0)
      expect(nightHeld()); expect(shielded().contains("tiktok"))
      harnessClock = on(morning, 7, 0); end("night-2")
      expectEqual(drawn("tiktok").button, "I’m up")
      harnessClock = on(morning, 7, 30)
      tap("tiktok", .data(steps: 250))
      expect(!nightHeld(), "woke")
      expectEqual(morningProofs().first?["morningKey"] as? String, locturneDayKey(morning))
      expectEqual(PedometerScript.queries.first?.from, on(morning, 7, 0), "counted from 7:00 local")
    }
  }

  test("the last window's end delivered 40 minutes late (phone off at 7) still puts up I'm up") {
    pick("night", ["tiktok"])
    var r = routine(); r["method"] = "steps"
    saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 07:40"); end("night-2")
    expectEqual(drawn("tiktok").button, "I’m up", "the morning's button")
  }

  knownBug("the last window's end never delivered: the shield never offers I'm up that morning") {
    pick("night", ["tiktok"])
    var r = routine(); r["method"] = "steps"
    saveRoutine(r); armNight(); appClosesInTheEvening(method: "steps")
    at("2026-10-05 23:00"); start("night-0")
    at("2026-10-06 01:40"); end("night-0"); start("night-1")
    at("2026-10-06 04:20"); end("night-1"); start("night-2")
    at("2026-10-06 07:30")
    expectEqual(drawn("tiktok").button, "I’m up", "the morning's button")
  }
}

/// Times no number can be a minute of: they used to trap the extensions (integer overflow in
/// `locturneInside`), which kills every lock. A new trap here still stops the whole run.
func registerKnownCrashTests() {
  for bad in [Double.infinity, 9.3e18, -Double.infinity, Double.nan] {
    test("data: armed and routine times of \(bad) don't crash the extensions") {
      closedNight(method: "steps")
      set(LOCTURNE_ARMED_KEY, ["bedtime": bad, "morningStart": bad, "windows": 3])
      var r = routine(); r["bedtime"] = bad; r["morningStart"] = bad; saveRoutine(r)
      at("2026-10-06 07:30")
      tap("tiktok", .data(steps: 400))
      at("2026-10-06 23:00"); start("night-0"); end("night-0")
      expect(shielded().contains("reddit"), "the always list untouched")
    }
  }
}
