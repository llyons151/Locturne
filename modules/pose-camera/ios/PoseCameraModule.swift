import AVFoundation
import CoreImage
import ExpoModulesCore
import UIKit
import Vision

/**
 Push-ups (GAME_PLAN, "Wake-up methods"; camera version 2026-10-10): the phone stands on the
 floor side-on to you and the front camera watches. Apple's Vision finds the body's joints on
 the phone, every frame read and dropped: nothing recorded, saved or sent. This only reports
 the joints; what counts as a rep is in src/lib/wake/pushups.ts.

 Loc also says the count out loud (the system voice, on the phone), since you're looking at
 the floor, not the screen.
 */
public class PoseCameraModule: Module {
  private let speaker = Speaker()

  public func definition() -> ModuleDefinition {
    Name("PoseCamera")

    /// Says a short line out loud, over whatever else is playing, which dips meanwhile.
    AsyncFunction("say") { (text: String) in
      self.speaker.say(text)
    }.runOnQueue(.main)

    AsyncFunction("hush") {
      self.speaker.hush()
    }.runOnQueue(.main)

    /// `authorized`, `notDetermined`, `denied` or `restricted` (Screen Time or a profile, which
    /// Settings can't turn on): expo-camera reports the last two alike.
    Function("cameraAccess") { () -> String in
      switch AVCaptureDevice.authorizationStatus(for: .video) {
      case .authorized: return "authorized"
      case .notDetermined: return "notDetermined"
      case .restricted: return "restricted"
      default: return "denied"
      }
    }

    OnDestroy {
      DispatchQueue.main.async {
        self.speaker.hush()
      }
    }

    View(PoseCameraView.self) {
      Events("onPose", "onCameraError")

      /// The camera runs only while true (and the view is on screen).
      Prop("active") { (view: PoseCameraView, active: Bool) in
        view.setActive(active)
      }

      /// Which way the phone stands (src/lib/wake/phone-hint.ts): `portrait`, `landscapeLeft`
      /// (turned anticlockwise, right edge up) or `landscapeRight`. The app stays portrait; the
      /// screen turns its own contents, and the joints come back in that turned screen's points.
      Prop("turn") { (view: PoseCameraView, turn: String?) in
        view.setTurn(turn ?? "portrait")
      }

      /// The accelerometer says the phone is upright right now (not a preview's pretend turn):
      /// when the camera's upright angle can be learned, before iOS 27.
      Prop("upright") { (view: PoseCameraView, upright: Bool?) in
        view.setHeldUpright(upright ?? false)
      }
    }
  }
}

/**
 The live preview, filling the view (aspect fill, mirrored like a selfie), with the joints
 reported in the view's own points so they line up with the picture: `onPose` sends
 `{ at, joints: { leftShoulder: { x, y, c }, … } }`, with no joints when nobody's there.
 */
final class PoseCameraView: ExpoView {
  let onPose = EventDispatcher()
  let onCameraError = EventDispatcher()

  private let reader = PoseReader()
  private var wantsActive = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    clipsToBounds = true
    layer.addSublayer(reader.previewLayer)
    reader.onPose = { [weak self] pose in self?.onPose(pose) }
    reader.onError = { [weak self] reason in self?.onCameraError(["reason": reason]) }
  }

  func setActive(_ active: Bool) {
    wantsActive = active
    update()
  }

  func setTurn(_ turn: String) {
    reader.setTurn(turn)
  }

  func setHeldUpright(_ upright: Bool) {
    reader.setHeldUpright(upright)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    update()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    reader.previewLayer.frame = bounds
    CATransaction.commit()
    reader.setViewSize(bounds.size)
  }

  private func update() {
    reader.setRunning(wantsActive && window != nil)
  }

  deinit {
    reader.setRunning(false)
  }
}

/**
 The capture session and the pose reading, off the main thread: the session is set up and
 started on its own queue, frames arrive on another, and results go back to the main thread.
 A plain NSObject rather than part of the view, so none of it is tied to the main actor.
 */
