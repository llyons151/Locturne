import Foundation

/**
 A little mist in a round jar: a Stable Fluids solver (Stam 1999) on a small square grid,
 with every cell outside the inscribed circle treated as solid wall.

 The mist is a density field that fills the whole jar, thicker in some wisps than others, and
 floats: there's no gravity (user's ask, October 13, 2026). A uniform push on an incompressible
 fluid in a closed jar does nothing (the pressure solve cancels it), so the phone's shakes act on
 the mist in proportion to how much denser it is than the jar's average (Boussinesq): the thick
 wisps are thrown about and the thin ones fill in behind. The mist eases back toward a slowly
 drifting cloud, so it never blurs into one flat grey. Vorticity confinement keeps the small
 curls that make it read as mist instead of syrup.

 Plain Foundation, no UIKit or Metal, so it runs (and is checked) off-device too. The fields
 are raw buffers rather than arrays: no bounds checks or copy-on-write in the inner loops, which
 is most of the cost when the pod is built without optimisation.

 Not thread-safe: one owner steps and reads it, on one queue.
 */
final class MistFluid {
  typealias Field = UnsafeMutablePointer<Float>
  let n: Int
  /// 1 inside the jar, 0 for wall cells.
  let fluid: Field
  /// The mist, row by row from the top, 0 to 1.
  private(set) var density: Field
  private var u: Field
  private var v: Field
  private var scratchA: Field
  private var scratchB: Field
  private let pressure: Field
  private let divergence: Field
  private let curl: Field
  private let fields: [Field]
  /// The total mist the jar holds; advection leaks a little, so each step tops it back up.
  private var mass: Float = 0
  private var fluidCells: Float = 0
  private var time: Float = 0
  private let seed: Float

  // Tuning, in grid cells and seconds.
  /// How hard a shake throws it, per g of acceleration, per unit of density above average.
  var fling: Float = 4500
  /// How much the jar's own turning drags the mist round, per radian a second.
  var spin: Float = 2.2
  var vorticity: Float = 5
  /// Fraction of velocity kept per second, so a slosh dies down in a couple of seconds.
  var damping: Float = 0.35
  /// A faint stir so the mist keeps floating round when the phone is still.
  var breath: Float = 5
  var pressureIterations = 20

  /// The mist's average thickness, and how far its wisps stray from it either way.
  let base: Float
  let wisps: Float
  /// Seconds for the mist to get halfway back to its drifting cloud after a shake.
  var reform: Float = 2.5
  /// How much each step evens out neighbouring cells, so a shake doesn't leave grid-sized ripples.
  var soften: Float = 0.12

  init(size: Int = 32, base: Float = 0.5, wisps: Float = 0.4, seed: Float = Float.random(in: 0..<100)) {
    n = size
    self.base = base
    self.wisps = wisps
    self.seed = seed
    let count = size * size
    let make = { () -> Field in
      let f = Field.allocate(capacity: count)
      f.initialize(repeating: 0, count: count)
      return f
    }
    fluid = make()
    density = make()
    u = make()
    v = make()
    scratchA = make()
    scratchB = make()
    pressure = make()
    divergence = make()
    curl = make()
    fields = [fluid, density, u, v, scratchA, scratchB, pressure, divergence, curl]

    let c = Float(size) / 2
    let r = c - 1
    for j in 0..<size {
      for i in 0..<size {
        let dx = Float(i) + 0.5 - c
        let dy = Float(j) + 0.5 - c
        if dx * dx + dy * dy <= r * r {
          fluid[j * size + i] = 1
          fluidCells += 1
        }
      }
    }

    // Start already filled, wisps and all.
    for k in 0..<count where fluid[k] > 0 {
      density[k] = cloud(Float(k % size) + 0.5, Float(k / size) + 0.5, 0)
      mass += density[k]
    }
  }

  /// The mist's resting shape at a cell and time: a few slow, crossing waves, so thick and thin wisps drift past each other.
  @inline(__always) private func cloud(_ x: Float, _ y: Float, _ t: Float) -> Float {
    let s = seed
    let a = sin(x * 0.29 + y * 0.11 + s + t * 0.21)
    let b = sin(y * 0.33 - x * 0.17 + s * 1.7 - t * 0.16)
    let c = sin((x + y) * 0.19 + s * 2.3 + t * 0.12)
    return min(1, max(0, base + wisps * (a + b + c) / 2))
  }

  deinit {
    fields.forEach { $0.deallocate() }
  }

  /// Fastest any mist moved last step, in cells a second; lets the view rest when it's calm.
  private(set) var speed: Float = 0

