# Sleep button: how to make it look high quality (2026-10-06)

The round Sleep button at the right end of the tab strip (`SleepButton` in
`src/components/app-tabs.tsx`, background in `src/components/moon-water.tsx`). The user
asked for moonlight moving like light on water inside it (2026-10-06). A deeper-blue
recolour was tried and rejected the same day, so the fix is structural, not a hue swap.

## Why the current one doesn't look premium

At 52pt the button is drawn from seven layers: a base gradient, four drifting radial
"pools", a dark rim and a gloss. Each problem below is a known tell of cheap gradients.

1. **Too much going on for 52pt.** Four soft blobs crossing each other at that size read
   as a blurry blue smear (a lava lamp), not as light on water. Premium orbs (Siri, the
   `metasidd/Orb` SwiftUI package) look rich because they're big, or because a small one
   uses one or two large, slow forms.
2. **The white pools fight the white moon.** The brightest thing in the button keeps
   drifting under the icon, so the icon's contrast keeps changing. That's why it felt
   like it needed "more contrast". Darkening every colour only made it duller.
3. **Mid "UI blue".** `#4A93E0` and `#5FA6EC` are close to system link blue. They read as
   a default colour rather than a night sky. Gradients look generic when they mix too
   many hues or interpolate through a muddy middle.
4. **No crisp edge.** The circle is just clipped, with no hairline. Next to the flat,
   sharp grey and white buttons it looks out of focus. Premium buttons (Liquid Glass,
   good Dribbble orbs) all have a defined rim: a 0.5–1pt light edge strongest at the top.
5. **The 2008 "Aqua" gloss.** A symmetric white radial highlight in the top-left is the
   classic skeuomorphic gloss. Modern highlights are thin edge lights, not a blob.
6. **Banding.** Smooth dark-blue SVG gradients step visibly on many screens. The standard
   fix is a faint still noise/grain layer (about 4–7% opacity) that doesn't move with the
   animation.

The reference itself (`docs/design-references/rounded-panel-nav.png`) is useful here. Its
standout button is one smooth multi-hue gradient that holds still, with a crisp dark
glyph. It looks expensive because it's simple and sharp, not because it moves.

## Options

### A. Simplified moonlit water (recommended)
Keep the idea the user asked for, but cut it down to what reads at 52pt:
- A deep night base: two close tones (navy → indigo), no mid blue.
- **One** soft pale-blue band of moonlight drifting slowly (20–30s) across the lower part
  of the circle, like a reflection under the moon. It never passes under the icon's
  centre, so the moon keeps its contrast.
- A 0.75pt hairline rim: white at about 25% at the top, fading to nothing at the bottom.
- A faint grain layer to kill banding.
- No blob gloss. The moon stays white.
Uses what's installed (react-native-svg + Reanimated). It's a rewrite of
`moon-water.tsx`, not new dependencies.

### B. True mesh gradient via a Skia shader
A shader-drawn mesh or domain-warped gradient (the technique behind Siri-style orbs and
SwiftUI `MeshGradient`). Perfectly smooth, dithered so there's no banding, organic motion.
Highest ceiling. Costs: adding `@shopify/react-native-skia` (a large native dependency,
needs a new dev build), and shader code to tune. Ready-made examples exist (Reacticx
"Mesh Gradient" and "Unstable Orb").

### C. Native Liquid Glass circle
`GlassView` from `expo-glass-effect` (already installed), tinted navy, `isInteractive`,
with the moon symbol on top. You get Apple's specular highlight and press shimmer for free
on iOS 26. Catch: glass shows what's behind it, and behind this button is the flat black
strip. It would mostly read as a plain tinted circle. It only falls back to a regular
View below iOS 26 and elsewhere.

### D. A static gradient, like the reference
Drop the motion: one carefully picked two-tone gradient plus the rim and grain from A.
Very crisp and the most consistent with the reference. It loses the moving water the
user asked for.

### Small touches that go with any option
- An SF Symbol effect on press (a subtle bounce of `moon.fill`) via `symbolEffect` in
  `@expo/ui`.
- Keep the press scale already in place (0.9 spring).
- Reduce Motion: everything holds still (already handled).

## Hard limits
- No outer glow, halo or coloured shadow (CLAUDE.md). Everything stays clipped inside
  the circle; the moving light inside it is the glow the user asked for.
- Restrained motion (see the app-sleep animation feedback): no particles or sparkles.

## Sources
- Grainy gradients and banding: https://instantgradient.com/blog/grainy-gradients
- Cheap vs premium gradients: https://21st.dev/blog/css-gradient-components-react
- SwiftUI Orb package (layer breakdown): https://swiftpackageregistry.com/metasidd/Orb
- Mesh gradients (iOS 18): https://www.donnywals.com/getting-started-with-mesh-gradients-on-ios-18/
- Skia mesh gradient: https://reacticx.com/docs/components/mesh-gradient
- Liquid Glass in iOS 26: https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/3
- Custom Liquid Glass UI: https://www.donnywals.com/designing-custom-ui-with-liquid-glass-on-ios-26/
- expo-glass-effect (SDK 57): https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/

## Decision (2026-10-06)

The user saw 20 live shader studies (`docs/design-references/orbs/orb-studies.html`,
references beside it) and picked **02 Moonwell**, asking for it to be native Swift for the
best quality on the phone. It's built as the local Expo module `modules/moon-orb`: an
`MTKView` running a Metal fragment shader (a port of the WebGL study with Moonwell's
settings baked in), compiled from source at runtime so the pod needs no .metal build step.
It draws at native scale with dithering, runs at 60fps only while on screen and the app is
active, holds still with Reduce Motion, and brightens and speeds up while pressed.
`SleepButton` uses it when the module is in the binary and falls back to the SVG
`MoonWater` otherwise (older dev builds, web). Needs a new dev build (`eas build`) to show.
