import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/motion/Reveal';
import Marquee from '@/components/motion/Marquee';
import CardDeckReveal from '@/components/motion/CardDeckReveal';
import ParallaxGallery, { type ParallaxGalleryItem } from '@/components/motion/ParallaxGallery';
import FlipCardCarousel from '@/components/motion/FlipCardCarousel';
import AuroraVeil from '@/components/three/AuroraVeil';
import HeroCrystal from '@/components/three/HeroCrystal';
import SiteIntro from '@/components/home/SiteIntro';
import EditableText from '@/copy/EditableText';
import { getServices, getTestimonials, getFaq } from '@/lib/content';
import { site } from '@/config/site';

const galleryItems: ParallaxGalleryItem[] = [
  {
    photoKey: 'region-reykjavik',
    alt: 'Reykjavik',
    speed: 0.8,
    rotation: -6,
    style: { top: '-4%', left: '8%', width: '15rem' },
    aspectClassName: 'aspect-[4/5]',
  },
  {
    photoKey: 'region-golden-circle',
    alt: 'Golden Circle',
    speed: 0.6,
    rotation: 4,
    style: { top: '14%', right: '12%', width: '14rem' },
    aspectClassName: 'aspect-video',
    visibilityClassName: 'hidden md:block',
  },
  {
    photoKey: 'region-south-coast',
    alt: 'South Coast',
    speed: -0.5,
    rotation: -3,
    style: { top: '78%', left: '30%', width: '10rem' },
    aspectClassName: 'aspect-square',
  },
  {
    photoKey: 'region-jokulsarlon',
    alt: 'Jokulsarlon glacier lagoon',
    speed: -0.7,
    rotation: 5,
    style: { top: '88%', right: '26%', width: '12.5rem' },
    aspectClassName: 'aspect-[4/5]',
    visibilityClassName: 'hidden lg:block',
  },
  {
    photoKey: 'region-akureyri',
    alt: 'Akureyri and North Iceland',
    speed: 1.2,
    rotation: 8,
    style: { top: '-14%', left: '1%', width: '13rem' },
    aspectClassName: 'aspect-[3/4]',
    visibilityClassName: 'hidden sm:block',
  },
  {
    photoKey: 'region-myvatn',
    alt: 'Lake Myvatn',
    speed: 0.9,
    rotation: -7,
    style: { top: '0%', left: '63%', width: '10rem' },
    aspectClassName: 'aspect-square',
    visibilityClassName: 'hidden md:block',
  },
  {
    photoKey: 'region-eastfjords',
    alt: 'East Fjords',
    speed: 1.5,
    rotation: 3,
    style: { top: '-18%', right: '8%', width: '12.5rem' },
    aspectClassName: 'aspect-[4/5]',
  },
  {
    photoKey: 'region-snaefellsnes',
    alt: 'Snaefellsnes Peninsula',
    speed: -1.1,
    rotation: -5,
    style: { top: '106%', right: '-1%', width: '12rem' },
    aspectClassName: 'aspect-video',
    visibilityClassName: 'hidden lg:block',
  },
];

