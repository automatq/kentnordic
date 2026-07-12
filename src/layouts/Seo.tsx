import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { site } from '@/config/site';
import { getGlobalJsonLd } from '@/lib/seo';

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
  const pageBlocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const jsonBlocks = [...getGlobalJsonLd(), ...pageBlocks];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:locale" content={site.locale} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {site.measurement.googleSiteVerification && (
        <meta
          name="google-site-verification"
          content={site.measurement.googleSiteVerification}
        />
      )}
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
      {site.measurement.googleAnalyticsId && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${site.measurement.googleAnalyticsId}`}
          />
          <script>
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${site.measurement.googleAnalyticsId}');`}
          </script>
        </>
      )}
      {jsonBlocks.map((block, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
