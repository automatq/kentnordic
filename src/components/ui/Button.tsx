import { Link } from 'react-router-dom';
import { cn } from '@/lib/classNames';
import { useMagnetic } from '@/lib/useMagnetic';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'onDark';
  size?: 'sm' | 'md' | 'lg';
  /** Soft attention-drawing pulse, e.g. the primary CTA in a closing section. */
  pulse?: boolean;
  /** Magnetic hover — the button leans toward the cursor (hero/CTA moments). */
  magnetic?: boolean;
  children: React.ReactNode;
}

const base =
  'u-brand-type inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-wide transition-[background-color,color,border-color,transform] duration-200 ease-out-quint no-underline disabled:opacity-60 disabled:pointer-events-none active:translate-y-px';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-600 shadow-soft',
  secondary: 'border border-charcoal/25 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-white',
  // accent-700, not accent: --color-accent is only AA-safe as a UI/icon
  // color (~4.2:1); text this size needs the 4.5:1 text threshold.
  ghost: 'text-accent-700 hover:text-accent-600',
  onDark: 'bg-white/95 text-ink hover:bg-white',
};

const sizes = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-6 py-3',
  lg: 'text-lg px-8 py-4',
};

function isInternal(href: string) {
  return href.startsWith('/') || href.startsWith('#');
}

export default function Button({
  href,
  variant = 'primary',
  size = 'md',
  pulse = false,
  magnetic = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const magnetRef = useMagnetic<HTMLElement>(magnetic ? 6 : 0);
  const ref = magnetic ? magnetRef : undefined;
  const cls = cn(base, variants[variant], sizes[size], pulse && 'btn-pulse', className);
  if (href) {
    if (isInternal(href)) {
      return (
        <Link ref={ref as React.Ref<HTMLAnchorElement>} to={href} viewTransition className={cls}>
          {children}
        </Link>
      );
    }
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={cls} type={type} {...rest}>
      {children}
    </button>
  );
}
