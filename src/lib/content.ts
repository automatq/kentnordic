import YAML from 'yaml';
import { z } from 'zod';
import contentRelease from '@admin-content-release';

import destinationsJson from '@/content/destinations/destinations.json';
import faqJson from '@/content/faq/faq.json';
import officesJson from '@/content/offices/offices.json';
import testimonialsJson from '@/content/testimonials/testimonials.json';

const tourModules = import.meta.glob<string>('../content/tours/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const serviceModules = import.meta.glob<string>('../content/services/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const legalModules = import.meta.glob<string>('../content/legal/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const regionModules = import.meta.glob<Record<string, unknown>>('../content/regions/*.json', {
  import: 'default',
  eager: true,
});

const mealSchema = z.enum(['B', 'L', 'D']);

const driveSegmentSchema = z.object({
  from: z.string(),
  to: z.string(),
  km: z.number().optional(),
  duration: z.string().optional(),
  note: z.string().optional(),
});

const optionalActivitySchema = z.object({
  name: z.string(),
  duration: z.string().optional(),
  availability: z.string().optional(),
  note: z.string().optional(),
});

const hotelSchema = z.object({
  name: z.string(),
  tier: z.enum(['3*', '4*', '5*']).optional(),
  orSimilar: z.boolean().default(true),
});

const itineraryDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  meals: z.array(mealSchema).default([]),
  summary: z.string().optional(),
  places: z.array(z.string()).default([]),
  segments: z.array(driveSegmentSchema).default([]),
  included: z.array(z.string()).default([]),
  optional: z.array(optionalActivitySchema).default([]),
  hotel: hotelSchema.nullable().default(null),
});

const tourSchema = z.object({
  code: z.string(),
  name: z.string(),
  order: z.number(),
  category: z.enum(['south-coast', 'round-iceland']),
  serviceType: z.enum(['group', 'fit', 'mice']).default('group'),
  days: z.number(),
  nights: z.number(),
  routeId: z.string().optional(),
  direction: z.enum(['clockwise', 'anti-clockwise']).nullable().default(null),
  pairSlug: z.string().optional(),
  regions: z.array(z.string()),
  regionSummary: z.string(),
  seasonality: z.object({
    runsAllYear: z.boolean(),
    excludedMonths: z.array(z.number().min(1).max(12)).default([]),
    note: z.string().optional(),
  }),
  startCity: z.string().default('Reykjavik'),
  endCity: z.string().default('Reykjavik'),
  summary: z.string(),
  highlights: z.array(z.string()),
  heroImage: z.string(),
  heroAlt: z.string(),
  gallery: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  itinerary: z.array(itineraryDaySchema),
  priceOnRequest: z.boolean().default(true),
  /** Optional net per-person "from" price anchor. Rendering falls back to
      "Price on request" until the client supplies values. */
  fromNetPP: z.number().positive().optional(),
  currency: z.enum(['EUR', 'USD', 'ISK']).default('EUR'),
  featured: z.boolean().default(false),
});

const regionSchema = z.object({
  name: z.string(),
  order: z.number(),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  svgId: z.string(),
  tagline: z.string(),
  blurb: z.string(),
  highlights: z.array(z.string()).default([]),
  image: z.string().optional(),
});

const destinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.string(),
  type: z.enum([
    'city',
    'waterfall',
    'lagoon',
    'beach',
    'canyon',
    'glacier',
    'geothermal',
    'crater',
    'airport',
    'landmark',
  ]),
  coords: z.object({ x: z.number(), y: z.number() }),
  overnight: z.number().optional(),
  blurb: z.string().optional(),
});

const serviceSchema = z.object({
  name: z.string(),
  slug: z.string(),
  order: z.number(),
  summary: z.string(),
  icon: z.enum(['compass', 'group', 'sparkles', 'car', 'route']).default('compass'),
  image: z.string().optional(),
  subServices: z.array(z.object({ name: z.string(), body: z.string() })).default([]),
});

const testimonialSchema = z.object({
  id: z.string(),
  quote: z.string(),
  author: z.string(),
  agency: z.string(),
  country: z.string().optional(),
  order: z.number().default(0),
});

const faqSchema = z.object({
  id: z.string(),
  question: z.string(),
  heading: z.string(),
  answer: z.string(),
  icon: z.string(),
  photoKey: z.string(),
  order: z.number().default(0),
});

const officeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isHQ: z.boolean().default(false),
  role: z.string(),
  addressLines: z.array(z.string()).default([]),
  city: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  hours: z.string().optional(),
  order: z.number().default(0),
});

const legalPageSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().default(0),
  updated: z.string().optional(),
});

