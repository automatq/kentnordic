import ReactMarkdown from "react-markdown";
import BaseLayout from "@/layouts/BaseLayout";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import { getLegalPage } from "@/lib/content";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { site } from "@/config/site";

interface LegalPageProps {
  slug: "privacy" | "trade-terms";
}

export default function LegalPage({ slug }: LegalPageProps) {
  const page = getLegalPage(slug);

  if (!page) {
    return (
      <BaseLayout title="Page Not Found" noindex>
        <Section tone="cream">
          <Container>
            <h1 className="text-3xl text-ink">Page not found</h1>
            <p className="mt-4 text-charcoal-soft">
              The requested legal page does not exist.
            </p>
            <Button href="/">Return home</Button>
          </Container>
        </Section>
      </BaseLayout>
    );
  }

  const href =
    slug === "privacy" ? site.legal.privacyHref : site.legal.tradeTermsHref;
  const jsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: page.data.title, path: href },
  ]);

  return (
    <BaseLayout
      title={page.data.title}
      description={page.data.description}
      jsonLd={jsonLd}
    >
      <Section tone="cream">
        <Container className="max-w-4xl">
          <SectionHeading
            as="h1"
            eyebrow="Legal"
            title={page.data.title}
            lead={page.data.description}
          />
          {page.data.updated && (
            <p className="mt-6 text-sm text-charcoal-soft">
              Last updated: {page.data.updated}
            </p>
          )}
        </Container>
      </Section>

      <Section tone="white">
        <Container className="max-w-4xl">
          <div className="legal-copy">
            <ReactMarkdown>{page.body}</ReactMarkdown>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
