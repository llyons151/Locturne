import { MoonCollection } from '@/features/moons/moon-collection-view';

/** The moon collection as its own page, under a native large title (features/moons). */
export default function MoonPageRoute() {
  return <MoonCollection title={false} />;
}