export type Tour = {
  id: string;
  body: string;
  data: z.output<typeof tourSchema>;
};
export type Region = {
  id: string;
  data: z.output<typeof regionSchema>;
};
export type Service = {
  id: string;
  body: string;
  data: z.output<typeof serviceSchema>;
};
export type LegalPage = {
  id: string;
  body: string;
  data: z.output<typeof legalPageSchema>;
};
export type Destination = z.output<typeof destinationSchema>;
export type Testimonial = z.output<typeof testimonialSchema>;
export type Faq = z.output<typeof faqSchema>;
export type Office = z.output<typeof officeSchema>;
export type ItineraryDay = z.output<typeof itineraryDaySchema>;

function idFromPath(path: string) {
  return path.split('/').pop()?.replace(/\.(mdx?|json)$/, '') ?? path;
}

function readFrontmatter(raw: string) {
  if (!raw.startsWith('---')) return { data: {}, content: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, content: raw };
  const yaml = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).trimStart();
  return {
    data: YAML.parse(yaml) ?? {},
    content,
  };
}

function parseMarkdown<S extends z.ZodTypeAny>(path: string, raw: string, schema: S): { id: string; data: z.output<S>; body: string } {
  const parsed = readFrontmatter(raw);
  return {
    id: idFromPath(path),
    data: schema.parse(parsed.data),
    body: parsed.content.trim(),
  };
}

const repositoryTours: Tour[] = Object.entries(tourModules)
  .map(([path, raw]) => parseMarkdown(path, raw, tourSchema))
  .sort((a, b) => a.data.order - b.data.order);

const repositoryRegions: Region[] = Object.entries(regionModules)
  .map(([path, data]) => ({
    id: idFromPath(path),
    data: regionSchema.parse(data),
  }))
  .sort((a, b) => a.data.order - b.data.order);

const repositoryServices: Service[] = Object.entries(serviceModules)
  .map(([path, raw]) => parseMarkdown(path, raw, serviceSchema))
  .sort((a, b) => a.data.order - b.data.order);

const repositoryLegalPages: LegalPage[] = Object.entries(legalModules)
  .map(([path, raw]) => parseMarkdown(path, raw, legalPageSchema))
  .sort((a, b) => a.data.order - b.data.order);

const tours = mergeMarkdownCollection(repositoryTours, 'tour', tourSchema).sort(
  (a, b) => a.data.order - b.data.order,
);
const regions = mergeDataCollection(repositoryRegions, 'region', regionSchema).sort(
  (a, b) => a.data.order - b.data.order,
);
const services = mergeMarkdownCollection(repositoryServices, 'service', serviceSchema).sort(
  (a, b) => a.data.order - b.data.order,
);
const legalPages = mergeMarkdownCollection(repositoryLegalPages, 'legal', legalPageSchema).sort(
  (a, b) => a.data.order - b.data.order,
);
const destinations = mergeFlatCollection(
  z.array(destinationSchema).parse(destinationsJson),
  'destination',
  destinationSchema,
);
const testimonials = mergeFlatCollection(
  z.array(testimonialSchema).parse(testimonialsJson),
  'testimonial',
  testimonialSchema,
).sort((a, b) => a.order - b.order);
const faqs = mergeFlatCollection(
  z.array(faqSchema).parse(faqJson),
  'faq',
  faqSchema,
).sort((a, b) => a.order - b.order);
const offices = mergeFlatCollection(
  z.array(officeSchema).parse(officesJson),
  'office',
  officeSchema,
).sort((a, b) => a.order - b.order);

let adminPreviewEntry: { key: string; data: Record<string, unknown> } | null = null;

export function setAdminContentPreview(key: string, data: Record<string, unknown>) {
  adminPreviewEntry = { key, data };
}

export function clearAdminContentPreview() {
  adminPreviewEntry = null;
}

function releaseEntries(prefix: string) {
  return Object.entries(contentRelease.entries).filter(([key]) =>
    key.startsWith(`${prefix}:`),
  );
}

function mergeMarkdownCollection<
  T extends { id: string; data: z.output<S>; body: string },
  S extends z.ZodTypeAny,
>(repository: T[], prefix: string, schema: S): T[] {
  const merged = new Map(repository.map((entry) => [entry.id, entry]));
  for (const [key, release] of releaseEntries(prefix)) {
    const id = key.slice(prefix.length + 1);
    const raw = release.data as { data?: unknown; body?: unknown };
    try {
      merged.set(id, {
        id,
        data: schema.parse(raw.data),
        body: typeof raw.body === 'string' ? raw.body : '',
      } as T);
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`Ignoring invalid published ${key}.`, error);
    }
  }
  return [...merged.values()];
}

function mergeDataCollection<
  T extends { id: string; data: z.output<S> },
  S extends z.ZodTypeAny,
>(repository: T[], prefix: string, schema: S): T[] {
  const merged = new Map(repository.map((entry) => [entry.id, entry]));
  for (const [key, release] of releaseEntries(prefix)) {
    const id = key.slice(prefix.length + 1);
    try {
      merged.set(id, { id, data: schema.parse(release.data) } as T);
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`Ignoring invalid published ${key}.`, error);
    }
  }
  return [...merged.values()];
}

