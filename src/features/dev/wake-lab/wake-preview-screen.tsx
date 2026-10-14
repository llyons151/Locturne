import { router, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type MenuOption } from '@/components/control-types';
import { MenuRow, SwitchRow } from '@/components/controls';
import { Card, sym, ValueRow } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { FakeTag } from './fake-tag';
import { PushupsPreviewRows } from './pushups-preview-card';
import { resetPushupsPreview } from './pushups-preview';
import { resetWakePreview, setWakePreview, useWakePreview, type WakePreview } from './wake-preview';

const PHASES: MenuOption<WakePreview['phase']>[] = [
  { value: 'real', label: 'Real' },
  { value: 'morning', label: 'Fake morning' },
  { value: 'woke', label: 'Fake morning, done' },
];

const STEPS: MenuOption<WakePreview['steps']>[] = [
  { value: 'real', label: 'Real sensor' },
  { value: 'walking', label: 'Fake walking' },
  { value: 'halfway', label: 'Fake halfway there' },
  { value: 'done', label: 'Fake already walked' },
  { value: 'still', label: 'Fake standing still' },
  { value: 'denied', label: 'Fake access off' },
  { value: 'unavailable', label: 'Fake no sensor' },
];

const STAIRS: MenuOption<WakePreview['stairs']>[] = [
  { value: 'real', label: 'Real sensor' },
  { value: 'down', label: 'Fake downstairs' },
  { value: 'up', label: 'Fake upstairs' },
  { value: 'short', label: 'Fake half a floor' },
  { value: 'still', label: 'Fake times out' },
  { value: 'flat', label: 'Fake stuck sensor' },
  { value: 'noSignal', label: 'Fake no readings' },
  { value: 'denied', label: 'Fake access off' },
  { value: 'unavailable', label: 'Fake no barometer' },
];

const SCAN: MenuOption<WakePreview['scan']>[] = [
  { value: 'real', label: 'Real camera' },
  { value: 'fake', label: 'Fake viewfinder' },
  { value: 'ask', label: 'Fake, asks first' },
  { value: 'denied', label: 'Fake, access off' },
];

const PLACE: MenuOption<WakePreview['place']>[] = [
  { value: 'real', label: 'Real location' },
  { value: 'walking', label: 'Fake: walking there' },
  { value: 'there', label: 'Fake: there' },
  { value: 'notThere', label: 'Fake: 700 m away' },
  { value: 'unsure', label: 'Fake: too vague' },
  { value: 'slow', label: 'Fake: slow fix' },
  { value: 'denied', label: 'Fake: access off' },
  { value: 'imprecise', label: 'Fake: approximate' },
  { value: 'off', label: 'Fake: services off' },
  { value: 'failed', label: 'Fake: no answer' },
];

/** Starts a pretend morning (unless one is already running) and opens the real screen. */
function open(href: Href, method: WakePreview['method'] = 'routine') {
  setWakePreview({ phase: 'morning', method });
  router.push(href);
}

/**
 * Dev tool, /wake-preview: every wake-up method's REAL morning screen at any hour, in a browser
 * or a dev build, with each sensor or native view swapped for a FAKE one. Pick the fakes here,
 * then Open; edit the screen file named under each card and it hot-reloads. A pass records
 * nothing (wake-preview.ts). docs/WAKE_PREVIEW.md has the map of what's real and what's fake.
 */
