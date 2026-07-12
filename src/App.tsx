import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

/*
 * Route-level code splitting: each page loads on demand. React Router v7
 * wraps navigations in startTransition, so on client-side nav the previous
 * page stays visible while the next chunk streams in — the null Suspense
 * fallback only ever flashes on a cold first paint.
 */
const HomePage = lazy(() => import("@/pages/HomePage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const DestinationsPage = lazy(() => import("@/pages/DestinationsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const TourDetailPage = lazy(() => import("@/pages/TourDetailPage"));
const ToursPage = lazy(() => import("@/pages/ToursPage"));

/** How long to keep polling for a hash target while the lazy page mounts. */
const HASH_SCROLL_DEADLINE_MS = 3000;

function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    let rafId: number | null = null;

    if (location.hash) {
      // Pages are React.lazy — on a cross-route navigation the hash target
      // doesn't exist yet when this effect fires. Poll per frame until the
      // element mounts (or give up after the deadline).
      const id = location.hash.slice(1);
      const deadline = performance.now() + HASH_SCROLL_DEADLINE_MS;
      const seek = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
          return;
        }
        if (performance.now() < deadline) rafId = requestAnimationFrame(seek);
      };
      rafId = requestAnimationFrame(seek);
    } else {
      window.scrollTo({ top: 0 });
    }
    window.dispatchEvent(new Event("routechange"));

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [location.pathname, location.hash, location.key]);

  return null;
}

export default function App() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/tours/:slug" element={<TourDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
