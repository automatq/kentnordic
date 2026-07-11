import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { site } from '@/config/site';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function Seo({ title, description = site.description, image = site.seo.defaultOgImage, noindex = false, jsonLd }: SeoProps) {
  const location = useLocation();
  const fullTitle = title ? site.seo.titleTemplate.replace('%s', title) : site.seo.defaultTitle;
  const canonical = new URL(location.pathname, site.url).href;
  const ogImage = image.startsWith('http') ? image : new URL(image, site.url).href;
  const jsonBlocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={site.locale} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.brandName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonBlocks.map((block, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
