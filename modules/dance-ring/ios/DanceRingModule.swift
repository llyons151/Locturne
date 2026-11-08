import ExpoModulesCore
import SwiftUI
import UIKit

/**
 Dance's countdown ring (user 2026-11-07: "native Swift with the progress rounded", after Apple
 Fitness's countdown): the time left as a ring that empties clockwise from twelve o'clock, with
 round ends, over a dim ring of the same white, and the seconds left in the middle rolling as they
 change. A broken run fills it back up with an ease rather than a cut. No glow (CLAUDE.md).

 JS hands it `left` (0–1, the share of the goal still to dance) about 30 times a second as the
 camera reads frames; each step down follows in a short linear move, so it runs smoothly between
 frames, and a step up (a break) eases back over `refillMs`.
 */
public class DanceRingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DanceRing")

    View(DanceRingView.self) {
      Prop("left") { (view: DanceRingView, value: Double) in view.model.set(left: value) }
      Prop("seconds") { (view: DanceRingView, value: Int) in view.model.seconds = value }
      Prop("lineWidth") { (view: DanceRingView, value: Double) in view.model.lineWidth = value }
      Prop("fontSize") { (view: DanceRingView, value: Double) in view.model.fontSize = value }
      Prop("refillMs") { (view: DanceRingView, value: Double) in view.model.refillMs = value }
    }
  }
}

final class DanceRingModel: ObservableObject {
  @Published var left: Double = 1
  @Published var seconds: Int = 0
  @Published var lineWidth: Double = 10
  @Published var fontSize: Double = 40
  var refillMs: Double = 700

  func set(left next: Double) {
    let clamped = min(1, max(0, next))
    guard clamped != left else { return }
    let refill = clamped > left + 0.02
    if UIAccessibility.isReduceMotionEnabled {
      left = clamped
    } else if refill {
      withAnimation(.easeOut(duration: refillMs / 1000)) { left = clamped }
    } else {
      withAnimation(.linear(duration: 0.12)) { left = clamped }
    }
  }
}

struct DanceRing: View {
  @ObservedObject var model: DanceRingModel

  var body: some View {
    ZStack {
      Circle()
        .stroke(Color.white.opacity(0.16), lineWidth: model.lineWidth)
      Circle()
        .trim(from: 0, to: model.left)
        .stroke(Color.white, style: StrokeStyle(lineWidth: model.lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))
      Text(String(format: "%d:%02d", model.seconds / 60, model.seconds % 60))
        .font(.system(size: model.fontSize, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundStyle(Color.white)
        .contentTransition(.numericText(countsDown: true))
        .animation(.spring(duration: 0.4, bounce: 0), value: model.seconds)
    }
    // The stroke straddles the circle's edge: inset by half of it so the ring fits the view.
    .padding(model.lineWidth / 2)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(model.seconds) seconds left")
  }
}

final class DanceRingView: ExpoView {
  let model = DanceRingModel()
  private let host: UIHostingController<DanceRing>

  required init(appContext: AppContext? = nil) {
    host = UIHostingController(rootView: DanceRing(model: model))
    super.init(appContext: appContext)
    backgroundColor = .clear
    isUserInteractionEnabled = false
    host.view.backgroundColor = .clear
    addSubview(host.view)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host.view.frame = bounds
  }
}
