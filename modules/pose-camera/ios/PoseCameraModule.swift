import AVFoundation
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
  private let request = VNDetectHumanBodyPoseRequest()
  /// Set up once, on `sessionQueue`.
  private var configured = false
  /// The last frame read, on `videoQueue`.
  private var lastRead: CFTimeInterval = 0
  /// The view's size, written on main and read on `videoQueue`.
  private var viewSize: CGSize = .zero
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
  }

  func setViewSize(_ size: CGSize) {
    lock.lock()
    viewSize = size
    lock.unlock()
  }

  private func currentViewSize() -> CGSize {
    lock.lock()
    defer { lock.unlock() }
    return viewSize
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
          DispatchQueue.main.async { self.portrait(self.previewLayer.connection) }
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
      let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
      let input = try? AVCaptureDeviceInput(device: camera),
      session.canAddInput(input)
    else { return "noCamera" }
    session.addInput(input)

    let output = AVCaptureVideoDataOutput()
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
    output.setSampleBufferDelegate(self, queue: videoQueue)
    guard session.canAddOutput(output) else { return "noCamera" }
    session.addOutput(output)
    // Frames stay in the sensor's own orientation; Vision is told how to turn them (below).
    return nil
  }

  private func portrait(_ connection: AVCaptureConnection?) {
    guard let connection else { return }
    if #available(iOS 17.0, *) {
      if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
    } else if connection.isVideoOrientationSupported {
      connection.videoOrientation = .portrait
    }
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    let now = CACurrentMediaTime()
    guard now - lastRead >= Self.readInterval else { return }
    lastRead = now
    guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    sawFrame()

    // Apple's orientation for the front camera held upright: turned to portrait and mirrored,
    // so Vision's points are in the picture as the (mirrored) preview shows it.
    let handler = VNImageRequestHandler(cvPixelBuffer: pixels, orientation: .leftMirrored, options: [:])
    do {
      try handler.perform([request])
    } catch {
      return
    }

    // The picture fills the view (aspect fill), so scale up and centre, as the preview does.
    // The buffer is landscape; turned upright its sides swap.
    let width = CGFloat(CVPixelBufferGetHeight(pixels))
    let height = CGFloat(CVPixelBufferGetWidth(pixels))
    let size = currentViewSize()
    let scale = max(size.width / width, size.height / height)
    let dx = (size.width - width * scale) / 2
    let dy = (size.height - height * scale) / 2

    var joints: [String: [String: Double]] = [:]
    let body = request.results?.max { $0.confidence < $1.confidence }
    if let body, let points = try? body.recognizedPoints(.all) {
      for (name, key) in Self.joints {
        guard let point = points[name], point.confidence > 0.1 else { continue }
        // Vision's origin is bottom-left, 0–1; the view's is top-left, in points.
        let x = point.location.x * width * scale + dx
        let y = (1 - point.location.y) * height * scale + dy
        joints[key] = ["x": Double(x), "y": Double(y), "c": Double(point.confidence)]
      }
    }
    let pose: [String: Any] = ["at": Date().timeIntervalSince1970 * 1000, "joints": joints]
    DispatchQueue.main.async { [weak self] in self?.onPose?(pose) }
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
