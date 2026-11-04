import { sym, type Symbol } from '@/components/grouped-list';
import { type WakeMethod } from '@/lib/routine';
import { formatPreset } from '@/lib/text';

/**
 * One way to get up. `sf`: the SF Symbol's name, for any SwiftUI view that shows it.
 * `detail`: the line under it on the Routine tab's button. In the grid of ways each card is just
 * its icon and name (user 2026-11-03: no line under it, every card the same size); `action`, what
 * you do, is for VoiceOver only, and `recommended` marks the default. Icons stay white: per-way
 * colours were tried and dropped (user 2026-11-03).
 */
export type MethodOption = {
  value: WakeMethod;
  icon: Symbol;
  sf: string;
  title: string;
  detail: string;
  action: string;
  recommended: boolean;
};

export type MethodFacts = {
  /** The saved place's name, or null with none. */
  place: string | null;
  /** Steps to walk. */
  steps: number;
  /** Morning start, in minutes past midnight. */
  wake: number;
};

/**
 * The ways to get up, for the Routine tab's button and the wake-method sheet (method-sheet.tsx).
 * Steps first: it's the default, and works in any home (user's ask, 2026-10-10).
 */
export const methodOptions = ({ place, steps, wake }: MethodFacts): MethodOption[] => [
  {
    value: 'steps',
    sf: 'figure.walk',
    icon: sym('figure.walk', 'directions_walk'),
    // Just "Walk": how many is the Steps row under the button (user 2026-10-28).
    title: 'Walk',
    // "Recommended" left the line for a pill on its card (user 2026-11-03).
    detail: `From ${formatPreset(wake)}`,
    action: `Walk ${steps} steps`,
    recommended: true,
  },
  {
    value: 'downstairs',
    sf: 'figure.stairs',
    icon: sym('figure.stairs', 'stairs'),
    title: 'Go downstairs',
    detail: 'One floor',
    action: 'Go down one floor',
    recommended: false,
  },
  {
    value: 'scan',
    sf: 'barcode.viewfinder',
    icon: sym('barcode.viewfinder', 'barcode_scanner'),
    title: 'Scan a code',
    detail: 'A code in another room',
    action: 'Scan a code in another room',
    recommended: false,
  },
  {
    value: 'place',
    sf: 'mappin.and.ellipse',
    icon: sym('mappin.and.ellipse', 'location_on'),
    title: 'Get to a place',
    detail: place ?? 'The gym, campus, the café',
    action: 'Walk to a place you pick',
    recommended: false,
  },
  {
    value: 'pushups',
    sf: 'figure.strengthtraining.functional',
    icon: sym('figure.strengthtraining.functional', 'fitness_center'),
    // No count in the name (user 2026-11-03): how many is the row under the Routine button.
    title: 'Do push-ups',
    detail: 'The camera counts them',
    action: 'The camera counts them',
    recommended: false,
  },
  {
    // The same camera, standing (wake/squats.ts; user 2026-11-03, the grid's sixth).
    value: 'squats',
    sf: 'figure.cross.training',
    icon: sym('figure.cross.training', 'sports_gymnastics'),
    title: 'Do squats',
    detail: 'The camera counts them',
    action: 'The camera counts them',
    recommended: false,
  },
];
