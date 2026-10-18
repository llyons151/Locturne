// "I'm up" across both halves (src/lib/native-wake-handoff.test.ts). The app's real code armed
// a night for a wake-up method and wrote the shields; here the real monitor extension runs the
// night and the real ShieldAction extension takes the tap, with the pedometer the fixture names.
// The App Group it leaves is saved to NATIVE_WAKE_RESULTS for the app's own readers to check.
import Foundation

func registerWakeFixtureTests() {
  guard let dir = ProcessInfo.processInfo.environment["NATIVE_FIXTURES"].map({ "\($0)/wake" }) else { return }
  let files = ((try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? []).filter { $0.hasSuffix(".json") }.sorted()
  if files.isEmpty {
    test("wake fixtures exist") { expect(false, "no wake fixtures in \(dir)") }
  }
  let out = ProcessInfo.processInfo.environment["NATIVE_WAKE_RESULTS"]
  for file in files {
    test("wake handoff: \(file.dropLast(5))") { try replayWake("\(dir)/\(file)", saveTo: out) }
  }
}

private func replayWake(_ path: String, saveTo out: String?) throws {
  let data = try Data(contentsOf: URL(fileURLWithPath: path))
  guard let fixture = try JSONSerialization.jsonObject(with: data) as? [String: Any],
    let name = fixture["name"] as? String,
    let store = fixture["store"] as? [String: Any],
    let monitored = fixture["monitored"] as? [String],
    let callbacks = fixture["callbacks"] as? [[String: Any]],
    let tapStep = fixture["tap"] as? [String: Any],
    let tapAt = (tapStep["at"] as? NSNumber)?.doubleValue,
    let app = tapStep["app"] as? String,
    let steps = (tapStep["steps"] as? NSNumber)?.intValue
  else { throw Failure(description: "unreadable wake fixture") }

  for (key, value) in store {
    if key == FAMILY_ACTIVITY_SELECTION_ID_KEY, let lists = value as? [String: String] {
      for (id, names) in lists { pick(id, names.split(separator: ",").map(String.init)) }
    } else {
      set(key, value)
    }
  }
  DeviceActivityCenter.monitored = monitored.map(DeviceActivityName.init)

  for step in callbacks {
    guard let atMs = (step["at"] as? NSNumber)?.doubleValue, let callback = step["callback"] as? String,
      let activity = step["activity"] as? String
    else { throw Failure(description: "unreadable callback \(step)") }
    harnessClock = Date(timeIntervalSince1970: atMs / 1000)
    if (step["utcOffset"] as? NSNumber)?.intValue != TimeZone.current.secondsFromGMT(for: harnessClock) {
      throw Failure(description: "fixture written in another time zone (run both sides with the same TZ)")
    }
    if callback == "start" { start(activity) } else { end(activity) }
  }

  harnessClock = Date(timeIntervalSince1970: tapAt / 1000)
  // The morning the app wrote, as the ShieldConfiguration extension draws it on the app.
  let morning = store["shieldConfiguration_locturne-morning"] as? [String: Any]
  expectEqual(drawn(app).title, morning?["title"] as? String, "\(name): the morning's words at 7:25")
  expectEqual(drawn(app).button, morning?["primaryButtonLabel"] as? String, "\(name): its button")
  expectEqual(buttonType(app), LOCTURNE_MORNING_CHECK, "\(name): the button checks the walk")
  expect(shielded().contains(app), "\(name): asleep before the tap")

  let answer = PedometerAnswer.data(
    steps: steps, ascended: (tapStep["ascended"] as? NSNumber)?.intValue ?? 0,
    descended: (tapStep["descended"] as? NSNumber)?.intValue ?? 0)
  let responses = tap(app, answer)
  expectEqual(responses, [.defer], "\(name): one answer")

  let woke = tapStep["woke"] as? String
  if let woke {
    expect(!shielded().contains(app), "\(name): awake after the tap")
    expectEqual(morningProofs().first?["kind"] as? String, woke, "\(name): proved by")
  } else {
    expect(shielded().contains(app), "\(name): still asleep after the tap")
    expect(morningProofs().isEmpty, "\(name): nothing recorded")
  }
  expectEqual(!sentTaps().isEmpty, tapStep["opens"] as? Bool ?? false, "\(name): opens Locturne")

  // What the app finds a minute later, minus the picks (the app keeps its own, as names).
  guard let out, let defaults = userDefaults as? MemoryDefaults else { return }
  var saved = defaults.values
  saved.removeValue(forKey: FAMILY_ACTIVITY_SELECTION_ID_KEY)
  try FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
  let json = try JSONSerialization.data(withJSONObject: ["at": tapAt + 60_000, "store": saved], options: [.prettyPrinted, .sortedKeys])
  try json.write(to: URL(fileURLWithPath: "\(out)/\(name).json"))
}
