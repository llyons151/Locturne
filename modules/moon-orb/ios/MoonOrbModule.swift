import ExpoModulesCore
import MetalKit
import UIKit

/**
 The Sleep button's orb: "Moonwell", study 02 of docs/design-references/orbs/orb-studies.html,
 which the user picked (2026-10-06). Moonlight sinking into deep water under a glass skin.

 Drawn by a Metal fragment shader at the screen's native scale, so it stays sharp and smooth
 at 52pt where the SVG version (`moon-water.tsx`) blurred into a smear. The shader is compiled
 from source at runtime, so no .metal build step is needed in the pod.
 */
public class MoonOrbModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoonOrb")

    View(MoonOrbView.self) {
      Prop("pressed") { (view: MoonOrbView, pressed: Bool) in
        view.setPressed(pressed)
      }
      Prop("paused") { (view: MoonOrbView, paused: Bool) in
        view.pausedByProp = paused
        view.updateRunning()
      }
    }
  }
}

final class MoonOrbView: ExpoView {
  private let metalView: MTKView
  private let renderer: MoonOrbRenderer?
  var pausedByProp = false
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    let device = MTLCreateSystemDefaultDevice()
    metalView = MTKView(frame: .zero, device: device)
    renderer = device.flatMap { MoonOrbRenderer(device: $0, pixelFormat: .bgra8Unorm) }
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
      // No point drawing frames nobody sees.
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
  }

  func setPressed(_ pressed: Bool) {
    renderer?.targetPress = pressed ? 1 : 0
    // When the loop is stopped, show the press state in one redraw.
    if metalView.isPaused {
      renderer?.press = pressed ? 1 : 0
      metalView.setNeedsDisplay()
    }
  }

  /// Run the frame loop only while the orb is on screen, the app is active, and motion is on.
  /// Otherwise draw one still frame on demand.
  func updateRunning() {
    let still = pausedByProp || UIAccessibility.isReduceMotionEnabled
    let visible = window != nil && UIApplication.shared.applicationState != .background
    renderer?.moving = !still
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
    if metalView.isPaused { metalView.setNeedsDisplay() }
  }
}

private struct MoonOrbUniforms {
  var size: SIMD2<Float>
  var time: Float
  var press: Float
}

final class MoonOrbRenderer: NSObject, MTKViewDelegate {
  private let queue: MTLCommandQueue
  private let pipeline: MTLRenderPipelineState
  /// Start somewhere in the middle of the drift rather than at the same frame every launch.
  private var time = Float.random(in: 0..<40)
  private var last = CACurrentMediaTime()
  var press: Float = 0
  var targetPress: Float = 0
  var moving = true

  init?(device: MTLDevice, pixelFormat: MTLPixelFormat) {
    guard
      let queue = device.makeCommandQueue(),
      let library = try? device.makeLibrary(source: moonOrbShaderSource, options: nil),
      let vertex = library.makeFunction(name: "moon_orb_vertex"),
      let fragment = library.makeFunction(name: "moon_orb_fragment")
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
    let dt = Float(min(0.05, now - last))
    last = now
    press += (targetPress - press) * min(1, dt * 9)
    // Moonwell's pace from the studies (0.45), quicker while held.
    if moving { time += dt * 0.45 * (1 + press * 1.6) }

    guard
      let pass = view.currentRenderPassDescriptor,
      let drawable = view.currentDrawable,
      let buffer = queue.makeCommandBuffer(),
      let encoder = buffer.makeRenderCommandEncoder(descriptor: pass)
    else { return }
    var uniforms = MoonOrbUniforms(
      size: SIMD2(Float(view.drawableSize.width), Float(view.drawableSize.height)),
      time: time,
      press: press
    )
    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<MoonOrbUniforms>.stride, index: 0)
    encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
    encoder.endEncoding()
    buffer.present(drawable)
    buffer.commit()
  }
}

