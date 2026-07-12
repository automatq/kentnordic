import { site } from "@/config/site";
import { getOffices } from "@/lib/content";

interface BreadcrumbItem {
  name: string;
  path: string;
}

function withProtocol(url: string) {
  return url.startsWith("http") ? url : new URL(url, site.url).href;
}

function nonEmpty<T>(value: T | "" | null | undefined): value is T {
  return value !== "" && value !== null && value !== undefined;
}

function officeToPostalAddress(office: ReturnType<typeof getOffices>[number]) {
  const streetAddress = office.addressLines.filter(Boolean).join(", ");
  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressLocality: office.city,
    addressCountry: office.country,
  };

  if (streetAddress) address.streetAddress = streetAddress;
  return address;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: withProtocol(item.path),
    })),
  };
}

export function getGlobalJsonLd() {
  const offices = getOffices();
  const headOffice = offices.find((office) => office.isHQ) ?? offices[0];
  const sameAs = site.socials.map((social) => social.href);
  const contactPoint = offices.map((office) => ({
    "@type": "ContactPoint",
    contactType: office.role,
    areaServed: office.country,
    availableLanguage: "en",
    ...(office.email ? { email: office.email } : {}),
    ...(office.phone ? { telephone: office.phone } : {}),
  }));

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.legalName,
    url: site.url,
    description: site.description,
    email: site.inquiryEmail,
    telephone: site.phone,
    contactPoint,
  };

  if (headOffice) organization.address = officeToPostalAddress(headOffice);
  if (sameAs.length > 0) organization.sameAs = sameAs;

  const identifiers = [
    {
      label: "registration",
      value: site.company.registrationNumber,
    },
    {
      label: "license",
      value: site.company.licenseNumber,
    },
    {
      label: "vat",
      value: site.company.vatNumber,
    },
  ]
    .filter((entry) => nonEmpty(entry.value))
    .map((entry) => ({
      "@type": "PropertyValue",
      name: entry.label,
      value: entry.value,
    }));

  if (identifiers.length > 0) organization.identifier = identifiers;

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.brandName,
    url: site.url,
    inLanguage: site.locale,
  };

  return [organization, website];
}
