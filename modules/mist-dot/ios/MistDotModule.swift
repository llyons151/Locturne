import CoreMotion
import os
import ExpoModulesCore
import MetalKit
import UIKit

/**
 A day you got up, on Home's week strip: the circle holds a little of the frosted moon's mist,
 pooled at the bottom. Tilt the phone and it slides over; shake it and it's thrown up into
 plumes that drift back down; spin it and it lags behind (user's ask, October 8, 2026).

 `MistFluid` simulates it on the CPU (a 32-cell grid costs well under a millisecond a step),
 and a Metal shader draws it: the mist blurred and drifting, in the moon's blues, behind a
 faint glass edge. The shader is compiled from source at runtime, like the Sleep orb's.
 */
public class MistDotModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MistDot")

    View(MistDotView.self) {
      Prop("paused") { (view: MistDotView, paused: Bool) in
        view.pausedByProp = paused
        view.updateRunning()
      }
    }
  }
}

/**
 One motion reader for every dot on screen, running only while one is. Device motion needs no
 permission (only activity and pedometer data do).
 */
final class MistMotion {
  static let shared = MistMotion()
  private let manager = CMMotionManager()
  private var users = 0

  /// On screen, in g: which way is down (x right, y down), and the phone's own acceleration.
  private(set) var gravity = SIMD2<Float>(0, 1)
  private(set) var shake = SIMD2<Float>(0, 0)
  /// Turning about the screen's axis, radians a second, counterclockwise as you look at it.
  private(set) var turn: Float = 0

  func start() {
    users += 1
    guard users == 1, manager.isDeviceMotionAvailable else { return }
    manager.deviceMotionUpdateInterval = 1.0 / 60
    manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
      guard let self, let motion else { return }
      // The app is portrait only, so the device's axes are the screen's, with y flipped.
      let g = motion.gravity
      let a = motion.userAcceleration
      self.gravity = SIMD2(Float(g.x), Float(-g.y))
      let s = SIMD2(Float(a.x), Float(-a.y))
      let len = (s.x * s.x + s.y * s.y).squareRoot()
      // A hard shake is about 2 g; past that it only throws the mist into the wall.
      self.shake = len > 2.5 ? s * (2.5 / len) : s
      self.turn = Float(motion.rotationRate.z)
    }
  }

  func stop() {
    users = max(0, users - 1)
    if users == 0 {
      manager.stopDeviceMotionUpdates()
      shake = .zero
      turn = 0
    }
  }
}

final class MistDotView: ExpoView {
  private let metalView: MTKView
  private let renderer: MistDotRenderer?
  var pausedByProp = false
  private var listening = false
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    let device = MistDotShared.shared.device
    metalView = MTKView(frame: .zero, device: device)
    renderer = device.flatMap { MistDotRenderer(device: $0, pixelFormat: .bgra8Unorm) }
    super.init(appContext: appContext)

    backgroundColor = .clear
    clipsToBounds = true
    metalView.colorPixelFormat = .bgra8Unorm
    metalView.isOpaque = false
    metalView.layer.isOpaque = false
    metalView.backgroundColor = .clear
    metalView.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
    metalView.framebufferOnly = true
    metalView.preferredFramesPerSecond = 60
    metalView.isUserInteractionEnabled = false
    metalView.delegate = renderer
    addSubview(metalView)

    let center = NotificationCenter.default
    observers = [
      center.addObserver(
        forName: UIAccessibility.reduceMotionStatusDidChangeNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.updateRunning() },
      center.addObserver(
        forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.updateRunning() },
      center.addObserver(
        forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.updateRunning() },
    ]
    updateRunning()
  }

  deinit {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    if listening { MistMotion.shared.stop() }
  }

  /// Simulate and read motion only while the dot is on screen, the app is active and motion is
  /// on. Otherwise the mist rests at the bottom in one still frame.
  func updateRunning() {
    let still = pausedByProp || UIAccessibility.isReduceMotionEnabled
    let visible = window != nil && UIApplication.shared.applicationState != .background
    let run = visible && !still
    if run != listening {
      listening = run
      if run { MistMotion.shared.start() } else { MistMotion.shared.stop() }
    }
    renderer?.moving = run
    metalView.enableSetNeedsDisplay = !run
    metalView.isPaused = !run
    if !run { metalView.setNeedsDisplay() }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateRunning()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    metalView.frame = bounds
    if metalView.isPaused { metalView.setNeedsDisplay() }
  }
}

private struct MistDotUniforms {
  var size: SIMD2<Float>
  var time: Float
  var cells: Float
}

