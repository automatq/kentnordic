import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '@/styles/tour-walkthrough.css';
import baseSvg from '@/data/map-base.svg?raw';
import mapData from '@/data/map-regions.json';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/classNames';
import { getRegions, type Tour } from '@/lib/packages';
import { getTrail, getWalkthrough, trailPath } from '@/lib/tourRoute';
import { useFullscreen } from '@/lib/useFullscreen';

interface TourWalkthroughProps {
  /** One tour = fixed walkthrough; several = a tour selector is shown. */
  tours: Tour[];
  initialTourId?: string;
  className?: string;
}

const mealLabels: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' };
const AUTOPLAY_MS = 5000;

export default function TourWalkthrough({ tours, initialTourId, className }: TourWalkthroughProps) {
  const [tourId, setTourId] = useState(initialTourId && tours.some((t) => t.id === initialTourId) ? initialTourId : tours[0]?.id);
  const [dayIdx, setDayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [countdownMs, setCountdownMs] = useState(AUTOPLAY_MS);
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef);

  const tour = tours.find((t) => t.id === tourId) ?? tours[0];
  const regions = getRegions();
  const regionColor = useMemo(() => new Map(regions.map((r) => [r.id, r.data.color])), [regions]);
  const geo = useMemo(() => new Map(mapData.regions.map((g) => [g.slug, g.d])), []);

  const walk = useMemo(() => getWalkthrough(tour), [tour]);
  const trail = useMemo(() => getTrail(walk), [walk]);
  const day = walk.days[dayIdx];
  const lastIdx = walk.days.length - 1;

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const selectTour = useCallback((id: string) => {
    setTourId(id);
    setDayIdx(0);
    setPlaying(false);
  }, []);

  const goTo = useCallback(
    (idx: number, viaAutoplay = false) => {
      setDayIdx(Math.max(0, Math.min(lastIdx, idx)));
      if (!viaAutoplay) setPlaying(false);
    },
    [lastIdx],
  );

  useEffect(() => {
    if (!playing) {
      setCountdownMs(AUTOPLAY_MS);
      return;
    }
    if (dayIdx >= lastIdx) {
      setPlaying(false);
      setCountdownMs(AUTOPLAY_MS);
      return;
    }
    const startedAt = Date.now();
    setCountdownMs(AUTOPLAY_MS);

    const tick = window.setInterval(() => {
      setCountdownMs(Math.max(0, AUTOPLAY_MS - (Date.now() - startedAt)));
    }, 100);

    const t = window.setTimeout(() => {
      setCountdownMs(AUTOPLAY_MS);
      goTo(dayIdx + 1, true);
    }, AUTOPLAY_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(t);
    };
  }, [playing, dayIdx, lastIdx, goTo]);

  const countdownSeconds = Math.max(0, Math.ceil(countdownMs / 1000));

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(dayIdx + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(dayIdx - 1);
    }
  };

  // Region status: touched by the current day vs. by an earlier day.
  const currentRegions = new Set(day?.regionIds ?? []);
  const visitedRegions = new Set(walk.days.slice(0, dayIdx).flatMap((d) => d.regionIds));

  // Pin status by first-visit day.
  const firstVisitDay = useMemo(() => {
    const m = new Map<string, number>();
    walk.days.forEach((d, i) => {
      d.stops.forEach((s) => {
        if (!m.has(s.pin.id)) m.set(s.pin.id, i);
      });
    });
    return m;
  }, [walk]);
  const currentPinIds = new Set(day?.stops.map((s) => s.pin.id) ?? []);

  // Nearby current-day pins alternate labels above/below so they don't collide
  // (e.g. the tight Thingvellir / Gullfoss / Geysir cluster).
  const labelBelow = useMemo(() => {
    const m = new Map<string, boolean>();
    const currents = (day?.stops ?? []).map((s) => s.pin).sort((a, b) => a.coords.x - b.coords.x);
    let prev: { x: number; y: number; below: boolean } | null = null;
    for (const p of currents) {
      let below = false;
      if (prev && Math.abs(prev.x - p.coords.x) < 600 && Math.abs(prev.y - p.coords.y) < 260) {
        below = !prev.below;
      }
      m.set(p.id, below);
      prev = { x: p.coords.x, y: p.coords.y, below };
    }
    return m;
  }, [day]);

  // Route legs, one path per day that adds trail points.
  const legs = useMemo(() => {
    const out: Array<{ dayIdx: number; d: string }> = [];
    for (let i = 0; i < walk.days.length; i++) {
      const start = i === 0 ? 0 : trail.dayEnd[i - 1];
      const end = trail.dayEnd[i];
      if (end <= start && !(i === 0 && end === 0 && trail.points.length > 0)) continue;
      const pts = trail.points.slice(Math.max(0, start), end + 1);
      if (pts.length < 2) continue;
      out.push({ dayIdx: i, d: trailPath(pts) });
    }
    return out;
  }, [walk, trail]);

  if (!tour || !day) return null;

  return (
    <div className={cn('walk', isFullscreen && 'is-fullscreen', className)} ref={rootRef} onKeyDown={onKeyDown}>
      {tours.length > 1 && (
        <div className="walk-tours" role="tablist" aria-label="Choose a tour to walk through">
          {tours.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tour.id}
              className={cn('walk-tour-chip', t.id === tour.id && 'is-active')}
              onClick={() => selectTour(t.id)}
            >
              <span className="walk-tour-code tnum">{t.data.code}</span>
              {t.data.name}
            </button>
          ))}
        </div>
      )}

      <div className="walk-grid">
        <div className="walk-stage-wrap">
        <div className="walk-stage" aria-hidden="true">
          <div className="map-base" dangerouslySetInnerHTML={{ __html: baseSvg }} />
          <svg className="walk-overlay" viewBox={mapData.viewBox}>
            {regions.map((r) => {
              const d = geo.get(r.id);
              if (!d) return null;
              return (
                <path
                  key={r.id}
                  className={cn(
                    'hotspot-static',
                    currentRegions.has(r.id) && 'is-on',
                    !currentRegions.has(r.id) && visitedRegions.has(r.id) && 'is-walked',
                  )}
                  d={d}
                  style={{ '--rc': r.data.color } as React.CSSProperties}
                />
              );
            })}

            {legs.map((leg) => (
              <path
                key={`${tour.id}-${leg.dayIdx}`}
                className={cn(
                  'walk-leg',
                  leg.dayIdx < dayIdx && 'is-done',
                  leg.dayIdx === dayIdx && 'is-active',
                  leg.dayIdx === dayIdx && !reduceMotion && 'is-drawing',
                )}
                d={leg.d}
                pathLength={1}
              />
            ))}

            {walk.pins.map((pin) => {
              const first = firstVisitDay.get(pin.id) ?? 0;
              const isCurrent = currentPinIds.has(pin.id);
              const isVisited = first < dayIdx && !isCurrent;
              const isFuture = first > dayIdx && !isCurrent;
              return (
                <g
                  key={pin.id}
                  className={cn('walk-pin', isCurrent && 'is-current', isVisited && 'is-visited', isFuture && 'is-future')}
                  transform={`translate(${pin.coords.x}, ${pin.coords.y})`}
                  style={{ '--rc': regionColor.get(pin.region) } as React.CSSProperties}
                  onClick={() => goTo(first)}
                >
                  {isCurrent && <circle className="walk-pin-pulse" r="46" />}
                  <circle className="walk-pin-dot" r={isCurrent ? 26 : 17} />
                  {isCurrent && (
                    <text className="walk-pin-label" y={labelBelow.get(pin.id) ? 104 : -56} textAnchor="middle">
                      {pin.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
          <button
            type="button"
            className="walk-fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen map' : 'View map fullscreen'}
          >
            <Icon name={isFullscreen ? 'minimize' : 'expand'} size={18} />
          </button>
          {isFullscreen && (
            <div className="walk-legend" role="group" aria-label="Map key">
              <p className="walk-legend-title">Key</p>
              <ul>
                <li>
                  <span className="walk-legend-pin is-current" /> Today&apos;s stop
                </li>
                <li>
                  <span className="walk-legend-pin is-visited" /> Visited
                </li>
                <li>
                  <span className="walk-legend-pin is-future" /> Upcoming
                </li>
                <li>
                  <span className="walk-legend-line" /> Today&apos;s route
                </li>
              </ul>
            </div>
          )}
        </div>

        <aside className="walk-panel" aria-live="polite">
          <div className="walk-day-head">
            <p className="u-eyebrow">
              Day {day.day} of {walk.days[lastIdx].day} · {tour.data.code}
            </p>
            <h3 className="walk-day-title">{day.title}</h3>
            {day.meals.length > 0 && (
              <ul className="meals" aria-label="Meals included">
                {day.meals.map((m) => (
                  <li key={m} className="meal" title={mealLabels[m]}>
                    <Icon name="utensils" size={13} />
                    {mealLabels[m]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {day.summary && <p className="walk-day-summary">{day.summary}</p>}

          {day.stops.length > 0 ? (
            <ol className="walk-stops">
              {day.stops.map((s, i) => (
                <li key={s.pin.id} className="walk-stop">
                  <span className="walk-stop-n tnum" style={{ background: regionColor.get(s.pin.region) }}>
                    {i + 1}
                  </span>
                  <span className="walk-stop-body">
                    <span className="walk-stop-name">{s.pin.name}</span>
                    {s.pin.blurb && <span className="walk-stop-blurb">{s.pin.blurb}</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="walk-stops-empty">
              <Icon name="moon" size={16} /> No sightseeing stops today — travel day.
            </p>
          )}

          <dl className="walk-facts">
            {day.driveKm > 0 && (
              <div>
                <dt>
                  <Icon name="route" size={15} /> Driving
                </dt>
                <dd className="tnum">±{day.driveKm} km</dd>
              </div>
            )}
            {day.hotelName && (
              <div>
                <dt>
                  <Icon name="bed" size={15} /> Overnight
                </dt>
                <dd>{day.hotelName}</dd>
              </div>
            )}
            {day.optionalCount > 0 && (
              <div>
                <dt>
                  <Icon name="plus" size={15} /> Add-ons
                </dt>
                <dd>
                  {day.optionalCount} optional {day.optionalCount === 1 ? 'activity' : 'activities'}
                </dd>
              </div>
            )}
          </dl>

          <div className="walk-controls">
            <button type="button" className="walk-nav" onClick={() => goTo(dayIdx - 1)} disabled={dayIdx === 0} aria-label="Previous day">
              <Icon name="arrow" size={18} className="rotate-180" />
            </button>
            <div className="walk-dots" role="group" aria-label="Jump to day">
              {walk.days.map((d, i) => (
                <button
                  key={d.day}
                  type="button"
                  className={cn('walk-dot', i === dayIdx && 'is-active', i < dayIdx && 'is-done')}
                  aria-label={`Day ${d.day}: ${d.title}`}
                  aria-current={i === dayIdx ? 'step' : undefined}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <button type="button" className="walk-nav" onClick={() => goTo(dayIdx + 1)} disabled={dayIdx === lastIdx} aria-label="Next day">
              <Icon name="arrow" size={18} />
            </button>
            <button
              type="button"
              className={cn('walk-nav walk-play', playing && 'is-playing')}
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  if (dayIdx >= lastIdx) setDayIdx(0);
                  setPlaying(true);
                }
              }}
              aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
            >
              <Icon name={playing ? 'pause' : 'play'} size={16} />
            </button>
          </div>

          <div className="walk-status" aria-live="polite">
            {playing ? (
              <p className="walk-countdown">
                Auto-playing day by day. Next stop in <span className="tnum">{countdownSeconds}</span>s.
              </p>
            ) : (
              <p className="walk-countdown is-idle">Press play to start a 5-second guided walkthrough.</p>
            )}
          </div>

          {tours.length > 1 && (
            <div className="walk-cta">
              <Badge tone="accent">{tour.data.nights} nights</Badge>
              <Link to={`/tours/${tour.id}`} className="walk-cta-link">
                View full itinerary <Icon name="arrow" size={15} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
