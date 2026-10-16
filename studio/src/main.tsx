import { createRoot } from 'react-dom/client';

import LocStudio from '@/features/dev/loc-studio/loc-studio';

import peek from '@/assets/images/loc/loc-peek-source.png';
import asleep from '@/assets/onboarding/raccoon-asleep.jpg';
import back from '@/assets/onboarding/raccoon-back.png';
import draped from '@/assets/onboarding/raccoon-draped.png';
import sitting from '@/assets/onboarding/raccoon-sitting.png';

/** The art Loc is made from, for the studio's Images page (the app's route passes the same list). */
const IMAGES = [
  { title: 'The peek, traced from', note: 'assets/images/loc/loc-peek-source.png. Potrace turned this into the silhouette path.', uri: peek },
  { title: 'Painted: sitting', note: 'assets/onboarding/raccoon-sitting.png. The older painted direction, before the silhouette.', uri: sitting },
  { title: 'Painted: draped', note: 'assets/onboarding/raccoon-draped.png. The older painted direction.', uri: draped },
  { title: 'Painted: from the back', note: 'assets/onboarding/raccoon-back.png. The older painted direction.', uri: back },
  { title: 'Painted: asleep', note: 'assets/onboarding/raccoon-asleep.jpg. The older painted direction.', uri: asleep },
];

createRoot(document.getElementById('root')!).render(<LocStudio images={IMAGES} />);
