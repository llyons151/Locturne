import { StyleSheet } from 'react-native';
import { DeviceActivitySelectionSheetViewPersisted } from 'react-native-device-activity';

import type { SelectionId } from '@/lib/screen-time';

/**
 * Apple's own app picker, as a native sheet with Cancel/Done. The UI half of
 * `lib/screen-time.ts`: the choice is saved straight into the App Group under `list`, and
 * the app only learns how many apps and categories were picked.
 *
 * Render it only while open; it presents itself and calls `onClose` on Cancel or Done.
 * Apple's picker is known to crash now and then, so callers should let people reopen it.
 */
export function ScreenTimePicker({
  list,
  onClose,
  onPicked,
}: {
  list: SelectionId;
  onClose: () => void;
  onPicked?: (counts: { apps: number; categories: number }) => void;
}) {
  return (
    <DeviceActivitySelectionSheetViewPersisted
      familyActivitySelectionId={list}
      style={styles.anchor}
      onDismissRequest={onClose}
      onSelectionChange={(event) => {
        const { applicationCount, categoryCount } = event.nativeEvent;
        onPicked?.({ apps: applicationCount, categories: categoryCount });
      }}
    />
  );
}

/** The sheet is presented natively; this view is only an invisible anchor for it. */
const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 1, height: 1 },
});
