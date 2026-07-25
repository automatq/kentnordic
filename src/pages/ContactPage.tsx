import BaseLayout from "@/layouts/BaseLayout";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/motion/Reveal";
import RequestQuoteForm from "@/components/react/RequestQuoteForm";
import { getOffices, getTestimonials } from "@/lib/content";
import { getTours } from "@/lib/packages";
import { site } from "@/config/site";
import CompanyCredentials from "@/components/company/CompanyCredentials";
import EditablePhoto from "@/copy/EditablePhoto";
import EditableText from "@/copy/EditableText";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

export default function ContactPage() {
  const offices = getOffices();
  const testimonial = getTestimonials()[0];
  const packages = getTours().map((t) => ({
    code: t.data.code,
    name: t.data.name,
  }));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: site.legalName,
      url: site.url,
      email: site.inquiryEmail,
      address: offices.map((o) => ({
        "@type": "PostalAddress",
        ...(o.addressLines.length > 0
          ? { streetAddress: o.addressLines.join(", ") }
          : {}),
        addressLocality: o.city,
        addressCountry: o.country,
      })),
    },
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Contact", path: "/contact" },
    ]),
  ];

  return (
    <BaseLayout
      title="Contact & Inquiry"
      description="Contact Idcibidci, an Iceland destination management company and ground operator for travel agencies, tour operators, and MICE planners."
      jsonLd={jsonLd}
    >
      <section className="chero">
        <EditablePhoto
          photoKey="hero-contact"
          alt="Quiet Icelandic coastline at first light"
          className="chero-bg"
          frameClassName="chero-bg"
          loading="eager"
          fetchPriority="high"
        />
        <div className="chero-scrim" />
        <Container className="chero-inner">
          <EditableText copyKey="contact.hero.eyebrow" defaultValue="Request a Quote" as="p" className="u-eyebrow text-white/80" />
          <EditableText copyKey="contact.hero.title" defaultValue="Tell us your brief or share your itinerary" as="h1" className="chero-title" />
          <EditableText copyKey="contact.hero.lead" defaultValue="Share your dates, headcount, budget, hotel category, travel style and preferred sights or activities. We will give you honest local advice, show the possibilities in Iceland and quote the best available rates." as="p" multiline className="chero-lead" />
        </Container>
      </section>

      <Section tone="cream">
        <Container>
          <div className="c-layout">
            <div className="c-form" id="inquiry">
              <EditableText copyKey="contact.form.title" defaultValue="Request a quote" as="h2" className="c-form-title" />
              <p className="c-form-note">
                <EditableText copyKey="contact.form.note" defaultValue="Fields marked" as="span" /> <span className="req">*</span> <EditableText copyKey="contact.form.noteSuffix" defaultValue="are required." as="span" />
              </p>
              <RequestQuoteForm packages={packages} endpoint={site.form.endpoint} />
            </div>

            <aside className="c-side">
              <div className="c-quick">
                <EditableText copyKey="contact.quick.title" defaultValue="Talk to us" as="h2" className="c-side-title" />
                <a className="c-quick-row" href={`mailto:${site.inquiryEmail}`}>
                  <Icon name="mail" size={18} />
                  <span>{site.inquiryEmail}</span>
                </a>
                <a
                  className="c-quick-row"
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                >
                  <Icon name="phone" size={18} />
                  <span>{site.phone} · Reykjavik</span>
                </a>
                <a
                  className="c-quick-row"
                  href={`tel:${site.phoneKL.replace(/\s/g, "")}`}
                >
                  <Icon name="phone" size={18} />
                  <span>{site.phoneKL} · Kuala Lumpur</span>
                </a>
              </div>

              {testimonial && (
                <div className="c-trust">
                  <blockquote className="c-trust-quote">
                    “{testimonial.quote}”
                  </blockquote>
                  <p className="c-trust-author">
                    {testimonial.author} · {testimonial.agency}
                    {testimonial.country ? `, ${testimonial.country}` : ""}
                  </p>
                  <ul className="c-trust-promises">
                    <li>
                      <Icon name="clock" size={15} />{" "}
                      <EditableText copyKey="contact.trust.promise1" defaultValue="We reply within one business day" as="span" />
                    </li>
                    <li>
                      <Icon name="tag" size={15} />{" "}
                      <EditableText copyKey="contact.trust.promise2" defaultValue="Net trade rates" as="span" />
                    </li>
                  </ul>
                </div>
              )}

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
              <CompanyCredentials
                title="Licensing & company details"
                className="mt-6"
              />
            </aside>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
