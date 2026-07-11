import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import baseSvg from '@/data/map-base.svg?raw';
import mapData from '@/data/map-regions.json';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/classNames';
import { getRegions, nightsLabel, toursForRegion } from '@/lib/packages';

interface IcelandMapProps {
  interactive?: boolean;
  highlight?: string[];
  className?: string;
}

export default function IcelandMap({ interactive = true, highlight = [], className = '' }: IcelandMapProps) {
  const location = useLocation();
  const [active, setActive] = useState<string | null>(null);
  const regions = getRegions();

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

  useEffect(() => {
    const hash = location.hash.match(/^#region-(.+)$/);
    if (hash && regionData.some((region) => region.id === hash[1])) setActive(hash[1]);
  }, [location.hash, regionData]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={cn('map', className)} data-interactive={interactive ? 'true' : 'false'} data-map>
      <div className="map-stage" onMouseLeave={() => setActive(null)}>
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
                  setActive(r.id);
                }}
                onMouseEnter={() => setActive(r.id)}
                onFocus={() => setActive(r.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActive(r.id);
                  }
                }}
              >
                <path d={d} />
              </a>
            );
          })}
        </svg>
      </div>

      {interactive && (
        <aside className="map-panel" aria-live="polite">
          {!active && (
            <div className="rpanel rpanel-default" data-panel="default">
              <p className="u-eyebrow">Explore Iceland</p>
              <h3 className="rpanel-title">Choose a region</h3>
              <p className="rpanel-blurb">Hover, tap or tab through the eight colour-coded regions to see what each holds - and which tour packages take you there.</p>
              <ul className="rpanel-legend">
                {regionData.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="legend-btn" data-goto={r.id} onClick={() => setActive(r.id)}>
                      <span className="legend-dot" style={{ background: r.color }} />
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {regionData.map((r) =>
            active === r.id ? (
              <div key={r.id} className="rpanel" id={`region-${r.id}`} data-panel={r.id}>
                <p className="u-eyebrow" style={{ color: r.color, filter: 'saturate(1.4) brightness(0.7)' }}>
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
        </aside>
      )}
    </div>
  );
}
