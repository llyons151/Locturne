import CoreGraphics
import Foundation
import ImageIO
import Vision

/// Reads a wake-up photo (src/lib/wake/photo.ts and pet.ts decide). All on the phone: the photo is
/// never uploaded. Apple's image labels, a few pixel counts on a 96 px copy (green, sky, the largest
/// clipped-white blob and how round it is, mean brightness), the camera's light reading (EXIF
/// BrightnessValue), for the pet photo the animals and hands (PetReading.swift), and for the bed
/// photo how it compares with the made bed's (BedReading.swift).
/// No ExpoModulesCore, so tools/pet-check runs this same file on a Mac over real photos.
enum PhotoMeasure {
  /// The whole reading of the photo at `url`; nil when it can't be opened. `pet`: the animals and hands
  /// too (PetReading.swift). `bed`: a Make your bed photo, against `reference`, the made bed's photo
  /// from setup (BedReading.swift; nil at setup itself).
  static func read(url: URL, pet: Bool = false, bed: Bool = false, reference: URL? = nil) -> [String: Any]? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    // A hand on fur is a small thing to find: the pet photo gets twice the pixels.
    guard let image = upright(source, size: pet ? 1024 : 512) else { return nil }

    var out = counts(image)
    out["labels"] = labels(image)
    if pet { out.merge(PetReading.read(image)) { _, new in new } }
    if bed {
      let ref = reference.flatMap { CGImageSourceCreateWithURL($0 as CFURL, nil) }.flatMap { upright($0, size: 512) }
      if reference != nil && ref == nil { out["refMissing"] = true }
      out.merge(BedReading.read(image, reference: ref)) { _, new in new }
    }
    let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    let exif = props?[kCGImagePropertyExifDictionary] as? [CFString: Any]
    if let value = exif?[kCGImagePropertyExifBrightnessValue] as? NSNumber { out["brightness"] = value.doubleValue }
    return out
  }

  /// Upright (the EXIF orientation applied) and small: Vision and the counts both need little.
  static func upright(_ source: CGImageSource, size: Int) -> CGImage? {
    let thumb: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: size,
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, thumb as CFDictionary)
  }

  /// Apple's classifier, the labels it's at least a little sure of. Empty where Vision can't run
  /// (the simulator): the pixel counts still decide what they can.
  static func labels(_ image: CGImage) -> [[String: Any]] {
    let request = VNClassifyImageRequest()
    do {
      try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    } catch {
      return []
    }
    return (request.results ?? [])
      .filter { $0.confidence >= 0.05 }
      .prefix(30)
      .map { ["id": $0.identifier, "confidence": Double($0.confidence)] }
  }

  static func counts(_ image: CGImage) -> [String: Any] {
    let w = 96, h = 96, n = w * h
    var px = [UInt8](repeating: 0, count: n * 4)
    let drawn: Bool = px.withUnsafeMutableBytes { buffer in
      guard let ctx = CGContext(
        data: buffer.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
      else { return false }
      ctx.interpolationQuality = .medium
      ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
      return true
    }
    guard drawn else { return ["green": 0, "sky": 0, "blob": 0, "blobFill": 0, "mean": 0] }

    var green = 0, sky = 0
    var lumSum = 0.0
    var clipped = [Bool](repeating: false, count: n)
    for i in 0..<n {
      let r = Double(px[i * 4]), g = Double(px[i * 4 + 1]), b = Double(px[i * 4 + 2])
      let hi = max(r, g, b), lo = min(r, g, b)
      let sat = hi > 0 ? (hi - lo) / hi : 0
      let lum = 0.299 * r + 0.587 * g + 0.114 * b
      lumSum += lum
      // Living green, lit or in shade; dry yellow-green grass still leads blue by a lot.
      if g > r * 1.02 && g > b * 1.12 && sat > 0.15 && hi > 30 { green += 1 }
      // Blue sky, or a pale bright overcast one (a white wall too: the light reading tells them apart).
      if (b > r * 1.05 && b >= g * 0.9 && lum > 90) || (lum > 170 && sat < 0.15) { sky += 1 }
      if lo >= 245 { clipped[i] = true }
    }

    // The largest 4-connected blob of clipped white: the sun is a small round one.
    var seen = [Bool](repeating: false, count: n)
    var best = 0, bestFill = 0.0
    var stack: [Int] = []
    for start in 0..<n where clipped[start] && !seen[start] {
      seen[start] = true
      stack.append(start)
      var size = 0, minX = w, maxX = 0, minY = h, maxY = 0
      while let i = stack.popLast() {
        size += 1
        let x = i % w, y = i / w
        minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
        for j in [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
        where j >= 0 && clipped[j] && !seen[j] {
          seen[j] = true
          stack.append(j)
        }
      }
      if size > best {
        best = size
        bestFill = Double(size) / Double((maxX - minX + 1) * (maxY - minY + 1))
      }
    }

    return [
      "green": Double(green) / Double(n),
      "sky": Double(sky) / Double(n),
      "blob": Double(best) / Double(n),
      "blobFill": bestFill,
      "mean": lumSum / Double(n) / 255,
    ]
  }
}
