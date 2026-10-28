import ExpoModulesCore
import MapKit
import UIKit

/**
 The live map for picking the morning place (src/features/place/place-pick.tsx), the way Google
 Maps' "choose on map" works (user, 2026-10-13: "feel like Google Maps so it's familiar"): the pin
 stays in the middle and the map moves under it. Dragging lifts the pin; letting go drops it and
 tells JS where it landed. The check-in circle is drawn around the pin at its real size, redrawn
 as the map zooms, all on the main thread with nothing crossing the bridge while the finger moves.
 Tapping a business on the map flies there and reports its name.

 Made to feel like Apple Maps (user, 2026-10-27): its 3D buildings and terrain, two-finger tilt
 and rotate, and Apple's own compass and 2D/3D buttons down the right edge. The circle is traced
 point by point through the map's camera, so it tilts and turns with the streets.

 Props: `radius` (metres, the circle), `target` ({ latitude, longitude, span, key }: fly
 there when `key` changes) and `controlsTop` (where the compass and 2D/3D buttons start, under
 the search bar). Events: `onMoveStart` (the person started dragging), `onSettle`
 ({ latitude, longitude, byUser }) and `onPoiPress` (a place, as `search` gives them).
 */
final class PlaceMapView: ExpoView, MKMapViewDelegate {
  let onSettle = EventDispatcher()
  let onMoveStart = EventDispatcher()
  let onPoiPress = EventDispatcher()

  private let map = MKMapView()
  private let ring = CAShapeLayer()
  /// Apple's own compass, against the right edge as in Maps. (MKPitchControl, the 2D/3D button,
  /// is macOS-only and fails the iOS build; a two-finger drag still tilts the map.)
  private lazy var compass = MKCompassButton(mapView: map)
  private var controlsTop: CGFloat = 120
  /// The pin's head and stem, lifted while the map moves; `spot` marks the exact point.
  private let pin = UIView()
  private let spot = UIView()
  private var radius: Double = 120
  private var targetKey: String?
  /// A region asked for before the view had a size: applied at the first layout.
  private var pendingRegion: MKCoordinateRegion?
  private var draggedByUser = false
  /// A tapped business's lookup, kept until it answers.
  private var featureRequest: AnyObject?

  private static let head: CGFloat = 30
  private static let stem: CGFloat = 12
  private static let lift: CGFloat = 10

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = UIColor(white: 0.11, alpha: 1)

    map.delegate = self
    map.overrideUserInterfaceStyle = .dark
    // Only drawn once location is allowed; the map never asks for it itself.
    map.showsUserLocation = true
    // iOS 16 is the floor (PlaceSearch.podspec), so no availability checks for these.
    // Apple Maps' own look: 3D buildings and terrain, every business shown.
    let configuration = MKStandardMapConfiguration(elevationStyle: .realistic, emphasisStyle: .default)
    configuration.pointOfInterestFilter = .includingAll
    map.preferredConfiguration = configuration
    map.selectableMapFeatures = [.pointsOfInterest]
    // Tilt and rotate as in Maps; the compass shows once it's turned, and a tap points it north.
    map.isRotateEnabled = true
    map.isPitchEnabled = true
    map.showsCompass = false
    addSubview(map)

    compass.compassVisibility = .adaptive
    addSubview(compass)

    ring.fillColor = UIColor.white.withAlphaComponent(0.1).cgColor
    ring.strokeColor = UIColor.white.withAlphaComponent(0.8).cgColor
    ring.lineWidth = 1.5
    layer.addSublayer(ring)

    spot.backgroundColor = UIColor.black.withAlphaComponent(0.6)
    spot.layer.cornerRadius = 2.5
    spot.isUserInteractionEnabled = false
    addSubview(spot)

    buildPin()
    pin.isUserInteractionEnabled = false
    addSubview(pin)

