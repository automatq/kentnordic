import { lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/ui/Badge';
import ItineraryDay from '@/components/tour/ItineraryDay';
import PackageCard from '@/components/tour/PackageCard';
import DeferredContent from '@/components/performance/DeferredContent';
import QuoteBar from '@/components/tour/QuoteBar';
import DayJumpNav from '@/components/tour/DayJumpNav';
import PrintItineraryButton from '@/components/tour/PrintItineraryButton';
import SectionHeading from '@/components/ui/SectionHeading';
import Reveal from '@/components/motion/Reveal';
import TimelineRail from '@/components/motion/TimelineRail';
import { getTestimonials, getTour } from '@/lib/content';
import SeasonBand from '@/components/tour/SeasonBand';
import EditablePhoto from '@/copy/EditablePhoto';
import EditableText from '@/copy/EditableText';
import { useCopyContext } from '@/copy/CopyProvider';
import { formatLength, getRegions, getTours, pickTestimonial, priceText, seasonalityText, totalDistanceKm, tourRegionIds } from '@/lib/packages';
import { site } from '@/config/site';

const RouteExperience = lazy(() => import('@/components/tour/RouteExperience'));

export default function TourDetailPage() {
  const { slug } = useParams();
  const { get } = useCopyContext();
  const tour = getTour(slug);

  if (!tour) {
    return (
      <BaseLayout title="Tour Not Found">
        <Section tone="cream">
          <Container>
            <h1 className="text-3xl">Tour not found</h1>
            <p className="mt-4 text-charcoal-soft">The requested itinerary does not exist.</p>
            <Button href="/tours" className="mt-6">
              View all tours
            </Button>
          </Container>
        </Section>
      </BaseLayout>
    );
  }

  const d = tour.data;
  const tourName = get(`tour.${tour.id}.name`, d.name);
  const tourSummary = get(`tour.${tour.id}.summary`, d.summary);
  const regions = getRegions();
  const regionColors = new Map(regions.map((r) => [r.id, r.data.color]));
  const regionNames = new Map(regions.map((r) => [r.id, r.data.name]));
  const coveredRegions = tourRegionIds(tour);
  const allTours = getTours();
  const related = allTours.filter((t) => t.id !== tour.id && t.data.category === d.category).slice(0, 3);
  const relatedFinal = related.length ? related : allTours.filter((t) => t.id !== tour.id).slice(0, 3);
  const sibling = d.pairSlug ? allTours.find((t) => t.id === d.pairSlug) : undefined;
  const inquiryHref = `/contact?package=${d.code}#inquiry`;
  const testimonial = pickTestimonial(tour, getTestimonials());
  const totalKm = totalDistanceKm(tour);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: `${tourName} (${d.code})`,
      description: tourSummary,
      touristType: 'Travel agencies & MICE planners',
      provider: { '@type': 'TravelAgency', name: site.legalName, url: site.url },
      itinerary: {
        '@type': 'ItemList',
        numberOfItems: d.itinerary.length,
        itemListElement: d.itinerary.map((day, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'TouristDestination', name: day.title },
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: site.url },
        { '@type': 'ListItem', position: 2, name: 'Tour Packages', item: `${site.url}/tours` },
        { '@type': 'ListItem', position: 3, name: tourName, item: `${site.url}/tours/${tour.id}` },
      ],
    },
  ];

    return (
      <BaseLayout title={`${tourName} - ${d.days}D/${d.nights}N Iceland Tour`} description={tourSummary} image="/og-default.jpg" jsonLd={jsonLd}>
      <section className="thero">
        <EditablePhoto
          photoKey={d.heroImage}
          alt={d.heroAlt}
          className="thero-bg"
          frameClassName="thero-bg"
          loading="eager"
          fetchPriority="high"
        />
        <div className="thero-scrim" />
        <Container className="thero-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/tours">Tour Packages</Link>
            <Icon name="arrow" size={13} />
            <EditableText copyKey={`tour.${tour.id}.name`} defaultValue={tourName} as="span" />
          </nav>
          <p className="u-eyebrow">{d.code}</p>
          <EditableText copyKey={`tour.${tour.id}.name`} defaultValue={tourName} as="h1" className="thero-title" />
          <div className="thero-meta">
            <span>
              <Icon name="calendar" size={17} /> {formatLength(tour)}
            </span>
            <span>
              <Icon name="route" size={17} /> {d.startCity} → {d.endCity}
            </span>
            <span>
              <Icon name="snowflake" size={17} /> {seasonalityText(tour)}
            </span>
          </div>
        </Container>
      </section>

      <Section tone="cream">
        <Container>
          <div className="layout">
            <div className="main">
              <EditableText copyKey={`tour.${tour.id}.summary`} defaultValue={tourSummary} as="p" multiline className="lead" />

              {sibling && (
                <div className="toggle" role="group" aria-label="Choose travel direction">
                  <EditableText copyKey={`tour.${tour.id}.directionLabel`} defaultValue="Direction" as="span" className="toggle-label" />
                  <div className="toggle-btns">
                    <span className="toggle-btn is-active" aria-current="true">
                      {d.direction === 'anti-clockwise' ? 'Anti-clockwise' : 'Clockwise'}
                    </span>
                    <Link className="toggle-btn" to={`/tours/${sibling.id}`}>
                      {sibling.data.direction === 'anti-clockwise' ? 'Anti-clockwise' : 'Clockwise'}
                    </Link>
                  </div>
                </div>
              )}

              <div className="block">
                <SectionHeading as="h2" eyebrow={<EditableText copyKey={`tour.${tour.id}.highlights.eyebrow`} defaultValue="Highlights" as="span" />} title={<EditableText copyKey={`tour.${tour.id}.highlights.title`} defaultValue="Trip highlights" as="span" />} className="block-heading" />
                <ul className="highlights">
                  {d.highlights.map((h, i) => (
                    <Reveal as="li" key={h} delay={(i % 4) * 60}>
                      <Icon name="check" size={17} className="hl-icon" />
                      <EditableText copyKey={`tour.${tour.id}.highlights.item.${i + 1}`} defaultValue={h} as="span" />
                    </Reveal>
                  ))}
                </ul>
              </div>

              {tour.body && (
                <div className="block intro">
                  <ReactMarkdown>{tour.body}</ReactMarkdown>
                </div>
              )}

              <div className="block">
                <SectionHeading
                  as="h2"
                  eyebrow={<EditableText copyKey={`tour.${tour.id}.route.eyebrow`} defaultValue="The route" as="span" />}
                  title={<EditableText copyKey={`tour.${tour.id}.route.title`} defaultValue="Walk the route" as="span" />}
                  lead={<EditableText copyKey={`tour.${tour.id}.route.lead`} defaultValue={`This itinerary travels through ${coveredRegions.length} of Iceland's regions - step through it day by day on the map.`} as="span" />}
                  className="block-heading"
                />
                <div className="route-map">
                  <DeferredContent>
                    <RouteExperience tour={tour} />
                  </DeferredContent>
                </div>
              </div>

              <div className="block">
                <SectionHeading as="h2" eyebrow={<EditableText copyKey={`tour.${tour.id}.itinerary.eyebrow`} defaultValue="Itinerary" as="span" />} title={<EditableText copyKey={`tour.${tour.id}.itinerary.title`} defaultValue="Day by day" as="span" />} className="block-heading" />
                <DayJumpNav days={d.itinerary.map((day) => ({ day: day.day, title: day.title }))} />
                <TimelineRail className="timeline">
                  {d.itinerary.map((day, i) => (
                    <ItineraryDay key={`${day.day}-${day.title}`} day={day} id={`day-${day.day}`} defaultOpen={i === 0} last={i === d.itinerary.length - 1} />
                  ))}
                </TimelineRail>
              </div>

              <div className="block incl-grid">
                <Reveal className="incl-col">
                  <h3 className="incl-h">
                    <Icon name="check" size={18} /> <EditableText copyKey={`tour.${tour.id}.included.title`} defaultValue="What's included" as="span" />
                  </h3>
                  <ul>
                    {d.inclusions.map((item, i) => (
                      <li key={item}>
                        <EditableText copyKey={`tour.${tour.id}.included.item.${i + 1}`} defaultValue={item} as="span" />
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={100} className="incl-col excl">
                  <h3 className="incl-h">
                    <Icon name="close" size={18} /> <EditableText copyKey={`tour.${tour.id}.excluded.title`} defaultValue="Not included" as="span" />
                  </h3>
                  <ul>
                    {d.exclusions.map((item, i) => (
                      <li key={item}>
                        <EditableText copyKey={`tour.${tour.id}.excluded.item.${i + 1}`} defaultValue={item} as="span" />
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            </div>

            <aside className="side">
              <div className="side-card">
                <p className="side-eyebrow">Group tour · {d.code}</p>
                <p className="side-price">{priceText(tour)}</p>
                <EditableText copyKey={`tour.${tour.id}.side.note`} defaultValue="Net rates for travel-trade partners. Share your dates and group size for a tailored quote." as="p" multiline className="side-note" />
                <dl className="side-facts">
                  <div>
                    <dt>
                      <Icon name="calendar" size={16} /> <EditableText copyKey={`tour.${tour.id}.side.length`} defaultValue="Length" as="span" />
                    </dt>
                    <dd>{formatLength(tour)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="route" size={16} /> <EditableText copyKey={`tour.${tour.id}.side.route`} defaultValue="Route" as="span" />
                    </dt>
                    <dd>
                      {d.startCity} → {d.endCity}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="snowflake" size={16} /> <EditableText copyKey={`tour.${tour.id}.side.season`} defaultValue="Season" as="span" />
                    </dt>
                    <dd>
                      <SeasonBand tour={tour} />
                      <span className="season-caption">{seasonalityText(tour)}</span>
                    </dd>
                  </div>
                  {totalKm > 0 && (
                    <div>
                      <dt>
                        <Icon name="car" size={16} /> <EditableText copyKey={`tour.${tour.id}.side.driving`} defaultValue="Total driving" as="span" />
                      </dt>
                      <dd className="tnum">~{Math.round(totalKm / 10) * 10} km</dd>
                    </div>
                  )}
                  <div>
                    <dt>
                      <Icon name="group" size={16} /> <EditableText copyKey={`tour.${tour.id}.side.typeLabel`} defaultValue="Type" as="span" />
                    </dt>
                    <dd><EditableText copyKey={`tour.${tour.id}.side.typeValue`} defaultValue="Guided group coach tour" as="span" /></dd>
                  </div>
                </dl>
                <div className="side-regions">
                  <EditableText copyKey={`tour.${tour.id}.side.regions`} defaultValue="Regions covered" as="p" className="side-regions-label" />
                  <div className="side-region-chips">
                    {coveredRegions.map((id) => (
                      <Badge key={id} dotColor={regionColors.get(id)} tone="neutral">
                        {regionNames.get(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button href={inquiryHref} className="side-cta">
                  <EditableText copyKey={`tour.${tour.id}.side.cta`} defaultValue="Request a quote" as="span" />
                </Button>
                <PrintItineraryButton />
                <Link className="side-alt" to="/tours">
                  ← <EditableText copyKey={`tour.${tour.id}.side.back`} defaultValue="All tour packages" as="span" />
                </Link>
              </div>

              {testimonial && (
                <figure className="side-quote">
                  <blockquote>“{testimonial.quote}”</blockquote>
                  <figcaption>
                    {testimonial.author} · {testimonial.agency}
                    {testimonial.country ? `, ${testimonial.country}` : ''}
                  </figcaption>
                </figure>
              )}
            </aside>
          </div>
        </Container>
      </Section>

      {relatedFinal.length > 0 && (
        <Section tone="beige" className="rel-section">
          <Container>
            <SectionHeading as="h2" eyebrow={<EditableText copyKey={`tour.${tour.id}.related.eyebrow`} defaultValue="Keep browsing" as="span" />} title={<EditableText copyKey={`tour.${tour.id}.related.title`} defaultValue="More Iceland itineraries" as="span" />} className="block-heading" />
            <div className="rel-grid">
              {relatedFinal.map((t) => (
                <PackageCard key={t.id} tour={t} regionColors={regionColors} regionNames={regionNames} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <Section tone="charcoal" className="tour-cta-band">
        <Container>
          <SectionHeading
            align="center"
            tone="light"
            eyebrow={<EditableText copyKey={`tour.${tour.id}.cta.eyebrow`} defaultValue="Ready to quote" as="span" />}
            title={<EditableText copyKey={`tour.${tour.id}.cta.title`} defaultValue={`Sell ${tourName}`} as="span" />}
            flourish={<EditableText copyKey={`tour.${tour.id}.cta.flourish`} defaultValue="with confidence." as="span" />}
            lead={<EditableText copyKey={`tour.${tour.id}.cta.lead`} defaultValue="Share your dates and group size — we come back with a costed, day-by-day proposal within one business day." as="span" />}
            className="mx-auto"
          />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href={inquiryHref} magnetic>
              <EditableText copyKey={`tour.${tour.id}.cta.primary`} defaultValue={`Request a quote for ${d.code}`} as="span" />
            </Button>
            <Button href="/tours" variant="onDark">
              <EditableText copyKey={`tour.${tour.id}.cta.secondary`} defaultValue="Browse all tours" as="span" />
            </Button>
          </div>
        </Container>
      </Section>

      <QuoteBar code={d.code} inquiryHref={inquiryHref} />
    </BaseLayout>
  );
}
