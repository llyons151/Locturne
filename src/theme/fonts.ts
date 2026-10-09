import { Platform } from 'react-native';

/** System font families. Web reads the CSS variables in src/global.css. */
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Room for an italic's slanted overhang. iOS and Android size a Text box by the glyphs'
 * advance widths, so the lean of the last letter on each line gets clipped at the right
 * edge. The padding gives it room; the negative margin keeps the layout unchanged.
 */
export const italicOverhang = (fontSize: number) => {
  const room = Math.ceil(fontSize * 0.15);
  return { paddingRight: room, marginRight: -room };
};

/**
 * The app's one typeface: SF Pro, the iOS system font (user's pick, October 8, 2026;
 * replaced SF Pro Rounded). Every RN Text gets it through `@/components/text`; the web
 * preview falls back to Inter.
 */
export const APP_FONT = { fontFamily: Fonts?.sans } as const;

/** Loc's voice: the app font, heavy and italic. */
export const DisplayFont = {
  fontFamily: Fonts?.sans,
  fontStyle: 'italic',
  fontWeight: '800',
  // Sized for the largest body-level voice lines (~26pt); WordsIn sizes its own per line.
  ...italicOverhang(26),
} as const;

/** Numbers use the display font upright. Italic always means Loc is talking. */
export const NUMBER_FONT = { ...DisplayFont, fontStyle: 'normal', paddingRight: 0, marginRight: 0 } as const;

/** Display type is already large; let it grow a little with Dynamic Type, not 3x. */
export const DISPLAY_MAX_SCALE = 1.3;
