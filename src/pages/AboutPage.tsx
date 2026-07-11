import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/motion/Reveal';
import { getOffices } from '@/lib/content';
import Pic from '@/components/ui/Pic';

const values = [
  { icon: 'map-pin', title: 'Local, on the ground', body: 'A licensed Icelandic DMC operating from Reykjavik - real roads, real weather, real relationships with hotels and guides.' },
  { icon: 'group', title: 'Built for the trade', body: 'We work only with travel agencies and planners, at net rates, with the clarity and reliability the B2B relationship demands.' },
  { icon: 'compass', title: 'Asia Pacific focus', body: 'A dedicated Kuala Lumpur sales office means partners across the region get answers in their timezone.' },
  { icon: 'sparkles', title: 'Boutique service', body: 'From a couple on a self-drive to a 40-strong incentive group, every programme gets the same considered attention.' },
];

const stats = [
  { n: '2', label: 'Offices - Reykjavik & Kuala Lumpur' },
  { n: '6', label: 'Ready-to-sell group itineraries' },
  { n: '8', label: 'Regions across the Ring Road' },
  { n: '100%', label: 'Focused on the travel trade' },
];

export default function AboutPage() {
  const offices = getOffices();

  return (
    <BaseLayout title="About Idcibidci" description="Idcibidci ehf is a licensed Iceland destination management company serving travel agencies and MICE planners, with offices in Reykjavik and Kuala Lumpur.">
      <section className="ahero">
        <Pic photoKey="hero-about" alt="Turf-roofed Icelandic buildings beneath a mountain" className="ahero-bg" loading="eager" fetchPriority="high" />
        <div className="ahero-scrim" />
        <Container className="ahero-inner">
          <p className="u-eyebrow text-white/80">About us</p>
          <h1 className="ahero-title">Your licensed ground partner in Iceland</h1>
          <p className="ahero-lead">Idcibidci ehf is a destination management company built for the travel trade - pairing deep Icelandic know-how with a sales team on your side of the world.</p>
        </Container>
      </section>

      <Section tone="cream">
        <Container>
          <div className="intro">
            <div className="intro-copy">
              <SectionHeading eyebrow="Who we are" title="A destination management company, not a booking site" lead="We are the operator behind the scenes - the coaches, the driver-guides, the hotel blocks and the contingency plans that let your clients simply enjoy Iceland." />
              <p className="intro-p">From our head office in Reykjavik we design and run tours the length of the Ring Road, handling every logistical detail across a country famous for its fast-changing weather. Our Kuala Lumpur sales office keeps agency partners across Asia Pacific close, informed and quickly quoted.</p>
              <p className="intro-p">We don't sell to the public. Everything we do is for travel agencies, tour operators and MICE planners who need a dependable Icelandic partner they can put their name to.</p>
            </div>
            <dl className="stats">
              {stats.map((s) => (
                <div key={s.label} className="stat">
                  <dt className="stat-n">{s.n}</dt>
                  <dd className="stat-l">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container>
          <SectionHeading eyebrow="How we work" title="What partners can count on" align="center" className="mx-auto" />
          <div className="values">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 80} className="value">
                <span className="value-icon">
                  <Icon name={v.icon} size={22} />
                </span>
                <h3 className="value-title">{v.title}</h3>
                <p className="value-body">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="beige">
        <Container>
          <SectionHeading eyebrow="Find us" title="Two offices, one team" />
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
          <div className="about-cta">
            <Button href="/contact#inquiry">Start an inquiry</Button>
            <Button href="/services" variant="secondary">
              See our services
            </Button>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
