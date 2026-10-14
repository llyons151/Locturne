import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import type { PlaceMapProps } from './PlaceMap.types';

/**
 * Off iOS there's no MapKit. The web preview gets a still map from Esri's keyless dark gray tiles, with
 * their labels on top (close to Apple's dark map), with the same pin and circle, so the screen can be laid out and saved from; it doesn't pan.
 */
export const isPlaceMapAvailable = Platform.OS === 'web';

const TILE = 256;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
/** Metres per pixel at zoom 0 on the equator (256-pixel web map tiles). */
const EQUATOR_MPP = 156_543.034;

export function PlaceMap({ radius, target, onSettle, style }: PlaceMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Nothing moves here, so every new target has landed at once.
  useEffect(() => {
    if (target) onSettle?.({ latitude: target.latitude, longitude: target.longitude, byUser: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per target
  }, [target?.key]);

  if (!isPlaceMapAvailable) return null;
  const { width, height } = size;
  const ready = target && width > 0 && height > 0;
  const tiles: { key: string; uri: string; labels: string; left: number; top: number }[] = [];
  let ring = 0;
  if (ready) {
    const cos = Math.cos((target.latitude * Math.PI) / 180);
    const zoom = Math.max(3, Math.min(16, Math.round(Math.log2((EQUATOR_MPP * cos * height) / target.span))));
    const scale = TILE * 2 ** zoom;
    const x = ((target.longitude + 180) / 360) * scale;
    const lat = (target.latitude * Math.PI) / 180;
    const y = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale;
    const left = x - width / 2;
    const top = y - height / 2;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
        tiles.push({ key: `${tx},${ty}`, uri: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${tx}`, labels: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/${zoom}/${ty}/${tx}`, left: tx * TILE - left, top: ty * TILE - top });
      }
    }
    ring = radius / ((EQUATOR_MPP * cos) / 2 ** zoom);
  }

  return (
    <View style={[styles.map, style]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <View style={StyleSheet.absoluteFill}>
        {tiles.map((t) => (
          <View key={t.key} style={[styles.tile, { left: t.left, top: t.top }]}>
            <Image source={{ uri: t.uri }} style={StyleSheet.absoluteFill} />
            <Image source={{ uri: t.labels }} style={StyleSheet.absoluteFill} />
          </View>
        ))}
      </View>
      {ready ? (
        <>
          <View
            style={[styles.ring, { width: ring * 2, height: ring * 2, borderRadius: ring, left: width / 2 - ring, top: height / 2 - ring }]}
          />
          <View style={[styles.pin, { left: width / 2 - 15, top: height / 2 - 42 }]}>
            <View style={styles.stem} />
            <View style={styles.head}>
              <View style={styles.dot} />
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: '#262626', overflow: 'hidden' },
  tile: { position: 'absolute', width: TILE, height: TILE },
  ring: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  pin: { position: 'absolute', width: 30, height: 42, alignItems: 'center' },
  stem: { position: 'absolute', top: 28, width: 3, height: 14, borderRadius: 1.5, backgroundColor: '#FFFFFF' },
  head: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#000000' },
});
