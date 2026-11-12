// Eyes for the stick figure: a small sprite that always sits on the camera's side of the head,
// nudged towards where he is looking, so the face reads from any pose (lying, sitting, walking).
// Pass it as StickFigure's `head`.
import * as THREE from 'three';
import { SIZE } from './rig';

export type Eyes = 'open' | 'half' | 'closed' | 'wide' | 'annoyed';

const cache = new Map<Eyes, THREE.Texture>();
function eyeTex(state: Eyes) {
  if (cache.has(state)) return cache.get(state)!;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0d10';
  g.strokeStyle = '#0d0d10';
  g.lineCap = 'round';
  for (const x of [84, 172]) {
    const y = 90;
    if (state === 'open') {
      g.beginPath();
      g.ellipse(x, y, 15, 23, 0, 0, Math.PI * 2);
      g.fill();
    } else if (state === 'wide') {
      g.beginPath();
      g.ellipse(x, y, 25, 31, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(x, y, 17, 23, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0d0d10';
      g.beginPath();
      g.arc(x, y + 2, 7, 0, Math.PI * 2);
      g.fill();
    } else if (state === 'closed') {
      g.lineWidth = 8;
      g.beginPath();
      g.arc(x, y - 8, 17, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    } else {
      // half-closed: the lower half of the eye under a heavy lid
      g.beginPath();
      g.ellipse(x, y, 15, 21, 0, 0, Math.PI);
      g.fill();
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(x - 21, y);
      g.lineTo(x + 21, y);
      g.stroke();
      if (state === 'annoyed') {
        const dir = x < 128 ? 1 : -1;
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x - 20 * dir, y - 30);
        g.lineTo(x + 18 * dir, y - 16);
        g.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(state, t);
  return t;
}

const wp = new THREE.Vector3();
const toCam = new THREE.Vector3();
const fwd = new THREE.Vector3();
const up = new THREE.Vector3();
const right = new THREE.Vector3();
const camUp = new THREE.Vector3();

export function Face({ eyes, size = 1 }: { eyes: Eyes; size?: number }) {
  // Placed in onBeforeRender, not an effect: Remotion draws the frame from an effect that runs
  // before ours would, so an effect's position is always one render late (and a still never gets it).
  const place = function (this: THREE.Sprite, _r: THREE.WebGLRenderer, _s: THREE.Scene, camera: THREE.Camera) {
    const g = this.parent;
    if (!g) return;
    wp.setFromMatrixPosition(g.matrixWorld);
    toCam.setFromMatrixPosition(camera.matrixWorld).sub(wp).normalize();
    fwd.set(1, 0, 0).transformDirection(g.matrixWorld); // the way he faces
    up.set(0, 1, 0).transformDirection(g.matrixWorld);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    // on the camera's side of the head, shifted towards where he's looking
    fwd.addScaledVector(toCam, -fwd.dot(toCam));
    wp.addScaledVector(toCam, SIZE.head + 0.03).addScaledVector(fwd, 0.055);
    this.position.copy(g.worldToLocal(wp));
    this.updateMatrix();
    this.matrixWorld.multiplyMatrices(g.matrixWorld, this.matrix);
    // tilt a little with the head, never fully sideways
    const tilt = Math.atan2(-up.dot(right), up.dot(camUp));
    (this.material as THREE.SpriteMaterial).rotation = Math.max(-0.45, Math.min(0.45, tilt * 0.3));
  };
  return (
    <group>
      <sprite scale={[0.2 * size, 0.125 * size, 1]} frustumCulled={false} onBeforeRender={place as never}>
        <spriteMaterial map={eyeTex(eyes)} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

/** Open eyes that blink now and then. */
export const blink = (t: number, base: Eyes = 'open', every = 2.3, offset = 0): Eyes => ((((t + offset) % every) + every) % every < 0.11 ? 'closed' : base);
