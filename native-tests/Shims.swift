// Stand-ins for the Apple-only frameworks the extensions import (DeviceActivity,
// FamilyControls, ManagedSettings, UIKit, UserNotifications, os), so the real extension
// sources compile and run on Linux. Only what the sources touch is here, and only as much
// behaviour as the tests need: tokens are names, the store keeps what it's given, and
// notifications and URL opens are recorded instead of sent.
import Foundation

// MARK: - Clock

/// The harness's clock. `run.sh` rewrites every `Date()` and `Date.now` in the copied
/// sources to call this, so a test can step through a night.
nonisolated(unsafe) var harnessClock: Date = Date(timeIntervalSince1970: 0)
func harnessNow() -> Date { harnessClock }

// MARK: - Tokens and selections (FamilyControls / ManagedSettings)

/// An app, category or website token. On iOS these are opaque; here they're names, so a test
/// can say "tiktok is shielded".
struct Token: Hashable, Codable, Comparable, CustomStringConvertible {
  let name: String
  init(_ name: String) { self.name = name }
  var description: String { name }
  static func < (a: Token, b: Token) -> Bool { a.name < b.name }
}
typealias ApplicationToken = Token
typealias WebDomainToken = Token
typealias ActivityCategoryToken = Token

struct FamilyActivitySelection: Codable, Equatable {
  var applicationTokens: Set<ApplicationToken> = []
  var categoryTokens: Set<ActivityCategoryToken> = []
  var webDomainTokens: Set<WebDomainToken> = []
  var includeEntireCategory = false
  init(includeEntireCategory: Bool = false) { self.includeEntireCategory = includeEntireCategory }
}

struct Application: Hashable {
  var token: ApplicationToken?
  var localizedDisplayName: String? { token?.name }
}

struct WebDomain: Hashable {
  var token: WebDomainToken?
  var domain: String?
  init(domain: String) { self.domain = domain; self.token = Token(domain) }
  init(token: WebDomainToken) { self.token = token; self.domain = token.name }
}

struct ActivityCategory: Hashable { var token: ActivityCategoryToken? }

enum ShieldSettings {
  enum ActivityCategoryPolicy<T>: Equatable {
    case none
    case all(except: Set<Token> = [])
    case specific(Set<Token>, except: Set<Token> = [])
  }
}

struct WebContentSettings {
  enum FilterPolicy: Equatable {
    case none
    case auto(Set<WebDomain> = [], except: Set<WebDomain> = [])
    case specific(Set<WebDomain>)
    case all(except: Set<WebDomain> = [])
  }
  var blockedByFilter: FilterPolicy?
}

/// What iOS is shielding. The one store every extension and the app share.
final class ManagedSettingsStore {
  struct Shield {
    var applications: Set<ApplicationToken>?
    var webDomains: Set<WebDomainToken>?
    var applicationCategories: ShieldSettings.ActivityCategoryPolicy<Application>?
    var webDomainCategories: ShieldSettings.ActivityCategoryPolicy<WebDomain>?
  }
  /// Shared across instances, as the real named store is.
  nonisolated(unsafe) static var shared = Shield()
  nonisolated(unsafe) static var sharedWebContent = WebContentSettings()
  var shield: Shield {
    get { Self.shared }
    set { Self.shared = newValue }
  }
  var webContent: WebContentSettings {
    get { Self.sharedWebContent }
    set { Self.sharedWebContent = newValue }
  }
  func clearAllSettings() {
    Self.shared = Shield()
    Self.sharedWebContent = WebContentSettings()
  }
}

// MARK: - DeviceActivity

struct DeviceActivityName: Hashable {
  let rawValue: String
  init(_ rawValue: String) { self.rawValue = rawValue }
}

struct DeviceActivityEvent {
  struct Name: Hashable {
    let rawValue: String
    init(_ rawValue: String) { self.rawValue = rawValue }
  }
  init(
    applications: Set<ApplicationToken>, categories: Set<ActivityCategoryToken>,
    webDomains: Set<WebDomainToken>, threshold: DateComponents, includesPastActivity: Bool = false
  ) {}
}

