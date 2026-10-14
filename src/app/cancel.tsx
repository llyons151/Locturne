import { CancelFlow } from '@/features/cancel/cancel-flow';

/** The cancel flow on its way to Apple's sheet. Full-screen (see `_layout.tsx`); `?preview=1` from You → Developer. */
export default function CancelRoute() {
  return <CancelFlow />;
}
