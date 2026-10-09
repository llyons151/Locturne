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

    // Takes one pick out of a saved selection (a swipe on the Apps tab). The token comes from
    // `onRemove`; the app never sees what it is.
    Function("removePick") { (selectionId: String, kind: String, token: String) -> Bool in
      guard let data = Data(base64Encoded: token), var selection = savedSelection(id: selectionId)
      else { return false }
      let decoder = JSONDecoder()
      switch kind {
      case "app":
        guard let token = try? decoder.decode(ApplicationToken.self, from: data) else { return false }
        selection.applicationTokens.remove(token)
      case "category":
        guard let token = try? decoder.decode(ActivityCategoryToken.self, from: data) else { return false }
        selection.categoryTokens.remove(token)
      case "site":
        guard let token = try? decoder.decode(WebDomainToken.self, from: data) else { return false }
        selection.webDomainTokens.remove(token)
      default:
        return false
      }
      // The last pick gone: forget the selection, as the library's own picker does, rather
      // than save an empty one. The extension and the app read a missing list as no picks.
      if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty
        && selection.webDomainTokens.isEmpty
      {
        return removeSelection(id: selectionId)
      }
      return saveSelection(selection, id: selectionId)
    }

    View(BlockedAppsView.self) {
      Events("onRemove")

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
      Prop("iconsOnly") { (view: BlockedAppsView, value: Bool) in
        view.model.iconsOnly = value
      }
      Prop("textColor") { (view: BlockedAppsView, color: UIColor) in
        view.model.textColor = Color(color)
      }
      Prop("separatorColor") { (view: BlockedAppsView, color: UIColor) in
        view.model.separatorColor = Color(color)
      }
      Prop("secondaryColor") { (view: BlockedAppsView, color: UIColor) in
        view.model.secondaryColor = Color(color)
      }
      // The Apps tab's rows (`PickedRowStyle`); off, the plain Settings-style rows.
      Prop("detailed") { (view: BlockedAppsView, value: Bool) in
        view.model.detailed = value
      }
      Prop("iconSize") { (view: BlockedAppsView, size: Double) in
        view.model.iconSize = size
      }
      // The right-hand column, the same on every row: the list's time ("11 pm", "30 min").
      Prop("trailing") { (view: BlockedAppsView, text: String) in
        view.model.trailing = text
      }
      Prop("trailingDetail") { (view: BlockedAppsView, text: String) in
        view.model.trailingDetail = text
      }
      // Swipe to delete, as in any iOS list. Detailed rows only.
      Prop("removable") { (view: BlockedAppsView, value: Bool) in
        view.model.removable = value
      }
      // iOS's Edit mode: a red delete button on every row.
      Prop("editing") { (view: BlockedAppsView, value: Bool) in
        guard view.model.editing != value else { return }
        if UIAccessibility.isReduceMotionEnabled {
          view.model.editing = value
        } else {
          withAnimation(.smooth(duration: 0.3)) { view.model.editing = value }
        }
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

/// Written the way react-native-device-activity writes it (`setFamilyActivitySelectionById`).
private func saveSelection(_ selection: FamilyActivitySelection, id: String) -> Bool {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let data = try? JSONEncoder().encode(selection)
  else { return false }
  var all = defaults.dictionary(forKey: selectionsKey) ?? [:]
  all[id] = data.base64EncodedString()
  defaults.set(all, forKey: selectionsKey)
  return true
}

/// `removeFamilyActivitySelectionById`, as the library's picker calls it for an emptied list.
private func removeSelection(id: String) -> Bool {
  guard let defaults = UserDefaults(suiteName: appGroup) else { return false }
  var all = defaults.dictionary(forKey: selectionsKey) ?? [:]
  all.removeValue(forKey: id)
  defaults.set(all, forKey: selectionsKey)
  return true
}

enum PickedItem: Hashable {
  case app(ApplicationToken)
  case category(ActivityCategoryToken)
  case site(WebDomainToken)

  /// The grey line under the name. Tokens are opaque, so the kind is all we know.
  var kind: String {
    switch self {
    case .app: return "App"
    case .category: return "Category"
    case .site: return "Website"
    }
  }

  /// What `removePick` needs: the kind and the encoded token, both opaque to the app.
  var payload: [String: String]? {
    let encoder = JSONEncoder()
    let encoded: Data?
    switch self {
    case .app(let token): encoded = try? encoder.encode(token)
    case .category(let token): encoded = try? encoder.encode(token)
    case .site(let token): encoded = try? encoder.encode(token)
    }
    guard let encoded else { return nil }
    return ["kind": kindKey, "token": encoded.base64EncodedString()]
  }

  private var kindKey: String {
    switch self {
    case .app: return "app"
    case .category: return "category"
    case .site: return "site"
    }
  }
}

final class BlockedAppsModel: ObservableObject {
  var selectionId = ""
  /// True while the view is in a window. Rows are only made then: a `Label(token)` made
  /// off screen can come up blank and never ask iOS again.
  var isLive = false
  @Published private(set) var items: [PickedItem] = []
  @Published var rowHeight: Double = 52
  @Published var iconsOnly = false
  @Published var textColor: Color = .white
  @Published var separatorColor: Color = .white.opacity(0.16)
  @Published var secondaryColor: Color = .white.opacity(0.6)
  @Published var detailed = false
  @Published var iconSize: Double = 30
  @Published var trailing = ""
  @Published var trailingDetail = ""
  @Published var removable = false
  @Published var editing = false
  /// Set by the view: tells React which pick was swiped away.
  var onRemove: ((PickedItem) -> Void)?

  /// A swipe or Edit-mode delete. The row goes at once; React saves the change, and the
  /// next `reload` finds the selection already matching.
  func remove(at offsets: IndexSet) {
    let removed = offsets.map { items[$0] }
    if UIAccessibility.isReduceMotionEnabled {
      items.remove(atOffsets: offsets)
    } else {
      withAnimation(.smooth(duration: 0.3)) { items.remove(atOffsets: offsets) }
    }
    removed.forEach { onRemove?($0) }
  }

  /// Re-read the selection. Rows that are already drawn stay put; only added or removed
  /// ones change, fading while the rest slide, so iOS never redraws icons it already has.
  func reload() {
    guard isLive else { return }
    let fresh = savedSelection(id: selectionId).map(Self.rows) ?? []
    // A Set comes back in any order: keep the rows already drawn where they are, in their
    // order, and add new picks after them, so a swipe never reshuffles the rest.
    let kept = items.filter(fresh.contains)
    let next = kept + fresh.filter { !kept.contains($0) }
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
    if model.iconsOnly {
      HStack(spacing: 4) {
        ForEach(Array(model.items.prefix(3)), id: \.self) { item in
          row(item)
            .labelStyle(.iconOnly)
            .frame(width: 32, height: 32)
            .clipped()
        }
      }
      .imageScale(.large)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    } else if model.detailed {
      // A real List, for iOS's own swipe to delete and Edit mode. React scrolls the page,
      // so the list doesn't scroll, and draws no background or separators of its own.
      List {
        ForEach(model.items, id: \.self) { item in
          styled(row(item), kind: item.kind)
            .frame(maxWidth: .infinity, minHeight: model.rowHeight, maxHeight: model.rowHeight, alignment: .leading)
            .padding(.horizontal, 16)
            .overlay(alignment: .bottom) {
              // None under the last row: the card's edge closes the list, as in Settings.
              if item != model.items.last {
                Rectangle()
                  .fill(model.separatorColor)
                  .frame(height: 1 / UIScreen.main.scale)
                  .padding(.leading, 16 + model.iconSize + 12)
              }
            }
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
        }
        .onDelete(perform: deleteAction)
      }
      .listStyle(.plain)
      .scrollDisabled(true)
      .scrollContentBackground(.hidden)
      .environment(\.defaultMinListRowHeight, 0)
      .environment(\.editMode, .constant(model.editing && model.removable ? .active : .inactive))
      .foregroundStyle(model.textColor)
      .lineLimit(1)
    } else {
    VStack(spacing: 0) {
      ForEach(model.items, id: \.self) { item in
        styled(row(item), kind: item.kind)
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
    .foregroundStyle(model.textColor)
    .lineLimit(1)
    .frame(maxHeight: .infinity, alignment: .top)
    }
  }

  /// Swipe to delete and Edit mode's delete buttons, only where React allows removing.
  private var deleteAction: ((IndexSet) -> Void)? {
    guard model.removable else { return nil }
    let model = model
    return { offsets in model.remove(at: offsets) }
  }

  @ViewBuilder
  private func styled(_ label: some View, kind: String) -> some View {
    if model.detailed {
      label.labelStyle(
        PickedRowStyle(
          kind: kind, trailing: model.trailing, trailingDetail: model.trailingDetail,
          iconSize: model.iconSize, secondary: model.secondaryColor))
    } else {
      label
        .font(.system(size: 17))
        .labelStyle(.titleAndIcon)
        .imageScale(.large)
    }
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

/// A list row like a portfolio list: round icon, name over its kind, and the list's time on
/// the right. `Label(token)` sizes its icon from the font, so the font sets the icon's size.
struct PickedRowStyle: LabelStyle {
  let kind: String
  let trailing: String
  let trailingDetail: String
  let iconSize: Double
  let secondary: Color

  func makeBody(configuration: Configuration) -> some View {
    HStack(spacing: 12) {
      configuration.icon
        .font(.system(size: iconSize * 0.78))
        .imageScale(.large)
        .frame(width: iconSize, height: iconSize)
        .clipShape(Circle())
        // A faint edge, so black icons keep their shape on the black card.
        .overlay(Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 1 / UIScreen.main.scale))
      VStack(alignment: .leading, spacing: 2) {
        configuration.title
          .font(.system(size: 17, weight: .medium))
        // Only worth saying when it isn't a plain app: a whole category, or a website.
        if kind != "App" {
          Text(kind)
            .font(.system(size: 14))
            .foregroundStyle(secondary)
        }
      }
      Spacer(minLength: 8)
      if !trailing.isEmpty {
        VStack(alignment: .trailing, spacing: 2) {
          Text(trailing)
            .font(.system(size: 17, weight: .medium))
            .monospacedDigit()
          if !trailingDetail.isEmpty {
            Text(trailingDetail)
              .font(.system(size: 14))
              .foregroundStyle(secondary)
          }
        }
      }
    }
  }
}

class BlockedAppsView: ExpoView {
  let model = BlockedAppsModel()
  let onRemove = EventDispatcher()
  private let host: UIHostingController<BlockedAppsList>
  private var foreground: NSObjectProtocol?

  required init(appContext: AppContext? = nil) {
    host = UIHostingController(rootView: BlockedAppsList(model: model))
    super.init(appContext: appContext)
    model.onRemove = { [weak self] item in
      if let payload = item.payload { self?.onRemove(payload) }
    }

    clipsToBounds = true
    backgroundColor = .clear
    host.view.backgroundColor = .clear
    // A List inside the scrolling card mustn't pad itself for the status bar or home
    // indicator as it scrolls under them.
    if #available(iOS 16.4, *) { host.safeAreaRegions = [] }
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
