import CoreLocation
import ExpoModulesCore
import MapKit
import UIKit

/**
 Leave the house's setup (src/features/place/place-pick.tsx):
 - `search`: Apple Maps search, the same one the Maps app uses, so "Planet Fitness" or "the
   library" finds the place itself and not just a street. iOS's own service, no key; nothing
   else leaves the phone.
 - `snapshot`: a dark map picture of the place picked, with the check-in radius drawn on it,
   for the confirm step. A picture, not a live map: there's nothing to pan.
 */
public class PlaceSearchModule: Module {
  /// The search under way and the promise waiting on it. A newer search answers the older one
  /// itself (`cancelled`), since a cancelled MKLocalSearch may never call its completion.
  private var running: MKLocalSearch?
  private var waiting: Promise?
  /// The last map picture written, removed when the next one is drawn so they don't pile up.
  private var lastSnapshot: URL?
  /// Kept until its picture is drawn: nothing else holds the snapshotter while it works.
  private var snapshotter: MKMapSnapshotter?

  public func definition() -> ModuleDefinition {
    Name("PlaceSearch")

    /// Up to `limit` places matching `query`, in Apple's order (relevance, biased toward `near`
    /// when it's given). Resolves `{ places, error }`: `error` is null, "none" (nothing matched),
    /// "offline" (no connection, or Apple's servers didn't answer), "cancelled" (a newer search
    /// replaced it) or "failed".
    AsyncFunction("search") { (query: String, near: [String: Double]?, limit: Int, promise: Promise) in
      if let old = self.running {
        self.running = nil
        old.cancel()
      }
      if let older = self.waiting {
        self.waiting = nil
        older.resolve(Self.answer([], error: "cancelled"))
      }
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.resultTypes = [.pointOfInterest, .address]
      if let lat = near?["latitude"], let lon = near?["longitude"] {
        request.region = MKCoordinateRegion(
          center: CLLocationCoordinate2D(latitude: lat, longitude: lon),
          latitudinalMeters: 50_000,
          longitudinalMeters: 50_000
        )
      }
      let search = MKLocalSearch(request: request)
      self.running = search
      self.waiting = promise
      search.start { [weak self] response, error in
        // Replaced by a newer search, which already answered this one's promise.
        guard let self, self.running === search else { return }
        self.running = nil
        self.waiting = nil
        if let items = response?.mapItems, error == nil {
          promise.resolve(Self.answer(items.prefix(max(1, limit)).map(Self.describe), error: nil))
        } else {
          promise.resolve(Self.answer([], error: Self.kind(of: error)))
        }
      }
    }.runOnQueue(.main)

    /// Location access as iOS has it, for what expo-location folds together: "restricted"
    /// (Screen Time or a managed phone: the person can't turn it on), "denied", "notDetermined",
    /// or "granted".
    AsyncFunction("locationAccess") { () -> String in
      switch CLLocationManager().authorizationStatus {
      case .restricted: return "restricted"
      case .denied: return "denied"
      case .notDetermined: return "notDetermined"
      case .authorizedAlways, .authorizedWhenInUse: return "granted"
      @unknown default: return "denied"
      }
    }.runOnQueue(.main)

    /// A PNG of the map around the place, `radius` metres circled, at `width` x `height` points.
    AsyncFunction("snapshot") { (latitude: Double, longitude: Double, radius: Double, width: Double, height: Double, promise: Promise) in
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      let options = MKMapSnapshotter.Options()
      let span = radius * 5
      options.region = MKCoordinateRegion(center: center, latitudinalMeters: span, longitudinalMeters: span * width / max(height, 1))
      options.size = CGSize(width: width, height: height)
      options.traitCollection = UITraitCollection(userInterfaceStyle: .dark)
      let snapshotter = MKMapSnapshotter(options: options)
      self.snapshotter = snapshotter
      snapshotter.start { snapshot, _ in
        if self.snapshotter === snapshotter { self.snapshotter = nil }
        guard let snapshot else {
          promise.resolve(nil)
          return
        }
        let image = UIGraphicsImageRenderer(size: options.size).image { context in
          snapshot.image.draw(at: .zero)
          let middle = snapshot.point(for: center)
          let edge = snapshot.point(for: CLLocationCoordinate2D(latitude: latitude + radius / 111_320, longitude: longitude))
          let r = abs(middle.y - edge.y)
          let ring = UIBezierPath(ovalIn: CGRect(x: middle.x - r, y: middle.y - r, width: r * 2, height: r * 2))
          UIColor.white.withAlphaComponent(0.1).setFill()
          ring.fill()
          UIColor.white.withAlphaComponent(0.8).setStroke()
          ring.lineWidth = 1.5
          ring.stroke()
          let dot = UIBezierPath(ovalIn: CGRect(x: middle.x - 7, y: middle.y - 7, width: 14, height: 14))
          UIColor.white.setFill()
          dot.fill()
          UIColor.black.setStroke()
          dot.lineWidth = 3
          dot.stroke()
          _ = context
        }
        // A new name each time, so the image view doesn't show a cached older picture; the
        // previous one goes.
        if let previous = self.lastSnapshot {
          try? FileManager.default.removeItem(at: previous)
          self.lastSnapshot = nil
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("place-\(UUID().uuidString).png")
        guard let data = image.pngData() else {
          promise.resolve(nil)
          return
        }
        do {
          try data.write(to: url)
          self.lastSnapshot = url
          promise.resolve(url.absoluteString)
        } catch {
          promise.resolve(nil)
        }
      }
    }.runOnQueue(.main)
  }

  private static func answer(_ places: [[String: Any]], error: String?) -> [String: Any] {
    return ["places": places, "error": error ?? NSNull()]
  }

  /// "none", "offline" or "failed", from MapKit's error (or a network error under it).
  private static func kind(of error: Error?) -> String {
    guard let error = error as NSError? else { return "failed" }
    var chain: NSError? = error
    while let current = chain {
      if current.domain == NSURLErrorDomain { return "offline" }
      chain = current.userInfo[NSUnderlyingErrorKey] as? NSError
    }
    // MKErrorDomain's codes, as numbers: 2 serverFailure, 3 loadingThrottled, 4 placemarkNotFound.
    if error.domain == "MKErrorDomain" {
      switch error.code {
      case 4: return "none"
      case 2, 3: return "offline"
      default: return "failed"
      }
    }
    return "failed"
  }

  private static func describe(_ item: MKMapItem) -> [String: Any] {
    let mark = item.placemark
    let street = [mark.subThoroughfare, mark.thoroughfare].compactMap { $0 }.joined(separator: " ")
    let address = [street.isEmpty ? nil : street, mark.locality ?? mark.subAdministrativeArea, mark.administrativeArea]
      .compactMap { $0 }
      .filter { !$0.isEmpty && $0 != item.name }
      .joined(separator: ", ")
    return [
      "name": item.name ?? street,
      "address": address,
      "latitude": mark.coordinate.latitude,
      "longitude": mark.coordinate.longitude,
    ]
  }
}
