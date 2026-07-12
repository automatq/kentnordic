import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { site } from "@/config/site";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import EditableText from "@/copy/EditableText";
import { useCopyValue } from "@/copy/useCopy";
import { cn } from "@/lib/classNames";
import { getServices } from "@/lib/content";
import {
  formatLength,
  getRegions,
  getTours,
  toursForRegion,
} from "@/lib/packages";

interface HeaderProps {
  overlay?: boolean;
}

interface MegaMenuLink {
  label: string;
  href: string;
  description?: string;
  meta?: string;
  icon?: string;
  accent?: string;
}

interface MegaMenuPanel {
  intro: {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    ctaLabel: string;
  };
  columns: Array<{
    title: string;
    links: MegaMenuLink[];
  }>;
  spotlight: {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    ctaLabel: string;
  };
}

/* Warm a route's lazy chunk the moment the pointer shows intent — makes
   code-split navigation feel instant. Specifiers must match App.tsx lazy(). */
const routePrefetch: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/HomePage'),
  '/about': () => import('@/pages/AboutPage'),
  '/services': () => import('@/pages/ServicesPage'),
  '/destinations': () => import('@/pages/DestinationsPage'),
  '/tours': () => import('@/pages/ToursPage'),
  '/contact': () => import('@/pages/ContactPage'),
  '/privacy': () => import('@/pages/LegalPage'),
  '/trade-terms': () => import('@/pages/LegalPage'),
};

function prefetchRoute(href: string) {
  routePrefetch[href]?.().catch(() => {
    /* prefetch is best-effort */
  });
}

function excerpt(text: string, maxLength = 116) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength).replace(/\s+\S*$/, "");
  return `${cut}...`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    output.push(items.slice(index, index + size));
  return output;
}

const services = getServices();
const regions = getRegions();
const tours = getTours();
const featuredTours = tours.filter((tour) => tour.data.featured);
const regionColumns = chunk(regions, 4);

const megaMenus: Record<string, MegaMenuPanel> = {
  "/services": {
    intro: {
      eyebrow: "Services",
      title: "Ground services, end to end",
      body: "From independent FIT programmes to fully operated groups and incentive travel, the operating model stays clear and local.",
      href: "/services",
      ctaLabel: "View all services",
    },
    columns: [
      {
        title: "Service lines",
        links: services.map((service) => ({
          label: service.data.name,
          href: `/services#${service.data.slug}`,
          description: excerpt(service.data.summary),
          icon: service.data.icon,
        })),
      },
      {
        title: "Partner shortcuts",
        links: [
          {
            label: "Ready-to-sell group itineraries",
            href: "/tours",
            description:
              "Six published programmes that can be sold as-is or adapted for a departure.",
            icon: "route",
          },
          {
            label: "Request a custom quote",
            href: "/contact#inquiry",
            description:
              "Send dates, budget and group size for a tailored net-rate proposal.",
            icon: "mail",
          },
          {
            label: "About the team",
            href: "/about",
            description:
              "Reykjavik operations with a Kuala Lumpur sales office for Asia Pacific partners.",
            icon: "group",
          },
        ],
      },
    ],
    spotlight: {
      eyebrow: "Trade-ready workflow",
      title: "Built for agencies, operators and planners",
      body: "Brief us once and get back a coherent itinerary with transport, hotels, sightseeing and contingency handled by one team.",
      href: "/contact#inquiry",
      ctaLabel: "Start an inquiry",
    },
  },
  "/destinations": {
    intro: {
      eyebrow: "Destinations",
      title: "Navigate Iceland by region",
      body: "Use the map to understand what each region offers and which itineraries connect them into a viable route.",
      href: "/destinations",
      ctaLabel: "Explore the map",
    },
    columns: regionColumns.map((group, index) => ({
      title: `Regions ${String(index * 4 + 1).padStart(2, "0")}-${String(index * 4 + group.length).padStart(2, "0")}`,
      links: group.map((region) => ({
        label: region.data.name,
        href: `/destinations#region-card-${region.id}`,
        description: `${region.data.tagline} · ${toursForRegion(region.id).length} tour${toursForRegion(region.id).length === 1 ? "" : "s"} visit this region`,
        icon: "map-pin",
        accent: region.data.color,
      })),
    })),
    spotlight: {
      eyebrow: "Follow a route",
      title: "Walk an itinerary on the map",
      body: "Step through each drive segment, stop and overnight exactly as your clients would experience the journey.",
      href: "/destinations#walkthrough",
      ctaLabel: "Open tour walkthrough",
    },
  },
  "/tours": {
    intro: {
      eyebrow: "Tour Packages",
      title: "Ready-to-sell Iceland itineraries",
      body: "Compact South Coast loops and full Ring Road circuits, already structured for B2B quoting and customisation.",
      href: "/tours",
      ctaLabel: "Browse all packages",
    },
    columns: [
      {
        title: "South Coast",
        links: tours
          .filter((tour) => tour.data.category === "south-coast")
          .map((tour) => ({
            label: tour.data.name,
            href: `/tours/${tour.id}`,
            description: excerpt(tour.data.summary),
            meta: formatLength(tour),
            icon: "route",
          })),
      },
      {
        title: "Round Iceland",
        links: tours
          .filter((tour) => tour.data.category === "round-iceland")
          .map((tour) => ({
            label: tour.data.name,
            href: `/tours/${tour.id}`,
            description: excerpt(tour.data.summary),
            meta: formatLength(tour),
            icon: "route",
          })),
      },
    ],
    spotlight: {
      eyebrow: `${featuredTours.length} featured departures`,
      title: "Start with the proven sellers",
      body: "The strongest entry points span the South Coast, a slower glacier-country loop, and a full Ring Road circuit.",
      href: "/contact#inquiry",
      ctaLabel: "Discuss a custom departure",
    },
  },
};

