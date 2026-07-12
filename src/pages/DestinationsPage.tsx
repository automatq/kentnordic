import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import SectionHeading from '@/components/ui/SectionHeading';
import IcelandMap from '@/components/map/IcelandMap';
import RegionCards from '@/components/map/RegionCards';
import TourWalkthrough from '@/components/map/TourWalkthrough';
import Marquee from '@/components/motion/Marquee';
import Pic from '@/components/ui/Pic';
import EditableText from '@/copy/EditableText';
import { getRegions, getTours } from '@/lib/packages';
import { buildBreadcrumbJsonLd } from '@/lib/seo';

export default function DestinationsPage() {
  const regions = getRegions();
  const tours = getTours();
  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Destinations', path: '/destinations' },
  ]);

  return (
    <BaseLayout
      title="Iceland Destinations By Region"
      description="Explore Iceland by region with an interactive map built for travel trade buyers, from the Golden Circle and South Coast to North Iceland and the Ring Road."
      jsonLd={jsonLd}
    >
      <section className="dhero">
        <Pic photoKey="hero-destinations" alt="Map-like aerial view of Iceland's coastline and highlands" className="dhero-bg" loading="eager" fetchPriority="high" />
        <div className="dhero-scrim" />
        <Container className="dhero-inner">
          <EditableText copyKey="destinations.hero.eyebrow" defaultValue="Destinations" as="p" className="u-eyebrow text-white/80" />
          <EditableText copyKey="destinations.hero.title" defaultValue="Explore Iceland by region" as="h1" className="dhero-title" />
          <EditableText copyKey="destinations.hero.lead" defaultValue="Eight regions, one Ring Road. Select a region on the map to see its signature sights and the tour packages that take your clients there." as="p" multiline className="dhero-lead" />
        </Container>
      </section>

      <Marquee
        items={regions}
        keyFor={(r) => r.id}
        renderItem={(r) => (
          <a href={`#region-card-${r.id}`} className="marquee-region">
            <span className="marquee-region-dot" style={{ background: r.data.color }} />
            {r.data.name}
          </a>
        )}
      />

      <Section tone="cream">
        <Container>
          <IcelandMap interactive />
        </Container>
      </Section>

      <Section tone="white" id="walkthrough">
        <Container>
          <SectionHeading
            eyebrow={<EditableText copyKey="destinations.walkthrough.eyebrow" defaultValue="Follow a tour" as="span" />}
            title={<EditableText copyKey="destinations.walkthrough.title" defaultValue="Walk a tour" as="span" />}
            flourish={<EditableText copyKey="destinations.walkthrough.flourish" defaultValue="day by day" as="span" />}
            lead={<EditableText copyKey="destinations.walkthrough.lead" defaultValue="Pick an itinerary and step through it on the map - every stop, drive and overnight, exactly as your clients will travel it." as="span" />}
          />
          <TourWalkthrough tours={tours} className="mt-10" />
        </Container>
      </Section>

      <Section tone="cream">
        <Container>
          <SectionHeading eyebrow={<EditableText copyKey="destinations.regions.eyebrow" defaultValue="Every region" as="span" />} title={<EditableText copyKey="destinations.regions.title" defaultValue="The eight regions at a glance" as="span" />} lead={<EditableText copyKey="destinations.regions.lead" defaultValue="A quick reference to what each part of Iceland offers - and which itineraries include it." as="span" />} />
          <div className="cards-wrap">
            <RegionCards />
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
