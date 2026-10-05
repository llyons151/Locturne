// The test world: a fresh App Group, an empty shield store and a clock, plus helpers that
// write what the app writes (src/lib/screen-time.ts, routine.ts) and read back what iOS
// would be shielding.
import Foundation

// MARK: - A tiny runner

struct Failure: Error, CustomStringConvertible {
  let description: String
}

nonisolated(unsafe) var registered: [(name: String, body: () throws -> Void)] = []
nonisolated(unsafe) var currentFailures: [String] = []

func test(_ name: String, _ body: @escaping () throws -> Void) {
  registered.append((name, body))
}

func expect(
  _ condition: @autoclosure () -> Bool, _ message: @autoclosure () -> String,
  line: UInt = #line
) {
  if !condition() { currentFailures.append("line \(line): \(message())") }
}

func expectEqual<T: Equatable>(
  _ actual: T, _ expected: T, _ message: @autoclosure () -> String = "", line: UInt = #line
) {
  if actual != expected {
    currentFailures.append("line \(line): \(message()) expected \(expected), got \(actual)")
  }
}

/// Runs every registered test whose name contains `filter`. Returns the failure count.
func runTests(filter: String?) -> Int {
  var failed = 0
  var ran = 0
  for (name, body) in registered where filter.map({ name.contains($0) }) ?? true {
    ran += 1
    resetWorld()
    currentFailures = []
    do { try body() } catch { currentFailures.append("threw: \(error)") }
    if currentFailures.isEmpty {
      print("ok   \(name)")
    } else {
      failed += 1
      print("FAIL \(name)")
      for f in currentFailures { print("       \(f)") }
    }
  }
  print("\n\(ran - failed)/\(ran) passed")
  return failed
}

// MARK: - The world

/// The App Group, in memory. Linux's UserDefaults round-trips a whole number as `Int`, which
/// `as? Double` refuses; iOS hands back the `NSNumber` it was given, which accepts it. JS
/// numbers cross the bridge as doubles, so `set` stores numbers as `NSNumber(Double)` too.
final class MemoryDefaults: UserDefaults {
  var values: [String: Any] = [:]

  static func bridged(_ value: Any) -> Any {
    if value is Bool { return value }
    if let n = value as? NSNumber, !(value is Bool) { return NSNumber(value: n.doubleValue) }
    if let a = value as? [Any] { return a.map(bridged) }
    if let d = value as? [String: Any] { return d.mapValues(bridged) }
    return value
  }

  override func object(forKey key: String) -> Any? { values[key] }
  override func set(_ value: Any?, forKey key: String) {
    if let value { values[key] = Self.bridged(value) } else { values.removeValue(forKey: key) }
  }
  override func set(_ value: Bool, forKey key: String) { values[key] = value }
  override func set(_ value: Int, forKey key: String) { values[key] = NSNumber(value: Double(value)) }
  override func set(_ value: Double, forKey key: String) { values[key] = NSNumber(value: value) }
  override func removeObject(forKey key: String) { values.removeValue(forKey: key) }
  override func string(forKey key: String) -> String? { values[key] as? String }
  override func array(forKey key: String) -> [Any]? { values[key] as? [Any] }
  override func dictionary(forKey key: String) -> [String: Any]? { values[key] as? [String: Any] }
  override func bool(forKey key: String) -> Bool { (values[key] as? Bool) ?? false }
}

nonisolated(unsafe) let monitor = DeviceActivityMonitorExtension()

/// A fresh App Group, nothing shielded, nothing monitored, nothing sent, clock at 2026-10-05
/// (a Monday) 12:00 local time.
func resetWorld() {
  userDefaults = MemoryDefaults(suiteName: "locturne-native-tests")
  ManagedSettingsStore().clearAllSettings()
  DeviceActivityCenter.monitored = []
  DeviceActivityCenter.schedules = [:]
  DeviceActivityCenter.starts = 0
  DeviceActivityCenter.refusedStarts = []
  DeviceActivityCenter.onStart = nil
  DeviceActivityCenter.peakActivities = 0
  UNUserNotificationCenter.sent = []
  at("2026-10-05 12:00")
}

