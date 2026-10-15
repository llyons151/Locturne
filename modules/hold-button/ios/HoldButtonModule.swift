import CoreHaptics
import ExpoModulesCore
import UIKit

/**
 The Sleep sheet's "Hold to tuck him in" button (user's ask, 2026-10-08: "a clean hold animation
 using really pretty hd swift stuff like how opal does").

 A white pill. Press and it settles in a little; keep holding and the night sky's blue light
 sweeps in from the very left edge: soft drifting haze with a feathered front, no hard shape
 (user, 2026-10-14: "a wispy thing of blue ... like a glow", like the app's background). The
 label turns moon-white where the light is full. A Core Haptics hum rises with it. Let go early and the fill drains back. Reaching
 the end gives a success tap, a small spring back, and `onComplete`.

 Drawn with Core Animation on a display link (up to 120 Hz) so the fill tracks the finger with no
 bridge in between. VoiceOver users double-tap: holding isn't something they can be asked for.
 */
public class HoldButtonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HoldButton")

    View(HoldButtonView.self) {
      Events("onComplete")

      Prop("label") { (view: HoldButtonView, label: String) in
        view.setLabel(label)
      }
      Prop("symbol") { (view: HoldButtonView, symbol: String?) in
        view.setSymbol(symbol)
      }
      /** How long the hold takes, in milliseconds. */
      Prop("duration") { (view: HoldButtonView, ms: Double) in
        view.duration = max(0.3, ms / 1000)
      }
      Prop("disabled") { (view: HoldButtonView, disabled: Bool) in
        view.setDisabled(disabled)
      }
      Prop("color") { (view: HoldButtonView, color: UIColor?) in
        view.setColors(base: color)
      }
      Prop("fillColor") { (view: HoldButtonView, color: UIColor?) in
        view.setColors(fill: color)
      }
      Prop("textColor") { (view: HoldButtonView, color: UIColor?) in
        view.setColors(text: color)
      }
      Prop("fillTopColor") { (view: HoldButtonView, color: UIColor?) in
        view.setColors(fillTop: color)
      }
      Prop("filledTextColor") { (view: HoldButtonView, color: UIColor?) in
        view.setColors(filledText: color)
      }
    }
  }
}

final class HoldButtonView: ExpoView {
  let onComplete = EventDispatcher()

  var duration: TimeInterval = 1.2

  /** Everything that moves: scaled as one so the press reads as the whole button. */
  private let content = UIView()
  /** The light, always the whole pill; `reveal` decides how much of it shows. */
  private let fill = UIView()
  /** The fill's glassy shading, top to bottom. */
  private let fillShade = CAGradientLayer()
  /** Soft clouds of brighter blue drifting inside the light, like the sky behind the app. */
  private let wisps = (0..<3).map { _ in CAGradientLayer() }
  /** A brighter cloud riding the front of the light, so the leading edge is where it's lit. */
  private let front = CAGradientLayer()
  /** Opaque behind the front, fading to clear over `feather`: the light's soft leading edge. */
  private let reveal = CAGradientLayer()
  /** The label twice: dark on the white, and moon-white on the fill, clipped to it. */
  private let baseLabel = LabelStack()
  private let filledLabel = LabelStack()
  private let filledMask = CAGradientLayer()
  private var drifting = CGSize.zero

  private var baseColor = UIColor.white
  private var fillColor = UIColor(red: 0.04, green: 0.08, blue: 0.16, alpha: 1)
  private var fillTopColor: UIColor?
  private var textColor = UIColor(red: 0.04, green: 0.08, blue: 0.16, alpha: 1)
  private var filledTextColor = UIColor.white

  /** 0…1, how far the fill has come. */
  private var progress: CGFloat = 0
  private var holding = false
  private var finished = false
  private var disabled = false
  private var link: CADisplayLink?
  private var lastTick: CFTimeInterval = 0
  private let haptics = HoldHaptics()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear

    content.isUserInteractionEnabled = false
    content.layer.cornerCurve = .continuous
    content.layer.masksToBounds = true
    addSubview(content)

    fill.layer.masksToBounds = true
    fill.layer.addSublayer(fillShade)
    for cloud in wisps + [front] {
      cloud.type = .radial
      cloud.startPoint = CGPoint(x: 0.5, y: 0.5)
      cloud.endPoint = CGPoint(x: 1, y: 1)
      fill.layer.addSublayer(cloud)
    }
    for mask in [reveal, filledMask] {
      mask.startPoint = CGPoint(x: 0, y: 0.5)
      mask.endPoint = CGPoint(x: 1, y: 0.5)
    }
    fill.layer.mask = reveal
    content.addSubview(fill)
    content.addSubview(baseLabel)
    content.addSubview(filledLabel)
    filledLabel.layer.mask = filledMask