export function WakePreviewScreen() {
  const insets = useSafeAreaInsets();
  const p = useWakePreview();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Space.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.head}>
        <Text style={styles.title}>Wake preview</Text>
        <Text style={styles.note}>
          The screens are the real ones. Only what&apos;s marked below is made up, and on screen it&apos;s tagged
        </Text>
        <FakeTag what="like this" style={styles.centered} />
      </View>

      <Card
        icon={sym('clock.fill', 'schedule')}
        title="Time of day"
        footer="Fake morning: every screen sees a morning still to prove, at any hour. A pass records nothing and moves no shields; it turns this to “done”."
      >
        <MenuRow title="Lock" value={p.phase} options={PHASES} onChange={(phase) => setWakePreview({ phase })} />
        <SwitchRow
          title="Stand-in code and place"
          value={p.standIns}
          onChange={(standIns) => setWakePreview({ standIns })}
        />
        <ValueRow title="Open Home" value="" onPress={() => open('/')} last />
      </Card>

      <Card icon={sym('figure.walk', 'directions_walk')} title="Walk steps" footer="Fake replaces the pedometer (expo-sensors). The walk is counted on Home: src/features/home/use-morning-walk.ts. “Walk instead” from the other methods is still src/features/wake/steps-view.tsx">
        <MenuRow title="Pedometer" value={p.steps} options={STEPS} onChange={(steps) => setWakePreview({ steps })} />
        <ValueRow title="Open the morning (Home)" value="" onPress={() => open('/', 'steps')} />
        <ValueRow title="Open “walk instead”" value="" onPress={() => open('/wake?method=steps')} last />
      </Card>

      <Card
        icon={sym('figure.stairs', 'stairs')}
        title="Go downstairs"
        footer="Fake replaces the barometer (expo-sensors) with a scripted trip: Start, ~8 s on the stairs, 5 s hold. On Home: src/features/home/use-morning-stairs.ts. The old screen is still src/features/wake/downstairs-view.tsx"
      >
        <MenuRow title="Barometer" value={p.stairs} options={STAIRS} onChange={(stairs) => setWakePreview({ stairs })} />
        <ValueRow title="Open the morning (Home)" value="" onPress={() => open('/', 'downstairs')} />
        <ValueRow title="Open the old screen" value="" onPress={() => open('/wake?method=downstairs')} last />
      </Card>

      <Card
        icon={sym('figure.strengthtraining.functional', 'fitness_center')}
        title="Push-ups"
        footer="Fake replaces the Swift Vision camera (modules/pose-camera) with a drawn body. “Real camera” is the webcam in a browser. Screen: src/features/wake/pushups-view.tsx"
      >
        <PushupsPreviewRows />
        <ValueRow title="Open the morning" value="" onPress={() => open('/wake?method=pushups')} last />
      </Card>

      <Card
        icon={sym('barcode.viewfinder', 'barcode_scanner')}
        title="Scan a code"
        footer="Fake replaces the camera (expo-camera) with two buttons: the right code, a wrong one. Home: src/features/home/morning.ts; the camera: src/features/scan/scan-screen.tsx, camera box: scanner.tsx"
      >
        <MenuRow title="Camera" value={p.scan} options={SCAN} onChange={(scan) => setWakePreview({ scan })} />
        <ValueRow title="Open the morning (Home)" value="" onPress={() => open('/', 'scan')} />
        <ValueRow title="Open the camera" value="" onPress={() => open('/scan?mode=morning')} />
        <ValueRow title="Open setup" value="" onPress={() => router.push('/scan?mode=setup')} last />
      </Card>

      <Card
        icon={sym('mappin.and.ellipse', 'location_on')}
        title="Get to a place"
        footer="Fake replaces the GPS read (expo-location). Without a real place, the stand-in is “Fake gym”. On Home: src/features/home/use-morning-place.ts. The old screen (with the map): src/features/place/place-screen.tsx"
      >
        <MenuRow title="Location" value={p.place} options={PLACE} onChange={(place) => setWakePreview({ place })} />
        <ValueRow title="Open the morning (Home)" value="" onPress={() => open('/', 'place')} />
        <ValueRow title="Open the old screen" value="" onPress={() => open('/place?mode=morning')} last />
      </Card>

      <Card>
        <ValueRow
          title="Reset everything"
          value=""
          onPress={() => {
            resetWakePreview();
            resetPushupsPreview();
          }}
        />
        <ValueRow title="Close" value="" onPress={close} last />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Nocturne.bg },
  content: { paddingHorizontal: Gap.gutter, gap: Gap.block },
  head: { alignItems: 'center', gap: Space.s },
  title: { ...Type.title, color: Nocturne.text },
  note: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  centered: { alignSelf: 'center' },
});
