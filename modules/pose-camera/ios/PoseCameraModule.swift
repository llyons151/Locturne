import AVFoundation
import CoreImage
import ExpoModulesCore
import MediaPipeTasksVision
import UIKit
import Vision

/**
 Push-ups (GAME_PLAN, "Wake-up methods"; camera version 2026-10-10): the phone stands on the
 floor side-on to you and the front camera watches. Google's MediaPipe pose model finds the
 body's joints on the phone, every frame read and dropped: nothing recorded, saved or sent. This
 only reports the joints; what counts as a rep is in src/lib/wake/pushups.ts.

 MediaPipe, not Apple Vision, since 2026-11-21: on the user's recorded sets Vision lost the torso
 and head at the bottom of every front-on rep and on the way back up (and drew a wrong wide shape
 with the head near the camera), while MediaPipe, which tracks the body from frame to frame, held
 it in every frame (docs/PUSHUP_TRACKING.md). It's also the model the web preview and the rules'
 tuning clips use. Vision stays as the fallback if the model can't load.

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

    /// The camera exercises this build's extensions know (2026-11-21). The shield and the monitor
    /// read the routine's method: one they don't know is taken as a walk, so a JS update must not
    /// offer pull-ups or the bench press on a build whose extensions would let 200 steps wake them.
    /// Touch grass, Sunlight, Pet your pet and Make your bed (photos, modules/photo-check) are listed here for the same reason.
    Function("knownExercises") { () -> [String] in
      ["pushups", "dance", "pullups", "bench", "grass", "sun", "pet", "bed"]
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

      /// How strong the white tracing over you is, 0–1 (0 hides it). Drawn here, with each frame.
      Prop("trace") { (view: PoseCameraView, trace: Double?) in
        view.setTrace(trace ?? 0.95)
      }
    }
  }
}

/**
 The live picture, filling the view (aspect fill, mirrored like a selfie), with you traced over
 it in white, and the joints reported in the view's own points: `onPose` sends
 `{ at, joints: { leftShoulder: { x, y, c }, … } }`, with no joints when nobody's there.

 Each frame is shown together with its own tracing (2026-11-21): the picture is the very frame the
 joints were found in, put up in the same screen update, so the lines never trail the body. The
 old way (Apple's live preview, with the lines drawn by JS a beat later from a 15-a-second reading)
 lagged and stepped behind you.
 */
final class PoseCameraView: ExpoView {
  let onPose = EventDispatcher()
  let onCameraError = EventDispatcher()