/// What every dot shares: the device, one command queue, and the pipeline compiled once, so
/// seven dots don't each compile the shader as Home opens.
private final class MistDotShared {
  static let shared = MistDotShared()
  let device: MTLDevice?
  let queue: MTLCommandQueue?
  let pipeline: MTLRenderPipelineState?
  let sampler: MTLSamplerState?
  /// Where every dot's mist is simulated, off the main thread so the UI never waits on it.
  let simulation = DispatchQueue(label: "locturne.mist-dot", qos: .userInitiated)

  private init() {
    device = MTLCreateSystemDefaultDevice()
    queue = device?.makeCommandQueue()
    let samplerDescriptor = MTLSamplerDescriptor()
    samplerDescriptor.minFilter = .linear
    samplerDescriptor.magFilter = .linear
    samplerDescriptor.sAddressMode = .clampToEdge
    samplerDescriptor.tAddressMode = .clampToEdge
    sampler = device?.makeSamplerState(descriptor: samplerDescriptor)
    guard
      let device,
      let library = try? device.makeLibrary(source: mistDotShaderSource, options: nil),
      let vertex = library.makeFunction(name: "mist_dot_vertex"),
      let fragment = library.makeFunction(name: "mist_dot_fragment")
    else {
      pipeline = nil
      return
    }
    let descriptor = MTLRenderPipelineDescriptor()
    descriptor.vertexFunction = vertex
    descriptor.fragmentFunction = fragment
    descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
    pipeline = try? device.makeRenderPipelineState(descriptor: descriptor)
  }
}

/**
 Each frame the main thread only uploads the latest mist (1,024 half floats) and draws; the
 simulation runs on `MistDotShared.simulation`, one step behind. When the phone and the mist
 are both calm the view drops to 30 fps.
 */
final class MistDotRenderer: NSObject, MTKViewDelegate {
  private let shared: MistDotShared
  private let queue: MTLCommandQueue
  private let pipeline: MTLRenderPipelineState
  private let sampler: MTLSamplerState
  private let texture: MTLTexture
  /// Touched only on the simulation queue.
  private let fluid = MistFluid()
  private var leftover: Float = 0
  /// The latest mist as half floats, written on the simulation queue and read on main.
  private let latest: UnsafeMutablePointer<Float16>
  private var lock = os_unfair_lock()
  private var stepping = false
  /// The mist's fastest speed after the last step (under `lock`).
  private var mistSpeed: Float = 0
  /// Main thread only.
  private var calmFor: Float = 0
  private var time = Float.random(in: 0..<40)
  private var last = CACurrentMediaTime()
  var moving = true

  init?(device: MTLDevice, pixelFormat: MTLPixelFormat) {
    shared = MistDotShared.shared
    let n = fluid.n
    let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(
      pixelFormat: .r16Float, width: n, height: n, mipmapped: false
    )
    textureDescriptor.usage = .shaderRead
    guard
      let queue = shared.queue,
      let pipeline = shared.pipeline,
      let sampler = shared.sampler,
      let texture = shared.device?.makeTexture(descriptor: textureDescriptor)
    else { return nil }
    self.queue = queue
    self.pipeline = pipeline
    self.sampler = sampler
    self.texture = texture
    latest = .allocate(capacity: n * n)
    for k in 0..<n * n { latest[k] = Float16(fluid.density[k]) }
    super.init()
  }

  deinit {
    // A step may still be queued; it holds `self`, so by now none is.
    latest.deallocate()
  }

  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  func draw(in view: MTKView) {
    let now = CACurrentMediaTime()
    let dt = Float(min(0.1, now - last))
    last = now
    let n = fluid.n

    // Show what the simulation last finished.
    os_unfair_lock_lock(&lock)
    texture.replace(
      region: MTLRegionMake2D(0, 0, n, n), mipmapLevel: 0,
      withBytes: latest, bytesPerRow: n * MemoryLayout<Float16>.stride
    )
    let busy = stepping
    let speed = mistSpeed
    if moving && !busy { stepping = true }
    os_unfair_lock_unlock(&lock)

    if moving {
      time += dt
      let motion = MistMotion.shared
      let gravity = motion.gravity, shake = motion.shake, turn = motion.turn
      // Calm: nothing much moving, so 30 fps is plenty. Any jolt brings back 60.
      let jolt = (shake.x * shake.x + shake.y * shake.y).squareRoot() + abs(turn) * 0.1
      calmFor = jolt < 0.03 && speed < 4 ? calmFor + dt : 0
      view.preferredFramesPerSecond = calmFor > 1.5 ? 30 : 60

      if !busy {
        shared.simulation.async { [self] in
          // Fixed 60 Hz steps, so the mist behaves the same at any frame rate.
          leftover += dt
          var steps = 0
          while leftover >= 1.0 / 60 && steps < 3 {
            fluid.step(dt: 1.0 / 60, gravity: gravity, shake: shake, turn: turn)
            leftover -= 1.0 / 60
            steps += 1
          }
          if steps == 3 { leftover = 0 }
          os_unfair_lock_lock(&lock)
          mistSpeed = fluid.speed
          for k in 0..<n * n { latest[k] = Float16(fluid.density[k]) }
          stepping = false
          os_unfair_lock_unlock(&lock)
        }
      }
    }

    guard
      let pass = view.currentRenderPassDescriptor,
      let drawable = view.currentDrawable,
      let buffer = queue.makeCommandBuffer(),
      let encoder = buffer.makeRenderCommandEncoder(descriptor: pass)
    else { return }
    var uniforms = MistDotUniforms(
      size: SIMD2(Float(view.drawableSize.width), Float(view.drawableSize.height)),
      time: time,
      cells: Float(n)
    )
    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<MistDotUniforms>.stride, index: 0)
    encoder.setFragmentTexture(texture, index: 0)
    encoder.setFragmentSamplerState(sampler, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    buffer.present(drawable)
    buffer.commit()
  }
}