    isAccessibilityElement = true
    accessibilityTraits = .button
    applyColors()
  }

  deinit {
    link?.invalidate()
  }

  // MARK: Props

  func setLabel(_ label: String) {
    baseLabel.label.text = label
    filledLabel.label.text = label
    accessibilityLabel = label
    setNeedsLayout()
  }

  func setSymbol(_ name: String?) {
    baseLabel.setSymbol(name)
    filledLabel.setSymbol(name)
    setNeedsLayout()
  }

  func setDisabled(_ value: Bool) {
    disabled = value
    if value { cancelHold() }
    content.alpha = value ? 0.55 : 1
    accessibilityTraits = value ? [.button, .notEnabled] : .button
  }

  func setColors(
    base: UIColor? = nil, fill: UIColor? = nil, fillTop: UIColor? = nil, text: UIColor? = nil, filledText: UIColor? = nil
  ) {
    if let base { baseColor = base }
    if let fill { fillColor = fill }
    if let fillTop { fillTopColor = fillTop }
    if let text { textColor = text }
    if let filledText { filledTextColor = filledText }
    applyColors()
  }

  private func applyColors() {
    content.backgroundColor = baseColor
    fill.backgroundColor = fillColor
    let top = fillTopColor ?? fillColor
    fillShade.colors = [top.cgColor, fillColor.cgColor]
    // The sky's light: its top colour, and a paler one for the brightest cloud.
    let pale = top.mixed(with: .white, 0.22)
    let shades = [top.withAlphaComponent(0.75), pale.withAlphaComponent(0.55), top.withAlphaComponent(0.6)]
    for (cloud, shade) in zip(wisps, shades) {
      cloud.colors = [shade.cgColor, shade.withAlphaComponent(0).cgColor]
    }
    front.colors = [pale.withAlphaComponent(0.8).cgColor, pale.withAlphaComponent(0).cgColor]
    baseLabel.tint(textColor)
    filledLabel.tint(filledTextColor)
  }

  // MARK: Layout

  override func layoutSubviews() {
    super.layoutSubviews()
    content.bounds = CGRect(origin: .zero, size: bounds.size)
    content.center = CGPoint(x: bounds.midX, y: bounds.midY)
    content.layer.cornerRadius = bounds.height / 2
    baseLabel.frame = content.bounds
    filledLabel.frame = content.bounds
    if drifting != bounds.size {
      drifting = bounds.size
      layOutClouds()
    }
    draw()
  }

  /**
   Three wide soft clouds spread along the pill, each drifting and breathing on its own slow
   loop so the light never sits still. Reduce Motion keeps them where they are.
   */
  private func layOutClouds() {
    let w = bounds.width, h = bounds.height
    guard w > 0, h > 0 else { return }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    fill.frame = CGRect(origin: .zero, size: bounds.size)
    fillShade.frame = fill.bounds
    reveal.frame = fill.bounds
    filledMask.frame = content.bounds
    let spots: [(x: CGFloat, y: CGFloat, size: CGFloat)] = [(0.18, 0.2, 0.55), (0.55, 0.85, 0.6), (0.88, 0.3, 0.5)]
    for (i, (cloud, spot)) in zip(wisps, spots).enumerated() {
      cloud.removeAllAnimations()
      cloud.bounds = CGRect(x: 0, y: 0, width: w * spot.size, height: h * 2.2)
      cloud.position = CGPoint(x: w * spot.x, y: h * spot.y)
      guard !UIAccessibility.isReduceMotionEnabled else { continue }
      let drift = CABasicAnimation(keyPath: "position")
      drift.toValue = CGPoint(x: w * spot.x + w * (i == 1 ? -0.12 : 0.12), y: h * (1 - spot.y))
      let breathe = CABasicAnimation(keyPath: "opacity")
      breathe.fromValue = 1
      breathe.toValue = 0.55
      for (anim, seconds) in [(drift, 4.6 + Double(i) * 1.3), (breathe, 3.2 + Double(i) * 0.9)] {
        anim.duration = seconds
        anim.autoreverses = true
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        anim.isRemovedOnCompletion = false
        cloud.add(anim, forKey: anim.keyPath)
      }
    }
    front.bounds = CGRect(x: 0, y: 0, width: w * 0.42, height: h * 2.4)
    CATransaction.commit()
  }

  /** Puts the fill (and the white label's clip) where `progress` says. */
  private func draw() {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    // The light's full part ends at `edge` (in fractions of the width) and fades out over
    // `feather` past it. It starts wholly off the left edge, so the first thing seen is a faint
    // haze at the very left, and ends with the fade pushed off the right: the whole pill lit.
    let feather: CGFloat = 0.38
    let edge = -feather + (1 + feather) * ease(progress)
    shape(reveal, edge: edge, feather: feather)
    // The white label follows a tighter fade a little behind the front, where the blue is deep
    // enough to read on.
    shape(filledMask, edge: edge - 0.04, feather: 0.14)
    front.position = CGPoint(x: bounds.width * (edge + feather * 0.25), y: bounds.height * 0.5)
    front.opacity = Float(min(1, progress * 5))
    CATransaction.commit()
  }

  /**
   Sets a horizontal mask to fully opaque left of `edge`, fading linearly to clear at
   `edge + feather`. The four stops land on the fade's kinks, so the gradient is exact.
   */
  private func shape(_ mask: CAGradientLayer, edge: CGFloat, feather: CGFloat) {
    let alpha = { (x: CGFloat) in min(1, max(0, (edge + feather - x) / feather)) }
    let stops = [0, min(1, max(0, edge)), min(1, max(0, edge + feather)), 1]
    mask.locations = stops.map { NSNumber(value: Double($0)) }
    mask.colors = stops.map { UIColor(white: 1, alpha: alpha($0)).cgColor }
  }

  /** Quick off the mark, then steady: the hold feels like it's answering at once. */
  private func ease(_ t: CGFloat) -> CGFloat {
    1 - pow(1 - t, 1.6)
  }

  // MARK: Touch

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard !disabled, !finished else { return }
    holding = true
    haptics.begin(duration: duration * Double(1 - progress), from: Double(progress))
    press(true)
    startLink()
  }

  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard holding, let touch = touches.first else { return }
    // Sliding well off the button lets go, as a normal button would.
    if !bounds.insetBy(dx: -28, dy: -28).contains(touch.location(in: self)) { cancelHold() }
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    cancelHold()
  }

  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    cancelHold()
  }

  private func cancelHold() {
    guard holding else { return }
    holding = false
    haptics.end()
    press(false)
    startLink()
  }

  private func press(_ down: Bool) {
    guard !UIAccessibility.isReduceMotionEnabled else { return }
    let animator = UIViewPropertyAnimator(duration: down ? 0.35 : 0.5, dampingRatio: down ? 1 : 0.7) {
      self.content.transform = down ? CGAffineTransform(scaleX: 0.97, y: 0.97) : .identity
    }
    animator.isUserInteractionEnabled = true
    animator.startAnimation()
  }

  // MARK: Frames

  private func startLink() {
    guard link == nil else { return }
    let link = CADisplayLink(target: WeakTarget(self), selector: #selector(WeakTarget.step))
    link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
    link.add(to: .main, forMode: .common)
    self.link = link
    lastTick = CACurrentMediaTime()
  }

  private func stopLink() {
    link?.invalidate()
    link = nil
  }

  fileprivate func step() {
    let now = CACurrentMediaTime()
    let dt = CGFloat(min(now - lastTick, 1.0 / 30))
    lastTick = now

    if holding {
      progress = min(1, progress + dt / CGFloat(duration))
      if progress >= 1 { complete() }
    } else {
      // Drains back with a soft ease-out, quicker than it filled.
      progress *= exp(-dt * 9)
      if progress < 0.002 {
        progress = 0
        stopLink()
      }
    }
    draw()
  }

  private func complete() {
    holding = false
    finished = true
    stopLink()
    haptics.end()
    UINotificationFeedbackGenerator().notificationOccurred(.success)

    if UIAccessibility.isReduceMotionEnabled {
      content.transform = .identity
    } else {
      // A small give as it lets go: past rest and back.
      UIView.animate(
        withDuration: 0.55, delay: 0, usingSpringWithDamping: 0.45, initialSpringVelocity: 4,
        options: [.allowUserInteraction]
      ) {
        self.content.transform = .identity
      }
    }
    onComplete()

    // Ready again if the button stays on screen (say the start was refused).
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in
      guard let self else { return }
      self.finished = false
      self.startLink()
    }
  }

  // MARK: Accessibility

  override func accessibilityActivate() -> Bool {
    guard !disabled else { return false }
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    onComplete()
    return true
  }
}

