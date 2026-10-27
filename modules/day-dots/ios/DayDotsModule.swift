import CoreMotion
import ExpoModulesCore
import MetalKit
import UIKit

/**
 The reveal's day dots (user 2026-10-26: "make the dots look premium with native Swift"), one per
 day, drawn by a Metal fragment shader at the screen's own scale, so every dot is a crisp pearl
 rather than a flat SVG circle:

 - Each dot is shaded like a tiny pearl: a touch darker at its rim, a pinpoint highlight up and to
   the left.
 - Dots arrive with a spring: they pop in a little past full size and settle, a few at once, as
   the fill runs.
 - Once full, a soft band of light sweeps slowly across them, and tilting the phone moves it. The
   light stays inside the dots: nothing is drawn around them (no glow, CLAUDE.md).
 - On the way out to `build` the rows drop off the screen, lowest first, like the SVG version.

 The fill runs on the JS side's clock (`fillStart`, epoch ms), so the dots and the JS haptic ticks
 stay together without a prop per frame. The shader is compiled from source at runtime, like
 MoonOrb's, so no .metal build step is needed in the pod.
 */
public class DayDotsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DayDots")

    View(DayDotsView.self) {
      Prop("total") { (view: DayDotsView, value: Double) in view.renderer?.total = Float(value) }
      Prop("cols") { (view: DayDotsView, value: Double) in view.renderer?.cols = Float(value) }
      Prop("pitch") { (view: DayDotsView, value: Double) in view.renderer?.pitch = Float(value) }
      Prop("fillStart") { (view: DayDotsView, value: Double) in view.renderer?.fillStart = value }
      Prop("fillMs") { (view: DayDotsView, value: Double) in view.renderer?.fillMs = value }
      Prop("falling") { (view: DayDotsView, value: Bool) in view.renderer?.setFalling(value) }
      Prop("fallMs") { (view: DayDotsView, value: Double) in view.renderer?.fallMs = Float(value) }
      Prop("stagger") { (view: DayDotsView, value: Double) in view.renderer?.stagger = Float(value) }
      Prop("fallDistance") { (view: DayDotsView, value: Double) in view.renderer?.fallDistance = Float(value) }
    }
  }
}

final class DayDotsView: ExpoView {
  private let metalView: MTKView
  let renderer: DayDotsRenderer?
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    let device = MTLCreateSystemDefaultDevice()
    metalView = MTKView(frame: .zero, device: device)
    renderer = device.flatMap { DayDotsRenderer(device: $0, pixelFormat: .bgra8Unorm) }
    super.init(appContext: appContext)

    backgroundColor = .clear
    isUserInteractionEnabled = false
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
        forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.updateRunning() },
    ]
    updateRunning()
  }

  deinit {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    renderer?.stopMotion()
  }

  func updateRunning() {
    let visible = window != nil && UIApplication.shared.applicationState != .background
    let still = UIAccessibility.isReduceMotionEnabled
    renderer?.still = still
    // Reduce Motion still redraws while the dots fill, so it runs; it just has no pop or sheen.
    metalView.isPaused = !visible
    metalView.enableSetNeedsDisplay = !visible
    if visible && !still { renderer?.startMotion() } else { renderer?.stopMotion() }
    if !visible { metalView.setNeedsDisplay() }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateRunning()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    metalView.frame = bounds
  }
}

/** Matches `Uniforms` in the shader: one float2, then floats, in this order. */
private struct DayDotsUniforms {
  var size: SIMD2<Float>
  var scale: Float
  var time: Float
  var pitch: Float
  var cols: Float
  var rows: Float
  var shown: Float
  var total: Float
  var fall: Float
  var fallMs: Float
  var stagger: Float
  var fallDistance: Float
  var settle: Float
  var tiltX: Float
  var tiltY: Float
  var still: Float
}

final class DayDotsRenderer: NSObject, MTKViewDelegate {
  private let queue: MTLCommandQueue
  private let pipeline: MTLRenderPipelineState
  private let start = CACurrentMediaTime()
  private let motion = CMMotionManager()
  private var tilt = SIMD2<Float>(0, 0)
  private var fallBegan: CFTimeInterval = 0

