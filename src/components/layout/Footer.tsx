import { Link } from 'react-router-dom';
import { site } from '@/config/site';
import { getOffices } from '@/lib/content';
import { getTours } from '@/lib/packages';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import RateSheetForm from '@/components/react/RateSheetForm';

const offices = getOffices();
const tours = getTours();

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="u-container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="max-w-sm">
          <p className="footer-brand">Idcibidci <span>DMC</span></p>
          <p className="mt-4 text-sm leading-relaxed text-charcoal-soft">{site.description}</p>
          <Button href="/contact#inquiry" size="sm" className="mt-5">
            Request a quote
          </Button>
          <div className="mt-6">
            <RateSheetForm />
          </div>
          <div className="mt-6 flex gap-4">
            {site.socials.map((s) => (
              <a key={s.label} href={s.href} className="text-charcoal-soft hover:text-ink" rel="noopener noreferrer" target="_blank" aria-label={s.label}>
                <Icon name={s.icon} size={20} />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3">
          <p className="footer-heading">Explore</p>
          {site.nav.map((item) => (
            <Link key={item.href} to={item.href} viewTransition className="footer-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Tour packages" className="flex flex-col gap-3">
          <p className="footer-heading">Tour packages</p>
          {tours.map((t) => (
            <Link key={t.id} to={`/tours/${t.id}`} viewTransition className="footer-link">
              <span className="tnum">{t.data.code}</span> · {t.data.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-5">
          <p className="footer-heading">Offices</p>
          {offices.map((o) => (
            <div key={o.id} className="text-sm leading-relaxed">
              <p className="font-medium text-ink">{o.name}</p>
              <p className="text-charcoal-soft">
                {o.city}, {o.country}
              </p>
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
        </div>
      </div>

      <div className="border-t border-line">
        <div className="u-container flex flex-col gap-2 py-6 text-xs text-charcoal-soft sm:flex-row sm:justify-between">
          <p>
            © {year} {site.legalName}. Licensed Iceland tour operator.
          </p>
          <p>Reykjavik · Kuala Lumpur</p>
        </div>
      </div>
    </footer>
  );
}
