import { getDestinations, getRegions as loadRegions, getTours as loadTours, type Destination, type Region, type Tour } from '@/lib/content';
import { getWalkthrough } from '@/lib/tourRoute';

export type { Destination, Region, Tour };

const MONTHS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getTours(): Tour[] {
  return loadTours();
}

export function getFeaturedTours(limit = 3): Tour[] {
  const tours = getTours();
  const featured = tours.filter((t) => t.data.featured);
  return (featured.length ? featured : tours).slice(0, limit);
}

export function getRegions(): Region[] {
  return loadRegions();
}

/** Map of region id -> region entry, for fast lookups. */
export function getRegionMap(): Map<string, Region> {
  const regions = getRegions();
  return new Map(regions.map((r) => [r.id, r]));
}

/** Region ids that a tour covers (in authored order). */
export function tourRegionIds(tour: Tour): string[] {
  return tour.data.regions;
}

/** Tours that visit a given region, sorted by length. */
export function toursForRegion(regionId: string): Tour[] {
  const tours = getTours();
  return tours.filter((t) => tourRegionIds(t).includes(regionId));
}

export function getDestinationPoints(): Destination[] {
  return getDestinations();
}

/** Destination id -> the tours whose itinerary stops there, built in one pass. */
export function destinationTourMap(): Map<string, Tour[]> {
  const map = new Map<string, Tour[]>();
  for (const t of getTours()) {
    for (const pin of getWalkthrough(t).pins) {
      map.set(pin.id, [...(map.get(pin.id) ?? []), t]);
    }
  }
  return map;
}

/** Tours that visit a given destination point. Prefer destinationTourMap()
    when looking up more than one point, to avoid recomputing the map. */
export function toursForDestination(destinationId: string): Tour[] {
  return destinationTourMap().get(destinationId) ?? [];
}

export function formatLength(tour: Tour): string {
  return `${tour.data.days} days · ${tour.data.nights} nights`;
}

export function nightsLabel(tour: Tour): string {
  return `${tour.data.nights}N`;
}

/** Bucket for the length filter on the listing page. */
export function lengthBucket(tour: Tour): 'short' | 'medium' | 'long' {
  if (tour.data.nights <= 4) return 'short';
  if (tour.data.nights <= 6) return 'medium';
  return 'long';
}

export function seasonalityText(tour: Tour): string {
  const s = tour.data.seasonality;
  if (s.note) return s.note;
  if (s.runsAllYear && s.excludedMonths.length === 0) return 'Runs all year';
  if (s.excludedMonths.length) {
    const names = s.excludedMonths.map((m) => MONTHS[m]).join(' & ');
    return `All year except ${names}`;
  }
  return 'Seasonal — enquire for dates';
}

/** Count of optional add-on activities across the itinerary. */
export function optionalCount(tour: Tour): number {
  return tour.data.itinerary.reduce((n, d) => n + d.optional.length, 0);
}

/**
 * The testimonial most relevant to a tour, for display at its decision
 * point: MICE buyers get the incentive-operator quote, Ring Road tours the
 * full-circle logistics quote, coastal tours the South Coast quote.
 */
export function pickTestimonial<T extends { id: string }>(tour: Tour, testimonials: T[]): T | undefined {
  const byId = new Map(testimonials.map((t) => [t.id, t]));
  if (tour.data.serviceType === 'mice') return byId.get('sakura-jp') ?? testimonials[0];
  if (tour.data.category === 'round-iceland') return byId.get('wanderlust-sg') ?? testimonials[0];
  if (tour.data.category === 'south-coast') return byId.get('apex-my') ?? testimonials[0];
  return testimonials[0];
}
