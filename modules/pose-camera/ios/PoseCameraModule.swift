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
  /// iPhones, 0 on iPhone 17's (its front sensor sits a quarter turn round). Learned from Apple's
  /// rotation coordinator, on `sessionQueue`.
  private var portraitAngle: CGFloat = 90
  /// AVCaptureDevice.RotationCoordinator, iOS 17 on (main thread).
  private var coordinator: AnyObject?
  private var coordinatorWatch: NSKeyValueObservation?
  /// The frames come out stood up by the connection (iOS 17 on), under `lock`. Before, they're
  /// in the sensor's own orientation and turned here with Apple's older front-camera table.
  private var framesUpright = false
  /// Which extra quarter turn Vision reads the picture at, and the frame count, on `videoQueue`.
  private var reading: QuarterTurn = .none
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

  func setTurn(_ next: String) {
    lock.lock()
    turn = next
    lock.unlock()
    sessionQueue.async { [self] in
      if configured { applyAngles() }
    }
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
   Learns which way this phone's front sensor sits from Apple's rotation coordinator (iOS 17 on):
   its capture angle is the sensor's own turn plus the phone's, so the phone's turn taken off
   leaves the angle for upright. A table of fixed angles was wrong on iPhone 17 (Apple, developer
   forums 813548 and 801689). Main thread.
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
    coordinatorWatch = watched.observe(\.videoRotationAngleForHorizonLevelCapture, options: [.initial, .new]) { [weak self] c, _ in
      let angle = c.videoRotationAngleForHorizonLevelCapture
      DispatchQueue.main.async { self?.learnPortraitAngle(fromCapture: angle) }
    }
  }

  /// Main thread: the phone's own turn is read here, where UIDevice lives.
  private func learnPortraitAngle(fromCapture capture: CGFloat) {
    let phone: [UIDeviceOrientation: CGFloat] = [.portrait: 0, .landscapeLeft: 90, .portraitUpsideDown: 180, .landscapeRight: 270]
    guard let offset = phone[UIDevice.current.orientation] else { return }
    // Whole quarter turns only.
    let upright = (((capture - offset) / 90).rounded() * 90 + 360).truncatingRemainder(dividingBy: 360)
    sessionQueue.async { [self] in
      guard upright != portraitAngle else { return }
      portraitAngle = upright
      applyAngles()
    }
  }

  /**
   On `sessionQueue`. The preview stays at the upright angle: the app is portrait and the screen is
   a window onto the room. The frames for Vision are turned to stand up with the phone as it
   stands (`turn`), so a person reads the right way up whichever way it's leaning.
   */
  private func applyAngles() {
    guard #available(iOS 17.0, *) else { return }
    let (_, turn) = currentView()
    let extra: CGFloat = turn == "landscapeLeft" ? 90 : turn == "landscapeRight" ? 270 : 0
    let capture = (portraitAngle + extra).truncatingRemainder(dividingBy: 360)
    var upright = false
    if let connection = output?.connection(with: .video), connection.isVideoRotationAngleSupported(capture) {
      if connection.videoRotationAngle != capture { connection.videoRotationAngle = capture }
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
    let preview = portraitAngle
    DispatchQueue.main.async { [weak self] in
      guard let connection = self?.previewLayer.connection, connection.isVideoRotationAngleSupported(preview) else { return }
      if connection.videoRotationAngle != preview { connection.videoRotationAngle = preview }
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
    let side = turn == "landscapeLeft" || turn == "landscapeRight"
    lock.lock()
    let standing = framesUpright
    lock.unlock()

    // The picture as you see it on the turned phone, mirrored like the preview, in Core Image's
    // space (origin bottom-left, like Vision's points).
    var picture = CIImage(cvPixelBuffer: pixels)
    if standing {
      picture = picture.transformed(by: CGAffineTransform(scaleX: -1, y: 1).translatedBy(x: -picture.extent.width, y: 0))
    } else {
      // Apple's older table for the front camera (its VisionFaceTrack sample).
      picture = picture.oriented(turn == "landscapeLeft" ? .downMirrored : turn == "landscapeRight" ? .upMirrored : .leftMirrored)
    }
    picture = picture.atOrigin()

    // A plank lies across the picture, and Vision reads bodies that stand (Apple, WWDC20 "Detect
    // Body and Hand Pose with Vision": bent-over bodies don't read as well). So it also reads the
    // picture a quarter turn either way, where the plank stands head up, and keeps whichever finds
    // more of the arm and torso. The points are turned back before they're used.
    frameCount += 1
    var best = read(picture, reading)
    let struggling = best.score < 2.4
    if struggling || frameCount % 6 == 0 {
      let others = QuarterTurn.allCases.filter { $0 != reading }
      let tries = struggling ? others : [others[(frameCount / 6) % others.count]]
      for other in tries {
        let found = read(picture, other)
        if found.score > best.score + 0.3 {
          best = found
          reading = other
        }
      }
    }

    // The picture fills the view (aspect fill), so scale up and centre, as the preview does. On
    // its side the screen turns too, so the box the joints go in is the view with its sides swapped.
    let width = picture.extent.width
    let height = picture.extent.height
    let size = side ? CGSize(width: view.height, height: view.width) : view
    let scale = max(size.width / width, size.height / height)
    let dx = (size.width - width * scale) / 2
    let dy = (size.height - height * scale) / 2

    var joints: [String: [String: Double]] = [:]
    for (key, point) in best.points {
      // Vision's origin is bottom-left, 0–1; the view's is top-left, in points.
      let x = point.x * width * scale + dx
      let y = (1 - point.y) * height * scale + dy
      joints[key] = ["x": Double(x), "y": Double(y), "c": point.c]
    }
    // `info` is for the wake lab's tuning readout: what the camera handed over and how it was read.
    let info: [String: Any] = ["w": Double(width), "h": Double(height), "read": best.turn.name, "upright": standing, "score": best.score]
    let pose: [String: Any] = ["at": Date().timeIntervalSince1970 * 1000, "joints": joints, "info": info]
    DispatchQueue.main.async { [weak self] in self?.onPose?(pose) }
  }
}

extension PoseReader {
  /// One reading: the joints found (in the picture's 0–1 space, origin bottom-left) and how much of
  /// the best side's arm and torso it found, the sum of four confidences.
  struct Reading {
    let turn: QuarterTurn
    let points: [(String, (x: CGFloat, y: CGFloat, c: Double))]
    let score: Double
  }

  private static let sides: [[VNHumanBodyPoseObservation.JointName]] = [
    [.leftShoulder, .leftElbow, .leftWrist, .leftHip],
    [.rightShoulder, .rightElbow, .rightWrist, .rightHip],
  ]

  func read(_ picture: CIImage, _ turn: QuarterTurn) -> Reading {
    let request = VNDetectHumanBodyPoseRequest()
    let handler = VNImageRequestHandler(ciImage: turn.apply(to: picture), options: [:])
    guard (try? handler.perform([request])) != nil,
      let body = request.results?.max(by: { $0.confidence < $1.confidence }),
      let found = try? body.recognizedPoints(.all)
    else { return Reading(turn: turn, points: [], score: 0) }
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
    return Reading(turn: turn, points: points, score: score)
  }
}

/// A quarter turn of the picture before Vision reads it, and back for the points it finds.
enum QuarterTurn: CaseIterable {
  case none, clockwise, anticlockwise

  var name: String {
    switch self {
    case .none: return "as is"
    case .clockwise: return "turned cw"
    case .anticlockwise: return "turned acw"
    }
  }

  /// Core Image's y points up, so a positive angle turns anticlockwise.
  func apply(to picture: CIImage) -> CIImage {
    switch self {
    case .none: return picture
    case .clockwise: return picture.transformed(by: CGAffineTransform(rotationAngle: -.pi / 2)).atOrigin()
    case .anticlockwise: return picture.transformed(by: CGAffineTransform(rotationAngle: .pi / 2)).atOrigin()
    }
  }

  /// A point Vision found in the turned picture (0–1, origin bottom-left), in the picture as it was.
  func unturn(_ p: CGPoint) -> CGPoint {
    switch self {
    case .none: return p
    // Turned clockwise, the picture's (x, y) went to (y, 1 − x).
    case .clockwise: return CGPoint(x: 1 - p.y, y: p.x)
    // Turned anticlockwise, (x, y) went to (1 − y, x).
    case .anticlockwise: return CGPoint(x: p.y, y: 1 - p.x)
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
