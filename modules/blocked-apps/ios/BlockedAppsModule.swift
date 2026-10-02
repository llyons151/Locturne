import ExpoModulesCore
import FamilyControls
import ManagedSettings
import SwiftUI
import UIKit

/**
 Draws the apps, categories and sites in one saved Screen Time selection, one row each.

 The app never learns what someone picked: Apple hands back opaque tokens, and only
 `Label(token)` can turn one into an icon and a name, drawn by iOS inside our view. So this
 view reads the selection that react-native-device-activity saved in the App Group under
 `selectionId`, and lets SwiftUI draw it. React sizes the view from the row count.
 */
public class BlockedAppsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlockedApps")

    View(BlockedAppsView.self) {
      Prop("selectionId") { (view: BlockedAppsView, id: String) in
        view.model.selectionId = id
        view.model.reload()
      }
      // Bumped by React after the picker closes, so the rows pick up the new choice.
      Prop("revision") { (view: BlockedAppsView, _: Int) in
        view.model.reload()
      }
      Prop("rowHeight") { (view: BlockedAppsView, height: Double) in
        view.model.rowHeight = height
      }
      Prop("textColor") { (view: BlockedAppsView, color: UIColor) in
        view.model.textColor = Color(color)
      }
      Prop("separatorColor") { (view: BlockedAppsView, color: UIColor) in
        view.model.separatorColor = Color(color)
      }
    }
  }
}

// Where react-native-device-activity keeps its selections: a dictionary of base64 JSON
// `FamilyActivitySelection`s in the shared App Group, keyed by our `SelectionId`.
private let selectionsKey = "familyActivitySelectionIds"
private let appGroup =
  Bundle.main.object(forInfoDictionaryKey: "REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP") as? String

private func savedSelection(id: String) -> FamilyActivitySelection? {
  guard
    let all = UserDefaults(suiteName: appGroup)?.dictionary(forKey: selectionsKey),
    let encoded = all[id] as? String,
    let data = Data(base64Encoded: encoded)
  else { return nil }
  return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
}

enum PickedItem: Hashable {
  case app(ApplicationToken)
  case category(ActivityCategoryToken)
  case site(WebDomainToken)
}

final class BlockedAppsModel: ObservableObject {
  var selectionId = ""
  /// True while the view is in a window. Rows are only made then: a `Label(token)` made
  /// off screen can come up blank and never ask iOS again.
  var isLive = false
  @Published private(set) var items: [PickedItem] = []
  @Published var rowHeight: Double = 52
  @Published var textColor: Color = .white
  @Published var separatorColor: Color = .white.opacity(0.16)

  /// Re-read the selection. Rows that are already drawn stay put; only added or removed
  /// ones change, fading while the rest slide, so iOS never redraws icons it already has.
  func reload() {
    guard isLive else { return }
    let next = savedSelection(id: selectionId).map(Self.rows) ?? []
    guard next != items else { return }
    if UIAccessibility.isReduceMotionEnabled {
      items = next
    } else {
      withAnimation(.timingCurve(0.2, 0.9, 0.3, 1, duration: 0.35)) { items = next }
    }
  }

  /// Drop every row without animating, so the next `reload` draws them all fresh.
  func forget() {
    items = []
  }

  // Tokens are opaque, so there's no name to sort by. Keep Apple's grouping instead:
  // apps, then whole categories, then websites.
  private static func rows(_ selection: FamilyActivitySelection) -> [PickedItem] {
    selection.applicationTokens.map(PickedItem.app)
      + selection.categoryTokens.map(PickedItem.category)
      + selection.webDomainTokens.map(PickedItem.site)
  }
}

struct BlockedAppsList: View {
  @ObservedObject var model: BlockedAppsModel

  var body: some View {
    VStack(spacing: 0) {
      ForEach(model.items, id: \.self) { item in
        row(item)
          .frame(maxWidth: .infinity, minHeight: model.rowHeight, maxHeight: model.rowHeight, alignment: .leading)
          .padding(.leading, 16)
          // Settings-style separator under every row; the React edit row follows the last.
          .overlay(alignment: .bottom) {
            Rectangle()
              .fill(model.separatorColor)
              .frame(height: 1 / UIScreen.main.scale)
              .padding(.leading, 60)
          }
          .transition(.opacity)
      }
    }
    .font(.system(size: 17))
    .foregroundStyle(model.textColor)
    .labelStyle(.titleAndIcon)
    .imageScale(.large)
    .lineLimit(1)
    .frame(maxHeight: .infinity, alignment: .top)
  }

  @ViewBuilder
  private func row(_ item: PickedItem) -> some View {
    switch item {
    case .app(let token): Label(token)
    case .category(let token): Label(token)
    case .site(let token): Label(token)
    }
  }
}

class BlockedAppsView: ExpoView {
  let model = BlockedAppsModel()
  private let host: UIHostingController<BlockedAppsList>
  private var foreground: NSObjectProtocol?

  required init(appContext: AppContext? = nil) {
    host = UIHostingController(rootView: BlockedAppsList(model: model))
    super.init(appContext: appContext)

    clipsToBounds = true
    backgroundColor = .clear
    host.view.backgroundColor = .clear
    addSubview(host.view)

    // The picker can change a selection while we're in the background (or from another
    // screen); re-read it whenever the app comes back.
    foreground = NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
    ) { [weak self] _ in
      self?.model.reload()
    }
  }

  deinit {
    if let foreground { NotificationCenter.default.removeObserver(foreground) }
  }

  // `Label(token)` is drawn by iOS from outside the app, and only while the view is on
  // screen. A fast tab switch can mount this view before its screen joins the window, and
  // labels made then come up blank and nothing asks again. So: hang the hosting controller
  // off the real view controller, and only make rows once we're in a window.
  private var liveSince: Date?

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else {
      host.willMove(toParent: nil)
      host.removeFromParent()
      // Gone again before iOS had time to draw the rows: they may be blank, so make them
      // fresh next time. Rows that were on screen longer keep their icons and stay.
      if let liveSince, Date().timeIntervalSince(liveSince) < 1 { model.forget() }
      liveSince = nil
      model.isLive = false
      return
    }
    if host.parent == nil, let parent = owningViewController {
      parent.addChild(host)
      host.didMove(toParent: parent)
    }
    liveSince = Date()
    model.isLive = true
    model.reload()
  }

  private var owningViewController: UIViewController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    host.view.frame = bounds
  }
}
