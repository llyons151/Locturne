import ExpoModulesCore
import MetalKit
import UIKit

/**
 The night sky behind every screen, drawn live by a Metal shader at the screen's own resolution:
 wide, slowly drifting sweeps of light gathered round the resting moon, in the worn moon's four
 colours, dithered so the dark gradients never band. It replaces the baked sky image, which looked
 fuzzy and low-res on the phone (user, 2026-10-29: "drawn live … native Swift"). The same math runs
 in the moon lab (tools/moon-lab, SKY_FRAG), where the look is tuned.

 It runs at 30 frames a second, only while on screen with the app active, and holds still for
 Reduce Motion or `paused`, drawing one frame on demand instead.
 */
public class MoonSkyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoonSky")

    View(MoonSkyView.self) {
      Prop("colors") { (view: MoonSkyView, colors: [String]) in
        view.setColors(colors)
      }
      Prop("anchor") { (view: MoonSkyView, anchor: [Double]) in
        view.setAnchor(anchor)
      }
      Prop("paused") { (view: MoonSkyView, paused: Bool) in
        view.pausedByProp = paused
        view.updateRunning()
      }
    }
  }
}

final class MoonSkyView: ExpoView {
  private let metalView: MTKView
  private let renderer: MoonSkyRenderer?
  var pausedByProp = false
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    let device = MTLCreateSystemDefaultDevice()
    metalView = MTKView(frame: .zero, device: device)
    renderer = device.flatMap { MoonSkyRenderer(device: $0, pixelFormat: .bgra8Unorm) }
    super.init(appContext: appContext)

    backgroundColor = .black
    clipsToBounds = true
    metalView.colorPixelFormat = .bgra8Unorm
    metalView.isOpaque = true
    metalView.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 1)
    metalView.framebufferOnly = true
    metalView.preferredFramesPerSecond = 30
    metalView.isUserInteractionEnabled = false
    metalView.contentScaleFactor = UIScreen.main.scale
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
      // Not willEnterForeground: the app still reads as .background there (as MoonOrbView).
      center.addObserver(
        forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
      ) { [weak self] _ in self?.updateRunning() },
    ]
    updateRunning()
  }

  deinit {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
  }

  func setColors(_ hexes: [String]) {
    var parsed = hexes.compactMap(skyColor)
    while !parsed.isEmpty && parsed.count < 4 { parsed.append(parsed[parsed.count - 1]) }
    if parsed.count >= 4 { renderer?.colors = Array(parsed.prefix(4)) }
    redrawIfStill()
  }

  func setAnchor(_ anchor: [Double]) {
    guard anchor.count == 3 else { return }
    renderer?.anchor = SIMD3(Float(anchor[0]), Float(anchor[1]), Float(anchor[2]))
    redrawIfStill()
  }

  private func redrawIfStill() {
    if metalView.isPaused { metalView.setNeedsDisplay() }
  }

  /// Run the frame loop only while on screen, the app is active, and motion is on; otherwise one still frame.
  func updateRunning() {
    let still = pausedByProp || UIAccessibility.isReduceMotionEnabled
    let visible = window != nil && UIApplication.shared.applicationState != .background
    let run = visible && !still
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
    redrawIfStill()
  }
}

private struct MoonSkyUniforms {
  var size: SIMD2<Float>
  var time: Float
  var pad: Float
  /// The resting moon in pixels: centre x, centre y (down from the top), radius; w unused.
  var moon: SIMD4<Float>
  var c0: SIMD4<Float>
  var c1: SIMD4<Float>
  var c2: SIMD4<Float>
  var c3: SIMD4<Float>
}

/// Today's sky (Moonlight in the moon lab) until the app passes the worn moon's.
private let moonlightSky: [SIMD4<Float>] = ["#05060A", "#1C2A55", "#2C3F78", "#2C3F78"].compactMap(skyColor)

/// "#RRGGBB" to a colour the shader reads, or nil.
private func skyColor(_ hex: String) -> SIMD4<Float>? {
  let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
  guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
  return SIMD4(Float((value >> 16) & 0xFF) / 255, Float((value >> 8) & 0xFF) / 255, Float(value & 0xFF) / 255, 1)
}

final class MoonSkyRenderer: NSObject, MTKViewDelegate {
  private let queue: MTLCommandQueue
  private let pipeline: MTLRenderPipelineState
  /// Start somewhere in the middle of the drift rather than at the same frame every launch.
  private var time = Float.random(in: 0..<200)
  private var last = CACurrentMediaTime()
  var colors = moonlightSky
  /// In points; scaled to pixels when drawn.
  var anchor = SIMD3<Float>(0, 0, 0)

