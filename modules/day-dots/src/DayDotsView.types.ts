import type { ViewProps } from 'react-native';

export type DayDotsViewProps = ViewProps & {
  /** Days, one dot each. */
  total: number;
  cols: number;
  /** Dot centre to dot centre, in points. */
  pitch: number;
  /** When the dots began to fill (epoch ms, the JS clock), or 0 before they have. */
  fillStart: number;
  fillMs: number;
  /** The page is on its way out: the rows drop, lowest first. */
  falling: boolean;
  fallMs: number;
  /** Delay between rows dropping, and how far they go, in points. */
  stagger: number;
  fallDistance: number;
};