export default function HomePage() {
  const services = getServices();
  const testimonials = getTestimonials();
  const faq = getFaq();
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: site.legalName,
      description: site.description,
      url: site.url,
      areaServed: 'Iceland',
      email: site.inquiryEmail,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <BaseLayout
      title="Iceland DMC & Ground Operator"
      description="Idcibidci is an Iceland destination management company for travel agencies, tour operators, and MICE planners seeking a reliable local ground partner."
      jsonLd={jsonLd}
    >
      <SiteIntro />
      <section className="home-hero">
        <AuroraVeil variant="light" />
        <Container className="home-hero-inner">
          <div className="home-hero-copy">
            <EditableText
              copyKey="home.hero.eyebrow"
              defaultValue="Iceland Destination Management Company (DMC)"
              as="span"
              className="u-eyebrow"
            />
            <h1 className="home-hero-title">
              <EditableText copyKey="home.hero.titleLine1" defaultValue="Your ground partner." as="span" />
              <EditableText copyKey="home.hero.titleLine2" defaultValue="Trade-ready Iceland." as="span" />
              <EditableText copyKey="home.hero.titleLine3" defaultValue="Beautifully run." as="span" className="u-flourish" />
            </h1>
            <EditableText
              copyKey="home.hero.lead"
              defaultValue={site.description}
              as="p"
              multiline
              className="home-hero-lead"
            />
            <EditableText
              copyKey="home.hero.partner"
              defaultValue="Your local Icelandic partner. We craft memorable experiences, interesting itineraries and smooth-flowing tours for international travel agencies and MICE planners."
              as="p"
              multiline
              className="home-hero-partner"
            />
            <div className="home-hero-actions">
              <Button href="/contact#inquiry" magnetic>
                <EditableText copyKey="home.hero.primaryCta" defaultValue="Request a quote" as="span" />
              </Button>
              <Button href="/tours" variant="secondary">
                <EditableText copyKey="home.hero.secondaryCta" defaultValue="Browse tour packages" as="span" />
              </Button>
            </div>
          </div>
          <div className="home-hero-art" aria-hidden="true">
            <HeroCrystal />
          </div>
        </Container>
      </section>

      <Marquee
        className="home-marquee"
        items={site.trustBullets}
        keyFor={(b) => b.label}
        renderItem={(b) => (
          <>
            <Icon name={b.icon} size={18} />
            <EditableText
              copyKey={`home.trustBullet.${b.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              defaultValue={b.label}
              as="span"
            />
          </>
        )}
      />

      <Section tone="cream" className="home-deck-section">
        <CardDeckReveal
          eyebrow={
            <div className="deck-badges">
              <span className="deck-dot" />
              <EditableText copyKey="home.deck.badge1" defaultValue="Your Iceland Partner" as="span" />
              <span className="deck-dot" />
              <EditableText copyKey="home.deck.badge2" defaultValue="Our Services for You" as="span" />
            </div>
          }
          heading={
            <h2 className="deck-title">
              <EditableText copyKey="home.deck.heading1" defaultValue="One Iceland Partner" as="span" />
              <EditableText copyKey="home.deck.heading2" defaultValue="from brief to departure" as="span" className="u-flourish" />
            </h2>
          }
          items={services.map((s) => ({
            icon: s.data.icon,
            title: s.data.name,
            body: s.data.summary,
            highlight: s.data.slug === 'group-tours',
          }))}
        />
      </Section>

      <ParallaxGallery items={galleryItems} aurora>
        <div className="pgallery-copy">
          <EditableText
            copyKey="home.destinations.eyebrow"
            defaultValue="Destinations"
            as="span"
            className="u-eyebrow is-on-dark"
          />
          <h2 className="pgallery-title">
            <EditableText copyKey="home.destinations.title1" defaultValue="Trace the Ring Road." as="span" />
            <EditableText copyKey="home.destinations.title2" defaultValue="Cross the South Coast." as="span" />
            <EditableText copyKey="home.destinations.title3" defaultValue="Stand beside ice." as="span" className="u-flourish" />
          </h2>
          <EditableText
            copyKey="home.destinations.lead"
            defaultValue="From the South Coast to the Round Island / Ring Road, our ready-to-sell itineraries span 4 to 11 nights. They are fully customisable, with activities adapted to the season, daylight and your clients’ preferred pace."
            as="p"
            multiline
            className="pgallery-lead"
          />
        </div>
      </ParallaxGallery>

      <Section tone="white">
        <Container>
          <div className="quote-section">
            <div>
              <EditableText copyKey="home.quote.eyebrow" defaultValue="Request a Quote" as="span" className="u-eyebrow" />
              <h2 className="quote-title">
                <EditableText copyKey="home.quote.title1" defaultValue="Tell us your brief." as="span" />
                <EditableText copyKey="home.quote.title2" defaultValue="Or share your" as="span" />
                <EditableText copyKey="home.quote.title3" defaultValue="itinerary." as="span" className="u-flourish" />
              </h2>
              <EditableText
                copyKey="home.quote.lead"
                defaultValue="Tell us your dates, headcount, budget, hotel category, travel style and preferred sights or activities. If you already have an itinerary, share it with us."
                as="p"
                multiline
                className="quote-lead"
              />
              <ul className="quote-ticks">
                <li>
                  <Icon name="check" size={20} />
                  <EditableText copyKey="home.quote.tick1" defaultValue="Net rates for travel-trade partners" as="span" />
                </li>
                <li>
                  <Icon name="check" size={20} />
                  <EditableText copyKey="home.quote.tick2" defaultValue="Clear inclusions and optional add-ons" as="span" />
                </li>
                <li>
                  <Icon name="check" size={20} />
                  <EditableText copyKey="home.quote.tick3" defaultValue="Weather-aware local operations" as="span" />
                </li>
              </ul>
            </div>
            <Reveal className="quote-card">
              <div className="quote-card-head">
                <div>
                  <p className="quote-card-kicker">Quote #IDC-2026</p>
                  <h3>5 Nights South Coast</h3>
                </div>
                <div className="quote-card-price">
                  <p className="quote-card-kicker">Trade scope</p>
                  <p>Price on request</p>
                </div>
              </div>
              <ul className="quote-card-items">
                <li>
                  <Icon name="car" size={20} />
                  <span>Coach &amp; driver-guide</span>
                  <em>Included</em>
                </li>
                <li>
                  <Icon name="bed" size={20} />
                  <span>5 nights hotels</span>
                  <em>Quoted</em>
                </li>
                <li>
                  <Icon name="layers" size={20} />
                  <span>Optional add-ons</span>
                  <em>Separate</em>
                </li>
              </ul>
              <Button href="/contact#inquiry" className="quote-card-cta">
                <EditableText copyKey="home.quote.cardCta" defaultValue="Request a quote" as="span" />
              </Button>
            </Reveal>
          </div>
        </Container>
      </Section>

      {testimonials.length > 0 && (
        <Section tone="charcoal">
          <Container>
            <SectionHeading eyebrow="Partners" title="Trusted by agencies across the region" tone="light" align="center" className="mx-auto" />
            <div className="quotes">
              {testimonials.map((t) => (
                <figure key={t.id} className="quote u-reveal">
                  <Icon name="quote" size={26} className="quote-mark" />
                  <blockquote>{t.quote}</blockquote>
                  <figcaption>
                    <span className="quote-author">{t.author}</span>
                    <span className="quote-agency">
                      {t.agency}
                      {t.country ? ` · ${t.country}` : ''}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </Section>
      )}

      <Section tone="sand">
        <Container>
          <SectionHeading
            eyebrow={<EditableText copyKey="home.faq.eyebrow" defaultValue="Partner Questions" as="span" />}
            title={<EditableText copyKey="home.faq.title" defaultValue="Frequently Asked Questions" as="span" />}
            lead={<EditableText copyKey="home.faq.lead" defaultValue="What agencies and planners ask before sending us an Iceland brief." as="span" />}
            align="center"
            className="mx-auto"
          />
          <FlipCardCarousel
            className="mt-20"
            cards={faq.map((f) => ({ question: f.question, heading: f.heading, answer: f.answer, icon: f.icon, photoKey: f.photoKey }))}
          />
        </Container>
      </Section>

      <section className="home-cta">
        <AuroraVeil variant="dark" />
        <Container className="home-cta-inner">
          <Reveal as="h2" className="home-cta-title">
            <EditableText copyKey="home.cta.title1" defaultValue="From first brief." as="span" />
            <EditableText copyKey="home.cta.title2" defaultValue="To final transfer." as="span" />
            <EditableText copyKey="home.cta.title3" defaultValue="We run Iceland." as="span" className="u-flourish" />
          </Reveal>
          <Reveal delay={100}>
            <EditableText
              copyKey="home.cta.lead"
              defaultValue="Your trusted Iceland partner. From planning and pricing to bookings, operations and local support, we take care of everything in Iceland so you can focus on selling unforgettable Icelandic experiences."
              as="p"
              multiline
              className="home-cta-lead"
            />
          </Reveal>
          <Reveal delay={200} className="home-cta-actions">
            <Button href="/contact#inquiry" pulse magnetic>
              <EditableText copyKey="home.cta.primaryCta" defaultValue="Request a quote" as="span" />
            </Button>
            <Button href="/tours" variant="onDark">
              <EditableText copyKey="home.cta.secondaryCta" defaultValue="Browse tours" as="span" />
            </Button>
          </Reveal>
        </Container>
      </section>
    </BaseLayout>
  );
}
