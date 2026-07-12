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
import RouteExperience from '@/components/tour/RouteExperience';
import QuoteBar from '@/components/tour/QuoteBar';
import DayJumpNav from '@/components/tour/DayJumpNav';
import PrintItineraryButton from '@/components/tour/PrintItineraryButton';
import SectionHeading from '@/components/ui/SectionHeading';
import Reveal from '@/components/motion/Reveal';
import TimelineRail from '@/components/motion/TimelineRail';
import { getTestimonials, getTour } from '@/lib/content';
import Pic from '@/components/ui/Pic';
import SeasonBand from '@/components/tour/SeasonBand';
import { formatLength, getRegions, getTours, pickTestimonial, priceText, seasonalityText, totalDistanceKm, tourRegionIds } from '@/lib/packages';
import { site } from '@/config/site';

export default function TourDetailPage() {
  const { slug } = useParams();
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
      name: `${d.name} (${d.code})`,
      description: d.summary,
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
        { '@type': 'ListItem', position: 3, name: d.name, item: `${site.url}/tours/${tour.id}` },
      ],
    },
  ];

  return (
    <BaseLayout title={`${d.name} - ${d.days}D/${d.nights}N Iceland Tour`} description={d.summary} image="/og-default.jpg" jsonLd={jsonLd}>
      <section className="thero">
        <Pic photoKey={d.heroImage} alt={d.heroAlt} className="thero-bg" loading="eager" fetchPriority="high" />
        <div className="thero-scrim" />
        <Container className="thero-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/tours">Tour Packages</Link>
            <Icon name="arrow" size={13} />
            <span>{d.name}</span>
          </nav>
          <p className="u-eyebrow">{d.code}</p>
          <h1 className="thero-title">{d.name}</h1>
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
              <p className="lead">{d.summary}</p>

              {sibling && (
                <div className="toggle" role="group" aria-label="Choose travel direction">
                  <span className="toggle-label">Direction</span>
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
                <SectionHeading as="h2" eyebrow="Highlights" title="Trip highlights" className="block-heading" />
                <ul className="highlights">
                  {d.highlights.map((h, i) => (
                    <Reveal as="li" key={h} delay={(i % 4) * 60}>
                      <Icon name="check" size={17} className="hl-icon" />
                      {h}
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
                  eyebrow="The route"
                  title="Walk the route"
                  lead={`This itinerary travels through ${coveredRegions.length} of Iceland's regions - step through it day by day on the map.`}
                  className="block-heading"
                />
                <div className="route-map">
                  <RouteExperience tour={tour} />
                </div>
              </div>

              <div className="block">
                <SectionHeading as="h2" eyebrow="Itinerary" title="Day by day" className="block-heading" />
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
                    <Icon name="check" size={18} /> What's included
                  </h3>
                  <ul>
                    {d.inclusions.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={100} className="incl-col excl">
                  <h3 className="incl-h">
                    <Icon name="close" size={18} /> Not included
                  </h3>
                  <ul>
                    {d.exclusions.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            </div>

            <aside className="side">
              <div className="side-card">
                <p className="side-eyebrow">Group tour · {d.code}</p>
                <p className="side-price">{priceText(tour)}</p>
                <p className="side-note">Net rates for travel-trade partners. Share your dates and group size for a tailored quote.</p>
                <dl className="side-facts">
                  <div>
                    <dt>
                      <Icon name="calendar" size={16} /> Length
                    </dt>
                    <dd>{formatLength(tour)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="route" size={16} /> Route
                    </dt>
                    <dd>
                      {d.startCity} → {d.endCity}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Icon name="snowflake" size={16} /> Season
                    </dt>
                    <dd>
                      <SeasonBand tour={tour} />
                      <span className="season-caption">{seasonalityText(tour)}</span>
                    </dd>
                  </div>
                  {totalKm > 0 && (
                    <div>
                      <dt>
                        <Icon name="car" size={16} /> Total driving
                      </dt>
                      <dd className="tnum">~{Math.round(totalKm / 10) * 10} km</dd>
                    </div>
                  )}
                  <div>
                    <dt>
                      <Icon name="group" size={16} /> Type
                    </dt>
                    <dd>Guided group coach tour</dd>
                  </div>
                </dl>
                <div className="side-regions">
                  <p className="side-regions-label">Regions covered</p>
                  <div className="side-region-chips">
                    {coveredRegions.map((id) => (
                      <Badge key={id} dotColor={regionColors.get(id)} tone="neutral">
                        {regionNames.get(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button href={inquiryHref} className="side-cta">
                  Request a quote
                </Button>
                <PrintItineraryButton />
                <Link className="side-alt" to="/tours">
                  ← All tour packages
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
            <SectionHeading as="h2" eyebrow="Keep browsing" title="More Iceland itineraries" className="block-heading" />
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
            eyebrow="Ready to quote"
            title={`Sell ${d.name}`}
            flourish="with confidence."
            lead="Share your dates and group size — we come back with a costed, day-by-day proposal within one business day."
            className="mx-auto"
          />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button href={inquiryHref} magnetic>
              Request a quote for {d.code}
            </Button>
            <Button href="/tours" variant="onDark">
              Browse all tours
            </Button>
          </div>
        </Container>
      </Section>

      <QuoteBar code={d.code} inquiryHref={inquiryHref} />
    </BaseLayout>
  );
}
