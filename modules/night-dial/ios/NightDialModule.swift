import ExpoModulesCore
import UIKit

/**
 The Routine tab's night dial, in Swift (user's ask, 2026-10-08: the Calm Sleep dial, "swift ios
 native super smooth and clean"). See docs/NIGHT_DIAL.md.

 A 24-hour ring with midnight at the top. A bright band runs clockwise from bedtime to morning
 start on a dim track, and its rounded ends are the handles: a moon and a sunrise on white discs.
 Hour numbers sit inside, the night's length in the middle, and the two times in columns below.

 Drag a handle to move one end, or the band to move the whole night. The band follows the finger
 exactly (no stepping); the times snap to quarter hours with a selection tick, and on release the
 band springs onto the snapped time. Everything is Core Animation on the main thread, so there's
 no bridge between the finger and the ring. The result goes back to JS once, on release, because
 every save re-arms the lock (`RoutineScreen.commit`).
 */
public class NightDialModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NightDial")

    View(NightDialView.self) {
      Events("onTimesChange")

      Prop("bedtime") { (view: NightDialView, minutes: Double) in
        view.setTime(.bed, minutes)
      }
      Prop("morningStart") { (view: NightDialView, minutes: Double) in
        view.setTime(.wake, minutes)
      }
      Prop("nightsLabel") { (view: NightDialView, text: String) in
        view.setCaption(text)
      }
      Prop("off") { (view: NightDialView, off: Bool) in
        view.setOff(off)
      }
      Prop("minWindow") { (view: NightDialView, minutes: Double) in
        view.minWindow = max(NightDialView.snap, minutes)
      }
      Prop("bandColor") { (view: NightDialView, color: UIColor?) in
        view.setColors(band: color)
      }
      Prop("trackColor") { (view: NightDialView, color: UIColor?) in
        view.setColors(track: color)
      }
      Prop("iconColor") { (view: NightDialView, color: UIColor?) in
        view.setColors(icon: color)
      }
      Prop("textColor") { (view: NightDialView, color: UIColor?) in
        view.setColors(text: color)
      }
      Prop("text2Color") { (view: NightDialView, color: UIColor?) in
        view.setColors(text2: color)
      }
      Prop("text3Color") { (view: NightDialView, color: UIColor?) in
        view.setColors(text3: color)
      }
    }
  }
}

final class NightDialView: ExpoView {
  enum End { case bed, wake }
  private enum Part { case bed, wake, night }

  static let day: Double = 1440
  static let snap: Double = 15
  /** The widest the dial gets; narrower columns shrink it. */
  private let maxDial: CGFloat = 300
  /** The track and band width. The handles are the same size, so they read as the band's ends. */
  private let band: CGFloat = 36
  /** How far from a handle's centre a touch still grabs it. */
  private let grabRadius: CGFloat = 32
  /** How far either side of the ring a touch on the band still grabs the night. */
  private let ringSlop: CGFloat = 10
  /** The columns under the dial. Matches `NIGHT_DIAL_ROW` in JS. */
  private let rowHeight: CGFloat = 98
  private let rowGap: CGFloat = 20

  let onTimesChange = EventDispatcher()
  var minWindow: Double = 15

  // MARK: State

  /** Where the times are going (snapped, 0..<1440). What JS sees and the labels show. */
  private var targetBed: Double = 22 * 60
  private var targetWake: Double = 6 * 60
  /** What's drawn. Unwrapped, so a spring can run the short way across midnight. */
  private var shownBed: Double = 22 * 60
  private var shownWake: Double = 6 * 60
  private var hasBed = false
  private var hasWake = false
  private var off = false

  private struct Drag {
    let part: Part
    let startBed: Double
    let startWake: Double
    /** The minute under the finger last update, and how far it has turned since the start. */
    var at: Double
    var moved: Double
  }
  private var drag: Drag?

  // MARK: Layers and views

