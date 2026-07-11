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
import { getServices, getTestimonials, getFaq } from '@/lib/content';
import { site } from '@/config/site';

const CUBE_FACES = [
  { points: '0,0 -50,-28.87 0,-57.74 50,-28.87' },
  { points: '-50,-28.87 -50,28.87 0,57.74 0,0' },
  { points: '0,0 0,57.74 50,28.87 50,-28.87' },
];

const heroClusters: Array<{ x: number; y: number; fills: Array<string | null>; startDelay: number }> = [
  { x: 0, y: 0, fills: ['beige', 'white', 'line'], startDelay: 0.2 },
  { x: -50, y: 86.6, fills: ['cream', 'beige', 'white'], startDelay: 0.35 },
  { x: 100, y: 28.87, fills: ['white', 'line', 'beige'], startDelay: 0.5 },
  { x: 50, y: -86.6, fills: [null, 'beige', 'white'], startDelay: 0.65 },
  { x: -100, y: -28.87, fills: ['white', 'cream', 'line'], startDelay: 0.75 },
];

const heroLines = [
  { x1: 150, y1: 0, x2: 150, y2: 175, delay: 0 },
  { x1: 250, y1: 40, x2: 250, y2: 120, delay: 0.05 },
  { x1: 300, y1: 80, x2: 300, y2: 200, delay: 0.1 },
  { x1: 100, y1: 100, x2: 100, y2: 260, delay: 0.15 },
];

const heroTailLines = [
  { x1: 200, y1: 257.74, x2: 200, y2: 350, delay: 1.0 },
  { x1: 300, y1: 287.74, x2: 300, y2: 380, delay: 1.05 },
];

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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: site.legalName,
    description: site.description,
    url: site.url,
    areaServed: 'Iceland',
    email: site.inquiryEmail,
  };

  return (
    <BaseLayout title="Iceland Ground Operator & DMC" jsonLd={jsonLd}>
      <section className="home-hero">
        <Container className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="u-eyebrow">Iceland Destination Management</span>
            <h1 className="home-hero-title">
              <span>Your ground partner.</span>
              <span>Trade-ready Iceland.</span>
              <span className="u-flourish">Beautifully run.</span>
            </h1>
            <p className="home-hero-lead">{site.description}</p>
            <div className="home-hero-actions">
              <Button href="/contact#inquiry">Request a quote</Button>
              <Button href="/tours" variant="secondary">
                Browse tour packages
              </Button>
            </div>
          </div>
          <div className="home-hero-art" aria-hidden="true">
            <svg viewBox="0 0 400 400" className="home-hero-svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              {heroLines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  strokeWidth="1"
                  style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: `${l.delay}s` }}
                />
              ))}
              {heroClusters.map((cluster, ci) => (
                <g key={ci} transform={`translate(${200 + cluster.x}, ${200 + cluster.y})`}>
                  {CUBE_FACES.map((face, fi) => {
                    const fill = cluster.fills[fi];
                    if (!fill) return null;
                    const delay = cluster.startDelay + fi * 0.05;
                    return (
                      <polygon
                        key={fi}
                        points={face.points}
                        style={{
                          fill: `var(--color-${fill})`,
                          stroke: 'currentColor',
                          strokeDasharray: 1000,
                          animation: 'home-draw-line 2s ease-out both, home-fade-block 2s ease-out both',
                          animationDelay: `${delay}s`,
                        }}
                      />
                    );
                  })}
                </g>
              ))}
              <polyline
                points="50,258.87 100,287.74 150,258.87 150,201.13"
                strokeWidth="1"
                style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: '0.9s' }}
              />
              <polyline
                points="250,258.87 300,287.74 350,258.87 350,201.13"
                strokeWidth="1"
                style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: '0.95s' }}
              />
              {heroTailLines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  strokeWidth="1"
                  style={{ strokeDasharray: 1000, animation: 'home-draw-line 2s ease-out both', animationDelay: `${l.delay}s` }}
                />
              ))}
            </svg>
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
            <span>{b.label}</span>
          </>
        )}
      />

      <Section tone="cream" className="home-deck-section">
        <CardDeckReveal
          eyebrow={
            <div className="deck-badges">
              <span className="deck-dot" />
              <span>Not a Reseller</span>
              <span className="deck-dot" />
              <span>Trade Only</span>
            </div>
          }
          heading={
            <h2 className="deck-title">
              <span>One Iceland Partner</span>
              <span className="u-flourish">from brief to departure</span>
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

      <ParallaxGallery items={galleryItems}>
        <div className="pgallery-copy">
          <span className="u-eyebrow is-on-dark">Destinations</span>
          <h2 className="pgallery-title">
            <span>Trace the Ring Road.</span>
            <span>Cross the South Coast.</span>
            <span className="u-flourish">Stand beside ice.</span>
          </h2>
          <p className="pgallery-lead">
            Eight regions, six ready-to-sell itineraries and the local judgement to adapt each route around weather, season and
            group pace.
          </p>
        </div>
      </ParallaxGallery>

      <Section tone="white">
        <Container>
          <div className="quote-section">
            <div>
              <span className="u-eyebrow">Quote Workflow</span>
              <h2 className="quote-title">
                <span>Share the brief.</span>
                <span>Get a costed</span>
                <span className="u-flourish">day-by-day plan.</span>
              </h2>
              <p className="quote-lead">
                Tell us dates, pax, budget and travel style. We return a practical itinerary with hotels, coach, driver-guide,
                sightseeing and optional add-ons clearly separated.
              </p>
              <ul className="quote-ticks">
                <li>
                  <Icon name="check" size={20} />
                  <span>Net rates for travel-trade partners</span>
                </li>
                <li>
                  <Icon name="check" size={20} />
                  <span>Clear inclusions and optional add-ons</span>
                </li>
                <li>
                  <Icon name="check" size={20} />
                  <span>Weather-aware local operations</span>
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
                Request a quote
              </Button>
            </Reveal>
          </div>
        </Container>
      </Section>

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

      <Section tone="cream">
        <Container>
          <SectionHeading eyebrow="Partner Questions" title="Frequently Asked Questions" lead="What agencies and planners ask before sending us an Iceland brief." align="center" className="mx-auto" />
          <FlipCardCarousel
            className="mt-12"
            cards={faq.map((f) => ({ question: f.question, heading: f.heading, answer: f.answer, icon: f.icon, photoKey: f.photoKey }))}
          />
        </Container>
      </Section>

      <section className="home-cta">
        <Container className="home-cta-inner">
          <Reveal as="h2" className="home-cta-title">
            <span>From first brief.</span>
            <span>To final transfer.</span>
            <span className="u-flourish">We run Iceland.</span>
          </Reveal>
          <Reveal as="p" delay={100} className="home-cta-lead">
            Send your dates, pax and preferred route. We will come back with a clear, costed proposal your agency can sell with
            confidence.
          </Reveal>
          <Reveal delay={200} className="home-cta-actions">
            <Button href="/contact#inquiry" pulse>
              Request a quote
            </Button>
            <Button href="/tours" variant="onDark">
              Browse tours
            </Button>
          </Reveal>
        </Container>
      </section>
    </BaseLayout>
  );
}
