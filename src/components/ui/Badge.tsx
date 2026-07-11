import { cn } from '@/lib/classNames';

interface BadgeProps {
  tone?: 'neutral' | 'accent' | 'moss' | 'lava' | 'outline' | 'optional';
  dotColor?: string;
  className?: string;
  children: React.ReactNode;
}

const tones = {
  neutral: 'bg-grey-soft text-charcoal-soft',
  accent: 'bg-accent-100 text-accent-700',
  moss: 'bg-moss/15 text-moss',
  lava: 'bg-lava/12 text-lava',
  outline: 'border border-charcoal/15 text-charcoal-soft',
  optional: 'bg-lava/10 text-lava',
};

export default function Badge({ tone = 'neutral', dotColor, className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-medium whitespace-nowrap', tones[tone], className)}>
      {dotColor && <span className="inline-block size-2 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true" />}
      {children}
    </span>
  );
}
