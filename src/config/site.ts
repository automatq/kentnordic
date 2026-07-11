/**
 * Global site configuration.
 *
 * Structural values (brand, navigation, SEO defaults, form provider) live here so
 * they're typed and version-controlled. Client-editable content lives under
 * src/content and is loaded by src/lib/content.ts. The inquiry email and form key
 * read from env so they can change without a code edit.
 */

export interface NavItem {
  label: string;
  href: string;
}

export const site = {
  brandName: "Idcibidci",
  legalName: "Idcibidci ehf",
  tagline: "Your ground partner in Iceland",
  /** One-line B2B value proposition used in hero + meta. */
  description:
    "Idcibidci is a licensed Iceland destination management company (DMC) crafting reliable, beautifully run group and tailor-made tours for travel agencies and MICE planners.",
  url: "https://idcibidci.is",
  locale: "en",

  /** Primary navigation (also drives the mobile menu + footer). */
  nav: [
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Destinations", href: "/destinations" },
    { label: "Tour Packages", href: "/tours" },
    { label: "Contact", href: "/contact" },
  ] as NavItem[],

  /** Where inquiry submissions are delivered. Set PUBLIC_INQUIRY_EMAIL in .env. */
  inquiryEmail: import.meta.env.PUBLIC_INQUIRY_EMAIL || "sales@idcibidci.is",
  phone: "+354 555 0100",
  phoneKL: "+60 3-2856 0100",

  /**
   * Inquiry form delivery. The frontend posts to our own Vercel API so submissions
   * can be reviewed in the protected /admin area.
   */
  form: {
    provider: "admin-api" as const,
    endpoint: "/api/form-submissions",
  },

  socials: [
    { label: "Instagram", href: "https://instagram.com/", icon: "instagram" },
    { label: "LinkedIn", href: "https://linkedin.com/", icon: "linkedin" },
    { label: "Facebook", href: "https://facebook.com/", icon: "facebook" },
  ],

  /** Trust-marquee chrome on the homepage - presentation copy, not editorial content. */
  trustBullets: [
    { icon: "shield", label: "Licensed Icelandic DMC" },
    { icon: "map-pin", label: "Reykjavik-Based Operations" },
    { icon: "compass", label: "Asia Pacific Sales Desk" },
    { icon: "tag", label: "Net Rates For The Trade" },
    { icon: "calendar", label: "Six Ready-To-Sell Tours" },
    { icon: "route", label: "End-To-End Ground Handling" },
  ],

  seo: {
    titleTemplate: "%s · Idcibidci",
    defaultTitle: "Idcibidci · Iceland Destination Management Company",
    defaultOgImage: "/og-default.jpg",
  },
} as const;

export type Site = typeof site;