/// Moonwell: deep navy liquid with a pale band of moonlight, folded by domain-warped noise,
/// bulged as if behind curved glass, with a rim light and a fine highlight. A port of the
/// WebGL study, with Moonwell's settings baked in. Output is premultiplied alpha.
private let moonOrbShaderSource = """
#include <metal_stdlib>
using namespace metal;

struct VOut { float4 position [[position]]; };
struct Uniforms { float2 size; float time; float press; };

vertex VOut moon_orb_vertex(uint vid [[vertex_id]]) {
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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v / 0.9375;
}

fragment float4 moon_orb_fragment(VOut in [[stage_in]], constant Uniforms &u [[buffer(0)]]) {
  const float3 C0 = float3(0.016, 0.039, 0.122);  // #040A1F
  const float3 C1 = float3(0.071, 0.235, 0.549);  // #123C8C
  const float3 C2 = float3(0.369, 0.608, 0.918);  // #5E9BEA
  const float3 C3 = float3(0.914, 0.953, 1.0);    // #E9F3FF
  const float warp = 1.1, swirl = 0.15, core = 0.25, glass = 0.55;
  const float ribbons = 0.2, spec = 0.8, shade = 0.5;
  float T = u.time;

  // y up, so the light sits top-left as in the study.
  float2 frag = float2(in.position.x, u.size.y - in.position.y);
  float2 p = frag / u.size * 2.0 - 1.0;
  float rad = 1.0;
  float r = length(p) / rad;
  float aa = 2.0 / (u.size.x * 0.5);
  float mask = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (mask <= 0.0) { return float4(0.0); }

  float2 q = p / rad;
  float z = sqrt(max(0.0, 1.0 - min(dot(q, q), 1.0)));
  float3 n = float3(q, z);

  float2 uv = q * (1.0 - 0.38 * (1.0 - z));
  float a = swirl * (1.0 - r) * 1.6 + T * 0.12 * swirl;
  uv = float2x2(float2(cos(a), -sin(a)), float2(sin(a), cos(a))) * uv;
  uv *= 1.35;

  float2 w1 = float2(fbm(uv * 1.1 + float2(0.0, T * 0.13)), fbm(uv * 1.1 + float2(5.2, 1.3) - T * 0.11));
  float2 w2 = float2(fbm(uv + warp * 2.0 * w1 + float2(1.7, 9.2) + T * 0.09),
                     fbm(uv + warp * 2.0 * w1 + float2(8.3, 2.8) - T * 0.07));
  float f = fbm(uv + warp * 2.0 * w2);

  float3 col = mix(C0, C1, smoothstep(0.25, 0.75, w2.x));
  col = mix(col, C2, smoothstep(0.4, 0.85, f));
  col = mix(col, C3, smoothstep(0.62, 0.95, w1.y * 0.6 + f * 0.5) * 0.85);

  float layer = 0.5 + 0.5 * sin(6.2832 * (f * 2.2 + w2.y * 0.7 + T * 0.03));
  col *= mix(1.0, 0.8 + 0.32 * layer, ribbons);
  col += ribbons * 0.2 * pow(layer, 10.0) * (C3 * 0.6 + 0.4);

  col *= mix(1.0, smoothstep(0.05, 0.92, r), core);

  float3 L = normalize(float3(-0.45, 0.6, 0.75));
  col *= mix(1.0, 0.55 + 0.6 * max(dot(n, L), 0.0), shade);

  float fres = pow(1.0 - z, 2.6);
  col += glass * fres * 0.85;

  float3 H = normalize(L + float3(0.0, 0.0, 1.0));
  col += spec * 0.9 * pow(max(dot(n, H), 0.0), 90.0);
  float edge = smoothstep(0.84, 0.965, r) * (1.0 - smoothstep(0.965, 1.0, r));
  col += spec * 0.28 * edge * smoothstep(-0.1, 0.9, q.y * 0.9 - q.x * 0.4);

  col *= 1.0 + 0.18 * u.press;
  // Dither, so the dark blues don't band.
  col += (hash(frag + fract(T * 7.0)) - 0.5) / 128.0;
  col = clamp(col, 0.0, 1.0);
  return float4(col * mask, mask);
}
"""
