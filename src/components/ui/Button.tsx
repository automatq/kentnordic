import { Link } from 'react-router-dom';
import { cn } from '@/lib/classNames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'onDark';
  size?: 'sm' | 'md' | 'lg';
  /** Soft attention-drawing pulse, e.g. the primary CTA in a closing section. */
  pulse?: boolean;
  children: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-wide transition-[background-color,color,border-color,transform] duration-200 ease-out-quint no-underline disabled:opacity-60 disabled:pointer-events-none active:translate-y-px';

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-600 shadow-soft',
  secondary: 'border border-charcoal/25 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-white',
  ghost: 'text-accent hover:text-accent-700',
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
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], pulse && 'btn-pulse', className);
  if (href) {
    if (isInternal(href)) {
      return (
        <Link to={href} className={cls}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} type={type} {...rest}>
      {children}
    </button>
  );
}