final class PoseReader: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  let previewLayer: AVCaptureVideoPreviewLayer
  var onPose: (([String: Any]) -> Void)?
  var onError: ((String) -> Void)?

  private let session = AVCaptureSession()
  private let sessionQueue = DispatchQueue(label: "com.lukelyons.locturne.pose.session")
  private let videoQueue = DispatchQueue(label: "com.lukelyons.locturne.pose.video")
  /// The camera and the frames' output, kept for turning the picture (on `sessionQueue`).
  private var camera: AVCaptureDevice?
  private var output: AVCaptureVideoDataOutput?
  /// The angle that stands the front camera's picture up with the phone upright: 90 on most
  /// iPhones, 0 on iPhone 17's (its front sensor sits a quarter turn round). Both the preview and
  /// the frames for Vision stay at it the whole time, whichever way the phone is turned: the app
  /// is portrait and the screen is a window onto the room. On `sessionQueue`.
  private var portraitAngle: CGFloat = PoseReader.savedPortraitAngle ?? 90
  /// AVCaptureDevice.RotationCoordinator, iOS 17 on (main thread).
  private var coordinator: AnyObject?
  private var coordinatorWatch: NSKeyValueObservation?
  /// The accelerometer says the phone is held upright right now (main thread). Before iOS 27 the
  /// upright angle is only learned then: see `learnPortraitAngle`.
  private var heldUpright = false
  private var pendingLearn: DispatchWorkItem?
  /// The frames come out stood up by the connection (iOS 17 on), under `lock`. Before, they're
  /// in the sensor's own orientation and turned here with Apple's older front-camera table.
  private var framesUpright = false
  /// Which extra quarter turn Vision reads the picture at, past the phone's own, and the frame
  /// count, on `videoQueue`.
  private var reading = 0
  private var frameCount = 0
  /// Set up once, on `sessionQueue`.
  private var configured = false
  /// The last frame read, on `videoQueue`.
  private var lastRead: CFTimeInterval = 0
  /// The view's size, written on main and read on `videoQueue`.
  private var viewSize: CGSize = .zero
  /// Which way the phone stands, written on main and read on `videoQueue`, under `lock`.
  private var turn = "portrait"
  private let lock = NSLock()

  /// The upright angle learned on an earlier run, for a run that starts with the phone already
  /// on its side. Only ever one phone, so one value.
  private static let savedKey = "poseCamera.portraitAngle"
  private static var savedPortraitAngle: CGFloat? {
    guard let saved = UserDefaults.standard.object(forKey: savedKey) as? Double else { return nil }
    return CGFloat(saved)
  }

  /// About fifteen readings a second is plenty for push-ups and keeps the phone cool. Just under
  /// two of the camera's 30 fps frames: exactly 1/15 s missed every other pair by a hair of
  /// timing jitter and read every third frame, about 10 a second.
  private static let readInterval: CFTimeInterval = 0.06

  private static let joints: [(VNHumanBodyPoseObservation.JointName, String)] = [
    (.nose, "nose"),
    (.leftShoulder, "leftShoulder"),
    (.rightShoulder, "rightShoulder"),
    (.leftElbow, "leftElbow"),
    (.rightElbow, "rightElbow"),
    (.leftWrist, "leftWrist"),
    (.rightWrist, "rightWrist"),
    (.leftHip, "leftHip"),
    (.rightHip, "rightHip"),
    (.leftKnee, "leftKnee"),
    (.rightKnee, "rightKnee"),
    (.leftAnkle, "leftAnkle"),
    (.rightAnkle, "rightAnkle"),
  ]

  private var runtimeObserver: NSObjectProtocol?
  /// Whether the view wants the camera running (active and on screen), on `sessionQueue`.
  private var wanted = false
  /// A frame has arrived since the camera last (re)started, under `lock`. A runtime error
  /// restarts the camera once; a second one before any frame came through gives up.
  private var framesFlowing = true

  override init() {
    previewLayer = AVCaptureVideoPreviewLayer(session: session)
    previewLayer.videoGravity = .resizeAspectFill
    super.init()
    // A media-services reset or similar freezes the session; start it again once, and if that
    // fails too, say so (the screen offers Try again and Walk instead). Calls and the background
    // are interruptions, which the session recovers from by itself.
    runtimeObserver = NotificationCenter.default.addObserver(
      forName: AVCaptureSession.runtimeErrorNotification, object: session, queue: nil
    ) { [weak self] _ in
      guard let self else { return }
      self.sessionQueue.async {
        // Stopped meanwhile (closed, or off screen): leave it stopped.
        guard self.wanted, self.configured else { return }
        if !self.takeFramesFlowing() { return self.report("noCamera") }
        self.session.startRunning()
      }
    }
  }

  deinit {
    if let runtimeObserver { NotificationCenter.default.removeObserver(runtimeObserver) }
    if coordinator != nil {
      DispatchQueue.main.async { UIDevice.current.endGeneratingDeviceOrientationNotifications() }
    }
  }

  func setViewSize(_ size: CGSize) {
    lock.lock()
    viewSize = size
    lock.unlock()
  }

  /// Only what Vision reads and where the joints go change with the turn; the camera itself
  /// stays as it is. Turning the camera's connection mid-run made the picture jump.
  func setTurn(_ next: String) {
    lock.lock()
    turn = next
    lock.unlock()
  }

  /// Main thread.
  func setHeldUpright(_ upright: Bool) {
    heldUpright = upright
    if upright { scheduleLearn() }
  }

  private func currentView() -> (CGSize, String) {
    lock.lock()
    defer { lock.unlock() }
    return (viewSize, turn)
  }

  /// Whether frames came through since the last (re)start, and starts watching again.
  private func takeFramesFlowing() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    let flowing = framesFlowing
    framesFlowing = false
    return flowing
  }

  private func sawFrame() {
    lock.lock()
    framesFlowing = true
    lock.unlock()
  }

  /// Held strongly until it's done, so a view going away still stops the camera.
  func setRunning(_ running: Bool) {
    sessionQueue.async { [self] in
      wanted = running
      if running {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: break
        case .restricted: return report("restricted")
        default: return report("denied")
        }
        if !configured {
          if let reason = configure() { return report(reason) }
          configured = true
          applyAngles()
          let device = camera
          DispatchQueue.main.async { self.watchRotation(device) }
        }
        // A fresh start earns a restart of its own if a runtime error stops it.
        sawFrame()
        if !session.isRunning { session.startRunning() }
      } else if session.isRunning {
        session.stopRunning()
      }
    }
  }

  private func report(_ reason: String) {
    DispatchQueue.main.async { [weak self] in self?.onError?(reason) }
  }

  /// On `sessionQueue`. Returns why it couldn't, or nil.
  private func configure() -> String? {
    session.beginConfiguration()
    defer { session.commitConfiguration() }
    if session.canSetSessionPreset(.hd1280x720) { session.sessionPreset = .hd1280x720 }
    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
      let input = try? AVCaptureDeviceInput(device: device),
      session.canAddInput(input)
    else { return "noCamera" }
    session.addInput(input)

    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
    output.setSampleBufferDelegate(self, queue: videoQueue)
    guard session.canAddOutput(output) else { return "noCamera" }
    session.addOutput(output)
    camera = device
    self.output = output
    return nil
  }

  /**
   Learns which way this phone's front sensor sits, from Apple's rotation coordinator (iOS 17 on).
   A table of fixed angles was wrong on iPhone 17 (Apple, developer forums 813548 and 801689).
   Main thread.
   */
  private func watchRotation(_ camera: AVCaptureDevice?) {
    guard #available(iOS 17.0, *) else {
      portrait(previewLayer.connection)
      return
    }
    guard coordinator == nil, let camera else { return }
    UIDevice.current.beginGeneratingDeviceOrientationNotifications()
    let watched = AVCaptureDevice.RotationCoordinator(device: camera, previewLayer: previewLayer)
    coordinator = watched
    // iOS 27 says it outright, whichever way the phone is held.
    if let upright = Self.angleForPortrait(watched) {
      return settle(upright, save: false)
    }
    coordinatorWatch = watched.observe(\.videoRotationAngleForHorizonLevelCapture, options: [.initial, .new]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.scheduleLearn() }
    }
  }

  /**
   Before iOS 27 the coordinator only gives the angle for the phone as it's held right now: the
   sensor's own turn plus the phone's. With the phone upright that's the upright angle itself.
   It used to take the phone's turn off using UIDevice's orientation, but with rotation lock on
   that stays portrait while the coordinator follows gravity, so a phone on its side learned an
   upright a quarter turn out and the picture went sideways (user, 2026-10-18). So it's only
   learned while the accelerometer says upright, a beat after the last change, when both have
   settled; and kept for next time. Main thread.
   */
  private func scheduleLearn() {
    pendingLearn?.cancel()
    let work = DispatchWorkItem { [weak self] in self?.learnPortraitAngle() }
    pendingLearn = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0, execute: work)
  }

  private func learnPortraitAngle() {
    guard #available(iOS 17.0, *), heldUpright, let watched = coordinator as? AVCaptureDevice.RotationCoordinator else { return }
    settle(watched.videoRotationAngleForHorizonLevelCapture, save: true)
  }

  /// Main thread. Whole quarter turns only.
  private func settle(_ angle: CGFloat, save: Bool) {
    let upright = ((angle / 90).rounded() * 90 + 360).truncatingRemainder(dividingBy: 360)
    if save { UserDefaults.standard.set(Double(upright), forKey: Self.savedKey) }
    sessionQueue.async { [self] in
      guard upright != portraitAngle else { return }
      portraitAngle = upright
      applyAngles()
    }
  }

  /// `videoRotationAngleRelative(toDeviceOrientation: .portrait)`, new in iOS 27: a fixed angle
  /// that doesn't follow the phone. Looked up by name, as the build's SDK may predate it.
  @available(iOS 17.0, *)
  private static func angleForPortrait(_ coordinator: AVCaptureDevice.RotationCoordinator) -> CGFloat? {
    let selector = NSSelectorFromString("videoRotationAngleRelativeToDeviceOrientation:")
    guard coordinator.responds(to: selector) else { return nil }
    typealias Call = @convention(c) (AnyObject, Selector, Int) -> CGFloat
    let call = unsafeBitCast(coordinator.method(for: selector), to: Call.self)
    return call(coordinator, selector, AVCaptureVideoOrientation.portrait.rawValue)
  }

  /**
   On `sessionQueue`. The preview and the frames both stay at the upright angle, so the frames are
   the picture as the screen shows it; captureOutput turns them for Vision to the phone's turn.
   */
  private func applyAngles() {
    guard #available(iOS 17.0, *) else { return }
    let angle = portraitAngle
    var upright = false
    if let connection = output?.connection(with: .video), connection.isVideoRotationAngleSupported(angle) {
      if connection.videoRotationAngle != angle { connection.videoRotationAngle = angle }
      // Unmirrored, so the one mirror (in captureOutput, to match the preview) is the only one.
      if connection.isVideoMirroringSupported {
        connection.automaticallyAdjustsVideoMirroring = false
        connection.isVideoMirrored = false
      }
      upright = true
    }
    lock.lock()
    framesUpright = upright
    lock.unlock()
    DispatchQueue.main.async { [weak self] in
      guard let connection = self?.previewLayer.connection, connection.isVideoRotationAngleSupported(angle) else { return }
      if connection.videoRotationAngle != angle { connection.videoRotationAngle = angle }
    }
  }

  /// Before iOS 17: the preview upright the old way.
  private func portrait(_ connection: AVCaptureConnection?) {
    guard let connection, connection.isVideoOrientationSupported else { return }
    connection.videoOrientation = .portrait
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    let now = CACurrentMediaTime()
    guard now - lastRead >= Self.readInterval else { return }
    lastRead = now
    guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    sawFrame()

    let (view, turn) = currentView()
    lock.lock()
    let standing = framesUpright
    lock.unlock()

    // The picture as the screen shows it with the phone upright, mirrored like the preview, in
    // Core Image's space (origin bottom-left, like Vision's points).
    var picture = CIImage(cvPixelBuffer: pixels)
    if standing {
      picture = picture.transformed(by: CGAffineTransform(scaleX: -1, y: 1).translatedBy(x: -picture.extent.width, y: 0))
    } else {
      // Apple's older table for the front camera (its VisionFaceTrack sample).
      picture = picture.oriented(.leftMirrored)
    }
    picture = picture.atOrigin()

    // On its side, the room in the picture lies a quarter turn round: turned back, the way you see
    // the screen's contents. A plank then lies across it, and Vision reads bodies that stand
    // (Apple, WWDC20 "Detect Body and Hand Pose with Vision": bent-over bodies don't read as
    // well). So it also reads it a quarter turn either way, where the plank stands head up, and
    // keeps whichever finds more of the arm and torso. The points are turned back before they're used.
    // Right edge up (landscapeLeft), the room's up is at the picture's right, so it turns anticlockwise.
    let phone = turn == "landscapeLeft" ? 3 : turn == "landscapeRight" ? 1 : 0
    frameCount += 1
    var best = read(picture, quarters: phone + reading)
    let struggling = best.score < 2.4
    if struggling || frameCount % 6 == 0 {
      let others = [0, 1, 3].filter { $0 != reading }
      let tries = struggling ? others : [others[(frameCount / 6) % others.count]]
      for other in tries {
        let found = read(picture, quarters: phone + other)
        if found.score > best.score + 0.3 {
          best = found
          reading = other
        }
      }
    }

    // The picture fills the view (aspect fill), so scale up and centre, as the preview does.
    let width = picture.extent.width
    let height = picture.extent.height
    let scale = max(view.width / width, view.height / height)
    let dx = (view.width - width * scale) / 2
    let dy = (view.height - height * scale) / 2

    var joints: [String: [String: Double]] = [:]
    for (key, point) in best.points {
      // Vision's origin is bottom-left, 0–1; the view's is top-left, in points.
      let x = point.x * width * scale + dx
      let y = (1 - point.y) * height * scale + dy
      // On its side the screen's contents are turned to stand up with the phone (pushups-view.tsx),
      // so the joints go in that turned box: as wide as the view is tall.
      let at: CGPoint
      switch turn {
      case "landscapeLeft": at = CGPoint(x: y, y: view.width - x)
      case "landscapeRight": at = CGPoint(x: view.height - y, y: x)
      default: at = CGPoint(x: x, y: y)
      }
      joints[key] = ["x": Double(at.x), "y": Double(at.y), "c": point.c]
    }
    // `info` is for the wake lab's tuning readout: what the camera handed over and how it was read.
    let info: [String: Any] = ["w": Double(width), "h": Double(height), "read": QuarterTurn.name(best.quarters - phone), "upright": standing, "score": best.score]
    let pose: [String: Any] = ["at": Date().timeIntervalSince1970 * 1000, "joints": joints, "info": info]
    DispatchQueue.main.async { [weak self] in self?.onPose?(pose) }
  }
}

