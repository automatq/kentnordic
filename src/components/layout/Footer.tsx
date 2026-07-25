import { Link } from 'react-router-dom';
import { site } from '@/config/site';
import { getOffices } from '@/lib/content';
import { getTours } from '@/lib/packages';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import RateSheetForm from '@/components/react/RateSheetForm';
import EditableText from '@/copy/EditableText';
import { useCopyValue } from '@/copy/useCopy';

const offices = getOffices();
const tours = getTours();

export default function Footer() {
  const year = new Date().getFullYear();
  const privacyLabel = useCopyValue("footer.privacy", "Privacy policy");
  const tradeTermsLabel = useCopyValue("footer.tradeTerms", "Trade terms");
  const quoteCta = useCopyValue("footer.quoteCta", "Request a quote");
  const navLabels = {
    about: useCopyValue("nav.about", "About"),
    services: useCopyValue("nav.services", "Services"),
    destinations: useCopyValue("nav.destinations", "Destinations"),
    tours: useCopyValue("nav.tours", "Tour Packages"),
    contact: useCopyValue("nav.contact", "Contact"),
  };
  const companyFacts = [
    site.company.registrationNumber
      ? `Registration ${site.company.registrationNumber}`
      : "",
    site.company.licenseNumber ? `License ${site.company.licenseNumber}` : "",
    site.company.vatNumber ? `VAT ${site.company.vatNumber}` : "",
  ].filter(Boolean);

  return (
    <footer className="site-footer">
      <div className="u-container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="max-w-sm">
          <Link to="/" className="footer-brand" aria-label="Idcibidci - home">
            <img
              src="/idcibidci-logo.png"
              alt="Idcibidci"
              className="footer-logo"
              width={778}
              height={612}
              decoding="async"
              loading="lazy"
            />
          </Link>
          <EditableText
            copyKey="footer.description"
            defaultValue="Idcibidci ehf is a licensed travel agent by the Icelandic Tourist Board and a local Icelandic destination management company crafting amazing, reliable and memorable tours for international travel agents."
            as="p"
            multiline
            className="mt-4 text-sm leading-relaxed text-charcoal-soft"
          />
          <Button href="/contact#inquiry" size="sm" className="mt-5">
            <EditableText
              copyKey="footer.quoteCta"
              defaultValue={quoteCta}
              as="span"
            />
          </Button>
          <div className="mt-6">
            <RateSheetForm />
            <RateSheetForm kind="fare-list-updates" />
          </div>
          {site.socials.length > 0 && (
            <div className="mt-6 flex gap-4">
              {site.socials.map((s) => (
                <a key={s.label} href={s.href} className="text-charcoal-soft hover:text-ink" rel="noopener noreferrer" target="_blank" aria-label={s.label}>
                  <Icon name={s.icon} size={20} />
                </a>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3">
          <EditableText
            copyKey="footer.exploreHeading"
            defaultValue="Explore"
            as="p"
            className="footer-heading"
          />
          {site.nav.map((item) => (
            <Link key={item.href} to={item.href} viewTransition className="footer-link">
              {item.href === "/about"
                ? navLabels.about
                : item.href === "/services"
                  ? navLabels.services
                  : item.href === "/destinations"
                    ? navLabels.destinations
                    : item.href === "/tours"
                      ? navLabels.tours
                      : item.href === "/contact"
                        ? navLabels.contact
                        : item.label}
            </Link>
          ))}
          <Link to={site.legal.privacyHref} viewTransition className="footer-link">
            {privacyLabel}
          </Link>
          <Link to={site.legal.tradeTermsHref} viewTransition className="footer-link">
            {tradeTermsLabel}
          </Link>
        </nav>

        <nav aria-label="Tour packages" className="flex flex-col gap-3">
          <EditableText
            copyKey="footer.toursHeading"
            defaultValue="Tour packages"
            as="p"
            className="footer-heading"
          />
          {tours.map((t) => (
            <Link key={t.id} to={`/tours/${t.id}`} viewTransition className="footer-link">
              {t.data.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-5">
          <EditableText
            copyKey="footer.officesHeading"
            defaultValue="Offices"
            as="p"
            className="footer-heading"
          />
          {offices.map((o) => (
            <div key={o.id} className="text-sm leading-relaxed">
              <p className="font-medium text-ink">{o.name}</p>
              <p className="text-charcoal-soft">
                {o.city}, {o.country}
              </p>
              {o.addressLines.length > 0 && (
                <address className="mt-1 not-italic text-charcoal-soft">
                  {o.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              )}
              {o.phone && (
                <a href={`tel:${o.phone.replace(/\s/g, '')}`} className="footer-link mt-1 inline-flex items-center gap-1.5">
                  <Icon name="phone" size={15} />
                  {o.phone}
                </a>
              )}
              {o.email && (
                <a href={`mailto:${o.email}`} className="footer-link mt-1 flex items-center gap-1.5">
                  <Icon name="mail" size={15} />
                  {o.email}
                </a>
              )}
            </div>
          ))}
          <a href={`mailto:${site.inquiryEmail}`} className="footer-link">
            {site.inquiryEmail}
          </a>
          <a
            href="https://www.idcibidci.com"
            className="footer-link"
            rel="noopener noreferrer"
            target="_blank"
          >
            www.idcibidci.com
          </a>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="u-container flex flex-col gap-2 py-6 text-xs text-charcoal-soft sm:flex-row sm:justify-between">
          <p>
            © {year} {site.legalName}.{" "}
            <EditableText
              copyKey="footer.legalLine"
              defaultValue="Iceland destination management company."
              as="span"
            />
          </p>
          <p>{companyFacts.length > 0 ? companyFacts.join(" · ") : "Reykjavik · Kuala Lumpur"}</p>
        </div>
      </div>
    </footer>
  );
}