  var total: Float = 0
  var cols: Float = 1
  var pitch: Float = 14
  var fillStart: Double = 0
  var fillMs: Double = 1900
  var fallMs: Float = 520
  var stagger: Float = 30
  var fallDistance: Float = 600
  var still = false

  init?(device: MTLDevice, pixelFormat: MTLPixelFormat) {
    guard
      let queue = device.makeCommandQueue(),
      let library = try? device.makeLibrary(source: dayDotsShaderSource, options: nil),
      let vertex = library.makeFunction(name: "day_dots_vertex"),
      let fragment = library.makeFunction(name: "day_dots_fragment")
    else { return nil }
    let descriptor = MTLRenderPipelineDescriptor()
    descriptor.vertexFunction = vertex
    descriptor.fragmentFunction = fragment
    descriptor.colorAttachments[0].pixelFormat = pixelFormat
    guard let pipeline = try? device.makeRenderPipelineState(descriptor: descriptor) else { return nil }
    self.queue = queue
    self.pipeline = pipeline
  }

  func setFalling(_ falling: Bool) {
    if falling && fallBegan == 0 { fallBegan = CACurrentMediaTime() }
    if !falling { fallBegan = 0 }
  }

  /** The phone's tilt moves the sheen. Device motion needs no permission (not Motion & Fitness). */
  func startMotion() {
    guard motion.isDeviceMotionAvailable, !motion.isDeviceMotionActive else { return }
    motion.deviceMotionUpdateInterval = 1.0 / 30.0
    motion.startDeviceMotionUpdates()
  }

  func stopMotion() {
    if motion.isDeviceMotionActive { motion.stopDeviceMotionUpdates() }
  }

  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  func draw(in view: MTKView) {
    let now = CACurrentMediaTime()
    let wall = Date().timeIntervalSince1970 * 1000
    // How far the fill is, in dots, on the JS side's curve (its ease is cubic-bezier(.4, 0, .2, 1)).
    var shown: Float = 0
    var settle: Float = 0
    if fillStart > 0 {
      let t = min(1, max(0, (wall - fillStart) / max(1, fillMs)))
      shown = Float(fillEase(t)) * total
      settle = Float(min(1, max(0, (wall - fillStart - fillMs) / 700)))
    }
    if still { shown = fillStart > 0 ? total : 0 }
    if let gravity = motion.deviceMotion?.gravity {
      // Eased toward the phone's tilt, so the sheen drifts rather than jitters.
      let target = SIMD2<Float>(Float(gravity.x), Float(gravity.y + 0.6))
      tilt += (target - tilt) * 0.12
    }

    guard
      let pass = view.currentRenderPassDescriptor,
      let drawable = view.currentDrawable,
      let buffer = queue.makeCommandBuffer(),
      let encoder = buffer.makeRenderCommandEncoder(descriptor: pass)
    else { return }
    let scale = Float(view.contentScaleFactor)
    var uniforms = DayDotsUniforms(
      size: SIMD2(Float(view.drawableSize.width), Float(view.drawableSize.height)),
      scale: scale,
      time: still ? 0 : Float(now - start),
      pitch: pitch,
      cols: max(1, cols),
      rows: cols > 0 ? ceil(total / max(1, cols)) : 0,
      shown: shown,
      total: total,
      fall: fallBegan > 0 ? Float((now - fallBegan) * 1000) : -1,
      fallMs: fallMs,
      stagger: stagger,
      fallDistance: fallDistance,
      settle: settle,
      tiltX: tilt.x,
      tiltY: tilt.y,
      still: still ? 1 : 0
    )
    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<DayDotsUniforms>.stride, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    buffer.present(drawable)
    buffer.commit()
  }
}

/** CSS's cubic-bezier(0.4, 0, 0.2, 1), the JS side's fill curve. */
private func fillEase(_ t: Double) -> Double {
  let (x1, y1, x2, y2) = (0.4, 0.0, 0.2, 1.0)
  let cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  let cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  func x(_ s: Double) -> Double { ((ax * s + bx) * s + cx) * s }
  func y(_ s: Double) -> Double { ((ay * s + by) * s + cy) * s }
  if t <= 0 { return 0 }
  if t >= 1 { return 1 }
  var lo = 0.0, hi = 1.0, s = t
  for _ in 0..<24 {
    if x(s) < t { lo = s } else { hi = s }
    s = (lo + hi) / 2
  }
  return y(s)
}

