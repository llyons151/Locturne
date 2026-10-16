import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import KnockPanel from './knock-panel';
import { fireBurrow, fireUltra, fireZoomies, KNOCK_PRESETS, knockCode, openKnockLab, resetKnockTune, setKnockTune, useKnockLab } from './store';

/** Dev only: the knock lab's panel, over the top of the tabs while it's open (store.ts). */
export function KnockLab() {
  const insets = useSafeAreaInsets();
  const { open, tune } = useKnockLab();
  if (!open) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <KnockPanel
        tune={tune}
        code={knockCode(tune)}
        presets={Object.keys(KNOCK_PRESETS)}
        onChange={setKnockTune}
        onPreset={(name) => resetKnockTune(KNOCK_PRESETS[name as keyof typeof KNOCK_PRESETS])}
        onBurrow={fireBurrow}
        onZoomies={fireZoomies}
        onUltra={fireUltra}
        onClose={() => openKnockLab(false)}
        dom={{ matchContents: true, scrollEnabled: false, style: { backgroundColor: 'transparent' } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignSelf: 'center', maxWidth: 460 },
});
