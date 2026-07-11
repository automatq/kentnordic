import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Seo from '@/layouts/Seo';
import { initReveal } from '@/lib/motion';

interface BaseLayoutProps {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  overlay?: boolean;
  children: React.ReactNode;
}

export default function BaseLayout({ title, description, image, noindex, jsonLd, overlay = false, children }: BaseLayoutProps) {
  useEffect(() => {
    document.body.classList.add('grain');
    return () => document.body.classList.remove('grain');
  }, []);

  useEffect(() => {
    requestAnimationFrame(initReveal);
  });

  return (
    <>
      <Seo title={title} description={description} image={image} noindex={noindex} jsonLd={jsonLd} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header overlay={overlay} />
      <main id="main" className={!overlay ? 'pt-(--header-h)' : undefined}>
        {children}
      </main>
      <Footer />
    </>
  );
}