extension PoseReader {
  /// One reading: the joints found (in the picture's 0–1 space, origin bottom-left) and how much of
  /// the best side's arm and torso it found, the sum of four confidences.
  struct Reading {
    let quarters: Int
    let points: [(String, (x: CGFloat, y: CGFloat, c: Double))]
    let score: Double
  }

  private static let sides: [[VNHumanBodyPoseObservation.JointName]] = [
    [.leftShoulder, .leftElbow, .leftWrist, .leftHip],
    [.rightShoulder, .rightElbow, .rightWrist, .rightHip],
  ]

  /// Reads the picture turned `quarters` quarter turns clockwise.
  func read(_ picture: CIImage, quarters: Int) -> Reading {
    let turn = QuarterTurn(quarters)
    let request = VNDetectHumanBodyPoseRequest()
    let handler = VNImageRequestHandler(ciImage: turn.apply(to: picture), options: [:])
    guard (try? handler.perform([request])) != nil,
      let body = request.results?.max(by: { $0.confidence < $1.confidence }),
      let found = try? body.recognizedPoints(.all)
    else { return Reading(quarters: turn.quarters, points: [], score: 0) }
    var score = 0.0
    for side in Self.sides {
      var sum = 0.0
      for name in side {
        if let point = found[name], point.confidence > 0.1 { sum += Double(point.confidence) }
      }
      score = max(score, sum)
    }
    var points: [(String, (x: CGFloat, y: CGFloat, c: Double))] = []
    for (name, key) in Self.joints {
      guard let point = found[name], point.confidence > 0.1 else { continue }
      let back = turn.unturn(point.location)
      points.append((key, (back.x, back.y, Double(point.confidence))))
    }
    return Reading(quarters: turn.quarters, points: points, score: score)
  }
}

