import ExpoModulesCore
import Foundation
import Security

/// The copy of your progress that outlives the app (src/features/moons/progress-backup.ts): the
/// morning count, the proofs and the moons, as one JSON string. The App Group goes when the app
/// is deleted; this doesn't.
///
/// Kept twice. iCloud key-value storage follows the Apple Account to a reinstall or a new phone
/// (when iCloud is on). The Keychain item stays on this phone across a delete and reinstall
/// whether or not iCloud is on. JS reads both, merges them with what's on the phone, and writes
/// the result back to both: nothing here decides which one wins.
public class ProgressBackupModule: Module {
  static let cloudKey = "locturne.progress"
  static let service = "com.lukelyons.locturne.progress"
  static let account = "progress"

  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ProgressBackup")

    Events("onCloudChange")

    OnCreate {
      // A fresh install starts before iCloud has handed over the saved value; it arrives later
      // as this notification, and JS merges it in then.
      self.observer = NotificationCenter.default.addObserver(
        forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: NSUbiquitousKeyValueStore.default,
        queue: .main
      ) { [weak self] note in
        let keys = note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        if keys.isEmpty || keys.contains(ProgressBackupModule.cloudKey) {
          self?.sendEvent("onCloudChange", [:])
        }
      }
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    OnDestroy {
      if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }
    }

    /// The iCloud copy, or nil when there is none (yet: a fresh install's arrives later, as onCloudChange).
    Function("readCloud") { () -> String? in
      NSUbiquitousKeyValueStore.default.string(forKey: ProgressBackupModule.cloudKey)
    }

    /// The Keychain copy, or nil when there is none.
    Function("readKeychain") { () -> String? in
      ProgressBackupModule.keychainRead()
    }

    /// Saves `json` to both. Returns whether the Keychain took it (iCloud reports nothing back).
    Function("write") { (json: String) -> Bool in
      let store = NSUbiquitousKeyValueStore.default
      store.set(json, forKey: ProgressBackupModule.cloudKey)
      store.synchronize()
      return ProgressBackupModule.keychainWrite(json)
    }

    /// Whether this phone is signed in to iCloud (dev readout: no account means only the Keychain copy).
    Function("hasCloudAccount") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil
    }
  }

  private static func query() -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }

  static func keychainRead() -> String? {
    var q = query()
    q[kSecReturnData as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitOne
    var out: AnyObject?
    guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func keychainWrite(_ json: String) -> Bool {
    let data = Data(json.utf8)
    // After first unlock: the app may save while the phone is locked (a morning won from the shield, then a background open).
    let attrs: [String: Any] = [
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
    ]
    let status = SecItemUpdate(query() as CFDictionary, attrs as CFDictionary)
    if status == errSecSuccess { return true }
    guard status == errSecItemNotFound else { return false }
    var add = query()
    add.merge(attrs) { _, new in new }
    return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
  }
}
