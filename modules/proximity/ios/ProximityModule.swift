import AVFoundation
import ExpoModulesCore
import UIKit

/**
 Push-ups (GAME_PLAN, "Wake-up methods"): the phone lies face-up on the floor and the chest
 covers the proximity sensor at the bottom of each rep. This only reports the sensor; the rules
 (what counts as a rep, the flat-and-still check) are in src/lib/wake/pushups.ts.

 While the sensor is covered iOS turns the screen off, so Loc says the count out loud: the
 system voice, on the phone, nothing sent anywhere. Everything here runs on the main thread,
 which UIDevice's proximity calls require.
 */
public class ProximityModule: Module {
  private var observer: NSObjectProtocol?
  private let speaker = Speaker()

  public func definition() -> ModuleDefinition {
    Name("Proximity")

    Events("onChange")

    /// Whether this phone has a sensor iOS will turn on. Only an iPhone does.
    AsyncFunction("isAvailableAsync") { () -> Bool in
      let device = UIDevice.current
      let was = device.isProximityMonitoringEnabled
      device.isProximityMonitoringEnabled = true
      // It stays false on a device without the sensor.
      let available = device.isProximityMonitoringEnabled
      device.isProximityMonitoringEnabled = was
      return available
    }.runOnQueue(.main)

    /// Turns the sensor on and reports each change as `{ near, at }` (`at` in ms since 1970).
    AsyncFunction("start") { () -> Bool in
      self.stopWatching()
      let device = UIDevice.current
      device.isProximityMonitoringEnabled = true
      guard device.isProximityMonitoringEnabled else { return false }
      self.observer = NotificationCenter.default.addObserver(
        forName: UIDevice.proximityStateDidChangeNotification,
        object: device,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onChange", [
          "near": UIDevice.current.proximityState,
          "at": Date().timeIntervalSince1970 * 1000,
        ])
      }
      return true
    }.runOnQueue(.main)

    AsyncFunction("stop") {
      self.stopWatching()
    }.runOnQueue(.main)

    /// Says a short line out loud, over whatever else is playing, which dips meanwhile.
    AsyncFunction("say") { (text: String) in
      self.speaker.say(text)
    }.runOnQueue(.main)

    OnDestroy {
      DispatchQueue.main.async {
        self.stopWatching()
        self.speaker.hush()
      }
    }
  }

  /// The sensor only: a last line already started (the tenth rep's) is left to finish.
  private func stopWatching() {
    if let observer { NotificationCenter.default.removeObserver(observer) }
    observer = nil
    UIDevice.current.isProximityMonitoringEnabled = false
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
      // Playback, so the count is heard with the ring switch on silent: the phone is on the
      // floor with its screen off, and this is the only way to know a rep counted.
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

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    if !synthesizer.isSpeaking { restore() }
  }

  private func restore() {
    guard let (category, mode, options) = prior else { return }
    prior = nil
    let session = AVAudioSession.sharedInstance()
    try? session.setActive(false, options: .notifyOthersOnDeactivation)
    try? session.setCategory(category, mode: mode, options: options)
  }
}