let localFormatter: DateFormatter = {
  let f = DateFormatter()
  f.locale = Locale(identifier: "en_US_POSIX")
  f.calendar = Calendar(identifier: .gregorian)
  f.timeZone = .current
  f.dateFormat = "yyyy-MM-dd HH:mm"
  return f
}()

/// A local wall-clock time, "yyyy-MM-dd HH:mm".
func local(_ text: String) -> Date {
  guard let date = localFormatter.date(from: text) else { fatalError("bad date \(text)") }
  return date
}

/// Moves the clock to a local wall-clock time.
func at(_ text: String) { harnessClock = local(text) }

func ms(_ date: Date) -> Double { (date.timeIntervalSince1970 * 1000).rounded() }

// MARK: - What the app writes

/// Picks for a list, as Apple's picker would save them (`setFamilyActivitySelectionId`).
func pick(_ id: String, _ apps: [String]) {
  var selection = FamilyActivitySelection()
  selection.applicationTokens = Set(apps.map(Token.init))
  setFamilyActivitySelectionById(id: id, activitySelection: selection)
}

func picks(_ id: String) -> Set<String>? {
  getFamilyActivitySelectionById(id: id).map { Set($0.applicationTokens.map(\.name)) }
}

func set(_ key: String, _ value: Any?) {
  if let value { userDefaults?.set(value, forKey: key) } else { userDefaults?.removeObject(forKey: key) }
}

func get(_ key: String) -> Any? { userDefaults?.object(forKey: key) }

/// `configureActions` in react-native-device-activity's JS: the actions list a callback runs.
func configureActions(_ activity: String, _ callback: String, event: String? = nil, _ actions: [[String: Any]]) {
  let key = event.map { "actions_for_\(activity)_\(callback)_\($0)" } ?? "actions_for_\(activity)_\(callback)"
  set(key, actions)
}

/// `routine.ts`'s stored routine. Days are `Date.getDay()` numbers, 0 is Sunday.
func routine(bedtime: Int = 23 * 60, morningStart: Int = 7 * 60, nights: [Int] = Array(0...6)) -> [String: Any] {
  ["bedtime": bedtime, "morningStart": morningStart, "activeNights": nights, "method": "downstairs", "stepGoal": 200]
}

func saveRoutine(_ active: [String: Any], pending: (routine: [String: Any], from: Date)? = nil) {
  var stored: [String: Any] = ["active": active]
  if let pending { stored["pending"] = ["routine": pending.routine, "from": ms(pending.from)] }
  set(LOCTURNE_ROUTINE_KEY, stored)
}

/// The words a shield id shows (`updateShieldWithId` in the library's JS).
func shieldWords(_ id: String, title: String, tap: [String: Any]? = nil) {
  set("shieldConfiguration_\(id)", ["title": title])
  var primary: [String: Any] = ["behavior": "close"]
  if let tap { primary["actions"] = [["type": "sendNotification", "payload": tap]] }
  set("shieldActions_\(id)", ["primary": primary])
}

/// `armNight` in screen-time.ts: the night windows, each shielding `list` at its start, and
/// the armed record. Windows are named night-0… as `planNightWindows` names them.
func armNight(windows: Int = 3, list: String = "night", bedtime: Int = 23 * 60, morningStart: Int = 7 * 60) {
  for i in 0..<windows {
    configureActions("night-\(i)", "intervalDidStart", [
      ["type": "blockSelection", "familyActivitySelectionId": list, "shieldId": "locturne-night"]
    ])
    DeviceActivityCenter.monitored.append(DeviceActivityName("night-\(i)"))
  }
  set(LOCTURNE_ARMED_KEY, [
    "bedtime": bedtime, "morningStart": morningStart, "windows": windows,
    "armedAt": "2026-01-01T00:00:00.000Z", "since": "2026-01-01T00:00:00.000Z",
  ])
}

/// `armLimit` in screen-time.ts: midnight unshields, the threshold event shields.
func armLimit(_ id: String) {
  configureActions(id, "intervalDidStart", [["type": "unblockSelection", "familyActivitySelectionId": id]])
  configureActions(id, "eventDidReachThreshold", event: "used-up", [["type": "blockSelection", "familyActivitySelectionId": id]])
  DeviceActivityCenter.monitored.append(DeviceActivityName(id))
}

