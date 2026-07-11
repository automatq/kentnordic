import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import baseSvg from '@/data/map-base.svg?raw';
import mapData from '@/data/map-regions.json';
import Icon from '@/components/ui/Icon';
import IcelandMap3D from '@/components/three/IcelandMap3D';
import { cn } from '@/lib/classNames';
import { destinationTourMap, getDestinationPoints, getRegions, nightsLabel, toursForRegion } from '@/lib/packages';

interface IcelandMapProps {
  interactive?: boolean;
  highlight?: string[];
  className?: string;
}

interface PointRow {
  id: string;
  name: string;
  type: string;
  blurb?: string;
  x: number;
  y: number;
  color: string;
  tours: Array<{ slug: string; name: string; nights: string }>;
}

/** Best-fit existing glyph per destination type — see Icon.tsx for the registry. */
const TYPE_ICON: Record<string, string> = {
  city: 'compass',
  airport: 'route',
  landmark: 'map-pin',
  canyon: 'mountain',
  crater: 'mountain',
  glacier: 'snowflake',
  waterfall: 'waterfall',
  lagoon: 'droplet',
  beach: 'droplet',
  geothermal: 'droplet',
};

const TYPE_LABEL: Record<string, string> = {
  city: 'City',
  airport: 'Airport',
  landmark: 'Landmark',
  canyon: 'Canyon',
  crater: 'Crater',
  glacier: 'Glacier',
  waterfall: 'Waterfall',
  lagoon: 'Lagoon',
  beach: 'Beach',
  geothermal: 'Geothermal area',
};

interface SvgStageProps {
  regionData: Array<{ id: string; name: string; color: string; tours: unknown[] }>;
  pointData: PointRow[];
  geo: Map<string, string>;
  interactive: boolean;
  highlight: string[];
  active: string | null;
  activePoint: string | null;
  selectRegion: (id: string) => void;
  selectPoint: (id: string) => void;
}

/** The original 2D map stage (decorative artwork + SVG hotspots) — the full
    experience wherever the 3D relief doesn't qualify. */
function SvgStage({ regionData, pointData, geo, interactive, highlight, active, activePoint, selectRegion, selectPoint }: SvgStageProps) {
  return (
    <>
      <div className="map-base" aria-hidden="true" dangerouslySetInnerHTML={{ __html: baseSvg }} />
      <svg
        className="map-hotspots"
        viewBox={mapData.viewBox}
        role={interactive ? 'group' : 'img'}
        aria-label={interactive ? 'Interactive map of Iceland - select a region to see its tours' : 'Map of Iceland highlighting the regions this tour visits'}
      >
        {regionData.map((r) => {
          const d = geo.get(r.id);
          if (!d) return null;
          if (!interactive) {
            return <path key={r.id} className={cn('hotspot-static', highlight.includes(r.id) && 'is-on')} d={d} style={{ '--rc': r.color } as React.CSSProperties} />;
          }
          return (
            <a
              key={r.id}
              className={cn('hotspot', active === r.id && 'is-active')}
              id={`hot-${r.id}`}
              data-region={r.id}
              href={`#region-${r.id}`}
              role="button"
              aria-label={`${r.name} - ${r.tours.length} tour ${r.tours.length === 1 ? 'package' : 'packages'}`}
              style={{ '--rc': r.color } as React.CSSProperties}
              onClick={(event) => {
                event.preventDefault();
                selectRegion(r.id);
              }}
              onMouseEnter={() => selectRegion(r.id)}
              onFocus={() => selectRegion(r.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectRegion(r.id);
                }
              }}
            >
              <path d={d} />
            </a>
          );
        })}
      </svg>

      {interactive && (
        <svg className="map-points" viewBox={mapData.viewBox} role="group" aria-label="Destinations - select a point to see details">
          {pointData.map((p) => (
            <a
              key={p.id}
              className={cn('map-point', activePoint === p.id && 'is-active')}
              id={`pt-${p.id}`}
              href={`#point-${p.id}`}
              role="button"
              aria-label={p.name}
              style={{ '--rc': p.color } as React.CSSProperties}
              onClick={(event) => {
                event.preventDefault();
                selectPoint(p.id);
              }}
              onMouseEnter={() => selectPoint(p.id)}
              onFocus={() => selectPoint(p.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectPoint(p.id);
                }
              }}
            >
              <circle className="map-point-dot" cx={p.x} cy={p.y} r={activePoint === p.id ? 24 : 16} />
            </a>
          ))}
        </svg>
      )}
    </>
  );
}

