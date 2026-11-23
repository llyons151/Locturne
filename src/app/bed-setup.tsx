import { PhotoScreen } from '@/features/photo/photo-screen';

/**
 * Make your bed's setup: the photo of the bed made, from where you'll stand each morning (lib/bed-photo.ts).
 * Opened from Routine, and when Make your bed is picked with none saved. Only while the apps are awake.
 */
export default function BedSetupRoute() {
  return <PhotoScreen kind="bed" setup />;
}