  /**
   Advance by `dt` seconds.
   - shake: the phone's own acceleration, in g, screen axes; the mist is thrown the other way.
   - turn: the phone spinning about the screen's axis, in radians a second (counterclockwise positive).
   */
  func step(dt: Float, shake: SIMD2<Float>, turn: Float) {
    let dt = min(dt, 1 / 30)
    time += dt
    let count = n * n
    let n = self.n, fluid = self.fluid, density = self.density, u = self.u, v = self.v
    let avg = mass / max(fluidCells, 1)
    let push = -shake * fling
    let c = Float(n) / 2

    // Forces: density-weighted push, the jar's turning, and a faint stir.
    for k in 0..<count where fluid[k] > 0 {
      let excess = density[k] - avg
      let x = Float(k % n) + 0.5 - c
      let y = Float(k / n) + 0.5 - c
      var fx = push.x * excess
      var fy = push.y * excess
      // Spinning the jar leaves the mist behind: it turns the opposite way, slowest at the centre.
      // (With y down, (-y, x) runs clockwise on screen.)
      fx -= turn * spin * y
      fy += turn * spin * x
      let s = seed + time * 0.35
      fx += breath * (sin(y * 0.31 + s * 1.7) + 0.6 * sin(x * 0.23 - s * 1.1))
      fy += breath * (0.7 * sin(x * 0.27 + s * 1.3) + 0.4 * sin(y * 0.21 - s * 0.9))
      u[k] += fx * dt
      v[k] += fy * dt
    }

    confineVorticity(dt: dt)
    let keep = pow(damping, dt)
    for k in 0..<count {
      u[k] *= keep * fluid[k]
      v[k] *= keep * fluid[k]
    }

    // Move velocity and mist along the flow.
    advect(u, into: scratchA, dt: dt)
    advect(v, into: scratchB, dt: dt)
    swap(&self.u, &scratchA)
    swap(&self.v, &scratchB)
    // Make it incompressible before the mist rides it.
    project()
    advectSharp(dt: dt)
    drift(dt: dt)
    blur(self.density)
    blur(self.u)
    blur(self.v)

    // Keep the same amount of mist, and keep it in [0, 1].
    var total: Float = 0
    for k in 0..<count where fluid[k] > 0 { total += self.density[k] }
    let scale = total > 0 ? mass / total : 1
    var fastest: Float = 0
    let su = self.u, sv = self.v, sd = self.density
    for k in 0..<count {
      sd[k] = min(1, sd[k] * scale) * fluid[k]
      fastest = max(fastest, su[k] * su[k] + sv[k] * sv[k])
    }
    speed = fastest.squareRoot()
  }

  @inline(__always) private func at(_ field: Field, _ i: Int, _ j: Int) -> Float {
    field[min(n - 1, max(0, j)) * n + min(n - 1, max(0, i))]
  }

  /// Bilinear sample at a point in cell units, where cell (i, j) is centred on (i + 0.5, j + 0.5).
  @inline(__always) private func sample(_ field: Field, _ x: Float, _ y: Float) -> Float {
    let fx = x - 0.5, fy = y - 0.5
    let i = Int(floor(fx)), j = Int(floor(fy))
    let tx = fx - Float(i), ty = fy - Float(j)
    let a = at(field, i, j) * (1 - tx) + at(field, i + 1, j) * tx
    let b = at(field, i, j + 1) * (1 - tx) + at(field, i + 1, j + 1) * tx
    return a * (1 - ty) + b * ty
  }

  /// Semi-Lagrangian: each cell takes the value from where its flow came from, kept inside the jar.
  private func advect(_ field: Field, into out: Field, dt: Float) {
    let n = self.n, fluid = self.fluid, u = self.u, v = self.v
    let c = Float(n) / 2
    let r = c - 1.5
    for j in 0..<n {
      for i in 0..<n {
        let k = j * n + i
        guard fluid[k] > 0 else { out[k] = 0; continue }
        var x = Float(i) + 0.5 - u[k] * dt
        var y = Float(j) + 0.5 - v[k] * dt
        let dx = x - c, dy = y - c
        let d = (dx * dx + dy * dy).squareRoot()
        if d > r { x = c + dx / d * r; y = c + dy / d * r }
        out[k] = sample(field, x, y)
      }
    }
  }

  /**
   Move the mist along the flow with MacCormack's correction: advect forward, back again, and
   add back half the round trip's error. Plain semi-Lagrangian blurs a 32-cell jar into a grey
   wash within seconds; this keeps the pool's surface soft but there.
   */
  private func advectSharp(dt: Float) {
    advect(density, into: scratchA, dt: dt)
    advect(scratchA, into: scratchB, dt: -dt)
    let density = self.density, scratchA = self.scratchA, scratchB = self.scratchB, fluid = self.fluid
    for k in 0..<n * n where fluid[k] > 0 {
      density[k] = min(1, max(0, scratchA[k] + 0.5 * (density[k] - scratchB[k])))
    }
  }

