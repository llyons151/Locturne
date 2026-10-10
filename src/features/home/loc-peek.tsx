import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { LOC_HEIGHT, LOC_PATH, LOC_WIDTH } from './loc-path';

/**
 * Loc as a flat black silhouette peeking up over the panel's bottom edge, in front of the
 * moon (user request and image, October 6, 2026). He's the strip's own black, so he reads
 * as part of the app rather than a sticker. Traced with potrace from
 * `assets/images/loc/loc-peek-source.png`, cut flat at the base (`loc-peek.svg`).
 */
const WIDTH = LOC_WIDTH;
const HEIGHT = LOC_HEIGHT;
const PATH = LOC_PATH;

/** His width as a share of the screen (halved at the user's request). */
const SHARE = 0.23;

/** Loc's silhouette at `width`, in `color`: the strip's black here, the You tab's avatar too. */
export function LocSilhouette({ width, color = '#000000' }: { width: number; color?: string }) {
  const height = Math.round((width * HEIGHT) / WIDTH);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <G transform={`translate(0,${HEIGHT}) scale(0.1,-0.1)`}>
        <Path d={PATH} fill={color} />
      </G>
    </Svg>
  );
}

export function LocPeek() {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LocSilhouette width={Math.round(width * SHARE)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // One point past the edge so no hairline of sky shows between him and the strip.
  wrap: { position: 'absolute', left: 0, right: 0, bottom: -1, alignItems: 'center' },
});
