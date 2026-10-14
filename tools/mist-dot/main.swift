import Foundation
// Scenarios: settle upright, tilt right, shake, spin. Dumps density PGM every few frames.
let f = MistFluid(size: 32, seed: 3)
func dump(_ name: String) {
  let d = f.density.withUnsafeBufferPointer { Data(buffer: $0) }
  try! d.write(to: URL(fileURLWithPath: "out/\(name).f32"))
}
var frame = 0
func run(_ secs: Float, g: SIMD2<Float>, shake: (Int) -> SIMD2<Float> = { _ in .zero }, turn: Float = 0, tag: String) {
  let steps = Int(secs * 60)
  for i in 0..<steps {
    f.step(dt: 1/60, gravity: g, shake: shake(i), turn: turn)
    if i % 15 == 0 { dump(String(format: "%03d_%@", frame, tag)); frame += 1 }
  }
  print(tag, "speed", f.speed)
}
let t0 = Date()
run(2, g: [0, 1], tag: "rest")
run(2, g: [0.7, 0.7], tag: "tilt")
run(1, g: [0, 1], shake: { i in i < 20 ? [ (i/5)%2==0 ? 1.5 : -1.5, 0] : .zero }, tag: "shake")
run(1.5, g: [0, 1], tag: "after")
run(1.5, g: [0, 1], turn: 6, tag: "spin")
run(2, g: [0, 0.05], tag: "flat")
print("ms/step", Date().timeIntervalSince(t0)*1000/(10*60))
