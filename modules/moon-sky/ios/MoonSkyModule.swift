import ExpoModulesCore
import MetalKit
import UIKit

/**
 The night sky behind every screen, drawn live in Metal: the original sky (its brightness baked at
 16 bits into assets/moons/sky-luma.png), in the worn moon's four colours, at the screen's own
 resolution, drifting and breathing a little. The baked sky images looked fuzzy and banded on the
 phone; the user wanted the same sky, "just subtly animated and rendered natively" (2026-10-29).
 The same math runs in the moon lab (tools/moon-lab, SKY_FRAG), where the look is tuned.

 Drawn in 10-bit colour with a triangular dither, so dark gradients don't show contour lines. It
 runs at 30 frames a second, only while on screen with the app active, and holds still for Reduce
 Motion or `paused`. Until its brightness map has loaded (or if it can't), it shows nothing and the
 baked image under it stays in view.
 */
public class MoonSkyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoonSky")

    View(MoonSkyView.self) {
      Prop("colors") { (view: MoonSkyView, colors: [String]) in
        view.setColors(colors)
      }
      /// Where sky-luma.png is: a file:// or http:// URI (Metro, in development), or a path in the app.
      Prop("texture") { (view: MoonSkyView, uri: String) in
        view.setTexture(uri)
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
  private let loader: MTKTextureLoader?
  private var textureURI: String?
  var pausedByProp = false
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    let device = MTLCreateSystemDefaultDevice()
    metalView = MTKView(frame: .zero, device: device)
    renderer = device.flatMap { MoonSkyRenderer(device: $0, pixelFormat: .bgr10_xr) }
    loader = device.map { MTKTextureLoader(device: $0) }
    super.init(appContext: appContext)

    backgroundColor = .clear
    clipsToBounds = true
    // 10-bit: four times the steps of 8-bit, so the sky's dark gradients stay smooth.
    metalView.colorPixelFormat = .bgr10_xr
    metalView.isOpaque = true
    metalView.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 1)
    metalView.framebufferOnly = true
    metalView.preferredFramesPerSecond = 30
    metalView.isUserInteractionEnabled = false
    metalView.contentScaleFactor = UIScreen.main.scale
    metalView.delegate = renderer
    // Hidden until the brightness map is in, so the baked image under it shows meanwhile.
    metalView.isHidden = true
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

  func setTexture(_ uri: String) {
    guard uri != textureURI, let loader else { return }
    textureURI = uri
    let options: [MTKTextureLoader.Option: Any] = [
      .SRGB: false,
      .generateMipmaps: false,
      .textureUsage: NSNumber(value: MTLTextureUsage.shaderRead.rawValue),
      .textureStorageMode: NSNumber(value: MTLStorageMode.private.rawValue),
    ]
    let done: (MTLTexture?) -> Void = { [weak self] texture in
      DispatchQueue.main.async {
        guard let self, self.textureURI == uri, let texture else { return }
        self.renderer?.luma = texture
        self.metalView.isHidden = false
        self.redrawIfStill()
      }
    }
    if uri.hasPrefix("http://") || uri.hasPrefix("https://"), let url = URL(string: uri) {
      URLSession.shared.dataTask(with: url) { data, _, _ in
        guard let data else { return done(nil) }
        loader.newTexture(data: data, options: options) { texture, _ in done(texture) }
      }.resume()
    } else if let url = fileURL(uri) {
      loader.newTexture(URL: url, options: options) { texture, _ in done(texture) }
    }
  }

  /// A file:// URI, an absolute path, or a path inside the app bundle.
  private func fileURL(_ uri: String) -> URL? {
    if uri.hasPrefix("file://") { return URL(string: uri) }
    if uri.hasPrefix("/") { return URL(fileURLWithPath: uri) }
    let inBundle = Bundle.main.bundleURL.appendingPathComponent(uri)
    return FileManager.default.fileExists(atPath: inBundle.path) ? inBundle : nil
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
  var lumaSize: SIMD2<Float>
  var pad2: SIMD2<Float>
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
  var luma: MTLTexture?

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
      let luma,
      let pass = view.currentRenderPassDescriptor,
      let drawable = view.currentDrawable,
      let buffer = queue.makeCommandBuffer(),
      let encoder = buffer.makeRenderCommandEncoder(descriptor: pass)
    else { return }
    var uniforms = MoonSkyUniforms(
      size: SIMD2(Float(view.drawableSize.width), Float(view.drawableSize.height)), time: time, pad: 0,
      lumaSize: SIMD2(Float(luma.width), Float(luma.height)), pad2: .zero,
      c0: colors[0], c1: colors[1], c2: colors[2], c3: colors[3]
    )
    encoder.setRenderPipelineState(pipeline)
    encoder.setFragmentBytes(&uniforms, length: MemoryLayout<MoonSkyUniforms>.stride, index: 0)
    encoder.setFragmentTexture(luma, index: 0)
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
struct Uniforms { float2 size; float time; float pad; float2 lumaSize; float2 pad2; float4 c0; float4 c1; float4 c2; float4 c3; };

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

fragment float4 moon_sky_fragment(VOut in [[stage_in]], constant Uniforms &u [[buffer(0)]], texture2d<float> luma [[texture(0)]]) {
  constexpr sampler smooth(filter::linear, address::clamp_to_edge);
  float2 frag = in.position.xy;
  // As the app laid the sky image: covering the screen, pinned top right, then flipped upside down.
  float s = max(u.size.x / u.lumaSize.x, u.size.y / u.lumaSize.y);
  float2 drawn = u.lumaSize * s;
  float2 uv = float2((frag.x - (u.size.x - drawn.x)) / drawn.x, (u.size.y - frag.y) / drawn.y);
  // Subtly alive: the light drifts a little and breathes.
  float T = u.time;
  float2 n = float2(fbm(uv * float2(2.0, 4.0) + float2(T * 0.04, T * 0.02)), fbm(uv * float2(2.0, 4.0) + float2(5.0 - T * 0.03, 3.0 + T * 0.025)));
  uv += (n - 0.5) * 0.018;
  // 16 bits in two channels: red the high byte, green the low. Filtering each keeps the sum exact.
  float4 c = luma.sample(smooth, uv);
  float t = (c.r * 255.0 * 256.0 + c.g * 255.0) / 65535.0;
  t *= 0.96 + 0.06 * (0.5 + 0.5 * sin(T * 0.25));
  // Triangular dither of about one and a half 8-bit steps, new each frame and each channel.
  float2 seed = frag + fract(T * 7.0) * 61.0;
  float3 dn = float3(hash(seed) + hash(seed + 17.1), hash(seed + 31.7) + hash(seed + 47.3), hash(seed + 59.9) + hash(seed + 73.1)) - 1.0;
  float3 col = ramp(t, u) + dn * 1.5 / 255.0;
  return float4(col, 1.0);
}
"""
