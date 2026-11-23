import CoreGraphics
import Foundation
import Vision

/// Pet your dog or cat (2026-11-23, src/lib/wake/pet.ts decides). What Apple's on-device Vision
/// sees in the photo: the cats and dogs it finds (with boxes) and the hands it finds (their joints).
/// No ExpoModulesCore here on purpose: tools/pet-check compiles this same file on a Mac and runs it
/// over real photos, so the numbers the rules are tuned on are the ones the phone makes.
///
/// Every box and point is in the photo's own frame, 0 to 1, with y going DOWN (Vision's goes up).
enum PetReading {
  static func read(_ image: CGImage) -> [String: Any] {
    let animals = VNRecognizeAnimalsRequest()
    let hands = VNDetectHumanHandPoseRequest()
    hands.maximumHandCount = 4
    do {
      try VNImageRequestHandler(cgImage: image, options: [:]).perform([animals, hands])
    } catch {
      // The simulator has no Vision: nothing seen, so the photo misses.
      return ["animals": [], "hands": []]
    }
    let found = animals.results ?? []
    var handsSeen = (hands.results ?? []).map { hand($0) }
    // A hand half buried in fur is often missed in the whole frame: look again, closer, round each
    // animal, unless a hand big enough to count (pet.ts `handSize`) was already found.
    if !handsSeen.contains(where: { span($0) >= 0.1 }) {
      for a in found { handsSeen += handsNear(a.boundingBox, in: image) }
    }
    return [
      "animals": found.map(animal),
      "hands": handsSeen,
    ]
  }

  /// The hands in a crop round `box` (Vision's frame, y up), grown a quarter each way, mapped back to the photo.
  static func handsNear(_ box: CGRect, in image: CGImage) -> [[String: Any]] {
    let w = CGFloat(image.width), h = CGFloat(image.height)
    let grown = box.insetBy(dx: -box.width * 0.25, dy: -box.height * 0.25)
      .intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
    // CGImage crops in pixels with y down.
    let px = CGRect(x: grown.minX * w, y: (1 - grown.maxY) * h, width: grown.width * w, height: grown.height * h).integral
    guard grown.width > 0.05, grown.height > 0.05, let crop = image.cropping(to: px) else { return [] }
    let request = VNDetectHumanHandPoseRequest()
    request.maximumHandCount = 2
    guard (try? VNImageRequestHandler(cgImage: crop, options: [:]).perform([request])) != nil else { return [] }
    let left = Double(grown.minX), top = Double(1 - grown.maxY)
    let cw = Double(grown.width), ch = Double(grown.height)
    return (request.results ?? []).map { (o: VNHumanHandPoseObservation) -> [String: Any] in
      var out = hand(o)
      let points: [[Double]] = (out["points"] as? [[Double]]) ?? []
      out["points"] = points.map { (p: [Double]) -> [Double] in [left + p[0] * cw, top + p[1] * ch, p[2]] }
      out["closer"] = true
      return out
    }
  }

  /// How much of the photo a hand's joints span, the larger of width and height (as pet.ts `span`).
  static func span(_ hand: [String: Any]) -> Double {
    let points: [[Double]] = (hand["points"] as? [[Double]]) ?? []
    guard !points.isEmpty else { return 0 }
    let xs = points.map { $0[0] }, ys = points.map { $0[1] }
    let w: Double = (xs.max() ?? 0) - (xs.min() ?? 0)
    let h: Double = (ys.max() ?? 0) - (ys.min() ?? 0)
    return max(w, h)
  }

  /// One animal: its best label ("Cat" or "Dog"), how sure, and its box.
  static func animal(_ o: VNRecognizedObjectObservation) -> [String: Any] {
    let top = o.labels.first
    let b = o.boundingBox
    return [
      "label": top?.identifier.lowercased() ?? "animal",
      "confidence": Double(top?.confidence ?? o.confidence),
      "box": [Double(b.minX), Double(1 - b.maxY), Double(b.width), Double(b.height)],
    ]
  }

  /// One hand: the joints Vision is at least a little sure of, as [x, y, confidence].
  static func hand(_ o: VNHumanHandPoseObservation) -> [String: Any] {
    let points = ((try? o.recognizedPoints(.all)) ?? [:]).values
      .filter { $0.confidence >= 0.3 }
      .map { [Double($0.location.x), Double(1 - $0.location.y), Double($0.confidence)] }
    return ["confidence": Double(o.confidence), "points": points]
  }
}
