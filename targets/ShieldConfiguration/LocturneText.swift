//
//  LocturneText.swift
//  The same file in every extension (native-tests/run.sh checks the copies match).
//
//  The extensions' words in the language picked in Locturne's Settings. The app saves the
//  pick in the App Group (`locturne.language`, src/lib/i18n/store.ts): a language code, or
//  "system" for the iPhone's. Each extension's Localizable.xcstrings holds the words, written
//  from src/lib/i18n/locales by `npm run i18n:catalogs`; English is also written inline at
//  each call, so a missing key, a missing table (the Linux tests) or English reads the same.
//  Words take {name} placeholders, as the app's do.
//

import Foundation

/// Every language Locturne speaks, as its .lproj name (`LANGUAGES` in src/lib/i18n/core.ts).
let LOCTURNE_LANGUAGES = ["en", "es", "de", "fr", "pt-BR", "ja"]
let LOCTURNE_LANGUAGE_KEY = "locturne.language"

/// The language to speak: the one picked in Locturne, else the first of the iPhone's that
/// Locturne speaks (any Portuguese reads Brazilian), else English. The Screen Time report has
/// no App Group, so it always follows the iPhone.
func locturneLanguage() -> String {
  let saved = UserDefaults(suiteName: "group.com.lukelyons.locturne")?.string(forKey: LOCTURNE_LANGUAGE_KEY)
  if let saved, saved != "system", LOCTURNE_LANGUAGES.contains(saved) { return saved }
  for tag in Locale.preferredLanguages {
    let base = tag.lowercased().split(whereSeparator: { $0 == "-" || $0 == "_" }).first.map(String.init) ?? ""
    if base == "pt" { return "pt-BR" }
    if LOCTURNE_LANGUAGES.contains(base) { return base }
  }
  return "en"
}

private var locturneTables: [String: Bundle] = [:]

/// The language's table, or nil for English, or where the build has no table for it.
func locturneTable() -> (language: String, bundle: Bundle)? {
  let language = locturneLanguage()
  guard language != "en" else { return nil }
  if let bundle = locturneTables[language] { return (language, bundle) }
  guard let path = Bundle.main.path(forResource: language, ofType: "lproj"), let bundle = Bundle(path: path) else { return nil }
  locturneTables[language] = bundle
  return (language, bundle)
}

/// The words for `key`, `english` where there's no translation, with each {name} filled.
func locturneText(_ key: String, _ english: String, _ values: [String: String] = [:]) -> String {
  var text = english
  if let table = locturneTable() {
    let found = table.bundle.localizedString(forKey: key, value: nil, table: "Localizable")
    if found != key { text = found }
  }
  for (name, value) in values { text = text.replacingOccurrences(of: "{\(name)}", with: value) }
  return text
}

/// A counted phrase: `key.one` or `key.other` by the language's rule (`pluralForm` in core.ts).
func locturnePlural(_ key: String, count: Int, one: String, other: String) -> String {
  let language = locturneTable()?.language ?? "en"
  let isOne = language == "ja" ? false : (language == "fr" || language == "pt-BR") ? abs(count) < 2 : count == 1
  return isOne
    ? locturneText("\(key).one", one, ["count": "\(count)"])
    : locturneText("\(key).other", other, ["count": "\(count)"])
}

/// A span of minutes, short: "6h 12m", "2h", "48m" ("6 Std. 12 Min.", "6時間12分").
func locturneDuration(minutes: Int) -> String {
  let h = minutes / 60
  let m = minutes % 60
  if h == 0 { return locturneText("time.m", "{m}m", ["m": "\(minutes)"]) }
  if m == 0 { return locturneText("time.h", "{h}h", ["h": "\(h)"]) }
  return locturneText("time.hm", "{h}h {m}m", ["h": "\(h)", "m": "\(m)"])
}

/// A minute of the day in the language's own clock ("19 Uhr", "7:30"), or nil for English,
/// which keeps Locturne's "7 am" (`locturneClockLabel`).
func locturneLocalClock(_ minutes: Int) -> String? {
  guard let table = locturneTable() else { return nil }
  let m = ((minutes % 1440) + 1440) % 1440
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: table.language)
  formatter.setLocalizedDateFormatFromTemplate(m % 60 == 0 ? "j" : "jmm")
  guard let date = Calendar.current.date(bySettingHour: m / 60, minute: m % 60, second: 0, of: Date()) else { return nil }
  return formatter.string(from: date)
}
