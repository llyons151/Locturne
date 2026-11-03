import ActivityKit
import Foundation

/**
 The Block now countdown in the Dynamic Island and on the Lock Screen. ActivityKit pairs the
 app's activity with the widget's view by this type, so the same struct lives in
 targets/NapActivity/LocturneNapAttributes.swift: keep the two identical.
 */
struct LocturneNapAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var start: Date
    var end: Date
  }

  /// The worn moon's icon in the app group (`SHIELD_MOON_KEY`), or nil for the moon symbol.
  var moonFile: String?
}
