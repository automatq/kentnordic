import YAML from 'yaml';
import { z } from 'zod';

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

const tours: Tour[] = Object.entries(tourModules)
  .map(([path, raw]) => parseMarkdown(path, raw, tourSchema))
  .sort((a, b) => a.data.order - b.data.order);

const regions: Region[] = Object.entries(regionModules)
  .map(([path, data]) => ({
    id: idFromPath(path),
    data: regionSchema.parse(data),
  }))
  .sort((a, b) => a.data.order - b.data.order);

const services: Service[] = Object.entries(serviceModules)
  .map(([path, raw]) => parseMarkdown(path, raw, serviceSchema))
  .sort((a, b) => a.data.order - b.data.order);

const destinations = z.array(destinationSchema).parse(destinationsJson);
const testimonials = z.array(testimonialSchema).parse(testimonialsJson).sort((a, b) => a.order - b.order);
const faqs = z.array(faqSchema).parse(faqJson).sort((a, b) => a.order - b.order);
const offices = z.array(officeSchema).parse(officesJson).sort((a, b) => a.order - b.order);

export function getTours(): Tour[] {
  return tours;
}

export function getTour(slug: string | undefined): Tour | undefined {
  return slug ? tours.find((tour) => tour.id === slug) : undefined;
}

export function getRegions(): Region[] {
  return regions;
}

export function getServices(): Service[] {
  return services;
}

export function getDestinations(): Destination[] {
  return destinations;
}

export function getTestimonials(): Testimonial[] {
  return testimonials;
}

export function getFaq(): Faq[] {
  return faqs;
}

export function getOffices(): Office[] {
  return offices;
}
