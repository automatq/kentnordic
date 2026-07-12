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
import EditableText from '@/copy/EditableText';
import { SEASONS, getRegions, getTours, lengthBucket, matchesSeason, tourRegionIds } from '@/lib/packages';
import { buildBreadcrumbJsonLd } from '@/lib/seo';

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
  const qSeason = params.get('season');
  const [selectedLength, setSelectedLength] = useState(['short', 'medium', 'long'].includes(qLength ?? '') ? qLength! : 'all');
  const [selectedRegion, setSelectedRegion] = useState(qRegion && validRegions.has(qRegion) ? qRegion : 'all');
  const [selectedSeason, setSelectedSeason] = useState(SEASONS.some((s) => s.key === qSeason && s.key !== 'all') ? qSeason! : 'all');
  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Tour Packages', path: '/tours' },
  ]);

  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const okLength = selectedLength === 'all' || lengthBucket(tour) === selectedLength;
        const okRegion = selectedRegion === 'all' || tourRegionIds(tour).includes(selectedRegion);
        const okSeason = matchesSeason(tour, selectedSeason);
        return okLength && okRegion && okSeason;
      }),
    [selectedLength, selectedRegion, selectedSeason, tours],
  );


  return (
    <BaseLayout
      title="Iceland Tour Packages"
      description="Browse trade-ready Iceland tour packages from a local DMC, including South Coast and Ring Road itineraries for travel agencies and tour operators."
      jsonLd={jsonLd}
    >
      <section className="phero">
        <Pic photoKey="hero-tours" alt="Aerial view of an Icelandic Ring Road winding through mountains" className="phero-bg" loading="eager" fetchPriority="high" />
        <div className="phero-scrim" />
        <Container className="phero-inner">
          <EditableText copyKey="tours.hero.eyebrow" defaultValue="Tour Packages" as="p" className="u-eyebrow text-white/80" />
          <EditableText copyKey="tours.hero.title" defaultValue="Ready-to-sell Iceland itineraries" as="h1" className="phero-title" />
          <EditableText copyKey="tours.hero.lead" defaultValue="Six fully operated group tours - coach, driver-guide, hotels and sightseeing arranged. Sell them as published or tailor them to your group." as="p" multiline className="phero-lead" />
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
              <EditableText copyKey="tours.filters.length" defaultValue="Length" as="span" className="filter-label" />
              <div className="chips" data-filter="length">
                {lengths.map((l) => (
                  <button key={l.key} type="button" className="fchip" data-value={l.key} aria-pressed={selectedLength === l.key} onClick={() => setSelectedLength(l.key)}>
                    <EditableText copyKey={`tours.filters.lengthOption.${l.key}`} defaultValue={l.label} as="span" />
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <EditableText copyKey="tours.filters.season" defaultValue="Season" as="span" className="filter-label" />
              <div className="chips" data-filter="season">
                {SEASONS.map((s) => (
                  <button key={s.key} type="button" className="fchip" data-value={s.key} aria-pressed={selectedSeason === s.key} onClick={() => setSelectedSeason(s.key)}>
                    <EditableText copyKey={`tours.filters.seasonOption.${s.key}`} defaultValue={s.label} as="span" />
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <EditableText copyKey="tours.filters.region" defaultValue="Region" as="span" className="filter-label" />
              <div className="chips" data-filter="region">
                <button type="button" className="fchip" data-value="all" aria-pressed={selectedRegion === 'all'} onClick={() => setSelectedRegion('all')}>
                  <EditableText copyKey="tours.filters.regionOption.all" defaultValue="All regions" as="span" />
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
              <EditableText copyKey="tours.empty.message" defaultValue="No tours match those filters." as="span" />{' '}
              <button
                type="button"
                className="reset-link"
                data-reset
                onClick={() => {
                  setSelectedLength('all');
                  setSelectedRegion('all');
                  setSelectedSeason('all');
                }}
              >
                <EditableText copyKey="tours.empty.reset" defaultValue="Reset filters" as="span" />
              </button>
            </p>
          )}
        </Container>
      </Section>
    </BaseLayout>
  );
}
