// Replays the handoff fixtures written by src/lib/native-handoff.test.ts: the App Group
// exactly as the real app code left it, then each callback iOS would make with the app
// closed. After each one, what's shielded must match what the app's own rules (`readLock`)
// say. This is where the JS and Swift halves have to agree on key names, value types and
// timing, which neither side's unit tests can see.
import Foundation

func registerFixtureTests() {
  guard let dir = ProcessInfo.processInfo.environment["NATIVE_FIXTURES"] else { return }
  let files = ((try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? [])
    .filter { $0.hasSuffix(".json") }.sorted()
  if files.isEmpty {
    test("handoff fixtures exist") { expect(false, "no fixtures in \(dir)") }
  }
  for file in files {
    let path = "\(dir)/\(file)"
    test("handoff: \(file.dropLast(5))") { try replay(path) }
  }
}

private func replay(_ path: String) throws {
  let data = try Data(contentsOf: URL(fileURLWithPath: path))
  guard let fixture = try JSONSerialization.jsonObject(with: data) as? [String: Any],
    let store = fixture["store"] as? [String: Any],
    let monitored = fixture["monitored"] as? [String],
    let steps = fixture["steps"] as? [[String: Any]]
  else { throw Failure(description: "unreadable fixture") }

  for (key, value) in store {
    if key == FAMILY_ACTIVITY_SELECTION_ID_KEY, let lists = value as? [String: String] {
      // The fake library stores picks as app names; the extension wants real selections.
      for (id, names) in lists { pick(id, names.split(separator: ",").map(String.init)) }
    } else {
      set(key, value)
    }
  }
  DeviceActivityCenter.monitored = monitored.map(DeviceActivityName.init)

  for step in steps {
    guard let atMs = (step["at"] as? NSNumber)?.doubleValue,
      let callback = step["callback"] as? String,
      let activity = step["activity"] as? String,
      let want = step["shielded"] as? [String]
    else { throw Failure(description: "unreadable step \(step)") }
    harnessClock = Date(timeIntervalSince1970: atMs / 1000)
    let offset = (step["utcOffset"] as? NSNumber)?.intValue
    if offset != TimeZone.current.secondsFromGMT(for: harnessClock) {
      throw Failure(description: "fixture written in another time zone (run both sides with the same TZ)")
    }
    switch callback {
    case "start": start(activity)
    case "end": end(activity)
    case "threshold": threshold(activity)
    default: throw Failure(description: "unknown callback \(callback)")
    }
    let when = "\(step["local"] as? String ?? "") \(callback) \(activity):"
    expectEqual(shielded(), Set(want), when)
    for (key, value) in step["writes"] as? [String: String] ?? [:] {
      expectEqual(get(key) as? String, value, "\(when) the extension writes \(key) as the app reads it")
    }
    if let title = step["nightTitle"] as? String {
      expectEqual(shieldTitle(forList: "night"), title, "\(when) morning words")
    }
  }
}
