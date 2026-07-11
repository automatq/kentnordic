import { cn } from '@/lib/classNames';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  /** Trailing word rendered in the italic accent serif, e.g. CasaFlow's "Beautifully run." pattern. */
  flourish?: string;
  lead?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
  tone?: 'dark' | 'light';
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  flourish,
  lead,
  align = 'left',
  as: Heading = 'h2',
  tone = 'dark',
  className,
}: SectionHeadingProps) {
  const alignCls = align === 'center' ? 'text-center mx-auto items-center' : 'items-start';
  const leadTone = tone === 'light' ? 'text-white/75' : 'text-charcoal-soft';
  return (
    <div className={cn('flex flex-col gap-4 max-w-2xl', alignCls, className)}>
      {eyebrow && <span className={cn('u-eyebrow', tone === 'light' && 'is-on-dark')}>{eyebrow}</span>}
      <Heading className={cn('text-3xl', tone === 'light' && 'text-white')}>
        {title}
        {flourish && <span className="u-flourish"> {flourish}</span>}
      </Heading>
      {lead && <p className={cn('text-lg', leadTone)}>{lead}</p>}
    </div>
  );
}