  /// Ease the mist back toward its drifting cloud, so a shake's plumes melt back into wisps instead of a flat grey.
  private func drift(dt: Float) {
    let n = self.n, fluid = self.fluid, density = self.density
    let ease = 1 - pow(0.5, dt / reform)
    for k in 0..<n * n where fluid[k] > 0 {
      let target = cloud(Float(k % n) + 0.5, Float(k / n) + 0.5, time)
      density[k] += (target - density[k]) * ease
    }
  }

  /// Mix a little of each jar cell's jar neighbours into it.
  private func blur(_ field: Field) {
    let n = self.n, fluid = self.fluid, out = self.scratchA, soften = self.soften
    for j in 1..<n - 1 {
      for i in 1..<n - 1 {
        let k = j * n + i
        guard fluid[k] > 0 else { continue }
        let f = field[k]
        let l = fluid[k - 1] > 0 ? field[k - 1] : f
        let rt = fluid[k + 1] > 0 ? field[k + 1] : f
        let dn = fluid[k - n] > 0 ? field[k - n] : f
        let up = fluid[k + n] > 0 ? field[k + n] : f
        out[k] = f + soften * ((l + rt + dn + up) / 4 - f)
      }
    }
    for k in 0..<n * n where fluid[k] > 0 { field[k] = out[k] }
  }

  /// Make the flow incompressible: solve for pressure (Jacobi, walls are zero-gradient) and subtract its gradient.
  private func project() {
    let n = self.n, fluid = self.fluid, u = self.u, v = self.v
    let pressure = self.pressure, divergence = self.divergence, scratchB = self.scratchB
    for j in 0..<n {
      for i in 0..<n {
        let k = j * n + i
        guard fluid[k] > 0 else { divergence[k] = 0; continue }
        // Velocity in a wall counts as zero: no flow through the jar.
        divergence[k] = 0.5 * (at(u, i + 1, j) - at(u, i - 1, j) + at(v, i, j + 1) - at(v, i, j - 1))
      }
    }
    for k in 0..<n * n { pressure[k] = 0 }
    for _ in 0..<pressureIterations {
      for j in 1..<n - 1 {
        for i in 1..<n - 1 {
          let k = j * n + i
          guard fluid[k] > 0 else { continue }
          let p = pressure[k]
          let l = fluid[k - 1] > 0 ? pressure[k - 1] : p
          let rt = fluid[k + 1] > 0 ? pressure[k + 1] : p
          let dn = fluid[k - n] > 0 ? pressure[k - n] : p
          let up = fluid[k + n] > 0 ? pressure[k + n] : p
          scratchB[k] = (l + rt + dn + up - divergence[k]) / 4
        }
      }
      for k in 0..<n * n where fluid[k] > 0 { pressure[k] = scratchB[k] }
    }
    for j in 1..<n - 1 {
      for i in 1..<n - 1 {
        let k = j * n + i
        guard fluid[k] > 0 else { continue }
        let p = pressure[k]
        let l = fluid[k - 1] > 0 ? pressure[k - 1] : p
        let rt = fluid[k + 1] > 0 ? pressure[k + 1] : p
        let dn = fluid[k - n] > 0 ? pressure[k - n] : p
        let up = fluid[k + n] > 0 ? pressure[k + n] : p
        u[k] -= 0.5 * (rt - l)
        v[k] -= 0.5 * (up - dn)
      }
    }
  }

  /// Push each little eddy to keep spinning, so the numerical blur doesn't smooth the mist into syrup.
  private func confineVorticity(dt: Float) {
    let n = self.n, fluid = self.fluid, density = self.density, u = self.u, v = self.v, curl = self.curl
    for j in 1..<n - 1 {
      for i in 1..<n - 1 {
        let k = j * n + i
        curl[k] = 0.5 * ((v[k + 1] - v[k - 1]) - (u[k + n] - u[k - n]))
      }
    }
    for j in 2..<n - 2 {
      for i in 2..<n - 2 {
        let k = j * n + i
        guard fluid[k] > 0 else { continue }
        var gx = 0.5 * (abs(curl[k + 1]) - abs(curl[k - 1]))
        var gy = 0.5 * (abs(curl[k + n]) - abs(curl[k - n]))
        let len = (gx * gx + gy * gy).squareRoot() + 1e-5
        gx /= len
        gy /= len
        // Weighted by the mist, so the thick wisps curl the most.
        let w = vorticity * curl[k] * (0.25 + density[k])
        u[k] += gy * w * dt
        v[k] -= gx * w * dt
      }
    }
  }
}
