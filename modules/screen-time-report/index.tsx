import type { ViewProps } from 'react-native';

export type ReportProps = ViewProps & { days: number; revision: number; compact?: boolean;
  /** Home's top-row pill: today's total, drawn by the extension. Use with `days: 1`. */
  pill?: boolean;
};
export const isScreenTimeReportAvailable = false;
export function ScreenTimeReport(_props: ReportProps) { return null; }