private extension UIColor {
  /** This colour moved `amount` of the way toward `other`. */
  func mixed(with other: UIColor, _ amount: CGFloat) -> UIColor {
    var (r1, g1, b1, a1, r2, g2, b2, a2): (CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat) =
      (0, 0, 0, 0, 0, 0, 0, 0)
    getRed(&r1, green: &g1, blue: &b1, alpha: &a1)
    other.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
    return UIColor(
      red: r1 + (r2 - r1) * amount, green: g1 + (g2 - g1) * amount, blue: b1 + (b2 - b1) * amount, alpha: a1)
  }
}

/** The display link holds its target strongly; this keeps it from holding the view. */
private final class WeakTarget: NSObject {
  weak var view: HoldButtonView?
  init(_ view: HoldButtonView) { self.view = view }
  @objc func step() { view?.step() }
}

/** An SF Symbol and a label, centred. */
private final class LabelStack: UIView {
  let label = UILabel()
  private let icon = UIImageView()
  private let row = UIStackView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    label.font = UIFontMetrics(forTextStyle: .body).scaledFont(
      for: .systemFont(ofSize: 17, weight: .semibold), maximumPointSize: 22)
    label.adjustsFontForContentSizeCategory = true
    label.lineBreakMode = .byTruncatingTail
    icon.contentMode = .scaleAspectFit
    icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 16, weight: .semibold)
    icon.isHidden = true
    row.axis = .horizontal
    row.alignment = .center
    row.spacing = 8
    row.addArrangedSubview(icon)
    row.addArrangedSubview(label)
    addSubview(row)
  }

  required init?(coder: NSCoder) { fatalError() }

  func setSymbol(_ name: String?) {
    icon.image = name.flatMap { UIImage(systemName: $0) }
    icon.isHidden = icon.image == nil
  }

  func tint(_ color: UIColor) {
    label.textColor = color
    icon.tintColor = color
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let fits = row.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
    let width = min(fits.width, bounds.width - 32)
    row.frame = CGRect(
      x: (bounds.width - width) / 2, y: (bounds.height - fits.height) / 2, width: width, height: fits.height)
  }
}

