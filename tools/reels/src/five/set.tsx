// The dollhouse apartment: bedroom → kitchen → bathroom → front door, one long set along X.
// The back wall is at z = -1.6, the floor at y = 0, and the camera looks in from +Z.
import * as THREE from 'three';
import type { ReactNode } from 'react';

const cache = new Map<string, THREE.Texture>();
function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  if (!cache.has(key)) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d')!);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(key, t);
  }
  return cache.get(key)!;
}

export const skyTex = () =>
  canvasTex('sky', 64, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#36407a');
    g.addColorStop(0.45, '#6c5f96');
    g.addColorStop(0.8, '#d98a78');
    g.addColorStop(1, '#f0a37a');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 256);
  });

export const nightSkyTex = () =>
  canvasTex('nightsky', 128, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#070a1c');
    g.addColorStop(1, '#1a2048');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 256);
    c.fillStyle = '#e8e6f5';
    for (let i = 0; i < 26; i++) {
      const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 128;
      const y = (Math.sin(i * 47.3) * 0.5 + 0.5) * 200;
      c.fillRect(x, y, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
  });

export const clockTex = (text: string) =>
  canvasTex(`clock${text}`, 128, 64, (c) => {
    c.fillStyle = '#1a0606';
    c.fillRect(0, 0, 128, 64);
    c.fillStyle = '#ff2a2a';
    c.font = 'bold 44px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 64, 34);
  });

const tilesTex = () =>
  canvasTex('tiles', 256, 256, (c) => {
    c.fillStyle = '#8f96a3';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#6e7480';
    c.lineWidth = 3;
    for (let i = 0; i <= 256; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 256);
      c.moveTo(0, i);
      c.lineTo(256, i);
      c.stroke();
    }
  });

export const glyphTex = (g: string, color = '#e8e8ee') =>
  canvasTex(`g${g}${color}`, 128, 128, (c) => {
    c.fillStyle = color;
    c.font = 'bold 96px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(g, 64, 70);
  });

// a soft round blob: contact shadows (drawn black) and steam puffs
export const shadowTex = () =>
  canvasTex('shadow', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
export const puffTex = () =>
  canvasTex('puff', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(235,235,240,0.9)');
    g.addColorStop(1, 'rgba(235,235,240,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
// a linear fade from dark to clear, for occlusion where walls meet the floor
const fadeTex = () =>
  canvasTex('fade', 4, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 128);
  });

// soft shadow on the floor under furniture (fakes ambient occlusion, which the toon look needs)
function Contact({ x, z, w, d, o = 0.55, y = 0.006 }: { x: number; z: number; w: number; d: number; o?: number; y?: number }) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={shadowTex()} color="#000" transparent opacity={o} depthWrite={false} />
    </mesh>
  );
}
// darkening along the base of the back wall and on the floor beside it
function Seams() {
  return (
    <group>
      <mesh position={[8.5, 0.22, -1.595]}>
        <planeGeometry args={[20, 0.44]} />
        <meshBasicMaterial map={fadeTex()} color="#000" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8.5, 0.007, -1.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 0.36]} />
        <meshBasicMaterial map={fadeTex()} color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* under the ceiling */}
      <mesh position={[8.5, 2.72, -1.595]} rotation={[0, 0, Math.PI]}>
        <planeGeometry args={[20, 0.36]} />
        <meshBasicMaterial map={fadeTex()} color="#000" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export const stinkTex = () =>
  canvasTex('stink', 128, 128, (c) => {
    c.strokeStyle = '#cfd3c4';
    c.lineWidth = 7;
    c.lineCap = 'round';
    for (const x of [34, 94]) {
      c.beginPath();
      for (let y = 120; y > 10; y -= 2) c.lineTo(x + Math.sin(y / 12) * 12, y);
      c.stroke();
    }
  });

const mats = new Map<string, THREE.Material>();
const lam = (color: string) => {
  if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color }));
  return mats.get(color)!;
};

export function Box({ p, s, c, cast = true, children }: { p: [number, number, number]; s: [number, number, number]; c: string; cast?: boolean; children?: ReactNode }) {
  return (
    <mesh position={p} material={lam(c)} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      {children}
    </mesh>
  );
}

