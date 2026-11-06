// Bedroom personality for ONE MORE VIDEO. Both rows share the room; the bottom row's version is
// messier (curtains half drawn, laundry on the chair, clothes on the floor, cans on the nightstand).
import { Box } from '../five/set';

function Poster({ x, y, w, h, colors }: { x: number; y: number; w: number; h: number; colors: string[] }) {
  return (
    <group position={[x, y, -1.585]}>
      <Box p={[0, 0, 0]} s={[w + 0.05, h + 0.05, 0.02]} c="#1e1d22" cast={false} />
      {colors.map((c, i) => (
        <Box key={i} p={[0, h / 2 - (h / colors.length) * (i + 0.5), 0.012]} s={[w, h / colors.length, 0.005]} c={c} cast={false} />
      ))}
    </group>
  );
}

function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.32, 18]} />
        <meshLambertMaterial color="#b0653f" />
      </mesh>
      {[
        [0, 0.55, 0, 0.17],
        [-0.12, 0.45, 0.04, 0.13],
        [0.12, 0.48, -0.03, 0.14],
        [0.02, 0.72, 0.02, 0.12],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow>
          <sphereGeometry args={[r, 14, 10]} />
          <meshLambertMaterial color={i % 2 ? '#4f7a4c' : '#5f8d58'} />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ x, z, laundry }: { x: number; z: number; laundry: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.45, 0]} s={[0.45, 0.05, 0.42]} c="#6b4a38" />
      <Box p={[0.2, 0.75, 0]} s={[0.05, 0.6, 0.42]} c="#6b4a38" />
      {[
        [-0.19, -0.18],
        [-0.19, 0.18],
        [0.19, -0.18],
        [0.19, 0.18],
      ].map(([lx, lz], i) => (
        <Box key={i} p={[lx, 0.22, lz]} s={[0.04, 0.44, 0.04]} c="#5a3d2e" />
      ))}
      {laundry && (
        <group>
          <Box p={[0, 0.53, 0]} s={[0.4, 0.12, 0.38]} c="#7a6e8f" />
          <Box p={[0.05, 0.62, 0.02]} s={[0.3, 0.08, 0.3]} c="#c9a26b" />
          <Box p={[0.16, 0.9, -0.05]} s={[0.06, 0.4, 0.3]} c="#7a6e8f" />
        </group>
      )}
    </group>
  );
}

export function BedroomProps({ messy, curtainsOpen }: { messy: boolean; curtainsOpen: number }) {
  // curtain panels slide from the window's edges (open) towards the middle (closed)
  const cw = 0.18 + 0.32 * (1 - curtainsOpen);
  return (
    <group>
      <Poster x={0.85} y={1.75} w={0.55} h={0.75} colors={['#e3b448', '#d0603d', '#2f4d6b']} />
      <Poster x={4.15} y={1.75} w={0.45} h={0.6} colors={['#9cc5c0', '#f2efe6', '#9cc5c0']} />
      <Plant x={0.15} z={-1.25} />
      <Chair x={4.85} z={-1.1} laundry={messy} />
      {/* rug */}
      <Box p={[2.5, 0.012, -0.15]} s={[2.2, 0.015, 0.9]} c={messy ? '#5b4f6a' : '#6d6280'} cast={false} />
      {/* curtains + rail */}
      <Box p={[2.2, 2.42, -1.55]} s={[1.6, 0.04, 0.04]} c="#3a3a3e" cast={false} />
      <Box p={[2.2 - 0.62 + cw / 2, 1.85, -1.54]} s={[cw, 1.15, 0.03]} c="#5e6f9e" />
      <Box p={[2.2 + 0.62 - cw / 2, 1.85, -1.54]} s={[cw, 1.15, 0.03]} c="#5e6f9e" />
      {messy && (
        <group>
          {/* clothes on the floor, cans on the nightstand */}
          <Box p={[3.4, 0.03, 0.25]} s={[0.5, 0.05, 0.3]} c="#7a6e8f" cast={false} />
          <Box p={[1.2, 0.03, 0.05]} s={[0.35, 0.04, 0.45]} c="#3f5f7f" cast={false} />
          {[0, 1].map((i) => (
            <mesh key={i} position={[4.33 - i * 0.09, 0.71, -1.35 + i * 0.05]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.12, 12]} />
              <meshLambertMaterial color={i ? '#c9423c' : '#8fb7d6'} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