  private let dial = UIView()
  private let track = CAShapeLayer()
  private let nightBand = CAShapeLayer()
  private var numbers: [(minutes: Double, label: UILabel)] = []
  private let lengthLabel = UILabel()
  private let captionLabel = UILabel()
  private let bedKnob = Knob(symbol: "moon.fill")
  private let wakeKnob = Knob(symbol: "sunrise.fill")
  private let bedColumn = TimeColumn(symbol: "moon.fill", title: "Bedtime")
  private let wakeColumn = TimeColumn(symbol: "sunrise.fill", title: "Morning start")
  private let bedElement: KnobElement
  private let wakeElement: KnobElement

  private var bandColor = UIColor(red: 0.87, green: 0.94, blue: 0.97, alpha: 1)
  private var textColor = UIColor.white
  private var text2Color = UIColor(white: 1, alpha: 0.65)
  private var text3Color = UIColor(white: 1, alpha: 0.45)

  private var caption = ""
  private var link: CADisplayLink?
  private var lastTick: CFTimeInterval = 0
  private let selection = UISelectionFeedbackGenerator()
  private let grabImpact = UIImpactFeedbackGenerator(style: .soft)
  private lazy var press: UILongPressGestureRecognizer = {
    let g = UILongPressGestureRecognizer(target: self, action: #selector(handlePress(_:)))
    g.minimumPressDuration = 0
    g.allowableMovement = .greatestFiniteMagnitude
    g.delegate = pressDelegate
    return g
  }()
  private lazy var pressDelegate = PressDelegate(self)
  /** Scroll views we stopped for the drag, to start again after. */
  private var heldScrolls: [UIScrollView] = []

  required init(appContext: AppContext? = nil) {
    bedElement = KnobElement(accessibilityContainer: NSObject())
    wakeElement = KnobElement(accessibilityContainer: NSObject())
    super.init(appContext: appContext)
    backgroundColor = .clear
    clipsToBounds = false

    addSubview(dial)
    dial.isUserInteractionEnabled = false

    for layer in [track, nightBand] {
      layer.fillColor = UIColor.clear.cgColor
      layer.lineWidth = band
      layer.lineCap = .round
      layer.actions = ["path": NSNull(), "strokeColor": NSNull()]
      dial.layer.addSublayer(layer)
    }
    track.strokeColor = UIColor(white: 1, alpha: 0.16).cgColor

    // Every two hours; the four quarters carry am/pm and sit a step brighter.
    for i in 0..<12 {
      let h = i * 2
      let label = UILabel()
      let hour = h % 12 == 0 ? 12 : h % 12
      label.text = h % 6 == 0 ? "\(hour) \(h < 12 ? "am" : "pm")" : "\(hour)"
      label.textAlignment = .center
      label.isAccessibilityElement = false
      dial.addSubview(label)
      numbers.append((Double(h * 60), label))
    }

    lengthLabel.textAlignment = .center
    lengthLabel.font = UIFont.monospacedDigitSystemFont(ofSize: 34, weight: .heavy)
    captionLabel.textAlignment = .center
    for label in [lengthLabel, captionLabel] {
      label.isAccessibilityElement = false
      dial.addSubview(label)
    }

    dial.addSubview(bedKnob)
    dial.addSubview(wakeKnob)
    addSubview(bedColumn)
    addSubview(wakeColumn)

    addGestureRecognizer(press)

    bedElement.accessibilityContainer = self
    wakeElement.accessibilityContainer = self
    bedElement.accessibilityLabel = "Bedtime"
    wakeElement.accessibilityLabel = "Morning start"
    bedElement.onStep = { [weak self] dir in self?.nudge(.bed, by: Double(dir) * Self.snap) }
    wakeElement.onStep = { [weak self] dir in self?.nudge(.wake, by: Double(dir) * Self.snap) }
    accessibilityElements = [bedElement, wakeElement]

    applyColors()
    refreshText()
  }

  deinit {
    link?.invalidate()
  }

  // MARK: Props

  func setTime(_ end: End, _ minutes: Double) {
    let m = Self.wrap(minutes)
    switch end {
    case .bed:
      let first = !hasBed
      hasBed = true
      guard drag == nil, first || m != targetBed else { return }
      targetBed = m
      if first || UIAccessibility.isReduceMotionEnabled { shownBed = m }
    case .wake:
      let first = !hasWake
      hasWake = true
      guard drag == nil, first || m != targetWake else { return }
      targetWake = m
      if first || UIAccessibility.isReduceMotionEnabled { shownWake = m }
    }
    refreshText()
    draw()
    startLink()
  }

  func setCaption(_ text: String) {
    caption = text
    refreshText()
  }

  func setOff(_ value: Bool) {
    off = value
    refreshText()
  }

  func setColors(
    band: UIColor? = nil, track: UIColor? = nil, icon: UIColor? = nil,
    text: UIColor? = nil, text2: UIColor? = nil, text3: UIColor? = nil
  ) {
    if let band { bandColor = band }
    if let track { self.track.strokeColor = track.cgColor }
    if let icon {
      bedKnob.icon.tintColor = icon
      wakeKnob.icon.tintColor = icon
    }
    if let text { textColor = text }
    if let text2 { text2Color = text2 }
    if let text3 { text3Color = text3 }
    applyColors()
  }

  private func applyColors() {
    nightBand.strokeColor = bandColor.cgColor
    bedKnob.disc.backgroundColor = bandColor
    wakeKnob.disc.backgroundColor = bandColor
    for (minutes, label) in numbers {
      let quarter = Int(minutes) % 360 == 0
      label.font = UIFont.monospacedDigitSystemFont(ofSize: 12, weight: quarter ? .semibold : .medium)
      label.textColor = quarter ? text2Color : text3Color
    }
    lengthLabel.textColor = textColor
    bedColumn.tint(text: textColor, title: text2Color)
    wakeColumn.tint(text: textColor, title: text2Color)
    refreshText()
  }

  // MARK: Layout

  private var side: CGFloat { max(0, min(bounds.width, maxDial, bounds.height - rowHeight)) }
  private var centre: CGPoint { CGPoint(x: side / 2, y: side / 2) }
  private var radius: CGFloat { side / 2 - band / 2 }

  override func layoutSubviews() {
    super.layoutSubviews()
    let s = side
    dial.frame = CGRect(x: (bounds.width - s) / 2, y: 0, width: s, height: s)
    track.frame = dial.bounds
    nightBand.frame = dial.bounds
    track.path = UIBezierPath(arcCenter: centre, radius: radius, startAngle: 0, endAngle: .pi * 2, clockwise: true).cgPath

    let inner = radius - band / 2 - 18
    for (minutes, label) in numbers {
      let p = point(minutes, inner)
      label.bounds = CGRect(x: 0, y: 0, width: 48, height: 16)
      label.center = p
    }
    lengthLabel.frame = CGRect(x: 0, y: s / 2 - 28, width: s, height: 40)
    captionLabel.frame = CGRect(x: 0, y: s / 2 + 14, width: s, height: 16)

    bedKnob.bounds = CGRect(x: 0, y: 0, width: band, height: band)
    wakeKnob.bounds = bedKnob.bounds

    let rowY = s + rowGap
    let rowH = rowHeight - rowGap
    let colW = min(140, bounds.width / 2)
    bedColumn.frame = CGRect(x: 0, y: rowY, width: colW, height: rowH)
    wakeColumn.frame = CGRect(x: bounds.width - colW, y: rowY, width: colW, height: rowH)
    draw()
  }

  /** Puts the band and handles where `shownBed` and `shownWake` say. */
  private func draw() {
    guard side > 0 else { return }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    let from = angle(shownBed)
    var to = angle(shownWake)
    let length = Self.span(shownBed, shownWake)
    if length < 0.5 { to = from + 0.0001 } else if to <= from { to += .pi * 2 }
    nightBand.path = UIBezierPath(arcCenter: centre, radius: radius, startAngle: from, endAngle: to, clockwise: true).cgPath
    bedKnob.center = point(shownBed, radius)
    wakeKnob.center = point(shownWake, radius)
    CATransaction.commit()

    bedElement.accessibilityFrameInContainerSpace = dial.convert(bedKnob.frame, to: self).insetBy(dx: -6, dy: -6)
    wakeElement.accessibilityFrameInContainerSpace = dial.convert(wakeKnob.frame, to: self).insetBy(dx: -6, dy: -6)
  }

  /** The labels follow the snapped times, never the in-between drawing. */
  private func refreshText() {
    let night = Self.span(targetBed, targetWake)
    lengthLabel.text = off ? "Off" : Self.length(night)
    captionLabel.attributedText = NSAttributedString(
      string: caption.uppercased(),
      attributes: [
        .font: UIFont.systemFont(ofSize: 11, weight: .semibold),
        .kern: 1.2,
        .foregroundColor: text2Color,
      ])
    bedColumn.time.text = Self.format(targetBed)
    wakeColumn.time.text = Self.format(targetWake)
    bedElement.accessibilityValue = Self.format(targetBed)
    wakeElement.accessibilityValue = Self.format(targetWake)
  }

  // MARK: Geometry

  /** Midnight at the top, clockwise. UIKit's y runs down, so clockwise is a growing angle. */
  private func angle(_ minutes: Double) -> CGFloat {
    CGFloat(Self.wrap(minutes) / Self.day) * .pi * 2 - .pi / 2
  }

  private func point(_ minutes: Double, _ r: CGFloat) -> CGPoint {
    let a = angle(minutes)
    return CGPoint(x: centre.x + r * cos(a), y: centre.y + r * sin(a))
  }

  /** The minute of day under a point in the dial, or nil at the very centre. */
  private func minute(at p: CGPoint) -> Double? {
    let dx = p.x - centre.x
    let dy = p.y - centre.y
    guard hypot(dx, dy) > 12 else { return nil }
    var a = atan2(dy, dx) + .pi / 2
    if a < 0 { a += .pi * 2 }
    return Self.wrap(Double(a / (.pi * 2)) * Self.day)
  }

  private func part(at p: CGPoint) -> Part? {
    let b = point(shownBed, radius)
    let w = point(shownWake, radius)
    let db = hypot(p.x - b.x, p.y - b.y)
    let dw = hypot(p.x - w.x, p.y - w.y)
    if min(db, dw) <= grabRadius { return db <= dw ? .bed : .wake }
    guard let m = minute(at: p), abs(hypot(p.x - centre.x, p.y - centre.y) - radius) <= band / 2 + ringSlop else {
      return nil
    }
    return Self.span(shownBed, m) < Self.span(shownBed, shownWake) ? .night : nil
  }

  // MARK: Dragging

  fileprivate func shouldBegin(_ g: UIGestureRecognizer) -> Bool {
    part(at: g.location(in: dial)) != nil
  }

  @objc private func handlePress(_ g: UILongPressGestureRecognizer) {
    let p = g.location(in: dial)
    switch g.state {
    case .began:
      guard let part = part(at: p), let m = minute(at: p) else { return }
      // Starts from the snapped times; a spring still settling finishes at once.
      shownBed = targetBed
      shownWake = targetWake
      drag = Drag(part: part, startBed: targetBed, startWake: targetWake, at: m, moved: 0)
      stopLink()
      holdScrolls(true)
      selection.prepare()
      grabImpact.impactOccurred(intensity: 0.7)
      lift(part, true)
    case .changed:
      move(to: p)
    case .ended, .cancelled, .failed:
      finish()
    default:
      break
    }
  }

  private func move(to p: CGPoint) {
    guard var d = drag, let m = minute(at: p) else { return }
    d.moved += Self.turn(d.at, m)
    d.at = m
    drag = d

    let startSpan = Self.span(d.startBed, d.startWake)
    // A handle can't pass the other: the night stays between minWindow and a day.
    let clamp = { (s: Double) in min(Self.day - Self.snap, max(self.minWindow, s)) }
    let snapped = { (s: Double) in (s / Self.snap).rounded() * Self.snap }
    var bed: Double, wake: Double
    switch d.part {
    case .bed:
      let s = clamp(startSpan - d.moved)
      shownBed = d.startWake - s
      shownWake = d.startWake
      bed = d.startWake - clamp(snapped(s))
      wake = d.startWake
    case .wake:
      let s = clamp(startSpan + d.moved)
      shownBed = d.startBed
      shownWake = d.startBed + s
      bed = d.startBed
      wake = d.startBed + clamp(snapped(s))
    case .night:
      shownBed = d.startBed + d.moved
      shownWake = d.startWake + d.moved
      bed = d.startBed + snapped(d.moved)
      wake = d.startWake + snapped(d.moved)
    }
    bed = Self.wrap(bed)
    wake = Self.wrap(wake)
    if bed != targetBed || wake != targetWake {
      targetBed = bed
      targetWake = wake
      selection.selectionChanged()
      selection.prepare()
      refreshText()
    }
    draw()
  }

  private func finish() {
    guard let d = drag else { return }
    drag = nil
    holdScrolls(false)
    lift(d.part, false)
    // The drawing springs onto the snapped times from where it was let go.
    if UIAccessibility.isReduceMotionEnabled {
      shownBed = targetBed
      shownWake = targetWake
      draw()
    } else {
      startLink()
    }
    if targetBed != d.startBed || targetWake != d.startWake { send() }
  }

  /** VoiceOver's swipe up and down: a quarter hour each way. */
  private func nudge(_ end: End, by: Double) {
    let s = Self.span(targetBed, targetWake) + (end == .bed ? -by : by)
    guard s >= minWindow, s <= Self.day - Self.snap else { return }
    if end == .bed { targetBed = Self.wrap(targetBed + by) } else { targetWake = Self.wrap(targetWake + by) }
    selection.selectionChanged()
    refreshText()
    startLink()
    send()
  }

  private func send() {
    onTimesChange(["bedtime": Int(targetBed), "morningStart": Int(targetWake)])
  }

  /** The held handle (both, for the whole night) rises a little under the finger. */
  private func lift(_ part: Part, _ up: Bool) {
    let knobs: [Knob] = part == .bed ? [bedKnob] : part == .wake ? [wakeKnob] : [bedKnob, wakeKnob]
    if up, let top = knobs.last { dial.bringSubviewToFront(top) }
    guard !UIAccessibility.isReduceMotionEnabled else { return }
    let animator = UIViewPropertyAnimator(duration: up ? 0.3 : 0.45, dampingRatio: up ? 0.8 : 0.65) {
      for knob in knobs { knob.disc.transform = up ? CGAffineTransform(scaleX: 1.14, y: 1.14) : .identity }
    }
    animator.isUserInteractionEnabled = true
    animator.startAnimation()
  }

  /** Stops any scroll views around the dial for the length of the drag. */
  private func holdScrolls(_ hold: Bool) {
    if hold {
      var v = superview
      while let view = v {
        if let scroll = view as? UIScrollView, scroll.isScrollEnabled {
          scroll.isScrollEnabled = false
          heldScrolls.append(scroll)
        }
        v = view.superview
      }
    } else {
      for scroll in heldScrolls { scroll.isScrollEnabled = true }
      heldScrolls = []
    }
  }

  // MARK: Springs

  private func startLink() {
    guard link == nil, window != nil else {
      if window == nil { shownBed = targetBed; shownWake = targetWake; draw() }
      return
    }
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

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { stopLink() }
  }

  fileprivate func step() {
    let now = CACurrentMediaTime()
    let dt = min(now - lastTick, 1.0 / 30)
    lastTick = now
    // A critically damped ease: quick off the finger, settling without overshoot.
    let k = 1 - exp(-dt * 18)
    // The target as it sits nearest the drawing, so the band runs the short way across midnight.
    let goalBed = shownBed + Self.turn(shownBed, targetBed)
    let goalWake = shownWake + Self.turn(shownWake, targetWake)
    shownBed += (goalBed - shownBed) * k
    shownWake += (goalWake - shownWake) * k
    if abs(goalBed - shownBed) < 0.05 && abs(goalWake - shownWake) < 0.05 {
      shownBed = targetBed
      shownWake = targetWake
      stopLink()
    }
    draw()
  }

  // MARK: Minutes

  static func wrap(_ m: Double) -> Double {
    let r = m.truncatingRemainder(dividingBy: day)
    return r < 0 ? r + day : r
  }

  /** Minutes from `a` forward to `b`. */
  static func span(_ a: Double, _ b: Double) -> Double { wrap(b - a) }

  /** The shortest signed way round from `a` to `b`, in minutes. */
  static func turn(_ a: Double, _ b: Double) -> Double { wrap(b - a + day / 2) - day / 2 }

  /** "10 pm", "6:30 am": the same as `formatPreset` in JS. */
  static func format(_ minutes: Double) -> String {
    let m = Int(wrap(minutes).rounded())
    let h = m / 60
    let mins = m % 60
    let hour = h % 12 == 0 ? 12 : h % 12
    let time = mins == 0 ? "\(hour)" : String(format: "%d:%02d", hour, mins)
    return "\(time) \(h < 12 ? "am" : "pm")"
  }

  /** "8 hrs", "7½ hrs", "45 min". */
  static func length(_ minutes: Double) -> String {
    let m = Int(minutes.rounded())
    if m < 60 { return "\(m) min" }
    let whole = m / 60
    let half = m % 60 >= 30 ? "½" : ""
    return "\(whole)\(half) \(whole == 1 && half.isEmpty ? "hr" : "hrs")"
  }
}

/** A handle: the band-coloured disc with its symbol, and a soft neutral shadow to lift it off the band. */
private final class Knob: UIView {
  let disc = UIView()
  let icon = UIImageView()

