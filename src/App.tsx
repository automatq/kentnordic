import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { useCopyContext } from "@/copy/CopyProvider";
import RouteEffects from "@/router/RouteEffects";

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
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const TourDetailPage = lazy(() => import("@/pages/TourDetailPage"));
const ToursPage = lazy(() => import("@/pages/ToursPage"));

export default function App() {
  const { previewVersion } = useCopyContext();
  return (
    <>
      <RouteEffects />
      <Suspense fallback={null}>
        <Routes key={previewVersion}>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/tours/:slug" element={<TourDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<LegalPage slug="privacy" />} />
          <Route
            path="/trade-terms"
            element={<LegalPage slug="trade-terms" />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
