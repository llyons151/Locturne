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
  private var running: MKLocalSearch?

  public func definition() -> ModuleDefinition {
    Name("PlaceSearch")

    /// Up to `limit` places matching `query`, nearest first when `near` is given.
    AsyncFunction("search") { (query: String, near: [String: Double]?, limit: Int, promise: Promise) in
      self.running?.cancel()
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
      search.start { response, error in
        // A newer search cancelled this one: its caller has moved on, so an empty answer is fine.
        guard let items = response?.mapItems, error == nil else {
          promise.resolve([[String: Any]]())
          return
        }
        promise.resolve(items.prefix(max(1, limit)).map(Self.describe))
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
      MKMapSnapshotter(options: options).start { snapshot, _ in
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
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("place-\(UUID().uuidString).png")
        do {
          try image.pngData()?.write(to: url)
          promise.resolve(url.absoluteString)
        } catch {
          promise.resolve(nil)
        }
      }
    }.runOnQueue(.main)
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
