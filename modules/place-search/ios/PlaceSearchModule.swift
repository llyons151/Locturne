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
 - `area`: a plain dark map picture of a region, for the morning's live view to draw on.
 - `suggest` and `resolve`: suggestions as you type, from the same completer the Maps app's
   search field uses, then the tapped one looked up for where it is (MKLocalSearch alone gives
   only the single best match for a half-typed query: user, 2026-10-13).
 - `PlaceMapView`: the live map to pick the spot on, Google Maps' "choose on map" (PlaceMapView.swift).
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
  /// Suggestions as you type. One completer for the module: each new fragment replaces the last.
  private lazy var completer: MKLocalSearchCompleter = {
    let completer = MKLocalSearchCompleter()
    completer.resultTypes = [.pointOfInterest, .address]
    completer.delegate = completerDelegate
    return completer
  }()
  private lazy var completerDelegate = CompleterDelegate(
    onUpdate: { [weak self] in self?.answerSuggestions(error: nil) },
    onFail: { [weak self] error in self?.answerSuggestions(error: error) }
  )
  /// The promise waiting for the completer's next answer.
  private var suggestWaiting: Promise?
  /// The suggestions last given out, for `resolve`, and which answer they were (ids carry it).
  private var completions: [MKLocalSearchCompletion] = []
  private var generation = 0
  /// The lookup of a tapped suggestion under way.
  private var resolving: MKLocalSearch?

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

    /// Suggestions for a half-typed `query`, the way the Maps app's search field offers them,
    /// leaning toward `near`. Resolves `{ suggestions: [{ id, title, subtitle }], error }`, with
    /// `error` as `search` has it. A newer call answers an older one with `cancelled`.
    AsyncFunction("suggest") { (query: String, near: [String: Double]?, promise: Promise) in
      if let older = self.suggestWaiting {
        self.suggestWaiting = nil
        older.resolve(["suggestions": [], "error": "cancelled"])
      }
      if let lat = near?["latitude"], let lon = near?["longitude"] {
        self.completer.region = MKCoordinateRegion(
          center: CLLocationCoordinate2D(latitude: lat, longitude: lon),
          latitudinalMeters: 50_000,
          longitudinalMeters: 50_000
        )
      }
      self.suggestWaiting = promise
      // The completer only answers when the fragment changes: the same text answers from what it has.
      if self.completer.queryFragment == query && !self.completer.isSearching {
        self.answerSuggestions(error: nil)
      } else {
        self.completer.queryFragment = query
      }
    }.runOnQueue(.main)

    /// Where a suggestion from `suggest` is, by its id: a place as `search` gives them, or null
    /// when it's from an older answer or Apple can't place it.
    AsyncFunction("resolve") { (id: String, promise: Promise) in
      let parts = id.split(separator: ":").compactMap { Int($0) }
      guard parts.count == 2, parts[0] == self.generation, parts[1] >= 0, parts[1] < self.completions.count else {
        promise.resolve(nil)
        return
      }
      let completion = self.completions[parts[1]]
      self.resolving?.cancel()
      let search = MKLocalSearch(request: MKLocalSearch.Request(completion: completion))
      self.resolving = search
      search.start { response, _ in
        guard let item = response?.mapItems.first else {
          promise.resolve(nil)
          return
        }
        var place = Self.describe(item)
        // An address suggestion's title is the address itself; keep it as the name.
        if (place["name"] as? String ?? "").isEmpty { place["name"] = completion.title }
        promise.resolve(place)
      }
    }.runOnQueue(.main)

    View(PlaceMapView.self) {
      Events("onSettle", "onMoveStart", "onPoiPress")

      Prop("radius") { (view: PlaceMapView, radius: Double) in
        view.setRadius(radius)
      }
      Prop("target") { (view: PlaceMapView, target: [String: Any]?) in
        view.setTarget(target)
      }
      Prop("controlsTop") { (view: PlaceMapView, top: Double) in
        view.setControlsTop(top)
      }
    }

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
      let span = radius * 5
      self.draw(center: center, span: span, width: width, height: height, promise: promise) { snapshot in
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
      }
    }.runOnQueue(.main)

    /// A plain dark map picture, `span` metres tall around the centre, nothing drawn on it: the
    /// morning's live view (place-screen.tsx) draws the place and you over it itself, as you move.
    AsyncFunction("area") { (latitude: Double, longitude: Double, span: Double, width: Double, height: Double, promise: Promise) in
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      self.draw(center: center, span: span, width: width, height: height, promise: promise) { _ in }
    }.runOnQueue(.main)
  }

  /// Draws the dark map of the region `span` metres tall, then `overlay` on it, and resolves a
  /// file URI of the PNG (or null).
  private func draw(
    center: CLLocationCoordinate2D, span: Double, width: Double, height: Double, promise: Promise,
    overlay: @escaping (MKMapSnapshotter.Snapshot) -> Void
  ) {
    let options = MKMapSnapshotter.Options()
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
      let image = UIGraphicsImageRenderer(size: options.size).image { _ in
        snapshot.image.draw(at: .zero)
        overlay(snapshot)
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
  }

  /// Answers the waiting `suggest` with the completer's results, or why there are none.
  private func answerSuggestions(error: Error?) {
    guard let promise = suggestWaiting else { return }
    suggestWaiting = nil
    if let error {
      promise.resolve(["suggestions": [], "error": Self.kind(of: error)])
      return
    }
    generation += 1
    completions = Array(completer.results.prefix(12))
    let suggestions = completions.enumerated().map { index, completion in
      ["id": "\(generation):\(index)", "title": completion.title, "subtitle": completion.subtitle]
    }
    promise.resolve(["suggestions": suggestions, "error": suggestions.isEmpty ? "none" as Any : NSNull()])
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

  /// A place for JS: its name, a short address and where it is. PlaceMapView uses it for tapped places too.
  static func describe(_ item: MKMapItem) -> [String: Any] {
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

/// MKLocalSearchCompleter's delegate, apart from the module (which isn't an NSObject).
final class CompleterDelegate: NSObject, MKLocalSearchCompleterDelegate {
  private let onUpdate: () -> Void
  private let onFail: (Error) -> Void

  init(onUpdate: @escaping () -> Void, onFail: @escaping (Error) -> Void) {
    self.onUpdate = onUpdate
    self.onFail = onFail
  }

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    onUpdate()
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    onFail(error)
  }
}
