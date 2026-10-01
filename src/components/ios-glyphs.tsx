import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Small iOS-style glyphs for the drawn iPhone, as SVG so they look the same on iOS,
 * Android and web (SymbolView falls back to Material icons off iOS, which reads as Android).
 * All drawn on a 24×24 grid.
 */
export type GlyphName =
  | 'signal'
  | 'wifi'
  | 'battery'
  | 'search'
  | 'phone'
  | 'bubble'
  | 'note'
  | 'moon'
  | 'heart'
  | 'comment'
  | 'send'
  | 'more'
  | 'camera'
  | 'home'
  | 'homeFill'
  | 'bookmark'
  | 'plus'
  | 'reels';

type Props = { name: GlyphName; size: number; color?: string };

const STROKE = { fill: 'none', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function Glyph({ name, size, color = '#FFFFFF' }: Props) {
  const line = { ...STROKE, stroke: color };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'signal' ? (
        <>
          <Rect x="2" y="15" width="3.6" height="5" rx="1" fill={color} />
          <Rect x="7.4" y="12" width="3.6" height="8" rx="1" fill={color} />
          <Rect x="12.8" y="8.5" width="3.6" height="11.5" rx="1" fill={color} />
          <Rect x="18.2" y="5" width="3.6" height="15" rx="1" fill={color} />
        </>
      ) : null}
      {name === 'wifi' ? (
        <>
          <Path d="M12 20.2 14.9 16.6a4.6 4.6 0 0 0-5.8 0Z" fill={color} />
          <Path d="M5.6 12.4a10 10 0 0 1 12.8 0l-1.9 2.4a7 7 0 0 0-9 0Z" fill={color} />
          <Path d="M2 8a15.6 15.6 0 0 1 20 0l-1.9 2.4a12.6 12.6 0 0 0-16.2 0Z" fill={color} />
        </>
      ) : null}
      {name === 'battery' ? (
        <>
          <Rect x="1" y="6.5" width="19.5" height="11" rx="3.2" fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={1.1} />
          <Rect x="2.8" y="8.3" width="15.9" height="7.4" rx="1.8" fill={color} />
          <Path d="M21.8 10.2c.8.3 1.2.9 1.2 1.8s-.4 1.5-1.2 1.8Z" fill={color} fillOpacity={0.45} />
        </>
      ) : null}
      {name === 'search' ? (
        <>
          <Circle cx="10.5" cy="10.5" r="6.5" {...line} strokeWidth={2.4} />
          <Path d="m15.5 15.5 5 5" {...line} strokeWidth={2.6} />
        </>
      ) : null}
      {name === 'phone' ? (
        <Path
          d="M7.4 3.2c.6-.3 1.3 0 1.6.6l1.6 3.4c.3.6.1 1.2-.3 1.6L9 10c.9 2.1 2.8 4 5 5l1.2-1.3c.4-.4 1.1-.6 1.6-.3l3.4 1.6c.6.3.9 1 .6 1.6l-.8 2.3c-.3.8-1.1 1.3-2 1.2C10.8 19.6 4.4 13.2 3.9 6c-.1-.9.4-1.7 1.2-2Z"
          fill={color}
        />
      ) : null}
      {name === 'bubble' ? (
        <Path
          d="M12 3.5c-5.2 0-9.5 3.4-9.5 7.7 0 2.4 1.3 4.5 3.4 5.9-.1 1.3-.7 2.5-1.7 3.4 1.9.1 3.7-.6 5.1-1.7.9.2 1.8.3 2.7.3 5.2 0 9.5-3.4 9.5-7.8S17.2 3.5 12 3.5Z"
          fill={color}
        />
      ) : null}
      {name === 'note' ? (
        <>
          <Path d="M9 17.2V6.3l10.5-2.6v11" {...line} strokeWidth={2.2} />
          <Circle cx="6.6" cy="17.4" r="2.8" fill={color} />
          <Circle cx="17" cy="15" r="2.8" fill={color} />
        </>
      ) : null}
      {name === 'moon' ? <Path d="M20 14.6A8.5 8.5 0 0 1 9.4 4a8.5 8.5 0 1 0 10.6 10.6Z" fill={color} /> : null}
      {name === 'heart' ? (
        <Path d="M12 20.2S3.2 15 3.2 8.9A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.8 2.3C20.8 15 12 20.2 12 20.2Z" {...line} />
      ) : null}
      {name === 'comment' ? (
        <Path d="M20.4 18.6 19.3 15a8.4 8.4 0 1 0-3.1 3.3Z" {...line} />
      ) : null}
      {name === 'send' ? (
        <>
          <Path d="M21.5 3 3 9.6l7.6 3.6L21.5 3Z" {...line} />
          <Path d="m21.5 3-6.4 17.7-4.5-7.5" {...line} />
        </>
      ) : null}
      {name === 'more' ? (
        <>
          <Circle cx="5" cy="12" r="1.8" fill={color} />
          <Circle cx="12" cy="12" r="1.8" fill={color} />
          <Circle cx="19" cy="12" r="1.8" fill={color} />
        </>
      ) : null}
      {name === 'camera' ? (
        <>
          <Path d="M3 8.5c0-1.1.9-2 2-2h2.3l1.6-2.2h6.2l1.6 2.2H19c1.1 0 2 .9 2 2v9.5c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2Z" {...line} />
          <Circle cx="12" cy="13" r="3.8" {...line} />
        </>
      ) : null}
      {name === 'home' ? <Path d="M3.5 10.5 12 3l8.5 7.5V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1Z" {...line} /> : null}
      {name === 'homeFill' ? (
        <Path d="M3.5 10.5 12 3l8.5 7.5V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1Z" fill={color} stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      ) : null}
      {name === 'bookmark' ? <Path d="M5.5 3.5h13v17L12 15.2l-6.5 5.3Z" {...line} /> : null}
      {name === 'plus' ? (
        <>
          <Rect x="3" y="3" width="18" height="18" rx="5" {...line} />
          <Path d="M12 8v8M8 12h8" {...line} />
        </>
      ) : null}
      {name === 'reels' ? (
        <>
          <Rect x="3" y="3" width="18" height="18" rx="5" fill={color} />
          <Path d="M3.5 8.2h17M8.5 3.4l2.6 4.8M14.2 3.4l2.6 4.8" stroke="#000" strokeWidth={1.4} />
          <Path d="M10 11.2v6l5-3Z" fill="#000" />
        </>
      ) : null}
    </Svg>
  );
}

/** Safari's compass: blue dial, red and white needle. */
export function SafariDial({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="safari-dial" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1FD1F9" />
          <Stop offset="1" stopColor="#1A6DF0" />
        </LinearGradient>
      </Defs>
      <Circle cx="12" cy="12" r="11" fill="url(#safari-dial)" />
      <Path d="M17.6 6.4 13.2 13.2 10.8 10.8Z" fill="#FF3B30" />
      <Path d="M6.4 17.6 10.8 10.8 13.2 13.2Z" fill="#FFFFFF" />
    </Svg>
  );
}