const WALL = '#77727a';
const WALL_SIDE = '#5d5962';
const FLOOR = '#3d3431';
const WOOD = '#5a4033';
const H = 2.9; // ceiling

// a partition: a slab sticking out from the back wall towards the camera
// back slab + front pillar + header, so there's a doorway between them to walk through
const Partition = ({ x, depth = 0.85 }: { x: number; depth?: number }) => (
  <group>
    <Box p={[x, H / 2, -1.6 + depth / 2]} s={[0.22, H, depth]} c={WALL_SIDE} />
    <Box p={[x, H / 2, 1.75]} s={[0.2, H, 0.3]} c="#3f3c45" />
    <Box p={[x, H - 0.18, 0.0]} s={[0.22, 0.36, 3.2]} c={WALL_SIDE} />
  </group>
);

function Lamp({ x, on }: { x: number; on: boolean }) {
  return (
    <group position={[x, H - 0.05, -0.6]}>
      <Box p={[0, 0, 0]} s={[0.32, 0.08, 0.32]} c="#3a3a3e" cast={false} />
      <mesh position={[0, -0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshBasicMaterial color={on ? '#fff4d6' : '#4a4a50'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export type SetState = {
  lights: number; // 0 dark .. 1 on
  clock: string;
  doorOpen: number; // 0..1
  eggs: number; // 0 none, 1 cracked in the pan
  donut: boolean; // still on the counter
  bagOnHook: boolean;
  water: boolean;
  t: number;
  sky?: number; // 0 = deep night with stars .. 1 = dawn (default)
};

export function Apartment({ st }: { st: SetState }) {
  const on = st.lights > 0.5;
  return (
    <group>
      {/* shell */}
      <Box p={[8.5, -0.05, -0.2]} s={[20, 0.1, 3]} c={FLOOR} cast={false} />
      <Box p={[8.5, H / 2, -1.65]} s={[20, H, 0.1]} c={WALL} cast={false} />
      <Box p={[8.5, H + 0.05, -0.4]} s={[20, 0.1, 2.6]} c="#2b2a2f" cast={false} />
      <Seams />
      <Contact x={2.5} z={-1.0} w={2.9} d={1.6} o={0.6} />
      <Contact x={4.15} z={-1.25} w={0.9} d={0.85} />
      <Contact x={5.85} z={-1.15} w={1.2} d={1.2} />
      <Contact x={7.6} z={-1.25} w={4.0} d={0.9} o={0.45} />
      <Contact x={7.4} z={0.1} w={2.5} d={1.2} o={0.55} />
      <Contact x={10.2} z={-1.3} w={0.7} d={0.6} />
      <Contact x={11.25} z={-0.95} w={1.6} d={1.6} o={0.35} />
      <Partition x={-0.6} depth={3.2} />
      <Partition x={5.3} />
      <Partition x={9.6} />
      <Partition x={12.6} />
      <Partition x={16.4} depth={3.2} />

      {/* ---- bedroom (x 0..5) ---- */}
      <Lamp x={3.4} on={on} />
      {/* window */}
      <group position={[2.2, 1.85, -1.59]}>
        <mesh>
          <planeGeometry args={[1.1, 0.95]} />
          <meshBasicMaterial map={skyTex()} />
        </mesh>
        {(st.sky ?? 1) < 1 && (
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[1.1, 0.95]} />
            <meshBasicMaterial map={nightSkyTex()} transparent opacity={1 - (st.sky ?? 1)} />
          </mesh>
        )}
        <Box p={[0, 0.5, 0.02]} s={[1.2, 0.06, 0.05]} c="#b9b4bd" cast={false} />
        <Box p={[0, -0.5, 0.02]} s={[1.2, 0.06, 0.05]} c="#b9b4bd" cast={false} />
        <Box p={[-0.57, 0, 0.02]} s={[0.06, 1.05, 0.05]} c="#b9b4bd" cast={false} />
        <Box p={[0.57, 0, 0.02]} s={[0.06, 1.05, 0.05]} c="#b9b4bd" cast={false} />
        <Box p={[0, 0, 0.02]} s={[0.04, 0.95, 0.04]} c="#b9b4bd" cast={false} />
      </group>
      {/* bed: frame, mattress, pillow, headboard on the right */}
      <Box p={[2.5, 0.22, -1.0]} s={[2.3, 0.3, 1.1]} c={WOOD} />
      <Box p={[2.5, 0.48, -1.0]} s={[2.2, 0.22, 1.02]} c="#9a9ab6" />
      <Box p={[3.4, 0.67, -1.3]} s={[0.42, 0.15, 0.4]} c="#a9a9c6" />
      <Box p={[3.7, 0.55, -1.0]} s={[0.1, 1.0, 1.12]} c={WOOD} />
      <Box p={[1.33, 0.38, -1.0]} s={[0.1, 0.6, 1.12]} c={WOOD} />
      {/* nightstand + alarm clock */}
      <Box p={[4.15, 0.32, -1.25]} s={[0.55, 0.64, 0.5]} c={WOOD} />
      <group position={[4.15, 0.73, -1.2]}>
        <Box p={[0, 0, 0]} s={[0.3, 0.16, 0.14]} c="#1c1414" />
        <mesh position={[0, 0, 0.071]}>
          <planeGeometry args={[0.27, 0.13]} />
          <meshBasicMaterial map={clockTex(st.clock)} />
        </mesh>
      </group>

      {/* ---- kitchen (x 5.3..9.6) ---- */}
      <Lamp x={7.3} on={on} />
      <Box p={[5.85, 1.0, -1.15]} s={[0.8, 2.0, 0.8]} c="#c9c9cf" />
      <Box p={[7.6, 0.45, -1.3]} s={[3.6, 0.9, 0.6]} c="#5b4c42" />
      <Box p={[7.6, 0.92, -1.3]} s={[3.6, 0.05, 0.62]} c="#7d6c60" />
      <Box p={[7.6, 2.05, -1.42]} s={[3.6, 0.7, 0.38]} c="#5b4c42" />
      {/* island in front */}
      <Box p={[7.4, 0.43, 0.1]} s={[2.0, 0.86, 0.7]} c="#4e423a" />
      <Box p={[7.4, 0.89, 0.1]} s={[2.1, 0.06, 0.76]} c="#857464" />
      {/* pan with egg */}
      <mesh position={[7.15, 0.95, 0.15]} castShadow>
        <cylinderGeometry args={[0.2, 0.18, 0.05, 28]} />
        <meshLambertMaterial color="#2a2a2e" />
      </mesh>
      {st.eggs > 0 && (
        <group position={[7.15, 0.985, 0.15]}>
          <mesh>
            <cylinderGeometry args={[0.13 * st.eggs, 0.13 * st.eggs, 0.012, 24]} />
            <meshLambertMaterial color="#f4f1ea" />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <sphereGeometry args={[0.045 * st.eggs, 16, 10]} />
            <meshLambertMaterial color="#f3b12b" />
          </mesh>
        </group>
      )}
      {/* egg carton + plate */}
      <Box p={[7.75, 0.95, 0.15]} s={[0.36, 0.08, 0.18]} c="#d8cfc0" />
      {st.donut && (
        <mesh position={[8.1, 0.96, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.07, 0.035, 10, 20]} />
          <meshLambertMaterial color="#c97aa0" />
        </mesh>
      )}

      {/* ---- bathroom (x 9.6..12.6) ---- */}
      <Lamp x={11.0} on={on} />
      <mesh position={[11.25, 1.25, -1.59]}>
        <planeGeometry args={[1.3, 2.5]} />
        <meshLambertMaterial map={tilesTex()} />
      </mesh>
      <Box p={[11.25, 0.04, -0.95]} s={[1.3, 0.08, 1.3]} c="#c3c6cc" />
      <Box p={[11.95, 1.15, -0.95]} s={[0.05, 2.3, 1.3]} c="#9fb4c8" />
      {/* shower head */}
      <Box p={[11.25, 2.35, -1.45]} s={[0.05, 0.05, 0.3]} c="#c9ccd2" />
      <Box p={[11.25, 2.3, -1.3]} s={[0.22, 0.04, 0.12]} c="#c9ccd2" />
      {st.water && <Water t={st.t} />}
      {/* sink + mirror */}
      <Box p={[10.2, 0.4, -1.35]} s={[0.12, 0.8, 0.12]} c="#c9c9cf" />
      <Box p={[10.2, 0.86, -1.3]} s={[0.5, 0.12, 0.4]} c="#d2d2d8" />
      <Box p={[10.2, 1.65, -1.58]} s={[0.5, 0.65, 0.03]} c="#8fa3bd" />

      {/* ---- entry (x 12.6..16.4) ---- */}
      <Lamp x={14.6} on={on || st.doorOpen > 0} />
      {/* hook + bag */}
      <Box p={[13.5, 1.35, -1.58]} s={[0.25, 0.04, 0.05]} c="#3a3a3e" cast={false} />
      {st.bagOnHook && <Bag position={[13.5, 1.15, -1.5]} />}
      {/* doorway: bright outside, then the door panel swings open on its left hinge */}
      <mesh position={[15.0, 1.05, -1.62]}>
        <planeGeometry args={[0.95, 2.1]} />
        <meshBasicMaterial color="#fff1c9" />
      </mesh>
      <group position={[14.53, 1.05, -1.57]} rotation={[0, (-st.doorOpen * 100 * Math.PI) / 180, 0]}>
        <Box p={[0.475, 0, 0]} s={[0.95, 2.1, 0.05]} c="#7a4a32" />
        <mesh position={[0.85, 0, 0.04]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshLambertMaterial color="#c9a45a" />
        </mesh>
      </group>
      <Box p={[15.0, 2.14, -1.58]} s={[1.1, 0.08, 0.08]} c="#d8d4cf" cast={false} />
      <Box p={[14.5, 1.05, -1.58]} s={[0.07, 2.2, 0.08]} c="#d8d4cf" cast={false} />
      <Box p={[15.5, 1.05, -1.58]} s={[0.07, 2.2, 0.08]} c="#d8d4cf" cast={false} />
      {/* light spilling onto the floor through the open door */}
      {st.doorOpen > 0 && (
        <mesh position={[15.0, 0.006, -1.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.95, 1.1]} />
          <meshBasicMaterial color="#e9c78f" transparent opacity={0.75 * st.doorOpen} />
        </mesh>
      )}
      <Box p={[15.0, 0.012, -0.7]} s={[0.9, 0.02, 0.5]} c="#4a3d35" cast={false} />
    </group>
  );
}

// a phone: dark slab with a lit screen whose colour changes as the feed scrolls
export function Phone({ position, rotation, screen = '#7f9bd8', on = true }: { position?: [number, number, number]; rotation?: [number, number, number]; screen?: string; on?: boolean }) {
  return (
    <group position={position} rotation={rotation}>
      <Box p={[0, 0, 0]} s={[0.085, 0.165, 0.014]} c="#16171c" />
      <mesh position={[0, 0, 0.0075]}>
        <planeGeometry args={[0.072, 0.148]} />
        <meshBasicMaterial color={on ? screen : '#0c0d10'} />
      </mesh>
    </group>
  );
}

export function Bag({ position, rotation }: { position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <Box p={[0, -0.12, 0]} s={[0.3, 0.22, 0.08]} c="#8a5a36" />
      <Box p={[0, 0.01, 0]} s={[0.12, 0.03, 0.03]} c="#5e3c24" />
    </group>
  );
}

function Water({ t }: { t: number }) {
  // falling streaks under the shower head, each on its own loop
  const streaks = [];
  for (let i = 0; i < 12; i++) {
    const k = (t * 3.2 + i * 0.37) % 1;
    streaks.push(
      <mesh key={i} position={[11.15 + (i % 4) * 0.06, 2.25 - k * 1.1, -1.38 + Math.floor(i / 4) * 0.05]}>
        <boxGeometry args={[0.007, 0.28, 0.007]} />
        <meshBasicMaterial color="#b9d6f2" transparent opacity={0.7} />
      </mesh>,
    );
  }
  return <group>{streaks}</group>;
}
