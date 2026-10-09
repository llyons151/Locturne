import CoreHaptics
import ExpoModulesCore
import UIKit

/**
 The Sleep sheet's "Hold to tuck him in" button (user's ask, 2026-10-08: "a clean hold animation
 using really pretty hd swift stuff like how opal does").

 A white pill. Press and it settles in a little; keep holding and a night-blue pill fills it from
 the left, inset so the two curves run parallel, and the label turns moon-white wherever the fill
 has passed. A Core Haptics hum rises with it. Let go early and the fill drains back. Reaching
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
  private let fill = UIView()
  /** The label twice: dark on the white, and moon-white on the fill, clipped to it. */
  private let baseLabel = LabelStack()
  private let filledLabel = LabelStack()
  private let filledMask = CAShapeLayer()

  private var baseColor = UIColor.white
  private var fillColor = UIColor(red: 0.04, green: 0.08, blue: 0.16, alpha: 1)
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

  /** The gap between the fill and the pill's edge. */
  private let inset: CGFloat = 4

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear

    content.isUserInteractionEnabled = false
    content.layer.cornerCurve = .continuous
    content.layer.masksToBounds = true
    addSubview(content)

    fill.layer.cornerCurve = .continuous
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

  func setColors(base: UIColor? = nil, fill: UIColor? = nil, text: UIColor? = nil, filledText: UIColor? = nil) {
    if let base { baseColor = base }
    if let fill { fillColor = fill }
    if let text { textColor = text }
    if let filledText { filledTextColor = filledText }
    applyColors()
  }

  private func applyColors() {
    content.backgroundColor = baseColor
    fill.backgroundColor = fillColor
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
    draw()
  }

  /** Puts the fill (and the white label's clip) where `progress` says. */
  private func draw() {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    let track = content.bounds.insetBy(dx: inset, dy: inset)
    let height = track.height
    // It grows from a dot at the left into the full inner pill, round at both ends throughout.
    let width = progress <= 0 ? 0 : height + (track.width - height) * ease(progress)
    let rect = CGRect(x: track.minX, y: track.minY, width: width, height: height)
    fill.frame = rect
    fill.layer.cornerRadius = height / 2
    fill.alpha = progress <= 0 ? 0 : min(1, progress * 12)
    filledMask.path = UIBezierPath(roundedRect: rect, cornerRadius: height / 2).cgPath
    filledLabel.alpha = fill.alpha
    CATransaction.commit()
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
