/**
 * Central photo registry. Content stores a semantic KEY (e.g. "tour-std02s4");
 * components resolve it to a bundled image URL here. To swap in real
 * client photography, replace the file at src/assets/photos/<key>.jpg — no
 * content or template change needed.
 */
import heroHome from '@/assets/photos/hero-home.jpg';
import heroAbout from '@/assets/photos/hero-about.jpg';
import heroServices from '@/assets/photos/hero-services.jpg';
import heroDestinations from '@/assets/photos/hero-destinations.jpg';
import heroTours from '@/assets/photos/hero-tours.jpg';
import heroContact from '@/assets/photos/hero-contact.jpg';
import fallback from '@/assets/photos/fallback.jpg';

import tourS4 from '@/assets/photos/tour-std02s4.jpg';
import tourS5 from '@/assets/photos/tour-std02s5.jpg';
import tourS6 from '@/assets/photos/tour-std02s6.jpg';
import tourR7 from '@/assets/photos/tour-std02r7.jpg';
import tourR8 from '@/assets/photos/tour-std02r8.jpg';
import tourR8a from '@/assets/photos/tour-std02r8-a.jpg';

import rReykjavik from '@/assets/photos/region-reykjavik.jpg';
import rGolden from '@/assets/photos/region-golden-circle.jpg';
import rSouth from '@/assets/photos/region-south-coast.jpg';
import rJokul from '@/assets/photos/region-jokulsarlon.jpg';
import rAkureyri from '@/assets/photos/region-akureyri.jpg';
import rMyvatn from '@/assets/photos/region-myvatn.jpg';
import rEast from '@/assets/photos/region-eastfjords.jpg';
import rSnae from '@/assets/photos/region-snaefellsnes.jpg';

const photos: Record<string, string> = {
  'hero-home': heroHome,
  'hero-about': heroAbout,
  'hero-services': heroServices,
  'hero-destinations': heroDestinations,
  'hero-tours': heroTours,
  'hero-contact': heroContact,
  fallback,
  'tour-std02s4': tourS4,
  'tour-std02s5': tourS5,
  'tour-std02s6': tourS6,
  'tour-std02r7': tourR7,
  'tour-std02r8': tourR8,
  'tour-std02r8-a': tourR8a,
  'region-reykjavik': rReykjavik,
  'region-golden-circle': rGolden,
  'region-south-coast': rSouth,
  'region-jokulsarlon': rJokul,
  'region-akureyri': rAkureyri,
  'region-myvatn': rMyvatn,
  'region-eastfjords': rEast,
  'region-snaefellsnes': rSnae,
};

export function getPhoto(key: string | undefined): string {
  if (!key) return fallback;
  return photos[key] ?? fallback;
}
