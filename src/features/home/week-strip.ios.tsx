import { Host } from '@expo/ui/swift-ui';

import type { WeekDay } from './week';
import { WeekDots } from './week-dots-native';

/** The week's day dots outside a SwiftUI page (the morning payoff): Home's, mist and all. */
export function WeekStrip({ days, reduced }: { days: WeekDay[]; reduced: boolean }) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }} colorScheme="dark">
      <WeekDots days={days} reduced={reduced} />
    </Host>
  );
}
