import { cn } from '@/lib/classNames';

interface SectionProps {
  tone?: 'white' | 'beige' | 'cream' | 'charcoal' | 'grey';
  size?: 'default' | 'sm';
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const tones = {
  white: 'bg-white text-charcoal',
  cream: 'bg-cream text-charcoal',
  beige: 'bg-beige text-charcoal',
  grey: 'bg-grey-soft text-charcoal',
  charcoal: 'bg-ink text-white',
};

export default function Section({ tone = 'white', size = 'default', id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn('relative isolate', tones[tone], size === 'sm' ? 'py-section-sm' : 'py-section', className)}>
      {children}
    </section>
  );
}