struct DeviceActivitySchedule {
  let intervalStart: DateComponents
  let intervalEnd: DateComponents
  let repeats: Bool
  init(intervalStart: DateComponents, intervalEnd: DateComponents, repeats: Bool) {
    self.intervalStart = intervalStart
    self.intervalEnd = intervalEnd
    self.repeats = repeats
  }
}

final class DeviceActivityCenter {
  /// The monitored activities, set by a test (the app's `startMonitoring` calls).
  nonisolated(unsafe) static var monitored: [DeviceActivityName] = []
  nonisolated(unsafe) static var schedules: [DeviceActivityName: DeviceActivitySchedule] = [:]
  nonisolated(unsafe) static var starts = 0
  nonisolated(unsafe) static var refusedStarts: Set<Int> = []
  nonisolated(unsafe) static var onStart: ((DeviceActivityName) -> Void)?
  nonisolated(unsafe) static var peakActivities = 0
  enum MonitoringFailure: Error { case refused, tooMany, tooShort }
  var activities: [DeviceActivityName] { Self.monitored }
  func startMonitoring(
    _ name: DeviceActivityName, during: DeviceActivitySchedule,
    events: [DeviceActivityEvent.Name: DeviceActivityEvent]
  ) throws {
    Self.starts += 1
    if Self.refusedStarts.contains(Self.starts) { throw MonitoringFailure.refused }
    let minutes: (DateComponents) -> Int = { ($0.hour ?? 0) * 60 + ($0.minute ?? 0) }
    let length = (minutes(during.intervalEnd) - minutes(during.intervalStart) + 1440) % 1440
    if length < 15 { throw MonitoringFailure.tooShort }
    if !Self.monitored.contains(name) && Self.monitored.count >= 20 { throw MonitoringFailure.tooMany }
    if !Self.monitored.contains(name) { Self.monitored.append(name) }
    Self.schedules[name] = during
    Self.peakActivities = max(Self.peakActivities, Self.monitored.count)
    Self.onStart?(name)
  }
  func stopMonitoring(_ names: [DeviceActivityName] = []) {
    Self.monitored = names.isEmpty ? [] : Self.monitored.filter { !names.contains($0) }
    Self.schedules = Self.schedules.filter { Self.monitored.contains($0.key) }
  }
}

class DeviceActivityMonitor {
  func intervalDidStart(for activity: DeviceActivityName) {}
  func intervalDidEnd(for activity: DeviceActivityName) {}
  func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {}
  func intervalWillStartWarning(for activity: DeviceActivityName) {}
  func intervalWillEndWarning(for activity: DeviceActivityName) {}
  func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {}
}

// MARK: - UIKit, UserNotifications, extension context

final class UIColor {
  init(red: Double, green: Double, blue: Double, alpha: Double) {}
}

final class UNMutableNotificationContent {
  enum Sound { case `default`, defaultCritical, defaultRingtone }
  enum InterruptionLevel { case active, critical, passive, timeSensitive }
  var title = "", subtitle = "", body = "", categoryIdentifier = "", threadIdentifier = ""
  var launchImageName = ""
  var sound: Sound?
  var badge: NSNumber?
  var userInfo: [AnyHashable: Any] = [:]
  var interruptionLevel: InterruptionLevel = .active
}

struct UNNotificationRequest {
  let identifier: String
  let content: UNMutableNotificationContent
  init(identifier: String, content: UNMutableNotificationContent, trigger: Any?) {
    self.identifier = identifier
    self.content = content
  }
}

