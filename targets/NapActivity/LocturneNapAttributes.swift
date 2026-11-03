import ActivityKit
import Foundation

/**
 The Block now countdown in the Dynamic Island and on the Lock Screen. ActivityKit pairs the
 app's activity with the widget's view by this type, so the same struct lives in
 modules/blocked-apps/ios/LocturneNapAttributes.swift: keep the two identical.
 */
struct LocturneNapAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var start: Date
    var end: Date
  }
}