/// `startNap` in screen-time.ts, minus the shield it puts up itself (call `appShields`).
func startNap(list: String, minutes: Double) {
  let start = ms(harnessNow())
  configureActions(LOCTURNE_NAP_ACTIVITY, "intervalDidEnd", [["type": "unblockSelection", "familyActivitySelectionId": list]])
  DeviceActivityCenter.monitored.append(DeviceActivityName(LOCTURNE_NAP_ACTIVITY))
  set(LOCTURNE_NAP_KEY, ["start": start, "end": start + minutes * 60_000, "list": list])
}

/// The app's own `blockSelection` / `unblockSelection` calls go through the same library code.
func appShields(_ id: String) {
  if let s = getFamilyActivitySelectionById(id: id) { blockSelectedApps(blockSelection: s, triggeredBy: "app") }
}
func appUnshields(_ id: String) {
  if let s = getFamilyActivitySelectionById(id: id) { unblockSelection(removeSelection: s, triggeredBy: "app") }
}

// MARK: - What iOS does

func start(_ activity: String) { monitor.intervalDidStart(for: DeviceActivityName(activity)) }
func end(_ activity: String) { monitor.intervalDidEnd(for: DeviceActivityName(activity)) }
func threshold(_ activity: String, _ event: String = "used-up") {
  monitor.eventDidReachThreshold(DeviceActivityEvent.Name(event), activity: DeviceActivityName(activity))
}

/// The apps iOS is shielding right now.
func shielded() -> Set<String> {
  Set((ManagedSettingsStore().shield.applications ?? []).map(\.name))
}

func nightHeld() -> Bool { userDefaults?.bool(forKey: LOCTURNE_NIGHT_HELD_KEY) == true }

/// The words the shield extension would show on an app in `list` (its per-list config first,
/// then the app-wide fallback), as the title only.
func shieldTitle(forList list: String) -> String? {
  let config =
    (get("\(SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX)_\(list)") as? [String: Any])
    ?? (get(FALLBACK_SHIELD_CONFIGURATION_KEY) as? [String: Any])
  return config?["title"] as? String
}

func heartbeats() -> [[String: Any]] {
  (get(LOCTURNE_HEARTBEAT_KEY) as? [Any])?.compactMap { $0 as? [String: Any] } ?? []
}

/// What the real ShieldConfiguration / ShieldAction lookup (library Shared.swift) shows on `app`.
func shown(_ app: String) -> (title: String?, tap: Bool) {
  let config = getActivitySelectionPrefixedConfigFromUserDefaults(
    keyPrefix: SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX, fallbackKey: FALLBACK_SHIELD_CONFIGURATION_KEY,
    applicationToken: Token(app))
  let actions = getActivitySelectionPrefixedConfigFromUserDefaults(
    keyPrefix: SHIELD_ACTIONS_FOR_SELECTION_PREFIX, fallbackKey: SHIELD_ACTIONS_KEY,
    applicationToken: Token(app))
  let primary = actions?["primary"] as? [String: Any]
  return (config?["title"] as? String, (primary?["actions"] as? [Any])?.isEmpty == false)
}

/// `setShieldText` in screen-time.ts: fallback + the night list's config.
func appSetShieldText(_ title: String) {
  let primary: [String: Any] = ["behavior": "close"]
  for k in [FALLBACK_SHIELD_CONFIGURATION_KEY, "\(SHIELD_CONFIGURATION_FOR_SELECTION_PREFIX)_night"] { set(k, ["title": title]) }
  for k in [SHIELD_ACTIONS_KEY, "\(SHIELD_ACTIONS_FOR_SELECTION_PREFIX)_night"] { set(k, ["primary": primary]) }
}

func appWritesNamed() {
  shieldWords("locturne-always", title: "Always words")
  shieldWords("locturne-night", title: "Bedtime words")
  shieldWords("locturne-morning", title: "Morning words", tap: ["title": "Up already?"])
  shieldWords("locturne-limit", title: "That’s today’s lot.")
}