/// Some quarter turns clockwise of the picture before Vision reads it, and back for the points it finds.
struct QuarterTurn {
  /// 0–3.
  let quarters: Int

  init(_ quarters: Int) {
    self.quarters = ((quarters % 4) + 4) % 4
  }

  /// For the wake lab's readout: the extra turn past the phone's own.
  static func name(_ extra: Int) -> String {
    switch QuarterTurn(extra).quarters {
    case 0: return "as is"
    case 1: return "turned cw"
    case 3: return "turned acw"
    default: return "upside down"
    }
  }

  /// Core Image's y points up, so a negative angle turns clockwise.
  func apply(to picture: CIImage) -> CIImage {
    guard quarters != 0 else { return picture }
    return picture.transformed(by: CGAffineTransform(rotationAngle: -CGFloat(quarters) * .pi / 2)).atOrigin()
  }

  /// A point Vision found in the turned picture (0–1, origin bottom-left), in the picture as it was.
  func unturn(_ p: CGPoint) -> CGPoint {
    switch quarters {
    // Turned clockwise, the picture's (x, y) went to (y, 1 − x).
    case 1: return CGPoint(x: 1 - p.y, y: p.x)
    case 2: return CGPoint(x: 1 - p.x, y: 1 - p.y)
    // Turned anticlockwise, (x, y) went to (1 − y, x).
    case 3: return CGPoint(x: p.y, y: 1 - p.x)
    default: return p
    }
  }
}

