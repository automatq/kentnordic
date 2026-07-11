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

function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() =>
        document.querySelector(location.hash)?.scrollIntoView(),
      );
    } else {
      window.scrollTo({ top: 0 });
    }
    window.dispatchEvent(new Event("routechange"));
  }, [location.pathname, location.hash]);

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
