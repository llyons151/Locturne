import ExpoModulesCore
import UIKit

/// Dev and preview builds only (src/lib/reel-frame.ts): squeezes the app's own window into a
/// 9:16 box pinned to the bottom of the screen, so a screen recording cropped to that box is
/// Reel-shaped at full sharpness. The window itself shrinks, not a view inside it, so every
/// modal, sheet and alert the app presents lands inside the box too; bottom sheets still rise
/// from the box's foot. The status bar and Dynamic Island sit in the strip above, which the
/// recording's crop throws away. React Native watches the window's frame and re-lays out.
public class ReelFrameModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReelFrame")

    Function("set") { (on: Bool) in
      DispatchQueue.main.async { ReelFrameModule.apply(on) }
    }

    // Dev readout (You → Developer): the safe areas each layer is actually handed, so a layout fix in
    // the box is made from numbers rather than screenshots (user 2026-11-12, the screen-time pill).
    AsyncFunction("measure") { () -> String in
      ReelFrameModule.measure()
    }.runOnQueue(.main)
  }

  static func measure() -> String {
    func n(_ v: CGFloat) -> String { String(format: "%.1f", v) }
    func describe(_ view: UIView, in window: UIWindow) -> String {
      let f = view.convert(view.bounds, to: window)
      let s = view.safeAreaInsets
      return "y \(n(f.minY)) h \(n(f.height)) · safe t \(n(s.top)) b \(n(s.bottom))"
    }
    func find(_ view: UIView, _ match: (UIView) -> Bool) -> UIView? {
      if match(view) { return view }
      for sub in view.subviews { if let hit = find(sub, match) { return hit } }
      return nil
    }
    var lines: [String] = []
    for scene in UIApplication.shared.connectedScenes {
      guard let scene = scene as? UIWindowScene else { continue }
      lines.append("screen h \(n(scene.screen.bounds.height))")
      for window in scene.windows where window.windowLevel == .normal && !window.isHidden {
        let s = window.safeAreaInsets
        lines.append("window y \(n(window.frame.minY)) h \(n(window.frame.height)) · safe t \(n(s.top)) b \(n(s.bottom))")
        if let root = window.rootViewController {
          lines.append("root extra t \(n(root.additionalSafeAreaInsets.top)) · \(describe(root.view, in: window))")
        }
        let isReport: (UIView) -> Bool = { String(describing: type(of: $0)).contains("ScreenTimeReportView") }
        if let report = find(window, isReport) {
          lines.append("report \(describe(report, in: window))")
          if let host = report.subviews.first {
            lines.append("report host \(describe(host, in: window))")
            let isRemote: (UIView) -> Bool = { String(describing: type(of: $0)).contains("Remote") }
            if let remote = find(host, isRemote) {
              lines.append("remote \(String(describing: type(of: remote))) \(describe(remote, in: window))")
            }
          }
        } else {
          lines.append("report: not on screen (open Home first)")
        }
      }
    }
    return lines.joined(separator: "\n")
  }

  static func apply(_ on: Bool) {
    for scene in UIApplication.shared.connectedScenes {
      guard let scene = scene as? UIWindowScene else { continue }
      let screen = scene.screen.bounds
      // 9:16 at the screen's full width, rounded down to a whole point.
      let height = floor(screen.width * 16 / 9)
      let frame = on && height < screen.height
        ? CGRect(x: 0, y: screen.height - height, width: screen.width, height: height)
        : screen
      // The app's windows only: the keyboard and system windows stay full screen.
      for window in scene.windows where window.windowLevel == .normal && !window.isHidden {
        window.frame = frame
        window.clipsToBounds = on
        guard let root = window.rootViewController else { continue }
        // The box sits below the status bar and Dynamic Island, but iOS still gives a window that
        // starts lower the screen's top inset, so SwiftUI views (Home's middle) started ~60 points
        // down inside the box (user 2026-11-12). Cancel it on the root, which every screen sits in.
        root.additionalSafeAreaInsets = .zero
        window.layoutIfNeeded()
        if on && frame.minY > 0 {
          root.additionalSafeAreaInsets = UIEdgeInsets(top: -window.safeAreaInsets.top, left: 0, bottom: 0, right: 0)
        }
        root.view.setNeedsLayout()
      }
    }
  }
}