final class UNUserNotificationCenter {
  /// Every notification the extension sent, in order.
  nonisolated(unsafe) static var sent: [UNNotificationRequest] = []
  nonisolated(unsafe) static let instance = UNUserNotificationCenter()
  static func current() -> UNUserNotificationCenter { instance }
  func add(_ request: UNNotificationRequest, withCompletionHandler: ((Error?) -> Void)?) {
    Self.sent.append(request)
  }
  func removeAllPendingNotificationRequests() {}
  func removeAllDeliveredNotifications() {}
  func removePendingNotificationRequests(withIdentifiers: [String]) {}
  func setBadgeCount(_ count: Int) {}
}

final class NSExtensionContext {
  func open(_ url: URL, completionHandler: ((Bool) -> Void)?) {}
}

// MARK: - CoreFoundation bits missing on Linux

let kCFPreferencesCurrentApplication = "current"
func CFPreferencesAppSynchronize(_ app: String) {}

typealias CFString = String
struct CFNotificationName { init(_ name: CFString) {} }
func CFNotificationCenterGetDarwinNotifyCenter() -> Int { 0 }
func CFNotificationCenterPostNotification(_ c: Int, _ n: CFNotificationName, _ o: Any?, _ u: Any?, _ d: Bool) {}

extension FileManager {
  func containerURL(forSecurityApplicationGroupIdentifier: String) -> URL? { nil }
}

// MARK: - os.Logger

struct Logger {
  init(subsystem: String, category: String) {}
  func log(_ message: String) {}
  func info(_ message: String) {}
  func error(_ message: String) {}
  func debug(_ message: String) {}
}

// MARK: - The main queue, driven by the harness

/// Stands in for `DispatchQueue.main` in the ShieldAction sources (run.sh rewrites it), so a
/// test decides when queued work runs: `drainMain(seconds:)` moves a virtual clock on and
/// runs what's due, in order, moving `harnessClock` with it.
final class HarnessMainQueue {
  struct Task { let at: Double; let seq: Int; let run: () -> Void }
  nonisolated(unsafe) static var elapsed: Double = 0
  nonisolated(unsafe) static var tasks: [Task] = []
  nonisolated(unsafe) static var seq = 0
  static func reset() { elapsed = 0; tasks = []; seq = 0 }
  static func schedule(after delay: Double, _ run: @escaping () -> Void) {
    seq += 1
    tasks.append(Task(at: elapsed + max(0, delay), seq: seq, run: run))
  }
  func async(execute work: @escaping () -> Void) { Self.schedule(after: 0, work) }
  /// `.now() + seconds`, on the harness's virtual clock.
  struct Deadline {
    let at: Double
    static func now() -> Deadline { Deadline(at: HarnessMainQueue.elapsed) }
    static func + (d: Deadline, seconds: Double) -> Deadline { Deadline(at: d.at + seconds) }
  }
  func asyncAfter(deadline: Deadline, execute work: @escaping () -> Void) {
    Self.schedule(after: deadline.at - Self.elapsed, work)
  }
}
nonisolated(unsafe) let harnessMain = HarnessMainQueue()

/// Runs everything due within `seconds`, moving the clocks along. Work queued while running
/// (the pedometer's answer, then `finish`) runs too if it falls in the window.
func drainMain(seconds: Double) {
  let until = HarnessMainQueue.elapsed + seconds
  while let next = HarnessMainQueue.tasks.filter({ $0.at <= until }).min(by: { ($0.at, $0.seq) < ($1.at, $1.seq) }) {
    HarnessMainQueue.tasks.removeAll { $0.seq == next.seq }
    harnessClock = harnessClock.addingTimeInterval(next.at - HarnessMainQueue.elapsed)
    HarnessMainQueue.elapsed = next.at
    next.run()
  }
  harnessClock = harnessClock.addingTimeInterval(until - HarnessMainQueue.elapsed)
  HarnessMainQueue.elapsed = until
}

// MARK: - CoreMotion

/// What the motion chip says when the shield's "I'm up" asks it, set by a test.
enum PedometerAnswer {
  /// Steps and floors since the morning start. Nil floors: the phone has no barometer.
  case data(steps: Int, ascended: Int? = 0, descended: Int? = 0)
  case error
  /// The query never comes back (the 4-second timeout answers instead).
  case never
}