  init(symbol: String) {
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    disc.layer.shadowColor = UIColor.black.cgColor
    disc.layer.shadowOpacity = 0.22
    disc.layer.shadowRadius = 3
    disc.layer.shadowOffset = CGSize(width: 0, height: 1)
    addSubview(disc)
    icon.image = UIImage(systemName: symbol)
    icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 15, weight: .semibold)
    icon.contentMode = .center
    disc.addSubview(icon)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layoutSubviews() {
    super.layoutSubviews()
    let t = disc.transform
    disc.transform = .identity
    disc.frame = bounds
    disc.layer.cornerRadius = bounds.width / 2
    disc.layer.shadowPath = UIBezierPath(ovalIn: bounds).cgPath
    disc.transform = t
    icon.frame = disc.bounds
  }
}

/** A time under the dial: its symbol, the time, and what it is. */
private final class TimeColumn: UIView {
  let icon = UIImageView()
  let time = UILabel()
  let title = UILabel()

  init(symbol: String, title text: String) {
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    isAccessibilityElement = false
    icon.image = UIImage(systemName: symbol)
    icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 20, weight: .medium)
    icon.contentMode = .center
    time.font = UIFont.monospacedDigitSystemFont(ofSize: 24, weight: .bold)
    time.textAlignment = .center
    time.adjustsFontSizeToFitWidth = true
    time.minimumScaleFactor = 0.7
    title.font = UIFont.systemFont(ofSize: 13, weight: .medium)
    title.textAlignment = .center
    title.text = text
    for v in [icon, time, title] as [UIView] { addSubview(v) }
  }

