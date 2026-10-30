import type { ImageSourcePropType } from 'react-native';

/** One collectible moon, as baked from the moon lab (tools/moon-lab). */
export type MoonDef = {
  id: string;
  name: string;
  /** 'today' is the moon everyone starts with; the rest are the lab's groups. */
  kind: 'today' | 'real' | 'creative' | 'twin';
  /** A few words under the name. */
  tag: string;
  /** The halo's colour, and how strong it is. */
  glow: string;
  glowOpacity: number;
  /** The moon's size, 1 as today's (the Supermoon is bigger). */
  scale: number;
  /** The moon's centre across the screen, 0.5 as today's. */
  cx: number;
  /** The Sleep orb's four colours, dark to light (the Moonwell shader's C0…C3). */
  orb: [string, string, string, string];
  /** Recoloured sky and moon; today's moon has none and keeps the original images. */
  sky?: ImageSourcePropType;
  moon?: ImageSourcePropType;
  /** The Eclipse's ring or a Saturn ring: a box 1.6 moon-widths wide, centred on the moon. */
  ring?: ImageSourcePropType;
  /** A second moon, placed in moon-widths from the main moon's centre. */
  twin?: ImageSourcePropType;
  twinAt?: { x: number; y: number; size: number; glow: string; glowOpacity: number; front: boolean };
};
