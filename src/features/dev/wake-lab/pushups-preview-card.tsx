import { router } from 'expo-router';

import { type MenuOption } from '@/components/control-types';
import { MenuRow, SwitchRow } from '@/components/controls';
import { Card, sym, ValueRow } from '@/components/grouped-list';

import { resetPushupsPreview, setPushupsPreview, usePushupsPreview, type PushupsPreview } from './pushups-preview';

const SCENES: MenuOption<PushupsPreview['scene']>[] = [
  { value: 'camera', label: 'Real camera' },
  { value: 'tour', label: 'Fake tour' },
  { value: 'pushups', label: 'Fake good reps' },
  { value: 'shallow', label: 'Fake half reps' },
  { value: 'quick', label: 'Fake too quick' },
  { value: 'hold', label: 'Fake plank hold' },
  { value: 'standing', label: 'Fake standing' },
  { value: 'nobody', label: 'Fake nobody' },
];

const PHONES: MenuOption<PushupsPreview['phone']>[] = [
  { value: 'upright', label: 'Real sensor' },
  { value: 'flat', label: 'Lying flat' },
  { value: 'sideways', label: 'On its side' },
  { value: 'upsideDown', label: 'Upside down' },
];

const SETUPS: MenuOption<PushupsPreview['setup']>[] = [
  { value: 'real', label: 'Real' },
  { value: 'ask', label: 'Asks first' },
  { value: 'denied', label: 'Access off' },
  { value: 'oldBuild', label: 'Old build' },
  { value: 'noCamera', label: 'Camera fails' },
  { value: 'model', label: 'Model fails' },
];

const PHASES: MenuOption<PushupsPreview['phase']>[] = [
  { value: 'real', label: 'Real' },
  { value: 'morning', label: 'Fake morning' },
  { value: 'woke', label: 'Fake morning, done' },
];

const GOALS: MenuOption<number>[] = [
  { value: 0, label: 'Routine’s' },
  { value: 3, label: '3' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
];

/**
 * You → Developer: force each state of the push-ups screen, then open it in the wake lab, or
 * as the real morning ("Open the morning", or Time of day: Fake morning and Home's button).
 * "Fake" plays a made-up body instead of the camera, so it all works in a browser
 * (`npx expo start`, press w) with no webcam and no push-ups. Never touches the real morning.
 */
export function PushupsPreviewCard() {
  const p = usePushupsPreview();
  return (
    <Card icon={sym('figure.strengthtraining.functional', 'fitness_center')} title="Push-up preview">
      <MenuRow title="Camera" value={p.scene} options={SCENES} onChange={(scene) => setPushupsPreview({ scene })} />
      <MenuRow title="Phone" value={p.phone} options={PHONES} onChange={(phone) => setPushupsPreview({ phone })} />
      <MenuRow title="Setup" value={p.setup} options={SETUPS} onChange={(setup) => setPushupsPreview({ setup })} />
      <MenuRow title="Push-ups" value={p.goal} options={GOALS} onChange={(goal) => setPushupsPreview({ goal })} />
      <SwitchRow title="Time out in 15 s" value={p.fastTimeout} onChange={(fastTimeout) => setPushupsPreview({ fastTimeout })} />
      <SwitchRow title="Tuning numbers" value={p.readout} onChange={(readout) => setPushupsPreview({ readout })} />
      <MenuRow title="Time of day" value={p.phase} options={PHASES} onChange={(phase) => setPushupsPreview({ phase })} />
      <ValueRow title="Reset preview" value="" onPress={resetPushupsPreview} />
      <ValueRow title="Open push-ups test" value="" onPress={() => router.push('/wake-lab?method=pushups')} />
      <ValueRow
        title="Open the morning"
        value=""
        onPress={() => {
          setPushupsPreview({ phase: 'morning' });
          router.push({ pathname: '/wake', params: { method: 'pushups' } });
        }}
        last
      />
    </Card>
  );
}
