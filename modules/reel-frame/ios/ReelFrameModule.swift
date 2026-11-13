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