  private let reader = PoseReader()
  private let picture = AVSampleBufferDisplayLayer()
  private let skeleton = SkeletonLayer()
  private var wantsActive = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    clipsToBounds = true
    picture.videoGravity = .resizeAspectFill
    // The frames come unmirrored; a selfie camera's picture is shown mirrored.
    picture.setAffineTransform(CGAffineTransform(scaleX: -1, y: 1))
    layer.addSublayer(picture)
    layer.addSublayer(skeleton)
    reader.onPose = { [weak self] pose in self?.onPose(pose) }
    reader.onError = { [weak self] reason in self?.onCameraError(["reason": reason]) }
    reader.onFrame = { [weak self] frame, joints in self?.show(frame, joints) }
    // Screen recording (or mirroring) and heat both ease the reading: see `PoseReader.setEased`.
    registerForTraitChanges([UITraitSceneCaptureState.self]) { (view: PoseCameraView, _: UITraitCollection) in
      view.updateEase()
    }
    thermalWatch = NotificationCenter.default.addObserver(
      forName: ProcessInfo.thermalStateDidChangeNotification, object: nil, queue: .main
    ) { [weak self] _ in self?.updateEase() }
  }

  private var thermalWatch: NSObjectProtocol?

  /// Main thread. The screen being recorded, or the phone hot, lets MediaPipe read every other frame.
  private func updateEase() {
    let recording = traitCollection.sceneCaptureState == .active
    let hot = ProcessInfo.processInfo.thermalState.rawValue >= ProcessInfo.ThermalState.serious.rawValue
    reader.setEased(recording || hot)
  }

  /// Main thread: the frame and its tracing in one screen update.
  private func show(_ frame: CMSampleBuffer, _ joints: [String: CGPoint]?) {
    // A frame already on its way when the camera stopped isn't put back up.
    guard running else { return }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    let renderer = picture.sampleBufferRenderer
    if renderer.status == .failed || renderer.requiresFlushToResumeDecoding { renderer.flush() }
    // If it's still busy with the last one, this frame's skipped rather than piled up (each held
    // frame is one of the camera's few buffers); the tracing still moves.
    if renderer.isReadyForMoreMediaData { renderer.enqueue(frame) }
    skeleton.draw(joints)
    CATransaction.commit()
  }

  func setActive(_ active: Bool) {
    wantsActive = active
    update()
  }

  /// How strong the tracing is, 0–1: full in a plank, faint otherwise (pose-overlay.tsx on web).
  func setTrace(_ strength: Double) {
    skeleton.strength = Float(max(0, min(1, strength)))
  }

  func setTurn(_ turn: String) {
    reader.setTurn(turn)
  }

  func setHeldUpright(_ upright: Bool) {
    reader.setHeldUpright(upright)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateEase()
    update()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    // Bounds and position, not frame: the picture layer has a (mirroring) transform.
    picture.bounds = CGRect(origin: .zero, size: bounds.size)
    picture.position = CGPoint(x: bounds.midX, y: bounds.midY)
    skeleton.frame = bounds
    CATransaction.commit()
    reader.setViewSize(bounds.size)
  }

  private var running = false

  private func update() {
    let next = wantsActive && window != nil
    if running && !next {
      // Stopped: the next start begins on black, not on the last frame and its tracing frozen.
      picture.sampleBufferRenderer.flush(removingDisplayedImage: true, completionHandler: nil)
      skeleton.clear()
    }
    running = next
    reader.setRunning(next)
  }

  deinit {
    if let thermalWatch { NotificationCenter.default.removeObserver(thermalWatch) }
    reader.setRunning(false)
  }
}

/**
 The capture session and the pose reading, off the main thread: the session is set up and
 started on its own queue, frames arrive on another, and results go back to the main thread.
 A plain NSObject rather than part of the view, so none of it is tied to the main actor.
 */