  required init?(coder: NSCoder) { fatalError() }

  func tint(text: UIColor, title color: UIColor) {
    icon.tintColor = text
    time.textColor = text
    title.textColor = color
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let w = bounds.width
    icon.frame = CGRect(x: 0, y: 0, width: w, height: 24)
    time.frame = CGRect(x: 0, y: 28, width: w, height: 30)
    title.frame = CGRect(x: 0, y: 58, width: w, height: 18)
  }
}

/** A handle as VoiceOver sees it: adjustable, a quarter hour per swipe. */
private final class KnobElement: UIAccessibilityElement {
  var onStep: ((Int) -> Void)?

  override init(accessibilityContainer container: Any) {
    super.init(accessibilityContainer: container)
    accessibilityTraits = .adjustable
    accessibilityHint = "Swipe up or down to move it by 15 minutes."
  }

  override func accessibilityIncrement() { onStep?(1) }
  override func accessibilityDecrement() { onStep?(-1) }
}

/** The press's delegate, kept off the view so it never clashes with what ExpoView adopts. */
private final class PressDelegate: NSObject, UIGestureRecognizerDelegate {
  weak var view: NightDialView?
  init(_ view: NightDialView) { self.view = view }

  func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
    view?.shouldBegin(g) ?? false
  }

  /** A scroll view waits to see whether the touch is ours, so the page doesn't move under the drag. */
  func gestureRecognizer(_ g: UIGestureRecognizer, shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
    other.view is UIScrollView
  }
}

/** The display link holds its target strongly; this keeps it from holding the view. */
private final class WeakTarget: NSObject {
  weak var view: NightDialView?
  init(_ view: NightDialView) { self.view = view }
  @objc func step() { view?.step() }
}
