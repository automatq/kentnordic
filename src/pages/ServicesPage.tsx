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
import Pic from '@/components/ui/Pic';
import EditableText from '@/copy/EditableText';
import { buildBreadcrumbJsonLd } from '@/lib/seo';

export default function ServicesPage() {
  const services = getServices();
  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
  ]);

  return (
    <BaseLayout
      title="Iceland DMC Services"
      description="Explore Idcibidci's Iceland ground services for travel agencies: FIT programs, group tours, and MICE / incentive operations."
      jsonLd={jsonLd}
    >
      <section className="shero">
        <Pic photoKey="hero-services" alt="Coach touring a mountain road in the Icelandic highlands" className="shero-bg" loading="eager" fetchPriority="high" />
        <div className="shero-scrim" />
        <Container className="shero-inner">
          <EditableText copyKey="services.hero.eyebrow" defaultValue="Services" as="p" className="u-eyebrow text-white/80" />
          <EditableText copyKey="services.hero.title" defaultValue="Ground services, end to end" as="h1" className="shero-title" />
          <EditableText copyKey="services.hero.lead" defaultValue="One dependable partner for every kind of Iceland travel - independent, group and corporate." as="p" multiline className="shero-lead" />
          <nav className="shero-jump" aria-label="Jump to service">
            {services.map((s) => (
              <a key={s.id} href={`#${s.data.slug}`}>
                <EditableText copyKey={`services.${s.id}.name`} defaultValue={s.data.name} as="span" />
              </a>
            ))}
          </nav>
        </Container>
      </section>

      <Section tone="white">
        <CardDeckReveal
          heading={<h2 className="deck-title mx-auto text-center"><EditableText copyKey="services.deck.title" defaultValue="One partner, three ways to travel" as="span" /></h2>}
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
                  <EditableText copyKey={`services.${service.id}.name`} defaultValue={service.data.name} as="h2" className="svc-title" />
                </div>
              </div>
              <EditableText copyKey={`services.${service.id}.summary`} defaultValue={service.data.summary} as="p" multiline className="svc-summary" />
              <div className="svc-body">
                <ReactMarkdown>{service.body}</ReactMarkdown>
              </div>
              {service.data.subServices.length > 0 && (
                <div className="svc-subs">
                  {service.data.subServices.map((sub, si) => (
                    <Reveal key={sub.name} delay={si * 80} className="svc-sub">
                      <h3 className="svc-sub-title">
                        <Icon name="check" size={17} /> <EditableText copyKey={`services.${service.id}.sub.${si + 1}.title`} defaultValue={sub.name} as="span" />
                      </h3>
                      <EditableText copyKey={`services.${service.id}.sub.${si + 1}.body`} defaultValue={sub.body} as="p" multiline />
                    </Reveal>
                  ))}
                </div>
              )}
              <Button href="/contact#inquiry" variant="secondary" className="svc-cta">
                <EditableText copyKey={`services.${service.id}.cta`} defaultValue={`Enquire about ${service.data.name}`} as="span" />
              </Button>
            </div>
          </Container>
        </Section>
      ))}

      <Section tone="charcoal">
        <Container className="text-center">
          <SectionHeading align="center" tone="light" eyebrow={<EditableText copyKey="services.cta.eyebrow" defaultValue="Ready when you are" as="span" />} title={<EditableText copyKey="services.cta.title" defaultValue="Let's plan your clients' Iceland" as="span" />} lead={<EditableText copyKey="services.cta.lead" defaultValue="Share your brief and we'll build a costed, day-by-day proposal." as="span" />} className="mx-auto" />
          <div className="mt-8 flex justify-center gap-3">
            <Button href="/contact#inquiry"><EditableText copyKey="services.cta.primary" defaultValue="Request a quote" as="span" /></Button>
            <Button href="/tours" variant="onDark">
              <EditableText copyKey="services.cta.secondary" defaultValue="Browse tour packages" as="span" />
            </Button>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
