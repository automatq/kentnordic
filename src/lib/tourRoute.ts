/**
 * Derives map-walkthrough data for a tour: each itinerary day's stops resolved
 * to destination pins (src/content/destinations/destinations.json), in travel
 * order, plus per-day drive stats. Place names in tour markdown are free text;
 * ALIASES covers every spelling that appears in the six tour files. Tokens that
 * aren't real map stops (hotel references, photo stops without a pin) resolve
 * to null and are simply not drawn.
 */
import { getDestinations, type Destination, type ItineraryDay, type Tour } from '@/lib/content';

const destinations = getDestinations();
const byId = new Map(destinations.map((d) => [d.id, d]));
const byName = new Map(destinations.map((d) => [normalize(d.name), d.id]));

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Free-text spellings used in tour itineraries -> destination pin ids.
 * Verified against every places[]/segments[] token in all six tour files.
 */
const ALIASES: Record<string, string | null> = {
  'diamond beach': 'jokulsarlon',
  'eldhraun lava fields': 'eldhraun',
  geysir: 'geysir',
  strokkur: 'geysir',
  'strokkur geysir': 'geysir',
  'lake myvatn': 'myvatn',
  myvatn: 'myvatn',
  'myvatn area': 'myvatn',
  // Myvatn-area sites share the lake's pin:
  skutustadagigar: 'myvatn',
  dimmuborgir: 'myvatn',
  hverir: 'myvatn',
  'studlagil canyon': 'studlagil',
  studlagil: 'studlagil',
  'grabrok crater': 'grabrok',
  kirkjufellsfoss: 'kirkjufell',
  'keflavik airport': 'keflavik-airport',
  keflavik: 'keflavik-airport',
  'ytri tunga': 'ytri-tunga',
  'ytri tunga beach': 'ytri-tunga',
  // Not on the map — deliberately skipped (waypoints, in-town landmarks,
  // hotel towns without a pin):
  hotel: null,
  bru: null,
  'bru horse farm': null,
  selfoss: null,
  nupar: null,
  'eyjafjallajokull info point': null,
  budir: null,
  budakirkja: null,
  londrangar: null,
  ingjaldsholl: null,
  hallgrimskirkja: null,
  'sun voyager': null,
  'christmas house': null,
  reykjafoss: null,
};

/** Resolve one free-text place token to a pin id (null = not a mapped stop). */
export function resolvePin(raw: string): string | null {
  const key = normalize(raw);
  if (key in ALIASES) return ALIASES[key];
  return byName.get(key) ?? null;
}

export interface WalkStop {
  pin: Destination;
  raw: string;
}

export interface WalkDay {
  day: number;
  title: string;
  summary?: string;
  meals: string[];
  stops: WalkStop[];
  hotelName: string | null;
  driveKm: number;
  optionalCount: number;
  /** Region ids touched by this day's stops. */
  regionIds: string[];
}

export interface Walkthrough {
  days: WalkDay[];
  /** All pins visited across the tour, deduped, in first-visit order. */
  pins: Destination[];
}

function dayStops(day: ItineraryDay): WalkStop[] {
  const seen = new Set<string>();
  const stops: WalkStop[] = [];
  for (const raw of day.places) {
    const id = resolvePin(raw);
    if (!id || seen.has(id)) continue;
    const pin = byId.get(id);
    if (!pin) continue;
    seen.add(id);
    stops.push({ pin, raw });
  }
  return stops;
}

export function getWalkthrough(tour: Tour): Walkthrough {
  const days: WalkDay[] = tour.data.itinerary.map((d) => {
    const stops = dayStops(d);
    return {
      day: d.day,
      title: d.title,
      summary: d.summary,
      meals: d.meals,
      stops,
      hotelName: d.hotel?.name ?? null,
      driveKm: d.segments.reduce((n, s) => n + (s.km ?? 0), 0),
      optionalCount: d.optional.length,
      regionIds: [...new Set(stops.map((s) => s.pin.region))],
    };
  });

  const seen = new Set<string>();
  const pins: Destination[] = [];
  for (const d of days) {
    for (const s of d.stops) {
      if (seen.has(s.pin.id)) continue;
      seen.add(s.pin.id);
      pins.push(s.pin);
    }
  }

  return { days, pins };
}

/**
 * The ordered coordinate trail of the whole tour: every day's stops in
 * sequence (consecutive duplicate pins collapsed), with the index of the
 * last trail point belonging to each day — used to draw route legs.
 */
export interface Trail {
  points: Array<{ x: number; y: number; pinId: string }>;
  /** dayEnd[i] = index into points of the last point at or before end of day i (-1 if none yet). */
  dayEnd: number[];
}

export function getTrail(walk: Walkthrough): Trail {
  const points: Trail['points'] = [];
  const dayEnd: number[] = [];
  for (const d of walk.days) {
    for (const s of d.stops) {
      const last = points[points.length - 1];
      if (last && last.pinId === s.pin.id) continue;
      points.push({ x: s.pin.coords.x, y: s.pin.coords.y, pinId: s.pin.id });
    }
    dayEnd.push(points.length - 1);
  }
  return { points, dayEnd };
}

/** Smooth SVG path (Catmull-Rom -> cubic bezier) through a run of trail points. */
export function trailPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const p = points;
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}
