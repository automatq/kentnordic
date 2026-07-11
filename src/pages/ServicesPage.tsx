import ReactMarkdown from 'react-markdown';
import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/motion/Reveal';
import CardDeckReveal from '@/components/motion/CardDeckReveal';
import { getServices } from '@/lib/content';
import { getPhoto } from '@/lib/photos';

export default function ServicesPage() {
  const hero = getPhoto('hero-services');
  const services = getServices();

  return (
    <BaseLayout title="Services - FIT, Group Tours & MICE" description="Idcibidci's ground services for travel agencies: independent (FIT) driver-guide and self-drive, fully operated group tours, and MICE / incentive programmes.">
      <section className="shero">
        <img src={hero} alt="Coach touring a mountain road in the Icelandic highlands" className="shero-bg" loading="eager" fetchPriority="high" />
        <div className="shero-scrim" />
        <Container className="shero-inner">
          <p className="u-eyebrow text-white/80">Services</p>
          <h1 className="shero-title">Ground services, end to end</h1>
          <p className="shero-lead">One dependable partner for every kind of Iceland travel - independent, group and corporate.</p>
          <nav className="shero-jump" aria-label="Jump to service">
            {services.map((s) => (
              <a key={s.id} href={`#${s.data.slug}`}>
                {s.data.name}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      <Section tone="white">
        <CardDeckReveal
          heading={<h2 className="deck-title mx-auto text-center">One partner, three ways to travel</h2>}
          items={services.map((s) => ({
            icon: s.data.icon,
            title: s.data.name,
            body: s.data.summary,
            highlight: s.data.slug === 'group-tours',
          }))}
        />
      </Section>

      {services.map((service, i) => (
        <Section key={service.id} id={service.data.slug} tone={i % 2 === 0 ? 'cream' : 'white'}>
          <Container>
            <div className="svc">
              <div className="svc-head">
                <span className="svc-icon">
                  <Icon name={service.data.icon} size={26} />
                </span>
                <div>
                  <p className="u-eyebrow">Service {String(i + 1).padStart(2, '0')}</p>
                  <h2 className="svc-title">{service.data.name}</h2>
                </div>
              </div>
              <p className="svc-summary">{service.data.summary}</p>
              <div className="svc-body">
                <ReactMarkdown>{service.body}</ReactMarkdown>
              </div>
              {service.data.subServices.length > 0 && (
                <div className="svc-subs">
                  {service.data.subServices.map((sub, si) => (
                    <Reveal key={sub.name} delay={si * 80} className="svc-sub">
                      <h3 className="svc-sub-title">
                        <Icon name="check" size={17} /> {sub.name}
                      </h3>
                      <p>{sub.body}</p>
                    </Reveal>
                  ))}
                </div>
              )}
              <Button href="/contact#inquiry" variant="secondary" className="svc-cta">
                Enquire about {service.data.name}
              </Button>
            </div>
          </Container>
        </Section>
      ))}

      <Section tone="charcoal">
        <Container className="text-center">
          <SectionHeading align="center" tone="light" eyebrow="Ready when you are" title="Let's plan your clients' Iceland" lead="Share your brief and we'll build a costed, day-by-day proposal." className="mx-auto" />
          <div className="mt-8 flex justify-center gap-3">
            <Button href="/contact#inquiry">Request a quote</Button>
            <Button href="/tours" variant="onDark">
              Browse tour packages
            </Button>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