private let dayDotsShaderSource = """
#include <metal_stdlib>
using namespace metal;

struct VOut { float4 position [[position]]; };
struct Uniforms {
  float2 size; float scale; float time; float pitch; float cols; float rows; float shown; float total;
  float fall; float fallMs; float stagger; float fallDistance; float settle; float tiltX; float tiltY; float still;
};

vertex VOut day_dots_vertex(uint vid [[vertex_id]]) {
  float2 corners[3] = { float2(-1.0, -1.0), float2(3.0, -1.0), float2(-1.0, 3.0) };
  VOut out;
  out.position = float4(corners[vid], 0.0, 1.0);
  return out;
}

// How far row k has dropped, 0 to 1: the lowest row first, gathering speed.
static float dropOf(float k, constant Uniforms &u) {
  float t = clamp((u.fall - (u.rows - 1.0 - k) * u.stagger) / u.fallMs, 0.0, 1.0);
  return t * t * t;
}

// A spring's settle, 0 to 1 with a small overshoot (easeOutBack).
static float popOf(float a) {
  const float c = 1.9;
  float x = a - 1.0;
  return 1.0 + (c + 1.0) * x * x * x + c * x * x;
}

fragment float4 day_dots_fragment(VOut in [[stage_in]], constant Uniforms &u [[buffer(0)]]) {
  // Points, from the top left.
  float2 p = in.position.xy / u.scale;
  float col = floor(p.x / u.pitch);
  if (col >= u.cols || u.shown <= 0.0) { return float4(0.0); }

  // Which row is here: its own place, or, falling, wherever it has dropped to.
  float row = -1.0, y = 0.0, fade = 1.0;
  if (u.fall < 0.0) {
    row = floor(p.y / u.pitch);
    y = p.y - row * u.pitch;
  } else {
    for (int i = 0; i < 400; i++) {
      float k = float(i);
      if (k >= u.rows) { break; }
      float d = dropOf(k, u);
      float top = k * u.pitch + d * u.fallDistance;
      if (p.y >= top && p.y < top + u.pitch) { row = k; y = p.y - top; fade = 1.0 - d; break; }
    }
  }
  if (row < 0.0 || row >= u.rows) { return float4(0.0); }
  float idx = row * u.cols + col;
  if (idx >= u.total || idx >= ceil(u.shown)) { return float4(0.0); }

  // The pop: each dot springs in as the fill passes it, a little past full size, and settles.
  float arrived = clamp((u.shown - idx) / max(6.0, u.cols * 0.6), 0.0, 1.0);
  float size = u.still > 0.5 ? 1.0 : popOf(arrived);

  // Where the sheen is: a soft diagonal band sweeping across every few seconds, nudged by tilt.
  float2 g = float2(col, row) / max(u.cols, u.rows);
  float band = (g.x + g.y) * 0.5 + u.tiltX * 0.25 - u.tiltY * 0.2;
  float sweep = fract(u.time / 4.5) * 1.8 - 0.4;
  float off = (band - sweep) / 0.09;
  float sheen = u.still > 0.5 ? 0.0 : exp(-off * off) * u.settle;

  float r = u.pitch * 0.36 * size * (1.0 + 0.06 * sheen);
  float2 local = float2(p.x - (col + 0.5) * u.pitch, y - 0.5 * u.pitch) / r;
  float d = length(local);
  float px = 1.0 / (r * u.scale);
  float mask = (1.0 - smoothstep(1.0 - 1.5 * px, 1.0, d)) * fade;
  if (mask <= 0.0) { return float4(0.0); }

  // A pearl: a touch darker toward the rim, a pinpoint highlight up and to the left.
  float z = sqrt(max(0.0, 1.0 - d * d));
  float3 n = float3(local.x, -local.y, z);
  const float3 pearl = float3(0.90, 0.93, 0.98);
  float3 color = pearl * (0.80 + 0.20 * z);
  color += 0.35 * pow(max(dot(n, normalize(float3(-0.5, 0.6, 0.62))), 0.0), 18.0);
  // New dots arrive white and take the pearl as they settle; the sheen lifts them toward white.
  color = mix(color, float3(1.0), (1.0 - arrived) * 0.7 + sheen * 0.45);
  color = min(color, float3(1.0));
  return float4(color * mask, mask);
}
"""
