import { type MenuOption } from '@/components/control-types';
import { MenuRow, SwitchRow } from '@/components/controls';

import { setPushupsPreview, usePushupsPreview, type PushupsPreview } from './pushups-preview';

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
  { value: 'sensor', label: 'Real sensor' },
  { value: 'sideways', label: 'Fake sideways' },
  { value: 'sidewaysOther', label: 'Fake sideways, other way' },
  { value: 'upright', label: 'Fake upright' },
  { value: 'flat', label: 'Fake lying flat' },
  { value: 'upsideDown', label: 'Fake upside down' },
];

const SETUPS: MenuOption<PushupsPreview['setup']>[] = [
  { value: 'real', label: 'Real' },
  { value: 'ask', label: 'Fake, asks first' },
  { value: 'denied', label: 'Fake, access off' },
  { value: 'oldBuild', label: 'Fake old build' },
  { value: 'noCamera', label: 'Fake camera fails' },
  { value: 'model', label: 'Fake model fails' },
];

const GOALS: MenuOption<number>[] = [
  { value: 0, label: 'Routine’s' },
  { value: 3, label: '3' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
];

/**
 * The wake preview's push-up rows (/wake-preview): force each state of the push-ups screen.
 * "Fake" plays a made-up body instead of the camera, so it all works in a browser with no
 * webcam and no push-ups. Never touches the real morning.
 */
export function PushupsPreviewRows() {
  const p = usePushupsPreview();
  return (
    <>
      <MenuRow title="Camera" value={p.scene} options={SCENES} onChange={(scene) => setPushupsPreview({ scene })} />
      <MenuRow title="Phone" value={p.phone} options={PHONES} onChange={(phone) => setPushupsPreview({ phone })} />
      <MenuRow title="Setup" value={p.setup} options={SETUPS} onChange={(setup) => setPushupsPreview({ setup })} />
      <MenuRow title="Push-ups" value={p.goal} options={GOALS} onChange={(goal) => setPushupsPreview({ goal })} />
      <SwitchRow title="Time out in 15 s" value={p.fastTimeout} onChange={(fastTimeout) => setPushupsPreview({ fastTimeout })} />
      <SwitchRow title="Tuning numbers" value={p.readout} onChange={(readout) => setPushupsPreview({ readout })} />
    </>
  );
}
