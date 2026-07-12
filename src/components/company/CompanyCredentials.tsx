import { site } from "@/config/site";
import { getOffices } from "@/lib/content";

interface CompanyCredentialsProps {
  title?: string;
  className?: string;
}

const proofItems = [
  {
    label: "Registration number",
    value: site.company.registrationNumber,
  },
  {
    label: "License number",
    value: site.company.licenseNumber,
  },
  {
    label: "VAT number",
    value: site.company.vatNumber,
  },
].filter((item) => item.value);

export default function CompanyCredentials({
  title = "Company details",
  className = "",
}: CompanyCredentialsProps) {
  const offices = getOffices();

  return (
    <section
      className={`rounded-[1.75rem] border border-line bg-white p-6 shadow-soft ${className}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-soft">
        Trust &amp; compliance
      </p>
      <h3 className="mt-2 font-display text-2xl text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">
        {site.legalName} is an Iceland destination management company serving
        travel trade partners through local operations in Reykjavik and an Asia
        Pacific sales desk in Kuala Lumpur.
      </p>

      {proofItems.length > 0 && (
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {proofItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-cream p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                {item.label}
              </dt>
              <dd className="mt-2 text-sm font-medium text-ink">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {offices.map((office) => (
          <div key={office.id} className="rounded-2xl bg-cream p-4">
            <p className="font-medium text-ink">{office.name}</p>
            <p className="mt-1 text-sm text-charcoal-soft">{office.role}</p>
            <p className="mt-3 text-sm text-charcoal-soft">
              {office.city}, {office.country}
            </p>
            <div className="mt-3 flex flex-col gap-1 text-sm">
              {office.email && (
                <a
                  href={`mailto:${office.email}`}
                  className="text-accent-700 hover:text-accent-600"
                >
                  {office.email}
                </a>
              )}
              {office.phone && (
                <a
                  href={`tel:${office.phone.replace(/\s/g, "")}`}
                  className="text-accent-700 hover:text-accent-600"
                >
                  {office.phone}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
