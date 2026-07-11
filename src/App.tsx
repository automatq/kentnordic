import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import AboutPage from "@/pages/AboutPage";
import AdminPage from "@/pages/AdminPage";
import ContactPage from "@/pages/ContactPage";
import DestinationsPage from "@/pages/DestinationsPage";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import ServicesPage from "@/pages/ServicesPage";
import TourDetailPage from "@/pages/TourDetailPage";
import ToursPage from "@/pages/ToursPage";

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
    </>
  );
}