  init?(device: MTLDevice, pixelFormat: MTLPixelFormat) {
    guard
      let queue = device.makeCommandQueue(),
      let library = try? device.makeLibrary(source: moonSkyShaderSource, options: nil),
      let vertex = library.makeFunction(name: "moon_sky_vertex"),
      let fragment = library.makeFunction(name: "moon_sky_fragment")
    else { return nil }
    let descriptor = MTLRenderPipelineDescriptor()
    descriptor.vertexFunction = vertex
    descriptor.fragmentFunction = fragment
    descriptor.colorAttachments[0].pixelFormat = pixelFormat
    guard let pipeline = try? device.makeRenderPipelineState(descriptor: descriptor) else { return nil }
    self.queue = queue
    self.pipeline = pipeline
  }

  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

  func draw(in view: MTKView) {
    let now = CACurrentMediaTime()
    if !view.isPaused { time += Float(min(0.1, now - last)) }
    last = now
    guard
      colors.count == 4,
      let pass = view.currentRenderPassDescriptor,
      let drawable = view.currentDrawable,
      let buffer = queue.makeCommandBuffer(),
      let encoder = buffer.makeRenderCommandEncoder(descriptor: pass)
    else { return }
    let scale = Float(view.contentScaleFactor)
    // No anchor yet: the bottom middle, a moon as wide as the screen.
    let width = Float(view.drawableSize.width), height = Float(view.drawableSize.height)
    let moon = anchor.z > 0
      ? SIMD4(anchor.x * scale, anchor.y * scale, anchor.z * scale, 0)
      : SIMD4(width / 2, height + width * 0.14, width * 0.45, 0)
    var uniforms = MoonSkyUniforms(
      size: SIMD2(width, height), time: time, pad: 0, moon: moon,
      c0: colors[0], c1: colors[1], c2: colors[2], c3: colors[3]
    )
    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<MoonSkyUniforms>.stride, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    buffer.present(drawable)
    buffer.commit()
  }
}

/// SKY_FRAG from the moon lab, in Metal. Positions are pixels with y down, as in.position gives them.
private let moonSkyShaderSource = """
#include <metal_stdlib>
using namespace metal;

struct VOut { float4 position [[position]]; };
struct Uniforms { float2 size; float time; float pad; float4 moon; float4 c0; float4 c1; float4 c2; float4 c3; };

vertex VOut moon_sky_vertex(uint vid [[vertex_id]]) {
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
  float2x2 m = float2x2(float2(1.6, 1.2), float2(-1.2, 1.6));
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v / 0.875;
}

static float3 ramp(float t, constant Uniforms &u) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(u.c0.rgb, u.c1.rgb, t);
  if (t < 2.0) return mix(u.c1.rgb, u.c2.rgb, t - 1.0);
  return mix(u.c2.rgb, u.c3.rgb, t - 2.0);
}

fragment float4 moon_sky_fragment(VOut in [[stage_in]], constant Uniforms &u [[buffer(0)]]) {
  float2 frag = in.position.xy;
  float2 p = (frag - u.moon.xy) / u.moon.z;
  float T = u.time * 0.05;
  float2 q = frag / u.moon.z * 1.1;
  float2 w = float2(fbm(q * 0.6 + float2(T, -0.6 * T)), fbm(q * 0.6 + float2(5.2 - 0.7 * T, 1.3 + 0.4 * T)));
  // Flattened: wide sweeps of light across the sky, not rings round the moon.
  float r = length(float2(p.x * 0.55, p.y)) + (w.x - 0.5) * 0.75 + (w.y - 0.5) * 0.25 * p.x;
  float ang = atan2(p.x, -p.y);
  float rings = 0.95 * exp(-pow((r - 1.18) / 0.15, 2.0)) + 0.65 * exp(-pow((r - 1.6) / 0.2, 2.0))
    + 0.3 * exp(-pow((r - 2.15) / 0.28, 2.0));
  float haze = exp(-max(r - 1.0, 0.0) * 1.5);
  float side = 0.6 + 0.4 * sin(ang * 1.4 + 0.9 + (w.y - 0.5) * 2.5);
  float patches = 0.55 + 0.9 * fbm(q * 0.9 + w * 1.6 - T * 0.5);
  // The light stays low, round the moon: the top of the sky (where the time sits) is near black.
  float low = smoothstep(0.15, 0.62, frag.y / u.size.y);
  float t = (rings * side * patches * 0.72 + haze * 0.45) * low;
  t = 1.0 - exp(-t * 1.25);
  float3 col = ramp(t, u) + (hash(frag + fract(u.time)) - 0.5) / 255.0;
  return float4(col, 1.0);
}
"""
