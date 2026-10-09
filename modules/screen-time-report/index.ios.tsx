import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ReportProps } from './index';

export const isScreenTimeReportAvailable = requireOptionalNativeModule('ScreenTimeReport') != null;
const NativeReport = isScreenTimeReportAvailable ? requireNativeView<ReportProps>('ScreenTimeReport') : null;
export function ScreenTimeReport(props: ReportProps) {
  return NativeReport ? <NativeReport {...props} /> : null;
}
