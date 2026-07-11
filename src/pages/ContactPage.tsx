import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/motion/Reveal';
import InquiryForm from '@/components/react/InquiryForm';
import { getOffices } from '@/lib/content';
import { getPhoto } from '@/lib/photos';
import { getTours } from '@/lib/packages';
import { site } from '@/config/site';

export default function ContactPage() {
  const hero = getPhoto('hero-contact');
  const offices = getOffices();
  const packages = getTours().map((t) => ({ code: t.data.code, name: t.data.name }));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: site.legalName,
    url: site.url,
    email: site.inquiryEmail,
    address: offices.map((o) => ({
      '@type': 'PostalAddress',
      streetAddress: o.addressLines.join(', '),
      addressLocality: o.city,
      addressCountry: o.country,
    })),
  };

  return (
    <BaseLayout title="Contact & Inquiry" description="Request a quote or reach the Idcibidci team in Reykjavik and Kuala Lumpur. B2B ground operator for Iceland." jsonLd={jsonLd}>
      <section className="chero">
        <img src={hero} alt="Quiet Icelandic coastline at first light" className="chero-bg" loading="eager" fetchPriority="high" />
        <div className="chero-scrim" />
        <Container className="chero-inner">
          <p className="u-eyebrow text-white/80">Contact</p>
          <h1 className="chero-title">Let's build an itinerary</h1>
          <p className="chero-lead">Tell us about your group and we'll come back with a tailored, net-rate quote - usually within one business day.</p>
        </Container>
      </section>

      <Section tone="cream">
        <Container>
          <div className="c-layout">
            <div className="c-form" id="inquiry">
              <h2 className="c-form-title">Request a quote</h2>
              <p className="c-form-note">
                Fields marked <span className="req">*</span> are required.
              </p>
              <InquiryForm packages={packages} endpoint={site.form.endpoint} accessKey={site.form.accessKey} />
            </div>

            <aside className="c-side">
              <div className="c-quick">
                <h2 className="c-side-title">Talk to us</h2>
                <a className="c-quick-row" href={`mailto:${site.inquiryEmail}`}>
                  <Icon name="mail" size={18} />
                  <span>{site.inquiryEmail}</span>
                </a>
                <a className="c-quick-row" href={`tel:${site.phone.replace(/\s/g, '')}`}>
                  <Icon name="phone" size={18} />
                  <span>{site.phone} · Reykjavik</span>
                </a>
                <a className="c-quick-row" href={`tel:${site.phoneKL.replace(/\s/g, '')}`}>
                  <Icon name="phone" size={18} />
                  <span>{site.phoneKL} · Kuala Lumpur</span>
                </a>
              </div>

              <div className="c-offices">
                {offices.map((o, i) => (
                  <Reveal key={o.id} delay={i * 100} className="c-office">
                    <p className="c-office-name">
                      {o.name}
                      {o.isHQ && <span className="c-hq">HQ</span>}
                    </p>
                    <p className="c-office-role">{o.role}</p>
                    <address className="c-office-addr">
                      {o.addressLines.map((l) => (
                        <span key={l}>{l}</span>
                      ))}
                      <span>
                        {o.city}, {o.country}
                      </span>
                    </address>
                    {o.hours && <p className="c-office-hours">{o.hours}</p>}
                  </Reveal>
                ))}
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
