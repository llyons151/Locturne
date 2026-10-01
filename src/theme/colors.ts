/**
 * "Nocturne" tokens (docs/COLOR_RESEARCH.md, section 5). The interface stays quiet and
 * imagery carries the color; never any glow.
 *
 * Several cool blue/black palettes are drafted from the user's moonlit-night reference.
 * `graphite` is the original neutral version, kept for comparison. On web, preview any
 * palette with `?palette=<name>`.
 */
export type PaletteName = 'graphite' | 'midnight' | 'navy' | 'steel' | 'moonrise';

export type Palette = {
  label: string;
  bg: string;
  /** Optional top colour for a vertical sky gradient into `bg`. */
  bgTop?: string;
  surface: string;
  raised: string;
  line: string;
  frost: string;
  text: string;
  text2: string;
  text3: string;
  track: string;
  /** Unfilled progress: at least 3:1 against the background (WCAG 1.4.11). */
  progressTrack: string;
  /** Hairline edge on cards so they read against the background. Never a glow. */
  edge: string;
  cta: string;
  onCta: string;
  square: string;
  /** Moon white for key facts only (the reveal number, "16 full days"). Never a glow. */
  accent?: string;
};

const moonWhite = (alpha: number) => `rgba(221,240,248,${alpha})`;

export const PALETTES: Record<PaletteName, Palette> = {
  graphite: {
    label: 'Graphite (original)',
    bg: '#0B0B0C',
    surface: '#161617',
    raised: '#202022',
    line: 'rgba(255,255,255,0.08)',
    frost: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    text2: '#A1A1A6',
    text3: '#7C7C82',
    track: '#2A2A2D',
    progressTrack: '#5E5E63',
    edge: 'rgba(255,255,255,0.16)',
    cta: '#FFFFFF',
    onCta: '#0B0B0C',
    square: '#F5F5F4',
  },
  // Near-black night blue with moon-white text: the reference's darkest swatch.
  midnight: {
    label: 'Midnight',
    bg: '#060B18',
    surface: '#0F1A33',
    raised: '#172444',
    line: moonWhite(0.08),
    frost: moonWhite(0.12),
    text: '#EEF6FB',
    text2: '#9FB3CC',
    text3: '#7C90AE',
    track: '#1C2A4A',
    progressTrack: '#51648A',
    edge: moonWhite(0.16),
    cta: '#EEF6FB',
    onCta: '#0B1428',
    square: '#DDF0F8',
  },
  // Deeper, more saturated royal navy: the reference's second swatch.
  navy: {
    label: 'Navy',
    bg: '#0A1233',
    surface: '#121E4E',
    raised: '#1A2A60',
    line: 'rgba(255,255,255,0.08)',
    frost: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    text2: '#AEBBE0',
    text3: '#8E9BCB',
    track: '#22306A',
    progressTrack: '#5B6BAA',
    edge: 'rgba(255,255,255,0.16)',
    cta: '#FFFFFF',
    onCta: '#0A1233',
    square: '#FFFFFF',
  },
  // Teal-leaning blue slate: the reference's steel and deep-teal swatches.
  steel: {
    label: 'Steel',
    bg: '#07141D',
    surface: '#0E2230',
    raised: '#163042',
    line: moonWhite(0.08),
    frost: moonWhite(0.12),
    text: '#E4F0F6',
    text2: '#9AB5C3',
    text3: '#7C98A7',
    track: '#1B3445',
    progressTrack: '#4C6A7C',
    edge: moonWhite(0.16),
    cta: '#DDF0F8',
    onCta: '#07141D',
    square: '#BFDCEA',
  },
  // A night sky: navy at the top fading to near-black, like the moon photo.
  moonrise: {
    label: 'Moonrise (sky gradient)',
    bg: '#050A17',
    bgTop: '#16254F',
    // Neutral charcoal cards and buttons, as in the original graphite palette (user preference).
    surface: '#161617',
    raised: '#202022',
    line: moonWhite(0.08),
    frost: moonWhite(0.12),
    text: '#F2F8FC',
    text2: '#A8BAD3',
    text3: '#8699B8',
    track: '#1D2B4E',
    progressTrack: '#56698F',
    edge: moonWhite(0.16),
    cta: '#F2F8FC',
    onCta: '#0B1428',
    // Muted so a year of squares doesn't outshine the number above it.
    square: '#7F93B5',
    accent: '#CFE6F7',
  },
};

export const DEFAULT_PALETTE: PaletteName = 'moonrise';

function requestedPalette(): PaletteName {
  // Web preview only: ?palette=navy. Styles are built at import, so this is read once.
  const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
  const name = new URLSearchParams(search).get('palette');
  return name && name in PALETTES ? (name as PaletteName) : DEFAULT_PALETTE;
}

export const PALETTE_NAME = requestedPalette();

export const Nocturne: Palette = { ...PALETTES[PALETTE_NAME] };
