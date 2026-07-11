/**
 * Central photo registry. Content stores a semantic KEY (e.g. "tour-std02s4");
 * components resolve it here. To swap in real client photography, replace the
 * file at src/assets/photos/<key>.jpg — no content or template change needed.
 *
 * Every photo is emitted by vite-imagetools as AVIF + WebP + JPEG at three
 * widths. Render through <Pic> (components/ui/Pic.tsx) to serve the modern
 * formats; getPhoto() still returns a plain JPEG URL for raw call sites.
 */
import heroHome from '@/assets/photos/hero-home.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import heroAbout from '@/assets/photos/hero-about.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import heroServices from '@/assets/photos/hero-services.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import heroDestinations from '@/assets/photos/hero-destinations.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import heroTours from '@/assets/photos/hero-tours.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import heroContact from '@/assets/photos/hero-contact.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import fallback from '@/assets/photos/fallback.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';

import tourS4 from '@/assets/photos/tour-std02s4.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import tourS5 from '@/assets/photos/tour-std02s5.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import tourS6 from '@/assets/photos/tour-std02s6.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import tourR7 from '@/assets/photos/tour-std02r7.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import tourR8 from '@/assets/photos/tour-std02r8.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import tourR8a from '@/assets/photos/tour-std02r8-a.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';

import rReykjavik from '@/assets/photos/region-reykjavik.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rGolden from '@/assets/photos/region-golden-circle.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rSouth from '@/assets/photos/region-south-coast.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rJokul from '@/assets/photos/region-jokulsarlon.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rAkureyri from '@/assets/photos/region-akureyri.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rMyvatn from '@/assets/photos/region-myvatn.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rEast from '@/assets/photos/region-eastfjords.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';
import rSnae from '@/assets/photos/region-snaefellsnes.jpg?w=640;1280;1920&format=avif;webp;jpeg&as=picture';

export interface Picture {
  sources: Record<string, string>;
  img: { src: string; w: number; h: number };
}

const photos: Record<string, Picture> = {
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

export function getPicture(key: string | undefined): Picture {
  if (!key) return fallback;
  return photos[key] ?? fallback;
}

/** Plain URL of the largest JPEG — for og:image and other raw-src needs. */
export function getPhoto(key: string | undefined): string {
  return getPicture(key).img.src;
}