/// The mist, drawn: the simulated density pushed through a slow drifting warp and a 9-tap blur
/// so it reads as fog, given a fine grain, coloured from the jar's dark through the frosted
/// moon's blue (#7193D8) to its pale heart, behind a faint glass edge lit from the upper left.
/// Checked off-device against a numpy mirror of the same maths. Output is premultiplied alpha.
private let mistDotShaderSource = """
#include <metal_stdlib>
using namespace metal;

struct VOut { float4 position [[position]]; };
struct Uniforms { float2 size; float time; float cells; };

vertex VOut mist_dot_vertex(uint vid [[vertex_id]]) {
  float2 corners[3] = { float2(-1.0, -1.0), float2(3.0, -1.0), float2(-1.0, 3.0) };
  VOut out;
  out.position = float4(corners[vid], 0.0, 1.0);
  return out;
}

static float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

static float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
             mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

static float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = float2(1.6 * p.x + 1.2 * p.y, -1.2 * p.x + 1.6 * p.y);
    a *= 0.5;
  }
  return v / 0.9375;
}

fragment float4 mist_dot_fragment(VOut in [[stage_in]], constant Uniforms &u [[buffer(0)]],
                                  texture2d<float> mist [[texture(0)]], sampler s [[sampler(0)]]) {
  const float3 C0 = float3(0.027, 0.039, 0.075);  // the jar's dark
  const float3 C1 = float3(0.110, 0.200, 0.430);  // deep mist
  const float3 C2 = float3(0.443, 0.576, 0.847);  // the frosted moon, #7193D8
  const float3 C3 = float3(0.800, 0.855, 0.965);  // its pale heart
  float T = u.time;
  float N = u.cells;

  // y down, like the simulation's grid.
  float2 p = in.position.xy / u.size * 2.0 - 1.0;
  float r = length(p);
  float aa = 2.0 / (u.size.x * 0.5);
  float mask = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (mask <= 0.0) { return float4(0.0); }

  float2 g = (p * 0.5 + 0.5) * N;
  float2 w = float2(fbm(g * 0.18 + float2(T * 0.20, 0.0)), fbm(g * 0.18 + float2(5.2, -T * 0.17))) - 0.5;
  float2 c = g + w * 3.2;
  const float R = 2.4;
  float m = 0.2 * mist.sample(s, c / N).r;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.785398;
    m += 0.1 * mist.sample(s, (c + float2(cos(a), sin(a)) * R) / N).r;
  }
  m *= 0.8 + 0.4 * fbm(g * 0.45 + float2(-T * 0.3, T * 0.12));

  float3 col = mix(C0, C1, smoothstep(0.0, 0.45, m));
  col = mix(col, C2, smoothstep(0.3, 0.95, m) * 0.9);
  col = mix(col, C3, smoothstep(0.85, 1.25, m) * 0.5);

  // Glass: darker toward the edge, with a faint rim, and a thin line of light on the upper left.
  float z = sqrt(max(0.0, 1.0 - r * r));
  col *= 0.82 + 0.18 * z;
  col += 0.05 * pow(1.0 - z, 3.0);
  float edge = smoothstep(0.80, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
  col += 0.09 * edge * smoothstep(-0.2, 0.9, -p.y * 0.8 - p.x * 0.5);

  // Dither, so the dark blues don't band.
  col += (hash(in.position.xy + fract(T * 7.0)) - 0.5) / 128.0;
  col = clamp(col, 0.0, 1.0);
  return float4(col * mask, mask);
}
"""