export default function Header({ overlay = false }: HeaderProps) {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const desktopNavRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setActiveMega(null);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveMega(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!activeMega) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!desktopNavRef.current?.contains(event.target as Node))
        setActiveMega(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeMega]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  function isActive(href: string) {
    if (href === "/") return path === "/";
    return path === href || path.startsWith(`${href}/`);
  }

  function cancelMegaClose() {
    if (!closeTimerRef.current) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function openMegaMenu(href: string) {
    cancelMegaClose();
    setActiveMega(href);
  }

  function scheduleMegaClose(href: string) {
    cancelMegaClose();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveMega((current) => (current === href ? null : current));
      closeTimerRef.current = null;
    }, 180);
  }

  const navLabels = {
    about: useCopyValue("nav.about", "About"),
    services: useCopyValue("nav.services", "Services"),
    destinations: useCopyValue("nav.destinations", "Destinations"),
    tours: useCopyValue("nav.tours", "Tour Packages"),
    contact: useCopyValue("nav.contact", "Contact"),
    quote: useCopyValue("nav.quote", "Request a quote"),
  };

  const displayNav = site.nav.map((item) => ({
    ...item,
    label:
      item.href === "/about"
        ? navLabels.about
        : item.href === "/services"
          ? navLabels.services
          : item.href === "/destinations"
            ? navLabels.destinations
            : item.href === "/tours"
              ? navLabels.tours
              : item.href === "/contact"
                ? navLabels.contact
                : item.label,
  }));

  return (
    <header
      className={cn(
        "site-header",
        (solid || open || !!activeMega) && "is-solid",
      )}
      data-overlay={overlay ? "true" : "false"}
    >
      <div className="u-container flex h-(--header-h) items-center justify-between gap-6">
        <Link to="/" className="wordmark" aria-label="Idcibidci - home">
          <span className="wordmark-text">Idcibidci</span>
          <span className="wordmark-sub">DMC</span>
        </Link>

        <nav
          ref={desktopNavRef}
          className="desktop-nav-shell"
          aria-label="Primary"
        >
          <ul className="desktop-nav">
            {displayNav.map((item) => {
              const megaMenu = megaMenus[item.href];
              const isMegaOpen = activeMega === item.href;

              if (!megaMenu) {
                return (
                  <li key={item.href} className="desktop-nav-item">
                    <Link
                      to={item.href}
                      viewTransition
                      className="nav-link"
                      aria-current={isActive(item.href) ? "page" : undefined}
                      onPointerEnter={() => prefetchRoute(item.href)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={item.href}
                  className="desktop-nav-item desktop-nav-item--mega"
                  onMouseEnter={() => {
                    openMegaMenu(item.href);
                    prefetchRoute(item.href);
                  }}
                  onMouseLeave={() => scheduleMegaClose(item.href)}
                  onFocus={() => openMegaMenu(item.href)}
                  onBlur={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      scheduleMegaClose(item.href);
                    }
                  }}
                >
                  <Link
                    to={item.href}
                    viewTransition
                    className="nav-link nav-trigger"
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span>{item.label}</span>
                    <Icon
                      name="arrow-down"
                      size={14}
                      className={cn(
                        "nav-trigger-icon",
                        isMegaOpen && "is-open",
                      )}
                    />
                  </Link>

                  <div
                    className="mega-menu"
                    hidden={!isMegaOpen}
                    onMouseEnter={cancelMegaClose}
                    onMouseLeave={() => scheduleMegaClose(item.href)}
                  >
                    <div className="mega-menu-grid">
                      <div className="mega-intro">
                        <p className="mega-eyebrow">{megaMenu.intro.eyebrow}</p>
                        <h2 className="mega-title">{megaMenu.intro.title}</h2>
                        <p className="mega-copy">{megaMenu.intro.body}</p>
                        <Button
                          href={megaMenu.intro.href}
                          variant="secondary"
                          size="sm"
                          className="mega-intro-cta"
                        >
                          {megaMenu.intro.ctaLabel}
                        </Button>
                      </div>

                      <div className="mega-columns">
                        {megaMenu.columns.map((column) => (
                          <section
                            key={column.title}
                            className="mega-column"
                            aria-label={column.title}
                          >
                            <p className="mega-column-title">{column.title}</p>
                            <div className="mega-links">
                              {column.links.map((link) => (
                                <Link
                                  key={link.href}
                                  to={link.href}
                                  className="mega-link"
                                >
                                  <span className="mega-link-head">
                                    <span className="mega-link-title">
                                      {link.icon && (
                                        <span
                                          className="mega-link-icon"
                                          style={
                                            link.accent
                                              ? ({
                                                  "--mega-accent": link.accent,
                                                } as CSSProperties)
                                              : undefined
                                          }
                                        >
                                          <Icon name={link.icon} size={14} />
                                        </span>
                                      )}
                                      <span>{link.label}</span>
                                    </span>
                                    {link.meta && (
                                      <span className="mega-link-meta">
                                        {link.meta}
                                      </span>
                                    )}
                                  </span>
                                  {link.description && (
                                    <span className="mega-link-copy">
                                      {link.description}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>

                      <aside className="mega-spotlight">
                        <p className="mega-eyebrow">
                          {megaMenu.spotlight.eyebrow}
                        </p>
                        <h2 className="mega-spotlight-title">
                          {megaMenu.spotlight.title}
                        </h2>
                        <p className="mega-copy">{megaMenu.spotlight.body}</p>
                        <Button
                          href={megaMenu.spotlight.href}
                          size="sm"
                          className="mega-spotlight-cta"
                        >
                          {megaMenu.spotlight.ctaLabel}
                        </Button>
                      </aside>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button href="/contact#inquiry" size="sm" className="desktop-quote">
            <EditableText
              copyKey="nav.quote"
              defaultValue="Request a quote"
              as="span"
            />
          </Button>
          <button
            type="button"
            className="menu-toggle lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} size={26} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav className="mobile-nav" aria-label="Mobile">
              {displayNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
              className="mobile-link"
              aria-current={isActive(item.href) ? "page" : undefined}
            >
                  <span>{item.label}</span>
              {megaMenus[item.href] && (
                <span className="mobile-link-copy">
                  {megaMenus[item.href].intro.title}
                </span>
              )}
            </Link>
          ))}
              <Button href="/contact#inquiry" className="mt-4">
                <EditableText
                  copyKey="nav.quote"
                  defaultValue="Request a quote"
                  as="span"
                />
              </Button>
            </nav>
          </div>
    </header>
  );
}