function mergeFlatCollection<T extends { id: string }, S extends z.ZodTypeAny>(
  repository: T[],
  prefix: string,
  schema: S,
): T[] {
  const merged = new Map(repository.map((entry) => [entry.id, entry]));
  for (const [key, release] of releaseEntries(prefix)) {
    const id = key.slice(prefix.length + 1);
    try {
      merged.set(id, schema.parse(release.data) as T);
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`Ignoring invalid published ${key}.`, error);
    }
  }
  return [...merged.values()];
}

export function getPublishedCopyOverrides(): Record<string, string> {
  const published = Object.fromEntries(
    releaseEntries('copy').flatMap(([key, release]) => {
      const value = release.data.value;
      return typeof value === 'string' ? [[key.slice(5), value]] : [];
    }),
  );
  if (adminPreviewEntry?.key.startsWith('copy:') && typeof adminPreviewEntry.data.value === 'string') {
    published[adminPreviewEntry.key.slice(5)] = adminPreviewEntry.data.value;
  }
  return published;
}

export function hasPublishedContentRelease(): boolean {
  return typeof contentRelease.releaseId === 'string' && contentRelease.releaseId.length > 0;
}

export function getTours(): Tour[] {
  return previewMarkdownCollection(tours, 'tour', tourSchema);
}

export function getTour(slug: string | undefined): Tour | undefined {
  return slug ? getTours().find((tour) => tour.id === slug) : undefined;
}

export function getRegions(): Region[] {
  return previewDataCollection(regions, 'region', regionSchema);
}

export function getServices(): Service[] {
  return previewMarkdownCollection(services, 'service', serviceSchema);
}

export function getLegalPages(): LegalPage[] {
  return previewMarkdownCollection(legalPages, 'legal', legalPageSchema);
}

export function getLegalPage(slug: string | undefined): LegalPage | undefined {
  return slug ? getLegalPages().find((page) => page.id === slug) : undefined;
}

export function getDestinations(): Destination[] {
  return previewFlatCollection(destinations, 'destination', destinationSchema);
}

export function getTestimonials(): Testimonial[] {
  return previewFlatCollection(testimonials, 'testimonial', testimonialSchema).sort((a, b) => a.order - b.order);
}

export function getFaq(): Faq[] {
  return previewFlatCollection(faqs, 'faq', faqSchema).sort((a, b) => a.order - b.order);
}

export function getOffices(): Office[] {
  return previewFlatCollection(offices, 'office', officeSchema).sort((a, b) => a.order - b.order);
}

function previewMarkdownCollection<
  T extends { id: string; data: z.output<S>; body: string },
  S extends z.ZodTypeAny,
>(collection: T[], prefix: string, schema: S): T[] {
  if (!adminPreviewEntry?.key.startsWith(`${prefix}:`)) return collection;
  const id = adminPreviewEntry.key.slice(prefix.length + 1);
  const raw = adminPreviewEntry.data as { data?: unknown; body?: unknown };
  try {
    const preview = { id, data: schema.parse(raw.data), body: typeof raw.body === 'string' ? raw.body : '' } as T;
    return replacePreviewEntry(collection, preview);
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`Ignoring invalid draft preview ${adminPreviewEntry.key}.`, error);
    return collection;
  }
}

function previewDataCollection<
  T extends { id: string; data: z.output<S> },
  S extends z.ZodTypeAny,
>(collection: T[], prefix: string, schema: S): T[] {
  if (!adminPreviewEntry?.key.startsWith(`${prefix}:`)) return collection;
  const id = adminPreviewEntry.key.slice(prefix.length + 1);
  try {
    return replacePreviewEntry(collection, { id, data: schema.parse(adminPreviewEntry.data) } as T);
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`Ignoring invalid draft preview ${adminPreviewEntry.key}.`, error);
    return collection;
  }
}

function previewFlatCollection<T extends { id: string }, S extends z.ZodTypeAny>(
  collection: T[],
  prefix: string,
  schema: S,
): T[] {
  if (!adminPreviewEntry?.key.startsWith(`${prefix}:`)) return collection;
  const id = adminPreviewEntry.key.slice(prefix.length + 1);
  try {
    return replacePreviewEntry(collection, schema.parse({ ...adminPreviewEntry.data, id }) as T);
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`Ignoring invalid draft preview ${adminPreviewEntry.key}.`, error);
    return collection;
  }
}

function replacePreviewEntry<T extends { id: string }>(collection: T[], preview: T) {
  const found = collection.some((entry) => entry.id === preview.id);
  return found ? collection.map((entry) => entry.id === preview.id ? preview : entry) : [...collection, preview];
}