/**
 A continuous hum that rises with the fill: soft and round at first, firmer and crisper near the
 end, so the finger feels the button about to give. Phones without a Taptic Engine get nothing
 until the success tap.
 */
private final class HoldHaptics {
  private let supported = CHHapticEngine.capabilitiesForHardware().supportsHaptics
  private var engine: CHHapticEngine?
  private var player: CHHapticAdvancedPatternPlayer?

  private func ready() -> CHHapticEngine? {
    guard supported else { return nil }
    if engine == nil {
      engine = try? CHHapticEngine()
      engine?.isAutoShutdownEnabled = true
      engine?.resetHandler = { [weak self] in try? self?.engine?.start() }
    }
    return engine
  }

  /** `from` is where the fill already is, so a second press carries on the rise. */
  func begin(duration: TimeInterval, from: Double) {
    end()
    guard let engine = ready(), duration > 0.05 else { return }
    let low = 0.18 + 0.6 * from
    let hum = CHHapticEvent(
      eventType: .hapticContinuous,
      parameters: [
        CHHapticEventParameter(parameterID: .hapticIntensity, value: 1),
        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.25),
      ],
      relativeTime: 0,
      duration: duration
    )
    let intensity = CHHapticParameterCurve(
      parameterID: .hapticIntensityControl,
      controlPoints: [
        .init(relativeTime: 0, value: Float(low)),
        .init(relativeTime: duration, value: 0.78),
      ],
      relativeTime: 0
    )
    let sharpness = CHHapticParameterCurve(
      parameterID: .hapticSharpnessControl,
      controlPoints: [
        .init(relativeTime: 0, value: Float(-0.15 + 0.45 * from)),
        .init(relativeTime: duration, value: 0.3),
      ],
      relativeTime: 0
    )
    do {
      try engine.start()
      let pattern = try CHHapticPattern(events: [hum], parameterCurves: [intensity, sharpness])
      player = try engine.makeAdvancedPlayer(with: pattern)
      try player?.start(atTime: CHHapticTimeImmediate)
    } catch {
      player = nil
    }
  }

  func end() {
    try? player?.stop(atTime: CHHapticTimeImmediate)
    player = nil
  }
}
