import ExpoModulesCore
import Foundation

/// Reads a Touch grass, Sunlight, pet or bed photo on the phone (PhotoMeasure.swift does the reading;
/// src/lib/wake/photo.ts, pet.ts and bed.ts decide). The photo is never uploaded.
public class PhotoCheckModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhotoCheck")

    AsyncFunction("read") { (uri: String) throws -> [String: Any] in
      try PhotoCheckModule.read(uri: uri)
    }

    /// Pet your dog or cat (2026-11-23): the same reading plus the animals and hands (PetReading.swift).
    AsyncFunction("readPet") { (uri: String) throws -> [String: Any] in
      try PhotoCheckModule.read(uri: uri, pet: true)
    }

    /// Make your bed (2026-11-23): the same reading, the people in it, and how it compares with
    /// `reference`, the made bed's photo from setup (BedReading.swift). No reference: setup itself.
    AsyncFunction("readBed") { (uri: String, reference: String?) throws -> [String: Any] in
      try PhotoCheckModule.read(uri: uri, bed: true, reference: reference.flatMap(PhotoCheckModule.fileURL))
    }
  }

  static func fileURL(_ uri: String) -> URL? {
    uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
  }

  static func read(uri: String, pet: Bool = false, bed: Bool = false, reference: URL? = nil) throws -> [String: Any] {
    guard let url = fileURL(uri), let out = PhotoMeasure.read(url: url, pet: pet, bed: bed, reference: reference) else {
      throw PhotoUnreadable()
    }
    return out
  }
}

struct PhotoUnreadable: Error, LocalizedError {
  var errorDescription: String? { "The photo couldn't be read." }
}
