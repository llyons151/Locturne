import { Diagnostics } from '@/features/dev/diagnostics/diagnostics';

/** Hidden diagnostics for beta testers at /diagnostics: status, heartbeats, the self-check. */
export default function DiagnosticsScreen() {
  return <Diagnostics />;
}
