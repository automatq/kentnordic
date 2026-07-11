import { cn } from '@/lib/classNames';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  delay?: number;
}

/** Thin wrapper over the `.u-reveal` / `data-reveal-delay` mechanism in lib/motion.ts. */
export default function Reveal({ as = 'div', delay = 0, className, children, ...rest }: RevealProps) {
  // @react-three/fiber augments React's JSX intrinsics, which makes bare
  // ElementType rendering collapse to never — pin the accepted props instead.
  const Tag = as as React.FC<Record<string, unknown>>;
  return (
    <Tag className={cn('u-reveal', className)} data-reveal-delay={delay || undefined} {...rest}>
      {children}
    </Tag>
  );
}
