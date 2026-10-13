import Foundation
// Scenarios: rest, shake, after, spin. Dumps density every few frames for render.py.
let f = MistFluid(size: 32, seed: 3)
func dump(_ name: String) {
  let d = Data(bytes: f.density, count: f.n * f.n * MemoryLayout<Float>.stride)
  try! d.write(to: URL(fileURLWithPath: "out/\(name).f32"))
}
var frame = 0
func run(_ secs: Float, shake: (Int) -> SIMD2<Float> = { _ in .zero }, turn: Float = 0, tag: String) {
  let steps = Int(secs * 60)
  for i in 0..<steps {
    f.step(dt: 1/60, shake: shake(i), turn: turn)
    if i % 15 == 0 { dump(String(format: "%03d_%@", frame, tag)); frame += 1 }
  }
  print(tag, "speed", f.speed)
}
let t0 = Date()
run(3, tag: "rest")
run(1, shake: { i in i < 20 ? [(i/5)%2==0 ? 1.5 : -1.5, 0] : .zero }, tag: "shake")
run(4, tag: "after")
run(1.5, turn: 6, tag: "spin")
run(6, tag: "calm")
print("ms/step", Date().timeIntervalSince(t0)*1000/(15.5*60))
