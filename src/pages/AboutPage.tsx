import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/motion/Reveal';
import { getOffices } from '@/lib/content';
import CompanyCredentials from '@/components/company/CompanyCredentials';
import EditablePhoto from '@/copy/EditablePhoto';
import EditableText from '@/copy/EditableText';
import { buildBreadcrumbJsonLd } from '@/lib/seo';

const values = [
  { id: 'local', icon: 'map-pin', title: 'Local, on the ground', body: 'An Icelandic DMC operating from Reykjavik - real roads, real weather, real relationships with hotels and guides.' },
  { id: 'trade', icon: 'group', title: 'Built for the trade', body: 'We work only with travel agencies and planners, at net rates, with the clarity and reliability the B2B relationship demands.' },
  { id: 'apac', icon: 'compass', title: 'Asia Pacific focus', body: 'A dedicated Kuala Lumpur sales office means partners across the region get answers in their timezone.' },
  { id: 'service', icon: 'sparkles', title: 'Boutique service', body: 'From a couple on a self-drive to a 40-strong incentive group, every programme gets the same considered attention.' },
];

const stats = [
  { id: 'offices', n: '2', label: 'Offices - Reykjavik & Kuala Lumpur' },
  { id: 'itineraries', n: '6', label: 'Ready-to-sell group itineraries' },
  { id: 'regions', n: '8', label: 'Regions across the Ring Road' },
  { id: 'trade', n: '100%', label: 'Focused on the travel trade' },
];

export default function AboutPage() {
  const offices = getOffices();
  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
  ]);

  return (
    <BaseLayout
      title="About Our Iceland DMC"
      description="Meet Idcibidci, an Iceland destination management company and ground operator serving travel agencies and MICE planners from Reykjavik and Kuala Lumpur."
      jsonLd={jsonLd}
    >
      <section className="ahero">
        <EditablePhoto
          photoKey="hero-about"
          alt="Turf-roofed Icelandic buildings beneath a mountain"
          className="ahero-bg"
          frameClassName="ahero-bg"
          loading="eager"
          fetchPriority="high"
        />
        <div className="ahero-scrim" />
        <Container className="ahero-inner">
          <EditableText copyKey="about.hero.eyebrow" defaultValue="About us" as="p" className="u-eyebrow text-white/80" />
          <EditableText copyKey="about.hero.title" defaultValue="Your ground partner in Iceland" as="h1" className="ahero-title" />
          <EditableText copyKey="about.hero.lead" defaultValue="Idcibidci ehf is a destination management company built for the travel trade - pairing deep Icelandic know-how with a sales team on your side of the world." as="p" multiline className="ahero-lead" />
        </Container>
      </section>

      <Section tone="cream">
        <Container>
          <div className="intro">
            <div className="intro-copy">
              <SectionHeading eyebrow={<EditableText copyKey="about.intro.eyebrow" defaultValue="Who we are" as="span" />} title={<EditableText copyKey="about.intro.title" defaultValue="A destination management company, not a booking site" as="span" />} lead={<EditableText copyKey="about.intro.lead" defaultValue="We are the operator behind the scenes - the coaches, the driver-guides, the hotel blocks and the contingency plans that let your clients simply enjoy Iceland." as="span" />} />
              <EditableText copyKey="about.intro.body1" defaultValue="From our head office in Reykjavik we design and run tours the length of the Ring Road, handling every logistical detail across a country famous for its fast-changing weather. Our Kuala Lumpur sales office keeps agency partners across Asia Pacific close, informed and quickly quoted." as="p" multiline className="intro-p" />
              <EditableText copyKey="about.intro.body2" defaultValue="We don't sell to the public. Everything we do is for travel agencies, tour operators and MICE planners who need a dependable Icelandic partner they can put their name to." as="p" multiline className="intro-p" />
            </div>
            <dl className="stats">
              {stats.map((s) => (
                <div key={s.label} className="stat">
                  <EditableText copyKey={`about.stats.${s.id}.number`} defaultValue={s.n} as="dt" className="stat-n" />
                  <EditableText copyKey={`about.stats.${s.id}.label`} defaultValue={s.label} as="dd" className="stat-l" />
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container>
          <SectionHeading eyebrow={<EditableText copyKey="about.values.eyebrow" defaultValue="How we work" as="span" />} title={<EditableText copyKey="about.values.title" defaultValue="What partners can count on" as="span" />} align="center" className="mx-auto" />
          <div className="values">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 80} className="value">
                <span className="value-icon">
                  <Icon name={v.icon} size={22} />
                </span>
                <EditableText copyKey={`about.values.${v.id}.title`} defaultValue={v.title} as="h3" className="value-title" />
                <EditableText copyKey={`about.values.${v.id}.body`} defaultValue={v.body} as="p" multiline className="value-body" />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="beige">
        <Container>
          <SectionHeading eyebrow={<EditableText copyKey="about.offices.eyebrow" defaultValue="Find us" as="span" />} title={<EditableText copyKey="about.offices.title" defaultValue="Two offices, one team" as="span" />} />
          <div className="offices">
            {offices.map((o, i) => (
              <Reveal key={o.id} delay={i * 100} className="office">
                <p className="office-name">
                  {o.name}
                  {o.isHQ && <span className="office-hq">Head office</span>}
                </p>
                <p className="office-role">{o.role}</p>
                <address className="office-addr">
                  {o.addressLines.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                  <span>
                    {o.city}, {o.country}
                  </span>
                </address>
                <div className="office-contact">
                  {o.email && (
                    <a href={`mailto:${o.email}`}>
                      <Icon name="mail" size={15} /> {o.email}
                    </a>
                  )}
                  {o.phone && (
                    <a href={`tel:${o.phone.replace(/\s/g, '')}`}>
                      <Icon name="phone" size={15} /> {o.phone}
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <CompanyCredentials title="Licensing & company details" className="mt-10" />
          <div className="about-cta">
            <Button href="/contact#inquiry">
              <EditableText copyKey="about.cta.primary" defaultValue="Start an inquiry" as="span" />
            </Button>
            <Button href="/services" variant="secondary">
              <EditableText copyKey="about.cta.secondary" defaultValue="See our services" as="span" />
            </Button>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
