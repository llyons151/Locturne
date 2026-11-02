import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';

import { appsMoonRoom, raisedMoonArc } from '@/components/night-sky';

import * as haptic from '@/lib/haptics';

import { LOC_VIEW } from '../home/loc-rig';
import { openMoons } from './moon-collection';

/** Loc's width as a share of the screen, as on Home (loc.tsx). */
const LOC_SHARE = 0.27;
/** A little room over the moon's top, so a tap just above it still counts. `floor`: the panel's edge, from the bottom of the page. */
const OVER = 16;
/** Beside Loc, the moon runs nearly to the panel's sides: from here in, as a share of the width. */
const SIDE = 0.1;
/** Room left round Loc on each side, so a poke at his edge still reaches him. */
const LOC_ROOM = 8;

/**
 * Home's moon opens the collection (user, 2026-11-01: "I like the idea of clicking on the moon
 * to change it"). Invisible: the moon is the button. Loc's canvas runs the panel's full width
 * along its edge, in a layer over every tab, so the moon is covered in parts: this one above
 * Loc (in Home), and `MoonSides` either side of him (in Loc's own layer, or the canvas would
 * swallow taps on most of the moon). Loc himself, the middle `LOC_SHARE`, is left alone: poke
 * him, he burrows.
 */
export function MoonTap({ floor, arc }: { floor: number; arc: number }) {
  const { width } = useWindowDimensions();
  const loc = Math.round((width * LOC_SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  const height = Math.max(0, arc - loc) + OVER;
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Your moons"
      style={[styles.tap, { bottom: floor + loc, height, left: width * 0.2, right: width * 0.2 }]}
    />
  );
}

/**
 * The moon either side of Loc, over his canvas (loc.tsx draws these while Home is showing).
 * `bottom` and `height`: his canvas's. VoiceOver gets the one button in `MoonTap`; these only
 * widen it for fingers.
 */
export function MoonSides({ bottom, height }: { bottom: number; height: number }) {
  const { width } = useWindowDimensions();
  const side = { bottom, height, width: Math.max(0, width * (0.5 - LOC_SHARE / 2 - SIDE) - LOC_ROOM) };
  return (
    <>
      <Pressable onPress={open} accessible={false} style={[styles.tap, side, { left: width * SIDE }]} />
      <Pressable onPress={open} accessible={false} style={[styles.tap, side, { right: width * SIDE }]} />
    </>
  );
}

/**
 * The Apps tab's moon, raised under its tiles, opens the collection too (user, 2026-11-02: "you should be
 * able to open the moons from the schedules page as well"), the same way Home's does: the moons page
 * grows out of the strip over whichever tab is showing (components/strip-page.tsx). No Loc there, so
 * one tap area over the moon; none once a third tile has sunk the moon (`appsMoonRoom`).
 */
export function RaisedMoonTap() {
  const { width } = useWindowDimensions();
  const room = useSyncExternalStore(appsMoonRoom.subscribe, appsMoonRoom.get, appsMoonRoom.get);
  if (!room) return null;
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Your moons"
      style={[styles.tap, { bottom: 0, height: raisedMoonArc(width) + OVER, left: width * SIDE, right: width * SIDE }]}
    />
  );
}

function open() {
  haptic.tap();
  openMoons();
}

const styles = StyleSheet.create({
  tap: { position: 'absolute' },
});
