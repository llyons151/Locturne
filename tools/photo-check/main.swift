import Foundation

// The photo wake-ups' reading, run on a Mac over real photos (tools/photo-check/README.md). Compiled
// with the app's own modules/photo-check/ios/*.swift (not the Expo module), so the numbers are the
// ones the phone makes. Prints one JSON object.
//   photo-check pet <dir>              name → pet reading
//   photo-check bed <dir> <pairs.txt>  "setup:<ref>" → the setup reading of each reference,
//                                      "<ref> <shot>" → the shot read against that reference
let args = CommandLine.arguments
let mode = args.count > 1 ? args[1] : "pet"
let dir = URL(fileURLWithPath: args.count > 2 ? args[2] : "photos")

func photo(_ name: String) -> URL? {
  ["jpg", "jpeg", "png"].map { dir.appendingPathComponent("\(name).\($0)") }
    .first { FileManager.default.fileExists(atPath: $0.path) }
}

func log(_ line: String) { FileHandle.standardError.write("\(line)\n".data(using: .utf8)!) }

var out: [String: Any] = [:]
if mode == "bed" {
  let pairs = try String(contentsOfFile: args[3], encoding: .utf8).split(separator: "\n")
    .filter { !$0.hasPrefix("#") && !$0.isEmpty }
    .map { $0.split(separator: " ").map(String.init) }
  for ref in Set(pairs.map { $0[0] }) {
    guard let url = photo(ref) else { log("missing \(ref)"); continue }
    out["setup:\(ref)"] = PhotoMeasure.read(url: url, bed: true) ?? ["error": "unreadable"]
  }
  for pair in pairs {
    guard let ref = photo(pair[0]), let shot = photo(pair[1]) else { log("missing \(pair)"); continue }
    out["\(pair[0]) \(pair[1])"] = PhotoMeasure.read(url: shot, bed: true, reference: ref) ?? ["error": "unreadable"]
    log("read \(pair[0]) \(pair[1])")
  }
} else {
  let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
    .filter { ["jpg", "jpeg", "png", "heic"].contains($0.pathExtension.lowercased()) }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }
  for file in files {
    let name = file.deletingPathExtension().lastPathComponent
    out[name] = PhotoMeasure.read(url: file, pet: true) ?? ["error": "unreadable"]
    log("read \(name)")
  }
}
let json = try JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(json)
