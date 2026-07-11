import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import PackageCard from '@/components/tour/PackageCard';
import Reveal from '@/components/motion/Reveal';
import Marquee from '@/components/motion/Marquee';
import Icon from '@/components/ui/Icon';
import Pic from '@/components/ui/Pic';
import { getRegions, getTours, lengthBucket, tourRegionIds } from '@/lib/packages';

const lengths = [
  { key: 'all', label: 'All lengths' },
  { key: 'short', label: '4 nights' },
  { key: 'medium', label: '5-6 nights' },
  { key: 'long', label: '7-8 nights' },
];

export default function ToursPage() {
  const [params] = useSearchParams();
  const tours = getTours();
  const regions = getRegions();
  const regionColors = new Map(regions.map((r) => [r.id, r.data.color]));
  const regionNames = new Map(regions.map((r) => [r.id, r.data.name]));
  const validRegions = new Set(regions.map((r) => r.id));
  const qRegion = params.get('region');
  const qLength = params.get('length');
  const [selectedLength, setSelectedLength] = useState(['short', 'medium', 'long'].includes(qLength ?? '') ? qLength! : 'all');
  const [selectedRegion, setSelectedRegion] = useState(qRegion && validRegions.has(qRegion) ? qRegion : 'all');

  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const okLength = selectedLength === 'all' || lengthBucket(tour) === selectedLength;
        const okRegion = selectedRegion === 'all' || tourRegionIds(tour).includes(selectedRegion);
        return okLength && okRegion;
      }),
    [selectedLength, selectedRegion, tours],
  );


  return (
    <BaseLayout title="Iceland Tour Packages" description="Six ready-to-sell Iceland group tours - from a 4-night South Coast escape to the full Ring Road - for travel-trade partners.">
      <section className="phero">
        <Pic photoKey="hero-tours" alt="Aerial view of an Icelandic Ring Road winding through mountains" className="phero-bg" loading="eager" fetchPriority="high" />
        <div className="phero-scrim" />
        <Container className="phero-inner">
          <p className="u-eyebrow text-white/80">Tour Packages</p>
          <h1 className="phero-title">Ready-to-sell Iceland itineraries</h1>
          <p className="phero-lead">Six fully operated group tours - coach, driver-guide, hotels and sightseeing arranged. Sell them as published or tailor them to your group.</p>
        </Container>
      </section>

      <Marquee
        items={tours}
        keyFor={(t) => t.id}
        renderItem={(t) => (
          <Link to={`/tours/${t.id}`} className="marquee-region">
            <Icon name="route" size={16} />
            {t.data.name}
          </Link>
        )}
      />

      <Section tone="cream">
        <Container>
          <div className="filters" role="group" aria-label="Filter tours">
            <div className="filter-group">
              <span className="filter-label">Length</span>
              <div className="chips" data-filter="length">
                {lengths.map((l) => (
                  <button key={l.key} type="button" className="fchip" data-value={l.key} aria-pressed={selectedLength === l.key} onClick={() => setSelectedLength(l.key)}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Region</span>
              <div className="chips" data-filter="region">
                <button type="button" className="fchip" data-value="all" aria-pressed={selectedRegion === 'all'} onClick={() => setSelectedRegion('all')}>
                  All regions
                </button>
                {regions.map((r) => (
                  <button key={r.id} type="button" className="fchip" data-value={r.id} aria-pressed={selectedRegion === r.id} onClick={() => setSelectedRegion(r.id)}>
                    <span className="fchip-dot" style={{ background: r.data.color }} />
                    {r.data.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="result-count" aria-live="polite" data-count>
            {visibleTours.length === tours.length ? `Showing all ${tours.length} tours` : `Showing ${visibleTours.length} of ${tours.length} tours`}
          </p>

          {visibleTours.length > 0 ? (
            <div className="tour-grid" data-grid>
              {visibleTours.map((tour, i) => (
                <Reveal key={tour.id} delay={(i % 3) * 80}>
                  <PackageCard tour={tour} regionColors={regionColors} regionNames={regionNames} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="empty" data-empty>
              No tours match those filters.{' '}
              <button
                type="button"
                className="reset-link"
                data-reset
                onClick={() => {
                  setSelectedLength('all');
                  setSelectedRegion('all');
                }}
              >
                Reset filters
              </button>
            </p>
          )}
        </Container>
      </Section>
    </BaseLayout>
  );
}