    // Over the circle and the pin, so they're always tappable.
    bringSubviewToFront(compass)
  }

  /// A white disc with a dark dot on a short white stem: a dropped pin, in the app's colours.
  private func buildPin() {
    let head = Self.head
    pin.frame = CGRect(x: 0, y: 0, width: head, height: head + Self.stem)
    let disc = UIView(frame: CGRect(x: 0, y: 0, width: head, height: head))
    disc.backgroundColor = .white
    disc.layer.cornerRadius = head / 2
    // A neutral drop shadow for lift, never a tint (CLAUDE.md).
    disc.layer.shadowColor = UIColor.black.cgColor
    disc.layer.shadowOpacity = 0.35
    disc.layer.shadowRadius = 4
    disc.layer.shadowOffset = CGSize(width: 0, height: 2)
    let dot = UIView(frame: CGRect(x: head / 2 - 5, y: head / 2 - 5, width: 10, height: 10))
    dot.backgroundColor = .black
    dot.layer.cornerRadius = 5
    disc.addSubview(dot)
    let stem = UIView(frame: CGRect(x: head / 2 - 1.5, y: head - 2, width: 3, height: Self.stem + 2))
    stem.backgroundColor = .white
    stem.layer.cornerRadius = 1.5
    pin.addSubview(stem)
    pin.addSubview(disc)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    map.frame = bounds
    let middle = CGPoint(x: bounds.midX, y: bounds.midY)
    spot.frame = CGRect(x: middle.x - 2.5, y: middle.y - 2.5, width: 5, height: 5)
    // The stem's foot on the exact point.
    pin.center = CGPoint(x: middle.x, y: middle.y - pin.bounds.height / 2)
    layoutControls()
    if let region = pendingRegion, bounds.width > 0, bounds.height > 0 {
      pendingRegion = nil
      map.setRegion(fitted(region), animated: false)
    }
    drawRing()
  }

  func setControlsTop(_ top: Double) {
    controlsTop = CGFloat(top)
    setNeedsLayout()
  }

  /// The compass against the right edge, as in Maps.
  private func layoutControls() {
    let edge: CGFloat = 16
    let size = compass.intrinsicContentSize.width > 0 ? compass.intrinsicContentSize : compass.sizeThatFits(bounds.size)
    compass.frame = CGRect(x: bounds.maxX - edge - size.width, y: controlsTop, width: size.width, height: size.height)
  }

  func setRadius(_ metres: Double) {
    radius = max(1, metres)
    drawRing()
  }

  /// Flies to `target` when its key is new: a search pick, a tapped place, "where I am".
  func setTarget(_ target: [String: Any]?) {
    guard let target,
      let key = target["key"] as? String, key != targetKey,
      let latitude = target["latitude"] as? Double,
      let longitude = target["longitude"] as? Double
    else { return }
    targetKey = key
    let span = (target["span"] as? Double) ?? 600
    let region = MKCoordinateRegion(
      center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
      latitudinalMeters: span,
      longitudinalMeters: span
    )
    if bounds.width > 0, bounds.height > 0, window != nil {
      map.setRegion(fitted(region), animated: true)
    } else {
      pendingRegion = region
    }
  }

  /// The region with the view's shape, so `span` is the height and the width follows.
  private func fitted(_ region: MKCoordinateRegion) -> MKCoordinateRegion {
    let aspect = bounds.width / max(bounds.height, 1)
    var fitted = region
    fitted.span.longitudeDelta = region.span.latitudeDelta * Double(aspect) / max(cos(region.center.latitude * .pi / 180), 0.01)
    return map.regionThatFits(fitted)
  }

  /// Where the pin points: the map's spot under the middle of the view, tilted or not.
  private func pinned() -> CLLocationCoordinate2D {
    map.convert(CGPoint(x: bounds.midX, y: bounds.midY), toCoordinateFrom: self)
  }

  /// The circle around the pin, `radius` metres on the ground: traced point by point through the
  /// camera, so it flattens into an oval when the map tilts and turns with it.
  private func drawRing() {
    guard bounds.width > 0 else { return }
    let centre = pinned()
    let north = radius / 111_320
    let east = north / max(cos(centre.latitude * .pi / 180), 0.01)
    let path = UIBezierPath()
    let steps = 64
    for i in 0...steps {
      let a = Double(i) / Double(steps) * 2 * .pi
      let point = map.convert(
        CLLocationCoordinate2D(latitude: centre.latitude + north * cos(a), longitude: centre.longitude + east * sin(a)),
        toPointTo: self
      )
      if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
    }
    path.close()
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    ring.path = path.cgPath
    CATransaction.commit()
  }

  /// Whether a finger is moving the map: MapKit's own gestures sit on its first subview.
  private func touching() -> Bool {
    let recognizers = map.subviews.first?.gestureRecognizers ?? []
    return recognizers.contains { $0.state == .began || $0.state == .changed || $0.state == .ended }
  }

  private func liftPin(_ up: Bool) {
    UIView.animate(
      withDuration: up ? 0.18 : 0.32, delay: 0,
      usingSpringWithDamping: up ? 1 : 0.55, initialSpringVelocity: 0,
      options: [.beginFromCurrentState, .allowUserInteraction]
    ) {
      self.pin.transform = up ? CGAffineTransform(translationX: 0, y: -Self.lift) : .identity
    }
  }

  // MARK: MKMapViewDelegate

  func mapView(_ mapView: MKMapView, regionWillChangeAnimated animated: Bool) {
    guard touching() else { return }
    if !draggedByUser {
      draggedByUser = true
      liftPin(true)
      onMoveStart([:])
    }
  }

  func mapViewDidChangeVisibleRegion(_ mapView: MKMapView) {
    drawRing()
  }

  func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
    drawRing()
    let byUser = draggedByUser
    if byUser {
      draggedByUser = false
      liftPin(false)
      UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    let centre = pinned()
    onSettle(["latitude": centre.latitude, "longitude": centre.longitude, "byUser": byUser])
  }

  func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    // The blue dot for where they are, as Maps draws it.
    return nil
  }

  func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
    guard let feature = view.annotation as? MKMapFeatureAnnotation else {
      if let annotation = view.annotation { mapView.deselectAnnotation(annotation, animated: false) }
      return
    }
    mapView.deselectAnnotation(feature, animated: false)
    let coordinate = feature.coordinate
    map.setCenter(coordinate, animated: true)
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
    let fallback: [String: Any] = [
      "name": feature.title ?? "",
      "address": "",
      "latitude": coordinate.latitude,
      "longitude": coordinate.longitude,
    ]
    let request = MKMapItemRequest(mapFeatureAnnotation: feature)
    featureRequest = request
    request.getMapItem { [weak self] item, _ in
      guard let self else { return }
      self.featureRequest = nil
      var place = item.map(PlaceSearchModule.describe) ?? fallback
      // Where the marker sits, so the pin and the saved spot agree.
      place["latitude"] = coordinate.latitude
      place["longitude"] = coordinate.longitude
      self.onPoiPress(place)
    }
  }
}