final class PoseReader: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  var onPose: (([String: Any]) -> Void)?
  var onError: ((String) -> Void)?
  /// Every frame, on the main thread: the frame to show and the joints to trace on it, in the
  /// view's (upright, untouched by the phone's turn) points; nil when nobody's there.
  var onFrame: ((CMSampleBuffer, [String: CGPoint]?) -> Void)?

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
  /// count, on `trackQueue`. Vision only: MediaPipe reads a body at any angle.
  private var reading = 0
  private var frameCount = 0
  /// MediaPipe's pose model, loaded with the session (on `sessionQueue`, before it starts) and used
  /// on `trackQueue`, under `lock`. Nil if it didn't load: Vision reads instead.
  private var landmarker: PoseLandmarker?
  /// The last frame's time handed to MediaPipe, which wants them always rising (`trackQueue`).
  private var lastStamp = -1
  /// What MediaPipe reads: the picture drawn small, reused frame to frame (`trackQueue`).
  private let ciContext = CIContext(options: [.cacheIntermediates: false])
  private var modelInput: CVPixelBuffer?
  /// Vision only: the last reading, traced on the frames between readings (`trackQueue`).
  private var lastReading: Reading?
  /// Set up once, on `sessionQueue`.
  private var configured = false
  /// The last time joints went to JS, on `trackQueue`.
  private var lastRead: CFTimeInterval = 0
  /// Reading happens here, one frame at a time, so all the reading state above has one owner
  /// whether a frame waits for it (`videoQueue` calls in and waits) or not (handed over to run).
  private let trackQueue = DispatchQueue(label: "com.lukelyons.locturne.pose.track", qos: .userInteractive)
  /// How long MediaPipe takes a frame, a running average in seconds, and how many it's timed (`trackQueue`).
  private var trackCost: CFTimeInterval = 0
  private var timedFrames = 0
  /// MediaPipe can't keep up with the camera on this phone right now: frames are shown without
  /// waiting for their own tracing (`captureOutput`). Under `lock`.
  private var behind = true
  /// The first timed frames have said whether this phone keeps up (`trackQueue`).
  private var decided = false
  private var firstCosts: [CFTimeInterval] = []
  /// When frames were last dropped for coming while one was still being read, under `lock`.
  private var lateDrops: [CFTimeInterval] = []
  /// A frame is being read while behind, under `lock`.
  private var trackBusy = false
  /// The last finished tracing, for frames shown ahead of their own. Under `lock`.
  private var lastTraced: [String: CGPoint]?
  /// The newest frame waiting for the main thread to show it, and its tracing. Under `lock`.
  private var toShow: (CMSampleBuffer, [String: CGPoint]?)?
  /// The joints in the last tracing, the last one with a body, and when (`trackQueue`).
  private var tracedKeys: Set<String> = []
  private var heldTracing: [String: CGPoint]?
  private var lastBody: CFTimeInterval = 0
  /// A MediaPipe read failure's been logged (`trackQueue`).
  private var loggedTrackError = false
  /// The view's size, written on main and read on `videoQueue`.
  private var viewSize: CGSize = .zero
  /// Which way the phone stands, written on main and read on `videoQueue`, under `lock`.
  private var turn = "portrait"
  /// The screen's being recorded or the phone's hot: MediaPipe reads at most every `easedGap`
  /// (every other frame, the fifteen a second the rules were tuned at) rather than every frame, and
  /// the frames between are shown with the last tracing, a frame behind. Every frame, plus the
  /// back-to-back reads when behind, kept a core flat out, and with a screen recording on top the
  /// whole phone lagged (user, 2026-11-23). Both under `lock`.
  private var eased = false
  private var lastModelRead: CFTimeInterval = 0
  private let lock = NSLock()

  /// The upright angle learned on an earlier run, for a run that starts with the phone already
  /// on its side. Only ever one phone, so one value.
  private static let savedKey = "poseCamera.portraitAngle"
  private static var savedPortraitAngle: CGFloat? {
    guard let saved = UserDefaults.standard.object(forKey: savedKey) as? Double else { return nil }
    return CGFloat(saved)
  }

  /// The joints go to JS about fifteen times a second: the rules were tuned at that rate, and
  /// more would only re-render the screen for nothing. (The tracing is every frame, drawn here.)
  /// Just under two of the camera's 30 fps frames: exactly 1/15 s missed every other pair by a hair
  /// of timing jitter and sent every third frame, about 10 a second. Vision, the fallback, also
  /// only reads this often: it's slower, and reads up to four turns of a frame.
  private static let readInterval: CFTimeInterval = 0.06
  /// Eased (see `eased`), the shortest gap between two frames MediaPipe reads: every other frame.
  private static let easedGap: CFTimeInterval = 0.05
  /// MediaPipe reads the picture this many pixels on its long side (540 × 960 from the camera's
  /// 720 × 1280): about what it was tested at on the user's recordings, where it kept a far, side-on
  /// body. It crops round the body and shrinks that to 256 square itself, so more is only copying.
  private static let modelSide: CGFloat = 960
  /// A joint is traced once the reader's this sure of it, and dropped once under the lower bar (the
  /// rules have their own bars).
  private static let traceShowAt = 0.2
  private static let traceHideBelow = 0.1
  /// How long the last tracing stays up when a frame finds nobody, in seconds.
  private static let holdTracing: CFTimeInterval = 0.12
  /// Frames wait for their own tracing while MediaPipe averages under this: with the copy, the hop
  /// to the main thread and the drawing, still inside one 30 fps frame (33 ms), so none is dropped.
  private static let fallBehindAbove: CFTimeInterval = 0.028
  /// ...and only go back to waiting once it's well under, so it doesn't flip back and forth.
  private static let catchUpBelow: CFTimeInterval = 0.020
  /// MediaPipe's first frames are slow while it warms up; they're not timed.
  private static let warmUpFrames = 5

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

  /// MediaPipe's 33 landmarks: the ones the rules read (the same as the web preview's).
  private static let landmarks: [(Int, String)] = [
    (0, "nose"), (11, "leftShoulder"), (12, "rightShoulder"), (13, "leftElbow"), (14, "rightElbow"),
    (15, "leftWrist"), (16, "rightWrist"), (23, "leftHip"), (24, "rightHip"), (25, "leftKnee"),
    (26, "rightKnee"), (27, "leftAnkle"), (28, "rightAnkle"),
  ]

  override init() {
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

  /// Main thread. See `eased`.
  func setEased(_ next: Bool) {
    lock.lock()
    let changed = eased != next
    eased = next
    lock.unlock()
    if changed { NSLog("[PoseCamera] reading %@", next ? "every other frame (recording or hot)" : "every frame") }
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
          // Before the first frame, so none waits on the model loading.
          let model = Self.makeLandmarker()
          lock.lock()
          landmarker = model
          lock.unlock()
          applyAngles()
          let device = camera
          DispatchQueue.main.async { self.watchRotation(device) }
        }
        // A fresh start earns a restart of its own if a runtime error stops it.
        sawFrame()
        if !session.isRunning { session.startRunning() }
      } else if session.isRunning {
        session.stopRunning()
        // Next start traces nobody until it finds you again, rather than where you last were.
        trackQueue.async { [self] in
          tracedKeys = []
          heldTracing = nil
          lock.lock()
          lastTraced = nil
          toShow = nil
          lock.unlock()
        }
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
    guard #available(iOS 17.0, *) else { return }
    guard coordinator == nil, let camera else { return }
    UIDevice.current.beginGeneratingDeviceOrientationNotifications()
    let watched = AVCaptureDevice.RotationCoordinator(device: camera, previewLayer: nil)
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
   On `sessionQueue`. The frames stay at the upright angle, so they're the picture as the screen
   shows it (the view shows these very frames); captureOutput turns them for the model to the phone's turn.
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
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    sawFrame()

    let (view, turn) = currentView()
    lock.lock()
    let standing = framesUpright
    let model = landmarker
    let late = behind
    lock.unlock()

    // The picture as the screen shows it with the phone upright, mirrored like the screen, in
    // Core Image's space (origin bottom-left, like Vision's points).
    var picture = CIImage(cvPixelBuffer: pixels)
    if standing {
      picture = picture.transformed(by: CGAffineTransform(scaleX: -1, y: 1).translatedBy(x: -picture.extent.width, y: 0))
    } else {
      // Apple's older table for the front camera (its VisionFaceTrack sample).
      picture = picture.oriented(.leftMirrored)
    }
    picture = picture.atOrigin()
    let frame = Frame(picture: picture, view: view, turn: turn, standing: standing,
                      stamp: CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds)

    // Shown as soon as it's handed over (not held for its capture time, which is already past).
    if let marks = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: true), CFArrayGetCount(marks) > 0 {
      let mark = unsafeBitCast(CFArrayGetValueAtIndex(marks, 0), to: CFMutableDictionary.self)
      CFDictionarySetValue(
        mark,
        Unmanaged.passUnretained(kCMSampleAttachmentKey_DisplayImmediately).toOpaque(),
        Unmanaged.passUnretained(kCFBooleanTrue).toOpaque())
    }

    // Eased (see `eased`): a frame too soon after the last read is shown with the last tracing, unread.
    // Timed by capture (the host clock, like CACurrentMediaTime), so callback jitter can't push a
    // read to every third frame; 50 ms splits the 33 ms and 67 ms gaps cleanly.
    let now = frame.stamp.isFinite ? frame.stamp : CACurrentMediaTime()
    lock.lock()
    let resting = model != nil && eased && now - lastModelRead < Self.easedGap
    let held = lastTraced
    lock.unlock()
    if resting { return hand(sampleBuffer, held) }

    if let model, !late {
      // Keeping up: each frame waits for its own tracing and they're shown together, so the lines
      // can't trail the body.
      lock.lock()
      lastModelRead = now
      lock.unlock()
      let traced = trackQueue.sync { read(frame, with: model) }
      return hand(sampleBuffer, traced)
    }
    // Behind (an older iPhone, or one hot or in Low Power Mode), or Vision (slower, and reading up to
    // four turns of a frame when it struggles): the frame is shown at once with the last finished
    // tracing, never held up, and the reader takes the next frame whenever it's free. The lines
    // trail the body by a frame or so; the picture stays smooth.
    lock.lock()
    let start = !trackBusy
    if start {
      trackBusy = true
      lastModelRead = now
    }
    let traced = lastTraced
    lock.unlock()
    hand(sampleBuffer, traced)
    guard start else { return }
    trackQueue.async { [self] in
      _ = read(frame, with: model)
      lock.lock()
      trackBusy = false
      lock.unlock()
    }
  }

  /**
   Hands a frame and its tracing to the main thread to show. Only the newest waits there: if the
   main thread is busy (the screen re-rendering), a frame not yet shown is replaced, not queued, so
   the picture never plays catch-up in a burst and the camera's few buffers aren't all held waiting.
   */
  private func hand(_ frame: CMSampleBuffer, _ traced: [String: CGPoint]?) {
    lock.lock()
    let idle = toShow == nil
    toShow = (frame, traced)
    lock.unlock()
    guard idle else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.lock.lock()
      let next = self.toShow
      self.toShow = nil
      self.lock.unlock()
      if let next { self.onFrame?(next.0, next.1) }
    }
  }

  /// One frame from the camera, stood up and mirrored, and what the view was when it came.
  private struct Frame {
    let picture: CIImage
    let view: CGSize
    let turn: String
    let standing: Bool
    /// Its capture time, in seconds.
    let stamp: Double
  }

  /**
   Reads one frame: the joints for its tracing (view points; nil when nobody's there), and about
   fifteen times a second the joints for JS. Times MediaPipe, and falls behind (see `captureOutput`)
   or catches up. On `trackQueue`.
   */
  private func read(_ frame: Frame, with model: PoseLandmarker?) -> [String: CGPoint]? {
    let now = CACurrentMediaTime()
    lock.lock()
    let easing = eased && model != nil
    lock.unlock()
    // Eased, MediaPipe only reads every other frame already: each of those goes to JS.
    let due = easing || now - lastRead >= Self.readInterval
    if due { lastRead = now }
    let (picture, view, turn) = (frame.picture, frame.view, frame.turn)

    // On its side, the room in the picture lies a quarter turn round: it's turned back, the way you
    // see the screen's contents, before it's read. Right edge up (landscapeLeft), the room's up is at
    // the picture's right, so it turns anticlockwise. The points are turned back after.
    let phone = turn == "landscapeLeft" ? 3 : turn == "landscapeRight" ? 1 : 0
    let best: Reading
    if let model {
      // MediaPipe follows the body from one frame to the next; it wants the frames' times always rising.
      let ms = frame.stamp.isFinite ? Int((frame.stamp * 1000).rounded()) : lastStamp + 33
      lastStamp = max(ms, lastStamp + 1)
      best = track(picture, quarters: phone, with: model, at: lastStamp)
      timeTracking(CACurrentMediaTime() - now)
    } else if due || lastReading == nil {
      best = readWithVision(picture, phone: phone)
      lastReading = best
    } else {
      best = lastReading!
    }

    // The picture fills the view (aspect fill), so scale up and centre, as the screen shows it.
    let width = picture.extent.width
    let height = picture.extent.height
    let scale = max(view.width / width, view.height / height)
    let dx = (view.width - width * scale) / 2
    let dy = (view.height - height * scale) / 2

    var joints: [String: [String: Double]] = [:]
    var traced: [String: CGPoint] = [:]
    for (key, point) in best.points {
      // The points' origin is bottom-left, 0–1; the view's is top-left, in points.
      let x = point.x * width * scale + dx
      let y = (1 - point.y) * height * scale + dy
      // A joint comes into the tracing at one confidence and only leaves under a lower one, so one
      // hovering at the bar doesn't blink in and out frame to frame.
      if point.c >= (tracedKeys.contains(key) ? Self.traceHideBelow : Self.traceShowAt) { traced[key] = CGPoint(x: x, y: y) }
      // On its side the screen's contents are turned to stand up with the phone (pushups-view.tsx),
      // so the joints for JS go in that turned box: as wide as the view is tall.
      let at: CGPoint
      switch turn {
      case "landscapeLeft": at = CGPoint(x: y, y: view.width - x)
      case "landscapeRight": at = CGPoint(x: view.height - y, y: x)
      default: at = CGPoint(x: x, y: y)
      }
      joints[key] = ["x": Double(at.x), "y": Double(at.y), "c": point.c]
    }
    tracedKeys = Set(traced.keys)
    // A frame or two without a body (a blur, a hand across the lens) keeps the last tracing rather
    // than starting it fading; longer, and it fades out.
    let shown: [String: CGPoint]?
    if !traced.isEmpty {
      shown = traced
      heldTracing = traced
      lastBody = now
    } else if now - lastBody < Self.holdTracing {
      shown = heldTracing
    } else {
      shown = nil
      heldTracing = nil
    }
    lock.lock()
    lastTraced = shown
    let late = behind
    lock.unlock()

    if due {
      // `info` is for the wake lab's tuning readout: what the camera handed over and how it was read.
      let how = model == nil ? "vision " + QuarterTurn.name(best.quarters - phone) : late ? "mediapipe behind" : "mediapipe"
      let info: [String: Any] = [
        "w": Double(width), "h": Double(height), "read": how, "upright": frame.standing, "score": best.score,
        "trackMs": (trackCost * 1000).rounded(),
      ]
      let pose: [String: Any] = ["at": Date().timeIntervalSince1970 * 1000, "joints": joints, "info": info]
      DispatchQueue.main.async { [weak self] in self?.onPose?(pose) }
    }
    return shown
  }

  /// Keeps a running average of how long MediaPipe takes a frame, and decides from it whether frames
  /// wait for their own tracing. A gap between the two bars keeps it from flipping back and forth.
  private func timeTracking(_ took: CFTimeInterval) {
    // It starts behind, so the first, slow frames (the model warming up) never hold the picture.
    timedFrames += 1
    guard timedFrames > Self.warmUpFrames else { return }
    if !decided {
      // Then it takes a few frames' average and decides once, on the falling-behind bar.
      firstCosts.append(took)
      guard firstCosts.count >= 5 else { return }
      trackCost = firstCosts.reduce(0, +) / Double(firstCosts.count)
      decided = true
      lock.lock()
      behind = trackCost > Self.fallBehindAbove
      lock.unlock()
      return
    }
    trackCost = trackCost * 0.9 + took * 0.1
    lock.lock()
    // Frames dropped for coming while one was still being read: an average under the bar can still
    // spike over a frame's time, and each spike is a hitch. Two close together and it falls behind,
    // and the average has to come down from the bar to catch up again.
    let now = CACurrentMediaTime()
    lateDrops.removeAll { now - $0 > 3 }
    let dropping = !behind && lateDrops.count >= 2
    if dropping { lateDrops.removeAll() }
    lock.unlock()
    if dropping { trackCost = max(trackCost, Self.fallBehindAbove) }
    lock.lock()
    if !behind, dropping || trackCost > Self.fallBehindAbove {
      behind = true
    } else if behind, trackCost < Self.catchUpBelow {
      behind = false
    }
    lock.unlock()
  }

  /// A frame the camera dropped. Only ones dropped for coming while the last was still being read
  /// count (not running out of buffers, say): they're the picture hitching while frames wait.
  func captureOutput(_ output: AVCaptureOutput, didDrop sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard
      let reason = CMGetAttachment(sampleBuffer, key: kCMSampleBufferAttachmentKey_DroppedFrameReason, attachmentModeOut: nil) as? String,
      reason == (kCMSampleBufferDroppedFrameReason_FrameWasLate as String)
    else { return }
    lock.lock()
    if !behind { lateDrops.append(CACurrentMediaTime()) }
    lock.unlock()
  }

  /**
   Vision, if MediaPipe didn't load. It reads bodies that stand (Apple, WWDC20 "Detect Body and Hand
   Pose with Vision": bent-over bodies don't read as well), so it also reads the picture a quarter
   turn either way, where a side-on plank stands head up, and keeps whichever finds more of the arm
   and torso.
   */
  private func readWithVision(_ picture: CIImage, phone: Int) -> Reading {
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
    return best
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

  /// MediaPipe's pose model (pose_landmarker_full, Apache 2.0), bundled with this module, on the
  /// CPU in video mode: it follows the body from one frame to the next and smooths the joints.
  /// Nil if it won't load, and Vision reads instead.
  static func makeLandmarker() -> PoseLandmarker? {
    let bundles = [Bundle.main, Bundle(for: PoseReader.self)]
    guard
      let path = bundles.lazy
        .compactMap({ $0.url(forResource: "PoseCameraModel", withExtension: "bundle").flatMap(Bundle.init(url:)) })
        .compactMap({ $0.path(forResource: "pose_landmarker_full", ofType: "task") })
        .first
    else {
      NSLog("[PoseCamera] pose_landmarker_full.task isn't in the app (PoseCameraModel.bundle); reading with Vision")
      return nil
    }
    let options = PoseLandmarkerOptions()
    options.baseOptions.modelAssetPath = path
    options.runningMode = .video
    options.numPoses = 1
    options.minPoseDetectionConfidence = 0.5
    options.minPosePresenceConfidence = 0.5
    options.minTrackingConfidence = 0.5
    do {
      return try PoseLandmarker(options: options)
    } catch {
      NSLog("[PoseCamera] MediaPipe pose model didn't load, reading with Vision: %@", "\(error)")
      return nil
    }
  }

  /// Reads one frame with MediaPipe: the picture turned `quarters` quarter turns clockwise, drawn
  /// small into a reused buffer. `stamp` is the frame's time in ms, always rising. On `trackQueue`.
  func track(_ picture: CIImage, quarters: Int, with model: PoseLandmarker, at stamp: Int) -> Reading {
    let turn = QuarterTurn(quarters)
    var turned = turn.apply(to: picture)
    let shrink = min(1, Self.modelSide / max(turned.extent.width, turned.extent.height))
    if shrink < 1 { turned = turned.transformed(by: CGAffineTransform(scaleX: shrink, y: shrink)).atOrigin() }
    let w = Int(turned.extent.width.rounded(.down))
    let h = Int(turned.extent.height.rounded(.down))
    let none = Reading(quarters: turn.quarters, points: [], score: 0)
    guard w > 0, h > 0 else { return none }
    if modelInput.map({ CVPixelBufferGetWidth($0) != w || CVPixelBufferGetHeight($0) != h }) ?? true {
      var made: CVPixelBuffer?
      let attrs = [kCVPixelBufferIOSurfacePropertiesKey as String: [String: Any]()] as CFDictionary
      CVPixelBufferCreate(kCFAllocatorDefault, w, h, kCVPixelFormatType_32BGRA, attrs, &made)
      modelInput = made
    }
    guard let input = modelInput else { return none }
    ciContext.render(turned, to: input)
    let result: PoseLandmarkerResult
    do {
      result = try model.detect(videoFrame: MPImage(pixelBuffer: input), timestampInMilliseconds: stamp)
    } catch {
      // Once: a frame MediaPipe won't read is a bug, and every frame after would say the same.
      if !loggedTrackError {
        loggedTrackError = true
        NSLog("[PoseCamera] MediaPipe couldn't read a frame: %@", "\(error)")
      }
      return none
    }
    guard let body = result.landmarks.first else { return none }

    var points: [(String, (x: CGFloat, y: CGFloat, c: Double))] = []
    var seen: [String: Double] = [:]
    for (index, key) in Self.landmarks where index < body.count {
      let mark = body[index]
      let c = mark.visibility?.doubleValue ?? 0.5
      seen[key] = c
      // MediaPipe's origin is top-left; Vision's, which the rest goes by, bottom-left.
      let back = turn.unturn(CGPoint(x: CGFloat(mark.x), y: 1 - CGFloat(mark.y)))
      points.append((key, (back.x, back.y, c)))
    }
    // The same yardstick as Vision's: the better side's shoulder, elbow, wrist and hip.
    let score = ["left", "right"].map { side in
      ["Shoulder", "Elbow", "Wrist", "Hip"].reduce(0.0) { $0 + (seen[side + $1] ?? 0) }
    }.max() ?? 0
    return Reading(quarters: turn.quarters, points: points, score: score)
  }

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

/**
 You, traced in white over the picture: thin lines between the joints, a dot on each, a ring round
 the head. The same look as the web preview's (src/features/wake/pose-overlay.tsx). No glow.
 Drawn with each frame, so it moves with you; it fades out when nobody's there rather than blinking.
 */
final class SkeletonLayer: CALayer {
  private static let bones: [(String, String)] = [
    ("leftShoulder", "rightShoulder"), ("leftHip", "rightHip"),
    ("leftShoulder", "leftElbow"), ("leftElbow", "leftWrist"),
    ("rightShoulder", "rightElbow"), ("rightElbow", "rightWrist"),
    ("leftShoulder", "leftHip"), ("rightShoulder", "rightHip"),
    ("leftHip", "leftKnee"), ("leftKnee", "leftAnkle"),
    ("rightHip", "rightKnee"), ("rightKnee", "rightAnkle"),
  ]

  private let lines = CAShapeLayer()
  private let dots = CAShapeLayer()
  private var showing = false

  /// 0–1: full in a plank, faint otherwise.
  var strength: Float = 0.95 {
    didSet { if showing { opacity = strength } }
  }

  override init() {
    super.init()
    setUp()
  }

  override init(layer: Any) {
    super.init(layer: layer)
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setUp()
  }

  private func setUp() {
    opacity = 0
    let white = UIColor.white.cgColor
    lines.strokeColor = white
    lines.fillColor = nil
    lines.lineWidth = 3
    lines.lineCap = .round
    lines.lineJoin = .round
    dots.fillColor = white
    dots.strokeColor = nil
    addSublayer(lines)
    addSublayer(dots)
  }

  /// Main thread, inside the caller's transaction (actions off).
  func draw(_ joints: [String: CGPoint]?) {
    guard let joints else {
      if showing { fade(to: 0) }
      showing = false
      return
    }
    let bones = CGMutablePath()
    for (a, b) in Self.bones {
      guard let p = joints[a], let q = joints[b] else { continue }
      bones.move(to: p)
      bones.addLine(to: q)
    }
    // The head: a ring round the nose, drawn with the lines.
    if let nose = joints["nose"] {
      bones.move(to: CGPoint(x: nose.x + 11, y: nose.y))
      bones.addArc(center: nose, radius: 11, startAngle: 0, endAngle: .pi * 2, clockwise: false)
    }
    let spots = CGMutablePath()
    for (key, p) in joints where key != "nose" {
      spots.addEllipse(in: CGRect(x: p.x - 4.5, y: p.y - 4.5, width: 9, height: 9))
    }
    lines.path = bones
    dots.path = spots
    if !showing { fade(to: strength) }
    showing = true
  }

  private func fade(to value: Float) {
    let fade = CABasicAnimation(keyPath: "opacity")
    fade.fromValue = presentation()?.opacity ?? opacity
    fade.toValue = value
    fade.duration = 0.18
    opacity = value
    add(fade, forKey: "fade")
  }

  /// At once, no fade: the camera stopped.
  func clear() {
    removeAnimation(forKey: "fade")
    opacity = 0
    lines.path = nil
    dots.path = nil
    showing = false
  }

  override func layoutSublayers() {
    super.layoutSublayers()
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    lines.frame = bounds
    dots.frame = bounds
    CATransaction.commit()
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