private extension CIImage {
  /// The same image with its extent moved to start at (0, 0).
  func atOrigin() -> CIImage {
    transformed(by: CGAffineTransform(translationX: -extent.minX, y: -extent.minY))
  }
}

/**
 The spoken count. It takes the audio session only while talking, and hands it back (and lets
 any music come back up) once the last line is said.
 */
final class Speaker: NSObject, AVSpeechSynthesizerDelegate {
  private let voice = AVSpeechSynthesizer()
  private var prior: (AVAudioSession.Category, AVAudioSession.Mode, AVAudioSession.CategoryOptions)?

  override init() {
    super.init()
    voice.delegate = self
  }

  func say(_ text: String) {
    let session = AVAudioSession.sharedInstance()
    if prior == nil {
      prior = (session.category, session.mode, session.categoryOptions)
      // Playback, so the count is heard with the ring switch on silent: you're looking at the
      // floor, and this is how you know a rep counted.
      try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers, .mixWithOthers])
      try? session.setActive(true)
    }
    // A new rep cuts the last number off rather than queueing behind it.
    voice.stopSpeaking(at: .immediate)
    let utterance = AVSpeechUtterance(string: text)
    utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 1.05
    voice.speak(utterance)
  }

  func hush() {
    voice.stopSpeaking(at: .immediate)
    restore()
  }

  /// Not always called on the main thread, where `say` and `hush` run; hop there first.
  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    DispatchQueue.main.async {
      if !self.voice.isSpeaking { self.restore() }
    }
  }

  /// Hands the audio back: deactivate (which lets music come back up), then the old category.
  /// Deactivating while the voice's audio is still draining fails as "busy", so it waits a beat
  /// and tries again a few times, and only puts the category back once it has let go.
  private func restore(attempt: Int = 0) {
    guard prior != nil else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
      guard let (category, mode, options) = self.prior, !self.voice.isSpeaking else { return }
      let session = AVAudioSession.sharedInstance()
      do {
        try session.setActive(false, options: .notifyOthersOnDeactivation)
        try? session.setCategory(category, mode: mode, options: options)
        self.prior = nil
      } catch {
        if attempt < 4 { self.restore(attempt: attempt + 1) }
      }
    }
  }
}
