import { Route, Routes } from "react-router-dom";
import AboutPage from "@/pages/AboutPage";
import AdminPage from "@/pages/AdminPage";
import ContactPage from "@/pages/ContactPage";
import DestinationsPage from "@/pages/DestinationsPage";
import HomePage from "@/pages/HomePage";
import LegalPage from "@/pages/LegalPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ServicesPage from "@/pages/ServicesPage";
import TourDetailPage from "@/pages/TourDetailPage";
import ToursPage from "@/pages/ToursPage";
import RouteEffects from "@/router/RouteEffects";

export default function AppServer() {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
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
    </>
  );
}