export default function IcelandMap({ interactive = true, highlight = [], className = '' }: IcelandMapProps) {
  const location = useLocation();
  const [active, setActive] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const regions = getRegions();
  const destinations = getDestinationPoints();

  const geo = useMemo(() => new Map(mapData.regions.map((g) => [g.slug, g.d])), []);
  const regionData = useMemo(
    () =>
      regions.map((r) => ({
        id: r.id,
        name: r.data.name,
        color: r.data.color,
        tagline: r.data.tagline,
        blurb: r.data.blurb,
        highlights: r.data.highlights,
        tours: toursForRegion(r.id).map((t) => ({ slug: t.id, name: t.data.name, nights: nightsLabel(t) })),
      })),
    [regions],
  );

  const regionColorMap = useMemo(() => new Map(regionData.map((r) => [r.id, r.color])), [regionData]);
  const tourMap = useMemo(() => destinationTourMap(), []);
  const pointData = useMemo<PointRow[]>(
    () =>
      destinations.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        blurb: d.blurb,
        x: d.coords.x,
        y: d.coords.y,
        color: regionColorMap.get(d.region) ?? '#57717c',
        tours: (tourMap.get(d.id) ?? []).map((t) => ({ slug: t.id, name: t.data.name, nights: nightsLabel(t) })),
      })),
    [destinations, regionColorMap, tourMap],
  );

  const selectRegion = (id: string) => {
    setActivePoint(null);
    setActive(id);
  };
  const selectPoint = (id: string) => {
    setActive(null);
    setActivePoint(id);
  };
  const clearSelection = () => {
    setActive(null);
    setActivePoint(null);
  };

  useEffect(() => {
    const regionHash = location.hash.match(/^#region-(.+)$/);
    if (regionHash && regionData.some((r) => r.id === regionHash[1])) selectRegion(regionHash[1]);
    const pointHash = location.hash.match(/^#point-(.+)$/);
    if (pointHash && pointData.some((p) => p.id === pointHash[1])) selectPoint(pointHash[1]);
  }, [location.hash, regionData, pointData]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelection();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const stage = (
    <SvgStage
      regionData={regionData}
      pointData={pointData}
      geo={geo}
      interactive={interactive}
      highlight={highlight}
      active={active}
      activePoint={activePoint}
      selectRegion={selectRegion}
      selectPoint={selectPoint}
    />
  );

  return (
    <div className={cn('map', className)} data-interactive={interactive ? 'true' : 'false'} data-map>
      <div className="map-stage" onMouseLeave={clearSelection}>
        {interactive ? (
          <IcelandMap3D
            regions={regionData}
            activeRegion={active}
            onSelect={selectRegion}
            onHover={(slug) => slug && selectRegion(slug)}
            points={pointData.map((p) => ({ id: p.id, x: p.x, y: p.y, color: p.color }))}
            activePoint={activePoint}
            onSelectPoint={selectPoint}
            onHoverPoint={(id) => id && selectPoint(id)}
            fallback={stage}
          />
        ) : (
          stage
        )}
      </div>

      {interactive && (
        <aside className="map-panel" aria-live="polite">
          {!active && !activePoint && (
            <div className="rpanel rpanel-default" data-panel="default">
              <p className="u-eyebrow">Explore Iceland</p>
              <h3 className="rpanel-title">Choose a region</h3>
              <p className="rpanel-blurb">Hover, tap or tab through the eight colour-coded regions - or any of the pins - to see what each holds and which tour packages take you there.</p>
              <ul className="rpanel-legend">
                {regionData.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="legend-btn" data-goto={r.id} onClick={() => selectRegion(r.id)}>
                      <span className="legend-dot" style={{ background: r.color }} />
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!activePoint &&
            regionData.map((r) =>
              active === r.id ? (
                <div key={r.id} className="rpanel" id={`region-${r.id}`} data-panel={r.id}>
                  <p className="u-eyebrow" style={{ color: `color-mix(in srgb, ${r.color} 45%, var(--color-ink))` }}>
                    {r.tagline}
                  </p>
                  <h3 className="rpanel-title">{r.name}</h3>
                  <p className="rpanel-blurb">{r.blurb}</p>
                  {r.highlights.length > 0 && (
                    <ul className="rpanel-highlights">
                      {r.highlights.map((h) => (
                        <li key={h}>
                          <Icon name="map-pin" size={13} /> {h}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="rpanel-tours">
                    <p className="rpanel-tours-label">
                      {r.tours.length} tour {r.tours.length === 1 ? 'package visits' : 'packages visit'} this region
                    </p>
                    <ul>
                      {r.tours.map((t) => (
                        <li key={t.slug}>
                          <Link to={`/tours/${t.slug}`}>
                            <span>{t.name}</span>
                            <span className="rpanel-tour-nights">
                              {t.nights} <Icon name="arrow" size={14} />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null,
            )}

          {activePoint &&
            pointData.map((p) =>
              p.id === activePoint ? (
                <div key={p.id} className="rpanel" id={`point-${p.id}`} data-panel={p.id}>
                  <p className="u-eyebrow rpanel-type" style={{ color: `color-mix(in srgb, ${p.color} 45%, var(--color-ink))` }}>
                    <Icon name={TYPE_ICON[p.type] ?? 'map-pin'} size={13} /> {TYPE_LABEL[p.type] ?? 'Point of interest'}
                  </p>
                  <h3 className="rpanel-title">{p.name}</h3>
                  {p.blurb && <p className="rpanel-blurb">{p.blurb}</p>}
                  <div className="rpanel-tours">
                    <p className="rpanel-tours-label">
                      {p.tours.length} tour {p.tours.length === 1 ? 'package visits' : 'packages visit'} this stop
                    </p>
                    {p.tours.length > 0 && (
                      <ul>
                        {p.tours.map((t) => (
                          <li key={t.slug}>
                            <Link to={`/tours/${t.slug}`}>
                              <span>{t.name}</span>
                              <span className="rpanel-tour-nights">
                                {t.nights} <Icon name="arrow" size={14} />
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null,
            )}
        </aside>
      )}
    </div>
  );
}
