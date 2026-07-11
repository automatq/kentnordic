import BaseLayout from '@/layouts/BaseLayout';
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <BaseLayout title="Page Not Found" noindex>
      <Section tone="cream">
        <Container>
          <p className="u-eyebrow">404</p>
          <h1 className="mt-4 text-4xl">Page not found</h1>
          <p className="mt-4 max-w-lg text-charcoal-soft">
            The page you're looking for doesn't exist or may have moved. Try one of our tour packages or get in touch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/">Back to home</Button>
            <Button href="/tours" variant="secondary">
              Browse tours
            </Button>
          </div>
        </Container>
      </Section>
    </BaseLayout>
  );
}
