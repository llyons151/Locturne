import ExpoModulesCore
import DeviceActivity
import SwiftUI
import UIKit

public class ScreenTimeReportModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenTimeReport")
    View(ScreenTimeReportView.self) {
      Prop("days") { (view: ScreenTimeReportView, days: Int) in
        view.days = [1, 7, 30, 90, 180].contains(days) ? days : 7
        view.refresh()
      }
      Prop("compact") { (view: ScreenTimeReportView, compact: Bool) in
        view.compact = compact
        view.refresh()
      }
      Prop("pill") { (view: ScreenTimeReportView, pill: Bool) in
        view.pill = pill
        view.refresh()
      }
      Prop("revision") { (view: ScreenTimeReportView, _: Int) in view.refresh() }
    }
  }
}

private struct ReportContent: View {
  let days: Int
  var compact = false
  var pill = false
  /// When the report reads up to. A new end re-queries the extension in place, so the report keeps its
  /// view and can animate its numbers; a new identity would tear the remote view down and flash it.
  var end = Date()
  var body: some View {
    let calendar = Calendar.current
    let today = calendar.startOfDay(for: end)
    let start = calendar.date(byAdding: .day, value: 1 - days, to: today)!
    let context = "Locturne.\(pill ? "pill" : compact ? "compact" : "usage").\(days)"
    // All apps and categories, not just the bedtime selection. Usage stays inside Apple's
    // report extension; it is never copied to JS, shared defaults, or analytics.
    DeviceActivityReport(
      DeviceActivityReport.Context(context),
      filter: DeviceActivityFilter(
        segment: .daily(during: DateInterval(start: start, end: end)),
        users: .all, devices: .init([.iPhone])
      )
    )
    .id(context)
    .environment(\.colorScheme, .dark)
  }
}

class ScreenTimeReportView: ExpoView {
  var days = 7
  var compact = false
  var pill = false
  private let host = UIHostingController(rootView: ReportContent(days: 7))

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    host.view.backgroundColor = .clear
    addSubview(host.view)
  }

  func refresh() { host.rootView = ReportContent(days: days, compact: compact, pill: pill) }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else {
      host.willMove(toParent: nil)
      host.removeFromParent()
      return
    }
    var responder: UIResponder? = next
    while let current = responder {
      if let parent = current as? UIViewController {
        if host.parent == nil { parent.addChild(host); host.didMove(toParent: parent) }
        break
      }
      responder = current.next
    }
    refresh()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host.view.frame = bounds
  }
}
