import CoreGraphics
import Foundation
import Vision

/// Make your bed (2026-11-23, src/lib/wake/bed.ts decides). The morning photo against the photo of
/// the made bed taken at setup, both read on the phone:
/// - `match`: how far apart Apple's image fingerprints (feature prints) are. Same bed, same angle
///   is near; another room is far.
/// - `texture` / `refTexture`: how busy each photo is (mean edge strength on a small grey copy).
///   A made bed is smooth; a thrown-back duvet, a pile of clothes and creases make edges.
/// - `people`: people Vision sees. Nobody should be lying in it.
/// No ExpoModulesCore, so tools/pet-check (and its bed photos) runs this same file on a Mac.
enum BedReading {
  static func read(_ image: CGImage, reference: CGImage?) -> [String: Any] {
    var out: [String: Any] = ["texture": texture(image), "people": people(image)]
    guard let reference else { return out }
    out["refTexture"] = texture(reference)
    if let a = fingerprint(image), let b = fingerprint(reference) {
      var distance: Float = 0
      if (try? a.computeDistance(&distance, to: b)) != nil { out["match"] = Double(distance) }
    }
    return out
  }

  static func fingerprint(_ image: CGImage) -> VNFeaturePrintObservation? {
    let request = VNGenerateImageFeaturePrintRequest()
    request.imageCropAndScaleOption = .scaleFill
    guard (try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])) != nil else { return nil }
    return request.results?.first
  }

  /// People in the photo (whole or upper bodies), sure enough to count.
  static func people(_ image: CGImage) -> Int {
    let request = VNDetectHumanRectanglesRequest()
    request.upperBodyOnly = false
    guard (try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])) != nil else { return 0 }
    return (request.results ?? []).filter { $0.confidence >= 0.5 }.count
  }

  /// Mean edge strength, 0 to 1, of the middle of the photo (where the bed is) on a 128 px grey copy.
  static func texture(_ image: CGImage) -> Double {
    let w = 128, h = 128
    var px = [UInt8](repeating: 0, count: w * h)
    let drawn: Bool = px.withUnsafeMutableBytes { buffer in
      guard let ctx = CGContext(
        data: buffer.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
        space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
      else { return false }
      ctx.interpolationQuality = .medium
      ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
      return true
    }
    guard drawn else { return 0 }
    var sum = 0.0, n = 0
    // The middle 80%: the edges of the frame are walls, floor and furniture.
    for y in (h / 10)..<(h - h / 10 - 1) {
      for x in (w / 10)..<(w - w / 10 - 1) {
        let i = y * w + x
        let gx = abs(Double(px[i + 1]) - Double(px[i]))
        let gy = abs(Double(px[i + w]) - Double(px[i]))
        sum += gx + gy
        n += 1
      }
    }
    return n > 0 ? sum / Double(n) / 510 : 0
  }
}
