import ExpoModulesCore
import UIKit

/**
 The Eclipse moon's ring of fire (the user asked for this ring of light, on the Eclipse only,
 2026-10-29). Drawn with Core Animation shape layers at the screen's own resolution, because the
 baked image of it looked pixelated on the phone. Its light is each layer's shadow, cast from an
 explicit `shadowPath`, so the soft parts are drawn by iOS too and nothing here is an image.

 The view is a square 1.6 moon-widths wide, centred on the moon; the ring sits on the moon's edge.
 */
public class MoonRingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoonRing")

    View(MoonRingView.self) {}
  }
}

final class MoonRingView: ExpoView {
  /// The wide orange light, the warmer light close in, then the ring itself and its white-hot core.
  private let wideLight = CAShapeLayer()
  private let nearLight = CAShapeLayer()
  private let line = CAShapeLayer()
  private let core = CAShapeLayer()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    isUserInteractionEnabled = false
    for shape in [wideLight, nearLight, line, core] {
      shape.fillColor = nil
      shape.contentsScale = UIScreen.main.scale
      layer.addSublayer(shape)
    }
    // Light only: the shapes themselves stay clear and their shadows are the glow.
    wideLight.strokeColor = UIColor.clear.cgColor
    nearLight.strokeColor = UIColor.clear.cgColor
    line.strokeColor = ringColor(0xFFB45E).withAlphaComponent(0.9).cgColor
    core.strokeColor = ringColor(0xFFF0D0).cgColor
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let side = min(bounds.width, bounds.height)
    guard side > 0 else { return }
    let r = side / 1.6 / 2
    let ring = UIBezierPath(
      arcCenter: CGPoint(x: bounds.midX, y: bounds.midY), radius: r * 0.985, startAngle: 0, endAngle: .pi * 2, clockwise: true
    ).cgPath

    CATransaction.begin()
    CATransaction.setDisableActions(true)
    for shape in [wideLight, nearLight, line, core] {
      shape.frame = bounds
      shape.path = ring
    }
    glow(wideLight, ring: ring, width: r * 0.07, color: 0xFF9A3C, opacity: 0.55, blur: r * 0.16)
    glow(nearLight, ring: ring, width: r * 0.035, color: 0xFFB45E, opacity: 1, blur: r * 0.06)
    line.lineWidth = r * 0.022
    core.lineWidth = r * 0.012
    CATransaction.commit()
  }

  private func glow(_ shape: CAShapeLayer, ring: CGPath, width: CGFloat, color: UInt32, opacity: Float, blur: CGFloat) {
    shape.shadowPath = ring.copy(strokingWithWidth: width, lineCap: .round, lineJoin: .round, miterLimit: 1)
    shape.shadowColor = ringColor(color).cgColor
    shape.shadowOpacity = opacity
    shape.shadowRadius = blur
    shape.shadowOffset = .zero
  }
}

private func ringColor(_ rgb: UInt32) -> UIColor {
  UIColor(
    red: CGFloat((rgb >> 16) & 0xFF) / 255, green: CGFloat((rgb >> 8) & 0xFF) / 255, blue: CGFloat(rgb & 0xFF) / 255, alpha: 1
  )
}
