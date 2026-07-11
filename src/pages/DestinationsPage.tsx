import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import SectionHeading from '@/components/ui/SectionHeading';
import IcelandMap from '@/components/map/IcelandMap';
import RegionCards from '@/components/map/RegionCards';
import TourWalkthrough from '@/components/map/TourWalkthrough';
import Marquee from '@/components/motion/Marquee';
import { getPhoto } from '@/lib/photos';
import { getRegions, getTours } from '@/lib/packages';

export default function DestinationsPage() {
  const hero = getPhoto('hero-destinations');
  const regions = getRegions();
  const tours = getTours();

  return (
    <BaseLayout title="Destinations - Explore Iceland by Region" description="An interactive map of Iceland's eight regions - from the Golden Circle and South Coast to the Ring Road north - each linked to the tours that visit it.">
      <section className="dhero">
        <img src={hero} alt="Map-like aerial view of Iceland's coastline and highlands" className="dhero-bg" loading="eager" fetchPriority="high" />
        <div className="dhero-scrim" />
        <Container className="dhero-inner">
          <p className="u-eyebrow text-white/80">Destinations</p>
          <h1 className="dhero-title">Explore Iceland by region</h1>
          <p className="dhero-lead">Eight regions, one Ring Road. Select a region on the map to see its signature sights and the tour packages that take your clients there.</p>
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
            eyebrow="Follow a tour"
            title="Walk a tour"
            flourish="day by day"
            lead="Pick an itinerary and step through it on the map - every stop, drive and overnight, exactly as your clients will travel it."
          />
          <TourWalkthrough tours={tours} className="mt-10" />
        </Container>
      </Section>

      <Section tone="cream">
        <Container>
          <SectionHeading eyebrow="Every region" title="The eight regions at a glance" lead="A quick reference to what each part of Iceland offers - and which itineraries include it." />
          <div className="cards-wrap">
            <RegionCards />
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
