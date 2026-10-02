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
  @Published var items: [PickedItem] = []
  @Published var rowHeight: Double = 52
  @Published var textColor: Color = .white
  @Published var separatorColor: Color = .white.opacity(0.16)

  func reload() {
    guard let selection = savedSelection(id: selectionId) else {
      items = []
      return
    }
    // Tokens are opaque, so there's no name to sort by. Keep Apple's grouping instead:
    // apps, then whole categories, then websites.
    items =
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

  override func layoutSubviews() {
    super.layoutSubviews()
    host.view.frame = bounds
  }
}