struct PedometerError: Error, LocalizedError { var errorDescription: String? { "pedometer unavailable" } }

enum PedometerScript {
  nonisolated(unsafe) static var available = true
  nonisolated(unsafe) static var answer: PedometerAnswer = .data(steps: 0)
  /// Seconds the query takes to answer.
  nonisolated(unsafe) static var delay: Double = 0.3
  /// Every query's range, in order.
  nonisolated(unsafe) static var queries: [(from: Date, to: Date)] = []
  static func reset() { available = true; answer = .data(steps: 0); delay = 0.3; queries = [] }
}

final class CMPedometerData {
  let numberOfSteps: NSNumber
  let floorsAscended: NSNumber?
  let floorsDescended: NSNumber?
  init(steps: Int, ascended: Int?, descended: Int?) {
    numberOfSteps = NSNumber(value: steps)
    floorsAscended = ascended.map { NSNumber(value: $0) }
    floorsDescended = descended.map { NSNumber(value: $0) }
  }
}

final class CMPedometer {
  static func isStepCountingAvailable() -> Bool { PedometerScript.available }
  /// Answers on another queue, as CoreMotion does; here the harness queue, after `delay`.
  func queryPedometerData(from start: Date, to end: Date, withHandler handler: @escaping (CMPedometerData?, Error?) -> Void) {
    PedometerScript.queries.append((start, end))
    switch PedometerScript.answer {
    case .never: return
    case .error: HarnessMainQueue.schedule(after: PedometerScript.delay) { handler(nil, PedometerError()) }
    case let .data(steps, ascended, descended):
      HarnessMainQueue.schedule(after: PedometerScript.delay) {
        handler(CMPedometerData(steps: steps, ascended: ascended, descended: descended), nil)
      }
    }
  }
}

// MARK: - ManagedSettings: the shield's button

enum ShieldAction { case primaryButtonPressed, secondaryButtonPressed }
enum ShieldActionResponse { case close, `defer`, none }

// No `ShieldActionDelegate`: its three `handle` overloads differ only by token type, and here
// every token is one type. run.sh drops the `ShieldActionExtension` class (which only forwards
// each to `handleAction`); a tap calls `handleAction` as its app override does.

// MARK: - ManagedSettingsUI: the shield's words

struct ShieldConfiguration {
  struct Label {
    let text: String
    let color: UIColor
    init(text: String, color: UIColor) { self.text = text; self.color = color }
  }
  var title: Label?
  var subtitle: Label?
  var primaryButtonLabel: Label?
  var secondaryButtonLabel: Label?
  init(
    backgroundBlurStyle: UIBlurEffect.Style? = nil, backgroundColor: UIColor? = nil, icon: UIImage? = nil,
    title: Label? = nil, subtitle: Label? = nil, primaryButtonLabel: Label? = nil,
    primaryButtonBackgroundColor: UIColor? = nil, secondaryButtonLabel: Label? = nil
  ) {
    self.title = title
    self.subtitle = subtitle
    self.primaryButtonLabel = primaryButtonLabel
    self.secondaryButtonLabel = secondaryButtonLabel
  }
}

class ShieldConfigurationDataSource {
  func configuration(shielding application: Application) -> ShieldConfiguration { ShieldConfiguration() }
  func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration { ShieldConfiguration() }
  func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { ShieldConfiguration() }
  func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { ShieldConfiguration() }
}

final class UIImage {
  init?(systemName: String) {}
  init?(data: Data) {}
  enum RenderingMode { case alwaysOriginal }
  func withTintColor(_ color: UIColor, renderingMode: RenderingMode) -> UIImage { self }
}

final class UIBlurEffect {
  struct Style { init?(rawValue: Int) {} }
}

extension UIColor {
  static var label: UIColor { UIColor(red: 0, green: 0, blue: 0, alpha: 1) }
}
